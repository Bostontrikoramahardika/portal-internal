// app/api/mcu/import/preview/route.ts
// Parse Excel + validasi (belum commit ke DB)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { getWitaToday } from '@/app/lib/timezone'
import ExcelJS from 'exceljs'

export const runtime = 'nodejs'
export const maxDuration = 60

const ALLOWED_ROLES = ['super_admin', 'hr_ho', 'hr_site']
const VALID_HASIL = ['FIT', 'FIT WITH NOTE', 'UNFIT', 'TEMPORARY UNFIT']
const VALID_JENIS = ['PERIODIK', 'KHUSUS', 'AWAL', 'PRA-KERJA', 'BERKALA']
const FINDING_TYPES = [
  'Mata', 'Gigi', 'Telinga', 'Kulit', 'Jantung', 'Paru-paru',
  'Hati', 'Ginjal', 'Tekanan Darah', 'Kolesterol', 'Gula Darah',
  'Asam Urat', 'Lainnya'
]

function parseDate(v: any): string | null {
  if (!v) return null
  if (v instanceof Date) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(v).trim()
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[1]}-${match[2]}-${match[3]}`
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  return null
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const role: string = userRoles[0] || 'employee'
  const isSuperAdmin = userRoles.includes('super_admin')

  if (!isSuperAdmin && !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(arrayBuffer)

    const ws = wb.getWorksheet('Import MCU') || wb.worksheets[0]
    if (!ws) return NextResponse.json({ error: 'Sheet "Import MCU" tidak ditemukan' }, { status: 400 })

    const today = getWitaToday()

    // Ambil semua NRP karyawan aktif (untuk validasi)
    const { data: allEmployees } = await supabaseAdmin
      .from('employees')
      .select('nrp, nama, site')
      .eq('status_karyawan', 'Aktif')

    const empMap: Record<string, any> = {}
    ;(allEmployees || []).forEach(e => { empMap[e.nrp] = e })

    const rows: any[] = []
    const errors: any[] = []
    let processedCount = 0
    let skippedCount = 0

    // Loop mulai baris 4 (skip 3 baris header)
    ws.eachRow((row, rowNum) => {
      if (rowNum < 4) return

      const nrp = String(row.getCell(1).value || '').trim()
      const nama = String(row.getCell(2).value || '').trim()
      const site = String(row.getCell(3).value || '').trim()

      // Skip kalau NRP kosong
      if (!nrp) return

      const tanggalMcu = parseDate(row.getCell(6).value)

      // Skip baris tanpa TGL MCU (dianggap tidak diisi)
      if (!tanggalMcu) {
        skippedCount++
        return
      }

      processedCount++
      const rowErrors: string[] = []

      // Validasi NRP
      const emp = empMap[nrp]
      if (!emp) {
        rowErrors.push(`NRP ${nrp} tidak ditemukan / tidak aktif`)
      }

      // Scope role
      if (!isSuperAdmin && role === 'hr_site' && emp && emp.site !== session.site) {
        rowErrors.push(`NRP ${nrp} bukan site Anda (${session.site})`)
      }

      // Validasi tanggal MCU
      if (tanggalMcu > today) {
        rowErrors.push(`Tanggal MCU (${tanggalMcu}) tidak boleh masa depan`)
      }

      const jenisMcu = String(row.getCell(7).value || '').trim().toUpperCase()
      if (!jenisMcu) rowErrors.push('Jenis MCU wajib diisi')
      else if (!VALID_JENIS.includes(jenisMcu)) {
        rowErrors.push(`Jenis MCU "${jenisMcu}" tidak valid. Pilihan: ${VALID_JENIS.join(', ')}`)
      }

      const hasil = String(row.getCell(8).value || '').trim().toUpperCase()
      if (!hasil) rowErrors.push('Hasil wajib diisi')
      else if (!VALID_HASIL.includes(hasil)) {
        rowErrors.push(`Hasil "${hasil}" tidak valid. Pilihan: ${VALID_HASIL.join(', ')}`)
      }

      const dokter = String(row.getCell(9).value || '').trim() || null
      const rumahSakit = String(row.getCell(10).value || '').trim() || null
      const tanggalBerlaku = parseDate(row.getCell(11).value)
      const tanggalExpired = parseDate(row.getCell(12).value)

      if (!tanggalExpired) rowErrors.push('Tanggal Expired wajib diisi')
      else if (tanggalExpired <= tanggalMcu) {
        rowErrors.push(`Tanggal Expired (${tanggalExpired}) harus > Tanggal MCU (${tanggalMcu})`)
      }

      // Kolom temuan (13 kolom mulai kolom 13)
      const findings: { jenis: string, keterangan: string }[] = []
      FINDING_TYPES.forEach((jenis, idx) => {
        const colIdx = 13 + idx
        const val = String(row.getCell(colIdx).value || '').trim()
        if (val && val.toUpperCase() !== 'N' && val !== '0') {
          const ket = ['Y', '1', 'YA', 'YES'].includes(val.toUpperCase()) ? '' : val
          findings.push({ jenis, keterangan: ket })
        }
      })

      const keterangan = String(row.getCell(13 + FINDING_TYPES.length).value || '').trim() || null

      const rowData = {
        rowNum,
        nrp,
        nama: emp?.nama || nama,
        site: emp?.site || site,
        tanggal_mcu: tanggalMcu,
        jenis_mcu: jenisMcu,
        hasil,
        dokter,
        rumah_sakit: rumahSakit,
        tanggal_berlaku: tanggalBerlaku,
        tanggal_expired: tanggalExpired,
        findings,
        keterangan,
        valid: rowErrors.length === 0,
        errors: rowErrors,
      }

      rows.push(rowData)
      if (rowErrors.length > 0) errors.push({ row: rowNum, nrp, errors: rowErrors })
    })

    return NextResponse.json({
      ok: true,
      summary: {
        totalRows: processedCount + skippedCount,
        processed: processedCount,
        skipped: skippedCount,
        valid: rows.filter(r => r.valid).length,
        invalid: errors.length,
      },
      rows,
      errors,
    })
  } catch (e: any) {
    console.error('[MCU Preview] Error:', e)
    return NextResponse.json({ error: e.message || 'Gagal parse Excel' }, { status: 500 })
  }
}