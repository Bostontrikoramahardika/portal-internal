// app/api/roster/categories/route.ts
// CRUD kategori sheet roster (untuk template Excel)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// ═══════════════════════════════════════════════════════
// GET - List semua kategori (default + custom)
// ═══════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  try {
    const { searchParams } = new URL(req.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = supabaseAdmin
      .from('roster_sheet_categories')
      .select('*')
      .order('urutan', { ascending: true })

    if (!includeInactive) {
      query = query.eq('active', true)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      data: data || [],
      total: data?.length || 0
    })

  } catch (err: any) {
    console.error('[roster/categories GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════
// POST - Tambah kategori baru
// ═══════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const canManage = userRoles.some(r => 
    ['super_admin', 'hr_ho', 'hr_site', 'pjo_site'].includes(r)
  )

  if (!canManage) {
    return NextResponse.json({ error: 'Tidak punya akses kelola kategori' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { kode, nama_sheet, judul_header, tipe, filter_jabatan, urutan, site } = body

    // Validasi wajib
    if (!kode || !nama_sheet || !judul_header || !tipe) {
      return NextResponse.json({ 
        error: 'Kode, nama sheet, judul header, dan tipe wajib diisi' 
      }, { status: 400 })
    }

    // Validasi tipe
    if (!['operator', 'staff', 'plant'].includes(tipe)) {
      return NextResponse.json({ 
        error: 'Tipe harus: operator, staff, atau plant' 
      }, { status: 400 })
    }

    // Validasi nama_sheet (Excel max 31 char, tidak boleh mengandung karakter aneh)
    if (nama_sheet.length > 31) {
      return NextResponse.json({ 
        error: 'Nama sheet maksimal 31 karakter (Excel limit)' 
      }, { status: 400 })
    }

    if (/[\\\/\?\*\[\]:]/.test(nama_sheet)) {
      return NextResponse.json({ 
        error: 'Nama sheet tidak boleh mengandung: \\ / ? * [ ] :' 
      }, { status: 400 })
    }

    // Normalize kode (lowercase, underscore)
    const normalizedKode = String(kode).toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')

    // Cek duplicate kode
    const { data: existing } = await supabaseAdmin
      .from('roster_sheet_categories')
      .select('id')
      .eq('kode', normalizedKode)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ 
        error: `Kode "${normalizedKode}" sudah dipakai. Ganti kode lain.` 
      }, { status: 400 })
    }

    // Auto urutan (paling akhir kalau tidak diisi)
    let finalUrutan = urutan
    if (!finalUrutan) {
      const { data: maxData } = await supabaseAdmin
        .from('roster_sheet_categories')
        .select('urutan')
        .order('urutan', { ascending: false })
        .limit(1)
        .maybeSingle()
      finalUrutan = (maxData?.urutan || 0) + 1
    }

    // Insert
    const { data, error } = await supabaseAdmin
      .from('roster_sheet_categories')
      .insert({
        kode: normalizedKode,
        nama_sheet: String(nama_sheet).trim(),
        judul_header: String(judul_header).trim().toUpperCase(),
        tipe,
        filter_jabatan: Array.isArray(filter_jabatan) ? filter_jabatan : [],
        urutan: finalUrutan,
        is_default: false,
        active: true,
        site: site || null,
        created_by: session.nrp || 'unknown'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: '✅ Kategori berhasil ditambahkan',
      data
    })

  } catch (err: any) {
    console.error('[roster/categories POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════
// PUT - Update kategori existing
// ═══════════════════════════════════════════════════════
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const canManage = userRoles.some(r => 
    ['super_admin', 'hr_ho', 'hr_site', 'pjo_site'].includes(r)
  )

  if (!canManage) {
    return NextResponse.json({ error: 'Tidak punya akses kelola kategori' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { id, nama_sheet, judul_header, tipe, filter_jabatan, urutan, active, site } = body

    if (!id) {
      return NextResponse.json({ error: 'ID kategori wajib diisi' }, { status: 400 })
    }

    // Cek existing
    const { data: existing } = await supabaseAdmin
      .from('roster_sheet_categories')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 })
    }

    // Kalau default → hanya boleh edit filter_jabatan & urutan, TIDAK boleh ubah tipe/kode
    if (existing.is_default) {
      // Prepare update untuk default (limited fields)
      const updateData: any = {
        updated_at: new Date().toISOString(),
        updated_by: session.nrp || 'unknown'
      }

      if (filter_jabatan !== undefined) {
        updateData.filter_jabatan = Array.isArray(filter_jabatan) ? filter_jabatan : []
      }
      if (urutan !== undefined) updateData.urutan = urutan
      if (active !== undefined) updateData.active = active

      const { data, error } = await supabaseAdmin
        .from('roster_sheet_categories')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({
        ok: true,
        message: '✅ Kategori default berhasil diupdate (limited fields)',
        data
      })
    }

    // Untuk kategori custom → boleh update semua field
    const updateData: any = {
      updated_at: new Date().toISOString(),
      updated_by: session.nrp || 'unknown'
    }

    if (nama_sheet !== undefined) {
      if (nama_sheet.length > 31) {
        return NextResponse.json({ error: 'Nama sheet maksimal 31 karakter' }, { status: 400 })
      }
      updateData.nama_sheet = String(nama_sheet).trim()
    }
    if (judul_header !== undefined) {
      updateData.judul_header = String(judul_header).trim().toUpperCase()
    }
    if (tipe !== undefined) {
      if (!['operator','staff','plant'].includes(tipe)) {
        return NextResponse.json({ error: 'Tipe tidak valid' }, { status: 400 })
      }
      updateData.tipe = tipe
    }
    if (filter_jabatan !== undefined) {
      updateData.filter_jabatan = Array.isArray(filter_jabatan) ? filter_jabatan : []
    }
    if (urutan !== undefined) updateData.urutan = urutan
    if (active !== undefined) updateData.active = active
    if (site !== undefined) updateData.site = site

    const { data, error } = await supabaseAdmin
      .from('roster_sheet_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      message: '✅ Kategori berhasil diupdate',
      data
    })

  } catch (err: any) {
    console.error('[roster/categories PUT]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════
// DELETE - Hapus kategori (soft delete)
// ═══════════════════════════════════════════════════════
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const canManage = userRoles.some(r => 
    ['super_admin', 'hr_ho', 'hr_site', 'pjo_site'].includes(r)
  )

  if (!canManage) {
    return NextResponse.json({ error: 'Tidak punya akses hapus kategori' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID kategori wajib diisi' }, { status: 400 })
    }

    // Cek existing
    const { data: existing } = await supabaseAdmin
      .from('roster_sheet_categories')
      .select('id, kode, nama_sheet, is_default')
      .eq('id', id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan' }, { status: 404 })
    }

    // Default tidak boleh dihapus, tapi bisa di-nonaktifkan
    if (existing.is_default) {
      return NextResponse.json({ 
        error: `Kategori default "${existing.nama_sheet}" tidak bisa dihapus. Silakan nonaktifkan saja.` 
      }, { status: 400 })
    }

    // Soft delete (set active = false)
    const { error } = await supabaseAdmin
      .from('roster_sheet_categories')
      .update({ 
        active: false,
        updated_at: new Date().toISOString(),
        updated_by: session.nrp || 'unknown'
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      message: `✅ Kategori "${existing.nama_sheet}" berhasil dinonaktifkan`
    })

  } catch (err: any) {
    console.error('[roster/categories DELETE]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}