'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import MobileBottomNav from '@/app/components/MobileBottomNav'
import SyncIndicator from '@/app/dashboard/components/SyncIndicator'
import ClockOutReminder from '@/app/dashboard/components/ClockOutReminder'
import VerificationModal from '@/app/dashboard/components/VerificationModal'
import AppFooter from '@/app/components/AppFooter'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const rawPathname = usePathname()
  const pathname = rawPathname || ''
  const router = useRouter()
  const [menus, setMenus] = useState<any[]>([])
  const [loadingMenus, setLoadingMenus] = useState<boolean>(true)

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

  const userInitial = user?.nama ? user.nama.charAt(0).toUpperCase() : 'U'
  const firstName = user?.nama ? user.nama.split(' ')[0] : 'User'

  return (
    <div className="min-h-screen bg-[#f4f7fa] flex flex-col antialiased text-slate-800">
      {/* ─── HEADER BIRU ASLI 100% (TIDAK DIBUAT ULTRA COMPACT) ─── */}
      <header className="sticky top-0 z-30 bg-[#003d79] text-white border-b border-[#002a57] shadow-xs sm:hidden">
        <div className="flex items-center justify-between h-11 px-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center font-black text-xs text-white border border-white/20">
              B
            </div>
            <span className="font-black tracking-tight text-xs text-white uppercase">
              BTM Portal
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <SyncIndicator />
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/20">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                {userInitial}
              </div>
              <span className="text-[11px] font-medium text-white/90 max-w-[75px] truncate">
                {firstName}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── DESKTOP SIDEBAR & MAIN AREA ─── */}
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
                <p className="text-xs font-bold text-slate-800 truncate">{user?.nama || 'User'}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.role || 'KARYAWAN'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout && logout()}
              className="w-full py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors"
            >
              Keluar
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col pb-20 sm:pb-0">
          <div className="flex-1">
            {children}
          </div>
          <AppFooter />
        </main>
      </div>

      {/* ─── FIXED 5-TAB BOTTOM NAV (DRAWER GRID) ─── */}
      <MobileBottomNav menus={menus} userRole={user?.role || 'KARYAWAN'} />

      <ClockOutReminder />
      <VerificationModal />
    </div>
  )
}
