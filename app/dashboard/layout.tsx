'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import MobileBottomNav from '@/app/components/MobileBottomNav'
import SyncIndicator from '@/app/dashboard/components/SyncIndicator'
import ClockOutReminder from '@/app/dashboard/components/ClockOutReminder'
import VerificationModal from '@/app/dashboard/components/VerificationModal'
import AppFooter from '@/app/components/AppFooter'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const rawPathname = usePathname()
  const pathname = rawPathname || ''
  const router = useRouter()
  const [menus, setMenus] = useState<any[]>([])
  const [loadingMenus, setLoadingMenus] = useState<boolean>(true)

  // ═══════════════════════════════════════════════
  // ✨ STATE & FETCH DATA USER REAL (CACHE + API)
  // ═══════════════════════════════════════════════
  const [userData, setUserData] = useState<any>(null)

  useEffect(() => {
    try {
      const cached = localStorage.getItem('btm_user_cache_v1') || localStorage.getItem('btm_user_v1')
      if (cached) {
        const parsed = JSON.parse(cached)
        setUserData(parsed.user || parsed)
      }
    } catch (e) {}

    async function loadFreshUser() {
      try {
        const token = localStorage.getItem('btm_session_token_v1')
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = 'Bearer ' + token

        const res = await fetch('/api/auth/me', { credentials: 'include', headers })
        if (res.ok) {
          const data = await res.json()
          if (data?.user) {
            setUserData(data.user)
          }
        }
      } catch (err) {
        console.error('Failed to load user in header:', err)
      }
    }
    loadFreshUser()
  }, [])

  // ═══════════════════════════════════════════════
  // ✨ NOTIFICATION STATES
  // ═══════════════════════════════════════════════
  const [notifCount, setNotifCount] = useState(0)
  const [notifData, setNotifData] = useState<any>({ 
    approval: { total: 0, breakdown: [] }, 
    expired: { total: 0, critical: 0, breakdown: [] },
    notifications: { total: 0, unread: 0, items: [] }
  })
  const [isNotifOpen, setIsNotifOpen] = useState(false)

  useEffect(() => {
    async function fetchMenus() {
      try {
        const token = localStorage.getItem('btm_session_token_v1')
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = 'Bearer ' + token
        
        const res = await fetch('/api/menus', { credentials: 'include', headers })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            setMenus(data)
          } else if (data && Array.isArray(data.menus)) {
            setMenus(data.menus)
          }
        }
      } catch (err) {
        console.error('Failed to load dynamic menus:', err)
      } finally {
        setLoadingMenus(false)
      }
    }
    fetchMenus()
  }, [])

  useEffect(() => {
    fetchNotif()
    window.addEventListener('refreshNotif', fetchNotif)
    return () => window.removeEventListener('refreshNotif', fetchNotif)
  }, [])

  async function fetchNotif() {
    try {
      const res = await fetch('/api/notifikasi')
      if (res.ok) {
        const data = await res.json()
        setNotifCount(data.total_notifikasi || 0)
        setNotifData({
          approval: data.approval || { total: 0, breakdown: [] },
          expired: data.expired || { total: 0, critical: 0, breakdown: [] },
          notifications: data.notifications || { total: 0, unread: 0, items: [] }
        })
      }
    } catch (err) { 
      console.error("Notif Error:", err) 
    }
  }

  async function handleNotifClick(item: any) {
    if (!item.read_at) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id })
        })
      } catch {}
    }
    
    setIsNotifOpen(false)
    router.push(item.url || '/dashboard')
    setTimeout(fetchNotif, 500)
  }

  async function handleMarkAllRead() {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      })
      fetchNotif()
    } catch {}
  }

  async function handleLogout() {
    try {
      const { clearAuthCache } = await import('@/app/lib/auth-cache')
      clearAuthCache()
      if (typeof window !== 'undefined') {
        localStorage.removeItem('btm_session_token_v1')
        localStorage.removeItem('btm_menus_v1')
        localStorage.removeItem('btm_menus_time_v1')
      }
    } catch {}

    try { 
      await fetch('/api/auth/logout', { method: 'POST' }) 
    } catch {}

    router.push('/')
  }

  const currentUser = userData || user
  const namaKaryawan = currentUser?.nama || currentUser?.name || 'KARYAWAN'
  const nrpKaryawan = currentUser?.nrp_login || currentUser?.nrp || '-'
  const siteKaryawan = currentUser?.site || '-'
  const userInitial = namaKaryawan.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-[#f4f7fa] flex flex-col antialiased text-slate-800">
      
      {/* HEADER MOBILE — COMPACT + ROUNDED */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] px-2.5 pt-1.5">
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,61,121,0.08)] rounded-2xl px-3 py-1.5 flex items-center justify-between">
          {/* Kiri: Logo + App Name */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-xl bg-[#003D79] flex items-center justify-center shadow-sm overflow-hidden">
              <Image src="/btm-fix.png" alt="BTM" width={18} height={18} className="object-contain" />
            </div>
            <div className="leading-none">
              <h1 className="text-[11px] font-black uppercase text-[#003D79] tracking-tight">BTM Mobile</h1>
              <p className="text-[8px] font-bold text-slate-400 mt-0.5">v1.7.0</p>
            </div>
          </div>

          {/* Kanan: User Info + Lonceng */}
          <div className="flex items-center gap-2">
            <div className="text-right leading-none shrink-0 max-w-[130px]">
              <div className="text-[10px] font-black text-[#003D79] uppercase truncate">{namaKaryawan}</div>
              <div className="text-[8px] text-slate-500 font-bold mt-0.5">NRP: {nrpKaryawan}</div>
              <div className="text-[8px] text-blue-600 font-black mt-0.5">{siteKaryawan}</div>
            </div>
            <button
              type="button"
              onClick={() => setIsNotifOpen(true)}
              className="relative w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-90 transition-all flex items-center justify-center shrink-0 border border-slate-200/80"
            >
              <span className="text-base leading-none">🔔</span>
              {notifCount > 0 && (
                <>
                  <span className="absolute -top-0.5 -right-0.5 animate-ping h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                  <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[7px] font-black h-3.5 w-3.5 flex items-center justify-center rounded-full border border-white shadow-md pointer-events-none">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP SIDEBAR & MAIN AREA */}
      <div className="flex flex-1">
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#e2e8f0] min-h-screen">
          <div className="h-14 flex items-center px-6 border-b border-[#e2e8f0] bg-[#003d79] text-white">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center font-black text-sm text-white">
                B
              </div>
              <span className="font-black tracking-tight text-base">BTM PORTAL</span>
            </Link>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Menu Utama
            </div>
            <Link
              href="/dashboard"
              className={[
                'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors',
                pathname === '/dashboard' ? 'bg-[#003d79] text-white' : 'text-slate-600 hover:bg-slate-100'
              ].join(' ')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </Link>

            {menus.map((item, idx) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.id || item.href || idx}
                  href={item.href || '#'}
                  className={[
                    'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                    isActive ? 'bg-[#003d79] text-white' : 'text-slate-600 hover:bg-slate-100'
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="text-sm">{item.icon || '📌'}</span>
                    <span className="truncate">{item.title}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-black bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          <div className="p-4 border-t border-[#e2e8f0] bg-slate-50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#003d79] text-white flex items-center justify-center font-bold text-xs">
                {userInitial}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 truncate">{namaKaryawan}</p>
                <p className="text-[10px] text-slate-500 truncate">{currentUser?.role || 'KARYAWAN'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors"
            >
              Keluar
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col pb-24 sm:pb-8 pt-[3.75rem] lg:pt-0">
          <div className="flex-1">
            {children}
          </div>
          <AppFooter />
        </main>
      </div>

      <MobileBottomNav menus={menus} userRole={currentUser?.role || 'KARYAWAN'} />

      <SyncIndicator />
      <ClockOutReminder />
      <VerificationModal />

      {/* MODAL NOTIFIKASI */}
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
            <div className="p-6 max-h-[70vh] overflow-y-auto bg-slate-50/50 space-y-4">
              {notifCount === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4 opacity-20">🏝️</div>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Semua Aman!</p>
                  <p className="text-slate-300 text-[10px] font-bold mt-2">Tidak ada notifikasi menunggu</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* KATEGORI 1: APPROVAL */}
                  {notifData.approval.total > 0 && (
                    <div className="bg-white border-2 border-blue-100 rounded-[2rem] overflow-hidden shadow-sm">
                      <div className="bg-blue-50 px-5 py-3 flex items-center justify-between border-b border-blue-100">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📝</span>
                          <span className="font-black text-[#003D79] text-xs uppercase tracking-widest">Persetujuan</span>
                        </div>
                        <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                          {notifData.approval.total}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {notifData.approval.breakdown.map((item: any, i: number) => (
                          <button
                            key={i}
                            onClick={() => {
                              setIsNotifOpen(false)
                              router.push(`/dashboard?menu=approval_center`)
                            }}
                            className="w-full px-5 py-3 flex items-center gap-3 hover:bg-blue-50/50 transition-all active:scale-95 text-left"
                          >
                            <div className="text-xl">{item.icon}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-slate-900 text-xs">
                                {item.count} {item.jenis.replace(/_/g, ' ')}
                              </p>
                              <p className="text-[10px] text-slate-500 font-bold">
                                dari {item.site} • Tahap {item.tahap}
                              </p>
                            </div>
                            <span className="text-slate-300 text-lg">›</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* KATEGORI 2: DOKUMEN EXPIRED */}
                  {notifData.expired.total > 0 && (
                    <div className={`bg-white border-2 rounded-[2rem] overflow-hidden shadow-sm ${
                      notifData.expired.critical > 0 ? 'border-rose-200' : 'border-amber-100'
                    }`}>
                      <div className={`px-5 py-3 flex items-center justify-between border-b ${
                        notifData.expired.critical > 0 ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{notifData.expired.critical > 0 ? '🚨' : '⚠️'}</span>
                          <span className={`font-black text-xs uppercase tracking-widest ${
                            notifData.expired.critical > 0 ? 'text-rose-700' : 'text-amber-700'
                          }`}>
                            Dokumen Expired
                          </span>
                          {notifData.expired.critical > 0 && (
                            <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase animate-pulse">
                              🔥 {notifData.expired.critical} Kritis
                            </span>
                          )}
                        </div>
                        <span className={`text-white text-[10px] font-black px-2.5 py-1 rounded-full ${
                          notifData.expired.critical > 0 ? 'bg-rose-500' : 'bg-amber-500'
                        }`}>
                          {notifData.expired.total}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {notifData.expired.breakdown.map((item: any, i: number) => (
                          <button
                            key={i}
                            onClick={() => {
                              setIsNotifOpen(false)
                              router.push(`/dashboard?menu=monitoring_expired`)
                            }}
                            className="w-full px-5 py-3 flex items-center gap-3 hover:bg-amber-50/50 transition-all active:scale-95 text-left"
                          >
                            <div className="text-xl">{item.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-black text-slate-900 text-xs">
                                  {item.count} {item.jenis}
                                </p>
                                {item.critical > 0 && (
                                  <span className="bg-rose-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase animate-pulse">
                                    🔥 {item.critical}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-bold">
                                Site: {item.site}
                              </p>
                            </div>
                            <span className="text-slate-300 text-lg">›</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* KATEGORI 3: MEETING & UMUM */}
                  {notifData.notifications.items.length > 0 && (
                    <div className="bg-white border-2 border-purple-100 rounded-[2rem] overflow-hidden shadow-sm">
                      <div className="bg-purple-50 px-5 py-3 flex items-center justify-between border-b border-purple-100">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📨</span>
                          <span className="font-black text-purple-700 text-xs uppercase tracking-widest">Meeting & Umum</span>
                          {notifData.notifications.unread > 0 && (
                            <span className="bg-purple-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase animate-pulse">
                              {notifData.notifications.unread} Baru
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {notifData.notifications.unread > 0 && (
                            <button
                              onClick={handleMarkAllRead}
                              className="text-[9px] text-purple-600 font-black uppercase hover:text-purple-800 hover:underline"
                            >
                              ✓ Baca Semua
                            </button>
                          )}
                          <span className="bg-purple-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                            {notifData.notifications.total}
                          </span>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
                        {notifData.notifications.items.map((item: any) => {
                          const isUnread = !item.read_at
                          const createdDate = new Date(item.created_at)
                          const now = new Date()
                          const diffMs = now.getTime() - createdDate.getTime()
                          const diffMin = Math.floor(diffMs / 60000)
                          const diffHr = Math.floor(diffMin / 60)
                          const diffDay = Math.floor(diffHr / 24)
                          
                          let timeAgo = 'baru saja'
                          if (diffDay > 0) timeAgo = `${diffDay}h lalu`
                          else if (diffHr > 0) timeAgo = `${diffHr}j lalu`
                          else if (diffMin > 0) timeAgo = `${diffMin}m lalu`
                          
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleNotifClick(item)}
                              className={`w-full px-5 py-3 flex items-start gap-3 hover:bg-purple-50/50 transition-all active:scale-95 text-left ${
                                isUnread ? 'bg-purple-50/30' : ''
                              }`}
                            >
                              <div className="text-xl shrink-0 mt-0.5">
                                {typeof item.icon === 'string' && item.icon.length <= 3 ? item.icon : '🔔'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className={`text-xs truncate ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>
                                    {item.title}
                                  </p>
                                  {isUnread && (
                                    <span className="w-2 h-2 bg-purple-500 rounded-full shrink-0 animate-pulse" />
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium line-clamp-2">
                                  {item.body}
                                </p>
                                <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                                  {timeAgo} • {item.category}
                                </p>
                              </div>
                              <span className="text-slate-300 text-lg shrink-0">›</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}