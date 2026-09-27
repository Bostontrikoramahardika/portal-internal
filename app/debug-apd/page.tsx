'use client'
import { useState } from 'react'

export default function DebugAPDPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/debug-apd', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      setResult(data)
    } catch (err: any) {
      setResult({ error: err.message })
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', background: '#fff', minHeight: '100vh' }}>
      <h1 style={{ color: '#000' }}>🔍 Debug APD Excel Structure</h1>
      <p style={{ color: '#666' }}>Upload file Excel APD untuk lihat struktur mentahnya</p>
      
      <input 
        type="file" 
        accept=".xlsx,.xls" 
        onChange={handleUpload}
        style={{ 
          padding: 10, 
          border: '2px dashed #ccc',
          borderRadius: 8,
          marginTop: 10,
          width: '100%',
          maxWidth: 400
        }}
      />
      
      {loading && <p style={{ color: '#0066cc' }}>⏳ Loading...</p>}
      
      {result && (
        <pre style={{ 
          background: '#1e1e1e', 
          color: '#d4d4d4',
          padding: 15, 
          overflow: 'auto',
          fontSize: 11,
          marginTop: 20,
          borderRadius: 8,
          maxHeight: '80vh'
        }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    
      {/* Standard App Footer */}
      <footer className="mt-8 mb-20 sm:mb-6 text-center text-xs text-[#8896a7] italic opacity-60">
        <p>BTM Mobile APP V1.7.0</p>
        <p className="text-[10px]">Powered By rck_Production</p>
      </footer>
</div>
  )
}