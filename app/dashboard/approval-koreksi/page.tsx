'use client';

import PageHeader from "@/app/components/PageHeader";
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type CorrectionType = 'LUPA_CLOCK_IN' | 'LUPA_CLOCK_OUT' | 'KOREKSI_JAM'
type Status = 'PENDING' | 'APPROVED' | 'REJECTED'

type Item = {
  id: string
  employee_nrp: string
  employee_nama: string | null
  employee_site_resolved: string | null
  tanggal: string
  tipe: CorrectionType
  requested_clock_in: string | null
  requested_clock_out: string | null
  requested_shift: string | null
  alasan: string
  bukti_url: string | null
  status: Status
  approver_rule: string | null
  approval_note: string | null
  is_hr_override: boolean
  can_approve: boolean
  created_at: string
}

const TIPE_LABEL: Record<CorrectionType, string> = {
  LUPA_CLOCK_IN: 'Lupa Clock In',
  LUPA_CLOCK_OUT: 'Lupa Clock Out',
  KOREKSI_JAM: 'Koreksi Jam',
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('btm_session_token_v1')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
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
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export default function ApprovalKoreksiPage() {
  const [tab, setTab] = useState<Status>('PENDING')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/attendance/corrections?view=approval&status=${tab}&limit=100`,
        { headers: getAuthHeaders() }
      )
      const data = await res.json()
      if (res.ok) {
        setItems(data.items || [])
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal ambil data' })
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal ambil data',
      })
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 4000)
    return () => clearTimeout(t)
  }, [message])

  const handleApprove = async (id: string) => {
    if (!confirm('Setujui pengajuan koreksi ini?')) return
    setProcessing(id)
    try {
      const res = await fetch(`/api/attendance/corrections/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'APPROVE' }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: '✅ Pengajuan disetujui & attendance diupdate' })
        await fetchList()
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal approve' })
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal approve',
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async () => {
    if (!showRejectModal) return
    setProcessing(showRejectModal)
    try {
      const res = await fetch(`/api/attendance/corrections/${showRejectModal}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'REJECT',
          approval_note: rejectNote.trim() || 'Ditolak tanpa catatan',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: '❌ Pengajuan ditolak' })
        setShowRejectModal(null)
        setRejectNote('')
        await fetchList()
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal reject' })
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal reject',
      })
    } finally {
      setProcessing(null)
    }
  }

  const tabs: { key: Status; label: string; icon: string }[] = [
    { key: 'PENDING', label: 'Menunggu', icon: '⏳' },
    { key: 'APPROVED', label: 'Disetujui', icon: '✅' },
    { key: 'REJECTED', label: 'Ditolak', icon: '❌' },
  ]

  return (
    <div className="min-h-screen bg-[#f4f7fa] pb-24">
      <PageHeader title="Approval Koreksi" backUrl="/dashboard" />

      {/* HERO */}
      
            <h1 className="text-white text-2xl font-black tracking-tight">
              Koreksi Absensi
            </h1>
          </div>
        </div>

        {/* TAB */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-1 flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                tab === t.key ? 'bg-white text-[#003D79] shadow-lg' : 'text-white/70'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
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

        <div className="space-y-3">
          {loading && (
            <div className="bg-white rounded-[1.5rem] p-8 text-center text-slate-500 text-sm">
              ⏳ Memuat...
            </div>
          )}
          {!loading && items.length === 0 && (
            <div className="bg-white rounded-[1.5rem] p-8 text-center">
              <div className="text-5xl mb-3">
                {tab === 'PENDING' ? '🎉' : '📭'}
              </div>
              <div className="text-slate-500 font-bold text-sm">
                {tab === 'PENDING'
                  ? 'Tidak ada pengajuan menunggu'
                  : 'Belum ada data'}
              </div>
            </div>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-[1.5rem] shadow-lg p-4 border-2 border-slate-100"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="text-base font-black text-slate-800">
                    {item.employee_nama || item.employee_nrp}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold">
                    NRP: {item.employee_nrp}
                    {item.employee_site_resolved && ` · ${item.employee_site_resolved}`}
                  </div>
                </div>
                {item.is_hr_override && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-[9px] font-black uppercase">
                    HR Override
                  </span>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    {TIPE_LABEL[item.tipe]}
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    {formatDate(item.tanggal)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {item.requested_clock_in && (
                    <div>
                      <div className="text-slate-500">Clock In</div>
                      <div className="font-black text-slate-800 text-base">
                        {item.requested_clock_in.slice(0, 5)}
                      </div>
                    </div>
                  )}
                  {item.requested_clock_out && (
                    <div>
                      <div className="text-slate-500">Clock Out</div>
                      <div className="font-black text-slate-800 text-base">
                        {item.requested_clock_out.slice(0, 5)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">
                  💬 Alasan
                </div>
                <div className="text-xs text-slate-700">{item.alasan}</div>
              </div>

              {item.bukti_url && (
                <a
                  href={item.bukti_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mb-3 text-xs text-blue-600 font-bold underline"
                >
                  📎 Lihat Bukti
                </a>
              )}

              {item.approval_note && item.status !== 'PENDING' && (
                <div className="mb-3 p-3 bg-slate-50 rounded-xl">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">
                    Catatan
                  </div>
                  <div className="text-xs text-slate-700">{item.approval_note}</div>
                </div>
              )}

              <div className="text-[10px] text-[#5a6a7e] mb-3">
                Diajukan: {formatDateTime(item.created_at)}
              </div>

              {item.can_approve && item.status === 'PENDING' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={processing === item.id}
                    className="py-3 bg-emerald-600 text-white rounded-[1.2rem] font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50"
                  >
                    ✅ Setuju
                  </button>
                  <button
                    onClick={() => setShowRejectModal(item.id)}
                    disabled={processing === item.id}
                    className="py-3 bg-rose-600 text-white rounded-[1.2rem] font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50"
                  >
                    ❌ Tolak
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-5 shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-4">
              ❌ Tolak Pengajuan
            </h3>
            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
              Alasan Penolakan
            </label>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              placeholder="Contoh: Jam tidak sesuai laporan mandor..."
              className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-200 focus:border-rose-500 outline-none text-sm resize-none mb-4"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(null)
                  setRejectNote('')
                }}
                className="py-3 bg-slate-200 text-slate-700 rounded-[1.2rem] font-black text-xs uppercase tracking-widest"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={processing !== null}
                className="py-3 bg-rose-600 text-white rounded-[1.2rem] font-black text-xs uppercase tracking-widest disabled:opacity-50"
              >
                {processing ? 'Memproses...' : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    
      {/* Standard App Footer */}
      <footer className="mt-8 mb-20 sm:mb-6 text-center text-xs text-[#8896a7] italic opacity-60">
        <p>BTM Mobile APP V1.7.0</p>
        <p className="text-[10px]">Powered By rck_Production</p>
      </footer>
</div>
  )
}