const fs=require('fs');const p='app/api/attendance/matrix/route.ts';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('lemburMap')){console.log('Sudah terpasang.');process.exit(0);}
const a='  const attMap: Record<string, any> = {}';
if(!s.includes(a)){console.error('GAGAL: attMap tidak ketemu');process.exit(1);}
const blok=`  // ---------- LEMBUR disetujui pada bulan ini ----------
  const nrpSemua = employees.map((e) => e.nrp)
  const lemburMap = {}
  if (nrpSemua.length) {
    const awalBln = tahun + '-' + String(bln).padStart(2,'0') + '-01'
    const akhirBln = tahun + '-' + String(bln).padStart(2,'0') + '-' + String(jmlHari).padStart(2,'0')
    const { data: lemburRows } = await supabase
      .from('overtime_requests')
      .select('nrp, tanggal, alasan, jam_mulai, jam_selesai, status_final, status_atasan, status_pjo, atasan_nrp, pjo_nrp')
      .in('nrp', nrpSemua).gte('tanggal', awalBln).lte('tanggal', akhirBln)

    const disetujui = (lemburRows || []).filter((l) =>
      String(l.status_final || '').toUpperCase().includes('APPROVED') ||
      String(l.status_final || '').toUpperCase().includes('DISETUJUI') ||
      (String(l.status_atasan).toUpperCase() === 'APPROVED' &&
       String(l.status_pjo).toUpperCase() === 'APPROVED'))

    const approverNrp = Array.from(new Set(
      disetujui.flatMap((l) => [l.pjo_nrp, l.atasan_nrp]).filter(Boolean).map(String)))
    const namaMap = {}
    if (approverNrp.length) {
      const { data: ap } = await supabase
        .from('employees').select('nrp, nama, jabatan').in('nrp', approverNrp)
      ;(ap || []).forEach((x) => {
        namaMap[String(x.nrp)] = x.jabatan ? x.nama + ' (' + x.jabatan + ')' : x.nama
      })
    }

    disetujui.forEach((l) => {
      const k = String(l.nrp)
      if (!lemburMap[k]) lemburMap[k] = []
      lemburMap[k].push({
        tanggal: l.tanggal, alasan: l.alasan || '-',
        jam_mulai: l.jam_mulai || null, jam_selesai: l.jam_selesai || null,
        disetujui_oleh: namaMap[String(l.pjo_nrp)] || namaMap[String(l.atasan_nrp)] || null,
      })
    })
    Object.keys(lemburMap).forEach((k) =>
      lemburMap[k].sort((x, y) => String(x.tanggal).localeCompare(String(y.tanggal))))
  }

`;
s=s.replace(a,blok+a);
const a2='    return {\n      nrp: emp.nrp,\n      nama: emp.nama,';
if(!s.includes(a2)){console.error('GAGAL: blok return baris tidak ketemu');process.exit(1);}
s=s.replace(a2,'    const lemburList = lemburMap[String(emp.nrp)] || []\n\n'+a2+'\n      lembur: lemburList,');
const a3='        alpha,\n        stb,\n        persen';
if(!s.includes(a3)){console.error('GAGAL: blok summary tidak ketemu');process.exit(1);}
s=s.replace(a3,'        alpha,\n        stb,\n        lembur: lemburList.length,\n        persen');
fs.writeFileSync(p+'.bak-lembur',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - matrix mengirim rincian lembur + penyetuju');