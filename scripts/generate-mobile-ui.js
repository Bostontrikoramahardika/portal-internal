const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'app', 'components');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const mobileUIPath = path.join(dir, 'MobileUI.tsx');

const mobileUIContent = `"use client";
import React from "react";
import { RefreshCw, PartyPopper } from "lucide-react";

// 1. WRAPPER HALAMAN (Jarak pinggir, warna background, ukuran font)
export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#F4F7F9] text-slate-800 pt-2 px-3 pb-4 flex flex-col gap-1.5 font-sans w-full max-w-lg mx-auto min-h-[90vh]">
      {children}
    </div>
  );
}

// 2. BANNER BIRU (Header Halaman)
interface BannerProps {
  label: string;
  title: string;
  subtitle: string;
  onRefresh?: () => void;
}
export function BannerHeader({ label, title, subtitle, onRefresh }: BannerProps) {
  return (
    <div className="bg-[#092A5E] bg-gradient-to-r from-[#092A5E] to-[#12428A] rounded-xl px-3.5 py-2.5 text-white shadow-xs flex justify-between items-center border border-[#16428c] w-full shrink-0">
      <div className="flex flex-col gap-0.5">
        <div className="text-[#00df81] text-[9px] font-black tracking-wider flex items-center gap-1 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00df81] animate-pulse"></span>
          {label}
        </div>
        <h2 className="text-[14px] font-bold leading-tight tracking-tight">{title}</h2>
        <p className="text-[10px] text-blue-200/90 font-medium leading-none">{subtitle}</p>
      </div>
      
      {onRefresh && (
        <button 
          onClick={onRefresh}
          className="bg-white/10 hover:bg-white/20 border border-white/20 rounded px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 shrink-0 ml-2"
        >
          <RefreshCw size={11} className="text-blue-100" /> REFRESH
        </button>
      )}
    </div>
  );
}

// 3. KOTAK ANGKA (Stat Card)
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  isActive?: boolean;
  onClick?: () => void;
}
export function StatCard({ label, value, icon: Icon, iconColor, isActive, onClick }: StatCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-xs cursor-pointer transition-all active:scale-95 border ${
        isActive 
          ? "bg-[#092A5E] border-[#16428c]" 
          : "bg-white border-slate-200/90 hover:bg-slate-50"
      }`}
    >
      <Icon size={18} className={iconColor} strokeWidth={isActive ? 2.5 : 2} />
      <div className="flex items-center gap-1.5 mt-1 text-center">
        <span className={`text-[8px] font-extrabold tracking-tight leading-tight ${isActive ? "text-white/90" : "text-slate-500"}`}>
          {label}
        </span>
        <span className={`text-sm font-black leading-none ${isActive ? "text-white" : "text-[#092A5E]"}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

// 4. EMPTY STATE (Data Kosong)
export function EmptyState({ title = "Data Kosong", subtitle = "Tidak ada data yang ditemukan" }: { title?: string, subtitle?: string }) {
  return (
    <div className="border border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-white/50 mt-1 shadow-xs w-full">
      <PartyPopper size={32} strokeWidth={1.2} className="text-slate-300 mb-1" />
      <h3 className="text-slate-400 font-black tracking-widest text-[11px] uppercase">{title}</h3>
      <p className="text-[10px] text-slate-400 font-medium">{subtitle}</p>
    </div>
  );
}
`;

fs.writeFileSync(mobileUIPath, mobileUIContent, 'utf8');
console.log('✅ Cetakan Standar UI (app/components/MobileUI.tsx) berhasil dibuat!');