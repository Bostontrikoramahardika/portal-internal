'use client'

// SitesManagerView dipisah dari app/dashboard/page.tsx (v1.8)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import { useState, useEffect, useRef } from 'react'
import { FieldInput, ToggleField } from './_fields'

export default function SitesManagerView() {
  const [sites, setSites] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSite, setEditingSite] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState<{ type: string, text: string } | null>(null)
  const [roleTemplates, setRoleTemplates] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [applyingTemplate, setApplyingTemplate] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [pjoSearch, setPjoSearch] = useState('')
  const [deputySearch, setDeputySearch] = useState('')

  useEffect(() => {
    loadData()
    loadRoleTemplates()
  }, [])

  async function loadRoleTemplates() {
    try {
      const res = await fetch('/api/role-templates')
      const json = await res.json()
      if (res.ok) setRoleTemplates(json.data || [])
    } catch (err) {
      console.error('Load templates error:', err)
    }
  }

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/sites-manager')
      const json = await res.json()
      if (res.ok) {
        setSites(json.sites || [])
        setEmployees(json.employees || [])
      }
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  function openEditModal(site: any) {
    setEditingSite(site)
    setFormData({
      nama_site: site.nama_site || '',
      kode_site: site.kode_site || '',
      alamat: site.alamat || '',
      siang_jam_masuk: (site.siang_jam_masuk || '').slice(0, 5),
      siang_jam_pulang: (site.siang_jam_pulang || '').slice(0, 5),
      siang_batas_telat: site.siang_batas_telat || 15,
      malam_jam_masuk: (site.malam_jam_masuk || '').slice(0, 5),
      malam_jam_pulang: (site.malam_jam_pulang || '').slice(0, 5),
      malam_batas_telat: site.malam_batas_telat || 15,
      latitude: site.latitude || '',
      longitude: site.longitude || '',
      radius_meter: site.radius_meter || 500,
      minus_terlambat: site.minus_terlambat || 1,
      minus_mangkir: site.minus_mangkir || 5,
      minus_sp1: site.minus_sp1 || 15,
      minus_sp2: site.minus_sp2 || 30,
      minus_sp3: site.minus_sp3 || 50,
      minus_cnc: site.minus_cnc || 5,
      active: site.active,
      is_active: site.is_active,
      is_pusat: site.is_pusat,
      pjo_nrp: site.pjo_nrp || '',
      deputy_pjo_nrp: site.deputy_pjo_nrp || '',
    })
    setPjoSearch('')
    setDeputySearch('')
    setMsg(null)
  }

    async function handleDelete() {
    if (!editingSite) return

    // Konfirmasi 2x karena ini permanen
    const confirm1 = confirm(
      ` HAPUS SITE PERMANEN\n\n` +
      `Site: ${editingSite.nama_site}\n\n` +
      `Tindakan ini TIDAK BISA dibatalkan!\n` +
      `Lanjutkan?`
    )
    if (!confirm1) return

    const confirm2 = confirm(
      `🔴 KONFIRMASI TERAKHIR\n\n` +
      `Yakin hapus site "${editingSite.nama_site}"?\n` +
      `Ketik OK untuk konfirmasi.`
    )
    if (!confirm2) return

    setDeleting(true)
    setMsg(null)
    try {
      const res = await fetch('/api/sites-manager', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingSite.id })
      })
      const json = await res.json()
      if (res.ok) {
        alert(` ${json.message}`)
        setEditingSite(null)
        loadData()
      } else {
        setMsg({ type: 'err', text: '❌ ' + json.error })
      }
    } catch {
      setMsg({ type: 'err', text: '❌ Koneksi bermasalah' })
    } finally {
      setDeleting(false)
    }
  }

  async function handleSave() {
    if (!editingSite) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/sites-manager', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingSite.id, updates: formData })
      })
      const json = await res.json()
      if (res.ok) {
        setMsg({ type: 'ok', text: ' Berhasil disimpan!' })
        loadData()
        setTimeout(() => {
          setEditingSite(null)
          setMsg(null)
        }, 1200)
      } else {
        setMsg({ type: 'err', text: '❌ ' + json.error })
      }
    } catch (err) {
      setMsg({ type: 'err', text: '❌ Koneksi bermasalah' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat data site...
    </div>
  )

  return (
    <div className="animate-in fade-in duration-500 pb-32">
      {/* HEADER MEWAH */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">🏢</div>
            <div>
              <p className="text-amber-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Master Data</p>
              <h1 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black tracking-tight">Kelola Site</h1>
            </div>
          </div>
          <p className="text-blue-200/70 text-xs font-medium">
            Konfigurasi jam kerja, GPS, radius absensi, dan pengurangan KPI per site
          </p>
        </div>
      </div>

      {/* LIST SITE CARDS */}
      <div className="space-y-4">
        {sites.map((site: any) => (
          <div key={site.id} className={`bg-white rounded-[2.5rem] border-2 shadow-lg overflow-hidden ${
            site.is_active ? 'border-slate-100' : 'border-rose-100 opacity-70'
          }`}>
            {/* Card Header */}
            <div className={`p-6 flex items-center justify-between ${
              site.is_pusat ? 'bg-gradient-to-r from-amber-50 to-white' : 'bg-slate-50/50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                  site.is_pusat ? 'bg-amber-500 text-white' : 'bg-[#003D79] text-white'
                }`}>
                  {site.is_pusat ? '⭐' : '🏢'}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-slate-900 text-base">{site.nama_site}</h3>
                    {site.is_pusat && (
                      <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                        Pusat
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Kode: {site.kode_site || '-'}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                site.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {site.is_active ? '● Aktif' : '○ Nonaktif'}
              </span>
            </div>

                        {/* ═══ PJO INFO BAR ═══ */}
            <div className="px-6 py-3 bg-blue-50/50 border-y border-blue-100/50 flex flex-wrap gap-4 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="font-black text-blue-500 uppercase tracking-widest text-[9px]"> PJO:</span>
                <span className="font-black text-[#003D79]">
                  {site.pjo_info?.nama || <span className="text-rose-500 italic">Belum diset</span>}
                </span>
              </div>
              {site.deputy_info && (
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-400 uppercase tracking-widest text-[9px]"> Deputy:</span>
                  <span className="font-bold text-slate-700">{site.deputy_info.nama}</span>
                </div>
              )}
            </div>

            {/* Card Body - Info Grid */}
            <div className="p-6 space-y-4">
              {/* Row 1: Total Karyawan + PJO */}
<div className="grid grid-cols-2 gap-3">
  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">👥 Karyawan</p>
    <p className="text-2xl font-black text-blue-700">{site.total_karyawan}</p>
    <p className="text-[9px] font-bold text-blue-400 uppercase mt-0.5">orang aktif</p>
  </div>
  <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1"> PJO Site</p>
    {site.pjo_info?.nama ? (
      <>
        <p className="text-xs font-black text-amber-700 leading-tight truncate">
          {site.pjo_info.nama}
        </p>
        {site.deputy_info?.nama && (
          <p className="text-[10px] font-bold text-amber-600/70 leading-tight truncate mt-1">
            Deputy: {site.deputy_info.nama}
          </p>
        )}
      </>
    ) : (
      <p className="text-xs font-black text-slate-400 italic">Belum ada PJO</p>
    )}
  </div>
</div>

              {/* Row 2: Shift */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-slate-500 uppercase tracking-widest">☀️ Shift Siang</span>
                  <span className="font-black text-slate-900 font-mono">
                    {(site.siang_jam_masuk || '').slice(0, 5)} — {(site.siang_jam_pulang || '').slice(0, 5)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-slate-500 uppercase tracking-widest">🌙 Shift Malam</span>
                  <span className="font-black text-slate-900 font-mono">
                    {(site.malam_jam_masuk || '').slice(0, 5)} — {(site.malam_jam_pulang || '').slice(0, 5)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100">
                  <span className="font-black text-slate-500 uppercase tracking-widest"> Batas Telat</span>
                  <span className="font-black text-rose-600">
                    S: {site.siang_batas_telat}m · M: {site.malam_batas_telat}m
                  </span>
                </div>
              </div>

              {/* Row 3: GPS + Radius */}
              <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-emerald-600 uppercase tracking-widest">📍 Radius GPS</span>
                  <span className="font-black text-emerald-700 text-lg">{site.radius_meter}m</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-black text-slate-400 uppercase tracking-widest">🗺️ Koordinat</span>
                  <span className="font-black text-slate-600 font-mono truncate">
                    {site.latitude ? `${Number(site.latitude).toFixed(4)}, ${Number(site.longitude).toFixed(4)}` : 'Belum diset'}
                  </span>
                </div>
              </div>

              {/* Tombol Aksi */}
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => openEditModal(site)}
                  className="py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#003D79] active:scale-95 transition-all"
                >
                  ✏️ EDIT SITE
                </button>
                <button 
                  onClick={() => window.location.href = `/dashboard/kelola-unit?site=${encodeURIComponent(site.nama_site)}`}
                  className="py-4 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-amber-700 active:scale-95 transition-all"
                >
                  🚜 KELOLA UNIT
                </button>
              </div>
            </div>
          </div>
        ))}

        {sites.length === 0 && (
          <div className="p-20 text-center text-slate-300 font-bold italic bg-white rounded-[2rem] border-2 border-dashed">
            Belum ada site terdaftar
          </div>
        )}
      </div>

      {/* MODAL EDIT SITE */}
      {editingSite && (
        <>
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100]" onClick={() => !saving && setEditingSite(null)} />
          <div className="fixed inset-x-2 top-4 bottom-4 lg:inset-x-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[90%] lg:max-w-2xl lg:h-[90vh] bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-br from-slate-900 to-[#003D79] text-white flex items-center gap-2 lg:gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                editingSite.is_pusat ? 'bg-amber-500' : 'bg-white/10'
              }`}>
                {editingSite.is_pusat ? '⭐' : '🏢'}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-lg tracking-tight truncate">{editingSite.nama_site}</h2>
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Edit Konfigurasi Site</p>
              </div>
              <button 
                onClick={() => !saving && setEditingSite(null)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {msg && (
              <div className={`px-6 py-3 border-b-2 ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                <p className="text-[11px] font-black uppercase tracking-widest">{msg.text}</p>
              </div>
            )}

            {/* Modal Body - Form */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
              
              {/* SECTION 1: Identitas Site */}
              <div>
                <h3 className="text-[10px] font-black text-[#003D79] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-[#003D79]"></span>
                  Identitas Site
                </h3>
                <div className="space-y-3">
                  <FieldInput label="Nama Site" value={formData.nama_site} onChange={(v: string) => setFormData({...formData, nama_site: v})} />
                  <FieldInput label="Kode Site" value={formData.kode_site} onChange={(v: string) => setFormData({...formData, kode_site: v})} />
                  <FieldInput label="Alamat" value={formData.alamat} onChange={(v: string) => setFormData({...formData, alamat: v})} />
                </div>
              </div>

              {/* SECTION 2: Jam Kerja */}
              <div>
                <h3 className="text-[10px] font-black text-[#003D79] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-[#003D79]"></span>
                  Jam Kerja Shift
                </h3>
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-2xl border-2 border-amber-100">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">☀️ Shift Siang</p>
                    <div className="grid grid-cols-3 gap-2">
                      <FieldInput label="Masuk" type="time" value={formData.siang_jam_masuk} onChange={(v: string) => setFormData({...formData, siang_jam_masuk: v})} />
                      <FieldInput label="Pulang" type="time" value={formData.siang_jam_pulang} onChange={(v: string) => setFormData({...formData, siang_jam_pulang: v})} />
                      <FieldInput label="Telat (menit)" type="number" value={formData.siang_batas_telat} onChange={(v: string) => setFormData({...formData, siang_batas_telat: parseInt(v) || 0})} />
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border-2 border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">🌙 Shift Malam</p>
                    <div className="grid grid-cols-3 gap-2">
                      <FieldInput label="Masuk" type="time" value={formData.malam_jam_masuk} onChange={(v: string) => setFormData({...formData, malam_jam_masuk: v})} />
                      <FieldInput label="Pulang" type="time" value={formData.malam_jam_pulang} onChange={(v: string) => setFormData({...formData, malam_jam_pulang: v})} />
                      <FieldInput label="Telat (menit)" type="number" value={formData.malam_batas_telat} onChange={(v: string) => setFormData({...formData, malam_batas_telat: parseInt(v) || 0})} />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: GPS & Radius */}
              <div>
                <h3 className="text-[10px] font-black text-[#003D79] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-[#003D79]"></span>
                  Lokasi & Radius Absensi
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <FieldInput label="Latitude" value={formData.latitude} onChange={(v: string) => setFormData({...formData, latitude: v})} placeholder="-3.286843" />
                    <FieldInput label="Longitude" value={formData.longitude} onChange={(v: string) => setFormData({...formData, longitude: v})} placeholder="122.257307" />
                  </div>
                  <FieldInput label="Radius Absensi (meter)" type="number" value={formData.radius_meter} onChange={(v: string) => setFormData({...formData, radius_meter: parseInt(v) || 0})} />
                </div>
              </div>

              {/* SECTION 4: KPI Minus Poin */}
              <div>
                <h3 className="text-[10px] font-black text-[#003D79] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-[#003D79]"></span>
                  Pengurangan Poin KPI
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <FieldInput label="Terlambat" type="number" value={formData.minus_terlambat} onChange={(v: string) => setFormData({...formData, minus_terlambat: parseInt(v) || 0})} />
                  <FieldInput label="Mangkir" type="number" value={formData.minus_mangkir} onChange={(v: string) => setFormData({...formData, minus_mangkir: parseInt(v) || 0})} />
                  <FieldInput label="SP 1" type="number" value={formData.minus_sp1} onChange={(v: string) => setFormData({...formData, minus_sp1: parseInt(v) || 0})} />
                  <FieldInput label="SP 2" type="number" value={formData.minus_sp2} onChange={(v: string) => setFormData({...formData, minus_sp2: parseInt(v) || 0})} />
                  <FieldInput label="SP 3" type="number" value={formData.minus_sp3} onChange={(v: string) => setFormData({...formData, minus_sp3: parseInt(v) || 0})} />
                  <FieldInput label="CNC" type="number" value={formData.minus_cnc} onChange={(v: string) => setFormData({...formData, minus_cnc: parseInt(v) || 0})} />
                </div>
              </div>

              {/* SECTION 4.5: PJO & Deputy PJO */}
              <div>
                <h3 className="text-[10px] font-black text-[#003D79] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-[#003D79]"></span>
                  Penanggung Jawab (PJO)
                </h3>
                <div className="space-y-3">

                  {/* PJO — WAJIB */}
                  <div className="bg-white p-4 rounded-2xl border-2 border-blue-100">
                    <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">
                       PJO (Wajib)
                    </label>

                    {/* Selected PJO */}
                    {formData.pjo_nrp && (() => {
                      const emp = employees.find(e => e.nrp === formData.pjo_nrp)
                      return emp ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                              {(emp.nama || '?')[0]}
                            </div>
                            <div>
                              <div className="font-black text-sm text-[#003D79]">{emp.nama}</div>
                              <div className="text-[10px] text-slate-500">{emp.nrp} · {emp.jabatan || '—'} · {emp.site || '—'}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, pjo_nrp: '' })
                              setPjoSearch('')
                            }}
                            className="w-8 h-8 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-full flex items-center justify-center text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ) : null
                    })()}

                    {/* Search PJO */}
                    {!formData.pjo_nrp && (
                      <>
                        <input
                          type="text"
                          value={pjoSearch}
                          onChange={e => setPjoSearch(e.target.value)}
                          placeholder="🔍 Ketik nama atau NRP karyawan..."
                          className="w-full p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none text-sm font-medium focus:border-[#003D79] focus:bg-white transition-all mb-2"
                        />

                        {pjoSearch.length >= 2 && (
                          <div className="max-h-52 overflow-y-auto space-y-1 bg-slate-50 rounded-xl p-2">
                            {employees
                              .filter(e =>
                                e.nrp !== formData.deputy_pjo_nrp &&
                                (e.nama?.toLowerCase().includes(pjoSearch.toLowerCase()) ||
                                 e.nrp?.toLowerCase().includes(pjoSearch.toLowerCase()))
                              )
                              .slice(0, 15)
                              .map(e => (
                                <button
                                  key={e.nrp}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, pjo_nrp: e.nrp })
                                    setPjoSearch('')
                                  }}
                                  className="w-full p-2.5 rounded-xl text-left bg-white hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all"
                                >
                                  <div className="font-bold text-sm text-[#003D79]">{e.nama}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {e.nrp} · {e.site || '—'} · {e.jabatan || '—'}
                                  </div>
                                </button>
                              ))}
                            {employees.filter(e =>
                              e.nama?.toLowerCase().includes(pjoSearch.toLowerCase()) ||
                              e.nrp?.toLowerCase().includes(pjoSearch.toLowerCase())
                            ).length === 0 && (
                              <div className="text-center py-4 text-xs text-slate-400">
                                Tidak ditemukan karyawan &quot;{pjoSearch}&quot;
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* DEPUTY PJO — OPSIONAL */}
                  <div className="bg-white p-4 rounded-2xl border-2 border-slate-100">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                       Deputy PJO (Opsional)
                    </label>

                    {/* Selected Deputy */}
                    {formData.deputy_pjo_nrp && (() => {
                      const emp = employees.find(e => e.nrp === formData.deputy_pjo_nrp)
                      return emp ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-600 text-white flex items-center justify-center font-black text-sm">
                              {(emp.nama || '?')[0]}
                            </div>
                            <div>
                              <div className="font-black text-sm text-slate-800">{emp.nama}</div>
                              <div className="text-[10px] text-slate-500">{emp.nrp} · {emp.jabatan || '—'} · {emp.site || '—'}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, deputy_pjo_nrp: '' })
                              setDeputySearch('')
                            }}
                            className="w-8 h-8 bg-rose-100 hover:bg-rose-200 text-rose-600 rounded-full flex items-center justify-center text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ) : null
                    })()}

                    {/* Search Deputy */}
                    {!formData.deputy_pjo_nrp && (
                      <>
                        <input
                          type="text"
                          value={deputySearch}
                          onChange={e => setDeputySearch(e.target.value)}
                          placeholder="🔍 Ketik nama atau NRP karyawan (opsional)..."
                          className="w-full p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none text-sm font-medium focus:border-slate-400 focus:bg-white transition-all mb-2"
                        />

                        {deputySearch.length >= 2 && (
                          <div className="max-h-52 overflow-y-auto space-y-1 bg-slate-50 rounded-xl p-2">
                            {employees
                              .filter(e =>
                                e.nrp !== formData.pjo_nrp &&
                                (e.nama?.toLowerCase().includes(deputySearch.toLowerCase()) ||
                                 e.nrp?.toLowerCase().includes(deputySearch.toLowerCase()))
                              )
                              .slice(0, 15)
                              .map(e => (
                                <button
                                  key={e.nrp}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, deputy_pjo_nrp: e.nrp })
                                    setDeputySearch('')
                                  }}
                                  className="w-full p-2.5 rounded-xl text-left bg-white hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all"
                                >
                                  <div className="font-bold text-sm text-slate-800">{e.nama}</div>
                                  <div className="text-[10px] text-slate-400">
                                    {e.nrp} · {e.site || '—'} · {e.jabatan || '—'}
                                  </div>
                                </button>
                              ))}
                            {employees.filter(e =>
                              e.nama?.toLowerCase().includes(deputySearch.toLowerCase()) ||
                              e.nrp?.toLowerCase().includes(deputySearch.toLowerCase())
                            ).length === 0 && (
                              <div className="text-center py-4 text-xs text-slate-400">
                                Tidak ditemukan karyawan &quot;{deputySearch}&quot;
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Info Box */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-800 flex items-start gap-2">
                    <span className="text-base leading-none">💡</span>
                    <div>
                      <strong>Otomatis:</strong> Karyawan yang dipilih akan otomatis mendapat role <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">pjo_site</code>.
                      Yang lama akan dicopot rolenya.
                    </div>
                  </div>

                </div>
              </div>

              {/* SECTION 5: Status */}
              <div>
                <h3 className="text-[10px] font-black text-[#003D79] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                  <span className="w-4 h-[2px] bg-[#003D79]"></span>
                  Status Site
                </h3>
                <div className="space-y-2">
                  <ToggleField label="Site Aktif" checked={formData.is_active} onChange={(v: boolean) => setFormData({...formData, is_active: v, active: v})} />
                  <ToggleField label="Site Pusat (HO)" checked={formData.is_pusat} onChange={(v: boolean) => setFormData({...formData, is_pusat: v})} />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t-2 border-slate-100 space-y-2">
              {/* Tombol Hapus - hanya tampil jika bukan site pusat */}
              {!editingSite?.is_pusat && (
                <button
                  onClick={handleDelete}
                  disabled={saving || deleting}
                  className="w-full py-3 bg-rose-50 text-rose-600 border-2 border-rose-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 hover:text-white hover:border-rose-600 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {deleting ? '⏳ MENGHAPUS...' : '🗑️ HAPUS SITE INI PERMANEN'}
                </button>
              )}
              
              {/* Tombol Batal + Simpan */}
              <div className="flex gap-3">
                <button 
                  onClick={() => !(saving || deleting) && setEditingSite(null)}
                  disabled={saving || deleting}
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 disabled:opacity-50"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving || deleting}
                  className="flex-[2] py-4 bg-[#003D79] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {saving ? '⏳ MENYIMPAN...' : '💾 SIMPAN PERUBAHAN'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
