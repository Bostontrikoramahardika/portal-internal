// app/api/kelola-akses/route.ts — v1.0
// API terpusat untuk kelola role + permission per karyawan
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// ═══ GET — List karyawan + role + permission ═══
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []

  const allowed = ['super_admin', 'hr_ho', 'director_ops', 'business_dev', 'manager_ops', 'spv_she_ho']
  if (!allowed.some(r => userRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const site = searchParams.get('site') || ''
  const roleFilter = searchParams.get('role') || ''
  const targetNrp = searchParams.get('nrp') || ''
  const limit = Math.min(Number(searchParams.get('limit') || '50'), 200)

  // ═══ MODE 1: Detail 1 karyawan (kalau ada ?nrp=xxx) ═══
  if (targetNrp) {
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site, no_hp, email, tanggal_resign, is_super_admin')
      .eq('nrp', targetNrp)
      .single()

    if (!emp) return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 })

    // Ambil roles
    const { data: rolesData } = await supabaseAdmin
      .from('roles')
      .select('role, created_at')
      .eq('nrp', targetNrp)
      .order('created_at')

    // Ambil permissions granular
    const { data: permsData } = await supabaseAdmin
      .from('user_permissions')
      .select('perm_key, created_at')
      .eq('nrp', targetNrp)

    // Ambil master permission info
    const permKeys = (permsData || []).map(p => p.perm_key)
    let permDetails: any[] = []
    if (permKeys.length > 0) {
      const { data: masterPerms } = await supabaseAdmin
        .from('master_permissions')
        .select('perm_key, deskripsi')
        .in('perm_key', permKeys)
      permDetails = masterPerms || []
    }

    return NextResponse.json({
      ok: true,
      mode: 'detail',
      employee: emp,
      roles: (rolesData || []).map(r => r.role),
      permissions: (permsData || []).map(p => ({
        perm_key: p.perm_key,
        deskripsi: permDetails.find(d => d.perm_key === p.perm_key)?.deskripsi || null,
        assigned_at: p.created_at
      }))
    })
  }

  // ═══ MODE 2: List semua karyawan (aggregate) ═══
  
  // 🔒 CHAT 25: Cek viewer apakah super_admin (untuk filter role rahasia)
  const isSuperAdmin = userRoles.includes('super_admin')

  let empQuery = supabaseAdmin
    .from('employees')
    .select('nrp, nama, jabatan, departemen, site, is_super_admin, tanggal_resign, google_access_enabled, google_email, google_connected_at')
    .is('tanggal_resign', null)
    .order('nama')
    .limit(limit)

  if (site) empQuery = empQuery.eq('site', site)
  if (search) empQuery = empQuery.or(`nama.ilike.%${search}%,nrp.ilike.%${search}%`)

  const { data: employees } = await empQuery

  if (!employees || employees.length === 0) {
    return NextResponse.json({ ok: true, mode: 'list', data: [], total: 0 })
  }

  // Ambil semua roles untuk karyawan yang muncul
  const empNrps = employees.map(e => e.nrp)
  const { data: allRoles } = await supabaseAdmin
    .from('roles')
    .select('nrp, role')
    .in('nrp', empNrps)

  const { data: allPerms } = await supabaseAdmin
    .from('user_permissions')
    .select('nrp, perm_key')
    .in('nrp', empNrps)

  // Build map
  const rolesMap: Record<string, string[]> = {}
  for (const r of allRoles || []) {
    // 🔒 CHAT 25: Filter role super_admin kalau viewer bukan super_admin
    if (!isSuperAdmin && r.role === 'super_admin') continue
    if (!rolesMap[r.nrp]) rolesMap[r.nrp] = []
    rolesMap[r.nrp].push(r.role)
  }
  const permsMap: Record<string, string[]> = {}
  for (const p of allPerms || []) {
    if (!permsMap[p.nrp]) permsMap[p.nrp] = []
    permsMap[p.nrp].push(p.perm_key)
  }

  // Enrich data
  const result = employees.map(e => ({
    ...e,
    // 🔒 CHAT 25: Sembunyikan flag is_super_admin kalau viewer bukan super_admin
    is_super_admin: isSuperAdmin ? e.is_super_admin : false,
    roles: rolesMap[e.nrp] || [],
    permissions_count: (permsMap[e.nrp] || []).length,
    permissions: permsMap[e.nrp] || []
  }))

  // Filter by role (setelah aggregate)
  const filtered = roleFilter
    ? result.filter(r => r.roles.includes(roleFilter))
    : result

  // ═══ Ambil daftar role & site & master permissions untuk dropdown ═══
  // 🔒 Guard: cuma super_admin yang boleh lihat/assign role 'super_admin'

  let roleQuery = supabaseAdmin
    .from('role_templates')
    .select('role_key, role_label, role_desc, level, active')
    .eq('active', true)
    .order('level')

  // 🔒 super_admin selalu di-hide dari dropdown (assign manual via SQL)
  roleQuery = roleQuery.neq('role_key', 'super_admin')

  const { data: allRoleList } = await roleQuery

  const { data: allSites } = await supabaseAdmin
    .from('sites_config')
    .select('kode_site, nama_site')
    .eq('active', true)

  const { data: allMasterPerms } = await supabaseAdmin
    .from('master_permissions')
    .select('perm_key, deskripsi')
    .order('perm_key')

  return NextResponse.json({
    ok: true,
    mode: 'list',
    data: filtered,
    total: filtered.length,
    role_list: allRoleList || [],
    site_list: allSites || [],
    master_permissions: allMasterPerms || []
  })
}

// ═══ POST — Add/Remove role atau permission ═══
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []

  const allowed = ['super_admin', 'hr_ho', 'director_ops', 'business_dev', 'manager_ops', 'spv_she_ho']
  if (!allowed.some(r => userRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const body = await req.json()
  const { action, target_nrp, role, perm_key } = body
  // action: ADD_ROLE, REMOVE_ROLE, ADD_PERM, REMOVE_PERM

  if (!action || !target_nrp) {
    return NextResponse.json({ error: 'action dan target_nrp wajib' }, { status: 400 })
  }

      // 🔒 Extra guard: kalau target adalah super_admin dan user bukan super_admin → tolak
    const isTargetSuper = target_nrp === session.nrp && userRoles.includes('super_admin')
    if (action === 'REMOVE_ROLE' && role === 'super_admin' && !userRoles.includes('super_admin')) {
      return NextResponse.json({ error: 'Hanya super_admin yang boleh copot role super_admin' }, { status: 403 })
    }

  // ═══ Guard: super_admin cuma boleh dikelola super_admin ═══
  if (role === 'super_admin' && !userRoles.includes('super_admin')) {
    return NextResponse.json({ error: 'Hanya super_admin yang boleh assign super_admin' }, { status: 403 })
  }

  // ═══ Guard: tidak boleh copot super_admin dari diri sendiri ═══
  if (action === 'REMOVE_ROLE' && role === 'super_admin' && target_nrp === session.nrp) {
    return NextResponse.json({ error: 'Tidak boleh copot super_admin dari diri sendiri' }, { status: 400 })
  }

  const auditBy = session.nrp

  try {
    if (action === 'ADD_ROLE') {
      if (!role) return NextResponse.json({ error: 'role wajib' }, { status: 400 })
      
      // Cek duplikat
      const { data: existing } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('nrp', target_nrp)
        .eq('role', role)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: `Karyawan sudah punya role ${role}` }, { status: 409 })
      }

      // 1. Insert role ke tabel roles
      const { error: roleErr } = await supabaseAdmin
        .from('roles')
        .insert({ nrp: target_nrp, role })

      if (roleErr) return NextResponse.json({ error: roleErr.message }, { status: 500 })

      // 🆕 2. AUTO-COPY permission dari role_templates → user_permissions
      const { data: templatePerms } = await supabaseAdmin
        .from('role_template_permissions')
        .select('perm_key')
        .eq('role_key', role)

      const templatePermList = templatePerms || []
      let permsAdded = 0
      
      if (templatePermList.length > 0) {
        // Ambil permission yang sudah dimiliki user (biar tidak duplikat)
        const { data: existingPerms } = await supabaseAdmin
          .from('user_permissions')
          .select('perm_key')
          .eq('nrp', target_nrp)
        
        const existingSet = new Set((existingPerms || []).map(p => p.perm_key))
        const newPerms = templatePermList
          .filter(p => !existingSet.has(p.perm_key))
          .map(p => ({ 
            nrp: target_nrp, 
            perm_key: p.perm_key, 
            granted_by: auditBy 
          }))
        
        if (newPerms.length > 0) {
          const { error: permErr } = await supabaseAdmin
            .from('user_permissions')
            .insert(newPerms)
          
          if (permErr) {
            // Role sudah masuk tapi permission gagal → log warning, JANGAN rollback
            console.error('⚠️ Role added but some permissions failed:', permErr.message)
          } else {
            permsAdded = newPerms.length
          }
        }
      }

      return NextResponse.json({ 
        ok: true, 
        message: `Role ${role} ditambahkan${permsAdded > 0 ? ` + ${permsAdded} permission auto-assigned` : ''}` 
      })
    }

    if (action === 'REMOVE_ROLE') {
      if (!role) return NextResponse.json({ error: 'role wajib' }, { status: 400 })

      const { error } = await supabaseAdmin
        .from('roles')
        .delete()
        .eq('nrp', target_nrp)
        .eq('role', role)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, message: `Role ${role} dihapus` })
    }

    if (action === 'ADD_PERM') {
      if (!perm_key) return NextResponse.json({ error: 'perm_key wajib' }, { status: 400 })

      const { data: existing } = await supabaseAdmin
        .from('user_permissions')
        .select('id')
        .eq('nrp', target_nrp)
        .eq('perm_key', perm_key)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: `Karyawan sudah punya permission ${perm_key}` }, { status: 409 })
      }

      const { error } = await supabaseAdmin
        .from('user_permissions')
        .insert({ nrp: target_nrp, perm_key })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, message: `Permission ${perm_key} ditambahkan` })
    }

    if (action === 'REMOVE_PERM') {
      if (!perm_key) return NextResponse.json({ error: 'perm_key wajib' }, { status: 400 })

      const { error } = await supabaseAdmin
        .from('user_permissions')
        .delete()
        .eq('nrp', target_nrp)
        .eq('perm_key', perm_key)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, message: `Permission ${perm_key} dihapus` })
    }

    return NextResponse.json({ error: 'action tidak valid' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 })
  }
}