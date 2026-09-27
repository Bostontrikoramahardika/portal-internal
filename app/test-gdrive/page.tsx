'use client';

import PageHeader from "@/app/components/PageHeader";
// app/test-gdrive/page.tsx
// Halaman test upload/list/delete Google Drive
// URL: /test-gdrive
// v1.0 - Chat 5

import { useState, useEffect } from 'react';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  createdTime: string;
  webViewLink: string;
}

export default function TestGDrivePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  async function loadFiles() {
    setLoading(true);
    try {
      const res = await fetch('/api/gdrive/list');
      const data = await res.json();
      if (data.success) setFiles(data.files);
    } catch (err: any) {
      setMessage('❌ Load failed: ' + err.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadFiles();
  }, []);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/gdrive/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`✅ Uploaded: ${data.data.fileName} (${(parseInt(data.data.size) / 1024).toFixed(1)} KB)`);
        setFile(null);
        (document.getElementById('fileInput') as HTMLInputElement).value = '';
        loadFiles();
      } else {
        setMessage('❌ Upload failed: ' + data.message);
      }
    } catch (err: any) {
      setMessage('❌ Error: ' + err.message);
    }
    setUploading(false);
  }

  async function handleDelete(fileId: string, fileName: string) {
    if (!confirm(`Hapus "${fileName}"?`)) return;
    try {
      const res = await fetch(`/api/gdrive/delete?fileId=${fileId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`✅ Deleted: ${fileName}`);
        loadFiles();
      } else {
        setMessage('❌ Delete failed: ' + data.message);
      }
    } catch (err: any) {
      setMessage('❌ Error: ' + err.message);
    }
  }

  function formatSize(bytes: string) {
    const b = parseInt(bytes) || 0;
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <PageHeader title="Test Gdrive" backUrl="/dashboard" />

      <h1 className="text-lg font-bold mb-3">🧪 Test Google Drive Integration</h1>

      {/* Upload Section */}
      <div className="bg-white border rounded p-3 mb-3">
        <h2 className="text-sm font-semibold mb-2">📤 Upload File</h2>
        <div className="flex gap-2 items-center">
          <input
            id="fileInput"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-xs border rounded px-2 py-1 flex-1"
          />
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-3 py-1 text-xs bg-[#003d79] text-white rounded disabled:bg-gray-400"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
        {file && (
          <div className="text-xs text-gray-600 mt-1">
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </div>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className="text-xs p-2 mb-2 rounded bg-yellow-50 border border-yellow-200">
          {message}
        </div>
      )}

      {/* File List */}
      <div className="bg-white border rounded">
        <div className="flex justify-between items-center p-2 border-b bg-gray-50">
          <h2 className="text-sm font-semibold">📁 Files in Drive ({files.length})</h2>
          <button
            onClick={loadFiles}
            disabled={loading}
            className="px-2 py-0.5 text-xs bg-gray-200 rounded"
          >
            {loading ? '...' : '🔄 Refresh'}
          </button>
        </div>
        <table className="w-full text-xs block w-full overflow-x-auto whitespace-nowrap md:table md:whitespace-normal">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Nama File</th>
              <th className="p-2 text-left w-20">Size</th>
              <th className="p-2 text-left w-32">Uploaded</th>
              <th className="p-2 text-center w-24">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {files.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-3 text-center text-gray-400">
                  {loading ? 'Loading...' : 'Belum ada file. Upload dulu di atas ☝️'}
                </td>
              </tr>
            ) : (
              files.map((f) => (
                <tr key={f.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{f.name}</td>
                  <td className="p-2">{formatSize(f.size)}</td>
                  <td className="p-2">{formatDate(f.createdTime)}</td>
                  <td className="p-2 text-center">
                    <a
                      href={f.webViewLink}
                      target="_blank"
                      className="text-blue-600 mr-2"
                    >
                      👁️
                    </a>
                    <button
                      onClick={() => handleDelete(f.id, f.name)}
                      className="text-red-600"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500 mt-3">
        💡 Test page. Nanti akan dihapus setelah UI Parts Book selesai.
      </div>
    
      {/* Standard App Footer */}
      <footer className="mt-8 mb-20 sm:mb-6 text-center text-xs text-[#8896a7] italic opacity-60">
        <p>BTM Mobile APP V1.7.0</p>
        <p className="text-[10px]">Powered By rck_Production</p>
      </footer>
</div>
  );
}