'use client'

import { useEffect, useState } from 'react'

interface PartsBookItem {
  id: string
  unit_name: string
  unit_model: string | null
  unit_serial: string | null
  doc_type: string
  category: string | null
  notes: string | null
  drive_file_name: string
  drive_web_view_link: string
  created_at: string
}

export default function PartsBookPage() {
  const [data, setData] = useState<PartsBookItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // Form state
  const [form, setForm] = useState({
    unit_name: '',
    unit_model: '',
    unit_serial: '',
    doc_type: 'parts_book',
    category: '',
    notes: '',
  })
  const [file, setFile] = useState<File | null>(null)

  // Fetch data
  const fetchData = async () => {
    setLoading(true)
    const res = await fetch(`/api/parts-book/list?search=${search}`)
    const json = await res.json()
    if (json.success) {
      setData(json.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [search])

  // Dummy super admin checker (sementara)
  useEffect(() => {
    // TODO: nanti bisa ambil dari session
    setIsSuperAdmin(true)
  }, [])

  const handleUpload = async () => {
    if (!file) {
      alert('Pilih file dulu')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('unit_name', form.unit_name)
    formData.append('unit_model', form.unit_model)
    formData.append('unit_serial', form.unit_serial)
    formData.append('doc_type', form.doc_type)
    formData.append('category', form.category)
    formData.append('notes', form.notes)
    formData.append('uploaded_by', '0530224')

    const res = await fetch('/api/parts-book/upload', {
      method: 'POST',
      body: formData,
    })

    const json = await res.json()
    if (json.success) {
      alert('Upload berhasil')
      setFile(null)
      setForm({
        unit_name: '',
        unit_model: '',
        unit_serial: '',
        doc_type: 'parts_book',
        category: '',
        notes: '',
      })
      fetchData()
    } else {
      alert(json.error || 'Upload gagal')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin hapus dokumen ini?')) return

    const res = await fetch(`/api/parts-book/delete?id=${id}`, {
      method: 'DELETE',
    })

    const json = await res.json()
    if (json.success) {
      alert('Berhasil dihapus')
      fetchData()
    } else {
      alert(json.error || 'Gagal hapus')
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>
        Parts Book
      </h1>

      {/* Search */}
      <input
        type="text"
        placeholder="Search unit / file..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: 8,
          width: 300,
          marginBottom: 20,
          border: '1px solid #ccc',
        }}
      />

      {/* Upload Form */}
      {isSuperAdmin && (
        <div style={{ marginBottom: 30, border: '1px solid #ddd', padding: 16 }}>
          <h3 style={{ marginBottom: 10 }}>Upload Dokumen</h3>

          <input
            type="text"
            placeholder="Unit Name"
            value={form.unit_name}
            onChange={(e) => setForm({ ...form, unit_name: e.target.value })}
          />
          <br /><br />

          <input
            type="text"
            placeholder="Model"
            value={form.unit_model}
            onChange={(e) => setForm({ ...form, unit_model: e.target.value })}
          />
          <br /><br />

          <input
            type="text"
            placeholder="Serial Number"
            value={form.unit_serial}
            onChange={(e) => setForm({ ...form, unit_serial: e.target.value })}
          />
          <br /><br />

          <select
            value={form.doc_type}
            onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
          >
            <option value="parts_book">Parts Book</option>
            <option value="service_manual">Service Manual</option>
            <option value="schematic">Schematic</option>
            <option value="operator_manual">Operator Manual</option>
            <option value="other">Other</option>
          </select>
          <br /><br />

          <input
            type="file"
            accept=".pdf,.jpg,.png"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <br /><br />

          <button onClick={handleUpload}>Upload</button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table border={1} cellPadding={8} style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Unit</th>
              <th>Dokumen</th>
              <th>Tipe</th>
              <th>Tanggal</th>
              {isSuperAdmin && <th>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id}>
                <td>{item.unit_name}</td>
                <td>
                  <a
                    href={item.drive_web_view_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.drive_file_name}
                  </a>
                </td>
                <td>{item.doc_type}</td>
                <td>{new Date(item.created_at).toLocaleDateString()}</td>
                {isSuperAdmin && (
                  <td>
                    <button onClick={() => handleDelete(item.id)}>
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}