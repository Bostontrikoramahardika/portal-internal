// app/api/attendance/kompensasi-cuti/route.ts
// MENYIMPAN KOMPENSASI CUTI (INPUT MANUAL HR)
// Dipakai oleh tabel Manajemen Absensi (kolom "Komp. Cuti").
//
// GET  /api/attendance/kompensasi-cuti?periode=2026-10&site=PPA-MLP
// POST /api/attendance/kompensasi-cuti   { nrp, periode, jumlah_hari, keterangan }
//
// Tabel: public.kompensasi_cuti (lihat sql/kompensasi-cuti.sql)

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

// yang boleh mengisi
const BOLEH_ISI = [
  'super_admin', 'hr_site', 'hrga_site', 'hr_ho', 'hrga', 'hrga_pusat', 'hrga_oprek',
  'admin', 'admin_site', 'admin_plant', 'pjo_site', 'pjo', 'gl_produksi', 'gl_plant',
]
// yang boleh melihat lintas site
const LINTAS_SITE = ['super_admin', 'hr_ho', 'hrga', 'hrga_pusat', 'hrga_oprek', 'admin']

function roles(session: any): string[] {
  return (Array.isArray(session?.roles) ? session.roles : []).map((r: any) => String(r).toLowerCase())
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const session: any = auth.session
  const r = roles(session)

  const { searchParams } = new URL(req.url)
  const periode = String(searchParams.get('periode') || '').slice(0, 7)

  if (!/^\d{4}-\d{2}$/.test(periode)) {
    return NextResponse.json({ ok: false, error: 'periode wajib (format YYYY-MM)' }, { status: 400 })
  }

  try {
    let q = supabaseAdmin
      .from('kompensasi_cuti')
      .select('nrp, periode, jumlah_hari, keterangan, diubah_oleh, updated_at')
      .eq('periode', periode)

    const { data, error } = await q
    if (error) throw error

    return NextResponse.json({ ok: true, periode, data: data || [] })
  } catch (e: any) {
    // tabel belum dibuat → jangan bikin halaman error
    return NextResponse.json({
      ok: true,
      periode,
      data: [],
      catatan: 'Tabel kompensasi_cuti belum ada. Jalankan sql/kompensasi-cuti.sql',
      detail: e?.message || null,
    })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status })
  const session: any = auth.session
  const r = roles(session)

  if (!r.some((x) => BOLEH_ISI.includes(x))) {
    return NextResponse.json({ ok: false, error: 'Tidak punya hak mengisi kompensasi cuti' }, { status: 403 })
  }

  let body: any = {}
  try { body = await req.json() } catch { /* ignore */ }

  const nrp = String(body?.nrp || '').trim()
  const periode = String(body?.periode || '').slice(0, 7)
  const jumlahRaw = body?.jumlah_hari
  const keterangan = String(body?.keterangan || '').slice(0, 500) || null

  if (!nrp) return NextResponse.json({ ok: false, error: 'NRP wajib' }, { status: 400 })
  if (!/^\d{4}-\d{2}$/.test(periode)) {
    return NextResponse.json({ ok: false, error: 'periode wajib (format YYYY-MM)' }, { status: 400 })
  }

  const jumlah = Number(jumlahRaw)
  if (!Number.isFinite(jumlah) || jumlah < 0 || jumlah > 31) {
    return NextResponse.json({ ok: false, error: 'Jumlah hari harus 0 – 31' }, { status: 400 })
  }

  // batasi lintas site: user site hanya boleh mengisi karyawan site-nya
  if (!r.some((x) => LINTAS_SITE.includes(x))) {
    const siteUser = String(session?.site || '')
    if (siteUser) {
      const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('site')
        .eq('nrp', nrp)
        .maybeSingle()
      if (emp && String(emp.site || '') !== siteUser) {
        return NextResponse.json({ ok: false, error: 'Karyawan ini bukan site Anda' }, { status: 403 })
      }
    }
  }

  const nilai = Math.round(jumlah * 10) / 10

  try {
    // 0 hari = hapus baris (biar tabel bersih)
    if (nilai === 0 && !keterangan) {
      const { error: delErr } = await supabaseAdmin
        .from('kompensasi_cuti')
        .delete()
        .eq('nrp', nrp)
        .eq('periode', periode)
      if (delErr) throw delErr
      return NextResponse.json({ ok: true, nrp, periode, jumlah_hari: 0, dihapus: true })
    }

    const { error } = await supabaseAdmin
      .from('kompensasi_cuti')
      .upsert(
        {
          nrp,
          periode,
          jumlah_hari: nilai,
          keterangan,
          diubah_oleh: String(session?.nrp || session?.nama || 'sistem'),
        },
        { onConflict: 'nrp,periode' }
      )

    if (error) throw error

    return NextResponse.json({ ok: true, nrp, periode, jumlah_hari: nilai })
  } catch (e: any) {
    const pesan = String(e?.message || '')
    const belumAdaTabel = /relation .*kompensasi_cuti.* does not exist|Could not find the table/i.test(pesan)
    return NextResponse.json({
      ok: false,
      error: belumAdaTabel
        ? 'Tabel kompensasi_cuti belum dibuat. Jalankan sql/kompensasi-cuti.sql di Supabase.'
        : (pesan || 'Gagal menyimpan'),
    }, { status: 500 })
  }
}
