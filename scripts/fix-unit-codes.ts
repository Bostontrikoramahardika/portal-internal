export {}

// @ts-ignore
const dotenv = require('dotenv')
dotenv.config({ path: '.env.local' })

// @ts-ignore
const { createClient } = require('@supabase/supabase-js')
// @ts-ignore
const fs = require('fs')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const LOG_FILE = './imports/fix-unit-log.txt'

function log(msg: string) {
  console.log(msg)
  fs.appendFileSync(LOG_FILE, msg + '\n')
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// ============================================================
// NORMALISASI unit_code → unit fisik
// PC200-8 dan PC200LC-8 → 1 unit (PC200-8)
// ============================================================
function normalizeUnitCode(rawCode: string): { unit_code: string, unit_name: string } {
  const code = rawCode.toUpperCase().trim()

  // HB205-1
  if (/HB205-1/.test(code)) {
    return { unit_code: 'HB205-1', unit_name: 'Komatsu HB205-1 Hybrid Excavator' }
  }

  // PC200/200LC-8 → gabung jadi PC200-8
  if (/PC200[,\s]*200LC-8/.test(code) || /PC200.*200LC.*8/.test(code)) {
    return { unit_code: 'PC200-8', unit_name: 'Komatsu PC200/200LC-8' }
  }

  // PC200-10M0
  if (/PC200-10M0/.test(code)) {
    return { unit_code: 'PC200-10M0', unit_name: 'Komatsu PC200-10M0' }
  }

  // PC210-10M0
  if (/PC210-10M0/.test(code)) {
    return { unit_code: 'PC210-10M0', unit_name: 'Komatsu PC210-10M0' }
  }

  // PC200-8M1
  if (/PC200-8M1/.test(code)) {
    return { unit_code: 'PC200-8M1', unit_name: 'Komatsu PC200-8M1' }
  }

  // PC200-8M0
  if (/PC200-8M0/.test(code)) {
    return { unit_code: 'PC200-8M0', unit_name: 'Komatsu PC200-8M0' }
  }

  // PC200-8 (semua varian termasuk FENC0032, LEPBP, Bangau, dll)
  if (/PC200-8/.test(code) || /FENC0032/.test(code)) {
    return { unit_code: 'PC200-8', unit_name: 'Komatsu PC200-8' }
  }

  // PC200-7
  if (/PC200-7/.test(code)) {
    return { unit_code: 'PC200-7', unit_name: 'Komatsu PC200-7' }
  }

  // PC200-6
  if (/PC200-6/.test(code)) {
    return { unit_code: 'PC200-6', unit_name: 'Komatsu PC200-6' }
  }

  // PC300-8M2
  if (/PC300-8M2/.test(code)) {
    return { unit_code: 'PC300-8M2', unit_name: 'Komatsu PC300-8M2' }
  }

  // PC300-8M0
  if (/PC300-8M0/.test(code)) {
    return { unit_code: 'PC300-8M0', unit_name: 'Komatsu PC300-8M0' }
  }

  // PC300-8
  if (/PC300-8/.test(code)) {
    return { unit_code: 'PC300-8', unit_name: 'Komatsu PC300-8' }
  }

  // D155A-6R
  if (/D155A-6R/.test(code)) {
    return { unit_code: 'D155A-6R', unit_name: 'Komatsu D155A-6R Bulldozer' }
  }

  // D85ESS-2
  if (/D85E/.test(code)) {
    return { unit_code: 'D85ESS-2', unit_name: 'Komatsu D85ESS-2 Bulldozer' }
  }

  // Fallback: bersihkan prefix PB_, Part Book, Parts Book, suffix -NNN
  let cleaned = rawCode
    .replace(/^PB[_\s]+/i, '')
    .replace(/^Part\s*Book\s*/i, '')
    .replace(/^Parts\s*Book\s*/i, '')
    .replace(/_LEPB[A-Z0-9]+/i, '')
    .replace(/_FENC[A-Z0-9\-]+/i, '')
    .replace(/_part\d+/i, '')
    .replace(/-\d{3}$/, '')
    .trim()
    .toUpperCase()

  if (!cleaned) cleaned = rawCode.toUpperCase()

  return { unit_code: cleaned, unit_name: 'Komatsu ' + cleaned }
}

// ============================================================
// BATCH UPDATE — Supabase .in() max ~100 items
// ============================================================
async function batchUpdateAssemblies(masterId: string, oldIds: string[]) {
  const BATCH = 50
  let updated = 0
  for (let i = 0; i < oldIds.length; i += BATCH) {
    const chunk = oldIds.slice(i, i + BATCH)
    const { error } = await supabase
      .from('parts_assemblies')
      .update({ unit_id: masterId })
      .in('unit_id', chunk)
    if (error) throw error
    updated += chunk.length
    if (updated % 200 === 0) {
      log(`      ... ${updated}/${oldIds.length} assemblies dipindah`)
    }
    await sleep(100)
  }
  return updated
}

async function batchDeleteUnits(oldIds: string[]) {
  const BATCH = 50
  for (let i = 0; i < oldIds.length; i += BATCH) {
    const chunk = oldIds.slice(i, i + BATCH)
    const { error } = await supabase
      .from('parts_units')
      .delete()
      .in('id', chunk)
    if (error) throw error
    await sleep(100)
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  fs.writeFileSync(LOG_FILE, `=== BTM Fix Unit Codes ===\nStart: ${new Date().toISOString()}\n\n`)
  log('🔧 Fix Unit Codes — Starting...\n')

  // 1. Ambil SEMUA unit
  const { data: allUnits, error: unitErr } = await supabase
    .from('parts_units')
    .select('id, unit_code, unit_name')
    .order('unit_code')

  if (unitErr) throw unitErr
  log(`📋 Total unit di database: ${allUnits.length}\n`)

  // 2. Group → unit fisik
  const groups = new Map<string, {
    newCode: string
    newName: string
    oldUnits: { id: string, code: string }[]
  }>()

  for (const unit of allUnits) {
    const normalized = normalizeUnitCode(unit.unit_code)
    const key = normalized.unit_code

    if (!groups.has(key)) {
      groups.set(key, {
        newCode: normalized.unit_code,
        newName: normalized.unit_name,
        oldUnits: []
      })
    }
    groups.get(key)!.oldUnits.push({ id: unit.id, code: unit.unit_code })
  }

  // 3. Preview
  log('📊 PREVIEW HASIL GROUPING:')
  log('═'.repeat(60))
  for (const [newCode, group] of groups) {
    const sample = group.oldUnits.slice(0, 3).map(u => u.code).join(', ')
    const more = group.oldUnits.length > 3 ? ` ... +${group.oldUnits.length - 3} lainnya` : ''
    log(`  ${newCode.padEnd(16)} ← ${String(group.oldUnits.length).padStart(4)} unit lama  (${sample}${more})`)
  }
  log('═'.repeat(60))
  log(`  TOTAL: ${allUnits.length} unit lama → ${groups.size} unit fisik\n`)

  // 4. Eksekusi merge
  log('🚀 EKSEKUSI MERGE...\n')

  let successCount = 0
  let errorCount = 0

  for (const [newCode, group] of groups) {
    try {
      const masterId = group.oldUnits[0].id
      const otherIds = group.oldUnits.slice(1).map(u => u.id)

      // 4a. Update unit master
      const { error: updateErr } = await supabase
        .from('parts_units')
        .update({
          unit_code: group.newCode,
          unit_name: group.newName,
          brand: 'Komatsu'
        })
        .eq('id', masterId)

      if (updateErr) throw updateErr

      if (otherIds.length > 0) {
        // 4b. Pindahkan semua assembly → master (batch)
        log(`  [${newCode}] Merge ${otherIds.length} unit duplikat → master ${masterId.substring(0, 8)}...`)
        await batchUpdateAssemblies(masterId, otherIds)

        // 4c. Hapus unit duplikat (batch)
        await batchDeleteUnits(otherIds)
        log(`  [${newCode}] ✅ ${otherIds.length} unit dihapus, assemblies dipindah`)
      } else {
        log(`  [${newCode}] ✅ Renamed (tidak ada duplikat)`)
      }

      successCount++
    } catch (err: any) {
      log(`  [${newCode}] ❌ GAGAL: ${err.message}`)
      errorCount++
    }
  }

  // 5. Fix sort_order supaya berurutan per unit
  log('\n🔢 Fix sort_order...')
  const { data: finalUnits } = await supabase
    .from('parts_units')
    .select('id, unit_code')
    .order('unit_code')

  for (const unit of (finalUnits || [])) {
    const { data: assemblies } = await supabase
      .from('parts_assemblies')
      .select('id')
      .eq('unit_id', unit.id)
      .order('created_at')

    if (assemblies && assemblies.length > 0) {
      for (let i = 0; i < assemblies.length; i += 50) {
        const batch = assemblies.slice(i, Math.min(i + 50, assemblies.length))
        for (let j = 0; j < batch.length; j++) {
          await supabase
            .from('parts_assemblies')
            .update({ sort_order: i + j + 1 })
            .eq('id', batch[j].id)
        }
      }
      log(`  [${unit.unit_code}] ${assemblies.length} assemblies re-numbered`)
    }
  }

  // 6. Summary
  log('\n' + '═'.repeat(60))
  log('✅ SELESAI!')
  log(`   Unit sebelum  : ${allUnits.length}`)
  log(`   Unit sesudah  : ${groups.size}`)
  log(`   Berhasil merge: ${successCount}`)
  log(`   Gagal         : ${errorCount}`)
  log('═'.repeat(60))

  // 7. Print unit final
  const { data: final } = await supabase
    .from('parts_units')
    .select('unit_code, unit_name')
    .order('unit_code')

  log('\n📋 UNIT FINAL:')
  final?.forEach((u: any) => {
    log(`   ${u.unit_code.padEnd(16)} | ${u.unit_name}`)
  })

  // 8. Stats
  const { data: stats } = await supabase.rpc('', {}).select('*').limit(0) // dummy
  const { count: asmCount } = await supabase.from('parts_assemblies').select('*', { count: 'exact', head: true })
  const { count: itemCount } = await supabase.from('parts_items').select('*', { count: 'exact', head: true })
  log(`\n📊 STATS AKHIR:`)
  log(`   Units      : ${final?.length}`)
  log(`   Assemblies : ${asmCount}`)
  log(`   Items      : ${itemCount}`)
}

main().catch((err: any) => {
  log(`\n❌ FATAL: ${err.message}`)
  process.exit(1)
})