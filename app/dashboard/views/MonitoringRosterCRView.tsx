'use client'

// MonitoringRosterCRView - dipisah dari app/dashboard/page.tsx (tahap 2)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import ApprovalCenterExact from '../components/ApprovalCenterExact';
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { getTablePermissions } from '@/app/lib/tablePermissions'
import { saveOfflineAttendance } from '@/app/lib/offlineDB'
import KoreksiBadge from '../components/KoreksiBadge'

export default function MonitoringRosterCRView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [filterSite, setFilterSite] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    loadData()
  }, [periode, filterSite])

  async function loadData() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        periode,
        ...(filterSite && { site: filterSite }),
      })
      const res = await fetch(`/api/monitoring-roster-cr?${params.toString()}`)
      const json = await res.json()
      if (res.ok) setData(json)
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const STATUS_CONFIG: any = {
    DISETUJUI:    { badge: ' SUDAH AJUKAN', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    MENUNGGU:     { badge: '🕐 MENUNGGU',     color: 'bg-blue-50 text-blue-700 border border-blue-200' },
    BELUM_AJUKAN: { badge: ' BELUM AJUKAN', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
    DITOLAK:      { badge: '❌ DITOLAK',      color: 'bg-rose-50 text-rose-700 border border-rose-200' },
  }

  const stats = data?.stats || {}

  // Filter status client-side
  const rows = (data?.data || []).filter((r: any) => {
    if (filterStatus && r.status !== filterStatus) return false
    return true
  })

  // Generate pilihan periode (12 bulan terakhir + 6 bulan ke depan)
  const periodeOptions = (() => {
    const opts = []
    const now = new Date()
    for (let i = 6; i >= -6; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      opts.push({ val, label })
    }
    return opts
  })()

  function formatDate(d: string) {
    if (!d) return '—'
    return new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  return (
    <div className="space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden">
        <div className="bg-[#003D79] p-6 text-white">
          <h2 className="text-xl font-black uppercase tracking-tight"> Monitoring Cuti Kompensasi (CR)</h2>
          <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mt-1">
            Rekap per karyawan yang punya jadwal CR di periode ini
          </p>
        </div>

        {/* STATS PER KARYAWAN */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-6 border-b">
          {[
            { label: 'Total Karyawan', value: stats.total_karyawan || 0, color: 'text-slate-800',   bg: 'bg-slate-50',   emoji: '👥' },
            { label: 'Sudah Ajukan',   value: stats.sudah_ajukan || 0,   color: 'text-emerald-700', bg: 'bg-emerald-50', emoji: '' },
            { label: 'Menunggu',       value: stats.menunggu || 0,       color: 'text-blue-700',    bg: 'bg-blue-50',    emoji: '🕐' },
            { label: 'Belum Ajukan',   value: stats.belum_ajukan || 0,   color: 'text-amber-700',   bg: 'bg-amber-50',   emoji: '' },
            { label: 'Ditolak',        value: stats.ditolak || 0,        color: 'text-rose-700',    bg: 'bg-rose-50',    emoji: '❌' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-2xl p-4 text-center`}>
              <div className="text-lg mb-1">{s.emoji}</div>
              <div className={`text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* FILTER */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Periode
            </label>
            <select
              value={periode}
              onChange={e => setPeriode(e.target.value)}
              className="w-full p-3 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-blue-500 outline-none"
            >
              {periodeOptions.map(o => (
                <option key={o.val} value={o.val}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Site
            </label>
            <select
              value={filterSite}
              onChange={e => setFilterSite(e.target.value)}
              className="w-full p-3 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-blue-500 outline-none"
            >
              <option value="">Semua Site</option>
              {(data?.sites || []).map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full p-3 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-blue-500 outline-none"
            >
              <option value="">Semua Status</option>
              <option value="BELUM_AJUKAN"> Belum Ajukan</option>
              <option value="MENUNGGU">🕐 Menunggu</option>
              <option value="DISETUJUI"> Sudah Ajukan</option>
              <option value="DITOLAK">❌ Ditolak</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABEL */}
      <div className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden">
        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-800">
            👥 Daftar Karyawan CR — <span className="text-blue-600">{periode}</span>
          </h3>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full font-black">
            {rows.length} KARYAWAN
          </span>
        </div>

        {loading ? (
          <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
            Memuat data...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-20 text-center">
            <div className="text-5xl mb-4 opacity-20">📭</div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
              Tidak ada karyawan dengan roster CR pada periode ini
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((r: any, i: number) => {
              const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.BELUM_AJUKAN
              return (
                <div key={i} className="p-5 hover:bg-slate-50 transition-colors">
                  {/* Header baris */}
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-slate-800 text-sm">{r.nama}</div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        {r.nrp} • {r.jabatan}
                      </div>
                      <div className="text-[10px] text-blue-600 font-black mt-0.5">
                        🏢 {r.site}
                      </div>
                    </div>
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-full shrink-0 ${s.color}`}>
                      {s.badge}
                    </span>
                  </div>

                  {/* Info CR */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 text-[10px]">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="text-slate-400 font-black uppercase tracking-widest mb-1">
                        📅 Jadwal CR
                      </div>
                      <div className="font-black text-slate-700">
                        {r.total_hari_cr} hari
                      </div>
                      <div className="text-slate-500 font-bold mt-0.5">
                        {formatDate(r.tanggal_cr_pertama)} — {formatDate(r.tanggal_cr_terakhir)}
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="text-slate-400 font-black uppercase tracking-widest mb-1">
                         Tanggal Ajukan
                      </div>
                      <div className="font-black text-slate-700">
                        {r.tanggal_ajukan
                          ? new Date(r.tanggal_ajukan).toLocaleDateString('id-ID', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })
                          : <span className="text-slate-300 italic">Belum ada pengajuan</span>
                        }
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="text-slate-400 font-black uppercase tracking-widest mb-1">
                        🏖️ Periode Cuti Diajukan
                      </div>
                      <div className="font-black text-slate-700">
                        {r.tanggal_cuti_mulai && r.tanggal_cuti_selesai
                          ? `${formatDate(r.tanggal_cuti_mulai)} — ${formatDate(r.tanggal_cuti_selesai)}`
                          : <span className="text-slate-300 italic">—</span>
                        }
                      </div>
                    </div>
                  </div>

                  {/* Catatan approval (kalau ada) */}
                  {(r.catatan_atasan || r.catatan_pjo) && (
                    <div className="mt-3 space-y-2">
                      {r.catatan_atasan && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 text-[10px]">
                          <span className="font-black text-blue-700">💬 Catatan Atasan: </span>
                          <span className="text-slate-700 italic">"{r.catatan_atasan}"</span>
                        </div>
                      )}
                      {r.catatan_pjo && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 text-[10px]">
                          <span className="font-black text-indigo-700">💬 Catatan PJO: </span>
                          <span className="text-slate-700 italic">"{r.catatan_pjo}"</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
