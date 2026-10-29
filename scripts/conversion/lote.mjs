// Convierte en lote todos los modelos (boda, 15 y cumpleaños de cada familia) y arma su modelo.json,
// tema.css y estilo.css. Uso: REPO_VIEJO=../amoinvitar-v2.0 node scripts/conversion/lote.mjs [id …]
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const APP = fileURLToPath(new URL('../..', import.meta.url));
const run = (...a) => execFileSync('node', a, { cwd: APP, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', env: process.env });

// id: [nombre, { evento: carpeta de demo/ }]
export const FAMILIAS = {
  aquarella: ['Aquarella', { boda: 'aquarella', 15: 'aquarella15', cumple: 'cumple-aquarella', bautismo: '../nuevos-bautismo/aquarella', comunion: '../nuevos-comunion/aquarella' }],
  armonia: ['Armonía', { boda: 'armonia', 15: 'armonia15', cumple: 'cumple-armonia', bautismo: '../nuevos-bautismo/armonia', comunion: '../nuevos-comunion/armonia' }],
  beach: ['Beach', { boda: 'beach', 15: 'beach15', cumple: 'cumple-beach' }],
  black: ['Black', { boda: 'black', 15: 'black15', cumple: 'cumple-black', bautismo: '../nuevos-bautismo/black', comunion: '../nuevos-comunion/black' }],
  byn: ['B&N', { boda: 'byn', 15: 'byn15', cumple: 'cumple-byn', bautismo: '../nuevos-bautismo/byn', comunion: '../nuevos-comunion/byn' }],
  cinema: ['Cinema', { boda: 'cinema', 15: 'cinema15', cumple: 'cumple-cinema', bautismo: '../nuevos-bautismo/cinema', comunion: '../nuevos-comunion/cinema' }],
  disco: ['Discoteque', { boda: 'disco', 15: 'disco15', cumple: 'cumple-discoteque', graduacion: 'graduacion-nuevo:egreso-discoteque_proyecto-{p}---NUEVO' }],
  euforia: ['Euforia', { boda: 'euforia', 15: 'euforia15', cumple: 'cumple-euforia', bautismo: '../nuevos-bautismo/euforia', comunion: '../nuevos-comunion/euforia' }],
  floral: ['Floral', { boda: 'floral', 15: 'floral15', cumple: 'cumple-floral', bautismo: '../nuevos-bautismo/floral', comunion: '../nuevos-comunion/floral' }],
  graffiti: ['Graffiti', { boda: 'graffiti', 15: 'graffiti15', cumple: 'cumple-graffiti' }],
  hojas: ['Hojas', { boda: 'hojas', 15: 'hojas15', cumple: 'cumple-hojas', bautismo: '../nuevos-bautismo/hojas', comunion: '../nuevos-comunion/hojas' }],
  lila: ['Lila', { boda: 'lila', 15: 'lila15', cumple: 'cumple-lila', bautismo: '../nuevos-bautismo/lila', comunion: '../nuevos-comunion/lila' }],
  minimal: ['Minimal', { boda: 'minimal', 15: 'minimal15', cumple: 'cumple-minimal', bautismo: '../nuevos-bautismo/minimal', comunion: '../nuevos-comunion/minimal' }],
  passion: ['Passion', { boda: 'passion', 15: 'passion15', cumple: 'cumple-passion', bautismo: '../nuevos-bautismo/passion', comunion: '../nuevos-comunion/passion' }],
  rockabilly: ['Rockabilly', { boda: 'rockabilly', 15: 'rockabilly15', cumple: 'cumple-rockabilly' }],
  romantic: ['Romantic', { boda: 'romantic', 15: 'romantic15', cumple: 'cumple-romantic', bautismo: '../nuevos-bautismo/romantic', comunion: '../nuevos-comunion/romantic' }],
  rouge: ['Rouge', { boda: 'rouge', 15: 'rouge15', cumple: 'cumple-rouge' }],
  sky: ['Sky', { boda: 'sky', 15: 'sky15', cumple: 'cumple-sky', bautismo: '../nuevos-bautismo/sky', comunion: '../nuevos-comunion/sky' }],
  travel: ['Travel', { boda: 'travel', 15: 'travel15', cumple: 'cumple-travel', bautismo: '../nuevos-bautismo/travel', comunion: '../nuevos-comunion/travel' }],
  white: ['White', { boda: 'white', 15: 'white15', cumple: 'cumple-white', bautismo: '../nuevos-bautismo/white', comunion: '../nuevos-comunion/white' }],
  luxury: ['Luxury', { 15: 'luxury15', cumple: 'cumple-luxury', bautismo: '../nuevos-bautismo/luxury', comunion: '../nuevos-comunion/luxury' }],
  style: ['Style', { 15: 'style15', cumple: 'cumple-style', bautismo: '../nuevos-bautismo/style', comunion: '../nuevos-comunion/style' }],
  sweet: ['Sweet', { 15: 'sweet15', cumple: 'cumple-sweet', bautismo: '../nuevos-bautismo/sweet', comunion: '../nuevos-comunion/sweet' }],
  natural: ['Natural', { 15: 'natural15', cumple: 'cumple-natural', bautismo: '../nuevos-bautismo/natural', comunion: '../nuevos-comunion/natural' }],
  party: ['Party', { 15: 'party15' }],
  elegance: ['Elegance', { boda: 'elegance' }],
  vintage: ['Vintage', { boda: 'vintage' }],
  oliva: ['Oliva', { boda: 'oliva' }],
  lovestory: ['Love Story', { boda: 'lovestory' }],
  // Carpetas con varios diseños: "carpeta:patrón" (ver convertir-modelo.mjs)
  garden: ['Garden', { 15: 'eucalipto15', cumple: 'cumple-eucalipto', bautismo: 'bautismo-nuevo:garden', comunion: 'comunion-nuevo:garden_proyecto-{p}---NUEVO' }],
  amanecer: ['Amanecer', { bautismo: 'bautismo-nuevo:amanecer', comunion: 'comunion-nuevo:amanecer_proyecto-{p}---NUEVO' }],
  celeste: ['Celeste', { bautismo: 'bautismo-nuevo:celeste', babyshower: 'baby-shower-nuevo:celeste_proyecto-{p}---NUEVO' }],
  rosa: ['Rosa', { bautismo: 'bautismo-nuevo:rosa', babyshower: 'baby-shower-nuevo:rosa_proyecto-{p}---NUEVO' }],
  revelacion: ['Revelación', { revelacion: 'baby-shower-nuevo:revelacion_proyecto-{p}---NUEVO' }],
  esmeralda: ['Esmeralda', { graduacion: 'graduacion-nuevo:egreso-esmeralda_proyecto-{p}---NUEVO' }],
  estilo: ['Estilo', { graduacion: 'graduacion-nuevo:estilo_proyecto-{p}---NUEVO' }],
  marino: ['Marino', { graduacion: 'graduacion-nuevo:marino_proyecto-{p}---NUEVO' }],
  oro: ['Oro', { graduacion: 'graduacion-nuevo:oro_proyecto-{p}---NUEVO' }],
  cars: ['Cars', { infantil: 'infantil-cars:index_proyecto-{p}---NUEVO' }],
  monster: ['Monster', { infantil: 'infantil-monster:index_proyecto-{p}---NUEVO' }],
  peppa: ['Peppa', { infantil: 'infantil-peppa:index_proyecto-{p}---NUEVO' }],
  navidad: ['Navidad', { navidad: 'navidad:index_proyecto-{p}---NUEVO' }],
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FAMILIAS);
  for (const id of ids) {
    const [nombre, eventos] = FAMILIAS[id];
    let salida = '';
    for (const [ev, carpeta] of Object.entries(eventos)) {
      try { salida += run('scripts/conversion/convertir-modelo.mjs', id, ev, ...carpeta.split(':')); } catch (e) { salida += `ERROR ${id}/${ev}: ${e.stderr || e.message}\n`; }
    }
    try {
      salida += run('scripts/conversion/armar-modelo.mjs', id, nombre); salida += run('scripts/convertir-estilos.mjs', id);
      // Fotos de muestra desenfocadas para la vista previa del panel (README: modelo.json → demoBorrosas)
      execFileSync('python3', ['scripts/fotos-borrosas.py', id], { cwd: APP, stdio: 'ignore' });
    } catch (e) { salida += `ERROR armar ${id}: ${e.stderr || e.message}\n`; }
    const avisos = salida.split('\n').filter((l) => /⚠|ERROR|Faltan/.test(l) && !/itinerario: sin #timeline|música: sin <audio|perdiste: se agregó|sin foto de la demo/.test(l));
    console.log(`${id}: ${Object.keys(eventos).join(', ')}${avisos.length ? '\n  ' + [...new Set(avisos.map((x) => x.trim()))].join('\n  ') : ''}`);
  }
}
