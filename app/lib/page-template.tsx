'use client';

import AppLayout from '@/app/components/AppLayout';
import Card from '@/app/components/Card';
import Button from '@/app/components/Button';
import Badge from '@/app/components/Badge';

/**
 * TEMPLATE HALAMAN BARU — BTM Design System
 *
 * Cara pakai:
 * 1. Copy file ini ke folder tujuan (misal: app/dashboard/nama-fitur/page.tsx)
 * 2. Ganti "NamaHalaman" dengan nama yang sesuai
 * 3. Ganti title, badge, backUrl
 * 4. Hapus contoh konten, isi dengan fitur kamu
 *
 * SEMUA komponen sudah otomatis:
 * ✅ Header navy + tombol Back
 * ✅ Padding responsive (mobile-first)
 * ✅ Footer italic "BTM Mobile APP V1.7.0"
 * ✅ Warna & spacing konsisten
 */
export default function NamaHalaman() {
  return (
    <AppLayout
      title="Judul Halaman"
      subtitle="Deskripsi singkat halaman"
      badge="BADGE"
      backUrl="/dashboard"
    >
      {/* ═══ KONTEN HALAMAN ═══ */}

      {/* Contoh: Stats Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card padding="sm">
          <div className="text-center">
            <div className="text-xl font-extrabold text-[#003d79]">111</div>
            <div className="text-[10px] text-[#8896a7] font-semibold">Total</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-xl font-extrabold text-[#0d7a3e]">98</div>
            <div className="text-[10px] text-[#8896a7] font-semibold">Aktif</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-center">
            <div className="text-xl font-extrabold text-[#b45309]">7</div>
            <div className="text-[10px] text-[#8896a7] font-semibold">Pending</div>
          </div>
        </Card>
      </div>

      {/* Contoh: Card dengan Badge & Button */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold text-[#1a2332]">Data Terbaru</h3>
          <Badge variant="pending">3 Baru</Badge>
        </div>
        <p className="text-xs text-[#5a6a7e] mb-4">
          Konten halaman kamu di sini. Semua otomatis rapi dan konsisten.
        </p>
        <div className="flex gap-2">
          <Button variant="primary" size="sm">Simpan</Button>
          <Button variant="ghost" size="sm">Batal</Button>
        </div>
      </Card>

    </AppLayout>
  );
}
