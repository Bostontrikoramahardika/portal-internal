import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const { password_lama, password_baru, password_konfirmasi } = await request.json()

    // Validasi input
    if (!password_lama || !password_baru || !password_konfirmasi) {
      return NextResponse.json({ error: 'Semua kolom wajib diisi' }, { status: 400 })
    }

    if (password_baru.length < 4) {
      return NextResponse.json({ error: 'Password baru minimal 4 karakter' }, { status: 400 })
    }

    if (password_baru !== password_konfirmasi) {
      return NextResponse.json({ error: 'Konfirmasi password tidak cocok' }, { status: 400 })
    }

    if (password_lama === password_baru) {
      return NextResponse.json({ error: 'Password baru tidak boleh sama dengan password lama' }, { status: 400 })
    }

    // Ambil data karyawan
    const { data: employee } = await supabase
      .from('employees')
      .select('nrp, password')
      .eq('nrp', session.nrp)
      .single()

    if (!employee) {
      return NextResponse.json({ error: 'Data karyawan tidak ditemukan' }, { status: 404 })
    }

    // Validasi password lama
    if (String(employee.password).trim() !== String(password_lama).trim()) {
      return NextResponse.json({ error: 'Password lama salah' }, { status: 401 })
    }

    // Update password baru
    const { error: updateError } = await supabase
      .from('employees')
      .update({ 
        password: password_baru.trim(),
        password_last_changed: new Date().toISOString()
      })
      .eq('nrp', session.nrp)

    if (updateError) {
      return NextResponse.json({ error: 'Gagal update password: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Password berhasil diubah. Silakan login ulang dengan password baru.' 
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}