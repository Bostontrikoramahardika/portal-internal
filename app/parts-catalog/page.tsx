'use client'

import { useEffect, useState } from 'react'

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

  // Import modal
  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importUnitCode, setImportUnitCode] = useState('')
  const [importUnitName, setImportUnitName] = useState('')
  const [importReplace, setImportReplace] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  const [isSuperAdmin, setIsSuperAdmin] = useState(true) // TODO: ambil dari session

  useEffect(() => {
    fetchUnits()
  }, [])

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
    if (json.success) setItems(json.items)
    setLoadingItems(false)
  }

  async function doSearch() {
    if (!search.trim()) {
      setSearchResults([])
      setShowSearch(false)
      return
    }
    setShowSearch(true)
    const url = `/api/parts-catalog/search?q=${encodeURIComponent(search)}${
      selectedUnit ? `&unit_id=${selectedUnit.id}` : ''
    }`
    const res = await fetch(url)
    const json = await res.json()
    if (json.success) setSearchResults(json.data)
  }

  async function openFromSearch(r: SearchResult) {
    // load unit if beda
    const targetUnit = units.find(u => u.id === r.parts_assemblies.unit_id)
    if (targetUnit && (!selectedUnit || selectedUnit.id !== targetUnit.id)) {
      await selectUnit(targetUnit)
    }
    // load assembly
    const asmRes = await fetch(`/api/parts-catalog/assembly?id=${r.assembly_id}`)
    const asmJson = await asmRes.json()
    if (asmJson.success) {
      setSelectedAssembly(asmJson.assembly)
      setItems(asmJson.items)
    }
    setShowSearch(false)
    setSearch('')
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
      const res = await fetch('/api/parts-catalog/import-excel', {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      setImportResult(json)
      if (json.success) {
        await fetchUnits()
      }
    } catch (e: any) {
      setImportResult({ error: e.message })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-100px)] bg-slate-50">
      {/* HEADER */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
        <h1 className="text-lg font-black text-[#003D79]">📚 Parts Catalog</h1>

        <div className="flex-1 flex items-center gap-2 max-w-2xl">
          <input
            type="text"
            placeholder="Search part number / name... (contoh: 6754-11-3010)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={doSearch}
            className="px-4 py-2 bg-[#003D79] text-white rounded-lg text-sm font-bold hover:bg-blue-800"
          >
            🔍 Search
          </button>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700"
          >
            📥 Import Excel
          </button>
        )}
      </div>

      {/* SEARCH RESULT DROPDOWN */}
      {showSearch && (
        <div className="bg-white border-b shadow px-4 py-3">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-bold text-slate-600">
              Hasil Pencarian: {searchResults.length}
            </div>
            <button
              onClick={() => { setShowSearch(false); setSearch('') }}
              className="text-xs text-slate-400 hover:text-slate-700"
            >
              ✕ Close
            </button>
          </div>
          {searchResults.length === 0 ? (
            <div className="text-sm text-slate-400 py-4 text-center">Tidak ditemukan</div>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y">
              {searchResults.map(r => (
                <button
                  key={r.id}
                  onClick={() => openFromSearch(r)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-3 text-sm"
                >
                  <span className="font-mono font-bold text-[#003D79] w-32">{r.part_number}</span>
                  <span className="flex-1 truncate">{r.part_name}</span>
                  <span className="text-xs text-slate-500">{r.parts_assemblies?.assembly_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3-PANEL LAYOUT */}
      <div className="grid grid-cols-12 gap-2 p-2 h-[calc(100vh-160px)]">
        {/* LEFT PANEL — TREE */}
        <div className="col-span-3 bg-white border rounded-lg overflow-hidden flex flex-col">
          <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 border-b">
            UNITS / ASSEMBLIES
          </div>
          <div className="flex-1 overflow-y-auto">
            {units.length === 0 && (
              <div className="p-4 text-sm text-slate-400 text-center">
                Belum ada unit.<br />
                {isSuperAdmin && 'Klik Import Excel untuk mulai.'}
              </div>
            )}
            {units.map(u => (
              <div key={u.id}>
                <button
                  onClick={() => selectUnit(u)}
                  className={`w-full text-left px-3 py-2 text-sm font-bold flex items-center gap-2 border-b ${
                    selectedUnit?.id === u.id ? 'bg-blue-50 text-[#003D79]' : 'hover:bg-slate-50'
                  }`}
                >
                  <span>📁</span>
                  <span className="flex-1 truncate">{u.unit_code}</span>
                </button>
                {selectedUnit?.id === u.id && (
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
                          className={`w-full text-left pl-8 pr-2 py-1.5 text-xs flex items-center gap-1 ${
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
          </div>
        </div>

        {/* MIDDLE PANEL — IMAGE */}
        <div className="col-span-5 bg-white border rounded-lg overflow-hidden flex flex-col">
          <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 border-b">
            {selectedAssembly ? selectedAssembly.assembly_name : 'ASSEMBLY IMAGE'}
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-50 p-4">
            {!selectedAssembly ? (
              <div className="text-slate-400 text-sm">Pilih assembly di panel kiri</div>
            ) : selectedAssembly.image_drive_web_view_link ? (
              <a
                href={selectedAssembly.image_drive_web_view_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-sm"
              >
                🖼️ Buka gambar di Google Drive (klik untuk view)
              </a>
            ) : (
              <div className="text-slate-400 text-sm">Tidak ada gambar</div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL — PARTS TABLE */}
        <div className="col-span-4 bg-white border rounded-lg overflow-hidden flex flex-col">
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
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.id} className="border-b hover:bg-blue-50">
                      <td className="px-2 py-1.5 text-center">{it.ref_no ?? '-'}</td>
                      <td className="px-2 py-1.5 font-mono font-bold text-[#003D79]">
                        {it.part_number || '-'}
                      </td>
                      <td className="px-2 py-1.5">{it.part_name || '-'}</td>
                      <td className="px-2 py-1.5 text-center">{it.qty ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* IMPORT MODAL */}
      {showImport && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/60 z-50"
            onClick={() => !importing && setShowImport(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-lg bg-white rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="bg-[#003D79] text-white px-5 py-3 flex justify-between items-center">
              <h3 className="font-bold">📥 Import Excel Parts Catalog</h3>
              <button
                onClick={() => !importing && setShowImport(false)}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Unit Code * (contoh: PC200-8, SAA6D102E-2)
                </label>
                <input
                  type="text"
                  value={importUnitCode}
                  onChange={e => setImportUnitCode(e.target.value)}
                  disabled={importing}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="PC200-8"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Unit Name (opsional)
                </label>
                <input
                  type="text"
                  value={importUnitName}
                  onChange={e => setImportUnitName(e.target.value)}
                  disabled={importing}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Hydraulic Excavator PC200-8"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  File Excel (.xlsx, max 100MB)
                </label>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                  disabled={importing}
                  className="w-full text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={importReplace}
                  onChange={e => setImportReplace(e.target.checked)}
                  disabled={importing}
                />
                Replace existing assemblies (hapus data lama unit ini sebelum import)
              </label>

              {importResult && (
                <div className={`p-3 rounded-lg text-xs ${importResult.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                  {importResult.success ? (
                    <>
                      <div className="font-bold mb-1">✅ {importResult.message}</div>
                      <div>Sheets: {importResult.summary?.total_sheets}</div>
                      <div>Imported assemblies: {importResult.summary?.imported_assemblies}</div>
                      <div>Imported items: {importResult.summary?.imported_items}</div>
                      <div>Skipped: {importResult.summary?.skipped_sheets}</div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold mb-1">❌ Error</div>
                      <div>{importResult.error || importResult.detail || JSON.stringify(importResult)}</div>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={doImport}
                disabled={importing}
                className="w-full py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                {importing ? '⏳ Importing... (bisa 1-5 menit)' : '📥 Start Import'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}