import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'

// Definisi schema untuk setiap tabel
const TABLE_SCHEMA: Record<string, any[]> = {
  employees: [
    { key: 'nrp', label: 'NRP Actual', type: 'text', required: true },
    { key: 'nrp_login', label: 'NRP Login (untuk login)', type: 'text', placeholder: 'Kosongkan untuk sama dengan NRP' },
    { key: 'nama', label: 'Nama Lengkap', type: 'text', required: true },
    { key: 'jabatan', label: 'Jabatan', type: 'text' },
    { key: 'departemen', label: 'Departemen', type: 'text' },
    { key: 'site', label: 'Site / Lokasi', type: 'text' },
    { key: 'status_karyawan', label: 'Status', type: 'select', options: ['Aktif', 'Nonaktif', 'Cuti', 'Resign'] },
    { key: 'tanggal_masuk', label: 'Tanggal Masuk', type: 'date' },
    { key: 'tempat_lahir', label: 'Tempat Lahir', type: 'text' },
    { key: 'tanggal_lahir', label: 'Tanggal Lahir', type: 'date' },
    { key: 'no_hp', label: 'No. HP', type: 'text' },
    { key: 'alamat', label: 'Alamat', type: 'textarea' },
  ],
  roles: [
    { key: 'nrp', label: '👤 Pilih Karyawan', type: 'employee_picker', required: true },
    { key: 'role', label: 'Role', type: 'select', required: true, options: ['karyawan', 'atasan', 'admin', 'hrga', 'pjo'] },
    { key: 'active', label: 'Aktif', type: 'checkbox' },
  ],
  approval_matrix: [
    { key: 'employee_nrp', label: '👤 Pilih Karyawan', type: 'employee_picker', required: true },
    { key: 'atasan_nrp', label: '👔 Pilih Atasan', type: 'employee_picker', required: true },
    { key: 'pjo_nrp', label: '🎯 Pilih PJO', type: 'employee_picker', required: true },
    { key: 'active', label: 'Aktif', type: 'checkbox' },
  ],
  sites_config: [
    { key: 'nama_site', label: 'Nama Site', type: 'text', required: true, placeholder: 'Contoh: Site A' },
    { key: 'siang_jam_masuk', label: 'Shift SIANG - Jam Masuk', type: 'time', required: true, placeholder: '06:00' },
    { key: 'siang_jam_pulang', label: 'Shift SIANG - Jam Pulang', type: 'time', required: true, placeholder: '17:00' },
    { key: 'siang_batas_telat', label: 'Shift SIANG - Batas Telat (menit)', type: 'number', placeholder: '15' },
    { key: 'malam_jam_masuk', label: 'Shift MALAM - Jam Masuk', type: 'time', required: true, placeholder: '18:00' },
    { key: 'malam_jam_pulang', label: 'Shift MALAM - Jam Pulang', type: 'time', required: true, placeholder: '05:00' },
    { key: 'malam_batas_telat', label: 'Shift MALAM - Batas Telat (menit)', type: 'number', placeholder: '15' },
    { key: 'latitude', label: 'Latitude GPS Site', type: 'number', placeholder: '-6.200000', required: true },
    { key: 'longitude', label: 'Longitude GPS Site', type: 'number', placeholder: '106.816666', required: true },
    { key: 'radius_meter', label: 'Radius Geofencing (meter)', type: 'number', placeholder: '500', required: true },
    { key: 'active', label: 'Site Aktif', type: 'checkbox' },
  ],
announcements: [
  { key: 'title', label: 'Judul', type: 'text', required: true },
  { key: 'content', label: 'Isi Pengumuman', type: 'textarea' },
  { key: 'image_url', label: 'URL Gambar', type: 'text' },
  { key: 'is_urgent', label: 'Urgent (Merah)', type: 'checkbox' },
  { key: 'expires_at', label: 'Tanggal Expired', type: 'date' },
  { key: 'active', label: 'Aktif', type: 'checkbox' },
],

  kpi: [
    { key: 'nrp', label: '👤 Pilih Karyawan', type: 'employee_picker', required: true },
    { key: 'periode', label: 'Periode (YYYY-MM)', type: 'text', required: true, placeholder: 'Contoh: 2025-06' },
    { key: 'nilai_kpi', label: 'Nilai KPI', type: 'number', required: true },
    { key: 'catatan', label: 'Catatan', type: 'textarea' },
  ],
  apd: [
    { key: 'nrp', label: '👤 Pilih Karyawan', type: 'employee_picker', required: true },
    { key: 'nama_barang', label: 'Nama Barang', type: 'text', required: true },
    { key: 'tanggal_terima', label: 'Tanggal Terima', type: 'date' },
    { key: 'kondisi', label: 'Kondisi', type: 'select', options: ['Baik', 'Rusak', 'Perlu Ganti'] },
    { key: 'tanggal_expired', label: 'Tanggal Expired', type: 'date' },
    { key: 'keterangan', label: 'Keterangan', type: 'textarea' },
  ],
  pkwt: [
    { key: 'nrp', label: '👤 Pilih Karyawan', type: 'employee_picker', required: true },
    { key: 'no_kontrak', label: 'No. Kontrak', type: 'text' },
    { key: 'kontrak_ke', label: 'Kontrak Ke-', type: 'number' },
    { key: 'mulai_kontrak', label: 'Mulai Kontrak', type: 'date', required: true },
    { key: 'akhir_kontrak', label: 'Akhir Kontrak', type: 'date', required: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Aktif', 'Berakhir', 'Diperpanjang', 'Diputus'] },
    { key: 'keterangan', label: 'Keterangan', type: 'textarea' },
  ],
  sp: [
    { key: 'nrp', label: '👤 Pilih Karyawan', type: 'employee_picker', required: true },
    { key: 'jenis_sp', label: 'Jenis SP', type: 'select', required: true, options: ['SP1', 'SP2', 'SP3', 'PHK'] },
    { key: 'tanggal_sp', label: 'Tanggal SP', type: 'date', required: true },
    { key: 'alasan', label: 'Alasan', type: 'textarea', required: true },
    { key: 'keterangan', label: 'Keterangan', type: 'textarea' },
    { key: 'berlaku_sampai', label: 'Berlaku Sampai', type: 'date' },
  ],
  roster: [
    { key: 'nrp', label: '👤 Pilih Karyawan', type: 'employee_picker', required: true },
    { key: 'tanggal', label: 'Tanggal', type: 'date', required: true },
    { key: 'shift', label: 'Shift', type: 'select', required: true, options: ['SIANG', 'MALAM', 'OFF', 'CUTI', 'SAKIT', 'IZIN', 'ALPHA', 'LIBUR', 'TRAINING'] },
    { key: 'keterangan', label: 'Keterangan', type: 'text' },
  ],
  attendance: [
    { key: 'nrp', label: '👤 Pilih Karyawan', type: 'employee_picker', required: true },
    { key: 'tanggal', label: 'Tanggal', type: 'date', required: true },
    { key: 'shift', label: 'Shift', type: 'select', options: ['SIANG', 'MALAM'] },
    { key: 'clock_in', label: 'Clock In', type: 'datetime-local' },
    { key: 'clock_out', label: 'Clock Out', type: 'datetime-local' },
    { key: 'status', label: 'Status', type: 'select', required: true, options: ['HADIR', 'TERLAMBAT', 'SETENGAH_HARI', 'ALPHA', 'CUTI', 'SAKIT', 'IZIN', 'LIBUR'] },
    { key: 'jam_kerja_menit', label: 'Jam Kerja (menit)', type: 'number' },
    { key: 'terlambat_menit', label: 'Terlambat (menit)', type: 'number' },
    { key: 'keterangan', label: 'Keterangan', type: 'textarea' },
    { key: 'site', label: 'Site', type: 'text' },
  ],
  overtime_requests: [
    { key: 'nrp', label: '👤 Pilih Karyawan', type: 'employee_picker', required: true },
    { key: 'tanggal', label: 'Tanggal Lembur', type: 'date', required: true },
    { key: 'jam_mulai', label: 'Jam Mulai', type: 'time', required: true },
    { key: 'jam_selesai', label: 'Jam Selesai', type: 'time', required: true },
    { key: 'total_jam', label: 'Total Jam', type: 'number' },
    { key: 'jenis_lembur', label: 'Jenis Lembur', type: 'select', options: ['BIASA', 'LIBUR', 'HARI_BESAR'] },
    { key: 'alasan', label: 'Alasan', type: 'textarea', required: true },
    { key: 'atasan_nrp', label: '👔 Pilih Atasan', type: 'employee_picker' },
    { key: 'status_atasan', label: 'Status Atasan', type: 'select', options: ['PENDING', 'APPROVED', 'REJECTED'] },
    { key: 'catatan_atasan', label: 'Catatan Atasan', type: 'textarea' },
    { key: 'status_final', label: 'Status Final', type: 'select', options: ['MENUNGGU_ATASAN', 'DISETUJUI', 'DITOLAK'] },
  ],
  leave_requests: [
    { key: 'nrp', label: '👤 Pilih Karyawan', type: 'employee_picker', required: true },
    { key: 'tanggal_mulai', label: 'Tanggal Mulai', type: 'date', required: true },
    { key: 'tanggal_selesai', label: 'Tanggal Selesai', type: 'date', required: true },
    { key: 'jumlah_hari', label: 'Jumlah Hari', type: 'number', required: true },
    { key: 'jenis_cuti', label: 'Jenis Cuti', type: 'select', required: true, options: ['Tahunan', 'Sakit', 'Khusus', 'Melahirkan', 'Menikah', 'Duka', 'Lainnya'] },
    { key: 'alasan', label: 'Alasan', type: 'textarea', required: true },
    { key: 'atasan_nrp', label: '👔 Pilih Atasan', type: 'employee_picker' },
    { key: 'pjo_nrp', label: '🎯 Pilih PJO', type: 'employee_picker' },
    { key: 'status_atasan', label: 'Status Atasan', type: 'select', options: ['PENDING', 'APPROVED', 'REJECTED'] },
    { key: 'status_pjo', label: 'Status PJO', type: 'select', options: ['WAITING', 'PENDING', 'APPROVED', 'REJECTED'] },
    { key: 'status_final', label: 'Status Final', type: 'select', options: ['MENUNGGU_ATASAN', 'MENUNGGU_PJO', 'DISETUJUI', 'DITOLAK_ATASAN', 'DITOLAK_PJO'] },
  ],
  menus: [
    { key: 'role', label: 'Role', type: 'select', required: true, options: ['karyawan', 'atasan', 'admin', 'hrga', 'pjo'] },
    { key: 'menu_key', label: 'Menu Key', type: 'text', required: true },
    { key: 'menu_label', label: 'Menu Label', type: 'text', required: true },
    { key: 'menu_icon', label: 'Icon (emoji)', type: 'text' },
    { key: 'menu_group', label: 'Group', type: 'text' },
    { key: 'target_table', label: 'Target Table', type: 'text' },
    { key: 'access_mode', label: 'Access Mode', type: 'text' },
    { key: 'sort_order', label: 'Urutan', type: 'number' },
    { key: 'active', label: 'Aktif', type: 'checkbox' },
  ],
    bpjs: [
  // 📋 DATA KARYAWAN
  { key: 'nama_karyawan', label: '👤 Nama Karyawan', type: 'text', required: true, placeholder: 'Contoh: Achmad Probo Panggasti' },
  { key: 'site', label: '📍 Site', type: 'text', placeholder: 'Contoh: PPA-SKS' },
  { key: 'jabatan', label: '💼 Jabatan', type: 'text', placeholder: 'Contoh: SHE Officer' },
  { key: 'tgl_masuk', label: '📅 Tanggal Masuk', type: 'date' },
  
  // 🛡️ BPJS PRIBADI
  { key: 'bpjs_ketenagakerjaan', label: '🛡️ BPJS Ketenagakerjaan', type: 'text', placeholder: 'Nomor kartu ketenagakerjaan' },
  { key: 'bpjs_kesehatan', label: '❤️ BPJS Kesehatan', type: 'text', placeholder: 'Nomor kartu kesehatan' },
  { key: 'no_ktp', label: '🪪 Nomor KTP', type: 'text', placeholder: '16 digit NIK' },
  
  // 👰 ISTRI
  { key: 'istri_nama', label: '👰 Nama Istri', type: 'text' },
  { key: 'istri_bpjs', label: '💳 No. BPJS Istri', type: 'text' },
  
  // 👶 ANAK 1
  { key: 'anak1_nama', label: '👶 Nama Anak 1', type: 'text' },
  { key: 'anak1_bpjs', label: '💳 No. BPJS Anak 1', type: 'text' },
  
  // 👶 ANAK 2
  { key: 'anak2_nama', label: '👶 Nama Anak 2', type: 'text' },
  { key: 'anak2_bpjs', label: '💳 No. BPJS Anak 2', type: 'text' },
  
  // 👶 ANAK 3
  { key: 'anak3_nama', label: '👶 Nama Anak 3', type: 'text' },
  { key: 'anak3_bpjs', label: '💳 No. BPJS Anak 3', type: 'text' },
  
  { key: 'keterangan', label: '📝 Keterangan', type: 'textarea' },
],
  mcu: [
    { key: 'nrp', label: '👤 Pilih Karyawan', type: 'employee_picker', required: true },
    { key: 'tanggal_mcu', label: 'Tanggal MCU', type: 'date', required: true },
    { key: 'jenis_mcu', label: 'Jenis MCU', type: 'select', options: ['Awal', 'Berkala', 'Tahunan', 'Khusus'] },
    { key: 'hasil', label: 'Hasil MCU', type: 'select', options: ['Sehat', 'Perlu Tindak Lanjut', 'Tidak Sehat'] },
    { key: 'tanggal_expired', label: 'Berlaku Sampai', type: 'date' },
    { key: 'foto_catatan_url', label: 'Foto Catatan', type: 'text' }, // Gunakan key image_url jika ingin pakai logic upload pengumuman
    { key: 'catatan_hrga', label: 'Catatan HRGA', type: 'textarea' },
  ],
  simper: [
    { key: 'nrp', label: '👤 Pilih Karyawan', type: 'employee_picker', required: true },
    { key: 'jenis_simper', label: 'Jenis Unit', type: 'text', placeholder: 'Contoh: LV, DT, Excavator', required: true },
    { key: 'nomor_simper', label: 'Nomor SIMPER', type: 'text' },
    { key: 'tanggal_terbit', label: 'Tanggal Terbit', type: 'date' },
    { key: 'tanggal_expired', label: 'Tanggal Expired', type: 'date', required: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Aktif', 'Expired', 'Suspended'] },
  ],
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const table = searchParams.get('table')
  const searchEmployees = searchParams.get('search_employees')

  // ⚡ ENDPOINT BARU: Search karyawan (untuk employee_picker)
  if (searchEmployees !== null) {
    const search = searchEmployees.trim()
    let empQuery = supabase
      .from('employees')
      .select('nrp, nama, jabatan, departemen, site')
      .eq('status_karyawan', 'Aktif')
      .order('nama')
      .limit(50)

    if (search) {
      empQuery = empQuery.or(`nama.ilike.%${search}%,nrp.ilike.%${search}%`)
    }

    const { data: employees, error } = await empQuery

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ employees: employees || [] })
  }

  if (!table || !TABLE_SCHEMA[table]) {
    return NextResponse.json({ error: 'Schema tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json({
    table,
    fields: TABLE_SCHEMA[table]
  })
}