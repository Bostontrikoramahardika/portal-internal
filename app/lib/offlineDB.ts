// ============================================
// BTM PORTAL - OFFLINE DATABASE (IndexedDB) v2
// Simpan absensi di HP saat offline
// SMART SYNC: handle duplicate, rejected, network error
// ============================================

const DB_NAME = 'btm_portal_offline'
const DB_VERSION = 2  // ⚡ Naikkan version untuk trigger upgrade
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

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        const store = db.createObjectStore(STORE_PENDING, {
          keyPath: 'id',
          autoIncrement: true
        })
        store.createIndex('type', 'type', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('synced', 'synced', { unique: false })
        store.createIndex('status', 'status', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_SYNC_LOG)) {
        db.createObjectStore(STORE_SYNC_LOG, {
          keyPath: 'id',
          autoIncrement: true
        })
      }

      console.log('✅ IndexedDB: Database ready v' + DB_VERSION)
    }
  })
}

// ============ TYPE ============
export type AttendanceStatus = 'pending' | 'synced' | 'rejected' | 'skipped'

export interface OfflineAttendance {
  id?: number
  type: 'clock_in' | 'clock_out'
  timestamp: string
  latitude: number
  longitude: number
  synced: boolean
  status?: AttendanceStatus     // ✨ BARU
  created_at: string
  sync_attempts: number
  last_sync_error?: string
  rejected_reason?: string      // ✨ BARU: alasan ditolak permanen
}

// ============ SIMPAN ABSENSI OFFLINE ============
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
    status: 'pending',
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

// ============ AMBIL PENDING (belum sync & belum rejected) ============
export async function getPendingAttendance(): Promise<OfflineAttendance[]> {
  const db = await openOfflineDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readonly')
    const store = tx.objectStore(STORE_PENDING)
    const request = store.getAll()

    request.onsuccess = () => {
      const all = request.result as OfflineAttendance[]
      // Filter: yang belum sync DAN belum rejected
      const pending = all.filter(r => 
        !r.synced && 
        r.status !== 'rejected' && 
        r.status !== 'synced'
      )
      resolve(pending)
    }

    request.onerror = () => reject(request.error)
  })
}

// ============ AMBIL YANG REJECTED ============
export async function getRejectedAttendance(): Promise<OfflineAttendance[]> {
  const db = await openOfflineDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readonly')
    const store = tx.objectStore(STORE_PENDING)
    const request = store.getAll()

    request.onsuccess = () => {
      const all = request.result as OfflineAttendance[]
      const rejected = all.filter(r => r.status === 'rejected')
      resolve(rejected)
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
        record.status = 'synced'
        store.put(record)
        console.log(`✅ Offline: Marked #${id} as synced`)
      }
      resolve()
    }

    getReq.onerror = () => reject(getReq.error)
  })
}

// ============ ✨ TANDAI DITOLAK PERMANEN ============
export async function markAsRejected(id: number, reason: string): Promise<void> {
  const db = await openOfflineDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readwrite')
    const store = tx.objectStore(STORE_PENDING)
    const getReq = store.get(id)

    getReq.onsuccess = () => {
      const record = getReq.result
      if (record) {
        record.status = 'rejected'
        record.rejected_reason = reason
        record.last_sync_error = reason
        store.put(record)
        console.log(`⛔ Offline: Marked #${id} as REJECTED: ${reason}`)
      }
      resolve()
    }

    getReq.onerror = () => reject(getReq.error)
  })
}

// ============ ✨ TANDAI SKIPPED (sudah ada di server) ============
export async function markAsSkipped(id: number): Promise<void> {
  const db = await openOfflineDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readwrite')
    const store = tx.objectStore(STORE_PENDING)
    const getReq = store.get(id)

    getReq.onsuccess = () => {
      const record = getReq.result
      if (record) {
        record.synced = true
        record.status = 'skipped'
        store.put(record)
        console.log(`⏭️ Offline: Marked #${id} as skipped (already in server)`)
      }
      resolve()
    }

    getReq.onerror = () => reject(getReq.error)
  })
}

// ============ UPDATE SYNC ERROR (retry-able) ============
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

// ============ HAPUS SATU RECORD ============
export async function deleteRecord(id: number): Promise<void> {
  const db = await openOfflineDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readwrite')
    const store = tx.objectStore(STORE_PENDING)
    const request = store.delete(id)

    request.onsuccess = () => {
      console.log(`🗑️ Offline: Deleted #${id}`)
      resolve()
    }
    request.onerror = () => reject(request.error)
  })
}

// ============ HAPUS YANG SUDAH SYNC (& SKIPPED) ============
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
        // Hapus yang synced ATAU skipped (sudah ada di server)
        if (record.synced || record.status === 'synced' || record.status === 'skipped') {
          store.delete(record.id!)
          deleted++
        }
      })

      console.log(`🗑️ Offline: Cleared ${deleted} completed records`)
      resolve(deleted)
    }

    request.onerror = () => reject(request.error)
  })
}

// ============ HAPUS SEMUA REJECTED (manual cleanup) ============
export async function clearRejectedRecords(): Promise<number> {
  const db = await openOfflineDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PENDING, 'readwrite')
    const store = tx.objectStore(STORE_PENDING)
    const request = store.getAll()

    request.onsuccess = () => {
      const all = request.result as OfflineAttendance[]
      let deleted = 0

      all.forEach(record => {
        if (record.status === 'rejected') {
          store.delete(record.id!)
          deleted++
        }
      })

      console.log(`🗑️ Offline: Cleared ${deleted} rejected records`)
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

// ============================================
// GET TODAY'S OFFLINE ATTENDANCE (untuk UI status)
// ============================================
export async function getTodayOfflineAttendance(): Promise<{
  clockIn: any | null
  clockOut: any | null
}> {
  const db = await openOfflineDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_attendance', 'readonly')
    const store = tx.objectStore('pending_attendance')
    const req = store.getAll()
    
    req.onsuccess = () => {
      const all = req.result || []
      const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0] // WITA YYYY-MM-DD
      
      // Filter: hari ini, belum sync, belum rejected
      const todayRecords = all.filter((r: any) => {
        if (r.synced || r.rejected) return false
        const recordDate = new Date(r.timestamp).toISOString().split('T')[0]
        return recordDate === today
      })
      
      const clockIn = todayRecords.find((r: any) => r.type === 'clock_in') || null
      const clockOut = todayRecords.find((r: any) => r.type === 'clock_out') || null
      
      resolve({ clockIn, clockOut })
    }
    
    req.onerror = () => reject(req.error)
  })
}

// ============ HITUNG REJECTED ============
export async function countRejected(): Promise<number> {
  const rejected = await getRejectedAttendance()
  return rejected.length
}

// ============ ✨ SYNC PINTAR KE SERVER ============
export async function syncToServer(): Promise<{
  success: number      // berhasil masuk server
  skipped: number      // sudah ada di server (auto-remove)
  rejected: number     // ditolak permanen (di luar radius, dll)
  failed: number       // network error (bisa retry)
  total: number
  results: Array<{ 
    id: number
    type: string
    status: 'success' | 'skipped' | 'rejected' | 'failed'
    message: string 
  }>
}> {
  const pending = await getPendingAttendance()

  if (pending.length === 0) {
    return { success: 0, skipped: 0, rejected: 0, failed: 0, total: 0, results: [] }
  }

  console.log(`🔄 Sync: Starting sync of ${pending.length} records...`)

  let success = 0
  let skipped = 0
  let rejected = 0
  let failed = 0
  const results: Array<{ id: number; type: string; status: 'success' | 'skipped' | 'rejected' | 'failed'; message: string }> = []

  // Sort by timestamp (clock_in duluan)
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

      // ✨ CASE 1: SUKSES (200 OK)
      if (response.ok) {
        // Cek apakah server bilang "skipped" (sudah ada)
        if (data.skipped) {
          await markAsSkipped(record.id!)
          skipped++
          results.push({
            id: record.id!,
            type: record.type,
            status: 'skipped',
            message: 'Sudah ada di server (di-skip)'
          })
          console.log(`⏭️ Sync: ${record.type} #${record.id} SKIPPED`)
        } else {
          await markAsSynced(record.id!)
          success++
          results.push({
            id: record.id!,
            type: record.type,
            status: 'success',
            message: data.message || 'Berhasil sync'
          })
          console.log(`✅ Sync: ${record.type} #${record.id} OK`)
        }
      }
      // ✨ CASE 2: DITOLAK PERMANEN (400 dengan reason spesifik)
      else if (response.status === 400) {
        const errorMsg = String(data.error || '').toLowerCase()
        
        // Cek apakah error karena "sudah clock in"
        if (errorMsg.includes('sudah clock in') || errorMsg.includes('sudah ada')) {
          // Treat as skipped (data sudah ada di server)
          await markAsSkipped(record.id!)
          skipped++
          results.push({
            id: record.id!,
            type: record.type,
            status: 'skipped',
            message: 'Sudah ada di server hari itu'
          })
          console.log(`⏭️ Sync: ${record.type} #${record.id} already exists, marked skipped`)
        }
        // Cek apakah error karena "di luar radius"
        else if (errorMsg.includes('radius') || errorMsg.includes('site') || errorMsg.includes('gps')) {
          await markAsRejected(record.id!, data.error)
          rejected++
          results.push({
            id: record.id!,
            type: record.type,
            status: 'rejected',
            message: data.error
          })
          console.log(`⛔ Sync: ${record.type} #${record.id} REJECTED: ${data.error}`)
        }
        // Cek apakah error karena "> 7 hari"
        else if (errorMsg.includes('terlalu lama') || errorMsg.includes('7 hari')) {
          await markAsRejected(record.id!, data.error)
          rejected++
          results.push({
            id: record.id!,
            type: record.type,
            status: 'rejected',
            message: data.error
          })
          console.log(`⛔ Sync: ${record.type} #${record.id} REJECTED (too old)`)
        }
        // Error 400 lain → tetap retry-able
        else {
          await updateSyncError(record.id!, data.error || 'Bad request')
          failed++
          results.push({
            id: record.id!,
            type: record.type,
            status: 'failed',
            message: data.error || 'Server error'
          })
        }
      }
      // ✨ CASE 3: UNAUTHORIZED (session expired)
      else if (response.status === 401) {
        await updateSyncError(record.id!, 'Session expired, silakan login ulang')
        failed++
        results.push({
          id: record.id!,
          type: record.type,
          status: 'failed',
          message: 'Session expired'
        })
      }
      // ✨ CASE 4: SERVER ERROR (500, dll) — retry-able
      else {
        await updateSyncError(record.id!, data.error || `HTTP ${response.status}`)
        failed++
        results.push({
          id: record.id!,
          type: record.type,
          status: 'failed',
          message: data.error || `Server error ${response.status}`
        })
      }
    } catch (err: any) {
      // Network error — retry-able
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

  // Bersihkan yang sudah sync/skipped
  await clearSyncedRecords()

  console.log(`📊 Sync complete: ${success} success, ${skipped} skipped, ${rejected} rejected, ${failed} failed`)
  return { success, skipped, rejected, failed, total: pending.length, results }
}