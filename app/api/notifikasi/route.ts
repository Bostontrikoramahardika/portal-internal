import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date().toISOString().split('T')[0]
    const nextMonth = new Date()
    nextMonth.setDate(nextMonth.getDate() + 30)
    const dateLimit = nextMonth.toISOString().split('T')[0]

    // 1. HITUNG DOKUMEN EXPIRED (Milik Sendiri)
    const { data: mcu } = await supabase.from('mcu').select('id').eq('nrp', session.nrp).lte('tanggal_expired', dateLimit)
    const { data: simper } = await supabase.from('simper').select('id').eq('nrp', session.nrp).lte('tanggal_expired', dateLimit)
    const { data: pkwt } = await supabase.from('pkwt').select('id').eq('nrp', session.nrp).lte('tanggal_berakhir', dateLimit)
    
    const totalExpired = (mcu?.length || 0) + (simper?.length || 0) + (pkwt?.length || 0)

    // 2. HITUNG PENDING APPROVAL (Jika user adalah Atasan/PJO)
    let totalPending = 0
    const roles = (session.roles || []).map((r: string) => r.toLowerCase())
    const isApprover = roles.some(r => ['atasan', 'pjo', 'hrga_site', 'admin_site'].includes(r))

    if (isApprover) {
      const [cuti, lembur, sakit] = await Promise.all([
        supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('atasan_nrp', session.nrp).eq('status_atasan', 'PENDING'),
        supabase.from('overtime_requests').select('id', { count: 'exact', head: true }).eq('atasan_nrp', session.nrp).eq('status_atasan', 'PENDING'),
        supabase.from('attendance_evidences').select('id', { count: 'exact', head: true }).eq('atasan_nrp', session.nrp).eq('status_atasan', 'PENDING')
      ])
      totalPending = (cuti.count || 0) + (lembur.count || 0) + (sakit.count || 0)
    }

    return NextResponse.json({
      total_expired: totalExpired,
      total_pending: totalPending,
      total_notifikasi: totalExpired + totalPending
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}