'use client'

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="min-h-screen bg-[#f4f7fa] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-[24px] shadow-sm border border-[#e2e8f0] max-w-sm w-full">
        <div className="w-16 h-16 bg-[#b91c1c]/10 text-[#b91c1c] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h2 className="text-xl font-bold text-[#1a2332] mb-2">Terjadi Kesalahan</h2>
        <p className="text-sm text-[#5a6a7e] mb-6">Gagal memuat data. Periksa koneksi internet Anda atau coba lagi.</p>
        <button onClick={() => reset()} className="w-full bg-[#003d79] text-white py-3 rounded-xl font-bold">
          Muat Ulang
        </button>
      </div>
    </div>
  );
}
