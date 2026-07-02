import { supabase } from './supabase'
import { v4 as uuidv4 } from 'uuid'

export async function loginByNrp(nrp: string) {
  // 1. Cari karyawan
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('*')
    .eq('nrp', nrp)
    .eq('status_karyawan', 'Aktif')
    .single()

  if (empError || !employee) {
    throw new Error('NRP tidak terdaftar atau tidak aktif.')
  }

  // 2. Ambil roles
  const { data: roleRows } = await supabase
    .from('roles')
    .select('role')
    .eq('nrp', nrp)
    .eq('active', true)

  const roles = (roleRows || []).map(r => r.role)
  if (!roles.includes('karyawan')) roles.push('karyawan')

  // 3. Buat session token
  const token = uuidv4()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 8) // 8 jam

  const { error: sessError } = await supabase
    .from('sessions')
    .insert({
      token,
      nrp,
      roles,
      expires_at: expiresAt.toISOString()
    })

  if (sessError) throw new Error('Gagal membuat session.')

  return {
    token,
    nrp,
    nama: employee.nama,
    roles,
    primaryRole: getPrimaryRole(roles)
  }
}

export async function getSession(token: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('token', token)
    .gte('expires_at', new Date().toISOString())
    .single()

  if (error || !data) return null

  const { data: emp } = await supabase
    .from('employees')
    .select('nama')
    .eq('nrp', data.nrp)
    .single()

  return {
    token: data.token,
    nrp: data.nrp,
    nama: emp?.nama || data.nrp,
    roles: data.roles,
    primaryRole: getPrimaryRole(data.roles)
  }
}

export async function logout(token: string) {
  await supabase.from('sessions').delete().eq('token', token)
}

function getPrimaryRole(roles: string[]): string {
  const priority = ['hrga', 'pjo', 'admin', 'atasan', 'karyawan']
  for (const r of priority) {
    if (roles.includes(r)) return r
  }
  return 'karyawan'
}