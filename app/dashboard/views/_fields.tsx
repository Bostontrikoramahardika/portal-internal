'use client'

// HELPER TAMPILAN - disalin OTOMATIS dari page.tsx (v1.8)
// Isinya identik dengan aslinya. page.tsx tetap memakai salinannya sendiri.

export function Input({ label, onChange, ...props }: any) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
      <input {...props} onChange={e => onChange(e.target.value)} className="w-full p-3.5 border-2 border-slate-50 rounded-2xl bg-slate-50 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm" />
    </div>
  )
}

export function DetailRow({ label, value, mono = false }: any) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-50 pb-2 last:border-0">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-shrink-0">{label}</p>
      <div className={`text-xs font-bold text-slate-800 text-right ${mono ? 'font-mono' : ''}`}>
        {value || '-'}
      </div>
    </div>
  )
}

// Helper Input untuk Sites Manager

export function FieldInput({ label, value, onChange, type = 'text', placeholder = '' }: any) {
  return (
    <div>
      <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 border-2 border-slate-100 rounded-xl bg-white text-xs font-bold focus:border-[#003D79] outline-none transition-all"
      />
    </div>
  )
}

// Helper Toggle untuk Sites Manager

export function ToggleField({ label, checked, onChange }: any) {
  return (
    <button 
      onClick={() => onChange(!checked)}
      className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
        checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'
      }`}
    >
      <span className={`text-xs font-black uppercase tracking-widest ${checked ? 'text-emerald-700' : 'text-slate-500'}`}>
        {label}
      </span>
      <div className={`w-12 h-6 rounded-full flex items-center transition-all ${
        checked ? 'bg-emerald-500 justify-end' : 'bg-slate-200 justify-start'
      } px-1`}>
        <div className="w-4 h-4 bg-white rounded-full shadow"></div>
      </div>
    </button>
  )
}
