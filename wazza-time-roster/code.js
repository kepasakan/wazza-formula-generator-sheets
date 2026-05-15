// ╔══════════════════════════════════════════════════════════════════╗
// ║          ROSTER PRO v4.0 — Auto Fill + Sync + Charts            ║
// ║                                                                  ║
// ║  CARA GUNA:                                                      ║
// ║  1. Buka Google Sheets BARU (kosong)                             ║
// ║  2. Extensions > Apps Script > Padam semua > Paste script ini    ║
// ║  3. Run > initialSetup (SEKALI sahaja untuk bina struktur)        ║
// ║  4. Isi data pekerja di ⚙️ Setup                                 ║
// ║  5. Guna menu "📋 Roster Pro" untuk generate/refresh roster      ║
// ║  6. Auto Fill: isi cells yang nak lock dulu, then Auto Fill       ║
// ╚══════════════════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════════════
//  KONFIGURASI GLOBAL
// ═══════════════════════════════════════════════════════
var CFG = {
  MAX_ROWS: 60,
  JAM_SHIFT: 8,
  RATE_STD: 10,
  RATE_OT: 15,
  OT_THRESHOLD: 160,
  SHIFT_KEYS: ["P","T","M","S","OT","OFF","AL","MC","EL","PH","OC"],
  SHIFT_INFO: {
    "P":   { label:"Pagi",          masa:"06:00-14:00", jam:8, bg:"#FEF08A", fg:"#713F12" },
    "T":   { label:"Tengah Hari",   masa:"14:00-22:00", jam:8, bg:"#BBF7D0", fg:"#14532D" },
    "M":   { label:"Malam",         masa:"22:00-06:00", jam:8, bg:"#BFDBFE", fg:"#1E3A8A" },
    "S":   { label:"Split",         masa:"08:00-12:00/17:00-21:00", jam:8, bg:"#E9D5FF", fg:"#4C1D95" },
    "OT":  { label:"Overtime",      masa:"Ikut keperluan", jam:4, bg:"#FED7AA", fg:"#7C2D12" },
    "OFF": { label:"Hari Rehat",    masa:"-", jam:0, bg:"#F3F4F6", fg:"#374151" },
    "AL":  { label:"Annual Leave",  masa:"-", jam:0, bg:"#FBCFE8", fg:"#831843" },
    "MC":  { label:"Cuti Sakit",    masa:"-", jam:0, bg:"#FECACA", fg:"#7F1D1D" },
    "EL":  { label:"Emergency",     masa:"-", jam:0, bg:"#DDD6FE", fg:"#3B0764" },
    "PH":  { label:"Public Holiday",masa:"-", jam:0, bg:"#FDE68A", fg:"#78350F" },
    "OC":  { label:"On Call",       masa:"Standby", jam:4, bg:"#CFFAFE", fg:"#164E63" },
  },
};

var C = {
  PRI:    "#0F4C81",
  PRI_D:  "#0A3259",
  PRI_L:  "#E8F1F8",
  ACC:    "#059669",
  ACC_L:  "#ECFDF5",
  WARN:   "#D97706",
  WARN_L: "#FFFBEB",
  DGR:    "#DC2626",
  DGR_L:  "#FEF2F2",
  G50:    "#F9FAFB",
  G100:   "#F3F4F6",
  G200:   "#E5E7EB",
  G400:   "#9CA3AF",
  G700:   "#374151",
  G900:   "#111827",
  WHT:    "#FFFFFF",
  WKD_H:  "#EA580C",
  WKD_B:  "#FFF7ED",
};

var HARI = ["Ahad","Isnin","Selasa","Rabu","Khamis","Jumaat","Sabtu"];
var HARI_S = ["Ahd","Isn","Sel","Rab","Kha","Jum","Sab"];
var BULAN = ["Januari","Februari","Mac","April","Mei","Jun","Julai","Ogos","September","Oktober","November","Disember"];

// ═══════════════════════════════════════════════════════
//  ROW/COL CONSTANTS
// ═══════════════════════════════════════════════════════
var SETUP = {
  DEPT_START: 5,
  DEPT_END:   12,
  PEK_START:  20,
  PEK_END:    79,
  COL_DEPT_KOD:  4,
  COL_DEPT_NAMA: 5,
  COL_PEK_BIL:   1,
  COL_PEK_ID:    2,
  COL_PEK_NAMA:  3,
  COL_PEK_JWTN:  4,
  COL_PEK_DEPT:  5,
  COL_PEK_KADAR: 6,
  COL_PEK_STATUS:7,
  // Rules section: col L(12)=label, col M(13)=value, rows 5-10
  RULES_ROW_START: 5,
  RULES_COL_LBL:  12,
  RULES_COL_VAL:  13,
};

// ═══════════════════════════════════════════════════════
//  ENTRY POINT
// ═══════════════════════════════════════════════════════
function initialSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var all = ss.getSheets();
  for (var i = all.length - 1; i > 0; i--) ss.deleteSheet(all[i]);
  all[0].setName("_init_");

  _buatSetup(ss);
  _buatWeekly(ss);
  _buatMonthly(ss);
  _buatSummary(ss);
  _buatClash(ss);
  _buatDashboard(ss);

  var tmp = ss.getSheetByName("_init_");
  if (tmp) ss.deleteSheet(tmp);

  ss.rename("📋 Roster Pro");
  ss.setActiveSheet(ss.getSheetByName("⚙️ Setup"));

  SpreadsheetApp.getUi().alert(
    "✅ ROSTER PRO v4.0 berjaya dibina!\n\n" +
    "LANGKAH SETERUSNYA:\n" +
    "1️⃣  Isikan data di ⚙️ Setup (pekerja, department & rules)\n" +
    "2️⃣  Guna menu › Generate Roster Bulanan\n" +
    "3️⃣  Isi cells yang nak lock (contoh: Amin Rabu = P)\n" +
    "4️⃣  Guna menu › 🤖 Auto Fill Roster untuk isi yang kosong\n" +
    "5️⃣  Weekly auto-sync dari Monthly bila generate\n\n" +
    "💡 Ubah rules Auto Fill di Setup › bahagian kanan atas (Rules)."
  );
}

// ═══════════════════════════════════════════════════════
//  TAB: ⚙️ SETUP
// ═══════════════════════════════════════════════════════
function _buatSetup(ss) {
  var sh = ss.insertSheet("⚙️ Setup");
  sh.setTabColor(C.PRI);

  _hdr(sh, "A1:M1", "⚙️   ROSTER PRO — KONFIGURASI & MASTER DATA", C.PRI, 14);
  sh.setRowHeight(1, 46);

  // ── Maklumat Syarikat ──
  _secLabel(sh, "A3", "🏢  MAKLUMAT SYARIKAT", C.PRI);
  var co = [
    ["Nama Syarikat",             "Syarikat Anda Sdn Bhd"],
    ["Alamat",                    "No. 1, Jalan Industri, Selangor"],
    ["Pengurus HR",               "Nama Pengurus HR"],
    ["Kadar Standard (RM/jam)",   10],
    ["Kadar Overtime (RM/jam)",   15],
    ["Jam standard sehari",       8],
    ["Threshold OT (jam/bulan)",  160],
  ];
  for (var i = 0; i < co.length; i++) {
    var r = 4 + i;
    sh.getRange(r,1).setValue(co[i][0]).setFontWeight("bold").setBackground(C.G100).setFontColor(C.G700);
    sh.getRange(r,2).setValue(co[i][1]).setBackground(C.WHT).setFontColor(C.G900);
    if (i >= 3) sh.getRange(r,2).setFontWeight("bold").setFontColor(C.PRI);
  }
  sh.getRange(4,1,co.length,2).setBorder(true,true,true,true,true,true,C.G200,SpreadsheetApp.BorderStyle.SOLID);

  // ── Senarai Department ──
  _secLabel(sh, "D3", "🏭  SENARAI DEPARTMENT (max 8)", C.ACC);
  _tblHdr(sh, "D4:F4", ["Nama Department","Pengurus","Warna"], C.ACC);

  var depts = [
    ["Operasi",      "Nama Pengurus", "#DBEAFE"],
    ["Pengeluaran",  "Nama Pengurus", "#D1FAE5"],
    ["Kualiti",      "Nama Pengurus", "#FEF3C7"],
    ["Logistik",     "Nama Pengurus", "#FCE7F3"],
    ["Teknikal",     "Nama Pengurus", "#EDE9FE"],
    ["Keselamatan",  "Nama Pengurus", "#FFEDD5"],
    ["Pentadbiran",  "Nama Pengurus", "#E0F2FE"],
    ["Sokongan",     "Nama Pengurus", "#F0FDF4"],
  ];
  for (var d = 0; d < depts.length; d++) {
    var r = SETUP.DEPT_START + d;
    sh.getRange(r,4).setValue(depts[d][0]).setFontWeight("bold");
    sh.getRange(r,5).setValue(depts[d][1]);
    sh.getRange(r,6).setBackground(depts[d][2]).setValue("◀ warna").setFontSize(8).setFontColor(C.G400).setHorizontalAlignment("center");
    sh.getRange(r,4,1,3).setBackground(d%2===0?C.WHT:C.G50);
    sh.getRange(r,6).setBackground(depts[d][2]);
  }
  sh.getRange(SETUP.DEPT_START,4,8,3).setBorder(true,true,true,true,true,true,C.G200,SpreadsheetApp.BorderStyle.SOLID);
  ss.setNamedRange("ListDept", sh.getRange("D5:D12"));

  // ── Senarai Shift ──
  _secLabel(sh, "H3", "🕐  KOD SHIFT", C.PRI);
  _tblHdr(sh, "H4:K4", ["Kod","Nama Shift","Masa","Jam"], C.PRI);
  for (var s = 0; s < CFG.SHIFT_KEYS.length; s++) {
    var key = CFG.SHIFT_KEYS[s];
    var sv = CFG.SHIFT_INFO[key];
    var r = 5 + s;
    sh.getRange(r,8).setValue(key).setHorizontalAlignment("center").setFontWeight("bold").setBackground(sv.bg).setFontColor(sv.fg);
    sh.getRange(r,9).setValue(sv.label).setBackground(s%2===0?C.WHT:C.G50);
    sh.getRange(r,10).setValue(sv.masa).setFontSize(9).setBackground(s%2===0?C.WHT:C.G50);
    sh.getRange(r,11).setValue(sv.jam).setHorizontalAlignment("center").setBackground(s%2===0?C.WHT:C.G50);
  }
  sh.getRange(5,8,CFG.SHIFT_KEYS.length,4).setBorder(true,true,true,true,true,true,C.G200,SpreadsheetApp.BorderStyle.SOLID);

  // ── RULES AUTO FILL (col L-M, row 3-10) ──
  _secLabel(sh, "L3", "🤖  RULES AUTO FILL", C.WARN);
  _tblHdr(sh, "L4:M4", ["Parameter","Nilai"], C.WARN);
  var rulesDef = [
    ["Min Pagi (P) / hari",     2],
    ["Min T.Hari (T) / hari",   1],
    ["Min Malam (M) / hari",    1],
    ["Min OC / hari",           0],
    ["Max hari berturut",       5],
    ["Min OFF / bulan",         4],
  ];
  for (var i = 0; i < rulesDef.length; i++) {
    var r = SETUP.RULES_ROW_START + i;
    sh.getRange(r, SETUP.RULES_COL_LBL).setValue(rulesDef[i][0])
      .setBackground(i%2===0?C.WHT:C.G50).setFontColor(C.G700).setFontSize(9);
    sh.getRange(r, SETUP.RULES_COL_VAL).setValue(rulesDef[i][1])
      .setBackground(i%2===0?C.WHT:C.G50).setFontWeight("bold")
      .setFontColor(C.WARN).setHorizontalAlignment("center");
  }
  sh.getRange(SETUP.RULES_ROW_START, SETUP.RULES_COL_LBL, 6, 2)
    .setBorder(true,true,true,true,true,true,C.G200,SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(11, SETUP.RULES_COL_LBL, 1, 2).merge()
    .setValue("💡 Edit nilai di kolum M untuk tukar rules")
    .setFontStyle("italic").setFontSize(8).setFontColor(C.G400).setBackground(C.WARN_L);
  ss.setNamedRange("RulesConfig", sh.getRange("M5:M10"));

  // ── SENARAI PEKERJA ──
  _secLabel(sh, "A17", "👥  SENARAI PEKERJA — Isikan data di sini (max 60 pekerja)", C.PRI);
  sh.getRange("A18").setValue("⚠️  Selepas tambah/edit pekerja, guna menu › Refresh Semua Tab")
    .setFontStyle("italic").setFontColor(C.WARN).setFontSize(9);

  var pHdr = ["Bil","ID Pekerja","Nama Penuh","Jawatan","Department","Kadar (RM/j)","Status"];
  _tblHdr(sh, "A19:G19", pHdr, C.PRI);
  sh.setRowHeight(19, 32);

  var deptVal = SpreadsheetApp.newDataValidation()
    .requireValueInRange(sh.getRange("D5:D12"), true)
    .setAllowInvalid(false).setHelpText("Pilih department dari senarai").build();
  sh.getRange("E20:E79").setDataValidation(deptVal);

  var statVal = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Aktif","Tidak Aktif","Berhenti","Bercuti Panjang"], true)
    .setAllowInvalid(false).build();
  sh.getRange("G20:G79").setDataValidation(statVal);

  var sample = [
    [1,"EMP001","Ahmad Fauzi bin Abdullah",   "Pengurus Operasi",  "Operasi",    12,"Aktif"],
    [2,"EMP002","Siti Nurhaliza binti Kamal", "Penolong Pengurus", "Operasi",    11,"Aktif"],
    [3,"EMP003","Mohd Rizwan bin Ismail",      "Penyelia Shift",    "Pengeluaran",10,"Aktif"],
    [4,"EMP004","Nurul Ain binti Hamid",       "Operator Kanan",    "Pengeluaran",10,"Aktif"],
    [5,"EMP005","Hafiz bin Azman",             "Teknisi",           "Teknikal",   11,"Aktif"],
  ];
  sh.getRange(20,1,sample.length,7).setValues(sample);

  for (var p = 0; p < sample.length; p++) {
    var r = 20 + p;
    sh.getRange(r,1,1,7).setBackground(p%2===0?C.WHT:C.G50);
    sh.getRange(r,2).setFontFamily("Courier New").setFontColor(C.PRI);
    sh.getRange(r,6).setNumberFormat('"RM"#,##0.00').setFontWeight("bold").setFontColor(C.ACC);
  }
  sh.getRange(20,1,sample.length,7).setBorder(true,true,true,true,true,true,C.G200,SpreadsheetApp.BorderStyle.SOLID);

  for (var r = 20+sample.length; r <= 79; r++) {
    sh.getRange(r,1,1,7).setBackground(r%2===0?C.WHT:C.G50)
      .setBorder(false,true,false,true,false,false,C.G200,SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(r,6).setNumberFormat('"RM"#,##0.00');
  }

  var stRng = sh.getRange("G20:G79");
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Aktif")
      .setBackground("#D1FAE5").setFontColor("#065F46").setRanges([stRng]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Tidak Aktif")
      .setBackground("#FEE2E2").setFontColor("#7F1D1D").setRanges([stRng]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Berhenti")
      .setBackground(C.G100).setFontColor(C.G400).setRanges([stRng]).build(),
  ]);

  sh.getRange("A81").setValue("💡 ID Pekerja: boleh guna format EMP001, nama singkatan, atau nombor kad.")
    .setFontStyle("italic").setFontColor(C.G400).setFontSize(9);

  sh.setColumnWidth(1,40); sh.setColumnWidth(2,90); sh.setColumnWidth(3,220);
  sh.setColumnWidth(4,160); sh.setColumnWidth(5,130); sh.setColumnWidth(6,100); sh.setColumnWidth(7,110);
  sh.setColumnWidth(8,40);
  sh.setColumnWidth(9,120); sh.setColumnWidth(10,160); sh.setColumnWidth(11,60);
  sh.setColumnWidth(12,175); sh.setColumnWidth(13,55);
  sh.setFrozenRows(19);

  ss.setNamedRange("MasterNama",    sh.getRange("C20:C79"));
  ss.setNamedRange("MasterDept",    sh.getRange("E20:E79"));
  ss.setNamedRange("MasterJawatan", sh.getRange("D20:D79"));
  ss.setNamedRange("MasterKadar",   sh.getRange("F20:F79"));
  ss.setNamedRange("MasterStatus",  sh.getRange("G20:G79"));
}

// ═══════════════════════════════════════════════════════
//  TAB: 📅 WEEKLY
// ═══════════════════════════════════════════════════════
function _buatWeekly(ss) {
  var sh = ss.insertSheet("📅 Weekly");
  sh.setTabColor(C.ACC);

  _hdr(sh, "A1:B1", "📅 WEEKLY", C.PRI_D, 11);
  sh.getRange(1,3,1,15).merge()
    .setValue("ROSTER SHIFT MINGGUAN — ROSTER PRO")
    .setBackground(C.PRI).setFontColor(C.WHT)
    .setFontSize(13).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setRowHeight(1, 44);

  sh.getRange("A2:B2").merge().setValue("Minggu:").setBackground(C.G100).setFontWeight("bold").setFontColor(C.G400).setFontSize(9);
  sh.getRange("C2:D2").merge().setValue("—").setBackground(C.WHT).setFontWeight("bold").setFontColor(C.PRI);
  sh.getRange("E2:F2").merge().setValue("Sumber:").setBackground(C.G100).setFontWeight("bold").setFontColor(C.G400).setFontSize(9);
  sh.getRange("G2:H2").merge().setValue("—").setBackground(C.WHT).setFontWeight("bold").setFontColor(C.ACC).setFontSize(9);
  sh.getRange("I2").setValue("Pekerja:").setBackground(C.G100).setFontWeight("bold").setFontColor(C.G400).setFontSize(9);
  sh.getRange("J2").setValue('=COUNTA(\'⚙️ Setup\'!C20:C79)').setBackground(C.WHT).setFontWeight("bold").setFontColor(C.ACC);
  sh.getRange("K2:Q2").merge().setValue("💡 Guna menu Roster Pro › Generate Roster Mingguan")
    .setBackground(C.WARN_L).setFontColor(C.WARN).setFontSize(9).setHorizontalAlignment("center");
  sh.setRowHeight(2, 26);

  var hdrBg = [C.WKD_H,C.PRI,C.PRI,C.PRI,C.PRI,C.PRI,C.WKD_H];
  sh.getRange(3,1).setValue("Nama Pekerja").setBackground(C.PRI).setFontColor(C.WHT).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.getRange(3,2).setValue("Dept").setBackground(C.PRI).setFontColor(C.WHT).setFontWeight("bold").setHorizontalAlignment("center");
  for (var d = 0; d < 7; d++) {
    sh.getRange(3, 3+d*2, 1, 2).merge()
      .setValue(HARI[d]).setBackground(hdrBg[d]).setFontColor(C.WHT)
      .setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
  }
  sh.getRange(3,17).setValue("Jml").setBackground(C.ACC).setFontColor(C.WHT).setFontWeight("bold").setHorizontalAlignment("center");
  sh.setRowHeight(3, 36);

  sh.getRange(4,1,1,2).setBackground(C.G100);
  for (var d = 0; d < 7; d++) {
    var subBg = (d===0||d===6) ? C.WKD_B : C.G100;
    sh.getRange(4,3+d*2).setValue("Shift").setBackground(subBg).setFontWeight("bold").setFontSize(9).setFontColor(C.G700).setHorizontalAlignment("center");
    sh.getRange(4,4+d*2).setValue("Peranan / Masa").setBackground(subBg).setFontWeight("bold").setFontSize(9).setFontColor(C.G700).setHorizontalAlignment("center");
  }
  sh.getRange(4,17).setBackground(C.ACC_L);
  sh.setRowHeight(4, 20);

  sh.getRange("A5:B5").merge().setValue("LEGENDA:").setFontWeight("bold").setFontSize(8).setFontColor(C.G400);
  var col = 3;
  for (var k = 0; k < CFG.SHIFT_KEYS.length; k++) {
    var key = CFG.SHIFT_KEYS[k];
    sh.getRange(5, col).setValue(key + "=" + CFG.SHIFT_INFO[key].label)
      .setBackground(CFG.SHIFT_INFO[key].bg).setFontColor(CFG.SHIFT_INFO[key].fg)
      .setFontSize(8).setHorizontalAlignment("center");
    col++;
  }
  sh.setRowHeight(5, 18);

  sh.setColumnWidth(1, 165); sh.setColumnWidth(2, 80);
  for (var d = 0; d < 7; d++) {
    sh.setColumnWidth(3+d*2, 50);
    sh.setColumnWidth(4+d*2, 110);
  }
  sh.setColumnWidth(17, 45);
  sh.setFrozenRows(5);
}

// ═══════════════════════════════════════════════════════
//  TAB: 🗓️ MONTHLY
// ═══════════════════════════════════════════════════════
function _buatMonthly(ss) {
  var sh = ss.insertSheet("🗓️ Monthly");
  sh.setTabColor(C.PRI);

  _hdr(sh, "A1:C1", "🗓️ MONTHLY", C.PRI_D, 10);
  sh.getRange(1,4,1,35).merge()
    .setValue("ROSTER SHIFT BULANAN — ROSTER PRO")
    .setBackground(C.PRI).setFontColor(C.WHT)
    .setFontSize(13).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setRowHeight(1, 44);

  sh.getRange("A2").setValue("Syarikat:").setBackground(C.G100).setFontWeight("bold").setFontSize(9).setFontColor(C.G400);
  sh.getRange("B2:C2").merge().setFormula("='⚙️ Setup'!B4").setBackground(C.WHT).setFontWeight("bold").setFontColor(C.PRI);
  sh.getRange("D2:F2").merge().setValue("💡 Guna menu Roster Pro › Generate Roster Bulanan")
    .setBackground(C.WARN_L).setFontColor(C.WARN).setFontSize(9).setHorizontalAlignment("center");
  sh.setRowHeight(2, 26);

  sh.getRange(3,1).setValue("Nama Pekerja").setBackground(C.PRI).setFontColor(C.WHT).setFontWeight("bold").setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.getRange(3,2).setValue("Dept").setBackground(C.PRI).setFontColor(C.WHT).setFontWeight("bold").setHorizontalAlignment("center");
  sh.getRange(3,3).setValue("Jawatan").setBackground(C.PRI).setFontColor(C.WHT).setFontWeight("bold").setHorizontalAlignment("center");
  sh.setRowHeight(3, 40);
  sh.setFrozenRows(3);

  sh.setColumnWidth(1, 175); sh.setColumnWidth(2, 95); sh.setColumnWidth(3, 130);

  sh.getRange(4,1,1,3).merge().setValue("LEGENDA SHIFT:").setFontWeight("bold").setFontSize(8).setFontColor(C.G400);
  var col = 4;
  for (var k = 0; k < CFG.SHIFT_KEYS.length; k++) {
    var key = CFG.SHIFT_KEYS[k];
    sh.getRange(4, col).setValue(key).setBackground(CFG.SHIFT_INFO[key].bg).setFontColor(CFG.SHIFT_INFO[key].fg)
      .setFontSize(9).setHorizontalAlignment("center").setFontWeight("bold");
    col++;
    if (col > 38) break;
  }
  sh.setRowHeight(4, 18);
}

// ═══════════════════════════════════════════════════════
//  TAB: 📊 SUMMARY
// ═══════════════════════════════════════════════════════
function _buatSummary(ss) {
  var sh = ss.insertSheet("📊 Summary");
  sh.setTabColor(C.WARN);
  _hdr(sh,"A1:M1","📊  LAPORAN RINGKASAN — JAM KERJA & ANGGARAN GAJI",C.WARN,13);
  sh.setRowHeight(1,44);
  sh.getRange("A2:M2").merge()
    .setValue("⚠️  Klik 'Refresh Summary & Clash' dari menu Roster Pro selepas kemaskini data Setup atau Monthly")
    .setBackground(C.WARN_L).setFontColor("#92400E").setFontSize(9)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setRowHeight(2,24);
  var hdr = ["Bil","ID","Nama Pekerja","Department","P+T+S","Malam M","OFF","AL/MC/EL","Total Kerja","Jam Biasa","Jam OT","Kadar RM/j","Anggaran Gaji"];
  _tblHdr(sh,"A3:M3",hdr,C.WARN);
  sh.setRowHeight(3,34);
  sh.setColumnWidth(1,35); sh.setColumnWidth(2,90); sh.setColumnWidth(3,200);
  sh.setColumnWidth(4,120);
  for (var i=5;i<=13;i++) sh.setColumnWidth(i,80);
  sh.setColumnWidth(13,130);
  sh.setFrozenRows(3);
}

// ═══════════════════════════════════════════════════════
//  TAB: ⚠️ CLASH
// ═══════════════════════════════════════════════════════
function _buatClash(ss) {
  var sh = ss.insertSheet("⚠️ Clash");
  sh.setTabColor(C.DGR);
  _hdr(sh,"A1:G1","⚠️  CLASH DETECTOR — PENGESAN KONFLIK SHIFT",C.DGR,13);
  sh.setRowHeight(1,44);
  sh.getRange("A2:G2").merge()
    .setValue("Semak: pekerja kerja ≥6 hari berturut-turut | Hari rehat kurang | Shift tidak mencukupi")
    .setBackground(C.DGR_L).setFontColor(C.DGR).setFontSize(9).setHorizontalAlignment("center");
  sh.setRowHeight(2,24);
  _secLabel(sh,"A4","🚨  KONFLIK SHIFT (diisi auto bila run Semak Konflik)",C.DGR);
  _tblHdr(sh,"A5:G5",["Nama Pekerja","Department","Hari Berturut","Tarikh Mula","Status","Tahap","Tindakan"],C.DGR);
  sh.setRowHeight(5,30);
  sh.getRange("A6:G6").merge()
    .setValue("— Belum dijalankan. Guna menu Roster Pro › Semak Konflik Shift —")
    .setBackground(C.G100).setFontColor(C.G400).setHorizontalAlignment("center").setFontStyle("italic");
  _secLabel(sh,"A9","📋  RINGKASAN HARI REHAT (dikira dari Monthly)",C.WARN);
  _tblHdr(sh,"A10:E10",["Nama Pekerja","Department","Hari Kerja","Hari Rehat (OFF+AL+MC)","Status"],C.WARN);
  sh.setRowHeight(10,30);
  sh.getRange("A11:E11").merge()
    .setValue("— Run 'Refresh Summary & Clash' untuk populate data —")
    .setBackground(C.G100).setFontColor(C.G400).setHorizontalAlignment("center").setFontStyle("italic");
  sh.setColumnWidth(1,200); sh.setColumnWidth(2,120); sh.setColumnWidth(3,80);
  sh.setColumnWidth(4,140); sh.setColumnWidth(5,120); sh.setColumnWidth(6,80); sh.setColumnWidth(7,130);
  sh.setFrozenRows(5);
}

// ═══════════════════════════════════════════════════════
//  TAB: 📈 DASHBOARD
// ═══════════════════════════════════════════════════════
function _buatDashboard(ss) {
  var sh = ss.insertSheet("📈 Dashboard");
  sh.setTabColor(C.ACC);
  _hdr(sh,"A1:J1","📈  DASHBOARD — ROSTER PRO ANALYTICS",C.PRI,14);
  sh.setRowHeight(1,44);
  _secLabel(sh,"A3","📌  KPI OVERVIEW (auto-update dari Summary & Setup)",C.PRI);
  var kpis = [
    {l:"Pekerja Aktif",    f:"=COUNTIF('⚙️ Setup'!G20:G79,\"Aktif\")",  bg:"#DBEAFE",fg:C.PRI},
    {l:"Total Hari Kerja", f:"=IFERROR(SUM('📊 Summary'!I4:I200),0)",   bg:"#D1FAE5",fg:C.ACC},
    {l:"Total Jam Kerja",  f:"=IFERROR(SUM('📊 Summary'!J4:J200),0)",   bg:"#FEF3C7",fg:"#78350F"},
    {l:"Anggaran Gaji",    f:"=IFERROR(SUM('📊 Summary'!M4:M200),0)",   bg:"#EDE9FE",fg:"#4C1D95"},
    {l:"Hari OT",          f:"=IFERROR(SUMIF('📊 Summary'!K4:K200,\">0\",'📊 Summary'!K4:K200),0)", bg:"#FFEDD5",fg:"#7C2D12"},
  ];
  for (var k = 0; k < kpis.length; k++) {
    var col = 1 + k*2;
    _kpi(sh, 4, col, kpis[k].l, kpis[k].f, kpis[k].bg, kpis[k].fg);
    if (k===3) sh.getRange(5,col,1,2).merge().setNumberFormat('"RM "#,##0');
  }
  sh.getRange("A8:J8").merge()
    .setValue("📊  Charts auto-generate selepas Refresh Summary & Clash. Guna menu › Refresh Summary & Clash untuk kemaskini.")
    .setBackground(C.WARN_L).setFontColor("#92400E").setFontSize(9)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setRowHeight(8,30);
  sh.setColumnWidths(1,2,130);
  sh.setFrozenRows(3);
}

// ═══════════════════════════════════════════════════════
//  GENERATE WEEKLY ROSTER — sync dari Monthly jika ada
// ═══════════════════════════════════════════════════════
function generateWeekly() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("📅 Weekly");
  var setupSh = ss.getSheetByName("⚙️ Setup");
  if (!sh || !setupSh) { _alert("Tab tidak dijumpai. Run initialSetup dulu."); return; }

  var today = new Date();
  var ui = SpreadsheetApp.getUi();
  var resp = ui.prompt("Generate Roster Mingguan",
    "Masukkan tarikh AHAD minggu yang dikehendaki (dd/mm/yyyy):\n(Tekan OK untuk guna minggu semasa: " + _fmtDate(today) + ")",
    ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;

  var inputDate = resp.getResponseText().trim();
  var sunday;
  if (inputDate === "") {
    sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
  } else {
    var parts = inputDate.split("/");
    if (parts.length !== 3) { _alert("Format tarikh tidak sah. Guna dd/mm/yyyy"); return; }
    sunday = new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
  }
  sunday.setHours(0,0,0,0);

  // Cuba sync dari Monthly
  var monthlySh = ss.getSheetByName("🗓️ Monthly");
  var monthInfo = monthlySh ? _getMonthlyInfo(monthlySh) : null;
  var monthDisplay = null;
  var nameRowMap = {};

  if (monthInfo) {
    monthDisplay = monthlySh.getDataRange().getDisplayValues();
    for (var r = 0; r < monthDisplay.length; r++) {
      var a = (monthDisplay[r][0]||"").toString().trim();
      var b = (monthDisplay[r][1]||"").toString().trim();
      var c = (monthDisplay[r][2]||"").toString().trim();
      if (a && b && c) nameRowMap[a] = r;
    }
  }

  var pekData = _getPekerjaAktif(setupSh);
  if (pekData.length === 0) { _alert("Tiada pekerja aktif dalam Setup. Sila isikan data pekerja dahulu."); return; }

  var lastRow = Math.max(sh.getLastRow(), 100);
  if (lastRow >= 6) sh.getRange(6, 1, lastRow - 5, 20).clearContent().clearFormat().clearDataValidations();

  var weekEnd = new Date(sunday); weekEnd.setDate(sunday.getDate() + 6);
  sh.getRange("C2:D2").merge()
    .setValue(_fmtDate(sunday) + " — " + _fmtDate(weekEnd))
    .setBackground(C.WHT).setFontWeight("bold").setFontColor(C.PRI);

  // Tunjuk source (Monthly sync atau standalone)
  var isSynced = false;
  for (var d = 0; d < 7; d++) {
    var tgkTmp = new Date(sunday); tgkTmp.setDate(sunday.getDate() + d);
    if (monthInfo && tgkTmp.getFullYear() === monthInfo.tahun && tgkTmp.getMonth() === monthInfo.bulan) {
      isSynced = true; break;
    }
  }
  sh.getRange("G2:H2").merge()
    .setValue(isSynced ? "✅ Sync dari Monthly (" + BULAN[monthInfo.bulan] + " " + monthInfo.tahun + ")" : "📝 Standalone")
    .setBackground(isSynced ? C.ACC_L : C.G100)
    .setFontColor(isSynced ? C.ACC : C.G400).setFontSize(9).setFontWeight("bold");

  for (var d = 0; d < 7; d++) {
    var tgkHari = new Date(sunday); tgkHari.setDate(sunday.getDate() + d);
    var isWkd = (d === 0 || d === 6);
    sh.getRange(3, 3+d*2, 1, 2).merge()
      .setValue(HARI[d] + "\n" + _padZ(tgkHari.getDate()) + "/" + _padZ(tgkHari.getMonth()+1))
      .setBackground(isWkd ? C.WKD_H : C.PRI)
      .setFontColor(C.WHT).setFontWeight("bold")
      .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  }

  var grouped = _groupByDept(pekData);
  var currentRow = 6;
  var allShiftRanges = [];
  var shiftValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(CFG.SHIFT_KEYS, true).setAllowInvalid(false)
    .setHelpText("Pilih jenis shift").build();

  for (var gi = 0; gi < grouped.length; gi++) {
    var grp = grouped[gi];

    sh.getRange(currentRow, 1, 1, 17).merge()
      .setValue("▶  " + grp.dept.toUpperCase())
      .setBackground(C.PRI_L).setFontColor(C.PRI)
      .setFontWeight("bold").setFontSize(10).setVerticalAlignment("middle");
    sh.setRowHeight(currentRow, 24);
    currentRow++;

    for (var pi = 0; pi < grp.pekerja.length; pi++) {
      var pek = grp.pekerja[pi];
      var rowBg = pi%2===0 ? C.WHT : C.G50;
      var setupRow = pek.setupRow;

      sh.getRange(currentRow, 1)
        .setFormula("='⚙️ Setup'!C" + setupRow)
        .setBackground(rowBg).setFontWeight("bold").setFontSize(9)
        .setVerticalAlignment("middle").setWrap(true);

      sh.getRange(currentRow, 2)
        .setFormula("='⚙️ Setup'!E" + setupRow)
        .setBackground(rowBg).setHorizontalAlignment("center")
        .setFontSize(9).setFontColor(C.G400).setVerticalAlignment("middle");

      for (var d = 0; d < 7; d++) {
        var tgkHari = new Date(sunday); tgkHari.setDate(sunday.getDate() + d);
        var dayOfMonth = tgkHari.getDate();
        var isWkd = (d === 0 || d === 6);
        var col = 3 + d*2;
        var cellBg = isWkd ? C.WKD_B : rowBg;

        // Cuba ambil dari Monthly jika available
        var shiftVal = "";
        var inMonthly = monthInfo &&
          tgkHari.getFullYear() === monthInfo.tahun &&
          tgkHari.getMonth() === monthInfo.bulan;

        if (inMonthly && nameRowMap[pek.nama] !== undefined) {
          var mRow = nameRowMap[pek.nama];
          shiftVal = (monthDisplay[mRow][3 + (dayOfMonth-1)] || "").toString().trim().toUpperCase();
        }

        // Fallback jika tiada data dari Monthly
        if (!shiftVal) shiftVal = isWkd ? "OFF" : "";

        sh.getRange(currentRow, col)
          .setValue(shiftVal)
          .setDataValidation(shiftValidation)
          .setHorizontalAlignment("center").setFontWeight("bold").setFontSize(11)
          .setBackground(cellBg);

        sh.getRange(currentRow, col+1)
          .setFormula("='⚙️ Setup'!D" + setupRow)
          .setFontSize(8).setFontColor(C.G400).setBackground(cellBg)
          .setVerticalAlignment("middle").setWrap(true);

        allShiftRanges.push(sh.getRange(currentRow, col));
      }

      sh.getRange(currentRow, 17)
        .setFormula('=COUNTIF(C'+currentRow+':O'+currentRow+',"P")+COUNTIF(C'+currentRow+':O'+currentRow+',"T")+COUNTIF(C'+currentRow+':O'+currentRow+',"M")+COUNTIF(C'+currentRow+':O'+currentRow+',"S")+COUNTIF(C'+currentRow+':O'+currentRow+',"OT")+COUNTIF(C'+currentRow+':O'+currentRow+',"OC")')
        .setHorizontalAlignment("center").setFontWeight("bold")
        .setFontColor(C.ACC).setBackground(C.ACC_L);

      sh.setRowHeight(currentRow, 36);
      currentRow++;
    }

    sh.getRange(currentRow, 1, 1, 2).merge()
      .setValue("Pekerja dept ini: " + grp.pekerja.length)
      .setBackground(C.ACC_L).setFontColor(C.ACC).setFontWeight("bold")
      .setFontSize(9).setHorizontalAlignment("right");
    sh.setRowHeight(currentRow, 20);
    currentRow++;
  }

  _applyShiftCF(sh, allShiftRanges);
  ss.setActiveSheet(sh);

  var srcMsg = isSynced
    ? "✅ Data diambil dari Monthly (" + BULAN[monthInfo.bulan] + " " + monthInfo.tahun + ").\nSebarang perubahan di Monthly akan reflect bila generate semula."
    : "📝 Standalone roster (Monthly belum digenerate untuk minggu ini).";

  _alert("✅ Roster Mingguan berjaya digenerate!\n\nMinggu: " + _fmtDate(sunday) + " — " + _fmtDate(weekEnd) + "\nPekerja: " + pekData.length + "\n\n" + srcMsg);
}

// ═══════════════════════════════════════════════════════
//  GENERATE MONTHLY ROSTER
//  Weekday cells start EMPTY — user lock manual, then Auto Fill
// ═══════════════════════════════════════════════════════
function generateMonthly() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("🗓️ Monthly");
  var setupSh = ss.getSheetByName("⚙️ Setup");
  if (!sh || !setupSh) { _alert("Tab tidak dijumpai."); return; }

  var ui = SpreadsheetApp.getUi();
  var today = new Date();

  var resp = ui.prompt("Generate Roster Bulanan",
    "Masukkan bulan dan tahun (format: mm/yyyy)\nContoh: 05/2026\n(Kosongkan untuk bulan semasa: " + _padZ(today.getMonth()+1) + "/" + today.getFullYear() + ")",
    ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;

  var input = resp.getResponseText().trim();
  var bulan, tahun;
  if (input === "") {
    bulan = today.getMonth();
    tahun = today.getFullYear();
  } else {
    var parts = input.split("/");
    if (parts.length !== 2) { _alert("Format tidak sah. Guna mm/yyyy"); return; }
    bulan = parseInt(parts[0]) - 1;
    tahun = parseInt(parts[1]);
    if (isNaN(bulan) || isNaN(tahun) || bulan < 0 || bulan > 11) { _alert("Bulan atau tahun tidak sah."); return; }
  }

  var hari = new Date(tahun, bulan+1, 0).getDate();
  var pekData = _getPekerjaAktif(setupSh);
  if (pekData.length === 0) { _alert("Tiada pekerja aktif. Sila isikan data di Setup dahulu."); return; }

  var lastRow = Math.max(sh.getLastRow(), 150);
  if (lastRow >= 5) sh.getRange(5, 1, lastRow-4, 4+hari+6).clearContent().clearFormat().clearDataValidations();

  sh.getRange(1,4,1,hari+6).merge()
    .setValue("ROSTER SHIFT BULANAN — " + BULAN[bulan].toUpperCase() + " " + tahun + "   |   ROSTER PRO")
    .setBackground(C.PRI).setFontColor(C.WHT).setFontSize(13).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.getRange("B2:C2").merge().setFormula("='⚙️ Setup'!B4").setBackground(C.WHT).setFontWeight("bold").setFontColor(C.PRI);
  sh.getRange("D2").setValue(BULAN[bulan] + " " + tahun).setFontWeight("bold").setFontColor(C.ACC).setBackground(C.ACC_L);

  // Row 3: header tarikh
  for (var d = 1; d <= hari; d++) {
    var tgkHari = new Date(tahun, bulan, d);
    var dayIdx = tgkHari.getDay();
    var isWkd = (dayIdx === 0 || dayIdx === 6);
    var col = 3 + d;
    sh.getRange(3, col)
      .setValue(_padZ(d) + "\n" + HARI_S[dayIdx])
      .setBackground(isWkd ? C.WKD_H : C.PRI)
      .setFontColor(C.WHT).setFontWeight("bold")
      .setHorizontalAlignment("center").setVerticalAlignment("middle")
      .setFontSize(9).setWrap(true);
    sh.setColumnWidth(col, 34);
  }

  var sCol = 4 + hari;
  var sumHdrs = [["P+T+S",C.ACC],["Malam",C.PRI],["OFF",C.G700],["AL/MC",C.DGR],["Jam",C.PRI_D]];
  for (var s = 0; s < sumHdrs.length; s++) {
    sh.getRange(3, sCol+s).setValue(sumHdrs[s][0])
      .setBackground(sumHdrs[s][1]).setFontColor(C.WHT)
      .setFontWeight("bold").setHorizontalAlignment("center").setFontSize(9);
    sh.setColumnWidth(sCol+s, 48);
  }

  var shiftVal = SpreadsheetApp.newDataValidation()
    .requireValueInList(CFG.SHIFT_KEYS, true).setAllowInvalid(false)
    .setHelpText("Pilih shift").build();

  var grouped = _groupByDept(pekData);
  var currentRow = 5;
  var allCfRanges = [];

  for (var gi = 0; gi < grouped.length; gi++) {
    var grp = grouped[gi];

    sh.getRange(currentRow, 1, 1, 3+hari+5).merge()
      .setValue("  ▶  " + grp.dept.toUpperCase())
      .setBackground(C.PRI_L).setFontColor(C.PRI)
      .setFontWeight("bold").setFontSize(9).setVerticalAlignment("middle");
    sh.setRowHeight(currentRow, 22);
    currentRow++;

    for (var pi = 0; pi < grp.pekerja.length; pi++) {
      var pek = grp.pekerja[pi];
      var rowBg = pi%2===0 ? C.WHT : C.G50;
      var setupRow = pek.setupRow;

      sh.getRange(currentRow, 1)
        .setFormula("='⚙️ Setup'!C" + setupRow)
        .setBackground(rowBg).setFontWeight("bold").setFontSize(9).setVerticalAlignment("middle");

      sh.getRange(currentRow, 2)
        .setFormula("='⚙️ Setup'!E" + setupRow)
        .setBackground(rowBg).setHorizontalAlignment("center")
        .setFontSize(8).setFontColor(C.G400);

      sh.getRange(currentRow, 3)
        .setFormula("='⚙️ Setup'!D" + setupRow)
        .setBackground(rowBg).setFontSize(8).setFontColor(C.G400);

      for (var d = 1; d <= hari; d++) {
        var tgkHari = new Date(tahun, bulan, d);
        var dayIdx = tgkHari.getDay();
        var isWkd = (dayIdx===0||dayIdx===6);
        var col = 3 + d;
        var cellBg = isWkd ? C.WKD_B : rowBg;

        // Weekend = OFF, weekday = KOSONG (untuk Auto Fill)
        sh.getRange(currentRow, col)
          .setValue(isWkd ? "OFF" : "")
          .setDataValidation(shiftVal)
          .setHorizontalAlignment("center").setFontWeight("bold").setFontSize(10)
          .setBackground(cellBg);

        allCfRanges.push(sh.getRange(currentRow, col));
      }

      var sC = columnLetter(4);
      var eC = columnLetter(3+hari);
      var rr = currentRow;

      sh.getRange(rr, sCol).setFormula(
        '=COUNTIF('+sC+rr+':'+eC+rr+',"P")+COUNTIF('+sC+rr+':'+eC+rr+',"T")+COUNTIF('+sC+rr+':'+eC+rr+',"S")+COUNTIF('+sC+rr+':'+eC+rr+',"OT")')
        .setHorizontalAlignment("center").setFontWeight("bold").setBackground(C.ACC_L).setFontColor(C.ACC);

      sh.getRange(rr, sCol+1).setFormula('=COUNTIF('+sC+rr+':'+eC+rr+',"M")')
        .setHorizontalAlignment("center").setFontWeight("bold").setBackground("#EFF6FF").setFontColor(C.PRI);

      sh.getRange(rr, sCol+2).setFormula('=COUNTIF('+sC+rr+':'+eC+rr+',"OFF")')
        .setHorizontalAlignment("center").setFontWeight("bold").setBackground(C.G100).setFontColor(C.G700);

      sh.getRange(rr, sCol+3).setFormula(
        '=COUNTIF('+sC+rr+':'+eC+rr+',"AL")+COUNTIF('+sC+rr+':'+eC+rr+',"MC")+COUNTIF('+sC+rr+':'+eC+rr+',"EL")')
        .setHorizontalAlignment("center").setFontWeight("bold").setBackground(C.DGR_L).setFontColor(C.DGR);

      sh.getRange(rr, sCol+4).setFormula(
        '=('+columnLetter(sCol)+rr+'+'+columnLetter(sCol+1)+rr+')*\'⚙️ Setup\'!$B$9')
        .setHorizontalAlignment("center").setFontWeight("bold").setBackground(C.PRI_L).setFontColor(C.PRI);

      sh.setRowHeight(currentRow, 26);
      currentRow++;
    }
  }

  _applyShiftCF(sh, allCfRanges);

  var totalRange = sh.getRange(5, sCol, currentRow-5, 1);
  var existRules = sh.getConditionalFormatRules() || [];
  existRules.push(
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(20)
      .setBackground("#FEE2E2").setFontColor("#7F1D1D").setRanges([totalRange]).build()
  );
  sh.setConditionalFormatRules(existRules);

  _refreshSummary(ss, bulan, tahun, hari, sCol);
  _refreshClash(ss, hari);

  ss.setActiveSheet(sh);
  _alert(
    "✅ Roster " + BULAN[bulan] + " " + tahun + " berjaya digenerate!\n\n" +
    "Pekerja: " + pekData.length + "  |  Bilangan hari: " + hari + "\n\n" +
    "📝 WEEKDAY cells sengaja dikosongkan.\n" +
    "   Isi cells yang nak LOCK dulu (contoh: Amin Rabu = P)\n" +
    "   Kemudian guna menu › 🤖 Auto Fill Roster\n\n" +
    "✅ Summary & Clash turut dikemaskini."
  );
}

// ═══════════════════════════════════════════════════════
//  AUTO FILL ROSTER — isi sel kosong berdasarkan rules
// ═══════════════════════════════════════════════════════
function autoFillRoster() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("🗓️ Monthly");
  var setupSh = ss.getSheetByName("⚙️ Setup");
  if (!sh || !setupSh) { _alert("Tab tidak dijumpai."); return; }

  var info = _getMonthlyInfo(sh);
  if (!info) {
    _alert("⚠️ Roster belum digenerate.\n\nGuna menu › Generate Roster Bulanan dahulu sebelum Auto Fill.");
    return;
  }

  var hari = info.hari;
  var rules = _getRules(setupSh);
  var pekData = _getPekerjaAktif(setupSh);
  if (!pekData.length) { _alert("Tiada pekerja aktif dalam Setup."); return; }

  var monthDisplay = sh.getDataRange().getDisplayValues();

  // Bina nameRowMap (skip dept separator rows)
  var nameRowMap = {};
  for (var r = 0; r < monthDisplay.length; r++) {
    var a = (monthDisplay[r][0]||"").toString().trim();
    var b = (monthDisplay[r][1]||"").toString().trim();
    var c = (monthDisplay[r][2]||"").toString().trim();
    if (a && b && c) nameRowMap[a] = r;
  }

  var IDX = 3; // shift start index dalam array (kolum D = index 3)
  var WORK_SET = {P:1,T:1,M:1,S:1,OT:1,OC:1};

  // Bina shift matrix per employee (0-indexed days)
  var shifts = [];     // shifts[p][d] = nilai shift ("" = kosong = boleh fill)
  var sheetRows = [];  // 1-indexed sheet row untuk setiap employee

  for (var p = 0; p < pekData.length; p++) {
    var mRow = nameRowMap[pekData[p].nama];
    sheetRows.push(mRow !== undefined ? mRow + 1 : null);
    var row = [];
    for (var d = 0; d < hari; d++) {
      if (mRow !== undefined) {
        var v = (monthDisplay[mRow][IDX + d]||"").toString().trim().toUpperCase();
        row.push(v);
      } else {
        row.push("");
      }
    }
    shifts.push(row);
  }

  // ── ALGORITHM: greedy day-by-day ──
  for (var d = 0; d < hari; d++) {
    var tgkHari = new Date(info.tahun, info.bulan, d + 1);
    var dayOfWeek = tgkHari.getDay();
    var isWkd = (dayOfWeek === 0 || dayOfWeek === 6);

    // Kira existing assignments untuk hari ini
    var cntP = 0, cntT = 0, cntM = 0;
    var emptyIdxs = [];

    for (var p = 0; p < pekData.length; p++) {
      var v = shifts[p][d];
      if (v === "") {
        if (sheetRows[p] !== null) emptyIdxs.push(p);
      } else if (v === "P" || v === "S") { cntP++; }
        else if (v === "T") { cntT++; }
        else if (v === "M") { cntM++; }
    }

    if (emptyIdxs.length === 0) continue;

    // Tentukan shift yang diperlukan
    var needed = [];
    for (var n = 0; n < Math.max(0, rules.minP - cntP); n++) needed.push("P");
    for (var n = 0; n < Math.max(0, rules.minT - cntT); n++) needed.push("T");
    for (var n = 0; n < Math.max(0, rules.minM - cntM); n++) needed.push("M");

    // Sort: pekerja dengan hari kerja paling sikit dapat prioriti (fairness)
    emptyIdxs.sort(function(a, b) {
      return _calcWorkCount(shifts[a], d) - _calcWorkCount(shifts[b], d);
    });

    var ni = 0;
    for (var ei = 0; ei < emptyIdxs.length; ei++) {
      var p = emptyIdxs[ei];
      var streak = _calcStreak(shifts[p], d);
      var offCount = _calcOffCount(shifts[p], d);
      var daysLeft = hari - d; // termasuk hari ini
      var offNeeded = Math.max(0, rules.minOff - offCount);

      // Perlu rehat jika:
      // 1. Dah kerja maxConsecutive hari berturut
      // 2. Hari yang tinggal ≤ OFF yang perlu (mesti jimat untuk OFF)
      // 3. Hari minggu/weekend
      var mustRest = isWkd ||
        streak >= rules.maxConsecutive ||
        daysLeft <= offNeeded;

      if (mustRest) {
        shifts[p][d] = isWkd ? "OFF" : "OFF";
      } else if (ni < needed.length) {
        shifts[p][d] = needed[ni++];
      } else {
        // Tiada shift khusus diperlukan — bagi kerja atau rehat ikut baki hari
        var workCount = _calcWorkCount(shifts[p], d);
        var expectedWork = Math.round(hari * 5 / 7); // ~71% hari kerja
        shifts[p][d] = workCount < expectedWork ? "P" : "OFF";
      }
    }
  }

  // ── TULIS semula ke sheet — batch per employee row ──
  var shiftValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(CFG.SHIFT_KEYS, true).setAllowInvalid(false)
    .setHelpText("Pilih shift").build();

  var filledCount = 0;
  var changedCells = [];

  for (var p = 0; p < pekData.length; p++) {
    var shRow = sheetRows[p];
    if (shRow === null) continue;

    var rowVals = [];
    var hasChange = false;

    for (var d = 0; d < hari; d++) {
      var orig = (monthDisplay[shRow-1][IDX+d]||"").toString().trim();
      var newVal = shifts[p][d];
      rowVals.push(newVal);
      if (orig === "" && newVal !== "") { hasChange = true; filledCount++; }
    }

    if (hasChange) {
      sh.getRange(shRow, IDX+1, 1, hari).setValues([rowVals]);
    }
  }

  _alert(
    "✅ Auto Fill selesai!\n\n" +
    "Bulan: " + BULAN[info.bulan] + " " + info.tahun + "\n" +
    "Pekerja diproses: " + pekData.length + "\n" +
    "Sel diisi: " + filledCount + "\n\n" +
    "Rules digunakan:\n" +
    "  • Min Pagi: " + rules.minP + " staff/hari\n" +
    "  • Min T.Hari: " + rules.minT + " staff/hari\n" +
    "  • Min Malam: " + rules.minM + " staff/hari\n" +
    "  • Max berturut: " + rules.maxConsecutive + " hari\n" +
    "  • Min OFF: " + rules.minOff + " hari/bulan\n\n" +
    "💡 Sel yang sudah diisi manual sebelum Auto Fill dikekalkan."
  );
}

// ═══════════════════════════════════════════════════════
//  REFRESH SUMMARY
// ═══════════════════════════════════════════════════════
function _refreshSummary(ss, bulan, tahun, hari, sCol) {
  var sh = ss.getSheetByName("📊 Summary");
  var setupSh = ss.getSheetByName("⚙️ Setup");
  if (!sh || !setupSh) return;

  var lastRow = Math.max(sh.getLastRow(), 100);
  if (lastRow >= 4) sh.getRange(4, 1, lastRow-3, 13).clearContent().clearFormat();

  sh.getRange("A1:M1").merge()
    .setValue("📊  LAPORAN RINGKASAN — " + BULAN[bulan].toUpperCase() + " " + tahun + " — JAM KERJA & ANGGARAN GAJI")
    .setBackground(C.WARN).setFontColor(C.WHT).setFontSize(13).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");

  var pekData = _getPekerjaAktif(setupSh);
  var grouped = _groupByDept(pekData);
  var currentRow = 4;
  var bil = 0;

  for (var gi = 0; gi < grouped.length; gi++) {
    var grp = grouped[gi];

    sh.getRange(currentRow, 1, 1, 13).merge()
      .setValue("  ▶  " + grp.dept.toUpperCase())
      .setBackground(C.PRI_L).setFontColor(C.PRI).setFontWeight("bold").setFontSize(9);
    sh.setRowHeight(currentRow, 20);
    currentRow++;

    for (var pi = 0; pi < grp.pekerja.length; pi++) {
      var pek = grp.pekerja[pi];
      bil++;
      var setupRow = pek.setupRow;
      var rowBg = bil%2===0 ? C.WHT : C.G50;
      var mSh = "'🗓️ Monthly'";

      sh.getRange(currentRow, 1).setValue(bil).setBackground(rowBg).setHorizontalAlignment("center");

      sh.getRange(currentRow, 2).setFormula("='⚙️ Setup'!B"+setupRow)
        .setBackground(rowBg).setFontFamily("Courier New").setFontColor(C.PRI).setFontSize(9);
      sh.getRange(currentRow, 3).setFormula("='⚙️ Setup'!C"+setupRow)
        .setBackground(rowBg).setFontWeight("bold");
      sh.getRange(currentRow, 4).setFormula("='⚙️ Setup'!E"+setupRow)
        .setBackground(rowBg).setFontSize(9).setFontColor(C.G400);

      var nameRef = "\'⚙️ Setup\'!C"+setupRow;
      var mRange = mSh+"!A:"+columnLetter(sCol+4);
      sh.getRange(currentRow, 5)
        .setFormula('=IFERROR(VLOOKUP('+nameRef+','+mRange+','+sCol+',0),0)')
        .setBackground(rowBg).setHorizontalAlignment("center").setFontWeight("bold").setFontColor(C.ACC);
      sh.getRange(currentRow, 6)
        .setFormula('=IFERROR(VLOOKUP('+nameRef+','+mRange+','+(sCol+1)+',0),0)')
        .setBackground(rowBg).setHorizontalAlignment("center").setFontWeight("bold").setFontColor(C.PRI);
      sh.getRange(currentRow, 7)
        .setFormula('=IFERROR(VLOOKUP('+nameRef+','+mRange+','+(sCol+2)+',0),0)')
        .setBackground(rowBg).setHorizontalAlignment("center").setFontColor(C.G700);
      sh.getRange(currentRow, 8)
        .setFormula('=IFERROR(VLOOKUP('+nameRef+','+mRange+','+(sCol+3)+',0),0)')
        .setBackground(rowBg).setHorizontalAlignment("center").setFontColor(C.DGR);
      sh.getRange(currentRow, 9)
        .setFormula('=E'+currentRow+'+F'+currentRow)
        .setBackground(rowBg).setHorizontalAlignment("center").setFontWeight("bold");

      sh.getRange(currentRow,10)
        .setFormula('=MIN(I'+currentRow+'*\'⚙️ Setup\'!$B$9,\'⚙️ Setup\'!$B$10)')
        .setBackground(rowBg).setHorizontalAlignment("center");
      sh.getRange(currentRow,11)
        .setFormula('=MAX(0,I'+currentRow+'*\'⚙️ Setup\'!$B$9-\'⚙️ Setup\'!$B$10)')
        .setBackground(rowBg).setHorizontalAlignment("center").setFontColor(C.WARN).setFontWeight("bold");
      sh.getRange(currentRow,12)
        .setFormula("='⚙️ Setup'!F"+setupRow)
        .setBackground(rowBg).setHorizontalAlignment("center").setNumberFormat('"RM"#,##0.00');
      sh.getRange(currentRow,13)
        .setFormula('=(J'+currentRow+'*L'+currentRow+')+(K'+currentRow+'*\'⚙️ Setup\'!$B$8)')
        .setBackground(rowBg).setHorizontalAlignment("center")
        .setFontWeight("bold").setFontColor(C.PRI).setNumberFormat('"RM"#,##0.00');

      sh.setRowHeight(currentRow, 24);
      currentRow++;
    }
  }

  sh.getRange(currentRow, 3).setValue("JUMLAH").setFontWeight("bold").setBackground(C.WARN).setFontColor(C.WHT);
  for (var col = 5; col <= 13; col++) {
    sh.getRange(currentRow, col)
      .setFormula('=SUM('+columnLetter(col)+'4:'+columnLetter(col)+(currentRow-1)+')')
      .setFontWeight("bold").setBackground(C.WARN).setFontColor(C.WHT);
    if (col === 12 || col === 13) sh.getRange(currentRow, col).setNumberFormat('"RM"#,##0.00');
  }
  sh.setRowHeight(currentRow, 28);

  var otRng = sh.getRange(4, 11, currentRow-4, 1);
  var totalRng = sh.getRange(4, 9, currentRow-4, 1);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0)
      .setBackground("#FEF3C7").setFontColor("#92400E").setRanges([otRng]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(20)
      .setBackground("#FEE2E2").setFontColor("#7F1D1D").setRanges([totalRng]).build(),
  ]);
}

// ═══════════════════════════════════════════════════════
//  REFRESH CLASH
// ═══════════════════════════════════════════════════════
function _refreshClash(ss, hari) {
  var sh = ss.getSheetByName("⚠️ Clash");
  var monthlySh = ss.getSheetByName("🗓️ Monthly");
  var setupSh = ss.getSheetByName("⚙️ Setup");
  if (!sh || !monthlySh || !setupSh) return;

  var lastRow = Math.max(sh.getLastRow(), 150);
  if (lastRow >= 11) sh.getRange(11, 1, lastRow-10, 6).clearContent().clearFormat();

  var pekData = _getPekerjaAktif(setupSh);
  if (pekData.length === 0) return;

  var monthDisplay = monthlySh.getDataRange().getDisplayValues();

  var nameRowMap = {};
  for (var r = 0; r < monthDisplay.length; r++) {
    var colA = (monthDisplay[r][0] || "").trim();
    var colB = (monthDisplay[r][1] || "").trim();
    var colC = (monthDisplay[r][2] || "").trim();
    if (colA !== "" && colB !== "" && colC !== "") nameRowMap[colA] = r;
  }

  var SHIFT_START_IDX = 3;
  var currentRow = 11;

  for (var p = 0; p < pekData.length; p++) {
    var pek = pekData[p];
    var rowBg = p % 2 === 0 ? C.WHT : C.G50;
    var mRow = nameRowMap[pek.nama];

    var hariKerja = 0, hariRehat = 0;

    if (mRow !== undefined) {
      for (var d = 0; d < hari; d++) {
        var v = (monthDisplay[mRow][SHIFT_START_IDX + d] || "").trim().toUpperCase();
        var isKerja = (v==="P"||v==="T"||v==="M"||v==="S"||v==="OT"||v==="OC");
        if (isKerja) hariKerja++;
        else hariRehat++;
      }
    }

    sh.getRange(currentRow,1).setFormula("='⚙️ Setup'!C"+pek.setupRow)
      .setBackground(rowBg).setFontSize(9).setVerticalAlignment("middle");
    sh.getRange(currentRow,2).setFormula("='⚙️ Setup'!E"+pek.setupRow)
      .setBackground(rowBg).setFontSize(9).setHorizontalAlignment("center");
    sh.getRange(currentRow,3).setValue(mRow !== undefined ? hariKerja : "—")
      .setBackground(rowBg).setHorizontalAlignment("center").setFontWeight("bold");
    sh.getRange(currentRow,4).setValue(mRow !== undefined ? hariRehat : "—")
      .setBackground(rowBg).setHorizontalAlignment("center");

    var statusRehat;
    if (mRow === undefined) {
      statusRehat = "⚠️ Tiada data roster";
    } else if (hariRehat >= 4) {
      statusRehat = "✅ Mencukupi";
    } else {
      statusRehat = "⚠️ Kurang Rehat (" + hariRehat + " hari)";
    }
    sh.getRange(currentRow,5).setValue(statusRehat)
      .setBackground(rowBg).setHorizontalAlignment("center").setFontWeight("bold");

    sh.setRowHeight(currentRow, 24);
    currentRow++;
  }

  var stRng = sh.getRange(11, 5, Math.max(1, currentRow-11), 1);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextContains("Mencukupi")
      .setBackground("#D1FAE5").setFontColor("#065F46").setRanges([stRng]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains("Kurang")
      .setBackground("#FEE2E2").setFontColor("#7F1D1D").setRanges([stRng]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains("Tiada data")
      .setBackground("#FEF3C7").setFontColor("#92400E").setRanges([stRng]).build(),
  ]);
}

// ═══════════════════════════════════════════════════════
//  SEMAK KONFLIK
// ═══════════════════════════════════════════════════════
function semakKonflik() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var monthlySh = ss.getSheetByName("🗓️ Monthly");
  var clashSh = ss.getSheetByName("⚠️ Clash");
  var setupSh = ss.getSheetByName("⚙️ Setup");
  if (!monthlySh || !clashSh) { _alert("Tab Monthly atau Clash tidak dijumpai."); return; }

  var hdrRow = monthlySh.getRange(3, 4, 1, 35).getDisplayValues()[0];
  var hari = 0;
  for (var h = 0; h < hdrRow.length; h++) {
    if (hdrRow[h] && hdrRow[h].trim() !== "" && !isNaN(parseInt(hdrRow[h]))) hari++;
    else if (hari > 0) break;
  }
  if (hari === 0) {
    _alert("⚠️ Roster belum digenerate.\n\nSila guna menu › Generate Roster Bulanan dahulu.");
    return;
  }

  var pekData = _getPekerjaAktif(setupSh);
  if (pekData.length === 0) { _alert("Tiada pekerja aktif dalam Setup."); return; }

  var monthDisplay = monthlySh.getDataRange().getDisplayValues();

  var nameRowMap = {};
  for (var r = 0; r < monthDisplay.length; r++) {
    var a = (monthDisplay[r][0] || "").trim();
    var b = (monthDisplay[r][1] || "").trim();
    var c = (monthDisplay[r][2] || "").trim();
    if (a !== "" && b !== "" && c !== "") nameRowMap[a] = r;
  }

  var SHIFT_IDX = 3;
  var SHIFT_KERJA = {P:1,T:1,M:1,S:1,OT:1,OC:1};

  var konflikList = [];

  for (var p = 0; p < pekData.length; p++) {
    var pek = pekData[p];
    var mRow = nameRowMap[pek.nama];
    if (mRow === undefined) continue;

    var shiftPerHari = [];
    for (var d = 0; d < hari; d++) {
      var v = (monthDisplay[mRow][SHIFT_IDX + d] || "").trim().toUpperCase();
      shiftPerHari.push(v);
    }

    var maxConseq = 0, conseq = 0, startDay = 0, maxStartDay = 0;
    for (var d = 0; d < shiftPerHari.length; d++) {
      if (SHIFT_KERJA[shiftPerHari[d]] === 1) {
        if (conseq === 0) startDay = d + 1;
        conseq++;
        if (conseq > maxConseq) { maxConseq = conseq; maxStartDay = startDay; }
      } else {
        conseq = 0;
      }
    }

    if (maxConseq >= 6) {
      konflikList.push({
        nama: pek.nama,
        dept: pek.dept,
        setupRow: pek.setupRow,
        maxConseq: maxConseq,
        startDay: maxStartDay,
        endDay: maxStartDay + maxConseq - 1,
        tahap: maxConseq >= 8 ? "🔴 Kritikal" : "🟡 Amaran",
      });
    }
  }

  clashSh.getRange(6, 1, 5, 7).clearContent().clearFormat().setBackground(C.WHT);

  if (konflikList.length === 0) {
    clashSh.getRange("A6:G6").merge()
      .setValue("✅  Tiada konflik ≥6 hari berturut dijumpai. Semua pekerja mempunyai hari rehat yang mencukupi.")
      .setBackground("#D1FAE5").setFontColor("#065F46").setFontWeight("bold")
      .setHorizontalAlignment("center").setVerticalAlignment("middle");
    clashSh.setRowHeight(6, 32);
  } else {
    for (var c = 0; c < Math.min(konflikList.length, 5); c++) {
      var k = konflikList[c];
      clashSh.getRange(6+c, 1, 1, 7).setValues([[
        k.nama, k.dept, k.maxConseq + " hari",
        "Hari " + k.startDay + " – " + k.endDay,
        "⚠️ KONFLIK", k.tahap, "Tambah OFF/rehat"
      ]]);
      clashSh.getRange(6+c, 5).setBackground("#FEE2E2").setFontColor(C.DGR).setFontWeight("bold");
      clashSh.getRange(6+c, 6).setBackground(
        k.tahap.includes("Kritikal") ? "#FEE2E2" : "#FEF3C7"
      ).setFontColor(k.tahap.includes("Kritikal") ? C.DGR : "#92400E").setFontWeight("bold");
      clashSh.setRowHeight(6+c, 26);
    }
    if (konflikList.length > 5) {
      clashSh.getRange("A11:G11").merge()
        .setValue("... dan " + (konflikList.length-5) + " konflik lagi. Semak tab Monthly secara manual.")
        .setBackground("#FEF3C7").setFontColor("#92400E").setFontSize(9)
        .setHorizontalAlignment("center");
    }
  }

  ss.setActiveSheet(clashSh);

  var msg = "✅ Semakan konflik selesai!\n\nBulan ini (" + hari + " hari)\nPekerja diperiksa: " + pekData.length + "\nKonflik dijumpai: " + konflikList.length + "\n\n";
  if (konflikList.length > 0) {
    msg += "Senarai konflik:\n";
    for (var c = 0; c < konflikList.length; c++) {
      msg += "• " + konflikList[c].nama + " — " + konflikList[c].maxConseq + " hari berturut (Hari " + konflikList[c].startDay + "-" + konflikList[c].endDay + ")\n";
    }
  } else {
    msg += "Semua pekerja OK! 🎉";
  }
  _alert(msg);
}

// ═══════════════════════════════════════════════════════
//  REFRESH SEMUA TAB
// ═══════════════════════════════════════════════════════
function refreshSemuaTab() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var setupSh = ss.getSheetByName("⚙️ Setup");
  var monthlySh = ss.getSheetByName("🗓️ Monthly");
  if (!setupSh) { _alert("Tab Setup tidak dijumpai."); return; }

  var bulan, tahun, hari;
  try {
    var infoVal = monthlySh.getRange("D2").getValue().toString();
    var parts = infoVal.split(" ");
    var bIdx = BULAN.indexOf(parts[0]);
    bulan = bIdx >= 0 ? bIdx : new Date().getMonth();
    tahun = parseInt(parts[1]) || new Date().getFullYear();
  } catch(e) {
    bulan = new Date().getMonth();
    tahun = new Date().getFullYear();
  }
  hari = new Date(tahun, bulan+1, 0).getDate();
  var sCol = 4 + hari;

  _refreshSummary(ss, bulan, tahun, hari, sCol);
  _refreshClash(ss, hari);
  _refreshDashboard(ss);

  _alert("✅ Summary, Clash & Dashboard berjaya dikemaskini!\n\n" +
    "Nota: Nama & department dalam roster adalah FORMULA dari Setup.\n" +
    "Perubahan di Setup akan auto-reflect tanpa perlu refresh.");
}

// ═══════════════════════════════════════════════════════
//  REFRESH DASHBOARD — generate charts
// ═══════════════════════════════════════════════════════
function _refreshDashboard(ss) {
  var sh = ss.getSheetByName("📈 Dashboard");
  var sumSh = ss.getSheetByName("📊 Summary");
  if (!sh || !sumSh) return;

  // Buang semua chart lama
  var existing = sh.getCharts();
  for (var i = 0; i < existing.length; i++) sh.removeChart(existing[i]);

  var lastSumRow = sumSh.getLastRow();
  if (lastSumRow < 4) return;

  // Kira totals dari Summary (kolum E=5 P+T+S, F=6 Malam, G=7 OFF, H=8 AL/MC/EL)
  var sumData = sumSh.getRange(4, 5, lastSumRow - 3, 4).getValues();
  var totP = 0, totM = 0, totOFF = 0, totAL = 0;
  for (var r = 0; r < sumData.length; r++) {
    totP   += Number(sumData[r][0]) || 0;
    totM   += Number(sumData[r][1]) || 0;
    totOFF += Number(sumData[r][2]) || 0;
    totAL  += Number(sumData[r][3]) || 0;
  }

  // ── Data block 1: Shift distribution (row 10-15, col A-B) ──
  var pieData = [
    ["Jenis Shift","Hari"],
    ["Pagi/Tgh/Split", totP],
    ["Malam",          totM],
    ["Hari Rehat",     totOFF],
    ["AL/MC/EL",       totAL],
  ];
  sh.getRange(10,1,5,2).setValues(pieData);
  sh.getRange(10,1,1,2).setBackground(C.PRI).setFontColor(C.WHT).setFontWeight("bold").setHorizontalAlignment("center");
  sh.getRange(11,1,4,1).setBackground(C.G50).setFontSize(9);
  sh.getRange(11,2,4,1).setBackground(C.G50).setHorizontalAlignment("center").setFontWeight("bold");
  sh.getRange(10,1,5,2).setBorder(true,true,true,true,true,true,C.G200,SpreadsheetApp.BorderStyle.SOLID);
  _secLabel(sh, "A9", "📊  Agihan Shift (bulan semasa)", C.PRI);

  // Pie chart
  try {
    var chart1 = sh.newChart()
      .setChartType(Charts.ChartType.PIE)
      .addRange(sh.getRange(10,1,5,2))
      .setPosition(9, 3, 10, 0)
      .setOption("title", "Agihan Jenis Shift")
      .setOption("width", 380)
      .setOption("height", 260)
      .setOption("legend", {position: "right"})
      .build();
    sh.insertChart(chart1);
  } catch(e) {}

  // ── Data block 2: Top 10 pekerja by work days (row 17+, col A-B) ──
  var empRawData = sumSh.getRange(4, 3, lastSumRow - 3, 7).getValues();
  var empRows = [];
  for (var r = 0; r < empRawData.length; r++) {
    var nama = (empRawData[r][0]||"").toString().trim();
    if (!nama || nama.indexOf("▶") >= 0) continue;
    var totalWork = (Number(empRawData[r][2])||0) + (Number(empRawData[r][3])||0);
    empRows.push([nama, totalWork]);
  }
  empRows.sort(function(a,b) { return b[1] - a[1]; });
  var top10 = empRows.slice(0, 10);

  if (top10.length > 0) {
    var barData = [["Pekerja","Hari Kerja"]].concat(top10);
    var barStart = 17;
    sh.getRange(barStart, 1, barData.length, 2).setValues(barData);
    sh.getRange(barStart,1,1,2).setBackground(C.ACC).setFontColor(C.WHT).setFontWeight("bold").setHorizontalAlignment("center");
    sh.getRange(barStart+1,1,top10.length,1).setBackground(C.G50).setFontSize(9);
    sh.getRange(barStart+1,2,top10.length,1).setBackground(C.G50).setHorizontalAlignment("center").setFontWeight("bold");
    sh.getRange(barStart,1,barData.length,2).setBorder(true,true,true,true,true,true,C.G200,SpreadsheetApp.BorderStyle.SOLID);
    _secLabel(sh, "A16", "🏆  Top Pekerja — Hari Kerja", C.ACC);

    try {
      var chart2 = sh.newChart()
        .setChartType(Charts.ChartType.BAR)
        .addRange(sh.getRange(barStart, 1, barData.length, 2))
        .setPosition(16, 3, 10, 0)
        .setOption("title", "Top Pekerja — Hari Kerja")
        .setOption("width", 420)
        .setOption("height", 320)
        .setOption("hAxis", {title: "Hari Kerja"})
        .setOption("legend", {position: "none"})
        .build();
      sh.insertChart(chart2);
    } catch(e) {}
  }

  // Update info bar row 8
  sh.getRange("A8:J8").merge()
    .setValue("✅  Charts dikemaskini. P+T+S: " + totP + " hari  |  Malam: " + totM + " hari  |  OFF: " + totOFF + " hari  |  AL/MC/EL: " + totAL + " hari")
    .setBackground(C.ACC_L).setFontColor(C.ACC).setFontSize(9)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
}

// ═══════════════════════════════════════════════════════
//  HELPER: Baca rules dari Setup (col M, row 5-10)
// ═══════════════════════════════════════════════════════
function _getRules(setupSh) {
  try {
    var data = setupSh.getRange(SETUP.RULES_ROW_START, SETUP.RULES_COL_VAL, 6, 1).getValues();
    return {
      minP:           Math.max(0, parseInt(data[0][0]) || 2),
      minT:           Math.max(0, parseInt(data[1][0]) || 1),
      minM:           Math.max(0, parseInt(data[2][0]) || 1),
      minOC:          Math.max(0, parseInt(data[3][0]) || 0),
      maxConsecutive: Math.max(1, parseInt(data[4][0]) || 5),
      minOff:         Math.max(0, parseInt(data[5][0]) || 4),
    };
  } catch(e) {
    return { minP:2, minT:1, minM:1, minOC:0, maxConsecutive:5, minOff:4 };
  }
}

// ═══════════════════════════════════════════════════════
//  HELPER: Detect info bulan semasa dari Monthly
// ═══════════════════════════════════════════════════════
function _getMonthlyInfo(monthlySh) {
  if (!monthlySh) return null;
  try {
    var d2 = monthlySh.getRange("D2").getValue().toString().trim();
    if (!d2) return null;
    var parts = d2.split(" ");
    var bIdx = BULAN.indexOf(parts[0]);
    if (bIdx < 0) return null;
    var tahun = parseInt(parts[1]);
    if (isNaN(tahun)) return null;
    var hari = new Date(tahun, bIdx+1, 0).getDate();
    return { bulan: bIdx, tahun: tahun, hari: hari, sCol: 4 + hari };
  } catch(e) { return null; }
}

// ═══════════════════════════════════════════════════════
//  HELPER: Auto Fill — kira streak hari kerja berturut-turut
//  (sebelum hari d, tidak termasuk d)
// ═══════════════════════════════════════════════════════
function _calcStreak(shifts, upToDay) {
  var streak = 0;
  for (var d = upToDay - 1; d >= 0; d--) {
    var v = shifts[d];
    if (v === "P" || v === "T" || v === "M" || v === "S" || v === "OT" || v === "OC") {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// HELPER: kira bilangan hari rehat (OFF/AL/MC/EL/PH) sebelum hari d
function _calcOffCount(shifts, upToDay) {
  var count = 0;
  for (var d = 0; d < upToDay; d++) {
    var v = shifts[d];
    if (v === "OFF" || v === "AL" || v === "MC" || v === "EL" || v === "PH") count++;
  }
  return count;
}

// HELPER: kira bilangan hari kerja sebelum hari d
function _calcWorkCount(shifts, upToDay) {
  var count = 0;
  for (var d = 0; d < upToDay; d++) {
    var v = shifts[d];
    if (v === "P" || v === "T" || v === "M" || v === "S" || v === "OT" || v === "OC") count++;
  }
  return count;
}

// ═══════════════════════════════════════════════════════
//  HELPER FUNCTIONS (unchanged)
// ═══════════════════════════════════════════════════════
function _getPekerjaAktif(setupSh) {
  var data = setupSh.getRange(SETUP.PEK_START, 1, SETUP.PEK_END - SETUP.PEK_START + 1, 7).getValues();
  var result = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (!row[2] || row[2].toString().trim() === "") continue;
    if (row[6] === "Berhenti" || row[6] === "Tidak Aktif") continue;
    result.push({
      bil: row[0], id: row[1], nama: row[2].toString().trim(),
      jawatan: row[3], dept: row[4] ? row[4].toString().trim() : "Tiada Dept",
      kadar: row[5] || CFG.RATE_STD, status: row[6],
      setupRow: SETUP.PEK_START + i
    });
  }
  return result;
}

function _groupByDept(pekData) {
  var order = [], map = {};
  for (var i = 0; i < pekData.length; i++) {
    var dept = pekData[i].dept || "Tiada Dept";
    if (!map[dept]) { map[dept] = { dept: dept, pekerja: [] }; order.push(dept); }
    map[dept].pekerja.push(pekData[i]);
  }
  return order.map(function(d) { return map[d]; });
}

function _applyShiftCF(sh, ranges) {
  if (!ranges || ranges.length === 0) return;
  var rules = [];
  for (var k = 0; k < CFG.SHIFT_KEYS.length; k++) {
    var key = CFG.SHIFT_KEYS[k];
    var sv = CFG.SHIFT_INFO[key];
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(key).setBackground(sv.bg).setFontColor(sv.fg)
      .setRanges(ranges).build());
  }
  sh.setConditionalFormatRules(rules);
}

function _hdr(sh, range, text, bg, size) {
  sh.getRange(range).merge().setValue(text)
    .setBackground(bg).setFontColor(C.WHT)
    .setFontSize(size||13).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
}

function _secLabel(sh, cell, text, color) {
  sh.getRange(cell).setValue(text).setFontWeight("bold").setFontSize(10).setFontColor(color||C.PRI);
}

function _tblHdr(sh, range, hdrs, bg) {
  sh.getRange(range).setValues([hdrs])
    .setBackground(bg||C.PRI).setFontColor(C.WHT)
    .setFontWeight("bold").setHorizontalAlignment("center")
    .setVerticalAlignment("middle").setWrap(true);
}

function _kpi(sh, row, col, label, formula, bg, fg) {
  sh.getRange(row, col, 1, 2).merge().setValue(label)
    .setBackground(bg).setFontColor(fg).setFontWeight("bold").setFontSize(9)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setRowHeight(row, 26);
  sh.getRange(row+1, col, 1, 2).merge().setFormula(formula)
    .setBackground(bg).setFontColor(fg).setFontSize(22).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sh.setRowHeight(row+1, 52);
  sh.getRange(row, col, 2, 2).setBorder(true,true,true,true,false,false,fg,SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}

function _alert(msg) { SpreadsheetApp.getUi().alert(msg); }
function _padZ(n) { return n < 10 ? "0"+n : ""+n; }
function _fmtDate(d) { return _padZ(d.getDate())+"/"+_padZ(d.getMonth()+1)+"/"+d.getFullYear(); }

function columnLetter(n) {
  var r = "";
  while (n > 0) { n--; r = String.fromCharCode(65+(n%26))+r; n=Math.floor(n/26); }
  return r;
}

function getWeekNumber(d) {
  var date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate()+4-(date.getUTCDay()||7));
  var y = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  return Math.ceil((((date-y)/86400000)+1)/7);
}

// ═══════════════════════════════════════════════════════
//  MENU
// ═══════════════════════════════════════════════════════
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📋 Roster Pro")
    .addItem("🔧 Setup Semula (First Time)", "initialSetup")
    .addSeparator()
    .addItem("🗓️ Generate Roster Bulanan",   "generateMonthly")
    .addItem("📅 Generate Roster Mingguan",  "generateWeekly")
    .addSeparator()
    .addItem("🤖 Auto Fill Roster",          "autoFillRoster")
    .addSeparator()
    .addItem("🔄 Refresh Summary & Clash",   "refreshSemuaTab")
    .addItem("⚠️ Semak Konflik Shift",       "semakKonflik")
    .addSeparator()
    .addItem("ℹ️ Panduan Guna", "panduan")
    .addToUi();
}

function panduan() {
  _alert(
    "📋  PANDUAN ROSTER PRO v4.0\n\n" +
    "SETUP (BUAT SEKALI):\n" +
    "  • Isi nama syarikat di ⚙️ Setup › B4\n" +
    "  • Edit senarai department (D5:D12)\n" +
    "  • Tambah pekerja di baris 20 ke bawah\n" +
    "  • Edit rules Auto Fill di kolum M (L3:M10)\n\n" +
    "CARA GUNA AUTO FILL:\n" +
    "  1. Menu › Generate Roster Bulanan\n" +
    "     (Weekdays kosong, weekend = OFF)\n" +
    "  2. Isi cells yang nak LOCK\n" +
    "     Contoh: Amin Rabu = P (Pagi)\n" +
    "  3. Menu › 🤖 Auto Fill Roster\n" +
    "     Semua sel kosong diisi ikut rules\n\n" +
    "WEEKLY (SYNC DARI MONTHLY):\n" +
    "  • Generate Mingguan akan pull data dari Monthly\n" +
    "  • Tunjuk '✅ Sync dari Monthly' jika berjaya sync\n\n" +
    "DASHBOARD CHARTS:\n" +
    "  • Charts auto-generate bila Refresh Summary & Clash\n" +
    "  • Pie: agihan jenis shift\n" +
    "  • Bar: top 10 pekerja hari kerja\n\n" +
    "SEMAK KONFLIK:\n" +
    "  • Detect pekerja kerja ≥6 hari berturut-turut\n" +
    "  • Semak hari rehat minimum per bulan"
  );
}
