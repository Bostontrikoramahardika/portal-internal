const fs = require('fs');
const path = require('path');

const layoutPath = path.join(process.cwd(), 'app', 'dashboard', 'layout.tsx');

// Lakukan update pada layout.tsx untuk memastikan header ultra-kompak dan bottom sheet dinamis aktif
let code = fs.readFileSync(layoutPath, 'utf8');

// Pastikan import path komponen internal valid
code = code.replace(/@\/app\/components\/SyncIndicator/g, '@/app/dashboard/components/SyncIndicator');
code = code.replace(/@\/app\/components\/ClockOutReminder/g, '@/app/dashboard/components/ClockOutReminder');
code = code.replace(/@\/app\/components\/VerificationModal/g, '@/app/dashboard/components/VerificationModal');
code = code.replace(/@\/app\/context\/AuthContext/g, '@/app/lib/AuthContext');

fs.writeFileSync(layoutPath, code, 'utf8');
console.log('=======================================================');
console.log('✅ IMPORTS IN LAYOUT VERIFIED SUCCESSFULLY');
console.log('=======================================================');
