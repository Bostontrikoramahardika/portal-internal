import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession } from '../../lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Cek MCU expired / akan expired
    const { data: mcuData } = await supabase
      .from('mcu')
      .select('id, nrp, nama_karyawan, tanggal_expired, hasil')
      .not('tanggal_expired', 'is', null)
      .lte('tanggal_expired', thirtyDaysFromNow.toISOString().split('T')[0])

    // Cek SIMPER expired / akan expired
    const { data: simperData } = await supabase
      .from('simper')
      .select('id, nrp, nama_karyawan, tanggal_expired, jenis_simper')
      .not('tanggal_expired', 'is', null)
      .lte('tanggal_expired', thirtyDaysFromNow.toISOString().split('T')[0])

    // Filter sesuai role
    // Karyawan: cuma lihat punya sendiri
    // HRGA/Admin: lihat semua
    const { data: roleData } = await supabase
      .from('roles')
      .select('role')
      .eq('nrp', session.nrp)
      .eq('active', true)
    const roles = roleData?.map((r: any) => r.role) || []
    const isStaff = roles.some((r: string) => ['hrga', 'admin', 'pjo', 'atasan'].includes(r))

    let mcuFiltered = mcuData || []
    let simperFiltered = simperData || []

    if (!isStaff) {
      mcuFiltered = mcuFiltered.filter((m: any) => m.nrp === session.nrp)
      simperFiltered = simperFiltered.filter((s: any) => s.nrp === session.nrp)
    }

    // Tambahkan info days_left
    const enrichExpired = (items: any[]) => items.map((item: any) => {
      const exp = new Date(item.tanggal_expired)
      const daysLeft = Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return { ...item, days_left: daysLeft, is_expired: daysLeft < 0 }
    })

    const mcuExpired = enrichExpired(mcuFiltered.filter((m: any) => new Date(m.tanggal_expired) < now))
    const mcuSoonExpired = enrichExpired(mcuFiltered.filter((m: any) => {
      const exp = new Date(m.tanggal_expired)
      return exp >= now && exp <= thirtyDaysFromNow
    }))

    const simperExpired = enrichExpired(simperFiltered.filter((s: any) => new Date(s.tanggal_expired) < now))
    const simperSoonExpired = enrichExpired(simperFiltered.filter((s: any) => {
      const exp = new Date(s.tanggal_expired)
      return exp >= now && exp <= thirtyDaysFromNow
    }))

    return NextResponse.json({
      mcu: {
        expired: mcuExpired,
        expiring_soon: mcuSoonExpired,
        total: mcuExpired.length + mcuSoonExpired.length,
      },
      simper: {
        expired: simperExpired,
        expiring_soon: simperSoonExpired,
        total: simperExpired.length + simperSoonExpired.length,
      },
      total_notifikasi: mcuExpired.length + mcuSoonExpired.length + simperExpired.length + simperSoonExpired.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}