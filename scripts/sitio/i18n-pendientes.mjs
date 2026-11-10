// README (ronda 42) · npm run sitio:i18n — suma a scripts/sitio/i18n/fuente.json los textos nuevos de la web (español neutro) y
// muestra cuántos faltan traducir en cada idioma. Correr después de npm run sitio; traducir los números que faltan en
// scripts/sitio/i18n/<idioma>.json y volver a correr npm run sitio.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '../../public/sitio/t/es');
const fuente = JSON.parse(readFileSync(join(AQUI, 'i18n/fuente.json'), 'utf8'));
const norm = (t) => t.replace(/\s+/g, ' ').trim();
const des = (t) => t.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
const hay = new Set(Object.values(fuente));
const nuevos = [];
const agrega = (t) => { t = norm(t); if (t.length > 1 && /[A-Za-zÁÉÍÓÚáéíóúñ]/.test(t) && !/^\{\{/.test(t) && !hay.has(t)) { hay.add(t); nuevos.push(t); } };
for (const f of readdirSync(RAIZ).filter((x) => x.endsWith('.html'))) {
  const h = readFileSync(join(RAIZ, f), 'utf8');
  const limpio = h.replace(/<(script|style)[\s\S]*?<\/\1>/g, '').replace(/<figure class="opinion">[\s\S]*?<\/figure>/g, '');
  for (const m of limpio.matchAll(/>([^<>]+)</g)) agrega(m[1]);
  for (const m of limpio.matchAll(/\b(?:alt|title|placeholder|aria-label)="([^"]*)"/g)) agrega(des(m[1]));
  const d = /<meta name="description" content="([^"]*)"/.exec(h); if (d) agrega(des(d[1]));
  const o = /<meta property="og:description" content="([^"]*)"/.exec(h); if (o) agrega(des(o[1]));
}
let n = Math.max(...Object.keys(fuente).map(Number)) + 1;
for (const t of nuevos) fuente[n++] = t;
writeFileSync(join(AQUI, 'i18n/fuente.json'), JSON.stringify(fuente, null, 1));
console.log('Textos nuevos:', nuevos.length);
for (const l of ['en', 'pt', 'fr', 'it', 'de', 'nl']) {
  let tr = {}; try { tr = JSON.parse(readFileSync(join(AQUI, `i18n/${l}.json`), 'utf8')); } catch (e) { /* todavía no está */ }
  const faltan = Object.keys(fuente).filter((i) => !tr[i]);
  console.log(l, 'faltan', faltan.length);
}
