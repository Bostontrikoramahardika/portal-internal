// app/api/notifications/send-email/route.ts
// ═══════════════════════════════════════════
// DRAFT: Email notification service
// Isi dengan Resend / Nodemailer / service lain nanti
// Saat ini hanya LOG, belum kirim email sungguhan
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

// ── TODO: Pilih salah satu dan uncomment ──

// OPSI A: Resend (https://resend.com)
// import { Resend } from 'resend'
// const resend = new Resend(process.env.RESEND_API_KEY)

// OPSI B: Nodemailer + Gmail SMTP
// import nodemailer from 'nodemailer'
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.GMAIL_USER,
//     pass: process.env.GMAIL_APP_PASSWORD  // App Password, bukan password biasa
//   }
// })

export async function POST(req: NextRequest) {
  try {
    const { to, subject, body, notification_id } = await req.json()

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'to, subject, body wajib diisi' }, { status: 400 })
    }

    // ── SAAT INI: Hanya log, belum kirim sungguhan ──
    console.log('📧 EMAIL DRAFT (belum terkirim):')
    console.log(`   To: ${to}`)
    console.log(`   Subject: ${subject}`)
    console.log(`   Body: ${body.substring(0, 100)}...`)

    // ── TODO: Aktifkan salah satu di bawah ini ──

    // OPSI A: Resend
    // const { data, error } = await resend.emails.send({
    //   from: 'BTM Portal <noreply@btm-portal.com>',
    //   to: [to],
    //   subject,
    //   html: body
    // })
    // if (error) throw new Error(error.message)

    // OPSI B: Nodemailer
    // await transporter.sendMail({
    //   from: '"BTM Portal" <noreply@btm-portal.com>',
    //   to,
    //   subject,
    //   html: body
    // })

    // ── Update status email_sent di log notifikasi ──
    if (notification_id) {
      await supabase
        .from('attendance_notifications')
        .update({ email_sent: true })
        .eq('id', notification_id)
    }

    return NextResponse.json({
      ok: true,
      message: 'Email logged (draft mode - belum terkirim sungguhan)',
      draft: true
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}