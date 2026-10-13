import { randomUUID } from 'node:crypto';
import { redis, pipeline, hasDatabase, leadKey, LEADS_INDEX, getJsonBody, enforceRateLimit, rejectMethod, databaseError } from '../lib/redis.js';

const allowedContact = new Set(['', 'WhatsApp', 'Llamada', 'Email']);
const allowedTimeline = new Set(['', 'Inmediatamente', '3–6 meses', '6–12 meses', 'Solo explorando']);
const allowedFinancing = new Set(['', 'Sí', 'No', 'No lo sé aún']);
const plain = (v, length) => (typeof v === 'string' ? v.trim().slice(0, length) : '');
const tracked = (t, key, length) => plain(t?.[key], length);
function validPhone(phone) { return phone.replace(/\D/g, '').length >= 10 && phone.replace(/\D/g, '').length <= 15; }
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function legitimateOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin) return true; // Algunas conexiones cliente-servidor no envían Origin.
  try { return new URL(origin).host === host; } catch { return false; }
}
async function notifySales(lead) {
  const { RESEND_API_KEY, SALES_NOTIFICATION_EMAIL, RESEND_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY || !SALES_NOTIFICATION_EMAIL || !RESEND_FROM_EMAIL) return;
  const details = `Nuevo interesado en Villas de Caguas Real\n\nNombre: ${lead.fullName}\nTeléfono: ${lead.phone}\nEmail: ${lead.email}\nMunicipio: ${lead.municipality}\nContacto preferido: ${lead.contactPreference}\nPlazo de compra: ${lead.buyingTimeline}\nNecesita financiamiento: ${lead.needsFinancing}\nFuente: ${lead.tracking.utm_source || 'No indicada'}\nConsentimiento promocional: ${lead.marketingConsent ? 'Sí' : 'No'}\n\nComentarios: ${lead.comments}\n\nRevisa todos los prospectos en /admin.`;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [SALES_NOTIFICATION_EMAIL], subject: 'Nuevo lead · Villas de Caguas Real', text: details }),
      signal: AbortSignal.timeout(5000)
    });
  } catch { /* El correo es opcional. El lead ya quedó guardado. */ }
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return rejectMethod(res);
  if (!hasDatabase()) return databaseError(res, new Error('DATABASE_NOT_CONFIGURED'));
  if (!legitimateOrigin(req)) return res.status(403).json({ ok: false, message: 'Solicitud no autorizada.' });
  let data;
  try { data = getJsonBody(req); } catch { return res.status(400).json({ ok: false, message: 'Solicitud no válida.' }); }
  if (!data || typeof data !== 'object' || JSON.stringify(data).length > 6000 || plain(data.website, 200)) return res.status(400).json({ ok: false, message: 'Solicitud no válida.' });
  const fullName = plain(data.fullName, 120);
  const email = plain(data.email, 160).toLowerCase();
  const phone = plain(data.phone, 30);
  if (fullName.length < 3 || !validEmail(email) || !validPhone(phone) || data.privacyConsent !== true)
    return res.status(400).json({ ok: false, message: 'Completa los campos requeridos y acepta el aviso de privacidad.' });
  const contactPreference = plain(data.contactPreference, 40);
  const buyingTimeline = plain(data.buyingTimeline, 40);
  const needsFinancing = plain(data.needsFinancing, 40);
  if (!allowedContact.has(contactPreference) || !allowedTimeline.has(buyingTimeline) || !allowedFinancing.has(needsFinancing))
    return res.status(400).json({ ok: false, message: 'Revisa los campos de selección.' });
  const id = randomUUID();
  const lead = {
    id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    status: 'Nuevo interesado', vigClickedAt: null,
    fullName, email, phone, municipality: plain(data.municipality, 80),
    contactPreference, buyingTimeline, needsFinancing, comments: plain(data.comments, 1000),
    privacyConsentAt: new Date().toISOString(), marketingConsent: data.marketingConsent === true,
    tracking: {
      utm_source: tracked(data.tracking, 'utm_source', 150),
      utm_medium: tracked(data.tracking, 'utm_medium', 150),
      utm_campaign: tracked(data.tracking, 'utm_campaign', 150),
      utm_content: tracked(data.tracking, 'utm_content', 150),
      utm_term: tracked(data.tracking, 'utm_term', 150),
      referrer: tracked(data.tracking, 'referrer', 500),
      landingPath: tracked(data.tracking, 'landingPath', 500)
    }
  };
  try {
    if (!await enforceRateLimit(req, 'register', 8)) return res.status(429).json({ ok: false, message: 'Demasiados intentos. Intenta nuevamente en una hora.' });
    const results = await pipeline([
      ['SET', leadKey(id), JSON.stringify(lead)],
      ['ZADD', LEADS_INDEX, Date.now(), id]
    ]);
    if (results.length !== 2) throw new Error('INCOMPLETE_WRITE');
    // Si se configuró Resend, enviar alerta sin afectar el registro ya guardado.
    await notifySales(lead);
    return res.status(201).json({ ok: true, id });
  } catch (error) { return databaseError(res, error); }
}
