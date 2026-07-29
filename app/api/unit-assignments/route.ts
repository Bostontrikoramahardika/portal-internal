// app/api/unit-assignments/route.ts
// CRUD Unit Assignments (assign operator ke unit per tanggal + shift)
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// ═══════════════════════════════════════════════════════
// GET - List assignment per tanggal + shift + site
// Return juga: master unit + available operators
// ═══════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  try {
    const { searchParams } = new URL(req.url)
    const tanggal = searchParams.get('tanggal') || ''
    const shift = searchParams.get('shift') || ''
    const site = searchParams.get('site') || ''

    if (!tanggal || !shift || !site) {
      return NextResponse.json({ 
        error: 'Tanggal, shift, dan site wajib diisi' 
      }, { status: 400 })
    }

    if (!['S','M'].includes(shift)) {
      return NextResponse.json({ error: 'Shift harus S atau M' }, { status: 400 })
    }

    // Access control
    const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
    const isSuperAdmin = userRoles.includes('super_admin')
    const isHRHO = userRoles.includes('hr_ho')
    if (!isSuperAdmin && !isHRHO) {
      const userSite = session.site || ''
      if (site !== userSite) {
        return NextResponse.json({ 
          error: `Anda hanya bisa akses site ${userSite}` 
        }, { status: 403 })
      }
    }

    // ─── 1. Ambil MASTER UNIT (aktif) di site ───
    const { data: units, error: unitErr } = await supabaseAdmin
      .from('unit_master')
      .select('*')
      .eq('site', site)
      .eq('active', true)
      .order('kategori', { ascending: true })
      .order('urutan', { ascending: true })

    if (unitErr) return NextResponse.json({ error: unitErr.message }, { status: 500 })

    // ─── 2. Ambil ASSIGNMENT existing untuk tanggal + shift ───
    const { data: assignments } = await supabaseAdmin
      .from('unit_assignments')
      .select('*')
      .eq('tanggal', tanggal)
      .eq('shift', shift)
      .eq('site', site)

    const assignMap = new Map<string, any>()
    ;(assignments || []).forEach(a => {
      assignMap.set(a.unit_kode, a)
    })

    // ─── 3. Ambil AVAILABLE OPERATORS (dari roster shift sama) ───
    const { data: rosters } = await supabaseAdmin
      .from('rosters')
      .select('nrp, shift_code, unit')
      .eq('tanggal', tanggal)
      .eq('shift_code', shift)

    const rosterNrps = (rosters || []).map(r => r.nrp)
    const rosterUnitMap = new Map<string, string | null>()
    ;(rosters || []).forEach(r => {
      rosterUnitMap.set(r.nrp, r.unit)
    })

    // Ambil detail karyawan (nama, jabatan)
    let operators: any[] = []
    if (rosterNrps.length > 0) {
      const { data: emps } = await supabaseAdmin
        .from('employees')
        .select('nrp, nama, jabatan, site')
        .in('nrp', rosterNrps)
        .eq('site', site)
        .is('tanggal_resign', null)

      operators = (emps || []).map(e => ({
        nrp: e.nrp,
        nama: e.nama,
        jabatan: e.jabatan,
        default_unit: rosterUnitMap.get(e.nrp) || null
      }))

      // Sort by jabatan lalu nama
      operators.sort((a, b) => {
        const j = (a.jabatan || '').localeCompare(b.jabatan || '')
        if (j !== 0) return j
        return (a.nama || '').localeCompare(b.nama || '')
      })
    }

    // ─── 4. Merge unit + assignment ───
    const unitsWithAssign = (units || []).map(u => {
      const a = assignMap.get(u.kode_unit)
      let assignedOperator: any = null
      if (a && a.nrp) {
        assignedOperator = operators.find(op => op.nrp === a.nrp) || {
          nrp: a.nrp,
          nama: '(tidak ditemukan)',
          jabatan: '-'
        }
      }
      return {
        ...u,
        assignment: a || null,
        assignedOperator,
        // Status yang dipakai (override master kalau ada assignment BD)
        effective_status: a?.status_unit || u.status
      }
    })

    // Group by kategori
    const grouped: Record<string, any[]> = {}
    unitsWithAssign.forEach(u => {
      if (!grouped[u.kategori]) grouped[u.kategori] = []
      grouped[u.kategori].push(u)
    })

    // Stats
    const totalUnit = unitsWithAssign.length
    const totalAssigned = unitsWithAssign.filter(u => u.assignment?.nrp).length
    const totalBD = unitsWithAssign.filter(u => u.effective_status === 'BD').length
    const totalKosong = totalUnit - totalAssigned - totalBD

    // Operator yang sudah di-assign (untuk highlight di dropdown)
    const assignedNrps = unitsWithAssign
      .filter(u => u.assignment?.nrp)
      .map(u => u.assignment.nrp)

    return NextResponse.json({
      ok: true,
      tanggal,
      shift,
      site,
      grouped,
      operators,
      assignedNrps,
      stats: {
        totalUnit,
        totalAssigned,
        totalBD,
        totalKosong,
        totalOperator: operators.length,
        operatorAssigned: assignedNrps.length,
        operatorSpare: operators.length - assignedNrps.length
      }
    })

  } catch (err: any) {
    console.error('[unit-assignments GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════
// POST - Bulk save assignment
// ═══════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const canAssign = userRoles.some(r => 
    ['super_admin', 'pjo_site', 'gl_produksi'].includes(r)
  )

  if (!canAssign) {
    return NextResponse.json({ 
      error: 'Tidak punya akses assign unit (super_admin, PJO, atau GL Produksi)' 
    }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { tanggal, shift, site, assignments } = body

    if (!tanggal || !shift || !site) {
      return NextResponse.json({ error: 'Tanggal, shift, site wajib' }, { status: 400 })
    }

    if (!Array.isArray(assignments)) {
      return NextResponse.json({ error: 'assignments harus array' }, { status: 400 })
    }

    // Access control site
    const isSuperAdmin = userRoles.includes('super_admin')
    if (!isSuperAdmin) {
      const userSite = session.site || ''
      if (site !== userSite) {
        return NextResponse.json({ 
          error: `Anda hanya bisa assign di site ${userSite}` 
        }, { status: 403 })
      }
    }

    // ─── Validasi duplikat operator ───
    const nrpSeen = new Set<string>()
    const duplicates: string[] = []
    assignments.forEach((a: any) => {
      if (a.nrp && a.nrp.trim()) {
        if (nrpSeen.has(a.nrp)) {
          duplicates.push(a.nrp)
        }
        nrpSeen.add(a.nrp)
      }
    })

    if (duplicates.length > 0) {
      return NextResponse.json({ 
        error: `Operator berikut di-assign lebih dari 1 unit: ${duplicates.join(', ')}. Setiap operator hanya boleh 1 unit per shift.` 
      }, { status: 400 })
    }

    // ─── DELETE existing untuk tanggal+shift+site ───
    const { error: delErr } = await supabaseAdmin
      .from('unit_assignments')
      .delete()
      .eq('tanggal', tanggal)
      .eq('shift', shift)
      .eq('site', site)

    if (delErr) {
      return NextResponse.json({ 
        error: 'Gagal reset assignment: ' + delErr.message 
      }, { status: 500 })
    }

    // ─── INSERT baru (skip yang kosong nrp+status RFU) ───
    const cleanAssignments = assignments
      .filter((a: any) => 
        // Simpan kalau ada nrp ATAU status BD (dengan keterangan)
        (a.nrp && a.nrp.trim()) || 
        (a.status_unit === 'BD')
      )
      .map((a: any) => ({
        tanggal,
        shift,
        unit_kode: a.unit_kode,
        nrp: a.nrp ? String(a.nrp).trim() : null,
        site,
        status_unit: a.status_unit || 'RFU',
        keterangan: a.keterangan || null,
        created_by: session.nrp || 'unknown'
      }))

    let inserted = 0
    if (cleanAssignments.length > 0) {
      const { error: insErr } = await supabaseAdmin
        .from('unit_assignments')
        .insert(cleanAssignments)

      if (insErr) {
        return NextResponse.json({ 
          error: 'Gagal insert: ' + insErr.message 
        }, { status: 500 })
      }
      inserted = cleanAssignments.length
    }

    return NextResponse.json({
      ok: true,
      message: `✅ Assignment berhasil disimpan (${inserted} unit)`,
      stats: {
        totalSaved: inserted,
        tanggal,
        shift,
        site
      }
    })

  } catch (err: any) {
    console.error('[unit-assignments POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════
// PUT - Copy assignment dari tanggal lain
// ═══════════════════════════════════════════════════════
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const canAssign = userRoles.some(r => 
    ['super_admin', 'pjo_site', 'gl_produksi'].includes(r)
  )

  if (!canAssign) {
    return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { 
      source_tanggal, source_shift, 
      target_tanggal, target_shift, 
      site 
    } = body

    if (!source_tanggal || !source_shift || !target_tanggal || !target_shift || !site) {
      return NextResponse.json({ 
        error: 'source_tanggal, source_shift, target_tanggal, target_shift, site wajib' 
      }, { status: 400 })
    }

    // Access control
    const isSuperAdmin = userRoles.includes('super_admin')
    if (!isSuperAdmin) {
      const userSite = session.site || ''
      if (site !== userSite) {
        return NextResponse.json({ 
          error: `Anda hanya bisa copy di site ${userSite}` 
        }, { status: 403 })
      }
    }

    // Ambil source assignments
    const { data: sourceAssigns } = await supabaseAdmin
      .from('unit_assignments')
      .select('*')
      .eq('tanggal', source_tanggal)
      .eq('shift', source_shift)
      .eq('site', site)

    if (!sourceAssigns || sourceAssigns.length === 0) {
      return NextResponse.json({ 
        error: `Tidak ada assignment di tanggal ${source_tanggal} shift ${source_shift}` 
      }, { status: 404 })
    }

    // Cek apakah operator di source masih shift target di target tanggal
    // (biar tidak assign operator yang OFF/CR di target tanggal)
    const sourceNrps = sourceAssigns.filter(a => a.nrp).map(a => a.nrp)
    const { data: targetRoster } = await supabaseAdmin
      .from('rosters')
      .select('nrp, shift_code')
      .eq('tanggal', target_tanggal)
      .in('nrp', sourceNrps)

    const validNrps = new Set(
      (targetRoster || [])
        .filter(r => r.shift_code === target_shift)
        .map(r => r.nrp)
    )

    // DELETE existing di target
    await supabaseAdmin
      .from('unit_assignments')
      .delete()
      .eq('tanggal', target_tanggal)
      .eq('shift', target_shift)
      .eq('site', site)

    // INSERT dari source (dengan filter validitas operator)
    const newAssigns = sourceAssigns.map(a => ({
      tanggal: target_tanggal,
      shift: target_shift,
      unit_kode: a.unit_kode,
      nrp: (a.nrp && validNrps.has(a.nrp)) ? a.nrp : null,
      site,
      status_unit: a.status_unit,
      keterangan: a.keterangan,
      created_by: session.nrp || 'unknown'
    }))

    const { error: insErr } = await supabaseAdmin
      .from('unit_assignments')
      .insert(newAssigns)

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    const validCount = newAssigns.filter(a => a.nrp).length
    const skippedCount = sourceAssigns.filter(a => a.nrp && !validNrps.has(a.nrp)).length

    return NextResponse.json({
      ok: true,
      message: `✅ Berhasil copy assignment. ${validCount} operator ter-copy${skippedCount > 0 ? `, ${skippedCount} operator dilewati (shift tidak sesuai)` : ''}`,
      stats: {
        totalUnit: newAssigns.length,
        operatorCopied: validCount,
        operatorSkipped: skippedCount
      }
    })

  } catch (err: any) {
    console.error('[unit-assignments PUT]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}