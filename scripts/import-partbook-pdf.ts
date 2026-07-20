export {}

// @ts-ignore
const dotenv = require('dotenv')
dotenv.config({ path: '.env.local' })

// @ts-ignore
const fs = require('fs')
// @ts-ignore
const path = require('path')
// @ts-ignore
const { createClient } = require('@supabase/supabase-js')

const INPUT_FOLDER = './imports/raw-pdf'
const LOG_FILE = './imports/import-log-pdf.txt'
const MAX_PARALLEL = 2
const DELAY_MS = 50

// UNIQUE RUN ID — supaya sheet_name tidak bentrok kalau re-run
const RUN_ID = new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 12)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function log(msg: string) {
  console.log(msg)
  fs.appendFileSync(LOG_FILE, msg + '\n')
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// ============================================================
// UNIT CODE DETECTION
// ============================================================
function extractUnitCode(fileName: string): { unit_code: string, unit_name: string } {
  let name = fileName.replace(/\.pdf$/i, '').trim()

  // Kasus khusus
  if (/PC200[,\s]+200LC-8/i.test(name)) {
    return { unit_code: 'PC200-8', unit_name: 'Komatsu PC200/200LC-8' }
  }
  if (/PC200-7-sn\d+and-up/i.test(name)) {
    return { unit_code: 'PC200-7', unit_name: 'Komatsu PC200-7' }
  }
  if (/PC210[-\w]*10M0/i.test(name)) {
    return { unit_code: 'PC210-10M0', unit_name: 'Komatsu PC210-10M0' }
  }
  if (/wear\s*part.*PC200-8M1/i.test(name)) {
    return { unit_code: 'PC200-8M1', unit_name: 'Komatsu PC200-8M1' }
  }
  // D155A-6 dan D155A-6R → sama (D155A-6R)
  if (/D155A-6R?/i.test(name)) {
    return { unit_code: 'D155A-6R', unit_name: 'Komatsu D155A-6R Bulldozer' }
  }

  const patterns = [
    /(SAA\d+[VD]?\d*[A-Z]*-\d+)/i,
    /(PC\d+[A-Z]{0,3}-\d+[A-Z]?\d*)/i,
    /(PC\d+-\d+)/i,
    /(HB\d+-\d+)/i,
    /\b(D\d+[A-Z]*-\d+[A-Z]?)/i,
    /(GD\d+[A-Z]*-\d+)/i,
    /(WA\d+-\d+)/i,
    /(HD\d+-\d+)/i,
  ]

  for (const re of patterns) {
    const m = name.match(re)
    if (m) {
      let code = m[1].toUpperCase().trim().replace(/[,\s].*$/, '')
      return { unit_code: code, unit_name: `Komatsu ${code}` }
    }
  }

  const fallback = name.substring(0, 50).toUpperCase().replace(/[^\w-]/g, '_')
  return { unit_code: fallback, unit_name: name }
}

// ============================================================
// EXTRACT TEXT ITEMS
// ============================================================
async function extractPageTextItems(page: any) {
  const textContent = await page.getTextContent()
  return textContent.items
    .filter((it: any) => it.str && it.str.trim())
    .map((it: any) => ({
      text: it.str.trim(),
      x: it.transform[4],
      y: it.transform[5],
    }))
}

// ============================================================
// DETECT ASSEMBLY NAME
// ============================================================
function detectAssemblyName(items: any[], pageNum: number): string {
  const sorted = [...items].sort((a, b) => b.y - a.y)
  const noise = /^(PAGE|PRINTED|S\/N|PART\s*NO|DESC|Q'?TY|SERIAL|ITEM|REF|FIG|\d+$)/i

  for (const item of sorted.slice(0, 30)) {
    const t = item.text.trim()
    if (t.length < 6) continue
    if (noise.test(t)) continue
    if (/^\d/.test(t)) continue
    if (/^[^a-zA-Z]+$/.test(t)) continue
    return t.substring(0, 100)
  }
  return `PAGE_${pageNum}`
}

// ============================================================
// PART NUMBER DETECTION — Fleksibel Komatsu
// ============================================================
function isPartNumber(tok: string): boolean {
  if (/^[A-Z0-9]{2,6}-[A-Z0-9]{2,4}-[A-Z0-9]{2,6}$/i.test(tok)) return true
  if (/^[A-Z0-9]{4,6}-[A-Z0-9]{4,6}$/i.test(tok)) return true
  if (/^[A-Z]{2,3}\d{6}-\d{3,5}$/i.test(tok)) return true
  return false
}

// ============================================================
// EXTRACT PARTS
// ============================================================
function extractPartsFromPage(items: any[]): any[] {
  const parts: any[] = []

  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) < 4) return a.x - b.x
    return b.y - a.y
  })

  const rows: any[][] = []
  let curRow: any[] = []
  let lastY: number | null = null

  for (const item of sorted) {
    if (lastY === null || Math.abs(item.y - lastY) < 4) {
      curRow.push(item)
    } else {
      if (curRow.length > 0) rows.push(curRow)
      curRow = [item]
    }
    lastY = item.y
  }
  if (curRow.length > 0) rows.push(curRow)

  for (const row of rows) {
    const tokens = row.map(r => r.text)
    let partNo: string | null = null
    let itemNo: number | null = null
    const desc: string[] = []

    for (const tok of tokens) {
      if (!partNo && isPartNumber(tok)) {
        partNo = tok
      } else if (itemNo === null && /^\d{1,3}$/.test(tok) && parseInt(tok) < 500) {
        itemNo = parseInt(tok)
      } else {
        desc.push(tok)
      }
    }

    if (partNo) {
      parts.push({
        ref_no: itemNo,
        part_number: partNo,
        part_name: desc.join(' ').trim() || null,
        qty: null,
        serial_no: null,
      })
    }
  }

  return parts
}

// ============================================================
// PROCESS FILE
// ============================================================
async function processFile(filePath: string) {
  const fileName = path.basename(filePath)
  const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(1)
  const { unit_code, unit_name } = extractUnitCode(fileName)

  log(`\n📂 ${fileName}`)
  log(`   Size: ${sizeMB} MB | Unit: ${unit_code}`)

  const { data: unitRow, error: unitErr } = await supabaseAdmin
    .from('parts_units')
    .upsert({ unit_code, unit_name, brand: 'Komatsu' }, { onConflict: 'unit_code' })
    .select()
    .single()
  if (unitErr) throw unitErr

  const { data: maxRow } = await supabaseAdmin
    .from('parts_assemblies')
    .select('sort_order')
    .eq('unit_id', unitRow.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  let sortOrder = (maxRow?.sort_order || 0) + 1

  // @ts-ignore
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(fs.readFileSync(filePath))
  const pdfDoc = await pdfjsLib.getDocument({
    data,
    verbosity: 0,
    disableFontFace: true,
    useSystemFonts: false,
  }).promise

  const totalPages = pdfDoc.numPages
  log(`   Pages: ${totalPages}`)

  let assembliesCreated = 0
  let itemsCreated = 0
  let pagesNoParts = 0
  let errorPages = 0

  // sheet_name include RUN_ID supaya unique
  const filePrefix = fileName.replace(/[^\w-]/g, '_').substring(0, 30)

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    try {
      const page = await pdfDoc.getPage(pageNum)
      const items = await extractPageTextItems(page)
      if (items.length === 0) continue

      const assemblyName = detectAssemblyName(items, pageNum)
      const parts = extractPartsFromPage(items)

      // Unique sheet_name: RUN_ID + filePrefix + pageNum
      const sheetName = `PDF_${RUN_ID}_${filePrefix}_p${String(pageNum).padStart(4, '0')}`

      const { data: asm, error: asmErr } = await supabaseAdmin
        .from('parts_assemblies')
        .insert({
          unit_id: unitRow.id,
          sheet_name: sheetName,
          assembly_name: assemblyName,
          unit_header: null,
          sort_order: sortOrder++,
        })
        .select()
        .single()

      if (asmErr) throw asmErr
      assembliesCreated++

      if (parts.length > 0) {
        const rows = parts.map((p: any) => ({ assembly_id: asm.id, ...p }))
        for (let i = 0; i < rows.length; i += 500) {
          const { error } = await supabaseAdmin
            .from('parts_items')
            .insert(rows.slice(i, i + 500))
          if (error) throw error
        }
        itemsCreated += parts.length
      } else {
        pagesNoParts++
      }

      if (pageNum % 50 === 0) {
        log(`   📄 [${pageNum}/${totalPages}] Asm: ${assembliesCreated} | Items: ${itemsCreated} | NoParts: ${pagesNoParts}`)
      }

      if (pageNum % 20 === 0) await sleep(DELAY_MS)
    } catch (e: any) {
      errorPages++
      if (errorPages < 5) log(`   ❌ Page ${pageNum}: ${e.message}`)
    }
  }

  log(`   ✅ DONE [${fileName}] — Asm: ${assembliesCreated} | Items: ${itemsCreated} | NoParts: ${pagesNoParts} | Err: ${errorPages}`)
  return { assembliesCreated, itemsCreated, pagesNoParts, errorPages }
}

// ============================================================
// PARALLEL
// ============================================================
async function processInParallel(files: string[], maxParallel: number) {
  const results: any[] = []
  const queue = [...files]

  const runNext = async (): Promise<any> => {
    const file = queue.shift()
    if (!file) return
    try {
      const result = await processFile(file)
      results.push({ file, success: true, ...result })
    } catch (err: any) {
      log(`\n❌ FATAL [${path.basename(file)}]: ${err.message}`)
      results.push({ file, success: false, error: err.message })
    }
    return runNext()
  }

  const workers = Array.from({ length: maxParallel }, () => runNext())
  await Promise.all(workers)
  return results
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  fs.writeFileSync(LOG_FILE, `=== BTM PDF Importer v3 ===\nStart: ${new Date().toISOString()}\nRUN_ID: ${RUN_ID}\n\n`)

  log('🚀 BTM PDF Partbook Importer v3')
  log(`   Input       : ${INPUT_FOLDER}`)
  log(`   Max parallel: ${MAX_PARALLEL}`)
  log(`   RUN_ID      : ${RUN_ID}\n`)

  if (!fs.existsSync(INPUT_FOLDER)) {
    log(`❌ Folder tidak ditemukan`)
    return
  }

  const files = fs.readdirSync(INPUT_FOLDER)
    .filter((f: string) => f.toLowerCase().endsWith('.pdf'))
    .map((f: string) => path.join(INPUT_FOLDER, f))
    .sort()

  log(`📋 Total: ${files.length} file\n`)
  files.forEach((f: string, i: number) => {
    const size = (fs.statSync(f).size / 1024 / 1024).toFixed(1)
    const { unit_code } = extractUnitCode(path.basename(f))
    log(`   ${i+1}. [${unit_code.padEnd(15)}] ${path.basename(f)} (${size} MB)`)
  })

  log('\n🚀 START PROCESSING...')

  const startTime = Date.now()
  const results = await processInParallel(files, MAX_PARALLEL)
  const durationMin = ((Date.now() - startTime) / 60000).toFixed(1)

  const success = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  const totalAsm = success.reduce((a: number, r: any) => a + (r.assembliesCreated || 0), 0)
  const totalItems = success.reduce((a: number, r: any) => a + (r.itemsCreated || 0), 0)

  log('\n' + '═'.repeat(60))
  log('✅ SELESAI!')
  log(`   Duration      : ${durationMin} menit`)
  log(`   File berhasil : ${success.length}/${files.length}`)
  log(`   Assemblies    : ${totalAsm}`)
  log(`   Items         : ${totalItems}`)
  log('═'.repeat(60))

  if (failed.length > 0) {
    log('\n❌ FILE GAGAL:')
    failed.forEach((r: any) => log(`   - ${path.basename(r.file)}: ${r.error}`))
  }
}

main().catch((err: any) => {
  log(`\n❌ FATAL: ${err.message}`)
  console.error(err)
  process.exit(1)
})