const fs = require('fs');

const code = `"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface Employee {
  nrp: string;
  nama: string;
  jabatan?: string;
  departemen?: string;
  site?: string;
  unit?: string;
  status?: string;
  foto_url?: string;
}

interface SiteGroup {
  site: string;
  mechanics: Employee[];
}

interface PRItem {
  id: string;
  nama_barang: string;
  part_number: string;
  qty: number;
  satuan: string;
  status: string;
  prioritas: string;
  created_at: string;
  created_by: string;
  site: string;
  vendor?: string;
  harga_satuan?: number;
}

interface StockItem {
  id: string;
  part_number: string;
  nama_barang: string;
  qty: number;
  satuan: string;
  lokasi: string;
  min_stock: number;
}

export default function PlantDashboardPage() {
  const [activeSubTab, setActiveSubTab] = useState("kru");

  // === KRU STATES ===
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [siteGroups, setSiteGroups] = useState<SiteGroup[]>([]);
  const [selectedSite, setSelectedSite] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // === PARTBOOK STATES ===
  const [pbLoading, setPbLoading] = useState(false);
  const [pbTab, setPbTab] = useState("import");
  const [csvText, setCsvText] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [approvedPRs, setApprovedPRs] = useState<PRItem[]>([]);
  const [poVendor, setPoVendor] = useState("");
  const [poHarga, setPoHarga] = useState("");
  const [poSelectedPR, setPoSelectedPR] = useState("");
  const [poMsg, setPoMsg] = useState("");
  const [stockList, setStockList] = useState<StockItem[]>([]);

  useEffect(function() { fetchPlantData(); }, []);
  useEffect(function() {
    if (activeSubTab === "partbook") {
      fetchApprovedPRs();
      fetchStockList();
    }
  }, [activeSubTab]);

  const fetchPlantData = async function() {
    setLoading(true);
    try {
      const res = await fetch("/api/employees?departemen=plant");
      const json = await res.json();
      if (json.success && json.data) {
        const filtered = json.data.filter(function(e: Employee) {
          const d = (e.departemen || "").toLowerCase();
          const isLog = d.includes("logistik") || d.includes("warehouse") || d.includes("gudang");
          return (d.includes("plant") || d.includes("mekanik") || d.includes("mechanic") || d.includes("workshop") || d.includes("crew")) && !isLog;
        });
        setEmployees(filtered);
        const groups: Record<string, Employee[]> = {};
        filtered.forEach(function(e: Employee) {
          const s = e.site || "MLP";
          if (!groups[s]) groups[s] = [];
          groups[s].push(e);
        });
        setSiteGroups(Object.keys(groups).map(function(k) { return { site: k, mechanics: groups[k] }; }));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchApprovedPRs = async function() {
    try {
      const res = await fetch("/api/plant/logistik/pr?status=APPROVED");
      const json = await res.json();
      setApprovedPRs(json.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchStockList = async function() {
    try {
      const res = await fetch("/api/plant/logistik/stok");
      const json = await res.json();
      setStockList(json.data || []);
    } catch (err) { console.error(err); }
  };

  const filteredEmployees = employees.filter(function(e) {
    const ms = selectedSite === "ALL" || (e.site || "MLP") === selectedSite;
    const mq = !searchQuery || (e.nama || "").toLowerCase().includes(searchQuery.toLowerCase()) || (e.nrp || "").includes(searchQuery) || (e.unit || "").toLowerCase().includes(searchQuery.toLowerCase());
    return ms && mq;
  });
  const uniqueSites = Array.from(new Set(employees.map(function(e) { return e.site || "MLP"; })));

  // === PARTBOOK FUNCTIONS ===
  const handleImportCSV = async function() {
    if (!csvText.trim()) { setImportMsg("Tempel data CSV dulu!"); return; }
    setPbLoading(true);
    setImportMsg("");
    try {
      const lines = csvText.trim().split("\\n");
      const items = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        if (cols.length >= 3) {
          items.push({
            part_number: cols[0].trim(),
            nama_barang: cols[1].trim(),
            satuan: cols[2].trim() || "PCS",
            qty: parseInt(cols[3]) || 0,
            min_stock: parseInt(cols[4]) || 5,
            lokasi: cols[5] ? cols[5].trim() : "GUDANG-UTAMA"
          });
        }
      }
      let success = 0;
      for (const item of items) {
        const res = await fetch("/api/plant/logistik/stok", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item)
        });
        if (res.ok) success++;
      }
      setImportMsg("Berhasil import " + success + " dari " + items.length + " item.");
      setCsvText("");
      fetchStockList();
    } catch (err) { setImportMsg("Gagal: " + String(err)); }
    finally { setPbLoading(false); }
  };

  const handleCreatePO = async function() {
    if (!poSelectedPR || !poVendor || !poHarga) { setPoMsg("Lengkapi semua field!"); return; }
    setPbLoading(true);
    setPoMsg("");
    try {
      const res = await fetch("/api/plant/logistik/pr/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pr_id: poSelectedPR,
          action: "CREATE_PO",
          vendor: poVendor,
          harga_satuan: parseFloat(poHarga)
        })
      });
      const json = await res.json();
      setPoMsg(json.message || json.error || "PO berhasil dibuat!");
      setPoSelectedPR("");
      setPoVendor("");
      setPoHarga("");
      fetchApprovedPRs();
    } catch (err) { setPoMsg("Gagal: " + String(err)); }
    finally { setPbLoading(false); }
  };

  const subTabs = [
    { key: "kru", label: "Kru Mekanik", icon: "👷" },
    { key: "unit", label: "Kelola Unit", icon: "🚜" },
    { key: "partbook", label: "Admin Partbook", icon: "📖" }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 pb-28">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold mb-2">
          <Link href="/dashboard" className="text-amber-500 hover:underline flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            Menu Utama
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-slate-300 font-bold">Plant & Workshop</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2.5 tracking-tight">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 01-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              Kru & Workshop Plant
            </h1>
            <p className="text-xs text-slate-400 mt-1">PT. Boston PPA - MLP | Kelola kru, unit, dan administrasi partbook.</p>
          </div>
          <button onClick={fetchPlantData} disabled={loading} className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition">
            <svg className={"w-3.5 h-3.5 " + (loading ? "animate-spin" : "")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Sub-Tab Buttons */}
      <div className="max-w-7xl mx-auto mb-6 flex gap-2 overflow-x-auto pb-2">
        {subTabs.map(function(t) {
          return (
            <button key={t.key} onClick={function() { setActiveSubTab(t.key); }}
              className={"px-4 py-2.5 rounded-xl text-xs font-black tracking-wide border-2 transition-all whitespace-nowrap flex items-center gap-1.5 " + (activeSubTab === t.key ? "bg-cyan-500 text-white border-cyan-500 shadow-lg shadow-cyan-500/20" : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600")}>
              <span>{t.icon}</span> {t.label}
            </button>
          );
        })}
      </div>

      {/* ==================== TAB: KRU MEKANIK ==================== */}
      {activeSubTab === "kru" && (
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Katalog Mekanik & Crew Plant
              </h2>
              <p className="text-xs text-slate-400">Total {employees.length} personel terdaftar.</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="text" placeholder="Cari nama, NRP, unit..." value={searchQuery}
                onChange={function(e) { setSearchQuery(e.target.value); }}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none w-52" />
              <select value={selectedSite} onChange={function(e) { setSelectedSite(e.target.value); }}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-semibold focus:border-cyan-500 focus:outline-none">
                <option value="ALL">Semua Site</option>
                {uniqueSites.map(function(s) { return <option key={s} value={s}>Site {s}</option>; })}
              </select>
            </div>
          </div>
          {siteGroups.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
              <button onClick={function() { setSelectedSite("ALL"); }}
                className={"p-3 rounded-xl border text-center transition " + (selectedSite === "ALL" ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300" : "bg-slate-900 border-slate-800 text-slate-400")}>
                <div className="text-xl font-black">{employees.length}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider">Total</div>
              </button>
              {siteGroups.map(function(g) {
                return (
                  <button key={g.site} onClick={function() { setSelectedSite(g.site); }}
                    className={"p-3 rounded-xl border text-center transition " + (selectedSite === g.site ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300" : "bg-slate-900 border-slate-800 text-slate-400")}>
                    <div className="text-xl font-black">{g.mechanics.length}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider">Site {g.site}</div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs text-slate-300 min-w-[600px]">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                <tr><th className="p-3">NRP</th><th className="p-3">Nama</th><th className="p-3">Jabatan</th><th className="p-3">Unit</th><th className="p-3">Site</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">Memuat data...</td></tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">Tidak ada data.</td></tr>
                ) : filteredEmployees.map(function(emp) {
                  return (
                    <tr key={emp.nrp} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-amber-400">{emp.nrp}</td>
                      <td className="p-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-black shrink-0">{(emp.nama || "U").charAt(0).toUpperCase()}</div><span className="font-semibold text-slate-200">{emp.nama}</span></div></td>
                      <td className="p-3 text-slate-400">{emp.jabatan || "Mekanik"}</td>
                      <td className="p-3 font-mono text-cyan-300 font-semibold">{emp.unit || "-"}</td>
                      <td className="p-3"><span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold">{emp.site || "MLP"}</span></td>
                      <td className="p-3"><span className={"px-2 py-0.5 rounded text-[10px] font-bold " + ((emp.status || "aktif").toLowerCase() === "aktif" ? "bg-emerald-900/60 text-emerald-300 border border-emerald-800" : "bg-slate-800 text-slate-400")}>{(emp.status || "Aktif").toUpperCase()}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB: KELOLA UNIT ==================== */}
      {activeSubTab === "unit" && (
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
            <span className="text-2xl">🚜</span> Kelola Unit & Alat Berat
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/dashboard/kelola-unit" className="group bg-gradient-to-br from-cyan-500/10 to-slate-900 border border-cyan-500/30 hover:border-cyan-400/60 rounded-2xl p-6 transition-all shadow-lg hover:-translate-y-0.5">
              <div className="p-3 bg-cyan-500/20 rounded-xl text-cyan-400 w-fit mb-3">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              </div>
              <h3 className="text-base font-black text-cyan-300">Master Unit & Alat Berat</h3>
              <p className="text-xs text-slate-400 mt-1">Registrasi unit baru, assignment mekanik, dan monitoring status operasional.</p>
              <span className="inline-block mt-3 text-xs font-bold text-cyan-400 group-hover:underline">Buka Kelola Unit →</span>
            </Link>
            <Link href="/dashboard/setting-unit" className="group bg-gradient-to-br from-violet-500/10 to-slate-900 border border-violet-500/30 hover:border-violet-400/60 rounded-2xl p-6 transition-all shadow-lg hover:-translate-y-0.5">
              <div className="p-3 bg-violet-500/20 rounded-xl text-violet-400 w-fit mb-3">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
              </div>
              <h3 className="text-base font-black text-violet-300">Setting Unit per Shift</h3>
              <p className="text-xs text-slate-400 mt-1">Atur penugasan unit berdasarkan shift operasional harian.</p>
              <span className="inline-block mt-3 text-xs font-bold text-violet-400 group-hover:underline">Buka Setting →</span>
            </Link>
            <Link href="/dashboard/plant/logistik" className="group bg-gradient-to-br from-amber-500/10 to-slate-900 border border-amber-500/30 hover:border-amber-400/60 rounded-2xl p-6 transition-all shadow-lg hover:-translate-y-0.5">
              <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400 w-fit mb-3">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
              <h3 className="text-base font-black text-amber-300">Logistik & Gudang</h3>
              <p className="text-xs text-slate-400 mt-1">Akses cepat ke modul logistik: PR, stok, pengeluaran, barang masuk.</p>
              <span className="inline-block mt-3 text-xs font-bold text-amber-400 group-hover:underline">Buka Logistik →</span>
            </Link>
          </div>
        </div>
      )}

      {/* ==================== TAB: ADMIN PARTBOOK ==================== */}
      {activeSubTab === "partbook" && (
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
            <span className="text-2xl">📖</span> Admin Partbook
          </h2>

          {/* Partbook Sub-Tabs */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
            {[{k:"import",l:"Import Partbook"},{k:"po",l:"Kelola Pemesanan (PO)"},{k:"stok",l:"Daftar Stok Part"}].map(function(t) {
              return (
                <button key={t.k} onClick={function() { setPbTab(t.k); }}
                  className={"px-3 py-1.5 rounded-lg text-[11px] font-bold border transition whitespace-nowrap " + (pbTab === t.k ? "bg-amber-500 text-white border-amber-500" : "bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500")}>
                  {t.l}
                </button>
              );
            })}
          </div>

          {/* --- Import Partbook --- */}
          {pbTab === "import" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-amber-300 mb-2">Import Data Partbook (CSV)</h3>
              <p className="text-[11px] text-slate-400 mb-3">Format CSV: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">part_number, nama_barang, satuan, qty, min_stock, lokasi</code></p>
              <p className="text-[11px] text-slate-500 mb-3">Baris pertama adalah header (akan di-skip). Contoh:</p>
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-300 mb-4 overflow-x-auto">{"part_number,nama_barang,satuan,qty,min_stock,lokasi\\nPN-001,Filter Oli,PCS,50,10,GUDANG-UTAMA\\nPN-002,V-Belt Fan,PCS,20,5,GUDANG-UTAMA"}</pre>
              <textarea value={csvText} onChange={function(e) { setCsvText(e.target.value); }}
                placeholder="Tempel data CSV di sini..."
                className="w-full h-40 bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono focus:border-amber-500 focus:outline-none resize-none mb-3" />
              <div className="flex items-center gap-3">
                <button onClick={handleImportCSV} disabled={pbLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition disabled:opacity-50">
                  {pbLoading ? "Memproses..." : "Import Data"}
                </button>
                {importMsg && <span className={"text-xs font-semibold " + (importMsg.includes("Berhasil") ? "text-emerald-400" : "text-rose-400")}>{importMsg}</span>}
              </div>
            </div>
          )}

          {/* --- Kelola Pemesanan PO --- */}
          {pbTab === "po" && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-amber-300 mb-3">Buat Purchase Order (PO) dari PR yang Sudah Approved</h3>
                <p className="text-[11px] text-slate-400 mb-4">Pilih PR yang sudah di-approve, lalu tentukan vendor dan harga pembelian.</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <select value={poSelectedPR} onChange={function(e) { setPoSelectedPR(e.target.value); }}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none">
                    <option value="">-- Pilih PR --</option>
                    {approvedPRs.map(function(pr) {
                      return <option key={pr.id} value={pr.id}>{pr.part_number} - {pr.nama_barang} (Qty: {pr.qty})</option>;
                    })}
                  </select>
                  <input type="text" placeholder="Nama Vendor" value={poVendor}
                    onChange={function(e) { setPoVendor(e.target.value); }}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none" />
                  <input type="number" placeholder="Harga Satuan (Rp)" value={poHarga}
                    onChange={function(e) { setPoHarga(e.target.value); }}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none" />
                  <button onClick={handleCreatePO} disabled={pbLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50">
                    {pbLoading ? "Memproses..." : "Buat PO"}
                  </button>
                </div>
                {poMsg && <p className={"text-xs font-semibold " + (poMsg.includes("berhasil") ? "text-emerald-400" : "text-rose-400")}>{poMsg}</p>}
              </div>

              {/* List PR Approved */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
                <div className="p-4 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-slate-200">Daftar PR Menunggu PO ({approvedPRs.length})</h3>
                </div>
                <table className="w-full text-left text-xs text-slate-300 min-w-[600px]">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                    <tr><th className="p-3">Part Number</th><th className="p-3">Nama Barang</th><th className="p-3">Qty</th><th className="p-3">Prioritas</th><th className="p-3">Site</th><th className="p-3">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {approvedPRs.length === 0 ? (
                      <tr><td colSpan={6} className="p-6 text-center text-slate-500">Tidak ada PR yang menunggu PO.</td></tr>
                    ) : approvedPRs.map(function(pr) {
                      return (
                        <tr key={pr.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono font-bold text-amber-400">{pr.part_number}</td>
                          <td className="p-3 font-semibold text-slate-200">{pr.nama_barang}</td>
                          <td className="p-3">{pr.qty} {pr.satuan}</td>
                          <td className="p-3"><span className={"px-2 py-0.5 rounded text-[10px] font-bold " + (pr.prioritas === "EMERGENCY" ? "bg-rose-900/60 text-rose-300" : pr.prioritas === "URGENT" ? "bg-amber-900/60 text-amber-300" : "bg-slate-800 text-slate-300")}>{pr.prioritas}</span></td>
                          <td className="p-3">{pr.site}</td>
                          <td className="p-3"><span className="px-2 py-0.5 bg-emerald-900/60 text-emerald-300 rounded text-[10px] font-bold">{pr.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- Daftar Stok Part --- */}
          {pbTab === "stok" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200">Daftar Stok Partbook ({stockList.length} item)</h3>
                <button onClick={fetchStockList} className="text-xs text-amber-400 hover:underline font-semibold">Refresh</button>
              </div>
              <table className="w-full text-left text-xs text-slate-300 min-w-[600px]">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                  <tr><th className="p-3">Part Number</th><th className="p-3">Nama Barang</th><th className="p-3">Qty</th><th className="p-3">Satuan</th><th className="p-3">Min Stock</th><th className="p-3">Lokasi</th><th className="p-3">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stockList.length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-slate-500">Belum ada data stok. Import partbook terlebih dahulu.</td></tr>
                  ) : stockList.map(function(s) {
                    const isLow = s.qty <= s.min_stock;
                    return (
                      <tr key={s.id} className={"hover:bg-slate-800/40 " + (isLow ? "bg-rose-950/20" : "")}>
                        <td className="p-3 font-mono font-bold text-amber-400">{s.part_number}</td>
                        <td className="p-3 font-semibold text-slate-200">{s.nama_barang}</td>
                        <td className="p-3 font-bold">{s.qty}</td>
                        <td className="p-3 text-slate-400">{s.satuan}</td>
                        <td className="p-3 text-slate-400">{s.min_stock}</td>
                        <td className="p-3"><span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-bold">{s.lokasi}</span></td>
                        <td className="p-3"><span className={"px-2 py-0.5 rounded text-[10px] font-bold " + (isLow ? "bg-rose-900/60 text-rose-300 border border-rose-800" : "bg-emerald-900/60 text-emerald-300")}>{isLow ? "MIN STOCK!" : "AMAN"}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('./app/dashboard/plant/page.tsx', code, 'utf8');
console.log("OK - app/dashboard/plant/page.tsx berhasil ditulis ulang dengan 3 sub-tab!");
