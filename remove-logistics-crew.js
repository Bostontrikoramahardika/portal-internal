const fs = require('fs');
const filePath = './app/dashboard/plant/page.tsx';

let content = fs.readFileSync(filePath, 'utf8');

// Modifikasi filter departemen agar mengecualikan logistik secara tegas
const oldFilter = `const plantEmployees = json.data.filter(function(e: Employee) {
          const dept = (e.departemen || "").toLowerCase();
          return dept.includes("plant") || dept.includes("mekanik") || dept.includes("mechanic") || dept.includes("workshop") || dept.includes("logistik");
        });`;

const newFilter = `const plantEmployees = json.data.filter(function(e: Employee) {
          const dept = (e.departemen || "").toLowerCase();
          const isLogistik = dept.includes("logistik") || dept.includes("warehouse") || dept.includes("gudang");
          return (dept.includes("plant") || dept.includes("mekanik") || dept.includes("mechanic") || dept.includes("workshop") || dept.includes("crew")) && !isLogistik;
        });`;

if (content.includes(oldFilter)) {
  content = content.replace(oldFilter, newFilter);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("✓ Berhasil menyaring keluar departemen Logistik dari Kru & Workshop!");
} else {
  // Fallback jika formatting spasi agak berbeda
  console.log("Gagal replace dengan string presisi, mencoba pencarian parsial...");
  content = content.replace(
    /return dept\.includes\("plant"\) \|\| dept\.includes\("mekanik"\) \|\| dept\.includes\("mechanic"\) \|\| dept\.includes\("workshop"\) \|\| dept\.includes\("logistik"\);/g,
    `const isLogistik = dept.includes("logistik") || dept.includes("warehouse") || dept.includes("gudang");\n          return (dept.includes("plant") || dept.includes("mekanik") || dept.includes("mechanic") || dept.includes("workshop")) && !isLogistik;`
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("✓ Backup patch parsial berhasil diterapkan.");
}
