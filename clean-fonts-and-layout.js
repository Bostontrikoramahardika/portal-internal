const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        walk(filepath, callback);
      }
    } else if (filepath.endsWith('.tsx') || filepath.endsWith('.ts') || filepath.endsWith('.js')) {
      callback(filepath);
    }
  }
}

console.log('=======================================================');
console.log('🛠️ FIXING LAYOUT & REMOVING GOOGLE FONT REFERENCES');
console.log('=======================================================');

let cleanedCount = 0;

walk(path.join(process.cwd(), 'app'), (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Clean next/font/google import
  content = content.replace(/import\s*\{\s*Plus_Jakarta_Sans[^\}]*\}\s*from\s*['"]next\/font\/google['"];?\r?\n?/g, '');
  
  // Clean const plusJakarta... = Plus_Jakarta_Sans({...});
  content = content.replace(/const\s+plusJakarta[a-zA-Z0-9_]*\s*=\s*Plus_Jakarta_Sans\([\s\S]*?\);?\r?\n?/g, '');
  
  // Replace variable usages
  content = content.replace(/\$\{plusJakarta[a-zA-Z0-9_]*\.variable\}/g, '');
  content = content.replace(/plusJakarta[a-zA-Z0-9_]*\.className/g, '"font-sans"');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    cleanedCount++;
    console.log(`✅ Cleaned: ${path.relative(process.cwd(), filePath)}`);
  }
});

// Force app/layout.tsx to be clean
const layoutPath = path.join(process.cwd(), 'app', 'layout.tsx');
const cleanLayout = `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BTM Portal Internal',
  description: 'Aplikasi Portal Internal BTM',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased bg-[#f4f7fa] text-slate-800 font-sans">
        {children}
      </body>
    </html>
  );
}
`;

fs.writeFileSync(layoutPath, cleanLayout, 'utf8');
console.log('✅ Overwritten app/layout.tsx with clean layout');

console.log('=======================================================');
console.log(`🎉 DONE! Cleaned ${cleanedCount} files.`);
console.log('=======================================================');
