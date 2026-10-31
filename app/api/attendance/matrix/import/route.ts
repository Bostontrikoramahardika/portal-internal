// app/api/attendance/matrix/import/route.ts
// IMPORT KOREKSI ABSENSI DARI EXCEL
// Membaca file hasil tombol "Excel Matrix" (atau file serupa), lalu
// menerapkan perubahan kode absensi ke tabel attendance.
//
// Layout yang dikenali:
//   baris header : NO | NRP | NAMA | JABATAN | SITE | 1 | 2 | ... | 31 | HDR | DS | ...
//   baris data   : satu baris per karyawan, sel tanggal berisi kode (DS/NS/A/OFF/...)

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BOLEH_IMPORT = [
  'hr_site', 'hrga_site', 'hr_ho', 'hrga', 'hrga_pusat', 'hrga_oprek',
  'admin', 'admin_site', 'admin_plant', 'pjo_site', 'pjo', 'super_admin',
]
const HO_LINTAS = ['hr_ho', 'hrga', 'hrga_pusat', 'hrga_oprek', 'admin', 'manager_ops', 'director_ops', 'spv_she_ho']

// kode matriks → nilai kolom attendance yang SAH
// (constraint: HADIR · TERLAMBAT · SETENGAH_HARI · ALPHA · CUTI · SAKIT · IZIN · LIBUR,
//  shift: SIANG · MALAM)
const PETA: Record<string, { status: string; shift: string | null }> = {
  DS:  { status: 'HADIR',  shift: 'SIANG' },
  DW:  { status: 'HADIR',  shift: 'SIANG' },
  NS:  { status: 'HADIR',  shift: 'MALAM' },
  NW:  { status: 'HADIR',  shift: 'MALAM' },
  SCK: { status: 'HADIR',  shift: 'SIANG' },
  MCK: { status: 'HADIR',  shift: 'MALAM' },
  A:   { status: 'ALPHA',  shift: null },
  ALFA:{ status: 'ALPHA',  shift: null },
  I:   { status: 'IZIN',   shift: null },
  IR:  { status: 'IZIN',   shift: null },
  TR:  { status: 'IZIN',   shift: null },
  ID:  { status: 'IZIN',   shift: null },
  S:   { status: 'SAKIT',  shift: null },
  CT:  { status: 'CUTI',   shift: null },
  CR:  { status: 'CUTI',   shift: null },
  LV:  { status: 'CUTI',   shift: null },
  OFF: { status: 'LIBUR',  shift: null },
  '-': { status: 'LIBUR',  shift: null },
}

/** kode yang sedang tersimpan di database (untuk dibandingkan) */
function kodeSekarang(row: any): string {
  if (!row) return ''
  const ket = String(row.keterangan || '')
  const manual = ket.match(/\[MANUAL:([A-Za-z]+)\]/)
  if (manual) return manual[1].toUpperCase()

  const st = String(row.status || '').toUpperCase()
  const sh = String(row.shift || '').toUpperCase()
  if (st === 'HADIR' || st === 'TERLAMBAT' || st === 'SETENGAH_HARI') {
    return sh.includes('MALAM') ? 'NS' : 'DS'
  }
  if (st === 'ALPHA') return 'A'
  if (st === 'IZIN') return 'I'
  if (st === 'SAKIT') return 'S'
  if (st === 'CUTI') return 'CT'
  if (st === 'LIBUR') return 'OFF'
  return st || ''
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const roles: string[] = ((session as any).roles || []).map((r: string) => String(r).toLowerCase())
    const boleh = (session as any).is_super_admin || roles.some((r) => BOLEH_IMPORT.includes(r))
    if (!boleh) return NextResponse.json({ error: 'Tidak berwenang import koreksi absensi' }, { status: 403 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    const terapkan = String(form.get('terapkan') || '0') === '1'
    const bulanParam = String(form.get('bulan') || '')   // YYYY-MM
    if (!file) return NextResponse.json({ error: 'File Excel wajib diunggah' }, { status: 400 })
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'File maksimal 15 MB' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buf, { type: 'buffer', cellNF: false })
    const ws = wb.Sheets[wb.SheetNames[0]]
    if (!ws) return NextResponse.json({ error: 'Sheet pertama tidak ditemukan' }, { status: 400 })

    const grid: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
    if (!grid.length) return NextResponse.json({ error: 'File kosong' }, { status: 400 })

    // ── CARI BARIS HEADER YANG BENAR ──
    // File "Excel Matrix" punya 3 baris judul di atasnya:
    //   baris 1 : REKAP ABSENSI — OKTOBER 2026
    //   baris 2 : Site: ... Periode: ...
    //   baris 3 : NO | NRP | NAMA KARYAWAN | JABATAN | SITE | TANGGAL | REKAP KEHADIRAN | LEMBUR
    //   baris 4 : NO | NRP | NAMA KARYAWAN | JABATAN | SITE | 1 | 2 | 3 | ... | 31 | HDR | ...
    //   baris 5 : (nama hari) MIN SEN SEL ...
    //
    // Cara lama mencari baris PERTAMA yang memuat "NRP" → ketemu baris 3
    // (baris grup), yang tidak punya angka tanggal → muncul error
    // "Kolom tanggal (1–31) tidak ditemukan di header".
    //
    // Cara baru: pilih baris yang punya angka 1..31 PALING BANYAK.
    let idxHeader = -1
    let skorTerbaik = 0
    const batasCari = Math.min(grid.length, 25)

    for (let i = 0; i < batasCari; i++) {
      const baris = (grid[i] || []).map((c) => String(c ?? '').trim().toUpperCase())
      let skor = 0
      const terlihat = new Set<number>()
      for (const c of baris) {
        const n = Number(c)
        if (Number.isInteger(n) && n >= 1 && n <= 31 && !terlihat.has(n)) {
          terlihat.add(n)
          skor++
        }
      }
      if (skor > skorTerbaik) { skorTerbaik = skor; idxHeader = i }
    }

    // minimal harus ada 20 kolom tanggal (satu bulan penuh) supaya yakin ini
    // memang baris tanggal, bukan baris lain yang kebetulan berisi angka
    if (idxHeader < 0 || skorTerbaik < 20) {
      return NextResponse.json({
        error:
          'Baris tanggal (1–31) tidak ditemukan. Pastikan memakai file hasil tombol ' +
          '"Excel Matrix" dan sheet pertama ("Rekap Absensi") tidak diubah susunannya.',
      }, { status: 400 })
    }

    const header = (grid[idxHeader] || []).map((c) => String(c ?? '').trim().toUpperCase())

    // kolom NRP: cari tulisan yang mengandung "NRP"
    let iNrp = header.findIndex((h) => h === 'NRP')
    if (iNrp < 0) iNrp = header.findIndex((h) => h.includes('NRP'))
    if (iNrp < 0) iNrp = 1   // susunan baku file Excel Matrix

    // kolom NAMA: file memakai "NAMA KARYAWAN", file lain "NAMA"
    let iNama = header.findIndex((h) => h === 'NAMA')
    if (iNama < 0) iNama = header.findIndex((h) => h.startsWith('NAMA'))
    if (iNama < 0) iNama = iNrp + 1

    // kolom tanggal = header berisi angka 1..31 (unik, urut)
    const kolomTanggal: { idx: number; hari: number }[] = []
    const sudahAda = new Set<number>()
    header.forEach((h, i) => {
      const n = Number(h)
      if (Number.isInteger(n) && n >= 1 && n <= 31 && !sudahAda.has(n)) {
        sudahAda.add(n)
        kolomTanggal.push({ idx: i, hari: n })
      }
    })
    if (!kolomTanggal.length) {
      return NextResponse.json({ error: 'Kolom tanggal (1–31) tidak ditemukan di header' }, { status: 400 })
    }

    // ── tentukan bulan ──
    let bulanKey = bulanParam && /^\d{4}-\d{2}$/.test(bulanParam) ? bulanParam : ''
    if (!bulanKey) {
      const now = new Date()
      bulanKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }
    const [th, bl] = bulanKey.split('-')
    const jmlHari = new Date(Number(th), Number(bl), 0).getDate()

    const isHO = (session as any).is_super_admin || roles.some((r) => HO_LINTAS.includes(r))
    const siteSaya = String((session as any).scope_site || (session as any).site || '')

    // ── kumpulkan baris dari Excel ──
    const barisExcel: { nrp: string; nama: string; kode: Record<string, string> }[] = []
    for (let r = idxHeader + 1; r < grid.length; r++) {
      const row = grid[r] || []
      const nrp = String(row[iNrp] ?? '').trim()
      if (!nrp || !/^[A-Za-z0-9]+$/.test(nrp)) continue
      const kode: Record<string, string> = {}
      kolomTanggal.forEach(({ idx, hari }) => {
        if (hari > jmlHari) return
        const v = String(row[idx] ?? '').trim().toUpperCase()
        if (!v || v === '-' || v === '—') { kode[hari] = ''; return }
        kode[hari] = v
      })
      barisExcel.push({ nrp, nama: String(row[iNama] ?? '').trim(), kode })
    }

    if (!barisExcel.length) {
      return NextResponse.json({ error: 'Tidak ada baris karyawan (NRP) yang terbaca' }, { status: 400 })
    }

    // ── ambil data karyawan + attendance bulan itu ──
    const nrips = barisExcel.map((b) => b.nrp)
    const { data: emps } = await supabaseAdmin
      .from('employees').select('nrp, nama, site').in('nrp', nrips)
    const petaEmp: Record<string, any> = {}
    ;(emps || []).forEach((e: any) => (petaEmp[String(e.nrp)] = e))

    const awal = `${bulanKey}-01`
    const akhir = `${bulanKey}-${String(jmlHari).padStart(2, '0')}`

    const petaAtt: Record<string, any> = {}   // key: nrp|tanggal
    {
      const semuaNrp = Object.keys(petaEmp)
      for (let i = 0; i < semuaNrp.length; i += 300) {
        const potong = semuaNrp.slice(i, i + 300)
        const { data } = await supabaseAdmin
          .from('attendance')
          .select('id, nrp, tanggal, status, shift, keterangan, site')
          .in('nrp', potong)
          .gte('tanggal', awal).lte('tanggal', akhir)
        ;(data || []).forEach((a: any) => {
          petaAtt[String(a.nrp) + '|' + String(a.tanggal).slice(0, 10)] = a
        })
      }
    }

    // ── hitung perubahan ──
    type Perubahan = {
      nrp: string; nama: string; tanggal: string; hari: number
      dari: string; ke: string; status: string; shift: string | null
      aksi: 'ubah' | 'tambah'; adaId?: string
    }
    const perubahan: Perubahan[] = []
    const dilewati: { nrp: string; tanggal: string; kode: string; alasan: string }[] = []

    for (const b of barisExcel) {
      const emp = petaEmp[b.nrp]
      if (!emp) { dilewati.push({ nrp: b.nrp, tanggal: '-', kode: '-', alasan: 'NRP tidak ada di master karyawan' }); continue }
      if (!isHO && siteSaya && String(emp.site || '') !== siteSaya) {
        dilewati.push({ nrp: b.nrp, tanggal: '-', kode: '-', alasan: `beda site (${emp.site})` }); continue
      }

      for (const { hari } of kolomTanggal) {
        if (hari > jmlHari) continue
        const kodeBaru = String(b.kode[hari] || '').toUpperCase()
        if (!kodeBaru) continue                       // sel kosong = tidak diubah
        const target = PETA[kodeBaru]
        if (!target) { dilewati.push({ nrp: b.nrp, tanggal: `${bulanKey}-${String(hari).padStart(2, '0')}`, kode: kodeBaru, alasan: 'kode tidak dikenal' }); continue }

        const tanggal = `${bulanKey}-${String(hari).padStart(2, '0')}`
        const att = petaAtt[b.nrp + '|' + tanggal]
        const kodeLama = kodeSekarang(att)

        if (kodeLama.toUpperCase() === kodeBaru) continue   // sudah sama → lewati

        perubahan.push({
          nrp: b.nrp, nama: emp.nama || b.nama, tanggal, hari,
          dari: kodeLama || '(kosong)', ke: kodeBaru,
          status: target.status, shift: target.shift,
          aksi: att ? 'ubah' : 'tambah',
          adaId: att?.id,
        })
      }
    }

    // ── ringkasan per kode ──
    const ringkas: Record<string, number> = {}
    perubahan.forEach((p) => (ringkas[p.dari + '→' + p.ke] = (ringkas[p.dari + '→' + p.ke] || 0) + 1))

    if (!terapkan) {
      return NextResponse.json({
        ok: true,
        mode: 'pratinjau',
        bulan: bulanKey,
        jumlah_baris_excel: barisExcel.length,
        jumlah_karyawan_dikenal: Object.keys(petaEmp).length,
        jumlah_perubahan: perubahan.length,
        jumlah_ubah: perubahan.filter((p) => p.aksi === 'ubah').length,
        jumlah_tambah: perubahan.filter((p) => p.aksi === 'tambah').length,
        ringkasan: ringkas,
        contoh: perubahan.slice(0, 60),
        dilewati: dilewati.slice(0, 40),
        jumlah_dilewati: dilewati.length,
      })
    }

    // ═══════════════ TERAPKAN ═══════════════
    const cap = `[IMPORT-EXCEL] koreksi dari file ${file.name}`.slice(0, 200)
    let nUbah = 0, nTambah = 0
    const gagal: string[] = []

    // ① ubah baris yang sudah ada — dikelompokkan per (tanggal, status, shift)
    const grup = new Map<string, string[]>()   // key: tanggal|status|shift → [id...]
    perubahan.filter((p) => p.aksi === 'ubah' && p.adaId).forEach((p) => {
      const k = `${p.tanggal}|${p.status}|${p.shift || ''}`
      if (!grup.has(k)) grup.set(k, [])
      grup.get(k)!.push(String(p.adaId))
    })

    for (const [k, ids] of grup) {
      const [tanggal, status, shift] = k.split('|')
      for (let i = 0; i < ids.length; i += 200) {
        const potong = ids.slice(i, i + 200)
        const { error } = await supabaseAdmin
          .from('attendance')
          .update({
            status,
            shift: shift || null,
            keterangan: cap,
            updated_at: new Date().toISOString(),
          })
          .in('id', potong)
        if (error) gagal.push(`${tanggal} ubah: ${error.message}`)
        else nUbah += potong.length
      }
    }

    // ② tambah baris baru
    const barisBaru = perubahan
      .filter((p) => p.aksi === 'tambah')
      .map((p) => ({
        nrp: p.nrp,
        tanggal: p.tanggal,
        site: petaEmp[p.nrp]?.site || siteSaya || null,
        status: p.status,
        shift: p.shift,
        keterangan: cap,
        updated_at: new Date().toISOString(),
      }))
    for (let i = 0; i < barisBaru.length; i += 300) {
      const potong = barisBaru.slice(i, i + 300)
      const { error } = await supabaseAdmin.from('attendance').insert(potong)
      if (error) gagal.push(`tambah: ${error.message}`)
      else nTambah += potong.length
    }

    return NextResponse.json({
      ok: true,
      mode: 'terapkan',
      bulan: bulanKey,
      jumlah_perubahan: perubahan.length,
      terubah: nUbah,
      tertambah: nTambah,
      gagal: gagal.slice(0, 20),
      ringkasan: ringkas,
      dilewati: dilewati.slice(0, 20),
      jumlah_dilewati: dilewati.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal memproses file' }, { status: 500 })
  }
}
