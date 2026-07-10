// app/api/schema/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(token)
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')

    const schemas: Record<string, any[]> = {
      // SCHEMA SP (Surat Peringatan)
      sp: [
        { key: 'nrp', label: 'Pilih Karyawan', type: 'employee_select', required: true },
        { 
          key: 'jenis_sp', 
          label: 'Jenis SP', 
          type: 'select', 
          options: ['SP1', 'SP2', 'SP3', 'PHK', 'CNC'],
          required: true 
        },
        { key: 'tanggal_sp', label: 'Tanggal SP', type: 'date', required: true },
        { key: 'alasan', label: 'Alasan', type: 'textarea', required: true },
        { key: 'berlaku_sampai', label: 'Berlaku Sampai', type: 'date', required: false },
      ],

      // SCHEMA KPI (Raport Penilaian)
      kpi: [
        { key: 'nrp', label: 'Pilih Karyawan', type: 'employee_select', required: true },
        { key: 'periode', label: 'Periode (Bulan Tahun)', type: 'text', placeholder: 'CONTOH: JULI 2024', required: true },
        { key: 'cat_kinerja', label: '1. Kompetensi & Kinerja (0-10)', type: 'number', placeholder: 'Maksimal 10', required: true },
        { key: 'cat_sikap', label: '2. Sikap & Tanggung Jawab (0-10)', type: 'number', placeholder: 'Maksimal 10', required: true },
        { key: 'cat_disiplin', label: '3. Kedisiplinan & Kerja Sama (0-10)', type: 'number', placeholder: 'Maksimal 10', required: true },
        { key: 'catatan', label: 'Catatan Feedback', type: 'textarea' },
      ],

      // SCHEMA KPI SETTINGS (Bobot Pengurang)
      kpi_settings: [
        { key: 'kode', label: 'Kode Sistem', type: 'text', placeholder: 'MINUS_TERLAMBAT', required: true },
        { key: 'label', label: 'Nama Tampilan', type: 'text', placeholder: 'Terlambat Absensi', required: true },
        { key: 'persen', label: 'Bobot Persen (%)', type: 'number', placeholder: '1', required: true },
        { key: 'kategori', label: 'Kategori', type: 'select', options: ['PENGURANG', 'BOBOT'], required: true },
        { key: 'deskripsi', label: 'Deskripsi', type: 'textarea' },
      ],

      // SCHEMA SITES_CONFIG v1.5.0 (Master Site)
      sites_config: [
        { key: 'kode_site', label: 'Kode Site (Unik)', type: 'text', placeholder: 'PPA-MLP', required: true },
        { key: 'nama_site', label: 'Nama Lengkap Site', type: 'text', placeholder: 'PPA Malinau', required: true },
        { key: 'alamat', label: 'Alamat Lengkap', type: 'textarea' },
        { key: 'latitude', label: 'Latitude GPS', type: 'number', placeholder: '-3.594889' },
        { key: 'longitude', label: 'Longitude GPS', type: 'number', placeholder: '116.223694' },
        { key: 'radius_meter', label: 'Radius GPS (meter)', type: 'number', placeholder: '500' },
        { key: 'siang_jam_masuk', label: 'Jam Masuk Shift Siang', type: 'time' },
        { key: 'siang_jam_pulang', label: 'Jam Pulang Shift Siang', type: 'time' },
        { key: 'malam_jam_masuk', label: 'Jam Masuk Shift Malam', type: 'time' },
        { key: 'malam_jam_pulang', label: 'Jam Pulang Shift Malam', type: 'time' },
        { key: 'is_pusat', label: 'Site Head Office (Pusat)?', type: 'checkbox' },
        { key: 'is_active', label: 'Site Aktif?', type: 'checkbox' },
      ],

      // SCHEMA JOB_CATEGORIES v1.5.0 (Pembagian Tim)
      job_categories: [
        { 
          key: 'kategori', 
          label: 'Kategori Tim', 
          type: 'select', 
          options: ['OPERATOR', 'PLANT', 'SUPPORT'], 
          required: true 
        },
        { key: 'keyword', label: 'Keyword Jabatan (huruf kecil)', type: 'text', placeholder: 'operator', required: true },
        { key: 'active', label: 'Aktifkan Kategori?', type: 'checkbox' },
      ],

      
      // Tambahkan schema tabel lain di bawah ini jika diperlukan...
    }

    const fields = schemas[table || '']

    if (!fields) {
      return NextResponse.json({ error: `Schema untuk tabel ${table} belum didefinisikan` }, { status: 404 })
    }

    return NextResponse.json({ fields })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}