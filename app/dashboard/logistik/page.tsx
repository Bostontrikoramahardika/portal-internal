"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function LogistikDashboardPage() {
  const [activeTab, setActiveTab] = useState<
    "pr" | "po" | "grn" | "stock" | "parts" | "opname" | "import" | "masters"
  >("pr");

  const [loading, setLoading] = useState(false);
  const [prList, setPrList] = useState<any[]>([]);
  const [poList, setPoList] = useState<any[]>([]);
  const [grnList, setGrnList] = useState<any[]>([]);
  const [stockList, setStockList] = useState<any[]>([]);
  const [partsList, setPartsList] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [opnameHistory, setOpnameHistory] = useState<any[]>([]);

  // Filter States
  const [selectedWarehouse, setSelectedWarehouse] = useState("ALL");
  const [searchPart, setSearchPart] = useState("");
  const [actionMsg, setActionMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Stock Opname Form State
  const [opnameForm, setOpnameForm] = useState({
    warehouse_code: "WH-MLP",
    part_number: "",
    qty_fisik: "",
    rak_lokasi: "",
    keterangan: "Stock Opname Berkala",
  });
  const [opnameCurrentStock, setOpnameCurrentStock] = useState<number | null>(null);
  const [submittingOpname, setSubmittingOpname] = useState(false);

  // Print Document Modal State (Task #5)
  const [printModal, setPrintModal] = useState<{
    open: boolean;
    type: "DO" | "PO" | "BAST";
    data: any;
  }>({ open: false, type: "DO", data: null });

  // Fetch Master Data
  const fetchMasters = async () => {
    try {
      const [whRes, venRes] = await Promise.all([
        fetch("/api/logistik/warehouses"),
        fetch("/api/logistik/vendors"),
      ]);
      const whData = await whRes.json();
      const venData = await venRes.json();
      if (whData.warehouses) setWarehouses(whData.warehouses);
      if (venData.vendors) setVendors(venData.vendors);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Tab Specific Data
  const fetchData = async () => {
    setLoading(true);
    setActionMsg(null);
    try {
      if (activeTab === "pr") {
        const res = await fetch("/api/logistik/pr/list");
        const d = await res.json();
        setPrList(d.pr_list || []);
      } else if (activeTab === "po") {
        const res = await fetch("/api/logistik/po/list");
        const d = await res.json();
        setPoList(d.po_list || []);
      } else if (activeTab === "grn") {
        const res = await fetch("/api/logistik/grn/list");
        const d = await res.json();
        setGrnList(d.grn_list || []);
      } else if (activeTab === "stock") {
        const res = await fetch("/api/logistik/stock?warehouse_code=" + selectedWarehouse + "&search=" + encodeURIComponent(searchPart));
        const d = await res.json();
        setStockList(d.stock || []);
      } else if (activeTab === "parts") {
        const res = await fetch("/api/logistik/master-part?search=" + encodeURIComponent(searchPart));
        const d = await res.json();
        setPartsList(d.parts || []);
      } else if (activeTab === "opname") {
        const res = await fetch("/api/logistik/stock-opname?warehouse_code=" + selectedWarehouse);
        const d = await res.json();
        setOpnameHistory(d.history || []);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedWarehouse]);

  // Handle PR Action (Approval / Issue)
  const handlePrAction = async (prId: number, action: string, extraData?: any) => {
    try {
      const res = await fetch("/api/logistik/pr/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pr_id: prId, action, ...extraData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Aksi gagal");
      setActionMsg({ text: data.message || "Aksi berhasil diproses!", type: "success" });
      fetchData();
    } catch (e: any) {
      setActionMsg({ text: e.message, type: "error" });
    }
  };

  // Cek realtime stok sistem saat input part_number di form Opname
  const handleOpnamePartChange = async (pNum: string) => {
    setOpnameForm((prev) => ({ ...prev, part_number: pNum }));
    if (!pNum || pNum.trim().length < 3) {
      setOpnameCurrentStock(null);
      return;
    }
    try {
      const res = await fetch("/api/logistik/stock?warehouse_code=" + opnameForm.warehouse_code + "&search=" + encodeURIComponent(pNum.trim()));
      const d = await res.json();
      const match = (d.stock || []).find((s: any) => s.part_number.toLowerCase() === pNum.trim().toLowerCase());
      if (match) {
        setOpnameCurrentStock(match.qty_tersedia);
        if (match.rak_lokasi && !opnameForm.rak_lokasi) {
          setOpnameForm((prev) => ({ ...prev, rak_lokasi: match.rak_lokasi }));
        }
      } else {
        setOpnameCurrentStock(0);
      }
    } catch (err) {
      setOpnameCurrentStock(null);
    }
  };

  // Submit Stock Opname
  const handleOpnameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opnameForm.part_number || opnameForm.qty_fisik === "") return;
    setSubmittingOpname(true);
    setActionMsg(null);
    try {
      const res = await fetch("/api/logistik/stock-opname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opnameForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal penyesuaian stok");

      setActionMsg({
        text: "Penyesuaian Berhasil! No: " + data.so_number + " (Selisih: " + (data.selisih > 0 ? "+" : "") + data.selisih + ")",
        type: "success",
      });

      setOpnameForm({
        warehouse_code: opnameForm.warehouse_code,
        part_number: "",
        qty_fisik: "",
        rak_lokasi: "",
        keterangan: "Stock Opname Berkala",
      });
      setOpnameCurrentStock(null);
      fetchData();
    } catch (err: any) {
      setActionMsg({ text: err.message, type: "error" });
    } finally {
      setSubmittingOpname(false);
    }
  };

  const selisihOpname =
    opnameCurrentStock !== null && opnameForm.qty_fisik !== ""
      ? parseInt(opnameForm.qty_fisik || "0", 10) - opnameCurrentStock
      : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-28">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-900 border border-slate-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
              Logistics & Procurement System
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Modul terpadu Pengadaan, Inventori Multi-Gudang & Kontrol Suku Cadang Plant
          </p>
        </div>

        {/* Quick Link ke Parts Catalog */}
        <Link
          href="/parts-catalog"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-xs hover:bg-amber-500/20 transition-all shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Buka Parts Catalog Unit
        </Link>
      </div>

      {/* Alert Banner */}
      {actionMsg && (
        <div
          className={"max-w-7xl mx-auto mb-4 p-4 rounded-xl border flex items-center justify-between " +
            (actionMsg.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/30 text-rose-300")}
        >
          <span className="text-xs md:text-sm font-medium">{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="text-slate-400 hover:text-white text-sm">
            ?
          </button>
        </div>
      )}

      {/* Navigation 8 Tabs */}
      <div className="max-w-7xl mx-auto mb-6 flex gap-1.5 overflow-x-auto border-b border-slate-800 pb-2">
        {[
          { id: "pr", label: "Permintaan (PR)" },
          { id: "po", label: "Purchase Order (PO)" },
          { id: "grn", label: "Penerimaan (GRN)" },
          { id: "stock", label: "Stok Gudang" },
          { id: "opname", label: "Stock Opname" },
          { id: "parts", label: "Master Part" },
          { id: "import", label: "Import Accurate" },
          { id: "masters", label: "Gudang & Vendor" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={"px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all " +
              (activeTab === t.id
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PERMINTAAN PART (PR) */}
      {activeTab === "pr" && (
        <div className="max-w-7xl mx-auto space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-xs">Memuat data PR...</div>
          ) : prList.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 p-6 text-slate-500 text-xs">
              Belum ada Permintaan Suku Cadang (PR).
            </div>
          ) : (
            <div className="space-y-3">
              {prList.map((pr) => (
                <div
                  key={pr.id}
                  className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-3 hover:border-slate-700 transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-amber-400 text-sm">{pr.pr_number}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                          Unit: {pr.unit_code || "GENERAL"}
                        </span>
                        <span
                          className={"text-[10px] font-extrabold px-2 py-0.5 rounded-full " +
                            (pr.prioritas === "EMERGENCY_BREAKDOWN"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : pr.prioritas === "URGENT"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-slate-800 text-slate-400")}
                        >
                          {pr.prioritas}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Diajukan oleh: <span className="text-white font-medium">{pr.requester_name}</span> ({pr.site_code}) - {new Date(pr.created_at).toLocaleDateString("id-ID")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={"text-xs font-black px-3 py-1 rounded-xl " +
                          (pr.status === "FULFILLED"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : pr.status === "APPROVED_READY_ISSUE"
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            : pr.status === "REJECTED"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30")}
                      >
                        {pr.status}
                      </span>
                      {pr.status === "FULFILLED" && (
                        <button
                          onClick={() => setPrintModal({ open: true, type: "DO", data: pr })}
                          className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1 shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          Cetak DO
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800">
                          <th className="pb-1.5 font-medium">Part Number</th>
                          <th className="pb-1.5 font-medium">Nama Part</th>
                          <th className="pb-1.5 font-medium text-right">Qty Req</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {(pr.pr_items || []).map((item: any) => (
                          <tr key={item.id} className="text-slate-300">
                            <td className="py-1.5 font-mono text-amber-300">{item.part_number}</td>
                            <td className="py-1.5">{item.part_name}</td>
                            <td className="py-1.5 text-right font-bold">{item.qty_request} {item.satuan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Action Workflow Buttons */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {pr.status === "PENDING_GL_PLANT" && (
                      <button
                        onClick={() => handlePrAction(pr.id, "APPROVE_GL_PLANT")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
                      >
                        ? Setujui (GL Plant)
                      </button>
                    )}
                    {pr.status === "PENDING_PJO" && (
                      <button
                        onClick={() => handlePrAction(pr.id, "APPROVE_PJO")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
                      >
                        ? Otorisasi (PJO Site)
                      </button>
                    )}
                    {pr.status === "PENDING_HO" && (
                      <button
                        onClick={() => handlePrAction(pr.id, "APPROVE_HO", { assigned_warehouse_code: "WH-MLP" })}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500"
                      >
                        ? Approve & Assign WH-MLP (HO)
                      </button>
                    )}
                    {pr.status === "APPROVED_READY_ISSUE" && (
                      <button
                        onClick={() => handlePrAction(pr.id, "FULFILL_ISSUE")}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-extrabold hover:bg-amber-400 shadow-md shadow-amber-500/20"
                      >
                        ? Keluarkan Barang & Potong Stok
                      </button>
                    )}
                    {pr.status !== "FULFILLED" && pr.status !== "REJECTED" && (
                      <button
                        onClick={() => {
                          const r = prompt("Alasan penolakan:");
                          if (r) handlePrAction(pr.id, "REJECT", { reason: r });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-rose-400 text-xs font-bold border border-rose-500/20 hover:bg-rose-950/40"
                      >
                        ? Tolak PR
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PURCHASE ORDER (PO) */}
      {activeTab === "po" && (
        <div className="max-w-7xl mx-auto space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-xs">Memuat PO...</div>
          ) : poList.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 p-6 text-slate-500 text-xs">
              Belum ada Purchase Order (PO) yang diterbitkan.
            </div>
          ) : (
            <div className="space-y-3">
              {poList.map((po) => (
                <div key={po.id} className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <div>
                      <span className="font-mono font-bold text-cyan-400 text-sm">{po.po_number}</span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Vendor: <span className="text-white font-medium">{po.master_vendor?.nama_vendor || po.vendor_code}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200">
                        {po.status}
                      </span>
                      <button
                        onClick={() => setPrintModal({ open: true, type: "PO", data: po })}
                        className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center gap-1 shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Cetak PO
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300">
                    Total Item: {po.po_items?.length || 0} - Estimasi Total: Rp {Number(po.total_amount || 0).toLocaleString("id-ID")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PENERIMAAN BARANG (GRN) */}
      {activeTab === "grn" && (
        <div className="max-w-7xl mx-auto space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-xs">Memuat GRN...</div>
          ) : grnList.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 p-6 text-slate-500 text-xs">
              Belum ada data Penerimaan Barang (GRN / LPB).
            </div>
          ) : (
            <div className="space-y-3">
              {grnList.map((grn) => (
                <div key={grn.id} className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <div>
                      <span className="font-mono font-bold text-emerald-400 text-sm">{grn.grn_number}</span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Surat Jalan: <span className="text-white font-medium">{grn.surat_jalan_no || "-"}</span> | Gudang: {grn.warehouse_code}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{new Date(grn.received_at).toLocaleDateString("id-ID")}</span>
                      <button
                        onClick={() => setPrintModal({ open: true, type: "BAST", data: grn })}
                        className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1 shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Cetak BAST
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300">
                    Diterima oleh: {grn.received_name} - Total: {grn.grn_items?.length || 0} Part Masuk
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MONITORING STOK GUDANG */}
      {activeTab === "stock" && (
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Semua Gudang</option>
              {warehouses.map((w) => (
                <option key={w.warehouse_code} value={w.warehouse_code}>
                  {w.warehouse_code} - {w.nama_gudang}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Cari part number atau nama part..."
              value={searchPart}
              onChange={(e) => setSearchPart(e.target.value)}
              className="md:col-span-2 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 text-xs">Memuat stok...</div>
          ) : stockList.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 p-6 text-slate-500 text-xs">
              Tidak ada data stok untuk kriteria ini.
            </div>
          ) : (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3 font-medium">Gudang</th>
                      <th className="p-3 font-medium">Part Number</th>
                      <th className="p-3 font-medium">Nama Part</th>
                      <th className="p-3 font-medium">Rak</th>
                      <th className="p-3 font-medium text-right">Stok Tersedia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {stockList.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-semibold text-slate-300">{s.warehouse_code}</td>
                        <td className="p-3 font-mono font-bold text-amber-300">{s.part_number}</td>
                        <td className="p-3 text-slate-200">{s.master_part?.part_name || "-"}</td>
                        <td className="p-3 text-slate-400">{s.rak_lokasi || "-"}</td>
                        <td className="p-3 text-right">
                          <span
                            className={"font-bold px-2 py-0.5 rounded " +
                              (s.qty_tersedia <= (s.master_part?.min_stock || 0)
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : "text-emerald-400")}
                          >
                            {s.qty_tersedia} {s.master_part?.satuan || "PCS"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: STOCK OPNAME & ADJUSTMENT */}
      {activeTab === "opname" && (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Form Eksekusi Opname */}
          <form
            onSubmit={handleOpnameSubmit}
            className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 md:p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-amber-400">?</span> Form Penyesuaian Fisik vs Sistem (Stock Opname)
                </h2>
                <p className="text-xs text-slate-400">
                  Input kuantitas hasil cek fisik gudang untuk menyinkronkan saldo aktual & catat kartu stok penyesuaian
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Gudang</label>
                <select
                  value={opnameForm.warehouse_code}
                  onChange={(e) => {
                    setOpnameForm({ ...opnameForm, warehouse_code: e.target.value });
                    if (opnameForm.part_number) handleOpnamePartChange(opnameForm.part_number);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.warehouse_code} value={w.warehouse_code}>
                      {w.warehouse_code} - {w.nama_gudang}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Part Number</label>
                <input
                  type="text"
                  placeholder="Ketik Part Number..."
                  value={opnameForm.part_number}
                  onChange={(e) => handleOpnamePartChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Qty Fisik Aktual</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={opnameForm.qty_fisik}
                  onChange={(e) => setOpnameForm({ ...opnameForm, qty_fisik: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Posisi Rak</label>
                <input
                  type="text"
                  placeholder="Contoh: A-01-02"
                  value={opnameForm.rak_lokasi}
                  onChange={(e) => setOpnameForm({ ...opnameForm, rak_lokasi: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Preview Selisih Box */}
            {opnameForm.part_number && opnameCurrentStock !== null && (
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-slate-500 block">Stok Sistem:</span>
                    <span className="font-bold text-white text-sm">{opnameCurrentStock} PCS</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Fisik Diinput:</span>
                    <span className="font-bold text-amber-300 text-sm">
                      {opnameForm.qty_fisik !== "" ? opnameForm.qty_fisik : "-"} PCS
                    </span>
                  </div>
                  {selisihOpname !== null && (
                    <div>
                      <span className="text-slate-500 block">Selisih:</span>
                      <span
                        className={"font-black text-sm px-2 py-0.5 rounded " +
                          (selisihOpname === 0
                            ? "bg-slate-800 text-slate-300"
                            : selisihOpname > 0
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30")}
                      >
                        {selisihOpname > 0 ? "+" + selisihOpname : selisihOpname} PCS
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 md:max-w-xs">
                  <input
                    type="text"
                    placeholder="Alasan penyesuaian..."
                    value={opnameForm.keterangan}
                    onChange={(e) => setOpnameForm({ ...opnameForm, keterangan: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingOpname}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 disabled:opacity-50 transition-all shadow-md shadow-amber-500/20 shrink-0"
                >
                  {submittingOpname ? "Menyimpan..." : "Simpan Penyesuaian"}
                </button>
              </div>
            )}
          </form>

          {/* Riwayat Stock Opname Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300">Riwayat Penyesuaian Terakhir (Audit Trail)</h3>
            {loading ? (
              <div className="text-center py-8 text-slate-500 text-xs">Memuat history...</div>
            ) : opnameHistory.length === 0 ? (
              <div className="text-center py-8 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-500 text-xs">
                Belum ada riwayat stock opname / adjustment.
              </div>
            ) : (
              <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3 font-medium">Tanggal</th>
                      <th className="p-3 font-medium">No. Ref</th>
                      <th className="p-3 font-medium">Part Number</th>
                      <th className="p-3 font-medium">Gudang</th>
                      <th className="p-3 font-medium text-right">Sebelum</th>
                      <th className="p-3 font-medium text-right">Sesudah</th>
                      <th className="p-3 font-medium text-right">Selisih</th>
                      <th className="p-3 font-medium">Petugas & Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {opnameHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-800/40">
                        <td className="p-3 text-slate-400">{new Date(h.created_at).toLocaleDateString("id-ID")}</td>
                        <td className="p-3 font-mono font-semibold text-cyan-400">{h.reference_id}</td>
                        <td className="p-3 font-mono font-bold text-amber-300">{h.part_number}</td>
                        <td className="p-3 text-slate-300">{h.warehouse_code}</td>
                        <td className="p-3 text-right text-slate-400">{h.qty_before}</td>
                        <td className="p-3 text-right font-bold text-white">{h.qty_after}</td>
                        <td className="p-3 text-right">
                          <span
                            className={"font-bold " +
                              (h.qty_change > 0
                                ? "text-emerald-400"
                                : h.qty_change < 0
                                ? "text-rose-400"
                                : "text-slate-400")}
                          >
                            {h.qty_change > 0 ? "+" + h.qty_change : h.qty_change}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">
                          <div>{h.actor_nama}</div>
                          <div className="text-[10px] text-slate-500">{h.keterangan}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: MASTER PART */}
      {activeTab === "parts" && (
        <div className="max-w-7xl mx-auto space-y-4">
          <input
            type="text"
            placeholder="Cari nomor part, nama, atau kategori..."
            value={searchPart}
            onChange={(e) => setSearchPart(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />

          {loading ? (
            <div className="text-center py-12 text-slate-500 text-xs">Memuat master part...</div>
          ) : partsList.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-500 text-xs">
              Tidak ada part ditemukan.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {partsList.map((p) => (
                <div key={p.part_number} className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-mono font-black text-amber-300 text-sm">{p.part_number}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                      {p.movement_category || "FAST"}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white">{p.part_name}</h3>
                  <div className="text-[11px] text-slate-400">
                    <div>Kategori: {p.kategori || "-"} / {p.sub_kategori || "-"}</div>
                    <div>Model: {p.model_kompatibel || "-"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: IMPORT ACCURATE */}
      {activeTab === "import" && (
        <div className="max-w-4xl mx-auto bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-4 text-xs">
          <h2 className="text-sm font-bold text-white">Import Excel Data Accurate</h2>
          <p className="text-slate-400">
            Upload file .xlsx export Accurate untuk sinkronisasi massal katalog master part dan saldo awal gudang.
          </p>
          <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl text-center space-y-2">
            <p className="text-slate-400">Pilih file Excel Accurate (.xlsx)</p>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400"
            />
          </div>
        </div>
      )}

      {/* TAB 8: GUDANG & VENDOR */}
      {activeTab === "masters" && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white">Daftar Gudang Multi-Site</h2>
            {warehouses.map((w) => (
              <div key={w.warehouse_code} className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4">
                <span className="font-mono font-bold text-amber-300 text-xs">{w.warehouse_code}</span>
                <h3 className="text-sm font-bold text-white">{w.nama_gudang}</h3>
                <p className="text-xs text-slate-400 mt-1">Site: {w.site_code} - Lokasi: {w.lokasi_fisik || "-"}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white">Daftar Master Vendor</h2>
            {vendors.map((v) => (
              <div key={v.vendor_code} className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4">
                <span className="font-mono font-bold text-cyan-300 text-xs">{v.vendor_code}</span>
                <h3 className="text-sm font-bold text-white">{v.nama_vendor}</h3>
                <p className="text-xs text-slate-400 mt-1">Kategori: {v.kategori_suplai || "-"} - PIC: {v.nama_pic || "-"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TASK #5: CETAK DOKUMEN PDF (PRINT PREVIEW MODAL) */}
      {printModal.open && printModal.data && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Logo BTM" className="h-9 w-auto" />
                <div>
                  <h2 className="text-sm font-black tracking-tight text-[#003D79]">PT. BOSTON PPA - MLP</h2>
                  <p className="text-[10px] text-slate-500 font-medium">Site Project Muara Lawa - Kutai Barat</p>
                </div>
              </div>
              <button
                onClick={() => setPrintModal({ open: false, type: "DO", data: null })}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ?
              </button>
            </div>

            {/* Document Header */}
            <div className="text-center py-2 border-b border-dashed border-slate-300">
              <h1 className="text-base font-black tracking-wide text-slate-800">
                {printModal.type === "DO" && "DELIVERY ORDER (SURAT JALAN PENGELUARAN PART)"}
                {printModal.type === "PO" && "OFFICIAL PURCHASE ORDER (PO)"}
                {printModal.type === "BAST" && "BERITA ACARA SERAH TERIMA / PENERIMAAN BARANG (LPB)"}
              </h1>
              <p className="text-xs font-mono font-bold text-slate-600 mt-0.5">
                No: {printModal.type === "DO" ? printModal.data.pr_number : printModal.type === "PO" ? printModal.data.po_number : printModal.data.grn_number}
              </p>
            </div>

            {/* Document Meta Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <p><span className="text-slate-500">Tanggal:</span> <span className="font-semibold">{new Date(printModal.data.created_at || printModal.data.received_at).toLocaleDateString("id-ID")}</span></p>
                <p><span className="text-slate-500">Site / Unit:</span> <span className="font-semibold">{printModal.data.site_code || "PPA-MLP"} / {printModal.data.unit_code || "-"}</span></p>
              </div>
              <div>
                <p><span className="text-slate-500">Petugas/Requester:</span> <span className="font-semibold">{printModal.data.requester_name || printModal.data.received_name || printModal.data.created_by_name || "Logistik"}</span></p>
                <p><span className="text-slate-500">Gudang / Vendor:</span> <span className="font-semibold">{printModal.data.assigned_warehouse_code || printModal.data.warehouse_code || printModal.data.vendor_code || "-"}</span></p>
              </div>
            </div>

            {/* Table Items */}
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-2 border">No</th>
                  <th className="p-2 border">Part Number</th>
                  <th className="p-2 border">Nama Suku Cadang</th>
                  <th className="p-2 border text-right">Kuantitas</th>
                </tr>
              </thead>
              <tbody>
                {((printModal.data.pr_items || printModal.data.po_items || printModal.data.grn_items || [])).map((item: any, idx: number) => (
                  <tr key={idx} className="border">
                    <td className="p-2 border text-center">{idx + 1}</td>
                    <td className="p-2 border font-mono font-bold text-slate-800">{item.part_number}</td>
                    <td className="p-2 border">{item.part_name || "-"}</td>
                    <td className="p-2 border text-right font-bold">{item.qty_request || item.qty_ordered || item.qty_received} {item.satuan || "PCS"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 text-center text-xs pt-4 border-t border-slate-200">
              <div>
                <p className="text-slate-500">Diajukan / Diserahkan</p>
                <div className="h-14"></div>
                <p className="font-bold border-t pt-1 border-slate-300">( ......................... )</p>
              </div>
              <div>
                <p className="text-slate-500">Disetujui Plant / PJO</p>
                <div className="h-14"></div>
                <p className="font-bold border-t pt-1 border-slate-300">( ......................... )</p>
              </div>
              <div>
                <p className="text-slate-500">Penerima Gudang / Mekanik</p>
                <div className="h-14"></div>
                <p className="font-bold border-t pt-1 border-slate-300">( ......................... )</p>
              </div>
            </div>

            {/* Print & Close Buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setPrintModal({ open: false, type: "DO", data: null })}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 text-xs"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-[#003D79] text-white font-bold hover:bg-blue-900 text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Cetak Dokumen Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
