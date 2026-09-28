'use client'


import PageHeader from "@/app/components/PageHeader";
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Unit {
  id: string
  kode_unit: string
  nama_unit: string
  kategori: string
  merk_model: string | null
  status: 'RFU' | 'BD'
  effective_status: 'RFU' | 'BD'
  is_spare: boolean
  assignment: any
  assignedOperator: { nrp: string; nama: string; jabatan: string } | null
}

interface Operator {
  nrp: string
  nama: string
  jabatan: string
  default_unit?: string | null
}

interface Assignment {
  unit_kode: string
  nrp: string | null
  status_unit: 'RFU' | 'BD'
  keterangan: string | null
}

export default function SettingUnitPage() {
  const router = useRouter()
  const tableRef = useRef<HTMLDivElement>(null)

  // ═══ Filter State ═══
  const [tanggal, setTanggal] = useState(() => {
    // Default: besok
    const t = new Date()
    t.setDate(t.getDate() + 1)
    return t.toISOString().split('T')[0]
  })
  const [shift, setShift] = useState<'S' | 'M'>('S')
  const [site, setSite] = useState('')
  const [siteList, setSiteList] = useState<string[]>([])

  // ═══ Data State ═══
  const [grouped, setGrouped] = useState<Record<string, Unit[]>>({})
  const [operators, setOperators] = useState<Operator[]>([])
  const [assignments, setAssignments] = useState<Map<string, Assignment>>(new Map())
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [dirty, setDirty] = useState(false)

  // ═══ Copy modal ═══
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyDate, setCopyDate] = useState('')
  const [copyShift, setCopyShift] = useState<'S' | 'M'>('S')
  const [copying, setCopying] = useState(false)

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

  // Load data when filter changes
  useEffect(() => {
    if (tanggal && shift && site) loadData()
  }, [tanggal, shift, site])

  async function loadData() {
    setLoading(true)
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const params = new URLSearchParams({ tanggal, shift, site })
      const res = await fetch(`/api/unit-assignments?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const d = await res.json()
      if (!d.ok) { alert('Gagal load: ' + d.error); return }

      setGrouped(d.grouped || {})
      setOperators(d.operators || [])
      setStats(d.stats)

      // Build assignment map dari existing
      const map = new Map<string, Assignment>()
      Object.values(d.grouped as Record<string, Unit[]>).flat().forEach(u => {
        map.set(u.kode_unit, {
          unit_kode: u.kode_unit,
          nrp: u.assignment?.nrp || null,
          status_unit: u.assignment?.status_unit || u.status,
          keterangan: u.assignment?.keterangan || null
        })
      })
      setAssignments(map)
      setDirty(false)
    } catch (err: any) {
      alert('Gagal: ' + err.message)
    } finally { setLoading(false) }
  }

  function updateAssignment(unit_kode: string, patch: Partial<Assignment>) {
    const newMap = new Map(assignments)
    const existing = newMap.get(unit_kode) || { unit_kode, nrp: null, status_unit: 'RFU', keterangan: null }
    newMap.set(unit_kode, { ...existing, ...patch })
    setAssignments(newMap)
    setDirty(true)
  }

  async function handleSave() {
    // Validasi duplikat operator
    const nrpCount = new Map<string, string[]>()
    assignments.forEach((a, unit) => {
      if (a.nrp) {
        if (!nrpCount.has(a.nrp)) nrpCount.set(a.nrp, [])
        nrpCount.get(a.nrp)!.push(unit)
      }
    })

    const dups: string[] = []
    nrpCount.forEach((units, nrp) => {
      if (units.length > 1) {
        const op = operators.find(o => o.nrp === nrp)
        dups.push(`${op?.nama || nrp} di ${units.join(', ')}`)
      }
    })

    if (dups.length > 0) {
      alert(`⚠️ Operator ganda:\n\n${dups.join('\n')}\n\n1 operator hanya boleh 1 unit per shift!`)
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const arr = Array.from(assignments.values())
      const res = await fetch('/api/unit-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ tanggal, shift, site, assignments: arr })
      })
      const json = await res.json()
      if (!res.ok) { alert('Gagal: ' + json.error); return }

      alert(json.message)
      loadData()
    } catch (err: any) {
      alert('Gagal: ' + err.message)
    } finally { setSaving(false) }
  }

  async function handleCopy() {
    if (!copyDate) { alert('Pilih tanggal sumber'); return }

    setCopying(true)
    try {
      const token = localStorage.getItem('btm_session_token_v1') || ''
      const res = await fetch('/api/unit-assignments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          source_tanggal: copyDate,
          source_shift: copyShift,
          target_tanggal: tanggal,
          target_shift: shift,
          site
        })
      })
      const json = await res.json()
      if (!res.ok) { alert('Gagal: ' + json.error); return }

      alert(json.message)
      setShowCopyModal(false)
      loadData()
    } catch (err: any) {
      alert('Gagal: ' + err.message)
    } finally { setCopying(false) }
  }

  // ═══ Download PNG (screenshot table) ═══
  async function handleDownloadPNG() {
    if (!tableRef.current) return

    setDownloading(true)
    try {
      // Dynamic import html2canvas
      const html2canvas = (await import('html2canvas-pro')).default
      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      })

      const link = document.createElement('a')
      link.download = `Setting_Unit_${site}_${tanggal}_${shift === 'S' ? 'SIANG' : 'MALAM'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err: any) {
      alert('Gagal download PNG: ' + err.message + '\n\nPastikan sudah install html2canvas-pro:\nnpm install html2canvas-pro')
    } finally { setDownloading(false) }
  }

  // ═══ Copy broadcast text ═══
  function handleCopyBroadcast() {
    const dateStr = new Date(tanggal).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).toUpperCase()
    const shiftStr = shift === 'S' ? '1 || SIANG' : '2 || MALAM'

    let text = `*SETTINGAN UNIT PT BOSTON TRIKORA MAHARDIKA*\n`
    text += `*Tanggal : ${dateStr}*\n`
    text += `*SHIFT   : ${shiftStr}*\n`
    text += `=======================\n\n`

    Object.entries(grouped).forEach(([kategori, units]) => {
      text += `*${kategori}*\n`
      units.forEach((u, i) => {
        const a = assignments.get(u.kode_unit)
        const op = a?.nrp ? operators.find(o => o.nrp === a.nrp) : null
        const status = a?.status_unit === 'BD'
          ? `BD${a.keterangan ? ' ' + a.keterangan : ''}`
          : 'RFU'
        const opName = op?.nama || (a?.status_unit === 'BD' ? '' : 'no oprt')
        text += `${i + 1}. ${u.nama_unit || u.kode_unit} || ${status} || ${opName}\n`
      })
      text += '\n'
    })

    // Spare operators (yang tidak di-assign)
    const assignedNrps = new Set(
      Array.from(assignments.values()).filter(a => a.nrp).map(a => a.nrp)
    )
    const spareOps = operators.filter(o => !assignedNrps.has(o.nrp))

    if (spareOps.length > 0) {
      text += `*SPARE OPERATOR*\n`
      spareOps.forEach((op, i) => {
        text += `${i + 1}. ${op.nama}\n`
      })
    }

    navigator.clipboard.writeText(text)
      .then(() => alert('✅ Broadcast text berhasil dicopy!\n\nTinggal paste ke WhatsApp.'))
      .catch(() => {
        // Fallback: show text di prompt untuk copy manual
        prompt('Copy manual (Ctrl+C):', text)
      })
  }

  const totalKategori = Object.keys(grouped).length
  const totalUnit = Object.values(grouped).flat().length
  const dateStr = tanggal ? new Date(tanggal).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }) : ''

  return (
    <div className="min-h-screen bg-[#f4f7fa] p-2 sm:p-3 lg:p-4 pb-24 text-slate-800">
      <PageHeader title="Setting Unit" backUrl="/dashboard" />

      {/* HERO */}
      <div className="hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        <button onClick={() => router.back()}
          className="mb-3 flex items-center gap-1.5 text-white/60 hover:text-white text-sm relative z-10">
          ← Kembali
        </button>
        <div className="relative z-10">
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-300 mb-1">GL Produksi Tools</p>
          <h1 className="text-xl font-black text-white">🎯 Setting Unit</h1>
          <p className="text-blue-200 text-sm mt-1">Assign operator ke unit per shift</p>
        </div>
      </div>

      <div className="px-4 space-y-4 relative z-10">
        {/* FILTER */}
        <div className="bg-white rounded-2xl shadow-xl p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] font-black uppercase text-[#5a6a7e] block mb-1">📅 Tanggal</label>
              <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs bg-slate-50 font-bold" />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-[#5a6a7e] block mb-1">☀️/🌙 Shift</label>
              <select value={shift} onChange={e => setShift(e.target.value as any)}
                className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs bg-slate-50 font-bold">
                <option value="S">☀️ SIANG</option>
                <option value="M">🌙 MALAM</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-[#5a6a7e] block mb-1">🏗️ Site</label>
              <select value={site} onChange={e => setSite(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs bg-slate-50 font-bold">
                {siteList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 text-center font-bold">
            📆 {dateStr}
          </p>

          {stats && (
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-blue-50 rounded-xl p-2 text-center">
                <p className="text-lg font-black text-blue-700">{stats.totalUnit}</p>
                <p className="text-[8px] font-black text-blue-500 uppercase">Unit</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-2 text-center">
                <p className="text-lg font-black text-emerald-700">{stats.totalAssigned}</p>
                <p className="text-[8px] font-black text-emerald-500 uppercase">Assigned</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-2 text-center">
                <p className="text-lg font-black text-amber-700">{stats.totalKosong}</p>
                <p className="text-[8px] font-black text-[#003d79] uppercase">Kosong</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-2 text-center">
                <p className="text-lg font-black text-rose-700">{stats.totalBD}</p>
                <p className="text-[8px] font-black text-rose-500 uppercase">BD</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setShowCopyModal(true)}
              className="flex-1 bg-slate-200 text-slate-700 py-2.5 rounded-xl font-black text-xs active:scale-95">
              📋 Copy dari Tanggal Lain
            </button>
            <button onClick={handleSave} disabled={saving || !dirty}
              className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-black text-xs disabled:opacity-50 active:scale-95 shadow-lg">
              {saving ? '⏳' : (dirty ? '💾 Simpan Perubahan' : '✓ Tersimpan')}
            </button>
          </div>
        </div>

        {/* TABLE UNIT ASSIGNMENT */}
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center text-[#5a6a7e] text-xs">
            ⏳ Memuat data...
          </div>
        ) : totalUnit === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <p className="text-[#5a6a7e] text-xs mb-3">📭 Belum ada unit terdaftar di site ini</p>
            <button onClick={() => router.push(`/dashboard/kelola-unit?site=${encodeURIComponent(site)}`)}
              className="bg-[#002a57] text-white px-4 py-2 rounded-lg font-black text-xs">
              🚜 Kelola Master Unit
            </button>
          </div>
        ) : (
          <div ref={tableRef} className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header table (untuk screenshot) */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-[#003D79] text-white text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">PT BOSTON TRIKORA MAHARDIKA</p>
              <p className="text-sm font-black mt-1">SETTING UNIT · {site}</p>
              <p className="text-xs text-blue-200 mt-1">
                {dateStr} · Shift {shift === 'S' ? 'SIANG ☀️' : 'MALAM 🌙'}
              </p>
            </div>

            {Object.entries(grouped).map(([kategori, units]) => (
              <div key={kategori} className="border-b border-slate-100 last:border-0">
                <div className="p-2.5 bg-slate-100 border-b border-slate-200">
                  <p className="text-xs font-black text-slate-700 uppercase">📦 {kategori} ({units.length})</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {units.map((u, idx) => {
                    const a = assignments.get(u.kode_unit)
                    const isBD = a?.status_unit === 'BD'
                    const currentOp = a?.nrp ? operators.find(o => o.nrp === a.nrp) : null

                    return (
                      <div key={u.id} className={`p-2.5 ${isBD ? 'bg-rose-50/50' : ''}`}>
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 w-6 text-center pt-1.5 text-[10px] font-black text-[#5a6a7e]">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            {/* Unit name + status */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm text-slate-800">
                                {u.nama_unit || u.kode_unit}
                              </span>
                              <select value={a?.status_unit || 'RFU'}
                                onChange={e => updateAssignment(u.kode_unit, {
                                  status_unit: e.target.value as any,
                                  ...(e.target.value === 'RFU' ? { keterangan: null } : {})
                                })}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase border-0 ${
                                  isBD ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                <option value="RFU">✅ RFU</option>
                                <option value="BD">🔧 BD</option>
                              </select>
                              {u.is_spare && (
                                <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black">SPARE</span>
                              )}
                            </div>

                            {/* Keterangan BD (kalau BD) */}
                            {isBD && (
                              <input type="text" value={a?.keterangan || ''}
                                onChange={e => updateAssignment(u.kode_unit, { keterangan: e.target.value })}
                                placeholder="Keterangan BD (contoh: BD UC est. 30 juli)"
                                className="w-full text-[11px] px-2 py-1.5 border border-rose-200 rounded bg-white" />
                            )}

                            {/* Dropdown operator (disabled kalau BD) */}
                            {!isBD && (
                              <select value={a?.nrp || ''}
                                onChange={e => updateAssignment(u.kode_unit, { nrp: e.target.value || null })}
                                className="w-full text-xs px-2 py-2 border border-slate-200 rounded bg-slate-50 font-bold">
                                <option value="">-- Pilih Operator ({operators.length}) --</option>
                                {operators.map(op => {
                                  // Cek apakah operator ini sudah di-assign ke unit lain
                                  let assignedElsewhere = false
                                  assignments.forEach((otherA, otherUnit) => {
                                    if (otherUnit !== u.kode_unit && otherA.nrp === op.nrp) {
                                      assignedElsewhere = true
                                    }
                                  })
                                  return (
                                    <option key={op.nrp} value={op.nrp}
                                      className={assignedElsewhere ? 'text-rose-500' : ''}>
                                      {assignedElsewhere ? '⚠️ ' : ''}{op.nama} ({op.jabatan})
                                    </option>
                                  )
                                })}
                              </select>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Spare operators */}
            {(() => {
              const assignedNrps = new Set(
                Array.from(assignments.values()).filter(a => a.nrp).map(a => a.nrp)
              )
              const spare = operators.filter(o => !assignedNrps.has(o.nrp))
              if (spare.length === 0) return null

              return (
                <div className="p-3 bg-amber-50 border-t-2 border-amber-200">
                  <p className="text-[10px] font-black uppercase text-amber-700 mb-2">
                    🔄 Spare Operator ({spare.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {spare.map(op => (
                      <span key={op.nrp} className="bg-white text-amber-800 px-2 py-1 rounded text-[10px] font-bold border border-amber-200">
                        {op.nama}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Action Buttons Bawah */}
        {totalUnit > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleDownloadPNG} disabled={downloading}
              className="bg-purple-600 text-white py-3 rounded-xl font-black text-xs disabled:opacity-50 active:scale-95 shadow-lg">
              {downloading ? '⏳' : '📸 Download PNG'}
            </button>
            <button onClick={handleCopyBroadcast}
              className="bg-green-600 text-white py-3 rounded-xl font-black text-xs active:scale-95 shadow-lg">
              📱 Copy Broadcast WA
            </button>
          </div>
        )}
      </div>

      {/* MODAL COPY */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-2">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b bg-slate-50">
              <h3 className="font-black text-slate-800 text-sm">📋 Copy dari Tanggal Lain</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Duplikasi assignment dari tanggal lain</p>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Sumber: Tanggal</label>
                <input type="date" value={copyDate} onChange={e => setCopyDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">Sumber: Shift</label>
                <select value={copyShift} onChange={e => setCopyShift(e.target.value as any)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50">
                  <option value="S">☀️ SIANG</option>
                  <option value="M">🌙 MALAM</option>
                </select>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-[10px] text-blue-800">
                📌 Data assignment tanggal target ({tanggal}) akan di-REPLACE.<br/>
                Operator yang shift-nya tidak sesuai di target tanggal akan dikosongkan.
              </div>
            </div>
            <div className="p-3 border-t bg-slate-50 flex gap-2">
              <button onClick={() => setShowCopyModal(false)}
                className="flex-1 bg-slate-200 text-slate-700 py-2.5 rounded-lg font-black text-xs">Batal</button>
              <button onClick={handleCopy} disabled={copying}
                className="flex-1 bg-[#003d79] text-white py-2.5 rounded-lg font-black text-xs disabled:opacity-50">
                {copying ? '⏳' : '📋 Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    
      {/* Standard App Footer */}
      <footer className="mt-8 mb-20 sm:mb-6 text-center text-xs text-[#8896a7] italic opacity-60">
        <p>BTM Mobile APP V1.7.0</p>
        <p className="text-[10px]">Powered By rck_Production</p>
      </footer>

      </div>
  )
}