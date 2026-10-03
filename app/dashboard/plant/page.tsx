'use client'


import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Wrench, 
  Truck, 
  FileSpreadsheet, 
  Plus, 
  Edit3, 
  Search, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Save, 
  Sliders, 
  ExternalLink,
  Phone,
  HardHat,
  Package,
  ClipboardList,
  BookOpen,
  FileText,
  RefreshCw
} from 'lucide-react';

import StatBanner from '@/app/components/std/StatBanner'
export default function PlantDashboardPage() {
  const [activeTab, setActiveTab] = useState<'KRU_WORKSHOP' | 'KELOLA_UNIT' | 'FORMAT_INSPEKSI' | 'ADMIN_PARTBOOK'>('KRU_WORKSHOP');
  const [siteFilter, setSiteFilter] = useState<string>('PPA-MLP');
  
  // === STATE DATA KRU & WORKSHOP ===
  const [mechanics, setMechanics] = useState<any[]>([]);
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
  };
  const [kruSearch, setKruSearch] = useState('');

  // === STATE KELOLA UNIT & SN ===
  const [units, setUnits] = useState<any[]>([]);
  const [loadingUnits, setLoadingUnits] = useState<boolean>(true);
  const [unitSearch, setUnitSearch] = useState<string>('');
  const [showUnitModal, setShowUnitModal] = useState<boolean>(false);
  const [editingUnit, setEditingUnit] = useState<any | null>(null);
  const [formUnit, setFormUnit] = useState({
    kode_unit: '',
    nama_unit: '',
    merk_model: '',
    serial_number: '',
    kategori: 'PC 200',
    site: 'PPA-MLP',
    status: 'RFU'
  });

  // === STATE FORMAT INSPEKSI ===
  const [selectedKey, setSelectedKey] = useState<string>('Komatsu PC-200');
  const [checklistItems, setChecklistItems] = useState<string[]>([
    'Oli Mesin & Level Radiator Coolant',
    'Kebocoran Oli Hidrolik & Hose Main Pump',
    'Sistem Swing, Reduction Gear & Pinion',
    'Track Link, Shoe, Roller, Idler & Sprocket',
    'Boom, Arm, Bucket & Cylinder Pin',
    'Sistem Kelistrikan, Lampu Kerja & Horn',
    'Kabin Operator & System AC',
    'Emergency Stop, Safety Belt & APAR'
  ]);
  const [newItemText, setNewItemText] = useState<string>('');
  const [jsonImportText, setJsonImportText] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // === STATE ADMIN PARTBOOK ===
  const [partbookUploads, setPartbookUploads] = useState<any[]>([]);
  const [loadingUploads, setLoadingUploads] = useState<boolean>(false);
  const [uploadingPdf, setUploadingPdf] = useState<boolean>(false);
  const [pbUnitModel, setPbUnitModel] = useState<string>('Komatsu PC-200');

  // Fetch Units
  const fetchUnits = async () => {
    setLoadingUnits(true);
    try {
      const res = await fetch(`/api/units?site=${encodeURIComponent(siteFilter)}`);
      const json = await res.json();
      if (json.success) setUnits(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUnits(false);
    }
  };

  useEffect(() => {
    fetchUnits();
    fetchMechanics();
  }, [siteFilter]);

  // Fetch Format Inspeksi
  const fetchTemplate = async (key: string) => {
    try {
      const res = await fetch(`/api/plant/format-inspeksi?key=${encodeURIComponent(key)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.items) && json.items.length > 0) {
        setChecklistItems(json.items);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'FORMAT_INSPEKSI') {
      fetchTemplate(selectedKey);
    }
  }, [selectedKey, activeTab]);

  // Fetch Partbook Uploads
  const fetchPartbookUploads = async () => {
    setLoadingUploads(true);
    try {
      const res = await fetch('/api/partbook/uploads');
      if (res.ok) {
        const json = await res.json();
        setPartbookUploads(json.data || json || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUploads(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ADMIN_PARTBOOK') {
      fetchPartbookUploads();
    }
  }, [activeTab]);

  // Handle Save / Edit Unit
  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingUnit ? 'PUT' : 'POST';
      const payload = editingUnit ? { ...formUnit, id: editingUnit.id } : formUnit;

      const res = await fetch('/api/units', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setShowUnitModal(false);
        setEditingUnit(null);
        setFormUnit({ kode_unit: '', nama_unit: '', merk_model: '', serial_number: '', kategori: 'PC 200', site: 'PPA-MLP', status: 'RFU' });
        fetchUnits();
        alert('Data unit berhasil disimpan!');
      } else {
        alert('Gagal menyimpan data unit: ' + (json.message || 'Error server'));
      }
    } catch (err: any) {
      alert('Terjadi kesalahan jaringan: ' + err.message);
    }
  };

  // Handle Save Template Format
  const handleSaveTemplate = async () => {
    try {
      const res = await fetch('/api/plant/format-inspeksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_key: selectedKey, items: checklistItems })
      });
      const json = await res.json();
      if (json.success) {
        setImportStatus(`Format inspeksi '${selectedKey}' berhasil disimpan!`);
        setTimeout(() => setImportStatus(null), 3000);
      }
    } catch (e) {
      alert('Gagal menyimpan format inspeksi.');
    }
  };

  // Handle Process Import Text
  const handleProcessImport = () => {
    try {
      if (!jsonImportText.trim()) return;
      if (jsonImportText.trim().startsWith('[')) {
        const parsed = JSON.parse(jsonImportText);
        if (Array.isArray(parsed)) {
          setChecklistItems(parsed.map((item: any) => typeof item === 'string' ? item : (item.item || item.nama || String(item))));
          setImportStatus('Import JSON berhasil dimuat ke editor!');
          return;
        }
      }
      const lines = jsonImportText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      setChecklistItems(lines);
      setImportStatus(`Berhasil meng-import ${lines.length} poin inspeksi!`);
    } catch (err) {
      alert('Format import tidak valid.');
    }
  };

  // Handle Upload Partbook File
  const handlePartbookPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPdf(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model_unit', pbUnitModel);

    try {
      const res = await fetch('/api/partbook/upload-file', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        alert('File Partbook berhasil di-upload! Engine parser sedang mengolah halaman partbook.');
        fetchPartbookUploads();
      } else {
        alert('Gagal mengupload file partbook.');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat mengupload partbook.');
    } finally {
      setUploadingPdf(false);
    }
  };

  const filteredKru = mechanics.filter(m => {
    const q = kruSearch.toLowerCase();
    const nama = (m.nama || m.name || '').toLowerCase();
    const nrp = (m.nrp || '').toLowerCase();
    const jabatan = (m.jabatan || m.role || '').toLowerCase();
    const dept = (m.departemen || '').toLowerCase();
    return nama.includes(q) || nrp.includes(q) || jabatan.includes(q) || dept.includes(q);
  });

  const filteredUnits = units.filter(u => 
    u.kode_unit.toLowerCase().includes(unitSearch.toLowerCase()) ||
    u.nama_unit.toLowerCase().includes(unitSearch.toLowerCase()) ||
    u.model_unit.toLowerCase().includes(unitSearch.toLowerCase()) ||
    u.serial_number.toLowerCase().includes(unitSearch.toLowerCase())
  );

  return (
    <div className="bg-[#f4f7fa] pb-24 text-slate-800">
      <StatBanner eyebrow="Plant" title="Kru & Workshop Plant" subtitle="Monitoring kru dan workshop" />
      

      <div className="max-w-5xl mx-auto space-y-3">
        
        {/* UNIFORM BLUE HEADER */}
        <div className="bg-[#003d79] rounded-xl p-3 sm:p-4 text-white shadow-md text-center space-y-1">
          <h1 className="text-xl sm:text-2xl font-black tracking-wide uppercase">
            KRU & WORKSHOP PLANT
          </h1>
          <p className="text-xs sm:text-sm font-semibold opacity-90">PT BOSTON TRIKORA MAHARDIKA SITE PPA-MLP</p>
          <div className="inline-block bg-[#003d79]/80 text-blue-100 px-3 py-0.5 rounded-full text-xs font-medium">
            Kru Plant, Kelola Unit/SN, Format Inspeksi & Admin Partbook Catalog
          </div>
        </div>

        {/* 4 TAB NAVIGATION */}
        <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200 text-xs sm:text-sm font-bold gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('KRU_WORKSHOP')}
            className={`flex-1 py-2 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'KRU_WORKSHOP' ? 'bg-[#003d79] text-white shadow' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <HardHat className="w-4 h-4" /> Kru Plant
          </button>
          
          <button
            onClick={() => setActiveTab('KELOLA_UNIT')}
            className={`flex-1 py-2 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'KELOLA_UNIT' ? 'bg-[#003d79] text-white shadow' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Truck className="w-4 h-4" /> Kelola Unit & SN ({units.length})
          </button>
          
          <button
            onClick={() => setActiveTab('FORMAT_INSPEKSI')}
            className={`flex-1 py-2 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'FORMAT_INSPEKSI' ? 'bg-[#003d79] text-white shadow' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" /> Import Format Inspeksi
          </button>

          <button
            onClick={() => setActiveTab('ADMIN_PARTBOOK')}
            className={`flex-1 py-2 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ADMIN_PARTBOOK' ? 'bg-[#003d79] text-white shadow' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Admin Partbook
          </button>
        </div>

        {/* ================= TAB 1: KRU & WORKSHOP PLANT ================= */}
        {activeTab === 'KRU_WORKSHOP' && (
          <div className="space-y-3">
            
            {/* Shortcuts Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <Link href="/dashboard/plant/inspeksi" className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all flex items-center gap-2 font-bold text-slate-700">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <span>Form Inspeksi P2H</span>
              </Link>
              <Link href="/dashboard/plant/logistik" className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all flex items-center gap-2 font-bold text-slate-700">
                <Package className="w-5 h-5 text-emerald-600" />
                <span>Logistik & Part</span>
              </Link>
              <Link href="/partbook/admin" className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all flex items-center gap-2 font-bold text-slate-700">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <span>Admin Partbook Full</span>
              </Link>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 font-bold text-slate-700">
                <Users className="w-5 h-5 text-amber-600" />
                <span>Kru: {mechanics.length} Personel</span>
              </div>
            </div>

            {/* Action & Search Kru */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs sm:text-sm">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#5a6a7e]" />
                <input
                  type="text"
                  placeholder="Cari Nama Mekanik, NRP, Role..."
                  value={kruSearch}
                  onChange={(e) => setKruSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <button
                onClick={() => alert('Fitur Tambah Personel disimulasikan.')}
                className="w-full sm:w-auto bg-[#003d79] hover:bg-[#003d79] text-white font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Tambah Personel Kru
              </button>
            </div>

            {/* List Mekanik Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {loadingMechanics ? (
            <div className="col-span-1 md:col-span-2 text-center py-10 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-500 font-medium">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#003d79]" />
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
          )}
            </div>

          </div>
        )}

        {/* ================= TAB 2: KELOLA UNIT & SN ================= */}
        {activeTab === 'KELOLA_UNIT' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs sm:text-sm">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#5a6a7e]" />
                <input
                  type="text"
                  placeholder="Cari Kode Unit, SN, Model..."
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <button
                onClick={() => {
                  setEditingUnit(null);
                  setFormUnit({ kode_unit: '', nama_unit: '', merk_model: '', serial_number: '', kategori: 'PC 200', site: 'PPA-MLP', status: 'RFU' });
                  setShowUnitModal(true);
                }}
                className="w-full sm:w-auto bg-[#003d79] hover:bg-[#003d79] text-white font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Tambah Unit Baru
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {loadingUnits ? (
                <p className="p-8 text-center text-xs text-[#5a6a7e]">Memuat data unit site...</p>
              ) : filteredUnits.length === 0 ? (
                <p className="p-8 text-center text-xs text-[#5a6a7e]">Tidak ada unit ditemukan.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredUnits.map((u) => (
                    <div key={u.id} className="p-3 hover:bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800 text-sm sm:text-base">{u.kode_unit}</span>
                          <span className="text-slate-500 font-medium">({u.nama_unit})</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            u.status === 'RFU' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {u.status}
                          </span>
                        </div>
                        <div className="text-slate-500 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          <span>Model: <strong className="text-slate-700">{u.model_unit}</strong></span>
                          <span>SN: <strong className="text-blue-700">{u.serial_number}</strong></span>
                          <span>Site: <strong className="text-slate-700">{u.site}</strong></span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setEditingUnit(u);
                          setFormUnit({
                            kode_unit: u.kode_unit,
                            nama_unit: u.nama_unit,
                            merk_model: u.model_unit,
                            serial_number: u.serial_number,
                            kategori: u.kategori || 'PC 200',
                            site: u.site || 'PPA-MLP',
                            status: u.status || 'RFU'
                          });
                          setShowUnitModal(true);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 self-end sm:self-center"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit / SN
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: IMPORT FORMAT INSPEKSI ================= */}
        {activeTab === 'FORMAT_INSPEKSI' && (
          <div className="space-y-3 text-xs sm:text-sm">
            {importStatus && (
              <div className="bg-emerald-500 text-white p-3 rounded-lg shadow font-medium text-xs flex items-center justify-between">
                <span>{importStatus}</span>
                <button onClick={() => setImportStatus(null)}>?</button>
              </div>
            )}

            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                <div>
                  <h2 className="font-bold text-slate-800 text-sm sm:text-base uppercase flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-600" />
                    Pilih Target Model Unit / Attachment
                  </h2>
                  <p className="text-[11px] text-slate-500">Pilih model unit yang akan disetting item format inspeksi P2H nya</p>
                </div>

                <select
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  className="p-2 border border-blue-300 rounded-lg font-bold text-blue-900 bg-blue-50 focus:ring-2 focus:ring-blue-500"
                >
                  <optgroup label="Model Unit Site">
                    <option value="Komatsu PC-200">Komatsu PC-200 (Excavator)</option>
                    <option value="Komatsu PC-300">Komatsu PC-300 (Excavator)</option>
                    <option value="CAT 320 GX">CAT 320 GX (Excavator)</option>
                    <option value="Komatsu D85ESS-2">Komatsu D85ESS-2 (Bulldozer)</option>
                    <option value="Komatsu GD655-5">Komatsu GD655-5 (Motor Grader)</option>
                    <option value="Scania P360">Scania P360 (Dump Truck)</option>
                    <option value="GENERAL">General Unit Default</option>
                  </optgroup>
                  <optgroup label="Attachment">
                    <option value="BREAKER">Attachment: Hydraulic Breaker</option>
                    <option value="BUCKET">Attachment: Bucket Unit</option>
                  </optgroup>
                </select>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Import Format dari File / Teks (Baris demi Baris / JSON)</span>
                  <span className="text-[10px] text-[#5a6a7e] font-normal">Pisahkan dengan Enter per poin inspeksi</span>
                </label>
                <textarea
                  rows={4}
                  placeholder={`Contoh Teks Import:\nOli Mesin & Kebocoran\nAir Radiator & Undercooling\nTrack Link & Sprocket\nLampu & Klakson`}
                  value={jsonImportText}
                  onChange={(e) => setJsonImportText(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono text-xs"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleProcessImport}
                    className="bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm hover:bg-[#f4f7fa] text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs"
                  >
                    <Upload className="w-3.5 h-3.5" /> Proses Import ke Editor
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">Daftar Poin Checklist ({checklistItems.length} Poin)</h3>
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow"
                  >
                    <Save className="w-4 h-4" /> Simpan Format Inspeksi Ini
                  </button>
                </div>

                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {checklistItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-1.5 border border-slate-200 rounded-lg bg-white">
                      <span className="w-6 text-center text-xs font-bold text-[#5a6a7e]">{idx + 1}.</span>
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const val = e.target.value;
                          setChecklistItems(prev => prev.map((it, i) => i === idx ? val : it));
                        }}
                        className="flex-1 p-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setChecklistItems(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="+ Tambah Poin Inspeksi Baru"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newItemText.trim()) {
                        e.preventDefault();
                        setChecklistItems(prev => [...prev, newItemText.trim()]);
                        setNewItemText('');
                      }
                    }}
                    className="flex-1 p-2 border border-slate-300 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newItemText.trim()) {
                        setChecklistItems(prev => [...prev, newItemText.trim()]);
                        setNewItemText('');
                      }
                    }}
                    className="bg-[#003d79] hover:bg-[#003d79] text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Tambah
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: ADMIN PARTBOOK CATALOG ================= */}
        {activeTab === 'ADMIN_PARTBOOK' && (
          <div className="space-y-3 text-xs sm:text-sm">
            
            {/* Header Box & Direct Link */}
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div>
                <h2 className="font-bold text-slate-800 text-sm sm:text-base uppercase flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Admin Upload Catalog Partbook
                </h2>
                <p className="text-[11px] text-slate-500">Upload PDF Partbook unit untuk membaca sparepart number & diagram assembly</p>
              </div>

              <Link
                href="/partbook/admin"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow text-xs whitespace-nowrap"
              >
                <span>Buka Full Admin Partbook</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Upload PDF Box */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Target Model Unit Partbook</label>
                  <select
                    value={pbUnitModel}
                    onChange={(e) => setPbUnitModel(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white"
                  >
                    <option value="Komatsu PC-200">Komatsu PC-200 (Excavator)</option>
                    <option value="Komatsu PC-300">Komatsu PC-300 (Excavator)</option>
                    <option value="CAT 320 GX">CAT 320 GX (Excavator)</option>
                    <option value="Komatsu D85ESS-2">Komatsu D85ESS-2 (Bulldozer)</option>
                    <option value="Komatsu GD655-5">Komatsu GD655-5 (Motor Grader)</option>
                    <option value="Scania P360">Scania P360 (Dump Truck)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Pilih File Buku Catalog PDF / ZIP</label>
                  <label className="cursor-pointer bg-blue-50 border-2 border-dashed border-blue-300 hover:bg-blue-100 p-2 rounded-lg flex items-center justify-center gap-2 text-blue-800 font-bold transition-all text-xs">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>{uploadingPdf ? 'Mengupload PDF...' : 'Pilih PDF Catalog Unit'}</span>
                    <input
                      type="file"
                      accept=".pdf,.zip,.rar"
                      onChange={handlePartbookPdfUpload}
                      disabled={uploadingPdf}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* List Riwayat Upload Partbook */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-3 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Daftar File Catalog Partbook Ter-upload</h3>
                <button
                  onClick={fetchPartbookUploads}
                  className="text-slate-500 hover:text-blue-600 flex items-center gap-1 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {loadingUploads ? (
                <p className="p-8 text-center text-xs text-[#5a6a7e]">Memuat berkas partbook...</p>
              ) : partbookUploads.length === 0 ? (
                <div className="p-8 text-center space-y-1">
                  <FileText className="w-8 h-8 text-[#5a6a7e] mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Belum ada file partbook yang diupload.</p>
                  <p className="text-[11px] text-[#5a6a7e]">Gunakan form di atas untuk memasukkan catalog PDF baru.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {partbookUploads.map((pb) => (
                    <div key={pb.id} className="p-3 flex items-center justify-between text-xs sm:text-sm hover:bg-slate-50">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-800">{pb.file_name || pb.filename || 'Catalog Partbook PDF'}</p>
                        <p className="text-slate-500 text-xs">Model: <span className="font-semibold text-blue-700">{pb.model_unit || pb.model || 'General'}</span></p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          PROCESSED
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* MODAL INPUT / EDIT UNIT & SN */}
        {showUnitModal && (
          <div className="fixed inset-0 bg-[#f4f7fa]/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
              <div className="bg-[#003d79] p-3 text-white font-bold flex justify-between items-center text-sm sm:text-base">
                <span>{editingUnit ? `Edit Unit: ${editingUnit.kode_unit}` : 'Tambah Unit Baru'}</span>
                <button onClick={() => setShowUnitModal(false)} className="text-white hover:opacity-80 font-bold">?</button>
              </div>

              <form onSubmit={handleSaveUnit} className="p-4 space-y-3 text-xs sm:text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Kode Unit *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: E201"
                      value={formUnit.kode_unit}
                      onChange={(e) => setFormUnit({ ...formUnit, kode_unit: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Nama Unit *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: E 201 B"
                      value={formUnit.nama_unit}
                      onChange={(e) => setFormUnit({ ...formUnit, nama_unit: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Merk / Model Unit *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Komatsu PC-200"
                      value={formUnit.merk_model}
                      onChange={(e) => setFormUnit({ ...formUnit, merk_model: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-blue-700">Serial Number (SN) Unit *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: SN-884920"
                      value={formUnit.serial_number}
                      onChange={(e) => setFormUnit({ ...formUnit, serial_number: e.target.value })}
                      className="w-full p-2 border border-blue-300 rounded-lg bg-blue-50/50 font-bold text-blue-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Site *</label>
                    <input
                      type="text"
                      required
                      value={formUnit.site}
                      onChange={(e) => setFormUnit({ ...formUnit, site: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Status Unit *</label>
                    <select
                      value={formUnit.status}
                      onChange={(e) => setFormUnit({ ...formUnit, status: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="RFU">RFU (Ready For Use)</option>
                      <option value="BREAKDOWN">BD (Breakdown)</option>
                      <option value="STANDBY">Standby</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUnitModal(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#003d79] hover:bg-[#003d79] text-white rounded-lg font-bold"
                  >
                    Simpan Unit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    

      </div>
  );
}
