import { redis, hasDatabase, getJsonBody, leadKey, rejectMethod, databaseError } from '../lib/redis.js';
import { hasGoogleSheets, markGoogleSheetVigClick } from '../lib/google-sheets.js';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function updateRedis(id) {
  const raw = await redis('GET', leadKey(id));
  if (!raw) return false;
  const lead = JSON.parse(raw);
  if (!lead.vigClickedAt) lead.vigClickedAt = new Date().toISOString();
  if (lead.status === 'Nuevo interesado') lead.status = 'Enviado a VIG';
  lead.updatedAt = new Date().toISOString();
  await redis('SET', leadKey(id), JSON.stringify(lead));
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return rejectMethod(res);
  let body;
  try { body = getJsonBody(req); } catch { return res.status(400).json({ ok: false }); }
  const id = String(body.leadId || '');
  if (!UUID.test(id)) return res.status(400).json({ ok: false });
  try {
    if (hasGoogleSheets()) {
      // Si Sheets es el destino principal, anotar el clic allí.
      await markGoogleSheetVigClick(id);
      if (hasDatabase()) {
        try { await updateRedis(id); } catch { console.error('No se pudo replicar el clic VIG en Redis.'); }
      }
      return res.status(200).json({ ok: true });
    }
    if (!await updateRedis(id)) return res.status(404).json({ ok: false });
    return res.status(200).json({ ok: true });
  } catch (error) { return databaseError(res, error); }
}
