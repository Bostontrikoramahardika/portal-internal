const fs=require('fs');const p='app/api/export-absensi-matrix/route.ts';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('lemburHitung')){console.log('Sudah terpasang.');process.exit(0);}
const g=[];
function sub(a,b,l){if(!s.includes(a)){g.push(l);return;}s=s.replace(a,b);}

sub(".select('nrp, nama, jabatan, departemen, site')",
    ".select('nrp, nama, jabatan, departemen, site, email')",'select employees');

sub("    const header = ['NO', 'NRP', 'NAMA', 'JABATAN', 'SITE', ...dayHeaders,",
`    const lemburHitung: Record<string, number> = {}
    {
      const nrpList = (employees || []).map((e: any) => String(e.nrp))
      if (nrpList.length) {
        const { data: ot } = await supabase
          .from('overtime_requests')
          .select('nrp, status_final, status_atasan, status_pjo')
          .in('nrp', nrpList)
          .gte('tanggal', tahunP + '-' + bulanP + '-01')
          .lte('tanggal', tahunP + '-' + bulanP + '-' + String(lastDayNum).padStart(2, '0'))
        ;(ot || []).forEach((l: any) => {
          const fin = String(l.status_final || '').toUpperCase()
          const ata = String(l.status_atasan || '').toUpperCase()
          const pjo = String(l.status_pjo || '').toUpperCase()
          if (fin.includes('DITOLAK') || ata === 'REJECTED' || pjo === 'REJECTED') return
          if (fin.includes('APPROVED') || fin.includes('DISETUJUI') || ata === 'APPROVED') {
            const k = String(l.nrp)
            lemburHitung[k] = (lemburHitung[k] || 0) + 1
          }
        })
      }
    }

    const header = ['NO', 'NRP', 'NAMA', 'JABATAN', 'SITE', ...dayHeaders,`,'blok lembur');

sub("                    'HDR', 'CT', 'CR', 'KMP', 'S', 'I', 'IR', 'A', 'OFF', '%']",
    "                    'HDR', 'DS', 'NS', 'CT', 'CR', 'KMP', 'S', 'I', 'IR', 'A', 'OFF', '%',\n                    'LEMBUR', 'EMAIL']",'header');

sub("const counter: any = { HDR: 0, CT: 0, CR: 0, KMP: 0, S: 0, I: 0, IR: 0, A: 0, OFF: 0, TOTAL_KERJA: 0 }",
    "const counter: any = { HDR: 0, DS: 0, NS: 0, CT: 0, CR: 0, KMP: 0, S: 0, I: 0, IR: 0, A: 0, OFF: 0, TOTAL_KERJA: 0 }",'counter');

sub("if (kode === 'DS' || kode === 'NS') { counter.HDR++; counter.TOTAL_KERJA++ }",
    "if (kode === 'DS' || kode === 'NS') { counter.HDR++; counter.TOTAL_KERJA++; if (kode === 'DS') counter.DS++; else counter.NS++ }",'hitung DS/NS');

sub("row.push(counter.HDR, counter.CT, counter.CR, counter.KMP, counter.S, counter.I, counter.IR, counter.A, counter.OFF, persen)",
    "row.push(counter.HDR, counter.DS, counter.NS, counter.CT, counter.CR, counter.KMP, counter.S, counter.I, counter.IR, counter.A, counter.OFF, persen,\n               lemburHitung[String(nrp)] || 0, emp.email || '')",'isi baris');

if(g.length){console.error('GAGAL:');g.forEach(x=>console.error('  - '+x));process.exit(1);}
fs.writeFileSync(p+'.bak-export',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - 6/6 perubahan export terpasang');