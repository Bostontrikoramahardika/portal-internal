const fs = require('fs');
const path = require('path');

function searchFiles(dir, results = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchFiles(fullPath, results);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('BTM MOBILE APP') || content.includes('rck_Production')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const appDir = path.join(__dirname, '..', 'app');
const found = searchFiles(appDir);

console.log('\n================================================================');
console.log('       FILE YANG MEMILIKI FOOTER "BTM MOBILE APP V1.7.0"       ');
console.log('================================================================\n');

found.forEach((file, index) => {
  const relPath = path.relative(path.join(__dirname, '..'), file);
  console.log(`${index + 1}. ${relPath}`);
});

console.log('\n================================================================\n');