export {}

// @ts-ignore
const ExcelJS = require('exceljs')
// @ts-ignore
const fs = require('fs')
// @ts-ignore
const path = require('path')

const TEST_FILE = './imports/raw/PC200-7.xlsx'

async function debug() {
  console.log(`🔍 Debugging: ${TEST_FILE}\n`)
  
  const buffer = fs.readFileSync(TEST_FILE)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  console.log(`Total sheets: ${workbook.worksheets.length}\n`)

  let sheetsWithImage = 0
  let sheetsWithoutImage = 0
  let extractSuccess = 0
  let extractFail = 0

  // Cek 10 sheet pertama
  for (let i = 0; i < Math.min(10, workbook.worksheets.length); i++) {
    const ws = workbook.worksheets[i]
    console.log(`\n═══ Sheet ${i + 1}: "${ws.name}" ═══`)
    
    try {
      const images = ws.getImages()
      console.log(`   Images found: ${images.length}`)
      
      if (images.length > 0) {
        sheetsWithImage++
        for (const img of images) {
          console.log(`   - Image ID: ${img.imageId}`)
          
          // @ts-ignore
          const meta = workbook.getImage(img.imageId)
          
          if (!meta) {
            console.log(`   ❌ Meta NULL!`)
            extractFail++
            continue
          }
          
          console.log(`   - Meta keys: ${Object.keys(meta).join(', ')}`)
          console.log(`   - Extension: ${meta?.extension || 'UNKNOWN'}`)
          console.log(`   - Has buffer: ${!!meta?.buffer}`)
          console.log(`   - Has base64: ${!!meta?.base64}`)
          
          // Cek buffer type
          if (meta?.buffer) {
            console.log(`   - Buffer type: ${meta.buffer.constructor.name}`)
            console.log(`   - Buffer size: ${meta.buffer.length || meta.buffer.byteLength} bytes`)
            
            // Coba convert ke Buffer
            try {
              const buf = Buffer.from(meta.buffer)
              console.log(`   ✅ Buffer.from(buffer) SUKSES: ${buf.length} bytes`)
              
              // Save gambar test
              const testPath = `./imports/test-image-${i + 1}.${meta.extension || 'png'}`
              fs.writeFileSync(testPath, buf)
              console.log(`   💾 Saved to: ${testPath}`)
              extractSuccess++
            } catch (e: any) {
              console.log(`   ❌ Buffer.from() gagal: ${e.message}`)
              extractFail++
            }
          } else if (meta?.base64) {
            console.log(`   - Base64 length: ${meta.base64.length}`)
            try {
              const buf = Buffer.from(meta.base64, 'base64')
              console.log(`   ✅ Buffer.from(base64) SUKSES: ${buf.length} bytes`)
              const testPath = `./imports/test-image-${i + 1}.${meta.extension || 'png'}`
              fs.writeFileSync(testPath, buf)
              console.log(`   💾 Saved to: ${testPath}`)
              extractSuccess++
            } catch (e: any) {
              console.log(`   ❌ Buffer.from(base64) gagal: ${e.message}`)
              extractFail++
            }
          } else {
            console.log(`   ❌ Tidak ada buffer maupun base64!`)
            extractFail++
          }
        }
      } else {
        sheetsWithoutImage++
      }
    } catch (e: any) {
      console.log(`   ❌ ERROR: ${e.message}`)
    }
  }

  console.log(`\n\n📊 SUMMARY (dari 10 sheet pertama):`)
  console.log(`   Sheets with image    : ${sheetsWithImage}`)
  console.log(`   Sheets without image : ${sheetsWithoutImage}`)
  console.log(`   Extract SUCCESS      : ${extractSuccess}`)
  console.log(`   Extract FAIL         : ${extractFail}`)
  console.log(`\n💡 Cek folder ./imports/ untuk lihat gambar hasil extract`)
}

debug().catch(err => {
  console.error('FATAL:', err)
})