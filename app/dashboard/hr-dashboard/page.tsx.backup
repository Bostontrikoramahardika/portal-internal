'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type TabKey = 'karyawan' | 'mpp' | 'rekrutmen' | 'turnover' | 'master'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'karyawan',  label: 'Karyawan',      icon: '👥' },
  { key: 'mpp',       label: 'Manpower Plan', icon: '📋' },
  { key: 'rekrutmen', label: 'Rekrutmen',     icon: '📥' },
  { key: 'turnover',  label: 'Turnover',      icon: '📊' },
  { key: 'master',    label: 'Master',        icon: '⚙️' },
]

export default function HRDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('karyawan')

  return (
    <div className="min-h-screen bg-[#f4f7fa] pb-24">
      
      {/* HEADER */}
      <div className="bg-gradient-to-br from-[#003D79] to-[#0056b3] px-4 pt-6 pb-4 lg:px-6 lg:pt-8 lg:pb-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-4xl">📊</span>
          <div>
            <h1 className="text-white text-xl lg:text-3xl font-black tracking-tight">HR Dashboard</h1>
            <p className="text-blue-200 text-xs lg:text-sm font-bold">Manpower Planning & Analytics</p>
          </div>
        </div>

        {/* TAB BAR */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 lg:px-4 lg:py-2.5 rounded-full text-xs lg:text-sm font-bold whitespace-nowrap transition-all
                ${activeTab === t.key
                  ? 'bg-white text-[#003D79] shadow-lg'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'
                }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 py-4 lg:px-6 lg:py-6">
        {activeTab === 'karyawan' && <TabKaryawan />}
        {activeTab === 'mpp' && <ComingSoon label="Manpower Plan" desc="Setup target MPP per site per bulan (Fase 4)" />}
        {activeTab === 'rekrutmen' && <ComingSoon label="Rekrutmen" desc="Tracking calon karyawan & tahapan seleksi (Fase 5)" />}
        {activeTab === 'turnover' && <ComingSoon label="Turnover Analytics" desc="Analisis perputaran karyawan (Fase 2)" />}
        {activeTab === 'master' && <ComingSoon label="Master Data" desc="Setup master jabatan, POH, dll (Fase 3)" />}
      </div>
    </div>
  )
}

// ═══ PLACEHOLDER "Coming Soon" ═══
function ComingSoon({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="text-6xl mb-4">🚧</div>
      <div className="text-slate-600 text-lg font-black uppercase tracking-wide">{label}</div>
      <div className="text-slate-400 text-sm mt-2 max-w-md mx-auto">{desc}</div>
      <div className="mt-6 inline-block bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-xs font-black">
        Coming Soon
      </div>
    </div>
  )
}

// ═══ TAB 1: KARYAWAN (mengambil data dari /api/data?menu=kelola_karyawan) ═══
function TabKaryawan() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/data?menu=kelola_karyawan')
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Gagal memuat data')
        return
      }
      setData(json)
    } catch {
      setError('Kesalahan koneksi server')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 animate-pulse">📊</div>
        <div className="text-slate-500 text-sm font-bold">Memuat data karyawan...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16 px-6">
        <div className="text-4xl mb-3">⚠️</div>
        <div className="text-rose-500 font-bold text-sm mb-3">{error}</div>
        <button 
          onClick={load}
          className="px-4 py-2 bg-[#003D79] text-white text-sm font-bold rounded-full"
        >
          Coba Lagi
        </button>
      </div>
    )
  }

  if (!data) return null

  // Redirect ke halaman /dashboard?menu=kelola_karyawan kalau mau lihat detail
  // atau embed TableView di sini
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="text-center py-8">
        <div className="text-5xl mb-4">👥</div>
        <h3 className="text-lg font-black text-slate-800">Data Karyawan</h3>
        <p className="text-sm text-slate-500 mt-2 mb-6">
          Total: <strong className="text-[#003D79]">{data.rows?.length || 0}</strong> karyawan
        </p>
        <button
          onClick={() => router.push('/dashboard?menu=kelola_karyawan')}
          className="px-6 py-3 bg-[#003D79] text-white font-black text-sm rounded-full shadow-lg hover:bg-[#002D5F] transition-all"
        >
          📂 Buka Manajemen Karyawan
        </button>
      </div>
    </div>
  )
}