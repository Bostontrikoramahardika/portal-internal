// app/api/apd/monitoring/route.ts
// v1.1 — Smart Table monitoring APD (matrix per karyawan)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { getWitaToday } from '@/app/lib/timezone'

const ALL_SCOPE_ROLES = [
  'super_admin', 'director_ops', 'business_dev',
  'hr_ho', 'manager_ops', 'spv_she_ho', 'hrga'
]
const SITE_SCOPE_ROLES = ['hr_site', 'she_site', 'hrga_site', 'pjo_site']
const TEAM_SCOPE_ROLES = ['gl_produksi', 'gl_plant', 'atasan']

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  
  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const nrp = session.nrp
  
  const isAllScope = userRoles.some(r => ALL_SCOPE_ROLES.includes(r))
  const isSiteScope = userRoles.some(r => SITE_SCOPE_ROLES.includes(r))
  const isTeamScope = userRoles.some(r => TEAM_SCOPE_ROLES.includes(r))
  
  const { searchParams } = new URL(req.url)
  const filterSite = searchParams.get('site') || 'ALL'
  const filterDept = searchParams.get('departemen') || 'ALL'
  const filterStatus = searchParams.get('status') || 'ALL'
  const search = searchParams.get('search') || ''
  
  try {
    // 1. Master APD (kolom matrix)
    const { data: masterList, error: errMaster } = await supabaseAdmin
      .from('apd_master')
      .select('*')
      .eq('active', true)
      .order('urutan', { ascending: true })
    if (errMaster) throw errMaster
    
    const jenisList = (masterList || []).map((m: any) => ({
      jenis_apd: m.jenis_apd,
      icon: m.icon,
      life_time_bulan: m.life_time_bulan
    }))
    
    // 2. Query karyawan (sesuai scope)
    let empQuery = supabaseAdmin
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site, status_karyawan, tanggal_masuk')
      .eq('status_karyawan', 'Aktif')
    
    if (filterSite !== 'ALL') {
      empQuery = empQuery.eq('site', filterSite)
    } else if (isSiteScope && !isAllScope) {
      const { data: userEmp } = await supabaseAdmin
        .from('employees').select('site').eq('nrp', nrp).single()
      if (userEmp?.site) empQuery = empQuery.eq('site', userEmp.site)
    }
    
    if (filterDept !== 'ALL') empQuery = empQuery.eq('departemen', filterDept)
    if (search) empQuery = empQuery.or(`nama.ilike.%${search}%,nrp.ilike.%${search}%`)
    
    if (isTeamScope && !isAllScope && !isSiteScope) {
      const { data: teamData } = await supabaseAdmin
        .from('approval_matrix').select('karyawan_nrp').eq('atasan_nrp', nrp)
      const teamNrps = (teamData || []).map((t: any) => t.karyawan_nrp)
      if (teamNrps.length === 0) {
        return NextResponse.json({
          ok: true, rows: [], total: 0, sites: [], departemens: [], jenisList,
          summary: { total: 0, aman: 0, segeraGanti: 0, expired: 0, belumTerima: 0 }
        })
      }
      empQuery = empQuery.in('nrp', teamNrps)
    }
    
    const { data: employees, error: errEmp } = await empQuery.order('nama', { ascending: true })
    if (errEmp) throw errEmp
    
    if (!employees || employees.length === 0) {
      return NextResponse.json({
        ok: true, rows: [], total: 0, sites: [], departemens: [], jenisList,
        summary: { total: 0, aman: 0, segeraGanti: 0, expired: 0, belumTerima: 0 }
      })
    }
    
    const empNrps = employees.map((e: any) => e.nrp)
    
    // 3. Ambil VERIFIED history (untuk matrix status)
    const { data: histories, error: errHist } = await supabaseAdmin
      .from('apd_history')
      .select('*')
      .in('nrp', empNrps)
      .eq('status', 'VERIFIED')
      .order('tanggal_terima', { ascending: false })
    if (errHist) throw errHist
    
    // Ambil PENDING count per karyawan (untuk badge notif)
    const { data: pendingData } = await supabaseAdmin
      .from('apd_history')
      .select('nrp')
      .in('nrp', empNrps)
      .eq('status', 'PENDING')
    
    const pendingByNrp: Record<string, number> = {}
    for (const p of (pendingData || [])) {
      pendingByNrp[p.nrp] = (pendingByNrp[p.nrp] || 0) + 1
    }
    
    // 4. Group history per nrp+jenis (ambil terbaru)
    const historyMap: Record<string, Record<string, any>> = {}
    for (const h of (histories || [])) {
      if (!historyMap[h.nrp]) historyMap[h.nrp] = {}
      const existing = historyMap[h.nrp][h.jenis_apd]
      if (!existing || new Date(h.tanggal_terima) > new Date(existing.tanggal_terima)) {
        historyMap[h.nrp][h.jenis_apd] = h
      }
    }
    
    const today = getWitaToday()
    const todayDate = new Date(today)
    
    // 5. Build rows (matrix)
    const rows = employees.map((emp: any) => {
      const empHistory = historyMap[emp.nrp] || {}
      const matrix: Record<string, any> = {}
      let anyExpired = false, anySegera = false, anyAman = false
      let totalPunya = 0
      
      for (const jenisObj of jenisList) {
        const jenis = jenisObj.jenis_apd
        const rec = empHistory[jenis]
        
        if (!rec) {
          matrix[jenis] = { status: 'BELUM_TERIMA', tanggal: null, expired: null, days: null }
        } else {
          totalPunya++
          if (!rec.expired_at) {
            matrix[jenis] = {
              status: 'AMAN', tanggal: rec.tanggal_terima, expired: null, days: null,
              ukuran: rec.ukuran, jumlah: rec.jumlah, warna: rec.warna
            }
            anyAman = true
          } else {
            const expiredDate = new Date(rec.expired_at)
            const days = Math.floor((expiredDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
            
            let status: string
            if (days < 0) { status = 'EXPIRED'; anyExpired = true }
            else if (days <= 60) { status = 'SEGERA_GANTI'; anySegera = true }
            else { status = 'AMAN'; anyAman = true }
            
            matrix[jenis] = {
              status, tanggal: rec.tanggal_terima, expired: rec.expired_at, days,
              ukuran: rec.ukuran, jumlah: rec.jumlah, warna: rec.warna
            }
          }
        }
      }
      
      let overallStatus = 'BELUM_TERIMA'
      if (anyExpired) overallStatus = 'EXPIRED'
      else if (anySegera) overallStatus = 'SEGERA_GANTI'
      else if (anyAman) overallStatus = 'AMAN'
      
      return {
        nrp: emp.nrp,
        nama: emp.nama,
        jabatan: emp.jabatan,
        departemen: emp.departemen,
        site: emp.site,
        tanggal_masuk: emp.tanggal_masuk,
        matrix,
        overallStatus,
        totalPunya,
        totalMaster: jenisList.length,
        pendingCount: pendingByNrp[emp.nrp] || 0
      }
    })
    
    // 6. Filter by status
    const filteredRows = filterStatus === 'ALL'
      ? rows
      : rows.filter(r => r.overallStatus === filterStatus)
    
    // 7. Summary
    const summary = {
      total: rows.length,
      aman: rows.filter(r => r.overallStatus === 'AMAN').length,
      segeraGanti: rows.filter(r => r.overallStatus === 'SEGERA_GANTI').length,
      expired: rows.filter(r => r.overallStatus === 'EXPIRED').length,
      belumTerima: rows.filter(r => r.overallStatus === 'BELUM_TERIMA').length,
      totalPending: rows.reduce((sum, r) => sum + r.pendingCount, 0)
    }
    
    // 8. Sites & Departemens list untuk filter dropdown
    const { data: sitesData } = await supabaseAdmin
      .from('employees').select('site')
      .eq('status_karyawan', 'Aktif').not('site', 'is', null)
    const sites = Array.from(new Set((sitesData || []).map((s: any) => s.site))).sort()
    
    const { data: deptData } = await supabaseAdmin
      .from('employees').select('departemen')
      .eq('status_karyawan', 'Aktif').not('departemen', 'is', null)
    const departemens = Array.from(new Set((deptData || []).map((d: any) => d.departemen))).sort()
    
    return NextResponse.json({
      ok: true,
      rows: filteredRows,
      total: filteredRows.length,
      totalAll: rows.length,
      sites,
      departemens,
      jenisList,
      summary,
      scope: isAllScope ? 'ALL' : (isSiteScope ? 'SITE' : (isTeamScope ? 'TEAM' : 'NONE')),
      today
    })
  } catch (e: any) {
    console.error('[APD MONITORING] Error:', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}