import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

const ALLOWED_ROLES = [
  'super_admin', 'hr_ho', 'director_ops',
  'business_dev', 'manager_ops', 'spv_she_ho',
]

// GET — list templates + permissions per template
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

    const session: any = auth.session!
    const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
    if (!userRoles.some(r => ALLOWED_ROLES.includes(r))) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    // Get all active templates (exclude super_admin from non-super_admin)
    const isSuperAdmin = userRoles.includes('super_admin')
    let tplQuery = supabaseAdmin
      .from('role_templates')
      .select('role_key, role_label, role_desc, level, scope, active')
      .eq('active', true)
      .order('level', { ascending: true })

    // 🔒 super_admin SELALU hidden dari UI (assign hanya via SQL)
    tplQuery = tplQuery.neq('role_key', 'super_admin')

    const { data: templates, error: tplErr } = await tplQuery

    if (tplErr) {
      return NextResponse.json({ error: tplErr.message }, { status: 500 })
    }

    // Get all template permissions
    const { data: allPerms, error: permErr } = await supabaseAdmin
      .from('role_template_permissions')
      .select('role_key, perm_key')

    if (permErr) {
      return NextResponse.json({ error: permErr.message }, { status: 500 })
    }

    // Group permissions by role_key
    const permMap: Record<string, string[]> = {}
    for (const p of (allPerms || [])) {
      if (!permMap[p.role_key]) permMap[p.role_key] = []
      permMap[p.role_key].push(p.perm_key)
    }

    const data = (templates || []).map(t => ({
      ...t,
      permissions: permMap[t.role_key] || [],
      permissions_count: (permMap[t.role_key] || []).length,
    }))

    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}

// POST — apply template to employee
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

    const session: any = auth.session!
    const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
    if (!userRoles.some(r => ALLOWED_ROLES.includes(r))) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await req.json()
    const { target_nrp, role_key } = body

    if (!target_nrp || !role_key) {
      return NextResponse.json({ error: 'target_nrp dan role_key wajib diisi' }, { status: 400 })
    }

    // Guard: super_admin template only by super_admin
    if (role_key === 'super_admin' && !userRoles.includes('super_admin')) {
      return NextResponse.json({ error: 'Tidak memiliki akses' }, { status: 403 })
    }

    // Verify employee exists
    const { data: emp, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('nrp, nama')
      .eq('nrp', target_nrp)
      .is('tanggal_resign', null)
      .single()

    if (empErr || !emp) {
      return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 })
    }

    // Verify template exists
    const { data: tpl, error: tplErr } = await supabaseAdmin
      .from('role_templates')
      .select('role_key, role_label')
      .eq('role_key', role_key)
      .eq('active', true)
      .single()

    if (tplErr || !tpl) {
      return NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 })
    }

    // Get template permissions
    const { data: tplPerms } = await supabaseAdmin
      .from('role_template_permissions')
      .select('perm_key')
      .eq('role_key', role_key)

    const permKeys = (tplPerms || []).map(p => p.perm_key)

    // Get existing roles & permissions for this employee
    const [existRolesRes, existPermsRes] = await Promise.all([
      supabaseAdmin.from('roles').select('role').eq('nrp', target_nrp),
      supabaseAdmin.from('user_permissions').select('perm_key').eq('nrp', target_nrp),
    ])

    const existingRoles = new Set((existRolesRes.data || []).map(r => r.role))
    const existingPerms = new Set((existPermsRes.data || []).map(p => p.perm_key))

    let rolesAdded = 0
    let permsAdded = 0

    // Add role if not exists
    if (!existingRoles.has(role_key)) {
      const { error: roleErr } = await supabaseAdmin
        .from('roles')
        .insert({ nrp: target_nrp, role: role_key })

      if (roleErr && !roleErr.message.includes('duplicate')) {
        return NextResponse.json({ error: `Gagal tambah role: ${roleErr.message}` }, { status: 500 })
      }
      if (!roleErr) rolesAdded = 1
    }

    // Add permissions that don't exist yet
    const newPerms = permKeys.filter(pk => !existingPerms.has(pk))
    if (newPerms.length > 0) {
      const rows = newPerms.map(pk => ({ nrp: target_nrp, perm_key: pk }))
      const { error: permInsertErr } = await supabaseAdmin
        .from('user_permissions')
        .upsert(rows, { onConflict: 'nrp,perm_key', ignoreDuplicates: true })

      if (permInsertErr) {
        return NextResponse.json({ error: `Gagal tambah permissions: ${permInsertErr.message}` }, { status: 500 })
      }
      permsAdded = newPerms.length
    }

    return NextResponse.json({
      ok: true,
      message: `Template "${tpl.role_label}" diterapkan ke ${emp.nama}. Role +${rolesAdded}, Permission +${permsAdded}.`,
      detail: {
        target_nrp,
        target_nama: emp.nama,
        template: role_key,
        roles_added: rolesAdded,
        permissions_added: permsAdded,
        permissions_skipped: permKeys.length - permsAdded,
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}
