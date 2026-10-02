'use client'

// ChangePasswordView - dipisah dari app/dashboard/page.tsx (tahap 2)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import ApprovalCenterExact from '../components/ApprovalCenterExact';
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { getTablePermissions } from '@/app/lib/tablePermissions'
import { saveOfflineAttendance } from '@/app/lib/offlineDB'
import KoreksiBadge from '../components/KoreksiBadge'

export default function ChangePasswordView({ title }: any) {
  const [form, setForm] = useState({ password_lama: '', password_baru: '', password_konfirmasi: '' })
  const [show, setShow] = useState({ lama: false, baru: false, konfirmasi: false })
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg({ type: '', text: '' })

    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()

      if (res.ok) {
        setMsg({ type: 'ok', text: data.message })
        setForm({ password_lama: '', password_baru: '', password_konfirmasi: '' })
        setTimeout(async () => {
          await fetch('/api/auth/logout', { method: 'POST' })
          router.push('/')
        }, 2000)
      } else {
        setMsg({ type: 'err', text: data.error })
      }
    } catch (err) {
      setMsg({ type: 'err', text: 'Kesalahan koneksi server' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto pb-32 animate-in fade-in duration-500">
      
      {/* Header Card */}
      <div className="bg-gradient-to-br from-[#003D79] to-blue-800 text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-400/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <div className="text-4xl mb-3">🔐</div>
          <h2 className="text-xl font-black tracking-tight mb-1">Ganti Password</h2>
          <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Amankan akun Anda secara berkala</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
        {msg.text && (
          <div className={`p-4 rounded-2xl mb-6 text-xs font-bold ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
            {msg.type === 'ok' ? ' ' : '❌ '}{msg.text}
            {msg.type === 'ok' && <p className="text-[10px] mt-2 opacity-70">Anda akan otomatis logout dalam 2 detik...</p>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Password Lama */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Password Lama</label>
            <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus-within:border-[#003D79] focus-within:bg-white transition-all">
              <span className="text-slate-400 mr-3 text-lg">🔒</span>
              <input
                type={show.lama ? 'text' : 'password'}
                value={form.password_lama}
                onChange={(e) => setForm({ ...form, password_lama: e.target.value })}
                className="w-full bg-transparent outline-none font-bold text-sm text-slate-700"
                required
                minLength={4}
              />
              <button
                type="button"
                onClick={() => setShow({ ...show, lama: !show.lama })}
                className="text-slate-400 hover:text-[#003D79] transition-colors ml-2 text-lg active:scale-90"
              >
                {show.lama ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Password Baru */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Password Baru</label>
            <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus-within:border-[#003D79] focus-within:bg-white transition-all">
              <span className="text-slate-400 mr-3 text-lg">🔒</span>
              <input
                type={show.baru ? 'text' : 'password'}
                value={form.password_baru}
                onChange={(e) => setForm({ ...form, password_baru: e.target.value })}
                className="w-full bg-transparent outline-none font-bold text-sm text-slate-700"
                required
                minLength={4}
              />
              <button
                type="button"
                onClick={() => setShow({ ...show, baru: !show.baru })}
                className="text-slate-400 hover:text-[#003D79] transition-colors ml-2 text-lg active:scale-90"
              >
                {show.baru ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Konfirmasi Password */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Konfirmasi Password Baru</label>
            <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus-within:border-[#003D79] focus-within:bg-white transition-all">
              <span className="text-slate-400 mr-3 text-lg">🔒</span>
              <input
                type={show.konfirmasi ? 'text' : 'password'}
                value={form.password_konfirmasi}
                onChange={(e) => setForm({ ...form, password_konfirmasi: e.target.value })}
                className="w-full bg-transparent outline-none font-bold text-sm text-slate-700"
                required
                minLength={4}
              />
              <button
                type="button"
                onClick={() => setShow({ ...show, konfirmasi: !show.konfirmasi })}
                className="text-slate-400 hover:text-[#003D79] transition-colors ml-2 text-lg active:scale-90"
              >
                {show.konfirmasi ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-[10px] text-amber-800 font-bold leading-relaxed">
             Password minimal <span className="font-black">4 karakter</span>. Setelah berhasil, Anda akan otomatis logout dan wajib login ulang dengan password baru.
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-[#003D79] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all disabled:bg-slate-300"
          >
            {loading ? 'MEMPROSES...' : '🔐 UBAH PASSWORD'}
          </button>
        </form>
      </div>
    </div>
  )
}
