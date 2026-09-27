'use client';

import PageHeader from "@/app/components/PageHeader";
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
  'Pending':       'bg-slate-100 text-slate-700 border-slate-300',
  'Approved':      'bg-blue-100 text-blue-800 border-blue-300',
  'Rejected':      'bg-red-100 text-red-800 border-red-300',
  'Available':     'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Not Available': 'bg-amber-100 text-amber-800 border-amber-300',
}

const STATUS_ICONS: Record<string, string> = {
  'Pending':       '⏳',
  'Approved':      '✅',
  'Rejected':      '❌',
  'Available':     '📦',
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
    <div className="min-h-[calc(100vh-100px)] bg-slate-50 flex flex-col">
      <PageHeader title="Part Orders" backUrl="/dashboard" />

      {/* HEADER */}
      <div className="bg-white border-b px-3 py-2 flex flex-wrap items-center gap-2 sticky top-0 z-30">
        <h1 className="text-base md:text-lg font-black text-[#003D79] whitespace-nowrap">📋 Part Orders</h1>
        <div className="flex-1"></div>
        <a
          href="/parts-catalog"
          className="px-3 py-1.5 bg-[#003D79] text-white rounded-lg text-xs md:text-sm font-bold hover:bg-blue-800 whitespace-nowrap"
        >
          📚 Katalog
        </a>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border-b px-3 py-2 flex flex-wrap items-center gap-2">
        {isAdmin && (
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setMode('my')}
              className={`px-3 py-1 text-xs font-bold rounded-md ${
                mode === 'my' ? 'bg-white shadow text-[#003D79]' : 'text-slate-500'
              }`}
            >
              🙋 My Orders
            </button>
            <button
              onClick={() => setMode('all')}
              className={`px-3 py-1 text-xs font-bold rounded-md ${
                mode === 'all' ? 'bg-white shadow text-[#003D79]' : 'text-slate-500'
              }`}
            >
              👥 Manage All
            </button>
          </div>
        )}

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">Semua Status</option>
          <option value="Pending">⏳ Pending</option>
          <option value="Approved">✅ Approved</option>
          <option value="Rejected">❌ Rejected</option>
          <option value="Available">📦 Available</option>
          <option value="Not Available">🚫 Not Available</option>
        </select>

        <div className="flex-1"></div>

        <div className="text-xs text-slate-500">
          Total: <span className="font-bold text-slate-700">{orders.length}</span>
        </div>

        <button
          onClick={fetchOrders}
          className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
          title="Refresh"
        >
          🔄
        </button>
      </div>

      {/* ORDERS LIST */}
      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <div className="text-center py-10 text-[#5a6a7e] text-sm">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10 text-[#5a6a7e] text-sm">
            {mode === 'my' ? 'Belum ada order dari kamu' : 'Belum ada order'}
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {orders.map(o => (
              <div
                key={o.id}
                className={`bg-white border rounded-lg p-3 shadow-sm hover:shadow ${
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

                <div className="space-y-1 text-[11px] text-slate-600 border-t pt-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-[#5a6a7e]">Unit:</span>
                    <span className="font-bold text-right">{o.unit_code}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#5a6a7e]">Machine:</span>
                    <span className="font-bold text-right truncate">{o.machine_unit}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#5a6a7e]">Qty:</span>
                    <span className="font-bold text-right">{o.qty}</span>
                  </div>
                  {mode === 'all' && (
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5a6a7e]">Requester:</span>
                      <span className="font-bold text-right truncate">{o.requester_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-[#5a6a7e]">Diminta:</span>
                    <span className="text-right">{fmtDate(o.created_at)}</span>
                  </div>
                </div>

                {o.keterangan && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="text-[10px] text-[#5a6a7e] font-bold mb-0.5">KETERANGAN:</div>
                    <div className="text-[11px] text-slate-700 italic">{o.keterangan}</div>
                  </div>
                )}

                {o.catatan_admin && (
                  <div className="mt-2 pt-2 border-t bg-blue-50 -mx-3 -mb-3 px-3 py-2 rounded-b-lg">
                    <div className="text-[10px] text-blue-500 font-bold mb-0.5">
                      💬 CATATAN ADMIN {o.handled_by && `• ${o.handled_by}`}
                    </div>
                    <div className="text-[11px] text-blue-900">{o.catatan_admin}</div>
                  </div>
                )}

                {isAdmin && mode === 'all' && (
                  <button
                    onClick={() => openEditModal(o)}
                    className="mt-2 w-full py-1.5 bg-[#003D79] hover:bg-blue-800 text-white rounded text-xs font-bold"
                  >
                    ✏️ Update Status
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* UPDATE STATUS MODAL */}
      {editOrder && (
        <>
          <div className="fixed inset-0 bg-[#f4f7fa]/60 z-50" onClick={closeEditModal} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="bg-[#003D79] text-white px-5 py-3 flex justify-between items-center">
              <h3 className="font-bold">✏️ Update Order Status</h3>
              <button onClick={closeEditModal} className="text-white/80 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                <div className="font-mono font-bold text-[#003D79]">{editOrder.part_number}</div>
                <div className="text-slate-700">{editOrder.part_name}</div>
                <div className="text-slate-500 pt-1 border-t mt-1">
                  Requester: <span className="font-bold">{editOrder.requester_name}</span> | Qty: <span className="font-bold">{editOrder.qty}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Status Baru</label>
                <div className="grid grid-cols-1 gap-1">
                  {['Pending', 'Approved', 'Rejected', 'Available', 'Not Available'].map(s => (
                    <label
                      key={s}
                      className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm ${
                        newStatus === s ? 'border-[#003D79] bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Contoh: Barang tersedia di gudang site, akan dikirim hari ini"
                />
              </div>

              {updateMsg && (
                <div className={`p-2 rounded-lg text-xs font-bold text-center ${
                  updateMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {updateMsg}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={closeEditModal}
                  disabled={updating}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={submitUpdate}
                  disabled={updating}
                  className="flex-1 py-2 bg-[#003D79] hover:bg-blue-800 text-white rounded-lg font-bold text-sm disabled:opacity-50"
                >
                  {updating ? '⏳ Updating...' : '💾 Save'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    
      {/* Standard App Footer */}
      <footer className="mt-8 mb-20 sm:mb-6 text-center text-xs text-[#8896a7] italic opacity-60">
        <p>BTM Mobile APP V1.7.0</p>
        <p className="text-[10px]">Powered By rck_Production</p>
      </footer>
</div>
  )
}