// ============================================
// BTM PORTAL - OFFLINE DATABASE (IndexedDB)
// Simpan absensi di HP saat offline
// Auto-sync saat online kembali
// ============================================

const DB_NAME = 'btm_portal_offline'
const DB_VERSION = 1
const STORE_PENDING = 'pending_attendance'
const STORE_SYNC_LOG = 'sync_log'

// ============ BUKA DATABASE ============
export function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('❌ IndexedDB error:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    // Buat struktur database (pertama kali / upgrade)
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result

      // Store untuk absensi yang belum di-upload
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        const store = db.createObjectStore(STORE_PENDING, {
          keyPath: 'id',
          autoIncrement: true
        })
        store.createIndex('type', 'type', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('synced', 'synced', { unique: false })
      }

      // Store untuk log sync (history)
      if (!db.objectStoreNames.contains(STORE_SYNC_LOG)) {
        db.createObjectStore(STORE_SYNC_LOG, {
          keyPath: 'id',
          autoIncrement: true
        })
      }

      console.log('✅ IndexedDB: Database created/upgraded')
    }
  })
}

// ============ SIMPAN ABSENSI OFFLINE ============
export interface OfflineAttendance {
  id?: number
  type: 'clock_in' | 'clock_out'
  timestamp: string        // ISO string waktu actual
  latitude: number
  longitude: number
  synced: boolean          // false = belum di-upload
  created_at: string       // waktu record dibuat
  sync_attempts: number    // berapa kali sudah coba sync
  last_sync_error?: string // error terakhir
}

export async function saveOfflineAttendance(
  type: 'clock_in' | 'clock_out',
  latitude: number,
  longitude: number
): Promise<OfflineAttendance> {
  const db = await openOfflineDB()

  const record: OfflineAttendance = {
    type,
    timestamp: new Date().toISOString(),
    latitude,
    longitude,
    synced: false,
    created_at: new Date().toISOString(),
    sync_attempts: 0,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readwrite')
    const store = tx.objectStore(STORE_PENDING)
    const request = store.add(record)

    request.onsuccess = () => {
      record.id = request.result as number
      console.log(`✅ Offline: Saved ${type} at ${record.timestamp}`)
      resolve(record)
    }

    request.onerror = () => {
      console.error('❌ Offline: Failed to save', request.error)
      reject(request.error)
    }
  })
}

// ============ AMBIL SEMUA PENDING ============
export async function getPendingAttendance(): Promise<OfflineAttendance[]> {
  const db = await openOfflineDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readonly')
    const store = tx.objectStore(STORE_PENDING)
    const request = store.getAll()

    request.onsuccess = () => {
      const all = request.result as OfflineAttendance[]
      // Filter yang belum synced
      const pending = all.filter(r => !r.synced)
      resolve(pending)
    }

    request.onerror = () => reject(request.error)
  })
}

// ============ TANDAI SUDAH SYNC ============
export async function markAsSynced(id: number): Promise<void> {
  const db = await openOfflineDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readwrite')
    const store = tx.objectStore(STORE_PENDING)
    const getReq = store.get(id)

    getReq.onsuccess = () => {
      const record = getReq.result
      if (record) {
        record.synced = true
        store.put(record)
        console.log(`✅ Offline: Marked #${id} as synced`)
      }
      resolve()
    }

    getReq.onerror = () => reject(getReq.error)
  })
}

// ============ UPDATE SYNC ERROR ============
export async function updateSyncError(id: number, error: string): Promise<void> {
  const db = await openOfflineDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readwrite')
    const store = tx.objectStore(STORE_PENDING)
    const getReq = store.get(id)

    getReq.onsuccess = () => {
      const record = getReq.result
      if (record) {
        record.sync_attempts += 1
        record.last_sync_error = error
        store.put(record)
      }
      resolve()
    }

    getReq.onerror = () => reject(getReq.error)
  })
}

// ============ HAPUS YANG SUDAH SYNC ============
export async function clearSyncedRecords(): Promise<number> {
  const db = await openOfflineDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readwrite')
    const store = tx.objectStore(STORE_PENDING)
    const request = store.getAll()

    request.onsuccess = () => {
      const all = request.result as OfflineAttendance[]
      let deleted = 0

      all.forEach(record => {
        if (record.synced) {
          store.delete(record.id!)
          deleted++
        }
      })

      console.log(`🗑️ Offline: Cleared ${deleted} synced records`)
      resolve(deleted)
    }

    request.onerror = () => reject(request.error)
  })
}

// ============ HITUNG PENDING ============
export async function countPending(): Promise<number> {
  const pending = await getPendingAttendance()
  return pending.length
}

// ============ SYNC KE SERVER ============
export async function syncToServer(): Promise<{
  success: number
  failed: number
  total: number
  results: Array<{ id: number; type: string; status: string; message: string }>
}> {
  const pending = await getPendingAttendance()

  if (pending.length === 0) {
    return { success: 0, failed: 0, total: 0, results: [] }
  }

  console.log(`🔄 Sync: Starting sync of ${pending.length} records...`)

  let success = 0
  let failed = 0
  const results: Array<{ id: number; type: string; status: string; message: string }> = []

  // Sort by timestamp (clock_in harus duluan)
  const sorted = pending.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  for (const record of sorted) {
    try {
      const endpoint = record.type === 'clock_in'
        ? '/api/attendance/clock-in'
        : '/api/attendance/clock-out'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: record.latitude,
          longitude: record.longitude,
          offline_time: record.timestamp,
          is_offline_sync: true
        })
      })

      const data = await response.json()

      if (response.ok) {
        await markAsSynced(record.id!)
        success++
        results.push({
          id: record.id!,
          type: record.type,
          status: 'success',
          message: data.message || 'Berhasil sync'
        })
        console.log(`✅ Sync: ${record.type} #${record.id} OK`)
      } else {
        await updateSyncError(record.id!, data.error || 'Unknown error')
        failed++
        results.push({
          id: record.id!,
          type: record.type,
          status: 'failed',
          message: data.error || 'Gagal sync'
        })
        console.log(`❌ Sync: ${record.type} #${record.id} FAILED:`, data.error)
      }
    } catch (err: any) {
      await updateSyncError(record.id!, err.message || 'Network error')
      failed++
      results.push({
        id: record.id!,
        type: record.type,
        status: 'failed',
        message: 'Network error'
      })
    }
  }

  // Bersihkan yang sudah sync
  await clearSyncedRecords()

  console.log(`📊 Sync complete: ${success} success, ${failed} failed`)
  return { success, failed, total: pending.length, results }
}