const fs=require('fs');const p='app/dashboard/kirim-rekap/page.tsx';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('grupTampil')){console.log('Sudah terpasang.');process.exit(0);}

const a='  const terpilih = useMemo(() => rowsTampil.filter((r) => pilih[r.nrp]), [rowsTampil, pilih])';
if(!s.includes(a)){console.error('GAGAL: terpilih tidak ketemu');process.exit(1);}
s=s.replace(a,`  const grupTampil = useMemo(() => {
    const urut = ['Staff', 'Plant', 'Operator', 'Lainnya']
    const peta: Record<string, any[]> = {}
    rowsTampil.forEach((r) => {
      const g = r._gol || 'Lainnya'
      if (!peta[g]) peta[g] = []
      peta[g].push(r)
    })
    const kunci = Object.keys(peta).sort((x, y) => {
      const ix = urut.indexOf(x), iy = urut.indexOf(y)
      return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy) || x.localeCompare(y)
    })
    return kunci.map((k) => ({ nama: k, rows: peta[k] }))
  }, [rowsTampil])

` + a + `

  function toggleGrup(rowsGrup: any[], nyala: boolean) {
    setPilih((s) => {
      const n = { ...s }
      rowsGrup.forEach((r) => (n[r.nrp] = nyala))
      return n
    })
  }`);

const b='                <tbody>\n                  {rowsTampil.map((r, i) => {';
if(!s.includes(b)){console.error('GAGAL: tbody tidak ketemu');process.exit(1);}
s=s.replace(b,`                <tbody>
                  {grupTampil.map((grup) => {
                    const semuaTercentang = grup.rows.every((r: any) => pilih[r.nrp])
                    const adaTercentang = grup.rows.some((r: any) => pilih[r.nrp])
                    return (
                      <>
                      <tr key={'h-' + grup.nama} className="bg-slate-100 border-y border-slate-200">
                        <td colSpan={6} className="px-2 py-1.5 sticky left-0 z-20 bg-slate-100">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={semuaTercentang}
                              ref={(el) => { if (el) el.indeterminate = !semuaTercentang && adaTercentang }}
                              onChange={(e) => toggleGrup(grup.rows, e.target.checked)}
                            />
                            <span className="text-[11px] font-black uppercase tracking-wider text-[#0b2a5b]">
                              {grup.nama} ({grup.rows.length} orang)
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                              {grup.rows.filter((r: any) => pilih[r.nrp]).length} dipilih
                            </span>
                          </label>
                        </td>
                      </tr>
                      {grup.rows.map((r: any, i: number) => {`);

const c='                      </tr>\n                    )\n                  })}\n                </tbody>';
if(!s.includes(c)){console.error('GAGAL: penutup tbody tidak ketemu');process.exit(1);}
s=s.replace(c,'                      </tr>\n                    )\n                  })}\n                      </>\n                    )\n                  })}\n                </tbody>');

s=s.replace('                    <th className="px-2 py-2">Golongan</th>\n','');
s=s.replace(`                        <td className="px-2 py-1.5">
                          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-black uppercase">
                            {r._gol}
                          </span>
                        </td>
`,'');
fs.writeFileSync(p+'.bak-grup',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - tabel dikelompokkan + checkbox per kelompok');