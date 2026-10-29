'use client'

// ═══════════════════════════════════════════════════════════════════════════
// PUNISHMENT — CNC / Surat Komitmen / SP1 / SP2 / SP3
// Alur: leader buat → PJO setujui → HR arsip. KPI terpotong saat TERBIT.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'

type Poin = { jenis: string; label: string; poin: number }
type Bawahan = { nrp: string; nama: string; jabatan: string; departemen: string; site: string }

const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export default function PunishmentView() {
  const now = new Date()
  const [bulan, setBulan] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [tahun, setTahun] = useState(String(now.getFullYear()))
  const [statusFilter, setStatusFilter] = useState('')
  const [tab, setTab] = useState<'daftar' | 'baru'>('daftar')

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [detail, setDetail] = useState<any>(null)

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ },
    [bulan, tahun, statusFilter])

  async function load() {
    setLoading(true)
    try {
      const p = new URLSearchParams({ bulan, tahun })
      if (statusFilter) p.set('status', statusFilter)
      const res = await fetch(`/api/punishment?${p.toString()}`)
      const j = await res.json()
      if (res.ok) setData(j)
      else setMsg('❌ ' + (j.error || 'Gagal memuat'))
    } catch (e: any) {
      setMsg('❌ ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const poinList: Poin[] = data?.poin_setting || []
  const bawahan: Bawahan[] = data?.bawahan || []
  const rows: any[] = data?.rows || []
  const stats = data?.stats || {}
  const peran = data?.saya?.peran || {}

  return (
    <div className="bg-[#f4f7fa] pb-24 text-slate-800">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-[#003D79] to-[#0056b3] px-4 pt-6 pb-5 lg:px-6 lg:pt-8 lg:pb-7 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-4xl">⚠️</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">HR • Disiplin</p>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">Punishment</h1>
            <p className="text-blue-200/80 text-xs font-medium">
              CNC • Surat Komitmen • SP1 • SP2 • SP3 — otomatis memotong KPI
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {([['daftar', '📋 Daftar'], ['baru', '➕ Buat Baru']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k as any)}
              className={`px-4 py-2.5 rounded-full text-xs lg:text-sm font-bold transition-all ${
                tab === k ? 'bg-white text-[#003D79] shadow-lg' : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 lg:px-6 lg:py-6 space-y-3">

        {msg && <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 text-xs font-bold">{msg}</div>}

        {tab === 'daftar' ? (
          <>
            {/* FILTER */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <select value={bulan} onChange={(e) => setBulan(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold">
                  {NAMA_BULAN.map((n, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>📅 {n}</option>)}
                </select>
                <select value={tahun} onChange={(e) => setTahun(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold">
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold">
                  <option value="">📋 Semua Status</option>
                  <option value="MENUNGGU_PJO">⏳ Menunggu PJO</option>
                  <option value="TERBIT">✅ Terbit</option>
                  <option value="DITOLAK">❌ Ditolak</option>
                  <option value="DIBATALKAN">🚫 Dibatalkan</option>
                </select>
                <div className="text-[10px] text-slate-500 font-bold flex items-center justify-end">
                  {peran.isHR ? 'Peran: HR' : peran.isPJO ? 'Peran: PJO' : 'Peran: Leader'}
                </div>
              </div>
            </div>

            {/* STAT */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
              <Stat color="blue" label="Total" value={stats.total || 0} sub="bulan ini" />
              <Stat color="amber" label="Menunggu PJO" value={stats.menunggu || 0} sub="belum terbit" />
              <Stat color="green" label="Terbit" value={stats.terbit || 0} sub="potong KPI" />
              <Stat color="red" label="Ditolak" value={stats.ditolak || 0} sub="tidak berlaku" />
              <Stat color="indigo" label="Total Poin" value={stats.poin || 0} sub="potongan KPI" />
            </div>

            {/* TABEL */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[11px] text-slate-600">
                Menampilkan <strong>{rows.length}</strong> surat • {NAMA_BULAN[Number(bulan) - 1]} {tahun}
              </div>

              {loading ? (
                <div className="py-16 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Memuat...</div>
              ) : rows.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <div className="text-3xl mb-2">🗂️</div>
                  <p className="text-sm font-semibold">Belum ada punishment bulan ini</p>
                </div>
              ) : (
                <>
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <Th>No. Surat</Th><Th>Karyawan</Th><Th center>Jenis</Th>
                          <Th>Pelanggaran</Th><Th center>Terbit</Th><Th center>Berlaku s/d</Th>
                          <Th center>Poin</Th><Th center>Status</Th><Th center>Aksi</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.id} className="border-b border-slate-50 hover:bg-blue-50/40">
                            <td className="px-3 py-2 font-bold text-slate-700 whitespace-nowrap">{r.nomor_surat || '—'}</td>
                            <td className="px-3 py-2">
                              <div className="font-bold">{r.nama}</div>
                              <div className="text-[10px] text-slate-500">{r.nrp} • {r.jabatan}</div>
                            </td>
                            <td className="px-3 py-2 text-center"><JenisBadge jenis={r.jenis} /></td>
                            <td className="px-3 py-2 max-w-[220px]">
                              <div className="truncate">{r.pelanggaran || '—'}</div>
                              <div className="text-[10px] text-slate-500 truncate">{r.uraian || ''}</div>
                            </td>
                            <td className="px-3 py-2 text-center whitespace-nowrap">{fmtTgl(r.tanggal_terbit)}</td>
                            <td className="px-3 py-2 text-center whitespace-nowrap text-slate-600">{fmtTgl(r.tanggal_berakhir)}</td>
                            <td className="px-3 py-2 text-center font-black text-rose-600">-{r.poin}</td>
                            <td className="px-3 py-2 text-center"><StatusBadge s={r.status} arsip={r.hr_arsip} /></td>
                            <td className="px-3 py-2 text-center">
                              <button onClick={() => setDetail(r)}
                                className="px-2.5 py-1 bg-[#003D79] text-white rounded-lg text-[10px] font-bold hover:bg-[#002c58]">
                                Lihat
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="lg:hidden divide-y divide-slate-100">
                    {rows.map((r) => (
                      <div key={r.id} className="p-3" onClick={() => setDetail(r)}>
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate">{r.nama}</div>
                            <div className="text-[10px] text-slate-500">{r.nrp} • {r.jabatan}</div>
                          </div>
                          <StatusBadge s={r.status} arsip={r.hr_arsip} />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          <JenisBadge jenis={r.jenis} />
                          <span className="text-rose-600 font-black">-{r.poin} poin</span>
                          <span className="text-slate-500">{fmtTgl(r.tanggal_terbit)}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 truncate">{r.pelanggaran || r.uraian || '—'}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <FormBaru
            poinList={poinList}
            bawahan={bawahan}
            onSaved={() => { setTab('daftar'); load() }}
          />
        )}
      </div>

      {detail && (
        <DetailModal
          row={detail}
          peran={peran}
          onClose={() => setDetail(null)}
          onDone={() => { setDetail(null); load() }}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
function FormBaru({ poinList, bawahan, onSaved }: any) {
  const [cari, setCari] = useState('')
  const [nrp, setNrp] = useState('')
  const [jenis, setJenis] = useState('CNC')
  const [f, setF] = useState<any>({
    pelanggaran: '', uraian: '', dasar_aturan: '', tanggal_kejadian: '',
    masa_berlaku_hari: 180, sanksi_ke: '',
    hari: '', waktu_pertemuan: '', tempat: '',
    materi_pribadi: false, materi_keluarga: false, materi_pekerjaan: false,
    solusi: '', komitmen: '',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const list = useMemo(() => {
    const q = cari.toLowerCase()
    return (bawahan || []).filter((b: Bawahan) =>
      !q || b.nama.toLowerCase().includes(q) || String(b.nrp).includes(q))
  }, [bawahan, cari])

  const orang = (bawahan || []).find((b: Bawahan) => String(b.nrp) === String(nrp))
  const poin = poinList.find((p: Poin) => p.jenis === jenis)?.poin ?? 0

  async function simpan() {
    if (!nrp) { setMsg('❌ Pilih karyawan dulu'); return }
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/punishment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jenis, nrp, ...f, masa_berlaku_hari: Number(f.masa_berlaku_hari) || 180 }),
      })
      const j = await res.json()
      if (res.ok) { setMsg('✅ ' + j.message); onSaved() }
      else setMsg('❌ ' + (j.error || 'Gagal menyimpan'))
    } catch (e: any) { setMsg('❌ ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      {msg && <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 text-xs font-bold">{msg}</div>}

      {(bawahan || []).length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3 text-xs font-bold">
          ⚠️ Belum ada karyawan aktif yang bisa dipilih untuk akun Anda. Pastikan data karyawan di site Anda sudah <b>Aktif</b> dan kolom atasan/pjo sudah terisi.
        </div>
      )}

      {/* PILIH KARYAWAN */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">1. Pilih karyawan <span className="text-slate-300">({(bawahan || []).length} orang)</span></p>
        <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="🔍 Cari nama / NRP karyawan..."
          className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold mb-2 outline-none focus:border-[#003D79]" />
        <div className="max-h-52 overflow-y-auto divide-y divide-slate-50 border border-slate-100 rounded-xl">
          {list.length === 0 ? (
            <p className="p-3 text-[11px] text-slate-400">Tidak ada karyawan cocok.</p>
          ) : list.map((b: Bawahan) => (
            <button key={b.nrp} onClick={() => setNrp(String(b.nrp))}
              className={`w-full text-left px-3 py-2 hover:bg-blue-50 ${String(nrp) === String(b.nrp) ? 'bg-blue-50' : ''}`}>
              <div className="font-bold text-xs">{b.nama}</div>
              <div className="text-[10px] text-slate-500">{b.nrp} • {b.jabatan} • {b.departemen}{b.site ? ' • ' + b.site : ''}</div>
              {(b as any).langsung && <span className="text-[9px] font-black text-emerald-600">BAWAHAN LANGSUNG</span>}
            </button>
          ))}
        </div>
        {orang && <p className="mt-2 text-[11px] font-bold text-emerald-700">✓ Dipilih: {orang.nama} ({orang.nrp})</p>}
      </div>

      {/* JENIS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">2. Jenis punishment</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {(poinList || []).map((p: Poin) => (
            <button key={p.jenis} onClick={() => setJenis(p.jenis)}
              className={`rounded-xl border p-2 text-center transition-all ${
                jenis === p.jenis ? 'bg-[#003D79] text-white border-[#003D79]' : 'bg-white border-slate-200 text-slate-600'
              }`}>
              <div className="text-[11px] font-black">{p.jenis}</div>
              <div className="text-[9px] opacity-80 leading-tight">{p.label}</div>
              <div className="text-[10px] font-bold mt-1">-{p.poin} poin</div>
            </button>
          ))}
        </div>
      </div>

      {/* ISI */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">3. Isi surat</p>

        <Field label="Jenis pelanggaran">
          <input value={f.pelanggaran} onChange={(e) => setF({ ...f, pelanggaran: e.target.value })}
            placeholder="Contoh: Aturan Pelanggaran Prosedur"
            className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold outline-none focus:border-[#003D79]" />
        </Field>

        <Field label={jenis === 'CNC' ? 'Uraian permasalahan' : 'Uraian pelanggaran'}>
          <textarea value={f.uraian} onChange={(e) => setF({ ...f, uraian: e.target.value })} rows={3}
            placeholder="Mengoperasikan alat tidak sesuai dengan kemampuan / kapasitas bucket"
            className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold outline-none focus:border-[#003D79]" />
        </Field>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Field label="Tanggal kejadian">
            <input type="date" value={f.tanggal_kejadian} onChange={(e) => setF({ ...f, tanggal_kejadian: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold outline-none focus:border-[#003D79]" />
          </Field>
          <Field label="Masa berlaku (hari)">
            <input type="number" value={f.masa_berlaku_hari} onChange={(e) => setF({ ...f, masa_berlaku_hari: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold outline-none focus:border-[#003D79]" />
          </Field>
          <Field label="Sanksi ke-">
            <input type="number" value={f.sanksi_ke} onChange={(e) => setF({ ...f, sanksi_ke: e.target.value })} placeholder="1" className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold outline-none focus:border-[#003D79]" />
          </Field>
          <Field label="Dasar aturan">
            <input value={f.dasar_aturan} onChange={(e) => setF({ ...f, dasar_aturan: e.target.value })}
              placeholder="Pasal / SK / SOP" className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold outline-none focus:border-[#003D79]" />
          </Field>
        </div>

        {jenis === 'CNC' && (
          <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">Isian khusus CNC</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Field label="Hari">
                <input value={f.hari} onChange={(e) => setF({ ...f, hari: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold outline-none focus:border-[#003D79]" />
              </Field>
              <Field label="Tanggal / waktu pertemuan">
                <input value={f.waktu_pertemuan} onChange={(e) => setF({ ...f, waktu_pertemuan: e.target.value })} placeholder="10:00" className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold outline-none focus:border-[#003D79]" />
              </Field>
              <Field label="Tempat">
                <input value={f.tempat} onChange={(e) => setF({ ...f, tempat: e.target.value })} className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold outline-none focus:border-[#003D79]" />
              </Field>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Materi</p>
              <div className="flex gap-3 flex-wrap">
                {[['materi_pribadi', 'Pribadi'], ['materi_keluarga', 'Keluarga'], ['materi_pekerjaan', 'Pekerjaan']].map(([k, l]) => (
                  <label key={k} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                    <input type="checkbox" checked={!!f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} />{l}
                  </label>
                ))}
              </div>
            </div>
            <Field label="Solusi perbaikan">
              <textarea value={f.solusi} onChange={(e) => setF({ ...f, solusi: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold outline-none focus:border-[#003D79]" />
            </Field>
            <Field label="Komitmen / kesepakatan">
              <textarea value={f.komitmen} onChange={(e) => setF({ ...f, komitmen: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold outline-none focus:border-[#003D79]" />
            </Field>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] text-slate-500 font-semibold">
            Poin potong KPI: <span className="text-rose-600 font-black">-{poin}</span> • Status awal: menunggu PJO
          </p>
          <button onClick={simpan} disabled={saving || !nrp}
            className="px-5 py-3 bg-[#003D79] text-white rounded-xl text-[11px] font-black uppercase tracking-wider disabled:opacity-50">
            {saving ? '⏳ Menyimpan...' : '💾 Kirim ke PJO'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
function DetailModal({ row, peran, onClose, onDone }: any) {
  const [catatan, setCatatan] = useState('')
  const [proses, setProses] = useState(false)
  const [msg, setMsg] = useState('')

  async function aksi(action: string) {
    setProses(true); setMsg('')
    try {
      const res = await fetch('/api/punishment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, action, catatan }),
      })
      const j = await res.json()
      if (res.ok) onDone()
      else setMsg('❌ ' + (j.error || 'Gagal'))
    } catch (e: any) { setMsg('❌ ' + e.message) }
    finally { setProses(false) }
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div className="fixed inset-x-3 top-1/2 -translate-y-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-xl bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden max-h-[90vh] overflow-y-auto">

        <div className="p-5 bg-gradient-to-br from-[#003D79] to-[#0056b3] text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-emerald-300 text-[10px] font-black uppercase tracking-[0.25em]">{row.nomor_surat || 'Punishment'}</p>
              <h2 className="font-black text-lg truncate">{row.nama}</h2>
              <p className="text-blue-200/80 text-[11px]">{row.nrp} • {row.jabatan} • {row.site}</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 font-bold">✕</button>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <JenisBadge jenis={row.jenis} dark />
            <StatusBadge s={row.status} arsip={row.hr_arsip} />
            <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold">-{row.poin} poin KPI</span>
          </div>
        </div>

        {msg && <div className="px-5 py-2 bg-rose-50 text-rose-700 text-[11px] font-bold">{msg}</div>}

        <div className="p-5 space-y-3 text-xs">
          <Info label="Pelanggaran" value={row.pelanggaran} />
          <Info label="Uraian" value={row.uraian} />
          <Info label="Dasar aturan" value={row.dasar_aturan} />
          <div className="grid grid-cols-3 gap-2">
            <Box label="Terbit" value={fmtTgl(row.tanggal_terbit)} />
            <Box label="Berlaku s/d" value={fmtTgl(row.tanggal_berakhir)} />
            <Box label="Masa" value={`${row.masa_berlaku_hari} hari`} />
          </div>

          {row.jenis === 'CNC' && (
            <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3 space-y-2">
              <Info label="Pertemuan" value={[row.hari, row.waktu_pertemuan, row.tempat].filter(Boolean).join(' • ')} />
              <Info label="Materi" value={[
                row.materi_pribadi && 'Pribadi', row.materi_keluarga && 'Keluarga', row.materi_pekerjaan && 'Pekerjaan',
              ].filter(Boolean).join(' • ')} />
              <Info label="Solusi perbaikan" value={row.solusi} />
              <Info label="Komitmen" value={row.komitmen} />
            </div>
          )}

          <Info label="Dibuat oleh" value={`${row.dibuat_oleh_nama || '-'}${row.pjo_nama ? ' • disetujui PJO: ' + row.pjo_nama : ''}`} />
          {row.pjo_catatan && <Info label="Catatan PJO" value={row.pjo_catatan} />}
          {row.hr_catatan && <Info label="Catatan HR" value={row.hr_catatan} />}

          <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2}
            placeholder="Catatan (opsional untuk persetujuan / penolakan)"
            className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold outline-none focus:border-[#003D79]" />
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-2 flex-wrap">
          <button onClick={() => cetak(row)} className="px-3 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider">
            🖨️ Cetak
          </button>
          {row.status === 'MENUNGGU_PJO' && peran.isPJO && (
            <>
              <button onClick={() => aksi('approve')} disabled={proses}
                className="flex-1 px-3 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-50">
                ✅ Setujui & Terbitkan
              </button>
              <button onClick={() => aksi('reject')} disabled={proses}
                className="px-3 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-50">
                ❌ Tolak
              </button>
            </>
          )}
          {row.status === 'TERBIT' && peran.isHR && !row.hr_arsip && (
            <button onClick={() => aksi('arsip')} disabled={proses}
              className="flex-1 px-3 py-2.5 bg-[#003D79] text-white rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-50">
              🗄️ Arsipkan (HR)
            </button>
          )}
          {row.status === 'MENUNGGU_PJO' && (
            <button onClick={() => aksi('batal')} disabled={proses}
              className="px-3 py-2.5 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-50">
              Batalkan
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
function cetak(row: any) {
  const isCNC = row.jenis === 'CNC'
  const ttd = `
    <table style="width:100%;margin-top:40px;text-align:center;font-size:12px">
      <tr>
        <td>Dibuat Oleh,<br/><br/><br/><br/><u>${row.dibuat_oleh_nama || ''}</u><br/>${row.dibuat_oleh_jabatan || 'Leader'}</td>
        <td>Diterima Oleh,<br/><br/><br/><br/><u>${row.nama || ''}</u><br/>Karyawan</td>
        <td>Disetujui Oleh,<br/><br/><br/><br/><u>${row.pjo_nama || '................................'}</u><br/>PJO</td>
      </tr>
    </table>`

  const html = `
  <html><head><title>${row.jenis} - ${row.nama}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;padding:32px}
    h1{font-size:16px;text-align:center;margin:0 0 2px}
    h2{font-size:13px;text-align:center;margin:0 0 18px;font-weight:normal}
    table.data{width:100%;border-collapse:collapse;margin-top:10px}
    table.data td,table.data th{border:1px solid #555;padding:6px 8px;vertical-align:top}
    .lbl{width:140px;font-weight:bold}
    .box{border:1px solid #555;padding:8px;min-height:60px;white-space:pre-wrap}
  </style></head><body>
    <h1>PT BOSTON TRIKORA MAHARDIKA</h1>
    <h2>${isCNC ? 'COACHING &amp; COUNSELLING' : 'SURAT PERINGATAN ' + (row.jenis === 'SK' ? 'SURAT KOMITMEN' : row.jenis.slice(2))}</h2>
    ${row.nomor_surat ? `<p style="text-align:center">${row.nomor_surat}</p>` : ''}
    <table class="data">
      <tr><td class="lbl">Nama</td><td>${row.nama || ''}</td><td class="lbl">Jabatan</td><td>${row.jabatan || ''}</td></tr>
      <tr><td class="lbl">NRP</td><td>${row.nrp || ''}</td><td class="lbl">Departemen</td><td>${row.departemen || ''}</td></tr>
      <tr><td class="lbl">Tanggal</td><td>${fmtTgl(row.tanggal_terbit)}</td><td class="lbl">Berlaku s/d</td><td>${fmtTgl(row.tanggal_berakhir)}</td></tr>
      ${isCNC ? `<tr><td class="lbl">Hari / Waktu</td><td>${row.hari || ''} ${row.waktu_pertemuan || ''}</td><td class="lbl">Tempat</td><td>${row.tempat || ''}</td></tr>
      <tr><td class="lbl">Materi</td><td colspan="3">${[row.materi_pribadi && 'Pribadi', row.materi_keluarga && 'Keluarga', row.materi_pekerjaan && 'Pekerjaan'].filter(Boolean).join(' • ')}</td></tr>` : ''}
    </table>

    <p style="margin-top:16px"><b>${isCNC ? 'Uraian Permasalahan' : 'Uraian Pelanggaran'}</b></p>
    <div class="box">${row.uraian || ''}</div>

    ${row.dasar_aturan ? `<p><b>Dasar Aturan</b></p><div class="box">${row.dasar_aturan}</div>` : ''}
    ${isCNC ? `<p><b>Solusi Perbaikan</b></p><div class="box">${row.solusi || ''}</div>
               <p><b>Komitmen / Kesepakatan</b></p><div class="box">${row.komitmen || ''}</div>` : ''}

    ${ttd}
  </body></html>`

  const w = window.open('', '_blank')
  if (!w) return alert('Popup diblokir browser. Izinkan popup untuk mencetak.')
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}

function Info({ label, value }: any) {
  if (!value) return null
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-xs font-semibold text-slate-700 whitespace-pre-wrap">{value}</p>
    </div>
  )
}

function Box({ label, value }: any) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5">
      <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-[11px] font-bold text-slate-700">{value}</p>
    </div>
  )
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Stat({ color, label, value, sub }: any) {
  const map: any = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    green: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    red: 'bg-rose-50 border-rose-100 text-rose-700',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
  }
  return (
    <div className={`rounded-2xl border p-2.5 ${map[color] || map.blue}`}>
      <p className="text-[8px] font-black uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-xl font-black leading-tight">{value}</p>
      <p className="text-[8px] font-bold uppercase opacity-60">{sub}</p>
    </div>
  )
}

function JenisBadge({ jenis, dark }: { jenis: string; dark?: boolean }) {
  const map: any = {
    CNC: 'bg-sky-50 text-sky-700 border-sky-200',
    SK: 'bg-amber-50 text-amber-700 border-amber-200',
    SP1: 'bg-orange-50 text-orange-700 border-orange-200',
    SP2: 'bg-rose-50 text-rose-700 border-rose-200',
    SP3: 'bg-red-100 text-red-800 border-red-300',
  }
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-full border text-[10px] font-black ${
      dark ? 'bg-white/15 text-white border-white/30' : (map[jenis] || 'bg-slate-50 text-slate-600 border-slate-200')
    }`}>
      {jenis === 'SK' ? 'KOMITMEN' : jenis}
    </span>
  )
}

function StatusBadge({ s, arsip }: { s: string; arsip?: boolean }) {
  const map: any = {
    MENUNGGU_PJO: ['bg-amber-50 text-amber-700 border-amber-200', '⏳ Menunggu PJO'],
    TERBIT: ['bg-emerald-50 text-emerald-700 border-emerald-200', '✅ Terbit'],
    DITOLAK: ['bg-rose-50 text-rose-700 border-rose-200', '❌ Ditolak'],
    DIBATALKAN: ['bg-slate-100 text-slate-500 border-slate-200', '🚫 Dibatalkan'],
  }
  const [cls, lbl] = map[s] || map.MENUNGGU_PJO
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${cls}`}>
      {lbl}{arsip ? ' • arsip' : ''}
    </span>
  )
}

function Th({ children, center }: any) {
  return <th className={`px-3 py-2 font-black text-slate-600 uppercase tracking-wide ${center ? 'text-center' : 'text-left'}`}>{children}</th>
}

function fmtTgl(iso: string) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return iso }
}
