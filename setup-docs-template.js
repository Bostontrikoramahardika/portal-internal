const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = process.cwd();
const log = (msg) => console.log(`  ${msg}`);

// ═══ 1. TEMPLATE HALAMAN BARU ═══
console.log('\n📝 STEP 1: Create page template...');
const template = `'use client';

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
`;
fs.writeFileSync(path.join(ROOT, 'app/lib/page-template.tsx'), template, 'utf8');
log('✅ Created: app/lib/page-template.tsx');

// ═══ 2. DOKUMENTASI DESIGN SYSTEM ═══
console.log('\n📚 STEP 2: Create DESIGN-SYSTEM.md...');
const docs = `# BTM Design System — Navy Corporate

> **Versi:** 1.0 | **Warna Utama:** \`#003d79\` | **Font:** Plus Jakarta Sans (Local)
> **Style:** Rounded · Elegant · Professional · PAMA-Inspired

---

## 🎨 WARNA

| Token | HEX | Penggunaan |
|-------|-----|------------|
| \`navy\` | \`#003d79\` | Header, tombol utama, aksen |
| \`navyDark\` | \`#002a57\` | Hover header, tombol hover |
| \`navyLight\` | \`#0056b3\` | Link, aksen terang |
| \`navy50\` | \`#e8f0f8\` | Background icon, badge |
| \`bg\` | \`#f4f7fa\` | Background halaman |
| \`card\` | \`#ffffff\` | Background card |
| \`text\` | \`#1a2332\` | Teks utama |
| \`textSub\` | \`#5a6a7e\` | Teks sekunder |
| \`textMuted\` | \`#8896a7\` | Teks samar, placeholder |
| \`border\` | \`#e2e8f0\` | Border card, divider |
| \`success\` | \`#0d7a3e\` | Status berhasil, hadir |
| \`warning\` | \`#b45309\` | Status pending, warning |
| \`danger\` | \`#b91c1c\` | Status error, tolak, BS |

---

## 📐 SPACING & PADDING

| Konteks | Class | Keterangan |
|---------|-------|------------|
| Wrapper halaman | \`p-2 sm:p-3 lg:p-4\` | Mobile tight, desktop longgar |
| Card internal | \`p-3 sm:p-4\` | Konten dalam card |
| Antar section | \`space-y-3\` | Gap vertikal |
| Antar elemen | \`gap-2 sm:gap-3\` | Gap horizontal/vertikal |

**ATURAN:**
- ❌ JANGAN pakai \`p-8\`, \`p-10\`, \`p-12\` (terlalu besar di HP)
- ✅ Maksimal wrapper = \`p-4\` (hanya di \`lg:\`)
- ✅ Default mobile = \`p-2\`

---

## 🧩 KOMPONEN

### \`<AppLayout>\` — Wrapper Utama (WAJIB)
\`\`\`tsx
<AppLayout title="Judul" badge="HR" backUrl="/dashboard">
  {/* konten */}
</AppLayout>
\`\`\`
Otomatis include: Header navy + Back button + Footer + Padding

### \`<PageHeader>\` — Header
\`\`\`tsx
<PageHeader title="Absensi" badge="HR" backUrl="/dashboard" />
\`\`\`

### \`<Card>\` — Kartu
\`\`\`tsx
<Card padding="md" hover> Konten </Card>
\`\`\`
Props: \`padding\` (sm/md/lg), \`hover\` (boolean), \`onClick\`

### \`<Button>\` — Tombol
\`\`\`tsx
<Button variant="primary" size="md">Simpan</Button>
\`\`\`
Variants: \`primary\` (navy), \`secondary\`, \`danger\`, \`ghost\`
Sizes: \`sm\`, \`md\`, \`lg\`

### \`<Badge>\` — Label Status
\`\`\`tsx
<Badge variant="pending">Pending</Badge>
\`\`\`
Variants: \`pending\`, \`done\`, \`urgent\`, \`info\`, \`navy\`

### \`<Icon>\` — Icon Wrapper
\`\`\`tsx
<Icon size={40} bg="#e8f0f8" color="#003d79">
  <svg>...</svg>
</Icon>
\`\`\`

### \`<AppFooter>\` — Footer
Otomatis tampil di \`<AppLayout>\`. Tidak perlu dipanggil manual.
Teks: *BTM Mobile APP V1.7.0* · *Powered By rck_Production*

---

## 📱 BOTTOM NAVIGATION (HP)

| Menu | Icon | Keterangan |
|------|------|------------|
| Absensi | Clock | Menu utama |
| Pengajuan | Document | Form pengajuan |
| **Scan** | Camera | **Center button** (floating) |
| Saya | User | Profile |
| More | Dots | Leader, HR, Safety, Admin, Plant, Site, HO |

---

## ✅ DO & ❌ DON'T

| ✅ DO | ❌ DON'T |
|-------|----------|
| Pakai \`<AppLayout>\` di setiap halaman | Buat header/footer manual |
| Pakai warna dari \`design-system.ts\` | Hardcode warna random |
| Pakai SVG line icon | Pakai emoji sebagai icon |
| Padding \`p-2\` / \`p-3\` di mobile | Padding \`p-8\` / \`p-12\` |
| Font weight 700-800 untuk heading | Font weight 400 untuk heading |
| Border radius 14-20px | Border radius 4px (terlalu kotak) |
| Shadow halus \`rgba(0,61,121,0.06)\` | Shadow tebal hitam |

---

## 🚀 CARA BIKIN HALAMAN BARU

1. Copy \`app/lib/page-template.tsx\`
2. Paste ke \`app/dashboard/nama-fitur/page.tsx\`
3. Ganti judul, badge, backUrl
4. Isi konten pakai \`<Card>\`, \`<Button>\`, \`<Badge>\`
5. Selesai! Otomatis konsisten dengan semua halaman lain.
`;
fs.writeFileSync(path.join(ROOT, 'DESIGN-SYSTEM.md'), docs, 'utf8');
log('✅ Created: DESIGN-SYSTEM.md');

// ═══ 3. FONT DOWNLOAD SCRIPT ═══
console.log('\n🔤 STEP 3: Create font download script...');
const fontScript = `# BTM Font Downloader — Plus Jakarta Sans
# Jalankan SEKALI saat ada internet. Setelah itu app bisa offline.
# Usage: .\\download-fonts.ps1

$fontDir = "public\\fonts"
if (!(Test-Path $fontDir)) { New-Item -ItemType Directory -Path $fontDir -Force | Out-Null }

$fonts = @(
  @{ Name = "PlusJakartaSans-Regular"; Weight = "400" },
  @{ Name = "PlusJakartaSans-Medium"; Weight = "500" },
  @{ Name = "PlusJakartaSans-SemiBold"; Weight = "600" },
  @{ Name = "PlusJakartaSans-Bold"; Weight = "700" },
  @{ Name = "PlusJakartaSans-ExtraBold"; Weight = "800" },
  @{ Name = "PlusJakartaSans-Italic"; Weight = "400i" },
  @{ Name = "PlusJakartaSans-MediumItalic"; Weight = "500i" }
)

Write-Host "\\n🔤 Downloading Plus Jakarta Sans fonts..." -ForegroundColor Cyan

foreach ($font in $fonts) {
  $url = "https://cdn.jsdelivr.net/fontsource/fonts/plus-jakarta-sans@latest/latin-$($font.Weight)-normal.woff2"
  if ($font.Weight -match "i$") {
    $w = $font.Weight -replace "i",""
    $url = "https://cdn.jsdelivr.net/fontsource/fonts/plus-jakarta-sans@latest/latin-$w-italic.woff2"
  }
  $outFile = "$fontDir\\$($font.Name).woff2"

  if (Test-Path $outFile) {
    Write-Host "  ⏭️  $($font.Name).woff2 (already exists)" -ForegroundColor Yellow
    continue
  }

  try {
    Invoke-WebRequest -Uri $url -OutFile $outFile -ErrorAction Stop
    $size = (Get-Item $outFile).Length / 1KB
    Write-Host "  ✅ $($font.Name).woff2 ($([math]::Round($size,1)) KB)" -ForegroundColor Green
  } catch {
    Write-Host "  ❌ Failed: $($font.Name) — $($_.Exception.Message)" -ForegroundColor Red
  }
}

Write-Host "\\n✅ Font download complete! App sekarang bisa offline." -ForegroundColor Green
Write-Host "   Folder: $fontDir\\n" -ForegroundColor Gray
`;
fs.writeFileSync(path.join(ROOT, 'download-fonts.ps1'), fontScript, 'utf8');
log('✅ Created: download-fonts.ps1');

// ═══ 4. SUMMARY ═══
console.log('\n' + '='.repeat(55));
console.log('✅ SCRIPT 2 SELESAI — Dokumentasi + Template + Font!');
console.log('='.repeat(55));
console.log('\n📁 File yang dibuat:');
console.log('  📄 app/lib/page-template.tsx');
console.log('  📄 DESIGN-SYSTEM.md');
console.log('  📄 download-fonts.ps1');
console.log('\n🚀 LANGKAH SELANJUTNYA:');
console.log('  1. Jalankan font download (butuh internet 1x):');
console.log('     .\\download-fonts.ps1');
console.log('  2. Restart dev server:');
console.log('     Remove-Item -Recurse -Force .next ; npm run dev');
console.log('  3. Cek http://localhost:3000 — font & warna baru aktif!');
console.log('  4. Untuk bikin halaman baru, copy app/lib/page-template.tsx');
console.log('\n📊 RINGKASAN DESIGN SYSTEM:');
console.log('  🎨 Warna    : Navy #003d79 (locked)');
console.log('  🔤 Font     : Plus Jakarta Sans (local, offline)');
console.log('  🧩 Komponen : 8 (AppLayout, PageHeader, PageWrapper,');
console.log('                  Card, Button, Badge, Icon, AppFooter)');
console.log('  📱 Bottom   : Absensi·Pengajuan·Scan·Saya·More');
console.log('  📝 Footer   : Italic samar "BTM Mobile APP V1.7.0"');
console.log('  🔙 Back     : Otomatis di setiap halaman');
console.log('='.repeat(55) + '\n');
