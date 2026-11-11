// README (ronda 46) · npm run sitio:mini — para cada foto de portada: su color más representativo y una copia diminuta
// (32 px, en base64) que se ve borrosa debajo de la foto mientras carga, así la portada no «salta».
// Guarda scripts/sitio/hero-mini.json (lo usa npm run sitio). Necesita ffmpeg; correrlo al cambiar una foto de portada.
import { execFileSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const IMG = join(AQUI, '../../public/sitio/web/img');
const fotos = [...readdirSync(join(IMG, 'eventos')).filter((f) => /^hero-.*\.(jpg|webp)$/.test(f)).map((f) => `eventos/${f}`), 'hero-desktop.jpg', 'hero-movil.jpg'];
const sale = {};
for (const f of fotos) {
  const ruta = join(IMG, f);
  // Color: el promedio de la foto (1×1 px)
  const px = execFileSync('ffmpeg', ['-v', 'error', '-i', ruta, '-vf', 'scale=1:1:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1e6 });
  const c = '#' + [...px.subarray(0, 3)].map((n) => n.toString(16).padStart(2, '0')).join('');
  // Copia diminuta
  const mini = execFileSync('ffmpeg', ['-v', 'error', '-i', ruta, '-vf', 'scale=32:-2', '-c:v', 'libwebp', '-quality', '45', '-f', 'webp', '-'], { maxBuffer: 1e6 });
  sale[`/web/img/${f}`] = { c, d: `data:image/webp;base64,${mini.toString('base64')}` };
}
writeFileSync(join(AQUI, 'hero-mini.json'), JSON.stringify(sale, null, 1));
console.log('Portadas:', Object.keys(sale).length);
