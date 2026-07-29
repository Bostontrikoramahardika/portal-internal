// app/api/units/route.ts
// CRUD Unit Master (untuk kelola unit per site)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// ═══════════════════════════════════════════════════════
// GET - List unit per site + kategori
// ═══════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  try {
    const { searchParams } = new URL(req.url)
    const site = searchParams.get('site') || ''
    const kategori = searchParams.get('kategori') || ''
    const status = searchParams.get('status') || ''
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
    const isSuperAdmin = userRoles.includes('super_admin')
    const isHRHO = userRoles.includes('hr_ho')

    let query = supabaseAdmin
      .from('unit_master')
      .select('*')
      .order('kategori', { ascending: true })
      .order('urutan', { ascending: true })

    // Filter site
    if (site) {
      query = query.eq('site', site)
    } else if (!isSuperAdmin && !isHRHO) {
      // Non super/HR HO → hanya bisa lihat site sendiri
      const userSite = session.site || ''
      if (userSite) query = query.eq('site', userSite)
    }

    if (kategori) query = query.eq('kategori', kategori)
    if (status) query = query.eq('status', status)
    if (!includeInactive) query = query.eq('active', true)

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Group by kategori untuk kemudahan render
    const grouped: Record<string, any[]> = {}
    ;(data || []).forEach(u => {
      if (!grouped[u.kategori]) grouped[u.kategori] = []
      grouped[u.kategori].push(u)
    })

    // Stats
    const total = data?.length || 0
    const totalRFU = data?.filter(u => u.status === 'RFU').length || 0
    const totalBD = data?.filter(u => u.status === 'BD').length || 0
    const totalSpare = data?.filter(u => u.is_spare).length || 0

    return NextResponse.json({
      ok: true,
      data: data || [],
      grouped,
      stats: {
        total,
        totalRFU,
        totalBD,
        totalSpare,
        totalKategori: Object.keys(grouped).length
      }
    })

  } catch (err: any) {
    console.error('[units GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════
// POST - Tambah unit baru
// ═══════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const canManage = userRoles.some(r => 
    ['super_admin', 'hr_ho', 'pjo_site', 'gl_produksi'].includes(r)
  )

  if (!canManage) {
    return NextResponse.json({ error: 'Tidak punya akses tambah unit' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { 
      kode_unit, nama_unit, kategori, merk_model, site, 
      status, keterangan_status, is_spare, urutan 
    } = body

    // Validasi wajib
    if (!kode_unit || !kategori || !site) {
      return NextResponse.json({ 
        error: 'Kode unit, kategori, dan site wajib diisi' 
      }, { status: 400 })
    }

    // Validasi site akses (non-super hanya bisa tambah di site sendiri)
    const isSuperAdmin = userRoles.includes('super_admin')
    const isHRHO = userRoles.includes('hr_ho')
    if (!isSuperAdmin && !isHRHO) {
      const userSite = session.site || ''
      if (site !== userSite) {
        return NextResponse.json({ 
          error: `Anda hanya bisa kelola unit di site ${userSite}` 
        }, { status: 403 })
      }
    }

    // Normalize kode_unit (uppercase, no space)
    const normalizedKode = String(kode_unit).toUpperCase().replace(/\s+/g, '')

    // Cek duplicate
    const { data: existing } = await supabaseAdmin
      .from('unit_master')
      .select('id')
      .eq('kode_unit', normalizedKode)
      .eq('site', site)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ 
        error: `Unit ${normalizedKode} sudah terdaftar di site ${site}` 
      }, { status: 400 })
    }

    // Auto urutan
    let finalUrutan = urutan
    if (!finalUrutan) {
      const { data: maxData } = await supabaseAdmin
        .from('unit_master')
        .select('urutan')
        .eq('site', site)
        .eq('kategori', kategori)
        .order('urutan', { ascending: false })
        .limit(1)
        .maybeSingle()
      finalUrutan = (maxData?.urutan || 0) + 1
    }

    const { data, error } = await supabaseAdmin
      .from('unit_master')
      .insert({
        kode_unit: normalizedKode,
        nama_unit: nama_unit ? String(nama_unit).trim() : normalizedKode,
        kategori: String(kategori).trim().toUpperCase(),
        merk_model: merk_model ? String(merk_model).trim() : null,
        site,
        status: status || 'RFU',
        keterangan_status: keterangan_status || null,
        is_spare: !!is_spare,
        urutan: finalUrutan,
        active: true,
        created_by: session.nrp || 'unknown'
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      message: `✅ Unit ${normalizedKode} berhasil ditambahkan`,
      data
    })

  } catch (err: any) {
    console.error('[units POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════
// PUT - Update unit
// ═══════════════════════════════════════════════════════
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const canManage = userRoles.some(r => 
    ['super_admin', 'hr_ho', 'pjo_site', 'gl_produksi'].includes(r)
  )

  if (!canManage) {
    return NextResponse.json({ error: 'Tidak punya akses update unit' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { 
      id, nama_unit, kategori, merk_model, 
      status, keterangan_status, is_spare, urutan, active 
    } = body

    if (!id) return NextResponse.json({ error: 'ID unit wajib' }, { status: 400 })

    // Cek existing
    const { data: existing } = await supabaseAdmin
      .from('unit_master')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 })

    // Validasi site akses
    const isSuperAdmin = userRoles.includes('super_admin')
    const isHRHO = userRoles.includes('hr_ho')
    if (!isSuperAdmin && !isHRHO) {
      const userSite = session.site || ''
      if (existing.site !== userSite) {
        return NextResponse.json({ 
          error: `Anda hanya bisa update unit di site ${userSite}` 
        }, { status: 403 })
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
      updated_by: session.nrp || 'unknown'
    }

    if (nama_unit !== undefined) updateData.nama_unit = String(nama_unit).trim()
    if (kategori !== undefined) updateData.kategori = String(kategori).trim().toUpperCase()
    if (merk_model !== undefined) updateData.merk_model = merk_model
    if (status !== undefined) {
      if (!['RFU','BD'].includes(status)) {
        return NextResponse.json({ error: 'Status harus RFU atau BD' }, { status: 400 })
      }
      updateData.status = status
    }
    if (keterangan_status !== undefined) updateData.keterangan_status = keterangan_status
    if (is_spare !== undefined) updateData.is_spare = !!is_spare
    if (urutan !== undefined) updateData.urutan = urutan
    if (active !== undefined) updateData.active = !!active

    const { data, error } = await supabaseAdmin
      .from('unit_master')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      message: `✅ Unit ${existing.kode_unit} berhasil diupdate`,
      data
    })

  } catch (err: any) {
    console.error('[units PUT]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════
// DELETE - Hapus unit (soft delete)
// ═══════════════════════════════════════════════════════
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const canManage = userRoles.some(r => 
    ['super_admin', 'hr_ho', 'pjo_site'].includes(r)
  )

  if (!canManage) {
    return NextResponse.json({ error: 'Tidak punya akses hapus unit' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const hardDelete = searchParams.get('hard') === 'true'

    if (!id) return NextResponse.json({ error: 'ID unit wajib' }, { status: 400 })

    // Cek existing
    const { data: existing } = await supabaseAdmin
      .from('unit_master')
      .select('id, kode_unit, site')
      .eq('id', id)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Unit tidak ditemukan' }, { status: 404 })

    // Validasi site akses
    const isSuperAdmin = userRoles.includes('super_admin')
    const isHRHO = userRoles.includes('hr_ho')
    if (!isSuperAdmin && !isHRHO) {
      const userSite = session.site || ''
      if (existing.site !== userSite) {
        return NextResponse.json({ 
          error: `Anda hanya bisa hapus unit di site ${userSite}` 
        }, { status: 403 })
      }
    }

    // Hard delete hanya untuk super_admin
    if (hardDelete && isSuperAdmin) {
      // Cek apakah ada assignment yang pakai unit ini
      const { count } = await supabaseAdmin
        .from('unit_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('unit_kode', existing.kode_unit)
        .eq('site', existing.site)

      if (count && count > 0) {
        return NextResponse.json({ 
          error: `Unit ${existing.kode_unit} punya ${count} assignment. Soft delete saja.` 
        }, { status: 400 })
      }

      const { error } = await supabaseAdmin
        .from('unit_master')
        .delete()
        .eq('id', id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({
        ok: true,
        message: `✅ Unit ${existing.kode_unit} berhasil DIHAPUS PERMANEN`
      })
    }

    // Soft delete
    const { error } = await supabaseAdmin
      .from('unit_master')
      .update({ 
        active: false,
        updated_at: new Date().toISOString(),
        updated_by: session.nrp || 'unknown'
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      message: `✅ Unit ${existing.kode_unit} berhasil dinonaktifkan`
    })

  } catch (err: any) {
    console.error('[units DELETE]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}