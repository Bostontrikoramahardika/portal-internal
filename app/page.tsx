'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

/**
 * BTM PORTAL v1.6.0 - LOGIN SCREEN (Luxury Mobile Edition)
 * Style: 1Pama Mobile App
 */

export default function LoginPage() {
  const [nrp, setNrp] = useState('')
  const [site, setSite] = useState('')
  const [sites, setSites] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // 🌐 Fetch daftar site dari database saat halaman dimuat
  useEffect(() => {
    fetch('/api/public/sites')
      .then(r => r.json())
      .then(d => {
        const siteList = (d.sites || []).map((s: any) => s.nama_site)
        // Fallback ke hardcoded jika API gagal / kosong
        if (siteList.length > 0) {
          setSites(siteList)
        } else {
          setSites(['PPA-MLP', 'HO', 'PPA-BIB', 'PPA-MCB'])
        }
      })
      .catch(() => {
        // Fallback jika error koneksi
        setSites(['PPA-MLP', 'HO', 'PPA-BIB', 'PPA-MCB'])
      })
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!site) { setError('Pilih Site Kerja'); return }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nrp: nrp.trim(), site: site })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'NRP tidak terdaftar')
        setLoading(false)
        return
      }
      
      // Redirect ke dashboard setelah session terbentuk
      router.push('/dashboard?menu=absensi_saya')
    } catch (err) {
      setError('Koneksi Gagal ke Server')
      setLoading(false)
    }
  }

  // Animasi Loading Screen (Swivel Logo)
  if (loading) return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[999]">
      <div className="animate-swivel mb-6">
        <Image 
          src="/btm-fix.png" 
          alt="Logo" 
          width={180} 
          height={180} 
          priority 
        />
      </div>
      <p className="text-[#003D79] font-black text-xs tracking-[0.3em] animate-pulse uppercase">Authenticating...</p>
    </div>
  )

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#F8FAFC]">
      
      {/* --- LAYER 1: PATTERN LOGO (Watermark Style) --- */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.01] z-0"
        style={{ 
          backgroundImage: `url('/bg-pattern.png')`, 
          backgroundRepeat: 'repeat',
          backgroundSize: '160px',
        }}
      />
      
      {/* --- LAYER 2: BLUR BLOBS (Pama depth effect) --- */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none z-[1]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#003D79]/10 rounded-full blur-[120px] pointer-events-none z-[1]" />
      
      {/* --- LAYER 3: CONTENT --- */}
      <div className="relative z-10 w-full max-w-[360px] flex flex-col items-center">
        
        {/* Versi Info */}
        <div className="fixed top-8 right-8 text-slate-400 text-[10px] font-bold tracking-widest opacity-50">
          V.1.6.0
        </div>

        {/* Header Logo */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="mb-6 drop-shadow-sm">
            <Image 
              src="/btm-fix.png" 
              alt="Logo BTM" 
              width={180} 
              height={180} 
              priority
              className="object-contain" 
            />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">BTM Mobile App</h1>
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.5em] mt-3 opacity-60">
            INTERNAL PRODUCTION
          </p>
        </div>

        {/* Card Login Utama */}
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
          
          <div className="text-center mt-8">
            <button type="button" className="text-[#003D79] text-[10px] font-black tracking-widest uppercase border-b-2 border-blue-100 pb-1 hover:border-[#003D79] transition-all">
              Bantuan Login
            </button>
          </div>
        </div>

        {/* Footer Berkelas */}
        <div className="mt-12 text-center px-6">
          <p className="text-[9px] text-slate-400 leading-relaxed mb-6 font-medium">
            Sistem Informasi SDM Terpadu <br/>
            <span className="text-[#003D79] font-bold cursor-pointer">PT Boston Trikora Mahardika</span>
          </p>
          <div className="flex items-center justify-center gap-4 opacity-30 grayscale">
             {/* Placeholder jika ada logo partner/sertifikasi */}
          </div>
        </div>

      </div>
    </div>
  )
}