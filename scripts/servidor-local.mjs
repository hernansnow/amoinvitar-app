// Servidor para probar en la compu sin Cloudflare: sirve public/ igual que
// los "assets" del Worker y le pasa el resto al Worker. La base es SQLite (la
// misma estructura que D1) y los pagos se dan por aprobados sin pasarela.
//   npm run local   →   muestra el link de la demo, la tienda y un panel de prueba
//   BASE=prueba.db npm run local   →   guarda la base en un archivo (si no, en memoria)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { register } from 'node:module';
// README (ronda 52): el Worker importa «cloudflare:workers» (src/socios.js); en la compu se usa un reemplazo
register('./ganchos-local.mjs', import.meta.url);
const { default: worker } = await import('../src/index.js');
import { d1Local, r2Local } from './d1-local.mjs';

const PUBLICO = fileURLToPath(new URL('../public/', import.meta.url));
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };

async function estatico(pathname) {
  let ruta = normalize(join(PUBLICO, decodeURIComponent(pathname)));
  if (!ruta.startsWith(PUBLICO)) return null;
  try { if ((await stat(ruta)).isDirectory()) ruta = join(ruta, 'index.html'); return new Response(await readFile(ruta), { headers: { 'content-type': TIPOS[extname(ruta)] || 'application/octet-stream' } }); }
  catch { return null; }
}

const env = {
  SIN_CACHE: true, MODO_LOCAL: true, ADMIN_CLAVE: 'local', DEV_FAKE_PAYMENTS: '1', SIN_COTIZACION: process.env.COTIZAR ? '' : '1',
  TRANSFER_EUR: 'Titular: Amo Invitar (prueba) | IBAN: ES00 0000 0000 0000 0000 0000', TRANSFER_ARS: 'Alias: amoinvitar.prueba | CBU: 0000000000000000000000',
  ADMINS: process.env.ADMINS || '', ULTIMOS_MAILS: [], WHATSAPP: '34621326549',
  // Facturas de prueba (en producción, los datos reales se cargan en Cloudflare)
  INVOICE_NAME: 'Amo Invitar (prueba)', INVOICE_TAX_ID: '00000000T', INVOICE_ADDRESS: 'Calle de prueba 1\n28001 Madrid', INVOICE_SERIES: 'AI', SECRETO_ACCESO: 'local',
  DB: d1Local(process.env.BASE || ':memory:'), MEDIA: r2Local(),
  // Albunear de prueba (en Cloudflare es el enlace interno con el Worker de Albunear)
  ALBUNEAR: { albumDeluxe: async (id) => ({ codigo: 'PRUEBA12', crear: 'https://albunear.com/crear?regalo=PRUEBA12',
    album: process.env.ALBUM_CREADO ? { link: 'https://albunear.com/a/prueba', panel: `https://albunear.com/panel/album?id=${id}`, plan: 'classic', estado: 'active' } : null }),
    // README (ronda 52): crear el álbum Classic ya armado y entrar a su panel (acá devuelve lo recibido, para revisarlo)
    crearAlbum: async (d) => { env.ULTIMO_ALBUM = { ...d, portada: d.portada ? { tipo: d.portada.tipo, bytes: d.portada.bytes?.byteLength } : null }; return { album: { link: 'https://albunear.com/a/prueba', panel: 'https://albunear.com/panel/album?id=prueba', plan: 'classic', estado: 'active' }, entrar: 'https://albunear.com/auth/verify?t=PRUEBA' }; },
    // README (ronda 108): el álbum administrado desde Amo Invitar! (acá, fotos de ejemplo en memoria)
    album: async (id, p) => albumDePrueba(p),
    // README (ronda 125): archivos de los diseños del álbum (en local, desde la copia de Albunear si está al lado; si no, 404)
    fetch: async (req) => {
      const ruta = new URL(req.url).pathname;
      // README (ronda 126): la página del invitado y su API van al Albunear local (npx wrangler dev en ALBUNEAR_LOCAL), si está
      if (process.env.ALBUNEAR_LOCAL && /^\/(a\/|api\/|i18n\/)/.test(ruta)) {
        const u = new URL(req.url); return fetch(process.env.ALBUNEAR_LOCAL + ruta + u.search, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer() });
      }
      const f = path.join(process.env.ALBUNEAR_PUBLIC || path.resolve('../albunear/public'), ruta);
      if (!fs.existsSync(f)) return new Response('', { status: 404 });
      const tipo = { '.css': 'text/css', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.jpg': 'image/jpeg', '.png': 'image/png' }[path.extname(f)] || 'application/octet-stream';
      return new Response(fs.readFileSync(f), { headers: { 'content-type': tipo } });
    } },
  ASSETS: { fetch: async (u) => (await estatico(new URL(typeof u === 'string' || u instanceof URL ? u : u.url).pathname)) || new Response('', { status: 404 }) },
};
// README (ronda 108): álbum de prueba para la pestaña Álbum QR (como responde Socios.album de Albunear)
const FOTOS_PRUEBA = ['bg20.jpg', 'bg21.jpg', 'bg33.jpg', 'bg-oliva-2.jpg', 'bg-oliva-6.jpg'].flatMap((f, i) => [0, 1, 2].map((k) => ({ id: `m${i}${k}`, kind: i === 4 && k === 0 ? 'video' : 'photo',
  thumb: `/modelos/garden/img/${f}`, src: `/modelos/garden/img/${f}`, original: `/modelos/garden/img/${f}`, duration: i === 4 && k === 0 ? 16 : null, name: ['Ana', 'Leo', ''][k], likes: k, t: 1795000000 - (i * 3 + k) * 3600,
  status: 'visible', favorite: false, featured: false })));
const ALBUM_PRUEBA = { guestsCanView: true, moderation: 'off', coverTitle: null, qrSub: null, welcome: null, brand: 'albunear', planId: process.env.ALBUM_PLAN || 'classic', status: 'active' };
function albumDePrueba(p) {
  const vivas = FOTOS_PRUEBA.filter((m) => !m.borrada);
  const counts = { total: vivas.length, fav: vivas.filter((m) => m.favorite).length, featured: vivas.filter((m) => m.featured).length, hidden: vivas.filter((m) => m.status === 'hidden').length, pending: 0, videos: vivas.filter((m) => m.kind === 'video').length };
  const event = { slug: 'prueba', name1: 'Ana', name2: 'Leo', screenUrl: 'https://albunear.com/pantalla/prueba?k=x', guestUrl: ALBUM_PRUEBA.guestUrl || 'https://albunear.com/a/prueba', planFeatures: { moderation: 'advanced', zip: true }, ...ALBUM_PRUEBA };
  const album = { link: 'https://albunear.com/a/prueba', panel: 'https://albunear.com/panel/album?id=prueba', plan: 'classic', estado: 'active' };
  switch (p.accion) {
    case 'info': return { album, event, counts };
    case 'media': { const f = { fav: (m) => m.favorite, featured: (m) => m.featured, hidden: (m) => m.status !== 'visible', video: (m) => m.kind === 'video' }[p.filtro] || (() => true);
      const l = vivas.filter(f).sort((a, b) => (p.orden === 'oldest' ? a.t - b.t : p.orden === 'likes' ? b.likes - a.likes : b.t - a.t)); return { media: l.slice(p.desde || 0, (p.desde || 0) + (p.cantidad || 120)), more: false }; }
    case 'lote': { if (p.que === 'feature' && counts.featured + p.ids.length > 3) return { error: 'err.maxFeatured', status: 400 };
      for (const m of FOTOS_PRUEBA.filter((x) => p.ids.includes(x.id))) Object.assign(m, { fav: { favorite: true }, unfav: { favorite: false }, feature: { featured: true }, unfeature: { featured: false }, hide: { status: 'hidden' }, show: { status: 'visible' }, delete: { borrada: true } }[p.que]);
      return { ok: true }; }
    case 'ajustes': Object.assign(ALBUM_PRUEBA, p.guestsCanView !== undefined ? { guestsCanView: p.guestsCanView } : {}, p.moderation ? { moderation: p.moderation } : {},
      ...['coverTitle', 'qrSub', 'welcome'].filter((k) => p[k] !== undefined).map((k) => ({ [k]: p[k] }))); return albumDePrueba({ accion: 'info' });
    // README (ronda 122): diseño (iframe), borrar, marca del slideshow y pasar a Platinum
    case 'diseno': return { url: '/comun/img/albunear.svg' };
    // README (ronda 125): pestaña Diseño sin iframe
    case 'estilos': return { event: { ...ALBUM_PRUEBA, name1: 'Ana', name2: 'Leo', type: 'boda', theme: ALBUM_PRUEBA.theme || 'lovestory', chosenTheme: ALBUM_PRUEBA.theme || 'lovestory', cover: ALBUM_PRUEBA.cover || null, coverPos: ALBUM_PRUEBA.coverPos || '50% 22%' },
      tier: ALBUM_PRUEBA.planId === 'platinum' ? 'all' : 'classic', cover: ALBUM_PRUEBA.planId === 'platinum', classicThemes: ['arena', 'salvia', 'terracota', 'medianoche', 'bosque', 'boho'], premiumThemes: ['aquarella', 'garden', 'lovestory', 'noche', 'romantic', 'travel'] };
    case 'estilo': ALBUM_PRUEBA.theme = p.theme; return albumDePrueba({ accion: 'estilos' });
    case 'encuadre': ALBUM_PRUEBA.coverPos = p.pos; return albumDePrueba({ accion: 'estilos' });
    case 'portada': ALBUM_PRUEBA.cover = p.quitar ? null : (p.bytes?.byteLength ? '/modelos/garden/img/bg21.jpg' : null); ALBUM_PRUEBA.ultimaPortada = p.bytes?.byteLength || 0; return albumDePrueba({ accion: 'estilos' });
    case 'borrar': return { ok: true };
    case 'marca': ALBUM_PRUEBA.brand = p.marca || 'albunear'; ALBUM_PRUEBA.guestUrl = p.url || 'https://albunear.com/a/prueba'; env.ULTIMA_MARCA = p; return { ok: true, brand: ALBUM_PRUEBA.brand, guestUrl: ALBUM_PRUEBA.guestUrl };
    case 'mejora': return { url: 'https://albunear.com/auth/verify?t=PRUEBA-MEJORA', cupon: 'AMO5PRUEBA', porcentaje: p.porcentaje };
    case 'zip': return { files: vivas.map((m, i) => ({ url: m.original, name: `fotos/${String(i + 1).padStart(4, '0')}.jpg`, size: 1000 })), slug: 'prueba' };
    case 'entrar': return { url: `https://albunear.com/auth/verify?t=PRUEBA#${p.pestana}` };
    case 'qr': return { tarjeta: '/comun/img/albunear.svg', imprimir: 'https://albunear.com/panel/tarjetas?t=PRUEBA' };
    default: return { error: 'err.badData', status: 400 };
  }
}
const puerto = Number(process.env.PORT || 8787);

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${puerto}`);
  const cuerpo = req.method === 'GET' || req.method === 'HEAD' ? undefined : await new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); });
  // Solo en la compu: correr las tareas diarias (avisos de vencimiento, créditos…) y ver los últimos mails «enviados»
  // README (ronda 122): lo último que recibió crearAlbum (para revisar plan, marca y portada en las pruebas)
  if (url.pathname === '/__ultimo-album') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(env.ULTIMO_ALBUM || null)); }
  if (url.pathname === '/__tareas') { const esperar = []; await worker.scheduled({ cron: '0 4 * * *' }, env, { waitUntil: (p) => esperar.push(p) }); await Promise.all(esperar); res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ ok: true, mails: env.ULTIMOS_MAILS.length })); }
  // README (ronda 52): probar la puerta interna para Albunear (Socios) sin el otro Worker: POST /__socios?m=<método> { … }
  if (url.pathname === '/__socios') { const { Socios } = await import('../src/socios.js'); let out; try { out = await new Socios({}, env)[url.searchParams.get('m')](JSON.parse(String(cuerpo || '{}'))); } catch (e) { out = { error: e.message }; } res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(out)); }
  // README (ronda 78): solo en la compu, para probar: marca una invitación como publicada (y el plan) sin pasar por el pago
  if (url.pathname === '/__publicar') { const id = url.searchParams.get('id'), slug = url.searchParams.get('slug') || id, paq = url.searchParams.get('paquete') || 'deluxe'; await env.DB.prepare("UPDATE eventos SET estado = 'publicado', slug = ?, paquete = ? WHERE id = ?").bind(slug, paq, id).run(); res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ ok: true })); }
  // README (ronda 83): probar los recordatorios a borradores como si pasaran N días, y el aviso al volver (ingreso viejo)
  if (url.pathname === '/__borradores') { const { recordatoriosBorradores } = await import('../src/borradores.js'); const out = await recordatoriosBorradores(env, { ahora: Date.now() + Number(url.searchParams.get('dias') || 0) * 86400000 }); res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(out)); }
  if (url.pathname === '/__ingreso') { await env.DB.prepare("INSERT INTO app_state (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = ?2").bind(`ingreso:${url.searchParams.get('id')}`, new Date(Date.now() - Number(url.searchParams.get('dias') || 0) * 86400000).toISOString(), Date.now()).run(); res.writeHead(200); return res.end('ok'); }
  // README (ronda 118): correr los recordatorios con el reloj adelantado (?horas=30) para probarlos sin esperar
  if (url.pathname === '/__recordatorios') { const { recordatoriosAutomaticos } = await import('../src/recordatorios.js'); const r = await recordatoriosAutomaticos(env, { ahora: Date.now() + (Number(url.searchParams.get('horas')) || 0) * 3600000 }); res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(r)); }
  if (url.pathname === '/__mails') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(env.ULTIMOS_MAILS)); }
  const request = new Request(url, { method: req.method, headers: req.headers, body: cuerpo, duplex: 'half' });
  // Como en Cloudflare (run_worker_first): todo pasa por el Worker, que sirve los archivos con ASSETS
  const r = await worker.fetch(request, env);
  const h = {}; r.headers.forEach((v, k) => { h[k] = k === 'set-cookie' ? r.headers.getSetCookie() : v; });
  // en http://localhost la cookie "Secure" no se guardaría
  if (h['set-cookie']) h['set-cookie'] = h['set-cookie'].map((c) => c.replace('; Secure', ''));
  res.writeHead(r.status, h);
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(puerto, async () => {
  const alta = await worker.fetch(new Request(`http://localhost:${puerto}/api/eventos`, {
    method: 'POST', headers: { 'x-admin': 'local', 'content-type': 'application/json' },
    body: JSON.stringify({ producto: 'invitacion', tipo: process.env.TIPO || 'boda', modelo: 'garden', paquete: process.env.PAQUETE || 'deluxe', pais: 'AR', zonaHoraria: 'America/Argentina/Buenos_Aires' }),
  }), env).then((r) => r.json());
  console.log(`Web    → http://localhost:${puerto}/   (portada nueva; también /bodas, /precios, /album…)`);
  console.log(`Demo   → http://localhost:${puerto}/demo/garden`);
  console.log(`Tienda → http://localhost:${puerto}/tienda/`);
  console.log(`Panel  → ${alta.panel}`);
});
