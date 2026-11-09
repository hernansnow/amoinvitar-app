// README (ronda 30/31) · Etapa 2: la web nueva.
// Las páginas viven en public/sitio/ y se ven en la raíz del dominio (public/sitio/bodas.html → /bodas,
// public/sitio/index.html → /). Tienen prioridad sobre las del sitio viejo con la misma ruta, así se reemplazan de a una.
// Las rutas de la app (/panel, /tienda, /modelos, /comun, /api…) van antes y no se pisan, y las carpetas de las
// invitaciones viejas de los clientes tampoco (PROTEGIDAS): la web nueva nunca sirve nada ahí.
//
// Mientras se arma, la web está OCULTA en app.amoinvitar.com:
//   - con el secreto SITIO_CLAVE configurado (npx wrangler secret put SITIO_CLAVE), solo se ve después de entrar
//     una vez con  https://app.amoinvitar.com/?vista=<la clave>  (queda una cookie por 30 días; ?vista=salir la borra).
//     Sin la cookie (o sin SITIO_CLAVE), todo sigue como antes (la portada lleva a la tienda y lo demás al sitio de
//     siempre). En la compu (npm run local) se ve siempre.
//   - siempre fuera de amoinvitar.com: "noindex" (los buscadores no la indexan).
// En amoinvitar.com (el dominio principal) se ve siempre, sin clave.
import { getCookie, cookie, isSecureRequest } from '../lib/util.js';

const RESERVADAS = /^\/(api|panel|tienda|modelos|comun|mi-cuenta|entrar|ayuda|auth|media|demo|std|vista|acceso|mesa|puerta|factura|admin|empresa)(\/|$)/;
// Carpetas de las invitaciones y demos del sistema viejo (las de los clientes): nunca las toca la web nueva
export const PROTEGIDAS = /^\/(boda|15|evento|nuevos-bautismo|nuevos-comunion|nuevos-cumple|mi-bauti|mi-comuion|mi-cumple|mi-graduacion|save-the-date|birthday)\//;
const PRINCIPAL = /^(www\.)?amoinvitar\.com$/;

// ¿Esta visita puede ver la web nueva? (y la respuesta para entrar/salir con ?vista=)
function acceso(env, request, url) {
  if (PRINCIPAL.test(url.hostname) || env.MODO_LOCAL) return { ve: true };
  // Sin la clave configurada, fuera del dominio principal no se ve (queda oculta del todo)
  if (!env.SITIO_CLAVE) return { ve: false };
  const v = url.searchParams.get('vista');
  const destino = () => { const u = new URL(url); u.searchParams.delete('vista'); return u.href; };
  const opciones = (maxAge) => ({ maxAge, secure: isSecureRequest(request) });
  if (v === 'salir') return { respuesta: new Response(null, { status: 302, headers: { location: destino(), 'set-cookie': cookie('ai_sitio', '', opciones(0)) } }) };
  if (v && v === env.SITIO_CLAVE) return { respuesta: new Response(null, { status: 302, headers: { location: destino(), 'set-cookie': cookie('ai_sitio', env.SITIO_CLAVE, opciones(30 * 86400)) } }) };
  return { ve: getCookie(request, 'ai_sitio') === env.SITIO_CLAVE };
}

// README (ronda 32): páginas que se unificaron en la web nueva (Infantiles pasó a Cumpleaños)
const REDIRECCIONES = { '/infantiles': '/cumple', '/infantiles.html': '/cumple', '/crear-invitacion-para-infantil': '/crear-invitacion-para-cumpleanos', '/crear-invitacion-para-empresarial': '/empresarial' };

export async function sitioNuevo(env, request, url) {
  if (!['GET', 'HEAD'].includes(request.method) || RESERVADAS.test(url.pathname) || PROTEGIDAS.test(url.pathname)) return null;
  const a = acceso(env, request, url);
  if (a.respuesta) return a.respuesta;
  if (!a.ve) return null;
  const aca = REDIRECCIONES[url.pathname.replace(/\/$/, '')];
  if (aca) return Response.redirect(new URL(aca + url.search, url.origin).href, 301);
  // /crear-invitacion-para-<evento> es la misma página que /crear-invitacion
  const ruta = /^\/crear-invitacion-para-[a-z0-9-]+\/?$/i.test(url.pathname) ? '/crear-invitacion' : url.pathname;
  // Cloudflare resuelve solo "/sitio/bodas" → bodas.html; igual se prueban las variantes (en la compu no lo hace)
  const pedir = (p) => env.ASSETS.fetch(new Request(new URL(`/sitio${p}${url.search}`, url.origin), request));
  let r = await pedir(ruta);
  if (r.status === 404 && !/\.[a-z0-9]+$/i.test(ruta)) r = await pedir(ruta.endsWith('/') ? `${ruta}index.html` : `${ruta}.html`);
  if (r.status === 404 && !/\.[a-z0-9]+$/i.test(ruta) && !ruta.endsWith('/')) r = await pedir(`${ruta}/index.html`);
  if (r.status === 404) return null;
  // Assets redirige "/sitio/bodas.html" → "/sitio/bodas": la dirección pública no lleva /sitio
  if (r.status >= 300 && r.status < 400) {
    const l = r.headers.get('location');
    if (l) return Response.redirect(new URL(new URL(l, url.origin).pathname.replace(/^\/sitio/, '') || '/', url.origin).href + url.search, r.status);
  }
  if (PRINCIPAL.test(url.hostname)) return r;
  const h = new Headers(r.headers); h.set('x-robots-tag', 'noindex, nofollow'); h.set('cache-control', 'private, no-store');
  return new Response(r.body, { status: r.status, headers: h });
}
