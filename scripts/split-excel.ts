export {}
// @ts-ignore
const ExcelJS = require('exceljs');
// @ts-ignore
const fs = require('fs');
// @ts-ignore
const path = require('path');

// ============================================================
// KONFIGURASI
// ============================================================
const INPUT_FOLDER = './imports/raw';
const OUTPUT_FOLDER = './imports/split';
const SHEETS_PER_CHUNK = 30;
const MAX_MB_TARGET = 3.5;
// ============================================================

async function splitExcel(filePath: string) {
  const fileName = path.basename(filePath, '.xlsx');
  console.log(`\n📂 Processing: ${fileName}.xlsx`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const allSheets = workbook.worksheets;
  console.log(`   Total sheets: ${allSheets.length}`);

  if (allSheets.length === 0) {
    console.log(`   ⚠️  Tidak ada sheet, skip.`);
    return;
  }

  const totalChunks = Math.ceil(allSheets.length / SHEETS_PER_CHUNK);
  console.log(`   Akan dipecah menjadi: ${totalChunks} file`);

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * SHEETS_PER_CHUNK;
    const end = Math.min(start + SHEETS_PER_CHUNK, allSheets.length);
    const sheetsForChunk = allSheets.slice(start, end);

    const newWorkbook = new ExcelJS.Workbook();
    newWorkbook.creator = workbook.creator || 'BTM Portal';
    newWorkbook.created = workbook.created || new Date();

    for (const sheet of sheetsForChunk) {
      const newSheet = newWorkbook.addWorksheet(sheet.name);

      sheet.columns.forEach((col: any, idx: number) => {
        if (col.width) {
          newSheet.getColumn(idx + 1).width = col.width;
        }
      });

      sheet.eachRow({ includeEmpty: false }, (row: any, rowNumber: number) => {
        const newRow = newSheet.getRow(rowNumber);
        row.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
          const newCell = newRow.getCell(colNumber);
          newCell.value = cell.value;
          if (cell.font) newCell.font = cell.font;
          if (cell.alignment) newCell.alignment = cell.alignment;
        });
        newRow.commit();
      });
    }

    const partNumber = chunkIndex + 1;
    const outputFileName = `${fileName}_part${partNumber}.xlsx`;
    const outputPath = path.join(OUTPUT_FOLDER, outputFileName);

    await newWorkbook.xlsx.writeFile(outputPath);

    const stats = fs.statSync(outputPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`   ✅ ${outputFileName} — ${fileSizeMB} MB (sheet ${start + 1}–${end})`);

    if (parseFloat(fileSizeMB) > MAX_MB_TARGET) {
      console.log(`   ⚠️  WARNING: ${outputFileName} masih > ${MAX_MB_TARGET} MB!`);
    }
  }

  console.log(`   🎉 Done: ${fileName}.xlsx selesai dipecah!`);
}

async function main() {
  console.log('🚀 BTM Excel Splitter — Starting...');
  console.log(`   Input folder  : ${INPUT_FOLDER}`);
  console.log(`   Output folder : ${OUTPUT_FOLDER}`);
  console.log(`   Sheets/chunk  : ${SHEETS_PER_CHUNK}`);
  console.log('');

  if (!fs.existsSync(OUTPUT_FOLDER)) {
    fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });
  }

  if (!fs.existsSync(INPUT_FOLDER)) {
    fs.mkdirSync(INPUT_FOLDER, { recursive: true });
    console.log(`📁 Folder input dibuat: ${INPUT_FOLDER}`);
    return;
  }

  const files = fs.readdirSync(INPUT_FOLDER).filter((f: string) => f.endsWith('.xlsx'));

  if (files.length === 0) {
    console.log(`⚠️  Tidak ada file .xlsx di folder: ${INPUT_FOLDER}`);
    return;
  }

  console.log(`📋 File ditemukan: ${files.length} file`);
  files.forEach((f: string) => console.log(`   - ${f}`));

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const filePath = path.join(INPUT_FOLDER, file);
    try {
      await splitExcel(filePath);
      successCount++;
    } catch (err: any) {
      console.log(`   ❌ GAGAL: ${file} — ${err.message}`);
      failCount++;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`✅ SELESAI!`);
  console.log(`   Berhasil : ${successCount} file`);
  console.log(`   Gagal    : ${failCount} file`);
  console.log(`   Hasil di : ${OUTPUT_FOLDER}`);
  console.log('═══════════════════════════════════════\n');
}

main().catch((err: any) => {
  console.error('❌ ERROR:', err);
  process.exit(1);
});