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

// ============================================================
// KONFIGURASI 8 TAB BOTTOM NAV
// ============================================================
const TAB_CONFIG = [
  // TAB 1: ABSENSI
  {
    key: 'absensi',
    label: 'Absensi',
    icon: '⏰',
    roles: ['karyawan', 'atasan', 'pjo', 'admin', 'hrga'],
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'absensi_saya' ||
        m.menu_key === 'riwayat_absensi' ||
        m.menu_key === 'export_absensi' ||
        m.menu_key === 'kelola_absensi'
      )
    }
  },

     // TAB 2: PENGAJUAN
  {
    key: 'pengajuan',
    label: 'Pengajuan',
    icon: '📋',
    roles: ['karyawan', 'atasan', 'pjo', 'admin', 'hrga'],
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'form_cuti' ||
        m.menu_key === 'form_lembur' ||
        m.menu_key === 'kelola_cuti' ||
        m.menu_key === 'kelola_lembur'
      )
    }
  },

    // TAB 3: DATA
  {
    key: 'data',
    label: 'Data',
    icon: '📁',
    roles: ['karyawan', 'atasan', 'pjo', 'admin', 'hrga'],
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'data_saya' ||
        m.menu_key === 'kpi_saya' ||
        m.menu_key === 'apd_saya' ||
        m.menu_key === 'pkwt_saya' ||
        m.menu_key === 'sp_saya' ||
        m.menu_key === 'bpjs_saya' ||
        m.menu_key === 'mcu_saya' ||
        m.menu_key === 'simper_saya' ||
        m.menu_key === 'roster_saya' ||
        m.menu_key === 'ubah_nrp_login' ||
        m.menu_key === 'cuti_saya' ||     // ✅ TAMBAH
        m.menu_key === 'riwayat_lembur'   // ✅ TAMBAH
      )
    }
  },

  // TAB 4: DATA BAWAHAN (Atasan/PJO/Admin/HRGA)
  {
    key: 'data_bawahan',
    label: 'Tim',
    icon: '👥',
    roles: ['atasan', 'pjo', 'admin', 'hrga'],
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'data_bawahan' ||
        m.menu_key === 'cuti_bawahan' ||
        m.menu_key === 'roster_bawahan' ||
        m.menu_key === 'absensi_bawahan' ||
        m.menu_key === 'kpi_bawahan'
      )
    }
  },

  // TAB 5: APPROVAL
  {
    key: 'approval',
    label: 'Approval',
    icon: '✅',
    roles: ['atasan', 'pjo', 'admin', 'hrga'],
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'approval_cuti' ||
        m.menu_key === 'approval_lembur' ||
        m.menu_key === 'hrga_approval_atasan' ||
        m.menu_key === 'hrga_approval_pjo' ||
        m.menu_key === 'all_cuti'
      )
    }
  },

  // TAB 6: KELOLA HRGA
  {
  key: 'kelola_hrga',
  label: 'Kelola',
  icon: '🛠️',
  roles: ['hrga'],
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
      m.menu_key === 'kelola_pengumuman'   // ✅ TAMBAHKAN INI
    )
  }
},

 // TAB 7: IMPORT/EXPORT
{
  key: 'import_export',
  label: 'Import',
  icon: '📥',
  roles: ['hrga'],
  customMatch: (m: MenuItem) => {
    return (
      m.menu_key === 'import_karyawan' ||
      m.menu_key === 'import_apd' ||
      m.menu_key === 'import_pkwt' ||
      m.menu_key === 'import_kpi' ||
      m.menu_key === 'import_sp' ||
      m.menu_key === 'import_roles' ||
      m.menu_key === 'import_matrix' ||
      m.menu_key === 'import_bpjs' ||     // ✅ DITAMBAHKAN
      m.menu_key === 'import_mcu' ||      // ✅ DITAMBAHKAN
      m.menu_key === 'import_simper' ||   // ✅ DITAMBAHKAN
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
    roles: ['karyawan', 'atasan', 'pjo', 'admin', 'hrga'],
    customMatch: (m: MenuItem) => {
      return (
        m.menu_key === 'dashboard' ||
        m.menu_key === 'kelola_roles' // backup kalau role manager
      )
    }
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-500">Memuat...</div>
      </div>
    }>
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

  // Sync activeTab dengan menu yang sedang aktif
  useEffect(() => {
    const tab = TAB_CONFIG.find(t => {
      const matched = menus.filter(m => t.customMatch(m))
      return matched.some(m => m.menu_key === activeMenu)
    })
    if (tab) setActiveTab(tab.key)
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

      let menusArray: MenuItem[] = []
      if (Array.isArray(menuData)) menusArray = menuData
      else if (menuData.menus && Array.isArray(menuData.menus)) menusArray = menuData.menus
      else if (menuData.data && Array.isArray(menuData.data)) menusArray = menuData.data

      const filtered = menusArray.filter(m => roles.includes(m.role) && m.active !== false)
      setMenus(filtered)
    } catch (err) {
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
    router.push('/')
  }

  // Dapatkan tab yang visible sesuai role
  function getVisibleTabs() {
    return TAB_CONFIG.filter(tab =>
      tab.roles.some(r => userRoles.includes(r))
    )
  }

  // Klik tab → cari menu yang masuk tab ini
  function handleTabClick(tab: typeof TAB_CONFIG[0]) {
    const tabMenus = menus.filter(m => tab.customMatch(m))

    if (tabMenus.length === 0) {
      console.warn(`Tab "${tab.key}" tidak punya menu.`)
      return
    }

    // Sort by sort_order
    tabMenus.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    // Kalau cuma 1 menu → langsung navigate
    if (tabMenus.length === 1) {
      router.push(`/dashboard?menu=${tabMenus[0].menu_key}`)
      setActiveTab(tab.key)
      setBottomSheetOpen(false)
      return
    }

    // Kalau lebih dari 1 → buka bottom sheet
    setBottomSheetMenus(tabMenus)
    setBottomSheetTitle(tab.label)
    setActiveTab(tab.key)
    setBottomSheetOpen(true)
  }

  function navigateMenu(menuKey: string) {
    router.push(`/dashboard?menu=${menuKey}`)
    setBottomSheetOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Memuat...</div>
      </div>
    )
  }

  if (!user) return null

  const visibleTabs = getVisibleTabs()

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ============ DESKTOP: LEFT SIDEBAR ============ */}
      <aside className="
        hidden lg:flex flex-col
        w-64 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950
        text-white fixed top-0 left-0 bottom-0 z-40 overflow-y-auto shadow-2xl
      ">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-lg flex-shrink-0">
              <Image src="/logo.png" alt="BTM" width={32} height={32} className="object-contain" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">BTM Portal</div>
              <div className="text-[10px] text-slate-400">Boston Trikora Mahardika</div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="bg-slate-800 rounded-2xl p-3 mb-5 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user.nama?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-white truncate">{user.nama}</div>
                <div className="text-[10px] text-slate-400">{user.nrp_login || user.nrp}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {userRoles.map(r => (
                <span key={r} className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-full font-semibold uppercase">
                  {r}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            {visibleTabs.map(tab => {
              const tabMenus = menus.filter(m => tab.customMatch(m))
              const isTabActive = activeTab === tab.key

              return (
                <div key={tab.key}>
                  <button
                    onClick={() => handleTabClick(tab)}
                    className={`
                      w-full text-left px-3 py-2.5 rounded-xl text-sm
                      flex items-center gap-3 transition-all font-semibold
                      ${isTabActive
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                    `}
                  >
                    <span className="text-base">{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span className="ml-auto text-[10px] opacity-60 bg-slate-800/50 px-1.5 py-0.5 rounded">
                      {tabMenus.length}
                    </span>
                  </button>

                  {isTabActive && tabMenus.length > 1 && (
                    <div className="ml-4 mt-1 space-y-1">
                      {tabMenus.map(m => (
                        <button
                          key={m.menu_key}
                          onClick={() => navigateMenu(m.menu_key)}
                          className={`
                            w-full text-left px-3 py-2 rounded-xl text-sm
                            flex items-center gap-2 transition-all
                            ${activeMenu === m.menu_key
                              ? 'bg-amber-500/20 text-amber-300 font-semibold'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                          `}
                        >
                          <span className="text-sm">{m.menu_icon}</span>
                          <span>{m.menu_label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-6 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            🚪 Keluar
          </button>
        </div>
      </aside>

      {/* ============ MAIN CONTENT ============ */}
      <main className="flex-1 min-w-0 lg:ml-64 pb-24 lg:pb-6">
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
          <div className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg p-1">
            <Image src="/logo.png" alt="BTM" width={24} height={24} className="object-contain" />
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-slate-900">BTM Portal</h1>
            <p className="text-[10px] text-slate-500">PT. Boston Trikora Mahardika</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-900">{user.nama}</div>
            <div className="text-[10px] text-slate-500">{user.nrp_login || user.nrp}</div>
          </div>
        </div>

        <div className="p-4 lg:p-6">
          {children}
        </div>

        <div className="hidden lg:block p-6 text-center text-xs text-slate-400 border-t border-slate-100 mt-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Image src="/logo.png" alt="BTM" width={14} height={14} className="object-contain opacity-60" />
            <span>BTM Portal v1.2.0</span>
          </div>
          <div>© {new Date().getFullYear()} PT. Boston Trikora Mahardika</div>
        </div>
      </main>

      {/* ============ MOBILE: BOTTOM NAV (HORIZONTAL SCROLL) ============ */}
      <nav className="
        lg:hidden fixed bottom-0 left-0 right-0 z-50
        bg-white border-t border-slate-200 shadow-2xl
        overflow-x-auto
        safe-area-inset-bottom
      ">
        <div className="flex items-center justify-start min-w-full px-1 py-2 gap-0.5">
          {visibleTabs.map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all flex-shrink-0 min-w-[64px]"
              >
                <span className={`text-lg transition-all ${isActive ? 'scale-110' : 'scale-100 opacity-60'}`}>
                  {tab.icon}
                </span>
                <span className={`text-[9px] font-semibold transition-all whitespace-nowrap ${isActive ? 'text-amber-500' : 'text-slate-400'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="w-4 h-0.5 bg-amber-500 rounded-full mt-0.5" />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ============ BOTTOM SHEET ============ */}
      {bottomSheetOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50 lg:hidden"
            onClick={() => setBottomSheetOpen(false)}
          />

          <div className="
            fixed bottom-0 left-0 right-0 z-50 lg:hidden
            bg-white rounded-t-3xl shadow-2xl
            animate-slide-up
          ">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            <div className="px-5 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {TAB_CONFIG.find(t => t.key === activeTab)?.icon} {bottomSheetTitle}
              </h3>
            </div>

            <div className="p-3 pb-8 space-y-1 max-h-[60vh] overflow-y-auto">
              {bottomSheetMenus.map(m => (
                <button
                  key={m.menu_key}
                  onClick={() => navigateMenu(m.menu_key)}
                  className={`
                    w-full text-left px-4 py-3.5 rounded-2xl
                    flex items-center gap-3 transition-all
                    ${activeMenu === m.menu_key
                      ? 'bg-amber-50 border border-amber-200'
                      : 'hover:bg-slate-50 border border-transparent'}
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0
                    ${activeMenu === m.menu_key ? 'bg-amber-100' : 'bg-slate-100'}
                  `}>
                    {m.menu_icon}
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${activeMenu === m.menu_key ? 'text-amber-700' : 'text-slate-800'}`}>
                      {m.menu_label}
                    </div>
                  </div>
                  {activeMenu === m.menu_key && (
                    <div className="ml-auto text-amber-500">✓</div>
                  )}
                </button>
              ))}

              {activeTab === 'profile' && (
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3.5 rounded-2xl flex items-center gap-3 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all mt-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl flex-shrink-0">
                    🚪
                  </div>
                  <div className="font-semibold text-sm text-red-600">Keluar</div>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}