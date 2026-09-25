const fs = require('fs');
const path = require('path');

// 1. Pastikan direktori ada
const dirUI = './app/dashboard/plant/inspeksi';
const dirAPI = './app/api/plant/inspeksi';

if (!fs.existsSync(dirUI)) fs.mkdirSync(dirUI, { recursive: true });
if (!fs.existsSync(dirAPI)) fs.mkdirSync(dirAPI, { recursive: true });

// 2. Tulis File API
const apiCode = 'import { NextRequest, NextResponse } from "next/server";\n' +
'import { supabaseAdmin } from "@/app/lib/supabase-admin";\n\n' +
'export async function GET(request: NextRequest) {\n' +
'  try {\n' +
'    const { searchParams } = new URL(request.url);\n' +
'    const site = searchParams.get("site");\n' +
'    let query = supabaseAdmin.from("inspeksi_unit").select("*").order("created_at", { ascending: false });\n' +
'    if (site && site !== "ALL") query = query.eq("site", site);\n' +
'    const { data, error } = await query.limit(100);\n' +
'    if (error) throw error;\n' +
'    return NextResponse.json({ success: true, data: data || [] });\n' +
'  } catch (err: any) {\n' +
'    return NextResponse.json({ success: false, error: err.message }, { status: 500 });\n' +
'  }\n' +
'}\n\n' +
'export async function POST(request: NextRequest) {\n' +
'  try {\n' +
'    const body = await request.json();\n' +
'    const { data, error } = await supabaseAdmin.from("inspeksi_unit").insert({\n' +
'      no_unit: body.no_unit,\n' +
'      shift: body.shift,\n' +
'      site: body.site,\n' +
'      inspector_nrp: body.inspector_nrp,\n' +
'      inspector_nama: body.inspector_nama,\n' +
'      operator: body.operator || "",\n' +
'      hm_km: parseFloat(body.hm_awal) || 0,\n' +
'      hm_akhir: parseFloat(body.hm_akhir) || 0,\n' +
'      type_breaker: body.type_breaker || "",\n' +
'      type_chisel: body.type_chisel || "",\n' +
'      status_kelayakan: body.status_kelayakan || "READY",\n' +
'      checklist: body.checklist || {},\n' +
'      temuan_tindakan: body.temuan_tindakan || [],\n' +
'      jenis_unit: body.jenis_unit || "EXCAVATOR & BREAKER"\n' +
'    }).select().single();\n\n' +
'    if (error) throw error;\n' +
'    return NextResponse.json({ success: true, data });\n' +
'  } catch (err: any) {\n' +
'    return NextResponse.json({ success: false, error: err.message }, { status: 500 });\n' +
'  }\n' +
'}\n';

fs.writeFileSync(path.join(dirAPI, 'route.ts'), apiCode, 'utf8');
console.log("✓ API Backend Inspeksi berhasil dibuat!");

// 3. Tulis File UI Page
const uiCode = '"use client";\n\n' +
'import React, { useState, useEffect } from "react";\n' +
'import Link from "next/link";\n\n' +
'interface Temuan {\n' +
'  deskripsi: string;\n' +
'  rekomendasi: string;\n' +
'  prioritas: string;\n' +
'  status: string;\n' +
'}\n\n' +
'export default function P2HExcavatorPage() {\n' +
'  const [loading, setLoading] = useState(false);\n' +
'  const [msg, setMsg] = useState("");\n' +
'  const [history, setHistory] = useState<any[]>([]);\n' +
'  const [view, setView] = useState<"LIST" | "FORM">("LIST");\n\n' +
'  const [form, setForm] = useState({\n' +
'    model_unit: "PC 210", no_lambung: "", shift: "I", tanggal: new Date().toISOString().split("T")[0],\n' +
'    hm_awal: "", hm_akhir: "", lokasi: "ALASKA", inspector_nama: "", inspector_nrp: "", operator: "",\n' +
'    type_breaker: "EDT 2200", type_chisel: "Chisel Konde"\n' +
'  });\n\n' +
'  const [checklist, setChecklist] = useState<Record<string, {ok: boolean | null, ket: string}>>({});\n' +
'  const [temuanList, setTemuanList] = useState<Temuan[]>([\n' +
'    { deskripsi: "", rekomendasi: "", prioritas: "", status: "" },\n' +
'    { deskripsi: "", rekomendasi: "", prioritas: "", status: "" }\n' +
'  ]);\n\n' +
'  useEffect(function() {\n' +
'    fetchHistory();\n' +
'    const u = localStorage.getItem("btm_user");\n' +
'    if (u) {\n' +
'      try {\n' +
'        const user = JSON.parse(u);\n' +
'        setForm(f => ({ ...f, inspector_nama: user.nama || "", inspector_nrp: user.nrp || "", lokasi: user.site || "MLP" }));\n' +
'      } catch (e) {}\n' +
'    }\n' +
'  }, []);\n\n' +
'  const fetchHistory = async function() {\n' +
'    try {\n' +
'      const res = await fetch("/api/plant/inspeksi");\n' +
'      const json = await res.json();\n' +
'      if(json.success) setHistory(json.data);\n' +
'    } catch(err){}\n' +
'  };\n\n' +
'  const setCL = (key: string, val: boolean) => {\n' +
'    setChecklist(prev => ({ ...prev, [key]: { ok: val, ket: prev[key]?.ket || "" } }));\n' +
'  };\n' +
'  const setCLKet = (key: string, ket: string) => {\n' +
'    setChecklist(prev => ({ ...prev, [key]: { ok: prev[key]?.ok ?? true, ket } }));\n' +
'  };\n\n' +
'  const structure = {\n' +
'    general: {\n' +
'      "A. ENGINE & LEVEL FLUIDA": [\n' +
'        {k: "gen_a1", l: "Oli Engine (Level Dipstick & Kebocoran)"},\n' +
'        {k: "gen_a2", l: "Coolant / Air Radiator & Reservoir"},\n' +
'        {k: "gen_a3", l: "Oli Hidrolik (Sight Glass Level)"},\n' +
'        {k: "gen_a4", l: "Oli Swing & Final Drive Gear"},\n' +
'        {k: "gen_a5", l: "Bahan Bakar & Water Separator (Drain)"},\n' +
'        {k: "gen_a6", l: "V-Belt / Fan Belt & Air Filter Dust Indicator"},\n' +
'        {k: "gen_a7", l: "Suara Mesin & Warna Asap Knalpot"}\n' +
'      ],\n' +
'      "B. SISTEM HIDROLIK & CYLINDER": [\n' +
'        {k: "gen_b1", l: "Pompa Hidrolik Utama & Control Valve Leak"},\n' +
'        {k: "gen_b2", l: "Cylinder Boom & Arm (Bocor / Goresan Rod)"},\n' +
'        {k: "gen_b3", l: "Hoses / Pipa Hidrolik (Retak / Friksi Gesek)"}\n' +
'      ],\n' +
'      "C. UNDERCARRIAGE & SWING SYSTEM": [\n' +
'        {k: "gen_c1", l: "Track Shoe, Link & Ketegangan Rantai"},\n' +
'        {k: "gen_c2", l: "Upper/Lower Roller & Front Idler"},\n' +
'        {k: "gen_c3", l: "Sprocket & Final Drive Travel Motor"},\n' +
'        {k: "gen_c4", l: "Swing Circle Bearing & Swing Brake Lock"}\n' +
'      ],\n' +
'      "D. ELECTRICAL, CABIN & SAFETY": [\n' +
'        {k: "gen_d1", l: "Lampu Kerja Depan/Belakang & Rotary Lamp"},\n' +
'        {k: "gen_d2", l: "Klakson, Backup Alarm Travel & Wiper"},\n' +
'        {k: "gen_d3", l: "Monitor Panel Display & Status Error Code"},\n' +
'        {k: "gen_d4", l: "APAR, Safety Belt, Kaca Kabin & Spion"}\n' +
'      ]\n' +
'    },\n' +
'    breaker: {\n' +
'      "A. BOLT & FASTENER (RENTAN KENDOR / LEPAS)": [\n' +
'        {k: "br_a1", l: "Bolt Side / Bolt 75an (Kekencangan)"},\n' +
'        {k: "br_a2", l: "Bolt Casing / Bolt 36 (Kekencangan)"},\n' +
'        {k: "br_a3", l: "Through Bolt / Bolt Panjang (Kondisi/Torsi)"},\n' +
'        {k: "br_a4", l: "Baut Top Bracket / Mounting Breaker"}\n' +
'      ],\n' +
'      "B. PIN, BUSHING & PENGUNCI": [\n' +
'        {k: "br_b1", l: "Pin Tahu (Kondisi Aus / Posisi)"},\n' +
'        {k: "br_b2", l: "Lock Pin Tahu (Pengunci Terpasang Aman)"},\n' +
'        {k: "br_b3", l: "Lock Pin Bushing (Pengunci Bushing)"},\n' +
'        {k: "br_b4", l: "Bushing Luar (Outer Bushing) - Keausan"},\n' +
'        {k: "br_b5", l: "Bushing Dalam (Inner Bushing) - Keausan"},\n' +
'        {k: "br_b6", l: "Pin & Bushing Sambungan Arm ke Breaker"}\n' +
'      ],\n' +
'      "C. CHISEL & OPERASIONAL": [\n' +
'        {k: "br_c1", l: "Chisel (Tumpul / Retak / Mushrooming)"},\n' +
'        {k: "br_c2", l: "Retaining Pin Chisel (Pin Penahan Chisel)"},\n' +
'        {k: "br_c3", l: "Greasing Chisel & Bushing (Tiap 2 Jam Kerja)"},\n' +
'        {k: "br_c4", l: "Hose Breaker High Pressure (Inlet / Outlet)"},\n' +
'        {k: "br_c5", l: "Kebocoran Oli Hidrolik / Grease di Casing"},\n' +
'        {k: "br_c6", l: "Casing / Body Breaker (Keretakan / Crack Las)"},\n' +
'        {k: "br_c7", l: "Tekanan Gas Nitrogen Akumulator Breaker"},\n' +
'        {k: "br_c8", l: "Stop Valve Breaker (Buka Penuh saat Operasi)"},\n' +
'        {k: "br_c9", l: "Getaran / Suara Ketukan Abnormal Breaker"}\n' +
'      ]\n' +
'    }\n' +
'  };\n\n' +
'  const submitForm = async (e: any) => {\n' +
'    e.preventDefault();\n' +
'    if(!form.no_lambung) { setMsg("No Lambung wajib diisi!"); return; }\n' +
'    setLoading(true); setMsg("");\n' +
'    try {\n' +
'      const isBreakdown = Object.values(checklist).some(v => v.ok === false);\n' +
'      const res = await fetch("/api/plant/inspeksi", {\n' +
'        method: "POST", headers: {"Content-Type":"application/json"},\n' +
'        body: JSON.stringify({\n' +
'          no_unit: form.no_lambung, jenis_unit: form.model_unit, site: form.lokasi, shift: form.shift,\n' +
'          inspector_nrp: form.inspector_nrp, inspector_nama: form.inspector_nama, operator: form.operator,\n' +
'          hm_awal: form.hm_awal, hm_akhir: form.hm_akhir, type_breaker: form.type_breaker, type_chisel: form.type_chisel,\n' +
'          checklist, temuan_tindakan: temuanList.filter(t => t.deskripsi !== ""),\n' +
'          status_kelayakan: isBreakdown ? "WARNING" : "READY"\n' +
'        })\n' +
'      });\n' +
'      if(res.ok) {\n' +
'        setView("LIST"); fetchHistory();\n' +
'      } else { setMsg("Gagal menyimpan form."); }\n' +
'    } catch(err) { setMsg("Error server."); }\n' +
'    setLoading(false);\n' +
'  };\n\n' +
'  return (\n' +
'    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 pb-28">\n' +
'      <div className="max-w-6xl mx-auto mb-6">\n' +
'        <div className="flex items-center gap-2 text-xs font-semibold mb-2">\n' +
'          <Link href="/dashboard" className="text-amber-500 hover:underline flex items-center gap-1">\n' +
'            <span>‹</span> Menu Utama\n' +
'          </Link>\n' +
'          <span className="text-slate-600">/</span>\n' +
'          <span className="text-slate-300 font-bold">Inspeksi P2H (Harian)</span>\n' +
'        </div>\n' +
'        <div className="flex items-center justify-between border-b border-slate-800 pb-4">\n' +
'          <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2.5">\n' +
'            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">📋</span>\n' +
'            Form Inspeksi Harian Excavator & Breaker\n' +
'          </h1>\n' +
'          <div className="flex gap-2">\n' +
'            <button onClick={() => setView("LIST")} className={"px-4 py-2 rounded-xl text-xs font-bold transition " + (view === "LIST" ? "bg-cyan-500 text-white" : "bg-slate-900 text-slate-400 border border-slate-800")}>Riwayat P2H</button>\n' +
'            <button onClick={() => setView("FORM")} className={"px-4 py-2 rounded-xl text-xs font-bold transition " + (view === "FORM" ? "bg-cyan-500 text-white" : "bg-slate-900 text-slate-400 border border-slate-800")}>+ Buat Inspeksi Baru</button>\n' +
'          </div>\n' +
'        </div>\n' +
'      </div>\n\n' +
'      {view === "LIST" && (\n' +
'        <div className="max-w-6xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">\n' +
'          <table className="w-full text-left text-xs text-slate-300 min-w-[650px]">\n' +
'            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">\n' +
'              <tr><th className="p-3">Tanggal</th><th className="p-3">No Lambung</th><th className="p-3">HM Awal / Akhir</th><th className="p-3">Operator</th><th className="p-3">Inspector</th><th className="p-3">Lokasi</th><th className="p-3">Status</th></tr>\n' +
'            </thead>\n' +
'            <tbody className="divide-y divide-slate-800/60">\n' +
'              {history.length === 0 ? (\n' +
'                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Belum ada riwayat P2H. Klik "+ Buat Inspeksi Baru" untuk mengisi form.</td></tr>\n' +
'              ) : history.map(h => (\n' +
'                <tr key={h.id} className="hover:bg-slate-800/40">\n' +
'                  <td className="p-3 font-mono">{new Date(h.created_at).toLocaleDateString("id-ID")}</td>\n' +
'                  <td className="p-3 font-black text-amber-400 font-mono text-sm">{h.no_unit}</td>\n' +
'                  <td className="p-3 text-cyan-300 font-mono font-bold">{h.hm_km} - {h.hm_akhir || "-"}</td>\n' +
'                  <td className="p-3 font-semibold">{h.operator || "-"}</td>\n' +
'                  <td className="p-3">{h.inspector_nama}</td>\n' +
'                  <td className="p-3"><span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-bold">{h.site}</span></td>\n' +
'                  <td className="p-3"><span className={"px-2.5 py-1 rounded text-[10px] font-black " + (h.status_kelayakan==="READY"?"bg-emerald-900/60 text-emerald-300 border border-emerald-800":"bg-amber-900/60 text-amber-300 border border-amber-800")}>{h.status_kelayakan}</span></td>\n' +
'                </tr>\n' +
'              ))}\n' +
'            </tbody>\n' +
'          </table>\n' +
'        </div>\n' +
'      )}\n\n' +
'      {view === "FORM" && (\n' +
'        <form onSubmit={submitForm} className="max-w-6xl mx-auto bg-white text-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-300">\n' +
'          <div className="border-2 border-sky-700 mb-6 rounded-lg overflow-hidden">\n' +
'            <div className="bg-sky-700 text-white font-black text-center py-2.5 text-sm tracking-widest uppercase">PT BOSTON TRIKORA MAHARDIKA - FORM INSPEKSI HARIAN EXCAVATOR & BREAKER</div>\n' +
'            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 text-xs divide-x divide-y divide-slate-300 bg-slate-50">\n' +
'              <div className="flex"><span className="p-2 bg-slate-200 font-bold w-24 border-r border-slate-300">Model Unit:</span><input value={form.model_unit} onChange={e=>setForm({...form, model_unit:e.target.value})} className="p-2 w-full outline-none font-semibold bg-white" /></div>\n' +
'              <div className="flex"><span className="p-2 bg-slate-200 font-bold w-16 border-r border-slate-300">Shift:</span><select value={form.shift} onChange={e=>setForm({...form, shift:e.target.value})} className="p-2 w-full outline-none bg-white font-semibold"><option>I</option><option>II</option></select></div>\n' +
'              <div className="flex"><span className="p-2 bg-slate-200 font-bold w-20 border-r border-slate-300">Tanggal:</span><input type="date" value={form.tanggal} onChange={e=>setForm({...form, tanggal:e.target.value})} className="p-2 w-full outline-none bg-white font-semibold" /></div>\n' +
'              <div className="flex"><span className="p-2 bg-slate-200 font-bold w-20 border-r border-slate-300">HM Awal:</span><input type="number" step="0.1" value={form.hm_awal} onChange={e=>setForm({...form, hm_awal:e.target.value})} placeholder="24374.6" className="p-2 w-full outline-none font-mono font-bold bg-white" /></div>\n' +
'              <div className="flex"><span className="p-2 bg-slate-200 font-bold w-24 border-r border-slate-300">No. Lambung:</span><input value={form.no_lambung} onChange={e=>setForm({...form, no_lambung:e.target.value})} placeholder="E205 B" required className="p-2 w-full outline-none font-black text-sky-800 bg-white" /></div>\n' +
'              <div className="flex"><span className="p-2 bg-slate-200 font-bold w-16 border-r border-slate-300">Lokasi:</span><input value={form.lokasi} onChange={e=>setForm({...form, lokasi:e.target.value})} placeholder="ALASKA" className="p-2 w-full outline-none bg-white font-semibold" /></div>\n' +
'              <div className="flex"><span className="p-2 bg-slate-200 font-bold w-20 border-r border-slate-300">Inspector:</span><input value={form.inspector_nama} onChange={e=>setForm({...form, inspector_nama:e.target.value})} className="p-2 w-full outline-none bg-white font-semibold" /></div>\n' +
'              <div className="flex"><span className="p-2 bg-slate-200 font-bold w-20 border-r border-slate-300">HM Akhir:</span><input type="number" step="0.1" value={form.hm_akhir} onChange={e=>setForm({...form, hm_akhir:e.target.value})} placeholder="24380.0" className="p-2 w-full outline-none font-mono font-bold bg-white" /></div>\n' +
'              <div className="flex md:col-span-2"><span className="p-2 bg-amber-100 font-bold w-32 border-r border-slate-300">Type Breaker:</span><select value={form.type_breaker} onChange={e=>setForm({...form, type_breaker:e.target.value})} className="p-2 w-full outline-none bg-white font-semibold"><option>[ ] EDT 2000</option><option>[✓] EDT 2200</option><option>[ ] SAYA</option></select></div>\n' +
'              <div className="flex md:col-span-2"><span className="p-2 bg-amber-100 font-bold w-32 border-r border-slate-300">Type Chisel:</span><select value={form.type_chisel} onChange={e=>setForm({...form, type_chisel:e.target.value})} className="p-2 w-full outline-none bg-white font-semibold"><option>[✓] Chisel Konde</option><option>[ ] Chisel Polos</option></select></div>\n' +
'              <div className="flex md:col-span-4"><span className="p-2 bg-slate-200 font-bold w-24 border-r border-slate-300">Operator:</span><input value={form.operator} onChange={e=>setForm({...form, operator:e.target.value})} placeholder="ASKAR" className="p-2 w-full outline-none bg-white font-bold text-slate-800" /></div>\n' +
'            </div>\n' +
'          </div>\n\n' +
'          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">\n' +
'            <div className="border border-sky-600 rounded-lg overflow-hidden">\n' +
'              <div className="bg-sky-600 text-white text-center font-bold text-xs py-1.5 uppercase tracking-wider">I. INSPEKSI GENERAL UNIT (PC 210-10 MO)</div>\n' +
'              <div className="grid grid-cols-12 bg-slate-100 border-b border-sky-600 text-[10px] font-bold text-center">\n' +
'                <div className="col-span-1 p-1 border-r border-slate-300">NO</div>\n' +
'                <div className="col-span-6 p-1 border-r border-slate-300">ITEM PEMERIKSAAN UNIT</div>\n' +
'                <div className="col-span-2 p-1 border-r border-slate-300 bg-emerald-100 text-emerald-800">OK</div>\n' +
'                <div className="col-span-1 p-1 border-r border-slate-300 bg-rose-100 text-rose-800">NOK</div>\n' +
'                <div className="col-span-2 p-1">KETERANGAN</div>\n' +
'              </div>\n' +
'              {Object.entries(structure.general).map(([catName, items]) => (\n' +
'                <React.Fragment key={catName}>\n' +
'                  <div className="bg-slate-200 text-[10px] font-black p-1 px-2 border-y border-slate-300 text-slate-800">{catName}</div>\n' +
'                  {items.map((it, idx) => (\n' +
'                    <div key={it.k} className="grid grid-cols-12 text-[10px] border-b border-slate-200 hover:bg-slate-50 items-stretch">\n' +
'                      <div className="col-span-1 p-1 border-r border-slate-200 text-center flex items-center justify-center font-bold text-slate-600">{idx + 1}</div>\n' +
'                      <div className="col-span-6 p-1 border-r border-slate-200 flex items-center font-medium text-slate-800">{it.l}</div>\n' +
'                      <div className="col-span-2 border-r border-slate-200 cursor-pointer bg-emerald-50 hover:bg-emerald-200 flex items-center justify-center text-emerald-700 font-black text-sm select-none" onClick={()=>setCL(it.k, true)}>{checklist[it.k]?.ok === true ? "✓" : ""}</div>\n' +
'                      <div className="col-span-1 border-r border-slate-200 cursor-pointer bg-rose-50 hover:bg-rose-200 flex items-center justify-center text-rose-700 font-black text-sm select-none" onClick={()=>setCL(it.k, false)}>{checklist[it.k]?.ok === false ? "✕" : ""}</div>\n' +
'                      <div className="col-span-2"><input type="text" className="w-full h-full p-1 text-[9px] outline-none bg-transparent" value={checklist[it.k]?.ket || ""} onChange={e=>setCLKet(it.k, e.target.value)} /></div>\n' +
'                    </div>\n' +
'                  ))}\n' +
'                </React.Fragment>\n' +
'              ))}\n' +
'            </div>\n\n' +
'            <div className="border border-sky-600 rounded-lg overflow-hidden">\n' +
'              <div className="bg-sky-600 text-white text-center font-bold text-xs py-1.5 uppercase tracking-wider">II. INSPEKSI ATTACHMENT BREAKER (KRITIS)</div>\n' +
'              <div className="grid grid-cols-12 bg-slate-100 border-b border-sky-600 text-[10px] font-bold text-center">\n' +
'                <div className="col-span-1 p-1 border-r border-slate-300">NO</div>\n' +
'                <div className="col-span-6 p-1 border-r border-slate-300">ITEM PEMERIKSAAN BREAKER</div>\n' +
'                <div className="col-span-2 p-1 border-r border-slate-300 bg-emerald-100 text-emerald-800">OK</div>\n' +
'                <div className="col-span-1 p-1 border-r border-slate-300 bg-rose-100 text-rose-800">NOK</div>\n' +
'                <div className="col-span-2 p-1">KETERANGAN</div>\n' +
'              </div>\n' +
'              {Object.entries(structure.breaker).map(([catName, items]) => (\n' +
'                <React.Fragment key={catName}>\n' +
'                  <div className="bg-orange-100 text-[10px] font-black p-1 px-2 border-y border-slate-300 text-orange-900">{catName}</div>\n' +
'                  {items.map((it, idx) => (\n' +
'                    <div key={it.k} className="grid grid-cols-12 text-[10px] border-b border-slate-200 hover:bg-slate-50 items-stretch">\n' +
'                      <div className="col-span-1 p-1 border-r border-slate-200 text-center flex items-center justify-center font-bold text-slate-600">{idx + 1}</div>\n' +
'                      <div className="col-span-6 p-1 border-r border-slate-200 flex items-center font-medium text-slate-800">{it.l}</div>\n' +
'                      <div className="col-span-2 border-r border-slate-200 cursor-pointer bg-emerald-50 hover:bg-emerald-200 flex items-center justify-center text-emerald-700 font-black text-sm select-none" onClick={()=>setCL(it.k, true)}>{checklist[it.k]?.ok === true ? "✓" : ""}</div>\n' +
'                      <div className="col-span-1 border-r border-slate-200 cursor-pointer bg-rose-50 hover:bg-rose-200 flex items-center justify-center text-rose-700 font-black text-sm select-none" onClick={()=>setCL(it.k, false)}>{checklist[it.k]?.ok === false ? "✕" : ""}</div>\n' +
'                      <div className="col-span-2"><input type="text" className="w-full h-full p-1 text-[9px] outline-none bg-transparent" value={checklist[it.k]?.ket || ""} onChange={e=>setCLKet(it.k, e.target.value)} /></div>\n' +
'                    </div>\n' +
'                  ))}\n' +
'                </React.Fragment>\n' +
'              ))}\n' +
'            </div>\n' +
'          </div>\n\n' +
'          <div className="border border-slate-400 rounded-lg overflow-hidden mb-6">\n' +
'            <div className="bg-slate-200 text-slate-800 font-bold text-xs py-1.5 px-3 border-b border-slate-400 uppercase">III. CATATAN TEMUAN / KERUSAKAN & TINDAKAN PERBAIKAN</div>\n' +
'            <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-400 text-[10px] font-bold text-center">\n' +
'              <div className="col-span-1 p-1 border-r border-slate-300">NO</div>\n' +
'              <div className="col-span-5 p-1 border-r border-slate-300">DESKRIPSI TEMUAN MASALAH</div>\n' +
'              <div className="col-span-4 p-1 border-r border-slate-300">REKOMENDASI TINDAKAN</div>\n' +
'              <div className="col-span-1 p-1 border-r border-slate-300">PRIORITAS</div>\n' +
'              <div className="col-span-1 p-1">STATUS</div>\n' +
'            </div>\n' +
'            {temuanList.map((t, i) => (\n' +
'              <div key={i} className="grid grid-cols-12 text-[11px] border-b border-slate-200 items-stretch">\n' +
'                <div className="col-span-1 p-1 border-r border-slate-200 text-center flex items-center justify-center font-bold text-slate-500">{i+1}</div>\n' +
'                <div className="col-span-5 border-r border-slate-200"><input className="w-full h-full p-1.5 outline-none font-semibold text-rose-700 placeholder:font-normal placeholder:text-slate-300" placeholder="Contoh: Chisel tumpul / 115 cm" value={t.deskripsi} onChange={e=>{const n=[...temuanList]; n[i].deskripsi=e.target.value; setTemuanList(n);}} /></div>\n' +
'                <div className="col-span-4 border-r border-slate-200"><input className="w-full h-full p-1.5 outline-none font-semibold text-sky-700 placeholder:font-normal placeholder:text-slate-300" placeholder="Contoh: Replace (Nett Servis)" value={t.rekomendasi} onChange={e=>{const n=[...temuanList]; n[i].rekomendasi=e.target.value; setTemuanList(n);}} /></div>\n' +
'                <div className="col-span-1 border-r border-slate-200"><input className="w-full h-full p-1.5 outline-none text-center font-bold" value={t.prioritas} onChange={e=>{const n=[...temuanList]; n[i].prioritas=e.target.value; setTemuanList(n);}} /></div>\n' +
'                <div className="col-span-1"><input className="w-full h-full p-1.5 outline-none text-center font-bold text-amber-600" placeholder="progres" value={t.status} onChange={e=>{const n=[...temuanList]; n[i].status=e.target.value; setTemuanList(n);}} /></div>\n' +
'              </div>\n' +
'            ))}\n' +
'            <div className="p-1.5 bg-slate-50"><button type="button" onClick={()=>setTemuanList([...temuanList, {deskripsi:"",rekomendasi:"",prioritas:"",status:""}])} className="text-[10px] text-sky-700 font-black px-2 hover:underline">+ Tambah Baris Temuan</button></div>\n' +
'          </div>\n\n' +
'          <div className="flex items-center justify-between border-t border-slate-200 pt-4">\n' +
'            {msg && <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg">{msg}</span>}\n' +
'            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-black transition ml-auto flex items-center gap-2 shadow-lg disabled:opacity-50">\n' +
'              {loading ? "Menyimpan Laporan..." : "Simpan & Submit Form P2H"}\n' +
'            </button>\n' +
'          </div>\n' +
'        </form>\n' +
'      )}\n' +
'    </div>\n' +
'  );\n' +
'}\n';

fs.writeFileSync(path.join(dirUI, 'page.tsx'), uiCode, 'utf8');
console.log("✓ Halaman UI Form Inspeksi Digital BERHASIL DIBUAT!");
