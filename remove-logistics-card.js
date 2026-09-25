const fs = require('fs');
const filePath = './app/dashboard/plant/page.tsx';

let content = fs.readFileSync(filePath, 'utf8');

// Hapus card Logistik & Gudang dari sub-tab Kelola Unit
const targetBlock = `<Link href="/dashboard/plant/logistik" className="group bg-gradient-to-br from-amber-500/10 to-slate-900 border border-amber-500/30 hover:border-amber-400/60 rounded-2xl p-6 transition-all shadow-lg hover:-translate-y-0.5">
              <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400 w-fit mb-3">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
              <h3 className="text-base font-black text-amber-300">Logistik & Gudang</h3>
              <p className="text-xs text-slate-400 mt-1">Akses cepat ke modul logistik: PR, stok, pengeluaran, barang masuk.</p>
              <span className="inline-block mt-3 text-xs font-bold text-amber-400 group-hover:underline">Buka Logistik →</span>
            </Link>`;

content = content.replace(targetBlock, '');

// Ubah grid dari 3 kolom menjadi 2 kolom agar seimbang
content = content.replace(
  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
  'grid grid-cols-1 md:grid-cols-2 gap-4'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("✓ Card Logistik & Gudang berhasil dibuang dari Kelola Unit!");
