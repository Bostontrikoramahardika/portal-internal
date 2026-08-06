'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Notif = {
  id: string
  title: string
  body: string
  icon?: string
  url?: string
  category?: string
  read_at?: string | null
  created_at: string
}

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=20', { cache: 'no-store' })
      const data = await res.json()
      if (data.success) {
        setNotifs(data.notifications || [])
        setUnread(data.unread_count || 0)
      }
    } finally {
      setLoading(false)
    }
  }

  // Load pertama + polling tiap 30 detik
  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown saat klik luar
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleOpen = () => {
    setOpen(!open)
    if (!open) load()
  }

  const handleClickNotif = async (n: Notif) => {
    // Mark as read
    if (!n.read_at) {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: n.id })
      })
    }
    setOpen(false)
    if (n.url) router.push(n.url)
    load()
  }

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true })
    })
    load()
  }

  const fmtTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = (now.getTime() - d.getTime()) / 1000

    if (diff < 60) return 'Baru saja'
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`
    if (diff < 604800) return `${Math.floor(diff / 86400)}h lalu`
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* BELL BUTTON */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
        aria-label="Notifikasi">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
          <path d="M5.85 17.1q-.375 0-.612-.238T5 16.25q0-.375.238-.612t.612-.238H6v-6q0-1.85 1.113-3.287T10 4.2v-.7q0-.625.438-1.062T11.5 2t1.063.438T13 3.5v.7q1.775.45 2.888 1.887T17 9.4v6h.15q.375 0 .613.238t.237.612q0 .375-.237.613t-.613.237zM11.5 21q-.85 0-1.425-.575T9.5 19h4q0 .85-.575 1.425T11.5 21"/>
        </svg>

        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#003D79]">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
          {/* HEADER */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-800">Notifikasi</h3>
              {unread > 0 && (
                <p className="text-[11px] text-slate-500">{unread} belum dibaca</p>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800">
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* LIST */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifs.length === 0 ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <p className="text-xs text-slate-500 mt-2">Memuat...</p>
              </div>
            ) : notifs.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">🔔</div>
                <p className="text-sm font-bold text-slate-500">Tidak ada notifikasi</p>
                <p className="text-[11px] text-slate-400 mt-1">Notif akan muncul di sini</p>
              </div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotif(n)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                    !n.read_at ? 'bg-blue-50/50' : ''
                  }`}>
                  <div className="flex items-start gap-2">
                    {!n.read_at && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-tight ${!n.read_at ? 'font-black text-slate-800' : 'font-bold text-slate-600'}`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {fmtTime(n.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}