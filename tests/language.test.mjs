import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const source = file => readFileSync(resolve(root, file), 'utf8');
const ctx = vm.createContext({ window: {} });
for (const file of [
  'language/en-main.js', 'language/en-privacy.js',
  'language/en-attributes.js', 'language/en-admin.js'
]) vm.runInContext(source(file), ctx, { filename: file });
const dictionary = ctx.window.CRV_TRANSLATIONS;

test('All public pages expose language controls and initialize translation scripts', () => {
  for (const page of ['index.html', 'privacidad.html', 'admin.html']) {
    const html = source(page);
    assert.match(html, /data-language="es"/);
    assert.match(html, /data-language="en"/);
    assert.match(html, /src="\/language\/switch\.js"/);
    assert.ok(html.indexOf('/language/switch.js') < html.indexOf('src="/site.js"') ||
              html.indexOf('/language/switch.js') < html.indexOf('src="/admin.js"') ||
              (page === 'privacidad.html'), 'Load translation code before page interactions');
  }
});
test('All Spanish public body text segments have an English equivalent', () => {
  const exceptions = new Set([
    'CAGUAS REAL','VILLAS','V','C R','ft²','ES','EN','JB','FP','SOCA','MR','SO','SC','HM',
    'WhatsApp','No','Sí','Shopping Village','Four Points',
    'Caguas Real Golf &amp; Country Club','Caguas Real Villas',
    'Four Points by Sheraton Caguas Real','SOCA Restaurant','Marcelo Restaurant',
    'Santa Olaya Shopping Village','Shops at Caguas','Hospital Menonita de Caguas','VIG',
    'VIG Mortgage'
  ]);
  for (const page of ['index.html', 'privacidad.html', 'admin.html']) {
    const html = source(page).replace(/<style>[\s\S]*?<\/style>/g,'')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/g,'');
    const nodes = [...html.matchAll(/>([^<>]+)</g)]
      .map(x => x[1].trim()).filter(x => /[A-Za-zÀ-ÿ]/.test(x));
    const missing = [...new Set(nodes)].filter(node => !dictionary[node] && !exceptions.has(node));
    assert.deepEqual(missing, [], page + ' has untranslated text nodes: ' + missing.join('; '));
  }
});
test('Critical CTAs, privacy disclosures, SEO and form errors are translated', () => {
  const required = [
    'El proyecto', 'Registro privado', 'Quiero recibir información',
    'Aviso de privacidad', 'Representaciones e información del proyecto.',
    'Las imágenes, perspectivas arquitectónicas, ambientaciones y representaciones gráficas de este sitio son ilustrativas y pueden incorporar elementos sujetos a modificaciones. Cada residencia contempla una superficie total de',
    'El desarrollador podrá realizar ajustes razonables en materiales, terminaciones y elementos constructivos cuando su disponibilidad o las circunstancias de ejecución de obra lo requieran, utilizando alternativas de calidad comparable, conforme a los documentos contractuales y las disposiciones legales aplicables.',
    'Escribe un teléfono válido con al menos 10 dígitos.',
    'Solicitud no autorizada.',
    'Caguas Real Villas | Residencias contemporáneas en Caguas, Puerto Rico'
  ];
  for (const key of required) assert.ok(dictionary[key], 'Missing: ' + key);
  assert.match(source('language/switch.js'), /localStorage\.getItem/);
  assert.match(source('language/switch.js'), /document\.documentElement\.lang/);
  assert.match(source('site.js'), /window\.CRV_I18N/);
});
