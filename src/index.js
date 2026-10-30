// Worker de Amo Invitar 2.0
//
//   /demo/<modelo>?evento=&paquete=&pais=&sobre=no  demo de un modelo (sobre=no: ventana de bienvenida)
//   /<tipo>/<slug>[?inv=codigo]                  invitación publicada (con su seguridad)
//   POST /acceso/<id>                             PIN de la pantalla de acceso
//   GET  /acceso/<id>/dueno?k=<clave>             el dueño entra sin PIN ni link personal
//   /panel/<id>?k=<clave>                         panel del cliente
//   /vista/<id>?k=<clave>                         vista previa del borrador (para el panel)
//   /media/…                                      fotos y MP3 subidos
//   /api/panel/<id>[/archivo|/slug|/invitados|/respuestas]
//   POST /api/eventos                             alta de un evento (la tienda, o a mano)
//   POST /api/rsvp · GET /api/invitados.csv       lo que usan las invitaciones
//
// Lo que no reconoce se pide al hosting actual (las invitaciones viejas siguen igual).

import { diccionario, varianteDePais, VARIANTES, esPlural } from './textos/index.js';
import { armarVista } from './motor/datos.js';
import { renderizar } from './motor/render.js';
import { eventoDemo } from './datos/demos.js';
import { almacenD1 } from './almacen.js';
import { revisarAcceso, validarPin, puedeVer, modoAcceso, nuevoCodigo, nuevoPin, usaLista, cookieAcceso, DUENO, tokenPuerta } from './acceso.js';
import { puertaHTML } from './componentes/puerta.js';
import { mesaHTML } from './componentes/mesa.js';
import { checkinHTML } from './componentes/checkin.js';
import { esquemaPanel, limpiarDatos, faltantes, planNecesario, banderaDe, FIJOS_PUBLICADA , aplicarTipoAcceso } from './panel/esquemas.js';
import { MODELOS, nombreModelo, conEvento } from './modelos.js';
import { MODELOS_GRATIS } from './catalogo.js';
import { HttpError } from './lib/util.js';
import { sendEmail, mailNuevoAcceso } from './lib/email.js';
import { usuarioActual, crearUsuario } from './lib/auth.js';
import * as cuenta from './rutas/cuenta.js';
import * as tienda from './rutas/tienda.js';
import * as admin from './rutas/admin.js';
import { getCookie } from './lib/util.js';
import { resolverMapa } from './lib/mapas.js';
import { leerPlaylist } from './lib/spotify.js';

const PAQUETES = ['gratis', 'basic', 'premium', 'deluxe'];
const cache = new Map();

async function archivo(env, ruta, origen, tipo = 'text') {
  const clave = `${tipo}:${ruta}`;
  if (cache.has(clave)) return cache.get(clave);
  const r = await env.ASSETS.fetch(new URL(ruta, origen));
  if (!r.ok) { if (!env.SIN_CACHE) cache.set(clave, null); return null; } // p. ej. un modelo sin index-premium.html
  const v = tipo === 'json' ? await r.json() : await r.text();
  if (!env.SIN_CACHE) cache.set(clave, v);
  return v;
}
const modeloJSON = async (env, id, origen, tipo) => (id && /^[a-z0-9-]+$/.test(id) ? conEvento(await archivo(env, `/modelos/${id}/modelo.json`, origen, 'json'), tipo) : null);
// El diseño de cada tipo de evento y paquete: index-<tipo>-<paquete>.html → index-<tipo>.html (Deluxe del evento)
// → index-<paquete>.html → index.html. Así un modelo trae su versión de boda, de 15, de cumpleaños…
async function plantillaDe(env, id, tipo, paquete, origen) {
  const leer = (f) => archivo(env, `/modelos/${id}/${f}`, origen);
  if (paquete === 'deluxe') return (await leer(`index-${tipo}.html`)) || leer('index.html');
  const propio = await leer(`index-${tipo}-${paquete}.html`);
  if (propio) return propio;
  // El evento tiene su diseño pero no este paquete: su Deluxe (no el de boda, que trae otros adornos)
  return (await leer(`index-${tipo}.html`)) || (await leer(`index-${paquete}.html`)) || leer('index.html');
}

const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
const html = (cuerpo, status = 200, extra = {}) => new Response(cuerpo, { status, headers: { 'content-type': 'text/html; charset=utf-8', ...extra } });
const almacenDe = (env) => env.almacen || almacenD1(env);
const secretoDe = (env) => env.SECRETO_ACCESO || 'solo-para-pruebas-locales';
const variante = (v) => (VARIANTES.includes(v) ? v : 'es');

function traductor(tipo, varnt, propios = {}, nombres = '') {
  const d = { ...diccionario(tipo, varnt), ...propios };
  return (k) => String(d[k] ?? '').replaceAll('{nombres}', nombres);
}
const nombresDe = (n = {}) => [n.a, n.b].filter(Boolean).join(' & ');

// Títulos y textos que el cliente reescribió en el panel ({ historia: { titulo } } → 'historia.titulo').
// Los que la plantilla pone como HTML (con saltos de línea) se escapan acá.
// Invitaciones viejas con un link de álbum cargado: quedan como "link propio"
function origenAlbum(d) {
  if (d.album?.url && !d.album.origen && !/albunear\.com/i.test(d.album.url)) d.album.origen = 'propio';
  return d;
}
const TEXTOS_HTML = new Set(['album.texto', 'canciones.texto']);
function textosPropios(o, pre = '', salida = {}) {
  for (const [k, v] of Object.entries(o || {})) {
    const clave = pre ? `${pre}.${k}` : k;
    if (v && typeof v === 'object') textosPropios(v, clave, salida);
    else if (typeof v === 'string' && v.trim()) salida[clave] = TEXTOS_HTML.has(clave) ? escHtml(v).replace(/\n/g, '<br>') : v;
  }
  return salida;
}

// { textos: { rsvp: { titulo } } } → { 'textos.rsvp.titulo': … }
function aplanar(o, pre = '', salida = {}) {
  for (const [k, v] of Object.entries(o || {})) {
    const r = pre ? `${pre}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) aplanar(v, r, salida); else salida[r] = v;
  }
  return salida;
}

// El evento guardado → lo que espera el motor
const paraMotor = (ev) => ({ ...ev.datos, id: ev.id, tipo: ev.tipo, modelo: ev.modelo, paquete: ev.paquete === 'gratis' ? 'basic' : ev.paquete, variante: ev.datos.variante });

// Idiomas de la invitación: el principal y los adicionales contratados (el visitante
// la ve en el suyo si está, y puede cambiarlo con ?lang=)
function idiomasDe(datos = {}) {
  const principal = variante(datos.variante);
  const extra = [2, 3, 4].map((n) => datos.idiomas?.[`l${n}`]).filter((x) => VARIANTES.includes(x) && x.slice(0, 2) !== principal.slice(0, 2));
  return [principal, ...new Set(extra)];
}
function idiomaPedido(url, datos) {
  const todos = idiomasDe(datos);
  const q = String(url.searchParams.get('lang') || '').toLowerCase();
  return todos.find((x) => x.slice(0, 2) === q.slice(0, 2)) || todos[0];
}

async function pagina(env, url, evento, { demo = false, invitado = null, marca = null, sinSobre = false, prueba = false } = {}) {
  const modelo = await modeloJSON(env, evento.modelo, url.origin, evento.tipo);
  // Cada paquete tiene su propio diseño (index-basic.html, index-premium.html); Deluxe es index.html.
  // Los otros eventos: index-15.html, index-15-premium.html… (ver plantillaDe)
  const plantilla = modelo && await plantillaDe(env, evento.modelo, evento.tipo, evento.paquete, url.origin);
  if (!plantilla) return html('<p>Diseño en preparación.</p>', 404);
  const idiomas = demo ? [variante(evento.variante)] : idiomasDe(evento);
  const v = demo ? variante(evento.variante) : idiomaPedido(url, evento);
  // Idioma adicional: lo que el cliente tradujo pisa sus textos del idioma principal
  if (v !== idiomas[0]) {
    evento = structuredClone(evento);
    for (const [ruta, val] of Object.entries(aplanar(evento.traducciones?.[v.slice(0, 2)] || {}))) if (typeof val === 'string' && val.trim()) escribirRuta(evento, ruta, val);
  }
  const t = traductor(evento.tipo, v, textosPropios(evento.textos), nombresDe(evento.nombres));
  const rutas = { comun: '/comun', modelo: `/modelos/${evento.modelo}`, api: '/api' };
  const vista = armarVista({ evento, modelo, t, variante: v, rutas, demo, invitado, marca });
  vista.idiomas = { lista: idiomas, actual: v, banderas: Object.fromEntries(idiomas.map((x) => [x.slice(0, 2), banderaDe(x.slice(0, 2), evento)])) };
  vista.prueba = prueba;
  if (sinSobre) { // la vista previa del panel abre directo (sin sobre ni ventana de bienvenida)
    vista.paquete.incluye = { ...vista.paquete.incluye, sobre: false };
    vista.sobre = { activo: false }; vista.bienvenidaModal = { activa: false };
  }
  return html(await renderGuardado(plantilla, vista, t, url.origin, [evento.tipo, v, evento.textos, evento.nombres]), 200, {
    'cache-control': demo ? 'public, max-age=300' : 'private, no-store',
    'x-robots-tag': 'noindex',
    ...(demo ? { vary: 'cf-ipcountry' } : {}),
  });
}

// Armar la página cuesta procesador (en el plan gratis de Workers el límite es 10 ms por pedido): la página armada se
// guarda en la caché de Cloudflare con una clave que sale del diseño y de todos los datos que la arman. Si el cliente
// cambia algo en el panel, cambia la clave y se arma de nuevo; nunca se sirve una versión vieja.
async function renderGuardado(plantilla, vista, t, origen, extra) {
  const cache = globalThis.caches?.default;
  if (!cache) return renderizar(plantilla, vista, t, { origen });
  let clave;
  try {
    const datos = new TextEncoder().encode(plantilla + '\u0000' + JSON.stringify([vista, extra, origen]));
    const h = await crypto.subtle.digest('SHA-256', datos);
    clave = new Request(`https://render.amoinvitar.internal/v1/${[...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('')}`);
    const hit = await cache.match(clave);
    if (hit) return hit.text();
  } catch { /* sin caché: se arma igual */ }
  const out = renderizar(plantilla, vista, t, { origen });
  if (clave) try { await cache.put(clave, new Response(out, { headers: { 'cache-control': 'public, max-age=604800', 'content-type': 'text/html; charset=utf-8' } })); } catch { /* nada */ }
  return out;
}

// ── Demo ──────────────────────────────────────────────────────────────
async function demo(env, url, request, idModelo) {
  const base = await modeloJSON(env, idModelo, url.origin);
  if (!base) return html('Modelo no encontrado', 404);
  const q = url.searchParams;
  const tipo = base.eventos.includes(q.get('evento')) ? q.get('evento') : base.eventos[0];
  const modelo = conEvento(base, tipo);
  const paquete = ['basic', 'premium', 'deluxe'].includes(q.get('paquete')) ? q.get('paquete') : 'deluxe';
  const pais = q.get('pais') || request.cf?.country || request.headers.get('cf-ipcountry') || '';
  const v = VARIANTES.includes(q.get('idioma')) ? q.get('idioma') : varianteDePais(pais);
  const rutas = { comun: '/comun', modelo: `/modelos/${idModelo}` };
  const ev = eventoDemo({ tipo, variante: v, paquete, modelo, rutas });
  if (q.get('sobre') === 'no') ev.portada = { ...(ev.portada || {}), sobre: false }; // &sobre=no: la ventana de bienvenida
  return pagina(env, url, ev, { demo: true });
}

// ── Invitación publicada (con su seguridad) ───────────────────────────
async function publicada(env, url, request, tipo, slug) {
  const almacen = almacenDe(env);
  const ev = await almacen.eventoPorSlug(tipo, slug);
  if (!ev || ev.estado !== 'publicado' || (ev.vence && ev.vence < new Date().toISOString())) return null;
  const empresa = ev.empresaId ? await almacen.empresa(ev.empresaId) : null;
  const marca = empresa?.marca?.blanca ? empresa.marca : null;
  const acc = await revisarAcceso({ ev, request, url, almacen, secreto: secretoDe(env) });
  if (!acc.ok) {
    const v = variante(ev.datos.variante);
    const t = traductor(ev.tipo, v, ev.datos.textos);
    return html(puertaHTML({ t, pantalla: acc.pantalla, nombres: nombresDe(ev.datos.nombres), accion: `/acceso/${ev.id}`, inv: url.searchParams.get('inv') || '', error: url.searchParams.has('error'), lang: v.slice(0, 2), marca, estilos: await estilosModelo(env, ev, url) }),
      acc.pantalla === 'pin' ? 401 : 403, { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' });
  }
  const evento = paraMotor(ev);
  if (await aforoLleno(almacen, ev)) evento.rsvp = { ...(evento.rsvp || {}), lleno: true };
  let invitado = acc.invitado;
  if (invitado) {
    // Cuándo abrió su link (el dueño mirando no cuenta) y lo que ya respondió, para poder cambiarlo
    if (!acc.dueno) await almacen.visita(ev.id, invitado.codigo).catch(() => {});
    invitado = { ...invitado, respuesta: await almacen.respuestaDe(ev.id, invitado.codigo).catch(() => null), pase: !!ev.datos.admin?.checkin };
  }
  const r = await pagina(env, url, evento, { invitado, marca });
  if (acc.cookie) r.headers.append('set-cookie', acc.cookie);
  return r;
}

// "Ver la invitación" desde el panel: el dueño entra sin PIN ni link personal
// (la clave del panel o la sesión lo autorizan; la cookie no dice nada de la clave)
async function entrarDueno(env, request, url, id) {
  const ev = await eventoConClave(env, request, url, id);
  if (!ev) return html('Sin permiso', 403);
  if (ev.estado !== 'publicado') return new Response(null, { status: 303, headers: { location: `/vista/${ev.id}${url.searchParams.get('k') ? `?k=${encodeURIComponent(url.searchParams.get('k'))}` : ''}` } });
  const inv = url.searchParams.get('inv') || '';
  return new Response(null, { status: 303, headers: {
    location: `/${ev.tipo}/${ev.slug}${inv ? `?inv=${encodeURIComponent(inv)}` : ''}`,
    'set-cookie': await cookieAcceso(ev, DUENO, secretoDe(env)), 'cache-control': 'no-store' } });
}

async function entrarConPin(env, request, id) {
  const almacen = almacenDe(env);
  const ev = await almacen.evento(id);
  if (!ev || ev.estado !== 'publicado') return html('No encontrado', 404);
  if (env.LIMITE_PIN) {
    const ip = request.headers.get('cf-connecting-ip') || '';
    const { success } = await env.LIMITE_PIN.limit({ key: `${id}:${ip}` });
    if (!success) return html('Demasiados intentos. Probar en unos minutos.', 429);
  }
  const f = await request.formData();
  const inv = String(f.get('inv') || '');
  const cookie = await validarPin({ ev, pin: String(f.get('pin') || ''), inv, almacen, secreto: secretoDe(env) });
  const destino = `/${ev.tipo}/${ev.slug}${inv ? `?inv=${encodeURIComponent(inv)}` : ''}`;
  if (!cookie) return new Response(null, { status: 303, headers: { location: `${destino}${inv ? '&' : '?'}error=1` } });
  return new Response(null, { status: 303, headers: { location: destino, 'set-cookie': cookie } });
}

// ── Aforo: personas confirmadas (invitado + acompañantes + niños) ─────
// Si alguien respondió más de una vez vale su última respuesta (vienen de la más nueva a la más vieja)
function personasConfirmadas(respuestas = []) {
  const ultimas = new Map();
  for (const x of respuestas.filter((r) => r.tipo === 'rsvp')) {
    const k = x.datos.inv && !String(x.datos.inv).startsWith('inv-') ? x.datos.inv : `${x.datos.nombre}|${x.creado}`;
    if (!ultimas.has(k)) ultimas.set(k, x);
  }
  let total = 0;
  for (const { datos: d } of ultimas.values()) {
    if (d.asiste !== 'Si') continue;
    if (/^\d+$/.test(String(d.personas || ''))) { total += Number(d.personas) + (/^\d+$/.test(String(d.ninos || '').trim()) ? Number(d.ninos) : 0); continue; }
    const acomp = d.acompanantes && d.acompanantes !== 'No' ? String(d.acompanantes).split(',').filter((n) => n.trim()).length : 0;
    const ninos = /^\d+$/.test(String(d.ninos || '').trim()) ? Number(d.ninos) : 0;
    total += 1 + acomp + ninos;
  }
  return total;
}
async function aforoLleno(almacen, ev) {
  const aforo = Number(ev.datos.rsvp?.aforo);
  if (!(aforo > 0)) return false;
  return personasConfirmadas(await almacen.respuestas(ev.id)) >= aforo;
}

// ── Lo que usan las invitaciones: RSVP y lista ─────────────────────────
async function rsvp(env, request) {
  const f = await request.formData();
  const eventoId = String(f.get('event_id') || '');
  const accion = f.get('action') === 'cancion' ? 'cancion' : 'rsvp';
  if (!eventoId) return json({ result: 'error' }, 400);
  if (eventoId.startsWith('demo-')) return json({ result: 'ok', demo: true });
  const almacen = almacenDe(env);
  const ev = await almacen.evento(eventoId);
  if (!ev) return json({ result: 'error' }, 404);
  // Sin publicar (vista previa): se acepta para que se pueda probar, pero no se guarda
  if (ev.estado !== 'publicado') return json({ result: 'ok', prueba: true });
  const ver = await puedeVer({ ev, request, secreto: secretoDe(env) });
  if (!ver.ok) return json({ result: 'error', acceso: true }, 403);
  const datos = {};
  for (const [k, val] of f.entries()) if (typeof val === 'string' && !['event_id', 'action'].includes(k)) datos[k] = val.slice(0, 2000);
  if (ver.codigo) datos.inv = ver.codigo; // con link personal, la respuesta queda atada a ese invitado
  if (ver.dueno) datos.prueba = '1'; // la mandó el dueño probando: el panel la marca y la deja borrar
  // Aforo completo: no entran más confirmaciones de asistencia (los "no voy" sí)
  if (accion === 'rsvp' && datos.asiste === 'Si' && await aforoLleno(almacen, ev)) return json({ result: 'error', lleno: true }, 409);
  await almacen.guardarRespuesta(eventoId, accion, datos);
  return json({ result: 'ok' });
}

async function invitadosCSV(env, request, url) {
  const cabecera = 'id,nombre,pases,mesa';
  const vacio = new Response(cabecera + '\n', { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store' } });
  const id = url.searchParams.get('e') || '', inv = url.searchParams.get('inv') || '';
  if (!id || !inv) return vacio;
  const almacen = almacenDe(env);
  const ev = await almacen.evento(id);
  if (!ev || !usaLista(ev.datos)) return vacio;
  const ver = await puedeVer({ ev, request, secreto: secretoDe(env) });
  if (!ver.ok || (ver.codigo && ver.codigo !== inv)) return vacio;
  // Solo la fila de quien abrió su link, y nunca el PIN
  const i = await almacen.invitado(id, inv);
  if (!i) return vacio;
  const celda = (x) => { const s = String(x ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return new Response(`${cabecera}\n${[i.codigo, i.nombre, i.pases, i.mesa].map(celda).join(',')}\n`, { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store' } });
}

// Tipografía y colores del modelo para las páginas sueltas (acceso, Buscá tu mesa): sus fuentes y su
// tema.css (las variables --fuente-titulos, --fuente-texto, --color-principal). Un modelo puede fijarlas
// en modelo.json → "acceso": { "css": [...] }.
async function estilosModelo(env, ev, url) {
  let m = null; try { m = await modeloJSON(env, ev.modelo, url.origin, ev.tipo); } catch { /* sin modelo */ }
  if (!m) return [];
  if (Array.isArray(m.acceso?.css)) return m.acceso.css;
  return [m.tarjetas?.fuentes?.css, `/modelos/${ev.modelo}/tema.css`].filter(Boolean);
}

// ── Buscá tu mesa (QR de la entrada) ──────────────────────────────────
// Solo si el dueño la activó en Administración → Mesas. Se busca por nombre (3 letras
// como mínimo, hasta 6 resultados): nunca se manda la lista entera.
const sinTildes = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
async function eventoConMesas(env, id) {
  const ev = id && await almacenDe(env).evento(id);
  return ev && ev.estado === 'publicado' && ev.datos.admin?.buscaMesa ? ev : null;
}
async function paginaMesa(env, url, id) {
  const ev = await almacenDe(env).evento(id);
  if (!ev) return html('No encontrado', 404);
  const v = variante(ev.datos.variante);
  const t = traductor(ev.tipo, v, ev.datos.textos);
  return html(mesaHTML({ t, id: ev.id, nombres: nombresDe(ev.datos.nombres), lang: v.slice(0, 2), activa: !!(await eventoConMesas(env, id)), estilos: await estilosModelo(env, ev, url) }), 200,
    { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' });
}
async function buscarMesa(env, request, url) {
  const ev = await eventoConMesas(env, url.searchParams.get('e'));
  const q = sinTildes(url.searchParams.get('q')).trim();
  if (!ev || q.length < 3) return json({ resultados: [] }, ev ? 200 : 404);
  if (env.LIMITE_PIN) {
    const { success } = await env.LIMITE_PIN.limit({ key: `mesa:${ev.id}:${request.headers.get('cf-connecting-ip') || ''}` });
    if (!success) return json({ resultados: [] }, 429);
  }
  const almacen = almacenDe(env);
  const lista = await almacen.invitados(ev.id);
  // Los acompañantes que confirmaron también encuentran su mesa (la de quien los invitó)
  const acomp = new Map();
  for (const r of await almacen.respuestas(ev.id)) {
    if (r.tipo !== 'rsvp' || !r.datos.inv || acomp.has(r.datos.inv)) continue;
    acomp.set(r.datos.inv, r.datos.asiste === 'Si' && r.datos.acompanantes && !/^no$/i.test(r.datos.acompanantes) ? String(r.datos.acompanantes).split(',').map((x) => x.trim()).filter(Boolean) : []);
  }
  const palabras = q.split(/\s+/);
  const coincide = (nombre) => { const p = sinTildes(nombre).split(/[\s-]+/); return palabras.every((w) => p.some((x) => x.startsWith(w))); };
  const resultados = [];
  for (const i of lista) {
    if (coincide(i.nombre)) resultados.push({ nombre: i.nombre, mesa: i.mesa || '' });
    for (const a of acomp.get(i.codigo) || []) if (coincide(a)) resultados.push({ nombre: a, mesa: i.mesa || '', con: i.nombre });
    if (resultados.length >= 6) break;
  }
  return json({ resultados: resultados.slice(0, 6) }, 200, { 'cache-control': 'no-store' });
}

// ── Puerta: check-in de los invitados el día del evento ───────────────
// /puerta/<id>?t=<token>: lista con buscador y lector de QR (el QR es el link personal
// del invitado, el mismo que muestra su "pase de entrada"). El token sale del panel.
const sinNum = (x) => (/^\d+$/.test(String(x ?? '').trim()) ? Number(x) : 0);
function personasEsperadas(i, d) {
  if (d?.asiste === 'No') return 0;
  if (d?.asiste === 'Si') {
    if (/^\d+$/.test(String(d.personas || ''))) return Number(d.personas) + sinNum(d.ninos);
    const acomp = d.acompanantes && !/^no$/i.test(d.acompanantes) ? String(d.acompanantes).split(',').filter((x) => x.trim()).length : 0;
    return 1 + acomp + sinNum(d.ninos);
  }
  const familia = String(i.integrantes || '').split(',').filter((x) => x.trim()).length;
  return Math.max(1, familia) + (Number(i.pases) || 0);
}
async function eventoPuerta(env, id, t) {
  const ev = id && await almacenDe(env).evento(id);
  if (!ev || !t) return null;
  return igual(t, await tokenPuerta(ev, secretoDe(env))) ? ev : null;
}
async function listaPuerta(env, ev) {
  const almacen = almacenDe(env);
  const ultima = new Map();
  for (const r of await almacen.respuestas(ev.id)) if (r.tipo === 'rsvp' && r.datos.inv && !ultima.has(r.datos.inv)) ultima.set(r.datos.inv, r.datos);
  return (await almacen.invitados(ev.id)).map((i) => {
    const d = ultima.get(i.codigo);
    return { codigo: i.codigo, nombre: i.nombre, mesa: i.mesa || '', integrantes: i.integrantes || '', respondio: d?.asiste || '',
      esperan: personasEsperadas(i, d), llegaron: i.llegaron || 0, llego: i.llego || '' };
  });
}
async function paginaPuerta(env, url, id) {
  const ev = await eventoPuerta(env, id, url.searchParams.get('t'));
  if (!ev) return html('<p style="font-family:sans-serif;text-align:center;padding:40px">Link no válido. Pedir uno nuevo a los anfitriones.</p>', 403);
  return html(checkinHTML({ id: ev.id, t: url.searchParams.get('t'), nombres: nombresDe(ev.datos.nombres) }), 200, { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' });
}
async function apiPuerta(env, request, url) {
  if (request.method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const ev = await eventoPuerta(env, b.e, b.t);
    if (!ev) return json({ error: 'Link no válido' }, 403);
    const i = await almacenDe(env).invitado(ev.id, String(b.codigo || ''));
    if (!i) return json({ error: 'No está en la lista' }, 404);
    await almacenDe(env).llegada(ev.id, i.codigo, Math.max(0, Math.min(60, parseInt(b.personas, 10) || 0)));
    return json({ ok: true });
  }
  const ev = await eventoPuerta(env, url.searchParams.get('e'), url.searchParams.get('t'));
  if (!ev) return json({ error: 'Link no válido' }, 403);
  return json({ invitados: await listaPuerta(env, ev) });
}

// ── Panel ─────────────────────────────────────────────────────────────
function igual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// Se entra al panel con la cuenta (si tiene acceso al evento) o con la clave del link del mail
async function eventoConClave(env, request, url, id) {
  const ev = await almacenDe(env).evento(id);
  if (!ev) return null;
  const clave = request.headers.get('x-clave') || url.searchParams.get('k') || '';
  if (clave && igual(clave, ev.clave)) return ev;
  const u = await usuarioActual(request, env);
  return u && (u.esAdmin || await almacenDe(env).tieneAcceso(ev.id, u.id)) ? ev : null;
}

async function esquemaDe(env, url, ev, datos = ev.datos, { admin = false } = {}) {
  const modelo = ev.producto === 'invitacion' ? await modeloJSON(env, ev.modelo, url.origin, ev.tipo) : null;
  return esquemaPanel({ producto: ev.producto, tipo: ev.tipo, paquete: ev.paquete, modelo, aMedida: ev.aMedida, datos,
    gratis: ev.paquete === 'gratis' || datos.planElegido === 'gratis', disenoEnviado: !!datos.diseno?.enviado,
    publicada: ev.estado === 'publicado', admin });
}

// Plan con el que se ve la invitación: el que ya pagó o, en el borrador, el que piden las secciones elegidas
async function planVista(env, url, ev) {
  if (ev.producto !== 'invitacion' || ev.estado === 'publicado') return ev.paquete === 'gratis' ? 'basic' : ev.paquete;
  const m = MODELOS.find((x) => x.id === ev.modelo);
  const plan = planNecesario(await esquemaDe(env, url, ev), ev.datos, { gratisPosible: !!(m && (m.gratis || MODELOS_GRATIS.includes(m.id))) });
  const pagado = ['basic', 'premium', 'deluxe'].indexOf(ev.paquete);
  const necesario = ['basic', 'premium', 'deluxe'].indexOf(plan === 'gratis' ? 'basic' : plan);
  return ['basic', 'premium', 'deluxe'][Math.max(pagado, necesario, 0)];
}

// Publicar (desde el panel, o solo después del pago). Devuelve lo que falta, si falta algo.
async function publicarEvento(env, request, ev) {
  const url = new URL(request.url);
  const esquema = await esquemaDe(env, url, ev);
  const faltan = faltantes(esquema, ev.datos);
  if (faltan.length || !ev.slug) return { faltan };
  if (modoAcceso(ev) === 'pin' && !ev.datos.acceso?.pinPorInvitado && !/^\d{4}$/.test(ev.datos.acceso?.pin || '')) return { error: 'Falta el PIN' };
  // Plan gratis: online hasta 15 días después del evento
  if (ev.paquete === 'gratis') {
    const fecha = (ev.datos.celebracion?.inicio || '').slice(0, 10);
    if (fecha) ev.vence = new Date(Date.parse(fecha) + 16 * 86400000).toISOString();
  }
  ev.estado = ev.producto === 'invitacion' || ev.producto === 'std-web' ? 'publicado' : 'en-diseno';
  await avisarDiseno(env, url, ev);
  await almacenDe(env).guardarEvento(ev);
  return { ok: true, estado: ev.estado, link: ev.estado === 'publicado' ? `${url.origin}/${ev.tipo}/${ev.slug}` : null };
}

// Modelos a los que se puede cambiar (los del mismo tipo de evento)
const modelosPara = (tipo) => MODELOS.filter((m) => m.eventos.includes(tipo)).map((m) => ({ id: m.id, nombre: nombreModelo(m, tipo), gratis: !!(m.gratis || MODELOS_GRATIS.includes(m.id)) }));

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const aSlug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'y').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

async function sugerirSlug(almacen, ev, pedido) {
  const s = aSlug(pedido);
  const n = ev.datos.nombres || {};
  const fecha = (ev.datos.celebracion?.inicio || ev.datos.std?.fecha || '').slice(0, 10);
  const [a, m, d] = fecha.split('-');
  const A = aSlug(n.a), B = aSlug(n.b);
  const ideas = [
    s, a && `${s}-${a}`, d && `${s}-${+d}-${MESES[+m - 1]}`,
    A && B && `${A}-y-${B}`, A && B && `${B}-y-${A}`, A && B && `${A}-${B}`, A && B && `${A}${B}`,
    A && !B && `${A}-${ev.tipo === '15' ? 'mis-15' : ev.tipo}`, `${s}-${ev.tipo}`,
  ].filter((x) => x && x.length >= 3);
  const libres = [];
  for (const x of [...new Set(ideas)]) {
    if (!(await almacen.slugOcupado(ev.tipo, x, ev.id))) libres.push(x);
    if (libres.length >= 5) break;
  }
  return { pedido: s, disponible: libres[0] === s, alternativas: libres.filter((x) => x !== s).slice(0, 4) };
}

const TIPOS_ARCHIVO = { 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/png': 'png', 'audio/mpeg': 'mp3', 'video/mp4': 'mp4' };
const MAX_MB = { mp3: 12, mp4: 40 };

// Playlist de Spotify: se lee la lista de canciones una vez por link
async function leerSpotify(datos) {
  const pl = datos.playlist;
  if (!pl) return;
  if (!pl.link) { for (const k of ['pistas', 'cantidad', 'minutos', 'nombre', 'leidoDe']) delete pl[k]; return; }
  if (pl.leidoDe === pl.link) return;
  const r = await leerPlaylist(pl.link, { fetch: (u, o) => fetch(u, { ...o, signal: AbortSignal.timeout(5000) }) }).catch(() => null);
  if (r) Object.assign(pl, { pistas: r.pistas, cantidad: r.cantidad, minutos: r.minutos, nombre: r.nombre });
  else for (const k of ['pistas', 'cantidad', 'minutos', 'nombre']) delete pl[k];
  pl.leidoDe = pl.link;
}

// Link de Google Maps de cada lugar → lo que necesita el mapa (se lee una vez por link)
async function leerMapas(datos) {
  for (const p of ['ceremonia', 'celebracion']) {
    const l = datos[p];
    if (!l) continue;
    if (!l.mapaLink) { delete l.mapaQ; delete l.mapaLL; delete l.mapaDe; continue; }
    if (l.mapaDe === l.mapaLink) continue;
    const r = await resolverMapa(l.mapaLink, { fetch: (u, o) => fetch(u, { ...o, signal: AbortSignal.timeout(4000) }) }).catch(() => null);
    if (r) { l.mapaQ = r.q; if (r.ll) l.mapaLL = r.ll; else delete l.mapaLL; } else { delete l.mapaQ; delete l.mapaLL; }
    l.mapaDe = l.mapaLink;
  }
}

async function apiPanel(env, request, url, partes) {
  const [, , id, accion] = partes;
  const ev = await eventoConClave(env, request, url, id);
  if (!ev) return json({ error: 'Sin permiso' }, 403);
  const almacen = almacenDe(env);
  // Superusuario (administrador de Amo Invitar): edita todo, sin las restricciones de publicada
  const usuario = await usuarioActual(request, env);
  const admin = !!usuario?.esAdmin;
  const esquema = await esquemaDe(env, url, ev, ev.datos, { admin });

  if (!accion && request.method === 'GET') {
    const v = variante(ev.datos.variante);
    const dic = diccionario(ev.tipo, v);
    return json({
      evento: { id: ev.id, producto: ev.producto, tipo: ev.tipo, modelo: ev.modelo, paquete: ev.paquete, estado: ev.estado, slug: ev.slug, plural: esPlural(ev.tipo) },
      esquema, datos: origenAlbum(aplicarTipoAcceso(structuredClone(ev.datos))), textos: dic, faltan: faltantes(esquema, ev.datos),
      // Textos de cada idioma adicional (para traducir en el panel)
      textosIdiomas: Object.fromEntries(idiomasDe(ev.datos).slice(1).map((l) => [l.slice(0, 2), diccionario(ev.tipo, l)])),
      plan: ev.producto === 'invitacion' ? await tienda.estadoPlan(env, request, ev, esquema) : null,
      modelos: modelosPara(ev.tipo),
      usuario: usuario ? { email: usuario.email, admin } : null,
      invitados: await almacen.invitados(ev.id),
      modelo: ev.modelo ? await (async () => { const mj = await modeloJSON(env, ev.modelo, url.origin, ev.tipo); return { id: ev.modelo, miniatura: mj?.miniatura || null, tarjetas: mj?.tarjetas || null }; })() : null,
      marca: ev.empresaId ? (await almacen.empresa(ev.empresaId))?.marca || null : null,
      ayuda: { whatsapp: String(env.WHATSAPP || '').replace(/\D/g, '') },
    });
  }
  if (!accion && request.method === 'PUT') {
    const { datos } = await request.json();
    if (esquema.cerrada) return json({ error: 'El evento ya pasó: la invitación no se puede modificar. Para un cambio, escribinos por WhatsApp.' }, 403);
    // Publicada: los nombres y la fecha quedan como estaban (evita reciclar la invitación para otro evento)
    if (ev.estado === 'publicado' && !admin && datos) for (const ruta of FIJOS_PUBLICADA) escribirRuta(datos, ruta, ruta.split('.').reduce((o, k) => o?.[k], ev.datos));
    // Los campos de cada idioma (bandera, traducciones) dependen de los idiomas que llegan ahora
    const conIdiomas = datos?.idiomas ? await esquemaDe(env, url, ev, { ...ev.datos, idiomas: datos.idiomas, variante: datos.variante ?? ev.datos.variante }, { admin }) : esquema;
    const limpio = limpiarDatos(conIdiomas, datos || {}, ev.datos);
    if (ev.datos.diseno?.enviado) limpio.diseno = ev.datos.diseno;
    // Tarjetas ya generadas: quedan fijas
    if (ev.datos.admin) limpio.admin = ev.datos.admin; // lo de la administración se guarda aparte
    for (const clase of ['std', 'agradecimiento']) {
      const prev = ev.datos[clase]?.tarjeta;
      if (prev?.generada && !admin) limpio[clase] = ev.datos[clase];
      else if (prev?.generada && limpio[clase]?.tarjeta) Object.assign(limpio[clase].tarjeta, { generada: prev.generada, generadaEn: prev.generadaEn });
    }
    await leerMapas(limpio);
    await leerSpotify(limpio);
    if (limpio.slug && limpio.slug !== ev.slug) {
      if (await almacen.slugOcupado(ev.tipo, limpio.slug, ev.id)) return json({ error: 'slug', ...(await sugerirSlug(almacen, ev, limpio.slug)) }, 409);
      ev.slug = limpio.slug;
    }
    ev.datos = limpio;
    await almacen.guardarEvento(ev);
    // El esquema cambia con los idiomas elegidos (campos para traducir)
    const nuevo = await esquemaDe(env, url, ev, ev.datos, { admin });
    return json({ ok: true, datos: limpio, faltan: faltantes(nuevo, limpio), esquema: nuevo,
      textosIdiomas: Object.fromEntries(idiomasDe(limpio).slice(1).map((l) => [l.slice(0, 2), diccionario(ev.tipo, l)])),
      plan: ev.producto === 'invitacion' ? await tienda.estadoPlan(env, request, ev, nuevo) : null });
  }
  // Cambiar de modelo (el mismo tipo de evento); lo cargado queda igual
  if (accion === 'modelo' && request.method === 'POST') {
    const { modelo } = await request.json();
    if (!modelosPara(ev.tipo).some((m) => m.id === modelo)) return json({ error: 'Ese diseño no está disponible para este evento' }, 400);
    ev.modelo = modelo;
    await almacen.guardarEvento(ev);
    return json({ ok: true });
  }
  // Pasar al plan gratis (modelos que lo tienen): se apaga lo que no es de Basic
  if (accion === 'gratis' && request.method === 'POST') {
    const { gratis = true } = await request.json();
    if (gratis && !modelosPara(ev.tipo).find((m) => m.id === ev.modelo)?.gratis) return json({ error: 'Este diseño no tiene plan gratis' }, 400);
    ev.datos.planElegido = gratis ? 'gratis' : null;
    if (gratis) {
      for (const p of esquema.pasos) if (p.seccion && (p.complemento || p.nivel !== 'basic')) (ev.datos.secciones ??= {})[p.seccion] = false;
      for (const p of esquema.pasos) if (p.interruptor && p.nivel !== 'basic') escribirRuta(ev.datos, p.interruptor, false);
      for (const p of esquema.pasos) for (const c of p.campos) if (c.paquete && c.paquete !== 'basic') escribirRuta(ev.datos, c.id, c.tipo === 'switch' ? false : undefined);
      if (Array.isArray(ev.datos.fotos?.portada)) ev.datos.fotos.portada = ev.datos.fotos.portada.slice(0, 1);
    }
    await almacen.guardarEvento(ev);
    return json({ ok: true });
  }
  // Generar una tarjeta (Save The Date o agradecimiento): el panel arma el JPG y lo sube;
  // acá queda guardada y fija. Hace falta tenerla pagada (la Save The Date viene con Premium y Deluxe).
  if (accion === 'tarjeta' && request.method === 'POST') {
    const { clase, url: imagen, reabrir } = await request.json();
    if (!['std', 'agradecimiento'].includes(clase)) return json({ error: 'Tarjeta desconocida' }, 400);
    // El superusuario puede volver a abrir una tarjeta ya generada
    if (reabrir && admin) {
      if (ev.datos[clase]?.tarjeta) { delete ev.datos[clase].tarjeta.generada; delete ev.datos[clase].tarjeta.generadaEn; }
      await almacen.guardarEvento(ev);
      return json({ ok: true });
    }
    if (!/^\/media\/[\w./-]+\.jpe?g$/i.test(String(imagen || '')) || !String(imagen).includes(ev.id)) return json({ error: 'Imagen no válida' }, 400);
    const actual = ev.datos[clase]?.tarjeta || {};
    if (actual.generada && !admin) return json({ error: 'La tarjeta ya se generó', url: actual.generada }, 409);
    const extras = ev.datos.extras || [];
    // La Save The Date del modelo viene con Premium y Deluxe; la con foto se paga aparte en cualquier plan
    const pagada = clase === 'std'
      ? (ev.datos.std?.tipo === 'foto' ? extras.includes('std-foto') : ['premium', 'deluxe'].includes(ev.paquete) || extras.some((x) => x.startsWith('std-')))
      : extras.includes('agradecimiento');
    if (!pagada && !admin) return json({ error: 'pagar' }, 402);
    ev.datos[clase] = { ...(ev.datos[clase] || {}), tarjeta: { ...actual, generada: imagen, generadaEn: new Date().toISOString() } };
    await almacen.guardarEvento(ev);
    return json({ ok: true, url: imagen });
  }
  // Guardar el borrador en la cuenta (después de entrar con Google o con el mail)
  if (accion === 'vincular' && request.method === 'POST') {
    const u = await usuarioActual(request, env);
    if (!u) return json({ error: 'Primero hay que entrar con la cuenta' }, 401);
    await almacen.darAcceso(ev.id, u.id, 'cliente');
    return json({ ok: true, email: u.email });
  }
  if (accion === 'slug') return json(await sugerirSlug(almacen, ev, url.searchParams.get('s')));
  if (accion === 'archivo' && request.method === 'POST') {
    const f = await request.formData();
    const archivoSubido = f.get('archivo');
    const ext = archivoSubido && TIPOS_ARCHIVO[archivoSubido.type];
    if (!ext) return json({ error: 'Formato no permitido (JPG, PNG, WEBP, MP3 o MP4)' }, 415);
    const max = MAX_MB[ext] || 4;
    if (archivoSubido.size > max * 1024 * 1024) return json({ error: `El archivo supera ${max} MB` }, 413);
    const clave = `eventos/${ev.id}/${crypto.randomUUID()}.${ext}`;
    await almacen.subir(clave, archivoSubido.stream(), archivoSubido.type);
    return json({ url: `/media/${clave}` });
  }
  if (accion === 'invitados' && request.method === 'PUT') {
    const { invitados = [] } = await request.json();
    const previos = new Map((await almacen.invitados(ev.id)).map((i) => [i.codigo, i]));
    const lista = invitados.slice(0, 2000).filter((i) => String(i.nombre || '').trim()).map((i) => {
      const viejo = i.codigo && previos.get(i.codigo);
      return {
        codigo: viejo ? viejo.codigo : nuevoCodigo(i.nombre),
        nombre: String(i.nombre).trim().slice(0, 80),
        pases: Math.max(0, Math.min(50, parseInt(i.pases, 10) || 0)),
        mesa: String(i.mesa ?? '').trim().slice(0, 20) || null,
        pin: viejo?.pin || nuevoPin(),
        // Familia o grupo con un solo link: cada integrante confirma por separado
        integrantes: String(i.integrantes || '').split(/[,\n;]+/).map((x) => x.trim().slice(0, 60)).filter(Boolean).slice(0, 15).join(', ') || null,
        telefono: String(i.telefono || '').replace(/[^\d+]/g, '').slice(0, 20) || null,
        // Lo que no se edita a mano se conserva: aperturas del link y llegada
        abierto: viejo?.abierto ?? null, ultima: viejo?.ultima ?? null, visitas: viejo?.visitas || 0, llego: viejo?.llego ?? null, llegaron: viejo?.llegaron ?? null, enviado: viejo?.enviado ?? null, recordado: viejo?.recordado ?? null,
      };
    });
    await almacen.guardarInvitados(ev.id, lista);
    return json({ ok: true, invitados: lista });
  }
  // Accesos: el titular (quien compró), la pareja (en bodas) y hasta 3 administradores
  // (wedding planner, organizador…). Entran con su mail; editan y administran todo.
  if (accion === 'accesos') {
    const lista = await almacen.accesos(ev.id);
    const clave = request.headers.get('x-clave') || url.searchParams.get('k') || '';
    const mio = usuario && lista.find((a) => a.id === usuario.id);
    const gestiona = igual(clave, ev.clave) || admin || ['cliente', 'pareja'].includes(mio?.rol);
    const LIMITE = { pareja: ev.tipo === 'boda' ? 1 : 0, admin: 3 };
    if (request.method === 'GET') return json({ accesos: lista.map(({ id: uid, email, nombre, rol }) => ({ id: uid, email, nombre, rol })), gestiona, limite: LIMITE, yo: usuario?.id || null });
    if (!gestiona) return json({ error: 'Solo el titular o la pareja pueden cambiar los accesos.' }, 403);
    if (request.method === 'DELETE') {
      const uid = url.searchParams.get('u') || '';
      if (lista.find((a) => a.id === uid)?.rol === 'cliente') return json({ error: 'El titular no se puede quitar.' }, 400);
      await almacen.quitarAcceso(ev.id, uid);
      return json({ ok: true });
    }
    if (request.method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const email = String(b.email || '').trim().toLowerCase().slice(0, 200);
      const rol = b.rol === 'pareja' ? 'pareja' : 'admin';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'El mail no parece válido.' }, 400);
      if (lista.some((a) => a.email === email)) return json({ error: 'Ese mail ya tiene acceso.' }, 400);
      if (lista.filter((a) => a.rol === rol).length >= LIMITE[rol]) return json({ error: rol === 'pareja' ? 'Ya hay una pareja con acceso.' : 'Ya hay 3 administradores. Quitar uno para sumar otro.' }, 400);
      const u = await crearUsuario(env, email);
      await almacen.darAcceso(ev.id, u.id, rol);
      const base = String(env.SITE_URL || url.origin).replace(/\/$/, '');
      await sendEmail(env, { to: email, ...mailNuevoAcceso(env, { nombres: nombresDe(ev.datos.nombres) || 'la invitación', rol, quien: mio?.nombre || mio?.email || '',
        url: `${base}/entrar?siguiente=${encodeURIComponent(`/panel/${ev.id}`)}` }) }).catch((e) => console.error('[acceso]', e));
      return json({ ok: true });
    }
  }
  if (accion === 'enviado' && request.method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const codigos = [].concat(b.codigos || b.codigo || []).map(String).slice(0, 2000);
    for (const c of codigos) await almacen.marcarEnvio(ev.id, c, b.tipo);
    return json({ ok: true, fecha: new Date().toISOString() });
  }
  if (accion === 'puerta') return json({ link: `${url.origin}/puerta/${ev.id}?t=${await tokenPuerta(ev, secretoDe(env))}`, invitados: await listaPuerta(env, ev) });
  if (accion === 'respuestas' && request.method === 'DELETE') {
    // Solo se borran las respuestas de prueba (las que mandó el dueño desde "Ver la invitación")
    const rid = Number(url.searchParams.get('r'));
    const r = (await almacen.respuestas(ev.id)).find((x) => x.id === rid);
    if (!r || !r.datos.prueba) return json({ error: 'Solo se pueden borrar las respuestas de prueba.' }, 400);
    await almacen.borrarRespuesta(ev.id, rid);
    return json({ ok: true });
  }
  if (accion === 'respuestas') return json({ respuestas: await almacen.respuestas(ev.id) });
  // Administración: textos de los mensajes de WhatsApp y asientos por mesa
  // Álbum de fotos: con Deluxe viene el Classic de Albunear sin cargo (un código de regalo por invitación,
  // pedido al Worker de Albunear por el enlace interno). Cuando el álbum ya está creado, su link pasa a la invitación.
  if (accion === 'albunear' && request.method === 'GET') {
    const incluido = ev.paquete === 'deluxe';
    let r = null;
    if (incluido && env.ALBUNEAR?.albumDeluxe) { try { r = await env.ALBUNEAR.albumDeluxe(ev.id); } catch (e) { console.error('albunear', e); } }
    if (r?.album?.link && ev.datos.album?.albunear !== r.album.link) {
      ev.datos.album = { ...(ev.datos.album || {}), albunear: r.album.link };
      await almacen.guardarEvento(ev);
    }
    return json({ incluido, crear: r?.crear || 'https://albunear.com/empezar', album: r?.album || null, conectado: !!r });
  }
  // El interruptor "Activar" de la pestaña Álbum: prende la sección con el álbum de Albunear (reemplaza Instagram Wall)
  if (accion === 'album' && request.method === 'POST') {
    const b = await request.json().catch(() => ({}));
    if (b.activo === true && !['premium', 'deluxe'].includes(ev.paquete) && !admin) return json({ error: 'El álbum va con los planes Premium y Deluxe' }, 402);
    ev.datos.secciones = { ...(ev.datos.secciones || {}), album: b.activo === true };
    if (b.activo === true) { ev.datos.secciones.instagram = false; ev.datos.album = { ...(ev.datos.album || {}), origen: 'albunear' }; }
    await almacen.guardarEvento(ev);
    return json({ ok: true });
  }
  if (accion === 'admin' && request.method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const texto = (x) => (typeof x === 'string' ? x.slice(0, 1500) : undefined);
    ev.datos.admin = { textoWa: texto(b.textoWa), textoWaLista: texto(b.textoWaLista), textoRecordatorio: texto(b.textoRecordatorio),
      asientos: Number.isFinite(Number(b.asientos)) ? Math.min(30, Math.max(2, Number(b.asientos))) : undefined, buscaMesa: b.buscaMesa === true, checkin: b.checkin === true, avisosMail: b.avisosMail !== false };
    await almacen.guardarEvento(ev);
    return json({ ok: true });
  }
  if (accion === 'publicar' && request.method === 'POST') {
    const faltan = faltantes(esquema, ev.datos);
    if (faltan.length || !ev.slug) return json({ error: 'faltan', faltan }, 422);
    if (modoAcceso(ev) === 'pin' && !ev.datos.acceso?.pinPorInvitado && !/^\d{4}$/.test(ev.datos.acceso?.pin || '')) return json({ error: 'Falta el PIN' }, 422);
    if (await tienda.pagoPendiente(env, ev.id)) return json({ error: 'Se puede publicar cuando se acredite el pago. Mientras tanto, todo lo cargado queda guardado.' }, 402);
    // Primero el resumen y el pago de lo que falte (plan y complementos)
    if (ev.producto === 'invitacion') {
      const plan = await tienda.estadoPlan(env, request, ev, esquema);
      if (plan.activar || plan.aPagar.eur > 0) return json({ error: 'pagar', plan }, 402);
    }
    const r = await publicarEvento(env, request, ev);
    return r.ok ? json(r) : json({ error: r.error || 'faltan', faltan: r.faltan }, 422);
  }
  return json({ error: 'no encontrado' }, 404);
}

// Al publicar: si pidió otros colores o tipografía (adicional pago), el pedido le llega al equipo
// una sola vez y desde ahí queda cerrado en el panel.
async function avisarDiseno(env, url, ev) {
  const d = ev.datos.diseno || {};
  if (d.enviado || (d.paleta?.modo !== 'cambiar' && d.tipografia?.modo !== 'cambiar')) return;
  const lineas = [
    `Evento: ${nombresDe(ev.datos.nombres)} · ${ev.tipo} · ${ev.modelo} ${ev.paquete}`,
    `Link: ${url.origin}/${ev.tipo}/${ev.slug}`,
    `Panel: ${url.origin}/panel/${ev.id}?k=${ev.clave}`,
    d.paleta?.modo === 'cambiar' ? `Colores: ${(d.paleta.colores || []).map((c, i) => `${i + 1}) ${(typeof c === 'string' ? c : c?.color) || 'quitar'}`).join(' · ') || '(sin elegir)'}${d.paleta.notas ? ` · ${d.paleta.notas}` : ''}` : 'Colores: originales',
    d.tipografia?.modo === 'cambiar' ? `Tipografía: ${[d.tipografia.nombre, d.tipografia.otra && `otra: ${d.tipografia.otra}`].filter(Boolean).join(' · ') || '(sin indicar)'}` : 'Tipografía: original',
  ];
  const para = String(env.ADMINS || '').split(/[,\s]+/).filter(Boolean)[0] || env.SUPPORT_EMAIL;
  try {
    if (para) await sendEmail(env, { to: para, subject: `Cambio de diseño pedido · ${nombresDe(ev.datos.nombres)}`, text: lineas.join('\n'), html: lineas.map((l) => `<p>${escHtml(l)}</p>`).join('') });
    ev.datos.diseno = { ...d, enviado: new Date().toISOString() };
  } catch (e) { console.error('[diseño]', e); }
}
function escribirRuta(o, ruta, v) {
  const ks = ruta.split('.'); let x = o;
  for (const k of ks.slice(0, -1)) { if (typeof x[k] !== 'object' || x[k] === null) { if (v === undefined) return; x[k] = {}; } x = x[k]; }
  if (v === undefined) delete x[ks.at(-1)]; else x[ks.at(-1)] = v;
}
const escHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Alta de un evento: la va a llamar la tienda después del pago
async function crearEvento(env, request, url) {
  if (!env.ADMIN_CLAVE || !igual(request.headers.get('x-admin') || '', env.ADMIN_CLAVE)) return json({ error: 'Sin permiso' }, 403);
  const b = await request.json();
  if (!PAQUETES.includes(b.paquete)) return json({ error: 'paquete' }, 400);
  const id = `ev_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const clave = crypto.randomUUID().replace(/-/g, '');
  const ev = {
    id, producto: b.producto || 'invitacion', tipo: b.tipo || 'boda', modelo: b.modelo || null, paquete: b.paquete, aMedida: b.aMedida || null,
    estado: 'borrador', clave, empresaId: b.empresaId || null, slug: null,
    datos: { variante: b.variante || varianteDePais(b.pais), zonaHoraria: b.zonaHoraria, acceso: { modo: 'abierta' }, ...(b.datos || {}) },
  };
  await almacenDe(env).guardarEvento(ev);
  return json({ id, panel: `${url.origin}/panel/${id}?k=${clave}` }, 201);
}

async function vistaPrevia(env, url, request, id) {
  const ev = await eventoConClave(env, request, url, id);
  if (!ev) return html('Sin permiso', 403);
  if (!ev.modelo) return html('<p style="font-family:sans-serif;text-align:center;padding:40px">La vista previa aparece cuando el diseño está listo.</p>');
  const empresa = ev.empresaId ? await almacenDe(env).empresa(ev.empresaId) : null;
  const mj = await modeloJSON(env, ev.modelo, url.origin, ev.tipo);
  const evento = conFotosDeMuestra({ ...paraMotor(ev), paquete: await planVista(env, url, ev) }, mj);
  // Con lista de invitados se ve como la ve el primero de la lista (o un ejemplo)
  let invitado = null;
  if (usaLista(ev.datos)) {
    const lista = await almacenDe(env).invitados(ev.id).catch(() => []);
    invitado = lista[0] || { codigo: 'ejemplo', nombre: 'Nombre del invitado', pases: 1, mesa: '1' };
  }
  return pagina(env, url, evento, { marca: empresa?.marca?.blanca ? empresa.marca : null, sinSobre: true, prueba: true, invitado });
}

// Vista previa del panel: donde el cliente todavía no subió fotos van las fotos de la demo
// del modelo, muy desenfocadas (scripts/fotos-borrosas.py), así ve dónde va cada una sin
// confundirlas con las suyas. Si el modelo no las tiene, las siluetas genéricas. Si ya subió
// alguna en un grupo (galería, portada…) se muestran solo las suyas. Con "Incluir fotos"
// apagado no va ninguna. La invitación publicada nunca las usa.
const BASE = '/comun/img/base';
function conFotosDeMuestra(ev, modelo) {
  const on = (g) => ev.fotosOn?.[g] !== false;
  const vacio = (x) => !x || (Array.isArray(x) && !x.length);
  const borrosas = modelo?.demoBorrosas?.[ev.tipo] || modelo?.demoBorrosas?.boda;
  const tipoB = modelo?.demoBorrosas?.[ev.tipo] ? ev.tipo : 'boda';
  const dir = `/modelos/${ev.modelo}/demo/${tipoB}/borrosas`;
  const serie = (nombre, n) => Array.from({ length: n }, (_, i) => `${BASE}/${nombre}${i + 1}.jpg`);
  const muestra = borrosas ? {
    portada: (borrosas.portada.length ? borrosas.portada : ['foto1.jpg']).map((x) => `${dir}/${x}`),
    galeria: borrosas.galeria.map((x) => `${dir}/${x}`),
    rsvp: borrosas.rsvp ? `${dir}/${borrosas.rsvp}` : '/comun/img/borrosas/demo-lugar.jpg',
    instagram: borrosas.instagram ? `${dir}/${borrosas.instagram}` : `${dir}/${borrosas.galeria[0]}`,
    iglesia: '/comun/img/borrosas/demo-iglesia.jpg', lugar: '/comun/img/borrosas/demo-lugar.jpg',
    testigos: ['/comun/img/borrosas/demo-testigo1.jpg', '/comun/img/borrosas/demo-testigo2.jpg'],
    dress: [1, 2, 3, 4, 5, 6].map((n) => `/comun/img/borrosas/demo-dress${n}.jpg`),
  } : {
    portada: serie('hero-banner', 4), galeria: serie('foto', 6), rsvp: `${BASE}/rsvp.jpg`, instagram: `${BASE}/instagram.jpg`,
    iglesia: `${BASE}/iglesia.jpg`, lugar: `${BASE}/lugar.jpg`, testigos: serie('testigo', 4), dress: serie('dress-code', 6),
  };
  const f = { ...(ev.fotos || {}) };
  if (on('portada') && vacio(f.portada)) f.portada = muestra.portada.map((url) => ({ url, pos: '50% 30%' }));
  if (vacio(f.galeria)) f.galeria = muestra.galeria.map((url) => ({ url }));
  if (ev.fotosOn?.rsvp === true && !f.rsvp) f.rsvp = muestra.rsvp;
  if (on('instagram') && !f.instagram) f.instagram = muestra.instagram;
  if (on('album') && !f.album) f.album = muestra.instagram;
  const lugar = (l, foto) => ({ ...(l || {}), foto: l?.foto || (on('lugares') ? foto : '') });
  const testigos = muestra.testigos;
  const dc = ev.dresscode || {};
  return {
    ...ev,
    fotos: f,
    ceremonia: lugar(ev.ceremonia, muestra.iglesia),
    celebracion: lugar(ev.celebracion, muestra.lugar),
    testigos: (ev.testigos || []).map((x, i) => ({ ...x, foto: x.foto || (on('testigos') ? testigos[i % testigos.length] : '') })),
    dresscode: { ...dc, fotos: on('dresscode') && vacio(dc.fotos) ? muestra.dress.map((url) => ({ url })) : dc.fotos },
  };
}

async function media(env, partes) {
  const o = await almacenDe(env).archivo(partes.slice(1).join('/'));
  return o ? new Response(o.cuerpo, { headers: { 'content-type': o.tipo, 'cache-control': 'public, max-age=31536000, immutable' } }) : new Response('', { status: 404 });
}

// ── Modo "Próximamente": con PREVIEW_KEY cargada, el público ve una página de espera ──
// Se entra una vez por navegador con ?preview=CLAVE (queda 90 días). Salir: ?preview=salir.
// Las invitaciones publicadas, las demos y los avisos de las pasarelas siguen funcionando.
const SIEMPRE_ABIERTO = /^\/(api\/(stripe|mp)\/webhook|api\/rsvp|api\/invitados\.csv|api\/mesa|mesa\/|api\/puerta|puerta\/|acceso\/|factura\/|media\/|comun\/|modelos\/|demo\/|favicon)/;
function proximamente(request, env, url) {
  const clave = String(env.PREVIEW_KEY || '').trim();
  if (!clave) return null;
  const q = url.searchParams.get('preview');
  if (q !== null) {
    const limpia = new URL(url); limpia.searchParams.delete('preview');
    const ok = q === clave;
    return new Response(null, { status: 302, headers: { location: limpia.pathname + limpia.search, 'set-cookie': `preview=${ok ? encodeURIComponent(clave) : ''}; Path=/; Max-Age=${ok ? 7776000 : 0}; HttpOnly; Secure; SameSite=Lax` } });
  }
  if (getCookie(request, 'preview') === clave || SIEMPRE_ABIERTO.test(url.pathname)) return null;
  // Invitaciones publicadas (/<tipo>/<slug>): abiertas
  if (/^\/[a-z0-9-]+\/[a-z0-9-]+\/?$/.test(url.pathname) && !/^\/(tienda|panel|vista|entrar|mi-cuenta|admin|auth)\//.test(url.pathname)) return null;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return json({ error: 'Próximamente' }, 503);
  return html(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>Amo Invitar · Muy pronto</title>
<link rel="stylesheet" href="/comun/fonts/google/great-vibes+jost.css"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;text-align:center;background:#f6f5f3;color:#1f2421;font:17px/1.6 Jost,system-ui,sans-serif;padding:24px}img{width:min(280px,70vw);height:auto}h1{font:400 clamp(40px,8vw,64px)/1.1 'Great Vibes',cursive;color:#7a9c7e;margin:24px 0 8px}a{color:#4e9c87}</style></head>
<body><main><img src="/comun/img/amoinvitar-fondo-claro.svg" alt="Amo Invitar!"><h1>Muy pronto</h1><p>Estamos preparando la nueva tienda de invitaciones digitales.</p><p><a href="https://amoinvitar.com">amoinvitar.com</a></p></main></body></html>`, 503, { 'retry-after': '86400', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' });
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(admin.tareas(controller, env).catch((e) => console.error('[tareas]', e)));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    const partes = url.pathname.split('/').filter(Boolean);
    const [p0, p1] = partes;
    tienda.opcionesTienda.esquemaDe = (ev) => esquemaDe(env, url, ev);
    tienda.opcionesTienda.publicar = publicarEvento;
    const cerrado = proximamente(request, env, url);
    if (cerrado) return cerrado;
    try {
      const M = request.method;
      if (p0 === 'auth') {
        if (p1 === 'enlace' && M === 'POST') return await cuenta.pedirEnlace(request, env);
        if (p1 === 'enlace') return await cuenta.entrarConEnlace(request, env);
        if (p1 === 'google' && partes[2] === 'vuelta') return await cuenta.googleVuelta(request, env);
        if (p1 === 'google') return await cuenta.google(request, env);
        if (p1 === 'salir') return await cuenta.salir(request, env);
      }
      if (p0 === 'api') {
        if (p1 === 'cuenta') return await cuenta.cuenta(request, env);
        if (p1 === 'tienda') {
          const a = partes[2];
          if (a === 'catalogo') return await tienda.catalogo(request, env);
          if (a === 'cotizar' && M === 'POST') return await tienda.cotizar(request, env);
          if (a === 'mejora' && M === 'POST') return await tienda.cotizarMejora(request, env);
          if (a === 'comprar' && M === 'POST') return await tienda.comprar(request, env);
          if (a === 'confirmar') return await tienda.confirmar(request, env);
          if (a === 'empezar' && M === 'POST') return await tienda.empezar(request, env);
        }
        if (p1 === 'stripe' && partes[2] === 'webhook' && M === 'POST') return await tienda.webhookStripe(request, env);
        if (p1 === 'mp' && partes[2] === 'webhook') return await tienda.webhookMp(request, env);
        if (p1 === 'admin' && partes[2] === 'pedidos' && partes[4] === 'cobrado' && M === 'POST') return await tienda.marcarCobrado(request, env, partes[3]);
        if (p1 === 'admin' && partes[2] === 'facturas') return await admin.facturasJson(request, env);
        if (p1 === 'admin' && partes[2] === 'verifactu' && M === 'POST') return await admin.verifactuEnviar(request, env);
        if (p1 === 'rsvp' && request.method === 'POST') return await rsvp(env, request);
        if (p1 === 'invitados.csv') return await invitadosCSV(env, request, url);
        if (p1 === 'mesa') return await buscarMesa(env, request, url);
        if (p1 === 'puerta') return await apiPuerta(env, request, url);
        if (p1 === 'panel' && partes[2]) return await apiPanel(env, request, url, partes);
        if (p1 === 'eventos' && request.method === 'POST') return await crearEvento(env, request, url);
        return json({ error: 'no encontrado' }, 404);
      }
      if (p0 === 'media') return await media(env, partes);
      if (p0 === 'factura' && p1) return await admin.facturaCliente(request, env, p1);
      if (p0 === 'admin' && p1 === 'facturas') return await admin.facturasImprimir(request, env);
      if (p0 === 'admin' && p1 === 'facturas.csv') return await admin.facturasCsv(request, env);
      if (p0 === 'demo' && partes.length === 2) return await demo(env, url, request, p1);
      if (p0 === 'panel' && partes.length === 2 && p1.startsWith('ev_')) return env.ASSETS.fetch(new URL('/panel/', url.origin));
      if (p0 === 'mesa' && partes.length === 2) return await paginaMesa(env, url, p1);
      if (p0 === 'puerta' && partes.length === 2) return await paginaPuerta(env, url, p1);
      if (p0 === 'vista' && partes.length === 2) return await vistaPrevia(env, url, request, p1);
      if (p0 === 'acceso' && partes.length === 2 && request.method === 'POST') return await entrarConPin(env, request, p1);
      if (p0 === 'acceso' && partes.length === 3 && partes[2] === 'dueno') return await entrarDueno(env, request, url, p1);
      if (partes.length === 2 && /^[a-z0-9-]+$/.test(p0) && /^[a-z0-9-]+$/.test(p1)) {
        const r = await publicada(env, url, request, p0, p1);
        if (r) return r;
      }
    } catch (err) {
      if (err instanceof HttpError) {
        return p0 === 'api' || request.method !== 'GET' ? json({ error: err.message, ...err.extra }, err.status) : html(err.message, err.status);
      }
      console.error(err);
      return p0 === 'api' ? json({ error: 'Algo falló. Probar de nuevo en un momento.' }, 500) : html('Error al armar la página', 500);
    }
    // Archivos de public/ (páginas, estilos, imágenes)
    const archivo = await env.ASSETS.fetch(request);
    if (archivo.status !== 404) return archivo;
    // Lo demás es del sitio de siempre: en otro dominio (app.amoinvitar.com) se manda allá;
    // en el mismo dominio se pide al hosting actual sin que el visitante lo note
    if (env.ORIGEN_ANTIGUO) {
      const viejo = new URL(url.pathname + url.search, env.ORIGEN_ANTIGUO);
      if (viejo.host !== url.host) {
        // La app todavía no tiene portada propia: en app.amoinvitar.com el inicio es la tienda
        if (url.pathname === '/') return Response.redirect(new URL('/tienda/', url.origin).href, 302);
        return Response.redirect(viejo.href, 302);
      }
      return fetch(new Request(viejo, request));
    }
    return html('No encontrado', 404);
  },
};
