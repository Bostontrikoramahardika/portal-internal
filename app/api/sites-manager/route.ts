// app/api/sites-manager/route.ts
// API untuk Kelola Master Site (Super Admin + HRGA)

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

// ============================================
// GET: Ambil daftar site + total karyawan + PJO
// ============================================
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    // Keamanan: Super Admin atau HRGA yang boleh akses
    const roles = session.roles || []
    const isAllowed = session.is_super_admin || 
                      roles.some((r: string) => ['hrga', 'hrga_pusat', 'hrga_site', 'admin'].includes(r))
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

    // 2. Ambil semua karyawan aktif (untuk hitung total per site)
    const { data: employees } = await supabase
      .from('employees')
      .select('nrp, nama, site, jabatan')
      .eq('status_karyawan', 'Aktif')

    // 3. Ambil semua roles PJO (untuk cari siapa PJO per site)
    const { data: pjoRoles } = await supabase
      .from('roles')
      .select('nrp, scope_site')
      .eq('role', 'pjo')
      .eq('active', true)

    // Enrich sites dengan total karyawan + PJO
    const enrichedSites = (sites || []).map(site => {
      // Hitung karyawan di site ini
      const empsInSite = (employees || []).filter(e => e.site === site.nama_site)
      const totalKaryawan = empsInSite.length

      // Cari PJO di site ini
      const pjoNrps = (pjoRoles || [])
        .filter(r => r.scope_site === site.nama_site || (!r.scope_site && site.is_pusat))
        .map(r => r.nrp)
      
      const pjoList = pjoNrps
        .map(nrp => {
          const emp = (employees || []).find(e => e.nrp === nrp)
          return emp ? { nrp: emp.nrp, nama: emp.nama, jabatan: emp.jabatan } : null
        })
        .filter(Boolean)

      return {
        ...site,
        total_karyawan: totalKaryawan,
        pjo_list: pjoList
      }
    })

    return NextResponse.json({ sites: enrichedSites })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ============================================
// PUT: Update konfigurasi site
// ============================================
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const roles = session.roles || []
    const isAllowed = session.is_super_admin || 
                      roles.some((r: string) => ['hrga', 'hrga_pusat', 'admin'].includes(r))
    if (!isAllowed) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const { id, updates } = body

    if (!id || !updates) {
      return NextResponse.json({ error: 'ID dan data update wajib diisi' }, { status: 400 })
    }

    // Whitelist kolom yang boleh diupdate (keamanan)
    const allowedFields = [
      'nama_site', 'kode_site', 'alamat',
      'siang_jam_masuk', 'siang_jam_pulang', 'siang_batas_telat',
      'malam_jam_masuk', 'malam_jam_pulang', 'malam_batas_telat',
      'latitude', 'longitude', 'radius_meter',
      'minus_terlambat', 'minus_mangkir', 'minus_sp1', 'minus_sp2', 'minus_sp3', 'minus_cnc',
      'active', 'is_active', 'is_pusat'
    ]

    const safeUpdates: any = {}
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        safeUpdates[key] = updates[key]
      }
    }

    const { error } = await supabase
      .from('sites_config')
      .update(safeUpdates)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Konfigurasi site berhasil diupdate',
      success: true 
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ============================================
// DELETE: Hapus site permanen
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    // Hanya Super Admin yang boleh hapus site permanen
    if (!session.is_super_admin) {
      return NextResponse.json({ error: 'Hanya Super Admin yang boleh menghapus site' }, { status: 403 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'ID site wajib diisi' }, { status: 400 })
    }

    // Cek dulu: apakah masih ada karyawan aktif di site ini?
    const { data: siteData } = await supabase
      .from('sites_config')
      .select('nama_site, is_pusat')
      .eq('id', id)
      .single()

    if (!siteData) {
      return NextResponse.json({ error: 'Site tidak ditemukan' }, { status: 404 })
    }

    // Jangan izinkan hapus site PUSAT
    if (siteData.is_pusat) {
      return NextResponse.json({ 
        error: 'Site Pusat (HO) tidak bisa dihapus' 
      }, { status: 400 })
    }

    // Cek karyawan aktif di site ini
    const { count: empCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('site', siteData.nama_site)
      .eq('status_karyawan', 'Aktif')

    if (empCount && empCount > 0) {
      return NextResponse.json({ 
        error: `Tidak bisa dihapus! Masih ada ${empCount} karyawan aktif di site ${siteData.nama_site}. Pindahkan atau nonaktifkan karyawan terlebih dahulu.`
      }, { status: 400 })
    }

    // Aman untuk dihapus
    const { error } = await supabase
      .from('sites_config')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `✅ Site "${siteData.nama_site}" berhasil dihapus permanen`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}