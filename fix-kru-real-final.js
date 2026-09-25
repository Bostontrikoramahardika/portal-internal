const fs = require('fs');
const path = require('path');

const plantPath = path.join(process.cwd(), 'app', 'dashboard', 'plant', 'page.tsx');
let code = fs.readFileSync(plantPath, 'utf8');

// 1. REPLACE STATE MECHANICS DUMMY DENGAN STATE REAL & FETCH FUNCTION
const oldStateCode = `  const [mechanics, setMechanics] = useState<any[]>([
    { id: '1', name: 'Rudi Hermawan', nrp: 'PLT-001', role: 'Foreman Plant', shift: 'Siang', status: 'ON DUTY', phone: '081234567890' },
    { id: '2', name: 'Budi Santoso', nrp: 'PLT-002', role: 'Mekanik Senior', shift: 'Siang', status: 'ON DUTY', phone: '081298765432' },
    { id: '3', name: 'Agus Setiawan', nrp: 'PLT-003', role: 'Mekanik Welder', shift: 'Malam', status: 'OFF DUTY', phone: '081311223344' },
    { id: '4', name: 'Dedi Kurniawan', nrp: 'PLT-004', role: 'Auto Electrician', shift: 'Siang', status: 'ON DUTY', phone: '081355667788' }
  ]);`;

const newStateCode = `  const [mechanics, setMechanics] = useState<any[]>([]);
  const [loadingMechanics, setLoadingMechanics] = useState<boolean>(true);

  const fetchMechanics = async () => {
    try {
      setLoadingMechanics(true);
      const res = await fetch('/api/plant/kru?site=' + encodeURIComponent(siteFilter));
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMechanics(json.data);
      }
    } catch (err) {
      console.error('Error fetching real crew:', err);
    } finally {
      setLoadingMechanics(false);
    }
  };`;

if (code.includes('Rudi Hermawan')) {
  code = code.replace(oldStateCode, newStateCode);
}

// 2. PASTIIN useEffect MEMANGGIL fetchMechanics
if (!code.includes('fetchMechanics()')) {
  code = code.replace(
    /useEffect\(\(\) => \{[\s\S]*?fetchUnits\(\);[\s\S]*?\}, \[siteFilter\]\);/,
    `useEffect(() => {
    fetchUnits();
    fetchMechanics();
  }, [siteFilter]);`
  );
}

// 3. FIX FILTER KRU AGAR AMAN MEMBACA FIELD DATABASE REAL (nama, nrp, jabatan, departemen)
code = code.replace(
  /const filteredKru = mechanics.filter\(m =>[\s\S]*?\);/,
  `const filteredKru = mechanics.filter(m => {
    const q = kruSearch.toLowerCase();
    const nama = (m.nama || m.name || '').toLowerCase();
    const nrp = (m.nrp || '').toLowerCase();
    const jabatan = (m.jabatan || m.role || '').toLowerCase();
    const dept = (m.departemen || '').toLowerCase();
    return nama.includes(q) || nrp.includes(q) || jabatan.includes(q) || dept.includes(q);
  });`
);

// 4. FIX CARD RENDERING AGAR MENAMPILKAN FIELD REAL SUPABASE
const oldCardPattern = /{filteredKru\.map\(\(m\) => \([\s\S]*?\)\)}/;

const newCardRender = `{loadingMechanics ? (
            <div className="col-span-1 md:col-span-2 text-center py-10 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-500 font-medium">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
              Memuat data personel Plant dari database...
            </div>
          ) : filteredKru.length === 0 ? (
            <div className="col-span-1 md:col-span-2 text-center py-10 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-500 font-medium">
              Belum ada personel Plant terdaftar untuk site ini di database.
            </div>
          ) : (
            filteredKru.map((m) => {
              const displayName = m.nama || m.name || 'Personel Plant';
              const displayNrp = m.nrp || '-';
              const displayRole = m.jabatan || m.role || 'Plant Crew';
              const displayDept = m.departemen || 'Plant';
              const displaySite = m.site || siteFilter;
              const displayPhone = m.no_hp || m.phone || '';
              const displayStatus = m.status_karyawan || m.status || 'AKTIF';

              return (
                <div key={m.id || displayNrp} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{displayName}</h3>
                      <p className="text-xs text-amber-600 font-semibold">{displayRole}</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {displayStatus}
                    </span>
                  </div>
                  
                  <div className="text-xs text-slate-500 space-y-1 mt-3 pt-2 border-t border-slate-100">
                    <p className="flex justify-between">
                      <span>NRP:</span>
                      <strong className="font-mono text-slate-700">{displayNrp}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Departemen / Site:</span>
                      <strong className="text-slate-700">{displayDept} ({displaySite})</strong>
                    </p>
                    {displayPhone && (
                      <p className="flex justify-between text-blue-600">
                        <span>Kontak HP:</span>
                        <a href={"tel:" + displayPhone} className="hover:underline font-medium">📞 {displayPhone}</a>
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}`;

code = code.replace(oldCardPattern, newCardRender);

fs.writeFileSync(plantPath, code, 'utf8');
console.log('✅ CLEANED 100%! Dummy array "Rudi Hermawan" dkk HAS BEEN REMOVED and replaced with real DB query.');
