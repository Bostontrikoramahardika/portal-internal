const fs = require('fs');
const path = require('path');

const root = process.cwd();

// ============================================================
// 1. PASTIKAN PageHeader.tsx ADA di lokasi yang benar
// ============================================================
const componentsDir = path.join(root, 'app', 'components');
if (!fs.existsSync(componentsDir)) {
  fs.mkdirSync(componentsDir, { recursive: true });
}

const pageHeaderContent = `'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backUrl?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string;
}

export default function PageHeader({
  title,
  subtitle,
  backUrl,
  showBack = true,
  rightElement,
  icon,
  badge,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl);
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-amber-500/30 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700/80 text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95 group shrink-0"
              title="Kembali"
            >
              <span className="text-amber-400 group-hover:text-slate-950 transition-transform group-hover:-translate-x-0.5 text-sm sm:text-base font-bold">
                ←
              </span>
              <span className="hidden sm:inline">Kembali</span>
            </button>
          )}

          <div className="min-w-0 flex items-center gap-2">
            {icon && <span className="text-xl sm:text-2xl shrink-0">{icon}</span>}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-white truncate">
                  {title}
                </h1>
                {badge && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium shrink-0">
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-[11px] sm:text-xs text-slate-400 truncate mt-0.5 font-normal">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {rightElement && (
          <div className="flex items-center gap-2 shrink-0">
            {rightElement}
          </div>
        )}
      </div>
    </header>
  );
}
`;

fs.writeFileSync(path.join(componentsDir, 'PageHeader.tsx'), pageHeaderContent, 'utf8');
console.log('✅ Created app/components/PageHeader.tsx');

// ============================================================
// 2. SCAN & FIX SEMUA page.tsx YANG RUSAK
// ============================================================
function getAllPages(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      getAllPages(full, list);
    } else if (file === 'page.tsx') {
      list.push(full);
    }
  }
  return list;
}

const pages = getAllPages(path.join(root, 'app'));
let fixedCount = 0;
let cleanedCount = 0;

for (const filePath of pages) {
  let code = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(root, filePath).replace(/\\\\/g, '/');
  let changed = false;

  // --- A. Fix: import PageHeader SEBELUM 'use client' ---
  // Pattern: import di baris 1, lalu 'use client'
  if (
    code.includes('import PageHeader') &&
    (/^import PageHeader[^\n]*\n['"]use client['"]/m.test(code) ||
     /^import PageHeader[^\n]*\r?\n['"]use client['"]/m.test(code) ||
     code.trimStart().startsWith('import PageHeader'))
  ) {
    // Hapus semua import PageHeader yang salah posisi
    code = code.replace(/import PageHeader from ["']@\/app\/components\/PageHeader["'];?\r?\n/g, '');
    
    // Pastikan 'use client' di paling atas
    const useClientMatch = code.match(/^['"]use client['"];?\r?\n/m);
    if (useClientMatch) {
      // sudah ada use client di suatu tempat - pindahkan ke atas + tambah import setelahnya
      code = code.replace(/^['"]use client['"];?\r?\n/m, '');
      code = `'use client';\n\nimport PageHeader from "@/app/components/PageHeader";\n` + code.trimStart();
    } else if (code.includes("'use client'") || code.includes('"use client"')) {
      code = code.replace(/['"]use client['"];?\r?\n?/g, '');
      code = `'use client';\n\nimport PageHeader from "@/app/components/PageHeader";\n` + code.trimStart();
    } else {
      // tidak ada use client, tapi pakai hooks? tambahkan
      code = `'use client';\n\nimport PageHeader from "@/app/components/PageHeader";\n` + code.trimStart();
    }
    changed = true;
  }

  // --- B. Fix duplikat import PageHeader ---
  const importMatches = code.match(/import PageHeader from ["']@\/app\/components\/PageHeader["'];?/g);
  if (importMatches && importMatches.length > 1) {
    // keep only first
    let first = true;
    code = code.replace(/import PageHeader from ["']@\/app\/components\/PageHeader["'];?\r?\n/g, () => {
      if (first) {
        first = false;
        return `import PageHeader from "@/app/components/PageHeader";\n`;
      }
      return '';
    });
    changed = true;
  }

  // --- C. Fix: 'use client' tidak di baris pertama ---
  const trimmed = code.trimStart();
  if (
    (code.includes("'use client'") || code.includes('"use client"')) &&
    !trimmed.startsWith("'use client'") &&
    !trimmed.startsWith('"use client"')
  ) {
    code = code.replace(/['"]use client['"];?\r?\n?/g, '');
    // Ambil import PageHeader jika ada
    let phImport = '';
    if (code.includes('import PageHeader')) {
      code = code.replace(/import PageHeader from ["']@\/app\/components\/PageHeader["'];?\r?\n/g, '');
      phImport = `import PageHeader from "@/app/components/PageHeader";\n`;
    }
    code = `'use client';\n\n${phImport}` + code.trimStart();
    changed = true;
  }

  // --- D. Fix broken header injection di parts-catalog (hidden header) ---
  if (rel.includes('parts-catalog') && code.includes('<header className="hidden">')) {
    // Restore: hapus PageHeader inject yang rusak + hidden header, biarkan header asli
    code = code.replace(/<PageHeader[\s\S]*?\/>\s*<header className="hidden">/g, '<header className="bg-slate-900/90 backdrop-blur border-b border-amber-500/20 sticky top-0 z-40">');
    
    // Pastikan ada tombol back manual di header parts-catalog tanpa rusak layout dark theme
    if (!code.includes('← Kembali') && !code.includes('←') && !code.includes('router.back')) {
      // inject tombol back sederhana di dalam header existing via useRouter
      if (!code.includes('useRouter')) {
        code = code.replace(
          /import \{([^}]+)\} from 'react'/,
          `import {$1} from 'react'\nimport { useRouter } from 'next/navigation'`
        );
      }
    }
    changed = true;
  }

  // --- E. Hapus PageHeader inject yang nyasar di halaman yang belum siap / rusak parah ---
  // Jika ada <PageHeader tapi import sudah dibersihkan / file broken
  if (code.includes('<PageHeader') && !code.includes('import PageHeader')) {
    code = code.replace(/import PageHeader from ["']@\/app\/components\/PageHeader["'];?\r?\n/g, '');
    // re-add import after use client
    if (code.trimStart().startsWith("'use client'") || code.trimStart().startsWith('"use client"')) {
      code = code.replace(
        /^['"]use client['"];?\r?\n/,
        `'use client';\n\nimport PageHeader from "@/app/components/PageHeader";\n`
      );
    } else {
      code = `'use client';\n\nimport PageHeader from "@/app/components/PageHeader";\n` + code;
    }
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, code, 'utf8');
    fixedCount++;
    console.log(`🔧 Fixed: ${rel}`);
  }
}

// ============================================================
// 3. KHUSUS: REPAIR parts-catalog dengan teliti
// ============================================================
const catalogPath = path.join(root, 'app', 'parts-catalog', 'page.tsx');
if (fs.existsSync(catalogPath)) {
  let cat = fs.readFileSync(catalogPath, 'utf8');
  
  // Pastikan struktur benar
  // Hapus inject PageHeader yang merusak
  cat = cat.replace(/import PageHeader from ["']@\/app\/components\/PageHeader["'];?\r?\n/g, '');
  cat = cat.replace(/<PageHeader[\s\S]*?\/>\s*/g, '');
  cat = cat.replace(/<header className="hidden">/g, '');
  
  // Pastikan 'use client' di atas
  cat = cat.replace(/['"]use client['"];?\r?\n?/g, '');
  cat = cat.trimStart();
  
  // Cek apakah useRouter sudah ada
  const hasUseRouter = cat.includes('useRouter');
  const hasRouterImport = cat.includes("from 'next/navigation'") || cat.includes('from "next/navigation"');
  
  let routerImport = '';
  if (!hasRouterImport) {
    routerImport = `import { useRouter } from 'next/navigation'\n`;
  }
  
  cat = `'use client'\n\n${routerImport}` + cat;
  
  // Inject tombol back di header existing parts-catalog (dark theme) tanpa ganti layout
  // Cari pola header dan tambahkan tombol back
  if (!cat.includes('handleBackCatalog') && !cat.includes('← Kembali')) {
    // Tambah hook router di dalam component
    // Cari: export default function ... {
    cat = cat.replace(
      /(export default function \w+\(\) \{)/,
      `$1\n  const router = useRouter();\n  const handleBackCatalog = () => {\n    if (window.history.length > 1) router.back();\n    else router.push('/dashboard/plant');\n  };`
    );
    
    // Coba inject tombol di awal header content
    // Pattern umum: setelah <header ...> <div className="...flex...
    if (cat.includes('sticky top-0')) {
      cat = cat.replace(
        /(<(?:header|div)[^>]*sticky top-0[^>]*>[\s\S]*?<div[^>]*className="[^"]*flex[^"]*"[^>]*>)/,
        `$1\n          <button\n            onClick={handleBackCatalog}\n            type="button"\n            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-700 text-xs font-semibold transition-all mr-2 shrink-0"\n          >\n            <span className="text-amber-400 font-bold">←</span>\n            <span className="hidden sm:inline">Kembali</span>\n          </button>`
      );
    }
  }
  
  fs.writeFileSync(catalogPath, cat, 'utf8');
  cleanedCount++;
  console.log('✅ Repaired app/parts-catalog/page.tsx (dark theme preserved + back button)');
}

// ============================================================
// 4. VERIFIKASI: cek sisa file yang masih broken
// ============================================================
console.log('\n=== VERIFIKASI ===');
let stillBroken = [];
for (const filePath of pages) {
  const code = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(root, filePath).replace(/\\\\/g, '/');
  
  // Cek use client di belakang import
  const lines = code.split(/\r?\n/).slice(0, 8);
  let useClientIdx = -1;
  let firstImportIdx = -1;
  lines.forEach((l, i) => {
    if (/['"]use client['"]/.test(l) && useClientIdx < 0) useClientIdx = i;
    if (/^import /.test(l) && firstImportIdx < 0) firstImportIdx = i;
  });
  
  if (useClientIdx > 0 && firstImportIdx >= 0 && firstImportIdx < useClientIdx) {
    stillBroken.push(`${rel} — 'use client' di baris ${useClientIdx + 1}, import di baris ${firstImportIdx + 1}`);
  }
  
  if (code.includes('import PageHeader') || code.includes('<PageHeader')) {
    const phExists = fs.existsSync(path.join(root, 'app', 'components', 'PageHeader.tsx'));
    if (!phExists) stillBroken.push(`${rel} — PageHeader import tapi file tidak ada`);
  }
}

if (stillBroken.length === 0) {
  console.log('✅ Semua page.tsx aman — tidak ada use client terbalik.');
} else {
  console.log('⚠️ Masih ada issue:');
  stillBroken.forEach(s => console.log('  - ' + s));
}

console.log(`\n🎉 Selesai! Fixed: ${fixedCount} | Catalog repaired: ${cleanedCount}`);
console.log('👉 Refresh browser /parts-catalog dan cek halaman lain.');
