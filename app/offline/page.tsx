'use client';

import PageHeader from "@/app/components/PageHeader";
import { useEffect, useState } from 'react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    // Deteksi status koneksi
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      // Auto redirect ke dashboard saat online
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1500)
    }

    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const tryReconnect = async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/health-check', { 
        method: 'HEAD', 
        cache: 'no-cache' 
      })
      if (res.ok) {
        window.location.href = '/dashboard'
      } else {
        alert('Masih belum ada koneksi. Coba beberapa saat lagi.')
        setChecking(false)
      }
    } catch {
      alert('Masih belum ada koneksi. Coba beberapa saat lagi.')
      setChecking(false)
    }
  }

  const goToDashboard = () => {
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa] flex items-center justify-center p-6">
      <PageHeader title="Offline" backUrl="/dashboard" />

      <div className="max-w-sm w-full">
        <div className="bg-white rounded-[2rem] p-8 shadow-[0_20px_50px_rgba(0,61,121,0.12)] text-center">
          
          {/* Icon */}
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#003D79] to-[#0056b3] rounded-[2rem] flex items-center justify-center shadow-lg">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="w-12 h-12 text-white" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656M12 12h.01M9.172 8.464a4 4 0 015.656 0M5.636 5.636a9 9 0 000 12.728" 
              />
            </svg>
          </div>

          {/* Status Badge */}
          <div className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4
            text-[10px] font-black uppercase tracking-widest
            ${isOnline 
              ? 'bg-emerald-100 text-emerald-800' 
              : 'bg-amber-100 text-amber-800'
            }
          `}>
            <span className={`
              w-2 h-2 rounded-full animate-pulse
              ${isOnline ? 'bg-emerald-600' : 'bg-amber-600'}
            `}></span>
            {isOnline ? 'Koneksi Kembali!' : 'Tidak Ada Koneksi'}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-black text-[#003D79] mb-2">
            Anda Sedang Offline
          </h1>
          <p className="text-slate-600 text-sm mb-6">
            BTM Portal terputus dari internet.<br/>
            Fitur absensi tetap bisa digunakan.
          </p>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 text-left">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#003D79] mb-2">
              💡 Info Penting
            </div>
            <div className="text-xs text-slate-700 leading-relaxed">
              Data absensi Anda akan tersimpan aman di HP dan otomatis terkirim ke server saat koneksi kembali.
            </div>
          </div>

          {/* Buttons */}
          <button
            onClick={tryReconnect}
            disabled={checking}
            className="w-full bg-[#003D79] hover:bg-[#002855] disabled:bg-slate-400 text-white font-black text-sm uppercase tracking-wider py-4 rounded-[1.5rem] transition-all mb-3 flex items-center justify-center gap-2"
          >
            {checking ? (
              <>⏳ Mencoba...</>
            ) : (
              <>🔄 Coba Sambungkan Ulang</>
            )}
          </button>

          <button
            onClick={goToDashboard}
            className="w-full bg-transparent hover:bg-blue-50 text-[#003D79] font-black text-sm uppercase tracking-wider py-4 rounded-[1.5rem] border-2 border-[#003D79] transition-all"
          >
            📱 Buka Dashboard
          </button>

          {/* Footer */}
          <p className="text-[10px] text-slate-400 mt-6 uppercase tracking-widest font-bold">
            BTM Portal · PT. Boston Trikorama Hardika
          </p>
        </div>
      </div>
    </div>
  )
}