import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'

const ALLOWED_TABLES = ['employees', 'apd', 'pkwt', 'kpi', 'sp']

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

    const cleanedData = jsonData.map((row: any) => {
      const clean: any = {}
      Object.keys(row).forEach(key => {
        const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_')
        const val = row[key]

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

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (let i = 0; i < cleanedData.length; i++) {
      const row = cleanedData[i]
      const { error } = await supabase.from(table).insert(row)

      if (error) {
        errorCount++
        if (errors.length < 5) {
          errors.push(`Baris ${i + 2}: ${error.message}`)
        }
      } else {
        successCount++
      }
    }

    await supabase.from('audit_logs').insert({
      actor_nrp: session.nrp,
      action: 'IMPORT_EXCEL',
      target_table: table,
      target_id: null,
      detail: { total: cleanedData.length, success: successCount, failed: errorCount }
    })

    return NextResponse.json({
      success: true,
      message: `✅ Import selesai: ${successCount} berhasil, ${errorCount} gagal dari total ${cleanedData.length} baris.`,
      details: { total: cleanedData.length, success: successCount, failed: errorCount, errors }
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}