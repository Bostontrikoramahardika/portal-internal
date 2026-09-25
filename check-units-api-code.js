const fs = require('fs');
const apiPath = './app/api/units/route.ts';

if (fs.existsSync(apiPath)) {
  console.log("=== ISI APP/API/UNITS/ROUTE.TS ===");
  console.log(fs.readFileSync(apiPath, 'utf8'));
} else {
  console.log("File tidak ditemukan!");
}
