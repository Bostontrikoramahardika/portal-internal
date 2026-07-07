import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'

// ✅ DEFINISI KOLOM UNTUK SETIAP TABEL
const TABLE_COLUMNS: Record<string, string[]> = {
  employees: ['nrp', 'nrp_login', 'nama', 'jabatan', 'departemen', 'site', 'status_karyawan', 'tanggal_masuk', 'tempat_lahir', 'tanggal_lahir', 'no_hp', 'alamat'],
  apd: ['nrp', 'nama_barang', 'tanggal_terima', 'kondisi', 'tanggal_expired', 'keterangan'],
  pkwt: ['nrp', 'no_kontrak', 'kontrak_ke', 'mulai_kontrak', 'akhir_kontrak', 'status', 'keterangan'],
  kpi: ['nrp', 'periode', 'nilai_kpi', 'catatan'],
  sp: ['nrp', 'jenis_sp', 'tanggal_sp', 'alasan', 'keterangan', 'berlaku_sampai'],
  roles: ['nrp', 'role', 'active'],
  approval_matrix: ['employee_nrp', 'atasan_nrp', 'pjo_nrp', 'active'],
  
  // ✅ BPJS: Kolom wajib 'nama_karyawan' (sesuai format Excel)
  bpjs: ['site', 'nama_karyawan', 'jabatan', 'tgl_masuk', 'bpjs_ketenagakerjaan', 'bpjs_kesehatan', 'no_ktp', 'istri_nama', 'istri_bpjs', 'anak1_nama', 'anak1_bpjs', 'anak2_nama', 'anak2_bpjs', 'anak3_nama', 'anak3_bpjs', 'keterangan'],
  
  // ✅ MCU
  mcu: ['nrp', 'nama_karyawan', 'tanggal_mcu', 'jenis_mcu', 'hasil', 'tanggal_expired', 'catatan_hrga'],
  
  // ✅ SIMPER
  simper: ['nrp', 'nama_karyawan', 'jenis_simper', 'nomor_simper', 'tanggal_terbit', 'tanggal_expired', 'status'],
}

// ✅ SAMPLE DATA UNTUK SETIAP TABEL (1 row contoh)
const SAMPLE_DATA: Record<string, any[]> = {
  employees: [{
    nrp: '1001', nrp_login: '1001', nama: 'Budi Santoso', jabatan: 'Operator',
    departemen: 'Produksi', site: 'Site A', status_karyawan: 'Aktif',
    tanggal_masuk: '2020-01-15', tempat_lahir: 'Surabaya',
    tanggal_lahir: '1995-05-20', no_hp: '081234567890', alamat: 'Jl. Merdeka No. 1'
  }],
  apd: [{
    nrp: '1001', nama_barang: 'Helm Safety', tanggal_terima: '2024-01-10',
    kondisi: 'Baik', tanggal_expired: '2025-01-10', keterangan: 'Pengganti lama'
  }],
  pkwt: [{
    nrp: '1001', no_kontrak: 'PKWT-2024-001', kontrak_ke: 1,
    mulai_kontrak: '2024-01-01', akhir_kontrak: '2024-12-31',
    status: 'Aktif', keterangan: 'Kontrak pertama'
  }],
  kpi: [{
    nrp: '1001', periode: '2024-01', nilai_kpi: 85, catatan: 'Baik'
  }],
  sp: [{
    nrp: '1001', jenis_sp: 'SP1', tanggal_sp: '2024-03-15',
    alasan: 'Terlambat berkali-kali', keterangan: '', berlaku_sampai: '2024-09-15'
  }],
  roles: [{
    nrp: '1001', role: 'karyawan', active: true
  }],
  approval_matrix: [{
    employee_nrp: '1001', atasan_nrp: '2001', pjo_nrp: '3001', active: true
  }],
  
  // ✅ SAMPLE BPJS - lengkap dengan istri & anak
  bpjs: [{
    site: 'PPA-SKS',
    nama_karyawan: 'Dody Wanda Rukmana',
    jabatan: 'PJO',
    tgl_masuk: '2022-07-15',
    bpjs_ketenagakerjaan: '22142012586',
    bpjs_kesehatan: '0002906509961',
    no_ktp: '3522063004920001',
    istri_nama: 'Fifinda Lukitasari',
    istri_bpjs: '0002906523189',
    anak1_nama: 'Annasya Zahira Putri Rukmana',
    anak1_bpjs: '0002906524326',
    anak2_nama: '',
    anak2_bpjs: '',
    anak3_nama: '',
    anak3_bpjs: '',
    keterangan: ''
  }],
  
  // ✅ SAMPLE MCU
  mcu: [{
    nrp: '1001', nama_karyawan: 'Budi Santoso', tanggal_mcu: '2024-03-20',
    jenis_mcu: 'Tahunan', hasil: 'Sehat', tanggal_expired: '2025-03-20',
    catatan_hrga: 'Tidak ada catatan'
  }],
  
  // ✅ SAMPLE SIMPER
  simper: [{
    nrp: '1001', nama_karyawan: 'Budi Santoso', jenis_simper: 'SIMPER Operator',
    nomor_simper: 'SIM-2024-001', tanggal_terbit: '2024-01-15',
    tanggal_expired: '2025-01-15', status: 'Aktif'
  }]
}

// ✅ Kolom yang harus di-quote (untuk filter & sort)
const STRING_COLUMNS: Record<string, string[]> = {
  employees: ['nrp', 'nrp_login', 'nama', 'jabatan', 'departemen', 'site', 'status_karyawan', 'tempat_lahir', 'no_hp', 'alamat'],
  apd: ['nrp', 'nama_barang', 'kondisi', 'keterangan'],
  pkwt: ['nrp', 'no_kontrak', 'status', 'keterangan'],
  kpi: ['nrp', 'periode', 'catatan'],
  sp: ['nrp', 'jenis_sp', 'alasan', 'keterangan'],
  roles: ['nrp', 'role'],
  approval_matrix: ['employee_nrp', 'atasan_nrp', 'pjo_nrp'],
  bpjs: ['site', 'nama_karyawan', 'jabatan', 'bpjs_ketenagakerjaan', 'bpjs_kesehatan', 'no_ktp', 'istri_nama', 'istri_bpjs', 'anak1_nama', 'anak1_bpjs', 'anak2_nama', 'anak2_bpjs', 'anak3_nama', 'anak3_bpjs', 'keterangan'],
  mcu: ['nrp', 'nama_karyawan', 'jenis_mcu', 'hasil', 'catatan_hrga'],
  simper: ['nrp', 'nama_karyawan', 'jenis_simper', 'nomor_simper', 'status']
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const table = searchParams.get('table')
  const mode = searchParams.get('mode') || 'empty' // empty | sample | export

  if (!table) {
    return NextResponse.json({ error: 'Table parameter required' }, { status: 400 })
  }

  const columns = TABLE_COLUMNS[table]
  if (!columns) {
    return NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 })
  }

  try {
    let data: any[] = []

    if (mode === 'empty') {
      // Template kosong - hanya header
      data = [{}]
    } else if (mode === 'sample') {
      // Template dengan 1 row contoh
      data = SAMPLE_DATA[table] || [{}]
    } else if (mode === 'export') {
      // Export data existing dari database
      const { data: rows, error } = await supabase
        .from(table)
        .select('*')
        .limit(1000)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Format data sesuai kolom
      data = (rows || []).map((row: any) => {
        const formatted: any = {}
        columns.forEach(col => {
          let val = row[col]
          // Format tanggal agar lebih readable di Excel
          if (val && typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
            val = val.split('T')[0]
          }
          formatted[col] = val ?? ''
        })
        return formatted
      })

      if (data.length === 0) {
        data = [{}]
      }
    }

    // Buat worksheet dengan header yang di-style (bold, dengan filter)
    const ws = XLSX.utils.json_to_sheet(data, { header: columns })

    // Tambah filter di header (auto-filter)
    if (data.length > 0) {
      ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(columns.length - 1)}${data.length}` }
    }

    // Set lebar kolom otomatis
    ws['!cols'] = columns.map(col => ({
      wch: Math.max(col.length + 2, 15)
    }))

    // Buat workbook
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, table.charAt(0).toUpperCase() + table.slice(1))

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Return sebagai file download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="template_${table}_${mode}_${Date.now()}.xlsx"`,
      },
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}