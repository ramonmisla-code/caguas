import { adminAllowed, redis, LEADS_INDEX, leadKey, rejectMethod, databaseError } from '../../lib/redis.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return rejectMethod(res, 'GET');
  if (!adminAllowed(req)) return res.status(401).json({ ok: false, message: 'Acceso no autorizado.' });
  try {
    const ids = await redis('ZREVRANGE', LEADS_INDEX, 0, 1999);
    if (!ids.length) return res.status(200).json({ ok: true, leads: [], maxItems: 2000 });
    const data = await redis('MGET', ...ids.map(leadKey));
    const leads = data.filter(Boolean).map(value => JSON.parse(value));
    return res.status(200).json({ ok: true, leads, maxItems: 2000 });
  } catch (error) { return databaseError(res, error); }
}
