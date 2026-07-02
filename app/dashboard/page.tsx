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
  if (data.type === 'table') return <TableView data={data} onReload={loadData} />
  return <div>Tipe konten tidak dikenali</div>
}

function DashboardView({ title }: any) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🏠 {title}</h2>
        <p className="text-sm text-gray-500 mt-1">Selamat datang di Portal Internal Perusahaan</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Status" value="✓ Online" color="text-green-600" />
        <StatCard label="Sistem" value="Aktif" color="text-blue-600" />
        <StatCard label="Versi" value="1.1.0" color="text-gray-900" />
        <StatCard label="Server" value="Supabase" color="text-purple-600" />
      </div>
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Panduan</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• Klik menu di sidebar kiri untuk navigasi</p>
          <p>• <b>Ajukan Cuti</b>: pilih tanggal dan atasan yang menyetujui</p>
          <p>• <b>Roster Bulanan</b>: lihat jadwal kerja bulanan (PDF/gambar)</p>
          <p>• <b>Ubah NRP Login</b>: ganti NRP untuk login (data tetap aman)</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-5">
      <div className="text-sm text-gray-500 mb-2">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  )
}

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

function ImportExcel({ title, table }: any) {
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setMsg({ type: 'err', text: 'Pilih file Excel' }); return }
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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">📥 {title}</h2>
        <p className="text-sm text-gray-500 mt-1">Upload file Excel (.xlsx) untuk import massal ke tabel <b>{table}</b></p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border p-6 max-w-2xl">
        {msg.text && <div className={`p-3 rounded-xl mb-4 text-sm ${msg.type === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>{msg.text}</div>}
        {details && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-4 text-sm">
            <div className="font-bold mb-2">📊 Hasil Import:</div>
            <div>✅ Berhasil: <b>{details.success}</b></div>
            <div>❌ Gagal: <b>{details.failed}</b></div>
            <div>📄 Total: <b>{details.total}</b></div>
            {details.errors?.length > 0 && (
              <div className="mt-2">
                <div className="font-semibold">Error contoh:</div>
                {details.errors.map((e: string, i: number) => <div key={i} className="text-xs text-red-700">• {e}</div>)}
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleImport} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">File Excel (.xlsx atau .xls)</label>
            <input type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] || null)} required className="w-full px-4 py-2.5 rounded-xl border text-gray-900" />
            <div className="text-xs text-gray-500 mt-2">
              📌 <b>Format kolom Excel</b> (baris pertama sebagai header):<br />
              {table === 'employees' && 'nrp, nama, jabatan, departemen, site, status_karyawan, tanggal_masuk, no_hp, alamat'}
              {table === 'apd' && 'nrp, nama_barang, tanggal_terima, kondisi, keterangan'}
              {table === 'pkwt' && 'nrp, no_kontrak, kontrak_ke, mulai_kontrak, akhir_kontrak, status'}
              {table === 'kpi' && 'nrp, periode, nilai_kpi, catatan'}
              {table === 'sp' && 'nrp, jenis_sp, tanggal_sp, alasan, keterangan'}
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-xl">
            {loading ? 'Mengimport...' : '📥 Import Data'}
          </button>
        </form>
      </div>
    </div>
  )
}

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

function TableView({ data, onReload }: any) {
  const { title, rows = [], columns = [], total = 0, table, access_mode } = data
  const [trackingId, setTrackingId] = useState<string | null>(null)
  const [formModal, setFormModal] = useState<any>(null)

  const showApproval = access_mode === 'APPROVAL_ATASAN' || access_mode === 'APPROVAL_PJO'
  const showTracking = table === 'leave_requests'
  const showCrud = access_mode === 'CRUD'

  return (
    <div>
      <div className="mb-6 flex justify-between items-start flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">Menampilkan <b>{total}</b> data</p>
        </div>
        {showCrud && <button onClick={() => setFormModal({ mode: 'create' })} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm">+ Tambah Baru</button>}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <div className="text-gray-500">Belum ada data</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {columns.map((col: string) => <th key={col} className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">{formatColumnName(col)}</th>)}
                  {(showApproval || showTracking || showCrud) && <th className="px-4 py-3 text-left font-semibold text-gray-700">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50 border-b">
                    {columns.map((col: string) => <td key={col} className="px-4 py-3 text-gray-700 whitespace-nowrap">{renderCell(col, row[col])}</td>)}
                    {(showApproval || showTracking || showCrud) && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2">
                          {showTracking && row.id && <button onClick={() => setTrackingId(row.id)} className="bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">📋 Track</button>}
                          {showApproval && row.id && (<>
                            <button onClick={() => handleApprove(row.id, 'APPROVED', onReload)} className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">✓</button>
                            <button onClick={() => handleApprove(row.id, 'REJECTED', onReload)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">✗</button>
                          </>)}
                          {showCrud && row.id && (<>
                            <button onClick={() => setFormModal({ mode: 'edit', row })} className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">✏️</button>
                            <button onClick={() => handleDelete(table, row.id, onReload)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">🗑️</button>
                          </>)}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {trackingId && <TrackingModal leaveId={trackingId} onClose={() => setTrackingId(null)} />}
      {formModal && table && <CrudModal table={table} mode={formModal.mode} row={formModal.row} onClose={() => setFormModal(null)} onSuccess={() => { setFormModal(null); onReload() }} />}
    </div>
  )
}

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

async function handleDelete(table: string, id: string, onReload: () => void) {
  if (!confirm('⚠️ Yakin hapus?')) return
  try {
    const res = await fetch(`/api/crud?table=${table}&id=${id}`, { method: 'DELETE' })
    const d = await res.json()
    if (!res.ok) { alert('❌ ' + d.error); return }
    alert(d.message); onReload()
  } catch { alert('❌ Error') }
}

function formatColumnName(col: string): string {
  return col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function renderCell(col: string, value: any) {
  if (value === null || value === undefined || value === '') return <span className="text-gray-300">-</span>
  const statusCols = ['status_atasan', 'status_pjo', 'status_final', 'status', 'status_karyawan', 'shift', 'jenis_sp', 'kondisi']
  if (statusCols.includes(col)) return <StatusBadge value={String(value)} />
  if (typeof value === 'boolean') return value ? <span className="text-green-600">✓</span> : <span className="text-gray-400">✗</span>
  if (col.includes('tanggal') || col.includes('_at') || col.includes('mulai') || col.includes('akhir') || col.includes('expired')) {
    try { const d = new Date(value); if (!isNaN(d.getTime())) return d.toLocaleDateString('id-ID') } catch {}
  }
  if (typeof value === 'number') return value.toLocaleString('id-ID')
  const s = String(value)
  return s.length > 60 ? <span title={s}>{s.substring(0, 60)}...</span> : s
}

function StatusBadge({ value }: any) {
  const m: any = {
    PENDING: 'bg-yellow-100 text-yellow-800', WAITING: 'bg-gray-100 text-gray-700',
    APPROVED: 'bg-green-100 text-green-800', REJECTED: 'bg-red-100 text-red-800',
    MENUNGGU_ATASAN: 'bg-yellow-100 text-yellow-800', MENUNGGU_PJO: 'bg-orange-100 text-orange-800',
    DISETUJUI: 'bg-green-100 text-green-800', DITOLAK_ATASAN: 'bg-red-100 text-red-800', DITOLAK_PJO: 'bg-red-100 text-red-800',
    Aktif: 'bg-green-100 text-green-800', Nonaktif: 'bg-gray-100 text-gray-700',
    SIANG: 'bg-yellow-100 text-yellow-800', MALAM: 'bg-indigo-100 text-indigo-800',
    OFF: 'bg-gray-100 text-gray-700', CUTI: 'bg-blue-100 text-blue-800',
    Baik: 'bg-green-100 text-green-800', Rusak: 'bg-red-100 text-red-800',
    SP1: 'bg-yellow-100 text-yellow-800', SP2: 'bg-orange-100 text-orange-800', SP3: 'bg-red-100 text-red-800'
  }
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${m[value] || 'bg-gray-100 text-gray-700'}`}>{value}</span>
}