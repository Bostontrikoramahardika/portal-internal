"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export default function MobileBottomNav() {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const menuParam = searchParams ? searchParams.get("menu") : null;
  const [showMore, setShowMore] = useState(false);

  const isActive = (path, menu) => {
    if (menu && menuParam) return menuParam === menu;
    if (pathname === path && !menuParam) return true;
    return false;
  };

  const moreMenus = [
    { label: "Leader", href: "/dashboard/crew-on-duty" },
    { label: "HR", href: "/dashboard/hr-dashboard" },
    { label: "Safety", href: "/dashboard/monitoring-apd" },
    { label: "Admin", href: "/dashboard/kelola-akses" },
    { label: "Plant", href: "/dashboard/plant" },
    { label: "Site", href: "/dashboard/monitoring-mcu" },
    { label: "HO", href: "/dashboard/rekrutmen" }
  ];

  const absensiActive = isActive("/dashboard", "absensi_saya");
  const pengajuanActive = isActive("/dashboard", "form_cuti");
  const sayaActive = pathname.indexOf("saya") !== -1;

  return (
    <>
      <div className="h-20 sm:hidden block w-full" />

      <div className="fixed bottom-0 left-0 right-0 sm:hidden z-50 px-3 pb-3 pt-1">
        <div className="bg-white rounded-[22px] shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-[#e2e8f0] px-2 py-2 flex items-center justify-between relative">

          <Link href="/dashboard?menu=absensi_saya" className="flex flex-col items-center justify-center w-[20%]">
            <svg className={absensiActive ? "w-5 h-5 text-[#003d79]" : "w-5 h-5 text-[#8896a7]"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className={absensiActive ? "text-[10px] mt-1 font-bold text-[#003d79]" : "text-[10px] mt-1 font-bold text-[#8896a7]"}>Absensi</span>
          </Link>

          <Link href="/dashboard?menu=form_cuti" className="flex flex-col items-center justify-center w-[20%]">
            <svg className={pengajuanActive ? "w-5 h-5 text-[#003d79]" : "w-5 h-5 text-[#8896a7]"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className={pengajuanActive ? "text-[10px] mt-1 font-bold text-[#003d79]" : "text-[10px] mt-1 font-bold text-[#8896a7]"}>Pengajuan</span>
          </Link>

          <div className="w-[20%] flex justify-center relative">
            <Link
              href="/dashboard/scan-qr"
              className="absolute -top-8 bg-[#003d79] text-white p-3.5 rounded-full border-[3px] border-[#f4f7fa] active:scale-95"
              style={{ boxShadow: "0 6px 20px rgba(0, 61, 121, 0.45)" }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </Link>
            <span className="text-[10px] mt-6 font-bold text-[#8896a7]">Scan</span>
          </div>

          <Link href="/dashboard/mcu-saya" className="flex flex-col items-center justify-center w-[20%]">
            <svg className={sayaActive ? "w-5 h-5 text-[#003d79]" : "w-5 h-5 text-[#8896a7]"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className={sayaActive ? "text-[10px] mt-1 font-bold text-[#003d79]" : "text-[10px] mt-1 font-bold text-[#8896a7]"}>Saya</span>
          </Link>

          <button type="button" onClick={function () { setShowMore(true); }} className="flex flex-col items-center justify-center w-[20%] text-[#8896a7]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-[10px] mt-1 font-bold">More</span>
          </button>
        </div>
      </div>

      {showMore ? (
        <div className="fixed inset-0 z-[60] flex items-end sm:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={function () { setShowMore(false); }} />
          <div className="bg-white w-full rounded-t-[28px] p-6 relative z-10 border-t border-[#e2e8f0]">
            <div className="w-12 h-1.5 bg-[#e2e8f0] rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[#1a2332] font-extrabold text-base">Menu Lainnya</h3>
              <span className="text-xs text-[#8896a7]">BTM V1.7.0</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {moreMenus.map(function (item) {
                return (
                  <Link key={item.label} href={item.href} onClick={function () { setShowMore(false); }} className="flex flex-col items-center text-center gap-1.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#f4f7fa] text-[#003d79] flex items-center justify-center border border-[#e2e8f0] text-sm font-black">
                      {item.label.charAt(0)}
                    </div>
                    <span className="text-xs font-bold text-[#5a6a7e]">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <button type="button" onClick={function () { setShowMore(false); }} className="w-full mt-6 py-3 bg-[#f8fafc] text-[#1a2332] rounded-xl font-extrabold border border-[#e2e8f0]">
              Tutup
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
