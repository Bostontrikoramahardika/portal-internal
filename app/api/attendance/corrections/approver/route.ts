import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// PENENTU APPROVER REVISI ABSENSI (otomatis)
// Pemohon BUKAN GL : GL dept yang bertugas -> GL dept di site -> HR Site -> PJO Site
// Pemohon ADALAH GL: HR Site -> PJO Site
// HR Head Office TIDAK PERNAH dipakai.

const ROLE_GL = ['gl_plant', 'gl_produksi']

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const tanggal = searchParams.get('tanggal') || ''
    let shift = searchParams.get('shift') || ''
    if (!tanggal) return NextResponse.json({ error: 'Parameter tanggal wajib diisi' }, { status: 400 })

    const nrp = String(session.nrp)
    const site = session.site || null
    const roles: string[] = session.roles || []
    const pemohonGL = roles.some((r) => ROLE_GL.includes(r))

    const { data: pemohon } = await supabaseAdmin
      .from('employees')
      .select('nrp, nama, site, departemen, jabatan')
      .eq('nrp', nrp)
      .maybeSingle()

    const siteFinal = pemohon?.site || site
    const dept = String(pemohon?.departemen || '').toLowerCase()
    const jab = String(pemohon?.jabatan || '').toLowerCase()

    if (!shift) {
      const { data: absen } = await supabaseAdmin
        .from('attendance').select('shift')
        .eq('nrp', nrp).eq('tanggal', tanggal).maybeSingle()
      shift = absen?.shift || ''
    }

    const ambilPegawai = async (nrps: string[]) => {
      if (!nrps.length) return []
      const { data } = await supabaseAdmin
        .from('employees').select('nrp, nama, site, departemen, jabatan').in('nrp', nrps)
      return data || []
    }
    const ambilNrpBerRole = async (daftarRole: string[]) => {
      const { data } = await supabaseAdmin
        .from('roles').select('nrp, role, scope_site').in('role', daftarRole).eq('active', true)
      return data || []
    }
    const hasil = (approver: any, role: string, alasan: string, kandidat: any[] = []) =>
      NextResponse.json({
        ok: true, tanggal, shift: shift || null, pemohon_gl: pemohonGL,
        approver: approver ? {
          nrp: approver.nrp, nama: approver.nama,
          jabatan: approver.jabatan || null, role,
        } : null,
        alasan, kandidat,
      })

    const kePlant = dept.includes('plant') || /mekanik|mechanic|welder|tyre|electric|helper plant|service/.test(jab)
    const roleGLDept = kePlant ? 'gl_plant' : 'gl_produksi'

    const cariHRSite = async () => {
      const rows = await ambilNrpBerRole(['hr_site'])
      const sesuai = rows.filter((r: any) => !r.scope_site || String(r.scope_site) === String(siteFinal))
      const peg = await ambilPegawai(sesuai.map((r: any) => r.nrp))
      return peg.filter((p: any) => !siteFinal || p.site === siteFinal)
    }
    const cariPJOSite = async () => {
      const rows = await ambilNrpBerRole(['pjo_site'])
      const peg = await ambilPegawai(rows.map((r: any) => r.nrp))
      return peg.filter((p: any) => !siteFinal || p.site === siteFinal)
    }

    if (pemohonGL) {
      const hr = await cariHRSite()
      if (hr.length) return hasil(hr[0], 'hr_site', 'Pemohon seorang GL, approval ke HR Site', hr)
      const pjo = await cariPJOSite()
      if (pjo.length) return hasil(pjo[0], 'pjo_site', 'HR Site tidak tersedia, terpaksa ke PJO Site', pjo)
      return hasil(null, '', 'HR Site dan PJO Site tidak ditemukan di site ini')
    }

    const glRows = await ambilNrpBerRole([roleGLDept])
    const glNrps = glRows.map((r: any) => String(r.nrp))

    if (glNrps.length && shift) {
      let q = supabaseAdmin.from('attendance').select('nrp')
        .eq('tanggal', tanggal).eq('shift', shift).in('nrp', glNrps)
      if (siteFinal) q = q.eq('site', siteFinal)
      const { data: absenGL } = await q
      const nrpBertugas = Array.from(new Set((absenGL || []).map((a: any) => String(a.nrp))))
      const bertugas = await ambilPegawai(nrpBertugas)
      if (bertugas.length) {
        return hasil(bertugas[0], roleGLDept,
          'GL ' + (kePlant ? 'Plant' : 'Produksi') + ' yang bertugas pada ' + tanggal + ' shift ' + shift,
          bertugas)
      }
    }

    if (glNrps.length) {
      let glSite = await ambilPegawai(glNrps)
      glSite = glSite.filter((p: any) => !siteFinal || p.site === siteFinal)
      if (glSite.length) {
        return hasil(glSite[0], roleGLDept,
          'Tidak ada GL ' + (kePlant ? 'Plant' : 'Produksi') + ' yang absen pada shift tersebut, diarahkan ke GL departemen di site ini',
          glSite)
      }
    }

    const hr = await cariHRSite()
    if (hr.length) return hasil(hr[0], 'hr_site', 'GL departemen tidak ditemukan, approval ke HR Site', hr)

    const pjo = await cariPJOSite()
    if (pjo.length) return hasil(pjo[0], 'pjo_site', 'GL dan HR Site tidak tersedia, terpaksa ke PJO Site', pjo)

    return hasil(null, '', 'Tidak ada approver yang tersedia di site ini')
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal menentukan approver' }, { status: 500 })
  }
}