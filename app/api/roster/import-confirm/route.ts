// app/api/roster/import-confirm/route.ts
// Terima data parsed → DELETE existing → INSERT baru ke tabel rosters
// Support kolom: nrp, tanggal, shift_code, periode, unit
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
    const { rows, bulan } = await req.json()

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data untuk diimport' }, { status: 400 })
    }

    if (!bulan) {
      return NextResponse.json({ error: 'Bulan wajib diisi' }, { status: 400 })
    }

    // Parse bulan
    const [tahun, bln] = bulan.split('-').map(Number)
    if (!tahun || !bln) {
      return NextResponse.json({ error: 'Format bulan tidak valid' }, { status: 400 })
    }

    const jmlHari = new Date(tahun, bln, 0).getDate()
    const startDate = `${tahun}-${String(bln).padStart(2, '0')}-01`
    const endDate = `${tahun}-${String(bln).padStart(2, '0')}-${String(jmlHari).padStart(2, '0')}`

    // ─── Sanitize & validate rows ───
    // Pastikan setiap row punya kolom wajib: nrp, tanggal, shift_code
    // Kolom optional: periode, unit
    const cleanRows = rows
      .filter((r: any) => r && r.nrp && r.tanggal && r.shift_code)
      .map((r: any) => ({
        nrp: String(r.nrp).trim(),
        tanggal: r.tanggal,
        shift_code: String(r.shift_code).trim().toUpperCase(),
        periode: r.periode || null,
        unit: r.unit ? String(r.unit).trim().toUpperCase() : null
      }))

    if (cleanRows.length === 0) {
      return NextResponse.json({ error: 'Semua row tidak valid (kolom wajib kosong)' }, { status: 400 })
    }

    // ─── Step 1: DELETE existing roster di periode ini untuk NRP yang di-import ───
    // Kenapa? Biar bersih dari data hantu (shift lama yang tidak ada di file baru)
    const nrpsToImport = [...new Set(cleanRows.map((r: any) => r.nrp))]

    if (nrpsToImport.length > 0) {
      const { error: delErr } = await supabaseAdmin
        .from('rosters')
        .delete()
        .in('nrp', nrpsToImport)
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)

      if (delErr) {
        console.error('[import-confirm] Delete error:', delErr)
        return NextResponse.json({
          error: 'Gagal hapus data lama: ' + delErr.message
        }, { status: 500 })
      }
    }

    // ─── Step 2: Batch INSERT (500 rows per batch untuk hindari timeout) ───
    const BATCH_SIZE = 500
    let totalInserted = 0
    let totalErrors = 0
    const errorMessages: string[] = []

    for (let i = 0; i < cleanRows.length; i += BATCH_SIZE) {
      const batch = cleanRows.slice(i, i + BATCH_SIZE)

      // Pakai UPSERT untuk safety (kalau ada race condition duplicate)
      const { error: upsertErr } = await supabaseAdmin
        .from('rosters')
        .upsert(batch, {
          onConflict: 'nrp,tanggal',
          ignoreDuplicates: false
        })

      if (upsertErr) {
        console.error(`[import-confirm] Batch ${i}-${i + batch.length} error:`, upsertErr)
        totalErrors += batch.length
        errorMessages.push(`Batch ${i}: ${upsertErr.message}`)
      } else {
        totalInserted += batch.length
      }
    }

    // ─── Stats ───
    const uniqueUnits = new Set(cleanRows.filter((r: any) => r.unit).map((r: any) => r.unit))

    return NextResponse.json({
      ok: true,
      message: totalErrors === 0
        ? `✅ Import roster berhasil! ${totalInserted} shift ter-import.`
        : `⚠️ Import selesai dengan ${totalErrors} error dari ${cleanRows.length} row.`,
      stats: {
        totalInserted,
        totalErrors,
        totalBatches: Math.ceil(cleanRows.length / BATCH_SIZE),
        totalKaryawan: nrpsToImport.length,
        totalUnit: uniqueUnits.size,
        periode: bulan,
        errorSample: errorMessages.slice(0, 3)
      }
    })

  } catch (err: any) {
    console.error('[import-confirm]', err)
    return NextResponse.json({
      error: 'Gagal import: ' + (err.message || 'Unknown error')
    }, { status: 500 })
  }
}