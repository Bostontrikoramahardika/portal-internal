const fs = require('fs');
const path = require('path');

console.log('=======================================================');
console.log('🔍 CHECKING LAYOUT & DASHBOARD FILES FOR DUPLICATE NAVS');
console.log('=======================================================');

const filesToInspect = [
  'app/layout.tsx',
  'app/dashboard/layout.tsx',
  'app/components/AppLayout.tsx',
  'app/components/PageWrapper.tsx'
];

filesToInspect.forEach(relPath => {
  const fullPath = path.join(process.cwd(), relPath);
  if (fs.existsSync(fullPath)) {
    console.log(`\n--- CONTENT OF ${relPath} ---`);
    console.log(fs.readFileSync(fullPath, 'utf8'));
  } else {
    console.log(`\n--- FILE NOT FOUND: ${relPath} ---`);
  }
});

console.log('=======================================================');
