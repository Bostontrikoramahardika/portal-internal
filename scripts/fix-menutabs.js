const fs=require('fs');
const gagal=[];
function io(p){const r=fs.readFileSync(p,'utf8');return{r,crlf:r.includes('\r\n'),t:r.replace(/\r\n/g,'\n')};}
function save(p,t,crlf,r){if(!fs.existsSync(p+'.bak-fixtabs'))fs.writeFileSync(p+'.bak-fixtabs',r,'utf8');
  fs.writeFileSync(p,crlf?t.replace(/\n/g,'\r\n'):t,'utf8');}

// FIX 1 - MenuTabs pakai useSearchParams
{
  const p='app/components/MenuTabs.tsx';
  let {r,crlf,t}=io(p);
  if(t.includes('useSearchParams')){console.log('[--] MenuTabs sudah benar');}
  else{
    t=t.replace("import React, { useEffect, useState } from 'react';",
      "import React from 'react';");
    t=t.replace("import Link from 'next/link';",
      "import Link from 'next/link';\nimport { useSearchParams } from 'next/navigation';");
    const a=t.indexOf("const [menuKey, setMenuKey]");
    const b=t.indexOf("}, []);");
    if(a<0||b<0){gagal.push('MenuTabs: blok state tidak ketemu');}
    else{
      t=t.slice(0,a)+"const sp = useSearchParams();\n  const menuKey = sp?.get('menu') || '';\n"+t.slice(b+7);
      t=t.replace(/\s*onClick=\{\(\) => setMenuKey\(t\.menu_key\)\}/,'');
      save(p,t,crlf,r);console.log('[OK] MenuTabs');
    }
  }
}

// FIX 1b - Suspense di layout
{
  const p='app/dashboard/layout.tsx';
  let {r,crlf,t}=io(p);
  if(t.includes('<Suspense fallback={null}><MenuTabs')){console.log('[--] layout sudah benar');}
  else if(!t.includes('<MenuTabs')){gagal.push('layout: <MenuTabs> belum ada, jalankan add-menutabs.js dulu');}
  else{
    t=t.replace('<MenuTabs menus={menus} />','<Suspense fallback={null}><MenuTabs menus={menus} /></Suspense>');
    if(!/import[^\n]*\bSuspense\b[^\n]*from 'react'/.test(t)){
      t=t.replace(/(import React, \{)([^}]*)(\} from 'react')',
        (m,x,y,z)=>x+y.replace(/\s*$/,'').replace(/,$/,'')+', Suspense '+z);
    }
    save(p,t,crlf,r);console.log('[OK] layout + Suspense');
  }
}

// FIX 2 - sembunyikan menu anak dari grid lama
{
  const p='app/components/MobileBottomNav.tsx';
  let {r,crlf,t}=io(p);
  if(t.includes('kunciAnak')){console.log('[--] MobileBottomNav sudah benar');}
  else{
    const a='const currentItems = rawItems.filter(item => {';
    if(!t.includes(a)){gagal.push('MobileBottomNav: currentItems tidak ketemu');}
    else{
      t=t.replace(a,
`const kunciAnak = new Set(
    (menus || [])
      .filter((m) => m && m.parent_menu_key)
      .map((m) => String(m.menu_key))
  );

  const currentItems = rawItems.filter(item => {
    const hrefMenu = String(item.href || '').split('menu=')[1] || '';
    if (hrefMenu && kunciAnak.has(hrefMenu)) return false;
`);
      save(p,t,crlf,r);console.log('[OK] MobileBottomNav');
    }
  }
}

if(gagal.length){console.error('\nGAGAL:');gagal.forEach(g=>console.error('  - '+g));process.exit(1);}
console.log('\nSELESAI. Cadangan: *.bak-fixtabs');