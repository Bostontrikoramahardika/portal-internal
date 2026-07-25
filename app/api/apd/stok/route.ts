// app/api/apd/stok/route.ts — v1.0
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { getWitaToday } from '@/app/lib/timezone'

// ═══ GET — Stok summary + log mutasi ═══
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []

  const allowed = ['super_admin', 'hr_ho', 'hr_site', 'she_site', 'spv_she_ho', 'manager_ops']
  if (!allowed.some(r => userRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const jenis = searchParams.get('jenis')
  const view = searchParams.get('view') || 'summary' // summary | log

  // ═══ Summary: stok saat ini per jenis+ukuran+warna ═══
  if (view === 'summary') {
    const { data: master } = await supabaseAdmin
      .from('apd_master')
      .select('jenis_apd, icon, ukuran_tersedia, warna_tersedia')
      .eq('active', true)
      .order('urutan')

    // Hitung stok (masuk - keluar) per jenis+ukuran+warna
    const { data: stokData } = await supabaseAdmin
      .from('apd_stok')
      .select('jenis_apd, ukuran, warna, tipe, qty')

    // Agregasi
    const stokMap: Record<string, number> = {}
    for (const row of stokData || []) {
      const key = `${row.jenis_apd}|||${row.ukuran || '-'}|||${row.warna || '-'}`
      if (!stokMap[key]) stokMap[key] = 0
      if (row.tipe === 'masuk') stokMap[key] += row.qty
      else stokMap[key] -= row.qty
    }

    // Format per master
    const summary = (master || []).map(m => {
      const rows: any[] = []
      const ukuranList = m.ukuran_tersedia?.length ? m.ukuran_tersedia : ['-']
      const warnaList = m.warna_tersedia?.length ? m.warna_tersedia : ['-']

      for (const uk of ukuranList) {
        for (const wn of warnaList) {
          const key = `${m.jenis_apd}|||${uk}|||${wn}`
          const qty = stokMap[key] || 0
          rows.push({ ukuran: uk, warna: wn, qty, status: qty <= 0 ? 'HABIS' : qty <= 5 ? 'MENIPIS' : 'OK' })
        }
      }

      const totalQty = rows.reduce((s, r) => s + r.qty, 0)
      return { jenis_apd: m.jenis_apd, icon: m.icon, total_qty: totalQty, rows }
    })

    return NextResponse.json({ ok: true, data: summary })
  }

  // ═══ Log: riwayat mutasi stok ═══
  let query = supabaseAdmin
    .from('apd_stok')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (jenis) query = query.eq('jenis_apd', jenis)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

// ═══ POST — Input stok masuk ═══
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []

  const allowed = ['super_admin', 'hr_ho', 'hr_site', 'she_site', 'spv_she_ho']
  if (!allowed.some(r => userRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const body = await req.json()
  const { items, keterangan, tanggal } = body
  // items: [{ jenis_apd, ukuran, warna, qty }]

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items wajib diisi' }, { status: 400 })
  }

  const today = getWitaToday()
  const tanggalFinal = tanggal || today

  const insertRows = items.map((item: any) => ({
    jenis_apd: item.jenis_apd,
    ukuran: item.ukuran || null,
    warna: item.warna || null,
    qty: Number(item.qty),
    tipe: 'masuk',
    tanggal: tanggalFinal,
    keterangan: keterangan || null,
    created_by: session.nrp
  }))

  const { data, error } = await supabaseAdmin
    .from('apd_stok')
    .insert(insertRows)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data, count: data.length })
}

// ═══ DELETE — Hapus entri stok (koreksi salah input) ═══
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []

  // Hanya super_admin yang boleh hapus stok (prevent abuse)
  if (!userRoles.includes('super_admin') && !userRoles.includes('hr_ho')) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 })

  const { error } = await supabaseAdmin.from('apd_stok').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}