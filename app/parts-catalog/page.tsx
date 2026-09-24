"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function PartsCatalogPage() {
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [selectedAssembly, setSelectedAssembly] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [cart, setCart] = useState<any[]>([]);
  const [showBulkOrder, setShowBulkOrder] = useState(false);

  // Single Order Modal State
  const [orderPart, setOrderPart] = useState<any | null>(null);
  const [orderQty, setOrderQty] = useState(1);
  const [orderMachine, setOrderMachine] = useState("");
  const [orderPrioritas, setOrderPrioritas] = useState("Normal");
  const [orderKeterangan, setOrderKeterangan] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderMsg, setOrderMsg] = useState<string | null>(null);

  // Bulk Order Form
  const [bulkMachine, setBulkMachine] = useState("");
  const [bulkPrioritas, setBulkPrioritas] = useState("Normal");
  const [bulkKeterangan, setBulkKeterangan] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  // Load Catalog Units on Mount
  useEffect(() => {
    fetch("/api/logistik/master-part?limit=100")
      .then((r) => r.json())
      .then((d) => {
        if (d.parts) {
          const uMap = new Map();
          d.parts.forEach((p: any) => {
            const m = p.model_kompatibel || "GENERAL";
            if (!uMap.has(m)) {
              uMap.set(m, { unit_code: m, unit_name: m, assemblies: [] });
            }
          });
          setUnits(Array.from(uMap.values()));
        }
      })
      .catch(console.error);
  }, []);

  // Fetch Assemblies / Parts for Selected Unit
  const handleSelectUnit = (unit: any) => {
    setSelectedUnit(unit);
    setLoading(true);
    fetch("/api/logistik/master-part?search=" + encodeURIComponent(unit.unit_code))
      .then((r) => r.json())
      .then((d) => {
        setItems(d.parts || []);
        setSelectedAssembly({ assembly_name: unit.unit_code + " All Assemblies" });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Search Part
  const doSearch = () => {
    if (!search.trim()) return;
    setLoading(true);
    fetch("/api/logistik/master-part?search=" + encodeURIComponent(search.trim()))
      .then((r) => r.json())
      .then((d) => setSearchResults(d.parts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Direct Order Single Part to Logistics PR
  const submitSingleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderPart) return;
    setOrderSubmitting(true);
    setOrderMsg(null);
    try {
      const res = await fetch("/api/logistik/pr/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_code: orderMachine || selectedUnit?.unit_code || "GENERAL",
          prioritas: orderPrioritas.toUpperCase(),
          keterangan: orderKeterangan || "Order dari Parts Catalog",
          items: [
            {
              part_number: orderPart.part_number,
              part_name: orderPart.part_name,
              qty_request: Number(orderQty),
              satuan: orderPart.satuan || "PCS",
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat PR");
      setOrderMsg("Berhasil! PR dibuat: " + data.pr_number);
      setTimeout(() => {
        setOrderPart(null);
        setOrderMsg(null);
      }, 1500);
    } catch (err: any) {
      setOrderMsg("Error: " + err.message);
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Submit Bulk Cart Order to Logistics PR
  const submitBulkOrder = async () => {
    if (cart.length === 0) return;
    setBulkSubmitting(true);
    setBulkMsg(null);
    try {
      const res = await fetch("/api/logistik/pr/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_code: bulkMachine || selectedUnit?.unit_code || "GENERAL",
          prioritas: bulkPrioritas.toUpperCase(),
          keterangan: bulkKeterangan || "Bulk Order dari Keranjang Parts Catalog",
          items: cart.map((c) => ({
            part_number: c.part_number,
            part_name: c.part_name,
            qty_request: Number(c.qty),
            satuan: c.satuan || "PCS",
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat PR");
      setBulkMsg("Sukses! PR dibuat: " + data.pr_number);
      setCart([]);
      setTimeout(() => {
        setShowBulkOrder(false);
        setBulkMsg(null);
      }, 1500);
    } catch (err: any) {
      setBulkMsg("Error: " + err.message);
    } finally {
      setBulkSubmitting(false);
    }
  };

  const addToCart = (item: any) => {
    setCart((prev) => {
      const exists = prev.find((p) => p.part_number === item.part_number);
      if (exists) {
        return prev.map((p) => (p.part_number === item.part_number ? { ...p, qty: p.qty + 1 } : p));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-28">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/logistik"
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900 border border-slate-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
              Interactive Parts Catalog
            </h1>
            <p className="text-xs text-slate-400">
              Katalog suku cadang unit alat berat & order langsung ke sistem Logistik PR
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              onClick={() => setShowBulkOrder(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 hover:bg-emerald-400 transition-all flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Keranjang ({cart.length})
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Catalog Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left Panel: Unit Explorer */}
        <div className="md:col-span-4 bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pilih Model / Unit</h2>
          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {units.map((u) => (
              <button
                key={u.unit_code}
                onClick={() => handleSelectUnit(u)}
                className={"w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between " +
                  (selectedUnit?.unit_code === u.unit_code
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800/80")}
              >
                <span>{u.unit_code}</span>
                <span className="text-[10px] opacity-75">{u.unit_name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel: Parts Listing for Selected Unit */}
        <div className="md:col-span-8 bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">
                {selectedUnit ? "Daftar Part: " + selectedUnit.unit_code : "Pilih unit di panel sebelah kiri"}
              </h2>
              <p className="text-xs text-slate-400">Total {items.length} item suku cadang terdaftar</p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Cari part..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={doSearch}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400"
              >
                Cari
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-500 text-xs">Memuat katalog parts...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              Pilih model unit di panel kiri untuk melihat daftar suku cadang.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3 font-medium">Part Number</th>
                    <th className="p-3 font-medium">Nama Part</th>
                    <th className="p-3 font-medium">Kategori</th>
                    <th className="p-3 font-medium text-center">Aksi Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {items.map((it) => (
                    <tr key={it.part_number} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-amber-300">{it.part_number}</td>
                      <td className="p-3 text-slate-200">{it.part_name}</td>
                      <td className="p-3 text-slate-400">{it.kategori || "-"}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setOrderPart(it);
                              setOrderQty(1);
                              setOrderMachine(selectedUnit?.unit_code || "");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-bold text-[11px] border border-amber-500/30"
                          >
                            Order Langsung
                          </button>
                          <button
                            onClick={() => addToCart(it)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] border border-slate-700"
                          >
                            + Cart
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* SINGLE ORDER MODAL */}
      {orderPart && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">Order Part (Kirim ke PR Logistik)</h2>
              <button onClick={() => setOrderPart(null)} className="text-slate-400 hover:text-white">?</button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <p className="font-mono font-bold text-amber-300">{orderPart.part_number}</p>
              <p className="text-white">{orderPart.part_name}</p>
            </div>

            <form onSubmit={submitSingleOrder} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Kode Unit Target</label>
                <input
                  type="text"
                  value={orderMachine}
                  onChange={(e) => setOrderMachine(e.target.value)}
                  placeholder="Contoh: DT3005"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Qty Request</label>
                  <input
                    type="number"
                    min="1"
                    value={orderQty}
                    onChange={(e) => setOrderQty(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Prioritas</label>
                  <select
                    value={orderPrioritas}
                    onChange={(e) => setOrderPrioritas(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Keterangan / Gejala Kerusakan</label>
                <textarea
                  value={orderKeterangan}
                  onChange={(e) => setOrderKeterangan(e.target.value)}
                  placeholder="Catatan tambahan..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {orderMsg && (
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold text-center">
                  {orderMsg}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderPart(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={orderSubmitting}
                  className="flex-1 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-50"
                >
                  {orderSubmitting ? "Mengirim PR..." : "Kirim PR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK CART MODAL */}
      {showBulkOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">Keranjang Order Parts ({cart.length} item)</h2>
              <button onClick={() => setShowBulkOrder(false)} className="text-slate-400 hover:text-white">?</button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cart.map((c, idx) => (
                <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <p className="font-mono font-bold text-amber-300">{c.part_number}</p>
                    <p className="text-slate-300 text-[11px]">{c.part_name}</p>
                  </div>
                  <span className="font-bold text-white">{c.qty} {c.satuan || "PCS"}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 text-xs border-t border-slate-800 pt-3">
              <div>
                <label className="block text-slate-400 mb-1">Unit Target</label>
                <input
                  type="text"
                  value={bulkMachine}
                  onChange={(e) => setBulkMachine(e.target.value)}
                  placeholder="Contoh: PC200-7"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {bulkMsg && (
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-bold text-center">
                  {bulkMsg}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold"
                >
                  Kosongkan
                </button>
                <button
                  type="button"
                  onClick={submitBulkOrder}
                  disabled={bulkSubmitting || cart.length === 0}
                  className="flex-1 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 disabled:opacity-50"
                >
                  {bulkSubmitting ? "Mengirim PR Massal..." : "Kirim " + cart.length + " Part ke PR"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
