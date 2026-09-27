const fs = require('fs');
const path = require('path');

const sidebarPath = path.join(process.cwd(), 'app', 'components', 'Sidebar.tsx');
if (fs.existsSync(sidebarPath)) {
  const content = fs.readFileSync(sidebarPath, 'utf8');
  console.log("=== ISI STRUCTURAL SIDEBAR.TSX ===");
  console.log(content);
} else {
  console.log("File Sidebar.tsx tidak ditemukan pada path:", sidebarPath);
  const compDir = path.join(process.cwd(), 'app', 'components');
  if (fs.existsSync(compDir)) {
    console.log("File di app/components:", fs.readdirSync(compDir));
  }
}
