// README (ronda 48) · Mudanza de amoinvitar.com al Worker nuevo (y vuelta atrás), con las rutas de la zona en Cloudflare.
//   node scripts/mudanza.mjs estado      → muestra las rutas de la zona amoinvitar.com (no cambia nada)
//   node scripts/mudanza.mjs mudar       → quita las 26 rutas de los workers viejos de redirección por país y pone
//                                          amoinvitar.com/*, www.amoinvitar.com/* y panel.amoinvitar.com/* → amoinvitar-app
//   node scripts/mudanza.mjs volver      → lo contrario: quita las rutas nuevas y repone las viejas
//                                          (docs/rutas-workers-viejos.json). Todo vuelve a salir de Hostinger como antes.
// Necesita CLOUDFLARE_API_TOKEN con permiso «Workers Routes: Edit» en la zona amoinvitar.com.
// Los registros DNS no se tocan: siguen apuntando a Hostinger (con proxy). Por eso volver atrás es inmediato.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ZONA = '370fe8158060c1d09698324e142abfdb';
const WORKER = 'amoinvitar-app';
const NUEVAS = ['amoinvitar.com/*', 'www.amoinvitar.com/*', 'panel.amoinvitar.com/*'];
const VIEJAS = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../docs/rutas-workers-viejos.json'), 'utf8'));
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!TOKEN) { console.error('Falta CLOUDFLARE_API_TOKEN'); process.exit(1); }

async function api(metodo, ruta, cuerpo) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONA}/workers/routes${ruta}`, {
    method: metodo, headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const j = await r.json();
  if (!j.success) throw new Error(`${metodo} ${ruta}: ${JSON.stringify(j.errors)}`);
  return j.result;
}
const listar = () => api('GET', '');
const quitar = async (lista) => { for (const x of lista) { await api('DELETE', `/${x.id}`); console.log('  quitada', x.pattern, '→', x.script || '(sin worker)'); } };
const poner = async (lista) => {
  const hay = new Set((await listar()).map((x) => x.pattern));
  for (const x of lista) {
    if (hay.has(x.pattern)) { console.log('  ya estaba', x.pattern); continue; }
    await api('POST', '', x.script ? { pattern: x.pattern, script: x.script } : { pattern: x.pattern });
    console.log('  puesta', x.pattern, '→', x.script || '(sin worker)');
  }
};

const accion = process.argv[2] || 'estado';
const actuales = await listar();
if (accion === 'estado') {
  for (const x of actuales) console.log(x.pattern.padEnd(42), x.script || '(sin worker)');
} else if (accion === 'mudar') {
  const viejas = new Set(VIEJAS.map((x) => x.pattern));
  console.log('Quitando las rutas viejas…');
  await quitar(actuales.filter((x) => viejas.has(x.pattern)));
  console.log('Poniendo las rutas nuevas…');
  await poner(NUEVAS.map((pattern) => ({ pattern, script: WORKER })));
  console.log('Listo. amoinvitar.com ya lo atiende el Worker nuevo.');
} else if (accion === 'volver') {
  console.log('Quitando las rutas nuevas…');
  await quitar(actuales.filter((x) => NUEVAS.includes(x.pattern)));
  console.log('Reponiendo las rutas viejas…');
  await poner(VIEJAS);
  console.log('Listo. amoinvitar.com vuelve a salir de Hostinger como antes.');
} else console.log('Uso: node scripts/mudanza.mjs estado | mudar | volver');
