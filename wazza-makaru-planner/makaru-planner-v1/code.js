//onOpen.gs file
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu('Booking Planner')
    .addItem('Sync Sheets → Calendar 📅', 'openLoaderThenRunActions')
    .addItem('Sync Calendar → Sheets 🔄', 'pullCalendarHere')
    .addItem('Update Malaysia Holidays 🇲🇾', 'pullMalaysiaHolidays')
    .addToUi();
}

//onEdit.gs file
function onEdit(e) {
  var ss = e.source;
  var range = e.range;

  // --- keep your existing CHART logic (unchanged) ---
  if (range.getSheet().getName() === '05 CHART' && 
      (range.getA1Notation() === 'C40' || range.getA1Notation() === 'L40')) {
    updateChartCell(range.getRow(), range.getColumn());
  }

  // --- NEW: All-Day guard for 01 DAFTAR ---
  try {
    handleAllDayGuard_(e);  // harmless no-op if not on 01 DAFTAR
  } catch (err) {
    console.error('handleAllDayGuard_ error:', err);
  }

  // --- NEW: keep month header format (e.g., "Jan 2025") ---
  try {
    enforceMonthHeaderFormat_(e);
  } catch (err) {
    console.error('enforceMonthHeaderFormat_ error:', err);
  }
}


//  * Keeps month/date headers formatted (e.g. "Jan 2025") after edit.
//  * Add any other month header cells you want to protect.

function enforceMonthHeaderFormat_(e) {
  var sh = e.range.getSheet();
  var sheetName = sh.getName();

  // ✅ Define which cells should stay "mmm yyyy" formatted
  var targetsBySheet = {
    "02 CALENDAR": ["B14"],  // your calendar selector
    "03 LIST": ["B5"]        // your list selector
  };

  // --- skip if sheet not listed ---
  if (!(sheetName in targetsBySheet)) return;

  var a1 = e.range.getA1Notation();
  var targetCells = targetsBySheet[sheetName];

  // --- skip if not target cell ---
  if (targetCells.indexOf(a1) === -1) return;

  var cell = sh.getRange(a1);
  var value = cell.getValue();

  // --- only apply format if it's a valid date ---
  if (value instanceof Date && !isNaN(value)) {
    cell.setNumberFormat("mmm yyyy"); // enforce “Jan 2025”
  }
}


/***** your existing function (unchanged) *****/
function updateChartCell(row, col) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var chartSheet = ss.getSheetByName('05 CHART');
  var dataPrepSheet = ss.getSheetByName('DATAPREP');

  if (col === 3) { 
    var cellC = chartSheet.getRange(row, 3); 
    var valueC = cellC.getValue();

    var cellC40 = chartSheet.getRange(row+1, 3);
    if (valueC === "COUNT") {
      cellC40.clearDataValidations();
      cellC40.setValue("not applicable")
            .setFontStyle("italic")
            .setFontColor("grey")
            .setBackground("#D3D3D3"); 
    } else if (valueC === "SUM") {
      var dropDownRange = dataPrepSheet.getRange('AF15:AF17');
      var rule = SpreadsheetApp.newDataValidation()
                               .requireValueInRange(dropDownRange)
                               .setAllowInvalid(false)
                               .build();

      cellC40.clearDataValidations();
      cellC40.setDataValidation(rule)
            .setValue("")
            .setFontStyle("normal")
            .setFontColor("black")
            .setBackground("white");
    } else {
      cellC40.clear();
    }
  } else if (col === 12) { 
    var cellL = chartSheet.getRange(row, 12);
    var valueL = cellL.getValue();

    var cellL40 = chartSheet.getRange(row+1, 12); 
    if (valueL === "COUNT") {
      cellL40.clearDataValidations();
      cellL40.setValue("not applicable")
            .setFontStyle("italic")
            .setFontColor("grey")
            .setBackground("#D3D3D3"); 
    } else if (valueL === "SUM") {
      var dropDownRange = dataPrepSheet.getRange('AF15:AF17');
      var rule = SpreadsheetApp.newDataValidation()
                               .requireValueInRange(dropDownRange)
                               .setAllowInvalid(false)
                               .build();

      cellL40.clearDataValidations();
      cellL40.setDataValidation(rule)
            .setValue("")
            .setFontStyle("normal")
            .setFontColor("black")
            .setBackground("white");
    } else {
      cellL40.clear();
    }
  }
}

/***** === NEW: All-Day guard helpers (no validation changes) === *****/

// Reuse globals if they exist; otherwise fall back to defaults.
const _SHEET_01_DAFTAR = (typeof ACT_SHEET_NAME !== 'undefined') ? ACT_SHEET_NAME : '01 DAFTAR';
const _FIRST_DATA_ROW  = (typeof ACT_FIRST_DATA_ROW !== 'undefined') ? ACT_FIRST_DATA_ROW : 20;

// Columns in 01 DAFTAR
const ALLDAY_COL     = 13; // M
const START_TIME_COL = 7;  // G (Start Time)
const END_DATE_COL   = 14; // N
const END_TIME_COL   = 15; // O

function handleAllDayGuard_(e) {
  if (!e || !e.range) return;

  const sh = e.range.getSheet();
  if (sh.getName() !== _SHEET_01_DAFTAR) return;

  const row = e.range.getRow();
  if (row < _FIRST_DATA_ROW) return;

  const col = e.range.getColumn();
  const isTimeField = (col === START_TIME_COL || col === END_DATE_COL || col === END_TIME_COL);

  const allDay = sh.getRange(row, ALLDAY_COL).getValue() === true;

  // If ALLDAY toggled
  if (col === ALLDAY_COL) {
    if (allDay) {
      // clear time-related inputs
      sh.getRange(row, START_TIME_COL).clearContent();
      sh.getRange(row, END_DATE_COL).clearContent();
      sh.getRange(row, END_TIME_COL).clearContent();
      e.source.toast('ALL DAY aktif — masa & end date dikosongkan.');
    } else {
      e.source.toast('ALL DAY dimatikan — masa & end date boleh diisi semula.');
    }
    return;
  }

  // If ALLDAY is ON and user tries to edit time/date fields, block it
  if (allDay && isTimeField && typeof e.value !== 'undefined') {
    e.range.clearContent();
    e.source.toast('ALL DAY aktif — masa & end date tidak dibenarkan.');
  }
}


//Calendar Pull.gs file

// CONFIG (this sheet only)
const SH_PREP        = 'DATAPREP';
const OUT_FIRST_ROW  = 4;           // start writing here
const OUT_FIRST_COL  = 8;           // column H
const horizonYears = 5;             // Tahun kedepan - 5 Tahun

function pullCalendarHere() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SH_PREP);
  if (!sh) throw new Error(`Sheet '${SH_PREP}' tidak ditemui`);

  const tz = ss.getSpreadsheetTimeZone();

  let cal, calId;
  try {
    const o = getCalendar_();
    cal = o.cal; calId = o.calId;
  } catch (e) {
    throw new Error(friendlyErr_(e));
  }

  const rows = [];

  // baca tempoh (hari) dari DATAPREP!H2, default 90 jika kosong / bukan nombor
  const daysBack = Number(sh.getRange('H2').getValue()) || 90;

  // range tarik: dari (hari ini - daysBack) sehingga hari ini (inklusif)
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()); 
  start.setDate(start.getDate() - daysBack);

  // AMBIL SAMPAI MASA DEPAN: contoh 2 tahun ke depan
  const end = new Date(today.getFullYear() + horizonYears, today.getMonth(), today.getDate() + 1);

  let events = [];
  try {
    events = cal.getEvents(start, end);
  } catch (e) {
    throw new Error(friendlyErr_(e, { calId }));
  }

  for (const ev of events) {
    const allDay = ev.isAllDayEvent();
    const st = ev.getStartTime(), et = ev.getEndTime();
    rows.push([
      ev.getId(),
      st ? Utilities.formatDate(st, tz, 'yyyy-MM-dd') : '',
      et ? Utilities.formatDate(et, tz, 'yyyy-MM-dd') : '',
      allDay ? '' : (st ? Utilities.formatDate(st, tz, 'hh:mm a') : ''),
      allDay ? '' : (et ? Utilities.formatDate(et, tz, 'hh:mm a') : ''),
      cal.getName(),
      ev.getTitle() || '',
      ev.getDescription() || ''
    ]);
  }

  rows.sort((a, b) =>
    (new Date(`${a[2]} ${a[4] || '00:00 AM'}`)) - (new Date(`${b[2]} ${b[4] || '00:00 AM'}`))
  );

  const lastRow = sh.getMaxRows();
  sh.getRange(OUT_FIRST_ROW, OUT_FIRST_COL, Math.max(0, lastRow - OUT_FIRST_ROW + 1), 8).clearContent();
  if (rows.length) sh.getRange(OUT_FIRST_ROW, OUT_FIRST_COL, rows.length, 8).setValues(rows);

  return { pulled: rows.length };
}


//calendar create.gs file


// CONFIG 
const SH_DRAFT       = '01 DAFTAR';
const HEADER_ROW     = 15;   // row with headers
const FIRST_DATA_ROW = 16;   // start reading from here

// Column indexes (1-based)
const COL_DATE_START = 1;  // A
const COL_DATE_END   = 2;  // B
const COL_TIME_START = 3;  // C
const COL_TIME_END   = 4;  // D
const COL_KATEGORI   = 5;  // E
const COL_TITLE      = 15; // O
const COL_DESC       = 16; // P
const COL_STATUS     = 10;  // J
const COL_MAKLUMAT1  = 7;  // G
const COL_MAKLUAMT2  = 8; // H
const COL_MAKLUMAT3  = 9; // I
const COL_ACTION     = 11; // K -> "Create", "Update", "Delete"
const COL_CAL_STATUS = 12; // L
const COL_EVENT_ID   = 13; // M
const COL_ALLDAY     = 14; // N


function processCalendarCreates() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SH_DRAFT);
  if (!sh) throw new Error(`Sheet '${SH_DRAFT}' tidak ditemui`);
  const last = sh.getLastRow();
  if (last < FIRST_DATA_ROW) return { created: 0, errors: [] };

  const range  = sh.getRange(FIRST_DATA_ROW, 1, last - FIRST_DATA_ROW + 1, COL_DESC);
  const values = range.getValues();
  const disp   = range.getDisplayValues();

  let cal, calId;
  try {
    const o = getCalendar_();
    cal = o.cal; calId = o.calId;
  } catch (e) {
    // hentikan awal dengan mesej yang jelas
    throw new Error(friendlyErr_(e));
  }

  let created = 0;
  const errors = [];

  for (let r = 0; r < values.length; r++) {
    const rowNum = FIRST_DATA_ROW + r;
    const row    = values[r];
    const action = String(row[COL_ACTION - 1] || '').trim().toLowerCase();
    if (action !== 'create') continue;

    const existingId = String(row[COL_EVENT_ID - 1] || '').trim();
    if (existingId) {
      sh.getRange(rowNum, COL_ACTION).clearContent();
      continue;
    }

    const dateStart = row[COL_DATE_START - 1];
    let   dateEnd   = row[COL_DATE_END   - 1];   // <-- guna let supaya boleh ubah
    const title     = String(row[COL_TITLE - 1] || '').trim();
    const desc      = String(row[COL_DESC  - 1] || '').trim();

    if (!(dateStart instanceof Date)) {
      errors.push(`Row ${rowNum}: Tarikh mula (DATE START) tiada`);
      sh.getRange(rowNum, COL_ACTION).clearContent();
      continue;
    }
    if (!title) {
      errors.push(`Row ${rowNum}: Tajuk (TITLE) tiada`);
      sh.getRange(rowNum, COL_ACTION).clearContent();
      continue;
    }

    // 🔹 BARU: kalau DATE END kosong, auto copy dari DATE START & tulis ke sheet
    if (!(dateEnd instanceof Date)) {
      dateEnd = dateStart;
      sh.getRange(rowNum, COL_DATE_END).setValue(dateStart);
    }

    const hmStart = parseTimeString_(disp[r][COL_TIME_START - 1]);
    const hmEnd   = parseTimeString_(disp[r][COL_TIME_END   - 1]);
    const hasStartTime = !!hmStart;
    const hasEndTime   = !!hmEnd;

    if (hasStartTime !== hasEndTime) {
      if (hasStartTime && !hasEndTime) errors.push(`Row ${rowNum}: Masa tamat (END TIME) tiada`);
      if (!hasStartTime && hasEndTime) errors.push(`Row ${rowNum}: Masa mula (START TIME) tiada`);
      sh.getRange(rowNum, COL_ACTION).clearContent();
      continue;
    }

    if (!hasStartTime && !hasEndTime) {
      if (dateEnd < dateStart) {
        errors.push(`Row ${rowNum}: DATE END lebih awal daripada DATE START`);
        sh.getRange(rowNum, COL_ACTION).clearContent();
        continue;
      }
    } else {
      const s = combineDateAndHM_(dateStart, hmStart);
      const e = combineDateAndHM_(dateEnd,   hmEnd);
      if (!(e > s)) {
        errors.push(`Row ${rowNum}: END TIME mesti selepas START TIME`);
        sh.getRange(rowNum, COL_ACTION).clearContent();
        continue;
      }
    }

    try {
      let ev;
      if (!hasStartTime && !hasEndTime) {
        const s = new Date(dateStart.getFullYear(), dateStart.getMonth(), dateStart.getDate());
        const e = new Date(dateEnd.getFullYear(),   dateEnd.getMonth(),   dateEnd.getDate());
        ev = sameYMD_(s, e)
          ? cal.createAllDayEvent(title, s, { description: desc })
          : cal.createAllDayEvent(title, s, addDays_(e, 1), { description: desc }); // end exclusive
      } else {
        const s = combineDateAndHM_(dateStart, hmStart);
        const e = combineDateAndHM_(dateEnd,   hmEnd);
        ev = cal.createEvent(title, s, e, { description: desc });
      }

      sh.getRange(rowNum, COL_EVENT_ID).setValue(ev.getId());
      sh.getRange(rowNum, COL_ACTION).clearContent();
      created++;
    } catch (err) {
      errors.push(`Row ${rowNum}: ${friendlyErr_(err, { calId })}`);
      sh.getRange(rowNum, COL_ACTION).clearContent();
    }
  }
  return { created, errors };
}


// ---------- Helpers (unchanged) ----------

function buildDescription_(desc, extras) {
  const bits = [];
  if (desc) bits.push(desc);
  const kv = [];
  if (extras.kategori) kv.push(`Kategori: ${extras.kategori}`);
  if (extras.nama)     kv.push(`Nama: ${extras.nama}`);
  if (extras.phone)    kv.push(`No Telefon: ${extras.phone}`);
  if (extras.harga)    kv.push(`Harga: ${extras.harga}`);
  if (kv.length) bits.push(kv.join(' | '));
  return bits.join('\n');
}

function combineDateAndTime_(dateOnly, timeOnly) {
  const d = new Date(dateOnly);
  if (timeOnly instanceof Date) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(),
                    timeOnly.getHours(), timeOnly.getMinutes(), 0, 0);
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function sameYMD_(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth() &&
         a.getDate()     === b.getDate();
}

function writeStatus_(sh, rowIndexZero, msg) {
  sh.getRange(FIRST_DATA_ROW + rowIndexZero, COL_CAL_STATUS).setValue(msg);
}

function parseTimeString_(s) {
  if (!s) return null;
  const str = String(s).trim();
  if (!str) return null;
  const m = str.match(/^(\d{1,2})\s*:\s*(\d{2})(?:\s*([ap]m))?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const ampm = m[3] ? m[3].toLowerCase() : '';
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  if (h < 0 || h > 23 || mins < 0 || mins > 59) return null;
  return { h: h, m: mins };
}

function combineDateAndHM_(dateOnly, hm) {
  const d = new Date(dateOnly);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hm.h, hm.m, 0, 0);
}

function friendlyErr_(err, opts = {}) {
  const msg = String(err && err.message || err || '').toLowerCase();
  const calId = opts.calId || '';

  // Permission / action not allowed
  if (
    msg.includes('action not allowed') ||
    msg.includes('insufficient') ||
    msg.includes('forbidden') ||
    msg.includes('not permitted')
  ) {
    return [
      `Tindakan tidak dibenarkan (Action not allowed).`,
      ``,
      `Saranan:`,
      `1️⃣  Minta owner calendar beri akses "Make changes to events" kepada akaun ini.`,
      `2️⃣  Pastikan Calendar ID yang digunakan adalah betul.`,
      ``,
      calId ? `Calendar ID digunakan: ${calId}` : ``
    ].filter(Boolean).join('\n');
  }

  // Calendar not found
  if (
    msg.includes('calendar not found') ||
    msg.includes('cannot find') ||
    msg.includes('not found for id')
  ) {
    return [
      `Calendar tidak ditemui atau anda tiada akses.`,
      ``,
      `Saranan:`,
      `1️⃣  Semak Calendar ID di 00 TETAPAN!C15.`,
      `2️⃣  Gunakan ID daripada Settings → Integrate calendar (bukan nama calendar).`,
      `3️⃣  Pastikan owner telah share calendar tersebut kepada akaun ini dengan akses "Make changes to events".`,
      ``,
      calId ? `ID yang digunakan: ${calId}` : ``
    ].filter(Boolean).join('\n');
  }

  // Default (unknown)
  return err && err.message
    ? err.message
    : String(err);
}


// Centralized: baca Calendar + mesej ralat yang jelas
function getCalendar_() {
  const ss = SpreadsheetApp.getActive();
  const settingsSh = ss.getSheetByName('00 TETAPAN');
  if (!settingsSh) throw new Error(`Sheet '00 TETAPAN' tidak ditemui`);

  const calId = String(settingsSh.getRange('C15').getDisplayValue()).trim();
  if (!calId) throw new Error(`Sila masukkan **Calendar ID** di 00 TETAPAN!C15`);

  const cal = CalendarApp.getCalendarById(calId);
  if (!cal) {
    throw new Error(friendlyErr_(new Error('Calendar not found'), { calId }));
  }
  return { cal, calId };
}


//calendarend - update & delete.gs file

// Process rows where ACTION = UPDATE or DELETE.
// - UPDATE: requires EVENT ID in col N. Updates title/description and time/all-day based on the row.
// - DELETE: requires EVENT ID in col N. Deletes the event from Calendar, clears Event ID.

function processCalendarUpdatesDeletes() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SH_DRAFT);
  if (!sh) throw new Error(`Sheet '${SH_DRAFT}' tidak ditemui`);

  const last = sh.getLastRow();
  if (last < FIRST_DATA_ROW) return { updated: 0, deleted: 0, errors: [] };

  const range  = sh.getRange(FIRST_DATA_ROW, 1, last - FIRST_DATA_ROW + 1, COL_DESC);
  const values = range.getValues();
  const disp   = range.getDisplayValues();

  let cal, calId;
  try {
    const o = getCalendar_();
    cal = o.cal; calId = o.calId;
  } catch (e) {
    throw new Error(friendlyErr_(e));
  }

  let updated = 0, deleted = 0;
  const errors = [];

  for (let r = 0; r < values.length; r++) {
    const rowNum = FIRST_DATA_ROW + r;
    const row = values[r];
    const action = String(row[COL_ACTION - 1] || '').trim().toLowerCase();
    if (action !== 'update' && action !== 'delete') continue;

    const id = String(row[COL_EVENT_ID - 1] || '').trim();

    if (!id) {
      errors.push(`Row ${rowNum}: EVENT ID tiada (sila CREATE dahulu atau masukkan ID yang sah)`);
      sh.getRange(rowNum, COL_ACTION).clearContent();
      continue;
    }

    const ev = getEventByIdFlexible_(cal, id);
    if (!ev) {
      errors.push(`Row ${rowNum}: Event untuk EVENT ID "${id}" tidak ditemui.
      Mungkin anda **belum join** event dari owner calendar, event ini **milik calendar lain**, atau event telah **dipadam**.`);
      sh.getRange(rowNum, COL_ACTION).clearContent();
      continue;
    }

    if (action === 'delete') {
      try {
        ev.deleteEvent();
        sh.getRange(rowNum, COL_EVENT_ID).clearContent();
        sh.getRange(rowNum, COL_ACTION).clearContent();
        deleted++;
      } catch (e) {
        errors.push(`Row ${rowNum}: ${friendlyErr_(e, { calId })}`);
      }
      continue;
    }

    // ===== UPDATE =====
    const dateStart = row[COL_DATE_START - 1];
    let   dateEnd   = row[COL_DATE_END   - 1];   // <-- let, boleh modify
    const title     = String(row[COL_TITLE - 1] || '').trim();
    const desc      = String(row[COL_DESC  - 1] || '').trim();

    if (!(dateStart instanceof Date)) {
      errors.push(`Row ${rowNum}: Tarikh mula (DATE START) tiada`);
      sh.getRange(rowNum, COL_ACTION).clearContent();
      continue;
    }
    if (!title) {
      errors.push(`Row ${rowNum}: Tajuk (TITLE) tiada`);
      sh.getRange(rowNum, COL_ACTION).clearContent();
      continue;
    }

    // 🔹 BARU: kalau DATE END kosong, auto copy dari DATE START & tulis ke sheet
    if (!(dateEnd instanceof Date)) {
      dateEnd = dateStart;
      sh.getRange(rowNum, COL_DATE_END).setValue(dateStart);
    }

    const hmStart = parseTimeString_(disp[r][COL_TIME_START - 1]);
    const hmEnd   = parseTimeString_(disp[r][COL_TIME_END   - 1]);
    const hasStartTime = !!hmStart;
    const hasEndTime   = !!hmEnd;

    if (hasStartTime !== hasEndTime) {
      if (hasStartTime && !hasEndTime) errors.push(`Row ${rowNum}: Masa tamat (END TIME) tiada`);
      if (!hasStartTime && hasEndTime) errors.push(`Row ${rowNum}: Masa mula (START TIME) tiada`);
      sh.getRange(rowNum, COL_ACTION).clearContent();
      continue;
    }

    if (!hasStartTime && !hasEndTime) {
      if (dateEnd < dateStart) {
        errors.push(`Row ${rowNum}: DATE END lebih awal daripada DATE START`);
        sh.getRange(rowNum, COL_ACTION).clearContent();
        continue;
      }
    } else {
      const s = combineDateAndHM_(dateStart, hmStart);
      const e = combineDateAndHM_(dateEnd,   hmEnd);
      if (!(e > s)) {
        errors.push(`Row ${rowNum}: END TIME mesti selepas START TIME`);
        sh.getRange(rowNum, COL_ACTION).clearContent();
        continue;
      }
    }

    try {
      ev.setTitle(title);
      ev.setDescription(desc);

      if (!hasStartTime && !hasEndTime) {
        const s = new Date(dateStart.getFullYear(), dateStart.getMonth(), dateStart.getDate());
        const e = new Date(dateEnd.getFullYear(),   dateEnd.getMonth(),   dateEnd.getDate());
        sameYMD_(s, e) ? ev.setAllDayDate(s) : ev.setAllDayDates(s, addDays_(e, 1));
      } else {
        const s = combineDateAndHM_(dateStart, hmStart);
        const e = combineDateAndHM_(dateEnd,   hmEnd);
        ev.setTime(s, e);
      }

      sh.getRange(rowNum, COL_ACTION).clearContent();
      updated++;
    } catch (e) {
      errors.push(`Row ${rowNum}: ${friendlyErr_(e, { calId })}`);
    }
  }

  return { updated, deleted, errors };
}


/* Helper stays the same */
function getEventByIdFlexible_(cal, id) {
  if (!id) return null;
  let ev = null;
  try { ev = cal.getEventById(id); } catch(e) {}
  if (!ev && id.endsWith('@google.com')) {
    try { ev = cal.getEventById(id.replace('@google.com','')); } catch(e) {}
  }
  if (!ev && !id.endsWith('@google.com')) {
    try { ev = cal.getEventById(id + '@google.com'); } catch(e) {}
  }
  return ev;
}

// Calendar cuti.gs file

// CONFIG 
const SH_OUT            = '00 TETAPAN';                    
const YEAR_DATE_CELL    = 'DATAPREP!AQ2';                  
const OUT_FIRST_ROW1    = 19;                              
const OUT_FIRST_COL1    = 2;                               
const LAST_ROW_LIMIT    = 56;   // ✅ Lock until row 56 only
const MY_HOL_CAL_ID     = 'en.malaysia#holiday@group.v.calendar.google.com';

// Tarik cuti umum ikut tahun dari YEAR_DATE_CELL 
function pullMalaysiaHolidays() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SH_OUT);
  if (!sh) throw new Error(`Sheet '${SH_OUT}' not found`);

  const tz = ss.getSpreadsheetTimeZone();

  // baca tarikh dan tentukan tahun
  const raw = ss.getRange(YEAR_DATE_CELL).getValue();
  if (!(raw instanceof Date) || isNaN(raw)) {
    throw new Error(`Sila isi tarikh sah di ${YEAR_DATE_CELL} (cth: 1/1/2025).`);
  }
  const year  = raw.getFullYear();
  const start = new Date(year, 0, 1, 0, 0, 0);
  const end   = new Date(year + 1, 0, 1, 0, 0, 0);

  const cal = CalendarApp.getCalendarById(MY_HOL_CAL_ID);
  if (!cal) throw new Error('Calendar Malaysia Holidays tidak ditemui.');

  const events = cal.getEvents(start, end);

  // Sort ikut tarikh
  events.sort((a, b) => a.getStartTime() - b.getStartTime());

  // Prepare data rows
  const rows = events.map(e => [e.getStartTime(), e.getTitle()]);

  // ================================
  //  LIMIT CLEAR AREA ONLY B19:C56
  // ================================
  const totalRowsToClear = LAST_ROW_LIMIT - OUT_FIRST_ROW1 + 1; // row 19 → 56
  sh.getRange(
    OUT_FIRST_ROW1,        // 19
    OUT_FIRST_COL1,        // B
    totalRowsToClear,      // until 56
    2                      // B & C
  ).clearContent();

  // Header
  const header = [['TARIKH', `CUTI UMUM MALAYSIA ${year}`]];
  sh.getRange(OUT_FIRST_ROW1, OUT_FIRST_COL1, 1, 2).setValues(header);

  // ================================
  //  WRITE ONLY WITHIN LIMIT
  // ================================
  const maxWriteRows = LAST_ROW_LIMIT - OUT_FIRST_ROW1; // header + rows
  const safeRows = rows.slice(0, maxWriteRows); // avoid overflow

  if (safeRows.length) {
    sh.getRange(
      OUT_FIRST_ROW1 + 1,           // row 20
      OUT_FIRST_COL1,               // B
      safeRows.length,              // number of holidays
      2                             // 2 columns
    ).setValues(safeRows);
  }

  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert('Cuti tahun ' + year + ' done ✅');
}


// calendar function turutan.gs file

function processCalendarActions() {
  const lock = LockService.getDocumentLock();
  const lines = [];
  try {
    lock.tryLock(30000);
    lines.push("Initializing calendar synchronization...");

    let created = 0, updated = 0, deleted = 0, pulled = 0;
    let hadError = false;

    // CREATE
    try {
      if (typeof processCalendarCreates === 'function') {
        const res = processCalendarCreates();
        created = res?.created || 0;
        if (res?.errors?.length) {
          res.errors.forEach(e => lines.push(`❌ ${e}`));
          hadError = true;
        }
      }
    } catch (err) {
      lines.push(`❌ Error during CREATE: ${err.message}`);
      hadError = true;
    }

    // UPDATE + DELETE
    try {
      if (typeof processCalendarUpdatesDeletes === 'function') {
        const res = processCalendarUpdatesDeletes();
        updated = res?.updated || 0;
        deleted = res?.deleted || 0;
        if (res?.errors?.length) {
          res.errors.forEach(e => lines.push(`❌ ${e}`));
          hadError = true;
        }
      }
    } catch (err) {
      lines.push(`❌ Error during UPDATE/DELETE: ${err.message}`);
      hadError = true;
    }

    // ➜ Only log actions that actually happened
    const anyAction = (created + updated + deleted) > 0;
    if (!anyAction) {
      lines.push("No action from user.");
    } else {
      if (created > 0) lines.push(`Creating new events (${created} total)...`);
      if (updated > 0) lines.push(`Updating existing events (${updated} modified)...`);
      if (deleted > 0) lines.push(`Deleting outdated events (${deleted} removed)...`);
    }

    // PULL (keep this info line)
    try {
      if (typeof pullCalendarHere === 'function') {
        const res = pullCalendarHere();
        pulled = res?.pulled || 0;
        lines.push(`Retrieving data from Google Calendar (${pulled} events found)...`);
      }
    } catch (err) {
      lines.push(`❌ Error during PULL: ${err.message}`);
      hadError = true;
    }

    lines.push(hadError ? "⚠️ Process completed with errors." : "✅ All operations completed successfully.");
    showProgress_(lines);

  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function openLoaderThenRunActions() {
  const html = HtmlService.createHtmlOutputFromFile('loader_simple')
    .setWidth(420).setHeight(260);
  SpreadsheetApp.getUi().showModelessDialog(html, 'Makaru Planner');
}

function showProgress_(lines) {
  const t = HtmlService.createTemplateFromFile('progress_summary');
  t.lines = lines;
  const html = t.evaluate().setWidth(420).setHeight(320);
  SpreadsheetApp.getUi().showModelessDialog(html, 'Makaru Planner');
}

//function inside create & update
function addDays_(d, n) {
  const t = new Date(d);
  t.setDate(t.getDate() + n);
  // normalize to 00:00 to be safe for all-day
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}



