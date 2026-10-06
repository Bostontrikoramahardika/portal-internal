export type BuiltInModelKey = 'PC210-10M0' | 'D85ESS-2' | 'D65' | 'GD705-5';
export type InspectionModelKey = BuiltInModelKey | 'PC200' | 'OTHER';

export interface ChecklistTemplateSection {
  title: string;
  items: string[];
}

export interface ChecklistTemplate {
  sections: ChecklistTemplateSection[];
}

export const CHECKLIST_TEMPLATES: Record<BuiltInModelKey, ChecklistTemplate> = {
  'PC210-10M0': {
    sections: [
      { title: 'ENGINE, COOLING & FUEL', items: [
        'Level/kondisi dan kebocoran engine oil', 'Level coolant; radiator dan oil cooler',
        'Fan, belt, hose, dan air cleaner', 'Fuel system / water separator / kebocoran',
        'Asap, suara, getaran, atau temperatur abnormal', 'Monitor engine dan warning indicator'
      ] },
      { title: 'HYDRAULIC, SWING & TRAVEL', items: [
        'Level hydraulic oil dan kebocoran tank/pump', 'Hose, fitting, dan cylinder: retak/bocor/aus',
        'Boom dan arm response; drift abnormal', 'Swing response / bunyi / kebocoran',
        'Travel kiri-kanan dan travel motor/final drive', 'Hydraulic filter/service indicator'
      ] },
      { title: 'UNDERCARRIAGE', items: [
        'Track shoe retak, bengkok, atau rusak', 'Shoe bolt/nut longgar atau hilang',
        'Track link wear / pitch (ukur bila alat tersedia)', 'Grouser/shoe height wear (ukur)',
        'Track roller dan carrier roller: aus/bocor/baut', 'Front idler/guide: aus atau kelonggaran',
        'Sprocket tooth wear / hooking', 'Track tension/sag (ukur sesuai prosedur)',
        'Track frame/guard retak atau rusak'
      ] },
      { title: 'BOOM, ARM & WORK EQUIPMENT', items: [
        'Boom/arm retak, bengkok, atau weld abnormal', 'Pin/bushing dan kelonggaran linkage',
        'Cylinder rod dan kebocoran seal', 'Grease point dan kondisi pengunci kerja'
      ] },
      { title: 'ELECTRICAL & SAFETY', items: [
        'Battery, terminal, dan charging/warning lamp', 'Lampu kerja, horn, dan travel/backup alarm',
        'Monitor / warning indicator', 'Seat belt, kaca/kamera, dan wiper (bila tersedia)',
        'Fire extinguisher dan akses kabin'
      ] }
    ]
  },
  'D85ESS-2': {
    sections: [
      { title: 'ENGINE, COOLING & FUEL', items: [
        'Level/kebocoran engine oil', 'Level coolant; radiator dan oil cooler',
        'Fan, belt, dan hose', 'Air cleaner / pre-cleaner dan indikator',
        'Fuel system / water separator / kebocoran', 'Asap, suara, getaran, atau temperatur abnormal',
        'Engine monitor dan warning indicator'
      ] },
      { title: 'POWER TRAIN, STEERING & BRAKE', items: [
        'Level/kebocoran transmission oil', 'Respons maju-mundur dan perpindahan gear',
        'Respons steering kiri-kanan', 'Service brake / pedal function',
        'Parking brake function', 'Final drive kiri-kanan: level/kebocoran',
        'Bunyi, temperatur, atau kebocoran abnormal power train'
      ] },
      { title: 'HYDRAULIC SYSTEM', items: [
        'Level hydraulic oil', 'Hydraulic hose/fitting retak, aus, atau bocor',
        'Blade lift cylinder: kebocoran/kondisi rod', 'Blade tilt cylinder (bila tersedia)',
        'Ripper cylinder (bila tersedia)', 'Fungsi hydraulic / gerakan abnormal'
      ] },
      { title: 'UNDERCARRIAGE', items: [
        'Track shoe retak, bengkok, atau rusak', 'Shoe bolt/nut longgar atau hilang',
        'Track link wear / pitch (ukur bila alat tersedia)', 'Grouser/shoe height wear (ukur)',
        'Track roller: aus/bocor/baut', 'Carrier roller: aus/bocor',
        'Front idler/guide: aus atau kelonggaran', 'Sprocket tooth wear / hooking',
        'Track tension/sag (ukur sesuai prosedur)', 'Track frame/guard retak atau rusak',
        'Kebocoran roller, idler, atau final drive'
      ] },
      { title: 'BLADE, RIPPER & WORK EQUIPMENT', items: [
        'Blade retak, bengkok, atau weld abnormal', 'Cutting edge/end bit aus atau baut longgar',
        'Blade lift/lower response', 'Blade tilt response (bila tersedia)',
        'Blade pin/bushing dan kelonggaran', 'Ripper shank/tip/pin (bila tersedia)',
        'Ripper response (bila tersedia)', 'Grease point dan pengunci peralatan kerja'
      ] },
      { title: 'ELECTRICAL & SAFETY', items: [
        'Battery, terminal, dan charging/warning lamp', 'Lampu kerja, horn, dan backup alarm',
        'Monitor / warning indicator', 'Seat belt dan kondisi ROPS/kabin',
        'Tangga, handrail, dan fire extinguisher'
      ] }
    ]
  },
  D65: {
    sections: [
      { title: 'ENGINE, COOLING & FUEL', items: [
        'Level/kebocoran engine oil', 'Level coolant; radiator dan oil cooler',
        'Fan, belt, dan hose', 'Air cleaner/filter dan indikator',
        'Fuel system / water separator / kebocoran', 'Asap, suara, getaran, atau temperatur abnormal',
        'Engine monitor dan warning indicator'
      ] },
      { title: 'POWER TRAIN, STEERING & BRAKE', items: [
        'Level/kebocoran transmission oil', 'Respons maju-mundur dan perpindahan gear',
        'Respons steering kiri-kanan', 'Service brake / pedal function',
        'Parking brake function', 'Final drive kiri-kanan: level/kebocoran',
        'Bunyi, temperatur, atau kebocoran abnormal power train'
      ] },
      { title: 'HYDRAULIC SYSTEM', items: [
        'Level hydraulic oil', 'Hydraulic hose/fitting retak, aus, atau bocor',
        'Blade lift cylinder: kebocoran/kondisi rod', 'Blade tilt/pitch cylinder (bila tersedia)',
        'Ripper cylinder (bila tersedia)', 'Fungsi hydraulic / gerakan abnormal'
      ] },
      { title: 'UNDERCARRIAGE', items: [
        'Track shoe retak, bengkok, atau rusak', 'Shoe bolt/nut longgar atau hilang',
        'Track link wear / pitch (ukur bila alat tersedia)', 'Grouser/shoe height wear (ukur)',
        'Track roller: aus atau bocor', 'Carrier roller: aus atau bocor',
        'Front idler/guide: aus atau kelonggaran', 'Sprocket tooth wear / hooking',
        'Track tension/sag (ukur sesuai prosedur)', 'Track frame/guard retak atau rusak'
      ] },
      { title: 'BLADE, RIPPER & WORK EQUIPMENT', items: [
        'Blade retak, bengkok, atau weld abnormal', 'Cutting edge/end bit aus atau baut longgar',
        'Blade lift/lower response', 'Blade tilt/pitch response (bila tersedia)',
        'Blade pin/bushing dan kelonggaran', 'Ripper shank/tip/pin (bila tersedia)',
        'Ripper response (bila tersedia)', 'Grease point dan pengunci peralatan kerja'
      ] },
      { title: 'ELECTRICAL & SAFETY', items: [
        'Battery, terminal, dan charging/warning lamp', 'Lampu kerja, horn, dan backup alarm',
        'Monitor / warning indicator', 'Seat belt, kabin/ROPS, tangga, dan handrail',
        'Fire extinguisher'
      ] }
    ]
  },
  'GD705-5': {
    sections: [
      { title: 'ENGINE, COOLING & FUEL', items: [
        'Level/kondisi dan kebocoran engine oil', 'Level coolant; radiator dan oil cooler',
        'Fan, belt, dan hose', 'Air cleaner / indikator filter',
        'Fuel system, water separator, dan kebocoran',
        'Asap, suara, getaran, atau temperatur abnormal', 'Monitor engine / warning indicator'
      ] },
      { title: 'POWER TRAIN & TANDEM DRIVE', items: [
        'Level/kebocoran transmission oil', 'Respons maju-mundur dan perpindahan gear',
        'Tandem drive case kiri-kanan: level/kebocoran',
        'Drive shaft/joint: kondisi, kelonggaran, atau bunyi',
        'Final drive/axle: kebocoran atau bunyi abnormal',
        'Temperatur/getaran abnormal pada power train', 'Kondisi area tandem dan kebersihan'
      ] },
      { title: 'TIRES, AXLE, FRAME & ARTICULATION', items: [
        'Ban: cut, retak, benjol, atau aus tidak merata',
        'Tekanan ban: catat actual; cocokkan placard/manual',
        'Wheel nut/stud longgar, hilang, atau tanda bergeser',
        'Front axle, pivot, dan steering linkage',
        'Tandem wheels/bearing: bunyi, kelonggaran, kondisi',
        'Articulation joint: kondisi, kelonggaran, atau kebocoran',
        'Frame retak/rusak; step dan handrail'
      ] },
      { title: 'STEERING, BRAKE & HYDRAULIC', items: [
        'Steering kiri-kanan dan articulation response',
        'Service brake function test', 'Parking brake function test',
        'Level/kebocoran hydraulic oil', 'Hydraulic hose/fitting retak, aus, atau bocor',
        'Cylinder/linkage steering dan blade: kondisi/kebocoran',
        'Respons hydraulic dan gerakan blade'
      ] },
      { title: 'CIRCLE, DRAWBAR & MOLDBOARD', items: [
        'Moldboard/blade retak, bengkok, atau weld abnormal',
        'Cutting edge/end bit aus atau baut longgar',
        'Circle/circle drive: kondisi gigi, retainer, atau kebocoran',
        'Circle rotation / side-shift response',
        'Circle guide/clearance: ukur sesuai prosedur bila tersedia',
        'Drawbar, ball joint, pin/bushing: aus atau kelonggaran',
        'Blade lift/tilt/side-shift cylinder dan hose',
        'Grease point circle, drawbar, linkage, dan articulation'
      ] },
      { title: 'ELECTRICAL & SAFETY', items: [
        'Battery, terminal, dan charging/warning lamp', 'Lampu kerja/jalan, horn, dan backup alarm',
        'Machine monitor / warning code', 'Seat belt dan kondisi kursi',
        'Mirror/kamera, kaca, wiper/washer (bila tersedia)',
        'Fire extinguisher dan akses kabin'
      ] }
    ]
  }
};

export function resolveInspectionModel(modelUnit = '', kategori = ''): InspectionModelKey {
  const value = `${modelUnit} ${kategori}`.toUpperCase().replace(/[–—]/g, '-').replace(/_/g, ' ');
  if (/\bPC\s*-?\s*210[\s-]*10M0\b/.test(value)) return 'PC210-10M0';
  if (/\bD85\s*ESS[\s-]*2\b/.test(value)) return 'D85ESS-2';
  // Unit Master labels this same grader as GD705A-4A; per user confirmation, use the GD705-5 checklist reference.
  if (/\bGD\s*705[\s-]*5\b/.test(value) || /\bGD\s*705A[\s-]*4A\b/.test(value)) return 'GD705-5';
  if (/\bD65[A-Z0-9-]*/.test(value)) return 'D65';
  // All PC excavators use the comprehensive checklist structure; limits still come from that unit's own manual.
  if (/\bPC\s*-?\s*\d{2,3}(?!\d)/.test(value)) return 'PC210-10M0';
  return 'OTHER';
}

export function supportsExcavatorAttachment(modelUnit = '', kategori = ''): boolean {
  const value = `${modelUnit} ${kategori}`.toUpperCase();
  return /EXCAVATOR|\bPC\s*-?\s*\d{2,3}/.test(value);
}

export function getInspectionReference(model: InspectionModelKey, modelUnit = ''): string {
  switch (model) {
    case 'PC210-10M0':
    case 'PC200':
      return `Checklist umum excavator Komatsu PC untuk ${modelUnit || 'model unit'}. Rujuk Shop Manual yang cocok dengan model lengkap, serial, attachment, dan konfigurasi unit; angka wear/repair limit tidak diasumsikan.`;
    case 'D85ESS-2':
      return 'Rujuk Shop Manual D85ESS-2 yang cocok dengan serial dan konfigurasi unit. Kecocokan manual unit belum diverifikasi; angka wear/repair limit tidak dicantumkan.';
    case 'D65':
      return 'Suffix/serial D65 belum dikonfirmasi. Gunakan Shop Manual sesuai varian dan unit; angka wear/repair limit tidak dicantumkan agar tidak memakai batas model lain.';
    case 'GD705-5':
      return 'Rujuk Shop Manual GD705-5 yang cocok dengan serial dan konfigurasi unit. Kecocokan manual unit belum diverifikasi; angka wear/repair limit tidak dicantumkan.';
    default:
      return `Gunakan Shop Manual yang cocok dengan model lengkap, serial, dan konfigurasi unit (${modelUnit || 'model unit'}). Angka limit tidak diasumsikan.`;
  }
}
