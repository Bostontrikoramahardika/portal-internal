const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        walk(filepath, callback);
      }
    } else if (filepath.endsWith('.tsx') || filepath.endsWith('.jsx')) {
      callback(filepath);
    }
  }
}

console.log('=======================================================');
console.log('🔍 SEARCHING FOR DUPLICATE BOTTOM NAVS & OVERLAPPING ELEMENTS');
console.log('=======================================================');

const matches = [];

walk(path.join(process.cwd(), 'app'), (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(process.cwd(), filePath);

  // Check if file contains fixed bottom elements or navs
  if (
    content.includes('fixed bottom-0') ||
    content.includes('MobileBottomNav') ||
    content.includes('bottom-nav') ||
    content.includes('fixed bottom')
  ) {
    matches.push(relPath);
  }
});

console.log('Found fixed bottom references in files:');
matches.forEach(m => console.log(' - ' + m));

console.log('=======================================================');
