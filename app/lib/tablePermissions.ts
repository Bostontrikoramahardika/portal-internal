// app/lib/tablePermissions.ts
// Mapping table_name → permission keys untuk CRUD & Import
// Digunakan oleh TableView & ImportExcel untuk gate button visibility

export interface TablePermissionSet {
  create?: string
  edit?: string
  delete?: string
  import?: string
  export?: string
  view_all?: string
  has_schema?: boolean  // true = tabel punya schema di /api/schema (bisa Edit/Add via modal)
}

/**
 * ⚠️ PENTING: has_schema harus TRUE untuk tabel yang sudah punya definisi di
 * app/api/schema/route.ts. Kalau false, tombol Edit/Add akan disembunyikan.
 * 
 * Tabel yang sudah punya schema saat ini:
 * - sp, kpi, kpi_settings, sites_config, job_categories
 */
export const TABLE_PERMISSIONS: Record<string, TablePermissionSet> = {
  // ═══════ KARYAWAN ═══════
  employees: {
    create: 'karyawan_create',
    edit: 'karyawan_edit',
    delete: 'karyawan_delete',
    import: 'karyawan_import_excel',
    export: 'karyawan_export_excel',
    view_all: 'karyawan_view_all_sites',
    has_schema: false  // ⚠️ Belum ada schema → tombol Edit/Add disembunyikan
  },

  // ═══════ ABSENSI ═══════
  attendance: {
    edit: 'absensi_edit_manual',
    export: 'absensi_export',
    view_all: 'absensi_view_all',
    has_schema: false
  },

  // ═══════ CUTI ═══════
  leave_requests: {
    create: 'cuti_submit_own',
    view_all: 'cuti_view_all_sites',
    has_schema: false
  },

  // ═══════ LEMBUR ═══════
  overtime_requests: {
    create: 'lembur_submit_own',
    view_all: 'lembur_view_all_sites',
    has_schema: false
  },

  // ═══════ SAKIT/IZIN ═══════
  attendance_evidences: {
    create: 'sakit_submit_own',
    view_all: 'sakit_view_history',
    has_schema: false
  },

  // ═══════ DOKUMEN ═══════
  kpi: {
    create: 'kpi_input_penilaian',
    edit: 'kpi_input_penilaian',
    delete: 'dokumen_edit',
    export: 'kpi_export',
    has_schema: true   // ✅ Ada di /api/schema
  },
  apd_history: {
    create: 'dokumen_edit',
    edit: 'dokumen_edit',
    delete: 'dokumen_edit',
    import: 'dokumen_import_excel',
    has_schema: false
  },
  pkwt: {
    create: 'dokumen_edit',
    edit: 'dokumen_edit',
    delete: 'dokumen_edit',
    import: 'dokumen_import_excel',
    has_schema: false
  },
  sp: {
    create: 'dokumen_edit',
    edit: 'dokumen_edit',
    delete: 'dokumen_edit',
    import: 'dokumen_import_excel',
    has_schema: true   // ✅ Ada di /api/schema
  },
  bpjs: {
    create: 'dokumen_edit',
    edit: 'dokumen_edit',
    delete: 'dokumen_edit',
    import: 'dokumen_import_excel',
    has_schema: false
  },
  mcu: {
    create: 'dokumen_edit',
    edit: 'dokumen_edit',
    delete: 'dokumen_edit',
    import: 'dokumen_import_excel',
    has_schema: false
  },
  simper: {
    create: 'dokumen_edit',
    edit: 'dokumen_edit',
    delete: 'dokumen_edit',
    import: 'dokumen_import_excel',
    has_schema: false
  },

  // ═══════ MASTER DATA ═══════
  job_categories: {
    create: 'master_job_kategori',
    edit: 'master_job_kategori',
    delete: 'master_job_kategori',
    has_schema: true   // ✅ Ada di /api/schema
  },
  kpi_settings: {
    create: 'master_bobot_kpi',
    edit: 'master_bobot_kpi',
    delete: 'master_bobot_kpi',
    has_schema: true   // ✅ Ada di /api/schema
  },
  sites_config: {
    edit: 'master_site_setup',
    delete: 'master_site_setup',
    has_schema: true   // ✅ Ada di /api/schema
  },

  // ═══════ ROSTER ═══════
  roster: {
    create: 'roster_upload',
    import: 'roster_import_excel',
    has_schema: false
  },

  // ═══════ PENGUMUMAN ═══════
  announcements: {
    create: 'pengumuman_create',
    delete: 'pengumuman_delete',
    has_schema: false
  },

  // ═══════ ROLES ═══════
  roles: {
    create: 'role_assign',
    edit: 'role_assign',
    delete: 'role_assign',
    has_schema: false
  }
}

/**
 * Ambil permission set untuk tabel tertentu
 * @returns TablePermissionSet atau null kalau tabel tidak terdaftar
 */
export function getTablePermissions(tableName: string): TablePermissionSet | null {
  return TABLE_PERMISSIONS[tableName] || null
}