'use client'

// ResetPasswordAdminView dipisah dari app/dashboard/page.tsx (v1.8)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import { useState, useEffect, useRef } from 'react'
import { Input } from './_fields'

export default function ResetPasswordAdminView() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmp, setSelectedEmp] = useState<any>(null)
  const [mode, setMode] = useState<'reset_to_nrp' | 'custom'>('reset_to_nrp')
  const [customPassword, setCustomPassword] = useState('')
  const [processing, setProcessing] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  const [recentResets, setRecentResets] = useState<any[]>([])

  useEffect(() => {
    loadEmployees()
  }, [])

  async function loadEmployees() {
    setLoading(true)
    try {
      const res = await fetch('/api/data?menu=kelola_karyawan')
      const json = await res.json()
      setEmployees(json.rows || [])
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  function openResetModal(emp: any) {
    setSelectedEmp(emp)
    setMode('reset_to_nrp')
    setCustomPassword('')
    setMsg(null)
  }

  async function handleReset() {
    if (!selectedEmp) return

    if (mode === 'custom' && customPassword.length < 4) {
      setMsg({ type: 'err', text: '❌ Password minimal 4 karakter' })
      return
    }

    const confirmText = mode === 'reset_to_nrp'
      ? `Reset password ${selectedEmp.nama} ke NRP-nya (${selectedEmp.nrp})?`
      : `Reset password ${selectedEmp.nama} ke password custom?`

    if (!confirm(` KONFIRMASI\n\n${confirmText}\n\nUser ini akan otomatis logout dan harus login ulang.`)) return

    setProcessing(true)
    setMsg(null)
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nrp: selectedEmp.nrp,
          mode,
          custom_password: mode === 'custom' ? customPassword : undefined
        })
      })
      const json = await res.json()
      if (res.ok) {
        setMsg({ type: 'ok', text: json.message })
        setRecentResets(prev => [{
          nama: selectedEmp.nama,
          nrp: selectedEmp.nrp,
          reset_to: json.reset_to,
          waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }, ...prev].slice(0, 10))
        setTimeout(() => {
          setSelectedEmp(null)
          setMsg(null)
        }, 2500)
      } else {
        setMsg({ type: 'err', text: '❌ ' + json.error })
      }
    } catch {
      setMsg({ type: 'err', text: '❌ Koneksi bermasalah' })
    } finally {
      setProcessing(false)
    }
  }

  const filtered = employees.filter((e: any) =>
    (e.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.nrp || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat data karyawan...
    </div>
  )

  return (
    <div className="animate-in fade-in duration-500 pb-32 space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">🔧</div>
            <div>
             <p className="text-amber-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Manajemen Akses</p>
              <h1 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black tracking-tight">Reset Password Karyawan</h1>
            </div>
          </div>
          <p className="text-blue-200/70 text-xs font-medium">
            Reset password karyawan ke default (NRP) atau password custom. User akan auto-logout.
          </p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-slate-50 shadow-sm">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">👥 Total Karyawan</p>
          <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-slate-900">{employees.length}</p>
        </div>
        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-amber-50 shadow-sm">
          <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest mb-1">🔧 Direset Hari Ini</p>
          <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-amber-600">{recentResets.length}</p>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white p-4 rounded-[2rem] border-2 border-slate-50 shadow-sm">
        <input
          type="text"
          placeholder="🔍 Cari nama atau NRP karyawan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-sm focus:border-[#003D79] focus:bg-white transition-all"
        />
      </div>

      {/* RIWAYAT RESET HARI INI */}
      {recentResets.length > 0 && (
        <div className="bg-white rounded-[2.5rem] border-2 border-amber-100 shadow-sm overflow-hidden">
          <div className="p-5 bg-amber-50/50 border-b-2 border-amber-100 flex items-center gap-3">
            <span className="text-xl">📜</span>
            <div>
              <h3 className="font-black text-slate-900 text-sm">Riwayat Reset Sesi Ini</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Log otomatis hapus saat halaman ditutup</p>
            </div>
          </div>
          <div className="divide-y divide-amber-50">
            {recentResets.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center text-xs font-black text-amber-700">
                  {r.nama[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">{r.nama}</p>
                  <p className="text-[9px] font-bold text-slate-400">{r.nrp} • Reset ke {r.reset_to}</p>
                </div>
                <span className="text-[9px] font-black text-slate-400">{r.waktu}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIST KARYAWAN */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="p-20 text-center text-slate-300 font-bold italic bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
            Karyawan tidak ditemukan
          </div>
        ) : (
          filtered.slice(0, 50).map((emp: any) => (
            <div
              key={emp.nrp}
              className="bg-white p-4 rounded-[2rem] border-2 border-slate-50 shadow-sm flex items-center gap-2 lg:gap-4 hover:border-amber-200 transition-all group"
            >
              <div className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 group-hover:bg-[#003D79] group-hover:text-white transition-all text-sm">
                {(emp.nama || '?')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-slate-900 truncate">{emp.nama}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                  {emp.nrp} • {emp.jabatan || '-'} • {emp.site || '-'}
                </p>
              </div>
              <button
                onClick={() => openResetModal(emp)}
                className="bg-amber-500 text-white px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-amber-600 active:scale-95 transition-all whitespace-nowrap"
              >
                🔧 RESET
              </button>
            </div>
          ))
        )}
        {filtered.length > 50 && (
          <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest py-4">
            Menampilkan 50 dari {filtered.length} hasil. Persempit pencarian untuk akurasi.
          </p>
        )}
      </div>

      {/* MODAL RESET PASSWORD */}
      {selectedEmp && (
        <>
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100]" onClick={() => !processing && setSelectedEmp(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-md bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden">

            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-br from-amber-500 to-amber-600 text-white">
              <div className="flex items-center gap-2 lg:gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center font-black text-2xl">
                  {selectedEmp.nama[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-black text-lg tracking-tight truncate">{selectedEmp.nama}</h2>
                  <p className="text-amber-100 text-[10px] font-bold uppercase tracking-widest">
                    NRP: {selectedEmp.nrp} • {selectedEmp.jabatan || '-'}
                  </p>
                </div>
                <button
                  onClick={() => !processing && setSelectedEmp(null)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-lg font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {msg && (
              <div className={`px-6 py-3 border-b-2 ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                <p className="text-[11px] font-black uppercase tracking-widest">{msg.text}</p>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Pilih Mode Reset
                </p>

                {/* Mode 1: Reset ke NRP */}
                <button
                  onClick={() => { setMode('reset_to_nrp'); setCustomPassword('') }}
                  className={`w-full text-left p-5 rounded-2xl border-2 mb-3 transition-all ${
                    mode === 'reset_to_nrp'
                      ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400 ring-offset-2'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      mode === 'reset_to_nrp' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                    }`}>
                      {mode === 'reset_to_nrp' && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div>
                      <p className="font-black text-sm text-slate-900">Reset ke NRP</p>
                      <p className="text-[10px] text-slate-400 font-bold">
                        Password akan menjadi: <span className="font-black text-blue-600 font-mono">{selectedEmp.nrp}</span>
                      </p>
                    </div>
                  </div>
                </button>

                {/* Mode 2: Custom */}
                <button
                  onClick={() => setMode('custom')}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                    mode === 'custom'
                      ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400 ring-offset-2'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      mode === 'custom' ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
                    }`}>
                      {mode === 'custom' && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div>
                      <p className="font-black text-sm text-slate-900">Password Custom</p>
                      <p className="text-[10px] text-slate-400 font-bold">Tentukan password sendiri (min 4 karakter)</p>
                    </div>
                  </div>
                </button>

                {/* Input Custom Password */}
                {mode === 'custom' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={customPassword}
                      onChange={e => setCustomPassword(e.target.value)}
                      placeholder="Masukkan password baru..."
                      minLength={4}
                      className="w-full p-4 border-2 border-amber-200 rounded-2xl bg-amber-50 text-sm font-bold focus:border-amber-500 outline-none transition-all"
                    />
                    {customPassword && customPassword.length < 4 && (
                      <p className="text-[10px] text-rose-500 font-bold mt-2"> Minimal 4 karakter</p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-rose-50 border-2 border-rose-100 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-1"> Perhatian</p>
                <p className="text-[10px] font-bold text-rose-600 leading-relaxed">
                  User ini akan langsung logout dan harus login ulang dengan password baru.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t-2 border-slate-100 flex gap-3">
              <button
                onClick={() => !processing && setSelectedEmp(null)}
                disabled={processing}
                className="flex-1 py-4 bg-white text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-slate-100 hover:bg-slate-100 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleReset}
                disabled={processing || (mode === 'custom' && customPassword.length < 4)}
                className={`flex-[2] py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${
                  processing || (mode === 'custom' && customPassword.length < 4)
                    ? 'bg-slate-200 text-slate-400'
                    : 'bg-amber-500 text-white shadow-xl shadow-amber-200 hover:bg-amber-600'
                }`}
              >
                {processing ? '⏳ MEMPROSES...' : '🔧 RESET PASSWORD SEKARANG'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
