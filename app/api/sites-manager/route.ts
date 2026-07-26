// app/api/sites-manager/route.ts
// API untuk Kelola Master Site (Super Admin + HRGA) — v2.0 dengan PJO & Deputy

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import { logAudit, sessionToAuditActor } from '@/app/lib/auditLog'

// ============================================
// Helper: assign / copot role pjo_site
// ============================================
async function syncPjoRole(args: {
  oldPjoNrp: string | null
  oldDeputyNrp: string | null
  newPjoNrp: string | null
  newDeputyNrp: string | null
}) {
  const { oldPjoNrp, oldDeputyNrp, newPjoNrp, newDeputyNrp } = args

  const oldNrps = new Set([oldPjoNrp, oldDeputyNrp].filter(Boolean) as string[])
  const newNrps = new Set([newPjoNrp, newDeputyNrp].filter(Boolean) as string[])

  // Copot role pjo_site dari NRP lama yang sudah tidak dipakai
  const toRemove: string[] = []
  for (const nrp of oldNrps) {
    if (!newNrps.has(nrp)) toRemove.push(nrp)
  }

  // Tambah role pjo_site ke NRP baru yang belum punya
  const toAdd: string[] = []
  for (const nrp of newNrps) {
    if (!oldNrps.has(nrp)) toAdd.push(nrp)
  }

  // Copot
  for (const nrp of toRemove) {
    await supabase
      .from('roles')
      .delete()
      .eq('nrp', nrp)
      .eq('role', 'pjo_site')
  }

  // Tambah (pakai upsert biar aman kalau sudah ada)
  for (const nrp of toAdd) {
    await supabase
      .from('roles')
      .upsert(
        { nrp, role: 'pjo_site' },
        { onConflict: 'nrp,role', ignoreDuplicates: true }
      )
  }

  return { removed: toRemove, added: toAdd }
}

// ============================================
// GET: Ambil daftar site + PJO + Deputy
// ============================================
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const roles = session.roles || []
    const isAllowed = session.is_super_admin || 
                      roles.some((r: string) => ['hrga', 'hrga_pusat', 'hrga_site', 'hr_ho', 'admin'].includes(r))
    if (!isAllowed) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    // 1. Ambil semua sites config
    const { data: sites, error: sitesErr } = await supabase
      .from('sites_config')
      .select('*')
      .order('is_pusat', { ascending: false })
      .order('nama_site', { ascending: true })

    if (sitesErr) {
      return NextResponse.json({ error: sitesErr.message }, { status: 500 })
    }

    // 2. Ambil semua karyawan aktif
    const { data: employees } = await supabase
      .from('employees')
      .select('nrp, nama, site, jabatan, departemen')
      .is('tanggal_resign', null)

    // Enrich sites
    const enrichedSites = (sites || []).map(site => {
      const empsInSite = (employees || []).filter(e => e.site === site.nama_site)
      const pjoEmp = (employees || []).find(e => e.nrp === site.pjo_nrp)
      const deputyEmp = (employees || []).find(e => e.nrp === site.deputy_pjo_nrp)

      return {
        ...site,
        total_karyawan: empsInSite.length,
        pjo_info: pjoEmp ? {
          nrp: pjoEmp.nrp,
          nama: pjoEmp.nama,
          jabatan: pjoEmp.jabatan,
        } : null,
        deputy_info: deputyEmp ? {
          nrp: deputyEmp.nrp,
          nama: deputyEmp.nama,
          jabatan: deputyEmp.jabatan,
        } : null,
      }
    })

    // 3. Return + list karyawan (buat dropdown)
    return NextResponse.json({
      sites: enrichedSites,
      employees: (employees || []).map(e => ({
        nrp: e.nrp,
        nama: e.nama,
        site: e.site,
        jabatan: e.jabatan,
        departemen: e.departemen,
      })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ============================================
// PUT: Update konfigurasi site + sync PJO role
// ============================================
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const roles = session.roles || []
    const isAllowed = session.is_super_admin || 
                      roles.some((r: string) => ['hrga', 'hrga_pusat', 'hr_ho', 'admin'].includes(r))
    if (!isAllowed) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const { id, updates } = body

    if (!id || !updates) {
      return NextResponse.json({ error: 'ID dan data update wajib diisi' }, { status: 400 })
    }

    // Whitelist kolom yang boleh diupdate
    const allowedFields = [
      'nama_site', 'kode_site', 'alamat',
      'siang_jam_masuk', 'siang_jam_pulang', 'siang_batas_telat',
      'malam_jam_masuk', 'malam_jam_pulang', 'malam_batas_telat',
      'latitude', 'longitude', 'radius_meter',
      'minus_terlambat', 'minus_mangkir', 'minus_sp1', 'minus_sp2', 'minus_sp3', 'minus_cnc',
      'active', 'is_active', 'is_pusat',
      'pjo_nrp', 'deputy_pjo_nrp',  // ⭐ NEW
    ]

    const numericFields = [
      'siang_batas_telat', 'malam_batas_telat',
      'latitude', 'longitude', 'radius_meter',
      'minus_terlambat', 'minus_mangkir', 
      'minus_sp1', 'minus_sp2', 'minus_sp3', 'minus_cnc'
    ]
    
    const timeFields = [
      'siang_jam_masuk', 'siang_jam_pulang',
      'malam_jam_masuk', 'malam_jam_pulang'
    ]

    const safeUpdates: any = {}
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        let value = updates[key]

        if ((numericFields.includes(key) || timeFields.includes(key)) && 
            (value === '' || value === null || value === undefined)) {
          value = null
        }
        else if (numericFields.includes(key) && typeof value === 'string' && value !== '') {
          const num = parseFloat(value)
          value = isNaN(num) ? null : num
        }
        else if ((key === 'pjo_nrp' || key === 'deputy_pjo_nrp') && 
                 (value === '' || value === undefined)) {
          value = null
        }

        safeUpdates[key] = value
      }
    }

    // ═══ VALIDASI PJO & DEPUTY ═══
    const isChangingPjo = 'pjo_nrp' in safeUpdates
    const isChangingDeputy = 'deputy_pjo_nrp' in safeUpdates

    // Ambil data lama untuk sync role
    const { data: siteBeforeUpdate } = await supabase
      .from('sites_config')
      .select('nama_site, pjo_nrp, deputy_pjo_nrp')
      .eq('id', id)
      .single()

    if (!siteBeforeUpdate) {
      return NextResponse.json({ error: 'Site tidak ditemukan' }, { status: 404 })
    }

    // Tentukan nilai final PJO & Deputy
    const finalPjoNrp = isChangingPjo ? safeUpdates.pjo_nrp : siteBeforeUpdate.pjo_nrp
    const finalDeputyNrp = isChangingDeputy ? safeUpdates.deputy_pjo_nrp : siteBeforeUpdate.deputy_pjo_nrp

    // Validasi: PJO wajib (kalau field disentuh)
    if (isChangingPjo && !finalPjoNrp) {
      return NextResponse.json({ 
        error: 'PJO wajib diisi. Tidak boleh dikosongkan.' 
      }, { status: 400 })
    }

    // Validasi: PJO ≠ Deputy
    if (finalPjoNrp && finalDeputyNrp && finalPjoNrp === finalDeputyNrp) {
      return NextResponse.json({ 
        error: 'PJO dan Deputy PJO tidak boleh orang yang sama.' 
      }, { status: 400 })
    }

    // Validasi: NRP harus karyawan aktif
    if (isChangingPjo || isChangingDeputy) {
      const nrpsToCheck = [finalPjoNrp, finalDeputyNrp].filter(Boolean) as string[]
      if (nrpsToCheck.length > 0) {
        const { data: empCheck } = await supabase
          .from('employees')
          .select('nrp, nama, tanggal_resign')
          .in('nrp', nrpsToCheck)

        for (const nrp of nrpsToCheck) {
          const emp = (empCheck || []).find(e => e.nrp === nrp)
          if (!emp) {
            return NextResponse.json({ 
              error: `NRP ${nrp} tidak ditemukan di database karyawan.` 
            }, { status: 400 })
          }
          if (emp.tanggal_resign) {
            return NextResponse.json({ 
              error: `${emp.nama} sudah resign. Tidak bisa dijadikan PJO/Deputy.` 
            }, { status: 400 })
          }
        }
      }
    }

    // ═══ UPDATE SITE ═══
    const { error } = await supabase
      .from('sites_config')
      .update(safeUpdates)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ═══ SYNC ROLE pjo_site ═══
    let roleSync = null
    if (isChangingPjo || isChangingDeputy) {
      roleSync = await syncPjoRole({
        oldPjoNrp: siteBeforeUpdate.pjo_nrp,
        oldDeputyNrp: siteBeforeUpdate.deputy_pjo_nrp,
        newPjoNrp: finalPjoNrp,
        newDeputyNrp: finalDeputyNrp,
      })
    }

    // Catat audit log
    await logAudit({
      ...sessionToAuditActor(session),
      action: 'update_site',
      category: 'SITE',
      target_type: 'site',
      target_id: id,
      target_label: siteBeforeUpdate?.nama_site || 'Unknown',
      detail: { 
        updated_fields: Object.keys(safeUpdates),
        role_sync: roleSync,
      },
      req: request
    })

    return NextResponse.json({ 
      message: 'Konfigurasi site berhasil diupdate',
      success: true,
      role_sync: roleSync,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ============================================
// DELETE: Hapus site permanen (unchanged)
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    if (!session.is_super_admin) {
      return NextResponse.json({ error: 'Hanya Super Admin yang boleh menghapus site' }, { status: 403 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'ID site wajib diisi' }, { status: 400 })
    }

    const { data: siteData } = await supabase
      .from('sites_config')
      .select('nama_site, is_pusat')
      .eq('id', id)
      .single()

    if (!siteData) {
      return NextResponse.json({ error: 'Site tidak ditemukan' }, { status: 404 })
    }

    if (siteData.is_pusat) {
      return NextResponse.json({ 
        error: 'Site Pusat (HO) tidak bisa dihapus' 
      }, { status: 400 })
    }

    const { count: empCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('site', siteData.nama_site)
      .is('tanggal_resign', null)

    if (empCount && empCount > 0) {
      return NextResponse.json({ 
        error: `Tidak bisa dihapus! Masih ada ${empCount} karyawan aktif di site ${siteData.nama_site}.`
      }, { status: 400 })
    }

    const { error } = await supabase
      .from('sites_config')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAudit({
      ...sessionToAuditActor(session),
      action: 'delete_site',
      category: 'SITE',
      target_type: 'site',
      target_id: id,
      target_label: siteData.nama_site,
      detail: { note: 'Hapus permanen', is_pusat: siteData.is_pusat },
      req: request
    })

    return NextResponse.json({ 
      success: true,
      message: `✅ Site "${siteData.nama_site}" berhasil dihapus permanen`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}