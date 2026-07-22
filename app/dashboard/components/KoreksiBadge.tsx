'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('btm_session_token_v1')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export default function KoreksiBadge() {
  const [count, setCount] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch(
          '/api/attendance/corrections?view=approval&status=PENDING&limit=1',
          { headers: getAuthHeaders() }
        )
        if (res.ok) {
          const data = await res.json()
          setCount(data.summary?.approval_pending_count || 0)
        }
      } catch {
        // silent fail
      } finally {
        setLoaded(true)
      }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!loaded || count === 0) return null

  return (
    <Link
      href="/dashboard/approval-koreksi"
      className="block bg-gradient-to-r from-rose-500 to-rose-600 rounded-[1.5rem] shadow-lg p-4 mb-3 border-2 border-rose-300"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
            ✅
          </div>
          <div>
            <div className="text-white text-xs font-black uppercase tracking-widest opacity-90">
              Approval Menunggu
            </div>
            <div className="text-white text-lg font-black">
              {count} Pengajuan Koreksi
            </div>
          </div>
        </div>
        <div className="text-white text-2xl">→</div>
      </div>
    </Link>
  )
}