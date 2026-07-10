import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'

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