// Arma el estilo.css de un modelo a partir de las hojas compartidas de siempre:
//   1. junta las hojas que usaba la invitación vieja
//   2. PurgeCSS deja solo las reglas que el modelo (y los scripts) usan
//   3. los colores y fuentes de la paleta pasan a variables (tema.css)
//   4. las imágenes que pide el CSS se copian a la carpeta img/ del modelo
//   5. al final se suma lo propio del modelo (scripts/conversion/<modelo>.propio.css)
//
//   npm run estilos -- garden

import { PurgeCSS } from 'purgecss';
import { readFile, writeFile, copyFile, access, mkdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('..', import.meta.url));
const REPO = process.env.REPO_VIEJO || resolve(APP, '..'); // repo de siempre (css/, img/, fonts/)
const COMUN = join(APP, 'public/comun');

const HOJAS = [
  'normalize.css', 'bootstrap.min_v2.1.css', 'owl.carousel.min.css', 'owl.theme.default.min.css',
  'aos.css', 'jquery.fancybox.min.css', 'snow_v3.6.css', 'estilo-savethedate_v2.5.css', 'timeline_v2.2.css',
];

// Por modelo: qué valores de la hoja vieja pasan a variable
const MODELOS = {
  garden: {
    colores: { '#a78977': '--color-principal', '#86a388': '--color-secundario', '#9ab09c': '--color-suave' },
    fuentes: { "'Great Vibes', cursive": '--fuente-titulos', '"Great Vibes", cursive': '--fuente-titulos', '"Jost", sans-serif': '--fuente-texto', "'Jost', sans-serif": '--fuente-texto' },
  },
};

// Clases que ponen los scripts y no figuran escritas en el HTML
const SAFELIST = {
  standard: ['show', 'fade', 'active', 'in', 'collapse', 'collapsing', 'is-sticky', 'sticky-wrapper', 'scrolled', 'animated', 'modal-open', 'loaded', 'holder'],
  greedy: [/^owl-/, /^fancybox-/, /^aos/, /data-aos/, /^modal/, /^carousel/, /^atcb/, /^compensate/, /^sobre/, /^gate/, /^countdown/, /^tooltip/, /^bs-/, /^popover/, /^site-mobile/, /^offcanvas/],
};

const existe = (p) => access(p).then(() => true, () => false);

async function convertir(modelo) {
  const cfg = MODELOS[modelo];
  if (!cfg) throw new Error(`No hay configuración para "${modelo}"`);
  const carpeta = join(APP, 'public/modelos', modelo);

  const hojas = await Promise.all(HOJAS.map((h) => readFile(join(COMUN, 'css', h), 'utf8')));
  const [resultado] = await new PurgeCSS().purge({
    content: [
      // los tres diseños del modelo: Deluxe (index.html), Premium y Basic
      join(carpeta, 'index*.html'),
      join(APP, 'src/componentes/*.js'),
      join(COMUN, 'js/*.js'),
    ],
    css: [{ raw: hojas.join('\n') }],
    safelist: SAFELIST,
    fontFace: true,
    keyframes: true,
    variables: false,
  });
  let css = resultado.css;

  // Paleta y fuentes → variables
  for (const [hex, v] of Object.entries(cfg.colores)) css = css.replace(new RegExp(hex, 'gi'), `var(${v})`);
  for (const [f, v] of Object.entries(cfg.fuentes)) css = css.split(f).join(`var(${v})`);

  // url(...) relativas: las hojas vivían en /css del sitio
  await mkdir(join(carpeta, 'img'), { recursive: true });
  const copias = [];
  css = css.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, u) => {
    if (/^(data:|https?:|#)/.test(u) || u.startsWith('filters.svg')) return m;
    const limpio = u.split(/[?#]/)[0];
    const origen = resolve(REPO, 'css', limpio);
    if (/\/fonts\//.test(limpio)) {
      const rel = limpio.replace(/^.*?fonts\//, 'fonts/');
      return `url(${q}../../comun/${rel}${q})`;
    }
    copias.push([origen, join(carpeta, 'img', basename(limpio))]);
    return `url(${q}img/${basename(limpio)}${q})`;
  });
  const faltan = [];
  for (const [de, a] of copias) {
    if (await existe(a)) continue;
    if (await existe(de)) await copyFile(de, a); else faltan.push(de.replace(REPO + '/', ''));
  }

  const propio = await readFile(join(APP, 'scripts/conversion', `${modelo}.propio.css`), 'utf8').catch(() => '');
  const cabecera = `/* ${modelo.toUpperCase()} · estilo.css armado con "npm run estilos -- ${modelo}".\n   Para colores y fuentes tocá tema.css. Lo propio del modelo está al final. */\n`;
  await writeFile(join(carpeta, 'estilo.css'), cabecera + css + '\n\n' + propio);

  const antes = hojas.reduce((s, h) => s + h.length, 0);
  console.log(`${modelo}: ${(antes / 1024).toFixed(0)} KB → ${((css.length + propio.length) / 1024).toFixed(0)} KB`);
  if (faltan.length) console.log('Imágenes que no se encontraron:', [...new Set(faltan)].join(', '));
}

await convertir(process.argv[2] || 'garden');
