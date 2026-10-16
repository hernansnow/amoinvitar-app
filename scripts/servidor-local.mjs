// Servidor para probar en la compu sin Cloudflare: sirve public/ igual que
// los "assets" del Worker y le pasa el resto al Worker. La base es SQLite (la
// misma estructura que D1) y los pagos se dan por aprobados sin pasarela.
//   npm run local   →   muestra el link de la demo, la tienda y un panel de prueba
//   BASE=prueba.db npm run local   →   guarda la base en un archivo (si no, en memoria)
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../src/index.js';
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
  ADMINS: process.env.ADMINS || '', ULTIMOS_MAILS: [],
  // Facturas de prueba (en producción, los datos reales se cargan en Cloudflare)
  INVOICE_NAME: 'Amo Invitar (prueba)', INVOICE_TAX_ID: '00000000T', INVOICE_ADDRESS: 'Calle de prueba 1\n28001 Madrid', INVOICE_SERIES: 'AI', SECRETO_ACCESO: 'local',
  DB: d1Local(process.env.BASE || ':memory:'), MEDIA: r2Local(),
  ASSETS: { fetch: async (u) => (await estatico(new URL(typeof u === 'string' || u instanceof URL ? u : u.url).pathname)) || new Response('', { status: 404 }) },
};
const puerto = Number(process.env.PORT || 8787);

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${puerto}`);
  const cuerpo = req.method === 'GET' || req.method === 'HEAD' ? undefined : await new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); });
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
  console.log(`Demo   → http://localhost:${puerto}/demo/garden`);
  console.log(`Tienda → http://localhost:${puerto}/tienda/`);
  console.log(`Panel  → ${alta.panel}`);
});
