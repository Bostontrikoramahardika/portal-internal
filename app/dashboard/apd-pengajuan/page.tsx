'use client'

import { useEffect, useMemo, useState } from 'react'
import StatBanner from '@/app/components/std/StatBanner'

type Master = { jenis_apd: string; icon?: string; life_time_bulan?: number | null; ukuran_tersedia?: string | null; warna_tersedia?: string | null }
type Row = any

const ALASAN = ['Rusak', 'Hilang', 'Habis masa pakai', 'Baru / belum pernah terima']

function headers() {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  try {
    const t = localStorage.getItem('btm_session_token_v1')
    if (t) h['Authorization'] = 'Bearer ' + t
  } catch {}
  return h
}

export default function PengajuanAPDPage() {
  const [tab, setTab] = useState<'ajukan' | 'riwayat' | 'approval'>('ajukan')
  const [master, setMaster] = useState<Master[]>([])
  const [jenis, setJenis] = useState('')
  const [ukuran, setUkuran] = useState('')
  const [warna, setWarna] = useState('')
  const [jumlah, setJumlah] = useState(1)
  const [alasan, setAlasan] = useState('')
  const [catatan, setCatatan] = useState('')
  const [info, setInfo] = useState<any>(null)
  const [pesan, setPesan] = useState<{ tipe: 'ok' | 'err'; teks: string } | null>(null)
  const [kirim, setKirim] = useState(false)

  const [rows, setRows] = useState<Row[]>([])
  const [inbox, setInbox] = useState<Row[]>([])
  const [bolehSetujui, setBolehSetujui] = useState(false)
  const [muat, setMuat] = useState(false)

  useEffect(() => {
    fetch('/api/apd/master', { credentials: 'include', headers: headers() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const arr = d?.data || d?.rows || d?.master || []
        if (Array.isArray(arr)) setMaster(arr)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!jenis) { setInfo(null); return }
    fetch('/api/apd/pengajuan?cek=' + encodeURIComponent(jenis), { credentials: 'include', headers: headers() })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setInfo(d?.ok ? d : null))
      .catch(() => setInfo(null))
  }, [jenis])

  const muatDaftar = async () => {
    setMuat(true)
    try {
      const a = await fetch('/api/apd/pengajuan?mode=saya', { credentials: 'include', headers: headers() }).then((r) => r.json())
      setRows(a?.rows || [])
      setBolehSetujui(Boolean(a?.boleh_setujui))
      if (a?.boleh_setujui) {
        const b = await fetch('/api/apd/pengajuan?mode=inbox', { credentials: 'include', headers: headers() }).then((r) => r.json())
        setInbox(b?.rows || [])
      }
    } catch {}
    setMuat(false)
  }

  useEffect(() => { muatDaftar() }, [])

  const opsiUkuran = useMemo(() => {
    const m = master.find((x) => x.jenis_apd === jenis)
    return String(m?.ukuran_tersedia || '').split(',').map((s) => s.trim()).filter(Boolean)
  }, [jenis, master])

  const opsiWarna = useMemo(() => {
    const m = master.find((x) => x.jenis_apd === jenis)
    return String(m?.warna_tersedia || '').split(',').map((s) => s.trim()).filter(Boolean)
  }, [jenis, master])

  async function submit() {
    setPesan(null)
    if (!jenis) return setPesan({ tipe: 'err', teks: 'Pilih jenis APD dulu' })
    if (!alasan) return setPesan({ tipe: 'err', teks: 'Pilih alasan pengajuan' })
    setKirim(true)
    try {
      const res = await fetch('/api/apd/pengajuan', {
        method: 'POST', credentials: 'include', headers: headers(),
        body: JSON.stringify({ jenis_apd: jenis, ukuran, warna, jumlah, alasan, catatan }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Gagal mengirim')
      setPesan({ tipe: 'ok', teks: 'Pengajuan terkirim, menunggu persetujuan SHE / HR Site' })
      setJenis(''); setUkuran(''); setWarna(''); setJumlah(1); setAlasan(''); setCatatan('')
      muatDaftar(); setTab('riwayat')
    } catch (e: any) {
      setPesan({ tipe: 'err', teks: e?.message || 'Gagal mengirim' })
    }
    setKirim(false)
  }

  async function proses(id: any, aksi: 'APPROVE' | 'REJECT') {
    if (!confirm(aksi === 'APPROVE' ? 'Setujui pengajuan ini? Stok akan langsung berkurang.' : 'Tolak pengajuan ini?')) return
    try {
      const res = await fetch('/api/apd/pengajuan/aksi', {
        method: 'POST', credentials: 'include', headers: headers(),
        body: JSON.stringify({ id, aksi }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error || 'Gagal')
      muatDaftar()
    } catch (e: any) {
      alert(e?.message || 'Gagal memproses')
    }
  }

  const Lencana = ({ s }: { s: string }) => {
    const w = s === 'APPROVED' ? 'bg-emerald-100 text-emerald-700'
      : s === 'REJECTED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
    return <span className={'px-2 py-0.5 rounded-full text-[9px] font-black uppercase ' + w}>{s}</span>
  }

  const Kartu = ({ r, aksi }: { r: Row; aksi?: boolean }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-800">{r.jenis_apd}</div>
          <div className="text-[10px] font-bold text-slate-500">
            {aksi ? r.nama_karyawan + ' - ' : ''}{r.jumlah}x
            {r.ukuran ? ' - ' + r.ukuran : ''}{r.warna ? ' - ' + r.warna : ''}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Alasan: {r.alasan}</div>
          {r.masa_pakai_belum_habis && (
            <div className="text-[9px] font-bold text-amber-600 mt-0.5">Masa pakai belum habis</div>
          )}
          {r.approver_nama && (
            <div className="text-[9px] text-slate-400 mt-1">
              {r.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'} oleh {r.approver_nama}
            </div>
          )}
        </div>
        <Lencana s={r.status} />
      </div>
      {aksi && r.status === 'PENDING' && (
        <div className="flex gap-2 mt-2.5">
          <button onClick={() => proses(r.id, 'APPROVE')}
            className="flex-1 py-2 rounded-xl bg-[#0b2a5b] text-white text-[11px] font-black uppercase active:scale-95">
            Setujui
          </button>
          <button onClick={() => proses(r.id, 'REJECT')}
            className="flex-1 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-[11px] font-black uppercase active:scale-95">
            Tolak
          </button>
        </div>
      )}
    </div>
  )

  const tabs: { id: any; label: string }[] = [
    { id: 'ajukan', label: 'Ajukan' },
    { id: 'riwayat', label: 'Riwayat' },
    ...(bolehSetujui ? [{ id: 'approval', label: 'Approval' }] : []),
  ]

  return (
    <div className="space-y-3 text-slate-800">
      <StatBanner eyebrow="Pengajuan" title="Pengajuan APD" subtitle="Alat pelindung diri"
        onRefresh={muatDaftar} refreshing={muat} />

      <div className="flex gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={'flex-1 px-3 py-2 rounded-xl text-[12px] font-black uppercase tracking-wide transition-all active:scale-95 ' +
              (tab === t.id ? 'bg-[#003d79] text-white shadow' : 'text-slate-500')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'ajukan' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Jenis APD</label>
            <select value={jenis} onChange={(e) => setJenis(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold">
              <option value="">-- Pilih --</option>
              {master.map((m) => (<option key={m.jenis_apd} value={m.jenis_apd}>{m.jenis_apd}</option>))}
            </select>
          </div>

          {info?.masa_pakai_belum_habis && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">Perhatian</div>
              <p className="text-[11px] font-medium text-amber-800 mt-0.5">
                Masa pakai APD ini belum berakhir (sisa {info.sisa_hari} hari, prediksi ganti {info.prediksi_berikutnya}).
                Anda tetap bisa mengajukan.
              </p>
            </div>
          )}

          {opsiUkuran.length > 0 && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Ukuran</label>
              <select value={ukuran} onChange={(e) => setUkuran(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold">
                <option value="">-- Pilih --</option>
                {opsiUkuran.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}

          {opsiWarna.length > 0 && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Warna</label>
              <select value={warna} onChange={(e) => setWarna(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold">
                <option value="">-- Pilih --</option>
                {opsiWarna.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Jumlah</label>
            <input type="number" min={1} value={jumlah}
              onChange={(e) => setJumlah(Math.max(1, Number(e.target.value) || 1))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold" />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Alasan</label>
            <select value={alasan} onChange={(e) => setAlasan(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold">
              <option value="">-- Pilih --</option>
              {ALASAN.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Catatan (opsional)</label>
            <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
          </div>

          {pesan && (
            <div className={'p-2.5 rounded-xl text-[11px] font-bold ' +
              (pesan.tipe === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                   : 'bg-rose-50 text-rose-700 border border-rose-200')}>
              {pesan.teks}
            </div>
          )}

          <button onClick={submit} disabled={kirim}
            className="w-full py-3 rounded-2xl bg-[#0b2a5b] text-white font-black text-sm uppercase tracking-wide active:scale-95 disabled:opacity-50">
            {kirim ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </div>
      )}

      {tab === 'riwayat' && (
        <div className="space-y-2">
          {rows.length === 0 && (
            <p className="py-10 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Belum ada pengajuan</p>
          )}
          {rows.map((r) => <Kartu key={r.id} r={r} />)}
        </div>
      )}

      {tab === 'approval' && (
        <div className="space-y-2">
          {inbox.filter((r) => r.status === 'PENDING').length === 0 && (
            <p className="py-10 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Tidak ada pengajuan menunggu</p>
          )}
          {inbox.map((r) => <Kartu key={r.id} r={r} aksi />)}
        </div>
      )}
    </div>
  )
}