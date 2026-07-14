// app/api/audit-logs/route.ts
// API untuk ambil riwayat audit logs (Khusus Super Admin)

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

// ============================================
// GET: Ambil daftar audit logs dengan filter
// ============================================
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    // 🔒 Hanya Super Admin yang boleh lihat audit logs
    if (!session.is_super_admin) {
      return NextResponse.json({ error: 'Akses ditolak - hanya Super Admin' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')       // AUTH, ANNOUNCEMENT, dll
    const action = searchParams.get('action')           // broadcast, reset_password, dll
    const actorNrp = searchParams.get('actor_nrp')      // filter by pelaku
    const startDate = searchParams.get('start_date')    // YYYY-MM-DD
    const endDate = searchParams.get('end_date')        // YYYY-MM-DD
    const limit = parseInt(searchParams.get('limit') || '100')
    const search = searchParams.get('search')           // free-text search

    // Build query
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (category) query = query.eq('category', category)
    if (action) query = query.eq('action', action)
    if (actorNrp) query = query.eq('actor_nrp', actorNrp)

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00`)
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59`)
    }

    // Search di actor_nama atau target_label
    if (search) {
      query = query.or(`actor_nama.ilike.%${search}%,target_label.ilike.%${search}%,actor_nrp.ilike.%${search}%`)
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('Audit logs GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Hitung statistik ringkas
    const stats = {
      total: logs?.length || 0,
      success: (logs || []).filter(l => l.status === 'SUCCESS').length,
      failed: (logs || []).filter(l => l.status === 'FAILED').length,
      by_category: {} as Record<string, number>
    }

    ;(logs || []).forEach((l: any) => {
      const cat = l.category || 'UNKNOWN'
      stats.by_category[cat] = (stats.by_category[cat] || 0) + 1
    })

    return NextResponse.json({
      logs: logs || [],
      stats,
      filters_applied: {
        category, action, actor_nrp: actorNrp, start_date: startDate, end_date: endDate, search
      }
    })
  } catch (err: any) {
    console.error('Audit logs exception:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ============================================
// DELETE: Hapus log lama (opsional, untuk cleanup)
// Body: { older_than_days: 90 }
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session?.is_super_admin) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const olderThanDays = parseInt(body.older_than_days || '90')

    if (olderThanDays < 30) {
      return NextResponse.json({ 
        error: 'Minimal 30 hari untuk menghindari kehilangan data penting' 
      }, { status: 400 })
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const { error, count } = await supabase
      .from('audit_logs')
      .delete({ count: 'exact' })
      .lt('created_at', cutoffDate.toISOString())

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `✅ Berhasil hapus ${count || 0} log yang lebih tua dari ${olderThanDays} hari`,
      deleted_count: count || 0
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}