const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '..', 'app', 'dashboard', 'page.tsx');

if (!fs.existsSync(pagePath)) {
  console.error("❌ File app/dashboard/page.tsx tidak ditemukan!");
  process.exit(1);
}

let content = fs.readFileSync(pagePath, 'utf8');

// Cari dan periksa keberadaan blok Approval Center di page.tsx
console.log('🔍 Memeriksa struktur render Approval Center di app/dashboard/page.tsx...');

// Buat file komponen terpisah ApprovalCenterComponent.tsx agar rapi, presisi, dan mudah di-maintain
const compDir = path.join(__dirname, '..', 'app', 'dashboard', 'components');
if (!fs.existsSync(compDir)) {
  fs.mkdirSync(compDir, { recursive: true });
}

const approvalCompPath = path.join(compDir, 'ApprovalCenterView.tsx');
const approvalCompCode = `"use client";

import React from "react";
import { 
  RefreshCw, ClipboardList, CheckSquare, 
  UserCheck, Award, BarChart2, TreePalm, 
  Clock, Frown, AlertTriangle, PartyPopper 
} from "lucide-react";

interface ApprovalCenterViewProps {
  tahapActive: string;
  setTahapActive: (tahap: string) => void;
  filterJenis: string;
  setFilterJenis: (jenis: string) => void;
  counts: {
    semua: number;
    cuti: number;
    lembur: number;
    sakit: number;
    izin_potongan: number;
    izin_bayar: number;
  };
  isLoading: boolean;
  onRefresh: () => void;
  children?: React.ReactNode;
}

export default function ApprovalCenterView({
  tahapActive,
  setTahapActive,
  filterJenis,
  setFilterJenis,
  counts,
  isLoading,
  onRefresh,
  children
}: ApprovalCenterViewProps) {
  return (
    <div className="bg-[#F4F7F9] text-slate-800 pt-2 px-3 pb-4 flex flex-col gap-1.5 font-sans w-full max-w-lg mx-auto">
      
      {/* 1. TOP TABS Switcher */}
      <div className="flex bg-white rounded-xl p-1 shadow-xs border border-slate-200/80 w-full">
        <button className="flex-1 bg-[#092A5E] text-white py-1.5 rounded-lg text-xs font-bold tracking-tight flex items-center justify-center gap-1.5 shadow-xs">
          <ClipboardList size={14} /> PENGAJUAN
        </button>
        <button className="flex-1 text-slate-400 py-1.5 rounded-lg text-xs font-bold tracking-tight flex items-center justify-center gap-1.5 hover:text-slate-600">
          <CheckSquare size={14} /> REVISI ABSENSI
        </button>
      </div>

      {/* 2. BANNER BIRU APPROVAL CENTER */}
      <div className="bg-[#092A5E] bg-gradient-to-r from-[#092A5E] to-[#12428A] rounded-xl px-3.5 py-2.5 text-white shadow-xs flex justify-between items-center border border-[#16428c] w-full">
        <div className="flex flex-col gap-0.5">
          <div className="text-[#00df81] text-[9px] font-black tracking-wider flex items-center gap-1 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00df81] animate-pulse"></span>
            APPROVAL CENTER
          </div>
          <h2 className="text-[14px] font-bold leading-tight tracking-tight">Semua Sudah Diproses</h2>
          <p className="text-[10px] text-blue-200/90 font-medium leading-none">Cuti, lembur & sakit yang perlu Anda proses</p>
        </div>
        
        <button 
          onClick={onRefresh}
          disabled={isLoading}
          className="bg-white/10 hover:bg-white/20 border border-white/20 rounded px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 shrink-0 ml-2 disabled:opacity-50"
        >
          <RefreshCw size={11} className={\`text-blue-100 \${isLoading ? "animate-spin" : ""}\`} /> REFRESH
        </button>
      </div>

      {/* 3. SUB TABS (SEBAGAI ATASAN / SEBAGAI PJO) */}
      <div className="flex bg-white rounded-xl p-1 shadow-xs border border-slate-200/80 w-full">
        <button 
          onClick={() => setTahapActive('ATASAN')}
          className={\`flex-1 py-1.5 rounded-lg text-[11px] font-bold tracking-tight flex items-center justify-center gap-1.5 transition-all \${
            tahapActive === 'ATASAN'
              ? "bg-[#092A5E] text-white shadow-xs"
              : "text-slate-400 hover:text-slate-600"
          }\`}
        >
          <UserCheck size={13} className={tahapActive === 'ATASAN' ? "text-blue-200" : "text-slate-400"} /> SEBAGAI ATASAN
        </button>
        <button 
          onClick={() => setTahapActive('PJO')}
          className={\`flex-1 py-1.5 rounded-lg text-[11px] font-bold tracking-tight flex items-center justify-center gap-1.5 transition-all \${
            tahapActive === 'PJO'
              ? "bg-[#092A5E] text-white shadow-xs"
              : "text-slate-400 hover:text-slate-600"
          }\`}
        >
          <Award size={13} className={tahapActive === 'PJO' ? "text-blue-200" : "text-slate-400"} /> SEBAGAI PJO
        </button>
      </div>

      {/* 4. FILTER JENIS PENGAJUAN (Angka di samping tulisan) */}
      <div className="flex flex-col gap-1 mt-0.5 w-full">
        <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase ml-0.5">
          Filter Jenis Pengajuan
        </span>
        
        <div className="grid grid-cols-3 gap-1.5 w-full">
          
          {/* SEMUA */}
          <button 
            onClick={() => setFilterJenis('ALL')}
            className={\`rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-xs transition-all border \${
              filterJenis === 'ALL'
                ? "bg-[#092A5E] border-[#16428c]"
                : "bg-white border-slate-200/90 hover:bg-slate-50"
            }\`}
          >
            <BarChart2 size={18} className={filterJenis === 'ALL' ? "text-[#4ade80]" : "text-slate-600"} strokeWidth={2.5} />
            <div className="flex items-center gap-1.5 mt-1">
              <span className={\`text-[9px] font-extrabold tracking-tight \${filterJenis === 'ALL' ? "text-white/90" : "text-slate-500"}\`}>SEMUA</span>
              <span className={\`text-sm font-black leading-none \${filterJenis === 'ALL' ? "text-white" : "text-[#092A5E]"}\`}>{counts.semua || 0}</span>
            </div>
          </button>

          {/* CUTI */}
          <button 
            onClick={() => setFilterJenis('CUTI')}
            className={\`rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-xs transition-all border \${
              filterJenis === 'CUTI'
                ? "bg-[#092A5E] border-[#16428c]"
                : "bg-white border-slate-200/90 hover:bg-slate-50"
            }\`}
          >
            <TreePalm size={18} className={filterJenis === 'CUTI' ? "text-[#4ade80]" : "text-amber-600"} strokeWidth={2} />
            <div className="flex items-center gap-1.5 mt-1">
              <span className={\`text-[9px] font-extrabold tracking-tight \${filterJenis === 'CUTI' ? "text-white/90" : "text-slate-500"}\`}>CUTI</span>
              <span className={\`text-sm font-black leading-none \${filterJenis === 'CUTI' ? "text-white" : "text-[#092A5E]"}\`}>{counts.cuti || 0}</span>
            </div>
          </button>

          {/* LEMBUR */}
          <button 
            onClick={() => setFilterJenis('LEMBUR')}
            className={\`rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-xs transition-all border \${
              filterJenis === 'LEMBUR'
                ? "bg-[#092A5E] border-[#16428c]"
                : "bg-white border-slate-200/90 hover:bg-slate-50"
            }\`}
          >
            <Clock size={18} className={filterJenis === 'LEMBUR' ? "text-[#4ade80]" : "text-slate-600"} strokeWidth={2} />
            <div className="flex items-center gap-1.5 mt-1">
              <span className={\`text-[9px] font-extrabold tracking-tight \${filterJenis === 'LEMBUR' ? "text-white/90" : "text-slate-500"}\`}>LEMBUR</span>
              <span className={\`text-sm font-black leading-none \${filterJenis === 'LEMBUR' ? "text-white" : "text-[#092A5E]"}\`}>{counts.lembur || 0}</span>
            </div>
          </button>

          {/* SAKIT */}
          <button 
            onClick={() => setFilterJenis('SAKIT')}
            className={\`rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-xs transition-all border \${
              filterJenis === 'SAKIT'
                ? "bg-[#092A5E] border-[#16428c]"
                : "bg-white border-slate-200/90 hover:bg-slate-50"
            }\`}
          >
            <Frown size={18} className={filterJenis === 'SAKIT' ? "text-[#4ade80]" : "text-amber-500"} strokeWidth={2} />
            <div className="flex items-center gap-1.5 mt-1">
              <span className={\`text-[9px] font-extrabold tracking-tight \${filterJenis === 'SAKIT' ? "text-white/90" : "text-slate-500"}\`}>SAKIT</span>
              <span className={\`text-sm font-black leading-none \${filterJenis === 'SAKIT' ? "text-white" : "text-[#092A5E]"}\`}>{counts.sakit || 0}</span>
            </div>
          </button>

          {/* IZIN POTONGAN */}
          <button 
            onClick={() => setFilterJenis('IZIN_POTONGAN')}
            className={\`rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-xs transition-all border \${
              filterJenis === 'IZIN_POTONGAN'
                ? "bg-[#092A5E] border-[#16428c]"
                : "bg-white border-slate-200/90 hover:bg-slate-50"
            }\`}
          >
            <AlertTriangle size={18} className={filterJenis === 'IZIN_POTONGAN' ? "text-[#4ade80]" : "text-red-500"} strokeWidth={2} />
            <div className="flex items-center gap-1 mt-1 text-center">
              <span className={\`text-[8px] font-extrabold tracking-tight leading-tight \${filterJenis === 'IZIN_POTONGAN' ? "text-white/90" : "text-slate-500"}\`}>IZIN POT.</span>
              <span className={\`text-sm font-black leading-none \${filterJenis === 'IZIN_POTONGAN' ? "text-white" : "text-[#092A5E]"}\`}>{counts.izin_potongan || 0}</span>
            </div>
          </button>

          {/* IZIN BAYAR */}
          <button 
            onClick={() => setFilterJenis('IZIN_BAYAR')}
            className={\`rounded-xl py-2 px-1 flex flex-col items-center justify-center shadow-xs transition-all border \${
              filterJenis === 'IZIN_BAYAR'
                ? "bg-[#092A5E] border-[#16428c]"
                : "bg-white border-slate-200/90 hover:bg-slate-50"
            }\`}
          >
            <CheckSquare size={18} className={filterJenis === 'IZIN_BAYAR' ? "text-[#4ade80]" : "text-emerald-500"} strokeWidth={2} />
            <div className="flex items-center gap-1 mt-1 text-center">
              <span className={\`text-[8px] font-extrabold tracking-tight leading-tight \${filterJenis === 'IZIN_BAYAR' ? "text-white/90" : "text-slate-500"}\`}>IZIN BAYAR</span>
              <span className={\`text-sm font-black leading-none \${filterJenis === 'IZIN_BAYAR' ? "text-white" : "text-[#092A5E]"}\`}>{counts.izin_bayar || 0}</span>
            </div>
          </button>

        </div>
      </div>

      {/* 5. KONTEN PENGAJUAN / EMPTY STATE */}
      {children ? (
        <div className="mt-1 w-full">{children}</div>
      ) : (
        <div className="border border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-white/50 mt-1 shadow-xs w-full">
          <PartyPopper size={32} strokeWidth={1.2} className="text-slate-300 mb-1" />
          <h3 className="text-slate-400 font-black tracking-widest text-[11px] uppercase">Semua Beres!</h3>
          <p className="text-[10px] text-slate-400 font-medium">Tidak ada pengajuan yang perlu diproses saat ini</p>
        </div>
      )}

    </div>
  );
}
`;

fs.writeFileSync(approvalCompPath, approvalCompCode, 'utf8');
console.log('✅ File komponen app/dashboard/components/ApprovalCenterView.tsx berhasil dibuat!');