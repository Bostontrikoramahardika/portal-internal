'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getUserCache, isCacheValid, saveUserCache, saveToken } from '@/app/lib/auth-cache'

/**
 * BTM PORTAL v1.7.0 - LOGIN SCREEN
 * FIX:
 * - Auto bypass login jika session/token/cache masih ada
 * - Cocok untuk PWA Android & iPhone
 */

export default function LoginPage() {
  const [nrp, setNrp] = useState('')
  const [password, setPassword] = useState('')
  const [site, setSite] = useState('')
  const [sites, setSites] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [booting, setBooting] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function bootstrapLogin() {
      const cachedUser = getUserCache()
      const cacheValid = isCacheValid()
      const localToken =
        typeof window !== 'undefined'
          ? localStorage.getItem('btm_session_token_v1')
          : null

      // 1) Kalau offline dan cache valid → langsung masuk dashboard
      if (!navigator.onLine) {
        if (cachedUser && cacheValid) {
          console.log('📴 Offline + cache valid → bypass login')
          router.replace('/dashboard?menu=absensi_saya')
          return
        }

        if (!cancelled) setBooting(false)
        return
      }

      // 2) Coba session dari cookie dulu
      try {
        const res = await fetch('/api/auth/me', {
          cache: 'no-store',
          signal: AbortSignal.timeout(5000)
        })

        if (res.ok) {
          const data = await res.json()
          saveUserCache({
            ...data.user,
            roles: data.roles || [],
            permissions: data.permissions || []
          })
          console.log('✅ Session cookie valid → bypass login')
          router.replace('/dashboard?menu=absensi_saya')
          return
        }
      } catch (err) {
        console.warn('Auth bootstrap via cookie gagal:', err)
      }

      // 3) Kalau cookie gagal, coba token localStorage (khusus PWA iPhone/Android)
      if (localToken) {
        try {
          const retryRes = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${localToken}`
            },
            cache: 'no-store',
            signal: AbortSignal.timeout(5000)
          })

          if (retryRes.ok) {
            const retryData = await retryRes.json()

            saveToken(localToken)
            saveUserCache({
              ...retryData.user,
              roles: retryData.roles || [],
              permissions: retryData.permissions || []
            })

            // renew cookie lagi
            await fetch('/api/auth/renew', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localToken}`
              },
              signal: AbortSignal.timeout(5000)
            })

            console.log('🔄 Token localStorage valid → cookie renewed → bypass login')
            router.replace('/dashboard?menu=absensi_saya')
            return
          }
        } catch (err) {
          console.warn('Auth bootstrap via local token gagal:', err)
        }
      }

      // 4) Fallback terakhir: kalau ada cache valid, tetap masuk dashboard
      if (cachedUser && cacheValid) {
        console.log('💾 Cache valid ditemukan → bypass login')
        router.replace('/dashboard?menu=absensi_saya')
        return
      }

      if (!cancelled) setBooting(false)
    }

    async function loadSites() {
      try {
        const res = await fetch('/api/public/sites')
        const d = await res.json()
        const siteList = (d.sites || []).map((s: any) => s.nama_site)
        if (siteList.length > 0) {
          setSites(siteList)
        } else {
          setSites(['PPA-MLP', 'HO', 'PPA-BIB', 'PPA-MCB'])
        }
      } catch {
        setSites(['PPA-MLP', 'HO', 'PPA-BIB', 'PPA-MCB'])
      }
    }

    bootstrapLogin().finally(() => {
      if (!cancelled) setBooting(false)
    })
    loadSites()

    return () => {
      cancelled = true
    }
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!site) {
      setError('Pilih Site Kerja')
      return
    }
    if (!password) {
      setError('Password wajib diisi')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nrp: nrp.trim(),
          password: password.trim(),
          site: site
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login gagal')
        setLoading(false)
        return
      }

      if (data.token) {
        saveToken(data.token)
      }

      if (data.user) {
        saveUserCache(data.user)
      }

      router.replace('/dashboard?menu=absensi_saya')
    } catch (err) {
      setError('Koneksi Gagal ke Server')
      setLoading(false)
    }
  }

  if (booting || loading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[999]">
        <div className="animate-swivel mb-6">
          <Image src="/btm-fix.png" alt="Logo" width={180} height={180} priority />
        </div>
        <p className="text-[#003D79] font-black text-xs tracking-[0.3em] animate-pulse uppercase">
          {booting ? 'Memeriksa Sesi...' : 'Authenticating...'}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 sm:pb-8  w-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#F8FAFC]">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.01] z-0"
        style={{
          backgroundImage: `url('/bg-pattern.png')`,
          backgroundRepeat: 'repeat',
          backgroundSize: '160px',
        }}
      />

      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#003d79]/15 rounded-full blur-[120px] pointer-events-none z-[1]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#003D79]/10 rounded-full blur-[120px] pointer-events-none z-[1]" />

      <div className="relative z-10 w-full max-w-[360px] flex flex-col items-center">
        <div className="fixed top-8 right-8 text-[#5a6a7e] text-[10px] font-bold tracking-widest opacity-50">
          V.1.7.0
        </div>

        <div className="flex flex-col items-center mb-10 text-center">
          <div className="mb-6 drop-shadow-sm">
            <Image src="/btm-fix.png" alt="Logo BTM" width={180} height={180} priority className="object-contain" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">BTM Mobile App</h1>
          <p className="text-[#5a6a7e] text-[9px] font-black uppercase tracking-[0.5em] mt-3 opacity-60">
            INTERNAL PRODUCTION
          </p>
        </div>

        <div className="w-full bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,61,121,0.12)] p-9 border border-white/50">
          <h2 className="text-center font-bold text-[#003D79] text-[11px] mb-8 tracking-[0.3em] uppercase opacity-80">
            Secure Login
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex items-center bg-slate-100/50 border-2 border-transparent rounded-2xl px-5 py-4 focus-within:border-[#003D79] focus-within:bg-white transition-all group">
              <span className="text-[#5a6a7e] group-focus-within:text-[#003D79] transition-colors mr-3 text-lg">👤</span>
              <input
                type="text"
                placeholder="NRP Pengguna"
                value={nrp}
                onChange={(e) => setNrp(e.target.value)}
                className="w-full bg-transparent outline-none font-bold text-sm text-slate-700 placeholder:text-[#5a6a7e]"
                required
              />
            </div>

            <div className="flex items-center bg-slate-100/50 border-2 border-transparent rounded-2xl px-5 py-4 focus-within:border-[#003D79] focus-within:bg-white transition-all group">
              <span className="text-[#5a6a7e] group-focus-within:text-[#003D79] transition-colors mr-3 text-lg">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent outline-none font-bold text-sm text-slate-700 placeholder:text-[#5a6a7e]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#5a6a7e] hover:text-[#003D79] transition-colors ml-2 text-lg active:scale-90"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            <div className="flex items-center bg-slate-100/50 border-2 border-transparent rounded-2xl px-5 py-4 focus-within:border-[#003D79] focus-within:bg-white transition-all group">
              <span className="text-[#5a6a7e] group-focus-within:text-[#003D79] transition-colors mr-3 text-lg">🏢</span>
              <select
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="w-full bg-transparent outline-none font-bold text-sm text-slate-700 appearance-none cursor-pointer"
                required
              >
                <option value="">Pilih Site Kerja</option>
                {sites.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="text-[#5a6a7e] text-[10px]">▼</span>
            </div>

            <button
              type="submit"
              className="w-full bg-[#003D79] text-white py-5 rounded-full font-black text-sm tracking-[0.2em] mt-6 uppercase shadow-xl shadow-blue-900/20 active:scale-[0.97] hover:brightness-110 transition-all"
            >
              Log In
            </button>
          </form>

          {error && (
            <div className="flex justify-center items-center mt-6 gap-2">
              <div className="w-1 h-1 bg-rose-500 rounded-full animate-ping"></div>
              <p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider">{error}</p>
            </div>
          )}

          <div className="text-center mt-8">
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="text-[#003D79] text-[10px] font-black tracking-widest uppercase border-b-2 border-blue-100 pb-1 hover:border-[#003D79] transition-all"
            >
              Bantuan Login
            </button>
          </div>
        </div>

        <div className="mt-12 text-center px-6">
          <p className="text-[9px] text-[#5a6a7e] leading-relaxed mb-6 font-medium">
            Sistem Informasi SDM Terpadu <br />
            <span className="text-[#003D79] font-bold cursor-pointer">PT Boston Trikora Mahardika</span>
          </p>
        </div>
      </div>

      {showHelp && (
        <>
          <div
            className="fixed inset-0 bg-[#f4f7fa]/60 backdrop-blur-md z-[998]"
            onClick={() => setShowHelp(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[999] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-[#003D79] text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-base tracking-tight">📖 Cara Login</h3>
                <p className="text-blue-200 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Panduan Singkat</p>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="bg-white/10 hover:bg-white/20 h-9 w-9 flex items-center justify-center rounded-full transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex gap-3">
                <div className="w-7 h-7 bg-blue-100 text-[#003D79] rounded-full flex items-center justify-center font-black text-xs shrink-0">1</div>
                <div>
                  <p className="text-xs font-black text-slate-800">Masukkan NRP Login</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Contoh: 123456</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 bg-blue-100 text-[#003D79] rounded-full flex items-center justify-center font-black text-xs shrink-0">2</div>
                <div>
                  <p className="text-xs font-black text-slate-800">Masukkan Password</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Untuk pertama kali: <span className="text-[#003D79] font-black">Password = NRP Anda</span></p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 bg-blue-100 text-[#003D79] rounded-full flex items-center justify-center font-black text-xs shrink-0">3</div>
                <div>
                  <p className="text-xs font-black text-slate-800">Pilih SITE tempat Anda bekerja</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Contoh: PPA-MLP</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 bg-blue-100 text-[#003D79] rounded-full flex items-center justify-center font-black text-xs shrink-0">4</div>
                <div>
                  <p className="text-xs font-black text-slate-800">Klik tombol LOG IN</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-4">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-2">❓ Lupa Password?</p>
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    Hubungi <span className="font-black">HRGA Site</span> untuk reset password Anda.
                  </p>
                </div>

                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mt-3">
                  <p className="text-[10px] font-black text-rose-700 uppercase tracking-wider">⚠️ Info Penting</p>
                  <p className="text-[11px] text-rose-800 font-medium mt-1 leading-relaxed">
                    NRP tidak bisa diubah oleh siapapun.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => setShowHelp(false)}
                className="w-full bg-[#003D79] text-white py-3 rounded-2xl font-black text-[11px] tracking-[0.2em] uppercase active:scale-95 transition-all"
              >
                Mengerti
              </button>
            </div>
          </div>
        </>
      )}
    
      {/* Standard App Footer */}
      <footer className="mt-8 mb-20 sm:mb-6 text-center text-xs text-[#8896a7] italic opacity-60">
        <p>BTM Mobile APP V1.7.0</p>
        <p className="text-[10px]">Powered By rck_Production</p>
      </footer>
</div>
  )
}