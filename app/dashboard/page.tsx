'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { getTablePermissions } from '@/app/lib/tablePermissions'
import { saveOfflineAttendance } from '@/app/lib/offlineDB'
import KoreksiBadge from './components/KoreksiBadge'

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
            <h2 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-white tracking-tight">{data.user_name || stats.user_name || 'Rekan BTM'} 👋</h2>
            <p className="text-blue-200/50 text-[10px] font-medium mt-1 uppercase tracking-widest italic">{stats.periode}</p>
          </div>
          <KoreksiBadge /> 
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

          <div className="grid grid-cols-2 gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4 mb-6">
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

      <div className="grid grid-cols-2 gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4 mb-8">
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-xl">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Anggota</p>
            <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-xl">
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Hadir (Site)</p>
            <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-blue-600">{stats.hadir}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-xl">
            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">KPI Selesai</p>
            <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-emerald-600">{stats.done}</p>
        </div>
        <div className="bg-rose-50 p-6 rounded-[2rem] border-2 border-rose-100 shadow-xl">
            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Dok. Expired</p>
            <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-rose-600">{stats.expired}</p>
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
    'system_audit',
    'approval_center',
    'kelola_hak_cuti',
    'monitoring_cuti_tiket',
    'monitoring_roster_cr',
    'export_absensi_matrix',
    'role_manager'
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
    
    // ✨ Deteksi online/offline
    const isOnlineNow = typeof navigator !== 'undefined' ? navigator.onLine : true
    
    // ✨ Coba load cache dulu (biar cepat & jadi fallback offline)
    let cachedData: any = null
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`btm_data_cache_${menuKey}`)
        if (cached) cachedData = JSON.parse(cached)
      } catch {}
    }
    
    // ✨ KALAU OFFLINE → langsung pakai cache, jangan fetch
    if (!isOnlineNow) {
      if (cachedData) {
        setData(cachedData)
        console.log(`📴 Offline: pakai cache untuk ${menuKey}`)
      } else {
        // Cache kosong → set data kosong tapi JANGAN set error
        // Ini penting supaya halaman tetap render (tombol Clock In muncul)
        setData({})
        console.log(`📴 Offline: cache kosong untuk ${menuKey}`)
      }
      setLoading(false)
      return
    }
    
    // ✨ KALAU ONLINE → fetch normal
    try {
      const res = await fetch(`/api/data?menu=${menuKey}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Gagal mengambil data'); setData(null); return }
      setData(json)
      
      // ✨ Simpan ke cache untuk offline access
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`btm_data_cache_${menuKey}`, JSON.stringify(json))
        } catch {}
      }
    } catch { 
      // ✨ Fetch gagal (network error) → cek cache lagi
      if (cachedData) {
        setData(cachedData)
        console.log(`📴 Network gagal: pakai cache untuk ${menuKey}`)
      } else {
        // Benar-benar gagal & tidak ada cache
        setError('Terjadi kesalahan koneksi server') 
      }
    }
    finally { setLoading(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003D79]"></div></div>

  // 🔐 Renderer Standalone (tidak butuh data dari API)
  if (menuKey === 'manage_permissions') return <PermissionManagerView />
  if (menuKey === 'kelola_site_master' || menuKey === 'setting_site') return <SitesManagerView />
  if (menuKey === 'config_global') return <GlobalConfigView />
  if (menuKey === 'reset_password_admin') return <ResetPasswordAdminView />
  if (menuKey === 'system_audit') return <SystemAuditView />
  if (menuKey === 'approval_center') return <ApprovalCenterView />
  if (menuKey === 'role_manager') return <RoleManagerView title="Kelola Role Karyawan" />
  if (menuKey === 'kelola_hak_cuti') return <KelolaHakCutiView />
  if (menuKey === 'monitoring_cuti_tiket') return <MonitoringCutiTiketView />
  if (menuKey === 'monitoring_roster_cr') return <MonitoringRosterCRView />
  if (menuKey === 'export_absensi_matrix') return <ExportAbsensiMatrixView />

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
    <div className="flex items-center gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4 group">
      <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-lg border border-slate-100">{icon}</div>
      <div className="flex-1 border-b border-slate-50 pb-2">
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{label}</div>
        <div className={`text-sm font-black tracking-tight ${color}`}>{value || '-'}</div>
      </div>
    </div>
  )

  const BpjsItem = ({ icon, label, no, nama }: any) => (
    <div className="flex items-start gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4">
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
    <div className="max-w-2xl mx-auto space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6 pb-32 animate-in fade-in duration-500">
      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <SectionTitle>Personal Information</SectionTitle>
        <div className="space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
          <InfoItem icon="👤" label="Nama" value={data.nama} />
          <InfoItem icon="💼" label="Jabatan" value={data.jabatan} />
          <InfoItem icon="🏢" label="Departemen" value={data.departemen} />
          <InfoItem icon="📍" label="Site" value={data.site} />
          <InfoItem icon="📅" label="Tanggal Masuk" value={data.tanggal_masuk ? new Date(data.tanggal_masuk).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'} />
<InfoItem icon="🎂" label="Tempat Lahir" value={data.tempat_lahir || '-'} />
<InfoItem icon="🗓️" label="Tanggal Lahir" value={data.tanggal_lahir ? new Date(data.tanggal_lahir).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'} />
          <InfoItem icon="🏠" label="Alamat" value={data.alamat} />
          <InfoItem icon="💍" label="Status Pernikahan" value={data.status_pernikahan} />
          <InfoItem icon="📄" label="Kontrak PKWT" value={data.pkwt_periode} color="text-blue-600" />
          <InfoItem icon="⚡" label="Status Karyawan" value={data.status_karyawan} color="text-emerald-600" />
        </div>
      </section>

      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <SectionTitle>Contact Information</SectionTitle>
        <div className="space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
          <InfoItem icon="📧" label="Email" value={data.email} />
          <InfoItem icon="📞" label="Nomor HP" value={data.no_hp} />
          <InfoItem icon="🚨" label="Nomor Darurat" value={data.no_darurat} color="text-rose-600" />
        </div>
      </section>

      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <SectionTitle>Validity & Permits</SectionTitle>
        <div className="space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
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
        <div className="space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
          <InfoItem icon="💳" label="Nomor KK" value={data.no_kk} />
          <InfoItem icon="💍" label="Nama Istri" value={data.nama_istri} />
          <InfoItem icon="👶" label="Nama Anak ke-1" value={data.nama_anak1} />
          <InfoItem icon="👶" label="Nama Anak ke-2" value={data.nama_anak2} />
        </div>
      </section>

      {data.punishments && data.punishments.length > 0 && (
        <section className="bg-rose-50 rounded-[2.5rem] p-8 shadow-sm border border-rose-100">
          <SectionTitle>Historical Punishment</SectionTitle>
          <div className="space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
            {data.punishments.map((sp: any, idx: number) => (
              <div key={idx} className="flex items-start gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4 bg-white p-4 rounded-3xl border border-rose-200">
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

// ============ ✍️ FORM CUTI (v2 - Cuti Tahunan + Tiket Pesawat) ============
function FormCutiView({ title, onSuccess, data }: any) {
  const eligibleTiket = !!data?.eligible_tiket_pesawat
  const sisaCutiTahunan = Number(data?.sisa_cuti_tahunan ?? 0)
  const tahunCuti = data?.tahun_cuti || new Date().getFullYear()

const [form, setForm] = useState<any>({
  tanggal_mulai: '',
  tanggal_selesai: '',
  jenis_cuti: '',
  alasan: '',
  atasan_nrp: '',
  jumlah_hari: '',
  butuh_tiket: false,
  tiket_berangkat_tanggal: '',
  tiket_berangkat_tujuan: '',
  tiket_kembali_tanggal: '',
  tiket_kembali_tujuan: '',
  // Cuti Kompensasi
  kompensasi_mulai: '',
  kompensasi_selesai: '',
  reguler_mulai: '',
  reguler_selesai: '',
  roster_cr_tanggal: ''
})

  const [atasanList, setAtasanList] = useState<any[]>([])
  const [isDirectPJO, setIsDirectPJO] = useState(false)
  const [pjoNama, setPjoNama] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [crList, setCrList] = useState<any[]>([])
  const [loadingCR, setLoadingCR] = useState(false)
  const riwayat = data?.riwayat || []

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/leave/atasan-list', { signal: controller.signal })
      .then(r => r.json())
      .then((d: any) => {
        setAtasanList(d.atasan_list || [])
        setIsDirectPJO(!!d.is_direct_pjo)
        setPjoNama(d.pjo_nama || '')
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.log('Load atasan gagal:', err)
      })
    return () => controller.abort()
  }, [])

  // Fetch daftar CR milik user saat jenis cuti = KOMPENSASI
  useEffect(() => {
    if (form.jenis_cuti !== 'CUTI KOMPENSASI') return
    setLoadingCR(true)
    fetch('/api/leave/cr-list')
      .then(r => r.json())
      .then((d: any) => setCrList(d.cr_dates || []))
      .catch(err => console.log('Load CR gagal:', err))
      .finally(() => setLoadingCR(false))
  }, [form.jenis_cuti])

  const isCutiTahunan    = form.jenis_cuti === 'CUTI TAHUNAN'
  const isCutiKompensasi = form.jenis_cuti === 'CUTI KOMPENSASI'
  const jumlahHariNum    = Number(form.jumlah_hari || 0)

  // Hitung hari kalender dari rentang tanggal
  const hariKalender = (() => {
    if (isCutiKompensasi) {
      // Hitung total gabungan 2 blok
      if (!form.kompensasi_mulai || !form.kompensasi_selesai || !form.reguler_mulai || !form.reguler_selesai) return 0
      const allD = [
        new Date(`${form.kompensasi_mulai}T00:00:00`),
        new Date(`${form.kompensasi_selesai}T00:00:00`),
        new Date(`${form.reguler_mulai}T00:00:00`),
        new Date(`${form.reguler_selesai}T00:00:00`)
      ]
      if (allD.some(d => isNaN(d.getTime()))) return 0
      const min = Math.min(...allD.map(d => d.getTime()))
      const max = Math.max(...allD.map(d => d.getTime()))
      return Math.floor((max - min) / 86400000) + 1
    }
    if (!form.tanggal_mulai || !form.tanggal_selesai) return 0
    const s = new Date(`${form.tanggal_mulai}T00:00:00`)
    const e = new Date(`${form.tanggal_selesai}T00:00:00`)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0
    if (e < s) return 0
    return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
  })()

  // Validasi realtime cuti tahunan
  let warningCutiTahunan = ''
  if (isCutiTahunan) {
    if (jumlahHariNum <= 0) {
      warningCutiTahunan = '⚠️ Jumlah hari cuti tahunan wajib > 0'
    } else if (hariKalender > 0 && jumlahHariNum > hariKalender) {
      warningCutiTahunan = `⚠️ Jumlah hari (${jumlahHariNum}) melebihi rentang tanggal (${hariKalender} hari)`
    } else if (jumlahHariNum > sisaCutiTahunan) {
      warningCutiTahunan = `⚠️ Sisa cuti tahunan Anda hanya ${sisaCutiTahunan} hari`
    }
  }

  // Validasi realtime cuti kompensasi
let warningKompensasi = ''
if (isCutiKompensasi) {
  const kS = form.kompensasi_mulai ? new Date(`${form.kompensasi_mulai}T00:00:00`) : null
  const kE = form.kompensasi_selesai ? new Date(`${form.kompensasi_selesai}T00:00:00`) : null
  const rS = form.reguler_mulai ? new Date(`${form.reguler_mulai}T00:00:00`) : null
  const rE = form.reguler_selesai ? new Date(`${form.reguler_selesai}T00:00:00`) : null

  if (!kS || !kE || !rS || !rE) {
    warningKompensasi = '⚠️ Semua tanggal blok kompensasi dan reguler wajib diisi'
  } else if (kE < kS) {
    warningKompensasi = '⚠️ Tanggal selesai kompensasi harus >= mulai kompensasi'
  } else if (rE < rS) {
    warningKompensasi = '⚠️ Tanggal selesai reguler harus >= mulai reguler'
  } else {
    // Cek berurutan tanpa jeda
    const blok1End   = kS <= rS ? kE : rE
    const blok2Start = kS <= rS ? rS : kS
    const selisih    = Math.floor((blok2Start.getTime() - blok1End.getTime()) / 86400000)
    if (selisih !== 1) {
      warningKompensasi = `⚠️ Dua blok harus berurutan tanpa jeda (selisih antar blok: ${selisih} hari, harus tepat 1 hari)`
    }
  }
}

  // Validasi tiket
  let warningTiket = ''
  if (form.butuh_tiket) {
    if (
      !form.tiket_berangkat_tanggal ||
      !form.tiket_berangkat_tujuan ||
      !form.tiket_kembali_tanggal ||
      !form.tiket_kembali_tujuan
    ) {
      warningTiket = '⚠️ Semua field tiket wajib diisi'
    } else if (
      new Date(form.tiket_kembali_tanggal) < new Date(form.tiket_berangkat_tanggal)
    ) {
      warningTiket = '⚠️ Tanggal kembali tidak boleh lebih awal dari tanggal berangkat'
    }
  }

  async function handleSubmit(e: any) {
    e.preventDefault()

    // Client-side guard
    if (!form.jenis_cuti) {
      setMsg({ type: 'err', text: 'Jenis cuti wajib dipilih' })
      return
    }

    if (!isDirectPJO && !form.atasan_nrp) {
      setMsg({ type: 'err', text: 'Atasan wajib dipilih' })
      return
    }

    if (isCutiTahunan) {
      if (warningCutiTahunan) {
        setMsg({ type: 'err', text: warningCutiTahunan.replace('⚠️ ', '') })
        return
      }
    }

    if (isCutiKompensasi && warningKompensasi) {
  setMsg({ type: 'err', text: warningKompensasi.replace('⚠️ ', '') })
  return
}

    if (form.butuh_tiket && warningTiket) {
      setMsg({ type: 'err', text: warningTiket.replace('⚠️ ', '') })
      return
    }

    setLoading(true)
    try {
const payload: any = {
  jenis_cuti: form.jenis_cuti,
  alasan: form.alasan,
  atasan_nrp: isDirectPJO ? '' : form.atasan_nrp,
  butuh_tiket: !!form.butuh_tiket
}

if (isCutiKompensasi) {
  payload.kompensasi_mulai   = form.kompensasi_mulai
  payload.kompensasi_selesai = form.kompensasi_selesai
  payload.reguler_mulai      = form.reguler_mulai
  payload.reguler_selesai    = form.reguler_selesai
  payload.roster_cr_tanggal  = form.roster_cr_tanggal || null
} else {
  payload.tanggal_mulai  = form.tanggal_mulai
  payload.tanggal_selesai = form.tanggal_selesai
}

      if (isCutiTahunan) {
        payload.jumlah_hari = jumlahHariNum
      }

      if (form.butuh_tiket) {
        payload.tiket_berangkat_tanggal = form.tiket_berangkat_tanggal
        payload.tiket_berangkat_tujuan = form.tiket_berangkat_tujuan
        payload.tiket_kembali_tanggal = form.tiket_kembali_tanggal
        payload.tiket_kembali_tujuan = form.tiket_kembali_tujuan
      }

      const res = await fetch('/api/leave/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const resData = await res.json()
      if (res.ok) {
        setMsg({ type: 'ok', text: resData.message || '✅ Pengajuan cuti berhasil dikirim' })
setForm({
  tanggal_mulai: '',
  tanggal_selesai: '',
  jenis_cuti: '',
  alasan: '',
  atasan_nrp: '',
  jumlah_hari: '',
  butuh_tiket: false,
  tiket_berangkat_tanggal: '',
  tiket_berangkat_tujuan: '',
  tiket_kembali_tanggal: '',
  tiket_kembali_tujuan: '',
  kompensasi_mulai: '',
  kompensasi_selesai: '',
  reguler_mulai: '',
  reguler_selesai: '',
  roster_cr_tanggal: ''
})
        onSuccess()
      } else {
        setMsg({ type: 'err', text: resData.error || 'Gagal mengirim pengajuan' })
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-3 lg:space-y-6">
      <div className="bg-white p-3 lg:p-6 rounded-2xl lg:rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h2 className="text-sm lg:text-xl font-black mb-3 lg:mb-5 tracking-tight">✍️ {title}</h2>

        <form onSubmit={handleSubmit} className="space-y-2.5 lg:space-y-4">
          {msg.text && (
            <div className={`p-4 rounded-2xl text-sm font-bold ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msg.text}
            </div>
          )}

          {!isCutiKompensasi && (
  <div className="grid grid-cols-2 gap-2 lg:gap-3">
    <Input label="Mulai Cuti" type="date" required value={form.tanggal_mulai} onChange={(v: any) => setForm({ ...form, tanggal_mulai: v })} />
    <Input label="Selesai Cuti" type="date" required value={form.tanggal_selesai} onChange={(v: any) => setForm({ ...form, tanggal_selesai: v })} />
  </div>
)}

          {hariKalender > 0 && (
  <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 border border-slate-100 rounded-xl p-3">
    📅 Total rentang cuti: <span className="text-slate-800">{hariKalender} hari kalender</span>
  </div>
)}

          <Select
  label="Jenis Cuti"
  required
  value={form.jenis_cuti}
  onChange={(v: any) => setForm({
    ...form,
    jenis_cuti: v,
    jumlah_hari: '',
    // Reset field tanggal saat ganti jenis
    tanggal_mulai: '',
    tanggal_selesai: '',
    kompensasi_mulai: '',
    kompensasi_selesai: '',
    reguler_mulai: '',
    reguler_selesai: ''
  })}
  options={['CUTI REGULER / ROSTER', 'CUTI TAHUNAN', 'CUTI KOMPENSASI']}
/>

          {/* Blok Khusus Cuti Tahunan */}
          {isCutiTahunan && (
            <div className="bg-amber-50 border-2 border-amber-100 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">🏖️ Cuti Tahunan {tahunCuti}</p>
                <span className="bg-white border border-amber-200 text-amber-700 text-[10px] font-black px-3 py-1 rounded-full">
                  Sisa: {sisaCutiTahunan} hari
                </span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Jumlah Hari Diambil <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={sisaCutiTahunan || undefined}
                  value={form.jumlah_hari}
                  onChange={e => setForm({ ...form, jumlah_hari: e.target.value })}
                  placeholder="Contoh: 3"
                  className="w-full p-3.5 border-2 border-amber-200 rounded-2xl bg-white text-sm font-bold focus:border-amber-500 outline-none transition-all"
                  required
                />
                <p className="text-[10px] text-slate-500 font-bold mt-2">
                  Maksimal <b>{sisaCutiTahunan}</b> hari, dan tidak boleh melebihi rentang tanggal ({hariKalender} hari)
                </p>
              </div>

              {warningCutiTahunan && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold p-3 rounded-xl">
                  {warningCutiTahunan}
                </div>
              )}
            </div>
          )}

{/* Blok Khusus Cuti Kompensasi */}
{isCutiKompensasi && (
  <div className="bg-emerald-50 border-2 border-emerald-100 p-5 rounded-2xl space-y-4">
    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
      🔄 Cuti Kompensasi — Wajib 2 Blok Berurutan Tanpa Jeda
    </p>
    <p className="text-[10px] text-slate-500 font-bold">
      Isi blok kompensasi dan blok reguler. Keduanya harus saling menyambung (tidak boleh ada hari kosong di antara keduanya).
    </p>

    {/* Pilih tanggal CR dari roster */}
    <div className="bg-white border border-emerald-200 rounded-2xl p-4 space-y-2">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
        📅 Pilih Tanggal CR yang Diklaim
      </p>
      {loadingCR ? (
        <p className="text-[10px] text-slate-400 font-bold animate-pulse">Memuat daftar CR...</p>
      ) : crList.length === 0 ? (
        <p className="text-[10px] text-rose-500 font-bold">
          ⚠️ Tidak ada roster CR ditemukan untuk akun Anda
        </p>
      ) : (
        <select
          value={form.roster_cr_tanggal}
          onChange={e => setForm({ ...form, roster_cr_tanggal: e.target.value })}
          className="w-full p-3 border-2 border-emerald-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-emerald-500 outline-none"
        >
          <option value="">-- Pilih Tanggal CR --</option>
          {crList.map((cr: any) => (
            <option
              key={cr.tanggal}
              value={cr.tanggal}
              disabled={cr.sudah_diklaim}
            >
              {new Date(`${cr.tanggal}T00:00:00`).toLocaleDateString('id-ID', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
              {cr.sudah_diklaim ? ' — ✅ Sudah Diklaim' : ''}
            </option>
          ))}
        </select>
      )}
    </div>

    {/* Blok Kompensasi */}
    <div className="bg-white border border-emerald-100 rounded-2xl p-4 space-y-3">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">🟢 Blok Kompensasi</p>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Mulai Kompensasi"
          type="date"
          required
          value={form.kompensasi_mulai}
          onChange={(v: any) => setForm({ ...form, kompensasi_mulai: v })}
        />
        <Input
          label="Selesai Kompensasi"
          type="date"
          required
          value={form.kompensasi_selesai}
          onChange={(v: any) => setForm({ ...form, kompensasi_selesai: v })}
        />
      </div>
    </div>

    {/* Blok Reguler */}
    <div className="bg-white border border-emerald-100 rounded-2xl p-4 space-y-3">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">🔵 Blok Reguler / Roster</p>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Mulai Reguler"
          type="date"
          required
          value={form.reguler_mulai}
          onChange={(v: any) => setForm({ ...form, reguler_mulai: v })}
        />
        <Input
          label="Selesai Reguler"
          type="date"
          required
          value={form.reguler_selesai}
          onChange={(v: any) => setForm({ ...form, reguler_selesai: v })}
        />
      </div>
    </div>

    {/* Info urutan otomatis */}
    {form.kompensasi_mulai && form.reguler_mulai && (
      <div className="bg-white border border-emerald-100 rounded-xl p-3 text-[10px] font-bold text-emerald-700">
        {new Date(`${form.kompensasi_mulai}T00:00:00`) <= new Date(`${form.reguler_mulai}T00:00:00`)
          ? '📋 Urutan: Kompensasi dulu → lalu Reguler'
          : '📋 Urutan: Reguler dulu → lalu Kompensasi'}
      </div>
    )}

    {/* Warning kompensasi */}
    {warningKompensasi && (
      <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold p-3 rounded-xl">
        {warningKompensasi}
      </div>
    )}
  </div>
)}

          {/* Pilih Atasan (kalau bukan direct-to-PJO) */}
          {!isDirectPJO ? (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Pilih Atasan (Approval 1)
              </label>
              <select
                required
                value={form.atasan_nrp}
                onChange={e => setForm({ ...form, atasan_nrp: e.target.value })}
                className="w-full p-3.5 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:border-blue-500 outline-none"
              >
                <option value="">-- Pilih Nama Atasan --</option>
                {atasanList.map((a: any) => (
                  <option key={a.nrp} value={a.nrp}>
                    {a.nama} ({a.jabatan})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl">
              <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">Approval langsung ke PJO</p>
              <p className="text-sm font-bold text-slate-800">{pjoNama || '-'}</p>
            </div>
          )}

          <Textarea label="Alasan Cuti" required value={form.alasan} onChange={(v: any) => setForm({ ...form, alasan: v })} placeholder="Jelaskan alasan cuti..." />

          {/* Checkbox Tiket Pesawat (kalau eligible) */}
          {eligibleTiket && (
            <div className="border-2 border-indigo-100 rounded-2xl p-5 bg-indigo-50/40 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.butuh_tiket}
                  onChange={e => setForm({ ...form, butuh_tiket: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="text-sm font-black text-indigo-700 uppercase tracking-widest">✈️ Ajukan Tiket Pesawat</span>
              </label>

              {form.butuh_tiket && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                    Pemesanan tiket dilakukan terpisah per trip (berangkat & kembali)
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
                    <div className="bg-white border border-indigo-100 rounded-2xl p-4 space-y-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">🛫 Trip Berangkat</p>
                      <Input
                        label="Tanggal Berangkat"
                        type="date"
                        required
                        value={form.tiket_berangkat_tanggal}
                        onChange={(v: any) => setForm({ ...form, tiket_berangkat_tanggal: v })}
                      />
                      <Input
                        label="Tujuan Berangkat"
                        placeholder="Contoh: Makassar → Jakarta"
                        required
                        value={form.tiket_berangkat_tujuan}
                        onChange={(v: any) => setForm({ ...form, tiket_berangkat_tujuan: v })}
                      />
                    </div>

                    <div className="bg-white border border-indigo-100 rounded-2xl p-4 space-y-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">🛬 Trip Kembali</p>
                      <Input
                        label="Tanggal Kembali"
                        type="date"
                        required
                        value={form.tiket_kembali_tanggal}
                        onChange={(v: any) => setForm({ ...form, tiket_kembali_tanggal: v })}
                      />
                      <Input
                        label="Tujuan Kembali"
                        placeholder="Contoh: Jakarta → Makassar"
                        required
                        value={form.tiket_kembali_tujuan}
                        onChange={(v: any) => setForm({ ...form, tiket_kembali_tujuan: v })}
                      />
                    </div>
                  </div>

                  {warningTiket && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold p-3 rounded-xl">
                      {warningTiket}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button disabled={loading} className="w-full bg-blue-600 text-white py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all">
            {loading ? 'MENGIRIM...' : '🚀 KIRIM PENGAJUAN'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl lg:rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-3 lg:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center gap-2">
          <h3 className="font-black text-slate-800 text-xs lg:text-sm">📜 Riwayat Cuti Periode <span className="text-blue-600">{data?.periode || 'Bulan Ini'}</span></h3>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full font-black">{riwayat.length} DATA</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Tanggal</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Jenis</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Hari</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Tiket</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Alasan</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3 text-center">Status Atasan</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3 text-center">Status PJO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {riwayat.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 lg:py-16 text-center text-slate-300 font-bold italic">Belum ada pengajuan bulan ini.</td></tr>
              ) : riwayat.map((r: any, i: number) => (
                <tr key={i}>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 text-xs font-bold">{new Date(r.tanggal_mulai).toLocaleDateString('id-ID')} - {new Date(r.tanggal_selesai).toLocaleDateString('id-ID')}</td>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[9px] font-bold">{r.jenis_cuti}</span></td>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 text-xs font-black text-slate-700">{r.jumlah_hari || '-'}</td>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3">
                    {r.butuh_tiket
                      ? <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[9px] font-black">✈️ YA</span>
                      : <span className="text-slate-300 text-[9px] font-bold italic">tidak</span>}
                  </td>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 italic text-slate-500 text-xs truncate max-w-[200px]">"{r.alasan}"</td>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 text-center"><StatusBadge value={r.status_atasan} /></td>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 text-center"><StatusBadge value={r.status_pjo || 'PENDING'} /></td>
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
  const [crList, setCrList] = useState<any[]>([])
  const [loadingCR, setLoadingCR] = useState(false)
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
    <div className="max-w-4xl mx-auto space-y-3 lg:space-y-6">
      <div className="bg-white p-3 lg:p-6 rounded-2xl lg:rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h2 className="text-base lg:text-base lg:text-xl font-black mb-3 lg:mb-5 tracking-tight">⏱️ {title}</h2>
        <form onSubmit={handleSubmit} className="space-y-2.5 lg:space-y-4">
          {msg.text && <div className={`p-4 rounded-2xl text-sm font-bold ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}
          <Input label="Tanggal Lembur" type="date" required value={form.tanggal} onChange={(v:any) => setForm({...form, tanggal: v})} />
          <div className="grid grid-cols-2 gap-2 lg:gap-3">
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
          <button disabled={loading} className="w-full bg-amber-500 text-white py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black hover:bg-amber-600 shadow-lg shadow-amber-200 active:scale-95 transition-all">
            {loading ? 'MENGIRIM...' : '🚀 KIRIM LEMBUR'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl lg:rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-3 lg:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center gap-2">
          <h3 className="font-black text-slate-800 text-xs lg:text-sm">📜 Riwayat Lembur Periode <span className="text-amber-600">{data?.periode || 'Bulan Ini'}</span></h3>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full font-black">{riwayat.length} DATA</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Tanggal</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Jam</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Alasan</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3 text-center">Status Atasan</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3 text-center">Status PJO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {riwayat.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 lg:py-16 text-center text-slate-300 font-bold italic">Belum ada lembur bulan ini.</td></tr>
              ) : riwayat.map((r: any, i: number) => (
                <tr key={i}>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 text-xs font-bold">{new Date(r.tanggal).toLocaleDateString('id-ID')}</td>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 font-mono text-xs">{r.jam_mulai} - {r.jam_selesai}</td>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 italic text-slate-500 text-xs truncate max-w-[200px]">"{r.alasan}"</td>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 text-center"><StatusBadge value={r.status_atasan} /></td>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 text-center"><StatusBadge value={r.status_pjo || 'PENDING'} /></td>
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
    <div className="max-w-4xl mx-auto space-y-4 lg:space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-3 lg:p-6 rounded-2xl lg:rounded-[2.5rem] border shadow-xl">
        <h2 className="text-sm lg:text-2xl font-black mb-2">{currentConfig.icon} {title}</h2>
        <p className="text-xs text-slate-400 mb-4 lg:mb-6 font-medium">Laporkan ketidakhadiran dengan bukti dokumen lengkap.</p>

        <form onSubmit={handleSubmit} className="space-y-3 lg:space-y-5">

          {/* KATEGORI PILIHAN (3 CARD) */}
          <div>
            <label className="block text-[11px] lg:text-sm font-bold text-slate-700 mb-2">
              Pilih Kategori Pengajuan <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2 lg:gap-3">
              {Object.keys(KATEGORI_CONFIG).map((key) => {
                const conf = KATEGORI_CONFIG[key]
                const isActive = form.kategori === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, kategori: key, alasan_izin: '' })}
                    className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl border-2 transition-all text-center ${
                      isActive
                        ? `${conf.borderActive} ring-2 ring-offset-2 ring-${conf.color}-400`
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="text-xl lg:text-2xl mb-1">{conf.icon}</div>
                    <div className={`text-[9px] lg:text-[10px] font-black uppercase tracking-tight ${isActive ? `text-${conf.color}-700` : 'text-slate-500'}`}>
                      {conf.label}
                    </div>
                    <div className="text-[8px] lg:text-[9px] font-bold text-slate-400 mt-1 leading-tight">
                      {conf.desc}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* DROPDOWN ALASAN IZIN BERBAYAR */}
          {form.kategori === 'IZIN_BERBAYAR' && (
            <div className="bg-emerald-50/50 border-2 border-emerald-100 p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] animate-in fade-in duration-300">
              <label className="block text-[11px] lg:text-sm font-bold text-emerald-800 mb-2">
                ✅ Pilih Alasan Izin Berbayar <span className="text-rose-500">*</span>
              </label>
              <p className="text-[9px] lg:text-[10px] font-bold text-emerald-600 mb-2 lg:mb-3 italic">
                Wajib pilih salah satu sesuai UU Ketenagakerjaan
              </p>
              <select
                required
                value={form.alasan_izin}
                onChange={e => setForm({ ...form, alasan_izin: e.target.value })}
                className="w-full py-2 lg:py-2.5 px-3 border-2 border-emerald-200 rounded-lg lg:rounded-2xl bg-white text-[11px] lg:text-sm font-bold focus:border-emerald-500 outline-none transition-all"
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

          {/* INFO IZIN POTONGAN */}
          {form.kategori === 'IZIN_POTONGAN' && (
            <div className="bg-amber-50 border-2 border-amber-100 p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] text-[11px] lg:text-sm font-bold text-amber-700 leading-relaxed">
              ⚠️ <strong>Perhatian:</strong> Izin Potongan akan mengurangi gaji Anda sesuai kebijakan perusahaan.
            </div>
          )}

          {/* GRID TANGGAL + ATASAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-5">
            <Input label="Tanggal" type="date" required value={form.tanggal} onChange={(v: any) => setForm({ ...form, tanggal: v })} />

            <div>
              <label className="block text-[11px] lg:text-sm font-bold text-slate-700 mb-2">Pilih Atasan Approval (Satu Site)</label>
              <select
                required
                value={form.atasan_nrp}
                onChange={e => setForm({ ...form, atasan_nrp: e.target.value })}
                className="w-full py-2 lg:py-2.5 px-3 border-2 border-slate-50 rounded-lg lg:rounded-2xl bg-slate-50 text-[11px] lg:text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
              >
                <option value="">-- Pilih Nama Atasan --</option>
                {atasanList.map((a: any) => (
                  <option key={a.nrp} value={a.nrp}>
                    {a.nama} ({a.jabatan})
                  </option>
                ))}
              </select>
              {atasanList.length === 0 && (
                <p className="text-[9px] lg:text-[10px] text-rose-500 mt-1 font-bold italic">Tidak ada atasan tersedia di site Anda</p>
              )}
            </div>
          </div>

          {/* UPLOAD BUKTI */}
          <div>
            <label className="block text-[11px] lg:text-sm font-bold text-slate-700 mb-2">
              Upload Bukti Dokumen <span className="text-rose-500">*</span>
            </label>
            <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 mb-2 italic">
              {form.kategori === 'SAKIT' && '📄 Upload: SKS / Surat Dokter'}
              {form.kategori === 'IZIN_POTONGAN' && '📄 Upload: Surat Izin / Bukti Keperluan'}
              {form.kategori === 'IZIN_BERBAYAR' && '📄 Upload: Undangan / Surat Kematian / Bukti Musibah'}
            </p>
            <div className="p-4 lg:p-6 border-2 lg:border-4 border-dashed border-slate-200 rounded-2xl lg:rounded-[2rem] bg-slate-50/50 text-center hover:border-blue-200 transition-all cursor-pointer relative">
              <input type="file" accept="image/*" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              {uploading ? (
                <p className="text-blue-500 font-black text-[11px] lg:text-xs animate-pulse">⏳ SEDANG MENGUNGGAH...</p>
              ) : form.foto_url ? (
                <div className="flex items-center justify-center gap-2 lg:gap-3">
                  <span className="text-emerald-500 font-black text-[11px] lg:text-xs">✅ DOKUMEN TERUPLOAD</span>
                  <img src={form.foto_url} className="h-9 w-9 lg:h-10 lg:w-10 object-cover rounded-lg lg:rounded-xl" />
                </div>
              ) : (
                <p className="text-slate-400 font-bold text-[11px] lg:text-xs uppercase tracking-[0.15em]">Klik untuk pilih foto dokumen</p>
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

          {/* TOMBOL SUBMIT */}
          <button
            disabled={loading || uploading}
            className={`w-full py-2.5 lg:py-3 rounded-xl lg:rounded-2xl font-black text-white text-sm lg:text-base transition-all ${
              loading || uploading
                ? 'bg-slate-300'
                : `${currentConfig.bgClass} ${currentConfig.hoverClass} shadow-lg ${currentConfig.shadowClass}`
            }`}
          >
            {loading ? 'MENGIRIM...' : `${currentConfig.icon} KIRIM PENGAJUAN`}
          </button>
        </form>
      </div>

      {/* CARD RIWAYAT */}
      <div className="bg-white rounded-2xl lg:rounded-[2rem] border shadow-xl overflow-hidden">
        <div className="p-3 lg:p-5 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-800 text-sm lg:text-base">📜 Riwayat Pengajuan ({data?.periode || '-'})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] lg:text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] lg:text-[10px] font-black">
              <tr>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Tanggal</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Kategori</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Keterangan</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Dokumen</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Status Atasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {riwayat.map((r: any, i: number) => {
                const kat = r.kategori || 'SAKIT'
                const conf = KATEGORI_CONFIG[kat] || KATEGORI_CONFIG.SAKIT
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 lg:px-5 lg:py-3 font-bold text-slate-900">{new Date(r.tanggal).toLocaleDateString('id-ID')}</td>
                    <td className="px-3 py-2.5 lg:px-5 lg:py-3">
                      <span className={`px-2 py-1 rounded-lg lg:rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest bg-${conf.color}-50 text-${conf.color}-700 border border-${conf.color}-100`}>
                        {conf.icon} {conf.label}
                      </span>
                      {r.alasan_izin && (
                        <p className="text-[9px] lg:text-[10px] text-slate-500 mt-1 italic">→ {r.alasan_izin}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 lg:px-5 lg:py-3 text-slate-600 italic">"{r.keterangan || '-'}"</td>
                    <td className="px-3 py-2.5 lg:px-5 lg:py-3">
                      {r.foto_url ? <a href={r.foto_url} target="_blank" className="text-blue-600 font-black text-[9px] lg:text-[10px] hover:underline">👁️ LIHAT FOTO</a> : '-'}
                    </td>
                    <td className="px-3 py-2.5 lg:px-5 lg:py-3">
                      <StatusBadge value={r.status_atasan || 'PENDING'} />
                    </td>
                  </tr>
                )
              })}
              {riwayat.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 lg:px-5 lg:py-8 text-center text-slate-300 text-[11px] lg:text-sm font-bold italic">Belum ada riwayat bulan ini</td>
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4 mb-8">
        <div>
          <h2 className="text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-3xl font-black text-slate-900 tracking-tight">{data.title}</h2>
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
      <div className="bg-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] border shadow-xl h-fit">
        <h2 className="text-xl font-black mb-6">✍️ Perbarui Data Kontrak</h2>
        <form onSubmit={handleSubmit} className="space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
          <Input label="Tanggal Mulai Kontrak" type="date" required value={form.mulai_kontrak} onChange={(v:any) => setForm({...form, mulai_kontrak: v})} />
          <div>
            <label className="block text-sm font-black text-slate-700 mb-3 uppercase tracking-tighter">Opsi Durasi Perpanjangan</label>
            <div className="grid grid-cols-3 gap-3">
              {[30, 90, 180].map(d => (
                <button key={d} type="button" onClick={() => handleDuration(d)} className="bg-slate-50 hover:bg-blue-600 hover:text-white py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black text-slate-700 transition-all border-2 border-transparent hover:border-blue-200 text-sm shadow-sm">+{d} Hari</button>
              ))}
            </div>
          </div>
          <Input label="Estimasi Tanggal Berakhir" type="date" required value={form.akhir_kontrak} onChange={(v:any) => setForm({...form, akhir_kontrak: v})} readOnly />
          <button disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black shadow-2xl active:scale-95 transition-all text-lg tracking-tight">
            {loading ? 'MENYIMPAN...' : '💾 UPDATE KONTRAK'}
          </button>
        </form>
      </div>
      <div className="bg-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] border shadow-xl">
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
  const [dokumenExpired, setDokumenExpired] = useState<any[]>([])

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    loadStatus()
    fetch('/api/announcements').then(r => r.json()).then(d => setAnnouncement(d.announcement)).catch(() => {})
    
    // 🌟 Fetch dokumen expired milik user sendiri
    fetch('/api/data?menu=monitoring_expired')
      .then(r => r.json())
      .then(d => {
        const rows = (d.rows || []).slice(0, 10)
        setDokumenExpired(rows)
      })
      .catch(() => {})
    
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
    
        // 🚀 Smart GPS dengan 3-layer strategy (cache → fast → accurate)
    import('@/app/lib/gps-cache').then(({ getSmartGps }) => {
      getSmartGps({
        onProgress: (msg) => console.log('[GPS]', msg)
      })
        .then(coords => {
          setGps({ lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy })
          console.log(`✅ GPS ready (${coords.source}, ±${Math.round(coords.accuracy)}m)`)
        })
        .catch(err => console.warn('[GPS] Initial fetch failed:', err.message))
    })
    
    // 🆕 Listener: refresh status saat offline attendance saved atau sync selesai
    const handleRefreshStatus = () => {
      console.log('[Dashboard] Refresh status triggered')
      loadStatus()
    }
    window.addEventListener('btm:offline-attendance-saved', handleRefreshStatus)
    window.addEventListener('btm:sync-completed', handleRefreshStatus)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('btm:offline-attendance-saved', handleRefreshStatus)
      window.removeEventListener('btm:sync-completed', handleRefreshStatus)
    }
  }, [])

  async function loadStatus() {
    try {
      // 1. AMBIL DATA OFFLINE (IndexedDB) DULU
      let offlineClockIn: any = null
      let offlineClockOut: any = null
      try {
        const { getTodayOfflineAttendance } = await import('@/app/lib/offlineDB')
        const offline = await getTodayOfflineAttendance()
        offlineClockIn = offline.clockIn
        offlineClockOut = offline.clockOut
      } catch (e) {
        console.warn('[loadStatus] Gagal baca offline DB:', e)
      }

      // 2. FETCH DARI SERVER (kalau online)
      let serverStatus: any = null
      try {
        const res = await fetch('/api/attendance/status', { cache: 'no-store' })
        if (res.ok) {
          serverStatus = await res.json()
          try {
            localStorage.setItem('btm_attendance_status_v1', JSON.stringify(serverStatus))
          } catch {}
        }
      } catch (err) {
        console.warn('[loadStatus] Offline, pakai cache')
        try {
          const cached = localStorage.getItem('btm_attendance_status_v1')
          if (cached) serverStatus = JSON.parse(cached)
        } catch {}
      }

      // 3. MERGE: Server + Offline
      const merged: any = serverStatus || { today: null, site: null }
      
      if (offlineClockIn && !merged.today?.clock_in) {
        const offlineTime = new Date(offlineClockIn.timestamp)
        merged.today = {
          ...(merged.today || {}),
          clock_in: offlineTime.toISOString(),
          clock_in_lat: offlineClockIn.lat,
          clock_in_lng: offlineClockIn.lng,
          is_offline_pending: true,
        }
      }
      
      if (offlineClockOut && !merged.today?.clock_out) {
        const offlineTime = new Date(offlineClockOut.timestamp)
        merged.today = {
          ...(merged.today || {}),
          clock_out: offlineTime.toISOString(),
          clock_out_lat: offlineClockOut.lat,
          clock_out_lng: offlineClockOut.lng,
          is_offline_pending_out: true,
        }
      }

      setStatus(merged)
    } catch (err) {
      console.error('[loadStatus] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleClock(type: 'in' | 'out') {
    // ============================================
    // 🆕 CEK OFFLINE DULU — SKIP GPS, LANGSUNG SAVE
    // ============================================
    if (!navigator.onLine) {
      // Ambil GPS terakhir yang ter-cache (kalau ada), atau 0,0 kalau tidak ada
      const lastGps = gps || { lat: 0, lng: 0 }
      
      try {
        const record = await saveOfflineAttendance(
          type === 'in' ? 'clock_in' : 'clock_out',
          lastGps.lat,
          lastGps.lng
        )
        
        const gpsInfo = (lastGps.lat === 0 && lastGps.lng === 0)
          ? '⚠️ GPS tidak tersedia (offline)'
          : `📍 GPS: ${lastGps.lat.toFixed(4)}, ${lastGps.lng.toFixed(4)}`
        
        alert(
          `📴 ${type === 'in' ? 'CLOCK IN' : 'CLOCK OUT'} berhasil disimpan OFFLINE\n\n` +
          `⏰ Waktu: ${new Date(record.timestamp).toLocaleString('id-ID')}\n` +
          `${gpsInfo}\n\n` +
          `📶 Akan otomatis terkirim saat online.`
        )
        window.dispatchEvent(new CustomEvent('btm:offline-attendance-saved'))
        await loadStatus()
      } catch (e: any) {
        alert('❌ Gagal simpan offline: ' + (e?.message || 'Unknown error'))
      }
      return
    }

    // ============================================
    // ONLINE — GPS SMART FETCH (tidak bikin user nunggu manual)
    // ============================================
    let gpsCoords = gps
    
    if (!gpsCoords) {
      // 🚀 GPS belum ada → fetch smart sekarang juga
      try {
        const { getSmartGps } = await import('@/app/lib/gps-cache')
        const coords = await getSmartGps({
          onProgress: (msg) => console.log('[GPS handleClock]', msg)
        })
        gpsCoords = { lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy }
        setGps(gpsCoords) // update state buat next click
      } catch (gpsErr: any) {
        // GPS benar-benar gagal → tawarkan opsi ke user
        const useFallback = confirm(
          `⚠️ GPS tidak bisa didapat.\n\n` +
          `Kemungkinan penyebab:\n` +
          `• Lokasi HP belum aktif\n` +
          `• Sinyal GPS lemah (indoor?)\n` +
          `• Pertama kali buka setelah HP restart\n\n` +
          `Coba: keluar sebentar / restart lokasi HP.\n\n` +
          `Klik OK untuk COBA LAGI, atau Cancel untuk batal.`
        )
        if (useFallback) {
          // User klik OK → coba sekali lagi dengan progress alert
          alert('🔄 Mencoba GPS sekali lagi... Tunggu maksimal 25 detik ya.')
          try {
            const { getSmartGps } = await import('@/app/lib/gps-cache')
            const coords = await getSmartGps({ allowFallback: true })
            gpsCoords = { lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy }
            setGps(gpsCoords)
          } catch {
            alert('❌ GPS masih gagal. Silakan cek pengaturan lokasi HP lalu buka ulang app.')
            return
          }
        } else {
          return
        }
      }
    }
    
    // Kirim ke server
    try {
      const res = await fetch(`/api/attendance/clock-${type}`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: gps.lat, longitude: gps.lng })
      })
      const d = await res.json()
      alert(d.message || d.error)
      loadStatus()
    } catch (err: any) {
      // FALLBACK: online tapi request gagal
      console.log('⚠️ Server unreachable, saving offline...', err)
      try {
        const record = await saveOfflineAttendance(
          type === 'in' ? 'clock_in' : 'clock_out',
          gps.lat,
          gps.lng
        )
        alert(
          `⚠️ Server tidak merespons, data DISIMPAN OFFLINE\n\n` +
          `⏰ Waktu: ${new Date(record.timestamp).toLocaleString('id-ID')}\n` +
          `📍 GPS: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}\n\n` +
          `📶 Akan otomatis terkirim saat server pulih.`
        )
        window.dispatchEvent(new CustomEvent('btm:offline-attendance-saved'))
        await loadStatus()
      } catch (saveErr: any) {
        alert("❌ Gagal simpan: " + (saveErr?.message || 'Unknown error'))
      }
    }
  }

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-[0.3em]">Memvalidasi Sesi Absensi...</div>
  
  const hasIn = status?.today?.clock_in
  const hasOut = status?.today?.clock_out

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-700">
      
      {/* 🌟 BANNER KECIL: Notifikasi Dokumen Expired */}
      {dokumenExpired.length > 0 && (
        <div className="mb-4 bg-white border-2 border-amber-100 rounded-[1.5rem] overflow-hidden shadow-sm">
          <div className="bg-amber-50 px-4 py-2.5 flex items-center justify-between border-b border-amber-100">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span className="font-black text-amber-700 text-[10px] uppercase tracking-widest">
                Dokumen Akan Expired
              </span>
            </div>
            <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
              {dokumenExpired.length}
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {dokumenExpired.slice(0, 3).map((item: any, i: number) => {
              const tglExp = new Date(item.tanggal_expired)
              const today = new Date()
              const diffDays = Math.ceil((tglExp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              const isCritical = diffDays <= 7
              
              return (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${isCritical ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-slate-800 truncate">
                      {item.jenis_dokumen || 'Dokumen'}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500">
                      {diffDays > 0 
                        ? `${diffDays} hari lagi (${tglExp.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })})`
                        : diffDays === 0
                        ? `Expired HARI INI!`
                        : `Sudah expired ${Math.abs(diffDays)} hari lalu`
                      }
                    </p>
                  </div>
                  {isCritical && (
                    <span className="bg-rose-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase">
                      Kritis
                    </span>
                  )}
                </div>
              )
            })}
            {dokumenExpired.length > 3 && (
              <a 
                href="/dashboard?menu=monitoring_expired" 
                className="block px-4 py-2 text-center text-[9px] font-black text-amber-600 hover:bg-amber-50 uppercase tracking-widest transition-colors"
              >
                +{dokumenExpired.length - 3} lainnya • Lihat Semua →
              </a>
            )}
          </div>
        </div>
      )}
      
      {announcement && <AnnouncementCard announcement={announcement} />}

      <div className="bg-slate-800/40 backdrop-blur-2xl text-white rounded-[1.5rem] md:rounded-[3rem] p-3 md:p-10 text-center shadow-[0_20px_50px_-15px_rgba(0,0,0,0.25)] mb-4 md:mb-6 border border-slate-700/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 via-transparent to-slate-900/30 pointer-events-none"></div>
        <div className="text-2xl md:text-6xl font-black mb-1 tracking-tighter text-white font-mono relative z-10">
          {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="text-blue-300 font-black uppercase text-[7px] md:text-xs tracking-[0.25em] md:tracking-[0.4em] mb-3 md:mb-10 relative z-10">
          {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        
        {/* 🆕 BADGE OFFLINE PENDING */}
        {(status?.today?.is_offline_pending || status?.today?.is_offline_pending_out) && (
          <div className="mb-4 mx-auto max-w-sm px-4 py-2 bg-amber-400/20 border-2 border-amber-400/60 backdrop-blur rounded-full flex items-center justify-center gap-2 animate-pulse relative z-10">
            <span className="w-2 h-2 bg-amber-300 rounded-full"></span>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-amber-100">
              📴 {status?.today?.is_offline_pending_out ? 'Clock Out' : 'Clock In'} Offline — Menunggu Sync
            </span>
          </div>
        )}
        
        <div className="flex justify-center gap-2 md:gap-4 relative z-10">
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


// ============ 📊 TABLE VIEW (v2.6 Compact + Filter Site/Status Attendance) ============
function TableView({ data, onReload }: any) {
  const { title, rows = [], columns = [], table, access_mode } = data
  const [formModal, setFormModal] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSite, setFilterSite] = useState('ALL')
  const [filterStatusAbsensi, setFilterStatusAbsensi] = useState('ALL')
  const isApproval = access_mode?.includes('APPROVAL')

  // 🔐 Hook Auth
  const { can, isSuperAdmin } = useAuth()

  // 1. Ambil pemetaan permission untuk tabel ini
  const tablePerms = getTablePermissions(table)

  // 🔒 Kunci Schema: Paksa false untuk tabel virtual (fail-safe)
  const VIRTUAL_TABLES = ['monitoring_expired']
  const isVirtualTable = VIRTUAL_TABLES.includes(table) || access_mode === 'VIEW_ONLY'
  const hasSchema = isVirtualTable ? false : (tablePerms?.has_schema !== false)

  // Tombol Tambah
  const canCreate = isSuperAdmin || (hasSchema && (
  tablePerms?.create ? can(tablePerms.create) : (access_mode === 'CRUD')
))

const canEdit = isSuperAdmin || (hasSchema && (
  tablePerms?.edit ? can(tablePerms.edit) : (access_mode === 'CRUD')
))

  // Tombol Hapus
  const canDelete = access_mode !== 'VIEW_ONLY' && (
    tablePerms?.delete ? can(tablePerms.delete) : (access_mode === 'CRUD' || isSuperAdmin)
  )

  // Approval
  const canApprove = (() => {
    if (isSuperAdmin) return true
    if (!isApproval) return false
    if (table === 'leave_requests') return can('cuti_approve_atasan') || can('cuti_approve_pjo')
    if (table === 'overtime_requests') return can('lembur_approve_atasan') || can('lembur_approve_pjo')
    if (table === 'attendance_evidences') return can('sakit_approve')
    return true
  })()

  // Filter pencarian umum
  const filteredRows = rows.filter((r: any) => {
    return Object.values(r).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  // Filter site khusus attendance
  const siteList =
    table === 'attendance'
      ? Array.from(new Set((rows || []).map((r: any) => r.site).filter(Boolean))).sort() as string[]
      : []

  // Filter final khusus attendance
  const displayRows = (() => {
    let result = filteredRows
    if (table === 'attendance') {
      if (filterSite !== 'ALL') {
        result = result.filter((r: any) => String(r.site || '') === filterSite)
      }
      if (filterStatusAbsensi !== 'ALL') {
        result = result.filter((r: any) =>
          String(r.status || r.keterangan || '').toUpperCase().includes(filterStatusAbsensi)
        )
      }
    }
    return result
  })()

  // Handler Approve
  async function handleApprove(id: string, action: string) {
    const note = action === 'REJECTED' ? prompt('Alasan Penolakan:') : 'OK'
    if (!note && action === 'REJECTED') return
    const endpoint =
      table === 'leave_requests' ? 'leave' :
      table === 'overtime_requests' ? 'overtime' : 'attendance'
    const key =
      table === 'leave_requests' ? 'leave_id' :
      table === 'overtime_requests' ? 'overtime_id' : 'id'
    const res = await fetch(`/api/${endpoint}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: id, action, catatan: note })
    })
    if (res.ok) { alert('✅ Berhasil diproses'); onReload() }
  }

  // Handler Delete
  async function handleDelete(id: string, label: string) {
    if (!confirm(`⚠️ Hapus data "${label || id}"?`)) return
    const url = `/api/crud?table=${encodeURIComponent(table)}&id=${encodeURIComponent(id)}`
    const res = await fetch(url, {
      method: 'DELETE',
    })
    const data = await res.json()
    if (res.ok) { 
      alert('✅ Terhapus')
      onReload()
    } else {
      alert('❌ Gagal hapus: ' + (data.error || 'Unknown error'))
    }
  }

  return (
    <div className="space-y-2 lg:space-y-4 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="bg-[#003D79] text-white p-3 lg:p-6 rounded-2xl lg:rounded-[2.5rem]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm lg:text-2xl font-black tracking-tight">{title}</h2>
            <p className="text-blue-200 text-[9px] lg:text-xs font-bold mt-0.5">
              Monitoring & Pengelolaan Data
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => setFormModal({ mode: 'create' })}
              className="bg-white text-[#003D79] px-3 py-2 lg:px-5 lg:py-2.5 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-xs shadow-lg hover:bg-blue-50 active:scale-95 transition-all whitespace-nowrap"
            >
              ➕ Tambah
            </button>
          )}
        </div>
      </div>

      {/* SEARCH & FILTER */}
      <div className="bg-white rounded-xl lg:rounded-2xl p-2.5 lg:p-4 border border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-1.5 lg:gap-2">

          {/* Search */}
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

          {/* Filter Site — khusus attendance */}
          {table === 'attendance' && siteList.length > 0 && (
            <select
              value={filterSite}
              onChange={e => setFilterSite(e.target.value)}
              className="py-2 lg:py-2.5 px-2.5 lg:px-3 rounded-lg lg:rounded-2xl border border-slate-200 text-[11px] lg:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 bg-white min-w-[110px] lg:min-w-[130px]"
            >
              <option value="ALL">🏢 Semua Site</option>
              {siteList.map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          {/* Filter Status — khusus attendance */}
          {table === 'attendance' && (
            <select
              value={filterStatusAbsensi}
              onChange={e => setFilterStatusAbsensi(e.target.value)}
              className="py-2 lg:py-2.5 px-2.5 lg:px-3 rounded-lg lg:rounded-2xl border border-slate-200 text-[11px] lg:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 bg-white min-w-[115px] lg:min-w-[130px]"
            >
              <option value="ALL">🎛️ Semua Status</option>
              <option value="TERLAMBAT">⚠️ Terlambat</option>
              <option value="SUKSES">✅ Tepat Waktu</option>
            </select>
          )}
        </div>

        <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 mt-1.5">
          Menampilkan <span className="text-[#003D79] font-black">{displayRows.length}</span> dari {rows.length} data
        </p>
      </div>

      {/* TABEL */}
      <div className="bg-white rounded-xl lg:rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] lg:text-xs">
            <thead className="bg-[#003D79] text-white">
              <tr>
                {columns.map((c: string) => (
                  <th key={c} className="px-3 py-2.5 lg:px-5 lg:py-3 font-black uppercase tracking-wider whitespace-nowrap">
                    {formatColumnName(c)}
                  </th>
                ))}
                <th className="px-3 py-2.5 lg:px-5 lg:py-3 font-black uppercase tracking-wider text-center whitespace-nowrap">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-10 lg:py-16 text-center text-slate-300 font-black uppercase tracking-widest text-xs italic">
                    Data tidak ditemukan
                  </td>
                </tr>
              ) : displayRows.map((r: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-all">
                  {columns.map((c: string) => (
                    <td key={c} className="px-3 py-2.5 lg:px-5 lg:py-3 whitespace-nowrap font-medium text-slate-700">
                      {renderCell(c, r[c])}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 whitespace-nowrap">
                    <div className="flex justify-center gap-1.5 lg:gap-2">

                      {r.foto_url && (
                        <button
                          onClick={() => window.open(r.foto_url, '_blank')}
                          className="bg-indigo-500 text-white px-2.5 py-1.5 rounded-lg text-[9px] lg:text-[10px] font-black hover:bg-indigo-600 shadow-sm"
                        >
                          📷 Foto
                        </button>
                      )}

                      {/* Tombol khusus monitoring_expired */}
                      {table === 'monitoring_expired' && r.jenis_dokumen && (
                        <>
                          <button
                            onClick={() => setFormModal({ mode: 'update_expired', row: r })}
                            className="bg-blue-600 text-white px-2.5 py-1.5 rounded-lg text-[9px] lg:text-[10px] font-black hover:bg-blue-700 shadow-sm"
                          >
                            🔄 Perpanjang
                          </button>
                          <button
                            onClick={async () => {
                              const jenis = r.jenis_dokumen
                              const nama = r.nama_karyawan || r.nama
                              if (!confirm(`⚠️ Hapus dokumen ${jenis} milik ${nama}?\n\n${jenis === 'SIMPOL' ? 'Data SIMPOL akan dikosongkan.' : 'Baris dokumen akan dihapus permanen.'}`)) return
                              const res = await fetch('/api/monitoring-expired', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  jenis_dokumen: jenis,
                                  record_id: jenis === 'SIMPOL' ? r.nrp : r.id,
                                  nama_karyawan: nama
                                })
                              })
                              const json = await res.json()
                              if (res.ok) {
                                alert(json.message || '✅ Berhasil dihapus')
                                window.dispatchEvent(new Event('refreshNotif'))
                                onReload()
                              } else {
                                alert('❌ Gagal: ' + (json.error || 'Unknown'))
                              }
                            }}
                            className="bg-rose-500 text-white px-2.5 py-1.5 rounded-lg text-[9px] lg:text-[10px] font-black hover:bg-rose-600 shadow-sm"
                          >
                            🗑️ Hapus
                          </button>
                        </>
                      )}

                      {/* Tombol Edit & Hapus umum */}
                      {table !== 'monitoring_expired' && canEdit && !isApproval && (
                        <button
                          onClick={() => setFormModal({ mode: 'edit', row: r })}
                          className="bg-amber-500 text-white px-2.5 py-1.5 rounded-lg text-[9px] lg:text-[10px] font-black hover:bg-amber-600 shadow-sm"
                        >
                          ✏️ Edit
                        </button>
                      )}
                      {table !== 'monitoring_expired' && canDelete && !isApproval && (
                        <button
                          onClick={() => handleDelete(r.id, r.nama || r._nama_karyawan || r.id)}
                          className="bg-rose-500 text-white px-2.5 py-1.5 rounded-lg text-[9px] lg:text-[10px] font-black hover:bg-rose-600 shadow-sm"
                        >
                          🗑️ Hapus
                        </button>
                      )}

                      {/* Tombol Approve */}
                      {canApprove && r.status_atasan === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApprove(r.id, 'APPROVED')}
                            className="bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-[9px] lg:text-[10px] font-black hover:bg-emerald-600 shadow-sm"
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => handleApprove(r.id, 'REJECTED')}
                            className="bg-rose-500 text-white px-2.5 py-1.5 rounded-lg text-[9px] lg:text-[10px] font-black hover:bg-rose-600 shadow-sm"
                          >
                            ❌ Reject
                          </button>
                        </>
                      )}

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {displayRows.length > 0 && (
          <div className="px-3 py-2 lg:px-4 lg:py-2.5 border-t border-slate-100 bg-slate-50">
            <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider">
              {displayRows.length} Data • BTM Portal v2.6
            </p>
          </div>
        )}
      </div>

      {/* Modal CRUD */}
      {formModal && formModal.mode !== 'update_expired' && (
        <CrudModal
          table={table}
          mode={formModal.mode}
          row={formModal.row}
          onClose={() => setFormModal(null)}
          onSuccess={() => { setFormModal(null); onReload() }}
        />
      )}

      {/* Modal Update Expired */}
      {formModal && formModal.mode === 'update_expired' && (
        <UpdateExpiredModal
          row={formModal.row}
          onClose={() => setFormModal(null)}
          onSuccess={() => { setFormModal(null); onReload(); window.dispatchEvent(new Event('refreshNotif')) }}
        />
      )}
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
          <div className="flex gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4 pt-8 sticky bottom-0 bg-white">
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

// ============ 👤 ROLE MANAGER v2.0 (14 Role Baru + Batch Assign) ============
function RoleManagerView({ title }: any) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'' | 'has_role' | 'no_role'>('')
  const [filterSite, setFilterSite] = useState('')
  const [filterRole, setFilterRole] = useState('')
  
  // Batch mode
  const [batchMode, setBatchMode] = useState(false)
  const [selectedNrps, setSelectedNrps] = useState<Set<string>>(new Set())
  const [batchRole, setBatchRole] = useState('')
  const [batchScope, setBatchScope] = useState('')
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: string, text: string } | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (filterSite) params.set('site', filterSite)
      if (filterRole) params.set('role', filterRole)
      if (filterStatus) params.set('status', filterStatus)
      
      const res = await fetch(`/api/role-manager?${params.toString()}`)
      const d = await res.json()
      setData(d)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => loadData(), 300)
    return () => clearTimeout(t)
  }, [searchTerm, filterSite, filterRole, filterStatus])

  // Toggle 1 role
  async function toggleRole(nrp: string, role: string, isActive: boolean) {
    const action = isActive ? 'remove' : 'assign'
    const res = await fetch('/api/role-manager', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'single', nrp, role, action })
    })
    if (res.ok) loadData()
  }

  // Batch: toggle NRP di daftar terpilih
  function toggleSelected(nrp: string) {
    const newSet = new Set(selectedNrps)
    if (newSet.has(nrp)) newSet.delete(nrp)
    else newSet.add(nrp)
    setSelectedNrps(newSet)
  }

  function selectAll() {
    const allNrps = new Set<string>((data?.employees || []).map((e: any) => e.nrp as string))
    setSelectedNrps(allNrps)
  }

  function unselectAll() {
    setSelectedNrps(new Set())
  }

  // Apply batch
  async function applyBatch() {
    if (selectedNrps.size === 0 || !batchRole) {
      setMsg({ type: 'err', text: '❌ Pilih minimal 1 karyawan dan 1 role' })
      return
    }

    const confirmMsg = `Assign role "${batchRole}" ke ${selectedNrps.size} karyawan?${replaceExisting ? '\n\n⚠️ Semua role lama akan DIHAPUS terlebih dahulu!' : ''}`
    if (!confirm(confirmMsg)) return

    setSaving(true)
    try {
      const res = await fetch('/api/role-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'batch',
          nrps: Array.from(selectedNrps),
          role: batchRole,
          scope_site: batchScope || null,
          replace_existing: replaceExisting
        })
      })
      const result = await res.json()
      
      if (res.ok) {
        setMsg({ 
          type: 'ok', 
          text: `✅ ${result.message} (${result.stats.success}/${result.stats.total})` 
        })
        setSelectedNrps(new Set())
        setBatchRole('')
        setBatchScope('')
        setReplaceExisting(false)
        loadData()
        setTimeout(() => setMsg(null), 5000)
      } else {
        setMsg({ type: 'err', text: `❌ ${result.error}` })
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: `❌ ${err.message}` })
    } finally {
      setSaving(false)
    }
  }

  // Clear semua role dari karyawan
  async function clearAllRoles(nrp: string, nama: string) {
    if (!confirm(`Hapus SEMUA role dari ${nama}?`)) return
    const res = await fetch('/api/role-manager', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nrp })
    })
    if (res.ok) loadData()
  }

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat data karyawan & role...
    </div>
  )

  if (!data) return <div className="p-10 text-center text-slate-400">Gagal memuat data</div>

  const employees = data.employees || []
  const templates = data.templates || []
  const sites = data.sites || []

  // Group role templates by scope for dropdown
  const templatesByScope: Record<string, any[]> = {}
  templates.forEach((t: any) => {
    if (!templatesByScope[t.scope]) templatesByScope[t.scope] = []
    templatesByScope[t.scope].push(t)
  })

  return (
    <div className="animate-in fade-in duration-500 pb-32">
      {/* HEADER MEWAH */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-400/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">👥</div>
            <div>
              <p className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">HR / Super Admin</p>
              <h1 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black tracking-tight">Kelola Role Karyawan</h1>
            </div>
          </div>
          <p className="text-blue-200/70 text-xs font-medium">
            Assign role sesuai struktur organisasi · {templates.length} role tersedia · Batch mode untuk assign massal
          </p>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-50 shadow-sm">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
          <p className="text-xl font-black text-slate-900">{data.stats.total_karyawan}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border-2 border-emerald-50 shadow-sm">
          <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Punya Role</p>
          <p className="text-xl font-black text-emerald-600">{data.stats.punya_role}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border-2 border-amber-50 shadow-sm">
          <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest mb-1">Tanpa Role</p>
          <p className="text-xl font-black text-amber-600">{data.stats.tanpa_role}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border-2 border-blue-50 shadow-sm">
          <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Terfilter</p>
          <p className="text-xl font-black text-blue-600">{data.stats.filtered}</p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-[2rem] border-2 border-slate-50 shadow-sm mb-6 space-y-3">
        <input
          type="text"
          placeholder="🔍 Cari nama atau NRP karyawan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-sm focus:border-[#003D79] focus:bg-white transition-all"
        />
        
        <div className="grid grid-cols-3 gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-[#003D79]"
          >
            <option value="">Semua Status</option>
            <option value="has_role">✅ Sudah Punya Role</option>
            <option value="no_role">⚠️ Belum Punya Role</option>
          </select>
          
          <select
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            className="p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-[#003D79]"
          >
            <option value="">Semua Site</option>
            {sites.map((s: string) => <option key={s} value={s}>{s}</option>)}
          </select>
          
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-[#003D79]"
          >
            <option value="">Semua Role</option>
            {templates.map((t: any) => (
              <option key={t.role_key} value={t.role_key}>{t.role_label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* BATCH MODE TOGGLE */}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setBatchMode(!batchMode); setSelectedNrps(new Set()) }}
          className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all active:scale-95 ${
            batchMode
              ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg'
              : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
          }`}
        >
          {batchMode ? '✅ MODE BATCH AKTIF' : '⚡ MODE BATCH'}
        </button>

        {batchMode && (
          <>
            <button type="button" onClick={selectAll} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-200 transition-all active:scale-95">
              Pilih Semua ({employees.length})
            </button>
            <button type="button" onClick={unselectAll} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
              Batal Pilih
            </button>
            <span className="ml-auto text-xs font-black text-emerald-600">
              {selectedNrps.size} terpilih
            </span>
          </>
        )}
      </div>

      {/* BATCH ACTION PANEL */}
      {batchMode && selectedNrps.size > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-emerald-200 shadow-lg mb-6">
          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.3em] mb-3">
            ⚡ Batch Assign — {selectedNrps.size} karyawan terpilih
          </p>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <select
              value={batchRole}
              onChange={(e) => setBatchRole(e.target.value)}
              className="p-3 bg-white border-2 border-emerald-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
            >
              <option value="">— Pilih Role —</option>
              {Object.entries(templatesByScope).map(([scope, tpls]: any) => (
                <optgroup key={scope} label={`SCOPE: ${scope}`}>
                  {tpls.map((t: any) => (
                    <option key={t.role_key} value={t.role_key}>
                      {t.role_label} (Level {t.level})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            
            <select
              value={batchScope}
              onChange={(e) => setBatchScope(e.target.value)}
              className="p-3 bg-white border-2 border-emerald-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
            >
              <option value="">Scope Site: (Default - ikuti site karyawan)</option>
              {sites.map((s: string) => <option key={s} value={s}>Scope: {s}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">
              🗑️ Hapus semua role lama dulu (replace mode)
            </span>
          </label>

          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyBatch() }}
            disabled={!batchRole || saving}
            className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${
              batchRole && !saving
                ? 'bg-emerald-500 text-white shadow-xl hover:bg-emerald-600'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {saving ? '⏳ MEMPROSES...' : `⚡ APPLY ROLE KE ${selectedNrps.size} KARYAWAN`}
          </button>
        </div>
      )}

      {/* MESSAGE BANNER */}
      {msg && (
        <div className={`p-4 rounded-2xl border-2 mb-4 ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <p className="text-xs font-black">{msg.text}</p>
        </div>
      )}

      {/* LIST KARYAWAN */}
      <div className="space-y-3">
        {employees.length === 0 ? (
          <div className="p-20 text-center bg-white rounded-[2rem] border-2 border-dashed text-slate-300 font-bold uppercase italic">
            Tidak ada karyawan sesuai filter
          </div>
        ) : (
          employees.map((e: any) => {
            const isSelected = selectedNrps.has(e.nrp)
            return (
              <div 
                key={e.nrp} 
                className={`bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 shadow-sm hover:shadow-md transition-all ${
                  batchMode && isSelected 
                    ? 'border-emerald-400 bg-emerald-50/30' 
                    : e.has_role ? 'border-slate-50' : 'border-amber-100 bg-amber-50/20'
                }`}
              >
                <div className="flex items-center gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4">
                  {batchMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(e.nrp)}
                      className="w-5 h-5 flex-shrink-0"
                    />
                  )}
                  
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg flex-shrink-0 ${
                    e.has_role ? 'bg-[#003D79]' : 'bg-amber-500'
                  }`}>
                    {e.nama[0]}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-900 text-sm truncate">{e.nama}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                      {e.nrp} • {e.jabatan || '-'} • {e.site || '-'}
                    </div>
                    
                    {/* Role badges */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {e.roles.length === 0 ? (
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest italic">
                          ⚠️ Belum ada role
                        </span>
                      ) : (
                        e.roles.map((r: string) => {
                          const tpl = templates.find((t: any) => t.role_key === r)
                          return (
                            <button
                              key={r}
                              onClick={() => toggleRole(e.nrp, r, true)}
                              title="Klik untuk hapus role"
                              className="bg-blue-100 hover:bg-rose-100 text-blue-700 hover:text-rose-700 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest transition-all"
                            >
                              {tpl?.role_label || r} ✕
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                  
                  {e.has_role && !batchMode && (
                    <button
                      onClick={() => clearAllRoles(e.nrp, e.nama)}
                      className="text-[9px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest px-2 py-1 rounded-lg hover:bg-rose-50 transition-all flex-shrink-0"
                    >
                      Hapus Semua
                    </button>
                  )}
                </div>
              </div>
            )
          })
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
      <h2 className="text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-3xl font-black mb-8 text-slate-900 tracking-tight">📥 {title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">📄 Download Template</h3>
            <div className="space-y-3">
                <button onClick={() => window.open(`/api/template-excel?table=${table}&mode=export`, '_blank')} className="w-full bg-emerald-600 text-white py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95">📥 Download Master Data</button>
                <button onClick={() => window.open(`/api/template-excel?table=${table}&mode=empty`, '_blank')} className="w-full bg-white/10 text-white py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10">📄 Template Kosong</button>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-[2.5rem] border-4 border-slate-50 p-8 shadow-xl">
          <h3 className="text-xl font-black text-slate-900 mb-6">📤 Upload Berkas Excel</h3>
          {msg.text && <div className={`p-4 rounded-2xl mb-6 text-sm font-bold ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}
          <form onSubmit={handleImport} className="space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
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
      <h2 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black mb-6">🔑 {title}</h2>
      <div className="bg-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] border-2 border-slate-50 shadow-2xl">
        {msg.text && <div className={`p-4 rounded-2xl mb-6 text-sm font-bold ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}
        <div className="bg-amber-50 p-5 rounded-2xl mb-6 text-[10px] text-amber-800 font-bold uppercase tracking-widest leading-relaxed">⚠️ PERINGATAN: Gunakan NRP yang terdaftar. Anda akan otomatis logout setelah proses berhasil.</div>
        <form onSubmit={handleSubmit} className="space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
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
      <h2 className="text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-3xl font-black mb-8 text-slate-900 tracking-tight">📥 {title}</h2>
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
      <h2 className="text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-3xl font-black mb-8 text-slate-900 tracking-tight">📅 {title}</h2>
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
      <h2 className="text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-3xl font-black mb-8 text-slate-900 tracking-tight">📅 {title}</h2>
      <div className="bg-white p-10 rounded-[3rem] border-4 border-slate-50 shadow-2xl">
        {msg.text && <div className={`p-4 rounded-2xl mb-8 text-sm font-black ${msg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{msg.text}</div>}
        <form onSubmit={handleUpload} className="space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
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
  const allRows = [...(data.rows || [])].sort((a: any, b: any) =>
    new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
  )

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')

  const rows = allRows.filter((r: any) => {
    const ket = String(r.keterangan || '').toUpperCase()
    const actual = String(r.actual || '').toUpperCase()
    const tanggal = String(r.tanggal || '')

    const matchSearch =
      search === '' ||
      tanggal.includes(search) ||
      actual.includes(search.toUpperCase()) ||
      ket.includes(search.toUpperCase())

    let matchStatus = true
    if (filterStatus === 'HADIR') matchStatus = ket.includes('SUKSES') && !ket.includes('TERLAMBAT')
    else if (filterStatus === 'TERLAMBAT') matchStatus = ket.includes('TERLAMBAT')
    else if (filterStatus === 'MANGKIR') matchStatus = ket.includes('MANGKIR') || ket.includes('TIDAK ADA')
    else if (filterStatus === 'SAKIT') matchStatus = actual === 'SAKIT'
    else if (filterStatus === 'IZIN') matchStatus = ket.includes('IZIN') || ket.includes('CUTI')
    else if (filterStatus === 'OFF') matchStatus = actual === 'OFF'

    return matchSearch && matchStatus
  })

  const stats = {
    hadir: allRows.filter((r: any) =>
      String(r.keterangan || '').toUpperCase().includes('SUKSES') &&
      !String(r.keterangan || '').toUpperCase().includes('TERLAMBAT')
    ).length,
    terlambat: allRows.filter((r: any) =>
      String(r.keterangan || '').toUpperCase().includes('TERLAMBAT')
    ).length,
    mangkir: allRows.filter((r: any) => {
      const ket = String(r.keterangan || '').toUpperCase()
      return ket.includes('MANGKIR') || ket.includes('TIDAK ADA')
    }).length,
    off: allRows.filter((r: any) =>
      String(r.actual || '').toUpperCase() === 'OFF'
    ).length,
  }

  const shiftMap: any = {
    'S': { label: 'Siang', color: 'bg-amber-100 text-amber-700' },
    'M': { label: 'Malam', color: 'bg-indigo-100 text-indigo-700' },
    'OFF': { label: 'OFF', color: 'bg-slate-100 text-slate-500' },
    'ID': { label: 'Induksi', color: 'bg-emerald-100 text-emerald-700' },
    'CR': { label: 'Cuti Roster', color: 'bg-purple-100 text-purple-700' },
    'P': { label: 'Pagi', color: 'bg-sky-100 text-sky-700' },
    'L': { label: 'Lembur', color: 'bg-orange-100 text-orange-700' },
  }

  return (
    <div className="space-y-2 lg:space-y-5 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="bg-[#003D79] text-white p-3 lg:p-8 rounded-2xl lg:rounded-[2.5rem]">
        <h2 className="text-sm lg:text-2xl font-black tracking-tight">{data.title}</h2>
        <p className="text-blue-200 text-[9px] lg:text-xs font-bold mt-0.5">
          Roster Shift vs Data Absensi • Bulan Berjalan
        </p>

        <div className="grid grid-cols-4 gap-1.5 lg:gap-2 mt-2.5 lg:mt-4">
          {[
            { label: 'Hadir', val: stats.hadir, color: 'bg-emerald-500/20 text-emerald-200' },
            { label: 'Telat', val: stats.terlambat, color: 'bg-amber-500/20 text-amber-200' },
            { label: 'Mangkir', val: stats.mangkir, color: 'bg-rose-500/20 text-rose-200' },
            { label: 'OFF', val: stats.off, color: 'bg-slate-500/20 text-slate-300' },
          ].map((s) => (
            <div key={s.label} className={`${s.color} rounded-lg lg:rounded-xl p-1.5 lg:p-3 text-center`}>
              <p className="text-lg lg:text-3xl font-black leading-none">{s.val}</p>
              <p className="text-[7px] lg:text-[10px] font-black uppercase tracking-wide mt-0.5">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* SEARCH & FILTER */}
      <div className="bg-white rounded-xl lg:rounded-2xl p-2.5 lg:p-5 border border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-1.5 lg:gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Cari tanggal, status..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-7 lg:pl-8 py-2 lg:py-3 pr-3 rounded-lg lg:rounded-2xl border border-slate-200 text-[11px] lg:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79]"
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="py-2 lg:py-3 px-2.5 lg:px-3 rounded-lg lg:rounded-2xl border border-slate-200 text-[11px] lg:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 bg-white min-w-[115px] lg:min-w-[130px]"
          >
            <option value="ALL">🎛️ Semua</option>
            <option value="HADIR">✅ Hadir</option>
            <option value="TERLAMBAT">⚠️ Telat</option>
            <option value="MANGKIR">❌ Mangkir</option>
            <option value="SAKIT">🤒 Sakit</option>
            <option value="IZIN">📋 Izin/Cuti</option>
            <option value="OFF">💤 OFF</option>
          </select>
        </div>

        <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 mt-1.5 lg:mt-2">
          Menampilkan <span className="text-[#003D79] font-black">{rows.length}</span> dari {allRows.length} record
        </p>
      </div>

      {/* TABEL */}
      <div className="bg-white rounded-xl lg:rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] lg:text-xs text-left">
            <thead className="bg-[#003D79] text-white">
              <tr>
                <th className="px-3 py-2.5 lg:px-4 lg:py-3 font-black uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                <th className="px-3 py-2.5 lg:px-4 lg:py-3 font-black uppercase tracking-wider whitespace-nowrap">Shift</th>
                <th className="px-3 py-2.5 lg:px-4 lg:py-3 font-black uppercase tracking-wider whitespace-nowrap">Actual</th>
                <th className="px-3 py-2.5 lg:px-4 lg:py-3 font-black uppercase tracking-wider whitespace-nowrap">Jam C.in/C.out</th>
                <th className="px-3 py-2.5 lg:px-4 lg:py-3 font-black uppercase tracking-wider whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 lg:py-16 text-center text-slate-300 font-black uppercase tracking-widest text-xs italic">
                    Tidak ada data ditemukan
                  </td>
                </tr>
              ) : rows.map((r: any, i: number) => {
                const ket = String(r.keterangan || '').toUpperCase()
                const isHadir = ket.includes('SUKSES') && !ket.includes('TERLAMBAT')
                const isTerlambat = ket.includes('TERLAMBAT')
                const isMangkir = ket.includes('MANGKIR') || ket.includes('TIDAK ADA')
                const isSakit = String(r.actual || '').toUpperCase() === 'SAKIT'
                const isOff = String(r.actual || '').toUpperCase() === 'OFF'

                const statusConfig = isTerlambat
                  ? { label: '⚠️ Terlambat', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
                  : isHadir
                  ? { label: '✅ Hadir', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                  : isMangkir
                  ? { label: '❌ Mangkir', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
                  : isSakit
                  ? { label: '🤒 Sakit', cls: 'bg-blue-50 text-blue-700 border-blue-200' }
                  : isOff
                  ? { label: '💤 OFF', cls: 'bg-slate-100 text-slate-500 border-slate-200' }
                  : { label: r.keterangan || '-', cls: 'bg-purple-50 text-purple-700 border-purple-200' }

                const shift = shiftMap[r.roster] || { label: r.roster || '-', color: 'bg-slate-100 text-slate-500' }

                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 lg:px-4 lg:py-3 font-black text-slate-800 whitespace-nowrap">
                      {new Date(r.tanggal).toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      })}
                    </td>
                    <td className="px-3 py-2.5 lg:px-4 lg:py-3">
                      <span className={`px-2 py-1 rounded-lg font-black text-[9px] lg:text-[10px] tracking-wide ${shift.color}`}>
                        {shift.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 lg:px-4 lg:py-3 font-bold text-slate-700 whitespace-nowrap">
                      {r.actual}
                    </td>
                    <td className="px-3 py-2.5 lg:px-4 lg:py-3">
                      {r.is_foto ? (
                        <a
                          href={r.evident}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-black text-[9px] lg:text-[10px] border border-blue-100 hover:bg-blue-100 transition-colors whitespace-nowrap"
                        >
                          🖼️ Foto Bukti
                        </a>
                      ) : (
                        <span className="font-mono text-[10px] lg:text-[11px] text-slate-500 whitespace-nowrap">
                          {r.evident || '--:-- / --:--'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 lg:px-4 lg:py-3">
                      <span className={`px-2 py-1 rounded-lg font-black text-[9px] lg:text-[10px] border whitespace-nowrap ${statusConfig.cls}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="px-3 py-2 lg:px-4 lg:py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider">
              Total {rows.length} Record • BTM Mobile App v2.6
            </p>
          </div>
        )}
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
  const [search, setSearch] = useState('')

  const filteredRows = rows.filter((r: any) => {
    const matchJenis = filterJenis === 'ALL' || String(r.jenis || '').includes(filterJenis)
    const matchSearch = search === '' ||
      String(r.nama_karyawan || '').toLowerCase().includes(search.toLowerCase()) ||
      String(r.jenis || '').toLowerCase().includes(search.toLowerCase()) ||
      String(r.catatan || '').toLowerCase().includes(search.toLowerCase())
    return matchJenis && matchSearch
  })

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
    <div className="animate-in fade-in duration-500 space-y-2 lg:space-y-4">

      {/* HEADER */}
      <div className="bg-[#003D79] text-white p-3 lg:p-6 rounded-2xl lg:rounded-[2.5rem]">
        <h2 className="text-sm lg:text-2xl font-black tracking-tight">📜 {data.title}</h2>
        <p className="text-blue-200 text-[9px] lg:text-xs font-bold mt-0.5">
          Pengajuan yang pernah Anda proses (Approve/Reject)
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1.5 lg:gap-2 mt-2.5 lg:mt-4">
          <div className="bg-white/10 rounded-lg lg:rounded-xl p-1.5 lg:p-3 text-center">
            <p className="text-lg lg:text-3xl font-black leading-none">{statCounts.total}</p>
            <p className="text-[7px] lg:text-[10px] font-black uppercase tracking-wide mt-0.5 text-blue-200">Total</p>
          </div>
          <div className="bg-emerald-500/20 text-emerald-200 rounded-lg lg:rounded-xl p-1.5 lg:p-3 text-center">
            <p className="text-lg lg:text-3xl font-black leading-none">{statCounts.approved}</p>
            <p className="text-[7px] lg:text-[10px] font-black uppercase tracking-wide mt-0.5">✅ Setuju</p>
          </div>
          <div className="bg-rose-500/20 text-rose-200 rounded-lg lg:rounded-xl p-1.5 lg:p-3 text-center">
            <p className="text-lg lg:text-3xl font-black leading-none">{statCounts.rejected}</p>
            <p className="text-[7px] lg:text-[10px] font-black uppercase tracking-wide mt-0.5">❌ Tolak</p>
          </div>
        </div>
      </div>

      {/* FILTER PERIODE */}
      <div className="bg-white rounded-xl lg:rounded-2xl p-2.5 lg:p-4 border border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
          <span className="text-[9px] lg:text-[10px] font-black text-slate-500 uppercase tracking-wider">📅 Periode:</span>
          <select
            value={bulan}
            onChange={e => setBulan(e.target.value)}
            className="py-1.5 lg:py-2 px-2 lg:px-3 border border-slate-200 rounded-lg lg:rounded-xl text-[11px] lg:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 bg-white"
          >
            {bulanNames.map((b, i) => (
              <option key={i} value={String(i+1).padStart(2, '0')}>{b}</option>
            ))}
          </select>
          <select
            value={tahun}
            onChange={e => setTahun(e.target.value)}
            className="py-1.5 lg:py-2 px-2 lg:px-3 border border-slate-200 rounded-lg lg:rounded-xl text-[11px] lg:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 bg-white"
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={reloadWithPeriod}
            className="bg-[#003D79] text-white px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg lg:rounded-xl text-[10px] lg:text-xs font-black hover:bg-[#002855] active:scale-95 transition-all"
          >
            🔍 Tampilkan
          </button>
        </div>
      </div>

      {/* SEARCH & FILTER JENIS */}
      <div className="bg-white rounded-xl lg:rounded-2xl p-2.5 lg:p-4 border border-slate-100 shadow-sm space-y-2">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Cari nama, jenis, catatan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 lg:pl-8 py-2 lg:py-2.5 pr-3 rounded-lg lg:rounded-xl border border-slate-200 text-[11px] lg:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79]"
          />
        </div>

        {/* Filter jenis */}
        <div className="grid grid-cols-4 gap-1.5">
          <button onClick={() => setFilterJenis('ALL')} className={`py-1.5 lg:py-2 rounded-lg font-black text-[9px] lg:text-[10px] uppercase tracking-wide transition-all ${filterJenis === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>Semua</button>
          <button onClick={() => setFilterJenis('CUTI')} className={`py-1.5 lg:py-2 rounded-lg font-black text-[9px] lg:text-[10px] uppercase tracking-wide transition-all ${filterJenis === 'CUTI' ? 'bg-blue-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-blue-50'}`}>🌴 Cuti</button>
          <button onClick={() => setFilterJenis('LEMBUR')} className={`py-1.5 lg:py-2 rounded-lg font-black text-[9px] lg:text-[10px] uppercase tracking-wide transition-all ${filterJenis === 'LEMBUR' ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-amber-50'}`}>⏰ Lembur</button>
          <button onClick={() => setFilterJenis('SAKIT')} className={`py-1.5 lg:py-2 rounded-lg font-black text-[9px] lg:text-[10px] uppercase tracking-wide transition-all ${filterJenis === 'SAKIT' ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-rose-50'}`}>🤒 Sakit</button>
        </div>

        <p className="text-[9px] lg:text-[10px] font-bold text-slate-400">
          Menampilkan <span className="text-[#003D79] font-black">{filteredRows.length}</span> dari {rows.length} record
        </p>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="lg:hidden space-y-1.5">
        {filteredRows.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-dashed border-slate-200 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">
              Belum ada riwayat approval di periode {data.periode || `${bulan}/${tahun}`}
            </p>
          </div>
        ) : filteredRows.map((r: any, i: number) => {
          const isApproved = r.status === 'APPROVED'
          const jenisColor = String(r.jenis || '').includes('CUTI') ? 'bg-blue-50 text-blue-600 border-blue-200'
            : String(r.jenis || '').includes('LEMBUR') ? 'bg-amber-50 text-amber-600 border-amber-200'
            : String(r.jenis || '').includes('SAKIT') ? 'bg-rose-50 text-rose-600 border-rose-200'
            : 'bg-slate-50 text-slate-600 border-slate-200'

          return (
            <div key={i} className={`bg-white rounded-xl border-l-4 ${isApproved ? 'border-l-emerald-400' : 'border-l-rose-400'} border-slate-100 shadow-sm p-2.5`}>
              <div className="flex items-start gap-2">
                {/* Kiri: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${jenisColor}`}>
                      {r.jenis}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${r.tahap === 'PJO' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                      {r.tahap}
                    </span>
                  </div>
                  <p className="text-[11px] font-black text-slate-800 truncate">{r.nama_karyawan}</p>
                  {r.catatan && (
                    <p className="text-[10px] text-slate-500 italic truncate mt-0.5">"{r.catatan}"</p>
                  )}
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                    {r.tanggal_aksi ? new Date(r.tanggal_aksi).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </p>
                </div>

                {/* Kanan: Status */}
                <span className={`shrink-0 px-2 py-1 rounded-lg text-[9px] font-black ${isApproved ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {isApproved ? '✅' : '❌'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden lg:block bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#003D79] text-white">
              <tr>
                <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap">Tgl Aksi</th>
                <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap">Jenis</th>
                <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap">Tahap</th>
                <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap">Nama</th>
                <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap">Tgl Pengajuan</th>
                <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-4 py-3 font-black uppercase tracking-wider">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-slate-300 font-black uppercase text-xs italic">
                    Belum ada riwayat approval di periode {data.periode || `${bulan}/${tahun}`}
                  </td>
                </tr>
              ) : filteredRows.map((r: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                    {r.tanggal_aksi ? new Date(r.tanggal_aksi).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td className="px-4 py-3 font-black whitespace-nowrap">{r.jenis}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${r.tahap === 'PJO' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                      {r.tahap}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-700 uppercase whitespace-nowrap">{r.nama_karyawan}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {r.tanggal_pengajuan ? new Date(r.tanggal_pengajuan).toLocaleDateString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black border ${
                      r.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-rose-50 text-rose-600 border-rose-200'
                    }`}>
                      {r.status === 'APPROVED' ? '✅ Approved' : '❌ Rejected'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 italic max-w-xs truncate">
                    {r.catatan ? `"${r.catatan}"` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRows.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
            <p className="text-[10px] font-bold text-slate-400 text-center">
              {filteredRows.length} Record • BTM Portal v2.6
            </p>
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
              <h1 className="text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-4xl font-black tracking-tighter text-white">RAPORT KARYAWAN</h1>
            </div>
            <div className="bg-white/5 px-6 py-4 rounded-[1.5rem] backdrop-blur-3xl border border-white/10 text-right">
              <span className="text-[9px] block opacity-40 uppercase font-black tracking-[0.2em] mb-1">Evaluation Period</span>
              <span className="font-black text-base tracking-widest uppercase text-amber-500">{raport.periode}</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-[1.5rem] flex items-center justify-center text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-2xl lg:text-4xl font-black text-slate-950 shadow-2xl shadow-amber-500/20">
              {raport._nama_karyawan?.[0]}
            </div>
            <div>
              <h2 className="text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-3xl font-black tracking-tight">{raport._nama_karyawan}</h2>
              <p className="text-xs opacity-50 font-black tracking-[0.2em] uppercase mt-1">NRP: {raport.nrp} • {raport._jabatan || 'Internal Staff'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-10 border-x border-b border-slate-100 rounded-b-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="text-center p-8 bg-slate-50/50 rounded-[2.5rem] border-2 border-slate-50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Kedisiplinan (Sistem)</p>
            <div className="text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-5xl font-black text-slate-900">{raport.nilai_sistem} <span className="text-xs opacity-20 font-bold uppercase tracking-widest">/ 70</span></div>
            <p className="text-[9px] text-slate-400 mt-4 italic font-black uppercase tracking-tighter">Automated Analysis</p>
          </div>
          <div className="text-center p-8 bg-blue-50/30 rounded-[2.5rem] border-2 border-blue-50">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">Performa (Atasan)</p>
            <div className="text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-3xl lg:text-5xl font-black text-blue-600">{raport.nilai_performa} <span className="text-xs opacity-20 font-bold uppercase tracking-widest">/ 30</span></div>
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
          <h2 className="text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-3xl font-black text-slate-900 tracking-tight">{data.title}</h2>
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

                <div className="flex items-center gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4 mb-6 mt-2">
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
                  className={`w-full py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase transition-all shadow-xl active:scale-95 ${isDone ? 'bg-white text-emerald-600 border-2 border-emerald-500 hover:bg-emerald-500 hover:text-white' : 'bg-slate-950 text-white hover:bg-blue-600'}`}
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
      <div className="bg-gradient-to-br from-[#003D79] to-blue-800 text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl mb-6 relative overflow-hidden">
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
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSite, setEditingSite] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState<{ type: string, text: string } | null>(null)
  const [roleTemplates, setRoleTemplates] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [applyingTemplate, setApplyingTemplate] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [pjoSearch, setPjoSearch] = useState('')
  const [deputySearch, setDeputySearch] = useState('')

  useEffect(() => {
    loadData()
    loadRoleTemplates()
  }, [])

  async function loadRoleTemplates() {
    try {
      const res = await fetch('/api/role-templates')
      const json = await res.json()
      if (res.ok) setRoleTemplates(json.data || [])
    } catch (err) {
      console.error('Load templates error:', err)
    }
  }

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/sites-manager')
      const json = await res.json()
      if (res.ok) {
        setSites(json.sites || [])
        setEmployees(json.employees || [])
      }
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
      is_pusat: site.is_pusat,
      pjo_nrp: site.pjo_nrp || '',
      deputy_pjo_nrp: site.deputy_pjo_nrp || '',
    })
    setPjoSearch('')
    setDeputySearch('')
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
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">🏢</div>
            <div>
              <p className="text-amber-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Master Data</p>
              <h1 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black tracking-tight">Kelola Site</h1>
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

                        {/* ═══ PJO INFO BAR ═══ */}
            <div className="px-6 py-3 bg-blue-50/50 border-y border-blue-100/50 flex flex-wrap gap-4 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="font-black text-blue-500 uppercase tracking-widest text-[9px]">👔 PJO:</span>
                <span className="font-black text-[#003D79]">
                  {site.pjo_info?.nama || <span className="text-rose-500 italic">Belum diset</span>}
                </span>
              </div>
              {site.deputy_info && (
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-400 uppercase tracking-widest text-[9px]">🎖️ Deputy:</span>
                  <span className="font-bold text-slate-700">{site.deputy_info.nama}</span>
                </div>
              )}
            </div>

            {/* Card Body - Info Grid */}
            <div className="p-6 space-y-4">
              {/* Row 1: Total Karyawan + PJO */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">👥 Karyawan</p>
                  <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-blue-700">{site.total_karyawan}</p>
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
            <div className="p-6 bg-gradient-to-br from-slate-900 to-[#003D79] text-white flex items-center gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4">
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
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
              
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

              {/* SECTION 4.5: PJO & Deputy PJO */}
              <div>
                <h3 className="text-[10px] font-black text-[#003D79] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-[#003D79]"></span>
                  Penanggung Jawab (PJO)
                </h3>
                <div className="space-y-3">

                  {/* PJO — WAJIB */}
                  <div className="bg-white p-4 rounded-2xl border-2 border-blue-100">
                    <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">
                      👔 PJO (Wajib)
                    </label>

                    {/* Selected PJO */}
                    {formData.pjo_nrp && (() => {
                      const emp = employees.find(e => e.nrp === formData.pjo_nrp)
                      return emp ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                              {(emp.nama || '?')[0]}
                            </div>
                            <div>
                              <div className="font-black text-sm text-[#003D79]">{emp.nama}</div>
                              <div className="text-[10px] text-slate-500">{emp.nrp} · {emp.jabatan || '—'} · {emp.site || '—'}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, pjo_nrp: '' })
                              setPjoSearch('')
                            }}
                            className="w-8 h-8 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-full flex items-center justify-center text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ) : null
                    })()}

                    {/* Search PJO */}
                    {!formData.pjo_nrp && (
                      <>
                        <input
                          type="text"
                          value={pjoSearch}
                          onChange={e => setPjoSearch(e.target.value)}
                          placeholder="🔍 Ketik nama atau NRP karyawan..."
                          className="w-full p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none text-sm font-medium focus:border-[#003D79] focus:bg-white transition-all mb-2"
                        />

                        {pjoSearch.length >= 2 && (
                          <div className="max-h-52 overflow-y-auto space-y-1 bg-slate-50 rounded-xl p-2">
                            {employees
                              .filter(e =>
                                e.nrp !== formData.deputy_pjo_nrp &&
                                (e.nama?.toLowerCase().includes(pjoSearch.toLowerCase()) ||
                                 e.nrp?.toLowerCase().includes(pjoSearch.toLowerCase()))
                              )
                              .slice(0, 15)
                              .map(e => (
                                <button
                                  key={e.nrp}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, pjo_nrp: e.nrp })
                                    setPjoSearch('')
                                  }}
                                  className="w-full p-2.5 rounded-xl text-left bg-white hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all"
                                >
                                  <div className="font-bold text-sm text-[#003D79]">{e.nama}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {e.nrp} · {e.site || '—'} · {e.jabatan || '—'}
                                  </div>
                                </button>
                              ))}
                            {employees.filter(e =>
                              e.nama?.toLowerCase().includes(pjoSearch.toLowerCase()) ||
                              e.nrp?.toLowerCase().includes(pjoSearch.toLowerCase())
                            ).length === 0 && (
                              <div className="text-center py-4 text-xs text-slate-400">
                                Tidak ditemukan karyawan &quot;{pjoSearch}&quot;
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* DEPUTY PJO — OPSIONAL */}
                  <div className="bg-white p-4 rounded-2xl border-2 border-slate-100">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                      🎖️ Deputy PJO (Opsional)
                    </label>

                    {/* Selected Deputy */}
                    {formData.deputy_pjo_nrp && (() => {
                      const emp = employees.find(e => e.nrp === formData.deputy_pjo_nrp)
                      return emp ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-600 text-white flex items-center justify-center font-black text-sm">
                              {(emp.nama || '?')[0]}
                            </div>
                            <div>
                              <div className="font-black text-sm text-slate-800">{emp.nama}</div>
                              <div className="text-[10px] text-slate-500">{emp.nrp} · {emp.jabatan || '—'} · {emp.site || '—'}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, deputy_pjo_nrp: '' })
                              setDeputySearch('')
                            }}
                            className="w-8 h-8 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-full flex items-center justify-center text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ) : null
                    })()}

                    {/* Search Deputy */}
                    {!formData.deputy_pjo_nrp && (
                      <>
                        <input
                          type="text"
                          value={deputySearch}
                          onChange={e => setDeputySearch(e.target.value)}
                          placeholder="🔍 Ketik nama atau NRP karyawan (opsional)..."
                          className="w-full p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none text-sm font-medium focus:border-slate-400 focus:bg-white transition-all mb-2"
                        />

                        {deputySearch.length >= 2 && (
                          <div className="max-h-52 overflow-y-auto space-y-1 bg-slate-50 rounded-xl p-2">
                            {employees
                              .filter(e =>
                                e.nrp !== formData.pjo_nrp &&
                                (e.nama?.toLowerCase().includes(deputySearch.toLowerCase()) ||
                                 e.nrp?.toLowerCase().includes(deputySearch.toLowerCase()))
                              )
                              .slice(0, 15)
                              .map(e => (
                                <button
                                  key={e.nrp}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, deputy_pjo_nrp: e.nrp })
                                    setDeputySearch('')
                                  }}
                                  className="w-full p-2.5 rounded-xl text-left bg-white hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all"
                                >
                                  <div className="font-bold text-sm text-slate-800">{e.nama}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {e.nrp} · {e.site || '—'} · {e.jabatan || '—'}
                                  </div>
                                </button>
                              ))}
                            {employees.filter(e =>
                              e.nama?.toLowerCase().includes(deputySearch.toLowerCase()) ||
                              e.nrp?.toLowerCase().includes(deputySearch.toLowerCase())
                            ).length === 0 && (
                              <div className="text-center py-4 text-xs text-slate-400">
                                Tidak ditemukan karyawan &quot;{deputySearch}&quot;
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Info Box */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-800 flex items-start gap-2">
                    <span className="text-base leading-none">💡</span>
                    <div>
                      <strong>Otomatis:</strong> Karyawan yang dipilih akan otomatis mendapat role <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">pjo_site</code>.
                      Yang lama akan dicopot rolenya.
                    </div>
                  </div>

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
    <div className="animate-in fade-in duration-500 pb-32 space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-rose-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">⚙️</div>
              <div>
                <p className="text-rose-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">
                  Super Admin Only
                </p>
                <h1 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black tracking-tight">
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
        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-full -mr-4 -mt-4" />
          <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-2">
            🟢 Online Kini
          </p>
          <p className="text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-3xl font-black text-emerald-600">
            {stats?.online_now ?? 0}
          </p>
          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
            15 menit terakhir
          </p>
        </div>

        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-blue-100 shadow-sm">
          <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-2">
            👥 Total Aktif
          </p>
          <p className="text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-3xl font-black text-blue-600">
            {stats?.total_karyawan ?? 0}
          </p>
          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
            karyawan
          </p>
        </div>

        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-amber-100 shadow-sm">
          <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-2">
            📊 Sesi Hari Ini
          </p>
          <p className="text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-3xl font-black text-amber-600">
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
              <div key={ann.id} className="flex items-start gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
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
                  className="flex items-center gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors"
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
    <div className="animate-in fade-in duration-500 pb-32 space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">🔧</div>
            <div>
              <p className="text-amber-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Super Admin Only</p>
              <h1 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black tracking-tight">Reset Password Karyawan</h1>
            </div>
          </div>
          <p className="text-blue-200/70 text-xs font-medium">
            Reset password karyawan ke default (NRP) atau password custom. User akan auto-logout.
          </p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-slate-50 shadow-sm">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">👥 Total Karyawan</p>
          <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-slate-900">{employees.length}</p>
        </div>
        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-amber-50 shadow-sm">
          <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest mb-1">🔧 Direset Hari Ini</p>
          <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-amber-600">{recentResets.length}</p>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white p-4 rounded-[2rem] border-2 border-slate-50 shadow-sm">
        <input
          type="text"
          placeholder="🔍 Cari nama atau NRP karyawan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-sm focus:border-[#003D79] focus:bg-white transition-all"
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
              className="bg-white p-4 rounded-[2rem] border-2 border-slate-50 shadow-sm flex items-center gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4 hover:border-amber-200 transition-all group"
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
              <div className="flex items-center gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4">
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
                className={`flex-[2] py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${
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
    <div className="animate-in fade-in duration-500 pb-32 space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">

      {/* HEADER */}
<div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
  <div className="absolute top-0 right-0 w-40 h-40 bg-purple-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
  <div className="relative z-10">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
        <div className="text-2xl lg:text-3xl shrink-0">📋</div>
        <div className="min-w-0">
          <p className="text-purple-400 font-black text-[9px] lg:text-[10px] uppercase tracking-[0.25em] lg:tracking-[0.3em] mb-0.5 lg:mb-1">
            Super Admin Only
          </p>
          <h1 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black tracking-tight truncate">Audit Log Sistem</h1>
        </div>
      </div>
      <button
        onClick={() => loadLogs(true)}
        disabled={refreshing}
        className="shrink-0 bg-white/10 hover:bg-white/20 px-2.5 py-1.5 lg:px-4 lg:py-2 rounded-xl lg:rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
      >
        {refreshing ? '⏳' : '🔄'} Refresh
      </button>
    </div>
    <p className="text-blue-200/70 text-[11px] lg:text-xs font-medium mt-2 lg:mt-3">
      Jejak digital aktivitas Super Admin • Tidak bisa dihapus
    </p>
  </div>
</div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-3 gap-2 lg:gap-3">
  <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-slate-50 shadow-sm">
    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 lg:mb-2 truncate">📊 Total Log</p>
    <p className="text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-3xl font-black text-slate-900">{stats.total || 0}</p>
  </div>
  <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-emerald-50 shadow-sm">
    <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1 lg:mb-2 truncate">✅ Sukses</p>
    <p className="text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-3xl font-black text-emerald-600">{stats.success || 0}</p>
  </div>
  <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-rose-50 shadow-sm">
    <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-1 lg:mb-2 truncate">❌ Gagal</p>
    <p className="text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-xl lg:text-3xl font-black text-rose-600">{stats.failed || 0}</p>
  </div>
</div>

      {/* BREAKDOWN BY CATEGORY */}
      {Object.keys(stats.by_category || {}).length > 0 && (
        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-slate-50 shadow-sm">
  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 lg:mb-3">📊 Breakdown per Kategori</p>
  <div className="flex flex-wrap gap-1.5 lg:gap-2">
    {Object.entries(stats.by_category || {}).map(([cat, count]: any) => {
      const conf = CATEGORY_CONFIG[cat] || { icon: '📌', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
      return (
        <div key={cat} className={`${conf.bg} ${conf.text} ${conf.border} border px-2 py-1 lg:px-3 lg:py-2 rounded-lg lg:rounded-xl flex items-center gap-1.5 lg:gap-2`}>
          <span className="text-xs lg:text-sm">{conf.icon}</span>
          <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest">{cat}</span>
          <span className="bg-white/60 px-1.5 py-0.5 rounded-full text-[9px] lg:text-[10px] font-black">{count}</span>
        </div>
      )
    })}
  </div>
</div>
      )}

      {/* FILTER PANEL */}
      <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-slate-50 shadow-sm space-y-2 lg:space-y-3">
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
          className="w-full p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-sm focus:border-[#003D79] focus:bg-white transition-all"
        />

        {/* Filter Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]"
          >
            <option value="">Semua Kategori</option>
            {Object.keys(CATEGORY_CONFIG).map(cat => (
              <option key={cat} value={cat}>{CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}</option>
            ))}
          </select>

          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]"
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
            className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]"
          />

          <input
            type="date"
            value={filterEndDate}
            onChange={e => setFilterEndDate(e.target.value)}
            placeholder="Sampai tanggal"
            className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]"
          />
        </div>

        <button
          onClick={() => loadLogs()}
          className="w-full py-2.5 lg:py-3 bg-[#003D79] text-white rounded-xl lg:rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-lg"
        >
          🔍 Terapkan Filter
        </button>
      </div>

      {/* LIST LOGS */}
      <div className="bg-white rounded-2xl lg:rounded-[2.5rem] border-2 border-slate-50 shadow-lg overflow-hidden">
  <div className="p-3 lg:p-5 bg-slate-50/50 border-b-2 border-slate-100 flex items-center justify-between">
    <div className="flex items-center gap-2 lg:gap-3">
      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-900 rounded-xl lg:rounded-2xl flex items-center justify-center text-base lg:text-xl">
        📜
      </div>
      <div>
        <h2 className="font-black text-slate-900 text-sm lg:text-base tracking-tight">Riwayat Aktivitas</h2>
        <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {logs.length} log terbaru
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
  className="w-full flex items-start gap-2.5 lg:gap-3 px-3 lg:px-5 py-3 lg:py-4 hover:bg-slate-50/70 transition-colors text-left"
>
  {/* Icon Kategori */}
  <div className={`w-9 h-9 lg:w-11 lg:h-11 ${conf.bg} ${conf.text} rounded-xl lg:rounded-2xl flex items-center justify-center text-base lg:text-lg flex-shrink-0`}>
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
            <div className="p-6 bg-gradient-to-br from-slate-900 to-[#003D79] text-white flex items-center gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4">
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

// ============ 📥 APPROVAL CENTER VIEW (v1.0 - Gabungan Cuti/Lembur/Sakit) ============
function ApprovalCenterView() {
  const [items, setItems] = useState<any[]>([])
  const [stats, setStats] = useState<any>({ total: 0, cuti: 0, lembur: 0, sakit: 0, izin_potongan: 0, izin_berbayar: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tahap, setTahap] = useState<'ATASAN' | 'PJO'>('ATASAN')
  const [showAtasanTab, setShowAtasanTab] = useState(true)
  const [showPjoTab, setShowPjoTab] = useState(false)
  const [filterJenis, setFilterJenis] = useState<'ALL' | 'CUTI' | 'LEMBUR' | 'SAKIT' | 'IZIN_POTONGAN' | 'IZIN_BERBAYAR'>('ALL')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [detailItem, setDetailItem] = useState<any>(null)
  // ─── Revisi Absensi ───
  const [mainTab, setMainTab] = useState<'pengajuan' | 'revisi'>('pengajuan')
  const [revisiItems, setRevisiItems] = useState<any[]>([])
  const [revisiLoading, setRevisiLoading] = useState(false)
  const [revisiProcessingId, setRevisiProcessingId] = useState<string | null>(null)
  const [revisiRejectModal, setRevisiRejectModal] = useState<string | null>(null)
  const [revisiRejectNote, setRevisiRejectNote] = useState('')

  useEffect(() => {
    loadData()
  }, [tahap])

  useEffect(() => {
    if (mainTab === 'revisi') loadRevisi()
  }, [mainTab])

  async function loadRevisi(silent = false) {
    if (!silent) setRevisiLoading(true)
    try {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('btm_session_token_v1') : null
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch('/api/attendance/corrections?view=approval&status=PENDING&limit=100', { headers })
      const json = await res.json()
      if (json.ok) setRevisiItems(json.items || [])
    } catch (err) {
      console.error('Load revisi error:', err)
    } finally {
      setRevisiLoading(false)
    }
  }

  async function handleRevisiAction(id: string, action: 'APPROVED' | 'REJECTED', note?: string) {
    setRevisiProcessingId(id)
    try {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('btm_session_token_v1') : null
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`/api/attendance/corrections/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ action, approval_note: note || '' })
      })
      const json = await res.json()
      if (res.ok) {
        setRevisiItems(prev => prev.filter(i => i.id !== id))
        setRevisiRejectModal(null)
        setRevisiRejectNote('')
        window.dispatchEvent(new Event('refreshNotif'))
      } else {
        alert('Gagal: ' + (json.error || 'Unknown error'))
      }
    } catch (err: any) {
      alert('Koneksi bermasalah: ' + err.message)
    } finally {
      setRevisiProcessingId(null)
    }
  }

  async function loadData(silent = false) {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch(`/api/approval-center?tahap=${tahap}`)
      const json = await res.json()
      if (res.ok) {
        setItems(json.items || [])
        setStats(json.stats || { total: 0, cuti: 0, lembur: 0, sakit: 0, izin_potongan: 0, izin_berbayar: 0 })
        setShowAtasanTab(json.show_atasan_tab !== false)   // default true
        setShowPjoTab(json.show_pjo_tab === true)          // default false
        
        // Auto-switch tab kalau user cuma punya 1 role
        if (json.show_atasan_tab === false && json.show_pjo_tab === true && tahap === 'ATASAN') {
          setTahap('PJO')
        }
      }
    } catch (err) {
      console.error('Load approval error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleApprove(item: any, action: 'APPROVED' | 'REJECTED') {
    let note = 'OK'
    if (action === 'REJECTED') {
      const promptText = prompt('Alasan penolakan:')
      if (!promptText) return
      note = promptText
    }

    // Tentukan endpoint & field ID berdasarkan jenis pengajuan
    let endpoint = ''
    let body: any = { action, catatan: note } // status: action dihapus karena API tidak butuh
    
    if (item.jenis === 'CUTI') {
      endpoint = '/api/leave/approve'
      body.leave_id = item.id     // ✅ Sesuai API Cuti
    } 
    else if (item.jenis === 'LEMBUR' || item.jenis === 'OVERTIME') {
      endpoint = '/api/overtime/approve'
      body.overtime_id = item.id  // ✅ Sesuai API Lembur (perbaikan)
    } 
    else if (item.jenis === 'SAKIT' || item.jenis === 'IZIN_POTONGAN' || item.jenis === 'IZIN_BERBAYAR') {
      endpoint = '/api/attendance/approve'
      body.id = item.id           // ✅ Sesuai API Sakit
    }

    setProcessingId(item.id)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        // Hilangkan item dari list tanpa reload
        setItems(prev => prev.filter(i => i.id !== item.id))
        
        // ✨ Kasih sinyal ke lonceng untuk update angka
        window.dispatchEvent(new Event('refreshNotif'));
        
        // Mapping jenis ke key stats
        const statsKeyMap: any = {
          'CUTI': 'cuti',
          'LEMBUR': 'lembur',
          'SAKIT': 'sakit',
          'IZIN_POTONGAN': 'izin_potongan',
          'IZIN_BERBAYAR': 'izin_berbayar'
        }
        const statsKey = statsKeyMap[item.jenis] || 'sakit'
        
        setStats((prev: any) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          [statsKey]: Math.max(0, (prev[statsKey] || 0) - 1)
        }))
        setDetailItem(null)
      } else {
        const json = await res.json()
        alert('❌ Gagal: ' + (json.error || 'Unknown error'))
      }
    } catch (err: any) {
      alert('❌ Koneksi bermasalah: ' + err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const filteredItems = filterJenis === 'ALL' 
    ? items 
    : items.filter(i => i.jenis === filterJenis)

  const COLOR_MAP: any = {
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    ring: 'ring-blue-400' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   ring: 'ring-amber-400' },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    ring: 'ring-rose-400' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'ring-emerald-400' }
  }

  const FILTER_CONFIG = [
    { key: 'ALL',            label: 'Semua',         icon: '📊', count: stats.total },
    { key: 'CUTI',           label: 'Cuti',          icon: '🌴', count: stats.cuti },
    { key: 'LEMBUR',         label: 'Lembur',        icon: '⏱️', count: stats.lembur },
    { key: 'SAKIT',          label: 'Sakit',         icon: '🤒', count: stats.sakit },
    { key: 'IZIN_POTONGAN',  label: 'Izin Potongan', icon: '⚠️', count: stats.izin_potongan },
    { key: 'IZIN_BERBAYAR',  label: 'Izin Bayar',    icon: '✅', count: stats.izin_berbayar }
  ]

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat pengajuan...
    </div>
  )

  return (
    <div className="animate-in fade-in duration-500 pb-24 space-y-2 lg:space-y-4">

      {/* MAIN TAB SWITCHER */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex gap-1">
        <button
          onClick={() => setMainTab('pengajuan')}
          className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            mainTab === 'pengajuan'
              ? 'bg-[#003D79] text-white shadow-lg'
              : 'text-slate-400 hover:bg-slate-50'
          }`}
        >
          📋 Pengajuan
          {stats.total > 0 && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
              mainTab === 'pengajuan' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {stats.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setMainTab('revisi')}
          className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
            mainTab === 'revisi'
              ? 'bg-amber-500 text-white shadow-lg'
              : 'text-slate-400 hover:bg-slate-50'
          }`}
        >
          ✏️ Revisi Absensi
          {revisiItems.length > 0 && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
              mainTab === 'revisi' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
            }`}>
              {revisiItems.length}
            </span>
          )}
        </button>
      </div>

      {/* HEADER */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="text-xl lg:text-3xl">📥</div>
              <div>
                <p className="text-emerald-400 font-black text-[9px] lg:text-[10px] uppercase tracking-[0.25em] mb-0.5">
                  Approval Center
                </p>
                <h1 className="text-sm lg:text-xl font-black tracking-tight leading-tight">
                  {stats.total > 0 ? `${stats.total} Pengajuan Menunggu` : 'Semua Sudah Diproses'}
                </h1>
              </div>
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="bg-white/10 hover:bg-white/20 px-2.5 py-1.5 lg:px-4 lg:py-2 rounded-xl lg:rounded-2xl text-[9px] lg:text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              {refreshing ? '⏳' : '🔄'} Refresh
            </button>
          </div>
          <p className="text-blue-200/70 text-[10px] lg:text-xs font-medium mt-1">
            Cuti, lembur & sakit yang perlu Anda proses
          </p>
        </div>
      </div>

      {/* SWITCH TAHAP: ATASAN vs PJO (adaptif per role) */}
      {(showAtasanTab && showPjoTab) ? (
        // Dual role: tampilkan 2 tab
        <div className="bg-white p-1.5 rounded-2xl lg:rounded-[2rem] border border-slate-100 shadow-sm flex gap-1">
          <button
            onClick={() => setTahap('ATASAN')}
            className={`flex-1 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-wider transition-all ${
              tahap === 'ATASAN'
                ? 'bg-[#003D79] text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            👔 Sebagai Atasan
          </button>
          <button
            onClick={() => setTahap('PJO')}
            className={`flex-1 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-wider transition-all ${
              tahap === 'PJO'
                ? 'bg-[#003D79] text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            🎖️ Sebagai PJO
          </button>
        </div>
      ) : (
        // Single role: tampilkan label saja (bukan tombol)
        <div className="bg-white p-2.5 lg:p-4 rounded-xl lg:rounded-2xl border border-slate-100 shadow-sm text-center">
          <p className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-wider">Approval sebagai</p>
          <p className="text-sm lg:text-lg font-black text-[#003D79] mt-0.5">
            {showPjoTab ? '🎖️ PJO' : '👔 ATASAN'}
          </p>
        </div>
      )}

      {/* FILTER JENIS - PILL BUTTONS */}
      <div className="bg-white p-2.5 lg:p-4 rounded-xl lg:rounded-2xl border border-slate-100 shadow-sm">
        <p className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
          Filter Jenis Pengajuan
        </p>
        <div className="grid grid-cols-3 gap-1.5 lg:gap-2">
          {FILTER_CONFIG.map(f => (
            <button
              key={f.key}
              onClick={() => setFilterJenis(f.key as any)}
              className={`p-2 lg:p-3 rounded-xl lg:rounded-2xl border transition-all text-center ${
                filterJenis === f.key
                  ? 'bg-[#003D79] border-[#003D79] text-white shadow-md'
                  : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-200'
              }`}
            >
              <div className="text-base lg:text-lg leading-none">{f.icon}</div>
              <div className="text-[8px] lg:text-[9px] font-black uppercase tracking-wide leading-tight mt-0.5">{f.label}</div>
              <div className={`text-sm lg:text-lg font-black leading-none mt-0.5 ${filterJenis === f.key ? 'text-white' : 'text-[#003D79]'}`}>
                {f.count}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* LIST PENGAJUAN */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <div className="bg-white p-8 lg:p-16 rounded-2xl lg:rounded-[2.5rem] border border-dashed border-slate-200 text-center">
            <div className="text-5xl mb-4 opacity-20">
              {stats.total === 0 ? '🎉' : '📭'}
            </div>
            <h3 className="font-black text-slate-400 uppercase tracking-[0.2em] text-sm mb-2">
              {stats.total === 0 ? 'Semua Beres!' : 'Filter Tidak Ada Hasil'}
            </h3>
            <p className="text-[10px] text-slate-300 font-bold italic">
              {stats.total === 0 
                ? 'Tidak ada pengajuan yang perlu diproses saat ini' 
                : 'Coba pilih filter lain di atas'}
            </p>
          </div>
        ) : (
          filteredItems.map((item: any) => {
            const color = COLOR_MAP[item.color] || COLOR_MAP.blue
            const isProcessing = processingId === item.id
            return (
              <div 
                key={item.id} 
                className={`bg-white rounded-xl lg:rounded-2xl border shadow-sm p-3 lg:p-4 transition-all ${
                  isProcessing ? 'opacity-50' : 'hover:shadow-md'
                } ${color.border}`}
              >
                {/* Header Item */}
                <div className="flex items-start gap-2 lg:gap-3 mb-2 lg:mb-3">
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 ${color.bg} ${color.text} rounded-xl lg:rounded-2xl flex items-center justify-center text-lg lg:text-2xl flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`${color.bg} ${color.text} text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest`}>
                        {item.jenis}
                      </span>
                      <h3 className="font-black text-sm text-slate-900 truncate">{item.judul}</h3>
                    </div>
                    <p className="text-xs font-bold text-slate-700 truncate">👤 {item.karyawan_nama}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {item.karyawan_jabatan} • {item.karyawan_site}
                    </p>
                  </div>
                </div>

                {/* Detail Row */}
                <div className="bg-slate-50/70 p-2 lg:p-3 rounded-lg lg:rounded-xl space-y-1 lg:space-y-1.5 mb-2 lg:mb-3">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-black text-slate-400 uppercase tracking-widest">📅 Tanggal</span>
                    <span className="font-black text-slate-900">
                      {new Date(item.tanggal_mulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {item.tanggal_selesai && item.tanggal_selesai !== item.tanggal_mulai && (
                        <> — {new Date(item.tanggal_selesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="font-black text-slate-400 uppercase tracking-widest">⏰ Durasi</span>
                    <span className="font-black text-slate-900">{item.durasi}</span>
                  </div>
                  {item.alasan_izin && (
                    <div className="flex justify-between text-[11px]">
                      <span className="font-black text-slate-400 uppercase tracking-widest">📝 Alasan Izin</span>
                      <span className="font-black text-emerald-600 text-right max-w-[60%] truncate">{item.alasan_izin}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-100 pt-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">💬 Alasan</p>
                    <p className="text-[11px] font-medium text-slate-700 italic line-clamp-2">"{item.alasan}"</p>
                  </div>
                </div>

                {/* Foto Bukti (khusus sakit) */}
                {item.foto_url && (
                  <button
                    onClick={() => window.open(item.foto_url, '_blank')}
                    className="w-full mb-3 bg-indigo-50 text-indigo-700 border-2 border-indigo-100 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all active:scale-95"
                  >
                    🖼️ Lihat Foto Bukti
                  </button>
                )}

                {/* Tombol Aksi */}
                <div className="flex gap-1.5 lg:gap-2">
                  <button
                    onClick={() => setDetailItem(item)}
                    disabled={isProcessing}
                    className="flex-1 py-2 lg:py-2.5 bg-slate-100 text-slate-600 rounded-lg lg:rounded-xl font-black text-[9px] lg:text-[10px] uppercase tracking-wider hover:bg-slate-200 disabled:opacity-50 active:scale-95 transition-all"
                  >
                    👁️ Detail
                  </button>
                  <button
                    onClick={() => handleApprove(item, 'REJECTED')}
                    disabled={isProcessing}
                    className="flex-1 py-2 lg:py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg lg:rounded-xl font-black text-[9px] lg:text-[10px] uppercase tracking-wider hover:bg-rose-600 hover:text-white hover:border-rose-600 disabled:opacity-50 active:scale-95 transition-all"
                  >
                    ❌ Tolak
                  </button>
                  <button
                    onClick={() => handleApprove(item, 'APPROVED')}
                    disabled={isProcessing}
                    className="flex-[2] py-3 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-50 active:scale-95 transition-all shadow-lg shadow-emerald-200"
                  >
                    {isProcessing ? '⏳ PROSES...' : '✅ Setujui'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* MODAL DETAIL */}
      {detailItem && (
        <>
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100]" onClick={() => setDetailItem(null)} />
          <div className="fixed inset-x-2 top-4 bottom-4 lg:inset-x-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[90%] lg:max-w-md lg:h-[85vh] bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden flex flex-col">
            
            <div className={`p-6 ${COLOR_MAP[detailItem.color]?.bg || 'bg-blue-50'} border-b-2 ${COLOR_MAP[detailItem.color]?.border || 'border-blue-100'} flex items-center gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4`}>
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                {detailItem.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-widest ${COLOR_MAP[detailItem.color]?.text}`}>
                  {detailItem.jenis}
                </p>
                <h2 className="font-black text-base text-slate-900 truncate">{detailItem.judul}</h2>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="w-10 h-10 bg-white hover:bg-slate-100 rounded-full flex items-center justify-center text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-4">
              
              {/* Karyawan Info */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">👤 Karyawan Pengaju</p>
                <div className="space-y-2 text-xs">
                  <DetailRowSimple label="Nama" value={detailItem.karyawan_nama} />
                  <DetailRowSimple label="NRP" value={detailItem.karyawan_nrp} mono />
                  <DetailRowSimple label="Jabatan" value={detailItem.karyawan_jabatan} />
                  <DetailRowSimple label="Site" value={detailItem.karyawan_site} />
                </div>
              </div>

              {/* Detail Pengajuan */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3">📋 Detail Pengajuan</p>
                <div className="space-y-2 text-xs">
                  <DetailRowSimple 
                    label="Tanggal Mulai" 
                    value={new Date(detailItem.tanggal_mulai).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} 
                  />
                  {detailItem.tanggal_selesai && detailItem.tanggal_selesai !== detailItem.tanggal_mulai && (
                    <DetailRowSimple 
                      label="Tanggal Selesai" 
                      value={new Date(detailItem.tanggal_selesai).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} 
                    />
                  )}
                  <DetailRowSimple label="Durasi" value={detailItem.durasi} />
                  {detailItem.alasan_izin && (
                    <DetailRowSimple label="Alasan Izin" value={detailItem.alasan_izin} />
                  )}
                  <div className="border-t border-slate-100 pt-2 mt-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Alasan</p>
                    <p className="text-xs font-medium text-slate-700 italic bg-slate-50 p-3 rounded-xl">
                      "{detailItem.alasan || '-'}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Foto Bukti */}
              {detailItem.foto_url && (
                <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">🖼️ Foto Bukti</p>
                  <img
                    src={detailItem.foto_url}
                    className="w-full rounded-2xl border-2 border-slate-100"
                    alt="Foto bukti"
                  />
                  <a
                    href={detailItem.foto_url}
                    target="_blank"
                    className="block text-center mt-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                  >
                    Buka Gambar Ukuran Penuh →
                  </a>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-white p-5 rounded-2xl border-2 border-slate-100">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">🕐 Metadata</p>
                <div className="space-y-2 text-xs">
                  <DetailRowSimple 
                    label="Diajukan" 
                    value={new Date(detailItem.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} 
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t-2 border-slate-100 flex gap-2">
              <button
                onClick={() => handleApprove(detailItem, 'REJECTED')}
                disabled={processingId === detailItem.id}
                className="flex-1 py-4 bg-rose-50 text-rose-600 border-2 border-rose-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 hover:text-white hover:border-rose-600 disabled:opacity-50 active:scale-95 transition-all"
              >
                ❌ Tolak
              </button>
              <button
                onClick={() => handleApprove(detailItem, 'APPROVED')}
                disabled={processingId === detailItem.id}
                className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-50 active:scale-95 transition-all shadow-xl shadow-emerald-200"
              >
                {processingId === detailItem.id ? '⏳ PROSES...' : '✅ Setujui'}
              </button>
            </div>
        </div>
        </>
      )}

      {/* ═══ SECTION REVISI ABSENSI ═══ */}
      {mainTab === 'revisi' && (
        <div className="space-y-3">

          {/* Header revisi */}
          <div className="bg-gradient-to-br from-amber-600 to-amber-500 text-white p-4 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-amber-100 font-black text-[9px] uppercase tracking-widest mb-1">Revisi Waktu Absensi</p>
                <h2 className="text-sm font-black">
                  {revisiLoading ? 'Memuat...' : `${revisiItems.length} Pengajuan Pending`}
                </h2>
              </div>
              <button
                onClick={() => loadRevisi()}
                disabled={revisiLoading}
                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
              >
                {revisiLoading ? '⏳' : '🔄'} Refresh
              </button>
            </div>
          </div>

          {revisiLoading ? (
            <div className="bg-white p-12 rounded-2xl text-center text-slate-400 text-sm font-bold animate-pulse">
              Memuat pengajuan revisi...
            </div>
          ) : revisiItems.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl text-center border border-dashed border-slate-200">
              <div className="text-4xl mb-3 opacity-30">🎉</div>
              <p className="font-black text-slate-400 uppercase tracking-widest text-xs">
                Tidak ada pengajuan revisi
              </p>
            </div>
          ) : (
            revisiItems.map((item: any) => {
              const isProcessing = revisiProcessingId === item.id
              const TIPE_LABEL: any = {
                LUPA_CLOCK_IN: 'Lupa Clock In',
                LUPA_CLOCK_OUT: 'Lupa Clock Out',
                KOREKSI_JAM: 'Revisi Jam Kerja',
              }
              return (
                <div key={item.id} className={`bg-white rounded-2xl border-2 shadow-sm p-4 transition-all ${
                  isProcessing ? 'opacity-50' : 'hover:shadow-md'
                } border-amber-100`}>

                  {/* Header card */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                      ✏️
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                          {TIPE_LABEL[item.tipe] || item.tipe}
                        </span>
                        <span className="font-black text-sm text-slate-900 truncate">
                          {item.employee_nama || item.employee_nrp}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {item.employee_nrp} · {item.employee_site_resolved || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Detail */}
                  <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 mb-3 text-[11px]">
                    <div className="flex justify-between">
                      <span className="font-black text-slate-400 uppercase tracking-widest">📅 Tanggal</span>
                      <span className="font-bold text-slate-800">
                        {new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {item.requested_clock_in && (
                      <div className="flex justify-between">
                        <span className="font-black text-slate-400 uppercase tracking-widest">🕐 Clock In</span>
                        <span className="font-bold text-emerald-700">{item.requested_clock_in.slice(0, 5)}</span>
                      </div>
                    )}
                    {item.requested_clock_out && (
                      <div className="flex justify-between">
                        <span className="font-black text-slate-400 uppercase tracking-widest">🕐 Clock Out</span>
                        <span className="font-bold text-emerald-700">{item.requested_clock_out.slice(0, 5)}</span>
                      </div>
                    )}
                    {item.approver_target_nama && (
                      <div className="flex justify-between">
                        <span className="font-black text-slate-400 uppercase tracking-widest">👤 Ditujukan</span>
                        <span className="font-bold text-[#003D79]">{item.approver_target_nama}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-100 pt-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">💬 Alasan</p>
                      <p className="text-[11px] text-slate-700 italic">"{item.alasan}"</p>
                    </div>
                  </div>

                  {/* Tombol aksi */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setRevisiRejectModal(item.id)
                        setRevisiRejectNote('')
                      }}
                      disabled={isProcessing}
                      className="flex-1 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl font-black text-[9px] uppercase tracking-wider hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                    >
                      ❌ Tolak
                    </button>
                    <button
                      onClick={() => handleRevisiAction(item.id, 'APPROVED', 'Disetujui via Approval Center')}
                      disabled={isProcessing}
                      className="flex-[2] py-2.5 bg-emerald-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-lg shadow-emerald-100"
                    >
                      {isProcessing ? '⏳ Proses...' : '✅ Setujui'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Modal Reject Revisi */}
      {revisiRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-black text-[#003D79] text-lg mb-1">❌ Tolak Revisi?</h3>
            <p className="text-xs text-slate-400 mb-4">Isi alasan penolakan (wajib)</p>
            <textarea
              value={revisiRejectNote}
              onChange={e => setRevisiRejectNote(e.target.value)}
              rows={3}
              placeholder="Contoh: Data absensi sudah sesuai sistem..."
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-[1.2rem] text-sm outline-none focus:border-rose-400 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRevisiRejectModal(null); setRevisiRejectNote('') }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-[1.2rem]"
              >
                Batal
              </button>
              <button
                onClick={() => revisiRejectNote.trim() && handleRevisiAction(revisiRejectModal, 'REJECTED', revisiRejectNote)}
                disabled={!revisiRejectNote.trim() || !!revisiProcessingId}
                className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-[1.2rem] disabled:opacity-50"
              >
                {revisiProcessingId ? '⏳...' : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// Helper untuk detail row di modal Approval Center
function DetailRowSimple({ label, value, mono = false }: any) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-50 pb-2 last:border-0">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-shrink-0">{label}</p>
      <div className={`text-xs font-bold text-slate-800 text-right max-w-[65%] ${mono ? 'font-mono' : ''}`}>
        {value || '-'}
      </div>
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
  const [roleTemplates, setRoleTemplates] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [applyingTemplate, setApplyingTemplate] = useState(false)

  useEffect(() => {
    loadData()
    loadRoleTemplates()
  }, [])

  async function loadRoleTemplates() {
    try {
      const res = await fetch('/api/role-templates')
      const json = await res.json()
      if (res.ok) setRoleTemplates(json.data || [])
    } catch (err) {
      console.error('Load templates error:', err)
    }
  }

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

    // Apply role template ke draft (tidak langsung save)
  async function handleApplyTemplate() {
    if (!selectedTemplate || !selectedEmp) return
    
    const template = roleTemplates.find(t => t.role_key === selectedTemplate)
    if (!template) return

    const confirmMsg = `Apply template "${template.role_label}" ke ${selectedEmp.nama}?\n\nIni akan MENGGANTI semua permission saat ini dengan ${template.permissions.length} permission dari template.\n\nPerubahan belum disimpan sampai klik tombol SIMPAN.`
    
    if (!confirm(confirmMsg)) return

    setApplyingTemplate(true)
    try {
      // Set draft langsung dari template (replace mode di draft)
      setDraftPerms([...template.permissions])
      setMsg({ 
        type: 'ok', 
        text: `✅ Template "${template.role_label}" dimuat! ${template.permissions.length} permissions siap disimpan.` 
      })
      setSelectedTemplate('')
      setTimeout(() => setMsg(null), 4000)
    } finally {
      setApplyingTemplate(false)
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
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">🔐</div>
            <div>
              <p className="text-amber-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Super Admin Only</p>
              <h1 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black tracking-tight">Kelola Permission</h1>
            </div>
          </div>
          <p className="text-blue-200/70 text-xs font-medium">
            Atur hak akses granular per karyawan · {data?.total_permissions || 0} permissions · 12 role template tersedia
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
          className="w-full p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-sm focus:border-[#003D79] focus:bg-white transition-all"
        />
      </div>

      {/* LIST KARYAWAN */}
      <div className="space-y-3">
        {filteredEmps.map((emp: any) => (
          <button
            key={emp.nrp}
            onClick={() => openEmployeeModal(emp)}
            className={`w-full text-left bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 shadow-sm hover:shadow-lg transition-all active:scale-98 flex items-center gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4 ${
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
              {emp.roles && emp.roles.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {emp.roles.slice(0, 2).map((r: string) => (
                    <span key={r} className="bg-blue-100 text-blue-700 text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                      {r}
                    </span>
                  ))}
                  {emp.roles.length > 2 && (
                    <span className="bg-slate-100 text-slate-500 text-[7px] font-black px-1.5 py-0.5 rounded-full">
                      +{emp.roles.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className={`text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black ${
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
            <div className="p-6 bg-gradient-to-br from-slate-900 to-[#003D79] text-white flex items-center gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4">
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

            {/* ROLE TEMPLATE SELECTOR */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-100">
              <p className="text-[9px] font-black text-[#003D79] uppercase tracking-[0.25em] mb-2">
                ⚡ Apply Role Template
              </p>
              <div className="flex gap-2">
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="flex-1 p-2.5 bg-white border-2 border-blue-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#003D79] transition-all"
                >
                  <option value="">— Pilih template role —</option>
                  {roleTemplates
                    .filter(t => t.role_key !== 'super_admin')
                    .map((t: any) => (
                    <option key={t.role_key} value={t.role_key}>
                      {t.role_label} ({t.permissions.length} perms) — {t.scope}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleApplyTemplate}
                  disabled={!selectedTemplate || applyingTemplate}
                  className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                    selectedTemplate && !applyingTemplate
                      ? 'bg-[#003D79] text-white shadow-lg shadow-blue-200 hover:bg-blue-700'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {applyingTemplate ? '⏳' : '⚡ Apply'}
                </button>
              </div>
              {selectedTemplate && (
                <p className="text-[9px] text-blue-500 font-bold mt-1.5">
                  ℹ️ {roleTemplates.find(t => t.role_key === selectedTemplate)?.role_desc}
                </p>
              )}
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
                <div className="space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
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
                className={`flex-[2] py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${
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

// ============ 🎫 KELOLA HAK TIKET & SALDO CUTI ============
function KelolaHakCutiView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [editingBalance, setEditingBalance] = useState<any>(null)
  const [balanceForm, setBalanceForm] = useState({ hak_awal: 12, terpakai: 0, penyesuaian: 0 })
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [filterSite, tahun])

  async function loadData() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSite) params.set('site', filterSite)
      if (search) params.set('search', search)
      params.set('tahun', String(tahun))

      const res = await fetch(`/api/kelola-hak-cuti?${params.toString()}`)
      const json = await res.json()
      if (res.ok) setData(json)
      else setMsg({ type: 'err', text: json.error })
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function toggleEligible(nrp: string, current: boolean) {
    if (!data?.can_edit) {
      alert('❌ Anda hanya bisa lihat (view only)')
      return
    }

    setSaving(nrp)
    try {
      const res = await fetch('/api/kelola-hak-cuti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_eligible',
          nrp,
          payload: { eligible: !current }
        })
      })
      const json = await res.json()
      if (res.ok) {
        setData((prev: any) => ({
          ...prev,
          rows: prev.rows.map((r: any) =>
            r.nrp === nrp ? { ...r, eligible_tiket_pesawat: !current } : r
          )
        }))
      } else {
        alert('❌ ' + json.error)
      }
    } finally {
      setSaving(null)
    }
  }

  function openEditBalance(row: any) {
    if (!data?.can_edit) {
      alert('❌ Anda hanya bisa lihat (view only)')
      return
    }
    setEditingBalance(row)
    setBalanceForm({
      hak_awal: row.hak_awal,
      terpakai: row.terpakai,
      penyesuaian: row.penyesuaian
    })
    setMsg(null)
  }

  async function saveBalance() {
    if (!editingBalance) return
    setSaving(editingBalance.nrp)
    try {
      const res = await fetch('/api/kelola-hak-cuti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_balance',
          nrp: editingBalance.nrp,
          payload: {
            tahun,
            hak_awal: balanceForm.hak_awal,
            terpakai: balanceForm.terpakai,
            penyesuaian: balanceForm.penyesuaian
          }
        })
      })
      const json = await res.json()
      if (res.ok) {
        alert('✅ ' + json.message)
        setEditingBalance(null)
        loadData()
      } else {
        setMsg({ type: 'err', text: '❌ ' + json.error })
      }
    } finally {
      setSaving(null)
    }
  }

  const filteredRows = (data?.rows || []).filter((r: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (r.nama || '').toLowerCase().includes(q) || (r.nrp || '').toLowerCase().includes(q)
  })

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat data...
    </div>
  )
  return (
    <div className="animate-in fade-in duration-500 pb-32 space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-3 lg:p-6 rounded-2xl lg:rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">🎫</div>
            <div>
              <p className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">
                {data?.is_view_only ? 'HR HO Read-Only' : 'HR Site / Super Admin'}
              </p>
              <h1 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black tracking-tight">Hak Tiket & Saldo Cuti</h1>
            </div>
          </div>
          <p className="text-blue-200/70 text-xs font-medium">
            Kelola hak tiket pesawat & saldo cuti tahunan karyawan
          </p>
        </div>
      </div>

      {/* FILTER */}
      <div className="bg-white p-4 rounded-[2rem] border-2 border-slate-50 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="🔍 Cari nama / NRP..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-sm focus:border-[#003D79] focus:bg-white transition-all"
        />
        <select
          value={filterSite}
          onChange={e => setFilterSite(e.target.value)}
          className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-sm focus:border-[#003D79]"
        >
          <option value="">Semua Site</option>
          {(data?.sites || []).map((s: string) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={tahun}
          onChange={e => setTahun(Number(e.target.value))}
          className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-sm focus:border-[#003D79]"
        >
          {[0, -1, -2].map(o => {
            const y = new Date().getFullYear() + o
            return <option key={y} value={y}>Tahun {y}</option>
          })}
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-lg overflow-hidden">
        <div className="p-5 bg-slate-50/50 border-b-2 border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-black text-slate-900 text-base tracking-tight">Daftar Karyawan</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {filteredRows.length} karyawan • Tahun {tahun}
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
          {filteredRows.length === 0 ? (
            <div className="p-16 text-center text-slate-300 font-bold italic">Karyawan tidak ditemukan</div>
          ) : (
            filteredRows.map((row: any) => (
              <div key={row.nrp} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-500">
                    {(row.nama || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-slate-900 truncate">{row.nama}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                      {row.nrp} • {row.jabatan} • {row.site}
                    </p>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
                      {/* Toggle Tiket */}
                      <button
                        onClick={() => toggleEligible(row.nrp, row.eligible_tiket_pesawat)}
                        disabled={saving === row.nrp || !data?.can_edit}
                        className={`p-3 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                          row.eligible_tiket_pesawat
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-slate-50 border-slate-100 text-slate-400'
                        } ${!data?.can_edit ? 'cursor-not-allowed opacity-70' : ''}`}
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest">✈️ Hak Tiket</p>
                        <p className="text-sm font-black mt-1">
                          {row.eligible_tiket_pesawat ? 'AKTIF' : 'NONAKTIF'}
                        </p>
                      </button>

                      {/* Sisa */}
                      <div className={`p-3 rounded-2xl border-2 ${
                        row.sisa <= 0 ? 'bg-rose-50 border-rose-200' :
                        row.sisa < 5 ? 'bg-amber-50 border-amber-200' :
                        'bg-emerald-50 border-emerald-200'
                      }`}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Sisa Cuti</p>
                        <p className={`text-sm font-black mt-1 ${
                          row.sisa <= 0 ? 'text-rose-700' :
                          row.sisa < 5 ? 'text-amber-700' :
                          'text-emerald-700'
                        }`}>
                          {row.sisa} hari
                        </p>
                      </div>

                      {/* Terpakai */}
                      <div className="p-3 rounded-2xl border-2 bg-slate-50 border-slate-100">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Terpakai</p>
                        <p className="text-sm font-black mt-1 text-slate-700">{row.terpakai} hari</p>
                      </div>

                      {/* Tombol Edit */}
                      <button
                        onClick={() => openEditBalance(row)}
                        disabled={!data?.can_edit}
                        className={`p-3 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                          data?.can_edit
                            ? 'bg-[#003D79] text-white border-[#003D79] hover:bg-blue-700'
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        ✏️ EDIT<br />SALDO
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL EDIT SALDO */}
      {editingBalance && (
        <>
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100]" onClick={() => setEditingBalance(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-md bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden">
            <div className="p-6 bg-gradient-to-br from-slate-900 to-[#003D79] text-white">
              <div className="flex items-center gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4">
                <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-2xl">
                  🌴
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-widest">Edit Saldo Cuti {tahun}</p>
                  <h2 className="font-black text-lg tracking-tight truncate">{editingBalance.nama}</h2>
                </div>
                <button onClick={() => setEditingBalance(null)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">✕</button>
              </div>
            </div>

            {msg && (
              <div className={`px-6 py-3 border-b-2 ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                <p className="text-[11px] font-black uppercase tracking-widest">{msg.text}</p>
              </div>
            )}

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                  Hak Awal (default 12)
                </label>
                <input
                  type="number"
                  min={0}
                  value={balanceForm.hak_awal}
                  onChange={e => setBalanceForm({ ...balanceForm, hak_awal: Number(e.target.value) })}
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-[#003D79] focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                  Terpakai (otomatis dari cuti disetujui)
                </label>
                <input
                  type="number"
                  min={0}
                  value={balanceForm.terpakai}
                  onChange={e => setBalanceForm({ ...balanceForm, terpakai: Number(e.target.value) })}
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-[#003D79] focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                  Penyesuaian (bisa negatif atau positif)
                </label>
                <input
                  type="number"
                  value={balanceForm.penyesuaian}
                  onChange={e => setBalanceForm({ ...balanceForm, penyesuaian: Number(e.target.value) })}
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-[#003D79] focus:bg-white outline-none"
                />
                <p className="text-[10px] font-bold text-slate-400 mt-2">
                  💡 Contoh: bonus cuti +2, atau potong cuti -1
                </p>
              </div>

              <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Preview Sisa</p>
                <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-blue-700">
                  {Math.max(0, balanceForm.hak_awal + balanceForm.penyesuaian - balanceForm.terpakai)} hari
                </p>
                <p className="text-[10px] font-bold text-blue-400 mt-1">
                  = {balanceForm.hak_awal} + ({balanceForm.penyesuaian}) - {balanceForm.terpakai}
                </p>
              </div>
            </div>

            <div className="p-4 bg-white border-t-2 border-slate-100 flex gap-3">
              <button
                onClick={() => setEditingBalance(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                onClick={saveBalance}
                disabled={saving === editingBalance.nrp}
                className="flex-[2] py-4 bg-[#003D79] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all"
              >
                {saving === editingBalance.nrp ? '⏳ MENYIMPAN...' : '💾 SIMPAN'}
              </button>
            </div>
          </div>
        </>
        )}
    </div>
  )
}

// ============ 📊 MONITORING ROSTER CR ============
function MonitoringRosterCRView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [filterSite, setFilterSite] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    loadData()
  }, [periode, filterSite])

  async function loadData() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        periode,
        ...(filterSite && { site: filterSite }),
      })
      const res = await fetch(`/api/monitoring-roster-cr?${params.toString()}`)
      const json = await res.json()
      if (res.ok) setData(json)
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const STATUS_CONFIG: any = {
    DISETUJUI:    { badge: '✅ SUDAH AJUKAN', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    MENUNGGU:     { badge: '🕐 MENUNGGU',     color: 'bg-blue-50 text-blue-700 border border-blue-200' },
    BELUM_AJUKAN: { badge: '⚠️ BELUM AJUKAN', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
    DITOLAK:      { badge: '❌ DITOLAK',      color: 'bg-rose-50 text-rose-700 border border-rose-200' },
  }

  const stats = data?.stats || {}

  // Filter status client-side
  const rows = (data?.data || []).filter((r: any) => {
    if (filterStatus && r.status !== filterStatus) return false
    return true
  })

  // Generate pilihan periode (12 bulan terakhir + 6 bulan ke depan)
  const periodeOptions = (() => {
    const opts = []
    const now = new Date()
    for (let i = 6; i >= -6; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      opts.push({ val, label })
    }
    return opts
  })()

  function formatDate(d: string) {
    if (!d) return '—'
    return new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  return (
    <div className="space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden">
        <div className="bg-[#003D79] p-6 text-white">
          <h2 className="text-xl font-black uppercase tracking-tight">📊 Monitoring Cuti Kompensasi (CR)</h2>
          <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mt-1">
            Rekap per karyawan yang punya jadwal CR di periode ini
          </p>
        </div>

        {/* STATS PER KARYAWAN */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-6 border-b">
          {[
            { label: 'Total Karyawan', value: stats.total_karyawan || 0, color: 'text-slate-800',   bg: 'bg-slate-50',   emoji: '👥' },
            { label: 'Sudah Ajukan',   value: stats.sudah_ajukan || 0,   color: 'text-emerald-700', bg: 'bg-emerald-50', emoji: '✅' },
            { label: 'Menunggu',       value: stats.menunggu || 0,       color: 'text-blue-700',    bg: 'bg-blue-50',    emoji: '🕐' },
            { label: 'Belum Ajukan',   value: stats.belum_ajukan || 0,   color: 'text-amber-700',   bg: 'bg-amber-50',   emoji: '⚠️' },
            { label: 'Ditolak',        value: stats.ditolak || 0,        color: 'text-rose-700',    bg: 'bg-rose-50',    emoji: '❌' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-2xl p-4 text-center`}>
              <div className="text-lg mb-1">{s.emoji}</div>
              <div className={`text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* FILTER */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Periode
            </label>
            <select
              value={periode}
              onChange={e => setPeriode(e.target.value)}
              className="w-full p-3 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-blue-500 outline-none"
            >
              {periodeOptions.map(o => (
                <option key={o.val} value={o.val}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Site
            </label>
            <select
              value={filterSite}
              onChange={e => setFilterSite(e.target.value)}
              className="w-full p-3 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-blue-500 outline-none"
            >
              <option value="">Semua Site</option>
              {(data?.sites || []).map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full p-3 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-blue-500 outline-none"
            >
              <option value="">Semua Status</option>
              <option value="BELUM_AJUKAN">⚠️ Belum Ajukan</option>
              <option value="MENUNGGU">🕐 Menunggu</option>
              <option value="DISETUJUI">✅ Sudah Ajukan</option>
              <option value="DITOLAK">❌ Ditolak</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABEL */}
      <div className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden">
        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-800">
            👥 Daftar Karyawan CR — <span className="text-blue-600">{periode}</span>
          </h3>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full font-black">
            {rows.length} KARYAWAN
          </span>
        </div>

        {loading ? (
          <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
            Memuat data...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-20 text-center">
            <div className="text-5xl mb-4 opacity-20">📭</div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
              Tidak ada karyawan dengan roster CR pada periode ini
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((r: any, i: number) => {
              const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.BELUM_AJUKAN
              return (
                <div key={i} className="p-5 hover:bg-slate-50 transition-colors">
                  {/* Header baris */}
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-slate-800 text-sm">{r.nama}</div>
                      <div className="text-[10px] text-slate-400 font-bold">
                        {r.nrp} • {r.jabatan}
                      </div>
                      <div className="text-[10px] text-blue-600 font-black mt-0.5">
                        🏢 {r.site}
                      </div>
                    </div>
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-full shrink-0 ${s.color}`}>
                      {s.badge}
                    </span>
                  </div>

                  {/* Info CR */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 text-[10px]">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="text-slate-400 font-black uppercase tracking-widest mb-1">
                        📅 Jadwal CR
                      </div>
                      <div className="font-black text-slate-700">
                        {r.total_hari_cr} hari
                      </div>
                      <div className="text-slate-500 font-bold mt-0.5">
                        {formatDate(r.tanggal_cr_pertama)} — {formatDate(r.tanggal_cr_terakhir)}
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="text-slate-400 font-black uppercase tracking-widest mb-1">
                        📝 Tanggal Ajukan
                      </div>
                      <div className="font-black text-slate-700">
                        {r.tanggal_ajukan
                          ? new Date(r.tanggal_ajukan).toLocaleDateString('id-ID', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })
                          : <span className="text-slate-300 italic">Belum ada pengajuan</span>
                        }
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="text-slate-400 font-black uppercase tracking-widest mb-1">
                        🏖️ Periode Cuti Diajukan
                      </div>
                      <div className="font-black text-slate-700">
                        {r.tanggal_cuti_mulai && r.tanggal_cuti_selesai
                          ? `${formatDate(r.tanggal_cuti_mulai)} — ${formatDate(r.tanggal_cuti_selesai)}`
                          : <span className="text-slate-300 italic">—</span>
                        }
                      </div>
                    </div>
                  </div>

                  {/* Catatan approval (kalau ada) */}
                  {(r.catatan_atasan || r.catatan_pjo) && (
                    <div className="mt-3 space-y-2">
                      {r.catatan_atasan && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 text-[10px]">
                          <span className="font-black text-blue-700">💬 Catatan Atasan: </span>
                          <span className="text-slate-700 italic">"{r.catatan_atasan}"</span>
                        </div>
                      )}
                      {r.catatan_pjo && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 text-[10px]">
                          <span className="font-black text-indigo-700">💬 Catatan PJO: </span>
                          <span className="text-slate-700 italic">"{r.catatan_pjo}"</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ 📊 EXPORT REKAP ABSENSI MATRIX ============
function ExportAbsensiMatrixView() {
  const [periode, setPeriode] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [site, setSite] = useState('')
  const [sites, setSites] = useState<string[]>([])
  const [downloading, setDownloading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  // ✅ BARU — ambil dari /api/data?table=employees langsung
useEffect(() => {
  fetch('/api/data?table=employees&fields=site')
    .then(r => r.json())
    .then(d => {
      const raw = (d.data || d || []) as any[]
      const unique = Array.from(
        new Set(raw.map((e: any) => e.site).filter(Boolean))
      ).sort() as string[]
      setSites(unique)
    })
    .catch(() => {})
}, []) // ← tidak perlu re-fetch saat periode berubah

  const periodeOptions = (() => {
    const opts = []
    const now = new Date()
    for (let i = 6; i >= -6; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      opts.push({ val, label })
    }
    return opts
  })()

  async function handleDownload() {
    setDownloading(true)
    setMsg({ type: '', text: '' })
    try {
      const params = new URLSearchParams({ periode, ...(site && { site }) })
      const res = await fetch(`/api/export-absensi-matrix?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json()
        setMsg({ type: 'err', text: err.error || 'Gagal export' })
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Rekap_Absensi_${site || 'AllSite'}_${periode}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      setMsg({ type: 'ok', text: '✅ File berhasil didownload!' })
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message })
    } finally {
      setDownloading(false)
    }
  }

  const KODE_LIST = [
    { k: 'DS',  n: 'Day Shift',      c: 'bg-sky-100 text-sky-800' },
    { k: 'NS',  n: 'Night Shift',    c: 'bg-violet-100 text-violet-800' },
    { k: 'OFF', n: 'Off / Libur',    c: 'bg-slate-200 text-slate-700' },
    { k: 'CR',  n: 'Cuti Roster',    c: 'bg-amber-100 text-amber-800' },
    { k: 'CT',  n: 'Cuti Tahunan',   c: 'bg-orange-100 text-orange-800' },
    { k: 'SCK', n: 'Shift Cuti Kompensasi', c: 'bg-emerald-100 text-emerald-800' },
    { k: 'MCK', n: 'Malam Cuti Kompensasi', c: 'bg-emerald-200 text-emerald-900' },
    { k: 'TR',  n: 'Training',       c: 'bg-blue-100 text-blue-800' },
    { k: 'ID',  n: 'Induksi',        c: 'bg-indigo-100 text-indigo-800' },
    { k: 'S',   n: 'Sakit',          c: 'bg-pink-100 text-pink-800' },
    { k: 'I',   n: 'Izin Potongan',  c: 'bg-red-100 text-red-800' },
    { k: 'IR',  n: 'Izin Resmi',     c: 'bg-rose-100 text-rose-800' },
    { k: 'A',   n: 'Alfa',           c: 'bg-red-300 text-red-900' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
      <div className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden">
        <div className="bg-[#003D79] p-6 text-white">
          <h2 className="text-xl font-black uppercase tracking-tight">📊 Export Rekap Absensi Bulanan</h2>
          <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mt-1">
            Format matrix (grid) — 1 baris per karyawan
          </p>
        </div>

        <div className="p-6 space-y-5">
          {msg.text && (
            <div className={`p-4 rounded-2xl text-sm font-bold ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msg.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Periode
              </label>
              <select
                value={periode}
                onChange={e => setPeriode(e.target.value)}
                className="w-full p-3 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-blue-500 outline-none"
              >
                {periodeOptions.map(o => (
                  <option key={o.val} value={o.val}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Site (kosongkan = semua)
              </label>
              <select
                value={site}
                onChange={e => setSite(e.target.value)}
                className="w-full p-3 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-blue-500 outline-none"
              >
                <option value="">Semua Site</option>
                {sites.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full bg-blue-600 text-white py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
          >
            {downloading ? '⏳ MENYIAPKAN FILE...' : '📥 DOWNLOAD EXCEL'}
          </button>
        </div>
      </div>

      {/* LEGENDA */}
      <div className="bg-white rounded-[2.5rem] border shadow-xl p-6">
        <h3 className="font-black text-slate-800 mb-4">📋 Legenda Kode Absensi</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {KODE_LIST.map(k => (
            <div key={k.k} className="flex items-center gap-3">
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg w-12 text-center ${k.c}`}>
                {k.k}
              </span>
              <span className="text-xs font-bold text-slate-600">{k.n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============ 📊 MONITORING CUTI & TIKET ============
function MonitoringCutiTiketView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<'CUTI' | 'TIKET'>('CUTI')
  const [bulan, setBulan] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [tahun, setTahun] = useState(String(new Date().getFullYear()))
  const [filterSite, setFilterSite] = useState('')
  const [filterStatusTiket, setFilterStatusTiket] = useState('')
  const [filterJenisCuti, setFilterJenisCuti] = useState('')
  const [editingTiket, setEditingTiket] = useState<any>(null)
  const [tiketForm, setTiketForm] = useState({ status: '', catatan: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [bulan, tahun, filterSite, filterStatusTiket, filterJenisCuti])

  async function loadData() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        bulan, tahun,
        ...(filterSite && { site: filterSite }),
        ...(filterStatusTiket && { status_tiket: filterStatusTiket }),
        ...(filterJenisCuti && { jenis_cuti: filterJenisCuti })
      })
      const res = await fetch(`/api/monitoring-cuti?${params.toString()}`)
      const json = await res.json()
      if (res.ok) setData(json)
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  function openEditTiket(tiket: any) {
    setEditingTiket(tiket)
    setTiketForm({ status: tiket.status, catatan: tiket.catatan || '' })
  }

  async function saveTiketStatus() {
    if (!editingTiket) return
    setSaving(true)
    try {
      const res = await fetch('/api/monitoring-cuti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: editingTiket.id,
          status: tiketForm.status,
          catatan: tiketForm.catatan
        })
      })
      const json = await res.json()
      if (res.ok) {
        alert('✅ ' + json.message)
        setEditingTiket(null)
        loadData()
      } else {
        alert('❌ ' + json.error)
      }
    } finally {
      setSaving(false)
    }
  }

  const STATUS_TIKET_CONFIG: any = {
    MENUNGGU_PEMESANAN: { icon: '⏳', label: 'Menunggu', color: 'amber' },
    SUDAH_DIPESAN:       { icon: '📞', label: 'Dipesan',  color: 'blue' },
    E_TICKET_TERKIRIM:   { icon: '📧', label: 'Terkirim', color: 'indigo' },
    SELESAI:             { icon: '✅', label: 'Selesai',  color: 'emerald' },
    DIBATALKAN:          { icon: '❌', label: 'Batal',    color: 'rose' }
  }

  const COLOR_MAP: any = {
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    blue:    'bg-blue-50 text-blue-700 border-blue-200',
    indigo:  'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose:    'bg-rose-50 text-rose-700 border-rose-200'
  }

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat monitoring...
    </div>
  )

  const stats = data?.stats || {}

  return (
    <div className="animate-in fade-in duration-500 pb-32 space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">📊</div>
            <div>
              <p className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Data Monitoring</p>
              <h1 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black tracking-tight">Cuti & Tiket Pesawat</h1>
            </div>
          </div>
          <p className="text-blue-200/70 text-xs font-medium">Periode {data?.periode || '-'}</p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-blue-100 shadow-sm">
          <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1">🌴 Total Cuti</p>
          <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-blue-700">{stats.total_cuti || 0}</p>
          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">bulan ini</p>
        </div>
        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-amber-100 shadow-sm">
          <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1">🏖️ Cuti Tahunan</p>
          <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-amber-700">{stats.cuti_tahunan || 0}</p>
        </div>
        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-indigo-100 shadow-sm">
          <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-1">✈️ Butuh Tiket</p>
          <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-indigo-700">{stats.butuh_tiket || 0}</p>
          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{stats.total_tiket || 0} trip</p>
        </div>
        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-rose-100 shadow-sm">
          <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-1">⏳ Menunggu</p>
          <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-rose-700">{stats.tiket_menunggu || 0}</p>
          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">tiket belum dipesan</p>
        </div>
      </div>

      {/* SUB-TAB SWITCHER */}
      <div className="bg-white p-2 rounded-[2rem] border-2 border-slate-50 shadow-sm flex gap-1">
        <button
          onClick={() => setSubTab('CUTI')}
          className={`flex-1 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-wider transition-all ${
            subTab === 'CUTI' ? 'bg-[#003D79] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
          }`}
        >
          🌴 Cuti ({stats.total_cuti || 0})
        </button>
        <button
          onClick={() => setSubTab('TIKET')}
          className={`flex-1 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-wider transition-all ${
            subTab === 'TIKET' ? 'bg-[#003D79] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
          }`}
        >
          ✈️ Tiket ({stats.total_tiket || 0})
        </button>
      </div>

      {/* FILTER */}
      <div className="bg-white p-4 rounded-[2rem] border-2 border-slate-50 shadow-sm grid grid-cols-2 lg:grid-cols-5 gap-2">
        <select value={bulan} onChange={e => setBulan(e.target.value)}
          className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]">
          {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
            <option key={m} value={m}>Bulan {m}</option>
          ))}
        </select>
        <select value={tahun} onChange={e => setTahun(e.target.value)}
          className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]">
          {[0, -1, 1].map(o => {
            const y = new Date().getFullYear() + o
            return <option key={y} value={String(y)}>{y}</option>
          })}
        </select>
        <select value={filterSite} onChange={e => setFilterSite(e.target.value)}
          className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79]">
          <option value="">Semua Site</option>
          {(data?.sites || []).map((s: string) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {subTab === 'CUTI' ? (
          <select value={filterJenisCuti} onChange={e => setFilterJenisCuti(e.target.value)}
            className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79] col-span-2">
            <option value="">Semua Jenis</option>
            <option value="CUTI REGULER / ROSTER">Reguler</option>
            <option value="CUTI TAHUNAN">Tahunan</option>
          </select>
        ) : (
          <select value={filterStatusTiket} onChange={e => setFilterStatusTiket(e.target.value)}
            className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-xs focus:border-[#003D79] col-span-2">
            <option value="">Semua Status</option>
            {Object.keys(STATUS_TIKET_CONFIG).map(s => (
              <option key={s} value={s}>{STATUS_TIKET_CONFIG[s].icon} {STATUS_TIKET_CONFIG[s].label}</option>
            ))}
          </select>
        )}
      </div>

      {/* LIST */}
      {subTab === 'CUTI' ? (
        <div className="space-y-3">
          {(data?.cuti || []).length === 0 ? (
            <div className="p-16 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
              <p className="text-slate-300 font-bold italic">Belum ada cuti bulan ini</p>
            </div>
          ) : (data?.cuti || []).map((c: any) => (
            <div key={c.id} className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-slate-50 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 bg-blue-100 rounded-2xl flex items-center justify-center font-black text-blue-700">
                  {(c.nama || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-black text-sm text-slate-900 truncate">{c.nama}</p>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                      c.jenis_cuti?.includes('TAHUNAN')
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>{c.jenis_cuti}</span>
                    {c.butuh_tiket && (
                      <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                        ✈️ TIKET
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    {c.nrp} • {c.jabatan} • {c.site}
                  </p>

                  <div className="bg-slate-50/50 p-3 rounded-xl space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-black text-slate-400 uppercase tracking-widest">📅 Tanggal</span>
                      <span className="font-black text-slate-900">
                        {new Date(c.tanggal_mulai).toLocaleDateString('id-ID')} — {new Date(c.tanggal_selesai).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="font-black text-slate-400 uppercase tracking-widest">⏱️ Durasi</span>
                      <span className="font-black text-slate-900">{c.jumlah_hari} hari</span>
                    </div>
                    <div className="flex justify-between text-[11px] items-center">
                      <span className="font-black text-slate-400 uppercase tracking-widest">Status</span>
                      <div className="flex gap-1">
                        <StatusBadge value={c.status_atasan} />
                        <StatusBadge value={c.status_pjo || '-'} />
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] italic text-slate-500 mt-2 truncate">"{c.alasan}"</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.tiket || []).length === 0 ? (
            <div className="p-16 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
              <p className="text-slate-300 font-bold italic">Belum ada tiket bulan ini</p>
            </div>
          ) : (data?.tiket || []).map((t: any) => {
            const conf = STATUS_TIKET_CONFIG[t.status] || STATUS_TIKET_CONFIG.MENUNGGU_PEMESANAN
            const colorClass = COLOR_MAP[conf.color]
            return (
              <div key={t.id} className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-slate-50 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${
                    t.trip_type === 'BERANGKAT' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {t.trip_type === 'BERANGKAT' ? '🛫' : '🛬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-black text-sm text-slate-900 truncate">{t.nama}</p>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                        t.trip_type === 'BERANGKAT' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>{t.trip_type}</span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${colorClass}`}>
                        {conf.icon} {conf.label}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      {t.nrp} • {t.jabatan} • {t.site}
                    </p>

                    <div className="bg-slate-50/50 p-3 rounded-xl space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-black text-slate-400 uppercase tracking-widest">📅 Tanggal</span>
                        <span className="font-black text-slate-900">
                          {new Date(t.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="font-black text-slate-400 uppercase tracking-widest">📍 Tujuan</span>
                        <span className="font-black text-slate-900">{t.tujuan}</span>
                      </div>
                      {t.dipesan_oleh && (
                        <div className="flex justify-between text-[11px]">
                          <span className="font-black text-slate-400 uppercase tracking-widest">Dipesan Oleh</span>
                          <span className="font-black text-slate-900">{t.dipesan_oleh}</span>
                        </div>
                      )}
                      {t.catatan && (
                        <p className="text-[10px] italic text-slate-500 pt-1 border-t border-slate-100">"{t.catatan}"</p>
                      )}
                    </div>

                    <button
                      onClick={() => openEditTiket(t)}
                      className="mt-3 w-full py-3 bg-[#003D79] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
                    >
                      ✏️ UPDATE STATUS TIKET
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL EDIT TIKET */}
      {editingTiket && (
        <>
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100]" onClick={() => setEditingTiket(null)} />
          <div className="fixed inset-x-2 top-4 bottom-4 lg:inset-x-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md lg:max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden flex flex-col">
            <div className="p-6 bg-gradient-to-br from-slate-900 to-[#003D79] text-white">
              <div className="flex items-center gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4">
                <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-2xl">
                  ✈️
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest">Update Status Tiket</p>
                  <h2 className="font-black text-lg tracking-tight truncate">{editingTiket.nama}</h2>
                  <p className="text-[10px] text-indigo-100 font-bold">
                    {editingTiket.trip_type} • {editingTiket.tujuan}
                  </p>
                </div>
                <button onClick={() => setEditingTiket(null)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">✕</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Status Baru</label>
                <div className="space-y-2">
                  {Object.entries(STATUS_TIKET_CONFIG).map(([key, conf]: any) => (
                    <button
                      key={key}
                      onClick={() => setTiketForm({ ...tiketForm, status: key })}
                      className={`w-full p-3 rounded-2xl border-2 text-left transition-all ${
                        tiketForm.status === key
                          ? `${COLOR_MAP[conf.color]} ring-2 ring-offset-2 ring-blue-400`
                          : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <p className="text-sm font-black">{conf.icon} {conf.label}</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">{key}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Catatan (Opsional)</label>
                <textarea
                  value={tiketForm.catatan}
                  onChange={e => setTiketForm({ ...tiketForm, catatan: e.target.value })}
                  placeholder="Contoh: kode booking, no e-ticket, dll..."
                  rows={3}
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-[#003D79] focus:bg-white outline-none transition-all resize-none"
                />
              </div>
            </div>

            <div className="p-4 bg-white border-t-2 border-slate-100 flex gap-3">
              <button
                onClick={() => setEditingTiket(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                onClick={saveTiketStatus}
                disabled={saving || !tiketForm.status}
                className="flex-[2] py-4 bg-[#003D79] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all"
              >
                {saving ? '⏳ MENYIMPAN...' : '💾 SIMPAN'}
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

// ============ 📝 MODAL UPDATE DOKUMEN EXPIRED ============
function UpdateExpiredModal({ row, onClose, onSuccess }: any) {
  const jenisRaw = String(row.jenis_dokumen || '').replace(/[^\w\s]/g, '').trim().toUpperCase()
  const [tanggalBaru, setTanggalBaru] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)

  async function handleSave() {
    if (!tanggalBaru) {
      setMsg({ type: 'err', text: '❌ Tanggal wajib diisi' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/monitoring-expired', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenis_dokumen: jenisRaw,
          record_id: jenisRaw === 'SIMPOL' ? row.nrp : row.id,
          tanggal_baru: tanggalBaru,
          nama_karyawan: row._nama_karyawan || row.nrp
        })
      })
      const json = await res.json()
      if (res.ok) {
        setMsg({ type: 'ok', text: json.message || '✅ Berhasil diperpanjang' })
        setTimeout(() => onSuccess(), 1000)
      } else {
        setMsg({ type: 'err', text: '❌ ' + (json.error || 'Gagal update') })
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: '❌ Koneksi bermasalah: ' + err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100]" onClick={() => !saving && onClose()} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-md bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-slate-900 to-[#003D79] text-white">
          <div className="flex items-center gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-2 lg:gap-4">
            <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-2xl">
              📝
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Perpanjang Dokumen</p>
              <h2 className="font-black text-lg tracking-tight truncate">{row.jenis_dokumen}</h2>
            </div>
            <button
              onClick={() => !saving && onClose()}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-lg font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Info Karyawan */}
        <div className="p-6 bg-slate-50/50 border-b-2 border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Karyawan</p>
          <p className="font-black text-slate-900 text-sm">{row._nama_karyawan || '-'}</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            NRP: {row.nrp} • Site: {row._site}
          </p>
        </div>

        {/* Alert Message */}
        {msg && (
          <div className={`px-6 py-3 border-b-2 ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
            <p className="text-[11px] font-black uppercase tracking-widest">{msg.text}</p>
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Tanggal Expired Saat Ini
            </p>
            <div className="bg-rose-50 border-2 border-rose-100 p-3 rounded-2xl">
              <p className="font-black text-rose-700 text-sm">
                {row.tanggal_expired ? new Date(row.tanggal_expired).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
              🗓️ Tanggal Expired Baru
            </label>
            <input
              type="date"
              value={tanggalBaru}
              onChange={e => setTanggalBaru(e.target.value)}
              className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-[#003D79] focus:bg-white outline-none transition-all"
            />
            <p className="text-[10px] text-slate-400 font-bold mt-2">
              💡 Pilih tanggal baru untuk memperpanjang masa berlaku dokumen ini
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t-2 border-slate-100 flex gap-3">
          <button
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !tanggalBaru}
            className={`flex-[2] py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${
              saving || !tanggalBaru
                ? 'bg-slate-200 text-slate-400'
                : 'bg-[#003D79] text-white shadow-xl shadow-blue-200 hover:bg-blue-700'
            }`}
          >
            {saving ? '⏳ MENYIMPAN...' : '💾 SIMPAN'}
          </button>
        </div>
      </div>
    </>
  )
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