// app/lib/tablePermissions.ts

export interface TablePermissionSet {
  create?: string
  edit?: string
  delete?: string
  import?: string
  export?: string
  view_all?: string
  has_schema?: boolean 
}

export const TABLE_PERMISSIONS: Record<string, TablePermissionSet> = {
  // ═══════ VIRTUAL VIEW (HANYA LIHAT) ═══════
  monitoring_expired: {
    has_schema: false // 🔒 Sembunyikan Tambah & Edit
  },

  // ═══════ KARYAWAN ═══════
  employees: {
    create: 'karyawan_create',
    edit: 'karyawan_edit',
    delete: 'karyawan_delete',
    import: 'karyawan_import_excel',
    export: 'karyawan_export_excel',
    view_all: 'karyawan_view_all_sites',
    has_schema: false 
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

  annual_leave_balances: {
    view_all: 'cuti_view_all_sites',
    has_schema: false
  },

  leave_tickets: {
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
    has_schema: true 
  },
  sp: {
    create: 'dokumen_edit',
    edit: 'dokumen_edit',
    delete: 'dokumen_edit',
    has_schema: true 
  },
  job_categories: {
    create: 'master_job_kategori',
    edit: 'master_job_kategori',
    delete: 'master_job_kategori',
    has_schema: true 
  },
  kpi_settings: {
    create: 'master_bobot_kpi',
    edit: 'master_bobot_kpi',
    delete: 'master_bobot_kpi',
    has_schema: true 
  },
  sites_config: {
    edit: 'master_site_setup',
    delete: 'master_site_setup',
    has_schema: true 
  }
}

export function getTablePermissions(tableName: string): TablePermissionSet | null {
  return TABLE_PERMISSIONS[tableName] || null
}