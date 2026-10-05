import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// ═══════════════════════════════════════════════════════════════
// 📥 IMPORT HARIAN TS OPT
//   GET  → { boleh_import }
//   POST { mode:'preview'|'commit', site, text }
//
// Menerima tempelan (paste) baris dari sheet TS Opt Excel.
// Dua layout dikenali otomatis:
//   • ≥17 kolom  = layout asli sheet TS Opt (kolom pembantu diabaikan)
//   • 8–12 kolom = layout pakem (Site,Tgl,Shift,Tipe,Kode,NRP,Nama,
//                  HM Awal,HM Akhir,[HM Over],[Catatan])
// Kunci baris: (site, tanggal, shift, kode_unit) → kirim ulang = timpa.
// ═══════════════════════════════════════════════════════════════

const ROLE_IMPORT = ['admin_site', 'hr_site', 'hr_ho']
// nama bulan Indonesia + Inggris (Excel lokal sering berformat "2-Oct-26")
const BULAN_ID: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6,
  jul: 7, agu: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12,
}

function parseNum(s: any): number | null {
  let t = String(s ?? '').trim().replace(/\s/g, '')
  if (!t || t === '-') return null
  if (/,/.test(t) && /\./.test(t)) t = t.replace(/\./g, '').replace(',', '.')
  else if (/,/.test(t)) {
    const dec = t.split(',')[1] || ''
    t = dec.length <= 2 ? t.replace(',', '.') : t.replace(/,/g, '')
  }
  const n = parseFloat(t)
  return isFinite(n) ? n : null
}

function parseTgl(s: any): string | null {
  const t = String(s ?? '').trim()
  if (!t) return null
  // ISO: 2026-10-01 / 2026-10-01T00:00
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  // Indonesia: 1-Okt-26 / 01 Okt 2026
  const id = t.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{2,4})$/)
  if (id) {
    const bl = BULAN_ID[id[2].slice(0, 3).toLowerCase()]
    if (!bl) return null
    const thn = id[3].length === 2 ? Number(id[3]) + 2000 : Number(id[3])
    return `${thn}-${String(bl).padStart(2, '0')}-${id[1].padStart(2, '0')}`
  }
  return null
}

type Baris = {
  site: string; tanggal: string; shift: number
  tipe: string; kode: string; nrp: string; nama: string
  hm_awal: number | null; hm_akhir: number | null
  hm_total: number | null; hm_over: number; catatan: string
  hm_kerja: number | null; standby: number | null
  pa: number | null; ma: number | null; ua: number | null
}

function parsePct(s: any): number | null {
  const t = String(s ?? '').trim().replace('%', '').replace(',', '.')
  if (!t || t === '-') return null
  const n = parseFloat(t)
  return isFinite(n) ? n : null
}

/** Pecah satu baris mentah jadi Baris (atau null kalau bukan baris data) */
function bacaBaris(cells: string[], siteDefault: string): Baris | null {
  const ambil = (i: number) => String(cells[i] ?? '').trim()

  if (cells.length >= 17) {
    // layout asli sheet TS Opt
    const site = ambil(7) || siteDefault
    const tgl = parseTgl(ambil(8))
    const shift = Number(ambil(9))
    const kode = ambil(11)
    if (!tgl || !kode || !(shift === 1 || shift === 2)) return null
    const hmAwal = parseNum(ambil(14))
    const hmAkhir = parseNum(ambil(15))
    return {
      site, tanggal: tgl, shift, tipe: ambil(10), kode,
      nrp: ambil(12), nama: ambil(13).toUpperCase(),
      hm_awal: hmAwal, hm_akhir: hmAkhir,
      hm_total: hmAwal != null && hmAkhir != null ? Math.round((hmAkhir - hmAwal) * 100) / 100 : null,
      hm_over: parseNum(ambil(19)) || parseNum(ambil(20)) || 0,
      catatan: ambil(24),
      hm_kerja: parseNum(ambil(21)), standby: parseNum(ambil(25)),
      pa: parsePct(ambil(29)), ma: parsePct(ambil(30)), ua: parsePct(ambil(31)),
    }
  }

  if (cells.length >= 9 && cells.length <= 12) {
    // layout pakem: Site,Tgl,Shift,Tipe,Kode,NRP,Nama,HM Awal,HM Akhir,[HM Over],[Catatan]
    const site = ambil(0) || siteDefault
    const tgl = parseTgl(ambil(1))
    const shift = Number(ambil(2))
    const kode = ambil(4)
    if (!tgl || !kode || !(shift === 1 || shift === 2)) return null
    const hmAwal = parseNum(ambil(7))
    const hmAkhir = parseNum(ambil(8))
    return {
      site, tanggal: tgl, shift, tipe: ambil(3), kode,
      nrp: ambil(5), nama: ambil(6).toUpperCase(),
      hm_awal: hmAwal, hm_akhir: hmAkhir,
      hm_total: hmAwal != null && hmAkhir != null ? Math.round((hmAkhir - hmAwal) * 100) / 100 : null,
      hm_over: parseNum(ambil(9)) || 0,
      catatan: ambil(10),
      hm_kerja: null, standby: null, pa: null, ma: null, ua: null,
    }
  }

  return null
}

async function sesi(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value
  if (!token) return null
  return await getSession(token)
}

export async function GET(req: NextRequest) {
  const session = await sesi(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const boleh = session.is_super_admin ||
    (session.roles || []).some((r) => ROLE_IMPORT.includes(r))
  return NextResponse.json({ ok: true, boleh_import: boleh })
}

export async function POST(req: NextRequest) {
  try {
    const session = await sesi(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const roles: string[] = session.roles || []
    const boleh = session.is_super_admin || roles.some((r) => ROLE_IMPORT.includes(r))
    if (!boleh) return NextResponse.json({ error: 'Hanya Admin/HR yang bisa import TS Opt' }, { status: 403 })

    const body = await req.json()
    const mode = body?.mode === 'commit' ? 'commit' : 'preview'
    const siteDefault = String(body?.site || 'PPA-MLP')
    const text = String(body?.text || '')

    // ── 1. parse ──
    const baris: Baris[] = []
    const peringatan: { baris: number; pesan: string }[] = []
    const kunciTerlihat = new Set<string>()

    const lines = text.split(/\r?\n/)
    let no = 0
    for (const line of lines) {
      no++
      if (!line.trim()) continue
      const cells = line.split('\t')
      const b = bacaBaris(cells, siteDefault)
      if (!b) continue

      const kunci = `${b.site}|${b.tanggal}|${b.shift}|${b.kode}`
      if (kunciTerlihat.has(kunci)) {
        peringatan.push({ baris: no, pesan: `Duplikat di tempelan: ${b.kode} tgl ${b.tanggal} shift ${b.shift} (diambil yang terakhir)` })
      }
      kunciTerlihat.add(kunci)
      baris.push(b)

      if (b.hm_awal != null && b.hm_akhir != null && b.hm_akhir < b.hm_awal) {
        peringatan.push({ baris: no, pesan: `${b.kode} tgl ${b.tanggal}: HM akhir lebih kecil dari HM awal` })
      }
      if (b.hm_total != null && b.hm_total > 12) {
        peringatan.push({ baris: no, pesan: `${b.kode} tgl ${b.tanggal}: HM total ${b.hm_total} melebihi 12 jam/shift` })
      }
      if (!b.nama && b.hm_total != null && b.hm_total > 0) {
        peringatan.push({ baris: no, pesan: `${b.kode} tgl ${b.tanggal}: ada HM tapi nama operator kosong` })
      }
    }

    if (!baris.length) {
      return NextResponse.json({
        ok: false, error: 'Tidak ada baris data yang terbaca. Pastikan menempel baris dari sheet TS Opt.',
      }, { status: 400 })
    }

    // ── 2. cek mana yang sudah ada (timpa) vs baru ──
    const tglUnik = Array.from(new Set(baris.map((b) => b.tanggal)))
    const minTgl = tglUnik.reduce((a, b) => (a < b ? a : b))
    const maxTgl = tglUnik.reduce((a, b) => (a > b ? a : b))

    const { data: ada } = await supabaseAdmin
      .from('ts_opt')
      .select('id, site, tanggal, shift, kode_unit')
      .eq('site', siteDefault)
      .gte('tanggal', minTgl)
      .lte('tanggal', maxTgl)

    const petaAda: Record<string, string> = {}
    for (const r of ada || []) {
      const x = r as any
      petaAda[`${x.site}|${x.tanggal}|${x.shift}|${x.kode_unit}`] = x.id
    }

    let baru = 0
    let timpa = 0
    const upBaru: any[] = []
    const upTimpa: { id: string; patch: any }[] = []

    const dipakai = new Map<string, Baris>()
    for (const b of baris) dipakai.set(`${b.site}|${b.tanggal}|${b.shift}|${b.kode}`, b)

    for (const [kunci, b] of dipakai) {
      const patch = {
        tipe_unit: b.tipe, nrp: b.nrp || null, nama_operator: b.nama || null,
        hm_awal: b.hm_awal, hm_akhir: b.hm_akhir, hm_total: b.hm_total,
        hm_over: b.hm_over, catatan: b.catatan || null,
        hm_kerja: b.hm_kerja, standby: b.standby,
        pa: b.pa, ma: b.ma, ua: b.ua,
        dibuat_oleh: String(session.nrp), updated_at: new Date().toISOString(),
      }
      const idAda = petaAda[kunci]
      if (idAda) { timpa++; upTimpa.push({ id: idAda, patch }) }
      else { baru++; upBaru.push({ ...patch, site: b.site, tanggal: b.tanggal, shift: b.shift, kode_unit: b.kode }) }
    }

    if (mode === 'preview') {
      return NextResponse.json({
        ok: true, mode: 'preview',
        total: dipakai.size, baru, timpa,
        dilewati: lines.length - baris.length,
        peringatan,
        contoh: baris.slice(0, 10),
      })
    }

    // ── 3. commit ──
    if (upBaru.length) {
      const { error } = await supabaseAdmin.from('ts_opt').insert(upBaru)
      if (error) return NextResponse.json({ error: 'Gagal menyimpan baris baru: ' + error.message }, { status: 500 })
    }
    for (const u of upTimpa) {
      const { error } = await supabaseAdmin.from('ts_opt').update(u.patch).eq('id', u.id)
      if (error) return NextResponse.json({ error: 'Gagal memperbarui: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, mode: 'commit', total: dipakai.size, baru, timpa, peringatan })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal import TS Opt' }, { status: 500 })
  }
}
