// Servidor para probar en la compu sin Cloudflare: sirve public/ igual que
// los "assets" del Worker, le pasa el resto al Worker y guarda todo en memoria.
//   npm run local   →   muestra el link de la demo y de un panel de prueba
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../src/index.js';
import { almacenMemoria } from '../src/almacen.js';

const PUBLICO = fileURLToPath(new URL('../public/', import.meta.url));
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };

async function estatico(pathname) {
  let ruta = normalize(join(PUBLICO, decodeURIComponent(pathname)));
  if (!ruta.startsWith(PUBLICO)) return null;
  try { if ((await stat(ruta)).isDirectory()) ruta = join(ruta, 'index.html'); return new Response(await readFile(ruta), { headers: { 'content-type': TIPOS[extname(ruta)] || 'application/octet-stream' } }); }
  catch { return null; }
}

const env = {
  SIN_CACHE: true, ADMIN_CLAVE: 'local', almacen: almacenMemoria(),
  ASSETS: { fetch: async (u) => (await estatico(new URL(u).pathname)) || new Response('', { status: 404 }) },
};
const puerto = Number(process.env.PORT || 8787);
const DINAMICO = /^\/(demo|api|vista|media|acceso)(\/|$)|^\/panel\/ev_/;

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${puerto}`);
  const cuerpo = req.method === 'GET' || req.method === 'HEAD' ? undefined : await new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); });
  const request = new Request(url, { method: req.method, headers: req.headers, body: cuerpo, duplex: 'half' });
  const r = (DINAMICO.test(url.pathname) ? null : await estatico(url.pathname)) || await worker.fetch(request, env);
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
  console.log(`Demo  → http://localhost:${puerto}/demo/garden`);
  console.log(`Panel → ${alta.panel}`);
});
