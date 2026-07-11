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

  // TAB 3: DATA (Update v1.5.0)
  {
    key: 'data',
    label: 'Data',
    icon: '📁',
    roles: ['karyawan', 'atasan', 'pjo', 'admin', 'hrga', 'hrga_oprek', 'hrga_site', 'hrga_pusat', 'admin_site', 'admin_plant'],
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'apd_saya' ||
        m.menu_key === 'pkwt_saya' ||
        m.menu_key === 'sp_saya' ||
        m.menu_key === 'bpjs_saya' ||
        m.menu_key === 'mcu_saya' ||
        m.menu_key === 'simper_saya' ||
        m.menu_key === 'roster_saya' ||
        m.menu_key === 'monitoring_expired' // ✅ SINKRON DENGAN MONITORING EXPIRED
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
        m.menu_key === 'riwayat_approval' // 🌟 TAMBAHKAN INI
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

  // TAB 8: PROFILE
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
        m.menu_key === 'ubah_nrp_login'
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
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('absensi')
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)
  const [bottomSheetMenus, setBottomSheetMenus] = useState<MenuItem[]>([])
  const [bottomSheetTitle, setBottomSheetTitle] = useState('')

  const router = useRouter()
  const searchParams = useSearchParams()
  const activeMenu = searchParams.get('menu') || 'absensi_saya'

  useEffect(() => { checkAuth() }, [])

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

      const menuRes = await fetch('/api/menus')
      const menuData = await menuRes.json()
      const menusArray = Array.isArray(menuData) ? menuData : (menuData.menus || menuData.data || [])
      const filtered = menusArray.filter((m: MenuItem) => roles.includes(m.role) && m.active !== false)
      setMenus(filtered)
    } catch { router.push('/') }
    finally { setLoading(false) }
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
    }
  }

  function navigateMenu(menuKey: string) {
    router.push(`/dashboard?menu=${menuKey}`)
    setBottomSheetOpen(false)
  }

  if (loading || !user) return <div className="min-h-screen bg-slate-100 flex items-center justify-center animate-pulse text-slate-500">Memuat...</div>

  const visibleTabs = TAB_CONFIG.filter(tab => tab.roles.some(r => userRoles.includes(r)))

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex relative overflow-hidden">
  {/* Pattern Logo Background (Luxury v1.6.0) */}
  <div 
    className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
    style={{ 
      backgroundImage: `url('/bg-pattern.png')`, 
      backgroundRepeat: 'repeat',
      backgroundSize: '150px',
    }}
  />
      <aside className="hidden lg:flex flex-col w-64 bg-[#003D79] text-white fixed top-0 left-0 bottom-0 z-40 overflow-y-auto">
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-lg">
            <Image src="/btm-fix.png" alt="BTM" width={32} height={32} className="object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">BTM Mobile App</div>
            <div className="text-[10px] text-blue-200 font-black uppercase truncate leading-tight">{user.nama}</div>
            <div className="text-[9px] text-slate-500 font-medium">NRP: {user.nrp_login || user.nrp}</div>
          </div>
        </div>
        <div className="p-4 space-y-1">
          {visibleTabs.map(tab => (
            <div key={tab.key}>
              <button onClick={() => handleTabClick(tab)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 transition-all ${activeTab === tab.key ? 'bg-white/10 border-l-4 border-white text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <span>{tab.icon}</span><span className="font-semibold">{tab.label}</span>
              </button>
              {activeTab === tab.key && menus.filter(m => tab.customMatch(m)).length > 1 && (
                <div className="ml-4 mt-1 space-y-1">
                  {menus.filter(m => tab.customMatch(m)).map(m => (
                    <button key={m.menu_key} onClick={() => navigateMenu(m.menu_key)} className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 ${activeMenu === m.menu_key ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'}`}>
                      <span>{m.menu_icon || '•'}</span><span>{m.menu_label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button onClick={handleLogout} className="w-full mt-6 bg-red-600/20 text-red-400 py-2.5 rounded-xl text-sm font-bold">🚪 Keluar</button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 lg:ml-64 pb-24 lg:pb-6">
        <div className="lg:hidden bg-white border-b p-3 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
          <Image src="/btm-fix.png" alt="BTM" width={24} height={24} />
          <div className="flex-1"><h1 className="text-xs font-bold uppercase">BTM Mobile App</h1></div>
          <div className="text-right text-[10px]"><div className="font-bold">{user.nama}</div><div className="text-slate-500">{user.nrp_login || user.nrp}</div></div>
        </div>
        <div className="p-4 lg:p-6">{children}</div>
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex overflow-x-auto px-4 py-3 pb-8 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,61,121,0.08)] no-scrollbar">
  {visibleTabs.map(tab => (
    <button 
      key={tab.key} 
      onClick={() => handleTabClick(tab)} 
      className={`flex flex-col items-center min-w-[75px] flex-1 py-1 transition-all duration-300 ${activeTab === tab.key ? 'text-[#003D79] scale-110' : 'text-slate-400 opacity-60'}`}
    >
      <div className={`text-2xl mb-1 ${activeTab === tab.key ? 'filter-none' : 'grayscale'}`}>
        {tab.icon}
      </div>
      <span className={`text-[10px] tracking-tight font-black uppercase ${activeTab === tab.key ? 'opacity-100' : 'opacity-70'}`}>
        {tab.label}
      </span>
      {activeTab === tab.key && (
        <div className="w-1 h-1 bg-[#003D79] rounded-full mt-1 animate-pulse"></div>
      )}
    </button>
  ))}
</nav>

      {bottomSheetOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setBottomSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white rounded-t-[2.5rem] p-8 shadow-2xl">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" /><h3 className="font-bold mb-4 px-2 text-slate-800">{bottomSheetTitle}</h3>
            <div className="space-y-2">
              {bottomSheetMenus.map(m => (
                <button key={m.menu_key} onClick={() => navigateMenu(m.menu_key)} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 border ${activeMenu === m.menu_key ? 'bg-blue-50 border-blue-100 text-[#003D79] text-amber-700 font-bold' : 'border-slate-100 text-slate-700'}`}>
                  <span className="text-xl">{m.menu_icon || '📄'}</span><span className="text-sm">{m.menu_label}</span>
                </button>
              ))}
              {activeTab === 'profile' && <button onClick={handleLogout} className="w-full text-left p-4 rounded-2xl flex items-center gap-3 text-red-600 bg-red-50 font-bold mt-4"><span>🚪</span><span>Keluar</span></button>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}