'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface MasterPart {
  part_number: string
  part_name: string
  kategori: string
  sub_kategori: string
  merk_kompatibel: string
  model_kompatibel: string
  satuan: string
  min_stock: number
  movement_category: string
  harga_estimasi: number
  catatan: string
  source: string
  is_active: boolean
}

interface Warehouse {
  warehouse_code: string
  nama_gudang: string
  site_code: string
  lokasi_fisik: string
  penanggung_jawab_nama: string
}

interface Vendor {
  vendor_code: string
  nama_vendor: string
  kategori_suplai: string
  no_telepon: string
  email: string
  nama_pic: string
}

interface StockItem {
  id: number
  warehouse_code: string
  part_number: string
  qty_tersedia: number
  qty_reserved: number
  rak_lokasi: string
  updated_at: string
  master_part?: {
    part_name: string
    kategori: string
    merk_kompatibel: string
    model_kompatibel: string
    satuan: string
    min_stock: number
    movement_category: string
  }
}

interface PRItem {
  id?: number
  part_number: string
  part_name: string
  qty_request: number
  qty_approved?: number
  qty_fulfilled?: number
  satuan: string
  keterangan?: string
}

interface PRRecord {
  id: number
  pr_number: string
  requester_nrp: string
  requester_name: string
  requester_role: string
  site_code: string
  unit_code: string
  prioritas: string
  keterangan: string
  status: string
  assigned_warehouse_code: string | null
  approved_gl_plant_by: string | null
  approved_gl_plant_name: string | null
  approved_gl_plant_at: string | null
  approved_pjo_by: string | null
  approved_pjo_name: string | null
  approved_pjo_at: string | null
  approved_ho_by: string | null
  approved_ho_name: string | null
  approved_ho_at: string | null
  fulfilled_by: string | null
  fulfilled_name: string | null
  fulfilled_at: string | null
  do_number: string | null
  rejected_by: string | null
  rejected_reason: string | null
  created_at: string
  pr_items?: PRItem[]
}

interface POItem {
  id?: number
  part_number: string
  qty_ordered: number
  qty_received: number
  unit_price: number
  total_price: number
  master_part?: {
    part_name: string
    satuan: string
  }
}

interface PORecord {
  id: number
  po_number: string
  vendor_code: string
  site_code: string
  status: string
  total_amount: number
  catatan: string
  created_by_name: string
  created_at: string
  master_vendor?: {
    nama_vendor: string
    kategori_suplai: string
    no_telepon: string
  }
  po_items?: POItem[]
}

interface GRNRecord {
  id: number
  grn_number: string
  po_id: number | null
  warehouse_code: string
  surat_jalan_no: string
  received_name: string
  received_at: string
  catatan: string
  warehouses?: {
    nama_gudang: string
    site_code: string
  }
  purchase_orders?: {
    po_number: string
  }
  grn_items?: {
    part_number: string
    qty_received: number
    master_part?: {
      part_name: string
      satuan: string
    }
  }[]
}

export default function LogistikHubPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'requests' | 'po' | 'grn' | 'catalog' | 'stock' | 'import' | 'warehouse_vendor'>('requests')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  // PR State
  const [prList, setPrList] = useState<PRRecord[]>([])
  const [prMode, setPrMode] = useState<'all' | 'my' | 'pending'>('all')
  const [prSearch, setPrSearch] = useState('')
  const [selectedPR, setSelectedPR] = useState<PRRecord | null>(null)
  const [showCreatePRModal, setShowCreatePRModal] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState<'APPROVE_GL_PLANT' | 'APPROVE_PJO' | 'APPROVE_HO' | 'FULFILL_WAREHOUSE' | 'REJECT' | null>(null)
  const [actionWarehouse, setActionWarehouse] = useState('')
  const [actionDoNumber, setActionDoNumber] = useState('')
  const [actionRejectReason, setActionRejectReason] = useState('')

  // PR Form
  const [prFormUnit, setPrFormUnit] = useState('')
  const [prFormPriority, setPrFormPriority] = useState('NORMAL')
  const [prFormKet, setPrFormKet] = useState('')
  const [prFormItems, setPrFormItems] = useState<PRItem[]>([
    { part_number: '', part_name: '', qty_request: 1, satuan: 'Pcs', keterangan: '' }
  ])

  // PO State
  const [poList, setPoList] = useState<PORecord[]>([])
  const [poSearch, setPoSearch] = useState('')
  const [showCreatePOModal, setShowCreatePOModal] = useState(false)
  const [poFormVendor, setPoFormVendor] = useState('')
  const [poFormCatatan, setPoFormCatatan] = useState('')
  const [poFormItems, setPoFormItems] = useState<{ part_number: string; part_name: string; qty_ordered: number; unit_price: number }[]>([
    { part_number: '', part_name: '', qty_ordered: 1, unit_price: 0 }
  ])

  // GRN State
  const [grnList, setGrnList] = useState<GRNRecord[]>([])
  const [showCreateGRNModal, setShowCreateGRNModal] = useState(false)
  const [grnFormWh, setGrnFormWh] = useState('')
  const [grnFormPoId, setGrnFormPoId] = useState<number | ''>('')
  const [grnFormSJ, setGrnFormSJ] = useState('')
  const [grnFormCatatan, setGrnFormCatatan] = useState('')
  const [grnFormItems, setGrnFormItems] = useState<{ part_number: string; qty_received: number }[]>([
    { part_number: '', qty_received: 1 }
  ])

  // Catalog State
  const [parts, setParts] = useState<MasterPart[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMovement, setFilterMovement] = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalParts, setTotalParts] = useState(0)

  // Stock State
  const [stocks, setStocks] = useState<StockItem[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [stockSearch, setStockSearch] = useState('')

  // Import State
  const [file, setFile] = useState<File | null>(null)
  const [importWarehouse, setImportWarehouse] = useState('')
  const [previewData, setPreviewData] = useState<any | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Modal Manual Part & Vendor
  const [showAddPartModal, setShowAddPartModal] = useState(false)
  const [showAddVendorModal, setShowAddVendorModal] = useState(false)
  const [formDataPart, setFormDataPart] = useState({
    part_number: '',
    part_name: '',
    kategori: 'Sparepart',
    merk_kompatibel: '',
    model_kompatibel: '',
    satuan: 'Pcs',
    min_stock: 1,
    movement_category: 'FAST',
    harga_estimasi: 0,
    catatan: ''
  })
  const [formDataVendor, setFormDataVendor] = useState({
    vendor_code: '',
    nama_vendor: '',
    kategori_suplai: 'Sparepart Komatsu',
    no_telepon: '',
    email: '',
    nama_pic: '',
    kontak_pic: ''
  })

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Load Warehouses & Vendors
  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await fetch('/api/logistik/warehouses')
      const json = await res.json()
      if (json.data) {
        setWarehouses(json.data)
        if (json.data.length > 0 && !selectedWarehouse) {
          setSelectedWarehouse(json.data[0].warehouse_code)
          setActionWarehouse(json.data[0].warehouse_code)
          setGrnFormWh(json.data[0].warehouse_code)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }, [selectedWarehouse])

  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch('/api/logistik/vendors')
      const json = await res.json()
      if (json.data) {
        setVendors(json.data)
        if (json.data.length > 0 && !poFormVendor) {
          setPoFormVendor(json.data[0].vendor_code)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }, [poFormVendor])

  // Load PR List
  const fetchPRList = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        mode: prMode === 'my' ? 'my' : 'all',
        q: prSearch,
        limit: '50'
      })
      if (prMode === 'pending') params.append('status', 'PENDING_GL_PLANT')
      const res = await fetch('/api/logistik/pr/list?' + params.toString())
      const json = await res.json()
      if (json.data) setPrList(json.data)
    } catch (err: any) {
      showToast('Gagal memuat daftar PR', 'error')
    } finally {
      setLoading(false)
    }
  }, [prMode, prSearch])

  // Load PO List
  const fetchPOList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/logistik/po/list?q=' + encodeURIComponent(poSearch))
      const json = await res.json()
      if (json.data) setPoList(json.data)
    } catch (e) {
      showToast('Gagal memuat daftar PO', 'error')
    } finally {
      setLoading(false)
    }
  }, [poSearch])

  // Load GRN List
  const fetchGRNList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/logistik/grn/list')
      const json = await res.json()
      if (json.data) setGrnList(json.data)
    } catch (e) {
      showToast('Gagal memuat riwayat penerimaan', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load Master Parts
  const fetchParts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        movement: filterMovement,
        kategori: filterKategori,
        page: page.toString(),
        limit: '25'
      })
      const res = await fetch('/api/logistik/master-part?' + params.toString())
      const json = await res.json()
      if (json.data) {
        setParts(json.data)
        setTotalPages(json.pagination.totalPages || 1)
        setTotalParts(json.pagination.total || 0)
      }
    } catch (err: any) {
      showToast('Gagal memuat katalog part', 'error')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, filterMovement, filterKategori, page])

  // Load Stocks
  const fetchStocks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        warehouse: selectedWarehouse,
        q: stockSearch,
        page: '1',
        limit: '50'
      })
      const res = await fetch('/api/logistik/stock?' + params.toString())
      const json = await res.json()
      if (json.data) setStocks(json.data)
    } catch (e) {
      showToast('Gagal memuat posisi stok', 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedWarehouse, stockSearch])

  useEffect(() => {
    fetchWarehouses()
    fetchVendors()
  }, [fetchWarehouses, fetchVendors])

  useEffect(() => {
    if (activeTab === 'requests') fetchPRList()
    if (activeTab === 'po') fetchPOList()
    if (activeTab === 'grn') fetchGRNList()
    if (activeTab === 'catalog') fetchParts()
    if (activeTab === 'stock') fetchStocks()
  }, [activeTab, fetchPRList, fetchPOList, fetchGRNList, fetchParts, fetchStocks])

  // Handle Submit New PR
  const handleSubmitPR = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prFormUnit.trim()) {
      showToast('Kode unit alat wajib diisi', 'error')
      return
    }
    const validItems = prFormItems.filter(it => it.part_number.trim() && it.qty_request > 0)
    if (validItems.length === 0) {
      showToast('Tambahkan minimal 1 part yang valid', 'error')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/logistik/pr/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_code: prFormUnit,
          prioritas: prFormPriority,
          keterangan: prFormKet,
          items: validItems
        })
      })
      const json = await res.json()
      if (res.ok) {
        showToast('Permintaan ' + json.pr_number + ' berhasil diajukan!', 'success')
        setShowCreatePRModal(false)
        setPrFormUnit('')
        setPrFormKet('')
        setPrFormItems([{ part_number: '', part_name: '', qty_request: 1, satuan: 'Pcs', keterangan: '' }])
        fetchPRList()
      } else {
        showToast(json.error || 'Gagal mengajukan PR', 'error')
      }
    } catch (e) {
      showToast('Error koneksi sistem', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle PR Approval / Fulfill Action
  const handleExecuteAction = async () => {
    if (!selectedPR || !actionType) return
    setLoading(true)
    try {
      const res = await fetch('/api/logistik/pr/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pr_id: selectedPR.id,
          action: actionType,
          assigned_warehouse_code: actionWarehouse,
          do_number: actionDoNumber,
          rejected_reason: actionRejectReason
        })
      })
      const json = await res.json()
      if (res.ok) {
        showToast('Aksi berhasil diproses!', 'success')
        setShowActionModal(false)
        setSelectedPR(null)
        setActionType(null)
        fetchPRList()
      } else {
        showToast(json.error || 'Gagal memproses aksi', 'error')
      }
    } catch (e) {
      showToast('Error koneksi sistem', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle Submit PO
  const handleSubmitPO = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!poFormVendor) {
      showToast('Pilih Rekanan Vendor', 'error')
      return
    }
    const validItems = poFormItems.filter(it => it.part_number.trim() && it.qty_ordered > 0)
    if (validItems.length === 0) {
      showToast('Tambahkan minimal 1 part yang dipesan', 'error')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/logistik/po/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_code: poFormVendor,
          catatan: poFormCatatan,
          items: validItems
        })
      })
      const json = await res.json()
      if (res.ok) {
        showToast('Dokumen PO ' + json.po_number + ' berhasil diterbitkan!', 'success')
        setShowCreatePOModal(false)
        setPoFormCatatan('')
        setPoFormItems([{ part_number: '', part_name: '', qty_ordered: 1, unit_price: 0 }])
        fetchPOList()
      } else {
        showToast(json.error || 'Gagal menerbitkan PO', 'error')
      }
    } catch (e) {
      showToast('Error koneksi', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle Submit GRN (Penerimaan Barang Masuk)
  const handleSubmitGRN = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!grnFormWh) {
      showToast('Pilih Gudang Penerima', 'error')
      return
    }
    const validItems = grnFormItems.filter(it => it.part_number.trim() && it.qty_received > 0)
    if (validItems.length === 0) {
      showToast('Isi minimal 1 part fisik yang diterima', 'error')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/logistik/grn/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse_code: grnFormWh,
          po_id: grnFormPoId || null,
          surat_jalan_no: grnFormSJ,
          catatan: grnFormCatatan,
          items: validItems
        })
      })
      const json = await res.json()
      if (res.ok) {
        showToast('Penerimaan ' + json.grn_number + ' berhasil! Stok fisik telah bertambah.', 'success')
        setShowCreateGRNModal(false)
        setGrnFormSJ('')
        setGrnFormCatatan('')
        setGrnFormPoId('')
        setGrnFormItems([{ part_number: '', qty_received: 1 }])
        fetchGRNList()
        fetchStocks()
      } else {
        showToast(json.error || 'Gagal menyimpan penerimaan', 'error')
      }
    } catch (e) {
      showToast('Error koneksi', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle Save Manual Part
  const handleSavePart = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formDataPart.part_number || !formDataPart.part_name) {
      showToast('Part number & nama part wajib diisi', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/logistik/master-part', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formDataPart)
      })
      const json = await res.json()
      if (res.ok) {
        showToast('Part ' + formDataPart.part_number + ' tersimpan!', 'success')
        setShowAddPartModal(false)
        fetchParts()
      } else {
        showToast(json.error || 'Gagal menyimpan part', 'error')
      }
    } catch (e) {
      showToast('Error koneksi sistem', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle Save Vendor
  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formDataVendor.vendor_code || !formDataVendor.nama_vendor) {
      showToast('Kode dan Nama Vendor wajib diisi', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/logistik/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formDataVendor)
      })
      const json = await res.json()
      if (res.ok) {
        showToast('Vendor ' + formDataVendor.nama_vendor + ' berhasil ditambahkan!', 'success')
        setShowAddVendorModal(false)
        fetchVendors()
      } else {
        showToast(json.error || 'Gagal menyimpan vendor', 'error')
      }
    } catch (e) {
      showToast('Error koneksi sistem', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle Preview Import
  const handlePreviewImport = async () => {
    if (!file) {
      showToast('Pilih file Excel terlebih dahulu', 'error')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('mode', 'preview')
      fd.append('warehouse_code', importWarehouse)

      const res = await fetch('/api/logistik/import-accurate', {
        method: 'POST',
        body: fd
      })
      const json = await res.json()
      if (res.ok) {
        setPreviewData(json)
        showToast('File valid! Terdeteksi ' + json.validPartsCount + ' part.', 'success')
      } else {
        showToast(json.error || 'Gagal validasi file Excel', 'error')
      }
    } catch (e) {
      showToast('Gagal memproses file Excel', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle Execute Import
  const handleExecuteImport = async () => {
    if (!file) return
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('mode', 'import')
      fd.append('warehouse_code', importWarehouse)

      const res = await fetch('/api/logistik/import-accurate', {
        method: 'POST',
        body: fd
      })
      const json = await res.json()
      if (res.ok) {
        showToast(json.message || 'Import berhasil!', 'success')
        setFile(null)
        setPreviewData(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        fetchParts()
      } else {
        showToast(json.error || 'Gagal mengimpor data', 'error')
      }
    } catch (e) {
      showToast('Gagal mengeksekusi import batch', 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-28">
      {/* Toast Notification */}
      {toast && (
        <div className={'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ' + 
          (toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-700' :
           toast.type === 'error' ? 'bg-rose-600 text-white border-rose-700' :
           'bg-slate-800 text-white border-slate-700')}>
          {toast.msg}
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">LOGISTIK & PART HUB</span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">Phase 3 Full</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pusat Pengadaan, Permintaan Part (PR), PO, Penerimaan (GRN) & Stok Fisik</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCreatePRModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              + Buat PR Part
            </button>
            <button
              onClick={() => setShowCreatePOModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              + Terbitkan PO
            </button>
            <button
              onClick={() => setShowCreateGRNModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              + Terima Barang (GRN)
            </button>
            <button
              onClick={() => setShowAddPartModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              + Master Part
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex space-x-1 overflow-x-auto">
          {[
            { id: 'requests', label: '1. Permintaan Part (PR)' },
            { id: 'po', label: '2. Purchase Order (PO)' },
            { id: 'grn', label: '3. Penerimaan (GRN)' },
            { id: 'catalog', label: '4. Master Part (' + totalParts + ')' },
            { id: 'stock', label: '5. Stok Gudang' },
            { id: 'import', label: '6. Import Accurate' },
            { id: 'warehouse_vendor', label: '7. Gudang & Vendor' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={'py-3 px-3.5 border-b-2 font-medium text-xs whitespace-nowrap transition-all ' +
                (activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* TAB 1: PERMINTAAN PART (PR) */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'Semua PR' },
                  { id: 'my', label: 'PR Saya' },
                  { id: 'pending', label: 'Menunggu Review' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setPrMode(m.id as any)}
                    className={'px-3 py-1.5 rounded-lg text-xs font-semibold ' +
                      (prMode === m.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600')}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Cari No. PR, Unit, Pemohon..."
                value={prSearch}
                onChange={(e) => setPrSearch(e.target.value)}
                className="w-full md:w-72 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs"
              />
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="bg-white p-8 text-center text-xs text-slate-400 rounded-xl border">Memuat daftar PR...</div>
              ) : prList.length === 0 ? (
                <div className="bg-white p-12 text-center text-xs text-slate-500 rounded-xl border">Belum ada tiket permintaan part</div>
              ) : (
                prList.map((pr) => (
                  <div key={pr.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{pr.pr_number}</span>
                        <span className="text-xs font-bold text-slate-700">Unit: <span className="font-mono text-emerald-600">{pr.unit_code}</span></span>
                        <span className="text-xs text-slate-400">({pr.site_code})</span>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-800">{pr.status}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400">Pemohon: {pr.requester_name}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">{pr.keterangan || 'Tidak ada keterangan tambahan.'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400">Part Diminta ({pr.pr_items?.length || 0} Item):</p>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {pr.pr_items?.map((it, idx) => (
                            <div key={idx} className="flex justify-between bg-slate-50 px-2 py-1 rounded text-[11px]">
                              <span className="font-mono font-bold">{it.part_number} - {it.part_name}</span>
                              <span className="font-semibold text-blue-600">{it.qty_request} {it.satuan}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Triggers */}
                    <div className="pt-2 border-t flex items-center justify-between">
                      <div className="text-[10px] font-semibold text-slate-400">
                        Approval: {pr.approved_gl_plant_at ? 'GL? ' : ''}{pr.approved_pjo_at ? 'PJO? ' : ''}{pr.approved_ho_at ? 'HO? ' : ''}{pr.fulfilled_at ? 'Gudang?' : ''}
                      </div>
                      <div className="flex gap-2">
                        {pr.status === 'PENDING_GL_PLANT' && (
                          <button onClick={() => { setSelectedPR(pr); setActionType('APPROVE_GL_PLANT'); setShowActionModal(true); }} className="px-3 py-1 bg-amber-600 text-white text-[11px] font-bold rounded">Review GL Plant</button>
                        )}
                        {pr.status === 'PENDING_PJO' && (
                          <button onClick={() => { setSelectedPR(pr); setActionType('APPROVE_PJO'); setShowActionModal(true); }} className="px-3 py-1 bg-blue-600 text-white text-[11px] font-bold rounded">Approve PJO</button>
                        )}
                        {pr.status === 'PENDING_HO' && (
                          <button onClick={() => { setSelectedPR(pr); setActionType('APPROVE_HO'); setShowActionModal(true); }} className="px-3 py-1 bg-purple-600 text-white text-[11px] font-bold rounded">Approve HO & Tunjuk Gudang</button>
                        )}
                        {pr.status === 'APPROVED_READY_ISSUE' && (
                          <button onClick={() => { setSelectedPR(pr); setActionType('FULFILL_WAREHOUSE'); setShowActionModal(true); }} className="px-3 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded">Keluarkan Barang (DO)</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PURCHASE ORDER (PO) */}
        {activeTab === 'po' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Daftar Dokumen Purchase Order ke Vendor/Supplier</span>
              <input
                type="text"
                placeholder="Cari No. PO atau Vendor..."
                value={poSearch}
                onChange={(e) => setPoSearch(e.target.value)}
                className="w-full md:w-72 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs"
              />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">No. PO</th>
                    <th className="px-4 py-3">Vendor / Supplier</th>
                    <th className="px-4 py-3">Jumlah Item</th>
                    <th className="px-4 py-3 text-right">Total Nilai (Rp)</th>
                    <th className="px-4 py-3 text-center">Status Pemenuhan</th>
                    <th className="px-4 py-3">Dibuat Oleh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {poList.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Belum ada dokumen PO yang diterbitkan.</td></tr>
                  ) : (
                    poList.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">{po.po_number}</td>
                        <td className="px-4 py-3 font-medium">{po.master_vendor?.nama_vendor || po.vendor_code}</td>
                        <td className="px-4 py-3">{po.po_items?.length || 0} Part</td>
                        <td className="px-4 py-3 text-right font-mono font-bold">Rp {Number(po.total_amount || 0).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={'px-2 py-0.5 text-xs font-bold rounded ' + 
                            (po.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-800' : 
                             po.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800')}>
                            {po.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{po.created_by_name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PENERIMAAN BARANG (GRN) */}
        {activeTab === 'grn' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Riwayat Penerimaan Barang Masuk (Barang Bertambah ke Gudang)</span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">No. GRN</th>
                    <th className="px-4 py-3">Gudang Penerima</th>
                    <th className="px-4 py-3">No. Surat Jalan Vendor</th>
                    <th className="px-4 py-3">Ref PO</th>
                    <th className="px-4 py-3">Part Diterima</th>
                    <th className="px-4 py-3">Checker Gudang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {grnList.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Belum ada riwayat penerimaan barang masuk.</td></tr>
                  ) : (
                    grnList.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-bold text-emerald-600">{g.grn_number}</td>
                        <td className="px-4 py-3 font-medium">{g.warehouses?.nama_gudang || g.warehouse_code}</td>
                        <td className="px-4 py-3 font-mono">{g.surat_jalan_no || '-'}</td>
                        <td className="px-4 py-3 font-mono text-blue-600">{g.purchase_orders?.po_number || 'Penerimaan Langsung'}</td>
                        <td className="px-4 py-3 font-semibold">{g.grn_items?.map(i => i.part_number + ' (' + i.qty_received + ')').join(', ') || '-'}</td>
                        <td className="px-4 py-3 text-slate-500">{g.received_name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: MASTER PART */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3">
              <input
                type="text"
                placeholder="Cari Part Number, Nama Part, atau Model Unit..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full pl-3 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-xs"
              />
              <div className="flex gap-2">
                <select value={filterMovement} onChange={(e) => { setFilterMovement(e.target.value); setPage(1); }} className="px-3 py-2 bg-slate-50 border rounded-lg text-xs">
                  <option value="">Semua Perputaran</option>
                  <option value="FAST">? Fast Moving</option>
                  <option value="SLOW">? Slow Moving</option>
                  <option value="DEAD">?? Dead Stock</option>
                </select>
                <select value={filterKategori} onChange={(e) => { setFilterKategori(e.target.value); setPage(1); }} className="px-3 py-2 bg-slate-50 border rounded-lg text-xs">
                  <option value="">Semua Kategori</option>
                  <option value="Sparepart">Sparepart</option>
                  <option value="Filter">Filter</option>
                  <option value="Undercarriage">Undercarriage</option>
                  <option value="Hydraulic">Hydraulic</option>
                  <option value="Oli & Fluida">Oli & Fluida</option>
                </select>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Part Number</th>
                    <th className="px-4 py-3">Nama Part</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Model Unit</th>
                    <th className="px-4 py-3">Perputaran</th>
                    <th className="px-4 py-3 text-center">Min Stock</th>
                    <th className="px-4 py-3 text-right">Harga Estimasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {parts.map((p) => (
                    <tr key={p.part_number} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600">{p.part_number}</td>
                      <td className="px-4 py-3 font-medium">{p.part_name}</td>
                      <td className="px-4 py-3 text-slate-600">{p.kategori}</td>
                      <td className="px-4 py-3 font-mono text-[11px]">{p.model_kompatibel || '-'}</td>
                      <td className="px-4 py-3 font-semibold">{p.movement_category}</td>
                      <td className="px-4 py-3 text-center">{p.min_stock} {p.satuan}</td>
                      <td className="px-4 py-3 text-right font-mono">{p.harga_estimasi ? 'Rp ' + Number(p.harga_estimasi).toLocaleString('id-ID') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: STOK GUDANG */}
        {activeTab === 'stock' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div className="flex gap-2">
                {warehouses.map(w => (
                  <button
                    key={w.warehouse_code}
                    onClick={() => setSelectedWarehouse(w.warehouse_code)}
                    className={'px-3 py-1.5 rounded-lg text-xs font-semibold ' + 
                      (selectedWarehouse === w.warehouse_code ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600')}
                  >
                    {w.nama_gudang}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Cari part number di gudang ini..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="w-72 px-3 py-1.5 bg-slate-50 border rounded-lg text-xs"
              />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">Part Number</th>
                    <th className="px-4 py-3">Nama Part</th>
                    <th className="px-4 py-3 text-center">Stok Fisik</th>
                    <th className="px-4 py-3 text-center">Dipesan (PR)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stocks.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Belum ada data stok tercatat pada gudang ini.</td></tr>
                  ) : (
                    stocks.map((stk) => (
                      <tr key={stk.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">{stk.part_number}</td>
                        <td className="px-4 py-3">{stk.master_part?.part_name || '-'}</td>
                        <td className="px-4 py-3 text-center font-bold text-sm">{stk.qty_tersedia} {stk.master_part?.satuan || 'Pcs'}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{stk.qty_reserved}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={'px-2 py-0.5 text-xs font-semibold rounded ' + (stk.qty_tersedia > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}>
                            {stk.qty_tersedia > 0 ? 'Tersedia' : 'Habis'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: IMPORT ACCURATE */}
        {activeTab === 'import' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Import Data Excel dari Accurate</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Target Gudang Stok Awal (Opsional)</label>
                  <select value={importWarehouse} onChange={(e) => setImportWarehouse(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs">
                    <option value="">Tanpa inisialisasi stok awal</option>
                    {warehouses.map(w => (
                      <option key={w.warehouse_code} value={w.warehouse_code}>{w.nama_gudang}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5">File Excel (.xlsx)</label>
                  <input type="file" ref={fileInputRef} accept=".xlsx, .xls" onChange={(e) => { if (e.target.files && e.target.files[0]) { setFile(e.target.files[0]); setPreviewData(null); } }} className="w-full text-xs text-slate-500" />
                </div>
              </div>
              <button disabled={!file || loading} onClick={handlePreviewImport} className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg">Preview File</button>
            </div>

            {previewData && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-emerald-300 shadow-sm space-y-4">
                <span className="text-xs font-bold text-emerald-600">{previewData.validPartsCount} Part Siap Diimpor</span>
                <button disabled={importing} onClick={handleExecuteImport} className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg">{importing ? 'Memproses...' : 'Eksekusi Import'}</button>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: GUDANG & VENDOR */}
        {activeTab === 'warehouse_vendor' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm">Daftar Rekanan Supplier / Vendor</h3>
              <button onClick={() => setShowAddVendorModal(true)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg">+ Tambah Vendor</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {vendors.map(v => (
                <div key={v.vendor_code} className="bg-white p-4 rounded-xl border space-y-2">
                  <div className="flex justify-between">
                    <span className="font-mono text-xs font-bold text-blue-600">{v.vendor_code}</span>
                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-semibold">{v.kategori_suplai}</span>
                  </div>
                  <h4 className="font-bold text-sm">{v.nama_vendor}</h4>
                  <p className="text-xs text-slate-500">Telp: {v.no_telepon || '-'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL BUAT PR */}
      {showCreatePRModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm">Formulir Permintaan Part (PR)</h3>
            <form onSubmit={handleSubmitPR} className="space-y-3 text-xs">
              <input type="text" required placeholder="Kode Unit (misal: EX-045)" value={prFormUnit} onChange={(e) => setPrFormUnit(e.target.value.toUpperCase())} className="w-full px-3 py-2 border rounded font-mono font-bold" />
              <textarea placeholder="Keterangan perbaikan..." value={prFormKet} onChange={(e) => setPrFormKet(e.target.value)} className="w-full px-3 py-2 border rounded" rows={2} />
              
              <div className="space-y-2">
                <label className="font-bold">Part Diminta:</label>
                {prFormItems.map((it, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input type="text" required placeholder="Part Number" value={it.part_number} onChange={(e) => { const u = [...prFormItems]; u[idx].part_number = e.target.value; setPrFormItems(u); }} className="w-1/3 px-2 py-1.5 border rounded uppercase font-mono" />
                    <input type="text" required placeholder="Nama Part" value={it.part_name} onChange={(e) => { const u = [...prFormItems]; u[idx].part_name = e.target.value; setPrFormItems(u); }} className="w-1/2 px-2 py-1.5 border rounded" />
                    <input type="number" min="1" value={it.qty_request} onChange={(e) => { const u = [...prFormItems]; u[idx].qty_request = parseInt(e.target.value) || 1; setPrFormItems(u); }} className="w-16 px-2 py-1.5 border rounded text-center font-bold" />
                  </div>
                ))}
                <button type="button" onClick={() => setPrFormItems([...prFormItems, { part_number: '', part_name: '', qty_request: 1, satuan: 'Pcs' }])} className="text-blue-600 font-bold text-[11px]">+ Tambah Part</button>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreatePRModal(false)} className="px-4 py-2 bg-slate-100 rounded">Batal</button>
                <button type="submit" disabled={loading} className="px-5 py-2 bg-emerald-600 text-white font-bold rounded">Kirim PR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ACTION APPROVAL PR */}
      {showActionModal && selectedPR && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm">Konfirmasi Aksi PR: {selectedPR.pr_number}</h3>
            {actionType === 'APPROVE_HO' && (
              <select value={actionWarehouse} onChange={(e) => setActionWarehouse(e.target.value)} className="w-full px-3 py-2 border rounded text-xs font-semibold">
                {warehouses.map(w => (
                  <option key={w.warehouse_code} value={w.warehouse_code}>{w.nama_gudang}</option>
                ))}
              </select>
            )}
            {actionType === 'FULFILL_WAREHOUSE' && (
              <input type="text" placeholder="Nomor DO / Surat Jalan" value={actionDoNumber} onChange={(e) => setActionDoNumber(e.target.value)} className="w-full px-3 py-2 border rounded text-xs font-mono" />
            )}
            <div className="pt-3 flex justify-end gap-2">
              <button onClick={() => setShowActionModal(false)} className="px-4 py-2 bg-slate-100 rounded text-xs">Batal</button>
              <button disabled={loading} onClick={handleExecuteAction} className="px-5 py-2 bg-blue-600 text-white rounded text-xs font-bold">Proses Aksi</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TERBITKAN PO */}
      {showCreatePOModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm">Penerbitan Dokumen Purchase Order (PO)</h3>
            <form onSubmit={handleSubmitPO} className="space-y-3 text-xs">
              <select value={poFormVendor} onChange={(e) => setPoFormVendor(e.target.value)} className="w-full px-3 py-2 border rounded">
                {vendors.map(v => (
                  <option key={v.vendor_code} value={v.vendor_code}>{v.nama_vendor} ({v.vendor_code})</option>
                ))}
              </select>
              
              <div className="space-y-2">
                <label className="font-bold">Daftar Part yang Dipesan:</label>
                {poFormItems.map((it, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input type="text" required placeholder="Part Number" value={it.part_number} onChange={(e) => { const u = [...poFormItems]; u[idx].part_number = e.target.value; setPoFormItems(u); }} className="w-1/3 px-2 py-1.5 border rounded uppercase font-mono" />
                    <input type="number" min="1" placeholder="Qty" value={it.qty_ordered} onChange={(e) => { const u = [...poFormItems]; u[idx].qty_ordered = parseInt(e.target.value) || 1; setPoFormItems(u); }} className="w-16 px-2 py-1.5 border rounded text-center" />
                    <input type="number" placeholder="Harga Satuan (Rp)" value={it.unit_price} onChange={(e) => { const u = [...poFormItems]; u[idx].unit_price = parseFloat(e.target.value) || 0; setPoFormItems(u); }} className="w-1/3 px-2 py-1.5 border rounded font-mono" />
                  </div>
                ))}
                <button type="button" onClick={() => setPoFormItems([...poFormItems, { part_number: '', part_name: '', qty_ordered: 1, unit_price: 0 }])} className="text-blue-600 font-bold text-[11px]">+ Tambah Part PO</button>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreatePOModal(false)} className="px-4 py-2 bg-slate-100 rounded">Batal</button>
                <button type="submit" disabled={loading} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded">Terbitkan PO</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TERIMA BARANG (GRN) */}
      {showCreateGRNModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm">Penerimaan Barang Masuk Gudang (GRN)</h3>
            <form onSubmit={handleSubmitGRN} className="space-y-3 text-xs">
              <select value={grnFormWh} onChange={(e) => setGrnFormWh(e.target.value)} className="w-full px-3 py-2 border rounded">
                {warehouses.map(w => (
                  <option key={w.warehouse_code} value={w.warehouse_code}>{w.nama_gudang}</option>
                ))}
              </select>
              <input type="text" placeholder="Nomor Surat Jalan Vendor (Surat Pengantar)" value={grnFormSJ} onChange={(e) => setGrnFormSJ(e.target.value)} className="w-full px-3 py-2 border rounded font-mono" />
              
              <div className="space-y-2">
                <label className="font-bold">Fisik Part yang Diterima (+Stok Gudang):</label>
                {grnFormItems.map((it, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input type="text" required placeholder="Part Number" value={it.part_number} onChange={(e) => { const u = [...grnFormItems]; u[idx].part_number = e.target.value; setGrnFormItems(u); }} className="w-2/3 px-2 py-1.5 border rounded uppercase font-mono" />
                    <input type="number" min="1" placeholder="Qty Diterima" value={it.qty_received} onChange={(e) => { const u = [...grnFormItems]; u[idx].qty_received = parseInt(e.target.value) || 1; setGrnFormItems(u); }} className="w-1/3 px-2 py-1.5 border rounded text-center font-bold" />
                  </div>
                ))}
                <button type="button" onClick={() => setGrnFormItems([...grnFormItems, { part_number: '', qty_received: 1 }])} className="text-blue-600 font-bold text-[11px]">+ Tambah Part</button>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateGRNModal(false)} className="px-4 py-2 bg-slate-100 rounded">Batal</button>
                <button type="submit" disabled={loading} className="px-5 py-2 bg-amber-600 text-white font-bold rounded">Simpan Penerimaan (+Stok)</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH VENDOR */}
      {showAddVendorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm">Tambah Rekanan Vendor Baru</h3>
            <form onSubmit={handleSaveVendor} className="space-y-3 text-xs">
              <input type="text" required placeholder="Kode Vendor (misal: VND-002)" value={formDataVendor.vendor_code} onChange={(e) => setFormDataVendor({ ...formDataVendor, vendor_code: e.target.value })} className="w-full px-3 py-2 border rounded font-mono uppercase" />
              <input type="text" required placeholder="Nama Perusahaan / Vendor" value={formDataVendor.nama_vendor} onChange={(e) => setFormDataVendor({ ...formDataVendor, nama_vendor: e.target.value })} className="w-full px-3 py-2 border rounded" />
              <input type="text" placeholder="Kategori Suplai (misal: Ban Heavy Duty)" value={formDataVendor.kategori_suplai} onChange={(e) => setFormDataVendor({ ...formDataVendor, kategori_suplai: e.target.value })} className="w-full px-3 py-2 border rounded" />
              <input type="text" placeholder="No. Telepon / WhatsApp" value={formDataVendor.no_telepon} onChange={(e) => setFormDataVendor({ ...formDataVendor, no_telepon: e.target.value })} className="w-full px-3 py-2 border rounded" />
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddVendorModal(false)} className="px-4 py-2 bg-slate-100 rounded">Batal</button>
                <button type="submit" disabled={loading} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded">Simpan Rekanan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
