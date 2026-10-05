const fs=require('fs');const p='app/api/attendance/matrix/route.ts';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
const a1="const { data: lemburRows } = await supabase\n      .from('overtime_requests')";
const a2="const { data: ap } = await supabase\n        .from('employees')";
let n=0;
if(s.includes(a1)){s=s.replace(a1,a1.replace('await supabase','await supabaseAdmin'));n++;}
if(s.includes(a2)){s=s.replace(a2,a2.replace('await supabase','await supabaseAdmin'));n++;}
if(!n){console.log('Sudah benar atau pola tidak ketemu.');process.exit(0);}
if(/await supabase\s*\n\s*\.from/.test(s)){console.error('GAGAL: masih ada await supabase');process.exit(1);}
fs.writeFileSync(p+'.bak-fixsb',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - '+n+' pemanggilan diperbaiki jadi supabaseAdmin');