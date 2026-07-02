import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const leaveId = searchParams.get('id')

  if (!leaveId) return NextResponse.json({ error: 'ID cuti required' }, { status: 400 })

  // Get leave data
  const { data: leave, error: leaveError } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('id', leaveId)
    .single()

  if (leaveError || !leave) {
    return NextResponse.json({ error: 'Data cuti tidak ditemukan' }, { status: 404 })
  }

  // Cek akses
  const isOwner = leave.nrp === session.nrp
  const isAtasan = leave.atasan_nrp === session.nrp
  const isPjo = leave.pjo_nrp === session.nrp
  const isAdminOrHrga = session.roles.includes('admin') || session.roles.includes('hrga')

  if (!(isOwner || isAtasan || isPjo || isAdminOrHrga)) {
    return NextResponse.json({ error: 'Tidak berhak melihat tracking ini' }, { status: 403 })
  }

  // Get employee data
  const { data: employee } = await supabase
    .from('employees')
    .select('nama, jabatan, departemen, site')
    .eq('nrp', leave.nrp)
    .single()

  // Get atasan & PJO name
  const { data: atasan } = await supabase
    .from('employees')
    .select('nama')
    .eq('nrp', leave.atasan_nrp)
    .single()

  const { data: pjo } = await supabase
    .from('employees')
    .select('nama')
    .eq('nrp', leave.pjo_nrp)
    .single()

  // Get approval logs
  const { data: logs } = await supabase
    .from('approval_logs')
    .select('*')
    .eq('leave_request_id', leaveId)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    leave,
    employee,
    atasan_nama: atasan?.nama || leave.atasan_nrp,
    pjo_nama: pjo?.nama || leave.pjo_nrp,
    logs: logs || []
  })
}