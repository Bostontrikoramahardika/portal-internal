import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// ═══════════════════════════════════════════════════════════════
// 📈 DASHBOARD PRODUKSI — dari TS Opt (import harian)
//   GET  ?bulan=YYYY-MM&site=
//   POST → simpan target bulanan + acuan PA/MA
// Permission tidak diubah.
// ═══════════════════════════════════════════════════════════════

const ROLE_KELOLA = ['hr_site', 'hr_ho', 'admin_site']
const EGI_ORDER = ['PC200SPR', 'PC200RB', 'D65', 'D85', 'GD705']
const JENIS_ORDER = ['Excavator', 'Bulldozer', 'Grader']

function egiFallback(kode: string): { egi: string; jenis: string } {
  const k = String(kode || '').toUpperCase()
  if (k.startsWith('GD')) return { egi: 'GD705', jenis: 'Grader' }
  if (k.startsWith('D 65') || k.startsWith('D65')) return { egi: 'D65', jenis: 'Bulldozer' }
  if (k.startsWith('D 85') || k.startsWith('D85')) return { egi: 'D85', jenis: 'Bulldozer' }
  if (['E 205 B', 'E 206 B', 'E 207 B'].includes(k)) return { egi: 'PC200RB', jenis: 'Excavator' }
  if (k.startsWith('E')) return { egi: 'PC200SPR', jenis: 'Excavator' }
  return { egi: 'LAINNYA', jenis: '-' }
}

/** PA/MA/UA di TS Opt sering 0–1 (1 = 100%). */
function normPct(n: any): number | null {
  if (n == null || n === '') return null
  const v = Number(n)
  if (!isFinite(v)) return null
  return v <= 1.5 ? v * 100 : v
}

function r2(n: number) {
  return Math.round(n * 100) / 100
}

async function sesi(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value
  if (!token) return null
  return await getSession(token)
}

function isoWeekKey(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const y = t.getUTCFullYear()
  const w = Math.ceil((((t.getTime() - Date.UTC(y, 0, 1)) / 86400000) + 1) / 7)
  return `${y}-W${String(w).padStart(2, '0')}`
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
      .select('tanggal, shift, kode_unit, tipe_unit, nama_operator, hm_awal, hm_akhir, hm_total, hm_over, standby, pa, ma, ua, catatan')
      .eq('site', site)
      .gte('tanggal', awal)
      .lte('tanggal', akhir)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: target } = await supabaseAdmin
      .from('ts_target').select('*')
      .eq('site', site).eq('bulan', bulan).maybeSingle()

    const { data: konfig } = await supabaseAdmin.from('ts_unit_config').select('*')
    const { data: fcRows } = await supabaseAdmin.from('ts_fc_target').select('egi, fc_target').eq('site', site)
    const petaFc: Record<string, number> = {}
    ;(fcRows || []).forEach((r: any) => {
      if (r.egi != null && r.fc_target != null) petaFc[String(r.egi)] = Number(r.fc_target)
    })
    const petaKonfig: Record<string, any> = {}
    ;(konfig || []).forEach((k: any) => (petaKonfig[k.kode_unit] = k))

    const perHari: number[] = Array(hariBulan + 1).fill(0)
    const perHariDS: number[] = Array(hariBulan + 1).fill(0)
    const perHariNS: number[] = Array(hariBulan + 1).fill(0)
    const perHariStb: number[] = Array(hariBulan + 1).fill(0)
    const aktifPerHari: Record<number, Set<string>> = {}
    const semuaPerHari: Record<number, Set<string>> = {}

    let totalHM = 0
    let totalStb = 0
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

    type OpAgg = {
      nama: string; unit: string; jenis: string; egi: string
      hm: number; stb: number; over: number
      paSum: number; paCnt: number; maSum: number; maCnt: number
      uaKosong: number; baris: number
      catatan: string[]
      hari: { tgl: string; shift: number; hm: number; awal: number | null; akhir: number | null }[]
    }
    const perOp: Record<string, OpAgg> = {}

    type Wk = { key: string; hm: number; stb: number; fuel: number; paSum: number; paCnt: number; maSum: number; maCnt: number; uaSum: number; uaCnt: number; min: string; max: string }
    const perMinggu: Record<string, Wk> = {}

    for (const r of (rows || []) as any[]) {
      const hm = Number(r.hm_total || 0)
      const stb = Number(r.standby || 0)
      const tglStr = String(r.tanggal).slice(0, 10)
      const tgl = Number(tglStr.slice(8, 10))
      const shift = Number(r.shift)
      const pa = normPct(r.pa)
      const ma = normPct(r.ma)
      const ua = normPct(r.ua)
      const fb = egiFallback(r.kode_unit)
      const cfg = petaKonfig[r.kode_unit] || {}
      const egi = cfg.egi || fb.egi
      const jenis = cfg.jenis || fb.jenis

      if (tgl >= 1 && tgl <= hariBulan) {
        perHari[tgl] += hm
        perHariStb[tgl] += stb
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
      totalStb += stb
      if (shift === 1) hmDS += hm
      else hmNS += hm
      if (!tglTerakhir || tglStr > tglTerakhir) tglTerakhir = tglStr

      const u = perUnit[r.kode_unit] || (perUnit[r.kode_unit] = {
        kode: r.kode_unit, mtd: 0, s1: 0, s2: 0, stb: 0, shifts: 0,
        paSum: 0, paCnt: 0, maSum: 0, maCnt: 0, ket: new Set(),
      })
      u.mtd += hm
      if (shift === 1) u.s1 += hm
      else u.s2 += hm
      u.stb += stb
      u.shifts += 1
      if (pa != null) { u.paSum += pa; u.paCnt++ }
      if (ma != null) { u.maSum += ma; u.maCnt++ }
      if (r.catatan) u.ket.add(String(r.catatan))

      const nama = String(r.nama_operator || '').trim() || 'TANPA NAMA'
      const opKey = `${nama}|${r.kode_unit}`
      const o = perOp[opKey] || (perOp[opKey] = {
        nama, unit: r.kode_unit, jenis, egi,
        hm: 0, stb: 0, over: 0, paSum: 0, paCnt: 0, maSum: 0, maCnt: 0,
        uaKosong: 0, baris: 0, catatan: [], hari: [],
      })
      o.hm += hm
      o.stb += stb
      o.over += Number(r.hm_over || 0)
      o.baris += 1
      if (pa != null) { o.paSum += pa; o.paCnt++ }
      if (ma != null) { o.maSum += ma; o.maCnt++ }
      if (ua == null && hm > 0) o.uaKosong += 1
      if (r.catatan) o.catatan.push(String(r.catatan))
      o.hari.push({
        tgl: tglStr, shift,
        hm: r2(hm),
        awal: r.hm_awal != null ? Number(r.hm_awal) : null,
        akhir: r.hm_akhir != null ? Number(r.hm_akhir) : null,
      })

      const wk = isoWeekKey(tglStr)
      const w = perMinggu[wk] || (perMinggu[wk] = {
        key: wk, hm: 0, stb: 0, fuel: 0, paSum: 0, paCnt: 0, maSum: 0, maCnt: 0, uaSum: 0, uaCnt: 0, min: tglStr, max: tglStr,
      })
      w.hm += hm
      w.stb += stb
      const fuelRateRow = cfg.fuel_lph != null ? Number(cfg.fuel_lph) : null
      if (fuelRateRow != null && isFinite(fuelRateRow)) w.fuel += fuelRateRow * hm
      if (tglStr < w.min) w.min = tglStr
      if (tglStr > w.max) w.max = tglStr
      if (pa != null) { w.paSum += pa; w.paCnt++ }
      if (ma != null) { w.maSum += ma; w.maCnt++ }
      if (ua != null) { w.uaSum += ua; w.uaCnt++ }
    }

    const hariTerisi = (rows || []).length
      ? Math.max(...perHari.map((v, i) => (v > 0 ? i : 0)))
      : 0
    const sisaHari = Math.max(hariBulan - hariTerisi, 0)

    const targetJam = Number(target?.target_jam || 0)
    const faktor = Number(target?.faktor ?? 88)
    const tersisa = targetJam ? (targetJam * faktor) / 100 : 0
    const perHariTarget = sisaHari > 0 ? tersisa / sisaHari : 0
    const targetHarianKalender = targetJam && hariBulan ? targetJam / hariBulan : 0
    const estimasi = hariTerisi > 0 ? (totalHM / hariTerisi) * hariBulan : 0
    const achievement = targetJam ? totalHM / targetJam : 0
    const paTarget = target?.pa_target != null ? Number(target.pa_target) : 90
    const maTarget = target?.ma_target != null ? Number(target.ma_target) : 92

    const perHariAtr: (number | null)[] = []
    for (let i = 1; i <= hariBulan; i++) {
      const semua = semuaPerHari[i]
      const aktif = aktifPerHari[i]
      perHariAtr.push(semua && semua.size
        ? Math.round(((aktif?.size || 0) / semua.size) * 1000) / 10
        : null)
    }

    const aggEGI: Record<string, { hm: number; stb: number; fuel: number; paSum: number; paCnt: number; maSum: number; maCnt: number }> = {}
    for (const u of Object.values(perUnit)) {
      const cfg = petaKonfig[u.kode]
      const egi = cfg?.egi || egiFallback(u.kode).egi
      const a = aggEGI[egi] || (aggEGI[egi] = { hm: 0, stb: 0, fuel: 0, paSum: 0, paCnt: 0, maSum: 0, maCnt: 0 })
      a.hm += u.mtd
      a.stb += u.stb
      const fr = cfg?.fuel_lph != null ? Number(cfg.fuel_lph) : 0
      if (fr) a.fuel += u.mtd * fr
      a.paSum += u.paSum; a.paCnt += u.paCnt
      a.maSum += u.maSum; a.maCnt += u.maCnt
    }
    const perEGI = EGI_ORDER.map((e) => {
      const a = aggEGI[e]
      const hm = a?.hm || 0
      const stb = a?.stb || 0
      const fuel = a?.fuel || 0
      const fcAkt = hm && fuel ? r2(fuel / hm) : null
      const fcT = petaFc[e] != null ? Number(petaFc[e]) : null
      return {
        egi: e,
        hm: r2(hm),
        avg: r2(a && hariTerisi ? hm / hariTerisi : 0),
        pa: a?.paCnt ? r2(a.paSum / a.paCnt) : null,
        ma: a?.maCnt ? r2(a.maSum / a.maCnt) : null,
        ua: hm + stb > 0 ? r2((hm / (hm + stb)) * 100) : null,
        fuel: r2(fuel),
        fc: fcAkt,
        fc_target: fcT,
        fc_vs_pct: fcAkt != null && fcT ? r2(((fcAkt - fcT) / fcT) * 100) : null,
      }
    })

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
          tarif_hm: cfg.tarif_hm != null ? Number(cfg.tarif_hm) : null,
          ket: Array.from(u.ket).join(', ') || null,
        }
      })
      .sort((a, b) => (a.jenis + a.kode).localeCompare(b.jenis + b.kode))

    const adaKode = new Set(unitRows.map((u) => u.kode))
    const armada = [
      ...unitRows.map((u) => ({ kode: u.kode, jenis: u.jenis, egi: u.egi, tarif_hm: u.tarif_hm })),
      ...(konfig || []).filter((k: any) => !adaKode.has(k.kode_unit)).map((k: any) => ({
        kode: k.kode_unit, jenis: k.jenis || egiFallback(k.kode_unit).jenis,
        egi: k.egi || egiFallback(k.kode_unit).egi,
        tarif_hm: k.tarif_hm != null ? Number(k.tarif_hm) : null,
      })),
    ].sort((a, b) => (a.jenis + a.kode).localeCompare(b.jenis + b.kode))

    let revenueTotal = 0
    let revenueIsi = 0
    for (const u of unitRows) {
      if (u.tarif_hm != null && u.mtd) {
        revenueTotal += u.mtd * u.tarif_hm
        revenueIsi++
      }
    }

    const opList = Object.values(perOp).map((o) => {
      o.hari.sort((a, b) => a.tgl.localeCompare(b.tgl) || a.shift - b.shift)
      return {
        nama: o.nama,
        unit: o.unit,
        jenis: o.jenis,
        egi: o.egi,
        hm: r2(o.hm),
        stb: r2(o.stb),
        over: r2(o.over),
        pa: o.paCnt ? r2(o.paSum / o.paCnt) : null,
        ma: o.maCnt ? r2(o.maSum / o.maCnt) : null,
        ua_kosong: o.uaKosong,
        hari: o.hari,
        catatan: Array.from(new Set(o.catatan)).slice(0, 3),
      }
    }).sort((a, b) => b.hm - a.hm)

    const avgJenis: Record<string, number> = {}
    for (const j of JENIS_ORDER) {
      const list = opList.filter((o) => o.jenis === j && o.hm > 0)
      avgJenis[j] = list.length ? list.reduce((s, o) => s + o.hm, 0) / list.length : 0
    }

    function topN(jenis: string, n: number, asc: boolean) {
      return opList
        .filter((o) => o.jenis === jenis && o.hm > 0)
        .sort((a, b) => asc ? a.hm - b.hm : b.hm - a.hm)
        .slice(0, n)
        .map((o) => ({ nama: o.nama, unit: o.unit, hm: o.hm, avg: r2(avgJenis[jenis] || 0) }))
    }

    const top_egi = Object.fromEntries(JENIS_ORDER.map((j) => [j, topN(j, 2, false)]))
    const low_egi = Object.fromEntries(JENIS_ORDER.map((j) => [j, topN(j, 2, true)]))

    const cek: { tag: string; teks: string }[] = []
    for (const o of opList) {
      if (o.ua_kosong > 0) cek.push({ tag: 'UA kosong', teks: `${o.nama} · ${o.unit} — ${o.ua_kosong} baris UA kosong` })
      if (o.hm > 0 && o.stb > o.hm) cek.push({ tag: 'STB > HM', teks: `${o.nama} · STB ${o.stb} > HM ${o.hm}` })
      if (o.catatan.length) cek.push({ tag: 'Catatan BD', teks: `${o.nama} · ${o.catatan[0]}` })
      if (o.hari.some((h) => h.hm === 0)) cek.push({ tag: 'HM 0', teks: `${o.nama} punya shift HM 0` })
      const avg = avgJenis[o.jenis]
      if (o.hm > 0 && avg > 0 && o.hm < avg * 0.7) {
        cek.push({ tag: 'Di bawah avg EGI', teks: `${o.nama} ${o.hm} HM vs avg ${o.jenis} ${r2(avg)}` })
      }
    }

    const minggu = Object.values(perMinggu)
      .sort((a, b) => a.min.localeCompare(b.min))
      .map((w) => ({
        kunci: w.key,
        label: `${w.min.slice(8, 10)}–${w.max.slice(8, 10)} ${bulan}`,
        hm: r2(w.hm),
        stb: r2(w.stb),
        pa: w.paCnt ? r2(w.paSum / w.paCnt) : null,
        ma: w.maCnt ? r2(w.maSum / w.maCnt) : null,
        ua: w.uaCnt ? r2(w.uaSum / w.uaCnt) : (w.hm + w.stb > 0 ? r2((w.hm / (w.hm + w.stb)) * 100) : null),
        fuel: r2(w.fuel || 0),
        fc: w.hm && w.fuel ? r2(w.fuel / w.hm) : null,
      }))

    const bolehKelola = session.is_super_admin ||
      (session.roles || []).some((r) => ROLE_KELOLA.includes(r))

    let cuaca: any = null
    if (tglTerakhir) {
      const { data: cw, error: cwErr } = await supabaseAdmin
        .from('produksi_cuaca')
        .select('tanggal, cuaca_s1, cuaca_s2')
        .eq('site', site).lte('tanggal', tglTerakhir)
        .order('tanggal', { ascending: false }).limit(1)
      cuaca = cwErr ? null : cw?.[0] || null
    }

    return NextResponse.json({
      ok: true, site, bulan, hari_bulan: hariBulan,
      total_hm: r2(totalHM), hm_ds: r2(hmDS), hm_ns: r2(hmNS),
      total_stb: r2(totalStb),
      per_hari: perHari.slice(1).map(r2),
      per_hari_ds: perHariDS.slice(1).map(r2),
      per_hari_ns: perHariNS.slice(1).map(r2),
      per_hari_stb: perHariStb.slice(1).map(r2),
      per_hari_atr: perHariAtr,
      hari_terisi: hariTerisi,
      tgl_terakhir: tglTerakhir,
      baris_data: (rows || []).length,
      target: target ? {
        target_jam: targetJam, faktor, tersisa: r2(tersisa),
        pa_target: paTarget, ma_target: maTarget,
      } : { target_jam: 0, faktor: 88, tersisa: 0, pa_target: paTarget, ma_target: maTarget },
      per_hari_target: r2(perHariTarget),
      target_harian: r2(targetHarianKalender),
      estimasi: r2(estimasi),
      achievement_pct: Math.round(achievement * 10000) / 100,
      per_egi: perEGI,
      fc_target: Object.fromEntries(EGI_ORDER.map((e) => [e, petaFc[e] != null ? Number(petaFc[e]) : null])),
      per_unit: unitRows,
      armada,
      revenue_total: r2(revenueTotal),
      revenue_unit_isi: revenueIsi,
      operator: opList,
      top_egi,
      low_egi,
      avg_egi: Object.fromEntries(JENIS_ORDER.map((j) => [j, r2(avgJenis[j] || 0)])),
      cek: cek.slice(0, 40),
      minggu,
      boleh_kelola: bolehKelola,
      cuaca,
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
    const paTarget = body?.pa_target != null ? Number(body.pa_target) : 90
    const maTarget = body?.ma_target != null ? Number(body.ma_target) : 92

    if (!/^\d{4}-\d{2}$/.test(bulan)) return NextResponse.json({ error: 'bulan wajib YYYY-MM' }, { status: 400 })
    if (!(targetJam > 0)) return NextResponse.json({ error: 'target_jam wajib > 0' }, { status: 400 })

    const { data: ada } = await supabaseAdmin
      .from('ts_target').select('id').eq('site', site).eq('bulan', bulan).maybeSingle()

    const penuh = { target_jam: targetJam, faktor, pa_target: paTarget, ma_target: maTarget }
    const dasar = { target_jam: targetJam, faktor }

    async function tulis(payload: Record<string, any>) {
      if (ada) {
        return supabaseAdmin.from('ts_target').update(payload).eq('id', (ada as any).id)
      }
      return supabaseAdmin.from('ts_target').insert({
        ...payload, site, bulan, dibuat_oleh: String(session.nrp),
      })
    }

    let { error } = await tulis(penuh)
    if (error && /pa_target|ma_target|column/i.test(error.message || '')) {
      ({ error } = await tulis(dasar))
      if (!error) {
        return NextResponse.json({
          ok: true,
          peringatan: 'Target HM tersimpan. Kolom acuan PA/MA belum ada — jalankan scripts/produksi-monitoring.sql di Supabase.',
        })
      }
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const tarifs = Array.isArray(body?.tarifs) ? body.tarifs : []
    let tarifPeringatan: string | null = null
    if (tarifs.length) {
      for (const t of tarifs) {
        const kode = String(t?.kode_unit || '').trim()
        if (!kode) continue
        const val = t?.tarif_hm === '' || t?.tarif_hm == null || t?.tarif_hm === undefined
          ? null
          : Number(t.tarif_hm)
        const fb = egiFallback(kode)
        const { data: cfgAda } = await supabaseAdmin
          .from('ts_unit_config').select('kode_unit').eq('kode_unit', kode).maybeSingle()
        const payload: Record<string, any> = { tarif_hm: val != null && isFinite(val) ? val : null }
        let te: any
        if (cfgAda) {
          ;({ error: te } = await supabaseAdmin.from('ts_unit_config').update(payload).eq('kode_unit', kode))
        } else {
          ;({ error: te } = await supabaseAdmin.from('ts_unit_config').insert({
            kode_unit: kode, egi: fb.egi, jenis: fb.jenis, ...payload,
          }))
        }
        if (te && /tarif_hm|column/i.test(te.message || '')) {
          tarifPeringatan = 'Target tersimpan. Kolom tarif per unit belum ada — jalankan scripts/produksi-tarif-unit.sql di Supabase.'
          break
        }
        if (te) return NextResponse.json({ error: te.message }, { status: 500 })
      }
    }

    const fcTargets = Array.isArray(body?.fc_targets) ? body.fc_targets : []
    let fcPeringatan: string | null = null
    for (const t of fcTargets) {
      const egi = String(t?.egi || '').trim()
      if (!egi) continue
      const val = t?.fc_target === '' || t?.fc_target == null ? null : Number(t.fc_target)
      const { error: fe } = await supabaseAdmin.from('ts_fc_target').upsert({
        site, egi, fc_target: val != null && isFinite(val) ? val : null,
      }, { onConflict: 'site,egi' })
      if (fe && /ts_fc_target|does not exist|column/i.test(fe.message || '')) {
        fcPeringatan = 'Target tersimpan. Tabel FC per EGI belum ada — jalankan scripts/produksi-fc-egi.sql di Supabase.'
        break
      }
      if (fe) return NextResponse.json({ error: fe.message }, { status: 500 })
    }

    const peringatan = tarifPeringatan || fcPeringatan
    if (peringatan) return NextResponse.json({ ok: true, peringatan })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal menyimpan target' }, { status: 500 })
  }
}
