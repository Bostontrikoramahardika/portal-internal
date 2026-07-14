// app/api/health-check/route.ts
// Automated Health Check - Cek semua fitur & fungsi aplikasi
// Cara pakai: buka http://localhost:3000/api/health-check di browser

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

interface CheckResult {
  name: string
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP'
  duration_ms: number
  message: string
  detail?: any
}

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  const results: CheckResult[] = []
  const categories: Record<string, CheckResult[]> = {}

  // Helper untuk run 1 check
  async function runCheck(category: string, name: string, fn: () => Promise<any>): Promise<CheckResult> {
    const start = Date.now()
    try {
      const result = await fn()
      const check: CheckResult = {
        name,
        status: 'PASS',
        duration_ms: Date.now() - start,
        message: result?.message || '✅ OK',
        detail: result?.detail
      }
      if (!categories[category]) categories[category] = []
      categories[category].push(check)
      results.push(check)
      return check
    } catch (err: any) {
      const check: CheckResult = {
        name,
        status: 'FAIL',
        duration_ms: Date.now() - start,
        message: `❌ ${err.message || 'Unknown error'}`,
        detail: err.stack?.split('\n')[0]
      }
      if (!categories[category]) categories[category] = []
      categories[category].push(check)
      results.push(check)
      return check
    }
  }

  // ═══════════════════════════════════════════════
  // 1. DATABASE CONNECTION CHECKS
  // ═══════════════════════════════════════════════
  await runCheck('DATABASE', 'Koneksi Supabase', async () => {
    const { error } = await supabase.from('employees').select('nrp').limit(1)
    if (error) throw new Error(error.message)
    return { message: '✅ Terhubung ke Supabase' }
  })

  // ═══════════════════════════════════════════════
  // 2. TABLE EXISTENCE & COUNT CHECKS
  // ═══════════════════════════════════════════════
  const CRITICAL_TABLES = [
    'employees', 'sessions', 'roles', 'menus',
    'attendance', 'attendance_evidences',
    'leave_requests', 'overtime_requests',
    'rosters', 'kpi', 'sp', 'bpjs',
    'mcu', 'simper', 'pkwt',
    'sites_config', 'announcements',
    'master_permissions', 'user_permissions',
    'audit_logs', 'approval_matrix'
  ]

  for (const table of CRITICAL_TABLES) {
    await runCheck('TABLES', `Tabel: ${table}`, async () => {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
      if (error) throw new Error(error.message)
      return { message: `✅ ${count ?? 0} rows`, detail: { rows: count } }
    })
  }

  // ═══════════════════════════════════════════════
  // 3. CRITICAL DATA CHECKS
  // ═══════════════════════════════════════════════
  await runCheck('DATA', 'Super Admin (Ricky) ada', async () => {
    const { data, error } = await supabase.from('employees').select('nrp, nama, is_super_admin').eq('is_super_admin', true)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) throw new Error('Tidak ada Super Admin!')
    return { message: `✅ ${data.length} Super Admin`, detail: data.map((d: any) => d.nama) }
  })

  await runCheck('DATA', 'Master Permissions >= 50', async () => {
    const { count, error } = await supabase.from('master_permissions').select('*', { count: 'exact', head: true })
    if (error) throw new Error(error.message)
    if ((count ?? 0) < 50) throw new Error(`Cuma ${count} permissions, harusnya 55+`)
    return { message: `✅ ${count} permissions`, detail: { total: count } }
  })

  await runCheck('DATA', 'Menu aktif >= 20', async () => {
    const { count, error } = await supabase.from('menus').select('*', { count: 'exact', head: true }).eq('active', true)
    if (error) throw new Error(error.message)
    if ((count ?? 0) < 20) throw new Error(`Cuma ${count} menu aktif`)
    return { message: `✅ ${count} menu aktif` }
  })

  await runCheck('DATA', 'Sites config ada', async () => {
    const { data, error } = await supabase.from('sites_config').select('*')
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) throw new Error('Tidak ada site config')
    const activeSites = data.filter((s: any) => s.is_active).length
    const namaSites = data.map((s: any) => s.nama_site || s.site_name || s.kode_site || 'unknown')
    return { message: `✅ ${data.length} site (${activeSites} aktif)`, detail: namaSites }
  })

  await runCheck('DATA', 'Karyawan aktif ada', async () => {
    const { count, error } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status_karyawan', 'Aktif')
    if (error) throw new Error(error.message)
    if ((count ?? 0) === 0) throw new Error('Tidak ada karyawan aktif')
    return { message: `✅ ${count} karyawan aktif` }
  })

  // ═══════════════════════════════════════════════
  // 4. APPROVAL SYSTEM CHECKS
  // ═══════════════════════════════════════════════
  await runCheck('APPROVAL', 'Pending Cuti', async () => {
    const { count, error } = await supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status_atasan', 'PENDING')
    if (error) throw new Error(error.message)
    return { message: `📊 ${count ?? 0} cuti pending`, detail: { count } }
  })

  await runCheck('APPROVAL', 'Pending Lembur', async () => {
    const { count, error } = await supabase.from('overtime_requests').select('*', { count: 'exact', head: true }).eq('status_atasan', 'PENDING')
    if (error) throw new Error(error.message)
    return { message: `📊 ${count ?? 0} lembur pending`, detail: { count } }
  })

  await runCheck('APPROVAL', 'Pending Sakit/Izin', async () => {
    const { count, error } = await supabase.from('attendance_evidences').select('*', { count: 'exact', head: true }).eq('status_atasan', 'PENDING')
    if (error) throw new Error(error.message)
    return { message: `📊 ${count ?? 0} sakit pending`, detail: { count } }
  })

  // ═══════════════════════════════════════════════
  // 5. EXPIRED DOCUMENTS CHECKS
  // ═══════════════════════════════════════════════
  const nextMonth = new Date()
  nextMonth.setDate(nextMonth.getDate() + 30)
  const dateLimit = nextMonth.toISOString().split('T')[0]

  await runCheck('EXPIRED', 'MCU akan expired', async () => {
    const { count, error } = await supabase.from('mcu').select('*', { count: 'exact', head: true }).lte('tanggal_expired', dateLimit)
    if (error) throw new Error(error.message)
    return { message: `⚠️ ${count ?? 0} MCU expired dalam 30 hari` }
  })

  await runCheck('EXPIRED', 'SIMPER akan expired', async () => {
    const { count, error } = await supabase.from('simper').select('*', { count: 'exact', head: true }).lte('tanggal_expired', dateLimit)
    if (error) throw new Error(error.message)
    return { message: `⚠️ ${count ?? 0} SIMPER expired dalam 30 hari` }
  })

  await runCheck('EXPIRED', 'PKWT akan expired', async () => {
    // PKWT bisa pakai berbagai nama kolom
    const { data, error } = await supabase.from('pkwt').select('*')
    if (error) throw new Error(error.message)
    const expired = (data || []).filter((p: any) => {
      const tgl = p.tanggal_berakhir || p.berlaku_sampai || p.tgl_akhir || p.akhir_kontrak
      return tgl && tgl <= dateLimit
    }).length
    return { message: `⚠️ ${expired} PKWT expired dalam 30 hari` }
  })

  await runCheck('EXPIRED', 'SIMPOL akan expired', async () => {
    const { count, error } = await supabase.from('employees').select('*', { count: 'exact', head: true }).lte('exp_simpol', dateLimit)
    if (error) throw new Error(error.message)
    return { message: `⚠️ ${count ?? 0} SIMPOL expired dalam 30 hari` }
  })

  // ═══════════════════════════════════════════════
  // 6. AUTHENTICATION CHECK
  // ═══════════════════════════════════════════════
  await runCheck('AUTH', 'Session valid (Bapak)', async () => {
    const token = req.cookies.get('session_token')?.value
    if (!token) throw new Error('Tidak ada session token (belum login)')
    const session = await getSession(token)
    if (!session) throw new Error('Session expired')
    return { 
      message: `✅ Login sebagai ${session.nama}`, 
      detail: { 
        nrp: session.nrp, 
        is_super_admin: session.is_super_admin,
        roles: session.roles?.length || 0
      } 
    }
  })

  await runCheck('AUTH', 'Active sessions count', async () => {
    const { count, error } = await supabase.from('sessions').select('*', { count: 'exact', head: true }).gt('expires_at', new Date().toISOString())
    if (error) throw new Error(error.message)
    return { message: `📊 ${count ?? 0} sessions aktif` }
  })

  // ═══════════════════════════════════════════════
  // 7. RECENT ACTIVITY CHECK
  // ═══════════════════════════════════════════════
  await runCheck('ACTIVITY', 'Absensi hari ini', async () => {
    const today = new Date().toISOString().split('T')[0]
    const { count, error } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('tanggal', today)
    if (error) throw new Error(error.message)
    return { message: `📊 ${count ?? 0} karyawan absensi hari ini` }
  })

  await runCheck('ACTIVITY', 'Audit log 24 jam terakhir', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const { count, error } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true }).gte('created_at', yesterday.toISOString())
    if (error) throw new Error(error.message)
    return { message: `📊 ${count ?? 0} aksi admin dalam 24 jam` }
  })

  // ═══════════════════════════════════════════════
  // 8. NOTIFICATION SYSTEM CHECK
  // ═══════════════════════════════════════════════
  await runCheck('NOTIF', 'Announcements aktif', async () => {
    const { count, error } = await supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('active', true)
    if (error) throw new Error(error.message)
    return { message: `📢 ${count ?? 0} pengumuman aktif` }
  })

  // ═══════════════════════════════════════════════
  // 9. DATA INTEGRITY CHECKS
  // ═══════════════════════════════════════════════
  await runCheck('INTEGRITY', 'Karyawan tanpa role', async () => {
    const { data: emps } = await supabase.from('employees').select('nrp').eq('status_karyawan', 'Aktif')
    const { data: roles } = await supabase.from('roles').select('nrp').eq('active', true)
    const rolNrps = new Set((roles || []).map((r: any) => String(r.nrp)))
    const withoutRole = (emps || []).filter((e: any) => !rolNrps.has(String(e.nrp)))
    if (withoutRole.length > 0) {
      return { 
        message: `⚠️ ${withoutRole.length} karyawan tanpa role`, 
        detail: withoutRole.slice(0, 5).map((e: any) => e.nrp) 
      }
    }
    return { message: '✅ Semua karyawan aktif punya role' }
  })

  await runCheck('INTEGRITY', 'Duplicate NRP di employees', async () => {
    const { data, error } = await supabase.from('employees').select('nrp')
    if (error) throw new Error(error.message)
    const nrps = (data || []).map((d: any) => String(d.nrp))
    const dupes = nrps.filter((n: string, i: number) => nrps.indexOf(n) !== i)
    if (dupes.length > 0) throw new Error(`Ada NRP duplikat: ${dupes.slice(0, 3).join(', ')}`)
    return { message: `✅ Tidak ada NRP duplikat (${nrps.length} unik)` }
  })

  // ═══════════════════════════════════════════════
  // 10. SUMMARY & RETURN
  // ═══════════════════════════════════════════════
  const totalDuration = Date.now() - startTime
  const totalChecks = results.length
  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length
  const warnings = results.filter(r => r.status === 'WARN').length

  const slowest = [...results].sort((a, b) => b.duration_ms - a.duration_ms).slice(0, 3)

  return NextResponse.json({
    summary: {
      total_checks: totalChecks,
      passed,
      failed,
      warnings,
      success_rate: `${Math.round((passed / totalChecks) * 100)}%`,
      total_duration_ms: totalDuration,
      status: failed === 0 ? '✅ ALL SYSTEMS OK' : `⚠️ ${failed} ISSUES FOUND`
    },
    failed_checks: results.filter(r => r.status === 'FAIL'),
    slowest_checks: slowest.map(s => ({ name: s.name, duration_ms: s.duration_ms })),
    categories,
    timestamp: new Date().toISOString()
  }, { status: 200 })
}
