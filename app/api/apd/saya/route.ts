// app/api/apd/saya/route.ts
// v1.3 — Karyawan view + support PENDING requests
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { getWitaToday } from '@/app/lib/timezone'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  
  const session: any = auth.session!
  const nrp = session.nrp
  
  if (!nrp) return NextResponse.json({ error: 'NRP tidak ditemukan' }, { status: 400 })
  
  try {
    // 1. Info karyawan
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site, tanggal_masuk')
      .eq('nrp', nrp)
      .single()
    
    // 2. Master APD (untuk dropdown & icon)
    const { data: masterList } = await supabaseAdmin
      .from('apd_master')
      .select('*')
      .eq('active', true)
      .order('urutan', { ascending: true })
    
    const masterMap: Record<string, any> = {}
    for (const m of (masterList || [])) {
      masterMap[m.jenis_apd] = m
    }
    
    // 3. Semua riwayat karyawan
    const { data: histories, error: errHist } = await supabaseAdmin
      .from('apd_history')
      .select('*')
      .eq('nrp', nrp)
      .order('tanggal_terima', { ascending: false })
    
    if (errHist) throw errHist
    
    const today = getWitaToday()
    const todayDate = new Date(today)
    
    // 4. Pisahkan PENDING vs VERIFIED
    const allHistories = histories || []
    const pendingList = allHistories.filter((h: any) => h.status === 'PENDING')
    const rejectedList = allHistories.filter((h: any) => h.status === 'REJECTED')
    const verifiedList = allHistories.filter((h: any) => h.status === 'VERIFIED' || !h.status)
    
    // 5. Group verified per jenis (untuk tampilan card)
    const historyByJenis: Record<string, any[]> = {}
    for (const h of verifiedList) {
      if (!historyByJenis[h.jenis_apd]) historyByJenis[h.jenis_apd] = []
      historyByJenis[h.jenis_apd].push(h)
    }
    
    // 6. Build items dari yang punya history VERIFIED
    const items = Object.keys(historyByJenis).map((jenis) => {
      const jenisHistory = historyByJenis[jenis]
      const latest = jenisHistory[0]
      const master = masterMap[jenis] || { 
        jenis_apd: jenis, icon: '🦺', life_time_bulan: 12, urutan: 999
      }
      
      const terimaDate = new Date(latest.tanggal_terima)
      const daysSinceReceive = Math.floor((todayDate.getTime() - terimaDate.getTime()) / (1000 * 60 * 60 * 24))
      const isNew = daysSinceReceive <= 7 && daysSinceReceive >= 0
      
      return {
        master: {
          jenis_apd: master.jenis_apd,
          icon: master.icon,
          life_time_bulan: master.life_time_bulan,
          urutan: master.urutan
        },
        latest,
        isNew,
        totalTerima: jenisHistory.length,
        history: jenisHistory
      }
    })
    
    items.sort((a, b) => (a.master.urutan || 999) - (b.master.urutan || 999))
    
    const newItems = items.filter(i => i.isNew).map(i => ({
      jenis_apd: i.master.jenis_apd,
      icon: i.master.icon,
      ukuran: i.latest?.ukuran,
      jumlah: i.latest?.jumlah,
      tanggal_terima: i.latest?.tanggal_terima
    }))
    
    return NextResponse.json({
      ok: true,
      today,
      employee: emp || { nrp, nama: session.nama || '-', jabatan: '-', departemen: '-', site: '-', tanggal_masuk: null },
      totalJenis: items.length,
      newItems,
      items,
      pending: pendingList,
      rejected: rejectedList,
      masterList: (masterList || []).map((m: any) => ({
        jenis_apd: m.jenis_apd,
        icon: m.icon,
        ukuran_tersedia: m.ukuran_tersedia || [],
        warna_tersedia: m.warna_tersedia || [],
        life_time_bulan: m.life_time_bulan
      }))
    })
  } catch (e: any) {
    console.error('[APD SAYA] Error:', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════
// POST — Karyawan submit request APD baru
// ═══════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  
  const session: any = auth.session!
  const nrp = session.nrp
  
  if (!nrp) return NextResponse.json({ error: 'NRP tidak ditemukan' }, { status: 400 })
  
  try {
    const body = await req.json()
    const { jenis_apd, ukuran, warna, jumlah, tanggal_terima, keterangan } = body
    
    // Validasi
    if (!jenis_apd) return NextResponse.json({ error: 'Jenis APD wajib diisi' }, { status: 400 })
    if (!ukuran) return NextResponse.json({ error: 'Ukuran wajib diisi' }, { status: 400 })
    if (!jumlah || jumlah < 1) return NextResponse.json({ error: 'Jumlah minimal 1' }, { status: 400 })
    if (!tanggal_terima) return NextResponse.json({ error: 'Tanggal terima wajib diisi' }, { status: 400 })
    
    // Cek jenis APD valid
    const { data: master } = await supabaseAdmin
      .from('apd_master')
      .select('*')
      .eq('jenis_apd', jenis_apd)
      .eq('active', true)
      .single()
    
    if (!master) return NextResponse.json({ error: 'Jenis APD tidak valid' }, { status: 400 })
    
    // Get nama & count penerimaan sebelumnya
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('nama')
      .eq('nrp', nrp)
      .single()
    
    if (!emp) return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 })
    
    // Hitung penerimaan_ke berdasarkan riwayat VERIFIED sebelumnya
    const { count: verifiedCount } = await supabaseAdmin
      .from('apd_history')
      .select('*', { count: 'exact', head: true })
      .eq('nrp', nrp)
      .eq('jenis_apd', jenis_apd)
      .eq('status', 'VERIFIED')
    
    const penerimaanKe = (verifiedCount || 0) + 1
    
    // Insert record PENDING
    const { data: inserted, error: errInsert } = await supabaseAdmin
      .from('apd_history')
      .insert({
        nrp,
        nama_karyawan: emp.nama,
        jenis_apd,
        ukuran,
        warna: warna || null,
        jumlah,
        tanggal_terima,
        penerimaan_ke: penerimaanKe,
        status: 'PENDING',
        input_source: 'KARYAWAN',
        input_by: nrp,
        source: 'karyawan_request',
        keterangan: keterangan || null
      })
      .select()
      .single()
    
    if (errInsert) throw errInsert
    
    return NextResponse.json({
      ok: true,
      message: 'Request berhasil disubmit. Menunggu verifikasi HR/SHE.',
      data: inserted
    })
  } catch (e: any) {
    console.error('[APD SAYA POST] Error:', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════
// PUT — Edit request PENDING sendiri
// ═══════════════════════════════════════════════
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  
  const session: any = auth.session!
  const nrp = session.nrp
  
  try {
    const body = await req.json()
    const { id, jenis_apd, ukuran, warna, jumlah, tanggal_terima, keterangan } = body
    
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })
    
    // Cek record milik karyawan & status PENDING
    const { data: existing } = await supabaseAdmin
      .from('apd_history')
      .select('*')
      .eq('id', id)
      .eq('nrp', nrp)
      .single()
    
    if (!existing) return NextResponse.json({ error: 'Record tidak ditemukan' }, { status: 404 })
    if (existing.status !== 'PENDING') {
      return NextResponse.json({ error: 'Hanya request PENDING yang bisa diedit' }, { status: 403 })
    }
    
    // Update
    const { data: updated, error: errUpdate } = await supabaseAdmin
      .from('apd_history')
      .update({
        jenis_apd: jenis_apd || existing.jenis_apd,
        ukuran: ukuran || existing.ukuran,
        warna: warna !== undefined ? warna : existing.warna,
        jumlah: jumlah || existing.jumlah,
        tanggal_terima: tanggal_terima || existing.tanggal_terima,
        keterangan: keterangan !== undefined ? keterangan : existing.keterangan,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (errUpdate) throw errUpdate
    
    return NextResponse.json({ ok: true, message: 'Request berhasil diupdate', data: updated })
  } catch (e: any) {
    console.error('[APD SAYA PUT] Error:', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════
// DELETE — Hapus request PENDING sendiri
// ═══════════════════════════════════════════════
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  
  const session: any = auth.session!
  const nrp = session.nrp
  
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })
    
    // Cek record milik karyawan & status PENDING/REJECTED
    const { data: existing } = await supabaseAdmin
      .from('apd_history')
      .select('*')
      .eq('id', id)
      .eq('nrp', nrp)
      .single()
    
    if (!existing) return NextResponse.json({ error: 'Record tidak ditemukan' }, { status: 404 })
    if (existing.status === 'VERIFIED') {
      return NextResponse.json({ error: 'Record VERIFIED tidak bisa dihapus' }, { status: 403 })
    }
    
    const { error: errDel } = await supabaseAdmin
      .from('apd_history')
      .delete()
      .eq('id', id)
    
    if (errDel) throw errDel
    
    return NextResponse.json({ ok: true, message: 'Request berhasil dihapus' })
  } catch (e: any) {
    console.error('[APD SAYA DELETE] Error:', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}