// app/api/mcu/matrix/export/route.ts
// Export matrix MCU ke Excel (format sama dengan HR standard)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { getWitaToday } from '@/app/lib/timezone'
import ExcelJS from 'exceljs'

const HO_ROLES = ['super_admin', 'hr_ho', 'director_ops', 'business_dev', 'manager_ops', 'spv_she_ho']
const SITE_ROLES = ['hr_site', 'pjo_site', 'she_site']
const MAX_MCU_COLUMNS = 5

function formatDate(d: string | null): string {
  if (!d) return ''
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
    .replace(/ /g, '-')
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const role: string = userRoles[0] || 'employee'
  const isSuperAdmin = userRoles.includes('super_admin')
  const isHO = isSuperAdmin || HO_ROLES.includes(role)

  if (role === 'employee' && !isSuperAdmin) {
    return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const site = searchParams.get('site') || ''
  const departemen = searchParams.get('departemen') || ''

  // Ambil karyawan (sama seperti endpoint matrix)
  let empQuery = supabaseAdmin
    .from('employees')
    .select('nrp, nama, jabatan, departemen, site, status_karyawan')
    .eq('status_karyawan', 'Aktif')
    .order('site', { ascending: true })
    .order('nama', { ascending: true })

  if (!isHO && SITE_ROLES.includes(role)) empQuery = empQuery.eq('site', session.site || '')
  if (site) empQuery = empQuery.eq('site', site)
  if (departemen) empQuery = empQuery.eq('departemen', departemen)

  const { data: employees } = await empQuery
  if (!employees?.length) return NextResponse.json({ error: 'Tidak ada data' }, { status: 404 })

  const nrpList = employees.map(e => e.nrp)
  const today = getWitaToday()

  const { data: allMcus } = await supabaseAdmin
    .from('mcu')
    .select('nrp, tanggal_mcu, tanggal_expired, hasil, status_mcu, butuh_followup')
    .in('nrp', nrpList)
    .order('tanggal_mcu', { ascending: true })

  const mcuByNrp: Record<string, any[]> = {}
  ;(allMcus || []).forEach((m: any) => {
    if (!mcuByNrp[m.nrp]) mcuByNrp[m.nrp] = []
    mcuByNrp[m.nrp].push(m)
  })

  // Build Excel
  const wb = new ExcelJS.Workbook()
  wb.creator = 'BTM Portal'
  wb.created = new Date()

  const ws = wb.addWorksheet('Monitoring MCU', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 4 }]
  })

  const siteLabel = site ? site.toUpperCase() : 'ALL SITE'

  // Row 1-2: Title
  ws.mergeCells(1, 1, 2, 11)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = `MONITORING MEDICAL CEK UP\nPT PUTRA PERKASA ABADI SITE ${siteLabel}`
  titleCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003D79' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  ws.getRow(1).height = 25
  ws.getRow(2).height = 25

  // Row 3: kosong
  // Row 4: Header
  const headers = ['No', 'Nama', 'MCU 1', 'MCU 2', 'MCU 3', 'MCU 4', 'MCU 5', 'MCU Terakhir', 'Masa Berlaku', 'Status Karyawan', 'Status MCU']
  const headerRow = ws.getRow(4)
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003D79' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    }
  })
  headerRow.height = 30

  // Set column widths
  ws.getColumn(1).width = 6
  ws.getColumn(2).width = 30
  for (let i = 3; i <= 7; i++) ws.getColumn(i).width = 12
  ws.getColumn(8).width = 14
  ws.getColumn(9).width = 14
  ws.getColumn(10).width = 15
  ws.getColumn(11).width = 15

  // Data rows
  employees.forEach((emp, idx) => {
    const mcus = mcuByNrp[emp.nrp] || []
    const lastMcu = mcus.length > 0 ? mcus[mcus.length - 1] : null

    let statusMcu = 'BELUM MCU'
    let statusColor = 'FFE5E7EB'
    let statusFont = 'FF6B7280'

    if (lastMcu) {
      const expDate = lastMcu.tanggal_expired ? new Date(lastMcu.tanggal_expired + 'T00:00:00') : null
      const todayDate = new Date(today + 'T00:00:00')
      const isExpired = expDate && expDate < todayDate

      if (isExpired) {
        statusMcu = 'EXP DATE'
        statusColor = 'FFDC2626'
        statusFont = 'FFFFFFFF'
      } else if (lastMcu.hasil === 'FIT WITH NOTE') {
        statusMcu = 'FIT WITH NOTE'
        statusColor = 'FFDCFCE7'
        statusFont = 'FF166534'
      } else if (lastMcu.butuh_followup) {
        statusMcu = 'PENDING'
        statusColor = 'FFFEF3C7'
        statusFont = 'FF854D0E'
      } else if (lastMcu.hasil === 'FIT') {
        statusMcu = 'FIT'
        statusColor = 'FFDCFCE7'
        statusFont = 'FF166534'
      } else {
        statusMcu = String(lastMcu.hasil || 'PENDING')
      }
    }

    // Masa berlaku color
    let masaBerlakuColor = 'FFFFFFFF'
    let masaBerlakuFont = 'FF000000'
    if (lastMcu?.tanggal_expired) {
      const expDate = new Date(lastMcu.tanggal_expired + 'T00:00:00')
      const todayDate = new Date(today + 'T00:00:00')
      const diffDays = Math.ceil((expDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays < 0) { masaBerlakuColor = 'FFDC2626'; masaBerlakuFont = 'FFFFFFFF' }
      else if (diffDays <= 30) { masaBerlakuColor = 'FFFEF3C7'; masaBerlakuFont = 'FF854D0E' }
      else { masaBerlakuColor = 'FFDCFCE7'; masaBerlakuFont = 'FF166534' }
    }

    const row = ws.getRow(idx + 5)
    row.getCell(1).value = idx + 1
    row.getCell(2).value = emp.nama

    // MCU 1-5
    for (let i = 0; i < MAX_MCU_COLUMNS; i++) {
      const cell = row.getCell(3 + i)
      cell.value = mcus[i] ? formatDate(mcus[i].tanggal_mcu) : ''
      cell.alignment = { horizontal: 'center' }
    }

    row.getCell(8).value = lastMcu ? formatDate(lastMcu.tanggal_mcu) : ''
    row.getCell(8).alignment = { horizontal: 'center' }

    row.getCell(9).value = lastMcu ? formatDate(lastMcu.tanggal_expired) : ''
    row.getCell(9).alignment = { horizontal: 'center' }
    if (lastMcu?.tanggal_expired) {
      row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: masaBerlakuColor } }
      row.getCell(9).font = { color: { argb: masaBerlakuFont }, bold: true }
    }

    // Status Karyawan
    row.getCell(10).value = emp.status_karyawan || 'Aktif'
    row.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }
    row.getCell(10).font = { color: { argb: 'FFFFFFFF' }, bold: true }
    row.getCell(10).alignment = { horizontal: 'center' }

    // Status MCU
    row.getCell(11).value = statusMcu
    row.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } }
    row.getCell(11).font = { color: { argb: statusFont }, bold: true }
    row.getCell(11).alignment = { horizontal: 'center' }

    // Border semua cell
    for (let c = 1; c <= 11; c++) {
      row.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      }
    }
  })

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `MONITORING_MCU_${siteLabel}_${today}.xlsx`.replace(/[^a-zA-Z0-9_.-]/g, '_')

  return new NextResponse(buffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    }
  })
}