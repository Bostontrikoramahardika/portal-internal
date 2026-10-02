'use client'

// KelolaHakCutiView dipisah dari app/dashboard/page.tsx (v1.8)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import { useState, useEffect, useRef } from 'react'

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
        body: JSON.stringify({
          action: 'toggle_eligible',
          nrp,
          payload: { eligible: !current }
        })
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
    setBalanceForm({
      hak_awal: row.hak_awal,
      terpakai: row.terpakai,
      penyesuaian: row.penyesuaian
    })
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
        alert(' ' + json.message)
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

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat data...
    </div>
  )
  return (
    <div className="animate-in fade-in duration-500 pb-32 space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-3 lg:p-6 rounded-2xl lg:rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">🎫</div>
            <div>
              <p className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">
                {data?.is_view_only ? 'HR HO Read-Only' : 'HR Site'}
              </p>
              <h1 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black tracking-tight">Hak Tiket & Saldo Cuti</h1>
            </div>
          </div>
          <p className="text-blue-200/70 text-xs font-medium">
            Kelola hak tiket pesawat & saldo cuti tahunan karyawan
          </p>
        </div>
      </div>

      {/* FILTER */}
      <div className="bg-white p-4 rounded-[2rem] border-2 border-slate-50 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="🔍 Cari nama / NRP..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-sm focus:border-[#003D79] focus:bg-white transition-all"
        />
        <select
          value={filterSite}
          onChange={e => setFilterSite(e.target.value)}
          className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-sm focus:border-[#003D79]"
        >
          <option value="">Semua Site</option>
          {(data?.sites || []).map((s: string) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={tahun}
          onChange={e => setTahun(Number(e.target.value))}
          className="p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-sm focus:border-[#003D79]"
        >
          {[0, -1, -2].map(o => {
            const y = new Date().getFullYear() + o
            return <option key={y} value={y}>Tahun {y}</option>
          })}
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-lg overflow-hidden">
        <div className="p-5 bg-slate-50/50 border-b-2 border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-black text-slate-900 text-base tracking-tight">Daftar Karyawan</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {filteredRows.length} karyawan • Tahun {tahun}
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
          {filteredRows.length === 0 ? (
            <div className="p-16 text-center text-slate-300 font-bold italic">Karyawan tidak ditemukan</div>
          ) : (
            filteredRows.map((row: any) => (
              <div key={row.nrp} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-500">
                    {(row.nama || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-slate-900 truncate">{row.nama}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                      {row.nrp} • {row.jabatan} • {row.site}
                    </p>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
                      {/* Toggle Tiket */}
                      <button
                        onClick={() => toggleEligible(row.nrp, row.eligible_tiket_pesawat)}
                        disabled={saving === row.nrp || !data?.can_edit}
                        className={`p-3 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                          row.eligible_tiket_pesawat
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-slate-50 border-slate-100 text-slate-400'
                        } ${!data?.can_edit ? 'cursor-not-allowed opacity-70' : ''}`}
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest">✈️ Hak Tiket</p>
                        <p className="text-sm font-black mt-1">
                          {row.eligible_tiket_pesawat ? 'AKTIF' : 'NONAKTIF'}
                        </p>
                      </button>

                      {/* Sisa */}
                      <div className={`p-3 rounded-2xl border-2 ${
                        row.sisa <= 0 ? 'bg-rose-50 border-rose-200' :
                        row.sisa < 5 ? 'bg-amber-50 border-amber-200' :
                        'bg-emerald-50 border-emerald-200'
                      }`}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Sisa Cuti</p>
                        <p className={`text-sm font-black mt-1 ${
                          row.sisa <= 0 ? 'text-rose-700' :
                          row.sisa < 5 ? 'text-amber-700' :
                          'text-emerald-700'
                        }`}>
                          {row.sisa} hari
                        </p>
                      </div>

                      {/* Terpakai */}
                      <div className="p-3 rounded-2xl border-2 bg-slate-50 border-slate-100">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Terpakai</p>
                        <p className="text-sm font-black mt-1 text-slate-700">{row.terpakai} hari</p>
                      </div>

                      {/* Tombol Edit */}
                      <button
                        onClick={() => openEditBalance(row)}
                        disabled={!data?.can_edit}
                        className={`p-3 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                          data?.can_edit
                            ? 'bg-[#003D79] text-white border-[#003D79] hover:bg-blue-700'
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        ✏️ EDIT<br />SALDO
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL EDIT SALDO */}
      {editingBalance && (
        <>
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100]" onClick={() => setEditingBalance(null)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-md bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden">
            <div className="p-6 bg-gradient-to-br from-slate-900 to-[#003D79] text-white">
              <div className="flex items-center gap-2 lg:gap-4">
                <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-2xl">
                  
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-widest">Edit Saldo Cuti {tahun}</p>
                  <h2 className="font-black text-lg tracking-tight truncate">{editingBalance.nama}</h2>
                </div>
                <button onClick={() => setEditingBalance(null)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">✕</button>
              </div>
            </div>

            {msg && (
              <div className={`px-6 py-3 border-b-2 ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                <p className="text-[11px] font-black uppercase tracking-widest">{msg.text}</p>
              </div>
            )}

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                  Hak Awal (default 12)
                </label>
                <input
                  type="number"
                  min={0}
                  value={balanceForm.hak_awal}
                  onChange={e => setBalanceForm({ ...balanceForm, hak_awal: Number(e.target.value) })}
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-[#003D79] focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                  Terpakai (otomatis dari cuti disetujui)
                </label>
                <input
                  type="number"
                  min={0}
                  value={balanceForm.terpakai}
                  onChange={e => setBalanceForm({ ...balanceForm, terpakai: Number(e.target.value) })}
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-[#003D79] focus:bg-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                  Penyesuaian (bisa negatif atau positif)
                </label>
                <input
                  type="number"
                  value={balanceForm.penyesuaian}
                  onChange={e => setBalanceForm({ ...balanceForm, penyesuaian: Number(e.target.value) })}
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-[#003D79] focus:bg-white outline-none"
                />
                <p className="text-[10px] font-bold text-slate-400 mt-2">
                  💡 Contoh: bonus cuti +2, atau potong cuti -1
                </p>
              </div>

              <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Preview Sisa</p>
                <p className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black text-blue-700">
                  {Math.max(0, balanceForm.hak_awal + balanceForm.penyesuaian - balanceForm.terpakai)} hari
                </p>
                <p className="text-[10px] font-bold text-blue-400 mt-1">
                  = {balanceForm.hak_awal} + ({balanceForm.penyesuaian}) - {balanceForm.terpakai}
                </p>
              </div>
            </div>

            <div className="p-4 bg-white border-t-2 border-slate-100 flex gap-3">
              <button
                onClick={() => setEditingBalance(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                onClick={saveBalance}
                disabled={saving === editingBalance.nrp}
                className="flex-[2] py-4 bg-[#003D79] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all"
              >
                {saving === editingBalance.nrp ? '⏳ MENYIMPAN...' : '💾 SIMPAN'}
              </button>
            </div>
          </div>
        </>
        )}
    </div>
  )
}
