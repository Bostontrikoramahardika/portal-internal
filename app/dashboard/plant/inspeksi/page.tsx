'use client'


import React, { useState, useEffect } from 'react';
import { Wrench, AlertTriangle, Trash2, Send, Plus } from 'lucide-react';

import StatBanner from '@/app/components/std/StatBanner'
import { CHECKLIST_TEMPLATES, getInspectionReference, resolveInspectionModel, supportsExcavatorAttachment } from './checklist-templates'
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

const getUnitModelDescriptor = (unit: UnitData): string =>
  `${unit.kode_unit} ${unit.nama_unit} ${unit.model_unit} ${unit.kategori}`;

interface ChecklistItem {
  id: string;
  section: string;
  item: string;
  actual: string;
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
  const [operatorName, setOperatorName] = useState<string>('');
  const [mechanicName, setMechanicName] = useState<string>('');
  const [hmActual, setHmActual] = useState<string>('');
  const [lokasi, setLokasi] = useState<string>('');
  const [attachment, setAttachment] = useState<string>('KOSONG');
  const [inspectionScore, setInspectionScore] = useState<string>('');
  const [inspectionNote, setInspectionNote] = useState<string>('');

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

  // Pilih template internal untuk empat model yang telah direview; template import tetap menjadi fallback model lain.
  const handleSelectUnit = async (kode: string) => {
    setSelectedUnitKode(kode);
    const found = siteUnits.find(u => u.kode_unit === kode) || null;
    setSelectedUnit(found);
    setAttachment('KOSONG');
    setChecklistAttachment([]);

    if (!found) {
      setChecklistGeneral([]);
      return;
    }

    const modelKey = resolveInspectionModel(getUnitModelDescriptor(found));
    if (modelKey !== 'PC200' && modelKey !== 'OTHER') {
      const sections = CHECKLIST_TEMPLATES[modelKey].sections;
      setChecklistGeneral(sections.flatMap((section, sectionIndex) =>
        section.items.map((item, itemIndex) => ({
          id: `gen-${sectionIndex + 1}-${itemIndex + 1}`,
          section: section.title,
          item,
          actual: '',
          status: 'BAIK' as const,
          keterangan: ''
        }))
      ));
      return;
    }

    const templateKey = found.model_unit || 'GENERAL';
    try {
      const res = await fetch(`/api/plant/format-inspeksi?key=${encodeURIComponent(templateKey)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.items) && json.items.length > 0) {
        setChecklistGeneral(json.items.map((item: string, idx: number) => ({
          id: `gen-${idx + 1}`,
          section: 'PEMERIKSAAN UMUM',
          item,
          actual: '',
          status: 'BAIK' as const,
          keterangan: ''
        })));
        return;
      }
    } catch (err) {
      console.error('Gagal memuat template inspeksi:', err);
    }

    // Fallback lama dipertahankan untuk PC200 dan model yang belum memiliki template khusus.
    const typeStr = getUnitModelDescriptor(found).toUpperCase();
    setChecklistGeneral(getTemplateChecklist(typeStr));
  };

  const getTemplateChecklist = (type: string): ChecklistItem[] => {
    let section = 'PEMERIKSAAN UMUM';
    let items: string[] = [
      'Level/kebocoran engine oil dan coolant',
      'Kebocoran hydraulic oil, hose, dan fitting',
      'Fungsi power train / travel dan bunyi abnormal',
      'Kondisi undercarriage sesuai tipe unit',
      'Work equipment, pin/bushing, dan kelonggaran',
      'Kelistrikan, lampu kerja, alarm, dan horn',
      'Kabin operator, seat belt, dan APAR'
    ];

    if (type.includes('GRADER')) {
      section = 'MOTOR GRADER';
      items = ['Engine/cooling/fuel', 'Transmission dan tandem drive', 'Ban, axle, frame, dan articulation', 'Steering, brake, dan hydraulic', 'Circle, drawbar, moldboard, dan cutting edge', 'Kelistrikan dan safety'];
    } else if (type.includes('DOZER') || type.includes('BULLDOZER')) {
      section = 'CRAWLER DOZER';
      items = ['Engine/cooling/fuel', 'Power train, steering, dan brake', 'Hydraulic system', 'Track shoe, link, roller, idler, sprocket, dan tension', 'Blade/ripper dan work equipment', 'Kelistrikan dan safety'];
    } else if (type.includes('EXCAVATOR') || type.includes('PC')) {
      section = 'EXCAVATOR';
      items = ['Engine/cooling/fuel', 'Hydraulic, swing, dan travel', 'Undercarriage', 'Boom, arm, linkage, dan cylinder', 'Kelistrikan dan safety'];
    }

    return items.map((item, idx) => ({
      id: `gen-${idx + 1}`,
      section,
      item,
      actual: '',
      status: 'BAIK',
      keterangan: ''
    }));
  };

  const handleAttachmentChange = async (val: string) => {
    setAttachment(val);
    if (val === 'KOSONG') {
      setChecklistAttachment([]);
      return;
    }

    try {
      const res = await fetch(`/api/plant/format-inspeksi?key=${encodeURIComponent(val)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.items) && json.items.length > 0) {
        setChecklistAttachment(json.items.map((item: string, idx: number) => ({
          id: `att-${idx + 1}`,
          section: val === 'BREAKER' ? 'HYDRAULIC BREAKER' : 'BUCKET',
          item,
          actual: '',
          status: 'BAIK' as const,
          keterangan: ''
        })));
        return;
      }
    } catch (err) {
      console.error('Gagal memuat template attachment:', err);
    }

    if (val === 'BREAKER') {
      setChecklistAttachment([
        { id: 'att-1', section: 'HYDRAULIC BREAKER', item: 'Kondisi chisel / moil point', actual: '', status: 'BAIK', keterangan: '' },
        { id: 'att-2', section: 'HYDRAULIC BREAKER', item: 'Kebocoran hose dan fitting', actual: '', status: 'BAIK', keterangan: '' },
        { id: 'att-3', section: 'HYDRAULIC BREAKER', item: 'Accumulator/bracket: kondisi luar dan baut', actual: '', status: 'BAIK', keterangan: '' }
      ]);
    } else if (val === 'BUCKET') {
      setChecklistAttachment([
        { id: 'att-1', section: 'BUCKET', item: 'Tooth / adapter dan lock pin', actual: '', status: 'BAIK', keterangan: '' },
        { id: 'att-2', section: 'BUCKET', item: 'Cutting edge, side cutter, dan wear plate', actual: '', status: 'BAIK', keterangan: '' },
        { id: 'att-3', section: 'BUCKET', item: 'Pin/bushing dan kelonggaran linkage', actual: '', status: 'BAIK', keterangan: '' }
      ]);
    }
  };

  const updateGeneralStatus = (id: string, status: 'BAIK' | 'RUSAK' | 'NA') => {
    setChecklistGeneral(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  };

  const updateGeneralActual = (id: string, actual: string) => {
    setChecklistGeneral(prev => prev.map(item => item.id === id ? { ...item, actual } : item));
  };

  const updateGeneralKet = (id: string, keterangan: string) => {
    setChecklistGeneral(prev => prev.map(item => item.id === id ? { ...item, keterangan } : item));
  };

  const updateAttachmentStatus = (id: string, status: 'BAIK' | 'RUSAK' | 'NA') => {
    setChecklistAttachment(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  };

  const updateAttachmentActual = (id: string, actual: string) => {
    setChecklistAttachment(prev => prev.map(item => item.id === id ? { ...item, actual } : item));
  };

  const updateAttachmentKet = (id: string, keterangan: string) => {
    setChecklistAttachment(prev => prev.map(item => item.id === id ? { ...item, keterangan } : item));
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

    const modelKey = resolveInspectionModel(getUnitModelDescriptor(selectedUnit));
    const payload = {
      unit_id: selectedUnit.id,
      no_lambung: selectedUnit.kode_unit,
      no_unit: selectedUnit.kode_unit,
      model_unit: selectedUnit.model_unit,
      sn_unit: selectedUnit.serial_number,
      tanggal,
      inspector: userInfo.name,
      inspector_nrp: userInfo.nrp,
      inspector_nama: userInfo.name,
      site: userInfo.site,
      shift,
      pekerjaan,
      operator: operatorName,
      mekanik: mechanicName,
      hm_actual: hmActual,
      hm_akhir: hmActual,
      lokasi,
      attachment,
      checklist_general: checklistGeneral,
      checklist_attachment: checklistAttachment,
      checklist: {
        general: checklistGeneral,
        attachment: checklistAttachment,
        operator: operatorName,
        mekanik: mechanicName,
        inspection_score: inspectionScore ? Number(inspectionScore) : null,
        inspector_note: inspectionNote,
        pekerjaan,
        hm_actual: hmActual,
        lokasi
      },
      catatan_temuan: catatanTemuan,
      temuan_tindakan: catatanTemuan,
      backlog_items: backlogItems,
      type_breaker: attachment === 'BREAKER' ? 'BREAKER' : '',
      type_chisel: '',
      status_kelayakan: 'READY',
      jenis_unit: (modelKey === 'OTHER' || modelKey === 'PC210-10M0' || modelKey === 'PC200') ? selectedUnit.model_unit : modelKey
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
  const selectedModelKey = selectedUnit
    ? resolveInspectionModel(getUnitModelDescriptor(selectedUnit))
    : 'OTHER';
  const standardNote = selectedUnit
    ? getInspectionReference(selectedModelKey, selectedUnit.model_unit)
    : '';
  const showAttachmentControls = selectedUnit
    ? supportsExcavatorAttachment(getUnitModelDescriptor(selectedUnit))
    : false;
  const checklistGroups = Array.from(checklistGeneral.reduce((groups, item, index) => {
    const group = groups.get(item.section) || [];
    group.push({ item, index });
    groups.set(item.section, group);
    return groups;
  }, new Map<string, { item: ChecklistItem; index: number }[]>()));

  return (
    <div className="bg-[#f4f7fa] pb-24 text-slate-800">
      <StatBanner eyebrow="Plant" title="Inspeksi P2H" subtitle="Pemeriksaan harian unit" />
      

      <div className="max-w-4xl mx-auto space-y-3">
        
        {/* Info ringkas di bawah StatBanner; hindari header biru ganda */}
        <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold text-slate-700">{userInfo.site}</span>
          <span>Periode {currentPeriod}</span>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="bg-emerald-500 text-white p-3 rounded-lg shadow font-medium text-xs sm:text-sm flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-white font-bold ml-2">?</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="rounded-xl border border-slate-200 border-l-4 border-l-blue-600 bg-white p-3 text-xs text-slate-700 sm:text-sm">
            <strong className="block font-bold text-blue-900">Form Inspeksi Berkala · Tim Plant</strong>
            <span className="mt-1 block">Form pemeriksaan berkala Tim Plant, terpisah dari pemeriksaan harian operator dan servis OEM berbasis HM. Catat actual, status, dan tindak lanjut temuan.</span>
          </div>

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

            {/* Operator */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">5. Operator</label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                placeholder="Nama operator"
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Mekanik */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">6. Mekanik</label>
              <input
                type="text"
                value={mechanicName}
                onChange={(e) => setMechanicName(e.target.value)}
                placeholder="Nama mekanik pemeriksa"
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* Shift */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">7. Shift *</label>
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
              <label className="font-semibold text-slate-700">8. Pekerjaan Unit *</label>
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
              <label className="font-semibold text-blue-800">9. SN Unit (Serial Number)</label>
              <input
                type="text"
                value={selectedUnit?.serial_number || '-'}
                readOnly
                className="w-full p-2 border border-blue-200 rounded-lg bg-blue-50/60 font-bold text-blue-900"
              />
            </div>

            {/* HM Actual */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">10. HM Actual *</label>
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
              <label className="font-semibold text-slate-700">11. Lokasi Unit *</label>
              <input
                type="text"
                placeholder="Contoh: PIT 2 / Disposal West"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {showAttachmentControls && (
              <div className="space-y-1 sm:col-span-2 md:col-span-3 pt-1 border-t border-slate-100">
                <label className="font-semibold text-slate-800 flex items-center gap-1">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  <span>12. Attachment Terpasang · Excavator</span>
                </label>
                <select
                  value={attachment}
                  onChange={(e) => handleAttachmentChange(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  <option value="KOSONG">Tidak ada / kosong</option>
                  <option value="BUCKET">Bucket Unit</option>
                  <option value="BREAKER">Hydraulic Breaker</option>
                </select>
                <p className="text-[11px] text-slate-500">Checklist Bucket dan Breaker terpisah; tidak berlaku untuk dozer atau grader.</p>
              </div>
            )}

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

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                <strong className="block font-bold">Standar / Rujukan</strong>
                <p className="mt-1">{standardNote}</p>
                <p className="mt-1 text-blue-800">Catat hasil aktual. Nilai wear/repair limit tidak diasumsikan; cocokkan ke manual unit yang benar.</p>
              </div>

              <div className="space-y-4">
                {checklistGroups.map(([sectionName, entries]) => (
                  <div key={sectionName}>
                    <h3 className="mb-2 border-b border-slate-200 pb-1 text-[11px] font-black uppercase tracking-wide text-blue-800">{sectionName}</h3>
                    <div className="space-y-2">
                      {entries.map(({ item: chk, index }) => (
                        <div key={chk.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2 sm:p-3">
                          <div className="font-medium text-slate-800 text-xs sm:text-sm">{index + 1}. {chk.item}</div>
                          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                              type="text"
                              value={chk.actual}
                              onChange={(e) => updateGeneralActual(chk.id, e.target.value)}
                              placeholder="Actual / hasil ukur atau kondisi"
                              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white p-2 text-xs focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex w-fit overflow-hidden rounded-lg border border-slate-300 bg-white">
                              <button type="button" onClick={() => updateGeneralStatus(chk.id, 'BAIK')} className={`px-3 py-1.5 text-xs font-bold ${chk.status === 'BAIK' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>OK</button>
                              <button type="button" onClick={() => updateGeneralStatus(chk.id, 'RUSAK')} className={`px-3 py-1.5 text-xs font-bold ${chk.status === 'RUSAK' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>NG</button>
                              <button type="button" onClick={() => updateGeneralStatus(chk.id, 'NA')} className={`px-3 py-1.5 text-xs font-bold ${chk.status === 'NA' ? 'bg-slate-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>N/A</button>
                            </div>
                          </div>
                          {chk.status === 'RUSAK' && (
                            <input
                              type="text"
                              value={chk.keterangan}
                              onChange={(e) => updateGeneralKet(chk.id, e.target.value)}
                              placeholder="Temuan / tindak lanjut"
                              className="mt-2 w-full rounded-lg border border-red-300 bg-white p-2 text-xs focus:ring-1 focus:ring-red-500"
                            />
                          )}
                        </div>
                      ))}
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
                  <div key={chk.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2 sm:p-3">
                    <div className="font-medium text-slate-800 text-xs sm:text-sm">{index + 1}. {chk.item}</div>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={chk.actual}
                        onChange={(e) => updateAttachmentActual(chk.id, e.target.value)}
                        placeholder="Actual / hasil pemeriksaan"
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white p-2 text-xs"
                      />
                      <div className="flex w-fit overflow-hidden rounded-lg border border-slate-300 bg-white">
                        <button type="button" onClick={() => updateAttachmentStatus(chk.id, 'BAIK')} className={`px-3 py-1.5 text-xs font-bold ${chk.status === 'BAIK' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}>OK</button>
                        <button type="button" onClick={() => updateAttachmentStatus(chk.id, 'RUSAK')} className={`px-3 py-1.5 text-xs font-bold ${chk.status === 'RUSAK' ? 'bg-red-600 text-white' : 'text-slate-600'}`}>NG</button>
                        <button type="button" onClick={() => updateAttachmentStatus(chk.id, 'NA')} className={`px-3 py-1.5 text-xs font-bold ${chk.status === 'NA' ? 'bg-slate-600 text-white' : 'text-slate-600'}`}>N/A</button>
                      </div>
                    </div>
                    {chk.status === 'RUSAK' && (
                      <input
                        type="text"
                        value={chk.keterangan}
                        onChange={(e) => updateAttachmentKet(chk.id, e.target.value)}
                        placeholder="Temuan / tindak lanjut"
                        className="mt-2 w-full rounded-lg border border-red-300 bg-white p-2 text-xs"
                      />
                    )}
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
                            const val = e.target.value as TemuanItem['prioritas'];
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

          {selectedUnit && (
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200 space-y-3">
              <div className="border-b pb-2">
                <h2 className="font-bold text-slate-800 text-sm sm:text-base uppercase">Kesimpulan Inspeksi · Inspector</h2>
                <p className="mt-1 text-[11px] text-slate-500">Isi nilai 1–100 dan keterangan dari Inspector.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 text-xs">Nilai inspeksi (1–100) *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={inspectionScore}
                    onChange={(e) => setInspectionScore(e.target.value)}
                    required
                    placeholder="1–100"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 text-xs">Keterangan Inspector</label>
                  <textarea
                    value={inspectionNote}
                    onChange={(e) => setInspectionNote(e.target.value)}
                    rows={3}
                    placeholder="Ringkasan kondisi, temuan penting, atau rekomendasi"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
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
