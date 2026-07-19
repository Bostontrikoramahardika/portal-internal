// ============================================================
// PART NAME TRANSLATIONS
// Kamus terjemahan English → Indonesia untuk part komponen
// 
// Cara pakai: import { translatePartName } from '@/app/lib/part-translations'
// Hasil: translatePartName('NUT') → 'NUT (MUR)'
// 
// Silakan tambahkan kata baru sesuai kebutuhan lapangan
// ============================================================

export const PART_TRANSLATIONS: Record<string, string> = {
  // ═══ FASTENERS (Pengencang) ═══
  'NUT': 'MUR',
  'BOLT': 'BAUT',
  'SCREW': 'SEKRUP',
  'WASHER': 'RING',
  'STUD': 'BAUT TANAM',
  'PIN': 'PIN',
  'CLIP': 'KLIP',
  'CIRCLIP': 'RING PENGUNCI',
  'SNAP RING': 'RING KUNCI',
  'LOCK NUT': 'MUR PENGUNCI',
  'LOCK WASHER': 'RING PENGUNCI',
  'SPRING WASHER': 'RING PEGAS',
  'FLAT WASHER': 'RING RATA',
  'COTTER PIN': 'PIN COTTER',
  'KEY': 'KUNCI (SPI)',

  // ═══ STRUCTURAL (Struktur) ═══
  'BRACKET': 'BRAKET',
  'COVER': 'PENUTUP',
  'PLATE': 'PELAT',
  'HOUSING': 'RUMAH',
  'SPACER': 'PENJARAK',
  'SUPPORT': 'PENYANGGA',
  'FRAME': 'RANGKA',
  'BASE': 'DUDUKAN',
  'MOUNT': 'DUDUKAN',
  'MOUNTING': 'DUDUKAN',
  'SHIELD': 'PELINDUNG',
  'GUARD': 'PELINDUNG',
  'HOOD': 'KAP',
  'PANEL': 'PANEL',
  'ARM': 'LENGAN',
  'BOOM': 'BOOM',
  'BUCKET': 'BUCKET',
  'BLADE': 'PISAU',

  // ═══ SEALING (Perapat) ═══
  'GASKET': 'PACKING',
  'SEAL': 'SIL',
  'O-RING': 'O-RING',
  'OIL SEAL': 'SIL OLI',
  'PACKING': 'PACKING',
  'RETAINER': 'PENAHAN',

  // ═══ PIPING (Pipa) ═══
  'PIPE': 'PIPA',
  'HOSE': 'SELANG',
  'TUBE': 'TABUNG',
  'CLAMP': 'KLEM',
  'CONNECTOR': 'KONEKTOR',
  'ELBOW': 'ELBOW',
  'NIPPLE': 'NIPPLE',
  'FITTING': 'FITTING',
  'COUPLING': 'KOPLING',
  'FLANGE': 'FLANGE',
  'ADAPTER': 'ADAPTER',
  'UNION': 'UNION',
  'PLUG': 'SUMBAT',
  'CAP': 'TUTUP',

  // ═══ MECHANICAL ═══
  'BEARING': 'BEARING',
  'BUSHING': 'BUSHING',
  'BUSH': 'BUSHING',
  'SHAFT': 'POROS',
  'GEAR': 'GIGI (RODA GIGI)',
  'PULLEY': 'PULI',
  'BELT': 'SABUK',
  'CHAIN': 'RANTAI',
  'SPROCKET': 'SPROKET',
  'ROLLER': 'ROLLER',
  'IDLER': 'IDLER',
  'TENSIONER': 'TENSIONER',
  'SPRING': 'PEGAS',
  'DAMPER': 'PEREDAM',
  'CUSHION': 'BANTALAN',

  // ═══ HYDRAULIC ═══
  'CYLINDER': 'SILINDER',
  'PISTON': 'PISTON',
  'ROD': 'BATANG',
  'VALVE': 'KATUP',
  'PUMP': 'POMPA',
  'MOTOR': 'MOTOR',
  'ACCUMULATOR': 'AKUMULATOR',
  'FILTER': 'FILTER',
  'STRAINER': 'SARINGAN',
  'TANK': 'TANGKI',
  'RESERVOIR': 'RESERVOIR',
  'COOLER': 'COOLER',
  'RADIATOR': 'RADIATOR',

  // ═══ ELECTRICAL ═══
  'WIRE': 'KABEL',
  'CABLE': 'KABEL',
  'HARNESS': 'HARNESS',
  'CONNECTOR ASSY': 'SOKET',
  'SENSOR': 'SENSOR',
  'SWITCH': 'SAKELAR',
  'RELAY': 'RELAY',
  'FUSE': 'SEKRING',
  'BATTERY': 'AKI',
  'ALTERNATOR': 'ALTERNATOR',
  'STARTER': 'STARTER',
  'SOLENOID': 'SOLENOID',
  'LAMP': 'LAMPU',
  'BULB': 'BOHLAM',
  'LED': 'LED',

  // ═══ ENGINE PARTS ═══
  'PISTON RING': 'RING PISTON',
  'CRANKSHAFT': 'KRUK AS',
  'CAMSHAFT': 'NOKEN AS',
  'CYLINDER HEAD': 'KEPALA SILINDER',
  'BLOCK': 'BLOK',
  'MANIFOLD': 'MANIFOLD',
  'INJECTOR': 'INJEKTOR',
  'NOZZLE': 'NOZZLE',
  'GLOW PLUG': 'BUSI PIJAR',
  'SPARK PLUG': 'BUSI',
  'TURBOCHARGER': 'TURBO',
  'TURBO': 'TURBO',
  'MUFFLER': 'KNALPOT',
  'EXHAUST': 'BUANG (EXHAUST)',
  'INTAKE': 'HISAP (INTAKE)',
  'THERMOSTAT': 'TERMOSTAT',
  'WATER PUMP': 'POMPA AIR',
  'OIL PUMP': 'POMPA OLI',
  'FUEL PUMP': 'POMPA BBM',

  // ═══ FILTERS ═══
  'AIR FILTER': 'FILTER UDARA',
  'OIL FILTER': 'FILTER OLI',
  'FUEL FILTER': 'FILTER BBM',
  'HYDRAULIC FILTER': 'FILTER HIDROLIK',

  // ═══ MISC ═══
  'ASSEMBLY': 'ASSEMBLY',
  'ASSY': 'ASSEMBLY',
  'KIT': 'KIT (SET)',
  'SET': 'SET',
  'HANDLE': 'GAGANG',
  'GRIP': 'PEGANGAN',
  'LEVER': 'TUAS',
  'KNOB': 'KENOP',
  'SEAT': 'DUDUKAN',
  'MIRROR': 'KACA SPION',
  'WINDOW': 'JENDELA',
  'GLASS': 'KACA',
  'DOOR': 'PINTU',
  'STEP': 'INJAKAN',
  'LADDER': 'TANGGA',
}

/**
 * Terjemahkan nama part dari English ke format "ENGLISH (INDONESIA)"
 * @param name - Nama part original (English)
 * @returns String dengan format "ENGLISH (INDONESIA)" jika ada terjemahan, atau original name
 * 
 * @example
 * translatePartName('NUT') → 'NUT (MUR)'
 * translatePartName('CUSTOM PART') → 'CUSTOM PART'
 */
export function translatePartName(name: string | null | undefined): string {
  if (!name) return '-'
  
  const trimmed = name.trim()
  if (!trimmed) return '-'
  
  // Cek exact match dulu (case insensitive)
  const upper = trimmed.toUpperCase()
  const translation = PART_TRANSLATIONS[upper]
  
  if (translation) {
    return `${trimmed} (${translation})`
  }
  
  // Cek partial match — kalau nama part contains keyword tertentu
  // Contoh: "MOUNTING BOLT" → "MOUNTING BOLT (DUDUKAN BAUT)"
  const words = upper.split(/[\s,]+/)
  const translatedWords = words.map(w => PART_TRANSLATIONS[w])
  
  // Kalau semua kata punya terjemahan, gabungkan
  if (translatedWords.every(t => t !== undefined) && words.length > 1) {
    return `${trimmed} (${translatedWords.join(' ')})`
  }
  
  // Kalau tidak ada terjemahan, kembalikan original
  return trimmed
}