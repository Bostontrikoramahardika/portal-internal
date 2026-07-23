// app/dashboard/monitoring-mcu/[id]/page.tsx
'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, HeartPulse, Plus, Trash2, CheckCircle,
  XCircle, Clock, Download, Upload, Loader2, AlertCircle,
  FileText, User, Calendar, Building2, ChevronDown
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
  verified_by: string
  verified_at: string
  verified_status: string
  verified_note: string
}

interface McuDetail {
  id: string
  nrp: string
  nama_karyawan: string
  tanggal_mcu: string
  jenis_mcu: string
  hasil: string
  dokter: string
  rumah_sakit: string
  tanggal_berlaku: string
  tanggal_expired: string
  catatan_hrga: string
  keterangan: string
  status_mcu: string
  butuh_followup: boolean
  followup_deadline: string
  temuan_summary: string
  foto_catatan_url: string
  foto_catatan_name: string
  gdrive_folder_id: string
  uploaded_at: string
  updated_at: string
  employees: { jabatan: string; departemen: string; site: string; foto_url: string }
  mcu_findings: Finding[]
  mcu_audit_log: AuditLog[]
}

interface AuditLog {
  id: string
  action: string
  actor_name: string
  actor_role: string
  note: string
  created_at: string
}

// ─── Finding Status Badge ─────────────────────────────────────
function FindingStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    BELUM_FU: 'bg-slate-100 text-slate-600',
    SUDAH_FU: 'bg-orange-100 text-orange-700',
    SELESAI:  'bg-emerald-100 text-emerald-700',
    DITOLAK:  'bg-rose-100 text-rose-700',
  }
  const labels: Record<string, string> = {
    BELUM_FU: 'Belum FU',
    SUDAH_FU: 'Menunggu Verifikasi',
    SELESAI:  'Selesai ✓',
    DITOLAK:  'Ditolak ✗',
  }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[status] || 'bg-slate-100 text-slate-500'}`}>
      {labels[status] || status}
    </span>
  )
}

export default function DetailMcuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [mcu, setMcu] = useState<McuDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Add finding
  const [showAddFinding, setShowAddFinding] = useState(false)
  const [newFinding, setNewFinding] = useState({ jenis_temuan: '', keterangan_temuan: '' })
  const [savingFinding, setSavingFinding] = useState(false)

  // Verify modal
  const [verifyTarget, setVerifyTarget] = useState<{ findingId: string; action: 'SELESAI' | 'DITOLAK' } | null>(null)
  const [verifyNote, setVerifyNote] = useState('')
  const [verifying, setVerifying] = useState(false)

  // Finding types
  const findingTypes = [
    'Mata','Gigi','Telinga','Kulit','Jantung',
    'Paru-paru','Hati','Ginjal','Tekanan Darah',
    'Kolesterol','Gula Darah','Asam Urat','Lainnya'
  ]

  const getToken = () =>
    typeof window !== 'undefined' ? localStorage.getItem('btm_session_token_v1') : null

  const getHeaders = (): Record<string, string> => {
    const token = getToken()
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/mcu/${id}`, { headers: getHeaders() })
      const json = await res.json()
      if (json.ok) setMcu(json.data)
      else setError(json.error || 'Gagal memuat data')
    } catch {
      setError('Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDetail() }, [id])

  const handleAddFinding = async () => {
    if (!newFinding.jenis_temuan) return
    setSavingFinding(true)
    try {
      const res = await fetch(`/api/mcu/${id}/findings`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(newFinding),
      })
      const json = await res.json()
      if (json.ok) {
        setShowAddFinding(false)
        setNewFinding({ jenis_temuan: '', keterangan_temuan: '' })
        fetchDetail()
      }
    } finally {
      setSavingFinding(false)
    }
  }

  const handleDeleteFinding = async (findingId: string) => {
    if (!confirm('Hapus temuan ini?')) return
    await fetch(`/api/mcu/${id}/findings?findingId=${findingId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
    fetchDetail()
  }

  const handleVerify = async () => {
    if (!verifyTarget) return
    setVerifying(true)
    try {
      const res = await fetch(`/api/mcu/${id}/findings/${verifyTarget.findingId}/verify`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: verifyTarget.action, note: verifyNote }),
      })
      const json = await res.json()
      if (json.ok) {
        setVerifyTarget(null)
        setVerifyNote('')
        fetchDetail()
      }
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f7fa] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#003D79]" />
      </div>
    )
  }

  if (error || !mcu) {
    return (
      <div className="min-h-screen bg-[#f4f7fa] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <p className="font-semibold text-slate-600">{error || 'Data tidak ditemukan'}</p>
          <button onClick={() => router.back()} className="mt-4 text-[#003D79] font-bold text-sm">← Kembali</button>
        </div>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    FIT:             'bg-emerald-100 text-emerald-700 border-emerald-200',
    OPEN:            'bg-amber-100 text-amber-700 border-amber-200',
    CLOSED:          'bg-blue-100 text-blue-700 border-blue-200',
    PERLU_PERHATIAN: 'bg-rose-100 text-rose-700 border-rose-200',
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa]" style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2.5 bg-white rounded-2xl shadow-md hover:bg-slate-50">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800">Detail MCU</h1>
            <p className="text-sm text-slate-500">{mcu.nama_karyawan} · {mcu.nrp}</p>
          </div>
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold border ${statusColors[mcu.status_mcu] || 'bg-slate-100 text-slate-600'}`}>
            {mcu.status_mcu}
          </span>
        </div>

        {/* ── Info Karyawan ── */}
        <div className="bg-white rounded-[2rem] shadow-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#003D79]/10 flex items-center justify-center">
              <User className="w-7 h-7 text-[#003D79]" />
            </div>
            <div className="flex-1">
              <div className="font-black text-slate-800 text-lg">{mcu.nama_karyawan}</div>
              <div className="text-sm text-slate-500">{mcu.employees?.jabatan} · {mcu.employees?.departemen}</div>
              <div className="text-sm text-slate-400">{mcu.employees?.site}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            {[
              { label: 'Tanggal MCU', value: mcu.tanggal_mcu ? new Date(mcu.tanggal_mcu).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-' },
              { label: 'Jenis MCU', value: mcu.jenis_mcu || '-' },
              { label: 'Hasil', value: mcu.hasil || '-' },
              { label: 'Dokter', value: mcu.dokter || '-' },
              { label: 'Rumah Sakit', value: mcu.rumah_sakit || '-' },
              { label: 'Berlaku s/d', value: mcu.tanggal_expired ? new Date(mcu.tanggal_expired).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-' },
            ].map(item => (
              <div key={item.label}>
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{item.label}</div>
                <div className="text-sm font-semibold text-slate-700">{item.value}</div>
              </div>
            ))}
          </div>

          {mcu.catatan_hrga && (
            <div className="mt-4 p-3 bg-slate-50 rounded-xl">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Catatan HRGA</div>
              <div className="text-sm text-slate-600">{mcu.catatan_hrga}</div>
            </div>
          )}

          {mcu.foto_catatan_url && (
            <a
              href={mcu.foto_catatan_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-2 text-[#003D79] font-bold text-sm hover:underline"
            >
              <FileText className="w-4 h-4" />
              Lihat Hasil MCU ({mcu.foto_catatan_name || 'PDF'})
            </a>
          )}
        </div>

        {/* ── Temuan & Follow Up ── */}
        <div className="bg-white rounded-[2rem] shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-800">Temuan & Follow Up</h2>
            <button
              onClick={() => setShowAddFinding(true)}
              className="flex items-center gap-1.5 text-xs font-bold bg-[#003D79] text-white px-3 py-2 rounded-[1rem] hover:bg-[#002D5F]"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Temuan
            </button>
          </div>

          {/* Add Finding Form */}
          {showAddFinding && (
            <div className="mb-4 p-4 bg-slate-50 rounded-[1.5rem] border border-slate-200">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Jenis Temuan</div>
              <select
                value={newFinding.jenis_temuan}
                onChange={e => setNewFinding(p => ({ ...p, jenis_temuan: e.target.value }))}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-[1.2rem] text-sm mb-3"
              >
                <option value="">-- Pilih jenis temuan --</option>
                {findingTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Keterangan</div>
              <textarea
                value={newFinding.keterangan_temuan}
                onChange={e => setNewFinding(p => ({ ...p, keterangan_temuan: e.target.value }))}
                placeholder="Detail temuan medis..."
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-[1.2rem] text-sm resize-none mb-3"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddFinding(false)}
                  className="flex-1 py-2 bg-slate-200 text-slate-600 rounded-[1rem] text-sm font-bold"
                >Batal</button>
                <button
                  onClick={handleAddFinding}
                  disabled={savingFinding || !newFinding.jenis_temuan}
                  className="flex-1 py-2 bg-[#003D79] text-white rounded-[1rem] text-sm font-bold disabled:opacity-50"
                >
                  {savingFinding ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Simpan'}
                </button>
              </div>
            </div>
          )}

          {/* Findings List */}
          {mcu.mcu_findings.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <HeartPulse className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Tidak ada temuan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {mcu.mcu_findings.map(f => (
                <div key={f.id} className="border border-slate-200 rounded-[1.5rem] p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-black text-slate-800">{f.jenis_temuan}</div>
                      {f.keterangan_temuan && (
                        <div className="text-sm text-slate-500 mt-0.5">{f.keterangan_temuan}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <FindingStatus status={f.status_followup} />
                      {f.status_followup === 'BELUM_FU' && (
                        <button
                          onClick={() => handleDeleteFinding(f.id)}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bukti FU yang sudah diupload */}
                  {f.followup_file_url && (
                    <div className="mt-2 p-3 bg-orange-50 rounded-xl">
                      <div className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-1">Bukti Follow Up</div>
                      <a
                        href={f.followup_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-orange-700 font-semibold hover:underline"
                      >
                        <FileText className="w-4 h-4" />
                        {f.followup_file_name || 'Lihat Bukti'}
                      </a>
                      {f.followup_keterangan && (
                        <p className="text-xs text-orange-600 mt-1">{f.followup_keterangan}</p>
                      )}
                      <p className="text-[10px] text-orange-400 mt-1">
                        Dikirim: {f.followup_submitted_at ? new Date(f.followup_submitted_at).toLocaleString('id-ID') : '-'}
                      </p>
                    </div>
                  )}

                  {/* Verified info */}
                  {f.verified_at && (
                    <div className={`mt-2 p-3 rounded-xl ${f.verified_status === 'SELESAI' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                      <div className="text-[9px] font-black uppercase tracking-widest mb-1">
                        {f.verified_status === 'SELESAI' ? (
                          <span className="text-emerald-600">Verifikasi Diterima ✓</span>
                        ) : (
                          <span className="text-rose-600">Verifikasi Ditolak ✗</span>
                        )}
                      </div>
                      {f.verified_note && <p className="text-xs text-slate-600">{f.verified_note}</p>}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(f.verified_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                  )}

                  {/* Tombol Verifikasi (untuk HR) */}
                  {f.status_followup === 'SUDAH_FU' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setVerifyTarget({ findingId: f.id, action: 'SELESAI' })}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 text-white rounded-[1rem] text-xs font-bold hover:bg-emerald-700"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Terima FU
                      </button>
                      <button
                        onClick={() => setVerifyTarget({ findingId: f.id, action: 'DITOLAK' })}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rose-600 text-white rounded-[1rem] text-xs font-bold hover:bg-rose-700"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Tolak FU
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Audit Log ── */}
        {mcu.mcu_audit_log?.length > 0 && (
          <div className="bg-white rounded-[2rem] shadow-xl p-6">
            <h2 className="text-lg font-black text-slate-800 mb-4">Riwayat Perubahan</h2>
            <div className="space-y-3">
              {mcu.mcu_audit_log.map(log => (
                <div key={log.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-[#003D79] mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-700">{log.action.replace(/_/g, ' ')}</div>
                    <div className="text-slate-500 text-xs">{log.actor_name} · {log.note}</div>
                    <div className="text-slate-400 text-xs">{new Date(log.created_at).toLocaleString('id-ID')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Verifikasi ── */}
      {verifyTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-black text-slate-800 mb-4">
              {verifyTarget.action === 'SELESAI' ? '✓ Terima Follow Up' : '✗ Tolak Follow Up'}
            </h3>
            <div className="mb-4">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 block">Catatan (opsional)</label>
              <textarea
                value={verifyNote}
                onChange={e => setVerifyNote(e.target.value)}
                placeholder="Alasan terima/tolak..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-[1.2rem] text-sm resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setVerifyTarget(null); setVerifyNote('') }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-[1.2rem] font-bold text-sm"
              >Batal</button>
              <button
                onClick={handleVerify}
                disabled={verifying}
                className={`flex-1 py-3 text-white rounded-[1.2rem] font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 ${
                  verifyTarget.action === 'SELESAI' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : verifyTarget.action === 'SELESAI' ? 'Terima' : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}