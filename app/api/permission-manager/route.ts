// app/api/permission-manager/route.ts
// API untuk kelola permission karyawan (Khusus Super Admin)

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

// ============================================
// GET: Ambil daftar karyawan + master permissions
// ============================================
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    // 🔒 KEAMANAN: Hanya Super Admin yang boleh akses
    if (!session.is_super_admin) {
      return NextResponse.json({ error: 'Akses ditolak - hanya Super Admin' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const targetNrp = searchParams.get('nrp')

    // MODE 1: Kalau ada ?nrp=xxx → ambil detail permission karyawan tersebut
    if (targetNrp) {
      const { data: userPerms } = await supabase
        .from('user_permissions')
        .select('perm_key')
        .eq('nrp', targetNrp)

      const activeKeys = (userPerms || []).map(p => p.perm_key)

      return NextResponse.json({
        nrp: targetNrp,
        active_permissions: activeKeys
      })
    }

    // MODE 2: Ambil semua data untuk UI utama
    // 1. Semua karyawan aktif
    const { data: employees } = await supabase
      .from('employees')
      .select('nrp, nama, jabatan, site, departemen, is_super_admin')
      .eq('status_karyawan', 'Aktif')
      .order('nama', { ascending: true })

    // 2. Semua master permissions
    const { data: masterPerms } = await supabase
      .from('master_permissions')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    // 3. Semua user_permissions (untuk hitung per karyawan)
    const { data: allUserPerms } = await supabase
      .from('user_permissions')
      .select('nrp, perm_key')

    // Hitung jumlah permission per NRP
    const permCountMap = new Map<string, number>()
    ;(allUserPerms || []).forEach(up => {
      const current = permCountMap.get(up.nrp) || 0
      permCountMap.set(up.nrp, current + 1)
    })

    // Enrich employees dengan count permission
    const enrichedEmps = (employees || []).map(emp => ({
      ...emp,
      permission_count: permCountMap.get(emp.nrp) || 0
    }))

    return NextResponse.json({
      employees: enrichedEmps,
      master_permissions: masterPerms || [],
      total_permissions: masterPerms?.length || 0
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ============================================
// POST: Assign permission ke karyawan
// ============================================
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    // 🔒 KEAMANAN
    if (!session.is_super_admin) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const { nrp, perm_key } = body

    if (!nrp || !perm_key) {
      return NextResponse.json({ error: 'NRP dan perm_key wajib diisi' }, { status: 400 })
    }

    // Cek dulu apakah sudah ada
    const { data: existing } = await supabase
      .from('user_permissions')
      .select('id')
      .eq('nrp', nrp)
      .eq('perm_key', perm_key)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ message: 'Permission sudah aktif', existing: true })
    }

    // Insert baru
    const { error } = await supabase
      .from('user_permissions')
      .insert({
        nrp,
        perm_key,
        granted_by: session.nrp
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `Permission ${perm_key} berhasil diberikan ke ${nrp}`,
      success: true 
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ============================================
// DELETE: Cabut permission dari karyawan
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    // 🔒 KEAMANAN
    if (!session.is_super_admin) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const { nrp, perm_key } = body

    if (!nrp || !perm_key) {
      return NextResponse.json({ error: 'NRP dan perm_key wajib diisi' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_permissions')
      .delete()
      .eq('nrp', nrp)
      .eq('perm_key', perm_key)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `Permission ${perm_key} berhasil dicabut dari ${nrp}`,
      success: true 
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}