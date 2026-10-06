'use client';
import ApprovalCenterExact from './components/ApprovalCenterExact';
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { getTablePermissions } from '@/app/lib/tablePermissions'
import { saveOfflineAttendance } from '@/app/lib/offlineDB'
import KoreksiBadge from './components/KoreksiBadge'
import dynamic from 'next/dynamic'

// LAZY-LOAD MENU (tahap 2)
// Komponen di bawah ini baru diunduh saat menunya benar-benar dibuka.
const _LoadingMenu2 = () => (
  <div className="p-10 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
    Memuat menu...
  </div>
)
const ApprovalCenterView = dynamic(() => import('./views/ApprovalCenterView'), { ssr: false, loading: _LoadingMenu2 })
const FormCutiView = dynamic(() => import('./views/FormCutiView'), { ssr: false, loading: _LoadingMenu2 })
const TableView = dynamic(() => import('./views/TableView'), { ssr: false, loading: _LoadingMenu2 })
const PenilaianBawahanView = dynamic(() => import('./views/PenilaianBawahanView'), { ssr: false, loading: _LoadingMenu2 })
const MonitoringCutiTiketView = dynamic(() => import('./views/MonitoringCutiTiketView'), { ssr: false, loading: _LoadingMenu2 })
const FormSakitView = dynamic(() => import('./views/FormSakitView'), { ssr: false, loading: _LoadingMenu2 })
const MonitoringRosterCRView = dynamic(() => import('./views/MonitoringRosterCRView'), { ssr: false, loading: _LoadingMenu2 })
const RiwayatAbsensiCustom = dynamic(() => import('./views/RiwayatAbsensiCustom'), { ssr: false, loading: _LoadingMenu2 })
const RiwayatApprovalView = dynamic(() => import('./views/RiwayatApprovalView'), { ssr: false, loading: _LoadingMenu2 })
const FormLemburView = dynamic(() => import('./views/FormLemburView'), { ssr: false, loading: _LoadingMenu2 })
const ExportAbsensiMatrixView = dynamic(() => import('./views/ExportAbsensiMatrixView'), { ssr: false, loading: _LoadingMenu2 })
const ChangePasswordView = dynamic(() => import('./views/ChangePasswordView'), { ssr: false, loading: _LoadingMenu2 })

// LAZY-LOAD MENU ADMIN (v1.8)
// Menu khusus SUPER_ADMIN di bawah ini TIDAK ikut diunduh karyawan biasa.
const _LoadingMenu = () => (
  <div className="p-10 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
    Memuat menu...
  </div>
)
const ResetPasswordAdminView = dynamic(() => import('./views/ResetPasswordAdminView'), { ssr: false, loading: _LoadingMenu })
const KelolaHakCutiView = dynamic(() => import('./views/KelolaHakCutiView'), { ssr: false, loading: _LoadingMenu })
const RoleManagerView = dynamic(() => import('./views/RoleManagerView'), { ssr: false, loading: _LoadingMenu })
const SystemAuditView = dynamic(() => import('./views/SystemAuditView'), { ssr: false, loading: _LoadingMenu })
const PermissionManagerView = dynamic(() => import('./views/PermissionManagerView'), { ssr: false, loading: _LoadingMenu })
const SitesManagerView = dynamic(() => import('./views/SitesManagerView'), { ssr: false, loading: _LoadingMenu })
const GlobalConfigView = dynamic(() => import('./views/GlobalConfigView'), { ssr: false, loading: _LoadingMenu })

/**
 *  HELPER: Salam Dinamis
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

          <div className="grid grid-cols-2 gap-2 lg:gap-4 mb-6">
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

      <div className="grid grid-cols-2 gap-2 lg:gap-4 mb-8">
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
  const menuKey = searchParams?.get('menu') || 'absensi_saya'
  const activeMenu = menuKey
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 🔐 Menu yang punya View sendiri (tidak perlu fetch /api/data)
  const STANDALONE_MENUS = [
  // Standalone lama
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
  'role_manager',
  // 🆕 Menu yang punya halaman sendiri di /dashboard/xxx
  'kelola_apd',
  'apd_saya',
  'monitoring_apd',
  'koreksi_absensi',
  'approval_koreksi',
  'manajemen_absensi',
  'rekap_absensi',
  'hr_override_absensi',
  'monitoring_mcu',
  'mcu_saya',
  'kelola_akses',
  'import_mcu_bulk',
  'import_roster_bulk',
  'kelola_unit',
  'setting_unit',
  'crew_on_duty',
  'plant_katalog',
  'plant_orders',
  'plant_admin',
  'hr_dashboard',
]

// 🎯 Menu yang harus AUTO-REDIRECT ke halaman khusus (jika diakses via /dashboard?menu=xxx)
const AUTO_REDIRECT_MAP: Record<string, string> = {
  kelola_apd: '/dashboard/kelola-apd',
  apd_saya: '/dashboard/apd-saya',
  monitoring_apd: '/dashboard/monitoring-apd',
  koreksi_absensi: '/dashboard/koreksi-absensi',
  approval_koreksi: '/dashboard/approval-koreksi',
  manajemen_absensi: '/dashboard/manajemen-absensi',
  rekap_absensi: '/dashboard/rekap-absensi',
  hr_override_absensi: '/dashboard/hr-override-absensi',
  monitoring_mcu: '/dashboard/monitoring-mcu',
  mcu_saya: '/dashboard/mcu-saya',
  kelola_akses: '/dashboard/kelola-akses',
  import_mcu_bulk: '/dashboard/import-mcu',
  import_roster_bulk: '/dashboard/import-roster',
  kelola_unit: '/dashboard/kelola-unit',
  setting_unit: '/dashboard/setting-unit',
  crew_on_duty: '/dashboard/crew-on-duty',
  plant_katalog: '/parts-catalog',
  plant_orders: '/part-orders',
  plant_admin: '/partbook/admin',
  apd_pengajuan: '/dashboard/apd-pengajuan',
  hr_dashboard: '/dashboard/hr-dashboard',
  plant_dashboard: '/dashboard/plant',
  plant_inspeksi: '/dashboard/plant/inspeksi',
  plant_logistik: '/dashboard/plant/logistik',
  rekrutmen: '/dashboard/rekrutmen',
  kelola_event: '/dashboard/kelola-event',
  monitoring_cuti_tiket: '/dashboard/dashboard-cuti',
}

  const isStandalone = STANDALONE_MENUS.includes(menuKey)

  const router = useRouter()

useEffect(() => {
  // 🚀 Auto-redirect untuk menu yang punya halaman sendiri
  if (AUTO_REDIRECT_MAP[menuKey]) {
    router.replace(AUTO_REDIRECT_MAP[menuKey])
    return
  }
  
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
  if (data.type === 'form_cuti') return <FormCutiView title={data.title} onSuccess={loadData} data={data} activeMenu={menuKey} />
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

// ============ 🗓️ HELPER: Format Tanggal Indonesia + Smart Color (Chat 25) ============
function formatExpiredDate(dateStr: any): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return '-'
  }
}

function getExpiredColor(dateStr: any, defaultColor: string = 'text-slate-800'): string {
  if (!dateStr) return 'text-slate-400'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return defaultColor
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffMs = d.getTime() - today.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'text-red-700 font-black'       // Sudah expired
    if (diffDays <= 30) return 'text-orange-600 font-black'  // < 1 bulan
    if (diffDays <= 90) return 'text-amber-600'              // < 3 bulan
    return 'text-emerald-600'                                // > 3 bulan (aman)
  } catch {
    return defaultColor
  }
}

// ============ 👤 MY IDENTITY VIEW v1.6.1 (Luxury Final) ============
function IdentityView({ data }: { data: any }) {
  const InfoItem = ({ icon, label, value, color = "text-slate-800" }: any) => (
    <div className="flex items-center gap-2 lg:gap-4 group">
      <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-lg border border-slate-100">{icon}</div>
      <div className="flex-1 border-b border-slate-50 pb-2">
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{label}</div>
        <div className={`text-sm font-black tracking-tight ${color}`}>{value || '-'}</div>
      </div>
    </div>
  )

  const BpjsItem = ({ icon, label, no, nama }: any) => (
    <div className="flex items-start gap-2 lg:gap-4">
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
    <div className="max-w-2xl lg:max-w-none mx-auto space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6 pb-32 animate-in fade-in duration-500">
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
          <InfoItem icon="🪪" label="Nomor SIMPOL" value={data.no_simpol || '-'} />
          <InfoItem 
            icon="⏳" 
            label="Exp SIMPOL" 
            value={formatExpiredDate(data.exp_simpol)} 
            color={getExpiredColor(data.exp_simpol, 'text-amber-600')} 
          />
          <InfoItem 
            icon="" 
            label="Exp SIMPER" 
            value={formatExpiredDate(data.exp_simper)} 
            color={getExpiredColor(data.exp_simper, 'text-blue-600')} 
          />
          <InfoItem 
            icon="🏥" 
            label="Exp MCU" 
            value={formatExpiredDate(data.exp_mcu)} 
            color={getExpiredColor(data.exp_mcu, 'text-red-600')} 
          />
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
              <div key={idx} className="flex items-start gap-2 lg:gap-4 bg-white p-4 rounded-3xl border border-rose-200">
                <div className="text-2xl mt-1"></div>
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
// FormCutiView dipindah ke ./views/FormCutiView.tsx (lazy-load tahap 2)

// ============  FORM LEMBUR ============
// FormLemburView dipindah ke ./views/FormLemburView.tsx (lazy-load tahap 2)

// ============ 🤒 FORM PENGAJUAN EVIDEN (SAKIT / IZIN POTONGAN / IZIN BERBAYAR) ============
// FormSakitView dipindah ke ./views/FormSakitView.tsx (lazy-load tahap 2)

// ============ 🕒 APD HISTORY ============
function APDHistoryView({ data, onReload }: any) {
  const rows = data.rows || []
  const [showAdd, setShowAdd] = useState(false)
  const grouped = rows.reduce((acc: any, item: any) => {
    if (!acc[item.jenis_apd]) acc[item.jenis_apd] = []
    acc[item.jenis_apd].push(item)
    return acc
  }, {})
  const icons: any = { 'Kemeja': '', 'Kaos': '👕', 'Sepatu': '👟', 'Helm': '⛑️', 'Earplug': '🎧', 'Masker': '😷', 'Kacamata Putih': '👓', 'Kacamata Hitam': '🕶️' }

  return (
    <div className="pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 lg:gap-4 mb-8">
        <div>
          <h2 className="text-xl lg:text-3xl font-black text-slate-900 tracking-tight">{data.title}</h2>
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
        alert(" Kontrak berhasil diperbarui secara sistem"); 
        setForm({ mulai_kontrak: '', akhir_kontrak: '', keterangan: '' });
        (typeof onSuccess !== 'undefined' && onSuccess) && onSuccess(); 
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

  // Anti double-click states (Chat 30)
  const [processing, setProcessing] = useState(false)
  const [lastClickTime, setLastClickTime] = useState(0)
  const [optimisticAction, setOptimisticAction] = useState<'in' | 'out' | null>(null)

  // ⭐ CHAT 30: Popup Close Previous
  const [showClosePopup, setShowClosePopup] = useState(false)
  const [pendingRecord, setPendingRecord] = useState<any>(null)
  const [showManualTime, setShowManualTime] = useState(false)
  const [manualTime, setManualTime] = useState('')
  const [closingRecord, setClosingRecord] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    loadStatus()
    
    const statusInterval = setInterval(() => {
      loadStatus()
    }, 30000)
    
    fetch('/api/announcements').then(r => r.json()).then(d => setAnnouncement(d.announcement)).catch(() => {})
    
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
    
    import('@/app/lib/gps-cache').then(({ getSmartGps }) => {
      getSmartGps({
        onProgress: (msg) => console.log('[GPS]', msg)
      })
        .then(coords => {
          setGps({ lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy })
          console.log(` GPS ready (${coords.source}, ±${Math.round(coords.accuracy)}m)`)
        })
        .catch(err => console.warn('[GPS] Initial fetch failed:', err.message))
    })
    
    const handleRefreshStatus = () => {
      console.log('[Dashboard] Refresh status triggered')
      loadStatus()
    }
    window.addEventListener('btm:offline-attendance-saved', handleRefreshStatus)
    window.addEventListener('btm:sync-completed', handleRefreshStatus)
    
    const handleFocus = () => {
      console.log('[Dashboard] Window focused, refresh status')
      loadStatus()
    }
    window.addEventListener('focus', handleFocus)
    
    return () => {
      clearInterval(interval)
      clearInterval(statusInterval)
      window.removeEventListener('btm:offline-attendance-saved', handleRefreshStatus)
      window.removeEventListener('btm:sync-completed', handleRefreshStatus)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  async function loadStatus() {
    try {
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

  // ⭐ CHAT 30: Cek apakah ada record LAMA belum clock-out (kemarin/sebelumnya)
  function checkPreviousUnfinished(): any {
    const allRecords = status?.all_recent_records || []
    const today = status?.site_date_today || ''
    
    // Cari record dengan tanggal < today yang belum clock-out
    const previousUnfinished = allRecords.find((r: any) => {
      return r.tanggal < today && r.clock_in && !r.clock_out
    })
    
    return previousUnfinished || null
  }

  // ⭐ CHAT 30: Handle klik "Sesuai Jadwal" atau setelah pilih jam manual
  async function handleClosePrevious(jamPulang: string, isDefault: boolean) {
    if (!pendingRecord) return
    
    setClosingRecord(true)
    try {
      const res = await fetch('/api/attendance/close-previous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance_id: pendingRecord.id,
          jam_pulang: jamPulang,
          is_default_time: isDefault
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        if (navigator.vibrate) navigator.vibrate([50, 50, 100])
        alert(data.message || ' Berhasil')
        setShowClosePopup(false)
        setShowManualTime(false)
        setManualTime('')
        setPendingRecord(null)
        await loadStatus()
        // Setelah close previous, otomatis clock-in
        setTimeout(() => {
          doClockIn()
        }, 500)
      } else {
        if (navigator.vibrate) navigator.vibrate(200)
        alert(data.error || '❌ Gagal menutup absen kemarin')
      }
    } catch (err: any) {
      alert('❌ Error: ' + err.message)
    } finally {
      setClosingRecord(false)
    }
  }

  // ⭐ CHAT 30: Function terpisah untuk Clock In beneran (setelah popup handled)
  async function doClockIn() {
    setProcessing(true)
    setOptimisticAction('in')
    
    if (navigator.vibrate) navigator.vibrate(50)
    
    try {
      // Offline path
      if (!navigator.onLine) {
        const lastGps = gps || { lat: 0, lng: 0 }
        try {
          const record = await saveOfflineAttendance('clock_in', lastGps.lat, lastGps.lng)
          const gpsInfo = (lastGps.lat === 0 && lastGps.lng === 0)
            ? ' GPS tidak tersedia (offline)'
            : `📍 GPS: ${lastGps.lat.toFixed(4)}, ${lastGps.lng.toFixed(4)}`
          if (navigator.vibrate) navigator.vibrate([50, 50, 100])
          alert(`📴 CLOCK IN berhasil disimpan OFFLINE\n\n⏰ Waktu: ${new Date(record.timestamp).toLocaleString('id-ID')}\n${gpsInfo}\n\n📶 Akan otomatis terkirim saat online.`)
          window.dispatchEvent(new CustomEvent('btm:offline-attendance-saved'))
          await loadStatus()
        } catch (e: any) {
          if (navigator.vibrate) navigator.vibrate(200)
          alert('❌ Gagal simpan offline: ' + (e?.message || 'Unknown error'))
          setOptimisticAction(null)
        }
        return
      }

      // Online path - GPS
      let gpsCoords = gps
      if (!gpsCoords) {
        try {
          const { getSmartGps } = await import('@/app/lib/gps-cache')
          const coords = await getSmartGps({
            onProgress: (msg) => console.log('[GPS handleClock]', msg)
          })
          gpsCoords = { lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy }
          setGps(gpsCoords)
        } catch (gpsErr: any) {
          alert('❌ GPS tidak bisa didapat. Silakan cek pengaturan lokasi HP.')
          setOptimisticAction(null)
          return
        }
      }
      
      // Send to server
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)
        
        const res = await fetch(`/api/attendance/clock-in`, {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude: gpsCoords!.lat, longitude: gpsCoords!.lng }),
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        const d = await res.json()
        
        if (res.ok) {
          if (navigator.vibrate) navigator.vibrate([50, 50, 100])
          alert(d.message || ' Berhasil')
        } else {
          setOptimisticAction(null)
          if (navigator.vibrate) navigator.vibrate(200)
          alert(d.error || '❌ Gagal')
        }
        loadStatus()
      } catch (err: any) {
        // Fallback offline
        try {
          const record = await saveOfflineAttendance('clock_in', gpsCoords!.lat, gpsCoords!.lng)
          if (navigator.vibrate) navigator.vibrate([50, 50, 100])
          alert(` Server tidak merespons, data DISIMPAN OFFLINE\n\n⏰ Waktu: ${new Date(record.timestamp).toLocaleString('id-ID')}\n📍 GPS: ${gpsCoords!.lat.toFixed(4)}, ${gpsCoords!.lng.toFixed(4)}\n\n📶 Akan otomatis terkirim saat server pulih.`)
          window.dispatchEvent(new CustomEvent('btm:offline-attendance-saved'))
          await loadStatus()
        } catch (saveErr: any) {
          if (navigator.vibrate) navigator.vibrate(200)
          alert("❌ Gagal simpan: " + (saveErr?.message || 'Unknown error'))
          setOptimisticAction(null)
        }
      }
    } finally {
      setTimeout(() => {
        setProcessing(false)
        setOptimisticAction(null)
      }, 1000)
    }
  }

  async function handleClock(type: 'in' | 'out') {
    // Anti double-click
    if (processing) return
    const now = Date.now()
    if (now - lastClickTime < 3000) return
    setLastClickTime(now)
    
    // ⭐ CHAT 30: Kalau Clock In, cek dulu ada record lama yang belum clock-out
    if (type === 'in') {
      const previous = checkPreviousUnfinished()
      if (previous) {
        // Ada record lama → tampilkan popup, JANGAN clock-in dulu
        if (navigator.vibrate) navigator.vibrate(50)
        setPendingRecord(previous)
        setShowClosePopup(true)
        return
      }
    }
    
    // Normal flow (clock-in tanpa previous, atau clock-out)
    setProcessing(true)
    setOptimisticAction(type)
    if (navigator.vibrate) navigator.vibrate(50)
    
    try {
      // Offline path
      if (!navigator.onLine) {
        const lastGps = gps || { lat: 0, lng: 0 }
        try {
          const record = await saveOfflineAttendance(
            type === 'in' ? 'clock_in' : 'clock_out',
            lastGps.lat, lastGps.lng
          )
          const gpsInfo = (lastGps.lat === 0 && lastGps.lng === 0)
            ? ' GPS tidak tersedia (offline)'
            : `📍 GPS: ${lastGps.lat.toFixed(4)}, ${lastGps.lng.toFixed(4)}`
          if (navigator.vibrate) navigator.vibrate([50, 50, 100])
          alert(`📴 ${type === 'in' ? 'CLOCK IN' : 'CLOCK OUT'} berhasil disimpan OFFLINE\n\n⏰ Waktu: ${new Date(record.timestamp).toLocaleString('id-ID')}\n${gpsInfo}\n\n📶 Akan otomatis terkirim saat online.`)
          window.dispatchEvent(new CustomEvent('btm:offline-attendance-saved'))
          await loadStatus()
        } catch (e: any) {
          if (navigator.vibrate) navigator.vibrate(200)
          alert('❌ Gagal simpan offline: ' + (e?.message || 'Unknown error'))
          setOptimisticAction(null)
        }
        return
      }

      // Online path - GPS
      let gpsCoords = gps
      if (!gpsCoords) {
        try {
          const { getSmartGps } = await import('@/app/lib/gps-cache')
          const coords = await getSmartGps({
            onProgress: (msg) => console.log('[GPS handleClock]', msg)
          })
          gpsCoords = { lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy }
          setGps(gpsCoords)
        } catch (gpsErr: any) {
          const useFallback = confirm(
            ` GPS tidak bisa didapat.\n\nKlik OK untuk COBA LAGI, atau Cancel untuk batal.`
          )
          if (useFallback) {
            alert('🔄 Mencoba GPS sekali lagi...')
            try {
              const { getSmartGps } = await import('@/app/lib/gps-cache')
              const coords = await getSmartGps({ allowFallback: true })
              gpsCoords = { lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy }
              setGps(gpsCoords)
            } catch {
              alert('❌ GPS masih gagal.')
              setOptimisticAction(null)
              return
            }
          } else {
            setOptimisticAction(null)
            return
          }
        }
      }
      
      // Send to server
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)
        
        const res = await fetch(`/api/attendance/clock-${type}`, {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude: gpsCoords!.lat, longitude: gpsCoords!.lng }),
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        const d = await res.json()
        
        if (res.ok) {
          if (navigator.vibrate) navigator.vibrate([50, 50, 100])
          alert(d.message || ' Berhasil')
        } else {
          setOptimisticAction(null)
          if (navigator.vibrate) navigator.vibrate(200)
          alert(d.error || '❌ Gagal')
        }
        loadStatus()
      } catch (err: any) {
        // Fallback offline
        try {
          const record = await saveOfflineAttendance(
            type === 'in' ? 'clock_in' : 'clock_out',
            gpsCoords!.lat, gpsCoords!.lng
          )
          if (navigator.vibrate) navigator.vibrate([50, 50, 100])
          alert(` Server tidak merespons, data DISIMPAN OFFLINE\n\n⏰ Waktu: ${new Date(record.timestamp).toLocaleString('id-ID')}\n📍 GPS: ${gpsCoords!.lat.toFixed(4)}, ${gpsCoords!.lng.toFixed(4)}\n\n📶 Akan otomatis terkirim saat server pulih.`)
          window.dispatchEvent(new CustomEvent('btm:offline-attendance-saved'))
          await loadStatus()
        } catch (saveErr: any) {
          if (navigator.vibrate) navigator.vibrate(200)
          alert("❌ Gagal simpan: " + (saveErr?.message || 'Unknown error'))
          setOptimisticAction(null)
        }
      }
    } finally {
      setTimeout(() => {
        setProcessing(false)
        setOptimisticAction(null)
      }, 1000)
    }
  }

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-[0.3em]">Memvalidasi Sesi Absensi...</div>
  
  const hasIn = status?.today?.clock_in
  const hasOut = status?.today?.clock_out

  // Get jam default berdasarkan shift dari pendingRecord
  function getDefaultJamPulang(): string {
    if (!pendingRecord) return '17:00'
    if (pendingRecord.shift === 'MALAM') return '05:00'
    return '17:00'  // SIANG default
  }

  function formatShiftLabel(shift: string): string {
    return shift === 'MALAM' ? '🌙 Shift Malam' : '☀️ Shift Siang'
  }

  function formatTanggalIndo(dateStr: string): string {
    try {
      const d = new Date(dateStr + 'T00:00:00Z')
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'UTC',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(d)
    } catch {
      return dateStr
    }
  }

  function formatJamClockIn(clockInStr: string): string {
    try {
      const d = new Date(clockInStr)
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(d)
    } catch {
      return '--:--'
    }
  }

  return (
    <div className="max-w-4xl lg:max-w-none mx-auto animate-in fade-in duration-700">
      
      {/* 🌟 BANNER KECIL: Notifikasi Dokumen Expired */}
      {dokumenExpired.length > 0 && (
        <div className="mb-4 bg-white border-2 border-amber-100 rounded-[1.5rem] overflow-hidden shadow-sm">
          <div className="bg-amber-50 px-4 py-2.5 flex items-center justify-between border-b border-amber-100">
            <div className="flex items-center gap-2">
              <span className="text-base"></span>
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
                    <p className="text-[11px] font-black text-slate-800 truncate">{item.jenis_dokumen || 'Dokumen'}</p>
                    <p className="text-[9px] font-bold text-slate-500">
                      {diffDays > 0 ? `${diffDays} hari lagi (${tglExp.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })})` : diffDays === 0 ? `Expired HARI INI!` : `Sudah expired ${Math.abs(diffDays)} hari lalu`}
                    </p>
                  </div>
                  {isCritical && <span className="bg-rose-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase">Kritis</span>}
                </div>
              )
            })}
            {dokumenExpired.length > 3 && (
              <a href="/dashboard?menu=monitoring_expired" className="block px-4 py-2 text-center text-[9px] font-black text-amber-600 hover:bg-amber-50 uppercase tracking-widest transition-colors">
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
        
        {(status?.today?.is_offline_pending || status?.today?.is_offline_pending_out) && (
          <div className="mb-4 mx-auto max-w-sm px-4 py-2 bg-amber-400/20 border-2 border-amber-400/60 backdrop-blur rounded-full flex items-center justify-center gap-2 animate-pulse relative z-10">
            <span className="w-2 h-2 bg-amber-300 rounded-full"></span>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-amber-100">
              📴 {status?.today?.is_offline_pending_out ? 'Clock Out' : 'Clock In'} Offline — Menunggu Sync
            </span>
          </div>
        )}
        
        <div className="flex justify-center gap-2 md:gap-4 relative z-10">
          {(processing || optimisticAction) ? (
            <button disabled className="bg-slate-500/50 backdrop-blur text-white px-5 md:px-12 py-2.5 md:py-6 rounded-[1rem] md:rounded-[2rem] font-black text-xs md:text-2xl shadow-xl cursor-not-allowed opacity-70 flex items-center gap-2">
              <span className="inline-block animate-spin">⏳</span>
              <span>{optimisticAction === 'in' ? 'CLOCK IN...' : optimisticAction === 'out' ? 'CLOCK OUT...' : 'MEMPROSES...'}</span>
            </button>
          ) : !hasIn ? (
            <button onClick={() => handleClock('in')} disabled={processing} className="bg-emerald-500/90 hover:bg-emerald-600 backdrop-blur text-white px-5 md:px-12 py-2.5 md:py-6 rounded-[1rem] md:rounded-[2rem] font-black text-xs md:text-2xl shadow-xl shadow-emerald-500/20 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              🟢 CLOCK IN
            </button>
          ) : !hasOut ? (
            <button onClick={() => handleClock('out')} disabled={processing} className="bg-rose-500/90 hover:bg-rose-600 backdrop-blur text-white px-5 md:px-12 py-2.5 md:py-6 rounded-[1rem] md:rounded-[2rem] font-black text-xs md:text-2xl shadow-xl shadow-rose-500/20 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              🔴 CLOCK OUT
            </button>
          ) : (
            <div className="bg-white/10 backdrop-blur px-4 md:px-10 py-2.5 md:py-6 rounded-[1rem] md:rounded-[2rem] border border-white/10 font-black text-[10px] md:text-xl tracking-tight text-slate-200"> SHIFT SELESAI</div>
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
          <a href="/dashboard?menu=riwayat_absensi" className="text-[9px] font-black text-slate-400 hover:text-[#003D79] uppercase tracking-widest transition-colors">Lihat Semua →</a>
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
              if (ket.includes('TERLAMBAT')) { statusLabel = 'TERLAMBAT'; statusColor = { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' }; }
              else if (ket.includes('MANGKIR') || ket.includes('TIDAK ADA')) { statusLabel = 'MANGKIR'; statusColor = { dot: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50' }; }
              else if (item.actual === 'OFF' || item.actual === 'MASUK OFF') { statusLabel = 'OFF'; statusColor = { dot: 'bg-slate-300', text: 'text-slate-400', bg: 'bg-slate-50' }; }
              else if (item.actual === 'SAKIT') { statusLabel = 'SAKIT'; statusColor = { dot: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' }; }
              else if (ket.includes('IZIN') || ket.includes('CUTI')) { statusLabel = 'IZIN'; statusColor = { dot: 'bg-purple-500', text: 'text-purple-600', bg: 'bg-purple-50' }; }
              const tglObj = new Date(item.tanggal);
              const tglFormatted = tglObj.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'short' });
              return (
                <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className={`w-2.5 h-2.5 rounded-full ${statusColor.dot} shadow-sm flex-shrink-0`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 tracking-tight mb-0.5 capitalize">{tglFormatted}</p>
                    <p className="text-[10px] font-bold text-slate-400 font-mono tracking-widest">
                      {jamMasuk?.trim() || '--:--'} <span className="text-slate-300 mx-1">→</span> {jamPulang?.trim() || '--:--'}
                    </p>
                  </div>
                  <div className={`${statusColor.bg} ${statusColor.text} px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase`}>{statusLabel}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ⭐ CHAT 30: POPUP CLOSE PREVIOUS ATTENDANCE                 */}
      {/* Style: Simple & Clean (Versi A)                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showClosePopup && pendingRecord && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[998] animate-in fade-in duration-200"
            onClick={() => {
              // Skip = tutup popup (Clock In BATAL)
              if (!closingRecord) {
                setShowClosePopup(false)
                setShowManualTime(false)
                setManualTime('')
                setPendingRecord(null)
              }
            }}
          />

          {/* Popup */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.4)] z-[999] overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            
            {/* Header */}
            <div className="bg-amber-50 border-b-2 border-amber-100 p-6 text-center">
              <div className="text-5xl mb-2 animate-bounce"></div>
              <h3 className="font-black text-[#003D79] text-sm tracking-tight uppercase">
                Absen Kemarin Belum Ditutup
              </h3>
              <div className="w-16 h-0.5 bg-amber-300 mx-auto mt-2"></div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              
              {/* Info Record */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="text-lg">📅</span>
                  <span className="text-xs font-black">{formatTanggalIndo(pendingRecord.tanggal)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="text-lg"></span>
                  <span className="text-xs font-black">{formatShiftLabel(pendingRecord.shift)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="text-lg">🕐</span>
                  <span className="text-xs font-black">
                    Clock In: <span className="text-emerald-600">{formatJamClockIn(pendingRecord.clock_in)} WITA</span>
                  </span>
                </div>
              </div>

              {/* Question */}
              <div className="text-center py-2">
                <p className="text-sm font-black text-slate-700">
                  Kamu pulang jam berapa?
                </p>
              </div>

              {/* Manual Time Input (kalau user pilih "Jam Lain") */}
              {showManualTime ? (
                <div className="bg-blue-50 rounded-2xl p-4 space-y-3 border-2 border-blue-100">
                  <label className="block text-[10px] font-black text-blue-700 uppercase tracking-widest text-center">
                    Pilih Jam Pulang Manual
                  </label>
                  <input
                    type="time"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-blue-200 text-lg font-black text-center focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 bg-white"
                    disabled={closingRecord}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowManualTime(false)
                        setManualTime('')
                      }}
                      disabled={closingRecord}
                      className="flex-1 py-3 rounded-xl bg-slate-200 text-slate-700 text-xs font-black uppercase hover:bg-slate-300 transition-colors disabled:opacity-50"
                    >
                      ← Kembali
                    </button>
                    <button
                      onClick={() => {
                        if (!manualTime) {
                          alert('Silakan pilih jam dulu')
                          return
                        }
                        handleClosePrevious(manualTime, false)
                      }}
                      disabled={closingRecord || !manualTime}
                      className="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-md"
                    >
                      {closingRecord ? '⏳ Menyimpan...' : ' Simpan'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tombol Sesuai Jadwal */}
                  <button
                    onClick={() => handleClosePrevious(getDefaultJamPulang(), true)}
                    disabled={closingRecord}
                    className="w-full py-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xl">🕐</span>
                      <div className="text-left">
                        <div className="text-sm">{getDefaultJamPulang()}</div>
                        <div className="text-[9px] font-bold opacity-90 uppercase tracking-widest">Sesuai Jadwal</div>
                      </div>
                    </div>
                  </button>

                  {/* Tombol Jam Lain */}
                  <button
                    onClick={() => {
                      setShowManualTime(true)
                      setManualTime(getDefaultJamPulang())
                    }}
                    disabled={closingRecord}
                    className="w-full py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black transition-all active:scale-95 disabled:opacity-50"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xl">⏰</span>
                      <div className="text-left">
                        <div className="text-sm">Jam Lain</div>
                        <div className="text-[9px] font-bold opacity-70 uppercase tracking-widest">Input Manual</div>
                      </div>
                    </div>
                  </button>
                </>
              )}

              {/* Nanti Saja */}
              {!showManualTime && (
                <button
                  onClick={() => {
                    setShowClosePopup(false)
                    setPendingRecord(null)
                    setManualTime('')
                  }}
                  disabled={closingRecord}
                  className="w-full py-3 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-slate-600 transition-colors disabled:opacity-50"
                >
                  Nanti Saja
                </button>
              )}
            </div>
          </div>
        </>
      )}
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


// ============  TABLE VIEW v3.0 — Advanced (Filter Site + Sort + Column Filter + Refresh) ============
// TableView dipindah ke ./views/TableView.tsx (lazy-load tahap 2)

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
        alert(" Data Berhasil Disimpan!");
        if (typeof onSuccess === 'function') onSuccess(); 
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
          <div className="flex gap-2 lg:gap-4 pt-8 sticky bottom-0 bg-white">
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

// ============ 🚪 RESIGN MODAL ============
function ResignModal({ row, mode, onClose, onSuccess }: any) {
  const isResign = mode === 'resign'
  const [tglResign, setTglResign] = useState(new Date().toISOString().split('T')[0])
  const [alasan, setAlasan] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: any) {
    e.preventDefault()
    
    if (isResign && !alasan.trim()) {
      alert('❌ Alasan resign wajib diisi')
      return
    }

    if (!confirm(isResign 
      ? ` Yakin resign-kan karyawan "${row.nama}"?\n\nTanggal: ${tglResign}\nAlasan: ${alasan}`
      : ` Yakin aktifkan kembali karyawan "${row.nama}"?\n\nData resign akan dihapus.`
    )) return

    setSaving(true)
    try {
      const values = isResign 
        ? {
            tanggal_resign: tglResign,
            alasan_resign: alasan,
            status_karyawan: 'Resign'
          }
        : {
            tanggal_resign: null,
            alasan_resign: null,
            resign_by: null,
            status_karyawan: 'Aktif'
          }
      
      const res = await fetch('/api/crud', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          table: 'employees', 
          id: row.id, 
          values 
        })
      })
      
      const resData = await res.json()
      
      if (res.ok) {
        alert(isResign 
          ? ' Karyawan berhasil di-resign'
          : ' Karyawan berhasil diaktifkan kembali'
        );
        if (typeof onSuccess === 'function') onSuccess();
      } else {
        alert('❌ Gagal: ' + (resData.error || 'Terjadi kesalahan'))
      }
    } catch (err) {
      alert('❌ Kesalahan Koneksi Server')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[99] flex items-center justify-center p-4">
      <div className={`bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border-4 border-white`}>
        <div className={`p-6 ${isResign ? 'bg-orange-500' : 'bg-emerald-500'} text-white`}>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{isResign ? '🚪' : '↩️'}</span>
            <div>
              <h3 className="font-black text-xl tracking-tight">
                {isResign ? 'Resign Karyawan' : 'Aktifkan Karyawan'}
              </h3>
              <p className="text-white/80 text-xs font-bold">
                {row.nama} • {row.nrp}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Jabatan</p>
                <p className="font-bold text-slate-800">{row.jabatan || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Site</p>
                <p className="font-bold text-slate-800">{row.site || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Tgl Masuk</p>
                <p className="font-bold text-slate-800">{row.tanggal_masuk || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Masa Kerja</p>
                <p className="font-bold text-blue-600">{row._masa_kerja || '-'}</p>
              </div>
            </div>
          </div>

          {isResign ? (
            <>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                  Tanggal Resign <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={tglResign}
                  onChange={e => setTglResign(e.target.value)}
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none"
                  required
                />
              </div>
{/* 🆕 Field POH (informasi saja) */}
{row.poh && (
  <div className="bg-slate-100 p-3 rounded-xl">
    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">POH (Point of Hire)</p>
    <p className="text-sm font-bold text-slate-700 mt-1">📍 {row.poh}</p>
  </div>
)}

<div>
  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
    Alasan Resign <span className="text-rose-500">*</span>
  </label>

                <select
                  value={alasan}
                  onChange={e => setAlasan(e.target.value)}
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none"
                  required
                >
                  <option value="">-- Pilih Alasan --</option>
                  <option value="Mengundurkan Diri">Mengundurkan Diri</option>
                  <option value="Kontrak Habis">Kontrak Habis</option>
                  <option value="Pensiun">Pensiun</option>
                  <option value="PHK">PHK</option>
                  <option value="Meninggal Dunia">Meninggal Dunia</option>
                  <option value="Pindah Perusahaan">Pindah Perusahaan</option>
                  <option value="Alasan Keluarga">Alasan Keluarga</option>
                  <option value="Kesehatan">Kesehatan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                <p className="text-[10px] font-bold text-orange-700">
                   Setelah resign: Status karyawan berubah, tidak bisa clock in/out, tidak muncul di roster
                </p>
              </div>
            </>
          ) : (
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <p className="text-sm font-bold text-emerald-700 mb-2">
                Karyawan ini akan diaktifkan kembali.
              </p>
              <div className="text-[11px] text-emerald-600 space-y-1">
                <p>• Tanggal resign akan dihapus</p>
                <p>• Alasan resign akan dihapus</p>
                <p>• Status kembali ke "Aktif"</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-slate-200"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-4 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 ${
                isResign 
                  ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' 
                  : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
              } disabled:opacity-50`}
            >
              {saving ? 'PROSES...' : (isResign ? '🚪 RESIGN' : '↩️ AKTIFKAN')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============ 👤 ROLE MANAGER v2.0 (14 Role Baru + Batch Assign) ============
// RoleManagerView dipindah ke ./views/RoleManagerView.tsx (lazy-load v1.8)

// ============  IMPORT EXCEL ============
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
      else setMsg({ type: 'ok', text: ` ${data.message}` })
    } catch { setMsg({ type: 'err', text: '❌ Kesalahan Koneksi Server' }) }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl lg:max-w-none mx-auto animate-in fade-in duration-500">
      <h2 className="text-xl lg:text-3xl font-black mb-8 text-slate-900 tracking-tight"> {title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">📄 Download Template</h3>
            <div className="space-y-3">
                <button onClick={() => window.open(`/api/template-excel?table=${table}&mode=export`, '_blank')} className="w-full bg-emerald-600 text-white py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95"> Download Master Data</button>
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
    <div className="max-w-lg lg:max-w-3xl mx-auto">
      <h2 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black mb-6">🔑 {title}</h2>
      <div className="bg-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] border-2 border-slate-50 shadow-2xl">
        {msg.text && <div className={`p-4 rounded-2xl mb-6 text-sm font-bold ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}
        <div className="bg-amber-50 p-5 rounded-2xl mb-6 text-[10px] text-amber-800 font-bold uppercase tracking-widest leading-relaxed"> PERINGATAN: Gunakan NRP yang terdaftar. Anda akan otomatis logout setelah proses berhasil.</div>
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

// ============  EXPORT ABSENSI ============
function ExportAbsensiView({ title }: any) {
  const [filters, setFilters] = useState({ tanggal_mulai: '', tanggal_selesai: '', site: '', nrp: '', status: '' })

  function handleExport() {
    if (!filters.tanggal_mulai || !filters.tanggal_selesai) { alert(' Tanggal Periode Wajib Diisi!'); return }
    let url = '/api/export-absensi?'
    Object.keys(filters).forEach(k => { const v = (filters as any)[k]; if (v) url += `${k}=${encodeURIComponent(v)}&` })
    window.open(url, '_blank')
  }

  function setBulanIni() {
    const now = new Date()
    setFilters({ ...filters, tanggal_mulai: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], tanggal_selesai: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0] })
  }

  return (
    <div className="max-w-2xl lg:max-w-none mx-auto">
      <h2 className="text-xl lg:text-3xl font-black mb-8 text-slate-900 tracking-tight"> {title}</h2>
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
        <button onClick={handleExport} className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl shadow-emerald-200 active:scale-95 transition-all"> DOWNLOAD LAPORAN EXCEL</button>
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
      <h2 className="text-xl lg:text-3xl font-black mb-8 text-slate-900 tracking-tight">📅 {title}</h2>
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
      if (res.ok) { setMsg({ type: 'ok', text: ` Roster ${form.periode} Berhasil Diunggah` }); setFile(null); setForm({ periode: '', site: '', keterangan: '' }) }
      else setMsg({ type: 'err', text: data.error })
    } catch { setMsg({ type: 'err', text: 'Gagal Menghubungi Server' }) }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-2xl lg:max-w-none mx-auto animate-in fade-in duration-500">
      <h2 className="text-xl lg:text-3xl font-black mb-8 text-slate-900 tracking-tight">📅 {title}</h2>
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
// RiwayatAbsensiCustom dipindah ke ./views/RiwayatAbsensiCustom.tsx (lazy-load tahap 2)

// ============ 📜 RIWAYAT APPROVAL VIEW ============
// RiwayatApprovalView dipindah ke ./views/RiwayatApprovalView.tsx (lazy-load tahap 2)

// ============  RAPORT KPI KARYAWAN (70/30) ============
function KPISayaRaportView({ data }: any) {
  const raport = data.rows?.[0]

  if (!raport) return (
    <div className="bg-white p-24 rounded-[3rem] border-4 border-dashed border-slate-50 text-center">
      <div className="text-6xl mb-6 grayscale opacity-30">📄</div>
      <h3 className="font-black text-slate-300 uppercase tracking-[0.3em] text-xs italic">Penilaian belum dirilis untuk periode berjalan.</h3>
    </div>
  )

  return (
    <div className="max-w-4xl lg:max-w-none mx-auto pb-10 animate-in fade-in duration-700">
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
              <h2 className="text-xl lg:text-3xl font-black tracking-tight">{raport._nama_karyawan}</h2>
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

// ============ 👥 KPI & PENILAIAN BAWAHAN (v3.1 Chat 27) ============
// PenilaianBawahanView dipindah ke ./views/PenilaianBawahanView.tsx (lazy-load tahap 2)

// ============ 🔐 CHANGE PASSWORD VIEW ============
// ChangePasswordView dipindah ke ./views/ChangePasswordView.tsx (lazy-load tahap 2)

// ============ 🏢 SITES MANAGER (Master Site v2 - Card Mewah) ============
// SitesManagerView dipindah ke ./views/SitesManagerView.tsx (lazy-load v1.8)

// ============ ⚙️ GLOBAL CONFIG VIEW (RAHASIA RICKY) ============
// GlobalConfigView dipindah ke ./views/GlobalConfigView.tsx (lazy-load v1.8)

// ============ 🔧 RESET PASSWORD ADMIN (RAHASIA RICKY) ============
// ResetPasswordAdminView dipindah ke ./views/ResetPasswordAdminView.tsx (lazy-load v1.8)

// ============ 📋 SYSTEM AUDIT VIEW (v1.0 Full Fitur) ============
// SystemAuditView dipindah ke ./views/SystemAuditView.tsx (lazy-load v1.8)

// ============  APPROVAL CENTER VIEW (v1.0 - Gabungan Cuti/Lembur/Sakit) ============
// ApprovalCenterView dipindah ke ./views/ApprovalCenterView.tsx (lazy-load tahap 2)

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
// PermissionManagerView dipindah ke ./views/PermissionManagerView.tsx (lazy-load v1.8)

// ============ 🎫 KELOLA HAK TIKET & SALDO CUTI ============
// KelolaHakCutiView dipindah ke ./views/KelolaHakCutiView.tsx (lazy-load v1.8)

// ============  MONITORING ROSTER CR ============
// MonitoringRosterCRView dipindah ke ./views/MonitoringRosterCRView.tsx (lazy-load tahap 2)

// ============  EXPORT REKAP ABSENSI MATRIX ============
// ExportAbsensiMatrixView dipindah ke ./views/ExportAbsensiMatrixView.tsx (lazy-load tahap 2)

// ============  MONITORING CUTI & TIKET ============
// MonitoringCutiTiketView dipindah ke ./views/MonitoringCutiTiketView.tsx (lazy-load tahap 2)

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

// ============  MODAL UPDATE DOKUMEN EXPIRED ============
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
        setMsg({ type: 'ok', text: json.message || ' Berhasil diperpanjang' })
        setTimeout(() => (typeof onSuccess !== 'undefined' && onSuccess) && onSuccess(), 1000)
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
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-2xl">
              
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