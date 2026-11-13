// README (ronda 57): lista de archivos de cada modelo (sin las fotos de demo) para el «kit» del diseño propio en la consola.
// Se genera sola con npm run sitio; a mano: node scripts/archivos-modelos.mjs → public/modelos/archivos.json
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const RAIZ = new URL('../public/modelos/', import.meta.url).pathname;
const salida = {};
const recorrer = (dir, pre = '') => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f), r = pre + f;
  if (statSync(p).isDirectory()) return f === 'demo' ? [] : recorrer(p, r + '/');
  return [[r, statSync(p).size]];
});
for (const m of readdirSync(RAIZ).sort()) {
  const d = join(RAIZ, m);
  if (!statSync(d).isDirectory()) continue;
  salida[m] = recorrer(d);
}
writeFileSync(join(RAIZ, 'archivos.json'), JSON.stringify(salida));
console.log('archivos.json:', Object.keys(salida).length, 'modelos');
