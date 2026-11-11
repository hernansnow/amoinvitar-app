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
  if (t.length < 2 || t.length > 400 || !/[A-Za-zÁÉÍÓÚáéíóúñ]/.test(t) || /^[a-z0-9_.-]+$/.test(t) || /[<>{}=]|^[^\wÁÉÍÓÚáéíóúñ¿¡"«(☰←→＋+✓]|https?:|\/\w+\/|;\s*$|^[a-z-]+:/.test(t)) return;
  if (!/^[A-ZÁÉÍÓÚÑ¿¡0-9"«(☰←→＋+✓]/.test(t) && !ES.test(t)) return;
  if (/^[A-Z][a-zA-Z]+$/.test(t) && !/[áéíóúñ]/.test(t) && t.length < 4) return;
  if (!hay.has(t)) { hay.add(t); nuevos.push(t); }
};
// Lee el código carácter por carácter: cadenas '…' "…", plantillas `…${…}…`, comentarios y expresiones regulares
function cadenas(src) {
  const out = []; let i = 0, prev = '';
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && d === '*') { const j = src.indexOf('*/', i + 2); i = j < 0 ? n : j + 2; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1, t = '';
      while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') { t += src[j + 1] === 'n' ? '\n' : src[j + 1]; j += 2; } else t += src[j++]; }
      out.push({ t, fijo: true }); i = j + 1; prev = 'x'; continue;
    }
    if (c === '`') {
      let j = i + 1, t = '', prof = 0;
      while (j < n) {
        if (src[j] === '\\') { t += src[j + 1] === 'n' ? '\n' : src[j + 1]; j += 2; continue; }
        if (src[j] === '`') break;
        if (src[j] === '$' && src[j + 1] === '{') { // salta la expresión ${…} (con llaves anidadas)
          let k = j + 2, nivel = 1;
          while (k < n && nivel) { if (src[k] === '{') nivel++; else if (src[k] === '}') nivel--; else if (src[k] === '`') { k = src.indexOf('`', k + 1); } k++; } // (solo llaves: las comillas dentro de ${…} pueden ser de una expresión regular)
          t += '\u0000'; j = k; continue;
        }
        t += src[j++];
      }
      for (const parte of t.split('\u0000')) out.push({ t: parte, fijo: false });
      i = j + 1; prev = 'x'; continue;
    }
    if (c === '/' && /[(,=:[!&|?{};+\-*%<>~^]|^$|return$|typeof$/.test(prev)) { // expresión regular
      let j = i + 1, clase = false;
      while (j < n && src[j] !== '\n') { if (src[j] === '\\') { j += 2; continue; } if (src[j] === '[') clase = true; else if (src[j] === ']') clase = false; else if (src[j] === '/' && !clase) break; j++; }
      i = j + 1; while (/[a-z]/i.test(src[i] || '')) i++; prev = 'x'; continue;
    }
    if (!/\s/.test(c)) { if (/[A-Za-z0-9_$]/.test(c)) { let j = i; while (/[A-Za-z0-9_$]/.test(src[j] || '')) j++; prev = src.slice(i, j); i = j; continue; } prev = c; }
    i++;
  }
  return out;
}
const ARCHIVOS_JS = ['public/panel/panel.js', 'public/panel/admin.js', 'public/panel/tarjeta.js', 'public/panel/planilla.js', 'src/panel/esquemas.js'];
for (const f of ARCHIVOS_JS) {
  for (const { t, fijo } of cadenas(readFileSync(join(RAIZ, f), 'utf8'))) {
    // Con HTML adentro («<span>Solicitar asistencia…</span>»): cada trozo de texto por separado
    for (const x of t.split(/<[^>]*>/)) if (fijo || /<[^>]*>/.test(t) ? /[a-záéíóúñ] [a-záéíóúñ]|[áéíóúñ]|^[A-ZÁÉÍÓÚ][a-záéíóúñ]+/.test(x) : /[a-záéíóúñ]{3,} [a-záéíóúñ]/.test(x)) agrega(x);
  }
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
