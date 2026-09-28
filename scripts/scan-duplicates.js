const fs = require('fs');
const path = require('path');

function searchFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        searchFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const dashFiles = searchFiles(path.join(process.cwd(), 'app', 'dashboard'));

console.log("=== CHECK DUPLIKASI APPFOOTER DI SUB-HALAMAN ===");
dashFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('<AppFooter') && !f.endsWith('layout.tsx')) {
    console.log("FOOTER GANDA:", path.relative(process.cwd(), f));
  }
});

console.log("\n=== CHECK DOKUMEN DENGAN PADDING / CONTAINER OVERLAP ===");
dashFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('fixed top-0') || content.includes('sticky top-0') || content.includes('h-screen')) {
    console.log("POTENSI OVERLAP STICKY/FIXED:", path.relative(process.cwd(), f));
  }
});
