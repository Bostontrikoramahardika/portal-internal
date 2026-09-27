'use client';

import PageHeader from "@/app/components/PageHeader";
// app/dashboard/import-mcu/page.tsx
import { useState, useEffect } from 'react'
import { Download, Upload, CheckCircle, AlertCircle, FileSpreadsheet, ArrowLeft } from 'lucide-react'

export default function ImportMcuPage() {
  const [sites, setSites] = useState<string[]>([])
  const [selectedSite, setSelectedSite] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [committing, setCommitting] = useState(false)
  const [commitResult, setCommitResult] = useState<any>(null)

  useEffect(() => {
    fetch('/api/employees/sites')
      .then(r => r.json())
      .then(d => { if (d.ok) setSites(d.sites || []) })
  }, [])

  async function handleDownload() {
    setDownloading(true)
    try {
      const params = new URLSearchParams()
      if (selectedSite) params.set('site', selectedSite)
      if (selectedDept) params.set('departemen', selectedDept)

      const res = await fetch(`/api/mcu/import/template?${params}`)
      if (!res.ok) {
        const err = await res.json()
        alert('❌ ' + (err.error || 'Gagal download'))
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `TEMPLATE_IMPORT_MCU_${selectedSite || 'ALL'}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert('❌ Error: ' + e.message)
    } finally {
      setDownloading(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setPreview(null)
    setCommitResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/mcu/import/preview', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!data.ok) {
        alert('❌ ' + (data.error || 'Gagal preview'))
        return
      }
      setPreview(data)
    } catch (e: any) {
      alert('❌ Error: ' + e.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleCommit() {
    if (!preview) return
    if (!confirm(`Yakin commit ${preview.summary.valid} data MCU ke database?`)) return

    setCommitting(true)
    try {
      const res = await fetch('/api/mcu/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: preview.rows }),
      })
      const data = await res.json()

      if (!data.ok) {
        alert('❌ ' + (data.error || 'Gagal commit'))
        return
      }
      setCommitResult(data)
      setPreview(null)
    } catch (e: any) {
      alert('❌ Error: ' + e.message)
    } finally {
      setCommitting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <PageHeader title="Import Mcu" backUrl="/dashboard" />

      {/* Header */}
      <div className="bg-gradient-to-br from-[#003D79] to-[#0056b3] p-6 md:p-8 rounded-[2rem] shadow-2xl text-white">
        
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
            <FileSpreadsheet size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Import MCU Massal</h1>
            <p className="text-blue-100/80 text-sm mt-1">Upload data MCU banyak karyawan via Excel</p>
          </div>
        </div>
      </div>

      {/* Step 1: Download Template */}
      <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-sm">1</div>
          <h2 className="text-lg font-black text-slate-800">Download Template</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Site</label>
            <select
              value={selectedSite}
              onChange={e => setSelectedSite(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium"
            >
              <option value="">-- Semua Site --</option>
              {sites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Departemen</label>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium"
            >
              <option value="">-- Semua Dept --</option>
              <option value="Staff">Staff</option>
              <option value="Plant">Plant</option>
              <option value="Operator">Operator</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Download size={16} />
              {downloading ? 'Generating...' : 'Download Template'}
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl">
          📌 Template Excel berisi data karyawan (NRP + Nama auto-fill). Anda tinggal isi kolom kuning (wajib) dan kolom lainnya sesuai data MCU.
        </div>
      </div>

      {/* Step 2: Upload */}
      <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-black flex items-center justify-center text-sm">2</div>
          <h2 className="text-lg font-black text-slate-800">Upload File</h2>
        </div>

        <label className="block border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-[#003D79] hover:bg-blue-50/30 transition">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          <Upload size={32} className="mx-auto text-[#5a6a7e] mb-2" />
          <div className="text-sm font-black text-slate-700">
            {uploading ? '⏳ Memproses...' : 'Klik untuk pilih file Excel'}
          </div>
          <div className="text-xs text-slate-500 mt-1">Format: .xlsx atau .xls</div>
        </label>
      </div>

      {/* Step 3: Preview */}
      {preview && (
        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm">3</div>
            <h2 className="text-lg font-black text-slate-800">Preview Data</h2>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-50 p-3 rounded-xl text-center">
              <div className="text-2xl font-black text-slate-800">{preview.summary.totalRows}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Baris</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl text-center">
              <div className="text-2xl font-black text-blue-700">{preview.summary.processed}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-blue-600">Diproses</div>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl text-center">
              <div className="text-2xl font-black text-emerald-700">{preview.summary.valid}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600">✓ Valid</div>
            </div>
            <div className="bg-rose-50 p-3 rounded-xl text-center">
              <div className="text-2xl font-black text-rose-700">{preview.summary.invalid}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-rose-600">✗ Error</div>
            </div>
          </div>

          {/* Error List */}
          {preview.errors && preview.errors.length > 0 && (
            <div className="mb-4 bg-rose-50 border border-rose-200 rounded-2xl p-4 max-h-60 overflow-y-auto">
              <h3 className="font-black text-rose-700 text-sm mb-2 flex items-center gap-2">
                <AlertCircle size={16} /> Error ({preview.errors.length})
              </h3>
              <ul className="text-xs space-y-1">
                {preview.errors.map((e: any, i: number) => (
                  <li key={i} className="text-rose-700">
                    <strong>Baris {e.row} (NRP {e.nrp}):</strong> {e.errors.join('; ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="p-2 text-left">Baris</th>
                  <th className="p-2 text-left">NRP</th>
                  <th className="p-2 text-left">Nama</th>
                  <th className="p-2 text-left">Tgl MCU</th>
                  <th className="p-2 text-left">Hasil</th>
                  <th className="p-2 text-left">Temuan</th>
                  <th className="p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 100).map((r: any, i: number) => (
                  <tr key={i} className={r.valid ? 'bg-emerald-50/30' : 'bg-rose-50/50'}>
                    <td className="p-2">{r.rowNum}</td>
                    <td className="p-2 font-mono">{r.nrp}</td>
                    <td className="p-2">{r.nama}</td>
                    <td className="p-2">{r.tanggal_mcu}</td>
                    <td className="p-2">{r.hasil}</td>
                    <td className="p-2">{r.findings?.map((f: any) => f.jenis).join(', ') || '-'}</td>
                    <td className="p-2 text-center">
                      {r.valid ? <CheckCircle size={16} className="text-emerald-600 inline" /> : <AlertCircle size={16} className="text-rose-600 inline" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > 100 && (
              <div className="text-center text-xs text-slate-500 p-2 bg-slate-50">
                ... dan {preview.rows.length - 100} baris lainnya
              </div>
            )}
          </div>

          {/* Commit Button */}
          {preview.summary.valid > 0 && (
            <button
              onClick={handleCommit}
              disabled={committing}
              className="mt-4 w-full px-6 py-3 rounded-xl bg-[#003D79] text-white font-black hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              {committing ? 'Menyimpan...' : `COMMIT ${preview.summary.valid} DATA MCU KE DATABASE`}
            </button>
          )}
        </div>
      )}

      {/* Commit Result */}
      {commitResult && (
        <div className="bg-emerald-50 border-2 border-emerald-200 p-6 rounded-[2rem] shadow-xl">
          <h2 className="text-lg font-black text-emerald-800 mb-3 flex items-center gap-2">
            <CheckCircle size={24} /> Import Berhasil!
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-3xl font-black text-emerald-700">{commitResult.summary.inserted}</div>
              <div className="text-xs font-black uppercase text-emerald-600">MCU Tersimpan</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-purple-700">{commitResult.summary.findingsInserted}</div>
              <div className="text-xs font-black uppercase text-purple-600">Temuan Tersimpan</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-rose-700">{commitResult.summary.failed}</div>
              <div className="text-xs font-black uppercase text-rose-600">Gagal</div>
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