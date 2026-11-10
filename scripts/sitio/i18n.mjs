// README (ronda 40/42) · Traducción de las páginas de la web nueva (inglés, portugués, francés, italiano, alemán, neerlandés).
// El español es la fuente: scripts/sitio/i18n/fuente.json guarda los textos (en orden) y scripts/sitio/i18n/<idioma>.json trae
// la traducción por número ("12": "…"). Lo que no tiene traducción queda en español.
// Portugal (pt-pt) sale del portugués de Brasil con las palabras de allá (aPortugal); si existe i18n/pt-pt.json, lo pisa.
// Cuando se cambia un texto en español, corre `npm run sitio:i18n` para ver qué quedó sin traducir.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const fuente = JSON.parse(readFileSync(join(AQUI, 'i18n/fuente.json'), 'utf8'));
// clave de la web → archivo de traducción
export const ARCHIVO = { en: 'en', 'pt-br': 'pt', 'pt-pt': 'pt', fr: 'fr', it: 'it', de: 'de', nl: 'nl' };
export const IDIOMAS = Object.keys(ARCHIVO).filter((l) => existsSync(join(AQUI, `i18n/${ARCHIVO[l]}.json`)));
const norm = (t) => t.replace(/\s+/g, ' ').trim();
const leer = (f) => (existsSync(join(AQUI, f)) ? JSON.parse(readFileSync(join(AQUI, f), 'utf8')) : {});

// Portugués de Brasil → de Portugal (las palabras que cambian; «você» se mantiene, como en la mayoría de las marcas de allá)
const PT = {
  celular: 'telemóvel', celulares: 'telemóveis', tela: 'ecrã', telas: 'ecrãs', equipe: 'equipa', equipes: 'equipas', arquivo: 'ficheiro',
  arquivos: 'ficheiros', cadastro: 'registo', cadastre: 'registe', cadastrar: 'registar', registro: 'registo', registros: 'registos',
  registrar: 'registar', contato: 'contacto', contatos: 'contactos', 'ônibus': 'autocarro', baixar: 'descarregar', baixe: 'descarregue',
  aplicativo: 'aplicação', aplicativos: 'aplicações', 'usuário': 'utilizador', 'usuários': 'utilizadores', fato: 'facto', planejar: 'planear',
  planejamento: 'planeamento', planeje: 'planeie', 'cardápio': 'menu', 'bebê': 'bebé', 'bebês': 'bebés', 'chá de bebê': 'baby shower',
  'câmera': 'câmara', gerenciar: 'gerir', gerencie: 'gira', gerenciamento: 'gestão', gerencia: 'gere', senha: 'palavra-passe', senhas: 'palavras-passe',
  excluir: 'eliminar', exclua: 'elimine', salvar: 'guardar', salve: 'guarde', 'pôster': 'póster', 'econômico': 'económico', 'gênero': 'género',
  'prêmio': 'prémio', 'prêmios': 'prémios', 'acadêmico': 'académico', 'ônus': 'ónus', 'tênis': 'ténis', 'você mesmo': 'você próprio',
};
const RE_PT = new RegExp(`(?<![\\p{L}])(${Object.keys(PT).sort((a, b) => b.length - a.length).join('|')})(?![\\p{L}])`, 'giu');
const INF = (v) => v.replace(/ando$/, 'ar').replace(/endo$/, 'er').replace(/indo$/, 'ir');
export function aPortugal(t) {
  return String(t)
    .replace(RE_PT, (m) => { const n = PT[m.toLowerCase()]; return m[0] !== m[0].toLowerCase() ? n[0].toUpperCase() + n.slice(1) : n; })
    .replace(/(?<![\p{L}])em um(?![\p{L}])/gu, 'num').replace(/(?<![\p{L}])em uma(?![\p{L}])/gu, 'numa').replace(/(?<![\p{L}])Em um(?![\p{L}])/gu, 'Num')
    // gerúndio → «a» + infinitivo: «estão confirmando» → «estão a confirmar»
    .replace(/(?<![\p{L}])(estou|está|estão|estamos|ficam|fica|continua|continuam)\s+(\p{L}+(?:ando|endo|indo))(?![\p{L}])/giu, (m, a, v) => `${a} a ${INF(v)}`);
}

export function cargaMapa(clave) {
  const tr = leer(`i18n/${ARCHIVO[clave]}.json`);
  const propio = clave === 'pt-pt' ? leer('i18n/pt-pt.json') : {};
  const m = new Map();
  for (const [i, v0] of Object.entries(tr)) {
    if (fuente[i] == null || !v0) continue;
    const v = propio[i] || (clave === 'pt-pt' ? aPortugal(v0) : v0);
    m.set(fuente[i], v);
  }
  return m;
}

const ATRIB = /\b(alt|title|placeholder|aria-label)="([^"]*)"/g;
const ESC = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
export function traducir(html, mapa, lang) {
  const trozos = html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<figure class="opinion">[\s\S]*?<\/figure>|<[^>]+>)/);
  const out = trozos.map((x, i) => {
    if (i % 2 === 0) {
      const t = norm(x);
      if (!t || !mapa.has(t)) return x;
      return x.replace(/^(\s*)[\s\S]*?(\s*)$/, (m, a, b) => a + mapa.get(t) + b);
    }
    if (/^<script/.test(x) && /application\/ld\+json/.test(x)) return x.replace(/"((?:[^"\\]|\\.)*)"/g, (m, v) => { const s = norm(JSON.parse(m)); return mapa.has(s) ? JSON.stringify(mapa.get(s)) : m; });
    if (/^<(script|style|figure)/.test(x)) return x;
    // <title> y <meta content> también se traducen
    return x.replace(ATRIB, (m, a, v) => (mapa.has(v.trim()) ? `${a}="${ESC(mapa.get(v.trim()))}"` : m))
      .replace(/\b(content)="([^"]*)"/, (m, a, v) => (mapa.has(v.trim()) ? `${a}="${ESC(mapa.get(v.trim()))}"` : m));
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
