import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import * as XLSX from 'xlsx'

const ALLOWED_TABLES = ['employees', 'apd', 'pkwt', 'kpi', 'sp', 'roles', 'approval_matrix', 'bpjs', 'mcu', 'simper']

const REQUIRED_COLUMNS: Record<string, string[]> = {
  employees: ['nrp', 'nama'],
  apd: ['nrp', 'nama_barang'],
  pkwt: ['nrp', 'mulai_kontrak', 'akhir_kontrak'],
  kpi: ['nrp', 'periode', 'nilai_kpi'],
  sp: ['nrp', 'jenis_sp', 'tanggal_sp', 'alasan'],
  roles: ['nrp', 'role'],
  approval_matrix: ['employee_nrp', 'atasan_nrp', 'pjo_nrp'],
  bpjs: ['nama_karyawan'],
  mcu: ['nrp', 'tanggal_mcu'],
  simper: ['nrp', 'jenis_simper', 'tanggal_expired'],
}

const ALLOWED_COLUMNS: Record<string, string[]> = {
  employees: ['nrp', 'nrp_login', 'nama', 'jabatan', 'departemen', 'site', 'status_karyawan', 'tanggal_masuk', 'tempat_lahir', 'tanggal_lahir', 'no_hp', 'alamat'],
  apd: ['nrp', 'nama_barang', 'tanggal_terima', 'kondisi', 'tanggal_expired', 'keterangan'],
  pkwt: ['nrp', 'no_kontrak', 'kontrak_ke', 'mulai_kontrak', 'akhir_kontrak', 'status', 'keterangan'],
  kpi: ['nrp', 'periode', 'nilai_kpi', 'catatan'],
  sp: ['nrp', 'jenis_sp', 'tanggal_sp', 'alasan', 'keterangan', 'berlaku_sampai'],
  roles: ['nrp', 'role', 'active'],
  approval_matrix: ['employee_nrp', 'atasan_nrp', 'pjo_nrp', 'active'],
  bpjs: ['site', 'nama_karyawan', 'jabatan', 'tgl_masuk', 'bpjs_ketenagakerjaan', 'bpjs_kesehatan', 'no_ktp', 'istri_nama', 'istri_bpjs', 'anak1_nama', 'anak1_bpjs', 'anak2_nama', 'anak2_bpjs', 'anak3_nama', 'anak3_bpjs', 'keterangan'],
  mcu: ['nrp', 'nama_karyawan', 'tanggal_mcu', 'jenis_mcu', 'hasil', 'tanggal_expired', 'catatan_hrga'],
  simper: ['nrp', 'nama_karyawan', 'jenis_simper', 'nomor_simper', 'tanggal_terbit', 'tanggal_expired', 'status'],
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSession(token)
  if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  if (!session.roles.includes('hrga')) {
    return NextResponse.json({ error: 'Hanya HRGA yang bisa import' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const table = formData.get('table') as string

    if (!file || !table) {
      return NextResponse.json({ error: 'File dan table wajib diisi' }, { status: 400 })
    }

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Tabel tidak diizinkan untuk import' }, { status: 400 })
    }

    const allowedCols = ALLOWED_COLUMNS[table] || []
    const requiredCols = REQUIRED_COLUMNS[table] || []

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' })

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'File Excel kosong' }, { status: 400 })
    }

    // ✅ FIX: Info columns yang di-skip, pintar per tabel
    const infoColumnsToSkip = ['nama_atasan', 'nama_pjo', 'info_karyawan', 'info_atasan', 'info_pjo']
    if (table !== 'bpjs' && table !== 'mcu' && table !== 'simper') {
      infoColumnsToSkip.push('nama_karyawan')
    }

    // Bersihkan data
    const cleanedData = jsonData.map((row: any) => {
      const clean: any = {}
      let firstNamaFound = false

      Object.keys(row).forEach(rawKey => {
        const cleanKey = rawKey.trim().toLowerCase().replace(/\s+/g, '_')

        if (!cleanKey || cleanKey.startsWith('__empty') || cleanKey.startsWith('_empty')) return
        if (['id', 'created_at', 'updated_at'].includes(cleanKey)) return
        if (infoColumnsToSkip.includes(cleanKey)) return

        // ✅ Auto-alias "nama" (pertama) → "nama_karyawan" untuk bpjs/mcu/simper
        let actualKey = cleanKey
        if ((table === 'bpjs' || table === 'mcu' || table === 'simper') && cleanKey === 'nama' && !firstNamaFound) {
          actualKey = 'nama_karyawan'
          firstNamaFound = true
        }

        if (!allowedCols.includes(actualKey)) return

        const val = row[rawKey]

        // Format tanggal
        if (cleanKey.includes('tanggal') || cleanKey === 'mulai_kontrak' || cleanKey === 'akhir_kontrak' || cleanKey === 'tanggal_expired' || cleanKey === 'berlaku_sampai' || cleanKey === 'tgl_masuk') {
          if (val && typeof val === 'string') {
            const parsed = new Date(val)
            if (!isNaN(parsed.getTime())) {
              clean[actualKey] = parsed.toISOString().split('T')[0]
            } else {
              clean[actualKey] = val
            }
          } else if (typeof val === 'number') {
            const excelDate = new Date((val - 25569) * 86400 * 1000)
            clean[actualKey] = excelDate.toISOString().split('T')[0]
          } else {
            clean[actualKey] = null
          }
        } else if (cleanKey === 'active') {
          const s = String(val).toLowerCase().trim()
          clean[actualKey] = (s === 'true' || s === '1' || s === 'yes' || s === 'ya' || s === 'aktif')
        } else {
          clean[actualKey] = val === '' ? null : val
        }
      })

      // Auto-set nrp_login = nrp untuk employees
      if (table === 'employees' && clean.nrp && !clean.nrp_login) {
        clean.nrp_login = clean.nrp
      }

      return clean
    })

    // Filter baris kosong
    const validData = cleanedData.filter((row: any) => {
      return requiredCols.every(col => row[col] !== null && row[col] !== undefined && row[col] !== '')
    })

    if (validData.length === 0) {
      return NextResponse.json({
        error: `Tidak ada baris valid. Pastikan kolom wajib terisi: ${requiredCols.join(', ')}`
      }, { status: 400 })
    }

    // Validasi NRP karyawan
    let validEmployeeNrps = new Set<string>()
    if (['apd', 'pkwt', 'kpi', 'sp', 'roles', 'approval_matrix', 'mcu', 'simper'].includes(table)) {
      const { data: allEmp } = await supabase.from('employees').select('nrp')
      validEmployeeNrps = new Set((allEmp || []).map(e => String(e.nrp)))
    }

    // Ambil data existing untuk cek duplikat
    let existingKeys: Set<string> = new Set()

    if (table === 'employees') {
      const { data } = await supabase.from('employees').select('nrp')
      existingKeys = new Set((data || []).map(r => String(r.nrp)))
    } else if (table === 'roles') {
      const { data } = await supabase.from('roles').select('nrp, role')
      existingKeys = new Set((data || []).map(r => `${r.nrp}|${r.role}`))
    } else if (table === 'approval_matrix') {
      const { data } = await supabase.from('approval_matrix').select('employee_nrp')
      existingKeys = new Set((data || []).map(r => String(r.employee_nrp)))
    } else if (table === 'bpjs') {
      const { data } = await supabase.from('bpjs').select('nama_karyawan')
      existingKeys = new Set((data || []).map(r => String(r.nama_karyawan).toLowerCase().trim()))
    } else if (table === 'mcu') {
      const { data } = await supabase.from('mcu').select('nrp, tanggal_mcu')
      existingKeys = new Set((data || []).map(r => `${r.nrp}|${r.tanggal_mcu}`))
    } else if (table === 'simper') {
      const { data } = await supabase.from('simper').select('nrp, jenis_simper, tanggal_expired')
      existingKeys = new Set((data || []).map(r => `${r.nrp}|${r.jenis_simper}|${r.tanggal_expired}`))
    }

    let successCount = 0
    let skippedCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (let i = 0; i < validData.length; i++) {
      const row = validData[i]

      if (validEmployeeNrps.size > 0) {
        const nrpToCheck = row.nrp || row.employee_nrp
        if (nrpToCheck && !validEmployeeNrps.has(String(nrpToCheck))) {
          errorCount++
          if (errors.length < 10) {
            errors.push(`Baris ${i + 2}: NRP "${nrpToCheck}" tidak ada di data karyawan`)
          }
          continue
        }

        if (table === 'approval_matrix') {
          if (row.atasan_nrp && !validEmployeeNrps.has(String(row.atasan_nrp))) {
            errorCount++
            if (errors.length < 10) errors.push(`Baris ${i + 2}: NRP atasan "${row.atasan_nrp}" tidak ada`)
            continue
          }
          if (row.pjo_nrp && !validEmployeeNrps.has(String(row.pjo_nrp))) {
            errorCount++
            if (errors.length < 10) errors.push(`Baris ${i + 2}: NRP PJO "${row.pjo_nrp}" tidak ada`)
            continue
          }
        }
      }

      let key = ''
      if (table === 'employees') key = String(row.nrp || '')
      else if (table === 'roles') key = `${row.nrp}|${row.role}`
      else if (table === 'approval_matrix') key = String(row.employee_nrp || '')
      else if (table === 'bpjs') key = String(row.nama_karyawan || '').toLowerCase().trim()
      else if (table === 'mcu') key = `${row.nrp}|${row.tanggal_mcu}`
      else if (table === 'simper') key = `${row.nrp}|${row.jenis_simper}|${row.tanggal_expired}`

      if (key && existingKeys.has(key)) {
        skippedCount++
        continue
      }

      // ✅ Hanya insert row yang bersih (tanpa _foundHeaders / _rowIdx)
      const { error } = await supabase.from(table).insert(row)

      if (error) {
        errorCount++
        if (errors.length < 10) {
          errors.push(`Baris ${i + 2}: ${error.message}`)
        }
      } else {
        successCount++
        if (key) existingKeys.add(key)
      }
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_nrp: session.nrp,
      action: 'IMPORT_EXCEL',
      target_table: table,
      target_id: null,
      detail: {
        total: validData.length,
        success: successCount,
        skipped: skippedCount,
        failed: errorCount
      }
    })

    let message = `✅ Import selesai: ${successCount} baru ditambahkan`
    if (skippedCount > 0) message += `, ${skippedCount} sudah ada (di-skip)`
    if (errorCount > 0) message += `, ${errorCount} gagal`
    message += ` dari total ${validData.length} baris valid.`

    return NextResponse.json({
      success: true,
      message,
      details: {
        total: validData.length,
        success: successCount,
        skipped: skippedCount,
        failed: errorCount,
        errors
      }
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}