'use client';

import PageHeader from "@/app/components/PageHeader";
// ═══════════════════════════════════════════════════════════════════════════
// SCAN QR PAGE v1.0
// Halaman scanner QR standalone — semua role bisa akses
// Flow: buka kamera → detect QR → redirect ke /scan/[token]
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type ScanStatus = 'idle' | 'starting' | 'scanning' | 'detected' | 'error' | 'invalid'

export default function ScanQRPage() {
  const router = useRouter()
  const scannerRef = useRef<any>(null)
  const mountedRef = useRef(true)
  const containerRef = useRef<HTMLDivElement>(null)

  const [status, setStatus] = useState<ScanStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [detectedUrl, setDetectedUrl] = useState('')
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [isToggling, setIsToggling] = useState(false)

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      stopScanner()
    }
  }, [])

  // ── Stop scanner ───────────────────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState?.()
        // state 2 = SCANNING, state 1 = PAUSED
        if (state === 2 || state === 1) {
          await scannerRef.current.stop()
        }
        scannerRef.current.clear?.()
      } catch {
        // silent — scanner mungkin sudah stop
      }
      scannerRef.current = null
    }
  }, [])

  // ── Start scanner ──────────────────────────────────────────────────────
  const startScanner = useCallback(async (facing: 'environment' | 'user') => {
    if (!mountedRef.current) return

    setStatus('starting')
    setErrorMsg('')
    setDetectedUrl('')

    // Stop dulu kalau ada yang jalan
    await stopScanner()

    try {
      const { Html5Qrcode } = await import('html5-qrcode')

      if (!mountedRef.current) return

      const scanner = new Html5Qrcode('qr-reader', { verbose: false })
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: facing },
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          // QR detected!
          handleDetected(decodedText)
        },
        () => {
          // scan frame failure — normal, diabaikan
        }
      )

      if (mountedRef.current) setStatus('scanning')

    } catch (err: any) {
      if (!mountedRef.current) return
      const msg = err?.message || String(err)

      if (msg.includes('Permission') || msg.includes('permission') || msg.includes('NotAllowed')) {
        setStatus('error')
        setErrorMsg('Izin kamera ditolak. Buka pengaturan browser dan izinkan akses kamera.')
      } else if (msg.includes('NotFound') || msg.includes('not found')) {
        setStatus('error')
        setErrorMsg('Kamera tidak ditemukan di perangkat ini.')
      } else {
        setStatus('error')
        setErrorMsg('Gagal membuka kamera: ' + msg)
      }
    }
  }, [stopScanner])

  // ── Handle QR detected ─────────────────────────────────────────────────
  const handleDetected = useCallback(async (text: string) => {
    if (!mountedRef.current) return

    setStatus('detected')
    setDetectedUrl(text)
    await stopScanner()

    // Cek apakah URL mengandung /scan/
    try {
      const url = new URL(text)
      const pathParts = url.pathname.split('/')
      const scanIdx = pathParts.indexOf('scan')

      if (scanIdx !== -1 && pathParts[scanIdx + 1]) {
        const token = pathParts[scanIdx + 1]
        // Redirect ke halaman scan
        setTimeout(() => {
          router.push(`/scan/${token}`)
        }, 600)
        return
      }
    } catch {
      // Bukan URL valid
    }

    // QR tidak valid (bukan QR event BTM)
    setStatus('invalid')
  }, [stopScanner, router])

  // ── Toggle kamera depan/belakang ───────────────────────────────────────
  const toggleCamera = useCallback(async () => {
    if (isToggling || status !== 'scanning') return
    setIsToggling(true)
    const newFacing = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newFacing)
    await startScanner(newFacing)
    setIsToggling(false)
  }, [facingMode, isToggling, startScanner, status])

  // ── Reset untuk scan ulang ─────────────────────────────────────────────
  const resetScan = useCallback(async () => {
    setStatus('idle')
    setDetectedUrl('')
    setErrorMsg('')
    await stopScanner()
  }, [stopScanner])

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f4f7fa] pb-24">
      <PageHeader title="Scan Qr" backUrl="/dashboard" />


      {/* HEADER */}
      <div className="bg-gradient-to-br from-[#003D79] to-[#0056b3] px-4 pt-4 pb-6 rounded-b-3xl shadow-lg">
        <h1 className="text-white text-xl font-black tracking-tight text-center">Scan QR Event</h1>
        <p className="text-blue-200 text-xs text-center mt-1 font-bold">
          Arahkan kamera ke QR Code untuk absen
        </p>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-md mx-auto">

        {/* ── IDLE STATE ── */}
        {status === 'idle' && (
          <div className="bg-white rounded-3xl shadow-sm border p-8 text-center">
            <div className="text-6xl mb-4">📷</div>
            <h2 className="text-base font-black text-slate-800 mb-1">Siap Scan QR</h2>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Tekan tombol di bawah untuk membuka kamera, lalu arahkan ke QR Code yang tersedia di lokasi event.
            </p>
            <button
              onClick={() => startScanner(facingMode)}
              className="w-full py-3.5 bg-gradient-to-r from-[#003D79] to-[#0056b3] text-white rounded-2xl text-sm font-black shadow-lg hover:shadow-xl active:scale-95 transition-all"
            >
              📷 Buka Kamera
            </button>
          </div>
        )}

        {/* ── STARTING STATE ── */}
        {status === 'starting' && (
          <div className="bg-white rounded-3xl shadow-sm border p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#003D79] mb-4"></div>
            <p className="text-sm font-bold text-slate-600">Membuka kamera...</p>
            <p className="text-xs text-slate-400 mt-1">Izinkan akses kamera jika diminta</p>
          </div>
        )}

        {/* ── SCANNING STATE ── */}
        {(status === 'scanning' || status === 'starting') && (
          <div className="space-y-3">
            {/* Viewfinder container */}
            <div className="relative bg-black rounded-3xl overflow-hidden shadow-xl"
              style={{ aspectRatio: '1/1' }}>

              {/* html5-qrcode render di sini */}
              <div
                id="qr-reader"
                ref={containerRef}
                className="w-full h-full"
                style={{ width: '100%', height: '100%' }}
              />

              {/* Corner markers overlay */}
              {status === 'scanning' && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-52 h-52">
                    {/* Top-left */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                    {/* Top-right */}
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                    {/* Bottom-left */}
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                    {/* Bottom-right */}
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
                    {/* Scan line animasi */}
                    <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-[#00c8ff] to-transparent animate-scan-line" />
                  </div>
                </div>
              )}

              {/* Status overlay */}
              {status === 'scanning' && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                  <div className="bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-full">
                    <p className="text-white text-[11px] font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
                      Mendeteksi QR...
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            {status === 'scanning' && (
              <div className="flex gap-2">
                <button
                  onClick={toggleCamera}
                  disabled={isToggling}
                  className="flex-1 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isToggling ? '⏳' : '🔄'} Ganti Kamera
                </button>
                <button
                  onClick={resetScan}
                  className="flex-1 py-2.5 bg-red-50 border-2 border-red-200 text-red-600 rounded-2xl text-xs font-bold hover:bg-red-100 active:scale-95 transition-all"
                >
                  ⏹️ Stop
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── DETECTED STATE ── */}
        {status === 'detected' && (
          <div className="bg-white rounded-3xl shadow-sm border p-8 text-center">
            <div className="text-5xl mb-3 animate-bounce">✅</div>
            <h2 className="text-base font-black text-green-700 mb-1">QR Terdeteksi!</h2>
            <p className="text-xs text-slate-500 mb-2">Mengalihkan ke halaman absensi...</p>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-mono text-slate-400 break-all">{detectedUrl}</p>
            </div>
            <div className="mt-4 flex justify-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#003D79]"></div>
            </div>
          </div>
        )}

        {/* ── INVALID QR STATE ── */}
        {status === 'invalid' && (
          <div className="bg-white rounded-3xl shadow-sm border p-8 text-center">
            <div className="text-5xl mb-3">❌</div>
            <h2 className="text-base font-black text-red-700 mb-1">QR Tidak Valid</h2>
            <p className="text-xs text-slate-500 mb-2">QR Code ini bukan QR event BTM Portal.</p>
            {detectedUrl && (
              <div className="bg-slate-50 rounded-xl p-3 mb-4">
                <p className="text-[10px] font-mono text-slate-400 break-all">{detectedUrl}</p>
              </div>
            )}
            <button
              onClick={resetScan}
              className="w-full py-3 bg-[#003D79] text-white rounded-2xl text-sm font-black active:scale-95 transition-all"
            >
              🔄 Scan Ulang
            </button>
          </div>
        )}

        {/* ── ERROR STATE ── */}
        {status === 'error' && (
          <div className="bg-white rounded-3xl shadow-sm border p-8 text-center">
            <div className="text-5xl mb-3">⚠️</div>
            <h2 className="text-base font-black text-orange-700 mb-1">Kamera Bermasalah</h2>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => startScanner(facingMode)}
              className="w-full py-3 bg-[#003D79] text-white rounded-2xl text-sm font-black active:scale-95 transition-all mb-2"
            >
              🔄 Coba Lagi
            </button>
            <p className="text-[10px] text-slate-400">
              Pastikan browser mendapat izin kamera di pengaturan.
            </p>
          </div>
        )}

        {/* INFO CARD */}
        {status === 'idle' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-xs font-black text-[#003D79] mb-2">💡 Cara Penggunaan</p>
            <ul className="text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
              <li>1. Tekan <strong>Buka Kamera</strong> di atas</li>
              <li>2. Izinkan akses kamera saat diminta browser</li>
              <li>3. Arahkan ke QR Code yang tertempel di lokasi</li>
              <li>4. Isi form kehadiran dan tanda tangan</li>
            </ul>
          </div>
        )}

      </div>
    </div>
  )
}