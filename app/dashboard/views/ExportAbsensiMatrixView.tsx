'use client'

// ExportAbsensiMatrixView - dipisah dari app/dashboard/page.tsx (tahap 2)
// Kode disalin UTUH. Logika & tampilan TIDAK diubah.
// Dimuat lewat next/dynamic hanya saat menunya dibuka.

import ApprovalCenterExact from '../components/ApprovalCenterExact';
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/AuthContext'
import { getTablePermissions } from '@/app/lib/tablePermissions'
import { saveOfflineAttendance } from '@/app/lib/offlineDB'
import KoreksiBadge from '../components/KoreksiBadge'

export default function ExportAbsensiMatrixView() {
  const [periode, setPeriode] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [site, setSite] = useState('')
  const [sites, setSites] = useState<string[]>([])
  const [downloading, setDownloading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  //  BARU — ambil dari /api/data?table=employees langsung
useEffect(() => {
  fetch('/api/data?table=employees&fields=site')
    .then(r => r.json())
    .then(d => {
      const raw = (d.data || d || []) as any[]
      const unique = Array.from(
        new Set(raw.map((e: any) => e.site).filter(Boolean))
      ).sort() as string[]
      setSites(unique)
    })
    .catch(() => {})
}, []) // ← tidak perlu re-fetch saat periode berubah

  const periodeOptions = (() => {
    const opts = []
    const now = new Date()
    for (let i = 6; i >= -6; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      opts.push({ val, label })
    }
    return opts
  })()

  async function handleDownload() {
    setDownloading(true)
    setMsg({ type: '', text: '' })
    try {
      const params = new URLSearchParams({ periode, ...(site && { site }) })
      const res = await fetch(`/api/export-absensi-matrix?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json()
        setMsg({ type: 'err', text: err.error || 'Gagal export' })
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Rekap_Absensi_${site || 'AllSite'}_${periode}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      setMsg({ type: 'ok', text: ' File berhasil didownload!' })
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message })
    } finally {
      setDownloading(false)
    }
  }

  const KODE_LIST = [
    { k: 'DS',  n: 'Day Shift',      c: 'bg-sky-100 text-sky-800' },
    { k: 'NS',  n: 'Night Shift',    c: 'bg-violet-100 text-violet-800' },
    { k: 'OFF', n: 'Off / Libur',    c: 'bg-slate-200 text-slate-700' },
    { k: 'CR',  n: 'Cuti Roster',    c: 'bg-amber-100 text-amber-800' },
    { k: 'CT',  n: 'Cuti Tahunan',   c: 'bg-orange-100 text-orange-800' },
    { k: 'SCK', n: 'Shift Cuti Kompensasi', c: 'bg-emerald-100 text-emerald-800' },
    { k: 'MCK', n: 'Malam Cuti Kompensasi', c: 'bg-emerald-200 text-emerald-900' },
    { k: 'TR',  n: 'Training',       c: 'bg-blue-100 text-blue-800' },
    { k: 'ID',  n: 'Induksi',        c: 'bg-indigo-100 text-indigo-800' },
    { k: 'S',   n: 'Sakit',          c: 'bg-pink-100 text-pink-800' },
    { k: 'I',   n: 'Izin Potongan',  c: 'bg-red-100 text-red-800' },
    { k: 'IR',  n: 'Izin Resmi',     c: 'bg-rose-100 text-rose-800' },
    { k: 'A',   n: 'Alfa',           c: 'bg-red-300 text-red-900' },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-3 lg:space-y-6">
      <div className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden">
        <div className="bg-[#003D79] p-6 text-white">
          <h2 className="text-xl font-black uppercase tracking-tight"> Export Rekap Absensi Bulanan</h2>
          <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mt-1">
            Format matrix (grid) — 1 baris per karyawan
          </p>
        </div>

        <div className="p-6 space-y-5">
          {msg.text && (
            <div className={`p-4 rounded-2xl text-sm font-bold ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msg.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Periode
              </label>
              <select
                value={periode}
                onChange={e => setPeriode(e.target.value)}
                className="w-full p-3 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-blue-500 outline-none"
              >
                {periodeOptions.map(o => (
                  <option key={o.val} value={o.val}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Site (kosongkan = semua)
              </label>
              <select
                value={site}
                onChange={e => setSite(e.target.value)}
                className="w-full p-3 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-blue-500 outline-none"
              >
                <option value="">Semua Site</option>
                {sites.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full bg-blue-600 text-white py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
          >
            {downloading ? '⏳ MENYIAPKAN FILE...' : ' DOWNLOAD EXCEL'}
          </button>
        </div>
      </div>

      {/* LEGENDA */}
      <div className="bg-white rounded-[2.5rem] border shadow-xl p-6">
        <h3 className="font-black text-slate-800 mb-4">📋 Legenda Kode Absensi</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {KODE_LIST.map(k => (
            <div key={k.k} className="flex items-center gap-3">
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg w-12 text-center ${k.c}`}>
                {k.k}
              </span>
              <span className="text-xs font-bold text-slate-600">{k.n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
