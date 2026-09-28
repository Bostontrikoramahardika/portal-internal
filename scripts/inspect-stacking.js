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

const files = searchFiles(path.join(process.cwd(), 'app'));

console.log("=== PEMANGGILAN MOBILE BOTTOM NAV ===");
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('<MobileBottomNav') || content.includes('MobileBottomNav')) {
    console.log("NAV CALL:", path.relative(process.cwd(), f));
  }
});

console.log("\n=== PEMANGGILAN PAGE HEADER / HEADER ===");
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('<PageHeader') || content.includes('<header')) {
    console.log("HEADER CALL:", path.relative(process.cwd(), f));
  }
});

console.log("\n=== PEMANGGILAN APP LAYOUT ===");
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('<AppLayout')) {
    console.log("LAYOUT CALL:", path.relative(process.cwd(), f));
  }
});
