// app/api/monitoring-expired/route.ts
// v1.1 - Fix logAudit signature
// API untuk update & delete dokumen expired (virtual view)

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import { logAudit } from '@/app/lib/auditLog'

export const dynamic = 'force-dynamic'

// Mapping jenis dokumen → tabel + kolom tanggal
const DOC_CONFIG: Record<string, { table: string; date_col: string; id_col: string }> = {
  MCU:    { table: 'mcu',       date_col: 'tanggal_expired',  id_col: 'id' },
  SIMPER: { table: 'simper',    date_col: 'tanggal_expired',  id_col: 'id' },
  PKWT:   { table: 'pkwt',      date_col: 'tanggal_berakhir', id_col: 'id' },
  SIMPOL: { table: 'employees', date_col: 'exp_simpol',       id_col: 'nrp' }
}

// ═══════════════════════════════════════════════
// PUT: Update tanggal expired
// ═══════════════════════════════════════════════
export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Cek permission: harus HRGA atau Super Admin
    const roles = (session.roles || []).map((r: string) => r.toLowerCase())
    const isSuperAdmin = session.is_super_admin || false
    const isHrga = isSuperAdmin || roles.some((r: string) => ['admin', 'hrga', 'hrga_site', 'hrga_pusat'].includes(r))
    
    if (!isHrga) {
      return NextResponse.json({ error: 'Akses ditolak: hanya HRGA yang bisa update dokumen' }, { status: 403 })
    }

    const body = await req.json()
    const { jenis_dokumen, record_id, tanggal_baru, nama_karyawan } = body

    if (!jenis_dokumen || !record_id || !tanggal_baru) {
      return NextResponse.json({ error: 'Data tidak lengkap: jenis_dokumen, record_id, tanggal_baru wajib diisi' }, { status: 400 })
    }

    const config = DOC_CONFIG[String(jenis_dokumen).toUpperCase()]
    if (!config) {
      return NextResponse.json({ error: `Jenis dokumen tidak dikenal: ${jenis_dokumen}` }, { status: 400 })
    }

    // Update ke tabel sesuai
    const { data, error } = await supabase
      .from(config.table)
      .update({ [config.date_col]: tanggal_baru })
      .eq(config.id_col, record_id)
      .select()

    if (error) {
      await logAudit({
        req,
        actor_nrp: session.nrp,
        actor_nama: session.nama,
        actor_role: roles.join(','),
        action: 'update_expired_doc',
        category: 'SYSTEM',
        target_type: config.table,
        target_id: record_id,
        target_label: `${jenis_dokumen} - ${nama_karyawan || record_id}`,
        detail: { jenis_dokumen, tanggal_baru },
        status: 'FAILED',
        error_message: error.message
      })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Audit log SUCCESS
    await logAudit({
      req,
      actor_nrp: session.nrp,
      actor_nama: session.nama,
      actor_role: roles.join(','),
      action: 'update_expired_doc',
      category: 'SYSTEM',
      target_type: config.table,
      target_id: record_id,
      target_label: `${jenis_dokumen} - ${nama_karyawan || record_id}`,
      detail: { jenis_dokumen, tanggal_baru },
      status: 'SUCCESS'
    })

    return NextResponse.json({ 
      success: true, 
      message: `✅ ${jenis_dokumen} berhasil diperpanjang ke ${tanggal_baru}`,
      data
    })

  } catch (err: any) {
    console.error('Update expired error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════
// DELETE: Hapus dokumen expired
// ═══════════════════════════════════════════════
export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const roles = (session.roles || []).map((r: string) => r.toLowerCase())
    const isSuperAdmin = session.is_super_admin || false
    const isHrga = isSuperAdmin || roles.some((r: string) => ['admin', 'hrga', 'hrga_site', 'hrga_pusat'].includes(r))
    
    if (!isHrga) {
      return NextResponse.json({ error: 'Akses ditolak: hanya HRGA yang bisa hapus dokumen' }, { status: 403 })
    }

    const body = await req.json()
    const { jenis_dokumen, record_id, nama_karyawan } = body

    if (!jenis_dokumen || !record_id) {
      return NextResponse.json({ error: 'Data tidak lengkap: jenis_dokumen dan record_id wajib' }, { status: 400 })
    }

    const config = DOC_CONFIG[String(jenis_dokumen).toUpperCase()]
    if (!config) {
      return NextResponse.json({ error: `Jenis dokumen tidak dikenal: ${jenis_dokumen}` }, { status: 400 })
    }

    // Khusus SIMPOL: JANGAN hapus employee, cuma kosongkan tanggal
    if (config.table === 'employees') {
      const { error } = await supabase
        .from('employees')
        .update({ exp_simpol: null })
        .eq('nrp', record_id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      await logAudit({
        req,
        actor_nrp: session.nrp,
        actor_nama: session.nama,
        actor_role: roles.join(','),
        action: 'delete_expired_doc',
        category: 'SYSTEM',
        target_type: 'employees',
        target_id: record_id,
        target_label: `SIMPOL - ${nama_karyawan || record_id}`,
        detail: { jenis_dokumen: 'SIMPOL', action_type: 'clear_field' },
        status: 'SUCCESS'
      })

      return NextResponse.json({ 
        success: true, 
        message: `✅ Data SIMPOL berhasil dihapus (karyawan tetap aktif)` 
      })
    }

    // Untuk MCU, SIMPER, PKWT: hapus baris
    const { error } = await supabase
      .from(config.table)
      .delete()
      .eq(config.id_col, record_id)

    if (error) {
      await logAudit({
        req,
        actor_nrp: session.nrp,
        actor_nama: session.nama,
        actor_role: roles.join(','),
        action: 'delete_expired_doc',
        category: 'SYSTEM',
        target_type: config.table,
        target_id: record_id,
        target_label: `${jenis_dokumen} - ${nama_karyawan || record_id}`,
        detail: { jenis_dokumen },
        status: 'FAILED',
        error_message: error.message
      })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAudit({
      req,
      actor_nrp: session.nrp,
      actor_nama: session.nama,
      actor_role: roles.join(','),
      action: 'delete_expired_doc',
      category: 'SYSTEM',
      target_type: config.table,
      target_id: record_id,
      target_label: `${jenis_dokumen} - ${nama_karyawan || record_id}`,
      detail: { jenis_dokumen },
      status: 'SUCCESS'
    })

    return NextResponse.json({ 
      success: true, 
      message: `✅ ${jenis_dokumen} berhasil dihapus` 
    })

  } catch (err: any) {
    console.error('Delete expired error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}