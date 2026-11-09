// README (ronda 40) · Traducción de las páginas de la web nueva (inglés, portugués…).
// El español es la fuente: scripts/sitio/i18n/fuente.json guarda los textos de la última traducción (en orden) y
// scripts/sitio/i18n/<idioma>.json trae la traducción por número ("12": "…"). Lo que no tiene traducción queda en español.
// Cuando se cambia un texto en español, corre `npm run sitio:i18n` para ver qué quedó sin traducir.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const fuente = JSON.parse(readFileSync(join(AQUI, 'i18n/fuente.json'), 'utf8'));
export const IDIOMAS = ['en', 'pt'].filter((l) => existsSync(join(AQUI, `i18n/${l}.json`)));
const norm = (t) => t.replace(/\s+/g, ' ').trim();

export function cargaMapa(idioma) {
  const tr = JSON.parse(readFileSync(join(AQUI, `i18n/${idioma}.json`), 'utf8'));
  const m = new Map();
  for (const [i, v] of Object.entries(tr)) if (fuente[i] != null && v) m.set(fuente[i], v);
  return m;
}

const ATRIB = /\b(alt|title|placeholder|aria-label)="([^"]*)"/g;
export function traducir(html, mapa, lang) {
  const trozos = html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<figure class="opinion">[\s\S]*?<\/figure>|<[^>]+>)/);
  const out = trozos.map((x, i) => {
    if (i % 2 === 0) {
      const t = norm(x);
      if (!t || !mapa.has(t)) return x;
      return x.replace(/^(\s*)[\s\S]*?(\s*)$/, (m, a, b) => a + mapa.get(t) + b);
    }
    if (/^<(script|style|figure)/.test(x)) return x;
    return x.replace(ATRIB, (m, a, v) => (mapa.has(v.trim()) ? `${a}="${mapa.get(v.trim())}"` : m));
  }).join('');
  return out.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
}

// Textos de las páginas generadas que no tienen traducción todavía (para completar los archivos de idioma)
export function sinTraducir(paginas, mapa) {
  const f = new Set();
  for (const h of paginas) {
    const limpio = h.replace(/<(script|style)[\s\S]*?<\/\1>/g, '').replace(/<figure class="opinion">[\s\S]*?<\/figure>/g, '');
    for (const m of limpio.matchAll(/>([^<>]+)</g)) { const t = norm(m[1]); if (t.length > 1 && /[A-Za-zÁÉÍÓÚáéíóúñ]/.test(t) && !mapa.has(t)) f.add(t); }
  }
  return [...f];
}
