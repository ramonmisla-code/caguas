import { adminAllowed, redis, getJsonBody, leadKey, rejectMethod, databaseError } from '../../lib/redis.js';
const allowed = new Set(['Nuevo interesado', 'Contactado', 'Interesado activo', 'Enviado a VIG', 'Precualificado', 'Seleccionó unidad', 'Opción/depósito', 'Cierre']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'PATCH') return rejectMethod(res, 'PATCH');
  if (!adminAllowed(req)) return res.status(401).json({ ok: false, message: 'Acceso no autorizado.' });
  let body;
  try { body = getJsonBody(req); } catch { return res.status(400).json({ ok: false }); }
  const id = String(body.id || ''), status = String(body.status || '');
  if (!UUID.test(id) || !allowed.has(status)) return res.status(400).json({ ok: false, message: 'Estado no válido.' });
  try {
    const raw = await redis('GET', leadKey(id));
    if (!raw) return res.status(404).json({ ok: false });
    const lead = JSON.parse(raw);
    lead.status = status;
    lead.updatedAt = new Date().toISOString();
    await redis('SET', leadKey(id), JSON.stringify(lead));
    return res.status(200).json({ ok: true });
  } catch (error) { return databaseError(res, error); }
}
