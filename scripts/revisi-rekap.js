const fs=require('fs');const p='app/dashboard/kirim-rekap/page.tsx';
const r=fs.readFileSync(p,'utf8');const crlf=r.includes('\r\n');let s=r.replace(/\r\n/g,'\n');
if(s.includes('detailLembur')){console.log('Sudah terpasang.');process.exit(0);}
const g=[];
function sub(a,b,label){ if(!s.includes(a)){g.push(label);return;} s=s.replace(a,b); }

sub("  const [filterGol, setFilterGol] = useState('ALL')",
    "  const [filterGol, setFilterGol] = useState('ALL')\n  const [detailLembur, setDetailLembur] = useState<any>(null)",'state modal');

sub('                    <th className="px-2 py-2">Nominal Lembur</th>',
    '                    <th className="px-2 py-2">Nominal / Lembur</th>\n                    <th className="px-2 py-2 text-right">Total Lembur</th>','header lembur');

sub('                    <th className="px-2 py-2">Nominal Piket</th>',
    '                    <th className="px-2 py-2">Nominal / Piket</th>\n                    <th className="px-2 py-2 text-right">Total Piket</th>','header piket');

sub('colSpan={6}','colSpan={8}','colspan');

sub('                        <td className="px-2 py-1.5 text-center font-bold">{r.summary?.lembur ?? 0}</td>',
`                        <td className="px-2 py-1.5 text-center">
                          <button type="button"
                            onClick={() => setDetailLembur({ nama: r.nama, list: r.lembur || [] })}
                            disabled={!Number(r.summary?.lembur)}
                            className={'font-bold ' + (Number(r.summary?.lembur)
                              ? 'text-[#0b2a5b] underline decoration-dotted underline-offset-2 hover:text-blue-600'
                              : 'text-slate-400')}>
                            {r.summary?.lembur ?? 0}
                          </button>
                        </td>`,'angka lembur');

sub(`                        <td className="px-2 py-1.5">
                          <input type="number" min={0} value={n.lembur}
                            onChange={(e) => setNom(r.nrp, 'lembur', Number(e.target.value) || 0)}
                            className="w-24 px-1.5 py-1 rounded border border-slate-200 text-[11px]" />
                        </td>`,
`                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-400">Rp</span>
                            <input type="number" min={0} value={n.lembur}
                              onChange={(e) => setNom(r.nrp, 'lembur', Number(e.target.value) || 0)}
                              className="w-24 px-1.5 py-1 rounded border border-slate-200 text-[11px]" />
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-right font-black text-[#0b2a5b] whitespace-nowrap">
                          {rupiah(Number(r.summary?.lembur || 0) * Number(n.lembur || 0))}
                        </td>`,'input lembur');

sub(`                        <td className="px-2 py-1.5">
                          <input type="number" min={0} value={n.piket}
                            onChange={(e) => setNom(r.nrp, 'piket', Number(e.target.value) || 0)}
                            className="w-24 px-1.5 py-1 rounded border border-slate-200 text-[11px]" />
                        </td>`,
`                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-400">Rp</span>
                            <input type="number" min={0} value={n.piket}
                              onChange={(e) => setNom(r.nrp, 'piket', Number(e.target.value) || 0)}
                              className="w-24 px-1.5 py-1 rounded border border-slate-200 text-[11px]" />
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-right font-black text-[#0b2a5b] whitespace-nowrap">
                          {rupiah(Number(n.jmlPiket || 0) * Number(n.piket || 0))}
                        </td>`,'input piket');

sub("      {tab === 'pantau' && (",
`      {detailLembur && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
          onClick={() => setDetailLembur(null)}>
          <div className="absolute inset-0 bg-slate-900/60" />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 bg-[#0b2a5b] text-white flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-widest text-blue-200">Rincian Lembur</div>
                <div className="text-sm font-black truncate">{detailLembur.nama}</div>
              </div>
              <button onClick={() => setDetailLembur(null)}
                className="w-7 h-7 rounded-full bg-white/15 text-white font-bold shrink-0">&#10005;</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
              {(!detailLembur.list || detailLembur.list.length === 0) && (
                <p className="py-6 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Tidak ada lembur
                </p>
              )}
              {(detailLembur.list || []).map((l: any, i: number) => (
                <div key={i} className="border border-slate-200 rounded-xl p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-[#0b2a5b]">
                      {String(l.tanggal || '').slice(8, 10)}/{String(l.tanggal || '').slice(5, 7)}/{String(l.tanggal || '').slice(0, 4)}
                    </span>
                    {l.jam_mulai && (
                      <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                        {String(l.jam_mulai).slice(0, 5)} - {String(l.jam_selesai || '').slice(0, 5)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-700 mt-1 leading-snug">{l.alasan || '-'}</p>
                  {l.disetujui_oleh && (
                    <p className="text-[9px] text-slate-400 mt-1">Disetujui: {l.disetujui_oleh}</p>
                  )}
                  {l.tahap === 'MENUNGGU_PJO' && (
                    <p className="text-[9px] font-bold text-amber-600 mt-0.5">Menunggu persetujuan PJO</p>
                  )}
                </div>
              ))}
            </div>
            <div className="px-3 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</span>
              <span className="text-sm font-black text-[#0b2a5b]">
                {(detailLembur.list || []).length} kali lembur
              </span>
            </div>
          </div>
        </div>
      )}

      {tab === 'pantau' && (`,'modal lembur');

if(g.length){console.error('GAGAL:');g.forEach(x=>console.error('  - '+x));process.exit(1);}
fs.writeFileSync(p+'.bak-rev',r,'utf8');
fs.writeFileSync(p,crlf?s.replace(/\n/g,'\r\n'):s,'utf8');
console.log('OK - 8/8 perubahan terpasang');