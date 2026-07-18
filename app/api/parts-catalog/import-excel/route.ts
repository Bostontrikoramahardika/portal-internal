import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { requireSuperAdmin } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { uploadFile } from '@/app/lib/gdrive'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 menit

type ColMap = {
  ref: number
  partNo: number
  desc: number
  qty: number
  serial: number | null
}

function asText(v: any): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    // exceljs kadang return object { richText: [...] } atau { result: ... }
    if ('text' in v) return String(v.text || '').trim()
    if ('result' in v) return String(v.result || '').trim()
    if ('richText' in v && Array.isArray(v.richText)) {
      return v.richText.map((r: any) => r.text || '').join('').trim()
    }
    return String(v).trim()
  }
  return String(v).trim()
}

function getCellText(ws: ExcelJS.Worksheet, address: string): string {
  try {
    const cell = ws.getCell(address)
    return asText(cell.text || cell.value)
  } catch {
    return ''
  }
}

function findHeaderRow(ws: ExcelJS.Worksheet): { headerRow: number; cols: ColMap } | null {
  const maxRow = Math.min(30, ws.rowCount || 30)

  for (let r = 1; r <= maxRow; r++) {
    const row = ws.getRow(r)
    // getCell dari index 1 (exceljs 1-based)
    const texts: string[] = []
    const maxCol = Math.max(20, row.cellCount || 20)
    for (let c = 1; c <= maxCol; c++) {
      texts.push(asText(row.getCell(c).text || row.getCell(c).value).toUpperCase())
    }

    // cari header
    const idxItem = texts.findIndex(t => t && (t === 'ITEM' || t === 'NO' || t === 'NO.' || t === 'REF' || t === 'REF.' || t === 'REF NO'))
    const idxPart = texts.findIndex(t => t && (t.includes('PART') && t.includes('NO')))
    const idxDesc = texts.findIndex(t => t && (t === 'DESCRIPTION' || t === 'NAME' || t === 'DESC' || t.includes('DESCRIPTION') || t.includes('NAME')))
    const idxQty  = texts.findIndex(t => t && (t === 'QTY' || t === "Q'TY" || t === 'QTY.' || t === 'QUANTITY' || t.includes('QTY') || t.includes("Q'TY")))
    const idxSer  = texts.findIndex(t => t && t.includes('SERIAL'))

    if (idxItem !== -1 && idxPart !== -1 && idxDesc !== -1 && idxQty !== -1) {
      return {
        headerRow: r,
        cols: {
          ref: idxItem + 1,      // convert ke 1-based (exceljs)
          partNo: idxPart + 1,
          desc: idxDesc + 1,
          qty: idxQty + 1,
          serial: idxSer !== -1 ? idxSer + 1 : null,
        }
      }
    }
  }
  return null
}

function pickAssemblyName(ws: ExcelJS.Worksheet, headerRow: number): string {
  const candidates: string[] = []

  // Coba beberapa cell yang biasa dipakai untuk nama assembly
  const cellsToCheck = ['C2', 'D2', 'B2', 'C1', 'D1', 'A2', 'C3', 'D3']
  for (const addr of cellsToCheck) {
    const t = getCellText(ws, addr)
    if (t && t.length >= 3 && !t.toUpperCase().includes('S/N')) {
      candidates.push(t)
    }
  }

  // Fallback: cari di row sebelum header
  if (headerRow > 1) {
    for (let r = 1; r < headerRow; r++) {
      const row = ws.getRow(r)
      for (let c = 1; c <= 10; c++) {
        const t = asText(row.getCell(c).text || row.getCell(c).value)
        if (t && t.length >= 5 && !t.toUpperCase().includes('S/N') && !t.toUpperCase().includes('PART NO')) {
          candidates.push(t)
        }
      }
    }
  }

  // Pilih candidate terpanjang yang bukan cuma angka/serial
  const filtered = candidates.filter(c => !/^[A-Z0-9\-\s]{1,20}$/.test(c) || c.length > 15)
  const best = (filtered.length > 0 ? filtered : candidates).sort((a, b) => b.length - a.length)[0]

  return best || ws.name
}

function pickUnitHeader(ws: ExcelJS.Worksheet): string | null {
  const candidates = ['B1', 'D1', 'A1', 'C1']
  for (const addr of candidates) {
    const t = getCellText(ws, addr)
    if (t && t.toUpperCase().includes('S/N')) return t
    if (t && t.length > 5) return t
  }
  return null
}

function getBestImage(workbook: ExcelJS.Workbook, ws: ExcelJS.Worksheet): { buffer: Buffer; ext: string } | null {
  try {
    const images = ws.getImages()
    if (!images || images.length === 0) return null

    const ranked = images
      .map(img => {
        const range: any = img.range
        const tl = range?.tl
        const br = range?.br
        const area = tl && br ? Math.abs((br.col - tl.col) * (br.row - tl.row)) : 0
        return { img, area }
      })
      .sort((a, b) => b.area - a.area)

    const best = ranked[0]?.img
    if (!best) return null

    // @ts-ignore
    const meta = workbook.getImage(best.imageId) as any
    const ext = (meta?.extension || 'png').toLowerCase()

    let buffer: Buffer | null = null
    if (meta?.buffer && Buffer.isBuffer(meta.buffer)) {
      buffer = meta.buffer
    } else if (meta?.base64) {
      buffer = Buffer.from(meta.base64, 'base64')
    }

    if (!buffer) return null
    return { buffer, ext }
  } catch (e) {
    console.error('getBestImage error:', e)
    return null
  }
}

function parseItems(ws: ExcelJS.Worksheet, headerRow: number, cols: ColMap) {
  const out: Array<{
    ref_no: number | null
    part_number: string | null
    part_name: string | null
    qty: number | null
    serial_no: string | null
  }> = []

  const maxRow = ws.rowCount || headerRow + 200
  let emptyStreak = 0

  for (let r = headerRow + 1; r <= maxRow; r++) {
    const row = ws.getRow(r)

    const refTxt = asText(row.getCell(cols.ref).text || row.getCell(cols.ref).value)
    const partNo = asText(row.getCell(cols.partNo).text || row.getCell(cols.partNo).value)
    const desc   = asText(row.getCell(cols.desc).text || row.getCell(cols.desc).value)
    const qtyTxt = asText(row.getCell(cols.qty).text || row.getCell(cols.qty).value)
    const serial = cols.serial !== null ? asText(row.getCell(cols.serial).text || row.getCell(cols.serial).value) : ''

    // stop condition: 5 baris kosong berturut-turut
    if (!partNo && !desc && !refTxt) {
      emptyStreak++
      if (emptyStreak >= 5) break
      continue
    }
    emptyStreak = 0

    // Skip baris tanpa part_number DAN tanpa part_name
    if (!partNo && !desc) continue

    const refNo = refTxt ? parseInt(refTxt.replace(/[^\d]/g, ''), 10) : null
    const qty = qtyTxt ? parseInt(qtyTxt.replace(/[^\d]/g, ''), 10) : null

    out.push({
      ref_no: Number.isFinite(refNo as any) ? refNo : null,
      part_number: partNo || null,
      part_name: desc || null,
      qty: Number.isFinite(qty as any) ? qty : null,
      serial_no: serial || null,
    })
  }

  return out
}

async function chunkInsert(table: string, rows: any[], chunkSize = 500) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const { error } = await supabaseAdmin.from(table).insert(chunk)
    if (error) throw error
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const unit_code = asText(form.get('unit_code'))
    const unit_name = asText(form.get('unit_name')) || null
    const replace = asText(form.get('replace')).toLowerCase() === 'true'

    if (!file) return NextResponse.json({ error: 'File Excel wajib' }, { status: 400 })
    if (!unit_code) return NextResponse.json({ error: 'unit_code wajib (contoh: PC200-7)' }, { status: 400 })

    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File terlalu besar (max 100MB)' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // upsert unit
    const { data: unitRow, error: unitErr } = await supabaseAdmin
      .from('parts_units')
      .upsert({ unit_code, unit_name }, { onConflict: 'unit_code' })
      .select()
      .single()

    if (unitErr) throw unitErr

    if (replace) {
      const { error: delErr } = await supabaseAdmin
        .from('parts_assemblies')
        .delete()
        .eq('unit_id', unitRow.id)
      if (delErr) throw delErr
    }

    // upload original excel to Drive
    const excelMime =
      file.type ||
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    let excelDrive: any = null
    try {
      excelDrive = await uploadFile(`[CATALOG]_${unit_code}_${file.name}`, excelMime, buffer)
    } catch (e: any) {
      console.warn('Upload Excel to Drive failed (skipping):', e?.message)
    }

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    const results: any[] = []
    let importedAssemblies = 0
    let importedItems = 0
    let skippedSheets = 0

    const worksheets = workbook.worksheets.filter(ws => ws.state !== 'hidden')

    for (let idx = 0; idx < worksheets.length; idx++) {
      const ws = worksheets[idx]

      try {
        const header = findHeaderRow(ws)
        if (!header) {
          skippedSheets++
          results.push({ sheet: ws.name, status: 'skipped', reason: 'Header ITEM/PART NO/DESCRIPTION/QTY tidak ditemukan' })
          continue
        }

        const unitHeader = pickUnitHeader(ws)
        const assemblyName = pickAssemblyName(ws, header.headerRow)
        const items = parseItems(ws, header.headerRow, header.cols)

        // extract image
        let imageDrive: any = null
        const img = getBestImage(workbook, ws)
        if (img) {
          try {
            const mime = (img.ext === 'jpg' || img.ext === 'jpeg') ? 'image/jpeg' : 'image/png'
            const safeAsmName = assemblyName.replace(/[^\w\s\-]/g, '_').substring(0, 50)
            imageDrive = await uploadFile(
              `[ASM]_${unit_code}_${String(idx + 1).padStart(3, '0')}_${safeAsmName}.${img.ext}`,
              mime,
              img.buffer
            )
          } catch (e: any) {
            console.warn(`Upload image sheet ${ws.name} failed:`, e?.message)
          }
        }

        // insert assembly
        const { data: asm, error: asmErr } = await supabaseAdmin
          .from('parts_assemblies')
          .insert({
            unit_id: unitRow.id,
            sheet_name: ws.name,
            assembly_name: assemblyName,
            unit_header: unitHeader,
            image_drive_file_id: imageDrive?.fileId || null,
            image_drive_file_name: imageDrive?.fileName || null,
            image_drive_web_view_link: imageDrive?.webViewLink || null,
            sort_order: idx + 1,
          })
          .select()
          .single()

        if (asmErr) throw asmErr
        importedAssemblies++

        if (items.length > 0) {
          const rows = items.map(x => ({
            assembly_id: asm.id,
            ref_no: x.ref_no,
            part_number: x.part_number,
            part_name: x.part_name,
            qty: x.qty,
            serial_no: x.serial_no,
          }))
          await chunkInsert('parts_items', rows, 500)
          importedItems += rows.length
        }

        results.push({
          sheet: ws.name,
          status: 'imported',
          assembly: assemblyName,
          items: items.length,
          has_image: !!imageDrive,
        })

      } catch (sheetErr: any) {
        console.error(`Sheet ${ws.name} error:`, sheetErr)
        skippedSheets++
        results.push({
          sheet: ws.name,
          status: 'error',
          reason: sheetErr?.message || String(sheetErr),
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Import selesai',
      unit: unitRow,
      excel_drive: excelDrive ? {
        file_id: excelDrive.fileId,
        file_name: excelDrive.fileName,
        web_view_link: excelDrive.webViewLink,
      } : null,
      summary: {
        total_sheets: worksheets.length,
        imported_assemblies: importedAssemblies,
        imported_items: importedItems,
        skipped_sheets: skippedSheets,
      },
      details: results,
    })
  } catch (err: any) {
    console.error('IMPORT EXCEL ERROR:', err)
    return NextResponse.json(
      { error: 'Import gagal', detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}