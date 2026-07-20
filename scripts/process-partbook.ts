// scripts/process-partbook.ts
// Jalankan: npm run process:partbook -- <upload_id>
// Atau: npm run process:partbook -- --all-pending

import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

async function main() {
  const args = process.argv.slice(2)
  const uploadId = args.find(a => !a.startsWith('--'))
  const allPending = args.includes('--all-pending')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { processUpload } = await import('../app/lib/partbook-parser')

  if (allPending) {
    console.log('🔍 Mencari upload yang pending...')
    const { data: pending } = await supabase
      .from('partbook_uploads')
      .select('id, file_name')
      .eq('status', 'pending')
      .order('created_at')

    if (!pending || pending.length === 0) {
      console.log('✅ Tidak ada upload pending.')
      return
    }

    console.log(`📋 Ditemukan ${pending.length} upload pending:`)
    pending.forEach((u, i) => console.log(`  ${i + 1}. ${u.file_name} (${u.id})`))

    for (const upload of pending) {
      console.log(`\n🚀 Processing: ${upload.file_name}`)
      try {
        const result = await processUpload(upload.id)
        console.log(`✅ Done: ${result.successPages}/${result.totalPages} halaman sukses`)
      } catch (err: any) {
        console.error(`❌ Failed: ${err.message}`)
      }
    }

    console.log('\n✅ Semua selesai!')
    return
  }

  if (!uploadId) {
    console.error('❌ Wajib isi upload_id atau pakai --all-pending')
    console.log('\nContoh:')
    console.log('  npm run process:partbook -- 12345678-abcd-1234-abcd-1234567890ab')
    console.log('  npm run process:partbook -- --all-pending')
    process.exit(1)
  }

  console.log(`🚀 Processing upload ${uploadId}...`)
  try {
    const result = await processUpload(uploadId)
    console.log('\n✅ Selesai!')
    console.log(`   Total halaman:  ${result.totalPages}`)
    console.log(`   Sukses:         ${result.successPages}`)
    console.log(`   Gagal:          ${result.failedPages}`)
    console.log(`   No parts:       ${result.noPartsPages}`)
    console.log(`   Total parts:    ${result.totalParts}`)
    if (result.errorSummary) {
      console.log(`   ⚠️  Summary:    ${result.errorSummary}`)
    }
  } catch (err: any) {
    console.error(`\n❌ Error: ${err.message}`)
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
  })