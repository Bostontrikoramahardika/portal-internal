import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase'
import { requireAuth } from '@/app/lib/auth'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const mode = (formData.get('mode') as string) || 'preview' // 'preview' | 'import'
    const targetWarehouse = (formData.get('warehouse_code') as string) || ''

    if (!file) {
      return NextResponse.json({ error: 'File Excel wajib diunggah' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ error: 'Sheet Excel kosong atau format tidak sesuai' }, { status: 400 })
    }

    // Parser data fleksibel membaca berbagai variasi header Accurate / Umum
    const parsedParts: any[] = []
    const parsedStocks: any[] = []
    const errors: string[] = []

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2
      // Variasi nama kolom
      const part_number = String(
        row['Part Number'] || row['No Barang'] || row['Item No'] || row['Kode Barang'] || row['part_number'] || row['PART NUMBER'] || ''
      ).trim().toUpperCase()

      const part_name = String(
        row['Part Name'] || row['Nama Barang'] || row['Item Description'] || row['Deskripsi'] || row['part_name'] || row['NAMA BARANG'] || ''
      ).trim()

      if (!part_number || !part_name) {
        return // lewati baris header kedua atau baris kosong
      }

      const kategori = String(row['Kategori'] || row['Category'] || row['Item Type'] || 'Sparepart').trim()
      const merk_kompatibel = String(row['Merk'] || row['Brand'] || row['Merk Kompatibel'] || '').trim()
      const model_kompatibel = String(row['Model'] || row['Unit Model'] || row['Model Kompatibel'] || '').trim()
      const satuan = String(row['Satuan'] || row['Unit'] || 'Pcs').trim()
      const min_stock = parseInt(row['Min Stock'] || row['Safety Stock'] || '1') || 1
      const movement_category = String(row['Movement'] || row['Fast/Slow'] || 'FAST').trim().toUpperCase() === 'SLOW' ? 'SLOW' : (String(row['Movement'] || '').toUpperCase() === 'DEAD' ? 'DEAD' : 'FAST')
      const harga_estimasi = parseFloat(row['Harga'] || row['Cost'] || row['Harga Beli'] || row['Price'] || '0') || 0
      const stok_awal = parseInt(row['Stok'] || row['Qty'] || row['Quantity'] || row['Stok Awal'] || '0') || 0
      const rak_lokasi = String(row['Rak'] || row['Bin'] || row['Lokasi Rak'] || '').trim()

      parsedParts.push({
        part_number,
        part_name,
        kategori: kategori || 'Sparepart',
        sub_kategori: '',
        merk_kompatibel,
        model_kompatibel,
        satuan: satuan || 'Pcs',
        min_stock,
        movement_category,
        harga_estimasi,
        source: 'Accurate Migration',
        is_active: true,
        updated_at: new Date().toISOString()
      })

      if (targetWarehouse && stok_awal >= 0) {
        parsedStocks.push({
          warehouse_code: targetWarehouse,
          part_number,
          qty_tersedia: stok_awal,
          qty_reserved: 0,
          rak_lokasi,
          updated_at: new Date().toISOString()
        })
      }
    })

    if (parsedParts.length === 0) {
      return NextResponse.json({
        error: 'Tidak ada baris valid yang terdeteksi. Pastikan kolom memuat "Part Number" dan "Part Name / Nama Barang".'
      }, { status: 400 })
    }

    // MODE PREVIEW (Cek data sebelum commit)
    if (mode === 'preview') {
      return NextResponse.json({
        preview: true,
        totalRows: rawRows.length,
        validPartsCount: parsedParts.length,
        sampleParts: parsedParts.slice(0, 10),
        targetWarehouse: targetWarehouse || 'Tanpa inisialisasi stok awal'
      })
    }

    // MODE IMPORT: Batching 500 rows per loop untuk keamanan puluhan ribu row
    const BATCH_SIZE = 500
    let insertedPartsCount = 0
    let insertedStockCount = 0

    for (let i = 0; i < parsedParts.length; i += BATCH_SIZE) {
      const partBatch = parsedParts.slice(i, i + BATCH_SIZE)
      const { error: partErr } = await supabaseAdmin
        .from('master_part')
        .upsert(partBatch, { onConflict: 'part_number' })

      if (partErr) {
        return NextResponse.json({ error: 'Gagal batch master_part baris ' + i + ': ' + partErr.message }, { status: 500 })
      }
      insertedPartsCount += partBatch.length
    }

    if (parsedStocks.length > 0 && targetWarehouse) {
      for (let i = 0; i < parsedStocks.length; i += BATCH_SIZE) {
        const stockBatch = parsedStocks.slice(i, i + BATCH_SIZE)
        const { error: stockErr } = await supabaseAdmin
          .from('stock_barang')
          .upsert(stockBatch, { onConflict: 'warehouse_code,part_number' })

        if (stockErr) {
          console.error('Warning stok batch error:', stockErr.message)
        } else {
          insertedStockCount += stockBatch.length
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Berhasil mengimpor ' + insertedPartsCount + ' master part ke database.',
      insertedPartsCount,
      insertedStockCount
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Terjadi kesalahan sistem: ' + (err?.message || err) }, { status: 500 })
  }
}