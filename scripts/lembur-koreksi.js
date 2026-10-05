const fs=require('fs');const p='app/dashboard/kirim-rekap/page.tsx';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('jmlLembur')){console.log('Sudah terpasang.');process.exit(0);}
const g=[];function sub(a,b,l){if(!s.includes(a)){g.push(l);return;}s=s.replace(a,b);}

sub("const [nominal, setNominal] = useState<Record<string, { lembur: number; piket: number; jmlPiket: number }>>({})",
    "const [nominal, setNominal] = useState<Record<string, { lembur: number; piket: number; jmlPiket: number; jmlLembur?: number }>>({})",'state');

sub(`  function setNom(nrp: string, k: 'lembur' | 'piket' | 'jmlPiket', v: number) {
    setNominal((s) => ({ ...s, [nrp]: { lembur: 0, piket: 0, jmlPiket: 0, ...(s[nrp] || {}), [k]: v } }))
  }`,
`  function setNom(nrp: string, k: 'lembur' | 'piket' | 'jmlPiket' | 'jmlLembur', v: number) {
    setNominal((s) => ({ ...s, [nrp]: { lembur: 0, piket: 0, jmlPiket: 0, ...(s[nrp] || {}), [k]: v } }))
  }

  function jmlLemburDipakai(r: any) {
    const n = nominal[r.nrp]
    return n?.jmlLembur !== undefined ? Number(n.jmlLembur) : Number(r.summary?.lembur || 0)
  }`,'fungsi');

sub(`                        <td className="px-2 py-1.5 text-center">
                          <button type="button"
                            onClick={() => setDetailLembur({ nama: r.nama, list: r.lembur || [] })}
                            disabled={!Number(r.summary?.lembur)}
                            className={'font-bold ' + (Number(r.summary?.lembur)
                              ? 'text-[#0b2a5b] underline decoration-dotted underline-offset-2 hover:text-blue-600'
                              : 'text-slate-400')}>
                            {r.summary?.lembur ?? 0}
                          </button>
                        </td>`,
`                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1 justify-center">
                            <input type="number" min={0} value={jmlLemburDipakai(r)}
                              onChange={(e) => setNom(r.nrp, 'jmlLembur', Math.max(0, Number(e.target.value) || 0))}
                              className="w-12 px-1 py-1 rounded border border-slate-200 text-[11px] text-center font-bold" />
                            <button type="button" title="Lihat rincian lembur"
                              onClick={() => setDetailLembur({ nama: r.nama, list: r.lembur || [] })}
                              disabled={!Number(r.summary?.lembur)}
                              className={'w-5 h-5 rounded-full text-[10px] font-black shrink-0 ' +
                                (Number(r.summary?.lembur)
                                  ? 'bg-[#0b2a5b] text-white hover:bg-blue-700'
                                  : 'bg-slate-100 text-slate-300')}>
                              i
                            </button>
                          </div>
                        </td>`,'kolom lembur');

sub("{rupiah(Number(r.summary?.lembur || 0) * Number(n.lembur || 0))}",
    "{rupiah(jmlLemburDipakai(r) * Number(n.lembur || 0))}",'total lembur');

sub("          jml_lembur: Number(r.summary?.lembur || 0),",
    "          jml_lembur: jmlLemburDipakai(r),",'data kirim');

if(g.length){console.error('GAGAL:');g.forEach(x=>console.error('  - '+x));process.exit(1);}
fs.writeFileSync(p+'.bak-koreksi',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - 5/5 perubahan terpasang');