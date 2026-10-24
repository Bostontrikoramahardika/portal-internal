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

    // 🔗 BPJS satu sumber: masuk ke kolom employees (bpjs_tk / bpjs_kes + keluarga).
    //    Tabel 'bpjs' terpisah tidak lagi dipakai untuk import.
    //    File HR punya header tidak di baris 1 -> pakai AOA mentah.
    if (targetTable === 'bpjs') {
      const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1, defval: null, raw: false, blankrows: false
      })
      return await handleBpjsImport(aoa)
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

// ═══════════════════════════════════════════════════════
// IMPORT BPJS -> kolom tabel employees (SATU SUMBER)
// ---------------------------------------------------------------
// Menerima file apa adanya dari HR (contoh: "BPJS Update oktober
// 2026.xlsx") yang header-nya TIDAK di baris 1.
//
// Pencocokan baris: NAMA (utama), NRP kalau ada.
// Kolom yang diisi di employees:
//   bpjs_tk, bpjs_kes,
//   bpjs_istri, nama_istri,
//   bpjs_anak1, nama_anak,
//   bpjs_anak2, bpjs_anak3
// ═══════════════════════════════════════════════════════

const BPJS_NORM = (v: any) =>
  String(v ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const BPJS_CLEAN = (v: any) => {
  if (v === null || v === undefined) return null
  let t = String(v).trim()
  if (!t) return null
  // buang format scientific / desimal aneh dari Excel
  if (/^\d+(\.0+)?$/.test(t)) t = t.replace(/\.0+$/, '')
  if (/e\+/i.test(t)) {
    const n = Number(t)
    if (Number.isFinite(n)) t = n.toFixed(0)
  }
  if (['-', 'NULL', 'TIDAK ADA', 'N/A', 'NA'].includes(t.toUpperCase())) return null
  return t
}

function findHeaderRow(aoa: any[][]): number {
  const cands: number[] = []
  for (let i = 0; i < Math.min(aoa.length, 30); i++) {
    const cells = (aoa[i] || []).map(c => BPJS_NORM(c))
    const hasNama = cells.some(c => c.includes('NAMA KARYAWAN') || c === 'NAMA')
    const hasBpjs = cells.some(c => c.includes('KETENAGA') || c.includes('KESEHATAN') || c.includes('BPJS'))
    if (hasNama && hasBpjs) cands.push(i)
  }
  if (cands.length === 0) return -1

  // Pilih header yang baris SESUDAHNYA berisi nama orang (bukan header lagi).
  const isHeaderWord = (v: string) =>
    !v || v === 'NAMA' || v.includes('NAMA KARYAWAN') || v === 'DESC' || v === 'TOTAL'

  for (const i of cands) {
    const row = (aoa[i] || []).map(c => BPJS_NORM(c))
    const cNama = row.findIndex(c => c.includes('NAMA KARYAWAN') || c === 'NAMA')
    if (cNama === -1) continue

    let r = i + 1
    let guard = 0
    while (r < aoa.length && guard < 5 && !(aoa[r] || []).some(x => BPJS_CLEAN(x))) { r++; guard++ }
    if (r >= aoa.length) continue

    const below = BPJS_NORM((aoa[r] || [])[cNama])
    if (!isHeaderWord(below)) return i
  }
  return cands[cands.length - 1]
}

async function handleBpjsImport(aoa: any[][]) {
  if (!aoa || aoa.length === 0) {
    return NextResponse.json({ error: 'File kosong' }, { status: 400 })
  }

  const headerIdx = findHeaderRow(aoa)
  if (headerIdx === -1) {
    return NextResponse.json({
      error: 'Header tidak dikenali. Pastikan ada kolom "Nama Karyawan" dan "Ketenagakerjaan"/"Kesehatan".'
    }, { status: 400 })
  }

  const header = (aoa[headerIdx] || []).map(c => BPJS_NORM(c))

  // cari kolom utama
  const colOf = (pred: (h: string) => boolean) => header.findIndex(pred)
  const cNama = colOf(h => h === 'NAMA KARYAWAN' || h === 'NAMA KARYAWAN ')
  const cNrp = colOf(h => h === 'NRP' || h === 'NIK' || h === 'NIK SITE')
  const cSite = colOf(h => h === 'SITE')
  const cTk = colOf(h => h.includes('KETENAGA'))
  const cKes = colOf(h => h.includes('KESEHATAN') && !h.includes('KELUARGA'))
  const cGol = colOf(h => h.includes('GOLONGAN'))

  if (cNama === -1) {
    return NextResponse.json({ error: 'Kolom "Nama Karyawan" tidak ditemukan' }, { status: 400 })
  }

  // ── kolom keluarga: cari label grup (istri / anak 1..3) di baris atas header
  type Fam = { key: string; noCol: number; namaCol: number }
  const fam: Fam[] = []
  const groupLabels: { label: string; col: number }[] = []
  for (let up = 1; up <= 4 && headerIdx - up >= 0; up++) {
    const row = (aoa[headerIdx - up] || []).map(c => BPJS_NORM(c))
    row.forEach((cell, ci) => {
      if (!cell) return
      if (cell === 'ISTRI' || /^ANAK\s*[1-4]$/.test(cell) || cell === 'ANAK') {
        groupLabels.push({ label: cell, col: ci })
      }
    })
    if (groupLabels.length > 0) break
  }
  groupLabels.sort((a, b) => a.col - b.col)

  const famKey = (label: string) => {
    if (label.includes('ISTRI')) return { no: 'bpjs_istri', nama: 'nama_istri' }
    const m = label.match(/([1-4])/)
    const n = m ? m[1] : '1'
    return { no: `bpjs_anak${n}`, nama: n === '1' ? 'nama_anak' : '' }
  }

  groupLabels.forEach((g, gi) => {
    const end = gi + 1 < groupLabels.length ? groupLabels[gi + 1].col : header.length
    let noCol = -1
    let namaCol = -1
    for (let c = g.col; c < end; c++) {
      const h = header[c] || ''
      if (h.includes('NO BPJS') || h === 'NO. BPJS' || h.includes('NOMOR BPJS') || h === 'BPJS') {
        if (noCol === -1) noCol = c
      } else if (h === 'NAMA') {
        if (namaCol === -1) namaCol = c
      }
    }
    const k = famKey(g.label)
    if (noCol !== -1) fam.push({ key: k.no, noCol, namaCol: k.nama ? namaCol : -1 })
  })

  // ── baca baris data
  type Acc = Record<string, any> & { _nama: string; _nrp: string | null; _site: string | null }
  const acc = new Map<string, Acc>()
  const tanpaNama: number[] = []

  for (let r = headerIdx + 1; r < aoa.length; r++) {
    const row = aoa[r] || []
    const nama = BPJS_CLEAN(row[cNama])
    if (!nama) { tanpaNama.push(r + 1); continue }
    const namaKey = BPJS_NORM(nama)
    if (!namaKey) continue
    if (['NAMA', 'DESC', 'TOTAL'].includes(namaKey)) continue

    const nrpRaw = cNrp !== -1 ? BPJS_CLEAN(row[cNrp]) : null
    const site = cSite !== -1 ? BPJS_CLEAN(row[cSite]) : null

    const cur: Acc = acc.get(namaKey) || { _nama: nama, _nrp: nrpRaw, _site: site } as Acc
    if (!cur._nrp && nrpRaw) cur._nrp = nrpRaw
    if (!cur._site && site) cur._site = site

    const setIf = (k: string, v: any) => { if (v && !cur[k]) cur[k] = v }

    if (cTk !== -1) setIf('bpjs_tk', BPJS_CLEAN(row[cTk]))
    if (cKes !== -1) setIf('bpjs_kes', BPJS_CLEAN(row[cKes]))
    for (const f of fam) {
      setIf(f.key, BPJS_CLEAN(row[f.noCol]))
      if (f.namaCol !== -1 && f.key === 'bpjs_istri') setIf('nama_istri', BPJS_CLEAN(row[f.namaCol]))
      if (f.namaCol !== -1 && f.key === 'bpjs_anak1') setIf('nama_anak', BPJS_CLEAN(row[f.namaCol]))
    }

    acc.set(namaKey, cur)
  }

  if (acc.size === 0) {
    return NextResponse.json({ error: 'Tidak ada baris berisi Nama Karyawan' }, { status: 400 })
  }

  // ── ambil karyawan (SATU SUMBER: employees)
  const { data: emps, error: empErr } = await supabaseAdmin
    .from('employees')
    .select('nrp, nama, site, status_karyawan')

  if (empErr) {
    return NextResponse.json({ error: `Gagal baca karyawan: ${empErr.message}` }, { status: 500 })
  }

  const isDup = (e: any) => String(e.status_karyawan || '').toLowerCase() === 'duplikat'
  const better = (a: any, b: any) => (!a ? b : (!b ? a : (isDup(a) && !isDup(b) ? b : a)))

  const byNama = new Map<string, any>()
  const byNrp = new Map<string, any>()
  for (const e of (emps || [])) {
    const nk = BPJS_NORM(e.nama)
    if (nk) byNama.set(nk, better(byNama.get(nk), e))
    const nk2 = String(e.nrp || '').trim().toUpperCase().replace(/^B/, '')
    if (nk2) byNrp.set(nk2, better(byNrp.get(nk2), e))
  }

  // ── update
  let updated = 0
  const notFound: any[] = []
  const failed: any[] = []
  const FIELDS = ['bpjs_tk','bpjs_kes','bpjs_istri','nama_istri','bpjs_anak1','nama_anak','bpjs_anak2','bpjs_anak3']

  for (const [namaKey, v] of acc) {
    let emp = byNama.get(namaKey) || null
    if (!emp && v._nrp) {
      emp = byNrp.get(String(v._nrp).trim().toUpperCase().replace(/^B/, '')) || null
    }
    if (!emp) { notFound.push({ nama: v._nama, nrp: v._nrp, site: v._site }); continue }

    const patch: any = {}
    for (const f of FIELDS) if (v[f]) patch[f] = v[f]
    if (Object.keys(patch).length === 0) continue

    const { error } = await supabaseAdmin.from('employees').update(patch).eq('nrp', emp.nrp)
    if (error) failed.push({ nrp: emp.nrp, nama: emp.nama, error: error.message })
    else updated++
  }

  return NextResponse.json({
    success: true,
    message: `✅ Import BPJS selesai. Diperbarui: ${updated} · tidak ketemu: ${notFound.length} · gagal: ${failed.length}`,
    summary: {
      tabel: 'employees (bpjs_tk, bpjs_kes, keluarga)',
      headerBaris: headerIdx + 1,
      namaUnik: acc.size,
      diupdate: updated,
      tidakKetemu: notFound.length,
      gagal: failed.length,
      barisTanpaNama: tanpaNama.length,
      kolomKeluargaDitemukan: fam.map(f => f.key)
    },
    tidakKetemu: notFound.slice(0, 40),
    gagal: failed.slice(0, 20)
  })
}
