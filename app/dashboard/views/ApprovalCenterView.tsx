'use client'

// ApprovalCenterView - dipisah dari app/dashboard/page.tsx (tahap 2)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import ApprovalCenterExact from '../components/ApprovalCenterExact';
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { getTablePermissions } from '@/app/lib/tablePermissions'
import { saveOfflineAttendance } from '@/app/lib/offlineDB'
import KoreksiBadge from '../components/KoreksiBadge'
import { DetailRowSimple } from './_fields2'

export default function ApprovalCenterView() {
  const [items, setItems] = useState<any[]>([])
  const [stats, setStats] = useState<any>({ total: 0, cuti: 0, lembur: 0, sakit: 0, izin_potongan: 0, izin_berbayar: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tahap, setTahap] = useState<'ATASAN' | 'PJO'>('ATASAN')
  const [showAtasanTab, setShowAtasanTab] = useState(true)
  const [showPjoTab, setShowPjoTab] = useState(false)
  const [filterJenis, setFilterJenis] = useState<'ALL' | 'CUTI' | 'LEMBUR' | 'SAKIT' | 'IZIN_POTONGAN' | 'IZIN_BERBAYAR'>('ALL')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [detailItem, setDetailItem] = useState<any>(null)
  // ─── Revisi Absensi ───
  const [mainTab, setMainTab] = useState<'pengajuan' | 'revisi'>('pengajuan')
  const [revisiItems, setRevisiItems] = useState<any[]>([])
  const [revisiLoading, setRevisiLoading] = useState(false)
  const [revisiProcessingId, setRevisiProcessingId] = useState<string | null>(null)
  const [revisiRejectModal, setRevisiRejectModal] = useState<string | null>(null)
  const [revisiRejectNote, setRevisiRejectNote] = useState('')

  useEffect(() => {
    loadData()
  }, [tahap])

  useEffect(() => {
    if (mainTab === 'revisi') loadRevisi()
  }, [mainTab])

  async function loadRevisi(silent = false) {
    if (!silent) setRevisiLoading(true)
    try {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('btm_session_token_v1') : null
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('/api/attendance/corrections?view=approval&status=PENDING&limit=100', { headers })
      const json = await res.json()
      if (json.ok) setRevisiItems(json.items || [])
    } catch (err) {
      console.error('Load revisi error:', err)
    } finally {
      setRevisiLoading(false)
    }
  }

  async function handleRevisiAction(id: string, action: 'APPROVED' | 'REJECTED', note?: string) {
    setRevisiProcessingId(id)
    try {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('btm_session_token_v1') : null
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`/api/attendance/corrections/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ action, approval_note: note || '' })
      })
      const json = await res.json()
      if (res.ok) {
        setRevisiItems(prev => prev.filter(i => i.id !== id))
        setRevisiRejectModal(null)
        setRevisiRejectNote('')
        window.dispatchEvent(new Event('refreshNotif'))
      } else {
        alert('Gagal: ' + (json.error || 'Unknown error'))
      }
    } catch (err: any) {
      alert('Koneksi bermasalah: ' + err.message)
    } finally {
      setRevisiProcessingId(null)
    }
  }

  async function loadData(silent = false) {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch(`/api/approval-center?tahap=${tahap}`)
      const json = await res.json()
      if (res.ok) {
        setItems(json.items || [])
        setStats(json.stats || { total: 0, cuti: 0, lembur: 0, sakit: 0, izin_potongan: 0, izin_berbayar: 0 })
        setShowAtasanTab(json.show_atasan_tab !== false)   // default true
        setShowPjoTab(json.show_pjo_tab === true)          // default false
        
        // Auto-switch tab kalau user cuma punya 1 role
        if (json.show_atasan_tab === false && json.show_pjo_tab === true && tahap === 'ATASAN') {
          setTahap('PJO')
        }
      }
    } catch (err) {
      console.error('Load approval error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleApprove(item: any, action: 'APPROVED' | 'REJECTED') {
    let note = 'OK'
    if (action === 'REJECTED') {
      const promptText = prompt('Alasan penolakan:')
      if (!promptText) return
      note = promptText
    }

    // Tentukan endpoint & field ID berdasarkan jenis pengajuan
    let endpoint = ''
    let body: any = { action, catatan: note } // status: action dihapus karena API tidak butuh
    
    if (item.jenis === 'CUTI') {
      endpoint = '/api/leave/approve'
      body.leave_id = item.id     //  Sesuai API Cuti
    } 
    else if (item.jenis === 'LEMBUR' || item.jenis === 'OVERTIME') {
      endpoint = '/api/overtime/approve'
      body.overtime_id = item.id  //  Sesuai API Lembur (perbaikan)
    } 
    else if (item.jenis === 'SAKIT' || item.jenis === 'IZIN_POTONGAN' || item.jenis === 'IZIN_BERBAYAR') {
      endpoint = '/api/attendance/approve'
      body.id = item.id           //  Sesuai API Sakit
    }

    setProcessingId(item.id)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        // Hilangkan item dari list tanpa reload
        setItems(prev => prev.filter(i => i.id !== item.id))
        
        // ✨ Kasih sinyal ke lonceng untuk update angka
        window.dispatchEvent(new Event('refreshNotif'));
        
        // Mapping jenis ke key stats
        const statsKeyMap: any = {
          'CUTI': 'cuti',
          'LEMBUR': 'lembur',
          'SAKIT': 'sakit',
          'IZIN_POTONGAN': 'izin_potongan',
          'IZIN_BERBAYAR': 'izin_berbayar'
        }
        const statsKey = statsKeyMap[item.jenis] || 'sakit'
        
        setStats((prev: any) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          [statsKey]: Math.max(0, (prev[statsKey] || 0) - 1)
        }))
        setDetailItem(null)
      } else {
        const json = await res.json()
        alert('❌ Gagal: ' + (json.error || 'Unknown error'))
      }
    } catch (err: any) {
      alert('❌ Koneksi bermasalah: ' + err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const filteredItems = filterJenis === 'ALL' 
    ? items 
    : items.filter(i => i.jenis === filterJenis)

  const COLOR_MAP: any = {
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    ring: 'ring-blue-400' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   ring: 'ring-amber-400' },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    ring: 'ring-rose-400' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'ring-emerald-400' }
  }

  const FILTER_CONFIG = [
    { key: 'ALL',            label: 'Semua',         icon: '', count: stats.total },
    { key: 'CUTI',           label: 'Cuti',          icon: '', count: stats.cuti },
    { key: 'LEMBUR',         label: 'Lembur',        icon: '', count: stats.lembur },
    { key: 'SAKIT',          label: 'Sakit',         icon: '🤒', count: stats.sakit },
    { key: 'IZIN_POTONGAN',  label: 'Izin Potongan', icon: '', count: stats.izin_potongan },
    { key: 'IZIN_BERBAYAR',  label: 'Izin Bayar',    icon: '', count: stats.izin_berbayar }
  ]

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat pengajuan...
    </div>
  )

  return (
    <div className="animate-in fade-in duration-500 pb-24 space-y-2 lg:space-y-4">

      {/* MAIN TAB SWITCHER */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex gap-1">
        <button
          onClick={() => setMainTab('pengajuan')}
          className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            mainTab === 'pengajuan'
              ? 'bg-[#003D79] text-white shadow-lg'
              : 'text-slate-400 hover:bg-slate-50'
          }`}
        >
          📋 Pengajuan
          {stats.total > 0 && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
              mainTab === 'pengajuan' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {stats.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setMainTab('revisi')}
          className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            mainTab === 'revisi'
              ? 'bg-amber-500 text-white shadow-lg'
              : 'text-slate-400 hover:bg-slate-50'
          }`}
        >
          ✏️ Revisi Absensi
          {revisiItems.length > 0 && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
              mainTab === 'revisi' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
            }`}>
              {revisiItems.length}
            </span>
          )}
        </button>
      </div>

      {/* HEADER */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="text-xl lg:text-3xl"></div>
              <div>
                <p className="text-emerald-400 font-black text-[9px] lg:text-[10px] uppercase tracking-[0.25em] mb-0.5">
                  Approval Center
                </p>
                <h1 className="text-sm font-black tracking-tight leading-tight">
                  {stats.total > 0 ? `${stats.total} Pengajuan Menunggu` : 'Semua Sudah Diproses'}
                </h1>
              </div>
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="bg-white/10 hover:bg-white/20 px-2.5 py-1.5 lg:px-4 lg:py-2 rounded-xl lg:rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              {refreshing ? '⏳' : '🔄'} Refresh
            </button>
          </div>
          <p className="text-blue-200/70 text-[10px] lg:text-xs font-medium mt-1">
            Cuti, lembur & sakit yang perlu Anda proses
          </p>
        </div>
      </div>

      {/* SWITCH TAHAP: ATASAN vs PJO (adaptif per role) */}
      {(showAtasanTab && showPjoTab) ? (
        // Dual role: tampilkan 2 tab
        <div className="bg-white p-1.5 rounded-2xl lg:rounded-[2rem] border border-slate-100 shadow-sm flex gap-1">
          <button
            onClick={() => setTahap('ATASAN')}
            className={`flex-1 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-wider transition-all ${
              tahap === 'ATASAN'
                ? 'bg-[#003D79] text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
             Sebagai Atasan
          </button>
          <button
            onClick={() => setTahap('PJO')}
            className={`flex-1 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-wider transition-all ${
              tahap === 'PJO'
                ? 'bg-[#003D79] text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
             Sebagai PJO
          </button>
        </div>
      ) : (
        // Single role: tampilkan label saja (bukan tombol)
        <div className="bg-white p-2.5 lg:p-4 rounded-xl lg:rounded-2xl border border-slate-100 shadow-sm text-center">
          <p className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-wider">Approval sebagai</p>
          <p className="text-sm lg:text-lg font-black text-[#003D79] mt-0.5">
            {showPjoTab ? ' PJO' : ' ATASAN'}
          </p>
        </div>
      )}

      {/* FILTER JENIS - PILL BUTTONS */}
      <div className="bg-white p-2.5 lg:p-4 rounded-xl lg:rounded-2xl border border-slate-100 shadow-sm">
        <p className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
          Filter Jenis Pengajuan
        </p>
        <div className="grid grid-cols-3 gap-1.5 lg:gap-2">
          {FILTER_CONFIG.map(f => (
            <button
              key={f.key}
              onClick={() => setFilterJenis(f.key as any)}
              className={`p-2 lg:p-3 rounded-xl lg:rounded-2xl border transition-all text-center ${
                filterJenis === f.key
                  ? 'bg-[#003D79] border-[#003D79] text-white shadow-md'
                  : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200'
              }`}
            >
              <div className="text-base lg:text-lg leading-none">{f.icon}</div>
              <div className="text-[8px] lg:text-[9px] font-black uppercase tracking-wide leading-tight mt-0.5">{f.label}</div>
              <div className={`text-sm lg:text-lg font-black leading-none mt-0.5 ${filterJenis === f.key ? 'text-white' : 'text-[#003D79]'}`}>
                {f.count}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* LIST PENGAJUAN */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <div className="bg-white p-8 lg:p-16 rounded-2xl lg:rounded-[2.5rem] border border-dashed border-slate-200 text-center">
            <div className="text-5xl mb-4 opacity-20">
              {stats.total === 0 ? '' : '📭'}
            </div>
            <h3 className="font-black text-slate-400 uppercase tracking-[0.2em] text-sm mb-2">
              {stats.total === 0 ? 'Semua Beres!' : 'Filter Tidak Ada Hasil'}
            </h3>
            <p className="text-[10px] text-slate-300 font-bold italic">
              {stats.total === 0 
                ? 'Tidak ada pengajuan yang perlu diproses saat ini' 
                : 'Coba pilih filter lain di atas'}
            </p>
          </div>
        ) : (
          filteredItems.map((item: any) => {
            const color = COLOR_MAP[item.color] || COLOR_MAP.blue
            const isProcessing = processingId === item.id
            return (
              <div 
                key={item.id} 
                className={`bg-white rounded-xl lg:rounded-2xl border shadow-sm p-3 lg:p-4 transition-all ${
                  isProcessing ? 'opacity-50' : 'hover:shadow-md'
                } ${color.border}`}
              >
                {/* Header Item */}
                <div className="flex items-start gap-2 lg:gap-3 mb-2 lg:mb-3">
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 ${color.bg} ${color.text} rounded-xl lg:rounded-2xl flex items-center justify-center text-lg lg:text-2xl flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`${color.bg} ${color.text} text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest`}>
                        {item.jenis}
                      </span>
                      <h3 className="font-black text-sm text-slate-900 truncate">{item.judul}</h3>
                    </div>
                    <p className="text-xs font-bold text-slate-700 truncate">👤 {item.karyawan_nama}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {item.karyawan_jabatan} • {item.karyawan_site}
                    </p>
                  </div>
                </div>

                {/* Detail Row */}
                <div className="bg-slate-50/70 p-2 lg:p-3 rounded-lg lg:rounded-xl space-y-1 lg:space-y-1.5 mb-2 lg:mb-3">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-black text-slate-400 uppercase tracking-widest">📅 Tanggal</span>
                    <span className="font-black text-slate-900">
                      {new Date(item.tanggal_mulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {item.tanggal_selesai && item.tanggal_selesai !== item.tanggal_mulai && (
                        <> — {new Date(item.tanggal_selesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="font-black text-slate-400 uppercase tracking-widest">⏰ Durasi</span>
                    <span className="font-black text-slate-900">{item.durasi}</span>
                  </div>
                  {item.alasan_izin && (
                    <div className="flex justify-between text-[11px]">
                      <span className="font-black text-slate-400 uppercase tracking-widest"> Alasan Izin</span>
                      <span className="font-black text-emerald-600 text-right max-w-[60%] truncate">{item.alasan_izin}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-100 pt-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">💬 Alasan</p>
                    <p className="text-[11px] font-medium text-slate-700 italic line-clamp-2">"{item.alasan}"</p>
                  </div>
                </div>

                {/* Foto Bukti (khusus sakit) */}
                {item.foto_url && (
                  <button
                    onClick={() => window.open(item.foto_url, '_blank')}
                    className="w-full mb-3 bg-indigo-50 text-indigo-700 border-2 border-indigo-100 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all active:scale-95"
                  >
                    🖼️ Lihat Foto Bukti
                  </button>
                )}

                {/* Tombol Aksi */}
                <div className="flex gap-1.5 lg:gap-2">
                  <button
                    onClick={() => setDetailItem(item)}
                    disabled={isProcessing}
                    className="flex-1 py-2 lg:py-2.5 bg-slate-100 text-slate-600 rounded-lg lg:rounded-xl font-black text-[9px] lg:text-[10px] uppercase tracking-wider hover:bg-slate-200 disabled:opacity-50 active:scale-95 transition-all"
                  >
                    👁️ Detail
                  </button>
                  <button
                    onClick={() => handleApprove(item, 'REJECTED')}
                    disabled={isProcessing}
                    className="flex-1 py-2 lg:py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg lg:rounded-xl font-black text-[9px] lg:text-[10px] uppercase tracking-wider hover:bg-rose-600 hover:text-white hover:border-rose-600 disabled:opacity-50 active:scale-95 transition-all"
                  >
                    ❌ Tolak
                  </button>
                  <button
                    onClick={() => handleApprove(item, 'APPROVED')}
                    disabled={isProcessing}
                    className="flex-[2] py-3 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-50 active:scale-95 transition-all shadow-lg shadow-emerald-200"
                  >
                    {isProcessing ? '⏳ PROSES...' : ' Setujui'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* MODAL DETAIL */}
      {detailItem && (
        <>
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100]" onClick={() => setDetailItem(null)} />
          <div className="fixed inset-x-2 top-4 bottom-4 lg:inset-x-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[90%] lg:max-w-md lg:h-[85vh] bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden flex flex-col">
            
            <div className={`p-6 ${COLOR_MAP[detailItem.color]?.bg || 'bg-blue-50'} border-b-2 ${COLOR_MAP[detailItem.color]?.border || 'border-blue-100'} flex items-center gap-2 lg:gap-4`}>
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                {detailItem.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-widest ${COLOR_MAP[detailItem.color]?.text}`}>
                  {detailItem.jenis}
                </p>
                <h2 className="font-black text-base text-slate-900 truncate">{detailItem.judul}</h2>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="w-10 h-10 bg-white hover:bg-slate-100 rounded-full flex items-center justify-center text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-4">
              
              {/* Karyawan Info */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">👤 Karyawan Pengaju</p>
                <div className="space-y-2 text-xs">
                  <DetailRowSimple label="Nama" value={detailItem.karyawan_nama} />
                  <DetailRowSimple label="NRP" value={detailItem.karyawan_nrp} mono />
                  <DetailRowSimple label="Jabatan" value={detailItem.karyawan_jabatan} />
                  <DetailRowSimple label="Site" value={detailItem.karyawan_site} />
                </div>
              </div>

              {/* Detail Pengajuan */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3">📋 Detail Pengajuan</p>
                <div className="space-y-2 text-xs">
                  <DetailRowSimple 
                    label="Tanggal Mulai" 
                    value={new Date(detailItem.tanggal_mulai).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} 
                  />
                  {detailItem.tanggal_selesai && detailItem.tanggal_selesai !== detailItem.tanggal_mulai && (
                    <DetailRowSimple 
                      label="Tanggal Selesai" 
                      value={new Date(detailItem.tanggal_selesai).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} 
                    />
                  )}
                  <DetailRowSimple label="Durasi" value={detailItem.durasi} />
                  {detailItem.alasan_izin && (
                    <DetailRowSimple label="Alasan Izin" value={detailItem.alasan_izin} />
                  )}
                  <div className="border-t border-slate-100 pt-2 mt-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alasan</p>
                    <p className="text-xs font-medium text-slate-700 italic bg-slate-50 p-3 rounded-xl">
                      "{detailItem.alasan || '-'}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Foto Bukti */}
              {detailItem.foto_url && (
                <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">🖼️ Foto Bukti</p>
                  <img
                    src={detailItem.foto_url}
                    className="w-full rounded-2xl border-2 border-slate-100"
                    alt="Foto bukti"
                  />
                  <a
                    href={detailItem.foto_url}
                    target="_blank"
                    className="block text-center mt-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                  >
                    Buka Gambar Ukuran Penuh →
                  </a>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">🕐 Metadata</p>
                <div className="space-y-2 text-xs">
                  <DetailRowSimple 
                    label="Diajukan" 
                    value={new Date(detailItem.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} 
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t-2 border-slate-100 flex gap-2">
              <button
                onClick={() => handleApprove(detailItem, 'REJECTED')}
                disabled={processingId === detailItem.id}
                className="flex-1 py-4 bg-rose-50 text-rose-600 border-2 border-rose-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 hover:text-white hover:border-rose-600 disabled:opacity-50 active:scale-95 transition-all"
              >
                ❌ Tolak
              </button>
              <button
                onClick={() => handleApprove(detailItem, 'APPROVED')}
                disabled={processingId === detailItem.id}
                className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-50 active:scale-95 transition-all shadow-xl shadow-emerald-200"
              >
                {processingId === detailItem.id ? '⏳ PROSES...' : ' Setujui'}
              </button>
            </div>
        </div>
        </>
      )}

      {/* ═══ SECTION REVISI ABSENSI ═══ */}
      {mainTab === 'revisi' && (
        <div className="space-y-3">

          {/* Header revisi */}
          <div className="bg-gradient-to-br from-amber-600 to-amber-500 text-white p-4 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-amber-100 font-black text-[9px] uppercase tracking-widest mb-1">Revisi Waktu Absensi</p>
                <h2 className="text-sm font-black">
                  {revisiLoading ? 'Memuat...' : `${revisiItems.length} Pengajuan Pending`}
                </h2>
              </div>
              <button
                onClick={() => loadRevisi()}
                disabled={revisiLoading}
                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
              >
                {revisiLoading ? '⏳' : '🔄'} Refresh
              </button>
            </div>
          </div>

          {revisiLoading ? (
            <div className="bg-white p-12 rounded-2xl text-center text-slate-400 text-sm font-bold animate-pulse">
              Memuat pengajuan revisi...
            </div>
          ) : revisiItems.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl text-center border border-dashed border-slate-200">
              <div className="text-4xl mb-3 opacity-30"></div>
              <p className="font-black text-slate-400 uppercase tracking-widest text-xs">
                Tidak ada pengajuan revisi
              </p>
            </div>
          ) : (
            revisiItems.map((item: any) => {
              const isProcessing = revisiProcessingId === item.id
              const TIPE_LABEL: any = {
                LUPA_CLOCK_IN: 'Lupa Clock In',
                LUPA_CLOCK_OUT: 'Lupa Clock Out',
                KOREKSI_JAM: 'Revisi Jam Kerja',
              }
              return (
                <div key={item.id} className={`bg-white rounded-2xl border-2 shadow-sm p-4 transition-all ${
                  isProcessing ? 'opacity-50' : 'hover:shadow-md'
                } border-amber-100`}>

                  {/* Header card */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                      ✏️
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                          {TIPE_LABEL[item.tipe] || item.tipe}
                        </span>
                        <span className="font-black text-sm text-slate-900 truncate">
                          {item.employee_nama || item.employee_nrp}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {item.employee_nrp} · {item.employee_site_resolved || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Detail */}
                  <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 mb-3 text-[11px]">
                    <div className="flex justify-between">
                      <span className="font-black text-slate-400 uppercase tracking-widest">📅 Tanggal</span>
                      <span className="font-bold text-slate-800">
                        {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {item.requested_clock_in && (
                      <div className="flex justify-between">
                        <span className="font-black text-slate-400 uppercase tracking-widest">🕐 Clock In</span>
                        <span className="font-bold text-emerald-700">{item.requested_clock_in.slice(0, 5)}</span>
                      </div>
                    )}
                    {item.requested_clock_out && (
                      <div className="flex justify-between">
                        <span className="font-black text-slate-400 uppercase tracking-widest">🕐 Clock Out</span>
                        <span className="font-bold text-emerald-700">{item.requested_clock_out.slice(0, 5)}</span>
                      </div>
                    )}
                    {item.approver_target_nama && (
                      <div className="flex justify-between">
                        <span className="font-black text-slate-400 uppercase tracking-widest">👤 Ditujukan</span>
                        <span className="font-bold text-[#003D79]">{item.approver_target_nama}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-100 pt-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">💬 Alasan</p>
                      <p className="text-[11px] text-slate-700 italic">"{item.alasan}"</p>
                    </div>
                  </div>

                  {/* Tombol aksi */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setRevisiRejectModal(item.id)
                        setRevisiRejectNote('')
                      }}
                      disabled={isProcessing}
                      className="flex-1 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                    >
                      ❌ Tolak
                    </button>
                    <button
                      onClick={() => handleRevisiAction(item.id, 'APPROVED', 'Disetujui via Approval Center')}
                      disabled={isProcessing}
                      className="flex-[2] py-2.5 bg-emerald-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-lg shadow-emerald-100"
                    >
                      {isProcessing ? '⏳ Proses...' : ' Setujui'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Modal Reject Revisi */}
      {revisiRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-black text-[#003D79] text-lg mb-1">❌ Tolak Revisi?</h3>
            <p className="text-xs text-slate-400 mb-4">Isi alasan penolakan (wajib)</p>
            <textarea
              value={revisiRejectNote}
              onChange={e => setRevisiRejectNote(e.target.value)}
              rows={3}
              placeholder="Contoh: Data absensi sudah sesuai sistem..."
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-[1.2rem] text-sm outline-none focus:border-rose-400 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRevisiRejectModal(null); setRevisiRejectNote('') }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-[1.2rem]"
              >
                Batal
              </button>
              <button
                onClick={() => revisiRejectNote.trim() && handleRevisiAction(revisiRejectModal, 'REJECTED', revisiRejectNote)}
                disabled={!revisiRejectNote.trim() || !!revisiProcessingId}
                className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-[1.2rem] disabled:opacity-50"
              >
                {revisiProcessingId ? '⏳...' : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// Helper untuk detail row di modal Approval Center
