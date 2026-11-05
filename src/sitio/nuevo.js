// README (ronda 30) · Etapa 2: las páginas de la web nueva viven en public/sitio/ y se ven en la raíz del dominio
// (public/sitio/bodas.html → amoinvitar.com/bodas). Tienen prioridad sobre las del sitio viejo con la misma ruta, así
// se reemplazan de a una. Las rutas de la app (/panel, /tienda, /modelos, /comun, /api…) van antes y no se pisan.
const RESERVADAS = /^\/(api|panel|tienda|modelos|comun|mi-cuenta|entrar|ayuda|auth|media|demo|std|vista|acceso|mesa|puerta|factura|admin)(\/|$)/;

export async function sitioNuevo(env, request, url) {
  if (!['GET', 'HEAD'].includes(request.method) || RESERVADAS.test(url.pathname)) return null;
  // Las mismas reglas que la página "crear invitación": /crear-invitacion-para-<evento> es la misma página
  const ruta = /^\/crear-invitacion-para-[a-z0-9-]+\/?$/i.test(url.pathname) ? '/crear-invitacion' : url.pathname;
  const r = await env.ASSETS.fetch(new Request(new URL(`/sitio${ruta}${url.search}`, url.origin), request));
  if (r.status === 404) return null;
  // Assets redirige "/sitio/bodas.html" → "/sitio/bodas": la dirección pública no lleva /sitio
  if (r.status >= 300 && r.status < 400) {
    const l = r.headers.get('location');
    if (l) return Response.redirect(new URL(new URL(l, url.origin).pathname.replace(/^\/sitio/, '') || '/', url.origin).href + url.search, r.status);
  }
  return r;
}
