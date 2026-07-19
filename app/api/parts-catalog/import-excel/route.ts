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
    const texts: string[] = []
    const maxCol = Math.max(20, row.cellCount || 20)
    for (let c = 1; c <= maxCol; c++) {
      texts.push(asText(row.getCell(c).text || row.getCell(c).value).toUpperCase())
    }
    const idxItem = texts.findIndex(t => t && (t === 'ITEM' || t === 'NO' || t === 'NO.' || t === 'REF' || t === 'REF.' || t === 'REF NO'))
    const idxPart = texts.findIndex(t => t && (t.includes('PART') && t.includes('NO')))
    const idxDesc = texts.findIndex(t => t && (t === 'DESCRIPTION' || t === 'NAME' || t === 'DESC' || t.includes('DESCRIPTION') || t.includes('NAME')))
    const idxQty  = texts.findIndex(t => t && (t === 'QTY' || t === "Q'TY" || t === 'QTY.' || t === 'QUANTITY' || t.includes('QTY') || t.includes("Q'TY")))
    const idxSer  = texts.findIndex(t => t && t.includes('SERIAL'))

    if (idxItem !== -1 && idxPart !== -1 && idxDesc !== -1 && idxQty !== -1) {
      return {
        headerRow: r,
        cols: {
          ref: idxItem + 1,
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
  for (let r = 1; r < headerRow; r++) {
    const row = ws.getRow(r)
    for (let c = 1; c <= 8; c++) {
      const t = asText(row.getCell(c).text || row.getCell(c).value)
      if (t && t.length > 5) {
        const upper = t.toUpperCase()
        if (!upper.includes('S/N') && !upper.includes('PART NO') && !upper.includes('PAGE') && !upper.includes('FIG') && !/^[0-9\-\s]+$/.test(t)) {
          candidates.push(t)
        }
      }
    }
  }
  return candidates.length > 0 ? candidates[candidates.length - 1] : ws.name
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

function getBestImage(workbook: ExcelJS.Workbook, ws: ExcelJS.Worksheet): any {
  try {
    const images = ws.getImages()
    if (!images || images.length === 0) return null
    const ranked = images.map(img => {
      const range: any = img.range
      const tl = range?.tl; const br = range?.br
      const area = tl && br ? Math.abs((br.col - tl.col) * (br.row - tl.row)) : 0
      return { img, area }
    }).sort((a, b) => b.area - a.area)
    const best = ranked[0]?.img
    if (!best) return null
    // @ts-ignore
    const meta = workbook.getImage(best.imageId) as any
    const ext = (meta?.extension || 'png').toLowerCase()
    let buffer: Buffer | null = null
    if (meta?.buffer) buffer = Buffer.from(meta.buffer)
    else if (meta?.base64) buffer = Buffer.from(meta.base64, 'base64')
    if (!buffer) return null
    return { buffer, ext }
  } catch (e) {
    return null
  }
}

function parseItems(ws: ExcelJS.Worksheet, headerRow: number, cols: ColMap) {
  const out: any[] = []
  const maxRow = ws.rowCount || headerRow + 200
  let emptyStreak = 0
  const trashKeywords = ['PAGE', 'REF.', 'NO.', 'PRINTED', 'DATE', 'CONTINUED', 'S/N', 'REPLACED BY', 'REPLACEMENT']

  for (let r = headerRow + 1; r <= maxRow; r++) {
    const row = ws.getRow(r)
    const refTxt = asText(row.getCell(cols.ref).value)
    const partNo = asText(row.getCell(cols.partNo).value)
    const desc   = asText(row.getCell(cols.desc).value)
    const qtyTxt = asText(row.getCell(cols.qty).value)
    const serial = cols.serial ? asText(row.getCell(cols.serial).value) : ''

    if (!partNo && !desc && !refTxt) {
      if (++emptyStreak >= 5) break
      continue
    }
    emptyStreak = 0

    const combinedText = `${refTxt} ${partNo} ${desc}`.toUpperCase()
    if (trashKeywords.some(k => combinedText.includes(k))) continue
    if (!partNo && !desc) continue

    const refNo = refTxt && /^\d+$/.test(refTxt) ? parseInt(refTxt, 10) : null
    const qty = qtyTxt ? parseInt(qtyTxt.replace(/[^\d]/g, ''), 10) : null

    out.push({
      ref_no: refNo,
      part_number: partNo || null,
      part_name: desc || null,
      qty: Number.isFinite(qty as any) ? qty : null,
      serial_no: serial || null,
    })
  }
  return out
}

async function chunkInsert(table: string, rows: any[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabaseAdmin.from(table).insert(rows.slice(i, i + 500))
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

    if (!file || !unit_code) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    const { data: unitRow, error: unitErr } = await supabaseAdmin
      .from('parts_units').upsert({ unit_code, unit_name }, { onConflict: 'unit_code' }).select().single()
    if (unitErr) throw unitErr

    if (replace) {
      await supabaseAdmin.from('parts_assemblies').delete().eq('unit_id', unitRow.id)
    }

    const workbook = new ExcelJS.Workbook()
    // FIX: Gunakan (buffer as any) untuk memaksa exceljs menerima buffer tanpa error TS
    await workbook.xlsx.load(buffer as any) 
    
    const worksheets = workbook.worksheets.filter(ws => ws.state !== 'hidden')
    let importedAssemblies = 0
    let importedItems = 0

    for (let idx = 0; idx < worksheets.length; idx++) {
      const ws = worksheets[idx]
      try {
        const header = findHeaderRow(ws)
        if (!header) continue

        const assemblyName = pickAssemblyName(ws, header.headerRow)
        const items = parseItems(ws, header.headerRow, header.cols)
        const img = getBestImage(workbook, ws)
        let imageDrive: any = null

        if (img) {
          const mime = (img.ext === 'jpg' || img.ext === 'jpeg') ? 'image/jpeg' : 'image/png'
          const fileName = `[ASM]_${unit_code}_${idx+1}_${assemblyName.substring(0,30)}.${img.ext}`
          // FIX: Gunakan (uploadFile as any) untuk memaksa uploadFile menerima buffer tanpa error TS
          imageDrive = await (uploadFile as any)(fileName, mime, img.buffer)
        }

        const { data: asm, error: asmErr } = await supabaseAdmin.from('parts_assemblies').insert({
          unit_id: unitRow.id,
          sheet_name: ws.name,
          assembly_name: assemblyName,
          unit_header: pickUnitHeader(ws),
          image_drive_file_id: imageDrive?.fileId || null,
          image_drive_file_name: imageDrive?.fileName || null,
          image_drive_web_view_link: imageDrive?.webViewLink || null,
          sort_order: idx + 1,
        }).select().single()

        if (asmErr) throw asmErr
        importedAssemblies++

        if (items.length > 0) {
          const rows = items.map(x => ({ assembly_id: asm.id, ...x }))
          await chunkInsert('parts_items', rows)
          importedItems += rows.length
        }
      } catch (e) { console.error(e) }
    }

    return NextResponse.json({ success: true, summary: { imported_assemblies: importedAssemblies, imported_items: importedItems } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}