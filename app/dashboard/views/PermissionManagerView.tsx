'use client'

// PermissionManagerView dipisah dari app/dashboard/page.tsx (v1.8)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import { useState, useEffect, useRef } from 'react'

export default function PermissionManagerView() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmp, setSelectedEmp] = useState<any>(null)
  const [originalPerms, setOriginalPerms] = useState<string[]>([])   // Data asli dari DB
  const [draftPerms, setDraftPerms] = useState<string[]>([])         // Data draft yang bisa diubah user
  const [loadingModal, setLoadingModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: string, text: string } | null>(null)
  const [roleTemplates, setRoleTemplates] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [applyingTemplate, setApplyingTemplate] = useState(false)

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
      const res = await fetch('/api/permission-manager')
      const json = await res.json()
      if (res.ok) setData(json)
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function openEmployeeModal(emp: any) {
    setSelectedEmp(emp)
    setLoadingModal(true)
    setOriginalPerms([])
    setDraftPerms([])
    setMsg(null)
    try {
      const res = await fetch(`/api/permission-manager?nrp=${emp.nrp}`)
      const json = await res.json()
      if (res.ok) {
        const perms = json.active_permissions || []
        setOriginalPerms(perms)
        setDraftPerms([...perms])   // Copy untuk draft
      }
    } catch (err) {
      console.error('Load perm error:', err)
    } finally {
      setLoadingModal(false)
    }
  }

  // Toggle di draft saja (tidak hit API)
  function toggleDraftPermission(permKey: string) {
    if (draftPerms.includes(permKey)) {
      setDraftPerms(draftPerms.filter(p => p !== permKey))
    } else {
      setDraftPerms([...draftPerms, permKey])
    }
  }

    // Apply role template ke draft (tidak langsung save)
  async function handleApplyTemplate() {
    if (!selectedTemplate || !selectedEmp) return
    
    const template = roleTemplates.find(t => t.role_key === selectedTemplate)
    if (!template) return

    const confirmMsg = `Apply template "${template.role_label}" ke ${selectedEmp.nama}?\n\nIni akan MENGGANTI semua permission saat ini dengan ${template.permissions.length} permission dari template.\n\nPerubahan belum disimpan sampai klik tombol SIMPAN.`
    
    if (!confirm(confirmMsg)) return

    setApplyingTemplate(true)
    try {
      // Set draft langsung dari template (replace mode di draft)
      setDraftPerms([...template.permissions])
      setMsg({ 
        type: 'ok', 
        text: ` Template "${template.role_label}" dimuat! ${template.permissions.length} permissions siap disimpan.` 
      })
      setSelectedTemplate('')
      setTimeout(() => setMsg(null), 4000)
    } finally {
      setApplyingTemplate(false)
    }
  }

  // Hitung perubahan
  const toAdd = draftPerms.filter(p => !originalPerms.includes(p))
  const toRemove = originalPerms.filter(p => !draftPerms.includes(p))
  const hasChanges = toAdd.length > 0 || toRemove.length > 0

  // Simpan semua perubahan sekaligus
  async function handleSaveChanges() {
    if (!selectedEmp || !hasChanges) return
    setSaving(true)
    setMsg(null)
    try {
      // Kirim semua request paralel
      const addPromises = toAdd.map(perm_key =>
        fetch('/api/permission-manager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nrp: selectedEmp.nrp, perm_key })
        })
      )
      const removePromises = toRemove.map(perm_key =>
        fetch('/api/permission-manager', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nrp: selectedEmp.nrp, perm_key })
        })
      )

      await Promise.all([...addPromises, ...removePromises])
      
      // Update state agar sinkron
      setOriginalPerms([...draftPerms])
      setMsg({ 
        type: 'ok', 
        text: ` Berhasil disimpan! +${toAdd.length} ditambah, -${toRemove.length} dicabut` 
      })
      
      // Refresh data utama untuk update counter di list
      loadData()
      
      // Auto close message setelah 3 detik
      setTimeout(() => setMsg(null), 3000)
    } catch (err) {
      setMsg({ type: 'err', text: '❌ Gagal menyimpan, cek koneksi' })
    } finally {
      setSaving(false)
    }
  }

  function handleCloseModal() {
    if (hasChanges) {
      if (!confirm('Ada perubahan belum disimpan. Yakin keluar tanpa menyimpan?')) {
        return
      }
    }
    setSelectedEmp(null)
    setMsg(null)
  }

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat data karyawan & permissions...
    </div>
  )

  if (!data) return <div className="p-10 text-center text-slate-400">Gagal memuat data</div>

  const filteredEmps = (data.employees || []).filter((e: any) =>
    e.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.nrp.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const permsByCategory: Record<string, any[]> = {}
  ;(data.master_permissions || []).forEach((p: any) => {
    if (!permsByCategory[p.category]) permsByCategory[p.category] = []
    permsByCategory[p.category].push(p)
  })

  const stats = {
    total: data.employees.length,
    with_perms: data.employees.filter((e: any) => e.permission_count > 0).length,
    super_admin: data.employees.filter((e: any) => e.is_super_admin).length,
    total_perms: data.total_permissions
  }

  return (
    <div className="animate-in fade-in duration-500 pb-32">
      {/* HEADER MEWAH */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">🔐</div>
            <div>
              <p className="text-amber-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Manajemen Akses</p>
              <h1 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black tracking-tight">Kelola Permission</h1>
            </div>
          </div>
          <p className="text-blue-200/70 text-xs font-medium">
            Atur hak akses granular per karyawan · {data?.total_permissions || 0} permissions · 12 role template tersedia
          </p>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-50 shadow-sm">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Karyawan</p>
          <p className="text-xl font-black text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border-2 border-blue-50 shadow-sm">
          <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Punya Akses</p>
          <p className="text-xl font-black text-blue-600">{stats.with_perms}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border-2 border-emerald-50 shadow-sm">
          <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Perms</p>
          <p className="text-xl font-black text-emerald-600">{stats.total_perms}</p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-4 rounded-[2rem] border-2 border-slate-50 shadow-sm mb-6">
        <input
          type="text"
          placeholder="🔍 Cari nama atau NRP karyawan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2.5 lg:p-3 bg-slate-50 border-2 border-slate-100 rounded-xl lg:rounded-2xl outline-none font-bold text-sm focus:border-[#003D79] focus:bg-white transition-all"
        />
      </div>

      {/* LIST KARYAWAN */}
      <div className="space-y-3">
        {filteredEmps.map((emp: any) => (
          <button
            key={emp.nrp}
            onClick={() => openEmployeeModal(emp)}
            className="w-full text-left bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 shadow-sm hover:shadow-lg transition-all active:scale-98 flex items-center gap-2 lg:gap-4 border-slate-50 hover:border-blue-200"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg bg-slate-900">
              {emp.nama[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-black text-slate-900 text-sm truncate">{emp.nama}</h3>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                {emp.nrp} • {emp.jabatan || '-'} • {emp.site || '-'}
              </p>
              {emp.roles && emp.roles.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {emp.roles.slice(0, 2).map((r: string) => (
                    <span key={r} className="bg-blue-100 text-blue-700 text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                      {r}
                    </span>
                  ))}
                  {emp.roles.length > 2 && (
                    <span className="bg-slate-100 text-slate-500 text-[7px] font-black px-1.5 py-0.5 rounded-full">
                      +{emp.roles.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className={`text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black ${
                emp.permission_count === 0 ? 'text-slate-300' :
                emp.permission_count < 15 ? 'text-blue-600' :
                emp.permission_count < 40 ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {emp.permission_count}
              </p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">/ {stats.total_perms}</p>
            </div>
          </button>
        ))}

        {filteredEmps.length === 0 && (
          <div className="p-20 text-center text-slate-300 font-bold italic bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
            Karyawan tidak ditemukan
          </div>
        )}
      </div>

      {/* MODAL DETAIL PERMISSION */}
      {selectedEmp && (
        <>
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100]" onClick={handleCloseModal} />
          <div className="fixed inset-x-2 top-4 bottom-4 lg:inset-x-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[90%] lg:max-w-3xl lg:max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-br from-slate-900 to-[#003D79] text-white flex items-center gap-2 lg:gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl bg-white/10">
                {selectedEmp.nama[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-lg tracking-tight truncate">{selectedEmp.nama}</h2>
                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest truncate">
                  {selectedEmp.nrp} • {selectedEmp.jabatan}
                </p>
                <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest mt-1">
                  {draftPerms.length} / {data.total_permissions} Permission Aktif
                </p>
              </div>
              <button 
                onClick={handleCloseModal}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* ROLE TEMPLATE SELECTOR */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-100">
              <p className="text-[9px] font-black text-[#003D79] uppercase tracking-[0.25em] mb-2">
                ⚡ Apply Role Template
              </p>
              <div className="flex gap-2">
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="flex-1 p-2.5 bg-white border-2 border-blue-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#003D79] transition-all"
                >
                  <option value="">— Pilih template role —</option>
                  {roleTemplates
                    .filter(t => t.role_key !== 'super_admin')
                    .map((t: any) => (
                    <option key={t.role_key} value={t.role_key}>
                      {t.role_label} ({t.permissions.length} perms) — {t.scope}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleApplyTemplate}
                  disabled={!selectedTemplate || applyingTemplate}
                  className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                    selectedTemplate && !applyingTemplate
                      ? 'bg-[#003D79] text-white shadow-lg shadow-blue-200 hover:bg-blue-700'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {applyingTemplate ? '⏳' : '⚡ Apply'}
                </button>
              </div>
              {selectedTemplate && (
                <p className="text-[9px] text-blue-500 font-bold mt-1.5">
                  ℹ️ {roleTemplates.find(t => t.role_key === selectedTemplate)?.role_desc}
                </p>
              )}
            </div>

            {/* Banner Perubahan */}
            {hasChanges && (
              <div className="px-6 py-3 bg-amber-50 border-b-2 border-amber-100 flex items-center gap-3">
                <span className="text-lg"></span>
                <p className="text-[11px] font-black text-amber-800 uppercase tracking-widest flex-1">
                  Ada {toAdd.length + toRemove.length} perubahan belum disimpan
                </p>
                <div className="flex gap-2 text-[9px] font-black">
                  {toAdd.length > 0 && <span className="bg-emerald-500 text-white px-2 py-1 rounded-lg">+{toAdd.length}</span>}
                  {toRemove.length > 0 && <span className="bg-rose-500 text-white px-2 py-1 rounded-lg">-{toRemove.length}</span>}
                </div>
              </div>
            )}

            {/* Message Banner */}
            {msg && (
              <div className={`px-6 py-3 border-b-2 ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                <p className="text-[11px] font-black uppercase tracking-widest">{msg.text}</p>
              </div>
            )}

            {/* Modal Body - Permissions List */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {loadingModal ? (
                <div className="p-20 text-center font-black text-slate-400 animate-pulse uppercase tracking-widest text-xs">
                  Memuat permissions...
                </div>
              ) : (
                <div className="space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
                  {Object.entries(permsByCategory).map(([category, perms]) => (
                    <div key={category}>
                      <h3 className="text-[10px] font-black text-[#003D79] uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                        <span className="w-4 h-[2px] bg-[#003D79]"></span>
                        {category}
                        <span className="text-slate-400">
                          ({perms.filter(p => draftPerms.includes(p.perm_key)).length}/{perms.length})
                        </span>
                      </h3>
                      <div className="space-y-2">
                        {perms.map((perm: any) => {
                          const isActive = draftPerms.includes(perm.perm_key)
                          const wasOriginal = originalPerms.includes(perm.perm_key)
                          const isChanged = isActive !== wasOriginal
                          return (
                            <button
                              key={perm.perm_key}
                              onClick={() => toggleDraftPermission(perm.perm_key)}
                              className={`w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-98 relative ${
                                isActive 
                                  ? 'bg-emerald-50 border-emerald-200' 
                                  : 'bg-white border-slate-100 hover:border-slate-200'
                              } ${isChanged ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
                            >
                              {isChanged && (
                                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                                  Draft
                                </span>
                              )}
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isActive ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'
                                }`}>
                                  {isActive ? '✓' : ''}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="font-black text-xs text-slate-900 truncate">{perm.perm_label}</p>
                                    {perm.is_super_only && (
                                      <span className="bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">
                                        Super
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-medium leading-tight">{perm.perm_description}</p>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer - TOMBOL SIMPAN */}
            <div className="p-4 bg-white border-t-2 border-slate-100 flex gap-3">
              <button 
                onClick={handleCloseModal}
                disabled={saving}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {hasChanges ? 'Batal' : 'Tutup'}
              </button>
              <button 
                onClick={handleSaveChanges}
                disabled={!hasChanges || saving}
                className={`flex-[2] py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${
                  hasChanges && !saving
                    ? 'bg-[#003D79] text-white shadow-xl shadow-blue-200 hover:bg-blue-700' 
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                {saving ? '⏳ MENYIMPAN...' : hasChanges ? `💾 SIMPAN ${toAdd.length + toRemove.length} PERUBAHAN` : '💾 TIDAK ADA PERUBAHAN'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
