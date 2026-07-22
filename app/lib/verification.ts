import { supabaseAdmin } from '@/app/lib/supabase'

const MAX_SKIP_COUNT = 3

export type VerificationStatus = {
  need_verify: boolean
  email_missing: boolean
  nohp_missing: boolean
  skip_count: number
  can_skip: boolean
  remaining_skip: number
  current_email: string | null
  current_no_hp: string | null
}

// Regex validasi email standar
export function isValidEmail(email: string): boolean {
  if (!email) return false
  const trimmed = email.trim().toLowerCase()
  if (trimmed.length > 254) return false
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return regex.test(trimmed)
}

// Normalisasi & validasi no HP Indonesia
// Support: 08xxx, +628xxx, 628xxx, 8xxx → normalisasi jadi 628xxx
export function normalizePhone(phone: string): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/[\s\-()]/g, '')
  
  let normalized = cleaned
  if (cleaned.startsWith('+62')) normalized = cleaned.slice(1)
  else if (cleaned.startsWith('62')) normalized = cleaned
  else if (cleaned.startsWith('08')) normalized = '62' + cleaned.slice(1)
  else if (cleaned.startsWith('8')) normalized = '62' + cleaned
  else return null

  // Validasi: 628xxxx (min 10 digit, max 15 digit)
  const regex = /^628\d{7,12}$/
  if (!regex.test(normalized)) return null

  return normalized
}

export function isValidPhone(phone: string): boolean {
  return normalizePhone(phone) !== null
}

export async function getVerificationStatus(nrp: string): Promise<VerificationStatus> {
  // Ambil data karyawan
  const { data: emp, error: empError } = await supabaseAdmin
    .from('employees')
    .select('nrp, email, no_hp')
    .eq('nrp', nrp)
    .maybeSingle()

  if (empError) {
    throw new Error(`Gagal ambil data karyawan: ${empError.message}`)
  }

  if (!emp) {
    throw new Error('Data karyawan tidak ditemukan')
  }

  const email = (emp.email || '').trim()
  const noHp = (emp.no_hp || '').trim()

  const emailMissing = !email
  const nohpMissing = !noHp

  // Kalau sudah lengkap → tidak perlu verify
  if (!emailMissing && !nohpMissing) {
    return {
      need_verify: false,
      email_missing: false,
      nohp_missing: false,
      skip_count: 0,
      can_skip: true,
      remaining_skip: MAX_SKIP_COUNT,
      current_email: email,
      current_no_hp: noHp,
    }
  }

  // Ambil skip_count
  const { data: verifyStatus } = await supabaseAdmin
    .from('user_verification_status')
    .select('skip_count')
    .eq('nrp', nrp)
    .maybeSingle()

  const skipCount = verifyStatus?.skip_count || 0
  const canSkip = skipCount < MAX_SKIP_COUNT
  const remainingSkip = Math.max(0, MAX_SKIP_COUNT - skipCount)

  return {
    need_verify: true,
    email_missing: emailMissing,
    nohp_missing: nohpMissing,
    skip_count: skipCount,
    can_skip: canSkip,
    remaining_skip: remainingSkip,
    current_email: email || null,
    current_no_hp: noHp || null,
  }
}

export async function saveContact(args: {
  nrp: string
  email?: string
  noHp?: string
}): Promise<{ email: string | null; no_hp: string | null }> {
  const nrp = args.nrp.trim()
  if (!nrp) throw new Error('NRP tidak valid')

  const updatePayload: Record<string, string> = {}

  // Validasi email
  if (args.email !== undefined) {
    const email = args.email.trim().toLowerCase()
    if (!email) throw new Error('Email wajib diisi')
    if (!isValidEmail(email)) throw new Error('Format email tidak valid')
    updatePayload.email = email
  }

  // Validasi no HP
  if (args.noHp !== undefined) {
    const noHp = args.noHp.trim()
    if (!noHp) throw new Error('No HP wajib diisi')
    const normalized = normalizePhone(noHp)
    if (!normalized) throw new Error('Format no HP tidak valid (contoh: 08123456789)')
    updatePayload.no_hp = normalized
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new Error('Tidak ada data yang diisi')
  }

  // Update employees
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('employees')
    .update(updatePayload)
    .eq('nrp', nrp)
    .select('email, no_hp')
    .single()

  if (updateError) {
    throw new Error(`Gagal simpan data: ${updateError.message}`)
  }

  // Cek apakah sekarang sudah lengkap
  const emailFilled = !!(updated.email && updated.email.trim())
  const nohpFilled = !!(updated.no_hp && updated.no_hp.trim())
  const isFullyVerified = emailFilled && nohpFilled

  // Upsert verification status
  const verifyPayload: Record<string, unknown> = {
    nrp,
    updated_at: new Date().toISOString(),
  }

  if (isFullyVerified) {
    // Reset skip_count kalau sudah lengkap
    verifyPayload.skip_count = 0
    verifyPayload.verified_at = new Date().toISOString()
  }

  const { error: verifyError } = await supabaseAdmin
    .from('user_verification_status')
    .upsert(verifyPayload, { onConflict: 'nrp' })

  if (verifyError) {
    console.error('Gagal upsert verification status:', verifyError.message)
    // Non-fatal, data karyawan sudah tersimpan
  }

  return {
    email: updated.email || null,
    no_hp: updated.no_hp || null,
  }
}

export async function incrementSkipCount(nrp: string): Promise<{
  skip_count: number
  can_skip_more: boolean
  remaining_skip: number
}> {
  const nrpClean = nrp.trim()
  if (!nrpClean) throw new Error('NRP tidak valid')

  // Ambil skip_count saat ini
  const { data: existing } = await supabaseAdmin
    .from('user_verification_status')
    .select('skip_count')
    .eq('nrp', nrpClean)
    .maybeSingle()

  const currentCount = existing?.skip_count || 0

  if (currentCount >= MAX_SKIP_COUNT) {
    throw new Error('Batas maksimal skip sudah tercapai')
  }

  const newCount = currentCount + 1
  const now = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from('user_verification_status')
    .upsert(
      {
        nrp: nrpClean,
        skip_count: newCount,
        last_skip_at: now,
        updated_at: now,
      },
      { onConflict: 'nrp' }
    )

  if (error) {
    throw new Error(`Gagal update skip count: ${error.message}`)
  }

  return {
    skip_count: newCount,
    can_skip_more: newCount < MAX_SKIP_COUNT,
    remaining_skip: Math.max(0, MAX_SKIP_COUNT - newCount),
  }
}