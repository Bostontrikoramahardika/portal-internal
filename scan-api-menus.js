const fs = require('fs');
const apiPath = './app/api/menus/route.ts';

if (fs.existsSync(apiPath)) {
  console.log("=== ISI APP/API/MENUS/ROUTE.TS ===");
  const content = fs.readFileSync(apiPath, 'utf8');
  console.log(content);
} else {
  console.log("File app/api/menus/route.ts tidak ditemukan!");
}
