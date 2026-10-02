'use client'

// GlobalConfigView dipisah dari app/dashboard/page.tsx (v1.8)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import { useState, useEffect, useRef } from 'react'
import { Input } from './_fields'

export default function GlobalConfigView() {
  const [stats, setStats] = useState<any>(null)
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // State Broadcast
  const [broadcastForm, setBroadcastForm] = useState<{
    judul: string
    pesan: string
    is_urgent: boolean
    images: string[]
  }>({
    judul: '',
    pesan: '',
    is_urgent: false,
    images: []
  })
  const [uploadingImg, setUploadingImg] = useState(false)
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [broadcastMsg, setBroadcastMsg] = useState<{
    type: string; text: string
  } | null>(null)

  // State Force Logout
  const [forceLoading, setForceLoading] = useState(false)
  const [forceMsg, setForceMsg] = useState<{
    type: string; text: string
  } | null>(null)

  useEffect(() => {
    loadData()
    // Auto refresh setiap 30 detik
    const interval = setInterval(() => loadData(true), 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadData(silent = false) {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [configRes, announcementRes] = await Promise.all([
        fetch('/api/system-config'),
        fetch('/api/announcements/list')
      ])
      const configJson = await configRes.json()
      if (configRes.ok) {
        setStats(configJson.stats)
        setOnlineUsers(configJson.online_users || [])
      }
      const annJson = await announcementRes.json()
      if (announcementRes.ok) {
        setAnnouncements(annJson.announcements || [])
      }
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault()
    console.log('🔍 [BROADCAST] Tombol KIRIM di-klik!')
    console.log('🔍 [BROADCAST] Form data:', broadcastForm)
    
    // Minimal harus ada salah satu: judul, pesan, atau gambar
    if (!broadcastForm.judul && !broadcastForm.pesan && broadcastForm.images.length === 0) {
      console.log('❌ [BROADCAST] Semua kosong, batal kirim')
      alert(' Minimal isi salah satu: Judul, Pesan, atau Gambar!')
      return
    }
    
    setBroadcastLoading(true)
    setBroadcastMsg(null)
    console.log('🔍 [BROADCAST] Loading state = TRUE, mulai kirim ke server...')
    
    try {
      const res = await fetch('/api/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast',
          payload: broadcastForm
        })
      })
      
      console.log('🔍 [BROADCAST] Response status:', res.status)
      const json = await res.json()
      console.log('🔍 [BROADCAST] Response body:', json)
      
      if (res.ok) {
        console.log(' [BROADCAST] SUKSES!')
        setBroadcastMsg({ type: 'ok', text: json.message || ' Broadcast berhasil dikirim' })
        alert(' Broadcast berhasil dikirim!')
        setBroadcastForm({ judul: '', pesan: '', is_urgent: false, images: [] })
      } else {
        console.log('❌ [BROADCAST] ERROR dari server:', json.error)
        setBroadcastMsg({ type: 'err', text: '❌ ' + (json.error || 'Unknown error') })
        alert('❌ Gagal: ' + (json.error || 'Unknown error'))
      }
    } catch (err: any) {
      console.error('❌ [BROADCAST] Exception:', err)
      setBroadcastMsg({ type: 'err', text: '❌ Koneksi bermasalah: ' + err.message })
      alert('❌ Koneksi bermasalah: ' + err.message)
    } finally {
      setBroadcastLoading(false)
      console.log('🔍 [BROADCAST] Loading state = FALSE, selesai proses')
    }
  }

  async function handleForceLogout() {
    const confirmed = confirm(
      ' PERINGATAN KERAS!\n\n' +
      'Semua user yang sedang login akan LANGSUNG dikeluarkan.\n' +
      'Hanya sesi Anda (Ricky) yang aman.\n\n' +
      'Lanjutkan Force Logout?'
    )
    if (!confirmed) return

    setForceLoading(true)
    setForceMsg(null)
    try {
      const res = await fetch('/api/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force_logout_all', payload: {} })
      })
      const json = await res.json()
      if (res.ok) {
        setForceMsg({ type: 'ok', text: json.message })
        // Refresh stats setelah force logout
        setTimeout(() => loadData(true), 1500)
      } else {
        setForceMsg({ type: 'err', text: '❌ ' + json.error })
      }
    } catch {
      setForceMsg({ type: 'err', text: '❌ Koneksi bermasalah' })
    } finally {
      setForceLoading(false)
    }
  }

  async function handleDeleteAnnouncement(id: string, judul: string) {
    if (!confirm(`🗑️ Hapus pengumuman "${judul || 'ini'}"?\n\nPengumuman akan langsung hilang dari semua HP karyawan.`)) return
    setDeletingId(id)
    try {
      const res = await fetch('/api/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_announcement', payload: { id } })
      })
      const json = await res.json()
      if (res.ok) {
        alert(' Pengumuman berhasil dihapus!')
        setAnnouncements(prev => prev.filter(a => a.id !== id))
      } else {
        alert('❌ Gagal: ' + json.error)
      }
    } catch {
      alert('❌ Koneksi bermasalah')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return (
    <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest text-xs">
      Memuat Konfigurasi Global...
    </div>
  )

  return (
    <div className="animate-in fade-in duration-500 pb-32 space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-slate-900 to-[#003D79] text-white p-4 lg:p-8 rounded-2xl lg:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-rose-400/10 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-3xl">⚙️</div>
              <div>
                <p className="text-rose-400 font-black text-[10px] uppercase tracking-[0.3em] mb-1">
                  Konfigurasi Sistem
                </p>
                <h1 className="text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-base lg:text-2xl font-black tracking-tight">
                  Konfigurasi Global
                </h1>
              </div>
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
            >
              {refreshing ? '⏳' : '🔄'} Refresh
            </button>
          </div>
          <p className="text-blue-200/70 text-xs font-medium">
            Broadcast notifikasi, force logout darurat, dan monitoring user aktif
          </p>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-full -mr-4 -mt-4" />
          <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-2">
            🟢 Online Kini
          </p>
          <p className="text-xl lg:text-3xl font-black text-emerald-600">
            {stats?.online_now ?? 0}
          </p>
          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
            15 menit terakhir
          </p>
        </div>

        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-blue-100 shadow-sm">
          <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-2">
            👥 Total Aktif
          </p>
          <p className="text-xl lg:text-3xl font-black text-blue-600">
            {stats?.total_karyawan ?? 0}
          </p>
          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
            karyawan
          </p>
        </div>

        <div className="bg-white p-3 lg:p-5 rounded-2xl lg:rounded-[2rem] border-2 border-amber-100 shadow-sm">
          <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-2">
             Sesi Hari Ini
          </p>
          <p className="text-xl lg:text-3xl font-black text-amber-600">
            {stats?.session_hari_ini ?? 0}
          </p>
          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
            login
          </p>
        </div>
      </div>

      {/* PANEL 1: BROADCAST NOTIFIKASI */}
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-lg overflow-hidden">
        <div className="p-6 bg-blue-50/50 border-b-2 border-blue-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-xl">
            📢
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-base tracking-tight">
              Broadcast Notifikasi
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Kirim pesan ke semua user sekaligus
            </p>
          </div>
        </div>

        <form onSubmit={handleBroadcast} className="p-6 space-y-4">
          {broadcastMsg && (
            <div className={`p-4 rounded-2xl text-xs font-bold border ${
              broadcastMsg.type === 'ok'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {broadcastMsg.text}
            </div>
          )}

          {/* Toggle Urgent */}
          <button
            type="button"
            onClick={() =>
              setBroadcastForm(f => ({ ...f, is_urgent: !f.is_urgent }))
            }
            className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
              broadcastForm.is_urgent
                ? 'bg-rose-50 border-rose-200'
                : 'bg-white border-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {broadcastForm.is_urgent ? '🚨' : '📢'}
              </span>
              <div className="text-left">
                <p className={`text-xs font-black uppercase tracking-widest ${
                  broadcastForm.is_urgent ? 'text-rose-700' : 'text-slate-500'
                }`}>
                  {broadcastForm.is_urgent
                    ? 'Mode Urgent / Darurat'
                    : 'Mode Normal'}
                </p>
                <p className="text-[9px] text-slate-400 font-bold">
                  {broadcastForm.is_urgent
                    ? 'Banner merah mencolok di semua HP'
                    : 'Klik untuk aktifkan mode darurat'}
                </p>
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full flex items-center transition-all px-1 ${
              broadcastForm.is_urgent ? 'bg-rose-500 justify-end' : 'bg-slate-200 justify-start'
            }`}>
              <div className="w-4 h-4 bg-white rounded-full shadow" />
            </div>
          </button>

          {/* Input Judul (Opsional) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
              Judul Notifikasi <span className="text-slate-300">(opsional)</span>
            </label>
            <input
              type="text"
              value={broadcastForm.judul}
              onChange={e =>
                setBroadcastForm(f => ({ ...f, judul: e.target.value }))
              }
              placeholder="Contoh: Pengumuman Penting Manajemen"
              className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-[#003D79] focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Input Pesan (Opsional) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
              Isi Pesan <span className="text-slate-300">(opsional)</span>
            </label>
            <textarea
              value={broadcastForm.pesan}
              onChange={e =>
                setBroadcastForm(f => ({ ...f, pesan: e.target.value }))
              }
              placeholder="Tulis isi broadcast di sini..."
              rows={4}
              className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-[#003D79] focus:bg-white outline-none transition-all resize-none"
            />
          </div>

          {/* Upload Multi Gambar (Max 10) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
              📷 Lampiran Gambar (Opsional, Max 10)
              <span className="ml-2 text-blue-500">
                {broadcastForm.images.length}/10
              </span>
            </label>

            <div className="p-5 border-4 border-dashed border-slate-100 rounded-2xl bg-slate-50/50 text-center relative">
              {broadcastForm.images.length < 10 && (
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length === 0) return

                    const remaining = 10 - broadcastForm.images.length
                    const toUpload = files.slice(0, remaining)

                    setUploadingImg(true)
                    try {
                      for (const file of toUpload) {
                        const fd = new FormData()
                        fd.append('file', file)
                        const res = await fetch('/api/announcements/upload', {
                          method: 'POST',
                          body: fd
                        })
                        const d = await res.json()
                        if (res.ok && d.url) {
                          setBroadcastForm(f => ({
                            ...f,
                            images: [...f.images, d.url]
                          }))
                        }
                      }
                    } finally {
                      setUploadingImg(false)
                      // Reset input agar bisa upload file yg sama lagi
                      e.target.value = ''
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              )}

              {uploadingImg ? (
                <p className="text-blue-500 font-black text-xs animate-pulse py-4">
                  ⏳ MENGUNGGAH GAMBAR...
                </p>
              ) : broadcastForm.images.length === 0 ? (
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest py-4">
                  Klik untuk pilih gambar (bisa multi-select)
                </p>
              ) : (
                <p className="text-emerald-600 font-black text-[10px] uppercase tracking-widest py-2">
                   {broadcastForm.images.length} gambar terupload
                  {broadcastForm.images.length < 10 && ' • Klik lagi untuk tambah'}
                </p>
              )}
            </div>

            {/* Preview Thumbnails */}
            {broadcastForm.images.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mt-3">
                {broadcastForm.images.map((url, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img
                      src={url}
                      className="w-full h-full object-cover rounded-xl border-2 border-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setBroadcastForm(f => ({
                          ...f,
                          images: f.images.filter((_, idx) => idx !== i)
                        }))
                      }
                      className="absolute -top-1 -right-1 bg-rose-500 text-white w-5 h-5 rounded-full text-[10px] font-black shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] font-black text-center py-0.5 rounded-b-xl">
                      #{i + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={broadcastLoading}
            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
              broadcastLoading
                ? 'bg-slate-200 text-slate-400'
                : broadcastForm.is_urgent
                  ? 'bg-rose-600 text-white shadow-rose-200 hover:bg-rose-700'
                  : 'bg-[#003D79] text-white shadow-blue-200 hover:bg-blue-700'
            }`}
          >
            {broadcastLoading
              ? '⏳ MENGIRIM...'
              : `${broadcastForm.is_urgent ? '🚨' : '📢'} KIRIM BROADCAST SEKARANG`}
          </button>
        </form>
      </div>

      {/* PANEL 2: LIST PENGUMUMAN AKTIF */}
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-lg overflow-hidden">
        <div className="p-6 bg-amber-50/50 border-b-2 border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-xl">
              📋
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-base tracking-tight">
                Pengumuman Aktif
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {announcements.length} pengumuman tampil di HP karyawan
              </p>
            </div>
          </div>
          <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
            {announcements.length} Aktif
          </span>
        </div>

        <div className="divide-y divide-slate-50">
          {announcements.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3 opacity-20">📭</div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Belum ada pengumuman aktif
              </p>
            </div>
          ) : (
            announcements.map((ann: any) => (
              <div key={ann.id} className="flex items-start gap-2 lg:gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                {/* Thumbnail gambar jika ada */}
                {(ann.images?.length > 0 || ann.image_url) && (
                  <img
                    src={ann.images?.[0] || ann.image_url}
                    className="w-14 h-14 object-cover rounded-2xl border-2 border-slate-100 flex-shrink-0"
                  />
                )}
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {ann.is_urgent && (
                      <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                        🚨 URGENT
                      </span>
                    )}
                    <p className="font-black text-sm text-slate-900 truncate">
                      {ann.title || '(Tanpa Judul)'}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium truncate italic mb-1">
                    {ann.content || '(Tanpa Pesan)'}
                  </p>
                  <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>📅 {new Date(ann.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    {ann.images?.length > 0 && (
                      <span>🖼️ {ann.images.length} Foto</span>
                    )}
                  </div>
                </div>
                {/* Tombol Hapus */}
                <button
                  onClick={() => handleDeleteAnnouncement(ann.id, ann.title)}
                  disabled={deletingId === ann.id}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                    deletingId === ann.id
                      ? 'bg-slate-100 text-slate-300'
                      : 'bg-rose-50 text-rose-600 border-2 border-rose-100 hover:bg-rose-600 hover:text-white hover:border-rose-600'
                  }`}
                >
                  {deletingId === ann.id ? '⏳' : '🗑️ Hapus'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PANEL 3: USER ONLINE LIVE */}

      {/* PANEL 2: USER ONLINE LIVE */}
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-lg overflow-hidden">
        <div className="p-6 bg-emerald-50/50 border-b-2 border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-xl">
              📡
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-base tracking-tight">
                User Online Sekarang
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Refresh otomatis setiap 30 detik
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-emerald-600 uppercase">
              LIVE
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {onlineUsers.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-4xl mb-3 opacity-20">🏝️</div>
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Tidak ada user online saat ini
              </p>
            </div>
          ) : (
            onlineUsers.map((u: any, i: number) => {
              const lastActive = u.last_active
                ? new Date(u.last_active)
                : null
              const minsAgo = lastActive
                ? Math.floor(
                    (Date.now() - lastActive.getTime()) / 60000
                  )
                : null

              return (
                <div
                  key={i}
                  className="flex items-center gap-2 lg:gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center font-black text-emerald-700">
                    {u.nama?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-slate-900 truncate">
                      {u.nama}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                      {u.nrp} • {u.jabatan} • {u.site}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-emerald-600">
                      🟢 Aktif
                    </p>
                    <p className="text-[9px] font-bold text-slate-400">
                      {minsAgo !== null ? `${minsAgo} mnt lalu` : '-'}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* PANEL 3: FORCE LOGOUT */}
      <div className="bg-white rounded-[2.5rem] border-2 border-rose-100 shadow-lg overflow-hidden">
        <div className="p-6 bg-rose-50/50 border-b-2 border-rose-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-600 rounded-2xl flex items-center justify-center text-xl">
            🔴
          </div>
          <div>
            <h2 className="font-black text-slate-900 text-base tracking-tight">
              Force Logout Darurat
            </h2>
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">
              Zona Bahaya — Hati-hati
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {forceMsg && (
            <div className={`p-4 rounded-2xl text-xs font-bold border ${
              forceMsg.type === 'ok'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {forceMsg.text}
            </div>
          )}

          <div className="bg-rose-50 border-2 border-rose-100 p-5 rounded-2xl space-y-2">
            <p className="text-xs font-black text-rose-800 uppercase tracking-widest">
               Apa yang terjadi jika diaktifkan?
            </p>
            <ul className="space-y-1.5">
              {[
                'Semua session user akan dihapus dari database',
                'User yang sedang buka aplikasi akan otomatis logout',
                'User harus login ulang untuk mengakses sistem',
                'Session Anda (Ricky) TIDAK akan terpengaruh',
              ].map((item, i) => (
                <li
                  key={i}
                  className="text-[10px] font-bold text-rose-700 flex items-start gap-2"
                >
                  <span className="text-rose-400 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={handleForceLogout}
            disabled={forceLoading}
            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 border-2 ${
              forceLoading
                ? 'bg-slate-100 text-slate-400 border-slate-200'
                : 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-200 hover:bg-rose-700'
            }`}
          >
            {forceLoading
              ? '⏳ MEMPROSES...'
              : `🔴 FORCE LOGOUT SEMUA USER (${stats?.online_now ?? 0} Online)`}
          </button>
        </div>
      </div>
    </div>
  )
}
