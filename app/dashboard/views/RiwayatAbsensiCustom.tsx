'use client'

// RiwayatAbsensiCustom - dipisah dari app/dashboard/page.tsx (tahap 2)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import ApprovalCenterExact from '../components/ApprovalCenterExact';
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { getTablePermissions } from '@/app/lib/tablePermissions'
import { saveOfflineAttendance } from '@/app/lib/offlineDB'
import KoreksiBadge from '../components/KoreksiBadge'

export default function RiwayatAbsensiCustom({ data }: any) {
  const allRows = [...(data?.rows || [])].sort((a: any, b: any) =>
    new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
  )

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')

  const rows = allRows.filter((r: any) => {
    const ket = String(r.keterangan || '').toUpperCase()
    const actual = String(r.actual || '').toUpperCase()
    const tanggal = String(r.tanggal || '')

    const matchSearch =
      search === '' ||
      tanggal.includes(search) ||
      actual.includes(search.toUpperCase()) ||
      ket.includes(search.toUpperCase())

    let matchStatus = true
    if (filterStatus === 'HADIR') matchStatus = ket.includes('SUKSES') && !ket.includes('TERLAMBAT')
    else if (filterStatus === 'TERLAMBAT') matchStatus = ket.includes('TERLAMBAT')
    else if (filterStatus === 'MANGKIR') matchStatus = ket.includes('MANGKIR') || ket.includes('TIDAK ADA')
    else if (filterStatus === 'SAKIT') matchStatus = actual === 'SAKIT'
    else if (filterStatus === 'IZIN') matchStatus = ket.includes('IZIN') || ket.includes('CUTI')
    else if (filterStatus === 'OFF') matchStatus = actual === 'OFF'

    return matchSearch && matchStatus
  })

  const stats = {
    hadir: allRows.filter((r: any) =>
      String(r.keterangan || '').toUpperCase().includes('SUKSES') &&
      !String(r.keterangan || '').toUpperCase().includes('TERLAMBAT')
    ).length,
    terlambat: allRows.filter((r: any) =>
      String(r.keterangan || '').toUpperCase().includes('TERLAMBAT')
    ).length,
    mangkir: allRows.filter((r: any) => {
      const ket = String(r.keterangan || '').toUpperCase()
      return ket.includes('MANGKIR') || ket.includes('TIDAK ADA')
    }).length,
    off: allRows.filter((r: any) =>
      String(r.actual || '').toUpperCase() === 'OFF' || String(r.keterangan || '').toUpperCase().includes('CUTI')
    ).length,
  }

  const shiftMap: any = {
    'S': { label: 'Siang', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    'M': { label: 'Malam', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    'OFF': { label: 'OFF', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    'ID': { label: 'Induksi', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    'CR': { label: 'Cuti Roster', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    'P': { label: 'Pagi', color: 'bg-sky-100 text-sky-800 border-sky-200' },
    'L': { label: 'Lembur', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  }

  return (
    <div className="space-y-3 lg:space-y-5 animate-in fade-in duration-300">

      {/* 🚀 SLIMBANNER HEADER V1.7.0 (APPROVAL CENTER STYLE) */}
      <div className="bg-[#003D79] text-white p-4 lg:p-6 rounded-2xl lg:rounded-3xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
              v1.7.0
            </span>
            <span className="text-blue-200 text-xs font-bold">• Periode Berjalan</span>
          </div>
          <h2 className="text-base lg:text-2xl font-black tracking-tight mt-1">
            {data?.title || 'Riwayat Absensi Saya'}
          </h2>
          <p className="text-blue-100 text-xs mt-0.5 font-medium">
            Shift Roster vs Rekapitulasi Jam Aktual
          </p>
        </div>

        {/*  MINI STATS BADGES */}
        <div className="grid grid-cols-4 gap-2 shrink-0">
          <div className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 rounded-xl p-2 text-center min-w-[65px] lg:min-w-[85px]">
            <p className="text-base lg:text-2xl font-black leading-none">{stats.hadir}</p>
            <p className="text-[8px] lg:text-[10px] font-black uppercase tracking-wider mt-1 text-emerald-300">Hadir</p>
          </div>
          <div className="bg-amber-500/20 border border-amber-400/30 text-amber-200 rounded-xl p-2 text-center min-w-[65px] lg:min-w-[85px]">
            <p className="text-base lg:text-2xl font-black leading-none">{stats.terlambat}</p>
            <p className="text-[8px] lg:text-[10px] font-black uppercase tracking-wider mt-1 text-amber-300">Telat</p>
          </div>
          <div className="bg-rose-500/20 border border-rose-400/30 text-rose-200 rounded-xl p-2 text-center min-w-[65px] lg:min-w-[85px]">
            <p className="text-base lg:text-2xl font-black leading-none">{stats.mangkir}</p>
            <p className="text-[8px] lg:text-[10px] font-black uppercase tracking-wider mt-1 text-rose-300">Mangkir</p>
          </div>
          <div className="bg-slate-500/20 border border-slate-400/30 text-slate-200 rounded-xl p-2 text-center min-w-[65px] lg:min-w-[85px]">
            <p className="text-base lg:text-2xl font-black leading-none">{stats.off}</p>
            <p className="text-[8px] lg:text-[10px] font-black uppercase tracking-wider mt-1 text-slate-300">OFF/Cuti</p>
          </div>
        </div>
      </div>

      {/* 🔍 SEARCH & QUICK FILTER PILLS */}
      <div className="bg-white rounded-2xl p-3 lg:p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Cari tanggal, shift, atau status..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 py-2 pr-3 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#003D79]/20 focus:border-[#003D79]"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'HADIR', label: ' Hadir' },
              { id: 'TERLAMBAT', label: ' Telat' },
              { id: 'MANGKIR', label: '❌ Mangkir' },
              { id: 'IZIN', label: '📋 Izin/Cuti' },
              { id: 'OFF', label: '💤 OFF' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterStatus(f.id)}
                className={
                  'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ' +
                  (filterStatus === f.id
                    ? 'bg-[#003D79] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 border-t border-slate-100 pt-2">
          <span>Menampilkan <strong className="text-[#003D79]">{rows.length}</strong> dari {allRows.length} catatan</span>
          <span className="hidden sm:inline">Total {allRows.length} Hari Kerja</span>
        </div>
      </div>

      {/* 📋 TABEL / CARD LIST ABSENSI */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#003D79] text-white uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Roster</th>
                <th className="px-4 py-3">Actual</th>
                <th className="px-4 py-3">Jam In/Out</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 font-bold italic">
                    Tidak ada catatan absensi sesuai filter.
                  </td>
                </tr>
              ) : rows.map((r: any, i: number) => {
                const ket = String(r.keterangan || '').toUpperCase()
                const isHadir = ket.includes('SUKSES') && !ket.includes('TERLAMBAT')
                const isTerlambat = ket.includes('TERLAMBAT')
                const isMangkir = ket.includes('MANGKIR') || ket.includes('TIDAK ADA')
                const isSakit = String(r.actual || '').toUpperCase() === 'SAKIT'
                const isOff = String(r.actual || '').toUpperCase() === 'OFF'

                const statusConfig = isTerlambat
                  ? { label: ' Terlambat', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
                  : isHadir
                  ? { label: ' Hadir', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                  : isMangkir
                  ? { label: '❌ Mangkir', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
                  : isSakit
                  ? { label: '🤒 Sakit', cls: 'bg-blue-50 text-blue-700 border-blue-200' }
                  : isOff
                  ? { label: '💤 OFF', cls: 'bg-slate-100 text-slate-500 border-slate-200' }
                  : { label: r.keterangan || '-', cls: 'bg-purple-50 text-purple-700 border-purple-200' }

                const shift = shiftMap[r.roster] || { label: r.roster || '-', color: 'bg-slate-100 text-slate-600 border-slate-200' }

                return (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">
                      {new Date(r.tanggal).toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg font-black text-[10px] border ${shift.color}`}>
                        {shift.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700 whitespace-nowrap">
                      {r.actual || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.is_foto ? (
                        <a
                          href={r.evident}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-black text-[10px] border border-blue-200 hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                        >
                          <span>🖼️ Foto Bukti</span>
                        </a>
                      ) : (
                        <span className="font-mono text-xs text-slate-600 font-bold">
                          {r.evident || '--:-- / --:--'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-xl font-bold text-[10px] border whitespace-nowrap ${statusConfig.cls}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(isTerlambat || isMangkir) ? (
                        <a
                          href="/dashboard/koreksi-absensi"
                          className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] shadow-sm transition-all inline-block active:scale-95 whitespace-nowrap"
                        >
                          ✏️ Koreksi Jam
                        </a>
                      ) : (
                        <span className="text-slate-300 text-[10px] font-bold">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-bold">
          <span>BTM Mobile App v1.7.0</span>
          <span>Approval Center Style View</span>
        </div>
      </div>
    </div>
  )
}
