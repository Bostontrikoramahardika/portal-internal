const fs=require('fs');const p='app/api/export-absensi-matrix/route.ts';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('nominalMap')){console.log('Sudah terpasang.');process.exit(0);}
if(!s.includes('lemburHitung')){console.error('GAGAL: jalankan export-kolom.js dulu');process.exit(1);}
const g=[];
function sub(a,b,l){if(!s.includes(a)){g.push(l);return;}s=s.replace(a,b);}

sub("    const header = ['NO', 'NRP', 'NAMA', 'JABATAN', 'SITE', ...dayHeaders,",
`    const nominalMap: Record<string, any> = {}
    {
      const bulanKey = tahunP + '-' + bulanP
      const { data: per } = await supabase
        .from('rekap_periode').select('id').eq('bulan', bulanKey)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (per?.id) {
        const { data: it } = await supabase
          .from('rekap_item')
          .select('nrp, nominal_lembur, total_lembur, jml_piket, nominal_piket, total_piket, status')
          .eq('periode_id', per.id)
        ;(it || []).forEach((x: any) => (nominalMap[String(x.nrp)] = x))
      }
    }

    const header = ['NO', 'NRP', 'NAMA', 'JABATAN', 'SITE', ...dayHeaders,`,'blok nominal');

sub("                    'LEMBUR', 'EMAIL']",
`                    'LEMBUR', 'NOMINAL LEMBUR', 'TOTAL LEMBUR',
                    'PIKET', 'NOMINAL PIKET', 'TOTAL PIKET', 'STATUS KIRIM', 'EMAIL']`,'header');

sub("               lemburHitung[String(nrp)] || 0, emp.email || '')",
`               lemburHitung[String(nrp)] || 0,
               Number(nominalMap[String(nrp)]?.nominal_lembur || 0),
               Number(nominalMap[String(nrp)]?.total_lembur || 0),
               Number(nominalMap[String(nrp)]?.jml_piket || 0),
               Number(nominalMap[String(nrp)]?.nominal_piket || 0),
               Number(nominalMap[String(nrp)]?.total_piket || 0),
               nominalMap[String(nrp)]?.status || '-',
               emp.email || '')`,'isi baris');

if(g.length){console.error('GAGAL:');g.forEach(x=>console.error('  - '+x));process.exit(1);}
fs.writeFileSync(p+'.bak-nominal',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - 3/3 kolom nominal terpasang');