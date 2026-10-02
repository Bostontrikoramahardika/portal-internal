'use client'

// PenilaianBawahanView - dipisah dari app/dashboard/page.tsx (tahap 2)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import ApprovalCenterExact from '../components/ApprovalCenterExact';
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { getTablePermissions } from '@/app/lib/tablePermissions'
import { saveOfflineAttendance } from '@/app/lib/offlineDB'
import KoreksiBadge from '../components/KoreksiBadge'
import { CrudModal } from './_fields2'

export default function PenilaianBawahanView({ data, onReload }: any) {
  const [selectedEmp, setSelectedEmp] = useState<any>(null)
  const [selectedKpiId, setSelectedKpiId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [searchTim, setSearchTim] = useState('')
  const [showPenilaiDetail, setShowPenilaiDetail] = useState<any>(null)

  const [bulan, setBulan] = useState(data.bulan || String(new Date().getMonth() + 1).padStart(2, '0'))
  const [tahun, setTahun] = useState(data.tahun || String(new Date().getFullYear()))
  const [filterSite, setFilterSite] = useState(data.filter_site || 'ALL')

  const viewOnly = data.view_only === true
  const canEdit = data.can_edit === true
  const canFilterSite = data.can_filter_site === true
  const sitesList = data.sites_list || []
  const summary = data.summary || { total: 0, sudah_dinilai: 0, belum_dinilai: 0, nilai_rata_rata: 0 }
  const periode = data.periode || 'PERIODE INI'

  const bulanOptions = [
    { val: '01', label: 'Januari' }, { val: '02', label: 'Februari' }, { val: '03', label: 'Maret' },
    { val: '04', label: 'April' },   { val: '05', label: 'Mei' },      { val: '06', label: 'Juni' },
    { val: '07', label: 'Juli' },    { val: '08', label: 'Agustus' },  { val: '09', label: 'September' },
    { val: '10', label: 'Oktober' }, { val: '11', label: 'November' }, { val: '12', label: 'Desember' }
  ]
  const tahunOptions = ['2025', '2026', '2027']

  const handleFilterChange = (newBulan: string, newTahun: string, newSite: string) => {
    setBulan(newBulan)
    setTahun(newTahun)
    setFilterSite(newSite)
    const url = new URL(window.location.href)
    url.searchParams.set('bulan', newBulan)
    url.searchParams.set('tahun', newTahun)
    if (newSite !== 'ALL') {
      url.searchParams.set('filter_site', newSite)
    } else {
      url.searchParams.delete('filter_site')
    }
    window.history.pushState({}, '', url)
    onReload?.()
  }

  const filteredBySearch = (data.rows || []).filter((e: any) =>
    e.nama.toLowerCase().includes(searchTim.toLowerCase()) ||
    e.nrp.toLowerCase().includes(searchTim.toLowerCase())
  )

  const operators = filteredBySearch.filter((e: any) =>
    /operator|driver|huler|dt|exca|dozer|grader|compactor/i.test(e.jabatan)
  )
  const mechanics = filteredBySearch.filter((e: any) =>
    /mechanic|mekanik|welder|tyreman|electric|helper plant|plant|admin plant/i.test(e.jabatan) ||
    (e.departemen && e.departemen.toLowerCase().includes('plant'))
  )
  const support = filteredBySearch.filter((e: any) =>
    !operators.includes(e) && !mechanics.includes(e)
  )

  let currentList = filteredBySearch
  if (activeFilter === 'OPERATOR') currentList = operators
  else if (activeFilter === 'PLANT') currentList = mechanics
  else if (activeFilter === 'SUPPORT') currentList = support

  const getNilaiLabel = (nilai: number) => {
    if (nilai >= 85) return { label: 'Sangat Baik', color: 'text-emerald-600' }
    if (nilai >= 70) return { label: 'Baik', color: 'text-blue-600' }
    if (nilai >= 60) return { label: 'Cukup', color: 'text-amber-600' }
    if (nilai > 0) return { label: 'Kurang', color: 'text-rose-600' }
    return { label: '-', color: 'text-slate-400' }
  }

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      {/* HEADER + FILTER */}
      <div className="mb-6 bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
               KPI & Penilaian
            </h2>
            <p className="text-sm text-slate-500 font-medium mt-1">
              Periode: <span className="text-blue-600 font-bold">{periode}</span>
              {canFilterSite && filterSite !== 'ALL' && (
                <span className="ml-2"> • Site: <span className="text-purple-600 font-bold">{filterSite}</span></span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            {/* Filter Site (untuk HR HO & Super Admin) */}
            {canFilterSite && sitesList.length > 0 && (
              <select
                value={filterSite}
                onChange={(e) => handleFilterChange(bulan, tahun, e.target.value)}
                className="px-4 py-2 bg-purple-50 border-2 border-purple-100 rounded-xl text-sm font-bold focus:border-purple-500 outline-none"
              >
                <option value="ALL">🌐 Semua Site</option>
                {sitesList.map((s: string) => (
                  <option key={s} value={s}>📍 {s}</option>
                ))}
              </select>
            )}

            <select
              value={bulan}
              onChange={(e) => handleFilterChange(e.target.value, tahun, filterSite)}
              className="px-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-blue-500 outline-none"
            >
              {bulanOptions.map(b => <option key={b.val} value={b.val}>{b.label}</option>)}
            </select>
            <select
              value={tahun}
              onChange={(e) => handleFilterChange(bulan, e.target.value, filterSite)}
              className="px-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:border-blue-500 outline-none"
            >
              {tahunOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="bg-slate-50 rounded-2xl p-4 text-center">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total</div>
            <div className="text-2xl font-black text-slate-900">{summary.total}</div>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-4 text-center">
            <div className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-1"> Dinilai</div>
            <div className="text-2xl font-black text-emerald-600">{summary.sudah_dinilai}</div>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 text-center">
            <div className="text-xs font-black text-amber-500 uppercase tracking-widest mb-1">⏳ Pending</div>
            <div className="text-2xl font-black text-amber-600">{summary.belum_dinilai}</div>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4 text-center">
            <div className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">⭐ Rata-rata</div>
            <div className="text-2xl font-black text-blue-600">{summary.nilai_rata_rata || '-'}</div>
          </div>
        </div>
      </div>

      {/* FILTER KATEGORI */}
      <div className="mb-6 flex flex-col md:flex-row justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border-2 transition-all ${activeFilter === 'ALL' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}
          >
            📋 Semua ({filteredBySearch.length})
          </button>
          {operators.length > 0 && (
            <button
              onClick={() => setActiveFilter('OPERATOR')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border-2 transition-all ${activeFilter === 'OPERATOR' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}
            >
              🚜 Operator ({operators.length})
            </button>
          )}
          {mechanics.length > 0 && (
            <button
              onClick={() => setActiveFilter('PLANT')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border-2 transition-all ${activeFilter === 'PLANT' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}
            >
              🛠️ Plant ({mechanics.length})
            </button>
          )}
          {support.length > 0 && (
            <button
              onClick={() => setActiveFilter('SUPPORT')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border-2 transition-all ${activeFilter === 'SUPPORT' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}
            >
              💼 Support ({support.length})
            </button>
          )}
        </div>

        <div className="w-full md:w-64">
          <input
            type="text"
            placeholder="🔍 Cari Nama / NRP..."
            value={searchTim}
            onChange={(e) => setSearchTim(e.target.value)}
            className="w-full p-3 bg-white border-2 border-slate-100 rounded-2xl shadow-sm focus:border-blue-500 outline-none font-bold text-xs"
          />
        </div>
      </div>

      {/* CARDS */}
      {currentList.length === 0 ? (
        <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
          <p className="text-slate-300 font-black uppercase tracking-widest italic text-lg">
            Tidak ada karyawan di kategori ini
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {currentList.map((emp: any) => {
            const dinilaiSaya = emp.dinilai_oleh_saya
            const totalPenilai = emp.total_penilai || 0
            const nilaiSaya = emp.nilai_saya
            const nilaiRataRata = emp.nilai_rata_rata || 0
            const label = getNilaiLabel(nilaiRataRata)
            const sudahDinilaiOrang = totalPenilai > 0

            // ══════════════════════════════════
            // VIEW-ONLY MODE (HR HO): Card simpel
            // ══════════════════════════════════
            if (viewOnly) {
              return (
                <div
                  key={emp.nrp}
                  className={`bg-white rounded-3xl border-2 p-5 shadow-md transition-all ${
                    sudahDinilaiOrang ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100'
                  }`}
                >
                  {/* Header karyawan */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-md ${
                      sudahDinilaiOrang ? 'bg-emerald-600' : 'bg-slate-800'
                    }`}>
                      {emp.nama[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-slate-900 leading-tight truncate">{emp.nama}</h3>
                      <p className="text-[11px] font-bold text-slate-600 truncate">{emp.jabatan}</p>
                      <p className="text-[10px] font-medium text-slate-400 italic">📍 {emp.site} • {emp.nrp}</p>
                    </div>
                  </div>

                  {/* Nilai display */}
                  {sudahDinilaiOrang ? (
                    <div className="bg-gradient-to-br from-slate-50 to-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nilai Rata-Rata</p>
                      <p className={`text-4xl font-black ${label.color}`}>{nilaiRataRata}</p>
                      <p className={`text-xs font-black mt-1 ${label.color}`}>{label.label}</p>
                      <div className="mt-3 pt-3 border-t border-emerald-100">
                        <p className="text-[10px] font-bold text-slate-500">
                          Dinilai oleh <span className="text-slate-900 font-black">{totalPenilai}</span> orang
                        </p>
                        {emp.list_penilai && emp.list_penilai.length > 0 && (
                          <button
                            onClick={() => setShowPenilaiDetail(emp)}
                            className="mt-2 text-[10px] font-bold text-blue-600 hover:text-blue-800"
                          >
                            📋 Lihat detail →
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-2xl p-4 text-center">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Belum ada penilaian</p>
                    </div>
                  )}
                </div>
              )
            }

            // ══════════════════════════════════
            // ATASAN/PJO/SUPER ADMIN MODE: Full card
            // ══════════════════════════════════
            return (
              <div
                key={emp.nrp}
                className={`bg-white rounded-3xl border-2 p-5 shadow-md transition-all group relative overflow-hidden ${
                  dinilaiSaya ? 'border-emerald-200 bg-emerald-50/30' :
                  sudahDinilaiOrang ? 'border-blue-200 bg-blue-50/20' :
                  'border-slate-100 hover:border-slate-300'
                }`}
              >
                {/* Badge status */}
                <div className={`absolute top-0 right-0 px-3 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase text-white tracking-wider ${
                  dinilaiSaya ? 'bg-emerald-500' :
                  sudahDinilaiOrang ? 'bg-blue-500' :
                  'bg-slate-400'
                }`}>
                  {dinilaiSaya ? ' Dinilai Anda' : sudahDinilaiOrang ? `👥 Dinilai ${totalPenilai} lain` : '⏳ Belum Dinilai'}
                </div>

                {/* Header karyawan */}
                <div className="flex items-center gap-3 mb-4 mt-2">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-md ${
                    dinilaiSaya ? 'bg-emerald-600' : 'bg-slate-800'
                  }`}>
                    {emp.nama[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 leading-tight truncate text-sm">{emp.nama}</h3>
                    <p className="text-[10px] font-bold text-slate-500 truncate">{emp.jabatan}</p>
                    <p className="text-[9px] font-medium text-slate-400 italic">{emp.nrp} • {emp.site}</p>
                  </div>
                </div>

                {/* Nilai display */}
                {sudahDinilaiOrang && (
                  <div className="bg-white border border-slate-100 rounded-2xl p-3 mb-3">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rata-rata</p>
                        <p className={`text-xl font-black ${label.color}`}>{nilaiRataRata}</p>
                        <p className={`text-[9px] font-bold ${label.color}`}>{label.label}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nilai Anda</p>
                        <p className="text-xl font-black text-slate-900">{nilaiSaya ?? '-'}</p>
                        <p className="text-[9px] font-bold text-slate-500">
                          {totalPenilai} penilai
                        </p>
                      </div>
                    </div>

                    {emp.list_penilai && emp.list_penilai.length > 0 && (
                      <button
                        onClick={() => setShowPenilaiDetail(emp)}
                        className="w-full mt-2 text-[10px] font-bold text-blue-600 hover:text-blue-800 py-1"
                      >
                        📋 Lihat detail penilai →
                      </button>
                    )}
                  </div>
                )}

                {/* Tombol Aksi */}
                {canEdit && (
                  <button
                    onClick={() => {
                      setSelectedEmp(emp)
                      setSelectedKpiId(emp.kpi_saya_id)
                    }}
                    className={`w-full py-3 rounded-xl font-black text-[10px] tracking-[0.2em] uppercase transition-all shadow-md active:scale-95 ${
                      dinilaiSaya
                        ? 'bg-white text-emerald-600 border-2 border-emerald-500 hover:bg-emerald-500 hover:text-white'
                        : 'bg-slate-950 text-white hover:bg-blue-600'
                    }`}
                  >
                    {dinilaiSaya ? '🔄 Edit Nilai Anda' : '⭐ Beri Penilaian'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL DETAIL PENILAI */}
      {showPenilaiDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
             onClick={() => setShowPenilaiDetail(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg">
                {showPenilaiDetail.nama[0]}
              </div>
              <div>
                <h3 className="font-black text-slate-900">{showPenilaiDetail.nama}</h3>
                <p className="text-xs font-bold text-slate-500">{showPenilaiDetail.jabatan}</p>
              </div>
            </div>

            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Riwayat Penilaian {periode}
            </h4>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {showPenilaiDetail.list_penilai.map((p: any, i: number) => (
                <div key={i} className={`p-4 rounded-2xl border-2 ${p.is_saya ? 'border-emerald-300 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-black text-slate-900">
                        {p.penilai_nama} {p.is_saya && <span className="text-[9px] bg-emerald-500 text-white px-2 py-0.5 rounded-full ml-1">ANDA</span>}
                      </p>
                      <p className="text-[10px] text-slate-500 italic">{new Date(p.created_at).toLocaleDateString('id-ID')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900">{p.nilai_total}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                    </div>
                  </div>
                  {p.catatan && (
                    <p className="text-[11px] text-slate-600 italic mt-2 pt-2 border-t border-slate-200">
                      💬 {p.catatan}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowPenilaiDetail(null)}
              className="w-full mt-5 py-3 rounded-xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* MODAL INPUT/EDIT KPI */}
      {selectedEmp && (
        <CrudModal
          table="kpi"
          mode={selectedKpiId ? 'edit' : 'create'}
          row={selectedKpiId
            ? { id: selectedKpiId }
            : { nrp: selectedEmp.nrp, nama: selectedEmp.nama, periode: periode }
          }
          onClose={() => { setSelectedEmp(null); setSelectedKpiId(null) }}
          onSuccess={() => { setSelectedEmp(null); setSelectedKpiId(null); onReload() }}
        />
      )}
    </div>
  )
}
