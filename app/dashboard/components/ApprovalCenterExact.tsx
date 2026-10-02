'use client';

import React from 'react';
import { RefreshCcw } from 'lucide-react';
import { APP_CONFIG } from '@/app/config/version';

export default function ApprovalCenterExact() {
  const filters = [
    { label: '📊 SEMUA', count: 0, active: true },
    { label: '🌴 CUTI', count: 0, active: false },
    { label: '⏱️ LEMBUR', count: 0, active: false },
    { label: '🙁 SAKIT', count: 0, active: false },
    { label: '⚠️ IZIN POT.', count: 0, active: false },
    { label: '✅ IZIN BAYAR', count: 0, active: false },
  ];

  return (
    <div className="flex flex-col w-full px-1">
      {/* TABS ATAS */}
      <div className="flex gap-2 mb-3">
        <button className="flex-1 bg-[#092A5E] text-white py-3 rounded-xl shadow-sm flex items-center justify-center gap-2 text-[11px] font-bold">
          📋 PENGAJUAN
        </button>
        <button className="flex-1 bg-white text-gray-400 py-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-center gap-2 text-[11px] font-bold">
          📝 REVISI ABSENSI
        </button>
      </div>

      {/* BANNER BIRU + DOT HIJAU */}
      <div className="bg-[#092A5E] rounded-2xl p-4 text-white shadow-lg mb-3 relative">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-bold tracking-[0.2em] opacity-80 uppercase">APPROVAL CENTER</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00df81] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00df81]"></span>
              </span>
            </div>
            <h2 className="text-lg font-bold leading-tight text-white">Semua Sudah Diproses</h2>
            <p className="text-[10px] text-blue-100/70 mt-0.5">Cuti, lembur & sakit yang perlu Anda proses</p>
          </div>
          <button className="bg-white/10 p-2 rounded-lg flex items-center gap-1.5 border border-white/10 active:scale-95 transition-transform">
            <RefreshCcw size={14} className="text-blue-300" />
            <span className="text-[10px] font-bold">REFRESH</span>
          </button>
        </div>
      </div>

      {/* ROLE TABS */}
      <div className="flex p-1 bg-gray-100/80 rounded-xl mb-4 border border-gray-200/50">
        <button className="flex-1 py-2 rounded-lg bg-[#092A5E] text-white text-[10px] font-bold shadow-md">
          👔 SEBAGAI ATASAN
        </button>
        <button className="flex-1 py-2 rounded-lg text-gray-400 text-[10px] font-bold">
          🎖️ SEBAGAI PJO
        </button>
      </div>

      {/* GRID FILTER - ANGKA DI SAMPING */}
      <div className="mb-4">
        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">
          FILTER JENIS PENGAJUAN
        </label>
        <div className="grid grid-cols-3 gap-2">
          {filters.map((item, idx) => (
            <button
              key={idx}
              className={`py-3 px-1 rounded-xl border flex flex-row items-center justify-center gap-1.5 transition-all ${
                item.active 
                ? 'bg-[#092A5E] border-[#092A5E] text-white shadow-md' 
                : 'bg-white border-gray-100 text-gray-500 shadow-sm'
              }`}
            >
              <span className="text-[9px] font-bold whitespace-nowrap uppercase tracking-tighter italic">
                {item.label}
              </span>
              <span className={`text-[11px] font-black ${item.active ? 'text-white' : 'text-[#092A5E]'}`}>
                {item.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* EMPTY STATE */}
      <div className="bg-white rounded-2xl border-2 border-dashed border-gray-100 py-12 flex flex-col items-center justify-center text-center shadow-sm">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="text-[#092A5E] font-black text-sm tracking-widest uppercase">Semua Beres!</h3>
        <p className="text-gray-400 text-[10px] mt-1 font-medium italic">Tidak ada pengajuan yang perlu diproses saat ini</p>
      </div>

      {/* FOOTER DI BAWAH KONTEN */}
      <div className="mt-8 mb-6 text-center">
        <div className="text-[10px] font-black text-gray-300 tracking-[0.2em] uppercase">
          {APP_CONFIG.name} {APP_CONFIG.version}
        </div>
        <div className="text-[9px] font-medium text-gray-300 mt-0.5">
          {APP_CONFIG.author}
        </div>
      </div>
    </div>
  );
}
