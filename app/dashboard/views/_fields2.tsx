'use client'

// HELPER TAMPILAN - disalin OTOMATIS dari page.tsx (tahap 2)
// Isinya identik dengan aslinya. page.tsx tetap memakai salinannya sendiri.

export function DetailRowSimple({ label, value, mono = false }: any) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-50 pb-2 last:border-0">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-shrink-0">{label}</p>
      <div className={`text-xs font-bold text-slate-800 text-right max-w-[65%] ${mono ? 'font-mono' : ''}`}>
        {value || '-'}
      </div>
    </div>
  )
}

// Helper untuk detail row

export function Input({ label, onChange, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
      <input {...props} onChange={e => onChange(e.target.value)} className="w-full p-3.5 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm" />
    </div>
  )
}

export function Select({ label, options, onChange, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
      <select {...props} onChange={e => onChange(e.target.value)} className="w-full p-3.5 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm">
        <option value="">-- Pilih --</option>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

export function Textarea({ label, onChange, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
      <textarea {...props} onChange={e => onChange(e.target.value)} className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm min-h-[120px]" />
    </div>
  )
}

export function StatusBadge({ value }: any) {
  const m: any = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200', APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200', REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    DISETUJUI: 'bg-emerald-50 text-emerald-700 border-emerald-200', HADIR: 'bg-emerald-50 text-emerald-700 border-emerald-200', TERLAMBAT: 'bg-amber-50 text-amber-700 border-amber-200',
    Aktif: 'bg-emerald-50 text-emerald-700 border-emerald-200', Nonaktif: 'bg-slate-100 text-slate-500 border-slate-200'
  }
  return <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${m[value] || 'bg-slate-50 text-slate-400 border-slate-100'}`}>{value}</span>
}

export function formatColumnName(col: string) {
  const special: any = {
    _nama_karyawan: '👤 Karyawan', _jabatan: 'Jabatan', _site: 'Site', _departemen: 'Dept',
    nrp: 'NRP', clock_in: 'Masuk', clock_out: 'Pulang', status_atasan: 'Atasan', status_pjo: 'PJO', status_final: 'Status',
    latitude: 'LAT', longitude: 'LNG', radius_meter: 'Radius', nama_site: 'Site Name', active: 'Status', kode: 'ID SISTEM', persen: 'Persen (%)'
  }
  return special[col] || col.replace(/_/g, ' ').toUpperCase()
}

export function renderCell(col: string, val: any) {
  if (val === null || val === undefined) return <span className="text-slate-200 italic font-bold text-[10px]">EMPTY</span>
  if (typeof val === 'boolean') return val ? <span className="text-emerald-500 font-black">YES</span> : <span className="text-slate-300 font-black">NO</span>
  if (col.includes('status')) return <StatusBadge value={String(val)} />
  if (col === 'persen') return <span className="font-black text-slate-900">{val}%</span>
  if (col.includes('tanggal') && !col.includes('jam')) { try { return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return String(val) } }
  if (col.includes('foto') || col === 'image_url') return <a href={val} target="_blank" className="text-blue-600 font-black uppercase text-[9px] underline tracking-widest">👁️ DOKUMEN</a>
  return String(val)
}

export function CrudModal({ table, mode, row, onClose, onSuccess }: any) {
  const [fields, setFields] = useState<any[]>([])
  const [values, setValues] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [searchEmp, setSearchEmp] = useState('')

  useEffect(() => {
    fetch(`/api/schema?table=${table}`)
      .then(r => r.json())
      .then(d => {
        if (d.error || !Array.isArray(d.fields)) { onClose(); return }
        setFields(d.fields)
        const init: any = {}
        d.fields.forEach((f: any) => {
          let v = (row && row[f.key] !== undefined) ? row[f.key] : ''
          if (f.type === 'date' && v) v = String(v).split('T')[0]
          init[f.key] = v ?? ''
        })
        setValues(init)
        if (row?.nama) setSearchEmp(`${row.nrp} - ${row.nama}`)
        setLoading(false)
      })

    if (!row?.nrp) {
      fetch('/api/data?menu=kelola_karyawan')
        .then(r => {
          if (r.status === 403) return { rows: [] }
          return r.json()
        })
        .then(d => setEmployees(d.rows || []))
        .catch(() => setEmployees([]))
    }
  }, [table, mode, row])

  async function handleSubmit(e: any) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = mode === 'create' ? { table, values } : { table, id: row.id, values }
      const res = await fetch('/api/crud', {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      const resData = await res.json()
      
      if (res.ok) {
        alert(" Data Berhasil Disimpan!");
        if (typeof onSuccess === 'function') onSuccess(); 
      } else {
        alert("❌ Gagal: " + (resData.error || 'Terjadi kesalahan'))
      }
    } catch (err) {
      alert("❌ Kesalahan Koneksi Server")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="fixed inset-0 bg-black/50 z-[99] flex items-center justify-center font-black text-white tracking-widest uppercase animate-pulse">Memuat Form Digital...</div>

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[99] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border-4 border-white">
        <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-black text-2xl text-slate-900 tracking-tight">{mode === 'create' ? 'Input Data Baru' : 'Perbarui Data'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Tabel: {table}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border-2 border-slate-100 text-2xl text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">{f.label}{f.required && <span className="text-rose-500 ml-1">*</span>}</label>
              
              {f.type === 'employee_select' ? (
                row?.nrp && mode === 'create' ? (
                  <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Menilai Karyawan:</p>
                    <p className="font-black text-slate-900 text-sm">{row.nama || 'Karyawan Terpilih'}</p>
                    <p className="text-[10px] font-bold text-slate-500">NRP: {row.nrp}</p>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="🔍 Cari NRP atau Nama Karyawan..."
                      value={searchEmp || (mode === 'edit' ? values[f.key] : '')}
                      onChange={(e) => setSearchEmp(e.target.value)}
                      className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                    {searchEmp && !searchEmp.includes(' - ') && (
                      <div className="absolute z-[100] w-full bg-white border-2 border-slate-100 mt-2 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                        {employees
                          .filter(emp => 
                            (emp.nama || '').toLowerCase().includes(searchEmp.toLowerCase()) || 
                            (emp.nrp || '').toLowerCase().includes(searchEmp.toLowerCase())
                          )
                          .slice(0, 15)
                          .map(emp => (
                            <div
                              key={emp.nrp}
                              className="p-4 hover:bg-blue-600 hover:text-white cursor-pointer border-b border-slate-50 last:border-0 transition-all flex flex-col"
                              onClick={() => {
                                setValues({ ...values, [f.key]: emp.nrp })
                                setSearchEmp(`${emp.nrp} - ${emp.nama}`)
                              }}
                            >
                              <span className="font-black text-sm">{emp.nama}</span>
                              <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">{emp.nrp} • {emp.jabatan}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )
              ) : f.type === 'select' ? (
                <select value={values[f.key] || ''} onChange={e => setValues({...values, [f.key]: e.target.value})} className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm" required={f.required}>
                  <option value="">-- Pilih --</option>
                  {f.options?.map((o: any) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea value={values[f.key] || ''} onChange={e => setValues({...values, [f.key]: e.target.value})} placeholder={f.placeholder} className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm min-h-[120px]" required={f.required} />
              ) : (
                <input type={f.type} value={values[f.key] || ''} onChange={e => setValues({...values, [f.key]: e.target.value})} placeholder={f.placeholder} className="w-full p-4 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm" required={f.required} />
              )}
            </div>
          ))}
          <div className="flex gap-2 lg:gap-4 pt-8 sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">BATAL</button>
            <button type="submit" disabled={saving} className="flex-1 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all">
              {saving ? 'PROSES SIMPAN...' : '💾 SIMPAN DATA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ResignModal({ row, mode, onClose, onSuccess }: any) {
  const isResign = mode === 'resign'
  const [tglResign, setTglResign] = useState(new Date().toISOString().split('T')[0])
  const [alasan, setAlasan] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: any) {
    e.preventDefault()
    
    if (isResign && !alasan.trim()) {
      alert('❌ Alasan resign wajib diisi')
      return
    }

    if (!confirm(isResign 
      ? ` Yakin resign-kan karyawan "${row.nama}"?\n\nTanggal: ${tglResign}\nAlasan: ${alasan}`
      : ` Yakin aktifkan kembali karyawan "${row.nama}"?\n\nData resign akan dihapus.`
    )) return

    setSaving(true)
    try {
      const values = isResign 
        ? {
            tanggal_resign: tglResign,
            alasan_resign: alasan,
            status_karyawan: 'Resign'
          }
        : {
            tanggal_resign: null,
            alasan_resign: null,
            resign_by: null,
            status_karyawan: 'Aktif'
          }
      
      const res = await fetch('/api/crud', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          table: 'employees', 
          id: row.id, 
          values 
        })
      })
      
      const resData = await res.json()
      
      if (res.ok) {
        alert(isResign 
          ? ' Karyawan berhasil di-resign'
          : ' Karyawan berhasil diaktifkan kembali'
        );
        if (typeof onSuccess === 'function') onSuccess();
      } else {
        alert('❌ Gagal: ' + (resData.error || 'Terjadi kesalahan'))
      }
    } catch (err) {
      alert('❌ Kesalahan Koneksi Server')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[99] flex items-center justify-center p-4">
      <div className={`bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border-4 border-white`}>
        <div className={`p-6 ${isResign ? 'bg-orange-500' : 'bg-emerald-500'} text-white`}>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{isResign ? '🚪' : '↩️'}</span>
            <div>
              <h3 className="font-black text-xl tracking-tight">
                {isResign ? 'Resign Karyawan' : 'Aktifkan Karyawan'}
              </h3>
              <p className="text-white/80 text-xs font-bold">
                {row.nama} • {row.nrp}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Jabatan</p>
                <p className="font-bold text-slate-800">{row.jabatan || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Site</p>
                <p className="font-bold text-slate-800">{row.site || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Tgl Masuk</p>
                <p className="font-bold text-slate-800">{row.tanggal_masuk || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Masa Kerja</p>
                <p className="font-bold text-blue-600">{row._masa_kerja || '-'}</p>
              </div>
            </div>
          </div>

          {isResign ? (
            <>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                  Tanggal Resign <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={tglResign}
                  onChange={e => setTglResign(e.target.value)}
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none"
                  required
                />
              </div>
{/* 🆕 Field POH (informasi saja) */}
{row.poh && (
  <div className="bg-slate-100 p-3 rounded-xl">
    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">POH (Point of Hire)</p>
    <p className="text-sm font-bold text-slate-700 mt-1">📍 {row.poh}</p>
  </div>
)}

<div>
  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
    Alasan Resign <span className="text-rose-500">*</span>
  </label>

                <select
                  value={alasan}
                  onChange={e => setAlasan(e.target.value)}
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none"
                  required
                >
                  <option value="">-- Pilih Alasan --</option>
                  <option value="Mengundurkan Diri">Mengundurkan Diri</option>
                  <option value="Kontrak Habis">Kontrak Habis</option>
                  <option value="Pensiun">Pensiun</option>
                  <option value="PHK">PHK</option>
                  <option value="Meninggal Dunia">Meninggal Dunia</option>
                  <option value="Pindah Perusahaan">Pindah Perusahaan</option>
                  <option value="Alasan Keluarga">Alasan Keluarga</option>
                  <option value="Kesehatan">Kesehatan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                <p className="text-[10px] font-bold text-orange-700">
                   Setelah resign: Status karyawan berubah, tidak bisa clock in/out, tidak muncul di roster
                </p>
              </div>
            </>
          ) : (
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
              <p className="text-sm font-bold text-emerald-700 mb-2">
                Karyawan ini akan diaktifkan kembali.
              </p>
              <div className="text-[11px] text-emerald-600 space-y-1">
                <p>• Tanggal resign akan dihapus</p>
                <p>• Alasan resign akan dihapus</p>
                <p>• Status kembali ke "Aktif"</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-slate-200"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-4 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 ${
                isResign 
                  ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' 
                  : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
              } disabled:opacity-50`}
            >
              {saving ? 'PROSES...' : (isResign ? '🚪 RESIGN' : '↩️ AKTIFKAN')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function UpdateExpiredModal({ row, onClose, onSuccess }: any) {
  const jenisRaw = String(row.jenis_dokumen || '').replace(/[^\w\s]/g, '').trim().toUpperCase()
  const [tanggalBaru, setTanggalBaru] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)

  async function handleSave() {
    if (!tanggalBaru) {
      setMsg({ type: 'err', text: '❌ Tanggal wajib diisi' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/monitoring-expired', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenis_dokumen: jenisRaw,
          record_id: jenisRaw === 'SIMPOL' ? row.nrp : row.id,
          tanggal_baru: tanggalBaru,
          nama_karyawan: row._nama_karyawan || row.nrp
        })
      })
      const json = await res.json()
      if (res.ok) {
        setMsg({ type: 'ok', text: json.message || ' Berhasil diperpanjang' })
        setTimeout(() => (typeof onSuccess !== 'undefined' && onSuccess) && onSuccess(), 1000)
      } else {
        setMsg({ type: 'err', text: '❌ ' + (json.error || 'Gagal update') })
      }
    } catch (err: any) {
      setMsg({ type: 'err', text: '❌ Koneksi bermasalah: ' + err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100]" onClick={() => !saving && onClose()} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-md bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-slate-900 to-[#003D79] text-white">
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-2xl">
              
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest">Perpanjang Dokumen</p>
              <h2 className="font-black text-lg tracking-tight truncate">{row.jenis_dokumen}</h2>
            </div>
            <button
              onClick={() => !saving && onClose()}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-lg font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Info Karyawan */}
        <div className="p-6 bg-slate-50/50 border-b-2 border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Karyawan</p>
          <p className="font-black text-slate-900 text-sm">{row._nama_karyawan || '-'}</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            NRP: {row.nrp} • Site: {row._site}
          </p>
        </div>

        {/* Alert Message */}
        {msg && (
          <div className={`px-6 py-3 border-b-2 ${msg.type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
            <p className="text-[11px] font-black uppercase tracking-widest">{msg.text}</p>
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Tanggal Expired Saat Ini
            </p>
            <div className="bg-rose-50 border-2 border-rose-100 p-3 rounded-2xl">
              <p className="font-black text-rose-700 text-sm">
                {row.tanggal_expired ? new Date(row.tanggal_expired).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
              🗓️ Tanggal Expired Baru
            </label>
            <input
              type="date"
              value={tanggalBaru}
              onChange={e => setTanggalBaru(e.target.value)}
              className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-sm font-bold focus:border-[#003D79] focus:bg-white outline-none transition-all"
            />
            <p className="text-[10px] text-slate-400 font-bold mt-2">
              💡 Pilih tanggal baru untuk memperpanjang masa berlaku dokumen ini
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t-2 border-slate-100 flex gap-3">
          <button
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !tanggalBaru}
            className={`flex-[2] py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${
              saving || !tanggalBaru
                ? 'bg-slate-200 text-slate-400'
                : 'bg-[#003D79] text-white shadow-xl shadow-blue-200 hover:bg-blue-700'
            }`}
          >
            {saving ? '⏳ MENYIMPAN...' : '💾 SIMPAN'}
          </button>
        </div>
      </div>
    </>
  )
}
