'use client'

// ═══════════════════════════════════════════════════════════
// RINCIAN LEMBUR KARYAWAN — dipakai di modal Aksi (👁️) Manajemen Absensi
//   • menampilkan semua lembur pada bulan itu
//   • status persetujuan: sudah disetujui siapa / masih menunggu siapa
//   • jenis lembur (lembur apa)
//   • bisa diubah & disetujui langsung oleh HR
// ═══════════════════════════════════════════════════════════

import { useState } from 'react'

const badge = (st: string) => {
  const s = String(st || '').toUpperCase()
  if (s.includes('ATASAN')) return { cls: 'bg-amber-100 text-amber-800', label: 'Menunggu Atasan' }
  if (s.includes('PJO')) return { cls: 'bg-sky-100 text-sky-800', label: 'Menunggu PJO' }
  if (s.includes('DISETUJUI') || s.includes('APPROVED')) return { cls: 'bg-emerald-100 text-emerald-800', label: 'Disetujui' }
  if (s.includes('TOLAK')) return { cls: 'bg-rose-100 text-rose-800', label: 'Ditolak' }
  return { cls: 'bg-slate-100 text-slate-700', label: st || 'Menunggu' }
}

const jenisTeks = (j: any) => {
  const s = String(j || 'BIASA').toUpperCase()
  if (s.includes('HARI_LIBUR') || s.includes('LIBUR')) return 'Hari Libur'
  if (s.includes('MALAM')) return 'Malam'
  if (s.includes('JAGA') || s.includes('STANDBY')) return 'Standby'
  return 'Hari Kerja'
}

const tglRapi = (t: any) => {
  if (!t) return '-'
  const d = new Date(String(t) + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return String(t)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

export default function LemburKaryawan({ row, canEdit, onUbah }: any) {
  const disetujui: any[] = row?.lembur || []
  const menunggu: any[] = row?.lembur_menunggu || []
  const semua = [
    ...disetujui.map((l: any) => ({ ...l, __ok: true })),
    ...menunggu.map((l: any) => ({ ...l, __ok: false })),
  ].sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)))

  const totalJam = semua.filter((l) => l.__ok).reduce((a, l) => a + Number(l.jam || 0), 0)
  const totalMenunggu = semua.filter((l) => !l.__ok).reduce((a, l) => a + Number(l.jam || 0), 0)

  const [editId, setEditId] = useState<string>('')
  const [form, setForm] = useState<any>({})
  const [simpan, setSimpan] = useState(false)
  const [pesan, setPesan] = useState('')

  function mulaiEdit(l: any) {
    setEditId(String(l.id))
    setPesan('')
    setForm({
      jam_mulai: String(l.jam_mulai || '').slice(0, 5),
      jam_selesai: String(l.jam_selesai || '').slice(0, 5),
      alasan: l.alasan && l.alasan !== '-' ? l.alasan : '',
      jenis_lembur: l.jenis_lembur || 'BIASA',
    })
  }

  async function kirim(id: string, isi: any) {
    setSimpan(true)
    setPesan('')
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const res = await fetch('/api/overtime/kelola', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id, ...isi }),
      })
      const j = await res.json()
      if (!j.ok) { setPesan('❌ ' + (j.error || 'Gagal menyimpan')); return }
      setEditId('')
      setPesan('✅ Tersimpan')
      onUbah?.()
    } catch {
      setPesan('❌ Koneksi gagal')
    } finally {
      setSimpan(false)
    }
  }

  return (
    <div className="px-4 pb-4 bg-slate-50">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-3 py-2 bg-amber-500 text-white flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest">Lembur Bulan Ini</span>
          <span className="text-[10px] font-black">
            {semua.filter((l) => l.__ok).length}x · {totalJam.toFixed(2)} jam
            {totalMenunggu > 0 && (
              <span className="ml-1 bg-white/25 px-1.5 py-0.5 rounded">
                +{totalMenunggu.toFixed(2)} belum ACC
              </span>
            )}
          </span>
        </div>

        {pesan && (
          <div className="px-3 py-1.5 text-[10px] font-bold bg-slate-50 border-b border-slate-100">{pesan}</div>
        )}

        {semua.length === 0 ? (
          <p className="px-3 py-4 text-center text-[11px] text-slate-400 font-bold">
            Tidak ada lembur di bulan ini
          </p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-64 overflow-auto">
            {semua.map((l: any) => {
              const b = badge(l.__ok ? 'DISETUJUI' : l.status)
              const sedangEdit = editId === String(l.id)
              return (
                <div key={String(l.id) + String(l.tanggal)} className="px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-black text-[#003D79]">{tglRapi(l.tanggal)}</span>
                        <span className="text-[10px] text-slate-500 font-bold tabular-nums">
                          {String(l.jam_mulai || '').slice(0, 5) || '--:--'}–{String(l.jam_selesai || '').slice(0, 5) || '--:--'}
                        </span>
                        <span className="text-[10px] font-black text-amber-700">{Number(l.jam || 0).toFixed(2)} j</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-black uppercase">
                          {jenisTeks(l.jenis_lembur)}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${b.cls}`}>{b.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-600 mt-0.5 truncate">{l.alasan || '-'}</p>

                      {/* keterangan approver */}
                      <p className="text-[9px] mt-0.5 font-bold">
                        {l.__ok ? (
                          <span className="text-emerald-700">
                            ✔ Disetujui{l.disetujui_oleh ? ' oleh ' + l.disetujui_oleh : ''}
                          </span>
                        ) : (
                          <span className="text-amber-700">
                            ⏳ Belum di-approve
                            {String(l.status).includes('ATASAN')
                              ? ' atasan: ' + (l.atasan_nama || l.atasan_nrp || 'belum ditentukan')
                              : ' PJO: ' + (l.pjo_nama || l.pjo_nrp || 'belum ditentukan')}
                          </span>
                        )}
                      </p>
                    </div>

                    {canEdit && !sedangEdit && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => mulaiEdit(l)} title="Ubah lembur"
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px]">✏️</button>
                        {!l.__ok && (
                          <button onClick={() => kirim(String(l.id), { action: 'approve' })} disabled={simpan}
                            title="Setujui lembur ini"
                            className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-[11px]">✅</button>
                        )}
                        {l.__ok && (
                          <button onClick={() => kirim(String(l.id), { action: 'reset' })} disabled={simpan}
                            title="Batalkan persetujuan"
                            className="w-7 h-7 rounded-lg bg-rose-100 hover:bg-rose-200 text-[11px]">↩️</button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* form ubah */}
                  {sedangEdit && (
                    <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <label className="text-[9px] font-black uppercase text-slate-500">
                          Jam mulai
                          <input type="time" value={form.jam_mulai}
                            onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })}
                            className="w-full mt-0.5 border border-slate-200 rounded px-1.5 py-1 text-[11px] font-bold" />
                        </label>
                        <label className="text-[9px] font-black uppercase text-slate-500">
                          Jam selesai
                          <input type="time" value={form.jam_selesai}
                            onChange={(e) => setForm({ ...form, jam_selesai: e.target.value })}
                            className="w-full mt-0.5 border border-slate-200 rounded px-1.5 py-1 text-[11px] font-bold" />
                        </label>
                      </div>
                      <label className="text-[9px] font-black uppercase text-slate-500 block">
                        Jenis lembur
                        <select value={form.jenis_lembur}
                          onChange={(e) => setForm({ ...form, jenis_lembur: e.target.value })}
                          className="w-full mt-0.5 border border-slate-200 rounded px-1.5 py-1 text-[11px] font-bold">
                          <option value="BIASA">Hari Kerja (biasa)</option>
                          <option value="HARI_LIBUR">Hari Libur</option>
                          <option value="MALAM">Malam</option>
                          <option value="STANDBY">Standby</option>
                        </select>
                      </label>
                      <label className="text-[9px] font-black uppercase text-slate-500 block">
                        Keterangan / alasan
                        <input type="text" value={form.alasan}
                          onChange={(e) => setForm({ ...form, alasan: e.target.value })}
                          placeholder="mis. perbaikan unit DT 012"
                          className="w-full mt-0.5 border border-slate-200 rounded px-1.5 py-1 text-[11px]" />
                      </label>
                      <div className="flex gap-1.5 pt-0.5">
                        <button onClick={() => setEditId('')}
                          className="flex-1 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-black uppercase">
                          Batal
                        </button>
                        <button onClick={() => kirim(String(l.id), form)} disabled={simpan}
                          className="flex-1 py-1.5 rounded-lg bg-[#003D79] text-white text-[10px] font-black uppercase">
                          {simpan ? 'Menyimpan…' : 'Simpan'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
