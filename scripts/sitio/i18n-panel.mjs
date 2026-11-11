// README (ronda 45) · npm run panel:i18n — junta los textos en español del panel, Mi cuenta y Entrar (cadenas del JavaScript,
// del esquema del panel y del HTML) y suma a scripts/sitio/i18n/js-fuente.json los que todavía no están. Después muestra
// cuántos faltan traducir en cada idioma (scripts/sitio/i18n/js-<idioma>.json). Las frases con partes variables (${…})
// no se pueden traducir por texto exacto: se suman solo los trozos fijos que quedan sueltos.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '../..');
const ARCH = join(AQUI, 'i18n/js-fuente.json');
const fuente = JSON.parse(readFileSync(ARCH, 'utf8'));
const hay = new Set(Object.values(fuente).map((t) => t.trim()));
const nuevos = [];
const ES = /[áéíóúñ¿¡]|\b(de|la|el|los|las|tu|tus|con|para|por|una?|que|del|en|y|o|se|sin|al|lo|es|más|ya|no)\b/i;
const agrega = (t) => {
  t = t.replace(/\s+/g, ' ').trim();
  if (t.length < 2 || t.length > 400 || !/[A-Za-zÁÉÍÓÚáéíóúñ]/.test(t) || /^[a-z0-9_.-]+$/.test(t) || /[<>{}=;]|^\W|https?:|\/\w+\//.test(t)) return;
  if (!/^[A-ZÁÉÍÓÚÑ¿¡0-9"«(]/.test(t) && !ES.test(t)) return;
  if (/^[A-Z][a-zA-Z]+$/.test(t) && !/[áéíóúñ]/.test(t) && t.length < 4) return;
  if (!hay.has(t)) { hay.add(t); nuevos.push(t); }
};
const ARCHIVOS_JS = ['public/panel/panel.js', 'public/panel/admin.js', 'public/panel/tarjeta.js', 'public/panel/planilla.js', 'src/panel/esquemas.js'];
for (const f of ARCHIVOS_JS) {
  const s = readFileSync(join(RAIZ, f), 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  // '…' y "…" (sin variables) y los trozos fijos de `…${x}…`
  for (const m of s.matchAll(/'((?:[^'\\\n]|\\.){2,})'|"((?:[^"\\\n]|\\.){2,})"/g)) { const t = (m[1] ?? m[2]).replace(/\\(.)/g, '$1'); if (/[a-záéíóúñ] [a-záéíóúñ]|[áéíóúñ]|^[A-ZÁÉÍÓÚ][a-záéíóúñ]+/.test(t)) agrega(t); }
  for (const m of s.matchAll(/`([^`]*)`/g)) for (const parte of m[1].split(/\$\{[^}]*\}/)) if (/[a-záéíóúñ]{3,} [a-záéíóúñ]/.test(parte)) agrega(parte);
}
for (const f of ['public/mi-cuenta/index.html', 'public/entrar/index.html', 'public/panel/index.html']) {
  const h = readFileSync(join(RAIZ, f), 'utf8');
  const sinJs = h.replace(/<style[\s\S]*?<\/style>/g, '');
  for (const m of sinJs.replace(/<script[\s\S]*?<\/script>/g, '').matchAll(/>([^<>]+)</g)) agrega(m[1]);
  for (const m of sinJs.matchAll(/\b(?:alt|title|placeholder|aria-label)="([^"]*)"/g)) agrega(m[1]);
  for (const sc of h.matchAll(/<script>([\s\S]*?)<\/script>/g)) for (const m of sc[1].matchAll(/'((?:[^'\\\n]|\\.){2,})'/g)) if (/[a-záéíóúñ] [a-záéíóúñ]|[áéíóúñ]/.test(m[1])) agrega(m[1]);
}
let n = Math.max(...Object.keys(fuente).map(Number)) + 1;
for (const t of nuevos) fuente[n++] = t;
writeFileSync(ARCH, JSON.stringify(fuente, null, 1));
console.log('Textos nuevos:', nuevos.length);
for (const l of ['en', 'pt', 'fr', 'it', 'de', 'nl']) {
  let tr = {}; try { tr = JSON.parse(readFileSync(join(AQUI, `i18n/js-${l}.json`), 'utf8')); } catch (e) { /* todavía no está */ }
  console.log(l, 'faltan', Object.keys(fuente).filter((i) => !tr[i]).length);
}
