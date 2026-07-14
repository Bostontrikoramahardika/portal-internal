/**
 * 🎭 ROLE TEMPLATES API v1.0
 * GET  → Ambil semua role templates + permissions per role
 * POST → Apply template ke user (assign permissions dari template)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { getSession } from '@/app/lib/auth'
import { logAudit } from '@/app/lib/auditLog'

// ─── GET: Ambil role templates ───────────────────────────
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session invalid' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const roleKey = searchParams.get('role_key') // opsional: filter 1 role

    // Ambil semua role templates
    let query = supabase
      .from('role_templates')
      .select('*')
      .eq('active', true)
      .order('level', { ascending: true })

    if (roleKey) query = query.eq('role_key', roleKey)

    const { data: templates, error } = await query
    if (error) throw error

    // Ambil permissions per role
    const { data: perms, error: permError } = await supabase
      .from('role_template_permissions')
      .select('role_key, perm_key')

    if (permError) throw permError

    // Gabungkan templates + permissions
    const result = (templates || []).map((t: any) => ({
      ...t,
      permissions: (perms || [])
        .filter((p: any) => p.role_key === t.role_key)
        .map((p: any) => p.perm_key)
    }))

    return NextResponse.json({ 
      success: true, 
      data: result,
      total: result.length
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── POST: Apply template ke user ────────────────────────
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session invalid' }, { status: 401 })

    // Hanya Super Admin atau HR HO yang bisa apply template
    const allowedRoles = ['super_admin', 'hr_ho']
    const userRoles = session.roles || []
    const isAllowed = session.is_super_admin || 
      userRoles.some((r: string) => allowedRoles.includes(r))

    if (!isAllowed) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await req.json()
    const { target_nrp, role_key, mode } = body
    // mode: 'replace' = hapus semua lalu isi dari template
    //       'merge'   = tambahkan permissions template (tidak hapus yg ada)

    if (!target_nrp || !role_key) {
      return NextResponse.json({ 
        error: 'target_nrp dan role_key wajib diisi' 
      }, { status: 400 })
    }

    // 1. Cek role template ada
    const { data: template, error: tError } = await supabase
      .from('role_templates')
      .select('*')
      .eq('role_key', role_key)
      .eq('active', true)
      .single()

    if (tError || !template) {
      return NextResponse.json({ error: 'Role template tidak ditemukan' }, { status: 404 })
    }

    // 2. Ambil permissions dari template
    const { data: templatePerms, error: tpError } = await supabase
      .from('role_template_permissions')
      .select('perm_key')
      .eq('role_key', role_key)

    if (tpError) throw tpError

    const permKeys = (templatePerms || []).map((p: any) => p.perm_key)

    // 3. Kalau mode replace → hapus dulu semua permissions user
    if (mode === 'replace') {
      await supabase
        .from('user_permissions')
        .delete()
        .eq('nrp', target_nrp)
    }

    // 4. Insert permissions baru dari template
    if (permKeys.length > 0) {
      const inserts = permKeys.map((perm_key: string) => ({
        nrp: target_nrp,
        perm_key
      }))

      const { error: insertError } = await supabase
        .from('user_permissions')
        .insert(inserts)

      // Kalau ada conflict (mode merge), ignore saja
      if (insertError && insertError.message && !insertError.message.includes('duplicate')) {
        throw insertError
      }
    }

    // 5. Audit log
    await logAudit({
      req,
      actor_nrp: session.nrp,
      action: `APPLY_ROLE_TEMPLATE: ${role_key} → ${target_nrp} (mode: ${mode || 'merge'})`,
      category: 'PERMISSION',
      target_type: 'user_permissions',
      target_id: target_nrp,
      target_label: `Apply template ${template.role_label} ke NRP ${target_nrp}`,
      detail: { role_key, total_permissions: permKeys.length, mode },
      status: 'SUCCESS'
    })

    return NextResponse.json({
      success: true,
      message: `Berhasil apply ${permKeys.length} permissions dari template "${template.role_label}" ke NRP ${target_nrp}`,
      total_permissions: permKeys.length,
      mode: mode || 'merge'
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}