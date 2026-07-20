// app/lib/partbook-parser.ts
// Core logic parse PDF partbook per halaman
// Dipakai oleh: /api/partbook/process/ dan scripts/process-partbook.ts

import { supabaseAdmin } from '@/app/lib/supabase'
import { getFileBuffer } from '@/app/lib/gdrive'

// pdfjs-dist legacy build untuk Node.js
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js')

// ============================================
// TYPES
// ============================================
export type ParseResult = {
  success: boolean
  totalPages: number
  successPages: number
  failedPages: number
  noPartsPages: number
  totalParts: number
  errorSummary?: string
}

export type PageParseResult = {
  pageNumber: number
  status: 'success' | 'failed' | 'no_parts'
  assemblyName: string | null
  partsCount: number
  errorCode?: string
  errorMessage?: string
  errorHint?: string
  errorRaw?: string
  items?: ExtractedItem[]
}

export type ExtractedItem = {
  refNo: number | null
  partNumber: string
  partName: string
  qty: number | null
  serialNo: string | null
}

// ============================================
// ERROR CODES (user-friendly)
// ============================================
const ERROR_CATALOG: Record<string, { message: string; hint: string }> = {
  ERR_NO_PARTS: {
    message: 'Halaman ini tidak mengandung tabel part number',
    hint: 'Normal untuk halaman cover, daftar isi, atau halaman prosedur (Shop Manual). Tidak perlu diperbaiki.',
  },
  ERR_PARSE_FAILED: {
    message: 'Gagal membaca struktur tabel di halaman ini',
    hint: 'Kemungkinan format PDF tidak standar atau ada corrupt. Coba download ulang PDF dari sumber resmi Komatsu.',
  },
  ERR_PAGE_EMPTY: {
    message: 'Halaman kosong atau tidak ada teks yang bisa diekstrak',
    hint: 'Halaman ini mungkin hanya berisi gambar tanpa teks. Coba pakai OCR jika perlu diekstrak.',
  },
  ERR_DB_INSERT: {
    message: 'Gagal menyimpan data assembly ke database',
    hint: 'Kemungkinan koneksi database bermasalah atau data duplikat. Hubungi administrator.',
  },
  ERR_PDF_LOAD: {
    message: 'Gagal membuka file PDF',
    hint: 'File mungkin corrupt atau bukan PDF valid. Coba download ulang dari Google Drive.',
  },
}

function getErrorInfo(code: string) {
  return ERROR_CATALOG[code] || {
    message: 'Error tidak dikenali',
    hint: 'Hubungi administrator dan berikan kode error di atas.',
  }
}

// ============================================
// PART NUMBER PATTERNS (Komatsu format)
// ============================================
const PART_PATTERNS = [
  /\b\d{3,5}[-.]\d{2}[-.]\d{4,5}\b/,          // 6754-11-1101
  /\b\d{5}[-.]\d{5}\b/,                        // 01643-32460
  /\b\d{2,3}[A-Z][-.]\d{2}[-.]\d{4,5}\b/,      // 21T-70-52140
  /\b[A-Z]{2,3}\d{4,6}[-.]\d{2,4}\b/,          // ND169500-0620
  /\b\d{3}[-.]\d{2}[-.]\d{5}\b/,               // 707-98-25330
]

function extractPartNumber(text: string): string | null {
  for (const pattern of PART_PATTERNS) {
    const m = text.match(pattern)
    if (m) return m[0]
  }
  return null
}

// ============================================
// EXTRACT TEXT ITEMS FROM PDF PAGE
// ============================================
async function extractPageTextItems(page: any): Promise<Array<{ str: string; x: number; y: number }>> {
  const textContent = await page.getTextContent()
  const items: Array<{ str: string; x: number; y: number }> = []

  for (const item of textContent.items) {
    const str = (item.str || '').trim()
    if (!str) continue
    items.push({
      str,
      x: item.transform[4],
      y: item.transform[5],
    })
  }
  return items
}

// ============================================
// DETECT ASSEMBLY NAME (biggest uppercase text at top)
// ============================================
function detectAssemblyName(
  items: Array<{ str: string; x: number; y: number }>,
  pageHeight: number
): string | null {
  // Ambil text di 30% atas halaman, uppercase, minimal 5 karakter
  const topArea = items.filter(i =>
    i.y > pageHeight * 0.7 &&
    i.str.length >= 5 &&
    i.str === i.str.toUpperCase() &&
    /[A-Z]/.test(i.str) &&
    !/^\d+$/.test(i.str) // bukan hanya angka
  )

  if (topArea.length === 0) return null

  // Ambil yang paling panjang
  const longest = topArea.sort((a, b) => b.str.length - a.str.length)[0]
  return longest.str
}

// ============================================
// EXTRACT PARTS FROM PAGE
// ============================================
function extractPartsFromPage(
  items: Array<{ str: string; x: number; y: number }>
): ExtractedItem[] {
  const parts: ExtractedItem[] = []
  const seen = new Set<string>()

  // Group items by Y coordinate (baris yang sama)
  const rowsMap: Map<number, Array<{ str: string; x: number }>> = new Map()
  for (const item of items) {
    const yKey = Math.round(item.y / 5) * 5 // toleransi 5px
    if (!rowsMap.has(yKey)) rowsMap.set(yKey, [])
    rowsMap.get(yKey)!.push({ str: item.str, x: item.x })
  }

  // Sort rows top to bottom
  const rows = Array.from(rowsMap.entries())
    .sort(([a], [b]) => b - a)
    .map(([, cols]) => cols.sort((a, b) => a.x - b.x))

  for (const row of rows) {
    const rowText = row.map(c => c.str).join(' ')
    const partNum = extractPartNumber(rowText)
    if (!partNum) continue
    if (seen.has(partNum)) continue
    seen.add(partNum)

    // Ekstrak komponen row
    const partNumIdx = row.findIndex(c => c.str.includes(partNum.split('-')[0]))
    const beforePart = row.slice(0, partNumIdx).map(c => c.str).join(' ')
    const afterPart = row.slice(partNumIdx + 1).map(c => c.str).join(' ')

    // Ref No: angka di paling kiri
    const refMatch = beforePart.match(/^\s*(\d{1,4})\b/)
    const refNo = refMatch ? parseInt(refMatch[1]) : null

    // Part Name: text setelah part number, sebelum qty
    let partName = afterPart.replace(/\s+\d+\s*$/, '').trim().toUpperCase()
    if (!partName || partName.length < 2) partName = 'UNKNOWN'

    // Qty: angka di akhir row
    const qtyMatch = afterPart.match(/\s(\d{1,6})\s*$/)
    const qty = qtyMatch ? Math.min(parseInt(qtyMatch[1]), 2000000000) : null

    parts.push({
      refNo,
      partNumber: partNum,
      partName,
      qty,
      serialNo: null,
    })
  }

  return parts
}

// ============================================
// PARSE SINGLE PAGE
// ============================================
async function parsePage(page: any, pageNumber: number): Promise<PageParseResult> {
  try {
    const items = await extractPageTextItems(page)

    if (items.length === 0) {
      const err = getErrorInfo('ERR_PAGE_EMPTY')
      return {
        pageNumber,
        status: 'failed',
        assemblyName: null,
        partsCount: 0,
        errorCode: 'ERR_PAGE_EMPTY',
        errorMessage: err.message,
        errorHint: err.hint,
      }
    }

    const viewport = page.getViewport({ scale: 1 })
    const assemblyName = detectAssemblyName(items, viewport.height)
    const extractedParts = extractPartsFromPage(items)

    // Kalau tidak ada part → status no_parts (bukan failed)
    if (extractedParts.length === 0) {
      const err = getErrorInfo('ERR_NO_PARTS')
      return {
        pageNumber,
        status: 'no_parts',
        assemblyName: assemblyName || 'Halaman tanpa parts',
        partsCount: 0,
        errorCode: 'ERR_NO_PARTS',
        errorMessage: err.message,
        errorHint: err.hint,
      }
    }

    return {
      pageNumber,
      status: 'success',
      assemblyName: assemblyName || `Assembly Hal ${pageNumber}`,
      partsCount: extractedParts.length,
      items: extractedParts,
    }
  } catch (err: any) {
    const errInfo = getErrorInfo('ERR_PARSE_FAILED')
    return {
      pageNumber,
      status: 'failed',
      assemblyName: null,
      partsCount: 0,
      errorCode: 'ERR_PARSE_FAILED',
      errorMessage: errInfo.message,
      errorHint: errInfo.hint,
      errorRaw: err?.message || String(err),
    }
  }
}

// ============================================
// MAIN: PROCESS 1 UPLOAD
// ============================================
export async function processUpload(uploadId: string): Promise<ParseResult> {
  // 1. Ambil data upload
  const { data: upload, error: fetchErr } = await supabaseAdmin
    .from('partbook_uploads')
    .select('*')
    .eq('id', uploadId)
    .single()

  if (fetchErr || !upload) {
    throw new Error(`Upload ${uploadId} tidak ditemukan`)
  }

  if (!upload.drive_file_id) {
    throw new Error('Upload tidak punya Drive File ID')
  }

  // 2. Set status processing
  await supabaseAdmin
    .from('partbook_uploads')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
      error_summary: null,
    })
    .eq('id', uploadId)

  // 3. Hapus pages lama (kalau reprocess)
  await supabaseAdmin
    .from('partbook_pages')
    .delete()
    .eq('upload_id', uploadId)

  // 4. Download file dari Google Drive
  let pdfBuffer: Buffer
  try {
    const fileResult = await getFileBuffer(upload.drive_file_id)
    if (!fileResult) throw new Error('File not found in Drive')
    pdfBuffer = fileResult.buffer
  } catch (err: any) {
    const errInfo = getErrorInfo('ERR_PDF_LOAD')
    await supabaseAdmin
      .from('partbook_uploads')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_summary: `${errInfo.message}: ${err.message}`,
      })
      .eq('id', uploadId)
    throw new Error(errInfo.message)
  }

  // 5. Load PDF
  let pdfDoc: any
  try {
    const uint8 = new Uint8Array(pdfBuffer)
    const loadingTask = pdfjsLib.getDocument({
      data: uint8,
      useSystemFonts: true,
      disableFontFace: true,
    })
    pdfDoc = await loadingTask.promise
  } catch (err: any) {
    const errInfo = getErrorInfo('ERR_PDF_LOAD')
    await supabaseAdmin
      .from('partbook_uploads')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_summary: `${errInfo.message}: ${err.message}`,
      })
      .eq('id', uploadId)
    throw new Error(errInfo.message)
  }

  const totalPages = pdfDoc.numPages
  let successPages = 0
  let failedPages = 0
  let noPartsPages = 0
  let totalParts = 0

  // 6. RUN_ID untuk sheet_name unik
  const runId = `UP_${uploadId.slice(0, 8)}_${Date.now()}`

  // 7. Parse per halaman
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    let pageResult: PageParseResult

    try {
      const page = await pdfDoc.getPage(pageNum)
      pageResult = await parsePage(page, pageNum)
    } catch (err: any) {
      const errInfo = getErrorInfo('ERR_PARSE_FAILED')
      pageResult = {
        pageNumber: pageNum,
        status: 'failed',
        assemblyName: null,
        partsCount: 0,
        errorCode: 'ERR_PARSE_FAILED',
        errorMessage: errInfo.message,
        errorHint: errInfo.hint,
        errorRaw: err?.message || String(err),
      }
    }

    let assemblyId: string | null = null

    // 8. Kalau sukses → insert ke parts_assemblies + parts_items
    if (pageResult.status === 'success' && pageResult.items && pageResult.items.length > 0) {
      const sheetName = `${runId}_p${pageNum}`
      try {
        // Insert assembly
        const { data: assy, error: assyErr } = await supabaseAdmin
          .from('parts_assemblies')
          .insert({
            unit_id: upload.unit_id,
            sheet_name: sheetName,
            assembly_name: pageResult.assemblyName,
            sort_order: pageNum,
            source_file: upload.file_name,
            source_page: pageNum,
            source_type: 'pdf',
            upload_id: uploadId,
          })
          .select('id')
          .single()

        if (assyErr) throw assyErr
        assemblyId = assy.id

        // Insert items
        const itemsData = pageResult.items.map(item => ({
          assembly_id: assemblyId,
          ref_no: item.refNo,
          part_number: item.partNumber,
          part_name: item.partName,
          qty: item.qty,
          serial_no: item.serialNo,
        }))

        const { error: itemsErr } = await supabaseAdmin
          .from('parts_items')
          .insert(itemsData)

        if (itemsErr) throw itemsErr

        successPages++
        totalParts += pageResult.partsCount
      } catch (err: any) {
        const errInfo = getErrorInfo('ERR_DB_INSERT')
        pageResult.status = 'failed'
        pageResult.errorCode = 'ERR_DB_INSERT'
        pageResult.errorMessage = errInfo.message
        pageResult.errorHint = errInfo.hint
        pageResult.errorRaw = err?.message || String(err)
        failedPages++
      }
    } else if (pageResult.status === 'no_parts') {
      noPartsPages++
    } else {
      failedPages++
    }

    // 9. Insert ke partbook_pages
    await supabaseAdmin.from('partbook_pages').insert({
      upload_id: uploadId,
      assembly_id: assemblyId,
      page_number: pageNum,
      assembly_name: pageResult.assemblyName,
      sheet_name: assemblyId ? `${runId}_p${pageNum}` : null,
      status: pageResult.status,
      parts_count: pageResult.partsCount,
      has_image: false,
      error_code: pageResult.errorCode || null,
      error_message: pageResult.errorMessage || null,
      error_hint: pageResult.errorHint || null,
      error_raw: pageResult.errorRaw || null,
    })
  }

  // 10. Update status final
  const finalStatus =
    failedPages === 0 && successPages > 0 ? 'done' :
    successPages === 0 && failedPages > 0 ? 'failed' :
    'partial'

  const errorSummary =
    finalStatus === 'partial' ? `${failedPages} halaman gagal, ${successPages} sukses` :
    finalStatus === 'failed'  ? `Semua ${failedPages} halaman gagal diproses` :
    null

  await supabaseAdmin
    .from('partbook_uploads')
    .update({
      status: finalStatus,
      total_pages: totalPages,
      success_pages: successPages,
      failed_pages: failedPages,
      no_parts_pages: noPartsPages,
      total_parts: totalParts,
      finished_at: new Date().toISOString(),
      error_summary: errorSummary,
    })
    .eq('id', uploadId)

  return {
    success: finalStatus !== 'failed',
    totalPages,
    successPages,
    failedPages,
    noPartsPages,
    totalParts,
    errorSummary: errorSummary || undefined,
  }
}