import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'
import { getWitaToday } from '@/app/lib/timezone'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

// ✅ PATCH v2.6 — Expand role whitelist
const canExport = 
  session.is_super_admin ||
  (session.roles || []).some((r: string) => 
    ['hr_ho', 'hr_site', 'hrga', 'hrga_pusat', 'hrga_site', 
     'admin', 'admin_site', 'pjo_site'].includes(r.toLowerCase())
  )

if (!canExport) {
  return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
}

  const { searchParams } = new URL(request.url)
  const tanggalMulai = searchParams.get('tanggal_mulai') || ''
  const tanggalSelesai = searchParams.get('tanggal_selesai') || ''
  const site = searchParams.get('site') || ''
  const nrp = searchParams.get('nrp') || ''
  const status = searchParams.get('status') || ''

  try {
    // Build query
    let query = supabase
      .from('attendance')
      .select('*')
      .order('tanggal', { ascending: false })
      .order('nrp', { ascending: true })

    if (tanggalMulai) query = query.gte('tanggal', tanggalMulai)
    if (tanggalSelesai) query = query.lte('tanggal', tanggalSelesai)
    if (site) query = query.eq('site', site)
    if (nrp) query = query.ilike('nrp', `%${nrp}%`)
    if (status) query = query.eq('status', status)

    const { data: attendances, error } = await query.limit(5000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!attendances || attendances.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data absensi dengan filter ini' }, { status: 404 })
    }

    // Ambil data karyawan untuk mapping nama
    const nrps = [...new Set(attendances.map(a => a.nrp))]
    const { data: employees } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site')
      .in('nrp', nrps)

    const empMap = new Map((employees || []).map(e => [e.nrp, e]))

    // Format data untuk Excel
    const excelData = attendances.map(a => {
      const emp = empMap.get(a.nrp) as any
      const clockIn = a.clock_in ? new Date(a.clock_in) : null
      const clockOut = a.clock_out ? new Date(a.clock_out) : null

      const jam = Math.floor((a.jam_kerja_menit || 0) / 60)
      const menit = (a.jam_kerja_menit || 0) % 60
      const jamKerjaFormat = a.jam_kerja_menit ? `${jam}j ${menit}m` : '-'

      return {
        'Tanggal': a.tanggal,
        'NRP': a.nrp,
        'Nama': emp?.nama || '-',
        'Jabatan': emp?.jabatan || '-',
        'Departemen': emp?.departemen || '-',
        'Site': a.site || emp?.site || '-',
        'Shift': a.shift || '-',
        'Clock In': clockIn ? clockIn.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
        'Clock Out': clockOut ? clockOut.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
        'Jam Kerja': jamKerjaFormat,
        'Terlambat (Menit)': a.terlambat_menit || 0,
        'Status': a.status,
        'Lokasi Clock In': a.clock_in_lokasi || '-',
        'Lokasi Clock Out': a.clock_out_lokasi || '-',
        'Keterangan': a.keterangan || '-'
      }
    })

    // Statistik
    const stats: any = {
      hadir: 0, terlambat: 0, setengah_hari: 0,
      alpha: 0, cuti: 0, sakit: 0, izin: 0
    }
    attendances.forEach(a => {
      const s = String(a.status).toLowerCase()
      if (stats[s] !== undefined) stats[s]++
    })

    // Buat workbook
    const wb = XLSX.utils.book_new()

    // Sheet 1: Data Absensi
    const ws = XLSX.utils.json_to_sheet(excelData)
    const headers = Object.keys(excelData[0] || {})
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 3, 15) }))

    // Style header
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_cell({ r: 0, c: C })
      if (ws[address]) {
        ws[address].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1E3A8A' } },
          alignment: { horizontal: 'center' }
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Data Absensi')

    // Sheet 2: Ringkasan & Filter
    const summaryData: any[][] = [
      ['📊 LAPORAN ABSENSI KARYAWAN', ''],
      ['PT. Boston Trikora Mahardika', ''],
      ['', ''],
      ['Tanggal Export', new Date().toLocaleString('id-ID')],
      ['Total Data', String(attendances.length)],
      ['', ''],
      ['🔍 Filter yang Digunakan:', ''],
      ['Tanggal Mulai', tanggalMulai || 'Semua'],
      ['Tanggal Selesai', tanggalSelesai || 'Semua'],
      ['Site', site || 'Semua'],
      ['NRP', nrp || 'Semua'],
      ['Status', status || 'Semua'],
      ['', ''],
      ['📈 Ringkasan Status:', ''],
      ['Hadir', String(stats.hadir)],
      ['Terlambat', String(stats.terlambat)],
      ['Setengah Hari', String(stats.setengah_hari)],
      ['Alpha', String(stats.alpha)],
      ['Cuti', String(stats.cuti)],
      ['Sakit', String(stats.sakit)],
      ['Izin', String(stats.izin)],
      ['', ''],
      ['📝 Catatan:', ''],
      ['File ini bisa dijadikan lampiran laporan bulanan', ''],
      ['atau data referensi untuk perhitungan KPI karyawan.', '']
    ]

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const fileName = `Laporan_Absensi_${tanggalMulai || 'all'}_sd_${tanggalSelesai || 'all'}_${getWitaToday()}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}