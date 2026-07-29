'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ImportRosterPage() {
  const router = useRouter()

  // State form
  const [bulan, setBulan] = useState(() => {
    const n = new Date()
    n.setMonth(n.getMonth() + 1) // default bulan depan
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })
  const [site, setSite] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [siteList, setSiteList] = useState<string[]>([])

  // State proses
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [rawData, setRawData] = useState<any[]>([])
  const [result, setResult] = useState<any>(null)

  // Load site list
  useEffect(() => {
    const token = localStorage.getItem('btm_session_token_v1') || ''
    fetch('/api/employees/sites', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).then(r => r.json()).then(d => {
      if (d.ok) setSiteList(d.data || [])
    }).catch(() => {})
  }, [])

  // ─── Step 1: Upload & Parse ───
  async function handleParse() {
    if (!file) { setError('Pilih file Excel'); return }
    if (!bulan) { setError('Pilih bulan'); return }

    setLoading(true)
    setError('')

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bulan', bulan)
      if (site) fd.append('site', site)

      const token = localStorage.getItem('btm_session_token_v1') || ''
      const res = await fetch('/api/roster/import-preview', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Gagal parse file')
        return
      }

      setPreview(json.preview)
      setRawData(json._data || [])
      setStep('preview')

    } catch (err: any) {
      setError('Gagal: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Step 2: Confirm Import ───
  async function handleConfirm(replace: boolean) {
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const res = await fetch('/api/roster/import-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          rows: rawData,
          bulan,
          replace
        })
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Gagal import')
        return
      }

      setResult(json)
      setStep('done')

    } catch (err: any) {
      setError('Gagal: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Reset form ───
  function handleReset() {
    setStep('upload')
    setFile(null)
    setPreview(null)
    setRawData([])
    setResult(null)
    setError('')
  }

  const namaBulan = bulan
    ? new Date(bulan + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    : '-'

  return (
    <div className="min-h-screen bg-[#f4f7fa] pb-24">

      {/* HERO */}
      <div className="bg-[#003D79] px-4 pt-12 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <button onClick={() => router.back()}
          className="mb-3 flex items-center gap-1.5 text-white/60 hover:text-white text-sm relative z-10">
          ← Kembali
        </button>
        <div className="relative z-10">
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-300 mb-1">Import Data</p>
          <h1 className="text-xl font-black text-white">📤 Import Roster Bulanan</h1>
          <p className="text-blue-200 text-sm mt-1">Upload Excel → Auto parse ke database</p>
        </div>
      </div>

      <div className="px-4 -mt-10 space-y-4 relative z-10">

        {/* ═══ STEP 1: UPLOAD ═══ */}
        {step === 'upload' && (
          <div className="bg-white rounded-2xl shadow-xl p-5 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 1 · Pilih File & Periode</p>

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-xs font-bold">
                ⚠️ {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">📅 Bulan</label>
                <input type="month" value={bulan} onChange={e => setBulan(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-[#003D79]/30" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">🏗️ Site</label>
                <select value={site} onChange={e => setSite(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-[#003D79]/30">
                  <option value="">Semua Site</option>
                  {siteList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">📎 File Excel (.xlsx)</label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50 hover:border-[#003D79]/30 transition-all relative">
                <input type="file" accept=".xlsx,.xls"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer" />
                {file ? (
                  <div>
                    <p className="text-emerald-600 font-black text-sm">✅ {file.name}</p>
                    <p className="text-slate-400 text-[10px] mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl mb-2">📊</p>
                    <p className="text-slate-500 text-xs font-bold">Klik untuk pilih file Excel roster</p>
                    <p className="text-slate-400 text-[9px] mt-1">Format: NRP | Nama | 1 | 2 | 3 | ... | 31</p>
                  </div>
                )}
              </div>
            </div>

            <button onClick={handleParse} disabled={loading || !file}
              className="w-full bg-[#003D79] text-white py-3 rounded-xl font-black text-sm disabled:opacity-50 active:scale-95 transition-all shadow-lg">
              {loading ? '⏳ Parsing Excel...' : '🔍 PARSE & PREVIEW'}
            </button>

            {/* Info format */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[10px] text-blue-800 space-y-1">
              <p className="font-black">📋 Format Excel yang didukung:</p>
              <p>• Header: NRP/ID SS6 | Nama | 1 | 2 | 3 | ... | 31</p>
              <p>• Kode shift: S (Siang), M (Malam), OFF, CR, CT, ID, TR, LV, SCK, MCK</p>
              <p>• Sheet pertama yang dibaca</p>
              <p>• NRP auto-detect (dengan/tanpa leading zero)</p>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: PREVIEW ═══ */}
        {step === 'preview' && preview && (
          <div className="space-y-4">

            {/* Summary Card */}
            <div className="bg-white rounded-2xl shadow-xl p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Step 2 · Preview & Konfirmasi</p>

              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-xs font-bold mb-3">
                  ⚠️ {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-blue-700">{preview.totalKaryawan}</p>
                  <p className="text-[9px] font-black text-blue-500 uppercase">Karyawan Valid</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-emerald-700">{preview.totalRow}</p>
                  <p className="text-[9px] font-black text-emerald-500 uppercase">Total Shift</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Periode</span>
                  <span className="font-black text-slate-800">{preview.periode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Site</span>
                  <span className="font-black text-slate-800">{preview.site}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Hari di bulan ini</span>
                  <span className="font-black text-slate-800">{preview.jmlHari} hari</span>
                </div>
              </div>
            </div>

            {/* Conflict Warning */}
            {preview.hasConflict && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                <p className="font-black text-amber-800 text-sm mb-1">⚠️ Data Conflict</p>
                <p className="text-amber-700 text-xs">
                  Ditemukan <strong>{preview.existingCount}</strong> roster lama di periode ini.
                  Data lama akan di-<strong>REPLACE</strong> dengan data baru.
                </p>
              </div>
            )}

            {/* Preview Karyawan */}
            {preview.parsedEmployees?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-3 bg-slate-50 border-b">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    ✅ Karyawan Valid ({preview.totalKaryawan})
                  </p>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {preview.parsedEmployees.map((e: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-slate-50 text-xs">
                      <div>
                        <p className="font-black text-slate-800">{e.nama}</p>
                        <p className="text-[9px] text-slate-400">{e.nrp} · {e.site}</p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black">
                        {e.total_shift} shift
                      </span>
                    </div>
                  ))}
                  {preview.totalKaryawan > 20 && (
                    <p className="text-center text-[9px] text-slate-400 py-2">
                      ...dan {preview.totalKaryawan - 20} karyawan lagi
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Invalid Rows */}
            {preview.totalInvalid > 0 && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-3 bg-rose-50 border-b border-rose-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                    ⚠️ Baris Invalid ({preview.totalInvalid})
                  </p>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {preview.invalidRows.map((e: any, i: number) => (
                    <div key={i} className="px-3 py-2 border-b border-slate-50 text-[10px]">
                      <span className="text-slate-400">Baris {e.baris}:</span>{' '}
                      <span className="font-bold text-slate-700">{e.nama || e.nrp}</span> —{' '}
                      <span className="text-rose-600 italic">{e.alasan}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button onClick={handleReset}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-black text-sm active:scale-95 transition-all">
                ← Batal
              </button>
              <button onClick={() => handleConfirm(preview.hasConflict)} disabled={loading}
                className="flex-[2] bg-emerald-600 text-white py-3 rounded-xl font-black text-sm disabled:opacity-50 active:scale-95 transition-all shadow-lg">
                {loading ? '⏳ Importing...' : `✅ IMPORT ${preview.totalRow} ROSTER`}
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: DONE ═══ */}
        {step === 'done' && result && (
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <h2 className="text-xl font-black text-slate-900">Import Berhasil!</h2>
            <p className="text-slate-600 text-sm">{result.message}</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="text-2xl font-black text-emerald-700">{result.stats?.totalInserted || 0}</p>
                <p className="text-[9px] font-black text-emerald-500 uppercase">Row Berhasil</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-2xl font-black text-slate-700">{result.stats?.totalErrors || 0}</p>
                <p className="text-[9px] font-black text-slate-500 uppercase">Row Gagal</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleReset}
                className="flex-1 bg-[#003D79] text-white py-3 rounded-xl font-black text-sm active:scale-95 transition-all">
                📤 Upload Lagi
              </button>
              <button onClick={() => router.push('/dashboard/manajemen-absensi')}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-black text-sm active:scale-95 transition-all">
                📊 Lihat Matrix
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}