// README (ronda 90) · Los 5 diseños corporativos del sistema viejo (demo/empresarial/<id>.html) como modelos base
// para «Diseño propio» (no están en el catálogo: `kit: true` en src/modelos.js). Convierte, arma y ordena:
//
//   REPO_VIEJO=../amoinvitar-v2.0 node scripts/conversion/corporativos.mjs [id …]
//
// Después de convertir: fotos de muestra de la portada (demo/empresarial/hero-banner1..4.jpg) y de la galería
// (foto1..8.jpg), el logo SVG dentro del modelo y la carpeta demo/ solo con lo que el diseño usa
// (la conversión copia la carpeta demo/empresarial/ entera, con las fotos de los 5 diseños).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, copyFileSync, existsSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const REPO = resolve(process.env.REPO_VIEJO || join(APP, '../amoinvitar-v2.0'));
const run = (...a) => execFileSync('node', a, { cwd: APP, encoding: 'utf8', env: { ...process.env, REPO_VIEJO: REPO } });

// id: [nombre, fotos de muestra para la portada (las del diseño viejo; los de video usan fotos de su galería)]
export const CORPORATIVOS = {
  snow: ['Snow', ['foto1.jpg', 'foto2.jpg', 'foto3.jpg', 'foto4.jpg']],
  aitravel: ['AI Travel', ['aitravel-fondo1.jpg', 'aitravel-fondo2.jpg', 'aitravel-lugar.jpg', 'aitravel-fondo1.jpg']],
  aquasalud: ['Aquasalud', ['as-foto1.jpg', 'as-foto2.jpg', 'as-foto3.jpg', 'as-lugar.jpg']],
  liseth: ['Liseth', ['l-portada.jpg', 'l-fondo1.jpg', 'l-fondo2.jpg', 'l-lugar.jpg']],
  prave: ['Prave', ['prave-hero-banner.jpg', 'prave-foto1.jpg', 'prave-foto2.jpg', 'prave-foto3.jpg']],
};

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CORPORATIVOS);
for (const id of ids) {
  const [nombre, portada] = CORPORATIVOS[id];
  process.stdout.write(run('scripts/conversion/convertir-modelo.mjs', id, 'empresarial', 'empresarial', id));
  run('scripts/conversion/armar-modelo.mjs', id, nombre); run('scripts/convertir-estilos.mjs', id);
  const dir = join(APP, 'public/modelos', id), demo = join(dir, 'demo/empresarial');
  const html = join(dir, 'index-empresarial.html');
  let h = readFileSync(html, 'utf8');
  // Logos en SVG del sitio viejo (<source srcset="../../img/x.svg">): queda el <img> con el PNG del modelo
  h = h.replace(/<source[^>]*srcset="\.\.\/\.\.\/img\/[\w.-]+\.svg"[^>]*>/g, '');
  // README (ronda 90): todos los fondos y las imágenes fijas del diseño van a img/ (fondo-1.jpg, fondo-2.jpg…), así se
  // cambian desde «Diseño propio» o el kit subiendo un archivo con el mismo nombre. La portada de fotos sigue en el panel.
  const nuevos = new Map(); let nf = 0;
  h = h.replace(/(url\(|src=")demo\/empresarial\/([\w.-]+?)(\?[^)"]*)?(?=[)"])/g, (m, pre, f) => {
    if (/^hero-banner\d?\.jpg$/.test(f) && pre === 'url(' && m) { /* plantilla de las fotos de portada (data-repetir) */ }
    if (!nuevos.has(f)) nuevos.set(f, pre === 'url(' && !/^hero-banner\.jpg$/.test(f) ? `fondo-${++nf}${f.slice(f.lastIndexOf('.'))}` : f);
    const n = nuevos.get(f);
    if (/^hero-banner\.jpg$/.test(f)) return m.replace(/\?[^)"]*$/, '');
    copyFileSync(join(demo, f), join(dir, 'img', n));
    return `${pre}img/${n}`;
  });
  // Imágenes que el diseño viejo pedía sin carpeta (src="prave-logo3.png") y que la conversión no movió
  h = h.replace(/src="([\w-]+\.(?:png|jpe?g|svg|webp|gif))"/g, (m, f) => {
    const origen = join(REPO, 'demo/empresarial', f);
    if (!existsSync(origen)) return m;
    copyFileSync(origen, join(dir, 'img', f)); return `src="img/${f}"`;
  });
  writeFileSync(html, h);
  if (nuevos.size) console.log(`  ${id}: a img/ → ${[...nuevos].filter(([a, b]) => !/^hero-banner/.test(a)).map(([a, b]) => `${a} → ${b}`).join(', ')}`);
  // Fotos de muestra con los nombres que usa la vista de demostración
  portada.forEach((f, i) => copyFileSync(join(demo, f), join(demo, `hero-banner${i + 1}.jpg`)));
  copyFileSync(join(demo, 'hero-banner1.jpg'), join(demo, 'hero-banner.jpg'));
  const galeria = readdirSync(demo).filter((f) => /^foto\d\.jpg$/.test(f)).sort();
  if (galeria.length) for (let n = galeria.length + 1; n <= 8; n++) copyFileSync(join(demo, galeria[(n - 1) % galeria.length]), join(demo, `foto${n}.jpg`));
  // Fuera lo que no usa este diseño
  const usado = [h, ...['estilo.css', 'tema.css', 'modelo.json'].map((f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8') : ''))].join('\n');
  let borrados = 0;
  for (const f of readdirSync(demo)) {
    if (/^(hero-banner\d?|foto\d)\.jpg$/.test(f) && (galeria.length || !/^foto/.test(f))) continue;
    if (!usado.includes(f)) { unlinkSync(join(demo, f)); borrados++; }
  }
  console.log(`${id}: listo (${readdirSync(demo).length} fotos de muestra, ${borrados} sin usar quitadas)`);
}
run('scripts/archivos-modelos.mjs');
