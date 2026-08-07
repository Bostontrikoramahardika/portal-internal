// app/api/notifikasi/route.ts
// v3.0 - Merge dengan tabel notifications (push notification history)

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Setup tanggal
    const now = new Date()
    const nextMonth = new Date()
    nextMonth.setDate(nextMonth.getDate() + 30)
    const sevenDays = new Date()
    sevenDays.setDate(sevenDays.getDate() + 7)
    
    const dateLimit = nextMonth.toISOString().split('T')[0]
    const criticalLimit = sevenDays.toISOString().split('T')[0]

    // Identifikasi user
    const nrp = session.nrp
    const roles = (session.roles || []).map((r: string) => r.toLowerCase())
    const isSuperAdmin = session.is_super_admin || false
    const isHrga = isSuperAdmin || roles.some((r: string) => ['admin', 'hrga', 'hrga_site', 'hrga_pusat'].includes(r))
    const isApprover = isSuperAdmin || roles.some((r: string) => ['atasan', 'pjo', 'hrga_site', 'admin_site'].includes(r))

    // ═══════════════════════════════════════════════
    // 1. HITUNG EXPIRED (per jenis + site + kritis)
    // ═══════════════════════════════════════════════
    let qMcu = supabase.from('mcu').select('nrp, tanggal_expired').lte('tanggal_expired', dateLimit)
    let qSimper = supabase.from('simper').select('nrp, tanggal_expired').lte('tanggal_expired', dateLimit)
    let qPkwt = supabase.from('pkwt').select('nrp, tanggal_berakhir').lte('tanggal_berakhir', dateLimit)
    let qSimpol = supabase.from('employees').select('nrp, exp_simpol, site').lte('exp_simpol', dateLimit)

    if (!isHrga) {
      qMcu = qMcu.eq('nrp', nrp)
      qSimper = qSimper.eq('nrp', nrp)
      qPkwt = qPkwt.eq('nrp', nrp)
      qSimpol = qSimpol.eq('nrp', nrp)
    }

    const [resMcu, resSimper, resPkwt, resSimpol] = await Promise.all([
      qMcu, qSimper, qPkwt, qSimpol
    ])

    const allNrps = new Set<string>()
    ;(resMcu.data || []).forEach((r: any) => r.nrp && allNrps.add(String(r.nrp)))
    ;(resSimper.data || []).forEach((r: any) => r.nrp && allNrps.add(String(r.nrp)))
    ;(resPkwt.data || []).forEach((r: any) => r.nrp && allNrps.add(String(r.nrp)))

    const empSiteMap = new Map<string, string>()
    if (allNrps.size > 0) {
      const { data: emps } = await supabase
        .from('employees')
        .select('nrp, site')
        .in('nrp', Array.from(allNrps))
      ;(emps || []).forEach((e: any) => empSiteMap.set(String(e.nrp), e.site || '-'))
    }

    function buildBreakdown(rows: any[], jenis: string, tanggalField: string, icon: string, useEmpSite = true) {
      const siteMap = new Map<string, { count: number, critical: number }>()
      
      ;(rows || []).forEach((r: any) => {
        const site = useEmpSite 
          ? (empSiteMap.get(String(r.nrp)) || '-')
          : (r.site || '-')
        const tgl = r[tanggalField]
        const isCritical = tgl && tgl <= criticalLimit
        
        if (!siteMap.has(site)) {
          siteMap.set(site, { count: 0, critical: 0 })
        }
        const s = siteMap.get(site)!
        s.count++
        if (isCritical) s.critical++
      })
      
      return Array.from(siteMap.entries()).map(([site, data]) => ({
        jenis,
        icon,
        site,
        count: data.count,
        critical: data.critical
      }))
    }

    const expiredBreakdown = [
      ...buildBreakdown(resMcu.data || [], 'MCU', 'tanggal_expired', '🏥', true),
      ...buildBreakdown(resSimper.data || [], 'SIMPER', 'tanggal_expired', '🚗', true),
      ...buildBreakdown(resPkwt.data || [], 'PKWT', 'tanggal_berakhir', '📄', true),
      ...buildBreakdown(resSimpol.data || [], 'SIMPOL', 'exp_simpol', '🎖️', false)
    ]

    const totalExpired = expiredBreakdown.reduce((sum, b) => sum + b.count, 0)
    const totalExpiredCritical = expiredBreakdown.reduce((sum, b) => sum + b.critical, 0)

    // ═══════════════════════════════════════════════
    // 2. HITUNG APPROVAL (sinkron dgn approval-center)
    // ═══════════════════════════════════════════════
    const approvalBreakdown: any[] = []
    let totalApproval = 0

    if (isApprover) {
      const [cutiAt, lemburAt, sakitAt] = await Promise.all([
        supabase.from('leave_requests').select('nrp').eq('atasan_nrp', nrp).eq('status_atasan', 'PENDING'),
        supabase.from('overtime_requests').select('nrp').eq('atasan_nrp', nrp).eq('status_atasan', 'PENDING'),
        supabase.from('attendance_evidences').select('nrp, kategori').eq('atasan_nrp', nrp).eq('status_atasan', 'PENDING')
      ])

      const [cutiPjo, lemburPjo] = await Promise.all([
        supabase.from('leave_requests').select('nrp').eq('pjo_nrp', nrp).eq('status_atasan', 'APPROVED').eq('status_pjo', 'PENDING'),
        supabase.from('overtime_requests').select('nrp').eq('pjo_nrp', nrp).eq('status_atasan', 'APPROVED').eq('status_pjo', 'PENDING')
      ])

      const approvalNrps = new Set<string>()
      ;(cutiAt.data || []).forEach((r: any) => r.nrp && approvalNrps.add(String(r.nrp)))
      ;(lemburAt.data || []).forEach((r: any) => r.nrp && approvalNrps.add(String(r.nrp)))
      ;(sakitAt.data || []).forEach((r: any) => r.nrp && approvalNrps.add(String(r.nrp)))
      ;(cutiPjo.data || []).forEach((r: any) => r.nrp && approvalNrps.add(String(r.nrp)))
      ;(lemburPjo.data || []).forEach((r: any) => r.nrp && approvalNrps.add(String(r.nrp)))

      const apprSiteMap = new Map<string, string>()
      if (approvalNrps.size > 0) {
        const { data: emps } = await supabase
          .from('employees')
          .select('nrp, site')
          .in('nrp', Array.from(approvalNrps))
        ;(emps || []).forEach((e: any) => apprSiteMap.set(String(e.nrp), e.site || '-'))
      }

      function groupApprovalBySite(rows: any[], jenis: string, icon: string, tahap: string) {
        const siteMap = new Map<string, number>()
        ;(rows || []).forEach((r: any) => {
          const site = apprSiteMap.get(String(r.nrp)) || '-'
          siteMap.set(site, (siteMap.get(site) || 0) + 1)
        })
        return Array.from(siteMap.entries()).map(([site, count]) => ({
          jenis, icon, site, count, tahap
        }))
      }

      const sakitOnly = (sakitAt.data || []).filter((r: any) => (r.kategori || 'SAKIT') === 'SAKIT')
      const izinPot = (sakitAt.data || []).filter((r: any) => r.kategori === 'IZIN_POTONGAN')
      const izinBay = (sakitAt.data || []).filter((r: any) => r.kategori === 'IZIN_BERBAYAR')

      approvalBreakdown.push(
        ...groupApprovalBySite(cutiAt.data || [], 'CUTI', '🌴', 'ATASAN'),
        ...groupApprovalBySite(lemburAt.data || [], 'LEMBUR', '⏱️', 'ATASAN'),
        ...groupApprovalBySite(sakitOnly, 'SAKIT', '🤒', 'ATASAN'),
        ...groupApprovalBySite(izinPot, 'IZIN_POTONGAN', '⚠️', 'ATASAN'),
        ...groupApprovalBySite(izinBay, 'IZIN_BERBAYAR', '✅', 'ATASAN'),
        ...groupApprovalBySite(cutiPjo.data || [], 'CUTI', '🌴', 'PJO'),
        ...groupApprovalBySite(lemburPjo.data || [], 'LEMBUR', '⏱️', 'PJO')
      )

      totalApproval = approvalBreakdown.reduce((sum, b) => sum + b.count, 0)
    }

    // ═══════════════════════════════════════════════
    // 3. ✨ NEW: FETCH NOTIFIKASI DARI TABEL notifications
    // ═══════════════════════════════════════════════
    const { data: notifRows } = await supabase
      .from('notifications')
      .select('*')
      .eq('nrp', nrp)
      .order('created_at', { ascending: false })
      .limit(20)

    const notifications = (notifRows || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      icon: n.icon || '🔔',
      url: n.url || '/dashboard',
      category: n.category || 'GENERAL',
      data: n.data || {},
      read_at: n.read_at,
      created_at: n.created_at
    }))

    const notifUnread = notifications.filter((n: any) => !n.read_at).length

    // ═══════════════════════════════════════════════
    // 4. RETURN
    // ═══════════════════════════════════════════════
    return NextResponse.json({
      total_notifikasi: totalApproval + totalExpired + notifUnread,
      approval: {
        total: totalApproval,
        breakdown: approvalBreakdown
      },
      expired: {
        total: totalExpired,
        critical: totalExpiredCritical,
        breakdown: expiredBreakdown
      },
      // ✨ NEW: notifications dari tabel notifications
      notifications: {
        total: notifications.length,
        unread: notifUnread,
        items: notifications
      },
      // Backward compatibility
      total_pending: totalApproval,
      total_expired: totalExpired
    })
  } catch (err: any) {
    console.error('Notifikasi error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}