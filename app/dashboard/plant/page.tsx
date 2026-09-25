"use client";

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

export default function PlantDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [siteGroups, setSiteGroups] = useState<SiteGroup[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPlantData();
  }, []);

  const fetchPlantData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employees?departemen=plant");
      const json = await res.json();
      if (json.success && json.data) {
        const plantEmployees = json.data.filter(function(e: Employee) {
          const dept = (e.departemen || "").toLowerCase();
          return dept.includes("plant") || dept.includes("mekanik") || dept.includes("mechanic") || dept.includes("workshop") || dept.includes("logistik");
        });
        setEmployees(plantEmployees);

        const groups: Record<string, Employee[]> = {};
        plantEmployees.forEach(function(e: Employee) {
          const site = e.site || "MLP";
          if (!groups[site]) groups[site] = [];
          groups[site].push(e);
        });

        const siteList = Object.keys(groups).map(function(key) {
          return { site: key, mechanics: groups[key] };
        });
        setSiteGroups(siteList);
      }
    } catch (err) {
      console.error("Error fetching plant data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(function(e) {
    const matchSite = selectedSite === "ALL" || (e.site || "MLP") === selectedSite;
    const matchSearch = !searchQuery || (e.nama || "").toLowerCase().includes(searchQuery.toLowerCase()) || (e.nrp || "").includes(searchQuery) || (e.unit || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchSite && matchSearch;
  });

  const uniqueSites = Array.from(new Set(employees.map(function(e) { return e.site || "MLP"; })));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 pb-28">
      {/* Header & Breadcrumb */}
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
              Plant & Workshop Management
            </h1>
            <p className="text-xs text-slate-400 mt-1">PT. Boston PPA - MLP | Kelola unit, mekanik, dan logistik site operasional.</p>
          </div>
          <button onClick={fetchPlantData} disabled={loading} className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition">
            <svg className={"w-3.5 h-3.5 " + (loading ? "animate-spin" : "")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Card: Logistik & Gudang Site */}
        <Link href="/dashboard/plant/logistik" className="group bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-slate-900 border border-amber-500/30 hover:border-amber-400/60 rounded-2xl p-5 transition-all shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400 group-hover:bg-amber-500/30 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <svg className="w-5 h-5 text-amber-500/40 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </div>
          <h3 className="text-base font-black text-amber-300 group-hover:text-amber-200 transition">Logistik & Gudang Site</h3>
          <p className="text-xs text-slate-400 mt-1">Permintaan barang, stok gudang, pengeluaran, barang masuk, dan monitoring approval PR.</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[10px] font-bold">5 Modul</span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">Aktif</span>
          </div>
        </Link>

        {/* Card: Kelola Unit */}
        <Link href="/dashboard/kelola-unit" className="group bg-gradient-to-br from-cyan-500/10 via-cyan-600/5 to-slate-900 border border-cyan-500/30 hover:border-cyan-400/60 rounded-2xl p-5 transition-all shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-0.5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-cyan-500/20 rounded-xl text-cyan-400 group-hover:bg-cyan-500/30 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            </div>
            <svg className="w-5 h-5 text-cyan-500/40 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </div>
          <h3 className="text-base font-black text-cyan-300 group-hover:text-cyan-200 transition">Kelola Unit & Alat Berat</h3>
          <p className="text-xs text-slate-400 mt-1">Registrasi unit, assignment mekanik, dan monitoring status operasional alat berat.</p>
        </Link>

        {/* Card: Parts Catalog */}
        <Link href="/parts-catalog" className="group bg-gradient-to-br from-violet-500/10 via-violet-600/5 to-slate-900 border border-violet-500/30 hover:border-violet-400/60 rounded-2xl p-5 transition-all shadow-lg hover:shadow-violet-500/10 hover:-translate-y-0.5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-violet-500/20 rounded-xl text-violet-400 group-hover:bg-violet-500/30 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <svg className="w-5 h-5 text-violet-500/40 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </div>
          <h3 className="text-base font-black text-violet-300 group-hover:text-violet-200 transition">Katalog Sparepart</h3>
          <p className="text-xs text-slate-400 mt-1">Master part number, spesifikasi, dan pemesanan langsung dari katalog sparepart.</p>
        </Link>
      </div>

      {/* Katalog Mekanik & Crew Plant */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Katalog Mekanik & Crew Plant
            </h2>
            <p className="text-xs text-slate-400">Total {employees.length} personel terdaftar di departemen Plant & Workshop.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cari nama, NRP, atau unit..."
              value={searchQuery}
              onChange={function(e) { setSearchQuery(e.target.value); }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none w-52"
            />
            <select
              value={selectedSite}
              onChange={function(e) { setSelectedSite(e.target.value); }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-semibold focus:border-cyan-500 focus:outline-none"
            >
              <option value="ALL">Semua Site</option>
              {uniqueSites.map(function(s) {
                return <option key={s} value={s}>Site {s}</option>;
              })}
            </select>
          </div>
        </div>

        {/* Site Summary Cards */}
        {siteGroups.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
            <button
              onClick={function() { setSelectedSite("ALL"); }}
              className={"p-3 rounded-xl border text-center transition " + (selectedSite === "ALL" ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700")}
            >
              <div className="text-xl font-black">{employees.length}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider">Total Crew</div>
            </button>
            {siteGroups.map(function(g) {
              return (
                <button
                  key={g.site}
                  onClick={function() { setSelectedSite(g.site); }}
                  className={"p-3 rounded-xl border text-center transition " + (selectedSite === g.site ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700")}
                >
                  <div className="text-xl font-black">{g.mechanics.length}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider">Site {g.site}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Mechanic Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
          <table className="w-full text-left text-xs text-slate-300 min-w-[600px]">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-3">NRP</th>
                <th className="p-3">Nama Mekanik / Crew</th>
                <th className="p-3">Jabatan</th>
                <th className="p-3">Unit Assignment</th>
                <th className="p-3">Site</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Memuat data crew plant...</td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Tidak ada data mekanik yang sesuai filter.</td></tr>
              ) : (
                filteredEmployees.map(function(emp) {
                  return (
                    <tr key={emp.nrp} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-amber-400">{emp.nrp}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-black shrink-0">
                            {(emp.nama || "U").charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-200">{emp.nama}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-400">{emp.jabatan || "Mekanik"}</td>
                      <td className="p-3 font-mono text-cyan-300 font-semibold">{emp.unit || "-"}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold">{emp.site || "MLP"}</span>
                      </td>
                      <td className="p-3">
                        <span className={"px-2 py-0.5 rounded text-[10px] font-bold " + ((emp.status || "aktif").toLowerCase() === "aktif" ? "bg-emerald-900/60 text-emerald-300 border border-emerald-800" : "bg-slate-800 text-slate-400")}>
                          {(emp.status || "Aktif").toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
