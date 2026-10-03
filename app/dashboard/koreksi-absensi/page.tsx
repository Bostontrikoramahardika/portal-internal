'use client'


// app/dashboard/koreksi-absensi/page.tsx — v2.0 (Revisi Waktu Absensi + Pilih Approver)
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import StatBanner from '@/app/components/std/StatBanner'
type CorrectionType = 'LUPA_CLOCK_IN' | 'LUPA_CLOCK_OUT' | 'KOREKSI_JAM'
type Status = 'PENDING' | 'APPROVED' | 'REJECTED'

type CorrectionItem = {
  id: string
  employee_nrp: string
  tanggal: string
  tipe: CorrectionType
  requested_clock_in: string | null
  requested_clock_out: string | null
  requested_shift: string | null
  alasan: string
  bukti_url: string | null
  status: Status
  approver_nrp: string | null
  approver_nama: string | null
  approver_rule: string | null
  approved_by_nama: string | null
  approved_at: string | null
  approval_note: string | null
  approver_target_nrp: string | null
  approver_target_nama: string | null
  approver_target_role: string | null
  is_hr_override: boolean
  created_at: string
}

type ApproverOption = {
  nrp: string
  nama: string
  role: string
  role_label: string
}

const TIPE_LABEL: Record<CorrectionType, string> = {
  LUPA_CLOCK_IN: 'Lupa Clock In',
  LUPA_CLOCK_OUT: 'Lupa Clock Out',
  KOREKSI_JAM: 'Revisi Jam Kerja',
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('btm_session_token_v1')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

function formatDateID(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function todayString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function KoreksiAbsensiPage() {
  const [tab, setTab] = useState<'form' | 'riwayat'>('form')
  const [tanggal, setTanggal] = useState(todayString())
  const [tipe, setTipe] = useState<CorrectionType>('LUPA_CLOCK_OUT')
  const [shift, setShift] = useState<'SIANG' | 'MALAM' | ''>('')
  const [clockIn, setClockIn] = useState('')
  const [clockOut, setClockOut] = useState('')
  const [alasan, setAlasan] = useState('')
  const [buktiUrl, setBuktiUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Approver
  const [approvers, setApprovers] = useState<ApproverOption[]>([])
  const [loadingApprovers, setLoadingApprovers] = useState(false)
  const [selectedApprover, setSelectedApprover] = useState<string>('')

  const [items, setItems] = useState<CorrectionItem[]>([])
  const [loadingList, setLoadingList] = useState(false)

  const showClockIn = useMemo(
    () => tipe === 'LUPA_CLOCK_IN' || tipe === 'KOREKSI_JAM',
    [tipe]
  )
  const showClockOut = useMemo(
    () => tipe === 'LUPA_CLOCK_OUT' || tipe === 'KOREKSI_JAM',
    [tipe]
  )

  // Load approvers on mount
  useEffect(() => {
    const loadApprovers = async () => {
      setLoadingApprovers(true)
      try {
        const res = await fetch('/api/employees/approvers', { headers: getAuthHeaders() })
        const json = await res.json()
        if (json.ok && json.data) {
          setApprovers(json.data)
          // Auto-select first if only 1
          if (json.data.length === 1) {
            setSelectedApprover(json.data[0].nrp)
          }
        }
      } catch { /* ignore */ }
      setLoadingApprovers(false)
    }
    loadApprovers()
  }, [])

  const fetchList = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await fetch('/api/attendance/corrections?view=my&limit=50', {
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (res.ok) {
        setItems(data.items || [])
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal ambil riwayat' })
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal ambil riwayat',
      })
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 4000)
    return () => clearTimeout(t)
  }, [message])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!tanggal) {
      setMessage({ type: 'error', text: 'Tanggal wajib diisi' })
      return
    }
    if (!alasan.trim()) {
      setMessage({ type: 'error', text: 'Alasan wajib diisi' })
      return
    }
    if (!selectedApprover) {
      setMessage({ type: 'error', text: 'Pilih approver terlebih dahulu' })
      return
    }
    if (tipe === 'LUPA_CLOCK_IN' && !clockIn) {
      setMessage({ type: 'error', text: 'Jam clock in wajib diisi' })
      return
    }
    if (tipe === 'LUPA_CLOCK_OUT' && !clockOut) {
      setMessage({ type: 'error', text: 'Jam clock out wajib diisi' })
      return
    }
    if (tipe === 'KOREKSI_JAM' && !clockIn && !clockOut) {
      setMessage({ type: 'error', text: 'Isi minimal salah satu jam revisi' })
      return
    }

    // Find selected approver detail
    const approverDetail = approvers.find(a => a.nrp === selectedApprover)

    setLoading(true)
    try {
      const res = await fetch('/api/attendance/corrections', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tanggal,
          tipe,
          requested_clock_in: showClockIn ? clockIn || null : null,
          requested_clock_out: showClockOut ? clockOut || null : null,
          requested_shift: shift || null,
          alasan: alasan.trim(),
          bukti_url: buktiUrl.trim() || null,
          approver_target_nrp: selectedApprover,
          approver_target_nama: approverDetail?.nama || null,
          approver_target_role: approverDetail?.role || null,
        }),
      })
      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: '✅ Pengajuan revisi berhasil dikirim' })
        setAlasan('')
        setClockIn('')
        setClockOut('')
        setBuktiUrl('')
        setShift('')
        setTab('riwayat')
        await fetchList()
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal mengirim pengajuan' })
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal mengirim pengajuan',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#f4f7fa] pb-24 text-slate-800">
      

      {/* HERO */}
      <div className="hidden">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white text-lg"
          >
            ←
          </Link>
          <StatBanner eyebrow="Pengajuan" title="Revisi Waktu Absensi" />
        </div>

        {/* TAB */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-1 flex gap-1">
          <button
            onClick={() => setTab('form')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              tab === 'form'
                ? 'bg-white text-[#003D79] shadow-lg'
                : 'text-white/70'
            }`}
          >
            📝 Ajukan
          </button>
          <button
            onClick={() => setTab('riwayat')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              tab === 'riwayat'
                ? 'bg-white text-[#003D79] shadow-lg'
                : 'text-white/70'
            }`}
          >
            📋 Riwayat ({items.length})
          </button>
        </div>
      </div>

      <div className="px-5">
        {/* MESSAGE */}
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

        {tab === 'form' && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-[2rem] shadow-xl p-5 space-y-5"
          >
            {/* TANGGAL */}
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
                📅 Tanggal Absensi
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                max={todayString()}
                className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-200 focus:border-[#003D79] outline-none font-bold"
                required
              />
            </div>

            {/* TIPE */}
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
                📝 Tipe Revisi
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
                          ? 'bg-[#003D79] text-white border-[#003D79] shadow-lg'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      {tipe === t ? '● ' : '○ '}
                      {TIPE_LABEL[t]}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* SHIFT */}
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
                ⏰ Shift (Opsional)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['', 'SIANG', 'MALAM'] as const).map((s) => (
                  <button
                    key={s || 'auto'}
                    type="button"
                    onClick={() => setShift(s)}
                    className={`px-3 py-3 rounded-[1.2rem] text-xs font-black uppercase tracking-widest border-2 transition-all ${
                      shift === s
                        ? 'bg-[#003D79] text-white border-[#003D79]'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {s || 'Otomatis'}
                  </button>
                ))}
              </div>
            </div>

            {/* CLOCK IN */}
            {showClockIn && (
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
                  🕐 Jam Clock In yang Benar
                </label>
                <input
                  type="time"
                  value={clockIn}
                  onChange={(e) => setClockIn(e.target.value)}
                  className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-200 focus:border-[#003D79] outline-none font-bold text-lg"
                />
              </div>
            )}

            {/* CLOCK OUT */}
            {showClockOut && (
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
                  🕐 Jam Clock Out yang Benar
                </label>
                <input
                  type="time"
                  value={clockOut}
                  onChange={(e) => setClockOut(e.target.value)}
                  className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-200 focus:border-[#003D79] outline-none font-bold text-lg"
                />
              </div>
            )}

            {/* APPROVER */}
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
                👤 Ditujukan Kepada <span className="text-rose-600">*</span>
              </label>
              {loadingApprovers ? (
                <div className="px-4 py-3 rounded-[1.2rem] border-2 border-slate-200 text-sm text-[#5a6a7e]">
                  Memuat daftar atasan...
                </div>
              ) : approvers.length === 0 ? (
                <div className="px-4 py-3 rounded-[1.2rem] border-2 border-amber-200 bg-amber-50 text-sm text-amber-700">
                  ⚠️ Belum ada approver terdaftar untuk departemen Anda. Hubungi HR.
                </div>
              ) : (
                <div className="space-y-2">
                  {approvers.map((a) => (
                    <button
                      key={a.nrp}
                      type="button"
                      onClick={() => setSelectedApprover(a.nrp)}
                      className={`w-full px-4 py-3 rounded-[1.2rem] text-left border-2 transition-all flex items-center gap-3 ${
                        selectedApprover === a.nrp
                          ? 'bg-[#003D79] text-white border-[#003D79] shadow-lg'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
                        selectedApprover === a.nrp
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {(a.nama || '?')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-sm truncate ${
                          selectedApprover === a.nrp ? 'text-white' : 'text-[#003D79]'
                        }`}>
                          {a.nama}
                        </div>
                        <div className={`text-[10px] ${
                          selectedApprover === a.nrp ? 'text-blue-200' : 'text-[#5a6a7e]'
                        }`}>
                          {a.role_label} · {a.nrp}
                        </div>
                      </div>
                      {selectedApprover === a.nrp && (
                        <span className="text-white text-lg">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ALASAN */}
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
                💬 Alasan <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                rows={4}
                placeholder="Contoh: Lupa clock out karena buru-buru naik bus..."
                className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-200 focus:border-[#003D79] outline-none text-sm resize-none"
                required
              />
            </div>

            {/* BUKTI */}
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
                📎 URL Bukti (Opsional)
              </label>
              <input
                type="url"
                value={buktiUrl}
                onChange={(e) => setBuktiUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-200 focus:border-[#003D79] outline-none text-sm"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Paste link Google Drive / foto (kalau ada)
              </p>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#003D79] text-white rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-xl disabled:opacity-50"
            >
              {loading ? '⏳ Mengirim...' : '📤 Ajukan Revisi'}
            </button>
          </form>
        )}

        {tab === 'riwayat' && (
          <div className="space-y-3">
            {loadingList && (
              <div className="bg-white rounded-[1.5rem] p-8 text-center text-slate-500 text-sm">
                ⏳ Memuat riwayat...
              </div>
            )}
            {!loadingList && items.length === 0 && (
              <div className="bg-white rounded-[1.5rem] p-8 text-center">
                <div className="text-5xl mb-3">📭</div>
                <div className="text-slate-500 font-bold text-sm">
                  Belum ada pengajuan revisi
                </div>
              </div>
            )}
            {items.map((item) => (
              <CorrectionCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CorrectionCard({ item }: { item: CorrectionItem }) {
  const statusStyle: Record<Status, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  }

  const statusIcon: Record<Status, string> = {
    PENDING: '⏳',
    APPROVED: '✅',
    REJECTED: '❌',
  }

  return (
    <div className="bg-white rounded-[1.5rem] shadow-lg p-4 border-2 border-slate-100">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">
            {formatDateID(item.tanggal)}
          </div>
          <div className="text-base font-black text-slate-800">
            {TIPE_LABEL[item.tipe]}
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusStyle[item.status]}`}
        >
          {statusIcon[item.status]} {item.status}
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        {item.requested_clock_in && (
          <div className="flex justify-between">
            <span className="text-slate-500">Clock In:</span>
            <span className="font-bold text-slate-700">
              {item.requested_clock_in.slice(0, 5)}
            </span>
          </div>
        )}
        {item.requested_clock_out && (
          <div className="flex justify-between">
            <span className="text-slate-500">Clock Out:</span>
            <span className="font-bold text-slate-700">
              {item.requested_clock_out.slice(0, 5)}
            </span>
          </div>
        )}
        {/* Ditujukan kepada */}
        {item.approver_target_nama && (
          <div className="flex justify-between">
            <span className="text-slate-500">Ditujukan ke:</span>
            <span className="font-bold text-[#003D79]">
              {item.approver_target_nama}
              {item.approver_target_role && (
                <span className="text-[#5a6a7e] font-normal"> ({item.approver_target_role})</span>
              )}
            </span>
          </div>
        )}
        {/* Disetujui oleh */}
        {item.approved_by_nama && (
          <div className="flex justify-between">
            <span className="text-slate-500">Diproses oleh:</span>
            <span className="font-bold text-emerald-700">{item.approved_by_nama}</span>
          </div>
        )}
      </div>

      <div className="mt-3 p-3 bg-slate-50 rounded-xl">
        <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">
          Alasan
        </div>
        <div className="text-xs text-slate-700">{item.alasan}</div>
      </div>

      {item.approval_note && (
        <div className="mt-2 p-3 bg-slate-50 rounded-xl">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">
            Catatan Approver
          </div>
          <div className="text-xs text-slate-700">{item.approval_note}</div>
        </div>
      )}

      <div className="mt-3 text-[10px] text-[#5a6a7e] text-right">
        Diajukan: {formatDateTime(item.created_at)}
      </div>
    

      </div>
  )
}