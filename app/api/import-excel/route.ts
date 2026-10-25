// app/api/import-excel/route.ts
// Generic Excel importer untuk berbagai tabel (employees, bpjs, pkwt, dll)
// v2.1 - Fix Excel serial date → convert ke YYYY-MM-DD

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'
import { periksaJabatan, ROLE_PERLU_SCOPE_SITE } from '@/app/lib/jabatan-role'

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
      // Cari sheet yang punya header "nama" — jangan hanya sheet pertama
      const tried: any[] = []
      for (const nm of workbook.SheetNames) {
        const aoa: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[nm], {
          header: 1, defval: null, raw: false, blankrows: false
        })
        if (!aoa || aoa.length === 0) continue
        const hi = findHeaderRow(aoa)
        if (hi === -1) { tried.push(nm); continue }
        const header = (aoa[hi] || []).map(c => BPJS_NORM(c))
        const cN = findNameColumn(header, aoa, hi)
        if (cN === -1) { tried.push(nm); continue }
        const res = await handleBpjsImport(aoa, nm)
        return res
      }
      return NextResponse.json({
        error: `Tidak menemukan sheet berisi kolom nama karyawan. Sheet yang dicek: ${workbook.SheetNames.join(', ')}`
      }, { status: 400 })
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

  const normalizeKey = (k: string) => String(k).toLowerCase().trim().replace(/\s+/g, '_')

  const validRows: any[] = []
  const invalidRows: any[] = []
  const warningRows: any[] = []

  // ── Hasil aturan jabatan (dilaporkan ke pengguna) ──
  const penyesuaianJabatan: any[] = []      // jabatan/departemen yang dibetulkan
  const calonRole = new Map<string, string>()  // nrp -> role struktural yang seharusnya
  const sitePerNrp = new Map<string, string>() // nrp -> nama site (untuk scope_site)
  const statusPerNrp = new Map<string, string>() // nrp -> status karyawan

  // ── Daftar site resmi (mencegah site berubah karena salah ketik) ──
  let daftarSite: string[] = []
  const kodeSiteMap = new Map<string, string>()   // NAMA_SITE (uppercase) -> kode_site
  try {
    const { data: siteRows } = await supabaseAdmin.from('sites').select('nama_site, kode_site')
    daftarSite = (siteRows || []).map((r: any) => String(r.nama_site || '').trim()).filter(Boolean)
    ;(siteRows || []).forEach((r: any) => {
      const nm = String(r.nama_site || '').trim().toUpperCase()
      if (nm && r.kode_site) kodeSiteMap.set(nm, String(r.kode_site).trim())
    })
  } catch {}
  if (daftarSite.length === 0) {
    const { data: empSite } = await supabaseAdmin.from('employees').select('site')
    daftarSite = Array.from(new Set((empSite || []).map((r: any) => String(r.site || '').trim()).filter(Boolean)))
  }
  const siteMap = new Map<string, string>()          // uppercase -> bentuk resmi
  daftarSite.forEach(sn => siteMap.set(sn.toUpperCase(), sn))

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
        normalized[dateField] = parseDate(normalized[dateField])
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

    // ── NRP: jaga angka 0 di depan (Excel sering mengubahnya jadi angka) ──
    if (/^\d+$/.test(normalized.nrp) && normalized.nrp.length < 7) {
      const padded = normalized.nrp.padStart(7, '0')
      const { data: cek } = await supabaseAdmin
        .from('employees').select('nrp').eq('nrp', padded).limit(1)
      if (cek && cek.length > 0) normalized.nrp = padded
    }

    // ── SITE: samakan dengan daftar resmi, jangan biarkan berubah ──
    if (normalized.site) {
      const asli = String(normalized.site).trim()
      const resmi = siteMap.get(asli.toUpperCase())
      if (resmi) {
        normalized.site = resmi
      } else {
        normalized.site = asli
        warningRows.push({
          baris: i + 2, nrp: normalized.nrp, nama: normalized.nama,
          peringatan: `Site "${asli}" tidak ada di daftar site resmi (${daftarSite.join(', ')}). Mohon diperiksa.`
        })
      }
    } else {
      delete normalized.site   // kosong -> jangan sentuh site yang sudah ada
    }

    // ── JABATAN: samakan ke bentuk baku, tentukan departemen & role ──
    // Aturan baku ada di app/lib/jabatan-role.ts
    if (normalized.jabatan) {
      const cek = periksaJabatan(normalized.jabatan, normalized.departemen)
      if (cek.dikenali) {
        const jabatanAsli = String(normalized.jabatan).trim()
        const deptAsli = normalized.departemen ? String(normalized.departemen).trim() : null

        normalized.jabatan = cek.jabatan
        // Departemen baku hanya dipakai kalau aturannya yakin.
        // Kalau Excel sudah mengisi sesuatu yang berbeda, tetap dibetulkan
        // tetapi dilaporkan supaya terlihat.
        if (cek.departemen) normalized.departemen = cek.departemen

        if (cek.jabatanBerubah || cek.departemenBerubah) {
          penyesuaianJabatan.push({
            baris: i + 2,
            nrp: normalized.nrp,
            nama: normalized.nama,
            jabatan_dari: jabatanAsli,
            jabatan_jadi: cek.jabatan,
            departemen_dari: deptAsli,
            departemen_jadi: cek.departemen,
            role: cek.role,
          })
        }
        if (cek.role) calonRole.set(String(normalized.nrp), cek.role)
      } else {
        warningRows.push({
          baris: i + 2, nrp: normalized.nrp, nama: normalized.nama,
          peringatan: `Jabatan "${String(normalized.jabatan).trim()}" belum ada di aturan baku. Jabatan dibiarkan apa adanya dan role tidak diubah.`
        })
      }
    }

    if (!normalized.status_karyawan) normalized.status_karyawan = 'Aktif'

    // catat site untuk penentuan scope_site role
    if (normalized.site) sitePerNrp.set(String(normalized.nrp), String(normalized.site))
    statusPerNrp.set(String(normalized.nrp), String(normalized.status_karyawan || 'Aktif'))

    validRows.push(normalized)
  }

  if (validRows.length === 0) {
    return NextResponse.json({
      error: 'Tidak ada data valid untuk di-import',
      invalidRows: invalidRows.slice(0, 30)
    }, { status: 400 })
  }

  const nrpList = validRows.map(r => r.nrp)
  const { data: existingEmps } = await supabaseAdmin
    .from('employees')
    .select('*')
    .in('nrp', nrpList)

  const existingMap = new Map<string, any>((existingEmps || []).map((e: any) => [String(e.nrp), e]))

  const newRows: any[] = []
  const updateRows: any[] = []
  const dikosongkan: any[] = []   // sel kosong yang TIDAK menimpa data lama

  for (const r of validRows) {
    const lama = existingMap.get(r.nrp)
    if (lama && !sitePerNrp.has(String(r.nrp)) && lama.site) {
      sitePerNrp.set(String(r.nrp), String(lama.site))
    }
    if (!lama) {
      if (!r.site) {
        invalidRows.push({
          baris: '-', nrp: r.nrp, nama: r.nama,
          alasan: 'Karyawan baru wajib punya kolom site. Baris tidak diimpor.'
        })
        continue
      }
      newRows.push(r)
      continue
    }
    // karyawan lama: hanya timpa kolom yang BERISI.
    // Sel kosong tidak boleh menghapus data yang sudah ada.
    const patch: any = { nrp: r.nrp }
    Object.keys(r).forEach(k => {
      if (k === 'nrp') return
      const v = r[k]
      if (v === null || v === undefined || v === '') {
        const lamaAda = lama[k] !== null && lama[k] !== undefined && String(lama[k]).trim() !== ''
        if (lamaAda) dikosongkan.push({ nrp: r.nrp, kolom: k, nilai_lama: lama[k] })
        return
      }
      patch[k] = v
    })
    updateRows.push(patch)
  }

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
        invalidRows: invalidRows.slice(0, 20)
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
        invalidRows: invalidRows.slice(0, 20)
      }, { status: 500 })
    }
    updatedCount = updateRows.length
  }

  // Role hanya diberikan kepada karyawan yang benar-benar tersimpan
  // dan statusnya masih aktif. Baris yang ditolak tidak diberi role.
  {
    const nrpTersimpan = new Set<string>([
      ...newRows.map((r: any) => String(r.nrp)),
      ...updateRows.map((r: any) => String(r.nrp)),
    ])
    for (const nrp of Array.from(calonRole.keys())) {
      if (!nrpTersimpan.has(nrp)) { calonRole.delete(nrp); continue }
      const st = (statusPerNrp.get(nrp) || 'Aktif').toLowerCase()
      if (/resign|nonaktif|non-aktif|keluar|berhenti|terminat|phk/.test(st)) calonRole.delete(nrp)
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 6. PENETAPAN ROLE DARI JABATAN
  //    Hanya MENAMBAH role yang belum ada. Tidak pernah menghapus.
  //    Izin role disalin dari role_template_permissions + izin dasar karyawan.
  // ═══════════════════════════════════════════════════════════
  const roleDitambahkan: any[] = []
  const roleGagal: any[] = []

  if (calonRole.size > 0) {
    let izinDasar: string[] = []
    try {
      const { data: tp } = await supabaseAdmin
        .from('role_template_permissions').select('perm_key').eq('role_key', 'karyawan')
      izinDasar = (tp || []).map((x: any) => String(x.perm_key)).filter(Boolean)
    } catch {}

    for (const [nrp, role] of calonRole.entries()) {
      try {
        const { data: ada } = await supabaseAdmin
          .from('roles').select('nrp, role, active').eq('nrp', nrp).eq('role', role).limit(1)

        if (ada && ada.length > 0) {
          if (ada[0].active === false) {
            await supabaseAdmin.from('roles').update({ active: true }).eq('nrp', nrp).eq('role', role)
            roleDitambahkan.push({ nrp, role, catatan: 'role lama diaktifkan kembali' })
          }
          continue   // sudah punya role ini
        }

        const siteNama = sitePerNrp.get(nrp) || ''
        const scope = kodeSiteMap.get(siteNama.toUpperCase()) || null

        const barisRole: any = { nrp, role, active: true }
        if (scope && ROLE_PERLU_SCOPE_SITE.has(role)) barisRole.scope_site = scope

        const { error: errRole } = await supabaseAdmin.from('roles').insert(barisRole)
        if (errRole) {
          roleGagal.push({ nrp, role, error: errRole.message })
          continue
        }

        // salin izin dari template role + izin dasar
        const { data: tpRole } = await supabaseAdmin
          .from('role_template_permissions').select('perm_key').eq('role_key', role)
        const izin = Array.from(new Set([
          ...((tpRole || []).map((x: any) => String(x.perm_key))),
          ...izinDasar,
        ])).filter(Boolean)
        if (izin.length > 0) {
          await supabaseAdmin
            .from('user_permissions')
            .upsert(izin.map((perm_key) => ({ nrp, perm_key })), { onConflict: 'nrp,perm_key', ignoreDuplicates: true })
        }

        roleDitambahkan.push({ nrp, role, scope_site: barisRole.scope_site || null, izin: izin.length })
      } catch (e: any) {
        roleGagal.push({ nrp, role, error: e?.message || 'gagal' })
      }
    }
  }

  const pesanRole = roleDitambahkan.length > 0 ? `, Role ditambah: ${roleDitambahkan.length}` : ''

  return NextResponse.json({
    success: true,
    message: `✅ Import karyawan selesai. Baru: ${insertedCount}, Update: ${updatedCount}, Tidak valid: ${invalidRows.length}${pesanRole}`,
    summary: {
      totalParsed: rawData.length,
      inserted: insertedCount,
      updated: updatedCount,
      invalid: invalidRows.length,
      peringatan: warningRows.length,
      kolomTidakDitimpaKarenaKosong: dikosongkan.length,
      jabatanDisesuaikan: penyesuaianJabatan.length,
      roleDitambahkan: roleDitambahkan.length,
      roleGagal: roleGagal.length,
      daftarSite
    },
    invalidRows: invalidRows.slice(0, 20),
    warningRows: warningRows.slice(0, 20),
    contohTidakDitimpa: dikosongkan.slice(0, 10),
    jabatanDisesuaikan: penyesuaianJabatan.slice(0, 30),
    roleDitambahkan: roleDitambahkan.slice(0, 30),
    roleGagal: roleGagal.slice(0, 20)
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

// kunci pencocokan: tanpa spasi & tanda baca
const BPJS_KEY = (v: any) =>
  String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')

// dua kata pertama (untuk nama yang punya gelar / nama panjang)
const BPJS_KEY2 = (v: any) => {
  const t = String(v ?? '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  return t.split(' ').slice(0, 2).join('')
}

// kemiripan 0..1
function similarity(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  const m = a.length, n = b.length
  if (Math.abs(m - n) > Math.max(m, n) * 0.4) return 0
  const prev = new Array(n + 1)
  const cur = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    cur[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j]
  }
  return 1 - prev[n] / Math.max(m, n)
}

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

function isHeaderWord(v: string): boolean {
  if (!v) return false
  if (v === 'NAMA' || v === 'DESC' || v === 'TOTAL' || v === 'NO BPJS' || v === 'BPJS') return true
  if (v.includes('NAMA KARYAWAN')) return true
  return false
}

function looksLikeName(v: string): boolean {
  if (!v) return false
  if (isHeaderWord(v)) return false
  if (/\d{4,}/.test(v)) return false           // nomor, tanggal, NIK
  return /^[A-Z][A-Z .,'\-]{2,}$/.test(v)      // minimal 3 huruf
}

function countAlphaCells(row: any[]): number {
  return (row || []).filter(c => {
    const v = BPJS_NORM(c)
    return v.length >= 3 && /^[A-Z][A-Z .,'\-]*$/.test(v)
  }).length
}

function findHeaderRow(aoa: any[][]): number {
  const cands: number[] = []
  const rowAt = (i: number): any[] => (Array.isArray(aoa[i]) ? aoa[i] : [])
  for (let i = 0; i < Math.min(aoa.length, 40); i++) {
    const cells = rowAt(i).map(c => BPJS_NORM(c))
    if (cells.some(c => c.includes('NAMA') || c.includes('KARYAWAN'))) cands.push(i)
  }
  if (cands.length === 0) return -1

  // Pilih kandidat yang: baris sesudahnya berisi nama orang, DAN
  // punya paling banyak sel berisi kata (header asli lebih "penuh").
  const scored = cands.map(i => {
    const row = rowAt(i)
    let belowOk = false
    let r = i + 1
    let guard = 0
    while (r < aoa.length && guard < 5 && !(aoa[r] || []).some(x => BPJS_CLEAN(x))) { r++; guard++ }
    if (r < aoa.length) {
      belowOk = (aoa[r] || []).some(x => looksLikeName(BPJS_NORM(x)))
    }
    return { i, belowOk, score: countAlphaCells(row) }
  })

  const good = scored.filter(x => x.belowOk)
  const pool = good.length > 0 ? good : scored
  pool.sort((a, b) => (b.score - a.score) || (b.i - a.i))
  return pool[0].i
}

function findNameColumn(header: string[], aoa: any[][], headerIdx: number): number {
  // Judul kolom sering TERPECAH ke beberapa baris: nama karyawan ada di baris
  // atas header, sedangkan baris header hanya memuat "Tgl Masuk / Ketenagakerjaan /
  // Kesehatan / No. BPJS / Nama (istri) / Nama (anak)". Jadi cari di gabungan baris.
  const barisJudul: string[][] = []
  for (let r = Math.max(0, headerIdx - 3); r <= Math.min(aoa.length - 1, headerIdx + 1); r++) {
    barisJudul.push((aoa[r] || []).map((x: any) => BPJS_NORM(x)))
  }
  // kolom nomor BPJS -> penanda bahwa "NAMA" di sebelahnya adalah nama anggota keluarga
  const isKolomNoBpjs = (h: string) => h.includes('BPJS') && !h.includes('NAMA')

  // 1) paling spesifik: NAMA KARYAWAN (boleh dari baris mana pun di sekitar header)
  for (const row of barisJudul) {
    const i = row.findIndex(h => h.includes('NAMA KARYAWAN'))
    if (i !== -1) return i
  }
  // 2) kolom persis "NAMA" di baris header, TAPI lewati nama istri/anak
  const rowHeader = barisJudul[barisJudul.length - 2] || header
  for (let i = 0; i < header.length; i++) {
    if (header[i] !== 'NAMA') continue
    const kiri = header[i - 1] || ''
    if (isKolomNoBpjs(kiri)) continue // ini nama istri/anak, bukan nama karyawan
    return i
  }
  // 3) kolom mana pun yang memuat kata NAMA (kecuali BPJS / anggota keluarga)
  let c = header.findIndex(h => h.includes('NAMA') && !h.includes('BPJS') && !h.includes('ISTRI') && !h.includes('ANAK'))
  if (c !== -1) return c
  // 4) tebak dari isi: kolom dengan nama orang terbanyak
  let best = -1
  let bestN = 0
  const width = Math.max(...aoa.slice(headerIdx + 1, headerIdx + 40).map(r => (r || []).length), header.length)
  for (let ci = 0; ci < width; ci++) {
    let n = 0
    for (let r = headerIdx + 1; r < Math.min(aoa.length, headerIdx + 60); r++) {
      if (looksLikeName(BPJS_NORM((aoa[r] || [])[ci]))) n++
    }
    if (n > bestN) { bestN = n; best = ci }
  }
  return bestN >= 2 ? best : -1
}

async function handleBpjsImport(aoa: any[][], sheetName = '') {
  if (!aoa || aoa.length === 0) {
    return NextResponse.json({ error: 'File kosong' }, { status: 400 })
  }

  const headerIdx = findHeaderRow(aoa)
  if (headerIdx === -1) {
    const preview = aoa.slice(0, 6).map(r => (r || []).slice(0, 12).map((c: any) => String(c ?? '').trim()).filter(Boolean).join(' | ')).filter(Boolean)
    return NextResponse.json({
      error: `Header tidak terdeteksi di sheet "${sheetName}". 6 baris pertama: ${preview.join(' /// ')}`,
      diagnosa: { sheet: sheetName, jumlahBaris: aoa.length, preview }
    }, { status: 400 })
  }

  const header = (aoa[headerIdx] || []).map(c => BPJS_NORM(c))

  // cari kolom utama
  const colOf = (pred: (h: string) => boolean) => header.findIndex(pred)
  const cNama = findNameColumn(header, aoa, headerIdx)
  const cNrp = colOf(h => h === 'NRP' || h === 'NIK' || h === 'NIK SITE')
  const cSite = colOf(h => h === 'SITE')
  const cTk = colOf(h => h.includes('KETENAGA'))
  const cKes = colOf(h => h.includes('KESEHATAN') && !h.includes('KELUARGA'))
  const cGol = colOf(h => h.includes('GOLONGAN'))

  if (cNama === -1) {
    const headerCells = (aoa[headerIdx] || []).slice(0, 40).map((c: any) => String(c ?? '').trim()).filter(Boolean)
    return NextResponse.json({
      error: `Kolom "Nama Karyawan" tidak ditemukan di sheet "${sheetName}". Isi header baris ${headerIdx + 1}: ${headerCells.join(' | ')}`,
      diagnosa: {
        sheet: sheetName,
        headerBaris: headerIdx + 1,
        jumlahBaris: aoa.length,
        isiHeader: headerCells,
        contohBarisBawah: (aoa[headerIdx + 1] || []).slice(0, 15).map((c: any) => String(c ?? '').trim())
      }
    }, { status: 400 })
  }

  // ── KOLOM KELUARGA ─────────────────────────────────────────
  // Prinsip: JANGAN bergantung pada judul kolom (label merged sering tidak sejajar).
  // Kenali dari ISI: kolom di sebelah kanan kolom "Kesehatan" yang berisi
  // deretan angka panjang (>= 8 digit) = nomor BPJS keluarga.
  // Urutan: ke-1 Istri, ke-2 Anak1, ke-3 Anak2, ke-4 Anak3.
  type Fam = { key: string; noCol: number; namaCol: number }
  const fam: Fam[] = []

  const famAssign = [
    { no: 'bpjs_istri', nama: 'nama_istri' },
    { no: 'bpjs_anak1', nama: 'nama_anak' },
    { no: 'bpjs_anak2', nama: '' },
    { no: 'bpjs_anak3', nama: '' },
  ]

  const isNoBpjs = (h: string) => h.includes('NO BPJS') || h.includes('NOMOR BPJS') || h === 'BPJS'
  const isNamaKol = (h: string) => h === 'NAMA' || h === 'NAMA LENGKAP' || h === 'NAMA ANGGOTA'

  // angka murni panjang -> kandidat nomor BPJS
  const bpjsNoOf = (v: any): string | null => {
    const t = BPJS_CLEAN(v)
    if (!t) return null
    // buang spasi / strip / titik pemisah yang sering ada di sel Excel
    const t2 = t.replace(/[\s\-\.]/g, '')
    if (t2.replace(/[^0-9]/g, '') !== t2) return null
    if (t2.length < 8 || t2.length > 20) return null
    return t2
  }
  // teks berisi huruf -> kandidat nama anggota
  const teksNamaOf = (v: any): string | null => {
    const t = BPJS_CLEAN(v)
    if (!t) return null
    if (!/[A-Za-z]/.test(t)) return null
    if (t.length < 2) return null
    return t
  }

  const dataAwal = headerIdx + 1
  const scan = aoa.slice(dataAwal, dataAwal + 600)
  const nColScan = scan.reduce((m: number, r: any) => Math.max(m, (r || []).length), 0)
  const mulaiCari = (cKes >= 0 ? cKes : (cTk >= 0 ? cTk : cNama)) + 1

  const famDeteksi: any[] = []

  // Cara 1 (UTAMA): kenali dari isi sel
  const kandidat: { col: number; isi: number; namaCol: number }[] = []
  for (let c = mulaiCari; c < nColScan; c++) {
    if (c === cNrp) continue
    let isi = 0
    for (const row of scan) if (bpjsNoOf((row || [])[c])) isi++
    if (isi < 1) continue
    let namaCol = -1
    const nxt = c + 1
    if (nxt < nColScan) {
      let teks = 0
      for (const row of scan) if (teksNamaOf((row || [])[nxt])) teks++
      if (teks >= Math.max(1, Math.floor(isi * 0.5))) namaCol = nxt
    }
    kandidat.push({ col: c, isi, namaCol })
  }

  kandidat.slice(0, famAssign.length).forEach((k2, i) => {
    const nm = famAssign[i].nama
    fam.push({ key: famAssign[i].no, noCol: k2.col, namaCol: nm ? k2.namaCol : -1 })
    famDeteksi.push({
      kolom: famAssign[i].no,
      excelKolomKe: k2.col + 1,
      judul: header[k2.col] || '(kosong)',
      judulNama: k2.namaCol !== -1 ? (header[k2.namaCol] || '(kosong)') : null,
      jumlahTerisi: k2.isi,
    })
  })

  // Cara 2 (cadangan): pasangan (No BPJS, Nama) di baris header
  if (fam.length === 0) {
    let k = 0
    for (let c = mulaiCari; c < header.length && k < famAssign.length; c++) {
      if (isNoBpjs(header[c]) && isNamaKol(header[c + 1] || '')) {
        fam.push({ key: famAssign[k].no, noCol: c, namaCol: famAssign[k].nama ? c + 1 : -1 })
        famDeteksi.push({ kolom: famAssign[k].no, excelKolomKe: c + 1, judul: header[c], judulNama: header[c + 1], jumlahTerisi: -1 })
        k++; c++
        continue
      }
      if (isNamaKol(header[c]) && isNoBpjs(header[c + 1] || '')) {
        fam.push({ key: famAssign[k].no, noCol: c + 1, namaCol: famAssign[k].nama ? c : -1 })
        famDeteksi.push({ kolom: famAssign[k].no, excelKolomKe: c + 2, judul: header[c + 1], judulNama: header[c], jumlahTerisi: -1 })
        k++; c++
      }
    }
  }

  // ── baca baris data
  type Acc = Record<string, any> & { _nama: string; _nrp: string | null; _site: string | null }
  const acc = new Map<string, Acc>()
  const tanpaNama: number[] = []

  for (let r = headerIdx + 1; r < aoa.length; r++) {
    const row = aoa[r] || []
    const nama = BPJS_CLEAN(row[cNama])
    if (!nama) { tanpaNama.push(r + 1); continue }
    const namaKey = BPJS_KEY(nama)
    if (!namaKey) continue
    if (['NAMA', 'DESC', 'TOTAL', 'NAMADESC'].includes(namaKey)) continue
    if (namaKey.length < 3) continue

    const nrpRaw = cNrp !== -1 ? BPJS_CLEAN(row[cNrp]) : null
    const site = cSite !== -1 ? BPJS_CLEAN(row[cSite]) : null

    const cur: Acc = acc.get(namaKey) || { _nama: nama, _nrp: nrpRaw, _site: site } as Acc
    if (!cur._nrp && nrpRaw) cur._nrp = nrpRaw
    if (!cur._site && site) cur._site = site

    const setIf = (k: string, v: any) => { if (v && !cur[k]) cur[k] = v }

    if (cTk !== -1) setIf('bpjs_tk', BPJS_CLEAN(row[cTk]))
    if (cKes !== -1) setIf('bpjs_kes', BPJS_CLEAN(row[cKes]))
    for (const f of fam) {
      // nomor disimpan rapi tanpa spasi/strip bila memang angka murni
      setIf(f.key, bpjsNoOf(row[f.noCol]) || BPJS_CLEAN(row[f.noCol]))
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

  const byKey = new Map<string, any>()     // tanpa spasi & tanda baca
  const byKey2 = new Map<string, any>()    // dua kata pertama
  const byNrp = new Map<string, any>()
  const list: any[] = []

  for (const e of (emps || [])) {
    const k1 = BPJS_KEY(e.nama)
    const k2 = BPJS_KEY2(e.nama)
    if (k1) { byKey.set(k1, better(byKey.get(k1), e)); list.push(e) }
    if (k2) byKey2.set(k2, better(byKey2.get(k2), e))
    const nk2 = String(e.nrp || '').trim().toUpperCase().replace(/^B/, '')
    if (nk2) byNrp.set(nk2, better(byNrp.get(nk2), e))
  }

  const sameSiteOf = (e: any, site: string | null) =>
    !!(site && e.site && BPJS_KEY(e.site) === BPJS_KEY(site))

  function cariKaryawan(namaRaw: string, site: string | null, nrp: string | null): any {
    // 1. NRP langsung (kalau ada di file)
    if (nrp) {
      const byN = byNrp.get(String(nrp).trim().toUpperCase().replace(/^B/, ''))
      if (byN) return byN
    }
    const k1 = BPJS_KEY(namaRaw)
    // 2. nama sama persis (tanpa spasi & tanda baca)
    const exact = byKey.get(k1)
    if (exact) return exact
    // 3. dua kata pertama
    const k2 = BPJS_KEY2(namaRaw)
    const hit2 = k2 ? byKey2.get(k2) : null
    if (hit2 && sameSiteOf(hit2, site)) return hit2
    // 4. kemiripan tinggi, utamakan site sama
    let best: any = null, bestScore = 0, bestSame = false
    for (const e of list) {
      const sc = similarity(k1, BPJS_KEY(e.nama))
      if (sc < 0.88) continue
      const same = sameSiteOf(e, site)
      const isBetter = (same && !bestSame && sc >= 0.88) ||
                       (same === bestSame && sc > bestScore)
      if (isBetter) { best = e; bestScore = sc; bestSame = same }
    }
    return best
  }

  // ── update
  let updated = 0
  const notFound: any[] = []
  const failed: any[] = []
  const FIELDS = ['bpjs_tk','bpjs_kes','bpjs_istri','nama_istri','bpjs_anak1','nama_anak','bpjs_anak2','bpjs_anak3']

  for (const [namaKey, v] of acc) {
    const emp = cariKaryawan(v._nama, v._site, v._nrp)
    if (!emp) {
      // 3 nama terdekat di database, untuk membantu pengecekan manual
      const k1 = BPJS_KEY(v._nama)
      const saran = list
        .map((e: any) => ({ nama: e.nama, nrp: e.nrp, skor: Math.round(similarity(k1, BPJS_KEY(e.nama)) * 100) }))
        .sort((a: any, b: any) => b.skor - a.skor)
        .slice(0, 3)
      notFound.push({ nama: v._nama, site: v._site, mirip: saran })
      continue
    }

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
      sheet: sheetName,
      headerBaris: headerIdx + 1,
      namaUnik: acc.size,
      diupdate: updated,
      tidakKetemu: notFound.length,
      gagal: failed.length,
      barisTanpaNama: tanpaNama.length,
      namaKolomKe: cNama + 1,
      namaKolomJudul: header[cNama] || '',
      kolomKeluargaDitemukan: fam.map(f => f.key),
      famDeteksi
    },
    tidakKetemu: notFound.slice(0, 60),
    gagal: failed.slice(0, 20),
    contohNamaDatabase: list.slice(0, 15).map((e: any) => e.nama)
  })
}
