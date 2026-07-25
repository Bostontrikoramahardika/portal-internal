// app/api/apd/plan/route.ts — v1.1 (fix: kolom nama, tanggal_resign)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { getWitaToday } from '@/app/lib/timezone'

// ═══ GET — Generate plan bulanan + ambil overrides ═══
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []

  const allowed = ['super_admin', 'hr_ho', 'hr_site', 'she_site', 'spv_she_ho', 'pjo_site', 'manager_ops']
  if (!allowed.some(r => userRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const bulan = searchParams.get('bulan') // format: "2026-08"
  const site = searchParams.get('site')

  if (!bulan) return NextResponse.json({ error: 'bulan wajib diisi (format: 2026-08)' }, { status: 400 })

  const [y, m] = bulan.split('-').map(Number)
  const bulanStart = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const bulanEnd = `${y}-${String(m).padStart(2, '0')}-${lastDay}`

  // ═══ 1. Ambil semua karyawan aktif ═══
  // FIX: kolom name → nama, active → tidak ada, resign_date → tanggal_resign
  let empQuery = supabaseAdmin
    .from('employees')
    .select('nrp, nama, site, departemen, jabatan')
    .is('tanggal_resign', null)

  if (site && site !== 'ALL') empQuery = empQuery.eq('site', site)

  const { data: employees } = await empQuery

  // ═══ 2. Ambil semua master APD aktif ═══
  const { data: masterList } = await supabaseAdmin
    .from('apd_master')
    .select('jenis_apd, life_time_bulan, icon')
    .eq('active', true)
    .order('urutan')

  // ═══ 3. Ambil history APD (last per karyawan per jenis) ═══
  const { data: historyAll } = await supabaseAdmin
    .from('apd_history')
    .select('nrp, jenis_apd, tanggal_terima, expired_at, penerimaan_ke')
    .eq('status', 'VERIFIED')
    .order('tanggal_terima', { ascending: false })

  // Build map: nrp+jenis → last history
  const lastHistory: Record<string, any> = {}
  for (const h of historyAll || []) {
    const key = `${h.nrp}|||${h.jenis_apd}`
    if (!lastHistory[key]) lastHistory[key] = h
  }

  // ═══ 4. Ambil overrides untuk bulan ini ═══
  const { data: overrides } = await supabaseAdmin
    .from('apd_plan_overrides')
    .select('*')
    .eq('bulan_plan', bulan)

  const overrideMap: Record<string, any> = {}
  for (const ov of overrides || []) {
    overrideMap[`${ov.nrp}|||${ov.jenis_apd}`] = ov
  }

  // ═══ 5. Generate plan ═══
  const plan: any[] = []

  for (const emp of employees || []) {
    const empPlan: any = {
      nrp: emp.nrp,
      name: emp.nama,         // FIX: emp.name → emp.nama
      site: emp.site,
      departemen: emp.departemen,
      jabatan: emp.jabatan,
      items: []
    }

    for (const master of masterList || []) {
      const key = `${emp.nrp}|||${master.jenis_apd}`
      const last = lastHistory[key]
      const override = overrideMap[key]

      // Tentukan apakah perlu ganti di bulan ini
      let needReplace = false
      let reason = ''
      let qty = 1

      if (!last) {
        // Belum pernah terima → masuk plan BARU
        needReplace = true
        reason = 'BELUM_TERIMA'
      } else {
        // Cek apakah expired_at jatuh di bulan ini atau sudah lewat
        const expiredAt = last.expired_at ? new Date(last.expired_at) : null
        if (expiredAt) {
          const expStr = expiredAt.toISOString().split('T')[0]
          if (expStr <= bulanEnd) {
            needReplace = true
            reason = expStr < bulanStart ? 'EXPIRED' : 'JATUH_TEMPO'
          }
        }
      }

      // Override logic
      if (override) {
        if (override.action_type === 'REMOVE') {
          needReplace = false
          reason = 'OVERRIDE_REMOVE'
        } else if (override.action_type === 'ADD') {
          needReplace = true
          reason = override.keterangan || 'OVERRIDE_ADD'
          qty = override.qty_override || 1
        } else if (override.action_type === 'EDIT_QTY') {
          qty = override.qty_override || qty
        }
      }

      if (needReplace || override?.action_type === 'ADD') {
        empPlan.items.push({
          jenis_apd: master.jenis_apd,
          icon: master.icon,
          reason,
          qty: override?.qty_override || qty,
          last_terima: last?.tanggal_terima || null,
          expired_at: last?.expired_at || null,
          override: override || null,
          ukuran_override: override?.ukuran_override || null
        })
      }
    }

    if (empPlan.items.length > 0) {
      plan.push(empPlan)
    }
  }

  // ═══ 6. Summary ═══
  const summary = {
    total_karyawan: plan.length,
    total_item: plan.reduce((s, p) => s + p.items.length, 0),
    belum_terima: plan.reduce((s, p) => s + p.items.filter((i: any) => i.reason === 'BELUM_TERIMA').length, 0),
    jatuh_tempo: plan.reduce((s, p) => s + p.items.filter((i: any) => i.reason === 'JATUH_TEMPO').length, 0),
    expired: plan.reduce((s, p) => s + p.items.filter((i: any) => i.reason === 'EXPIRED').length, 0),
    override_add: plan.reduce((s, p) => s + p.items.filter((i: any) => i.reason?.includes('OVERRIDE_ADD')).length, 0),
  }

  return NextResponse.json({ ok: true, bulan, data: plan, summary, overrides: overrides || [] })
}

// ═══ POST/PUT — Simpan override plan ═══
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []

  const allowed = ['super_admin', 'hr_ho', 'hr_site', 'she_site', 'spv_she_ho']
  if (!allowed.some(r => userRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const body = await req.json()
  const { bulan_plan, jenis_apd, nrp, action_type, qty_override, ukuran_override, keterangan } = body

  if (!bulan_plan || !jenis_apd || !nrp || !action_type) {
    return NextResponse.json({ error: 'bulan_plan, jenis_apd, nrp, action_type wajib' }, { status: 400 })
  }

  const validActions = ['ADD', 'REMOVE', 'EDIT_QTY']
  if (!validActions.includes(action_type)) {
    return NextResponse.json({ error: 'action_type harus ADD/REMOVE/EDIT_QTY' }, { status: 400 })
  }

  // Upsert override
  const { data, error } = await supabaseAdmin
    .from('apd_plan_overrides')
    .upsert({
      bulan_plan,
      jenis_apd,
      nrp,
      action_type,
      qty_override: qty_override || null,
      ukuran_override: ukuran_override || null,
      keterangan: keterangan || null,
      created_by: session.nrp,
      updated_at: new Date().toISOString()
    }, { onConflict: 'bulan_plan,jenis_apd,nrp' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data })
}

// ═══ DELETE — Hapus override ═══
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []

  const allowed = ['super_admin', 'hr_ho', 'hr_site', 'she_site', 'spv_she_ho']
  if (!allowed.some(r => userRoles.includes(r))) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 })

  const { error } = await supabaseAdmin.from('apd_plan_overrides').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}