const fs = require('fs');
const path = require('path');

// 1. Update app/dashboard/layout.tsx agar merender <AppFooter /> tepat di bawah {children}
const layoutPath = path.join(__dirname, '..', 'app', 'dashboard', 'layout.tsx');
if (fs.existsSync(layoutPath)) {
  let content = fs.readFileSync(layoutPath, 'utf8');
  
  // Pastikan ada import AppFooter
  if (!content.includes('AppFooter')) {
    content = `import AppFooter from '../components/AppFooter';\n` + content;
  }

  // Jika belum ada <AppFooter />, tambahkan di bawah {children}
  if (!content.includes('<AppFooter')) {
    content = content.replace('{children}', `{children}\n        <AppFooter />`);
  }

  fs.writeFileSync(layoutPath, content, 'utf8');
  console.log('✅ app/dashboard/layout.tsx berhasil disesuaikan dengan <AppFooter />!');
}

// 2. Bersihkan manual footer dari preview-ui/page.tsx
const previewPath = path.join(__dirname, '..', 'app', 'dashboard', 'preview-ui', 'page.tsx');
if (fs.existsSync(previewPath)) {
  const previewContent = `"use client";

import React from "react";
import { 
  RefreshCw, ClipboardList, CheckSquare, 
  UserCheck, Award, BarChart2, TreePalm, 
  Clock, Frown, AlertTriangle, PartyPopper 
} from "lucide-react";

export default function PreviewUIPage() {
  return (
    <div className="bg-[#F4F7F9] text-slate-800 pt-2 px-3 pb-4 flex flex-col gap-1.5 font-sans w-full max-w-lg mx-auto">
      
      {/* 1. TOP TABS */}
      <div className="flex bg-white rounded-xl p-1 shadow-xs border border-slate-200/80 w-full">
        <button className="flex-1 bg-[#092A5E] text-white py-1.5 rounded-lg text-xs font-bold tracking-tight flex items-center justify-center gap-1.5 shadow-xs">
          <ClipboardList size={14} /> PENGAJUAN
        </button>
        <button className="flex-1 text-slate-400 py-1.5 rounded-lg text-xs font-bold tracking-tight flex items-center justify-center gap-1.5 hover:text-slate-600">
          <CheckSquare size={14} /> REVISI ABSENSI
        </button>
      </div>

      {/* 2. BANNER BIRU */}
      <div className="bg-[#092A5E] bg-gradient-to-r from-[#092A5E] to-[#12428A] rounded-xl px-3.5 py-2.5 text-white shadow-xs flex justify-between items-center border border-[#16428c] w-full">
        <div className="flex flex-col gap-0.5">
          <div className="text-[#00df81] text-[9px] font-black tracking-wider flex items-center gap-1 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00df81] animate-pulse"></span>
            APPROVAL CENTER
          </div>
          <h2 className="text-[14px] font-bold leading-tight tracking-tight">Semua Sudah Diproses</h2>
          <p className="text-[10px] text-blue-200/90 font-medium leading-none">Cuti, lembur & sakit yang perlu Anda proses</p>
        </div>
        
        <button className="bg-white/10 hover:bg-white/20 border border-white/20 rounded px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 shrink-0 ml-2">
          <RefreshCw size={11} className="text-blue-100" /> REFRESH
        </button>
      </div>

      {/* 3. SUB TABS */}
      <div className="flex bg-white rounded-xl p-1 shadow-xs border border-slate-200/80 w-full">
        <button className="flex-1 bg-[#092A5E] text-white py-1.5 rounded-lg text-[11px] font-bold tracking-tight flex items-center justify-center gap-1.5 shadow-xs">
          <UserCheck size={13} className="text-blue-200" /> SEBAGAI ATASAN
        </button>
        <button className="flex-1 text-slate-400 py-1.5 rounded-lg text-[11px] font-bold tracking-tight flex items-center justify-center gap-1.5 hover:text-slate-600">
          <Award size={13} /> SEBAGAI PJO
        </button>
      </div>

      {/* 4. FILTER GRID */}
      <div className="flex flex-col gap-1 mt-0.5 w-full">
        <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase ml-0.5">
          Filter Jenis Pengajuan
        </span>
        
        <div className="grid grid-cols-3 gap-1.5 w-full">
          
          {/* Kotak Aktif: SEMUA 0 */}
          <div className="bg-[#092A5E] border border-[#16428c] rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-xs">
            <BarChart2 size={18} className="text-[#4ade80]" strokeWidth={2.5} />
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] text-white/90 font-extrabold tracking-tight">SEMUA</span>
              <span className="text-sm font-black text-white leading-none">0</span>
            </div>
          </div>

          {/* Kotak Inaktif: CUTI 0 */}
          <div className="bg-white border border-slate-200/90 rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-xs">
            <TreePalm size={18} className="text-amber-600" strokeWidth={2} />
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] text-slate-500 font-extrabold tracking-tight">CUTI</span>
              <span className="text-sm font-black text-[#092A5E] leading-none">0</span>
            </div>
          </div>

          {/* Kotak Inaktif: LEMBUR 0 */}
          <div className="bg-white border border-slate-200/90 rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-xs">
            <Clock size={18} className="text-slate-600" strokeWidth={2} />
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] text-slate-500 font-extrabold tracking-tight">LEMBUR</span>
              <span className="text-sm font-black text-[#092A5E] leading-none">0</span>
            </div>
          </div>

          {/* Kotak Inaktif: SAKIT 0 */}
          <div className="bg-white border border-slate-200/90 rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-xs">
            <Frown size={18} className="text-amber-500" strokeWidth={2} />
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[9px] text-slate-500 font-extrabold tracking-tight">SAKIT</span>
              <span className="text-sm font-black text-[#092A5E] leading-none">0</span>
            </div>
          </div>

          {/* Kotak Inaktif: IZIN POTONGAN 0 */}
          <div className="bg-white border border-slate-200/90 rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-xs">
            <AlertTriangle size={18} className="text-red-500" strokeWidth={2} />
            <div className="flex items-center gap-1 mt-1 text-center">
              <span className="text-[8px] text-slate-500 font-extrabold tracking-tight leading-tight">IZIN POT.</span>
              <span className="text-sm font-black text-[#092A5E] leading-none">0</span>
            </div>
          </div>

          {/* Kotak Inaktif: IZIN BAYAR 0 */}
          <div className="bg-white border border-slate-200/90 rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-xs">
            <CheckSquare size={18} className="text-emerald-500" strokeWidth={2} />
            <div className="flex items-center gap-1 mt-1 text-center">
              <span className="text-[8px] text-slate-500 font-extrabold tracking-tight leading-tight">IZIN BAYAR</span>
              <span className="text-sm font-black text-[#092A5E] leading-none">0</span>
            </div>
          </div>

        </div>
      </div>

      {/* 5. EMPTY STATE */}
      <div className="border border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-white/50 mt-1 shadow-xs w-full">
        <PartyPopper size={32} strokeWidth={1.2} className="text-slate-300 mb-1" />
        <h3 className="text-slate-400 font-black tracking-widest text-[11px] uppercase">Semua Beres!</h3>
        <p className="text-[10px] text-slate-400 font-medium">Tidak ada pengajuan yang perlu diproses saat ini</p>
      </div>

    </div>
  );
}
`;
  fs.writeFileSync(previewPath, previewContent, 'utf8');
  console.log('✅ Manual footer di preview-ui/page.tsx berhasil dibersihkan!');
}