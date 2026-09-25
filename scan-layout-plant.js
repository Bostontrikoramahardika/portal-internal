const fs = require('fs');
const content = fs.readFileSync('./app/dashboard/layout.tsx', 'utf8');
const lines = content.split('\n');

console.log("=== 1. DEFINISI SUBMENU PLANT DI LAYOUT.TSX (L250-L325) ===");
lines.slice(250, 325).forEach((l, i) => console.log(`${i+251}: ${l}`));

console.log("\n=== 2. ROUTING & ONCLICK PLANT DI LAYOUT.TSX (L790-L865) ===");
lines.slice(790, 865).forEach((l, i) => console.log(`${i+791}: ${l}`));
