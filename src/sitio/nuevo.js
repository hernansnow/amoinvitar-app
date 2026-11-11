// README (ronda 30/31/42) · Etapa 2: la web nueva.
// Cada página se ve en la raíz (versión neutra: /bodas) y en la carpeta de cada país (/es/bodas, /ar/bodas, /us/en/bodas…),
// como en el sitio viejo. Los países, su idioma, su moneda y sus ciudades están en src/sitio/variantes.js.
// Los archivos están en public/sitio/t/<clave>/<página>.html (los genera npm run sitio, una vez por clave de texto) y acá se
// completa cada uno para su país: título con el país, descripción con sus ciudades, canonical, hreflang, links con la carpeta.
//
// Idioma automático (README ronda 42/43): solo en las páginas de la raíz (sin carpeta). A una persona (no a los buscadores)
// se la lleva a la carpeta del país que eligió en el selector (cookie ai_elegida) o, si nunca eligió, a la del país de su IP
// (Estados Unidos: /us/en/ si el navegador está en inglés). Una dirección con carpeta (/ar/…) se muestra siempre tal cual,
// la escriba a mano o venga de Google. Los países sin carpeta se quedan en la raíz neutra. Los buscadores ven cada
// dirección tal cual (sin redirecciones), con sus hreflang: así no hay contenido duplicado.
//
// Las rutas de la app (/panel, /tienda, /modelos, /comun, /api…) van antes y no se pisan, y las carpetas de las invitaciones
// viejas de los clientes tampoco (PROTEGIDAS): la web nueva nunca sirve nada ahí.
//
// Mientras se arma, la web está OCULTA en app.amoinvitar.com:
//   - con el secreto SITIO_CLAVE configurado (npx wrangler secret put SITIO_CLAVE), solo se ve después de entrar
//     una vez con  https://app.amoinvitar.com/?vista=<la clave>  (queda una cookie por 30 días; ?vista=salir la borra).
//     Sin la cookie (o sin SITIO_CLAVE), todo sigue como antes. En la compu (npm run local) se ve siempre.
//   - siempre fuera de amoinvitar.com: "noindex" (los buscadores no la indexan).
// En amoinvitar.com (el dominio principal) se ve siempre, sin clave.
import { getCookie, cookie, isSecureRequest } from '../lib/util.js';
import { SEDES, NEUTRA, sedeDePais, sedeDeCarpeta, sedePorIdioma, ogLocale } from './variantes.js';
import { MODELOS } from '../modelos.js';

const SITIO = 'https://amoinvitar.com';
const RESERVADAS = /^\/(api|panel|tienda|modelos|comun|mi-cuenta|entrar|ayuda|auth|media|demo|std|vista|acceso|mesa|puerta|factura|admin|empresa|sitio)(\/|$)/;
// Carpetas de las invitaciones y demos del sistema viejo (las de los clientes): nunca las toca la web nueva
export const PROTEGIDAS = /^\/(boda|15|evento|nuevos-bautismo|nuevos-comunion|nuevos-cumple|mi-bauti|mi-comuion|mi-cumple|mi-graduacion|save-the-date|birthday)\//;
const PRINCIPAL = /^(www\.)?amoinvitar\.com$/;
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|lighthouse|headless|google|bing|yandex|baidu|duckduck|semrush|ahrefs|petal|applebot|pinterest|embedly|quora|vkshare|skype|slack|discord/i;

// ¿Esta visita puede ver la web nueva? (y la respuesta para entrar/salir con ?vista=)
function acceso(env, request, url) {
  if (PRINCIPAL.test(url.hostname) || env.MODO_LOCAL) return { ve: true };
  if (!env.SITIO_CLAVE) return { ve: false };
  const v = url.searchParams.get('vista');
  const destino = () => { const u = new URL(url); u.searchParams.delete('vista'); return u.href; };
  const opciones = (maxAge) => ({ maxAge, secure: isSecureRequest(request) });
  if (v === 'salir') return { respuesta: new Response(null, { status: 302, headers: { location: destino(), 'set-cookie': cookie('ai_sitio', '', opciones(0)) } }) };
  if (v && v === env.SITIO_CLAVE) return { respuesta: new Response(null, { status: 302, headers: { location: destino(), 'set-cookie': cookie('ai_sitio', env.SITIO_CLAVE, opciones(30 * 86400)) } }) };
  return { ve: getCookie(request, 'ai_sitio') === env.SITIO_CLAVE };
}

// Páginas que se unificaron o cambiaron de nombre (también dentro de cada carpeta de país)
const REDIRECCIONES = { 'crear-invitacion-sweet16': 'crear-invitacion-para-sweet16', infantiles: 'cumple', 'crear-invitacion-para-infantil': 'crear-invitacion-para-cumpleanos', 'crear-invitacion-para-empresarial': 'empresarial' };

// /ar/bodas → { sede: Argentina, pagina: 'bodas' } · /us/en/ → { sede: Estados Unidos en inglés, pagina: 'index' }
function partir(pathname) {
  const p = pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/';
  const m = /^\/([a-z]{2})(?:\/([a-z]{2}))?(?=\/|$)(.*)$/.exec(p);
  let sede = NEUTRA, resto = p;
  if (m) {
    const doble = m[2] && sedeDeCarpeta(`/${m[1]}/${m[2]}`);
    const simple = sedeDeCarpeta(`/${m[1]}`);
    if (doble) { sede = doble; resto = m[3]; } else if (simple) { sede = simple; resto = p.slice(3); }
  }
  return { sede, pagina: resto.replace(/^\//, '') || 'index' };
}

// Demos del sitio viejo dentro de cada país (/ar/aquarella/, /mx/disco15/): ahora hay una sola demo por modelo, que se
// muestra en el idioma y con los lugares del país de quien la mira.
function demoVieja(pagina) {
  const m = /^([a-z]+?)(15)?$/.exec(pagina.split('/')[0]);
  if (!m) return null;
  const id = MODELOS.find((x) => x.id === m[1] && !x.simple && !x.std);
  if (!id) return null;
  const evento = m[2] ? '15' : (id.eventos.includes('boda') ? 'boda' : id.eventos[0]);
  return `/demo/${id.id}?evento=${evento}`;
}

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const urlDe = (sede, pagina) => `${SITIO}${sede.carpeta}/${pagina === 'index' ? '' : pagina}`;
const idiomaDe = (sede) => sede.clave.split('-')[0];
// «En toda España: Madrid, Barcelona…» en el idioma de la página
function zona(sede) {
  if (!sede.nombre) return '';
  const n = sede.nombre, c = sede.ciudades;
  switch (idiomaDe(sede)) {
    case 'en': return `Across ${n === 'United States' || n === 'United Kingdom' ? 'the ' + n : n}: ${c}.`;
    case 'pt': return `${n === 'Brasil' ? 'Em todo o Brasil' : `Em todo ${n}`}: ${c}.`;
    case 'fr': return `Partout ${{ Belgique: 'en Belgique', Suisse: 'en Suisse', Canada: 'au Canada' }[n] || 'en France'} : ${c}.`;
    case 'it': return `${n === 'Svizzera' ? 'In tutta la Svizzera' : 'In tutta Italia'}: ${c}.`;
    case 'de': return `${n === 'Schweiz' ? 'In der ganzen Schweiz' : `In ganz ${n}`}: ${c}.`;
    case 'nl': return `In heel ${n}: ${c}.`;
    default: return `En ${/a$/.test(n) && n !== 'Panamá' ? 'toda' : 'todo'} ${n}: ${c}.`;
  }
}
// README (ronda 46): el título de la portada principal lleva el país: «Invitaciones digitales en Argentina» (con la preposición de cada idioma)
function enPais(sede) {
  const n = sede.nombre;
  if (!n) return '';
  switch (idiomaDe(sede)) {
    case 'en': return ` in ${['United States', 'United Kingdom'].includes(n) ? 'the ' + n : n}`;
    case 'pt': return n === 'Brasil' ? ' no Brasil' : ` em ${n}`;
    case 'fr': return ` ${{ Canada: 'au Canada' }[n] || `en ${n}`}`;
    case 'it': return n === 'Svizzera' ? ' in Svizzera' : ` in ${n}`;
    case 'de': return n === 'Schweiz' ? ' in der Schweiz' : ` in ${n}`;
    case 'nl': return ` in ${n}`;
    default: return ` en ${n}`;
  }
}
const PIE_ZONA = { es: 'Invitaciones digitales', en: 'Digital invitations', pt: 'Convites digitais', fr: 'Invitations numériques', it: 'Inviti digitali', de: 'Digitale Einladungen', nl: 'Digitale uitnodigingen' };

// Completa la página guardada para la carpeta de un país
// README (ronda 43): los artículos de /ideas/ están solo en español (sus hreflang, solo entre las carpetas en español)
const soloEspanol = (pagina) => /^ideas(\/|$)/.test(pagina);
// README (ronda 44): Sweet 16 solo en inglés (Estados Unidos, Canadá e internacional)
const soloIngles = (pagina) => pagina === 'sweet16';
function componer(html, sede, pagina, { legal = false, monedaRaiz = '' } = {}) {
  const url = urlDe(sede, pagina);
  const sufijo = ` | Amo Invitar!${sede.nombre ? ` – ${sede.nombre}` : ''}`;
  const z = zona(sede);
  const alternos = legal ? `<link rel="canonical" href="${url}">` : [`<link rel="canonical" href="${url}">`,
    ...SEDES.filter((s) => (!soloEspanol(pagina) || s.clave.startsWith('es')) && (!soloIngles(pagina) || s.clave === 'en')).map((s) => `<link rel="alternate" hreflang="${s.lang}" href="${urlDe(s, pagina)}">`),
    `<link rel="alternate" hreflang="x-default" href="${urlDe(NEUTRA, pagina)}">`].join('\n');
  const pieZona = z ? `${PIE_ZONA[idiomaDe(sede)] || PIE_ZONA.es} · ${z}` : '';
  return html
    .replace(/<html lang="[^"]*"/, `<html lang="${sede.lang}"`)
    .replace('</title>', `${esc(sufijo)}</title>`)
    .replace(/(<meta property="og:title" content=")([^"]*)"/, (m, a, t) => `${a}${t}${esc(sufijo)}"`)
    .replace(/(<meta name="description" content=")([^"]*)"/, (m, a, t) => `${a}${t}${z ? ' ' + esc(z) : ''}"`)
    .replace('{{EN_PAIS}}', () => esc(enPais(sede)))
    .replace('<!--alternos-->', alternos)
    .replace(/\{\{URL\}\}/g, url)
    .replace(/\{\{LANG\}\}/g, sede.lang)
    .replace(/\{\{OGL\}\}/g, ogLocale(sede.lang))
    .replace(/\{\{R\}\}/g, sede.carpeta)
    .replace(/\{\{MON\}\}/g, sede.moneda) // README (ronda 44): Internacional, en dólares
    .replace('{{BANDERA}}', sede.pais ? sede.pais.toLowerCase() : 'globo')
    .replace('{{MONEDA}}', sede.moneda)
    .replace('<p class="pie-zona">{{ZONA}}</p>', pieZona ? `<p class="pie-zona">${esc(pieZona)}</p>` : '')
    .replace('data-raiz="{{R}}/"', `data-raiz="${sede.carpeta}/"`);
}

// La carpeta que prefiere esta persona: la que eligió en el selector (cookie ai_elegida) o la del país de su IP. null: sin preferencia
function preferida(request) {
  const elegida = getCookie(request, 'ai_elegida');
  if (elegida === 'raiz') return NEUTRA;
  if (elegida && sedeDeCarpeta(elegida)) return sedeDeCarpeta(elegida);
  const pais = request.cf?.country || request.headers.get('cf-ipcountry') || '';
  const al = request.headers.get('accept-language') || '';
  return sedeDePais(pais, al) || sedePorIdioma(al);
}
// Cookies que recuerdan el país (las usan las demos, el panel y la tienda)
function cookiesSede(sede, request) {
  const op = { maxAge: 365 * 86400, secure: isSecureRequest(request), httpOnly: false };
  return [cookie('ai_sede', sede.carpeta || 'raiz', op), ...(sede.pais ? [cookie('pais_sel', sede.pais, op), cookie('cur', sede.moneda, op)] : []), cookie('idioma', sede.clave, op)];
}

export async function sitioNuevo(env, request, url) {
  if (!['GET', 'HEAD'].includes(request.method) || RESERVADAS.test(url.pathname) || PROTEGIDAS.test(url.pathname)) return null;
  const a = acceso(env, request, url);
  if (a.respuesta) return a.respuesta;
  if (!a.ve) return null;
  const principal = PRINCIPAL.test(url.hostname);
  const ir = (destino, status = 301, extra = {}) => new Response(null, { status, headers: { location: new URL(destino, url.origin).href, 'cache-control': status === 301 ? 'public, max-age=86400' : 'private, no-store', ...extra } });

  // Sitemap y robots (en la app, fuera del dominio principal, robots no deja indexar nada)
  if (url.pathname === '/sitemap.xml' || url.pathname === '/sitemap_index.xml') return env.ASSETS.fetch(new Request(new URL('/sitio/sitemap.xml', url.origin), request));
  if (url.pathname === '/robots.txt') return principal ? env.ASSETS.fetch(new Request(new URL('/sitio/robots.txt', url.origin), request)) : new Response('User-agent: *\nDisallow: /\n', { headers: { 'content-type': 'text/plain' } });

  const { sede, pagina: pagina0 } = partir(url.pathname);
  // Archivos de la web (css, js, imágenes): siempre de /web/…
  if (/\.[a-z0-9]+$/i.test(url.pathname) && !url.pathname.endsWith('.html')) {
    if (sede !== NEUTRA) return null;
    const r = await env.ASSETS.fetch(new Request(new URL(`/sitio${url.pathname}${url.search}`, url.origin), request));
    return r.status === 404 ? null : r;
  }
  // README (ronda 44): Haití y San Vicente ya no tienen carpeta: a la versión internacional
  { const hv = /^\/(ht|vc)(\/.*)?$/.exec(url.pathname); if (hv) return ir(`${hv[2] || '/'}${url.search}`); }
  // README (ronda 43): la tienda vieja de WordPress (/store/…, /ar/store/…) se cerró: a los precios del país
  if (/^(store|tienda-vieja)(\/|$)/.test(pagina0)) return ir(`${sede.carpeta}/precios`);
  // Nombres viejos y la demo vieja de cada país
  const primera = pagina0.split('/')[0];
  if (primera in REDIRECCIONES && pagina0 === primera) return ir(`${sede.carpeta}/${REDIRECCIONES[primera]}${url.search}`);
  if (sede !== NEUTRA) { const d = demoVieja(pagina0); if (d) return ir(d); }
  if (soloEspanol(pagina0) && !sede.clave.startsWith('es')) return ir(`/${pagina0}${url.search}`);
  if (soloIngles(pagina0) && sede.clave !== 'en') return ir(`${sede.carpeta}/mis15${url.search}`);
  if (pagina0 === 'crear-invitacion-para-sweet16' && sede.clave !== 'en') return ir(`${sede.carpeta}/crear-invitacion-para-15-anos${url.search}`);
  // Las legales son las mismas para todos (en /info/…)
  // README (ronda 46): las legales en español son las mismas para todos (/info/…); en los otros idiomas, en la carpeta del país
  // README (ronda 47): en un país donde la web también está en otro idioma (Estados Unidos: inglés), las legales salen en ese idioma
  if (pagina0.startsWith('info/') && sede !== NEUTRA && sede.clave.startsWith('es')) {
    const otra = sede.pais && SEDES.find((s) => s.pais === sede.pais && !s.clave.startsWith('es'));
    return ir(`${otra ? otra.carpeta : ''}/${pagina0}${url.search}`);
  }
  // /crear-invitacion-para-<evento> es la misma página que /crear-invitacion (con el evento ya elegido)
  const archivo = /^crear-invitacion-para-[a-z0-9-]+$/.test(pagina0) ? 'crear-invitacion' : pagina0;
  const legal = archivo.startsWith('info/');
  const r = await env.ASSETS.fetch(new Request(new URL(`/sitio/t/${legal && sede.clave.startsWith('es') ? 'es' : sede.clave}/${archivo}.html`, url.origin), request));
  let html = r.status === 200 ? await r.text() : null;
  if (html == null && r.status >= 300 && r.status < 400) { // Assets redirige «x.html» → «x»
    const r2 = await env.ASSETS.fetch(new Request(new URL(r.headers.get('location'), url.origin), request));
    if (r2.status === 200) html = await r2.text();
  }
  if (html == null) return null; // lo que no es de la web nueva sigue al sitio viejo
  // Direcciones con una sola forma: sin «.html» y sin barra al final (salvo la carpeta del país: /ar/)
  const forma = `${sede.carpeta}/${pagina0 === 'index' ? '' : pagina0}`;
  if (url.pathname !== forma) return ir(forma + url.search);

  // Idioma automático (solo personas y fuera de las legales): a la carpeta de su país
  const ua = request.headers.get('user-agent') || '';
  const persona = ua && !BOT.test(ua);
  const headers = new Headers({ 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
  if (persona && !legal && !url.searchParams.has('sin-redireccion')) {
    const pref = preferida(request);
    if (sede === NEUTRA && pref && pref.carpeta) {
      const h = new Headers({ location: new URL(`${pref.carpeta}/${pagina0 === 'index' ? '' : pagina0}${url.search}`, url.origin).href, 'cache-control': 'private, no-store', vary: 'Cookie' });
      for (const c of cookiesSede(pref, request)) h.append('set-cookie', c);
      return new Response(null, { status: 302, headers: h });
    }
    if (getCookie(request, 'ai_sede') !== (sede.carpeta || 'raiz') && (sede.carpeta || pref)) for (const c of cookiesSede(sede, request)) headers.append('set-cookie', c);
  }
  if (!principal) { headers.set('x-robots-tag', 'noindex, nofollow'); headers.set('cache-control', 'private, no-store'); }
  return new Response(request.method === 'HEAD' ? null : componer(html, sede, pagina0, { legal, monedaRaiz: /^[A-Z]{3}$/.test(getCookie(request, 'cur') || '') ? getCookie(request, 'cur') : '' }), { status: 200, headers });
}
