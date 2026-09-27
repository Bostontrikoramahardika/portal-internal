const fs = require('fs');
const path = require('path');

const filesToInspect = [
  'app/api/menus/route.ts',
  'app/components/AppLayout.tsx',
  'app/dashboard/layout.tsx',
  'check-db-menus.js',
  'find-main-menu.js'
];

filesToInspect.forEach(relPath => {
  const fullPath = path.join(process.cwd(), relPath);
  if (fs.existsSync(fullPath)) {
    console.log('====================================');
    console.log('FILE:', relPath);
    console.log('====================================');
    console.log(fs.readFileSync(fullPath, 'utf8'));
  }
});
