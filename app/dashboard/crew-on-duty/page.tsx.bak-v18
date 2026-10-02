'use client'


// app/dashboard/crew-on-duty/page.tsx
// Chat 30 - Crew On Duty Plant (patokan dari attendance)


import { useEffect, useState, useRef } from 'react'
import html2canvas from 'html2canvas-pro'

interface Member {
  nrp: string
  nama: string
  jabatan: string
  group: string
  status: string
}

interface Group {
  group: string
  icon: string
  total: number
  members: Member[]
}

interface CrewData {
  ok: boolean
  tanggal: string
  shift: 'SIANG' | 'MALAM'
  site: string
  site_tz: string
  pjo_gl_info: {
    pjo?: { nrp: string; nama: string; jabatan: string } | null
    deputy_pjo?: { nrp: string; nama: string; jabatan: string } | null
    gl_plant?: { nrp: string; nama: string; jabatan: string } | null
  } | null
  groups: Group[]
  total_hadir: number
  generated_at: string
}

export default function CrewOnDutyPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<CrewData | null>(null)
  const [downloading, setDownloading] = useState(false)
  
  const [filterTanggal, setFilterTanggal] = useState('')
  const [filterShift, setFilterShift] = useState<'AUTO' | 'SIANG' | 'MALAM'>('AUTO')
  const [filterSite, setFilterSite] = useState('')
  const [sites, setSites] = useState<string[]>([])
  const [currentTime, setCurrentTime] = useState('')

  const posterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/public/sites')
      .then(r => r.json())
      .then(d => {
        const list = (d.sites || []).map((s: any) => s.nama_site)
        setSites(list)
        if (list.length > 0 && !filterSite) setFilterSite(list[0])
      })
      .catch(() => setSites(['PPA-MLP']))
  }, [])

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const witaHour = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(now)
      setCurrentTime(witaHour)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (filterSite) loadData()
  }, [filterSite, filterShift, filterTanggal])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterSite) params.set('site', filterSite)
      if (filterShift !== 'AUTO') params.set('shift', filterShift)
      if (filterTanggal) params.set('tanggal', filterTanggal)

      const res = await fetch(`/api/crew-on-duty?${params.toString()}`)
      const json = await res.json()
      
      if (!res.ok) {
        setError(json.error || 'Gagal memuat data')
        setData(null)
      } else {
        setData(json)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    if (!posterRef.current || !data) {
      alert('Data belum siap. Tunggu sebentar.')
      return
    }
    
    setDownloading(true)
    try {
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: '#f8fafc',
        scale: 2,
        useCORS: true,
        logging: false
      })

      const link = document.createElement('a')
      const tglLabel = data.tanggal.replace(/-/g, '')
      link.download = `CrewOnDuty_Plant_${data.site}_${tglLabel}_${data.shift}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err: any) {
      alert('Gagal download: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  function formatTanggalID(dateStr: string): string {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr + 'T00:00:00Z')
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'UTC',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(d).toUpperCase()
    } catch {
      return dateStr
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa] p-2 sm:p-3 lg:p-4 pb-24 text-slate-800">
      

      
      {/* HEADER */}
      <div className="bg-[#003D79] text-white p-4 lg:p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="text-3xl lg:text-4xl">👷</div>
          <div>
            <h1 className="text-lg lg:text-2xl font-black tracking-tight">CREW ON DUTY</h1>
            <p className="text-blue-200 text-[10px] lg:text-xs font-bold mt-0.5">
              Personel Plant yang bertugas hari ini
            </p>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="p-3 lg:p-6">
        <div className="bg-white rounded-2xl p-3 lg:p-5 shadow-sm border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                🏢 Site
              </label>
              <select
                value={filterSite}
                onChange={e => setFilterSite(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-bold focus:outline-none focus:border-[#003D79] bg-white"
              >
                {sites.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                📅 Tanggal
              </label>
              <input
                type="date"
                value={filterTanggal || (data?.tanggal || '')}
                onChange={e => setFilterTanggal(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-bold focus:outline-none focus:border-[#003D79]"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">
                ⏰ Shift
              </label>
              <div className="flex gap-2">
                {(['AUTO', 'SIANG', 'MALAM'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterShift(s)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                      filterShift === s
                        ? 'bg-[#003D79] text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s === 'AUTO' ? '🔄' : s === 'SIANG' ? '☀️' : '🌙'} {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] lg:text-xs text-slate-500 font-bold">
              🕐 Waktu sekarang: <span className="text-[#003D79] font-black">{currentTime} WITA</span>
              {data && (
                <> · Update terakhir: <span className="text-slate-700">{new Date(data.generated_at).toLocaleTimeString('id-ID')}</span></>
              )}
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={loadData}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                🔄 Refresh
              </button>
              <button
                onClick={handleDownload}
                disabled={downloading || !data || data.total_hadir === 0}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-md"
              >
                {downloading ? '⏳ Downloading...' : '📸 Download PNG'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-3 lg:px-6 pb-6">
        
        {loading && (
          <div className="bg-white rounded-2xl p-10 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#003D79] mx-auto"></div>
            <p className="text-slate-500 font-bold text-sm mt-4">Loading...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-2 border-red-100 text-red-700 p-4 rounded-2xl text-sm font-bold">
            ❌ {error}
          </div>
        )}

        {!loading && !error && data && data.total_hadir === 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-100 text-yellow-800 p-8 rounded-2xl text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-black text-sm mb-1">Belum ada crew Plant yang absen</p>
            <p className="text-xs">Untuk shift {data.shift} tanggal {data.tanggal}</p>
            <p className="text-[10px] text-slate-500 mt-3">
              Data akan muncul setelah karyawan Plant melakukan Clock In
            </p>
          </div>
        )}

        {/* POSTER */}
        {!loading && !error && data && data.total_hadir > 0 && (
          <div ref={posterRef} className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
            
            {/* POSTER HEADER */}
            <div className="bg-gradient-to-br from-[#003D79] via-[#004a8f] to-[#003D79] text-white p-6 lg:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full -mr-32 blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-blue-200 text-[10px] lg:text-xs font-black uppercase tracking-[0.3em] mb-1">
                      🏭 PT Boston Trikora Mahardika
                    </p>
                    <h2 className="text-2xl lg:text-4xl font-black tracking-tight">
                      CREW ON DUTY
                    </h2>
                    <p className="text-blue-200 text-xs lg:text-sm font-bold mt-1">
                      Departemen Plant · {data.site}
                    </p>
                  </div>
                  <div className="text-5xl lg:text-6xl opacity-70">👷</div>
                </div>

                {/* Info Bar */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mt-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 lg:p-3">
                    <p className="text-blue-200 text-[8px] lg:text-[10px] font-black uppercase tracking-wider mb-0.5">Tanggal</p>
                    <p className="text-xs lg:text-sm font-black">{formatTanggalID(data.tanggal)}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 lg:p-3">
                    <p className="text-blue-200 text-[8px] lg:text-[10px] font-black uppercase tracking-wider mb-0.5">Shift</p>
                    <p className="text-xs lg:text-sm font-black">
                      {data.shift === 'SIANG' ? '☀️ SIANG' : '🌙 MALAM'}
                    </p>
                  </div>
                  <div className="bg-emerald-500/30 backdrop-blur-sm rounded-xl p-2.5 lg:p-3 border border-emerald-400/30">
                    <p className="text-emerald-200 text-[8px] lg:text-[10px] font-black uppercase tracking-wider mb-0.5">Total Hadir</p>
                    <p className="text-xs lg:text-sm font-black">
                      {data.total_hadir} Orang
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 lg:p-3">
                    <p className="text-blue-200 text-[8px] lg:text-[10px] font-black uppercase tracking-wider mb-0.5">Update</p>
                    <p className="text-xs lg:text-sm font-black">{currentTime} WITA</p>
                  </div>
                </div>

                {/* PJO/GL Info */}
                {data.pjo_gl_info && (data.pjo_gl_info.pjo || data.pjo_gl_info.gl_plant) && (
                  <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap gap-x-6 gap-y-1 text-[10px] lg:text-xs">
                    {data.pjo_gl_info.pjo && (
                      <p className="text-blue-100">
                        <span className="text-blue-300 font-bold">PJO:</span>{' '}
                        <span className="font-black">{data.pjo_gl_info.pjo.nama}</span>
                      </p>
                    )}
                    {data.pjo_gl_info.deputy_pjo && (
                      <p className="text-blue-100">
                        <span className="text-blue-300 font-bold">Deputy:</span>{' '}
                        <span className="font-black">{data.pjo_gl_info.deputy_pjo.nama}</span>
                      </p>
                    )}
                    {data.pjo_gl_info.gl_plant && (
                      <p className="text-blue-100">
                        <span className="text-blue-300 font-bold">GL Plant:</span>{' '}
                        <span className="font-black">{data.pjo_gl_info.gl_plant.nama}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* POSTER BODY - Groups */}
            <div className="p-4 lg:p-6 space-y-3 lg:space-y-4 bg-slate-50">
              {data.groups.map(g => (
                <div key={g.group} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                  <div className="bg-gradient-to-r from-[#003D79] to-[#004a8f] text-white px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl lg:text-2xl">{g.icon}</span>
                      <div>
                        <p className="font-black text-sm lg:text-base tracking-wide uppercase">{g.group}</p>
                        <p className="text-[9px] lg:text-[10px] font-bold text-blue-200">
                          {g.total} Personel
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-emerald-500/30 text-emerald-100 px-2 py-0.5 rounded-lg text-[10px] font-black">
                        ✅ {g.total} Hadir
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {g.members.map((m, idx) => (
                      <div 
                        key={m.nrp}
                        className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-[#5a6a7e] text-xs font-black w-6">{idx + 1}.</span>
                          <p className="font-black text-sm lg:text-base truncate text-slate-800">
                            {m.nama}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] lg:text-xs font-black uppercase">
                            ✅ HADIR
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* POSTER FOOTER */}
            <div className="bg-[#f4f7fa] text-white p-4 text-center">
              <p className="text-[9px] lg:text-[10px] font-bold text-[#5a6a7e] uppercase tracking-widest">
                Dibuat via BTM Mobile · {new Date(data.generated_at).toLocaleString('id-ID')}
              </p>
              <p className="text-[9px] lg:text-[10px] font-bold text-slate-500 mt-1">
                🏭 PT Boston Trikora Mahardika
              </p>
            </div>
          </div>
        )}
      </div>
    
      {/* Standard App Footer */}
      <footer className="mt-8 mb-20 sm:mb-6 text-center text-xs text-[#8896a7] italic opacity-60">
        <p>BTM Mobile APP V1.7.0</p>
        <p className="text-[10px]">Powered By rck_Production</p>
      </footer>

      </div>
  )
}