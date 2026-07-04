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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeMenu = searchParams.get('menu') || 'dashboard'

  useEffect(() => { 
    checkAuth() 
  }, [])

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) { 
        router.push('/')
        return 
      }
      const data = await res.json()
      
      // ✅ Simpan user
      setUser(data.user)
      
      // ✅ Ambil roles dari LEVEL LUAR (data.roles), bukan dari data.user.roles
      const roles: string[] = Array.isArray(data.roles) ? data.roles : []
      setUserRoles(roles)

      // Fetch menus
      const menuRes = await fetch('/api/menus')
      const menuData = await menuRes.json()
      
      // Handle berbagai struktur response
      let menusArray: MenuItem[] = []
      if (Array.isArray(menuData)) {
        menusArray = menuData
      } else if (menuData.menus && Array.isArray(menuData.menus)) {
        menusArray = menuData.menus
      } else if (menuData.data && Array.isArray(menuData.data)) {
        menusArray = menuData.data
      }
      
      // Filter menu berdasarkan role user
      const filtered = menusArray.filter(m => roles.includes(m.role))
      setMenus(filtered)
    } catch (err) {
      console.error('checkAuth error:', err)
      router.push('/')
    }
    finally { 
      setLoading(false) 
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    router.push('/')
  }

  function groupMenus(items: MenuItem[]) {
    const groups: Record<string, MenuItem[]> = {}
    if (!items || !Array.isArray(items)) return groups
    
    items.forEach(m => {
      if (m.active === false) return
      const rawGroup = m.menu_group || 'Lainnya'
      const cleanGroup = rawGroup.replace(/^\d+\.\s*/, '')
      if (!groups[cleanGroup]) groups[cleanGroup] = []
      groups[cleanGroup].push(m)
    })

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    })

    return groups
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-500">Memuat...</div>
      </div>
    )
  }

  if (!user) return null

  const grouped = groupMenus(menus)

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`
        ${sidebarOpen ? 'w-72' : 'w-0 -ml-72'}
        bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex-shrink-0 transition-all duration-300
        fixed top-0 left-0 bottom-0 z-40 overflow-y-auto
        lg:relative lg:ml-0
        shadow-2xl
      `}>
        <div className="p-5">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-800">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0 p-1.5 shadow-lg">
              <Image
                src="/logo.png"
                alt="BTM Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base text-white">BTM Portal</div>
              <div className="text-[10px] text-slate-400 truncate">Boston Trikora Mahardika</div>
            </div>
          </div>

          {/* User info */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 mb-6 border border-slate-700 shadow-inner">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                {user.nama?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-white truncate">{user.nama}</div>
                <div className="text-xs text-slate-400">NRP: {user.nrp_login || user.nrp}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {userRoles.map(r => (
                <span key={r} className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full font-semibold uppercase tracking-wide">
                  {r}
                </span>
              ))}
            </div>
          </div>

          {/* Menu groups */}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="mb-5">
              <div className="text-[10px] uppercase tracking-widest text-amber-500/70 px-3 mb-2 font-bold">
                {group}
              </div>
              {items.map(m => (
                <button
                  key={m.id || m.menu_key}
                  onClick={() => {
                    router.push(`/dashboard?menu=${m.menu_key}`)
                    if (window.innerWidth < 1024) setSidebarOpen(false)
                  }}
                  className={`
                    w-full text-left px-3 py-2.5 rounded-xl mb-1 text-sm
                    flex items-center gap-3 transition-all
                    ${activeMenu === m.menu_key
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <span className="text-base">{m.menu_icon}</span>
                  <span className="font-medium">{m.menu_label}</span>
                </button>
              ))}
            </div>
          ))}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full mt-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-lg"
          >
            🚪 Keluar
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 sticky top-0 z-20 shadow-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-slate-600 hover:text-slate-900 text-xl"
          >
            ☰
          </button>

          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-lg p-1">
              <Image
                src="/logo.png"
                alt="BTM"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                BTM Portal
              </h1>
              <p className="text-[10px] text-slate-500 hidden sm:block">
                PT. Boston Trikora Mahardika
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-semibold text-slate-900">{user.nama}</div>
            <div className="text-[10px] text-slate-500">NRP: {user.nrp_login || user.nrp}</div>
          </div>
        </div>

        <div className="p-6">
          {children}
        </div>

        <div className="p-6 text-center text-xs text-slate-400 border-t border-slate-100 mt-8">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Image
              src="/logo.png"
              alt="BTM"
              width={16}
              height={16}
              className="object-contain opacity-60"
            />
            <span>BTM Portal v1.1</span>
          </div>
          <div>© {new Date().getFullYear()} PT. Boston Trikora Mahardika. All rights reserved.</div>
        </div>
      </main>
    </div>
  )
}