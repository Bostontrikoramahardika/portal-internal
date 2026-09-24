'use client'

import { useEffect, useRef, useState } from 'react'
import { translatePartName } from '@/app/lib/part-translations'

interface Unit {
  id: string
  unit_code: string
  unit_name: string | null
  brand: string | null
}

interface Assembly {
  id: string
  sheet_name: string
  assembly_name: string
  unit_header: string | null
  image_drive_file_id: string | null
  image_drive_web_view_link: string | null
  sort_order: number
}

interface PartItem {
  id: string
  ref_no: number | null
  part_number: string | null
  part_name: string | null
  qty: number | null
  serial_no: string | null
}

interface SearchResult {
  id: string
  ref_no: number | null
  part_number: string | null
  part_name: string | null
  qty: number | null
  assembly_id: string
  parts_assemblies: {
    assembly_name: string
    unit_id: string
  }
}

// ═══════════════════════════════════════════════
// ZOOMABLE IMAGE COMPONENT
// ═══════════════════════════════════════════════
function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 })
  const touchState = useRef<any>({ mode: 'none' })

  useEffect(() => {
    setScale(1); setPos({ x: 0, y: 0 })
  }, [src])

  function zoomIn() { setScale(s => Math.min(s + 0.25, 5)) }
  function zoomOut() {
    setScale(s => {
      const next = Math.max(s - 0.25, 0.5)
      if (next === 1) setPos({ x: 0, y: 0 })
      return next
    })
  }
  function resetZoom() { setScale(1); setPos({ x: 0, y: 0 }) }

  function handleMouseDown(e: React.MouseEvent) {
    if (scale <= 1) return
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y }
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging) return
    setPos({
      x: dragStart.current.posX + (e.clientX - dragStart.current.x),
      y: dragStart.current.posY + (e.clientY - dragStart.current.y),
    })
  }
  function handleMouseUp() { setDragging(false) }
  function handleWheel(e: React.WheelEvent) {
    if (e.deltaY < 0) zoomIn(); else zoomOut()
  }

  function getDist(t1: React.Touch, t2: React.Touch) {
    const dx = t1.clientX - t2.clientX
    const dy = t1.clientY - t2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      touchState.current = {
        startDist: getDist(e.touches[0], e.touches[1]),
        startScale: scale,
        startPos: { ...pos },
        mode: 'pinch',
      }
    } else if (e.touches.length === 1 && scale > 1) {
      touchState.current = {
        startPos: { ...pos },
        startTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY },
        mode: 'pan',
      }
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchState.current.mode === 'pinch' && e.touches.length === 2) {
      e.preventDefault()
      const newDist = getDist(e.touches[0], e.touches[1])
      const ratio = newDist / touchState.current.startDist
      const newScale = Math.max(0.5, Math.min(5, touchState.current.startScale * ratio))
      setScale(newScale)
    } else if (touchState.current.mode === 'pan' && e.touches.length === 1) {
      e.preventDefault()
      const dx = e.touches[0].clientX - touchState.current.startTouch.x
      const dy = e.touches[0].clientY - touchState.current.startTouch.y
      setPos({
        x: touchState.current.startPos.x + dx,
        y: touchState.current.startPos.y + dy,
      })
    }
  }

  function handleTouchEnd() { touchState.current.mode = 'none' }

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-200 select-none">
      <div className="absolute top-2 right-2 z-10 flex gap-1 bg-white/90 backdrop-blur rounded-lg shadow p-1">
        <button onClick={zoomOut} className="w-8 h-8 flex items-center justify-center text-lg font-bold hover:bg-slate-100 rounded">−</button>
        <button onClick={resetZoom} className="px-2 h-8 text-xs font-bold hover:bg-slate-100 rounded">{Math.round(scale * 100)}%</button>
        <button onClick={zoomIn} className="w-8 h-8 flex items-center justify-center text-lg font-bold hover:bg-slate-100 rounded">+</button>
      </div>
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          onLoad={() => console.log('✅ Image loaded:', src)}
          onError={(e) => console.error('❌ Image failed:', src, e)}
          className="max-w-full max-h-full object-contain bg-white shadow transition-transform"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transitionDuration: dragging ? '0ms' : '100ms',
          }}
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════
// Helper: Extract Google Drive File ID dari web view link
function extractDriveId(link: string | null): string | null {
  if (!link) return null
  const match = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

// Helper: Get image source (Direct Google Drive thumbnail — bypass proxy)
function getImageSrc(asm: Assembly | null): string | null {
  if (!asm) return null
  const fileId = asm.image_drive_file_id || extractDriveId(asm.image_drive_web_view_link)
    return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000` : null
}

export default function PartsCatalogPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [assemblies, setAssemblies] = useState<Assembly[]>([])
  const [selectedAssembly, setSelectedAssembly] = useState<Assembly | null>(null)
  const [items, setItems] = useState<PartItem[]>([])
  const [loadingAsm, setLoadingAsm] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)

  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [searching, setSearching] = useState(false)

  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importUnitCode, setImportUnitCode] = useState('')
  const [importUnitName, setImportUnitName] = useState('')
  const [importReplace, setImportReplace] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  const [isSuperAdmin, setIsSuperAdmin] = useState(true)

  // 📱 Mobile: browse drawer
  const [browseOpen, setBrowseOpen] = useState(false)
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null)

  // 🛒 ORDER STATE
  const [orderPart, setOrderPart] = useState<PartItem | null>(null)
  const [orderQty, setOrderQty] = useState(1)
  const [orderMachine, setOrderMachine] = useState('')
  const [orderPrioritas, setOrderPrioritas] = useState<'Normal' | 'Urgent'>('Normal')
  const [orderKeterangan, setOrderKeterangan] = useState('')
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  const [orderMsg, setOrderMsg] = useState('')

    // 🛒 CART STATE (Multi-part order via localStorage)
  interface CartItem {
    id: string
    part_number: string
    part_name: string
    assembly_id: string
    assembly_name: string
    unit_code: string
    qty: number
    max_qty: number
  }
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkOrder, setShowBulkOrder] = useState(false)
  const [bulkMachine, setBulkMachine] = useState('')
  const [bulkPrioritas, setBulkPrioritas] = useState<'Normal' | 'Urgent'>('Normal')
  const [bulkKeterangan, setBulkKeterangan] = useState('')
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkMsg, setBulkMsg] = useState('')
  const [showImageMobile, setShowImageMobile] = useState(true) // Toggle image

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('btm_parts_cart')
      if (saved) setCart(JSON.parse(saved))
    } catch (e) { console.warn('Cart load failed:', e) }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('btm_parts_cart', JSON.stringify(cart))
    } catch (e) { console.warn('Cart save failed:', e) }
  }, [cart])

  // Reset selected when pindah assembly
  useEffect(() => {
    setSelectedIds(new Set())
  }, [selectedAssembly?.id])

  // Helper: cek apakah item sudah di cart
  function isInCart(itemId: string) {
    return cart.some(c => c.id === itemId)
  }

  // Toggle checkbox
  function toggleSelect(itemId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  // Select all in current assembly
  function toggleSelectAll() {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.filter(i => i.part_number).map(i => i.id)))
    }
  }

  // Add selected to cart
  function addSelectedToCart() {
    if (!selectedUnit || !selectedAssembly) return
    if (selectedIds.size === 0) return

    const newItems: CartItem[] = items
      .filter(it => selectedIds.has(it.id) && it.part_number)
      .map(it => ({
        id: it.id,
        part_number: it.part_number!,
        part_name: it.part_name || '-',
        assembly_id: selectedAssembly.id,
        assembly_name: selectedAssembly.assembly_name,
        unit_code: selectedUnit.unit_code,
        qty: 1,
        max_qty: it.qty || 999,
      }))

    setCart(prev => {
      const existing = new Set(prev.map(c => c.id))
      const filtered = newItems.filter(n => !existing.has(n.id))
      return [...prev, ...filtered]
    })
    setSelectedIds(new Set())
  }

  // Remove from cart
  function removeFromCart(id: string) {
    setCart(prev => prev.filter(c => c.id !== id))
  }

  // Update qty in cart
  function updateCartQty(id: string, qty: number) {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(1, qty) } : c))
  }

  // Clear cart
  function clearCart() {
    if (confirm('Yakin hapus semua item di cart?')) {
      setCart([])
    }
  }

  // Submit bulk order
  async function submitBulkOrder() {
    if (cart.length === 0) return
    if (!bulkMachine.trim()) { setBulkMsg('? Machine / Unit Code wajib diisi'); return }
    setBulkSubmitting(true)
    setBulkMsg('')

    try {
      const res = await fetch('/api/logistik/pr/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_code: bulkMachine.trim().toUpperCase(),
          prioritas: bulkPrioritas.toUpperCase() === 'URGENT' ? 'URGENT' : 'NORMAL',
          keterangan: bulkKeterangan.trim() || ('Permintaan ' + cart.length + ' item via Parts Catalog Cart'),
          items: cart.map(item => ({
            part_number: item.part_number,
            part_name: item.part_name || '-',
            qty_request: item.qty || 1,
            satuan: 'Pcs',
            keterangan: 'Model: ' + item.unit_code + ' | Ass: ' + item.assembly_name
          }))
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        setBulkMsg('? Tiket PR ' + json.pr_number + ' (' + cart.length + ' item) berhasil dibuat!')
        setCart([])
        setTimeout(() => {
          setShowBulkOrder(false)
          setBulkMsg('')
          setBulkMachine('')
          setBulkKeterangan('')
        }, 2000)
      } else {
        setBulkMsg('? ' + (json.error || 'Gagal mengajukan PR massal'))
      }
    } catch (e: any) {
      setBulkMsg('? ' + e.message)
    } finally {
      setBulkSubmitting(false)
    }
  }

  useEffect(() => { fetchUnits() }, [])

  async function fetchUnits() {
    const res = await fetch('/api/parts-catalog/units')
    const json = await res.json()
    if (json.success) setUnits(json.data)
  }

  async function selectUnit(u: Unit) {
    setSelectedUnit(u)
    setSelectedAssembly(null)
    setItems([])
    setLoadingAsm(true)
    setExpandedUnitId(u.id)
    const res = await fetch(`/api/parts-catalog/assemblies?unit_id=${u.id}`)
    const json = await res.json()
    if (json.success) setAssemblies(json.data)
    setLoadingAsm(false)
  }

  async function selectAssembly(a: Assembly) {
    setSelectedAssembly(a)
    setLoadingItems(true)
    const res = await fetch(`/api/parts-catalog/assembly?id=${a.id}`)
    const json = await res.json()
    if (json.success) {
      setSelectedAssembly(json.assembly)
      setItems(json.items)
    }
    setLoadingItems(false)
    setBrowseOpen(false) // close drawer setelah pilih
  }

  async function doSearch() {
    if (!search.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    const url = `/api/parts-catalog/search?q=${encodeURIComponent(search)}${
      selectedUnit ? `&unit_id=${selectedUnit.id}` : ''
    }`
    const res = await fetch(url)
    const json = await res.json()
    if (json.success) setSearchResults(json.data)
    setSearching(false)
  }

  async function openFromSearch(r: SearchResult) {
    const targetUnit = units.find(u => u.id === r.parts_assemblies.unit_id)
    if (targetUnit && (!selectedUnit || selectedUnit.id !== targetUnit.id)) {
      await selectUnit(targetUnit)
    }
    const asmRes = await fetch(`/api/parts-catalog/assembly?id=${r.assembly_id}`)
    const asmJson = await asmRes.json()
    if (asmJson.success) {
      setSelectedAssembly(asmJson.assembly)
      setItems(asmJson.items)
    }
    setShowSearch(false)
    setSearch('')
    setSearchResults([])
  }

  async function doImport() {
    if (!importFile || !importUnitCode.trim()) {
      alert('Pilih file dan isi unit_code')
      return
    }
    setImporting(true)
    setImportResult(null)

    const fd = new FormData()
    fd.append('file', importFile)
    fd.append('unit_code', importUnitCode.trim())
    fd.append('unit_name', importUnitName.trim())
    fd.append('replace', importReplace ? 'true' : 'false')

    try {
      const res = await fetch('/api/parts-catalog/import-excel', { method: 'POST', body: fd })
      const json = await res.json()
      setImportResult(json)
      if (json.success) await fetchUnits()
    } catch (e: any) {
      setImportResult({ error: e.message })
    } finally {
      setImporting(false)
    }
  }

  // 🛒 ORDER FUNCTIONS
  function openOrderModal(part: PartItem) {
    setOrderPart(part)
    setOrderQty(1)
    setOrderMachine('')
    setOrderPrioritas('Normal')
    setOrderKeterangan('')
    setOrderMsg('')
  }

  function closeOrderModal() {
    if (orderSubmitting) return
    setOrderPart(null)
    setOrderMsg('')
  }

  async function submitOrder() {
    if (!orderPart || !selectedUnit) return
    if (!orderMachine.trim()) { setOrderMsg('? Machine / Unit Code wajib diisi'); return }
    if (orderQty < 1) { setOrderMsg('? Qty minimal 1'); return }
    setOrderSubmitting(true)
    setOrderMsg('')

    try {
      const res = await fetch('/api/logistik/pr/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_code: orderMachine.trim().toUpperCase(),
          prioritas: orderPrioritas.toUpperCase() === 'URGENT' ? 'URGENT' : 'NORMAL',
          keterangan: (orderKeterangan.trim() ? orderKeterangan.trim() + ' | ' : '') + 'Katalog Part: ' + selectedUnit.unit_code + ' - ' + (selectedAssembly?.assembly_name || ''),
          items: [
            {
              part_number: orderPart.part_number,
              part_name: orderPart.part_name || '-',
              qty_request: orderQty,
              satuan: 'Pcs',
              keterangan: 'Assembly: ' + (selectedAssembly?.assembly_name || '-')
            }
          ]
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setOrderMsg('? Tiket PR ' + json.pr_number + ' berhasil diajukan ke GL Plant!')
        setTimeout(() => closeOrderModal(), 2000)
      } else {
        setOrderMsg('? ' + (json.error || 'Gagal mengajukan PR'))
      }
    } catch (e: any) {
      setOrderMsg('? ' + e.message)
    } finally {
      setOrderSubmitting(false)
    }
  }
  }

  // Tree component (reusable untuk desktop panel & mobile drawer)
  function TreeMenu() {
    return (
      <>
        {units.length === 0 && (
          <div className="p-4 text-sm text-slate-400 text-center">
            Belum ada unit.<br />
            {isSuperAdmin && 'Klik Import untuk mulai.'}
          </div>
        )}
        {units.map(u => (
          <div key={u.id}>
            <button
              onClick={() => selectUnit(u)}
              className={`w-full text-left px-3 py-2.5 text-sm font-bold flex items-center gap-2 border-b ${
                selectedUnit?.id === u.id ? 'bg-blue-50 text-[#003D79]' : 'hover:bg-slate-50'
              }`}
            >
              <span>{expandedUnitId === u.id ? '▼' : '▶'}</span>
              <span>📁</span>
              <span className="flex-1 truncate">{u.unit_code}</span>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                {selectedUnit?.id === u.id ? assemblies.length : ''}
              </span>
            </button>
            {expandedUnitId === u.id && selectedUnit?.id === u.id && (
              <div className="bg-slate-50 border-b">
                {loadingAsm ? (
                  <div className="p-3 text-xs text-slate-400">Loading...</div>
                ) : assemblies.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400">Belum ada assembly</div>
                ) : (
                  assemblies.map(a => (
                    <button
                      key={a.id}
                      onClick={() => selectAssembly(a)}
                      className={`w-full text-left pl-10 pr-2 py-2 text-xs flex items-center gap-1 border-b border-slate-100 ${
                        selectedAssembly?.id === a.id
                          ? 'bg-amber-100 text-amber-900 font-bold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>📄</span>
                      <span className="flex-1 truncate">{a.assembly_name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </>
    )
  }

  return (
    <div className="min-h-[calc(100vh-100px)] bg-slate-50 flex flex-col">
      {/* ═══════ HEADER ═══════ */}
      <div className="bg-white border-b px-3 py-2 flex flex-wrap items-center gap-2 sticky top-0 z-30">
        <a
          href="/dashboard"
          className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-bold text-slate-700"
          title="Kembali ke Dashboard"
        >
          ←
        </a>
        <h1 className="text-base md:text-lg font-black text-[#003D79] whitespace-nowrap">📚 Parts Catalog</h1>

        {/* Desktop search inline */}
        <div className="hidden md:flex flex-1 items-center gap-2 min-w-[200px]">
          <input
            type="text"
            placeholder="Search part number / name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (setShowSearch(true), doSearch())}
            className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => { setShowSearch(true); doSearch() }}
            className="px-3 py-1.5 bg-[#003D79] text-white rounded-lg text-sm font-bold hover:bg-blue-800"
          >
            🔍
          </button>
        </div>

        <div className="flex-1 md:hidden"></div>

        {/* Desktop only: Orders + Import */}
        <a
          href="/part-orders"
          className="hidden md:inline-flex px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 whitespace-nowrap items-center"
        >
          📋 Orders
        </a>

        {isSuperAdmin && (
          <button
            onClick={() => setShowImport(true)}
            className="hidden md:inline-flex px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 whitespace-nowrap items-center"
          >
            📥 Import
          </button>
        )}
      </div>

      {/* ═══════ MOBILE TOP BAR ═══════ */}
      <div className="md:hidden bg-[#003D79] px-2 py-2 flex gap-2 sticky top-[52px] z-20">
        <button
          onClick={() => setBrowseOpen(true)}
          className="flex-1 bg-white text-[#003D79] px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
        >
          ☰ Browse
        </button>
        <button
          onClick={() => setShowSearch(true)}
          className="flex-1 bg-white/20 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
        >
          🔍 Cari
        </button>
<a
  href="/part-orders"
  className="flex-1 bg-amber-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
>
  🛒 Orders
</a>
{cart.length > 0 && (
  <button
    onClick={() => setShowBulkOrder(true)}
    className="relative px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold"
    title={`${cart.length} part di cart`}
  >
    🛍️
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
      {cart.length}
    </span>
  </button>
)}
      </div>

      {/* ═══════ MOBILE CONTENT ═══════ */}
      <div className="md:hidden flex-1 flex flex-col">
        {/* Breadcrumb */}
        {selectedAssembly && (
          <div className="bg-white border-b px-3 py-2 text-xs flex items-center justify-between">
            <div className="flex-1 truncate">
              <span className="text-slate-500">{selectedUnit?.unit_code}</span>
              <span className="text-slate-400 mx-1">›</span>
              <span className="font-bold text-amber-600">{selectedAssembly.assembly_name}</span>
            </div>
            <button
              onClick={() => setShowImageMobile(v => !v)}
              className="ml-2 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-700 whitespace-nowrap"
            >
              {showImageMobile ? '⬒ Sembunyikan' : '⬓ Tampilkan'} Gambar
            </button>
          </div>
        )}

        {/* Sticky Image */}
        {selectedAssembly && showImageMobile && (
          <div
            className="bg-white border-b relative sticky z-10"
            style={{
              top: '96px', // 52px header + 44px mobile top bar
              height: '38vh',
              minHeight: '240px',
              maxHeight: '400px',
            }}
          >
            {getImageSrc(selectedAssembly) ? (
              <ZoomableImage
                src={getImageSrc(selectedAssembly)!}
                alt={selectedAssembly.assembly_name}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Tidak ada gambar
              </div>
            )}
          </div>
        )}

        {/* Kalau belum pilih assembly */}
        {!selectedAssembly && (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-4 text-center">
            Klik ☰ Browse untuk pilih assembly
          </div>
        )}

        {/* Parts info + list */}
        {selectedAssembly && (
          <>
            {/* Sticky Toolbar */}
            <div
              className="bg-slate-100 px-3 py-2 border-b sticky z-10"
              style={{ top: showImageMobile ? 'calc(96px + 38vh)' : '96px' }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-slate-800 truncate">{selectedAssembly.assembly_name}</div>
                  <div className="text-[10px] text-emerald-700 font-bold">
                    ✅ {items.length} part
                    {selectedIds.size > 0 && <span className="text-blue-600 ml-2">• {selectedIds.size} dipilih</span>}
                  </div>
                </div>
                <button
                  onClick={toggleSelectAll}
                  className="px-2 py-1 bg-white border border-slate-300 rounded text-[10px] font-bold text-slate-700 whitespace-nowrap"
                >
                  {selectedIds.size === items.length ? '☐ Batal' : '☑ Semua'}
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={addSelectedToCart}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold whitespace-nowrap"
                  >
                    + Cart
                  </button>
                )}
              </div>
            </div>

            {/* Parts List Compact */}
            <div className="flex-1 bg-white pb-24">
              {loadingItems ? (
                <div className="p-4 text-sm text-slate-400 text-center">Loading...</div>
              ) : items.length === 0 ? (
                <div className="p-4 text-sm text-slate-400 text-center">Tidak ada parts</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {items.map(it => {
                    const isSelected = selectedIds.has(it.id)
                    const inCart = isInCart(it.id)
                    return (
                      <div
                        key={it.id}
                        onClick={() => it.part_number && toggleSelect(it.id)}
                        className={`px-2 py-2 flex items-center gap-2 ${
                          isSelected ? 'bg-blue-50' : inCart ? 'bg-emerald-50/50' : 'bg-white'
                        } ${it.part_number ? 'cursor-pointer active:bg-blue-100' : 'opacity-60'}`}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(it.id)}
                          onClick={e => e.stopPropagation()}
                          disabled={!it.part_number}
                          className="w-4 h-4 accent-blue-600 flex-shrink-0"
                        />

                        {/* Ref No */}
                        <div className="w-8 text-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-slate-500">
                            #{it.ref_no ?? '-'}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-mono font-bold text-[#003D79] text-xs truncate">
                            {it.part_number || '-'}
                          </div>
                          <div className="text-[11px] text-slate-700 truncate">
                            {translatePartName(it.part_name)}
                          </div>
                        </div>

                        {/* Qty */}
                        <div className="text-[10px] text-slate-500 flex-shrink-0 text-right">
                          <div>Qty</div>
                          <div className="font-bold text-slate-700">{it.qty ?? '-'}</div>
                        </div>

                        {/* Quick order button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openOrderModal(it)
                          }}
                          disabled={!it.part_number}
                          className="w-8 h-8 flex items-center justify-center bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white rounded text-sm flex-shrink-0"
                          title="Order langsung 1 part"
                        >
                          🛒
                        </button>

                        {inCart && (
                          <span className="absolute right-2 -mt-8 text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                            ✓ Cart
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Sticky Bottom: Cart Summary */}
        {cart.length > 0 && (
          <button
            onClick={() => setShowBulkOrder(true)}
            className="fixed bottom-0 left-0 right-0 md:hidden bg-[#003D79] hover:bg-blue-800 text-white py-3 px-4 font-bold text-sm flex items-center justify-center gap-2 shadow-2xl z-20 border-t-2 border-blue-400"
          >
            🛒 Order {cart.length} Part
            {new Set(cart.map(c => c.unit_code)).size > 1 && (
              <span className="text-xs opacity-80">
                ({new Set(cart.map(c => c.unit_code)).size} Unit)
              </span>
            )}
            <span className="ml-auto text-lg">→</span>
          </button>
        )}
      </div>

      {/* ═══════ DESKTOP: 3-PANEL LAYOUT ═══════ */}
      <div className="hidden md:grid md:grid-cols-12 gap-2 p-2 flex-1 overflow-hidden">
        {/* LEFT PANEL - TREE */}
        <div className="md:col-span-3 bg-white border rounded-lg overflow-hidden flex flex-col h-full">
          <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 border-b">
            UNITS / ASSEMBLIES
          </div>
          <div className="flex-1 overflow-y-auto">
            <TreeMenu />
          </div>
        </div>

        {/* MIDDLE PANEL - IMAGE */}
        <div className="md:col-span-5 bg-white border rounded-lg overflow-hidden flex flex-col h-full">
          <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 border-b flex justify-between items-center gap-2">
            <span className="truncate flex-1">{selectedAssembly ? selectedAssembly.assembly_name : 'ASSEMBLY IMAGE'}</span>
            {selectedAssembly?.image_drive_web_view_link && (
              <a href={selectedAssembly.image_drive_web_view_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                🔍 Drive
              </a>
            )}
          </div>
          <div className="flex-1 relative bg-slate-100 min-h-[300px]">
            {!selectedAssembly ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                Pilih assembly di panel kiri
              </div>
            ) : getImageSrc(selectedAssembly) ? (
              <ZoomableImage
                src={getImageSrc(selectedAssembly)!}
                alt={selectedAssembly.assembly_name}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                Tidak ada gambar
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - PARTS */}
        <div className="md:col-span-4 bg-white border rounded-lg overflow-hidden flex flex-col h-full">
          <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 border-b">
            PARTS LIST {items.length > 0 && `(${items.length})`}
          </div>
          <div className="flex-1 overflow-auto">
            {loadingItems ? (
              <div className="p-4 text-sm text-slate-400">Loading...</div>
            ) : !selectedAssembly ? (
              <div className="p-4 text-sm text-slate-400">Pilih assembly</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-slate-400">Tidak ada parts</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left w-10">№</th>
                    <th className="px-2 py-2 text-left">Part Number</th>
                    <th className="px-2 py-2 text-left">Name</th>
                    <th className="px-2 py-2 text-center w-10">Qty</th>
                    <th className="px-2 py-2 text-center w-14">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.id} className="border-b hover:bg-blue-50">
                      <td className="px-2 py-1.5 text-center">{it.ref_no ?? '-'}</td>
                      <td className="px-2 py-1.5 font-mono font-bold text-[#003D79]">{it.part_number || '-'}</td>
                      <td className="px-2 py-1.5">{it.part_name || '-'}</td>
                      <td className="px-2 py-1.5 text-center">{it.qty ?? '-'}</td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => openOrderModal(it)}
                          disabled={!it.part_number}
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white rounded text-[10px] font-bold"
                        >
                          🛒
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ MOBILE BROWSE DRAWER ═══════ */}
      {browseOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 z-50" onClick={() => setBrowseOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 w-[85%] max-w-sm bg-white z-50 flex flex-col shadow-2xl">
            <div className="bg-[#003D79] text-white px-4 py-3 flex justify-between items-center">
              <h3 className="font-bold text-sm">📁 Pilih Unit / Assembly</h3>
              <button onClick={() => setBrowseOpen(false)} className="text-white/80 hover:text-white text-lg">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <TreeMenu />
            </div>
          </div>
        </>
      )}

      {/* ═══════ SEARCH MODAL ═══════ */}
      {showSearch && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 z-50" onClick={() => setShowSearch(false)} />
          <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="bg-[#003D79] text-white px-4 py-3 flex justify-between items-center">
              <h3 className="font-bold text-sm">🔍 Cari Part</h3>
              <button onClick={() => setShowSearch(false)} className="text-white/80 hover:text-white text-lg">✕</button>
            </div>
            <div className="p-3 border-b flex gap-2">
              <input
                type="text"
                placeholder="Part number / name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
                autoFocus
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={doSearch}
                className="px-4 py-2 bg-[#003D79] text-white rounded-lg text-sm font-bold hover:bg-blue-800"
              >
                Cari
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {searching ? (
                <div className="p-6 text-center text-slate-400 text-sm">Mencari...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  {search ? 'Tidak ditemukan' : 'Ketik untuk mencari...'}
                </div>
              ) : (
                <div className="divide-y">
                  <div className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-50">
                    {searchResults.length} hasil ditemukan
                  </div>
                  {searchResults.map(r => (
                    <button
                      key={r.id}
                      onClick={() => openFromSearch(r)}
                      className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex flex-col gap-0.5"
                    >
                      <div className="font-mono font-bold text-[#003D79] text-sm">{r.part_number}</div>
                      <div className="text-xs text-slate-700">{r.part_name}</div>
                      <div className="text-[10px] text-slate-500">{r.parts_assemblies?.assembly_name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══════ IMPORT MODAL ═══════ */}
      {showImport && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 z-50" onClick={() => !importing && setShowImport(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-lg bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="bg-[#003D79] text-white px-5 py-3 flex justify-between items-center">
              <h3 className="font-bold">📥 Import Excel</h3>
              <button onClick={() => !importing && setShowImport(false)} className="text-white/70 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Unit Code *</label>
                <input type="text" value={importUnitCode} onChange={e => setImportUnitCode(e.target.value)} disabled={importing} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="PC200-8" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Unit Name (opsional)</label>
                <input type="text" value={importUnitName} onChange={e => setImportUnitName(e.target.value)} disabled={importing} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Excavator PC200-8" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">File Excel (.xlsx)</label>
                <input type="file" accept=".xlsx" onChange={e => setImportFile(e.target.files?.[0] || null)} disabled={importing} className="w-full text-sm" />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" checked={importReplace} onChange={e => setImportReplace(e.target.checked)} disabled={importing} />
                Replace existing assemblies
              </label>

              {importResult && (
                <div className={`p-3 rounded-lg text-xs ${importResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                  {importResult.success ? (
                    <>
                      <div className="font-bold mb-1">✅ {importResult.message}</div>
                      <div>Sheets: {importResult.summary?.total_sheets}</div>
                      <div>Assemblies: {importResult.summary?.imported_assemblies}</div>
                      <div>Items: {importResult.summary?.imported_items}</div>
                      <div>Skipped: {importResult.summary?.skipped_sheets}</div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold mb-1">❌ Error</div>
                      <div>{importResult.error || importResult.detail}</div>
                    </>
                  )}
                </div>
              )}

              <button onClick={doImport} disabled={importing} className="w-full py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 disabled:opacity-50">
                {importing ? '⏳ Importing...' : '📥 Start Import'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══════ ORDER MODAL ═══════ */}
      {orderPart && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 z-50" onClick={closeOrderModal} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="bg-[#003D79] text-white px-5 py-3 flex justify-between items-center">
              <h3 className="font-bold">🛒 Order Part</h3>
              <button onClick={closeOrderModal} className="text-white/80 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                <div className="flex gap-2"><span className="font-bold text-slate-500 w-20">Part No:</span><span className="font-mono font-bold text-[#003D79]">{orderPart.part_number}</span></div>
                <div className="flex gap-2"><span className="font-bold text-slate-500 w-20">Name:</span><span className="flex-1">{orderPart.part_name}</span></div>
                <div className="flex gap-2"><span className="font-bold text-slate-500 w-20">Unit:</span><span>{selectedUnit?.unit_code}</span></div>
                <div className="flex gap-2"><span className="font-bold text-slate-500 w-20">Assembly:</span><span className="flex-1 truncate">{selectedAssembly?.assembly_name}</span></div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Machine Unit * <span className="text-slate-400 font-normal">(unit yang rusak)</span></label>
                <input type="text" value={orderMachine} onChange={e => setOrderMachine(e.target.value)} disabled={orderSubmitting} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#003D79]" placeholder="Contoh: PC200-7 Unit 03" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Qty *</label>
                  <input type="number" min={1} value={orderQty} onChange={e => setOrderQty(parseInt(e.target.value) || 1)} disabled={orderSubmitting} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#003D79]" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Prioritas</label>
                  <select value={orderPrioritas} onChange={e => setOrderPrioritas(e.target.value as any)} disabled={orderSubmitting} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#003D79]">
                    <option value="Normal">Normal</option>
                    <option value="Urgent">🔥 Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Keterangan</label>
                <textarea value={orderKeterangan} onChange={e => setOrderKeterangan(e.target.value)} disabled={orderSubmitting} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#003D79] resize-none" placeholder="Contoh: bocor di sisi kiri, perlu ganti segera" />
              </div>

              {orderMsg && (
                <div className={`p-2 rounded-lg text-xs font-bold text-center ${orderMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {orderMsg}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={closeOrderModal} disabled={orderSubmitting} className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold text-sm">
                  Batal
                </button>
                <button onClick={submitOrder} disabled={orderSubmitting} className="flex-1 py-2 bg-[#003D79] hover:bg-blue-800 text-white rounded-lg font-bold text-sm disabled:opacity-50">
                  {orderSubmitting ? '⏳ Submitting...' : '🛒 Submit Order'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════ BULK ORDER MODAL ═══════ */}
      {showBulkOrder && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 z-50"
            onClick={() => !bulkSubmitting && setShowBulkOrder(false)}
          />
          <div className="fixed inset-x-2 top-4 bottom-4 md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[92%] md:max-w-lg md:max-h-[90vh] md:inset-auto bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">
            <div className="bg-[#003D79] text-white px-5 py-3 flex justify-between items-center flex-shrink-0">
              <h3 className="font-bold">🛍️ Cart ({cart.length} part)</h3>
              <button
                onClick={() => !bulkSubmitting && setShowBulkOrder(false)}
                className="text-white/80 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Cart kosong. Pilih part terlebih dahulu.
                </div>
              ) : (
                <div className="divide-y">
                  {cart.map(item => (
                    <div key={item.id} className="p-3 flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono font-bold text-[#003D79] text-sm truncate">
                          {item.part_number}
                        </div>
                        <div className="text-xs text-slate-700 truncate">
                          {translatePartName(item.part_name)}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {item.unit_code} › {item.assembly_name}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => updateCartQty(item.id, item.qty - 1)}
                          className="w-7 h-7 bg-slate-200 hover:bg-slate-300 rounded font-bold"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={e => updateCartQty(item.id, parseInt(e.target.value) || 1)}
                          className="w-12 text-center border border-slate-300 rounded py-1 text-sm font-bold"
                        />
                        <button
                          onClick={() => updateCartQty(item.id, item.qty + 1)}
                          className="w-7 h-7 bg-slate-200 hover:bg-slate-300 rounded font-bold"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-7 h-7 bg-red-100 hover:bg-red-200 text-red-600 rounded font-bold ml-1"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Order */}
            {cart.length > 0 && (
              <div className="border-t p-3 space-y-2 bg-slate-50 flex-shrink-0">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Machine Unit * <span className="text-slate-400 font-normal">(unit yang rusak)</span>
                  </label>
                  <input
                    type="text"
                    value={bulkMachine}
                    onChange={e => setBulkMachine(e.target.value)}
                    disabled={bulkSubmitting}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#003D79]"
                    placeholder="Contoh: PC200-7 Unit 03"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Prioritas</label>
                    <select
                      value={bulkPrioritas}
                      onChange={e => setBulkPrioritas(e.target.value as any)}
                      disabled={bulkSubmitting}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Urgent">🔥 Urgent</option>
                    </select>
                  </div>
                  <div>
                    <button
                      onClick={clearCart}
                      disabled={bulkSubmitting}
                      className="w-full h-full mt-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold"
                    >
                      🗑️ Clear Cart
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Keterangan (opsional)</label>
                  <textarea
                    value={bulkKeterangan}
                    onChange={e => setBulkKeterangan(e.target.value)}
                    disabled={bulkSubmitting}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#003D79] resize-none"
                    placeholder="Contoh: perlu segera, unit sedang breakdown"
                  />
                </div>

                {bulkMsg && (
                  <div className={`p-2 rounded-lg text-xs font-bold text-center ${
                    bulkMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700' :
                    bulkMsg.startsWith('⚠️') ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {bulkMsg}
                  </div>
                )}

                <button
                  onClick={submitBulkOrder}
                  disabled={bulkSubmitting || cart.length === 0}
                  className="w-full py-3 bg-[#003D79] hover:bg-blue-800 text-white rounded-lg font-bold text-sm disabled:opacity-50"
                >
                  {bulkSubmitting ? '⏳ Submitting...' : `🛒 Submit ${cart.length} Order`}
                </button>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  )
}