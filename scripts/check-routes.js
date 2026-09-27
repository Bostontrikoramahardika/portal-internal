const fs = require('fs');
const path = require('path');

function findInFile(filePath, searchStr) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(=== FILE:  ===);
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.includes(searchStr) || line.includes('menu') || line.includes('tab') || line.includes('href')) {
      if (i < 100) console.log(Line : );
    }
  });
}

// Cek route dashboard & cuti
const dashPage = path.join(process.cwd(), 'app/dashboard/page.tsx');
const cutiPage = path.join(process.cwd(), 'app/dashboard/dashboard-cuti/page.tsx');

if (fs.existsSync(dashPage)) {
  console.log("=== DASHBOARD PAGE ===");
  const content = fs.readFileSync(dashPage, 'utf8');
  console.log(content.slice(0, 1500));
}

if (fs.existsSync(cutiPage)) {
  console.log("=== CUTI PAGE ===");
  const content = fs.readFileSync(cutiPage, 'utf8');
  console.log(content.slice(0, 1500));
}
