'use client'

// TableView - dipisah dari app/dashboard/page.tsx (tahap 2)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import ApprovalCenterExact from '../components/ApprovalCenterExact';
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { getTablePermissions } from '@/app/lib/tablePermissions'
import { saveOfflineAttendance } from '@/app/lib/offlineDB'
import KoreksiBadge from '../components/KoreksiBadge'
import { CrudModal, ResignModal, UpdateExpiredModal, formatColumnName, renderCell } from './_fields2'
import StatBanner from '@/app/components/std/StatBanner'

export default function TableView({ data, onReload }: any) {
  const { title, rows = [], columns = [], table, access_mode } = data
  const [formModal, setFormModal] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSite, setFilterSite] = useState('ALL')
  const [filterStatusAbsensi, setFilterStatusAbsensi] = useState('ALL')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [refreshing, setRefreshing] = useState(false)
  const isApproval = access_mode?.includes('APPROVAL')

  // ---- RESPONSIF: kolom menyesuaikan lebar layar ----
  const KOLOM_RAHASIA = [
    'google_refresh_token', 'google_access_token', 'last_signature',
    'google_connected_at', 'google_access_enabled', 'password', 'password_hash',
  ]
  const KOLOM_RINGKAS = 4
  const [layarSempit, setLayarSempit] = useState(false)
  const [semuaKolom, setSemuaKolom] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const ubah = () => setLayarSempit(mq.matches)
    ubah()
    mq.addEventListener('change', ubah)
    return () => mq.removeEventListener('change', ubah)
  }, [])

  const KOLOM_PRIORITAS = [
    'nama', 'nrp', 'jabatan', 'status', 'jenis',
    'site', 'departemen', 'unit', 'tanggal', 'keterangan',
  ]

  const kolomBersih = (columns || []).filter((c: string) => !KOLOM_RAHASIA.includes(c))

  const pilih = (() => {
    const hasil: string[] = []
    const cocok = (c: string, k: string) => {
      const n = String(c).toLowerCase()
      return n === k || n.includes(k)
    }
    for (const kunci of KOLOM_PRIORITAS) {
      if (hasil.length >= KOLOM_RINGKAS) break
      const tepat = kolomBersih.find((c: string) => String(c).toLowerCase() === kunci && !hasil.includes(c))
      const mirip = kolomBersih.find((c: string) => cocok(c, kunci) && !hasil.includes(c))
      const pick = tepat || mirip
      if (pick) hasil.push(pick)
    }
    for (const c of kolomBersih) {
      if (hasil.length >= KOLOM_RINGKAS) break
      if (!hasil.includes(c)) hasil.push(c)
    }
    return hasil
  })()

  const kolomRingkasUrut = kolomBersih.filter((c: string) => pilih.includes(c))

  const kolomTampil =
    layarSempit && !semuaKolom ? kolomRingkasUrut : kolomBersih
  const kolomTersembunyi = kolomBersih.length - kolomTampil.length

  // 🔐 Hook Auth
  const { can, isSuperAdmin } = useAuth()

  const tablePerms = getTablePermissions(table)
  const VIRTUAL_TABLES = ['monitoring_expired']
  const isVirtualTable = VIRTUAL_TABLES.includes(table) || access_mode === 'VIEW_ONLY'
  const hasSchema = isVirtualTable ? false : (tablePerms?.has_schema !== false)

  const canCreate = isSuperAdmin || (hasSchema && (
    tablePerms?.create ? can(tablePerms.create) : (access_mode === 'CRUD')
  ))
  const canEdit = isSuperAdmin || (hasSchema && (
    tablePerms?.edit ? can(tablePerms.edit) : (access_mode === 'CRUD')
  ))
  const canDelete = access_mode !== 'VIEW_ONLY' && (
    tablePerms?.delete ? can(tablePerms.delete) : (access_mode === 'CRUD' || isSuperAdmin)
  )
  const canApprove = (() => {
    if (isSuperAdmin) return true
    if (!isApproval) return false
    if (table === 'leave_requests') return can('cuti_approve_atasan') || can('cuti_approve_pjo')
    if (table === 'overtime_requests') return can('lembur_approve_atasan') || can('lembur_approve_pjo')
    if (table === 'attendance_evidences') return can('sakit_approve')
    return true
  })()

  // 🆕 SORT HANDLER
  const handleSort = (columnKey: string) => {
    if (sortConfig?.key === columnKey) {
      // Cycle: asc -> desc -> null
      if (sortConfig.direction === 'asc') {
        setSortConfig({ key: columnKey, direction: 'desc' })
      } else {
        setSortConfig(null)
      }
    } else {
      setSortConfig({ key: columnKey, direction: 'asc' })
    }
  }

  // 🆕 COLUMN FILTER HANDLER
  const handleColumnFilter = (columnKey: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [columnKey]: value }))
  }

  // 🆕 REFRESH HANDLER
  const handleRefresh = async () => {
    setRefreshing(true)
    await onReload()
    setTimeout(() => setRefreshing(false), 500)
  }

  // 🆕 SITE LIST (untuk semua tabel, bukan cuma attendance)
  const siteList = Array.from(new Set(
    (rows || [])
      .map((r: any) => r.site || r._site)
      .filter(Boolean)
  )).sort() as string[]
  const hasSiteColumn = siteList.length > 0 && (columns.includes('site') || columns.includes('_site'))

  // 🎯 APPLY FILTERS + SORT
  const displayRows = (() => {
    let result = rows.filter((r: any) => {
      // Search global
      const matchSearch = !searchTerm || Object.values(r).some((val) =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
      if (!matchSearch) return false

      // Filter site (untuk semua tabel yang punya kolom site)
      if (filterSite !== 'ALL' && hasSiteColumn) {
        const rowSite = String(r.site || r._site || '')
        if (rowSite !== filterSite) return false
      }

      // Filter status absensi
      if (table === 'attendance' && filterStatusAbsensi !== 'ALL') {
        const status = String(r.status || r.keterangan || '').toUpperCase()
        if (!status.includes(filterStatusAbsensi)) return false
      }

      // Filter per kolom
      for (const [key, filterVal] of Object.entries(columnFilters)) {
        if (!filterVal) continue
        const cellVal = String(r[key] ?? '').toLowerCase()
        if (!cellVal.includes(filterVal.toLowerCase())) return false
      }

      return true
    })

    // 🆕 SORT
    if (sortConfig) {
      result = [...result].sort((a: any, b: any) => {
        const aVal = a[sortConfig.key]
        const bVal = b[sortConfig.key]
        
        // Handle null/undefined
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return sortConfig.direction === 'asc' ? 1 : -1
        if (bVal == null) return sortConfig.direction === 'asc' ? -1 : 1

        // Numeric sort
        const aNum = Number(aVal)
        const bNum = Number(bVal)
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum
        }

        // Date sort
        const aDate = new Date(aVal)
        const bDate = new Date(bVal)
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          return sortConfig.direction === 'asc' 
            ? aDate.getTime() - bDate.getTime() 
            : bDate.getTime() - aDate.getTime()
        }

        // String sort
        const cmp = String(aVal).localeCompare(String(bVal), 'id')
        return sortConfig.direction === 'asc' ? cmp : -cmp
      })
    }

    return result
  })()

  async function handleApprove(id: string, action: string) {
    const note = action === 'REJECTED' ? prompt('Alasan Penolakan:') : 'OK'
    if (!note && action === 'REJECTED') return
    const endpoint =
      table === 'leave_requests' ? 'leave' :
      table === 'overtime_requests' ? 'overtime' : 'attendance'
    const key =
      table === 'leave_requests' ? 'leave_id' :
      table === 'overtime_requests' ? 'overtime_id' : 'id'
    const res = await fetch(`/api/${endpoint}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: id, action, catatan: note })
    })
    if (res.ok) { alert(' Berhasil diproses'); onReload() }
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(` Hapus data "${label || id}"?`)) return
    const url = `/api/crud?table=${encodeURIComponent(table)}&id=${encodeURIComponent(id)}`
    const res = await fetch(url, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) { 
      alert(' Terhapus')
      onReload()
    } else {
      alert('❌ Gagal hapus: ' + (data.error || 'Unknown error'))
    }
  }

  // 🆕 CLEAR ALL FILTERS
  const hasActiveFilters = searchTerm || filterSite !== 'ALL' || filterStatusAbsensi !== 'ALL' || 
                           Object.values(columnFilters).some(v => v) || sortConfig
  const clearFilters = () => {
    setSearchTerm('')
    setFilterSite('ALL')
    setFilterStatusAbsensi('ALL')
    setColumnFilters({})
    setSortConfig(null)
  }

  return (
    <div className="space-y-2 lg:space-y-4 animate-in fade-in duration-500">

      {/* HEADER - STD UI Kit (acuan Approval Center) */}
      <StatBanner
        eyebrow={String(table || 'DATA').replace(/_/g, ' ').toUpperCase()}
        title={title}
        subtitle={displayRows.length + ' dari ' + rows.length + ' data'}
        onRefresh={canCreate ? undefined : handleRefresh}
        refreshing={refreshing}
        right={
          canCreate ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label="Muat ulang"
                className="h-9 w-9 shrink-0 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? 'animate-spin' : ''}>
                  <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
              <button
                onClick={() => setFormModal({ mode: 'create' })}
                className="h-9 px-3 shrink-0 rounded-xl bg-white text-[#0b2a5b] font-black text-[11px] uppercase tracking-wide shadow hover:bg-blue-50 active:scale-95 transition-all whitespace-nowrap"
              >
                + Tambah
              </button>
            </div>
          ) : undefined
        }
      />

      {/* SEARCH & FILTER */}
      <div className="bg-white rounded-xl lg:rounded-2xl p-2.5 lg:p-4 border border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-1.5 lg:gap-2">

          {/* Search */}
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Cari data..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-7 lg:pl-8 py-2 lg:py-2.5 pr-3 rounded-lg lg:rounded-2xl border border-slate-200 text-[11px] lg:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79]"
            />
          </div>

          {/* 🆕 Filter Site (untuk semua tabel yang punya kolom site) */}
          {hasSiteColumn && (
            <select
              value={filterSite}
              onChange={e => setFilterSite(e.target.value)}
              className="py-2 lg:py-2.5 px-2.5 lg:px-3 rounded-lg lg:rounded-2xl border border-slate-200 text-[11px] lg:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 bg-white min-w-[110px] lg:min-w-[130px]"
            >
              <option value="ALL">🏢 Semua Site</option>
              {siteList.map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          {/* Filter Status Absensi */}
          {table === 'attendance' && (
            <select
              value={filterStatusAbsensi}
              onChange={e => setFilterStatusAbsensi(e.target.value)}
              className="py-2 lg:py-2.5 px-2.5 lg:px-3 rounded-lg lg:rounded-2xl border border-slate-200 text-[11px] lg:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 bg-white min-w-[115px] lg:min-w-[130px]"
            >
              <option value="ALL">🎛️ Semua Status</option>
              <option value="TERLAMBAT"> Terlambat</option>
              <option value="SUKSES"> Tepat Waktu</option>
            </select>
          )}

          {/* 🆕 CLEAR FILTERS */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="self-end lg:self-auto py-2 lg:py-2.5 px-3 rounded-lg lg:rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-[10px] lg:text-xs font-black hover:bg-rose-100 transition-all whitespace-nowrap"
            >
              ✕ Reset
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[9px] lg:text-[10px] font-bold text-slate-400">
            {hasActiveFilters ? 'Hasil tersaring' : 'Semua data'}
          </p>
          {sortConfig && (
            <p className="text-[9px] lg:text-[10px] font-bold text-blue-600">
              Sorted by: <span className="font-black">{formatColumnName(sortConfig.key)}</span> ({sortConfig.direction === 'asc' ? '↑' : '↓'})
            </p>
          )}
        </div>
      </div>

      {/* TABEL — v3.1 Split Section + Zebra + Compact */}
{(() => {
  // 🆕 Split rows: Aktif vs Resign (khusus employees)
  const isEmployeesTable = table === 'employees'
  const activeRows = isEmployeesTable 
    ? displayRows.filter((r: any) => !r.tanggal_resign)
    : displayRows
  const resignRows = isEmployeesTable 
    ? displayRows.filter((r: any) => r.tanggal_resign)
    : []

  // Reusable Table Renderer
  const renderTable = (dataRows: any[], sectionTitle?: string, sectionColor?: string) => (
    <div className="bg-white rounded-xl lg:rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
      {sectionTitle && (
        <div className={`px-4 py-2 lg:px-5 lg:py-2.5 ${sectionColor} border-b border-slate-100 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <span className="text-white font-black text-xs lg:text-sm uppercase tracking-wider">
              {sectionTitle}
            </span>
            <span className="bg-white/25 text-white text-[10px] lg:text-xs font-black px-2 py-0.5 rounded-full">
              {dataRows.length}
            </span>
          </div>
        </div>
      )}
      {/* STDTABLE: geser horizontal + kolom pertama dipaku */}
      <div className="relative">
        <div className="pointer-events-none absolute top-0 right-0 h-full w-6 z-20 bg-gradient-to-l from-slate-900/10 to-transparent lg:hidden" />
        <div className="lg:hidden flex items-center justify-between gap-2 px-3 pt-2 pb-1">
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" />
            </svg>
            Geser untuk kolom lain
          </span>
          {(kolomTersembunyi > 0 || semuaKolom) && (
            <button
              type="button"
              onClick={() => setSemuaKolom(v => !v)}
              className="shrink-0 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[9px] font-black uppercase tracking-wider text-[#0b2a5b] active:scale-95"
            >
              {semuaKolom ? 'Ringkas' : '+' + kolomTersembunyi + ' kolom'}
            </button>
          )}
        </div>
      <div className="std-scroll-x overflow-x-auto overflow-y-auto max-h-[60vh] pb-1">
        <table className="w-full text-left text-[11px] lg:text-xs">
          <thead className="bg-[#003D79] text-white sticky top-0 z-40 shadow-md">
            <tr>
              {kolomTampil.map((c: string, ci: number) => (
                <th 
                  key={c} 
                  className={'px-2.5 py-1.5 lg:px-4 lg:py-2 font-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-[#002D5F] transition-colors select-none text-[10px] lg:text-[11px] ' + (ci === 0 ? 'sticky left-0 z-30 bg-[#003D79] shadow-[2px_0_4px_rgba(0,0,0,0.18)]' : '')}
                  onClick={() => handleSort(c)}
                >
                  <div className="flex items-center gap-1">
                    <span>{formatColumnName(c)}</span>
                    <span className="text-blue-300 text-[9px]">
                      {sortConfig?.key === c 
                        ? (sortConfig.direction === 'asc' ? '↑' : '↓')
                        : '⇅'}
                    </span>
                  </div>
                </th>
              ))}
              <th className="px-2.5 py-1.5 lg:px-4 lg:py-2 font-black uppercase tracking-wider text-center whitespace-nowrap text-[10px] lg:text-[11px] sticky right-0 z-40 bg-[#003D79] shadow-[-2px_0_4px_rgba(0,0,0,0.18)]">
                Aksi
              </th>
            </tr>
            {/* FILTER ROW per column */}
            <tr className="bg-blue-50">
              {kolomTampil.map((c: string, ci: number) => (
                <th
                  key={`filter-${c}`}
                  className={'px-1.5 py-1 lg:px-2 lg:py-1.5 ' + (ci === 0 ? 'sticky left-0 z-30 bg-blue-50 shadow-[2px_0_4px_rgba(0,0,0,0.12)]' : '')}
                >
                  <input
                    type="text"
                    placeholder={`Filter...`}
                    value={columnFilters[c] || ''}
                    onChange={e => handleColumnFilter(c, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className="w-full px-1.5 py-0.5 rounded text-[10px] font-medium bg-white border border-blue-200 focus:outline-none focus:ring-1 focus:ring-[#003D79] focus:border-[#003D79] text-slate-700 placeholder:text-slate-300"
                  />
                </th>
              ))}
              <th className="px-1.5 py-1 sticky right-0 z-40 bg-blue-50 shadow-[-2px_0_4px_rgba(0,0,0,0.12)]"></th>
            </tr>
          </thead>
          <tbody>
            {dataRows.length === 0 ? (
              <tr>
                <td colSpan={kolomTampil.length + 1} className="px-4 py-6 lg:py-8 text-center text-slate-300 font-black uppercase tracking-widest text-[11px] italic">
                  Tidak ada data
                </td>
              </tr>
            ) : dataRows.map((r: any, i: number) => (
              <tr 
                key={i} 
                className={`transition-all hover:bg-blue-50 ${
                  i % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                }`}
              >
                {kolomTampil.map((c: string, ci: number) => (
                  <td
                    key={c}
                    className={
                      'px-2.5 py-1.5 lg:px-4 lg:py-2 whitespace-nowrap font-medium text-slate-700 text-[11px] lg:text-xs ' +
                      (ci === 0
                        ? 'sticky left-0 z-10 font-bold shadow-[2px_0_4px_rgba(0,0,0,0.06)] ' +
                          (i % 2 === 0 ? 'bg-white' : 'bg-slate-50')
                        : '')
                    }
                  >
                    {renderCell(c, r[c])}
                  </td>
                ))}
                <td className={'px-2.5 py-1.5 lg:px-4 lg:py-2 whitespace-nowrap sticky right-0 z-10 shadow-[-2px_0_4px_rgba(0,0,0,0.06)] ' + (i % 2 === 0 ? 'bg-white' : 'bg-slate-50')}>
                  <div className="flex justify-center gap-1 lg:gap-1.5">

                    {r.foto_url && (
                      <button
                        onClick={() => window.open(r.foto_url, '_blank')}
                        className="bg-indigo-500 text-white px-2 py-1 rounded text-[9px] lg:text-[10px] font-black hover:bg-indigo-600 shadow-sm"
                      >
                        📷
                      </button>
                    )}

                    {/* Tombol khusus monitoring_expired */}
                    {table === 'monitoring_expired' && r.jenis_dokumen && (
                      <>
                        <button
                          onClick={() => setFormModal({ mode: 'update_expired', row: r })}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-[9px] lg:text-[10px] font-black hover:bg-blue-700 shadow-sm"
                        >
                          🔄
                        </button>
                        <button
                          onClick={async () => {
                            const jenis = r.jenis_dokumen
                            const nama = r.nama_karyawan || r.nama
                            if (!confirm(` Hapus dokumen ${jenis} milik ${nama}?`)) return
                            const res = await fetch('/api/monitoring-expired', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                jenis_dokumen: jenis,
                                record_id: jenis === 'SIMPOL' ? r.nrp : r.id,
                                nama_karyawan: nama
                              })
                            })
                            const json = await res.json()
                            if (res.ok) {
                              alert(json.message || ' Berhasil dihapus')
                              window.dispatchEvent(new Event('refreshNotif'))
                              onReload()
                            } else {
                              alert('❌ Gagal: ' + (json.error || 'Unknown'))
                            }
                          }}
                          className="bg-rose-500 text-white px-2 py-1 rounded text-[9px] lg:text-[10px] font-black hover:bg-rose-600 shadow-sm"
                        >
                          🗑️
                        </button>
                      </>
                    )}

                    {/* Tombol Edit & Hapus umum */}
                    {table !== 'monitoring_expired' && canEdit && !isApproval && (
                      <>
                        {/* Tombol Resign khusus employees */}
                        {table === 'employees' && !r.tanggal_resign && (
                          <button
                            onClick={() => setFormModal({ mode: 'resign', row: r })}
                            className="bg-orange-500 text-white px-2 py-1 rounded text-[9px] lg:text-[10px] font-black hover:bg-orange-600 shadow-sm"
                            title="Resign"
                          >
                            🚪
                          </button>
                        )}
                        
                        {/* Tombol Aktifkan */}
                        {table === 'employees' && r.tanggal_resign && (
                          <button
                            onClick={() => setFormModal({ mode: 'unresign', row: r })}
                            className="bg-emerald-500 text-white px-2 py-1 rounded text-[9px] lg:text-[10px] font-black hover:bg-emerald-600 shadow-sm"
                            title="Aktifkan"
                          >
                            ↩️
                          </button>
                        )}

                        <button
                          onClick={() => setFormModal({ mode: 'edit', row: r })}
                          className="bg-amber-500 text-white px-2 py-1 rounded text-[9px] lg:text-[10px] font-black hover:bg-amber-600 shadow-sm"
                          title="Edit"
                        >
                          ✏️
                        </button>
                      </>
                    )}
                    {table !== 'monitoring_expired' && canDelete && !isApproval && (
                      <button
                        onClick={() => handleDelete(r.id, r.nama || r._nama_karyawan || r.id)}
                        className="bg-rose-500 text-white px-2 py-1 rounded text-[9px] lg:text-[10px] font-black hover:bg-rose-600 shadow-sm"
                        title="Hapus"
                      >
                        🗑️
                      </button>
                    )}

                    {canApprove && r.status_atasan === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(r.id, 'APPROVED')}
                          className="bg-emerald-500 text-white px-2 py-1 rounded text-[9px] lg:text-[10px] font-black hover:bg-emerald-600 shadow-sm"
                        >
                          
                        </button>
                        <button
                          onClick={() => handleApprove(r.id, 'REJECTED')}
                          className="bg-rose-500 text-white px-2 py-1 rounded text-[9px] lg:text-[10px] font-black hover:bg-rose-600 shadow-sm"
                        >
                          ❌
                        </button>
                      </>
                    )}

                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
      {dataRows.length > 0 && (
        <div className="px-3 py-1.5 lg:px-4 lg:py-2 border-t border-slate-100 bg-slate-50">
          <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider">
            {dataRows.length} Data
          </p>
        </div>
      )}
    </div>
  )

  // 🎨 Render: Split untuk employees, Single untuk tabel lain
  if (isEmployeesTable) {
    return (
      <div className="space-y-3 lg:space-y-4">
        {/* SECTION AKTIF */}
        {renderTable(activeRows, 'Karyawan Aktif', 'bg-[#0b2a5b]')}
        
        {/* SECTION RESIGN */}
        {resignRows.length > 0 && renderTable(resignRows, 'Karyawan Resign', 'bg-slate-500')}
      </div>
    )
  }

  return renderTable(displayRows)
})()}

      {formModal && formModal.mode !== 'update_expired' && (
        <CrudModal
          table={table}
          mode={formModal.mode}
          row={formModal.row}
          onClose={() => setFormModal(null)}
          onSuccess={() => { setFormModal(null); onReload() }}
        />
      )}

      {/* 🆕 Modal Resign */}
{formModal && (formModal.mode === 'resign' || formModal.mode === 'unresign') && (
  <ResignModal
    row={formModal.row}
    mode={formModal.mode}
    onClose={() => setFormModal(null)}
    onSuccess={() => { setFormModal(null); onReload() }}
  />
)}

      {formModal && formModal.mode === 'update_expired' && (
        <UpdateExpiredModal
          row={formModal.row}
          onClose={() => setFormModal(null)}
          onSuccess={() => { setFormModal(null); onReload(); window.dispatchEvent(new Event('refreshNotif')) }}
        />
      )}
    </div>
  )
}
