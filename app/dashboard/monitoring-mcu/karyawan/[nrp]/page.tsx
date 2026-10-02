'use client'


// app/dashboard/monitoring-mcu/karyawan/[nrp]/page.tsx
import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, User, Building2, Calendar, HeartPulse,
  FileText, CheckCircle, Clock, AlertCircle, XCircle,
  Download, Loader2, TrendingUp, Award, Activity
} from 'lucide-react'

interface Finding {
  id: string
  mcu_id: string
  jenis_temuan: string
  keterangan_temuan: string
  status_followup: 'BELUM_FU' | 'SUDAH_FU' | 'DITOLAK' | 'SELESAI'
  followup_file_url?: string
  followup_file_name?: string
  followup_keterangan?: string
  followup_submitted_at?: string
  verified_at?: string
  verified_status?: string
  verified_note?: string
}

interface McuTimeline {
  id: string
  mcu_number: number
  tanggal_mcu: string
  jenis_mcu: string
  hasil: string
  dokter?: string
  rumah_sakit?: string
  tanggal_berlaku?: string
  tanggal_expired?: string
  foto_catatan_url?: string
  temuan_summary?: string
  status_mcu: string
  findings: Finding[]
  findings_count: number
  pending_fu_count: number
  waiting_verify_count: number
  completed_fu_count: number
}

function StatusBadge({ status, size = 'sm' }: { status: string, size?: 'sm' | 'md' }) {
  const map: Record<string, { label: string, cls: string, icon: any }> = {
    FIT:              { label: 'FIT',            cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
    OPEN:             { label: 'OPEN',           cls: 'bg-amber-100 text-amber-700 border-amber-200',       icon: Clock },
    CLOSED:           { label: 'CLOSED',         cls: 'bg-blue-100 text-blue-700 border-blue-200',          icon: CheckCircle },
    PERLU_PERHATIAN:  { label: 'PERHATIAN',      cls: 'bg-rose-100 text-rose-700 border-rose-200',          icon: AlertCircle },
    BELUM_FU:         { label: 'Belum FU',       cls: 'bg-slate-100 text-slate-600 border-slate-200',       icon: Clock },
    SUDAH_FU:         { label: 'Menunggu Verif', cls: 'bg-orange-100 text-orange-700 border-orange-200',    icon: Clock },
    SELESAI:          { label: 'Selesai ✓',      cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
    DITOLAK:          { label: 'Ditolak',        cls: 'bg-rose-100 text-rose-700 border-rose-200',          icon: XCircle },
  }
  const s = map[status] || { label: status, cls: 'bg-slate-100 text-slate-600', icon: null }
  const Icon = s.icon
  const sizeCls = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[10px]'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold border ${sizeCls} ${s.cls}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {s.label}
    </span>
  )
}

function formatDate(d?: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function KaryawanMcuTimelinePage({ params }: { params: Promise<{ nrp: string }> }) {
  const { nrp } = use(params)
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('btm_session_token_v1') : null
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(`/api/mcu/karyawan/${nrp}`, { headers })
      const json = await res.json()
      if (json.ok) setData(json)
      else setError(json.error || 'Gagal load data')
    } catch (e: any) {
      setError(e.message || 'Error')
    } finally {
      setLoading(false)
    }
  }, [nrp])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="min-h-screen pb-24 sm:pb-8  bg-[#f4f7fa] flex items-center justify-center">
      

        <Loader2 className="w-8 h-8 animate-spin text-[#003D79]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen pb-24 sm:pb-8  bg-[#f4f7fa] flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] shadow-xl p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <p className="font-bold text-slate-800">{error || 'Data tidak ditemukan'}</p>
          <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-[#003D79] text-white rounded-xl font-bold text-sm">
            Kembali
          </button>
        </div>
      </div>
    )
  }

  const { employee, stats, timeline, findings_summary } = data

  return (
    <div className="min-h-screen pb-24 sm:pb-8  bg-[#f4f7fa]" style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-br from-[#003D79] to-[#0056b3] rounded-[2rem] shadow-2xl p-6 text-white">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-white/70 hover:text-white text-xs font-black uppercase tracking-widest transition"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Monitoring
          </button>

          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg overflow-hidden">
              {employee.foto_url ? (
                <img src={employee.foto_url} alt={employee.nama} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">{employee.nama}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-blue-100/90">
                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {employee.nrp}</span>
                <span>•</span>
                <span>{employee.jabatan || '-'}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {employee.site || '-'}</span>
                <span>•</span>
                <span>{employee.departemen || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-2xl shadow-lg">
            <Activity className="w-5 h-5 text-blue-600 mb-2" />
            <div className="text-2xl font-black text-slate-800">{stats.total_mcu}</div>
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">Total MCU</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-lg">
            <Calendar className="w-5 h-5 text-emerald-600 mb-2" />
            <div className="text-sm font-black text-slate-800">
              {stats.mcu_expired_at ? formatDate(stats.mcu_expired_at) : 'EXPIRED'}
            </div>
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">Aktif Sampai</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 mb-2" />
            <div className="text-2xl font-black text-slate-800">{stats.total_findings}</div>
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">Total Temuan</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-lg">
            <Clock className="w-5 h-5 text-orange-600 mb-2" />
            <div className="text-2xl font-black text-slate-800">{stats.pending_fu + stats.waiting_verify}</div>
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">Perlu Aksi</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-lg">
            <CheckCircle className="w-5 h-5 text-emerald-600 mb-2" />
            <div className="text-2xl font-black text-slate-800">{stats.completed_fu}</div>
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">Selesai</div>
          </div>
        </div>

        {/* Findings Summary Chart */}
        {findings_summary && findings_summary.length > 0 && (
          <div className="bg-white rounded-[2rem] shadow-xl p-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Riwayat Temuan (Semua MCU)
            </h2>
            <div className="flex flex-wrap gap-2">
              {findings_summary.map((f: any) => (
                <div key={f.jenis} className="px-4 py-2 bg-purple-50 border border-purple-200 rounded-full">
                  <span className="text-xs font-bold text-purple-700">{f.jenis}</span>
                  <span className="ml-2 text-xs font-black text-purple-900">{f.count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white rounded-[2rem] shadow-xl p-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
            <HeartPulse className="w-4 h-4" /> Timeline MCU
          </h2>

          {timeline.length === 0 ? (
            <div className="text-center py-12 text-[#5a6a7e]">
              <HeartPulse className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Belum ada MCU tercatat</p>
            </div>
          ) : (
            <div className="space-y-4">
              {timeline.map((mcu: McuTimeline, idx: number) => (
                <div key={mcu.id} className="relative pl-8 pb-6 border-l-2 border-slate-200 last:border-transparent last:pb-0">
                  {/* Dot */}
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-[#003D79] border-4 border-white shadow-md" />

                  <div className="bg-slate-50 rounded-2xl p-5 hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black uppercase text-[#5a6a7e] tracking-widest">
                            MCU #{mcu.mcu_number}
                          </span>
                          <span className="text-xs text-[#5a6a7e]">•</span>
                          <span className="text-xs font-bold text-slate-600">{mcu.jenis_mcu}</span>
                        </div>
                        <div className="text-lg font-black text-slate-800">{formatDate(mcu.tanggal_mcu)}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {mcu.dokter && `Dr. ${mcu.dokter}`}
                          {mcu.dokter && mcu.rumah_sakit && ' • '}
                          {mcu.rumah_sakit}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge status={mcu.status_mcu} size="md" />
                        <span className="text-[10px] font-bold text-slate-500">
                          {mcu.hasil}
                        </span>
                      </div>
                    </div>

                    {/* Validity */}
                    {mcu.tanggal_expired && (
                      <div className="text-xs text-slate-500 mb-3">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Berlaku sampai: <strong>{formatDate(mcu.tanggal_expired)}</strong>
                      </div>
                    )}

                    {/* Findings */}
                    {mcu.findings.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                          🔬 Temuan ({mcu.findings.length}):
                        </div>
                        {mcu.findings.map(f => (
                          <div key={f.id} className="bg-white rounded-xl p-3 border border-slate-100">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="text-sm font-bold text-slate-800">🔸 {f.jenis_temuan}</div>
                                {f.keterangan_temuan && (
                                  <div className="text-xs text-slate-600 mt-0.5">{f.keterangan_temuan}</div>
                                )}
                                {f.followup_keterangan && (
                                  <div className="text-xs text-slate-500 mt-1 italic">
                                    FU: {f.followup_keterangan}
                                  </div>
                                )}
                              </div>
                              <StatusBadge status={f.status_followup} />
                            </div>
                            {f.followup_file_url && (
                              <a
                                href={f.followup_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#003D79] hover:underline"
                              >
                                <FileText className="w-3 h-3" /> {f.followup_file_name || 'Lihat Bukti FU'}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Tidak ada temuan
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {mcu.foto_catatan_url && (
                        <a
                          href={mcu.foto_catatan_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold hover:bg-blue-200 transition"
                        >
                          <Download className="w-3 h-3" /> Lihat PDF
                        </a>
                      )}
                      <button
                        onClick={() => router.push(`/dashboard/monitoring-mcu/${mcu.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#003D79] text-white rounded-full text-xs font-bold hover:bg-blue-800 transition"
                      >
                        Detail & Edit →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    

      </div>
  )
}