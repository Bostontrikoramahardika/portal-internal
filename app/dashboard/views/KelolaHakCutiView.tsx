'use client'

// ═══════════════════════════════════════════════════════════════════════════
// KelolaHakCutiView — TAB "SALDO & TIKET"
// v2.0 — tampilan disamakan dengan halaman Cuti Karyawan / Dashboard Cuti:
//        latar #f4f7fa, header biru #003D79, kartu rounded-2xl, tabel rapi.
// Logika (API /api/kelola-hak-cuti) TIDAK diubah.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'

export default function KelolaHakCutiView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [tahun, setTahun] = useState(new Date().getFullYear())
  const [editingBalance, setEditingBalance] = useState<any>(null)
  const [balanceForm, setBalanceForm] = useState({ hak_awal: 12, terpakai: 0, penyesuaian: 0 })
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSite, tahun])

  async function loadData() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSite) params.set('site', filterSite)
      if (search) params.set('search', search)
      params.set('tahun', String(tahun))

      const res = await fetch(`/api/kelola-hak-cuti?${params.toString()}`)
      const json = await res.json()
      if (res.ok) setData(json)
      else setMsg({ type: 'err', text: json.error })
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function toggleEligible(nrp: string, current: boolean) {
    if (!data?.can_edit) {
      alert('❌ Anda hanya bisa lihat (view only)')
      return
    }
    setSaving(nrp)
    try {
      const res = await fetch('/api/kelola-hak-cuti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_eligible', nrp, payload: { eligible: !current } })
      })
      const json = await res.json()
      if (res.ok) {
        setData((prev: any) => ({
          ...prev,
          rows: prev.rows.map((r: any) =>
            r.nrp === nrp ? { ...r, eligible_tiket_pesawat: !current } : r
          )
        }))
      } else {
        alert('❌ ' + json.error)
      }
    } finally {
      setSaving(null)
    }
  }

  function openEditBalance(row: any) {
    if (!data?.can_edit) {
      alert('❌ Anda hanya bisa lihat (view only)')
      return
    }
    setEditingBalance(row)
    setBalanceForm({ hak_awal: row.hak_awal, terpakai: row.terpakai, penyesuaian: row.penyesuaian })
    setMsg(null)
  }

  async function saveBalance() {
    if (!editingBalance) return
    setSaving(editingBalance.nrp)
    try {
      const res = await fetch('/api/kelola-hak-cuti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_balance',
          nrp: editingBalance.nrp,
          payload: {
            tahun,
            hak_awal: balanceForm.hak_awal,
            terpakai: balanceForm.terpakai,
            penyesuaian: balanceForm.penyesuaian
          }
        })
      })
      const json = await res.json()
      if (res.ok) {
        alert('✅ ' + json.message)
        setEditingBalance(null)
        loadData()
      } else {
        setMsg({ type: 'err', text: '❌ ' + json.error })
      }
    } finally {
      setSaving(null)
    }
  }

  const filteredRows = (data?.rows || []).filter((r: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (r.nama || '').toLowerCase().includes(q) || (r.nrp || '').toLowerCase().includes(q)
  })

  const stat = {
    total: filteredRows.length,
    tiket: filteredRows.filter((r: any) => r.eligible_tiket_pesawat).length,
    habis: filteredRows.filter((r: any) => Number(r.sisa) <= 0).length,
    menipis: filteredRows.filter((r: any) => Number(r.sisa) > 0 && Number(r.sisa) < 5).length,
  }

  return (
    <div className="bg-[#f4f7fa] pb-24 text-slate-800">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#003D79] to-[#0056b3] px-4 pt-6 pb-5 lg:px-6 lg:pt-8 lg:pb-7 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🎫</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">
              {data?.is_view_only ? 'HR HO • Read Only' : 'HR Site'}
            </p>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">Saldo & Tiket</h1>
            <p className="text-blue-200/80 text-xs font-medium">
              Saldo cuti tahunan & hak tiket pesawat karyawan
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 lg:px-6 lg:py-6 space-y-3">

        {/* ── FILTER ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="🔍 Cari nama / NRP..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:border-[#003D79]"
            />
            <select
              value={filterSite}
              onChange={e => setFilterSite(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold"
            >
              <option value="">🏢 Semua Site</option>
              {(data?.sites || []).map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={tahun}
              onChange={e => setTahun(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold"
            >
              {[0, -1, -2].map(o => {
                const y = new Date().getFullYear() + o
                return <option key={y} value={y}>📅 Tahun {y}</option>
              })}
            </select>
          </div>
        </div>

        {/* ── STAT ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <StatCard color="blue" label="Total Karyawan" value={stat.total} sub={`tahun ${tahun}`} icon="👥" />
          <StatCard color="indigo" label="Hak Tiket Aktif" value={stat.tiket} sub="berhak tiket" icon="✈️" />
          <StatCard color="amber" label="Sisa Menipis" value={stat.menipis} sub="kurang dari 5 hari" icon="⚠️" />
          <StatCard color="red" label="Saldo Habis" value={stat.habis} sub="sisa 0 hari" icon="⛔" />
        </div>

        {msg && (
          <div className={`rounded-2xl p-3 text-xs font-bold border ${
            msg.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {msg.text}
          </div>
        )}

        {/* ── TABEL ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-[11px] text-slate-600">
              Menampilkan <strong>{filteredRows.length}</strong> karyawan
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tahun {tahun}</p>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
              Memuat data...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm font-semibold">Karyawan tidak ditemukan</p>
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
                      <Th center>Hak Awal</Th>
                      <Th center>Terpakai</Th>
                      <Th center>Penyesuaian</Th>
                      <Th center>Sisa Cuti</Th>
                      <Th center>Hak Tiket</Th>
                      <Th center>Aksi</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row: any) => (
                      <tr key={row.nrp} className="border-b border-slate-50 hover:bg-blue-50/40">
                        <td className="px-3 py-2">
                          <div className="font-bold text-slate-800">{row.nama}</div>
                          <div className="text-[10px] text-slate-500">{row.nrp} • {row.jabatan}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{row.site}</td>
                        <td className="px-3 py-2 text-center font-bold text-slate-700">{row.hak_awal}</td>
                        <td className="px-3 py-2 text-center font-bold text-slate-700">{row.terpakai}</td>
                        <td className="px-3 py-2 text-center font-bold text-slate-500">
                          {Number(row.penyesuaian) > 0 ? `+${row.penyesuaian}` : row.penyesuaian}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${
                            row.sisa <= 0 ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : row.sisa < 5 ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {row.sisa} hari
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => toggleEligible(row.nrp, row.eligible_tiket_pesawat)}
                            disabled={saving === row.nrp || !data?.can_edit}
                            className={`px-2 py-1 rounded-lg border text-[10px] font-bold ${
                              row.eligible_tiket_pesawat
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                            } ${!data?.can_edit ? 'cursor-not-allowed opacity-60' : ''}`}
                          >
                            {row.eligible_tiket_pesawat ? '✈️ AKTIF' : 'NONAKTIF'}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => openEditBalance(row)}
                            disabled={!data?.can_edit}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                              data?.can_edit
                                ? 'bg-[#003D79] text-white hover:bg-[#002c58]'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            ✏️ Saldo
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* HP */}
              <div className="lg:hidden divide-y divide-slate-100">
                {filteredRows.map((row: any) => (
                  <div key={row.nrp} className="p-3">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{row.nama}</div>
                        <div className="text-[10px] text-slate-500">{row.nrp} • {row.jabatan}</div>
                        <div className="text-[10px] text-slate-500">🏢 {row.site}</div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${
                        row.sisa <= 0 ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : row.sisa < 5 ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        sisa {row.sisa} hari
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] mb-2">
                      <div>
                        <div className="text-slate-500 font-semibold">Hak awal</div>
                        <div className="font-bold">{row.hak_awal} hari</div>
                      </div>
                      <div>
                        <div className="text-slate-500 font-semibold">Terpakai</div>
                        <div className="font-bold">{row.terpakai} hari</div>
                      </div>
                      <div>
                        <div className="text-slate-500 font-semibold">Penyesuaian</div>
                        <div className="font-bold">{row.penyesuaian}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleEligible(row.nrp, row.eligible_tiket_pesawat)}
                        disabled={saving === row.nrp || !data?.can_edit}
                        className={`flex-1 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider ${
                          row.eligible_tiket_pesawat
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        {row.eligible_tiket_pesawat ? '✈️ Tiket Aktif' : 'Tiket Nonaktif'}
                      </button>
                      <button
                        onClick={() => openEditBalance(row)}
                        disabled={!data?.can_edit}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                          data?.can_edit ? 'bg-[#003D79] text-white' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        ✏️ Edit Saldo
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── MODAL EDIT SALDO ───────────────────────────────────────────── */}
      {editingBalance && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]" onClick={() => setEditingBalance(null)} />
          <div className="fixed inset-x-3 top-1/2 -translate-y-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-md bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden max-h-[90vh] overflow-y-auto">

            <div className="p-5 bg-gradient-to-br from-[#003D79] to-[#0056b3] text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-emerald-300 text-[10px] font-black uppercase tracking-[0.25em]">
                    Edit Saldo Cuti {tahun}
                  </p>
                  <h2 className="font-black text-lg truncate">{editingBalance.nama}</h2>
                  <p className="text-blue-200/80 text-[11px]">
                    {editingBalance.nrp} • {editingBalance.jabatan}
                  </p>
                </div>
                <button onClick={() => setEditingBalance(null)}
                  className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 font-bold">✕</button>
              </div>
            </div>

            {msg && (
              <div className={`px-5 py-2.5 border-b text-[11px] font-bold ${
                msg.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                  : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}>
                {msg.text}
              </div>
            )}

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Hak Awal (default 12)
                </label>
                <input type="number" min={0} value={balanceForm.hak_awal}
                  onChange={e => setBalanceForm({ ...balanceForm, hak_awal: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold outline-none focus:border-[#003D79]" />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Terpakai (otomatis dari cuti disetujui)
                </label>
                <input type="number" min={0} value={balanceForm.terpakai}
                  onChange={e => setBalanceForm({ ...balanceForm, terpakai: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold outline-none focus:border-[#003D79]" />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Penyesuaian (boleh minus / plus)
                </label>
                <input type="number" value={balanceForm.penyesuaian}
                  onChange={e => setBalanceForm({ ...balanceForm, penyesuaian: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold outline-none focus:border-[#003D79]" />
                <p className="text-[10px] text-slate-400 mt-1">💡 Contoh: bonus cuti +2, atau potong cuti -1</p>
              </div>

              <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-blue-500">Preview sisa</span>
                <span className="text-lg font-black text-blue-700">
                  {Math.max(0, balanceForm.hak_awal + balanceForm.penyesuaian - balanceForm.terpakai)} hari
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button onClick={() => setEditingBalance(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-wider">
                Batal
              </button>
              <button onClick={saveBalance} disabled={saving === editingBalance.nrp}
                className="flex-[2] py-3 bg-[#003D79] text-white rounded-xl text-[11px] font-black uppercase tracking-wider disabled:opacity-50">
                {saving === editingBalance.nrp ? '⏳ Menyimpan...' : '💾 Simpan'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
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

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th className={`px-3 py-2 font-black text-slate-600 uppercase tracking-wide ${center ? 'text-center' : 'text-left'}`}>
      {children}
    </th>
  )
}
