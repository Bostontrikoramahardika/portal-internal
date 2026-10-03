'use client'


import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import StatBanner from '@/app/components/std/StatBanner'
interface Unit {
  id: string
  kode_unit: string
  nama_unit: string
  kategori: string
  merk_model: string | null
  site: string
  status: 'RFU' | 'BD'
  keterangan_status: string | null
  is_spare: boolean
  active: boolean
  urutan: number
}

interface Stats {
  total: number
  totalRFU: number
  totalBD: number
  totalSpare: number
  totalKategori: number
}

function KelolaUnitContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const siteParam = searchParams.get('site') || ''

  const [site, setSite] = useState(siteParam)
  const [siteList, setSiteList] = useState<string[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [grouped, setGrouped] = useState<Record<string, Unit[]>>({})
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [filterKategori, setFilterKategori] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editUnit, setEditUnit] = useState<Unit | null>(null)
  const [form, setForm] = useState({
    kode_unit: '',
    nama_unit: '',
    kategori: '',
    merk_model: '',
    status: 'RFU' as 'RFU' | 'BD',
    keterangan_status: '',
    is_spare: false,
    urutan: 0
  })
  const [saving, setSaving] = useState(false)

  // Load site list
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('btm_session_token_v1') || ''
        const res = await fetch('/api/employees/sites', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        const d = await res.json()
        if (d.ok) {
          setSiteList(d.data || [])
          if (!site && d.data?.length > 0) setSite(d.data[0])
        }
      } catch {}
    })()
  }, [])

  // Load units when site/filter changes
  useEffect(() => {
    if (site) loadUnits()
  }, [site, filterKategori, filterStatus])

  async function loadUnits() {
    setLoading(true)
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const params = new URLSearchParams()
      params.set('site', site)
      if (filterKategori) params.set('kategori', filterKategori)
      if (filterStatus) params.set('status', filterStatus)

      const res = await fetch(`/api/units?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const d = await res.json()
      if (d.ok) {
        setUnits(d.data || [])
        setGrouped(d.grouped || {})
        setStats(d.stats || null)
      }
    } catch (err: any) {
      alert('Gagal load: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setEditUnit(null)
    setForm({
      kode_unit: '',
      nama_unit: '',
      kategori: '',
      merk_model: '',
      status: 'RFU',
      keterangan_status: '',
      is_spare: false,
      urutan: 0
    })
    setShowModal(true)
  }

  function openEditModal(u: Unit) {
    setEditUnit(u)
    setForm({
      kode_unit: u.kode_unit,
      nama_unit: u.nama_unit || '',
      kategori: u.kategori,
      merk_model: u.merk_model || '',
      status: u.status,
      keterangan_status: u.keterangan_status || '',
      is_spare: u.is_spare,
      urutan: u.urutan
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.kode_unit || !form.kategori) {
      alert('Kode unit dan kategori wajib diisi')
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const body: any = {
        ...(editUnit ? { id: editUnit.id } : { kode_unit: form.kode_unit, site }),
        nama_unit: form.nama_unit,
        kategori: form.kategori,
        merk_model: form.merk_model || null,
        status: form.status,
        keterangan_status: form.keterangan_status || null,
        is_spare: form.is_spare,
        urutan: form.urutan
      }

      const res = await fetch('/api/units', {
        method: editUnit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      })
      const json = await res.json()
      if (!res.ok) { alert('Gagal: ' + json.error); return }

      alert(json.message)
      setShowModal(false)
      loadUnits()
    } catch (err: any) {
      alert('Gagal: ' + err.message)
    } finally { setSaving(false) }
  }

  async function handleToggleStatus(u: Unit) {
    const newStatus = u.status === 'RFU' ? 'BD' : 'RFU'
    let keterangan = ''
    if (newStatus === 'BD') {
      keterangan = prompt(`Set ${u.kode_unit} jadi BREAKDOWN.\nKeterangan (opsional):`, '') || ''
    }

    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const res = await fetch('/api/units', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          id: u.id,
          status: newStatus,
          keterangan_status: newStatus === 'BD' ? keterangan : null
        })
      })
      const json = await res.json()
      if (!res.ok) { alert('Gagal: ' + json.error); return }
      loadUnits()
    } catch (err: any) {
      alert('Gagal: ' + err.message)
    }
  }

  async function handleDelete(u: Unit) {
    if (!confirm(`Hapus unit ${u.kode_unit}?\n(soft delete - bisa diaktifkan lagi nanti)`)) return

    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const res = await fetch(`/api/units?id=${u.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const json = await res.json()
      if (!res.ok) { alert('Gagal: ' + json.error); return }
      alert(json.message)
      loadUnits()
    } catch (err: any) {
      alert('Gagal: ' + err.message)
    }
  }

  const uniqueKategori = [...new Set(units.map(u => u.kategori))].sort()

  return (
    <div className="bg-[#f4f7fa] pb-24 text-slate-800">
      

      {/* HERO */}
      <div className="hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <button onClick={() => router.back()}
          className="mb-3 flex items-center gap-1.5 text-white/60 hover:text-white text-sm relative z-10">
          ← Kembali
        </button>
        <StatBanner eyebrow="Plant" title="Kelola Unit" subtitle="Master Data" />
      </div>

      <div className="px-4 space-y-4 relative z-10">
        {/* FILTER + STATS */}
        <div className="bg-white rounded-2xl shadow-xl p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] font-black uppercase text-[#5a6a7e] block mb-1">Site</label>
              <select value={site} onChange={e => setSite(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs bg-slate-50 font-bold">
                {siteList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-[#5a6a7e] block mb-1">Kategori</label>
              <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs bg-slate-50">
                <option value="">Semua</option>
                {uniqueKategori.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-[#5a6a7e] block mb-1">Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs bg-slate-50">
                <option value="">Semua</option>
                <option value="RFU">RFU</option>
                <option value="BD">BD</option>
              </select>
            </div>
          </div>

          {stats && (
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-blue-50 rounded-xl p-2 text-center">
                <p className="text-lg font-black text-blue-700">{stats.total}</p>
                <p className="text-[8px] font-black text-blue-500 uppercase">Total</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-2 text-center">
                <p className="text-lg font-black text-emerald-700">{stats.totalRFU}</p>
                <p className="text-[8px] font-black text-emerald-500 uppercase">RFU</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-2 text-center">
                <p className="text-lg font-black text-rose-700">{stats.totalBD}</p>
                <p className="text-[8px] font-black text-rose-500 uppercase">BD</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-2 text-center">
                <p className="text-lg font-black text-amber-700">{stats.totalSpare}</p>
                <p className="text-[8px] font-black text-[#003d79] uppercase">Spare</p>
              </div>
            </div>
          )}

          <button onClick={openAddModal}
            className="w-full bg-[#003D79] text-white py-2.5 rounded-xl font-black text-xs active:scale-95 shadow-lg">
            ➕ TAMBAH UNIT BARU
          </button>
        </div>

        {/* LIST UNIT PER KATEGORI */}
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center text-[#5a6a7e] text-xs">
            ⏳ Memuat unit...
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-[#5a6a7e] text-xs">
            📭 Belum ada unit
          </div>
        ) : (
          Object.entries(grouped).map(([kategori, unitList]) => (
            <div key={kategori} className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="p-3 bg-slate-50 border-b flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#5a6a7e]">
                    📦 {kategori}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    {unitList.length} unit
                    {unitList.filter(u => u.is_spare).length > 0 &&
                      ` · ${unitList.filter(u => u.is_spare).length} spare`}
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-50">
                {unitList.map(u => (
                  <div key={u.id} className="p-3 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-slate-800">{u.nama_unit || u.kode_unit}</span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${
                            u.status === 'RFU'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {u.status}
                          </span>
                          {u.is_spare && (
                            <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black uppercase">
                              SPARE
                            </span>
                          )}
                        </div>
                        {u.merk_model && (
                          <p className="text-[10px] text-slate-500 mt-0.5">🔧 {u.merk_model}</p>
                        )}
                        {u.keterangan_status && (
                          <p className="text-[10px] text-rose-600 italic mt-0.5">⚠️ {u.keterangan_status}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleToggleStatus(u)}
                          title={u.status === 'RFU' ? 'Set BD' : 'Set RFU'}
                          className={`text-[9px] px-2 py-1.5 rounded-lg font-black ${
                            u.status === 'RFU'
                              ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}>
                          {u.status === 'RFU' ? '🔧 BD' : '✅ RFU'}
                        </button>
                        <button onClick={() => openEditModal(u)}
                          className="text-[9px] bg-blue-100 text-blue-700 px-2 py-1.5 rounded-lg font-black hover:bg-blue-200">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(u)}
                          className="text-[9px] bg-slate-100 text-slate-700 px-2 py-1.5 rounded-lg font-black hover:bg-rose-100 hover:text-rose-700">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL ADD/EDIT */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-2">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-sm">
                {editUnit ? `✏️ Edit ${editUnit.kode_unit}` : '➕ Tambah Unit Baru'}
              </h3>
              <button onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-slate-800">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">
                  Kode Unit {!editUnit && '*'}
                </label>
                <input type="text" value={form.kode_unit} disabled={!!editUnit}
                  onChange={e => setForm({...form, kode_unit: e.target.value.toUpperCase()})}
                  placeholder="E226"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 disabled:opacity-60 uppercase" />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Nama Unit (Display)</label>
                <input type="text" value={form.nama_unit}
                  onChange={e => setForm({...form, nama_unit: e.target.value})}
                  placeholder="E 226 B"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50" />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Kategori *</label>
                <input type="text" value={form.kategori} list="kategori-list"
                  onChange={e => setForm({...form, kategori: e.target.value.toUpperCase()})}
                  placeholder="PC 200"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 uppercase" />
                <datalist id="kategori-list">
                  {uniqueKategori.map(k => <option key={k} value={k} />)}
                </datalist>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Merk / Model</label>
                <input type="text" value={form.merk_model}
                  onChange={e => setForm({...form, merk_model: e.target.value})}
                  placeholder="Komatsu PC-200"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Status</label>
                  <select value={form.status}
                    onChange={e => setForm({...form, status: e.target.value as any})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50">
                    <option value="RFU">✅ RFU (Ready)</option>
                    <option value="BD">🔧 BD (Breakdown)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Urutan</label>
                  <input type="number" value={form.urutan}
                    onChange={e => setForm({...form, urutan: parseInt(e.target.value) || 0})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50" />
                </div>
              </div>

              {form.status === 'BD' && (
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Keterangan BD</label>
                  <input type="text" value={form.keterangan_status}
                    onChange={e => setForm({...form, keterangan_status: e.target.value})}
                    placeholder="BD UC est. 30 juli"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50" />
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer bg-amber-50 p-2 rounded-lg">
                <input type="checkbox" checked={form.is_spare}
                  onChange={e => setForm({...form, is_spare: e.target.checked})}
                  className="w-4 h-4" />
                <span className="text-xs font-bold text-amber-800">🔄 Unit ini adalah SPARE (cadangan)</span>
              </label>
            </div>

            <div className="p-3 border-t bg-slate-50 flex gap-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-200 text-slate-700 py-2.5 rounded-lg font-black text-xs">Batal</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-[#003D79] text-white py-2.5 rounded-lg font-black text-xs disabled:opacity-50">
                {saving ? '⏳' : '💾 Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function KelolaUnitPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#5a6a7e] text-xs">⏳ Memuat...

      </div>}>
      <KelolaUnitContent />
    </Suspense>
  )
}