const fs = require('fs');
const path = require('path');

// 1. Bersihkan duplikasi AppFooter dari seluruh file di app/dashboard/
function removeDuplicateFooters(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        removeDuplicateFooters(filePath);
      }
    } else if ((file.endsWith('.tsx') || file.endsWith('.jsx')) && file !== 'layout.tsx') {
      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;

      // Hapus import AppFooter
      content = content.replace(/import\s+AppFooter\s+from\s+['"]@\/app\/components\/AppFooter['"];?\r?\n?/g, '');
      content = content.replace(/import\s+AppFooter\s+from\s+['"]\.\.?\/\.\.?\/components\/AppFooter['"];?\r?\n?/g, '');

      // Hapus tag <AppFooter /> atau <AppFooter></AppFooter>
      content = content.replace(/<AppFooter\s*\/>\r?\n?/g, '');
      content = content.replace(/<AppFooter\s*><\/AppFooter>\r?\n?/g, '');

      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('BERHASIL MEMBERSIHKAN FOOTER GANDA:', path.relative(process.cwd(), filePath));
      }
    }
  }
}

removeDuplicateFooters(path.join(process.cwd(), 'app', 'dashboard'));

// 2. Adjust Layout Padding di app/dashboard/layout.tsx agar konten bawah tidak tertutup Bottom Bar
const layoutPath = path.join(process.cwd(), 'app', 'dashboard', 'layout.tsx');
if (fs.existsSync(layoutPath)) {
  let layoutContent = fs.readFileSync(layoutPath, 'utf8');
  // Pastikan main container pakai pb-24 sm:pb-8
  layoutContent = layoutContent.replace('pb-20 sm:pb-0', 'pb-24 sm:pb-8');
  fs.writeFileSync(layoutPath, layoutContent, 'utf8');
  console.log('BERHASIL MENYESUAIKAN PADDING LAYOUT DOCK!');
}
