import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'

const ALLOWED_TABLES = ['employees', 'apd', 'pkwt', 'kpi', 'sp', 'roles', 'approval_matrix']

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  if (!session.roles.includes('hrga')) {
    return NextResponse.json({ error: 'Hanya HRGA yang bisa import' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const table = formData.get('table') as string

    if (!file || !table) {
      return NextResponse.json({ error: 'File dan table wajib diisi' }, { status: 400 })
    }

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Tabel tidak diizinkan untuk import' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' })

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'File Excel kosong' }, { status: 400 })
    }

    // Bersihkan data
    const cleanedData = jsonData.map((row: any) => {
      const clean: any = {}
      Object.keys(row).forEach(key => {
        const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_')
        const val = row[key]

        // Skip kolom sistem
        if (['id', 'created_at', 'updated_at'].includes(cleanKey)) return

        if (cleanKey.includes('tanggal') || cleanKey.includes('mulai') || cleanKey.includes('akhir') || cleanKey.includes('expired')) {
          if (val && typeof val === 'string') {
            const parsed = new Date(val)
            if (!isNaN(parsed.getTime())) {
              clean[cleanKey] = parsed.toISOString().split('T')[0]
            } else {
              clean[cleanKey] = val
            }
          } else if (typeof val === 'number') {
            const excelDate = new Date((val - 25569) * 86400 * 1000)
            clean[cleanKey] = excelDate.toISOString().split('T')[0]
          } else {
            clean[cleanKey] = null
          }
        } else {
          clean[cleanKey] = val === '' ? null : val
        }
      })

      if (table === 'employees' && clean.nrp && !clean.nrp_login) {
        clean.nrp_login = clean.nrp
      }

      return clean
    })

    // Filter baris kosong (baris yang key utamanya kosong)
    const validData = cleanedData.filter((row: any) => {
      if (table === 'employees') return row.nrp && row.nama
      if (table === 'approval_matrix') return row.employee_nrp
      if (table === 'roles') return row.nrp && row.role
      return row.nrp // Default: harus ada NRP
    })

    // Ambil data existing untuk cek duplikat
    let existingKeys: Set<string> = new Set()

    if (table === 'employees') {
      const { data } = await supabase.from('employees').select('nrp')
      existingKeys = new Set((data || []).map(r => String(r.nrp)))
    } else if (table === 'roles') {
      const { data } = await supabase.from('roles').select('nrp, role')
      existingKeys = new Set((data || []).map(r => `${r.nrp}|${r.role}`))
    } else if (table === 'approval_matrix') {
      const { data } = await supabase.from('approval_matrix').select('employee_nrp')
      existingKeys = new Set((data || []).map(r => String(r.employee_nrp)))
    }
    // Untuk apd/pkwt/kpi/sp, kita tidak cek duplikat (karena bisa ada banyak per karyawan)

    let successCount = 0
    let skippedCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (let i = 0; i < validData.length; i++) {
      const row = validData[i]

      // Cek duplikat
      let key = ''
      if (table === 'employees') key = String(row.nrp || '')
      else if (table === 'roles') key = `${row.nrp}|${row.role}`
      else if (table === 'approval_matrix') key = String(row.employee_nrp || '')

      if (key && existingKeys.has(key)) {
        skippedCount++
        continue
      }

      const { error } = await supabase.from(table).insert(row)

      if (error) {
        errorCount++
        if (errors.length < 5) {
          errors.push(`Baris ${i + 2}: ${error.message}`)
        }
      } else {
        successCount++
        if (key) existingKeys.add(key)
      }
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_nrp: session.nrp,
      action: 'IMPORT_EXCEL',
      target_table: table,
      target_id: null,
      detail: {
        total: validData.length,
        success: successCount,
        skipped: skippedCount,
        failed: errorCount
      }
    })

    let message = `✅ Import selesai: ${successCount} baru ditambahkan`
    if (skippedCount > 0) message += `, ${skippedCount} sudah ada (di-skip)`
    if (errorCount > 0) message += `, ${errorCount} gagal`
    message += ` dari total ${validData.length} baris valid.`

    return NextResponse.json({
      success: true,
      message,
      details: {
        total: validData.length,
        success: successCount,
        skipped: skippedCount,
        failed: errorCount,
        errors
      }
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}