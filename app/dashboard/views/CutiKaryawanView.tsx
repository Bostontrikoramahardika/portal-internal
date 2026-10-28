'use client'

// ═══════════════════════════════════════════════════════════════════════════
// CUTI KARYAWAN (v1.0)
// Satu halaman untuk: nama, jabatan, NRP, tgl mulai/akhir cuti, total hari,
// keterangan, hak cuti tahunan, hak tiket + tujuan, status approval, aksi.
// Menggabungkan data:
//   - /api/monitoring-cuti   → leave_requests + leave_tickets
//   - /api/kelola-hak-cuti   → saldo cuti tahunan + hak tiket pesawat
// Desain mengikuti halaman Dashboard Cuti (biru #003D79, latar #f4f7fa).
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/app/lib/AuthContext'

type CutiRow = {
  id: string
  nrp: string
  nama: string
  jabatan: string
  departemen: string
  site: string
  tanggal_mulai: string
  tanggal_selesai: string
  jumlah_hari: number
  jenis_cuti: string
  alasan: string
  status_atasan: string
  status_pjo: string
  status_final: string
  butuh_tiket: boolean
}

type TiketRow = {
  id: string
  leave_request_id: string
  nrp: string
  trip_type: string
  tanggal: string
  tujuan: string
  status: string
  catatan?: string
}

type HakRow = {
  nrp: string
  nama: string
  jabatan: string
  site: string
  hak_awal: number
  terpakai: number
  penyesuaian: number
  sisa: number
  eligible_tiket_pesawat: boolean
}

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const STATUS_TIKET: any = {
  MENUNGGU_PEMESANAN: { label: 'Menunggu Pesanan', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  SUDAH_DIPESAN: { label: 'Sudah Dipesan', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  E_TICKET_TERKIRIM: { label: 'E-Ticket Terkirim', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  SELESAI: { label: 'Selesai', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DIBATALKAN: { label: 'Dibatalkan', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
}

export default function CutiKaryawanView() {
  const { user, isSuperAdmin } = useAuth()
  const now = new Date()

  const [bulan, setBulan] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [tahun, setTahun] = useState(String(now.getFullYear()))
  const [site, setSite] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const [cuti, setCuti] = useState<CutiRow[]>([])
  const [tiket, setTiket] = useState<TiketRow[]>([])
  const [hak, setHak] = useState<HakRow[]>([])
  const [sites, setSites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [detail, setDetail] = useState<CutiRow | null>(null)

  const roleList: string[] = ((user?.roles as string[]) || [(user as any)?.role || '']).map((r) => String(r).toLowerCase())
  const isHOScope = isSuperAdmin || roleList.some((r) =>
    ['hr_ho', 'hrga', 'hrga_pusat', 'admin', 'director_ops', 'manager_ops', 'business_dev', 'spv_she_ho'].includes(r)
  )
  const userSite = (user as any)?.scope_site || (user as any)?.site || ''

  useEffect(() => {
    if (!isHOScope && userSite) setSite(userSite)
  }, [isHOScope, userSite])

  useEffect(() => { loadAll() /* eslint-disable-next-line react-hooks/exhaustive-deps */ },
    [bulan, tahun, site])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const p = new URLSearchParams({ bulan, tahun, ...(site && { site }) })
      const [r1, r2] = await Promise.all([
        fetch(`/api/monitoring-cuti?${p.toString()}`),
        fetch(`/api/kelola-hak-cuti?${new URLSearchParams({ tahun, ...(site && { site }) }).toString()}`),
      ])
      const j1 = await r1.json()
      const j2 = await r2.json()

      if (r1.ok) {
        setCuti(j1.cuti || [])
        setTiket(j1.tiket || [])
        if (j1.sites?.length) setSites(j1.sites)
      } else {
        setError(j1.error || 'Gagal memuat data cuti')
      }
      if (r2.ok) setHak(j2.rows || [])
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const hakMap = useMemo(() => {
    const m = new Map<string, HakRow>()
    hak.forEach((h) => m.set(String(h.nrp), h))
    return m
  }, [hak])

  const tiketMap = useMemo(() => {
    const m = new Map<string, TiketRow[]>()
    tiket.forEach((t) => {
      const k = String(t.leave_request_id)
      m.set(k, [...(m.get(k) || []), t])
    })
    return m
  }, [tiket])

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim()
    return cuti.filter((c) => {
      if (q && !(c.nama || '').toLowerCase().includes(q) && !String(c.nrp).includes(q)) return false
      if (statusFilter) {
        const st = c.status_final || 'PENDING'
        if (statusFilter !== st) return false
      }
      return true
    })
  }, [cuti, search, statusFilter])

  const stats = useMemo(() => ({
    total: rows.length,
    menunggu: rows.filter((r) => !r.status_final || r.status_final === 'PENDING').length,
    disetujui: rows.filter((r) => r.status_final === 'DISETUJUI').length,
    ditolak: rows.filter((r) => r.status_final === 'DITOLAK').length,
    tiket: rows.filter((r) => r.butuh_tiket).length,
  }), [rows])

  return (
    <div className="bg-[#f4f7fa] pb-24 text-slate-800">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#003D79] to-[#0056b3] px-4 pt-6 pb-5 lg:px-6 lg:pt-8 lg:pb-7 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🌴</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">HR • Admin</p>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">Cuti Karyawan</h1>
            <p className="text-blue-200/80 text-xs font-medium">
              Data cuti • hak cuti tahunan • tiket pesawat • status approval
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 lg:px-6 lg:py-6 space-y-3">

        {/* ── FILTER ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <select value={bulan} onChange={(e) => setBulan(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold">
              {NAMA_BULAN.map((n, i) => (
                <option key={i} value={String(i + 1).padStart(2, '0')}>📅 {n}</option>
              ))}
            </select>
            <select value={tahun} onChange={(e) => setTahun(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold">
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
            <select value={site} onChange={(e) => setSite(e.target.value)} disabled={!isHOScope}
              className={`border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold ${!isHOScope ? 'bg-slate-100' : ''}`}>
              <option value="">🏢 Semua Site</option>
              {sites.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold">
              <option value="">📋 Semua Status</option>
              <option value="PENDING">⏳ Menunggu</option>
              <option value="DISETUJUI">✅ Disetujui</option>
              <option value="DITOLAK">❌ Ditolak</option>
            </select>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Cari nama / NRP..."
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:border-[#003D79] col-span-2 md:col-span-1" />
          </div>
        </div>

        {/* ── STAT ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          <StatCard color="blue" label="Total Cuti" value={stats.total} sub="pengajuan bulan ini" icon="📋" />
          <StatCard color="amber" label="Menunggu" value={stats.menunggu} sub="belum final" icon="⏳" />
          <StatCard color="green" label="Disetujui" value={stats.disetujui} sub="sudah final" icon="✅" />
          <StatCard color="red" label="Ditolak" value={stats.ditolak} sub="tidak disetujui" icon="❌" />
          <StatCard color="indigo" label="Butuh Tiket" value={stats.tiket} sub="perlu pesawat" icon="✈️" />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 text-xs font-bold">
            ❌ {error}
          </div>
        )}

        {/* ── TABEL ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-[11px] text-slate-600">
              Menampilkan <strong>{rows.length}</strong> dari <strong>{cuti.length}</strong> karyawan
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {NAMA_BULAN[Number(bulan) - 1]} {tahun}
            </p>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
              Memuat data cuti...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm font-semibold">Tidak ada data cuti pada periode ini</p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <Th>Karyawan</Th>
                      <Th>Site</Th>
                      <Th center>Tgl Mulai</Th>
                      <Th center>Tgl Akhir</Th>
                      <Th center>Total Hari</Th>
                      <Th>Keterangan</Th>
                      <Th center>Cuti Tahunan</Th>
                      <Th center>Tiket Pesawat</Th>
                      <Th center>Status Approval</Th>
                      <Th center>Aksi</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const h = hakMap.get(String(r.nrp))
                      const tk = tiketMap.get(String(r.id)) || []
                      const st = r.status_final || 'PENDING'
                      return (
                        <tr key={r.id} className="border-b border-slate-50 hover:bg-blue-50/40">
                          <td className="px-3 py-2">
                            <div className="font-bold text-slate-800">{r.nama}</div>
                            <div className="text-[10px] text-slate-500">{r.nrp} • {r.jabatan}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{r.site}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">{fmtTgl(r.tanggal_mulai)}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">{fmtTgl(r.tanggal_selesai)}</td>
                          <td className="px-3 py-2 text-center font-black text-[#003D79]">{r.jumlah_hari}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                              {r.jenis_cuti}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5 max-w-[180px] truncate">
                              {r.alasan || '—'}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {h && h.hak_awal > 0 ? (
                              <>
                                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                                  Ya • {h.hak_awal} hari
                                </span>
                                <div className="text-[10px] text-slate-500 mt-0.5">sisa {h.sisa}</div>
                              </>
                            ) : (
                              <span className="text-slate-400">Tidak</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {r.butuh_tiket ? (
                              <>
                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold">
                                  Ya
                                </span>
                                <div className="text-[10px] text-slate-500 mt-0.5 max-w-[150px] truncate mx-auto">
                                  {tk.length ? tk.map((t) => t.tujuan).join(' • ') : 'tujuan belum diisi'}
                                </div>
                              </>
                            ) : (
                              <span className="text-slate-400">Tidak</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <StatusChip s={st} />
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              Atasan {short(r.status_atasan)} • PJO {short(r.status_pjo)}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => setDetail(r)}
                              className="px-2.5 py-1 bg-[#003D79] text-white rounded-lg text-[10px] font-bold hover:bg-[#002c58]">
                              ⚙️ Kelola
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* HP */}
              <div className="lg:hidden divide-y divide-slate-100">
                {rows.map((r) => {
                  const h = hakMap.get(String(r.nrp))
                  const tk = tiketMap.get(String(r.id)) || []
                  return (
                    <div key={r.id} className="p-3">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="font-bold text-sm truncate">{r.nama}</div>
                          <div className="text-[10px] text-slate-500">{r.nrp} • {r.jabatan}</div>
                          <div className="text-[10px] text-slate-500">🏢 {r.site}</div>
                        </div>
                        <StatusChip s={r.status_final || 'PENDING'} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                        <div>
                          <div className="text-slate-500 font-semibold">📅 Periode ({r.jumlah_hari} hari)</div>
                          <div className="font-bold">{fmtTgl(r.tanggal_mulai)} – {fmtTgl(r.tanggal_selesai)}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 font-semibold">🎫 Cuti tahunan</div>
                          <div className="font-bold">{h && h.hak_awal > 0 ? `Ya • ${h.hak_awal} hari (sisa ${h.sisa})` : 'Tidak'}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 font-semibold">✈️ Tiket</div>
                          <div className="font-bold">{r.butuh_tiket ? (tk.length ? tk.map((t) => t.tujuan).join(' • ') : 'Ya, tujuan belum diisi') : 'Tidak'}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 font-semibold">📝 Keterangan</div>
                          <div className="font-bold">{r.jenis_cuti}{r.alasan ? ` • ${r.alasan}` : ''}</div>
                        </div>
                      </div>
                      <button onClick={() => setDetail(r)}
                        className="w-full py-2 bg-[#003D79] text-white rounded-xl text-[11px] font-black uppercase tracking-wider">
                        ⚙️ Kelola
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {detail && (
        <KelolaModal
          row={detail}
          hak={hakMap.get(String(detail.nrp))}
          tiketList={tiketMap.get(String(detail.id)) || []}
          tahun={tahun}
          onClose={() => setDetail(null)}
          onSaved={loadAll}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL KELOLA — saldo cuti, hak tiket, status tiket
// ═══════════════════════════════════════════════════════════════════════════
function KelolaModal({ row, hak, tiketList, tahun, onClose, onSaved }: any) {
  const [hakAwal, setHakAwal] = useState<number>(hak?.hak_awal ?? 12)
  const [terpakai, setTerpakai] = useState<number>(hak?.terpakai ?? 0)
  const [penyesuaian, setPenyesuaian] = useState<number>(hak?.penyesuaian ?? 0)
  const [eligible, setEligible] = useState<boolean>(!!hak?.eligible_tiket_pesawat)
  const [statusTiket, setStatusTiket] = useState<string>(tiketList[0]?.status || '')
  const [catatan, setCatatan] = useState<string>(tiketList[0]?.catatan || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const sisa = Math.max(0, hakAwal + penyesuaian - terpakai)

  async function simpanSaldo() {
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/kelola-hak-cuti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_balance',
          nrp: row.nrp,
          payload: { tahun, hak_awal: hakAwal, terpakai, penyesuaian },
        }),
      })
      const j = await res.json()
      if (res.ok) { setMsg('✅ Saldo cuti tersimpan'); onSaved() }
      else setMsg('❌ ' + (j.error || 'Gagal menyimpan'))
    } catch (e: any) { setMsg('❌ ' + e.message) }
    finally { setSaving(false) }
  }

  async function simpanHakTiket(next: boolean) {
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/kelola-hak-cuti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_eligible', nrp: row.nrp, payload: { eligible: next } }),
      })
      const j = await res.json()
      if (res.ok) { setEligible(next); setMsg('✅ Hak tiket diperbarui'); onSaved() }
      else setMsg('❌ ' + (j.error || 'Gagal menyimpan'))
    } catch (e: any) { setMsg('❌ ' + e.message) }
    finally { setSaving(false) }
  }

  async function simpanStatusTiket() {
    if (!tiketList[0]) return
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/monitoring-cuti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: tiketList[0].id, status: statusTiket, catatan }),
      })
      const j = await res.json()
      if (res.ok) { setMsg('✅ Status tiket diperbarui'); onSaved() }
      else setMsg('❌ ' + (j.error || 'Gagal menyimpan'))
    } catch (e: any) { setMsg('❌ ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div className="fixed inset-x-3 top-1/2 -translate-y-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-lg bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden max-h-[90vh] overflow-y-auto">

        <div className="p-5 bg-gradient-to-br from-[#003D79] to-[#0056b3] text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-emerald-300 text-[10px] font-black uppercase tracking-[0.25em]">Kelola Cuti</p>
              <h2 className="font-black text-lg truncate">{row.nama}</h2>
              <p className="text-blue-200/80 text-[11px]">{row.nrp} • {row.jabatan} • {row.site}</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 font-bold">✕</button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="bg-white/10 rounded-xl py-2">
              <p className="text-[9px] uppercase font-black text-blue-200">Mulai</p>
              <p className="text-xs font-black">{fmtTgl(row.tanggal_mulai)}</p>
            </div>
            <div className="bg-white/10 rounded-xl py-2">
              <p className="text-[9px] uppercase font-black text-blue-200">Akhir</p>
              <p className="text-xs font-black">{fmtTgl(row.tanggal_selesai)}</p>
            </div>
            <div className="bg-white/10 rounded-xl py-2">
              <p className="text-[9px] uppercase font-black text-blue-200">Total</p>
              <p className="text-xs font-black">{row.jumlah_hari} hari</p>
            </div>
          </div>
        </div>

        {msg && (
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-700">{msg}</div>
        )}

        <div className="p-5 space-y-4">

          {/* KETERANGAN */}
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Keterangan cuti</p>
            <p className="text-xs font-bold text-slate-700">{row.jenis_cuti}</p>
            <p className="text-[11px] text-slate-500">{row.alasan || '—'}</p>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold">Atasan: {row.status_atasan || 'PENDING'}</span>
              <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold">PJO: {row.status_pjo || 'PENDING'}</span>
              <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold">Final: {row.status_final || 'PENDING'}</span>
            </div>
          </div>

          {/* SALDO CUTI TAHUNAN */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">🎫 Cuti tahunan</p>
            {!hak ? (
              <p className="text-[11px] text-slate-400 font-semibold">
                Data saldo belum ada untuk NRP ini.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Hak awal" value={hakAwal} onChange={setHakAwal} />
                  <Field label="Terpakai" value={terpakai} onChange={setTerpakai} />
                  <Field label="Penyesuaian" value={penyesuaian} onChange={setPenyesuaian} />
                </div>
                <div className="mt-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-blue-500">Sisa cuti</span>
                  <span className="text-lg font-black text-blue-700">{sisa} hari</span>
                </div>
                <button onClick={simpanSaldo} disabled={saving}
                  className="mt-2 w-full py-2.5 bg-[#003D79] text-white rounded-xl text-[11px] font-black uppercase tracking-wider disabled:opacity-50">
                  {saving ? '⏳ Menyimpan...' : '💾 Simpan saldo cuti'}
                </button>
              </>
            )}
          </div>

          {/* HAK TIKET */}
          <div className="rounded-2xl border border-slate-100 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">✈️ Hak tiket pesawat</p>
                <p className="text-[11px] text-slate-500">
                  {eligible ? 'Karyawan ini berhak tiket pesawat' : 'Tidak berhak tiket pesawat'}
                </p>
              </div>
              <button onClick={() => simpanHakTiket(!eligible)} disabled={saving}
                className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border-2 disabled:opacity-50 ${
                  eligible ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                {eligible ? 'AKTIF' : 'NONAKTIF'}
              </button>
            </div>
          </div>

          {/* TIKET */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">🧾 Tiket pesawat</p>
            {!tiketList.length ? (
              <p className="text-[11px] text-slate-400 font-semibold">
                {row.butuh_tiket ? 'Pengajuan butuh tiket, data tiket belum dibuat.' : 'Tidak butuh tiket pesawat.'}
              </p>
            ) : (
              <div className="space-y-2">
                {tiketList.map((t: TiketRow) => (
                  <div key={t.id} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                    <p className="text-[11px] font-bold text-slate-700">
                      {t.trip_type} • {t.tujuan}
                    </p>
                    <p className="text-[10px] text-slate-500">📅 {fmtTgl(t.tanggal)}</p>
                  </div>
                ))}
                <select value={statusTiket} onChange={(e) => setStatusTiket(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold">
                  {Object.entries(STATUS_TIKET).map(([k, v]: any) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <input value={catatan} onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Catatan (opsional)"
                  className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold outline-none focus:border-[#003D79]" />
                <button onClick={simpanStatusTiket} disabled={saving}
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider disabled:opacity-50">
                  {saving ? '⏳ Menyimpan...' : '💾 Simpan status tiket'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button onClick={onClose} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-wider">
            Tutup
          </button>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// KOMPONEN KECIL
// ═══════════════════════════════════════════════════════════════════════════
function Field({ label, value, onChange }: any) {
  return (
    <div>
      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold outline-none focus:border-[#003D79]" />
    </div>
  )
}

function StatCard({ color, label, value, sub, icon }: any) {
  const map: any = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    green: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    red: 'bg-rose-50 border-rose-100 text-rose-700',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
  }
  return (
    <div className={`rounded-2xl border p-2.5 ${map[color] || map.blue}`}>
      <div className="flex items-start justify-between">
        <p className="text-[8px] font-black uppercase tracking-wider opacity-80">{label}</p>
        <span className="text-xs">{icon}</span>
      </div>
      <p className="text-xl font-black leading-tight">{value}</p>
      <p className="text-[8px] font-bold uppercase opacity-60">{sub}</p>
    </div>
  )
}

function StatusChip({ s }: { s: string }) {
  const cls =
    s === 'DISETUJUI' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'DITOLAK' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-amber-50 text-amber-700 border-amber-200'
  const label = s === 'DISETUJUI' ? '✅ Disetujui' : s === 'DITOLAK' ? '❌ Ditolak' : '⏳ Menunggu'
  return <span className={`inline-block px-1.5 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${cls}`}>{label}</span>
}

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th className={`px-3 py-2 font-black text-slate-600 uppercase tracking-wide ${center ? 'text-center' : 'text-left'}`}>
      {children}
    </th>
  )
}

function short(s: string) {
  if (!s) return '—'
  if (s === 'DISETUJUI') return '✅'
  if (s === 'DITOLAK') return '❌'
  return '⏳'
}

function fmtTgl(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })
  } catch { return iso }
}
