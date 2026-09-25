'use client';

import PageHeader from "@/app/components/PageHeader";
import { useEffect, useState, useCallback } from 'react'

// ============================================
// TYPES
// ============================================
type Upload = {
  id: string
  file_name: string
  unit_code: string
  status: string
  upload_mode: string
  total_pages: number
  success_pages: number
  failed_pages: number
  no_parts_pages: number
  total_parts: number
  uploaded_by_name: string
  created_at: string
  drive_web_link: string | null
  error_summary: string | null
  notes: string | null
}

type Unit = {
  id: string
  unit_code: string
  unit_name: string
  assembly_count: number
}

type Assembly = {
  id: string
  sheet_name: string
  assembly_name: string
  image_drive_file_id: string | null
  sort_order: number
}

type Item = {
  id: string
  ref_no: number | null
  part_number: string | null
  part_name: string | null
  qty: number | null
  serial_no: string | null
}

type Tab = 'monitor' | 'import' | 'edit'

// ============================================
// UTIL
// ============================================
function formatDate(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    pending:    { bg: 'bg-slate-100 text-slate-600',        label: 'Pending' },
    processing: { bg: 'bg-blue-100 text-blue-700 animate-pulse', label: 'Processing' },
    done:       { bg: 'bg-emerald-100 text-emerald-700',    label: 'Done' },
    partial:    { bg: 'bg-amber-100 text-amber-700',        label: 'Partial' },
    failed:     { bg: 'bg-rose-100 text-rose-700',          label: 'Failed' },
    success:    { bg: 'bg-emerald-100 text-emerald-700',    label: 'Sukses' },
    no_parts:   { bg: 'bg-slate-100 text-slate-500',        label: 'No Parts' },
  }
  const s = map[status] || { bg: 'bg-slate-100 text-slate-500', label: status }
  return (
    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${s.bg}`}>
      {s.label}
    </span>
  )
}

// ============================================
// MAIN
// ============================================
export default function AdminPartbookPage() {
  const [tab, setTab] = useState<Tab>('monitor')
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null)

  const showToast = (type: 'success' | 'error' | 'info', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4500)
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-700 pb-28 px-4 max-w-6xl mx-auto">
      <PageHeader title="Partbook Admin Console" backUrl="/parts-catalog" badge="ADMIN" />

      {/* ============ HERO HEADER ============ */}
      <div className="relative mb-8 mt-4">
        <div className="bg-[#003D79] rounded-[2.5rem] p-8 pt-10 pb-16 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-400/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/10 rounded-full -ml-8 -mb-8 blur-3xl"></div>
          <div className="relative z-10">
            <p className="text-blue-200/70 font-black text-[10px] uppercase tracking-[0.3em] mb-2">
              Admin Panel
            </p>
            <h1 className="text-2xl font-black text-white tracking-tight">
              🛠️ Admin Partbook
            </h1>
            <p className="text-blue-200/60 text-xs font-medium mt-2">
              Kelola upload, extract, dan edit katalog partbook
            </p>
          </div>
        </div>

        {/* ============ TAB SWITCHER (Overlap) ============ */}
        <div className="bg-white rounded-[2rem] mx-2 -mt-10 p-2 shadow-[0_20px_50px_rgba(0,61,121,0.12)] border border-white relative z-20">
          <div className="grid grid-cols-3 gap-1">
            <TabBtn active={tab === 'monitor'} onClick={() => setTab('monitor')} icon="📊" label="Monitoring" />
            <TabBtn active={tab === 'import'}  onClick={() => setTab('import')}  icon="⬆️" label="Import" />
            <TabBtn active={tab === 'edit'}    onClick={() => setTab('edit')}    icon="✏️" label="Edit" />
          </div>
        </div>
      </div>

      {/* ============ CONTENT ============ */}
      <div className="mt-6">
        {tab === 'monitor' && <MonitorTab showToast={showToast} />}
        {tab === 'import'  && <ImportTab  showToast={showToast} />}
        {tab === 'edit'    && <EditTab    showToast={showToast} />}
      </div>

      {/* ============ TOAST ============ */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold max-w-md ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' :
            toast.type === 'error'   ? 'bg-rose-600 text-white' :
                                       'bg-[#003D79] text-white'
          }`}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// TAB BUTTON
// ============================================
function TabBtn({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: string; label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-3 rounded-[1.2rem] text-xs font-black uppercase tracking-wider transition-all ${
        active
          ? 'bg-[#003D79] text-white shadow-lg'
          : 'text-slate-500 hover:bg-slate-50'
      }`}
    >
      <div className="text-lg mb-0.5">{icon}</div>
      <div className="text-[10px]">{label}</div>
    </button>
  )
}

// ============================================
// TAB 1: MONITORING
// ============================================
function MonitorTab({ showToast }: {
  showToast: (t: 'success' | 'error' | 'info', m: string) => void
}) {
  const [stats, setStats] = useState({
    total_units: 0, total_assemblies: 0, total_items: 0,
    total_uploads: 0, pending: 0, done: 0, failed: 0
  })
  const [recentUploads, setRecentUploads] = useState<Upload[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/partbook/uploads?limit=5')
        const j = await res.json()
        if (j.ok) {
          setRecentUploads(j.data)
          const done    = j.data.filter((u: Upload) => u.status === 'done').length
          const pending = j.data.filter((u: Upload) => u.status === 'pending').length
          const failed  = j.data.filter((u: Upload) => u.status === 'failed').length
          setStats(s => ({ ...s, total_uploads: j.count, done, pending, failed }))
        }

        const resUnit = await fetch('/api/partbook/units')
        const jUnit = await resUnit.json()
        if (jUnit.ok) {
          const totalAssy = jUnit.data.reduce((sum: number, u: Unit) => sum + u.assembly_count, 0)
          setStats(s => ({ ...s, total_units: jUnit.data.length, total_assemblies: totalAssy }))
        }
      } catch (err) {
        showToast('error', 'Gagal load monitoring')
      }
      setLoading(false)
    })()
  }, [showToast])

  return (
    <div className="space-y-6">
      {/* ============ STATS GRID ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Unit"      value={stats.total_units}      color="blue" />
        <StatCard label="Total Assembly"  value={stats.total_assemblies} color="emerald" />
        <StatCard label="Total Upload"    value={stats.total_uploads}    color="amber" />
        <StatCard label="Import Gagal"    value={stats.failed}           color="rose" />
      </div>

      {/* ============ RECENT UPLOADS ============ */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            📥 Import Terbaru
          </p>
          <span className="text-[9px] font-black text-slate-400 uppercase">
            {recentUploads.length} file
          </span>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-400 text-sm font-bold">
            Memuat data...
          </div>
        ) : recentUploads.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-10 text-center shadow-xl border-2 border-slate-50">
            <p className="text-5xl mb-3">📭</p>
            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">
              Belum ada import
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Buka tab Import untuk mulai upload
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentUploads.map(u => <UploadCard key={u.id} upload={u} onReload={() => {
  // Reload data setelah proses
  fetch('/api/partbook/uploads?limit=5')
    .then(r => r.json())
    .then(j => { if (j.ok) setRecentUploads(j.data) })
}} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: {
  label: string; value: number; color: 'blue' | 'emerald' | 'amber' | 'rose'
}) {
  const colorMap = {
    blue:    { bg: 'bg-white', text: 'text-[#003D79]',    labelText: 'text-blue-400' },
    emerald: { bg: 'bg-white', text: 'text-emerald-600',  labelText: 'text-emerald-400' },
    amber:   { bg: 'bg-white', text: 'text-amber-600',    labelText: 'text-amber-400' },
    rose:    { bg: 'bg-rose-50', text: 'text-rose-600',   labelText: 'text-rose-400' },
  }
  const c = colorMap[color]
  return (
    <div className={`${c.bg} p-5 rounded-[2rem] border-2 border-slate-50 shadow-xl`}>
      <p className={`text-[9px] font-black ${c.labelText} uppercase tracking-widest mb-1`}>
        {label}
      </p>
      <p className={`text-2xl font-black ${c.text}`}>{value.toLocaleString()}</p>
    </div>
  )
}

function UploadCard({ upload, onReload }: { 
  upload: Upload
  onReload?: () => void
}) {
  const [processing, setProcessing] = useState(false)
  
  const handleProcess = async () => {
    if (!confirm(`Proses file '${upload.file_name}' sekarang?\n\nDurasi tergantung ukuran PDF (bisa 1-5 menit).`)) return
    
    setProcessing(true)
    try {
      const res = await fetch('/api/partbook/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upload_id: upload.id }),
      })
      const j = await res.json()
      if (j.ok) {
        alert(`✅ Berhasil!\n\nTotal: ${j.data.totalPages} halaman\nSukses: ${j.data.successPages}\nGagal: ${j.data.failedPages}\nParts: ${j.data.totalParts}`)
        onReload?.()
      } else {
        alert(`❌ Gagal: ${j.error}\n\n💡 ${j.hint || ''}`)
      }
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const canProcess = upload.status === 'pending' || upload.status === 'failed' || upload.status === 'partial'
  
  return (
    <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-50 shadow-xl">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-lg flex-shrink-0">
            📄
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-sm text-slate-900 truncate">{upload.file_name}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
              {upload.unit_code} • {upload.uploaded_by_name}
            </p>
          </div>
        </div>
        <StatusBadge status={upload.status} />
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <MiniStat label="Hal" value={upload.total_pages}   />
        <MiniStat label="✓"   value={upload.success_pages} color="emerald" />
        <MiniStat label="✗"   value={upload.failed_pages}  color="rose" />
        <MiniStat label="○"   value={upload.no_parts_pages} />
      </div>

      {upload.error_summary && (
        <div className="mb-3 p-2 bg-rose-50 border border-rose-200 rounded-xl text-[10px] text-rose-700 font-medium">
          ⚠️ {upload.error_summary}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[9px] text-slate-400 font-medium">
          {formatDate(upload.created_at)}
        </p>
        {canProcess && (
          <button
            onClick={handleProcess}
            disabled={processing}
            className="text-[10px] font-black uppercase tracking-wider bg-[#003D79] text-white px-3 py-1.5 rounded-xl hover:bg-[#002d5a] disabled:opacity-50"
          >
            {processing ? '⏳ Proses...' : '🚀 Proses'}
          </button>
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value, color }: {
  label: string; value: number; color?: 'emerald' | 'rose'
}) {
  const bg = color === 'emerald' ? 'bg-emerald-50 text-emerald-700'
           : color === 'rose'    ? 'bg-rose-50 text-rose-700'
           :                       'bg-slate-50 text-slate-700'
  return (
    <div className={`${bg} rounded-2xl p-2 text-center`}>
      <p className="text-[8px] font-black uppercase opacity-60">{label}</p>
      <p className="text-sm font-black">{value}</p>
    </div>
  )
}

// ============================================
// TAB 2: IMPORT (Upload + Kelola Unit)
// ============================================
function ImportTab({ showToast }: {
  showToast: (t: 'success' | 'error' | 'info', m: string) => void
}) {
  const [subTab, setSubTab] = useState<'upload' | 'units'>('upload')

  return (
    <div className="space-y-4">
      {/* Sub Tab */}
      <div className="bg-white rounded-[1.5rem] p-2 shadow-lg border border-slate-100">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => setSubTab('upload')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              subTab === 'upload' ? 'bg-[#003D79] text-white' : 'text-slate-500'
            }`}
          >
            📤 Upload File
          </button>
          <button
            onClick={() => setSubTab('units')}
            className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              subTab === 'units' ? 'bg-[#003D79] text-white' : 'text-slate-500'
            }`}
          >
            📦 Kelola Unit
          </button>
        </div>
      </div>

      {subTab === 'upload' && <UploadForm showToast={showToast} />}
      {subTab === 'units'  && <ManageUnits showToast={showToast} />}
    </div>
  )
}

// ------ UPLOAD FORM ------
function UploadForm({ showToast }: {
  showToast: (t: 'success' | 'error' | 'info', m: string) => void
}) {
  const [mode, setMode] = useState<'web' | 'drive'>('web')
  const [units, setUnits] = useState<Unit[]>([])
  const [unitCode, setUnitCode] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [driveFileId, setDriveFileId] = useState('')
  const [driveFileName, setDriveFileName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Untuk unit baru
  const [createNewUnit, setCreateNewUnit] = useState(false)
  const [newUnitCode, setNewUnitCode] = useState('')
  const [newUnitName, setNewUnitName] = useState('')

  const loadUnits = useCallback(async () => {
    const res = await fetch('/api/partbook/units')
    const j = await res.json()
    if (j.ok) setUnits(j.data)
  }, [])

  useEffect(() => { loadUnits() }, [loadUnits])

  const handleSubmit = async () => {
    // Validasi unit
    let finalUnitCode = unitCode
    if (createNewUnit) {
      if (!newUnitCode.trim() || !newUnitName.trim()) {
        return showToast('error', 'Kode Unit & Nama Unit wajib diisi')
      }
      // Create unit dulu
      const resNew = await fetch('/api/partbook/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_code: newUnitCode.trim().toUpperCase(),
          unit_name: newUnitName.trim(),
        }),
      })
      const jNew = await resNew.json()
      if (!jNew.ok) return showToast('error', jNew.error || 'Gagal buat unit baru')
      finalUnitCode = jNew.data.unit_code
      await loadUnits()
    } else {
      if (!unitCode) return showToast('error', 'Pilih unit terlebih dahulu')
    }

    setSubmitting(true)
    try {
      if (mode === 'web') {
        if (!file) { showToast('error', 'Pilih file PDF'); setSubmitting(false); return }
        const fd = new FormData()
        fd.append('file', file)
        fd.append('unit_code', finalUnitCode)
        if (notes) fd.append('notes', notes)
        const res = await fetch('/api/partbook/upload-file', { method: 'POST', body: fd })
        const j = await res.json()
        if (j.ok) {
          showToast('success', j.message)
          setFile(null); setNotes(''); setNewUnitCode(''); setNewUnitName(''); setCreateNewUnit(false)
        } else {
          showToast('error', `${j.error}${j.hint ? '\n💡 ' + j.hint : ''}`)
        }
      } else {
        if (!driveFileId || !driveFileName) {
          showToast('error', 'Drive File ID & nama file wajib diisi')
          setSubmitting(false); return
        }
        const res = await fetch('/api/partbook/uploads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            drive_file_id: driveFileId, drive_file_name: driveFileName,
            unit_code: finalUnitCode, notes: notes || null, upload_mode: 'drive_id',
          }),
        })
        const j = await res.json()
        if (j.ok) {
          showToast('success', j.message)
          setDriveFileId(''); setDriveFileName(''); setNotes('')
          setNewUnitCode(''); setNewUnitName(''); setCreateNewUnit(false)
        } else {
          showToast('error', `${j.error}${j.hint ? '\n💡 ' + j.hint : ''}`)
        }
      }
    } catch (err: any) {
      showToast('error', 'Error: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="bg-white p-5 rounded-[2rem] shadow-xl border-2 border-slate-50">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
          Mode Upload
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('web')}
            className={`p-4 rounded-[1.5rem] text-left transition ${
              mode === 'web' ? 'bg-[#003D79] text-white' : 'bg-slate-50 text-slate-700'
            }`}
          >
            <p className="text-2xl mb-1">📤</p>
            <p className="text-xs font-black uppercase">Upload Langsung</p>
            <p className={`text-[10px] mt-0.5 ${mode === 'web' ? 'text-blue-200' : 'text-slate-500'}`}>
              Max 4 MB
            </p>
          </button>
          <button
            onClick={() => setMode('drive')}
            className={`p-4 rounded-[1.5rem] text-left transition ${
              mode === 'drive' ? 'bg-[#003D79] text-white' : 'bg-slate-50 text-slate-700'
            }`}
          >
            <p className="text-2xl mb-1">🔗</p>
            <p className="text-xs font-black uppercase">Google Drive ID</p>
            <p className={`text-[10px] mt-0.5 ${mode === 'drive' ? 'text-blue-200' : 'text-slate-500'}`}>
              Untuk file besar
            </p>
          </button>
        </div>
      </div>

      {/* Unit Selection */}
      <div className="bg-white p-5 rounded-[2rem] shadow-xl border-2 border-slate-50">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Unit Target *
          </p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={createNewUnit}
              onChange={e => setCreateNewUnit(e.target.checked)}
              className="rounded"
            />
            <span className="text-[10px] font-black text-[#003D79] uppercase">
              + Unit Baru
            </span>
          </label>
        </div>

        {!createNewUnit ? (
          <select
            value={unitCode}
            onChange={e => setUnitCode(e.target.value)}
            className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-100 text-sm font-medium bg-slate-50 focus:border-[#003D79] focus:outline-none"
          >
            <option value="">-- Pilih Unit --</option>
            {units.map(u => (
              <option key={u.id} value={u.unit_code}>
                {u.unit_code} — {u.unit_name} ({u.assembly_count} assy)
              </option>
            ))}
          </select>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={newUnitCode}
              onChange={e => setNewUnitCode(e.target.value.toUpperCase())}
              placeholder="Kode Unit (contoh: PC1250-8)"
              className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-100 text-sm font-black font-mono bg-slate-50 focus:border-[#003D79] focus:outline-none"
            />
            <input
              type="text"
              value={newUnitName}
              onChange={e => setNewUnitName(e.target.value)}
              placeholder="Nama Unit (contoh: Komatsu PC1250-8)"
              className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-100 text-sm font-medium bg-slate-50 focus:border-[#003D79] focus:outline-none"
            />
            <p className="text-[9px] text-amber-700 bg-amber-50 p-2 rounded-xl">
              💡 Unit baru akan otomatis dibuat saat submit
            </p>
          </div>
        )}
      </div>

      {/* File Input */}
      <div className="bg-white p-5 rounded-[2rem] shadow-xl border-2 border-slate-50">
        {mode === 'web' ? (
          <>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
              File PDF *
            </p>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-[#003D79] file:text-white file:font-black file:text-xs file:uppercase"
            />
            {file && (
              <p className="text-[10px] text-slate-500 mt-2 font-medium">
                {file.name} • {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
            <p className="text-[10px] text-amber-700 bg-amber-50 p-3 rounded-2xl mt-3 font-medium">
              ⚠️ Batas <strong>4 MB</strong>. File besar → upload ke Drive manual, pakai mode "Google Drive ID"
            </p>
          </>
        ) : (
          <>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
              Google Drive Info *
            </p>
            <div className="space-y-2">
              <input
                type="text"
                value={driveFileId}
                onChange={e => setDriveFileId(e.target.value.trim())}
                placeholder="Drive File ID"
                className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-100 text-sm font-mono bg-slate-50 focus:border-[#003D79] focus:outline-none"
              />
              <input
                type="text"
                value={driveFileName}
                onChange={e => setDriveFileName(e.target.value)}
                placeholder="Nama File (contoh: PB PC200-8.pdf)"
                className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-100 text-sm bg-slate-50 focus:border-[#003D79] focus:outline-none"
              />
              <p className="text-[10px] text-blue-700 bg-blue-50 p-3 rounded-2xl font-medium">
                💡 Cara ambil Drive ID: Buka file di Drive → klik kanan → "Get link" → copy ID setelah <code className="bg-white px-1 rounded">/d/</code>
              </p>
            </div>
          </>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white p-5 rounded-[2rem] shadow-xl border-2 border-slate-50">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
          Catatan (Opsional)
        </p>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Catatan tambahan..."
          className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-100 text-sm bg-slate-50 focus:border-[#003D79] focus:outline-none resize-none"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-[#003D79] text-white py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-wider shadow-xl hover:bg-[#002d5a] transition disabled:opacity-50"
      >
        {submitting ? '⏳ Mengupload...' : '🚀 Upload & Register'}
      </button>
    </div>
  )
}

// ------ KELOLA UNIT ------
function ManageUnits({ showToast }: {
  showToast: (t: 'success' | 'error' | 'info', m: string) => void
}) {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/partbook/units')
    const j = await res.json()
    if (j.ok) setUnits(j.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!newCode.trim() || !newName.trim()) {
      return showToast('error', 'Kode & Nama Unit wajib diisi')
    }
    const res = await fetch('/api/partbook/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit_code: newCode.trim().toUpperCase(),
        unit_name: newName.trim(),
      }),
    })
    const j = await res.json()
    if (j.ok) {
      showToast('success', 'Unit baru berhasil ditambahkan')
      setNewCode(''); setNewName(''); setShowAdd(false)
      load()
    } else {
      showToast('error', j.error || 'Gagal tambah unit')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          📦 Daftar Unit ({units.length})
        </p>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-[10px] font-black uppercase tracking-wider bg-[#003D79] text-white px-4 py-2 rounded-xl"
        >
          {showAdd ? '✕ Batal' : '+ Tambah'}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-5 rounded-[2rem] shadow-xl border-2 border-blue-100 animate-in slide-in-from-top-2">
          <input
            type="text"
            value={newCode}
            onChange={e => setNewCode(e.target.value.toUpperCase())}
            placeholder="Kode Unit (contoh: PC1250-8)"
            className="w-full mb-2 px-4 py-3 rounded-[1.2rem] border-2 border-slate-100 text-sm font-black font-mono bg-slate-50 focus:border-[#003D79] focus:outline-none"
          />
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nama Unit"
            className="w-full mb-3 px-4 py-3 rounded-[1.2rem] border-2 border-slate-100 text-sm bg-slate-50 focus:border-[#003D79] focus:outline-none"
          />
          <button
            onClick={handleAdd}
            className="w-full bg-[#003D79] text-white py-3 rounded-[1.2rem] font-black text-xs uppercase tracking-wider"
          >
            💾 Simpan Unit
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-400 text-sm font-bold">Memuat...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {units.map(u => (
            <div key={u.id} className="bg-white p-4 rounded-[1.5rem] shadow-xl border-2 border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-lg">
                  ⚙️
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-slate-900 font-mono">{u.unit_code}</p>
                  <p className="text-[10px] text-slate-500 truncate">{u.unit_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Assy</p>
                  <p className="font-black text-[#003D79] text-sm">{u.assembly_count}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// TAB 3: EDIT KATALOG
// ============================================
function EditTab({ showToast }: {
  showToast: (t: 'success' | 'error' | 'info', m: string) => void
}) {
  const [units, setUnits] = useState<Unit[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [assemblies, setAssemblies] = useState<Assembly[]>([])
  const [selectedAssembly, setSelectedAssembly] = useState<Assembly | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [searchMode, setSearchMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])

  // Load units
  useEffect(() => {
    fetch('/api/partbook/units').then(r => r.json()).then(j => {
      if (j.ok) setUnits(j.data)
    })
  }, [])

  // Load assemblies when unit selected
  useEffect(() => {
    if (!selectedUnitId) { setAssemblies([]); return }
    setLoading(true)
    fetch(`/api/parts-catalog/assemblies?unit_id=${selectedUnitId}`)
      .then(r => r.json())
      .then(j => {
        if (j.ok || j.data) setAssemblies(j.data || j.assemblies || [])
      })
      .finally(() => setLoading(false))
  }, [selectedUnitId])

  // Load items when assembly selected
  useEffect(() => {
    if (!selectedAssembly) { setItems([]); return }
    fetch(`/api/parts-catalog/assembly?id=${selectedAssembly.id}`)
      .then(r => r.json())
      .then(j => {
        if (j.data?.items) setItems(j.data.items)
      })
  }, [selectedAssembly])

  const handleEditName = async () => {
    if (!selectedAssembly) return
    const newName = prompt('Nama assembly baru:', selectedAssembly.assembly_name)
    if (!newName || newName === selectedAssembly.assembly_name) return

    const res = await fetch(`/api/partbook/assemblies/${selectedAssembly.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assembly_name: newName }),
    })
    const j = await res.json()
    if (j.ok) {
      showToast('success', j.message)
      setSelectedAssembly({ ...selectedAssembly, assembly_name: j.data.assembly_name })
    } else {
      showToast('error', j.error)
    }
  }

  const handleDelete = async () => {
    if (!selectedAssembly) return
    if (!confirm(`Hapus assembly "${selectedAssembly.assembly_name}" dan semua items-nya?`)) return

    const res = await fetch(`/api/partbook/assemblies/${selectedAssembly.id}`, {
      method: 'DELETE',
    })
    const j = await res.json()
    if (j.ok) {
      showToast('success', j.message)
      setSelectedAssembly(null)
      // Reload assemblies
      setLoading(true)
      const res2 = await fetch(`/api/parts-catalog/assemblies?unit_id=${selectedUnitId}`)
      const j2 = await res2.json()
      setAssemblies(j2.data || j2.assemblies || [])
      setLoading(false)
    } else {
      showToast('error', j.error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="bg-white rounded-[1.5rem] p-2 shadow-lg border border-slate-100">
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => setSearchMode(false)}
            className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              !searchMode ? 'bg-[#003D79] text-white' : 'text-slate-500'
            }`}
          >
            📁 Browse
          </button>
          <button
            onClick={() => setSearchMode(true)}
            className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              searchMode ? 'bg-[#003D79] text-white' : 'text-slate-500'
            }`}
          >
            🔍 Search
          </button>
        </div>
      </div>

      {searchMode ? (
        <div className="bg-white p-5 rounded-[2rem] shadow-xl border-2 border-slate-50">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
            Cari Part / Assembly
          </p>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Part number atau nama assembly..."
            className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-100 text-sm bg-slate-50 focus:border-[#003D79] focus:outline-none"
          />
          <p className="text-[10px] text-slate-400 mt-3 text-center italic">
            🚧 Fitur search sedang dikembangkan
          </p>
        </div>
      ) : (
        <>
          {/* Unit Selector */}
          <div className="bg-white p-5 rounded-[2rem] shadow-xl border-2 border-slate-50">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
              Pilih Unit
            </p>
            <select
              value={selectedUnitId}
              onChange={e => { setSelectedUnitId(e.target.value); setSelectedAssembly(null) }}
              className="w-full px-4 py-3 rounded-[1.2rem] border-2 border-slate-100 text-sm font-medium bg-slate-50 focus:border-[#003D79] focus:outline-none"
            >
              <option value="">-- Pilih Unit --</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>
                  {u.unit_code} — {u.unit_name}
                </option>
              ))}
            </select>
          </div>

          {/* Assembly List */}
          {selectedUnitId && (
            <div className="bg-white p-5 rounded-[2rem] shadow-xl border-2 border-slate-50">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                Pilih Assembly ({assemblies.length})
              </p>
              {loading ? (
                <p className="text-center py-6 text-slate-400 text-sm font-bold">Memuat...</p>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-1">
                  {assemblies.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setSelectedAssembly(a)}
                      className={`w-full text-left p-3 rounded-xl text-xs transition ${
                        selectedAssembly?.id === a.id
                          ? 'bg-[#003D79] text-white font-black'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-mono opacity-60 mr-2">{a.sheet_name}</span>
                      {a.assembly_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Selected Assembly Detail */}
      {selectedAssembly && (
        <div className="bg-white p-5 rounded-[2rem] shadow-xl border-2 border-blue-100 animate-in slide-in-from-bottom-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Detail Assembly
              </p>
              <p className="text-sm font-black text-slate-900">{selectedAssembly.assembly_name}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedAssembly.sheet_name}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={handleEditName}
              className="bg-blue-50 text-[#003D79] py-3 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-100"
            >
              ✏️ Edit Nama
            </button>
            <button
              onClick={() => showToast('info', '🚧 Fitur upload gambar sedang dikembangkan')}
              className="bg-emerald-50 text-emerald-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100"
            >
              📷 Ganti Foto
            </button>
            <button
              onClick={handleDelete}
              className="bg-rose-50 text-rose-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-rose-100"
            >
              🗑️ Delete
            </button>
          </div>

          <div className="bg-slate-50 rounded-[1.2rem] p-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Parts ({items.length})
            </p>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {items.slice(0, 20).map(i => (
                <div key={i.id} className="text-[10px] flex gap-2 py-1 border-b border-slate-200">
                  <span className="w-8 text-slate-400 font-mono">{i.ref_no || '-'}</span>
                  <span className="w-32 font-mono font-bold text-slate-700">{i.part_number}</span>
                  <span className="flex-1 text-slate-600 truncate">{i.part_name}</span>
                  <span className="text-slate-400">×{i.qty}</span>
                </div>
              ))}
              {items.length > 20 && (
                <p className="text-[10px] text-slate-400 text-center italic pt-2">
                  ... dan {items.length - 20} part lainnya
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}