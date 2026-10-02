'use client'


// app/dashboard/apd-saya/page.tsx
// v1.3 — Halaman APD Saya + Tombol Request + Modal Form + Section Pending/Rejected

import { useEffect, useState } from 'react'

interface ApdItem {
  master: { jenis_apd: string; icon: string; life_time_bulan: number; urutan: number }
  latest: any
  isNew: boolean
  totalTerima: number
  history: any[]
}

interface EmployeeInfo {
  nrp: string; nama: string; jabatan: string; departemen: string; site: string; tanggal_masuk: string | null
}

interface MasterItem {
  jenis_apd: string; icon: string; ukuran_tersedia: string[]; warna_tersedia: string[]; life_time_bulan: number
}

export default function ApdSayaPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ApdItem[]>([])
  const [newItems, setNewItems] = useState<any[]>([])
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)
  const [totalJenis, setTotalJenis] = useState<number>(0)
  const [pending, setPending] = useState<any[]>([])
  const [rejected, setRejected] = useState<any[]>([])
  const [masterList, setMasterList] = useState<MasterItem[]>([])
  const [expandedJenis, setExpandedJenis] = useState<string | null>(null)
  
  // Modal
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [modalData, setModalData] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('btm_session_token_v1')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/apd/saya', { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal load data')

      setItems(json.items || [])
      setNewItems(json.newItems || [])
      setEmployee(json.employee || null)
      setTotalJenis(json.totalJenis || 0)
      setPending(json.pending || [])
      setRejected(json.rejected || [])
      setMasterList(json.masterList || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '-'
    const dt = new Date(d)
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
  }

  const openCreate = () => {
    setModalMode('create')
    setModalData({
      jenis_apd: '', ukuran: '', warna: '', jumlah: 1,
      tanggal_terima: new Date().toISOString().split('T')[0],
      keterangan: ''
    })
    setShowModal(true)
  }

  const openEdit = (item: any) => {
    setModalMode('edit')
    setModalData({
      id: item.id,
      jenis_apd: item.jenis_apd,
      ukuran: item.ukuran,
      warna: item.warna || '',
      jumlah: item.jumlah,
      tanggal_terima: item.tanggal_terima,
      keterangan: item.keterangan || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!modalData.jenis_apd) { alert('Pilih jenis APD dulu'); return }
    if (!modalData.ukuran) { alert('Pilih ukuran'); return }
    if (!modalData.jumlah || modalData.jumlah < 1) { alert('Jumlah minimal 1'); return }
    if (!modalData.tanggal_terima) { alert('Isi tanggal terima'); return }
    
    setSubmitting(true)
    try {
      const token = localStorage.getItem('btm_session_token_v1')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const method = modalMode === 'create' ? 'POST' : 'PUT'
      const res = await fetch('/api/apd/saya', {
        method,
        headers,
        body: JSON.stringify(modalData)
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal submit')
      
      alert(json.message || 'Berhasil!')
      setShowModal(false)
      loadData()
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus request ini?')) return
    
    try {
      const token = localStorage.getItem('btm_session_token_v1')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`/api/apd/saya?id=${id}`, { method: 'DELETE', headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gagal hapus')
      
      alert('Request berhasil dihapus')
      loadData()
    } catch (e: any) {
      alert('Error: ' + e.message)
    }
  }

  const selectedMaster = masterList.find(m => m.jenis_apd === modalData?.jenis_apd)

  if (loading) {
    return (
      <div className="bg-[#f4f7fa] p-2 sm:p-3 lg:p-4 pb-24 text-slate-800">
      

        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🦺</div>
          <div className="text-sm text-slate-500 font-medium">Memuat data APD...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#f4f7fa] p-2 sm:p-3 lg:p-4 pb-24 text-slate-800">
        <div className="bg-white rounded-[2rem] shadow-xl p-8 max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Terjadi Kesalahan</h2>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <button onClick={loadData} className="bg-[#003D79] text-white px-6 py-3 rounded-[1.2rem] font-black text-sm shadow-xl">
            🔄 Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#f4f7fa] p-2 sm:p-3 lg:p-4 pb-24 text-slate-800">
      {/* HERO */}
      <div className="hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
        
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm">🦺</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black tracking-tight">APD Saya</h1>
              <p className="text-sm text-white/70 font-medium">Riwayat pelindung diri</p>
            </div>
          </div>

          {employee && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-lg">👤</div>
                <div className="text-sm font-black flex-1 min-w-0 truncate">{employee.nama}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <div className="text-white/50 font-black uppercase tracking-widest mb-0.5">NRP</div>
                  <div className="font-black">{employee.nrp}</div>
                </div>
                <div>
                  <div className="text-white/50 font-black uppercase tracking-widest mb-0.5">Site</div>
                  <div className="font-black">{employee.site || '-'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-white/50 font-black uppercase tracking-widest mb-0.5">Jabatan</div>
                  <div className="font-black">{employee.jabatan || '-'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TOMBOL AJUKAN APD BARU */}
      <div className="px-4 mt-4">
        <button
          onClick={openCreate}
          className="w-full bg-gradient-to-r from-blue-600 to-[#003D79] text-white rounded-[2rem] shadow-xl p-4 font-black text-sm flex items-center justify-center gap-2 hover:shadow-2xl active:scale-[0.98] transition-all"
        >
          <span className="text-xl">➕</span>
          <span className="uppercase tracking-widest">Ajukan Penerimaan APD Baru</span>
        </button>
      </div>

      {/* NOTIF APD BARU (VERIFIED) */}
      {newItems.length > 0 && (
        <div className="mx-4 mt-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-[2rem] shadow-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-2xl">🎉</div>
            <div className="text-sm font-black uppercase tracking-widest">APD Baru Terverifikasi!</div>
          </div>
          <div className="space-y-2">
            {newItems.map((n, i) => (
              <div key={i} className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-black">{n.icon} {n.jenis_apd}</div>
                  <div className="text-[10px] text-white/70 font-medium">Ukuran {n.ukuran} × {n.jumlah} pcs</div>
                </div>
                <div className="text-xs text-white/80 font-bold">{formatDate(n.tanggal_terima)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PENDING (Menunggu Verifikasi) */}
      {pending.length > 0 && (
        <div className="mx-4 mt-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2 px-2 flex items-center gap-2">
            ⏳ Menunggu Verifikasi ({pending.length})
          </div>
          <div className="space-y-2">
            {pending.map((p) => (
              <div key={p.id} className="bg-white rounded-[1.5rem] shadow-lg border-2 border-amber-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-black text-slate-900">{p.jenis_apd}</div>
                    <div className="text-[11px] text-slate-500 font-medium mt-1">
                      Ukuran {p.ukuran} • {p.jumlah} pcs • {p.warna || 'Warna default'}
                    </div>
                  </div>
                  <div className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                    🟡 PENDING
                  </div>
                </div>
                <div className="text-[10px] text-[#5a6a7e] font-medium mb-3">
                  Diajukan: {formatDate(p.tanggal_terima)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 bg-blue-50 text-blue-700 py-2 rounded-xl font-black text-[11px] hover:bg-blue-100 active:scale-95 transition-all"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="flex-1 bg-rose-50 text-rose-700 py-2 rounded-xl font-black text-[11px] hover:bg-rose-100 active:scale-95 transition-all"
                  >
                    🗑️ Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REJECTED */}
      {rejected.length > 0 && (
        <div className="mx-4 mt-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2 px-2">
            ❌ Ditolak ({rejected.length})
          </div>
          <div className="space-y-2">
            {rejected.map((r) => (
              <div key={r.id} className="bg-white rounded-[1.5rem] shadow-lg border-2 border-rose-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-black text-slate-900">{r.jenis_apd}</div>
                    <div className="text-[11px] text-slate-500 font-medium mt-1">
                      Ukuran {r.ukuran} • {r.jumlah} pcs
                    </div>
                  </div>
                  <div className="bg-rose-100 text-rose-700 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                    ❌ REJECTED
                  </div>
                </div>
                {r.reject_reason && (
                  <div className="bg-rose-50 rounded-xl p-2 mb-3 text-[11px] text-rose-700">
                    <span className="font-black">Alasan:</span> {r.reject_reason}
                  </div>
                )}
                <button
                  onClick={() => handleDelete(r.id)}
                  className="w-full bg-slate-50 text-slate-700 py-2 rounded-xl font-black text-[11px] hover:bg-slate-100 active:scale-95 transition-all"
                >
                  🗑️ Hapus
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIST APD VERIFIED */}
      <div className="px-4 mt-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#5a6a7e] mb-3 px-2">
          📋 Perlengkapan Anda ({totalJenis} Jenis)
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-[2rem] shadow-xl p-8 text-center">
            <div className="text-5xl mb-4">🦺</div>
            <div className="text-sm font-black text-slate-700 mb-1">Belum Ada Data APD</div>
            <div className="text-xs text-slate-500 font-medium mb-4">
              Klik tombol di atas untuk mengajukan penerimaan APD.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => {
              const isExpanded = expandedJenis === item.master.jenis_apd
              return (
                <div key={item.master.jenis_apd} className="bg-white rounded-[1.5rem] shadow-xl overflow-hidden border border-slate-100">
                  <button onClick={() => setExpandedJenis(isExpanded ? null : item.master.jenis_apd)} className="w-full p-4 text-left hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                        {item.master.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-slate-900">{item.master.jenis_apd}</div>
                        <div className="text-[10px] text-slate-500 font-medium">Total penerimaan: {item.totalTerima}x</div>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                      <div className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-2">
                        📅 Penerimaan Terakhir
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <div className="text-[#5a6a7e] mb-0.5">Tanggal</div>
                          <div className="font-black text-slate-900">{formatDate(item.latest.tanggal_terima)}</div>
                        </div>
                        <div>
                          <div className="text-[#5a6a7e] mb-0.5">Ukuran</div>
                          <div className="font-black text-slate-900">{item.latest.ukuran || '-'}</div>
                        </div>
                        <div>
                          <div className="text-[#5a6a7e] mb-0.5">Jumlah</div>
                          <div className="font-black text-slate-900">{item.latest.jumlah || '-'} pcs</div>
                        </div>
                        <div>
                          <div className="text-[#5a6a7e] mb-0.5">Warna</div>
                          <div className="font-black text-slate-900">{item.latest.warna || '-'}</div>
                        </div>
                      </div>
                    </div>

                    {item.history.length > 1 && (
                      <div className="mt-3 text-[10px] text-blue-600 font-black">
                        {isExpanded ? '▲ Sembunyikan riwayat' : `▼ Lihat riwayat (${item.history.length - 1} sebelumnya)`}
                      </div>
                    )}
                  </button>

                  {isExpanded && item.history.length > 1 && (
                    <div className="border-t border-slate-100 bg-slate-50 p-4">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">
                        📜 Riwayat Sebelumnya
                      </div>
                      <div className="space-y-2">
                        {item.history.slice(1).map((h, i) => (
                          <div key={i} className="bg-white rounded-xl p-3 border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-black text-slate-900">Penerimaan ke-{h.penerimaan_ke}</div>
                              <div className="text-[10px] text-slate-500 font-medium">{formatDate(h.tanggal_terima)}</div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <div className="text-[10px]"><span className="text-[#5a6a7e]">Ukuran:</span> <span className="font-black text-slate-700">{h.ukuran || '-'}</span></div>
                              <div className="text-[10px]"><span className="text-[#5a6a7e]">Jumlah:</span> <span className="font-black text-slate-700">{h.jumlah || '-'}</span></div>
                              <div className="text-[10px]"><span className="text-[#5a6a7e]">Warna:</span> <span className="font-black text-slate-700">{h.warna || '-'}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="bg-[#003D79] text-white px-5 py-4 rounded-t-[2.5rem] flex items-center justify-between sticky top-0 z-10">
              <div>
                <div className="text-sm font-black tracking-tight">
                  {modalMode === 'create' ? '➕ Ajukan APD Baru' : '✏️ Edit Request'}
                </div>
                <div className="text-[10px] text-white/70 font-medium mt-0.5">
                  Isi form untuk mengajukan penerimaan APD
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white text-2xl">×</button>
            </div>

            {/* Body Modal */}
            <div className="p-5 space-y-4">
              {/* Jenis APD */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
                  Jenis APD *
                </label>
                <select
                  value={modalData?.jenis_apd || ''}
                  onChange={(e) => setModalData({ ...modalData, jenis_apd: e.target.value, ukuran: '', warna: '' })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#003D79]"
                >
                  <option value="">-- Pilih Jenis APD --</option>
                  {masterList.map((m) => (
                    <option key={m.jenis_apd} value={m.jenis_apd}>
                      {m.icon} {m.jenis_apd}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ukuran */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
                  Ukuran *
                </label>
                {selectedMaster && selectedMaster.ukuran_tersedia.length > 0 ? (
                  <select
                    value={modalData?.ukuran || ''}
                    onChange={(e) => setModalData({ ...modalData, ukuran: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#003D79]"
                  >
                    <option value="">-- Pilih Ukuran --</option>
                    {selectedMaster.ukuran_tersedia.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={modalData?.ukuran || ''}
                    onChange={(e) => setModalData({ ...modalData, ukuran: e.target.value })}
                    placeholder="Contoh: M, 42, All Size"
                    className="w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#003D79]"
                  />
                )}
              </div>

              {/* Warna (opsional) */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
                  Warna (opsional)
                </label>
                {selectedMaster && selectedMaster.warna_tersedia.length > 0 ? (
                  <select
                    value={modalData?.warna || ''}
                    onChange={(e) => setModalData({ ...modalData, warna: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#003D79]"
                  >
                    <option value="">-- Pilih Warna --</option>
                    {selectedMaster.warna_tersedia.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={modalData?.warna || ''}
                    onChange={(e) => setModalData({ ...modalData, warna: e.target.value })}
                    placeholder="Kosongkan jika tidak ada"
                    className="w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#003D79]"
                  />
                )}
              </div>

              {/* Jumlah */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
                  Jumlah (pcs) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={modalData?.jumlah || 1}
                  onChange={(e) => setModalData({ ...modalData, jumlah: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#003D79]"
                />
              </div>

              {/* Tanggal Terima */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
                  Tanggal Terima *
                </label>
                <input
                  type="date"
                  value={modalData?.tanggal_terima || ''}
                  onChange={(e) => setModalData({ ...modalData, tanggal_terima: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#003D79]"
                />
              </div>

              {/* Keterangan */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
                  Keterangan (opsional)
                </label>
                <textarea
                  value={modalData?.keterangan || ''}
                  onChange={(e) => setModalData({ ...modalData, keterangan: e.target.value })}
                  placeholder="Contoh: penggantian karena rusak..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[1.2rem] px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#003D79] resize-none"
                />
              </div>

              {/* Info */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800">
                💡 Request Anda akan berstatus <span className="font-black">PENDING</span> dan menunggu verifikasi HR/SHE.
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-5 border-t border-slate-100 flex gap-2 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-[1.2rem] font-black text-sm hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-[#003D79] text-white py-3 rounded-[1.2rem] font-black text-sm shadow-xl hover:bg-blue-900 active:scale-95 transition-all disabled:opacity-50"
              >
                {submitting ? '⏳ Mengirim...' : (modalMode === 'create' ? '✅ Ajukan' : '💾 Simpan')}
              </button>
            </div>
          </div>
        </div>
      )}
    

      </div>
  )
}