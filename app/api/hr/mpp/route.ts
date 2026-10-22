import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

function angka(n: any) {
  const v = Number(n)
  return Number.isFinite(v) ? v : 0
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const tahun = Number(searchParams.get('tahun') || 0)
  const bulan = Number(searchParams.get('bulan') || 0)
  const site = String(searchParams.get('site') || '').trim()
  if (!tahun) return NextResponse.json({ error: 'tahun wajib' }, { status: 400 })

  let q = supabaseAdmin.from('mpp_plan').select('*').eq('tahun', tahun)
  if (bulan) q = q.eq('bulan', bulan)
  if (site) q = q.eq('site', site)

  const { data, error } = await q.order('grup').order('jabatan')
  if (error) {
    return NextResponse.json({ ok: false, error: error.message, need_sql: true, rows: [] })
  }
  return NextResponse.json({ ok: true, rows: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session

  const body = await req.json()
  const tahun = Number(body?.tahun || 0)
  const bulan = Number(body?.bulan || 0)
  const site = String(body?.site || 'PPA-MLP').trim()
  const rows = Array.isArray(body?.rows) ? body.rows : []
  if (!tahun || !bulan) {
    return NextResponse.json({ error: 'tahun dan bulan wajib' }, { status: 400 })
  }
  if (!rows.length) {
    return NextResponse.json({ error: 'Tidak ada baris' }, { status: 400 })
  }

  const payload = rows.map((r: any) => {
    const rumus = String(r.rumus || 'manual')
    const unit = r.unit == null || r.unit === '' ? null : angka(r.unit)
    const shift = r.shift == null || r.shift === '' ? null : angka(r.shift)
    const faktor = r.faktor == null || r.faktor === '' ? null : angka(r.faktor)
    let mpp = angka(r.mpp)
    if (rumus === 'unit_x_shift_x_faktor') {
      mpp = Math.round(angka(unit) * angka(shift) * angka(faktor))
    }
    return {
      site,
      tahun,
      bulan,
      grup: String(r.grup || ''),
      jabatan: String(r.jabatan || ''),
      mpp,
      unit,
      shift,
      faktor,
      rumus,
      updated_at: new Date().toISOString(),
      updated_by: session?.nrp || null,
    }
  }).filter((r: any) => r.jabatan)

  const { error } = await supabaseAdmin.from('mpp_plan').upsert(payload, {
    onConflict: 'site,tahun,bulan,jabatan',
  })
  if (error) {
    return NextResponse.json({ ok: false, error: error.message, need_sql: true }, { status: 400 })
  }
  return NextResponse.json({ ok: true, saved: payload.length })
}
