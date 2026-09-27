const fs = require('fs');
const path = require('path');

function findFile(filename) {
  function search(dir) {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        if (f !== 'node_modules' && f !== '.next') {
          const res = search(full);
          if (res) return res;
        }
      } else if (f.toLowerCase() === filename.toLowerCase() || f.toLowerCase() === filename.toLowerCase() + '.tsx' || f.toLowerCase() === filename.toLowerCase() + '.ts') {
        return full;
      }
    }
    return null;
  }
  return search(process.cwd());
}

const targets = ['SyncIndicator', 'ClockOutReminder', 'VerificationModal', 'AuthContext'];

console.log('=======================================================');
console.log('🔍 LOCATING MISSING COMPONENTS');
console.log('=======================================================');

targets.forEach(t => {
  const found = findFile(t);
  console.log(`${t} => ${found ? path.relative(process.cwd(), found) : 'NOT FOUND'}`);
});
console.log('=======================================================');
