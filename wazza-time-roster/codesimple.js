// ╔═══════════════════════════════════════════════════╗
// ║   ROSTER SIMPLE v1.0 — Google Apps Script         ║
// ║   CARA GUNA:                                       ║
// ║   1. Buka Google Sheets baru (kosong)              ║
// ║   2. Extensions > Apps Script > Paste > Save       ║
// ║   3. Run > initialSetup  (sekali sahaja)           ║
// ║   4. Isi pekerja di ⚙️ Setup (baris 18 ke bawah)  ║
// ║   5. Menu › Generate Roster → Auto Fill            ║
// ╚═══════════════════════════════════════════════════╝

// ─── Kod shift & warnanya ───────────────────────────
var CFG = {
  SHIFT_KEYS: ["P","T","M","OFF","AL","MC","EL","PH"],
  SHIFT_INFO: {
    "P":   {label:"Pagi",         masa:"06:00–14:00", bg:"#FEF08A", fg:"#713F12"},
    "T":   {label:"Tengah Hari",  masa:"14:00–22:00", bg:"#BBF7D0", fg:"#14532D"},
    "M":   {label:"Malam",        masa:"22:00–06:00", bg:"#BFDBFE", fg:"#1E3A8A"},
    "OFF": {label:"Hari Rehat",   masa:"—",           bg:"#F3F4F6", fg:"#374151"},
    "AL":  {label:"Annual Leave", masa:"—",           bg:"#FBCFE8", fg:"#831843"},
    "MC":  {label:"Cuti Sakit",   masa:"—",           bg:"#FECACA", fg:"#7F1D1D"},
    "EL":  {label:"Emergency",    masa:"—",           bg:"#DDD6FE", fg:"#3B0764"},
    "PH":  {label:"Cuti Umum",    masa:"—",           bg:"#FDE68A", fg:"#78350F"},
  },
};

// ─── Warna ──────────────────────────────────────────
var C = {
  PRI:"#0F4C81", PRI_L:"#E8F1F8",
  ACC:"#059669", ACC_L:"#ECFDF5",
  ORG:"#D97706", ORG_L:"#FFFBEB",
  RED:"#DC2626", RED_L:"#FEF2F2",
  G50:"#F9FAFB", G100:"#F3F4F6", G200:"#E5E7EB",
  G400:"#9CA3AF", G700:"#374151",
  WHT:"#FFFFFF", WKD_H:"#EA580C", WKD_B:"#FFF7ED",
};

var HARI_S = ["Ahd","Isn","Sel","Rab","Kha","Jum","Sab"];
var BULAN  = ["Januari","Februari","Mac","April","Mei","Jun",
              "Julai","Ogos","September","Oktober","November","Disember"];

// ─── Kedudukan data dalam tab Setup ─────────────────
var S = {
  PEK_START: 18, // baris pertama data pekerja
  PEK_END:   77, // baris terakhir (max 60 pekerja)
  COL_NAMA:  2,  // kolum B = nama
  COL_DEPT:  3,  // kolum C = bahagian
  COL_STAT:  4,  // kolum D = status
  RULE_ROW:  7,  // baris mula nilai rules
  RULE_COL:  6,  // kolum F = nilai rules
};

// ════════════════════════════════════════════════════
//  ENTRY POINT — jalankan sekali untuk bina semua tab
// ════════════════════════════════════════════════════
function initialSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sheets = ss.getSheets();
  for (var i = sheets.length - 1; i > 0; i--) ss.deleteSheet(sheets[i]);
  sheets[0].setName("_temp_");

  _buatSetup(ss);
  _buatRoster(ss);
  _buatRingkasan(ss);

  var tmp = ss.getSheetByName("_temp_");
  if (tmp) ss.deleteSheet(tmp);

  ss.rename("Roster Simple");
  ss.setActiveSheet(ss.getSheetByName("⚙️ Setup"));

  SpreadsheetApp.getUi().alert(
    "✅ Roster Simple v1.0 berjaya dibina!\n\n" +
    "CARA GUNA:\n" +
    "1. Isi nama pekerja di ⚙️ Setup (baris 18 ke bawah)\n" +
    "2. Menu › 🗓️ Generate Roster — pilih bulan & tahun\n" +
    "3. Isi cells yang nak LOCK dahulu\n" +
    "   Contoh: Ahmad Rabu = P (Pagi)\n" +
    "4. Menu › 🤖 Auto Fill — isi yang kosong secara auto\n\n" +
    "💡 Edit Rules di Setup kolum F untuk tukar syarat auto fill."
  );
}

// ════════════════════════════════════════════════════
//  TAB: ⚙️ Setup
// ════════════════════════════════════════════════════
function _buatSetup(ss) {
  var sh = ss.insertSheet("⚙️ Setup");
  sh.setTabColor(C.PRI);

  // Header
  sh.getRange("A1:K1").merge()
    .setValue("⚙️   ROSTER SIMPLE — KONFIGURASI")
    .setBackground(C.PRI).setFontColor(C.WHT)
    .setFontSize(14).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setRowHeight(1, 44);

  // Nama syarikat
  sh.getRange("A3").setValue("Nama Syarikat:")
    .setFontWeight("bold").setFontColor(C.G700).setBackground(C.G100);
  sh.getRange("B3:D3").merge().setValue("Syarikat Anda Sdn Bhd")
    .setFontWeight("bold").setFontColor(C.PRI).setBackground(C.WHT);
  sh.getRange("A3:D3").setBorder(true,true,true,true,true,true,C.G200,SpreadsheetApp.BorderStyle.SOLID);

  // ── Senarai Kod Shift (kiri: A-C) ──
  sh.getRange("A5").setValue("🕐  KOD SHIFT")
    .setFontWeight("bold").setFontSize(10).setFontColor(C.PRI);
  sh.getRange("A6:C6").setValues([["Kod","Nama Shift","Masa Kerja"]])
    .setBackground(C.PRI).setFontColor(C.WHT).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setRowHeight(6, 28);

  var keys = CFG.SHIFT_KEYS;
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i], sv = CFG.SHIFT_INFO[k];
    var r = 7 + i;
    sh.getRange(r,1).setValue(k)
      .setBackground(sv.bg).setFontColor(sv.fg)
      .setFontWeight("bold").setHorizontalAlignment("center").setFontSize(11);
    sh.getRange(r,2).setValue(sv.label).setBackground(i%2===0?C.WHT:C.G50);
    sh.getRange(r,3).setValue(sv.masa)
      .setBackground(i%2===0?C.WHT:C.G50).setFontSize(9).setFontColor(C.G400);
    sh.setRowHeight(r, 24);
  }
  sh.getRange(7,1,keys.length,3)
    .setBorder(true,true,true,true,true,true,C.G200,SpreadsheetApp.BorderStyle.SOLID);

  // ── Rules Auto Fill (kanan: E-F) ──
  sh.getRange("E5").setValue("🤖  RULES AUTO FILL")
    .setFontWeight("bold").setFontSize(10).setFontColor(C.ORG);
  sh.getRange("E6:F6").setValues([["Parameter","Nilai"]])
    .setBackground(C.ORG).setFontColor(C.WHT).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setRowHeight(6, 28);

  var rulesDef = [
    ["Min Pagi (P) sehari",        1],
    ["Min Tengah Hari (T) sehari", 0],
    ["Min Malam (M) sehari",       0],
    ["Max hari kerja berturut",    5],
    ["Min hari OFF sebulan",       4],
  ];
  for (var i = 0; i < rulesDef.length; i++) {
    var r = S.RULE_ROW + i;
    sh.getRange(r,5).setValue(rulesDef[i][0])
      .setBackground(i%2===0?C.WHT:C.G50).setFontSize(9).setFontColor(C.G700);
    sh.getRange(r,6).setValue(rulesDef[i][1])
      .setBackground(i%2===0?C.WHT:C.G50)
      .setFontWeight("bold").setFontColor(C.ORG).setHorizontalAlignment("center");
    sh.setRowHeight(r, 24);
  }
  sh.getRange(S.RULE_ROW,5,5,2)
    .setBorder(true,true,true,true,true,true,C.G200,SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(12,5,1,2).merge()
    .setValue("💡 Edit nilai di kolum F")
    .setFontStyle("italic").setFontSize(8).setFontColor(C.G400).setBackground(C.ORG_L);

  // ── Senarai Pekerja ──
  sh.getRange("A16").setValue("👥  SENARAI PEKERJA  (max 60 pekerja — isi dari baris 18)")
    .setFontWeight("bold").setFontSize(10).setFontColor(C.PRI);
  sh.getRange("A17:D17").setValues([["Bil","Nama Pekerja","Bahagian / Dept","Status"]])
    .setBackground(C.PRI).setFontColor(C.WHT).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setRowHeight(17, 30);

  // Dropdown validation: status
  var statVal = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Aktif","Tidak Aktif","Berhenti"], true)
    .setAllowInvalid(false).build();
  sh.getRange("D18:D77").setDataValidation(statVal);

  // Contoh 3 pekerja
  var sample = [
    [1,"Ahmad Fauzi",  "Operasi",   "Aktif"],
    [2,"Siti Aminah",  "Operasi",   "Aktif"],
    [3,"Rizwan Ismail","Pengeluaran","Aktif"],
  ];
  sh.getRange(18,1,sample.length,4).setValues(sample);
  for (var i = 0; i < sample.length; i++) {
    var r = 18+i;
    sh.getRange(r,1,1,4).setBackground(i%2===0?C.WHT:C.G50);
    sh.getRange(r,1).setHorizontalAlignment("center").setFontColor(C.G400);
  }
  sh.getRange(18,1,sample.length,4)
    .setBorder(true,true,true,true,true,true,C.G200,SpreadsheetApp.BorderStyle.SOLID);

  // Baris kosong yang tinggal
  for (var r = 18+sample.length; r <= 77; r++) {
    sh.getRange(r,1,1,4).setBackground(r%2===0?C.WHT:C.G50)
      .setBorder(false,true,false,true,false,false,C.G200,SpreadsheetApp.BorderStyle.SOLID);
  }

  // CF untuk status
  var stRng = sh.getRange("D18:D77");
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Aktif")
      .setBackground("#D1FAE5").setFontColor("#065F46").setRanges([stRng]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Tidak Aktif")
      .setBackground("#FEE2E2").setFontColor("#7F1D1D").setRanges([stRng]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Berhenti")
      .setBackground(C.G100).setFontColor(C.G400).setRanges([stRng]).build(),
  ]);

  // Lebar kolum
  sh.setColumnWidth(1,40); sh.setColumnWidth(2,200);
  sh.setColumnWidth(3,130); sh.setColumnWidth(4,100);
  sh.setColumnWidth(5,20); // spacer
  sh.setColumnWidth(6,170); sh.setColumnWidth(7,60);
  sh.setFrozenRows(17);
}

// ════════════════════════════════════════════════════
//  TAB: 🗓️ Roster  (skeleton — diisi oleh generateRoster)
// ════════════════════════════════════════════════════
function _buatRoster(ss) {
  var sh = ss.insertSheet("🗓️ Roster");
  sh.setTabColor(C.PRI);

  sh.getRange("A1:AJ1").merge()
    .setValue("🗓️   ROSTER SHIFT BULANAN — ROSTER SIMPLE")
    .setBackground(C.PRI).setFontColor(C.WHT)
    .setFontSize(13).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setRowHeight(1, 44);

  sh.getRange("A2").setValue("Syarikat:").setBackground(C.G100)
    .setFontWeight("bold").setFontColor(C.G400).setFontSize(9);
  sh.getRange("B2:D2").merge().setFormula("='⚙️ Setup'!B3")
    .setBackground(C.WHT).setFontWeight("bold").setFontColor(C.PRI);
  sh.getRange("E2:H2").merge()
    .setValue("💡 Guna menu › 🗓️ Generate Roster untuk mula")
    .setBackground(C.ORG_L).setFontColor(C.ORG).setFontSize(9).setHorizontalAlignment("center");
  sh.setRowHeight(2, 26);

  // Placeholder header baris 3
  sh.getRange("A3").setValue("Nama Pekerja").setBackground(C.PRI)
    .setFontColor(C.WHT).setFontWeight("bold").setHorizontalAlignment("center");
  sh.getRange("B3").setValue("Bahagian").setBackground(C.PRI)
    .setFontColor(C.WHT).setFontWeight("bold").setHorizontalAlignment("center");
  sh.setRowHeight(3, 38);

  // Legenda row 4
  sh.getRange("A4:B4").merge().setValue("LEGENDA:").setFontWeight("bold").setFontSize(8).setFontColor(C.G400);
  var col = 3;
  for (var k = 0; k < CFG.SHIFT_KEYS.length; k++) {
    var key = CFG.SHIFT_KEYS[k], sv = CFG.SHIFT_INFO[key];
    sh.getRange(4,col).setValue(key + " = " + sv.label)
      .setBackground(sv.bg).setFontColor(sv.fg).setFontSize(8).setHorizontalAlignment("center");
    col++;
  }
  sh.setRowHeight(4, 18);

  sh.setColumnWidth(1,180); sh.setColumnWidth(2,110);
  sh.setFrozenRows(4);
}

// ════════════════════════════════════════════════════
//  TAB: 📋 Ringkasan  (skeleton — diisi oleh refreshRingkasan)
// ════════════════════════════════════════════════════
function _buatRingkasan(ss) {
  var sh = ss.insertSheet("📋 Ringkasan");
  sh.setTabColor(C.ACC);

  sh.getRange("A1:J1").merge()
    .setValue("📋   RINGKASAN HARI KERJA — ROSTER SIMPLE")
    .setBackground(C.ACC).setFontColor(C.WHT)
    .setFontSize(13).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setRowHeight(1, 44);

  sh.getRange("A2:J2").merge()
    .setValue("⚠️  Run 'Refresh Ringkasan' dari menu selepas kemaskini Roster")
    .setBackground(C.ORG_L).setFontColor("#92400E").setFontSize(9)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setRowHeight(2, 24);

  var hdrs = ["Bil","Nama Pekerja","Bahagian","P (Pagi)","T (Tgh)","M (Mlm)","OFF","AL/MC/EL","Total Kerja","Status"];
  sh.getRange("A3:J3").setValues([hdrs])
    .setBackground(C.ACC).setFontColor(C.WHT).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  sh.setRowHeight(3, 34);

  sh.setColumnWidth(1,35); sh.setColumnWidth(2,185); sh.setColumnWidth(3,120);
  for (var i=4;i<=9;i++) sh.setColumnWidth(i,70);
  sh.setColumnWidth(10,130);
  sh.setFrozenRows(3);
}

// ════════════════════════════════════════════════════
//  GENERATE ROSTER — bina grid bulanan
// ════════════════════════════════════════════════════
function generateRoster() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("🗓️ Roster");
  var setupSh = ss.getSheetByName("⚙️ Setup");
  if (!sh || !setupSh) { _alert("Tab tidak dijumpai. Run initialSetup dulu."); return; }

  var ui = SpreadsheetApp.getUi();
  var today = new Date();
  var resp = ui.prompt("Generate Roster Bulanan",
    "Masukkan bulan & tahun (format: mm/yyyy)\nContoh: 06/2026\n(Kosong = bulan semasa: " + _padZ(today.getMonth()+1) + "/" + today.getFullYear() + ")",
    ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;

  var input = resp.getResponseText().trim();
  var bulan, tahun;
  if (input === "") {
    bulan = today.getMonth(); tahun = today.getFullYear();
  } else {
    var pts = input.split("/");
    if (pts.length !== 2) { _alert("Format tidak sah. Guna mm/yyyy"); return; }
    bulan = parseInt(pts[0]) - 1; tahun = parseInt(pts[1]);
    if (isNaN(bulan)||isNaN(tahun)||bulan<0||bulan>11) { _alert("Bulan atau tahun tidak sah."); return; }
  }

  var hari = new Date(tahun, bulan+1, 0).getDate();
  var pekData = _getPekerja(setupSh);
  if (!pekData.length) { _alert("Tiada pekerja aktif. Sila isi data di Setup dahulu."); return; }

  // Buang semua merge dalam rows 1-4 dulu — elak conflict bila regenerate
  sh.getRange(1, 1, 4, sh.getMaxColumns()).breakApart();

  // Clear grid lama (baris 5 ke bawah)
  var lastRow = Math.max(sh.getLastRow(), 100);
  if (lastRow >= 5) sh.getRange(5,1,lastRow-4, 3+hari+6).clearContent().clearFormat().clearDataValidations();

  // Row 1: header — set background je, tak merge (supaya freeze columns boleh jalan)
  sh.getRange(1, 1, 1, 3+hari+6).setBackground(C.PRI).setFontColor(C.WHT)
    .setFontSize(13).setFontWeight("bold").setVerticalAlignment("middle");
  sh.getRange("A1").setValue("🗓️   ROSTER SHIFT — " + BULAN[bulan].toUpperCase() + " " + tahun + "   |   ROSTER SIMPLE")
    .setHorizontalAlignment("left");

  // Row 2: info bar — re-set setiap cell berasingan (no merge conflict)
  sh.getRange("A2").setValue("Syarikat:").setBackground(C.G100)
    .setFontWeight("bold").setFontColor(C.G400).setFontSize(9);
  sh.getRange("B2").setFormula("='⚙️ Setup'!B3")
    .setBackground(C.WHT).setFontWeight("bold").setFontColor(C.PRI);
  sh.getRange("C2").setValue("").setBackground(C.WHT);
  sh.getRange("D2").setValue("").setBackground(C.WHT);
  sh.getRange("E2").setValue(BULAN[bulan] + " " + tahun)
    .setFontWeight("bold").setFontColor(C.ACC).setBackground(C.ACC_L).setFontSize(11);
  sh.getRange("F2:H2").merge()
    .setValue("💡 Isi cells yang nak lock → kemudian guna Auto Fill")
    .setBackground(C.ORG_L).setFontColor(C.ORG).setFontSize(9).setHorizontalAlignment("center");
  sh.setRowHeight(2, 26);

  // Header tarikh (row 3)
  for (var d = 1; d <= hari; d++) {
    var tgk = new Date(tahun, bulan, d);
    var dayIdx = tgk.getDay();
    var isWkd = (dayIdx===0||dayIdx===6);
    var col = 2 + d; // col C = day 1 = col index 3 (1-indexed)
    sh.getRange(3, col)
      .setValue(_padZ(d)+"\n"+HARI_S[dayIdx])
      .setBackground(isWkd ? C.WKD_H : C.PRI)
      .setFontColor(C.WHT).setFontWeight("bold")
      .setHorizontalAlignment("center").setVerticalAlignment("middle")
      .setFontSize(9).setWrap(true);
    sh.setColumnWidth(col, 34);
  }

  // Header summary kolum
  var sCol = 3 + hari; // kolum ringkasan mula
  var sHdrs = [["P",C.ACC],["T",C.PRI],["M","#1E3A8A"],["OFF",C.G700],["AL/MC",C.RED],["Kerja",C.PRI]];
  for (var s = 0; s < sHdrs.length; s++) {
    sh.getRange(3, sCol+s).setValue(sHdrs[s][0])
      .setBackground(sHdrs[s][1]).setFontColor(C.WHT)
      .setFontWeight("bold").setHorizontalAlignment("center").setFontSize(9);
    sh.setColumnWidth(sCol+s, 40);
  }

  // Validation dropdown shift
  var shiftVal = SpreadsheetApp.newDataValidation()
    .requireValueInList(CFG.SHIFT_KEYS, true).setAllowInvalid(false)
    .setHelpText("Pilih shift").build();

  var allCfRanges = [];
  var sC = columnLetter(3);          // col C = hari 1
  var eC = columnLetter(2 + hari);   // col = hari terakhir

  for (var pi = 0; pi < pekData.length; pi++) {
    var pek = pekData[pi];
    var row = 5 + pi;
    var rowBg = pi%2===0 ? C.WHT : C.G50;

    // Nama & bahagian — FORMULA dari Setup (auto-update bila user tukar nama)
    sh.getRange(row,1).setFormula("='⚙️ Setup'!B" + pek.setupRow)
      .setBackground(rowBg).setFontWeight("bold").setFontSize(10).setVerticalAlignment("middle");
    sh.getRange(row,2).setFormula("='⚙️ Setup'!C" + pek.setupRow)
      .setBackground(rowBg).setFontSize(9).setFontColor(C.G400)
      .setHorizontalAlignment("center").setVerticalAlignment("middle");

    // Sel shift setiap hari — weekday KOSONG, weekend = OFF
    for (var d = 1; d <= hari; d++) {
      var tgk = new Date(tahun, bulan, d);
      var isWkd = (tgk.getDay()===0 || tgk.getDay()===6);
      var col = 2 + d;
      sh.getRange(row, col)
        .setValue(isWkd ? "OFF" : "")
        .setDataValidation(shiftVal)
        .setHorizontalAlignment("center").setFontWeight("bold").setFontSize(10)
        .setBackground(isWkd ? C.WKD_B : rowBg);
      allCfRanges.push(sh.getRange(row, col));
    }

    // Formula ringkasan hujung baris
    sh.getRange(row,sCol)  .setFormula('=COUNTIF('+sC+row+':'+eC+row+',"P")')
      .setHorizontalAlignment("center").setFontWeight("bold").setBackground(C.ACC_L).setFontColor(C.ACC);
    sh.getRange(row,sCol+1).setFormula('=COUNTIF('+sC+row+':'+eC+row+',"T")')
      .setHorizontalAlignment("center").setFontWeight("bold").setBackground("#EFF6FF").setFontColor(C.PRI);
    sh.getRange(row,sCol+2).setFormula('=COUNTIF('+sC+row+':'+eC+row+',"M")')
      .setHorizontalAlignment("center").setFontWeight("bold").setBackground("#EFF6FF").setFontColor("#1E3A8A");
    sh.getRange(row,sCol+3).setFormula('=COUNTIF('+sC+row+':'+eC+row+',"OFF")')
      .setHorizontalAlignment("center").setBackground(C.G100).setFontColor(C.G700);
    sh.getRange(row,sCol+4).setFormula('=COUNTIF('+sC+row+':'+eC+row+',"AL")+COUNTIF('+sC+row+':'+eC+row+',"MC")+COUNTIF('+sC+row+':'+eC+row+',"EL")')
      .setHorizontalAlignment("center").setBackground(C.RED_L).setFontColor(C.RED);
    sh.getRange(row,sCol+5).setFormula('='+columnLetter(sCol)+row+'+'+columnLetter(sCol+1)+row+'+'+columnLetter(sCol+2)+row)
      .setHorizontalAlignment("center").setFontWeight("bold").setBackground(C.PRI_L).setFontColor(C.PRI);

    sh.setRowHeight(row, 26);
  }

  // Apply warna CF untuk semua sel shift
  _applyShiftCF(sh, allCfRanges);

  // Freeze 2 kolum pertama (Nama + Bahagian) — buat SELEPAS semua merge selesai
  // Row 1 header di-merge dari A1 sahaja (bukan merge ke kanan), jadi freeze cols 2 selamat
  try { sh.setFrozenColumns(2); } catch(e) {}

  // Refresh ringkasan
  _refreshRingkasan(ss, bulan, tahun, hari);

  ss.setActiveSheet(sh);
  _alert(
    "✅ Roster " + BULAN[bulan] + " " + tahun + " berjaya digenerate!\n\n" +
    "Pekerja: " + pekData.length + "  |  Hari: " + hari + "\n\n" +
    "📝 Weekday cells KOSONG — isi yang nak lock dahulu.\n" +
    "   Kemudian guna menu › 🤖 Auto Fill Roster."
  );
}

// ════════════════════════════════════════════════════
//  AUTO FILL ROSTER — isi sel kosong ikut rules
// ════════════════════════════════════════════════════
function autoFillRoster() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("🗓️ Roster");
  var setupSh = ss.getSheetByName("⚙️ Setup");
  if (!sh || !setupSh) { _alert("Tab tidak dijumpai."); return; }

  var info = _getRosterInfo(sh);
  if (!info) { _alert("⚠️ Roster belum digenerate.\nGuna menu › Generate Roster dahulu."); return; }

  var hari = info.hari;
  var rules = _getRules(setupSh);
  var pekData = _getPekerja(setupSh);
  if (!pekData.length) { _alert("Tiada pekerja aktif dalam Setup."); return; }

  // Baca nilai semasa dari Roster (getDisplayValues untuk dapat nilai formula)
  var display = sh.getDataRange().getDisplayValues();

  // Bina map nama → baris dalam display array (0-indexed)
  var nameRowMap = {};
  for (var r = 0; r < display.length; r++) {
    var nama = (display[r][0]||"").toString().trim();
    var dept = (display[r][1]||"").toString().trim();
    // Baris pekerja: ada nama DAN bahagian (bukan header/kosong)
    if (nama && dept && nama !== "Nama Pekerja") nameRowMap[nama] = r;
  }

  // IDX 0-based: col A=0(Nama), col B=1(Dept), col C=2(Day1), col C+d=Day(d+1)
  var IDX = 2; // index hari pertama dalam array

  // Bina shift matrix per pekerja (shifts[p][d] = nilai, "" = kosong)
  var shifts = [], sheetRows = [];
  for (var p = 0; p < pekData.length; p++) {
    var mRow = nameRowMap[pekData[p].nama];
    sheetRows.push(mRow !== undefined ? mRow + 1 : null);
    var row = [];
    for (var d = 0; d < hari; d++) {
      var v = mRow !== undefined ? (display[mRow][IDX+d]||"").toString().trim().toUpperCase() : "";
      row.push(v);
    }
    shifts.push(row);
  }

  // ── Detect: semua cells dah penuh? (rules bertukar selepas auto fill lalu) ──
  var emptyCellCount = 0;
  for (var p = 0; p < pekData.length; p++) {
    for (var d = 0; d < hari; d++) {
      if (shifts[p][d] === "") emptyCellCount++;
    }
  }

  if (emptyCellCount === 0) {
    var ui = SpreadsheetApp.getUi();
    var confirm = ui.alert(
      "⚠️  Semua cells dah diisi",
      "Roster dah penuh — Auto Fill tak akan ubah apa-apa.\n\n" +
      "Nak RESET semua cells dan buat semula dengan rules semasa?\n\n" +
      "Rules semasa:\n" +
      "  Max berturut: " + rules.maxConsecutive + " hari\n" +
      "  Min OFF: " + rules.minOff + " hari/bulan\n\n" +
      "⚠️  Assignment manual sebelum ni akan hilang.",
      ui.ButtonSet.YES_NO
    );
    if (confirm !== ui.Button.YES) return;

    // Reset semua weekday cells dalam shift matrix
    for (var p = 0; p < pekData.length; p++) {
      for (var d = 0; d < hari; d++) {
        var tgkReset = new Date(info.tahun, info.bulan, d+1);
        var isWkdReset = (tgkReset.getDay()===0 || tgkReset.getDay()===6);
        if (!isWkdReset) shifts[p][d] = ""; // kosongkan weekday, kekal OFF weekend
      }
    }
  }

  // ── Algorithm: greedy day-by-day ──
  for (var d = 0; d < hari; d++) {
    var tgk = new Date(info.tahun, info.bulan, d+1);
    var isWkd = (tgk.getDay()===0 || tgk.getDay()===6);

    var cntP=0, cntT=0, cntM=0, emptyIdxs=[];
    for (var p = 0; p < pekData.length; p++) {
      var v = shifts[p][d];
      if (v==="")       { if (sheetRows[p]!==null) emptyIdxs.push(p); }
      else if (v==="P") { cntP++; }
      else if (v==="T") { cntT++; }
      else if (v==="M") { cntM++; }
    }
    if (!emptyIdxs.length) continue;

    // Shift yang masih kurang
    var needed = [];
    for (var n=0; n<Math.max(0,rules.minP-cntP); n++) needed.push("P");
    for (var n=0; n<Math.max(0,rules.minT-cntT); n++) needed.push("T");
    for (var n=0; n<Math.max(0,rules.minM-cntM); n++) needed.push("M");

    // Sort: pekerja paling sikit hari kerja dapat giliran dulu (adil)
    emptyIdxs.sort(function(a,b) {
      return _calcWorkCount(shifts[a],d) - _calcWorkCount(shifts[b],d);
    });

    var ni = 0;
    for (var ei = 0; ei < emptyIdxs.length; ei++) {
      var p = emptyIdxs[ei];
      var streak    = _calcStreak(shifts[p], d);
      var offCount  = _calcOffCount(shifts[p], d);
      var daysLeft  = hari - d;
      var offNeeded = Math.max(0, rules.minOff - offCount);

      // Wajib rehat jika: weekend, dah kerja max hari berturut, atau perlu jimat OFF
      var mustRest = isWkd || streak >= rules.maxConsecutive || daysLeft <= offNeeded;

      if (mustRest) {
        shifts[p][d] = "OFF";
      } else if (ni < needed.length) {
        shifts[p][d] = needed[ni++];
      } else {
        // Tiada shift spesifik perlu — bagi kerja kalau belum cukup, else OFF
        var workSoFar = _calcWorkCount(shifts[p], d);
        var targetWork = Math.round(hari * 5 / 7);
        shifts[p][d] = workSoFar < targetWork ? "P" : "OFF";
      }
    }
  }

  // ── Tulis balik ke sheet (batch per row) ──
  var filled = 0;
  for (var p = 0; p < pekData.length; p++) {
    var shRow = sheetRows[p];
    if (shRow===null) continue;
    var rowVals = [], hasChange = false;
    for (var d = 0; d < hari; d++) {
      var orig = (display[shRow-1][IDX+d]||"").toString().trim();
      rowVals.push(shifts[p][d]);
      if (orig==="" && shifts[p][d]!=="") { hasChange=true; filled++; }
    }
    if (hasChange) sh.getRange(shRow, IDX+1, 1, hari).setValues([rowVals]);
  }

  _refreshRingkasan(ss, info.bulan, info.tahun, hari);
  ss.setActiveSheet(sh);

  _alert(
    "✅ Auto Fill selesai!\n\n" +
    "Sel diisi: " + filled + "\n\n" +
    "Rules digunakan:\n" +
    "  Min Pagi: " + rules.minP + "/hari\n" +
    "  Min Tengah Hari: " + rules.minT + "/hari\n" +
    "  Min Malam: " + rules.minM + "/hari\n" +
    "  Max berturut: " + rules.maxConsecutive + " hari\n" +
    "  Min OFF: " + rules.minOff + " hari/bulan\n\n" +
    "💡 Sel yang sudah diisi manual sebelum Auto Fill dikekalkan."
  );
}

// ════════════════════════════════════════════════════
//  REFRESH RINGKASAN — update summary + check consecutive
// ════════════════════════════════════════════════════
function refreshRingkasan() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("🗓️ Roster");
  var info = sh ? _getRosterInfo(sh) : null;
  if (!info) { _alert("Roster belum digenerate. Generate Roster dahulu."); return; }
  _refreshRingkasan(ss, info.bulan, info.tahun, info.hari);
  _alert("✅ Ringkasan dikemaskini!");
}

function _refreshRingkasan(ss, bulan, tahun, hari) {
  var sumSh = ss.getSheetByName("📋 Ringkasan");
  var rosterSh = ss.getSheetByName("🗓️ Roster");
  var setupSh = ss.getSheetByName("⚙️ Setup");
  if (!sumSh || !rosterSh || !setupSh) return;

  // Clear data lama
  var lastRow = Math.max(sumSh.getLastRow(), 80);
  if (lastRow >= 4) sumSh.getRange(4,1,lastRow-3,10).clearContent().clearFormat();

  // Update header
  sumSh.getRange("A1:J1").merge()
    .setValue("📋   RINGKASAN — " + BULAN[bulan].toUpperCase() + " " + tahun + "   |   ROSTER SIMPLE")
    .setBackground(C.ACC).setFontColor(C.WHT).setFontSize(13).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");

  var pekData = _getPekerja(setupSh);
  if (!pekData.length) return;

  // Baca roster display
  var display = rosterSh.getDataRange().getDisplayValues();
  var nameRowMap = {};
  for (var r = 0; r < display.length; r++) {
    var a = (display[r][0]||"").toString().trim();
    var b = (display[r][1]||"").toString().trim();
    if (a && b && a !== "Nama Pekerja") nameRowMap[a] = r;
  }

  var IDX = 2; // index hari pertama
  var WORK = {P:1,T:1,M:1};
  var currentRow = 4;

  for (var pi = 0; pi < pekData.length; pi++) {
    var pek = pekData[pi];
    var mRow = nameRowMap[pek.nama];
    var rowBg = pi%2===0 ? C.WHT : C.G50;
    var cntP=0, cntT=0, cntM=0, cntOFF=0, cntAL=0;
    var maxStreak=0, streak=0;

    if (mRow !== undefined) {
      for (var d = 0; d < hari; d++) {
        var v = (display[mRow][IDX+d]||"").toString().trim().toUpperCase();
        if (v==="P")  cntP++;
        else if(v==="T") cntT++;
        else if(v==="M") cntM++;
        else if(v==="OFF") cntOFF++;
        else if(v==="AL"||v==="MC"||v==="EL") cntAL++;
        // Kira max streak
        if (WORK[v]) { streak++; if(streak>maxStreak) maxStreak=streak; }
        else streak=0;
      }
    }

    var totalKerja = cntP + cntT + cntM;
    var status;
    if (mRow === undefined) {
      status = "⚠️ Tiada data";
    } else if (maxStreak >= 6) {
      status = "🔴 Berturut " + maxStreak + " hari";
    } else if (cntOFF + cntAL < 4) {
      status = "🟡 Kurang rehat";
    } else {
      status = "✅ OK";
    }

    sumSh.getRange(currentRow,1).setValue(pi+1).setBackground(rowBg).setHorizontalAlignment("center");
    sumSh.getRange(currentRow,2).setFormula("='⚙️ Setup'!B"+pek.setupRow)
      .setBackground(rowBg).setFontWeight("bold");
    sumSh.getRange(currentRow,3).setFormula("='⚙️ Setup'!C"+pek.setupRow)
      .setBackground(rowBg).setFontSize(9).setFontColor(C.G400);
    sumSh.getRange(currentRow,4).setValue(mRow!==undefined?cntP:"—")
      .setBackground(rowBg).setHorizontalAlignment("center").setFontWeight("bold").setFontColor(C.ACC);
    sumSh.getRange(currentRow,5).setValue(mRow!==undefined?cntT:"—")
      .setBackground(rowBg).setHorizontalAlignment("center").setFontWeight("bold").setFontColor(C.PRI);
    sumSh.getRange(currentRow,6).setValue(mRow!==undefined?cntM:"—")
      .setBackground(rowBg).setHorizontalAlignment("center").setFontWeight("bold").setFontColor("#1E3A8A");
    sumSh.getRange(currentRow,7).setValue(mRow!==undefined?cntOFF:"—")
      .setBackground(rowBg).setHorizontalAlignment("center").setFontColor(C.G700);
    sumSh.getRange(currentRow,8).setValue(mRow!==undefined?cntAL:"—")
      .setBackground(rowBg).setHorizontalAlignment("center").setFontColor(C.RED);
    sumSh.getRange(currentRow,9).setValue(mRow!==undefined?totalKerja:"—")
      .setBackground(rowBg).setHorizontalAlignment("center").setFontWeight("bold");
    sumSh.getRange(currentRow,10).setValue(status)
      .setBackground(rowBg).setHorizontalAlignment("center").setFontWeight("bold");
    sumSh.setRowHeight(currentRow, 24);
    currentRow++;
  }

  // CF untuk kolum status
  var stRng = sumSh.getRange(4,10,Math.max(1,currentRow-4),1);
  sumSh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextContains("✅")
      .setBackground("#D1FAE5").setFontColor("#065F46").setRanges([stRng]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains("🔴")
      .setBackground("#FEE2E2").setFontColor("#7F1D1D").setRanges([stRng]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains("🟡")
      .setBackground("#FEF3C7").setFontColor("#92400E").setRanges([stRng]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains("⚠️")
      .setBackground(C.G100).setFontColor(C.G400).setRanges([stRng]).build(),
  ]);
}

// ════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ════════════════════════════════════════════════════

// Baca semua pekerja aktif dari Setup
function _getPekerja(sh) {
  var data = sh.getRange(S.PEK_START, 1, S.PEK_END - S.PEK_START + 1, 4).getValues();
  var res = [];
  for (var i = 0; i < data.length; i++) {
    var nama = (data[i][S.COL_NAMA-1]||"").toString().trim();
    var dept = (data[i][S.COL_DEPT-1]||"").toString().trim();
    var stat = (data[i][S.COL_STAT-1]||"").toString().trim();
    if (!nama) continue;
    if (stat==="Tidak Aktif"||stat==="Berhenti") continue;
    res.push({ nama:nama, dept:dept||"—", setupRow: S.PEK_START+i });
  }
  return res;
}

// Baca rules dari Setup (col F, rows 7-11)
function _getRules(sh) {
  try {
    var v = sh.getRange(S.RULE_ROW, S.RULE_COL, 5, 1).getValues();
    return {
      minP:           Math.max(0, parseInt(v[0][0])||1),
      minT:           Math.max(0, parseInt(v[1][0])||0),
      minM:           Math.max(0, parseInt(v[2][0])||0),
      maxConsecutive: Math.max(1, parseInt(v[3][0])||5),
      minOff:         Math.max(0, parseInt(v[4][0])||4),
    };
  } catch(e) {
    return {minP:1, minT:0, minM:0, maxConsecutive:5, minOff:4};
  }
}

// Detect bulan/tahun/hari dari Roster tab — baca A1 title (paling reliable)
function _getRosterInfo(sh) {
  try {
    var title = sh.getRange("A1").getValue().toString().toUpperCase();
    if (!title || title.indexOf("ROSTER SHIFT") < 0) return null;
    var yearMatch = title.match(/\b(20\d{2})\b/);
    if (!yearMatch) return null;
    var tahun = parseInt(yearMatch[1]);
    for (var i = 0; i < BULAN.length; i++) {
      if (title.indexOf(BULAN[i].toUpperCase()) >= 0) {
        var hari = new Date(tahun, i+1, 0).getDate();
        return {bulan:i, tahun:tahun, hari:hari};
      }
    }
    return null;
  } catch(e) { return null; }
}

// Kira streak hari kerja berturut-turut sebelum hari d (0-indexed)
function _calcStreak(shifts, d) {
  var streak = 0;
  for (var i = d-1; i >= 0; i--) {
    var v = shifts[i];
    if (v==="P"||v==="T"||v==="M") streak++;
    else break;
  }
  return streak;
}

// Kira bilangan hari rehat sebelum hari d
function _calcOffCount(shifts, d) {
  var n = 0;
  for (var i = 0; i < d; i++) {
    var v = shifts[i];
    if (v==="OFF"||v==="AL"||v==="MC"||v==="EL"||v==="PH") n++;
  }
  return n;
}

// Kira bilangan hari kerja sebelum hari d
function _calcWorkCount(shifts, d) {
  var n = 0;
  for (var i = 0; i < d; i++) {
    var v = shifts[i];
    if (v==="P"||v==="T"||v==="M") n++;
  }
  return n;
}

// Apply conditional formatting warna shift
function _applyShiftCF(sh, ranges) {
  if (!ranges||!ranges.length) return;
  var rules = [];
  for (var k = 0; k < CFG.SHIFT_KEYS.length; k++) {
    var key = CFG.SHIFT_KEYS[k], sv = CFG.SHIFT_INFO[key];
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(key).setBackground(sv.bg).setFontColor(sv.fg)
      .setRanges(ranges).build());
  }
  sh.setConditionalFormatRules(rules);
}

function columnLetter(n) {
  var r = "";
  while (n > 0) { n--; r = String.fromCharCode(65+(n%26))+r; n=Math.floor(n/26); }
  return r;
}

function _padZ(n)     { return n < 10 ? "0"+n : ""+n; }
function _fmtDate(d)  { return _padZ(d.getDate())+"/"+_padZ(d.getMonth()+1)+"/"+d.getFullYear(); }
function _alert(msg)  { SpreadsheetApp.getUi().alert(msg); }

// ════════════════════════════════════════════════════
//  MENU
// ════════════════════════════════════════════════════
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📋 Roster")
    .addItem("🔧 Setup Semula (First Time)", "initialSetup")
    .addSeparator()
    .addItem("🗓️ Generate Roster",           "generateRoster")
    .addItem("🤖 Auto Fill Roster",          "autoFillRoster")
    .addSeparator()
    .addItem("🔄 Refresh Ringkasan",         "refreshRingkasan")
    .addSeparator()
    .addItem("ℹ️ Panduan Guna",              "panduan")
    .addToUi();
}

function panduan() {
  _alert(
    "📋  ROSTER SIMPLE v1.0 — PANDUAN\n\n" +
    "SETUP (SEKALI SAHAJA):\n" +
    "  1. Isi nama syarikat di Setup › B3\n" +
    "  2. Tambah pekerja dari baris 18 ke bawah\n" +
    "     (Nama, Bahagian, Status)\n" +
    "  3. Edit Rules di kolum F jika perlu\n\n" +
    "CARA BUAT ROSTER:\n" +
    "  1. Menu › 🗓️ Generate Roster\n" +
    "     → Grid kosong dibina (weekend = OFF)\n" +
    "  2. Isi cells yang nak LOCK\n" +
    "     Contoh: Ahmad Rabu = P\n" +
    "  3. Menu › 🤖 Auto Fill Roster\n" +
    "     → Semua yang kosong diisi ikut rules\n\n" +
    "RINGKASAN:\n" +
    "  • Auto-update selepas Generate/Auto Fill\n" +
    "  • Status 🔴 = kerja 6+ hari berturut\n" +
    "  • Status 🟡 = kurang hari rehat\n" +
    "  • Status ✅ = OK"
  );
}
