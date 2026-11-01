import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

export const maxDuration = 120

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

/** Kode absensi → nilai sah untuk kolom status & shift. */
const PETA: Record<string, { status: string; shift: string | null }> = {
  DS:  { status: 'HADIR',  shift: 'SIANG' },
  DW:  { status: 'HADIR',  shift: 'SIANG' },
  NS:  { status: 'HADIR',  shift: 'MALAM' },
  NW:  { status: 'HADIR',  shift: 'MALAM' },
  SCK: { status: 'HADIR',  shift: 'SIANG' },
  MCK: { status: 'HADIR',  shift: 'MALAM' },
  A:   { status: 'ALPHA',  shift: null },
  ALFA:{ status: 'ALPHA',  shift: null },
  I:   { status: 'IZIN',   shift: null },
  IR:  { status: 'IZIN',   shift: null },
  TR:  { status: 'IZIN',   shift: null },
  ID:  { status: 'IZIN',   shift: null },
  S:   { status: 'SAKIT',  shift: null },
  CT:  { status: 'CUTI',   shift: null },
  CR:  { status: 'CUTI',   shift: null },
  LV:  { status: 'CUTI',   shift: null },
  OFF: { status: 'LIBUR',  shift: null },
}

type Item = {
  nrp: string
  tanggal: string
  kode?: string
  roster_shift?: string | null
  clock_in?: string | null
  clock_out?: string | null
  keterangan?: string | null
}

/**
 * Simpan BANYAK sel sekaligus (hasil edit per hari yang dikumpulkan dulu di
 * layar). Satu sel = 1–3 query, jadi 50 sel selesai dalam hitungan detik.
 */
export async function POST(req: NextRequest) {
  const mulai = Date.now()
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session
  const { role, canEdit, isSuperAdmin } = peran(session)
  if (!canEdit) {
    return NextResponse.json({ error: 'Tidak punya izin edit' }, { status: 403 })
  }

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 })
  }
  const items: Item[] = Array.isArray(body?.items) ? body.items : []
  if (!items.length) return NextResponse.json({ error: 'Tidak ada perubahan untuk disimpan' }, { status: 400 })
  if (items.length > 400) {
    return NextResponse.json({ error: 'Maksimal 400 sel sekali simpan' }, { status: 400 })
  }

  const siteSaya = String(session?.scope_site || session?.site || '').trim()

  // peta site karyawan sekali ambil
  const nrpUnik = Array.from(new Set(items.map(i => String(i.nrp || '').trim()).filter(Boolean)))
  const petaSite: Record<string, string | null> = {}
  if (nrpUnik.length) {
    const { data: emps } = await supabaseAdmin
      .from('employees').select('nrp, site').in('nrp', nrpUnik)
    for (const e of (emps || []) as any[]) petaSite[String(e.nrp)] = e.site ?? null
  }

  const hasil: any[] = []

  for (const it of items) {
    const nrp = String(it.nrp || '').trim()
    const tanggal = String(it.tanggal || '').trim()
    if (!nrp || !tanggal) { hasil.push({ nrp, tanggal, ok: false, error: 'NRP/tanggal kosong' }); continue }

    if (!isSuperAdmin && ['hr_site', 'pjo_site', 'admin_site'].includes(role)) {
      const siteEmp = petaSite[nrp]
      if (siteSaya && siteEmp && String(siteEmp) !== siteSaya) {
        hasil.push({ nrp, tanggal, ok: false, error: `beda site (${siteEmp})` }); continue
      }
    }

    try {
      // 1) roster (kalau dikirim)
      if (it.roster_shift !== undefined) {
        const { data: rost } = await supabaseAdmin
          .from('rosters').select('id').eq('nrp', nrp).eq('tanggal', tanggal).limit(1)
        if (rost && rost.length) {
          const { error: eR } = await supabaseAdmin
            .from('rosters').update({ shift_code: it.roster_shift })
            .eq('nrp', nrp).eq('tanggal', tanggal)
          if (eR) { hasil.push({ nrp, tanggal, ok: false, error: 'roster: ' + eR.message }); continue }
        } else if (it.roster_shift) {
          const periode = new Date(tanggal).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase()
          const { error: eR } = await supabaseAdmin.from('rosters')
            .insert({ nrp, tanggal, shift_code: it.roster_shift, periode })
          if (eR) { hasil.push({ nrp, tanggal, ok: false, error: 'roster: ' + eR.message }); continue }
        }
      }

      // 2) attendance
      const kode = String(it.kode || '').toUpperCase().trim()
      if (!kode && it.clock_in === undefined && it.clock_out === undefined) {
        hasil.push({ nrp, tanggal, ok: true, dilewati: true }); continue
      }

      const target = PETA[kode]
      let jamKerja = 0
      if (it.clock_in && it.clock_out) {
        jamKerja = Math.max(0, Math.floor((new Date(it.clock_out).getTime() - new Date(it.clock_in).getTime()) / 60000))
      }
      const alasanBersih = String(it.keterangan || '').replace(/\[MANUAL:[A-Z]+\]\s*/gi, '').trim()
      const payload: any = {
        nrp,
        tanggal,
        site: petaSite[nrp] ?? null,
        updated_at: new Date().toISOString(),
      }
      if (it.kode !== undefined) payload.keterangan = kode ? `[MANUAL:${kode}] ${alasanBersih}`.trim() : (alasanBersih || null)
      if (target) { payload.status = target.status; payload.shift = target.shift }
      if (it.clock_in !== undefined) payload.clock_in = it.clock_in || null
      if (it.clock_out !== undefined) payload.clock_out = it.clock_out || null
      if (jamKerja > 0) payload.jam_kerja_menit = jamKerja

      const { data: ada } = await supabaseAdmin
        .from('attendance').select('id, shift, clock_in')
        .eq('nrp', nrp).eq('tanggal', tanggal)

      const baris = (ada || []) as any[]
      // pilih baris yang shift-nya cocok, kalau tidak ada pakai baris pertama
      const idTarget = (baris.find(b => (b.shift ?? null) === (payload.shift ?? null)) || baris[0])?.id || null

      let errTulis: string | null = null
      if (idTarget) {
        const { error } = await supabaseAdmin.from('attendance').update(payload).eq('id', idTarget)
        errTulis = error ? error.message : null
        if (errTulis && /duplicate key value/i.test(errTulis) && /attendance_nrp_tanggal_shift_key/i.test(errTulis)) {
          // baris kembar sisa import: buang yang shift sama & tanpa clock_in
          for (const b of baris) {
            if (b.id === idTarget) continue
            if ((b.shift ?? null) !== (payload.shift ?? null)) continue
            if (b.clock_in) continue
            await supabaseAdmin.from('attendance').delete().eq('id', b.id)
          }
          const ulang = await supabaseAdmin.from('attendance').update(payload).eq('id', idTarget)
          errTulis = ulang.error ? ulang.error.message : null
        }
      } else {
        const { error } = await supabaseAdmin.from('attendance').insert(payload)
        errTulis = error ? error.message : null
        if (errTulis && /duplicate key value/i.test(errTulis)) {
          // sudah ada baris dengan shift itu → ubah saja
          const { error: e2 } = await supabaseAdmin.from('attendance')
            .update(payload).eq('nrp', nrp).eq('tanggal', tanggal).eq('shift', payload.shift ?? null)
          errTulis = e2 ? e2.message : null
        }
      }

      hasil.push(errTulis
        ? { nrp, tanggal, ok: false, error: errTulis }
        : { nrp, tanggal, ok: true, kode })
    } catch (e: any) {
      hasil.push({ nrp, tanggal, ok: false, error: e?.message || 'gagal' })
    }
  }

  const gagal = hasil.filter(h => !h.ok)
  return NextResponse.json({
    ok: true,
    jumlah: items.length,
    jumlah_ok: items.length - gagal.length,
    jumlah_gagal: gagal.length,
    gagal: gagal.slice(0, 50),
    hasil,
    detik: Math.round((Date.now() - mulai) / 100) / 10,
  })
}
