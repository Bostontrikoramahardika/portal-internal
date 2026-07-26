import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

type SiteRow = {
  id: string
  nama_site: string
  kode_site: string | null
  alamat: string | null
  siang_jam_masuk: string | null
  siang_jam_pulang: string | null
  siang_batas_telat: number | null
  malam_jam_masuk: string | null
  malam_jam_pulang: string | null
  malam_batas_telat: number | null
  latitude: string | number | null
  longitude: string | number | null
  radius_meter: number | null
  active: boolean | null
  is_active: boolean | null
  is_pusat: boolean | null
}

type EmployeeRow = {
  nrp: string
  nama: string | null
  site: string | null
  departemen: string | null
  jabatan: string | null
  tanggal_resign: string | null
}

type RoleRow = {
  nrp: string
  role: string
}

const ALLOWED_ROLES = [
  'super_admin',
  'hr_ho',
  'director_ops',
  'business_dev',
  'manager_ops',
  'spv_she_ho',
]

const PIC_ROLES = [
  'pjo_site',
  'hr_site',
  'she_site',
  'gl_plant',
  'gl_produksi',
] as const

function normalizeText(value: unknown): string {
  return String(value || '').trim().toUpperCase()
}

function isAllowed(userRoles: string[]): boolean {
  return userRoles.some(role => ALLOWED_ROLES.includes(role))
}

function isSiteActive(site: SiteRow): boolean {
  return site.active !== false && site.is_active !== false
}

function employeeBelongsToSite(employeeSite: string | null, site: SiteRow): boolean {
  const empSite = normalizeText(employeeSite)
  const siteKode = normalizeText(site.kode_site)
  const siteNama = normalizeText(site.nama_site)

  // fallback sementara:
  // employee.site NULL / kosong dianggap masuk HO/PUSAT
  if (!empSite) {
    return !!site.is_pusat
  }

  return empSite === siteKode || empSite === siteNama
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status })
    }

    const session: any = auth.session!
    const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []

    if (!isAllowed(userRoles)) {
      return NextResponse.json(
        { error: 'Akses ditolak' },
        { status: 403 }
      )
    }

    const [sitesRes, employeesRes, rolesRes] = await Promise.all([
      supabaseAdmin
        .from('sites_config')
        .select(`
          id,
          nama_site,
          kode_site,
          alamat,
          siang_jam_masuk,
          siang_jam_pulang,
          siang_batas_telat,
          malam_jam_masuk,
          malam_jam_pulang,
          malam_batas_telat,
          latitude,
          longitude,
          radius_meter,
          active,
          is_active,
          is_pusat
        `),
      supabaseAdmin
        .from('employees')
        .select(`
          nrp,
          nama,
          site,
          departemen,
          jabatan,
          tanggal_resign
        `)
        .is('tanggal_resign', null),
      supabaseAdmin
        .from('roles')
        .select('nrp, role')
        .in('role', [...PIC_ROLES]),
    ])

    if (sitesRes.error) {
      return NextResponse.json(
        { error: `Gagal ambil sites_config: ${sitesRes.error.message}` },
        { status: 500 }
      )
    }

    if (employeesRes.error) {
      return NextResponse.json(
        { error: `Gagal ambil employees: ${employeesRes.error.message}` },
        { status: 500 }
      )
    }

    if (rolesRes.error) {
      return NextResponse.json(
        { error: `Gagal ambil roles: ${rolesRes.error.message}` },
        { status: 500 }
      )
    }

    const rawSites = ((sitesRes.data || []) as SiteRow[])
      .filter(isSiteActive)
      .sort((a, b) => {
        const pusatDiff = Number(!!b.is_pusat) - Number(!!a.is_pusat)
        if (pusatDiff !== 0) return pusatDiff
        return (a.nama_site || '').localeCompare(b.nama_site || '', 'id')
      })

    const employees = (employeesRes.data || []) as EmployeeRow[]
    const roles = (rolesRes.data || []) as RoleRow[]

    const employeeMap = new Map<string, EmployeeRow>()
    for (const emp of employees) {
      employeeMap.set(emp.nrp, emp)
    }

    const data = rawSites.map((site) => {
      const siteEmployees = employees.filter(emp => employeeBelongsToSite(emp.site, site))
      const siteRoles = roles.filter(roleRow => {
        const emp = employeeMap.get(roleRow.nrp)
        if (!emp) return false
        return employeeBelongsToSite(emp.site, site)
      })

      const roleBuckets = {
        pjo_site: [] as Array<{ nrp: string; nama: string | null; jabatan: string | null; departemen: string | null; site: string | null }>,
        hr_site: [] as Array<{ nrp: string; nama: string | null; jabatan: string | null; departemen: string | null; site: string | null }>,
        she_site: [] as Array<{ nrp: string; nama: string | null; jabatan: string | null; departemen: string | null; site: string | null }>,
        gl_plant: [] as Array<{ nrp: string; nama: string | null; jabatan: string | null; departemen: string | null; site: string | null }>,
        gl_produksi: [] as Array<{ nrp: string; nama: string | null; jabatan: string | null; departemen: string | null; site: string | null }>,
      }

      for (const roleRow of siteRoles) {
        const emp = employeeMap.get(roleRow.nrp)
        if (!emp) continue

        const item = {
          nrp: emp.nrp,
          nama: emp.nama,
          jabatan: emp.jabatan,
          departemen: emp.departemen,
          site: emp.site,
        }

        if (roleRow.role === 'pjo_site') roleBuckets.pjo_site.push(item)
        if (roleRow.role === 'hr_site') roleBuckets.hr_site.push(item)
        if (roleRow.role === 'she_site') roleBuckets.she_site.push(item)
        if (roleRow.role === 'gl_plant') roleBuckets.gl_plant.push(item)
        if (roleRow.role === 'gl_produksi') roleBuckets.gl_produksi.push(item)
      }

      return {
        id: site.id,
        nama_site: site.nama_site,
        kode_site: site.kode_site,
        alamat: site.alamat || '',
        is_pusat: !!site.is_pusat,
        active: isSiteActive(site),

        jam_kerja: {
          siang_jam_masuk: site.siang_jam_masuk,
          siang_jam_pulang: site.siang_jam_pulang,
          siang_batas_telat: site.siang_batas_telat,
          malam_jam_masuk: site.malam_jam_masuk,
          malam_jam_pulang: site.malam_jam_pulang,
          malam_batas_telat: site.malam_batas_telat,
        },

        gps: {
          latitude: site.latitude,
          longitude: site.longitude,
          radius_meter: site.radius_meter,
        },

        summary: {
          total_karyawan: siteEmployees.length,
          total_pjo: roleBuckets.pjo_site.length,
          total_hr: roleBuckets.hr_site.length,
          total_she: roleBuckets.she_site.length,
          total_gl_plant: roleBuckets.gl_plant.length,
          total_gl_produksi: roleBuckets.gl_produksi.length,
        },

        pics: roleBuckets,
      }
    })

    const totalNullSiteEmployees = employees.filter(emp => !normalizeText(emp.site)).length

    return NextResponse.json({
      ok: true,
      data,
      meta: {
        total_sites: data.length,
        total_active_employees: employees.length,
        total_null_site_employees: totalNullSiteEmployees,
        fallback_null_site_to_pusat: true,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}