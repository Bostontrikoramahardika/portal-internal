'use client'

import { useEffect, useMemo, useState } from 'react'

function hdr() {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  try {
    const t = localStorage.getItem('btm_session_token_v1')
    if (t) h['Authorization'] = 'Bearer ' + t
  } catch {}
  return h
}
const bulanIni = () => new Date().toISOString().slice(0, 7)

const WARNA_TAHAP: Record<string, string> = {
  FINAL: 'bg-emerald-100 text-emerald-700',
  MENUNGGU_PJO: 'bg-amber-100 text-amber-700',
  MENUNGGU_ATASAN: 'bg-sky-100 text-sky-700',
  DITOLAK: 'bg-rose-100 text-rose-700',
}
const LABEL_TAHAP: Record<string, string> = {
  FINAL: 'Disetujui',
  MENUNGGU_PJO: 'Menunggu PJO',
  MENUNGGU_ATASAN: 'Menunggu Atasan',
  DITOLAK: 'Ditolak',
}

export default function LemburPanel() {
  const [bulan, setBulan] = useState(bulanIni())
  const [rows, setRows] = useState<any[]>([])
  const [ringkas, setRingkas] = useState<any>(null)
  const [muat, setMuat] = useState(false)
  const [fSite, setFSite] = useState('ALL')
  const [fTahap, setFTahap] = useState('ALL')
  const [fNama, setFNama] = useState('')
  const [bolehEdit, setBolehEdit] = useState(false)
  const [edit, setEdit] = useState<any>(null)
  const [simpan, setSimpan] = useState(false)

  async function muatData() {
    setMuat(true)
    try {
      const d = await fetch('/api/overtime/kelola?bulan=' + bulan, {
        credentials: 'include', headers: hdr(),
      }).then((r) => r.json())
      setRows(d?.rows || [])
      setRingkas(d?.ringkasan || null)
      setBolehEdit(Boolean(d?.boleh_edit))
    } catch {}
    setMuat(false)
  }

  useEffect(() => { muatData() }, [bulan])

  async function simpanEdit() {
    if (!edit) return
    setSimpan(true)
    try {
      const res = await fetch('/api/overtime/kelola', {
        method: 'PATCH', credentials: 'include', headers: hdr(),
        body: JSON.stringify({
          id: edit.id, jam_mulai: edit.jam_mulai, jam_selesai: edit.jam_selesai,
          total_jam: edit.total_jam, alasan: edit.alasan,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Gagal')
      setEdit(null)
      muatData()
    } catch (e: any) { alert(e?.message || 'Gagal menyimpan') }
    setSimpan(false)
  }

  const siteList = useMemo(
    () => Array.from(new Set(rows.map((r) => r.site).filter(Boolean))).sort(), [rows])

  const tampil = useMemo(() => rows.filter((r) => {
    if (fSite !== 'ALL' && r.site !== fSite) return false
    if (fTahap !== 'ALL' && r.tahap !== fTahap) return false
    if (fNama && !String(r.nama || '').toLowerCase().includes(fNama.toLowerCase())) return false
    return true
  }), [rows, fSite, fTahap, fNama])

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Bulan</label>
          <input type="month" value={bulan} onChange={(e) => setBulan(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold" />
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Site</label>
          <select value={fSite} onChange={(e) => setFSite(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold">
            <option value="ALL">Semua Site</option>
            {siteList.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Status</label>
          <select value={fTahap} onChange={(e) => setFTahap(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold">
            <option value="ALL">Semua</option>
            <option value="FINAL">Disetujui</option>
            <option value="MENUNGGU_PJO">Menunggu PJO</option>
            <option value="MENUNGGU_ATASAN">Menunggu Atasan</option>
            <option value="DITOLAK">Ditolak</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Nama</label>
          <input value={fNama} onChange={(e) => setFNama(e.target.value)} placeholder="Cari nama..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
        </div>
      </div>

      {ringkas && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[['Disetujui', ringkas.final], ['Menunggu PJO', ringkas.menunggu_pjo],
            ['Menunggu Atasan', ringkas.menunggu_atasan], ['Ditolak', ringkas.ditolak]].map(([l, v]) => (
            <div key={String(l)} className="bg-white rounded-xl border border-slate-200 p-2.5 text-center">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{String(l)}</div>
              <div className="text-lg font-black text-[#0b2a5b]">{Number(v || 0)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold text-slate-500">
          {tampil.length} dari {rows.length} pengajuan
        </span>
        <button onClick={muatData} disabled={muat}
          className="px-2.5 py-1 rounded-lg bg-slate-100 text-[10px] font-black uppercase disabled:opacity-50">
          {muat ? 'Memuat...' : 'Muat Ulang'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="std-scroll-x overflow-x-auto pb-1">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-[#003D79] text-white">
              <tr>
                <th className="px-2 py-2 sticky left-0 z-30 bg-[#003D79] min-w-[150px]">Karyawan</th>
                <th className="px-2 py-2 min-w-[80px]">Tanggal</th>
                <th className="px-2 py-2 min-w-[96px]">Jam</th>
                <th className="px-2 py-2 text-center min-w-[52px]">Total</th>
                <th className="px-2 py-2 min-w-[200px]">Alasan</th>
                <th className="px-2 py-2 min-w-[150px]">Disetujui Oleh</th>
                <th className="px-2 py-2 min-w-[110px]">Status</th>
                {bolehEdit && <th className="px-2 py-2 text-center min-w-[52px]">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {tampil.length === 0 && (
                <tr><td colSpan={bolehEdit ? 8 : 7} className="px-4 py-8 text-center text-slate-300 font-black uppercase tracking-widest text-[11px] italic">
                  Tidak ada data
                </td></tr>
              )}
              {tampil.map((r, i) => {
                const bg = i % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                return (
                  <tr key={r.id} className={bg}>
                    <td className={'px-2 py-1.5 sticky left-0 z-10 font-bold ' + bg}>
                      <div className="truncate">{r.nama}</div>
                      <div className="text-[9px] font-medium text-slate-400 truncate">
                        {r.jabatan} / {r.site}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{r.tanggal}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap tabular-nums">
                      {String(r.jam_mulai || '').slice(0, 5)} - {String(r.jam_selesai || '').slice(0, 5)}
                    </td>
                    <td className="px-2 py-1.5 text-center font-bold">{r.total_jam ?? '-'}</td>
                    <td className="px-2 py-1.5">{r.alasan}</td>
                    <td className="px-2 py-1.5">
                      {r.disetujui_oleh
                        ? <span className="text-slate-700">{r.disetujui_oleh}</span>
                        : <span className="text-slate-300">belum ada</span>}
                      {r.atasan_nama && r.pjo_nama && (
                        <div className="text-[9px] text-slate-400">Atasan: {r.atasan_nama}</div>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={'px-2 py-0.5 rounded-full text-[9px] font-black uppercase whitespace-nowrap ' +
                        (WARNA_TAHAP[r.tahap] || 'bg-slate-100 text-slate-500')}>
                        {LABEL_TAHAP[r.tahap] || r.tahap}
                      </span>
                    </td>
                    {bolehEdit && (
                      <td className="px-2 py-1.5 text-center">
                        <button type="button" onClick={() => setEdit({ ...r })}
                          className="px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-[9px] font-black uppercase hover:bg-amber-200">
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4"
          onClick={() => setEdit(null)}>
          <div className="absolute inset-0 bg-slate-900/60" />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 bg-[#0b2a5b] text-white">
              <div className="text-[9px] font-black uppercase tracking-widest text-blue-200">Ubah Lembur</div>
              <div className="text-sm font-black truncate">{edit.nama}</div>
              <div className="text-[10px] text-blue-200">{edit.tanggal}</div>
            </div>
            <div className="p-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Jam Mulai</label>
                  <input type="time" value={String(edit.jam_mulai || '').slice(0, 5)}
                    onChange={(e) => setEdit({ ...edit, jam_mulai: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Jam Selesai</label>
                  <input type="time" value={String(edit.jam_selesai || '').slice(0, 5)}
                    onChange={(e) => setEdit({ ...edit, jam_selesai: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Total Jam</label>
                <input type="number" step="0.01" min={0} value={edit.total_jam ?? 0}
                  onChange={(e) => setEdit({ ...edit, total_jam: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Alasan</label>
                <textarea rows={3} value={edit.alasan || ''}
                  onChange={(e) => setEdit({ ...edit, alasan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
              </div>
              <p className="text-[10px] text-slate-400">
                Status persetujuan tidak berubah dari sini.
              </p>
              <div className="flex gap-2 pt-1">
                <button onClick={simpanEdit} disabled={simpan}
                  className="flex-1 py-2.5 rounded-xl bg-[#0b2a5b] text-white font-black text-[11px] uppercase disabled:opacity-50">
                  {simpan ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button onClick={() => setEdit(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase">
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}