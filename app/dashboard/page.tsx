'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * 📊 HELPER: Salam Dinamis
 */
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 19) return 'Selamat Sore';
  return 'Selamat Malam';
};

/**
 * 🏠 DASHBOARD VIEW v1.6.0 (Luxury Mobile Edition)
 * Menggabungkan Visual 1Pama dengan Data Real Perusahaan
 */
function DashboardView({ title, data }: any) {
  // 1. Ambil stats & data user
  const stats = data?.stats || { 
    total: 0, done: 0, hadir: 0, expired: 0, periode: '-', 
    user_name: '', clock_in_time: '--:--', clock_out_time: '--:--' 
  }
  

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-700 pb-28">
      
      {/* BANNER NAVY & GREETING */}
      <div className="relative mb-12">
        <div className="bg-[#003D79] rounded-[2.5rem] p-8 pt-10 pb-24 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-400/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="relative z-10">
            <p className="text-blue-200/70 font-bold text-[10px] uppercase tracking-[0.3em] mb-2">{getGreeting()}</p>
            <h2 className="text-2xl font-black text-white tracking-tight">{data.user_name || stats.user_name || 'Rekan BTM'} 👋</h2>
            <p className="text-blue-200/50 text-[10px] font-medium mt-1 uppercase tracking-widest italic">{stats.periode}</p>
          </div>
        </div>

        {/* FLOATING ATTENDANCE CARD (Riwayat Ada di Sini) */}
        <div className="bg-white rounded-[2.2rem] mx-4 -mt-16 p-6 shadow-[0_20px_50px_rgba(0,61,121,0.12)] border border-white relative z-20">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-xl">⏰</div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status Hari Ini</p>
                <h4 className="text-xs font-black text-[#003D79] uppercase">Shift Normal</h4>
              </div>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${stats.clock_in_time !== '--:--' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
              {stats.clock_in_time !== '--:--' ? 'Hadir' : 'Belum Absen'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50/80 p-4 rounded-[1.5rem] border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Clock In</p>
              <p className="text-xl font-black text-slate-900">{stats.clock_in_time || '--:--'}</p>
            </div>
            <div className="bg-slate-50/80 p-4 rounded-[1.5rem] border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Clock Out</p>
              <p className="text-xl font-black text-slate-300">{stats.clock_out_time || '--:--'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-xl">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Anggota</p>
            <p className="text-2xl font-black text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-xl">
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Hadir (Site)</p>
            <p className="text-2xl font-black text-blue-600">{stats.hadir}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-xl">
            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">KPI Selesai</p>
            <p className="text-2xl font-black text-emerald-600">{stats.done}</p>
        </div>
        <div className="bg-rose-50 p-6 rounded-[2rem] border-2 border-rose-100 shadow-xl">
            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Dok. Expired</p>
            <p className="text-2xl font-black text-rose-600">{stats.expired}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * 🚀 MAIN COMPONENT
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-pulse text-slate-500 font-bold tracking-widest uppercase text-xs">BTM Portal Loading...</div></div>}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const menuKey = searchParams.get('menu') || 'absensi_saya'
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [menuKey])

  async function loadData() {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/data?menu=${menuKey}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Gagal mengambil data'); setData(null); return }
      setData(json)
    } catch { setError('Terjadi kesalahan koneksi server') }
    finally { setLoading(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003D79]"></div></div>
  if (error) return <div className="bg-red-50 border-2 border-red-100 text-red-700 p-6 rounded-3xl mx-4 mt-10 text-center font-bold">❌ {error}</div>
  if (!data) return null

  // RENDERER LOGIC
  if (data.type === 'dashboard') return <DashboardView title={data.title} data={data} />
  if (data.type === 'identity_view') return <IdentityView data={data.data} isPending={data.pending_request} />
  if (data.type === 'form_cuti') return <FormCutiView title={data.title} onSuccess={loadData} />
  if (data.type === 'form_lembur') return <FormLemburView title={data.title} onSuccess={loadData} />
  if (data.type === 'form_sakit') return <FormSakitView title={data.title} onSuccess={loadData} data={data} />
  if (data.type === 'pkwt_saya') return <PKWTSayaView title={data.title} data={data} onSuccess={loadData} />
  if (data.type === 'apd_history') return <APDHistoryView data={data} onReload={loadData} />
  if (data.type === 'absensi_clock') return <AbsensiClockView title={data.title} />
  if (data.type === 'riwayat_approval') return <RiwayatApprovalView data={data} onReload={loadData} />
  if (data.type === 'table') return (
    <>
      <TableView data={data} onReload={loadData} />
    </>
  )
  if (data.type === 'import_excel') return <ImportExcel title={data.title} table={data.table} />
  if (data.type === 'roster_view') return <RosterView title={data.title} />
  if (data.type === 'roster_upload') return <RosterUpload title={data.title} />
  if (data.type === 'role_manager') return <RoleManagerView title={data.title} />
  if (data.type === 'change_login') return <ChangeLoginView title={data.title} />
  if (data.type === 'export_absensi') return <ExportAbsensiView title={data.title} />
  if (data.type === 'riwayat_absensi_custom') return <RiwayatAbsensiCustom data={data} />
  if (data.type === 'kpi_saya') return <KPISayaRaportView data={data} />
  if (data.type === 'penilaian_tim') return <PenilaianBawahanView data={data} onReload={loadData} />

  return <div className="p-10 text-center text-gray-500 italic">Tipe konten '{data.type}' tidak dikenali</div>
}

function StatCard({ label, value, color }: any) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 hover:shadow-lg transition-shadow">
      <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">{label}</div>
      <div className={`text-xl font-black ${color}`}>{value}</div>
    </div>
  )
}

// ============ ✍️ FORM CUTI ============
function FormCutiView({ title, onSuccess, data }: any) {
  const [form, setForm] = useState({ tanggal_mulai: '', tanggal_selesai: '', jenis_cuti: '', alasan: '', atasan_nrp: '' })
  const [atasanList, setAtasanList] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const riwayat = data?.riwayat || []

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/leave/atasan-list', { signal: controller.signal })
      .then(r => r.json())
      .then(d => setAtasanList(d.atasan_list || []))
      .catch(err => {
        if (err.name !== 'AbortError') console.log('Load atasan gagal:', err)
      })
    return () => controller.abort()
  }, [])

  async function handleSubmit(e: any) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/leave/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const resData = await res.json()
      if (res.ok) {
        setMsg({ type: 'ok', text: '✅ Pengajuan cuti berhasil dikirim' })
        setForm({ tanggal_mulai: '', tanggal_selesai: '', jenis_cuti: '', alasan: '', atasan_nrp: '' })
        onSuccess()
      } else {
        setMsg({ type: 'err', text: resData.error })
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-[2.5rem] border shadow-xl">
        <h2 className="text-2xl font-black mb-6">✍️ {title}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {msg.text && <div className={`p-4 rounded-2xl text-sm font-bold ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Mulai Cuti" type="date" required value={form.tanggal_mulai} onChange={(v:any) => setForm({...form, tanggal_mulai: v})} />
            <Input label="Selesai Cuti" type="date" required value={form.tanggal_selesai} onChange={(v:any) => setForm({...form, tanggal_selesai: v})} />
          </div>
          <Select label="Jenis Cuti" required value={form.jenis_cuti} onChange={(v:any) => setForm({...form, jenis_cuti: v})} options={['Tahunan', 'Sakit', 'Khusus', 'Melahirkan', 'Duka']} />
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Atasan (Approval 1)</label>
            <select required value={form.atasan_nrp} onChange={e => setForm({...form, atasan_nrp: e.target.value})} className="w-full p-3.5 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:border-blue-500 outline-none">
              <option value="">-- Pilih Nama Atasan --</option>
              {atasanList.map((a: any) => <option key={a.nrp} value={a.nrp}>{a.nama} ({a.jabatan})</option>)}
            </select>
          </div>
          <Textarea label="Alasan Cuti" required value={form.alasan} onChange={(v:any) => setForm({...form, alasan: v})} placeholder="Jelaskan alasan cuti..." />
          <button disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all">
            {loading ? 'MENGIRIM...' : '🚀 KIRIM PENGAJUAN'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden">
        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-800">📜 Riwayat Cuti Periode <span className="text-blue-600">{data?.periode || 'Bulan Ini'}</span></h3>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full font-black">{riwayat.length} DATA</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Jenis</th>
                <th className="px-6 py-4">Alasan</th>
                <th className="px-6 py-4 text-center">Status Atasan</th>
                <th className="px-6 py-4 text-center">Status PJO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {riwayat.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-300 font-bold italic">Belum ada pengajuan bulan ini.</td></tr>
              ) : riwayat.map((r: any, i: number) => (
                <tr key={i}>
                  <td className="px-6 py-4 text-xs font-bold">{new Date(r.tanggal_mulai).toLocaleDateString('id-ID')} - {new Date(r.tanggal_selesai).toLocaleDateString('id-ID')}</td>
                  <td className="px-6 py-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[9px] font-bold">{r.jenis_cuti}</span></td>
                  <td className="px-6 py-4 italic text-slate-500 text-xs truncate max-w-[200px]">"{r.alasan}"</td>
                  <td className="px-6 py-4 text-center"><StatusBadge value={r.status_atasan} /></td>
                  <td className="px-6 py-4 text-center"><StatusBadge value={r.status_pjo || 'PENDING'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


// ============ ⏱️ FORM LEMBUR ============
function FormLemburView({ title, onSuccess, data }: any) {
  const [form, setForm] = useState({ tanggal: '', jam_mulai: '', jam_selesai: '', jenis_lembur: 'BIASA', alasan: '', atasan_nrp: '' })
  const [atasanList, setAtasanList] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const riwayat = data?.riwayat || []

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/overtime/atasan-list', { signal: controller.signal })
      .then(r => r.json())
      .then(d => setAtasanList(d.atasan_list || []))
      .catch(err => {
        if (err.name !== 'AbortError') console.log('Load atasan gagal:', err)
      })
    return () => controller.abort()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/overtime/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const dataRes = await res.json()
    if (res.ok) {
      setMsg({ type: 'ok', text: '✅ Pengajuan lembur berhasil dikirim' })
      setForm({ tanggal: '', jam_mulai: '', jam_selesai: '', jenis_lembur: 'BIASA', alasan: '', atasan_nrp: '' })
      onSuccess()
    } else {
      setMsg({ type: 'err', text: dataRes.error })
    }
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-[2.5rem] border shadow-xl">
        <h2 className="text-2xl font-black mb-6">⏱️ {title}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {msg.text && <div className={`p-4 rounded-2xl text-sm font-bold ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}
          <Input label="Tanggal Lembur" type="date" required value={form.tanggal} onChange={(v:any) => setForm({...form, tanggal: v})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Jam Mulai" type="time" required value={form.jam_mulai} onChange={(v:any) => setForm({...form, jam_mulai: v})} />
            <Input label="Jam Selesai" type="time" required value={form.jam_selesai} onChange={(v:any) => setForm({...form, jam_selesai: v})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Atasan (Pemberi Tugas)</label>
            <select required value={form.atasan_nrp} onChange={e => setForm({...form, atasan_nrp: e.target.value})} className="w-full p-3.5 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:border-blue-500 outline-none">
              <option value="">-- Pilih Atasan --</option>
              {atasanList.map((a: any) => <option key={a.nrp} value={a.nrp}>{a.nama} ({a.jabatan})</option>)}
            </select>
          </div>
          <Textarea label="Pekerjaan / Alasan Lembur" required value={form.alasan} onChange={(v:any) => setForm({...form, alasan: v})} />
          <button disabled={loading} className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black hover:bg-amber-600 shadow-lg shadow-amber-200 active:scale-95 transition-all">
            {loading ? 'MENGIRIM...' : '🚀 KIRIM LEMBUR'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden">
        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-800">📜 Riwayat Lembur Periode <span className="text-amber-600">{data?.periode || 'Bulan Ini'}</span></h3>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full font-black">{riwayat.length} DATA</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Jam</th>
                <th className="px-6 py-4">Alasan</th>
                <th className="px-6 py-4 text-center">Status Atasan</th>
                <th className="px-6 py-4 text-center">Status PJO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {riwayat.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-300 font-bold italic">Belum ada lembur bulan ini.</td></tr>
              ) : riwayat.map((r: any, i: number) => (
                <tr key={i}>
                  <td className="px-6 py-4 text-xs font-bold">{new Date(r.tanggal).toLocaleDateString('id-ID')}</td>
                  <td className="px-6 py-4 font-mono text-xs">{r.jam_mulai} - {r.jam_selesai}</td>
                  <td className="px-6 py-4 italic text-slate-500 text-xs truncate max-w-[200px]">"{r.alasan}"</td>
                  <td className="px-6 py-4 text-center"><StatusBadge value={r.status_atasan} /></td>
                  <td className="px-6 py-4 text-center"><StatusBadge value={r.status_pjo || 'PENDING'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============ 🤒 FORM SAKIT (v1.5.0 Multi-Site) ============
function FormSakitView({ title, onSuccess, data }: any) {
  const [form, setForm] = useState({ tanggal: '', keterangan: '', foto_url: '', atasan_nrp: '' })
  const [atasanList, setAtasanList] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const riwayat = data?.rows || []

  useEffect(() => {
    fetch('/api/attendance/atasan-list')
      .then(r => r.json())
      .then(d => setAtasanList(d.atasan_list || []))
      .catch(err => console.error("Gagal mengambil daftar atasan:", err))
  }, [])

  async function handleUpload(e: any) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/announcements/upload', { method: 'POST', body: fd })
      const d = await res.json()
      if (res.ok) setForm({ ...form, foto_url: d.url })
    } finally { setUploading(false) }
  }

  async function handleSubmit(e: any) {
    e.preventDefault()
    if (!form.atasan_nrp) return alert("⚠️ Mohon pilih Atasan Approval terlebih dahulu!")
    if (!form.foto_url) return alert("⚠️ Mohon upload foto bukti (SKS) terlebih dahulu!")
    
    setLoading(true)
    try {
      const res = await fetch('/api/crud', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          table: 'attendance_evidences', 
          values: { 
            ...form, 
            status_atasan: 'PENDING'
          } 
        })
      })
      if (res.ok) {
        alert("✅ Pengajuan berhasil dikirim ke atasan!")
        setForm({ tanggal: '', keterangan: '', foto_url: '', atasan_nrp: '' })
        onSuccess()
      } else {
        const err = await res.json()
        alert("❌ Gagal: " + err.error)
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] border shadow-xl">
        <h2 className="text-2xl font-black mb-2">🤒 {title}</h2>
        <p className="text-xs text-slate-400 mb-8 font-medium">Laporkan ketidakhadiran karena sakit/izin dengan bukti dokumen.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Tanggal Sakit/Izin" type="date" required value={form.tanggal} onChange={(v:any) => setForm({...form, tanggal: v})} />
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Atasan Approval (Satu Site)</label>
              <select 
                required 
                value={form.atasan_nrp} 
                onChange={e => setForm({...form, atasan_nrp: e.target.value})} 
                className="w-full p-3.5 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
              >
                <option value="">-- Pilih Nama Atasan --</option>
                {atasanList.map((a: any) => (
                  <option key={a.nrp} value={a.nrp}>
                    {a.nama} ({a.jabatan})
                  </option>
                ))}
              </select>
              {atasanList.length === 0 && <p className="text-[10px] text-rose-500 mt-1 font-bold italic"> Tidak ada atasan tersedia di site Anda</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Upload Bukti (SKS/Surat Izin)</label>
            <div className="p-6 border-4 border-dashed border-slate-50 rounded-3xl bg-slate-50/50 text-center hover:border-blue-200 transition-all cursor-pointer relative">
              <input type="file" accept="image/*" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              {uploading ? (
                 <p className="text-blue-500 font-black text-xs animate-pulse">⏳ SEDANG MENGUNGGAH...</p>
              ) : form.foto_url ? (
                 <div className="flex items-center justify-center gap-2">
                    <span className="text-emerald-500 font-black text-xs">✅ DOKUMEN TERUPLOAD</span>
                    <img src={form.foto_url} className="h-10 w-10 object-cover rounded-lg" />
                 </div>
              ) : (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Klik untuk pilih foto dokumen</p>
              )}
            </div>
          </div>

          <Textarea label="Keterangan Tambahan" value={form.keterangan} onChange={(v:any) => setForm({...form, keterangan: v})} placeholder="Contoh: Sakit demam, butuh istirahat 3 hari sesuai SKS." />

          <button disabled={loading || uploading} className={`w-full py-5 rounded-3xl font-black text-white text-lg transition-all ${loading || uploading ? 'bg-slate-300' : 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-200'}`}>
            {loading ? 'MENGIRIM...' : '🚀 KIRIM PENGAJUAN'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden">
        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-800">📜 Riwayat Pengajuan ({data?.periode || '-'})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black">
              <tr>
                <th className="px-8 py-5">Tanggal</th>
                <th className="px-8 py-5">Keterangan</th>
                <th className="px-8 py-5">Dokumen</th>
                <th className="px-8 py-5">Status Atasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {riwayat.map((r: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5 font-bold text-slate-900">{new Date(r.tanggal).toLocaleDateString('id-ID')}</td>
                  <td className="px-8 py-5 text-slate-600 italic">"{r.keterangan || '-'}"</td>
                  <td className="px-8 py-5">
                    {r.foto_url ? <a href={r.foto_url} target="_blank" className="text-blue-600 font-black text-[10px] hover:underline">👁️ LIHAT FOTO</a> : '-'}
                  </td>
                  <td className="px-8 py-5">
                    <StatusBadge value={r.status_atasan || 'PENDING'} />
                  </td>
                </tr>
              ))}
              {riwayat.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-10 text-center text-slate-300 font-bold italic">Belum ada riwayat bulan ini</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============ 🕒 APD HISTORY ============
function APDHistoryView({ data, onReload }: any) {
  const rows = data.rows || []
  const [showAdd, setShowAdd] = useState(false)
  const grouped = rows.reduce((acc: any, item: any) => {
    if (!acc[item.jenis_apd]) acc[item.jenis_apd] = []
    acc[item.jenis_apd].push(item)
    return acc
  }, {})
  const icons: any = { 'Kemeja': '👔', 'Kaos': '👕', 'Sepatu': '👟', 'Helm': '⛑️', 'Earplug': '🎧', 'Masker': '😷', 'Kacamata Putih': '👓', 'Kacamata Hitam': '🕶️' }

  return (
    <div className="pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{data.title}</h2>
          <p className="text-sm text-slate-500 font-medium">Monitoring & pengajuan mandiri perlengkapan APD</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-slate-800 active:scale-95 transition-all">+ AJUKAN APD BARU</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(grouped).map(([jenis, items]: any) => (
          <div key={jenis} className="bg-white rounded-[2rem] shadow-lg border border-slate-100 p-6 hover:border-blue-200 transition-all group">
            <div className="flex justify-between items-center mb-6">
              <div className="text-xl font-black group-hover:scale-110 transition-transform origin-left">{icons[jenis] || '📦'} {jenis}</div>
              <div className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-black tracking-widest">{items.length}X TERIMA</div>
            </div>
            <div className="space-y-3">
              {items.slice(0, 5).map((it: any) => (
                <div key={it.id} className="flex justify-between items-center text-xs border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="text-slate-400 font-bold text-[9px] uppercase tracking-tighter">{new Date(it.tanggal_terima).toLocaleDateString('id-ID')}</span>
                    <span className="font-black text-slate-700">Qty: {it.jumlah} Unit</span>
                  </div>
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-black text-[10px]">{it.ukuran}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {showAdd && <CrudModal table="apd_history" mode="create" onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); onReload() }} />}
    </div>
  )
}

// ============ 📜 PKWT SAYA ============
function PKWTSayaView({ title, data, onSuccess }: any) {
  const [form, setForm] = useState({ mulai_kontrak: '', akhir_kontrak: '', keterangan: '' })
  const [loading, setLoading] = useState(false)

  const handleDuration = (days: number) => {
    if (!form.mulai_kontrak) { alert("Pilih tanggal mulai dulu"); return }
    const start = new Date(form.mulai_kontrak)
    start.setDate(start.getDate() + days)
    setForm({ ...form, akhir_kontrak: start.toISOString().split('T')[0], keterangan: `Update Perpanjangan ${days} Hari` })
  }

  async function handleSubmit(e: any) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/crud', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'pkwt', values: form })
    })
    if (res.ok) { 
        alert("✅ Kontrak berhasil diperbarui secara sistem"); 
        setForm({ mulai_kontrak: '', akhir_kontrak: '', keterangan: '' });
        onSuccess(); 
    }
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-[2.5rem] border shadow-xl h-fit">
        <h2 className="text-xl font-black mb-6">✍️ Perbarui Data Kontrak</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input label="Tanggal Mulai Kontrak" type="date" required value={form.mulai_kontrak} onChange={(v:any) => setForm({...form, mulai_kontrak: v})} />
          <div>
            <label className="block text-sm font-black text-slate-700 mb-3 uppercase tracking-tighter">Opsi Durasi Perpanjangan</label>
            <div className="grid grid-cols-3 gap-3">
              {[30, 90, 180].map(d => (
                <button key={d} type="button" onClick={() => handleDuration(d)} className="bg-slate-50 hover:bg-blue-600 hover:text-white py-4 rounded-2xl font-black text-slate-700 transition-all border-2 border-transparent hover:border-blue-200 text-sm shadow-sm">+{d} Hari</button>
              ))}
            </div>
          </div>
          <Input label="Estimasi Tanggal Berakhir" type="date" required value={form.akhir_kontrak} onChange={(v:any) => setForm({...form, akhir_kontrak: v})} readOnly />
          <button disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black shadow-2xl active:scale-95 transition-all text-lg tracking-tight">
            {loading ? 'MENYIMPAN...' : '💾 UPDATE KONTRAK'}
          </button>
        </form>
      </div>
      <div className="bg-white p-8 rounded-[2.5rem] border shadow-xl">
        <h2 className="text-xl font-black mb-6 tracking-tight">📜 Histori Kontrak Kerja</h2>
        <div className="space-y-4">
          {data.rows?.length === 0 ? (
            <div className="p-10 text-center text-slate-300 italic">Data PKWT tidak ditemukan.</div>
          ) : (
            data.rows?.map((r: any, i: number) => (
                <div key={i} className="p-6 border-2 border-slate-50 rounded-3xl bg-slate-50/50 hover:bg-white hover:border-blue-100 transition-all group">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-black text-blue-800 text-base tracking-tighter group-hover:scale-105 transition-transform origin-left">
                        {new Date(r.mulai_kontrak).toLocaleDateString('id-ID')} — {new Date(r.akhir_kontrak).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{r.keterangan || 'Log Sistem'}</div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  )
}

// ============ ⏰ ABSENSI CLOCK ============
function AbsensiClockView({ title }: any) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [gps, setGps] = useState<any>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [announcement, setAnnouncement] = useState<any>(null)
  const [riwayat7Hari, setRiwayat7Hari] = useState<any[]>([])

    useEffect(() => {
    setIsOnline(navigator.onLine)
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    loadStatus()
    fetch('/api/announcements').then(r => r.json()).then(d => setAnnouncement(d.announcement)).catch(() => {})
        fetch('/api/data?menu=riwayat_absensi').then(r => r.json()).then(d => {
      const today = new Date()
      today.setHours(23, 59, 59, 999) // Batas atas: akhir hari ini
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      sevenDaysAgo.setHours(0, 0, 0, 0) // Batas bawah: 7 hari lalu (jam 00:00)
      
      const filtered = (d.rows || [])
        .filter((r: any) => {
          const rowDate = new Date(r.tanggal)
          return rowDate >= sevenDaysAgo && rowDate < today
        })
        .sort((a: any, b: any) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
        .slice(0, 7)
      
      setRiwayat7Hari(filtered)
    }).catch(() => {})
    navigator.geolocation.getCurrentPosition(
      pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => console.log(err),
      { enableHighAccuracy: true }
    )
    return () => clearInterval(interval)
  }, [])

  async function loadStatus() {
    try {
      const res = await fetch('/api/attendance/status')
      if (!res.ok) throw new Error('Gagal')
      const data = await res.json()
      setStatus(data)
    } catch (err) {
      console.error("Gagal load status absensi:", err)
    } finally {
      setLoading(false) 
    }
  }

  async function handleClock(type: 'in' | 'out') {
    if (!gps) { alert("⚠️ Mohon izinkan akses GPS di browser Anda"); return }
    const res = await fetch(`/api/attendance/clock-${type}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: gps.lat, longitude: gps.lng })
    })
    const d = await res.json()
    alert(d.message || d.error)
    loadStatus()
  }

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-[0.3em]">Memvalidasi Sesi Absensi...</div>
  
  const hasIn = status?.today?.clock_in
  const hasOut = status?.today?.clock_out

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-700">
      {announcement && (
        <div className={`mb-8 overflow-hidden rounded-[2rem] shadow-2xl border-2 ${announcement.is_urgent ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex flex-col md:flex-row items-stretch">
            {announcement.image_url && (
              <div className="md:w-1/3 w-full bg-white flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-slate-100">
                <img src={announcement.image_url} alt="Info" className="max-w-full max-h-56 object-contain rounded-2xl shadow-sm" />
              </div>
            )}
            <div className="p-8 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{announcement.is_urgent ? '🚨' : '📢'}</span>
                <h3 className={`font-black text-xl tracking-tight ${announcement.is_urgent ? 'text-red-900' : 'text-blue-900'}`}>{announcement.title}</h3>
              </div>
              <p className="text-slate-700 text-sm font-medium leading-relaxed">{announcement.content}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-950 text-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 text-center shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] mb-6 border border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none"></div>
        <div className="text-4xl md:text-7xl font-black mb-2 tracking-tighter text-white font-mono">
          {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="text-blue-400 font-black uppercase text-[9px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] mb-6 md:mb-12">
          {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div className="flex justify-center gap-4 relative z-10">
          {!hasIn ? (
            <button onClick={() => handleClock('in')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 md:px-12 py-4 md:py-6 rounded-[1.5rem] md:rounded-[2rem] font-black text-lg md:text-2xl shadow-2xl shadow-emerald-500/20 active:scale-90 transition-all">🟢 CLOCK IN</button>
          ) : !hasOut ? (
            <button onClick={() => handleClock('out')} className="bg-rose-500 hover:bg-rose-600 text-white px-8 md:px-12 py-4 md:py-6 rounded-[1.5rem] md:rounded-[2rem] font-black text-lg md:text-2xl shadow-2xl shadow-rose-500/20 active:scale-90 transition-all">🔴 CLOCK OUT</button>
          ) : (
            <div className="bg-white/5 px-6 md:px-10 py-4 md:py-6 rounded-[1.5rem] md:rounded-[2rem] border-2 border-white/10 font-black text-base md:text-xl tracking-tight text-slate-400">✅ SHIFT SELESAI</div>
          )}
        </div>
        <div className="mt-6 md:mt-10 text-[8px] md:text-[9px] text-white/30 flex items-center justify-center gap-2 md:gap-3 font-black tracking-widest">
          <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></div>
          {isOnline ? 'NETWORK CONNECTED' : 'OFFLINE MODE'} • {gps ? `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}` : 'WAITING FOR GPS...'}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 md:gap-6">
        <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 border-slate-50 shadow-sm group hover:border-emerald-100 transition-all">
          <div className="text-[9px] md:text-[10px] text-slate-400 font-black mb-1 md:mb-2 uppercase tracking-widest">Record Masuk</div>
          <div className="text-xl md:text-3xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{hasIn ? new Date(hasIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit'}) : '--:--'}</div>
        </div>
        <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 border-slate-50 shadow-sm group hover:border-rose-100 transition-all">
          <div className="text-[9px] md:text-[10px] text-slate-400 font-black mb-1 md:mb-2 uppercase tracking-widest">Record Pulang</div>
          <div className="text-xl md:text-3xl font-black text-slate-900 group-hover:text-rose-600 transition-colors">{hasOut ? new Date(hasOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit'}) : '--:--'}</div>
        </div>
      </div>

      {/* 🆕 RIWAYAT 7 HARI TERAKHIR (Luxury Minimalis) */}
            {/* 🆕 RIWAYAT 7 HARI TERAKHIR (Luxury Minimalis - Data Real) */}
      <div className="mt-6 bg-white rounded-[2rem] border-2 border-slate-50 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">History</p>
            <h4 className="text-sm font-black text-[#003D79] tracking-tight">Riwayat 7 Hari Terakhir</h4>
          </div>
          <a href="/dashboard?menu=riwayat_absensi" className="text-[9px] font-black text-slate-400 hover:text-[#003D79] uppercase tracking-widest transition-colors">
            Lihat Semua →
          </a>
        </div>

        {/* List Riwayat */}
        <div className="divide-y divide-slate-50">
          {riwayat7Hari.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Belum ada riwayat absensi</p>
            </div>
          ) : (
            riwayat7Hari.map((item, i) => {
              // Parse jam dari format "08:00 / 17:00"
              const [jamMasuk, jamPulang] = (item.evident || '-- / --').split(' / ');
              
              // Tentukan status & warna berdasarkan keterangan
              const ket = String(item.keterangan || '').toUpperCase();
              let statusLabel = 'HADIR';
              let statusColor = { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' };
              
              if (ket.includes('TERLAMBAT')) {
                statusLabel = 'TERLAMBAT';
                statusColor = { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' };
              } else if (ket.includes('MANGKIR') || ket.includes('TIDAK ADA')) {
                statusLabel = 'MANGKIR';
                statusColor = { dot: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50' };
              } else if (item.actual === 'OFF' || item.actual === 'MASUK OFF') {
                statusLabel = 'OFF';
                statusColor = { dot: 'bg-slate-300', text: 'text-slate-400', bg: 'bg-slate-50' };
              } else if (item.actual === 'SAKIT') {
                statusLabel = 'SAKIT';
                statusColor = { dot: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' };
              } else if (ket.includes('IZIN') || ket.includes('CUTI')) {
                statusLabel = 'IZIN';
                statusColor = { dot: 'bg-purple-500', text: 'text-purple-600', bg: 'bg-purple-50' };
              }
              
              // Format tanggal jadi "Jumat, 10 Jul"
              const tglObj = new Date(item.tanggal);
              const tglFormatted = tglObj.toLocaleDateString('id-ID', { 
                weekday: 'long', 
                day: '2-digit', 
                month: 'short' 
              });
              
              return (
                <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  {/* Status Dot */}
                  <div className={`w-2.5 h-2.5 rounded-full ${statusColor.dot} shadow-sm flex-shrink-0`}></div>
                  
                  {/* Tanggal & Jam */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 tracking-tight mb-0.5 capitalize">{tglFormatted}</p>
                    <p className="text-[10px] font-bold text-slate-400 font-mono tracking-widest">
                      {jamMasuk?.trim() || '--:--'} <span className="text-slate-300 mx-1">→</span> {jamPulang?.trim() || '--:--'}
                    </p>
                  </div>
                  
                  {/* Badge Status */}
                  <div className={`${statusColor.bg} ${statusColor.text} px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase`}>
                    {statusLabel}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ============ 📊 TABLE VIEW (BUG FIXED - handleApprove Duplikat DIHAPUS) ============
function TableView({ data, onReload }: any) {
  const { title, rows = [], columns = [], table, access_mode } = data
  const [formModal, setFormModal] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const isApproval = access_mode?.includes('APPROVAL')

  const filteredRows = rows.filter((r: any) => {
    return Object.values(r).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  async function handleApprove(id: string, action: string) {
    const note = action === 'REJECTED' ? prompt("Alasan Penolakan:") : "OK"
    if (!note && action === 'REJECTED') return

    let endpoint = 'crud'
    if (table === 'leave_requests') endpoint = 'leave'
    else if (table === 'overtime_requests') endpoint = 'overtime'
    else if (table === 'attendance_evidences') endpoint = 'attendance'

    const res = await fetch(`/api/${endpoint}/approve`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        [table === 'leave_requests' ? 'leave_id' : 'id']: id, 
        action, 
        catatan: note, 
        status: action 
      })
    })
    if (res.ok) { alert("✅ Data Berhasil Diproses"); onReload() }
    else { alert("❌ Gagal memproses data") }
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
          <p className="text-sm text-slate-500 font-medium">Pengelolaan master data & verifikasi dokumen</p>
        </div>
        
        <div className="flex w-full md:w-auto gap-3">
          <input 
            type="text" 
            placeholder="🔍 Cari Data..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 p-3 bg-white border-2 border-slate-100 rounded-2xl shadow-sm focus:border-blue-500 outline-none font-bold text-xs"
          />
          
          {access_mode === 'CRUD' && (
            <button onClick={() => setFormModal({ mode: 'create' })} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap">
              + TAMBAH
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800">
              {columns.map((c: string) => <th key={c} className="px-8 py-5 font-black text-white uppercase text-[10px] tracking-widest">{formatColumnName(c)}</th>)}
              <th className="px-8 py-5 font-black text-white uppercase text-[10px] tracking-widest text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.map((r: any, i: number) => (
              <tr key={i} className="hover:bg-slate-50/80 transition-all">
                {columns.map((c: string) => <td key={c} className="px-8 py-5 whitespace-nowrap font-medium text-slate-700">{renderCell(c, r[c])}</td>)}
                <td className="px-8 py-5 whitespace-nowrap">
                  <div className="flex justify-center gap-2">
                    {r.foto_url && (
                      <button 
                        onClick={() => window.open(r.foto_url, '_blank')}
                        className="bg-indigo-500 text-white px-3 py-2 rounded-xl text-[10px] font-black hover:bg-indigo-600 transition-colors shadow-sm"
                      >
                        LIHAT FOTO
                      </button>
                    )}

                    {isApproval && r.status_atasan === 'PENDING' && (
                      <>
                        <button onClick={() => handleApprove(r.id, 'APPROVED')} className="bg-emerald-500 text-white px-3 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-600 transition-colors shadow-sm">APPROVE</button>
                        <button onClick={() => handleApprove(r.id, 'REJECTED')} className="bg-rose-500 text-white px-3 py-2 rounded-xl text-[10px] font-black hover:bg-rose-600 transition-colors shadow-sm">REJECT</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRows.length === 0 && <div className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic">Data tidak ditemukan</div>}
      </div>
      {formModal && <CrudModal table={table} mode={formModal.mode} row={formModal.row} onClose={() => setFormModal(null)} onSuccess={() => { setFormModal(null); onReload() }} />}
    </div>
  )
}

// ============ 📦 CRUD MODAL ============
function CrudModal({ table, mode, row, onClose, onSuccess }: any) {
  const [fields, setFields] = useState<any[]>([])
  const [values, setValues] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [searchEmp, setSearchEmp] = useState('')

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
        if (row?.nama) setSearchEmp(`${row.nrp} - ${row.nama}`)
        setLoading(false)
      })

    if (!row?.nrp) {
      fetch('/api/data?menu=kelola_karyawan')
        .then(r => {
          if (r.status === 403) return { rows: [] }
          return r.json()
        })
        .then(d => setEmployees(d.rows || []))
        .catch(() => setEmployees([]))
    }
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

  if (loading) return <div className="fixed inset-0 bg-black/50 z-[99] flex items-center justify-center font-black text-white tracking-widest uppercase animate-pulse">Memuat Form Digital...</div>

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[99] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border-4 border-white">
        <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-black text-2xl text-slate-900 tracking-tight">{mode === 'create' ? 'Input Data Baru' : 'Perbarui Data'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Tabel: {table}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border-2 border-slate-100 text-2xl text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">{f.label}{f.required && <span className="text-rose-500 ml-1">*</span>}</label>
              
              {f.type === 'employee_select' ? (
                row?.nrp && mode === 'create' ? (
                  <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Menilai Karyawan:</p>
                    <p className="font-black text-slate-900 text-sm">{row.nama || 'Karyawan Terpilih'}</p>
                    <p className="text-[10px] font-bold text-slate-500">NRP: {row.nrp}</p>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="🔍 Cari NRP atau Nama Karyawan..."
                      value={searchEmp || (mode === 'edit' ? values[f.key] : '')}
                      onChange={(e) => setSearchEmp(e.target.value)}
                      className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                    {searchEmp && !searchEmp.includes(' - ') && (
                      <div className="absolute z-[100] w-full bg-white border-2 border-slate-100 mt-2 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                        {employees
                          .filter(emp => 
                            (emp.nama || '').toLowerCase().includes(searchEmp.toLowerCase()) || 
                            (emp.nrp || '').toLowerCase().includes(searchEmp.toLowerCase())
                          )
                          .slice(0, 15)
                          .map(emp => (
                            <div
                              key={emp.nrp}
                              className="p-4 hover:bg-blue-600 hover:text-white cursor-pointer border-b border-slate-50 last:border-0 transition-all flex flex-col"
                              onClick={() => {
                                setValues({ ...values, [f.key]: emp.nrp })
                                setSearchEmp(`${emp.nrp} - ${emp.nama}`)
                              }}
                            >
                              <span className="font-black text-sm">{emp.nama}</span>
                              <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{emp.nrp} • {emp.jabatan}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )
              ) : f.type === 'select' ? (
                <select value={values[f.key] || ''} onChange={e => setValues({...values, [f.key]: e.target.value})} className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm" required={f.required}>
                  <option value="">-- Pilih --</option>
                  {f.options?.map((o: any) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea value={values[f.key] || ''} onChange={e => setValues({...values, [f.key]: e.target.value})} placeholder={f.placeholder} className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm min-h-[120px]" required={f.required} />
              ) : (
                <input type={f.type} value={values[f.key] || ''} onChange={e => setValues({...values, [f.key]: e.target.value})} placeholder={f.placeholder} className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm" required={f.required} />
              )}
            </div>
          ))}
          <div className="flex gap-4 pt-8 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">BATAL</button>
            <button type="submit" disabled={saving} className="flex-1 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all">
              {saving ? 'PROSES SIMPAN...' : '💾 SIMPAN DATA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


// ============ 👤 ROLE MANAGER ============
function RoleManagerView({ title }: any) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetch('/api/role-manager').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  async function toggleRole(nrp: string, role: string, isActive: boolean) {
    const action = isActive ? 'remove' : 'assign'
    const res = await fetch('/api/role-manager', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nrp, role, action })
    })
    if (res.ok) {
      const d = await fetch('/api/role-manager').then(r => r.json())
      setData(d)
    }
  }

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">MEMUAT AKSES ROLE...</div>

  const filteredEmployees = (data?.employees || []).filter((e: any) => 
    e.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.nrp.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
          <p className="text-sm text-slate-500 font-medium">Kelola hak akses karyawan per modul aplikasi.</p>
        </div>
        
        <div className="w-full md:w-80 relative">
          <input 
            type="text" 
            placeholder="🔍 Cari Nama atau NRP..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-4 pl-12 bg-white border-2 border-slate-100 rounded-2xl shadow-sm focus:border-blue-500 outline-none font-bold text-sm transition-all"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredEmployees.length === 0 ? (
          <div className="p-20 text-center bg-white rounded-[2rem] border-2 border-dashed text-slate-300 font-bold uppercase italic">Karyawan tidak ditemukan.</div>
        ) : (
          filteredEmployees.map((e: any) => (
            <div key={e.nrp} className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-blue-100 transition-all group">
              <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">{e.nama[0]}</div>
                  <div>
                      <div className="font-black text-slate-900">{e.nama}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{e.nrp} • {e.jabatan} • {e.site}</div>
                  </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  'atasan', 
                  'pjo', 
                  'admin_site',
                  'admin_plant',
                  'hrga_site', 
                  'hrga_oprek'
                ].map(role => (
                  <button 
                    key={role} 
                    onClick={() => toggleRole(e.nrp, role, e.roles?.includes(role))}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all active:scale-90 border-2 ${
                      e.roles?.includes(role) 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                        : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {role.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ============ 📥 IMPORT EXCEL ============
function ImportExcel({ title, table }: any) {
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true); setMsg({ type: '', text: '' })
    const fd = new FormData()
    fd.append('file', file); fd.append('table', table)
    try {
      const res = await fetch('/api/import-excel', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) setMsg({ type: 'err', text: `❌ ${data.error || 'Import Gagal'}` })
      else setMsg({ type: 'ok', text: `✅ ${data.message}` })
    } catch { setMsg({ type: 'err', text: '❌ Kesalahan Koneksi Server' }) }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <h2 className="text-3xl font-black mb-8 text-slate-900 tracking-tight">📥 {title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">📄 Download Template</h3>
            <div className="space-y-3">
                <button onClick={() => window.open(`/api/template-excel?table=${table}&mode=export`, '_blank')} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95">📥 Download Master Data</button>
                <button onClick={() => window.open(`/api/template-excel?table=${table}&mode=empty`, '_blank')} className="w-full bg-white/10 text-white py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10">📄 Template Kosong</button>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-[2.5rem] border-4 border-slate-50 p-8 shadow-xl">
          <h3 className="text-xl font-black text-slate-900 mb-6">📤 Upload Berkas Excel</h3>
          {msg.text && <div className={`p-4 rounded-2xl mb-6 text-sm font-bold ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}
          <form onSubmit={handleImport} className="space-y-6">
            <div className="p-6 border-4 border-dashed border-slate-100 rounded-[2rem] text-center hover:border-blue-200 transition-all bg-slate-50/30">
                <input type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-xs cursor-pointer font-bold" />
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-4">Pastikan file sesuai format template BTM.</p>
            </div>
            <button type="submit" disabled={loading || !file} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-blue-200 active:scale-95 transition-all">
              {loading ? '⏳ MENGIMPORT...' : 'IMPORT DATA SEKARANG'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ============ 🔑 CHANGE LOGIN ============
function ChangeLoginView({ title }: any) {
  const [newNrp, setNewNrp] = useState('')
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/profile/change-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_nrp_login: newNrp })
    })
    const data = await res.json()
    if (res.ok) { setMsg({ type: 'ok', text: data.message }); setNewNrp('') }
    else setMsg({ type: 'err', text: data.error })
    setLoading(false)
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-black mb-6">🔑 {title}</h2>
      <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-2xl">
        {msg.text && <div className={`p-4 rounded-2xl mb-6 text-sm font-bold ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}
        <div className="bg-amber-50 p-5 rounded-2xl mb-6 text-[10px] text-amber-800 font-bold uppercase tracking-widest leading-relaxed">⚠️ PERINGATAN: Gunakan NRP yang terdaftar. Anda akan otomatis logout setelah proses berhasil.</div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input label="Masukkan NRP Login Baru" required value={newNrp} onChange={setNewNrp} placeholder="Contoh: 123456" />
          <button disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-lg tracking-tight active:scale-95 transition-all shadow-xl">
            {loading ? 'MEMPROSES...' : 'GANTI NRP LOGIN'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ============ 📥 EXPORT ABSENSI ============
function ExportAbsensiView({ title }: any) {
  const [filters, setFilters] = useState({ tanggal_mulai: '', tanggal_selesai: '', site: '', nrp: '', status: '' })

  function handleExport() {
    if (!filters.tanggal_mulai || !filters.tanggal_selesai) { alert('⚠️ Tanggal Periode Wajib Diisi!'); return }
    let url = '/api/export-absensi?'
    Object.keys(filters).forEach(k => { const v = (filters as any)[k]; if (v) url += `${k}=${encodeURIComponent(v)}&` })
    window.open(url, '_blank')
  }

  function setBulanIni() {
    const now = new Date()
    setFilters({ ...filters, tanggal_mulai: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], tanggal_selesai: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0] })
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-3xl font-black mb-8 text-slate-900 tracking-tight">📥 {title}</h2>
      <div className="bg-white p-10 rounded-[3rem] border shadow-2xl space-y-8">
        <div className="flex justify-between items-center border-b pb-6 border-slate-50">
            <span className="text-sm font-black text-slate-800 uppercase tracking-widest">Filter Laporan</span>
            <button onClick={setBulanIni} className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all">📆 Bulan Ini</button>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Input label="Dari Tanggal" type="date" value={filters.tanggal_mulai} onChange={(v:any) => setFilters({...filters, tanggal_mulai: v})} />
          <Input label="Sampai Tanggal" type="date" value={filters.tanggal_selesai} onChange={(v:any) => setFilters({...filters, tanggal_selesai: v})} />
        </div>
        <Input label="Filter NRP Karyawan (Opsional)" value={filters.nrp} onChange={(v:any) => setFilters({...filters, nrp: v})} placeholder="Masukkan NRP untuk filter spesifik" />
        <button onClick={handleExport} className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl shadow-emerald-200 active:scale-95 transition-all">📥 DOWNLOAD LAPORAN EXCEL</button>
      </div>
    </div>
  )
}

// ============ 📅 ROSTER VIEW ============
function RosterView({ title }: any) {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/roster/list').then(r => r.json()).then(d => { setFiles(d.files || []); setLoading(false) })
  }, [])

  if (loading) return <div className="text-center py-20 font-black text-slate-300 animate-pulse tracking-widest">MEMUAT DOKUMEN ROSTER...</div>
  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-3xl font-black mb-8 text-slate-900 tracking-tight">📅 {title}</h2>
      {files.length === 0 ? <div className="bg-white p-24 rounded-[3rem] border-2 border-dashed border-slate-100 text-center text-slate-300 font-bold italic">Belum Ada Berkas Roster Terlampir.</div> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {files.map(f => (
            <div key={f.id} className="bg-white p-6 rounded-3xl border shadow-lg hover:border-blue-200 transition-all group">
              <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">{f.site || 'General Site'}</div>
              <div className="font-black text-xl text-slate-900 mb-6 tracking-tight">📅 {f.periode}</div>
              <a href={f.file_url} target="_blank" className="w-full inline-block text-center bg-slate-900 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] group-hover:bg-blue-600 transition-all">👁️ Lihat Dokumen</a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ 📅 ROSTER UPLOAD ============
function RosterUpload({ title }: any) {
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({ periode: '', site: '', keterangan: '' })
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    const fd = new FormData()
    fd.append('file', file); fd.append('periode', form.periode); fd.append('site', form.site); fd.append('keterangan', form.keterangan)
    try {
      const res = await fetch('/api/roster/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) { setMsg({ type: 'ok', text: `✅ Roster ${form.periode} Berhasil Diunggah` }); setFile(null); setForm({ periode: '', site: '', keterangan: '' }) }
      else setMsg({ type: 'err', text: data.error })
    } catch { setMsg({ type: 'err', text: 'Gagal Menghubungi Server' }) }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
      <h2 className="text-3xl font-black mb-8 text-slate-900 tracking-tight">📅 {title}</h2>
      <div className="bg-white p-10 rounded-[3rem] border-4 border-slate-50 shadow-2xl">
        {msg.text && <div className={`p-4 rounded-2xl mb-8 text-sm font-black ${msg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{msg.text}</div>}
        <form onSubmit={handleUpload} className="space-y-6">
          <Input label="Periode Roster" required value={form.periode} onChange={(v:any) => setForm({...form, periode: v})} placeholder="CONTOH: JANUARI 2024" />
          <Input label="Nama Site" value={form.site} onChange={(v:any) => setForm({...form, site: v})} placeholder="Lokasi Site Kerja" />
          <Input label="Catatan Tambahan" value={form.keterangan} onChange={(v:any) => setForm({...form, keterangan: v})} />
          <div className="p-8 border-4 border-dashed border-slate-50 rounded-[2rem] bg-slate-50/50 text-center">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Pilih Berkas PDF / Gambar</label>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-xs font-bold cursor-pointer" required />
          </div>
          <button disabled={loading} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl shadow-blue-200 active:scale-95 transition-all">
            {loading ? 'SEDANG MENGUNGGAH...' : 'UPLOAD ROSTER'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ============ 🗓️ RIWAYAT ABSENSI ============
function RiwayatAbsensiCustom({ data }: any) {
  const rows = [...(data.rows || [])].sort((a, b) => 
    new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
  )
  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{data.title}</h2>
          <p className="text-sm text-slate-500 font-medium">Laporan sinkronisasi Roster Shift vs Data Absensi Lapangan</p>
        </div>
        <button className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-slate-800 transition-all">📥 Export Laporan</button>
      </div>
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-950 border-b border-slate-800 text-white uppercase text-[9px] font-black tracking-[0.2em]">
            <tr>
              <th className="px-8 py-5">Tanggal</th>
              <th className="px-8 py-5">Shift Roster</th>
              <th className="px-8 py-5">Actual Attendance</th>
              <th className="px-8 py-5">Evident</th>
              <th className="px-8 py-5">Status Kedisiplinan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-300 font-black uppercase tracking-widest italic">Data Roster Periode Ini Belum Tersedia.</td></tr>
            ) : rows.map((r: any, i: number) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-all">
                <td className="px-8 py-5 font-black text-slate-900">{new Date(r.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</td>
                <td className="px-8 py-5">
                    {(() => {
                      const shiftMap: any = {
                        'S': { label: 'S (Siang)', color: 'bg-amber-100 text-amber-700' },
                        'M': { label: 'M (Malam)', color: 'bg-indigo-100 text-indigo-700' },
                        'OFF': { label: 'OFF', color: 'bg-slate-100 text-slate-500' },
                        'ID': { label: 'ID (Induksi)', color: 'bg-emerald-100 text-emerald-700' },
                        'CR': { label: 'CR (Cuti Roster)', color: 'bg-purple-100 text-purple-700' }
                      };
                      const shift = shiftMap[r.roster] || { label: r.roster || '-', color: 'bg-slate-100 text-slate-500' };
                      return (
                        <span className={`px-3 py-1.5 rounded-xl font-black text-[10px] tracking-widest ${shift.color}`}>
                          {shift.label}
                        </span>
                      );
                    })()}
                </td>
                <td className="px-8 py-5 font-black text-slate-700 tracking-tighter">{r.actual}</td>
                <td className="px-8 py-5">
                    {r.is_foto ? <a href={r.evident} target="_blank" className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest border border-blue-100">🖼️ Foto</a> : <span className="font-mono text-[10px] text-slate-400 font-bold">{r.evident}</span>}
                </td>
                <td className="px-8 py-5">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${r.keterangan.includes('SUKSES') ? 'text-emerald-600' : r.keterangan.includes('TERLAMBAT') ? 'text-amber-600' : 'text-rose-500'}`}>{r.keterangan}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============ 📜 RIWAYAT APPROVAL VIEW ============
function RiwayatApprovalView({ data, onReload }: any) {
  const rows = data?.rows || []
  const [bulan, setBulan] = useState(data?.bulan || String(new Date().getMonth() + 1).padStart(2, '0'))
  const [tahun, setTahun] = useState(data?.tahun || String(new Date().getFullYear()))
  const [filterJenis, setFilterJenis] = useState('ALL')

  const filteredRows = filterJenis === 'ALL' ? rows : rows.filter((r: any) => r.jenis.includes(filterJenis))

  async function reloadWithPeriod() {
    window.location.href = `/dashboard?menu=riwayat_approval&bulan=${bulan}&tahun=${tahun}`
  }

  const bulanNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  const statCounts = {
    total: rows.length,
    approved: rows.filter((r: any) => r.status === 'APPROVED').length,
    rejected: rows.filter((r: any) => r.status === 'REJECTED').length
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">📜 {data.title}</h2>
        <p className="text-sm text-slate-500 font-medium italic">Daftar pengajuan yang pernah Anda proses (Approve/Reject)</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-50 shadow-lg">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Diproses</p>
          <p className="text-3xl font-black text-slate-900">{statCounts.total}</p>
        </div>
        <div className="bg-emerald-50 p-5 rounded-2xl border-2 border-emerald-100 shadow-lg">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">✅ Disetujui</p>
          <p className="text-3xl font-black text-emerald-600">{statCounts.approved}</p>
        </div>
        <div className="bg-rose-50 p-5 rounded-2xl border-2 border-rose-100 shadow-lg">
          <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">❌ Ditolak</p>
          <p className="text-3xl font-black text-rose-600">{statCounts.rejected}</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border-2 border-slate-50 shadow-lg flex flex-wrap gap-3 items-center">
        <span className="text-xs font-black text-slate-500 uppercase">Filter Periode:</span>
        <select value={bulan} onChange={e => setBulan(e.target.value)} className="p-2 border-2 border-slate-100 rounded-xl text-xs font-bold">
          {bulanNames.map((b, i) => (
            <option key={i} value={String(i+1).padStart(2, '0')}>{b}</option>
          ))}
        </select>
        <select value={tahun} onChange={e => setTahun(e.target.value)} className="p-2 border-2 border-slate-100 rounded-xl text-xs font-bold">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={reloadWithPeriod} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-700">
          🔍 TAMPILKAN
        </button>

        <div className="ml-auto flex gap-2">
          <button onClick={() => setFilterJenis('ALL')} className={`px-3 py-2 rounded-xl text-[10px] font-black ${filterJenis === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500'}`}>SEMUA</button>
          <button onClick={() => setFilterJenis('CUTI')} className={`px-3 py-2 rounded-xl text-[10px] font-black ${filterJenis === 'CUTI' ? 'bg-blue-500 text-white' : 'bg-slate-50 text-slate-500'}`}>🌴 CUTI</button>
          <button onClick={() => setFilterJenis('LEMBUR')} className={`px-3 py-2 rounded-xl text-[10px] font-black ${filterJenis === 'LEMBUR' ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-500'}`}>⏰ LEMBUR</button>
          <button onClick={() => setFilterJenis('SAKIT')} className={`px-3 py-2 rounded-xl text-[10px] font-black ${filterJenis === 'SAKIT' ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-500'}`}>🤒 SAKIT</button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800">
              <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-widest">Tanggal Aksi</th>
              <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-widest">Jenis</th>
              <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-widest">Tahap</th>
              <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-widest">Nama Karyawan</th>
              <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-widest">Tgl Pengajuan</th>
              <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-widest">Status</th>
              <th className="px-6 py-5 font-black text-white uppercase text-[10px] tracking-widest">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.map((r: any, i: number) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900 text-xs">
                  {r.tanggal_aksi ? new Date(r.tanggal_aksi).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
                <td className="px-6 py-4 font-black text-xs">{r.jenis}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black ${r.tahap === 'PJO' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                    {r.tahap}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-700 uppercase text-xs">{r.nama_karyawan}</td>
                <td className="px-6 py-4 text-slate-500 text-xs">
                  {r.tanggal_pengajuan ? new Date(r.tanggal_pengajuan).toLocaleDateString('id-ID') : '-'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-black ${
                    r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {r.status === 'APPROVED' ? '✅ APPROVED' : '❌ REJECTED'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500 italic text-xs max-w-xs truncate">"{r.catatan}"</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRows.length === 0 && (
          <div className="p-20 text-center text-slate-300 font-black uppercase tracking-widest italic">
            Belum ada riwayat approval di periode {data.periode}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ 📊 RAPORT KPI KARYAWAN (70/30) ============
function KPISayaRaportView({ data }: any) {
  const raport = data.rows?.[0]

  if (!raport) return (
    <div className="bg-white p-24 rounded-[3rem] border-4 border-dashed border-slate-50 text-center">
      <div className="text-6xl mb-6 grayscale opacity-30">📄</div>
      <h3 className="font-black text-slate-300 uppercase tracking-[0.3em] text-xs italic">Penilaian belum dirilis untuk periode berjalan.</h3>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-in fade-in duration-700">
      <div className="bg-slate-900 text-white p-10 rounded-t-[3rem] relative overflow-hidden shadow-2xl border-x border-t border-slate-800">
        <div className="absolute top-0 right-0 p-12 opacity-5 text-[10rem] font-black italic select-none pointer-events-none tracking-tighter">BTM</div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-10">
            <div>
              <p className="text-amber-500 font-black text-[10px] tracking-[0.4em] uppercase mb-3">Performance & Discipline Evaluation</p>
              <h1 className="text-4xl font-black tracking-tighter text-white">RAPORT KARYAWAN</h1>
            </div>
            <div className="bg-white/5 px-6 py-4 rounded-[1.5rem] backdrop-blur-3xl border border-white/10 text-right">
              <span className="text-[9px] block opacity-40 uppercase font-black tracking-[0.2em] mb-1">Evaluation Period</span>
              <span className="font-black text-base tracking-widest uppercase text-amber-500">{raport.periode}</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-[1.5rem] flex items-center justify-center text-4xl font-black text-slate-950 shadow-2xl shadow-amber-500/20">
              {raport._nama_karyawan?.[0]}
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight">{raport._nama_karyawan}</h2>
              <p className="text-xs opacity-50 font-black tracking-[0.2em] uppercase mt-1">NRP: {raport.nrp} • {raport._jabatan || 'Internal Staff'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-10 border-x border-b border-slate-100 rounded-b-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="text-center p-8 bg-slate-50/50 rounded-[2.5rem] border-2 border-slate-50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Kedisiplinan (Sistem)</p>
            <div className="text-5xl font-black text-slate-900">{raport.nilai_sistem} <span className="text-xs opacity-20 font-bold uppercase tracking-widest">/ 70</span></div>
            <p className="text-[9px] text-slate-400 mt-4 italic font-black uppercase tracking-tighter">Automated Analysis</p>
          </div>
          <div className="text-center p-8 bg-blue-50/30 rounded-[2.5rem] border-2 border-blue-50">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Performa (Atasan)</p>
            <div className="text-5xl font-black text-blue-600">{raport.nilai_performa} <span className="text-xs opacity-20 font-bold uppercase tracking-widest">/ 30</span></div>
            <p className="text-[9px] text-blue-400 mt-4 italic font-black uppercase tracking-tighter">Human Review</p>
          </div>
          <div className="text-center p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl text-white border-4 border-slate-800">
            <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-4">Total Penilaian</p>
            <div className="text-6xl font-black text-amber-500">{raport.nilai_akhir}</div>
            <div className="mt-4 inline-block px-5 py-2 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5">
              {raport.nilai_akhir >= 85 ? 'Sangat Memuaskan' : raport.nilai_akhir >= 70 ? 'Memuaskan' : 'Cukup / Kurang'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-10">
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-2.5 h-6 bg-rose-500 rounded-full"></div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Discipline Breakdown</h3>
                </div>
                <div className="bg-rose-50/50 border-2 border-rose-100 p-8 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 text-4xl grayscale group-hover:scale-110 transition-transform">⚠️</div>
                    <div className="relative z-10">
                        <p className="text-[10px] text-rose-800 font-black uppercase tracking-widest mb-3">Detail Pelanggaran:</p>
                        <p className="text-sm text-rose-600 font-black leading-relaxed tracking-tight italic uppercase">{raport.pelanggaran || 'Zero Violation Recorded'}</p>
                        {raport.persen_pengurang > 0 && (
                            <div className="mt-6 pt-6 border-t border-rose-200 flex items-center justify-between">
                                <span className="text-[10px] text-rose-800 font-black uppercase tracking-widest">Skor Pinalti:</span>
                                <span className="bg-rose-600 text-white px-4 py-1.5 rounded-full text-[11px] font-black shadow-lg shadow-rose-200">
                                -{raport.persen_pengurang}%
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </section>
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-2.5 h-6 bg-blue-500 rounded-full"></div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Manager Feedback</h3>
                </div>
                <div className="bg-slate-50/80 border-2 border-slate-100 p-8 rounded-[2.5rem] relative italic text-slate-700 text-sm leading-relaxed min-h-[140px] shadow-inner font-medium">
                    <span className="absolute -top-2 left-6 text-7xl opacity-5 font-serif select-none pointer-events-none">&quot;</span>
                    {raport.catatan || 'Kinerja dipertahankan, tingkatkan konsistensi kedisiplinan harian.'}
                </div>
            </section>
          </div>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2.5 h-6 bg-emerald-500 rounded-full"></div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Professional Competency</h3>
            </div>
            <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-50">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-50">
                  {[
                    { l: 'Kompetensi & Kinerja', v: raport.cat_kinerja },
                    { l: 'Sikap & Tanggung Jawab', v: raport.cat_sikap },
                    { l: 'Kedisiplinan & Kerja Sama', v: raport.cat_disiplin },
                  ].map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-8 py-6 text-slate-500 font-black text-[10px] uppercase tracking-widest">{item.l}</td>
                      <td className="px-8 py-6 text-right">
                        <span className="text-xl font-black text-slate-900">{item.v || 0}</span>
                        <span className="text-[10px] text-slate-300 ml-2 font-black uppercase">/ 10</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900 text-white">
                    <td className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em]">Total Performance Score</td>
                    <td className="px-8 py-5 text-right font-black text-amber-500 text-base">{raport.nilai_performa || 0} <span className="text-[10px] opacity-40 ml-1">/ 30</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="mt-20 pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-[10px] text-slate-400 text-center md:text-left leading-relaxed font-bold">
            <p className="font-black uppercase tracking-widest mb-1 text-slate-900">PT. Boston Trikora Mahardika</p>
            <p>Generated by BTM Portal Digital System • Internal v1.6.0</p>
            <p>Timestamp: {new Date().toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-slate-950 text-white px-10 py-4 rounded-3xl text-[10px] font-black tracking-[0.4em] uppercase border-b-4 border-amber-500 shadow-2xl">
            Official Report Card
          </div>
        </div>
      </div>
      <p className="text-center mt-10 text-slate-300 text-[9px] font-black tracking-widest uppercase italic">
        This document is strictly confidential and for internal company use only.
      </p>
    </div>
  )
}

// ============ 👥 PENILAIAN BAWAHAN ============
function PenilaianBawahanView({ data, onReload }: any) {
  const [selectedEmp, setSelectedEmp] = useState<any>(null)
  const [activeFilter, setActiveFilter] = useState('OPERATOR')
  const [searchTim, setSearchTim] = useState('')

  const currentMonth = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase()

  const filteredBySearch = data.rows.filter((e: any) => 
    e.nama.toLowerCase().includes(searchTim.toLowerCase()) || 
    e.nrp.toLowerCase().includes(searchTim.toLowerCase())
  )

  const operators = filteredBySearch.filter((e: any) => 
    /operator|driver|huler|dt|exca|dozer|grader|compactor/i.test(e.jabatan)
  )

  const mechanics = filteredBySearch.filter((e: any) => 
    /mechanic|mekanik|welder|tyreman|electric|helper|plant/i.test(e.jabatan) || 
    (e.departemen && e.departemen.toLowerCase().includes('plant'))
  )

  const support = filteredBySearch.filter((e: any) => 
    !operators.includes(e) && !mechanics.includes(e)
  )

  const currentList = activeFilter === 'OPERATOR' ? operators : (activeFilter === 'PLANT' ? mechanics : support)

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{data.title}</h2>
          <p className="text-sm text-slate-500 font-medium">Monitoring performa tim periode <span className="text-blue-600 font-bold">{currentMonth}</span></p>
          
          <div className="flex flex-wrap gap-2 mt-4">
            <button 
              onClick={() => setActiveFilter('OPERATOR')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border-2 transition-all ${activeFilter === 'OPERATOR' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}
            >
              🚜 Operator ({operators.length})
            </button>
            <button 
              onClick={() => setActiveFilter('PLANT')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border-2 transition-all ${activeFilter === 'PLANT' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}
            >
              🛠️ Plant / Mekanik ({mechanics.length})
            </button>
            <button 
              onClick={() => setActiveFilter('SUPPORT')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border-2 transition-all ${activeFilter === 'SUPPORT' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}
            >
              💼 Support ({support.length})
            </button>
          </div>
        </div>

        <div className="w-full md:w-64">
          <input 
            type="text" 
            placeholder="🔍 Cari Nama / NRP..." 
            value={searchTim}
            onChange={(e) => setSearchTim(e.target.value)}
            className="w-full p-3.5 bg-white border-2 border-slate-100 rounded-2xl shadow-sm focus:border-blue-500 outline-none font-bold text-xs"
          />
        </div>
      </div>

      {currentList.length === 0 ? (
        <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
           <p className="text-slate-300 font-black uppercase tracking-widest italic text-lg">Tidak ada anggota tim ditemukan di kategori ini</p>
           <p className="text-slate-400 text-xs mt-2">Pastikan NRP bawahan sudah terdaftar di Approval Matrix Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentList.map((emp: any) => {
            const isDone = emp.last_periode === currentMonth;
            return (
              <div key={emp.nrp} className={`bg-white rounded-[2.5rem] border-2 p-6 shadow-xl transition-all group relative overflow-hidden ${isDone ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-50 hover:border-blue-500'}`}>
                <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[8px] font-black uppercase text-white ${isDone ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                  {isDone ? '✅ Selesai' : '⏳ Perlu Dinilai'}
                </div>

                <div className="flex items-center gap-4 mb-6 mt-2">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-lg ${isDone ? 'bg-emerald-600' : 'bg-slate-900 group-hover:bg-blue-600'}`}>
                    {emp.nama[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 leading-tight truncate">{emp.nama}</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{emp.jabatan}</p>
                    <p className="text-[9px] font-bold text-slate-400 italic">{emp.nrp}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white/50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Terakhir</p>
                    <p className="text-[10px] font-bold text-slate-700">{emp.last_periode || '-'}</p>
                  </div>
                  <div className={`${isDone ? 'bg-emerald-100' : 'bg-blue-50'} p-3 rounded-2xl border border-transparent`}>
                    <p className={`text-[8px] font-black uppercase ${isDone ? 'text-emerald-600' : 'text-blue-400'}`}>Skor</p>
                    <p className={`text-sm font-black ${isDone ? 'text-emerald-700' : 'text-blue-600'}`}>{emp.last_score || '0'}</p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedEmp(emp)}
                  className={`w-full py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase transition-all shadow-xl active:scale-95 ${isDone ? 'bg-white text-emerald-600 border-2 border-emerald-500 hover:bg-emerald-500 hover:text-white' : 'bg-slate-950 text-white hover:bg-blue-600'}`}
                >
                  {isDone ? '🔄 PERBARUI NILAI' : '⭐ INPUT RAPORT'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {selectedEmp && (
        <CrudModal 
          table="kpi" mode="create" 
          row={{ nrp: selectedEmp.nrp, nama: selectedEmp.nama, periode: currentMonth }} 
          onClose={() => setSelectedEmp(null)} 
          onSuccess={() => { setSelectedEmp(null); onReload() }} 
        />
      )}
    </div>
  )
}

// ============ UTILITY COMPONENTS ============
function Input({ label, onChange, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
      <input {...props} onChange={e => onChange(e.target.value)} className="w-full p-3.5 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm" />
    </div>
  )
}

function Select({ label, options, onChange, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
      <select {...props} onChange={e => onChange(e.target.value)} className="w-full p-3.5 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm">
        <option value="">-- Pilih --</option>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function Textarea({ label, onChange, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
      <textarea {...props} onChange={e => onChange(e.target.value)} className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm min-h-[120px]" />
    </div>
  )
}

function StatusBadge({ value }: any) {
  const m: any = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200', APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200', REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    DISETUJUI: 'bg-emerald-50 text-emerald-700 border-emerald-200', HADIR: 'bg-emerald-50 text-emerald-700 border-emerald-200', TERLAMBAT: 'bg-amber-50 text-amber-700 border-amber-200',
    Aktif: 'bg-emerald-50 text-emerald-700 border-emerald-200', Nonaktif: 'bg-slate-100 text-slate-500 border-slate-200'
  }
  return <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${m[value] || 'bg-slate-50 text-slate-400 border-slate-100'}`}>{value}</span>
}

function formatColumnName(col: string) {
  const special: any = {
    _nama_karyawan: '👤 Karyawan', _jabatan: 'Jabatan', _site: 'Site', _departemen: 'Dept',
    nrp: 'NRP', clock_in: 'Masuk', clock_out: 'Pulang', status_atasan: 'Atasan', status_pjo: 'PJO', status_final: 'Status',
    latitude: 'LAT', longitude: 'LNG', radius_meter: 'Radius', nama_site: 'Site Name', active: 'Status', kode: 'ID SISTEM', persen: 'Persen (%)'
  }
  return special[col] || col.replace(/_/g, ' ').toUpperCase()
}

function renderCell(col: string, val: any) {
  if (val === null || val === undefined) return <span className="text-slate-200 italic font-bold text-[10px]">EMPTY</span>
  if (typeof val === 'boolean') return val ? <span className="text-emerald-500 font-black">YES</span> : <span className="text-slate-300 font-black">NO</span>
  if (col.includes('status')) return <StatusBadge value={String(val)} />
  if (col === 'persen') return <span className="font-black text-slate-900">{val}%</span>
  if (col.includes('tanggal') && !col.includes('jam')) { try { return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return String(val) } }
  if (col.includes('foto') || col === 'image_url') return <a href={val} target="_blank" className="text-blue-600 font-black uppercase text-[9px] underline tracking-widest">👁️ DOKUMEN</a>
  return String(val)
}

// ============ 👤 MY IDENTITY VIEW v1.6.0 (Luxury Final Structure) ============
function IdentityView({ data, isPending }: { data: any, isPending: boolean }) {
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    if (!message) return alert("Jelaskan data apa yang ingin diubah");
    setLoading(true);
    try {
      const res = await fetch('/api/profile/request-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: message })
      });
      if (res.ok) {
        alert("✅ Pengajuan revisi data berhasil dikirim ke HRGA.");
        window.location.reload();
      }
    } catch (err) { alert("Gagal mengirim pengajuan"); }
    finally { setLoading(false); }
  };

    const InfoItem = ({ icon, label, value, subValue, color = "text-slate-800" }: any) => (
    <div className="flex items-center gap-4 group">
      <div className="w-10 h-10 bg-slate-50 group-hover:bg-blue-50 rounded-2xl flex items-center justify-center text-lg shadow-sm border border-slate-100 transition-colors">
        {icon}
      </div>
      <div className="flex-1 border-b border-slate-50 pb-2">
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{label}</div>
        <div className={`text-sm font-black tracking-tight ${color}`}>{value || '-'}</div>
        {/* Tambahkan baris di bawah ini untuk Nomor BPJS */}
        {subValue && subValue !== 'BPJS: -' && (
          <div className="text-[10px] font-bold text-blue-500 mt-0.5">{subValue}</div>
        )}
      </div>
    </div>
  )

  const SectionTitle = ({ children }: { children: string }) => (
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-6 flex items-center gap-2">
      <span className="w-4 h-[2px] bg-blue-600/20"></span> {children}
    </h3>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
       {/* 1. PERSONAL INFORMATION */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-100">
        <SectionTitle>Personal Information</SectionTitle>
        <div className="space-y-6">
          <InfoItem icon="👤" label="Nama" value={data.nama} />
          <InfoItem icon="🆔" label="NRP" value={data.nrp} />
          <InfoItem icon="💼" label="Jabatan" value={data.jabatan} />
          <InfoItem icon="🏢" label="Departemen" value={data.departemen} />
          <InfoItem icon="📍" label="Site" value={data.site} />
          <InfoItem icon="📅" label="Tanggal Masuk" value={data.tgl_masuk} />
          <InfoItem icon="🎂" label="Tempat Lahir" value={data.tmpt_lahir} />
          <InfoItem icon="🗓️" label="Tanggal Lahir" value={data.tgl_lahir} />
          <InfoItem icon="💍" label="Status Pernikahan" value={data.status_pernikahan} />
          
          {/* PINDAH KE BAWAH SINI SESUAI REQUEST */}
          <InfoItem icon="📄" label="Kontrak PKWT" value={data.pkwt_periode} color="text-blue-600" />
          <InfoItem 
            icon="⚡" 
            label="Status Karyawan" 
            value={data.status_karyawan} 
            color={data.status_karyawan === 'Aktif' ? 'text-emerald-600' : 'text-rose-600'} 
          />
        </div>
      </section>

      {/* 2. CONTACT INFORMATION */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-100">
        <SectionTitle>Contact Information</SectionTitle>
        <div className="space-y-6">
          <InfoItem icon="📧" label="Email" value={data.email} />
          <InfoItem icon="📞" label="Nomor HP" value={data.no_hp} />
        </div>
      </section>

      {/* --- OTHER SECTION --- */}
      <div className="pt-4 px-2">
         <p className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-400">Other Information</p>
      </div>

      {/* OTHER 1: DATA KARYAWAN */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <SectionTitle>1. Data Karyawan</SectionTitle>
        <div className="space-y-6">
          <InfoItem icon="🆔" label="NRP" value={data.nrp} />
          <InfoItem icon="🪪" label="Nomor SIMPOL" value={data.no_simpol} />
          <InfoItem icon="⏳" label="Exp SIMPOL" value={data.exp_simpol} color="text-amber-600" />
          <InfoItem icon="🎖️" label="Exp SIMPER" value={data.exp_simper} color="text-blue-600" />
          <InfoItem icon="🏥" label="Exp MCU" value={data.exp_mcu} color="text-red-600" />
        </div>
      </section>

          {/* OTHER 2: BPJS */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <SectionTitle>2. BPJS</SectionTitle>
        <div className="space-y-6">
          <InfoItem icon="🛡️" label="BPJS Ketenagakerjaan" value={data.bpjs_tk} />
          <InfoItem icon="🏥" label="BPJS Kesehatan" value={data.bpjs_kes} />
          <InfoItem icon="👩‍💼" label="BPJS Istri/Suami" value={data.bpjs_istri} />
          <InfoItem icon="🧒" label="BPJS Anak 1" value={data.bpjs_anak1} />
          <InfoItem icon="🧒" label="BPJS Anak 2" value={data.bpjs_anak2} />
          <InfoItem icon="🧒" label="BPJS Anak 3" value={data.bpjs_anak3} />
        </div>
      </section>

      {/* OTHER 3: KELUARGA & BPJS KELUARGA */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <SectionTitle>3. Data Keluarga & BPJS</SectionTitle>
        <div className="space-y-6">
          <InfoItem icon="💳" label="Nomor KK" value={data.no_kk} />
          
          {/* Istri dengan BPJS di bawahnya */}
          <InfoItem 
            icon="💍" 
            label="Nama Istri / Suami" 
            value={data.nama_istri} 
            subValue={data.bpjs_istri !== '-' ? `BPJS: ${data.bpjs_istri}` : null} 
          />

          {/* Anak 1 dengan BPJS di bawahnya */}
          <InfoItem 
            icon="👶" 
            label="Anak ke-1" 
            value={data.nama_anak1} 
            subValue={data.bpjs_anak1 !== '-' ? `BPJS: ${data.bpjs_anak1}` : null} 
          />

          {/* Anak 2 dengan BPJS di bawahnya */}
          <InfoItem 
            icon="👶" 
            label="Anak ke-2" 
            value={data.nama_anak2} 
            subValue={data.bpjs_anak2 !== '-' ? `BPJS: ${data.bpjs_anak2}` : null} 
          />

          {/* Anak 3 dengan BPJS di bawahnya */}
          <InfoItem 
            icon="👶" 
            label="Anak ke-3" 
            value={data.nama_anak3} 
            subValue={data.bpjs_anak3 !== '-' ? `BPJS: ${data.bpjs_anak3}` : null} 
          />
        </div>
      </section>

      {/* ACTION BUTTON */}
      <div className="px-4">
        <button 
          onClick={() => setShowModal(true)}
          disabled={isPending}
          className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95 ${isPending ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#003D79] text-white'}`}
        >
          {isPending ? '⏳ Sedang Pending Direview' : '📝 Ajukan Perubahan Data'}
        </button>
        <p className="text-[9px] text-center text-slate-400 mt-5 font-bold uppercase tracking-widest px-8 leading-relaxed">
          {isPending 
            ? "Jika pengajuan masih pending, artinya semua data di atas belum berubah. Jika sukses maka data sudah direvisi."
            : "Klik untuk mengajukan perubahan jika data di atas tidak sesuai."
          }
        </p>
      </div>

      {/* MODAL PENGAJUAN (Sama seperti sebelumnya) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[999] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-black text-xl text-[#003D79] mb-2 uppercase tracking-tight">Revisi Data</h3>
            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Contoh: Ubah No KK menjadi 3201..."
              className="w-full h-40 p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-blue-500 font-bold text-sm transition-all"
            />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest">Batal</button>
              <button onClick={handleRequest} disabled={loading} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Kirim</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}