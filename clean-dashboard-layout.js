const fs = require('fs');
const path = require('path');

const layoutPath = path.join(process.cwd(), 'app', 'dashboard', 'layout.tsx');

const cleanDashboardLayoutCode = `'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AuthProvider } from '@/app/context/AuthContext';
import SyncIndicator from '@/app/components/SyncIndicator';
import ClockOutReminder from '@/app/components/ClockOutReminder';
import VerificationModal from '@/app/components/VerificationModal';
import MobileBottomNav from '@/app/components/MobileBottomNav';
import {
  getUserCache,
  saveUserCache,
  getMenusCache,
  saveMenusCache,
  isCacheValid,
} from '@/app/lib/auth-cache';

interface MenuItem {
  menu_key: string;
  menu_label: string;
  menu_icon?: string;
  route_path?: string;
  active?: boolean;
  role?: string;
  sort_order?: number;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Notifications state
  const [notifCount, setNotifCount] = useState<number>(0);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [notifData, setNotifData] = useState<any>({
    approval: { total: 0, breakdown: [] },
    expired: { total: 0, critical: 0, breakdown: [] },
    notifications: { total: 0, unread: 0, items: [] },
  });

  useEffect(() => {
    fetchMe();
    fetchNotif();
  }, []);

  async function fetchMe() {
    const cachedUser = getUserCache();
    const cachedMenus = getMenusCache();

    if (cachedUser && isCacheValid()) {
      setUser(cachedUser);
      setUserRoles(cachedUser.roles || []);
      setIsSuperAdmin(cachedUser.is_super_admin || false);
      setUserPermissions(cachedUser.permissions || []);

      if (cachedMenus && cachedMenus.menus) {
        setMenus(cachedMenus.menus);
      }
      setLoading(false);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const [authRes, menuRes] = await Promise.all([
        fetch('/api/auth/me', { signal: controller.signal }),
        fetch('/api/menus', { signal: controller.signal }),
      ]);

      clearTimeout(timeoutId);

      if (authRes.ok && menuRes.ok) {
        const data = await authRes.json();
        const menuData = await menuRes.json();

        setUser(data.user);
        const roles: string[] = Array.isArray(data.roles) ? data.roles : [];
        setUserRoles(roles);
        setIsSuperAdmin(data.user?.is_super_admin || false);
        setUserPermissions(data.permissions || []);

        const menusArray = Array.isArray(menuData)
          ? menuData
          : menuData.menus || menuData.data || [];

        const filtered = menusArray.filter((m: MenuItem) => {
          if (m.active === false) return false;
          if (data.user?.is_super_admin) return true;
          if (m.role === '*') return true;
          return roles.includes(m.role || '');
        });

        setMenus(filtered);

        saveUserCache({
          ...data.user,
          roles,
          permissions: data.permissions || [],
        });
        saveMenusCache({ menus: filtered });
      }
    } catch (err) {
      console.error('Auth Error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNotif() {
    try {
      const res = await fetch('/api/notifikasi');
      if (res.ok) {
        const data = await res.json();
        setNotifCount(data.total_notifikasi || 0);
        setNotifData({
          approval: data.approval || { total: 0, breakdown: [] },
          expired: data.expired || { total: 0, critical: 0, breakdown: [] },
          notifications: data.notifications || { total: 0, unread: 0, items: [] },
        });
      }
    } catch (err) {
      console.error('Notif Error:', err);
    }
  }

  async function handleNotifClick(item: any) {
    if (!item.read_at) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id }),
        });
      } catch {}
    }
    setIsNotifOpen(false);
    router.push(item.url || '/dashboard');
    setTimeout(fetchNotif, 500);
  }

  async function handleMarkAllRead() {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      fetchNotif();
    } catch {}
  }

  async function handleLogout() {
    try {
      const { clearAuthCache } = await import('@/app/lib/auth-cache');
      clearAuthCache();
    } catch {}

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/');
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center animate-pulse text-slate-500 font-sans">
        Memuat Portal BTM...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa] flex relative overflow-hidden font-sans">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#003d79] text-white fixed top-0 left-0 bottom-0 z-40 overflow-y-auto">
        <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-lg shrink-0">
              <Image src="/btm-fix.png" alt="BTM" width={32} height={32} className="object-contain" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs truncate">BTM Portal</div>
              <div className="text-[10px] text-blue-200 font-black uppercase truncate leading-tight">
                {user.nama}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsNotifOpen(true)}
            className="relative w-9 h-9 flex items-center justify-center active:scale-90 transition-all cursor-pointer bg-white/10 hover:bg-white/20 rounded-xl shrink-0"
          >
            <span className="text-lg">🔔</span>
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black h-4 w-4 flex items-center justify-center rounded-full border-2 border-[#003d79] shadow-lg animate-bounce">
                {notifCount}
              </span>
            )}
          </button>
        </div>

        <div className="p-4 space-y-2 flex-1">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 text-white bg-white/10 font-bold"
          >
            <span>🏠</span>
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => router.push('/dashboard/koreksi-absensi')}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 text-blue-100 hover:bg-white/5"
          >
            <span>📝</span>
            <span>Pengajuan Absensi</span>
          </button>
          <button
            onClick={() => router.push('/dashboard/apd-saya')}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 text-blue-100 hover:bg-white/5"
          >
            <span>🦺</span>
            <span>APD & MCU Saya</span>
          </button>
          <button
            onClick={() => router.push('/dashboard/hr-dashboard')}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 text-blue-100 hover:bg-white/5"
          >
            <span>👥</span>
            <span>HR Portal</span>
          </button>
          <button
            onClick={() => router.push('/dashboard/plant')}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-3 text-blue-100 hover:bg-white/5"
          >
            <span>🚜</span>
            <span>Plant & Unit</span>
          </button>
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600/20 text-red-300 py-2.5 rounded-xl text-xs font-bold hover:bg-red-600/30 transition-colors"
          >
            🚪 Keluar
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 lg:ml-64 pb-20 lg:pb-6">
        <SyncIndicator />
        <ClockOutReminder />
        <VerificationModal />

        {/* MOBILE HEADER */}
        <div className="lg:hidden bg-[#003d79] text-white px-4 py-2.5 flex items-center justify-between fixed top-0 left-0 right-0 z-40 shadow-md">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center p-1 shadow-sm">
              <Image src="/btm-fix.png" alt="BTM" width={20} height={20} className="object-contain" />
            </div>
            <div className="leading-tight">
              <h1 className="text-xs font-bold uppercase tracking-tight text-white">BTM Mobile</h1>
              <p className="text-[9px] font-semibold text-blue-200">V1.7.0</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right leading-tight max-w-[130px]">
              <div className="text-[10px] font-bold uppercase truncate">{user.nama}</div>
              <div className="text-[8px] text-blue-200 font-medium">NRP: {user.nrp_login || user.nrp}</div>
            </div>
            <button
              type="button"
              onClick={() => setIsNotifOpen(true)}
              className="relative p-1.5 bg-white/10 rounded-lg active:scale-90 transition-transform"
            >
              <span className="text-base">🔔</span>
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold h-3.5 w-3.5 flex items-center justify-center rounded-full border border-[#003d79]">
                  {notifCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div className="pt-14 lg:pt-0 min-h-screen">
          <AuthProvider user={{ ...user, is_super_admin: isSuperAdmin }} permissions={userPermissions}>
            {children}
            <Suspense fallback={null}>
              <MobileBottomNav />
            </Suspense>
          </AuthProvider>
        </div>
      </main>

      {/* NOTIFICATION MODAL */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60" onClick={() => setIsNotifOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10">
            <div className="p-4 bg-[#003d79] text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm uppercase">Pusat Notifikasi</h3>
                <p className="text-blue-200 text-[10px]">Pemberitahuan Sistem BTM</p>
              </div>
              <button
                onClick={() => setIsNotifOpen(false)}
                className="text-white/80 hover:text-white p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
              {notifCount === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Tidak ada notifikasi baru
                </div>
              ) : (
                <div className="space-y-2">
                  {notifData.notifications?.items?.map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotifClick(item)}
                      className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer text-xs"
                    >
                      <div className="font-bold text-slate-800">{item.title}</div>
                      <div className="text-slate-600 mt-0.5">{item.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync(layoutPath, cleanDashboardLayoutCode, 'utf8');
console.log('=======================================================');
console.log('🎉 SUCCESSFULLY CLEANED app/dashboard/layout.tsx!');
console.log('Removed duplicate bottom navs, blur overlays, and floating stacked buttons.');
console.log('=======================================================');
