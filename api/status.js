import { hasDatabase, rejectMethod } from '../lib/redis.js';
import { hasGoogleSheets } from '../lib/google-sheets.js';
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return rejectMethod(res, 'GET');
  res.status(200).json({
    ok: true,
    registrationEnabled: hasGoogleSheets() || hasDatabase(),
    storageMode: hasGoogleSheets() ? 'google-sheets' : hasDatabase() ? 'redis' : 'disabled',
    // Si no hay Redis, el panel /admin no dispone de registros aunque Sheets los reciba.
    adminEnabled: hasDatabase()
  });
}
