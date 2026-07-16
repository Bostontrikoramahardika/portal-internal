import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import { logAudit } from '@/app/lib/auditLog'

// ═══════════════════════════════════════════════
// 🔐 ACCESS CONTROL
// ═══════════════════════════════════════════════
// Role yang boleh kelola assignment role karyawan
const ROLE_MANAGER_ROLES = [
  'super_admin',
  'hr_ho',
  'hr_site',           // ✅ Tambah ini
  // Legacy (backward compat)
  'hrga', 'hrga_oprek', 'hrga_site', 'hrga_pusat'
]

function canManageRoles(session: any): boolean {
  if (session?.is_super_admin) return true
  
  // ✅ Cek permission role_assign (lebih fleksibel)
  const permissions = session?.permissions || []
  if (permissions.includes('role_assign')) return true
  
  // 🔙 Fallback: cek role
  return (session?.roles || []).some((r: string) => ROLE_MANAGER_ROLES.includes(r))
}

function canManageRoles(session: any): boolean {
  if (session?.is_super_admin) return true
  return (session?.roles || []).some((r: string) => ROLE_MANAGER_ROLES.includes(r))
}

// ═══════════════════════════════════════════════
// GET - Ambil semua karyawan + role-nya
// ═══════════════════════════════════════════════
export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  if (!canManageRoles(session)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const filterSite = searchParams.get('site') || ''
  const filterRole = searchParams.get('role') || ''
  const filterStatus = searchParams.get('status') || '' // 'has_role' | 'no_role'

  // ─── 1. Ambil karyawan aktif ───
  let query = supabase
    .from('employees')
    .select('nrp, nama, jabatan, departemen, site, status_karyawan')
    .eq('status_karyawan', 'Aktif')
    .order('nama')

  if (search) query = query.or(`nama.ilike.%${search}%,nrp.ilike.%${search}%`)
  if (filterSite) query = query.eq('site', filterSite)

  const { data: employees, error } = await query.limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ─── 2. Ambil semua roles aktif ───
  const { data: allRoles } = await supabase
    .from('roles')
    .select('nrp, role, scope_site')
    .eq('active', true)

  const rolesByNrp = new Map<string, any[]>()
  ;(allRoles || []).forEach((r: any) => {
    const nrp = String(r.nrp)
    if (!rolesByNrp.has(nrp)) rolesByNrp.set(nrp, [])
    rolesByNrp.get(nrp)!.push({ role: r.role, scope_site: r.scope_site })
  })

  // ─── 3. Ambil daftar site ───
  const { data: sitesData } = await supabase
    .from('employees')
    .select('site')
    .eq('status_karyawan', 'Aktif')
  const sites = [...new Set((sitesData || []).map(s => s.site).filter(Boolean))].sort()

  // ─── 4. Ambil role templates untuk dropdown ───
  const { data: templates } = await supabase
    .from('role_templates')
    .select('role_key, role_label, level, scope')
    .eq('active', true)
    .order('level')

  // ─── 5. Enrich data karyawan dengan roles ───
  let result = (employees || []).map((emp: any) => {
    const empRoles = rolesByNrp.get(String(emp.nrp)) || []
    return {
      ...emp,
      roles: empRoles.map(r => r.role),
      role_details: empRoles,
      has_role: empRoles.length > 0
    }
  })

  // Filter status role
  if (filterStatus === 'has_role') result = result.filter(e => e.has_role)
  if (filterStatus === 'no_role') result = result.filter(e => !e.has_role)
  if (filterRole) result = result.filter(e => e.roles.includes(filterRole))

  return NextResponse.json({
    employees: result,
    sites,
    templates: templates || [],
    stats: {
      total_karyawan: (employees || []).length,
      punya_role: (employees || []).filter((e: any) => rolesByNrp.has(String(e.nrp))).length,
      tanpa_role: (employees || []).filter((e: any) => !rolesByNrp.has(String(e.nrp))).length,
      filtered: result.length
    }
  })
}

// ═══════════════════════════════════════════════
// POST - Assign / Remove Role (single atau batch)
// ═══════════════════════════════════════════════
export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  if (!canManageRoles(session)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { mode, nrp, nrps, role, scope_site, action, replace_existing } = body

    // Ambil VALID_ROLES dinamis dari role_templates
    const { data: templates } = await supabase
      .from('role_templates')
      .select('role_key')
      .eq('active', true)

    const VALID_ROLES = [
      ...(templates || []).map((t: any) => t.role_key),
      // Legacy support
      'karyawan', 'atasan', 'pjo', 'admin', 'hrga',
      'hrga_oprek', 'hrga_site', 'hrga_pusat'
    ]

    // ═══════════════════════════════════════════
    // MODE: SINGLE (backward compatible)
    // ═══════════════════════════════════════════
    if (!mode || mode === 'single') {
      if (!nrp || !role || !['assign', 'remove'].includes(action)) {
        return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
      }
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json({ error: `Role "${role}" tidak valid` }, { status: 400 })
      }

      if (action === 'assign') {
        // Cek existing
        const { data: existing } = await supabase
          .from('roles')
          .select('*')
          .eq('nrp', nrp)
          .eq('role', role)
          .maybeSingle()

        if (existing) {
          await supabase
            .from('roles')
            .update({ active: true, scope_site: scope_site || null })
            .eq('id', existing.id)
        } else {
          await supabase
            .from('roles')
            .insert({ nrp, role, scope_site: scope_site || null, active: true })
        }
      } else {
        await supabase
          .from('roles')
          .delete()
          .eq('nrp', nrp)
          .eq('role', role)
      }

      // Audit log
      await logAudit({
        req: request,
        actor_nrp: session.nrp,
        action: `ROLE_${action.toUpperCase()}: ${role} → ${nrp}`,
        category: 'PERMISSION',
        target_type: 'roles',
        target_id: nrp,
        target_label: `${action === 'assign' ? 'Assign' : 'Remove'} role ${role}`,
        detail: { nrp, role, scope_site, action },
        status: 'SUCCESS'
      })

      return NextResponse.json({
        success: true,
        message: `✅ Role ${role.toUpperCase()} ${action === 'assign' ? 'diassign' : 'dihapus'} untuk ${nrp}`
      })
    }

    // ═══════════════════════════════════════════
    // MODE: BATCH (assign 1 role ke banyak NRP) - BULK OPTIMIZED
    // ═══════════════════════════════════════════
    if (mode === 'batch') {
      if (!Array.isArray(nrps) || nrps.length === 0) {
        return NextResponse.json({ error: 'nrps harus array & tidak kosong' }, { status: 400 })
      }
      if (!role || !VALID_ROLES.includes(role)) {
        return NextResponse.json({ error: `Role "${role}" tidak valid` }, { status: 400 })
      }

      try {
        // ─── 1. Kalau replace_existing = hapus semua role dari NRP terpilih ───
        if (replace_existing) {
          await supabase
            .from('roles')
            .delete()
            .in('nrp', nrps)
        }

        // ─── 2. Cek NRP yang sudah punya role ini (biar tidak duplikat) ───
        const { data: existing } = await supabase
          .from('roles')
          .select('nrp')
          .in('nrp', nrps)
          .eq('role', role)

        const existingNrps = new Set((existing || []).map((r: any) => String(r.nrp)))

        // ─── 3. Update yang sudah ada (activate + set scope) ───
        if (existingNrps.size > 0) {
          await supabase
            .from('roles')
            .update({ active: true, scope_site: scope_site || null })
            .in('nrp', Array.from(existingNrps))
            .eq('role', role)
        }

        // ─── 4. Insert BULK untuk yang belum ada ───
        const toInsert = nrps
          .filter((n: string) => !existingNrps.has(String(n)))
          .map((nrp: string) => ({
            nrp,
            role,
            scope_site: scope_site || null,
            active: true
          }))

        if (toInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('roles')
            .insert(toInsert)
          
          if (insertError) throw insertError
        }

        const successCount = nrps.length

        // ─── 5. Audit log (fire-and-forget, jangan await lama) ───
        logAudit({
          req: request,
          actor_nrp: session.nrp,
          action: `BATCH_ROLE_ASSIGN: ${role} → ${successCount} NRP`,
           category: 'PERMISSION',
          target_type: 'roles',
          target_label: `Batch assign role ${role}`,
          detail: { 
            role, 
            scope_site, 
            total: nrps.length, 
            updated: existingNrps.size,
            inserted: toInsert.length,
            replace_existing 
          },
          status: 'SUCCESS'
        }).catch(() => {})

        return NextResponse.json({
          success: true,
          message: `✅ Berhasil assign role "${role}" ke ${successCount} karyawan`,
          stats: { 
            total: nrps.length, 
            success: successCount, 
            updated: existingNrps.size,
            inserted: toInsert.length,
            fail: 0 
          }
        })

      } catch (err: any) {
        return NextResponse.json({ 
          error: `Batch gagal: ${err.message}`,
          detail: err
        }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Mode tidak valid' }, { status: 400 })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════
// DELETE - Hapus semua role dari 1 karyawan
// ═══════════════════════════════════════════════
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  if (!canManageRoles(session)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  try {
    const { nrp } = await request.json()
    if (!nrp) return NextResponse.json({ error: 'NRP wajib diisi' }, { status: 400 })

    await supabase.from('roles').delete().eq('nrp', nrp)

    await logAudit({
      req: request,
      actor_nrp: session.nrp,
      action: `ROLE_CLEAR_ALL: ${nrp}`,
       category: 'PERMISSION',
      target_type: 'roles',
      target_id: nrp,
      target_label: `Hapus semua role dari NRP ${nrp}`,
      status: 'SUCCESS'
    })

    return NextResponse.json({ success: true, message: `✅ Semua role NRP ${nrp} dihapus` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}