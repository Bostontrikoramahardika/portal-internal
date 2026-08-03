// app/api/events/[id]/export/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const { id } = await params
    const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
    if (!event) return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 })

    const { data: attendances } = await supabase
      .from('event_attendances')
      .select('*')
      .eq('event_id', id)
      .order('scan_at', { ascending: true })

    const rows = (attendances || []).map((a: any, i: number) => ({
      No: i + 1,
      Nama: a.nama,
      NRP: a.nrp || '-',
      Jabatan: a.jabatan || '-',
      Perusahaan: a.perusahaan || 'Internal',
      'No HP': a.no_hp || '-',
      Peserta: a.is_tamu ? 'TAMU' : 'INTERNAL',
      'Waktu Hadir': new Date(a.scan_at).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })
    }))

    const info = [
      ['DAFTAR HADIR'],
      [],
      ['Nama Event', event.nama_event],
      ['Tanggal', event.tanggal],
      ['Jam', `${event.jam_mulai || '-'} - ${event.jam_selesai || '-'}`],
      ['Lokasi', event.lokasi || '-'],
      ['Site', event.site || '-'],
      ['Total Hadir', rows.length],
      [], []
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(info)
    XLSX.utils.sheet_add_json(ws, rows, { origin: 'A11', skipHeader: false })
    ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Hadir')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const fileName = `Daftar_Hadir_${event.nama_event.replace(/[^a-z0-9]/gi, '_')}_${event.tanggal}.xlsx`

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