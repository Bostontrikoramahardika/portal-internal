const fs = require('fs');
const path = require('path');
const https = require('https');

const fontsDir = path.join(process.cwd(), 'public', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const fonts = [
  {
    name: 'PlusJakartaSans-Regular.woff2',
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/plus-jakarta-sans@5.1.0/files/plus-jakarta-sans-latin-400-normal.woff2',
  },
  {
    name: 'PlusJakartaSans-Medium.woff2',
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/plus-jakarta-sans@5.1.0/files/plus-jakarta-sans-latin-500-normal.woff2',
  },
  {
    name: 'PlusJakartaSans-SemiBold.woff2',
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/plus-jakarta-sans@5.1.0/files/plus-jakarta-sans-latin-600-normal.woff2',
  },
  {
    name: 'PlusJakartaSans-Bold.woff2',
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/plus-jakarta-sans@5.1.0/files/plus-jakarta-sans-latin-700-normal.woff2',
  },
  {
    name: 'PlusJakartaSans-ExtraBold.woff2',
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/plus-jakarta-sans@5.1.0/files/plus-jakarta-sans-latin-800-normal.woff2',
  },
  {
    name: 'PlusJakartaSans-MediumItalic.woff2',
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/plus-jakarta-sans@5.1.0/files/plus-jakarta-sans-latin-500-italic.woff2',
  },
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    function get(currentUrl) {
      https.get(currentUrl, (response) => {
        // Handle redirect 301 / 302
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return get(response.headers.location);
        }
        
        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          return reject(new Error(`HTTP ${response.statusCode} for ${currentUrl}`));
        }
        
        response.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve());
        });
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
    }
    
    get(url);
  });
}

async function run() {
  console.log('=======================================================');
  console.log('🔤 MENDOWNLOAD FONT PLUS JAKARTA SANS (OFFLINE READY)...');
  console.log('=======================================================\n');

  let successCount = 0;
  for (const font of fonts) {
    const dest = path.join(fontsDir, font.name);
    process.stdout.write(`  ⏳ Downloading ${font.name}... `);
    try {
      await downloadFile(font.url, dest);
      const stat = fs.statSync(dest);
      const kb = (stat.size / 1024).toFixed(1);
      console.log(`✅ [${kb} KB]`);
      successCount++;
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
    }
  }

  console.log('\n=======================================================');
  if (successCount === fonts.length) {
    console.log(`✅ SEMUA FONT BERHASIL DIDOWNLOAD (${successCount}/${fonts.length})`);
    console.log(`📁 Lokasi: public/fonts/`);
    console.log('🚀 Aplikasi sekarang 100% OFFLINE-READY untuk typography!');
  } else {
    console.log(`⚠️ Download selesai dengan ${successCount}/${fonts.length} berhasil.`);
  }
  console.log('=======================================================');
}

run();
