import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

// ============================================================
// GET: Ambil statistik live user online + config global
// ============================================================
export async function GET(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const session = await getSession(token)
  if (!session?.is_super_admin) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  try {
    // User dianggap ONLINE jika session belum expired
    // DAN login dalam 8 jam terakhir
    const now = new Date().toISOString()
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()

    // 1. Ambil semua session yang masih aktif
    const { data: activeSessions, error: sessionError } = await supabase
      .from('sessions')
       .select('nrp, created_at, expires_at')
      .gte('expires_at', now)
      .gte('created_at', eightHoursAgo)
      .not('nrp', 'is', null)

    if (sessionError) throw sessionError

    // 2. Ambil detail karyawan yang online (unique NRP)
    const uniqueNrps = Array.from(
      new Set((activeSessions || []).map((s: any) => s.nrp).filter(Boolean))
    )

    let onlineUsers: any[] = []
    if (uniqueNrps.length > 0) {
      const { data: empData } = await supabase
        .from('employees')
        .select('nrp, nama, jabatan, site')
        .in('nrp', uniqueNrps)

      onlineUsers = (empData || []).map((emp: any) => {
        const sess = (activeSessions || [])
          .filter((s: any) => s.nrp === emp.nrp)
          .sort((a: any, b: any) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          )[0]
        return {
          ...emp,
          last_active: sess?.created_at || null
        }
      })

      onlineUsers.sort((a: any, b: any) => {
        const timeA = a.last_active ? new Date(a.last_active).getTime() : 0
        const timeB = b.last_active ? new Date(b.last_active).getTime() : 0
        return timeB - timeA
      })
    }

    // 3. Hitung total karyawan aktif
    const { count: totalKaryawan } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('status_karyawan', 'Aktif')

    // 4. Hitung total sesi login hari ini
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { count: sessionHariIni } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())
      .not('nrp', 'is', null)

    return NextResponse.json({
      stats: {
        online_now: onlineUsers.length,
        total_karyawan: totalKaryawan || 0,
        session_hari_ini: sessionHariIni || 0,
      },
      online_users: onlineUsers,
    })
  } catch (err: any) {
    console.error('system-config GET error:', err)
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST: Eksekusi aksi (broadcast / force logout)
// ============================================================
export async function POST(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const session = await getSession(token)
  if (!session?.is_super_admin) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { action, payload } = body

    // --- AKSI 1: BROADCAST NOTIFIKASI ---
    if (action === 'broadcast') {
      const { judul, pesan, is_urgent, images } = payload
      if (!judul || !pesan) {
        return NextResponse.json(
          { error: 'Judul dan pesan wajib diisi' },
          { status: 400 }
        )
      }

      const imageArray = Array.isArray(images) ? images : []
      const { error } = await supabase.from('announcements').insert({
        title: judul,
        content: pesan,
        is_urgent: is_urgent || false,
        created_by: session.nrp,
        active: true,
        image_url: imageArray.length > 0 ? imageArray[0] : null,
        images: imageArray,
      })

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: `✅ Broadcast "${judul}" berhasil dikirim ke semua user`
      })
    }

    // --- AKSI 2: FORCE LOGOUT SEMUA USER ---
    if (action === 'force_logout_all') {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .neq('nrp', session.nrp)
        .not('nrp', 'is', null)

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: `✅ Force logout berhasil. Semua user telah dikeluarkan dari sistem.`
      })
    }

    return NextResponse.json(
      { error: 'Aksi tidak dikenali' },
      { status: 400 }
    )
  } catch (err: any) {
    console.error('system-config POST error:', err)
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    )
  }
}