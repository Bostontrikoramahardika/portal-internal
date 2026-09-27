const fs = require('fs');
const path = require('path');

function inspectTabState(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  console.log('==========================================');
  console.log('FILE:', path.relative(process.cwd(), filePath));
  console.log('==========================================');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('searchParams') || line.includes('activeTab') || line.includes('useSearchParams') || line.includes('tab') || line.includes('useState')) {
      if (idx < 200) console.log('Line ' + (idx + 1) + ': ' + line.trim().slice(0, 100));
    }
  });
}

inspectTabState(path.join(process.cwd(), 'app/dashboard/dashboard-cuti/page.tsx'));
inspectTabState(path.join(process.cwd(), 'app/dashboard/apd-saya/page.tsx'));
inspectTabState(path.join(process.cwd(), 'app/dashboard/page.tsx'));
