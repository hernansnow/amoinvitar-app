// README (ronda 30) · Etapa 2: la web completa en Cloudflare, sin Hostinger.
//
// Mientras se arma la web nueva, todo lo del sitio de siempre (páginas, css, js, imágenes y las invitaciones de los
// clientes del sistema viejo, con sus carpetas como "boda/++base-AR (Argentina)/…") vive en un bucket R2 (LEGADO)
// con las mismas rutas que en el hosting. Este módulo:
//   1. aplica las reglas del .htaccess (redirecciones y direcciones sin ".html"),
//   2. sirve los archivos del bucket tal cual (así los css y scripts viejos siguen funcionando para las
//      invitaciones activas), con su tipo, caché y pedidos parciales (videos),
//   3. reemplaza los PHP que se usaban: sugerir canciones (a-musica.php / lista-canciones.php) y el formulario de
//      contacto (email/mailer2.php y los mailer*.php de cada país).
//
// Las páginas nuevas de la web (public/sitio/…) tienen prioridad sobre las viejas con la misma ruta: así se reemplazan
// de a una, sin apuro, y lo que todavía no se rehízo sigue saliendo del bucket.
// Sin el bucket configurado (env.LEGADO), no hace nada: sigue la redirección/proxy al hosting actual (ORIGEN_ANTIGUO).

import { leerContacto, procesarContacto } from '../rutas/contacto.js';

const TIPOS = {
  html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8', json: 'application/json; charset=utf-8', xml: 'application/xml; charset=utf-8', txt: 'text/plain; charset=utf-8',
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon',
  mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4',
  woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf', eot: 'application/vnd.ms-fontobject',
  pdf: 'application/pdf', webmanifest: 'application/manifest+json', map: 'application/json',
};
const ext = (k) => (k.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || '';
// Lo que nunca se sirve aunque esté en el bucket (fuentes de diseño, código del servidor, configuraciones)
const PROHIBIDO = /(^|\/)\.|\.(php|psd|ai|sql|sh|env|bak|zip|rar)$|(^|\/)apps-script\//i;
// Caché: el HTML siempre fresco (como en el .htaccess), lo demás por mucho tiempo
const cache = (e) => (['html', 'htm', 'json', 'xml', 'txt', 'webmanifest'].includes(e) ? 'public, max-age=0, must-revalidate'
  : e === 'css' || e === 'js' ? 'public, max-age=2592000' : 'public, max-age=31536000');

// ── Reglas del .htaccess (las que no resuelve Cloudflare solo: https y sin www van en el panel de Cloudflare) ──
export function redireccionLegado(url) {
  const p = url.pathname;
  const a = (destino) => Response.redirect(new URL(destino + url.search, url.origin).href, 301);
  if (/^\/(?:[a-z]{2}\/)?(?:store|tienda)\/?$/i.test(p)) return Response.redirect(new URL('/crear-invitacion', url.origin).href, 301);
  if (/^\/opciones\/?$/i.test(p)) return a('/precios');
  const op = p.match(/^\/([^/]+)\/opciones\/?$/i); if (op) return a(`/${op[1]}/precios`);
  if (/^\/demo\/save-the-date-web-classic\/?$/i.test(p)) return null; // excepción del .htaccess
  if (/classic\.html$/i.test(p)) return a(p.replace(/classic\.html$/i, 'basic.html'));
  if (/classic\/?$/i.test(p)) return a(p.replace(/classic\/?$/i, 'basic'));
  return null;
}
// Reescrituras internas (la dirección no cambia para el visitante)
function reescribir(p) {
  const cr = p.match(/^\/crear-invitacion-para-([a-z0-9-]+)\/?$/i); if (cr) return '/crear-invitacion.html';
  const bz = p.match(/^\/(?:([a-z]{2})\/)?bautizo\/?$/i); if (bz) return `${bz[1] ? `/${bz[1]}` : ''}/bautismo`;
  const bd = p.match(/^\/birthday\/(.*)$/i); if (bd) return `/mi-cumple/${bd[1]}`;
  return p;
}

// El archivo del bucket para una ruta: tal cual, con .html o su index.html (como "Eliminar extensiones" del .htaccess)
async function buscar(env, ruta) {
  let clave = ruta.replace(/^\/+/, '');
  try { clave = decodeURIComponent(clave); } catch { /* ruta con % sueltos: tal cual */ }
  if (PROHIBIDO.test(clave)) return null;
  const base = clave.replace(/\/+$/, '');
  const candidatos = clave === '' ? ['index.html']
    : clave.endsWith('/') ? [`${base}/index.html`, `${base}.html`]
      : ext(clave) ? [clave] : [`${base}.html`, `${base}/index.html`, base];
  for (const k of candidatos) {
    const o = await env.LEGADO.head(k);
    if (o) return { clave: k, objeto: o, carpeta: !clave.endsWith('/') && k.endsWith('/index.html') && !ext(clave) };
  }
  return null;
}

async function entregar(env, request, encontrado) {
  const { clave } = encontrado;
  const rango = request.headers.get('range');
  const o = await env.LEGADO.get(clave, rango ? { range: request.headers, onlyIf: request.headers } : { onlyIf: request.headers });
  if (!o) return null;
  const h = new Headers();
  o.writeHttpMetadata(h);
  h.set('etag', o.httpEtag);
  if (!h.get('content-type')) h.set('content-type', TIPOS[ext(clave)] || 'application/octet-stream');
  h.set('cache-control', cache(ext(clave)));
  h.set('accept-ranges', 'bytes');
  if (!('body' in o) || !o.body) return new Response(null, { status: 304, headers: h });
  if (rango && o.range) {
    const ini = o.range.offset ?? 0, largo = o.range.length ?? (o.size - ini);
    h.set('content-range', `bytes ${ini}-${ini + largo - 1}/${o.size}`);
    return new Response(request.method === 'HEAD' ? null : o.body, { status: 206, headers: h });
  }
  return new Response(request.method === 'HEAD' ? null : o.body, { status: 200, headers: h });
}

// ── Reemplazos de los PHP ──
// a-musica.php: cada invitación vieja guardaba las canciones sugeridas en canciones.txt de su carpeta. Ahora van a D1
// (tabla legado_canciones) y lista-canciones.php las muestra junto con las que ya estaban en el .txt del bucket.
async function sugerirCancion(env, request, carpeta) {
  const f = await request.formData().catch(() => null);
  const texto = String(f?.get('fname') || '').trim().slice(0, 300);
  if (texto) await env.DB.prepare('INSERT INTO legado_canciones (carpeta, texto, creado) VALUES (?, ?, ?)').bind(carpeta, texto, new Date().toISOString()).run();
  // El formulario viejo se mandaba por AJAX o con recarga: se responde vacío y, si viene de un navegador, se vuelve
  return request.headers.get('referer') ? Response.redirect(request.headers.get('referer'), 303) : new Response('', { status: 200 });
}
async function listaCanciones(env, carpeta) {
  const viejo = await env.LEGADO.get(`${carpeta}/canciones.txt`).then((o) => (o ? o.text() : '')).catch(() => '');
  const { results } = await env.DB.prepare('SELECT texto FROM legado_canciones WHERE carpeta = ? ORDER BY id').bind(carpeta).all();
  const todas = [...viejo.split('\n'), ...results.map((r) => r.texto)].map((x) => x.trim()).filter(Boolean);
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Canciones sugeridas</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:640px;margin:30px auto;padding:0 16px;color:#333}li{padding:6px 0;border-bottom:1px solid #eee}</style>
<h1>Canciones sugeridas (${todas.length})</h1><ol>${todas.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
// Formulario de contacto de las páginas viejas (email/mailer2.php, {pais}/email/mailer*.php): usa el mismo de la web
// nueva (src/rutas/contacto.js) y responde como el PHP: una página que vuelve sola a donde estaba
async function contacto(env, request) {
  const ref = request.headers.get('referer') || '';
  const volver = /^https:\/\/(?:[a-z0-9-]+\.)*amoinvitar\.com\//.test(ref) ? ref.split('#')[0] : 'https://amoinvitar.com/';
  const pagina = (texto, ok) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<meta http-equiv="refresh" content="5;URL=${volver}${ok ? '' : '#contacto'}"><title>Amo Invitar! | Formulario de contacto</title>
<body style="padding:100px 20px;color:#fff;font:18px/1.5 Arial,sans-serif;text-align:center;background:#4e9c87"><p>${texto}</p><p><a style="color:#fff" href="${volver}">Volver</a></p>`,
    { status: ok ? 200 : 400, headers: { 'content-type': 'text/html; charset=utf-8' } });
  try {
    await procesarContacto(env, request, { ...(await leerContacto(request)), pagina: volver });
    return pagina('¡Gracias! Recibimos tu mensaje y te responderemos pronto.', true);
  } catch (e) { return pagina(e.message || 'No se pudo enviar el mensaje.', false); }
}

// Entrada: devuelve la respuesta del sitio viejo o null (si no hay bucket o no existe la ruta)
// prefijo: carpeta del bucket para un subdominio (panel.amoinvitar.com → "panel": los paneles viejos de los clientes,
// que en Hostinger eran la carpeta /panel/ servida en ese subdominio)
export async function servirLegado(request, env, url, { prefijo = '' } = {}) {
  if (!env.LEGADO) return null;
  if (prefijo) {
    if (!['GET', 'HEAD'].includes(request.method)) return null;
    const e = await buscar(env, `/${prefijo}${url.pathname}`);
    if (!e) return null;
    if (e.carpeta && !url.pathname.endsWith('/')) return Response.redirect(new URL(`${url.pathname}/${url.search}`, url.origin).href, 301);
    return entregar(env, request, e);
  }
  const r = redireccionLegado(url);
  if (r) return r;
  const p = url.pathname;
  // PHP de las invitaciones viejas y del formulario de contacto
  const php = p.match(/^\/(.+)\/(a-musica|lista-canciones)\.php$/i);
  if (php) {
    let carpeta = php[1]; try { carpeta = decodeURIComponent(carpeta); } catch { /* tal cual */ }
    if (php[2].toLowerCase() === 'a-musica' && request.method === 'POST') return sugerirCancion(env, request, carpeta);
    if (php[2].toLowerCase() === 'lista-canciones') return listaCanciones(env, carpeta);
  }
  if (/^\/(?:[a-z]{2}\/)?email\/mailer[a-z0-9-]*\.php$/i.test(p) && request.method === 'POST') return contacto(env, request);
  if (!['GET', 'HEAD'].includes(request.method)) return null;
  const ruta = reescribir(p);
  const e = await buscar(env, ruta);
  if (!e) return null;
  // Carpeta sin barra final ("/boda/sofi"): como Apache, se redirige con la barra para que las rutas relativas anden
  if (e.carpeta && !p.endsWith('/')) return Response.redirect(new URL(`${p}/${url.search}`, url.origin).href, 301);
  return entregar(env, request, e);
}
