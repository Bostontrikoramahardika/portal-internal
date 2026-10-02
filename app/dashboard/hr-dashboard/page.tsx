'use client'

// ═══════════════════════════════════════════════════════════════
// HR DASHBOARD v4.2 — migrasi ke STD UI KIT (v1.8)
//
// Perubahan dari v4.1 (TAMPILAN SAJA, logika tidak diubah):
//  - Pakai <StdPage> + <StatBanner> + <TopTabs> + <EmptyState>
//  - Header & tab bar manual dihapus → ikut standar Approval Center
//  - Footer manual dihapus (layout.tsx sudah punya <AppFooter />)
//  - min-h-screen dihapus (penyebab ruang kosong di HP)
//
// TETAP SAMA:
//  - Tab dinamis dari /api/menus (tidak ada hardcode role)
//  - Emoji menu_icon dari DB dipertahankan
//  - EmployeeTable dipakai persis seperti sebelumnya
//
// CATATAN PERFORMA (HP):
//  EmployeeTable di-load dinamis (next/dynamic) supaya kode tabel yang berat
//  tidak ikut terunduh saat halaman pertama kali dibuka.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { StdPage, StatBanner, TopTabs, EmptyState, type TopTabItem } from '@/app/components/std'

// ⚡ lazy-load: tabel besar baru diunduh saat benar-benar ditampilkan
const EmployeeTable = dynamic(() => import('@/app/components/EmployeeTable'), {
  ssr: false,
  loading: () => <EmptyState variant="loading" text="Menyiapkan tabel karyawan" />,
})

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

  async function loadTabs() {
    setLoadingTabs(true)
    try {
      const res = await fetch('/api/menus')
      const json = await res.json()
      const allMenus = json.menus || []
      const hrTabs = allMenus
        .filter((m: any) => m.parent_menu_key === 'hr_dashboard')
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      setTabs(hrTabs)
      if (hrTabs.length > 0) {
        setActiveTab((prev) => (prev && hrTabs.some((t: MenuTab) => t.menu_key === prev) ? prev : hrTabs[0].menu_key))
      }
    } catch (err) {
      console.error('Load HR tabs error:', err)
    } finally {
      setLoadingTabs(false)
    }
  }

  useEffect(() => {
    loadTabs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentTab = tabs.find((t) => t.menu_key === activeTab)

  // tab DB → format TopTabs (emoji dari kolom menu_icon tetap dipakai)
  const tabItems: TopTabItem[] = tabs.map((t) => ({
    id: t.menu_key,
    label: t.menu_label,
    icon: t.menu_icon || undefined,
  }))

  return (
    <StdPage width="full">
      <StatBanner
        eyebrow="HR Dashboard"
        title="Manpower Planning & Analytics"
        subtitle="Data karyawan, dokumen & analitik SDM"
        onRefresh={loadTabs}
        refreshing={loadingTabs}
      />

      {loadingTabs ? (
        <EmptyState variant="loading" title="Memuat Menu…" text="Mengambil daftar tab dari server" />
      ) : tabs.length === 0 ? (
        <EmptyState
          variant="empty"
          title="Tidak Ada Tab Tersedia"
          text="Hak akses Anda belum mencakup menu HR Dashboard"
        />
      ) : (
        <>
          <TopTabs scroll tabs={tabItems} value={activeTab} onChange={setActiveTab} />

          {currentTab?.tab_action?.startsWith('REDIRECT:') &&
            (() => {
              const targetMenuKey = currentTab.tab_action!.split(':')[1] || ''
              return <EmployeeTable key={targetMenuKey} menuKey={targetMenuKey} />
            })()}

          {currentTab?.tab_action === 'COMING_SOON' && (
            <EmptyState
              variant="empty"
              icon="Warn"
              title={currentTab.menu_label}
              text="Fitur ini sedang dalam pengembangan — Coming Soon"
            />
          )}
        </>
      )}
    </StdPage>
  )
}
