'use client';

import React from 'react';
import Sidebar from '@/app/components/Sidebar';
import MobileBottomNav from '@/app/components/MobileBottomNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f7fa] flex overflow-hidden">
      <div className="hidden md:block w-64 flex-shrink-0">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        <header className="md:hidden h-11 bg-[#003d79] flex items-center justify-between px-4 flex-shrink-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center border border-white/30 text-white font-bold text-xs">
              B
            </div>
            <span className="text-white font-bold text-sm tracking-tight">BTM MOBILE</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[10px] text-white font-medium uppercase">
            US
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden relative pb-24 md:pb-0">
          <div className="max-w-[1400px] mx-auto min-h-full">
            {children}
          </div>
        </main>

        <MobileBottomNav />
      </div>
    </div>
  );
}
