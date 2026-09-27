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
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = searchFiles(process.cwd());
const navFiles = allFiles.filter(f => {
  const content = fs.readFileSync(f, 'utf8');
  return content.includes('href="/dashboard') || content.includes('nav') || content.includes('menu') || content.includes('Sidebar') || content.includes('Header');
});

console.log("=== FILE DENGAN NAVIGASI / MENU ===");
navFiles.forEach(f => console.log(path.relative(process.cwd(), f)));
