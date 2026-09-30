const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Clean up temp script files
const scriptsDir = path.join(process.cwd(), 'scripts');
if (fs.existsSync(scriptsDir)) {
  const files = fs.readdirSync(scriptsDir);
  for (const file of files) {
    if (file.endsWith('.js') && file !== 'save-v170.js') {
      fs.unlinkSync(path.join(scriptsDir, file));
      console.log('Cleaned up script:', file);
    }
  }
}

try {
  console.log('\n--- 1. Git Add ---');
  execSync('git add .', { stdio: 'inherit' });

  console.log('\n--- 2. Git Commit ---');
  execSync('git commit -m "feat: release v1.7.0 - desktop sidebar fix, mobile floating pills, cuti separation & absensi redesign"', { stdio: 'inherit' });

  console.log('\n--- 3. Git Push ---');
  execSync('git push origin main', { stdio: 'inherit' });

  console.log('\n========================================');
  console.log('✅ BERHASIL DISIMPAN & DIPUSH KE VERCEL!');
  console.log('========================================');
} catch (err) {
  console.error('Git error:', err.message);
}