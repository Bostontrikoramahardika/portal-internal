'use client';

// ============================================================
// NAVIGASI BAWAH - 100% DARI DATABASE (tabel menus via /api/menus)
//   nav_tab          -> absensi | pengajuan | profil | more | hidden
//   menu_group       -> judul kelompok di dalam tab More
//   parent_menu_key  -> menu anak, jadi tab di induknya (tidak tampil di grid)
//   href             -> tujuan; kosong = /dashboard?menu=<menu_key>
//   menu_icon        -> emoji dari DB
//   sort_order       -> urutan
// Tidak ada daftar menu / nama peran yang ditulis di frontend.
// ============================================================

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface MenuItem {
  id?: string;
  menu_key?: string;
  menu_label?: string;
  menu_icon?: string;
  menu_group?: string;
  nav_tab?: string | null;
  href?: string | null;
  parent_menu_key?: string | null;
  sort_order?: number;
  badge?: string;
}

interface MobileBottomNavProps {
  menus?: MenuItem[];
  userRole?: string;
  isSuperAdmin?: boolean;
}

const JUDUL_SHEET: Record<string, string> = {
  absensi: 'Absensi',
  pengajuan: 'Pengajuan',
  profil: 'Profil Saya',
  more: 'Menu Lainnya',
};

function bersih(s: string) {
  return String(s || '').replace(/^[^A-Za-z0-9(]+/, '').trim();
}

function rapikanJudul(g: string) {
  const t = String(g || '').trim();
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

export function tujuanMenu(m: MenuItem) {
  const h = String(m?.href || '').trim();
  if (h) return h;
  return '/dashboard?menu=' + m.menu_key;
}

function menuTab(menus: MenuItem[], tab: string) {
  return (menus || [])
    .filter((m) => m && m.menu_key && !m.parent_menu_key)
    .filter((m) => {
      const t = String(m.nav_tab || '').trim().toLowerCase();
      if (t === 'hidden') return false;
      return tab === 'more' ? t === '' || t === 'more' : t === tab;
    })
    .sort(
      (a, b) =>
        (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) ||
        String(a.menu_label || '').localeCompare(String(b.menu_label || ''))
    );
}

function kelompokkan(items: MenuItem[]) {
  const peta = new Map<string, { judul: string; urut: number; items: MenuItem[] }>();
  items.forEach((m) => {
    const grup = String(m.menu_group || 'Lainnya');
    const kunci = grup.trim().toLowerCase();
    if (!peta.has(kunci)) {
      peta.set(kunci, { judul: rapikanJudul(grup), urut: Number(m.sort_order) || 0, items: [] });
    }
    const g = peta.get(kunci)!;
    g.urut = Math.min(g.urut, Number(m.sort_order) || 0);
    if (!g.items.some((x) => x.menu_key === m.menu_key)) g.items.push(m);
  });
  return Array.from(peta.values())
    .filter((g) => g.items.length > 0)
    .sort((a, b) => a.urut - b.urut || a.judul.localeCompare(b.judul));
}

export default function MobileBottomNav({ menus = [] }: MobileBottomNavProps) {
  const pathname = usePathname() || '';
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const closeDrawer = () => setActiveTab(null);
  const toggleTab = (tab: string) => setActiveTab(activeTab === tab ? null : tab);

  const tabs = [
    { id: 'absensi', label: 'Absensi', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'pengajuan', label: 'Pengajuan', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'scan', label: 'Scan QR', isScanner: true },
    { id: 'profil', label: 'Profil', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'more', label: 'More', icon: 'M4 6h16M4 12h16M4 18h16' },
  ];

  const isiTab = activeTab && activeTab !== 'scan' ? menuTab(menus, activeTab) : [];
  const grupMore = activeTab === 'more' ? kelompokkan(isiTab) : [];

  async function handleLogout() {
    try {
      const { clearAuthCache } = await import('@/app/lib/auth-cache');
      clearAuthCache();
    } catch {}
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('btm_session_token_v1');
        localStorage.removeItem('btm_user_cache_v1');
        localStorage.removeItem('btm_user_v1');
        localStorage.removeItem('btm_menus_v1');
        localStorage.removeItem('btm_menus_time_v1');
      }
    } catch {}
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/';
  }

  const Kartu = ({ m }: { m: MenuItem }) => {
    const tujuan = tujuanMenu(m);
    const aktif = !tujuan.includes('?') && pathname === tujuan;
    return (
      <Link
        href={tujuan}
        onClick={closeDrawer}
        className={
          'flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all active:scale-95 ' +
          (aktif
            ? 'bg-[#003d79] border-[#003d79] text-white'
            : 'bg-[#f4f7fa] border-slate-200 text-slate-700 hover:bg-blue-50')
        }
      >
        <div
          className={
            'w-10 h-10 rounded-xl flex items-center justify-center mb-2 border text-[18px] leading-none ' +
            (aktif ? 'bg-white/20 border-white/30' : 'bg-white border-slate-200')
          }
        >
          {m.menu_icon || '\u25A2'}
        </div>
        <span className="text-[11px] font-bold leading-tight line-clamp-2">
          {bersih(m.menu_label || m.menu_key || '')}
        </span>
      </Link>
    );
  };

  return (
    <>
      {activeTab && activeTab !== 'scan' && (
        <div className="fixed inset-0 z-[100000] flex flex-col justify-end lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 transition-opacity" onClick={closeDrawer} />
          <div className="relative bg-white rounded-t-[24px] max-h-[80vh] overflow-y-auto p-4 z-10 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-[#003d79] uppercase tracking-wider">
                {JUDUL_SHEET[activeTab] || 'Menu'}
              </h3>
              <button
                type="button"
                onClick={closeDrawer}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center"
              >
                &#10005;
              </button>
            </div>

            {activeTab !== 'more' && (
              <div className="grid grid-cols-2 gap-2.5 pb-4">
                {isiTab.length === 0 && (
                  <p className="col-span-2 py-10 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                    Belum ada menu di bagian ini
                  </p>
                )}
                {isiTab.map((m) => (
                  <Kartu key={m.menu_key} m={m} />
                ))}
              </div>
            )}

            {activeTab === 'more' && (
              <div className="pb-2">
                {grupMore.length === 0 && (
                  <p className="py-8 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                    Tidak ada menu tambahan untuk akun Anda
                  </p>
                )}
                {grupMore.map((grup) => (
                  <section key={grup.judul} className="mb-5">
                    <div className="flex items-center gap-2 mb-2.5">
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-[#003d79]">
                        {grup.judul}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400">{grup.items.length}</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {grup.items.map((m) => (
                        <Kartu key={m.menu_key} m={m} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {activeTab === 'more' && (
              <div className="pt-3 pb-2 border-t border-slate-100 space-y-2">
                <Link
                  href="/dashboard?menu=ganti_password"
                  onClick={closeDrawer}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm active:scale-95 transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Reset Password Akun
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm active:scale-95 transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Keluar Aplikasi
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <nav className="fixed bottom-2.5 left-2.5 right-2.5 z-50 bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_8px_30px_rgba(0,61,121,0.12)] rounded-2xl px-2 py-1.5 lg:hidden">
        <div className="flex items-center justify-around h-[60px] px-1 relative">
          {tabs.map((tab) => {
            if (tab.isScanner) {
              return (
                <div key="scan" className="flex-1 flex justify-center -mt-6">
                  <Link
                    href="/dashboard/scan-qr"
                    onClick={closeDrawer}
                    className="w-14 h-14 rounded-full bg-[#003d79] text-white flex items-center justify-center shadow-lg border-4 border-white active:scale-95 transition-transform"
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                  </Link>
                </div>
              );
            }
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => toggleTab(tab.id)}
                className={
                  'flex flex-col items-center justify-center flex-1 py-1 transition-colors ' +
                  (isActive ? 'text-[#003d79] font-bold' : 'text-slate-500 font-medium')
                }
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-0.5">
                  <path d={tab.icon} />
                </svg>
                <span className="text-[10px] leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}