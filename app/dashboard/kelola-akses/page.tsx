'use client'


// app/dashboard/kelola-akses/page.tsx — v1.1 Batch 1 (fix TypeScript)
import { useState, useEffect, useCallback } from 'react'
import {
  Users, Shield, Search, ChevronDown, ChevronUp, Plus, X,
  RefreshCw, Key, Building2, Filter, UserCog, AlertTriangle,
  CheckCircle, Trash2, Info, Crown, Award
} from 'lucide-react'

// ═══ TYPES ═══
interface Employee {
  nrp: string
  nama: string
  jabatan: string
  departemen: string
  site: string
  is_super_admin: boolean
  roles: string[]
  permissions_count: number
  permissions: string[]
  // ═══ Google Integration ═══
  google_access_enabled?: boolean
  google_email?: string | null
  google_connected_at?: string | null
}

interface RoleTemplate {
  role_key: string
  role_label: string
  role_desc: string
  level: number
  active: boolean
}

interface SiteInfo {
  kode_site: string
  nama_site: string
}

interface MasterPerm {
  perm_key: string
  deskripsi: string
}

// ─── Tab Site Types ───
interface SiteDetail {
  id: string
  nama_site: string
  kode_site: string | null
  alamat: string
  is_pusat: boolean
  active: boolean
  jam_kerja: {
    siang_jam_masuk: string | null
    siang_jam_pulang: string | null
    siang_batas_telat: number | null
    malam_jam_masuk: string | null
    malam_jam_pulang: string | null
    malam_batas_telat: number | null
  }
  gps: {
    latitude: string | number | null
    longitude: string | number | null
    radius_meter: number | null
  }
  summary: {
    total_karyawan: number
    total_pjo: number
    total_hr: number
    total_she: number
    total_gl_plant: number
    total_gl_produksi: number
  }
  pics: {
    pjo_site: PicItem[]
    hr_site: PicItem[]
    she_site: PicItem[]
    gl_plant: PicItem[]
    gl_produksi: PicItem[]
  }
}

// ─── Tab Template Types ───
interface TemplateItem {
  role_key: string
  role_label: string
  role_desc: string
  level: number
  scope: string
  permissions: string[]
  permissions_count: number
}

interface PicItem {
  nrp: string
  nama: string | null
  jabatan: string | null
  departemen: string | null
  site: string | null
}

// ═══ HELPERS ═══
function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('btm_session_token_v1') : null
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function getRoleColor(role: string): string {
  if (role === 'super_admin') return 'bg-rose-100 text-rose-700'
  if (role.includes('director') || role.includes('_ho')) return 'bg-purple-100 text-purple-700'
  if (role.includes('pjo') || role.includes('spv')) return 'bg-blue-100 text-blue-700'
  if (role.includes('gl_')) return 'bg-emerald-100 text-emerald-700'
  if (role === 'employee' || role === 'karyawan') return 'bg-slate-100 text-slate-600'
  return 'bg-amber-100 text-amber-700'
}

function getRoleIcon(role: string): string {
  if (role === 'super_admin') return '👑'
  if (role.includes('director')) return '🏆'
  if (role.includes('_ho')) return '🎯'
  if (role.includes('pjo')) return '🏢'
  if (role.includes('gl_')) return '👷'
  if (role.includes('hr')) return '👥'
  if (role.includes('she')) return '⛑️'
  return '👤'
}

// ═══ MAIN COMPONENT ═══
export default function KelolaAksesPage() {
  const [activeTab, setActiveTab] = useState<'karyawan' | 'site' | 'role' | 'template'>('karyawan')

  const tabs = [
    { key: 'karyawan' as const, label: 'Karyawan', icon: <Users size={15} /> },
    { key: 'site' as const, label: 'Site', icon: <Building2 size={15} /> },
    { key: 'role' as const, label: 'Role', icon: <Award size={15} /> },
    { key: 'template' as const, label: 'Template', icon: <Key size={15} /> },
  ]

  return (
    <div className="bg-[#f4f7fa] p-2 sm:p-3 lg:p-4 pb-24 text-slate-800">
      

      {/* Header */}
      <div className="hidden">
        <h1 className="text-white text-2xl font-black tracking-tight">🔑 Kelola Akses</h1>
        <p className="text-blue-200 text-sm mt-1">Role & Permission Terpusat</p>

        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all
                ${activeTab === t.key
                  ? 'bg-white text-[#003D79] shadow-lg'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'
                }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {activeTab === 'karyawan' && <TabKaryawan />}
        {activeTab === 'site' && <TabSite />}
        {activeTab === 'role' && <TabPlaceholder label="Role" msg="🚧 Tab Role — Segera hadir di Batch 2 (Chat 24)" />}
        {activeTab === 'template' && <TabTemplate />}
      </div>
    </div>
  )
}

// ═══ PLACEHOLDER TAB ═══
function TabPlaceholder({ label, msg }: { label: string; msg: string }) {
  return (
    <div className="text-center py-20 px-6">
      <div className="text-6xl mb-4">🔧</div>
      <div className="text-slate-500 text-lg font-bold">{msg}</div>
      <div className="text-[#5a6a7e] text-sm mt-2">Fokus Chat 23: Tab Karyawan dulu</div>
    </div>
  )
}

// ═══ TAB 1: KARYAWAN ═══
function TabKaryawan() {
  const [data, setData] = useState<Employee[]>([])
  const [roleList, setRoleList] = useState<RoleTemplate[]>([])
  const [siteList, setSiteList] = useState<SiteInfo[]>([])
  const [masterPerms, setMasterPerms] = useState<MasterPerm[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [modal, setModal] = useState<{ type: 'add_role' | 'add_perm'; emp: Employee } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<{ type: 'role' | 'perm'; emp: Employee; item: string } | null>(null)

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterSite) params.set('site', filterSite)
      if (filterRole) params.set('role', filterRole)

      const res = await fetch(`/api/kelola-akses?${params}`, { headers: getAuthHeaders() })
      const json = await res.json()
      if (json.ok) {
        setData(json.data || [])
        setRoleList(json.role_list || [])
        setSiteList(json.site_list || [])
        setMasterPerms(json.master_permissions || [])
      } else {
        showToast(json.error || 'Gagal load', 'err')
      }
    } catch {
      showToast('Error jaringan', 'err')
    }
    setLoading(false)
  }, [search, filterSite, filterRole])

  useEffect(() => {
    const t = setTimeout(load, 400)
    return () => clearTimeout(t)
  }, [load])

  // ═══ Actions ═══
  const handleAction = async (action: string, target_nrp: string, extra: Record<string, string> = {}) => {
    setProcessing(true)
    try {
      const res = await fetch('/api/kelola-akses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ action, target_nrp, ...extra })
      })
      const json = await res.json()
      if (json.ok) {
        showToast('✅ ' + json.message, 'ok')
        setModal(null)
        setConfirmRemove(null)
        load()
      } else {
        showToast(json.error || 'Gagal', 'err')
      }
    } catch {
      showToast('Error jaringan', 'err')
    }
    setProcessing(false)
  }

  // ═══ Handler untuk toggle Google Access ═══
  const handleGoogleToggle = async (target_nrp: string, enabled: boolean) => {
    setProcessing(true)
    try {
      const res = await fetch('/api/kelola-akses/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ action: 'TOGGLE_SINGLE', target_nrp, enabled })
      })
      const json = await res.json()
      if (json.ok) {
        showToast('✅ ' + json.message, 'ok')
        load()
      } else {
        showToast(json.error || 'Gagal', 'err')
      }
    } catch {
      showToast('Error jaringan', 'err')
    }
    setProcessing(false)
  }

  // ═══ Handler untuk bulk preset Google ═══
  const handleGooglePreset = async (preset: 'ALL_ON' | 'ALL_OFF' | 'LEADER_UP' | 'HR_ONLY') => {
    const labels = {
      ALL_ON: 'Aktifkan SEMUA karyawan?',
      ALL_OFF: 'Nonaktifkan SEMUA karyawan?',
      LEADER_UP: 'Aktifkan hanya Leader ke atas (dan nonaktifkan sisanya)?',
      HR_ONLY: 'Aktifkan hanya HR + Admin (dan nonaktifkan sisanya)?'
    }
    if (!confirm(labels[preset])) return

    setProcessing(true)
    try {
      const res = await fetch('/api/kelola-akses/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ action: 'BULK_PRESET', preset })
      })
      const json = await res.json()
      if (json.ok) {
        showToast('✅ ' + json.message, 'ok')
        load()
      } else {
        showToast(json.error || 'Gagal', 'err')
      }
    } catch {
      showToast('Error jaringan', 'err')
    }
    setProcessing(false)
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-white text-sm font-bold shadow-lg
          ${toast.type === 'ok' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6a7e]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Cari nama atau NRP..."
            className="w-full pl-9 pr-4 py-3 bg-white rounded-[1.2rem] text-sm shadow border-0 outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select value={filterSite} onChange={e => setFilterSite(e.target.value)}
            className="flex-1 px-3 py-2 bg-white rounded-[1.2rem] text-sm shadow border-0 outline-none">
            <option value="">Semua Site</option>
            {siteList.map(s => <option key={s.kode_site} value={s.kode_site}>{s.nama_site}</option>)}
          </select>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="flex-1 px-3 py-2 bg-white rounded-[1.2rem] text-sm shadow border-0 outline-none">
            <option value="">Semua Role</option>
            {roleList.map(r => <option key={r.role_key} value={r.role_key}>{r.role_label || r.role_key}</option>)}
          </select>
          <button onClick={load} className="p-2 bg-white rounded-[1.2rem] shadow">
            <RefreshCw size={14} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* ═══ BULK PRESET GOOGLE ACCESS ═══ */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-[1.2rem] p-3">
        <div className="text-[9px] font-black uppercase tracking-widest text-emerald-700 mb-2 flex items-center gap-1">
          🔑 Bulk Preset Akses Google
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleGooglePreset('ALL_ON')}
            disabled={processing}
            className="text-[10px] font-bold py-2 px-2 bg-white text-emerald-700 rounded-lg hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50"
          >
            ✅ Aktifkan Semua
          </button>
          <button
            onClick={() => handleGooglePreset('ALL_OFF')}
            disabled={processing}
            className="text-[10px] font-bold py-2 px-2 bg-white text-rose-700 rounded-lg hover:bg-rose-100 border border-rose-200 disabled:opacity-50"
          >
            ❌ Nonaktifkan Semua
          </button>
          <button
            onClick={() => handleGooglePreset('LEADER_UP')}
            disabled={processing}
            className="text-[10px] font-bold py-2 px-2 bg-white text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 disabled:opacity-50"
          >
            👑 Leader Up
          </button>
          <button
            onClick={() => handleGooglePreset('HR_ONLY')}
            disabled={processing}
            className="text-[10px] font-bold py-2 px-2 bg-white text-purple-700 rounded-lg hover:bg-purple-100 border border-purple-200 disabled:opacity-50"
          >
            🗂️ HR Only
          </button>
        </div>
      </div>

      {/* Info bar */}
      <div className="bg-blue-50 border border-blue-100 rounded-[1.2rem] p-3 text-xs text-blue-800 flex items-start gap-2">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <div>
          <strong>{data.length} karyawan</strong> ditemukan. Klik card untuk lihat detail role + permission dan kelola aksesnya.
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5a6a7e]">Memuat data...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">🔍</div>
          <div className="text-slate-500 text-sm">Tidak ada karyawan ditemukan</div>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map(emp => (
            <div key={emp.nrp} className="bg-white rounded-[1.5rem] shadow-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === emp.nrp ? null : emp.nrp)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {emp.is_super_admin && <Crown size={14} className="text-[#003d79] flex-shrink-0" />}
                    <span className="font-black text-[#003D79] text-sm truncate">{emp.nama}</span>
                  </div>
                  <div className="text-[10px] text-[#5a6a7e] mt-0.5">
                    {emp.nrp} · {emp.site} · {emp.departemen}
                  </div>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {emp.roles.slice(0, 3).map(r => (
                      <span key={r} className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${getRoleColor(r)}`}>
                        {getRoleIcon(r)} {r}
                      </span>
                    ))}
                    {emp.roles.length > 3 && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        +{emp.roles.length - 3}
                      </span>
                    )}
                    {emp.permissions_count > 0 && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        🔐 {emp.permissions_count} perm
                      </span>
                    )}
                    {/* ═══ Badge Google Access ═══ */}
                    {emp.google_access_enabled ? (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {emp.google_email ? '🟢 G-Connected' : '✅ G-Allowed'}
                      </span>
                    ) : (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        ⚫ G-Off
                      </span>
                    )}
                  </div>
                </div>
                {expanded === emp.nrp ? <ChevronUp size={18} className="text-[#5a6a7e]" /> : <ChevronDown size={18} className="text-[#5a6a7e]" />}
              </button>

              {/* Detail expand */}
              {expanded === emp.nrp && (
                <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-4">
                  {/* Section Roles */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                        <Award size={11} /> Roles ({emp.roles.length})
                      </div>
                      <button
                        onClick={() => setModal({ type: 'add_role', emp })}
                        className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full hover:bg-emerald-100"
                      >
                        <Plus size={10} className="inline" /> Tambah
                      </button>
                    </div>
                    {emp.roles.length === 0 ? (
                      <div className="text-xs text-[#5a6a7e] italic">Belum ada role</div>
                    ) : (
                      <div className="space-y-1.5">
                        {emp.roles.map(r => (
                          <div key={r} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
                            <span className={`text-xs font-black px-2 py-1 rounded-full ${getRoleColor(r)}`}>
                              {getRoleIcon(r)} {r}
                            </span>
                            <button
                              onClick={() => setConfirmRemove({ type: 'role', emp, item: r })}
                              className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section Permissions */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                        <Key size={11} /> Permission Granular ({emp.permissions_count})
                      </div>
                      <button
                        onClick={() => setModal({ type: 'add_perm', emp })}
                        className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full hover:bg-indigo-100"
                      >
                        <Plus size={10} className="inline" /> Tambah
                      </button>
                    </div>
                    {emp.permissions.length === 0 ? (
                      <div className="text-xs text-[#5a6a7e] italic">Tidak ada permission tambahan</div>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {emp.permissions.map(p => (
                          <div key={p} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
                            <span className="text-xs font-mono text-indigo-700">{p}</span>
                            <button
                              onClick={() => setConfirmRemove({ type: 'perm', emp, item: p })}
                              className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ═══════════════════════════════════════ */}
                  {/* ═══ SECTION: GOOGLE INTEGRATION ═══   */}
                  {/* ═══════════════════════════════════════ */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                        🔑 Akses Google Integration
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-3 space-y-3">
                      {/* Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="text-xs font-bold text-slate-700">
                            Izin Connect Google
                          </div>
                          <div className="text-[10px] text-[#5a6a7e] mt-0.5">
                            Calendar, Tasks, Gmail
                          </div>
                        </div>
                        <button
                          onClick={() => handleGoogleToggle(emp.nrp, !emp.google_access_enabled)}
                          disabled={processing}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            emp.google_access_enabled ? 'bg-emerald-600' : 'bg-slate-300'
                          } ${processing ? 'opacity-50' : ''}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              emp.google_access_enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Status connect */}
                      {emp.google_email ? (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 flex items-start gap-2">
                          <CheckCircle size={12} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-black text-emerald-800 uppercase">Sudah Connect</div>
                            <div className="text-xs font-mono text-emerald-700 truncate">{emp.google_email}</div>
                            {emp.google_connected_at && (
                              <div className="text-[9px] text-emerald-600 mt-0.5">
                                Sejak: {new Date(emp.google_connected_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : emp.google_access_enabled ? (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 flex items-start gap-2">
                          <Info size={12} className="text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="text-[10px] text-blue-800">
                            Diizinkan tapi belum connect. User bisa connect dari menu <strong>Data Saya</strong>.
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex items-start gap-2">
                          <Info size={12} className="text-slate-500 flex-shrink-0 mt-0.5" />
                          <div className="text-[10px] text-slate-600">
                            Belum diizinkan. Aktifkan toggle di atas untuk memberi akses.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Role */}
      {modal?.type === 'add_role' && (
        <ModalAddRole
          emp={modal.emp}
          roleList={roleList}
          onClose={() => setModal(null)}
          onSubmit={(role: string) => handleAction('ADD_ROLE', modal.emp.nrp, { role })}
          processing={processing}
        />
      )}

      {/* Modal Add Perm */}
      {modal?.type === 'add_perm' && (
        <ModalAddPerm
          emp={modal.emp}
          masterPerms={masterPerms}
          onClose={() => setModal(null)}
          onSubmit={(perm_key: string) => handleAction('ADD_PERM', modal.emp.nrp, { perm_key })}
          processing={processing}
        />
      )}

      {/* Confirm Remove */}
      {confirmRemove && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl">
            <div className="text-center mb-4">
              <AlertTriangle size={40} className="text-[#003d79] mx-auto mb-2" />
              <h3 className="font-black text-[#003D79]">
                Hapus {confirmRemove.type === 'role' ? 'Role' : 'Permission'}?
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                {confirmRemove.emp.nama} akan kehilangan{' '}
                <strong className="text-rose-600">{confirmRemove.item}</strong>
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemove(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-[1.2rem]">
                Batal
              </button>
              <button
                onClick={() => handleAction(
                  confirmRemove.type === 'role' ? 'REMOVE_ROLE' : 'REMOVE_PERM',
                  confirmRemove.emp.nrp,
                  confirmRemove.type === 'role' ? { role: confirmRemove.item } : { perm_key: confirmRemove.item }
                )}
                disabled={processing}
                className={`flex-1 py-3 bg-rose-600 text-white font-bold rounded-[1.2rem] ${processing ? 'opacity-50' : 'hover:bg-rose-700'}`}
              >
                {processing ? '...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══ MODAL ADD ROLE ═══
interface ModalAddRoleProps {
  emp: Employee
  roleList: RoleTemplate[]
  onClose: () => void
  onSubmit: (role: string) => void
  processing: boolean
}

function ModalAddRole({ emp, roleList, onClose, onSubmit, processing }: ModalAddRoleProps) {
  const [selectedRole, setSelectedRole] = useState('')
  const existingRoles = emp.roles || []
  const availableRoles = roleList.filter(r => !existingRoles.includes(r.role_key))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl">
        <h3 className="font-black text-[#003D79] text-lg mb-1">➕ Tambah Role</h3>
        <p className="text-xs text-[#5a6a7e] mb-4">{emp.nama} ({emp.nrp})</p>

        {availableRoles.length === 0 ? (
          <div className="text-center py-6 text-[#5a6a7e] text-sm">
            Semua role sudah dimiliki karyawan ini
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
            {availableRoles.map(r => (
              <button
                key={r.role_key}
                onClick={() => setSelectedRole(r.role_key)}
                className={`w-full p-3 rounded-[1.2rem] text-left flex items-center justify-between transition-all
                  ${selectedRole === r.role_key
                    ? 'bg-[#003D79] text-white ring-2 ring-[#003D79]'
                    : 'bg-slate-50 hover:bg-slate-100'}`}
              >
                <div>
                  <div className={`font-bold text-sm ${selectedRole === r.role_key ? 'text-white' : 'text-[#003D79]'}`}>
                    {getRoleIcon(r.role_key)} {r.role_label || r.role_key}
                  </div>
                  {r.role_desc && (
                    <div className={`text-[10px] mt-0.5 ${selectedRole === r.role_key ? 'text-blue-100' : 'text-slate-500'}`}>
                      {r.role_desc}
                    </div>
                  )}
                  <div className={`text-[10px] ${selectedRole === r.role_key ? 'text-blue-200' : 'text-[#5a6a7e]'}`}>
                    {r.role_key} · Level {r.level}
                  </div>
                </div>
                {selectedRole === r.role_key && <CheckCircle size={16} className="text-emerald-400" />}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-[1.2rem]">
            Batal
          </button>
          <button
            onClick={() => selectedRole && onSubmit(selectedRole)}
            disabled={!selectedRole || processing}
            className={`flex-1 py-3 bg-[#003D79] text-white font-bold rounded-[1.2rem] transition-all
              ${(!selectedRole || processing) ? 'opacity-50' : 'hover:bg-[#002D5F]'}`}
          >
            {processing ? '...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══ MODAL ADD PERM ═══
interface ModalAddPermProps {
  emp: Employee
  masterPerms: MasterPerm[]
  onClose: () => void
  onSubmit: (perm_key: string) => void
  processing: boolean
}

function ModalAddPerm({ emp, masterPerms, onClose, onSubmit, processing }: ModalAddPermProps) {
  const [selectedPerm, setSelectedPerm] = useState('')
  const [search, setSearch] = useState('')
  const existing = emp.permissions || []
  const available = masterPerms.filter(p =>
    !existing.includes(p.perm_key) &&
    (!search || p.perm_key.toLowerCase().includes(search.toLowerCase()) || (p.deskripsi || '').toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl">
        <h3 className="font-black text-[#003D79] text-lg mb-1">🔐 Tambah Permission</h3>
        <p className="text-xs text-[#5a6a7e] mb-4">{emp.nama} ({emp.nrp})</p>

        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6a7e]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari permission..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-[1.2rem] text-sm outline-none" />
        </div>

        {available.length === 0 ? (
          <div className="text-center py-6 text-[#5a6a7e] text-sm">
            {existing.length > 0 ? 'Tidak ada permission lain' : 'Master permission kosong'}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto mb-4">
            {available.map(p => (
              <button
                key={p.perm_key}
                onClick={() => setSelectedPerm(p.perm_key)}
                className={`w-full p-2.5 rounded-xl text-left transition-all
                  ${selectedPerm === p.perm_key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-50 hover:bg-slate-100'}`}
              >
                <div className={`font-mono text-xs font-bold ${selectedPerm === p.perm_key ? 'text-white' : 'text-indigo-700'}`}>
                  {p.perm_key}
                </div>
                {p.deskripsi && (
                  <div className={`text-[10px] mt-0.5 ${selectedPerm === p.perm_key ? 'text-indigo-100' : 'text-slate-500'}`}>
                    {p.deskripsi}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-[1.2rem]">
            Batal
          </button>
          <button
            onClick={() => selectedPerm && onSubmit(selectedPerm)}
            disabled={!selectedPerm || processing}
            className={`flex-1 py-3 bg-indigo-600 text-white font-bold rounded-[1.2rem] transition-all
              ${(!selectedPerm || processing) ? 'opacity-50' : 'hover:bg-indigo-700'}`}
          >
            {processing ? '...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══ TAB 2: SITE ═══
function TabSite() {
  const [sites, setSites] = useState<SiteDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('btm_session_token_v1') : null
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/kelola-akses/sites', { headers })
      const json = await res.json()
      if (json.ok) {
        setSites(json.data || [])
      } else {
        setError(json.error || 'Gagal memuat data site')
      }
    } catch {
      setError('Error jaringan')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const PIC_CONFIG = [
    { key: 'pjo_site',    label: 'PJO / Site Leader', icon: '🏢', color: 'bg-blue-100 text-blue-700' },
    { key: 'hr_site',     label: 'HRGA Site',          icon: '👥', color: 'bg-purple-100 text-purple-700' },
    { key: 'she_site',    label: 'SHE Site',           icon: '⛑️', color: 'bg-amber-100 text-amber-700' },
    { key: 'gl_plant',    label: 'GL Plant',           icon: '👷', color: 'bg-emerald-100 text-emerald-700' },
    { key: 'gl_produksi', label: 'GL Produksi',        icon: '⚙️', color: 'bg-orange-100 text-orange-700' },
  ] as const

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3 animate-pulse">🏗️</div>
        <div className="text-[#5a6a7e] text-sm">Memuat data site...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20 px-6">
        <div className="text-4xl mb-3">⚠️</div>
        <div className="text-rose-500 font-bold text-sm mb-3">{error}</div>
        <button onClick={load}
          className="px-4 py-2 bg-[#003D79] text-white text-sm font-bold rounded-full">
          Coba Lagi
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Info bar */}
      <div className="bg-blue-50 border border-blue-100 rounded-[1.2rem] p-3 text-xs text-blue-800 flex items-start gap-2">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <div>
          <strong>{sites.length} site aktif</strong> terdaftar.
          Tap card untuk lihat detail jam kerja, GPS, dan PIC per role.
        </div>
      </div>

      {/* Site Cards */}
      {sites.map(site => (
        <div key={site.id} className="bg-white rounded-[1.5rem] shadow-xl overflow-hidden">

          {/* Card Header */}
          <button
            onClick={() => setExpanded(expanded === site.id ? null : site.id)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{site.is_pusat ? '🏛️' : '🏗️'}</span>
                <div>
                  <div className="font-black text-[#003D79] text-sm">{site.nama_site}</div>
                  <div className="text-[10px] text-[#5a6a7e] mt-0.5">
                    {site.kode_site || '—'} · {site.alamat || 'Alamat belum diisi'}
                  </div>
                </div>
              </div>

              {/* Summary badges */}
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  👤 {site.summary.total_karyawan} karyawan
                </span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  🏢 {site.summary.total_pjo} PJO
                </span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  👷 {site.summary.total_gl_plant + site.summary.total_gl_produksi} GL
                </span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  👥 {site.summary.total_hr} HR
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full
                ${site.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {site.active ? 'AKTIF' : 'NON-AKTIF'}
              </span>
              {expanded === site.id
                ? <ChevronUp size={18} className="text-[#5a6a7e]" />
                : <ChevronDown size={18} className="text-[#5a6a7e]" />
              }
            </div>
          </button>

          {/* Expanded Detail */}
          {expanded === site.id && (
            <div className="border-t border-slate-100 bg-slate-50/50 divide-y divide-slate-100">

              {/* Jam Kerja */}
              <div className="p-4">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">
                  ⏰ Jam Kerja
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Siang */}
                  <div className="bg-amber-50 rounded-[1.2rem] p-3">
                    <div className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-2">
                      ☀️ Siang
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Masuk</span>
                        <span className="font-bold text-slate-700">
                          {site.jam_kerja.siang_jam_masuk?.slice(0, 5) || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Pulang</span>
                        <span className="font-bold text-slate-700">
                          {site.jam_kerja.siang_jam_pulang?.slice(0, 5) || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Toleransi</span>
                        <span className="font-bold text-amber-600">
                          {site.jam_kerja.siang_batas_telat ?? '—'} menit
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Malam */}
                  <div className="bg-indigo-50 rounded-[1.2rem] p-3">
                    <div className="text-[9px] font-black text-indigo-700 uppercase tracking-widest mb-2">
                      🌙 Malam
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Masuk</span>
                        <span className="font-bold text-slate-700">
                          {site.jam_kerja.malam_jam_masuk?.slice(0, 5) || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Pulang</span>
                        <span className="font-bold text-slate-700">
                          {site.jam_kerja.malam_jam_pulang?.slice(0, 5) || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Toleransi</span>
                        <span className="font-bold text-indigo-600">
                          {site.jam_kerja.malam_batas_telat ?? '—'} menit
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* GPS */}
              <div className="p-4">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">
                  📍 Lokasi GPS
                </div>
                {site.gps.latitude && site.gps.longitude ? (
                  <div className="bg-white rounded-[1.2rem] p-3 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Latitude</span>
                      <span className="font-mono font-bold text-slate-700">{site.gps.latitude}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Longitude</span>
                      <span className="font-mono font-bold text-slate-700">{site.gps.longitude}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Radius</span>
                      <span className="font-bold text-emerald-600">{site.gps.radius_meter?.toLocaleString('id')} meter</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[#5a6a7e] italic bg-white rounded-[1.2rem] p-3">
                    📍 GPS belum dikonfigurasi untuk site ini
                  </div>
                )}
              </div>

              {/* PIC per Role */}
              <div className="p-4">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">
                  👤 PIC per Role
                </div>
                <div className="space-y-2">
                  {PIC_CONFIG.map(pic => {
                    const members = site.pics[pic.key] || []
                    return (
                      <div key={pic.key} className="bg-white rounded-[1.2rem] p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${pic.color}`}>
                            {pic.icon} {pic.label}
                          </span>
                          <span className="text-[9px] text-[#5a6a7e] font-bold">
                            {members.length} orang
                          </span>
                        </div>

                        {members.length === 0 ? (
                          <div className="text-xs text-[#5a6a7e] italic">Belum ada yang ditugaskan</div>
                        ) : (
                          <div className="space-y-1">
                            {members.map(m => (
                              <div key={m.nrp} className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 flex-shrink-0">
                                  {(m.nama || '?')[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-bold text-slate-700 truncate">{m.nama}</div>
                                  <div className="text-[9px] text-[#5a6a7e]">{m.nrp} · {m.jabatan || '—'}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          )}
        </div>
      ))}

      {/* Note */}
      <div className="bg-amber-50 border border-amber-100 rounded-[1.2rem] p-3 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
        <div>
          <strong>Mode Read-Only.</strong> Edit jam kerja, GPS, dan PIC akan tersedia di update berikutnya.
          Untuk ubah PIC, gunakan Tab Karyawan → Add/Remove Role.
        </div>
      </div>

    </div>
  )
}

// ═══ TAB 4: TEMPLATE ═══
function TabTemplate() {
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [applyModal, setApplyModal] = useState<TemplateItem | null>(null)
  const [searchEmp, setSearchEmp] = useState('')
  const [empResults, setEmpResults] = useState<{ nrp: string; nama: string; site: string; jabatan: string }[]>([])
  const [searchingEmp, setSearchingEmp] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState<{ nrp: string; nama: string } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const showToast = (msg: string, type: 'ok' | 'err') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const loadTemplates = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/kelola-akses/templates', { headers: getAuthHeaders() })
      const json = await res.json()
      if (json.ok) {
        setTemplates(json.data || [])
      } else {
        setError(json.error || 'Gagal memuat template')
      }
    } catch {
      setError('Error jaringan')
    }
    setLoading(false)
  }

  useEffect(() => { loadTemplates() }, [])

  // Search karyawan untuk apply
  useEffect(() => {
    if (!applyModal || searchEmp.length < 2) {
      setEmpResults([])
      return
    }
    const t = setTimeout(async () => {
      setSearchingEmp(true)
      try {
        const params = new URLSearchParams({ search: searchEmp, limit: '10' })
        const res = await fetch(`/api/employees?${params}`, { headers: getAuthHeaders() })
        const json = await res.json()
        if (json.ok) {
          setEmpResults(json.data || [])
        }
      } catch { /* ignore */ }
      setSearchingEmp(false)
    }, 400)
    return () => clearTimeout(t)
  }, [searchEmp, applyModal])

  const handleApply = async () => {
    if (!applyModal || !selectedEmp) return
    setProcessing(true)
    try {
      const res = await fetch('/api/kelola-akses/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ target_nrp: selectedEmp.nrp, role_key: applyModal.role_key })
      })
      const json = await res.json()
      if (json.ok) {
        showToast(`✅ ${json.message}`, 'ok')
        closeApplyModal()
      } else {
        showToast(json.error || 'Gagal', 'err')
      }
    } catch {
      showToast('Error jaringan', 'err')
    }
    setProcessing(false)
  }

  const closeApplyModal = () => {
    setApplyModal(null)
    setSearchEmp('')
    setEmpResults([])
    setSelectedEmp(null)
  }

  const getScopeColor = (scope: string) => {
    if (scope === 'ALL') return 'bg-purple-100 text-purple-700'
    if (scope === 'SITE') return 'bg-blue-100 text-blue-700'
    if (scope === 'TEAM') return 'bg-emerald-100 text-emerald-700'
    return 'bg-slate-100 text-slate-600'
  }

  const getLevelLabel = (level: number) => {
    if (level === 0) return '👑 Owner'
    if (level === 1) return '🏆 Executive'
    if (level === 2) return '🎯 HO Staff'
    if (level === 3) return '🏢 Site Leader'
    if (level === 4) return '👷 Team Leader'
    return '👤 Karyawan'
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3 animate-pulse">📋</div>
        <div className="text-[#5a6a7e] text-sm">Memuat template...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20 px-6">
        <div className="text-4xl mb-3">⚠️</div>
        <div className="text-rose-500 font-bold text-sm mb-3">{error}</div>
        <button onClick={loadTemplates}
          className="px-4 py-2 bg-[#003D79] text-white text-sm font-bold rounded-full">
          Coba Lagi
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-white text-sm font-bold shadow-lg
          ${toast.type === 'ok' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Info bar */}
      <div className="bg-blue-50 border border-blue-100 rounded-[1.2rem] p-3 text-xs text-blue-800 flex items-start gap-2">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <div>
          <strong>{templates.length} template</strong> tersedia.
          Tap card untuk lihat detail permission. Klik &quot;Terapkan&quot; untuk assign role + permission ke karyawan sekaligus.
        </div>
      </div>

      {/* Template Cards */}
      {templates.map(tpl => (
        <div key={tpl.role_key} className="bg-white rounded-[1.5rem] shadow-xl overflow-hidden">

          {/* Card Header */}
          <button
            onClick={() => setExpanded(expanded === tpl.role_key ? null : tpl.role_key)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getRoleIcon(tpl.role_key)}</span>
                <div>
                  <div className="font-black text-[#003D79] text-sm">{tpl.role_label}</div>
                  <div className="text-[10px] text-[#5a6a7e] mt-0.5">{tpl.role_desc}</div>
                </div>
              </div>

              <div className="flex gap-1.5 mt-2 flex-wrap">
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {getLevelLabel(tpl.level)}
                </span>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${getScopeColor(tpl.scope)}`}>
                  {tpl.scope}
                </span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  🔐 {tpl.permissions_count} permission
                </span>
              </div>
            </div>

            <div className="ml-2 flex-shrink-0">
              {expanded === tpl.role_key
                ? <ChevronUp size={18} className="text-[#5a6a7e]" />
                : <ChevronDown size={18} className="text-[#5a6a7e]" />
              }
            </div>
          </button>

          {/* Expanded Detail */}
          {expanded === tpl.role_key && (
            <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-4">

              {/* Permissions list */}
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  🔐 Permission Bawaan ({tpl.permissions_count})
                </div>
                {tpl.permissions.length === 0 ? (
                  <div className="text-xs text-[#5a6a7e] italic">Template ini belum punya permission</div>
                ) : (
                  <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
                    {tpl.permissions.sort().map(p => (
                      <div key={p} className="bg-white rounded-xl px-3 py-1.5 text-xs font-mono text-indigo-700">
                        {p}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Apply button */}
              <button
                onClick={() => setApplyModal(tpl)}
                className="w-full py-3 bg-[#003D79] text-white font-bold text-sm rounded-[1.2rem] hover:bg-[#002D5F] transition-colors flex items-center justify-center gap-2"
              >
                <UserCog size={16} /> Terapkan ke Karyawan
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Apply Modal */}
      {applyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-black text-[#003D79] text-lg mb-1">
              📋 Terapkan Template
            </h3>
            <p className="text-xs text-slate-500 mb-1">
              Template: <strong className="text-[#003D79]">{applyModal.role_label}</strong>
            </p>
            <p className="text-[10px] text-[#5a6a7e] mb-4">
              Akan menambah role <strong>{applyModal.role_key}</strong> + {applyModal.permissions_count} permission.
              Akses lama karyawan <strong>tidak akan dihapus</strong>.
            </p>

            {/* Search karyawan */}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6a7e]" />
              <input
                value={searchEmp}
                onChange={e => { setSearchEmp(e.target.value); setSelectedEmp(null) }}
                placeholder="Ketik nama atau NRP karyawan..."
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-[1.2rem] text-sm outline-none focus:border-[#003D79]"
              />
            </div>

            {/* Selected indicator */}
            {selectedEmp && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-[1.2rem] p-3 mb-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <div className="text-sm font-bold text-emerald-800">{selectedEmp.nama}</div>
                  <div className="text-[10px] text-emerald-600">NRP: {selectedEmp.nrp}</div>
                </div>
                <button onClick={() => setSelectedEmp(null)} className="ml-auto p-1">
                  <X size={14} className="text-emerald-500" />
                </button>
              </div>
            )}

            {/* Search results */}
            {!selectedEmp && searchEmp.length >= 2 && (
              <div className="mb-4">
                {searchingEmp ? (
                  <div className="text-xs text-[#5a6a7e] text-center py-4">Mencari...</div>
                ) : empResults.length === 0 ? (
                  <div className="text-xs text-[#5a6a7e] text-center py-4">
                    Tidak ditemukan karyawan &quot;{searchEmp}&quot;
                  </div>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {empResults.map(e => (
                      <button
                        key={e.nrp}
                        onClick={() => { setSelectedEmp({ nrp: e.nrp, nama: e.nama }); setSearchEmp('') }}
                        className="w-full p-3 rounded-[1.2rem] text-left bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="font-bold text-sm text-[#003D79]">{e.nama}</div>
                        <div className="text-[10px] text-[#5a6a7e]">
                          {e.nrp} · {e.site || '—'} · {e.jabatan || '—'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 mt-4">
              <button onClick={closeApplyModal}
                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-[1.2rem]">
                Batal
              </button>
              <button
                onClick={handleApply}
                disabled={!selectedEmp || processing}
                className={`flex-1 py-3 bg-[#003D79] text-white font-bold rounded-[1.2rem] transition-all
                  ${(!selectedEmp || processing) ? 'opacity-50' : 'hover:bg-[#002D5F]'}`}
              >
                {processing ? 'Menerapkan...' : '✅ Terapkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    

      </div>
  )
}