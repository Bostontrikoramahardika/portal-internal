'use client'

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE TABLE v1.0 - Extracted from page.tsx
// - Full-featured table dengan filter, sort, CRUD, resign
// - Dipakai di HR Dashboard tab Karyawan
// - Zero perubahan di page.tsx (aman untuk production)
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/lib/AuthContext'
import { getTablePermissions } from '@/app/lib/tablePermissions'

// ═══════════════════════════════════════════════════════════════
// HELPER: Status Badge
// ═══════════════════════════════════════════════════════════════
function StatusBadge({ value }: any) {
  const m: any = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    DISETUJUI: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    HADIR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    TERLAMBAT: 'bg-amber-50 text-amber-700 border-amber-200',
    Aktif: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Nonaktif: 'bg-slate-100 text-slate-500 border-slate-200'
  }
  return (
    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${m[value] || 'bg-slate-50 text-slate-400 border-slate-100'}`}>
      {value}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Format nama kolom (translation)
// ═══════════════════════════════════════════════════════════════
function formatColumnName(col: string) {
  const special: any = {
    _nama_karyawan: '👤 Karyawan',
    _jabatan: 'Jabatan',
    _site: 'Site',
    _departemen: 'Dept',
    nrp: 'NRP',
    clock_in: 'Masuk',
    clock_out: 'Pulang',
    status_atasan: 'Atasan',
    status_pjo: 'PJO',
    status_final: 'Status',
    _masa_kerja: 'Masa Kerja',
    _status: 'Status',
    tanggal_resign: 'Tgl Resign',
    alasan_resign: 'Alasan Resign',
    tanggal_masuk: 'Tgl Masuk'
  }
  return special[col] || col.replace(/_/g, ' ').toUpperCase()
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Render Cell Value
// ═══════════════════════════════════════════════════════════════
function renderCell(col: string, val: any) {
  if (val === null || val === undefined) {
    return <span className="text-slate-200 italic font-bold text-[10px]">EMPTY</span>
  }
  if (typeof val === 'boolean') {
    return val 
      ? <span className="text-emerald-500 font-black">YES</span>
      : <span className="text-slate-300 font-black">NO</span>
  }
  if (col.includes('status')) return <StatusBadge value={String(val)} />
  if (col === 'persen') return <span className="font-black text-slate-900">{val}%</span>
  if (col.includes('tanggal') && !col.includes('jam')) {
    try {
      return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return String(val)
    }
  }
  if (col.includes('foto') || col === 'image_url') {
    return <a href={val} target="_blank" className="text-blue-600 font-black uppercase text-[9px] underline tracking-widest">👁️ DOKUMEN</a>
  }
  return String(val)
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT: EmployeeTable
// ═══════════════════════════════════════════════════════════════
export default function EmployeeTable({ menuKey = 'kelola_karyawan' }: { menuKey?: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/data?menu=${menuKey}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Gagal memuat data')
        return
      }
      setData(json)
    } catch {
      setError('Kesalahan koneksi server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [menuKey])

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 animate-pulse">📊</div>
        <div className="text-slate-500 text-sm font-bold">Memuat data karyawan...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16 px-6">
        <div className="text-4xl mb-3">⚠️</div>
        <div className="text-rose-500 font-bold text-sm mb-3">{error}</div>
        <button onClick={loadData} className="px-4 py-2 bg-[#003D79] text-white text-sm font-bold rounded-full">
          Coba Lagi
        </button>
      </div>
    )
  }

  if (!data) return null

  return <TableView data={data} onReload={loadData} />
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT: TableView (Full-featured, extracted from page.tsx)
// ═══════════════════════════════════════════════════════════════
function TableView({ data, onReload }: any) {
  const { title, rows = [], columns = [], table, access_mode } = data
  const [formModal, setFormModal] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSite, setFilterSite] = useState('ALL')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [refreshing, setRefreshing] = useState(false)

  const { can, isSuperAdmin } = useAuth()
  const tablePerms = getTablePermissions(table)
  const hasSchema = tablePerms?.has_schema !== false

  const canCreate = isSuperAdmin || (hasSchema && (
    tablePerms?.create ? can(tablePerms.create) : (access_mode === 'CRUD')
  ))
  const canEdit = isSuperAdmin || (hasSchema && (
    tablePerms?.edit ? can(tablePerms.edit) : (access_mode === 'CRUD')
  ))
  const canDelete = access_mode !== 'VIEW_ONLY' && (
    tablePerms?.delete ? can(tablePerms.delete) : (access_mode === 'CRUD' || isSuperAdmin)
  )

  // SORT HANDLER
  const handleSort = (columnKey: string) => {
    if (sortConfig?.key === columnKey) {
      if (sortConfig.direction === 'asc') {
        setSortConfig({ key: columnKey, direction: 'desc' })
      } else {
        setSortConfig(null)
      }
    } else {
      setSortConfig({ key: columnKey, direction: 'asc' })
    }
  }

  const handleColumnFilter = (columnKey: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [columnKey]: value }))
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await onReload()
    setTimeout(() => setRefreshing(false), 500)
  }

  // SITE LIST
  const siteList = Array.from(new Set(
    (rows || []).map((r: any) => r.site || r._site).filter(Boolean)
  )).sort() as string[]
  const hasSiteColumn = siteList.length > 0 && (columns.includes('site') || columns.includes('_site'))

  // APPLY FILTERS + SORT
  const displayRows = (() => {
    let result = rows.filter((r: any) => {
      const matchSearch = !searchTerm || Object.values(r).some((val) =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
      if (!matchSearch) return false

      if (filterSite !== 'ALL' && hasSiteColumn) {
        const rowSite = String(r.site || r._site || '')
        if (rowSite !== filterSite) return false
      }

      for (const [key, filterVal] of Object.entries(columnFilters)) {
        if (!filterVal) continue
        const cellVal = String(r[key] ?? '').toLowerCase()
        if (!cellVal.includes(filterVal.toLowerCase())) return false
      }

      return true
    })

    if (sortConfig) {
      result = [...result].sort((a: any, b: any) => {
        const aVal = a[sortConfig.key]
        const bVal = b[sortConfig.key]
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return sortConfig.direction === 'asc' ? 1 : -1
        if (bVal == null) return sortConfig.direction === 'asc' ? -1 : 1

        const aNum = Number(aVal)
        const bNum = Number(bVal)
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum
        }

        const aDate = new Date(aVal)
        const bDate = new Date(bVal)
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          return sortConfig.direction === 'asc' 
            ? aDate.getTime() - bDate.getTime() 
            : bDate.getTime() - aDate.getTime()
        }

        const cmp = String(aVal).localeCompare(String(bVal), 'id')
        return sortConfig.direction === 'asc' ? cmp : -cmp
      })
    }

    return result
  })()

  async function handleDelete(id: string, label: string) {
    if (!confirm(`⚠️ Hapus data "${label || id}"?`)) return
    const url = `/api/crud?table=${encodeURIComponent(table)}&id=${encodeURIComponent(id)}`
    const res = await fetch(url, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      alert('✅ Terhapus')
      onReload()
    } else {
      alert('❌ Gagal hapus: ' + (data.error || 'Unknown error'))
    }
  }

  const hasActiveFilters = searchTerm || filterSite !== 'ALL' ||
                           Object.values(columnFilters).some(v => v) || sortConfig
  const clearFilters = () => {
    setSearchTerm('')
    setFilterSite('ALL')
    setColumnFilters({})
    setSortConfig(null)
  }

  // Split Aktif vs Resign
  const isEmployeesTable = table === 'employees'
  const activeRows = isEmployeesTable
    ? displayRows.filter((r: any) => !r.tanggal_resign)
    : displayRows
  const resignRows = isEmployeesTable
    ? displayRows.filter((r: any) => r.tanggal_resign)
    : []

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
                      {sortConfig?.key === c ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                    </span>
                  </div>
                </th>
              ))}
              <th className="px-2.5 py-1.5 lg:px-4 lg:py-2 font-black uppercase tracking-wider text-center whitespace-nowrap text-[10px] lg:text-[11px]">
                Aksi
              </th>
            </tr>
            <tr className="bg-blue-50">
              {columns.map((c: string) => (
                <th key={`filter-${c}`} className="px-1.5 py-1 lg:px-2 lg:py-1.5">
                  <input
                    type="text"
                    placeholder="Filter..."
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
              <tr key={i} className={`transition-all hover:bg-blue-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                {columns.map((c: string) => (
                  <td key={c} className="px-2.5 py-1.5 lg:px-4 lg:py-2 whitespace-nowrap font-medium text-slate-700 text-[11px] lg:text-xs">
                    {renderCell(c, r[c])}
                  </td>
                ))}
                <td className="px-2.5 py-1.5 lg:px-4 lg:py-2 whitespace-nowrap">
                  <div className="flex justify-center gap-1 lg:gap-1.5">
                    {canEdit && (
                      <>
                        {table === 'employees' && !r.tanggal_resign && (
                          <button
                            onClick={() => setFormModal({ mode: 'resign', row: r })}
                            className="bg-orange-500 text-white px-2 py-1 rounded text-[9px] lg:text-[10px] font-black hover:bg-orange-600 shadow-sm"
                            title="Resign"
                          >
                            🚪
                          </button>
                        )}
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
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(r.id, r.nama || r._nama_karyawan || r.id)}
                        className="bg-rose-500 text-white px-2 py-1 rounded text-[9px] lg:text-[10px] font-black hover:bg-rose-600 shadow-sm"
                        title="Hapus"
                      >
                        🗑️
                      </button>
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

  return (
    <div className="space-y-2 lg:space-y-4">
      {/* SEARCH & FILTER + TOMBOL TAMBAH */}
      <div className="bg-white rounded-xl lg:rounded-2xl p-2.5 lg:p-4 border border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-1.5 lg:gap-2">
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

          {hasSiteColumn && (
            <select
              value={filterSite}
              onChange={e => setFilterSite(e.target.value)}
              className="py-2 lg:py-2.5 px-2.5 lg:px-3 rounded-lg lg:rounded-2xl border border-slate-200 text-[11px] lg:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 bg-white min-w-[110px] lg:min-w-[130px]"
            >
              <option value="ALL">🏢 Semua Site</option>
              {siteList.map((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="py-2 lg:py-2.5 px-3 rounded-lg lg:rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-[10px] lg:text-xs font-black hover:bg-rose-100 transition-all whitespace-nowrap"
            >
              ✕ Reset
            </button>
          )}

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="py-2 lg:py-2.5 px-3 rounded-lg lg:rounded-2xl bg-slate-100 text-slate-700 text-[10px] lg:text-xs font-black hover:bg-slate-200 transition-all whitespace-nowrap"
            title="Refresh"
          >
            <span className={refreshing ? 'inline-block animate-spin' : ''}>🔄</span>
          </button>

          {canCreate && (
            <button
              onClick={() => setFormModal({ mode: 'create' })}
              className="py-2 lg:py-2.5 px-4 rounded-lg lg:rounded-2xl bg-emerald-500 text-white text-[10px] lg:text-xs font-black hover:bg-emerald-600 shadow-md whitespace-nowrap"
            >
              ➕ Tambah Karyawan
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

      {/* TABEL */}
      {isEmployeesTable ? (
        <div className="space-y-3 lg:space-y-4">
          {renderTable(activeRows, '✅ Karyawan Aktif', 'bg-emerald-600')}
          {resignRows.length > 0 && renderTable(resignRows, '🚪 Karyawan Resign', 'bg-rose-500')}
        </div>
      ) : renderTable(displayRows)}

      {/* MODAL CRUD */}
      {formModal && (formModal.mode === 'create' || formModal.mode === 'edit') && (
        <CrudModal
          table={table}
          mode={formModal.mode}
          row={formModal.row}
          onClose={() => setFormModal(null)}
          onSuccess={() => { setFormModal(null); onReload() }}
        />
      )}

      {/* MODAL RESIGN */}
      {formModal && (formModal.mode === 'resign' || formModal.mode === 'unresign') && (
        <ResignModal
          row={formModal.row}
          mode={formModal.mode}
          onClose={() => setFormModal(null)}
          onSuccess={() => { setFormModal(null); onReload() }}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: CRUD (Create/Edit)
// ═══════════════════════════════════════════════════════════════
function CrudModal({ table, mode, row, onClose, onSuccess }: any) {
  const [fields, setFields] = useState<any[]>([])
  const [values, setValues] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/schema?table=${table}`)
      .then(r => r.json())
      .then(d => {
        if (d.error || !Array.isArray(d.fields)) { onClose(); return }
        setFields(d.fields)
        const init: any = {}
        d.fields.forEach((f: any) => {
          let v = (row && row[f.key] !== undefined) ? row[f.key] : ''
          if (f.type === 'date' && v) v = String(v).split('T')[0]
          init[f.key] = v ?? ''
        })
        setValues(init)
        setLoading(false)
      })
  }, [table, mode, row])

  async function handleSubmit(e: any) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = mode === 'create' ? { table, values } : { table, id: row.id, values }
      const res = await fetch('/api/crud', {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const resData = await res.json()
      if (res.ok) {
        alert("✅ Data Berhasil Disimpan!")
        onSuccess()
      } else {
        alert("❌ Gagal: " + (resData.error || 'Terjadi kesalahan'))
      }
    } catch (err) {
      alert("❌ Kesalahan Koneksi Server")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[99] flex items-center justify-center font-black text-white tracking-widest uppercase animate-pulse">
        Memuat Form...
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[99] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-4 border-white">
        <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-black text-2xl text-slate-900 tracking-tight">
              {mode === 'create' ? '➕ Input Data Baru' : '✏️ Perbarui Data'}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Tabel: {table}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border-2 border-slate-100 text-2xl text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                {f.label}{f.required && <span className="text-rose-500 ml-1">*</span>}
              </label>
              {f.type === 'select' ? (
                <select
                  value={values[f.key] || ''}
                  onChange={e => setValues({ ...values, [f.key]: e.target.value })}
                  className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
                  required={f.required}
                >
                  <option value="">-- Pilih --</option>
                  {f.options?.map((o: any) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  value={values[f.key] || ''}
                  onChange={e => setValues({ ...values, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm min-h-[120px]"
                  required={f.required}
                />
              ) : (
                <input
                  type={f.type}
                  value={values[f.key] || ''}
                  onChange={e => setValues({ ...values, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
                  required={f.required}
                />
              )}
            </div>
          ))}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
            >
              BATAL
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? 'PROSES...' : '💾 SIMPAN DATA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL: RESIGN / UNRESIGN
// ═══════════════════════════════════════════════════════════════
function ResignModal({ row, mode, onClose, onSuccess }: any) {
  const isResign = mode === 'resign'
  const [tglResign, setTglResign] = useState(new Date().toISOString().split('T')[0])
  const [alasan, setAlasan] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: any) {
    e.preventDefault()

    if (isResign && !alasan.trim()) {
      alert('❌ Alasan resign wajib diisi')
      return
    }

    if (!confirm(isResign
      ? `⚠️ Yakin resign-kan karyawan "${row.nama}"?\n\nTanggal: ${tglResign}\nAlasan: ${alasan}`
      : `⚠️ Yakin aktifkan kembali karyawan "${row.nama}"?`
    )) return

    setSaving(true)
    try {
      const values = isResign
        ? {
            tanggal_resign: tglResign,
            alasan_resign: alasan,
            status_karyawan: 'Resign'
          }
        : {
            tanggal_resign: null,
            alasan_resign: null,
            resign_by: null,
            status_karyawan: 'Aktif'
          }

      const res = await fetch('/api/crud', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'employees', id: row.id, values })
      })

      const resData = await res.json()

      if (res.ok) {
        alert(isResign ? '✅ Karyawan berhasil di-resign' : '✅ Karyawan berhasil diaktifkan kembali')
        onSuccess()
      } else {
        alert('❌ Gagal: ' + (resData.error || 'Terjadi kesalahan'))
      }
    } catch (err) {
      alert('❌ Kesalahan Koneksi Server')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[99] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border-4 border-white">
        <div className={`p-6 ${isResign ? 'bg-orange-500' : 'bg-emerald-500'} text-white`}>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{isResign ? '🚪' : '↩️'}</span>
            <div>
              <h3 className="font-black text-xl tracking-tight">
                {isResign ? 'Resign Karyawan' : 'Aktifkan Karyawan'}
              </h3>
              <p className="text-white/80 text-xs font-bold">{row.nama} • {row.nrp}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Jabatan</p>
                <p className="font-bold text-slate-800">{row.jabatan || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Site</p>
                <p className="font-bold text-slate-800">{row.site || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Tgl Masuk</p>
                <p className="font-bold text-slate-800">{row.tanggal_masuk || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Masa Kerja</p>
                <p className="font-bold text-blue-600">{row._masa_kerja || '-'}</p>
              </div>
            </div>
          </div>

          {isResign ? (
            <>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                  Tanggal Resign <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={tglResign}
                  onChange={e => setTglResign(e.target.value)}
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                  Alasan Resign <span className="text-rose-500">*</span>
                </label>
                <select
                  value={alasan}
                  onChange={e => setAlasan(e.target.value)}
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none"
                  required
                >
                  <option value="">-- Pilih Alasan --</option>
                  <option value="Mengundurkan Diri">Mengundurkan Diri</option>
                  <option value="Kontrak Habis">Kontrak Habis</option>
                  <option value="Pensiun">Pensiun</option>
                  <option value="PHK">PHK</option>
                  <option value="Meninggal Dunia">Meninggal Dunia</option>
                  <option value="Pindah Perusahaan">Pindah Perusahaan</option>
                  <option value="Alasan Keluarga">Alasan Keluarga</option>
                  <option value="Kesehatan">Kesehatan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                <p className="text-[10px] font-bold text-orange-700">
                  ⚠️ Setelah resign: Status karyawan berubah, tidak bisa clock in/out, tidak muncul di roster
                </p>
              </div>
            </>
          ) : (
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <p className="text-sm font-bold text-emerald-700 mb-2">Karyawan ini akan diaktifkan kembali.</p>
              <div className="text-[11px] text-emerald-600 space-y-1">
                <p>• Tanggal resign akan dihapus</p>
                <p>• Alasan resign akan dihapus</p>
                <p>• Status kembali ke "Aktif"</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-slate-200"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-4 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 ${
                isResign ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
              } disabled:opacity-50`}
            >
              {saving ? 'PROSES...' : (isResign ? '🚪 RESIGN' : '↩️ AKTIFKAN')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}