import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  console.log("--- [DEBUG] API IMPORT EXCEL DIMULAI ---");
  
  try {
    // 1. Validasi Session
    const token = request.cookies.get('session_token')?.value
    if (!token) {
      console.log("--- [DEBUG] ERROR: Token tidak ditemukan ---");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await getSession(token)
    if (!session || !session.roles.includes('hrga')) {
      console.log("--- [DEBUG] ERROR: Session tidak valid atau bukan HRGA ---");
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Baca Form Data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const table = formData.get('table') as string
    
    console.log(`--- [DEBUG] Table: ${table}, File Name: ${file?.name} ---`);

    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

    // 3. Roster tidak lagi di-handle di sini
    // Gunakan endpoint khusus: /api/roster/import-preview + /api/roster/import-confirm
    if (table === 'roster' || table === 'rosters' || table === 'import_roster') {
      return NextResponse.json({ 
        error: 'Import roster sudah dipindah ke menu "Import Roster Bulanan". Silakan gunakan menu tersebut.' 
      }, { status: 400 })
    }

    // 4. Handler Generic untuk tabel lain
    console.log("--- [DEBUG] Menggunakan Handler Generic ---");
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data: any[] = XLSX.utils.sheet_to_json(sheet)

    const targetTable = table === 'apd' ? 'apd_history' : table
    const { error } = await supabase.from(targetTable).upsert(data)
    
    if (error) throw error
    return NextResponse.json({ success: true, message: `✅ Berhasil import ke ${targetTable}` })

  } catch (err: any) {
    console.error("--- [DEBUG] CRITICAL ERROR ---", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function handleRosterImport(file: File) {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

  // Ambil Periode dari Baris 1 (Indeks 0, Kolom A)
  const periodeRaw = String(json[0]?.[0] || "").trim()
  const tahun = periodeRaw.match(/\d{4}/)?.[0] || new Date().getFullYear()
  const bulanNama = periodeRaw.match(/JANUARI|FEBRUARI|MARET|APRIL|MEI|JUNI|JULI|AGUSTUS|SEPTEMBER|OKTOBER|NOVEMBER|DESEMBER/i)?.[0] || "JANUARI"
  
  const bulanMap: any = { "JANUARI":0,"FEBRUARI":1,"MARET":2,"APRIL":3,"MEI":4,"JUNI":5,"JULI":6,"AGUSTUS":7,"SEPTEMBER":8,"OKTOBER":9,"NOVEMBER":10,"DESEMBER":11 }
  const bulanIndex = bulanMap[bulanNama.toUpperCase()]

  const rostersToInsert: any[] = []

  // Data mulai Baris 3 (Indeks 2)
  for (let i = 2; i < json.length; i++) {
    const row = json[i]
    if (!row) continue
    const nrp = String(row[0] || "").trim()
    if (!nrp || nrp === "null" || isNaN(Number(nrp))) continue

    for (let day = 1; day <= 31; day++) {
      const colIndex = 2 + day // Day 1 = Col D
      const shiftCode = row[colIndex]
      if (!shiftCode || ["", "-", "null"].includes(String(shiftCode).trim().toLowerCase())) continue

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

  console.log(`--- [DEBUG] Siap insert ${rostersToInsert.length} data ke Supabase ---`);

  const { error } = await supabase.from('rosters').upsert(rostersToInsert, { onConflict: 'nrp,tanggal' })
  if (error) {
    console.log("--- [DEBUG] ERROR SUPABASE:", error.message);
    throw error;
  }

  return NextResponse.json({ success: true, message: `✅ Import ${rostersToInsert.length} jadwal BERHASIL!` })
}