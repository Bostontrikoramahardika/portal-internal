// app/api/scan/[qr_token]/route.ts
// GET  → Info QR (bisa qr_locations atau events)
//        Kalau qr_location → return list event AKTIF hari ini
//        Kalau qr_event → return 1 event
// POST → Submit absensi (event_id wajib kalau qr_location)

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qr_token: string }> }
) {
  try {
    const { qr_token } = await params

    // Cek dulu di qr_locations
    const { data: qrLoc } = await supabase
      .from('qr_locations')
      .select('*')
      .eq('qr_token', qr_token)
      .eq('active', true)
      .maybeSingle()

    // Cek user login
    const token = request.cookies.get('session_token')?.value
    let userInfo: any = null
    let lastSignature: string | null = null

    if (token) {
      const session = await getSession(token)
      if (session) {
        const { data: emp } = await supabase
          .from('employees')
          .select('nrp, nama, jabatan, departemen, site, last_signature')
          .eq('nrp', session.nrp)
          .single()

        if (emp) {
          userInfo = {
            nrp: emp.nrp,
            nama: emp.nama,
            jabatan: emp.jabatan,
            departemen: emp.departemen,
            site: emp.site
          }
          lastSignature = emp.last_signature || null
        }
      }
    }

    // Ambil master perusahaan
    const { data: perusahaan } = await supabase
      .from('master_perusahaan')
      .select('id, nama_perusahaan, is_default')
      .eq('active', true)
      .order('is_default', { ascending: false })
      .order('nama_perusahaan')

    // Mode: QR Lokasi (multi-event)
    if (qrLoc) {
      // Ambil event AKTIF hari ini di lokasi ini
      const today = new Date().toISOString().split('T')[0]

      const { data: events } = await supabase
        .from('events')
        .select('id, nama_event, deskripsi, tipe, tanggal, jam_mulai, jam_selesai, status')
        .eq('qr_location_id', qrLoc.id)
        .eq('tanggal', today)
        .eq('status', 'AKTIF')
        .order('jam_mulai', { ascending: true })

      // Cek untuk setiap event, apakah user sudah scan
      let eventList = events || []
      if (userInfo) {
        const eventIds = eventList.map((e: any) => e.id)
        if (eventIds.length > 0) {
          const { data: scanned } = await supabase
            .from('event_attendances')
            .select('event_id')
            .in('event_id', eventIds)
            .eq('nrp', userInfo.nrp)

          const scannedIds = new Set((scanned || []).map((s: any) => s.event_id))
          eventList = eventList.map((e: any) => ({
            ...e,
            already_scanned: scannedIds.has(e.id)
          }))
        }
      }

      return NextResponse.json({
        success: true,
        mode: 'qr_location',
        qr_location: qrLoc,
        events: eventList,
        is_logged_in: !!userInfo,
        user: userInfo,
        last_signature: lastSignature,
        perusahaan: perusahaan || []
      })
    }

    // Mode: QR Event Standalone
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('qr_token', qr_token)
      .single()

    if (error || !event) {
      return NextResponse.json({ error: 'QR tidak valid atau event tidak ditemukan' }, { status: 404 })
    }

    if (event.status !== 'AKTIF') {
      return NextResponse.json({
        error: `Event ini sudah ${event.status.toLowerCase()}`,
        event
      }, { status: 400 })
    }

    let alreadyScanned = false
    if (userInfo) {
      const { data: existing } = await supabase
        .from('event_attendances')
        .select('id')
        .eq('event_id', event.id)
        .eq('nrp', userInfo.nrp)
        .maybeSingle()

      alreadyScanned = !!existing
    }

    return NextResponse.json({
      success: true,
      mode: 'qr_event',
      event,
      is_logged_in: !!userInfo,
      user: userInfo,
      last_signature: lastSignature,
      already_scanned: alreadyScanned,
      perusahaan: perusahaan || []
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ qr_token: string }> }
) {
  try {
    const { qr_token } = await params
    const body = await request.json()
    const {
      event_id,         // wajib untuk mode qr_location
      nama,
      jabatan,
      perusahaan_id,
      perusahaan_nama,  // string kalau tamu ketik manual
      no_hp,
      signature
    } = body

    if (!signature) {
      return NextResponse.json({ error: 'Tanda tangan wajib diisi' }, { status: 400 })
    }

    // Cari event: pakai event_id kalau ada, kalau tidak cari by qr_token
    let event: any = null
    if (event_id) {
      const { data } = await supabase
        .from('events')
        .select('id, status, nama_event')
        .eq('id', event_id)
        .single()
      event = data
    } else {
      const { data } = await supabase
        .from('events')
        .select('id, status, nama_event')
        .eq('qr_token', qr_token)
        .single()
      event = data
    }

    if (!event) {
      return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 })
    }

    if (event.status !== 'AKTIF') {
      return NextResponse.json({ error: `Event sudah ${event.status.toLowerCase()}` }, { status: 400 })
    }

    // Cek session
    const token = request.cookies.get('session_token')?.value
    let nrp: string | null = null
    let isTamu = true
    let finalNama = nama
    let finalJabatan = jabatan || null

    if (token) {
      const session = await getSession(token)
      if (session) {
        const { data: emp } = await supabase
          .from('employees')
          .select('nrp, nama, jabatan')
          .eq('nrp', session.nrp)
          .single()

        if (emp) {
          nrp = emp.nrp
          isTamu = false
          finalNama = emp.nama
          finalJabatan = emp.jabatan

          // Cek duplikasi
          const { data: existing } = await supabase
            .from('event_attendances')
            .select('id')
            .eq('event_id', event.id)
            .eq('nrp', emp.nrp)
            .maybeSingle()

          if (existing) {
            return NextResponse.json({ error: 'Anda sudah tercatat hadir di event ini' }, { status: 400 })
          }

          // Update last_signature
          await supabase
            .from('employees')
            .update({ last_signature: signature })
            .eq('nrp', emp.nrp)
        }
      }
    }

    // Validasi tamu
    if (isTamu && !finalNama) {
      return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 })
    }
    if (isTamu && !finalJabatan) {
      return NextResponse.json({ error: 'Jabatan wajib diisi untuk tamu' }, { status: 400 })
    }

    // Resolve perusahaan (dari master atau nama manual)
    let perusahaanId = perusahaan_id || null
    let perusahaanNama: string | null = null

    if (perusahaan_id) {
      const { data: mp } = await supabase
        .from('master_perusahaan')
        .select('nama_perusahaan')
        .eq('id', perusahaan_id)
        .single()
      perusahaanNama = mp?.nama_perusahaan || null
    } else if (perusahaan_nama) {
      perusahaanNama = String(perusahaan_nama).trim()
    } else if (!isTamu) {
      // Internal → default PT. Boston
      const { data: defaultBoston } = await supabase
        .from('master_perusahaan')
        .select('id, nama_perusahaan')
        .ilike('nama_perusahaan', '%Boston%')
        .maybeSingle()
      if (defaultBoston) {
        perusahaanId = defaultBoston.id
        perusahaanNama = defaultBoston.nama_perusahaan
      }
    }

    if (isTamu && !perusahaanNama) {
      return NextResponse.json({ error: 'Perusahaan wajib diisi' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
    const ua = request.headers.get('user-agent') || null

    const { data: newAtt, error } = await supabase
      .from('event_attendances')
      .insert({
        event_id: event.id,
        nrp,
        nama: finalNama,
        jabatan: finalJabatan,
        is_tamu: isTamu,
        perusahaan: perusahaanNama,
        perusahaan_id: perusahaanId,
        no_hp: no_hp || null,
        signature_url: signature,
        ip_address: ip,
        user_agent: ua
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      message: `✅ Terima kasih ${finalNama}, kehadiran Anda di "${event.nama_event}" telah tercatat`,
      data: newAtt
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}