'use client'

import { useEffect, useState } from 'react'
import { countPending } from '@/app/lib/offlineDB'
import { performSync, getSyncStatus } from '@/app/lib/sync-manager'

export default function SyncIndicator() {
  const [pendingCount, setPendingCount] = useState(0)
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<{
    success: number
    failed: number
    total: number
    message: string
  } | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  
  // Load pending count
  const loadCount = async () => {
    try {
      const count = await countPending()
      setPendingCount(count)
    } catch {}
  }
  
  useEffect(() => {
    // Initial load
    loadCount()
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)
    
    // Listen event online/offline
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    // Listen event sync
    const handleSyncStart = () => {
      setIsSyncing(true)
      setLastResult(null)
    }
    
    const handleSyncComplete = (e: any) => {
      setIsSyncing(false)
      setLastResult(e.detail)
      loadCount() // refresh count
      
      // Auto hide setelah 5 detik kalau sukses
      if (e.detail.failed === 0) {
        setTimeout(() => setLastResult(null), 5000)
      }
    }
    
    const handleSyncError = () => {
      setIsSyncing(false)
    }
    
    // Listen event offline attendance saved (dari handleClock)
    const handleAttendanceSaved = () => {
      loadCount()
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('btm:sync-start', handleSyncStart)
    window.addEventListener('btm:sync-complete', handleSyncComplete)
    window.addEventListener('btm:sync-error', handleSyncError)
    window.addEventListener('btm:offline-attendance-saved', handleAttendanceSaved)
    
    // Refresh count every 30 detik
    const interval = setInterval(loadCount, 30000)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('btm:sync-start', handleSyncStart)
      window.removeEventListener('btm:sync-complete', handleSyncComplete)
      window.removeEventListener('btm:sync-error', handleSyncError)
      window.removeEventListener('btm:offline-attendance-saved', handleAttendanceSaved)
      clearInterval(interval)
    }
  }, [])
  
  // Manual sync button
  const handleManualSync = async () => {
    if (!isOnline) {
      alert('⚠️ Tidak ada koneksi internet. Sinkronisasi akan otomatis dijalankan saat online.')
      return
    }
    if (pendingCount === 0) {
      alert('✅ Tidak ada data offline yang perlu di-sync.')
      return
    }
    
    setIsSyncing(true)
    const result = await performSync({ silent: true })
    setLastResult(result)
    setIsSyncing(false)
    loadCount()
    
    // Tampilkan alert hasil
    alert(result.message)
  }
  
  // Kalau tidak ada pending & tidak sedang sync → jangan tampil apa-apa
  if (pendingCount === 0 && !isSyncing && !lastResult) {
    return null
  }
  
  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-top-4 duration-500">
      
      {/* KONDISI 1: Sedang sync */}
      {isSyncing && (
        <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-[#003D79] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="flex-1">
            <div className="font-black text-[10px] uppercase tracking-widest text-[#003D79]">
              Sinkronisasi...
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              Mengirim data offline ke server
            </div>
          </div>
        </div>
      )}
      
      {/* KONDISI 2: Ada pending, belum sync */}
      {!isSyncing && pendingCount > 0 && !lastResult && (
        <button
          onClick={handleManualSync}
          className="bg-white hover:bg-slate-50 rounded-2xl shadow-2xl border border-amber-100 p-4 flex items-center gap-3 w-full transition-all active:scale-95"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center relative">
            <span className="text-lg">📤</span>
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          </div>
          <div className="flex-1 text-left">
            <div className="font-black text-[10px] uppercase tracking-widest text-amber-700">
              {pendingCount} Absen Menunggu Sync
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              {isOnline ? 'Ketuk untuk sync sekarang' : 'Menunggu koneksi internet'}
            </div>
          </div>
        </button>
      )}
      
      {/* KONDISI 3: Sync selesai (hasil) */}
      {lastResult && !isSyncing && (
        <div className={`
          bg-white rounded-2xl shadow-2xl border p-4
          ${lastResult.failed === 0 ? 'border-emerald-100' : 'border-amber-100'}
        `}>
          <div className="flex items-start gap-3">
            <div className={`
              w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0
              ${lastResult.failed === 0 ? 'bg-emerald-100' : 'bg-amber-100'}
            `}>
              <span className="text-lg">
                {lastResult.failed === 0 ? '✅' : '⚠️'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className={`
                font-black text-[10px] uppercase tracking-widest
                ${lastResult.failed === 0 ? 'text-emerald-700' : 'text-amber-700'}
              `}>
                Sinkronisasi Selesai
              </div>
              <div className="text-xs text-slate-700 mt-1 font-semibold">
                {lastResult.success > 0 && `✅ ${lastResult.success} berhasil `}
                {lastResult.failed > 0 && `❌ ${lastResult.failed} gagal`}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {lastResult.message}
              </div>
            </div>
            <button
              onClick={() => setLastResult(null)}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}