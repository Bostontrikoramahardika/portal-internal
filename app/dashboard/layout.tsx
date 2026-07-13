'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

interface User {
  nrp: string
  nrp_login?: string
  nama: string
  jabatan?: string
  departemen?: string
  site?: string
}

interface MenuItem {
  id: string
  role: string
  menu_key: string
  menu_label: string
  menu_icon: string
  menu_group: string
  sort_order: number
  active?: boolean
}

const TAB_CONFIG = [
  // TAB 1: ABSENSI
  {
    key: 'absensi',
    label: 'Absensi',
    icon: '⏰',
    roles: ['karyawan', 'atasan', 'pjo', 'admin', 'hrga', 'hrga_oprek', 'hrga_site', 'hrga_pusat', 'admin_site', 'admin_plant'],
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'absensi_saya' ||
        m.menu_key === 'riwayat_absensi' ||
        m.menu_key === 'export_absensi' ||
        m.menu_key === 'kelola_absensi' ||
        m.menu_key === 'import_roster'
      )
    }
  },

  // TAB 2: PENGAJUAN
  {
    key: 'pengajuan',
    label: 'Pengajuan',
    icon: '📋',
    roles: ['karyawan', 'atasan', 'pjo', 'admin', 'hrga', 'hrga_oprek', 'hrga_site', 'hrga_pusat', 'admin_site', 'admin_plant'],
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'form_cuti' ||
        m.menu_key === 'form_lembur' ||
        m.menu_key === 'evident_sakit' ||
        m.menu_key === 'kelola_cuti' ||
        m.menu_key === 'kelola_lembur'
      )
    }
  },

  // TAB 3: DATA (Update v1.6.0: Disederhanakan hanya untuk monitoring)
  {
    key: 'data',
    label: 'Data',
    icon: '📁',
    roles: ['atasan', 'pjo', 'admin', 'hrga', 'hrga_oprek', 'hrga_site', 'hrga_pusat', 'admin_site', 'admin_plant'],
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'monitoring_expired' ||
        m.menu_key === 'roster_saya' // Roster tetap di sini karena bersifat jadwal operasional
      )
    }
  },

  // TAB 4: TIM
  {
    key: 'data_bawahan',
    label: 'Tim',
    icon: '👥',
    roles: ['atasan', 'pjo', 'admin', 'hrga', 'hrga_oprek', 'hrga_site', 'hrga_pusat', 'admin_site', 'admin_plant'],
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'data_bawahan' ||
        m.menu_key === 'cuti_bawahan' ||
        m.menu_key === 'roster_bawahan' ||
        m.menu_key === 'absensi_bawahan' ||
        m.menu_key === 'kpi_bawahan' ||
        m.menu_key === 'penilaian_bawahan'
      )
    }
  },

  // TAB 5: APPROVAL
  {
    key: 'approval',
    label: 'Approval',
    icon: '✅',
    roles: ['atasan', 'pjo', 'hrga', 'admin', 'admin_site', 'hrga_site', 'hrga_oprek'],
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'approval_pjo' ||
        m.menu_key === 'approval_atasan' ||
        m.menu_key === 'approval_cuti' ||
        m.menu_key === 'approval_lembur' ||
        m.menu_key === 'approval_sakit' ||
        m.menu_key === 'riwayat_approval'
      )
    }
  },

  // TAB 6: KELOLA
  {
    key: 'kelola_hrga',
    label: 'Kelola',
    icon: '🛠️',
    roles: ['hrga', 'admin', 'hrga_oprek', 'hrga_site', 'hrga_pusat'],
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'kelola_karyawan' ||
        m.menu_key === 'kelola_roles' ||
        m.menu_key === 'setting_site' ||
        m.menu_key === 'kelola_kpi' ||
        m.menu_key === 'kelola_apd' ||
        m.menu_key === 'kelola_pkwt' ||
        m.menu_key === 'kelola_sp' ||
        m.menu_key === 'kelola_bpjs' ||
        m.menu_key === 'kelola_mcu' ||
        m.menu_key === 'kelola_simper' ||
        m.menu_key === 'kelola_roster' ||
        m.menu_key === 'kelola_pengumuman' ||
        m.menu_key === 'kelola_bobot_kpi' ||
        m.menu_key === 'kelola_site_master' ||
        m.menu_key === 'kelola_job_kategori'
      )
    }
  },

  // TAB 7: IMPORT
  {
    key: 'import_export',
    label: 'Import',
    icon: '📥',
    roles: ['hrga', 'admin', 'hrga_oprek', 'hrga_site', 'hrga_pusat'],
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'import_karyawan' ||
        m.menu_key === 'import_apd' ||
        m.menu_key === 'import_pkwt' ||
        m.menu_key === 'import_kpi' ||
        m.menu_key === 'import_sp' ||
        m.menu_key === 'import_roles' ||
        m.menu_key === 'import_matrix' ||
        m.menu_key === 'import_bpjs' ||
        m.menu_key === 'import_mcu' ||
        m.menu_key === 'import_simper' ||
        m.menu_key === 'export_absensi' ||
        m.menu_key === 'audit_log'
      )
    }
  },

  // TAB 8: PROFILE (Pusat Identitas Karyawan)
  {
    key: 'profile',
    label: 'Profile',
    icon: '👤',
    roles: ['karyawan', 'atasan', 'pjo', 'admin', 'hrga', 'hrga_oprek', 'hrga_site', 'hrga_pusat', 'admin_site', 'admin_plant'],
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'dashboard' ||
        m.menu_key === 'data_saya' ||
        m.menu_key === 'kpi_saya' ||
        m.menu_key === 'ganti_password'
      )
    }
  },

    // TAB 9: SYSTEM CONFIG (RAHASIA - HANYA UNTUK RICKY)
  {
    key: 'system_config',
    label: 'System',
    icon: '⚙️',
    roles: [], // Kosongkan karena kita pakai logic is_super_admin
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'manage_permissions' || 
        m.menu_key === 'system_audit' ||
        m.menu_key === 'config_global'
      )
    }
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500">Memuat...</div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  )
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [isSuperAdmin, setIsSuperAdmin] = useState(false) // State baru
  const [userPermissions, setUserPermissions] = useState<string[]>([]) // State baru
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('absensi')
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)
  const [bottomSheetMenus, setBottomSheetMenus] = useState<MenuItem[]>([])
  const [bottomSheetTitle, setBottomSheetTitle] = useState('')
  const [notifCount, setNotifCount] = useState(0)
  const [isNotifOpen, setIsNotifOpen] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const activeMenu = searchParams.get('menu') || 'absensi_saya'

  useEffect(() => { 
    checkAuth()
    fetchNotif()
  }, [])

  useEffect(() => {
    if (menus.length > 0) {
      const tab = TAB_CONFIG.find(t => {
        const matched = menus.filter(m => t.customMatch && t.customMatch(m))
        return matched.some(m => m.menu_key === activeMenu)
      })
      if (tab) setActiveTab(tab.key)
    }
  }, [activeMenu, menus])

    async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) { router.push('/'); return }
      const data = await res.json()
      
      setUser(data.user)
      const roles: string[] = Array.isArray(data.roles) ? data.roles : []
      setUserRoles(roles)
      
      // Ambil flag super admin & permissions dari API
      const superAdminStatus = data.user?.is_super_admin || false
      setIsSuperAdmin(superAdminStatus)
      setUserPermissions(data.permissions || [])
      setIsSuperAdmin(data.user?.is_super_admin || false)

      const menuRes = await fetch('/api/menus')
      const menuData = await menuRes.json()
      const menusArray = Array.isArray(menuData) ? menuData : (menuData.menus || menuData.data || [])
      
      // PERBAIKAN FILTER: Jika Super Admin, loloskan semua menu yang active. 
      // Jika bukan, tetap pakai filter role lama.
      const filtered = menusArray.filter((m: MenuItem) => {
  if (m.active === false) return false
  if (data.user?.is_super_admin) return true // Bapak lolos filter role
  return roles.includes(m.role)
})
      
      setMenus(filtered)
    } catch (err) { 
      console.error("Auth Error:", err)
      router.push('/') 
    }
    finally { setLoading(false) }
  }

  async function fetchNotif() {
    try {
      const res = await fetch('/api/notifikasi')
      if (res.ok) {
        const data = await res.json()
        setNotifCount(data.total_notifikasi || 0)
      }
    } catch (err) { console.error("Notif Error:", err) }
  }

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
    router.push('/')
  }

    function handleTabClick(tab: typeof TAB_CONFIG[0]) {
    const tabMenus = menus.filter(m => tab.customMatch(m))
    tabMenus.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    
    if (tab.key === 'profile' || tabMenus.length > 1) {
      setBottomSheetMenus(tabMenus)
      setBottomSheetTitle(tab.label)
      setActiveTab(tab.key)
      setBottomSheetOpen(true)
      return
    }
    
    if (tabMenus.length === 1) {
      router.push(`/dashboard?menu=${tabMenus[0].menu_key}`)
      setActiveTab(tab.key)
      return
    }

    // Tambahkan ini: Jika tab diklik tapi tidak ada isinya
    if (tabMenus.length === 0) {
      alert(`Menu ${tab.label} belum tersedia untuk akses Anda atau sedang dalam pemeliharaan.`)
    }
  }
    if (tabMenus.length === 1) {
      router.push(`/dashboard?menu=${tabMenus[0].menu_key}`)
      setActiveTab(tab.key)
    }
  }

  function navigateMenu(menuKey: string) {
    router.push(`/dashboard?menu=${menuKey}`)
    setBottomSheetOpen(false)
  }

  if (loading || !user) return <div className="min-h-screen bg-slate-100 flex items-center justify-center animate-pulse text-slate-500">Memuat...</div>

    const visibleTabs = TAB_CONFIG.filter(tab => {
    // Jika tab adalah system_config, HANYA tampil jika isSuperAdmin true
    if (tab.key === 'system_config') return isSuperAdmin;
    
    // Untuk tab lainnya, admin bypass atau cek role seperti biasa
    if (isSuperAdmin) return true;
    return tab.roles.some(r => userRoles.includes(r));
  });

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative overflow-hidden">
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{ backgroundImage: `url('/bg-pattern.png')`, backgroundRepeat: 'repeat', backgroundSize: '150px' }}
      />

      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#003D79] text-white fixed top-0 left-0 bottom-0 z-40 overflow-y-auto">
        <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-lg shrink-0">
              <Image src="/btm-fix.png" alt="BTM" width={32} height={32} className="object-contain" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs truncate">BTM Portal</div>
              <div className="text-[10px] text-blue-200 font-black uppercase truncate leading-tight">{user.nama}</div>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => setIsNotifOpen(true)} 
            className="relative w-9 h-9 flex items-center justify-center active:scale-90 transition-all cursor-pointer bg-white/10 hover:bg-white/20 rounded-xl shrink-0"
          >
            <span className="text-lg">🔔</span>
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black h-4 w-4 flex items-center justify-center rounded-full border-2 border-[#003D79] shadow-lg animate-bounce">
                {notifCount}
              </span>
            )}
          </button>
        </div>

        <div className="p-4 space-y-1">
          {visibleTabs.map(tab => (
            <div key={tab.key}>
              <button onClick={() => handleTabClick(tab)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 transition-all ${activeTab === tab.key ? 'bg-white/10 border-l-4 border-white text-white font-bold' : 'text-slate-400 hover:bg-white/5'}`}>
                <span className="text-lg">{tab.icon}</span><span>{tab.label}</span>
              </button>
              {activeTab === tab.key && menus.filter(m => tab.customMatch(m)).length > 1 && (
                <div className="ml-9 mt-1 space-y-1 border-l border-white/10">
                  {menus.filter(m => tab.customMatch(m)).map(m => (
                    <button key={m.menu_key} onClick={() => navigateMenu(m.menu_key)} className={`w-full text-left px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors ${activeMenu === m.menu_key ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'}`}>
                      <span>{m.menu_icon || '•'}</span><span>{m.menu_label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button onClick={handleLogout} className="w-full mt-6 bg-red-600/20 text-red-400 py-2.5 rounded-xl text-xs font-bold hover:bg-red-600/30 transition-colors">🚪 Keluar</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 min-w-0 lg:ml-64 pb-24 lg:pb-6">
        {/* HEADER MOBILE */}
                       <div className="lg:hidden bg-white/70 backdrop-blur-xl border-b border-white/40 px-3 py-1.5 flex items-center justify-between fixed top-0 left-0 right-0 z-[60] shadow-[0_4px_20px_rgba(0,61,121,0.05)]">
          {/* Kiri: Logo + Nama App + Versi (Kompak) */}
          <div className="flex items-center gap-2 shrink-0">
            <Image src="/btm-fix.png" alt="BTM" width={18} height={18} />
            <div className="leading-[1.1]">
              <h1 className="text-[10px] font-black uppercase text-[#003D79] tracking-tight">BTM Mobile</h1>
              <p className="text-[7px] font-bold text-slate-400">v1.6.2</p>
            </div>
          </div>

          {/* Kanan: Info Karyawan + Lonceng (Baris Rapat) */}
          <div className="flex items-center gap-2">
            <div className="text-right leading-[1.1] shrink-0 max-w-[140px]">
              <div className="text-[9px] font-black text-[#003D79] uppercase truncate">{user.nama}</div>
              <div className="text-[7px] text-slate-500 font-bold">NRP: {user.nrp_login || user.nrp}</div>
              <div className="text-[7px] text-blue-600 font-black">{user.site || '-'}</div>
            </div>
            <button 
              type="button"
              onClick={() => setIsNotifOpen(true)} 
              className="relative flex items-center justify-center active:scale-90 transition-all cursor-pointer z-[70] shrink-0"
            >
              <span className="text-2xl">🔔</span>
              {notifCount > 0 && (
                <>
                  <span className="absolute -top-0.5 -right-0.5 animate-ping h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                  <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[7px] font-black h-3.5 w-3.5 flex items-center justify-center rounded-full border border-white shadow-lg pointer-events-none">
                    {notifCount}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

                <div className="p-4 lg:p-6 pt-16 lg:pt-6">{children}</div>
      </main>

      {/* BOTTOM NAVIGATION MOBILE */}
            <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-50 bg-white/70 backdrop-blur-2xl border border-white/50 flex overflow-x-auto px-2 py-2 rounded-[1.8rem] shadow-[0_10px_40px_rgba(0,61,121,0.15)] no-scrollbar">
        {visibleTabs.map(tab => (
          <button 
            key={tab.key} 
            onClick={() => handleTabClick(tab)} 
            className={`flex flex-col items-center min-w-[55px] flex-1 py-1 transition-all duration-300 ${activeTab === tab.key ? 'text-[#003D79] scale-110' : 'text-slate-400 opacity-60'}`}
          >
            <div className={`text-base mb-0.5 ${activeTab === tab.key ? '' : 'grayscale'}`}>{tab.icon}</div>
            <span className={`text-[8px] tracking-tighter font-black uppercase ${activeTab === tab.key ? 'opacity-100' : 'opacity-70'}`}>{tab.label}</span>
            {activeTab === tab.key && <div className="w-1 h-1 bg-[#003D79] rounded-full mt-0.5 animate-pulse"></div>}
          </button>
        ))}
      </nav>

      {/* BOTTOM SHEET MENU */}
      {bottomSheetOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] lg:hidden" onClick={() => setBottomSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[101] lg:hidden bg-white rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
            <h3 className="font-black text-lg mb-6 px-2 text-slate-800 tracking-tight uppercase text-center">{bottomSheetTitle}</h3>
            <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto">
              {bottomSheetMenus.map(m => (
                <button key={m.menu_key} onClick={() => navigateMenu(m.menu_key)} className={`w-full text-left p-5 rounded-3xl flex items-center justify-between border transition-all active:scale-95 ${activeMenu === m.menu_key ? 'bg-blue-50 border-blue-200 text-[#003D79]' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{m.menu_icon || '📄'}</span>
                    <span className="text-sm font-bold uppercase tracking-tight">{m.menu_label}</span>
                  </div>
                  {activeMenu === m.menu_key && <span className="text-blue-600">✓</span>}
                </button>
              ))}
              {activeTab === 'profile' && (
                <button onClick={handleLogout} className="w-full text-left p-5 rounded-3xl flex items-center gap-4 text-red-600 bg-red-50 font-black mt-4 uppercase text-sm border border-red-100 active:scale-95 transition-all">
                  <span className="text-2xl">🚪</span><span>Keluar Aplikasi</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL NOTIFICATION */}
      {isNotifOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[999]" onClick={() => setIsNotifOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[1000] overflow-hidden">
            <div className="p-8 bg-[#003D79] text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-xl tracking-tight uppercase">Pusat Notifikasi</h3>
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-[0.2em]">Update Real-time</p>
              </div>
              <button onClick={() => setIsNotifOpen(false)} className="bg-white/10 hover:bg-white/20 h-10 w-10 flex items-center justify-center rounded-full transition-colors">✕</button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto bg-slate-50/50 space-y-4">
              {notifCount === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4 opacity-20">🏝️</div>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Semua Aman!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <button onClick={() => { setIsNotifOpen(false); router.push('/dashboard?menu=approval_atasan') }} className="w-full text-left p-5 bg-white border border-slate-100 rounded-[2rem] flex gap-4 items-center shadow-sm hover:shadow-md transition-all active:scale-95">
                    <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl">📝</div>
                    <div className="flex-1">
                      <div className="font-black text-[#003D79] text-sm uppercase leading-none mb-1">Persetujuan</div>
                      <p className="text-[11px] text-slate-500 font-bold leading-tight">Cek pengajuan yang butuh approval Anda.</p>
                    </div>
                  </button>
                  <button onClick={() => { setIsNotifOpen(false); router.push('/dashboard?menu=monitoring_expired') }} className="w-full text-left p-5 bg-white border border-slate-100 rounded-[2rem] flex gap-4 items-center shadow-sm hover:shadow-md transition-all active:scale-95">
                    <div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-2xl">⚠️</div>
                    <div className="flex-1">
                      <div className="font-black text-amber-600 text-sm uppercase leading-none mb-1">Dokumen Expired</div>
                      <p className="text-[11px] text-slate-500 font-bold leading-tight">Periksa masa berlaku MCU/SIMPER/PKWT.</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}