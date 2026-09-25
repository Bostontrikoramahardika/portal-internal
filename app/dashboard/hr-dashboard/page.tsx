'use client';

import PageHeader from "@/app/components/PageHeader";
// ═══════════════════════════════════════════════════════════════
// HR DASHBOARD v4.1 - Full Featured (CLEAN)
// - Tab bar dinamis dari database
// - Tab Karyawan: pakai komponen EmployeeTable (full featured)
// - Tab lain: Coming Soon
// - ✅ FIX Chat 32: Root cause fixed di /api/data/route.ts
//   (prioritas access_mode ALL/CRUD > TEAM_ATASAN untuk multi-role user)
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import EmployeeTable from '@/app/components/EmployeeTable'

type MenuTab = {
  menu_key: string
  menu_label: string
  menu_icon: string
  access_mode: string
  target_table: string | null
  tab_action: string | null
  parent_menu_key: string | null
  sort_order: number
}

export default function HRDashboardPage() {
  const [tabs, setTabs] = useState<MenuTab[]>([])
  const [activeTab, setActiveTab] = useState<string>('')
  const [loadingTabs, setLoadingTabs] = useState(true)

  useEffect(() => {
    async function loadTabs() {
      try {
        const res = await fetch('/api/menus')
        const json = await res.json()
        const allMenus = json.menus || []
        const hrTabs = allMenus
          .filter((m: any) => m.parent_menu_key === 'hr_dashboard')
          .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        setTabs(hrTabs)
        if (hrTabs.length > 0) setActiveTab(hrTabs[0].menu_key)
      } catch (err) {
        console.error('Load HR tabs error:', err)
      } finally {
        setLoadingTabs(false)
      }
    }
    loadTabs()
  }, [])

  const currentTab = tabs.find(t => t.menu_key === activeTab)

  return (
    <div className="min-h-screen bg-[#f4f7fa] pb-24">
      <PageHeader title="Hr Dashboard" backUrl="/dashboard" />

      {/* HEADER */}
      <div className="bg-gradient-to-br from-[#003D79] to-[#0056b3] px-4 pt-6 pb-4 lg:px-6 lg:pt-8 lg:pb-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-4xl">📊</span>
          <div>
            <h1 className="text-white text-xl lg:text-3xl font-black tracking-tight">HR Dashboard</h1>
            <p className="text-blue-200 text-xs lg:text-sm font-bold">Manpower Planning & Analytics</p>
          </div>
        </div>

        {/* TAB BAR - DINAMIS DARI DB */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
          {loadingTabs ? (
            <div className="text-white/60 text-sm py-2">Memuat tab...</div>
          ) : tabs.length === 0 ? (
            <div className="text-white/60 text-sm py-2">Tidak ada tab tersedia</div>
          ) : (
            tabs.map(t => (
              <button
                key={t.menu_key}
                onClick={() => setActiveTab(t.menu_key)}
                className={`flex items-center gap-1.5 px-3 py-2 lg:px-4 lg:py-2.5 rounded-full text-xs lg:text-sm font-bold whitespace-nowrap transition-all
                  ${activeTab === t.menu_key
                    ? 'bg-white text-[#003D79] shadow-lg'
                    : 'bg-white/20 text-white/80 hover:bg-white/30'
                  }`}
              >
                <span>{t.menu_icon}</span>
                <span>{t.menu_label}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 py-4 lg:px-6 lg:py-6">
        {currentTab?.tab_action?.startsWith('REDIRECT:') && (() => {
          const targetMenuKey = currentTab.tab_action.split(':')[1] || ''
          return (
            <EmployeeTable 
              key={targetMenuKey} 
              menuKey={targetMenuKey} 
            />
          )
        })()}

        {currentTab?.tab_action === 'COMING_SOON' && (
          <ComingSoon label={currentTab.menu_label} />
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT: Placeholder "Coming Soon"
// ═══════════════════════════════════════════════════════════════
function ComingSoon({ label }: { label: string }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="text-6xl mb-4">🚧</div>
      <div className="text-slate-600 text-lg font-black uppercase tracking-wide">{label}</div>
      <div className="text-slate-400 text-sm mt-2">Fitur ini sedang dalam pengembangan</div>
      <div className="mt-6 inline-block bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-xs font-black">
        Coming Soon
      </div>
    </div>
  )
}