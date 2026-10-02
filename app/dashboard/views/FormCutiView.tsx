'use client'

// FormCutiView - dipisah dari app/dashboard/page.tsx (tahap 2)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import ApprovalCenterExact from '../components/ApprovalCenterExact';
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { getTablePermissions } from '@/app/lib/tablePermissions'
import { saveOfflineAttendance } from '@/app/lib/offlineDB'
import KoreksiBadge from '../components/KoreksiBadge'
import { Input, Select, StatusBadge, Textarea } from './_fields2'

export default function FormCutiView(props: any) {
  const { user, data, onSuccess } = props || {}
  const mode = props?.mode || (props?.activeMenu === 'cuti_saya' ? 'history' : 'form')
  const title = mode === 'history' ? 'Riwayat Cuti Saya' : 'Form Pengajuan Cuti'
  const eligibleTiket = !!data?.eligible_tiket_pesawat
  const sisaCutiTahunan = Number(data?.sisa_cuti_tahunan ?? 0)
  const tahunCuti = data?.tahun_cuti || new Date().getFullYear()

const [form, setForm] = useState<any>({
  tanggal_mulai: '',
  tanggal_selesai: '',
  jenis_cuti: '',
  alasan: '',
  atasan_nrp: '',
  jumlah_hari: '',
  butuh_tiket: false,
  tiket_berangkat_tanggal: '',
  tiket_berangkat_tujuan: '',
  tiket_kembali_tanggal: '',
  tiket_kembali_tujuan: '',
  // Cuti Kompensasi
  kompensasi_mulai: '',
  kompensasi_selesai: '',
  reguler_mulai: '',
  reguler_selesai: '',
  roster_cr_tanggal: ''
})

  const [atasanList, setAtasanList] = useState<any[]>([])
  const [isDirectPJO, setIsDirectPJO] = useState(false)
  const [pjoNama, setPjoNama] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [crList, setCrList] = useState<any[]>([])
  const [loadingCR, setLoadingCR] = useState(false)
  const riwayat = data?.riwayat || []

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/leave/atasan-list', { signal: controller.signal })
      .then(r => r.json())
      .then((d: any) => {
        setAtasanList(d.atasan_list || [])
        setIsDirectPJO(!!d.is_direct_pjo)
        setPjoNama(d.pjo_nama || '')
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.log('Load atasan gagal:', err)
      })
    return () => controller.abort()
  }, [])

  // Fetch daftar CR milik user saat jenis cuti = KOMPENSASI
  useEffect(() => {
    if (form.jenis_cuti !== 'CUTI KOMPENSASI') return
    setLoadingCR(true)
    fetch('/api/leave/cr-list')
      .then(r => r.json())
      .then((d: any) => setCrList(d.cr_dates || []))
      .catch(err => console.log('Load CR gagal:', err))
      .finally(() => setLoadingCR(false))
  }, [form.jenis_cuti])

  const isCutiTahunan    = form.jenis_cuti === 'CUTI TAHUNAN'
  const isCutiKompensasi = form.jenis_cuti === 'CUTI KOMPENSASI'
  const jumlahHariNum    = Number(form.jumlah_hari || 0)

  // Hitung hari kalender dari rentang tanggal
  const hariKalender = (() => {
    if (isCutiKompensasi) {
      // Hitung total gabungan 2 blok
      if (!form.kompensasi_mulai || !form.kompensasi_selesai || !form.reguler_mulai || !form.reguler_selesai) return 0
      const allD = [
        new Date(`${form.kompensasi_mulai}T00:00:00`),
        new Date(`${form.kompensasi_selesai}T00:00:00`),
        new Date(`${form.reguler_mulai}T00:00:00`),
        new Date(`${form.reguler_selesai}T00:00:00`)
      ]
      if (allD.some(d => isNaN(d.getTime()))) return 0
      const min = Math.min(...allD.map(d => d.getTime()))
      const max = Math.max(...allD.map(d => d.getTime()))
      return Math.floor((max - min) / 86400000) + 1
    }
    if (!form.tanggal_mulai || !form.tanggal_selesai) return 0
    const s = new Date(`${form.tanggal_mulai}T00:00:00`)
    const e = new Date(`${form.tanggal_selesai}T00:00:00`)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0
    if (e < s) return 0
    return Math.floor((e.getTime() - s.getTime()) / 86400000) + 1
  })()

  // Validasi realtime cuti tahunan
  let warningCutiTahunan = ''
  if (isCutiTahunan) {
    if (jumlahHariNum <= 0) {
      warningCutiTahunan = ' Jumlah hari cuti tahunan wajib > 0'
    } else if (hariKalender > 0 && jumlahHariNum > hariKalender) {
      warningCutiTahunan = ` Jumlah hari (${jumlahHariNum}) melebihi rentang tanggal (${hariKalender} hari)`
    } else if (jumlahHariNum > sisaCutiTahunan) {
      warningCutiTahunan = ` Sisa cuti tahunan Anda hanya ${sisaCutiTahunan} hari`
    }
  }

  // Validasi realtime cuti kompensasi
let warningKompensasi = ''
if (isCutiKompensasi) {
  const kS = form.kompensasi_mulai ? new Date(`${form.kompensasi_mulai}T00:00:00`) : null
  const kE = form.kompensasi_selesai ? new Date(`${form.kompensasi_selesai}T00:00:00`) : null
  const rS = form.reguler_mulai ? new Date(`${form.reguler_mulai}T00:00:00`) : null
  const rE = form.reguler_selesai ? new Date(`${form.reguler_selesai}T00:00:00`) : null

  if (!kS || !kE || !rS || !rE) {
    warningKompensasi = ' Semua tanggal blok kompensasi dan reguler wajib diisi'
  } else if (kE < kS) {
    warningKompensasi = ' Tanggal selesai kompensasi harus >= mulai kompensasi'
  } else if (rE < rS) {
    warningKompensasi = ' Tanggal selesai reguler harus >= mulai reguler'
  } else {
    // Cek berurutan tanpa jeda
    const blok1End   = kS <= rS ? kE : rE
    const blok2Start = kS <= rS ? rS : kS
    const selisih    = Math.floor((blok2Start.getTime() - blok1End.getTime()) / 86400000)
    if (selisih !== 1) {
      warningKompensasi = ` Dua blok harus berurutan tanpa jeda (selisih antar blok: ${selisih} hari, harus tepat 1 hari)`
    }
  }
}

  // Validasi tiket
  let warningTiket = ''
  if (form.butuh_tiket) {
    if (
      !form.tiket_berangkat_tanggal ||
      !form.tiket_berangkat_tujuan ||
      !form.tiket_kembali_tanggal ||
      !form.tiket_kembali_tujuan
    ) {
      warningTiket = ' Semua field tiket wajib diisi'
    } else if (
      new Date(form.tiket_kembali_tanggal) < new Date(form.tiket_berangkat_tanggal)
    ) {
      warningTiket = ' Tanggal kembali tidak boleh lebih awal dari tanggal berangkat'
    }
  }

  async function handleSubmit(e: any) {
    e.preventDefault()

    // Client-side guard
    if (!form.jenis_cuti) {
      setMsg({ type: 'err', text: 'Jenis cuti wajib dipilih' })
      return
    }

    if (!isDirectPJO && !form.atasan_nrp) {
      setMsg({ type: 'err', text: 'Atasan wajib dipilih' })
      return
    }

    if (isCutiTahunan) {
      if (warningCutiTahunan) {
        setMsg({ type: 'err', text: warningCutiTahunan.replace(' ', '') })
        return
      }
    }

    if (isCutiKompensasi && warningKompensasi) {
  setMsg({ type: 'err', text: warningKompensasi.replace(' ', '') })
  return
}

    if (form.butuh_tiket && warningTiket) {
      setMsg({ type: 'err', text: warningTiket.replace(' ', '') })
      return
    }

    setLoading(true)
    try {
const payload: any = {
  jenis_cuti: form.jenis_cuti,
  alasan: form.alasan,
  atasan_nrp: isDirectPJO ? '' : form.atasan_nrp,
  butuh_tiket: !!form.butuh_tiket
}

if (isCutiKompensasi) {
  payload.kompensasi_mulai   = form.kompensasi_mulai
  payload.kompensasi_selesai = form.kompensasi_selesai
  payload.reguler_mulai      = form.reguler_mulai
  payload.reguler_selesai    = form.reguler_selesai
  payload.roster_cr_tanggal  = form.roster_cr_tanggal || null
} else {
  payload.tanggal_mulai  = form.tanggal_mulai
  payload.tanggal_selesai = form.tanggal_selesai
}

      if (isCutiTahunan) {
        payload.jumlah_hari = jumlahHariNum
      }

      if (form.butuh_tiket) {
        payload.tiket_berangkat_tanggal = form.tiket_berangkat_tanggal
        payload.tiket_berangkat_tujuan = form.tiket_berangkat_tujuan
        payload.tiket_kembali_tanggal = form.tiket_kembali_tanggal
        payload.tiket_kembali_tujuan = form.tiket_kembali_tujuan
      }

      const res = await fetch('/api/leave/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const resData = await res.json()
      if (res.ok) {
        setMsg({ type: 'ok', text: resData.message || ' Pengajuan cuti berhasil dikirim' })
setForm({
  tanggal_mulai: '',
  tanggal_selesai: '',
  jenis_cuti: '',
  alasan: '',
  atasan_nrp: '',
  jumlah_hari: '',
  butuh_tiket: false,
  tiket_berangkat_tanggal: '',
  tiket_berangkat_tujuan: '',
  tiket_kembali_tanggal: '',
  tiket_kembali_tujuan: '',
  kompensasi_mulai: '',
  kompensasi_selesai: '',
  reguler_mulai: '',
  reguler_selesai: '',
  roster_cr_tanggal: ''
})
        if (typeof onSuccess === 'function') onSuccess();
      } else {
        setMsg({ type: 'err', text: resData.error || 'Gagal mengirim pengajuan' })
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-3 lg:space-y-6">
      {mode === 'form' ? (
        /* MODE FORM PENGAJUAN CUTI */
        <div className="bg-white p-3 lg:p-6 rounded-2xl lg:rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3 lg:mb-5 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black tracking-tight text-[#003D79]">✍️ Form Pengajuan Cuti</h2>
              <p className="text-xs text-slate-500">Sisa Cuti Tahunan: <strong className="text-amber-600">{sisaCutiTahunan} Hari</strong> ({tahunCuti})</p>
            </div>
            <a
              href="/dashboard?menu=cuti_saya"
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#003D79] font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <span>📜 Riwayat Cuti</span>
            </a>
          </div>

        <form onSubmit={handleSubmit} className="space-y-2.5 lg:space-y-4">
          {msg.text && (
            <div className={`p-4 rounded-2xl text-sm font-bold ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msg.text}
            </div>
          )}

          {!isCutiKompensasi && (
  <div className="grid grid-cols-2 gap-2 lg:gap-3">
    <Input label="Mulai Cuti" type="date" required value={form.tanggal_mulai} onChange={(v: any) => setForm({ ...form, tanggal_mulai: v })} />
    <Input label="Selesai Cuti" type="date" required value={form.tanggal_selesai} onChange={(v: any) => setForm({ ...form, tanggal_selesai: v })} />
  </div>
)}

          {hariKalender > 0 && (
  <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 border border-slate-100 rounded-xl p-3">
    📅 Total rentang cuti: <span className="text-slate-800">{hariKalender} hari kalender</span>
  </div>
)}

          <Select
  label="Jenis Cuti"
  required
  value={form.jenis_cuti}
  onChange={(v: any) => setForm({
    ...form,
    jenis_cuti: v,
    jumlah_hari: '',
    // Reset field tanggal saat ganti jenis
    tanggal_mulai: '',
    tanggal_selesai: '',
    kompensasi_mulai: '',
    kompensasi_selesai: '',
    reguler_mulai: '',
    reguler_selesai: ''
  })}
  options={['CUTI REGULER / ROSTER', 'CUTI TAHUNAN', 'CUTI KOMPENSASI']}
/>

          {/* Blok Khusus Cuti Tahunan */}
          {isCutiTahunan && (
            <div className="bg-amber-50 border-2 border-amber-100 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">🏖️ Cuti Tahunan {tahunCuti}</p>
                <span className="bg-white border border-amber-200 text-amber-700 text-[10px] font-black px-3 py-1 rounded-full">
                  Sisa: {sisaCutiTahunan} hari
                </span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Jumlah Hari Diambil <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={sisaCutiTahunan || undefined}
                  value={form.jumlah_hari}
                  onChange={e => setForm({ ...form, jumlah_hari: e.target.value })}
                  placeholder="Contoh: 3"
                  className="w-full p-3.5 border-2 border-amber-200 rounded-2xl bg-white text-sm font-bold focus:border-amber-500 outline-none transition-all"
                  required
                />
                <p className="text-[10px] text-slate-500 font-bold mt-2">
                  Maksimal <b>{sisaCutiTahunan}</b> hari, dan tidak boleh melebihi rentang tanggal ({hariKalender} hari)
                </p>
              </div>

              {warningCutiTahunan && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold p-3 rounded-xl">
                  {warningCutiTahunan}
                </div>
              )}
            </div>
          )}

{/* Blok Khusus Cuti Kompensasi */}
{isCutiKompensasi && (
  <div className="bg-emerald-50 border-2 border-emerald-100 p-5 rounded-2xl space-y-4">
    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
      🔄 Cuti Kompensasi — Wajib 2 Blok Berurutan Tanpa Jeda
    </p>
    <p className="text-[10px] text-slate-500 font-bold">
      Isi blok kompensasi dan blok reguler. Keduanya harus saling menyambung (tidak boleh ada hari kosong di antara keduanya).
    </p>

    {/* Pilih tanggal CR dari roster */}
    <div className="bg-white border border-emerald-200 rounded-2xl p-4 space-y-2">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
        📅 Pilih Tanggal CR yang Diklaim
      </p>
      {loadingCR ? (
        <p className="text-[10px] text-slate-400 font-bold animate-pulse">Memuat daftar CR...</p>
      ) : crList.length === 0 ? (
        <p className="text-[10px] text-rose-500 font-bold">
           Tidak ada roster CR ditemukan untuk akun Anda
        </p>
      ) : (
        <select
          value={form.roster_cr_tanggal}
          onChange={e => setForm({ ...form, roster_cr_tanggal: e.target.value })}
          className="w-full p-3 border-2 border-emerald-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-emerald-500 outline-none"
        >
          <option value="">-- Pilih Tanggal CR --</option>
          {crList.map((cr: any) => (
            <option
              key={cr.tanggal}
              value={cr.tanggal}
              disabled={cr.sudah_diklaim}
            >
              {new Date(`${cr.tanggal}T00:00:00`).toLocaleDateString('id-ID', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
              {cr.sudah_diklaim ? ' —  Sudah Diklaim' : ''}
            </option>
          ))}
        </select>
      )}
    </div>

    {/* Blok Kompensasi */}
    <div className="bg-white border border-emerald-100 rounded-2xl p-4 space-y-3">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">🟢 Blok Kompensasi</p>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Mulai Kompensasi"
          type="date"
          required
          value={form.kompensasi_mulai}
          onChange={(v: any) => setForm({ ...form, kompensasi_mulai: v })}
        />
        <Input
          label="Selesai Kompensasi"
          type="date"
          required
          value={form.kompensasi_selesai}
          onChange={(v: any) => setForm({ ...form, kompensasi_selesai: v })}
        />
      </div>
    </div>

    {/* Blok Reguler */}
    <div className="bg-white border border-emerald-100 rounded-2xl p-4 space-y-3">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">🔵 Blok Reguler / Roster</p>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Mulai Reguler"
          type="date"
          required
          value={form.reguler_mulai}
          onChange={(v: any) => setForm({ ...form, reguler_mulai: v })}
        />
        <Input
          label="Selesai Reguler"
          type="date"
          required
          value={form.reguler_selesai}
          onChange={(v: any) => setForm({ ...form, reguler_selesai: v })}
        />
      </div>
    </div>

    {/* Info urutan otomatis */}
    {form.kompensasi_mulai && form.reguler_mulai && (
      <div className="bg-white border border-emerald-100 rounded-xl p-3 text-[10px] font-bold text-emerald-700">
        {new Date(`${form.kompensasi_mulai}T00:00:00`) <= new Date(`${form.reguler_mulai}T00:00:00`)
          ? '📋 Urutan: Kompensasi dulu → lalu Reguler'
          : '📋 Urutan: Reguler dulu → lalu Kompensasi'}
      </div>
    )}

    {/* Warning kompensasi */}
    {warningKompensasi && (
      <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold p-3 rounded-xl">
        {warningKompensasi}
      </div>
    )}
  </div>
)}

          {/* Pilih Atasan (kalau bukan direct-to-PJO) */}
          {!isDirectPJO ? (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Pilih Atasan (Approval 1)
              </label>
              <select
                required
                value={form.atasan_nrp}
                onChange={e => setForm({ ...form, atasan_nrp: e.target.value })}
                className="w-full p-3.5 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:border-blue-500 outline-none"
              >
                <option value="">-- Pilih Nama Atasan --</option>
                {atasanList.map((a: any) => (
                  <option key={a.nrp} value={a.nrp}>
                    {a.nama} ({a.jabatan})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl">
              <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1">Approval langsung ke PJO</p>
              <p className="text-sm font-bold text-slate-800">{pjoNama || '-'}</p>
            </div>
          )}

          <Textarea label="Alasan Cuti" required value={form.alasan} onChange={(v: any) => setForm({ ...form, alasan: v })} placeholder="Jelaskan alasan cuti..." />

          {/* Checkbox Tiket Pesawat (kalau eligible) */}
          {eligibleTiket && (
            <div className="border-2 border-indigo-100 rounded-2xl p-5 bg-indigo-50/40 space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.butuh_tiket}
                  onChange={e => setForm({ ...form, butuh_tiket: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="text-sm font-black text-indigo-700 uppercase tracking-widest">✈️ Ajukan Tiket Pesawat</span>
              </label>

              {form.butuh_tiket && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                    Pemesanan tiket dilakukan terpisah per trip (berangkat & kembali)
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
                    <div className="bg-white border border-indigo-100 rounded-2xl p-4 space-y-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">🛫 Trip Berangkat</p>
                      <Input
                        label="Tanggal Berangkat"
                        type="date"
                        required
                        value={form.tiket_berangkat_tanggal}
                        onChange={(v: any) => setForm({ ...form, tiket_berangkat_tanggal: v })}
                      />
                      <Input
                        label="Tujuan Berangkat"
                        placeholder="Contoh: Makassar → Jakarta"
                        required
                        value={form.tiket_berangkat_tujuan}
                        onChange={(v: any) => setForm({ ...form, tiket_berangkat_tujuan: v })}
                      />
                    </div>

                    <div className="bg-white border border-indigo-100 rounded-2xl p-4 space-y-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">🛬 Trip Kembali</p>
                      <Input
                        label="Tanggal Kembali"
                        type="date"
                        required
                        value={form.tiket_kembali_tanggal}
                        onChange={(v: any) => setForm({ ...form, tiket_kembali_tanggal: v })}
                      />
                      <Input
                        label="Tujuan Kembali"
                        placeholder="Contoh: Jakarta → Makassar"
                        required
                        value={form.tiket_kembali_tujuan}
                        onChange={(v: any) => setForm({ ...form, tiket_kembali_tujuan: v })}
                      />
                    </div>
                  </div>

                  {warningTiket && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold p-3 rounded-xl">
                      {warningTiket}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button disabled={loading} className="w-full bg-blue-600 text-white py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all">
            {loading ? 'MENGIRIM...' : '🚀 KIRIM PENGAJUAN'}
          </button>
        </form>
      </div>
      ) : (
        /* MODE HISTORY ONLY */
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-base lg:text-lg font-black text-[#003D79]">📜 Riwayat Cuti Saya</h2>
            <p className="text-xs text-slate-500 font-medium">Sisa Cuti Tahunan Anda: <strong className="text-amber-600">{sisaCutiTahunan} Hari</strong> ({tahunCuti})</p>
          </div>
          <a
            href="/dashboard?menu=form_cuti"
            className="px-3.5 py-2 rounded-xl bg-[#003D79] hover:bg-blue-900 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>➕ Ajukan Cuti</span>
          </a>
        </div>
      )}
        <div className="bg-white rounded-2xl lg:rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-3 lg:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center gap-2">
          <h3 className="font-black text-slate-800 text-xs lg:text-sm">📜 Riwayat Cuti Periode <span className="text-blue-600">{data?.periode || 'Bulan Ini'}</span></h3>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full font-black">{riwayat.length} DATA</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Tanggal</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Jenis</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Hari</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Tiket</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Alasan</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3 text-center">Status Atasan</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3 text-center">Status PJO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {riwayat.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 lg:py-16 text-center text-slate-300 font-bold italic">Belum ada pengajuan bulan ini.</td></tr>
              ) : riwayat.map((r: any, i: number) => (
                <tr key={i}>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 text-xs font-bold">{new Date(r.tanggal_mulai).toLocaleDateString('id-ID')} - {new Date(r.tanggal_selesai).toLocaleDateString('id-ID')}</td>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[9px] font-bold">{r.jenis_cuti}</span></td>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 text-xs font-black text-slate-700">{r.jumlah_hari || '-'}</td>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3">
                    {r.butuh_tiket
                      ? <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[9px] font-black">✈️ YA</span>
                      : <span className="text-slate-300 text-[9px] font-bold italic">tidak</span>}
                  </td>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 italic text-slate-500 text-xs truncate max-w-[200px]">"{r.alasan}"</td>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 text-center"><StatusBadge value={r.status_atasan} /></td>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 text-center"><StatusBadge value={r.status_pjo || 'PENDING'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
