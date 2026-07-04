'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [nrp, setNrp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // 🔍 CEK SESSION - Kalau masih valid, langsung ke dashboard
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
        })

        if (res.ok) {
          console.log('✅ Session valid, redirect ke dashboard')
          router.push('/dashboard')
        }
      } catch {
        // Offline atau no session, tampilkan login form
        console.log('📡 No session / offline, tampilkan login')
      }
    }

    checkSession()
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nrp: nrp.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login gagal')
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/bg-login.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      ></div>

      {/* Dark Overlay untuk keterbacaan */}
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-slate-950/85 via-slate-900/80 to-slate-800/85"></div>

      {/* Decorative Accent */}
      <div className="absolute inset-0 z-10 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-amber-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md relative z-20">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/20">
          {/* Logo & Brand */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center bg-white rounded-2xl shadow-md p-2">
              <Image
                src="/logo.png"
                alt="BTM Logo"
                width={80}
                height={80}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              BTM Portal
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              PT. Boston Trikora Mahardika
            </p>
            <div className="w-16 h-1 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full mx-auto mt-3"></div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nomor Registrasi Pegawai (NRP)
              </label>
              <input
                type="text"
                value={nrp}
                onChange={(e) => setNrp(e.target.value)}
                placeholder="Masukkan NRP Anda"
                className="w-full px-5 py-3.5 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-lg text-center tracking-widest text-slate-900 transition-all"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold py-3.5 rounded-xl transition-all text-base shadow-lg hover:shadow-xl"
            >
              {loading ? 'Memproses...' : 'Masuk ke Portal'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              Sistem Internal Perusahaan
            </p>
            <p className="text-xs text-slate-400 mt-1">
              © {new Date().getFullYear()} PT. Boston Trikora Mahardika
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}