'use client'

import { useState, useEffect } from 'react'

interface ReminderData {
  show_reminder: boolean
  type?: string
  message?: string
  severity?: 'warning' | 'danger'
  shift?: string
  jam_pulang?: string
  lewat_jam?: number
}

export default function ClockOutReminder() {
  const [reminder, setReminder] = useState<ReminderData | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    checkReminder()
    // Cek ulang setiap 10 menit
    const interval = setInterval(checkReminder, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function checkReminder() {
    try {
      const token = localStorage.getItem('btm_session_token_v1')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/attendance/check-reminder', { headers })
      if (res.ok) {
        const data = await res.json()
        if (data.show_reminder) {
          setReminder(data)
          setDismissed(false)
        } else {
          setReminder(null)
        }
      }
    } catch {
      // Offline: skip reminder check
    }
  }

  if (!reminder || !reminder.show_reminder || dismissed) return null

  const isDanger = reminder.severity === 'danger'

  return (
    <div className={`mx-4 mt-3 p-4 rounded-[1.5rem] border-2 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500 ${
      isDanger
        ? 'bg-rose-50 border-rose-200'
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 ${
          isDanger ? 'bg-rose-100' : 'bg-amber-100'
        }`}>
          {isDanger ? '🚨' : '⚠️'}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${
            isDanger ? 'text-rose-600' : 'text-amber-600'
          }`}>
            {reminder.type === 'auto_clockout_notice' ? 'INFO AUTO CLOCK OUT' : 'BELUM CLOCK OUT'}
          </p>
          <p className={`text-xs font-bold leading-relaxed ${
            isDanger ? 'text-rose-800' : 'text-amber-800'
          }`}>
            {reminder.message}
          </p>

          {reminder.type === 'no_clockout' && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  // Navigate ke halaman absensi untuk clock out
                  const event = new CustomEvent('btm:force-clockout')
                  window.dispatchEvent(event)
                  setDismissed(true)
                }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                  isDanger
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-200'
                    : 'bg-[#003d79] text-white text-white shadow-lg shadow-amber-200'
                }`}
              >
                Clock Out Sekarang
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="px-3 py-2 rounded-xl text-[10px] font-bold text-[#5a6a7e] hover:bg-slate-100 transition-all"
              >
                Nanti
              </button>
            </div>
          )}

          {reminder.type === 'auto_clockout_notice' && (
            <button
              onClick={() => setDismissed(true)}
              className="mt-2 px-3 py-1.5 rounded-xl text-[10px] font-bold text-[#5a6a7e] hover:bg-slate-100 transition-all"
            >
              Mengerti
            </button>
          )}
        </div>
      </div>
    </div>
  )
}