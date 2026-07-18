import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { requireSuperAdmin } from '@/app/lib/auth'
import { supabaseAdmin } from '@/app/lib/supabase'
import { uploadFile } from '@/app/lib/gdrive'

export const runtime = 'nodejs'

type ColMap = {
  ref: number
  partNo: number
  desc: number
  qty: number
  serial: number | null
}

function asText(v: any) {
  const t = (v ?? '').toString().trim()
  return t
}

function findHeaderRow(ws: ExcelJS.Worksheet): { headerRow: number; cols: ColMap } | null {
  for (let r = 1; r <= Math.min(30, ws.rowCount || 30); r++) {
    const row = ws.getRow(r)
    const cells = row.values as any[]
    const texts = cells.map(c => asText(c).toUpperCase())

    const idxItem = texts.findIndex(t => t.includes('ITEM') || t === 'NO' || t.includes('NO.'))
    const idxPart = texts.findIndex(t => t.includes('PART') && t.includes('NO'))
    const idxDesc = texts.findIndex(t => t.includes('DESCRIPTION') || t.includes('NAME'))
    const idxQty  = texts.findIndex(t => t.includes('QTY') || t.includes("Q'TY") || t.includes('QTY.'))
    const idxSer  = texts.findIndex(t => t.includes('SERIAL'))

    if (idxItem !== -1 && idxPart !== -1 && idxDesc !== -1 && idxQty !== -1) {
      return {
        headerRow: r,
        cols: {
          ref: idxItem,
          partNo: idxPart,
          desc: idxDesc,
          qty: idxQty,
          serial: idxSer !== -1 ? idxSer : null,
        }
      }
    }
  }
  return null
}

function pickAssemblyName(ws: ExcelJS.Worksheet, headerRow: number) {
  // biasanya ada di row 2 (C2/D2), tapi kita cari yang paling "masuk akal"
  const candidates: string[] = []

  const c2 = asText(ws.getCell('C2').text || ws.getCell('C2').value)
  const d2 = asText(ws.getCell('D2').text || ws.getCell('D2').value)
  if (c2) candidates.push(c2)
  if (d2) candidates.push(d2)

  // fallback: cari di row (headerRow - 1)
  if (headerRow > 1) {
    const row = ws.getRow(headerRow - 1)
    for (let i = 1; i <= Math.min(10, row.cellCount || 10); i++) {
      const t = asText(row.getCell(i).text || row.getCell(i).value)
      if (t && t.length >= 5 && !t.toUpperCase().includes('S/N')) candidates.push(t)
    }
  }

  const best = candidates.sort((a, b) => b.length - a.length)[0]
  return best || ws.name
}

function pickUnitHeader(ws: ExcelJS.Worksheet) {
  const b1 = asText(ws.getCell('B1').text || ws.getCell('B1').value)
  const d1 = asText(ws.getCell('D1').text || ws.getCell('D1').value)
  return b1 || d1 || null
}

function getBestImage(workbook: ExcelJS.Workbook, ws: ExcelJS.Worksheet): { buffer: Buffer; ext: string } | null {
  const images = ws.getImages()
  if (!images || images.length === 0) return null

  // pilih gambar dengan area range terbesar
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

  // exceljs: workbook.getImage(imageId) => { extension, base64 } (kadang ada buffer)
  // @ts-ignore
  const meta = workbook.getImage(best.imageId) as any
  const ext = (meta?.extension || 'png').toLowerCase()

  let buffer: Buffer | null = null
  if (meta?.buffer && Buffer.isBuffer(meta.buffer)) buffer = meta.buffer
  else if (meta?.base64) buffer = Buffer.from(meta.base64, 'base64')

  if (!buffer) return null
  return { buffer, ext }
}

function parseItems(ws: ExcelJS.Worksheet, headerRow: number, cols: ColMap) {
  const out: Array<{
    ref_no: number | null
    part_number: string | null
    part_name: string | null
    qty: number | null
    serial_no: string | null
  }> = []

  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r)

    const refTxt = asText(row.getCell(cols.ref + 1).text || row.getCell(cols.ref + 1).value)
    const partNo = asText(row.getCell(cols.partNo + 1).text || row.getCell(cols.partNo + 1).value)
    const desc   = asText(row.getCell(cols.desc + 1).text || row.getCell(cols.desc + 1).value)
    const qtyTxt = asText(row.getCell(cols.qty + 1).text || row.getCell(cols.qty + 1).value)
    const serial = cols.serial !== null ? asText(row.getCell(cols.serial + 1).text || row.getCell(cols.serial + 1).value) : ''

    // stop condition: partNo & desc kosong (sudah lewat tabel)
    if (!partNo && !desc && r > headerRow + 2) break

    // skip row kosong
    if (!partNo && !desc && !refTxt) continue

    const refNo = refTxt ? parseInt(refTxt, 10) : null
    const qty = qtyTxt ? parseInt(qtyTxt, 10) : null

    out.push({
      ref_no: Number.isFinite(refNo as any) ? refNo : null,
      part_number: partNo || null,
      part_name: desc || null,
      qty: Number.isFinite(qty as any) ? qty : null,
      serial_no: serial || null,
    })
  }

  // filter: yang benar-benar punya part_number / part_name
  return out.filter(x => x.part_number || x.part_name)
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

    // replace existing (delete assemblies => items auto cascade)
    if (replace) {
      const { error: delErr } = await supabaseAdmin
        .from('parts_assemblies')
        .delete()
        .eq('unit_id', unitRow.id)
      if (delErr) throw delErr
    }

    // upload original excel to Drive (opsional, untuk arsip)
    const excelMime =
      file.type ||
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    const excelDrive = await uploadFile(`[CATALOG]_${unit_code}_${file.name}`, excelMime, buffer)

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)

    const results: any[] = []
    let importedAssemblies = 0
    let importedItems = 0
    let skippedSheets = 0

    const worksheets = workbook.worksheets.filter(ws => ws.state !== 'hidden')

    for (let idx = 0; idx < worksheets.length; idx++) {
      const ws = worksheets[idx]

      const header = findHeaderRow(ws)
      if (!header) {
        skippedSheets++
        results.push({ sheet: ws.name, status: 'skipped', reason: 'Header ITEM/PART NO/DESCRIPTION/QTY tidak ditemukan' })
        continue
      }

      const unitHeader = pickUnitHeader(ws)
      const assemblyName = pickAssemblyName(ws, header.headerRow)
      const items = parseItems(ws, header.headerRow, header.cols)

      // extract image + upload
      let imageDrive: any = null
      const img = getBestImage(workbook, ws)
      if (img) {
        const mime = img.ext === 'jpg' || img.ext === 'jpeg' ? 'image/jpeg' : 'image/png'
        imageDrive = await uploadFile(
          `[ASM]_${unit_code}_${String(idx + 1).padStart(3, '0')}_${ws.name}_${assemblyName}.${img.ext}`,
          mime,
          img.buffer
        )
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

      results.push({ sheet: ws.name, status: 'imported', assembly: assemblyName, items: items.length })
    }

    return NextResponse.json({
      success: true,
      message: 'Import selesai',
      unit: unitRow,
      excel_drive: {
        file_id: excelDrive.fileId,
        file_name: excelDrive.fileName,
        web_view_link: excelDrive.webViewLink,
      },
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