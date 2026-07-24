// app/dashboard/mcu-saya/page.tsx v2.0
// Fix: tambah section Download Surat Rujukan per temuan (Karyawan)
'use client'
import { useState, useEffect } from 'react'
import {
  HeartPulse, FileText, Upload, CheckCircle,
  Clock, XCircle, AlertCircle, Loader2,
  Calendar, ChevronDown, ChevronUp, Download, Info
} from 'lucide-react'

interface Finding {
  id: string
  jenis_temuan: string
  keterangan_temuan: string
  status_followup: string
  followup_file_url: string
  followup_file_name: string
  followup_keterangan: string
  followup_submitted_at: string
  verified_at: string
  verified_status: string
  verified_note: string
  // 🆕 Rujukan dari HR
  rujukan_file_url: string | null
  rujukan_file_name: string | null
  rujukan_uploaded_at: string | null
}

interface Mcu {
  id: string
  tanggal_mcu: string
  jenis_mcu: string
  hasil: string
  dokter: string
  rumah_sakit: string
  tanggal_berlaku: string
  tanggal_expired: string
  status_mcu: string
  butuh_followup: boolean
  followup_deadline: string
  foto_catatan_url: string
  foto_catatan_name: string
  mcu_findings: Finding[]
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    FIT:             { label: 'FIT',                  cls: 'bg-emerald-100 text-emerald-700' },
    OPEN:            { label: 'Perlu Follow Up',       cls: 'bg-amber-100 text-amber-700' },
    CLOSED:          { label: 'Selesai',              cls: 'bg-blue-100 text-blue-700' },
    PERLU_PERHATIAN: { label: 'Perlu Perhatian',       cls: 'bg-rose-100 text-rose-700' },
    BELUM_FU:        { label: 'Belum disetor',         cls: 'bg-slate-100 text-slate-600' },
    SUDAH_FU:        { label: 'Menunggu verifikasi',   cls: 'bg-orange-100 text-orange-700' },
    SELESAI:         { label: 'Selesai ✓',            cls: 'bg-emerald-100 text-emerald-700' },
    DITOLAK:         { label: 'Ditolak — ulangi FU',  cls: 'bg-rose-100 text-rose-700' },
  }
  const s = map[status] || { label: status, cls: 'bg-slate-100 text-slate-600' }
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
}

// 🆕 Component: Rujukan section untuk karyawan
function RujukanCard({ finding }: { finding: Finding }) {
  const hasRujukan = !!finding.rujukan_file_url

  if (hasRujukan) {
    return (
      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 mb-2">
        <div className="flex items-center gap-2 mb-2">
          <Download className="w-4 h-4 text-blue-600" />
          <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">
            📥 Surat Rujukan dari HR
          </span>
        </div>
        <a
          href={finding.rujukan_file_url!}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md"
        >
          <Download className="w-4 h-4" />
          Download Surat Rujukan
        </a>
        <p className="text-[10px] text-blue-500 mt-1.5 text-center">
          Cetak surat ini dan bawa ke dokter untuk pemeriksaan follow up
        </p>
      </div>
    )
  }

  return (
    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 mb-2">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-bold text-amber-800">Surat Rujukan Belum Tersedia</div>
          <p className="text-[10px] text-amber-700 mt-0.5">
            HR belum upload surat rujukan untuk temuan ini. Silakan hubungi HR untuk info lebih lanjut.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function McuSayaPage() {
  const [mcuList, setMcuList] = useState<Mcu[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [fuTarget, setFuTarget] = useState<{ mcuId: string; findingId: string; jenis: string } | null>(null)
  const [fuFile, setFuFile] = useState<File | null>(null)
  const [fuKet, setFuKet] = useState('')
  const [fuLoading, setFuLoading] = useState(false)
  const [fuError, setFuError] = useState('')
  const [fuSuccess, setFuSuccess] = useState('')

  const getToken = () =>
    typeof window !== 'undefined' ? localStorage.getItem('btm_session_token_v1') : null

  const getHeaders = (): Record<string, string> => {
    const token = getToken()
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  const fetchMcu = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/mcu/saya', { headers: getHeaders() })
      const json = await res.json()
      if (json.ok) setMcuList(json.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMcu() }, [])

  // Auto-expand MCU pertama kali load kalau ada finding OPEN
  useEffect(() => {
    if (mcuList.length > 0 && !expanded) {
      const hasOpen = mcuList[0].mcu_findings?.some(f => f.status_followup === 'BELUM_FU' || f.status_followup === 'DITOLAK')
      if (hasOpen) setExpanded(mcuList[0].id)
    }
  }, [mcuList])

  const handleUploadFu = async () => {
    if (!fuTarget || !fuFile) return
    setFuLoading(true)
    setFuError('')
    setFuSuccess('')

    try {
      if (fuFile.size > 3 * 1024 * 1024) {
        setFuError('File maks 3MB')
        return
      }

      const fd = new FormData()
      fd.append('file', fuFile)
      if (fuKet) fd.append('keterangan', fuKet)

      const res = await fetch(
        `/api/mcu/${fuTarget.mcuId}/findings/${fuTarget.findingId}/followup`,
        { method: 'POST', headers: getHeaders(), body: fd }
      )
      const json = await res.json()

      if (json.ok) {
        setFuSuccess('Bukti follow up berhasil dikirim! Menunggu verifikasi HR.')
        setFuTarget(null)
        setFuFile(null)
        setFuKet('')
        fetchMcu()
      } else {
        setFuError(json.error || 'Gagal upload')
      }
    } catch {
      setFuError('Terjadi kesalahan')
    } finally {
      setFuLoading(false)
    }
  }

  const isExpired = (tgl: string) => tgl && new Date(tgl) < new Date()

  const latestMcu = mcuList[0]
  const hasOpenFu = latestMcu?.status_mcu === 'OPEN'

  return (
    <div className="min-h-screen bg-[#f4f7fa]" style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="bg-white rounded-[2rem] shadow-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-[#003D79] flex items-center justify-center shadow-lg">
              <HeartPulse className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-800">MCU Saya</h1>
              <p className="text-sm text-slate-500">Medical Check-Up Pribadi</p>
            </div>
          </div>

          {hasOpenFu && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-[1.5rem] flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-black text-amber-800 text-sm">Ada Temuan yang Perlu Ditindaklanjuti</div>
                <div className="text-xs text-amber-700 mt-1">
                  📥 <strong>Download surat rujukan</strong> di bawah, bawa ke dokter, lalu upload bukti pemeriksaan.
                </div>
                {latestMcu.followup_deadline && (
                  <div className="text-xs font-bold text-amber-600 mt-1">
                    Deadline: {new Date(latestMcu.followup_deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {fuSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-[1.5rem] flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">{fuSuccess}</span>
          </div>
        )}

        {/* List MCU */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#003D79]" />
          </div>
        ) : mcuList.length === 0 ? (
          <div className="bg-white rounded-[2rem] shadow-xl p-12 text-center">
            <HeartPulse className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-400">Belum ada data MCU</p>
          </div>
        ) : (
          mcuList.map((mcu, idx) => (
            <div key={mcu.id} className="bg-white rounded-[2rem] shadow-xl overflow-hidden">
              <div className="p-5 cursor-pointer" onClick={() => setExpanded(expanded === mcu.id ? null : mcu.id)}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      {idx === 0 ? 'MCU TERAKHIR' : `MCU ${idx + 1}`}
                    </div>
                    <div className="font-black text-slate-800">{mcu.jenis_mcu}</div>
                    <div className="text-sm text-slate-500">
                      {mcu.tanggal_mcu ? new Date(mcu.tanggal_mcu).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusChip status={mcu.status_mcu} />
                    {expanded === mcu.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {isExpired(mcu.tanggal_expired) && (
                  <div className="mt-2 text-xs text-rose-600 font-bold">⚠️ MCU sudah expired!</div>
                )}

                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-xl p-2 text-center">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Hasil</div>
                    <div className="text-sm font-black text-slate-700 mt-0.5">{mcu.hasil || '-'}</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2 text-center">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Temuan</div>
                    <div className="text-sm font-black text-slate-700 mt-0.5">{mcu.mcu_findings?.length || 0}</div>
                  </div>
                  <div className={`rounded-xl p-2 text-center ${isExpired(mcu.tanggal_expired) ? 'bg-rose-50' : 'bg-slate-50'}`}>
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Berlaku s/d</div>
                    <div className={`text-xs font-black mt-0.5 ${isExpired(mcu.tanggal_expired) ? 'text-rose-600' : 'text-slate-700'}`}>
                      {mcu.tanggal_expired ? new Date(mcu.tanggal_expired).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                    </div>
                  </div>
                </div>
              </div>

              {expanded === mcu.id && (
                <div className="border-t border-slate-100 p-5 space-y-4">
                  {mcu.foto_catatan_url && (
                    <a
                      href={mcu.foto_catatan_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 bg-[#003D79]/5 rounded-xl text-[#003D79] font-bold text-sm hover:bg-[#003D79]/10 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Lihat / Download Hasil MCU Utama
                    </a>
                  )}

                  {mcu.mcu_findings?.length > 0 && (
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Temuan & Tindak Lanjut</div>
                      <div className="space-y-4">
                        {mcu.mcu_findings.map(f => (
                          <div key={f.id} className="border-2 border-slate-200 rounded-[1.5rem] p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="font-black text-slate-800">🔬 {f.jenis_temuan}</div>
                                {f.keterangan_temuan && (
                                  <p className="text-sm text-slate-500 mt-0.5">{f.keterangan_temuan}</p>
                                )}
                              </div>
                              <StatusChip status={f.status_followup} />
                            </div>

                            {/* 🆕 STEP 1: Download Surat Rujukan */}
                            {(f.status_followup === 'BELUM_FU' || f.status_followup === 'DITOLAK') && (
                              <div className="mb-3">
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                                  Step 1 — Ambil Surat Rujukan
                                </div>
                                <RujukanCard finding={f} />
                              </div>
                            )}

                            {/* Bukti FU yg sudah diupload */}
                            {f.followup_file_url && (
                              <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 mb-2">
                                <div className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-1">📤 Bukti FU Dikirim</div>
                                <a href={f.followup_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-700 font-semibold hover:underline flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {f.followup_file_name}
                                </a>
                                {f.followup_keterangan && <p className="text-xs text-orange-600 mt-1">{f.followup_keterangan}</p>}
                              </div>
                            )}

                            {/* Hasil verifikasi */}
                            {f.verified_at && (
                              <div className={`p-3 rounded-xl mb-2 ${f.verified_status === 'SELESAI' ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                                <div className="text-[9px] font-black uppercase tracking-widest mb-0.5">
                                  <span className={f.verified_status === 'SELESAI' ? 'text-emerald-600' : 'text-rose-600'}>
                                    {f.verified_status === 'SELESAI' ? '✓ FU Diterima HR' : '✗ FU Ditolak HR — Silakan Upload Ulang'}
                                  </span>
                                </div>
                                {f.verified_note && <p className="text-xs text-slate-600 mt-1">{f.verified_note}</p>}
                              </div>
                            )}

                            {/* 🆕 STEP 2: Upload Bukti FU */}
                            {(f.status_followup === 'BELUM_FU' || f.status_followup === 'DITOLAK') && (
                              <div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                                  Step 2 — Upload Bukti dari Dokter
                                </div>
                                <button
                                  onClick={() => setFuTarget({ mcuId: mcu.id, findingId: f.id, jenis: f.jenis_temuan })}
                                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#003D79] text-white rounded-[1.2rem] text-sm font-bold hover:bg-[#002D5F]"
                                >
                                  <Upload className="w-4 h-4" />
                                  {f.status_followup === 'DITOLAK' ? 'Upload Ulang Bukti FU' : 'Upload Bukti Follow Up'}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal Upload FU */}
      {fuTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-[2.5rem] w-full max-w-lg p-6 animate-slide-up">
            <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-5" />
            <h3 className="text-xl font-black text-slate-800 mb-1">Upload Bukti Follow Up</h3>
            <p className="text-sm text-slate-500 mb-5">Temuan: <strong>{fuTarget.jenis}</strong></p>

            {fuError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">{fuError}</div>
            )}

            <div className="mb-4">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
                Upload Bukti (PDF/JPG/PNG, maks 3MB) *
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setFuFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[#003D79] file:text-white file:text-xs file:font-bold"
              />
              {fuFile && (
                <p className="text-xs text-emerald-600 mt-1">✓ {fuFile.name} ({(fuFile.size / 1024 / 1024).toFixed(2)} MB)</p>
              )}
            </div>

            <div className="mb-6">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Keterangan (opsional)</label>
              <textarea
                value={fuKet}
                onChange={e => setFuKet(e.target.value)}
                placeholder="Ceritakan tindak lanjut yang sudah dilakukan..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-[1.2rem] text-sm resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setFuTarget(null); setFuFile(null); setFuKet(''); setFuError('') }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-[1.5rem] font-bold text-sm">Batal</button>
              <button
                onClick={handleUploadFu}
                disabled={fuLoading || !fuFile}
                className="flex-1 py-3 bg-[#003D79] text-white rounded-[1.5rem] font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {fuLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Mengirim...</> : <><Upload className="w-4 h-4" />Kirim Bukti</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}