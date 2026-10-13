'use client';

import PageHeader from "@/app/components/PageHeader";
import { StdPage, EmptyState } from '@/app/components/std';
import { useEffect, useState } from 'react'

interface Order {
  id: string
  part_number: string
  part_name: string
  assembly_name: string
  unit_code: string
  machine_unit: string
  qty: number
  keterangan: string
  prioritas: 'Normal' | 'Urgent'
  requester_nrp: string
  requester_name: string
  requester_role: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Available' | 'Not Available'
  catatan_admin: string
  handled_by: string | null
  handled_at: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  'Pending':       'bg-amber-100 text-amber-700 border-amber-200',
  'Approved':      'bg-sky-100 text-sky-700 border-sky-200',
  'Rejected':      'bg-red-100 text-red-700 border-red-200',
  'Available':     'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Not Available': 'bg-slate-100 text-slate-600 border-slate-200',
}

const STATUS_ICONS: Record<string, string> = {
  'Pending':       '⏳',
  'Approved':      '✅',
  'Rejected':      '❌',
  'Available':      '📦',
  'Not Available': '🚫',
}

export default function PartOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [mode, setMode] = useState<'my' | 'all'>('my')
  const [filterStatus, setFilterStatus] = useState('')

  const [editOrder, setEditOrder] = useState<Order | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [newCatatan, setNewCatatan] = useState('')
  const [updating, setUpdating] = useState(false)
  const [updateMsg, setUpdateMsg] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [mode, filterStatus])

  async function fetchOrders() {
    setLoading(true)
    try {
      const url = `/api/part-orders/list?mode=${mode}${filterStatus ? `&status=${filterStatus}` : ''}`
      const res = await fetch(url, { credentials: 'include' })
      const json = await res.json()
      if (json.ok) {
        setOrders(json.data || [])
        setIsAdmin(json.isAdmin || false)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function openEditModal(order: Order) {
    setEditOrder(order)
    setNewStatus(order.status)
    setNewCatatan(order.catatan_admin || '')
    setUpdateMsg('')
  }

  function closeEditModal() {
    if (updating) return
    setEditOrder(null)
    setUpdateMsg('')
  }

  async function submitUpdate() {
    if (!editOrder) return
    setUpdating(true)
    setUpdateMsg('')

    try {
      const res = await fetch('/api/part-orders/update-status', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editOrder.id,
          status: newStatus,
          catatan_admin: newCatatan,
        }),
      })
      const json = await res.json()
      if (json.ok) {
        setUpdateMsg('✅ Status berhasil diupdate!')
        await fetchOrders()
        setTimeout(() => closeEditModal(), 1000)
      } else {
        setUpdateMsg(`❌ ${json.error}`)
      }
    } catch (e: any) {
      setUpdateMsg(`❌ ${e.message}`)
    } finally {
      setUpdating(false)
    }
  }

  function fmtDate(iso: string) {
    if (!iso) return '-'
    const d = new Date(iso)
    return d.toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-[#f4f7fa]">
      <StdPage footer width="xl">
        <PageHeader
          title="Part Orders"
          subtitle="Pengajuan & pemantauan order part"
          backUrl="/dashboard"
          rightAction={
            <a
              href="/parts-catalog"
              className="px-3 py-1.5 bg-white/10 border border-white/15 rounded-xl text-[11px] font-bold hover:bg-white/20 active:scale-95 transition-all whitespace-nowrap"
            >
              📚 Katalog
            </a>
          }
        />

        {/* FILTER — kartu standar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2.5 flex flex-wrap items-center gap-2">
          {isAdmin && (
            <div className="flex bg-slate-100 rounded-xl p-0.5">
              <button
                onClick={() => setMode('my')}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  mode === 'my' ? 'bg-white shadow text-[#003D79]' : 'text-slate-500'
                }`}
              >
                🙋 Order Saya
              </button>
              <button
                onClick={() => setMode('all')}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  mode === 'all' ? 'bg-white shadow text-[#003D79]' : 'text-slate-500'
                }`}
              >
                👥 Semua
              </button>
            </div>
          )}

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-[11px] font-bold bg-white text-slate-700 focus:outline-none focus:border-[#003D79]"
          >
            <option value="">Semua Status</option>
            <option value="Pending">⏳ Pending</option>
            <option value="Approved">✅ Approved</option>
            <option value="Rejected">❌ Rejected</option>
            <option value="Available">📦 Available</option>
            <option value="Not Available">🚫 Not Available</option>
          </select>

          <div className="flex-1"></div>

          <div className="text-[11px] font-bold text-slate-500">
            Total: <span className="text-[#003D79]">{orders.length}</span>
          </div>

          <button
            onClick={fetchOrders}
            className="w-8 h-8 rounded-xl border border-slate-200 bg-white text-sm hover:bg-slate-50 active:scale-95 transition-all"
            title="Refresh"
          >
            🔄
          </button>
        </div>

        {/* DAFTAR ORDER */}
        {loading ? (
          <EmptyState variant="loading" />
        ) : orders.length === 0 ? (
          <EmptyState
            variant="empty"
            title="Belum Ada Order"
            text={mode === 'my' ? 'Belum ada order yang kamu ajukan' : 'Belum ada order masuk'}
          />
        ) : (
          <div className="grid gap-2.5 md:grid-cols-2">
            {orders.map(o => (
              <div
                key={o.id}
                className={`bg-white border border-slate-200 rounded-2xl p-3 shadow-sm ${
                  o.prioritas === 'Urgent' ? 'border-l-4 border-l-red-500' : ''
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[o.status]}`}>
                    {STATUS_ICONS[o.status]} {o.status}
                  </span>
                  {o.prioritas === 'Urgent' && (
                    <span className="text-[10px] font-bold text-red-600">🔥 URGENT</span>
                  )}
                </div>

                <div className="mb-2">
                  <div className="font-mono text-sm font-bold text-[#003D79]">{o.part_number}</div>
                  <div className="text-xs text-slate-700 line-clamp-2">{o.part_name}</div>
                </div>

                <div className="space-y-1 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400 font-bold">Unit</span>
                    <span className="font-bold text-right">{o.unit_code}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400 font-bold">Machine</span>
                    <span className="font-bold text-right truncate">{o.machine_unit}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400 font-bold">Qty</span>
                    <span className="font-bold text-right">{o.qty}</span>
                  </div>
                  {mode === 'all' && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400 font-bold">Pemohon</span>
                      <span className="font-bold text-right truncate">{o.requester_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400 font-bold">Diminta</span>
                    <span className="text-right">{fmtDate(o.created_at)}</span>
                  </div>
                </div>

                {o.keterangan && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <div className="text-[10px] text-slate-400 font-bold mb-0.5 uppercase">Keterangan</div>
                    <div className="text-[11px] text-slate-700 italic">{o.keterangan}</div>
                  </div>
                )}

                {o.catatan_admin && (
                  <div className="mt-2 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2">
                    <div className="text-[10px] text-sky-600 font-bold mb-0.5">
                      💬 CATATAN ADMIN {o.handled_by && `• ${o.handled_by}`}
                    </div>
                    <div className="text-[11px] text-sky-900">{o.catatan_admin}</div>
                  </div>
                )}

                {isAdmin && mode === 'all' && (
                  <button
                    onClick={() => openEditModal(o)}
                    className="mt-2 w-full py-2 bg-[#003D79] hover:bg-[#002a57] text-white rounded-xl text-xs font-bold active:scale-[.98] transition-all"
                  >
                    ✏️ Update Status
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </StdPage>

      {/* MODAL UPDATE STATUS */}
      {editOrder && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 z-50" onClick={closeEditModal} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="bg-[#003D79] text-white px-5 py-3 flex justify-between items-center">
              <h3 className="font-bold text-sm">✏️ Update Order Status</h3>
              <button onClick={closeEditModal} className="text-white/80 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs space-y-1">
                <div className="font-mono font-bold text-[#003D79]">{editOrder.part_number}</div>
                <div className="text-slate-700">{editOrder.part_name}</div>
                <div className="text-slate-500 pt-1 border-t border-slate-200 mt-1">
                  Pemohon: <span className="font-bold">{editOrder.requester_name}</span> | Qty: <span className="font-bold">{editOrder.qty}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Status Baru</label>
                <div className="grid grid-cols-1 gap-1">
                  {['Pending', 'Approved', 'Rejected', 'Available', 'Not Available'].map(s => (
                    <label
                      key={s}
                      className={`flex items-center gap-2 px-3 py-2 border rounded-xl cursor-pointer text-sm ${
                        newStatus === s ? 'border-[#003D79] bg-sky-50' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={s}
                        checked={newStatus === s}
                        onChange={() => setNewStatus(s)}
                        disabled={updating}
                      />
                      <span className="font-bold">{STATUS_ICONS[s]} {s}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Admin</label>
                <textarea
                  value={newCatatan}
                  onChange={e => setNewCatatan(e.target.value)}
                  disabled={updating}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003D79] resize-none"
                  placeholder="Contoh: Barang tersedia di gudang site, akan dikirim hari ini"
                />
              </div>

              {updateMsg && (
                <div className={`p-2 rounded-xl text-xs font-bold text-center ${
                  updateMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {updateMsg}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={closeEditModal}
                  disabled={updating}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={submitUpdate}
                  disabled={updating}
                  className="flex-1 py-2 bg-[#003D79] hover:bg-[#002a57] text-white rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  {updating ? '⏳ Updating...' : '💾 Save'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
