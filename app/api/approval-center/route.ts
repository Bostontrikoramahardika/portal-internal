// app/api/approval-center/route.ts
// API terpusat untuk Approval Center — gabungan Cuti, Lembur, Sakit
// Return semua pengajuan PENDING yang perlu diapprove user login

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const tahap = searchParams.get('tahap') || 'ATASAN' // ATASAN atau PJO

    const nrp = session.nrp
    const roles = (session.roles || []).map((r: string) => r.toLowerCase())
    const isPJO = roles.some((r: string) => ['pjo_site', 'pjo'].includes(r))
    const isAtasanRole = roles.some((r: string) =>
      ['gl_produksi', 'gl_plant', 'hr_site', 'atasan'].includes(r)
    )
    const isSuperAdmin = session.is_super_admin || false

    // Cek apakah user PERNAH dipilih sebagai atasan / PJO oleh siapapun
    // (biar tab muncul cuma kalau memang ada tugas)
    const [cutiCheck, lemburCheck, sakitCheck] = await Promise.all([
      supabase.from('leave_requests').select('atasan_nrp, pjo_nrp').or(`atasan_nrp.eq.${nrp},pjo_nrp.eq.${nrp}`).limit(1),
      supabase.from('overtime_requests').select('atasan_nrp, pjo_nrp').or(`atasan_nrp.eq.${nrp},pjo_nrp.eq.${nrp}`).limit(1),
      supabase.from('attendance_evidences').select('atasan_nrp').eq('atasan_nrp', nrp).limit(1)
    ])

    // Deteksi: user pernah jadi atasan?
    const pernahJadiAtasan = 
      (cutiCheck.data || []).some(r => r.atasan_nrp === nrp) ||
      (lemburCheck.data || []).some(r => r.atasan_nrp === nrp) ||
      (sakitCheck.data || []).length > 0

    // Deteksi: user pernah jadi PJO?
    const pernahJadiPJO = 
      (cutiCheck.data || []).some(r => r.pjo_nrp === nrp) ||
      (lemburCheck.data || []).some(r => r.pjo_nrp === nrp)

    // Super Admin bypass semua
    const showAtasanTab = isSuperAdmin || isAtasanRole || pernahJadiAtasan
    const showPjoTab = isSuperAdmin || isPJO || pernahJadiPJO

    // ═══════════════════════════════════════════════
    // 1. AMBIL DATA CUTI
    // ═══════════════════════════════════════════════
    let cutiQuery = supabase
      .from('leave_requests')
      .select('*')

    if (tahap === 'ATASAN') {
      cutiQuery = cutiQuery.eq('atasan_nrp', nrp).eq('status_atasan', 'PENDING')
    } else if (tahap === 'PJO') {
      // Cuti yang sudah diapprove atasan, sekarang tinggal PJO
      cutiQuery = cutiQuery
        .eq('pjo_nrp', nrp)
        .eq('status_atasan', 'APPROVED')
        .eq('status_pjo', 'PENDING')
    }

    const { data: cutiRaw } = await cutiQuery.order('created_at', { ascending: false })

    // ═══════════════════════════════════════════════
    // 2. AMBIL DATA LEMBUR
    // ═══════════════════════════════════════════════
    let lemburQuery = supabase
      .from('overtime_requests')
      .select('*')

    if (tahap === 'ATASAN') {
      lemburQuery = lemburQuery.eq('atasan_nrp', nrp).eq('status_atasan', 'PENDING')
    } else if (tahap === 'PJO') {
      lemburQuery = lemburQuery
        .eq('pjo_nrp', nrp)
        .eq('status_atasan', 'APPROVED')
        .eq('status_pjo', 'PENDING')
    }

    const { data: lemburRaw } = await lemburQuery.order('created_at', { ascending: false })

    // ═══════════════════════════════════════════════
    // 3. AMBIL DATA SAKIT/IZIN
    // ═══════════════════════════════════════════════
    let sakitQuery = supabase
      .from('attendance_evidences')
      .select('*')
      .eq('status_atasan', 'PENDING')

    // Sakit cuma perlu approval ATASAN (tidak ada tahap PJO)
    if (tahap === 'ATASAN') {
      sakitQuery = sakitQuery.eq('atasan_nrp', nrp)
    } else {
      // Kalau tahap PJO, sakit tidak ditampilkan (kosong)
      sakitQuery = sakitQuery.eq('id', 'no-match-dummy')
    }

    const { data: sakitRaw } = await sakitQuery.order('created_at', { ascending: false })

    // ═══════════════════════════════════════════════
    // 4. ENRICH NAMA KARYAWAN
    // ═══════════════════════════════════════════════
    const allNrps = new Set<string>()
    ;(cutiRaw || []).forEach(r => r.nrp && allNrps.add(String(r.nrp)))
    ;(lemburRaw || []).forEach(r => r.nrp && allNrps.add(String(r.nrp)))
    ;(sakitRaw || []).forEach(r => r.nrp && allNrps.add(String(r.nrp)))

    const empMap = new Map<string, any>()
    if (allNrps.size > 0) {
      const { data: emps } = await supabase
        .from('employees')
        .select('nrp, nama, jabatan, site, departemen')
        .in('nrp', Array.from(allNrps))
      ;(emps || []).forEach(e => empMap.set(String(e.nrp), e))
    }

    // Untuk sakit yang pakai nama_karyawan (bukan nrp)
    const namaKaryawanSakit = new Set<string>()
    ;(sakitRaw || []).forEach(r => {
      if (!r.nrp && r.nama_karyawan) namaKaryawanSakit.add(r.nama_karyawan)
    })

    // ═══════════════════════════════════════════════
    // 5. FORMAT DATA JADI STRUKTUR SERAGAM
    // ═══════════════════════════════════════════════
    const cutiItems = (cutiRaw || []).map((r: any) => {
      const emp = empMap.get(String(r.nrp))
      const hariCount = r.tanggal_mulai && r.tanggal_selesai 
        ? Math.ceil((new Date(r.tanggal_selesai).getTime() - new Date(r.tanggal_mulai).getTime()) / 86400000) + 1 
        : 1
      return {
        id: r.id,
        jenis: 'CUTI',
        judul: `Cuti ${r.jenis_cuti || 'Umum'}`,
        icon: '🌴',
        color: 'blue',
        karyawan_nrp: r.nrp,
        karyawan_nama: emp?.nama || r.nrp || '-',
        karyawan_jabatan: emp?.jabatan || '-',
        karyawan_site: emp?.site || '-',
        tanggal_mulai: r.tanggal_mulai,
        tanggal_selesai: r.tanggal_selesai,
        durasi: `${hariCount} hari`,
        alasan: r.alasan || '-',
        created_at: r.created_at,
        status_atasan: r.status_atasan,
        status_pjo: r.status_pjo,
        _raw: r  // simpan raw untuk kebutuhan approve
      }
    })

    const lemburItems = (lemburRaw || []).map((r: any) => {
      const emp = empMap.get(String(r.nrp))
      return {
        id: r.id,
        jenis: 'LEMBUR',
        judul: `Lembur ${r.jenis_lembur || 'Biasa'}`,
        icon: '⏱️',
        color: 'amber',
        karyawan_nrp: r.nrp,
        karyawan_nama: emp?.nama || r.nrp || '-',
        karyawan_jabatan: emp?.jabatan || '-',
        karyawan_site: emp?.site || '-',
        tanggal_mulai: r.tanggal,
        jam_mulai: r.jam_mulai,
        jam_selesai: r.jam_selesai,
        durasi: `${r.jam_mulai || '--'} - ${r.jam_selesai || '--'}`,
        alasan: r.alasan || '-',
        created_at: r.created_at,
        status_atasan: r.status_atasan,
        status_pjo: r.status_pjo,
        _raw: r
      }
    })

    const sakitItems = (sakitRaw || []).map((r: any) => {
      const emp = r.nrp ? empMap.get(String(r.nrp)) : null
      const kategori = r.kategori || 'SAKIT'
      
      // Mapping per kategori - jenis kini SPESIFIK untuk filter
      const configMap: any = {
        'SAKIT': { 
          jenis: 'SAKIT', 
          judul: 'Sakit', 
          icon: '🤒', 
          color: 'rose' 
        },
        'IZIN_POTONGAN': { 
          jenis: 'IZIN_POTONGAN', 
          judul: 'Izin Potongan Gaji', 
          icon: '⚠️', 
          color: 'amber' 
        },
        'IZIN_BERBAYAR': { 
          jenis: 'IZIN_BERBAYAR', 
          judul: 'Izin Berbayar', 
          icon: '✅', 
          color: 'emerald' 
        }
      }
      
      const conf = configMap[kategori] || configMap['SAKIT']
      
      return {
        id: r.id,
        jenis: conf.jenis,           // ✅ Sekarang bisa: SAKIT / IZIN_POTONGAN / IZIN_BERBAYAR
        judul: conf.judul,
        icon: conf.icon,
        color: conf.color,
        karyawan_nrp: r.nrp,
        karyawan_nama: emp?.nama || r.nama_karyawan || '-',
        karyawan_jabatan: emp?.jabatan || '-',
        karyawan_site: emp?.site || '-',
        tanggal_mulai: r.tanggal,
        durasi: '1 hari',
        alasan: r.keterangan || r.alasan_izin || '-',
        alasan_izin: r.alasan_izin,
        foto_url: r.foto_url,
        kategori: kategori,
        created_at: r.created_at,
        status_atasan: r.status_atasan,
        _raw: r
      }
    })

    // ═══════════════════════════════════════════════
    // 6. GABUNGKAN & SORT
    // ═══════════════════════════════════════════════
    const all = [...cutiItems, ...lemburItems, ...sakitItems]
    all.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({
      items: all,
      stats: {
        total: all.length,
        cuti: cutiItems.length,
        lembur: lemburItems.length,
        sakit: sakitItems.filter(s => s.jenis === 'SAKIT').length,
        izin_potongan: sakitItems.filter(s => s.jenis === 'IZIN_POTONGAN').length,
        izin_berbayar: sakitItems.filter(s => s.jenis === 'IZIN_BERBAYAR').length
      },
      tahap,
      is_pjo: isPJO,
      show_atasan_tab: showAtasanTab,   // ✨ BARU
      show_pjo_tab: showPjoTab          // ✨ BARU
    })

  } catch (err: any) {
    console.error('Approval Center error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}