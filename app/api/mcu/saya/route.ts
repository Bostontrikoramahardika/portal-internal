// app/api/mcu/saya/route.ts v2.0
// Fix: tambah kolom rujukan_* di SELECT mcu_findings
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session = auth.session!

  const { data, error } = await supabaseAdmin
    .from('mcu')
    .select(`
      id, nrp, nama_karyawan, tanggal_mcu, jenis_mcu, hasil,
      dokter, rumah_sakit, tanggal_berlaku, tanggal_expired,
      status_mcu, butuh_followup, followup_deadline,
      foto_catatan_url, foto_catatan_name,
      mcu_findings(
        id, jenis_temuan, keterangan_temuan,
        status_followup, followup_file_url, followup_file_name,
        followup_keterangan, followup_submitted_at,
        verified_at, verified_status, verified_note,
        rujukan_file_url, rujukan_file_name, rujukan_uploaded_at
      )
    `)
    .eq('nrp', session.nrp)
    .order('tanggal_mcu', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data: data || [] })
}