'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'

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
 */
function DashboardView({ title, data }: any) {
  const stats = data?.stats || { 
    total: 0, done: 0, hadir: 0, expired: 0, periode: '-', 
    user_name: '', clock_in_time: '--:--', clock_out_time: '--:--' 
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-700 pb-28">
      <div className="relative mb-12">
        <div className="bg-[#003D79] rounded-[2.5rem] p-8 pt-10 pb-24 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-400/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="relative z-10">
            <p className="text-blue-200/70 font-bold text-[10px] uppercase tracking-[0.3em] mb-2">{getGreeting()}</p>
            <h2 className="text-2xl font-black text-white tracking-tight">{data.user_name || stats.user_name || 'Rekan BTM'} 👋</h2>
            <p className="text-blue-200/50 text-[10px] font-medium mt-1 uppercase tracking-widest italic">{stats.periode}</p>
          </div>
        </div>

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

  // 🔐 Menu yang punya View sendiri (tidak perlu fetch /api/data)
  const STANDALONE_MENUS = [
    'manage_permissions',
    'kelola_site_master',
    'setting_site',
    'config_global',
    'reset_password_admin',
    'system_audit'
  ]

  const isStandalone = STANDALONE_MENUS.includes(menuKey)

  useEffect(() => {
    if (!isStandalone) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [menuKey])

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

  // 🔐 Renderer Standalone (tidak butuh data dari API)
  if (menuKey === 'manage_permissions') return <PermissionManagerView />
  if (menuKey === 'kelola_site_master' || menuKey === 'setting_site') return <SitesManagerView />
  if (menuKey === 'config_global') return <GlobalConfigView />
  if (menuKey === 'reset_password_admin') return <ResetPasswordAdminView />
  if (menuKey === 'system_audit') return <SystemAuditView />

  // Non-standalone: cek error & data
  if (error) return <div className="bg-red-50 border-2 border-red-100 text-red-700 p-6 rounded-3xl mx-4 mt-10 text-center font-bold">❌ {error}</div>
  if (!data) return null
  if (data.type === 'identity_view') return <IdentityView data={data.data} />
  if (data.type === 'dashboard') return <DashboardView title={data.title} data={data} />
  if (data.type === 'form_cuti') return <FormCutiView title={data.title} onSuccess={loadData} data={data} />
  if (data.type === 'form_lembur') return <FormLemburView title={data.title} onSuccess={loadData} data={data} />
  if (data.type === 'form_sakit') return <FormSakitView title={data.title} onSuccess={loadData} data={data} />
  if (data.type === 'pkwt_saya') return <PKWTSayaView title={data.title} data={data} onSuccess={loadData} />
  if (data.type === 'apd_history') return <APDHistoryView data={data} onReload={loadData} />
  if (data.type === 'absensi_clock') return <AbsensiClockView title={data.title} />
  if (data.type === 'riwayat_approval') return <RiwayatApprovalView data={data} onReload={loadData} />
  if (data.type === 'table') return <TableView data={data} onReload={loadData} />
  if (data.type === 'import_excel') return <ImportExcel title={data.title} table={data.table} />
  if (data.type === 'roster_view') return <RosterView title={data.title} />
  if (data.type === 'roster_upload') return <RosterUpload title={data.title} />
  if (data.type === 'role_manager') return <RoleManagerView title={data.title} />
  if (data.type === 'change_login') return <ChangeLoginView title={data.title} />
  if (data.type === 'change_password') return <ChangePasswordView title={data.title} />
  if (data.type === 'export_absensi') return <ExportAbsensiView title={data.title} />
  if (data.type === 'riwayat_absensi_custom') return <RiwayatAbsensiCustom data={data} />
  if (data.type === 'kpi_saya') return <KPISayaRaportView data={data} />
  if (data.type === 'penilaian_tim') return <PenilaianBawahanView data={data} onReload={loadData} />

  return <div className="p-10 text-center text-gray-500 italic">Tipe konten '{data.type}' tidak dikenali</div>
}

// ============ 👤 MY IDENTITY VIEW v1.6.1 (Luxury Final) ============
function IdentityView({ data }: { data: any }) {
  const InfoItem = ({ icon, label, value, color = "text-slate-800" }: any) => (
    <div className="flex items-center gap-4 group">
      <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-lg border border-slate-100">{icon}</div>
      <div className="flex-1 border-b border-slate-50 pb-2">
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{label}</div>
        <div className={`text-sm font-black tracking-tight ${color}`}>{value || '-'}</div>
      </div>
    </div>
  )

  const BpjsItem = ({ icon, label, no, nama }: any) => (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-lg border border-slate-100 mt-1">{icon}</div>
      <div className="flex-1 border-b border-slate-50 pb-3">
        <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">{label}</div>
        <div className="text-sm font-black text-slate-900 tracking-tight leading-none mb-1">{no || '-'}</div>
        <div className="text-[11px] font-bold text-slate-400 uppercase">{nama || '-'}</div>
      </div>
    </div>
  )

  const SectionTitle = ({ children }: { children: string }) => (
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-6 flex items-center gap-2">
      <span className="w-4 h-[2px] bg-blue-600/20"></span> {children}
    </h3>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-32 animate-in fade-in duration-500">
      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <SectionTitle>Personal Information</SectionTitle>
        <div className="space-y-6">
          <InfoItem icon="👤" label="Nama" value={data.nama} />
          <InfoItem icon="💼" label="Jabatan" value={data.jabatan} />
          <InfoItem icon="🏢" label="Departemen" value={data.departemen} />
          <InfoItem icon="📍" label="Site" value={data.site} />
          <InfoItem icon="📅" label="Tanggal Masuk" value={data.tgl_masuk} />
          <InfoItem icon="🎂" label="Tempat Lahir" value={data.tmpt_lahir} />
          <InfoItem icon="🗓️" label="Tanggal Lahir" value={data.tgl_lahir} />
          <InfoItem icon="🏠" label="Alamat" value={data.alamat} />
          <InfoItem icon="💍" label="Status Pernikahan" value={data.status_pernikahan} />
          <InfoItem icon="📄" label="Kontrak PKWT" value={data.pkwt_periode} color="text-blue-600" />
          <InfoItem icon="⚡" label="Status Karyawan" value={data.status_karyawan} color="text-emerald-600" />
        </div>
      </section>

      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <SectionTitle>Contact Information</SectionTitle>
        <div className="space-y-6">
          <InfoItem icon="📧" label="Email" value={data.email} />
          <InfoItem icon="📞" label="Nomor HP" value={data.no_hp} />
          <InfoItem icon="🚨" label="Nomor Darurat" value={data.no_darurat} color="text-rose-600" />
        </div>
      </section>

      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <SectionTitle>Validity & Permits</SectionTitle>
        <div className="space-y-6">
          <InfoItem icon="🪪" label="Nomor SIMPOL" value={data.no_simpol} />
          <InfoItem icon="⏳" label="Exp SIMPOL" value={data.exp_simpol} color="text-amber-600" />
          <InfoItem icon="🎖️" label="Exp SIMPER" value={data.exp_simper} color="text-blue-600" />
          <InfoItem icon="🏥" label="Exp MCU" value={data.exp_mcu} color="text-red-600" />
        </div>
      </section>

      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <SectionTitle>BPJS Information</SectionTitle>
        <div className="space-y-8">
          <BpjsItem icon="🛡️" label="BPJS Ketenagakerjaan" no={data.bpjs_tk_no} nama={data.bpjs_tk_nama} />
          <BpjsItem icon="🏥" label="BPJS Kesehatan" no={data.bpjs_kes_no} nama={data.bpjs_kes_nama} />
          <BpjsItem icon="👩‍💼" label="BPJS Istri / Suami" no={data.bpjs_istri_no} nama={data.bpjs_istri_nama} />
          <BpjsItem icon="🧒" label="BPJS Anak 1" no={data.bpjs_anak1_no} nama={data.bpjs_anak1_nama} />
          <BpjsItem icon="🧒" label="BPJS Anak 2" no={data.bpjs_anak2_no} nama={data.bpjs_anak2_nama} />
          <BpjsItem icon="🧒" label="BPJS Anak 3" no={data.bpjs_anak3_no} nama={data.bpjs_anak3_nama} />
        </div>
      </section>

      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <SectionTitle>Data Keluarga</SectionTitle>
        <div className="space-y-6">
          <InfoItem icon="💳" label="Nomor KK" value={data.no_kk} />
          <InfoItem icon="💍" label="Nama Istri" value={data.nama_istri} />
          <InfoItem icon="👶" label="Nama Anak ke-1" value={data.nama_anak1} />
          <InfoItem icon="👶" label="Nama Anak ke-2" value={data.nama_anak2} />
        </div>
      </section>

      {data.punishments && data.punishments.length > 0 && (
        <section className="bg-rose-50 rounded-[2.5rem] p-8 shadow-sm border border-rose-100">
          <SectionTitle>Historical Punishment</SectionTitle>
          <div className="space-y-6">
            {data.punishments.map((sp: any, idx: number) => (
              <div key={idx} className="flex items-start gap-4 bg-white p-4 rounded-3xl border border-rose-200">
                <div className="text-2xl mt-1">⚠️</div>
                <div>
                  <div className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{sp.jenis_sp}</div>
                  <div className="text-sm font-black text-slate-900 tracking-tight">{sp.alasan || 'Pelanggaran Kedisiplinan'}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase mt-1 italic">Berlaku Sampai: {new Date(sp.berlaku_sampai).toLocaleDateString('id-ID')}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-[8px] text-center text-slate-300 mt-10 font-bold uppercase tracking-widest px-8 italic">
        BTM Portal v1.6.1 • Data disinkronkan otomatis.
      </p>
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

// ============ 🤒 FORM PENGAJUAN EVIDEN (SAKIT / IZIN POTONGAN / IZIN BERBAYAR) ============
function FormSakitView({ title, onSuccess, data }: any) {
  const [form, setForm] = useState({
    kategori: 'SAKIT',
    alasan_izin: '',
    tanggal: '',
    keterangan: '',
    foto_url: '',
    atasan_nrp: ''
  })
  const [atasanList, setAtasanList] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const riwayat = data?.rows || []

  const ALASAN_IZIN_BERBAYAR = [
    'Pekerja menikah',
    'Menikahkan anaknya',
    'Mengkhitankan anaknya',
    'Membaptiskan anaknya',
    'Suami/istri, orang tua/mertua, anak, atau menantu meninggal dunia',
    'Istri melahirkan atau keguguran kandungan',
    'Anggota keluarga dalam satu rumah meninggal dunia',
    'Mendapat musibah (kebakaran dan bencana alam)'
  ]

  const KATEGORI_CONFIG: any = {
    SAKIT: {
      label: 'Sakit',
      icon: '🤒',
      color: 'rose',
      bgClass: 'bg-rose-500',
      hoverClass: 'hover:bg-rose-600',
      shadowClass: 'shadow-rose-200',
      borderActive: 'border-rose-500 bg-rose-50',
      desc: 'Butuh SKS / Surat Dokter'
    },
    IZIN_POTONGAN: {
      label: 'Izin Potongan',
      icon: '⚠️',
      color: 'amber',
      bgClass: 'bg-amber-500',
      hoverClass: 'hover:bg-amber-600',
      shadowClass: 'shadow-amber-200',
      borderActive: 'border-amber-500 bg-amber-50',
      desc: 'Izin dengan potongan gaji'
    },
    IZIN_BERBAYAR: {
      label: 'Izin Berbayar',
      icon: '✅',
      color: 'emerald',
      bgClass: 'bg-emerald-500',
      hoverClass: 'hover:bg-emerald-600',
      shadowClass: 'shadow-emerald-200',
      borderActive: 'border-emerald-500 bg-emerald-50',
      desc: 'Sesuai UU Ketenagakerjaan'
    }
  }

  const currentConfig = KATEGORI_CONFIG[form.kategori]

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
    if (!form.foto_url) return alert("⚠️ Mohon upload foto bukti terlebih dahulu!")
    if (form.kategori === 'IZIN_BERBAYAR' && !form.alasan_izin) {
      return alert("⚠️ Mohon pilih salah satu alasan Izin Berbayar!")
    }

    setLoading(true)
    try {
      const payload: any = {
        kategori: form.kategori,
        tanggal: form.tanggal,
        keterangan: form.keterangan,
        foto_url: form.foto_url,
        atasan_nrp: form.atasan_nrp,
        status_atasan: 'PENDING'
      }
      if (form.kategori === 'IZIN_BERBAYAR') {
        payload.alasan_izin = form.alasan_izin
      }

      const res = await fetch('/api/crud', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'attendance_evidences', values: payload })
      })
      if (res.ok) {
        alert("✅ Pengajuan berhasil dikirim ke atasan!")
        setForm({ kategori: 'SAKIT', alasan_izin: '', tanggal: '', keterangan: '', foto_url: '', atasan_nrp: '' })
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
        <h2 className="text-2xl font-black mb-2">{currentConfig.icon} {title}</h2>
        <p className="text-xs text-slate-400 mb-8 font-medium">Laporkan ketidakhadiran dengan bukti dokumen lengkap.</p>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* 📌 KATEGORI PILIHAN (3 CARD) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">
              Pilih Kategori Pengajuan <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(KATEGORI_CONFIG).map((key) => {
                const conf = KATEGORI_CONFIG[key]
                const isActive = form.kategori === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, kategori: key, alasan_izin: '' })}
                    className={`p-4 rounded-2xl border-2 transition-all text-center ${
                      isActive
                        ? `${conf.borderActive} ring-2 ring-offset-2 ring-${conf.color}-400`
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="text-2xl mb-1">{conf.icon}</div>
                    <div className={`text-[10px] font-black uppercase tracking-tight ${isActive ? `text-${conf.color}-700` : 'text-slate-500'}`}>
                      {conf.label}
                    </div>
                    <div className="text-[8px] font-bold text-slate-400 mt-1 leading-tight">
                      {conf.desc}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 📌 DROPDOWN ALASAN IZIN BERBAYAR (WAJIB PILIH 1) */}
          {form.kategori === 'IZIN_BERBAYAR' && (
            <div className="bg-emerald-50/50 border-2 border-emerald-100 p-4 rounded-2xl animate-in fade-in duration-300">
              <label className="block text-sm font-bold text-emerald-800 mb-2">
                ✅ Pilih Alasan Izin Berbayar <span className="text-rose-500">*</span>
              </label>
              <p className="text-[10px] font-bold text-emerald-600 mb-3 italic">
                Wajib pilih salah satu sesuai UU Ketenagakerjaan
              </p>
              <select
                required
                value={form.alasan_izin}
                onChange={e => setForm({ ...form, alasan_izin: e.target.value })}
                className="w-full p-3.5 border-2 border-emerald-200 rounded-2xl bg-white text-sm font-bold focus:border-emerald-500 outline-none transition-all"
              >
                <option value="">-- Pilih Alasan --</option>
                {ALASAN_IZIN_BERBAYAR.map((alasan, i) => (
                  <option key={i} value={alasan}>
                    {i + 1}. {alasan}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Info Kategori Terpilih */}
          {form.kategori === 'IZIN_POTONGAN' && (
            <div className="bg-amber-50 border-2 border-amber-100 p-4 rounded-2xl text-[11px] font-bold text-amber-700 leading-relaxed">
              ⚠️ <strong>Perhatian:</strong> Izin Potongan akan mengurangi gaji Anda sesuai kebijakan perusahaan.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Tanggal" type="date" required value={form.tanggal} onChange={(v: any) => setForm({ ...form, tanggal: v })} />

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Atasan Approval (Satu Site)</label>
              <select
                required
                value={form.atasan_nrp}
                onChange={e => setForm({ ...form, atasan_nrp: e.target.value })}
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
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Upload Bukti Dokumen <span className="text-rose-500">*</span>
            </label>
            <p className="text-[10px] font-bold text-slate-400 mb-2 italic">
              {form.kategori === 'SAKIT' && '📄 Upload: SKS / Surat Dokter'}
              {form.kategori === 'IZIN_POTONGAN' && '📄 Upload: Surat Izin / Bukti Keperluan'}
              {form.kategori === 'IZIN_BERBAYAR' && '📄 Upload: Undangan / Surat Kematian / Bukti Musibah'}
            </p>
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

          <Textarea
            label="Keterangan Tambahan"
            value={form.keterangan}
            onChange={(v: any) => setForm({ ...form, keterangan: v })}
            placeholder={
              form.kategori === 'SAKIT' ? "Contoh: Sakit demam, butuh istirahat 3 hari sesuai SKS." :
              form.kategori === 'IZIN_POTONGAN' ? "Contoh: Ada keperluan mendesak keluarga." :
              "Contoh: Detail acara / musibah yang dialami."
            }
          />

          <button
            disabled={loading || uploading}
            className={`w-full py-5 rounded-3xl font-black text-white text-lg transition-all ${
              loading || uploading
                ? 'bg-slate-300'
                : `${currentConfig.bgClass} ${currentConfig.hoverClass} shadow-lg ${currentConfig.shadowClass}`
            }`}
          >
            {loading ? 'MENGIRIM...' : `${currentConfig.icon} KIRIM PENGAJUAN`}
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
                <th className="px-8 py-5">Kategori</th>
                <th className="px-8 py-5">Keterangan</th>
                <th className="px-8 py-5">Dokumen</th>
                <th className="px-8 py-5">Status Atasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {riwayat.map((r: any, i: number) => {
                const kat = r.kategori || 'SAKIT'
                const conf = KATEGORI_CONFIG[kat] || KATEGORI_CONFIG.SAKIT
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-900">{new Date(r.tanggal).toLocaleDateString('id-ID')}</td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-${conf.color}-50 text-${conf.color}-700 border border-${conf.color}-100`}>
                        {conf.icon} {conf.label}
                      </span>
                      {r.alasan_izin && (
                        <p className="text-[9px] text-slate-500 mt-1 italic">→ {r.alasan_izin}</p>
                      )}
                    </td>
                    <td className="px-8 py-5 text-slate-600 italic">"{r.keterangan || '-'}"</td>
                    <td className="px-8 py-5">
                      {r.foto_url ? <a href={r.foto_url} target="_blank" className="text-blue-600 font-black text-[10px] hover:underline">👁️ LIHAT FOTO</a> : '-'}
                    </td>
                    <td className="px-8 py-5">
                      <StatusBadge value={r.status_atasan || 'PENDING'} />
                    </td>
                  </tr>
                )
              })}
              {riwayat.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-10 text-center text-slate-300 font-bold italic">Belum ada riwayat bulan ini</td>
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
      today.setHours(23, 59, 59, 999)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      sevenDaysAgo.setHours(0, 0, 0, 0)
      
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
      {announcement && <AnnouncementCard announcement={announcement} />}

                  <div className="bg-slate-800/40 backdrop-blur-2xl text-white rounded-[1.5rem] md:rounded-[3rem] p-3 md:p-10 text-center shadow-[0_20px_50px_-15px_rgba(0,0,0,0.25)] mb-4 md:mb-6 border border-slate-700/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 via-transparent to-slate-900/30 pointer-events-none"></div>
        <div className="text-2xl md:text-6xl font-black mb-1 tracking-tighter text-white font-mono relative z-10">
          {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="text-blue-300 font-black uppercase text-[7px] md:text-xs tracking-[0.25em] md:tracking-[0.4em] mb-3 md:mb-10 relative z-10">
          {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div className="flex justify-center gap-4 relative z-10">
          {!hasIn ? (
            <button onClick={() => handleClock('in')} className="bg-emerald-500/90 hover:bg-emerald-600 backdrop-blur text-white px-5 md:px-12 py-2.5 md:py-6 rounded-[1rem] md:rounded-[2rem] font-black text-xs md:text-2xl shadow-xl shadow-emerald-500/20 active:scale-90 transition-all">🟢 CLOCK IN</button>
          ) : !hasOut ? (
            <button onClick={() => handleClock('out')} className="bg-rose-500/90 hover:bg-rose-600 backdrop-blur text-white px-5 md:px-12 py-2.5 md:py-6 rounded-[1rem] md:rounded-[2rem] font-black text-xs md:text-2xl shadow-xl shadow-rose-500/20 active:scale-90 transition-all">🔴 CLOCK OUT</button>
          ) : (
            <div className="bg-white/10 backdrop-blur px-4 md:px-10 py-2.5 md:py-6 rounded-[1rem] md:rounded-[2rem] border border-white/10 font-black text-[10px] md:text-xl tracking-tight text-slate-200">✅ SHIFT SELESAI</div>
          )}
        </div>
        <div className="mt-3 md:mt-10 text-[7px] md:text-[9px] text-white/40 flex items-center justify-center gap-2 md:gap-3 font-black tracking-widest relative z-10">
          <div className={`w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'bg-rose-500'}`}></div>
          {isOnline ? 'CONNECTED' : 'OFFLINE'} • {gps ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : 'WAITING GPS...'}
        </div>
      </div>
      
            <div className="grid grid-cols-2 gap-3 md:gap-6">
        <div className="bg-white p-3 md:p-8 rounded-[1.2rem] md:rounded-[2rem] border-2 border-slate-50 shadow-sm group hover:border-emerald-100 transition-all">
          <div className="text-[8px] md:text-[10px] text-slate-400 font-black mb-1 md:mb-2 uppercase tracking-widest">Record Masuk</div>
          <div className="text-lg md:text-3xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{hasIn ? new Date(hasIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit'}) : '--:--'}</div>
        </div>
        <div className="bg-white p-3 md:p-8 rounded-[1.2rem] md:rounded-[2rem] border-2 border-slate-50 shadow-sm group hover:border-rose-100 transition-all">
          <div className="text-[8px] md:text-[10px] text-slate-400 font-black mb-1 md:mb-2 uppercase tracking-widest">Record Pulang</div>
          <div className="text-lg md:text-3xl font-black text-slate-900 group-hover:text-rose-600 transition-colors">{hasOut ? new Date(hasOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit'}) : '--:--'}</div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-[2rem] border-2 border-slate-50 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">History</p>
            <h4 className="text-sm font-black text-[#003D79] tracking-tight">Riwayat 7 Hari Terakhir</h4>
          </div>
          <a href="/dashboard?menu=riwayat_absensi" className="text-[9px] font-black text-slate-400 hover:text-[#003D79] uppercase tracking-widest transition-colors">
            Lihat Semua →
          </a>
        </div>

        <div className="divide-y divide-slate-50">
          {riwayat7Hari.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Belum ada riwayat absensi</p>
            </div>
          ) : (
            riwayat7Hari.map((item, i) => {
              const [jamMasuk, jamPulang] = (item.evident || '-- / --').split(' / ');
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
              
              const tglObj = new Date(item.tanggal);
              const tglFormatted = tglObj.toLocaleDateString('id-ID', { 
                weekday: 'long', 
                day: '2-digit', 
                month: 'short' 
              });
              
              return (
                <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className={`w-2.5 h-2.5 rounded-full ${statusColor.dot} shadow-sm flex-shrink-0`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 tracking-tight mb-0.5 capitalize">{tglFormatted}</p>
                    <p className="text-[10px] font-bold text-slate-400 font-mono tracking-widest">
                      {jamMasuk?.trim() || '--:--'} <span className="text-slate-300 mx-1">→</span> {jamPulang?.trim() || '--:--'}
                    </p>
                  </div>
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

// ============ 📢 ANNOUNCEMENT CARD (Auto-Slide + Swipe) ============
function AnnouncementCard({ announcement }: any) {
  // Gabungkan images (array) + image_url (single legacy) → jadi 1 array
  const images: string[] = Array.isArray(announcement.images) && announcement.images.length > 0
    ? announcement.images
    : announcement.image_url
      ? [announcement.image_url]
      : []

  const [currentIdx, setCurrentIdx] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  // Auto-slide setiap 4 detik (kalau > 1 gambar)
  useEffect(() => {
    if (images.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % images.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [images.length])

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return
    const diff = touchStartX - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe kiri = next
        setCurrentIdx(prev => (prev + 1) % images.length)
      } else {
        // Swipe kanan = prev
        setCurrentIdx(prev => (prev - 1 + images.length) % images.length)
      }
    }
    setTouchStartX(null)
  }

  return (
    <div className={`mb-8 overflow-hidden rounded-[2rem] shadow-2xl border-2 ${announcement.is_urgent ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex flex-col md:flex-row items-stretch">
        {images.length > 0 && (
          <div
            className="md:w-1/3 w-full bg-white relative border-b md:border-b-0 md:border-r border-slate-100"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Slider container */}
            <div className="relative overflow-hidden aspect-video md:aspect-square">
              {images.map((url: string, i: number) => (
                <img
                  key={i}
                  src={url}
                  alt={`Slide ${i + 1}`}
                  className={`absolute inset-0 w-full h-full object-contain p-4 transition-opacity duration-700 ${
                    i === currentIdx ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ))}
            </div>

            {/* Navigasi Prev/Next (hanya jika > 1 gambar) */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentIdx(prev => (prev - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white w-8 h-8 rounded-full shadow-lg font-black text-slate-700 backdrop-blur"
                >
                  ‹
                </button>
                <button
                  onClick={() => setCurrentIdx(prev => (prev + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white w-8 h-8 rounded-full shadow-lg font-black text-slate-700 backdrop-blur"
                >
                  ›
                </button>

                {/* Dot indicators */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 backdrop-blur px-2 py-1 rounded-full">
                  {images.map((_: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setCurrentIdx(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i === currentIdx ? 'bg-white w-4' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>

                {/* Counter */}
                <div className="absolute top-2 right-2 bg-black/50 text-white text-[9px] font-black px-2 py-1 rounded-full backdrop-blur">
                  {currentIdx + 1}/{images.length}
                </div>
              </>
            )}
          </div>
        )}

        <div className="p-8 flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{announcement.is_urgent ? '🚨' : '📢'}</span>
            <h3 className={`font-black text-xl tracking-tight ${announcement.is_urgent ? 'text-red-900' : 'text-blue-900'}`}>
              {announcement.title}
            </h3>
          </div>
          <p className="text-slate-700 text-sm font-medium leading-relaxed whitespace-pre-line">
            {announcement.content}
          </p>
        </div>
      </div>
    </div>
  )
}


// ============ 📊 TABLE VIEW ============
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
      </div>
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

// ============ 🔐 CHANGE PASSWORD VIEW ============
function ChangePasswordView({ title }: any) {
  const [form, setForm] = useState({ password_lama: '', password_baru: '', password_konfirmasi: '' })
  const [show, setShow] = useState({ lama: false, baru: false, konfirmasi: false })
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg({ type: '', text: '' })

    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()

      if (res.ok) {
        setMsg({ type: 'ok', text: data.message })
        setForm({ password_lama: '', password_baru: '', password_konfirmasi: '' })
        setTimeout(async () => {
          await fetch('/api/auth/logout', { method: 'POST' })
          router.push('/')
        }, 2000)
      } else {
        setMsg({ type: 'err', text: data.error })
      }
    } catch (err) {
      setMsg({ type: 'err', text: 'Kesalahan koneksi server' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto pb-32 animate-in fade-in duration-500">
      
      {/* Header Card */}
      <div className="bg-gradient-to-br from-[#003D79] to-blue-800 text-white p-8 rounded-[2.5rem] shadow-2xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-400/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <div className="text-4xl mb-3">🔐</div>
          <h2 className="text-xl font-black tracking-tight mb-1">Ganti Password</h2>
          <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Amankan akun Anda secara berkala</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
        {msg.text && (
          <div className={`p-4 rounded-2xl mb-6 text-xs font-bold ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
            {msg.type === 'ok' ? '✅ ' : '❌ '}{msg.text}
            {msg.type === 'ok' && <p className="text-[10px] mt-2 opacity-70">Anda akan otomatis logout dalam 2 detik...</p>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Password Lama */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Password Lama</label>
            <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus-within:border-[#003D79] focus-within:bg-white transition-all">
              <span className="text-slate-400 mr-3 text-lg">🔒</span>
              <input
                type={show.lama ? 'text' : 'password'}
                value={form.password_lama}
                onChange={(e) => setForm({ ...form, password_lama: e.target.value })}
                className="w-full bg-transparent outline-none font-bold text-sm text-slate-700"
                required
                minLength={4}
              />
              <button
                type="button"
                onClick={() => setShow({ ...show, lama: !show.lama })}
                className="text-slate-400 hover:text-[#003D79] transition-colors ml-2 text-lg active:scale-90"
              >
                {show.lama ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Password Baru */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Password Baru</label>
            <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus-within:border-[#003D79] focus-within:bg-white transition-all">
              <span className="text-slate-400 mr-3 text-lg">🔒</span>
              <input
                type={show.baru ? 'text' : 'password'}
                value={form.password_baru}
                onChange={(e) => setForm({ ...form, password_baru: e.target.value })}
                className="w-full bg-transparent outline-none font-bold text-sm text-slate-700"
                required
                minLength={4}
              />
              <button
                type="button"
                onClick={() => setShow({ ...show, baru: !show.baru })}
                className="text-slate-400 hover:text-[#003D79] transition-colors ml-2 text-lg active:scale-90"
              >
                {show.baru ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Konfirmasi Password */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Konfirmasi Password Baru</label>
            <div className="flex items-center bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 focus-within:border-[#003D79] focus-within:bg-white transition-all">
              <span className="text-slate-400 mr-3 text-lg">🔒</span>
              <input
                type={show.konfirmasi ? 'text' : 'password'}
                value={form.password_konfirmasi}
                onChange={(e) => setForm({ ...form, password_konfirmasi: e.target.value })}
                className="w-full bg-transparent outline-none font-bold text-sm text-slate-700"
                required
                minLength={4}
              />
              <button
                type="button"
                onClick={() => setShow({ ...show, konfirmasi: !show.konfirmasi })}
                className="text-slate-400 hover:text-[#003D79] transition-colors ml-2 text-lg active:scale-90"
              >
                {show.konfirmasi ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-[10px] text-amber-800 font-bold leading-relaxed">
            ⚠️ Password minimal <span className="font-black">4 karakter</span>. Setelah berhasil, Anda akan otomatis logout dan wajib login ulang dengan password baru.
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-[#003D79] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all disabled:bg-slate-300"
          >
            {loading ? 'MEMPROSES...' : '🔐 UBAH PASSWORD'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ============ 🏢 SITES MANAGER (Master Site v2 - Card Mewah) ============
function SitesManagerView() {
  const [sites, setSites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSite, setEditingSite] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState<{ type: string, text: string } | null>(null)
  const [formData, setFormData] = useState<any>({})

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/sites-manager')
      const json = await res.json()
      if (res.ok) setSites(json.sites || [])
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  function openEditModal(site: any) {
    setEditingSite(site)
    setFormData({
      nama_site: site.nama_site || '',
      kode_site: site.kode_site || '',
      alamat: site.alamat || '',
      siang_jam_masuk: (site.siang_jam_masuk || '').slice(0, 5),
      siang_jam_pulang: (site.siang_jam_pulang || '').slice(0, 5),
      siang_batas_telat: site.siang_batas_telat || 15,
      malam_jam_masuk: (site.malam_jam_masuk || '').slice(0, 5),
      malam_jam_pulang: (site.malam_jam_pulang || '').slice(0, 5),
      malam_batas_telat: site.malam_batas_telat || 15,
      latitude: site.latitude || '',
      longitude: site.longitude || '',
      radius_meter: site.radius_meter || 500,
      minus_terlambat: site.minus_terlambat || 1,
      minus_mangkir: site.minus_mangkir || 5,
      minus_sp1: site.minus_sp1 || 15,
      minus_sp2: site.minus_sp2 || 30,
      minus_sp3: site.minus_sp3 || 50,
      minus_cnc: site.minus_cnc || 5,
      active: site.active,
      is_active: site.is_active,
      is_pusat: site.is_pusat
    })
    setMsg(null)
  }

    async function handleDelete() {
    if (!editingSite) return

    // Konfirmasi 2x karena ini permanen
    const confirm1 = confirm(
      `⚠️ HAPUS SITE PERMANEN\n\n` +
      `Site: ${editingSite.nama_site}\n\n` +
      `Tindakan ini TIDAK BISA dibatalkan!\n` +
      `Lanjutkan?`
    )
    if (!confirm1) return

    const confirm2 = confirm(
      `🔴 KONFIRMASI TERAKHIR\n\n` +
      `Yakin hapus site "${editingSite.nama_site}"?\n` +
      `Ketik OK untuk konfirmasi.`
    )
    if (!confirm2) return

    setDeleting(true)
    setMsg(null)
    try {
      const res = await fetch('/api/sites-manager', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingSite.id })
      })
      const json = await res.json()
      if (res.ok) {
        alert(`✅ ${json.message}`)
        setEditingSite(null)
        loadData()
      } else {
        setMsg({ type: 'err', text: '❌ ' + json.error })
      }
    } catch {
      setMsg({ type: 'err', text: '❌ Koneksi bermasalah' })
    } finally {
      setDeleting(false)
    }
  }

  async function handleSave() {
    if (!editingSite) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/sites-manager', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingSite.id, updates: formData })
      })
      const json = await res.json()
      if (res.ok) {
        setMsg({ type: 'ok', text: '✅ Berhasil disimpan!' })
        loadData()
        setTimeout(() => {
          setEditingSite(null)
          setMsg(null)
        }, 1200)
      } else {
        setMsg({ type: 'err', text: '❌ ' + json.error })
      }
    } catch (err) {
      setMsg({ type: 'err', text: '❌ Koneksi bermasalah' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat data site...
    </div>
  )

  return (
    <div className="animate-in fade-in duration-500 pb-32">
      {/* HEADER MEWAH */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-8 rounded-[2.5rem] shadow-2xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">🏢</div>
            <div>
              <p className="text-amber-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Master Data</p>
              <h1 className="text-2xl font-black tracking-tight">Kelola Site</h1>
            </div>
          </div>
          <p className="text-blue-200/70 text-xs font-medium">
            Konfigurasi jam kerja, GPS, radius absensi, dan pengurangan KPI per site
          </p>
        </div>
      </div>

      {/* LIST SITE CARDS */}
      <div className="space-y-4">
        {sites.map((site: any) => (
          <div key={site.id} className={`bg-white rounded-[2.5rem] border-2 shadow-lg overflow-hidden ${
            site.is_active ? 'border-slate-100' : 'border-rose-100 opacity-70'
          }`}>
            {/* Card Header */}
            <div className={`p-6 flex items-center justify-between ${
              site.is_pusat ? 'bg-gradient-to-r from-amber-50 to-white' : 'bg-slate-50/50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                  site.is_pusat ? 'bg-amber-500 text-white' : 'bg-[#003D79] text-white'
                }`}>
                  {site.is_pusat ? '⭐' : '🏢'}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-slate-900 text-base">{site.nama_site}</h3>
                    {site.is_pusat && (
                      <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                        Pusat
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Kode: {site.kode_site || '-'}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                site.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {site.is_active ? '● Aktif' : '○ Nonaktif'}
              </span>
            </div>

            {/* Card Body - Info Grid */}
            <div className="p-6 space-y-4">
              {/* Row 1: Total Karyawan + PJO */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">👥 Karyawan</p>
                  <p className="text-2xl font-black text-blue-700">{site.total_karyawan}</p>
                  <p className="text-[9px] font-bold text-blue-400 uppercase mt-0.5">orang aktif</p>
                </div>
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                  <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">🎖️ PJO Site</p>
                  {site.pjo_list?.length > 0 ? (
                    site.pjo_list.slice(0, 2).map((pjo: any, i: number) => (
                      <p key={i} className="text-xs font-black text-amber-700 leading-tight truncate">
                        {pjo.nama}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs font-black text-slate-400 italic">Belum ada PJO</p>
                  )}
                </div>
              </div>

              {/* Row 2: Shift */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-slate-500 uppercase tracking-widest">☀️ Shift Siang</span>
                  <span className="font-black text-slate-900 font-mono">
                    {(site.siang_jam_masuk || '').slice(0, 5)} — {(site.siang_jam_pulang || '').slice(0, 5)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-slate-500 uppercase tracking-widest">🌙 Shift Malam</span>
                  <span className="font-black text-slate-900 font-mono">
                    {(site.malam_jam_masuk || '').slice(0, 5)} — {(site.malam_jam_pulang || '').slice(0, 5)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
                  <span className="font-black text-slate-500 uppercase tracking-widest">⚠️ Batas Telat</span>
                  <span className="font-black text-rose-600">
                    S: {site.siang_batas_telat}m · M: {site.malam_batas_telat}m
                  </span>
                </div>
              </div>

              {/* Row 3: GPS + Radius */}
              <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-emerald-600 uppercase tracking-widest">📍 Radius GPS</span>
                  <span className="font-black text-emerald-700 text-lg">{site.radius_meter}m</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-black text-slate-400 uppercase tracking-widest">🗺️ Koordinat</span>
                  <span className="font-black text-slate-600 font-mono truncate">
                    {site.latitude ? `${Number(site.latitude).toFixed(4)}, ${Number(site.longitude).toFixed(4)}` : 'Belum diset'}
                  </span>
                </div>
              </div>

              {/* Tombol EDIT */}
              <button 
                onClick={() => openEditModal(site)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#003D79] active:scale-95 transition-all"
              >
                ✏️ EDIT KONFIGURASI SITE
              </button>
            </div>
          </div>
        ))}

        {sites.length === 0 && (
          <div className="p-20 text-center text-slate-300 font-bold italic bg-white rounded-[2rem] border-2 border-dashed">
            Belum ada site terdaftar
          </div>
        )}
      </div>

      {/* MODAL EDIT SITE */}
      {editingSite && (
        <>
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100]" onClick={() => !saving && setEditingSite(null)} />
          <div className="fixed inset-x-2 top-4 bottom-4 lg:inset-x-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[90%] lg:max-w-2xl lg:h-[90vh] bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-br from-slate-900 to-[#003D79] text-white flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                editingSite.is_pusat ? 'bg-amber-500' : 'bg-white/10'
              }`}>
                {editingSite.is_pusat ? '⭐' : '🏢'}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-lg tracking-tight truncate">{editingSite.nama_site}</h2>
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Edit Konfigurasi Site</p>
              </div>
              <button 
                onClick={() => !saving && setEditingSite(null)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {msg && (
              <div className={`px-6 py-3 border-b-2 ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                <p className="text-[11px] font-black uppercase tracking-widest">{msg.text}</p>
              </div>
            )}

            {/* Modal Body - Form */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
              
              {/* SECTION 1: Identitas Site */}
              <div>
                <h3 className="text-[10px] font-black text-[#003D79] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-[#003D79]"></span>
                  Identitas Site
                </h3>
                <div className="space-y-3">
                  <FieldInput label="Nama Site" value={formData.nama_site} onChange={(v: string) => setFormData({...formData, nama_site: v})} />
                  <FieldInput label="Kode Site" value={formData.kode_site} onChange={(v: string) => setFormData({...formData, kode_site: v})} />
                  <FieldInput label="Alamat" value={formData.alamat} onChange={(v: string) => setFormData({...formData, alamat: v})} />
                </div>
              </div>

              {/* SECTION 2: Jam Kerja */}
              <div>
                <h3 className="text-[10px] font-black text-[#003D79] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-[#003D79]"></span>
                  Jam Kerja Shift
                </h3>
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-2xl border-2 border-amber-100">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">☀️ Shift Siang</p>
                    <div className="grid grid-cols-3 gap-2">
                      <FieldInput label="Masuk" type="time" value={formData.siang_jam_masuk} onChange={(v: string) => setFormData({...formData, siang_jam_masuk: v})} />
                      <FieldInput label="Pulang" type="time" value={formData.siang_jam_pulang} onChange={(v: string) => setFormData({...formData, siang_jam_pulang: v})} />
                      <FieldInput label="Telat (menit)" type="number" value={formData.siang_batas_telat} onChange={(v: string) => setFormData({...formData, siang_batas_telat: parseInt(v) || 0})} />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border-2 border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">🌙 Shift Malam</p>
                    <div className="grid grid-cols-3 gap-2">
                      <FieldInput label="Masuk" type="time" value={formData.malam_jam_masuk} onChange={(v: string) => setFormData({...formData, malam_jam_masuk: v})} />
                      <FieldInput label="Pulang" type="time" value={formData.malam_jam_pulang} onChange={(v: string) => setFormData({...formData, malam_jam_pulang: v})} />
                      <FieldInput label="Telat (menit)" type="number" value={formData.malam_batas_telat} onChange={(v: string) => setFormData({...formData, malam_batas_telat: parseInt(v) || 0})} />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: GPS & Radius */}
              <div>
                <h3 className="text-[10px] font-black text-[#003D79] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-[#003D79]"></span>
                  Lokasi & Radius Absensi
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <FieldInput label="Latitude" value={formData.latitude} onChange={(v: string) => setFormData({...formData, latitude: v})} placeholder="-3.286843" />
                    <FieldInput label="Longitude" value={formData.longitude} onChange={(v: string) => setFormData({...formData, longitude: v})} placeholder="122.257307" />
                  </div>
                  <FieldInput label="Radius Absensi (meter)" type="number" value={formData.radius_meter} onChange={(v: string) => setFormData({...formData, radius_meter: parseInt(v) || 0})} />
                </div>
              </div>

              {/* SECTION 4: KPI Minus Poin */}
              <div>
                <h3 className="text-[10px] font-black text-[#003D79] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-[#003D79]"></span>
                  Pengurangan Poin KPI
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <FieldInput label="Terlambat" type="number" value={formData.minus_terlambat} onChange={(v: string) => setFormData({...formData, minus_terlambat: parseInt(v) || 0})} />
                  <FieldInput label="Mangkir" type="number" value={formData.minus_mangkir} onChange={(v: string) => setFormData({...formData, minus_mangkir: parseInt(v) || 0})} />
                  <FieldInput label="SP 1" type="number" value={formData.minus_sp1} onChange={(v: string) => setFormData({...formData, minus_sp1: parseInt(v) || 0})} />
                  <FieldInput label="SP 2" type="number" value={formData.minus_sp2} onChange={(v: string) => setFormData({...formData, minus_sp2: parseInt(v) || 0})} />
                  <FieldInput label="SP 3" type="number" value={formData.minus_sp3} onChange={(v: string) => setFormData({...formData, minus_sp3: parseInt(v) || 0})} />
                  <FieldInput label="CNC" type="number" value={formData.minus_cnc} onChange={(v: string) => setFormData({...formData, minus_cnc: parseInt(v) || 0})} />
                </div>
              </div>

              {/* SECTION 5: Status */}
              <div>
                <h3 className="text-[10px] font-black text-[#003D79] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-[#003D79]"></span>
                  Status Site
                </h3>
                <div className="space-y-2">
                  <ToggleField label="Site Aktif" checked={formData.is_active} onChange={(v: boolean) => setFormData({...formData, is_active: v, active: v})} />
                  <ToggleField label="Site Pusat (HO)" checked={formData.is_pusat} onChange={(v: boolean) => setFormData({...formData, is_pusat: v})} />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t-2 border-slate-100 space-y-2">
              {/* Tombol Hapus - hanya tampil jika bukan site pusat */}
              {!editingSite?.is_pusat && (
                <button
                  onClick={handleDelete}
                  disabled={saving || deleting}
                  className="w-full py-3 bg-rose-50 text-rose-600 border-2 border-rose-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 hover:text-white hover:border-rose-600 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {deleting ? '⏳ MENGHAPUS...' : '🗑️ HAPUS SITE INI PERMANEN'}
                </button>
              )}
              
              {/* Tombol Batal + Simpan */}
              <div className="flex gap-3">
                <button 
                  onClick={() => !(saving || deleting) && setEditingSite(null)}
                  disabled={saving || deleting}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 disabled:opacity-50"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving || deleting}
                  className="flex-[2] py-4 bg-[#003D79] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {saving ? '⏳ MENYIMPAN...' : '💾 SIMPAN PERUBAHAN'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ============ ⚙️ GLOBAL CONFIG VIEW (RAHASIA RICKY) ============
function GlobalConfigView() {
  const [stats, setStats] = useState<any>(null)
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // State Broadcast
  const [broadcastForm, setBroadcastForm] = useState<{
    judul: string
    pesan: string
    is_urgent: boolean
    images: string[]
  }>({
    judul: '',
    pesan: '',
    is_urgent: false,
    images: []
  })
  const [uploadingImg, setUploadingImg] = useState(false)
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [broadcastMsg, setBroadcastMsg] = useState<{
    type: string; text: string
  } | null>(null)

  // State Force Logout
  const [forceLoading, setForceLoading] = useState(false)
  const [forceMsg, setForceMsg] = useState<{
    type: string; text: string
  } | null>(null)

  useEffect(() => {
    loadData()
    // Auto refresh setiap 30 detik
    const interval = setInterval(() => loadData(true), 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadData(silent = false) {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [configRes, announcementRes] = await Promise.all([
        fetch('/api/system-config'),
        fetch('/api/announcements/list')
      ])
      const configJson = await configRes.json()
      if (configRes.ok) {
        setStats(configJson.stats)
        setOnlineUsers(configJson.online_users || [])
      }
      const annJson = await announcementRes.json()
      if (announcementRes.ok) {
        setAnnouncements(annJson.announcements || [])
      }
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault()
    console.log('🔍 [BROADCAST] Tombol KIRIM di-klik!')
    console.log('🔍 [BROADCAST] Form data:', broadcastForm)
    
    // Minimal harus ada salah satu: judul, pesan, atau gambar
    if (!broadcastForm.judul && !broadcastForm.pesan && broadcastForm.images.length === 0) {
      console.log('❌ [BROADCAST] Semua kosong, batal kirim')
      alert('⚠️ Minimal isi salah satu: Judul, Pesan, atau Gambar!')
      return
    }
    
    setBroadcastLoading(true)
    setBroadcastMsg(null)
    console.log('🔍 [BROADCAST] Loading state = TRUE, mulai kirim ke server...')
    
    try {
      const res = await fetch('/api/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast',
          payload: broadcastForm
        })
      })
      
      console.log('🔍 [BROADCAST] Response status:', res.status)
      const json = await res.json()
      console.log('🔍 [BROADCAST] Response body:', json)
      
      if (res.ok) {
        console.log('✅ [BROADCAST] SUKSES!')
        setBroadcastMsg({ type: 'ok', text: json.message || '✅ Broadcast berhasil dikirim' })
        alert('✅ Broadcast berhasil dikirim!')
        setBroadcastForm({ judul: '', pesan: '', is_urgent: false, images: [] })
      } else {
        console.log('❌ [BROADCAST] ERROR dari server:', json.error)
        setBroadcastMsg({ type: 'err', text: '❌ ' + (json.error || 'Unknown error') })
        alert('❌ Gagal: ' + (json.error || 'Unknown error'))
      }
    } catch (err: any) {
      console.error('❌ [BROADCAST] Exception:', err)
      setBroadcastMsg({ type: 'err', text: '❌ Koneksi bermasalah: ' + err.message })
      alert('❌ Koneksi bermasalah: ' + err.message)
    } finally {
      setBroadcastLoading(false)
      console.log('🔍 [BROADCAST] Loading state = FALSE, selesai proses')
    }
  }

  async function handleForceLogout() {
    const confirmed = confirm(
      '⚠️ PERINGATAN KERAS!\n\n' +
      'Semua user yang sedang login akan LANGSUNG dikeluarkan.\n' +
      'Hanya sesi Anda (Ricky) yang aman.\n\n' +
      'Lanjutkan Force Logout?'
    )
    if (!confirmed) return

    setForceLoading(true)
    setForceMsg(null)
    try {
      const res = await fetch('/api/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force_logout_all', payload: {} })
      })
      const json = await res.json()
      if (res.ok) {
        setForceMsg({ type: 'ok', text: json.message })
        // Refresh stats setelah force logout
        setTimeout(() => loadData(true), 1500)
      } else {
        setForceMsg({ type: 'err', text: '❌ ' + json.error })
      }
    } catch {
      setForceMsg({ type: 'err', text: '❌ Koneksi bermasalah' })
    } finally {
      setForceLoading(false)
    }
  }

  async function handleDeleteAnnouncement(id: string, judul: string) {
    if (!confirm(`🗑️ Hapus pengumuman "${judul || 'ini'}"?\n\nPengumuman akan langsung hilang dari semua HP karyawan.`)) return
    setDeletingId(id)
    try {
      const res = await fetch('/api/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_announcement', payload: { id } })
      })
      const json = await res.json()
      if (res.ok) {
        alert('✅ Pengumuman berhasil dihapus!')
        setAnnouncements(prev => prev.filter(a => a.id !== id))
      } else {
        alert('❌ Gagal: ' + json.error)
      }
    } catch {
      alert('❌ Koneksi bermasalah')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat Konfigurasi Global...
    </div>
  )

  return (
    <div className="animate-in fade-in duration-500 pb-32 space-y-6">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-rose-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">⚙️</div>
              <div>
                <p className="text-rose-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">
                  Super Admin Only
                </p>
                <h1 className="text-2xl font-black tracking-tight">
                  Konfigurasi Global
                </h1>
              </div>
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
            >
              {refreshing ? '⏳' : '🔄'} Refresh
            </button>
          </div>
          <p className="text-blue-200/70 text-xs font-medium">
            Broadcast notifikasi, force logout darurat, dan monitoring user aktif
          </p>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-5 rounded-[2rem] border-2 border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-full -mr-4 -mt-4" />
          <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-2">
            🟢 Online Kini
          </p>
          <p className="text-3xl font-black text-emerald-600">
            {stats?.online_now ?? 0}
          </p>
          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
            15 menit terakhir
          </p>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border-2 border-blue-100 shadow-sm">
          <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-2">
            👥 Total Aktif
          </p>
          <p className="text-3xl font-black text-blue-600">
            {stats?.total_karyawan ?? 0}
          </p>
          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
            karyawan
          </p>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border-2 border-amber-100 shadow-sm">
          <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-2">
            📊 Sesi Hari Ini
          </p>
          <p className="text-3xl font-black text-amber-600">
            {stats?.session_hari_ini ?? 0}
          </p>
          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
            login
          </p>
        </div>
      </div>

      {/* PANEL 1: BROADCAST NOTIFIKASI */}
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-lg overflow-hidden">
        <div className="p-6 bg-blue-50/50 border-b-2 border-blue-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-xl">
            📢
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-base tracking-tight">
              Broadcast Notifikasi
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Kirim pesan ke semua user sekaligus
            </p>
          </div>
        </div>

        <form onSubmit={handleBroadcast} className="p-6 space-y-4">
          {broadcastMsg && (
            <div className={`p-4 rounded-2xl text-xs font-bold border ${
              broadcastMsg.type === 'ok'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {broadcastMsg.text}
            </div>
          )}

          {/* Toggle Urgent */}
          <button
            type="button"
            onClick={() =>
              setBroadcastForm(f => ({ ...f, is_urgent: !f.is_urgent }))
            }
            className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
              broadcastForm.is_urgent
                ? 'bg-rose-50 border-rose-200'
                : 'bg-white border-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {broadcastForm.is_urgent ? '🚨' : '📢'}
              </span>
              <div className="text-left">
                <p className={`text-xs font-black uppercase tracking-widest ${
                  broadcastForm.is_urgent ? 'text-rose-700' : 'text-slate-500'
                }`}>
                  {broadcastForm.is_urgent
                    ? 'Mode Urgent / Darurat'
                    : 'Mode Normal'}
                </p>
                <p className="text-[9px] text-slate-400 font-bold">
                  {broadcastForm.is_urgent
                    ? 'Banner merah mencolok di semua HP'
                    : 'Klik untuk aktifkan mode darurat'}
                </p>
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full flex items-center transition-all px-1 ${
              broadcastForm.is_urgent ? 'bg-rose-500 justify-end' : 'bg-slate-200 justify-start'
            }`}>
              <div className="w-4 h-4 bg-white rounded-full shadow" />
            </div>
          </button>

          {/* Input Judul (Opsional) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
              Judul Notifikasi <span className="text-slate-300">(opsional)</span>
            </label>
            <input
              type="text"
              value={broadcastForm.judul}
              onChange={e =>
                setBroadcastForm(f => ({ ...f, judul: e.target.value }))
              }
              placeholder="Contoh: Pengumuman Penting Manajemen"
              className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-[#003D79] focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Input Pesan (Opsional) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
              Isi Pesan <span className="text-slate-300">(opsional)</span>
            </label>
            <textarea
              value={broadcastForm.pesan}
              onChange={e =>
                setBroadcastForm(f => ({ ...f, pesan: e.target.value }))
              }
              placeholder="Tulis isi broadcast di sini..."
              rows={4}
              className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-[#003D79] focus:bg-white outline-none transition-all resize-none"
            />
          </div>

          {/* Upload Multi Gambar (Max 10) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
              📷 Lampiran Gambar (Opsional, Max 10)
              <span className="ml-2 text-blue-500">
                {broadcastForm.images.length}/10
              </span>
            </label>

            <div className="p-5 border-4 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 text-center relative">
              {broadcastForm.images.length < 10 && (
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length === 0) return

                    const remaining = 10 - broadcastForm.images.length
                    const toUpload = files.slice(0, remaining)

                    setUploadingImg(true)
                    try {
                      for (const file of toUpload) {
                        const fd = new FormData()
                        fd.append('file', file)
                        const res = await fetch('/api/announcements/upload', {
                          method: 'POST',
                          body: fd
                        })
                        const d = await res.json()
                        if (res.ok && d.url) {
                          setBroadcastForm(f => ({
                            ...f,
                            images: [...f.images, d.url]
                          }))
                        }
                      }
                    } finally {
                      setUploadingImg(false)
                      // Reset input agar bisa upload file yg sama lagi
                      e.target.value = ''
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              )}

              {uploadingImg ? (
                <p className="text-blue-500 font-black text-xs animate-pulse py-4">
                  ⏳ MENGUNGGAH GAMBAR...
                </p>
              ) : broadcastForm.images.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest py-4">
                  Klik untuk pilih gambar (bisa multi-select)
                </p>
              ) : (
                <p className="text-emerald-600 font-black text-[10px] uppercase tracking-widest py-2">
                  ✅ {broadcastForm.images.length} gambar terupload
                  {broadcastForm.images.length < 10 && ' • Klik lagi untuk tambah'}
                </p>
              )}
            </div>

            {/* Preview Thumbnails */}
            {broadcastForm.images.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mt-3">
                {broadcastForm.images.map((url, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img
                      src={url}
                      className="w-full h-full object-cover rounded-xl border-2 border-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setBroadcastForm(f => ({
                          ...f,
                          images: f.images.filter((_, idx) => idx !== i)
                        }))
                      }
                      className="absolute -top-1 -right-1 bg-rose-500 text-white w-5 h-5 rounded-full text-[10px] font-black shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] font-black text-center py-0.5 rounded-b-xl">
                      #{i + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={broadcastLoading}
            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
              broadcastLoading
                ? 'bg-slate-200 text-slate-400'
                : broadcastForm.is_urgent
                  ? 'bg-rose-600 text-white shadow-rose-200 hover:bg-rose-700'
                  : 'bg-[#003D79] text-white shadow-blue-200 hover:bg-blue-700'
            }`}
          >
            {broadcastLoading
              ? '⏳ MENGIRIM...'
              : `${broadcastForm.is_urgent ? '🚨' : '📢'} KIRIM BROADCAST SEKARANG`}
          </button>
        </form>
      </div>

      {/* PANEL 2: LIST PENGUMUMAN AKTIF */}
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-lg overflow-hidden">
        <div className="p-6 bg-amber-50/50 border-b-2 border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-xl">
              📋
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-base tracking-tight">
                Pengumuman Aktif
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {announcements.length} pengumuman tampil di HP karyawan
              </p>
            </div>
          </div>
          <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
            {announcements.length} Aktif
          </span>
        </div>

        <div className="divide-y divide-slate-50">
          {announcements.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3 opacity-20">📭</div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Belum ada pengumuman aktif
              </p>
            </div>
          ) : (
            announcements.map((ann: any) => (
              <div key={ann.id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                {/* Thumbnail gambar jika ada */}
                {(ann.images?.length > 0 || ann.image_url) && (
                  <img
                    src={ann.images?.[0] || ann.image_url}
                    className="w-14 h-14 object-cover rounded-2xl border-2 border-slate-100 flex-shrink-0"
                  />
                )}
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {ann.is_urgent && (
                      <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                        🚨 URGENT
                      </span>
                    )}
                    <p className="font-black text-sm text-slate-900 truncate">
                      {ann.title || '(Tanpa Judul)'}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium truncate italic mb-1">
                    {ann.content || '(Tanpa Pesan)'}
                  </p>
                  <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>📅 {new Date(ann.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    {ann.images?.length > 0 && (
                      <span>🖼️ {ann.images.length} Foto</span>
                    )}
                  </div>
                </div>
                {/* Tombol Hapus */}
                <button
                  onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                  disabled={deletingId === ann.id}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                    deletingId === ann.id
                      ? 'bg-slate-100 text-slate-300'
                      : 'bg-rose-50 text-rose-600 border-2 border-rose-100 hover:bg-rose-600 hover:text-white hover:border-rose-600'
                  }`}
                >
                  {deletingId === ann.id ? '⏳' : '🗑️ Hapus'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PANEL 3: USER ONLINE LIVE */}

      {/* PANEL 2: USER ONLINE LIVE */}
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-lg overflow-hidden">
        <div className="p-6 bg-emerald-50/50 border-b-2 border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-xl">
              📡
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-base tracking-tight">
                User Online Sekarang
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Refresh otomatis setiap 30 detik
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-emerald-600 uppercase">
              LIVE
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {onlineUsers.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-4xl mb-3 opacity-20">🏝️</div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Tidak ada user online saat ini
              </p>
            </div>
          ) : (
            onlineUsers.map((u: any, i: number) => {
              const lastActive = u.last_active
                ? new Date(u.last_active)
                : null
              const minsAgo = lastActive
                ? Math.floor(
                    (Date.now() - lastActive.getTime()) / 60000
                  )
                : null

              return (
                <div
                  key={i}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center font-black text-emerald-700">
                    {u.nama?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-slate-900 truncate">
                      {u.nama}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                      {u.nrp} • {u.jabatan} • {u.site}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-emerald-600">
                      🟢 Aktif
                    </p>
                    <p className="text-[9px] font-bold text-slate-400">
                      {minsAgo !== null ? `${minsAgo} mnt lalu` : '-'}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* PANEL 3: FORCE LOGOUT */}
      <div className="bg-white rounded-[2.5rem] border-2 border-rose-100 shadow-lg overflow-hidden">
        <div className="p-6 bg-rose-50/50 border-b-2 border-rose-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-600 rounded-2xl flex items-center justify-center text-xl">
            🔴
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-base tracking-tight">
              Force Logout Darurat
            </h2>
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">
              Zona Bahaya — Hati-hati
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {forceMsg && (
            <div className={`p-4 rounded-2xl text-xs font-bold border ${
              forceMsg.type === 'ok'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {forceMsg.text}
            </div>
          )}

          <div className="bg-rose-50 border-2 border-rose-100 p-5 rounded-2xl space-y-2">
            <p className="text-xs font-black text-rose-800 uppercase tracking-widest">
              ⚠️ Apa yang terjadi jika diaktifkan?
            </p>
            <ul className="space-y-1.5">
              {[
                'Semua session user akan dihapus dari database',
                'User yang sedang buka aplikasi akan otomatis logout',
                'User harus login ulang untuk mengakses sistem',
                'Session Anda (Ricky) TIDAK akan terpengaruh',
              ].map((item, i) => (
                <li
                  key={i}
                  className="text-[10px] font-bold text-rose-700 flex items-start gap-2"
                >
                  <span className="text-rose-400 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={handleForceLogout}
            disabled={forceLoading}
            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 border-2 ${
              forceLoading
                ? 'bg-slate-100 text-slate-400 border-slate-200'
                : 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-200 hover:bg-rose-700'
            }`}
          >
            {forceLoading
              ? '⏳ MEMPROSES...'
              : `🔴 FORCE LOGOUT SEMUA USER (${stats?.online_now ?? 0} Online)`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============ 🔧 RESET PASSWORD ADMIN (RAHASIA RICKY) ============
function ResetPasswordAdminView() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmp, setSelectedEmp] = useState<any>(null)
  const [mode, setMode] = useState<'reset_to_nrp' | 'custom'>('reset_to_nrp')
  const [customPassword, setCustomPassword] = useState('')
  const [processing, setProcessing] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  const [recentResets, setRecentResets] = useState<any[]>([])

  useEffect(() => {
    loadEmployees()
  }, [])

  async function loadEmployees() {
    setLoading(true)
    try {
      const res = await fetch('/api/data?menu=kelola_karyawan')
      const json = await res.json()
      setEmployees(json.rows || [])
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  function openResetModal(emp: any) {
    setSelectedEmp(emp)
    setMode('reset_to_nrp')
    setCustomPassword('')
    setMsg(null)
  }

  async function handleReset() {
    if (!selectedEmp) return

    if (mode === 'custom' && customPassword.length < 4) {
      setMsg({ type: 'err', text: '❌ Password minimal 4 karakter' })
      return
    }

    const confirmText = mode === 'reset_to_nrp'
      ? `Reset password ${selectedEmp.nama} ke NRP-nya (${selectedEmp.nrp})?`
      : `Reset password ${selectedEmp.nama} ke password custom?`

    if (!confirm(`⚠️ KONFIRMASI\n\n${confirmText}\n\nUser ini akan otomatis logout dan harus login ulang.`)) return

    setProcessing(true)
    setMsg(null)
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nrp: selectedEmp.nrp,
          mode,
          custom_password: mode === 'custom' ? customPassword : undefined
        })
      })
      const json = await res.json()
      if (res.ok) {
        setMsg({ type: 'ok', text: json.message })
        setRecentResets(prev => [{
          nama: selectedEmp.nama,
          nrp: selectedEmp.nrp,
          reset_to: json.reset_to,
          waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }, ...prev].slice(0, 10))
        setTimeout(() => {
          setSelectedEmp(null)
          setMsg(null)
        }, 2500)
      } else {
        setMsg({ type: 'err', text: '❌ ' + json.error })
      }
    } catch {
      setMsg({ type: 'err', text: '❌ Koneksi bermasalah' })
    } finally {
      setProcessing(false)
    }
  }

  const filtered = employees.filter((e: any) =>
    (e.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.nrp || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat data karyawan...
    </div>
  )

  return (
    <div className="animate-in fade-in duration-500 pb-32 space-y-6">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">🔧</div>
            <div>
              <p className="text-amber-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Super Admin Only</p>
              <h1 className="text-2xl font-black tracking-tight">Reset Password Karyawan</h1>
            </div>
          </div>
          <p className="text-blue-200/70 text-xs font-medium">
            Reset password karyawan ke default (NRP) atau password custom. User akan auto-logout.
          </p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-50 shadow-sm">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">👥 Total Karyawan</p>
          <p className="text-2xl font-black text-slate-900">{employees.length}</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border-2 border-amber-50 shadow-sm">
          <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest mb-1">🔧 Direset Hari Ini</p>
          <p className="text-2xl font-black text-amber-600">{recentResets.length}</p>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white p-4 rounded-[2rem] border-2 border-slate-50 shadow-sm">
        <input
          type="text"
          placeholder="🔍 Cari nama atau NRP karyawan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-sm focus:border-[#003D79] focus:bg-white transition-all"
        />
      </div>

      {/* RIWAYAT RESET HARI INI */}
      {recentResets.length > 0 && (
        <div className="bg-white rounded-[2.5rem] border-2 border-amber-100 shadow-sm overflow-hidden">
          <div className="p-5 bg-amber-50/50 border-b-2 border-amber-100 flex items-center gap-3">
            <span className="text-xl">📜</span>
            <div>
              <h3 className="font-black text-slate-900 text-sm">Riwayat Reset Sesi Ini</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Log otomatis hapus saat halaman ditutup</p>
            </div>
          </div>
          <div className="divide-y divide-amber-50">
            {recentResets.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center text-xs font-black text-amber-700">
                  {r.nama[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">{r.nama}</p>
                  <p className="text-[9px] font-bold text-slate-400">{r.nrp} • Reset ke {r.reset_to}</p>
                </div>
                <span className="text-[9px] font-black text-slate-400">{r.waktu}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIST KARYAWAN */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="p-20 text-center text-slate-300 font-bold italic bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
            Karyawan tidak ditemukan
          </div>
        ) : (
          filtered.slice(0, 50).map((emp: any) => (
            <div
              key={emp.nrp}
              className="bg-white p-4 rounded-[2rem] border-2 border-slate-50 shadow-sm flex items-center gap-4 hover:border-amber-200 transition-all group"
            >
              <div className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 group-hover:bg-[#003D79] group-hover:text-white transition-all text-sm">
                {(emp.nama || '?')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-slate-900 truncate">{emp.nama}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                  {emp.nrp} • {emp.jabatan || '-'} • {emp.site || '-'}
                </p>
              </div>
              <button
                onClick={() => openResetModal(emp)}
                className="bg-amber-500 text-white px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-amber-600 active:scale-95 transition-all whitespace-nowrap"
              >
                🔧 RESET
              </button>
            </div>
          ))
        )}
        {filtered.length > 50 && (
          <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest py-4">
            Menampilkan 50 dari {filtered.length} hasil. Persempit pencarian untuk akurasi.
          </p>
        )}
      </div>

      {/* MODAL RESET PASSWORD */}
      {selectedEmp && (
        <>
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100]" onClick={() => !processing && setSelectedEmp(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-md bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden">

            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-br from-amber-500 to-amber-600 text-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center font-black text-2xl">
                  {selectedEmp.nama[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-black text-lg tracking-tight truncate">{selectedEmp.nama}</h2>
                  <p className="text-amber-100 text-[10px] font-bold uppercase tracking-widest">
                    NRP: {selectedEmp.nrp} • {selectedEmp.jabatan || '-'}
                  </p>
                </div>
                <button
                  onClick={() => !processing && setSelectedEmp(null)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-lg font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {msg && (
              <div className={`px-6 py-3 border-b-2 ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                <p className="text-[11px] font-black uppercase tracking-widest">{msg.text}</p>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Pilih Mode Reset
                </p>

                {/* Mode 1: Reset ke NRP */}
                <button
                  onClick={() => { setMode('reset_to_nrp'); setCustomPassword('') }}
                  className={`w-full text-left p-5 rounded-2xl border-2 mb-3 transition-all ${
                    mode === 'reset_to_nrp'
                      ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400 ring-offset-2'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      mode === 'reset_to_nrp' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                    }`}>
                      {mode === 'reset_to_nrp' && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div>
                      <p className="font-black text-sm text-slate-900">Reset ke NRP</p>
                      <p className="text-[10px] text-slate-400 font-bold">
                        Password akan menjadi: <span className="font-black text-blue-600 font-mono">{selectedEmp.nrp}</span>
                      </p>
                    </div>
                  </div>
                </button>

                {/* Mode 2: Custom */}
                <button
                  onClick={() => setMode('custom')}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                    mode === 'custom'
                      ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400 ring-offset-2'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      mode === 'custom' ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
                    }`}>
                      {mode === 'custom' && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div>
                      <p className="font-black text-sm text-slate-900">Password Custom</p>
                      <p className="text-[10px] text-slate-400 font-bold">Tentukan password sendiri (min 4 karakter)</p>
                    </div>
                  </div>
                </button>

                {/* Input Custom Password */}
                {mode === 'custom' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={customPassword}
                      onChange={e => setCustomPassword(e.target.value)}
                      placeholder="Masukkan password baru..."
                      minLength={4}
                      className="w-full p-4 border-2 border-amber-200 rounded-2xl bg-amber-50 text-sm font-bold focus:border-amber-500 outline-none transition-all"
                    />
                    {customPassword && customPassword.length < 4 && (
                      <p className="text-[10px] text-rose-500 font-bold mt-2">⚠️ Minimal 4 karakter</p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-rose-50 border-2 border-rose-100 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-1">⚠️ Perhatian</p>
                <p className="text-[10px] font-bold text-rose-600 leading-relaxed">
                  User ini akan langsung logout dan harus login ulang dengan password baru.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t-2 border-slate-100 flex gap-3">
              <button
                onClick={() => !processing && setSelectedEmp(null)}
                disabled={processing}
                className="flex-1 py-4 bg-white text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-slate-100 hover:bg-slate-100 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleReset}
                disabled={processing || (mode === 'custom' && customPassword.length < 4)}
                className={`flex-[2] py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${
                  processing || (mode === 'custom' && customPassword.length < 4)
                    ? 'bg-slate-200 text-slate-400'
                    : 'bg-amber-500 text-white shadow-xl shadow-amber-200 hover:bg-amber-600'
                }`}
              >
                {processing ? '⏳ MEMPROSES...' : '🔧 RESET PASSWORD SEKARANG'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ============ 📋 SYSTEM AUDIT VIEW (v1.0 Full Fitur) ============
function SystemAuditView() {
  const [logs, setLogs] = useState<any[]>([])
  const [stats, setStats] = useState<any>({ total: 0, success: 0, failed: 0, by_category: {} })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedLog, setSelectedLog] = useState<any>(null)

  // Filter states
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Category config (icon, warna, label)
  const CATEGORY_CONFIG: any = {
    AUTH:         { icon: '🔐', label: 'Autentikasi',  color: 'blue',    bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
    ANNOUNCEMENT: { icon: '📢', label: 'Pengumuman',   color: 'amber',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
    SITE:         { icon: '🏢', label: 'Site',         color: 'indigo',  bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
    PERMISSION:   { icon: '🔑', label: 'Permission',   color: 'purple',  bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
    EMPLOYEE:     { icon: '👤', label: 'Karyawan',     color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    PASSWORD:     { icon: '🔧', label: 'Password',     color: 'orange',  bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
    SYSTEM:       { icon: '⚙️', label: 'Sistem',       color: 'rose',    bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200' }
  }

  const ACTION_LABELS: any = {
    broadcast:            'Kirim Broadcast',
    delete_announcement:  'Hapus Pengumuman',
    force_logout_all:     'Force Logout Semua User',
    update_site:          'Update Konfigurasi Site',
    delete_site:          'Hapus Site Permanen',
    reset_password:       'Reset Password Karyawan',
    grant_permission:     'Beri Permission',
    revoke_permission:    'Cabut Permission'
  }

  useEffect(() => {
    loadLogs()
  }, [])

  async function loadLogs(silent = false) {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const params = new URLSearchParams()
      if (filterCategory) params.set('category', filterCategory)
      if (filterAction) params.set('action', filterAction)
      if (filterStartDate) params.set('start_date', filterStartDate)
      if (filterEndDate) params.set('end_date', filterEndDate)
      if (searchQuery) params.set('search', searchQuery)
      params.set('limit', '200')

      const res = await fetch(`/api/audit-logs?${params.toString()}`)
      const json = await res.json()
      if (res.ok) {
        setLogs(json.logs || [])
        setStats(json.stats || {})
      }
    } catch (err) {
      console.error('Load logs error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function resetFilters() {
    setFilterCategory('')
    setFilterAction('')
    setFilterStartDate('')
    setFilterEndDate('')
    setSearchQuery('')
    setTimeout(() => loadLogs(), 100)
  }

  function formatDateTime(dt: string) {
    if (!dt) return '-'
    const d = new Date(dt)
    return d.toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric'
    }) + ' • ' + d.toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
  }

  function timeAgo(dt: string) {
    if (!dt) return '-'
    const diff = Date.now() - new Date(dt).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'baru saja'
    if (mins < 60) return `${mins} mnt lalu`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} jam lalu`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days} hari lalu`
    return new Date(dt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
  }

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat riwayat audit log...
    </div>
  )

  return (
    <div className="animate-in fade-in duration-500 pb-32 space-y-6">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">📋</div>
              <div>
                <p className="text-purple-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">
                  Super Admin Only
                </p>
                <h1 className="text-2xl font-black tracking-tight">Audit Log Sistem</h1>
              </div>
            </div>
            <button
              onClick={() => loadLogs(true)}
              disabled={refreshing}
              className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
            >
              {refreshing ? '⏳' : '🔄'} Refresh
            </button>
          </div>
          <p className="text-blue-200/70 text-xs font-medium">
            Jejak digital semua aktivitas Super Admin — tidak bisa dihapus dari UI
          </p>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-50 shadow-sm">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">📊 Total Log</p>
          <p className="text-3xl font-black text-slate-900">{stats.total || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border-2 border-emerald-50 shadow-sm">
          <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-2">✅ Sukses</p>
          <p className="text-3xl font-black text-emerald-600">{stats.success || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border-2 border-rose-50 shadow-sm">
          <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-2">❌ Gagal</p>
          <p className="text-3xl font-black text-rose-600">{stats.failed || 0}</p>
        </div>
      </div>

      {/* BREAKDOWN BY CATEGORY */}
      {Object.keys(stats.by_category || {}).length > 0 && (
        <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-50 shadow-sm">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">📊 Breakdown per Kategori</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.by_category || {}).map(([cat, count]: any) => {
              const conf = CATEGORY_CONFIG[cat] || { icon: '📌', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
              return (
                <div key={cat} className={`${conf.bg} ${conf.text} ${conf.border} border px-3 py-2 rounded-xl flex items-center gap-2`}>
                  <span className="text-sm">{conf.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">{cat}</span>
                  <span className="bg-white/60 px-2 py-0.5 rounded-full text-[10px] font-black">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FILTER PANEL */}
      <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-50 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">🔍 Filter Riwayat</p>
          <button
            onClick={resetFilters}
            className="text-[10px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest"
          >
            ✕ Reset
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Cari nama actor / target / NRP..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-sm focus:border-[#003D79] focus:bg-white transition-all"
        />

        {/* Filter Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]"
          >
            <option value="">Semua Kategori</option>
            {Object.keys(CATEGORY_CONFIG).map(cat => (
              <option key={cat} value={cat}>{CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}</option>
            ))}
          </select>

          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]"
          >
            <option value="">Semua Aksi</option>
            {Object.keys(ACTION_LABELS).map(act => (
              <option key={act} value={act}>{ACTION_LABELS[act]}</option>
            ))}
          </select>

          <input
            type="date"
            value={filterStartDate}
            onChange={e => setFilterStartDate(e.target.value)}
            placeholder="Dari tanggal"
            className="p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]"
          />

          <input
            type="date"
            value={filterEndDate}
            onChange={e => setFilterEndDate(e.target.value)}
            placeholder="Sampai tanggal"
            className="p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]"
          />
        </div>

        <button
          onClick={() => loadLogs()}
          className="w-full py-3 bg-[#003D79] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-lg"
        >
          🔍 Terapkan Filter
        </button>
      </div>

      {/* LIST LOGS */}
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-lg overflow-hidden">
        <div className="p-5 bg-slate-50/50 border-b-2 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-xl">
              📜
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-base tracking-tight">Riwayat Aktivitas</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Menampilkan {logs.length} log terbaru
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-4xl mb-3 opacity-20">📭</div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Belum ada log yang cocok dengan filter
              </p>
            </div>
          ) : (
            logs.map((log: any) => {
              const conf = CATEGORY_CONFIG[log.category] || { icon: '📌', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
              const actionLabel = ACTION_LABELS[log.action] || log.action
              return (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="w-full flex items-start gap-3 px-5 py-4 hover:bg-slate-50/70 transition-colors text-left"
                >
                  {/* Icon Kategori */}
                  <div className={`w-11 h-11 ${conf.bg} ${conf.text} rounded-2xl flex items-center justify-center text-lg flex-shrink-0`}>
                    {conf.icon}
                  </div>

                  {/* Konten */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`${conf.bg} ${conf.text} text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest`}>
                        {log.category}
                      </span>
                      {log.status === 'FAILED' && (
                        <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                          FAILED
                        </span>
                      )}
                      <p className="font-black text-sm text-slate-900 truncate">{actionLabel}</p>
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold mb-1">
                      👤 <span className="text-slate-700">{log.actor_nama || log.actor_nrp}</span>
                      {log.target_label && (
                        <>
                          <span className="text-slate-300 mx-1">→</span>
                          <span className="text-slate-700 italic">"{log.target_label}"</span>
                        </>
                      )}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      🕐 {timeAgo(log.created_at)} • {log.ip_address || '-'}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="text-slate-300 group-hover:text-[#003D79] transition-colors flex-shrink-0 mt-2">
                    →
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* MODAL DETAIL LOG */}
      {selectedLog && (
        <>
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100]" onClick={() => setSelectedLog(null)} />
          <div className="fixed inset-x-2 top-4 bottom-4 lg:inset-x-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[90%] lg:max-w-lg lg:h-[85vh] bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-br from-slate-900 to-[#003D79] text-white flex items-center gap-4">
              <div className={`w-14 h-14 ${CATEGORY_CONFIG[selectedLog.category]?.bg || 'bg-white/10'} rounded-2xl flex items-center justify-center text-2xl`}>
                {CATEGORY_CONFIG[selectedLog.category]?.icon || '📌'}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-base tracking-tight truncate">
                  {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                </h2>
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">
                  {selectedLog.category} • {formatDateTime(selectedLog.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
              
              {/* Actor Info */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">👤 Pelaku Aksi</p>
                <div className="space-y-2 text-xs">
                  <DetailRow label="Nama" value={selectedLog.actor_nama} />
                  <DetailRow label="NRP" value={selectedLog.actor_nrp} mono />
                  <DetailRow label="Role" value={selectedLog.actor_role} />
                </div>
              </div>

              {/* Target Info */}
              {(selectedLog.target_label || selectedLog.target_id) && (
                <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                  <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3">🎯 Target</p>
                  <div className="space-y-2 text-xs">
                    <DetailRow label="Tipe" value={selectedLog.target_type} />
                    <DetailRow label="Label" value={selectedLog.target_label} />
                    {selectedLog.target_id && <DetailRow label="ID" value={selectedLog.target_id} mono />}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3">📊 Status Hasil</p>
                <div className="space-y-2 text-xs">
                  <DetailRow label="Status" value={
                    <span className={`px-2 py-1 rounded-lg font-black text-[10px] uppercase ${
                      selectedLog.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {selectedLog.status === 'SUCCESS' ? '✅ SUCCESS' : '❌ FAILED'}
                    </span>
                  } />
                  {selectedLog.error_message && (
                    <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl">
                      <p className="text-[10px] font-black text-rose-700 uppercase mb-1">Error Message:</p>
                      <p className="text-[10px] text-rose-800 font-mono">{selectedLog.error_message}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Detail JSON */}
              {selectedLog.detail && Object.keys(selectedLog.detail).length > 0 && (
                <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3">📦 Detail Lengkap</p>
                  <pre className="text-[10px] font-mono bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap break-words">
                    {JSON.stringify(selectedLog.detail, null, 2)}
                  </pre>
                </div>
              )}

              {/* Metadata Request */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">🌐 Metadata Request</p>
                <div className="space-y-2 text-xs">
                  <DetailRow label="Waktu" value={formatDateTime(selectedLog.created_at)} />
                  <DetailRow label="IP Address" value={selectedLog.ip_address} mono />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">User Agent</p>
                    <p className="text-[10px] font-mono text-slate-600 bg-slate-50 p-2 rounded-lg break-all">
                      {selectedLog.user_agent || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Log ID */}
              <div className="text-center pt-2">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Log ID</p>
                <p className="text-[10px] font-mono text-slate-400">{selectedLog.id}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t-2 border-slate-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#003D79] active:scale-95 transition-all"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Helper untuk detail row
function DetailRow({ label, value, mono = false }: any) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-50 pb-2 last:border-0">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-shrink-0">{label}</p>
      <div className={`text-xs font-bold text-slate-800 text-right ${mono ? 'font-mono' : ''}`}>
        {value || '-'}
      </div>
    </div>
  )
}

// Helper Input untuk Sites Manager
function FieldInput({ label, value, onChange, type = 'text', placeholder = '' }: any) {
  return (
    <div>
      <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 border-2 border-slate-100 rounded-xl bg-white text-xs font-bold focus:border-[#003D79] outline-none transition-all"
      />
    </div>
  )
}

// Helper Toggle untuk Sites Manager
function ToggleField({ label, checked, onChange }: any) {
  return (
    <button 
      onClick={() => onChange(!checked)}
      className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
        checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'
      }`}
    >
      <span className={`text-xs font-black uppercase tracking-widest ${checked ? 'text-emerald-700' : 'text-slate-500'}`}>
        {label}
      </span>
      <div className={`w-12 h-6 rounded-full flex items-center transition-all ${
        checked ? 'bg-emerald-500 justify-end' : 'bg-slate-200 justify-start'
      } px-1`}>
        <div className="w-4 h-4 bg-white rounded-full shadow"></div>
      </div>
    </button>
  )
}

// ============ 🔐 PERMISSION MANAGER (RAHASIA RICKY - v2 Batch Save) ============
function PermissionManagerView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmp, setSelectedEmp] = useState<any>(null)
  const [originalPerms, setOriginalPerms] = useState<string[]>([])   // Data asli dari DB
  const [draftPerms, setDraftPerms] = useState<string[]>([])         // Data draft yang bisa diubah user
  const [loadingModal, setLoadingModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: string, text: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/permission-manager')
      const json = await res.json()
      if (res.ok) setData(json)
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function openEmployeeModal(emp: any) {
    setSelectedEmp(emp)
    setLoadingModal(true)
    setOriginalPerms([])
    setDraftPerms([])
    setMsg(null)
    try {
      const res = await fetch(`/api/permission-manager?nrp=${emp.nrp}`)
      const json = await res.json()
      if (res.ok) {
        const perms = json.active_permissions || []
        setOriginalPerms(perms)
        setDraftPerms([...perms])   // Copy untuk draft
      }
    } catch (err) {
      console.error('Load perm error:', err)
    } finally {
      setLoadingModal(false)
    }
  }

  // Toggle di draft saja (tidak hit API)
  function toggleDraftPermission(permKey: string) {
    if (draftPerms.includes(permKey)) {
      setDraftPerms(draftPerms.filter(p => p !== permKey))
    } else {
      setDraftPerms([...draftPerms, permKey])
    }
  }

  // Hitung perubahan
  const toAdd = draftPerms.filter(p => !originalPerms.includes(p))
  const toRemove = originalPerms.filter(p => !draftPerms.includes(p))
  const hasChanges = toAdd.length > 0 || toRemove.length > 0

  // Simpan semua perubahan sekaligus
  async function handleSaveChanges() {
    if (!selectedEmp || !hasChanges) return
    setSaving(true)
    setMsg(null)
    try {
      // Kirim semua request paralel
      const addPromises = toAdd.map(perm_key =>
        fetch('/api/permission-manager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nrp: selectedEmp.nrp, perm_key })
        })
      )
      const removePromises = toRemove.map(perm_key =>
        fetch('/api/permission-manager', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nrp: selectedEmp.nrp, perm_key })
        })
      )

      await Promise.all([...addPromises, ...removePromises])
      
      // Update state agar sinkron
      setOriginalPerms([...draftPerms])
      setMsg({ 
        type: 'ok', 
        text: `✅ Berhasil disimpan! +${toAdd.length} ditambah, -${toRemove.length} dicabut` 
      })
      
      // Refresh data utama untuk update counter di list
      loadData()
      
      // Auto close message setelah 3 detik
      setTimeout(() => setMsg(null), 3000)
    } catch (err) {
      setMsg({ type: 'err', text: '❌ Gagal menyimpan, cek koneksi' })
    } finally {
      setSaving(false)
    }
  }

  function handleCloseModal() {
    if (hasChanges) {
      if (!confirm('Ada perubahan belum disimpan. Yakin keluar tanpa menyimpan?')) {
        return
      }
    }
    setSelectedEmp(null)
    setMsg(null)
  }

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat data karyawan & permissions...
    </div>
  )

  if (!data) return <div className="p-10 text-center text-slate-400">Gagal memuat data</div>

  const filteredEmps = (data.employees || []).filter((e: any) =>
    e.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.nrp.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const permsByCategory: Record<string, any[]> = {}
  ;(data.master_permissions || []).forEach((p: any) => {
    if (!permsByCategory[p.category]) permsByCategory[p.category] = []
    permsByCategory[p.category].push(p)
  })

  const stats = {
    total: data.employees.length,
    with_perms: data.employees.filter((e: any) => e.permission_count > 0).length,
    super_admin: data.employees.filter((e: any) => e.is_super_admin).length,
    total_perms: data.total_permissions
  }

  return (
    <div className="animate-in fade-in duration-500 pb-32">
      {/* HEADER MEWAH */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-8 rounded-[2.5rem] shadow-2xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">🔐</div>
            <div>
              <p className="text-amber-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Super Admin Only</p>
              <h1 className="text-2xl font-black tracking-tight">Kelola Permission</h1>
            </div>
          </div>
          <p className="text-blue-200/70 text-xs font-medium">
            Atur hak akses granular untuk setiap karyawan (55 permissions dalam 11 kategori)
          </p>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-50 shadow-sm">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Karyawan</p>
          <p className="text-xl font-black text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border-2 border-blue-50 shadow-sm">
          <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Punya Akses</p>
          <p className="text-xl font-black text-blue-600">{stats.with_perms}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border-2 border-amber-50 shadow-sm">
          <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest mb-1">Super Admin</p>
          <p className="text-xl font-black text-amber-600">{stats.super_admin}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border-2 border-emerald-50 shadow-sm">
          <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Perms</p>
          <p className="text-xl font-black text-emerald-600">{stats.total_perms}</p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-[2rem] border-2 border-slate-50 shadow-sm mb-6">
        <input
          type="text"
          placeholder="🔍 Cari nama atau NRP karyawan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-sm focus:border-[#003D79] focus:bg-white transition-all"
        />
      </div>

      {/* LIST KARYAWAN */}
      <div className="space-y-3">
        {filteredEmps.map((emp: any) => (
          <button
            key={emp.nrp}
            onClick={() => openEmployeeModal(emp)}
            className={`w-full text-left bg-white p-5 rounded-[2rem] border-2 shadow-sm hover:shadow-lg transition-all active:scale-98 flex items-center gap-4 ${
              emp.is_super_admin ? 'border-amber-200 bg-amber-50/30' : 'border-slate-50 hover:border-blue-200'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg ${
              emp.is_super_admin ? 'bg-amber-500' : 'bg-slate-900'
            }`}>
              {emp.nama[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-black text-slate-900 text-sm truncate">{emp.nama}</h3>
                {emp.is_super_admin && (
                  <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                    Super
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                {emp.nrp} • {emp.jabatan || '-'} • {emp.site || '-'}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-black ${
                emp.permission_count === 0 ? 'text-slate-300' :
                emp.permission_count < 15 ? 'text-blue-600' :
                emp.permission_count < 40 ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {emp.permission_count}
              </p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">/ {stats.total_perms}</p>
            </div>
          </button>
        ))}

        {filteredEmps.length === 0 && (
          <div className="p-20 text-center text-slate-300 font-bold italic bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
            Karyawan tidak ditemukan
          </div>
        )}
      </div>

      {/* MODAL DETAIL PERMISSION */}
      {selectedEmp && (
        <>
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100]" onClick={handleCloseModal} />
          <div className="fixed inset-x-2 top-4 bottom-4 lg:inset-x-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[90%] lg:max-w-3xl lg:max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-br from-slate-900 to-[#003D79] text-white flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${
                selectedEmp.is_super_admin ? 'bg-amber-500' : 'bg-white/10'
              }`}>
                {selectedEmp.nama[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-lg tracking-tight truncate">{selectedEmp.nama}</h2>
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest truncate">
                  {selectedEmp.nrp} • {selectedEmp.jabatan}
                </p>
                <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest mt-1">
                  {draftPerms.length} / {data.total_permissions} Permission Aktif
                </p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Banner Perubahan */}
            {hasChanges && (
              <div className="px-6 py-3 bg-amber-50 border-b-2 border-amber-100 flex items-center gap-3">
                <span className="text-lg">⚠️</span>
                <p className="text-[11px] font-black text-amber-800 uppercase tracking-widest flex-1">
                  Ada {toAdd.length + toRemove.length} perubahan belum disimpan
                </p>
                <div className="flex gap-2 text-[9px] font-black">
                  {toAdd.length > 0 && <span className="bg-emerald-500 text-white px-2 py-1 rounded-lg">+{toAdd.length}</span>}
                  {toRemove.length > 0 && <span className="bg-rose-500 text-white px-2 py-1 rounded-lg">-{toRemove.length}</span>}
                </div>
              </div>
            )}

            {/* Message Banner */}
            {msg && (
              <div className={`px-6 py-3 border-b-2 ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                <p className="text-[11px] font-black uppercase tracking-widest">{msg.text}</p>
              </div>
            )}

            {/* Modal Body - Permissions List */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {loadingModal ? (
                <div className="p-20 text-center font-black text-slate-400 animate-pulse uppercase tracking-widest text-xs">
                  Memuat permissions...
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(permsByCategory).map(([category, perms]) => (
                    <div key={category}>
                      <h3 className="text-[10px] font-black text-[#003D79] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                        <span className="w-4 h-[2px] bg-[#003D79]"></span>
                        {category}
                        <span className="text-slate-400">
                          ({perms.filter(p => draftPerms.includes(p.perm_key)).length}/{perms.length})
                        </span>
                      </h3>
                      <div className="space-y-2">
                        {perms.map((perm: any) => {
                          const isActive = draftPerms.includes(perm.perm_key)
                          const wasOriginal = originalPerms.includes(perm.perm_key)
                          const isChanged = isActive !== wasOriginal
                          return (
                            <button
                              key={perm.perm_key}
                              onClick={() => toggleDraftPermission(perm.perm_key)}
                              className={`w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-98 relative ${
                                isActive 
                                  ? 'bg-emerald-50 border-emerald-200' 
                                  : 'bg-white border-slate-100 hover:border-slate-200'
                              } ${isChanged ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
                            >
                              {isChanged && (
                                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                                  Draft
                                </span>
                              )}
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isActive ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'
                                }`}>
                                  {isActive ? '✓' : ''}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="font-black text-xs text-slate-900 truncate">{perm.perm_label}</p>
                                    {perm.is_super_only && (
                                      <span className="bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">
                                        Super
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-medium leading-tight">{perm.perm_description}</p>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer - TOMBOL SIMPAN */}
            <div className="p-4 bg-white border-t-2 border-slate-100 flex gap-3">
              <button 
                onClick={handleCloseModal}
                disabled={saving}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {hasChanges ? 'Batal' : 'Tutup'}
              </button>
              <button 
                onClick={handleSaveChanges}
                disabled={!hasChanges || saving}
                className={`flex-[2] py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${
                  hasChanges && !saving
                    ? 'bg-[#003D79] text-white shadow-xl shadow-blue-200 hover:bg-blue-700' 
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                {saving ? '⏳ MENYIMPAN...' : hasChanges ? `💾 SIMPAN ${toAdd.length + toRemove.length} PERUBAHAN` : '💾 TIDAK ADA PERUBAHAN'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


// ============ 🛠️ UTILITY COMPONENTS (DEFINISI TUNGGAL) ============
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