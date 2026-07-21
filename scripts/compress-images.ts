// scripts/compress-images.ts
import sharp from 'sharp'
import { readdirSync, statSync } from 'fs'
import { join } from 'path'

const PUBLIC_DIR = './public'
const QUALITY = 80

async function compressImage(filePath: string) {
  const stats = statSync(filePath)
  const oldSize = stats.size

  const buffer = filePath.endsWith('.png')
    ? await sharp(filePath).png({ quality: QUALITY, compressionLevel: 9 }).toBuffer()
    : await sharp(filePath).jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer()

  // Resize kalau terlalu besar
  const metadata = await sharp(filePath).metadata()
  if ((metadata.width || 0) > 1920) {
    const resized = await sharp(filePath)
      .resize({ width: 1920, withoutEnlargement: true })
      .toBuffer()
    require('fs').writeFileSync(filePath, resized)
  } else {
    require('fs').writeFileSync(filePath, buffer)
  }

  const newSize = statSync(filePath).size
  const saved = ((1 - newSize / oldSize) * 100).toFixed(1)
  console.log(`✅ ${filePath}: ${(oldSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB (-${saved}%)`)
}

async function main() {
  const files = readdirSync(PUBLIC_DIR).filter(f => /\.(png|jpg|jpeg)$/i.test(f))
  for (const file of files) {
    try {
      await compressImage(join(PUBLIC_DIR, file))
    } catch (e) {
      console.error(`❌ ${file}:`, e)
    }
  }
}

main()