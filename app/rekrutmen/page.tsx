'use client';

import PageHeader from "@/app/components/PageHeader";
import React, { useState, useEffect } from 'react';

interface Position {
  id: string;
  jabatan: string;
}

interface RegionItem {
  id: string;
  name: string;
}

export default function PublicRecruitmentPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    posisi_dilamar: '',
    nama_lengkap: '',
    no_hp: '',
    email: '',
    domisili: '',
    alamat_lengkap: '',
    provinsi: '',
    kabupaten: '',
    kecamatan: '',
    desa: ''
  });

  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);

  // Cascading Wilayah
  const [provinces, setProvinces] = useState<RegionItem[]>([]);
  const [regencies, setRegencies] = useState<RegionItem[]>([]);
  const [districts, setDistricts] = useState<RegionItem[]>([]);
  const [villages, setVillages] = useState<RegionItem[]>([]);

  const [loadingWilayah, setLoadingWilayah] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Fetch Posisi Aktif
  useEffect(() => {
    fetch('/api/rekrutmen')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPositions(data.positions || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingPositions(false));

    // Fetch Provinsi Awal
    fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
      .then(res => res.json())
      .then(data => setProvinces(data || []))
      .catch(console.error);
  }, []);

  // Handler Ganti Provinsi
  const handleProvinsiChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provId = e.target.value;
    const selected = provinces.find(p => p.id === provId);
    setFormData(prev => ({
      ...prev,
      provinsi: selected ? selected.name : '',
      kabupaten: '',
      kecamatan: '',
      desa: ''
    }));
    setRegencies([]);
    setDistricts([]);
    setVillages([]);

    if (provId) {
      setLoadingWilayah(true);
      try {
        const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provId}.json`);
        const data = await res.json();
        setRegencies(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingWilayah(false);
      }
    }
  };

  // Handler Ganti Kabupaten
  const handleKabupatenChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const regId = e.target.value;
    const selected = regencies.find(r => r.id === regId);
    setFormData(prev => ({
      ...prev,
      kabupaten: selected ? selected.name : '',
      kecamatan: '',
      desa: ''
    }));
    setDistricts([]);
    setVillages([]);

    if (regId) {
      setLoadingWilayah(true);
      try {
        const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${regId}.json`);
        const data = await res.json();
        setDistricts(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingWilayah(false);
      }
    }
  };

  // Handler Ganti Kecamatan
  const handleKecamatanChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const distId = e.target.value;
    const selected = districts.find(d => d.id === distId);
    setFormData(prev => ({
      ...prev,
      kecamatan: selected ? selected.name : '',
      desa: ''
    }));
    setVillages([]);

    if (distId) {
      setLoadingWilayah(true);
      try {
        const res = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${distId}.json`);
        const data = await res.json();
        setVillages(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingWilayah(false);
      }
    }
  };

  // Handler Ganti Desa
  const handleDesaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vId = e.target.value;
    const selected = villages.find(v => v.id === vId);
    setFormData(prev => ({
      ...prev,
      desa: selected ? selected.name : ''
    }));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.posisi_dilamar) {
      setErrorMessage('Silakan pilih posisi yang dilamar.');
      return;
    }
    if (!formData.nama_lengkap.trim()) {
      setErrorMessage('Nama lengkap wajib diisi.');
      return;
    }
    if (!formData.no_hp.trim()) {
      setErrorMessage('Nomor WhatsApp / HP wajib diisi.');
      return;
    }

    setSubmitting(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });

      if (ktpFile) data.append('ktp_file', ktpFile);
      if (cvFile) data.append('cv_file', cvFile);

      const res = await fetch('/api/rekrutmen', {
        method: 'POST',
        body: data
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal mengirim lamaran.');
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  // Halaman Sukses
  if (isSuccess) {
    return (
      <div className="min-h-screen pb-24 sm:pb-8  bg-slate-50 flex items-center justify-center p-4">
      <PageHeader title="Rekrutmen" backUrl="/dashboard" />

        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Lamaran Terkirim!</h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            Terima kasih <span className="font-semibold text-slate-800">{formData.nama_lengkap}</span>. 
            Data lamaran Anda untuk posisi <span className="font-semibold text-indigo-600">{formData.posisi_dilamar}</span> telah 
            berhasil kami terima di database HR PT. Boston PPA - MLP.
          </p>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 mb-6 text-left space-y-1">
            <p>• Tim HR akan melakukan screening data & dokumen Anda.</p>
            <p>• Jika sesuai kualifikasi, Anda akan dihubungi melalui WhatsApp di <b>{formData.no_hp}</b>.</p>
          </div>
          <button
            onClick={() => {
              setIsSuccess(false);
              setFormData({
                posisi_dilamar: '',
                nama_lengkap: '',
                no_hp: '',
                email: '',
                domisili: '',
                alamat_lengkap: '',
                provinsi: '',
                kabupaten: '',
                kecamatan: '',
                desa: ''
              });
              setKtpFile(null);
              setCvFile(null);
            }}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-indigo-600/20"
          >
            Kirim Lamaran Lain
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 sm:pb-8  bg-gradient-to-b from-slate-100 to-slate-200 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 rounded-full text-indigo-300 text-xs font-semibold mb-2 border border-indigo-500/30">
            E-Recruitment Portal
          </div>
          <h1 className="text-2xl font-black tracking-tight">PT. BOSTON PPA - MLP</h1>
          <p className="text-[#5a6a7e] text-sm mt-1">Formulir Pendaftaran Calon Karyawan</p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Posisi */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              Posisi yang Dilamar <span className="text-rose-500">*</span>
            </label>
            {loadingPositions ? (
              <div className="h-11 bg-slate-100 rounded-xl animate-pulse" />
            ) : positions.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                Saat ini belum ada lowongan yang dibuka. Silakan cek kembali nanti.
              </div>
            ) : (
              <select
                required
                value={formData.posisi_dilamar}
                onChange={e => setFormData({ ...formData, posisi_dilamar: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Pilih Posisi Lowongan --</option>
                {positions.map(p => (
                  <option key={p.id} value={p.jabatan}>{p.jabatan}</option>
                ))}
              </select>
            )}
          </div>

          {/* Data Pribadi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Nama Lengkap (Sesuai KTP) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Budi Santoso"
                value={formData.nama_lengkap}
                onChange={e => setFormData({ ...formData, nama_lengkap: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                No. WhatsApp / HP Aktif <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="08xxxxxxxxxx"
                value={formData.no_hp}
                onChange={e => setFormData({ ...formData, no_hp: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Alamat Email
              </label>
              <input
                type="email"
                placeholder="email@gmail.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Domisili & Alamat */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Kota / Domisili Saat Ini
              </label>
              <input
                type="text"
                placeholder="Contoh: Balikpapan / Samarinda / Melak"
                value={formData.domisili}
                onChange={e => setFormData({ ...formData, domisili: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Cascading Wilayah */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Asal Daerah KTP (Bertingkat)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  onChange={handleProvinsiChange}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Pilih Provinsi --</option>
                  {provinces.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <select
                  disabled={regencies.length === 0}
                  onChange={handleKabupatenChange}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="">-- Pilih Kab / Kota --</option>
                  {regencies.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>

                <select
                  disabled={districts.length === 0}
                  onChange={handleKecamatanChange}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="">-- Pilih Kecamatan --</option>
                  {districts.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>

                <select
                  disabled={villages.length === 0}
                  onChange={handleDesaChange}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="">-- Pilih Kelurahan / Desa --</option>
                  {villages.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
              {loadingWilayah && <p className="text-[11px] text-indigo-600 animate-pulse">Memuat wilayah...</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Alamat Lengkap KTP (RT/RW/Jalan)
              </label>
              <textarea
                rows={2}
                placeholder="Jl. Merdeka No. 12 RT 04 RW 02"
                value={formData.alamat_lengkap}
                onChange={e => setFormData({ ...formData, alamat_lengkap: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Upload Dokumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                Upload Foto KTP
              </label>
              <p className="text-xs text-slate-500 mb-2">Format: JPG, PNG, PDF (Maks 5MB)</p>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={e => setKtpFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                Upload Curriculum Vitae (CV)
              </label>
              <p className="text-xs text-slate-500 mb-2">Format: PDF / DOCX (Maks 10MB)</p>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={e => setCvFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || positions.length === 0}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-xl text-base shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Mengirim Lamaran...</span>
              </>
            ) : (
              'Kirim Lamaran Sekarang'
            )}
          </button>
        </form>
      </div>
    
      {/* Standard App Footer */}
      <footer className="mt-8 mb-20 sm:mb-6 text-center text-xs text-[#8896a7] italic opacity-60">
        <p>BTM Mobile APP V1.7.0</p>
        <p className="text-[10px]">Powered By rck_Production</p>
      </footer>
</div>
  );
}