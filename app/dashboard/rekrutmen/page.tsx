"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface Position {
  id: number;
  judul_posisi: string;
  departemen: string;
  site: string;
  is_active: boolean;
  total_pelamar?: number;
}

interface Applicant {
  id: number;
  nama_lengkap: string;
  email: string;
  no_hp: string;
  posisi_dilamar: string;
  status: string;
  created_at: string;
  ktp_url?: string;
  cv_url?: string;
  hired_nrp?: string;
}

export default function HRRekrutmenPage() {
  const [activeTab, setActiveTab] = useState<"applicants" | "positions">("applicants");
  const [positions, setPositions] = useState<Position[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Hire State
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [hireModalOpen, setHireModalOpen] = useState(false);
  const [hireForm, setHireForm] = useState({
    custom_nrp: "",
    site: "PPA-MLP",
    department: "OPERATIONAL",
    jabatan: "",
    status_kerja: "PKWT",
    tanggal_masuk: new Date().toISOString().split("T")[0],
  });
  const [submittingHire, setSubmittingHire] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form Tambah Posisi
  const [newPosTitle, setNewPosTitle] = useState("");
  const [newPosDept, setNewPosDept] = useState("PLANT");
  const [newPosSite, setNewPosSite] = useState("PPA-MLP");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rekrutmen");
      const data = await res.json();
      if (data.positions) setPositions(data.positions);
      if (data.applicants) setApplicants(data.applicants);
    } catch (err) {
      console.error("Fetch rekrutmen error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const togglePosition = async (id: number, currentStatus: boolean) => {
    try {
      await fetch("/api/rekrutmen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !currentStatus }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosTitle) return;
    try {
      await fetch("/api/rekrutmen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judul_posisi: newPosTitle,
          departemen: newPosDept,
          site: newPosSite,
        }),
      });
      setNewPosTitle("");
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateApplicantStatus = async (id: number, newStatus: string) => {
    try {
      await fetch("/api/rekrutmen", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openHireModal = (app: Applicant) => {
    setSelectedApplicant(app);
    setHireForm({
      custom_nrp: "",
      site: "PPA-MLP",
      department: "OPERATIONAL",
      jabatan: app.posisi_dilamar || "OPERATOR",
      status_kerja: "PKWT",
      tanggal_masuk: new Date().toISOString().split("T")[0],
    });
    setHireModalOpen(true);
  };

  const handleConvertHire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplicant) return;

    setSubmittingHire(true);
    setActionMsg(null);

    try {
      const res = await fetch("/api/rekrutmen/convert-hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_id: selectedApplicant.id,
          ...hireForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal konversi karyawan");

      setActionMsg({
        text: "Karyawan berhasil dibuat! NRP: " + data.employee.nrp + " (" + data.employee.nama + ")",
        type: "success",
      });

      setHireModalOpen(false);
      fetchData();
    } catch (err: any) {
      setActionMsg({ text: err.message, type: "error" });
    } finally {
      setSubmittingHire(false);
    }
  };

  const filteredApplicants = applicants.filter((a) => {
    const matchStatus = filterStatus === "ALL" || a.status === filterStatus;
    const matchSearch =
      (a.nama_lengkap || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.posisi_dilamar || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-28">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
              Recruitment Center & 1-Click Hire
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Kelola lowongan publik & konversi pelamar lulus langsung menjadi Karyawan resmi
          </p>
        </div>

        {/* Action Link to Public Portal */}
        <a
          href="/rekrutmen"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold text-xs hover:bg-amber-500/20 transition-all shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Buka Form Publik Pelamar
        </a>
      </div>

      {/* Alert Banner */}
      {actionMsg && (
        <div
          className={"max-w-6xl mx-auto mb-4 p-4 rounded-xl border flex items-center justify-between " +
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

      {/* Tabs */}
      <div className="max-w-6xl mx-auto mb-6 flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("applicants")}
          className={"px-4 py-2 rounded-xl text-xs font-bold transition-all " +
            (activeTab === "applicants"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800")}
        >
          Daftar Pelamar ({applicants.length})
        </button>
        <button
          onClick={() => setActiveTab("positions")}
          className={"px-4 py-2 rounded-xl text-xs font-bold transition-all " +
            (activeTab === "positions"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800")}
        >
          Kelola Lowongan ({positions.length})
        </button>
      </div>

      {/* TAB 1: DAFTAR PELAMAR */}
      {activeTab === "applicants" && (
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Filter & Search Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Cari nama, posisi, atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <div className="flex gap-1 overflow-x-auto md:col-span-2">
              {["ALL", "PENDING", "INTERVIEW", "MCU", "LULUS", "HIRED", "DITOLAK"].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={"px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all " +
                    (filterStatus === st
                      ? "bg-slate-200 text-slate-950"
                      : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white")}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Table / List */}
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-xs">Memuat data pelamar...</div>
          ) : filteredApplicants.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800/80 p-6 text-slate-500 text-xs">
              Belum ada data pelamar untuk filter ini.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApplicants.map((app) => (
                <div
                  key={app.id}
                  className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-slate-700 transition-all"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white">{app.nama_lengkap}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-500/20">
                        {app.posisi_dilamar}
                      </span>
                      <span
                        className={"text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase " +
                          (app.status === "HIRED"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : app.status === "LULUS"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : app.status === "DITOLAK"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30")}
                      >
                        {app.status}
                      </span>
                      {app.hired_nrp && (
                        <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-emerald-300">
                          NRP: {app.hired_nrp}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      <span>?? {app.email || "-"}</span>
                      <span>?? {app.no_hp || "-"}</span>
                      <span>?? {new Date(app.created_at).toLocaleDateString("id-ID")}</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      {app.ktp_url && (
                        <a
                          href={app.ktp_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-amber-400 hover:underline"
                        >
                          ?? Lihat KTP
                        </a>
                      )}
                      {app.cv_url && (
                        <a
                          href={app.cv_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-amber-400 hover:underline"
                        >
                          ?? Lihat CV
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap border-t border-slate-800/80 pt-3 md:pt-0 md:border-none">
                    {/* Status Dropdown */}
                    <select
                      value={app.status}
                      onChange={(e) => updateApplicantStatus(app.id, e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="INTERVIEW">INTERVIEW</option>
                      <option value="MCU">MCU</option>
                      <option value="LULUS">LULUS</option>
                      <option value="DITOLAK">DITOLAK</option>
                      <option value="HIRED">HIRED</option>
                    </select>

                    {/* 1-CLICK HIRE BUTTON */}
                    {(app.status === "LULUS" || app.status === "INTERVIEW" || app.status === "MCU") && (
                      <button
                        onClick={() => openHireModal(app)}
                        className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        1-Click Hire
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: KELOLA LOWONGAN */}
      {activeTab === "positions" && (
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Create Form */}
          <form
            onSubmit={handleCreatePosition}
            className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-4 md:p-5"
          >
            <h2 className="text-sm font-bold text-white mb-3">Tambah Lowongan Baru</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Judul Posisi (contoh: Mekanik HD)"
                value={newPosTitle}
                onChange={(e) => setNewPosTitle(e.target.value)}
                className="md:col-span-2 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              />
              <select
                value={newPosDept}
                onChange={(e) => setNewPosDept(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="PLANT">PLANT</option>
                <option value="OPERATIONAL">OPERATIONAL</option>
                <option value="SHE">SHE</option>
                <option value="HRGA">HRGA</option>
                <option value="LOGISTIK">LOGISTIK</option>
                <option value="FAT">FAT</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-all"
              >
                + Buka Lowongan
              </button>
            </div>
          </form>

          {/* Position List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {positions.map((pos) => (
              <div
                key={pos.id}
                className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <h3 className="text-sm font-bold text-white">{pos.judul_posisi}</h3>
                  <p className="text-xs text-slate-400">
                    Dept: {pos.departemen} | Site: {pos.site}
                  </p>
                </div>
                <button
                  onClick={() => togglePosition(pos.id, pos.is_active)}
                  className={"px-3 py-1.5 rounded-xl text-xs font-bold transition-all " +
                    (pos.is_active
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700")}
                >
                  {pos.is_active ? "? Buka" : "? Tutup"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1-CLICK HIRE */}
      {hireModalOpen && selectedApplicant && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span className="text-emerald-400">?</span> Konversi Jadi Karyawan
              </h2>
              <button
                onClick={() => setHireModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ?
              </button>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1">
              <p className="text-slate-300">
                <span className="text-slate-500">Nama:</span> <span className="font-bold text-white">{selectedApplicant.nama_lengkap}</span>
              </p>
              <p className="text-slate-300">
                <span className="text-slate-500">Posisi:</span> {selectedApplicant.posisi_dilamar}
              </p>
            </div>

            <form onSubmit={handleConvertHire} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">NRP Karyawan (Kosongkan utk Auto-Gen)</label>
                <input
                  type="text"
                  placeholder="Otomatis (contoh: 2600001)"
                  value={hireForm.custom_nrp}
                  onChange={(e) => setHireForm({ ...hireForm, custom_nrp: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Site Penempatan</label>
                  <select
                    value={hireForm.site}
                    onChange={(e) => setHireForm({ ...hireForm, site: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="PPA-MLP">PPA-MLP</option>
                    <option value="HO PUSAT">HO PUSAT</option>
                    <option value="SITE SEPAKU">SITE SEPAKU</option>
                    <option value="SITE BENGALON">SITE BENGALON</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Departemen</label>
                  <select
                    value={hireForm.department}
                    onChange={(e) => setHireForm({ ...hireForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="PLANT">PLANT</option>
                    <option value="OPERATIONAL">OPERATIONAL</option>
                    <option value="SHE">SHE</option>
                    <option value="HRGA">HRGA</option>
                    <option value="LOGISTIK">LOGISTIK</option>
                    <option value="FAT">FAT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Status Kerja</label>
                  <select
                    value={hireForm.status_kerja}
                    onChange={(e) => setHireForm({ ...hireForm, status_kerja: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="PKWT">PKWT</option>
                    <option value="PROBATION">PROBATION</option>
                    <option value="TETAP">TETAP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Tanggal Masuk</label>
                  <input
                    type="date"
                    value={hireForm.tanggal_masuk}
                    onChange={(e) => setHireForm({ ...hireForm, tanggal_masuk: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setHireModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingHire}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:brightness-110 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20"
                >
                  {submittingHire ? "Memproses..." : "Konfirmasi Hire"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
