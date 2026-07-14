// app/lib/auditLog.ts
// Helper untuk mencatat aktivitas ke tabel audit_logs

import { supabase } from './supabase'
import type { NextRequest } from 'next/server'

export interface AuditLogPayload {
  // Wajib
  actor_nrp: string
  action: string        // reset_password, broadcast, delete_site, dll
  category: AuditCategory
  
  // Opsional
  actor_nama?: string
  actor_role?: string
  target_type?: string  // employee, site, announcement, dll
  target_id?: string
  target_label?: string
  detail?: any
  status?: 'SUCCESS' | 'FAILED'
  error_message?: string
  
  // Metadata request (auto-detect kalau ada req)
  req?: NextRequest
}

export type AuditCategory = 
  | 'AUTH'          // Login, logout, force logout
  | 'ANNOUNCEMENT'  // Broadcast, hapus pengumuman
  | 'SITE'          // Kelola site
  | 'PERMISSION'    // Assign/revoke permission
  | 'EMPLOYEE'      // Kelola karyawan
  | 'PASSWORD'      // Reset password
  | 'SYSTEM'        // Force logout, konfigurasi

/**
 * Catat aktivitas ke audit log
 * Non-blocking: kalau gagal, tidak menghentikan proses utama
 */
export async function logAudit(payload: AuditLogPayload): Promise<void> {
  try {
    // Auto-extract metadata dari request
    let ip_address: string | undefined
    let user_agent: string | undefined
    
    if (payload.req) {
      const req = payload.req
      ip_address = 
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
      user_agent = req.headers.get('user-agent') || 'unknown'
    }
    
    const { error } = await supabase.from('audit_logs').insert({
      actor_nrp: payload.actor_nrp,
      actor_nama: payload.actor_nama || null,
      actor_role: payload.actor_role || null,
      action: payload.action,
      category: payload.category,
      target_type: payload.target_type || null,
      target_id: payload.target_id || null,
      target_label: payload.target_label || null,
      detail: payload.detail || null,
      ip_address: ip_address || null,
      user_agent: user_agent || null,
      status: payload.status || 'SUCCESS',
      error_message: payload.error_message || null
    })
    
    if (error) {
      // Log error ke console saja, jangan throw (biar aksi utama tetap jalan)
      console.error('[AUDIT LOG ERROR]', error.message)
    }
  } catch (err: any) {
    console.error('[AUDIT LOG EXCEPTION]', err.message)
  }
}

/**
 * Helper cepat: extract session ke format audit
 */
export function sessionToAuditActor(session: any) {
  return {
    actor_nrp: session.nrp,
    actor_nama: session.nama,
    actor_role: session.is_super_admin ? 'super_admin' : (session.roles?.[0] || 'user')
  }
}