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

// ─── MASTER DEFAULT MENUS (Guaranteed Fallback Sub-menus) ───
const FALLBACK_MENUS: Record<string, MenuItem[]> = {
  absensi: [
    { title: 'Dashboard Utama', href: '/dashboard', icon: '🏠' },
    { title: 'Form Koreksi Absensi', href: '/dashboard/koreksi-absensi', icon: '📝' },
    { title: 'Approval Koreksi (Leader)', href: '/dashboard/approval-koreksi', icon: '✅', badge: 'Leader' },
    { title: 'Crew On Duty', href: '/dashboard/crew-on-duty', icon: '👥' },
    { title: 'Manajemen Absensi Matrix', href: '/dashboard/manajemen-absensi', icon: '📊', badge: 'HR' },
    { title: 'Rekapitulasi Absensi', href: '/dashboard/rekap-absensi', icon: '📈' },
    { title: 'HR Override Absensi', href: '/dashboard/hr-override-absensi', icon: '🛠️', badge: 'HR' }
  ],
  pengajuan: [
    { title: 'Dashboard & Monitoring Cuti', href: '/dashboard/dashboard-cuti', icon: '🌴' },
    { title: 'Form Pengajuan Koreksi Jam', href: '/dashboard/koreksi-absensi', icon: '📝' }
  ],
  saya: [
    { title: 'Riwayat MCU Saya', href: '/dashboard/mcu-saya', icon: '🏥' },
    { title: 'Status & Ukuran APD Saya', href: '/dashboard/apd-saya', icon: '🦺' }
  ],
  more: [
    { title: 'HR Portal Dashboard', href: '/dashboard/hr-dashboard', icon: '🏢', badge: 'HR' },
    { title: 'Kelola Hak Akses & Role', href: '/dashboard/kelola-akses', icon: '🔑', badge: 'Admin' },
    { title: 'Portal Rekrutmen Karyawan', href: '/dashboard/rekrutmen', icon: '💼', badge: 'HR' },
    { title: 'Kelola Event & Meeting MoM', href: '/dashboard/kelola-event', icon: '🎫' },
    { title: 'Plant & Operations Dashboard', href: '/dashboard/plant', icon: '🚜' },
    { title: 'Form Inspeksi P2H Unit', href: '/dashboard/plant/inspeksi', icon: '🔧' },
    { title: 'Plant Logistik & Part PR', href: '/dashboard/plant/logistik', icon: '📦' },
    { title: 'Logistik Pusat & PO', href: '/dashboard/logistik', icon: '🚚' },
    { title: 'Kelola Master Unit', href: '/dashboard/kelola-unit', icon: '🚜' },
    { title: 'Setting Assignment Unit', href: '/dashboard/setting-unit', icon: '⚙️' },
    { title: 'Kelola APD & Stok', href: '/dashboard/kelola-apd', icon: '🦺' },
    { title: 'Monitoring APD Karyawan', href: '/dashboard/monitoring-apd', icon: '🥾' },
    { title: 'Monitoring MCU Tahunan', href: '/dashboard/monitoring-mcu', icon: '🩺' },
    { title: 'Import MCU Massal', href: '/dashboard/import-mcu', icon: '📥' },
    { title: 'Import Roster Bulanan', href: '/dashboard/import-roster', icon: '📅' }
  ]
}

export default function MobileBottomNav({ menus = [], userRole = 'KARYAWAN' }: MobileBottomNavProps) {
  const rawPathname = usePathname()
  const pathname = rawPathname || ''
  const [activeSheet, setActiveSheet] = useState<string | null>(null)

  const getSubMenus = (tabKey: string): MenuItem[] => {
    const defaultItems = FALLBACK_MENUS[tabKey] || []
    if (!Array.isArray(menus) || menus.length === 0) return defaultItems

    let apiMatched: MenuItem[] = []
    if (tabKey === 'absensi') {
      apiMatched = menus.filter(m => 
        m.href.includes('/absensi') || 
        m.href.includes('/koreksi-absensi') || 
        m.href.includes('/approval-koreksi') ||
        m.href.includes('/crew-on-duty') ||
        m.href.includes('/manajemen-absensi') ||
        m.href.includes('/rekap-absensi') ||
        m.href.includes('/hr-override-absensi') ||
        (m.title && m.title.toLowerCase().includes('absen'))
      )
    } else if (tabKey === 'pengajuan') {
      apiMatched = menus.filter(m => 
        m.href.includes('/cuti') || 
        m.href.includes('/dashboard-cuti') || 
        m.href.includes('/koreksi-absensi') || 
        m.href.includes('/lembur') ||
        (m.title && m.title.toLowerCase().includes('cuti'))
      )
    } else if (tabKey === 'saya') {
      apiMatched = menus.filter(m => 
        m.href.includes('/mcu-saya') || 
        m.href.includes('/apd-saya') || 
        m.href.includes('/profil') ||
        (m.title && m.title.toLowerCase().includes('saya'))
      )
    } else if (tabKey === 'more') {
      const otherHrefs = new Set(
        [...getSubMenus('absensi'), ...getSubMenus('pengajuan'), ...getSubMenus('saya')].map(m => m.href)
      )
      apiMatched = menus.filter(m => !otherHrefs.has(m.href) && !m.href.includes('/scan-qr'))
    }

    return apiMatched.length > 0 ? apiMatched : defaultItems
  }

  const closeSheet = () => setActiveSheet(null)
  const activeSheetItems = activeSheet ? getSubMenus(activeSheet) : []

  const getSheetTitle = (key: string | null) => {
    switch(key) {
      case 'absensi': return '📋 Menu Absensi & Kehadiran'
      case 'pengajuan': return '📝 Menu Pengajuan & Permohonan'
      case 'saya': return '👤 Personal & Saya'
      case 'more': return '⚡ Menu & Operasional Lainnya'
      default: return 'Menu'
    }
  }

  return (
    <>
      {/* ─── BOTTOM SHEET DRAWER OVERLAY ─── */}
      {activeSheet && (
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end sm:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/70"
            onClick={closeSheet}
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)' }}
          />

          {/* Drawer Content */}
          <div className="relative bg-white rounded-t-[24px] shadow-2xl border-t border-slate-200 p-4 max-h-[80vh] flex flex-col z-[10000] w-full">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 shrink-0" />
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3 shrink-0">
              <h3 className="text-xs font-black text-[#003d79] uppercase tracking-wider">
                {getSheetTitle(activeSheet)}
              </h3>
              <button 
                type="button"
                onClick={closeSheet}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center text-sm font-bold active:scale-95 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 max-h-[60vh] pr-1 flex-1">
              {activeSheetItems.map((item, idx) => {
                const isCurrent = pathname === item.href
                return (
                  <Link
                    key={item.id || item.href || idx}
                    href={item.href || '#'}
                    onClick={closeSheet}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all text-xs font-semibold ${
                      isCurrent 
                        ? 'bg-[#003d79] text-white font-bold shadow-md' 
                        : 'bg-[#f4f7fa] text-slate-800 hover:bg-blue-50 hover:text-[#003d79] border border-slate-200/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${
                        isCurrent ? 'bg-white/20 text-white' : 'bg-white text-[#003d79] border border-slate-200 shadow-xs'
                      }`}>
                        {item.icon || '📌'}
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
              })}
            </div>

            <button
              type="button"
              onClick={closeSheet}
              className="mt-3 w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold shrink-0 transition-colors"
            >
              Tutup Menu
            </button>
          </div>
        </div>
      )}

      {/* ─── FIXED BOTTOM NAV BAR ─── */}
      <nav 
        className="fixed bottom-0 inset-x-0 z-[999] bg-white border-t border-slate-200 sm:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.1)]"
        style={{ height: '62px' }}
      >
        <div className="flex items-center justify-around h-full px-1 relative">
          
          {/* TAB 1: ABSENSI */}
          <button
            type="button"
            onClick={() => setActiveSheet(activeSheet === 'absensi' ? null : 'absensi')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
              activeSheet === 'absensi' || (pathname && (pathname.includes('/absensi') || pathname.includes('/crew-on-duty')))
                ? 'text-[#003d79] font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg 
              width="22" 
              height="22" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="shrink-0 mb-0.5"
              style={{ width: '22px', height: '22px', minWidth: '22px', minHeight: '22px' }}
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span className="text-[11px] leading-none font-semibold mt-0.5">Absensi</span>
          </button>

          {/* TAB 2: PENGAJUAN */}
          <button
            type="button"
            onClick={() => setActiveSheet(activeSheet === 'pengajuan' ? null : 'pengajuan')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
              activeSheet === 'pengajuan' || (pathname && (pathname.includes('/cuti') || pathname.includes('/koreksi')))
                ? 'text-[#003d79] font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg 
              width="22" 
              height="22" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="shrink-0 mb-0.5"
              style={{ width: '22px', height: '22px', minWidth: '22px', minHeight: '22px' }}
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span className="text-[11px] leading-none font-semibold mt-0.5">Pengajuan</span>
          </button>

          {/* TAB 3 (CENTER FLOATING FAB): SCAN QR */}
          <div className="flex-1 flex justify-center items-center -mt-6 shrink-0">
            <Link
              href="/dashboard/scan-qr"
              className="rounded-full bg-[#003d79] text-white flex items-center justify-center shadow-lg shadow-[#003d79]/40 border-4 border-white active:scale-95 transition-transform shrink-0"
              style={{ width: '54px', height: '54px', minWidth: '54px', minHeight: '54px' }}
              title="Scan QR"
            >
              <svg 
                width="26" 
                height="26" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white" 
                strokeWidth="2.4" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="shrink-0 text-white"
                style={{ width: '26px', height: '26px', minWidth: '26px', minHeight: '26px' }}
              >
                <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                <rect x="7" y="7" width="10" height="10" rx="1"></rect>
              </svg>
            </Link>
          </div>

          {/* TAB 4: SAYA */}
          <button
            type="button"
            onClick={() => setActiveSheet(activeSheet === 'saya' ? null : 'saya')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
              activeSheet === 'saya' || (pathname && (pathname.includes('/mcu-saya') || pathname.includes('/apd-saya')))
                ? 'text-[#003d79] font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg 
              width="22" 
              height="22" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="shrink-0 mb-0.5"
              style={{ width: '22px', height: '22px', minWidth: '22px', minHeight: '22px' }}
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span className="text-[11px] leading-none font-semibold mt-0.5">Saya</span>
          </button>

          {/* TAB 5: MORE */}
          <button
            type="button"
            onClick={() => setActiveSheet(activeSheet === 'more' ? null : 'more')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
              activeSheet === 'more' || (pathname && (pathname.includes('/plant') || pathname.includes('/logistik') || pathname.includes('/kelola')))
                ? 'text-[#003d79] font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg 
              width="22" 
              height="22" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="shrink-0 mb-0.5"
              style={{ width: '22px', height: '22px', minWidth: '22px', minHeight: '22px' }}
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            <span className="text-[11px] leading-none font-semibold mt-0.5">More</span>
          </button>

        </div>
      </nav>
    </>
  )
}
