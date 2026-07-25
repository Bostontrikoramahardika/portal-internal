// app/api/apd/verify/route.ts
// v1.0 — API verifikasi request APD dari karyawan (HR/SHE only)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// Role yang bisa verifikasi
const VERIFY_ROLES = [
  'super_admin', 'hr_ho', 'hr_site', 'spv_she_ho', 'she_site',
  'hrga', 'hrga_site'
]

// ═══════════════════════════════════════════════
// GET — List semua request PENDING (untuk HR)
// ═══════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  
  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const nrp = session.nrp
  
  const canVerify = userRoles.some(r => VERIFY_ROLES.includes(r))
  if (!canVerify) {
    return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
  }
  
  const { searchParams } = new URL(req.url)
  const filterSite = searchParams.get('site') || 'ALL'
  const filterJenis = searchParams.get('jenis') || 'ALL'
  const filterStatus = searchParams.get('status') || 'PENDING'
  
  try {
    // Query base: filter status
    let query = supabaseAdmin
      .from('apd_history')
      .select('*')
      .in('input_source', ['KARYAWAN']) // hanya request dari karyawan
      .order('created_at', { ascending: false })
    
    if (filterStatus !== 'ALL') {
      query = query.eq('status', filterStatus)
    }
    
    if (filterJenis !== 'ALL') {
      query = query.eq('jenis_apd', filterJenis)
    }
    
    const { data: requests, error: errReq } = await query
    if (errReq) throw errReq
    
    // Enrich data karyawan (site, dept, jabatan)
    const nrps = Array.from(new Set((requests || []).map((r: any) => r.nrp).filter(Boolean)))
    let empMap: Record<string, any> = {}
    if (nrps.length > 0) {
      const { data: emps } = await supabaseAdmin
        .from('employees')
        .select('nrp, nama, jabatan, departemen, site')
        .in('nrp', nrps)
      for (const e of (emps || [])) {
        empMap[e.nrp] = e
      }
    }
    
    // Filter by site (karyawan)
    let enriched = (requests || []).map((r: any) => ({
      ...r,
      _employee: empMap[r.nrp] || null
    }))
    
    // Scope filter: HR site hanya lihat site sendiri
    const isHOScope = userRoles.some(r => ['super_admin', 'hr_ho', 'spv_she_ho', 'hrga'].includes(r))
    if (!isHOScope) {
      // HR/SHE site: hanya lihat site sendiri
      const { data: userEmp } = await supabaseAdmin
        .from('employees')
        .select('site')
        .eq('nrp', nrp)
        .single()
      if (userEmp?.site) {
        enriched = enriched.filter(r => r._employee?.site === userEmp.site)
      }
    }
    
    // Filter by site (manual)
    if (filterSite !== 'ALL') {
      enriched = enriched.filter(r => r._employee?.site === filterSite)
    }
    
    // Get sites list & jenis list
    const { data: sitesData } = await supabaseAdmin
      .from('employees')
      .select('site')
      .eq('status_karyawan', 'Aktif')
      .not('site', 'is', null)
    const sites = Array.from(new Set((sitesData || []).map((s: any) => s.site))).sort()
    
    const { data: masterList } = await supabaseAdmin
      .from('apd_master')
      .select('jenis_apd, icon')
      .eq('active', true)
      .order('urutan')
    
    // Count summary
    const { count: pendingCount } = await supabaseAdmin
      .from('apd_history')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING')
      .eq('input_source', 'KARYAWAN')
    
    return NextResponse.json({
      ok: true,
      total: enriched.length,
      pendingCount: pendingCount || 0,
      rows: enriched,
      sites,
      jenisList: masterList || []
    })
  } catch (e: any) {
    console.error('[APD VERIFY GET] Error:', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════
// POST — Approve / Reject request
// ═══════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  
  const session: any = auth.session!
  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const nrp = session.nrp
  
  const canVerify = userRoles.some(r => VERIFY_ROLES.includes(r))
  if (!canVerify) {
    return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
  }
  
  try {
    const body = await req.json()
    const { id, action, reject_reason } = body
    
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })
    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Action harus APPROVE atau REJECT' }, { status: 400 })
    }
    if (action === 'REJECT' && !reject_reason?.trim()) {
      return NextResponse.json({ error: 'Alasan penolakan wajib diisi' }, { status: 400 })
    }
    
    // Cek record existing
    const { data: existing, error: errExist } = await supabaseAdmin
      .from('apd_history')
      .select('*')
      .eq('id', id)
      .single()
    
    if (errExist || !existing) {
      return NextResponse.json({ error: 'Record tidak ditemukan' }, { status: 404 })
    }
    
    if (existing.status !== 'PENDING') {
      return NextResponse.json({ 
        error: `Record sudah berstatus ${existing.status}, tidak bisa diverifikasi lagi` 
      }, { status: 409 })
    }
    
    // Get master untuk hitung expired_at (kalau approve)
    const { data: master } = await supabaseAdmin
      .from('apd_master')
      .select('life_time_bulan')
      .eq('jenis_apd', existing.jenis_apd)
      .single()
    
    const now = new Date().toISOString()
    
    if (action === 'APPROVE') {
      // Hitung expired_at
      const terimaDate = new Date(existing.tanggal_terima)
      const lifetime = master?.life_time_bulan || 12
      terimaDate.setMonth(terimaDate.getMonth() + lifetime)
      const expired_at = terimaDate.toISOString().split('T')[0]
      
      // Hitung penerimaan_ke ulang berdasarkan yang sudah VERIFIED
      const { count: verifiedCount } = await supabaseAdmin
        .from('apd_history')
        .select('*', { count: 'exact', head: true })
        .eq('nrp', existing.nrp)
        .eq('jenis_apd', existing.jenis_apd)
        .eq('status', 'VERIFIED')
      
      const penerimaanKe = (verifiedCount || 0) + 1
      
      const { data: updated, error: errUpdate } = await supabaseAdmin
        .from('apd_history')
        .update({
          status: 'VERIFIED',
          verified_by: nrp,
          verified_at: now,
          expired_at,
          penerimaan_ke: penerimaanKe,
          updated_at: now
        })
        .eq('id', id)
        .select()
        .single()
      
      if (errUpdate) throw errUpdate
      
      // TODO Chat 23: Auto kurangi stok apd_stok
      // Untuk sekarang cukup ubah status, stok belum ada UI-nya
      
      return NextResponse.json({
        ok: true,
        message: `✅ Request ${existing.nama_karyawan} - ${existing.jenis_apd} disetujui`,
        data: updated
      })
    } else {
      // REJECT
      const { data: updated, error: errUpdate } = await supabaseAdmin
        .from('apd_history')
        .update({
          status: 'REJECTED',
          verified_by: nrp,
          verified_at: now,
          reject_reason: reject_reason.trim(),
          updated_at: now
        })
        .eq('id', id)
        .select()
        .single()
      
      if (errUpdate) throw errUpdate
      
      return NextResponse.json({
        ok: true,
        message: `❌ Request ${existing.nama_karyawan} - ${existing.jenis_apd} ditolak`,
        data: updated
      })
    }
  } catch (e: any) {
    console.error('[APD VERIFY POST] Error:', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}