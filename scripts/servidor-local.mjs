// Servidor para probar en la compu sin Cloudflare: sirve public/ igual que
// los "assets" del Worker y le pasa el resto al Worker.
//   npm run local   →   http://localhost:8787/demo/garden?evento=15&pais=AR
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../src/index.js';

const PUBLICO = fileURLToPath(new URL('../public/', import.meta.url));
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };

async function estatico(pathname) {
  let ruta = normalize(join(PUBLICO, decodeURIComponent(pathname)));
  if (!ruta.startsWith(PUBLICO)) return null;
  try { if ((await stat(ruta)).isDirectory()) ruta = join(ruta, 'index.html'); return new Response(await readFile(ruta), { headers: { 'content-type': TIPOS[extname(ruta)] || 'application/octet-stream' } }); }
  catch { return null; }
}

const env = { SIN_CACHE: true, ASSETS: { fetch: async (u) => (await estatico(new URL(u).pathname)) || new Response('', { status: 404 }) } };
const puerto = Number(process.env.PORT || 8787);

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${puerto}`);
  const cuerpo = req.method === 'GET' || req.method === 'HEAD' ? undefined : await new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); });
  const request = new Request(url, { method: req.method, headers: req.headers, body: cuerpo });
  const r = (url.pathname.startsWith('/demo/') || url.pathname.startsWith('/api/') ? null : await estatico(url.pathname)) || await worker.fetch(request, env);
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(puerto, () => console.log(`Amo Invitar local → http://localhost:${puerto}/demo/garden`));
