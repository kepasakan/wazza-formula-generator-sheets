// ================================================================
// OT KALKULATOR - GOOGLE APPS SCRIPT
// Template Pengiraan Lebih Masa Profesional (Bahasa Malaysia)
// Sesuai untuk semua jenis syarikat di Malaysia
// Akta Kerja 1955 compliant
// ================================================================

const SHEET = {
  TETAPAN:   'Tetapan',
  PEKERJA:   'Senarai Pekerja',
  KEHADIRAN: 'Rekod Kehadiran',
  OT:        'Pengiraan OT',
  LAPORAN:   'Laporan Bulanan',
  GAJI:      'Eksport Gaji'
};

const PAYSLIP_SH = 'Payslip [Cetak]';

// ----------------------------------------------------------------
// MENU
// ----------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚙️ OT Kalkulator')
    .addItem('🔧 Persediaan Awal (Setup)', 'setupAllSheets')
    .addSeparator()
    .addItem('📊 Kemas Kini Pengiraan OT', 'refreshCalculations')
    .addItem('📋 Jana Laporan Bulanan', 'gotoLaporan')
    .addItem('💰 Jana Eksport Gaji', 'gotoGaji')
    .addItem('📄 Jana PDF Payroll ke Drive', 'exportPayrollPDF')
    .addSeparator()
    .addItem('➕ Tambah Rekod Kehadiran', 'showAttendanceDialog')
    .addSeparator()
    .addItem('❓ Panduan Pengguna', 'showHelp')
    .addToUi();
}

// ----------------------------------------------------------------
// SETUP UTAMA
// ----------------------------------------------------------------

function setupAllSheets() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const ui  = SpreadsheetApp.getUi();
  const res = ui.alert('⚠️ Persediaan Awal',
    'Ini akan mencipta semua 6 sheet. Sheet yang sudah wujud tidak akan dipadam datanya. Teruskan?',
    ui.ButtonSet.YES_NO);
  if (res !== ui.Button.YES) return;

  setupTetapan(ss);
  setupPekerja(ss);
  setupKehadiran(ss);
  setupOT(ss);
  setupLaporan(ss);
  setupGaji(ss);

  // Susun tab mengikut urutan
  [SHEET.TETAPAN, SHEET.PEKERJA, SHEET.KEHADIRAN, SHEET.OT, SHEET.LAPORAN, SHEET.GAJI]
    .forEach((name, idx) => {
      const sh = ss.getSheetByName(name);
      if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(idx + 1); }
    });

  setupPayslipTemplate(ss);

  ss.getSheetByName(SHEET.TETAPAN).activate();
  ui.alert('✅ Berjaya!',
    'Semua sheet telah disediakan.\n\n' +
    'Langkah seterusnya:\n' +
    '1. Isi maklumat syarikat di sheet "Tetapan"\n' +
    '2. Daftarkan pekerja di sheet "Senarai Pekerja"\n' +
    '3. Masukkan kehadiran di sheet "Rekod Kehadiran"',
    ui.ButtonSet.OK);
}

// ================================================================
// SHEET 1 — TETAPAN
// ================================================================

function setupTetapan(ss) {
  let sh = ss.getSheetByName(SHEET.TETAPAN);
  if (!sh) sh = ss.insertSheet(SHEET.TETAPAN);
  sh.clear(); sh.clearFormats(); sh.clearConditionalFormatRules();

  const C_HEADER  = '#1a237e';
  const C_SEC     = '#283593';
  const C_INPUT   = '#fff9c4';
  const C_ALT     = '#e8eaf6';
  const C_WHITE   = '#ffffff';

  sh.setColumnWidth(1, 18);
  sh.setColumnWidth(2, 290);
  sh.setColumnWidth(3, 190);
  sh.setColumnWidth(4, 330);

  // ── Tajuk
  sh.getRange('B1:D1').merge()
    .setValue('⚙️ TETAPAN OT KALKULATOR')
    .setBackground(C_HEADER).setFontColor(C_WHITE)
    .setFontSize(16).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(1, 46);

  let r = 3;

  function secHeader(title, color) {
    sh.getRange(r, 2, 1, 3).merge()
      .setValue(title)
      .setBackground(color || C_SEC).setFontColor(C_WHITE)
      .setFontSize(11).setFontWeight('bold');
    sh.setRowHeight(r, 32);
    r++;
  }

  function colHeader(h1, h2, h3) {
    [h1, h2, h3].forEach((h, i) => {
      sh.getRange(r, i + 2).setValue(h)
        .setBackground('#c5cae9').setFontWeight('bold')
        .setHorizontalAlignment(i === 0 ? 'left' : 'center');
    });
    r++;
  }

  function dataRow(label, value, desc) {
    const bg = r % 2 === 0 ? C_WHITE : C_ALT;
    sh.getRange(r, 2).setValue(label).setBackground(bg).setFontWeight('bold');
    sh.getRange(r, 3).setValue(value).setBackground(C_INPUT)
      .setHorizontalAlignment('center')
      .setBorder(true, true, true, true, false, false, '#f9a825', SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(r, 4).setValue(desc).setBackground(bg)
      .setFontColor('#757575').setFontSize(9).setWrap(true);
    r++;
  }

  // ── Maklumat Syarikat
  secHeader('🏢 MAKLUMAT SYARIKAT');
  colHeader('Tetapan', 'Nilai', 'Nota');
  dataRow('Nama Syarikat',            'Nama Syarikat Anda',    'Akan terpapar pada slip gaji');
  dataRow('Alamat Syarikat',          'Alamat Syarikat',       '');
  dataRow('No. Telefon',              '',                      '');
  dataRow('Email',                    '',                      '');
  dataRow('Bulan Semasa (YYYY-MM)',
    Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM'),
    'Tukar nilai ini untuk jana laporan bulan berbeza (cth: 2024-03)');
  r++;

  // ── Kadar OT
  secHeader('📈 KADAR OT (Boleh Ubah Mengikut Polisi Syarikat)');
  colHeader('Jenis OT', 'Kadar (x)', 'Penerangan');
  dataRow('OT Hari Biasa (selepas waktu kerja)', 1.5, 'Akta Kerja 1955 S60A: minimum 1.5x kadar sejam biasa');
  dataRow('OT Hari Rehat',                       2.0, 'Akta Kerja 1955 S60C: minimum 2.0x');
  dataRow('OT Cuti Umum',                        3.0, 'Akta Kerja 1955 S60D: minimum 3.0x');
  r++;

  // ── Waktu Kerja
  secHeader('🕐 TETAPAN WAKTU KERJA', '#37474f');
  colHeader('Tetapan', 'Nilai', 'Penerangan');
  dataRow('Jam Kerja Standard / Hari',   8,    'Biasanya 8 jam mengikut kontrak');
  dataRow('Minit Toleransi Lambat',      15,   'Minit dibenarkan terlambat tanpa potongan gaji');
  dataRow('Potongan Lewat (RM/minit)',   0.50, 'Kadar potongan untuk setiap minit melebihi toleransi');
  r++;

  // ── Masa Syif (rujukan sahaja)
  secHeader('🌙 MASA SYIF (Rujukan)', '#455a64');
  sh.getRange(r, 2).setValue('Syif').setFontWeight('bold').setBackground('#c5cae9');
  sh.getRange(r, 3).setValue('Masa Mula').setFontWeight('bold').setBackground('#c5cae9').setHorizontalAlignment('center');
  sh.getRange(r, 4).setValue('Masa Tamat').setFontWeight('bold').setBackground('#c5cae9').setHorizontalAlignment('center');
  r++;

  const syifs = [
    ['🌅 Pagi (Morning)',      '07:00', '15:00', '#fff8e1'],
    ['🌆 Petang (Evening)',    '15:00', '23:00', '#fff3e0'],
    ['🌙 Malam (Night)',       '23:00', '07:00', '#e3f2fd'],
    ['🔄 Bergilir (Rotating)', 'Pelbagai', 'Pelbagai', '#e8f5e9'],
  ];
  syifs.forEach(([nama, mula, tamat, bg]) => {
    sh.getRange(r, 2).setValue(nama).setBackground(bg).setFontWeight('bold');
    sh.getRange(r, 3).setValue(mula).setBackground(C_INPUT).setHorizontalAlignment('center')
      .setBorder(true, true, true, true, false, false, '#f9a825', SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(r, 4).setValue(tamat).setBackground(C_INPUT).setHorizontalAlignment('center')
      .setBorder(true, true, true, true, false, false, '#f9a825', SpreadsheetApp.BorderStyle.SOLID);
    r++;
  });

  r++;
  sh.getRange(r, 2, 1, 3).merge()
    .setValue('⚠️ Sel berwarna KUNING boleh diubah. Kadar OT mengikut Akta Kerja 1955 Malaysia.')
    .setBackground('#fff9c4').setFontColor('#e65100').setFontWeight('bold')
    .setBorder(true, true, true, true, false, false, '#f9a825', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  sh.setFrozenRows(1);
}

// ================================================================
// SHEET 2 — SENARAI PEKERJA
// ================================================================

function setupPekerja(ss) {
  let sh = ss.getSheetByName(SHEET.PEKERJA);
  if (!sh) sh = ss.insertSheet(SHEET.PEKERJA);

  // Hanya setup header jika sheet baru atau kosong
  if (sh.getLastRow() > 0 && sh.getRange('A1').getValue() !== '') {
    // Header sudah ada — skip untuk elak padam data
  } else {
    sh.clear(); sh.clearFormats();
  }

  const C_H = '#1b5e20'; const C_SH = '#2e7d32';

  sh.getRange('A1:K1').merge()
    .setValue('👥 SENARAI PEKERJA')
    .setBackground(C_H).setFontColor('#ffffff')
    .setFontSize(15).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(1, 42);

  const headers = ['No.','No. Pekerja','Nama Penuh','Jabatan','Jawatan',
                   'Gaji Pokok (RM)','Syif','Status','No. IC','No. Akaun Bank','Catatan'];
  const widths  = [42, 100, 200, 150, 150, 130, 110, 80, 130, 150, 160];

  headers.forEach((h, i) => {
    sh.setColumnWidth(i + 1, widths[i]);
    sh.getRange(2, i + 1).setValue(h)
      .setBackground(C_SH).setFontColor('#ffffff')
      .setFontWeight('bold').setHorizontalAlignment('center')
      .setVerticalAlignment('middle').setWrap(true);
  });
  sh.setRowHeight(2, 36);

  // Contoh data
  const contoh = [
    ['EMP001','Ahmad bin Abdullah','Pengeluaran','Operator',2500,'Pagi','Aktif','900101-01-1234','1234567890',''],
    ['EMP002','Siti binti Rahman','QC','Penolong QC',2800,'Petang','Aktif','920215-05-5678','0987654321',''],
    ['EMP003','Raju a/l Murugan','Pengeluaran','Operator Kanan',3200,'Malam','Aktif','880330-10-9012','1122334455',''],
    ['EMP004','Mei Lin','Admin','Kerani',2200,'Bergilir','Aktif','950720-14-3456','6677889900',''],
  ];
  contoh.forEach((rowData, i) => {
    const bg = i % 2 === 0 ? '#f1f8e9' : '#ffffff';
    sh.getRange(3 + i, 1).setFormula(`=IF(B${3+i}<>"",ROW()-2,"")`);
    sh.getRange(3 + i, 2, 1, rowData.length).setValues([rowData]).setBackground(bg);
    sh.getRange(3 + i, 6).setNumberFormat('"RM "#,##0.00');
  });

  // Auto-nombor untuk baris kosong
  for (let i = 7; i <= 200; i++) {
    sh.getRange(i, 1).setFormula(`=IF(B${i}<>"",ROW()-2,"")`);
  }

  // Validasi dropdown
  const syifVal = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pagi','Petang','Malam','Bergilir'], true)
    .setAllowInvalid(false).build();
  sh.getRange('G3:G200').setDataValidation(syifVal);

  const statusVal = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Aktif','Tidak Aktif','Cuti Tanpa Gaji'], true)
    .setAllowInvalid(false).build();
  sh.getRange('H3:H200').setDataValidation(statusVal);

  sh.getRange('F3:F200').setNumberFormat('"RM "#,##0.00');

  const noteR = 205;
  sh.getRange(noteR, 1, 1, 11).merge()
    .setValue('📌 Isi maklumat pekerja dari baris 3. Data contoh boleh dipadam. No. Pekerja MESTI unik.')
    .setBackground('#e8f5e9').setFontColor('#1b5e20').setWrap(true);

  sh.setFrozenRows(2);
}

// ================================================================
// SHEET 3 — REKOD KEHADIRAN
// ================================================================

function setupKehadiran(ss) {
  let sh = ss.getSheetByName(SHEET.KEHADIRAN);
  if (!sh) sh = ss.insertSheet(SHEET.KEHADIRAN);

  const isNew = sh.getLastRow() === 0 || sh.getRange('A1').getValue() === '';
  if (isNew) { sh.clear(); sh.clearFormats(); }

  const C_H = '#4a148c'; const C_SH = '#6a1b9a';

  sh.getRange('A1:N1').merge()
    .setValue('📅 REKOD KEHADIRAN & OT')
    .setBackground(C_H).setFontColor('#ffffff')
    .setFontSize(15).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(1, 42);

  const headers = ['No.','No. Pekerja','Nama Pekerja','Tarikh','Hari',
                   'Jenis Hari','Syif','Masa Masuk','Masa Keluar',
                   'Jam Kerja','Minit Lambat','Jam OT','Jenis OT','Jumlah OT (RM)'];
  const widths  = [40, 100, 180, 100, 80, 110, 90, 85, 85, 90, 90, 80, 110, 125];

  headers.forEach((h, i) => {
    sh.setColumnWidth(i + 1, widths[i]);
    sh.getRange(2, i + 1).setValue(h)
      .setBackground(C_SH).setFontColor('#ffffff')
      .setFontWeight('bold').setHorizontalAlignment('center')
      .setVerticalAlignment('middle').setWrap(true);
  });
  sh.setRowHeight(2, 40);

  // Format columns
  sh.getRange('D3:D1000').setNumberFormat('dd/mm/yyyy');
  sh.getRange('H3:I1000').setNumberFormat('hh:mm');
  sh.getRange('J3:J1000').setNumberFormat('0.00');
  sh.getRange('L3:L1000').setNumberFormat('0.00');
  sh.getRange('N3:N1000').setNumberFormat('"RM "#,##0.00');

  // Validasi
  sh.getRange('F3:F1000').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Biasa','Rehat','Cuti Umum'], true)
      .setAllowInvalid(false).build());
  sh.getRange('G3:G1000').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Pagi','Petang','Malam','Bergilir'], true)
      .setAllowInvalid(false).build());

  // Formula untuk 500 baris
  const tetapan = SHEET.TETAPAN;
  const pekerja = SHEET.PEKERJA;

  for (let i = 3; i <= 500; i++) {
    // A: Auto-nombor
    sh.getRange(i, 1).setFormula(`=IF(B${i}<>"",ROW()-2,"")`);

    // C: Nama dari Pekerja
    sh.getRange(i, 3).setFormula(
      `=IF(B${i}<>"",IFERROR(VLOOKUP(B${i},'${pekerja}'!B:C,2,FALSE),"? Pekerja Tidak Dijumpai"),"")`);

    // E: Nama hari
    sh.getRange(i, 5).setFormula(
      `=IF(D${i}<>"",TEXT(D${i},"dddd"),"")`);

    // J: Jam kerja (handle cross-midnight)
    sh.getRange(i, 10).setFormula(
      `=IF(AND(H${i}<>"",I${i}<>""),` +
        `IF(I${i}<H${i},(I${i}+1-H${i})*24,(I${i}-H${i})*24),"")`);

    // K: Minit lambat (berdasarkan syif)
    sh.getRange(i, 11).setFormula(
      `=IF(AND(H${i}<>"",G${i}<>""),` +
        `IF(G${i}="Pagi",MAX(0,ROUND((H${i}-TIMEVALUE("07:00"))*24*60,0)),` +
        `IF(G${i}="Petang",MAX(0,ROUND((H${i}-TIMEVALUE("15:00"))*24*60,0)),` +
        `IF(G${i}="Malam",` +
          `IF(H${i}>=TIMEVALUE("23:00"),MAX(0,ROUND((H${i}-TIMEVALUE("23:00"))*24*60,0)),` +
          `MAX(0,ROUND((H${i}+1-TIMEVALUE("23:00"))*24*60,0))),` +
        `0))),"")`);

    // L: Jam OT = jam kerja - jam standard
    sh.getRange(i, 12).setFormula(
      `=IF(J${i}<>"",` +
        `MAX(0,J${i}-IFERROR(VLOOKUP("Jam Kerja Standard / Hari",'${tetapan}'!B:C,2,FALSE),8)),` +
        `"")`);

    // M: Jenis OT
    sh.getRange(i, 13).setFormula(
      `=IF(B${i}<>"",` +
        `IF(F${i}="Cuti Umum","OT Cuti Umum",` +
        `IF(F${i}="Rehat","OT Hari Rehat","OT Hari Biasa")),` +
        `"")`);

    // N: Jumlah OT (RM) = Jam OT × Kadar Sejam × Gandaan
    // Kadar Sejam = Gaji Pokok / (Jam Standard × 26)
    sh.getRange(i, 14).setFormula(
      `=IF(AND(B${i}<>"",L${i}>0),` +
        `L${i}*` +
        `(IFERROR(VLOOKUP(B${i},'${pekerja}'!B:F,5,FALSE),0)/` +
        `(IFERROR(VLOOKUP("Jam Kerja Standard / Hari",'${tetapan}'!B:C,2,FALSE),8)*26))*` +
        `IF(F${i}="Cuti Umum",` +
          `IFERROR(VLOOKUP("OT Cuti Umum",'${tetapan}'!B:C,2,FALSE),3),` +
        `IF(F${i}="Rehat",` +
          `IFERROR(VLOOKUP("OT Hari Rehat",'${tetapan}'!B:C,2,FALSE),2),` +
          `IFERROR(VLOOKUP("OT Hari Biasa (selepas waktu kerja)",'${tetapan}'!B:C,2,FALSE),1.5))),` +
        `"")`);
  }

  // Alternate row shading via conditional format
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=AND(MOD(ROW(),2)=1,B3<>"")`)
      .setBackground('#f3e5f5')
      .setRanges([sh.getRange('A3:N500')])
      .build()
  ]);

  sh.getRange('A502:N502').merge()
    .setValue('📌 Isi: No. Pekerja, Tarikh, Jenis Hari, Syif, Masa Masuk, Masa Keluar — lain-lain dikira automatik.')
    .setBackground('#f3e5f5').setFontColor('#4a148c').setWrap(true);

  sh.setFrozenRows(2);
}

// ================================================================
// SHEET 4 — PENGIRAAN OT
// ================================================================

function setupOT(ss) {
  let sh = ss.getSheetByName(SHEET.OT);
  if (!sh) sh = ss.insertSheet(SHEET.OT);
  sh.clear(); sh.clearFormats();

  const C_H = '#b71c1c'; const C_SH = '#c62828';

  sh.getRange('A1:J1').merge()
    .setValue('📊 RINGKASAN PENGIRAAN OT BULANAN')
    .setBackground(C_H).setFontColor('#ffffff')
    .setFontSize(15).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(1, 42);

  // Filter bulan
  sh.getRange('A2').setValue('Bulan:').setFontWeight('bold');
  sh.getRange('B2')
    .setFormula(`=IFERROR(VLOOKUP("Bulan Semasa (YYYY-MM)",'${SHEET.TETAPAN}'!B:C,2,FALSE),TEXT(TODAY(),"yyyy-mm"))`)
    .setBackground('#fff9c4').setFontWeight('bold').setFontSize(12);
  sh.getRange('C2:D2').merge()
    .setValue('← Tukar nilai di sheet Tetapan, atau taip terus di sini')
    .setFontColor('#9e9e9e').setFontSize(9);

  const headers = ['No.','No. Pekerja','Nama Pekerja','Jabatan',
                   'Hari Hadir','Jam OT\nHari Biasa','Jam OT\nHari Rehat','Jam OT\nCuti Umum',
                   'Jumlah\nJam OT','Jumlah OT\n(RM)'];
  const widths  = [40, 100, 180, 150, 85, 95, 95, 110, 95, 125];

  headers.forEach((h, i) => {
    sh.setColumnWidth(i + 1, widths[i]);
    sh.getRange(3, i + 1).setValue(h)
      .setBackground(C_SH).setFontColor('#ffffff')
      .setFontWeight('bold').setHorizontalAlignment('center')
      .setVerticalAlignment('middle').setWrap(true);
  });
  sh.setRowHeight(3, 44);

  sh.getRange('F4:I103').setNumberFormat('0.00');
  sh.getRange('J4:J103').setNumberFormat('"RM "#,##0.00');

  const kehadiran = SHEET.KEHADIRAN;
  const pekerja   = SHEET.PEKERJA;

  for (let i = 4; i <= 103; i++) {
    const pRow = i - 1; // row dalam Pekerja sheet (row 3 = pekerja ke-1, row 4 = ke-2, dst)
    // Ambil No. Pekerja terus dari sheet Pekerja mengikut urutan
    sh.getRange(i, 1).setFormula(`=IF('${pekerja}'!B${pRow}<>"",${i-3},"")`);
    sh.getRange(i, 2).setFormula(`='${pekerja}'!B${pRow}`);
    sh.getRange(i, 3).setFormula(
      `=IF(B${i}<>"",IFERROR(VLOOKUP(B${i},'${pekerja}'!B:C,2,FALSE),""),"")`);
    sh.getRange(i, 4).setFormula(
      `=IF(B${i}<>"",IFERROR(VLOOKUP(B${i},'${pekerja}'!B:D,3,FALSE),""),"")`);

    // Hari hadir dalam bulan
    sh.getRange(i, 5).setFormula(
      `=IF(B${i}<>"",COUNTIFS(` +
        `'${kehadiran}'!B:B,B${i},` +
        `'${kehadiran}'!D:D,">="&DATE(VALUE(LEFT($B$2,4)),VALUE(MID($B$2,6,2)),1),` +
        `'${kehadiran}'!D:D,"<"&DATE(VALUE(LEFT($B$2,4)),VALUE(MID($B$2,6,2))+1,1)),"")`);

    // Jam OT Biasa
    sh.getRange(i, 6).setFormula(
      `=IF(B${i}<>"",SUMPRODUCT(` +
        `('${kehadiran}'!B$3:B$1000=B${i})*` +
        `('${kehadiran}'!F$3:F$1000="Biasa")*` +
        `(YEAR('${kehadiran}'!D$3:D$1000)=VALUE(LEFT($B$2,4)))*` +
        `(MONTH('${kehadiran}'!D$3:D$1000)=VALUE(MID($B$2,6,2)))*` +
        `('${kehadiran}'!L$3:L$1000)),"")`);

    // Jam OT Rehat
    sh.getRange(i, 7).setFormula(
      `=IF(B${i}<>"",SUMPRODUCT(` +
        `('${kehadiran}'!B$3:B$1000=B${i})*` +
        `('${kehadiran}'!F$3:F$1000="Rehat")*` +
        `(YEAR('${kehadiran}'!D$3:D$1000)=VALUE(LEFT($B$2,4)))*` +
        `(MONTH('${kehadiran}'!D$3:D$1000)=VALUE(MID($B$2,6,2)))*` +
        `('${kehadiran}'!L$3:L$1000)),"")`);

    // Jam OT Cuti Umum
    sh.getRange(i, 8).setFormula(
      `=IF(B${i}<>"",SUMPRODUCT(` +
        `('${kehadiran}'!B$3:B$1000=B${i})*` +
        `('${kehadiran}'!F$3:F$1000="Cuti Umum")*` +
        `(YEAR('${kehadiran}'!D$3:D$1000)=VALUE(LEFT($B$2,4)))*` +
        `(MONTH('${kehadiran}'!D$3:D$1000)=VALUE(MID($B$2,6,2)))*` +
        `('${kehadiran}'!L$3:L$1000)),"")`);

    // Jumlah Jam OT
    sh.getRange(i, 9).setFormula(
      `=IF(B${i}<>"",IFERROR(F${i}+G${i}+H${i},0),"")`);

    // Jumlah OT (RM) — sum dari Kehadiran sheet
    sh.getRange(i, 10).setFormula(
      `=IF(B${i}<>"",SUMPRODUCT(` +
        `('${kehadiran}'!B$3:B$1000=B${i})*` +
        `(YEAR('${kehadiran}'!D$3:D$1000)=VALUE(LEFT($B$2,4)))*` +
        `(MONTH('${kehadiran}'!D$3:D$1000)=VALUE(MID($B$2,6,2)))*` +
        `('${kehadiran}'!N$3:N$1000)),"")`);
  }

  // Grand total
  sh.getRange(104, 1, 1, 9).merge()
    .setValue('JUMLAH KESELURUHAN OT')
    .setFontWeight('bold').setBackground('#ffcdd2').setHorizontalAlignment('right');
  sh.getRange(104, 10).setFormula('=IFERROR(SUM(J4:J103),0)')
    .setFontWeight('bold').setBackground('#b71c1c').setFontColor('#ffffff')
    .setFontSize(12).setNumberFormat('"RM "#,##0.00');

  sh.setFrozenRows(3);
}

// ================================================================
// SHEET 5 — LAPORAN BULANAN
// ================================================================

function setupLaporan(ss) {
  let sh = ss.getSheetByName(SHEET.LAPORAN);
  if (!sh) sh = ss.insertSheet(SHEET.LAPORAN);
  sh.clear(); sh.clearFormats();

  const C_H = '#004d40'; const C_SH = '#00695c';

  sh.getRange('A1:L1').merge()
    .setValue('📋 LAPORAN KEHADIRAN & OT BULANAN')
    .setBackground(C_H).setFontColor('#ffffff')
    .setFontSize(15).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(1, 42);

  // Info
  sh.getRange('A2').setValue('Bulan:').setFontWeight('bold');
  sh.getRange('B2')
    .setFormula(`=IFERROR(VLOOKUP("Bulan Semasa (YYYY-MM)",'${SHEET.TETAPAN}'!B:C,2,FALSE),"")`)
    .setFontWeight('bold').setFontSize(12).setBackground('#e0f2f1');
  sh.getRange('D2').setValue('Syarikat:').setFontWeight('bold');
  sh.getRange('E2:H2').merge()
    .setFormula(`=IFERROR(VLOOKUP("Nama Syarikat",'${SHEET.TETAPAN}'!B:C,2,FALSE),"")`)
    .setFontWeight('bold').setBackground('#e0f2f1');

  const headers = ['No.','No. Pekerja','Nama Pekerja','Jabatan','Syif',
                   'Hari\nHadir','Hari\nAbsen','Minit\nLambat',
                   'Jam OT','Jumlah OT\n(RM)','Gaji Pokok\n(RM)','Jumlah\nPendapatan (RM)'];
  const widths  = [40, 100, 180, 150, 90, 75, 75, 80, 80, 120, 120, 155];

  headers.forEach((h, i) => {
    sh.setColumnWidth(i + 1, widths[i]);
    sh.getRange(3, i + 1).setValue(h)
      .setBackground(C_SH).setFontColor('#ffffff')
      .setFontWeight('bold').setHorizontalAlignment('center')
      .setVerticalAlignment('middle').setWrap(true);
  });
  sh.setRowHeight(3, 44);

  sh.getRange('J4:L103').setNumberFormat('"RM "#,##0.00');
  sh.getRange('I4:I103').setNumberFormat('0.00');

  const kehadiran = SHEET.KEHADIRAN;
  const pekerja   = SHEET.PEKERJA;
  const ot        = SHEET.OT;

  for (let i = 4; i <= 103; i++) {
    const pRow = i - 1;
    sh.getRange(i, 1).setFormula(`=IF('${pekerja}'!B${pRow}<>"",${i-3},"")`);
    sh.getRange(i, 2).setFormula(`='${pekerja}'!B${pRow}`);
    sh.getRange(i, 3).setFormula(
      `=IF(B${i}<>"",IFERROR(VLOOKUP(B${i},'${pekerja}'!B:C,2,FALSE),""),"")`);
    sh.getRange(i, 4).setFormula(
      `=IF(B${i}<>"",IFERROR(VLOOKUP(B${i},'${pekerja}'!B:D,3,FALSE),""),"")`);
    // Syif (col G = index 6 dalam range B:G)
    sh.getRange(i, 5).setFormula(
      `=IF(B${i}<>"",IFERROR(VLOOKUP(B${i},'${pekerja}'!B:G,6,FALSE),""),"")`);

    // Hari Hadir
    sh.getRange(i, 6).setFormula(
      `=IF(B${i}<>"",COUNTIFS(` +
        `'${kehadiran}'!B:B,B${i},` +
        `'${kehadiran}'!D:D,">="&DATE(VALUE(LEFT($B$2,4)),VALUE(MID($B$2,6,2)),1),` +
        `'${kehadiran}'!D:D,"<"&DATE(VALUE(LEFT($B$2,4)),VALUE(MID($B$2,6,2))+1,1)),"")`);

    // Hari Absen (anggap 26 hari kerja sebulan)
    sh.getRange(i, 7).setFormula(`=IF(B${i}<>"",MAX(0,26-F${i}),"")`);

    // Minit Lambat (jumlah)
    sh.getRange(i, 8).setFormula(
      `=IF(B${i}<>"",SUMPRODUCT(` +
        `('${kehadiran}'!B$3:B$1000=B${i})*` +
        `(YEAR('${kehadiran}'!D$3:D$1000)=VALUE(LEFT($B$2,4)))*` +
        `(MONTH('${kehadiran}'!D$3:D$1000)=VALUE(MID($B$2,6,2)))*` +
        `('${kehadiran}'!K$3:K$1000)),"")`);

    // Jam OT — dari sheet OT (col I = index 8 dalam range B:I)
    sh.getRange(i, 9).setFormula(
      `=IF(B${i}<>"",IFERROR(VLOOKUP(B${i},'${ot}'!B:I,8,FALSE),0),"")`);

    // Jumlah OT RM — dari sheet OT (col J = index 9 dalam range B:J)
    sh.getRange(i, 10).setFormula(
      `=IF(B${i}<>"",IFERROR(VLOOKUP(B${i},'${ot}'!B:J,9,FALSE),0),"")`);

    // Gaji Pokok — col F = index 5 dalam range B:F
    sh.getRange(i, 11).setFormula(
      `=IF(B${i}<>"",IFERROR(VLOOKUP(B${i},'${pekerja}'!B:F,5,FALSE),0),"")`);

    // Jumlah Pendapatan
    sh.getRange(i, 12).setFormula(
      `=IF(B${i}<>"",K${i}+J${i},"")`);
  }

  // Grand total
  sh.getRange(104, 1, 1, 9).merge()
    .setValue('JUMLAH KESELURUHAN')
    .setFontWeight('bold').setBackground('#b2dfdb').setHorizontalAlignment('right');
  ['J','K','L'].forEach((col, i) => {
    sh.getRange(`${col}104`).setFormula(`=IFERROR(SUM(${col}4:${col}103),0)`)
      .setFontWeight('bold').setBackground(i === 2 ? C_H : '#b2dfdb')
      .setFontColor(i === 2 ? '#ffffff' : '#000000')
      .setNumberFormat('"RM "#,##0.00');
  });

  sh.setFrozenRows(3);
}

// ================================================================
// SHEET 6 — EKSPORT GAJI
// ================================================================

function setupGaji(ss) {
  let sh = ss.getSheetByName(SHEET.GAJI);
  if (!sh) sh = ss.insertSheet(SHEET.GAJI);
  sh.clear(); sh.clearFormats();

  const C_H = '#263238'; const C_SH = '#37474f';

  sh.getRange('A1:I1').merge()
    .setValue('💰 EKSPORT SLIP GAJI / PAYROLL SUMMARY')
    .setBackground(C_H).setFontColor('#ffffff')
    .setFontSize(15).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(1, 42);

  // Info
  sh.getRange('A2').setValue('Bulan:').setFontWeight('bold');
  sh.getRange('B2')
    .setFormula(`=IFERROR(VLOOKUP("Bulan Semasa (YYYY-MM)",'${SHEET.TETAPAN}'!B:C,2,FALSE),"")`)
    .setFontWeight('bold').setFontSize(12).setBackground('#eceff1');
  sh.getRange('D2').setValue('Syarikat:').setFontWeight('bold');
  sh.getRange('E2:G2').merge()
    .setFormula(`=IFERROR(VLOOKUP("Nama Syarikat",'${SHEET.TETAPAN}'!B:C,2,FALSE),"")`)
    .setFontWeight('bold').setBackground('#eceff1');

  const headers = ['No.','No. Pekerja','Nama Pekerja','Jabatan','No. Akaun Bank',
                   'Gaji Pokok\n(RM)','OT\n(RM)','Potongan Lewat\n(RM)','GAJI BERSIH\n(RM)'];
  const widths  = [40, 100, 200, 150, 155, 120, 100, 135, 140];

  headers.forEach((h, i) => {
    sh.setColumnWidth(i + 1, widths[i]);
    sh.getRange(3, i + 1).setValue(h)
      .setBackground(C_SH).setFontColor('#ffffff')
      .setFontWeight('bold').setHorizontalAlignment('center')
      .setVerticalAlignment('middle').setWrap(true);
  });
  sh.setRowHeight(3, 44);

  sh.getRange('F4:I103').setNumberFormat('"RM "#,##0.00');

  const pekerja  = SHEET.PEKERJA;
  const ot       = SHEET.OT;
  const laporan  = SHEET.LAPORAN;
  const tetapan  = SHEET.TETAPAN;

  for (let i = 4; i <= 103; i++) {
    const pRow = i - 1;
    sh.getRange(i, 1).setFormula(`=IF('${pekerja}'!B${pRow}<>"",${i-3},"")`);
    sh.getRange(i, 2).setFormula(`='${pekerja}'!B${pRow}`);
    sh.getRange(i, 3).setFormula(
      `=IF(B${i}<>"",IFERROR(VLOOKUP(B${i},'${pekerja}'!B:C,2,FALSE),""),"")`);
    sh.getRange(i, 4).setFormula(
      `=IF(B${i}<>"",IFERROR(VLOOKUP(B${i},'${pekerja}'!B:D,3,FALSE),""),"")`);
    // No. Akaun Bank — col J = index 9 dalam range B:J
    sh.getRange(i, 5).setFormula(
      `=IF(B${i}<>"",IFERROR(VLOOKUP(B${i},'${pekerja}'!B:J,9,FALSE),""),"")`);

    // Gaji Pokok — col F = index 5 dalam range B:F
    sh.getRange(i, 6).setFormula(
      `=IF(B${i}<>"",IFERROR(VLOOKUP(B${i},'${pekerja}'!B:F,5,FALSE),0),"")`);

    // OT — dari OT sheet, col J = index 9 dalam range B:J
    sh.getRange(i, 7).setFormula(
      `=IF(B${i}<>"",IFERROR(VLOOKUP(B${i},'${ot}'!B:J,9,FALSE),0),"")`);

    // Potongan lewat = MAX(0, minit_lambat - toleransi) × kadar
    sh.getRange(i, 8).setFormula(
      `=IF(B${i}<>"",` +
        `MAX(0,` +
          `IFERROR(VLOOKUP(B${i},'${laporan}'!B:H,7,FALSE),0)-` +
          `IFERROR(VLOOKUP("Minit Toleransi Lambat",'${tetapan}'!B:C,2,FALSE),15)` +
        `)*IFERROR(VLOOKUP("Potongan Lewat (RM/minit)",'${tetapan}'!B:C,2,FALSE),0.5),` +
        `"")`);

    // Gaji Bersih
    sh.getRange(i, 9).setFormula(
      `=IF(B${i}<>"",F${i}+G${i}-H${i},"")`);

    // Row shading
    const bg = i % 2 === 0 ? '#eceff1' : '#ffffff';
    sh.getRange(i, 1, 1, 9).setBackground(bg);
  }

  // Grand total
  sh.getRange(104, 1, 1, 5).merge()
    .setValue('JUMLAH KESELURUHAN GAJI PERLU DIBAYAR')
    .setFontWeight('bold').setBackground('#cfd8dc').setHorizontalAlignment('right');
  ['F','G','H'].forEach(col => {
    sh.getRange(`${col}104`).setFormula(`=IFERROR(SUM(${col}4:${col}103),0)`)
      .setFontWeight('bold').setBackground('#cfd8dc').setNumberFormat('"RM "#,##0.00');
  });
  sh.getRange('I104').setFormula('=IFERROR(SUM(I4:I103),0)')
    .setFontWeight('bold').setBackground(C_H).setFontColor('#ffffff')
    .setFontSize(13).setNumberFormat('"RM "#,##0.00');

  // Nota cetak
  sh.getRange('A106:I106').merge()
    .setValue('📥 Untuk PDF: Fail ▸ Muat Turun ▸ PDF    |    Untuk cetak: Ctrl+P    |    Pilih "Eksport Gaji" sebagai kawasan cetak')
    .setBackground('#e3f2fd').setFontColor('#1565c0').setHorizontalAlignment('center')
    .setBorder(true, true, true, true, false, false, '#1565c0', SpreadsheetApp.BorderStyle.SOLID);

  sh.setFrozenRows(3);
}

// ================================================================
// DIALOG — TAMBAH REKOD KEHADIRAN
// ================================================================

function showAttendanceDialog() {
  const html = HtmlService.createHtmlOutput(`
<!DOCTYPE html>
<html>
<head>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 16px; }
  h3 { color: #4a148c; margin: 0 0 16px; font-size: 16px; }
  label { display: block; font-weight: 600; font-size: 12px; color: #444; margin: 10px 0 3px; }
  input, select { width: 100%; padding: 8px 10px; border: 1px solid #ccc; border-radius: 5px; font-size: 13px; }
  input:focus, select:focus { outline: none; border-color: #6a1b9a; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .btn { background: #6a1b9a; color: #fff; border: none; border-radius: 5px;
         padding: 11px; width: 100%; font-size: 14px; cursor: pointer; margin-top: 14px; }
  .btn:hover { background: #4a148c; }
  .err { color: #c62828; font-size: 12px; margin-top: 8px; display: none; }
</style>
</head>
<body>
<h3>➕ Tambah Rekod Kehadiran</h3>
<label>No. Pekerja *</label>
<input type="text" id="empId" placeholder="cth: EMP001">
<label>Tarikh *</label>
<input type="date" id="tarikh">
<label>Jenis Hari *</label>
<select id="jenisHari">
  <option value="Biasa">Hari Biasa</option>
  <option value="Rehat">Hari Rehat</option>
  <option value="Cuti Umum">Cuti Umum</option>
</select>
<label>Syif *</label>
<select id="syif">
  <option value="Pagi">🌅 Pagi (07:00 – 15:00)</option>
  <option value="Petang">🌆 Petang (15:00 – 23:00)</option>
  <option value="Malam">🌙 Malam (23:00 – 07:00)</option>
  <option value="Bergilir">🔄 Bergilir</option>
</select>
<div class="grid2">
  <div><label>Masa Masuk *</label><input type="time" id="masaMasuk"></div>
  <div><label>Masa Keluar *</label><input type="time" id="masaKeluar"></div>
</div>
<p class="err" id="errMsg">Sila isi semua maklumat bertanda *</p>
<button class="btn" onclick="submit()">✅ Simpan Rekod</button>
<script>
  document.getElementById('tarikh').valueAsDate = new Date();
  function submit() {
    const v = {
      empId:      document.getElementById('empId').value.trim(),
      tarikh:     document.getElementById('tarikh').value,
      jenisHari:  document.getElementById('jenisHari').value,
      syif:       document.getElementById('syif').value,
      masaMasuk:  document.getElementById('masaMasuk').value,
      masaKeluar: document.getElementById('masaKeluar').value
    };
    if (!v.empId || !v.tarikh || !v.masaMasuk || !v.masaKeluar) {
      document.getElementById('errMsg').style.display = 'block';
      return;
    }
    document.getElementById('errMsg').style.display = 'none';
    google.script.run
      .withSuccessHandler(() => { alert('✅ Rekod berjaya disimpan!'); google.script.host.close(); })
      .withFailureHandler(e => alert('❌ Ralat: ' + e.message))
      .saveAttendanceRecord(v);
  }
</script>
</body>
</html>
  `).setWidth(420).setHeight(500).setTitle('Tambah Rekod Kehadiran');
  SpreadsheetApp.getUi().showModalDialog(html, 'Tambah Rekod Kehadiran');
}

function saveAttendanceRecord(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET.KEHADIRAN);
  const lastRow = Math.max(sh.getLastRow(), 2);

  // Cari baris kosong pertama bermula row 3
  let targetRow = lastRow + 1;
  for (let r = 3; r <= lastRow + 1; r++) {
    if (!sh.getRange(r, 2).getValue()) { targetRow = r; break; }
  }

  const [yr, mo, dy]  = data.tarikh.split('-').map(Number);
  const [hh1, mm1]    = data.masaMasuk.split(':').map(Number);
  const [hh2, mm2]    = data.masaKeluar.split(':').map(Number);

  sh.getRange(targetRow, 2).setValue(data.empId);
  sh.getRange(targetRow, 4).setValue(new Date(yr, mo - 1, dy));
  sh.getRange(targetRow, 6).setValue(data.jenisHari);
  sh.getRange(targetRow, 7).setValue(data.syif);
  sh.getRange(targetRow, 8).setValue(new Date(2000, 0, 1, hh1, mm1));
  sh.getRange(targetRow, 9).setValue(new Date(2000, 0, 1, hh2, mm2));

  SpreadsheetApp.flush();
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function refreshCalculations() {
  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert('✅ Selesai',
    'Pengiraan OT telah dikemas kini. Semak sheet "Pengiraan OT" dan "Laporan Bulanan".',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function gotoLaporan() {
  SpreadsheetApp.flush();
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.LAPORAN).activate();
}

function gotoGaji() {
  SpreadsheetApp.flush();
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET.GAJI).activate();
}

function showHelp() {
  const html = HtmlService.createHtmlOutput(`
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family:'Segoe UI',Arial,sans-serif; padding:20px; line-height:1.65; color:#333; }
  h2 { color:#1a237e; border-bottom:3px solid #1a237e; padding-bottom:8px; }
  h3 { color:#283593; margin-top:22px; }
  .step { background:#e8eaf6; padding:9px 14px; border-radius:6px; margin:7px 0;
          border-left:4px solid #3949ab; }
  .tip  { background:#e8f5e9; padding:9px 14px; border-radius:6px; margin:7px 0;
          border-left:4px solid #43a047; }
  .warn { background:#fff8e1; padding:9px 14px; border-radius:6px; margin:7px 0;
          border-left:4px solid #f9a825; }
  table { width:100%; border-collapse:collapse; margin:12px 0; font-size:13px; }
  th { background:#1a237e; color:#fff; padding:9px 10px; text-align:left; }
  td { padding:8px 10px; border:1px solid #ddd; }
  tr:nth-child(even) td { background:#f5f5f5; }
  code { background:#ede7f6; padding:2px 6px; border-radius:3px; font-size:12px; }
</style>
</head>
<body>
<h2>📖 Panduan OT Kalkulator</h2>

<h3>🚀 Langkah Permulaan</h3>
<div class="step">1. Menu <b>⚙️ OT Kalkulator → 🔧 Persediaan Awal (Setup)</b></div>
<div class="step">2. Isi maklumat syarikat &amp; kadar OT di sheet <b>Tetapan</b></div>
<div class="step">3. Daftar pekerja di sheet <b>Senarai Pekerja</b> (guna No. Pekerja unik)</div>
<div class="step">4. Input kehadiran harian di <b>Rekod Kehadiran</b> atau guna menu <b>Tambah Rekod</b></div>
<div class="step">5. Tukar bulan di sel B2 sheet <b>Tetapan</b> untuk laporan bulan lain</div>

<h3>📊 Senarai 6 Sheet</h3>
<table>
  <tr><th>Sheet</th><th>Fungsi</th></tr>
  <tr><td>⚙️ Tetapan</td><td>Kadar OT, waktu syif, maklumat syarikat, bulan aktif</td></tr>
  <tr><td>👥 Senarai Pekerja</td><td>Data pekerja, gaji pokok, syif, no. akaun</td></tr>
  <tr><td>📅 Rekod Kehadiran</td><td>Input harian — Jam OT &amp; potongan dikira automatik</td></tr>
  <tr><td>📊 Pengiraan OT</td><td>Ringkasan OT bulanan per pekerja (auto-filter ikut bulan)</td></tr>
  <tr><td>📋 Laporan Bulanan</td><td>Laporan lengkap: hadir, absen, lewat, OT, pendapatan</td></tr>
  <tr><td>💰 Eksport Gaji</td><td>Format payroll — sedia cetak/PDF</td></tr>
</table>

<h3>📐 Formula OT (Akta Kerja 1955)</h3>
<div class="tip">
  <b>Kadar Sejam</b> = Gaji Pokok ÷ (Jam Standard × 26 hari)<br>
  <b>OT Hari Biasa</b> = Jam OT × Kadar Sejam × 1.5<br>
  <b>OT Hari Rehat</b> = Jam OT × Kadar Sejam × 2.0<br>
  <b>OT Cuti Umum</b> = Jam OT × Kadar Sejam × 3.0
</div>

<h3>💡 Tips</h3>
<div class="tip">Sel berwarna <b style="background:#fff9c4;padding:1px 5px;">KUNING</b> boleh diubah</div>
<div class="tip">Kadar OT boleh diubah di sheet <b>Tetapan</b> mengikut polisi syarikat</div>
<div class="tip">Guna format masa <code>HH:MM</code> (cth: <code>07:30</code>) untuk Masa Masuk/Keluar</div>
<div class="warn">⚠️ Jangan masukkan rekod pendua untuk pekerja + tarikh yang sama</div>
<div class="warn">⚠️ Pastikan <b>Bulan Semasa</b> di Tetapan dikemas kini setiap bulan</div>
</body>
</html>
  `).setWidth(620).setHeight(620).setTitle('Panduan Pengguna');
  SpreadsheetApp.getUi().showModalDialog(html, 'Panduan Pengguna');
}

// ================================================================
// HELPER — BACA NILAI DARI SHEET TETAPAN
// ================================================================

function getTetapanValue(ss, label, defaultVal) {
  const sh = ss.getSheetByName(SHEET.TETAPAN);
  if (!sh) return defaultVal;
  const data = sh.getRange(1, 2, sh.getLastRow(), 2).getValues();
  for (const [k, v] of data) {
    if (String(k).trim() === label) return v;
  }
  return defaultVal;
}

function fmtRM(val) {
  const n = parseFloat(val) || 0;
  return 'RM ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ================================================================
// PAYSLIP TEMPLATE SHEET (TERSEMBUNYI)
// Layout tetap — baris 1-27
// ================================================================

function setupPayslipTemplate(ss) {
  let sh = ss.getSheetByName(PAYSLIP_SH);
  if (!sh) sh = ss.insertSheet(PAYSLIP_SH);
  sh.clear(); sh.clearFormats();

  // Column widths (total ~655px, sesuai A4)
  [15, 155, 130, 15, 155, 130, 15].forEach((w, i) => sh.setColumnWidth(i + 1, w));

  // Row heights (rows 1–27)
  [10,40,22,10,36,24,10,24,24,24,24,12,30,24,24,24,24,12,28,12,46,12,24,52,20,10,18]
    .forEach((h, i) => sh.setRowHeight(i + 1, h));

  const DARK  = '#1a237e';
  const GREEN = '#1b5e20';
  const GREY  = '#455a64';
  const LIGHT = '#e8eaf6';
  const WHITE = '#ffffff';
  const YLLOW = '#fff9c4';
  const RED   = '#b71c1c';

  // ── Baris 1-4: Header Syarikat
  sh.getRange(1, 1, 4, 7).setBackground(DARK);
  sh.getRange(2, 2, 1, 5).merge()
    .setValue('NAMA SYARIKAT').setBackground(DARK).setFontColor(WHITE)
    .setFontSize(17).setFontWeight('bold').setVerticalAlignment('middle');
  sh.getRange(3, 2, 1, 5).merge()
    .setValue('Alamat Syarikat').setBackground(DARK).setFontColor('#90caf9')
    .setFontSize(10).setVerticalAlignment('middle');

  // ── Baris 5: Tajuk
  sh.getRange(5, 2, 1, 5).merge()
    .setValue('✦  SLIP GAJI  /  PAYSLIP  ✦')
    .setBackground(LIGHT).setFontSize(13).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  // ── Baris 6: Tempoh
  sh.getRange(6, 2, 1, 5).merge()
    .setValue('Tempoh: —')
    .setBackground(LIGHT).setFontSize(11).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  // ── Baris 7: spacer
  sh.getRange(7, 1, 1, 7).setBackground('#e0e0e0');

  // ── Baris 8-11: Maklumat Pekerja
  const detailBg = ['#f5f5f5','#fafafa','#f5f5f5','#fafafa'];
  [
    ['Nama Pekerja', 'No. Pekerja'],
    ['Jawatan',      'Jabatan'],
    ['Syif',        'No. IC'],
    ['No. Akaun Bank', 'Hari Hadir'],
  ].forEach(([l1, l2], i) => {
    const r = 8 + i; const bg = detailBg[i];
    sh.getRange(r, 2).setValue(l1).setFontWeight('bold').setFontColor(GREY)
      .setFontSize(9).setBackground(bg).setVerticalAlignment('middle');
    sh.getRange(r, 3).setValue('—').setBackground(WHITE)
      .setVerticalAlignment('middle');
    sh.getRange(r, 5).setValue(l2).setFontWeight('bold').setFontColor(GREY)
      .setFontSize(9).setBackground(bg).setVerticalAlignment('middle');
    sh.getRange(r, 6).setValue('—').setBackground(WHITE)
      .setVerticalAlignment('middle');
  });

  // ── Baris 12: divider
  sh.getRange(12, 1, 1, 7).setBackground('#e0e0e0');

  // ── Baris 13: Column headers
  sh.getRange(13, 2, 1, 2).merge()
    .setValue('💰 PENDAPATAN').setBackground(GREEN).setFontColor(WHITE)
    .setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.getRange(13, 5, 1, 2).merge()
    .setValue('📉 POTONGAN').setBackground(RED).setFontColor(WHITE)
    .setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');

  // ── Baris 14-17: Item pendapatan / potongan
  const incomeLabels  = ['Gaji Pokok', 'OT Hari Biasa (1.5x)', 'OT Hari Rehat (2.0x)', 'OT Cuti Umum (3.0x)'];
  const deductLabels  = ['Potongan Lambat', '', '', ''];
  const incBg = ['#f1f8e9','#ffffff','#f1f8e9','#ffffff'];
  const dedBg = ['#ffebee','#ffffff','#ffebee','#ffffff'];

  incomeLabels.forEach((lbl, i) => {
    const r = 14 + i;
    sh.getRange(r, 2).setValue(lbl).setBackground(incBg[i]).setFontSize(10).setVerticalAlignment('middle');
    sh.getRange(r, 3).setValue('RM 0.00').setBackground(incBg[i])
      .setHorizontalAlignment('right').setFontWeight('bold').setVerticalAlignment('middle');
    if (deductLabels[i]) {
      sh.getRange(r, 5).setValue(deductLabels[i]).setBackground(dedBg[i]).setFontSize(10).setVerticalAlignment('middle');
      sh.getRange(r, 6).setValue('RM 0.00').setBackground(dedBg[i])
        .setHorizontalAlignment('right').setFontWeight('bold').setVerticalAlignment('middle');
    } else {
      sh.getRange(r, 5, 1, 2).setBackground('#fafafa');
    }
  });

  // ── Baris 18: divider
  sh.getRange(18, 1, 1, 7).setBackground('#e0e0e0');

  // ── Baris 19: Subtotal
  sh.getRange(19, 2).setValue('Jumlah Pendapatan').setFontWeight('bold').setBackground('#e8f5e9').setVerticalAlignment('middle');
  sh.getRange(19, 3).setValue('RM 0.00').setFontWeight('bold').setBackground('#c8e6c9')
    .setHorizontalAlignment('right').setVerticalAlignment('middle');
  sh.getRange(19, 5).setValue('Jumlah Potongan').setFontWeight('bold').setBackground('#ffebee').setVerticalAlignment('middle');
  sh.getRange(19, 6).setValue('RM 0.00').setFontWeight('bold').setBackground('#ffcdd2')
    .setHorizontalAlignment('right').setVerticalAlignment('middle');

  // ── Baris 20: spacer
  sh.getRange(20, 1, 1, 7).setBackground('#e0e0e0');

  // ── Baris 21: Gaji Bersih
  sh.getRange(21, 2, 1, 5).merge()
    .setValue('GAJI BERSIH / NET SALARY:  RM 0.00')
    .setBackground(GREEN).setFontColor(WHITE)
    .setFontSize(14).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');

  // ── Baris 22: spacer
  sh.getRange(22, 1, 1, 7).setBackground('#e0e0e0');

  // ── Baris 23: Tandatangan header
  sh.getRange(23, 2, 1, 2).merge().setValue('Tandatangan Pekerja')
    .setBackground(LIGHT).setFontSize(9).setFontColor(GREY)
    .setHorizontalAlignment('center');
  sh.getRange(23, 5, 1, 2).merge().setValue('Tandatangan Majikan / Cop Syarikat')
    .setBackground(LIGHT).setFontSize(9).setFontColor(GREY)
    .setHorizontalAlignment('center');

  // ── Baris 24: Ruang tanda tangan
  sh.getRange(24, 2, 1, 2).merge()
    .setBorder(false, false, true, false, false, false, '#555', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(24, 5, 1, 2).merge()
    .setBorder(false, false, true, false, false, false, '#555', SpreadsheetApp.BorderStyle.SOLID);

  // ── Baris 25: Nama & tarikh
  sh.getRange(25, 2, 1, 2).merge().setValue('Nama & Tarikh')
    .setFontColor(GREY).setFontSize(8).setHorizontalAlignment('center');
  sh.getRange(25, 5, 1, 2).merge().setValue('Nama & Tarikh')
    .setFontColor(GREY).setFontSize(8).setHorizontalAlignment('center');

  // ── Baris 27: Disclaimer
  sh.getRange(27, 2, 1, 5).merge()
    .setValue('Dokumen ini dijana secara automatik. Sah tanpa tandatangan jika dicetak dari sistem.')
    .setFontColor(GREY).setFontSize(7.5).setFontStyle('italic')
    .setHorizontalAlignment('center');

  // Set print area & hide gridlines
  sh.setHiddenGridlines(true);
  sh.hideSheet();
}

// ================================================================
// POPULATE PAYSLIP — ISI DATA PEKERJA KE TEMPLATE
// ================================================================

function populatePayslip(ss, d) {
  const sh = ss.getSheetByName(PAYSLIP_SH);
  if (!sh) return;

  // Baris 2-3: Syarikat
  sh.getRange(2, 2).setValue(d.syarikat);
  sh.getRange(3, 2).setValue(d.alamat || '');

  // Baris 6: Tempoh
  sh.getRange(6, 2).setValue('Tempoh: ' + d.bulan);

  // Baris 8-11: Maklumat Pekerja (col C = nilai kiri, col F = nilai kanan)
  sh.getRange(8,  3).setValue(d.nama);       sh.getRange(8,  6).setValue(d.empId);
  sh.getRange(9,  3).setValue(d.jawatan);    sh.getRange(9,  6).setValue(d.jabatan);
  sh.getRange(10, 3).setValue(d.syif);       sh.getRange(10, 6).setValue(d.ic || '—');
  sh.getRange(11, 3).setValue(d.akaun || '—'); sh.getRange(11, 6).setValue(d.hariHadir + ' hari');

  // Baris 14-17: Pendapatan
  sh.getRange(14, 3).setValue(fmtRM(d.gajiPokok));
  sh.getRange(15, 3).setValue(fmtRM(d.otBiasaRM));
  sh.getRange(16, 3).setValue(fmtRM(d.otRehatRM));
  sh.getRange(17, 3).setValue(fmtRM(d.otCutiRM));

  // Baris 14: Potongan
  sh.getRange(14, 6).setValue(fmtRM(d.potongLewat));

  // Baris 19: Subtotal
  const totalIncome = (d.gajiPokok || 0) + (d.otBiasaRM || 0) + (d.otRehatRM || 0) + (d.otCutiRM || 0);
  sh.getRange(19, 3).setValue(fmtRM(totalIncome));
  sh.getRange(19, 6).setValue(fmtRM(d.potongLewat));

  // Baris 21: Gaji Bersih
  sh.getRange(21, 2).setValue('GAJI BERSIH / NET SALARY:  ' + fmtRM(d.bersih));

  SpreadsheetApp.flush();
}

// ================================================================
// EXPORT SHEET SEBAGAI PDF BLOB
// ================================================================

function exportSheetAsPDF(ss, sheet, filename) {
  const token = ScriptApp.getOAuthToken();
  const gid   = sheet.getSheetId();
  // r1,c1,r2,c2 = 0-indexed — had rows 1-27, cols A-G (0-6)
  const url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export' +
    '?exportFormat=pdf&format=pdf' +
    '&size=A4&portrait=true&fitw=true&fzr=false' +
    '&gridlines=false&sheetnames=false&printtitle=false&pagenumbers=false' +
    '&top_margin=0.5&bottom_margin=0.5&left_margin=0.5&right_margin=0.5' +
    '&gid=' + gid;

  const res = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    throw new Error('Gagal export PDF: HTTP ' + res.getResponseCode());
  }
  return res.getBlob().setName(filename);
}

// ================================================================
// MAIN — JANA PDF PAYROLL KE GOOGLE DRIVE
// ================================================================

function exportPayrollPDF() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  const ui  = SpreadsheetApp.getUi();

  // Pastikan payslip template wujud
  if (!ss.getSheetByName(PAYSLIP_SH)) setupPayslipTemplate(ss);

  // Sheets auto-convert "2026-05" jadi Date object — kena format balik jadi string
  let bulanRaw = getTetapanValue(ss, 'Bulan Semasa (YYYY-MM)',
    Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM'));
  const bulan = (bulanRaw instanceof Date)
    ? Utilities.formatDate(bulanRaw, 'Asia/Kuala_Lumpur', 'yyyy-MM')
    : String(bulanRaw).trim();

  const syarikat = String(getTetapanValue(ss, 'Nama Syarikat', 'Syarikat'));
  const alamat   = String(getTetapanValue(ss, 'Alamat Syarikat', ''));
  const tahun    = parseInt(bulan.split('-')[0], 10);
  const bulanNum = parseInt(bulan.split('-')[1], 10);

  ui.alert('⏳ Jana PDF',
    'Proses menjana PDF sedang berjalan...\n\nFile akan disimpan di Google Drive anda.\nSila tunggu sehingga notifikasi berjaya muncul.',
    ui.ButtonSet.OK);

  // Buat folder Drive
  const folderName = 'Payroll_' + syarikat.replace(/[^a-zA-Z0-9\s]/g, '') + '_' + bulan;
  const folder = DriveApp.createFolder(folderName);

  // ── 1. Summary PDF (sheet Eksport Gaji)
  try {
    const gajish = ss.getSheetByName(SHEET.GAJI);
    if (gajish) {
      const blob = exportSheetAsPDF(ss, gajish, 'Summary_Gaji_' + bulan + '.pdf');
      folder.createFile(blob);
    }
  } catch (e) {
    Logger.log('Summary export error: ' + e.message);
  }

  // ── 2. Baca semua data ke memori (lebih cepat dari banyak API calls)
  const pekerjaSh  = ss.getSheetByName(SHEET.PEKERJA);
  const kehSh      = ss.getSheetByName(SHEET.KEHADIRAN);

  if (!pekerjaSh || !kehSh) {
    ui.alert('❌ Ralat', 'Sheet Senarai Pekerja atau Rekod Kehadiran tidak dijumpai.', ui.ButtonSet.OK);
    return;
  }

  // Data pekerja — cols B:J (idx 0-8): EmpId,Nama,Jabatan,Jawatan,Gaji,Syif,Status,IC,Akaun
  const pLastRow = Math.max(pekerjaSh.getLastRow(), 3);
  const pRows    = pekerjaSh.getRange(3, 2, pLastRow - 2, 9).getValues();

  // Data kehadiran — cols B,D,F,K,L,N (EmpId,Tarikh,JenisHari,MenitLambat,JamOT,OT_RM)
  // Ambil cols B:N = 13 cols (idx 0-12)
  const kLastRow = Math.max(kehSh.getLastRow(), 3);
  const kRows    = kehSh.getRange(3, 2, kLastRow - 2, 13).getValues();

  // Proses kehadiran ikut employee + bulan
  // idx: 0=EmpId, 2=Tarikh, 4=JenisHari, 9=MenitLambat, 10=JamOT, 12=OT_RM
  const kehByEmp = {};
  for (const row of kRows) {
    const empId = row[0];
    if (!empId) continue;
    const tarikh = row[2];
    if (!tarikh || !(tarikh instanceof Date)) continue;
    if (tarikh.getFullYear() !== tahun || tarikh.getMonth() + 1 !== bulanNum) continue;

    if (!kehByEmp[empId]) {
      kehByEmp[empId] = { hadir: 0, menitLambat: 0, biasaRM: 0, rehatRM: 0, cutiRM: 0, potongRM: 0 };
    }
    kehByEmp[empId].hadir++;
    kehByEmp[empId].menitLambat += parseFloat(row[9]) || 0;

    const otRM      = parseFloat(row[12]) || 0;
    const jenisHari = row[4];
    if (jenisHari === 'Biasa')       kehByEmp[empId].biasaRM += otRM;
    else if (jenisHari === 'Rehat')  kehByEmp[empId].rehatRM += otRM;
    else if (jenisHari === 'Cuti Umum') kehByEmp[empId].cutiRM += otRM;
  }

  // Kira potongan lewat per employee
  const toleransi   = parseFloat(getTetapanValue(ss, 'Minit Toleransi Lambat', 15)) || 15;
  const kadarPotong = parseFloat(getTetapanValue(ss, 'Potongan Lewat (RM/minit)', 0.5)) || 0.5;
  for (const empId in kehByEmp) {
    const menitLebih = Math.max(0, kehByEmp[empId].menitLambat - toleransi);
    kehByEmp[empId].potongRM = menitLebih * kadarPotong;
  }

  // ── 3. Jana payslip untuk setiap pekerja aktif
  const payslipSh = ss.getSheetByName(PAYSLIP_SH);
  payslipSh.showSheet();

  let count = 0;
  for (const emp of pRows) {
    const [empId, nama, jabatan, jawatan, gajiPokok, syif, status, ic, akaun] = emp;
    if (!empId || status === 'Tidak Aktif') continue;

    const k           = kehByEmp[empId] || {};
    const otBiasaRM   = k.biasaRM   || 0;
    const otRehatRM   = k.rehatRM   || 0;
    const otCutiRM    = k.cutiRM    || 0;
    const potongLewat = k.potongRM  || 0;
    const hariHadir   = k.hadir     || 0;
    const totalOT     = otBiasaRM + otRehatRM + otCutiRM;
    const bersih      = (parseFloat(gajiPokok) || 0) + totalOT - potongLewat;

    populatePayslip(ss, {
      syarikat, alamat, bulan, empId, nama, jabatan, jawatan,
      syif, ic, akaun, gajiPokok, otBiasaRM, otRehatRM, otCutiRM,
      potongLewat, bersih, hariHadir
    });

    try {
      const safeName = String(nama).replace(/[^a-zA-Z0-9\s]/g, '').trim();
      const blob = exportSheetAsPDF(ss, payslipSh,
        'Payslip_' + empId + '_' + safeName + '_' + bulan + '.pdf');
      folder.createFile(blob);
      count++;
    } catch (e) {
      Logger.log('Payslip error (' + empId + '): ' + e.message);
    }

    Utilities.sleep(800); // elak rate limit Google
  }

  payslipSh.hideSheet();

  const folderUrl = 'https://drive.google.com/drive/folders/' + folder.getId();
  ui.alert('✅ PDF Berjaya!',
    count + ' slip gaji individu + 1 summary telah disimpan di Google Drive.\n\n' +
    '📁 Folder: ' + folderName + '\n\n' +
    'Buka Google Drive dan cari folder tersebut, atau klik link di bawah:\n' +
    folderUrl,
    ui.ButtonSet.OK);
}

