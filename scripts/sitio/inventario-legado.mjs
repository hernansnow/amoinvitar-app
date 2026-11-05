// README (ronda 30) · Etapa 2: revisa la carpeta del sitio viejo antes de subirla al bucket LEGADO.
//   node scripts/sitio/inventario-legado.mjs ../amoinvitar-v2.0
// Informa: cantidad y peso, lo que no se sube (PHP, PSD, ocultos…), archivos de más de 25 MB, rutas que chocan con
// la app (el Worker las atiende primero) y los PHP que el Worker reemplaza o que quedan sin reemplazo.
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const raiz = process.argv[2];
if (!raiz) { console.error('Uso: node scripts/sitio/inventario-legado.mjs <carpeta del sitio viejo>'); process.exit(1); }
const PROHIBIDO = /(^|\/)\.|\.(php|psd|ai|sql|sh|env|bak|zip|rar)$|(^|\/)apps-script\//i;
const RESERVADAS = /^(api|panel|tienda|modelos|comun|mi-cuenta|entrar|ayuda|auth|media|std|vista|acceso|mesa|puerta|factura|admin)\//;
const REEMPLAZADOS = /(a-musica|lista-canciones)\.php$|(^|\/)email\/mailer[a-z0-9-]*\.php$/i;
const todos = [];
(function recorrer(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (n === '.git' || n === 'node_modules') continue;
    const s = statSync(p);
    if (s.isDirectory()) recorrer(p); else todos.push({ k: relative(raiz, p).split('\\').join('/'), b: s.size });
  }
})(raiz);
const subir = todos.filter((f) => !PROHIBIDO.test(f.k));
const fuera = todos.filter((f) => PROHIBIDO.test(f.k));
const grandes = subir.filter((f) => f.b > 25 * 1024 * 1024);
const choques = subir.filter((f) => RESERVADAS.test(f.k));
const php = todos.filter((f) => /\.php$/i.test(f.k));
const mb = (b) => `${(b / 1048576).toFixed(1)} MB`;
console.log(`Archivos: ${todos.length} (${mb(todos.reduce((t, f) => t + f.b, 0))})`);
console.log(`Se suben: ${subir.length} (${mb(subir.reduce((t, f) => t + f.b, 0))})`);
console.log(`No se suben: ${fuera.length} (PHP, PSD, ocultos, apps-script…)`);
console.log(`\nMás de 25 MB (se suben a R2 igual; revisar si hace falta que sean públicos): ${grandes.length}`);
grandes.forEach((f) => console.log(`  ${mb(f.b).padStart(9)}  ${f.k}`));
console.log(`\nChocan con rutas de la app (la app va primero; mover o redirigir): ${choques.length}`);
[...new Set(choques.map((f) => f.k.split('/')[0]))].forEach((d) => console.log(`  /${d}/  (${choques.filter((f) => f.k.startsWith(d + '/')).length} archivos)`));
console.log(`\nPHP: ${php.length}`);
console.log(`  Reemplazados por el Worker: ${php.filter((f) => REEMPLAZADOS.test(f.k)).length} (a-musica, lista-canciones, mailer*)`);
const sin = php.filter((f) => !REEMPLAZADOS.test(f.k) && !/phpmailer|PHPMailer|language\//i.test(f.k));
console.log(`  Sin reemplazo (revisar a mano): ${sin.length}`);
sin.forEach((f) => console.log(`    ${f.k}`));
