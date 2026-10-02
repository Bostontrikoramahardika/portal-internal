'use client'


import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Send, 
  Plus, 
  ExternalLink,
  Calendar,
  User,
  MapPin,
  Clock,
  ShieldAlert,
  FileText
} from 'lucide-react';

interface UnitData {
  id: string;
  kode_unit: string;
  nama_unit: string;
  model_unit: string;
  serial_number: string;
  kategori: string;
  site: string;
  status: string;
}

interface ChecklistItem {
  id: string;
  item: string;
  status: 'BAIK' | 'RUSAK' | 'NA';
  keterangan: string;
}

interface TemuanItem {
  deskripsi: string;
  tindakan: string;
  prioritas: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface BacklogPRItem {
  part_name: string;
  part_number: string;
  qty: number;
  satuan: string;
  keterangan: string;
}

export default function FormInspeksiPage() {
  const [userInfo, setUserInfo] = useState<{ name: string; nrp: string; site: string }>({
    name: 'Inspector Plant',
    nrp: '-',
    site: 'PT BOSTON TRIKORA MAHARDIKA SITE PPA-MLP'
  });

  const [siteUnits, setSiteUnits] = useState<UnitData[]>([]);
  const [loadingUnits, setLoadingUnits] = useState<boolean>(true);
  const [selectedUnitKode, setSelectedUnitKode] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<UnitData | null>(null);

  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<string>('Siang (Shift 1)');
  const [pekerjaan, setPekerjaan] = useState<string>('');
  const [hmActual, setHmActual] = useState<string>('');
  const [lokasi, setLokasi] = useState<string>('');
  const [attachment, setAttachment] = useState<string>('KOSONG');

  const [checklistGeneral, setChecklistGeneral] = useState<ChecklistItem[]>([]);
  const [checklistAttachment, setChecklistAttachment] = useState<ChecklistItem[]>([]);
  const [catatanTemuan, setCatatanTemuan] = useState<TemuanItem[]>([]);
  const [backlogItems, setBacklogItems] = useState<BacklogPRItem[]>([]);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load Session User
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data && data.user) {
            setUserInfo({
              name: data.user.name || data.user.nama || 'Inspector Plant',
              nrp: data.user.nrp || '-',
              site: data.user.site || 'PT BOSTON TRIKORA MAHARDIKA SITE PPA-MLP'
            });
          }
        }
      } catch (err) {
        console.error('Failed to load user session', err);
      }
    }
    loadUser();
  }, []);

  // Load Units dari unit_master
  useEffect(() => {
    async function fetchUnits() {
      setLoadingUnits(true);
      try {
        const res = await fetch(`/api/units?site=${encodeURIComponent(userInfo.site)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSiteUnits(json.data);
        } else {
          setSiteUnits([]);
        }
      } catch (err) {
        console.error('Gagal mengambil unit_master:', err);
        setSiteUnits([]);
      } finally {
        setLoadingUnits(false);
      }
    }
    fetchUnits();
  }, [userInfo.site]);

  // Handle Pilih Unit
  const handleSelectUnit = async (kode: string) => {
    setSelectedUnitKode(kode);
    const found = siteUnits.find(u => u.kode_unit === kode) || null;
    setSelectedUnit(found);

    if (found) {
      const modelKey = found.model_unit || 'GENERAL';
      try {
        const res = await fetch(`/api/plant/format-inspeksi?key=${encodeURIComponent(modelKey)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.items) && json.items.length > 0) {
          setChecklistGeneral(json.items.map((it: string, idx: number) => ({
            id: `gen-${idx + 1}`,
            item: it,
            status: 'BAIK',
            keterangan: ''
          })));
          return;
        }
      } catch (err) {}

      // Default jika belum di-import
      const typeStr = (found.kode_unit + ' ' + found.model_unit + ' ' + found.kategori).toUpperCase();
      setChecklistGeneral(getTemplateChecklist(typeStr));
    } else {
      setChecklistGeneral([]);
    }
  };

  const getTemplateChecklist = (type: string): ChecklistItem[] => {
    let items: string[] = [
      'Oli Mesin & Level Radiator Coolant',
      'Kebocoran Oli Hidrolik & Hose Main Pump',
      'Sistem Swing, Reduction Gear & Pinion',
      'Track Link, Shoe, Roller, Idler & Sprocket',
      'Boom, Arm, Bucket & Cylinder Pin',
      'Sistem Kelistrikan, Lampu Kerja & Horn',
      'Kabin Operator & System AC',
      'Emergency Stop, Safety Belt & APAR'
    ];

    return items.map((item, idx) => ({
      id: `gen-${idx + 1}`,
      item,
      status: 'BAIK',
      keterangan: ''
    }));
  };

  const handleAttachmentChange = async (val: string) => {
    setAttachment(val);
    if (val !== 'KOSONG') {
      try {
        const res = await fetch(`/api/plant/format-inspeksi?key=${encodeURIComponent(val)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.items) && json.items.length > 0) {
          setChecklistAttachment(json.items.map((it: string, idx: number) => ({
            id: `att-${idx + 1}`,
            item: it,
            status: 'BAIK',
            keterangan: ''
          })));
          return;
        }
      } catch (err) {}

      if (val === 'BREAKER') {
        setChecklistAttachment([
          { id: 'att-1', item: 'Kondisi Chisel / Moil Point Breaker', status: 'BAIK', keterangan: '' },
          { id: 'att-2', item: 'Kebocoran Hoses & Fitting Breaker', status: 'BAIK', keterangan: '' },
          { id: 'att-3', item: 'Accumulator Pressure & Baut Bracket', status: 'BAIK', keterangan: '' }
        ]);
      } else if (val === 'BUCKET') {
        setChecklistAttachment([
          { id: 'att-1', item: 'Kondisi Tooth Bucket & Lock Pin', status: 'BAIK', keterangan: '' },
          { id: 'att-2', item: 'Side Cutter & Wear Plate Bucket', status: 'BAIK', keterangan: '' },
          { id: 'att-3', item: 'Bush & Pin Bucket Assembly', status: 'BAIK', keterangan: '' }
        ]);
      }
    } else {
      setChecklistAttachment([]);
    }
  };

  const updateGeneralStatus = (id: string, status: 'BAIK' | 'RUSAK' | 'NA') => {
    setChecklistGeneral(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  };

  const updateGeneralKet = (id: string, keterangan: string) => {
    setChecklistGeneral(prev => prev.map(item => item.id === id ? { ...item, keterangan } : item));
  };

  const addTemuan = () => setCatatanTemuan(prev => [...prev, { deskripsi: '', tindakan: '', prioritas: 'MEDIUM' }]);
  const removeTemuan = (idx: number) => setCatatanTemuan(prev => prev.filter((_, i) => i !== idx));

  const addBacklogPR = () => setBacklogItems(prev => [...prev, { part_name: '', part_number: '', qty: 1, satuan: 'Pcs', keterangan: '' }]);
  const removeBacklogPR = (idx: number) => setBacklogItems(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) {
      alert('Pilih No. Lambung dari Kelola Unit terlebih dahulu!');
      return;
    }

    setSubmitting(true);
    setSuccessMsg(null);

    const payload = {
      unit_id: selectedUnit.id,
      no_lambung: selectedUnit.kode_unit,
      model_unit: selectedUnit.model_unit,
      sn_unit: selectedUnit.serial_number,
      tanggal,
      inspector: userInfo.name,
      site: userInfo.site,
      shift,
      pekerjaan,
      hm_actual: hmActual,
      lokasi,
      attachment,
      checklist_general: checklistGeneral,
      checklist_attachment: checklistAttachment,
      catatan_temuan: catatanTemuan,
      backlog_items: backlogItems
    };

    try {
      const res = await fetch('/api/plant/inspeksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMsg('Form Inspeksi P2H berhasil disimpan & PR Backlog otomatis terbuat!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert('Gagal menyimpan data inspeksi P2H.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentPeriod = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-[#f4f7fa] p-2 sm:p-3 lg:p-4 pb-24 text-slate-800">
      

      <div className="max-w-4xl mx-auto space-y-3">
        
        {/* Header Title Section */}
        <div className="bg-[#003d79] rounded-xl p-3 sm:p-4 text-white shadow-md text-center space-y-1">
          <h1 className="text-xl sm:text-2xl font-black tracking-wide uppercase">
            FORM INSPEKSI UNIT
          </h1>
          <p className="text-xs sm:text-sm font-semibold opacity-90">{userInfo.site}</p>
          <div className="inline-block bg-[#003d79]/80 text-blue-100 px-3 py-0.5 rounded-full text-xs font-medium">
            Periode {currentPeriod}
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="bg-emerald-500 text-white p-3 rounded-lg shadow font-medium text-xs sm:text-sm flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-white font-bold ml-2">?</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* GRID HEADER DATA UNIT */}
          <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
            
            {/* No. Lambung Dropdown */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1">
                <span>1. No. Lambung</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedUnitKode}
                onChange={(e) => handleSelectUnit(e.target.value)}
                required
                disabled={loadingUnits}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-bold text-slate-800"
              >
                <option value="">
                  {loadingUnits 
                    ? '-- Memuat Data Kelola Unit... --' 
                    : siteUnits.length > 0 
                      ? `-- Pilih Unit Site (${siteUnits.length} Unit) --` 
                      : '-- Belum ada unit di Kelola Unit --'}
                </option>
                {siteUnits.map((u) => (
                  <option key={u.id} value={u.kode_unit}>
                    {u.kode_unit} - {u.nama_unit} ({u.model_unit})
                  </option>
                ))}
              </select>
            </div>

            {/* Tanggal */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">2. Tanggal Inspeksi *</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Inspector */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">3. Inspector</label>
              <input
                type="text"
                value={userInfo.name}
                readOnly
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-100 font-medium text-slate-600 cursor-not-allowed"
              />
            </div>

            {/* Model Unit */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">4. Model Unit</label>
              <input
                type="text"
                value={selectedUnit?.model_unit || ''}
                readOnly
                placeholder="Otomatis terisi"
                className="w-full p-2 border border-slate-200 rounded-lg bg-slate-100 font-medium text-slate-700"
              />
            </div>

            {/* Shift */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">5. Shift *</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Siang (Shift 1)">Siang (Shift 1)</option>
                <option value="Malam (Shift 2)">Malam (Shift 2)</option>
              </select>
            </div>

            {/* Pekerjaan */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">6. Pekerjaan Unit *</label>
              <input
                type="text"
                placeholder="Contoh: Overburden / Ripping / Loading"
                value={pekerjaan}
                onChange={(e) => setPekerjaan(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* SN Unit */}
            <div className="space-y-1">
              <label className="font-semibold text-blue-800">7. SN Unit (Serial Number)</label>
              <input
                type="text"
                value={selectedUnit?.serial_number || '-'}
                readOnly
                className="w-full p-2 border border-blue-200 rounded-lg bg-blue-50/60 font-bold text-blue-900"
              />
            </div>

            {/* HM Actual */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">8. HM Actual *</label>
              <input
                type="number"
                step="0.1"
                placeholder="Contoh: 15420.5"
                value={hmActual}
                onChange={(e) => setHmActual(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Lokasi */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">9. Lokasi Unit *</label>
              <input
                type="text"
                placeholder="Contoh: PIT 2 / Disposal West"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Attachment Terpasang */}
            <div className="space-y-1 sm:col-span-2 md:col-span-3 pt-1 border-t border-slate-100">
              <label className="font-semibold text-slate-800 flex items-center gap-1">
                <Wrench className="w-4 h-4 text-blue-600" />
                <span>10. Attachment Terpasang</span>
              </label>
              <select
                value={attachment}
                onChange={(e) => handleAttachmentChange(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              >
                <option value="KOSONG">Tanpa Attachment / Kosong</option>
                <option value="BUCKET">Bucket Unit</option>
                <option value="BREAKER">Hydraulic Breaker</option>
              </select>
            </div>

          </div>

          {/* Prompt Pilih Unit */}
          {!selectedUnit && (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 text-center space-y-2">
              <AlertTriangle className="w-10 h-10 text-[#003d79] mx-auto" />
              <p className="text-slate-700 font-semibold text-sm sm:text-base">
                Pilih No. Lambung di atas untuk menampilkan checklist inspeksi unit.
              </p>
              <p className="text-xs text-slate-500">
                Format inspeksi disesuaikan dengan master format yang di-import di Kru & Workshop Plant.
              </p>
            </div>
          )}

          {/* SECTION I: CHECKLIST GENERAL */}
          {selectedUnit && (
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200 space-y-3">
              <div className="border-b pb-2 flex items-center justify-between">
                <h2 className="font-bold text-slate-800 text-sm sm:text-base uppercase flex items-center gap-2">
                  <span className="bg-[#003d79] text-white rounded px-2 py-0.5 text-xs">I</span>
                  Checklist General Inspeksi ({selectedUnit.kode_unit} - {selectedUnit.model_unit})
                </h2>
              </div>

              <div className="space-y-2">
                {checklistGeneral.map((chk, index) => (
                  <div key={chk.id} className="p-2 sm:p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
                    <div className="font-medium text-slate-800 flex-1">
                      {index + 1}. {chk.item}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex border border-slate-300 rounded-lg overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => updateGeneralStatus(chk.id, 'BAIK')}
                          className={`px-2.5 py-1 text-xs font-bold transition-all ${
                            chk.status === 'BAIK' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          BAIK
                        </button>
                        <button
                          type="button"
                          onClick={() => updateGeneralStatus(chk.id, 'RUSAK')}
                          className={`px-2.5 py-1 text-xs font-bold transition-all ${
                            chk.status === 'RUSAK' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          RUSAK
                        </button>
                        <button
                          type="button"
                          onClick={() => updateGeneralStatus(chk.id, 'NA')}
                          className={`px-2.5 py-1 text-xs font-bold transition-all ${
                            chk.status === 'NA' ? 'bg-slate-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          N/A
                        </button>
                      </div>

                      {chk.status === 'RUSAK' && (
                        <input
                          type="text"
                          placeholder="Detail kerusakan..."
                          value={chk.keterangan}
                          onChange={(e) => updateGeneralKet(chk.id, e.target.value)}
                          className="p-1.5 text-xs border border-red-300 rounded focus:ring-1 focus:ring-red-500 bg-white"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION II: CHECKLIST ATTACHMENT */}
          {selectedUnit && attachment !== 'KOSONG' && checklistAttachment.length > 0 && (
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200 space-y-3">
              <div className="border-b pb-2">
                <h2 className="font-bold text-slate-800 text-sm sm:text-base uppercase flex items-center gap-2">
                  <span className="bg-indigo-600 text-white rounded px-2 py-0.5 text-xs">II</span>
                  Checklist Inspeksi Attachment ({attachment})
                </h2>
              </div>

              <div className="space-y-2">
                {checklistAttachment.map((chk, index) => (
                  <div key={chk.id} className="p-2 sm:p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
                    <div className="font-medium text-slate-800 flex-1">
                      {index + 1}. {chk.item}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex border border-slate-300 rounded-lg overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => {
                            setChecklistAttachment(prev => prev.map(item => item.id === chk.id ? { ...item, status: 'BAIK' } : item));
                          }}
                          className={`px-2.5 py-1 text-xs font-bold ${chk.status === 'BAIK' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
                        >
                          BAIK
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setChecklistAttachment(prev => prev.map(item => item.id === chk.id ? { ...item, status: 'RUSAK' } : item));
                          }}
                          className={`px-2.5 py-1 text-xs font-bold ${chk.status === 'RUSAK' ? 'bg-red-600 text-white' : 'text-slate-600'}`}
                        >
                          RUSAK
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION III: CATATAN TEMUAN */}
          {selectedUnit && (
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="font-bold text-slate-800 text-sm sm:text-base uppercase flex items-center gap-2">
                  <span className="bg-[#003d79] text-white rounded px-2 py-0.5 text-xs">III</span>
                  Catatan Temuan & Tindakan Perbaikan
                </h2>
                <button
                  type="button"
                  onClick={addTemuan}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Temuan
                </button>
              </div>

              {catatanTemuan.length === 0 ? (
                <p className="text-xs text-[#5a6a7e] italic text-center py-2">Tidak ada catatan temuan awal.</p>
              ) : (
                <div className="space-y-2">
                  {catatanTemuan.map((tm, idx) => (
                    <div key={idx} className="p-2 sm:p-3 border border-amber-200 rounded-lg bg-amber-50/40 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs">
                      <div className="sm:col-span-5">
                        <input
                          type="text"
                          placeholder="Deskripsi Temuan / Kerusakan"
                          value={tm.deskripsi}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCatatanTemuan(prev => prev.map((t, i) => i === idx ? { ...t, deskripsi: val } : t));
                          }}
                          className="w-full p-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          placeholder="Rekomendasi Tindakan Perbaikan"
                          value={tm.tindakan}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCatatanTemuan(prev => prev.map((t, i) => i === idx ? { ...t, tindakan: val } : t));
                          }}
                          className="w-full p-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <select
                          value={tm.prioritas}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setCatatanTemuan(prev => prev.map((t, i) => i === idx ? { ...t, prioritas: val } : t));
                          }}
                          className="w-full p-1.5 border border-slate-300 rounded bg-white font-semibold"
                        >
                          <option value="HIGH">HIGH</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="LOW">LOW</option>
                        </select>
                      </div>
                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeTemuan(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION IV: BACKLOG & PERMINTAAN PART (PR) */}
          {selectedUnit && (
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h2 className="font-bold text-slate-800 text-sm sm:text-base uppercase flex items-center gap-2">
                    <span className="bg-emerald-600 text-white rounded px-2 py-0.5 text-xs">IV</span>
                    Permintaan Sparepart / Backlog PR
                  </h2>
                  <p className="text-[11px] text-slate-500">Otomatis terbuat sebagai Purchase Request (PR) ke Logistik</p>
                </div>
                <button
                  type="button"
                  onClick={addBacklogPR}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Item PR
                </button>
              </div>

              {backlogItems.length === 0 ? (
                <p className="text-xs text-[#5a6a7e] italic text-center py-2">Tidak ada sparepart yang perlu di-request untuk backlog ini.</p>
              ) : (
                <div className="space-y-2">
                  {backlogItems.map((item, idx) => (
                    <div key={idx} className="p-2 sm:p-3 border border-emerald-200 rounded-lg bg-emerald-50/40 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs">
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          placeholder="Nama Sparepart"
                          value={item.part_name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBacklogItems(prev => prev.map((b, i) => i === idx ? { ...b, part_name: val } : b));
                          }}
                          className="w-full p-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          placeholder="Part Number (Opsional)"
                          value={item.part_number}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBacklogItems(prev => prev.map((b, i) => i === idx ? { ...b, part_number: val } : b));
                          }}
                          className="w-full p-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2 flex gap-1">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.qty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            setBacklogItems(prev => prev.map((b, i) => i === idx ? { ...b, qty: val } : b));
                          }}
                          className="w-full p-1.5 border border-slate-300 rounded bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Satuan"
                          value={item.satuan}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBacklogItems(prev => prev.map((b, i) => i === idx ? { ...b, satuan: val } : b));
                          }}
                          className="w-16 p-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Keterangan"
                          value={item.keterangan}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBacklogItems(prev => prev.map((b, i) => i === idx ? { ...b, keterangan: val } : b));
                          }}
                          className="w-full p-1.5 border border-slate-300 rounded bg-white"
                        />
                      </div>
                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeBacklogPR(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUBMIT BUTTON */}
          {selectedUnit && (
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#003d79] hover:bg-[#003d79] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm sm:text-base uppercase tracking-wider"
              >
                {submitting ? (
                  <span>Menyimpan & Memproses PR...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>SIMPAN FORM INSPEKSI & CREATED PR BACKLOG</span>
                  </>
                )}
              </button>
            </div>
          )}

        </form>

      </div>
    

      </div>
  );
}
