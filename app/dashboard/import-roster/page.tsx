'use client'


import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ROSTER_TEMP_KEY = 'btm_roster_import_temp_v1'

interface Category {
  id: string
  kode: string
  nama_sheet: string
  judul_header: string
  tipe: 'operator' | 'staff' | 'plant'
  filter_jabatan: string[]
  urutan: number
  is_default: boolean
  active: boolean
}

interface HistoryItem {
  site: string
  periode: string
  periodeLabel: string
  tahun: number
  bulan: number
  totalShift: number
  totalKaryawan: number
  totalUnit: number
  lastUpdate: string | null
  lastUpdater: string | null
}

export default function ImportRosterPage() {
  const router = useRouter()

  // ═══ State Form Upload ═══
  const [bulan, setBulan] = useState(() => {
    const n = new Date()
    n.setMonth(n.getMonth() + 1)
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })
  const [site, setSite] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [siteList, setSiteList] = useState<string[]>([])

  // ═══ State Wizard ═══
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [showAllEmployees, setShowAllEmployees] = useState(false)
  const [showAllInvalid, setShowAllInvalid] = useState(false)

  // ═══ State Kategori ═══
  const [categories, setCategories] = useState<Category[]>([])
  const [showCatModal, setShowCatModal] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [catForm, setCatForm] = useState({
    kode: '',
    nama_sheet: '',
    judul_header: '',
    tipe: 'operator' as 'operator' | 'staff' | 'plant',
    filter_jabatan: '',
    urutan: 0
  })
  const [catLoading, setCatLoading] = useState(false)

  // ═══ State Riwayat ═══
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyFilterSite, setHistoryFilterSite] = useState('')
  const [historyFilterYear, setHistoryFilterYear] = useState('')
  const [availableYears, setAvailableYears] = useState<number[]>([])

  // ═══ State Download Template ═══
  const [dlBulan, setDlBulan] = useState(() => {
    const n = new Date()
    n.setMonth(n.getMonth() + 1)
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })
  const [dlSite, setDlSite] = useState('')
  const [dlWithData, setDlWithData] = useState(true)
  const [dlLoading, setDlLoading] = useState(false)

  // ─── Load initial data ───
  useEffect(() => {
    loadSites()
    loadCategories()
    loadHistory()
  }, [])

  async function loadSites() {
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const res = await fetch('/api/employees/sites', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const d = await res.json()
      if (d.ok) setSiteList(d.data || [])
    } catch {}
  }

  async function loadCategories() {
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const res = await fetch('/api/roster/categories?includeInactive=true', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const d = await res.json()
      if (d.ok) setCategories(d.data || [])
    } catch {}
  }

  async function loadHistory() {
    setHistoryLoading(true)
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const params = new URLSearchParams()
      if (historyFilterSite) params.set('site', historyFilterSite)
      if (historyFilterYear) params.set('tahun', historyFilterYear)

      const res = await fetch(`/api/roster/history?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const d = await res.json()
      if (d.ok) {
        setHistory(d.data || [])
        setAvailableYears(d.filters?.availableYears || [])
      }
    } catch {}
    finally { setHistoryLoading(false) }
  }

  useEffect(() => { loadHistory() }, [historyFilterSite, historyFilterYear])

  // ═══════════════════════════════════════
  // UPLOAD & PARSE
  // ═══════════════════════════════════════
  async function handleParse() {
    if (!file) { setError('Pilih file Excel dulu'); return }
    if (!bulan) { setError('Pilih bulan dulu'); return }

    setLoading(true); setError('')

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
      if (!res.ok) { setError(json.error || 'Gagal parse'); return }

      setPreview(json.preview)
      try {
        localStorage.setItem(ROSTER_TEMP_KEY, JSON.stringify(json._data || []))
      } catch {
        setError('Data terlalu besar. Bagi file per site/sheet.'); return
      }
      setStep('preview')
    } catch (err: any) {
      setError('Gagal: ' + err.message)
    } finally { setLoading(false) }
  }

  async function handleConfirm() {
    setLoading(true); setError('')
    try {
      const rawStr = localStorage.getItem(ROSTER_TEMP_KEY)
      if (!rawStr) { setError('Data hilang. Upload ulang.'); setStep('upload'); return }
      const rows = JSON.parse(rawStr)

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
      if (!res.ok) { setError(json.error || 'Gagal import'); return }

      localStorage.removeItem(ROSTER_TEMP_KEY)
      setResult(json)
      setStep('done')
      loadHistory() // refresh riwayat
    } catch (err: any) {
      setError('Gagal: ' + err.message)
    } finally { setLoading(false) }
  }

  function handleReset() {
    setStep('upload'); setFile(null); setPreview(null)
    setResult(null); setError(''); setShowAllEmployees(false); setShowAllInvalid(false)
    try { localStorage.removeItem(ROSTER_TEMP_KEY) } catch {}
  }

  // ═══════════════════════════════════════
  // DOWNLOAD TEMPLATE
  // ═══════════════════════════════════════
  async function handleDownloadTemplate() {
    if (!dlBulan) { alert('Pilih bulan dulu'); return }

    setDlLoading(true)
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const params = new URLSearchParams()
      params.set('bulan', dlBulan)
      if (dlSite) params.set('site', dlSite)
      params.set('withData', String(dlWithData))

      const res = await fetch(`/api/roster/download-template?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (!res.ok) {
        const j = await res.json()
        alert('Gagal: ' + (j.error || 'Unknown'))
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1]
        || `Template_Roster_${dlBulan}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      alert('Gagal download: ' + err.message)
    } finally { setDlLoading(false) }
  }

  // ═══════════════════════════════════════
  // DOWNLOAD ROSTER EXISTING (from history)
  // ═══════════════════════════════════════
  async function handleDownloadExisting(item: HistoryItem) {
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const params = new URLSearchParams()
      params.set('bulan', item.periode)
      params.set('site', item.site)
      params.set('withData', 'true')

      const res = await fetch(`/api/roster/download-template?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (!res.ok) {
        const j = await res.json()
        alert('Gagal: ' + (j.error || 'Unknown'))
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Roster_${item.site}_${item.periodeLabel.replace(' ', '_')}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      alert('Gagal: ' + err.message)
    }
  }

  // ═══════════════════════════════════════
  // DELETE ROSTER
  // ═══════════════════════════════════════
  async function handleDeleteRoster(item: HistoryItem) {
    const confirmMsg = `⚠️ HAPUS ROSTER?\n\nSite: ${item.site}\nPeriode: ${item.periodeLabel}\nTotal: ${item.totalShift} shift · ${item.totalKaryawan} karyawan\n\nData yang dihapus tidak bisa dikembalikan!`
    if (!confirm(confirmMsg)) return

    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const params = new URLSearchParams()
      params.set('bulan', item.periode)
      params.set('site', item.site)

      const res = await fetch(`/api/roster/history?${params}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const json = await res.json()
      if (!res.ok) { alert('Gagal: ' + json.error); return }

      alert(json.message)
      loadHistory()
    } catch (err: any) {
      alert('Gagal: ' + err.message)
    }
  }

  // ═══════════════════════════════════════
  // KATEGORI CRUD
  // ═══════════════════════════════════════
  function openCatModal(cat?: Category) {
    if (cat) {
      setEditCat(cat)
      setCatForm({
        kode: cat.kode,
        nama_sheet: cat.nama_sheet,
        judul_header: cat.judul_header,
        tipe: cat.tipe,
        filter_jabatan: (cat.filter_jabatan || []).join(', '),
        urutan: cat.urutan
      })
    } else {
      setEditCat(null)
      setCatForm({
        kode: '', nama_sheet: '', judul_header: '',
        tipe: 'operator', filter_jabatan: '', urutan: 0
      })
    }
    setShowCatModal(true)
  }

  async function handleSaveCat() {
    if (!catForm.nama_sheet || !catForm.judul_header) {
      alert('Nama sheet & judul header wajib diisi'); return
    }
    if (!editCat && !catForm.kode) {
      alert('Kode wajib diisi (huruf kecil, tanpa spasi)'); return
    }

    setCatLoading(true)
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const filterArr = catForm.filter_jabatan
        .split(',').map(s => s.trim()).filter(Boolean)

      const body = {
        ...(editCat ? { id: editCat.id } : { kode: catForm.kode }),
        nama_sheet: catForm.nama_sheet,
        judul_header: catForm.judul_header,
        tipe: catForm.tipe,
        filter_jabatan: filterArr,
        urutan: catForm.urutan || undefined
      }

      const res = await fetch('/api/roster/categories', {
        method: editCat ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      })
      const json = await res.json()
      if (!res.ok) { alert('Gagal: ' + json.error); return }

      alert(json.message)
      setShowCatModal(false)
      loadCategories()
    } catch (err: any) {
      alert('Gagal: ' + err.message)
    } finally { setCatLoading(false) }
  }

  async function handleDeleteCat(cat: Category) {
    if (cat.is_default) {
      alert('Kategori default tidak bisa dihapus. Silakan nonaktifkan saja.')
      return
    }
    if (!confirm(`Hapus kategori "${cat.nama_sheet}"?`)) return

    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const res = await fetch(`/api/roster/categories?id=${cat.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const json = await res.json()
      if (!res.ok) { alert('Gagal: ' + json.error); return }
      alert(json.message)
      loadCategories()
    } catch (err: any) {
      alert('Gagal: ' + err.message)
    }
  }

  async function handleToggleCatActive(cat: Category) {
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const res = await fetch('/api/roster/categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ id: cat.id, active: !cat.active })
      })
      const json = await res.json()
      if (!res.ok) { alert('Gagal: ' + json.error); return }
      loadCategories()
    } catch (err: any) {
      alert('Gagal: ' + err.message)
    }
  }

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  return (
    <div className="bg-[#f4f7fa] p-2 sm:p-3 lg:p-4 pb-24 text-slate-800">
      


      {/* HERO */}
      <div className="hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <button onClick={() => router.back()}
          className="mb-3 flex items-center gap-1.5 text-white/60 hover:text-white text-sm relative z-10">
          ← Kembali
        </button>
        <div className="relative z-10">
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-300 mb-1">Import Data</p>
          <h1 className="text-xl font-black text-white">📤 Import Roster Bulanan</h1>
          <p className="text-blue-200 text-sm mt-1">Multi-sheet Excel · Template · Riwayat</p>
        </div>
      </div>

      <div className="px-4 space-y-4 relative z-10">

        {/* ═══ SECTION: DOWNLOAD TEMPLATE ═══ */}
        {step === 'upload' && (
          <div className="bg-white rounded-2xl shadow-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#5a6a7e]">📥 Download Template</p>
              <button onClick={() => setShowCatModal(true)}
                className="text-[10px] font-black text-blue-600 hover:underline">
                ⚙️ Kelola Kategori ({categories.filter(c => c.active).length})
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] font-black uppercase text-[#5a6a7e] block mb-1">Bulan</label>
                <input type="month" value={dlBulan} onChange={e => setDlBulan(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs bg-slate-50" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-[#5a6a7e] block mb-1">Site</label>
                <select value={dlSite} onChange={e => setDlSite(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs bg-slate-50">
                  <option value="">Semua</option>
                  {siteList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-[#5a6a7e] block mb-1">Mode</label>
                <select value={String(dlWithData)} onChange={e => setDlWithData(e.target.value === 'true')}
                  className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs bg-slate-50">
                  <option value="true">Auto-fill</option>
                  <option value="false">Kosong</option>
                </select>
              </div>
            </div>

            <button onClick={handleDownloadTemplate} disabled={dlLoading}
              className="w-full bg-[#003d79] text-white py-2.5 rounded-xl font-black text-xs disabled:opacity-50 active:scale-95 transition-all">
              {dlLoading ? '⏳ Generating...' : '📥 DOWNLOAD TEMPLATE'}
            </button>
          </div>
        )}

        {/* ═══ STEP 1: UPLOAD ═══ */}
        {step === 'upload' && (
          <div className="bg-white rounded-2xl shadow-xl p-5 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#5a6a7e]">📤 Upload Roster</p>

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-xs font-bold">
                ⚠️ {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase text-[#5a6a7e] block mb-1">📅 Bulan</label>
                <input type="month" value={bulan} onChange={e => setBulan(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-[#5a6a7e] block mb-1">🏗️ Site</label>
                <select value={site} onChange={e => setSite(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50">
                  <option value="">Semua Site</option>
                  {siteList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-[#5a6a7e] block mb-1">📎 File Excel (.xlsx)</label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50 relative">
                <input type="file" accept=".xlsx,.xls"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer" />
                {file ? (
                  <div>
                    <p className="text-emerald-600 font-black text-sm">✅ {file.name}</p>
                    <p className="text-[#5a6a7e] text-[10px] mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl mb-2">📊</p>
                    <p className="text-slate-500 text-xs font-bold">Klik untuk pilih file</p>
                    <p className="text-[#5a6a7e] text-[9px] mt-1">Multi-sheet supported</p>
                  </div>
                )}
              </div>
            </div>

            <button onClick={handleParse} disabled={loading || !file}
              className="w-full bg-[#003D79] text-white py-3 rounded-xl font-black text-sm disabled:opacity-50 active:scale-95 transition-all shadow-lg">
              {loading ? '⏳ Parsing...' : '🔍 PARSE & PREVIEW'}
            </button>
          </div>
        )}

        {/* ═══ SECTION: RIWAYAT ROSTER ═══ */}
        {step === 'upload' && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#5a6a7e]">
                📊 Roster Tersimpan ({history.length})
              </p>
              <button onClick={loadHistory}
                className="text-[10px] font-black text-blue-600 hover:underline">
                🔄 Refresh
              </button>
            </div>

            {/* Filter riwayat */}
            <div className="grid grid-cols-2 gap-2 p-3 border-b bg-white">
              <select value={historyFilterSite} onChange={e => setHistoryFilterSite(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50">
                <option value="">Semua Site</option>
                {siteList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={historyFilterYear} onChange={e => setHistoryFilterYear(e.target.value)}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50">
                <option value="">Semua Tahun</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {historyLoading ? (
              <div className="p-8 text-center text-[#5a6a7e] text-xs">⏳ Memuat...</div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-[#5a6a7e] text-xs">
                📭 Belum ada roster tersimpan
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {history.map((item, i) => (
                  <div key={i} className="p-3 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-black text-sm text-slate-800">{item.site}</span>
                          <span className="text-[9px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-black uppercase">
                            {item.periodeLabel}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
                          <span>📊 {item.totalShift} shift</span>
                          <span>👥 {item.totalKaryawan} karyawan</span>
                          {item.totalUnit > 0 && <span>🚜 {item.totalUnit} unit</span>}
                        </div>
                        {item.lastUpdate && (
                          <p className="text-[9px] text-[#5a6a7e] mt-1">
                            📝 {new Date(item.lastUpdate).toLocaleString('id-ID', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })} · by {item.lastUpdater}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleDownloadExisting(item)}
                          title="Download Excel (untuk edit/update)"
                          className="bg-blue-100 text-blue-700 p-2 rounded-lg hover:bg-blue-200 active:scale-95 transition-all">
                          📥
                        </button>
                        <button onClick={() => handleDeleteRoster(item)}
                          title="Hapus roster"
                          className="bg-rose-100 text-rose-700 p-2 rounded-lg hover:bg-rose-200 active:scale-95 transition-all">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 2: PREVIEW ═══ */}
        {step === 'preview' && preview && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-xl p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#5a6a7e] mb-3">Preview</p>

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
                  <p className="text-[8px] font-black text-[#003d79] uppercase">Shift</p>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-500 font-bold">Periode</span><span className="font-black text-slate-800">{preview.periode}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 font-bold">Site</span><span className="font-black text-slate-800">{preview.site}</span></div>
              </div>
            </div>

            {preview.sheetSummaries?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-3 bg-slate-50 border-b">
                  <p className="text-[10px] font-black uppercase text-[#5a6a7e]">📑 Per Sheet ({preview.sheetSummaries.length})</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {preview.sheetSummaries.map((s: any, i: number) => (
                    <div key={i} className="px-3 py-2.5 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-800 text-xs truncate">{s.sheetName}</p>
                        {s.status === 'success' ? (
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            👥 {s.totalKaryawan} · 📊 {s.totalShift}
                            {s.totalInvalid > 0 && ` · ⚠️ ${s.totalInvalid}`}
                          </p>
                        ) : (
                          <p className="text-[9px] text-rose-500 mt-0.5 italic">⚠️ {s.reason}</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${s.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {s.status === 'success' ? '✅' : '⏭️'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.uniqueUnits?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-4">
                <p className="text-[10px] font-black uppercase text-[#5a6a7e] mb-2">🚜 Unit ({preview.uniqueUnits.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {preview.uniqueUnits.map((u: string, i: number) => (
                    <span key={i} className={`px-2 py-1 rounded-lg text-[10px] font-black ${u === 'SPARE' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>{u}</span>
                  ))}
                </div>
              </div>
            )}

            {preview.hasConflict ? (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                <p className="font-black text-amber-800 text-sm mb-1">⚠️ Data Existing</p>
                <p className="text-amber-700 text-xs">Ada <strong>{preview.existingCount}</strong> roster lama. Akan di-<strong>REPLACE</strong>.</p>
              </div>
            ) : (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                <p className="font-black text-blue-800 text-sm mb-1">ℹ️ Import Baru</p>
                <p className="text-blue-700 text-xs"><strong>{preview.totalRow}</strong> shift akan di-insert.</p>
              </div>
            )}

            {preview.parsedEmployees?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase text-[#5a6a7e]">✅ Karyawan ({preview.totalKaryawan})</p>
                  {preview.totalKaryawan > 10 && (
                    <button onClick={() => setShowAllEmployees(!showAllEmployees)} className="text-[9px] font-black text-blue-600">
                      {showAllEmployees ? '▲' : '▼'}
                    </button>
                  )}
                </div>
                <div className={`overflow-y-auto ${showAllEmployees ? 'max-h-96' : 'max-h-60'}`}>
                  {preview.parsedEmployees.slice(0, showAllEmployees ? 30 : 10).map((e: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-slate-50 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-800 truncate">{e.nama}</p>
                        <p className="text-[9px] text-[#5a6a7e]">{e.nrp} · {e.jabatan}{e.unit && ` · 🚜 ${e.unit}`}</p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black ml-2">
                        {e.total_shift} shift
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.totalInvalid > 0 && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-3 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase text-rose-500">⚠️ Invalid ({preview.totalInvalid})</p>
                  {preview.totalInvalid > 5 && (
                    <button onClick={() => setShowAllInvalid(!showAllInvalid)} className="text-[9px] font-black text-rose-600">
                      {showAllInvalid ? '▲' : '▼'}
                    </button>
                  )}
                </div>
                <div className={`overflow-y-auto ${showAllInvalid ? 'max-h-96' : 'max-h-40'}`}>
                  {preview.invalidRows.slice(0, showAllInvalid ? 50 : 5).map((e: any, i: number) => (
                    <div key={i} className="px-3 py-2 border-b border-slate-50 text-[10px]">
                      <div className="flex items-start gap-2">
                        {e.sheet && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-black">{e.sheet.slice(0, 10)}</span>}
                        <div className="flex-1 min-w-0">
                          <span className="text-[#5a6a7e]">Baris {e.baris}:</span>{' '}
                          <span className="font-bold text-slate-700">{e.nama || e.nrp}</span>
                          <p className="text-rose-600 italic mt-0.5">{e.alasan}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={handleReset} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-black text-sm active:scale-95">← Batal</button>
              <button onClick={handleConfirm} disabled={loading || preview.totalRow === 0}
                className="flex-[2] bg-emerald-600 text-white py-3 rounded-xl font-black text-sm disabled:opacity-50 active:scale-95 shadow-lg">
                {loading ? '⏳ Importing...' : `✅ IMPORT ${preview.totalRow}`}
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
                <p className="text-[9px] font-black text-emerald-500 uppercase">Shift</p>
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
                <p className="text-[9px] font-black text-slate-500 uppercase">Error</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleReset} className="flex-1 bg-[#003D79] text-white py-3 rounded-xl font-black text-sm active:scale-95">📤 Upload Lagi</button>
              <button onClick={() => router.push('/dashboard/manajemen-absensi')} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-black text-sm active:scale-95">📊 Matrix</button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* MODAL: KELOLA KATEGORI                         */}
      {/* ═══════════════════════════════════════════════ */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-2">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-800">
                {editCat ? '✏️ Edit Kategori' : (catForm.kode || catForm.nama_sheet ? '➕ Tambah Kategori' : '📋 Kelola Kategori Sheet')}
              </h3>
              <button onClick={() => setShowCatModal(false)} className="text-slate-500 hover:text-slate-800">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Form add/edit */}
              {(editCat || catForm.kode || catForm.nama_sheet) ? (
                <div className="space-y-3 border-2 border-blue-200 bg-blue-50/50 rounded-xl p-3">
                  <p className="text-[10px] font-black uppercase text-blue-600">
                    {editCat ? `Edit: ${editCat.nama_sheet}` : 'Kategori Baru'}
                  </p>

                  {!editCat && (
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Kode (unik, lowercase)</label>
                      <input type="text" value={catForm.kode}
                        onChange={e => setCatForm({...catForm, kode: e.target.value.toLowerCase()})}
                        placeholder="dump_truck"
                        className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white" />
                    </div>
                  )}

                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Nama Sheet (max 31 char)</label>
                    <input type="text" value={catForm.nama_sheet}
                      onChange={e => setCatForm({...catForm, nama_sheet: e.target.value.slice(0, 31)})}
                      placeholder="Roster Dump Truck"
                      className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white" />
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Judul Header</label>
                    <input type="text" value={catForm.judul_header}
                      onChange={e => setCatForm({...catForm, judul_header: e.target.value.toUpperCase()})}
                      placeholder="ROSTER DUMP TRUCK HD785"
                      className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white uppercase" />
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Tipe</label>
                    <select value={catForm.tipe} disabled={editCat?.is_default}
                      onChange={e => setCatForm({...catForm, tipe: e.target.value as any})}
                      className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white disabled:bg-slate-100">
                      <option value="operator">Operator (dengan kolom UNIT)</option>
                      <option value="staff">Staff (dengan kolom JABATAN + SIMPER)</option>
                      <option value="plant">Plant (dengan kolom JABATAN + SIMPER)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                      Filter Jabatan (pisahkan koma untuk auto-fill karyawan)
                    </label>
                    <textarea value={catForm.filter_jabatan}
                      onChange={e => setCatForm({...catForm, filter_jabatan: e.target.value})}
                      placeholder="Operator Excavator, Operator PC-200"
                      rows={2}
                      className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs bg-white" />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => { setEditCat(null); setCatForm({kode:'',nama_sheet:'',judul_header:'',tipe:'operator',filter_jabatan:'',urutan:0}) }}
                      className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-black text-xs">Batal</button>
                    <button onClick={handleSaveCat} disabled={catLoading}
                      className="flex-1 bg-[#003d79] text-white py-2 rounded-lg font-black text-xs disabled:opacity-50">
                      {catLoading ? '⏳' : '💾 Simpan'}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setCatForm({...catForm, kode: '_new'})}
                  className="w-full bg-[#003d79] text-white py-2.5 rounded-xl font-black text-xs active:scale-95">
                  ➕ TAMBAH KATEGORI BARU
                </button>
              )}

              {/* List kategori */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-500 mt-3">
                  Daftar Kategori ({categories.length})
                </p>
                {categories.map(cat => (
                  <div key={cat.id} className={`border rounded-lg p-2.5 ${cat.active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-xs text-slate-800">{cat.nama_sheet}</span>
                          {cat.is_default && <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-black">DEFAULT</span>}
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-black ${cat.tipe === 'operator' ? 'bg-purple-100 text-purple-700' : cat.tipe === 'staff' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {cat.tipe}
                          </span>
                          {!cat.active && <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-black">OFF</span>}
                        </div>
                        <p className="text-[9px] text-slate-500 mt-0.5">📝 {cat.judul_header}</p>
                        {cat.filter_jabatan?.length > 0 && (
                          <p className="text-[9px] text-[#5a6a7e] mt-0.5 truncate">🔍 {cat.filter_jabatan.join(', ')}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => openCatModal(cat)}
                          className="text-[9px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-black">✏️</button>
                        <button onClick={() => handleToggleCatActive(cat)}
                          className={`text-[9px] px-2 py-1 rounded font-black ${cat.active ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {cat.active ? '⏸️' : '▶️'}
                        </button>
                        {!cat.is_default && (
                          <button onClick={() => handleDeleteCat(cat)}
                            className="text-[9px] bg-rose-100 text-rose-700 px-2 py-1 rounded font-black">🗑️</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 border-t bg-slate-50">
              <button onClick={() => setShowCatModal(false)}
                className="w-full bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm text-white py-2 rounded-lg font-black text-xs">
                ✕ Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    

      </div>
  )
}