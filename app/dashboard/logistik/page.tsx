'use client'


import PageHeader from "@/app/components/PageHeader";
import React, { useState, useEffect } from "react";
import Link from "next/link";

interface LowStockItem {
  id: string | number;
  kode_barang?: string;
  part_number?: string;
  nama_barang: string;
  stok: number;
  min_stok: number;
  satuan?: string;
  lokasi_rak?: string;
  kategori?: string;
  status_level: "OUT_OF_STOCK" | "LOW_STOCK";
  deficit: number;
}

export default function LogistikDashboardPage() {
  const [activeTab, setActiveTab] = useState<"pr" | "po" | "lpb" | "stok" | "opname">("pr");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Min Stock Alert States
  const [lowStockList, setLowStockList] = useState<LowStockItem[]>([]);
  const [stockFilter, setStockFilter] = useState<"ALL" | "LOW" | "OUT">("ALL");
  const [broadcastingAlert, setBroadcastingAlert] = useState(false);

  // Data Lists
  const [prList, setPrList] = useState<any[]>([]);
  const [poList, setPoList] = useState<any[]>([]);
  const [lpbList, setLpbList] = useState<any[]>([]);
  const [stokList, setStokList] = useState<any[]>([]);
  const [opnameList, setOpnameList] = useState<any[]>([]);

  // Modal & Form States
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [isLpbModalOpen, setIsLpbModalOpen] = useState(false);
  const [isOpnameModalOpen, setIsOpnameModalOpen] = useState(false);

  // Document Print Modal State
  const [printDoc, setPrintDoc] = useState<{
    isOpen: boolean;
    docType: "DO" | "PO" | "BAST";
    docNumber: string;
    date: string;
    reference: string;
    recipientOrVendor: string;
    items: Array<{
      kode?: string;
      nama: string;
      qty: number;
      satuan?: string;
      keterangan?: string;
    }>;
    catatan?: string;
    signatories: {
      maker: { title: string; name: string };
      checker: { title: string; name: string };
      approver: { title: string; name: string };
    };
  }>({ 
    isOpen: false,
    docType: "DO",
    docNumber: "",
    date: "",
    reference: "",
    recipientOrVendor: "",
    items: [],
    catatan: "",
    signatories: {
      maker: { title: "Dibuat Oleh / Logistik", name: "Staff Gudang" },
      checker: { title: "Diperiksa Oleh", name: "Kepala Gudang / GL" },
      approver: { title: "Disetujui Oleh", name: "Project Manager / PJO" }
    }
  });

  // Form inputs
  const [prForm, setPrForm] = useState({
    nomor_pr: "",
    unit_code: "",
    nama_barang: "",
    part_number: "",
    jumlah: 1,
    satuan: "PCS",
    prioritas: "NORMAL",
    keterangan: ""
  });

  const [poForm, setPoForm] = useState({
    nomor_po: "",
    nomor_pr: "",
    vendor: "",
    nama_barang: "",
    jumlah: 1,
    satuan: "PCS",
    estimasi_harga: 0,
    keterangan: ""
  });

  const [lpbForm, setLpbForm] = useState({
    nomor_lpb: "",
    nomor_po: "",
    nama_barang: "",
    jumlah_diterima: 1,
    satuan: "PCS",
    kondisi: "BAIK",
    lokasi_simpan: "Gudang Utama",
    penerima: ""
  });

  const [opnameForm, setOpnameForm] = useState({
    barang_id: "",
    nama_barang: "",
    stok_sistem: 0,
    stok_fisik: 0,
    lokasi_rak: "",
    alasan: "",
    auditor: ""
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPr, resPo, resLpb, resStok, resOpname, resMinStock] = await Promise.all([
        fetch("/api/logistik/pr").then(function(r) { return r.json(); }).catch(function() { return { success: false, data: [] }; }),
        fetch("/api/logistik/po").then(function(r) { return r.json(); }).catch(function() { return { success: false, data: [] }; }),
        fetch("/api/logistik/lpb").then(function(r) { return r.json(); }).catch(function() { return { success: false, data: [] }; }),
        fetch("/api/logistik/stok").then(function(r) { return r.json(); }).catch(function() { return { success: false, data: [] }; }),
        fetch("/api/logistik/stock-opname").then(function(r) { return r.json(); }).catch(function() { return { success: false, data: [] }; }),
        fetch("/api/logistik/min-stock").then(function(r) { return r.json(); }).catch(function() { return { success: false, items: [] }; })
      ]);

      if (resPr.success) setPrList(resPr.data || []);
      if (resPo.success) setPoList(resPo.data || []);
      if (resLpb.success) setLpbList(resLpb.data || []);
      if (resStok.success) setStokList(resStok.data || []);
      if (resOpname.success) setOpnameList(resOpname.data || []);
      if (resMinStock.success) setLowStockList(resMinStock.items || []);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBroadcastAlert = async () => {
    if (lowStockList.length === 0) {
      setMessage({ text: "Seluruh stok saat ini aman, tidak ada alert yang perlu dikirim.", type: "info" });
      return;
    }
    setBroadcastingAlert(true);
    try {
      const res = await fetch("/api/logistik/min-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggered_by: "Manual UI Broadcast" })
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: json.message, type: "success" });
      } else {
        setMessage({ text: json.error || "Gagal mengirim alert", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Terjadi kesalahan saat memproses alert.", type: "error" });
    } finally {
      setBroadcastingAlert(false);
    }
  };

  const handleQuickRestockPr = (item: any) => {
    var defQty = item.deficit && item.deficit > 0 ? item.deficit : (item.min_stok || 1) * 2;
    setPrForm({
      nomor_pr: "PR-RESTOCK-" + Date.now().toString().slice(-6),
      unit_code: "GUDANG-LOGISTIK",
      nama_barang: item.nama_barang || "",
      part_number: item.part_number || item.kode_barang || "",
      jumlah: defQty,
      satuan: item.satuan || "PCS",
      prioritas: item.stok <= 0 ? "URGENT" : "HIGH",
      keterangan: "Restock Otomatis: Stok saat ini (" + item.stok + ") di bawah minimum (" + item.min_stok + ")"
    });
    setIsPrModalOpen(true);
  };

  const handleSelectBarangOpname = (barangId: string) => {
    const found = stokList.find(function(s) { return String(s.id) === String(barangId); });
    if (found) {
      setOpnameForm({
        barang_id: String(found.id),
        nama_barang: found.nama_barang || "",
        stok_sistem: Number(found.stok || 0),
        stok_fisik: Number(found.stok || 0),
        lokasi_rak: found.lokasi_rak || found.lokasi || "",
        alasan: "",
        auditor: ""
      });
    }
  };

  const handleSubmitPr = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/logistik/pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prForm)
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: "PR Berhasil dibuat!", type: "success" });
        setIsPrModalOpen(false);
        fetchData();
      } else {
        setMessage({ text: json.error || "Gagal membuat PR", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Terjadi kesalahan jaringan", type: "error" });
    }
  };

  const handleSubmitPo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/logistik/po", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(poForm)
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: "PO Berhasil diterbitkan!", type: "success" });
        setIsPoModalOpen(false);
        fetchData();
      } else {
        setMessage({ text: json.error || "Gagal membuat PO", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Terjadi kesalahan jaringan", type: "error" });
    }
  };

  const handleSubmitLpb = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/logistik/lpb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lpbForm)
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: "LPB / GRN Berhasil dicatat & Stok ditambahkan!", type: "success" });
        setIsLpbModalOpen(false);
        fetchData();
      } else {
        setMessage({ text: json.error || "Gagal mencatat LPB", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Terjadi kesalahan jaringan", type: "error" });
    }
  };

  const handleSubmitOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/logistik/stock-opname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opnameForm)
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: "Penyesuaian Stok Opname Berhasil disimpan!", type: "success" });
        setIsOpnameModalOpen(false);
        fetchData();
      } else {
        setMessage({ text: json.error || "Gagal menyimpan Stock Opname", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Terjadi kesalahan koneksi", type: "error" });
    }
  };

  const openPrintDo = (pr: any) => {
    setPrintDoc({
      isOpen: true,
      docType: "DO",
      docNumber: "DO-" + (pr.nomor_pr || pr.id || Date.now()),
      date: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
      reference: pr.nomor_pr || "-",
      recipientOrVendor: (pr.unit_code ? "Unit " + pr.unit_code : "Plant Site") + " / " + (pr.pemohon || "Operational Staff"),
      items: [{
        kode: pr.part_number || pr.kode_barang || "-",
        nama: pr.nama_barang || "Sparepart / Material",
        qty: pr.jumlah || 1,
        satuan: pr.satuan || "PCS",
        keterangan: "Pengeluaran PR status: " + (pr.status || "APPROVED")
      }],
      catatan: "Barang telah diserahkan dari gudang pusat ke operational site.",
      signatories: {
        maker: { title: "Petugas Gudang (Issuer)", name: "Gudang Logistik" },
        checker: { title: "Penerima Lapangan", name: pr.pemohon || "Driver / Mechanic" },
        approver: { title: "Kepala Logistik / GL", name: "GL Logistic Site" }
      }
    });
  };

  const openPrintPo = (po: any) => {
    setPrintDoc({
      isOpen: true,
      docType: "PO",
      docNumber: po.nomor_po || ("PO-" + Date.now()),
      date: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
      reference: po.nomor_pr || "PR-REF",
      recipientOrVendor: po.vendor || "Supplier Resmi BTM",
      items: [{
        kode: po.nomor_po || "-",
        nama: po.nama_barang || "Barang Pengadaan",
        qty: po.jumlah || 1,
        satuan: po.satuan || "PCS",
        keterangan: "Estimasi: Rp " + Number(po.estimasi_harga || 0).toLocaleString("id-ID")
      }],
      catatan: "Pembayaran sesuai terms of payment yang disepakati. Harap sertakan PO ini saat pengiriman barang.",
      signatories: {
        maker: { title: "Purchasing Officer", name: "Procurement BTM" },
        checker: { title: "Finance / Tax", name: "Finance Dept" },
        approver: { title: "Project Manager / PJO", name: "PJO Site" }
      }
    });
  };

  const openPrintBast = (lpb: any) => {
    setPrintDoc({
      isOpen: true,
      docType: "BAST",
      docNumber: lpb.nomor_lpb || ("LPB-" + Date.now()),
      date: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
      reference: lpb.nomor_po || "PO-REF",
      recipientOrVendor: "Gudang Logistik Site (Penerima: " + (lpb.penerima || "Staff Gudang") + ")",
      items: [{
        kode: lpb.nomor_po || "-",
        nama: lpb.nama_barang || "Barang Masuk LPB",
        qty: lpb.jumlah_diterima || lpb.jumlah || 1,
        satuan: lpb.satuan || "PCS",
        keterangan: "Kondisi: " + (lpb.kondisi || "BAIK") + " | Lokasi: " + (lpb.lokasi_simpan || "Gudang")
      }],
      catatan: "Barang telah diperiksa secara fisik, spesifikasi, dan jumlah telah sesuai.",
      signatories: {
        maker: { title: "Penerima Gudang", name: lpb.penerima || "Staff Gudang" },
        checker: { title: "Inspector QC / Mech GL", name: "Inspector Site" },
        approver: { title: "Kepala Logistik", name: "GL Logistik" }
      }
    });
  };

  const filteredStockList = stokList.filter(function(item) {
    var cur = Number(item.stok || 0);
    var min = Number(item.min_stok || 0);
    if (stockFilter === "OUT") return cur <= 0;
    if (stockFilter === "LOW") return cur <= min;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f4f7fa] p-2 sm:p-3 lg:p-4 pb-24 text-slate-800">
      <PageHeader title="Logistik Central Portal" backUrl="/dashboard" badge="LOGISTIK" />

      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e2e8f0] pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-xs text-[#003d79] hover:underline flex items-center gap-1 font-semibold">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              Kembali ke Menu Utama
            </Link>
            <span className="text-slate-600 text-xs">�</span>
            <Link href="/parts-catalog" className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              Buka Parts Catalog
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-[#1a2332] flex items-center gap-2 mt-1">
            <svg className="w-7 h-7 text-[#003d79]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            Sistem Logistik & Pergudangan Site
          </h1>
          <p className="text-xs text-[#5a6a7e]">PT. Boston PPA - MLP | Modul Terintegrasi PR, PO, LPB, Stok Opname, & Min-Stock Alert</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={loading} className="px-3.5 py-2 bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm hover:bg-slate-700 text-[#1a2332] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-[#e2e8f0]">
            <svg className={"w-3.5 h-3.5 " + (loading ? "animate-spin" : "")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh
          </button>
          <button onClick={handleBroadcastAlert} disabled={broadcastingAlert} className="px-3.5 py-2 bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-800/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition">
            <svg className={"w-3.5 h-3.5 " + (broadcastingAlert ? "animate-spin" : "")} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            Broadcast Alert Stok
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {message && (
        <div className={"max-w-7xl mx-auto mb-4 p-3 rounded-lg text-xs font-semibold flex items-center justify-between border " + (message.type === "success" ? "bg-emerald-950/60 border-emerald-800 text-emerald-300" : message.type === "info" ? "bg-cyan-950/60 border-cyan-800 text-cyan-300" : "bg-rose-950/60 border-rose-800 text-rose-300")}>
          <span>{message.text}</span>
          <button onClick={function() { setMessage(null); }} className="text-[#5a6a7e] hover:text-[#1a2332]">?</button>
        </div>
      )}

      {/* Min-Stock Warning Bar (Task #6) */}
      {lowStockList.length > 0 && (
        <div className="max-w-7xl mx-auto mb-6 bg-gradient-to-r from-red-950/80 via-amber-950/50 to-slate-900 border border-red-700/60 rounded-xl p-4 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start md:items-center gap-3">
              <div className="p-2.5 bg-red-900/80 text-red-200 rounded-lg shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-red-200">PERINGATAN STOK MINIMUM</span>
                  <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-black">{lowStockList.length} ITEM KRITIS</span>
                </div>
                <p className="text-xs text-red-300/80 mt-0.5">
                  Terdapat part/material gudang yang telah mencapai atau berada di bawah batas safety stock.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={function() {
                  setActiveTab("stok");
                  setStockFilter("LOW");
                }}
                className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition shadow-sm"
              >
                Lihat Part Menipis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto pb-3 mb-4 border-b border-[#e2e8f0] text-xs font-semibold">
        <button
          onClick={function() { setActiveTab("pr"); }}
          className={"px-4 py-2.5 rounded-lg transition shrink-0 flex items-center gap-1.5 " + (activeTab === "pr" ? "bg-[#003d79] text-white font-bold" : "bg-[#f4f7fa] text-[#5a6a7e] hover:text-[#1a2332] border border-[#e2e8f0]")}
        >
          1. Purchase Request ({prList.length})
        </button>
        <button
          onClick={function() { setActiveTab("po"); }}
          className={"px-4 py-2.5 rounded-lg transition shrink-0 flex items-center gap-1.5 " + (activeTab === "po" ? "bg-[#003d79] text-white font-bold" : "bg-[#f4f7fa] text-[#5a6a7e] hover:text-[#1a2332] border border-[#e2e8f0]")}
        >
          2. Purchase Order ({poList.length})
        </button>
        <button
          onClick={function() { setActiveTab("lpb"); }}
          className={"px-4 py-2.5 rounded-lg transition shrink-0 flex items-center gap-1.5 " + (activeTab === "lpb" ? "bg-[#003d79] text-white font-bold" : "bg-[#f4f7fa] text-[#5a6a7e] hover:text-[#1a2332] border border-[#e2e8f0]")}
        >
          3. Penerimaan / LPB ({lpbList.length})
        </button>
        <button
          onClick={function() { setActiveTab("stok"); }}
          className={"px-4 py-2.5 rounded-lg transition shrink-0 flex items-center gap-1.5 " + (activeTab === "stok" ? "bg-[#003d79] text-white font-bold" : "bg-[#f4f7fa] text-[#5a6a7e] hover:text-[#1a2332] border border-[#e2e8f0]")}
        >
          4. Stok Real-Time ({stokList.length})
          {lowStockList.length > 0 && <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>}
        </button>
        <button
          onClick={function() { setActiveTab("opname"); }}
          className={"px-4 py-2.5 rounded-lg transition shrink-0 flex items-center gap-1.5 " + (activeTab === "opname" ? "bg-[#003d79] text-white font-bold" : "bg-[#f4f7fa] text-[#5a6a7e] hover:text-[#1a2332] border border-[#e2e8f0]")}
        >
          5. Stock Opname ({opnameList.length})
        </button>
      </div>

      {/* TAB CONTENT 1: PR */}
      {activeTab === "pr" && (
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1a2332]">Daftar Purchase Request (Permintaan Barang)</h2>
            <button onClick={function() { setIsPrModalOpen(true); }} className="px-3 py-1.5 bg-[#003d79] text-white hover:bg-[#002a57] rounded-lg text-xs font-bold transition shadow">
              + Buat PR Manual
            </button>
          </div>
          <div className="bg-[#f4f7fa] border border-[#e2e8f0] rounded-xl overflow-x-auto shadow">
            <table className="w-full text-left text-xs text-[#5a6a7e] min-w-[700px]">
              <thead className="bg-[#f4f7fa]/80 text-[#5a6a7e] border-b border-[#e2e8f0] font-semibold">
                <tr>
                  <th className="p-3">Nomor PR</th>
                  <th className="p-3">Unit / Pemohon</th>
                  <th className="p-3">Part / Barang</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Prioritas</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Aksi Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {prList.length === 0 ? (
                  <tr><td colSpan={7} className="p-6 text-center text-slate-500">Belum ada data PR yang tercatat.</td></tr>
                ) : (
                  prList.map(function(pr, idx) {
                    return (
                      <tr key={idx} className="hover:bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm/40 transition">
                        <td className="p-3 font-mono font-bold text-[#003d79]">{pr.nomor_pr || "PR-" + pr.id}</td>
                        <td className="p-3">
                          <div className="font-semibold text-[#1a2332]">{pr.unit_code || "-"}</div>
                          <div className="text-[10px] text-[#5a6a7e]">{pr.pemohon || pr.requester || "Staff"}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-[#1a2332]">{pr.nama_barang || pr.item_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{pr.part_number || "-"}</div>
                        </td>
                        <td className="p-3 font-bold">{pr.jumlah || pr.qty || 1} {pr.satuan || "PCS"}</td>
                        <td className="p-3">
                          <span className={"px-2 py-0.5 rounded text-[10px] font-bold " + (pr.prioritas === "EMERGENCY" || pr.prioritas === "URGENT" ? "bg-rose-900/60 text-rose-300 border border-rose-800" : "bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm text-[#5a6a7e]")}>
                            {pr.prioritas || "NORMAL"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={"px-2 py-0.5 rounded text-[10px] font-bold " + (pr.status === "APPROVED" ? "bg-emerald-900/60 text-emerald-300 border border-emerald-800" : pr.status === "PENDING" ? "bg-amber-900/60 text-amber-300 border border-amber-800" : "bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm text-[#5a6a7e]")}>
                            {pr.status || "PENDING"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={function() { openPrintDo(pr); }}
                            className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded text-[11px] font-semibold transition inline-flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            Cetak DO
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: PO */}
      {activeTab === "po" && (
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1a2332]">Daftar Purchase Order (PO Pengadaan)</h2>
            <button onClick={function() { setIsPoModalOpen(true); }} className="px-3 py-1.5 bg-[#003d79] text-white hover:bg-[#002a57] rounded-lg text-xs font-bold transition shadow">
              + Terbitkan PO
            </button>
          </div>
          <div className="bg-[#f4f7fa] border border-[#e2e8f0] rounded-xl overflow-x-auto shadow">
            <table className="w-full text-left text-xs text-[#5a6a7e] min-w-[700px]">
              <thead className="bg-[#f4f7fa]/80 text-[#5a6a7e] border-b border-[#e2e8f0] font-semibold">
                <tr>
                  <th className="p-3">Nomor PO</th>
                  <th className="p-3">Ref PR</th>
                  <th className="p-3">Vendor / Supplier</th>
                  <th className="p-3">Item Pengadaan</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Total / Estimasi</th>
                  <th className="p-3 text-right">Aksi Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {poList.length === 0 ? (
                  <tr><td colSpan={7} className="p-6 text-center text-slate-500">Belum ada PO yang diterbitkan.</td></tr>
                ) : (
                  poList.map(function(po, idx) {
                    return (
                      <tr key={idx} className="hover:bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm/40 transition">
                        <td className="p-3 font-mono font-bold text-[#003d79]">{po.nomor_po || "PO-" + po.id}</td>
                        <td className="p-3 font-mono text-[#5a6a7e]">{po.nomor_pr || "-"}</td>
                        <td className="p-3 font-semibold text-[#1a2332]">{po.vendor || "Vendor Utama"}</td>
                        <td className="p-3 text-[#1a2332]">{po.nama_barang || po.item_name}</td>
                        <td className="p-3 font-bold">{po.jumlah || po.qty || 1} {po.satuan || "PCS"}</td>
                        <td className="p-3 font-semibold text-emerald-400">Rp {Number(po.estimasi_harga || 0).toLocaleString("id-ID")}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={function() { openPrintPo(po); }}
                            className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 rounded text-[11px] font-semibold transition inline-flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            Cetak PO
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: LPB / GRN */}
      {activeTab === "lpb" && (
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1a2332]">Daftar Penerimaan Barang (LPB / GRN)</h2>
            <button onClick={function() { setIsLpbModalOpen(true); }} className="px-3 py-1.5 bg-[#003d79] text-white hover:bg-[#002a57] rounded-lg text-xs font-bold transition shadow">
              + Catat Penerimaan LPB
            </button>
          </div>
          <div className="bg-[#f4f7fa] border border-[#e2e8f0] rounded-xl overflow-x-auto shadow">
            <table className="w-full text-left text-xs text-[#5a6a7e] min-w-[700px]">
              <thead className="bg-[#f4f7fa]/80 text-[#5a6a7e] border-b border-[#e2e8f0] font-semibold">
                <tr>
                  <th className="p-3">Nomor LPB</th>
                  <th className="p-3">Ref PO</th>
                  <th className="p-3">Nama Barang</th>
                  <th className="p-3">Qty Diterima</th>
                  <th className="p-3">Kondisi</th>
                  <th className="p-3">Penerima & Lokasi</th>
                  <th className="p-3 text-right">Aksi Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {lpbList.length === 0 ? (
                  <tr><td colSpan={7} className="p-6 text-center text-slate-500">Belum ada penerimaan LPB yang dicatat.</td></tr>
                ) : (
                  lpbList.map(function(lpb, idx) {
                    return (
                      <tr key={idx} className="hover:bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm/40 transition">
                        <td className="p-3 font-mono font-bold text-emerald-400">{lpb.nomor_lpb || "LPB-" + lpb.id}</td>
                        <td className="p-3 font-mono text-[#5a6a7e]">{lpb.nomor_po || "-"}</td>
                        <td className="p-3 font-semibold text-[#1a2332]">{lpb.nama_barang || lpb.item_name}</td>
                        <td className="p-3 font-bold text-emerald-300">{lpb.jumlah_diterima || lpb.jumlah || 1} {lpb.satuan || "PCS"}</td>
                        <td className="p-3">
                          <span className={"px-2 py-0.5 rounded text-[10px] font-bold " + (lpb.kondisi === "BAIK" ? "bg-emerald-900/60 text-emerald-300 border border-emerald-800" : "bg-rose-900/60 text-rose-300 border border-rose-800")}>
                            {lpb.kondisi || "BAIK"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-[#1a2332]">{lpb.penerima || "Staff Gudang"}</div>
                          <div className="text-[10px] text-slate-500">{lpb.lokasi_simpan || "Gudang Utama"}</div>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={function() { openPrintBast(lpb); }}
                            className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded text-[11px] font-semibold transition inline-flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            Cetak BAST
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: STOK REAL-TIME */}
      {activeTab === "stok" && (
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#1a2332]">Inventaris & Stok Fisik Gudang</h2>
              <p className="text-xs text-[#5a6a7e]">Total {stokList.length} master part terdaftar di database logistik site.</p>
            </div>
            {/* Filter Chips */}
            <div className="flex items-center gap-2 bg-[#f4f7fa] p-1 rounded-lg border border-[#e2e8f0] text-xs">
              <button
                onClick={function() { setStockFilter("ALL"); }}
                className={"px-3 py-1 rounded transition " + (stockFilter === "ALL" ? "bg-[#003d79] text-white font-bold" : "text-[#5a6a7e] hover:text-[#1a2332]")}
              >
                Semua ({stokList.length})
              </button>
              <button
                onClick={function() { setStockFilter("LOW"); }}
                className={"px-3 py-1 rounded transition flex items-center gap-1 " + (stockFilter === "LOW" ? "bg-[#003d79] text-white font-bold" : "text-[#003d79] hover:text-amber-300")}
              >
                Menipis ({lowStockList.length})
              </button>
              <button
                onClick={function() { setStockFilter("OUT"); }}
                className={"px-3 py-1 rounded transition " + (stockFilter === "OUT" ? "bg-rose-500 text-white font-bold" : "text-rose-400 hover:text-rose-300")}
              >
                Habis (0)
              </button>
            </div>
          </div>

          <div className="bg-[#f4f7fa] border border-[#e2e8f0] rounded-xl overflow-x-auto shadow">
            <table className="w-full text-left text-xs text-[#5a6a7e] min-w-[750px]">
              <thead className="bg-[#f4f7fa]/80 text-[#5a6a7e] border-b border-[#e2e8f0] font-semibold">
                <tr>
                  <th className="p-3">Kode / Part No</th>
                  <th className="p-3">Nama Part & Kategori</th>
                  <th className="p-3">Lokasi Rak</th>
                  <th className="p-3 text-center">Stok Saat Ini</th>
                  <th className="p-3 text-center">Batas Min</th>
                  <th className="p-3">Status Stok</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStockList.length === 0 ? (
                  <tr><td colSpan={7} className="p-6 text-center text-slate-500">Tidak ada barang sesuai filter yang dipilih.</td></tr>
                ) : (
                  filteredStockList.map(function(item, idx) {
                    var curStok = Number(item.stok || 0);
                    var minStok = Number(item.min_stok || 0);
                    var isOut = curStok <= 0;
                    var isLow = curStok <= minStok;
                    return (
                      <tr key={idx} className={"transition " + (isOut ? "bg-rose-950/20 hover:bg-rose-950/40" : isLow ? "bg-amber-950/20 hover:bg-amber-950/40" : "hover:bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm/40")}>
                        <td className="p-3 font-mono font-bold text-[#003d79]">
                          {item.part_number || item.kode_barang || "ITEM-" + item.id}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-[#1a2332]">{item.nama_barang}</div>
                          <div className="text-[10px] text-[#5a6a7e]">{item.kategori || "Spareparts"}</div>
                        </td>
                        <td className="p-3 font-mono text-[#5a6a7e]">{item.lokasi_rak || item.lokasi || "RAK-01"}</td>
                        <td className="p-3 text-center">
                          <span className={"font-bold text-sm " + (isOut ? "text-rose-400 font-mono" : isLow ? "text-[#003d79] font-mono" : "text-emerald-400 font-mono")}>
                            {curStok} {item.satuan || "PCS"}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-[#5a6a7e]">{minStok} {item.satuan || "PCS"}</td>
                        <td className="p-3">
                          {isOut ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900/60 text-rose-300 border border-rose-800">
                              HABIS (0)
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/60 text-amber-300 border border-amber-800">
                              MENIPIS ({"<="} MIN)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-800">
                              AMAN
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {isLow ? (
                            <button
                              onClick={function() { handleQuickRestockPr(item); }}
                              className="px-2.5 py-1 bg-[#003d79] text-white hover:bg-[#002a57] rounded text-[11px] font-bold transition inline-flex items-center gap-1 shadow"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                              Restock PR
                            </button>
                          ) : (
                            <button
                              onClick={function() {
                                handleSelectBarangOpname(String(item.id));
                                setIsOpnameModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm hover:bg-slate-700 text-[#5a6a7e] border border-[#e2e8f0] rounded text-[11px] font-semibold transition"
                            >
                              Opname
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: STOCK OPNAME */}
      {activeTab === "opname" && (
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#1a2332]">Riwayat Stock Opname & Penyesuaian Stok</h2>
              <p className="text-xs text-[#5a6a7e]">Pencatatan audit fisik, rekonsiliasi selisih, dan log movement ADJUST.</p>
            </div>
            <button onClick={function() { setIsOpnameModalOpen(true); }} className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition shadow">
              + Mulai Stock Opname Baru
            </button>
          </div>
          <div className="bg-[#f4f7fa] border border-[#e2e8f0] rounded-xl overflow-x-auto shadow">
            <table className="w-full text-left text-xs text-[#5a6a7e] min-w-[700px]">
              <thead className="bg-[#f4f7fa]/80 text-[#5a6a7e] border-b border-[#e2e8f0] font-semibold">
                <tr>
                  <th className="p-3">Tanggal / Waktu</th>
                  <th className="p-3">Nama Part</th>
                  <th className="p-3 text-center">Sistem</th>
                  <th className="p-3 text-center">Fisik</th>
                  <th className="p-3 text-center">Selisih (Delta)</th>
                  <th className="p-3">Auditor & Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {opnameList.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-slate-500">Belum ada riwayat stock opname yang tercatat.</td></tr>
                ) : (
                  opnameList.map(function(op, idx) {
                    var delta = Number(op.selisih || (Number(op.stok_fisik || 0) - Number(op.stok_sistem || 0)));
                    return (
                      <tr key={idx} className="hover:bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm/40 transition">
                        <td className="p-3 font-mono text-[#5a6a7e]">
                          {op.created_at ? new Date(op.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                        </td>
                        <td className="p-3 font-semibold text-[#1a2332]">{op.nama_barang || "Sparepart"}</td>
                        <td className="p-3 text-center font-mono">{op.stok_sistem || 0}</td>
                        <td className="p-3 text-center font-mono font-bold text-[#003d79]">{op.stok_fisik || 0}</td>
                        <td className="p-3 text-center font-mono">
                          <span className={"px-2 py-0.5 rounded text-[10px] font-bold " + (delta > 0 ? "bg-emerald-900/60 text-emerald-300 border border-emerald-800" : delta < 0 ? "bg-rose-900/60 text-rose-300 border border-rose-800" : "bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm text-[#5a6a7e]")}>
                            {delta > 0 ? "+" + delta : delta}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-[#5a6a7e]">{op.auditor || "Auditor Gudang"}</div>
                          <div className="text-[10px] text-slate-500">{op.alasan || op.catatan || "Penyesuaian Fisik Bulanan"}</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: PR */}
      {isPrModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#f4f7fa]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#f4f7fa] border border-[#e2e8f0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <h3 className="text-base font-bold text-[#1a2332] flex items-center gap-2">
                <svg className="w-5 h-5 text-[#003d79]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                Buat Purchase Request (PR)
              </h3>
              <button onClick={function() { setIsPrModalOpen(false); }} className="text-[#5a6a7e] hover:text-[#1a2332]">?</button>
            </div>
            <form onSubmit={handleSubmitPr} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Nomor PR</label>
                  <input type="text" value={prForm.nomor_pr} onChange={function(e) { setPrForm({ ...prForm, nomor_pr: e.target.value }); }} placeholder="Auto / PR-2026-..." className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" required />
                </div>
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Unit Code</label>
                  <input type="text" value={prForm.unit_code} onChange={function(e) { setPrForm({ ...prForm, unit_code: e.target.value }); }} placeholder="DT-01, EX-200, dsb" className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" required />
                </div>
              </div>
              <div>
                <label className="block text-[#5a6a7e] font-semibold mb-1">Nama Barang / Sparepart</label>
                <input type="text" value={prForm.nama_barang} onChange={function(e) { setPrForm({ ...prForm, nama_barang: e.target.value }); }} placeholder="Filter Oli, Tyre 24R, dsb" className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Part Number</label>
                  <input type="text" value={prForm.part_number} onChange={function(e) { setPrForm({ ...prForm, part_number: e.target.value }); }} placeholder="PN-..." className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" />
                </div>
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Jumlah (Qty)</label>
                  <input type="number" min="1" value={prForm.jumlah} onChange={function(e) { setPrForm({ ...prForm, jumlah: Number(e.target.value) }); }} className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" required />
                </div>
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Satuan</label>
                  <select value={prForm.satuan} onChange={function(e) { setPrForm({ ...prForm, satuan: e.target.value }); }} className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]">
                    <option value="PCS">PCS</option>
                    <option value="SET">SET</option>
                    <option value="LITER">LITER</option>
                    <option value="BOX">BOX</option>
                    <option value="DRUM">DRUM</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[#5a6a7e] font-semibold mb-1">Prioritas</label>
                <select value={prForm.prioritas} onChange={function(e) { setPrForm({ ...prForm, prioritas: e.target.value }); }} className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]">
                  <option value="NORMAL">NORMAL - Kebutuhan Terjadwal</option>
                  <option value="HIGH">HIGH - Stok Kritis</option>
                  <option value="URGENT">URGENT - Breakdown Unit (BD)</option>
                </select>
              </div>
              <div>
                <label className="block text-[#5a6a7e] font-semibold mb-1">Keterangan Tambahan</label>
                <textarea value={prForm.keterangan} onChange={function(e) { setPrForm({ ...prForm, keterangan: e.target.value }); }} rows={2} placeholder="Justifikasi kebutuhan..." className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]"></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
                <button type="button" onClick={function() { setIsPrModalOpen(false); }} className="px-4 py-2 bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm text-[#5a6a7e] rounded-lg hover:bg-slate-700 transition">Batal</button>
                <button type="submit" className="px-4 py-2 bg-[#003d79] text-white hover:bg-[#002a57] font-bold rounded-lg transition">Simpan & Kirim PR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PO */}
      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#f4f7fa]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#f4f7fa] border border-[#e2e8f0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <h3 className="text-base font-bold text-[#1a2332] flex items-center gap-2">
                <svg className="w-5 h-5 text-[#003d79]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Terbitkan Purchase Order (PO)
              </h3>
              <button onClick={function() { setIsPoModalOpen(false); }} className="text-[#5a6a7e] hover:text-[#1a2332]">?</button>
            </div>
            <form onSubmit={handleSubmitPo} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Nomor PO</label>
                  <input type="text" value={poForm.nomor_po} onChange={function(e) { setPoForm({ ...poForm, nomor_po: e.target.value }); }} placeholder="PO-2026-..." className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" required />
                </div>
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Ref Nomor PR</label>
                  <input type="text" value={poForm.nomor_pr} onChange={function(e) { setPoForm({ ...poForm, nomor_pr: e.target.value }); }} placeholder="PR-..." className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" required />
                </div>
              </div>
              <div>
                <label className="block text-[#5a6a7e] font-semibold mb-1">Vendor / Supplier</label>
                <input type="text" value={poForm.vendor} onChange={function(e) { setPoForm({ ...poForm, vendor: e.target.value }); }} placeholder="PT. United Tractors, dsb" className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" required />
              </div>
              <div>
                <label className="block text-[#5a6a7e] font-semibold mb-1">Nama Barang</label>
                <input type="text" value={poForm.nama_barang} onChange={function(e) { setPoForm({ ...poForm, nama_barang: e.target.value }); }} placeholder="Item yang dipesan" className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Jumlah</label>
                  <input type="number" min="1" value={poForm.jumlah} onChange={function(e) { setPoForm({ ...poForm, jumlah: Number(e.target.value) }); }} className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" required />
                </div>
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Satuan</label>
                  <input type="text" value={poForm.satuan} onChange={function(e) { setPoForm({ ...poForm, satuan: e.target.value }); }} className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" />
                </div>
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Estimasi Total (Rp)</label>
                  <input type="number" min="0" value={poForm.estimasi_harga} onChange={function(e) { setPoForm({ ...poForm, estimasi_harga: Number(e.target.value) }); }} className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
                <button type="button" onClick={function() { setIsPoModalOpen(false); }} className="px-4 py-2 bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm text-[#5a6a7e] rounded-lg hover:bg-slate-700 transition">Batal</button>
                <button type="submit" className="px-4 py-2 bg-[#003d79] text-white hover:bg-[#002a57] font-bold rounded-lg transition">Terbitkan PO</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LPB */} 
      {isLpbModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#f4f7fa]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#f4f7fa] border border-[#e2e8f0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <h3 className="text-base font-bold text-[#1a2332] flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                Pencatatan Penerimaan Barang (LPB / GRN)
              </h3>
              <button onClick={function() { setIsLpbModalOpen(false); }} className="text-[#5a6a7e] hover:text-[#1a2332]">?</button>
            </div>
            <form onSubmit={handleSubmitLpb} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Nomor LPB</label>
                  <input type="text" value={lpbForm.nomor_lpb} onChange={function(e) { setLpbForm({ ...lpbForm, nomor_lpb: e.target.value }); }} placeholder="LPB-2026-..." className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" required />
                </div>
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Ref Nomor PO</label>
                  <input type="text" value={lpbForm.nomor_po} onChange={function(e) { setLpbForm({ ...lpbForm, nomor_po: e.target.value }); }} placeholder="PO-..." className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" required />
                </div>
              </div>
              <div>
                <label className="block text-[#5a6a7e] font-semibold mb-1">Nama Barang Diterima</label>
                <input type="text" value={lpbForm.nama_barang} onChange={function(e) { setLpbForm({ ...lpbForm, nama_barang: e.target.value }); }} placeholder="Nama sparepart / material" className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Qty Diterima</label>
                  <input type="number" min="1" value={lpbForm.jumlah_diterima} onChange={function(e) { setLpbForm({ ...lpbForm, jumlah_diterima: Number(e.target.value) }); }} className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" required />
                </div>
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Satuan</label>
                  <input type="text" value={lpbForm.satuan} onChange={function(e) { setLpbForm({ ...lpbForm, satuan: e.target.value }); }} className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" />
                </div>
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Kondisi Fisik</label>
                  <select value={lpbForm.kondisi} onChange={function(e) { setLpbForm({ ...lpbForm, kondisi: e.target.value }); }} className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]">
                    <option value="BAIK">BAIK & LENGKAP</option>
                    <option value="RUSAK">RUSAK / CACAT</option>
                    <option value="KURANG">KURANG / PARTIAL</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Lokasi Penyimpanan</label>
                  <input type="text" value={lpbForm.lokasi_simpan} onChange={function(e) { setLpbForm({ ...lpbForm, lokasi_simpan: e.target.value }); }} placeholder="RAK-A1, RAK-B2, dsb" className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" />
                </div>
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Petugas Penerima</label>
                  <input type="text" value={lpbForm.penerima} onChange={function(e) { setLpbForm({ ...lpbForm, penerima: e.target.value }); }} placeholder="Nama Checker Gudang" className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" required />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
                <button type="button" onClick={function() { setIsLpbModalOpen(false); }} className="px-4 py-2 bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm text-[#5a6a7e] rounded-lg hover:bg-slate-700 transition">Batal</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition">Simpan & Update Stok</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: OPNAME */} 
      {isOpnameModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#f4f7fa]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#f4f7fa] border border-[#e2e8f0] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <h3 className="text-base font-bold text-[#1a2332] flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                Penyesuaian Fisik (Stock Opname)
              </h3>
              <button onClick={function() { setIsOpnameModalOpen(false); }} className="text-[#5a6a7e] hover:text-[#1a2332]">?</button>
            </div>
            <form onSubmit={handleSubmitOpname} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5a6a7e] font-semibold mb-1">Pilih Part dari Master Stok</label>
                <select
                  value={opnameForm.barang_id}
                  onChange={function(e) { handleSelectBarangOpname(e.target.value); }}
                  className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332] font-semibold"
                  required
                >
                  <option value="">-- Pilih Barang yang Diaudit --</option>
                  {stokList.map(function(s) {
                    return (
                      <option key={s.id} value={s.id}>
                        {s.nama_barang} ({s.part_number || s.kode_barang || "ID: " + s.id}) - Stok Sistem: {s.stok || 0}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Stok Tercatat Sistem</label>
                  <input type="number" value={opnameForm.stok_sistem} readOnly className="w-full bg-[#f4f7fa]/60 border border-[#e2e8f0] rounded-lg p-2.5 text-[#5a6a7e] font-mono font-bold" />
                </div>
                <div>
                  <label className="block text-[#003d79] font-semibold mb-1">Hasil Hitung Fisik Nyata</label>
                  <input
                    type="number"
                    min="0"
                    value={opnameForm.stok_fisik}
                    onChange={function(e) { setOpnameForm({ ...opnameForm, stok_fisik: Number(e.target.value) }); }}
                    className="w-full bg-[#f4f7fa] border border-amber-500/60 rounded-lg p-2.5 text-amber-300 font-mono font-bold text-sm"
                    required
                  />
                </div>
              </div>
              <div className="p-3 bg-[#f4f7fa] rounded-lg border border-[#e2e8f0] flex items-center justify-between">
                <span className="text-[#5a6a7e] font-semibold">Deviasi / Selisih Penyesuaian:</span>
                <span className={"font-mono font-bold text-sm " + (Number(opnameForm.stok_fisik) - Number(opnameForm.stok_sistem) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {Number(opnameForm.stok_fisik) - Number(opnameForm.stok_sistem) > 0 ? "+" : ""}
                  {Number(opnameForm.stok_fisik) - Number(opnameForm.stok_sistem)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Lokasi Rak Aktual</label>
                  <input type="text" value={opnameForm.lokasi_rak} onChange={function(e) { setOpnameForm({ ...opnameForm, lokasi_rak: e.target.value }); }} placeholder="RAK-01..." className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" />
                </div>
                <div>
                  <label className="block text-[#5a6a7e] font-semibold mb-1">Nama Auditor</label>
                  <input type="text" value={opnameForm.auditor} onChange={function(e) { setOpnameForm({ ...opnameForm, auditor: e.target.value }); }} placeholder="Auditor / GL Logistik" className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" required />
                </div>
              </div>
              <div>
                <label className="block text-[#5a6a7e] font-semibold mb-1">Alasan Penyesuaian / Catatan</label>
                <textarea value={opnameForm.alasan} onChange={function(e) { setOpnameForm({ ...opnameForm, alasan: e.target.value }); }} rows={2} placeholder="Misal: Selisih fisik audit akhir bulan / salah catat LPB sebelumnya" className="w-full bg-[#f4f7fa] border border-[#e2e8f0] rounded-lg p-2.5 text-[#1a2332]" required></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
                <button type="button" onClick={function() { setIsOpnameModalOpen(false); }} className="px-4 py-2 bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm text-[#5a6a7e] rounded-lg hover:bg-slate-700 transition">Batal</button>
                <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition">Rekonsiliasi & Update Stok</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL DOCUMENT PRINT PREVIEW MODAL (Task #5 & #6) */}
      {printDoc.isOpen && (
        <div className="fixed inset-0 z-50 bg-[#f4f7fa]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 border border-slate-300 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none">
            
            {/* Header Document */}
            <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">PT. BOSTON PPA - MLP</h2>
                <p className="text-[11px] text-slate-600 font-semibold">MINING CONTRACTOR & HEAVY EQUIPMENT SERVICES</p>
                <p className="text-[10px] text-slate-500">Site Project: Muara Lawa Project (MLP) � Kalimantan Timur</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-[#f4f7fa] text-white text-xs font-black tracking-wider uppercase rounded">
                  {printDoc.docType === "DO" ? "SURAT JALAN / DO" : printDoc.docType === "PO" ? "PURCHASE ORDER (PO)" : "BAST / LPB"}
                </span>
                <div className="font-mono text-xs font-bold text-slate-800 mt-1">{printDoc.docNumber}</div>
              </div>
            </div>

            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 font-semibold block">Tanggal Dokumen:</span>
                <span className="font-bold text-slate-800">{printDoc.date}</span>
                <span className="text-slate-500 font-semibold block mt-1.5">No. Referensi:</span>
                <span className="font-mono font-bold text-slate-800">{printDoc.reference}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">
                  {printDoc.docType === "PO" ? "Ditujukan Kepada (Vendor):" : "Tujuan / Penerima:"}
                </span>
                <span className="font-bold text-slate-800">{printDoc.recipientOrVendor}</span>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                  <tr>
                    <th className="p-2.5 border-r border-slate-300 w-10 text-center">No</th>
                    <th className="p-2.5 border-r border-slate-300">Deskripsi Barang & Part Number</th>
                    <th className="p-2.5 border-r border-slate-300 w-20 text-center">Qty</th>
                    <th className="p-2.5 border-r border-slate-300 w-20 text-center">Satuan</th>
                    <th className="p-2.5">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printDoc.items.map(function(item, idx) {
                    return (
                      <tr key={idx}>
                        <td className="p-2.5 border-r border-slate-300 text-center font-mono">{idx + 1}</td>
                        <td className="p-2.5 border-r border-slate-300 font-semibold text-slate-900">
                          {item.nama}
                          {item.kode && <span className="block text-[10px] font-mono text-slate-500">{item.kode}</span>}
                        </td>
                        <td className="p-2.5 border-r border-slate-300 text-center font-bold font-mono text-slate-900">{item.qty}</td>
                        <td className="p-2.5 border-r border-slate-300 text-center font-semibold text-slate-700">{item.satuan || "PCS"}</td>
                        <td className="p-2.5 text-slate-600 text-[11px]">{item.keterangan || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Catatan */}
            {printDoc.catatan && (
              <div className="text-[11px] text-slate-600 bg-amber-50 p-2.5 rounded border border-amber-200">
                <span className="font-bold text-amber-900">Catatan: </span> {printDoc.catatan}
              </div>
            )}

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-3 text-center pt-2">
              <div className="space-y-12 border border-slate-200 p-2.5 rounded">
                <div className="text-[10px] font-bold text-slate-600 uppercase">{printDoc.signatories.maker.title}</div>
                <div className="font-bold text-xs text-slate-900 border-t border-slate-400 pt-1">({printDoc.signatories.maker.name})</div>
              </div>
              <div className="space-y-12 border border-slate-200 p-2.5 rounded">
                <div className="text-[10px] font-bold text-slate-600 uppercase">{printDoc.signatories.checker.title}</div>
                <div className="font-bold text-xs text-slate-900 border-t border-slate-400 pt-1">({printDoc.signatories.checker.name})</div>
              </div>
              <div className="space-y-12 border border-slate-200 p-2.5 rounded">
                <div className="text-[10px] font-bold text-slate-600 uppercase">{printDoc.signatories.approver.title}</div>
                <div className="font-bold text-xs text-slate-900 border-t border-slate-400 pt-1">({printDoc.signatories.approver.name})</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 print:hidden">
              <button
                type="button"
                onClick={function() { setPrintDoc({ ...printDoc, isOpen: false }); }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition"
              >
                Tutup Preview
              </button>
              <button
                type="button"
                onClick={function() { window.print(); }}
                className="px-4 py-2 bg-[#f4f7fa] hover:bg-white rounded-[14px] border border-[#e2e8f0] shadow-sm text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Cetak / Simpan PDF
              </button>
            </div>

          </div>
        </div>
      )}

    
      {/* Standard App Footer */}
      <footer className="mt-8 mb-20 sm:mb-6 text-center text-xs text-[#8896a7] italic opacity-60">
        <p>BTM Mobile APP V1.7.0</p>
        <p className="text-[10px]">Powered By rck_Production</p>
      </footer>

      </div>
  );
}
