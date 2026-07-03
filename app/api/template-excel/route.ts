import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'

// Definisi template untuk setiap tabel
const TEMPLATES: Record<string, { headers: string[], sample: any[], description: string }> = {
  employees: {
    description: 'Data Karyawan',
    headers: [
      'nrp', 'nama', 'jabatan', 'departemen', 'site',
      'status_karyawan', 'tanggal_masuk', 'tempat_lahir',
      'tanggal_lahir', 'no_hp', 'alamat'
    ],
    sample: [
      {
        nrp: '10001',
        nama: 'Ahmad Wijaya',
        jabatan: 'Operator',
        departemen: 'Produksi',
        site: 'Site A',
        status_karyawan: 'Aktif',
        tanggal_masuk: '2023-01-15',
        tempat_lahir: 'Jakarta',
        tanggal_lahir: '1990-05-20',
        no_hp: '081234567890',
        alamat: 'Jl. Kebon Jeruk No. 1'
      }
    ]
  },
  apd: {
    description: 'Data APD',
    headers: ['nrp', 'nama_barang', 'tanggal_terima', 'kondisi', 'tanggal_expired', 'keterangan'],
    sample: [
      {
        nrp: '10001',
        nama_barang: 'Helm Safety',
        tanggal_terima: '2025-01-10',
        kondisi: 'Baik',
        tanggal_expired: '2027-01-10',
        keterangan: 'PPE standar'
      }
    ]
  },
  pkwt: {
    description: 'Data PKWT',
    headers: ['nrp', 'no_kontrak', 'kontrak_ke', 'mulai_kontrak', 'akhir_kontrak', 'status', 'keterangan'],
    sample: [
      {
        nrp: '10001',
        no_kontrak: 'PKWT/2025/001',
        kontrak_ke: 1,
        mulai_kontrak: '2025-01-01',
        akhir_kontrak: '2025-12-31',
        status: 'Aktif',
        keterangan: 'Kontrak 1 tahun'
      }
    ]
  },
  kpi: {
    description: 'Data KPI',
    headers: ['nrp', 'periode', 'nilai_kpi', 'catatan'],
    sample: [
      { nrp: '10001', periode: '2025-06', nilai_kpi: 88.5, catatan: 'Kinerja baik' }
    ]
  },
  sp: {
    description: 'Data SP',
    headers: ['nrp', 'jenis_sp', 'tanggal_sp', 'alasan', 'keterangan', 'berlaku_sampai'],
    sample: [
      {
        nrp: '10001',
        jenis_sp: 'SP1',
        tanggal_sp: '2025-03-12',
        alasan: 'Terlambat 3x dalam sebulan',
        keterangan: 'Sudah dibina',
        berlaku_sampai: '2025-09-12'
      }
    ]
  },
  roles: {
    description: 'Data Roles',
    headers: ['nrp', 'role', 'active'],
    sample: [
      { nrp: '10005', role: 'atasan', active: 'true' }
    ]
  },
  approval_matrix: {
    description: 'Approval Matrix',
    headers: ['employee_nrp', 'atasan_nrp', 'pjo_nrp', 'active'],
    sample: [
      { employee_nrp: '10001', atasan_nrp: '10005', pjo_nrp: '20001', active: 'true' }
    ]
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  if (!session.roles.includes('hrga')) {
    return NextResponse.json({ error: 'Hanya HRGA yang bisa download' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const table = searchParams.get('table')
  const mode = searchParams.get('mode') || 'empty'

  // Filter params (dari halaman filter)
  const filterSite = searchParams.get('site') || ''
  const filterDepartemen = searchParams.get('departemen') || ''
  const filterStatus = searchParams.get('status') || ''
  const filterJabatan = searchParams.get('jabatan') || ''
  const filterNrp = searchParams.get('nrp') || ''
  const filterNama = searchParams.get('nama') || ''
  const filterPeriodeAwal = searchParams.get('periode_awal') || ''
  const filterPeriodeAkhir = searchParams.get('periode_akhir') || ''
  const filterJenisSp = searchParams.get('jenis_sp') || ''
  const filterKondisi = searchParams.get('kondisi') || ''
  const filterRole = searchParams.get('role') || ''

  // Sorting
  const sortBy = searchParams.get('sort_by') || 'nrp' // default sort by NRP
  const sortOrder = searchParams.get('sort_order') || 'asc' // asc / desc

  if (!table || !TEMPLATES[table]) {
    return NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 })
  }

  const template = TEMPLATES[table]
  let excelData: any[] = []
  let filterInfo: any[] = []

  if (mode === 'export') {
    // ==== BUILD QUERY WITH FILTER ====
    let query = supabase.from(table).select('*')

    // Apply filters based on table
    if (table === 'employees') {
      if (filterSite) query = query.eq('site', filterSite)
      if (filterDepartemen) query = query.eq('departemen', filterDepartemen)
      if (filterStatus) query = query.eq('status_karyawan', filterStatus)
      if (filterJabatan) query = query.ilike('jabatan', `%${filterJabatan}%`)
      if (filterNrp) query = query.ilike('nrp', `%${filterNrp}%`)
      if (filterNama) query = query.ilike('nama', `%${filterNama}%`)

      if (filterSite) filterInfo.push(['Site', filterSite])
      if (filterDepartemen) filterInfo.push(['Departemen', filterDepartemen])
      if (filterStatus) filterInfo.push(['Status', filterStatus])
      if (filterJabatan) filterInfo.push(['Jabatan', filterJabatan])
      if (filterNrp) filterInfo.push(['NRP', filterNrp])
      if (filterNama) filterInfo.push(['Nama', filterNama])
    }
    else if (table === 'apd') {
      if (filterNrp) query = query.ilike('nrp', `%${filterNrp}%`)
      if (filterKondisi) query = query.eq('kondisi', filterKondisi)

      if (filterNrp) filterInfo.push(['NRP', filterNrp])
      if (filterKondisi) filterInfo.push(['Kondisi', filterKondisi])
    }
    else if (table === 'pkwt') {
      if (filterNrp) query = query.ilike('nrp', `%${filterNrp}%`)
      if (filterStatus) query = query.eq('status', filterStatus)

      if (filterNrp) filterInfo.push(['NRP', filterNrp])
      if (filterStatus) filterInfo.push(['Status', filterStatus])
    }
    else if (table === 'kpi') {
      if (filterNrp) query = query.ilike('nrp', `%${filterNrp}%`)
      if (filterPeriodeAwal) query = query.gte('periode', filterPeriodeAwal)
      if (filterPeriodeAkhir) query = query.lte('periode', filterPeriodeAkhir)

      if (filterNrp) filterInfo.push(['NRP', filterNrp])
      if (filterPeriodeAwal) filterInfo.push(['Periode Awal', filterPeriodeAwal])
      if (filterPeriodeAkhir) filterInfo.push(['Periode Akhir', filterPeriodeAkhir])
    }
    else if (table === 'sp') {
      if (filterNrp) query = query.ilike('nrp', `%${filterNrp}%`)
      if (filterJenisSp) query = query.eq('jenis_sp', filterJenisSp)

      if (filterNrp) filterInfo.push(['NRP', filterNrp])
      if (filterJenisSp) filterInfo.push(['Jenis SP', filterJenisSp])
    }
    else if (table === 'roles') {
      if (filterNrp) query = query.ilike('nrp', `%${filterNrp}%`)
      if (filterRole) query = query.eq('role', filterRole)

      if (filterNrp) filterInfo.push(['NRP', filterNrp])
      if (filterRole) filterInfo.push(['Role', filterRole])
    }
    else if (table === 'approval_matrix') {
      if (filterNrp) query = query.ilike('employee_nrp', `%${filterNrp}%`)

      if (filterNrp) filterInfo.push(['Employee NRP', filterNrp])
    }

    // Sorting (agar urutan konsisten)
    const validSortColumns = template.headers
    const finalSortBy = validSortColumns.includes(sortBy) ? sortBy : template.headers[0]
    query = query.order(finalSortBy, { ascending: sortOrder === 'asc' })

    const { data: rows, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Gagal ambil data: ' + error.message }, { status: 500 })
    }

    if (rows && rows.length > 0) {
      // Format data SESUAI urutan header di template (konsisten dengan import!)
      excelData = rows.map((row: any) => {
        const formatted: any = {}

        // WAJIB: iterate berdasarkan template.headers (bukan Object.keys(row))
        // Ini memastikan urutan kolom SAMA dengan template import
        template.headers.forEach(h => {
          let val = row[h]

          // Format tanggal
          if (val && (h.includes('tanggal') || h.includes('mulai') || h.includes('akhir') || h.includes('expired'))) {
            try {
              const d = new Date(val)
              if (!isNaN(d.getTime())) {
                val = d.toISOString().split('T')[0]
              }
            } catch {}
          }

          formatted[h] = val ?? ''
        })
        return formatted
      })
    }

    if (excelData.length === 0) {
      const emptyRow: any = {}
      template.headers.forEach(h => { emptyRow[h] = '' })
      excelData = [emptyRow]
    }
  } else if (mode === 'sample') {
    excelData = template.sample
  } else {
    const emptyRow: any = {}
    template.headers.forEach(h => { emptyRow[h] = '' })
    excelData = [emptyRow]
  }

  // ==== BUILD EXCEL ====
  const wb = XLSX.utils.book_new()

  // Sheet 1: Data (PENTING: header ditentukan biar urutan konsisten)
  const ws = XLSX.utils.json_to_sheet(excelData, { header: template.headers })

  // Auto-width kolom
  const colWidths = template.headers.map(h => {
    const maxLen = Math.max(
      h.length,
      ...excelData.map(row => String(row[h] || '').length)
    )
    return { wch: Math.min(Math.max(maxLen + 3, 12), 50) }
  })
  ws['!cols'] = colWidths

  // Bold header
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_cell({ r: 0, c: C })
    if (ws[address]) {
      ws[address].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E3A8A' } },
        alignment: { horizontal: 'center', vertical: 'center' }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Data')

  // Sheet 2: Info Filter (kalau ada filter)
  if (mode === 'export' && filterInfo.length > 0) {
    const infoData: any[][] = [
      ['📋 INFORMASI FILTER YANG DIGUNAKAN', ''],
      ['', ''],
      ['Tabel', template.description],
      ['Total data', String(excelData.length)],
      ['Tanggal export', new Date().toLocaleString('id-ID')],
      ['Diurutkan berdasarkan', `${sortBy} (${sortOrder === 'asc' ? 'A-Z / Kecil-Besar' : 'Z-A / Besar-Kecil'})`],
      ['', ''],
      ['🔍 Filter Aktif:', ''],
      ...filterInfo,
      ['', ''],
      ['💡 Data ini bisa langsung di-import kembali dengan format yang sama.', '']
    ]
    const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
    wsInfo['!cols'] = [{ wch: 30 }, { wch: 40 }]
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Info Filter')
  }

  // Sheet 3: Petunjuk Pengisian
  const petunjukData = getPetunjukData(table, mode, excelData.length)
  const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukData)
  wsPetunjuk['!cols'] = [{ wch: 25 }, { wch: 55 }, { wch: 35 }]
  XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const modeLabel = mode === 'export' ? 'data_terkini' : (mode === 'sample' ? 'contoh' : 'kosong')
  const filterSuffix = filterInfo.length > 0 ? '_filtered' : ''
  const fileName = `${table}_${modeLabel}${filterSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`
    }
  })
}

function getPetunjukData(table: string, mode: string, dataCount: number): any[][] {
  const modeInfo: any[][] = []

  if (mode === 'export') {
    modeInfo.push(
      ['📊 FILE INI BERISI DATA TERKINI', '', ''],
      ['', '', ''],
      [`Total data: ${dataCount} baris`, '', ''],
      ['', '', ''],
      ['✅ URUTAN KOLOM SUDAH SAMA DENGAN TEMPLATE IMPORT', '', ''],
      ['Jadi bisa langsung di-upload kembali tanpa edit urutan', '', ''],
      ['', '', ''],
      ['Cara Menambah Data Baru:', '', ''],
      ['1', 'JANGAN hapus atau ubah data yang sudah ada', 'Kecuali memang mau update'],
      ['2', 'Tambah data baru di baris paling bawah', ''],
      ['3', 'Pastikan NRP baru tidak duplikat', ''],
      ['4', 'Save file, upload ulang', ''],
      ['5', 'Sistem akan skip data lama, hanya import baris baru', ''],
      ['', '', '']
    )
  } else {
    modeInfo.push(
      ['📄 FILE INI TEMPLATE KOSONG', '', ''],
      ['', '', ''],
      ['Cara Mengisi:', '', ''],
      ['1', 'Isi data mulai baris 2 di sheet Data', ''],
      ['2', 'JANGAN mengubah nama header (baris 1)', ''],
      ['3', 'Format tanggal: YYYY-MM-DD', 'Contoh: 2025-01-15'],
      ['4', 'Save file, upload ke aplikasi', ''],
      ['', '', '']
    )
  }

  const common = [
    ['', '', ''],
    ['ATURAN UMUM:', '', ''],
    ['•', 'Header di baris 1 harus PERSIS seperti template', ''],
    ['•', 'Format tanggal: YYYY-MM-DD', 'Contoh: 2025-01-15'],
    ['•', 'Kolom bertanda WAJIB harus diisi', ''],
    ['', '', ''],
    ['DETAIL KOLOM:', '', '']
  ]

  const details: Record<string, any[][]> = {
    employees: [
      ['Kolom', 'Deskripsi', 'Contoh / Aturan'],
      ['nrp', 'Nomor Registrasi Pegawai (WAJIB, unik)', '10001'],
      ['nama', 'Nama lengkap karyawan (WAJIB)', 'Ahmad Wijaya'],
      ['jabatan', 'Jabatan/posisi', 'Operator, Mekanik, Foreman'],
      ['departemen', 'Departemen kerja', 'Produksi, HR, Maintenance'],
      ['site', 'Lokasi kerja', 'Site A, Site B, HO'],
      ['status_karyawan', 'Status kepegawaian', 'Aktif / Nonaktif / Cuti / Resign'],
      ['tanggal_masuk', 'Tanggal mulai bekerja', '2023-01-15'],
      ['tempat_lahir', 'Tempat lahir', 'Jakarta'],
      ['tanggal_lahir', 'Tanggal lahir', '1990-05-20'],
      ['no_hp', 'Nomor HP (simpan sebagai text)', '081234567890'],
      ['alamat', 'Alamat lengkap', 'Jl. Kebon Jeruk No. 1']
    ],
    apd: [
      ['Kolom', 'Deskripsi', 'Contoh / Aturan'],
      ['nrp', 'NRP karyawan penerima (WAJIB)', '10001'],
      ['nama_barang', 'Nama APD (WAJIB)', 'Helm Safety, Sepatu Safety'],
      ['tanggal_terima', 'Tanggal terima APD', '2025-01-10'],
      ['kondisi', 'Kondisi barang', 'Baik / Rusak / Perlu Ganti'],
      ['tanggal_expired', 'Tanggal expired APD', '2027-01-10'],
      ['keterangan', 'Catatan tambahan', 'PPE standar']
    ],
    pkwt: [
      ['Kolom', 'Deskripsi', 'Contoh / Aturan'],
      ['nrp', 'NRP karyawan (WAJIB)', '10001'],
      ['no_kontrak', 'Nomor kontrak', 'PKWT/2025/001'],
      ['kontrak_ke', 'Kontrak ke berapa (angka)', '1, 2, 3'],
      ['mulai_kontrak', 'Tanggal mulai kontrak (WAJIB)', '2025-01-01'],
      ['akhir_kontrak', 'Tanggal akhir kontrak (WAJIB)', '2025-12-31'],
      ['status', 'Status kontrak', 'Aktif / Berakhir / Diperpanjang / Diputus'],
      ['keterangan', 'Catatan', 'Kontrak 1 tahun']
    ],
    kpi: [
      ['Kolom', 'Deskripsi', 'Contoh / Aturan'],
      ['nrp', 'NRP karyawan (WAJIB)', '10001'],
      ['periode', 'Periode KPI (WAJIB, format YYYY-MM)', '2025-06'],
      ['nilai_kpi', 'Nilai KPI (WAJIB, angka 0-100)', '88.5'],
      ['catatan', 'Catatan penilaian', 'Kinerja baik']
    ],
    sp: [
      ['Kolom', 'Deskripsi', 'Contoh / Aturan'],
      ['nrp', 'NRP karyawan (WAJIB)', '10001'],
      ['jenis_sp', 'Jenis SP (WAJIB)', 'SP1 / SP2 / SP3 / PHK'],
      ['tanggal_sp', 'Tanggal SP dikeluarkan (WAJIB)', '2025-03-12'],
      ['alasan', 'Alasan SP (WAJIB)', 'Terlambat 3x'],
      ['keterangan', 'Catatan', 'Sudah dibina'],
      ['berlaku_sampai', 'SP berlaku sampai kapan', '2025-09-12']
    ],
    roles: [
      ['Kolom', 'Deskripsi', 'Contoh / Aturan'],
      ['nrp', 'NRP karyawan (WAJIB)', '10005'],
      ['role', 'Role user (WAJIB)', 'karyawan / atasan / pjo / hrga / admin'],
      ['active', 'Status aktif', 'true / false']
    ],
    approval_matrix: [
      ['Kolom', 'Deskripsi', 'Contoh / Aturan'],
      ['employee_nrp', 'NRP karyawan (WAJIB)', '10001'],
      ['atasan_nrp', 'NRP atasan (WAJIB)', '10005'],
      ['pjo_nrp', 'NRP PJO (WAJIB)', '20001'],
      ['active', 'Status aktif', 'true / false']
    ]
  }

  return [...modeInfo, ...common, ...(details[table] || [])]
}