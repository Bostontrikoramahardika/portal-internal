'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface MenuItem {
  id?: string;
  title?: string;
  menu_label?: string;
  name?: string;
  menu_key?: string;
  href?: string;
  icon?: string | React.ReactNode;
  badge?: string;
  menu_icon?: string;
  menu_group?: string;
  parent_menu_key?: string | null;
  sort_order?: number;
}

interface MobileBottomNavProps {
  menus?: MenuItem[];
  userRole?: string;
}

interface NavItem {
  menu_key: string;
  name: string;
  href: string;
  icon: string;
  badge?: string;
}

const DEFAULT_GROUPS: Record<string, NavItem[]> = {
  absensi: [
    { menu_key: 'absensi_saya', name: 'Absensi Hari Ini', href: '/dashboard?menu=absensi_saya', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011v4a1 1 0 001 1m-6 0h6' },
    { menu_key: 'riwayat_absensi', name: 'Riwayat Absensi', href: '/dashboard?menu=riwayat_absensi', icon: 'M9 19v-6a2 2 0 00-2 2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { menu_key: 'crew_on_duty', name: 'Crew On Duty', href: '/dashboard/crew-on-duty', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { menu_key: 'koreksi_absensi', name: 'Revisi Jam Absensi', href: '/dashboard/koreksi-absensi', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { menu_key: 'approval_koreksi', name: 'Approval Koreksi', href: '/dashboard/approval-koreksi', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', badge: 'Leader' },
    { menu_key: 'manajemen_absensi', name: 'Manajemen Absensi', href: '/dashboard/manajemen-absensi', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', badge: 'HR' },
    { menu_key: 'rekap_absensi', name: 'Rekap Absensi', href: '/dashboard/rekap-absensi', icon: 'M9 19v-6a2 2 0 00-2 2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', badge: 'HR' },
    { menu_key: 'hr_override_absensi', name: 'HR Override Absensi', href: '/dashboard/hr-override-absensi', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', badge: 'HR' },
  ],
  pengajuan: [
    { menu_key: 'form_cuti', name: 'Ajukan Cuti', href: '/dashboard?menu=form_cuti', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { menu_key: 'cuti_saya', name: 'Riwayat Cuti', href: '/dashboard?menu=cuti_saya', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { menu_key: 'evident_sakit', name: 'Eviden Sakit / Izin', href: '/dashboard?menu=evident_sakit', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { menu_key: 'form_lembur', name: 'Ajukan Lembur', href: '/dashboard?menu=form_lembur', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { menu_key: 'riwayat_lembur', name: 'Riwayat Lembur', href: '/dashboard?menu=riwayat_lembur', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { menu_key: 'approval_center', name: 'Approval Center', href: '/dashboard?menu=approval_center', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', badge: 'Leader' },
  ],
  saya: [
    { menu_key: 'data_saya', name: 'Data Saya', href: '/dashboard?menu=data_saya', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { menu_key: 'apd_saya', name: 'APD Saya', href: '/dashboard/apd-saya', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { menu_key: 'mcu_saya', name: 'MCU Saya', href: '/dashboard/mcu-saya', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
    { menu_key: 'roster_saya', name: 'Roster Bulanan', href: '/dashboard?menu=roster_saya', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { menu_key: 'kpi_saya', name: 'KPI Saya', href: '/dashboard?menu=kpi_saya', icon: 'M9 19v-6a2 2 0 00-2 2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { menu_key: 'pkwt_saya', name: 'PKWT Saya', href: '/dashboard?menu=pkwt_saya', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { menu_key: 'sp_saya', name: 'SP Saya', href: '/dashboard?menu=sp_saya', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { menu_key: 'simper_saya', name: 'SIMPER Saya', href: '/dashboard?menu=simper_saya', icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 012-2h2a2 2 0 012 2v1m-6 0h6' },
    { menu_key: 'bpjs_saya', name: 'BPJS Karyawan', href: '/dashboard?menu=bpjs_saya', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  ],
  more: [
    // 📦 Parts & Logistik
    { menu_key: 'plant_katalog', name: 'Parts Catalog (Partbook)', href: '/parts-catalog', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { menu_key: 'plant_orders', name: 'Part Orders', href: '/part-orders', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
    { menu_key: 'plant_admin', name: 'Partbook Admin', href: '/partbook/admin', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066', badge: 'Admin' },
    { menu_key: 'plant_logistik', name: 'Plant Logistik', href: '/dashboard/plant/logistik', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { menu_key: 'logistik', name: 'Logistik Master', href: '/dashboard/logistik', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', badge: 'Admin' },

    // 🏭 Plant & Workshop
    { menu_key: 'plant_dashboard', name: 'Kru & Workshop', href: '/dashboard/plant', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011v5m-4 0h4' },
    { menu_key: 'plant_inspeksi', name: 'Inspeksi P2H', href: '/dashboard/plant/inspeksi', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { menu_key: 'kelola_unit', name: 'Kelola Unit Master', href: '/dashboard/kelola-unit', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066', badge: 'Admin' },
    { menu_key: 'setting_unit', name: 'Setting Unit Shift', href: '/dashboard/setting-unit', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4', badge: 'Leader' },

    // 🩺 Safety & HSE
    { menu_key: 'kelola_apd', name: 'Kelola APD', href: '/dashboard/kelola-apd', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', badge: 'HSE' },
    { menu_key: 'monitoring_apd', name: 'Monitoring APD', href: '/dashboard/monitoring-apd', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', badge: 'HSE' },
    { menu_key: 'monitoring_mcu', name: 'Monitoring MCU', href: '/dashboard/monitoring-mcu', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', badge: 'HSE' },
    { menu_key: 'import_mcu_bulk', name: 'Import MCU Massal', href: '/dashboard/import-mcu', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', badge: 'HR' },

    // 📋 HR & Manajemen
    { menu_key: 'hr_dashboard', name: 'HR Dashboard', href: '/dashboard/hr-dashboard', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', badge: 'HR' },
    { menu_key: 'kelola_event', name: 'Kelola Event / Rapat', href: '/dashboard/kelola-event', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { menu_key: 'rekrutmen', name: 'Rekrutmen & Pelamar', href: '/dashboard/rekrutmen', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', badge: 'HR' },
    { menu_key: 'import_roster_bulk', name: 'Import Roster', href: '/dashboard/import-roster', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', badge: 'HR' },
    { menu_key: 'kelola_akses', name: 'Kelola Akses', href: '/dashboard/kelola-akses', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', badge: 'Admin' },
  ],
};

const SHEET_TITLES: Record<string, string> = {
  absensi: 'Menu Absensi',
  pengajuan: 'Menu Pengajuan',
  saya: 'Menu Saya / Self Service',
  more: 'Menu Sistem Lainnya',
};

// ============================================================
// GRID "MORE" DIBANGUN DARI DATABASE (tabel menus via /api/menus)
// Tidak ada daftar menu atau nama peran yang ditulis di frontend.
// Pengelompokan memakai kolom menu_group apa adanya.
// ============================================================

const GROUP_DIKECUALIKAN = ['self service', 'hr dashboard tabs'];

function rapikanJudul(g) {
  const t = String(g || "").trim();
  if (!t) return 'Lainnya';
  if (t === t.toUpperCase() || t === t.toLowerCase()) {
    return t
      .toLowerCase()
      .split(' ')
      .map((w) => (w.length > 3 ? w.charAt(0).toUpperCase() + w.slice(1) : w.toUpperCase()))
      .join(' ');
  }
  return t;
}

function kelompokkanMenu(menus) {
  const peta = new Map();

  (menus || []).forEach((m) => {
    if (!m || !m.menu_key) return;
    if (m.parent_menu_key) return;
    const grup = String(m.menu_group || 'Lainnya');
    if (GROUP_DIKECUALIKAN.includes(grup.trim().toLowerCase())) return;

    const kunci = grup.trim().toLowerCase();
    if (!peta.has(kunci)) {
      peta.set(kunci, { judul: rapikanJudul(grup), urut: Number(m.sort_order) || 0, items: [] });
    }
    const g = peta.get(kunci);
    g.urut = Math.min(g.urut, Number(m.sort_order) || 0);
    if (!g.items.some((x) => x.menu_key === m.menu_key)) g.items.push(m);
  });

  return Array.from(peta.values())
    .map((g) => ({
      ...g,
      items: g.items.sort(
        (a, b) =>
          (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) ||
          String(a.menu_label || '').localeCompare(String(b.menu_label || ''))
      ),
    }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => a.urut - b.urut || a.judul.localeCompare(b.judul));
}

export default function MobileBottomNav({ menus = [] }: MobileBottomNavProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname || '';
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const closeDrawer = () => setActiveTab(null);
  const toggleTab = (tab: string) => setActiveTab(activeTab === tab ? null : tab);

  const tabs = [
    { id: 'absensi', label: 'Absensi', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'pengajuan', label: 'Pengajuan', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'scan', label: 'Scan QR', isScanner: true },
    { id: 'saya', label: 'Saya', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'more', label: 'More', icon: 'M4 6h16M4 12h16M4 18h16' },
  ];

  // Menu "More" diambil 100% dari database, dikelompokkan per menu_group
  const grupMore = activeTab === 'more' ? kelompokkanMenu(menus) : [];

  const rawItems =
    activeTab && activeTab !== 'scan' && activeTab !== 'more'
      ? (DEFAULT_GROUPS[activeTab] || [])
      : [];

  // 🔐 Filter menu berdasarkan Hak Akses Database (/api/menus)
  const currentItems = rawItems.filter(item => {
    // Menu tanpa badge adalah menu publik standar untuk seluruh karyawan
    if (!item.badge) return true;

    // Jika data menu dinamis dari database (/api/menus) ada, gunakan verifikasi cerdas:
    if (Array.isArray(menus) && menus.length > 0) {
      return menus.some((dbMenu: any) => {
        if (!dbMenu) return false;
        const dbKey = String(dbMenu.menu_key || dbMenu.key || '').trim().toLowerCase();
        const dbTitle = String(dbMenu.title || dbMenu.name || dbMenu.menu_label || '').trim().toLowerCase();
        const dbHref = String(dbMenu.href || dbMenu.url || '').trim().toLowerCase();

        const itemKey = String(item.menu_key || '').trim().toLowerCase();
        const itemName = String(item.name || '').trim().toLowerCase();
        const itemHref = String(item.href || '').trim().toLowerCase();

        // 1. Match langsung berdasarkan menu_key
        if (itemKey && dbKey && itemKey === dbKey) return true;

        // 2. Normalisasi key (underscore vs strip, e.g. plant_katalog vs plant-katalog)
        if (itemKey && dbKey && itemKey.replace(/[-_]/g, '') === dbKey.replace(/[-_]/g, '')) return true;

        // 3. Match berdasarkan Href
        if (itemHref && dbHref && (itemHref === dbHref || itemHref.includes(dbHref) || dbHref.includes(itemHref))) return true;

        // 4. Match URL terhadap dbKey
        if (dbKey && itemHref) {
          const cleanHref = itemHref.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const cleanKey = dbKey.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          if (cleanHref.includes(cleanKey) || cleanKey.includes(cleanHref)) return true;
        }

        // 5. Match berdasarkan Judul / Label
        if (itemName && dbTitle && (itemName === dbTitle || itemName.includes(dbTitle) || dbTitle.includes(itemName))) return true;

        return false;
      });
    }

    // Fallback: tampilkan menu jika list database belum selesai dimuat
    return true;
  });

  const isTabActive = (tabId: string) => {
    if (tabId === 'absensi') {
      return (
        pathname.includes('absensi') ||
        pathname.includes('koreksi') ||
        pathname.includes('crew-on-duty')
      );
    }
    if (tabId === 'pengajuan') {
      return (
        pathname.includes('cuti') ||
        pathname.includes('lembur') ||
        pathname.includes('evident') ||
        pathname.includes('approval')
      );
    }
    if (tabId === 'saya') {
      return (
        pathname.includes('data_saya') ||
        pathname.includes('apd-saya') ||
        pathname.includes('mcu-saya') ||
        pathname.includes('roster_saya') ||
        pathname.includes('kpi_saya') ||
        pathname.includes('pkwt') ||
        pathname.includes('bpjs')
      );
    }
    if (tabId === 'more') {
      return (
        pathname.includes('parts') ||
        pathname.includes('plant') ||
        pathname.includes('logistik') ||
        pathname.includes('kelola') ||
        pathname.includes('monitoring') ||
        pathname.includes('hr-dashboard') ||
        pathname.includes('rekrutmen')
      );
    }
    return false;
  };

  return (
    <>
      {/* 🚀 DRAWER SHEET DARI BAWAH (Modal Menu) */}
      {activeTab && activeTab !== 'scan' && (
        <div className="fixed inset-0 z-50 lg:hidden animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-900/60 transition-opacity" onClick={closeDrawer} />
          
          <div className="fixed inset-x-3 bottom-20 max-h-[75vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
            {/* Header Drawer */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">
                {SHEET_TITLES[activeTab] || 'Pilihan Menu'}
              </h3>
              <button
                onClick={closeDrawer}
                className="w-8 h-8 rounded-full bg-slate-200/70 text-slate-600 font-bold flex items-center justify-center text-xs active:scale-90 transition-transform"
              >
                ✕
              </button>
            </div>

            {/* List Menu Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* ===== MODE "MORE": GRID PER KELOMPOK, SUMBER DATABASE ===== */}
              {activeTab === 'more' && (
                <div className="pb-6">
                  {grupMore.length === 0 && (
                    <p className="py-10 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                      Tidak ada menu untuk akun Anda
                    </p>
                  )}
                  {grupMore.map((grup) => (
                    <section key={grup.judul} className="mb-5">
                      <div className="flex items-center gap-2 mb-2.5">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-[#003d79]">{grup.judul}</h4>
                        <span className="text-[10px] font-bold text-slate-400">{grup.items.length}</span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {grup.items.map((m) => (
                          <Link
                            key={m.menu_key}
                            href={'/dashboard?menu=' + m.menu_key}
                            onClick={closeDrawer}
                            className="flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all active:scale-95 bg-[#f4f7fa] border-slate-200 text-slate-700 hover:bg-blue-50"
                          >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 border bg-white border-slate-200 text-[#003d79] text-[18px] leading-none">
                              {m.menu_icon || '\u25A2'}
                            </div>
                            <span className="text-[11px] font-bold leading-tight line-clamp-2">
                              {String(m.menu_label || m.menu_key).replace(/^[^A-Za-z0-9(]+/, '')}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
              <div className={(activeTab === 'more' ? 'hidden ' : '') + 'grid grid-cols-2 gap-2.5'}>
                {currentItems.map((item) => {
                  const isItemActive = pathname === item.href || (item.href.includes('?') && pathname.includes(item.href.split('?')[0]));

                  return (
                    <Link
                      key={item.href + item.name}
                      href={item.href}
                      onClick={closeDrawer}
                      className={
                        'flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all active:scale-95 ' +
                        (isItemActive
                          ? 'bg-[#003d79]/5 border-[#003d79] text-[#003d79] shadow-sm'
                          : 'bg-white border-slate-100 text-slate-700 hover:border-slate-200 hover:bg-slate-50')
                      }
                    >
                      <div
                        className={
                          'w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 border ' +
                          (isItemActive
                            ? 'bg-[#003d79] text-white border-[#003d79]'
                            : 'bg-slate-50 text-slate-600 border-slate-100')
                        }
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={item.icon} />
                        </svg>
                      </div>
                      <span className="text-[11px] font-bold leading-tight line-clamp-2">
                        {item.name}
                      </span>
                      {item.badge && (
                        <span className="mt-1 px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-amber-50 text-amber-700 border border-amber-200">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Tombol Logout Khusus di Tab "Saya" */}
              {activeTab === 'saya' && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={async () => {
                      if (confirm('Apakah Anda yakin ingin keluar dari aplikasi?')) {
                        try {
                          await fetch('/api/auth/logout', { method: 'POST' });
                        } catch {}
                        localStorage.removeItem('btm_session_token_v1');
                        localStorage.removeItem('btm_user_cache_v1');
                        window.location.href = '/';
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs active:scale-95 transition-all"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                    Keluar Aplikasi
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🚀 FLOATING BOTTOM NAVIGATION BAR (Pill Style V1.7.0) */}
      <nav className="fixed bottom-2.5 left-2.5 right-2.5 z-40 lg:hidden">
        <div className="rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-[0_4px_25px_rgba(0,61,121,0.12)] px-1 py-1">
          <div className="flex items-center justify-around h-[54px] relative">
            {tabs.map((tab) => {
              if (tab.isScanner) {
                return (
                  <Link
                    key={tab.id}
                    href="/dashboard/scan-qr"
                    onClick={closeDrawer}
                    className="w-12 h-12 rounded-full bg-[#003d79] text-white flex items-center justify-center shadow-lg border-2 border-white active:scale-90 transition-transform -mt-5"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                    </svg>
                  </Link>
                );
              }

              const isDrawerOpen = activeTab === tab.id;
              const isActive = isDrawerOpen || isTabActive(tab.id);

              return (
                <button
                  key={tab.id}
                  onClick={() => toggleTab(tab.id)}
                  className={
                    'flex flex-col items-center justify-center flex-1 py-1 transition-colors ' +
                    (isActive ? 'text-[#003d79] font-bold' : 'text-slate-400 font-medium')
                  }
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-0.5">
                    <path d={tab.icon} />
                  </svg>
                  <span className="text-[10px] leading-tight">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
