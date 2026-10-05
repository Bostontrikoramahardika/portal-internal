import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// ═══════════════════════════════════════════════════════════════
// 📈 DASHBOARD PRODUKSI — replika "Laporan Produksi" Excel
//   GET  ?bulan=YYYY-MM&site=  → semua angka dihitung di server
//   POST → simpan target bulanan (manual, sesuai Excel)
// Prinsip: HP hanya menerima angka jadi, bukan data mentah.
// Data tumbuh bertahap: import harian hanya menambah/memperbarui baris,
// tidak pernah menulis ulang seluruh tabel.
// ═══════════════════════════════════════════════════════════════

const ROLE_KELOLA = ['hr_site', 'hr_ho', 'admin_site']
const EGI_ORDER = ['PC200SPR', 'PC200RB', 'D65', 'D85', 'GD705']

/** Tebak kelompok EGI dari kode unit (fallback bila belum ada di ts_unit_config) */
function egiFallback(kode: string): { egi: string; jenis: string } {
  const k = String(kode || '').toUpperCase()
  if (k.startsWith('GD')) return { egi: 'GD705', jenis: 'Grader' }
  if (k.startsWith('D 65') || k.startsWith('D65')) return { egi: 'D65', jenis: 'Bulldozer' }
  if (k.startsWith('D 85') || k.startsWith('D85')) return { egi: 'D85', jenis: 'Bulldozer' }
  if (['E 205 B', 'E 206 B', 'E 207 B'].includes(k)) return { egi: 'PC200RB', jenis: 'Excavator' }
  if (k.startsWith('E')) return { egi: 'PC200SPR', jenis: 'Excavator' }
  return { egi: 'LAINNYA', jenis: '-' }
}

async function sesi(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value
  if (!token) return null
  return await getSession(token)
}

export async function GET(req: NextRequest) {
  try {
    const session = await sesi(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const bulan = searchParams.get('bulan') || new Date().toISOString().slice(0, 7)
    const site = searchParams.get('site') || 'PPA-MLP'

    const [th, bl] = bulan.split('-').map(Number)
    const hariBulan = new Date(th, bl, 0).getDate()
    const awal = `${bulan}-01`
    const akhir = `${bulan}-${String(hariBulan).padStart(2, '0')}`

    const { data: rows, error } = await supabaseAdmin
      .from('ts_opt')
      .select('tanggal, shift, kode_unit, hm_total, standby, pa, ma, ua, catatan')
      .eq('site', site)
      .gte('tanggal', awal)
      .lte('tanggal', akhir)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: target } = await supabaseAdmin
      .from('ts_target').select('*')
      .eq('site', site).eq('bulan', bulan).maybeSingle()

    const { data: konfig } = await supabaseAdmin.from('ts_unit_config').select('*')
    const petaKonfig: Record<string, any> = {}
    ;(konfig || []).forEach((k: any) => (petaKonfig[k.kode_unit] = k))

    // ── agregat ──
    const perHari: number[] = Array(hariBulan + 1).fill(0)
    const perHariDS: number[] = Array(hariBulan + 1).fill(0)
    const perHariNS: number[] = Array(hariBulan + 1).fill(0)
    const aktifPerHari: Record<number, Set<string>> = {}
    const semuaPerHari: Record<number, Set<string>> = {}

    let totalHM = 0
    let hmDS = 0
    let hmNS = 0
    let tglTerakhir: string | null = null

    type UnitAgg = {
      kode: string; mtd: number; s1: number; s2: number
      stb: number; shifts: number
      paSum: number; paCnt: number; maSum: number; maCnt: number
      ket: Set<string>
    }
    const perUnit: Record<string, UnitAgg> = {}

    for (const r of (rows || []) as any[]) {
      const hm = Number(r.hm_total || 0)
      const tgl = Number(String(r.tanggal).slice(8, 10))
      const shift = Number(r.shift)

      if (tgl >= 1 && tgl <= hariBulan) {
        perHari[tgl] += hm
        if (shift === 1) perHariDS[tgl] += hm
        else perHariNS[tgl] += hm
        if (!semuaPerHari[tgl]) semuaPerHari[tgl] = new Set()
        semuaPerHari[tgl].add(r.kode_unit)
        if (hm > 0) {
          if (!aktifPerHari[tgl]) aktifPerHari[tgl] = new Set()
          aktifPerHari[tgl].add(r.kode_unit)
        }
      }

      totalHM += hm
      if (shift === 1) hmDS += hm
      else hmNS += hm
      const t = String(r.tanggal)
      if (!tglTerakhir || t > tglTerakhir) tglTerakhir = t

      const u = perUnit[r.kode_unit] || (perUnit[r.kode_unit] = {
        kode: r.kode_unit, mtd: 0, s1: 0, s2: 0, stb: 0, shifts: 0,
        paSum: 0, paCnt: 0, maSum: 0, maCnt: 0, ket: new Set(),
      })
      u.mtd += hm
      if (shift === 1) u.s1 += hm
      else u.s2 += hm
      u.stb += Number(r.standby || 0)
      u.shifts += 1
      if (r.pa != null) { u.paSum += Number(r.pa); u.paCnt++ }
      if (r.ma != null) { u.maSum += Number(r.ma); u.maCnt++ }
      if (r.catatan) u.ket.add(String(r.catatan))
    }

    const hariTerisi = (rows || []).length
      ? Math.max(...perHari.map((v, i) => (v > 0 ? i : 0)))
      : 0
    const sisaHari = Math.max(hariBulan - hariTerisi, 0)

    // target & proyeksi (rumus mengikuti Excel)
    const targetJam = Number(target?.target_jam || 0)
    const faktor = Number(target?.faktor ?? 88)
    const tersisa = targetJam ? (targetJam * faktor) / 100 : 0
    const perHariTarget = sisaHari > 0 ? tersisa / sisaHari : 0
    const estimasi = hariTerisi > 0 ? (totalHM / hariTerisi) * hariBulan : 0
    const achievement = targetJam ? totalHM / targetJam : 0

    // ATR unit per hari (%) = unit beroperasi / unit tercatat hari itu
    const perHariAtr: (number | null)[] = []
    for (let i = 1; i <= hariBulan; i++) {
      const semua = semuaPerHari[i]
      const aktif = aktifPerHari[i]
      perHariAtr.push(semua && semua.size
        ? Math.round(((aktif?.size || 0) / semua.size) * 1000) / 10
        : null)
    }

    // per EGI
    const aggEGI: Record<string, { hm: number; paSum: number; paCnt: number; maSum: number; maCnt: number }> = {}
    for (const u of Object.values(perUnit)) {
      const cfg = petaKonfig[u.kode]
      const egi = cfg?.egi || egiFallback(u.kode).egi
      const a = aggEGI[egi] || (aggEGI[egi] = { hm: 0, paSum: 0, paCnt: 0, maSum: 0, maCnt: 0 })
      a.hm += u.mtd
      a.paSum += u.paSum; a.paCnt += u.paCnt
      a.maSum += u.maSum; a.maCnt += u.maCnt
    }
    const r2 = (n: number) => Math.round(n * 100) / 100
    const perEGI = EGI_ORDER.map((e) => {
      const a = aggEGI[e]
      return {
        egi: e,
        hm: r2(a?.hm || 0),
        avg: r2(a && hariTerisi ? a.hm / hariTerisi : 0),
        pa: a?.paCnt ? r2(a.paSum / a.paCnt) : null,
        ma: a?.maCnt ? r2(a.maSum / a.maCnt) : null,
      }
    })

    // baris per unit
    const unitRows = Object.values(perUnit)
      .map((u) => {
        const cfg = petaKonfig[u.kode] || {}
        const fb = egiFallback(u.kode)
        const fuelRate = cfg.fuel_lph != null ? Number(cfg.fuel_lph) : null
        return {
          kode: u.kode,
          jenis: cfg.jenis || fb.jenis,
          egi: cfg.egi || fb.egi,
          s1: r2(u.s1), s2: r2(u.s2), mtd: r2(u.mtd),
          pa: u.paCnt ? r2(u.paSum / u.paCnt) : null,
          ma: u.maCnt ? r2(u.maSum / u.maCnt) : null,
          ua: u.mtd + u.stb > 0 ? r2((u.mtd / (u.mtd + u.stb)) * 100) : null,
          fuel_lph: fuelRate,
          fuel_total: fuelRate != null ? r2(u.mtd * fuelRate) : null,
          ket: Array.from(u.ket).join(', ') || null,
        }
      })
      .sort((a, b) => (a.jenis + a.kode).localeCompare(b.jenis + b.kode))

    const bolehKelola = session.is_super_admin ||
      (session.roles || []).some((r) => ROLE_KELOLA.includes(r))

    return NextResponse.json({
      ok: true, site, bulan, hari_bulan: hariBulan,
      total_hm: r2(totalHM), hm_ds: r2(hmDS), hm_ns: r2(hmNS),
      per_hari: perHari.slice(1).map(r2),
      per_hari_ds: perHariDS.slice(1).map(r2),
      per_hari_ns: perHariNS.slice(1).map(r2),
      per_hari_atr: perHariAtr,
      hari_terisi: hariTerisi,
      tgl_terakhir: tglTerakhir,
      baris_data: (rows || []).length,
      target: target ? { target_jam: targetJam, faktor, tersisa: r2(tersisa) } : null,
      per_hari_target: r2(perHariTarget),
      estimasi: r2(estimasi),
      achievement_pct: Math.round(achievement * 10000) / 100,
      per_egi: perEGI,
      per_unit: unitRows,
      boleh_kelola: bolehKelola,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal memuat dashboard produksi' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await sesi(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const roles: string[] = session.roles || []
    const boleh = session.is_super_admin || roles.some((r) => ROLE_KELOLA.includes(r))
    if (!boleh) return NextResponse.json({ error: 'Hanya HR/Admin yang bisa mengubah target' }, { status: 403 })

    const body = await req.json()
    const site = String(body?.site || 'PPA-MLP')
    const bulan = String(body?.bulan || '')
    const targetJam = Number(body?.target_jam || 0)
    const faktor = body?.faktor != null ? Number(body.faktor) : 88

    if (!/^\d{4}-\d{2}$/.test(bulan)) return NextResponse.json({ error: 'bulan wajib YYYY-MM' }, { status: 400 })
    if (!(targetJam > 0)) return NextResponse.json({ error: 'target_jam wajib > 0' }, { status: 400 })

    const { data: ada } = await supabaseAdmin
      .from('ts_target').select('id').eq('site', site).eq('bulan', bulan).maybeSingle()

    if (ada) {
      const { error } = await supabaseAdmin.from('ts_target')
        .update({ target_jam: targetJam, faktor }).eq('id', (ada as any).id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await supabaseAdmin.from('ts_target')
        .insert({ site, bulan, target_jam: targetJam, faktor, dibuat_oleh: String(session.nrp) })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal menyimpan target' }, { status: 500 })
  }
}
