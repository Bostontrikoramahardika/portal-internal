'use client'

// MonitoringCutiTiketView - dipisah dari app/dashboard/page.tsx (tahap 2)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import ApprovalCenterExact from '../components/ApprovalCenterExact';
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { getTablePermissions } from '@/app/lib/tablePermissions'
import { saveOfflineAttendance } from '@/app/lib/offlineDB'
import KoreksiBadge from '../components/KoreksiBadge'
import { StatusBadge } from './_fields2'

export default function MonitoringCutiTiketView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<'CUTI' | 'TIKET'>('CUTI')
  const [bulan, setBulan] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [tahun, setTahun] = useState(String(new Date().getFullYear()))
  const [filterSite, setFilterSite] = useState('')
  const [filterStatusTiket, setFilterStatusTiket] = useState('')
  const [filterJenisCuti, setFilterJenisCuti] = useState('')
  const [editingTiket, setEditingTiket] = useState<any>(null)
  const [tiketForm, setTiketForm] = useState({ status: '', catatan: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [bulan, tahun, filterSite, filterStatusTiket, filterJenisCuti])

  async function loadData() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        bulan, tahun,
        ...(filterSite && { site: filterSite }),
        ...(filterStatusTiket && { status_tiket: filterStatusTiket }),
        ...(filterJenisCuti && { jenis_cuti: filterJenisCuti })
      })
      const res = await fetch(`/api/monitoring-cuti?${params.toString()}`)
      const json = await res.json()
      if (res.ok) setData(json)
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  function openEditTiket(tiket: any) {
    setEditingTiket(tiket)
    setTiketForm({ status: tiket.status, catatan: tiket.catatan || '' })
  }

  async function saveTiketStatus() {
    if (!editingTiket) return
    setSaving(true)
    try {
      const res = await fetch('/api/monitoring-cuti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: editingTiket.id,
          status: tiketForm.status,
          catatan: tiketForm.catatan
        })
      })
      const json = await res.json()
      if (res.ok) {
        alert(' ' + json.message)
        setEditingTiket(null)
        loadData()
      } else {
        alert('❌ ' + json.error)
      }
    } finally {
      setSaving(false)
    }
  }

  const STATUS_TIKET_CONFIG: any = {
    MENUNGGU_PEMESANAN: { icon: '⏳', label: 'Menunggu', color: 'amber' },
    SUDAH_DIPESAN:       { icon: '📞', label: 'Dipesan',  color: 'blue' },
    E_TICKET_TERKIRIM:   { icon: '📧', label: 'Terkirim', color: 'indigo' },
    SELESAI:             { icon: '', label: 'Selesai',  color: 'emerald' },
    DIBATALKAN:          { icon: '❌', label: 'Batal',    color: 'rose' }
  }

  const COLOR_MAP: any = {
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    blue:    'bg-blue-50 text-blue-700 border-blue-200',
    indigo:  'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose:    'bg-rose-50 text-rose-700 border-rose-200'
  }

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat monitoring...
    </div>
  )

  const stats = data?.stats || {}

  return (
    <div className="animate-in fade-in duration-500 pb-32 space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl"></div>
            <div>
              <p className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Data Monitoring</p>
              <h1 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black tracking-tight">Cuti & Tiket Pesawat</h1>
            </div>
          </div>
          <p className="text-blue-200/70 text-xs font-medium">Periode {data?.periode || '-'}</p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-blue-100 shadow-sm">
          <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1"> Total Cuti</p>
          <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-blue-700">{stats.total_cuti || 0}</p>
          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">bulan ini</p>
        </div>
        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-amber-100 shadow-sm">
          <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1">🏖️ Cuti Tahunan</p>
          <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-amber-700">{stats.cuti_tahunan || 0}</p>
        </div>
        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-indigo-100 shadow-sm">
          <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-1">✈️ Butuh Tiket</p>
          <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-indigo-700">{stats.butuh_tiket || 0}</p>
          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{stats.total_tiket || 0} trip</p>
        </div>
        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-rose-100 shadow-sm">
          <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-1">⏳ Menunggu</p>
          <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-rose-700">{stats.tiket_menunggu || 0}</p>
          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">tiket belum dipesan</p>
        </div>
      </div>

      {/* SUB-TAB SWITCHER */}
      <div className="bg-white p-2 rounded-[2rem] border-2 border-slate-50 shadow-sm flex gap-1">
        <button
          onClick={() => setSubTab('CUTI')}
          className={`flex-1 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-wider transition-all ${
            subTab === 'CUTI' ? 'bg-[#003D79] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
          }`}
        >
           Cuti ({stats.total_cuti || 0})
        </button>
        <button
          onClick={() => setSubTab('TIKET')}
          className={`flex-1 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-wider transition-all ${
            subTab === 'TIKET' ? 'bg-[#003D79] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
          }`}
        >
          ✈️ Tiket ({stats.total_tiket || 0})
        </button>
      </div>

      {/* FILTER */}
      <div className="bg-white p-4 rounded-[2rem] border-2 border-slate-50 shadow-sm grid grid-cols-2 lg:grid-cols-5 gap-2">
        <select value={bulan} onChange={e => setBulan(e.target.value)}
          className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]">
          {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
            <option key={m} value={m}>Bulan {m}</option>
          ))}
        </select>
        <select value={tahun} onChange={e => setTahun(e.target.value)}
          className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]">
          {[0, -1, 1].map(o => {
            const y = new Date().getFullYear() + o
            return <option key={y} value={String(y)}>{y}</option>
          })}
        </select>
        <select value={filterSite} onChange={e => setFilterSite(e.target.value)}
          className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]">
          <option value="">Semua Site</option>
          {(data?.sites || []).map((s: string) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {subTab === 'CUTI' ? (
          <select value={filterJenisCuti} onChange={e => setFilterJenisCuti(e.target.value)}
            className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79] col-span-2">
            <option value="">Semua Jenis</option>
            <option value="CUTI REGULER / ROSTER">Reguler</option>
            <option value="CUTI TAHUNAN">Tahunan</option>
          </select>
        ) : (
          <select value={filterStatusTiket} onChange={e => setFilterStatusTiket(e.target.value)}
            className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79] col-span-2">
            <option value="">Semua Status</option>
            {Object.keys(STATUS_TIKET_CONFIG).map(s => (
              <option key={s} value={s}>{STATUS_TIKET_CONFIG[s].icon} {STATUS_TIKET_CONFIG[s].label}</option>
            ))}
          </select>
        )}
      </div>

      {/* LIST */}
      {subTab === 'CUTI' ? (
        <div className="space-y-3">
          {(data?.cuti || []).length === 0 ? (
            <div className="p-16 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
              <p className="text-slate-300 font-bold italic">Belum ada cuti bulan ini</p>
            </div>
          ) : (data?.cuti || []).map((c: any) => (
            <div key={c.id} className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-slate-50 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 bg-blue-100 rounded-2xl flex items-center justify-center font-black text-blue-700">
                  {(c.nama || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-black text-sm text-slate-900 truncate">{c.nama}</p>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                      c.jenis_cuti?.includes('TAHUNAN')
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>{c.jenis_cuti}</span>
                    {c.butuh_tiket && (
                      <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                        ✈️ TIKET
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    {c.nrp} • {c.jabatan} • {c.site}
                  </p>

                  <div className="bg-slate-50/50 p-3 rounded-xl space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-black text-slate-400 uppercase tracking-widest">📅 Tanggal</span>
                      <span className="font-black text-slate-900">
                        {new Date(c.tanggal_mulai).toLocaleDateString('id-ID')} — {new Date(c.tanggal_selesai).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="font-black text-slate-400 uppercase tracking-widest"> Durasi</span>
                      <span className="font-black text-slate-900">{c.jumlah_hari} hari</span>
                    </div>
                    <div className="flex justify-between text-[11px] items-center">
                      <span className="font-black text-slate-400 uppercase tracking-widest">Status</span>
                      <div className="flex gap-1">
                        <StatusBadge value={c.status_atasan} />
                        <StatusBadge value={c.status_pjo || '-'} />
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] italic text-slate-500 mt-2 truncate">"{c.alasan}"</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.tiket || []).length === 0 ? (
            <div className="p-16 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
              <p className="text-slate-300 font-bold italic">Belum ada tiket bulan ini</p>
            </div>
          ) : (data?.tiket || []).map((t: any) => {
            const conf = STATUS_TIKET_CONFIG[t.status] || STATUS_TIKET_CONFIG.MENUNGGU_PEMESANAN
            const colorClass = COLOR_MAP[conf.color]
            return (
              <div key={t.id} className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-slate-50 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${
                    t.trip_type === 'BERANGKAT' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {t.trip_type === 'BERANGKAT' ? '🛫' : '🛬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-black text-sm text-slate-900 truncate">{t.nama}</p>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                        t.trip_type === 'BERANGKAT' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>{t.trip_type}</span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${colorClass}`}>
                        {conf.icon} {conf.label}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      {t.nrp} • {t.jabatan} • {t.site}
                    </p>

                    <div className="bg-slate-50/50 p-3 rounded-xl space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-black text-slate-400 uppercase tracking-widest">📅 Tanggal</span>
                        <span className="font-black text-slate-900">
                          {new Date(t.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="font-black text-slate-400 uppercase tracking-widest">📍 Tujuan</span>
                        <span className="font-black text-slate-900">{t.tujuan}</span>
                      </div>
                      {t.dipesan_oleh && (
                        <div className="flex justify-between text-[11px]">
                          <span className="font-black text-slate-400 uppercase tracking-widest">Dipesan Oleh</span>
                          <span className="font-black text-slate-900">{t.dipesan_oleh}</span>
                        </div>
                      )}
                      {t.catatan && (
                        <p className="text-[10px] italic text-slate-500 pt-1 border-t border-slate-100">"{t.catatan}"</p>
                      )}
                    </div>

                    <button
                      onClick={() => openEditTiket(t)}
                      className="mt-3 w-full py-3 bg-[#003D79] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
                    >
                      ✏️ UPDATE STATUS TIKET
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL EDIT TIKET */}
      {editingTiket && (
        <>
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100]" onClick={() => setEditingTiket(null)} />
          <div className="fixed inset-x-2 top-4 bottom-4 lg:inset-x-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md lg:max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden flex flex-col">
            <div className="p-6 bg-gradient-to-br from-slate-900 to-[#003D79] text-white">
              <div className="flex items-center gap-2 lg:gap-4">
                <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-2xl">
                  ✈️
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest">Update Status Tiket</p>
                  <h2 className="font-black text-lg tracking-tight truncate">{editingTiket.nama}</h2>
                  <p className="text-[10px] text-indigo-100 font-bold">
                    {editingTiket.trip_type} • {editingTiket.tujuan}
                  </p>
                </div>
                <button onClick={() => setEditingTiket(null)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">✕</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Status Baru</label>
                <div className="space-y-2">
                  {Object.entries(STATUS_TIKET_CONFIG).map(([key, conf]: any) => (
                    <button
                      key={key}
                      onClick={() => setTiketForm({ ...tiketForm, status: key })}
                      className={`w-full p-3 rounded-2xl border-2 text-left transition-all ${
                        tiketForm.status === key
                          ? `${COLOR_MAP[conf.color]} ring-2 ring-offset-2 ring-blue-400`
                          : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <p className="text-sm font-black">{conf.icon} {conf.label}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">{key}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Catatan (Opsional)</label>
                <textarea
                  value={tiketForm.catatan}
                  onChange={e => setTiketForm({ ...tiketForm, catatan: e.target.value })}
                  placeholder="Contoh: kode booking, no e-ticket, dll..."
                  rows={3}
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-[#003D79] focus:bg-white outline-none transition-all resize-none"
                />
              </div>
            </div>

            <div className="p-4 bg-white border-t-2 border-slate-100 flex gap-3">
              <button
                onClick={() => setEditingTiket(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                onClick={saveTiketStatus}
                disabled={saving || !tiketForm.status}
                className="flex-[2] py-4 bg-[#003D79] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all"
              >
                {saving ? '⏳ MENYIMPAN...' : '💾 SIMPAN'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
