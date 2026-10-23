// Solo el servidor de Vercel debe llamar a esta integración. Nunca poner el secreto en el navegador.
export const hasGoogleSheets = () => Boolean(
  process.env.GOOGLE_SHEETS_WEBHOOK_URL &&
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET &&
  process.env.GOOGLE_SHEETS_WEBHOOK_SECRET.length >= 32
);

function endpoint() {
  const url = new URL(process.env.GOOGLE_SHEETS_WEBHOOK_URL);
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' ||
      !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) || url.search) {
    throw new Error('INVALID_GOOGLE_SHEETS_WEBHOOK');
  }
  return url;
}

async function postToSheet(action, data) {
  if (!hasGoogleSheets()) throw new Error('GOOGLE_SHEETS_NOT_CONFIGURED');
  const res = await fetch(endpoint(), {
    method: 'POST',
    redirect: 'follow', // ContentService redirige a script.googleusercontent.com
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: JSON.stringify({
      action,
      token: process.env.GOOGLE_SHEETS_WEBHOOK_SECRET,
      ...data
    }),
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error('GOOGLE_SHEETS_UNAVAILABLE');
  const payload = await res.json().catch(() => null);
  if (!payload || payload.ok !== true || payload.id !== data.leadId && payload.id !== data.lead?.id) {
    throw new Error('GOOGLE_SHEETS_WRITE_NOT_CONFIRMED');
  }
  return payload;
}

export const appendGoogleSheetLead = lead => postToSheet('register', { lead });
export const markGoogleSheetVigClick = leadId => postToSheet('vig', { leadId });
