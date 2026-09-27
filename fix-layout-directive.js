const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🛠️ FIX LAYOUT.TSX: DIRECTIVE "use client" AT TOP');
console.log('=======================================================\n');

const layoutPath = path.join(process.cwd(), 'app', 'dashboard', 'layout.tsx');
let content = fs.readFileSync(layoutPath, 'utf8');

// 1. Bersihkan semua import MobileBottomNav & 'use client'
content = content.replace(/import MobileBottomNav from ["']@\/app\/components\/MobileBottomNav["'];?\r?\n?/g, '');
content = content.replace(/['"]use client['"];?\r?\n?/g, '');

// 2. Pasang 'use client' di baris 1, diikuti import MobileBottomNav
const cleanContent = `'use client';\nimport MobileBottomNav from '@/app/components/MobileBottomNav';\n` + content.trim();

// 3. Pastikan <MobileBottomNav /> terpasang di dalam Suspense di akhir JSX
let finalContent = cleanContent;
if (!finalContent.includes('<MobileBottomNav')) {
  if (finalContent.includes('</AuthProvider>')) {
    finalContent = finalContent.replace(
      '</AuthProvider>',
      '  <Suspense fallback={null}><MobileBottomNav /></Suspense>\n        </AuthProvider>'
    );
  } else if (finalContent.includes('</main>')) {
    finalContent = finalContent.replace(
      '</main>',
      '  <Suspense fallback={null}><MobileBottomNav /></Suspense>\n      </main>'
    );
  } else {
    const lastIdx = finalContent.lastIndexOf('</div>');
    if (lastIdx !== -1) {
      finalContent = finalContent.slice(0, lastIdx) + '  <Suspense fallback={null}><MobileBottomNav /></Suspense>\n' + finalContent.slice(lastIdx);
    }
  }
}

fs.writeFileSync(layoutPath, finalContent, 'utf8');

console.log('✅ FIXED: app/dashboard/layout.tsx');
console.log('   - Line 1: \'use client\';');
console.log('   - Line 2: import MobileBottomNav...');
console.log('   - JSX: <Suspense fallback={null}><MobileBottomNav /></Suspense>');
console.log('=======================================================');
