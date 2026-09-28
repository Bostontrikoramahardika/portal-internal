const fs = require('fs');
const path = require('path');

const pageHeaderPath = path.join(process.cwd(), 'app', 'components', 'PageHeader.tsx');
if (fs.existsSync(pageHeaderPath)) {
  console.log('=== ISI APP/COMPONENTS/PAGEHEADER.TSX ===');
  console.log(fs.readFileSync(pageHeaderPath, 'utf8'));
}

const samplePages = [
  'app/dashboard/apd-saya/page.tsx',
  'app/dashboard/plant/page.tsx',
  'app/dashboard/dashboard-cuti/page.tsx'
];

samplePages.forEach(p => {
  const fullP = path.join(process.cwd(), p);
  if (fs.existsSync(fullP)) {
    console.log('==========================================');
    console.log('FILE:', p);
    console.log('==========================================');
    const content = fs.readFileSync(fullP, 'utf8');
    const lines = content.split('\n');
    lines.slice(0, 45).forEach((line, idx) => {
      console.log('Line ' + (idx + 1) + ': ' + line.trim().slice(0, 110));
    });
  }
});
