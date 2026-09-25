const fs = require('fs');
const path = require('path');

const root = process.cwd();

// 1. BUAT API ROUTE /api/plant/kru/route.ts UNTUK FETCH DATA KARYAWAN REAL
const apiKruDir = path.join(root, 'app', 'api', 'plant', 'kru');
if (!fs.existsSync(apiKruDir)) {
  fs.mkdirSync(apiKruDir, { recursive: true });
}

const apiKruCode = `import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteParam = searchParams.get('site') || 'PPA-MLP';

    // Query real employees from employees table
    const { data: employees, error } = await supabase
      .from('employees')
      .select('id, nrp, nama, jabatan, departemen, site, no_hp, status_karyawan')
      .order('nama', { ascending: true });

    if (error) throw error;

    let realCrew = employees || [];

    // Filter for Plant department or PPA-MLP site
    if (siteParam && siteParam !== 'ALL') {
      const siteUpper = siteParam.toUpperCase();
      realCrew = realCrew.filter((e: any) => {
        const matchSite = e.site ? String(e.site).toUpperCase().includes('MLP') || String(e.site).toUpperCase().includes(siteUpper) : true;
        const matchDept = e.departemen ? String(e.departemen).toLowerCase().includes('plant') || String(e.jabatan).toLowerCase().includes('plant') || String(e.jabatan).toLowerCase().includes('mekanik') : true;
        return matchSite && matchDept;
      });
    }

    return NextResponse.json({ success: true, data: realCrew });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message, data: [] }, { status: 500 });
  }
}
`;

fs.writeFileSync(path.join(apiKruDir, 'route.ts'), apiKruCode, 'utf8');
console.log('✅ Created /app/api/plant/kru/route.ts connected to real employees table');

// 2. UPDATE app/dashboard/plant/page.tsx: HAPUS SEMUA DATA DUMMY NAMA
const plantPagePath = path.join(root, 'app', 'dashboard', 'plant', 'page.tsx');
let plantCode = fs.readFileSync(plantPagePath, 'utf8');

// Replace dummy state and logic with live fetch from /api/plant/kru
const oldDummyArrayRegex = /const \[kruList, setKruList\] = useState<[^>]*>[\s\S]*?\n  \]\);/;
if (oldDummyArrayRegex.test(plantCode)) {
  plantCode = plantCode.replace(
    oldDummyArrayRegex,
    `const [kruList, setKruList] = useState<any[]>([]);
  const [loadingKru, setLoadingKru] = useState<boolean>(true);

  const fetchKruReal = async () => {
    try {
      setLoadingKru(true);
      const res = await fetch('/api/plant/kru?site=PPA-MLP');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setKruList(json.data);
      }
    } catch (err) {
      console.error('Error loading real crew:', err);
    } finally {
      setLoadingKru(false);
    }
  };

  useEffect(() => {
    fetchKruReal();
  }, []);`
  );
}

// Ensure rendering uses real DB fields (nama, nrp, jabatan, departemen, no_hp)
plantCode = plantCode.replace(
  /{kruList\.map\(\(person[\s\S]*?\)\)}/,
  `{loadingKru ? (
            <div className="col-span-2 text-center py-8 text-slate-500 font-medium">
              Memuat data personel Plant dari database...
            </div>
          ) : kruList.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-slate-500 font-medium bg-white rounded-xl border border-slate-200">
              Belum ada data personel Plant terdaftar untuk site ini di database.
            </div>
          ) : (
            kruList.map((person: any) => (
              <div key={person.id || person.nrp} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{person.nama}</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded border border-slate-300">
                      NRP: {person.nrp || '-'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-600 font-semibold mt-1">{person.jabatan || 'Personel Plant'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Departemen: {person.departemen || 'Plant'} | Site: {person.site || 'PPA-MLP'}</p>
                  {person.no_hp && <p className="text-xs text-blue-600 mt-1">📞 {person.no_hp}</p>}
                </div>
                <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {person.status_karyawan || 'AKTIF'}
                </span>
              </div>
            ))
          )}`
);

fs.writeFileSync(plantPagePath, plantCode, 'utf8');
console.log('✅ Cleaned dummy data from app/dashboard/plant/page.tsx and connected live DB');

