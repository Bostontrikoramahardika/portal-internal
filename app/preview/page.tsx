'use client'

import { useState } from 'react'

export default function PreviewPage() {
  const [page, setPage] = useState<'kpi' | 'pengajuan' | 'approval'>('kpi')

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; background: #f1f5f9 !important; color: #0f172a; font-size: 14px; padding-bottom: 70px; }
        .preview-header { background: #fff; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10; }
        .header-left { display: flex; align-items: center; gap: 8px; }
        .header-logo { width: 28px; height: 28px; background: #1e40af; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; }
        .header-title { font-size: 13px; font-weight: 700; color: #0f172a; }
        .header-sub { font-size: 10px; color: #64748b; }
        .header-right { display: flex; align-items: center; gap: 8px; }
        .header-user { text-align: right; }
        .header-name { font-size: 11px; font-weight: 600; color: #0f172a; }
        .header-nrp { font-size: 9px; color: #2563eb; font-weight: 500; }
        .bell { font-size: 18px; }
        .page-title { padding: 12px 12px 8px; }
        .page-title h1 { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
        .page-title .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
        .filter-bar { display: flex; gap: 6px; padding: 0 12px 8px; }
        .filter-select { flex: 1; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; font-size: 12px; font-weight: 500; }
        .inline-stats { display: flex; align-items: center; justify-content: space-around; background: white; margin: 0 12px 8px; padding: 8px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .stat-item { text-align: center; }
        .stat-label { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.3px; }
        .stat-value { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px; }
        .stat-value.green { color: #16a34a; }
        .stat-value.orange { color: #ea580c; }
        .stat-value.blue { color: #2563eb; }
        .stat-divider { width: 1px; height: 24px; background: #e2e8f0; }
        .chips { display: flex; gap: 6px; padding: 0 12px 8px; overflow-x: auto; scrollbar-width: none; }
        .chips::-webkit-scrollbar { display: none; }
        .chip { padding: 6px 12px; border-radius: 20px; background: white; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 600; white-space: nowrap; display: flex; align-items: center; gap: 4px; }
        .chip.active { background: #1e40af; color: white; border-color: #1e40af; }
        .chip .count { background: rgba(0,0,0,0.15); padding: 1px 6px; border-radius: 10px; font-size: 10px; }
        .chip.active .count { background: rgba(255,255,255,0.25); }
        .search-box { margin: 0 12px 8px; padding: 8px 12px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; display: flex; align-items: center; gap: 6px; color: #94a3b8; }
        .list { padding: 0 12px; display: flex; flex-direction: column; gap: 6px; }
        .card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; display: flex; align-items: center; gap: 10px; }
        .avatar { width: 36px; height: 36px; border-radius: 50%; background: #1e293b; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
        .card-body { flex: 1; min-width: 0; }
        .card-name { font-size: 13px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .card-meta { font-size: 11px; color: #64748b; margin-top: 1px; }
        .card-badge { padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; flex-shrink: 0; }
        .badge-pending { background: #fef3c7; color: #92400e; }
        .badge-done { background: #dcfce7; color: #166534; }
        .badge-score { background: #dbeafe; color: #1e40af; font-weight: 700; padding: 3px 10px; }
        .section-title { padding: 12px 12px 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
        .menu-list { padding: 0 12px; display: flex; flex-direction: column; gap: 6px; }
        .menu-item { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; display: flex; align-items: center; gap: 10px; }
        .menu-icon { width: 32px; height: 32px; border-radius: 8px; background: #eff6ff; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .menu-text { flex: 1; font-size: 13px; font-weight: 600; color: #0f172a; }
        .menu-arrow { color: #cbd5e1; font-size: 14px; }
        .banner { margin: 0 12px 8px; background: linear-gradient(135deg, #1e3a8a, #1e40af); color: white; padding: 10px 12px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; }
        .banner-left { display: flex; align-items: center; gap: 8px; }
        .banner-icon { font-size: 20px; }
        .banner-title { font-size: 10px; opacity: 0.8; text-transform: uppercase; font-weight: 600; }
        .banner-value { font-size: 13px; font-weight: 700; margin-top: 1px; }
        .banner-btn { background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 6px; font-size: 10px; font-weight: 600; }
        .tabs { display: flex; margin: 0 12px 8px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 3px; }
        .tab { flex: 1; padding: 8px; text-align: center; font-size: 12px; font-weight: 600; color: #64748b; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; }
        .tab.active { background: #1e40af; color: white; }
        .tab .count { background: rgba(0,0,0,0.15); padding: 1px 6px; border-radius: 10px; font-size: 10px; }
        .tab.active .count { background: rgba(255,255,255,0.25); }
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #e2e8f0; display: flex; padding: 6px 4px; z-index: 20; max-width: 500px; margin: 0 auto; }
        .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px; color: #94a3b8; }
        .nav-item.active { color: #2563eb; }
        .nav-icon { font-size: 18px; }
        .nav-label { font-size: 9px; font-weight: 600; }
        .switcher { position: fixed; top: 60px; right: 8px; z-index: 100; display: flex; flex-direction: column; gap: 4px; }
        .switcher button { padding: 6px 10px; background: #1e40af; color: white; border: none; border-radius: 6px; font-size: 10px; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.15); cursor: pointer; }
        .switcher button.active { background: #16a34a; }
        .detail-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin: 0 12px 6px; }
        .detail-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
        .detail-label { color: #64748b; }
        .detail-value { font-weight: 600; color: #0f172a; }
        .action-row { display: flex; gap: 6px; margin-top: 8px; }
        .btn-preview { flex: 1; padding: 8px; border-radius: 6px; font-size: 12px; font-weight: 600; text-align: center; border: none; cursor: pointer; }
        .btn-approve { background: #16a34a; color: white; }
        .btn-reject { background: #dc2626; color: white; }
        .btn-detail { background: #e2e8f0; color: #0f172a; }
        .preview-badge { background: #fbbf24; color: #78350f; padding: 4px 8px; text-align: center; font-size: 11px; font-weight: 700; }
      `}</style>

      <div className="preview-badge">🎨 MODE PREVIEW — Contoh Tampilan Compact (bukan halaman asli)</div>

      <div className="switcher">
        <button className={page === 'kpi' ? 'active' : ''} onClick={() => setPage('kpi')}>KPI</button>
        <button className={page === 'pengajuan' ? 'active' : ''} onClick={() => setPage('pengajuan')}>Pengajuan</button>
        <button className={page === 'approval' ? 'active' : ''} onClick={() => setPage('approval')}>Approval</button>
      </div>

      <div className="preview-header">
        <div className="header-left">
          <div className="header-logo">🚛</div>
          <div>
            <div className="header-title">BTM MOBILE</div>
            <div className="header-sub">v1.7.0</div>
          </div>
        </div>
        <div className="header-right">
          <div className="header-user">
            <div className="header-name">FERRY ANGGRIAWAN</div>
            <div className="header-nrp">0420124 · PPA-MLP</div>
          </div>
          <div className="bell">🔔</div>
        </div>
      </div>

      {page === 'kpi' && (
        <div>
          <div className="page-title">
            <h1>📊 KPI & Penilaian</h1>
            <div className="sub">Periode: JULI 2026 · 21 bawahan</div>
          </div>
          <div className="filter-bar">
            <select className="filter-select"><option>Juli</option></select>
            <select className="filter-select"><option>2026</option></select>
            <select className="filter-select"><option>Semua Site</option></select>
          </div>
          <div className="inline-stats">
            <div className="stat-item"><div className="stat-label">Total</div><div className="stat-value">21</div></div>
            <div className="stat-divider"></div>
            <div className="stat-item"><div className="stat-label">✅ Dinilai</div><div className="stat-value green">0</div></div>
            <div className="stat-divider"></div>
            <div className="stat-item"><div className="stat-label">⏳ Pending</div><div className="stat-value orange">21</div></div>
            <div className="stat-divider"></div>
            <div className="stat-item"><div className="stat-label">⭐ Rata²</div><div className="stat-value blue">—</div></div>
          </div>
          <div className="chips">
            <div className="chip active">📋 Semua <span className="count">21</span></div>
            <div className="chip">🔧 Plant <span className="count">21</span></div>
            <div className="chip">👷 Produksi <span className="count">0</span></div>
          </div>
          <div className="search-box">🔍 Cari Nama / NRP...</div>
          <div className="list">
            {[
              { n: 'Andi Baramuli', j: 'Helper Plant', nrp: '0740724', b: 'pending', c: '#1e293b' },
              { n: 'Budi Santoso', j: 'Welder', nrp: '0850324', b: 'score', v: '85', c: '#0369a1' },
              { n: 'Charlie Wijaya', j: 'Mekanik', nrp: '0930524', b: 'pending', c: '#7c3aed' },
              { n: 'Dedi Kurniawan', j: 'Helper Plant', nrp: '0410624', b: 'score', v: '78', c: '#059669' },
              { n: 'Eko Prasetyo', j: 'Welder', nrp: '0620324', b: 'pending', c: '#dc2626' },
              { n: 'Fahri Rahman', j: 'Mekanik', nrp: '0710124', b: 'score', v: '90', c: '#ea580c' },
              { n: 'Gunawan Setiadi', j: 'Helper Plant', nrp: '0530824', b: 'pending', c: '#0891b2' },
            ].map((e, i) => (
              <div key={i} className="card">
                <div className="avatar" style={{ background: e.c }}>{e.n[0]}</div>
                <div className="card-body">
                  <div className="card-name">{e.n}</div>
                  <div className="card-meta">{e.j} · {e.nrp}</div>
                </div>
                {e.b === 'pending' ? (
                  <span className="card-badge badge-pending">⏳ Belum</span>
                ) : (
                  <span className="card-badge badge-score">{e.v}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {page === 'pengajuan' && (
        <div>
          <div className="page-title">
            <h1>📝 Pengajuan</h1>
            <div className="sub">Ajukan cuti, lembur, sakit, atau revisi absensi</div>
          </div>
          <div className="menu-list">
            <div className="menu-item"><div className="menu-icon">🏖️</div><div className="menu-text">Ajukan Cuti</div><div className="menu-arrow">›</div></div>
            <div className="menu-item"><div className="menu-icon">🤒</div><div className="menu-text">Pengajuan Eviden Sakit/Izin</div><div className="menu-arrow">›</div></div>
            <div className="menu-item"><div className="menu-icon">⏰</div><div className="menu-text">Ajukan Lembur</div><div className="menu-arrow">›</div></div>
            <div className="menu-item"><div className="menu-icon">✏️</div><div className="menu-text">Revisi Waktu Absensi</div><div className="menu-arrow">›</div></div>
          </div>
          <div className="section-title">Riwayat Pengajuan</div>
          <div className="list">
            <div className="card">
              <div className="menu-icon">🏖️</div>
              <div className="card-body">
                <div className="card-name">Cuti Reguler · 3 hari</div>
                <div className="card-meta">25-27 Jul 2026 · Diajukan 20/07</div>
              </div>
              <span className="card-badge badge-done">✅ Disetujui</span>
            </div>
            <div className="card">
              <div className="menu-icon">⏰</div>
              <div className="card-body">
                <div className="card-name">Lembur · 4 jam</div>
                <div className="card-meta">26 Jul 2026 · Menunggu atasan</div>
              </div>
              <span className="card-badge badge-pending">⏳ Proses</span>
            </div>
          </div>
        </div>
      )}

      {page === 'approval' && (
        <div>
          <div className="page-title">
            <h1>✅ Approval Center</h1>
            <div className="sub">1 pengajuan menunggu persetujuan Anda</div>
          </div>
          <div className="tabs">
            <div className="tab active">📋 Pengajuan <span className="count">1</span></div>
            <div className="tab">✏️ Revisi Absen <span className="count">0</span></div>
          </div>
          <div className="banner">
            <div className="banner-left">
              <div className="banner-icon">📥</div>
              <div>
                <div className="banner-title">Menunggu</div>
                <div className="banner-value">1 Pengajuan</div>
              </div>
            </div>
            <div className="banner-btn">🔄 Refresh</div>
          </div>
          <div className="chips">
            <div className="chip active">Semua <span className="count">1</span></div>
            <div className="chip">🏖️ Cuti <span className="count">1</span></div>
            <div className="chip">⏰ Lembur <span className="count">0</span></div>
            <div className="chip">🤒 Sakit <span className="count">0</span></div>
            <div className="chip">⚠️ Izin Potongan <span className="count">0</span></div>
            <div className="chip">✅ Izin Bayar <span className="count">0</span></div>
          </div>
          <div className="detail-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div className="menu-icon" style={{ background: '#dbeafe' }}>🏖️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Cuti Reguler/Roster</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Yudi Eko Purnomo · Welder · PPA-MLP</div>
              </div>
              <span className="card-badge badge-pending">Cuti</span>
            </div>
            <div className="detail-row"><span className="detail-label">📅 Tanggal</span><span className="detail-value">25 Jul — 08 Agu 2026</span></div>
            <div className="detail-row"><span className="detail-label">⏱️ Durasi</span><span className="detail-value">15 hari</span></div>
            <div className="detail-row"><span className="detail-label">💬 Alasan</span><span className="detail-value">Cuti reguler/roster</span></div>
            <div className="action-row">
              <button className="btn-preview btn-detail">👁️ Detail</button>
              <button className="btn-preview btn-reject">❌ Tolak</button>
              <button className="btn-preview btn-approve">✅ Setujui</button>
            </div>
          </div>
        </div>
      )}

      <div className="bottom-nav">
        <div className="nav-item"><div className="nav-icon">⏰</div><div className="nav-label">ABSENSI</div></div>
        <div className="nav-item"><div className="nav-icon">📋</div><div className="nav-label">PENGAJUAN</div></div>
        <div className="nav-item active"><div className="nav-icon">👥</div><div className="nav-label">TIM</div></div>
        <div className="nav-item"><div className="nav-icon">✅</div><div className="nav-label">APPROVAL</div></div>
        <div className="nav-item"><div className="nav-icon">👤</div><div className="nav-label">PROFILE</div></div>
        <div className="nav-item"><div className="nav-icon">🚜</div><div className="nav-label">PLANT</div></div>
      </div>
    </>
  )
}