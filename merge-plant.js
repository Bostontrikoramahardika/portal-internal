const fs = require('fs');
const path = require('path');

// Read previous file content
const prevPath = path.join(process.cwd(), 'prev_plant_page.tsx');
let prevContent = '';
if (fs.existsSync(prevPath)) {
  prevContent = fs.readFileSync(prevPath, 'utf-8');
}

console.log('Prev file length:', prevContent.length);
