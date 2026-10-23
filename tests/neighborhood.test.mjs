import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const css = readFileSync(resolve(root, 'neighborhood.css'), 'utf8');
const script = readFileSync(resolve(root, 'site.js'), 'utf8');

test('Explorador del entorno está ubicado después de Ubicación y antes de Registro', () => {
  assert.ok(html.indexOf('id="ubicacion"') < html.indexOf('id="alrededores"'));
  assert.ok(html.indexOf('id="alrededores"') < html.indexOf('id="registro"'));
  assert.match(html, /href="\/neighborhood\.css"/);
});
test('Cinco pestañas y cinco paneles accesibles', () => {
  const ids = ['golf', 'hoteles', 'restaurantes', 'compras', 'servicios'];
  ids.forEach(id => {
    assert.match(html, new RegExp('id="tab-' + id + '" role="tab"'));
    assert.match(html, new RegExp('id="panel-' + id + '" role="tabpanel"'));
    assert.match(html, new RegExp('data-neighborhood-panel="' + id + '"'));
  });
  assert.equal((html.match(/class="neighborhood-card"/g) || []).length, 8);
  assert.match(script, /function selectNeighborhood/);
  assert.match(script, /ArrowRight/);
});
test('Enlaces externos seguros y aviso de terceros', () => {
  const external = [...html.matchAll(/<a href="https:\/\/[^"]+" target="_blank"[^>]*>/g)]
    .filter(([tag]) => tag.includes('neighborhood') === false);
  assert.ok(external.length >= 8);
  assert.match(html, /no implica afiliación, acceso preferencial/);
  assert.match(css, /@media\(max-width:700px\)/);
});
