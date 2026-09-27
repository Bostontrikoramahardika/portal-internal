const fs = require('fs');
const path = require('path');

const dashboardDir = path.join(process.cwd(), 'app', 'dashboard');

function getRoutes(dir, baseRoute) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      const subDir = path.join(dir, item.name);
      const currentRoute = baseRoute + '/' + item.name;
      if (fs.existsSync(path.join(subDir, 'page.tsx')) || fs.existsSync(path.join(subDir, 'page.ts'))) {
        results.push(currentRoute);
      }
      results.push(...getRoutes(subDir, currentRoute));
    }
  }
  return results;
}

console.log("==========================================");
console.log("DAFTAR SELURUH HALAMAN DASI DI APP/DASHBOARD");
console.log("==========================================");
const allRoutes = ['/dashboard', ...getRoutes(dashboardDir, '/dashboard')];
allRoutes.forEach(function(r) {
  console.log("PAGE ROUTE:", r);
});
