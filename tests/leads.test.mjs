import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import createLead from '../api/leads.js';
import vig from '../api/vig.js';
import list from '../api/admin/leads.js';
import changeStatus from '../api/admin/status.js';
import health from '../api/status.js';
const dict = new Map(), index = new Map(), counter = new Map();
process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-for-unit-tests';
process.env.ADMIN_ACCESS_KEY = 'ADMIN_KEY_FOR_UNIT_TESTS_123456';
const oldFetch = global.fetch;
function execute(c) {
 const [op, key, ...rest] = c;
 switch(op) {
  case 'INCR': { const v=(counter.get(key)||0)+1;counter.set(key,v);return v; }
  case 'EXPIRE': return 1;
  case 'SET': dict.set(key,rest[0]);return 'OK';
  case 'GET': return dict.get(key)||null;
  case 'ZADD': index.set(rest[1],Number(rest[0]));return 1;
  case 'ZREVRANGE': return [...index.entries()].sort((a,b)=>b[1]-a[1]).slice(Number(rest[0]),Number(rest[1])+1).map(x=>x[0]);
  case 'MGET': return [key,...rest].map(k=>dict.get(k)||null);
  default: throw new Error('Unknown mocked operation '+op);
 }
}
global.fetch = async (url, opts) => {
 if (!String(url).startsWith('https://redis.test')) throw Error('Unexpected outbound URL: '+url);
 const body=JSON.parse(opts.body);
 return {ok:true,json:async()=>String(url).endsWith('/pipeline') ? body.map(c=>({result:execute(c)})) : {result:execute(body)}};
};
function req(method, body={}, key='') {return {method,body,headers:{host:'localhost',origin:'http://localhost','x-admin-key':key,'x-forwarded-for':'192.0.2.200'}};}
function res() {return {code:200,headers:{},setHeader(k,v){this.headers[k]=v;return this;},status(code){this.code=code;return this;},json(payload){this.body=payload;return this;}};}

test('Siete fotografías e imágenes y secciones requeridas en sitio',()=>{
 const root=resolve(import.meta.dirname,'..');
 const html=readFileSync(resolve(root,'index.html'),'utf8');
 assert.match(html,/Villas de Caguas Real/i);
 assert.match(html,/prequalify\.vigpr\.com\/\?lang=es/);
 assert.match(html,/id="lead-form"/);
 assert.match(html,/id="success-panel"/);
 for(const filename of ['fachada-conceptual.webp','campo-golf-caguas.webp','plano-villa.webp','piscina-caguas-real.webp','amenidades-caguas-real.webp','vista-aerea-desarrollo.webp','ubicacion-proyecto.webp']) {
  assert.ok(existsSync(resolve(root,'assets',filename)),filename);
  assert.ok(html.includes(filename),filename);
 }
});
test('Superficie y distribución definitivas sin cifras estimadas antiguas', () => {
 const root=resolve(import.meta.dirname,'..');
 const html=readFileSync(resolve(root,'index.html'),'utf8');
 assert.match(html,/1,877/);
 assert.match(html,/Superficie total/);
 assert.match(html,/Dos baños y medio/);
 assert.match(html,/Tres habitaciones/);
 assert.doesNotMatch(html,/1,425|±288|Terraza estimada|Interior estimado|Datos de distribución preliminares/i);
});
test('Backend guarda prospecto antes de VIG, consulta y actualiza etapa',async()=>{
 const availability = res(); await health(req('GET'),availability);
 assert.equal(availability.body.registrationEnabled,true);
 let response=res();
 await createLead(req('POST',{fullName:'Comprador Ejemplo',phone:'787-555-0188',email:'ejemplo@correo.com',privacyConsent:false}),response);
 assert.equal(response.code,400);
 response=res();
 await createLead(req('POST',{
  fullName:'Comprador Ejemplo',phone:'787-555-0188',email:'ejemplo@correo.com',municipality:'Caguas',contactPreference:'WhatsApp',buyingTimeline:'3–6 meses',needsFinancing:'Sí',comments:'Favor llamar',privacyConsent:true,marketingConsent:false,tracking:{utm_source:'facebook',utm_campaign:'visitas'}
 }),response);
 assert.equal(response.code,201);
 const id=response.body.id;
 assert.match(id,/^[a-z0-9-]{36}$/);
 response=res();await list(req('GET',{},'wrong-key'),response);assert.equal(response.code,401);
 response=res();await list(req('GET',{},process.env.ADMIN_ACCESS_KEY),response);assert.equal(response.code,200);
 assert.equal(response.body.leads.length,1);
 assert.equal(response.body.leads[0].tracking.utm_source,'facebook');
 assert.equal(response.body.leads[0].status,'Nuevo interesado');
 response=res();await vig(req('POST',{leadId:id}),response);assert.equal(response.code,200);
 response=res();await list(req('GET',{},process.env.ADMIN_ACCESS_KEY),response);
 assert.equal(response.body.leads[0].status,'Enviado a VIG');
 assert.ok(response.body.leads[0].vigClickedAt);
 response=res();await changeStatus(req('PATCH',{id,status:'Precualificado'},process.env.ADMIN_ACCESS_KEY),response);
 assert.equal(response.code,200);
 response=res();await list(req('GET',{},process.env.ADMIN_ACCESS_KEY),response);
 assert.equal(response.body.leads[0].status,'Precualificado');
});
test.after(()=>{global.fetch=oldFetch;});
