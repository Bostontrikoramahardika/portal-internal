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
import { konversiCell, isJabatanOperator, pilihAttBaris } from '@/app/lib/absensi-kode'
import { ambilSemuaPerNrp } from '@/app/lib/supabase-paginate'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

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

function ringkasSementara(perubahan: any[]): Record<string, number> {
  const r: Record<string, number> = {}
  perubahan.forEach((p) => (r[p.dari + '→' + p.ke] = (r[p.dari + '→' + p.ke] || 0) + 1))
  return r
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

    // ── PERIKSA BULAN DI DALAM FILE ──
    // Judul file: "REKAP ABSENSI — OKTOBER 2026"
    // Kalau bulan file BEDA dengan bulan yang dipilih, JANGAN diterapkan —
    // inilah yang bikin koreksi masuk ke bulan yang salah.
    const NAMA_BULAN = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI',
      'AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER']
    let bulanFile = ''
    for (let i = 0; i < Math.min(grid.length, 5); i++) {
      const teks = (grid[i] || []).join(' ').toUpperCase()
      const m = teks.match(/(JANUARI|FEBRUARI|MARET|APRIL|MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER)\s+(\d{4})/)
      if (m) {
        const bl = NAMA_BULAN.indexOf(m[1]) + 1
        bulanFile = `${m[2]}-${String(bl).padStart(2, '0')}`
        break
      }
    }
    // Kalau periode tidak terbaca dari isi file, coba dari NAMA file (mis. Rekap_Matrix_2026-10.xlsx)
    if (!bulanFile) {
      const namaFile = String((file as any).name || '')
      const m1 = namaFile.match(/(20\d{2})[-_ ]?(0[1-9]|1[0-2])(?![0-9])/)
      if (m1) bulanFile = `${m1[1]}-${m1[2]}`
      if (!bulanFile) {
        const naik = namaFile.toUpperCase()
        for (let i = 0; i < NAMA_BULAN.length; i++) {
          const m2 = naik.match(new RegExp(NAMA_BULAN[i] + '\\s*[-_]?\\s*(20\\d{2})'))
          if (m2) { bulanFile = `${m2[1]}-${String(i + 1).padStart(2, '0')}`; break }
        }
      }
    }

    // Periode WAJIB diketahui. Kalau tidak, file tidak boleh diterapkan ke bulan
    // yang kebetulan sedang dibuka — inilah yang dulu membuat file Oktober
    // masuk ke bulan November.
    if (!bulanFile) {
      return NextResponse.json({
        error:
          'Periode file tidak terbaca, jadi import DIBATALKAN. ' +
          'Pakai file hasil tombol "Excel Matrix" apa adanya (jangan di-rename), ' +
          'atau pastikan judul di dalam file memuat nama bulan dan tahun.',
        bulan_dipilih: bulanKey,
      }, { status: 400 })
    }

    if (bulanFile !== bulanKey) {
      return NextResponse.json({
        error:
          `File ini untuk periode ${bulanFile}, sedangkan yang dipilih ${bulanKey}. ` +
          `Pilih bulan yang sama di filter sebelum import — koreksi tidak diterapkan.`,
        bulan_file: bulanFile,
        bulan_dipilih: bulanKey,
      }, { status: 400 })
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

    const petaAtt: Record<string, any> = {}          // key: nrp|tanggal (untuk tampilan)
    const petaAttList: Record<string, any[]> = {}    // key: nrp|tanggal → semua baris
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
          const k = String(a.nrp) + '|' + String(a.tanggal).slice(0, 10)
          petaAtt[k] = pilihAttBaris([...(petaAttList[k] || []), a])
          if (!petaAttList[k]) petaAttList[k] = []
          petaAttList[k].push(a)
        })
      }
    }

    // ── ROSTER & TS OPT: untuk menghitung kode yang SEDANG TAMPIL ──
    // Penting! Aplikasi menampilkan kode hasil hitungan (roster + TS Opt +
    // absensi), bukan hanya isi tabel attendance. Tanpa ini, sel yang
    // sebenarnya sudah tampil "A" dianggap kosong lalu DITAMBAH sebagai
    // baris baru → ribuan baris palsu masuk ke database.
    const todaySite = (() => {
      try {
        const tz = String((session as any)?.timezone || 'Asia/Makassar')
        return new Intl.DateTimeFormat('en-CA', {
          timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date())
      } catch {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      }
    })()

    const petaRoster: Record<string, string> = {}
    const petaTs: Record<string, 'DS' | 'NS'> = {}
    try {
      const rosterRows = await ambilSemuaPerNrp(
        supabaseAdmin, 'rosters', 'nrp, tanggal, shift_code',
        Object.keys(petaEmp),
        (q) => q.gte('tanggal', awal).lte('tanggal', akhir),
        ['tanggal'],
      )
      for (const r of rosterRows) {
        petaRoster[String(r.nrp) + '|' + String(r.tanggal).slice(0, 10)] = String(r.shift_code || '').toUpperCase()
      }
    } catch { /* roster belum ada */ }
    try {
      const tsRows = await ambilSemuaPerNrp(
        supabaseAdmin, 'ts_opt', 'tanggal, nrp, shift',
        Object.keys(petaEmp),
        (q) => q.gte('tanggal', awal).lte('tanggal', akhir),
        ['tanggal'],
      )
      for (const r of tsRows) {
        const sh = String(r.shift ?? '').trim().toUpperCase()
        const kode: 'DS' | 'NS' =
          (sh === '2' || sh === 'NS' || sh === 'M' || sh.includes('MALAM') || sh.includes('NIGHT')) ? 'NS' : 'DS'
        const nr = String(r.nrp || '').trim()
        if (nr) petaTs[nr + '|' + String(r.tanggal).slice(0, 10)] = kode
      }
    } catch { /* ts_opt belum ada */ }

    // kode yang SEDANG TAMPIL di aplikasi untuk satu sel
    // revisi absen disetujui GL (sama seperti aplikasi & export)
    const petaEviden: Record<string, string> = {}
    try {
      const { data: evRows } = await supabaseAdmin
        .from('attendance_evidences')
        .select('nrp, tanggal, kategori, status_atasan')
        .gte('tanggal', awal).lte('tanggal', akhir)
        .eq('status_atasan', 'APPROVED')
      const PETA_EV: Record<string, string> = {
        SAKIT: 'S', IZIN_POTONGAN: 'I', IZIN_BERBAYAR: 'IR', IZIN_RESMI: 'IR', CUTI: 'CT',
      }
      ;(evRows || []).forEach((e: any) => {
        const tgl = String(e.tanggal || '').slice(0, 10)
        const kode = PETA_EV[String(e.kategori || '').toUpperCase()]
        if (tgl && kode) petaEviden[`${e.nrp}|${tgl}`] = kode
      })
    } catch { /* opsional */ }

    function kodeTampil(nrp: string, tanggal: string): string {
      const emp = petaEmp[nrp]
      const att = petaAtt[nrp + '|' + tanggal] || null
      const roster = petaRoster[nrp + '|' + tanggal] || null
      const ts = petaTs[nrp + '|' + tanggal] || null
      const resign = emp?.tanggal_resign ? String(emp.tanggal_resign).slice(0, 10) : null
      const cell = konversiCell(
        roster, att,
        tanggal > todaySite,
        Boolean(resign && tanggal > resign),
        ts,
        isJabatanOperator(emp?.jabatan),
        petaEviden[`${nrp}|${tanggal}`] || null,
      )
      return cell.code === '-' ? '' : cell.code
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
        // Tanggal yang belum terjadi tidak punya absensi. Koreksi untuk tanggal
        // masa depan selalu dilewati supaya roster tidak bisa ditimpa.
        if (tanggal > todaySite) {
          dilewati.push({ nrp: b.nrp, tanggal, kode: kodeBaru, alasan: 'tanggal belum terjadi (masa depan)' })
          continue
        }
        const att = petaAtt[b.nrp + '|' + tanggal]
        const kodeLama = kodeTampil(b.nrp, tanggal)

        // Dibandingkan dengan yang TAMPIL di aplikasi, bukan cuma isi tabel.
        // Sel yang tampilannya sudah sama → tidak diubah sama sekali.
        if (kodeLama.toUpperCase() === kodeBaru) continue

        perubahan.push({
          nrp: b.nrp, nama: emp.nama || b.nama, tanggal, hari,
          dari: kodeLama || '(kosong)', ke: kodeBaru,
          status: target.status, shift: target.shift,
          aksi: att ? 'ubah' : 'tambah',
          adaId: att?.id,
        })
      }
    }

    // ── PENGAMAN: perubahan terlalu banyak = hampir pasti salah file ──
    // Pratinjau SELALU boleh (supaya bisa dilihat sel mana yang beda).
    // Yang ditolak hanya PENERAPAN, kecuali user mencentang "paksa".
    const paksa = String(form.get('paksa') || '') === '1'
    const BATAS_AMAN = 500
    const terlaluBanyak = perubahan.length > BATAS_AMAN

    if (terapkan && terlaluBanyak && !paksa) {
      return NextResponse.json({
        ok: false,
        mode: 'ditolak',
        bulan: bulanKey,
        jumlah_perubahan: perubahan.length,
        batas_aman: BATAS_AMAN,
        error:
          `File ini akan mengubah ${perubahan.length} sel (batas aman ${BATAS_AMAN}). ` +
          `Data TIDAK diubah. Lihat daftar sel yang beda di bawah: kalau polanya ` +
          `"A → (kosong)" atau "CT → CR", berarti file Excel dibuat dari data yang sudah rusak.`,
        ringkasan: ringkasSementara(perubahan),
        contoh: perubahan.slice(0, 60),
      }, { status: 400 })
    }

    // ── ringkasan per kode ──
    const ringkas: Record<string, number> = {}
    perubahan.forEach((p) => (ringkas[p.dari + '→' + p.ke] = (ringkas[p.dari + '→' + p.ke] || 0) + 1))

    if (!terapkan) {
      return NextResponse.json({
        ok: true,
        mode: 'pratinjau',
        peringatan: terlaluBanyak
          ? `File ini akan mengubah ${perubahan.length} sel (batas aman ${BATAS_AMAN}). ` +
            `Periksa daftar di bawah dulu — kalau polanya "A → (kosong)" atau "CT → CR", ` +
            `kemungkinan besar file Excel dibuat dari data yang sudah rusak, bukan hasil koreksi.`
          : null,
        batas_aman: BATAS_AMAN,
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

    // ═══════════════ TERAPKAN (BATCH — CEPAT) ═══════════════
    // Catatan penting: cara sebelumnya menulis SATU SEL PER SATU QUERY.
    // Untuk 984 sel itu = 984 perjalanan ke database → 3,5 menit →
    // browser menyerah dan muncul "Koneksi gagal".
    // Sekarang: dikelompokkan, maksimal beberapa query saja.
    //
    // Skema tabel: UNIQUE (nrp, tanggal, shift) → satu hari bisa punya
    // baris SIANG dan MALAM. Baris yang cocok di-UPDATE, sisanya di-UPSERT.
    const cap = `[IMPORT-EXCEL] koreksi dari file ${file.name}`.slice(0, 200)
    // Keterangan yang ditulis ke setiap baris: kode PERSIS seperti di Excel,
    // ditandai [MANUAL:KODE]. Tampilan aplikasi & export membaca tanda ini
    // lebih dulu, jadi kode roster (CR/CT/OFF/ID/TR/SCK/MCK) pun bisa
    // dikoreksi lewat Excel — bukan hanya DS/NS/A/S/I.
    const ketUntuk = (kode: string) => `[MANUAL:${String(kode).toUpperCase()}] ${cap}`.slice(0, 250)
    const waktuMulai = Date.now()
    let nUbah = 0, nTambah = 0
    const gagal: string[] = []

    const kunciShift = (x: any) => String(x || '').toUpperCase().trim()
    const kunci = (nrp: string, tgl: string) => `${nrp}|${tgl}`

    // 1) tentukan baris tujuan untuk setiap perubahan
    const perHari = new Map<string, typeof perubahan>()
    for (const p of perubahan) {
      const k = kunci(p.nrp, p.tanggal)
      if (!perHari.has(k)) perHari.set(k, [])
      perHari.get(k)!.push(p)
    }

    type Pasangan = { p: any; id: string | null }
    const pasangan: Pasangan[] = []

    for (const [k, daftar] of perHari) {
      const rows = (petaAttList[k] || []).slice()
      const dipakai = new Set<string>()
      for (const p of daftar) {
        const sh = kunciShift(p.shift)
        let row = rows.find((r) => kunciShift(r.shift) === sh && !dipakai.has(String(r.id)))
        if (!row && sh) row = rows.find((r) => !kunciShift(r.shift) && !dipakai.has(String(r.id)))
        if (row) dipakai.add(String(row.id))
        pasangan.push({ p, id: row ? String(row.id) : null })
      }
    }

    // 2) UPDATE massal — kelompokkan per (status, shift), potong 200 id
    const grupUpdate = new Map<string, { status: string; shift: string | null; kode: string; ids: string[] }>()
    for (const { p, id } of pasangan) {
      if (!id) continue
      const gk = `${p.status}|${p.shift || ''}|${p.ke}`
      if (!grupUpdate.has(gk)) grupUpdate.set(gk, { status: p.status, shift: p.shift, kode: p.ke, ids: [] })
      grupUpdate.get(gk)!.ids.push(id)
    }

    for (const [, g] of grupUpdate) {
      for (let i = 0; i < g.ids.length; i += 200) {
        const potong = g.ids.slice(i, i + 200)
        const { error } = await supabaseAdmin
          .from('attendance')
          .update({
            status: g.status,
            shift: g.shift,
            keterangan: ketUntuk(g.kode),
            updated_at: new Date().toISOString(),
          })
          .in('id', potong)
        if (error) gagal.push(`update ${g.status}/${g.shift || '-'}: ${error.message}`)
        else nUbah += potong.length
      }
    }

    // 3) INSERT massal — hanya untuk sel yang belum punya baris sama sekali
    const barisBaru = pasangan
      .filter((x) => !x.id)
      .map(({ p }) => ({
        nrp: p.nrp,
        tanggal: p.tanggal,
        site: petaEmp[p.nrp]?.site || siteSaya || null,
        status: p.status,
        shift: p.shift,
        keterangan: ketUntuk(p.ke),
        updated_at: new Date().toISOString(),
      }))

    for (let i = 0; i < barisBaru.length; i += 200) {
      const potong = barisBaru.slice(i, i + 200)
      // upsert: kalau ternyata barisnya sudah ada (unique nrp+tanggal+shift),
      // diperbarui saja — tidak lagi gagal "duplicate key".
      const { error } = await supabaseAdmin
        .from('attendance')
        .upsert(potong, { onConflict: 'nrp,tanggal,shift' })

      if (!error) {
        nTambah += potong.length
        continue
      }

      // kalau upsert ditolak (mis. constraint berbeda), coba insert biasa
      const { error: e2 } = await supabaseAdmin.from('attendance').insert(potong)
      if (!e2) nTambah += potong.length
      else gagal.push(`tambah ${potong.length} baris: ${e2.message}`)
    }

    const detik = Math.round((Date.now() - waktuMulai) / 100) / 10

    return NextResponse.json({
      ok: true,
      mode: 'terapkan',
      bulan: bulanKey,
      jumlah_perubahan: perubahan.length,
      terubah: nUbah,
      tertambah: nTambah,
      gagal: gagal.slice(0, 20),
      jumlah_gagal: gagal.length,
      detik,
      ringkasan: ringkas,
      dilewati: dilewati.slice(0, 20),
      jumlah_dilewati: dilewati.length,
    })
  } catch (e: any) {
    // Jangan ditelan: kirim pesan ASLI + lokasi baris supaya bisa dilacak.
    const pesan = String(e?.message || e || 'Gagal memproses file')
    const jejak = String(e?.stack || '')
      .split('\n')
      .slice(0, 4)
      .join(' | ')
      .slice(0, 500)
    console.error('[IMPORT-EXCEL] GAGAL:', pesan, '\n', e?.stack || '')
    return NextResponse.json({
      ok: false,
      mode: 'error',
      error: pesan,
      jejak,
    }, { status: 500 })
  }
}
