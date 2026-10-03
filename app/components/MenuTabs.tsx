'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

type M = any;

function labelTab(m: M) {
  const t = String(m?.tab_action || '');
  if (t.startsWith('TAB:')) return t.slice(4).trim() || String(m?.menu_key || '');
  return String(m?.menu_label || m?.menu_key || '').replace(/^[^A-Za-z0-9(]+/, '').trim();
}

function tujuan(m: M) {
  const h = String(m?.href || '').trim();
  return h || '/dashboard?menu=' + m.menu_key;
}

export default function MenuTabs({ menus = [] }: { menus?: M[] }) {
  const sp = useSearchParams();
  const pathname = usePathname() || '';
  const menuKey = sp?.get('menu') || '';

  if (!Array.isArray(menus) || menus.length === 0) return null;

  let saatIni = menuKey ? menus.find((m: M) => m?.menu_key === menuKey) : undefined;
  if (!saatIni && pathname && pathname !== '/dashboard') {
    saatIni = menus.find((m: M) => String(m?.href || '').trim() === pathname);
  }
  if (!saatIni) return null;

  const kunciInduk = saatIni.parent_menu_key || saatIni.menu_key;
  const induk = menus.find((m: M) => m?.menu_key === kunciInduk);
  if (!induk) return null;

  const anak = menus.filter((m: M) => m?.parent_menu_key === kunciInduk);
  if (anak.length === 0) return null;

  const tabs = [induk, ...anak].sort(
    (a: M, b: M) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0)
  );
  const aktifKey = saatIni.menu_key;

  return (
    <div className="px-3 max-w-lg mx-auto pt-2">
      <div
        className="flex gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {tabs.map((t: M) => {
          const aktif = t.menu_key === aktifKey;
          return (
            <Link
              key={t.menu_key}
              href={tujuan(t)}
              scroll={false}
              className={
                'flex-1 whitespace-nowrap text-center px-3 py-2 rounded-xl text-[12px] font-black uppercase tracking-wide transition-all active:scale-95 ' +
                (aktif ? 'bg-[#003d79] text-white shadow' : 'bg-transparent text-slate-500 hover:bg-white')
              }
            >
              {labelTab(t)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}