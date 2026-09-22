'use client';

import React, { useState, useEffect } from 'react';

interface Position {
  id: string;
  jabatan: string;
  is_open: boolean;
}

interface Applicant {
  id: string;
  posisi_dilamar: string;
  nama_lengkap: string;
  domisili: string;
  alamat_lengkap: string;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  no_hp: string;
  email: string;
  foto_ktp_url: string;
  cv_url: string;
  status: string;
  catatan_hr: string;
  reviewed_by: string;
  reviewed_at: string;
  created_at: string;
}

const STATUS_LIST = [
  'BARU',
  'SCREENING',
  'INTERVIEW',
  'MCU',
  'OFFERING',
  'DITERIMA',
  'DITOLAK'
];

export default function HRRecruitmentPage() {
  const [activeTab, setActiveTab] = useState<'pelamar' | 'lowongan'>('pelamar');
  const [positions, setPositions] = useState<Position[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPosisi, setFilterPosisi] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal Detail Pelamar
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editCatatan, setEditCatatan] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  // New Position Form
  const [newPositionName, setNewPositionName] = useState('');
  const [addingPosition, setAddingPosition] = useState(false);

  // Copy Link Alert
  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rekrutmen/hr');
      const data = await res.json();
      if (data.success) {
        setPositions(data.positions || []);
        setApplicants(data.applicants || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Toggle Lowongan
  const handleTogglePosition = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/rekrutmen/hr', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_position',
          id,
          is_open: !currentStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        setPositions(prev =>
          prev.map(p => (p.id === id ? { ...p, is_open: !currentStatus } : p))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Tambah Jabatan Baru
  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPositionName.trim()) return;

    setAddingPosition(true);
    try {
      const res = await fetch('/api/rekrutmen/hr', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_position',
          jabatan: newPositionName.trim()
        })
      });
      const data = await res.json();
      if (data.success && data.position) {
        setPositions(prev => [...prev, data.position].sort((a, b) => a.jabatan.localeCompare(b.jabatan)));
        setNewPositionName('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingPosition(false);
    }
  };

  // Update Status Pelamar
  const handleSaveApplicant = async () => {
    if (!selectedApplicant) return;
    setSavingStatus(true);
    try {
      const res = await fetch('/api/rekrutmen/hr', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_applicant',
          id: selectedApplicant.id,
          status: editStatus,
          catatan_hr: editCatatan
        })
      });
      const data = await res.json();
      if (data.success) {
        setApplicants(prev =>
          prev.map(a =>
            a.id === selectedApplicant.id
              ? { ...a, status: editStatus, catatan_hr: editCatatan }
              : a
          )
        );
        setSelectedApplicant(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingStatus(false);
    }
  };

  // Filter Logic
  const filteredApplicants = applicants.filter(a => {
    const matchSearch =
      a.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.no_hp.includes(searchQuery) ||
      (a.email && a.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchPosisi = filterPosisi === 'ALL' || a.posisi_dilamar === filterPosisi;
    const matchStatus = filterStatus === 'ALL' || a.status === filterStatus;

    return matchSearch && matchPosisi && matchStatus;
  });

  const copyPublicLink = () => {
    const url = `${window.location.origin}/rekrutmen`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BARU':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SCREENING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'INTERVIEW':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'MCU':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'OFFERING':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'DITERIMA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DITOLAK':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Manajemen Rekrutmen HR</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola pembukaan lowongan kerja dan data pelamar masuk.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={copyPublicLink}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-sm border border-indigo-200 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? 'Link Disalin! ✅' : 'Salin Link Form Publik'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-6 rounded-t-2xl">
        <button
          onClick={() => setActiveTab('pelamar')}
          className={`py-4 px-6 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'pelamar'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Data Pelamar Masuk</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">
            {applicants.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('lowongan')}
          className={`py-4 px-6 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'lowongan'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Kelola Lowongan (Master Posisi)</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">
            {positions.filter(p => p.is_open).length} Dibuka
          </span>
        </button>
      </div>

      {/* TAB 1: DATA PELAMAR */}
      {activeTab === 'pelamar' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 p-6 space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cari Pelamar</label>
              <input
                type="text"
                placeholder="Cari Nama / No HP / Email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filter Posisi</label>
              <select
                value={filterPosisi}
                onChange={e => setFilterPosisi(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="ALL">Semua Posisi</option>
                {positions.map(p => (
                  <option key={p.id} value={p.jabatan}>{p.jabatan}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filter Status</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                {STATUS_LIST.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-xs uppercase font-bold text-slate-500">
                  <th className="py-3 px-4">Tgl Lamar</th>
                  <th className="py-3 px-4">Nama Pelamar</th>
                  <th className="py-3 px-4">Posisi</th>
                  <th className="py-3 px-4">Kontak / Domisili</th>
                  <th className="py-3 px-4">Dokumen</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 animate-pulse">
                      Memuat data pelamar...
                    </td>
                  </tr>
                ) : filteredApplicants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Tidak ada data pelamar yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredApplicants.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-400">
                        {new Date(a.created_at).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {a.nama_lengkap}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md text-xs">
                          {a.posisi_dilamar}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="font-medium text-slate-800">{a.no_hp}</div>
                        <div className="text-slate-400">{a.domisili || a.kabupaten || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-xs space-x-2">
                        {a.foto_ktp_url ? (
                          <a
                            href={a.foto_ktp_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline font-semibold"
                          >
                            KTP
                          </a>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                        <span>|</span>
                        {a.cv_url ? (
                          <a
                            href={a.cv_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline font-semibold"
                          >
                            CV
                          </a>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getStatusBadge(a.status)}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedApplicant(a);
                            setEditStatus(a.status);
                            setEditCatatan(a.catatan_hr || '');
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-semibold rounded-lg transition"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: KELOLA LOWONGAN */}
      {activeTab === 'lowongan' && (
        <div className="bg-white rounded-b-2xl border border-slate-200 p-6 space-y-6">
          {/* Add New Custom Position */}
          <form onSubmit={handleAddPosition} className="flex gap-3 max-w-lg">
            <input
              type="text"
              placeholder="Nama Jabatan / Posisi Baru..."
              value={newPositionName}
              onChange={e => setNewPositionName(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={addingPosition || !newPositionName.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow transition disabled:opacity-50"
            >
              {addingPosition ? 'Menambah...' : '+ Tambah Jabatan'}
            </button>
          </form>

          {/* Grid Positions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {positions.map(p => (
              <div
                key={p.id}
                className={`p-4 rounded-xl border flex items-center justify-between transition ${
                  p.is_open
                    ? 'bg-indigo-50/40 border-indigo-200'
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
              >
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{p.jabatan}</h4>
                  <span className={`text-[11px] font-semibold ${p.is_open ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {p.is_open ? '● Dibuka (Muncul di Form)' : '○ Ditutup'}
                  </span>
                </div>
                <button
                  onClick={() => handleTogglePosition(p.id, p.is_open)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                    p.is_open
                      ? 'bg-rose-100 hover:bg-rose-200 text-rose-700'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {p.is_open ? 'Tutup' : 'Buka'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL REVIEW PELAMAR */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-800">Detail & Review Pelamar</h3>
              <button
                onClick={() => setSelectedApplicant(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block">Nama Lengkap</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedApplicant.nama_lengkap}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Posisi Dilamar</span>
                  <span className="font-bold text-indigo-700 text-sm">{selectedApplicant.posisi_dilamar}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">No. WhatsApp</span>
                  <a
                    href={`https://wa.me/${selectedApplicant.no_hp.replace(/^0/, '62')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-emerald-600 hover:underline"
                  >
                    {selectedApplicant.no_hp} ↗
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 block">Email</span>
                  <span className="font-medium text-slate-700">{selectedApplicant.email || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block">Alamat / Domisili</span>
                  <span className="font-medium text-slate-700">
                    {selectedApplicant.alamat_lengkap ? `${selectedApplicant.alamat_lengkap}, ` : ''}
                    {selectedApplicant.desa ? `Desa ${selectedApplicant.desa}, ` : ''}
                    {selectedApplicant.kecamatan ? `Kec. ${selectedApplicant.kecamatan}, ` : ''}
                    {selectedApplicant.kabupaten ? `${selectedApplicant.kabupaten}, ` : ''}
                    {selectedApplicant.provinsi}
                  </span>
                </div>
              </div>

              {/* Dokumen */}
              <div className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                {selectedApplicant.foto_ktp_url && (
                  <a
                    href={selectedApplicant.foto_ktp_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-indigo-600 hover:bg-indigo-50"
                  >
                    📄 Lihat KTP
                  </a>
                )}
                {selectedApplicant.cv_url && (
                  <a
                    href={selectedApplicant.cv_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-indigo-600 hover:bg-indigo-50"
                  >
                    📁 Download CV
                  </a>
                )}
              </div>

              {/* Status Update */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ubah Status Tahapan
                </label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {STATUS_LIST.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Catatan HR */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Catatan HR
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Lolos screening berkas, jadwal interview tgl 10..."
                  value={editCatatan}
                  onChange={e => setEditCatatan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedApplicant(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={handleSaveApplicant}
                disabled={savingStatus}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow transition disabled:opacity-50"
              >
                {savingStatus ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}