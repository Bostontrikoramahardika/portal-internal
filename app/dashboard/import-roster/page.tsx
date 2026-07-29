'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ROSTER_TEMP_KEY = 'btm_roster_import_temp_v1'

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
  const [result, setResult] = useState<any>(null)
  const [showAllEmployees, setShowAllEmployees] = useState(false)
  const [showAllInvalid, setShowAllInvalid] = useState(false)

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
    if (!file) { setError('Pilih file Excel dulu'); return }
    if (!bulan) { setError('Pilih bulan dulu'); return }

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

      // ✅ Simpan _data ke localStorage (bukan state)
      try {
        localStorage.setItem(ROSTER_TEMP_KEY, JSON.stringify(json._data || []))
      } catch (e) {
        setError('Data terlalu besar untuk disimpan. Coba upload per site atau bagi file per sheet.')
        return
      }

      setStep('preview')

    } catch (err: any) {
      setError('Gagal: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── Step 2: Confirm Import ───
  async function handleConfirm() {
    setLoading(true)
    setError('')

    try {
      const rawStr = localStorage.getItem(ROSTER_TEMP_KEY)
      if (!rawStr) {
        setError('Data preview hilang. Silakan upload ulang.')
        setStep('upload')
        return
      }

      const rows = JSON.parse(rawStr)
      if (!Array.isArray(rows) || rows.length === 0) {
        setError('Data kosong. Silakan upload ulang.')
        setStep('upload')
        return
      }

      const token = localStorage.getItem('btm_session_token_v1') || ''
      const res = await fetch('/api/roster/import-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ rows, bulan })
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Gagal import')
        return
      }

      // Bersihkan localStorage
      localStorage.removeItem(ROSTER_TEMP_KEY)

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
    setResult(null)
    setError('')
    setShowAllEmployees(false)
    setShowAllInvalid(false)
    try {
      localStorage.removeItem(ROSTER_TEMP_KEY)
    } catch {}
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
          <p className="text-blue-200 text-sm mt-1">Multi-sheet Excel → Auto parse ke database</p>
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
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">📅 Bulan & Tahun</label>
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
                    <p className="text-slate-400 text-[9px] mt-1">Format: Multi-sheet (Excavator, Bulldozer, Grader, Staff, Plant)</p>
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
              <p className="font-black mb-1">📋 Format Excel yang didukung:</p>
              <p>• <strong>Multi-sheet</strong>: Semua sheet dibaca otomatis</p>
              <p>• Header: NRP/ID SS6 | Nama | Unit (optional) | 1 | 2 | ... | 31</p>
              <p>• Shift: S, M, OFF, CR, CT, SCK, MCK, ID, TR, LV, I, IR, A</p>
              <p>• Baris "RINGKASAN" auto-skip</p>
              <p>• Unit (E201, D8502, GD701, SPARE) auto-detect</p>
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

              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-blue-50 rounded-xl p-2 text-center">
                  <p className="text-lg font-black text-blue-700">{preview.totalSheet}</p>
                  <p className="text-[8px] font-black text-blue-500 uppercase">Sheet</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-2 text-center">
                  <p className="text-lg font-black text-emerald-700">{preview.totalKaryawan}</p>
                  <p className="text-[8px] font-black text-emerald-500 uppercase">Karyawan</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-2 text-center">
                  <p className="text-lg font-black text-purple-700">{preview.totalUnit}</p>
                  <p className="text-[8px] font-black text-purple-500 uppercase">Unit</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-2 text-center">
                  <p className="text-lg font-black text-amber-700">{preview.totalRow}</p>
                  <p className="text-[8px] font-black text-amber-500 uppercase">Shift</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">📅 Periode</span>
                  <span className="font-black text-slate-800">{preview.periode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">🏗️ Site</span>
                  <span className="font-black text-slate-800">{preview.site}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">📆 Total hari</span>
                  <span className="font-black text-slate-800">{preview.jmlHari} hari</span>
                </div>
              </div>
            </div>

            {/* Per-Sheet Summary */}
            {preview.sheetSummaries?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-3 bg-slate-50 border-b">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    📑 Detail Per Sheet ({preview.sheetSummaries.length})
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {preview.sheetSummaries.map((s: any, i: number) => (
                    <div key={i} className="px-3 py-2.5 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-800 text-xs truncate">{s.sheetName}</p>
                        {s.status === 'success' ? (
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            👥 {s.totalKaryawan} karyawan · 📊 {s.totalShift} shift
                            {s.hasUnit && ' · 🚜 punya unit'}
                            {s.totalInvalid > 0 && ` · ⚠️ ${s.totalInvalid} invalid`}
                          </p>
                        ) : (
                          <p className="text-[9px] text-rose-500 mt-0.5 italic">
                            ⚠️ Skip: {s.reason}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                        s.status === 'success'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {s.status === 'success' ? '✅ OK' : '⏭️ SKIP'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unit List */}
            {preview.uniqueUnits?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  🚜 Unit Terdeteksi ({preview.uniqueUnits.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {preview.uniqueUnits.map((u: string, i: number) => (
                    <span key={i} className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                      u === 'SPARE'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {u}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Conflict Warning */}
            {preview.hasConflict ? (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                <p className="font-black text-amber-800 text-sm mb-1">⚠️ Data Existing Ditemukan</p>
                <p className="text-amber-700 text-xs">
                  Ada <strong>{preview.existingCount}</strong> roster lama di periode <strong>{preview.periode}</strong>.
                  Data lama akan <strong>DIHAPUS</strong> dan diganti data baru.
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                <p className="font-black text-blue-800 text-sm mb-1">ℹ️ Import Baru</p>
                <p className="text-blue-700 text-xs">
                  Tidak ada data lama. <strong>{preview.totalRow}</strong> shift akan di-insert.
                </p>
              </div>
            )}

            {/* Preview Karyawan */}
            {preview.parsedEmployees?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    ✅ Karyawan Valid ({preview.totalKaryawan})
                  </p>
                  {preview.totalKaryawan > 10 && (
                    <button onClick={() => setShowAllEmployees(!showAllEmployees)}
                      className="text-[9px] font-black text-blue-600 hover:underline">
                      {showAllEmployees ? '▲ Sembunyikan' : '▼ Lihat semua'}
                    </button>
                  )}
                </div>
                <div className={`overflow-y-auto ${showAllEmployees ? 'max-h-96' : 'max-h-60'}`}>
                  {preview.parsedEmployees.slice(0, showAllEmployees ? 30 : 10).map((e: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-slate-50 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-800 truncate">{e.nama}</p>
                        <p className="text-[9px] text-slate-400">
                          {e.nrp} · {e.jabatan}
                          {e.unit && ` · 🚜 ${e.unit}`}
                        </p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black ml-2">
                        {e.total_shift} shift
                      </span>
                    </div>
                  ))}
                </div>
                {preview.totalKaryawan > 30 && (
                  <p className="text-center text-[9px] text-slate-400 py-2 bg-slate-50">
                    Menampilkan 30 dari {preview.totalKaryawan} karyawan
                  </p>
                )}
              </div>
            )}

            {/* Invalid Rows */}
            {preview.totalInvalid > 0 && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-3 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                    ⚠️ Baris Invalid ({preview.totalInvalid})
                  </p>
                  {preview.totalInvalid > 5 && (
                    <button onClick={() => setShowAllInvalid(!showAllInvalid)}
                      className="text-[9px] font-black text-rose-600 hover:underline">
                      {showAllInvalid ? '▲ Sembunyikan' : '▼ Lihat semua'}
                    </button>
                  )}
                </div>
                <div className={`overflow-y-auto ${showAllInvalid ? 'max-h-96' : 'max-h-40'}`}>
                  {preview.invalidRows.slice(0, showAllInvalid ? 50 : 5).map((e: any, i: number) => (
                    <div key={i} className="px-3 py-2 border-b border-slate-50 text-[10px]">
                      <div className="flex items-start gap-2">
                        {e.sheet && (
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-black flex-shrink-0">
                            {e.sheet.slice(0, 10)}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-slate-400">Baris {e.baris}:</span>{' '}
                          <span className="font-bold text-slate-700">{e.nama || e.nrp}</span>
                          <p className="text-rose-600 italic mt-0.5">{e.alasan}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {preview.totalInvalid > 50 && (
                  <p className="text-center text-[9px] text-slate-400 py-2 bg-slate-50">
                    Menampilkan 50 dari {preview.totalInvalid} baris invalid
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button onClick={handleReset}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-black text-sm active:scale-95 transition-all">
                ← Batal
              </button>
              <button onClick={handleConfirm} disabled={loading || preview.totalRow === 0}
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
                <p className="text-[9px] font-black text-emerald-500 uppercase">Shift Ter-import</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-2xl font-black text-blue-700">{result.stats?.totalKaryawan || 0}</p>
                <p className="text-[9px] font-black text-blue-500 uppercase">Karyawan</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-2xl font-black text-purple-700">{result.stats?.totalUnit || 0}</p>
                <p className="text-[9px] font-black text-purple-500 uppercase">Unit</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-2xl font-black text-slate-700">{result.stats?.totalErrors || 0}</p>
                <p className="text-[9px] font-black text-slate-500 uppercase">Row Gagal</p>
              </div>
            </div>

            {result.stats?.errorSample?.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-left">
                <p className="text-[10px] font-black text-rose-700 mb-1">Sample Error:</p>
                {result.stats.errorSample.map((e: string, i: number) => (
                  <p key={i} className="text-[10px] text-rose-600 truncate">• {e}</p>
                ))}
              </div>
            )}

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