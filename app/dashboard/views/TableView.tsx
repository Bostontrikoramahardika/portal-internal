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

      {/* HEADER */}
      <div className="bg-[#003D79] text-white p-3 lg:p-6 rounded-2xl lg:rounded-[2.5rem]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm lg:text-2xl font-black tracking-tight">{title}</h2>
            <p className="text-blue-200 text-[9px] lg:text-xs font-bold mt-0.5">
              Monitoring & Pengelolaan Data
            </p>
          </div>
          <div className="flex gap-2">
            {/* 🆕 REFRESH BUTTON */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white/20 text-white p-2 lg:px-3 lg:py-2.5 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-xs hover:bg-white/30 active:scale-95 transition-all disabled:opacity-50"
              title="Refresh Data"
            >
              <span className={refreshing ? 'inline-block animate-spin' : ''}>🔄</span>
              <span className="hidden lg:inline ml-1">Refresh</span>
            </button>

            {canCreate && (
              <button
                onClick={() => setFormModal({ mode: 'create' })}
                className="bg-white text-[#003D79] px-3 py-2 lg:px-5 lg:py-2.5 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-xs shadow-lg hover:bg-blue-50 active:scale-95 transition-all whitespace-nowrap"
              >
                ➕ Tambah
              </button>
            )}
          </div>
        </div>
      </div>

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
              className="py-2 lg:py-2.5 px-3 rounded-lg lg:rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-[10px] lg:text-xs font-black hover:bg-rose-100 transition-all whitespace-nowrap"
            >
              ✕ Reset
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[9px] lg:text-[10px] font-bold text-slate-400">
            Menampilkan <span className="text-[#003D79] font-black">{displayRows.length}</span> dari {rows.length} data
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
      <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
        <table className="w-full text-left text-[11px] lg:text-xs">
          <thead className="bg-[#003D79] text-white sticky top-0 z-10 shadow-md">
            <tr>
              {columns.map((c: string) => (
                <th 
                  key={c} 
                  className="px-2.5 py-1.5 lg:px-4 lg:py-2 font-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-[#002D5F] transition-colors select-none text-[10px] lg:text-[11px]"
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
              <th className="px-2.5 py-1.5 lg:px-4 lg:py-2 font-black uppercase tracking-wider text-center whitespace-nowrap text-[10px] lg:text-[11px]">
                Aksi
              </th>
            </tr>
            {/* FILTER ROW per column */}
            <tr className="bg-blue-50">
              {columns.map((c: string) => (
                <th key={`filter-${c}`} className="px-1.5 py-1 lg:px-2 lg:py-1.5">
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
              <th className="px-1.5 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {dataRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-6 lg:py-8 text-center text-slate-300 font-black uppercase tracking-widest text-[11px] italic">
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
                {columns.map((c: string) => (
                  <td key={c} className="px-2.5 py-1.5 lg:px-4 lg:py-2 whitespace-nowrap font-medium text-slate-700 text-[11px] lg:text-xs">
                    {renderCell(c, r[c])}
                  </td>
                ))}
                <td className="px-2.5 py-1.5 lg:px-4 lg:py-2 whitespace-nowrap">
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
        {renderTable(activeRows, ' Karyawan Aktif', 'bg-emerald-600')}
        
        {/* SECTION RESIGN */}
        {resignRows.length > 0 && renderTable(resignRows, '🚪 Karyawan Resign', 'bg-rose-500')}
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
