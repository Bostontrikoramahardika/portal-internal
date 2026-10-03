const fs=require('fs');const gagal=[];
function io(p){const r=fs.readFileSync(p,'utf8');return{r,crlf:r.includes('\r\n'),t:r.replace(/\r\n/g,'\n')};}
function save(p,t,crlf,r,tag){if(!fs.existsSync(p+tag))fs.writeFileSync(p+tag,r,'utf8');
  fs.writeFileSync(p,crlf?t.replace(/\n/g,'\r\n'):t,'utf8');}

// A. layout: pastikan MenuTabs ada + dibungkus Suspense
{
  const p='app/dashboard/layout.tsx';let {r,crlf,t}=io(p);let ubah=false;
  if(!t.includes('MenuTabs')){
    const imp=[...t.matchAll(/^import .*$/gm)].pop();
    t=t.slice(0,imp.index+imp[0].length)+"\nimport MenuTabs from '@/app/components/MenuTabs'"+t.slice(imp.index+imp[0].length);
    if(!/\{children\}/.test(t)){gagal.push('layout: {children} tidak ketemu');}
    else{t=t.replace(/([ \t]*)\{children\}/,(m,i)=>i+'<Suspense fallback={null}><MenuTabs menus={menus} /></Suspense>\n'+i+'{children}');ubah=true;}
  } else if(!t.includes('<Suspense fallback={null}><MenuTabs')){
    t=t.replace('<MenuTabs menus={menus} />','<Suspense fallback={null}><MenuTabs menus={menus} /></Suspense>');ubah=true;
  }
  if(!/import[^\n]*\bSuspense\b[^\n]*from 'react'/.test(t)){
    if(/import React, \{[^}]*\} from 'react'/.test(t)){
      t=t.replace(/(import React, \{)([^}]*)(\} from 'react')/,(m,a,b,c)=>a+b.replace(/\s*,?\s*$/,'')+', Suspense '+c);ubah=true;
    } else if(/import \{[^}]*\} from 'react'/.test(t)){
      t=t.replace(/(import \{)([^}]*)(\} from 'react')/,(m,a,b,c)=>a+b.replace(/\s*,?\s*$/,'')+', Suspense '+c);ubah=true;
    } else {gagal.push('layout: import react tidak ketemu');}
  }
  if(ubah&&!gagal.length){save(p,t,crlf,r,'.bak-final');console.log('[OK] layout.tsx');}
  else if(!gagal.length)console.log('[--] layout.tsx sudah benar');
}

// B. /api/data: cabang riwayat_sakit
{
  const p='app/api/data/route.ts';let {r,crlf,t}=io(p);
  if(t.includes('riwayat_sakit')){console.log('[--] api/data sudah ada');}
  else{
    const a="    if (menuKey === 'evident_sakit' || access_mode === 'FORM_SAKIT') {";
    if(!t.includes(a)){gagal.push('api/data: jangkar evident_sakit tidak ketemu');}
    else{
      const blok="    // RIWAYAT SAKIT / IZIN - milik sendiri, seluruh periode\n"+
      "    if (menuKey === 'riwayat_sakit') {\n"+
      "      const { data: rows } = await supabase\n"+
      "        .from('attendance_evidences')\n"+
      "        .select('*')\n"+
      "        .or(`nrp.eq.${session.nrp},nama_karyawan.ilike.%${session.nama}%`)\n"+
      "        .order('tanggal', { ascending: false })\n"+
      "        .limit(200)\n\n"+
      "      return NextResponse.json({\n"+
      "        type: 'table',\n"+
      "        title: menu_label || 'Riwayat Sakit / Izin',\n"+
      "        rows: rows || [],\n"+
      "        columns: ['tanggal', 'jenis', 'keterangan', 'status'],\n"+
      "        table: 'attendance_evidences',\n"+
      "        access_mode: 'VIEW_ONLY'\n"+
      "      })\n"+
      "    }\n\n";
      t=t.replace(a,blok+a);save(p,t,crlf,r,'.bak-final');console.log('[OK] api/data/route.ts');
    }
  }
}

if(gagal.length){console.error('\nGAGAL:');gagal.forEach(g=>console.error('  - '+g));process.exit(1);}
console.log('\nBlok 1 selesai. Cadangan: *.bak-final');