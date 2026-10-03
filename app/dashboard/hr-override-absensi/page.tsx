'use client'


import { useEffect, useState } from 'react'
import Link from 'next/link'

import StatBanner from '@/app/components/std/StatBanner'
type CorrectionType = 'LUPA_CLOCK_IN' | 'LUPA_CLOCK_OUT' | 'KOREKSI_JAM'

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('btm_session_token_v1')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

function todayString() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function HrOverrideAbsensiPage() {
  const [employeeNrp, setEmployeeNrp] = useState('')
  const [tanggal, setTanggal] = useState(todayString())
  const [tipe, setTipe] = useState<CorrectionType>('KOREKSI_JAM')
  const [shift, setShift] = useState<'SIANG' | 'MALAM' | ''>('')
  const [clockIn, setClockIn] = useState('')
  const [clockOut, setClockOut] = useState('')
  const [alasan, setAlasan] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 5000)
    return () => clearTimeout(t)
  }, [message])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!employeeNrp.trim()) {
      setMessage({ type: 'error', text: 'NRP karyawan wajib diisi' })
      return
    }
    if (!alasan.trim()) {
      setMessage({ type: 'error', text: 'Alasan wajib diisi' })
      return
    }

    if (
      !confirm(
        `⚠️ OVERRIDE ABSENSI\n\nNRP: ${employeeNrp}\nTanggal: ${tanggal}\nTipe: ${tipe}\n\nAksi ini akan LANGSUNG mengubah data attendance tanpa approval. Lanjutkan?`
      )
    ) return

    setLoading(true)
    try {
      const res = await fetch('/api/attendance/corrections/override', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          employee_nrp: employeeNrp.trim(),
          tanggal,
          tipe,
          requested_clock_in: clockIn || null,
          requested_clock_out: clockOut || null,
          requested_shift: shift || null,
          alasan: alasan.trim(),
          approval_note: note.trim() || null,
        }),
      })
      const data = await res.json()

      if (res.ok) {
        setMessage({
          type: 'success',
          text: `✅ Override berhasil — data attendance ${employeeNrp} sudah diupdate`,
        })
        setClockIn('')
        setClockOut('')
        setAlasan('')
        setNote('')
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal override' })
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal override',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#f4f7fa] pb-24 text-slate-800">
      

      <div className="bg-gradient-to-br from-purple-700 to-purple-900 px-5 pt-8 pb-16 rounded-b-[2.5rem] shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white text-lg"
          >
            ←
          </Link>
          <StatBanner eyebrow="HR" title="Override Absensi" />
        </div>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
          <div className="text-white/90 text-xs font-bold">
            ⚠️ Fitur ini mengubah data attendance secara langsung tanpa approval.
            Semua aksi tercatat di audit log.
          </div>
        </div>
      </div>

      <div className="px-5">
        {message && (
          <div
            className={`mb-4 rounded-[1.5rem] p-4 text-sm font-bold shadow-lg ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-2 border-rose-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-[2rem] shadow-xl p-5 space-y-5"
        >
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
              👤 NRP Karyawan
            </label>
            <input
              type="text"
              value={employeeNrp}
              onChange={(e) => setEmployeeNrp(e.target.value)}
              placeholder="Contoh: 1750825"
              className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-200 focus:border-purple-600 outline-none font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
              📅 Tanggal
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-200 focus:border-purple-600 outline-none font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
              📝 Tipe
            </label>
            <div className="grid grid-cols-1 gap-2">
              {(['LUPA_CLOCK_IN', 'LUPA_CLOCK_OUT', 'KOREKSI_JAM'] as CorrectionType[]).map(
                (t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipe(t)}
                    className={`px-4 py-3 rounded-[1.2rem] text-sm font-bold text-left border-2 transition-all ${
                      tipe === t
                        ? 'bg-purple-700 text-white border-purple-700'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {tipe === t ? '● ' : '○ '}
                    {t.replace('_', ' ')}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
              ⏰ Shift
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['', 'SIANG', 'MALAM'] as const).map((s) => (
                <button
                  key={s || 'auto'}
                  type="button"
                  onClick={() => setShift(s)}
                  className={`px-3 py-3 rounded-[1.2rem] text-xs font-black uppercase tracking-widest border-2 ${
                    shift === s
                      ? 'bg-purple-700 text-white border-purple-700'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {s || 'Auto'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
                🕐 Clock In
              </label>
              <input
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className="w-full px-3 py-3 rounded-[1.2rem] border-2 border-slate-200 focus:border-purple-600 outline-none font-bold"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
                🕐 Clock Out
              </label>
              <input
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                className="w-full px-3 py-3 rounded-[1.2rem] border-2 border-slate-200 focus:border-purple-600 outline-none font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
              💬 Alasan Override <span className="text-rose-600">*</span>
            </label>
            <textarea
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              rows={3}
              placeholder="Contoh: Karyawan sudah konfirmasi via WA, jam sesuai..."
              className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-200 focus:border-purple-600 outline-none text-sm resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
              📝 Catatan Tambahan
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Opsional..."
              className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-200 focus:border-purple-600 outline-none text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-purple-700 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-xl disabled:opacity-50"
          >
            {loading ? '⏳ Memproses...' : '🛠️ Override Sekarang'}
          </button>
        </form>
      </div>
    

      </div>
  )
}