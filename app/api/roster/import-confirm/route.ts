// app/api/roster/import-confirm/route.ts
// Terima data parsed → UPSERT ke tabel rosters
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const isSuperAdmin = userRoles.includes('super_admin')
  const canUpload = isSuperAdmin || userRoles.some(r =>
    ['hr_ho', 'hr_site', 'pjo_site'].includes(r)
  )

  if (!canUpload) {
    return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
  }

  try {
    const { rows, bulan, replace } = await req.json()

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data untuk diimport' }, { status: 400 })
    }

    if (!bulan) {
      return NextResponse.json({ error: 'Bulan wajib diisi' }, { status: 400 })
    }

    const [tahun, bln] = bulan.split('-').map(Number)
    const jmlHari = new Date(tahun, bln, 0).getDate()
    const startDate = `${tahun}-${String(bln).padStart(2, '0')}-01`
    const endDate = `${tahun}-${String(bln).padStart(2, '0')}-${String(jmlHari).padStart(2, '0')}`

    // ─── Step 1: Hapus existing roster kalau replace = true ───
    if (replace) {
      const nrpsToReplace = [...new Set(rows.map((r: any) => r.nrp))]

      if (nrpsToReplace.length > 0) {
        const { error: delErr } = await supabaseAdmin
          .from('rosters')
          .delete()
          .in('nrp', nrpsToReplace)
          .gte('tanggal', startDate)
          .lte('tanggal', endDate)

        if (delErr) {
          return NextResponse.json({ error: 'Gagal hapus data lama: ' + delErr.message }, { status: 500 })
        }
      }
    }

    // ─── Step 2: Batch upsert (500 rows per batch) ───
    const BATCH_SIZE = 500
    let totalInserted = 0
    let totalErrors = 0

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)

      const { error: upsertErr } = await supabaseAdmin
        .from('rosters')
        .upsert(batch, {
          onConflict: 'nrp,tanggal',
          ignoreDuplicates: false
        })

      if (upsertErr) {
        console.error(`[import-confirm] Batch ${i} error:`, upsertErr)
        totalErrors += batch.length
      } else {
        totalInserted += batch.length
      }
    }

    return NextResponse.json({
      ok: true,
      message: `✅ Import roster berhasil!`,
      stats: {
        totalInserted,
        totalErrors,
        totalBatches: Math.ceil(rows.length / BATCH_SIZE),
        periode: bulan,
        replaced: !!replace
      }
    })

  } catch (err: any) {
    console.error('[import-confirm]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}