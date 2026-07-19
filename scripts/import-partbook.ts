export {}

// @ts-ignore
const ExcelJS = require('exceljs')
// @ts-ignore
const fs = require('fs')
// @ts-ignore
const path = require('path')
// @ts-ignore
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

// @ts-ignore
const { createClient } = require('@supabase/supabase-js')
// @ts-ignore
const { google } = require('googleapis')
// @ts-ignore
const { Readable } = require('stream')

// ============================================================
// KONFIGURASI
// ============================================================
const INPUT_FOLDER = './imports/raw'
const LOG_FILE = './imports/import-log.txt'
const DELAY_MS = 300
// ============================================================

// Supabase
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Google Drive OAuth
const GDRIVE_FOLDER_ID = process.env.GDRIVE_FOLDER_ID
const GDRIVE_OAUTH_CLIENT_ID = process.env.GDRIVE_OAUTH_CLIENT_ID
const GDRIVE_OAUTH_CLIENT_SECRET = process.env.GDRIVE_OAUTH_CLIENT_SECRET
const GDRIVE_OAUTH_REFRESH_TOKEN = process.env.GDRIVE_OAUTH_REFRESH_TOKEN

function getOAuth2Client() {
  const oAuth2Client = new google.auth.OAuth2(
    GDRIVE_OAUTH_CLIENT_ID,
    GDRIVE_OAUTH_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  )
  oAuth2Client.setCredentials({ refresh_token: GDRIVE_OAUTH_REFRESH_TOKEN })
  return oAuth2Client
}

function getDriveClient() {
  const auth = getOAuth2Client()
  return google.drive({ version: 'v3', auth })
}

async function uploadToDrive(fileName: string, mime: string, buffer: Buffer): Promise<any> {
  const drive = getDriveClient()
  const stream = Readable.from(buffer)

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [GDRIVE_FOLDER_ID],
      mimeType: mime,
    },
    media: {
      mimeType: mime,
      body: stream,
    },
    fields: 'id, name, webViewLink, webContentLink',
  })

  try {
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
    })
  } catch (e) {
    // ignore
  }

  return {
    fileId: response.data.id,
    fileName: response.data.name,
    webViewLink: response.data.webViewLink,
    webContentLink: response.data.webContentLink,
  }
}

// ============================================================
// HELPERS
// ============================================================

function log(msg: string) {
  console.log(msg)
  fs.appendFileSync(LOG_FILE, msg + '\n')
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
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

function getCellText(ws: any, address: string): string {
  try {
    const cell = ws.getCell(address)
    return asText(cell.text || cell.value)
  } catch {
    return ''
  }
}

function findHeaderRow(ws: any) {
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

function pickAssemblyName(ws: any, headerRow: number): string {
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

function pickUnitHeader(ws: any): string | null {
  const candidates = ['B1', 'D1', 'A1', 'C1']
  for (const addr of candidates) {
    const t = getCellText(ws, addr)
    if (t && t.toUpperCase().includes('S/N')) return t
    if (t && t.length > 5) return t
  }
  return null
}

function getBestImage(workbook: any, ws: any): any {
  try {
    const images = ws.getImages()
    if (!images || images.length === 0) return null
    const ranked = images.map((img: any) => {
      const range: any = img.range
      const tl = range?.tl; const br = range?.br
      const area = tl && br ? Math.abs((br.col - tl.col) * (br.row - tl.row)) : 0
      return { img, area }
    }).sort((a: any, b: any) => b.area - a.area)
    const best = ranked[0]?.img
    if (!best) return null
    const meta = workbook.getImage(best.imageId)
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

function parseItems(ws: any, headerRow: number, cols: any) {
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

    const refNoRaw = refTxt && /^\d+$/.test(refTxt) ? parseInt(refTxt, 10) : null
const refNo = (refNoRaw && refNoRaw > 2147483647) ? null : refNoRaw

const qtyRaw = qtyTxt ? parseInt(qtyTxt.replace(/[^\d]/g, ''), 10) : null
const qty = (qtyRaw && qtyRaw > 2147483647) ? null : qtyRaw

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

function extractUnitCode(fileName: string): { unit_code: string, unit_name: string } {
  let cleanName = fileName.replace(/_part\d+\.xlsx$/i, '').replace(/\.xlsx$/i, '')
  
  const patterns = [
    /\b(PC\d+[-\w]*)/i,
    /\b(D\d+[A-Z]*[-\w]*)/i,
    /\b(GD\d+[A-Z]*[-\w]*)/i,
    /\b(WA\d+[-\w]*)/i,
    /\b(HD\d+[-\w]*)/i,
    /\b(SAA\d+[A-Z]*\d*[-\w]*)/i,
    /\b(BR\d+[-\w]*)/i,
  ]
  
  for (const pattern of patterns) {
    const match = cleanName.match(pattern)
    if (match) {
      return {
        unit_code: match[1].toUpperCase(),
        unit_name: cleanName
      }
    }
  }
  
  return {
    unit_code: cleanName.substring(0, 50).toUpperCase().replace(/[^\w-]/g, '_'),
    unit_name: cleanName
  }
}

// ============================================================
// PROCESS FILE
// ============================================================
async function processFile(filePath: string, isFirstPartOfUnit: boolean) {
  const fileName = path.basename(filePath)
  const { unit_code, unit_name } = extractUnitCode(fileName)
  
  log(`\n📂 ${fileName}`)
  log(`   Unit Code: ${unit_code}`)
  log(`   Replace  : ${isFirstPartOfUnit ? 'YES (part1)' : 'NO (append)'}`)

  const buffer = fs.readFileSync(filePath)

  const { data: unitRow, error: unitErr } = await supabaseAdmin
    .from('parts_units')
    .upsert({ unit_code, unit_name }, { onConflict: 'unit_code' })
    .select()
    .single()
  if (unitErr) throw unitErr

  if (isFirstPartOfUnit) {
    await supabaseAdmin.from('parts_assemblies').delete().eq('unit_id', unitRow.id)
  }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheets = workbook.worksheets.filter((ws: any) => ws.state !== 'hidden')
  let importedAssemblies = 0
  let importedItems = 0
  let skippedSheets = 0
  let uploadedImages = 0
  let failedImages = 0

  for (let idx = 0; idx < worksheets.length; idx++) {
    const ws = worksheets[idx]
    try {
      const header = findHeaderRow(ws)
      if (!header) {
        skippedSheets++
        continue
      }

      const assemblyName = pickAssemblyName(ws, header.headerRow)
      const items = parseItems(ws, header.headerRow, header.cols)
      const img = getBestImage(workbook, ws)
      let imageDrive: any = null

      if (img) {
        const mime = (img.ext === 'jpg' || img.ext === 'jpeg') ? 'image/jpeg' : 'image/png'
        const imgFileName = `[ASM]_${unit_code}_${idx+1}_${assemblyName.substring(0,30).replace(/[^\w\s-]/g, '')}.${img.ext}`
        try {
          imageDrive = await uploadToDrive(imgFileName, mime, img.buffer)
          uploadedImages++
          if (uploadedImages % 10 === 0) {
            log(`   📤 ${uploadedImages} gambar sudah upload...`)
          }
        } catch (e: any) {
          log(`   ⚠️  Upload GAGAL sheet "${ws.name}": ${e.message}`)
          failedImages++
        }
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
        const rows = items.map((x: any) => ({ assembly_id: asm.id, ...x }))
        await chunkInsert('parts_items', rows)
        importedItems += rows.length
      }
    } catch (e: any) {
      log(`   ❌ Sheet "${ws.name}" gagal: ${e.message}`)
    }
  }

  log(`   ✅ Assemblies: ${importedAssemblies} | Items: ${importedItems} | Images: ${uploadedImages}/${uploadedImages + failedImages} | Skipped: ${skippedSheets}`)
  return { importedAssemblies, importedItems, uploadedImages, failedImages }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  fs.writeFileSync(LOG_FILE, `=== BTM Partbook Importer ===\nStart: ${new Date().toISOString()}\n\n`)

  log('🚀 BTM Partbook Importer — Starting...')
  log(`   Input : ${INPUT_FOLDER}`)
  log(`   Log   : ${LOG_FILE}`)

  if (!fs.existsSync(INPUT_FOLDER)) {
    log(`❌ Folder tidak ditemukan: ${INPUT_FOLDER}`)
    return
  }

  const files = fs.readdirSync(INPUT_FOLDER)
    .filter((f: string) => f.endsWith('.xlsx'))
    .sort()

  if (files.length === 0) {
    log(`⚠️  Tidak ada file .xlsx di ${INPUT_FOLDER}`)
    return
  }

  log(`📋 Total file: ${files.length}\n`)

  const seenUnits = new Set<string>()
  let successCount = 0
  let failCount = 0
  let totalAssemblies = 0
  let totalItems = 0
  let totalImages = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const filePath = path.join(INPUT_FOLDER, file)
    const { unit_code } = extractUnitCode(file)
    const isFirstPart = !seenUnits.has(unit_code)
    
    log(`\n[${i + 1}/${files.length}]`)
    
    try {
      const result = await processFile(filePath, isFirstPart)
      seenUnits.add(unit_code)
      successCount++
      totalAssemblies += result.importedAssemblies
      totalItems += result.importedItems
      totalImages += result.uploadedImages
    } catch (err: any) {
      log(`   ❌ FATAL: ${err.message}`)
      failCount++
    }

    await sleep(DELAY_MS)
  }

  log('\n═══════════════════════════════════════')
  log(`✅ SELESAI!`)
  log(`   File berhasil : ${successCount}`)
  log(`   File gagal    : ${failCount}`)
  log(`   Total unit    : ${seenUnits.size}`)
  log(`   Assemblies    : ${totalAssemblies}`)
  log(`   Items         : ${totalItems}`)
  log(`   Images upload : ${totalImages}`)
  log('═══════════════════════════════════════\n')
}

main().catch((err: any) => {
  log(`\n❌ FATAL ERROR: ${err.message}`)
  process.exit(1)
})