// app/api/roster/history/route.ts
// GET: List roster per periode + site (dengan stats)
// DELETE: Hapus roster per periode + site
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// ═══════════════════════════════════════════════════════
// GET - List riwayat roster (grouped by site + periode)
// ═══════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  try {
    const { searchParams } = new URL(req.url)
    const site = searchParams.get('site') || ''
    const tahun = searchParams.get('tahun') || ''

    const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
    const isSuperAdmin = userRoles.includes('super_admin')
    const isHRHO = userRoles.includes('hr_ho')

    // Query rosters + join employees untuk dapat site
    // Karena RPC kompleks, kita ambil raw data lalu group di code
    let query = supabaseAdmin
      .from('rosters')
      .select('nrp, tanggal, shift_code, unit, site, updated_at, updated_by')
      .order('tanggal', { ascending: false })

    // Filter site
    if (site) {
      query = query.eq('site', site)
    } else if (!isSuperAdmin && !isHRHO) {
      // Non super/HR HO → hanya bisa lihat site sendiri
      const userSite = session.site || ''
      if (userSite) query = query.eq('site', userSite)
    }

    // Filter tahun
    if (tahun) {
      const startY = `${tahun}-01-01`
      const endY = `${tahun}-12-31`
      query = query.gte('tanggal', startY).lte('tanggal', endY)
    }

    const { data: rosters, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // ─── Group by site + periode (YYYY-MM) ───
    const grouped = new Map<string, {
      site: string
      periode: string
      periodeLabel: string
      tahun: number
      bulan: number
      totalShift: number
      uniqueNrps: Set<string>
      uniqueUnits: Set<string>
      lastUpdate: string | null
      lastUpdater: string | null
    }>()

    ;(rosters || []).forEach(r => {
      const date = new Date(r.tanggal)
      const yr = date.getFullYear()
      const mo = date.getMonth() + 1
      const periode = `${yr}-${String(mo).padStart(2, '0')}`
      const siteKey = r.site || 'UNKNOWN'
      const groupKey = `${siteKey}|${periode}`

      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          site: siteKey,
          periode,
          periodeLabel: new Date(yr, mo - 1)
            .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
          tahun: yr,
          bulan: mo,
          totalShift: 0,
          uniqueNrps: new Set(),
          uniqueUnits: new Set(),
          lastUpdate: null,
          lastUpdater: null
        })
      }

      const grp = grouped.get(groupKey)!
      grp.totalShift++
      grp.uniqueNrps.add(r.nrp)
      if (r.unit) grp.uniqueUnits.add(r.unit)

      // Track last update
      if (r.updated_at) {
        if (!grp.lastUpdate || new Date(r.updated_at) > new Date(grp.lastUpdate)) {
          grp.lastUpdate = r.updated_at
          grp.lastUpdater = r.updated_by
        }
      }
    })

    // Convert to array + sort by tahun desc, bulan desc, site asc
    const result = Array.from(grouped.values())
      .map(g => ({
        site: g.site,
        periode: g.periode,
        periodeLabel: g.periodeLabel,
        tahun: g.tahun,
        bulan: g.bulan,
        totalShift: g.totalShift,
        totalKaryawan: g.uniqueNrps.size,
        totalUnit: g.uniqueUnits.size,
        lastUpdate: g.lastUpdate,
        lastUpdater: g.lastUpdater
      }))
      .sort((a, b) => {
        if (a.tahun !== b.tahun) return b.tahun - a.tahun
        if (a.bulan !== b.bulan) return b.bulan - a.bulan
        return a.site.localeCompare(b.site)
      })

    // Ambil list site & tahun unique untuk filter dropdown
    const availableSites = [...new Set(result.map(r => r.site))].sort()
    const availableYears = [...new Set(result.map(r => r.tahun))].sort((a, b) => b - a)

    return NextResponse.json({
      ok: true,
      data: result,
      total: result.length,
      filters: {
        availableSites,
        availableYears
      }
    })

  } catch (err: any) {
    console.error('[roster/history GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════
// DELETE - Hapus roster per site + periode
// ═══════════════════════════════════════════════════════
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const canDelete = userRoles.some(r => 
    ['super_admin', 'hr_ho', 'hr_site', 'pjo_site'].includes(r)
  )

  if (!canDelete) {
    return NextResponse.json({ error: 'Tidak punya akses hapus roster' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const bulan = searchParams.get('bulan') // "2026-08"
    const site = searchParams.get('site')

    if (!bulan) {
      return NextResponse.json({ error: 'Bulan wajib diisi (?bulan=YYYY-MM)' }, { status: 400 })
    }
    if (!site) {
      return NextResponse.json({ error: 'Site wajib diisi (?site=...)' }, { status: 400 })
    }

    const [tahun, bln] = bulan.split('-').map(Number)
    if (!tahun || !bln || bln < 1 || bln > 12) {
      return NextResponse.json({ error: 'Format bulan tidak valid' }, { status: 400 })
    }

    const jmlHari = new Date(tahun, bln, 0).getDate()
    const startDate = `${tahun}-${String(bln).padStart(2, '0')}-01`
    const endDate = `${tahun}-${String(bln).padStart(2, '0')}-${String(jmlHari).padStart(2, '0')}`

    // Hitung dulu berapa row yang akan dihapus
    const { count: totalBefore } = await supabaseAdmin
      .from('rosters')
      .select('nrp', { count: 'exact', head: true })
      .eq('site', site)
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)

    if (!totalBefore || totalBefore === 0) {
      return NextResponse.json({ 
        error: `Tidak ada roster untuk ${site} periode ${bulan}` 
      }, { status: 404 })
    }

    // DELETE
    const { error } = await supabaseAdmin
      .from('rosters')
      .delete()
      .eq('site', site)
      .gte('tanggal', startDate)
      .lte('tanggal', endDate)

    if (error) {
      return NextResponse.json({ error: 'Gagal hapus: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: `✅ Roster ${site} periode ${bulan} berhasil dihapus`,
      stats: {
        totalDeleted: totalBefore,
        site,
        periode: bulan,
        deletedBy: session.nrp || 'unknown',
        deletedAt: new Date().toISOString()
      }
    })

  } catch (err: any) {
    console.error('[roster/history DELETE]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}