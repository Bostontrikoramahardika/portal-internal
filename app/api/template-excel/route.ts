import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'
import { getWitaToday } from '@/app/lib/timezone'

// ============================================================
// 📥 HANDLER GET: Download Template Excel Kosong
// URL: /api/template-excel?table=mcu&mode=empty
// ============================================================
export async function GET(request: NextRequest) {
  try {
    // 1. Cek Auth
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    // 2. Parameter
    const { searchParams } = new URL(request.url)
    const table = (searchParams.get('table') || '').toLowerCase()
    const mode  = searchParams.get('mode') || 'empty'  // 'empty' | 'existing'

    if (!table) {
      return NextResponse.json({ error: 'Parameter table wajib' }, { status: 400 })
    }

    // 3. Definisi kolom template per tabel
    const TEMPLATE_COLUMNS: Record<string, string[]> = {
      mcu: [
        'nrp', 'nama_karyawan', 'tanggal_mcu', 'jenis_mcu', 'hasil',
        'dokter', 'rumah_sakit', 'tanggal_berlaku', 'tanggal_expired', 'keterangan'
      ],
      simper: [
        'nrp', 'nama_karyawan', 'no_simper', 'kelas_simper',
        'tanggal_terbit', 'tanggal_expired', 'penerbit', 'keterangan'
      ],
      apd: [
        'nrp', 'nama_karyawan', 'jenis_apd', 'ukuran',
        'tanggal_terima', 'tanggal_expired', 'kondisi', 'keterangan'
      ],
      pkwt: [
        'nrp', 'nama_karyawan', 'no_pkwt', 'tanggal_mulai',
        'tanggal_selesai', 'jabatan', 'gaji', 'keterangan'
      ],
      sp: [
        'nrp', 'nama_karyawan', 'jenis_sp', 'no_sp',
        'tanggal_sp', 'tanggal_expired', 'alasan', 'keterangan'
      ],
      bpjs: [
        'nrp', 'nama_karyawan', 'jenis_bpjs', 'no_bpjs',
        'tanggal_daftar', 'status_aktif', 'keterangan'
      ],
      kpi: [
        'nrp', 'nama_karyawan', 'periode', 'nilai_kpi',
        'grade', 'catatan_atasan', 'keterangan'
      ],
      karyawan: [
  'nrp', 'nama', 'jabatan', 'departemen', 'site',
  'tanggal_masuk', 'tempat_lahir', 'tanggal_lahir',
  'no_hp', 'email', 'alamat', 'status_pernikahan'
],
// 🆕 Alias untuk kompatibilitas
employees: [
  'nrp', 'nama', 'jabatan', 'departemen', 'site',
  'tanggal_masuk', 'tempat_lahir', 'tanggal_lahir',
  'no_hp', 'email', 'alamat', 'status_pernikahan'
],
    }

    const columns = TEMPLATE_COLUMNS[table]
    if (!columns) {
      return NextResponse.json({
        error: `Template untuk tabel "${table}" belum tersedia`
      }, { status: 400 })
    }

    // 4. Kalau mode = 'existing', ambil data existing sebagai preview
    let dataRows: any[][] = []
    if (mode === 'existing') {
      const { data } = await supabase.from(table).select('*').limit(100)
      if (data && data.length > 0) {
        dataRows = data.map((row: any) => columns.map(col => row[col] ?? ''))
      }
    }

    // 5. Build Excel workbook
    const wb = XLSX.utils.book_new()

    // Sheet 1: Data
    const wsData: any[][] = [columns, ...dataRows]

    // Kalau kosong, tambah 1 baris contoh
    if (dataRows.length === 0) {
      const exampleRow: any[] = columns.map(col => {
        if (col === 'nrp') return '0530999'
        if (col === 'nama' || col === 'nama_karyawan') return 'Nama Contoh'
        if (col.includes('tanggal')) return '2026-07-15'
        if (col === 'no_hp') return '081234567890'
        if (col === 'email') return 'contoh@email.com'
        if (col === 'jabatan') return 'Operator'
        if (col === 'departemen') return 'Operator'
        if (col === 'site') return 'Site A'
        if (col === 'jenis_mcu') return 'Awal'
        if (col === 'hasil') return 'Fit'
        if (col === 'dokter') return 'dr. Contoh'
        if (col === 'rumah_sakit') return 'RS Contoh'
        if (col === 'keterangan') return 'Contoh keterangan'
        return ''
      })
      wsData.push(exampleRow)
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Set lebar kolom
    ws['!cols'] = columns.map(() => ({ wch: 18 }))

    // Style header (bold + biru navy BTM)
    columns.forEach((_, idx) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx })
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '003D79' } },
          alignment: { horizontal: 'center', vertical: 'center' }
        }
      }
    })

    XLSX.utils.book_append_sheet(wb, ws, 'Data')

    // Sheet 2: Petunjuk
    const petunjukData = [
      ['📋 PETUNJUK IMPORT ' + table.toUpperCase()],
      [''],
      ['1. Isi data mulai baris 2 (baris 1 adalah header, JANGAN DIUBAH)'],
      ['2. Format tanggal: YYYY-MM-DD (contoh: 2026-07-15)'],
      ['3. NRP wajib diisi dan harus sudah ada di data karyawan'],
      ['4. Kolom keterangan bersifat opsional'],
      ['5. Setelah selesai, upload file ini di halaman Import'],
      [''],
      ['⚠️ PENTING:'],
      ['- Jangan ubah nama header di baris 1'],
      ['- Jangan menghapus kolom'],
      ['- Baris contoh boleh dihapus sebelum upload'],
      [''],
      ['Kolom yang dibutuhkan:'],
      ...columns.map((col, i) => [`${i + 1}. ${col}`])
    ]
    const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukData)
    wsPetunjuk['!cols'] = [{ wch: 80 }]
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk')

    // 6. Generate buffer & return
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `Template_${table}_${mode}_${getWitaToday()}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (err: any) {
    console.error('Template Excel Error:', err)
    return NextResponse.json({
      error: err?.message || 'Gagal generate template'
    }, { status: 500 })
  }
}

// ============================================================
// 🎯 SPECIAL HANDLER: Import ROSTER (Format Standar Baru)
// ============================================================
async function handleRosterImport(file: File) {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

  // 1. Ambil Periode dari Baris 1 (Indeks 0, Kolom A)
  const periodeRaw = String(json[0]?.[0] || "").trim()
  if (!periodeRaw) throw new Error("Baris 1 (Periode) tidak boleh kosong.")

  const tahun = periodeRaw.match(/\d{4}/)?.[0] || new Date().getFullYear()
  const bulanNama = periodeRaw.match(/JANUARI|FEBRUARI|MARET|APRIL|MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER/i)?.[0] || "JANUARI"
  
  const bulanMap: any = { "JANUARI":0,"FEBRUARI":1,"MARET":2,"APRIL":3,"MEI":4,"JUNI":5,"JULI":6,"AGUSTUS":7,"SEPTEMBER":8,"OKTOBER":9,"NOVEMBER":10,"DESEMBER":11 }
  const bulanIndex = bulanMap[bulanNama.toUpperCase()]

  const rostersToInsert: any[] = []

  // 2. Data mulai Baris 3 (Indeks 2)
  for (let i = 2; i < json.length; i++) {
    const row = json[i]
    if (!row) continue

    // NRP di KOLOM A (Indeks 0)
    const nrp = String(row[0] || "").trim()
    if (!nrp || nrp === "null" || isNaN(Number(nrp))) continue

    // 3. Roster mulai KOLOM D (Indeks 3) s/d Kolom AH (Indeks 33)
    for (let day = 1; day <= 31; day++) {
      const colIndex = 2 + day // Day 1 = Index 3 (Kolom D)
      const shiftCode = row[colIndex]
      
      // Abaikan jika kosong atau "-"
      if (!shiftCode || ["", "-", "null"].includes(String(shiftCode).trim().toLowerCase())) continue

      // Validasi tanggal bulan berjalan
      const tglObj = new Date(Number(tahun), bulanIndex, day)
      if (tglObj.getMonth() !== bulanIndex) continue 

      rostersToInsert.push({
        nrp: nrp,
        tanggal: tglObj.toISOString().split('T')[0],
        shift_code: String(shiftCode).toUpperCase().trim(),
        periode: periodeRaw
      })
    }
  }

  if (rostersToInsert.length === 0) {
    throw new Error("Gagal membaca data. Pastikan NRP di Kolom A dan data mulai Baris 3.")
  }

  // Upsert ke database
  const { error } = await supabase.from('rosters').upsert(rostersToInsert, { onConflict: 'nrp,tanggal' })
  if (error) throw error

  return NextResponse.json({ 
    success: true, 
    message: `✅ Berhasil import ${rostersToInsert.length} jadwal roster periode ${periodeRaw}.` 
  })
}

// ============================================================
// 🎯 MAIN ROUTE HANDLER (POST)
// ============================================================
export async function POST(request: NextRequest) {
  try {
    // 1. Cek Auth
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session || !session.roles.includes('hrga')) {
      return NextResponse.json({ error: 'Akses ditolak (Hanya HRGA)' }, { status: 403 })
    }

    // 2. Baca Form Data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const table = formData.get('table') as string

    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

    // 3. Jalankan Handler Sesuai Tabel
    if (table === 'roster') {
      return await handleRosterImport(file)
    }

    // 4. Handler Generic untuk tabel lain (Employees, BPJS, dll)
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data: any[] = XLSX.utils.sheet_to_json(sheet)

    const targetTable = table === 'apd' ? 'apd_history' : table
    const { error } = await supabase.from(targetTable).upsert(data)
    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      message: `✅ Berhasil import data ke tabel ${targetTable}` 
    })

  } catch (err: any) {
    console.error("IMPORT_ERROR:", err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}