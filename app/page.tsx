'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

/**
 * BTM PORTAL v1.6.2 - LOGIN SCREEN (with Password & Help Modal)
 * Style: 1Pama Mobile App
 */

export default function LoginPage() {
  const [nrp, setNrp] = useState('')
  const [password, setPassword] = useState('')
  const [site, setSite] = useState('')
  const [sites, setSites] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/public/sites')
      .then(r => r.json())
      .then(d => {
        const siteList = (d.sites || []).map((s: any) => s.nama_site)
        if (siteList.length > 0) {
          setSites(siteList)
        } else {
          setSites(['PPA-MLP', 'HO', 'PPA-BIB', 'PPA-MCB'])
        }
      })
      .catch(() => {
        setSites(['PPA-MLP', 'HO', 'PPA-BIB', 'PPA-MCB'])
      })
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!site) { setError('Pilih Site Kerja'); return }
    if (!password) { setError('Password wajib diisi'); return }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nrp: nrp.trim(), password: password.trim(), site: site })
      })
      
const data = await res.json()

if (!res.ok) {
  setError(data.error || 'Login gagal')
  setLoading(false)
  return
}

// ✅ v2.0: Simpan token ke localStorage untuk backup iPhone PWA
if (data.token) {
  try {
    localStorage.setItem('btm_session_token_v1', data.token)
    console.log('💾 Token saved to localStorage')
  } catch {}
}

// Simpan user cache langsung saat login (biar offline langsung siap)
if (data.user) {
  try {
    localStorage.setItem('btm_user_cache_v1', JSON.stringify(data.user))
    localStorage.setItem('btm_cache_timestamp_v1', new Date().toISOString())
  } catch {}
}

router.push('/dashboard?menu=absensi_saya')

    } catch (err) {
      setError('Koneksi Gagal ke Server')
      setLoading(false)
    }
  }

  // Loading Screen
  if (loading) return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[999]">
      <div className="animate-swivel mb-6">
        <Image src="/btm-fix.png" alt="Logo" width={180} height={180} priority />
      </div>
      <p className="text-[#003D79] font-black text-xs tracking-[0.3em] animate-pulse uppercase">Authenticating...</p>
    </div>
  )

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#F8FAFC]">
      
      {/* Background Pattern */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.01] z-0"
        style={{ 
          backgroundImage: `url('/bg-pattern.png')`, 
          backgroundRepeat: 'repeat',
          backgroundSize: '160px',
        }}
      />
      
      {/* Blur Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none z-[1]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#003D79]/10 rounded-full blur-[120px] pointer-events-none z-[1]" />
      
      <div className="relative z-10 w-full max-w-[360px] flex flex-col items-center">
        
        <div className="fixed top-8 right-8 text-slate-400 text-[10px] font-bold tracking-widest opacity-50">
          V.1.6.2
        </div>

        <div className="flex flex-col items-center mb-10 text-center">
          <div className="mb-6 drop-shadow-sm">
            <Image src="/btm-fix.png" alt="Logo BTM" width={180} height={180} priority className="object-contain" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">BTM Mobile App</h1>
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.5em] mt-3 opacity-60">
            INTERNAL PRODUCTION
          </p>
        </div>

        {/* Card Login */}
        <div className="w-full bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,61,121,0.12)] p-9 border border-white/50">
          <h2 className="text-center font-bold text-[#003D79] text-[11px] mb-8 tracking-[0.3em] uppercase opacity-80">
            Secure Login
          </h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* NRP Input */}
            <div className="flex items-center bg-slate-100/50 border-2 border-transparent rounded-2xl px-5 py-4 focus-within:border-[#003D79] focus-within:bg-white transition-all group">
              <span className="text-slate-400 group-focus-within:text-[#003D79] transition-colors mr-3 text-lg">👤</span>
              <input
                type="text"
                placeholder="NRP Pengguna"
                value={nrp}
                onChange={(e) => setNrp(e.target.value)}
                className="w-full bg-transparent outline-none font-bold text-sm text-slate-700 placeholder:text-slate-400"
                required
              />
            </div>

            {/* Password Input (dengan icon mata 👁️) */}
            <div className="flex items-center bg-slate-100/50 border-2 border-transparent rounded-2xl px-5 py-4 focus-within:border-[#003D79] focus-within:bg-white transition-all group">
              <span className="text-slate-400 group-focus-within:text-[#003D79] transition-colors mr-3 text-lg">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent outline-none font-bold text-sm text-slate-700 placeholder:text-slate-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-[#003D79] transition-colors ml-2 text-lg active:scale-90"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {/* Site Selection */}
            <div className="flex items-center bg-slate-100/50 border-2 border-transparent rounded-2xl px-5 py-4 focus-within:border-[#003D79] focus-within:bg-white transition-all group">
              <span className="text-slate-400 group-focus-within:text-[#003D79] transition-colors mr-3 text-lg">🏢</span>
              <select
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="w-full bg-transparent outline-none font-bold text-sm text-slate-700 appearance-none cursor-pointer"
                required
              >
                <option value="">Pilih Site Kerja</option>
                {sites.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="text-slate-400 text-[10px]">▼</span>
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
          
          {/* Tombol Bantuan Login */}
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
          <p className="text-[9px] text-slate-400 leading-relaxed mb-6 font-medium">
            Sistem Informasi SDM Terpadu <br/>
            <span className="text-[#003D79] font-bold cursor-pointer">PT Boston Trikora Mahardika</span>
          </p>
        </div>

      </div>

      {/* MODAL POPUP: BANTUAN LOGIN */}
      {showHelp && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[998]" 
            onClick={() => setShowHelp(false)} 
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[999] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header Modal */}
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
            
            {/* Isi Bantuan */}
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

            {/* Footer Modal */}
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
    </div>
  )
}