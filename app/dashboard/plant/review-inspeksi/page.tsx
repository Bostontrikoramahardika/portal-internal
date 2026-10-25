'use client';

// ════════════════════════════════════════════════════════════════
// Review Inspeksi Unit (P2H): ringkasan skor, chart, temuan terbuka,
// dan closing perbaikan (selesai / menunggu part / belum dilaksanakan).
// Data inspeksi dari /api/plant/inspeksi, closing dari
// /api/plant/inspeksi/tindak-lanjut (tabel inspeksi_tindak_lanjut).
// ════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ChkItem { section?: string; item?: string; status?: string; keterangan?: string }
interface InspRow {
  id: string; no_unit?: string; jenis_unit?: string; site?: string;
  inspector_nama?: string; hm_km?: number; created_at?: string;
  checklist?: { general?: ChkItem[]; attachment?: ChkItem[]; inspection_score?: number | null };
}
interface Closing {
  inspeksi_id: string; section: string; item: string; status_closing: string;
  sumber_masalah?: string | null; tindakan?: string | null; part_terpakai?: string | null;
  nomor_pr?: string | null; mekanik?: string | null; tanggal_perbaikan?: string | null;
  catatan?: string | null; dicatat_oleh_nama?: string | null; updated_at?: string;
}
interface PrRow {
  nomor_pr: string; unit_code?: string; nama_barang?: string; status?: string;
  kriteria?: string; keterangan?: string; created_at?: string;
}
interface Temuan {
  key: string; inspeksi_id: string; no_unit: string; site: string;
  section: string; item: string; tanggal: string; umurHari: number; closing?: Closing;
}

const SUMBER_LABEL: Record<string, string> = {
  BARANG_BELUM_ADA: 'Barang belum ada (menunggu PR)',
  MENUNGGU_JADWAL: 'Menunggu jadwal / shutdown',
  MENUNGGU_MANPOWER: 'Menunggu manpower',
  MENUNGGU_PERSETUJUAN: 'Menunggu persetujuan',
  LAINNYA: 'Lainnya',
};

function itemsOf(r: InspRow): ChkItem[] {
  const c = r.checklist || {};
  return [...(c.general || []), ...(c.attachment || [])];
}
function hitungSkor(r: InspRow): number {
  const manual = r.checklist?.inspection_score;
  if (typeof manual === 'number' && !Number.isNaN(manual)) return manual;
  const items = itemsOf(r).filter((i) => i.status === 'BAIK' || i.status === 'RUSAK');
  if (items.length === 0) return 0;
  const baik = items.filter((i) => i.status === 'BAIK').length;
  return Math.round((baik / items.length) * 100);
}
function statusDariSkor(s: number): { label: string; cls: string } {
  if (s >= 90) return { label: 'READY', cls: 'bg-emerald-100 text-emerald-700' };
  if (s >= 75) return { label: 'READY · CATATAN', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'PERLU PERBAIKAN', cls: 'bg-red-100 text-red-700' };
}
function fmtTgl(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ReviewInspeksiPage() {
  const router = useRouter();

  // 🔒 Halaman ini hanya untuk pemegang izin plant_p2h_inspeksi.
  //    Tidak berhak -> tidak ditampilkan, dialihkan diam-diam ke Dashboard.
  const [aksesOk, setAksesOk] = useState<boolean | null>(null);
  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const token = localStorage.getItem('btm_session_token_v1');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch('/api/auth/me', { credentials: 'include', headers });
        const data = res.ok ? await res.json() : null;
        const boleh = Boolean(data?.is_super_admin) ||
          (Array.isArray(data?.permissions) && data.permissions.includes('plant_p2h_inspeksi'));
        if (batal) return;
        if (boleh) setAksesOk(true);
        else { setAksesOk(false); router.replace('/dashboard'); }
      } catch {
        if (!batal) { setAksesOk(false); router.replace('/dashboard'); }
      }
    })();
    return () => { batal = true; };
  }, [router]);

  const [rows, setRows] = useState<InspRow[]>([]);
  const [closings, setClosings] = useState<Closing[]>([]);
  const [prs, setPrs] = useState<PrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periode, setPeriode] = useState<7 | 30 | 0>(30);
  const [formUntuk, setFormUntuk] = useState<Temuan | null>(null);
  const [simpan, setSimpan] = useState(false);
  const [sekarang] = useState(() => Date.now());
  const [fStatus, setFStatus] = useState('SELESAI');
  const [fTindakan, setFTindakan] = useState('');
  const [fPart, setFPart] = useState('');
  const [fMekanik, setFMekanik] = useState('');
  const [fTanggal, setFTanggal] = useState('');
  const [fSumber, setFSumber] = useState('BARANG_BELUM_ADA');
  const [fPr, setFPr] = useState('');
  const [fCatatan, setFCatatan] = useState('');

  async function muat() {
    try {
      const [a, b, c] = await Promise.all([
        fetch('/api/plant/inspeksi').then((r) => r.json()),
        fetch('/api/plant/inspeksi/tindak-lanjut').then((r) => r.json()),
        fetch('/api/plant/logistik/pr?view=all').then((r) => r.json()).catch(() => ({ success: false })),
      ]);
      if (!a.success) throw new Error(a.error || 'Gagal memuat inspeksi');
      setRows(a.data || []);
      setClosings(b.success ? b.data || [] : []);
      const semuaPr: PrRow[] = c && c.success ? c.data || [] : [];
      setPrs(semuaPr.filter((x) => (x.kriteria || '').toUpperCase() === 'BACKLOG' || (x.keterangan || '').startsWith('Auto-generated dari P2H')));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data');
    } finally { setLoading(false); }
  }
  // Muat data awal — setState terjadi setelah fetch selesai (async), aman.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void muat(); }, []);

  const closingMap = useMemo(() => {
    const m = new Map<string, Closing>();
    for (const c of closings) m.set(`${c.inspeksi_id}|${c.section}|${c.item}`, c);
    return m;
  }, [closings]);

  const terfilter = useMemo(() => {
    if (periode === 0) return rows;
    const batas = sekarang - periode * 24 * 3600 * 1000;
    return rows.filter((r) => (r.created_at ? new Date(r.created_at).getTime() : 0) >= batas);
  }, [rows, periode, sekarang]);

  const agregat = useMemo(() => {
    let baik = 0, rusak = 0, na = 0;
    const perSeksi = new Map<string, { b: number; t: number }>();
    const hitungItem = new Map<string, number>();
    for (const r of terfilter) {
      for (const i of itemsOf(r)) {
        const s = (i.status || '').toUpperCase();
        if (s === 'BAIK') baik++; else if (s === 'RUSAK') rusak++; else na++;
        if (s === 'BAIK' || s === 'RUSAK') {
          const k = i.section || 'UMUM';
          const cur = perSeksi.get(k) || { b: 0, t: 0 };
          cur.t++; if (s === 'BAIK') cur.b++;
          perSeksi.set(k, cur);
        }
        if (s === 'RUSAK' && i.item) hitungItem.set(i.item, (hitungItem.get(i.item) || 0) + 1);
      }
    }
    const total = baik + rusak;
    return {
      baik, rusak, na,
      persen: total ? Math.round((baik / total) * 100) : 0,
      seksi: [...perSeksi.entries()].map(([nm, v]) => ({ nm, pct: Math.round((v.b / v.t) * 100) })).sort((a, b) => b.pct - a.pct),
      topTemuan: [...hitungItem.entries()].map(([nm, n]) => ({ nm, n })).sort((a, b) => b.n - a.n).slice(0, 5),
    };
  }, [terfilter]);

  const trengaris = useMemo(() => {
    const perHari = new Map<string, number[]>();
    for (const r of terfilter) {
      if (!r.created_at) continue;
      const k = r.created_at.slice(0, 10);
      const arr = perHari.get(k) || [];
      arr.push(hitungSkor(r));
      perHari.set(k, arr);
    }
    return [...perHari.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-7)
      .map(([tgl, arr]) => ({ tgl, skor: Math.round(arr.reduce((x, y) => x + y, 0) / arr.length) }));
  }, [terfilter]);

  const temuan: Temuan[] = useMemo(() => {
    const out: Temuan[] = [];
    for (const r of terfilter) {
      for (const i of itemsOf(r)) {
        if ((i.status || '').toUpperCase() !== 'RUSAK' || !i.item) continue;
        const section = i.section || 'UMUM';
        const key = `${r.id}|${section}|${i.item}`;
        out.push({
          key, inspeksi_id: r.id, no_unit: r.no_unit || '-', site: r.site || '',
          section, item: i.item, tanggal: r.created_at || '',
          umurHari: r.created_at ? Math.max(0, Math.floor((sekarang - new Date(r.created_at).getTime()) / 86400000)) : 0,
          closing: closingMap.get(key),
        });
      }
    }
    return out.sort((a, b) => b.umurHari - a.umurHari);
  }, [terfilter, closingMap, sekarang]);

  const terakhirPerUnit = useMemo(() => {
    const m = new Map<string, InspRow>();
    for (const r of rows) {
      const k = r.no_unit || '-';
      if (!m.has(k)) m.set(k, r); // rows sudah urut terbaru dari API
    }
    return [...m.values()].slice(0, 10);
  }, [rows]);

  const prMap = useMemo(() => {
    const m = new Map<string, PrRow>();
    for (const x of prs) m.set(x.nomor_pr, x);
    return m;
  }, [prs]);

  // Status temuan mengikuti perjalanan part-nya di logistik.
  function statusTurunan(t: Temuan): { kode: string; label: string; cls: string } {
    const c = t.closing;
    if (c?.status_closing === 'SELESAI') return { kode: 'SELESAI', label: '✅ SELESAI DIPASANG', cls: 'bg-emerald-100 text-emerald-700' };
    const pr = c?.nomor_pr ? prMap.get(c.nomor_pr) : undefined;
    if (pr) {
      const st = (pr.status || '').toUpperCase();
      if (st === 'BARANG_READY') return { kode: 'PART_READY', label: '🔵 PART READY · BELUM DIPASANG', cls: 'bg-sky-100 text-sky-700' };
      if (st === 'APPROVED') return { kode: 'PROSES_BELI', label: '🟡 PROSES PEMBELIAN', cls: 'bg-amber-100 text-amber-700' };
      if (st === 'REJECTED') return { kode: 'PR_DITOLAK', label: '⛔ PR DITOLAK', cls: 'bg-rose-100 text-rose-700' };
      return { kode: 'MENUNGGU_APPROVAL', label: '🟠 MENUNGGU PERSETUJUAN PR', cls: 'bg-orange-100 text-orange-700' };
    }
    if (c?.status_closing === 'MENUNGGU_PART') return { kode: 'WAITING_PART', label: '🟡 MENUNGGU PART', cls: 'bg-amber-100 text-amber-700' };
    if (c) return { kode: 'BELUM', label: '🔴 BELUM DILAKSANAKAN', cls: 'bg-red-100 text-red-700' };
    return { kode: 'OPEN', label: '🔴 BELUM DICLOSING', cls: 'bg-red-100 text-red-700' };
  }

  const progres = useMemo(() => {
    const total = temuan.length;
    let diprogres = 0, waiting = 0, partAdaBelum = 0;
    for (const t of temuan) {
      const k = statusTurunan(t).kode;
      if (t.closing && (k === 'SELESAI' || t.closing.nomor_pr)) diprogres++;
      if (k === 'MENUNGGU_APPROVAL' || k === 'PROSES_BELI' || k === 'WAITING_PART') waiting++;
      if (k === 'PART_READY') partAdaBelum++;
    }
    return { total, diprogres, waiting, partAdaBelum };
  }, [temuan, prMap]);  // eslint-disable-line react-hooks/exhaustive-deps

  const nTerbuka = temuan.filter((t) => t.closing?.status_closing !== 'SELESAI').length;
  const nPart = temuan.filter((t) => t.closing?.status_closing === 'MENUNGGU_PART').length;
  const nBelum = temuan.filter((t) => !t.closing || t.closing.status_closing === 'BELUM_DILAKSANAKAN').length;
  const nSelesai = temuan.filter((t) => t.closing?.status_closing === 'SELESAI').length;

  function bukaForm(t: Temuan) {
    setFormUntuk(t);
    setFStatus(t.closing?.status_closing || 'SELESAI');
    setFTindakan(t.closing?.tindakan || '');
    setFPart(t.closing?.part_terpakai || '');
    setFMekanik(t.closing?.mekanik || '');
    setFTanggal(t.closing?.tanggal_perbaikan || new Date().toISOString().slice(0, 10));
    setFSumber(t.closing?.sumber_masalah || 'BARANG_BELUM_ADA');
    setFPr(t.closing?.nomor_pr || '');
    setFCatatan(t.closing?.catatan || '');
  }

  async function simpanClosing() {
    if (!formUntuk) return;
    setSimpan(true);
    try {
      const res = await fetch('/api/plant/inspeksi/tindak-lanjut', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspeksi_id: formUntuk.inspeksi_id, no_unit: formUntuk.no_unit, site: formUntuk.site,
          section: formUntuk.section, item: formUntuk.item, status_closing: fStatus,
          sumber_masalah: fStatus === 'SELESAI' ? undefined : fSumber,
          tindakan: fTindakan, part_terpakai: fPart, mekanik: fMekanik,
          tanggal_perbaikan: fTanggal || undefined, nomor_pr: fPr, catatan: fCatatan,
        }),
      }).then((r) => r.json());
      if (!res.success) throw new Error(res.error || 'Gagal menyimpan');
      setFormUntuk(null);
      await muat();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally { setSimpan(false); }
  }

  const C = 2 * Math.PI * 54;
  const poinTren = trengaris.map((t, i) => {
    const x = trengaris.length > 1 ? 20 + (600 * i) / (trengaris.length - 1) : 320;
    const y = 150 - ((t.skor - 50) / 50) * 120;
    return `${x},${Math.max(14, Math.min(150, y))}`;
  }).join(' ');

  if (aksesOk !== true) return null;

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-[#00468c] via-[#003D79] to-[#002a57] text-white rounded-3xl p-5 shadow">
        <h1 className="text-base lg:text-lg font-black tracking-tight">REKAP & REVIEW INSPEKSI UNIT (P2H)</h1>
        <p className="text-[11px] lg:text-xs text-blue-200 font-semibold mt-1">Ringkasan skor, temuan terbuka, dan closing perbaikan</p>
        <div className="flex gap-2 mt-3">
          {([7, 30, 0] as const).map((p) => (
            <button key={p} type="button" onClick={() => setPeriode(p)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${periode === p ? 'bg-white text-[#003D79]' : 'bg-white/10 text-white border-white/30'}`}>
              {p === 0 ? 'Semua' : `${p} Hari`}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center py-16 text-slate-400 font-bold text-sm">Memuat data inspeksi…</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm font-bold">{error}</div>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { l: 'TOTAL INSPEKSI', v: `${terfilter.length}`, s: 'inspeksi pada periode ini' },
              { l: 'RATA-RATA SKOR', v: `${agregat.persen}%`, s: 'item BAIK dari yg diperiksa' },
              { l: 'ITEM RUSAK (NG)', v: `${agregat.rusak}`, s: 'temuan dari checklist' },
              { l: 'TEMUAN TERBUKA', v: `${nTerbuka}`, s: `${nPart} menunggu part · ${nBelum} belum dilaksanakan` },
              { l: 'CLOSING SELESAI', v: `${nSelesai}`, s: 'temuan sudah diperbaiki' },
            ].map((k) => (
              <div key={k.l} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="text-[9px] font-black tracking-widest text-slate-400">{k.l}</div>
                <div className="text-2xl font-black text-[#003D79] mt-1">{k.v}</div>
                <div className="text-[10px] font-semibold text-slate-500 mt-0.5">{k.s}</div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h3 className="text-[13px] font-black text-[#003D79]">Chart Progres Temuan</h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Dari temuan ditemukan sampai part terpasang — kelihatan macetnya di logistik atau di eksekusi</p>
            <div className="mt-3 space-y-3">
              {[
                { l: 'Total Temuan', v: progres.total, warna: '#003D79', ket: 'seluruh temuan RUSAK pada periode ini' },
                { l: 'Sudah Diprogres', v: progres.diprogres, warna: '#0284c7', ket: 'sudah masuk jalur perbaikan (PR berjalan / sudah terpasang)' },
                { l: 'Masih Waiting Part', v: progres.waiting, warna: '#d97706', ket: 'barang belum ready — masih approval / pembelian di logistik' },
                { l: 'Part Sudah Ada, Belum Diprogres', v: progres.partAdaBelum, warna: '#dc2626', ket: 'barang sudah di gudang tapi belum dipasang — macet di eksekusi' },
              ].map((b) => (
                <div key={b.l}>
                  <div className="flex items-baseline justify-between text-[11px]">
                    <span className="font-black text-slate-600">{b.l}</span>
                    <span className="font-black" style={{ color: b.warna }}>{b.v} temuan{progres.total ? ` · ${Math.round((b.v / progres.total) * 100)}%` : ''}</span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden mt-1">
                    <div className="h-full rounded-full transition-all" style={{ width: `${progres.total ? (b.v / progres.total) * 100 : 0}%`, background: b.warna }} />
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{b.ket}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <h3 className="text-[13px] font-black text-[#003D79]">Skor Inspeksi Rata-rata</h3>
              <div className="flex items-center gap-4 mt-3">
                <svg width="120" height="120" viewBox="0 0 132 132">
                  <circle cx="66" cy="66" r="54" fill="none" stroke="#eef2f7" strokeWidth="15" />
                  <circle cx="66" cy="66" r="54" fill="none" stroke="#003D79" strokeWidth="15" strokeLinecap="round"
                    strokeDasharray={`${(agregat.persen / 100) * C} ${C}`} transform="rotate(-90 66 66)" />
                  <text x="66" y="72" textAnchor="middle" fontSize="26" fontWeight="900" fill="#003D79">{agregat.persen}%</text>
                </svg>
                <div className="text-xs font-semibold text-slate-600 space-y-2">
                  <div>🟢 BAIK — {agregat.baik} item</div>
                  <div>🔴 RUSAK — {agregat.rusak} item</div>
                  <div>⚪ N/A — {agregat.na} item</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm lg:col-span-2">
              <h3 className="text-[13px] font-black text-[#003D79]">Kesehatan per Seksi (% BAIK)</h3>
              <div className="mt-3 space-y-2.5">
                {agregat.seksi.map((s) => (
                  <div key={s.nm} className="grid grid-cols-[150px_1fr_42px] items-center gap-2 text-[11px]">
                    <div className="font-bold text-slate-600 truncate">{s.nm}</div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.pct >= 90 ? 'bg-emerald-500' : s.pct >= 80 ? 'bg-sky-500' : s.pct >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.pct}%` }} />
                    </div>
                    <div className="font-black text-[#003D79] text-right">{s.pct}%</div>
                  </div>
                ))}
                {agregat.seksi.length === 0 && <div className="text-xs text-slate-400 font-semibold">Belum ada data checklist.</div>}
              </div>
              <h3 className="text-[13px] font-black text-[#003D79] mt-5">tren Skor (per hari inspeksi)</h3>
              {trengaris.length > 1 ? (
                <svg width="100%" height="120" viewBox="0 0 640 170" preserveAspectRatio="none" className="mt-1">
                  <polyline fill="none" stroke="#003D79" strokeWidth="3" strokeLinecap="round" points={poinTren} />
                </svg>
              ) : <div className="text-xs text-slate-400 font-semibold mt-1">Butuh inspeksi di minimal 2 hari berbeda.</div>}
              <div className="flex gap-4 flex-wrap">
                {trengaris.map((t) => <span key={t.tgl} className="text-[10px] font-bold text-slate-400">{fmtTgl(t.tgl)} · {t.skor}%</span>)}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h3 className="text-[13px] font-black text-[#003D79]">Temuan Terbuka & Closing Perbaikan</h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Setiap temuan RUSAK wajib ditutup: selesai, menunggu part, atau belum dilaksanakan beserta sumber masalahnya</p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs min-w-[760px]">
                <thead><tr className="text-left text-[10px] tracking-wider text-slate-400 border-b-2 border-slate-100">
                  <th className="py-2 pr-2">NO UNIT</th><th className="py-2 pr-2">TEMUAN</th><th className="py-2 pr-2">TGL</th><th className="py-2 pr-2">UMUR</th><th className="py-2 pr-2">STATUS CLOSING</th><th className="py-2 pr-2">SUMBER MASALAH / KETERANGAN</th><th className="py-2">AKSI</th>
                </tr></thead>
                <tbody>
                  {temuan.map((t) => {
                    const c = t.closing;
                    const tur = statusTurunan(t);
                    const badge = <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${tur.cls}`}>{tur.label}</span>;
                    const prTerkait = c?.nomor_pr ? prMap.get(c.nomor_pr) : undefined;
                    const ket = !c ? 'Belum ada tindak lanjut tercatat'
                      : c.status_closing === 'SELESAI' ? `${c.tindakan || '-'}${c.mekanik ? ` · oleh ${c.mekanik}` : ''}`
                      : `${prTerkait ? `${prTerkait.nama_barang || 'Part'} · ${c.nomor_pr} · PR: ${prTerkait.status}` : `${c.sumber_masalah ? SUMBER_LABEL[c.sumber_masalah] || c.sumber_masalah : '-'}${c.nomor_pr ? ` · ${c.nomor_pr}` : ''}`}${c.catatan ? ` · ${c.catatan}` : ''}`;
                    return (
                      <tr key={t.key} className="border-b border-slate-50">
                        <td className="py-2 pr-2 font-black text-slate-700">{t.no_unit}</td>
                        <td className="py-2 pr-2 font-semibold text-slate-600">{t.section} · {t.item}</td>
                        <td className="py-2 pr-2 font-semibold text-slate-500">{fmtTgl(t.tanggal)}</td>
                        <td className={`py-2 pr-2 font-black ${t.umurHari > 7 && c?.status_closing !== 'SELESAI' ? 'text-red-600' : 'text-slate-500'}`}>{t.umurHari} hari</td>
                        <td className="py-2 pr-2">{badge}</td>
                        <td className="py-2 pr-2 font-semibold text-slate-500">{ket}</td>
                        <td className="py-2">
                          <button type="button" onClick={() => bukaForm(t)} className="px-2.5 py-1.5 rounded-lg bg-[#003D79] text-white text-[10px] font-black active:scale-95">
                            {c ? 'Update' : 'Catat Perbaikan'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {temuan.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-slate-400 font-bold">Tidak ada temuan RUSAK pada periode ini 🎉</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h3 className="text-[13px] font-black text-[#003D79]">Rangkuman Barang Backlog Inspeksi</h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Mengikuti status PR di logistik — ready, terpasang, atau belum dibelikan</p>
            <div className="grid lg:grid-cols-3 gap-3 mt-3">
              <div className="border border-emerald-100 bg-emerald-50/50 rounded-2xl p-3">
                <div className="text-[11px] font-black text-emerald-700">✅ SUDAH READY & TERPASANG ({closings.filter((c) => c.status_closing === 'SELESAI').length})</div>
                <div className="mt-2 space-y-1.5">
                  {closings.filter((c) => c.status_closing === 'SELESAI').slice(0, 6).map((c, i) => (
                    <div key={i} className="text-[11px] font-semibold text-slate-600 bg-white border border-emerald-100 rounded-lg px-2 py-1.5">
                      <b>{c.nomor_pr ? prMap.get(c.nomor_pr)?.nama_barang || c.part_terpakai || c.item : c.part_terpakai || c.item}</b> · {c.item}
                      <div className="text-slate-400">{c.tanggal_perbaikan ? fmtTgl(c.tanggal_perbaikan) : ''}{c.mekanik ? ` · ${c.mekanik}` : ''}</div>
                    </div>
                  ))}
                  {closings.filter((c) => c.status_closing === 'SELESAI').length === 0 && <div className="text-[11px] text-slate-400 font-semibold">Belum ada yang terpasang.</div>}
                </div>
              </div>
              <div className="border border-sky-100 bg-sky-50/50 rounded-2xl p-3">
                <div className="text-[11px] font-black text-sky-700">🔵 READY PART — MENUNGGU PEMASANGAN ({prs.filter((x) => (x.status || '').toUpperCase() === 'BARANG_READY' && !closings.some((c) => c.nomor_pr === x.nomor_pr && c.status_closing === 'SELESAI')).length})</div>
                <div className="mt-2 space-y-1.5">
                  {prs.filter((x) => (x.status || '').toUpperCase() === 'BARANG_READY' && !closings.some((c) => c.nomor_pr === x.nomor_pr && c.status_closing === 'SELESAI')).slice(0, 6).map((x) => (
                    <div key={x.nomor_pr} className="text-[11px] font-semibold text-slate-600 bg-white border border-sky-100 rounded-lg px-2 py-1.5">
                      <b>{x.nama_barang || '-'}</b> · {x.unit_code || ''} · {x.nomor_pr}
                      <div className="text-slate-400">Barang di gudang — tinggal pasang & closing SELESAI</div>
                    </div>
                  ))}
                  {prs.filter((x) => (x.status || '').toUpperCase() === 'BARANG_READY').length === 0 && <div className="text-[11px] text-slate-400 font-semibold">Belum ada barang ready.</div>}
                </div>
              </div>
              <div className="border border-red-100 bg-red-50/50 rounded-2xl p-3">
                <div className="text-[11px] font-black text-red-700">🔴 BELUM DIBELIKAN LOGISTIK ({prs.filter((x) => !['BARANG_READY', 'REJECTED'].includes((x.status || '').toUpperCase())).length})</div>
                <div className="mt-2 space-y-1.5">
                  {prs.filter((x) => !['BARANG_READY', 'REJECTED'].includes((x.status || '').toUpperCase())).slice(0, 6).map((x) => (
                    <div key={x.nomor_pr} className="text-[11px] font-semibold text-slate-600 bg-white border border-red-100 rounded-lg px-2 py-1.5">
                      <b>{x.nama_barang || '-'}</b> · {x.unit_code || ''} · {x.nomor_pr}
                      <div className="text-slate-400">Tahap: {x.status}</div>
                    </div>
                  ))}
                  {prs.filter((x) => !['BARANG_READY', 'REJECTED'].includes((x.status || '').toUpperCase())).length === 0 && <div className="text-[11px] text-slate-400 font-semibold">Tidak ada yang menunggu pembelian.</div>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h3 className="text-[13px] font-black text-[#003D79]">Inspeksi Terakhir per Unit</h3>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs min-w-[640px]">
                <thead><tr className="text-left text-[10px] tracking-wider text-slate-400 border-b-2 border-slate-100">
                  <th className="py-2 pr-2">NO UNIT</th><th className="py-2 pr-2">MODEL</th><th className="py-2 pr-2">INSPEKTOR</th><th className="py-2 pr-2">HM</th><th className="py-2 pr-2">SKOR</th><th className="py-2 pr-2">STATUS</th><th className="py-2">TANGGAL</th>
                </tr></thead>
                <tbody>
                  {terakhirPerUnit.map((r) => {
                    const s = hitungSkor(r); const st = statusDariSkor(s);
                    return (
                      <tr key={r.id} className="border-b border-slate-50">
                        <td className="py-2 pr-2 font-black text-slate-700">{r.no_unit}</td>
                        <td className="py-2 pr-2 font-semibold text-slate-600">{r.jenis_unit || '-'}</td>
                        <td className="py-2 pr-2 font-semibold text-slate-600">{r.inspector_nama || '-'}</td>
                        <td className="py-2 pr-2 font-semibold text-slate-500">{r.hm_km ?? '-'}</td>
                        <td className="py-2 pr-2 font-black text-[#003D79]">{s}%</td>
                        <td className="py-2 pr-2"><span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${st.cls}`}>{st.label}</span></td>
                        <td className="py-2 font-semibold text-slate-500">{fmtTgl(r.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {agregat.topTemuan.length > 0 && (
              <div className="mt-4">
                <h3 className="text-[13px] font-black text-[#003D79]">Temuan RUSAK Tersering</h3>
                <div className="flex gap-2 flex-wrap mt-2">
                  {agregat.topTemuan.map((t) => (
                    <span key={t.nm} className="px-2.5 py-1 rounded-full bg-red-50 border border-red-100 text-red-700 text-[11px] font-bold">{t.nm} · {t.n}×</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {formUntuk && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-end lg:items-center justify-center p-0 lg:p-6" onClick={() => setFormUntuk(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl lg:rounded-3xl p-5 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-black text-[#003D79]">Catat Closing Perbaikan</h3>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{formUntuk.no_unit} · {formUntuk.section} · {formUntuk.item}</p>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <div className="font-black text-slate-600 mb-1.5">Status Closing *</div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { v: 'SELESAI', l: '✅ Selesai Diperbaiki', on: 'bg-emerald-600 text-white' },
                    { v: 'MENUNGGU_PART', l: '🟡 Menunggu Part', on: 'bg-amber-500 text-white' },
                    { v: 'BELUM_DILAKSANAKAN', l: '🔴 Belum Dilaksanakan', on: 'bg-red-600 text-white' },
                  ].map((o) => (
                    <button key={o.v} type="button" onClick={() => setFStatus(o.v)}
                      className={`px-3 py-2 rounded-xl font-black ${fStatus === o.v ? o.on : 'bg-slate-100 text-slate-500'}`}>{o.l}</button>
                  ))}
                </div>
              </div>

              {fStatus !== 'SELESAI' && (
                <>
                  <div>
                    <div className="font-black text-slate-600 mb-1.5">Sumber Masalah *</div>
                    <select value={fSumber} onChange={(e) => setFSumber(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 font-semibold">
                      {Object.entries(SUMBER_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  {fStatus === 'MENUNGGU_PART' && (
                    <div>
                      <div className="font-black text-slate-600 mb-1.5">PR Backlog Unit Ini (dari logistik)</div>
                      <select value={fPr} onChange={(e) => setFPr(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 font-semibold">
                        <option value="">— Belum ada PR / isi manual nanti —</option>
                        {prs.filter((x) => x.unit_code === formUntuk.no_unit).map((x) => (
                          <option key={x.nomor_pr} value={x.nomor_pr}>{x.nomor_pr} · {x.nama_barang || ''} · {x.status}</option>
                        ))}
                      </select>
                      <div className="text-[10px] text-slate-400 font-semibold mt-1">Status temuan akan mengikuti status PR ini otomatis (approval → pembelian → BARANG READY).</div>
                    </div>
                  )}
                </>
              )}

              {fStatus === 'SELESAI' && (
                <>
                  <div>
                    <div className="font-black text-slate-600 mb-1.5">Tindakan yang Dikerjakan *</div>
                    <textarea value={fTindakan} onChange={(e) => setFTindakan(e.target.value)} rows={2} placeholder="cth: Ganti cutting edge, kencangkan baut sesuai torsi" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 font-semibold" />
                  </div>
                  <div>
                    <div className="font-black text-slate-600 mb-1.5">Part Terpakai</div>
                    <input value={fPart} onChange={(e) => setFPart(e.target.value)} placeholder="cth: Hose hydraulic (PN ...) × 1" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 font-semibold" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="font-black text-slate-600 mb-1.5">Tanggal Perbaikan</div>
                      <input type="date" value={fTanggal} onChange={(e) => setFTanggal(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 font-semibold" />
                    </div>
                    <div>
                      <div className="font-black text-slate-600 mb-1.5">Mekanik / Pelaksana</div>
                      <input value={fMekanik} onChange={(e) => setFMekanik(e.target.value)} placeholder="Nama mekanik" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 font-semibold" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <div className="font-black text-slate-600 mb-1.5">Catatan Tambahan</div>
                <textarea value={fCatatan} onChange={(e) => setFCatatan(e.target.value)} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 font-semibold" />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setFormUntuk(null)} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-black">Batal</button>
                <button type="button" disabled={simpan} onClick={simpanClosing} className="flex-1 py-3 rounded-xl bg-[#003D79] text-white font-black disabled:opacity-50">
                  {simpan ? 'Menyimpan…' : '💾 SIMPAN CLOSING'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold">Tercatat otomatis: nama Anda & waktu pengisian (jejak audit).</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
