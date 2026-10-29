// Convierte en lote todos los modelos (boda, 15 y cumpleaños de cada familia) y arma su modelo.json,
// tema.css y estilo.css. Uso: REPO_VIEJO=../amoinvitar-v2.0 node scripts/conversion/lote.mjs [id …]
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const APP = fileURLToPath(new URL('../..', import.meta.url));
const run = (...a) => execFileSync('node', a, { cwd: APP, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', env: process.env });

// id: [nombre, { evento: carpeta de demo/ }]
export const FAMILIAS = {
  aquarella: ['Aquarella', { boda: 'aquarella', 15: 'aquarella15', cumple: 'cumple-aquarella' }],
  armonia: ['Armonía', { boda: 'armonia', 15: 'armonia15', cumple: 'cumple-armonia' }],
  beach: ['Beach', { boda: 'beach', 15: 'beach15', cumple: 'cumple-beach' }],
  black: ['Black', { boda: 'black', 15: 'black15', cumple: 'cumple-black' }],
  byn: ['B&N', { boda: 'byn', 15: 'byn15', cumple: 'cumple-byn' }],
  cinema: ['Cinema', { boda: 'cinema', 15: 'cinema15', cumple: 'cumple-cinema' }],
  disco: ['Discoteque', { boda: 'disco', 15: 'disco15', cumple: 'cumple-discoteque' }],
  euforia: ['Euforia', { boda: 'euforia', 15: 'euforia15', cumple: 'cumple-euforia' }],
  floral: ['Floral', { boda: 'floral', 15: 'floral15', cumple: 'cumple-floral' }],
  graffiti: ['Graffiti', { boda: 'graffiti', 15: 'graffiti15', cumple: 'cumple-graffiti' }],
  hojas: ['Hojas', { boda: 'hojas', 15: 'hojas15', cumple: 'cumple-hojas' }],
  lila: ['Lila', { boda: 'lila', 15: 'lila15', cumple: 'cumple-lila' }],
  minimal: ['Minimal', { boda: 'minimal', 15: 'minimal15', cumple: 'cumple-minimal' }],
  passion: ['Passion', { boda: 'passion', 15: 'passion15', cumple: 'cumple-passion' }],
  rockabilly: ['Rockabilly', { boda: 'rockabilly', 15: 'rockabilly15', cumple: 'cumple-rockabilly' }],
  romantic: ['Romantic', { boda: 'romantic', 15: 'romantic15', cumple: 'cumple-romantic' }],
  rouge: ['Rouge', { boda: 'rouge', 15: 'rouge15', cumple: 'cumple-rouge' }],
  sky: ['Sky', { boda: 'sky', 15: 'sky15', cumple: 'cumple-sky' }],
  travel: ['Travel', { boda: 'travel', 15: 'travel15', cumple: 'cumple-travel' }],
  white: ['White', { boda: 'white', 15: 'white15', cumple: 'cumple-white' }],
  luxury: ['Luxury', { 15: 'luxury15', cumple: 'cumple-luxury' }],
  style: ['Style', { 15: 'style15', cumple: 'cumple-style' }],
  sweet: ['Sweet', { 15: 'sweet15', cumple: 'cumple-sweet' }],
  natural: ['Natural', { 15: 'natural15', cumple: 'cumple-natural' }],
  party: ['Party', { 15: 'party15' }],
  elegance: ['Elegance', { boda: 'elegance' }],
  vintage: ['Vintage', { boda: 'vintage' }],
  oliva: ['Oliva', { boda: 'oliva' }],
  lovestory: ['Love Story', { boda: 'lovestory' }],
  // Carpetas con varios diseños: "carpeta:patrón" (ver convertir-modelo.mjs)
  garden: ['Garden', { 15: 'eucalipto15', cumple: 'cumple-eucalipto', bautismo: 'bautismo-nuevo:garden', comunion: 'comunion-nuevo:garden_proyecto-{p}---NUEVO' }],
  amanecer: ['Amanecer', { bautismo: 'bautismo-nuevo:amanecer', comunion: 'comunion-nuevo:amanecer_proyecto-{p}---NUEVO' }],
  celeste: ['Celeste', { bautismo: 'bautismo-nuevo:celeste' }],
  rosa: ['Rosa', { bautismo: 'bautismo-nuevo:rosa' }],
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FAMILIAS);
  for (const id of ids) {
    const [nombre, eventos] = FAMILIAS[id];
    let salida = '';
    for (const [ev, carpeta] of Object.entries(eventos)) {
      try { salida += run('scripts/conversion/convertir-modelo.mjs', id, ev, ...carpeta.split(':')); } catch (e) { salida += `ERROR ${id}/${ev}: ${e.stderr || e.message}\n`; }
    }
    try { salida += run('scripts/conversion/armar-modelo.mjs', id, nombre); salida += run('scripts/convertir-estilos.mjs', id); } catch (e) { salida += `ERROR armar ${id}: ${e.stderr || e.message}\n`; }
    const avisos = salida.split('\n').filter((l) => /⚠|ERROR|Faltan/.test(l) && !/itinerario: sin #timeline|música: sin <audio|perdiste: se agregó|sin foto de la demo/.test(l));
    console.log(`${id}: ${Object.keys(eventos).join(', ')}${avisos.length ? '\n  ' + [...new Set(avisos.map((x) => x.trim()))].join('\n  ') : ''}`);
  }
}
