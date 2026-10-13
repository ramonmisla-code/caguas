import { redis, getJsonBody, leadKey, rejectMethod, databaseError } from '../lib/redis.js';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return rejectMethod(res);
  let body;
  try { body = getJsonBody(req); } catch { return res.status(400).json({ ok: false }); }
  const id = String(body.leadId || '');
  if (!UUID.test(id)) return res.status(400).json({ ok: false });
  try {
    const raw = await redis('GET', leadKey(id));
    if (!raw) return res.status(404).json({ ok: false });
    const lead = JSON.parse(raw);
    if (!lead.vigClickedAt) lead.vigClickedAt = new Date().toISOString();
    if (lead.status === 'Nuevo interesado') lead.status = 'Enviado a VIG';
    lead.updatedAt = new Date().toISOString();
    await redis('SET', leadKey(id), JSON.stringify(lead));
    return res.status(200).json({ ok: true });
  } catch (error) { return databaseError(res, error); }
}
