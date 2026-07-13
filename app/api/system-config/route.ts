import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession } from '@/app/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================
// GET: Ambil statistik live user online + config global
// ============================================================
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.is_super_admin) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  try {
    // 1. Hitung user online (session aktif dalam 15 menit terakhir)
    const fifteenMinutesAgo = new Date(
      Date.now() - 15 * 60 * 1000
    ).toISOString()

    const { data: activeSessions, error: sessionError } = await supabase
      .from('sessions')
      .select('nrp, last_active, expires_at')
      .gte('last_active', fifteenMinutesAgo)

    if (sessionError) throw sessionError

    // 2. Ambil detail karyawan yang online
    const activeNrps = activeSessions?.map((s: any) => s.nrp) || []

    let onlineUsers: any[] = []
    if (activeNrps.length > 0) {
      const { data: empData } = await supabase
        .from('employees')
        .select('nrp, nama, jabatan, site')
        .in('nrp', activeNrps)

      // Gabungkan data session + karyawan
      onlineUsers = (empData || []).map((emp: any) => {
        const sess = activeSessions?.find((s: any) => s.nrp === emp.nrp)
        return {
          ...emp,
          last_active: sess?.last_active || null
        }
      })
    }

    // 3. Hitung total karyawan
    const { count: totalKaryawan } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('status_karyawan', 'Aktif')

    // 4. Hitung total session hari ini
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { count: sessionHariIni } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true })
      .gte('last_active', todayStart.toISOString())

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
  const session = await getSession()
  if (!session?.is_super_admin) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { action, payload } = body

    // --- AKSI 1: BROADCAST NOTIFIKASI ---
    if (action === 'broadcast') {
      const { judul, pesan, is_urgent } = payload
      if (!judul || !pesan) {
        return NextResponse.json(
          { error: 'Judul dan pesan wajib diisi' },
          { status: 400 }
        )
      }

      // Simpan ke tabel announcements sebagai broadcast global
      const { error } = await supabase.from('announcements').insert({
        title: judul,
        content: pesan,
        is_urgent: is_urgent || false,
        created_by: session.nrp,
        target_site: 'ALL', // Broadcast ke semua site
        is_active: true,
      })

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: `✅ Broadcast "${judul}" berhasil dikirim ke semua user`
      })
    }

    // --- AKSI 2: FORCE LOGOUT SEMUA USER ---
    if (action === 'force_logout_all') {
      // Hapus semua session kecuali milik Ricky (agar tidak ikut ter-logout)
      const { error, count } = await supabase
        .from('sessions')
        .delete()
        .neq('nrp', session.nrp) // Jangan hapus session Ricky

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