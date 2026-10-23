import test from 'node:test';
import assert from 'node:assert/strict';
import createLead from '../api/leads.js';
import status from '../api/status.js';
import vig from '../api/vig.js';

const oldFetch = global.fetch;
const originalUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
const originalSecret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;
const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const secret = '0123456789abcdef0123456789abcdef';
process.env.GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/TEST_DEPLOYMENT_123/exec';
process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = secret;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

const writes = [];
global.fetch = async (url, options) => {
  assert.equal(String(url), process.env.GOOGLE_SHEETS_WEBHOOK_URL);
  assert.equal(options.method, 'POST');
  const body = JSON.parse(options.body);
  assert.equal(body.token, secret);
  writes.push(body);
  return { ok: true, json: async () => ({ ok: true, id: body.lead?.id || body.leadId }) };
};
const req = (method, body = {}) => ({method,body,headers:{host:'caguasreal.com',origin:'https://caguasreal.com','x-forwarded-for':'203.0.113.62'}});
const res = () => ({code:200,setHeader(){return this},status(code){this.code=code;return this},json(body){this.body=body;return this}});

test('Google Sheets habilita el registro y confirma escritura antes del éxito', async () => {
  const health = res(); await status(req('GET'), health);
  assert.equal(health.body.registrationEnabled, true);
  assert.equal(health.body.storageMode, 'google-sheets');

  const result = res();
  await createLead(req('POST',{fullName:'Interesado Prueba',phone:'787-555-0133',email:'ejemplo@example.com',privacyConsent:true,marketingConsent:false,contactPreference:'WhatsApp'}), result);
  assert.equal(result.code, 201);
  assert.equal(writes.length,1);
  assert.equal(writes[0].action,'register');
  assert.equal(writes[0].lead.id,result.body.id);
  assert.equal(writes[0].lead.fullName,'Interesado Prueba');
  assert.equal(writes[0].lead.marketingConsent,false);
});

test('El clic VIG se refleja en Google Sheets', async () => {
  const result = res();
  await vig(req('POST',{leadId:writes[0].lead.id}),result);
  assert.equal(result.code,200);
  assert.equal(writes[1].action,'vig');
  assert.equal(writes[1].leadId,writes[0].lead.id);
});

test('No devuelve éxito cuando el webhook no confirma la escritura', async () => {
  global.fetch = async () => ({ok:true,json:async()=>({ok:false,error:'SAVE_FAILED'})});
  const result=res();
  await createLead(req('POST',{fullName:'Interesado Dos',phone:'787-555-0133',email:'dos@example.com',privacyConsent:true}),result);
  assert.equal(result.code,503);
  assert.equal(result.body.ok,false);
});

test.after(() => {
  global.fetch = oldFetch;
  if (originalUrl == null) delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  else process.env.GOOGLE_SHEETS_WEBHOOK_URL = originalUrl;
  if (originalSecret == null) delete process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;
  else process.env.GOOGLE_SHEETS_WEBHOOK_SECRET = originalSecret;
  if (originalRedisUrl == null) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl;
  if (originalRedisToken == null) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken;
});
