'use client'

// SystemAuditView dipisah dari app/dashboard/page.tsx (v1.8)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import { useState, useEffect, useRef } from 'react'
import { DetailRow } from './_fields'

export default function SystemAuditView() {
  const [logs, setLogs] = useState<any[]>([])
  const [stats, setStats] = useState<any>({ total: 0, success: 0, failed: 0, by_category: {} })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedLog, setSelectedLog] = useState<any>(null)

  // Filter states
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Category config (icon, warna, label)
  const CATEGORY_CONFIG: any = {
    AUTH:         { icon: '🔐', label: 'Autentikasi',  color: 'blue',    bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
    ANNOUNCEMENT: { icon: '📢', label: 'Pengumuman',   color: 'amber',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
    SITE:         { icon: '🏢', label: 'Site',         color: 'indigo',  bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
    PERMISSION:   { icon: '🔑', label: 'Permission',   color: 'purple',  bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
    EMPLOYEE:     { icon: '👤', label: 'Karyawan',     color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    PASSWORD:     { icon: '🔧', label: 'Password',     color: 'orange',  bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
    SYSTEM:       { icon: '⚙️', label: 'Sistem',       color: 'rose',    bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' }
  }

  const ACTION_LABELS: any = {
    broadcast:            'Kirim Broadcast',
    delete_announcement:  'Hapus Pengumuman',
    force_logout_all:     'Force Logout Semua User',
    update_site:          'Update Konfigurasi Site',
    delete_site:          'Hapus Site Permanen',
    reset_password:       'Reset Password Karyawan',
    grant_permission:     'Beri Permission',
    revoke_permission:    'Cabut Permission'
  }

  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs(silent = false) {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const params = new URLSearchParams()
      if (filterCategory) params.set('category', filterCategory)
      if (filterAction) params.set('action', filterAction)
      if (filterStartDate) params.set('start_date', filterStartDate)
      if (filterEndDate) params.set('end_date', filterEndDate)
      if (searchQuery) params.set('search', searchQuery)
      params.set('limit', '200')

      const res = await fetch(`/api/audit-logs?${params.toString()}`)
      const json = await res.json()
      if (res.ok) {
        setLogs(json.logs || [])
        setStats(json.stats || {})
      }
    } catch (err) {
      console.error('Load logs error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function resetFilters() {
    setFilterCategory('')
    setFilterAction('')
    setFilterStartDate('')
    setFilterEndDate('')
    setSearchQuery('')
    setTimeout(() => loadLogs(), 100)
  }

  function formatDateTime(dt: string) {
    if (!dt) return '-'
    const d = new Date(dt)
    return d.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric'
    }) + ' • ' + d.toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }

  function timeAgo(dt: string) {
    if (!dt) return '-'
    const diff = Date.now() - new Date(dt).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'baru saja'
    if (mins < 60) return `${mins} mnt lalu`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} jam lalu`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days} hari lalu`
    return new Date(dt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
  }

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat riwayat audit log...
    </div>
  )

  return (
    <div className="animate-in fade-in duration-500 pb-32 space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">

      {/* HEADER */}
<div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
  <div className="absolute top-0 right-0 w-40 h-40 bg-purple-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
  <div className="relative z-10">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
        <div className="text-2xl lg:text-3xl shrink-0">📋</div>
        <div className="min-w-0">
          <p className="text-purple-400 font-black text-[9px] lg:text-[10px] uppercase tracking-[0.25em] lg:tracking-[0.3em] mb-0.5 lg:mb-1">
            Audit Sistem
          </p>
          <h1 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black tracking-tight truncate">Audit Log Sistem</h1>
        </div>
      </div>
      <button
        onClick={() => loadLogs(true)}
        disabled={refreshing}
        className="shrink-0 bg-white/10 hover:bg-white/20 px-2.5 py-1.5 lg:px-4 lg:py-2 rounded-xl lg:rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
      >
        {refreshing ? '⏳' : '🔄'} Refresh
      </button>
    </div>
    <p className="text-blue-200/70 text-[11px] lg:text-xs font-medium mt-2 lg:mt-3">
      Jejak digital aktivitas sistem • Tidak bisa dihapus
    </p>
  </div>
</div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-3 gap-2 lg:gap-3">
  <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-slate-50 shadow-sm">
    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 lg:mb-2 truncate"> Total Log</p>
    <p className="text-xl lg:text-3xl font-black text-slate-900">{stats.total || 0}</p>
  </div>
  <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-emerald-50 shadow-sm">
    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1 lg:mb-2 truncate"> Sukses</p>
    <p className="text-xl lg:text-3xl font-black text-emerald-600">{stats.success || 0}</p>
  </div>
  <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-rose-50 shadow-sm">
    <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-1 lg:mb-2 truncate">❌ Gagal</p>
    <p className="text-xl lg:text-3xl font-black text-rose-600">{stats.failed || 0}</p>
  </div>
</div>

      {/* BREAKDOWN BY CATEGORY */}
      {Object.keys(stats.by_category || {}).length > 0 && (
        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-slate-50 shadow-sm">
  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 lg:mb-3"> Breakdown per Kategori</p>
  <div className="flex flex-wrap gap-1.5 lg:gap-2">
    {Object.entries(stats.by_category || {}).map(([cat, count]: any) => {
      const conf = CATEGORY_CONFIG[cat] || { icon: '📌', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
      return (
        <div key={cat} className={`${conf.bg} ${conf.text} ${conf.border} border px-2 py-1 lg:px-3 lg:py-2 rounded-lg lg:rounded-xl flex items-center gap-1.5 lg:gap-2`}>
          <span className="text-xs lg:text-sm">{conf.icon}</span>
          <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest">{cat}</span>
          <span className="bg-white/60 px-1.5 py-0.5 rounded-full text-[9px] lg:text-[10px] font-black">{count}</span>
        </div>
      )
    })}
  </div>
</div>
      )}

      {/* FILTER PANEL */}
      <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-slate-50 shadow-sm space-y-2 lg:space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">🔍 Filter Riwayat</p>
          <button
            onClick={resetFilters}
            className="text-[10px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest"
          >
            ✕ Reset
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Cari nama actor / target / NRP..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-sm focus:border-[#003D79] focus:bg-white transition-all"
        />

        {/* Filter Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]"
          >
            <option value="">Semua Kategori</option>
            {Object.keys(CATEGORY_CONFIG).map(cat => (
              <option key={cat} value={cat}>{CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}</option>
            ))}
          </select>

          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]"
          >
            <option value="">Semua Aksi</option>
            {Object.keys(ACTION_LABELS).map(act => (
              <option key={act} value={act}>{ACTION_LABELS[act]}</option>
            ))}
          </select>

          <input
            type="date"
            value={filterStartDate}
            onChange={e => setFilterStartDate(e.target.value)}
            placeholder="Dari tanggal"
            className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]"
          />

          <input
            type="date"
            value={filterEndDate}
            onChange={e => setFilterEndDate(e.target.value)}
            placeholder="Sampai tanggal"
            className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]"
          />
        </div>

        <button
          onClick={() => loadLogs()}
          className="w-full py-2.5 lg:py-3 bg-[#003D79] text-white rounded-xl lg:rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-lg"
        >
          🔍 Terapkan Filter
        </button>
      </div>

      {/* LIST LOGS */}
      <div className="bg-white rounded-2xl lg:rounded-[2.5rem] border-2 border-slate-50 shadow-lg overflow-hidden">
  <div className="p-3 lg:p-5 bg-slate-50/50 border-b-2 border-slate-100 flex items-center justify-between">
    <div className="flex items-center gap-2 lg:gap-3">
      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-900 rounded-xl lg:rounded-2xl flex items-center justify-center text-base lg:text-xl">
        📜
      </div>
      <div>
        <h2 className="font-black text-slate-900 text-sm lg:text-base tracking-tight">Riwayat Aktivitas</h2>
        <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {logs.length} log terbaru
        </p>
      </div>
    </div>
  </div>

        <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-4xl mb-3 opacity-20">📭</div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Belum ada log yang cocok dengan filter
              </p>
            </div>
          ) : (
            logs.map((log: any) => {
              const conf = CATEGORY_CONFIG[log.category] || { icon: '📌', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
              const actionLabel = ACTION_LABELS[log.action] || log.action
              return (
                <button
  key={log.id}
  onClick={() => setSelectedLog(log)}
  className="w-full flex items-start gap-2.5 lg:gap-3 px-3 lg:px-5 py-3 lg:py-4 hover:bg-slate-50/70 transition-colors text-left"
>
  {/* Icon Kategori */}
  <div className={`w-9 h-9 lg:w-11 lg:h-11 ${conf.bg} ${conf.text} rounded-xl lg:rounded-2xl flex items-center justify-center text-base lg:text-lg flex-shrink-0`}>
    {conf.icon}
  </div>

                  {/* Konten */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`${conf.bg} ${conf.text} text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest`}>
                        {log.category}
                      </span>
                      {log.status === 'FAILED' && (
                        <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                          FAILED
                        </span>
                      )}
                      <p className="font-black text-sm text-slate-900 truncate">{actionLabel}</p>
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold mb-1">
                      👤 <span className="text-slate-700">{log.actor_nama || log.actor_nrp}</span>
                      {log.target_label && (
                        <>
                          <span className="text-slate-300 mx-1">→</span>
                          <span className="text-slate-700 italic">"{log.target_label}"</span>
                        </>
                      )}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      🕐 {timeAgo(log.created_at)} • {log.ip_address || '-'}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="text-slate-300 group-hover:text-[#003D79] transition-colors flex-shrink-0 mt-2">
                    →
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* MODAL DETAIL LOG */}
      {selectedLog && (
        <>
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100]" onClick={() => setSelectedLog(null)} />
          <div className="fixed inset-x-2 top-4 bottom-4 lg:inset-x-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[90%] lg:max-w-lg lg:h-[85vh] bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-br from-slate-900 to-[#003D79] text-white flex items-center gap-2 lg:gap-4">
              <div className={`w-14 h-14 ${CATEGORY_CONFIG[selectedLog.category]?.bg || 'bg-white/10'} rounded-2xl flex items-center justify-center text-2xl`}>
                {CATEGORY_CONFIG[selectedLog.category]?.icon || '📌'}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-base tracking-tight truncate">
                  {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                </h2>
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">
                  {selectedLog.category} • {formatDateTime(selectedLog.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
              
              {/* Actor Info */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">👤 Pelaku Aksi</p>
                <div className="space-y-2 text-xs">
                  <DetailRow label="Nama" value={selectedLog.actor_nama} />
                  <DetailRow label="NRP" value={selectedLog.actor_nrp} mono />
                  <DetailRow label="Role" value={selectedLog.actor_role} />
                </div>
              </div>

              {/* Target Info */}
              {(selectedLog.target_label || selectedLog.target_id) && (
                <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                  <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3">🎯 Target</p>
                  <div className="space-y-2 text-xs">
                    <DetailRow label="Tipe" value={selectedLog.target_type} />
                    <DetailRow label="Label" value={selectedLog.target_label} />
                    {selectedLog.target_id && <DetailRow label="ID" value={selectedLog.target_id} mono />}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3"> Status Hasil</p>
                <div className="space-y-2 text-xs">
                  <DetailRow label="Status" value={
                    <span className={`px-2 py-1 rounded-lg font-black text-[10px] uppercase ${
                      selectedLog.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {selectedLog.status === 'SUCCESS' ? ' SUCCESS' : '❌ FAILED'}
                    </span>
                  } />
                  {selectedLog.error_message && (
                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl">
                      <p className="text-[10px] font-black text-rose-700 uppercase mb-1">Error Message:</p>
                      <p className="text-[10px] text-rose-800 font-mono">{selectedLog.error_message}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Detail JSON */}
              {selectedLog.detail && Object.keys(selectedLog.detail).length > 0 && (
                <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3">📦 Detail Lengkap</p>
                  <pre className="text-[10px] font-mono bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap break-words">
                    {JSON.stringify(selectedLog.detail, null, 2)}
                  </pre>
                </div>
              )}

              {/* Metadata Request */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">🌐 Metadata Request</p>
                <div className="space-y-2 text-xs">
                  <DetailRow label="Waktu" value={formatDateTime(selectedLog.created_at)} />
                  <DetailRow label="IP Address" value={selectedLog.ip_address} mono />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">User Agent</p>
                    <p className="text-[10px] font-mono text-slate-600 bg-slate-50 p-2 rounded-lg break-all">
                      {selectedLog.user_agent || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Log ID */}
              <div className="text-center pt-2">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Log ID</p>
                <p className="text-[10px] font-mono text-slate-400">{selectedLog.id}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t-2 border-slate-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#003D79] active:scale-95 transition-all"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
