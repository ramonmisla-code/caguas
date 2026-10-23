/**
 * Vincular este código a la hoja "Villas de Caguas Real — Registros de interesados".
 * Extensiones > Apps Script > Código.gs.
 * En Configuración del proyecto > Propiedades de secuencia de comandos,
 * crear WEBHOOK_SECRET (mínimo 32 caracteres aleatorios).
 * Desplegar como Aplicación web, Ejecutar como: Yo, Acceso: Cualquiera.
 * La URL /exec y el secreto se configuran SOLO en Environment Variables de Vercel.
 */
const SPREADSHEET_ID = '1PUq7gu7oe7feUuZWo7j8rBeDFF-J6TIiqyLknIURGyA';
const SHEET_NAME = 'Registros';

function json_(object) {
  return ContentService.createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}
function cell_(value) {
  const str = value == null ? '' : String(value).slice(0, 1600);
  // Evita que nombres, comentarios y UTMs se ejecuten como fórmulas.
  return /^[\s]*[=+\-@]/.test(str) ? "'" + str : str;
}
function findLeadRow_(sheet, id) {
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const match = sheet.getRange(2, 2, last - 1, 1)
    .createTextFinder(id).matchEntireCell(true).findNext();
  return match ? match.getRow() : null;
}
function validId_(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
function doPost(e) {
  try {
    const data = JSON.parse(e && e.postData && e.postData.contents || '{}');
    const expected = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
    if (!expected || expected.length < 32 || data.token !== expected) {
      return json_({ ok: false, error: 'UNAUTHORIZED' });
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return json_({ ok: false, error: 'SHEET_NOT_FOUND' });
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) return json_({ ok: false, error: 'BUSY' });
    try {
      if (data.action === 'register') {
        const l = data.lead || {};
        if (!validId_(l.id) || !l.fullName || !l.email || !l.phone) {
          return json_({ ok: false, error: 'INVALID_LEAD' });
        }
        if (findLeadRow_(sheet, l.id)) return json_({ ok: true, id: l.id, duplicate: true });
        const t = l.tracking || {};
        sheet.appendRow([
          cell_(l.createdAt), cell_(l.id), cell_(l.status || 'Nuevo interesado'),
          cell_(l.fullName), cell_(l.phone), cell_(l.email),
          cell_(l.municipality), cell_(l.contactPreference),
          cell_(l.buyingTimeline), cell_(l.needsFinancing),
          cell_(l.comments), cell_(l.privacyConsentAt),
          l.marketingConsent === true ? 'Sí' : 'No',
          cell_(t.utm_source), cell_(t.utm_medium), cell_(t.utm_campaign),
          cell_(t.utm_content), cell_(t.utm_term), cell_(t.referrer),
          cell_(t.landingPath), ''
        ]);
        SpreadsheetApp.flush();
        return json_({ ok: true, id: l.id });
      }
      if (data.action === 'vig') {
        const id = data.leadId;
        if (!validId_(id)) return json_({ ok: false, error: 'INVALID_ID' });
        const row = findLeadRow_(sheet, id);
        if (!row) return json_({ ok: false, error: 'NOT_FOUND' });
        const status = String(sheet.getRange(row, 3).getValue());
        const stamp = sheet.getRange(row, 21);
        if (!stamp.getValue()) stamp.setValue(new Date().toISOString());
        if (status === 'Nuevo interesado') sheet.getRange(row, 3).setValue('Enviado a VIG');
        SpreadsheetApp.flush();
        return json_({ ok: true, id });
      }
      return json_({ ok: false, error: 'INVALID_ACTION' });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    // Nunca devolver en la respuesta registros completos ni credenciales.
    console.error('Google Sheets webhook failed: ' + (err && err.name || 'Error'));
    return json_({ ok: false, error: 'SAVE_FAILED' });
  }
}
