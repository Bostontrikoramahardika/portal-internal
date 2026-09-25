"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";

interface UserSession {
  nrp: string;
  nama: string;
  role: string;
  site: string;
}

interface MasterItem {
  id: string | number;
  kode_barang?: string;
  part_number?: string;
  nama_barang: string;
  satuan?: string;
  stok: number;
  min_stok: number;
  lokasi_rak?: string;
  site?: string;
}

export default function PlantLogistikDashboardPage() {
  // Current User Session from LocalStorage / Auth Context
  const [user, setUser] = useState<UserSession>({
    nrp: "2600101",
    nama: "Mekanik Lapangan",
    role: "mekanik",
    site: "MLP"
  });

  const [activeTab, setActiveTab] = useState<"permintaan" | "stok" | "monitoring_all" | "pengeluaran" | "barang_masuk">("permintaan");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Data collections
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [myPrList, setMyPrList] = useState<any[]>([]);
  const [allPrList, setAllPrList] = useState<any[]>([]);
  const [pendingCrossCheckPrs, setPendingCrossCheckPrs] = useState<any[]>([]);
  const [issueMovements, setIssueMovements] = useState<any[]>([]);
  const [receiptMovements, setReceiptMovements] = useState<any[]>([]);

  // Tab Stok Filters
  const [stockFilter, setStockFilter] = useState<"ALL" | "LOW" | "OUT">("ALL");
  const [stockSearch, setStockSearch] = useState("");

  // Monitoring Filter (for HO)
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");

  // Timeline Visual Modal State
  const [timelineModalPr, setTimelineModalPr] = useState<any | null>(null);

  // Rejection / Reason Modal
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    prId: string | number | null;
    action: "APPROVE" | "REJECT" | "REVISE_RESUBMIT";
    prNumber: string;
    reasonText: string;
  }>({ isOpen: false, prId: null, action: "APPROVE", prNumber: "", reasonText: "" });

  // Scanner State for Pengeluaran
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanQueryInput, setScanQueryInput] = useState("");

  // Form State: 1. Permintaan Barang (PR)
  const [prForm, setPrForm] = useState({
    nama_barang: "",
    part_number: "",
    jumlah: 1,
    satuan: "PCS",
    unit_code: "",
    kriteria: "OTHER", // BACKLOG, OTHER, URGENT, EMERGENCY
    keterangan: "",
    foto_url: ""
  });
  const [prSearchQuery, setPrSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Form State: 4. Pengeluaran Barang
  const [issueForm, setIssueForm] = useState({
    barang_id: "",
    nama_barang: "",
    part_number: "",
    available_stock: 0,
    satuan: "PCS",
    qty: 1,
    tujuan_unit: "DT-01",
    penerima_mekanik: "",
    keterangan: ""
  });

  // Form State: 5. Barang Masuk (LPB)
  const [lpbForm, setLpbForm] = useState({
    nomor_lpb: "",
    nomor_po: "",
    nama_barang: "",
    part_number: "",
    jumlah_diterima: 1,
    satuan: "PCS",
    kondisi: "BAIK",
    lokasi_simpan: "Gudang Utama",
    penerima: "",
    keterangan: ""
  });

  // Role Privilege Checkers
  const isManagementOrLogistic = useMemo(() => {
    const r = (user.role || "").toLowerCase();
    return r.includes("logistik") || r.includes("gl") || r.includes("pengawas") || r.includes("pjo") || r.includes("ho") || r.includes("admin") || r.includes("superadmin");
  }, [user.role]);

  const isHoRole = useMemo(() => {
    const r = (user.role || "").toLowerCase();
    return r.includes("ho") || r.includes("superadmin");
  }, [user.role]);

  // Read current user session from storage
  useEffect(() => {
    try {
      const sessionRaw = localStorage.getItem("btm_user_session") || localStorage.getItem("user");
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        setUser({
          nrp: parsed.nrp || "2600101",
          nama: parsed.nama || parsed.name || "User Portal",
          role: parsed.role || "mekanik",
          site: parsed.site || "MLP"
        });
      }
    } catch (e) {}
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [resStock, resMyPr, resAllPr, resReceipts, resIssues] = await Promise.all([
        fetch("/api/plant/logistik/stok?site=" + user.site).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
        fetch("/api/plant/logistik/pr?requester_nrp=" + user.nrp + "&site=" + user.site).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
        fetch("/api/plant/logistik/pr?view_all=true&role=" + user.role + "&site=" + user.site).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
        fetch("/api/plant/logistik/barang-masuk").then((r) => r.json()).catch(() => ({ success: false, receipts: [], pending_crosscheck_prs: [] })),
        fetch("/api/plant/logistik/pengeluaran").then((r) => r.json()).catch(() => ({ success: false, data: [] }))
      ]);

      if (resStock.success) setMasterItems(resStock.data || []);
      if (resMyPr.success) setMyPrList(resMyPr.data || []);
      if (resAllPr.success) setAllPrList(resAllPr.data || []);
      if (resReceipts.success) {
        setReceiptMovements(resReceipts.receipts || []);
        setPendingCrossCheckPrs(resReceipts.pending_crosscheck_prs || []);
      }
      if (resIssues.success) setIssueMovements(resIssues.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [user.site, user.nrp, user.role]);

  // Smart Link selection for PR Form (Nama Barang <-> Part Number auto fill)
  const filteredDropdownItems = useMemo(() => {
    if (!prSearchQuery) return masterItems.slice(0, 8);
    const q = prSearchQuery.toLowerCase();
    return masterItems.filter(
      (it) => (it.nama_barang && it.nama_barang.toLowerCase().includes(q)) || (it.part_number && it.part_number.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [masterItems, prSearchQuery]);

  const handleSelectMasterItem = (item: MasterItem) => {
    setPrForm((prev) => ({
      ...prev,
      nama_barang: item.nama_barang,
      part_number: item.part_number || "",
      satuan: item.satuan || "PCS"
    }));
    setPrSearchQuery(item.nama_barang);
    setIsDropdownOpen(false);
  };

  // 1. Submit PR (Permintaan Barang)
  const handleSubmitPr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prForm.nama_barang || !prForm.jumlah) {
      setMessage({ text: "Nama barang dan jumlah wajib diisi.", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/plant/logistik/pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prForm,
          requester_nrp: user.nrp,
          requester_name: user.nama,
          requester_role: user.role,
          site: user.site
        })
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: json.message || "PR Berhasil Diajukan!", type: "success" });
        setPrForm({ nama_barang: "", part_number: "", jumlah: 1, satuan: "PCS", unit_code: "", kriteria: "OTHER", keterangan: "", foto_url: "" });
        setPrSearchQuery("");
        fetchInitialData();
      } else {
        setMessage({ text: json.error || "Gagal mengajukan PR", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Terjadi kesalahan jaringan saat mengirim PR.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 3. Approval Action Trigger (GL / PJO / HO)
  const handleExecuteApproval = async () => {
    if (!actionModal.prId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/plant/logistik/pr/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pr_id: actionModal.prId,
          action: actionModal.action,
          approver_nrp: user.nrp,
          approver_name: user.nama,
          approver_role: user.role,
          reason: actionModal.reasonText
        })
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: json.message, type: "success" });
        setActionModal({ isOpen: false, prId: null, action: "APPROVE", prNumber: "", reasonText: "" });
        fetchInitialData();
      } else {
        setMessage({ text: json.error || "Gagal memproses approval", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Terjadi kesalahan jaringan", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 4. Submit Pengeluaran Barang (Manual / Scanner result)
  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.nama_barang || !issueForm.qty) {
      setMessage({ text: "Lengkapi data pengeluaran barang.", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/plant/logistik/pengeluaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...issueForm,
          operator_nrp: user.nrp,
          operator_name: user.nama
        })
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: json.message, type: "success" });
        setIssueForm({ barang_id: "", nama_barang: "", part_number: "", available_stock: 0, satuan: "PCS", qty: 1, tujuan_unit: "DT-01", penerima_mekanik: "", keterangan: "" });
        fetchInitialData();
      } else {
        setMessage({ text: json.error || "Gagal mengeluarkan part", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Terjadi gangguan jaringan.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 4. Barcode / PN Scan Matching Simulator
  const handleSimulateScan = (scannedValue: string) => {
    const found = masterItems.find(
      (m) => (m.part_number && m.part_number.toLowerCase() === scannedValue.toLowerCase()) || (m.kode_barang && m.kode_barang.toLowerCase() === scannedValue.toLowerCase()) || m.nama_barang.toLowerCase().includes(scannedValue.toLowerCase())
    );
    if (found) {
      setIssueForm({
        barang_id: String(found.id),
        nama_barang: found.nama_barang,
        part_number: found.part_number || "",
        available_stock: Number(found.stok || 0),
        satuan: found.satuan || "PCS",
        qty: 1,
        tujuan_unit: "DT-01",
        penerima_mekanik: user.nama,
        keterangan: "Pengeluaran via Scanner Label Part Number"
      });
      setIsScannerOpen(false);
      setMessage({ text: "Part berhasil terdeteksi via Scan: " + found.nama_barang + " (Sisa: " + found.stok + " " + (found.satuan || "PCS") + ")", type: "info" });
    } else {
      setMessage({ text: "Part Number tidak ditemukan dalam database!", type: "error" });
    }
  };

  // 5. Submit Barang Masuk (LPB / GRN)
  const handleSubmitLpb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lpbForm.nama_barang || !lpbForm.jumlah_diterima) {
      setMessage({ text: "Lengkapi data barang masuk LPB.", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/plant/logistik/barang-masuk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...lpbForm,
          operator_nrp: user.nrp,
          penerima: lpbForm.penerima || user.nama,
          site: user.site
        })
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: json.message, type: "success" });
        setLpbForm({ nomor_lpb: "", nomor_po: "", nama_barang: "", part_number: "", jumlah_diterima: 1, satuan: "PCS", kondisi: "BAIK", lokasi_simpan: "Gudang Utama", penerima: "", keterangan: "" });
        fetchInitialData();
      } else {
        setMessage({ text: json.error || "Gagal mencatat LPB", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Gangguan koneksi server.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 5. Logistics Final Cross-Check & Close PR
  const handleConfirmCrossCheck = async (prId: string | number) => {
    setLoading(true);
    try {
      const res = await fetch("/api/plant/logistik/cross-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pr_id: prId, verified_by: user.nama + " (" + user.role + ")" })
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: json.message, type: "success" });
        fetchInitialData();
      } else {
        setMessage({ text: json.error || "Gagal konfirmasi cross-check", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Gagal memproses verifikasi.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Filtered Stock Items
  const displayedStockItems = useMemo(() => {
    return masterItems.filter((it) => {
      const cur = Number(it.stok || 0);
      const min = Number(it.min_stok || 0);
      if (stockFilter === "OUT" && cur > 0) return false;
      if (stockFilter === "LOW" && cur > min) return false;
      if (stockSearch) {
        const s = stockSearch.toLowerCase();
        const nameMatch = it.nama_barang && it.nama_barang.toLowerCase().includes(s);
        const pnMatch = it.part_number && it.part_number.toLowerCase().includes(s);
        if (!nameMatch && !pnMatch) return false;
      }
      return true;
    });
  }, [masterItems, stockFilter, stockSearch]);

  // Filtered All PRs for Monitoring
  const displayedAllPrs = useMemo(() => {
    return allPrList.filter((pr) => {
      if (selectedSiteFilter !== "ALL" && pr.site !== selectedSiteFilter) return false;
      if (selectedStatusFilter !== "ALL" && pr.status !== selectedStatusFilter) return false;
      return true;
    });
  }, [allPrList, selectedSiteFilter, selectedStatusFilter]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 pb-28">
      {/* Top Header Breadcrumb */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Link href="/dashboard" className="text-amber-500 hover:underline flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              Menu Utama
            </Link>
            <span className="text-slate-600">�</span>
            <Link href="/dashboard/plant" className="text-cyan-400 hover:underline">Plant</Link>
            <span className="text-slate-600">�</span>
            <span className="text-slate-300 font-bold">Logistik Site</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2.5 mt-1 tracking-tight">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            Logistik & Pengadaan Site {user.site}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">PT. Boston PPA - MLP | User: <span className="text-slate-200 font-semibold">{user.nama}</span> ({user.role.toUpperCase()})</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={fetchInitialData} disabled={loading} className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm">
            <svg className={"w-3.5 h-3.5 " + (loading ? "animate-spin" : "")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh Data
          </button>
        </div>
      </div>

      {/* Notification Toast Alert */}
      {message && (
        <div className={"max-w-7xl mx-auto mb-5 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-lg " + (message.type === "success" ? "bg-emerald-950/70 border-emerald-700/80 text-emerald-200" : message.type === "info" ? "bg-cyan-950/70 border-cyan-700/80 text-cyan-200" : "bg-rose-950/70 border-rose-700/80 text-rose-200")}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-100 p-1">?</button>
        </div>
      )}

      {/* Main 5 Sub-Tabs Navigation (Plant > Logistik) */}
      <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto pb-3 mb-6 border-b border-slate-800 text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab("permintaan")}
          className={"px-4 py-2.5 rounded-xl transition shrink-0 flex items-center gap-2 " + (activeTab === "permintaan" ? "bg-amber-500 text-slate-950 shadow-md" : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800")}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          1. Permintaan Barang ({myPrList.length})
        </button>

        <button
          onClick={() => setActiveTab("stok")}
          className={"px-4 py-2.5 rounded-xl transition shrink-0 flex items-center gap-2 " + (activeTab === "stok" ? "bg-amber-500 text-slate-950 shadow-md" : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800")}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          2. Stock Gudang ({masterItems.length})
        </button>

        {isManagementOrLogistic && (
          <button
            onClick={() => setActiveTab("monitoring_all")}
            className={"px-4 py-2.5 rounded-xl transition shrink-0 flex items-center gap-2 " + (activeTab === "monitoring_all" ? "bg-amber-500 text-slate-950 shadow-md" : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800")}
          >
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            3. Monitoring Semua Permintaan ??
          </button>
        )}

        <button
          onClick={() => setActiveTab("pengeluaran")}
          className={"px-4 py-2.5 rounded-xl transition shrink-0 flex items-center gap-2 " + (activeTab === "pengeluaran" ? "bg-amber-500 text-slate-950 shadow-md" : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800")}
        >
          <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          4. Pengeluaran Barang
        </button>

        {isManagementOrLogistic && (
          <button
            onClick={() => setActiveTab("barang_masuk")}
            className={"px-4 py-2.5 rounded-xl transition shrink-0 flex items-center gap-2 " + (activeTab === "barang_masuk" ? "bg-amber-500 text-slate-950 shadow-md" : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800")}
          >
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
            5. Barang Masuk (LPB) ??
          </button>
        )}
      </div>

      {/* SUB-TAB 1: PERMINTAAN BARANG (PR Submission & Personal Tracking) */}
      {activeTab === "permintaan" && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Pengajuan PR */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 lg:col-span-1">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                Form Pengajuan Barang (PR)
              </h2>
              <p className="text-xs text-slate-400">Ajukan part pengganti untuk unit operasional.</p>
            </div>

            <form onSubmit={handleSubmitPr} className="space-y-3.5 text-xs">
              {/* Smart Linking: Nama Barang & Search Dropdown */}
              <div className="relative">
                <label className="block text-slate-300 font-semibold mb-1">1. Nama Barang / Sparepart *</label>
                <input
                  type="text"
                  placeholder="Ketik atau pilih dari katalog..."
                  value={prSearchQuery || prForm.nama_barang}
                  onChange={(e) => {
                    setPrSearchQuery(e.target.value);
                    setPrForm({ ...prForm, nama_barang: e.target.value });
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-amber-500 focus:outline-none"
                  required
                />
                {isDropdownOpen && filteredDropdownItems.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-800">
                    {filteredDropdownItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectMasterItem(item)}
                        className="p-2.5 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">{item.nama_barang}</div>
                          <div className="text-[10px] text-amber-400 font-mono">PN: {item.part_number || "-"}</div>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">Stok: {item.stok}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Part Number (Auto-fill or Manual) */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">2. Part Number (PN)</label>
                <input
                  type="text"
                  placeholder="Auto-fill atau ketik manual..."
                  value={prForm.part_number}
                  onChange={(e) => setPrForm({ ...prForm, part_number: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Qty, Satuan, Unit Code */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">3. Jumlah *</label>
                  <input
                    type="number"
                    min="1"
                    value={prForm.jumlah}
                    onChange={(e) => setPrForm({ ...prForm, jumlah: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono font-bold focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Satuan</label>
                  <select
                    value={prForm.satuan}
                    onChange={(e) => setPrForm({ ...prForm, satuan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="PCS">PCS</option>
                    <option value="SET">SET</option>
                    <option value="LITER">LITER</option>
                    <option value="DRUM">DRUM</option>
                    <option value="BOX">BOX</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Unit Code *</label>
                  <input
                    type="text"
                    placeholder="DT-01 / EX-200"
                    value={prForm.unit_code}
                    onChange={(e) => setPrForm({ ...prForm, unit_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Kriteria */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">4. Kriteria Permintaan</label>
                <div className="grid grid-cols-2 gap-2">
                  {["BACKLOG", "OTHER", "URGENT", "EMERGENCY"].map((crit) => (
                    <button
                      type="button"
                      key={crit}
                      onClick={() => setPrForm({ ...prForm, kriteria: crit })}
                      className={"py-2 px-2.5 rounded-xl border text-[11px] font-bold transition flex items-center justify-center gap-1 " + (prForm.kriteria === crit ? (crit === "EMERGENCY" ? "bg-red-600 text-white border-red-500" : crit === "URGENT" ? "bg-amber-500 text-slate-950 border-amber-400" : "bg-cyan-600 text-white border-cyan-500") : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700")}
                    >
                      {crit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">5. Keterangan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Justifikasi kerusakan / lokasi pemasangan..."
                  value={prForm.keterangan}
                  onChange={(e) => setPrForm({ ...prForm, keterangan: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition shadow-lg flex items-center justify-center gap-2 mt-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                Kirim Pengajuan PR
              </button>
            </form>
          </div>

          {/* Monitoring PR Milik Sendiri */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 lg:col-span-2">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-100">Status Permintaan Saya</h2>
                <p className="text-xs text-slate-400">Monitoring approval chain & kesiapan barang di gudang.</p>
              </div>
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 font-mono rounded-lg text-xs font-bold">
                {myPrList.length} Pengajuan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 min-w-[550px]">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="p-3">Nomor PR</th>
                    <th className="p-3">Item & Unit</th>
                    <th className="p-3 text-center">Kriteria</th>
                    <th className="p-3">Status Saat Ini</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {myPrList.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">Belum ada pengajuan PR. Ajukan part pertama Anda pada form di sebelah kiri.</td></tr>
                  ) : (
                    myPrList.map((pr) => (
                      <tr key={pr.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono font-bold text-amber-400">{pr.nomor_pr}</td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-200">{pr.nama_barang}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Unit: {pr.unit_code} � {pr.jumlah} {pr.satuan}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={"px-2 py-0.5 rounded text-[10px] font-bold " + (pr.kriteria === "EMERGENCY" ? "bg-red-900/60 text-red-300 border border-red-800" : pr.kriteria === "URGENT" ? "bg-amber-900/60 text-amber-300 border border-amber-800" : "bg-slate-800 text-slate-300")}>
                            {pr.kriteria}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={"px-2 py-0.5 rounded text-[10px] font-bold " + (pr.status === "BARANG_READY" ? "bg-emerald-900/70 text-emerald-300 border border-emerald-700" : pr.status === "APPROVED" ? "bg-cyan-900/70 text-cyan-300 border border-cyan-700" : pr.status === "REJECTED" ? "bg-rose-900/70 text-rose-300 border border-rose-700" : "bg-amber-900/60 text-amber-300 border border-amber-800")}>
                            {pr.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setTimelineModalPr(pr)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-semibold transition"
                          >
                            Timeline
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: STOCK GUDANG (SITE) */}
      {activeTab === "stok" && (
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-100">Inventaris Stok Gudang Site {user.site}</h2>
              <p className="text-xs text-slate-400">Total {masterItems.length} sparepart terdaftar di rak gudang.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Cari nama atau Part Number..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none w-56"
              />
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                <button onClick={() => setStockFilter("ALL")} className={"px-3 py-1 rounded-lg transition " + (stockFilter === "ALL" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400")}>Semua</button>
                <button onClick={() => setStockFilter("LOW")} className={"px-3 py-1 rounded-lg transition " + (stockFilter === "LOW" ? "bg-amber-500 text-slate-950 font-bold" : "text-amber-400")}>Menipis</button>
                <button onClick={() => setStockFilter("OUT")} className={"px-3 py-1 rounded-lg transition " + (stockFilter === "OUT" ? "bg-red-500 text-white font-bold" : "text-red-400")}>Habis</button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs text-slate-300 min-w-[700px]">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3">Part Number</th>
                  <th className="p-3">Nama Part</th>
                  <th className="p-3">Lokasi Rak</th>
                  <th className="p-3 text-center">Stok Fisik</th>
                  <th className="p-3 text-center">Batas Min</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayedStockItems.map((item) => {
                  const cur = Number(item.stok || 0);
                  const min = Number(item.min_stok || 0);
                  const isOut = cur <= 0;
                  const isLow = cur <= min;
                  return (
                    <tr key={item.id} className={"transition " + (isOut ? "bg-red-950/20" : isLow ? "bg-amber-950/20" : "hover:bg-slate-800/40")}>
                      <td className="p-3 font-mono font-bold text-amber-400">{item.part_number || "-"}</td>
                      <td className="p-3 font-semibold text-slate-200">{item.nama_barang}</td>
                      <td className="p-3 font-mono text-slate-400">{item.lokasi_rak || "Gudang Utama"}</td>
                      <td className="p-3 text-center font-mono font-black text-sm text-slate-100">{cur} {item.satuan || "PCS"}</td>
                      <td className="p-3 text-center font-mono text-slate-400">{min}</td>
                      <td className="p-3">
                        <span className={"px-2 py-0.5 rounded text-[10px] font-bold " + (isOut ? "bg-red-900/60 text-red-300 border border-red-800" : isLow ? "bg-amber-900/60 text-amber-300 border border-amber-800" : "bg-emerald-900/60 text-emerald-300 border border-emerald-800")}>
                          {isOut ? "HABIS (0)" : isLow ? "MENIPIS" : "AMAN"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setPrForm({
                              nama_barang: item.nama_barang,
                              part_number: item.part_number || "",
                              jumlah: Math.max(1, min * 2 - cur),
                              satuan: item.satuan || "PCS",
                              unit_code: "GUDANG",
                              kriteria: isOut ? "EMERGENCY" : "URGENT",
                              keterangan: "Restock safety stock gudang",
                              foto_url: ""
                            });
                            setActiveTab("permintaan");
                          }}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] transition shadow"
                        >
                          Restock PR
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MONITORING SEMUA PERMINTAAN (Role-Gated) */}
      {activeTab === "monitoring_all" && isManagementOrLogistic && (
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                Monitoring Seluruh Permintaan {isHoRole ? "(ALL SITE)" : "(Site " + user.site + ")"}
              </h2>
              <p className="text-xs text-slate-400">Akses khusus: Logistik, GL Plant, PJO, dan Head Office (HO).</p>
            </div>
            <div className="flex items-center gap-2">
              {isHoRole && (
                <select
                  value={selectedSiteFilter}
                  onChange={(e) => setSelectedSiteFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-semibold"
                >
                  <option value="ALL">Semua Site Project</option>
                  <option value="MLP">Site MLP</option>
                  <option value="BTM">Site BTM</option>
                  <option value="HO">Head Office</option>
                </select>
              )}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-semibold"
              >
                <option value="ALL">Semua Status</option>
                <option value="PENDING_GL">Menunggu GL</option>
                <option value="PENDING_PJO">Menunggu PJO</option>
                <option value="PENDING_HO">Menunggu HO</option>
                <option value="APPROVED">Disetujui (Approved)</option>
                <option value="BARANG_READY">Barang Ready</option>
                <option value="REJECTED">Ditolak</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs text-slate-300 min-w-[850px]">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3">Nomor PR & Site</th>
                  <th className="p-3">Pemohon & Unit</th>
                  <th className="p-3">Nama Part & Qty</th>
                  <th className="p-3">Kriteria</th>
                  <th className="p-3">Status Pipeline</th>
                  <th className="p-3 text-right">Tindakan Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayedAllPrs.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-500">Tidak ada data PR yang sesuai kriteria filter.</td></tr>
                ) : (
                  displayedAllPrs.map((pr) => (
                    <tr key={pr.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3">
                        <div className="font-mono font-bold text-amber-400">{pr.nomor_pr}</div>
                        <div className="text-[10px] text-cyan-400 font-semibold">Site: {pr.site || "MLP"}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{pr.requester_name || "Mekanik"}</div>
                        <div className="text-[10px] text-slate-400">Unit: {pr.unit_code} ({pr.requester_role})</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{pr.nama_barang}</div>
                        <div className="text-[10px] text-slate-400 font-mono">PN: {pr.part_number || "-"} � {pr.jumlah} {pr.satuan}</div>
                      </td>
                      <td className="p-3">
                        <span className={"px-2 py-0.5 rounded text-[10px] font-bold " + (pr.kriteria === "EMERGENCY" ? "bg-red-900/60 text-red-300 border border-red-800" : pr.kriteria === "URGENT" ? "bg-amber-900/60 text-amber-300 border border-amber-800" : "bg-slate-800 text-slate-300")}>
                          {pr.kriteria}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={"px-2 py-0.5 rounded text-[10px] font-bold " + (pr.status === "BARANG_READY" ? "bg-emerald-900/70 text-emerald-300 border border-emerald-700" : pr.status === "APPROVED" ? "bg-cyan-900/70 text-cyan-300 border border-cyan-700" : pr.status === "REJECTED" ? "bg-rose-900/70 text-rose-300 border border-rose-700" : "bg-amber-900/60 text-amber-300 border border-amber-800")}>
                          {pr.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          onClick={() => setTimelineModalPr(pr)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold transition"
                        >
                          Log
                        </button>
                        {/* Approval Buttons conditionally shown by status */}
                        {((pr.status === "PENDING_GL" && (user.role.toLowerCase().includes("gl") || isHoRole)) ||
                          (pr.status === "PENDING_PJO" && (user.role.toLowerCase().includes("pjo") || isHoRole)) ||
                          (pr.status === "PENDING_HO" && isHoRole)) && (
                          <>
                            <button
                              onClick={() => setActionModal({ isOpen: true, prId: pr.id, action: "APPROVE", prNumber: pr.nomor_pr, reasonText: "" })}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold transition shadow"
                            >
                              Setujui
                            </button>
                            <button
                              onClick={() => setActionModal({ isOpen: true, prId: pr.id, action: "REJECT", prNumber: pr.nomor_pr, reasonText: "" })}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold transition shadow"
                            >
                              Tolak
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: PENGELUARAN BARANG (Manual & Scan Integration) */}
      {activeTab === "pengeluaran" && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Pengeluaran */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 lg:col-span-1">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Pengeluaran Barang
                </h2>
                <p className="text-xs text-slate-400">Stok otomatis berkurang di database.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                Scan PN
              </button>
            </div>

            <form onSubmit={handleSubmitIssue} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Pilih Part dari Rak Gudang</label>
                <select
                  value={issueForm.barang_id}
                  onChange={(e) => {
                    const it = masterItems.find((m) => String(m.id) === e.target.value);
                    if (it) {
                      setIssueForm({
                        ...issueForm,
                        barang_id: String(it.id),
                        nama_barang: it.nama_barang,
                        part_number: it.part_number || "",
                        available_stock: Number(it.stok || 0),
                        satuan: it.satuan || "PCS"
                      });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-semibold focus:border-rose-500 focus:outline-none"
                  required
                >
                  <option value="">-- Pilih Barang --</option>
                  {masterItems.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nama_barang} (Stok: {m.stok} {m.satuan || "PCS"}) - PN: {m.part_number || "-"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kuantitas Keluar</label>
                  <input
                    type="number"
                    min="1"
                    max={issueForm.available_stock || 9999}
                    value={issueForm.qty}
                    onChange={(e) => setIssueForm({ ...issueForm, qty: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono font-bold focus:border-rose-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tujuan Unit</label>
                  <input
                    type="text"
                    placeholder="DT-01 / EX-200"
                    value={issueForm.tujuan_unit}
                    onChange={(e) => setIssueForm({ ...issueForm, tujuan_unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-rose-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mekanik Penerima</label>
                <input
                  type="text"
                  placeholder="Nama mekanik / installer"
                  value={issueForm.penerima_mekanik}
                  onChange={(e) => setIssueForm({ ...issueForm, penerima_mekanik: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Keterangan Pengeluaran</label>
                <textarea
                  rows={2}
                  placeholder="Pemasangan breakdown unit..."
                  value={issueForm.keterangan}
                  onChange={(e) => setIssueForm({ ...issueForm, keterangan: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl transition shadow-lg flex items-center justify-center gap-2 mt-2"
              >
                Potong Stok & Catat Pengeluaran
              </button>
            </form>
          </div>

          {/* Riwayat Pengeluaran Barang */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 lg:col-span-2">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-100">Log Pengeluaran Part Terkini</h2>
                <p className="text-xs text-slate-400">Riwayat pengeluaran barang & scan part unit operasional.</p>
              </div>
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 font-mono rounded-lg text-xs font-bold">
                {issueMovements.length} Transaksi
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 min-w-[550px]">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold">
                  <tr>
                    <th className="p-3">Waktu</th>
                    <th className="p-3">Part & PN</th>
                    <th className="p-3">Qty Keluar</th>
                    <th className="p-3">Tujuan Unit</th>
                    <th className="p-3">Penerima</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {issueMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono text-slate-400">
                        {m.created_at ? new Date(m.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{m.nama_barang}</div>
                        <div className="text-[10px] text-amber-400 font-mono">PN: {m.part_number || "-"}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-rose-400">-{m.qty}</td>
                      <td className="p-3 font-semibold text-slate-200">{m.tujuan_unit || "WORKSHOP"}</td>
                      <td className="p-3 text-slate-400">{m.penerima_mekanik || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: BARANG MASUK (LPB) & CROSS-CHECK QUEUE */}
      {activeTab === "barang_masuk" && isManagementOrLogistic && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Penerimaan Barang Masuk */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 lg:col-span-1">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                Pencatatan Barang Masuk (LPB)
              </h2>
              <p className="text-xs text-slate-400">Penerimaan fisik barang dari vendor/supplier.</p>
            </div>

            <form onSubmit={handleSubmitLpb} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nomor LPB</label>
                  <input
                    type="text"
                    placeholder="Auto / LPB-..."
                    value={lpbForm.nomor_lpb}
                    onChange={(e) => setLpbForm({ ...lpbForm, nomor_lpb: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ref No. PO</label>
                  <input
                    type="text"
                    placeholder="PO-2026-..."
                    value={lpbForm.nomor_po}
                    onChange={(e) => setLpbForm({ ...lpbForm, nomor_po: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Barang Masuk *</label>
                <input
                  type="text"
                  placeholder="Filter Oli, Radiator, Hose, dsb..."
                  value={lpbForm.nama_barang}
                  onChange={(e) => setLpbForm({ ...lpbForm, nama_barang: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Part Number</label>
                  <input
                    type="text"
                    placeholder="PN-..."
                    value={lpbForm.part_number}
                    onChange={(e) => setLpbForm({ ...lpbForm, part_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Qty Diterima *</label>
                  <input
                    type="number"
                    min="1"
                    value={lpbForm.jumlah_diterima}
                    onChange={(e) => setLpbForm({ ...lpbForm, jumlah_diterima: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono font-bold focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Satuan</label>
                  <input
                    type="text"
                    value={lpbForm.satuan}
                    onChange={(e) => setLpbForm({ ...lpbForm, satuan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kondisi Fisik</label>
                  <select
                    value={lpbForm.kondisi}
                    onChange={(e) => setLpbForm({ ...lpbForm, kondisi: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="BAIK">BAIK & LENGKAP</option>
                    <option value="RUSAK">RUSAK / CACAT</option>
                    <option value="KURANG">KURANG / PARTIAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Lokasi Rak Simpan</label>
                  <input
                    type="text"
                    value={lpbForm.lokasi_simpan}
                    onChange={(e) => setLpbForm({ ...lpbForm, lokasi_simpan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition shadow-lg flex items-center justify-center gap-2 mt-2"
              >
                Simpan LPB & Tambah Stok
              </button>
            </form>
          </div>

          {/* Antrean Cross-Check PR (Human Verification) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 lg:col-span-2">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-100">Antrean Cross-Check PR Barang Masuk</h2>
                <p className="text-xs text-slate-400">Verifikasi fisik barang yang telah tiba sebelum status PR diset BARANG READY.</p>
              </div>
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 font-mono rounded-lg text-xs font-bold">
                {pendingCrossCheckPrs.length} Menunggu Cross-Check
              </span>
            </div>

            <div className="space-y-3">
              {pendingCrossCheckPrs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800">
                  Semua PR yang disetujui telah selesai diverifikasi atau belum ada PO masuk.
                </div>
              ) : (
                pendingCrossCheckPrs.map((pr) => (
                  <div key={pr.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-700 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400 text-xs">{pr.nomor_pr}</span>
                        <span className="text-slate-400 text-[10px]">� Unit: {pr.unit_code}</span>
                        <span className="text-cyan-400 text-[10px]">Pemohon: {pr.requester_name}</span>
                      </div>
                      <div className="font-bold text-slate-200 text-sm mt-0.5">{pr.nama_barang}</div>
                      <div className="text-[11px] text-slate-400 font-mono">PN: {pr.part_number || "-"} � Kebutuhan: {pr.jumlah} {pr.satuan}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleConfirmCrossCheck(pr.id)}
                        disabled={loading}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        Konfirmasi & Close PR (Ready)
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TIMELINE VISUAL APPROVAL */}
      {timelineModalPr && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">Tracking Pipeline PR</span>
                <h3 className="text-base font-bold text-slate-100">{timelineModalPr.nomor_pr}</h3>
              </div>
              <button onClick={() => setTimelineModalPr(null)} className="text-slate-400 hover:text-slate-200">?</button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
              <div className="text-slate-300 font-bold">{timelineModalPr.nama_barang}</div>
              <div className="text-slate-400 font-mono">PN: {timelineModalPr.part_number || "-"} � Qty: {timelineModalPr.jumlah} {timelineModalPr.satuan} � Unit: {timelineModalPr.unit_code}</div>
              <div className="text-[11px] text-amber-400">Pemohon: {timelineModalPr.requester_name} ({timelineModalPr.requester_role})</div>
            </div>

            {/* Visual Timeline Steps */}
            <div className="space-y-4 text-xs">
              {/* Step 1: Submit */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center shrink-0 mt-0.5">?</div>
                <div>
                  <div className="font-bold text-slate-200">1. Pengajuan PR Diajukan</div>
                  <div className="text-slate-400 text-[11px]">Oleh {timelineModalPr.requester_name} pada {timelineModalPr.created_at ? new Date(timelineModalPr.created_at).toLocaleString("id-ID") : "-"}</div>
                </div>
              </div>

              {/* Step 2: GL Plant Approval */}
              <div className="flex items-start gap-3">
                <div className={"w-6 h-6 rounded-full font-bold flex items-center justify-center shrink-0 mt-0.5 " + (timelineModalPr.approval_gl_status === "APPROVED" ? "bg-emerald-500 text-slate-950" : timelineModalPr.status === "PENDING_GL" ? "bg-amber-500 text-slate-950 animate-pulse" : timelineModalPr.status === "REJECTED" ? "bg-red-500 text-white" : "bg-slate-800 text-slate-400")}>
                  {timelineModalPr.approval_gl_status === "APPROVED" ? "?" : "2"}
                </div>
                <div>
                  <div className="font-bold text-slate-200">2. Review & Approval GL Plant</div>
                  <div className="text-slate-400 text-[11px]">{timelineModalPr.approval_gl_name ? "Disetujui oleh " + timelineModalPr.approval_gl_name : "Menunggu review GL Plant"}</div>
                </div>
              </div>

              {/* Step 3: PJO Approval */}
              <div className="flex items-start gap-3">
                <div className={"w-6 h-6 rounded-full font-bold flex items-center justify-center shrink-0 mt-0.5 " + (timelineModalPr.approval_pjo_status === "APPROVED" ? "bg-emerald-500 text-slate-950" : timelineModalPr.status === "PENDING_PJO" ? "bg-amber-500 text-slate-950 animate-pulse" : "bg-slate-800 text-slate-400")}>
                  {timelineModalPr.approval_pjo_status === "APPROVED" ? "?" : "3"}
                </div>
                <div>
                  <div className="font-bold text-slate-200">3. Persetujuan Project Manager (PJO)</div>
                  <div className="text-slate-400 text-[11px]">{timelineModalPr.approval_pjo_name ? "Disetujui oleh PJO " + timelineModalPr.approval_pjo_name : "Menunggu persetujuan PJO"}</div>
                </div>
              </div>

              {/* Step 4: HO Final Approval */}
              <div className="flex items-start gap-3">
                <div className={"w-6 h-6 rounded-full font-bold flex items-center justify-center shrink-0 mt-0.5 " + (timelineModalPr.approval_ho_status === "APPROVED" || timelineModalPr.status === "APPROVED" || timelineModalPr.status === "BARANG_READY" ? "bg-emerald-500 text-slate-950" : timelineModalPr.status === "PENDING_HO" ? "bg-amber-500 text-slate-950 animate-pulse" : "bg-slate-800 text-slate-400")}>
                  {timelineModalPr.approval_ho_status === "APPROVED" || timelineModalPr.status === "APPROVED" || timelineModalPr.status === "BARANG_READY" ? "?" : "4"}
                </div>
                <div>
                  <div className="font-bold text-slate-200">4. Head Office (HO) Final Approval</div>
                  <div className="text-slate-400 text-[11px]">{timelineModalPr.approval_ho_name ? "Disetujui HO " + timelineModalPr.approval_ho_name : "Menunggu approval Head Office"}</div>
                </div>
              </div>

              {/* Step 5: Goods Ready / Received */}
              <div className="flex items-start gap-3">
                <div className={"w-6 h-6 rounded-full font-bold flex items-center justify-center shrink-0 mt-0.5 " + (timelineModalPr.status === "BARANG_READY" ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400")}>
                  {timelineModalPr.status === "BARANG_READY" ? "?" : "5"}
                </div>
                <div>
                  <div className="font-bold text-slate-200">5. Kesiapan Barang di Gudang (Cross-Check)</div>
                  <div className="text-slate-400 text-[11px]">{timelineModalPr.status === "BARANG_READY" ? "Barang sudah ready dan dapat diambil di gudang site." : "Dalam proses pengiriman vendor / menunggu verifikasi LPB."}</div>
                </div>
              </div>
            </div>

            {timelineModalPr.rejection_reason && (
              <div className="p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-200">
                <span className="font-bold">Alasan Penolakan: </span>
                {timelineModalPr.rejection_reason}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button onClick={() => setTimelineModalPr(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition">Tutup Timeline</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ACTION APPROVAL / REJECTION WITH REASON */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">
                {actionModal.action === "APPROVE" ? "Konfirmasi Persetujuan PR" : "Penolakan PR Permintaan"}
              </h3>
              <p className="text-slate-400">Nomor PR: <span className="font-mono text-amber-400 font-bold">{actionModal.prNumber}</span></p>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                {actionModal.action === "APPROVE" ? "Catatan Approval (Opsional)" : "Alasan Penolakan *"}
              </label>
              <textarea
                rows={3}
                value={actionModal.reasonText}
                onChange={(e) => setActionModal({ ...actionModal, reasonText: e.target.value })}
                placeholder={actionModal.action === "APPROVE" ? "Disetujui untuk diproses..." : "Berikan alasan penolakan..."}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:border-amber-500 focus:outline-none"
                required={actionModal.action === "REJECT"}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActionModal({ isOpen: false, prId: null, action: "APPROVE", prNumber: "", reasonText: "" })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteApproval}
                disabled={loading}
                className={"px-4 py-2 font-bold rounded-xl transition shadow " + (actionModal.action === "APPROVE" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-rose-600 hover:bg-rose-500 text-white")}
              >
                {actionModal.action === "APPROVE" ? "Setujui PR" : "Tolak PR"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SCANNER PART NUMBER / BARCODE (Tab Pengeluaran) */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                Scan Part Number / Barcode Label
              </h3>
              <button onClick={() => setIsScannerOpen(false)} className="text-slate-400 hover:text-slate-200">?</button>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-cyan-950/60 border border-cyan-500/40 rounded-2xl flex items-center justify-center text-cyan-400 animate-pulse">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <p className="text-slate-400 text-xs">Arahkan scanner atau masukkan nomor barcode part fisik secara langsung:</p>
              <input
                type="text"
                placeholder="Scan / Ketik PN (cth: 600-185-6220)..."
                value={scanQueryInput}
                onChange={(e) => setScanQueryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSimulateScan(scanQueryInput);
                  }
                }}
                className="w-full bg-slate-900 border border-cyan-500 rounded-xl p-2.5 text-center font-mono font-bold text-cyan-300 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsScannerOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSimulateScan(scanQueryInput)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow"
              >
                Konfirmasi Scan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
