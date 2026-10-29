import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

const EDIT_ROLES = ['super_admin', 'hr_site', 'pjo_site', 'gl_produksi', 'gl_plant']
const PRIORITY_ROLES = [
  'super_admin', 'hr_ho', 'director_ops', 'business_dev', 'manager_ops', 'spv_she_ho',
  'pjo_site', 'pjo', 'gl_plant', 'gl_produksi', 'hr_site', 'she_site',
  'admin_site', 'admin_plant', 'atasan', 'employee'
]

function peran(session: any) {
  const userRoles: string[] = Array.isArray(session?.roles) ? session.roles : []
  const isSuperAdmin = Boolean(session?.is_super_admin) || userRoles.includes('super_admin')
  const role: string =
    session?.primaryRole ||
    PRIORITY_ROLES.find(r => userRoles.includes(r)) ||
    'employee'
  const canEdit =
    isSuperAdmin ||
    EDIT_ROLES.includes(role) ||
    userRoles.some(r => EDIT_ROLES.includes(r))
  return { userRoles, isSuperAdmin, role, canEdit }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session
  const { canEdit } = peran(session)
  if (!canEdit) {
    return NextResponse.json({ error: 'Tidak punya izin edit' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const nrp = String(searchParams.get('nrp') || '').trim()
  const tanggal = String(searchParams.get('tanggal') || '').trim()
  if (!nrp || !tanggal) {
    return NextResponse.json({ error: 'NRP dan tanggal wajib' }, { status: 400 })
  }

  const { data: eviden } = await supabaseAdmin
    .from('attendance_evidences')
    .select('id, kategori, tanggal, keterangan, foto_url, status_atasan')
    .eq('nrp', nrp)
    .eq('tanggal', tanggal)

  return NextResponse.json({ ok: true, eviden: eviden || [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session
  const { role, canEdit, isSuperAdmin } = peran(session)

  if (!canEdit) {
    return NextResponse.json({ error: 'Tidak punya izin edit' }, { status: 403 })
  }

  const body = await req.json()
  const { nrp, tanggal, roster_shift, status, clock_in, clock_out, shift, keterangan } = body

  if (!nrp || !tanggal) {
    return NextResponse.json({ error: 'NRP dan tanggal wajib' }, { status: 400 })
  }

  const siteSaya = String(session?.scope_site || session?.site || '').trim()

  if (!isSuperAdmin && ['hr_site', 'pjo_site', 'admin_site'].includes(role)) {
    const { data: emp, error: eEmp } = await supabaseAdmin
      .from('employees').select('site').eq('nrp', nrp).maybeSingle()
    if (eEmp) {
      return NextResponse.json({ error: 'Gagal baca karyawan: ' + eEmp.message }, { status: 500 })
    }
    if (!emp) {
      return NextResponse.json({ error: 'Karyawan tidak ditemukan: ' + nrp }, { status: 404 })
    }
    // kalau akun HR tidak punya site, jangan blokir
    if (siteSaya && emp.site && String(emp.site) !== siteSaya) {
      return NextResponse.json(
        { error: `Karyawan ini di site ${emp.site}, akun Anda di ${siteSaya}` },
        { status: 403 }
      )
    }
  }

  if (!isSuperAdmin && ['gl_plant', 'gl_produksi'].includes(role)) {
    const { data: bawahan } = await supabaseAdmin
      .from('approval_matrix').select('employee_nrp')
      .eq('atasan_nrp', session.nrp)
      .eq('employee_nrp', nrp)
      .eq('active', true)
      .limit(1)
    if (!bawahan || bawahan.length === 0) {
      return NextResponse.json({ error: 'Karyawan bukan bawahan Anda' }, { status: 403 })
    }
  }

  let updated: any = {}

  if (roster_shift !== undefined) {
    const { data: existing } = await supabaseAdmin
      .from('rosters').select('*')
      .eq('nrp', nrp).eq('tanggal', tanggal).limit(1)

    if (existing && existing.length > 0) {
      const { error: eR } = await supabaseAdmin
        .from('rosters')
        .update({ shift_code: roster_shift })
        .eq('nrp', nrp).eq('tanggal', tanggal)
      if (eR) return NextResponse.json({ error: 'Gagal simpan roster: ' + eR.message }, { status: 500 })
    } else if (roster_shift) {
      const periode = new Date(tanggal).toLocaleDateString('id-ID', {
        month: 'long', year: 'numeric'
      }).toUpperCase()
      const { error: eR } = await supabaseAdmin.from('rosters').insert({
        nrp, tanggal, shift_code: roster_shift, periode
      })
      if (eR) return NextResponse.json({ error: 'Gagal simpan roster: ' + eR.message }, { status: 500 })
    }
    updated.roster = roster_shift
  }

  if (status !== undefined || clock_in !== undefined || clock_out !== undefined) {
    const { data: existing } = await supabaseAdmin
      .from('attendance').select('*')
      .eq('nrp', nrp).eq('tanggal', tanggal).limit(1)

    let jam_kerja_menit = 0
    if (clock_in && clock_out) {
      const cIn  = new Date(clock_in).getTime()
      const cOut = new Date(clock_out).getTime()
      jam_kerja_menit = Math.floor((cOut - cIn) / 60000)
    }

    const { data: emp } = await supabaseAdmin
      .from('employees').select('site').eq('nrp', nrp).single()

    const payload: any = {
      nrp,
      tanggal,
      site: emp?.site || null,
      updated_at: new Date().toISOString()
    }
    if (status !== undefined) payload.status = status || null
    if (clock_in !== undefined) payload.clock_in = clock_in || null
    if (clock_out !== undefined) payload.clock_out = clock_out || null
    if (shift !== undefined) payload.shift = shift || null
    if (keterangan !== undefined) payload.keterangan = keterangan || null
    if (jam_kerja_menit > 0) payload.jam_kerja_menit = jam_kerja_menit

    // buang kolom yang tidak dikenal database, satu per satu, sampai berhasil
    async function tulis(tugas: 'update' | 'insert', data: any): Promise<string | null> {
      let coba = { ...data }
      for (let i = 0; i < 8; i++) {
        const q = tugas === 'update'
          ? supabaseAdmin.from('attendance').update(coba).eq('nrp', nrp).eq('tanggal', tanggal).select('id')
          : supabaseAdmin.from('attendance').insert(coba).select('id')
        const { data: hasil, error } = await q
        if (!error) return null
        // kolom tidak ada → buang lalu ulangi
        const m = error.message.match(/column "?([a-z_]+)"? .*does not exist/i)
          || error.message.match(/Could not find the '([a-z_]+)' column/i)
        if (m && m[1] && coba[m[1]] !== undefined) {
          delete coba[m[1]]
          continue
        }
        return error.message
      }
      return 'Gagal menulis data attendance'
    }

    const sudahAda = !!(existing && existing.length > 0)
    let errTulis = sudahAda ? await tulis('update', payload) : await tulis('insert', payload)

    // sudah ada tapi 0 baris ter-update → coba insert
    if (!errTulis && sudahAda) {
      const { data: cek } = await supabaseAdmin
        .from('attendance').select('id').eq('nrp', nrp).eq('tanggal', tanggal).limit(1)
      if (!cek || cek.length === 0) errTulis = await tulis('insert', payload)
    }

    if (errTulis) {
      return NextResponse.json({ error: 'Gagal simpan absensi: ' + errTulis }, { status: 500 })
    }

    // ── VERIFIKASI: baca ulang, pastikan benar-benar tersimpan ──
    const { data: sesudah } = await supabaseAdmin
      .from('attendance')
      .select('status, keterangan, shift, clock_in, clock_out')
      .eq('nrp', nrp).eq('tanggal', tanggal).maybeSingle()

    if (!sesudah) {
      return NextResponse.json(
        { error: 'Data tidak tersimpan (baris absensi tidak ditemukan setelah disimpan)' },
        { status: 500 }
      )
    }

    updated.attendance = sesudah
    updated.terverifikasi = {
      status: sesudah.status || null,
      keterangan: sesudah.keterangan || null,
      shift: sesudah.shift || null,
    }
  }

  return NextResponse.json({
    ok: true,
    message: 'Tersimpan' + (updated.terverifikasi ? ' & terverifikasi' : ''),
    updated,
    logged_by: session.nrp
  })
}
