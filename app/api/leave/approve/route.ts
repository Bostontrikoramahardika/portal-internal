import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

const JENIS_CUTI_TAHUNAN = 'CUTI TAHUNAN'

function isCutiTahunan(value: string): boolean {
  return String(value || '').toUpperCase().includes('TAHUNAN')
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  try {
    const body = await request.json()
    const { leave_id, action, catatan } = body

    if (!leave_id || !['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json({ error: 'Data approval tidak valid' }, { status: 400 })
    }

    if (action === 'REJECTED' && !catatan?.trim()) {
      return NextResponse.json({ error: 'Catatan wajib diisi jika reject' }, { status: 400 })
    }

    // Get leave data
    const { data: leave } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', leave_id)
      .single()

    if (!leave) {
      return NextResponse.json({ error: 'Data cuti tidak ditemukan' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const rolesLower = (session.roles || []).map((r: string) => r.toLowerCase())
    const isAtasan = rolesLower.some((r: string) =>
      ['gl_produksi', 'gl_plant', 'hr_site', 'atasan', 'hrga'].includes(r)
    )
    const isPjo = rolesLower.some((r: string) =>
      ['pjo_site', 'pjo', 'hrga'].includes(r)
    )

    // TAHAP ATASAN
    if (
      leave.status_atasan === 'PENDING' &&
       (leave.atasan_nrp === session.nrp || rolesLower.includes('hrga'))
    ) {
      if (!isAtasan) {
        return NextResponse.json({ error: 'Anda tidak berhak approve tahap ini' }, { status: 403 })
      }

      const updates: any = {
        catatan_atasan: catatan || null,
        tanggal_approval_atasan: now,
        updated_at: now
      }

      if (action === 'APPROVED') {
        updates.status_atasan = 'APPROVED'
        updates.status_pjo = 'PENDING'
        updates.status_final = 'MENUNGGU_PJO'
      } else {
        updates.status_atasan = 'REJECTED'
        updates.status_final = 'DITOLAK_ATASAN'
      }

      const { error } = await supabase
        .from('leave_requests')
        .update(updates)
        .eq('id', leave_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Log
      await supabase.from('approval_logs').insert({
        leave_request_id: leave_id,
        approver_nrp: session.nrp,
        stage: 'ATASAN',
        action: action,
        catatan: catatan || null
      })

      return NextResponse.json({
        success: true,
        message: action === 'APPROVED'
          ? '✅ Cuti disetujui atasan. Menunggu approval PJO.'
          : '❌ Cuti ditolak pada tahap atasan.'
      })
    }

    // TAHAP PJO
    if (
      leave.status_atasan === 'APPROVED' &&
      leave.status_pjo === 'PENDING' &&
      (leave.pjo_nrp === session.nrp || rolesLower.includes('hrga'))
    ) {
      if (!isPjo) {
        return NextResponse.json({ error: 'Anda tidak berhak approve tahap ini' }, { status: 403 })
      }

      const updates: any = {
        catatan_pjo: catatan || null,
        tanggal_approval_pjo: now,
        updated_at: now
      }

      let balanceWarning = ''

      if (action === 'APPROVED') {
        if (isCutiTahunan(leave.jenis_cuti)) {
          const tahunCuti = new Date(`${leave.tanggal_mulai}T00:00:00`).getFullYear()
          const jumlahHariFinal = Number(leave.jumlah_hari || 0)

          const { data: balanceRow } = await supabase
            .from('annual_leave_balances')
            .select('hak_awal, terpakai, penyesuaian')
            .eq('nrp', leave.nrp)
            .eq('tahun', tahunCuti)
            .maybeSingle()

          const sisaSaatApprove = Math.max(
            0,
            balanceRow
              ? Number(balanceRow.hak_awal || 12) +
                  Number(balanceRow.penyesuaian || 0) -
                  Number(balanceRow.terpakai || 0)
              : 12
          )

          if (jumlahHariFinal <= 0) {
            return NextResponse.json({ error: 'Jumlah hari cuti tahunan tidak valid' }, { status: 400 })
          }

          if (jumlahHariFinal > sisaSaatApprove) {
            return NextResponse.json({
              error: `Sisa cuti tahunan tidak mencukupi saat approval final. Sisa saat ini ${sisaSaatApprove} hari`
            }, { status: 400 })
          }
        }

        updates.status_pjo = 'APPROVED'
        updates.status_final = 'DISETUJUI'
      } else {
        updates.status_pjo = 'REJECTED'
        updates.status_final = 'DITOLAK_PJO'
      }

      const { error } = await supabase
        .from('leave_requests')
        .update(updates)
        .eq('id', leave_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      if (action === 'APPROVED' && isCutiTahunan(leave.jenis_cuti)) {
        const tahunCuti = new Date(`${leave.tanggal_mulai}T00:00:00`).getFullYear()
        const jumlahHariFinal = Number(leave.jumlah_hari || 0)

        const { data: balanceRow } = await supabase
          .from('annual_leave_balances')
          .select('hak_awal, terpakai, penyesuaian')
          .eq('nrp', leave.nrp)
          .eq('tahun', tahunCuti)
          .maybeSingle()

        const hakAwal = Number(balanceRow?.hak_awal ?? 12)
        const terpakai = Number(balanceRow?.terpakai ?? 0)
        const penyesuaian = Number(balanceRow?.penyesuaian ?? 0)

        const { error: balanceError } = await supabase
          .from('annual_leave_balances')
          .upsert({
            nrp: leave.nrp,
            tahun: tahunCuti,
            hak_awal: hakAwal,
            terpakai: terpakai + jumlahHariFinal,
            penyesuaian: penyesuaian,
            updated_by: session.nrp,
            updated_at: now
          }, { onConflict: 'nrp,tahun' })

        if (balanceError) {
          console.error('Annual leave balance update warning:', balanceError)
          balanceWarning = ' Namun saldo cuti tahunan gagal ter-update otomatis, mohon cek manual.'
        }
      }

      // Log
      await supabase.from('approval_logs').insert({
        leave_request_id: leave_id,
        approver_nrp: session.nrp,
        stage: 'PJO',
        action: action,
        catatan: catatan || null
      })

      return NextResponse.json({
        success: true,
        message: action === 'APPROVED'
          ? `🎉 Cuti disetujui final oleh PJO!${balanceWarning}`
          : '❌ Cuti ditolak pada tahap PJO.'
      })
    }

    return NextResponse.json({
      error: 'Anda tidak berhak memproses approval ini atau status tidak sesuai'
    }, { status: 403 })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}