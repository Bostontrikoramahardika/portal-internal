import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'File wajib' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false })

    const result: any = {
      sheet_names: workbook.SheetNames,
      sheets: {}
    }

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: null,
        blankrows: true
      })

      // Ambil 12 row pertama
      const preview = rows.slice(0, 12).map((row, idx) => ({
        row_number: idx + 1,
        total_columns: row ? row.length : 0,
        data: row ? row.slice(0, 45) : []
      }))

      // Cari row yang mengandung nama (bukan angka)
      let firstDataRow = -1
      for (let i = 3; i < Math.min(rows.length, 15); i++) {
        const row = rows[i]
        if (!row) continue
        for (let colIdx = 0; colIdx < 5; colIdx++) {
          const val = row[colIdx]
          if (val && typeof val === 'string' && val.trim().length > 3 && isNaN(Number(val.trim()))) {
            firstDataRow = i
            break
          }
        }
        if (firstDataRow >= 0) break
      }

      result.sheets[sheetName] = {
        total_rows: rows.length,
        total_columns: rows[0]?.length || 0,
        first_12_rows: preview,
        first_data_row_index: firstDataRow,
        first_data_row_number: firstDataRow + 1,
        sample_data_full: firstDataRow >= 0 ? rows[firstDataRow] : null
      }
    }

    return NextResponse.json(result, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 })
  }
}