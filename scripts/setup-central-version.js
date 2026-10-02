const fs = require('fs');
const path = require('path');

// 1. Buat folder config jika belum ada
const configDir = path.join(__dirname, '..', 'app', 'config');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// 2. Buat file config/version.ts terpusat
const versionFilePath = path.join(configDir, 'version.ts');
const versionFileContent = `// File Terpusat Versi Aplikasi
export const APP_CONFIG = {
  name: "BTM MOBILE APP",
  version: "V1.7.0",
  author: "Powered by rck_Production"
};
`;
fs.writeFileSync(versionFilePath, versionFileContent, 'utf8');
console.log('✅ File app/config/version.ts berhasil dibuat!');

// 3. Update AppFooter.tsx agar menggunakan APP_CONFIG terpusat
const appFooterPath = path.join(__dirname, '..', 'app', 'components', 'AppFooter.tsx');
const appFooterContent = `import React from 'react';
import { APP_CONFIG } from '../config/version';

export default function AppFooter() {
  return (
    <div className="flex flex-col items-center justify-center mt-4 mb-3 text-center w-full shrink-0">
      <span className="text-[10px] font-extrabold text-slate-400 tracking-wider">
        {APP_CONFIG.name} {APP_CONFIG.version}
      </span>
      <span className="text-[9px] text-slate-300 font-medium">
        {APP_CONFIG.author}
      </span>
    </div>
  );
}
`;
fs.writeFileSync(appFooterPath, appFooterContent, 'utf8');
console.log('✅ app/components/AppFooter.tsx diperbarui dengan sistem terpusat!');