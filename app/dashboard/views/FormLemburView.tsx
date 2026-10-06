'use client'

// FormLemburView - dipisah dari app/dashboard/page.tsx (tahap 2)
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

export default function FormLemburView({ title, onSuccess, data }: any) {
  const [form, setForm] = useState({ tanggal: '', jam_mulai: '', jam_selesai: '', jenis_lembur: 'BIASA', alasan: '', atasan_nrp: '' })
  const [atasanList, setAtasanList] = useState<any[]>([])
  const [pjoInfo, setPjoInfo] = useState<{ nrp: string | null; nama: string | null }>({ nrp: null, nama: null })
  const [deputyInfo, setDeputyInfo] = useState<{ nrp: string | null; nama: string | null }>({ nrp: null, nama: null })
  const [isDirectPjo, setIsDirectPjo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const riwayat = data?.riwayat || []

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/overtime/atasan-list', { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        setAtasanList(d.atasan_list || [])
        setPjoInfo({ nrp: d.pjo_nrp || null, nama: d.pjo_nama || null })
        setDeputyInfo({ nrp: d.deputy_pjo_nrp || null, nama: d.deputy_pjo_nama || null })
        setIsDirectPjo(!!d.is_direct_pjo)

        // Auto-pilih PJO kalau user direct-to-PJO & belum pilih apa2
        if (d.is_direct_pjo && d.pjo_nrp) {
          setForm(f => f.atasan_nrp ? f : { ...f, atasan_nrp: d.pjo_nrp })
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.log('Load atasan gagal:', err)
      })
    return () => controller.abort()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/overtime/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const dataRes = await res.json()
    if (res.ok) {
      setMsg({ type: 'ok', text: ' Pengajuan lembur berhasil dikirim' })
      setForm({ tanggal: '', jam_mulai: '', jam_selesai: '', jenis_lembur: 'BIASA', alasan: '', atasan_nrp: '' });
      if (typeof onSuccess === 'function') onSuccess();
    } else {
      setMsg({ type: 'err', text: dataRes.error })
    }
    setLoading(false)
  }

  // Build gabungan opsi dropdown
  // Prioritas: Atasan biasa → PJO → Deputy PJO
  const dropdownOptions: Array<{ nrp: string; label: string; kategori: string }> = []

  atasanList.forEach((a: any) => {
    dropdownOptions.push({
      nrp: a.nrp,
      label: `${a.nama} (${a.jabatan})`,
      kategori: 'ATASAN'
    })
  })

  if (pjoInfo.nrp && pjoInfo.nama) {
    dropdownOptions.push({
      nrp: pjoInfo.nrp,
      label: pjoInfo.nama,
      kategori: 'PJO'
    })
  }

  if (deputyInfo.nrp && deputyInfo.nama) {
    dropdownOptions.push({
      nrp: deputyInfo.nrp,
      label: deputyInfo.nama,
      kategori: 'DEPUTY'
    })
  }

  return (
    <div className="max-w-4xl lg:max-w-none mx-auto space-y-3 lg:space-y-6">
      <div className="bg-white p-3 lg:p-6 rounded-2xl lg:rounded-[2.5rem] border border-slate-100 shadow-sm">
        <h2 className="text-base font-black mb-3 lg:mb-5 tracking-tight"> {title}</h2>
        <form onSubmit={handleSubmit} className="space-y-2.5 lg:space-y-4">
          {msg.text && <div className={`p-4 rounded-2xl text-sm font-bold ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}
          <Input label="Tanggal Lembur" type="date" required value={form.tanggal} onChange={(v:any) => setForm({...form, tanggal: v})} />
          <div className="grid grid-cols-2 gap-2 lg:gap-3">
            <Input label="Jam Mulai" type="time" required value={form.jam_mulai} onChange={(v:any) => setForm({...form, jam_mulai: v})} />
            <Input label="Jam Selesai" type="time" required value={form.jam_selesai} onChange={(v:any) => setForm({...form, jam_selesai: v})} />
          </div>

          {/* DROPDOWN ATASAN (dengan grouping) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Atasan (Pemberi Tugas)
              {isDirectPjo && (
                <span className="ml-2 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                   Langsung ke PJO
                </span>
              )}
            </label>
            <select
              required
              value={form.atasan_nrp}
              onChange={e => setForm({...form, atasan_nrp: e.target.value})}
              className="w-full p-3.5 border-2 border-slate-100 rounded-2xl bg-slate-50 focus:border-blue-500 outline-none"
            >
              <option value="">-- Pilih Atasan --</option>

              {/* Group: ATASAN LANGSUNG */}
              {atasanList.length > 0 && (
                <optgroup label=" Atasan Langsung">
                  {atasanList.map((a: any) => (
                    <option key={`atasan-${a.nrp}`} value={a.nrp}>
                      {a.nama} ({a.jabatan})
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Group: PJO */}
              {pjoInfo.nrp && pjoInfo.nama && (
                <optgroup label=" PJO Site">
                  <option value={pjoInfo.nrp}>{pjoInfo.nama}</option>
                </optgroup>
              )}

              {/* Group: DEPUTY */}
              {deputyInfo.nrp && deputyInfo.nama && (
                <optgroup label="🥈 Deputy PJO">
                  <option value={deputyInfo.nrp}>{deputyInfo.nama}</option>
                </optgroup>
              )}
            </select>

            {/* Info kalau tidak ada opsi sama sekali */}
            {dropdownOptions.length === 0 && (
              <p className="mt-2 text-[10px] text-rose-500 font-bold italic">
                 Belum ada atasan/PJO yang bisa dipilih. Hubungi HR.
              </p>
            )}
          </div>

          <Textarea label="Pekerjaan / Alasan Lembur" required value={form.alasan} onChange={(v:any) => setForm({...form, alasan: v})} />
          <button disabled={loading} className="w-full bg-amber-500 text-white py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black hover:bg-amber-600 shadow-lg shadow-amber-200 active:scale-95 transition-all">
            {loading ? 'MENGIRIM...' : '🚀 KIRIM LEMBUR'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl lg:rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-3 lg:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center gap-2">
          <h3 className="font-black text-slate-800 text-xs lg:text-sm">📜 Riwayat Lembur Periode <span className="text-amber-600">{data?.periode || 'Bulan Ini'}</span></h3>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full font-black">{riwayat.length} DATA</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Tanggal</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Jam</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3">Alasan</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3 text-center">Status Atasan</th>
                <th className="px-3 py-2.5 lg:px-5 lg:py-3 text-center">Status PJO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {riwayat.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 lg:py-16 text-center text-slate-300 font-bold italic">Belum ada lembur bulan ini.</td></tr>
              ) : riwayat.map((r: any, i: number) => (
                <tr key={i}>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 text-xs font-bold">{new Date(r.tanggal).toLocaleDateString('id-ID')}</td>
                  <td className="px-3 py-2.5 lg:px-5 lg:py-3 font-mono text-xs">{r.jam_mulai} - {r.jam_selesai}</td>
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
