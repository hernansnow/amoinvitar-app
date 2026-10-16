// Worker de Amo Invitar 2.0
//
//   /demo/<modelo>?evento=boda&paquete=deluxe&pais=AR   demo de un modelo
//   /<tipo>/<slug>                                       invitación de un cliente
//   POST /api/rsvp                                       confirmaciones y canciones
//   GET  /api/invitados.csv?e=<id>                        lista de invitados
//
// Los archivos estáticos (public/) los sirve Cloudflare antes de llegar acá.
// Lo que no reconoce se pide al hosting actual: las invitaciones viejas siguen
// funcionando sin migrarlas.

import { diccionario, varianteDePais, VARIANTES } from './textos/index.js';
import { armarVista } from './motor/datos.js';
import { renderizar } from './motor/render.js';
import { eventoDemo } from './datos/demos.js';

const PAQUETES = ['basic', 'premium', 'deluxe'];
const cache = new Map();

async function archivo(env, ruta, origen, tipo = 'text') {
  const clave = `${tipo}:${ruta}`;
  if (cache.has(clave)) return cache.get(clave);
  const r = await env.ASSETS.fetch(new URL(ruta, origen));
  if (!r.ok) return null;
  const v = tipo === 'json' ? await r.json() : await r.text();
  if (!env.SIN_CACHE) cache.set(clave, v);
  return v;
}

// t(clave): diccionario + lo que reescribió el cliente, con {nombres} resuelto
function traductor(tipo, variante, propios = {}, nombres = '') {
  const d = { ...diccionario(tipo, variante), ...propios };
  return (k) => String(d[k] ?? '').replaceAll('{nombres}', nombres);
}

async function invitacion(env, url, evento, { demo = false } = {}) {
  const modelo = await archivo(env, `/modelos/${evento.modelo}/modelo.json`, url.origin, 'json');
  const html = modelo && await archivo(env, `/modelos/${evento.modelo}/index.html`, url.origin);
  if (!html) return new Response('Modelo no encontrado', { status: 404 });
  const variante = VARIANTES.includes(evento.variante) ? evento.variante : 'es';
  const nombres = [evento.nombres?.a, evento.nombres?.b].filter(Boolean).join(' & ');
  const t = traductor(evento.tipo, variante, evento.textos, nombres);
  const rutas = { comun: '/comun', modelo: `/modelos/${evento.modelo}`, api: '/api' };
  const v = armarVista({ evento, modelo, t, variante, rutas, demo });
  const pagina = renderizar(html, v, t, { origen: url.origin });
  return new Response(pagina, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': demo ? 'public, max-age=300' : 'private, no-cache',
      ...(demo ? { vary: 'cf-ipcountry' } : {}),
    },
  });
}

async function demo(env, url, request, idModelo) {
  const modelo = await archivo(env, `/modelos/${idModelo}/modelo.json`, url.origin, 'json');
  if (!modelo) return new Response('Modelo no encontrado', { status: 404 });
  const q = url.searchParams;
  const tipo = modelo.eventos.includes(q.get('evento')) ? q.get('evento') : modelo.eventos[0];
  const paquete = PAQUETES.includes(q.get('paquete')) ? q.get('paquete') : 'deluxe';
  const pais = q.get('pais') || request.cf?.country || request.headers.get('cf-ipcountry') || '';
  const variante = VARIANTES.includes(q.get('idioma')) ? q.get('idioma') : varianteDePais(pais);
  const rutas = { comun: '/comun', modelo: `/modelos/${idModelo}` };
  return invitacion(env, url, eventoDemo({ tipo, variante, paquete, modelo, rutas }), { demo: true });
}

// ── Datos guardados (D1) ────────────────────────────────────────────────
async function buscarEvento(env, tipo, slug) {
  if (!env.DB) return null;
  const fila = await env.DB.prepare('SELECT datos FROM eventos WHERE tipo = ? AND slug = ? AND estado = ?').bind(tipo, slug, 'publicado').first();
  return fila ? JSON.parse(fila.datos) : null;
}

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

async function rsvp(env, request) {
  const f = await request.formData();
  const eventoId = String(f.get('event_id') || '');
  const accion = f.get('action') === 'cancion' ? 'cancion' : 'rsvp';
  if (!eventoId) return json({ result: 'error' }, 400);
  if (eventoId.startsWith('demo-') || !env.DB) return json({ result: 'ok', demo: true });
  const datos = {};
  for (const [k, val] of f.entries()) if (typeof val === 'string' && k !== 'event_id' && k !== 'action') datos[k] = val.slice(0, 2000);
  await env.DB.prepare('INSERT INTO respuestas (evento_id, tipo, datos, creado) VALUES (?, ?, ?, ?)')
    .bind(eventoId, accion, JSON.stringify(datos), new Date().toISOString()).run();
  return json({ result: 'ok' });
}

async function invitadosCSV(env, url) {
  const id = url.searchParams.get('e') || '';
  if (!env.DB || !id) return new Response('id,nombre,pases,mesa,pin\n', { headers: { 'content-type': 'text/csv; charset=utf-8' } });
  const { results } = await env.DB.prepare('SELECT codigo, nombre, pases, mesa, pin FROM invitados WHERE evento_id = ? ORDER BY nombre').bind(id).all();
  const celda = (x) => { const s = String(x ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = ['id,nombre,pases,mesa,pin', ...results.map((r) => [r.codigo, r.nombre, r.pases, r.mesa, r.pin].map(celda).join(','))].join('\n');
  return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store' } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const partes = url.pathname.split('/').filter(Boolean);
    try {
      if (partes[0] === 'api') {
        if (partes[1] === 'rsvp' && request.method === 'POST') return await rsvp(env, request);
        if (partes[1] === 'invitados.csv') return await invitadosCSV(env, url);
        return json({ error: 'no encontrado' }, 404);
      }
      if (partes[0] === 'demo' && partes.length === 2 && /^[a-z0-9-]+$/.test(partes[1])) {
        return await demo(env, url, request, partes[1]);
      }
      if (partes.length === 2 && /^[a-z0-9-]+$/.test(partes[0] + partes[1])) {
        const evento = await buscarEvento(env, partes[0], partes[1]);
        if (evento) return await invitacion(env, url, evento);
      }
    } catch (err) {
      console.error(err);
      return new Response('Error al armar la invitación', { status: 500 });
    }
    // Todo lo demás: el sitio y las invitaciones de siempre
    if (env.ORIGEN_ANTIGUO) {
      const destino = new URL(url.pathname + url.search, env.ORIGEN_ANTIGUO);
      return fetch(new Request(destino, request));
    }
    return new Response('No encontrado', { status: 404 });
  },
};
