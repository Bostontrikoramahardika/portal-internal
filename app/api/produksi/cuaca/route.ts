import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

// ═══════════════════════════════════════════════════════════════
// 🌤 CUACA HARIAN — replika blok CUACA di Laporan Produksi Excel
//   POST { site, tanggal, s1, s2 } → upsert per (site, tanggal)
//   Nilai: 'cerah' | 'berawan' | 'hujan'
// ═══════════════════════════════════════════════════════════════

const ROLE_EDIT = ['admin_site', 'hr_site', 'hr_ho']
const NILAI_OK = ['cerah', 'berawan', 'hujan']

async function sesi(req: NextRequest) {
  const token = req.cookies.get('session_token')?.value
  if (!token) return null
  return await getSession(token)
}

export async function POST(req: NextRequest) {
  try {
    const session = await sesi(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const boleh = session.is_super_admin || (session.roles || []).some((r) => ROLE_EDIT.includes(r))
    if (!boleh) return NextResponse.json({ error: 'Hanya Admin/HR yang bisa mengisi cuaca' }, { status: 403 })

    const b = await req.json()
    const site = String(b?.site || '').trim()
    const tanggal = String(b?.tanggal || '').slice(0, 10)
    const s1 = String(b?.s1 || 'cerah').toLowerCase()
    const s2 = String(b?.s2 || 'cerah').toLowerCase()
    if (!site || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      return NextResponse.json({ error: 'Site/tanggal tidak valid' }, { status: 400 })
    }
    if (!NILAI_OK.includes(s1) || !NILAI_OK.includes(s2)) {
      return NextResponse.json({ error: 'Nilai cuaca tidak valid' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('produksi_cuaca')
      .upsert(
        { site, tanggal, cuaca_s1: s1, cuaca_s2: s2, updated_at: new Date().toISOString() },
        { onConflict: 'site,tanggal' },
      )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal simpan cuaca' }, { status: 500 })
  }
}
