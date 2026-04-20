
// ==========================================
// Init.gs - (Inisialisasi & Penghalaan)
// ==========================================

const SS = SpreadsheetApp.getActiveSpreadsheet();
const CONFIG_SHEET = SS.getSheetByName("Config");
const LOG_SHEET = SS.getSheetByName("Log_Kehadiran");
const USER_SHEET = SS.getSheetByName("Users");

// HTML kini dihost di website luar. doGet hanya balik status API.
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "OK", message: "Wazza API running. POST requests only." }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Router utama untuk semua panggilan dari HTML luar.
// HTML hantar POST dengan Content-Type: text/plain (untuk elak CORS preflight).
// Body: JSON string dengan field "action" + parameter lain.
function doPost(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  var result;
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;

    if      (action === "getStaffList")                  result = getStaffList();
    else if (action === "verifyLogin")                   result = verifyLogin(body.u, body.p);
    else if (action === "verifyAdminLogin")              result = verifyAdminLogin(body.username, body.password);
    else if (action === "processScan")                   result = processScan(body.payload);
    else if (action === "processClockOut")               result = processClockOut(body.payload);
    else if (action === "getDashboardStatus")            result = getDashboardStatus();
    else if (action === "getAdminDashboardData")         result = getAdminDashboardData(body.targetDateRaw);
    else if (action === "getStaffDashboardData")         result = getStaffDashboardData(body.username);
    else if (action === "getStaffAttendanceByDateRange") result = getStaffAttendanceByDateRange(body.username, body.dateStart, body.dateEnd);
    else if (action === "getAllLeaveLog")                 result = getAllLeaveLog();
    else if (action === "getLeaveTypes")                 result = getLeaveTypes();
    else if (action === "processCuti")                   result = processCuti(body.formData);
    else if (action === "processLeaveStatus")            result = processLeaveStatus(body.rowIndex, body.status);
    else if (action === "setStaffLate")                  result = setStaffLate(body.nama);
    else if (action === "getSystemConfig")               result = getSystemConfig();
    else if (action === "saveSystemConfig")              result = saveSystemConfig(body.payload);
    else if (action === "generateNewToken")              result = generateNewToken();
    else if (action === "getStaffManagementData")        result = getStaffManagementData();
    else if (action === "saveStaffData")                 result = saveStaffData(body.payload);
    else result = { status: "ERROR", message: "Unknown action: " + action };
  } catch (err) {
    result = { status: "ERROR", message: "Router error: " + err.toString() };
  }
  output.setContent(JSON.stringify(result));
  return output;}

// ==========================================
// Triggers.gs - (Automasi & Menu)
// ==========================================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ WAZZA MENU')
    .addItem('🔄 Set Auto Checkout (Ikut Config B6)', 'setupAutoCheckoutTrigger')
    .addSeparator() 
    .addItem('🌙 Set Auto-Refresh Token (Setiap 12 Malam)', 'setupMidnightTokenTrigger') 
    .addToUi();
}

function setupAutoCheckoutTrigger() {
  const ui = SpreadsheetApp.getUi();
  const configVal = CONFIG_SHEET.getRange("B6").getValue();
  let targetHour = 18; let targetMinute = 0; 

  try {
    if (configVal instanceof Date) {
      targetHour = configVal.getHours(); targetMinute = configVal.getMinutes();
    } else {
      let timeParts = String(configVal).split(":"); 
      targetHour = parseInt(timeParts[0]);
      if (timeParts.length > 1) targetMinute = parseInt(timeParts[1]);
    }
  } catch (e) { ui.alert("Format masa salah."); return; }

  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runAutoCheckout') ScriptApp.deleteTrigger(triggers[i]);
  }

  ScriptApp.newTrigger('runAutoCheckout').timeBased().everyDays(1).atHour(targetHour).nearMinute(targetMinute).create();
  let minitCantik = (targetMinute < 10 ? '0' : '') + targetMinute;
  ui.alert(`✅ BERJAYA!\n\nAuto-Checkout set pada jam ${targetHour}:${minitCantik}.`);
}

function runAutoCheckout() {
  const configVal = CONFIG_SHEET.getRange("B6").getValue(); 
  let autoTimestamp = new Date(); 
  
  if (configVal instanceof Date) {
    autoTimestamp.setHours(configVal.getHours()); autoTimestamp.setMinutes(configVal.getMinutes()); autoTimestamp.setSeconds(0);
  } else if (typeof configVal === 'string' && configVal.includes(":")) {
    let parts = configVal.split(":");
    autoTimestamp.setHours(parseInt(parts[0])); autoTimestamp.setMinutes(parseInt(parts[1])); autoTimestamp.setSeconds(0);
  } else {
    autoTimestamp.setHours(18); autoTimestamp.setMinutes(0); autoTimestamp.setSeconds(0);
  }

  const data = LOG_SHEET.getDataRange().getValues();
  const today = new Date();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowDate = new Date(row[0]); 
    const masaKeluar = row[9]; 
    
    if (rowDate.getDate() === today.getDate() && rowDate.getMonth() === today.getMonth() && rowDate.getFullYear() === today.getFullYear() && (masaKeluar === "" || masaKeluar === null)) {
        const cell = LOG_SHEET.getRange(i + 1, 10);
        cell.setValue(autoTimestamp);
        cell.setNumberFormat("HH:mm"); 
        LOG_SHEET.getRange(i + 1, 11).setValue("AUTO-SYSTEM");
        LOG_SHEET.getRange(i + 1, 13).setValue("CLOCK-OUT");
    }
  }
}

function setupMidnightTokenTrigger() {
  const ui = SpreadsheetApp.getUi();
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'generateNewToken') ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger('generateNewToken').timeBased().everyDays(1).atHour(0).nearMinute(0).create();
  ui.alert(`✅ SIAP!\n\nToken QR akan bertukar automatik setiap hari jam 12:00 Malam.`);
}

// ==========================================
// Auth.gs - (Keselamatan & Log Masuk)
// ==========================================

//  staff
function verifyLogin(u, p) {
  const data = USER_SHEET.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if ((String(data[i][0]) == u || String(data[i][2]) == u) && String(data[i][1]) == p) {
      return { status: 'SUCCESS', nama: data[i][2] }; 
    }
  }
  return { status: 'ERROR', message: 'Password Salah atau Nama Tiada' };
}

//  admin
function verifyAdminLogin(username, password) {
  const configData = CONFIG_SHEET.getDataRange().getValues();
  let validUser = "";
  let validPass = "";

  for (let i = 0; i < configData.length; i++) {
    let key = String(configData[i][0]).trim().toUpperCase(); 
    
    if (key === "ADMIN_USER") {
        validUser = String(configData[i][1]).trim();
    }
    
    if (key === "ADMIN_PASS" || key === "ADMINS_PASS") {
        validPass = String(configData[i][1]).trim();
    }
  }

  if (username === validUser && password === validPass) {
    return { status: 'SUCCESS' };
  } else {
    return { status: 'ERROR', message: 'Username atau Password Salah!' };
  }
}


// ==========================================
// Attendance.gs -  (Logik Kehadiran & Pengesanan)
// ==========================================

//  (Clock-In)
function processScan(payload) {
  const configMasa = CONFIG_SHEET.getRange("B4:B5").getValues();
  const rawStart = configMasa[0][0]; 
  const rawEnd = configMasa[1][0];   

  if (rawStart && rawEnd) {
    const formatTime = (input) => {
      if (input instanceof Date) return Utilities.formatDate(input, "GMT+8", "HH:mm");
      return String(input).trim().substring(0, 5);
    };

    const startTime = formatTime(rawStart);
    const endTime = formatTime(rawEnd);
    const nowStr = Utilities.formatDate(new Date(), "GMT+8", "HH:mm");

    if (nowStr < startTime || nowStr > endTime) {
      return { status: 'ERROR', message: 'GAGAL: Waktu Clock-In sudah TAMAT!\n(' + nowStr + '). Sila guna QR Merah.' };
    }
  }

  const serverToken = CONFIG_SHEET.getRange("B2").getValue();
  if (String(serverToken).trim() !== String(payload.token).trim()) {
    return { status: 'ERROR', message: 'QR Code Tamat Tempoh / Salah Tarikh!' };
  }

  // --- BACA SETTING GEOFENCING ---
  const allConfig = CONFIG_SHEET.getDataRange().getValues();
  let offLat = "", offLng = "", offRad = 0;
  for (let i = 0; i < allConfig.length; i++) {
      let key = String(allConfig[i][0]).trim().toUpperCase();
      if (key === "OFFICE_LAT") offLat = parseFloat(allConfig[i][1]);
      if (key === "OFFICE_LNG") offLng = parseFloat(allConfig[i][1]);
      if (key === "OFFICE_RADIUS") offRad = parseInt(allConfig[i][1]);
  }

  // --- LOGIK HALANGAN RADIUS (GEOFENCING) ---
  if (offLat && offLng && offRad > 0 && !isWfhToday()) {
      if (!payload.lat || !payload.lng) {
          return { status: 'ERROR', message: 'GAGAL: Sila pastikan GPS/Location phone anda dibuka untuk sahkan lokasi pejabat.' };
      }
      
      let distance = getDistanceInMeters(payload.lat, payload.lng, offLat, offLng);
      
      if (distance > offRad) {
          return { status: 'ERROR', message: `GAGAL: Anda berada di luar radius pejabat!\nJarak anda: ${Math.round(distance)}m\nHad Sah: ${offRad}m` };
      }
  }

  const today = new Date();
  const data = LOG_SHEET.getDataRange().getValues();
  
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const rowDate = new Date(row[0]); 
    const rowName = row[2];          
    
    if (rowName === payload.nama && 
        rowDate.getDate() === today.getDate() &&
        rowDate.getMonth() === today.getMonth() &&
        rowDate.getFullYear() === today.getFullYear()) {
        return { status: 'ERROR', message: 'Anda sudah scan kehadiran hari ini! Jumpa esok.' };
    }
  }

  let alamat = "Tiada Lokasi";
  if (payload.lat && payload.lng) {
    try {
      const response = Maps.newGeocoder().reverseGeocode(payload.lat, payload.lng);
      if (response.status === 'OK') alamat = response.results[0].formatted_address;
    } catch (e) {}
  }

  LOG_SHEET.appendRow([
    new Date(),
    payload.token,
    payload.nama, 
    "CLOCK-IN",
    payload.lat + "," + payload.lng,
    alamat,
    payload.ip,
    payload.device,
    "Auto-Scan"
  ]);

  return { status: 'SUCCESS', message: 'Hadir: ' + payload.nama, time: new Date().toLocaleTimeString() };
}

//  (Clock-Out)
function processClockOut(payload) {
  // --- BACA SETTING GEOFENCING ---
  const allConfig = CONFIG_SHEET.getDataRange().getValues();
  let offLat = "", offLng = "", offRad = 0;
  for (let i = 0; i < allConfig.length; i++) {
      let key = String(allConfig[i][0]).trim().toUpperCase();
      if (key === "OFFICE_LAT") offLat = parseFloat(allConfig[i][1]);
      if (key === "OFFICE_LNG") offLng = parseFloat(allConfig[i][1]);
      if (key === "OFFICE_RADIUS") offRad = parseInt(allConfig[i][1]);
  }

  // --- LOGIK HALANGAN RADIUS (GEOFENCING) UNTUK CLOCK-OUT ---
  if (offLat && offLng && offRad > 0 && !isWfhToday()) {
      if (!payload.lat || !payload.lng) {
          return { status: 'ERROR', message: 'GAGAL: Sila pastikan GPS/Location phone anda dibuka untuk sahkan lokasi pejabat.' };
      }
      
      let distance = getDistanceInMeters(payload.lat, payload.lng, offLat, offLng);
      
      if (distance > offRad) {
          return { status: 'ERROR', message: `GAGAL: Anda berada di luar radius pejabat!\nJarak anda: ${Math.round(distance)}m\nHad Sah: ${offRad}m` };
      }
  }

  const data = LOG_SHEET.getDataRange().getValues();
  const today = new Date();
  let foundRowIndex = -1;

  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const rowDate = new Date(row[0]); 
    const rowName = row[2];           
    
    if (rowName === payload.nama && 
        rowDate.getDate() === today.getDate() &&
        rowDate.getMonth() === today.getMonth() &&
        rowDate.getFullYear() === today.getFullYear()) {
       
       foundRowIndex = i + 1; 
       const existingOut = LOG_SHEET.getRange(foundRowIndex, 10).getValue(); 
       
       if (existingOut && existingOut !== "") {
         let masaLama = existingOut instanceof Date ? 
             Utilities.formatDate(existingOut, "Asia/Kuala_Lumpur", "HH:mm") : existingOut;
         return { status: 'WARNING', message: 'Anda sudah Clock-Out sebelum ini pada jam: ' + masaLama };
       }
       break; 
    }
  }

  if (foundRowIndex === -1) {
    return { status: 'ERROR', message: 'RALAT: Anda belum Clock-In hari ini!' };
  }

  const now = new Date();
  const cellOut = LOG_SHEET.getRange(foundRowIndex, 10); 
  cellOut.setValue(now);
  cellOut.setNumberFormat("HH:mm:ss"); 
  
  let alamat = "Tiada Lokasi";
  let koordinat = ""; 

  if (payload.lat && payload.lng) {
    koordinat = payload.lat + ", " + payload.lng; 
    try {
      const response = Maps.newGeocoder().reverseGeocode(payload.lat, payload.lng);
      if (response.status === 'OK') alamat = response.results[0].formatted_address;
    } catch (e) {}
  }
  
  LOG_SHEET.getRange(foundRowIndex, 11).setValue("OUT: " + alamat); 
  LOG_SHEET.getRange(foundRowIndex, 12).setValue(koordinat);        

  const configVal = CONFIG_SHEET.getRange("B6").getValue(); 
  let targetHour = 18;  
  let targetMinute = 0; 
  
  if (configVal instanceof Date) {
    targetHour = configVal.getHours();
    targetMinute = configVal.getMinutes();
  } else if (typeof configVal === 'string' && configVal.includes(":")) {
    let parts = configVal.split(":");
    targetHour = parseInt(parts[0]);
    if (parts.length > 1) targetMinute = parseInt(parts[1]);
  }

  let officialEndTime = new Date();
  officialEndTime.setHours(targetHour, targetMinute, 0, 0);

  let statusKeluar = "CLOCK-OUT"; 

  if (now < officialEndTime) {
      statusKeluar = "CLOCK-OUT AWAL"; 
  }

  LOG_SHEET.getRange(foundRowIndex, 13).setValue(statusKeluar);

  let timeString = Utilities.formatDate(now, "Asia/Kuala_Lumpur", "HH:mm:ss");
  return { status: 'SUCCESS', message: 'Jumpa Esok!', time: timeString };
}

// Helper: Formula Haversine untuk kira jarak sebenar dalam Meter
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371e3; // Radius bumi dalam meter
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const deltaP = (lat2 - lat1) * Math.PI / 180;
  const deltaL = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaP/2) * Math.sin(deltaP/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(deltaL/2) * Math.sin(deltaL/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; 
}

function setStaffLate(namaStaff) {
  const logSheet = SS.getSheetByName("Log_Kehadiran");
  const now = new Date();
  const timeStr = Utilities.formatDate(now, "Asia/Kuala_Lumpur", "HH:mm");
  logSheet.appendRow([ now, "ADMIN-OVERRIDE", namaStaff, "LEWAT (MANUAL)", "", "Ditanda oleh Admin", "Admin Dashboard", "Manual", "Manual Override" ]);
  return "SUCCESS";
}

// ==========================================
// Leave.gs - (Pengurusan Cuti)
// ==========================================

function processCuti(form) {
  const cutiSheet = SS.getSheetByName("Log_Cuti_Lewat");
  const logSheet = SS.getSheetByName("Log_Kehadiran");
  const configSheet = SS.getSheetByName("Config"); 
  
  if (!cutiSheet) {
    let newSheet = SS.insertSheet("Log_Cuti_Lewat");
    newSheet.appendRow(["Timestamp", "Nama_staf", "Jenis_Laporan", "Tarikh_Kejadian", "Sebab/Alasan", "IP_Address", "Status_Lulus", "Lokasi_Koordinat", "Lokasi_Alamat", "Lampiran_Fail"]);
  }

  let startDate = new Date(form.tarikhMula);
  let endDate = new Date(form.tarikhTamat);
  startDate.setHours(0,0,0,0);
  endDate.setHours(0,0,0,0);

  let isLambat = String(form.jenis).includes("Lambat");

  if (isLambat) {
     let today = new Date();
     today.setHours(0,0,0,0);
     startDate = new Date(today);
     endDate = new Date(today);

     const logData = logSheet.getDataRange().getValues();
     for (let i = logData.length - 1; i >= 1; i--) {
        let rowDate = new Date(logData[i][0]);
        let rowName = logData[i][2];
        if (rowName === form.nama && rowDate.getDate() === startDate.getDate() && rowDate.getMonth() === startDate.getMonth() && rowDate.getFullYear() === startDate.getFullYear()) {
            return { status: 'ERROR', message: 'TIDAK SAH: Anda sudah ada rekod kehadiran hari ini!' };
        }
     }
  } 
  else {
     const cutiData = cutiSheet.getDataRange().getValues();
     let tempDate = new Date(startDate);
     while (tempDate <= endDate) {
         let tempTime = tempDate.getTime();
         for (let i = 1; i < cutiData.length; i++) {
             let logNama = cutiData[i][1];
             let logJenis = String(cutiData[i][2]);
             let logTarikh = new Date(cutiData[i][3]); logTarikh.setHours(0,0,0,0);
             let logStatus = cutiData[i][6];
             
             if (logNama === form.nama && logTarikh.getTime() === tempTime && !logJenis.includes("Lambat") && logStatus !== "DITOLAK") {
                 let dStr = Utilities.formatDate(tempDate, "Asia/Kuala_Lumpur", "dd/MM/yyyy");
                 return { status: 'ERROR', message: `RALAT TARIKH: Anda telah membuat permohonan cuti pada tarikh ${dStr} yang sedang Diproses atau telah Diluluskan.` };
             }
         }
         tempDate.setDate(tempDate.getDate() + 1);
     }
  }

  let koordinat = "";
  let alamatMaps = "Tiada Lokasi / GPS Ditutup";
  if (form.lat && form.lng) {
     koordinat = form.lat + ", " + form.lng;
     try {
       const response = Maps.newGeocoder().reverseGeocode(form.lat, form.lng);
       if (response.status === 'OK') {
           alamatMaps = response.results[0].formatted_address;
       }
     } catch (e) {}
  }

  let fileUrl = "Tiada";
  if (form.fileData && form.fileData !== "") {
    try {
      let folderId = configSheet.getRange("B7").getValue().trim(); 
      let folder = DriveApp.getFolderById(folderId);
      
      let decoded = Utilities.base64Decode(form.fileData);
      
      let cleanName = String(form.nama).replace(/[^a-zA-Z0-9]/g, ""); 
      let timeStampNow = Utilities.formatDate(new Date(), "Asia/Kuala_Lumpur", "yyyyMMdd_HHmmss");
      let newFileName = timeStampNow + "_" + cleanName + "_" + form.fileName;
      
      let blob = Utilities.newBlob(decoded, form.mimeType, newFileName);
      let file = folder.createFile(blob);
      
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();
    } catch (e) {
      console.log("Error Upload File: " + e);
      fileUrl = "Error Upload: " + e.message;
    }
  }

  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
      let statusCuti = ""; 
      let insertDateObj = new Date(currentDate);

      if (isLambat) {
        statusCuti = "DILULUSKAN"; 
        let currentNow = new Date(); 
        let injectDate = new Date(currentDate);
        injectDate.setHours(currentNow.getHours(), currentNow.getMinutes(), currentNow.getSeconds());

        logSheet.appendRow([
          injectDate, "AUTO-PORTAL", form.nama, "LEWAT (MANUAL)", koordinat, alamatMaps, form.ip, "Portal Staf", "Sebab: " + form.sebab      
        ]);
      }

      cutiSheet.appendRow([
        new Date(), form.nama, form.jenis, insertDateObj, form.sebab, form.ip, statusCuti, koordinat, alamatMaps, fileUrl
      ]);

      currentDate.setDate(currentDate.getDate() + 1);
  }

  return { status: 'SUCCESS' };
}

function processLeaveStatus(rowIndex, status) {
  const sheet = SS.getSheetByName("Log_Cuti_Lewat");
  sheet.getRange(rowIndex, 7).setValue(status);
  return "SUCCESS";
}

const DATAPREP_SHEET = SS.getSheetByName("dataprep"); 
function getLeaveTypes() {
  const data = DATAPREP_SHEET.getDataRange().getValues();
  let leaveList = ["Datang Lambat 🐢"]; 
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0] !== "") leaveList.push(data[i][0]);
  }
  return leaveList;
}

// ==========================================
// Dashboard.gs - (Paparan Data)
// ==========================================


function getStaffDashboardData(username) {
  try {
    const masterSheet = SS.getSheetByName("Master_Staff");
    const masterData = masterSheet.getDataRange().getValues();
    let profile = { name: "Tetamu", role: "Staff", id: "0000", pic: "https://via.placeholder.com/150" };
    for (let i = 1; i < masterData.length; i++) {
      if (masterData[i][1] == username) {
        profile.id = masterData[i][0]; profile.name = masterData[i][1]; profile.role = masterData[i][2]; profile.pic = masterData[i][3]; break;
      }
    }

    const logSheet = SS.getSheetByName("Log_Kehadiran");
    const lastRowLog = logSheet.getLastRow();
    const startRow = Math.max(2, lastRowLog - 200 + 1); 
    let logData = [];
    if (lastRowLog > 1) logData = logSheet.getRange(startRow, 1, (lastRowLog - startRow + 1), 10).getValues();

    let myLogs = [];
    let todayLog = null;
    let monthlyStats = { present: 0, late: 0, leave: 0 };
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const todayDateString = Utilities.formatDate(today, "Asia/Kuala_Lumpur", "dd/MM/yyyy");

    for (let i = logData.length - 1; i >= 0; i--) {
      if (!logData[i][0] || logData[i][0] === "") continue; 
      
      if (logData[i][2] == username) {
         let d = new Date(logData[i][0]); 
         if (isNaN(d.getTime())) continue; 

         let dateStr = Utilities.formatDate(d, "Asia/Kuala_Lumpur", "dd/MM/yyyy");
         let inStr = Utilities.formatDate(d, "Asia/Kuala_Lumpur", "HH:mm");
         let statusReal = logData[i][3]; 
         
         let masaKeluar = logData[i][9]; let outStr = "--:--";
         if (masaKeluar instanceof Date && !isNaN(masaKeluar.getTime())) {
             outStr = Utilities.formatDate(masaKeluar, "Asia/Kuala_Lumpur", "HH:mm");
         } else if (masaKeluar && String(masaKeluar).includes(":")) {
             outStr = String(masaKeluar).replace("OUT:", "").trim();
         }
         
         if (myLogs.length < 10) {
             myLogs.push({ date: dateStr, status: statusReal, in: inStr, out: outStr });
         }

         if (dateStr === todayDateString && !todayLog) {
             todayLog = { date: dateStr, status: statusReal, in: inStr, out: outStr };
         }

         if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
             monthlyStats.present++;
             if (String(statusReal).toUpperCase().includes("LEWAT")) {
                 monthlyStats.late++;
             }
         }
      }
    }

    const cutiSheet = SS.getSheetByName("Log_Cuti_Lewat");
    const lastRowCuti = cutiSheet.getLastRow();
    let cutiData = [];
    if (lastRowCuti > 1) cutiData = cutiSheet.getRange(2, 1, lastRowCuti - 1, 10).getValues();

    let myLeave = [];
    let latestLeave = null;

    for (let i = cutiData.length - 1; i >= 0; i--) {
      if (!cutiData[i][3] || cutiData[i][3] === "") continue;

      let isLambat = String(cutiData[i][2]).toLowerCase().includes("lambat");
      if (cutiData[i][1] == username && !isLambat) { 
         let d = new Date(cutiData[i][3]); 
         if (isNaN(d.getTime())) continue;

         let dateStr = Utilities.formatDate(d, "Asia/Kuala_Lumpur", "dd/MM/yyyy");
         let statusRaw = cutiData[i][6];
         let linkFail = cutiData[i][9]; 
         if (!statusRaw || statusRaw === "") statusRaw = "DALAM PROSES"; 
         
         let leaveObj = { type: cutiData[i][2], date: dateStr, reason: cutiData[i][4], status: statusRaw, attachment: linkFail };
         myLeave.push(leaveObj);

         if (statusRaw === "DILULUSKAN" && d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
             monthlyStats.leave++;
         }

         if (!latestLeave) {
             latestLeave = leaveObj;
         }
      }
    }
    return { status: 'SUCCESS', profile: profile, attendance: myLogs, leave: myLeave, todayLog: todayLog, monthlyStats: monthlyStats, latestLeave: latestLeave };
  
  } catch(error) {
    return { status: 'ERROR', message: "Ralat Pelayan: " + error.toString() };
  }
}

function getAdminDashboardData(targetDateRaw) {
  let targetDate = new Date();
  let isHistoryMode = false;
  if (targetDateRaw) { targetDate = new Date(targetDateRaw); isHistoryMode = true; }
  const dateStr = Utilities.formatDate(targetDate, "Asia/Kuala_Lumpur", "dd/MM/yyyy");
  
  const masterSheet = SS.getSheetByName("Master_Staff");
  const masterData = masterSheet.getDataRange().getValues();
  let combinedStaffList = new Set();
  
  for (let i = 1; i < masterData.length; i++) {
    let nama = masterData[i][1];
    // Kolom F adalah index 5
    let statusPekerja = masterData[i][5] ? String(masterData[i][5]).trim().toUpperCase() : "";
    
    if (nama && String(nama).trim() !== "") {
        // Sebagai dasar, hanya senaraikan staf yang AKTIF
        if (statusPekerja === "AKTIF") {
            combinedStaffList.add(nama); 
        }
    }
  }

  const logSheet = SS.getSheetByName("Log_Kehadiran");
  const lastRowLog = logSheet.getLastRow();
  const limit = isHistoryMode ? 3000 : 1000; 
  const startRow = Math.max(2, lastRowLog - limit + 1);
  let logData = [];
  if (lastRowLog > 1) logData = logSheet.getRange(startRow, 1, (lastRowLog - startRow + 1), 12).getValues();

  let attendanceMap = {};
  for (let i = 0; i < logData.length; i++) {
    let rowDate = new Date(logData[i][0]);
    let rowDateStr = Utilities.formatDate(rowDate, "Asia/Kuala_Lumpur", "dd/MM/yyyy");
    
    if (rowDateStr === dateStr) {
      let nama = logData[i][2];
      
      // LOGIKA PENTING: Jika staf sudah "Berhenti" tetapi dia MENDAPAT REKOR HADIR di tanggal yang sedang dicek (misalnya admin cek sejarah bulan lalu), namanya akan tetap dimunculkan!
      combinedStaffList.add(nama);
      
      let masaMasukObj = new Date(logData[i][0]);
      let masaMasukStr = Utilities.formatDate(masaMasukObj, "Asia/Kuala_Lumpur", "HH:mm");
      let rawOut = logData[i][9]; let masaKeluarStr = "-";
      if (rawOut instanceof Date) masaKeluarStr = Utilities.formatDate(rawOut, "Asia/Kuala_Lumpur", "HH:mm");
      else if (rawOut && String(rawOut).trim() !== "") masaKeluarStr = String(rawOut).replace("OUT:", "").trim();

      attendanceMap[nama] = {
        masaMasuk: masaMasukStr, masaKeluar: masaKeluarStr, coordsIn: logData[i][4], coordsOut: logData[i][11],
        alamatIn: logData[i][5], alamatOut: logData[i][10], status: logData[i][3]
      };
    }
  }

  const cutiSheet = SS.getSheetByName("Log_Cuti_Lewat");
  const lastRowCuti = cutiSheet.getLastRow();
  let cutiData = [];
  if (lastRowCuti > 1) cutiData = cutiSheet.getRange(2, 1, lastRowCuti - 1, 10).getValues(); 

  let approvedLeaves = []; 
  let cutiTodayCount = 0;  
  const todayReset = new Date(targetDate); todayReset.setHours(0,0,0,0);
  
  let staffOnLeaveToday = {}; 

  for (let i = 0; i < cutiData.length; i++) {
    let tarikhCutiRaw = new Date(cutiData[i][3]);
    let statusLulus = cutiData[i][6]; 
    let jenisLaporan = cutiData[i][2]; 
    let namaStaffCuti = cutiData[i][1];
    let isLambat = String(jenisLaporan).toLowerCase().includes("lambat");
    
    if (statusLulus === "DILULUSKAN" && !isLambat) {
       let tStr = Utilities.formatDate(tarikhCutiRaw, "Asia/Kuala_Lumpur", "yyyy-MM-dd"); 
       approvedLeaves.push({ title: namaStaffCuti, start: tStr, type: jenisLaporan }); 
       
       let tCheck = new Date(tarikhCutiRaw); tCheck.setHours(0,0,0,0);
       if (tCheck.getTime() === todayReset.getTime()) {
           // Hanya dihitung jika staf tersebut ada dalam daftar list hari ini
           if (combinedStaffList.has(namaStaffCuti)) {
               cutiTodayCount++;
               staffOnLeaveToday[namaStaffCuti] = jenisLaporan; 
           }
       }
    }
  }

  let finalAttendanceList = [];
  let presentCount = 0; let lateCount = 0; 
  Array.from(combinedStaffList).sort().forEach(name => {
    if (attendanceMap[name]) {
      presentCount++;
      if(attendanceMap[name].status === "LEWAT (MANUAL)") lateCount++;
      finalAttendanceList.push({
        nama: name, status: attendanceMap[name].status === "LEWAT (MANUAL)" ? "LEWAT" : "HADIR",
        masaMasuk: attendanceMap[name].masaMasuk, masaKeluar: attendanceMap[name].masaKeluar,
        coordsIn: attendanceMap[name].coordsIn, coordsOut: attendanceMap[name].coordsOut,
        alamatIn: attendanceMap[name].alamatIn, alamatOut: attendanceMap[name].alamatOut  
      });
    } else {
      let statusTakHadir = staffOnLeaveToday[name] ? "CUTI - " + staffOnLeaveToday[name] : "TIDAK HADIR";
      
      finalAttendanceList.push({ 
          nama: name, status: statusTakHadir, 
          masaMasuk: "-", masaKeluar: "-", coordsIn: "", coordsOut: "", alamatIn: "", alamatOut: "" 
      });
    }
  });

  let pendingLeaves = [];
  if(!isHistoryMode) {
     for (let i = 0; i < cutiData.length; i++) {
        let tarikhCutiRaw = new Date(cutiData[i][3]); let statusLulus = cutiData[i][6]; let jenisLaporan = cutiData[i][2]; let linkFail = cutiData[i][9]; 
        let todayReal = new Date(); todayReal.setHours(0,0,0,0);
        let isLambat = String(jenisLaporan).toLowerCase().includes("lambat");

        if (tarikhCutiRaw >= todayReal && statusLulus !== "DILULUSKAN" && statusLulus !== "DITOLAK" && !isLambat) {
           let tStr = Utilities.formatDate(tarikhCutiRaw, "Asia/Kuala_Lumpur", "dd/MM/yyyy");
           // Pastikan cuti yang di-pending hanya untuk staf aktif
           if (combinedStaffList.has(cutiData[i][1])) {
               pendingLeaves.push({ rowIndex: i + 2, nama: cutiData[i][1], jenis: cutiData[i][2], tarikh: tStr, sebab: cutiData[i][4], attachment: linkFail });
           }
        }
     }
  }

  return { stats: { totalStaff: combinedStaffList.size, present: presentCount, late: lateCount, cuti: cutiTodayCount, date: dateStr }, attendance: finalAttendanceList, calendarEvents: approvedLeaves, pendingLeaves: pendingLeaves };
}

function getStaffAttendanceByDateRange(username, dateStart, dateEnd) {
    const logSheet = SS.getSheetByName("Log_Kehadiran");
    const lastRowLog = logSheet.getLastRow();
    
    if (lastRowLog <= 1) return [];

    const startRow = Math.max(2, lastRowLog - 1000 + 1); 
    const logData = logSheet.getRange(startRow, 1, (lastRowLog - startRow + 1), 10).getValues();
    
    let targetStart = new Date(dateStart); targetStart.setHours(0,0,0,0);
    let targetEnd = new Date(dateEnd); targetEnd.setHours(23,59,59,999);

    let filteredLogs = [];
    for (let i = logData.length - 1; i >= 0; i--) {
        if (logData[i][2] == username) {
            let rowDate = new Date(logData[i][0]);
            
            if (rowDate >= targetStart && rowDate <= targetEnd) {
                let dateStr = Utilities.formatDate(rowDate, "Asia/Kuala_Lumpur", "dd/MM/yyyy");
                let inStr = Utilities.formatDate(rowDate, "Asia/Kuala_Lumpur", "HH:mm");
                let statusReal = logData[i][3]; 
                let masaKeluar = logData[i][9]; 
                let outStr = "--:--";
                
                if (masaKeluar instanceof Date) outStr = Utilities.formatDate(masaKeluar, "Asia/Kuala_Lumpur", "HH:mm");
                else if (masaKeluar && String(masaKeluar).includes(":")) outStr = String(masaKeluar).replace("OUT:", "").trim();
                
                filteredLogs.push({ date: dateStr, status: statusReal, in: inStr, out: outStr });
            }
        }
    }
    return filteredLogs;
}

function getAllLeaveLog() {
  const sheet = SS.getSheetByName("Log_Cuti_Lewat");
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
  let leaveLog = [];

  for (let i = 0; i < data.length; i++) {
    let jenis = String(data[i][2]);
    if (jenis.toLowerCase().includes("lambat")) continue;

    let timestamp = data[i][0] instanceof Date ? Utilities.formatDate(data[i][0], "Asia/Kuala_Lumpur", "dd/MM/yyyy HH:mm") : data[i][0];
    let rawTarikhCuti = data[i][3];
    let tarikhCutiStr = rawTarikhCuti instanceof Date ? Utilities.formatDate(rawTarikhCuti, "Asia/Kuala_Lumpur", "dd/MM/yyyy") : rawTarikhCuti;
    let sortValue = rawTarikhCuti instanceof Date ? rawTarikhCuti.getTime() : 0;
    
    leaveLog.push({
      timestamp: timestamp,
      nama: data[i][1],
      jenis: jenis,
      tarikhCuti: tarikhCutiStr,
      sebab: data[i][4],
      status: data[i][6] || "PROSES", 
      lampiran: data[i][9] || "",     
      sortTime: sortValue             
    });
  }
  
  leaveLog.sort((a, b) => b.sortTime - a.sortTime);

  return leaveLog;
}

// ==========================================
// StaffManager.gs - (Pengurusan Pekerja)
// ==========================================

function getStaffList() {
  const masterSheet = SS.getSheetByName("Master_Staff");
  const masterData = masterSheet.getDataRange().getValues();
  let staffList = [];
  
  // Mulai dari i=1 untuk melewati baris header
  for (let i = 1; i < masterData.length; i++) {
    let nama = masterData[i][1];
    let statusPekerja = masterData[i][5] ? String(masterData[i][5]).trim().toUpperCase() : "";
    
    // Hanya masukkan ke dropdown portal jika statusnya "AKTIF"
    if (nama && String(nama).trim() !== "" && statusPekerja === "AKTIF") { 
      staffList.push(nama);
    }
  }
  return staffList;
}

function getStaffManagementData() {
  try {
    const ms = SS.getSheetByName("Master_Staff").getDataRange().getValues();
    const us = SS.getSheetByName("Users").getDataRange().getValues();
    let staffList = [];

    for (let i = 1; i < ms.length; i++) {
      let nama = ms[i][1];
      if (!nama || String(nama).trim() === "") continue; 

      staffList.push({
        rowIndex: i + 1, 
        id: ms[i][0] || "-",
        nama: nama,
        jawatan: ms[i][2] || "",
        username: ms[i][4] || "",
        status: ms[i][5] ? String(ms[i][5]).charAt(0).toUpperCase() + String(ms[i][5]).slice(1).toLowerCase() : "Aktif",
        password: (us[i] && us[i][1]) ? us[i][1] : ""
      });
    }
    return { status: 'SUCCESS', data: staffList };
  } catch(e) {
    return { status: 'ERROR', message: "Ralat Pelayan: " + e.toString() };
  }
}

function saveStaffData(payload) {
  try {
    const ms = SS.getSheetByName("Master_Staff");
    const us = SS.getSheetByName("Users");

    if (payload.rowIndex) {
       // KEMASKINI STAF SEDIA ADA
       let r = payload.rowIndex;
       ms.getRange(r, 2).setValue(payload.nama);     // Col B (Nama)
       ms.getRange(r, 3).setValue(payload.jawatan);  // Col C (Jawatan)
       ms.getRange(r, 5).setValue(payload.username); // Col E (Username)
       ms.getRange(r, 6).setValue(payload.status);   // Col F (Status Aktif/Berhenti)

       us.getRange(r, 2).setValue(payload.password); // Col B di Tab Users (Password/IC)
    } else {
       // TAMBAH STAF BARU (Cari baris kosong di Kolum B)
       let msData = ms.getRange("B1:B").getValues();
       let emptyRow = -1;
       for(let i=1; i<msData.length; i++) {
         if(String(msData[i][0]).trim() === "") {
           emptyRow = i + 1;
           break;
         }
       }
       if (emptyRow === -1) emptyRow = msData.length + 1;

       ms.getRange(emptyRow, 2).setValue(payload.nama);
       ms.getRange(emptyRow, 3).setValue(payload.jawatan);
       ms.getRange(emptyRow, 5).setValue(payload.username);
       ms.getRange(emptyRow, 6).setValue(payload.status);

       us.getRange(emptyRow, 2).setValue(payload.password);
    }
    return { status: "SUCCESS", message: "Data staf berjaya disimpan!" };
  } catch (err) {
    return { status: "ERROR", message: "Gagal simpan: " + err.toString() };
  }
}

// ==========================================
// Config.gs - (Tetapan Sistem & QR)
// ==========================================

  // Baca semua tetapan sistem dari sheet Config
  // Dipanggil oleh DashboardAdmin apabila tab Tetapan dibuka
function getSystemConfig() {
  try {
    const configData = CONFIG_SHEET.getDataRange().getValues();
    let conf = {
      startQr: "",
      endQr: "",
      linkFolder: "",
      adminUser: "",
      adminPass: "",
      officeLat: "",
      officeLng: "",
      officeRadius: 0,
      wfhDays: [],       // Array hari WFH tetap, cth: ["Isnin","Jumaat"]
      wfhDates: []       // Array tarikh override WFH, cth: ["2026-04-25","2026-05-01"]
    };

    for (let i = 0; i < configData.length; i++) {
      let key = String(configData[i][0]).trim().toLowerCase();
      let val = configData[i][1];

      if (key === "start-qr") {
        // Nilai masa boleh jadi Date object atau string
        conf.startQr = val instanceof Date
          ? Utilities.formatDate(val, "GMT+8", "HH:mm")
          : String(val).trim().substring(0, 5);
      }
      if (key === "end-qr") {
        conf.endQr = val instanceof Date
          ? Utilities.formatDate(val, "GMT+8", "HH:mm")
          : String(val).trim().substring(0, 5);
      }
      if (key === "link-folder")    conf.linkFolder    = String(val).trim();
      if (key === "admin_user")     conf.adminUser     = String(val).trim();
      if (key === "admin_pass")     conf.adminPass     = String(val).trim();
      if (key === "office_lat")     conf.officeLat     = val ? String(val).trim() : "";
      if (key === "office_lng")     conf.officeLng     = val ? String(val).trim() : "";
      if (key === "office_radius")  conf.officeRadius  = parseInt(val) || 0;

      // Row 16 ke bawah: wfh_days dan wfh_dates
      if (key === "wfh_days") {
        // Simpan sebagai string dipisah koma, cth: "Isnin,Jumaat"
        let raw = String(val).trim();
        conf.wfhDays = raw !== "" ? raw.split(",").map(d => d.trim()) : [];
      }
      if (key === "wfh_dates") {
        // Simpan sebagai string dipisah koma, cth: "2026-04-25,2026-05-01"
        let raw = String(val).trim();
        conf.wfhDates = raw !== "" ? raw.split(",").map(d => d.trim()).filter(d => d !== "") : [];
      }
    }

    return { status: "SUCCESS", data: conf };
  } catch (e) {
    return { status: "ERROR", message: "Gagal baca config: " + e.toString() };
  }
}

 // Simpan semua tetapan sistem ke sheet Config
 // Dipanggil apabila admin tekan "Simpan Semua Perubahan" 
function saveSystemConfig(payload) {
  try {
    // Guna lock supaya elak race condition
    const lock = LockService.getScriptLock();
    lock.tryLock(10000);

    // Tulis nilai satu per satu mengikut cell yang ditetapkan
    // B4 = start-qr
    CONFIG_SHEET.getRange("B4").setValue(payload.startQr);

    // B5 = end-qr
    CONFIG_SHEET.getRange("B5").setValue(payload.endQr);

    // B7 = link-folder
    CONFIG_SHEET.getRange("B7").setValue(payload.linkFolder);

    // B8 = admin_user
    CONFIG_SHEET.getRange("B8").setValue(payload.adminUser);

    // B9 = admin_pass (hanya kemaskini jika ada nilai baru, elak kosongkan)
    if (payload.adminPass && payload.adminPass.trim() !== "") {
      CONFIG_SHEET.getRange("B9").setValue(payload.adminPass);
    }

    // B13 = OFFICE_LAT
    CONFIG_SHEET.getRange("B13").setValue(payload.officeLat !== "" ? parseFloat(payload.officeLat) : "");

    // B14 = OFFICE_LNG
    CONFIG_SHEET.getRange("B14").setValue(payload.officeLng !== "" ? parseFloat(payload.officeLng) : "");

    // B15 = OFFICE_RADIUS
    CONFIG_SHEET.getRange("B15").setValue(parseInt(payload.officeRadius) || 0);

    // B16 = wfh_days — pastikan row 16 ada key "wfh_days"
    // Semak dulu sama ada row 16 wujud dengan key betul
    _ensureConfigRow("wfh_days", 16);
    CONFIG_SHEET.getRange("B16").setValue(
      Array.isArray(payload.wfhDays) ? payload.wfhDays.join(",") : ""
    );

    // B17 = wfh_dates — tarikh override
    _ensureConfigRow("wfh_dates", 17);
    CONFIG_SHEET.getRange("B17").setValue(
      Array.isArray(payload.wfhDates) ? payload.wfhDates.join(",") : ""
    );

    lock.releaseLock();

    return { status: "SUCCESS", message: "Tetapan sistem berjaya disimpan!" };
  } catch (e) {
    return { status: "ERROR", message: "Gagal simpan tetapan: " + e.toString() };
  }
}


 // Helper: Pastikan row tertentu ada key yang betul di kolum A
 // Jika kosong, tulis key tersebut
function _ensureConfigRow(keyName, rowNum) {
  try {
    let existingKey = String(CONFIG_SHEET.getRange(rowNum, 1).getValue()).trim().toLowerCase();
    if (existingKey === "" || existingKey !== keyName.toLowerCase()) {
      CONFIG_SHEET.getRange(rowNum, 1).setValue(keyName);
    }
  } catch(e) {
    // Abaikan jika row tak wujud, spreadsheet akan create sendiri
  }
}

//   Semak sama ada hari ini adalah hari WFH
//  (berdasarkan wfh_days dan wfh_dates dalam Config)
//   Fungsi ini boleh digunakan oleh processScan jika perlu
function isWfhToday() {
  try {
    const configData = CONFIG_SHEET.getDataRange().getValues();
    let wfhDays = [];
    let wfhDates = [];

    for (let i = 0; i < configData.length; i++) {
      let key = String(configData[i][0]).trim().toLowerCase();
      let val = String(configData[i][1]).trim();
      if (key === "wfh_days" && val !== "") {
        wfhDays = val.split(",").map(d => d.trim().toLowerCase());
      }
      if (key === "wfh_dates" && val !== "") {
        wfhDates = val.split(",").map(d => d.trim());
      }
    }

    const today = new Date();
    const dayNames = ["ahad","isnin","selasa","rabu","khamis","jumaat","sabtu"];
    const todayName = dayNames[today.getDay()];
    const todayStr = Utilities.formatDate(today, "Asia/Kuala_Lumpur", "yyyy-MM-dd");

    // Semak hari tetap
    if (wfhDays.includes(todayName)) return true;

    // Semak tarikh override
    if (wfhDates.includes(todayStr)) return true;

    return false;
  } catch(e) {
    return false;
  }
}

function getDailyToken() {
  var token = CONFIG_SHEET.getRange("B2").getValue();
  if (token == "") {
    token = generateNewToken();
  }
  return token;
}

function generateNewToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
  let randomString = '';
  
  for (let i = 0; i < 8; i++) {
    randomString += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const newToken = randomString.substring(0, 4) + "-" + randomString.substring(4, 8);
  
  CONFIG_SHEET.getRange("B2").setValue(newToken); 
  CONFIG_SHEET.getRange("B3").setValue(new Date()); 
  
  console.log("Token Baru Dijana: " + newToken);
  return newToken;
}

function getDashboardStatus() {
  const configData = CONFIG_SHEET.getRange("B2:B5").getValues();
  let token = configData[0][0];       
  let startTime = configData[2][0];   
  let endTime = configData[3][0];     

  if (token == "") {
    token = generateNewToken();
  }

  let isOpen = true; 
  let message = "";

  if (startTime && endTime) {
    const now = new Date();
    const nowStr = Utilities.formatDate(now, "GMT+8", "HH:mm");
    
    if (nowStr >= startTime && nowStr <= endTime) {
      isOpen = true;
    } else {
      isOpen = false;
      message = (nowStr < startTime) ? "SESI BELUM MULA" : "TAMAT";
    }
  }

  return { token: token, isOpen: isOpen, statusMsg: message };
}
