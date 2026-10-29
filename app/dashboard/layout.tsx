'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import MobileBottomNav from '@/app/components/MobileBottomNav'
import SyncIndicator from '@/app/dashboard/components/SyncIndicator'
import ClockOutReminder from '@/app/dashboard/components/ClockOutReminder'
import VerificationModal from '@/app/dashboard/components/VerificationModal'
import AppFooter from '@/app/components/AppFooter'
import MenuTabs from '@/app/components/MenuTabs'
import { AuthProvider } from '@/app/lib/AuthContext'

import { BTM_APP_NAME, BTM_APP_SHORT } from '@/app/lib/design-system'
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const rawPathname = usePathname()
  const pathname = rawPathname || ''
  const router = useRouter()
  const searchParams = useSearchParams()
  const [menus, setMenus] = useState<any[]>([])
  const [loadingMenus, setLoadingMenus] = useState<boolean>(true)

  // ═══════════════════════════════════════════════
  // ✨ STATE & FETCH DATA USER REAL (CACHE + API)
  // ═══════════════════════════════════════════════
  const [userData, setUserData] = useState<any>(null)
  const [rolesSaya, setRolesSaya] = useState<string[]>([])

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
            setUserData({ ...data.user, is_super_admin: data.is_super_admin ?? data.user.is_super_admin })
          }
          if (Array.isArray(data?.roles)) setRolesSaya(data.roles)
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

  const rapikanJudul = (g) => {
    const t = String(g || '').trim()
    if (!t) return 'Lainnya'
    if (t === t.toUpperCase() || t === t.toLowerCase()) {
      return t.toLowerCase().split(' ')
        .map((w) => (w.length > 3 ? w.charAt(0).toUpperCase() + w.slice(1) : w.toUpperCase()))
        .join(' ')
    }
    return t
  }
  // ─────────────────────────────────────────────────────────
  // JARING PENGAMAN MENU SHE / PUNISHMENT
  // Kalau baris menu di tabel `menus` belum ada (mis. SQL belum jalan),
  // menu tetap ditampilkan untuk role yang berhak.
  // Hapus blok ini kalau data menu di database sudah lengkap.
  // ─────────────────────────────────────────────────────────
  const menusLengkap = (() => {
    const ROLE_BOLEH = [
      'super_admin', 'admin', 'admin_plant', 'admin_site',
      'gl_produksi', 'gl_plant', 'atasan',
      'she_site', 'spv_she_ho',
      'hr_site', 'hrga_site', 'hr_ho', 'hrga', 'hrga_pusat', 'hrga_oprek',
      'pjo_site', 'pjo', 'manager_ops', 'director_ops',
    ]
    const boleh =
      userData?.is_super_admin === true ||
      rolesSaya.some((r) => ROLE_BOLEH.includes(String(r).toLowerCase()))
    if (!boleh) return menus

    const TAMBAHAN = [
      { menu_key: 'inspeksi',   menu_label: 'Inspeksi',   menu_icon: '🦺', menu_group: 'SHE', sort_order: 300, href: '/dashboard?menu=inspeksi' },
      { menu_key: 'observasi',  menu_label: 'Observasi',  menu_icon: '👁️', menu_group: 'SHE', sort_order: 301, href: '/dashboard?menu=observasi' },
      { menu_key: 'punishment', menu_label: 'Punishment', menu_icon: '⚠️', menu_group: 'HR',  sort_order: 302, href: '/dashboard?menu=punishment' },
    ]
    const ada = new Set((menus || []).map((m: any) => m?.menu_key))
    const kurang = TAMBAHAN.filter((m) => !ada.has(m.menu_key))
    if (!kurang.length) return menus
    return [...(menus || []), ...kurang]
  })()

  const grupSidebar = (() => {
    const peta = new Map()
    ;(menusLengkap || []).forEach((m) => {
      if (!m || !m.menu_key) return
      if (m.parent_menu_key) return
      if (m.menu_key === 'kelola_karyawan') return
      if (String(m.nav_tab || '').toLowerCase() === 'hidden') return
      const grup = String(m.menu_group || 'Lainnya')
      const k = grup.trim().toLowerCase()
      if (!peta.has(k)) peta.set(k, { judul: rapikanJudul(grup), urut: Number(m.sort_order) || 0, items: [] })
      const g = peta.get(k)
      g.urut = Math.min(g.urut, Number(m.sort_order) || 0)
      if (!g.items.some((x) => x.menu_key === m.menu_key)) g.items.push(m)
    })
    return Array.from(peta.values())
      .map((g) => ({ ...g, items: g.items.sort((x, y) => (Number(x.sort_order)||0) - (Number(y.sort_order)||0)) }))
      .filter((g) => g.items.length > 0)
      .sort((x, y) => x.urut - y.urut || x.judul.localeCompare(y.judul))
  })()

  const itemAktif = (item: any) => {
    const href = item.href || '/dashboard?menu=' + item.menu_key
    const cur = searchParams ? searchParams.get('menu') : null
    const im = href.includes('menu=') ? href.split('menu=')[1]?.split('&')[0] : null
    return im ? cur === im : pathname === href && !cur
  }
  const [grupBuka, setGrupBuka] = useState<string>('')
  useEffect(() => {
    const g = grupSidebar.find((gr: any) => gr.items.some((it: any) => itemAktif(it)))
    if (g) setGrupBuka((b) => b || g.judul)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams, menus])

  // ═══════════════════════════════════════════════
  // 🔙 TOMBOL BACK GLOBAL
  // Berlaku otomatis untuk semua halaman di bawah /dashboard.
  // Aturan:
  //  - /dashboard tanpa ?menu=  → halaman utama, tombol TIDAK muncul
  //  - /dashboard?menu=xxx      → kembali ke /dashboard (halaman utama)
  //  - /dashboard/plant/inspeksi→ naik satu level ke /dashboard/plant
  //  - /dashboard/plant         → kembali ke /dashboard
  // ═══════════════════════════════════════════════
  const menuParam = searchParams ? searchParams.get('menu') : null
  const isDashboardHome = pathname === '/dashboard' && !menuParam
  const showBack = !isDashboardHome

  const backTarget = (() => {
    if (pathname === '/dashboard') return '/dashboard'
    const seg = pathname.split('/').filter(Boolean)
    if (seg.length <= 1) return '/dashboard'
    seg.pop()
    return '/' + seg.join('/')
  })()

  function goBack() {
    router.push(backTarget)
  }

  return (
    <AuthProvider
      user={currentUser}
      permissions={currentUser?.permissions || []}
    >
    <div className="h-auto bg-[#f4f7fa] flex flex-col antialiased text-slate-800">
      
      {/* HEADER MOBILE — COMPACT + ROUNDED */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[60] px-2.5 pt-1.5">
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,61,121,0.08)] rounded-2xl px-3 py-1.5 flex items-center justify-start">
          {/* 🔙 Tombol Back — otomatis hilang di halaman utama */}
          {showBack && (
            <button
              type="button"
              onClick={goBack}
              aria-label="Kembali"
              title="Kembali"
              className="w-8 h-8 rounded-xl bg-[#003D79] hover:bg-[#002a57] active:scale-90 transition-all flex items-center justify-center shrink-0 mr-2 shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Kiri: Logo + App Name */}
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-white ring-1 ring-slate-200 flex items-center justify-center shadow-sm overflow-hidden">
              <Image src="/btm-fix.png" alt="BTM" width={18} height={18} className="object-contain" />
            </div>
            <div className="leading-none">
              <h1 className="text-[11px] font-black uppercase text-[#003D79] tracking-tight whitespace-nowrap">{BTM_APP_SHORT}</h1>
              <p className="text-[8px] font-bold text-slate-400 mt-0.5">v1.7.0</p>
            </div>
          </div>

          {/* Kanan: User Info + Lonceng */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-end pl-2">
            <div className="text-right leading-tight min-w-0">
              <div className="text-[11px] font-black text-[#003D79] uppercase truncate">
                {namaKaryawan}
              </div>
              <div className="text-[9px] font-bold text-slate-400 truncate">
                {nrpKaryawan}
                {siteKaryawan ? <span className="text-blue-600"> &middot; {siteKaryawan}</span> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsNotifOpen(true)}
              aria-label="Notifikasi"
              className="relative w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-90 transition-all flex items-center justify-center shrink-0 border border-slate-200/80"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#003D79" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-red-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white shadow pointer-events-none">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP SIDEBAR & MAIN AREA */}
      <div className="flex flex-1">
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[#e2e8f0] h-auto shrink-0 sticky top-0 h-screen">
          <div className="h-16 flex items-center px-5 border-b border-[#002a57] bg-gradient-to-br from-[#00468c] via-[#003D79] to-[#002a57] text-white shadow-[0_2px_10px_rgba(0,42,87,0.35)]">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow overflow-hidden shrink-0">
                <Image src="/btm-fix.png" alt="BTM" width={26} height={26} className="object-contain" />
              </div>
              <div className="leading-none">
                <div className="font-black tracking-tight text-[15px]">{BTM_APP_SHORT}</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-[8px] font-black tracking-widest bg-white/15 border border-white/25 rounded-full px-1.5 py-0.5">v1.7.0</span>
                  <span className="text-[8px] font-bold tracking-widest text-blue-200">PORTAL INTERNAL</span>
                </div>
              </div>
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

            {grupSidebar.map((grup) => {
              const buka = grupBuka === grup.judul
              return (
              <div key={grup.judul} className="pt-2">
                <button
                  type="button"
                  onClick={() => setGrupBuka(buka ? '' : grup.judul)}
                  className={[
                    'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl transition-colors',
                    buka ? 'bg-slate-100 text-[#003d79]' : 'text-slate-600 hover:bg-slate-100',
                  ].join(' ')}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">{grup.judul}</span>
                  <svg className={'w-3 h-3 shrink-0 transition-transform ' + (buka ? 'rotate-90' : '')}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {buka && <div className="mt-1 space-y-0.5 pl-1">
                {grup.items.map((item) => {
                  const label = String(item.menu_label || item.menu_key).replace(/^[^A-Za-z0-9(]+/, '')
                  const href = item.href || '/dashboard?menu=' + item.menu_key
                  const cur = searchParams ? searchParams.get('menu') : null
                  const im = href.includes('menu=') ? href.split('menu=')[1]?.split('&')[0] : null
                  const isActive = im ? cur === im : pathname === href && !cur
                  return (
                    <Link
                      key={item.menu_key}
                      href={href}
                      className={[
                        'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors',
                        isActive ? 'bg-[#003d79] text-white' : 'text-slate-600 hover:bg-slate-100',
                      ].join(' ')}
                    >
                      <span className="text-sm leading-none">{item.menu_icon || '\u25A2'}</span>
                      <span className="truncate">{label}</span>
                    </Link>
                  )
                })}
                </div>}
              </div>
              )
            })}
          </div>

          <div className="p-3 border-t border-[#e2e8f0]">
            <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-b from-white to-slate-50 shadow-[0_4px_14px_rgba(0,61,121,0.08)] p-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00468c] to-[#002a57] text-white flex items-center justify-center font-black text-sm shadow shrink-0">
                  {userInitial}
                </div>
                <div className="truncate min-w-0">
                  <p className="text-xs font-black text-slate-800 truncate">{namaKaryawan}</p>
                  <p className="text-[10px] font-bold text-slate-500 truncate">
                    {nrpKaryawan}
                    {siteKaryawan ? <span className="text-blue-600"> &middot; {siteKaryawan}</span> : null}
                  </p>
                  <span className="inline-block mt-1 text-[8px] font-black tracking-widest uppercase text-[#003D79] bg-[#e0edf9] border border-blue-200 rounded-full px-1.5 py-0.5">
                    {currentUser?.role || 'KARYAWAN'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
                Keluar Aplikasi
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col h-auto pt-[3.75rem] lg:pt-0 pb-24 lg:pb-8">
          {/* HEADER DESKTOP ONLY */}
          <header className="hidden lg:flex w-full items-center justify-between gap-4 h-16 px-8 bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
            <div className="min-w-0 flex-1 flex items-center gap-3">
              {/* 🔙 Tombol Back — otomatis hilang di halaman utama */}
              {showBack && (
                <button
                  type="button"
                  onClick={goBack}
                  aria-label="Kembali"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#e8f0f8] hover:bg-[#d6e4f2] text-[#003D79] font-bold text-xs transition-all active:scale-95 border border-[#003D79]/10 shrink-0"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5" />
                    <path d="M12 19l-7-7 7-7" />
                  </svg>
                  Kembali
                </button>
              )}
              <div className="min-w-0">
                <h1 className="text-base font-black text-[#003D79] tracking-tight truncate">{BTM_APP_NAME}</h1>
                <p className="text-[11px] text-slate-500 font-medium">Selamat datang, <strong className="text-slate-800">{namaKaryawan}</strong> ({nrpKaryawan}) — <span className="text-blue-600 font-bold">{siteKaryawan}</span></p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 shrink-0 ml-auto">
              <div className="text-right leading-tight">
                <div className="text-[12px] font-black text-[#003D79] uppercase">{namaKaryawan}</div>
                <div className="text-[10px] font-bold text-slate-400">
                  {nrpKaryawan}{siteKaryawan ? <span className="text-blue-600"> &middot; {siteKaryawan}</span> : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNotifOpen(true)}
                className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all active:scale-95 border border-slate-200"
              >
                <span>🔔 Notifikasi</span>
                {notifCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {notifCount}
                  </span>
                )}
              </button>
            </div>
          </header>

          <div className="px-3 pt-2 pb-24 lg:px-8 lg:pt-6 lg:pb-10 max-w-lg md:max-w-3xl lg:max-w-none w-full mx-auto">
            {pathname !== '/dashboard/hr-dashboard' && (
              <Suspense fallback={null}><MenuTabs menus={menus} /></Suspense>
            )}
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
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[1000] overflow-hidden lg:top-20 lg:right-6 lg:left-auto lg:translate-x-0 lg:translate-y-0 lg:w-[400px] lg:max-w-none lg:rounded-2xl">
            <div className="p-8 lg:p-4 bg-[#003D79] text-white flex justify-start items-center">
              <div>
                <h3 className="font-black text-xl lg:text-sm tracking-tight uppercase">Pusat Notifikasi</h3>
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-[0.2em]">Update Real-time</p>
              </div>
              <button onClick={() => setIsNotifOpen(false)} className="bg-white/10 hover:bg-white/20 h-10 w-10 lg:h-8 lg:w-8 flex items-center justify-center rounded-full transition-colors">✕</button>
            </div>
            <div className="p-6 lg:p-3 max-h-[70vh] overflow-y-auto bg-slate-50/50 space-y-4 lg:space-y-2">
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
                      <div className="bg-blue-50 px-5 py-3 flex items-center justify-start border-b border-blue-100">
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
                      <div className={`px-5 py-3 flex items-center justify-start border-b ${
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
                      <div className="bg-purple-50 px-5 py-3 flex items-center justify-start border-b border-purple-100">
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
    </AuthProvider>
  )
}