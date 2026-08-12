const SHEETS = Object.freeze({
  INVITATIONS: "INVITACIONES",
  ATTENDEES: "ASISTENTES",
  RESPONSES: "RESPUESTAS",
  ACCESS: "ACCESOS"
});

const HEADERS = Object.freeze({
  INVITACIONES: ["ID", "CODIGO", "NOMBRE_PRINCIPAL", "EMAIL", "TELEFONO", "ESTADO", "FECHA_RESPUESTA", "ACTIVO", "CREADO_EN", "ACTUALIZADO_EN"],
  ASISTENTES: ["ID", "INVITACION_ID", "NOMBRE", "TIPO", "RESPUESTA", "ACTIVO", "CREADO_EN", "ACTUALIZADO_EN"],
  RESPUESTAS: ["ID", "INVITACION_ID", "RESPUESTA_PRINCIPAL", "TOTAL_SI", "TOTAL_NO", "FECHA"],
  ACCESOS: ["ID", "INVITACION_ID", "RESULTADO", "FECHA"]
});

/**
 * Ejecuta esta función una sola vez desde el editor de Apps Script.
 * Sustituye los cuatro valores del ejemplo antes de ejecutarla.
 */
function configurarProyecto() {
  setupProject_(
    "ID_DE_TU_GOOGLE_SHEETS",
    "administrador",
    "CAMBIA_ESTA_CONTRASENA",
    "https://TU_USUARIO.github.io"
  );
}

function setupProject_(spreadsheetId, adminUser, adminPassword, allowedOrigins) {
  if (!spreadsheetId || spreadsheetId.indexOf("ID_DE_") === 0) throw new Error("Configura el ID real del archivo de Google Sheets.");
  if (!adminUser || adminUser.length < 4) throw new Error("El usuario administrativo debe tener al menos 4 caracteres.");
  if (!adminPassword || adminPassword.length < 10 || adminPassword.indexOf("CAMBIA_") === 0) {
    throw new Error("Usa una contraseña administrativa de al menos 10 caracteres.");
  }

  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  Object.keys(HEADERS).forEach(function (sheetName) {
    ensureSheet_(spreadsheet, sheetName, HEADERS[sheetName]);
  });

  const salt = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperties({
    SPREADSHEET_ID: spreadsheetId,
    ADMIN_USER: normalizeUsername_(adminUser),
    ADMIN_SALT: salt,
    ADMIN_HASH: hashPassword_(adminPassword, salt),
    ALLOWED_ORIGINS: String(allowedOrigins || "").trim()
  }, true);
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Bridge")
    .setTitle("Servicio de invitaciones")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getPublicConfig() {
  const raw = PropertiesService.getScriptProperties().getProperty("ALLOWED_ORIGINS") || "";
  return {
    allowedOrigins: raw.split(",").map(function (value) { return value.trim().replace(/\/$/, ""); }).filter(Boolean)
  };
}

function dispatch(action, payload) {
  payload = payload || {};
  switch (action) {
    case "getInvitation": return getInvitation_(payload);
    case "saveMainResponse": return saveMainResponse_(payload);
    case "saveAttendees": return saveAttendees_(payload);
    case "adminLogin": return adminLogin_(payload);
    case "adminDashboard": return adminDashboard_(payload);
    case "adminCreateInvitation": return adminCreateInvitation_(payload);
    default: throw new Error("La acción solicitada no está permitida.");
  }
}

function getInvitation_(payload) {
  const code = normalizeCode_(payload.code);
  if (code.length < 6) throw new Error("La clave ingresada no es válida.");

  const invitation = findInvitationByCode_(code);
  if (!invitation || !asBoolean_(invitation.ACTIVO)) {
    logAccess_(invitation ? invitation.ID : "", "CLAVE_NO_VALIDA");
    throw new Error("No encontramos una invitación activa con esa clave.");
  }

  logAccess_(invitation.ID, "ACCESO_CORRECTO");
  return invitationPublicModel_(invitation);
}

function saveMainResponse_(payload) {
  const invitationId = cleanText_(payload.invitationId, 80);
  const response = normalizeResponse_(payload.response);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const invitation = findObjectBy_(SHEETS.INVITATIONS, "ID", invitationId);
    if (!invitation || !asBoolean_(invitation.ACTIVO)) throw new Error("La invitación ya no está disponible.");

    const now = new Date();
    updateObjectRow_(SHEETS.INVITATIONS, invitation._row, {
      ESTADO: response,
      FECHA_RESPUESTA: now,
      ACTUALIZADO_EN: now
    });

    const attendees = objects_(SHEETS.ATTENDEES).filter(function (item) {
      return item.INVITACION_ID === invitationId && asBoolean_(item.ACTIVO);
    });
    attendees.forEach(function (attendee) {
      if (attendee.TIPO === "PRINCIPAL" || response === "NO") {
        updateObjectRow_(SHEETS.ATTENDEES, attendee._row, { RESPUESTA: response, ACTUALIZADO_EN: now });
      }
    });

    if (response === "NO") appendResponseSnapshot_(invitationId, "NO");
    const updated = findObjectBy_(SHEETS.INVITATIONS, "ID", invitationId);
    return { saved: true, invitation: invitationPublicModel_(updated) };
  } finally {
    lock.releaseLock();
  }
}

function saveAttendees_(payload) {
  const invitationId = cleanText_(payload.invitationId, 80);
  const selections = Array.isArray(payload.attendees) ? payload.attendees : [];
  if (!selections.length) throw new Error("Debes confirmar al menos una persona.");

  const requested = {};
  selections.forEach(function (selection) {
    requested[cleanText_(selection.id, 80)] = normalizeResponse_(selection.response);
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const invitation = findObjectBy_(SHEETS.INVITATIONS, "ID", invitationId);
    if (!invitation || !asBoolean_(invitation.ACTIVO)) throw new Error("La invitación ya no está disponible.");

    const attendees = objects_(SHEETS.ATTENDEES).filter(function (item) {
      return item.INVITACION_ID === invitationId && asBoolean_(item.ACTIVO);
    });
    if (!attendees.length) throw new Error("No encontramos asistentes vinculados a esta invitación.");

    const now = new Date();
    attendees.forEach(function (attendee) {
      if (!Object.prototype.hasOwnProperty.call(requested, attendee.ID)) {
        throw new Error("Debes indicar la asistencia de cada persona del grupo.");
      }
      updateObjectRow_(SHEETS.ATTENDEES, attendee._row, {
        RESPUESTA: requested[attendee.ID],
        ACTUALIZADO_EN: now
      });
    });

    updateObjectRow_(SHEETS.INVITATIONS, invitation._row, {
      ESTADO: "SI",
      FECHA_RESPUESTA: now,
      ACTUALIZADO_EN: now
    });
    appendResponseSnapshot_(invitationId, "SI");
    return { saved: true };
  } finally {
    lock.releaseLock();
  }
}

function adminLogin_(payload) {
  const properties = PropertiesService.getScriptProperties();
  const username = normalizeUsername_(payload.username);
  const password = String(payload.password || "");
  const expectedUser = properties.getProperty("ADMIN_USER");
  const salt = properties.getProperty("ADMIN_SALT");
  const expectedHash = properties.getProperty("ADMIN_HASH");

  if (!expectedUser || !salt || !expectedHash) throw new Error("El administrador todavía no ha sido configurado.");
  const validUser = constantTimeEquals_(username, expectedUser);
  const validPassword = constantTimeEquals_(hashPassword_(password, salt), expectedHash);
  if (!validUser || !validPassword) throw new Error("Usuario o contraseña incorrectos.");

  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put("admin-session:" + token, expectedUser, 21600);
  return { token: token, username: expectedUser };
}

function adminDashboard_(payload) {
  requireAdmin_(payload.token);
  const invitations = objects_(SHEETS.INVITATIONS).filter(function (item) { return asBoolean_(item.ACTIVO); });
  const attendees = objects_(SHEETS.ATTENDEES).filter(function (item) { return asBoolean_(item.ACTIVO); });
  const attendeeCount = {};
  attendees.forEach(function (item) { attendeeCount[item.INVITACION_ID] = (attendeeCount[item.INVITACION_ID] || 0) + 1; });

  return {
    total: invitations.length,
    confirmed: invitations.filter(function (item) { return item.ESTADO === "SI"; }).length,
    declined: invitations.filter(function (item) { return item.ESTADO === "NO"; }).length,
    pending: invitations.filter(function (item) { return item.ESTADO === "PENDIENTE"; }).length,
    invitations: invitations.map(function (item) {
      return {
        id: item.ID,
        code: item.CODIGO,
        primaryName: item.NOMBRE_PRINCIPAL,
        status: item.ESTADO,
        active: true,
        attendeeCount: attendeeCount[item.ID] || 0,
        respondedAt: dateToIso_(item.FECHA_RESPUESTA)
      };
    }).reverse()
  };
}

function adminCreateInvitation_(payload) {
  requireAdmin_(payload.token);
  const primaryName = cleanText_(payload.primaryName, 120);
  const email = cleanText_(payload.email, 160);
  const phone = cleanText_(payload.phone, 40);
  const companions = (Array.isArray(payload.companions) ? payload.companions : [])
    .map(function (name) { return cleanText_(name, 120); })
    .filter(Boolean);

  if (primaryName.length < 2) throw new Error("Ingresa el nombre del invitado principal.");
  if (companions.length > 20) throw new Error("Una invitación puede contener máximo 20 acompañantes.");

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const invitationId = Utilities.getUuid();
    const code = generateUniqueCode_();
    const now = new Date();
    sheet_(SHEETS.INVITATIONS).appendRow([
      invitationId, code, primaryName, email, phone, "PENDIENTE", "", true, now, now
    ]);

    const allNames = [primaryName].concat(companions);
    const attendeeRows = allNames.map(function (name, index) {
      return [Utilities.getUuid(), invitationId, name, index === 0 ? "PRINCIPAL" : "ACOMPANANTE", "PENDIENTE", true, now, now];
    });
    if (attendeeRows.length) {
      const attendeeSheet = sheet_(SHEETS.ATTENDEES);
      attendeeSheet.getRange(attendeeSheet.getLastRow() + 1, 1, attendeeRows.length, HEADERS.ASISTENTES.length).setValues(attendeeRows);
    }

    return {
      code: code,
      invitation: { id: invitationId, primaryName: primaryName }
    };
  } finally {
    lock.releaseLock();
  }
}

function invitationPublicModel_(invitation) {
  const attendees = objects_(SHEETS.ATTENDEES).filter(function (item) {
    return item.INVITACION_ID === invitation.ID && asBoolean_(item.ACTIVO);
  });
  return {
    id: invitation.ID,
    primaryName: invitation.NOMBRE_PRINCIPAL,
    status: invitation.ESTADO,
    attendees: attendees.map(function (item) {
      return { id: item.ID, name: item.NOMBRE, type: item.TIPO, response: item.RESPUESTA };
    })
  };
}

function appendResponseSnapshot_(invitationId, primaryResponse) {
  const attendees = objects_(SHEETS.ATTENDEES).filter(function (item) {
    return item.INVITACION_ID === invitationId && asBoolean_(item.ACTIVO);
  });
  const yes = attendees.filter(function (item) { return item.RESPUESTA === "SI"; }).length;
  const no = attendees.filter(function (item) { return item.RESPUESTA === "NO"; }).length;
  sheet_(SHEETS.RESPONSES).appendRow([Utilities.getUuid(), invitationId, primaryResponse, yes, no, new Date()]);
}

function logAccess_(invitationId, result) {
  sheet_(SHEETS.ACCESS).appendRow([Utilities.getUuid(), invitationId || "", result, new Date()]);
}

function requireAdmin_(token) {
  const normalized = cleanText_(token, 120);
  if (!normalized || !CacheService.getScriptCache().get("admin-session:" + normalized)) {
    throw new Error("La sesión administrativa venció. Ingresa nuevamente.");
  }
}

function generateUniqueCode_() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let code = "";
    const source = Utilities.getUuid().replace(/-/g, "").toUpperCase();
    for (let index = 0; index < 8; index += 1) {
      const value = parseInt(source.charAt(index), 16);
      code += alphabet.charAt((value + index * 7) % alphabet.length);
    }
    if (!findInvitationByCode_(code)) return code;
  }
  throw new Error("No fue posible generar un código único. Intenta nuevamente.");
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#4d3478").setFontColor("#ffffff");
    sheet.autoResizeColumns(1, headers.length);
  }
}

function spreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("El proyecto todavía no está conectado con Google Sheets.");
  return SpreadsheetApp.openById(id);
}

function sheet_(name) {
  const sheet = spreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error("No existe la hoja requerida: " + name);
  return sheet;
}

function objects_(sheetName) {
  const sheet = sheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(function (row) { return row.some(function (value) { return value !== ""; }); }).map(function (row, index) {
    const object = { _row: index + 2 };
    headers.forEach(function (header, column) { object[header] = row[column]; });
    return object;
  });
}

function findObjectBy_(sheetName, field, value) {
  return objects_(sheetName).find(function (item) { return String(item[field]) === String(value); }) || null;
}

function findInvitationByCode_(code) {
  return objects_(SHEETS.INVITATIONS).find(function (item) { return normalizeCode_(item.CODIGO) === code; }) || null;
}

function updateObjectRow_(sheetName, rowNumber, changes) {
  const sheet = sheet_(sheetName);
  const headers = HEADERS[sheetName];
  Object.keys(changes).forEach(function (field) {
    const column = headers.indexOf(field) + 1;
    if (column > 0) sheet.getRange(rowNumber, column).setValue(changes[field]);
  });
}

function normalizeCode_(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

function normalizeUsername_(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 60);
}

function normalizeResponse_(value) {
  const response = String(value || "").trim().toUpperCase();
  if (response !== "SI" && response !== "NO") throw new Error("La respuesta seleccionada no es válida.");
  return response;
}

function cleanText_(value, maxLength) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, maxLength || 200);
}

function asBoolean_(value) {
  return value === true || String(value).toUpperCase() === "TRUE" || String(value).toUpperCase() === "SI";
}

function dateToIso_(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function hashPassword_(password, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(salt) + "::" + String(password), Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes);
}

function constantTimeEquals_(left, right) {
  left = String(left || "");
  right = String(right || "");
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index % Math.max(left.length, 1)) || 0) ^ (right.charCodeAt(index % Math.max(right.length, 1)) || 0);
  }
  return difference === 0;
}
