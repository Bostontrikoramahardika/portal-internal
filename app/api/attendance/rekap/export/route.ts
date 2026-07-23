import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import ExcelJS from 'exceljs'

const SITE_ROLES   = ['hr_site','pjo_site','she_site']
const LEADER_ROLES = ['gl_produksi','gl_plant']

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session = auth.session

  if (session.role === 'employee') {
    return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const bulan = searchParams.get('bulan') || ''
  const site  = searchParams.get('site')  || ''
  const nama  = searchParams.get('nama')  || ''
  const nrp   = searchParams.get('nrp')   || ''
  const role  = searchParams.get('role')  || ''

  // Scope NRP
  let allowedNrps: string[] | null = null
  if (SITE_ROLES.includes(session.role)) {
    const { data: emp } = await supabaseAdmin
      .from('employees').select('nrp')
      .eq('site', session.site || '').eq('status', 'aktif')
    allowedNrps = (emp || []).map((e: any) => e.nrp)
  } else if (LEADER_ROLES.includes(session.role)) {
    const { data: bawahan } = await supabaseAdmin
      .from('approval_matrix').select('employee_nrp')
      .eq('approver_nrp', session.nrp)
    allowedNrps = (bawahan || []).map((b: any) => b.employee_nrp)
  }

  let nrpByRole: string[] | null = null
  if (role) {
    const { data: roleData } = await supabaseAdmin
      .from('roles').select('nrp').eq('role', role)
    nrpByRole = (roleData || []).map((r: any) => r.nrp)
  }

  // Query attendance (semua, tanpa pagination)
  let query = supabaseAdmin
    .from('attendance')
    .select(`id, nrp, tanggal, shift, clock_in, clock_out,
             jam_kerja_menit, terlambat_menit, status, keterangan, site`)

  if (bulan) {
    const [tahun, bln] = bulan.split('-')
    const y = parseInt(tahun), m = parseInt(bln)
    query = query
      .gte('tanggal', `${tahun}-${bln}-01`)
      .lte('tanggal', new Date(y, m, 0).toISOString().split('T')[0])
  }
  if (site) query = query.eq('site', site)
  else if (SITE_ROLES.includes(session.role)) query = query.eq('site', session.site || '')
  if (nrp)  query = query.eq('nrp', nrp)
  if (allowedNrps) query = query.in('nrp', allowedNrps)
  if (nrpByRole)   query = query.in('nrp', nrpByRole)

  query = query.order('tanggal', { ascending: true }).order('nrp', { ascending: true })

  const { data: attendanceData, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Join employees
  const nrpList = [...new Set((attendanceData || []).map((a: any) => a.nrp))]
  let employeeMap: Record<string, any> = {}
  if (nrpList.length > 0) {
    let empQuery = supabaseAdmin.from('employees')
      .select('nrp, nama, site, jabatan, departemen').in('nrp', nrpList)
    if (nama) empQuery = empQuery.ilike('nama', `%${nama}%`)
    const { data: empData } = await empQuery
    ;(empData || []).forEach((e: any) => { employeeMap[e.nrp] = e })
  }

  let rows = (attendanceData || []).map((a: any) => ({
    ...a,
    employee: employeeMap[a.nrp] || { nrp: a.nrp, nama: '-', site: a.site, jabatan: '-', departemen: '-' }
  }))
  if (nama) rows = rows.filter(r => r.employee.nama !== '-')

  // ── Build Excel ───────────────────────────────────────────
  const workbook  = new ExcelJS.Workbook()
  workbook.creator = 'BTM Portal'
  workbook.created = new Date()

  const ws = workbook.addWorksheet('Rekap Absensi', {
    pageSetup: { orientation: 'landscape', fitToPage: true }
  })

  const NAVY   = 'FF003D79'
  const WHITE  = 'FFFFFFFF'
  const STRIPE = 'FFF8FAFC'

  ws.columns = [
    { header: 'No',          key: 'no',          width: 5  },
    { header: 'NRP',         key: 'nrp',         width: 13 },
    { header: 'Nama',        key: 'nama',        width: 26 },
    { header: 'Site',        key: 'site',        width: 14 },
    { header: 'Jabatan',     key: 'jabatan',     width: 20 },
    { header: 'Departemen',  key: 'departemen',  width: 18 },
    { header: 'Tanggal',     key: 'tanggal',     width: 13 },
    { header: 'Shift',       key: 'shift',       width: 8  },
    { header: 'Clock In',    key: 'clock_in',    width: 11 },
    { header: 'Clock Out',   key: 'clock_out',   width: 11 },
    { header: 'Jam Kerja',   key: 'jam_kerja',   width: 11 },
    { header: 'Terlambat',   key: 'terlambat',   width: 11 },
    { header: 'Status',      key: 'status',      width: 18 },
    { header: 'Keterangan',  key: 'keterangan',  width: 32 },
    { header: 'Offline Sync',key: 'offline',     width: 12 },
  ]

  // Style header
  const headerRow = ws.getRow(1)
  headerRow.height = 32
  headerRow.eachCell(cell => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    cell.font   = { bold: true, color: { argb: WHITE }, size: 10, name: 'Calibri' }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: WHITE } },
      bottom: { style: 'thin', color: { argb: WHITE } },
      left: { style: 'thin', color: { argb: WHITE } },
      right: { style: 'thin', color: { argb: WHITE } },
    }
  })

  // Status color map
  const statusColor: Record<string, string> = {
    'HADIR':           'FF16A34A',
    'ALPHA':           'FFE11D48',
    'IZIN':            'FF2563EB',
    'SAKIT':           'FF7C3AED',
    'TIDAK CLOCK OUT': 'FFD97706',
    'LIBUR':           'FF64748B',
  }

  rows.forEach((row, idx) => {
    const emp = row.employee
    const fmtTime = (iso: string | null) => {
      if (!iso) return '-'
      return new Date(iso).toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit'
      })
    }
    const fmtJam = (m: number) => m ? `${Math.floor(m/60)}j ${m%60}m` : '-'

    const dataRow = ws.addRow({
      no:          idx + 1,
      nrp:         emp.nrp || row.nrp || '',
      nama:        emp.nama || '-',
      site:        emp.site || row.site || '',
      jabatan:     emp.jabatan || '-',
      departemen:  emp.departemen || '-',
      tanggal:     row.tanggal || '',
      shift:       row.shift || '-',
      clock_in:    fmtTime(row.clock_in),
      clock_out:   fmtTime(row.clock_out),
      jam_kerja:   fmtJam(row.jam_kerja_menit),
      terlambat:   row.terlambat_menit > 0 ? `${row.terlambat_menit} mnt` : '-',
      status:      row.status || '-',
      keterangan:  row.keterangan || '',
      offline:     row.is_offline_sync ? 'Ya' : 'Tidak',
    })

    dataRow.height = 20

    // Zebra stripe
    if (idx % 2 === 1) {
      dataRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STRIPE } }
      })
    }

    // Warna status
    const stCell = dataRow.getCell('status')
    const stColor = statusColor[row.status] || 'FF475569'
    stCell.font = { bold: true, color: { argb: stColor }, size: 10 }

    // Terlambat merah
    if (row.terlambat_menit > 0) {
      dataRow.getCell('terlambat').font = { bold: true, color: { argb: 'FFD97706' }, size: 10 }
    }

    dataRow.eachCell(cell => {
      cell.border = {
        top:    { style: 'hair', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
        left:   { style: 'hair', color: { argb: 'FFE2E8F0' } },
        right:  { style: 'hair', color: { argb: 'FFE2E8F0' } },
      }
      cell.alignment = { vertical: 'middle' }
    })
  })

  // ── Sheet Summary ─────────────────────────────────────────
  const ws2 = workbook.addWorksheet('Summary')
  const namaBulan = bulan
    ? new Date(bulan + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    : 'Semua Periode'

  ws2.addRow(['REKAP ABSENSI', namaBulan])
  ws2.getRow(1).font = { bold: true, size: 12, color: { argb: NAVY } }
  ws2.addRow([])

  const statusRows = [
    ['HADIR',           rows.filter(r => r.status === 'HADIR').length],
    ['ALPHA',           rows.filter(r => r.status === 'ALPHA').length],
    ['IZIN',            rows.filter(r => r.status === 'IZIN').length],
    ['SAKIT',           rows.filter(r => r.status === 'SAKIT').length],
    ['TIDAK CLOCK OUT', rows.filter(r => r.status === 'TIDAK CLOCK OUT').length],
    ['LIBUR',           rows.filter(r => r.status === 'LIBUR').length],
    ['TERLAMBAT',       rows.filter(r => (r.terlambat_menit || 0) > 0).length],
    ['TOTAL RECORDS',   rows.length],
  ]

  ws2.addRow(['STATUS', 'JUMLAH'])
  ws2.getRow(3).font = { bold: true }
  ws2.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
  ws2.getRow(3).font = { bold: true, color: { argb: WHITE } }

  statusRows.forEach(([s, n]) => {
    const r = ws2.addRow([s, n])
    if (s === 'TOTAL RECORDS') {
      r.font = { bold: true }
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } }
    }
  })

  ws2.columns = [{ width: 22 }, { width: 12 }]

  // Generate
  const buffer = await workbook.xlsx.writeBuffer()
  const fileLabel = bulan
    ? new Date(bulan + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).replace(' ', '_')
    : 'Semua'
  const filename = `Rekap_Absensi_${fileLabel}.xlsx`

  return new NextResponse(buffer as Buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    }
  })
}