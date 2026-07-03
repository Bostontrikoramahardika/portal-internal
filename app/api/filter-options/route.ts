import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const table = searchParams.get('table') || 'employees'

  try {
    if (table === 'employees') {
      const { data } = await supabase
        .from('employees')
        .select('site, departemen, status_karyawan, jabatan')

      const sites = [...new Set((data || []).map(r => r.site).filter(Boolean))].sort()
      const departemens = [...new Set((data || []).map(r => r.departemen).filter(Boolean))].sort()
      const statuses = [...new Set((data || []).map(r => r.status_karyawan).filter(Boolean))].sort()
      const jabatans = [...new Set((data || []).map(r => r.jabatan).filter(Boolean))].sort()

      return NextResponse.json({ sites, departemens, statuses, jabatans })
    }

    if (table === 'pkwt') {
      const { data } = await supabase.from('pkwt').select('status')
      const statuses = [...new Set((data || []).map(r => r.status).filter(Boolean))].sort()
      return NextResponse.json({ statuses })
    }

    if (table === 'apd') {
      const { data } = await supabase.from('apd').select('kondisi')
      const kondisis = [...new Set((data || []).map(r => r.kondisi).filter(Boolean))].sort()
      return NextResponse.json({ kondisis })
    }

    if (table === 'sp') {
      return NextResponse.json({ jenis_sps: ['SP1', 'SP2', 'SP3', 'PHK'] })
    }

    if (table === 'roles') {
      return NextResponse.json({ roles: ['karyawan', 'atasan', 'pjo', 'hrga', 'admin'] })
    }

    return NextResponse.json({})

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}