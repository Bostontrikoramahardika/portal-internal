import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session?.is_super_admin) {
    return NextResponse.json({ error: 'Akses ditolak. Hanya Super Admin.' }, { status: 403 })
  }

  try {
    const { nrp, mode, custom_password } = await req.json()

    if (!nrp) {
      return NextResponse.json({ error: 'NRP wajib diisi' }, { status: 400 })
    }

    // Cek karyawan ada
    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select('nrp, nama, password, site')
      .eq('nrp', nrp)
      .single()

    if (empError || !emp) {
      return NextResponse.json({ error: `Karyawan NRP ${nrp} tidak ditemukan` }, { status: 404 })
    }

    // Tentukan password baru
    let newPassword = ''

    if (mode === 'reset_to_nrp') {
      newPassword = String(emp.nrp).trim()
    } else if (mode === 'custom' && custom_password) {
      if (custom_password.length < 4) {
        return NextResponse.json({ error: 'Password minimal 4 karakter' }, { status: 400 })
      }
      newPassword = String(custom_password).trim()
    } else {
      return NextResponse.json({ error: 'Mode reset tidak valid' }, { status: 400 })
    }

    // Update password di database
    const { error: updateError } = await supabase
      .from('employees')
      .update({ password: newPassword })
      .eq('nrp', nrp)

    if (updateError) throw updateError

    // Hapus semua session karyawan tersebut (force re-login)
    await supabase
      .from('sessions')
      .delete()
      .eq('nrp', nrp)

    return NextResponse.json({
      success: true,
      message: `✅ Password ${emp.nama} (${emp.nrp}) berhasil direset. User akan diminta login ulang.`,
      reset_to: mode === 'reset_to_nrp' ? 'NRP' : 'Custom'
    })
  } catch (err: any) {
    console.error('Reset password error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}