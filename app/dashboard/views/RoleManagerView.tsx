'use client'

// RoleManagerView dipisah dari app/dashboard/page.tsx (v1.8)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import { useState, useEffect, useRef } from 'react'

export default function RoleManagerView({ title }: any) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'' | 'has_role' | 'no_role'>('')
  const [filterSite, setFilterSite] = useState('')
  const [filterRole, setFilterRole] = useState('')
  
  // Batch mode
  const [batchMode, setBatchMode] = useState(false)
  const [selectedNrps, setSelectedNrps] = useState<Set<string>>(new Set())
  const [batchRole, setBatchRole] = useState('')
  const [batchScope, setBatchScope] = useState('')
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: string, text: string } | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (filterSite) params.set('site', filterSite)
      if (filterRole) params.set('role', filterRole)
      if (filterStatus) params.set('status', filterStatus)
      
      const res = await fetch(`/api/role-manager?${params.toString()}`)
      const d = await res.json()
      setData(d)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => loadData(), 300)
    return () => clearTimeout(t)
  }, [searchTerm, filterSite, filterRole, filterStatus])

  // Toggle 1 role
  async function toggleRole(nrp: string, role: string, isActive: boolean) {
    const action = isActive ? 'remove' : 'assign'
    const res = await fetch('/api/role-manager', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'single', nrp, role, action })
    })
    if (res.ok) loadData()
  }

  // Batch: toggle NRP di daftar terpilih
  function toggleSelected(nrp: string) {
    const newSet = new Set(selectedNrps)
    if (newSet.has(nrp)) newSet.delete(nrp)
    else newSet.add(nrp)
    setSelectedNrps(newSet)
  }

  function selectAll() {
    const allNrps = new Set<string>((data?.employees || []).map((e: any) => e.nrp as string))
    setSelectedNrps(allNrps)
  }

  function unselectAll() {
    setSelectedNrps(new Set())
  }

  // Apply batch
  async function applyBatch() {
    if (selectedNrps.size === 0 || !batchRole) {
      setMsg({ type: 'err', text: '❌ Pilih minimal 1 karyawan dan 1 role' })
      return
    }

    const confirmMsg = `Assign role "${batchRole}" ke ${selectedNrps.size} karyawan?${replaceExisting ? '\n\n Semua role lama akan DIHAPUS terlebih dahulu!' : ''}`
    if (!confirm(confirmMsg)) return

    setSaving(true)
    try {
      const res = await fetch('/api/role-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'batch',
          nrps: Array.from(selectedNrps),
          role: batchRole,
          scope_site: batchScope || null,
          replace_existing: replaceExisting
        })
      })
      const result = await res.json()
      
      if (res.ok) {
        setMsg({ 
          type: 'ok', 
          text: ` ${result.message} (${result.stats.success}/${result.stats.total})` 
        })
        setSelectedNrps(new Set())
        setBatchRole('')
        setBatchScope('')
        setReplaceExisting(false)
        loadData()
        setTimeout(() => setMsg(null), 5000)
      } else {
        setMsg({ type: 'err', text: `❌ ${result.error}` })
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: `❌ ${err.message}` })
    } finally {
      setSaving(false)
    }
  }

  // Clear semua role dari karyawan
  async function clearAllRoles(nrp: string, nama: string) {
    if (!confirm(`Hapus SEMUA role dari ${nama}?`)) return
    const res = await fetch('/api/role-manager', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nrp })
    })
    if (res.ok) loadData()
  }

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat data karyawan & role...
    </div>
  )

  if (!data) return <div className="p-10 text-center text-slate-400">Gagal memuat data</div>

  const employees = data.employees || []
  const templates = data.templates || []
  const sites = data.sites || []

  // Group role templates by scope for dropdown
  const templatesByScope: Record<string, any[]> = {}
  templates.forEach((t: any) => {
    if (!templatesByScope[t.scope]) templatesByScope[t.scope] = []
    templatesByScope[t.scope].push(t)
  })

  return (
    <div className="animate-in fade-in duration-500 pb-32">
      {/* HEADER MEWAH */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-400/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">👥</div>
            <div>
              <p className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">HR</p>
              <h1 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black tracking-tight">Kelola Role Karyawan</h1>
            </div>
          </div>
          <p className="text-blue-200/70 text-xs font-medium">
            Assign role sesuai struktur organisasi · {templates.length} role tersedia · Batch mode untuk assign massal
          </p>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-50 shadow-sm">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
          <p className="text-xl font-black text-slate-900">{data.stats.total_karyawan}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border-2 border-emerald-50 shadow-sm">
          <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Punya Role</p>
          <p className="text-xl font-black text-emerald-600">{data.stats.punya_role}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border-2 border-amber-50 shadow-sm">
          <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest mb-1">Tanpa Role</p>
          <p className="text-xl font-black text-amber-600">{data.stats.tanpa_role}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border-2 border-blue-50 shadow-sm">
          <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Terfilter</p>
          <p className="text-xl font-black text-blue-600">{data.stats.filtered}</p>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-[2rem] border-2 border-slate-50 shadow-sm mb-6 space-y-3">
        <input
          type="text"
          placeholder="🔍 Cari nama atau NRP karyawan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-sm focus:border-[#003D79] focus:bg-white transition-all"
        />
        
        <div className="grid grid-cols-3 gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-[#003D79]"
          >
            <option value="">Semua Status</option>
            <option value="has_role"> Sudah Punya Role</option>
            <option value="no_role"> Belum Punya Role</option>
          </select>
          
          <select
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            className="p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-[#003D79]"
          >
            <option value="">Semua Site</option>
            {sites.map((s: string) => <option key={s} value={s}>{s}</option>)}
          </select>
          
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-[#003D79]"
          >
            <option value="">Semua Role</option>
            {templates.map((t: any) => (
              <option key={t.role_key} value={t.role_key}>{t.role_label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* BATCH MODE TOGGLE */}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setBatchMode(!batchMode); setSelectedNrps(new Set()) }}
          className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all active:scale-95 ${
            batchMode
              ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg'
              : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
          }`}
        >
          {batchMode ? ' MODE BATCH AKTIF' : '⚡ MODE BATCH'}
        </button>

        {batchMode && (
          <>
            <button type="button" onClick={selectAll} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-200 transition-all active:scale-95">
              Pilih Semua ({employees.length})
            </button>
            <button type="button" onClick={unselectAll} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
              Batal Pilih
            </button>
            <span className="ml-auto text-xs font-black text-emerald-600">
              {selectedNrps.size} terpilih
            </span>
          </>
        )}
      </div>

      {/* BATCH ACTION PANEL */}
      {batchMode && selectedNrps.size > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-emerald-200 shadow-lg mb-6">
          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.3em] mb-3">
            ⚡ Batch Assign — {selectedNrps.size} karyawan terpilih
          </p>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <select
              value={batchRole}
              onChange={(e) => setBatchRole(e.target.value)}
              className="p-3 bg-white border-2 border-emerald-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
            >
              <option value="">— Pilih Role —</option>
              {Object.entries(templatesByScope).map(([scope, tpls]: any) => (
                <optgroup key={scope} label={`SCOPE: ${scope}`}>
                  {tpls.map((t: any) => (
                    <option key={t.role_key} value={t.role_key}>
                      {t.role_label} (Level {t.level})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            
            <select
              value={batchScope}
              onChange={(e) => setBatchScope(e.target.value)}
              className="p-3 bg-white border-2 border-emerald-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
            >
              <option value="">Scope Site: (Default - ikuti site karyawan)</option>
              {sites.map((s: string) => <option key={s} value={s}>Scope: {s}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">
              🗑️ Hapus semua role lama dulu (replace mode)
            </span>
          </label>

          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); applyBatch() }}
            disabled={!batchRole || saving}
            className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${
              batchRole && !saving
                ? 'bg-emerald-500 text-white shadow-xl hover:bg-emerald-600'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {saving ? '⏳ MEMPROSES...' : `⚡ APPLY ROLE KE ${selectedNrps.size} KARYAWAN`}
          </button>
        </div>
      )}

      {/* MESSAGE BANNER */}
      {msg && (
        <div className={`p-4 rounded-2xl border-2 mb-4 ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <p className="text-xs font-black">{msg.text}</p>
        </div>
      )}

      {/* LIST KARYAWAN */}
      <div className="space-y-3">
        {employees.length === 0 ? (
          <div className="p-20 text-center bg-white rounded-[2rem] border-2 border-dashed text-slate-300 font-bold uppercase italic">
            Tidak ada karyawan sesuai filter
          </div>
        ) : (
          employees.map((e: any) => {
            const isSelected = selectedNrps.has(e.nrp)
            return (
              <div 
                key={e.nrp} 
                className={`bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 shadow-sm hover:shadow-md transition-all ${
                  batchMode && isSelected 
                    ? 'border-emerald-400 bg-emerald-50/30' 
                    : e.has_role ? 'border-slate-50' : 'border-amber-100 bg-amber-50/20'
                }`}
              >
                <div className="flex items-center gap-2 lg:gap-4">
                  {batchMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(e.nrp)}
                      className="w-5 h-5 flex-shrink-0"
                    />
                  )}
                  
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg flex-shrink-0 ${
                    e.has_role ? 'bg-[#003D79]' : 'bg-amber-500'
                  }`}>
                    {e.nama[0]}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-900 text-sm truncate">{e.nama}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                      {e.nrp} • {e.jabatan || '-'} • {e.site || '-'}
                    </div>
                    
                    {/* Role badges */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {e.roles.length === 0 ? (
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest italic">
                           Belum ada role
                        </span>
                      ) : (
                        e.roles.map((r: string) => {
                          const tpl = templates.find((t: any) => t.role_key === r)
                          return (
                            <button
                              key={r}
                              onClick={() => toggleRole(e.nrp, r, true)}
                              title="Klik untuk hapus role"
                              className="bg-blue-100 hover:bg-rose-100 text-blue-700 hover:text-rose-700 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest transition-all"
                            >
                              {tpl?.role_label || r} ✕
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                  
                  {e.has_role && !batchMode && (
                    <button
                      onClick={() => clearAllRoles(e.nrp, e.nama)}
                      className="text-[9px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-widest px-2 py-1 rounded-lg hover:bg-rose-50 transition-all flex-shrink-0"
                    >
                      Hapus Semua
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
