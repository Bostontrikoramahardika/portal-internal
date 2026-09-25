const fs = require('fs');

const code = `"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface Temuan {
  deskripsi: string;
  rekomendasi: string;
  prioritas: string;
  status: string;
}

export default function P2HExcavatorPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [view, setView] = useState<"LIST" | "FORM">("LIST");

  // Header Form
  const [form, setForm] = useState({
    model_unit: "PC 200", no_lambung: "", shift: "I", tanggal: new Date().toISOString().split("T")[0],
    hm_awal: "", hm_akhir: "", lokasi: "", inspector_nama: "", inspector_nrp: "", operator: "",
    type_breaker: "EDT 2000", type_chisel: "Konde"
  });

  // State Checklist [OK(true), NOK(false), Keterangan]
  const [checklist, setChecklist] = useState<Record<string, {ok: boolean | null, ket: string}>>({});
  
  // Table Temuan
  const [temuanList, setTemuanList] = useState<Temuan[]>([
    { deskripsi: "", rekomendasi: "", prioritas: "", status: "" },
    { deskripsi: "", rekomendasi: "", prioritas: "", status: "" }
  ]);

  useEffect(function() {
    fetchHistory();
    const u = localStorage.getItem("btm_user");
    if (u) {
      try {
        const user = JSON.parse(u);
        setForm(f => ({ ...f, inspector_nama: user.nama || "", inspector_nrp: user.nrp || "", lokasi: user.site || "MLP" }));
      } catch (e) {}
    }
  }, []);

  const fetchHistory = async function() {
    try {
      const res = await fetch("/api/plant/inspeksi");
      const json = await res.json();
      if(json.success) setHistory(json.data);
    } catch(err){}
  };

  const setCL = (key: string, val: boolean, ket: string = "") => {
    setChecklist(prev => ({ ...prev, [key]: { ok: val, ket: prev[key]?.ket || ket } }));
  };
  const setCLKet = (key: string, ket: string) => {
    setChecklist(prev => ({ ...prev, [key]: { ok: prev[key]?.ok ?? true, ket } }));
  };

  // Struktur Master Checklist
  const structure = {
    general: {
      "A. ENGINE & LEVEL FLUIDA": [
        {k: "gen_a1", l: "Oli Engine (Level Dipstick & Kebocoran)"}, {k: "gen_a2", l: "Coolant / Air Radiator & Reservoir"},
        {k: "gen_a3", l: "Oli Hidrolik (Sight Glass Level)"}, {k: "gen_a4", l: "Oli Swing & Final Drive Gear"},
        {k: "gen_a5", l: "Bahan Bakar & Water Separator (Drain)"}, {k: "gen_a6", l: "V-Belt / Fan Belt & Air Filter Indicator"},
        {k: "gen_a7", l: "Suara Mesin & Warna Asap Knalpot"}
      ],
      "B. SISTEM HIDROLIK & CYLINDER": [
        {k: "gen_b1", l: "Pompa Hidrolik Utama & Control Valve Leak"}, {k: "gen_b2", l: "Cylinder Boom & Arm (Bocor/Goresan)"},
        {k: "gen_b3", l: "Hoses / Pipa Hidrolik (Retak/Friksi)"}
      ],
      "C. UNDERCARRIAGE & SWING": [
        {k: "gen_c1", l: "Track Shoe, Link & Ketegangan Rantai"}, {k: "gen_c2", l: "Upper/Lower Roller & Front Idler"},
        {k: "gen_c3", l: "Sprocket & Final Drive Travel Motor"}, {k: "gen_c4", l: "Swing Circle Bearing & Swing Brake Lock"}
      ],
      "D. ELECTRICAL, CABIN & SAFETY": [
        {k: "gen_d1", l: "Lampu Kerja Depan/Belakang & Rotary Lamp"}, {k: "gen_d2", l: "Klakson, Backup Alarm Travel & Wiper"},
        {k: "gen_d3", l: "Monitor Panel Display & Error Code"}, {k: "gen_d4", l: "APAR, Safety Belt, Kaca Kabin & Spion"}
      ]
    },
    breaker: {
      "A. BOLT & FASTENER": [
        {k: "br_a1", l: "Bolt Side / Bolt 75an (Kekencangan)"}, {k: "br_a2", l: "Bolt Casing / Bolt 36"},
        {k: "br_a3", l: "Through Bolt / Panjang"}, {k: "br_a4", l: "Baut Top Bracket / Mounting"}
      ],
      "B. PIN, BUSHING & PENGUNCI": [
        {k: "br_b1", l: "Pin Tahu (Kondisi/Posisi)"}, {k: "br_b2", l: "Lock Pin Tahu (Aman)"},
        {k: "br_b3", l: "Lock Pin Bushing"}, {k: "br_b4", l: "Bushing Luar (Outer - Keausan)"},
        {k: "br_b5", l: "Bushing Dalam (Inner - Keausan)"}, {k: "br_b6", l: "Pin & Bushing Sambungan Arm"}
      ],
      "C. CHISEL & OPERASIONAL": [
        {k: "br_c1", l: "Chisel (Tumpul / Retak / Mushrooming)"}, {k: "br_c2", l: "Retaining Pin Chisel"},
        {k: "br_c3", l: "Greasing Chisel & Bushing (Tiap 2 Jam)"}, {k: "br_c4", l: "Hose Breaker High Pressure"},
        {k: "br_c5", l: "Kebocoran Oli Hidrolik / Grease"}, {k: "br_c6", l: "Casing / Body Breaker (Keretakan)"},
        {k: "br_c7", l: "Tekanan Gas Nitrogen Akumulator"}, {k: "br_c8", l: "Stop Valve Breaker (Buka Penuh)"},
        {k: "br_c9", l: "Getaran / Suara Ketukan Abnormal"}
      ]
    }
  };

  const submitForm = async (e: any) => {
    e.preventDefault();
    if(!form.no_lambung) { setMsg("No Lambung wajib diisi!"); return; }
    setLoading(true); setMsg("");
    try {
      const isBreakdown = Object.values(checklist).some(v => v.ok === false);
      const res = await fetch("/api/plant/inspeksi", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          no_unit: form.no_lambung, jenis_unit: form.model_unit, site: form.lokasi, shift: form.shift,
          inspector_nrp: form.inspector_nrp, inspector_nama: form.inspector_nama, operator: form.operator,
          hm_awal: form.hm_awal, hm_akhir: form.hm_akhir, type_breaker: form.type_breaker, type_chisel: form.type_chisel,
          checklist, temuan_tindakan: temuanList.filter(t => t.deskripsi !== ""),
          status_kelayakan: isBreakdown ? "WARNING" : "READY"
        })
      });
      if(res.ok) {
        setView("LIST"); fetchHistory();
      } else { setMsg("Gagal menyimpan form."); }
    } catch(err) { setMsg("Error server."); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 pb-28">
      {/* HEADER */}
      <div className="max-w-6xl mx-auto mb-6">
        <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2.5 mb-4">
          <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">📋</span>
          Inspeksi & P2H (Excavator & Breaker)
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setView("LIST")} className={"px-4 py-2 rounded-lg text-xs font-bold transition " + (view === "LIST" ? "bg-cyan-500 text-white" : "bg-slate-900 text-slate-400 border border-slate-700")}>Riwayat P2H</button>
          <button onClick={() => setView("FORM")} className={"px-4 py-2 rounded-lg text-xs font-bold transition " + (view === "FORM" ? "bg-cyan-500 text-white" : "bg-slate-900 text-slate-400 border border-slate-700")}>+ Buat Inspeksi Baru</button>
        </div>
      </div>

      {view === "LIST" && (
        <div className="max-w-6xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr><th className="p-3">Tanggal</th><th className="p-3">No Unit</th><th className="p-3">HM</th><th className="p-3">Operator</th><th className="p-3">Inspector</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {history.map(h => (
                <tr key={h.id} className="hover:bg-slate-800/40">
                  <td className="p-3">{new Date(h.created_at).toLocaleDateString()}</td>
                  <td className="p-3 font-black text-amber-400">{h.no_unit}</td>
                  <td className="p-3 text-cyan-300 font-mono">{h.hm_km}</td>
                  <td className="p-3">{h.operator}</td>
                  <td className="p-3">{h.inspector_nama}</td>
                  <td className="p-3"><span className={"px-2 py-0.5 rounded font-bold text-[10px] " + (h.status_kelayakan==="READY"?"bg-emerald-900/60 text-emerald-400":"bg-amber-900/60 text-amber-400")}>{h.status_kelayakan}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "FORM" && (
        <form onSubmit={submitForm} className="max-w-6xl mx-auto bg-white text-slate-900 rounded-xl p-6 shadow-xl border border-slate-200">
          
          {/* HEADER FORM KERTAS */}
          <div className="border-2 border-sky-600 mb-6">
            <div className="bg-sky-600 text-white font-black text-center py-2 text-sm tracking-widest">FORM INSPEKSI HARIAN EXCAVATOR & BREAKER</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 text-xs divide-x divide-y divide-slate-300 border-t border-slate-300">
              <div className="flex"><span className="p-2 bg-slate-100 font-bold w-24">Model Unit:</span><input value={form.model_unit} onChange={e=>setForm({...form, model_unit:e.target.value})} className="p-2 w-full outline-none" /></div>
              <div className="flex"><span className="p-2 bg-slate-100 font-bold w-16">Shift:</span>
                <select value={form.shift} onChange={e=>setForm({...form, shift:e.target.value})} className="p-2 w-full outline-none bg-white"><option>I</option><option>II</option></select>
              </div>
              <div className="flex"><span className="p-2 bg-slate-100 font-bold w-20">Tanggal:</span><input type="date" value={form.tanggal} onChange={e=>setForm({...form, tanggal:e.target.value})} className="p-2 w-full outline-none" /></div>
              <div className="flex"><span className="p-2 bg-slate-100 font-bold w-20">HM Awal:</span><input type="number" value={form.hm_awal} onChange={e=>setForm({...form, hm_awal:e.target.value})} className="p-2 w-full outline-none font-mono" /></div>
              
              <div className="flex"><span className="p-2 bg-slate-100 font-bold w-24 border-t border-slate-300">No. Lambung:</span><input value={form.no_lambung} onChange={e=>setForm({...form, no_lambung:e.target.value})} placeholder="Contoh: EX-205" required className="p-2 w-full outline-none font-black text-sky-700 border-t border-slate-300" /></div>
              <div className="flex"><span className="p-2 bg-slate-100 font-bold w-16 border-t border-slate-300">Lokasi:</span><input value={form.lokasi} onChange={e=>setForm({...form, lokasi:e.target.value})} className="p-2 w-full outline-none border-t border-slate-300" /></div>
              <div className="flex"><span className="p-2 bg-slate-100 font-bold w-20 border-t border-slate-300">Inspector:</span><input value={form.inspector_nama} onChange={e=>setForm({...form, inspector_nama:e.target.value})} className="p-2 w-full outline-none border-t border-slate-300" /></div>
              <div className="flex"><span className="p-2 bg-slate-100 font-bold w-20 border-t border-slate-300">HM Akhir:</span><input type="number" value={form.hm_akhir} onChange={e=>setForm({...form, hm_akhir:e.target.value})} className="p-2 w-full outline-none font-mono border-t border-slate-300" /></div>
              
              <div className="flex md:col-span-2 border-t border-slate-300"><span className="p-2 bg-yellow-100 font-bold w-32 border-r border-slate-300">Type Breaker:</span>
                <select value={form.type_breaker} onChange={e=>setForm({...form, type_breaker:e.target.value})} className="p-2 w-full outline-none bg-white"><option>EDT 2000</option><option>EDT 2200</option><option>SAYA</option></select>
              </div>
              <div className="flex md:col-span-2 border-t border-slate-300"><span className="p-2 bg-yellow-100 font-bold w-32 border-r border-slate-300">Type Chisel:</span>
                <select value={form.type_chisel} onChange={e=>setForm({...form, type_chisel:e.target.value})} className="p-2 w-full outline-none bg-white"><option>Konde</option><option>Polos</option></select>
              </div>
              <div className="flex md:col-span-4 border-t border-slate-300"><span className="p-2 bg-slate-100 font-bold w-24 border-r border-slate-300">Operator:</span><input value={form.operator} onChange={e=>setForm({...form, operator:e.target.value})} className="p-2 w-full outline-none" placeholder="Nama Operator yang membawa unit" /></div>
            </div>
          </div>

          {/* DUAL COLUMN CHECKLIST (GENERAL & BREAKER) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            
            {/* GENERAL UNIT */}
            <div className="border border-sky-400">
              <div className="bg-sky-500 text-white text-center font-bold text-xs py-1.5">I. INSPEKSI GENERAL UNIT (PC 210-10 MO)</div>
              <div className="grid grid-cols-12 bg-slate-100 border-b border-sky-400 text-[10px] font-bold text-center">
                <div className="col-span-1 p-1 border-r border-slate-300">NO</div>
                <div className="col-span-6 p-1 border-r border-slate-300">ITEM PEMERIKSAAN UNIT</div>
                <div className="col-span-2 p-1 border-r border-slate-300 bg-emerald-100 text-emerald-700">OK</div>
                <div className="col-span-1 p-1 border-r border-slate-300 bg-rose-100 text-rose-700">NOK</div>
                <div className="col-span-2 p-1">KET</div>
              </div>
              {Object.entries(structure.general).map(([catName, items]) => (
                <React.Fragment key={catName}>
                  <div className="bg-slate-200 text-[11px] font-bold p-1 px-2 border-y border-slate-300">{catName}</div>
                  {items.map((it, idx) => (
                    <div key={it.k} className="grid grid-cols-12 text-[10px] border-b border-slate-200 hover:bg-slate-50 items-stretch">
                      <div className="col-span-1 p-1 border-r border-slate-200 text-center flex items-center justify-center">{idx + 1}</div>
                      <div className="col-span-6 p-1 border-r border-slate-200 flex items-center">{it.l}</div>
                      <div className="col-span-2 border-r border-slate-200 cursor-pointer bg-emerald-50 hover:bg-emerald-200 flex items-center justify-center text-emerald-600 font-black text-sm" onClick={()=>setCL(it.k, true)}>{checklist[it.k]?.ok === true ? "✓" : ""}</div>
                      <div className="col-span-1 border-r border-slate-200 cursor-pointer bg-rose-50 hover:bg-rose-200 flex items-center justify-center text-rose-600 font-black text-sm" onClick={()=>setCL(it.k, false)}>{checklist[it.k]?.ok === false ? "✕" : ""}</div>
                      <div className="col-span-2"><input type="text" className="w-full h-full p-1 text-[9px] outline-none bg-transparent" value={checklist[it.k]?.ket || ""} onChange={e=>setCLKet(it.k, e.target.value)} /></div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>

            {/* ATTACHMENT BREAKER */}
            <div className="border border-sky-400">
              <div className="bg-sky-500 text-white text-center font-bold text-xs py-1.5">II. INSPEKSI ATTACHMENT BREAKER (KRITIS)</div>
              <div className="grid grid-cols-12 bg-slate-100 border-b border-sky-400 text-[10px] font-bold text-center">
                <div className="col-span-1 p-1 border-r border-slate-300">NO</div>
                <div className="col-span-6 p-1 border-r border-slate-300">ITEM PEMERIKSAAN BREAKER</div>
                <div className="col-span-2 p-1 border-r border-slate-300 bg-emerald-100 text-emerald-700">OK</div>
                <div className="col-span-1 p-1 border-r border-slate-300 bg-rose-100 text-rose-700">NOK</div>
                <div className="col-span-2 p-1">KET</div>
              </div>
              {Object.entries(structure.breaker).map(([catName, items]) => (
                <React.Fragment key={catName}>
                  <div className="bg-orange-100 text-[11px] font-bold p-1 px-2 border-y border-slate-300">{catName}</div>
                  {items.map((it, idx) => (
                    <div key={it.k} className="grid grid-cols-12 text-[10px] border-b border-slate-200 hover:bg-slate-50 items-stretch">
                      <div className="col-span-1 p-1 border-r border-slate-200 text-center flex items-center justify-center">{idx + 1}</div>
                      <div className="col-span-6 p-1 border-r border-slate-200 flex items-center">{it.l}</div>
                      <div className="col-span-2 border-r border-slate-200 cursor-pointer bg-emerald-50 hover:bg-emerald-200 flex items-center justify-center text-emerald-600 font-black text-sm" onClick={()=>setCL(it.k, true)}>{checklist[it.k]?.ok === true ? "✓" : ""}</div>
                      <div className="col-span-1 border-r border-slate-200 cursor-pointer bg-rose-50 hover:bg-rose-200 flex items-center justify-center text-rose-600 font-black text-sm" onClick={()=>setCL(it.k, false)}>{checklist[it.k]?.ok === false ? "✕" : ""}</div>
                      <div className="col-span-2"><input type="text" className="w-full h-full p-1 text-[9px] outline-none bg-transparent" value={checklist[it.k]?.ket || ""} onChange={e=>setCLKet(it.k, e.target.value)} /></div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>

          </div>

          {/* TEMUAN & REKOMENDASI */}
          <div className="border border-slate-400 mb-6">
            <div className="bg-slate-200 text-slate-800 font-bold text-xs py-1.5 px-3 border-b border-slate-400">III. CATATAN TEMUAN / KERUSAKAN & TINDAKAN PERBAIKAN</div>
            <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-400 text-[10px] font-bold text-center">
              <div className="col-span-1 p-1 border-r border-slate-300">NO</div>
              <div className="col-span-5 p-1 border-r border-slate-300">DESKRIPSI TEMUAN MASALAH</div>
              <div className="col-span-4 p-1 border-r border-slate-300">REKOMENDASI TINDAKAN</div>
              <div className="col-span-1 p-1 border-r border-slate-300">PRIORITAS</div>
              <div className="col-span-1 p-1">STATUS</div>
            </div>
            {temuanList.map((t, i) => (
              <div key={i} className="grid grid-cols-12 text-[11px] border-b border-slate-200 items-stretch">
                <div className="col-span-1 p-1 border-r border-slate-200 text-center flex items-center justify-center">{i+1}</div>
                <div className="col-span-5 border-r border-slate-200"><input className="w-full h-full p-1.5 outline-none font-semibold text-rose-700" value={t.deskripsi} onChange={e=>{const n=[...temuanList]; n[i].deskripsi=e.target.value; setTemuanList(n);}} /></div>
                <div className="col-span-4 border-r border-slate-200"><input className="w-full h-full p-1.5 outline-none font-semibold text-sky-700" value={t.rekomendasi} onChange={e=>{const n=[...temuanList]; n[i].rekomendasi=e.target.value; setTemuanList(n);}} /></div>
                <div className="col-span-1 border-r border-slate-200"><input className="w-full h-full p-1.5 outline-none text-center" value={t.prioritas} onChange={e=>{const n=[...temuanList]; n[i].prioritas=e.target.value; setTemuanList(n);}} /></div>
                <div className="col-span-1"><input className="w-full h-full p-1.5 outline-none text-center" value={t.status} onChange={e=>{const n=[...temuanList]; n[i].status=e.target.value; setTemuanList(n);}} /></div>
              </div>
            ))}
            <div className="p-1 bg-slate-50"><button type="button" onClick={()=>setTemuanList([...temuanList, {deskripsi:"",rekomendasi:"",prioritas:"",status:""}])} className="text-[10px] text-sky-600 font-bold px-2">+ Tambah Baris Temuan</button></div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            {msg && <span className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded">{msg}</span>}
            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-black transition ml-auto flex items-center gap-2">
              {loading ? "Menyimpan..." : "Simpan & Kirim Laporan P2H"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
`;

fs.writeFileSync('./app/dashboard/plant/inspeksi/page.tsx', code, 'utf8');
console.log("✓ UI Form Inspeksi Digital (Sesuai Foto) BERHASIL DIBUAT!");
