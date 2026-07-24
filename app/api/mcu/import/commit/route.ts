// app/api/mcu/import/commit/route.ts
// Commit MCU bulk ke DB setelah preview OK
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

const ALLOWED_ROLES = ['super_admin', 'hr_ho', 'hr_site']

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const session: any = auth.session!

  const userRoles: string[] = Array.isArray(session.roles) ? session.roles : []
  const role: string = userRoles[0] || 'employee'
  const isSuperAdmin = userRoles.includes('super_admin')

  if (!isSuperAdmin && !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const rows: any[] = body.rows || []

    if (!rows.length) return NextResponse.json({ error: 'Tidak ada data' }, { status: 400 })

    let inserted = 0
    let findingsInserted = 0
    const failed: any[] = []

    for (const r of rows) {
      if (!r.valid) continue

      try {
        // Insert MCU
        const { data: mcuData, error: mcuErr } = await supabaseAdmin
          .from('mcu')
          .insert({
            nrp: r.nrp,
            nama_karyawan: r.nama,
            tanggal_mcu: r.tanggal_mcu,
            jenis_mcu: r.jenis_mcu,
            hasil: r.hasil,
            dokter: r.dokter,
            rumah_sakit: r.rumah_sakit,
            tanggal_berlaku: r.tanggal_berlaku,
            tanggal_expired: r.tanggal_expired,
            keterangan: r.keterangan,
            uploaded_by: session.nrp,
            uploaded_at: new Date().toISOString(),
            updated_by: session.nrp,
            status_mcu: r.hasil === 'FIT' ? 'FIT' :
                        (r.findings?.length > 0 ? 'OPEN' : 'FIT'),
            butuh_followup: r.findings?.length > 0,
            temuan_summary: (r.findings || []).map((f: any) => f.jenis).join(', ') || null,
          })
          .select('id')
          .single()

        if (mcuErr) {
          failed.push({ nrp: r.nrp, error: mcuErr.message })
          continue
        }

        inserted++

        // Insert findings (kalau ada)
        if (r.findings && r.findings.length > 0) {
          const findingsToInsert = r.findings.map((f: any) => ({
            mcu_id: mcuData.id,
            nrp: r.nrp,
            jenis_temuan: f.jenis,
            keterangan_temuan: f.keterangan || null,
            status_followup: 'BELUM_FU',
          }))

          const { error: findErr } = await supabaseAdmin
            .from('mcu_findings')
            .insert(findingsToInsert)

          if (findErr) {
            console.warn(`[MCU Commit] Findings error for ${r.nrp}:`, findErr.message)
          } else {
            findingsInserted += findingsToInsert.length
          }
        }

        // Audit log
        await supabaseAdmin.from('mcu_audit_log').insert({
          mcu_id: mcuData.id,
          action: 'BULK_IMPORT',
          actor_nrp: session.nrp,
          actor_name: session.nama,
          actor_role: role,
          after_data: { hasil: r.hasil, jenis_mcu: r.jenis_mcu },
          note: `Import bulk MCU`,
        })
      } catch (e: any) {
        failed.push({ nrp: r.nrp, error: e.message })
      }
    }

    return NextResponse.json({
      ok: true,
      summary: {
        inserted,
        findingsInserted,
        failed: failed.length,
      },
      failed,
    })
  } catch (e: any) {
    console.error('[MCU Commit] Error:', e)
    return NextResponse.json({ error: e.message || 'Gagal commit' }, { status: 500 })
  }
}