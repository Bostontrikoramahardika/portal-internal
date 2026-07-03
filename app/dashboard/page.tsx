'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="text-gray-500">Memuat...</div></div>}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const menuKey = searchParams.get('menu') || 'dashboard'
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [menuKey])

  async function loadData() {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/data?menu=${menuKey}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Gagal'); setData(null); return }
      setData(json)
    } catch { setError('Terjadi kesalahan koneksi') }
    finally { setLoading(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-gray-500">Memuat...</div></div>
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">❌ {error}</div>
  if (!data) return null

  if (data.type === 'dashboard') return <DashboardView title={data.title} />
  if (data.type === 'form_cuti') return <FormCutiView title={data.title} onSuccess={loadData} />
  if (data.type === 'roster_view') return <RosterView title={data.title} />
  if (data.type === 'roster_upload') return <RosterUpload title={data.title} />
  if (data.type === 'import_excel') return <ImportExcel title={data.title} table={data.table} />
  if (data.type === 'change_login') return <ChangeLoginView title={data.title} />
if (data.type === 'absensi_clock') return <AbsensiClockView title={data.title} />
if (data.type === 'role_manager') return <RoleManagerView title={data.title} />
  if (data.type === 'form_lembur') return <FormLemburView title={data.title} onSuccess={loadData} />
  if (data.type === 'export_absensi') return <ExportAbsensiView title={data.title} />
  if (data.type === 'table') return <TableView data={data} onReload={loadData} />
  return <div>Tipe konten tidak dikenali</div>
}

// ============ DASHBOARD ============
function DashboardView({ title }: any) {
  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full"></div>
          <h2 className="text-2xl font-bold text-slate-900">🏠 {title}</h2>
        </div>
        <p className="text-sm text-slate-500">Selamat datang di BTM Portal - PT. Boston Trikora Mahardika</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Status Sistem" value="✓ Online" color="text-emerald-600" />
        <StatCard label="Portal" value="Aktif" color="text-blue-600" />
        <StatCard label="Versi" value="1.2.0" color="text-slate-900" />
        <StatCard label="Cloud" value="Supabase" color="text-amber-600" />
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center text-white text-lg shadow-md">
            📋
          </div>
          <h3 className="text-lg font-bold text-slate-900">Panduan Penggunaan</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-600 pl-13">
          <p className="flex items-start gap-2"><span className="text-amber-500 font-bold">›</span> Klik menu di sidebar kiri untuk navigasi</p>
          <p className="flex items-start gap-2"><span className="text-amber-500 font-bold">›</span> <b>Absensi Hari Ini</b>: clock in / clock out dengan GPS</p>
          <p className="flex items-start gap-2"><span className="text-amber-500 font-bold">›</span> <b>Ajukan Cuti / Lembur</b>: pilih atasan yang menyetujui</p>
          <p className="flex items-start gap-2"><span className="text-amber-500 font-bold">›</span> <b>Roster Bulanan</b>: lihat jadwal kerja bulanan (PDF/gambar)</p>
          <p className="flex items-start gap-2"><span className="text-amber-500 font-bold">›</span> <b>Ubah NRP Login</b>: ganti NRP untuk login (data tetap aman)</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow">
      <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide font-semibold">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  )
}

// ============ FORM CUTI ============
function FormCutiView({ title, onSuccess }: any) {
  const [form, setForm] = useState({ tanggal_mulai: '', tanggal_selesai: '', jenis_cuti: '', alasan: '', atasan_nrp: '' })
  const [atasanList, setAtasanList] = useState<any[]>([])
  const [pjoNama, setPjoNama] = useState('')
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/leave/atasan-list').then(r => r.json()).then(d => {
      setAtasanList(d.atasan_list || [])
      setPjoNama(d.pjo_nama || '')
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMsg({ type: '', text: '' })
    try {
      const res = await fetch('/api/leave/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'err', text: data.error }); return }
      setMsg({ type: 'ok', text: data.message })
      setForm({ tanggal_mulai: '', tanggal_selesai: '', jenis_cuti: '', alasan: '', atasan_nrp: '' })
    } catch { setMsg({ type: 'err', text: 'Error' }) }
    finally { setLoading(false) }
  }

  const hitungHari = () => {
    if (!form.tanggal_mulai || !form.tanggal_selesai) return 0
    const s = new Date(form.tanggal_mulai), e = new Date(form.tanggal_selesai)
    if (e < s) return 0
    return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">✍️ {title}</h2>
        <p className="text-sm text-gray-500 mt-1">Isi form untuk mengajukan cuti</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-2xl">
        {msg.text && <div className={`p-3 rounded-xl mb-4 text-sm ${msg.type === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>{msg.text}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Mulai</label>
              <input type="date" required value={form.tanggal_mulai} onChange={e => setForm({ ...form, tanggal_mulai: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Selesai</label>
              <input type="date" required value={form.tanggal_selesai} onChange={e => setForm({ ...form, tanggal_selesai: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border text-gray-900" />
            </div>
          </div>
          {hitungHari() > 0 && <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl text-sm">📅 Total: <b>{hitungHari()} hari</b></div>}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Jenis Cuti</label>
            <select required value={form.jenis_cuti} onChange={e => setForm({ ...form, jenis_cuti: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border text-gray-900">
              <option value="">-- Pilih --</option>
              <option>Tahunan</option><option>Sakit</option><option>Khusus</option>
              <option>Melahirkan</option><option>Menikah</option><option>Duka</option><option>Lainnya</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Pilih Atasan yang Menyetujui</label>
            <select required value={form.atasan_nrp} onChange={e => setForm({ ...form, atasan_nrp: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border text-gray-900">
              <option value="">-- Pilih Atasan --</option>
              {atasanList.map((a: any) => (
                <option key={a.nrp} value={a.nrp}>{a.nama} - {a.jabatan} ({a.site})</option>
              ))}
            </select>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm">
            <div className="text-gray-500 text-xs mb-1">Approval Final PJO:</div>
            <div className="font-semibold text-gray-900">{pjoNama || 'Belum diatur'}</div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Alasan</label>
            <textarea required value={form.alasan} onChange={e => setForm({ ...form, alasan: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border min-h-[100px] text-gray-900" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl">
            {loading ? 'Mengirim...' : '📤 Kirim Pengajuan Cuti'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ============ ROSTER VIEW ============
function RosterView({ title }: any) {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<any>(null)

  useEffect(() => {
    fetch('/api/roster/list').then(r => r.json()).then(d => {
      setFiles(d.files || []); setLoading(false)
    })
  }, [])

  if (loading) return <div className="text-center py-8 text-gray-500">Memuat roster...</div>

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">📅 {title}</h2>
        <p className="text-sm text-gray-500 mt-1">Roster bulanan dalam bentuk PDF/gambar</p>
      </div>
      {files.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <div className="text-gray-500">Belum ada roster yang di-upload</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map(f => (
            <div key={f.id} className="bg-white rounded-2xl shadow-sm border p-4 hover:shadow-md transition-shadow">
              <div className="text-3xl mb-2">{f.file_type?.includes('pdf') ? '📄' : '🖼️'}</div>
              <div className="font-bold text-gray-900 mb-1">📅 {f.periode}</div>
              <div className="text-sm text-gray-600 mb-1">📍 {f.site || 'Semua Site'}</div>
              {f.departemen && <div className="text-sm text-gray-600 mb-1">🏢 {f.departemen}</div>}
              {f.keterangan && <div className="text-xs text-gray-500 mb-2">{f.keterangan}</div>}
              <div className="text-xs text-gray-400 mb-3">{new Date(f.created_at).toLocaleDateString('id-ID')}</div>
              <div className="flex gap-2">
                <button onClick={() => setPreview(f)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg">👁️ Lihat</button>
                <a href={f.file_url} download target="_blank" rel="noopener" className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold px-3 py-2 rounded-lg text-center">⬇️ Download</a>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <div className="font-bold text-gray-900">{preview.periode} - {preview.site || 'Semua'}</div>
                <div className="text-xs text-gray-500">{preview.nama_file}</div>
              </div>
              <button onClick={() => setPreview(null)} className="text-gray-500 hover:text-gray-900 text-2xl">×</button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100">
              {preview.file_type?.includes('pdf') ? (
                <iframe src={preview.file_url} className="w-full h-[75vh]" />
              ) : (
                <img src={preview.file_url} alt={preview.nama_file} className="w-full h-auto" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============ ROSTER UPLOAD ============
function RosterUpload({ title }: any) {
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({ periode: '', site: '', departemen: '', keterangan: '' })
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<any[]>([])

  useEffect(() => { loadFiles() }, [])

  async function loadFiles() {
    const res = await fetch('/api/roster/list')
    const d = await res.json()
    setFiles(d.files || [])
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setMsg({ type: 'err', text: 'Pilih file dulu' }); return }
    setLoading(true); setMsg({ type: '', text: '' })

    const fd = new FormData()
    fd.append('file', file)
    fd.append('periode', form.periode)
    fd.append('site', form.site)
    fd.append('departemen', form.departemen)
    fd.append('keterangan', form.keterangan)

    try {
      const res = await fetch('/api/roster/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'err', text: data.error }); return }
      setMsg({ type: 'ok', text: data.message })
      setFile(null)
      setForm({ periode: '', site: '', departemen: '', keterangan: '' })
      loadFiles()
    } catch { setMsg({ type: 'err', text: 'Upload gagal' }) }
    finally { setLoading(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin hapus file roster ini?')) return
    const res = await fetch(`/api/roster/upload?id=${id}`, { method: 'DELETE' })
    const d = await res.json()
    alert(d.message || d.error)
    loadFiles()
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">📅 {title}</h2>
        <p className="text-sm text-gray-500 mt-1">Upload roster bulanan (PDF/Gambar) untuk karyawan lihat</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="font-bold text-gray-900 mb-4">📤 Upload Roster Baru</h3>
          {msg.text && <div className={`p-3 rounded-xl mb-4 text-sm ${msg.type === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>{msg.text}</div>}
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Periode <span className="text-red-500">*</span></label>
              <input type="text" required placeholder="Contoh: Januari 2026" value={form.periode} onChange={e => setForm({ ...form, periode: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Site (opsional)</label>
              <input type="text" placeholder="Contoh: Site A" value={form.site} onChange={e => setForm({ ...form, site: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border text-gray-900" />
              <div className="text-xs text-gray-500 mt-1">Kosongkan jika untuk semua site</div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Departemen (opsional)</label>
              <input type="text" placeholder="Contoh: Produksi" value={form.departemen} onChange={e => setForm({ ...form, departemen: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Keterangan (opsional)</label>
              <input type="text" value={form.keterangan} onChange={e => setForm({ ...form, keterangan: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">File PDF/PNG/JPG <span className="text-red-500">*</span></label>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full px-4 py-2.5 rounded-xl border text-gray-900" required />
              <div className="text-xs text-gray-500 mt-1">Max 10 MB</div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl">
              {loading ? 'Uploading...' : '📤 Upload Roster'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h3 className="font-bold text-gray-900 mb-4">📁 File Roster ({files.length})</h3>
          {files.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Belum ada file</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {files.map(f => (
                <div key={f.id} className="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50">
                  <div className="text-2xl">{f.file_type?.includes('pdf') ? '📄' : '🖼️'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{f.periode}</div>
                    <div className="text-xs text-gray-500 truncate">{f.site || 'Semua Site'} • {f.nama_file}</div>
                  </div>
                  <a href={f.file_url} target="_blank" rel="noopener" className="text-blue-600 hover:text-blue-800 text-sm">👁️</a>
                  <button onClick={() => handleDelete(f.id)} className="text-red-600 hover:text-red-800 text-sm">🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ IMPORT EXCEL ============
function ImportExcel({ title, table }: any) {
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [filterOptions, setFilterOptions] = useState<any>({})

  const [filters, setFilters] = useState<any>({
    site: '', departemen: '', status: '', jabatan: '',
    nrp: '', nama: '', periode_awal: '', periode_akhir: '',
    jenis_sp: '', kondisi: '', role: '',
    sort_by: '', sort_order: 'asc'
  })

  useEffect(() => {
    fetch(`/api/filter-options?table=${table}`)
      .then(r => r.json())
      .then(d => setFilterOptions(d))
  }, [table])

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setMsg({ type: 'err', text: 'Pilih file Excel dulu' }); return }
    setLoading(true); setMsg({ type: '', text: '' }); setDetails(null)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('table', table)

    try {
      const res = await fetch('/api/import-excel', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'err', text: data.error }); return }
      setMsg({ type: 'ok', text: data.message })
      setDetails(data.details)
      setFile(null)
    } catch { setMsg({ type: 'err', text: 'Import gagal' }) }
    finally { setLoading(false) }
  }

  function buildDownloadUrl(mode: 'empty' | 'sample' | 'export', useFilter: boolean = false) {
    let url = `/api/template-excel?table=${table}&mode=${mode}`
    if (useFilter && mode === 'export') {
      Object.keys(filters).forEach(key => {
        const val = filters[key]
        if (val) url += `&${key}=${encodeURIComponent(val)}`
      })
    }
    return url
  }

  function downloadTemplate(mode: 'empty' | 'sample' | 'export', useFilter: boolean = false) {
    window.open(buildDownloadUrl(mode, useFilter), '_blank')
  }

  function resetFilters() {
    setFilters({
      site: '', departemen: '', status: '', jabatan: '',
      nrp: '', nama: '', periode_awal: '', periode_akhir: '',
      jenis_sp: '', kondisi: '', role: '', sort_by: '', sort_order: 'asc'
    })
  }

  const activeFilterCount = Object.keys(filters).filter(k =>
    filters[k] && k !== 'sort_by' && k !== 'sort_order'
  ).length

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full"></div>
          <h2 className="text-2xl font-bold text-slate-900">📥 {title}</h2>
        </div>
        <p className="text-sm text-slate-500">Kelola data massal dari Excel untuk tabel <b>{table}</b></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-lg shadow-md">📄</div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Download Excel</h3>
              <p className="text-xs text-slate-500">Pilih jenis file yang mau diunduh</p>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-xs text-emerald-900">
            <p className="font-semibold mb-1">✨ Urutan Kolom Konsisten</p>
            <p>File yang di-download punya urutan kolom SAMA dengan template import.</p>
          </div>

          <div className="space-y-3">
            <button onClick={() => downloadTemplate('export')} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-base">
              <span className="text-lg">📊</span>
              <span>Download Semua Data</span>
            </button>

            <button onClick={() => setShowFilter(!showFilter)} className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${showFilter ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
              <span>{showFilter ? '🔽' : '▶️'}</span>
              <span>Download dengan Filter {activeFilterCount > 0 && `(${activeFilterCount} aktif)`}</span>
            </button>

            {showFilter && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-amber-900 text-sm">🔍 Filter Data</h4>
                  {activeFilterCount > 0 && (
                    <button onClick={resetFilters} className="text-xs text-red-600 hover:text-red-800 underline">Reset Semua</button>
                  )}
                </div>

                {table === 'employees' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Site</label>
                      <select value={filters.site} onChange={e => setFilters({ ...filters, site: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900">
                        <option value="">Semua Site</option>
                        {(filterOptions.sites || []).map((s: string) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Departemen</label>
                      <select value={filters.departemen} onChange={e => setFilters({ ...filters, departemen: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900">
                        <option value="">Semua Departemen</option>
                        {(filterOptions.departemens || []).map((d: string) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Status Karyawan</label>
                      <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900">
                        <option value="">Semua Status</option>
                        {(filterOptions.statuses || []).map((s: string) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Cari Jabatan</label>
                      <input type="text" value={filters.jabatan} onChange={e => setFilters({ ...filters, jabatan: e.target.value })} placeholder="Contoh: Operator" className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-amber-900 mb-1">Cari NRP</label>
                        <input type="text" value={filters.nrp} onChange={e => setFilters({ ...filters, nrp: e.target.value })} placeholder="1001" className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-amber-900 mb-1">Cari Nama</label>
                        <input type="text" value={filters.nama} onChange={e => setFilters({ ...filters, nama: e.target.value })} placeholder="Budi" className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900" />
                      </div>
                    </div>
                  </>
                )}

                {table === 'apd' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Cari NRP</label>
                      <input type="text" value={filters.nrp} onChange={e => setFilters({ ...filters, nrp: e.target.value })} placeholder="1001" className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Kondisi</label>
                      <select value={filters.kondisi} onChange={e => setFilters({ ...filters, kondisi: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900">
                        <option value="">Semua Kondisi</option>
                        <option value="Baik">Baik</option>
                        <option value="Rusak">Rusak</option>
                        <option value="Perlu Ganti">Perlu Ganti</option>
                      </select>
                    </div>
                  </>
                )}

                {table === 'pkwt' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Cari NRP</label>
                      <input type="text" value={filters.nrp} onChange={e => setFilters({ ...filters, nrp: e.target.value })} placeholder="1001" className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Status Kontrak</label>
                      <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900">
                        <option value="">Semua Status</option>
                        <option value="Aktif">Aktif</option>
                        <option value="Berakhir">Berakhir</option>
                        <option value="Diperpanjang">Diperpanjang</option>
                        <option value="Diputus">Diputus</option>
                      </select>
                    </div>
                  </>
                )}

                {table === 'kpi' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Cari NRP</label>
                      <input type="text" value={filters.nrp} onChange={e => setFilters({ ...filters, nrp: e.target.value })} placeholder="1001" className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-amber-900 mb-1">Periode Awal</label>
                        <input type="text" value={filters.periode_awal} onChange={e => setFilters({ ...filters, periode_awal: e.target.value })} placeholder="2025-01" className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-amber-900 mb-1">Periode Akhir</label>
                        <input type="text" value={filters.periode_akhir} onChange={e => setFilters({ ...filters, periode_akhir: e.target.value })} placeholder="2025-12" className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900" />
                      </div>
                    </div>
                  </>
                )}

                {table === 'sp' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Cari NRP</label>
                      <input type="text" value={filters.nrp} onChange={e => setFilters({ ...filters, nrp: e.target.value })} placeholder="1001" className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Jenis SP</label>
                      <select value={filters.jenis_sp} onChange={e => setFilters({ ...filters, jenis_sp: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900">
                        <option value="">Semua Jenis</option>
                        <option value="SP1">SP1</option>
                        <option value="SP2">SP2</option>
                        <option value="SP3">SP3</option>
                        <option value="PHK">PHK</option>
                      </select>
                    </div>
                  </>
                )}

                {table === 'roles' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Cari NRP</label>
                      <input type="text" value={filters.nrp} onChange={e => setFilters({ ...filters, nrp: e.target.value })} placeholder="1001" className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">Role</label>
                      <select value={filters.role} onChange={e => setFilters({ ...filters, role: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900">
                        <option value="">Semua Role</option>
                        <option value="karyawan">Karyawan</option>
                        <option value="atasan">Atasan</option>
                        <option value="pjo">PJO</option>
                        <option value="hrga">HRGA</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </>
                )}

                {table === 'approval_matrix' && (
                  <div>
                    <label className="block text-xs font-semibold text-amber-900 mb-1">Cari NRP Karyawan</label>
                    <input type="text" value={filters.nrp} onChange={e => setFilters({ ...filters, nrp: e.target.value })} placeholder="1001" className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900" />
                  </div>
                )}

                <div className="pt-3 border-t border-amber-300">
                  <label className="block text-xs font-semibold text-amber-900 mb-1">Urutkan berdasarkan</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={filters.sort_by} onChange={e => setFilters({ ...filters, sort_by: e.target.value })} placeholder="nrp / nama" className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900" />
                    <select value={filters.sort_order} onChange={e => setFilters({ ...filters, sort_order: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm text-slate-900">
                      <option value="asc">A-Z</option>
                      <option value="desc">Z-A</option>
                    </select>
                  </div>
                </div>

                <button onClick={() => downloadTemplate('export', true)} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-3 rounded-xl transition-all shadow-md mt-3">
                  📥 Download dengan Filter Ini
                </button>
              </div>
            )}

            <div className="text-center text-xs text-slate-400 py-1">atau template kosong</div>

            <button onClick={() => downloadTemplate('empty')} className="w-full bg-white border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
              <span>📄</span>
              <span>Template Kosong</span>
            </button>

            <button onClick={() => downloadTemplate('sample')} className="w-full bg-white border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
              <span>📋</span>
              <span>Template dengan Contoh</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-lg shadow-md">📤</div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Upload & Import</h3>
              <p className="text-xs text-slate-500">Upload file Excel untuk import</p>
            </div>
          </div>

          {msg.text && (
            <div className={`p-3 rounded-xl mb-4 text-sm ${msg.type === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {msg.text}
            </div>
          )}

          {details && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-4 text-sm">
              <div className="font-bold mb-2 text-blue-900">📊 Hasil Import:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                <div className="bg-white rounded-lg p-2 text-center">
                  <div className="text-xs text-slate-500">Baru</div>
                  <div className="text-lg font-bold text-emerald-600">{details.success}</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center">
                  <div className="text-xs text-slate-500">Di-skip</div>
                  <div className="text-lg font-bold text-amber-600">{details.skipped || 0}</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center">
                  <div className="text-xs text-slate-500">Gagal</div>
                  <div className="text-lg font-bold text-rose-600">{details.failed}</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center">
                  <div className="text-xs text-slate-500">Total</div>
                  <div className="text-lg font-bold text-slate-900">{details.total}</div>
                </div>
              </div>
              {details.skipped > 0 && (
                <div className="text-xs text-amber-800 bg-amber-50 rounded-lg p-2 mt-2">
                  💡 <b>{details.skipped} baris di-skip</b> karena sudah ada di database
                </div>
              )}
              {details.errors?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <div className="font-semibold text-red-700 mb-1">Contoh Error:</div>
                  {details.errors.map((e: string, i: number) => (
                    <div key={i} className="text-xs text-red-700 pl-2">• {e}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleImport} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Pilih File Excel (.xlsx atau .xls)</label>
              <input type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] || null)} required className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold hover:file:bg-blue-100" />
              {file && (
                <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                  <span>✓</span>
                  <span>File dipilih: <b>{file.name}</b></span>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading || !file} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
              {loading ? (
                <><span className="animate-spin">⏳</span><span>Mengimport...</span></>
              ) : (
                <><span>📥</span><span>Import Data</span></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ============ CHANGE LOGIN ============
function ChangeLoginView({ title }: any) {
  const [newNrp, setNewNrp] = useState('')
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMsg({ type: '', text: '' })
    try {
      const res = await fetch('/api/profile/change-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_nrp_login: newNrp })
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'err', text: data.error }); return }
      setMsg({ type: 'ok', text: data.message })
      setNewNrp('')
    } catch { setMsg({ type: 'err', text: 'Gagal' }) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🔑 {title}</h2>
        <p className="text-sm text-gray-500 mt-1">Ganti NRP untuk login. NRP asli tetap tersimpan di HRGA.</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-lg">
        {msg.text && <div className={`p-3 rounded-xl mb-4 text-sm ${msg.type === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>{msg.text}</div>}
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl mb-4 text-xs text-yellow-800">
          ⚠️ Setelah diubah, Anda harus <b>logout dan login ulang</b> dengan NRP login baru.
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">NRP Login Baru</label>
            <input type="text" required minLength={3} value={newNrp} onChange={e => setNewNrp(e.target.value)} placeholder="Minimal 3 karakter" className="w-full px-4 py-2.5 rounded-xl border text-gray-900" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl">
            {loading ? 'Menyimpan...' : '🔑 Ubah NRP Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ============ ABSENSI CLOCK ============
function AbsensiClockView({ title }: any) {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [gpsStatus, setGpsStatus] = useState<'checking' | 'ready' | 'error'>('checking')
  const [gpsLocation, setGpsLocation] = useState<{ lat: number, lng: number } | null>(null)
  const [gpsError, setGpsError] = useState('')

  useEffect(() => {
    loadStatus()
    checkGPS()
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  async function loadStatus() {
    try {
      const res = await fetch('/api/attendance/status')
      const data = await res.json()
      setStatus(data)
    } catch { setMsg({ type: 'err', text: 'Gagal load status' }) }
    finally { setLoading(false) }
  }

  function checkGPS() {
    if (!navigator.geolocation) {
      setGpsStatus('error')
      setGpsError('Browser tidak support GPS')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsStatus('ready')
      },
      (err) => {
        setGpsStatus('error')
        if (err.code === 1) setGpsError('Izin GPS ditolak. Aktifkan di setting browser.')
        else if (err.code === 2) setGpsError('GPS tidak tersedia. Coba di luar ruangan.')
        else if (err.code === 3) setGpsError('Timeout mengambil GPS.')
        else setGpsError('Error GPS: ' + err.message)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  async function handleClockIn() {
    if (!gpsLocation) {
      setMsg({ type: 'err', text: 'GPS belum siap. Aktifkan GPS dan refresh.' })
      return
    }
    setProcessing(true); setMsg({ type: '', text: '' })

    try {
      const res = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: gpsLocation.lat, longitude: gpsLocation.lng })
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'err', text: data.error }); return }
      setMsg({ type: 'ok', text: data.message })
      loadStatus()
    } catch { setMsg({ type: 'err', text: 'Terjadi kesalahan' }) }
    finally { setProcessing(false) }
  }

  async function handleClockOut() {
    if (!gpsLocation) {
      setMsg({ type: 'err', text: 'GPS belum siap. Aktifkan GPS dan refresh.' })
      return
    }
    if (!confirm('Yakin clock out sekarang? Setelah clock out tidak bisa dibatalkan.')) return

    setProcessing(true); setMsg({ type: '', text: '' })

    try {
      const res = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: gpsLocation.lat, longitude: gpsLocation.lng })
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'err', text: data.error }); return }
      setMsg({ type: 'ok', text: data.message })
      loadStatus()
    } catch { setMsg({ type: 'err', text: 'Terjadi kesalahan' }) }
    finally { setProcessing(false) }
  }

  if (loading) return <div className="text-center py-8 text-slate-500">Memuat...</div>

  const today = status?.today
  const hasClockIn = today && today.clock_in
  const hasClockOut = today && today.clock_out
  const stats = status?.stats || {}
  const siteConfig = status?.site_config

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full"></div>
          <h2 className="text-2xl font-bold text-slate-900">⏰ {title}</h2>
        </div>
        <p className="text-sm text-slate-500">Clock in / Clock out untuk mencatat kehadiran</p>
      </div>

      {msg.text && (
        <div className={`p-3 rounded-xl mb-4 text-sm ${msg.type === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg text-white p-6">
          <div className="text-center mb-6">
            <div className="text-sm text-slate-400 mb-1">Waktu Sekarang</div>
            <div className="text-4xl md:text-5xl font-bold text-white tracking-wider">
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-sm text-amber-400 mt-1">
              {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div className={`p-3 rounded-xl mb-4 text-sm ${
            gpsStatus === 'ready' ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300' :
            gpsStatus === 'error' ? 'bg-red-500/20 border border-red-500 text-red-300' :
            'bg-yellow-500/20 border border-yellow-500 text-yellow-300'
          }`}>
            <div className="flex items-center gap-2">
              <span>{gpsStatus === 'ready' ? '📍' : gpsStatus === 'error' ? '❌' : '⏳'}</span>
              <span className="font-semibold">
                {gpsStatus === 'ready' ? 'GPS Aktif' : gpsStatus === 'error' ? 'GPS Error' : 'Cek GPS...'}
              </span>
            </div>
            {gpsStatus === 'ready' && (
              <div className="text-xs mt-1 opacity-80">
                Koordinat: {gpsLocation?.lat.toFixed(6)}, {gpsLocation?.lng.toFixed(6)}
              </div>
            )}
            {gpsStatus === 'error' && (
              <div className="text-xs mt-1">
                {gpsError}
                <button onClick={checkGPS} className="underline ml-2">Coba lagi</button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {!hasClockIn ? (
              <button onClick={handleClockIn} disabled={processing || gpsStatus !== 'ready'} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg text-lg flex items-center justify-center gap-2">
                {processing ? (
                  <><span className="animate-spin">⏳</span> Memproses...</>
                ) : (
                  <>🟢 CLOCK IN Sekarang</>
                )}
              </button>
            ) : !hasClockOut ? (
              <button onClick={handleClockOut} disabled={processing || gpsStatus !== 'ready'} className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg text-lg flex items-center justify-center gap-2">
                {processing ? (
                  <><span className="animate-spin">⏳</span> Memproses...</>
                ) : (
                  <>🔴 CLOCK OUT</>
                )}
              </button>
            ) : (
              <div className="bg-emerald-500/20 border border-emerald-500 rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">✅</div>
                <div className="text-white font-bold">Absensi Selesai</div>
                <div className="text-xs text-slate-300 mt-1">Sudah clock in & clock out hari ini</div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span>📋</span>
            <span>Status Hari Ini</span>
          </h3>

          {hasClockIn ? (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="text-xs text-emerald-600 font-semibold">🟢 CLOCK IN</div>
                <div className="text-lg font-bold text-slate-900">
                  {new Date(today.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Shift: <b>{today.shift}</b> • Status: <span className={`font-bold ${today.status === 'HADIR' ? 'text-emerald-600' : today.status === 'TERLAMBAT' ? 'text-orange-600' : 'text-red-600'}`}>{today.status}</span>
                </div>
                {today.terlambat_menit > 0 && (
                  <div className="text-xs text-orange-600 mt-1">
                    Terlambat {today.terlambat_menit} menit
                  </div>
                )}
              </div>

              {hasClockOut ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <div className="text-xs text-red-600 font-semibold">🔴 CLOCK OUT</div>
                  <div className="text-lg font-bold text-slate-900">
                    {new Date(today.clock_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Total kerja: <b>{Math.floor((today.jam_kerja_menit || 0) / 60)}j {(today.jam_kerja_menit || 0) % 60}m</b>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <div className="text-xs text-yellow-600 font-semibold">⏳ Belum Clock Out</div>
                  <div className="text-xs text-slate-500 mt-1">Jangan lupa clock out sebelum pulang</div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-6 text-center">
              <div className="text-4xl mb-2">📭</div>
              <div className="font-semibold text-slate-700">Belum Absen Hari Ini</div>
              <div className="text-xs text-slate-500 mt-1">Klik tombol CLOCK IN di sebelah kiri</div>
            </div>
          )}

          {siteConfig && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500 mb-2">📍 Jam Kerja Site Anda:</div>
              <div className="text-xs text-slate-700 space-y-1">
                <div>Shift SIANG: <b>{siteConfig.siang_jam_masuk?.slice(0,5)}</b> - <b>{siteConfig.siang_jam_pulang?.slice(0,5)}</b></div>
                <div>Shift MALAM: <b>{siteConfig.malam_jam_masuk?.slice(0,5)}</b> - <b>{siteConfig.malam_jam_pulang?.slice(0,5)}</b></div>
                <div>Batas telat: <b>{siteConfig.siang_batas_telat} menit</b></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span>📊</span>
          <span>Statistik Bulan Ini ({stats.total || 0} hari)</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatBox icon="✅" label="Hadir" value={stats.hadir || 0} color="emerald" />
          <StatBox icon="⏰" label="Terlambat" value={stats.terlambat || 0} color="orange" />
          <StatBox icon="🕐" label="1/2 Hari" value={stats.setengah_hari || 0} color="yellow" />
          <StatBox icon="❌" label="Alpha" value={stats.alpha || 0} color="red" />
          <StatBox icon="🏖️" label="Cuti" value={stats.cuti || 0} color="blue" />
          <StatBox icon="🤒" label="Sakit" value={stats.sakit || 0} color="pink" />
          <StatBox icon="📝" label="Izin" value={stats.izin || 0} color="purple" />
        </div>
      </div>
    </div>
  )
}

function StatBox({ icon, label, value, color }: any) {
  const colorMap: any = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700'
  }
  return (
    <div className={`border rounded-xl p-3 text-center ${colorMap[color] || 'bg-slate-50'}`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  )
}

// ============ FORM LEMBUR ============
function FormLemburView({ title, onSuccess }: any) {
  const [form, setForm] = useState({
    tanggal: '', jam_mulai: '', jam_selesai: '',
    jenis_lembur: 'BIASA', alasan: '', atasan_nrp: ''
  })
  const [atasanList, setAtasanList] = useState<any[]>([])
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/overtime/atasan-list')
      .then(r => r.json())
      .then(d => setAtasanList(d.atasan_list || []))
  }, [])

  const hitungJam = () => {
    if (!form.jam_mulai || !form.jam_selesai) return 0
    const [sH, sM] = form.jam_mulai.split(':').map(Number)
    const [eH, eM] = form.jam_selesai.split(':').map(Number)
    let totalMenit = (eH * 60 + eM) - (sH * 60 + sM)
    if (totalMenit < 0) totalMenit += 1440
    return Math.round((totalMenit / 60) * 100) / 100
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMsg({ type: '', text: '' })
    try {
      const res = await fetch('/api/overtime/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'err', text: data.error }); return }
      setMsg({ type: 'ok', text: data.message })
      setForm({ tanggal: '', jam_mulai: '', jam_selesai: '', jenis_lembur: 'BIASA', alasan: '', atasan_nrp: '' })
    } catch { setMsg({ type: 'err', text: 'Terjadi kesalahan' }) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full"></div>
          <h2 className="text-2xl font-bold text-slate-900">⏱️ {title}</h2>
        </div>
        <p className="text-sm text-slate-500">Isi form untuk mengajukan lembur ke atasan</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-2xl">
        {msg.text && (
          <div className={`p-3 rounded-xl mb-4 text-sm ${msg.type === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Tanggal Lembur</label>
            <input type="date" required value={form.tanggal} onChange={e => setForm({ ...form, tanggal: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-900" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Jam Mulai</label>
              <input type="time" required value={form.jam_mulai} onChange={e => setForm({ ...form, jam_mulai: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-amber-500 text-slate-900" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Jam Selesai</label>
              <input type="time" required value={form.jam_selesai} onChange={e => setForm({ ...form, jam_selesai: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-amber-500 text-slate-900" />
            </div>
          </div>

          {hitungJam() > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-sm">
              ⏱️ Total lembur: <b>{hitungJam()} jam</b>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Jenis Lembur</label>
            <select required value={form.jenis_lembur} onChange={e => setForm({ ...form, jenis_lembur: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-amber-500 text-slate-900">
              <option value="BIASA">Lembur Hari Biasa</option>
              <option value="LIBUR">Lembur Hari Libur</option>
              <option value="HARI_BESAR">Lembur Hari Besar</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Pilih Atasan yang Menyetujui</label>
            <select required value={form.atasan_nrp} onChange={e => setForm({ ...form, atasan_nrp: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-amber-500 text-slate-900">
              <option value="">-- Pilih Atasan --</option>
              {atasanList.map((a: any) => (
                <option key={a.nrp} value={a.nrp}>{a.nama} - {a.jabatan} ({a.site})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Alasan Lembur</label>
            <textarea required value={form.alasan} onChange={e => setForm({ ...form, alasan: e.target.value })} placeholder="Jelaskan alasan lembur" className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-amber-500 min-h-[100px] text-slate-900" />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold py-3 rounded-xl transition-all shadow-md">
            {loading ? 'Mengirim...' : '⏱️ Kirim Pengajuan Lembur'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ============ EXPORT ABSENSI ============
function ExportAbsensiView({ title }: any) {
  const [filters, setFilters] = useState({
    tanggal_mulai: '', tanggal_selesai: '',
    site: '', nrp: '', status: ''
  })
  const [sites, setSites] = useState<string[]>([])
  const [msg, setMsg] = useState({ type: '', text: '' })

  useEffect(() => {
    fetch('/api/filter-options?table=employees')
      .then(r => r.json())
      .then(d => setSites(d.sites || []))
  }, [])

  function handleExport() {
    if (!filters.tanggal_mulai || !filters.tanggal_selesai) {
      setMsg({ type: 'err', text: 'Tanggal mulai & tanggal selesai wajib diisi' })
      return
    }

    setMsg({ type: 'ok', text: '📥 Mendownload file Excel...' })

    let url = '/api/export-absensi?'
    Object.keys(filters).forEach(k => {
      const val = (filters as any)[k]
      if (val) url += `${k}=${encodeURIComponent(val)}&`
    })

    window.open(url, '_blank')

    setTimeout(() => setMsg({ type: '', text: '' }), 3000)
  }

  function setBulanIni() {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setFilters({
      ...filters,
      tanggal_mulai: firstDay.toISOString().split('T')[0],
      tanggal_selesai: lastDay.toISOString().split('T')[0]
    })
  }

  function setBulanLalu() {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
    setFilters({
      ...filters,
      tanggal_mulai: firstDay.toISOString().split('T')[0],
      tanggal_selesai: lastDay.toISOString().split('T')[0]
    })
  }

  function setMingguIni() {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    setFilters({
      ...filters,
      tanggal_mulai: monday.toISOString().split('T')[0],
      tanggal_selesai: sunday.toISOString().split('T')[0]
    })
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full"></div>
          <h2 className="text-2xl font-bold text-slate-900">📥 {title}</h2>
        </div>
        <p className="text-sm text-slate-500">Export laporan absensi karyawan ke Excel dengan filter</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-3xl">
        {msg.text && (
          <div className={`p-3 rounded-xl mb-4 text-sm ${msg.type === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {msg.text}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-900">
          <p className="font-semibold mb-1">💡 Quick Filter:</p>
          <div className="flex gap-2 flex-wrap mt-2">
            <button onClick={setMingguIni} className="bg-white hover:bg-amber-100 border border-amber-300 text-amber-700 px-3 py-1 rounded-lg text-xs font-semibold">📅 Minggu Ini</button>
            <button onClick={setBulanIni} className="bg-white hover:bg-amber-100 border border-amber-300 text-amber-700 px-3 py-1 rounded-lg text-xs font-semibold">📆 Bulan Ini</button>
            <button onClick={setBulanLalu} className="bg-white hover:bg-amber-100 border border-amber-300 text-amber-700 px-3 py-1 rounded-lg text-xs font-semibold">🗓️ Bulan Lalu</button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Tanggal Mulai <span className="text-red-500">*</span>
              </label>
              <input type="date" value={filters.tanggal_mulai} onChange={e => setFilters({ ...filters, tanggal_mulai: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-blue-500 text-slate-900" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Tanggal Selesai <span className="text-red-500">*</span>
              </label>
              <input type="date" value={filters.tanggal_selesai} onChange={e => setFilters({ ...filters, tanggal_selesai: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-blue-500 text-slate-900" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Site (opsional)</label>
              <select value={filters.site} onChange={e => setFilters({ ...filters, site: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-blue-500 text-slate-900">
                <option value="">Semua Site</option>
                {sites.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">NRP (opsional)</label>
              <input type="text" placeholder="Contoh: 10001" value={filters.nrp} onChange={e => setFilters({ ...filters, nrp: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-blue-500 text-slate-900" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Status (opsional)</label>
              <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:ring-2 focus:ring-blue-500 text-slate-900">
                <option value="">Semua Status</option>
                <option value="HADIR">Hadir</option>
                <option value="TERLAMBAT">Terlambat</option>
                <option value="SETENGAH_HARI">Setengah Hari</option>
                <option value="ALPHA">Alpha</option>
                <option value="CUTI">Cuti</option>
                <option value="SAKIT">Sakit</option>
                <option value="IZIN">Izin</option>
              </select>
            </div>
          </div>

          <button onClick={handleExport} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-base">
            <span className="text-lg">📥</span>
            <span>Download Laporan Excel</span>
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
          <p className="font-semibold mb-1">📄 File Excel akan berisi:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Sheet <b>Data Absensi</b>: tanggal, NRP, nama, jam masuk-pulang, status, lokasi</li>
            <li>Sheet <b>Ringkasan</b>: total data, filter yang dipakai, statistik status</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// ============ TABLE VIEW ============
function TableView({ data, onReload }: any) {
  const { title, rows = [], columns = [], total = 0, table, access_mode } = data
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const [formModal, setFormModal] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)

  const showApproval = access_mode === 'APPROVAL_ATASAN' || access_mode === 'APPROVAL_PJO'
  const showApprovalLembur = access_mode === 'APPROVAL_LEMBUR' || access_mode === 'APPROVAL_LEMBUR_PJO'
  const showTracking = table === 'leave_requests'
  const showCrud = access_mode === 'CRUD'

  useEffect(() => {
    setSelectedIds([])
  }, [rows])

  function toggleSelect(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  function toggleSelectAll() {
    if (selectedIds.length === rows.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(rows.map((r: any) => r.id).filter(Boolean))
    }
  }

  const isAllSelected = rows.length > 0 && selectedIds.length === rows.length
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < rows.length

  async function handleBulkDelete() {
    if (selectedIds.length === 0) {
      alert('❌ Pilih minimal 1 data')
      return
    }

    if (!confirm(`⚠️ Yakin hapus ${selectedIds.length} data terpilih?\n\nAksi ini TIDAK BISA dibatalkan.`)) return

    setBulkLoading(true)
    try {
      const res = await fetch('/api/crud', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, ids: selectedIds, action: 'bulk_delete' })
      })
      const data = await res.json()

      if (!res.ok) {
        alert('❌ ' + (data.error || 'Gagal hapus'))
        return
      }

      alert(data.message || `✅ ${selectedIds.length} data berhasil dihapus`)
      setSelectedIds([])
      onReload()
    } catch {
      alert('❌ Terjadi kesalahan')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-start flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 mt-1">Menampilkan <b>{total}</b> data</p>
        </div>
        <div className="flex gap-2">
          {showCrud && (
            <button onClick={() => setFormModal({ mode: 'create' })} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-md">
              + Tambah Baru
            </button>
          )}
        </div>
      </div>

      {showCrud && selectedIds.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 mb-4 flex items-center justify-between flex-wrap gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-md">
              {selectedIds.length}
            </div>
            <div>
              <div className="font-bold text-amber-900">{selectedIds.length} data terpilih</div>
              <div className="text-xs text-amber-700">Pilih aksi yang mau dilakukan pada data terpilih</div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setSelectedIds([])} className="bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm">
              Batal Pilih
            </button>
            <button onClick={handleBulkDelete} disabled={bulkLoading} className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-400 disabled:to-slate-400 text-white font-semibold px-4 py-2 rounded-xl text-sm shadow-md flex items-center gap-2">
              {bulkLoading ? (
                <><span className="animate-spin">⏳</span> Menghapus...</>
              ) : (
                <>🗑️ Hapus {selectedIds.length} Data</>
              )}
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <div className="text-slate-500">Belum ada data</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  {showCrud && (
                    <th className="px-4 py-3 text-left w-12">
                      <input type="checkbox" checked={isAllSelected} ref={(input) => { if (input) input.indeterminate = isSomeSelected }} onChange={toggleSelectAll} className="w-5 h-5 rounded border-2 border-slate-300 text-amber-600 focus:ring-2 focus:ring-amber-500 cursor-pointer" title="Pilih semua" />
                    </th>
                  )}
                  {columns.map((col: string) => (
                    <th key={col} className="px-4 py-3 text-left font-semibold text-slate-700 whitespace-nowrap">
                      {formatColumnName(col)}
                    </th>
                  ))}
                  {(showApproval || showApprovalLembur || showTracking || showCrud) && (
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, i: number) => (
                  <tr key={i} className={`hover:bg-slate-50 border-b transition-colors ${selectedIds.includes(row.id) ? 'bg-amber-50 hover:bg-amber-100' : ''}`}>
                    {showCrud && (
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelect(row.id)} className="w-5 h-5 rounded border-2 border-slate-300 text-amber-600 focus:ring-2 focus:ring-amber-500 cursor-pointer" />
                      </td>
                    )}
                    {columns.map((col: string) => (
                      <td key={col} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {renderCell(col, row[col])}
                      </td>
                    ))}
                    {(showApproval || showApprovalLembur || showTracking || showCrud) && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2">
                          {showTracking && row.id && (
                            <button onClick={() => setTrackingId(row.id)} className="bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                              📋 Track
                            </button>
                          )}
                          {showApproval && row.id && (
                            <>
                              <button onClick={() => handleApprove(row.id, 'APPROVED', onReload)} className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">✓</button>
                              <button onClick={() => handleApprove(row.id, 'REJECTED', onReload)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">✗</button>
                            </>
                          )}
                          {showApprovalLembur && row.id && (
                            <>
                              <button onClick={() => handleApproveLembur(row.id, 'APPROVED', onReload)} className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">✓ Approve</button>
                              <button onClick={() => handleApproveLembur(row.id, 'REJECTED', onReload)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">✗ Reject</button>
                            </>
                          )}
                          {showCrud && row.id && (
                            <>
                              <button onClick={() => setFormModal({ mode: 'edit', row })} className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">✏️</button>
                              <button onClick={() => handleDelete(table, row.id, onReload)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">🗑️</button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showCrud && rows.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex items-center justify-between text-xs text-slate-500">
              <div>💡 <b>Tips:</b> Centang checkbox untuk pilih beberapa data, lalu klik tombol hapus massal di atas</div>
              <div>{selectedIds.length > 0 ? `${selectedIds.length} dari ${rows.length} terpilih` : `${rows.length} data`}</div>
            </div>
          )}
        </div>
      )}

      {trackingId && <TrackingModal leaveId={trackingId} onClose={() => setTrackingId(null)} />}
      {formModal && table && (
        <CrudModal table={table} mode={formModal.mode} row={formModal.row} onClose={() => setFormModal(null)} onSuccess={() => { setFormModal(null); onReload() }} />
      )}
    </div>
  )
}

// ============ CRUD MODAL ============
function CrudModal({ table, mode, row, onClose, onSuccess }: any) {
  const [fields, setFields] = useState<any[]>([])
  const [values, setValues] = useState<any>({})
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/schema?table=${table}`).then(r => r.json()).then(d => {
      setFields(d.fields || [])
      const init: any = {}
      d.fields?.forEach((f: any) => {
        let v = mode === 'edit' && row ? row[f.key] : (f.type === 'checkbox' ? true : '')
        if (f.type === 'date' && v) v = String(v).split('T')[0]
        init[f.key] = v ?? ''
      })
      setValues(init); setLoading(false)
    })
  }, [table, mode, row])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg({ type: '', text: '' })
    try {
      const body = mode === 'create' ? { table, values } : { table, id: row.id, values }
      const res = await fetch('/api/crud', {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ type: 'err', text: data.error }); return }
      setMsg({ type: 'ok', text: data.message })
      setTimeout(onSuccess, 800)
    } catch { setMsg({ type: 'err', text: 'Error' }) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold text-gray-900">{mode === 'create' ? '➕ Tambah' : '✏️ Edit'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {msg.text && <div className={`p-3 rounded-xl text-sm ${msg.type === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>{msg.text}</div>}
          {loading ? <div className="text-center py-8 text-gray-500">Memuat...</div> : (
            <div className="space-y-4">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{f.label} {f.required && <span className="text-red-500">*</span>}</label>
                  {f.type === 'textarea' ? (
                    <textarea required={f.required} value={values[f.key] || ''} onChange={e => setValues({ ...values, [f.key]: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border min-h-[80px] text-gray-900" />
                  ) : f.type === 'select' ? (
                    <select required={f.required} value={values[f.key] || ''} onChange={e => setValues({ ...values, [f.key]: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border text-gray-900">
                      <option value="">-- Pilih --</option>
                      {f.options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={values[f.key] === true || values[f.key] === 'true'} onChange={e => setValues({ ...values, [f.key]: e.target.checked })} className="w-5 h-5" />
                      <span className="text-sm text-gray-700">Aktif</span>
                    </label>
                  ) : (
                    <input type={f.type} required={f.required} value={values[f.key] || ''} onChange={e => setValues({ ...values, [f.key]: e.target.value })} placeholder={f.placeholder} className="w-full px-4 py-2.5 rounded-xl border text-gray-900" />
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-xl">Batal</button>
            <button type="submit" disabled={saving || loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============ TRACKING MODAL ============
function TrackingModal({ leaveId, onClose }: any) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/leave/tracking?id=${leaveId}`).then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [leaveId])

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-xl font-bold text-gray-900">📋 Tracking Cuti</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-2xl">×</button>
        </div>
        <div className="p-6">
          {loading ? <div className="text-center text-gray-500 py-8">Memuat...</div> : data?.leave ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm text-gray-500 mb-1">Karyawan</div>
                <div className="font-bold text-gray-900">{data.employee?.nama} ({data.leave.nrp})</div>
                <div className="text-sm text-gray-600 mt-1">{data.employee?.jabatan} • {data.employee?.departemen} • {data.employee?.site}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500">Mulai</div><div className="font-semibold text-gray-900">{new Date(data.leave.tanggal_mulai).toLocaleDateString('id-ID')}</div></div>
                <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500">Selesai</div><div className="font-semibold text-gray-900">{new Date(data.leave.tanggal_selesai).toLocaleDateString('id-ID')}</div></div>
                <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500">Hari</div><div className="font-semibold text-gray-900">{data.leave.jumlah_hari} hari</div></div>
                <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500">Jenis</div><div className="font-semibold text-gray-900">{data.leave.jenis_cuti}</div></div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3"><div className="text-xs text-gray-500 mb-1">Alasan</div><div className="text-sm text-gray-900">{data.leave.alasan}</div></div>
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-3">🔄 Timeline Approval</div>
                <div className="space-y-3">
                  <TimelineItem icon="📤" title="Pengajuan Diajukan" subtitle={`Oleh: ${data.employee?.nama}`} date={data.leave.created_at} status="done" />
                  <TimelineItem icon={data.leave.status_atasan === 'APPROVED' ? '✅' : data.leave.status_atasan === 'REJECTED' ? '❌' : '⏳'} title={`Approval Atasan (${data.atasan_nama})`} subtitle={data.leave.catatan_atasan || (data.leave.status_atasan === 'PENDING' ? 'Menunggu...' : '')} date={data.leave.tanggal_approval_atasan} status={data.leave.status_atasan === 'APPROVED' ? 'done' : data.leave.status_atasan === 'REJECTED' ? 'rejected' : 'pending'} />
                  <TimelineItem icon={data.leave.status_pjo === 'APPROVED' ? '✅' : data.leave.status_pjo === 'REJECTED' ? '❌' : data.leave.status_pjo === 'PENDING' ? '⏳' : '⏸️'} title={`Approval PJO (${data.pjo_nama})`} subtitle={data.leave.catatan_pjo || (data.leave.status_pjo === 'PENDING' ? 'Menunggu...' : 'Menunggu atasan dulu')} date={data.leave.tanggal_approval_pjo} status={data.leave.status_pjo === 'APPROVED' ? 'done' : data.leave.status_pjo === 'REJECTED' ? 'rejected' : 'pending'} />
                  <TimelineItem icon={data.leave.status_final === 'DISETUJUI' ? '🎉' : data.leave.status_final.includes('DITOLAK') ? '❌' : '⏳'} title="Status Final" subtitle={data.leave.status_final.replace(/_/g, ' ')} date={data.leave.updated_at} status={data.leave.status_final === 'DISETUJUI' ? 'done' : data.leave.status_final.includes('DITOLAK') ? 'rejected' : 'pending'} />
                </div>
              </div>
            </div>
          ) : <div className="text-red-600 text-center py-8">Data tidak ditemukan</div>}
        </div>
      </div>
    </div>
  )
}

function TimelineItem({ icon, title, subtitle, date, status }: any) {
  const cm: any = { done: 'bg-green-50 border-green-200', rejected: 'bg-red-50 border-red-200', pending: 'bg-yellow-50 border-yellow-200' }
  return (
    <div className={`flex gap-3 p-3 rounded-xl border ${cm[status] || 'bg-gray-50'}`}>
      <div className="text-2xl">{icon}</div>
      <div className="flex-1">
        <div className="font-semibold text-gray-900 text-sm">{title}</div>
        {subtitle && <div className="text-xs text-gray-600 mt-0.5">{subtitle}</div>}
        {date && <div className="text-xs text-gray-500 mt-1">{new Date(date).toLocaleString('id-ID')}</div>}
      </div>
    </div>
  )
}

// ============ HANDLERS ============
async function handleApprove(id: string, action: string, onReload: () => void) {
  let catatan = ''
  if (action === 'REJECTED') { catatan = prompt('Catatan penolakan:') || ''; if (!catatan.trim()) { alert('❌ Catatan wajib'); return } }
  else catatan = prompt('Catatan (opsional):') || ''

  try {
    const res = await fetch('/api/leave/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leave_id: id, action, catatan }) })
    const d = await res.json()
    if (!res.ok) { alert('❌ ' + d.error); return }
    alert(d.message); onReload()
  } catch { alert('❌ Error') }
}

async function handleApproveLembur(id: string, action: string, onReload: () => void) {
  let catatan = ''
  if (action === 'REJECTED') {
    catatan = prompt('Catatan penolakan lembur:') || ''
    if (!catatan.trim()) { alert('❌ Catatan wajib diisi'); return }
  } else {
    catatan = prompt('Catatan approval (opsional):') || ''
  }

  try {
    const res = await fetch('/api/overtime/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overtime_id: id, action, catatan })
    })
    const d = await res.json()
    if (!res.ok) { alert('❌ ' + d.error); return }
    alert(d.message); onReload()
  } catch { alert('❌ Error') }
}

async function handleDelete(table: string, id: string, onReload: () => void) {
  if (!confirm('⚠️ Yakin hapus?')) return
  try {
    const res = await fetch(`/api/crud?table=${table}&id=${id}`, { method: 'DELETE' })
    const d = await res.json()
    if (!res.ok) { alert('❌ ' + d.error); return }
    alert(d.message); onReload()
  } catch { alert('❌ Error') }
}

// ============ UTILS ============
function formatColumnName(col: string): string {
  // Label khusus untuk kolom nama yang di-enrich
  const specialLabels: Record<string, string> = {
    '_nama': 'Nama Karyawan',
    '_nama_employee': 'Nama Karyawan',
    '_nama_atasan': 'Nama Atasan',
    '_nama_pjo': 'Nama PJO',
    '_jabatan': 'Jabatan',
    'nrp': 'NRP',
    'employee_nrp': 'NRP Karyawan',
    'atasan_nrp': 'NRP Atasan',
    'pjo_nrp': 'NRP PJO',
    'clock_in': 'Jam Masuk',
    'clock_out': 'Jam Pulang',
    'clock_in_lat': 'Latitude Masuk',
    'clock_in_lng': 'Longitude Masuk',
    'clock_in_lokasi': 'Lokasi Masuk',
    'clock_out_lat': 'Latitude Pulang',
    'clock_out_lng': 'Longitude Pulang',
    'clock_out_lokasi': 'Lokasi Pulang',
    'jam_kerja_menit': 'Jam Kerja',
    'terlambat_menit': 'Terlambat',
    'jumlah_hari': 'Jumlah Hari',
    'jenis_cuti': 'Jenis Cuti',
    'jenis_lembur': 'Jenis Lembur',
    'jenis_sp': 'Jenis SP',
    'total_jam': 'Total Jam',
    'jam_mulai': 'Jam Mulai',
    'jam_selesai': 'Jam Selesai',
    'no_hp': 'No. HP',
    'no_kontrak': 'No. Kontrak',
    'nrp_login': 'NRP Login',
    'status_karyawan': 'Status',
    'status_atasan': 'Status Atasan',
    'status_pjo': 'Status PJO',
    'status_final': 'Status Final',
    'catatan_atasan': 'Catatan Atasan',
    'catatan_pjo': 'Catatan PJO',
    'tanggal_mulai': 'Tanggal Mulai',
    'tanggal_selesai': 'Tanggal Selesai',
    'tanggal_masuk': 'Tanggal Masuk',
    'tanggal_lahir': 'Tanggal Lahir',
    'tanggal_terima': 'Tanggal Terima',
    'tanggal_sp': 'Tanggal SP',
    'tanggal_expired': 'Tanggal Expired',
    'tanggal_approval_atasan': 'Tanggal Approve Atasan',
    'tanggal_approval_pjo': 'Tanggal Approve PJO',
    'tempat_lahir': 'Tempat Lahir',
    'mulai_kontrak': 'Mulai Kontrak',
    'akhir_kontrak': 'Akhir Kontrak',
    'kontrak_ke': 'Kontrak Ke-',
    'berlaku_sampai': 'Berlaku Sampai',
    'nama_barang': 'Nama Barang',
    'nilai_kpi': 'Nilai KPI',
    'nama_site': 'Nama Site',
    'nama_file': 'Nama File',
    'file_url': 'URL File',
    'file_type': 'Tipe File',
    'file_size': 'Ukuran File',
    'uploaded_by': 'Di-upload Oleh',
    'siang_jam_masuk': 'Siang - Masuk',
    'siang_jam_pulang': 'Siang - Pulang',
    'siang_batas_telat': 'Siang - Batas Telat',
    'malam_jam_masuk': 'Malam - Masuk',
    'malam_jam_pulang': 'Malam - Pulang',
    'malam_batas_telat': 'Malam - Batas Telat',
    'radius_meter': 'Radius (m)',
    'target_table': 'Tabel Target',
    'access_mode': 'Mode Akses',
    'menu_key': 'Menu Key',
    'menu_label': 'Menu Label',
    'menu_icon': 'Icon',
    'menu_group': 'Group',
    'sort_order': 'Urutan',
  }

  if (specialLabels[col]) return specialLabels[col]
  return col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function renderCell(col: string, value: any) {
  if (value === null || value === undefined || value === '') return <span className="text-gray-300">-</span>

  // Nama karyawan → tampil bold
  if (col === '_nama' || col === '_nama_employee' || col === '_nama_atasan' || col === '_nama_pjo') {
    return <span className="font-semibold text-slate-900">{String(value)}</span>
  }

  // NRP → tampil kecil dan abu-abu
  if (col === 'nrp' || col === 'employee_nrp' || col === 'atasan_nrp' || col === 'pjo_nrp' || col === 'nrp_login') {
    return <span className="text-xs text-slate-500 font-mono">{String(value)}</span>
  }

  const statusCols = ['status_atasan', 'status_pjo', 'status_final', 'status', 'status_karyawan', 'shift', 'jenis_sp', 'kondisi', 'jenis_lembur']
  if (statusCols.includes(col)) return <StatusBadge value={String(value)} />

  if (typeof value === 'boolean') return value ? <span className="text-green-600">✓</span> : <span className="text-gray-400">✗</span>

  // Clock In/Out → format jam
  if (col === 'clock_in' || col === 'clock_out') {
    try {
      const d = new Date(value)
      if (!isNaN(d.getTime())) {
        return (
          <div className="text-sm">
            <div className="font-semibold text-slate-900">
              {d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-xs text-slate-400">
              {d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
            </div>
          </div>
        )
      }
    } catch {}
  }

  // Jam kerja (menit) → format jam & menit
  if (col === 'jam_kerja_menit' && typeof value === 'number') {
    const jam = Math.floor(value / 60)
    const menit = value % 60
    return <span className="font-semibold">{jam}j {menit}m</span>
  }

  // Terlambat (menit) → warna oranye kalau > 0
  if (col === 'terlambat_menit' && typeof value === 'number') {
    if (value === 0) return <span className="text-emerald-600">Tepat waktu</span>
    return <span className="text-orange-600 font-semibold">{value} menit</span>
  }

  // Tanggal
  if (col.includes('tanggal') || col.includes('_at') || col.includes('mulai') || col.includes('akhir') || col.includes('expired')) {
    try { const d = new Date(value); if (!isNaN(d.getTime())) return d.toLocaleDateString('id-ID') } catch {}
  }

  // Jam (HH:MM)
  if (col.includes('jam_') && typeof value === 'string' && value.match(/^\d{2}:\d{2}/)) {
    return <span className="font-mono">{value.slice(0, 5)}</span>
  }

  // Angka
  if (typeof value === 'number') return value.toLocaleString('id-ID')

  // String panjang
  const s = String(value)
  return s.length > 60 ? <span title={s}>{s.substring(0, 60)}...</span> : s
}

function StatusBadge({ value }: any) {
  const m: any = {
    PENDING: 'bg-yellow-100 text-yellow-800', WAITING: 'bg-gray-100 text-gray-700',
    APPROVED: 'bg-green-100 text-green-800', REJECTED: 'bg-red-100 text-red-800',
    MENUNGGU_ATASAN: 'bg-yellow-100 text-yellow-800', MENUNGGU_PJO: 'bg-orange-100 text-orange-800',
    DISETUJUI: 'bg-green-100 text-green-800', DITOLAK_ATASAN: 'bg-red-100 text-red-800', DITOLAK_PJO: 'bg-red-100 text-red-800',
    DITOLAK: 'bg-red-100 text-red-800',
    HADIR: 'bg-green-100 text-green-800', TERLAMBAT: 'bg-orange-100 text-orange-800',
    SETENGAH_HARI: 'bg-yellow-100 text-yellow-800', ALPHA: 'bg-red-100 text-red-800',
    IZIN: 'bg-purple-100 text-purple-800',
    Aktif: 'bg-green-100 text-green-800', Nonaktif: 'bg-gray-100 text-gray-700',
    SIANG: 'bg-yellow-100 text-yellow-800', MALAM: 'bg-indigo-100 text-indigo-800',
    OFF: 'bg-gray-100 text-gray-700', CUTI: 'bg-blue-100 text-blue-800',
    SAKIT: 'bg-pink-100 text-pink-800',
    Baik: 'bg-green-100 text-green-800', Rusak: 'bg-red-100 text-red-800',
    SP1: 'bg-yellow-100 text-yellow-800', SP2: 'bg-orange-100 text-orange-800', SP3: 'bg-red-100 text-red-800'
  }
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${m[value] || 'bg-gray-100 text-gray-700'}`}>{value}</span>
}

// ============ ROLE MANAGER (Interface Baru) ============
function RoleManagerView({ title }: any) {
  const [data, setData] = useState<any>({ employees: [], sites: [], stats: {} })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [msg, setMsg] = useState({ type: '', text: '' })

  useEffect(() => { loadData() }, [search, filterSite, filterRole])

  async function loadData() {
    setLoading(true)
    try {
      let url = '/api/role-manager?'
      if (search) url += `search=${encodeURIComponent(search)}&`
      if (filterSite) url += `site=${encodeURIComponent(filterSite)}&`
      if (filterRole) url += `role=${encodeURIComponent(filterRole)}&`

      const res = await fetch(url)
      const d = await res.json()
      setData(d)
    } catch { setMsg({ type: 'err', text: 'Gagal load data' }) }
    finally { setLoading(false) }
  }

  async function toggleRole(nrp: string, role: string, currentActive: boolean) {
    const action = currentActive ? 'remove' : 'assign'

    try {
      const res = await fetch('/api/role-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nrp, role, action })
      })
      const d = await res.json()

      if (!res.ok) { setMsg({ type: 'err', text: d.error }); return }
      setMsg({ type: 'ok', text: d.message })
      loadData()

      setTimeout(() => setMsg({ type: '', text: '' }), 3000)
    } catch { setMsg({ type: 'err', text: 'Gagal update role' }) }
  }

  const roles = [
    { key: 'karyawan', label: 'Karyawan', color: 'slate', locked: true },
    { key: 'atasan', label: 'Atasan', color: 'blue' },
    { key: 'pjo', label: 'PJO', color: 'purple' },
    { key: 'admin', label: 'Admin', color: 'emerald' },
    { key: 'hrga', label: 'HRGA', color: 'amber' },
  ]

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full"></div>
          <h2 className="text-2xl font-bold text-slate-900">🔑 {title}</h2>
        </div>
        <p className="text-sm text-slate-500">Centang role untuk assign / uncheck untuk hapus role</p>
      </div>

      {msg.text && (
        <div className={`p-3 rounded-xl mb-4 text-sm ${msg.type === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-xs text-slate-500">Total Karyawan</div>
          <div className="text-2xl font-bold text-slate-900">{data.stats?.total_karyawan || 0}</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-3">
          <div className="text-xs text-blue-600">Atasan</div>
          <div className="text-2xl font-bold text-blue-700">{data.stats?.total_atasan || 0}</div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-3">
          <div className="text-xs text-purple-600">PJO</div>
          <div className="text-2xl font-bold text-purple-700">{data.stats?.total_pjo || 0}</div>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-3">
          <div className="text-xs text-emerald-600">Admin</div>
          <div className="text-2xl font-bold text-emerald-700">{data.stats?.total_admin || 0}</div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-3">
          <div className="text-xs text-amber-600">HRGA</div>
          <div className="text-2xl font-bold text-amber-700">{data.stats?.total_hrga || 0}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Cari Nama/NRP</label>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ketik nama atau NRP..." className="w-full px-4 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Filter Site</label>
            <select value={filterSite} onChange={e => setFilterSite(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm">
              <option value="">Semua Site</option>
              {(data.sites || []).map((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Filter Role</label>
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm">
              <option value="">Semua Role</option>
              <option value="atasan">Atasan</option>
              <option value="pjo">PJO</option>
              <option value="admin">Admin</option>
              <option value="hrga">HRGA</option>
            </select>
          </div>
        </div>
      </div>

      {/* List Karyawan */}
      {loading ? (
        <div className="text-center py-8 text-slate-500">Memuat...</div>
      ) : (data.employees || []).length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <div className="text-slate-500">Tidak ada karyawan ditemukan</div>
        </div>
      ) : (
        <div className="space-y-2">
          {(data.employees || []).map((emp: any) => (
            <div key={emp.nrp} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                {/* Info Karyawan */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{emp.nama}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                      NRP: {emp.nrp}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {emp.jabatan || '-'} • {emp.departemen || '-'} • {emp.site || '-'}
                  </div>
                </div>

                {/* Role Checkboxes */}
                <div className="flex flex-wrap gap-2">
                  {roles.map(r => {
                    const isActive = emp.roles?.includes(r.key)
                    const isLocked = r.locked && isActive

                    const colorMap: any = {
                      slate: isActive ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-white border-slate-200 text-slate-400',
                      blue: isActive ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-slate-200 text-slate-400',
                      purple: isActive ? 'bg-purple-100 border-purple-400 text-purple-700' : 'bg-white border-slate-200 text-slate-400',
                      emerald: isActive ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : 'bg-white border-slate-200 text-slate-400',
                      amber: isActive ? 'bg-amber-100 border-amber-400 text-amber-700' : 'bg-white border-slate-200 text-slate-400',
                    }

                    return (
                      <button
                        key={r.key}
                        onClick={() => !isLocked && toggleRole(emp.nrp, r.key, isActive)}
                        disabled={isLocked}
                        className={`px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all ${colorMap[r.color]} ${isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:scale-105'}`}
                        title={isLocked ? 'Role Karyawan tidak bisa dihapus' : `Klik untuk ${isActive ? 'hapus' : 'assign'} role ${r.label}`}
                      >
                        {isActive ? '✓' : '○'} {r.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
        <div className="font-semibold mb-1">💡 Cara Pakai:</div>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Klik badge role untuk <b>assign</b> (nyala) atau <b>uncheck</b> (mati)</li>
          <li>Role <b>Karyawan</b> otomatis di-set untuk semua orang (tidak bisa dihapus)</li>
          <li>Semua Atasan bisa approve semua karyawan (karyawan pilih saat submit)</li>
          <li>PJO otomatis assign berdasarkan site karyawan</li>
        </ul>
      </div>
    </div>
  )
}