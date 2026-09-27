'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface MenuItem {
  id?: string
  title: string
  href: string
  icon?: string
  badge?: string
  category?: string
  role_access?: string[]
}

interface MobileBottomNavProps {
  menus?: MenuItem[]
  userRole?: string
  onScanClick?: () => void
}

export default function MobileBottomNav({ menus = [], userRole = 'KARYAWAN' }: MobileBottomNavProps) {
  const rawPathname = usePathname()
  const pathname = rawPathname || ''
  const [activeSheet, setActiveSheet] = useState<string | null>(null)

  const safeMenus = Array.isArray(menus) 
    ? menus.filter(m => m && typeof m.href === 'string' && typeof m.title === 'string')
    : []

  const getSubMenus = (tabKey: string): MenuItem[] => {
    if (safeMenus.length === 0) return []

    if (tabKey === 'absensi') {
      return safeMenus.filter(m => 
        m.href.includes('/absensi') || 
        m.href.includes('/koreksi-absensi') || 
        m.href.includes('/approval-koreksi') ||
        m.href.includes('/crew-on-duty') ||
        m.href.includes('/manajemen-absensi') ||
        m.href.includes('/rekap-absensi') ||
        m.href.includes('/hr-override-absensi') ||
        (m.title && m.title.toLowerCase().includes('absen')) ||
        (m.title && m.title.toLowerCase().includes('duty'))
      )
    }

    if (tabKey === 'pengajuan') {
      return safeMenus.filter(m => 
        m.href.includes('/cuti') || 
        m.href.includes('/dashboard-cuti') || 
        m.href.includes('/koreksi-absensi') || 
        m.href.includes('/lembur') || 
        m.href.includes('/pengajuan') ||
        (m.title && m.title.toLowerCase().includes('cuti')) ||
        (m.title && m.title.toLowerCase().includes('koreksi')) ||
        (m.title && m.title.toLowerCase().includes('izin'))
      )
    }

    if (tabKey === 'saya') {
      return safeMenus.filter(m => 
        m.href.includes('/mcu-saya') || 
        m.href.includes('/apd-saya') || 
        m.href.includes('/profil') || 
        m.href.includes('/slip-gaji') ||
        (m.title && m.title.toLowerCase().includes('saya')) ||
        (m.title && m.title.toLowerCase().includes('profil'))
      )
    }

    if (tabKey === 'more') {
      const specificHrefs = new Set(
        [...getSubMenus('absensi'), ...getSubMenus('pengajuan'), ...getSubMenus('saya')].map(m => m.href)
      )
      return safeMenus.filter(m => !specificHrefs.has(m.href) && !m.href.includes('/scan-qr'))
    }

    return []
  }

  const closeSheet = () => setActiveSheet(null)
  const activeSheetItems = activeSheet ? getSubMenus(activeSheet) : []

  const getSheetTitle = (key: string | null) => {
    switch(key) {
      case 'absensi': return 'Menu Absensi & Kehadiran'
      case 'pengajuan': return 'Menu Pengajuan & Permohonan'
      case 'saya': return 'Personal & Saya'
      case 'more': return 'Menu & Operasional Lainnya'
      default: return 'Menu'
    }
  }

  return (
    <>
      {/* ─── BOTTOM SHEET DRAWER OVERLAY ─── */}
      {activeSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={closeSheet}
          />
          <div className="relative bg-white rounded-t-[22px] shadow-2xl border-t border-[#e2e8f0] p-4 max-h-[75vh] flex flex-col z-10 animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between pb-2.5 border-b border-[#e2e8f0] mb-3">
              <h3 className="text-xs font-black text-[#003d79] uppercase tracking-wider">
                {getSheetTitle(activeSheet)}
              </h3>
              <button 
                type="button"
                onClick={closeSheet}
                className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto space-y-1.5 max-h-[50vh] pr-0.5">
              {activeSheetItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Tidak ada sub-menu tersedia untuk role Anda.
                </div>
              ) : (
                activeSheetItems.map((item, idx) => {
                  const isCurrent = pathname === item.href
                  return (
                    <Link
                      key={item.id || item.href || idx}
                      href={item.href || '#'}
                      onClick={closeSheet}
                      className={[
                        'flex items-center justify-between p-2.5 rounded-xl transition-all text-xs',
                        isCurrent 
                          ? 'bg-[#003d79] text-white font-bold shadow-xs' 
                          : 'bg-[#f4f7fa] text-slate-700 hover:bg-blue-50 hover:text-[#003d79] font-medium'
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={[
                          'w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0',
                          isCurrent ? 'bg-white/20 text-white' : 'bg-white text-[#003d79] border border-slate-200'
                        ].join(' ')}>
                          {item.icon ? (
                            <span>{item.icon}</span>
                          ) : (
                            <svg className="w-3.5 h-3.5 fill-none stroke-currentColor stroke-[2]" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          )}
                        </div>
                        <div className="truncate tracking-tight">
                          {item.title}
                        </div>
                      </div>
                      {item.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-900 ml-2 shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })
              )}
            </div>
            <button
              type="button"
              onClick={closeSheet}
              className="mt-3 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ─── FIXED BOTTOM NAV BAR ─── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e2e8f0] sm:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around h-[56px] px-1 relative">
          {/* TAB 1: ABSENSI */}
          <button
            type="button"
            onClick={() => setActiveSheet(activeSheet === 'absensi' ? null : 'absensi')}
            className={[
              'flex flex-col items-center justify-center flex-1 py-1 transition-colors',
              activeSheet === 'absensi' || (pathname && (pathname.includes('/absensi') || pathname.includes('/crew-on-duty')))
                ? 'text-[#003d79] font-bold'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            ].join(' ')}
          >
            <div className={['p-0.5 rounded-lg transition-transform', activeSheet === 'absensi' ? 'scale-110' : ''].join(' ')}>
              <svg className="w-5 h-5 fill-none stroke-currentColor stroke-[2]" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-[10px] leading-tight">Absensi</span>
          </button>

          {/* TAB 2: PENGAJUAN */}
          <button
            type="button"
            onClick={() => setActiveSheet(activeSheet === 'pengajuan' ? null : 'pengajuan')}
            className={[
              'flex flex-col items-center justify-center flex-1 py-1 transition-colors',
              activeSheet === 'pengajuan' || (pathname && (pathname.includes('/cuti') || pathname.includes('/koreksi')))
                ? 'text-[#003d79] font-bold'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            ].join(' ')}
          >
            <div className={['p-0.5 rounded-lg transition-transform', activeSheet === 'pengajuan' ? 'scale-110' : ''].join(' ')}>
              <svg className="w-5 h-5 fill-none stroke-currentColor stroke-[2]" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-[10px] leading-tight">Pengajuan</span>
          </button>

          {/* TAB 3 (CENTER FLOATING FAB): SCAN QR */}
          <div className="flex-1 flex justify-center -mt-5">
            <Link
              href="/dashboard/scan-qr"
              className="w-12 h-12 rounded-full bg-[#003d79] text-white flex flex-col items-center justify-center shadow-lg shadow-[#003d79]/30 border-3 border-white active:scale-95 transition-transform"
            >
              <svg className="w-5 h-5 fill-none stroke-currentColor stroke-[2.2]" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </Link>
          </div>

          {/* TAB 4: SAYA */}
          <button
            type="button"
            onClick={() => setActiveSheet(activeSheet === 'saya' ? null : 'saya')}
            className={[
              'flex flex-col items-center justify-center flex-1 py-1 transition-colors',
              activeSheet === 'saya' || (pathname && (pathname.includes('/mcu-saya') || pathname.includes('/apd-saya')))
                ? 'text-[#003d79] font-bold'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            ].join(' ')}
          >
            <div className={['p-0.5 rounded-lg transition-transform', activeSheet === 'saya' ? 'scale-110' : ''].join(' ')}>
              <svg className="w-5 h-5 fill-none stroke-currentColor stroke-[2]" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-[10px] leading-tight">Saya</span>
          </button>

          {/* TAB 5: MORE */}
          <button
            type="button"
            onClick={() => setActiveSheet(activeSheet === 'more' ? null : 'more')}
            className={[
              'flex flex-col items-center justify-center flex-1 py-1 transition-colors',
              activeSheet === 'more' || (pathname && (pathname.includes('/plant') || pathname.includes('/logistik') || pathname.includes('/kelola')))
                ? 'text-[#003d79] font-bold'
                : 'text-slate-400 hover:text-slate-600 font-medium'
            ].join(' ')}
          >
            <div className={['p-0.5 rounded-lg transition-transform', activeSheet === 'more' ? 'scale-110' : ''].join(' ')}>
              <svg className="w-5 h-5 fill-none stroke-currentColor stroke-[2]" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
            <span className="text-[10px] leading-tight">More</span>
          </button>
        </div>
      </nav>
    </>
  )
}