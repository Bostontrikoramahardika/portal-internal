// app/api/punishment/route.ts
// Modul Punishment: CNC, Surat Komitmen, SP1, SP2, SP3
// Alur: leader buat (MENUNGGU_PJO) → PJO setujui (TERBIT) → HR arsip.
// KPI individual terpotong hanya saat status TERBIT.

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import { logAudit } from '@/app/lib/auditLog'

export const dynamic = 'force-dynamic'

const LEADER_ROLES = ['gl_produksi', 'gl_plant', 'atasan', 'admin_plant', 'admin_site']
const PJO_ROLES = ['pjo_site', 'pjo']
const HR_ROLES = ['hr_site', 'hrga_site', 'hr_ho', 'hrga', 'hrga_pusat', 'admin', 'super_admin']
const HO_SCOPE_ROLES = ['hr_ho', 'hrga', 'hrga_pusat', 'admin', 'super_admin', 'director_ops', 'manager_ops', 'spv_she_ho']

function rolesOf(session: any): string[] {
  return (session?.roles || []).map((r: string) => String(r).toLowerCase())
}
function hasAny(roles: string[], list: string[]) {
  return roles.some((r) => list.includes(r))
}
const BULAN_ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

function nomorSurat(urut: number, kode: string, site: string, tgl: Date) {
  const n = String(urut).padStart(3, '0')
  const bln = BULAN_ROMAWI[tgl.getMonth()]
  return `${n}/${kode}/${site || 'MLP'}/${bln}/${tgl.getFullYear()}`
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const roles = rolesOf(session)
    const isSuper = !!session.is_super_admin
    const isHR = isSuper || hasAny(roles, HR_ROLES)
    const isPJO = hasAny(roles, PJO_ROLES)
    const isLeader = hasAny(roles, LEADER_ROLES)

    if (!isHR && !isPJO && !isLeader) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const bulan = searchParams.get('bulan') || String(new Date().getMonth() + 1).padStart(2, '0')
    const tahun = searchParams.get('tahun') || String(new Date().getFullYear())
    const site = searchParams.get('site') || ''
    const status = searchParams.get('status') || ''
    const jenis = searchParams.get('jenis') || ''
    const hanyaArsip = searchParams.get('arsip') === '1'

    // ── pengaturan poin ──
    const peringatan: string[] = []

    const { data: poinRows, error: poinErr } = await supabase
      .from('punishment_poin')
      .select('jenis, label, poin, urutan, aktif')
      .order('urutan', { ascending: true })
    if (poinErr) peringatan.push('punishment_poin: ' + poinErr.message)

    // ── daftar karyawan untuk pilihan di form ──
    //  • super admin / HR HO     → semua karyawan aktif (semua site)
    //  • HR site / PJO / admin   → semua karyawan aktif di site-nya
    //  • leader (GL/atasan)      → bawahan langsung + karyawan site yang sama
    const myNrp = String((session as any).nrp || '')
    const mySite = String((session as any).scope_site || (session as any).site || (session as any).site_code || '')
    const isHOScope0 = isSuper || hasAny(roles, HO_SCOPE_ROLES)

    // a. bawahan langsung (atasan_nrp / pjo_nrp = saya)
    const { data: bawahanLangsung, error: bawahErr } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site, atasan_nrp, pjo_nrp')
      .or(`atasan_nrp.eq.${myNrp},pjo_nrp.eq.${myNrp}`)
      .order('nama', { ascending: true })
    if (bawahErr) peringatan.push('bawahan: ' + bawahErr.message)

    // b. karyawan aktif dalam jangkauan (site sendiri, atau semua untuk HO/super admin)
    let qKaryawan = supabase
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site, atasan_nrp, pjo_nrp')
      .eq('status_karyawan', 'Aktif')
      .is('tanggal_resign', null)
      .order('nama', { ascending: true })
      .limit(2000)
    if (!isHOScope0 && mySite) qKaryawan = qKaryawan.eq('site', mySite)
    const { data: karyawanScope, error: empErr } = await qKaryawan
    if (empErr) peringatan.push('employees: ' + empErr.message)

    // gabungkan: bawahan langsung ditaruh paling depan, lalu karyawan jangkauan
    const petaOrang = new Map<string, any>()
    ;(bawahanLangsung || []).forEach((b: any) => petaOrang.set(String(b.nrp), { ...b, langsung: true }))
    ;(karyawanScope || []).forEach((b: any) => {
      const k = String(b.nrp)
      if (!petaOrang.has(k)) petaOrang.set(k, { ...b, langsung: false })
    })
    // buang diri sendiri dari daftar
    petaOrang.delete(myNrp)
    const bawahan = Array.from(petaOrang.values())

    // ── daftar punishment ──
    const firstDay = `${tahun}-${bulan}-01`
    const lastDayNum = new Date(Number(tahun), Number(bulan), 0).getDate()
    const lastDay = `${tahun}-${bulan}-${String(lastDayNum).padStart(2, '0')}`

    let q = supabase
      .from('punishments')
      .select('*')
      .gte('tanggal_terbit', firstDay)
      .lte('tanggal_terbit', lastDay)
      .order('created_at', { ascending: false })

    if (status) q = q.eq('status', status)
    if (jenis) q = q.eq('jenis', jenis)
    if (site) q = q.eq('site', site)
    if (hanyaArsip) q = q.eq('hr_arsip', true)
    else q = q.eq('hr_arsip', false)

    // batasi sesuai peran
    const isHOScope = isSuper || hasAny(roles, HO_SCOPE_ROLES)
    const userSite = String((session as any).scope_site || (session as any).site || '')

    if (!isHR) {
      if (isPJO) {
        if (!isHOScope && userSite) q = q.eq('site', userSite)
      } else {
        // leader: hanya yang dia buat / bawahannya
        // untuk daftar riwayat, leader tetap dibatasi ke bawahan LANGSUNG-nya
        const nrpBawahan = (bawahanLangsung || []).map((b: any) => String(b.nrp))
        if (nrpBawahan.length > 0) {
          q = q.or(`dibuat_oleh.eq.${myNrp},nrp.in.(${nrpBawahan.join(',')})`)
        } else {
          q = q.eq('dibuat_oleh', myNrp)
        }
      }
    } else if (!isHOScope && userSite) {
      q = q.eq('site', userSite)
    }

    const { data: rows, error } = await q
    if (error) peringatan.push('punishments: ' + error.message)

    const list = rows || []
    const stats = {
      total: list.length,
      menunggu: list.filter((r: any) => r.status === 'MENUNGGU_PJO').length,
      terbit: list.filter((r: any) => r.status === 'TERBIT').length,
      ditolak: list.filter((r: any) => r.status === 'DITOLAK').length,
      poin: list.filter((r: any) => r.status === 'TERBIT').reduce((a: number, r: any) => a + Number(r.poin || 0), 0),
    }

    return NextResponse.json({
      success: true,
      rows: list,
      stats,
      poin_setting: poinRows || [],
      bawahan: bawahan || [],
      peringatan,
      saya: {
        nrp: myNrp,
        nama: (session as any).nama || '',
        peran: { isHR, isPJO, isLeader, isHO: isHOScope },
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal memuat' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const roles = rolesOf(session)
    const isHR = !!session.is_super_admin || hasAny(roles, HR_ROLES)
    const isPJO = hasAny(roles, PJO_ROLES)
    const isLeader = hasAny(roles, LEADER_ROLES)
    if (!isHR && !isPJO && !isLeader) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })

    const body = await request.json()
    const {
      jenis, nrp, pelanggaran, uraian, dasar_aturan,
      tanggal_kejadian, tanggal_terbit, masa_berlaku_hari, sanksi_ke,
      hari, waktu_pertemuan, tempat,
      materi_pribadi, materi_keluarga, materi_pekerjaan,
      solusi, komitmen, nomor_surat: nomorManual, lampiran_url,
    } = body

    if (!jenis || !nrp) return NextResponse.json({ error: 'Jenis dan karyawan wajib diisi' }, { status: 400 })
    if (!['CNC', 'SK', 'SP1', 'SP2', 'SP3'].includes(jenis)) {
      return NextResponse.json({ error: 'Jenis punishment tidak dikenal' }, { status: 400 })
    }
    if (String(nrp) === String((session as any).nrp)) {
      return NextResponse.json({ error: 'Tidak bisa memberi punishment ke diri sendiri' }, { status: 400 })
    }

    const { data: emp } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site, atasan_nrp, pjo_nrp')
      .eq('nrp', nrp)
      .maybeSingle()

    if (!emp) return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 })

    const myNrp = String((session as any).nrp || '')
    if (!isHR && !isPJO) {
      const isSuperPost = !!session.is_super_admin
      const rolesPost = rolesOf(session)
      const isHRPost = isSuperPost || hasAny(rolesPost, HR_ROLES)
      const isHOPost = isSuperPost || hasAny(rolesPost, HO_SCOPE_ROLES)
      const mySitePost = String((session as any).scope_site || (session as any).site || '')
      const bawahanLangsung =
        String((emp as any).atasan_nrp || '') === myNrp ||
        String((emp as any).pjo_nrp || '') === myNrp
      const seSite = !!mySitePost && String((emp as any).site || '') === mySitePost
      const boleh = isHOPost ? true : (bawahanLangsung || seSite)
      if (!boleh) return NextResponse.json({ error: 'Karyawan ini di luar jangkauan Anda' }, { status: 403 })
    }

    // poin dari pengaturan
    const { data: setPo } = await supabase
      .from('punishment_poin').select('poin').eq('jenis', jenis).maybeSingle()
    const poin = Number(setPo?.poin || 0)

    // nomor surat otomatis
    const tglTerbit = tanggal_terbit ? new Date(tanggal_terbit) : new Date()
    let nomor = nomorManual || ''
    if (!nomor) {
      const awal = new Date(tglTerbit.getFullYear(), tglTerbit.getMonth(), 1).toISOString().slice(0, 10)
      const akhir = new Date(tglTerbit.getFullYear(), tglTerbit.getMonth() + 1, 0).toISOString().slice(0, 10)
      const { count } = await supabase
        .from('punishments')
        .select('id', { count: 'exact', head: true })
        .gte('tanggal_terbit', awal)
        .lte('tanggal_terbit', akhir)
      nomor = nomorSurat((count || 0) + 1, `HR-BTM-${jenis}`, (emp as any).site || '', tglTerbit)
    }

    const masaHari = Number(masa_berlaku_hari || 180)
    const berakhir = new Date(tglTerbit.getTime() + (masaHari - 1) * 86400000)

    const payload = {
      nomor_surat: nomor,
      jenis,
      nrp: String(nrp),
      nama: (emp as any).nama,
      jabatan: (emp as any).jabatan,
      departemen: (emp as any).departemen,
      site: (emp as any).site,
      pelanggaran: pelanggaran || null,
      uraian: uraian || null,
      dasar_aturan: dasar_aturan || null,
      tanggal_kejadian: tanggal_kejadian || null,
      tanggal_terbit: tglTerbit.toISOString().slice(0, 10),
      masa_berlaku_hari: masaHari,
      tanggal_berakhir: berakhir.toISOString().slice(0, 10),
      sanksi_ke: sanksi_ke ? Number(sanksi_ke) : null,
      hari: hari || null,
      waktu_pertemuan: waktu_pertemuan || null,
      tempat: tempat || null,
      materi_pribadi: !!materi_pribadi,
      materi_keluarga: !!materi_keluarga,
      materi_pekerjaan: !!materi_pekerjaan,
      solusi: solusi || null,
      komitmen: komitmen || null,
      dibuat_oleh: myNrp,
      dibuat_oleh_nama: (session as any).nama || '',
      dibuat_oleh_jabatan: (session as any).jabatan || null,
      status: 'MENUNGGU_PJO',
      poin,
      lampiran_url: lampiran_url || null,
    }

    const { data: inserted, error } = await supabase
      .from('punishments').insert(payload).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAudit({
      actor_nrp: myNrp,
      actor_nama: (session as any).nama || '',
      action: 'CREATE_PUNISHMENT',
      category: 'EMPLOYEE' as const,
      target_type: 'punishment',
      target_id: (inserted as any).id,
      target_label: `${jenis} untuk ${(emp as any).nama}`,
    }).catch(() => {})

    return NextResponse.json({ success: true, data: inserted, message: `Punishment ${jenis} dibuat, menunggu persetujuan PJO` })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal menyimpan' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const roles = rolesOf(session)
    const isSuper = !!session.is_super_admin
    const isHR = isSuper || hasAny(roles, HR_ROLES)
    const isPJO = hasAny(roles, PJO_ROLES)
    const myNrp = String((session as any).nrp || '')

    const { id, action, catatan } = await request.json()
    if (!id || !action) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })

    const { data: row } = await supabase.from('punishments').select('*').eq('id', id).maybeSingle()
    if (!row) return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })

    let patch: any = { updated_at: new Date().toISOString() }

    if (action === 'approve') {
      if (!isPJO && !isSuper) return NextResponse.json({ error: 'Hanya PJO yang bisa menyetujui' }, { status: 403 })
      patch = { ...patch, status: 'TERBIT', pjo_nrp: myNrp, pjo_nama: (session as any).nama || '', pjo_catatan: catatan || null, pjo_at: new Date().toISOString() }
    } else if (action === 'reject') {
      if (!isPJO && !isSuper) return NextResponse.json({ error: 'Hanya PJO yang bisa menolak' }, { status: 403 })
      patch = { ...patch, status: 'DITOLAK', pjo_nrp: myNrp, pjo_nama: (session as any).nama || '', pjo_catatan: catatan || null, pjo_at: new Date().toISOString() }
    } else if (action === 'arsip') {
      if (!isHR) return NextResponse.json({ error: 'Hanya HR yang bisa mengarsipkan' }, { status: 403 })
      patch = { ...patch, hr_arsip: true, hr_nrp: myNrp, hr_nama: (session as any).nama || '', hr_catatan: catatan || null, hr_at: new Date().toISOString() }
    } else if (action === 'batal') {
      if (String((row as any).dibuat_oleh) !== myNrp && !isHR) {
        return NextResponse.json({ error: 'Hanya pembuat atau HR yang bisa membatalkan' }, { status: 403 })
      }
      patch = { ...patch, status: 'DIBATALKAN' }
    } else {
      return NextResponse.json({ error: 'Aksi tidak dikenal' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('punishments').update(patch).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAudit({
      actor_nrp: myNrp,
      actor_nama: (session as any).nama || '',
      action: `PUNISHMENT_${action.toUpperCase()}`,
      category: 'EMPLOYEE' as const,
      target_type: 'punishment',
      target_id: id,
      target_label: `${(row as any).jenis} ${(row as any).nama}`,
    }).catch(() => {})

    return NextResponse.json({ success: true, data: updated, message: 'Berhasil diperbarui' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal memperbarui' }, { status: 500 })
  }
}
