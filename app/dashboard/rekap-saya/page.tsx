'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import StatBanner from '@/app/components/std/StatBanner'

function hdr() {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  try {
    const t = localStorage.getItem('btm_session_token_v1')
    if (t) h['Authorization'] = 'Bearer ' + t
  } catch {}
  return h
}

const WARNA: Record<string, string> = {
  DS: 'bg-sky-100 text-sky-800', NS: 'bg-indigo-100 text-indigo-800',
  OFF: 'bg-slate-200 text-slate-600', CR: 'bg-amber-100 text-amber-800',
  PK: 'bg-emerald-100 text-emerald-800', A: 'bg-rose-100 text-rose-700',
  S: 'bg-orange-100 text-orange-700', I: 'bg-yellow-100 text-yellow-800',
}

function Isi() {
  const sp = useSearchParams()
  const idAwal = sp?.get('id') || ''
  const [daftar, setDaftar] = useState<any[]>([])
  const [pilih, setPilih] = useState<string>(idAwal)
  const [detail, setDetail] = useState<any>(null)
  const [periode, setPeriode] = useState<any>(null)
  const [muat, setMuat] = useState(false)
  const [catatan, setCatatan] = useState('')
  const [formProtes, setFormProtes] = useState(false)

  const muatDaftar = async () => {
    setMuat(true)
    try {
      const d = await fetch('/api/rekap-absensi?mode=saya', { credentials: 'include', headers: hdr() }).then((r) => r.json())
      setDaftar(d?.rows || [])
      if (!pilih && d?.rows?.length) setPilih(d.rows[0].id)
    } catch {}
    setMuat(false)
  }

  useEffect(() => { muatDaftar() }, [])

  useEffect(() => {
    if (!pilih) { setDetail(null); return }
    fetch('/api/rekap-absensi?mode=detail&id=' + pilih, { credentials: 'include', headers: hdr() })
      .then((r) => r.json())
      .then((d) => { if (d?.ok) { setDetail(d.item); setPeriode(d.periode) } })
      .catch(() => {})
  }, [pilih])

  async function jawab(aksi: 'SETUJU' | 'PROTES') {
    if (aksi === 'PROTES' && !catatan.trim()) { alert('Tuliskan bagian mana yang salah'); return }
    if (aksi === 'SETUJU' && !confirm('Setujui rekap absensi bulan ini?')) return
    try {
      const res = await fetch('/api/rekap-absensi/respon', {
        method: 'POST', credentials: 'include', headers: hdr(),
        body: JSON.stringify({ id: pilih, aksi, catatan }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Gagal')
      setFormProtes(false); setCatatan('')
      muatDaftar()
      setDetail((x: any) => ({ ...x, status: aksi }))
    } catch (e: any) { alert(e?.message || 'Gagal') }
  }

  const r = detail?.ringkasan || {}
  const hari: any[] = Array.isArray(r?.days) ? r.days : []
  const s = r?.summary || {}
  const lembur: any[] = Array.isArray(r?.lembur) ? r.lembur : []
  const sudahJawab = detail?.status === 'SETUJU' || detail?.status === 'PROTES'

  return (
    <div className="space-y-3 text-slate-800">
      <StatBanner eyebrow="Profil Saya" title="Rekap Absensi"
        subtitle="Pencocokan data kehadiran" onRefresh={muatDaftar} refreshing={muat} />

      {daftar.length === 0 && (
        <p className="py-10 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
          Belum ada rekap yang dikirim HR
        </p>
      )}

      {daftar.length > 0 && (
        <select value={pilih} onChange={(e) => setPilih(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold">
          {daftar.map((d) => (
            <option key={d.id} value={d.id}>
              {d.periode?.bulan || '-'} - {d.status}
              {Number(d.periode?.versi || 1) > 1 ? ' (revisi ' + d.periode.versi + ')' : ''}
            </option>
          ))}
        </select>
      )}

      {detail && (
        <>
          {periode?.pesan_hr && (
            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
              <div className="text-[9px] font-black uppercase tracking-widest text-blue-700">Pesan dari HR</div>
              <p className="text-[12px] font-medium text-blue-900 mt-1 whitespace-pre-line">{periode.pesan_hr}</p>
              {periode.batas_konfirmasi && (
                <p className="text-[10px] font-black text-blue-700 mt-1.5">
                  Batas konfirmasi: {periode.batas_konfirmasi}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {[
              ['Total Hadir', s.hariHadir], ['DS', s.shiftS], ['NS', s.shiftM],
              ['OFF', s.off], ['CR', s.cuti], ['Alpha', s.alpha],
            ].map(([l, v]) => (
              <div key={String(l)} className="bg-white rounded-xl border border-slate-200 p-2.5 text-center">
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{String(l)}</div>
                <div className="text-lg font-black text-[#0b2a5b]">{Number(v || 0)}</div>
              </div>
            ))}
          </div>

          {hari.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kehadiran Harian</span>
                <span className="text-[10px] font-bold text-slate-400">{periode?.bulan}</span>
              </div>

              <div className="flex gap-2 pb-1.5 border-b-2 border-[#0b2a5b] text-[8.5px] font-black uppercase tracking-wider text-[#0b2a5b]">
                <div className="w-9 text-center shrink-0">Tgl</div>
                <div className="w-9 shrink-0">Shift</div>
                <div className="w-[92px] shrink-0">C.in - C.out</div>
                <div className="flex-1">Keterangan</div>
              </div>

              {hari.map((d: any, i: number) => {
                const ket = d?.isAfterResign ? 'Sudah resign'
                  : Number(d?.terlambat_menit) > 0 ? 'Terlambat ' + d.terlambat_menit + ' menit'
                  : (d?.clock_in && !d?.clock_out) ? 'Belum clock out'
                  : ''
                return (
                  <div key={i} className="flex gap-2 py-2 border-b border-slate-100 last:border-0">
                    <div className="w-9 text-center shrink-0">
                      <div className="text-[14px] font-black leading-none text-slate-900">
                        {String(d?.day || i + 1).padStart(2, '0')}
                      </div>
                    </div>
                    <div className="w-9 shrink-0">
                      <span className={'px-1.5 py-0.5 rounded-full text-[9px] font-black ' +
                        (WARNA[d?.code] || 'bg-slate-50 text-slate-400')}>
                        {d?.code || '-'}
                      </span>
                    </div>
                    <div className="w-[92px] shrink-0 text-[11px] font-bold text-slate-700 tabular-nums">
                      {d?.clock_in
                        ? <>{String(d.clock_in).slice(0, 5)} <span className="text-slate-300">-</span>{' '}
                            {d?.clock_out
                              ? String(d.clock_out).slice(0, 5)
                              : <span className="text-rose-600">--</span>}</>
                        : <span className="text-slate-300">-</span>}
                    </div>
                    <div className={'flex-1 text-[10px] leading-snug ' +
                      (ket ? 'text-amber-700 font-bold' : 'text-slate-300')}>
                      {ket || '-'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {lembur.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Lembur</span>
                <span className="text-[10px] font-bold text-slate-400">{lembur.length} kali</span>
              </div>
              {lembur.map((l: any, i: number) => (
                <div key={i} className="flex gap-2.5 py-2 border-b border-slate-100 last:border-0">
                  <div className="w-14 shrink-0 text-[10px] font-black text-slate-900">
                    {String(l.tanggal || '').slice(8, 10)}/{String(l.tanggal || '').slice(5, 7)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-700 leading-snug">{l.alasan || '-'}</div>
                    {l.disetujui_oleh && (
                      <div className="text-[9px] text-slate-400 mt-0.5">Disetujui: {l.disetujui_oleh}</div>
                    )}
                    {l.tahap === 'MENUNGGU_PJO' && (
                      <div className="text-[9px] font-bold text-amber-600 mt-0.5">Menunggu persetujuan PJO</div>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t-2 border-[#0b2a5b]">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#0b2a5b]">Total Lembur</span>
                <span className="text-[16px] font-black text-[#0b2a5b]">{lembur.length} kali</span>
              </div>
            </div>
          )}

          {Number(detail.jml_piket) > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#0b2a5b]">Total Piket</span>
              <span className="text-[16px] font-black text-[#0b2a5b]">{detail.jml_piket} kali</span>
            </div>
          )}

          {detail.status === 'SETUJU' && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-[12px] font-black text-emerald-700">Anda sudah menyetujui rekap ini</p>
            </div>
          )}
          {detail.status === 'PROTES' && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <p className="text-[11px] font-black text-amber-700">Permintaan revisi sudah dikirim ke HR</p>
              <p className="text-[11px] text-amber-800 mt-1">{detail.catatan_karyawan}</p>
            </div>
          )}
          {detail.status === 'DIREVISI' && (
            <div className="p-3 rounded-2xl bg-violet-50 border border-violet-200 text-center">
              <p className="text-[11px] font-black text-violet-700">Rekap ini sudah diganti versi baru</p>
            </div>
          )}

          {!sudahJawab && detail.status !== 'DIREVISI' && !formProtes && (
            <div className="flex gap-2">
              <button onClick={() => jawab('SETUJU')}
                className="flex-1 py-3 rounded-2xl bg-[#16a34a] text-white font-black text-[12px] uppercase tracking-wide active:scale-95">
                Setuju
              </button>
              <button onClick={() => setFormProtes(true)}
                className="flex-1 py-3 rounded-2xl bg-[#dc2626] text-white font-black text-[12px] uppercase tracking-wide active:scale-95">
                Ajukan Revisi
              </button>
            </div>
          )}

          {!sudahJawab && formProtes && (
            <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Apa yang tidak sesuai?
              </label>
              <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3}
                placeholder="Contoh: tanggal 12 saya masuk NS, di rekap tertulis OFF"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
              <div className="flex gap-2">
                <button onClick={() => jawab('PROTES')}
                  className="flex-1 py-2.5 rounded-xl bg-[#dc2626] text-white font-black text-[11px] uppercase active:scale-95">
                  Kirim Revisi
                </button>
                <button onClick={() => setFormProtes(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-black text-[11px] uppercase active:scale-95">
                  Batal
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Untuk perbaikan jam masuk/pulang, gunakan menu Pengajuan - Revisi Absensi.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function RekapSayaPage() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-xs text-slate-400">Memuat...</div>}>
      <Isi />
    </Suspense>
  )
}