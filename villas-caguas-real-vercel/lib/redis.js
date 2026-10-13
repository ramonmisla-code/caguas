import { createHash, timingSafeEqual } from 'node:crypto';

export const LEADS_INDEX = 'vcr:leads:by-date';
export const leadKey = id => `vcr:lead:${id}`;
export const hasDatabase = () => Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

export async function redis(...command) {
  if (!hasDatabase()) throw new Error('DATABASE_NOT_CONFIGURED');
  const resp = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(7000)
  });
  if (!resp.ok) throw new Error('DATABASE_UNAVAILABLE');
  const data = await resp.json();
  if (data.error) throw new Error('DATABASE_REDIS_ERROR');
  return data.result;
}
export async function pipeline(commands) {
  if (!hasDatabase()) throw new Error('DATABASE_NOT_CONFIGURED');
  const base = process.env.UPSTASH_REDIS_REST_URL.replace(/\/$/, '');
  const resp = await fetch(base + '/pipeline', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(7000)
  });
  if (!resp.ok) throw new Error('DATABASE_UNAVAILABLE');
  const data = await resp.json();
  if (!Array.isArray(data) || data.some(r => r.error)) throw new Error('DATABASE_REDIS_ERROR');
  return data.map(r => r.result);
}
export function getJsonBody(req) {
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8'));
  if (req.body && typeof req.body === 'object') return req.body;
  return {};
}
export function clientHash(req) {
  const raw = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown').split(',')[0].trim();
  return createHash('sha256').update(raw).digest('hex').slice(0, 26);
}
export async function enforceRateLimit(req, label, limit = 7) {
  const key = `vcr:ratelimit:${label}:${clientHash(req)}`;
  const count = Number(await redis('INCR', key));
  if (count === 1) await redis('EXPIRE', key, 3600);
  return count <= limit;
}
export function adminAllowed(req) {
  const secret = process.env.ADMIN_ACCESS_KEY;
  if (!secret || secret.length < 16) return false;
  const provided = String(req.headers['x-admin-key'] || '');
  const actual = Buffer.from(secret), input = Buffer.from(provided);
  return input.length === actual.length && timingSafeEqual(actual, input);
}
export function rejectMethod(res, methods = 'POST') {
  res.setHeader('Allow', methods);
  res.status(405).json({ ok: false, message: 'Método no permitido.' });
}
export function databaseError(res, error) {
  // Nunca exponer errores internos o claves del proveedor de almacenamiento.
  const notReady = error?.message === 'DATABASE_NOT_CONFIGURED';
  res.status(503).json({ ok: false, message: notReady ? 'El registro todavía no está habilitado. Intenta más adelante.' : 'No se pudo completar el registro en este momento. Intenta nuevamente.' });
}
