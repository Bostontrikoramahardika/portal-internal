// app/api/schema/route.ts
// v1.2 — Chat 25: Fix eligible_tiket_pesawat + Jabatan dropdown

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

    // ═══════════════════════════════════════════════════════════
    // DAFTAR JABATAN — Chat 25 ⭐
    // ═══════════════════════════════════════════════════════════
    const JABATAN_HO = [
      'Director Operations',
      'Business Development',
      'Manager Operations',
      'HR HO',
      'SPV SHE HO',
      'Staff Bus Dev',
      'Staff Finance',
      'Staff HR',
      'Staff IT',
      'Admin HO',
    ]

    const JABATAN_SITE = [
      'PJO',
      'Deputy PJO',
      'HRGA',
      'SHE Officer',
      'Site Admin',
      'Admin GL',
      'Planner',
      'Plant GL',
      'Production GL',
      'Mechanic A2B',
      'Welder',
      'Helper Plant',
      'Operator Excavator',
      'Operator Bulldozer',
      'Operator Grader',
      'Driver LV',
      'Logistic Crew',
    ]

    const JABATAN_ALL = [...new Set([...JABATAN_HO, ...JABATAN_SITE])].sort()

    const schemas: Record<string, any[]> = {
      // ═══════════════════════════════════════════════════════════
      // SCHEMA EMPLOYEES — Chat 25 v1.2
      // ═══════════════════════════════════════════════════════════
      employees: [
        { key: 'nrp', label: 'NRP (Nomor Registrasi)', type: 'text', placeholder: 'Contoh: 1961125', required: true },
        { key: 'nama', label: 'Nama Lengkap', type: 'text', placeholder: 'Nama sesuai KTP', required: true },
        { 
          key: 'site', 
          label: 'Site Penempatan', 
          type: 'select', 
          options: ['Head Office Pusat', 'PPA-MLP'],
          required: true 
        },
        { 
          key: 'jabatan', 
          label: 'Jabatan', 
          type: 'select',
          options: JABATAN_ALL
        },
        { key: 'departemen', label: 'Departemen', type: 'text', placeholder: 'Contoh: HR, Operasional, Plant' },
        { 
          key: 'status_karyawan', 
          label: 'Status Karyawan', 
          type: 'select', 
          options: ['PKWT', 'PKWTT', 'MAGANG', 'HARIAN']
        },

        { key: 'no_hp', label: 'No HP', type: 'text', placeholder: '08xxxxxxxxxx' },
        { key: 'email', label: 'Email', type: 'text', placeholder: 'nama@email.com' },

        { key: 'tanggal_masuk', label: 'Tanggal Mulai Kerja', type: 'date' },
        { key: 'tempat_lahir', label: 'Tempat Lahir', type: 'text', placeholder: 'Kota kelahiran' },
        { key: 'tanggal_lahir', label: 'Tanggal Lahir', type: 'date' },

        { 
          key: 'status_pernikahan', 
          label: 'Status Pernikahan', 
          type: 'select', 
          options: ['BELUM MENIKAH', 'MENIKAH', 'DUDA', 'JANDA']
        },
        { key: 'alamat', label: 'Alamat Domisili', type: 'textarea', placeholder: 'Alamat lengkap saat ini' },

        { key: 'no_kk', label: 'No Kartu Keluarga (KK)', type: 'text' },
        { key: 'nama_istri', label: 'Nama Istri/Suami', type: 'text' },
        { key: 'nama_anak', label: 'Nama Anak (pisahkan dengan koma)', type: 'text', placeholder: 'Andi, Budi, Citra' },
        { key: 'no_darurat', label: 'No Kontak Darurat', type: 'text', placeholder: 'No HP keluarga terdekat' },

        { key: 'bpjs_tk', label: 'No BPJS Ketenagakerjaan', type: 'text' },
        { key: 'bpjs_kes', label: 'No BPJS Kesehatan (Pribadi)', type: 'text' },
        { key: 'bpjs_istri', label: 'No BPJS Kesehatan (Istri/Suami)', type: 'text' },
        { key: 'bpjs_anak1', label: 'No BPJS Kesehatan (Anak 1)', type: 'text' },
        { key: 'bpjs_anak2', label: 'No BPJS Kesehatan (Anak 2)', type: 'text' },
        { key: 'bpjs_anak3', label: 'No BPJS Kesehatan (Anak 3)', type: 'text' },

        { key: 'no_simpol', label: 'No SIMPOL', type: 'text' },
        { key: 'exp_simpol', label: 'Expired SIMPOL', type: 'date' },
        { key: 'exp_simper', label: 'Expired SIMPER', type: 'date' },
        { key: 'exp_mcu', label: 'Expired MCU', type: 'date' },

        { key: 'eligible_tiket_pesawat', label: 'Eligible Tiket Pesawat?', type: 'checkbox' },
      ],

      // ═══════════════════════════════════════════════════════════
      // SCHEMA SP
      // ═══════════════════════════════════════════════════════════
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

      // ═══════════════════════════════════════════════════════════
      // SCHEMA KPI
      // ═══════════════════════════════════════════════════════════
      kpi: [
        { key: 'nrp', label: 'Pilih Karyawan', type: 'employee_select', required: true },
        { key: 'periode', label: 'Periode (Bulan Tahun)', type: 'text', placeholder: 'CONTOH: JULI 2024', required: true },
        { key: 'cat_kinerja', label: '1. Kompetensi & Kinerja (0-10)', type: 'number', placeholder: 'Maksimal 10', required: true },
        { key: 'cat_sikap', label: '2. Sikap & Tanggung Jawab (0-10)', type: 'number', placeholder: 'Maksimal 10', required: true },
        { key: 'cat_disiplin', label: '3. Kedisiplinan & Kerja Sama (0-10)', type: 'number', placeholder: 'Maksimal 10', required: true },
        { key: 'catatan', label: 'Catatan Feedback', type: 'textarea' },
      ],

      // ═══════════════════════════════════════════════════════════
      // SCHEMA KPI SETTINGS
      // ═══════════════════════════════════════════════════════════
      kpi_settings: [
        { key: 'kode', label: 'Kode Sistem', type: 'text', placeholder: 'MINUS_TERLAMBAT', required: true },
        { key: 'label', label: 'Nama Tampilan', type: 'text', placeholder: 'Terlambat Absensi', required: true },
        { key: 'persen', label: 'Bobot Persen (%)', type: 'number', placeholder: '1', required: true },
        { key: 'kategori', label: 'Kategori', type: 'select', options: ['PENGURANG', 'BOBOT'], required: true },
        { key: 'deskripsi', label: 'Deskripsi', type: 'textarea' },
      ],

      // ═══════════════════════════════════════════════════════════
      // SCHEMA SITES_CONFIG
      // ═══════════════════════════════════════════════════════════
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

      // ═══════════════════════════════════════════════════════════
      // SCHEMA JOB_CATEGORIES
      // ═══════════════════════════════════════════════════════════
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