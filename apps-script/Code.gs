const SHEETS = Object.freeze({
  INVITATIONS: "INVITACIONES",
  ATTENDEES: "ASISTENTES",
  RESPONSES: "RESPUESTAS",
  ACCESS: "ACCESOS"
});

const HEADERS = Object.freeze({
  INVITACIONES: ["ID", "CODIGO", "NOMBRE_PRINCIPAL", "EMAIL", "TELEFONO", "ESTADO", "FECHA_RESPUESTA", "ACTIVO", "CREADO_EN", "ACTUALIZADO_EN", "TRATAMIENTO", "MESA", "SALUDO", "TIPO_TARJETA"],
  ASISTENTES: ["ID", "INVITACION_ID", "NOMBRE", "TIPO", "RESPUESTA", "ACTIVO", "CREADO_EN", "ACTUALIZADO_EN", "MESA"],
  RESPUESTAS: ["ID", "INVITACION_ID", "RESPUESTA_PRINCIPAL", "TOTAL_SI", "TOTAL_NO", "FECHA"],
  ACCESOS: ["ID", "INVITACION_ID", "RESULTADO", "FECHA"]
});

const PUBLIC_CACHE_SECONDS = 1800;
const HIGHLIGHTED_CONSTELLATION_NAME = "LINA SOFIA";

/** Solo para configurar un proyecto nuevo o cambiar credenciales. */
function configurarProyecto() {
  setupProject_(
    "ID_DE_TU_GOOGLE_SHEETS",
    "administrador",
    "CAMBIA_ESTA_CONTRASENA",
    "https://TU_USUARIO.github.io"
  );
}

/** Comprobación manual opcional. La aplicación también la ejecuta automáticamente. */
function actualizarEstructura() {
  const spreadsheet = spreadsheet_();
  Object.keys(HEADERS).forEach(function (sheetName) {
    ensureSheet_(spreadsheet, sheetName, HEADERS[sheetName]);
  });
  return "Estructura actualizada correctamente.";
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
    allowedOrigins: raw.split(",").map(function (value) {
      return value.trim().replace(/\/$/, "");
    }).filter(Boolean)
  };
}

function dispatch(action, payload) {
  payload = payload || {};
  if (action !== "adminLogin") ensureProjectStructure_();
  switch (action) {
    case "getInvitation": return getInvitation_(payload);
    case "saveMainResponse": return saveMainResponse_(payload);
    case "saveAttendees": return saveAttendees_(payload);
    case "adminLogin": return adminLogin_(payload);
    case "adminDashboard": return adminDashboard_(payload);
    case "adminCreateInvitation": return adminCreateInvitation_(payload);
    case "adminUpdateInvitation": return adminUpdateInvitation_(payload);
    case "adminDeleteInvitation": return adminDeleteInvitation_(payload);
    default: throw new Error("La acción solicitada no está permitida.");
  }
}

function getInvitation_(payload) {
  const code = normalizeCode_(payload.code);
  if (code.length < 6) throw new Error("La clave ingresada no es válida.");
  const cache = CacheService.getScriptCache();
  const cached = cache.get(invitationCacheKey_(code));
  if (cached) return JSON.parse(cached);

  const invitation = findInvitationByCode_(code);
  if (!invitation || !asBoolean_(invitation.ACTIVO)) {
    logAccessOnce_(invitation ? invitation.ID : "", "CLAVE_NO_VALIDA", code);
    throw new Error("No encontramos una invitación activa con esa clave.");
  }
  const attendees = objects_(SHEETS.ATTENDEES).filter(function (item) {
    return item.INVITACION_ID === invitation.ID && asBoolean_(item.ACTIVO);
  });
  const model = invitationPublicModel_(invitation, attendees);
  cache.put(invitationCacheKey_(code), JSON.stringify(model), PUBLIC_CACHE_SECONDS);
  logAccessOnce_(invitation.ID, "ACCESO_CORRECTO", code);
  return model;
}

function saveMainResponse_(payload) {
  const invitationId = cleanText_(payload.invitationId, 80);
  const response = normalizeResponse_(payload.response);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const invitation = objects_(SHEETS.INVITATIONS).find(function (item) { return item.ID === invitationId; });
    if (!invitation || !asBoolean_(invitation.ACTIVO)) throw new Error("La invitación ya no está disponible.");
    requireInvitationAccess_(invitation, payload.code);
    const allAttendees = objects_(SHEETS.ATTENDEES).filter(function (item) { return asBoolean_(item.ACTIVO); });
    const attendees = allAttendees.filter(function (item) {
      return item.INVITACION_ID === invitationId && asBoolean_(item.ACTIVO);
    });
    const now = new Date();
    updateObjectRow_(SHEETS.INVITATIONS, invitation._row, { ESTADO: response, FECHA_RESPUESTA: now, ACTUALIZADO_EN: now });
    invitation.ESTADO = response;
    invitation.FECHA_RESPUESTA = now;
    const attendeeChanges = [];
    attendees.forEach(function (attendee) {
      if (attendee.TIPO === "PRINCIPAL" || response === "NO") {
        attendee.RESPUESTA = response;
        attendee.ACTUALIZADO_EN = now;
        attendeeChanges.push({ row: attendee._row, changes: { RESPUESTA: response, ACTUALIZADO_EN: now } });
      }
    });
    batchUpdateObjectRows_(SHEETS.ATTENDEES, attendeeChanges);
    if (response === "NO") appendResponseSnapshot_(invitationId, "NO", attendees);
    invalidateInvitationCache_(invitation.CODIGO);
    return {
      saved: true,
      invitation: invitationPublicModel_(invitation, attendees),
      constellation: constellationModel_(allAttendees)
    };
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
  lock.waitLock(30000);
  try {
    const invitation = objects_(SHEETS.INVITATIONS).find(function (item) { return item.ID === invitationId; });
    if (!invitation || !asBoolean_(invitation.ACTIVO)) throw new Error("La invitación ya no está disponible.");
    requireInvitationAccess_(invitation, payload.code);
    const allAttendees = objects_(SHEETS.ATTENDEES).filter(function (item) { return asBoolean_(item.ACTIVO); });
    const attendees = allAttendees.filter(function (item) {
      return item.INVITACION_ID === invitationId && asBoolean_(item.ACTIVO);
    });
    if (!attendees.length) throw new Error("No encontramos asistentes vinculados a esta invitación.");
    attendees.forEach(function (attendee) {
      if (!Object.prototype.hasOwnProperty.call(requested, attendee.ID)) {
        throw new Error("Debes indicar la asistencia de cada persona del grupo.");
      }
    });

    const now = new Date();
    const attendeeChanges = [];
    attendees.forEach(function (attendee) {
      attendee.RESPUESTA = requested[attendee.ID];
      attendee.ACTUALIZADO_EN = now;
      attendeeChanges.push({ row: attendee._row, changes: { RESPUESTA: attendee.RESPUESTA, ACTUALIZADO_EN: now } });
    });
    batchUpdateObjectRows_(SHEETS.ATTENDEES, attendeeChanges);
    updateObjectRow_(SHEETS.INVITATIONS, invitation._row, { ESTADO: "SI", FECHA_RESPUESTA: now, ACTUALIZADO_EN: now });
    invitation.ESTADO = "SI";
    invitation.FECHA_RESPUESTA = now;
    appendResponseSnapshot_(invitationId, "SI", attendees);
    invalidateInvitationCache_(invitation.CODIGO);
    const publicInvitation = invitationPublicModel_(invitation, attendees);
    publicInvitation.tableName = invitation.MESA || "";
    return {
      saved: true,
      tableName: invitation.MESA || "",
      invitation: publicInvitation,
      constellation: constellationModel_(allAttendees)
    };
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
  const attendeesByInvitation = {};
  attendees.forEach(function (item) {
    if (!attendeesByInvitation[item.INVITACION_ID]) attendeesByInvitation[item.INVITACION_ID] = [];
    attendeesByInvitation[item.INVITACION_ID].push(item);
  });
  const totals = responseCounts_(attendees);
  return {
    invitationTotal: invitations.length,
    attendeeTotal: attendees.length,
    confirmed: totals.yes,
    declined: totals.no,
    pending: totals.pending,
    invitations: invitations.map(function (item) {
      const group = attendeesByInvitation[item.ID] || [];
      return {
        id: item.ID,
        code: item.CODIGO,
        primaryName: item.NOMBRE_PRINCIPAL,
        email: item.EMAIL || "",
        phone: item.TELEFONO || "",
        honorific: honorificModel_(item.SALUDO),
        salutationDetail: item.TRATAMIENTO || "",
        tableName: item.MESA || "",
        cardType: cardTypeModel_(item.TIPO_TARJETA),
        status: item.ESTADO || "PENDIENTE",
        attendeeCount: group.length,
        counts: responseCounts_(group),
        attendees: group.map(function (attendee) {
          return {
            id: attendee.ID,
            name: attendee.NOMBRE,
            type: attendee.TIPO,
            response: attendee.RESPUESTA || "PENDIENTE",
            tableName: attendee.MESA || item.MESA || ""
          };
        }),
        respondedAt: dateToIso_(item.FECHA_RESPUESTA)
      };
    }).reverse()
  };
}

function adminCreateInvitation_(payload) {
  requireAdmin_(payload.token);
  const data = validateInvitationInput_(payload);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const invitationId = Utilities.getUuid();
    const code = generateUniqueCode_();
    const now = new Date();
    appendObjectRow_(SHEETS.INVITATIONS, {
      ID: invitationId, CODIGO: code, NOMBRE_PRINCIPAL: data.primaryName,
      EMAIL: data.email, TELEFONO: data.phone, ESTADO: "PENDIENTE",
      FECHA_RESPUESTA: "", ACTIVO: true, CREADO_EN: now, ACTUALIZADO_EN: now,
      TRATAMIENTO: data.salutationDetail, MESA: data.tableName,
      SALUDO: data.honorific, TIPO_TARJETA: data.cardType
    });
    const rows = [data.primaryName].concat(data.companions).map(function (name, index) {
      return objectRowValues_(SHEETS.ATTENDEES, {
        ID: Utilities.getUuid(), INVITACION_ID: invitationId, NOMBRE: name,
        TIPO: index === 0 ? "PRINCIPAL" : "ACOMPANANTE", RESPUESTA: "PENDIENTE",
        ACTIVO: true, CREADO_EN: now, ACTUALIZADO_EN: now, MESA: data.tableName
      });
    });
    appendRows_(SHEETS.ATTENDEES, rows);
    return { code: code, invitation: { id: invitationId, primaryName: data.primaryName } };
  } finally {
    lock.releaseLock();
  }
}

function adminUpdateInvitation_(payload) {
  requireAdmin_(payload.token);
  const invitationId = cleanText_(payload.invitationId, 80);
  const data = validateInvitationInput_(payload);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const invitation = objects_(SHEETS.INVITATIONS).find(function (item) { return item.ID === invitationId; });
    if (!invitation || !asBoolean_(invitation.ACTIVO)) throw new Error("La invitación ya no existe o fue eliminada.");
    const now = new Date();
    updateObjectRow_(SHEETS.INVITATIONS, invitation._row, {
      NOMBRE_PRINCIPAL: data.primaryName, EMAIL: data.email, TELEFONO: data.phone,
      TRATAMIENTO: data.salutationDetail, MESA: data.tableName,
      SALUDO: data.honorific, TIPO_TARJETA: data.cardType, ACTUALIZADO_EN: now
    });

    const group = objects_(SHEETS.ATTENDEES).filter(function (item) {
      return item.INVITACION_ID === invitationId && asBoolean_(item.ACTIVO);
    });
    const principal = group.find(function (item) { return item.TIPO === "PRINCIPAL"; });
    const attendeeChanges = [];
    if (principal) {
      attendeeChanges.push({ row: principal._row, changes: { NOMBRE: data.primaryName, MESA: data.tableName, ACTUALIZADO_EN: now } });
    } else {
      appendObjectRow_(SHEETS.ATTENDEES, {
        ID: Utilities.getUuid(), INVITACION_ID: invitationId, NOMBRE: data.primaryName,
        TIPO: "PRINCIPAL", RESPUESTA: "PENDIENTE", ACTIVO: true,
        CREADO_EN: now, ACTUALIZADO_EN: now, MESA: data.tableName
      });
    }

    const unused = group.filter(function (item) { return item.TIPO !== "PRINCIPAL"; });
    const newRows = [];
    data.companions.forEach(function (name) {
      const key = normalizeName_(name);
      const matchIndex = unused.findIndex(function (item) { return normalizeName_(item.NOMBRE) === key; });
      if (matchIndex >= 0) {
        const attendee = unused.splice(matchIndex, 1)[0];
        attendeeChanges.push({ row: attendee._row, changes: { NOMBRE: name, MESA: data.tableName, ACTUALIZADO_EN: now } });
      } else {
        newRows.push(objectRowValues_(SHEETS.ATTENDEES, {
          ID: Utilities.getUuid(), INVITACION_ID: invitationId, NOMBRE: name,
          TIPO: "ACOMPANANTE", RESPUESTA: "PENDIENTE", ACTIVO: true,
          CREADO_EN: now, ACTUALIZADO_EN: now, MESA: data.tableName
        }));
      }
    });
    unused.forEach(function (attendee) {
      attendeeChanges.push({ row: attendee._row, changes: { ACTIVO: false, ACTUALIZADO_EN: now } });
    });
    batchUpdateObjectRows_(SHEETS.ATTENDEES, attendeeChanges);
    appendRows_(SHEETS.ATTENDEES, newRows);
    invalidateInvitationCache_(invitation.CODIGO);
    return { updated: true, code: invitation.CODIGO };
  } finally {
    lock.releaseLock();
  }
}

function adminDeleteInvitation_(payload) {
  requireAdmin_(payload.token);
  const invitationId = cleanText_(payload.invitationId, 80);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const invitation = objects_(SHEETS.INVITATIONS).find(function (item) { return item.ID === invitationId; });
    if (!invitation || !asBoolean_(invitation.ACTIVO)) throw new Error("La invitación ya fue eliminada.");
    const now = new Date();
    updateObjectRow_(SHEETS.INVITATIONS, invitation._row, { ACTIVO: false, ACTUALIZADO_EN: now });
    const attendeeChanges = objects_(SHEETS.ATTENDEES).filter(function (item) {
      return item.INVITACION_ID === invitationId && asBoolean_(item.ACTIVO);
    }).map(function (attendee) {
      return { row: attendee._row, changes: { ACTIVO: false, ACTUALIZADO_EN: now } };
    });
    batchUpdateObjectRows_(SHEETS.ATTENDEES, attendeeChanges);
    invalidateInvitationCache_(invitation.CODIGO);
    return { deleted: true };
  } finally {
    lock.releaseLock();
  }
}

function validateInvitationInput_(payload) {
  const primaryName = cleanText_(payload.primaryName, 120);
  const email = cleanText_(payload.email, 160);
  const phone = cleanText_(payload.phone, 40);
  const honorific = cleanText_(payload.honorific, 40);
  const salutationDetail = cleanText_(payload.salutationDetail, 100);
  const tableName = cleanText_(payload.tableName, 60);
  const cardType = cardTypeModel_(payload.cardType);
  const seen = {};
  const primaryKey = normalizeName_(primaryName);
  const companions = (Array.isArray(payload.companions) ? payload.companions : [])
    .map(function (name) { return cleanText_(name, 120); })
    .filter(function (name) {
      const key = normalizeName_(name);
      if (!key || key === primaryKey || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  if (primaryName.length < 2) throw new Error("Ingresa el nombre del invitado principal.");
  if (companions.length > 20) throw new Error("Una invitación puede contener máximo 20 acompañantes.");
  return { primaryName: primaryName, email: email, phone: phone, honorific: honorific, salutationDetail: salutationDetail, tableName: tableName, cardType: cardType, companions: companions };
}

function invitationPublicModel_(invitation, attendees) {
  const group = attendees || objects_(SHEETS.ATTENDEES).filter(function (item) {
    return item.INVITACION_ID === invitation.ID && asBoolean_(item.ACTIVO);
  });
  return {
    id: invitation.ID,
    primaryName: invitation.NOMBRE_PRINCIPAL,
    honorific: honorificModel_(invitation.SALUDO),
    salutationDetail: invitation.TRATAMIENTO || "",
    cardType: cardTypeModel_(invitation.TIPO_TARJETA),
    status: invitation.ESTADO || "PENDIENTE",
    attendees: group.map(function (item) {
      return { id: item.ID, name: item.NOMBRE, type: item.TIPO, response: item.RESPUESTA || "PENDIENTE" };
    })
  };
}

function constellationModel_(attendees) {
  const confirmed = attendees.filter(function (item) {
    return asBoolean_(item.ACTIVO) && String(item.RESPUESTA || "").toUpperCase() === "SI";
  });
  const confirmedCount = confirmed.length;
  return {
    confirmedCount: confirmedCount,
    visibleStars: Math.min(confirmedCount, 64),
    secretVioletStar: confirmed.some(function (item) {
      const normalized = normalizeName_(item.NOMBRE);
      return normalized === HIGHLIGHTED_CONSTELLATION_NAME || normalized.indexOf(HIGHLIGHTED_CONSTELLATION_NAME + " ") === 0;
    })
  };
}

function honorificModel_(value) {
  const honorific = cleanText_(value, 40);
  if (honorific === "SIN_TRATAMIENTO") return "";
  return honorific || "Sr/a";
}

function cardTypeModel_(value) {
  const normalized = cleanText_(value, 30).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  return ["BIRTHDAY_GIRL", "CUMPLEANERA", "ESPECIAL", "SI", "TRUE"].indexOf(normalized) >= 0 ? "BIRTHDAY_GIRL" : "GUEST";
}

function requireInvitationAccess_(invitation, code) {
  const normalized = normalizeCode_(code);
  if (normalized.length < 6 || normalizeCode_(invitation.CODIGO) !== normalized) {
    throw new Error("La sesión no corresponde con esta invitación. Ingresa nuevamente tu clave.");
  }
}

function responseCounts_(attendees) {
  return attendees.reduce(function (totals, item) {
    const response = String(item.RESPUESTA || "PENDIENTE").toUpperCase();
    if (response === "SI") totals.yes += 1;
    else if (response === "NO") totals.no += 1;
    else totals.pending += 1;
    return totals;
  }, { yes: 0, no: 0, pending: 0 });
}

function appendResponseSnapshot_(invitationId, primaryResponse, attendees) {
  const group = attendees || objects_(SHEETS.ATTENDEES).filter(function (item) {
    return item.INVITACION_ID === invitationId && asBoolean_(item.ACTIVO);
  });
  const counts = responseCounts_(group);
  appendObjectRow_(SHEETS.RESPONSES, {
    ID: Utilities.getUuid(), INVITACION_ID: invitationId, RESPUESTA_PRINCIPAL: primaryResponse,
    TOTAL_SI: counts.yes, TOTAL_NO: counts.no, FECHA: new Date()
  });
}

function logAccess_(invitationId, result) {
  appendObjectRow_(SHEETS.ACCESS, { ID: Utilities.getUuid(), INVITACION_ID: invitationId || "", RESULTADO: result, FECHA: new Date() });
}

function logAccessOnce_(invitationId, result, code) {
  const cache = CacheService.getScriptCache();
  const key = "access-log:" + result + ":" + normalizeCode_(code);
  if (cache.get(key)) return;
  logAccess_(invitationId, result);
  cache.put(key, "1", 600);
}

function requireAdmin_(token) {
  const normalized = cleanText_(token, 120);
  if (!normalized || !CacheService.getScriptCache().get("admin-session:" + normalized)) {
    throw new Error("La sesión administrativa venció. Ingresa nuevamente.");
  }
}

function generateUniqueCode_() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const existing = {};
  objects_(SHEETS.INVITATIONS).forEach(function (item) { existing[normalizeCode_(item.CODIGO)] = true; });
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let code = "";
    const source = Utilities.getUuid().replace(/-/g, "").toUpperCase();
    for (let index = 0; index < 8; index += 1) {
      const value = parseInt(source.charAt(index), 16);
      code += alphabet.charAt((value + index * 7) % alphabet.length);
    }
    if (!existing[code]) return code;
  }
  throw new Error("No fue posible generar un código único. Intenta nuevamente.");
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(String);
    const missing = headers.filter(function (header) { return current.indexOf(header) === -1; });
    if (missing.length) sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, sheet.getLastColumn()).setFontWeight("bold").setBackground("#4d3478").setFontColor("#ffffff");
  sheet.autoResizeColumns(1, sheet.getLastColumn());
}

function ensureProjectStructure_() {
  const cache = CacheService.getScriptCache();
  const cacheKey = "schema-v5-ready";
  if (cache.get(cacheKey)) return;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (cache.get(cacheKey)) return;
    const spreadsheet = spreadsheet_();
    Object.keys(HEADERS).forEach(function (sheetName) {
      ensureSheet_(spreadsheet, sheetName, HEADERS[sheetName]);
    });
    cache.put(cacheKey, "1", 21600);
  } finally {
    lock.releaseLock();
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
  return values.slice(1).map(function (row, index) {
    if (!row.some(function (value) { return value !== ""; })) return null;
    const object = { _row: index + 2 };
    headers.forEach(function (header, column) { object[header] = row[column]; });
    return object;
  }).filter(Boolean);
}

function findInvitationByCode_(code) {
  return objects_(SHEETS.INVITATIONS).find(function (item) { return normalizeCode_(item.CODIGO) === code; }) || null;
}

function updateObjectRow_(sheetName, rowNumber, changes) {
  const sheet = sheet_(sheetName);
  const headers = HEADERS[sheetName];
  const range = sheet.getRange(rowNumber, 1, 1, headers.length);
  const row = range.getValues()[0];
  Object.keys(changes).forEach(function (field) {
    const column = headers.indexOf(field);
    if (column >= 0) row[column] = changes[field];
  });
  range.setValues([row]);
}

function batchUpdateObjectRows_(sheetName, updates) {
  if (!updates.length) return;
  const sheet = sheet_(sheetName);
  const headers = HEADERS[sheetName];
  const firstRow = Math.min.apply(null, updates.map(function (update) { return update.row; }));
  const lastRow = Math.max.apply(null, updates.map(function (update) { return update.row; }));
  const range = sheet.getRange(firstRow, 1, lastRow - firstRow + 1, headers.length);
  const values = range.getValues();
  updates.forEach(function (update) {
    const row = values[update.row - firstRow];
    Object.keys(update.changes).forEach(function (field) {
      const column = headers.indexOf(field);
      if (column >= 0) row[column] = update.changes[field];
    });
  });
  range.setValues(values);
}

function appendObjectRow_(sheetName, object) {
  appendRows_(sheetName, [objectRowValues_(sheetName, object)]);
}

function objectRowValues_(sheetName, object) {
  return HEADERS[sheetName].map(function (header) {
    return Object.prototype.hasOwnProperty.call(object, header) ? object[header] : "";
  });
}

function appendRows_(sheetName, rows) {
  if (!rows.length) return;
  const sheet = sheet_(sheetName);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS[sheetName].length).setValues(rows);
}

function invitationCacheKey_(code) { return "inv-v5-code:" + normalizeCode_(code); }
function invalidateInvitationCache_(code) {
  if (code) CacheService.getScriptCache().remove(invitationCacheKey_(code));
}
function normalizeCode_(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}
function normalizeName_(value) {
  return cleanText_(value, 120).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ");
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
