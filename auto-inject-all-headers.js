const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file === 'page.tsx') {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

const appDir = path.join(__dirname, 'app');
const allPageFiles = getAllFiles(appDir);

let updatedCount = 0;

allPageFiles.forEach(filePath => {
  const relativePath = path.relative(appDir, filePath).replace(/\\/g, '/');
  
  // Skip root landing page if desired, or skip components
  if (relativePath === 'page.tsx' || relativePath.includes('test-google') || relativePath.includes('debug-apd')) {
    return;
  }

  let code = fs.readFileSync(filePath, 'utf8');

  // If page doesn't have PageHeader yet and is client-side or static page
  if (!code.includes('PageHeader')) {
    // Derive nice title from route path
    const pathParts = relativePath.split('/');
    let title = pathParts[pathParts.length - 2] || 'Portal';
    
    // Clean up title name
    title = title
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
      
    if (title.toLowerCase() === 'app' || title.toLowerCase() === 'dashboard') {
      title = 'Dashboard Central';
    }

    // Determine back target
    let backTarget = '/dashboard';
    if (relativePath.startsWith('dashboard/monitoring-mcu/')) backTarget = '/dashboard/monitoring-mcu';
    else if (relativePath.startsWith('dashboard/kelola-event/')) backTarget = '/dashboard/kelola-event';
    else if (relativePath.startsWith('dashboard/plant/')) backTarget = '/dashboard/plant';
    else if (relativePath.startsWith('scan/')) backTarget = '/dashboard';

    // Inject Import PageHeader
    const importStatement = `import PageHeader from "@/app/components/PageHeader";\n`;
    
    // Inject component header if return statement exists
    if (code.includes('return (') || code.includes('return(')) {
      code = importStatement + code;
      
      const headerJSX = `<PageHeader title="${title}" backUrl="${backTarget}" />\n`;
      
      // Inject header right after outer <div> or main wrapper
      if (code.includes('<main')) {
        code = code.replace(/<main([^>]*)>/, `<main$1>\n        ${headerJSX}`);
      } else if (code.includes('<div')) {
        code = code.replace(/<div([^>]*)>/, `<div$1>\n      ${headerJSX}`);
      }
      
      fs.writeFileSync(filePath, code, 'utf8');
      updatedCount++;
      console.log(`[UPDATED] Back button & header added to: /app/${relativePath}`);
    }
  }
});

console.log(`\n✅ Done! Total ${updatedCount} pages injected with standardized Back Buttons & Headers.`);
