// Data dari Excel: Update Laporan HRGA & Produksi Site MLP Oktober 2026.xlsx — sheet MPP
export const MPP_SUMBER = 'Sheet MPP · Laporan HRGA & Produksi · Oktober 2026 · Site PPA-MLP'

export type MppBaris = {
  jabatan: string
  acv: number | null
  mpp: number
  aktual: number
  rekrut: number
  deviasi: number
  unit?: number | null
  shift?: number | null
  faktor?: number | null
  kebutuhan?: number | null
}

export type MppGrup = {
  nama: string
  mpp: number
  aktual: number
  rekrut: number
  deviasi: number
  baris: MppBaris[]
}

export const MPP_GRUP: MppGrup[] = [
  {
    nama: 'Staff',
    mpp: 15, aktual: 13, rekrut: 0, deviasi: -2,
    baris: [
      { jabatan: 'PJO', acv: 1, mpp: 1, aktual: 1, rekrut: 0, deviasi: 0 },
      { jabatan: 'Deputy PJO', acv: 1, mpp: 1, aktual: 1, rekrut: 0, deviasi: 0 },
      { jabatan: 'SHE Officer', acv: 1, mpp: 2, aktual: 2, rekrut: 0, deviasi: 0 },
      { jabatan: 'SHE Crew', acv: null, mpp: 0, aktual: 0, rekrut: 0, deviasi: 0 },
      { jabatan: 'Admin GL', acv: 1, mpp: 1, aktual: 1, rekrut: 0, deviasi: 0 },
      { jabatan: 'Planner', acv: 1, mpp: 1, aktual: 1, rekrut: 0, deviasi: 0 },
      { jabatan: 'Site Admin', acv: 1, mpp: 1, aktual: 1, rekrut: 0, deviasi: 0 },
      { jabatan: 'Logistic GL', acv: null, mpp: 0, aktual: 0, rekrut: 0, deviasi: 0 },
      { jabatan: 'Logistic Crew', acv: 1, mpp: 1, aktual: 1, rekrut: 0, deviasi: 0 },
      { jabatan: 'HRGA GL', acv: null, mpp: 0, aktual: 0, rekrut: 0, deviasi: 0 },
      { jabatan: 'HR Admin', acv: null, mpp: 0, aktual: 0, rekrut: 0, deviasi: 0 },
      { jabatan: 'GA Crew', acv: null, mpp: 0, aktual: 0, rekrut: 0, deviasi: 0 },
      { jabatan: 'Driver LV', acv: 0.5, mpp: 2, aktual: 1, rekrut: 0, deviasi: -1 },
      { jabatan: 'Production SPV', acv: null, mpp: 0, aktual: 0, rekrut: 0, deviasi: 0 },
      { jabatan: 'Production GL', acv: 0.8, mpp: 5, aktual: 4, rekrut: 0, deviasi: -1 },
    ],
  },
  {
    nama: 'Plant',
    mpp: 24, aktual: 24, rekrut: 0, deviasi: 0,
    baris: [
      { jabatan: 'Koordinator GL', acv: null, mpp: 0, aktual: 0, rekrut: 0, deviasi: 0 },
      { jabatan: 'Plant GL', acv: 1, mpp: 4, aktual: 4, rekrut: 0, deviasi: 0 },
      { jabatan: 'Mechanic A2B', acv: 1, mpp: 6, aktual: 6, rekrut: 0, deviasi: 0 },
      { jabatan: 'Mechanic Junior', acv: null, mpp: 0, aktual: 0, rekrut: 0, deviasi: 0 },
      { jabatan: 'Mechanic LV', acv: null, mpp: 0, aktual: 0, rekrut: 0, deviasi: 0 },
      { jabatan: 'Electrical', acv: null, mpp: 0, aktual: 0, rekrut: 0, deviasi: 0 },
      { jabatan: 'Welder', acv: 1, mpp: 5, aktual: 5, rekrut: 0, deviasi: 0 },
      { jabatan: 'Helper Plant', acv: 1, mpp: 9, aktual: 9, rekrut: 0, deviasi: 0 },
    ],
  },
  {
    nama: 'Operator',
    mpp: 73, aktual: 70, rekrut: 8, deviasi: -3,
    baris: [
      { jabatan: 'Operator Excavator', acv: 0.9636, mpp: 55, aktual: 53, rekrut: 8, deviasi: -2, unit: 20, shift: 2, faktor: 1.37, kebutuhan: 55 },
      { jabatan: 'Operator Bulldozer', acv: 0.9286, mpp: 14, aktual: 13, rekrut: 0, deviasi: -1, unit: 5, shift: 2, faktor: 1.37, kebutuhan: 14 },
      { jabatan: 'Operator Grader', acv: 1, mpp: 4, aktual: 4, rekrut: 0, deviasi: 0, unit: 1, shift: 2, faktor: 2, kebutuhan: 4 },
    ],
  },
]

export const MPP_TOTAL = { mpp: 112, aktual: 107, rekrut: 8, deviasi: -5, pencapaian: 0.9554 }

export const MPP_CALON_RINGKAS = { open: 8, close: 0, cancel: 0, reject: 0 }

export const MPP_PIPELINE = [
  { id: 'teori', label: 'Tes Teori', n: 0 },
  { id: 'praktek', label: 'Tes Praktek', n: 0 },
  { id: 'mcu', label: 'MCU', n: 1 },
  { id: 'fu', label: 'F/U MCU', n: 0 },
  { id: 'ind', label: 'Pengajuan Ind.', n: 0 },
  { id: 'induksi', label: 'Induksi', n: 0 },
  { id: 'orientasi', label: 'Orientasi', n: 0 },
]

export type MppCalon = {
  no: number
  status: string
  nama: string
  jabatan: string
  simper: string
  lamaProses: number | null
  keterangan: string
  tesTeori: string | null
  tesPraktek: string | null
  mcu: string | null
}

export const MPP_CALON: MppCalon[] = [
  { no: 1, status: 'Open', nama: 'Nober Simon', jabatan: 'Operator Excavator', simper: 'PC200RB', lamaProses: 24, keterangan: 'Proses FU', tesTeori: '12 Sep 2026', tesPraktek: '12 Sep 2026', mcu: '17 Sep 2026' },
  { no: 2, status: 'Open', nama: 'Bian cahyono', jabatan: 'Operator Excavator', simper: 'PC200RB', lamaProses: null, keterangan: 'Waiting SKBS', tesTeori: null, tesPraktek: null, mcu: null },
  { no: 3, status: 'Open', nama: 'Wahyu Hidayat', jabatan: 'Operator Excavator', simper: 'PC200RB', lamaProses: null, keterangan: 'Waiting SKBS', tesTeori: null, tesPraktek: null, mcu: null },
  { no: 4, status: 'Open', nama: 'Samin', jabatan: 'Operator Excavator', simper: 'PC200RB', lamaProses: null, keterangan: 'Waiting SKBS', tesTeori: null, tesPraktek: null, mcu: null },
  { no: 5, status: 'Open', nama: 'Jefri', jabatan: 'Operator Excavator', simper: 'PC200RB', lamaProses: null, keterangan: 'Waiting SKBS', tesTeori: null, tesPraktek: null, mcu: null },
  { no: 6, status: 'Open', nama: 'Moses Aruan', jabatan: 'Operator Excavator', simper: 'PC200RB', lamaProses: null, keterangan: 'Waiting SKBS', tesTeori: null, tesPraktek: null, mcu: null },
  { no: 7, status: 'Open', nama: 'Nandhito Hidayat', jabatan: 'Operator Excavator', simper: 'PC200RB', lamaProses: null, keterangan: 'Waiting SKBS', tesTeori: null, tesPraktek: null, mcu: null },
  { no: 8, status: 'Open', nama: 'Yonatan', jabatan: 'Operator Excavator', simper: 'PC200RB', lamaProses: null, keterangan: 'Dealing SPK', tesTeori: null, tesPraktek: null, mcu: null },
]
