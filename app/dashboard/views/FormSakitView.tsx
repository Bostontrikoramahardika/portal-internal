'use client'

// FormSakitView - dipisah dari app/dashboard/page.tsx (tahap 2)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import ApprovalCenterExact from '../components/ApprovalCenterExact';
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { getTablePermissions } from '@/app/lib/tablePermissions'
import { saveOfflineAttendance } from '@/app/lib/offlineDB'
import KoreksiBadge from '../components/KoreksiBadge'
import { Input, StatusBadge, Textarea } from './_fields2'

export default function FormSakitView({ title, onSuccess, data }: any) {
  const [form, setForm] = useState({
    kategori: 'SAKIT',
    alasan_izin: '',
    tanggal: '',
    keterangan: '',
    foto_url: '',
    atasan_nrp: ''
  })
  const [atasanList, setAtasanList] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const riwayat = data?.rows || []

  const ALASAN_IZIN_BERBAYAR = [
    'Pekerja menikah',
    'Menikahkan anaknya',
    'Mengkhitankan anaknya',
    'Membaptiskan anaknya',
    'Suami/istri, orang tua/mertua, anak, atau menantu meninggal dunia',
    'Istri melahirkan atau keguguran kandungan',
    'Anggota keluarga dalam satu rumah meninggal dunia',
    'Mendapat musibah (kebakaran dan bencana alam)'
  ]

  const KATEGORI_CONFIG: any = {
    SAKIT: {
      label: 'Sakit',
      icon: '🤒',
      color: 'rose',
      bgClass: 'bg-rose-500',
      hoverClass: 'hover:bg-rose-600',
      shadowClass: 'shadow-rose-200',
      borderActive: 'border-rose-500 bg-rose-50',
      desc: 'Butuh SKS / Surat Dokter'
    },
    IZIN_POTONGAN: {
      label: 'Izin Potongan',
      icon: '',
      color: 'amber',
      bgClass: 'bg-amber-500',
      hoverClass: 'hover:bg-amber-600',
      shadowClass: 'shadow-amber-200',
      borderActive: 'border-amber-500 bg-amber-50',
      desc: 'Izin dengan potongan gaji'
    },
    IZIN_BERBAYAR: {
      label: 'Izin Berbayar',
      icon: '',
      color: 'emerald',
      bgClass: 'bg-emerald-500',
      hoverClass: 'hover:bg-emerald-600',
      shadowClass: 'shadow-emerald-200',
      borderActive: 'border-emerald-500 bg-emerald-50',
      desc: 'Sesuai UU Ketenagakerjaan'
    }
  }

  const currentConfig = KATEGORI_CONFIG[form.kategori]

  useEffect(() => {
    fetch('/api/attendance/atasan-list')
      .then(r => r.json())
      .then(d => setAtasanList(d.atasan_list || []))
      .catch(err => console.error("Gagal mengambil daftar atasan:", err))
  }, [])

  async function handleUpload(e: any) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/announcements/upload', { method: 'POST', body: fd })
      const d = await res.json()
      if (res.ok) setForm({ ...form, foto_url: d.url })
    } finally { setUploading(false) }
  }

  async function handleSubmit(e: any) {
    e.preventDefault()
    if (!form.atasan_nrp) return alert(" Mohon pilih Atasan Approval terlebih dahulu!")
    if (!form.foto_url) return alert(" Mohon upload foto bukti terlebih dahulu!")
    if (form.kategori === 'IZIN_BERBAYAR' && !form.alasan_izin) {
      return alert(" Mohon pilih salah satu alasan Izin Berbayar!")
    }

    setLoading(true)
    try {
      const payload: any = {
        kategori: form.kategori,
        tanggal: form.tanggal,
        keterangan: form.keterangan,
        foto_url: form.foto_url,
        atasan_nrp: form.atasan_nrp,
        status_atasan: 'PENDING'
      }
      if (form.kategori === 'IZIN_BERBAYAR') {
        payload.alasan_izin = form.alasan_izin
      }

      const res = await fetch('/api/crud', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'attendance_evidences', values: payload })
      })
      if (res.ok) {
        alert(" Pengajuan berhasil dikirim ke atasan!")
        setForm({ kategori: 'SAKIT', alasan_izin: '', tanggal: '', keterangan: '', foto_url: '', atasan_nrp: '' });
        if (typeof onSuccess === 'function') onSuccess();
      } else {
        const err = await res.json()
        alert("❌ Gagal: " + err.error)
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 lg:space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-3 lg:p-6 rounded-2xl lg:rounded-[2.5rem] border shadow-xl">
        <h2 className="text-sm lg:text-2xl font-black mb-2">{currentConfig.icon} {title}</h2>
        <p className="text-xs text-slate-400 mb-4 lg:mb-6 font-medium">Laporkan ketidakhadiran dengan bukti dokumen lengkap.</p>

        <form onSubmit={handleSubmit} className="space-y-3 lg:space-y-5">

          {/* KATEGORI PILIHAN (3 CARD) */}
          <div>
            <label className="block text-[11px] lg:text-sm font-bold text-slate-700 mb-2">
              Pilih Kategori Pengajuan <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2 lg:gap-3">
              {Object.keys(KATEGORI_CONFIG).map((key) => {
                const conf = KATEGORI_CONFIG[key]
                const isActive = form.kategori === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, kategori: key, alasan_izin: '' })}
                    className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl border-2 transition-all text-center ${
                      isActive
                        ? `${conf.borderActive} ring-2 ring-offset-2 ring-${conf.color}-400`
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="text-xl lg:text-2xl mb-1">{conf.icon}</div>
                    <div className={`text-[9px] lg:text-[10px] font-black uppercase tracking-tight ${isActive ? `text-${conf.color}-700` : 'text-slate-500'}`}>
                      {conf.label}
                    </div>
                    <div className="text-[8px] lg:text-[9px] font-bold text-slate-400 mt-1 leading-tight">
                      {conf.desc}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* DROPDOWN ALASAN IZIN BERBAYAR */}
          {form.kategori === 'IZIN_BERBAYAR' && (
            <div className="bg-emerald-50/50 border-2 border-emerald-100 p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] animate-in fade-in duration-300">
              <label className="block text-[11px] lg:text-sm font-bold text-emerald-800 mb-2">
                 Pilih Alasan Izin Berbayar <span className="text-rose-500">*</span>
              </label>
              <p className="text-[9px] lg:text-[10px] font-bold text-emerald-600 mb-2 lg:mb-3 italic">
                Wajib pilih salah satu sesuai UU Ketenagakerjaan
              </p>
              <select
                required
                value={form.alasan_izin}
                onChange={e => setForm({ ...form, alasan_izin: e.target.value })}
                className="w-full py-2 lg:py-2.5 px-3 border-2 border-emerald-200 rounded-lg lg:rounded-2xl bg-white text-[11px] lg:text-sm font-bold focus:border-emerald-500 outline-none transition-all"
              >
                <option value="">-- Pilih Alasan --</option>
                {ALASAN_IZIN_BERBAYAR.map((alasan, i) => (
                  <option key={i} value={alasan}>
                    {i + 1}. {alasan}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* INFO IZIN POTONGAN */}
          {form.kategori === 'IZIN_POTONGAN' && (
            <div className="bg-amber-50 border-2 border-amber-100 p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] text-[11px] lg:text-sm font-bold text-amber-700 leading-relaxed">
               <strong>Perhatian:</strong> Izin Potongan akan mengurangi gaji Anda sesuai kebijakan perusahaan.
            </div>
          )}

          {/* GRID TANGGAL + ATASAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-5">
            <Input label="Tanggal" type="date" required value={form.tanggal} onChange={(v: any) => setForm({ ...form, tanggal: v })} />

            <div>
              <label className="block text-[11px] lg:text-sm font-bold text-slate-700 mb-2">Pilih Atasan Approval (Satu Site)</label>
              <select
                required
                value={form.atasan_nrp}
                onChange={e => setForm({ ...form, atasan_nrp: e.target.value })}
                className="w-full py-2 lg:py-2.5 px-3 border-2 border-slate-50 rounded-lg lg:rounded-2xl bg-slate-50 text-[11px] lg:text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
              >
                <option value="">-- Pilih Nama Atasan --</option>
                {atasanList.map((a: any) => (
                  <option key={a.nrp} value={a.nrp}>
                    {a.nama} ({a.jabatan})
                  </option>
                ))}
              </select>
              {atasanList.length === 0 && (
                <p className="text-[9px] lg:text-[10px] text-rose-500 mt-1 font-bold italic">Tidak ada atasan tersedia di site Anda</p>
              )}
            </div>
          </div>

          {/* UPLOAD BUKTI */}
          <div>
            <label className="block text-[11px] lg:text-sm font-bold text-slate-700 mb-2">
              Upload Bukti Dokumen <span className="text-rose-500">*</span>
            </label>
            <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 mb-2 italic">
              {form.kategori === 'SAKIT' && '📄 Upload: SKS / Surat Dokter'}
              {form.kategori === 'IZIN_POTONGAN' && '📄 Upload: Surat Izin / Bukti Keperluan'}
              {form.kategori === 'IZIN_BERBAYAR' && '📄 Upload: Undangan / Surat Kematian / Bukti Musibah'}
            </p>
            <div className="p-4 lg:p-6 border-2 lg:border-4 border-dashed border-slate-200 rounded-2xl lg:rounded-[2rem] bg-slate-50/50 text-center hover:border-blue-200 transition-all cursor-pointer relative">
              <input type="file" accept="image/*" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              {uploading ? (
                <p className="text-blue-500 font-black text-[11px] lg:text-xs animate-pulse">⏳ SEDANG MENGUNGGAH...</p>
              ) : form.foto_url ? (
                <div className="flex items-center justify-center gap-2 lg:gap-3">
                  <span className="text-emerald-500 font-black text-[11px] lg:text-xs"> DOKUMEN TERUPLOAD</span>
                  <img src={form.foto_url} className="h-9 w-9 lg:h-10 lg:w-10 object-cover rounded-lg lg:rounded-xl" />
                </div>
              ) : (
                <p className="text-slate-400 font-bold text-[11px] lg:text-xs uppercase tracking-[0.15em]">Klik untuk pilih foto dokumen</p>
              )}
            </div>
          </div>

          <Textarea
            label="Keterangan Tambahan"
            value={form.keterangan}
            onChange={(v: any) => setForm({ ...form, keterangan: v })}
            placeholder={
              form.kategori === 'SAKIT' ? "Contoh: Sakit demam, butuh istirahat 3 hari sesuai SKS." :
              form.kategori === 'IZIN_POTONGAN' ? "Contoh: Ada keperluan mendesak keluarga." :
              "Contoh: Detail acara / musibah yang dialami."
            }
          />

          {/* TOMBOL SUBMIT */}
          <button
            disabled={loading || uploading}
            className={`w-full py-2.5 lg:py-3 rounded-xl lg:rounded-2xl font-black text-white text-sm lg:text-base transition-all ${
              loading || uploading
                ? 'bg-slate-300'
                : `${currentConfig.bgClass} ${currentConfig.hoverClass} shadow-lg ${currentConfig.shadowClass}`
            }`}
          >
            {loading ? 'MENGIRIM...' : `${currentConfig.icon} KIRIM PENGAJUAN`}
          </button>
        </form>
      </div>

      {/* CARD RIWAYAT */}
      <div className="bg-white rounded-2xl lg:rounded-[2rem] border shadow-xl overflow-hidden">
        <div className="p-3 lg:p-5 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-800 text-sm lg:text-base">📜 Riwayat Pengajuan ({data?.periode || '-'})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] lg:text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] lg:text-[10px] font-black">
              <tr>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Tanggal</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Kategori</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Keterangan</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Dokumen</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Status Atasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {riwayat.map((r: any, i: number) => {
                const kat = r.kategori || 'SAKIT'
                const conf = KATEGORI_CONFIG[kat] || KATEGORI_CONFIG.SAKIT
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 lg:px-5 lg:py-3 font-bold text-slate-900">{new Date(r.tanggal).toLocaleDateString('id-ID')}</td>
                    <td className="px-3 py-2.5 lg:px-5 lg:py-3">
                      <span className={`px-2 py-1 rounded-lg lg:rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest bg-${conf.color}-50 text-${conf.color}-700 border border-${conf.color}-100`}>
                        {conf.icon} {conf.label}
                      </span>
                      {r.alasan_izin && (
                        <p className="text-[9px] lg:text-[10px] text-slate-500 mt-1 italic">→ {r.alasan_izin}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 lg:px-5 lg:py-3 text-slate-600 italic">"{r.keterangan || '-'}"</td>
                    <td className="px-3 py-2.5 lg:px-5 lg:py-3">
                      {r.foto_url ? <a href={r.foto_url} target="_blank" className="text-blue-600 font-black text-[9px] lg:text-[10px] hover:underline">👁️ LIHAT FOTO</a> : '-'}
                    </td>
                    <td className="px-3 py-2.5 lg:px-5 lg:py-3">
                      <StatusBadge value={r.status_atasan || 'PENDING'} />
                    </td>
                  </tr>
                )
              })}
              {riwayat.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 lg:px-5 lg:py-8 text-center text-slate-300 text-[11px] lg:text-sm font-bold italic">Belum ada riwayat bulan ini</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
