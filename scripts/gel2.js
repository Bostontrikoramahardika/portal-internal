const fs=require('fs');const g=[];
function io(p){const r=fs.readFileSync(p,'utf8');return{r,crlf:r.includes('\r\n'),t:r.replace(/\r\n/g,'\n')};}
function save(p,t,crlf,r){if(!fs.existsSync(p+'.bak-gel2'))fs.writeFileSync(p+'.bak-gel2',r,'utf8');
  fs.writeFileSync(p,crlf?t.replace(/\n/g,'\r\n'):t,'utf8');}
function imporAman(t,baris){
  if(t.includes(baris))return t;
  const m=[...t.matchAll(/^import [\s\S]*?from '[^']+'\s*$/gm)].pop();
  if(!m)return null;
  return t.slice(0,m.index+m[0].length)+'\n'+baris+t.slice(m.index+m[0].length);
}
const SB="import StatBanner from '@/app/components/std/StatBanner'";

// A. KEAMANAN - token tidak lagi dikirim ke browser
{
  const p='app/api/data/route.ts';let {r,crlf,t}=io(p);
  if(t.includes('KOLOM_SENSITIF')){console.log('[--] api/data sudah');}
  else{
    const a='    const columns = getColumns(enriched, target_table)\n';
    const a2="return NextResponse.json({ type: 'table', title: menu_label, table: target_table, access_mode, columns, rows: enriched, total: enriched.length })";
    if(!t.includes(a)||!t.includes(a2)){g.push('api/data: jangkar tidak ketemu');}
    else{
      t=t.replace(a,"    const KOLOM_SENSITIF = [\n      'google_refresh_token', 'google_access_token',\n      'password', 'password_hash', 'session_token',\n    ]\n    const aman = (enriched || []).map((row) => {\n      const o = {}\n      for (const key of Object.keys(row || {})) {\n        if (!KOLOM_SENSITIF.includes(key)) o[key] = row[key]\n      }\n      return o\n    })\n\n    const columns = getColumns(aman, target_table).filter(\n      (c) => !KOLOM_SENSITIF.includes(c)\n    )\n");
      t=t.replace(a2,"return NextResponse.json({ type: 'table', title: menu_label, table: target_table, access_mode, columns, rows: aman, total: aman.length })");
      save(p,t,crlf,r);console.log('[OK] api/data - token dibersihkan');
    }
  }
}

// B. APD SAYA
{
  const p='app/dashboard/apd-saya/page.tsx';let {r,crlf,t}=io(p);
  if(t.includes('StatBanner')){console.log('[--] apd-saya sudah');}
  else{
    const a='    <div className="bg-[#f4f7fa] p-2 sm:p-3 lg:p-4 pb-24 text-slate-800">\n';
    if(!t.includes(a)){g.push('apd-saya: pembungkus tidak ketemu');}
    else{
      const t2=imporAman(t,SB); if(!t2){g.push('apd-saya: import gagal');}
      else{
        t=t2.replace(a,'    <div className="space-y-3 text-slate-800">\n      <StatBanner eyebrow="Profil Saya" title="APD Saya" subtitle="Riwayat alat pelindung diri" />\n');
        save(p,t,crlf,r);console.log('[OK] apd-saya');
      }
    }
  }
}

// C. MCU SAYA
{
  const p='app/dashboard/mcu-saya/page.tsx';let {r,crlf,t}=io(p);
  if(t.includes('StatBanner')){console.log('[--] mcu-saya sudah');}
  else{
    const a='    <div className="min-h-screen pb-24 sm:pb-8  bg-[#f4f7fa]" style={{ backgroundImage: \'radial-gradient(circle, #d1d5db 1px, transparent 1px)\', backgroundSize: \'24px 24px\' }}>\n      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">\n';
    if(!t.includes(a)){g.push('mcu-saya: pembungkus tidak ketemu');}
    else{
      const t2=imporAman(t,SB); if(!t2){g.push('mcu-saya: import gagal');}
      else{
        t=t2.replace(a,'    <div className="text-slate-800">\n      <div className="space-y-3">\n        <StatBanner eyebrow="Profil Saya" title="MCU Saya" subtitle="Medical Check-Up pribadi" />\n');
        save(p,t,crlf,r);console.log('[OK] mcu-saya');
      }
    }
  }
}

if(g.length){console.error('\nGAGAL:');g.forEach(x=>console.error('  - '+x));process.exit(1);}
console.log('\nGelombang 2 selesai.');