// app/api/import-excel/route.ts
// Generic Excel importer untuk berbagai tabel (employees, bpjs, pkwt, dll)
// v2.1 - Fix Excel serial date → convert ke YYYY-MM-DD

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'

// Role yang boleh import karyawan
const ALLOWED_ROLES = ['super_admin', 'hr_ho', 'hr_site']

// Field-field yang harus di-treat sebagai date di tabel employees
const DATE_FIELDS_EMPLOYEES = [
  'tanggal_lahir',
  'tanggal_masuk',
  'tanggal_resign',
  'tanggal_kontrak_mulai',
  'tanggal_kontrak_selesai',
  'tanggal_pkwt_mulai',
  'tanggal_pkwt_selesai',
  'expired_kontrak',
  'expired_pkwt',
  'tgl_lahir',
  'tgl_masuk',
  'tgl_resign'
]

/**
 * Convert Excel serial date (angka) ke YYYY-MM-DD
 * Excel serial: 1 = 1900-01-01, 2 = 1900-01-02, dst
 * Perlu adjust -1 karena Excel menganggap 1900 leap year (bug historis)
 */
function excelSerialToDate(serial: number): string | null {
  if (typeof serial !== 'number' || isNaN(serial) || serial < 1) return null

  // Excel epoch: 1900-01-01 = serial 1
  // JavaScript: gunakan UTC untuk hindari timezone issue
  const utcDays = serial - 25569 // 25569 = jumlah hari dari 1900-01-01 ke 1970-01-01
  const utcMs = utcDays * 86400 * 1000
  const date = new Date(utcMs)

  if (isNaN(date.getTime())) return null

  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Parse berbagai format tanggal → YYYY-MM-DD
 * Support: Excel serial number, string "2000-10-01", "01/10/2000", "1-Oct-2000", dll
 */
function parseDate(val: any): string | null {
  if (val === null || val === undefined || val === '') return null

  // Jika sudah number (Excel serial)
  if (typeof val === 'number') {
    return excelSerialToDate(val)
  }

  // Jika Date object
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null
    const yyyy = val.getUTCFullYear()
    const mm = String(val.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(val.getUTCDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  // Jika string
  const str = String(val).trim()
  if (!str || str === '-' || str === 'null') return null

  // Sudah format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

  // Format DD/MM/YYYY atau DD-MM-YYYY
  const m1 = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m1) {
    const dd = m1[1].padStart(2, '0')
    const mm = m1[2].padStart(2, '0')
    const yyyy = m1[3]
    return `${yyyy}-${mm}-${dd}`
  }

  // Format YYYY/MM/DD
  const m2 = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (m2) {
    const yyyy = m2[1]
    const mm = m2[2].padStart(2, '0')
    const dd = m2[3].padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  // Fallback: coba parse dengan Date
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getUTCFullYear()
    const mm = String(parsed.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(parsed.getUTCDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  return null
}

export async function POST(request: NextRequest) {
  console.log('--- [IMPORT-EXCEL] Started ---')

  try {
    // 1. Validasi Session
    const token = request.cookies.get('session_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Tidak login. Silakan login ulang.' }, { status: 401 })
    }

    const session = await getSession(token)
    if (!session) {
      return NextResponse.json({ error: 'Session invalid. Silakan login ulang.' }, { status: 401 })
    }

    const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
    const hasAccess = userRoles.some(r => ALLOWED_ROLES.includes(r))

    if (!hasAccess) {
      return NextResponse.json({
        error: `Tidak punya akses. Role Anda: ${userRoles.join(', ')}. Yang diizinkan: ${ALLOWED_ROLES.join(', ')}`
      }, { status: 403 })
    }

    // 2. Baca Form Data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const table = formData.get('table') as string

    console.log(`--- [IMPORT-EXCEL] Table: ${table}, File: ${file?.name} ---`)

    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    if (!table) return NextResponse.json({ error: 'Nama tabel wajib' }, { status: 400 })

    // 3. Roster harus pakai endpoint khusus
    if (table === 'roster' || table === 'rosters' || table === 'import_roster') {
      return NextResponse.json({
        error: 'Import roster sudah dipindah ke menu "Import Roster Bulanan". Silakan gunakan menu tersebut.'
      }, { status: 400 })
    }

    // 4. Parse Excel — pakai cellDates: true agar Date dikembalikan sebagai Date object
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false })

    if (!rawData || rawData.length === 0) {
      return NextResponse.json({ error: 'File Excel kosong atau format salah' }, { status: 400 })
    }

    console.log(`--- [IMPORT-EXCEL] Parsed ${rawData.length} rows ---`)
    console.log('--- [IMPORT-EXCEL] First row keys:', Object.keys(rawData[0] || {}))

    const targetTable = table === 'apd' ? 'apd_history' : table

    if (targetTable === 'employees') {
      return await handleEmployeesImport(rawData)
    }

    // 5. Handler generic untuk tabel lain
    const { error } = await supabaseAdmin.from(targetTable).upsert(rawData)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `✅ Berhasil import ${rawData.length} baris ke ${targetTable}`
    })

  } catch (err: any) {
    console.error('--- [IMPORT-EXCEL] CRITICAL ERROR:', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════
// Handler khusus untuk import employees
// ═══════════════════════════════════════════════════
async function handleEmployeesImport(rawData: any[]) {
  const REQUIRED = ['nrp', 'nama']

  const normalizeKey = (k: string) => k.toLowerCase().trim().replace(/\s+/g, '_')

  const validRows: any[] = []
  const invalidRows: any[] = []

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i]
    const normalized: any = {}

    Object.keys(row).forEach(k => {
      const nk = normalizeKey(k)
      let val = row[k]
      if (typeof val === 'string') val = val.trim()
      if (val === '' || val === null || val === undefined) val = null
      normalized[nk] = val
    })

    // Convert semua field date
    DATE_FIELDS_EMPLOYEES.forEach(dateField => {
      if (normalized[dateField] !== undefined && normalized[dateField] !== null) {
        const parsed = parseDate(normalized[dateField])
        normalized[dateField] = parsed // bisa null kalau invalid
      }
    })

    // Cek field wajib
    const missing = REQUIRED.filter(f => !normalized[f])
    if (missing.length > 0) {
      invalidRows.push({
        baris: i + 2,
        nrp: normalized.nrp || '-',
        nama: normalized.nama || '-',
        alasan: `Field wajib kosong: ${missing.join(', ')}`
      })
      continue
    }

    normalized.nrp = String(normalized.nrp).trim()

    if (!normalized.status_karyawan) normalized.status_karyawan = 'Aktif'

    validRows.push(normalized)
  }

  if (validRows.length === 0) {
    return NextResponse.json({
      error: 'Tidak ada data valid untuk di-import',
      invalidRows
    }, { status: 400 })
  }

  console.log(`--- [IMPORT-EMPLOYEES] Valid: ${validRows.length}, Invalid: ${invalidRows.length} ---`)
  console.log('--- [IMPORT-EMPLOYEES] Sample row:', JSON.stringify(validRows[0], null, 2))

  const nrpList = validRows.map(r => r.nrp)
  const { data: existingEmps } = await supabaseAdmin
    .from('employees')
    .select('nrp')
    .in('nrp', nrpList)

  const existingNrps = new Set((existingEmps || []).map((e: any) => e.nrp))

  const newRows = validRows.filter(r => !existingNrps.has(r.nrp))
  const updateRows = validRows.filter(r => existingNrps.has(r.nrp))

  let insertedCount = 0
  let updatedCount = 0

  if (newRows.length > 0) {
    const { error: insertErr, count } = await supabaseAdmin
      .from('employees')
      .insert(newRows, { count: 'exact' })

    if (insertErr) {
      console.error('--- [IMPORT-EMPLOYEES] Insert error:', insertErr)
      return NextResponse.json({
        error: `Gagal insert karyawan baru: ${insertErr.message}`,
        detail: insertErr,
        sampleRow: newRows[0],
        invalidRows
      }, { status: 500 })
    }
    insertedCount = count || newRows.length
  }

  if (updateRows.length > 0) {
    const { error: updateErr } = await supabaseAdmin
      .from('employees')
      .upsert(updateRows, { onConflict: 'nrp' })

    if (updateErr) {
      console.error('--- [IMPORT-EMPLOYEES] Update error:', updateErr)
      return NextResponse.json({
        error: `Gagal update karyawan existing: ${updateErr.message}`,
        detail: updateErr,
        insertedCount,
        invalidRows
      }, { status: 500 })
    }
    updatedCount = updateRows.length
  }

  return NextResponse.json({
    success: true,
    message: `✅ Import selesai. Baru: ${insertedCount}, Update: ${updatedCount}, Invalid: ${invalidRows.length}`,
    summary: {
      totalParsed: rawData.length,
      inserted: insertedCount,
      updated: updatedCount,
      invalid: invalidRows.length
    },
    invalidRows: invalidRows.slice(0, 20)
  })
}