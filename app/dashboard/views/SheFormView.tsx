'use client'

// ═══════════════════════════════════════════════════════════════════════════
// INSPEKSI / OBSERVASI (SHE)
// Satu komponen untuk dua menu — dibedakan lewat prop `jenis`.
//   INSPEKSI  : 55 form, hasil per kolom R / Q / N/A + kode bahaya H / S / M
//   OBSERVASI : 44 form, hasil YES / NO / N/A per langkah tugas
// Daftar form & checklist dibaca dari /api/she (sumber: she-templates.json)
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'

type Form = {
  id: string; kode: string; nama: string; mode: string
  kolom: string[]; items: string[]; jumlah_baris: number
}

const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export default function SheFormView({ jenis }: { jenis: 'INSPEKSI' | 'OBSERVASI' }) {
  const now = new Date()
  const [tab, setTab] = useState<'isi' | 'riwayat'>('isi')
  const [forms, setForms] = useState<Form[]>([])
  const [cari, setCari] = useState('')
  const [formId, setFormId] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const [bulan, setBulan] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [tahun, setTahun] = useState(String(now.getFullYear()))
  const [riwayat, setRiwayat] = useState<any[]>([])
  const [stat, setStat] = useState<any>({})
  const [detail, setDetail] = useState<any>(null)

  const judul = jenis === 'INSPEKSI' ? 'Inspeksi' : 'Observasi'
  const ikon = jenis === 'INSPEKSI' ? '🦺' : '👁️'

  useEffect(() => { muatForm() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [jenis])
  useEffect(() => { if (tab === 'riwayat') muatRiwayat() /* eslint-disable-next-line react-hooks/exhaustive-deps */ },
    [tab, bulan, tahun])

  async function muatForm() {
    setLoading(true)
    try {
      const res = await fetch(`/api/she?mode=forms&jenis=${jenis}`)
      const j = await res.json()
      if (res.ok) setForms(j.forms || [])
      else setMsg('❌ ' + (j.error || 'Gagal memuat daftar form'))
    } catch (e: any) { setMsg('❌ ' + e.message) }
    finally { setLoading(false) }
  }

  async function muatRiwayat() {
    try {
      const res = await fetch(`/api/she?mode=list&jenis=${jenis}&bulan=${bulan}&tahun=${tahun}`)
      const j = await res.json()
      if (res.ok) { setRiwayat(j.rows || []); setStat(j.stats || {}) }
    } catch { }
  }

  const form = forms.find((f) => f.id === formId)
  const listForm = useMemo(() => {
    const q = cari.toLowerCase()
    return forms.filter((f) => !q || f.nama.toLowerCase().includes(q) || f.kode.toLowerCase().includes(q))
  }, [forms, cari])

  return (
    <div className="bg-[#f4f7fa] pb-24 text-slate-800">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-[#003D79] to-[#0056b3] px-4 pt-6 pb-5 lg:px-6 lg:pt-8 lg:pb-7 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{ikon}</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">SHE • K3</p>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white">{judul}</h1>
            <p className="text-blue-200/80 text-xs font-medium">
              {forms.length} form tersedia • rekap otomatis ke SHE
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {([['isi', '📝 Isi Form'], ['riwayat', '📚 Riwayat']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k as any)}
              className={`px-4 py-2.5 rounded-full text-xs lg:text-sm font-bold transition-all ${
                tab === k ? 'bg-white text-[#003D79] shadow-lg' : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 lg:px-6 lg:py-6 space-y-3">
        {msg && <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 text-xs font-bold">{msg}</div>}

        {tab === 'isi' ? (
          loading ? (
            <div className="py-16 text-center text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
              Menyiapkan {forms.length || ''} form...
            </div>
          ) : (
            <>
              {/* PILIH FORM */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">1. Pilih jenis form</p>
                <input value={cari} onChange={(e) => setCari(e.target.value)}
                  placeholder={`🔍 Cari form ${judul.toLowerCase()}... (misal: dump truck)`}
                  className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold mb-2 outline-none focus:border-[#003D79]" />
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 border border-slate-100 rounded-xl">
                  {listForm.length === 0 ? (
                    <p className="p-3 text-[11px] text-slate-400">Form tidak ditemukan.</p>
                  ) : listForm.map((f) => (
                    <button key={f.id} onClick={() => setFormId(f.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-blue-50 ${formId === f.id ? 'bg-blue-50' : ''}`}>
                      <div className="font-bold text-xs">{f.nama}</div>
                      <div className="text-[10px] text-slate-500">
                        {f.kode} • {(f.items || []).length} butir • {f.kolom.length} kolom
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {form && (
                <IsiForm
                  key={form.id}
                  form={form}
                  jenis={jenis}
                  onSaved={() => { setMsg('✅ Laporan tersimpan'); setFormId(''); setTab('riwayat') }}
                />
              )}
            </>
          )
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <select value={bulan} onChange={(e) => setBulan(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold">
                  {NAMA_BULAN.map((n, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>📅 {n}</option>)}
                </select>
                <select value={tahun} onChange={(e) => setTahun(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold">
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
                <div className="col-span-2 text-[10px] text-slate-500 font-bold flex items-center justify-end gap-2">
                  <span>{stat.total || 0} laporan • {stat.temuan || 0} temuan</span>
                  <button onClick={() => cetakRekap(riwayat, judul, bulan, tahun)}
                    className="px-2.5 py-1 bg-[#003D79] text-white rounded-lg text-[10px] font-black uppercase">
                    🖨️ Rekap
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {riwayat.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-sm font-semibold">Belum ada laporan {judul.toLowerCase()} bulan ini</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {riwayat.map((r) => (
                    <button key={r.id} onClick={async () => {
                      const res = await fetch(`/api/she?mode=detail&id=${r.id}`)
                      const j = await res.json()
                      if (res.ok) setDetail(j)
                    }} className="w-full text-left p-3 hover:bg-blue-50/40">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">{r.nama_form || r.kode_form}</div>
                          <div className="text-[10px] text-slate-500">
                            {fmtTgl(r.tanggal)} • {r.lokasi || '-'} {r.unit ? '• ' + r.unit : ''}
                          </div>
                          <div className="text-[10px] text-slate-500">Pengawas: {r.pengawas_nama || r.pengawas_nrp || '-'}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`inline-block px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${
                            r.status === 'DIVERIFIKASI'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>{r.status}</span>
                          <div className="text-[10px] mt-1 font-bold text-rose-600">{r.jumlah_temuan} temuan</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {detail && (
        <DetailLaporan data={detail} onClose={() => setDetail(null)} onVerified={() => { setDetail(null); muatRiwayat() }} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
function IsiForm({ form, jenis, onSaved }: any) {
  const isInspeksi = jenis === 'INSPEKSI'
  // OBSERVASI: kolom penilaian di blanko asli adalah pilihan YES / NO / N/A,
  // jadi diperlakukan sebagai SATU kolom hasil, bukan tiga kolom terpisah.
  const kolom: string[] = isInspeksi ? (form.kolom || ['Kondisi']) : ['Hasil']
  const items: string[] = form.items || []

  const [tgl, setTgl] = useState(new Date().toISOString().slice(0, 10))
  const [jam, setJam] = useState('')
  const [lokasi, setLokasi] = useState('')
  const [unit, setUnit] = useState('')
  const [diperiksaNama, setDiperiksaNama] = useState('')
  const [catatan, setCatatan] = useState('')
  const [nilai, setNilai] = useState<Record<string, any>>({})
  const [uploading, setUploading] = useState(0)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // form matriks tanpa daftar butir (baris = orang) → tiap baris diisi nama karyawan
  const isPerson = items.length === 0 || form.mode === 'person'
  const baris: string[] = items.length > 0
    ? items
    : Array.from({ length: Math.max(1, Math.min(form.jumlah_baris || 5, 20)) }, (_, i) => `Baris ${i + 1}`)

  const pilihan = isInspeksi ? ['R', 'Q', 'N/A'] : ['YES', 'NO', 'N/A']

  function set(row: number, col: string, val: string) {
    setNilai((p) => ({ ...p, [`${row}|${col}`]: val }))
  }
  function get(row: number, col: string) {
    return nilai[`${row}|${col}`] || ''
  }

  async function uploadFoto(idx: number, file: File) {
    if (file.size > 5 * 1024 * 1024) { setMsg('❌ Foto maksimal 5 MB'); return }
    setUploading(idx + 1)
    setMsg('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('jenis', jenis)
      const res = await fetch('/api/she/upload', { method: 'POST', body: fd })
      const j = await res.json()
      if (res.ok) set(idx, '__foto', j.url)
      else setMsg('❌ ' + (j.error || 'Gagal upload foto'))
    } catch (e: any) { setMsg('❌ ' + e.message) }
    finally { setUploading(0) }
  }

  async function simpan() {
    setSaving(true); setMsg('')
    try {
      const rows = baris.map((u, idx) => {
        const hasil: any = {}
        let ada = false
        kolom.forEach((k) => {
          const v = get(idx, k)
          if (v) { hasil[k] = v; ada = true }
        })
        return {
          no: idx + 1,
          uraian: get(idx, '__nama') || u,
          hasil: kolom.length > 1 ? JSON.stringify(hasil) : (hasil[kolom[0]] || null),
          keterangan: get(idx, '__ket') || null,
          hazard: get(idx, '__hazard') || null,
          foto_url: get(idx, '__foto') || null,
        }
      }).filter((r) => r.hasil || r.keterangan || r.foto_url)

      if (rows.length === 0) { setMsg('❌ Belum ada butir yang diisi'); setSaving(false); return }

      const res = await fetch('/api/she', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          form_id: form.id, jenis, kode_form: form.kode, nama_form: form.nama,
          tanggal: tgl, jam, lokasi, unit,
          diperiksa_nama: diperiksaNama, catatan,
          items: rows,
        }),
      })
      const j = await res.json()
      if (res.ok) onSaved()
      else setMsg('❌ ' + (j.error || 'Gagal menyimpan'))
    } catch (e: any) { setMsg('❌ ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
        <p className="text-xs font-black text-slate-700">{form.nama}</p>
        <p className="text-[10px] text-slate-500">{form.kode} • {baris.length} butir • {isInspeksi ? kolom.length + ' kolom penilaian' : 'YES / NO / N/A'}</p>
      </div>

      {/* HEADER ISIAN */}
      <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2 border-b border-slate-100">
        <Lbl label="Tanggal"><input type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} className={INP} /></Lbl>
        <Lbl label="Jam"><input type="time" value={jam} onChange={(e) => setJam(e.target.value)} className={INP} /></Lbl>
        <Lbl label="Lokasi / Area"><input value={lokasi} onChange={(e) => setLokasi(e.target.value)} placeholder="Front loading" className={INP} /></Lbl>
        <Lbl label="No. Unit / Peralatan"><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="DT 012" className={INP} /></Lbl>
        <Lbl label={isInspeksi ? 'Yang diperiksa' : 'Nama yang diobservasi'}>
          <input value={diperiksaNama} onChange={(e) => setDiperiksaNama(e.target.value)} placeholder="Nama / NRP" className={INP} />
        </Lbl>
      </div>

      {/* GRID */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-2 py-2 text-left font-black text-slate-600 uppercase w-8">No</th>
              <th className="px-2 py-2 text-left font-black text-slate-600 uppercase min-w-[240px]">
                {isPerson ? (isInspeksi ? 'Nama karyawan' : 'Nama yang diamati') : (isInspeksi ? 'Butir / Item yang diperiksa' : 'Langkah tugas')}
              </th>
              {kolom.map((k) => (
                <th key={k} className="px-1 py-2 text-center font-black text-slate-600 uppercase whitespace-nowrap">{k}</th>
              ))}
              <th className="px-2 py-2 text-center font-black text-slate-600 uppercase">Ket.</th>
              {isInspeksi && <th className="px-1 py-2 text-center font-black text-slate-600 uppercase">Bahaya</th>}
              <th className="px-1 py-2 text-center font-black text-slate-600 uppercase">Foto</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((u, idx) => (
              <tr key={idx} className="border-b border-slate-50">
                <td className="px-2 py-1.5 text-slate-500">{idx + 1}</td>
                <td className="px-2 py-1.5 text-slate-700">
                  {isPerson ? (
                    <input value={get(idx, '__nama')} onChange={(e) => set(idx, '__nama', e.target.value)}
                      placeholder="nama karyawan"
                      className="w-32 border border-slate-200 rounded px-1 py-0.5 text-[10px]" />
                  ) : u}
                </td>
                {kolom.map((k) => (
                  <td key={k} className="px-1 py-1.5 text-center">
                    <div className="flex gap-0.5 justify-center">
                      {pilihan.map((p) => (
                        <button key={p} onClick={() => set(idx, k, get(idx, k) === p ? '' : p)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${
                            get(idx, k) === p
                              ? (p === 'R' || p === 'YES' ? 'bg-emerald-600 text-white border-emerald-600'
                                 : p === 'Q' || p === 'NO' ? 'bg-rose-600 text-white border-rose-600'
                                 : 'bg-slate-500 text-white border-slate-500')
                              : 'bg-white text-slate-400 border-slate-200'
                          }`}>
                          {p === 'N/A' ? 'N/A' : p}
                        </button>
                      ))}
                    </div>
                  </td>
                ))}
                <td className="px-1 py-1.5">
                  <input value={get(idx, '__ket')} onChange={(e) => set(idx, '__ket', e.target.value)}
                    className="w-24 border border-slate-200 rounded px-1 py-0.5 text-[10px]" placeholder="catatan" />
                </td>
                {isInspeksi && (
                  <td className="px-1 py-1.5 text-center">
                    <select value={get(idx, '__hazard')} onChange={(e) => set(idx, '__hazard', e.target.value)}
                      className="border border-slate-200 rounded px-1 py-0.5 text-[10px]">
                      <option value="">-</option>
                      <option value="H">H</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                    </select>
                  </td>
                )}
                <td className="px-1 py-1.5 text-center">
                  {get(idx, '__foto') ? (
                    <span className="inline-flex items-center gap-1">
                      <a href={get(idx, '__foto')} target="_blank" rel="noreferrer">
                        <img src={get(idx, '__foto')} alt="foto" className="w-7 h-7 object-cover rounded border border-slate-200" />
                      </a>
                      <button onClick={() => set(idx, '__foto', '')}
                        className="text-rose-500 text-[10px] font-black" title="Hapus foto">✕</button>
                    </span>
                  ) : uploading === idx + 1 ? (
                    <span className="text-[9px] text-slate-400 font-bold">...</span>
                  ) : (
                    <label className="cursor-pointer inline-block px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] font-bold text-slate-500 hover:bg-slate-50">
                      📷
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFoto(idx, f); e.currentTarget.value = '' }} />
                    </label>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isInspeksi && (
        <div className="px-3 py-2 bg-slate-50 text-[10px] text-slate-500 flex gap-4 flex-wrap">
          <span><b>R</b> = kondisi baik</span><span><b>Q</b> = rusak / tidak normal</span>
          <span><b>H</b> = stop, perbaiki segera</span><span><b>S</b> = perbaiki 12 jam</span><span><b>M</b> = perbaiki 3 hari</span>
        </div>
      )}

      <div className="p-3 border-t border-slate-100 space-y-2">
        <Lbl label="Catatan / kesimpulan">
          <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2}
            className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold outline-none focus:border-[#003D79]" />
        </Lbl>
        {msg && <p className="text-[11px] font-bold text-rose-600">{msg}</p>}
        <button onClick={simpan} disabled={saving}
          className="w-full py-3 bg-[#003D79] text-white rounded-xl text-[11px] font-black uppercase tracking-wider disabled:opacity-50">
          {saving ? '⏳ Menyimpan...' : '💾 Simpan laporan'}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
function DetailLaporan({ data, onClose, onVerified }: any) {
  const sub = data.submission || {}
  const items: any[] = data.items || []

  function hasilTeks(h: string) {
    if (!h) return '—'
    try {
      const o = JSON.parse(h)
      if (o && typeof o === 'object') {
        return Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(' • ')
      }
    } catch { }
    return h
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]" onClick={onClose} />
      <div className="fixed inset-x-3 top-1/2 -translate-y-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-2xl bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-5 bg-gradient-to-br from-[#003D79] to-[#0056b3] text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-emerald-300 text-[10px] font-black uppercase tracking-[0.25em]">{sub.kode_form || 'Laporan'}</p>
              <h2 className="font-black text-base truncate">{sub.nama_form}</h2>
              <p className="text-blue-200/80 text-[11px]">
                {fmtTgl(sub.tanggal)} {sub.jam ? '• ' + sub.jam : ''} • {sub.lokasi || '-'} {sub.unit ? '• ' + sub.unit : ''}
              </p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 font-bold">✕</button>
          </div>
        </div>

        <div className="p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              <p className="text-[8px] font-black uppercase text-slate-400">Pengawas</p>
              <p className="font-bold">{sub.pengawas_nama || sub.pengawas_nrp || '-'}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              <p className="text-[8px] font-black uppercase text-slate-400">Temuan</p>
              <p className="font-bold text-rose-600">{sub.jumlah_temuan || 0}</p>
            </div>
          </div>

          <div className="divide-y divide-slate-50 border border-slate-100 rounded-xl overflow-hidden">
            {items.map((it) => (
              <div key={it.id} className="px-2 py-1.5 flex gap-2 items-start">
                <span className="text-[10px] text-slate-400 w-5 shrink-0">{it.no}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-slate-700">{it.uraian}</p>
                  {it.keterangan && <p className="text-[10px] text-slate-500">Ket: {it.keterangan}</p>}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-black text-slate-700">{hasilTeks(it.hasil)}</span>
                  {it.hazard && <span className="ml-1 px-1 rounded bg-rose-100 text-rose-700 text-[9px] font-black">{it.hazard}</span>}
                  {it.foto_url && (
                    <a href={it.foto_url} target="_blank" rel="noreferrer" className="block mt-1">
                      <img src={it.foto_url} alt="foto temuan" className="w-14 h-14 object-cover rounded-lg border border-slate-200 ml-auto" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {sub.catatan && (
            <div className="rounded-xl bg-slate-50 p-2">
              <p className="text-[9px] font-black uppercase text-slate-400">Catatan</p>
              <p className="text-[11px]">{sub.catatan}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-2">
          <button onClick={() => cetakLaporan(data)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-[11px] font-black uppercase tracking-wider">
            🖨️ Cetak laporan
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-wider">
            Tutup
          </button>
          {sub.status !== 'DIVERIFIKASI' && (
            <button onClick={async () => {
              await fetch('/api/she', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verifikasi', id: sub.id }),
              })
              onVerified()
            }} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider">
              ✅ Verifikasi
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CETAK LAPORAN — hasil laporan inspeksi / observasi siap tanda tangan
// ═══════════════════════════════════════════════════════════════════════════
function hasilRapi(h: string) {
  if (!h) return '—'
  try {
    const o = JSON.parse(h)
    if (o && typeof o === 'object') return Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(' · ')
  } catch { }
  return h
}

function bukaPrint(html: string) {
  const w = window.open('', '_blank')
  if (!w) { alert('Popup diblokir browser. Izinkan popup untuk mencetak.'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 500)
}

const CSS_PRINT = `
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;padding:26px}
  h1{font-size:15px;text-align:center;margin:0}
  h2{font-size:12px;text-align:center;font-weight:500;margin:2px 0 14px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th,td{border:1px solid #666;padding:4px 6px;vertical-align:top;font-size:10.5px}
  th{background:#eef2f7;font-size:10px;text-transform:uppercase;letter-spacing:.03em}
  .hd td{border:none;padding:1px 0;font-size:11px}
  .ttd{display:table;width:100%;margin-top:32px;text-align:center;font-size:11px}
  .ttd div{display:table-cell;width:33%}
  .ln{margin-top:46px;border-top:1px solid #111;padding-top:3px;font-weight:700}
  img{max-width:70px;max-height:70px;border:1px solid #999}
  @media print{ body{padding:10px} }
`

function cetakLaporan(data: any) {
  const sub = data.submission || {}
  const items: any[] = data.items || []
  const baris = items.map((it: any) => `
    <tr>
      <td style="text-align:center;width:26px">${it.no ?? ''}</td>
      <td>${it.uraian || ''}</td>
      <td style="text-align:center;width:70px">${hasilRapi(it.hasil)}</td>
      <td style="text-align:center;width:34px">${it.hazard || ''}</td>
      <td>${it.keterangan || ''}</td>
      <td style="width:80px">${it.foto_url ? `<img src="${it.foto_url}" />` : ''}</td>
    </tr>`).join('')

  bukaPrint(`<html><head><title>${sub.nama_form || 'Laporan'}</title><style>${CSS_PRINT}</style></head><body>
    <h1>PT BOSTON TRIKORA MAHARDIKA</h1>
    <h2>${sub.jenis === 'OBSERVASI' ? 'LAPORAN OBSERVASI' : 'LAPORAN INSPEKSI'} — ${sub.nama_form || ''}</h2>
    <table class="hd">
      <tr><td style="width:130px">No. Form</td><td>: ${sub.kode_form || '-'}</td><td style="width:110px">Tanggal</td><td>: ${sub.tanggal || '-'} ${sub.jam || ''}</td></tr>
      <tr><td>Lokasi / Area</td><td>: ${sub.lokasi || '-'}</td><td>No. Unit</td><td>: ${sub.unit || '-'}</td></tr>
      <tr><td>Pengawas</td><td>: ${sub.pengawas_nama || sub.pengawas_nrp || '-'}</td><td>Yang diperiksa</td><td>: ${sub.diperiksa_nama || '-'}</td></tr>
      <tr><td>Jumlah temuan</td><td>: ${sub.jumlah_temuan || 0}</td><td>Status</td><td>: ${sub.status || '-'}</td></tr>
    </table>
    <table>
      <thead><tr><th>No</th><th>${sub.jenis === 'OBSERVASI' ? 'Langkah tugas' : 'Butir yang diperiksa'}</th><th>Hasil</th><th>Bh</th><th>Keterangan</th><th>Foto</th></tr></thead>
      <tbody>${baris}</tbody>
    </table>
    ${sub.catatan ? `<p style="margin-top:10px"><b>Catatan / kesimpulan:</b><br/>${sub.catatan}</p>` : ''}
    <div class="ttd">
      <div>Dibuat oleh,<div class="ln">${sub.pengawas_nama || ''}</div><div style="font-size:10px">Pengawas</div></div>
      <div>Diperiksa oleh,<div class="ln">................................</div><div style="font-size:10px">SHE</div></div>
      <div>Diketahui oleh,<div class="ln">................................</div><div style="font-size:10px">PJO / Site Manager</div></div>
    </div>
  </body></html>`)
}

function cetakRekap(rows: any[], judul: string, bulan: string, tahun: string) {
  const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  const baris = rows.map((r: any, i: number) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${r.tanggal || ''}</td>
      <td>${r.nama_form || ''}</td>
      <td>${r.lokasi || ''}${r.unit ? ' / ' + r.unit : ''}</td>
      <td>${r.pengawas_nama || r.pengawas_nrp || ''}</td>
      <td style="text-align:center">${r.jumlah_temuan || 0}</td>
      <td style="text-align:center">${r.status || ''}</td>
    </tr>`).join('')
  const total = rows.reduce((a: number, r: any) => a + Number(r.jumlah_temuan || 0), 0)

  bukaPrint(`<html><head><title>Rekap ${judul}</title><style>${CSS_PRINT}</style></head><body>
    <h1>PT BOSTON TRIKORA MAHARDIKA</h1>
    <h2>REKAP LAPORAN ${String(judul).toUpperCase()} — ${NAMA_BULAN[Number(bulan) - 1]} ${tahun}</h2>
    <table>
      <thead><tr><th>No</th><th>Tanggal</th><th>Form</th><th>Lokasi / Unit</th><th>Pengawas</th><th>Temuan</th><th>Status</th></tr></thead>
      <tbody>${baris || '<tr><td colspan="7" style="text-align:center">Belum ada laporan</td></tr>'}</tbody>
    </table>
    <p style="margin-top:8px">Jumlah laporan: <b>${rows.length}</b> • Total temuan: <b>${total}</b></p>
    <div class="ttd">
      <div>Dibuat oleh,<div class="ln">SHE</div></div>
      <div>Diperiksa oleh,<div class="ln">HR</div></div>
      <div>Diketahui oleh,<div class="ln">PJO / Site Manager</div></div>
    </div>
  </body></html>`)
}

const INP = 'w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold outline-none focus:border-[#003D79]'

function Lbl({ label, children }: any) {
  return (
    <div>
      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

function fmtTgl(iso: string) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return iso }
}
