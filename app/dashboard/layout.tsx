'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface User {
  nrp: string
  nama: string
  roles: string[]
  primaryRole: string
}

interface MenuItem {
  id: string
  role: string
  menu_key: string
  menu_label: string
  menu_icon: string
  menu_group: string
  sort_order: number
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
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
      setUser(data.user)

      const menuRes = await fetch('/api/menus')
      const menuData = await menuRes.json()
      setMenus(menuData.menus || [])
    } catch {
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

    function groupMenus(items: MenuItem[]) {
    const groups: Record<string, MenuItem[]> = {}
    items.forEach(m => {
      // Hilangkan prefix "1. ", "2. ", dll dari nama group
      const rawGroup = m.menu_group || 'Lainnya'
      const cleanGroup = rawGroup.replace(/^\d+\.\s*/, '')
      if (!groups[cleanGroup]) groups[cleanGroup] = []
      groups[cleanGroup].push(m)
    })
    return groups
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Memuat...</div>
      </div>
    )
  }

  if (!user) return null

  const grouped = groupMenus(menus)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`
        ${sidebarOpen ? 'w-64' : 'w-0 -ml-64'}
        bg-gray-900 text-white flex-shrink-0 transition-all duration-300
        fixed top-0 left-0 bottom-0 z-40 overflow-y-auto
        lg:relative lg:ml-0
      `}>
        <div className="p-4">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold">PI</span>
            </div>
            <div>
              <div className="font-bold text-sm">Portal Internal</div>
              <div className="text-[10px] text-gray-400">v1.0</div>
            </div>
          </div>

          {/* User info */}
          <div className="bg-gray-800 rounded-xl p-3 mb-6">
            <div className="font-semibold text-sm">{user.nama}</div>
            <div className="text-xs text-gray-400">NRP: {user.nrp}</div>
            <div className="text-xs text-blue-400 mt-1">
              {user.roles.map(r => r.toUpperCase()).join(' • ')}
            </div>
          </div>

          {/* Menu groups */}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="mb-4">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 px-3 mb-2">
                {group}
              </div>
              {items.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    router.push(`/dashboard?menu=${m.menu_key}`)
                    if (window.innerWidth < 1024) setSidebarOpen(false)
                  }}
                  className={`
                    w-full text-left px-3 py-2.5 rounded-xl mb-1 text-sm
                    flex items-center gap-3 transition-colors
                    ${activeMenu === m.menu_key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'}
                  `}
                >
                  <span>{m.menu_icon}</span>
                  <span>{m.menu_label}</span>
                </button>
              ))}
            </div>
          ))}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            🚪 Logout
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
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-gray-600 hover:text-gray-900"
          >
            ☰
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">
              Portal Internal Perusahaan
            </h1>
          </div>
          <div className="text-sm text-gray-500">
            {user.nama}
          </div>
        </div>

        {/* Page content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}