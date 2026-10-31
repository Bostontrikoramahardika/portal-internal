// app/lib/absensi-kode.ts
// ═══════════════════════════════════════════════════════════════
// SATU SUMBER PERHITUNGAN KODE ABSENSI
//
// Dipakai bersama oleh:
//   1. app/api/attendance/matrix/route.ts   → tampilan Manajemen Absensi
//   2. app/api/export-absensi-matrix/route.ts → file Excel "Excel Matrix"
//
// Tujuan: isi Excel TIDAK BOLEH beda dengan yang terlihat di aplikasi.
// Kalau aturan kode berubah, ubah di SINI saja.
// ═══════════════════════════════════════════════════════════════

export function tglKey(d: any): string {
  if (!d) return ''
  if (typeof d === 'string') return d.split('T')[0].split('+')[0].trim()
  if (d instanceof Date) return d.toISOString().split('T')[0]
  return String(d).split('T')[0]
}

export function normNama(s: any): string {
  return String(s || '').trim().toUpperCase()
}

export function normNamaRapat(s: any): string {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function isJabatanOperator(jabatan: any): boolean {
  return /operator/i.test(String(jabatan || ''))
}

export function grupAbsensi(departemen: any, jabatan: any): string {
  const d = String(departemen || '').trim()
  if (d === 'Staff' || d === 'Plant' || d === 'Operator') return d
  const j = String(jabatan || '').toLowerCase()
  if (/operator/.test(j)) return 'Operator'
  if (/mekanik|mechanic|welder|tyreman|helper plant|admin plant|plant gl/.test(j)) return 'Plant'
  if (/pjo|hrga|she|planner|site admin|admin gl|admin ho|staff|logistic|driver lv/.test(j)) return 'Staff'
  return d || 'Lainnya'
}

export function karyawanSampah(emp: any): boolean {
  const nama = String(emp?.nama || '').trim()
  const nrp = String(emp?.nrp || '').trim()
  if (!nama || /^#/.test(nama) || /#NAME|#REF|#N\/A/i.test(nama)) return true
  if (!nrp || !/^[A-Za-z0-9]+$/.test(nrp)) return true
  return false
}

/** NRP tanpa awalan B — dipakai untuk menggabungkan baris kembar. */
export function intiNrp(nrp: any): string {
  return String(nrp || '').trim().toUpperCase().replace(/^B/, '')
}

export function kodeDariShiftTs(shift: any): 'DS' | 'NS' {
  const s = String(shift ?? '').trim().toUpperCase()
  if (s === '2' || s === 'NS' || s === 'M' || s.includes('MALAM') || s.includes('NIGHT')) return 'NS'
  return 'DS'
}

export type TipeCell = 'roster' | 'actual' | 'empty' | 'future' | 'resigned'

/**
 * ATURAN TUNGGAL penentu kode satu sel (satu orang, satu tanggal).
 * Urutan prioritas:
 *   1. setelah tanggal resign        → kosong
 *   2. kode manual di keterangan absensi ([MANUAL:XX])
 *   3. status absensi (HADIR/ALFA/IZIN/SAKIT/CUTI/LIBUR/…) 
 *   4. tercatat di TS Opt            → DS / NS
 *   5. kode roster (OFF/CR/CT/ID/SCK/MCK/TR/LV)
 *   6. ada jam masuk                 → DS/NS (operator: DW/NW)
 *   7. roster S/M tanpa absensi      → A
 */
export function konversiCell(
  rosterShift: string | null,
  att: any,
  isFuture: boolean = false,
  isAfterResign: boolean = false,
  tsOptKode: 'DS' | 'NS' | null = null,
  isOperator: boolean = false
): { code: string; type: TipeCell } {
  const roster = (rosterShift || '').toUpperCase().trim()

  if (isAfterResign) {
    return { code: '', type: 'resigned' }
  }

  if (att) {
    const dariKet = String(att.keterangan || '').match(/\[MANUAL:(DS|NS|DW|NW|S|I|IR|A|OFF|CR|CT|ID|TR|LV)\]/i)
    if (dariKet) {
      return { code: dariKet[1].toUpperCase(), type: 'actual' }
    }
    const status = (att.status || '').toUpperCase().trim()
    const KODE_MANUAL: Record<string, string> = {
      DS: 'DS', NS: 'NS', DW: 'DW', NW: 'NW',
      S: 'S', SAKIT: 'S',
      I: 'I', IZIN: 'I',
      IR: 'IR', IZIN_RESMI: 'IR',
      CT: 'CT', CUTI: 'CT',
      CR: 'CR',
      ID: 'ID', INDUKSI: 'ID',
      TR: 'TR', TRAINING: 'TR',
      A: 'A', ALPHA: 'A', ALFA: 'A',
      OFF: 'OFF', LIBUR: 'OFF',
      LV: 'LV',
    }
    if (KODE_MANUAL[status]) {
      return { code: KODE_MANUAL[status], type: 'actual' }
    }
  }

  // Tercatat di TS Opt = masuk dan kerja → DS/NS (tidak wajib clock-in)
  if (tsOptKode) {
    return { code: tsOptKode, type: isFuture ? 'future' : 'actual' }
  }

  if (isFuture) {
    if (['OFF', 'CR', 'CT', 'ID', 'SCK', 'MCK', 'TR', 'LV', 'S', 'M'].includes(roster)) {
      return { code: roster, type: 'future' }
    }
    return { code: '-', type: 'future' }
  }

  if (['OFF', 'CR', 'CT', 'ID', 'SCK', 'MCK', 'TR', 'LV'].includes(roster)) {
    return { code: roster, type: 'roster' }
  }

  if (att?.clock_in) {
    const shift = (att.shift || '').toUpperCase()
    const malam = shift === 'MALAM' || shift === 'NS' || shift === 'M'
    if (isOperator) return { code: malam ? 'NW' : 'DW', type: 'actual' }
    return { code: malam ? 'NS' : 'DS', type: 'actual' }
  }

  const statusA = (att?.status || '').toUpperCase()
  if (statusA === 'ALFA' || statusA === 'A') return { code: 'A', type: 'actual' }
  if (roster === 'S' || roster === 'M') return { code: 'A', type: 'actual' }

  return { code: '-', type: 'empty' }
}
