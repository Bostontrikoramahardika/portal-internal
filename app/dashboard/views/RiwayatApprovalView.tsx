'use client'

// RiwayatApprovalView - dipisah dari app/dashboard/page.tsx (tahap 2)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import ApprovalCenterExact from '../components/ApprovalCenterExact';
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { getTablePermissions } from '@/app/lib/tablePermissions'
import { saveOfflineAttendance } from '@/app/lib/offlineDB'
import KoreksiBadge from '../components/KoreksiBadge'

export default function RiwayatApprovalView({ data, onReload }: any) {
  const rows = data?.rows || []
  const [bulan, setBulan] = useState(data?.bulan || String(new Date().getMonth() + 1).padStart(2, '0'))
  const [tahun, setTahun] = useState(data?.tahun || String(new Date().getFullYear()))
  const [filterJenis, setFilterJenis] = useState('ALL')
  const [search, setSearch] = useState('')

  const filteredRows = rows.filter((r: any) => {
    const matchJenis = filterJenis === 'ALL' || String(r.jenis || '').includes(filterJenis)
    const matchSearch = search === '' ||
      String(r.nama_karyawan || '').toLowerCase().includes(search.toLowerCase()) ||
      String(r.jenis || '').toLowerCase().includes(search.toLowerCase()) ||
      String(r.catatan || '').toLowerCase().includes(search.toLowerCase())
    return matchJenis && matchSearch
  })

  async function reloadWithPeriod() {
    window.location.href = `/dashboard?menu=riwayat_approval&bulan=${bulan}&tahun=${tahun}`
  }

  const bulanNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  const statCounts = {
    total: rows.length,
    approved: rows.filter((r: any) => r.status === 'APPROVED').length,
    rejected: rows.filter((r: any) => r.status === 'REJECTED').length
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-2 lg:space-y-4">

      {/* HEADER */}
      <div className="bg-[#003D79] text-white p-3 lg:p-6 rounded-2xl lg:rounded-[2.5rem]">
        <h2 className="text-sm lg:text-2xl font-black tracking-tight">📜 {data.title}</h2>
        <p className="text-blue-200 text-[9px] lg:text-xs font-bold mt-0.5">
          Pengajuan yang pernah Anda proses (Approve/Reject)
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1.5 mt-2.5 lg:mt-4">
          <div className="bg-white/10 rounded-lg lg:rounded-xl p-1.5 lg:p-3 text-center">
            <p className="text-lg lg:text-3xl font-black leading-none">{statCounts.total}</p>
            <p className="text-[7px] lg:text-[10px] font-black uppercase tracking-wide mt-0.5 text-blue-200">Total</p>
          </div>
          <div className="bg-emerald-500/20 text-emerald-200 rounded-lg lg:rounded-xl p-1.5 lg:p-3 text-center">
            <p className="text-lg lg:text-3xl font-black leading-none">{statCounts.approved}</p>
            <p className="text-[7px] lg:text-[10px] font-black uppercase tracking-wide mt-0.5"> Setuju</p>
          </div>
          <div className="bg-rose-500/20 text-rose-200 rounded-lg lg:rounded-xl p-1.5 lg:p-3 text-center">
            <p className="text-lg lg:text-3xl font-black leading-none">{statCounts.rejected}</p>
            <p className="text-[7px] lg:text-[10px] font-black uppercase tracking-wide mt-0.5">❌ Tolak</p>
          </div>
        </div>
      </div>

      {/* FILTER PERIODE */}
      <div className="bg-white rounded-xl lg:rounded-2xl p-2.5 lg:p-4 border border-slate-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
          <span className="text-[9px] lg:text-[10px] font-black text-slate-500 uppercase tracking-wider">📅 Periode:</span>
          <select
            value={bulan}
            onChange={e => setBulan(e.target.value)}
            className="py-1.5 lg:py-2 px-2 lg:px-3 border border-slate-200 rounded-lg lg:rounded-xl text-[11px] lg:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 bg-white"
          >
            {bulanNames.map((b, i) => (
              <option key={i} value={String(i+1).padStart(2, '0')}>{b}</option>
            ))}
          </select>
          <select
            value={tahun}
            onChange={e => setTahun(e.target.value)}
            className="py-1.5 lg:py-2 px-2 lg:px-3 border border-slate-200 rounded-lg lg:rounded-xl text-[11px] lg:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 bg-white"
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={reloadWithPeriod}
            className="bg-[#003D79] text-white px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg lg:rounded-xl text-[10px] lg:text-xs font-black hover:bg-[#002855] active:scale-95 transition-all"
          >
            🔍 Tampilkan
          </button>
        </div>
      </div>

      {/* SEARCH & FILTER JENIS */}
      <div className="bg-white rounded-xl lg:rounded-2xl p-2.5 lg:p-4 border border-slate-100 shadow-sm space-y-2">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Cari nama, jenis, catatan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 lg:pl-8 py-2 lg:py-2.5 pr-3 rounded-lg lg:rounded-xl border border-slate-200 text-[11px] lg:text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79]"
          />
        </div>

        {/* Filter jenis */}
        <div className="grid grid-cols-4 gap-1.5">
          <button onClick={() => setFilterJenis('ALL')} className={`py-1.5 lg:py-2 rounded-lg font-black text-[9px] lg:text-[10px] uppercase tracking-wide transition-all ${filterJenis === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>Semua</button>
          <button onClick={() => setFilterJenis('CUTI')} className={`py-1.5 lg:py-2 rounded-lg font-black text-[9px] lg:text-[10px] uppercase tracking-wide transition-all ${filterJenis === 'CUTI' ? 'bg-blue-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-blue-50'}`}> Cuti</button>
          <button onClick={() => setFilterJenis('LEMBUR')} className={`py-1.5 lg:py-2 rounded-lg font-black text-[9px] lg:text-[10px] uppercase tracking-wide transition-all ${filterJenis === 'LEMBUR' ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-amber-50'}`}>⏰ Lembur</button>
          <button onClick={() => setFilterJenis('SAKIT')} className={`py-1.5 lg:py-2 rounded-lg font-black text-[9px] lg:text-[10px] uppercase tracking-wide transition-all ${filterJenis === 'SAKIT' ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-rose-50'}`}>🤒 Sakit</button>
        </div>

        <p className="text-[9px] lg:text-[10px] font-bold text-slate-400">
          Menampilkan <span className="text-[#003D79] font-black">{filteredRows.length}</span> dari {rows.length} record
        </p>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="lg:hidden space-y-1.5">
        {filteredRows.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-dashed border-slate-200 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">
              Belum ada riwayat approval di periode {data.periode || `${bulan}/${tahun}`}
            </p>
          </div>
        ) : filteredRows.map((r: any, i: number) => {
          const isApproved = r.status === 'APPROVED'
          const jenisColor = String(r.jenis || '').includes('CUTI') ? 'bg-blue-50 text-blue-600 border-blue-200'
            : String(r.jenis || '').includes('LEMBUR') ? 'bg-amber-50 text-amber-600 border-amber-200'
            : String(r.jenis || '').includes('SAKIT') ? 'bg-rose-50 text-rose-600 border-rose-200'
            : 'bg-slate-50 text-slate-600 border-slate-200'

          return (
            <div key={i} className={`bg-white rounded-xl border-l-4 ${isApproved ? 'border-l-emerald-400' : 'border-l-rose-400'} border-slate-100 shadow-sm p-2.5`}>
              <div className="flex items-start gap-2">
                {/* Kiri: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${jenisColor}`}>
                      {r.jenis}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${r.tahap === 'PJO' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                      {r.tahap}
                    </span>
                  </div>
                  <p className="text-[11px] font-black text-slate-800 truncate">{r.nama_karyawan}</p>
                  {r.catatan && (
                    <p className="text-[10px] text-slate-500 italic truncate mt-0.5">"{r.catatan}"</p>
                  )}
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                    {r.tanggal_aksi ? new Date(r.tanggal_aksi).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </p>
                </div>

                {/* Kanan: Status */}
                <span className={`shrink-0 px-2 py-1 rounded-lg text-[9px] font-black ${isApproved ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {isApproved ? '' : '❌'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden lg:block bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#003D79] text-white">
              <tr>
                <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap">Tgl Aksi</th>
                <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap">Jenis</th>
                <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap">Tahap</th>
                <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap">Nama</th>
                <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap">Tgl Pengajuan</th>
                <th className="px-4 py-3 font-black uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="px-4 py-3 font-black uppercase tracking-wider">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-slate-300 font-black uppercase text-xs italic">
                    Belum ada riwayat approval di periode {data.periode || `${bulan}/${tahun}`}
                  </td>
                </tr>
              ) : filteredRows.map((r: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                    {r.tanggal_aksi ? new Date(r.tanggal_aksi).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td className="px-4 py-3 font-black whitespace-nowrap">{r.jenis}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${r.tahap === 'PJO' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                      {r.tahap}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-700 uppercase whitespace-nowrap">{r.nama_karyawan}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {r.tanggal_pengajuan ? new Date(r.tanggal_pengajuan).toLocaleDateString('id-ID') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black border ${
                      r.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-rose-50 text-rose-600 border-rose-200'
                    }`}>
                      {r.status === 'APPROVED' ? ' Approved' : '❌ Rejected'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 italic max-w-xs truncate">
                    {r.catatan ? `"${r.catatan}"` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRows.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">
            <p className="text-[10px] font-bold text-slate-400 text-center">
              {filteredRows.length} Record • BTM Portal v2.6
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
