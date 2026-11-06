// README (ronda 36) · «Recuerdo»: lo que se puede conservar de una invitación cuando termina su tiempo online.
//   pdf     · vista estática para guardar en PDF (se abre limpia y se usa Imprimir → Guardar como PDF)   10 €
//   web     · la página interactiva para descargar (ZIP con index.html y sus archivos, para usar sin conexión)   25 €
//   online  · permanencia online ilimitada (la fecha de vencimiento pasa a 2099)   30 €
// Lo comprado se guarda en datos.recuerdo = { pdf|web|online: fecha }; los avisos enviados, en datos.recuerdo.avisos.
import { RECUERDO } from './catalogo.js';
import { sendEmail, mailRecuerdoVence } from './lib/email.js';
import { venceEvento } from './vencimiento.js';

export const ILIMITADO = '2099-12-31T23:59:59.000Z';
export const esIlimitado = (ev) => String(ev.vence || '') >= '2090';
export const compro = (ev, op) => !!ev.datos?.recuerdo?.[op];

// Lo que ve el panel (pestaña Recuerdo): opciones, precio en su moneda y si ya están compradas
export async function infoRecuerdo(ev, precioTexto) {
  const vence = venceEvento(ev);
  return {
    vence, ilimitado: esIlimitado(ev),
    opciones: await Promise.all(Object.entries(RECUERDO).map(async ([id, o]) => ({
      id, nombre: o.nombre, corto: o.corto, texto: o.texto, eur: o.precio, precio: await precioTexto(`recuerdo-${id}`, o.precio), comprado: id === 'online' ? esIlimitado(ev) : compro(ev, id),
    }))),
  };
}

// ── Mail «tu invitación está por salir de línea» (tarea diaria) ────────────
const AVISOS = [30, 7, 1];
export async function avisosVencimiento(env) {
  const { results } = await env.DB.prepare(`SELECT id, clave_panel, datos, vence, producto, paquete FROM eventos WHERE estado = 'publicado' AND empresa_id IS NULL`).all();
  const base = String(env.SITE_URL || 'https://app.amoinvitar.com').replace(/\/$/, '');
  const ahora = Date.now();
  for (const r of results || []) {
    try {
      const datos = JSON.parse(r.datos || '{}');
      if (datos.admin?.avisosMail === false) continue;
      const ev = { producto: r.producto, paquete: r.paquete, datos, vence: r.vence };
      if (esIlimitado(ev)) continue;
      const v = venceEvento(ev);
      if (!v) continue;
      const dias = Math.ceil((Date.parse(v) - ahora) / 86400000);
      const previos = datos.recuerdo?.avisos || [];
      const toca = AVISOS.filter((m) => dias <= m && dias >= 0 && !previos.includes(m));
      if (!toca.length) continue;
      const { results: mails } = await env.DB.prepare(`SELECT u.email FROM accesos_evento a JOIN usuarios u ON u.id = a.usuario_id WHERE a.evento_id = ?1
        UNION SELECT email FROM pedidos WHERE evento_id = ?1`).bind(r.id).all();
      const nombres = [datos.nombres?.a, datos.nombres?.b].filter(Boolean).join(' & ') || 'tu invitación';
      const url = `${base}/panel/${r.id}?k=${r.clave_panel}#recuerdo`;
      const compradas = Object.keys(RECUERDO).filter((o) => o !== 'online' && datos.recuerdo?.[o]);
      for (const to of new Set((mails || []).map((m) => String(m.email || '').toLowerCase()).filter(Boolean))) {
        await sendEmail(env, { to, ...mailRecuerdoVence(env, { nombres, dias, fecha: v.slice(0, 10), url, compradas }) });
      }
      datos.recuerdo = { ...(datos.recuerdo || {}), avisos: [...new Set([...previos, ...toca])] };
      await env.DB.prepare('UPDATE eventos SET datos = ? WHERE id = ?').bind(JSON.stringify(datos), r.id).run();
    } catch (e) { console.error('[recuerdo aviso]', r.id, e); }
  }
}

// ── Vista estática (para guardar en PDF) ──────────────────────────────────
export function paginaEstatica(html, titulo = 'Recuerdo de tu invitación') {
  const sinJs = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<link[^>]+rel="modulepreload"[^>]*>/gi, '');
  const css = `<style id="recuerdo-css">
*,*::before,*::after{animation:none!important;transition:none!important}
[data-aos],.aos-init{opacity:1!important;transform:none!important}
html,body{background:#fff}
.site-blocks-cover{background:#55705a;min-height:80vh!important}
.ai-slide{opacity:1!important;visibility:visible!important;background-size:cover!important;background-position:center!important}
.ai-slide:not(:first-child){display:none!important}
.recuerdo-barra{position:sticky;top:0;z-index:99999;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:10px 16px;background:#154b3f;color:#fff;font:500 15px/1.3 system-ui,sans-serif}
.recuerdo-barra button{border:0;border-radius:99px;background:#fff;color:#154b3f;font:600 14px system-ui,sans-serif;padding:10px 18px;cursor:pointer}
.recuerdo-barra small{display:block;font-weight:400;opacity:.85}
@page{margin:0}
@media print{.recuerdo-barra{display:none!important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>`;
  const barra = `<div class="recuerdo-barra"><span>${titulo}<small>Para guardarlo en PDF: Imprimir → Guardar como PDF</small></span><button type="button" onclick="window.print()">Guardar como PDF</button></div>`;
  return sinJs.replace('</head>', `${css}</head>`).replace(/<body([^>]*)>/i, `<body$1>${barra}`);
}

// ── ZIP con la página interactiva y sus archivos ──────────────────────────
const TABLA = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u8) => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = TABLA[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
export function zip(archivos) {
  const enc = new TextEncoder(), partes = [], central = [];
  let offset = 0;
  for (const f of archivos) {
    const nombre = enc.encode(f.ruta), crc = crc32(f.datos), size = f.datos.length;
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(12, 0x21, true);
    h.setUint32(14, crc, true); h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, nombre.length, true);
    partes.push(new Uint8Array(h.buffer), nombre, f.datos);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, nombre.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), nombre);
    offset += 30 + nombre.length + size;
  }
  const tamC = central.reduce((s, x) => s + x.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true); fin.setUint32(12, tamC, true); fin.setUint32(16, offset, true);
  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], { type: 'application/zip' });
}

const local = (ruta) => 'assets' + ruta;
function relativa(desde, hacia) {
  const a = desde.split('/').slice(0, -1), b = hacia.split('/');
  let i = 0;
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  return [...Array(a.length - i).fill('..'), ...b.slice(i)].join('/');
}
const normaliza = (ref, origen) => {
  ref = ref.trim().replace(/&amp;/g, '&');
  if (!ref || /^(data:|#|mailto:|tel:|javascript:|blob:)/i.test(ref)) return null;
  if (ref.startsWith(origen + '/')) ref = ref.slice(origen.length);
  if (!ref.startsWith('/') || ref.startsWith('//')) return null;
  const ruta = ref.split(/[?#]/)[0];
  return /^\/(api|auth|panel|admin|demo|acceso)\//.test(ruta) ? null : ruta;
};
function refsHtml(html) {
  const out = new Set();
  for (const m of html.matchAll(/\b(?:src|data-src|poster|data-poster|data-bg|data-background)\s*=\s*"([^"]+)"/g)) out.add(m[1]);
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) { if (/rel="(?:stylesheet|icon|shortcut icon|preload|apple-touch-icon)"/i.test(m[0])) { const h = /href="([^"]+)"/.exec(m[0]); if (h) out.add(h[1]); } }
  for (const m of html.matchAll(/\bsrcset\s*=\s*"([^"]+)"/g)) m[1].split(',').forEach((x) => out.add(x.trim().split(/\s+/)[0]));
  for (const m of html.matchAll(/url\(\s*(?:&quot;|['"])?([^'")&]+)(?:&quot;|['"])?\s*\)/g)) out.add(m[1]);
  return [...out];
}
function resolverRef(ref, base, origen) {
  ref = String(ref).trim();
  if (!ref || /^(data:|#|blob:)/i.test(ref)) return null;
  try { const u = new URL(ref, origen + base); return u.origin === origen && !/^\/(api|auth|panel|admin|demo|acceso)\//.test(u.pathname) ? u.pathname : null; } catch { return null; }
}
const refsCss = (css) => [...new Set([...css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g), ...css.matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]/g)].map((m) => m[1]))];

// traer(ruta) → { cuerpo: ArrayBuffer, tipo } | null. Devuelve { zip: Blob, faltaron }
export async function armarZip(html, { origen, traer, nombre, tope = 300, topeBytes = 45 * 1024 * 1024 }) {
  const archivos = [], hechos = new Map(), contenidos = new Map(); // ruta absoluta → ruta local / contenido
  let bytes = 0, faltaron = 0;
  const cola = [];
  const enc = new TextEncoder(), dec = new TextDecoder();
  const encolar = (ruta) => { if (!ruta || hechos.has(ruta) || hechos.size >= tope) return; hechos.set(ruta, local(ruta)); cola.push(ruta); };
  const reescribir = (texto, refs, desdeLocal) => {
    for (const ref of refs.sort((a, b) => b.length - a.length)) {
      const ruta = normaliza(ref, origen);
      if (!ruta || !hechos.has(ruta)) continue;
      texto = texto.split(ref).join(desdeLocal ? relativa(desdeLocal, hechos.get(ruta)) : hechos.get(ruta));
    }
    return texto;
  };
  for (const ref of refsHtml(html)) encolar(normaliza(ref, origen));
  while (cola.length) {
    const lote = cola.splice(0, 8);
    const r = await Promise.all(lote.map(async (ruta) => [ruta, await traer(ruta).catch(() => null)]));
    for (const [ruta, o] of r) {
      if (!o) { faltaron++; hechos.delete(ruta); continue; }
      let datos = new Uint8Array(o.cuerpo);
      if (/css/i.test(o.tipo || '') || ruta.endsWith('.css')) {
        // Lo que el css usa (fuentes, imágenes, otros css) también va en el ZIP; las rutas relativas siguen valiendo
        for (const ref of refsCss(dec.decode(datos))) { const x = resolverRef(ref, ruta, origen); if (x) encolar(x); }
      }
      bytes += datos.length;
      if (bytes > topeBytes) { faltaron++; continue; }
      contenidos.set(ruta, datos);
      archivos.push({ ruta: local(ruta), datos });
    }
  }
  // En el css, las fuentes van incrustadas (los navegadores no cargan fuentes de archivos locales) y las rutas absolutas pasan a relativas
  const MIME = { woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf' };
  const b64 = (u8) => { let t = ''; for (let i = 0; i < u8.length; i += 0x8000) t += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(t); };
  for (const f of archivos) {
    if (!f.ruta.endsWith('.css')) continue;
    const rutaCss = f.ruta.slice('assets'.length);
    let css = dec.decode(f.datos);
    for (const ref of refsCss(css).sort((a, c) => c.length - a.length)) {
      const x = resolverRef(ref, rutaCss, origen);
      const ext = (x || '').split('.').pop().toLowerCase();
      if (x && MIME[ext] && contenidos.has(x)) css = css.split(ref).join(`data:${MIME[ext]};base64,${b64(contenidos.get(x))}`);
      else if (x && ref.trim().startsWith('/') && hechos.has(x)) css = css.split(ref).join(relativa(f.ruta, hechos.get(x)));
    }
    f.datos = enc.encode(css);
  }
  const index = reescribir(html, refsHtml(html), null);
  const leeme = `Recuerdo de tu invitación\n\nAbre el archivo index.html con tu navegador (Chrome, Safari, Edge o Firefox) para ver tu invitación.\nFunciona sin conexión; las funciones que necesitan internet (confirmar asistencia, álbum, mapa interactivo) quedan inactivas.\nGuarda esta carpeta completa: index.html necesita la carpeta assets.\n\nAmo Invitar!`;
  archivos.unshift({ ruta: 'index.html', datos: enc.encode(index.replace('<head>', '<head><meta name="robots" content="noindex">')) }, { ruta: 'LEEME.txt', datos: enc.encode(leeme) });
  return { zip: zip(archivos), faltaron, nombre };
}
