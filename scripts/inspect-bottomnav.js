const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'app', 'components', 'MobileBottomNav.tsx');
if (fs.existsSync(file)) {
  console.log(fs.readFileSync(file, 'utf8'));
}
