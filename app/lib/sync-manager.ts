// ============================================
// BTM PORTAL - SYNC MANAGER v2
// Kelola sinkronisasi data offline → server
// SMART: handle success, skipped, rejected, failed
// ============================================

import { syncToServer, countPending } from './offlineDB'

// Status sync global
let isSyncing = false
let lastSyncTime: Date | null = null

// ============ MAIN SYNC FUNCTION ============
export async function performSync(options?: { silent?: boolean }): Promise<{
  success: number
  skipped: number
  rejected: number
  failed: number
  total: number
  message: string
}> {
  // Prevent double sync
  if (isSyncing) {
    console.log('⏳ Sync already in progress...')
    return { 
      success: 0, skipped: 0, rejected: 0, failed: 0, total: 0, 
      message: 'Sync sedang berjalan...' 
    }
  }
  
  // Cek koneksi
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { 
      success: 0, skipped: 0, rejected: 0, failed: 0, total: 0, 
      message: 'Tidak ada koneksi internet' 
    }
  }
  
  // Cek ada data pending
  const pendingCount = await countPending()
  if (pendingCount === 0) {
    return { 
      success: 0, skipped: 0, rejected: 0, failed: 0, total: 0, 
      message: 'Tidak ada data untuk di-sync' 
    }
  }
  
  isSyncing = true
  
  try {
    console.log(`🔄 Sync: Starting sync of ${pendingCount} record(s)...`)
    
    // Trigger event: sync mulai
    dispatchSyncEvent('sync-start', { total: pendingCount })
    
    // Panggil sync
    const result = await syncToServer()
    lastSyncTime = new Date()
    
    // ✨ Buat pesan yang lebih detail
    const parts: string[] = []
    if (result.success > 0) parts.push(`✅ ${result.success} berhasil`)
    if (result.skipped > 0) parts.push(`⏭️ ${result.skipped} sudah ada`)
    if (result.rejected > 0) parts.push(`⛔ ${result.rejected} ditolak`)
    if (result.failed > 0) parts.push(`❌ ${result.failed} gagal`)
    
    let message = ''
    if (parts.length === 0) {
      message = 'Tidak ada data untuk di-sync'
    } else {
      message = parts.join(', ')
    }
    
    // Trigger event: sync selesai
    dispatchSyncEvent('sync-complete', { 
      success: result.success, 
      skipped: result.skipped,
      rejected: result.rejected,
      failed: result.failed, 
      total: result.total,
      message
    })
    
    // Show notif (kecuali silent mode)
    if (!options?.silent && result.total > 0) {
      showSyncNotification(
        result.success, 
        result.failed, 
        result.total, 
        result.skipped, 
        result.rejected
      )
    }
    
    console.log(`📊 Sync selesai: ${result.success} sukses, ${result.skipped} skipped, ${result.rejected} rejected, ${result.failed} gagal`)
    
    return {
      success: result.success,
      skipped: result.skipped,
      rejected: result.rejected,
      failed: result.failed,
      total: result.total,
      message
    }
  } catch (err: any) {
    console.error('❌ Sync error:', err)
    dispatchSyncEvent('sync-error', { error: err.message })
    return { 
      success: 0,
      skipped: 0,
      rejected: 0,
      failed: 0, 
      total: 0, 
      message: `Error: ${err.message}` 
    }
  } finally {
    isSyncing = false
  }
}

// ============ SHOW NOTIFICATION ============
function showSyncNotification(
  success: number, 
  failed: number, 
  total: number,
  skipped: number = 0,
  rejected: number = 0
) {
  if (typeof window === 'undefined') return
  
  const allGood = failed === 0 && rejected === 0
  const emoji = allGood ? '✅' : (rejected > 0 ? '⛔' : '⚠️')
  
  // Coba pakai browser notification kalau di-izinkan
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const parts: string[] = []
      if (success > 0) parts.push(`✅ ${success} sync`)
      if (skipped > 0) parts.push(`⏭️ ${skipped} sudah ada`)
      if (rejected > 0) parts.push(`⛔ ${rejected} ditolak`)
      if (failed > 0) parts.push(`❌ ${failed} gagal`)
      
      new Notification('BTM Portal - Sinkronisasi Selesai', {
        body: parts.join(', '),
        icon: '/btm-fix.png',
        tag: 'sync-notification'
      })
    } catch {}
  }
  
  console.log(`${emoji} Sync: ${success} success, ${skipped} skipped, ${rejected} rejected, ${failed} failed`)
}

// ============ AUTO-SYNC ON ONLINE ============
let onlineListenerAttached = false

export function initAutoSync() {
  if (typeof window === 'undefined') return
  if (onlineListenerAttached) return
  
  onlineListenerAttached = true
  
  // Listen event online
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  console.log('🔄 Auto-sync: Listener attached')
  
  // Trigger sekali saat pertama load kalau online
  if (navigator.onLine) {
    setTimeout(() => {
      checkAndSync()
    }, 2000)
  }
}

async function handleOnline() {
  console.log('🌐 Online detected! Checking for pending sync...')
  dispatchSyncEvent('connection-online', {})
  
  // Delay sebentar biar koneksi stabil
  setTimeout(async () => {
    await checkAndSync()
  }, 1500)
}

function handleOffline() {
  console.log('📴 Offline detected')
  dispatchSyncEvent('connection-offline', {})
}

// ============ CHECK & AUTO SYNC ============
async function checkAndSync() {
  try {
    const count = await countPending()
    if (count > 0) {
      console.log(`📦 Found ${count} pending record(s), starting auto-sync...`)
      await performSync()
    }
  } catch (err) {
    console.error('❌ Auto-sync check failed:', err)
  }
}

// ============ EVENT DISPATCHER ============
function dispatchSyncEvent(type: string, detail: any) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(`btm:${type}`, { detail }))
}

// ============ GETTER ============
export function getSyncStatus() {
  return {
    isSyncing,
    lastSyncTime,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
  }
}

// ============ REQUEST NOTIFICATION PERMISSION ============
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window)) return false
  
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  
  try {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  } catch {
    return false
  }
}