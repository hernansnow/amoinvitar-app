// README (ronda 57) · Diseño propio de una invitación (cambio de colores/tipografía, diseño a medida, corporativo).
//
// Cada invitación puede tener su carpeta propia (R2: propio/<evento>/…) que se superpone a la del modelo base:
// lo que se sube con la misma ruta reemplaza al archivo del modelo (img/separador.png, estilo.css, index.html,
// modelo.json…) y lo que no se sube sigue saliendo del modelo. Los archivos nuevos se suman.
// La invitación la sirve desde /propio/<evento>~<versión>~<modelo base>/… (misma profundidad que /modelos/<modelo>/,
// así «../../comun/…» sigue funcionando). La versión cambia con cada subida: nunca queda una copia vieja en caché.
//
// ev.datos.propio = { base, activo, ver, css, head, plantilla, notas, actualizado }
//   base       modelo de partida (el de la invitación; en a medida/corporativo, el que se elija)
//   activo     se ve en la invitación publicada (si no, solo en la vista previa del administrador)
//   css        CSS extra (al final del <head>, gana sobre todo)
//   head       HTML extra en el <head> (fuentes de Google, <script>…)
//   plantilla  archivo HTML que se usa siempre (si no, el de siempre según tipo de evento y plan)
//
// Consola (solo administradores):
//   GET    /api/admin/propio/<evento>                      estado, archivos subidos, modelos, pedido del cliente
//   POST   /api/admin/propio/<evento>                      { base, activo, css, head, plantilla, notas }
//   PUT    /api/admin/propio/<evento>/archivo?ruta=img/x   el archivo (cuerpo crudo)
//   DELETE /api/admin/propio/<evento>/archivo?ruta=img/x   lo quita (vuelve el del modelo)
//   DELETE /api/admin/propio/<evento>                      borra todo el diseño propio
import { requiereAdmin } from './rutas/admin.js';
import { almacenD1 } from './almacen.js';
import { MODELOS } from './modelos.js';
import { HttpError } from './lib/util.js';

const PREFIJO = (id) => `propio/${id}/`;
const ID_OK = /^ev_[a-z0-9]+$/i;
const MODELO_OK = /^[a-z0-9-]+$/;
const MIME = {
  html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', ico: 'image/x-icon',
  woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf', eot: 'application/vnd.ms-fontobject',
  mp3: 'audio/mpeg', mp4: 'video/mp4', webm: 'video/webm', txt: 'text/plain; charset=utf-8',
};
export const mimeDe = (ruta) => MIME[String(ruta).split('.').pop().toLowerCase()] || 'application/octet-stream';

// Ruta relativa segura: sin «..», sin barra inicial, solo caracteres razonables
export function rutaSegura(r) {
  const s = String(r || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();
  if (!s || s.length > 200 || s.split('/').some((p) => !p || p === '.' || p === '..') || !/^[\w@()+,.~ -]+(\/[\w@()+,.~ -]+)*$/.test(s)) return null;
  return s;
}

// El diseño propio que vale para esta invitación (activo, o forzado en la vista previa del administrador)
export function propioDe(evento, forzar = false) {
  const p = evento?.propio;
  return p && p.base && MODELO_OK.test(p.base) && (p.activo || forzar) ? p : null;
}
export const rutaPropia = (id, p) => `/propio/${id}~${p.ver || '0'}~${p.base}`;

export async function leerPropio(env, id, ruta, tipo = 'text') {
  if (!env.MEDIA || !ID_OK.test(id)) return null;
  const o = await env.MEDIA.get(PREFIJO(id) + ruta).catch(() => null);
  if (!o) return null;
  const r = new Response(o.body);
  return tipo === 'json' ? r.json().catch(() => null) : r.text();
}

// GET /propio/<evento>~<ver>~<base>/<ruta>: primero lo subido, si no, el archivo del modelo base
export async function servirPropio(env, url) {
  const m = /^\/propio\/(ev_[a-z0-9]+)~([a-z0-9]+)~([a-z0-9-]+)\/(.+)$/i.exec(url.pathname);
  if (!m) return null;
  const [, id, , base] = m;
  const ruta = rutaSegura(decodeURIComponent(m[4]));
  if (!ruta) return new Response('No encontrado', { status: 404 });
  const cab = { 'cache-control': 'public, max-age=31536000, immutable', 'x-robots-tag': 'noindex' };
  const o = env.MEDIA ? await env.MEDIA.get(PREFIJO(id) + ruta).catch(() => null) : null;
  let r = null;
  if (!o) { r = await env.ASSETS.fetch(new URL(`/modelos/${base}/${ruta}`, url.origin)); if (!r.ok) return new Response('No encontrado', { status: 404 }); }
  const tipo = o ? o.httpMetadata?.contentType || mimeDe(ruta) : r.headers.get('content-type') || mimeDe(ruta);
  // README (ronda 59): CSS y SVG con los colores y fuentes cambiados (la versión de la ruta cambia con cada ajuste)
  if (RECOLOREABLE.test(ruta)) {
    const ev = await almacenD1(env).evento(id).catch(() => null);
    const p = ev?.datos?.propio;
    if (hayCambios(p)) {
      const texto = await new Response(o ? o.body : r.body).text();
      return new Response(recolorear(texto, p), { headers: { 'content-type': tipo, ...cab } });
    }
  }
  return new Response(o ? o.body : r.body, { headers: { 'content-type': tipo, ...cab } });
}

// README (ronda 59): reemplazo de colores y tipografías. Los modelos escriben los colores directo en su CSS y su HTML (no
// usan variables): propio.colores = [['#73527f', '#2ba4d2'], …] cambia cada color (en #hex, #hex corto, rgb() y rgba(),
// conservando la transparencia) en el CSS, los SVG y la página armada. propio.fuentes = [['Great Vibes', 'Amsterdam Four'], …]
// cambia la fuente donde aparezca. Todo en una sola pasada (un cambio no se encadena con otro).
const aHex = (x) => {
  let h = String(x || '').trim().toLowerCase().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/.test(h) ? '#' + h : null;
};
const rgbDe = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export function hayCambios(p) { return !!(p && ((p.colores || []).length || (p.fuentes || []).length)); }
export function recolorear(texto, p) {
  if (!hayCambios(p) || !texto) return texto;
  const mapa = new Map();
  for (const [d, h] of p.colores || []) { const a = aHex(d), b = aHex(h); if (a && b && a !== b) mapa.set(a, b); }
  let t = String(texto);
  if (mapa.size) {
    t = t.replace(/#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![0-9a-z_-])/gi, (m, h) => {
      // Con transparencia (#rrggbbaa / #rgba): se cambia el color y se conserva la transparencia
      const largo = h.length === 8 || h.length === 4;
      const color = largo ? (h.length === 8 ? h.slice(0, 6) : h.slice(0, 3)) : h;
      const alfa = largo ? (h.length === 8 ? h.slice(6) : h[3] + h[3]) : '';
      const nuevo = mapa.get(aHex(color));
      return nuevo ? nuevo + alfa : m;
    })
      .replace(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*[\d.]+%?\s*)?\)/gi, (m, r, g, b, alfa) => {
        const k = '#' + [r, g, b].map((n) => Math.min(255, +n).toString(16).padStart(2, '0')).join('');
        const nuevo = mapa.get(k);
        if (!nuevo) return m;
        const [R, G, B] = rgbDe(nuevo);
        return alfa ? `rgba(${R}, ${G}, ${B}${alfa.replace(/\s+$/, '')})` : `rgb(${R}, ${G}, ${B})`;
      });
  }
  // README (ronda 60): con tamaño distinto de 100 % va la copia de la fuente con size-adjust («Amsterdam Four AI70»)
  const fuentes = (p.fuentes || []).map(([d, h, e]) => [String(d || '').trim(), nombreFuente(h || d, e)]).filter(([d, h]) => d && h && d !== h);
  if (fuentes.length) {
    const lista = new Map(fuentes.map(([d, h]) => [d.toLowerCase(), h]));
    const nombres = [...lista.keys()].map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((x, y) => y.length - x.length);
    const re = new RegExp(`(["']?)\\b(${nombres.join('|')})\\b\\1`, 'gi');
    t = t.replace(re, (m, q, n) => `${q || '"'}${lista.get(n.toLowerCase())}${q || '"'}`);
  }
  return t;
}
const RECOLOREABLE = /\.(css|svg)$/i;
const escalaDe = (e) => { const n = Math.round(Number(e)); return Number.isFinite(n) && n >= 30 && n <= 250 ? n : 100; };
export const nombreFuente = (f, e) => { const n = String(f || '').trim(); return n && escalaDe(e) !== 100 ? `${n} AI${escalaDe(e)}` : n; };
// Copia de cada @font-face de la fuente con otro nombre y size-adjust (el tamaño cambia en toda la invitación)
async function caraEscalada(env, origen, base, fuente, escala) {
  const fuentesCss = ['/comun/fonts/catalogo/catalogo.css', `/modelos/${base}/estilo.css`, `/modelos/${base}/tema.css`];
  const caras = [];
  for (const ruta of fuentesCss) {
    const r = await env.ASSETS.fetch(new URL(ruta, origen)).catch(() => null);
    if (!r?.ok) continue;
    const css = await r.text();
    for (const m of css.match(/@font-face\s*\{[^}]*\}/gi) || []) {
      const fam = (/font-family\s*:\s*['"]?([^;'"]+)/i.exec(m) || [])[1];
      if (!fam || fam.trim().toLowerCase() !== fuente.toLowerCase()) continue;
      // Las direcciones relativas (url('x.woff2')) pasan a ser absolutas desde el CSS de donde salen
      const abs = m.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (u, q, src) => (/^(data:|https?:|\/)/i.test(src) ? u : `url('${new URL(src, new URL(ruta, origen)).pathname}')`));
      caras.push(abs.replace(/font-family\s*:[^;]+;?/i, `font-family: '${nombreFuente(fuente, escala)}';`).replace(/\}\s*$/, ` size-adjust: ${escala}%; }`));
    }
    if (caras.length) break;
  }
  return caras.join('\n');
}
export async function carasEscaladas(env, origen, base, fuentes) {
  const out = [], sinCara = [];
  for (const [d, h, e] of fuentes) {
    if (escalaDe(e) === 100) continue;
    const css = await caraEscalada(env, origen, base, h || d, escalaDe(e));
    if (css) out.push(css); else sinCara.push(h || d);
  }
  return { css: out.join('\n'), sinCara };
}

// Lo extra en la página armada: HTML en el <head> y el CSS propio al final del <head>
export function conExtrasPropios(html, p) {
  if (!p) return html;
  html = recolorear(html, p); // README (ronda 59): colores y fuentes del HTML (estilos en línea y <style>)
  const extra = `${(p.fuentes || []).length ? '\n<link rel="stylesheet" href="/comun/fonts/catalogo/catalogo.css">' : ''}${p.carasFuentes ? `\n<style id="fuentes-propias">\n${p.carasFuentes}\n</style>` : ''}${p.head ? `\n<!-- diseño propio -->\n${p.head}\n` : ''}${p.css ? `<style id="estilo-propio">\n${String(p.css).replace(/<\/style/gi, '<\\/style')}\n</style>\n` : ''}`;
  if (!extra) return html;
  return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${extra}</head>`) : extra + html;
}

async function listar(env, id) {
  const out = [];
  if (!env.MEDIA?.list) return out;
  let cursor;
  do {
    const r = await env.MEDIA.list({ prefix: PREFIJO(id), cursor, limit: 1000 });
    for (const o of r.objects || []) out.push({ ruta: o.key.slice(PREFIJO(id).length), tam: o.size, fecha: o.uploaded ? new Date(o.uploaded).toISOString() : null });
    cursor = r.truncated ? r.cursor : null;
  } while (cursor);
  return out.sort((a, b) => a.ruta.localeCompare(b.ruta));
}
const version = () => Date.now().toString(36);
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export async function adminPropio(request, env, id, sub) {
  await requiereAdmin(request, env);
  if (!ID_OK.test(id)) throw new HttpError(400, 'Invitación inválida');
  const alm = almacenD1(env);
  const ev = await alm.evento(id);
  if (!ev) throw new HttpError(404, 'Invitación no encontrada');
  const url = new URL(request.url);
  const p = ev.datos.propio || null;
  const guardar = async (cambios) => {
    ev.datos.propio = { ...(ev.datos.propio || { base: ev.modelo || '', activo: false, css: '', head: '', plantilla: '' }), ...cambios, ver: version(), actualizado: new Date().toISOString() };
    await alm.guardarEvento(ev);
    return ev.datos.propio;
  };

  if (sub === 'archivo') {
    const ruta = rutaSegura(url.searchParams.get('ruta'));
    if (!ruta) throw new HttpError(400, 'Ruta inválida (sin «..», sin espacios raros)');
    if (!env.MEDIA) throw new HttpError(503, 'Sin almacenamiento de archivos');
    if (request.method === 'PUT') {
      const cuerpo = await request.arrayBuffer();
      if (cuerpo.byteLength > 25 * 1024 * 1024) throw new HttpError(413, 'Archivo de más de 25 MB');
      await env.MEDIA.put(PREFIJO(id) + ruta, cuerpo, { httpMetadata: { contentType: mimeDe(ruta) } });
      await guardar({});
      return json({ ok: true, ruta, tam: cuerpo.byteLength });
    }
    if (request.method === 'DELETE') {
      await env.MEDIA.delete(PREFIJO(id) + ruta);
      await guardar({});
      return json({ ok: true });
    }
    throw new HttpError(405, 'Método no permitido');
  }

  if (request.method === 'GET') {
    const archivos = await listar(env, id);
    const disponibles = MODELOS.filter((m) => !m.std).map((m) => ({ id: m.id, nombre: m.nombre, eventos: m.eventos }));
    return json({
      evento: { id: ev.id, tipo: ev.tipo, modelo: ev.modelo, producto: ev.producto, aMedida: ev.aMedida, paquete: ev.paquete, estado: ev.estado, slug: ev.slug, clave: ev.clave,
        nombres: [ev.datos.nombres?.a, ev.datos.nombres?.b].filter(Boolean).join(' & '), medida: ev.datos.medida || null },
      propio: p, archivos, modelos: disponibles,
      // Lo que pidió el cliente (complemento «Cambios de diseño») y su idea para el diseño a medida
      pedido: { diseno: ev.datos.diseno || null, medida: ev.datos.medida || null },
      ruta: p?.base ? rutaPropia(ev.id, p) : null,
    });
  }
  if (request.method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const c = {};
    if (b.base !== undefined) { if (!MODELO_OK.test(String(b.base))) throw new HttpError(400, 'Modelo base inválido'); c.base = String(b.base); }
    if (b.activo !== undefined) c.activo = !!b.activo;
    if (b.css !== undefined) c.css = String(b.css).slice(0, 200000);
    if (b.head !== undefined) c.head = String(b.head).slice(0, 50000);
    if (b.plantilla !== undefined) c.plantilla = b.plantilla ? rutaSegura(b.plantilla) || '' : '';
    if (b.notas !== undefined) c.notas = String(b.notas).slice(0, 5000);
    // README (ronda 59): [[desde, hacia], …]
    const pares = (x, n, max) => (Array.isArray(x) ? x : []).filter((v) => Array.isArray(v) && v[0] && v[1]).slice(0, n).map(([d, h]) => [String(d).slice(0, max), String(h).slice(0, max)]);
    if (b.colores !== undefined) c.colores = pares(b.colores, 120, 30).map(([d, h]) => [aHex(d), aHex(h)]).filter(([d, h]) => d && h);
    let sinCara = [];
    if (b.fuentes !== undefined) {
      // README (ronda 60): [desde, hacia, tamaño %]; sin «hacia», la misma fuente con otro tamaño
      const limpia = (x) => String(x || '').replace(/["';{}<>]/g, '').trim().slice(0, 60);
      c.fuentes = (Array.isArray(b.fuentes) ? b.fuentes : []).slice(0, 20).map((v) => (Array.isArray(v) ? [limpia(v[0]), limpia(v[1]) || limpia(v[0]), escalaDe(v[2])] : null))
        .filter((v) => v && v[0] && (v[0] !== v[1] || v[2] !== 100));
      const r = await carasEscaladas(env, url.origin, c.base || p?.base || ev.modelo, c.fuentes);
      c.carasFuentes = r.css; sinCara = r.sinCara;
    }
    if (c.activo && !(c.base || p?.base || ev.modelo)) throw new HttpError(400, 'Falta elegir el modelo base');
    return json({ ok: true, propio: await guardar(c), ...(sinCara.length ? { aviso: `No encontré el archivo de ${sinCara.join(', ')} para cambiarle el tamaño: usá una fuente del catálogo o ajustalo en el CSS extra.` } : {}) });
  }
  if (request.method === 'DELETE') {
    for (const a of await listar(env, id)) await env.MEDIA.delete(PREFIJO(id) + a.ruta);
    delete ev.datos.propio;
    await alm.guardarEvento(ev);
    return json({ ok: true });
  }
  throw new HttpError(405, 'Método no permitido');
}
