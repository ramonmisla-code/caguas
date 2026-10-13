import { hasDatabase, rejectMethod } from '../lib/redis.js';
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return rejectMethod(res, 'GET');
  res.status(200).json({ ok: true, registrationEnabled: hasDatabase() });
}
