// Tarjetas Save The Date de cada modelo (ronda 25): los diseños están en scripts/conversion/tarjetas/<id>.json
// ({ fuentes, eventos: { boda, 15, base } }) y este script los pone en modelo.json:
//   · el del primer evento del modelo va en tarjetas.std.tarjeta
//   · los demás en porEvento[evento].tarjetas.std.tarjeta (conEvento los mezcla)
//   · los eventos sin diseño propio (cumple, bautismo, comunión, infantil, baby shower) usan el de 15 (o "base"),
//     sin los adornos que son solo de quince (corona, tiara) y con la frase del evento en vez de "Mis quince años"
// Lo demás de "tarjetas" (agradecimiento, fuentes propias) se conserva. Uso: node scripts/conversion/armar-tarjetas.mjs [id…]
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const APP = join(AQUI, '..', '..');
const SOLO_QUINCE = /icono-15|adorno-15|corona/;

// Un diseño de 15 para otro evento: fuera las capas de quince y el texto "15" pasa a {quince} (vacío fuera de 15)
function adaptar(d) {
  const x = structuredClone(d);
  x.capas = (x.capas || []).filter((c) => !SOLO_QUINCE.test(c.img) || c.img.includes('fondo'));
  for (const t of x.textos) {
    if (t.plantilla) t.texto = t.plantilla;
    if (t.texto === '15') t.texto = '{quince}';
  }
  return limpiar(x);
}
// La plantilla queda solo para adaptar: en el diseño final va el texto
const limpiar = (d) => ({ ...d, textos: d.textos.map(({ plantilla, ...t }) => t) });

export function armarTarjetas(id) {
  const fTarj = join(AQUI, 'tarjetas', `${id}.json`);
  const fModelo = join(APP, 'public', 'modelos', id, 'modelo.json');
  if (!existsSync(fTarj) || !existsSync(fModelo)) return false;
  const { fuentes, eventos: dis } = JSON.parse(readFileSync(fTarj, 'utf8'));
  const m = JSON.parse(readFileSync(fModelo, 'utf8'));
  const eventos = m.eventos || [];
  const disenoDe = (ev) => (dis[ev] ? limpiar(dis[ev]) : dis['15'] ? adaptar(dis['15']) : dis.base ? adaptar(dis.base) : dis.boda ? adaptar(dis.boda) : null);
  const [base, ...otros] = eventos;
  m.tarjetas = { ...(m.tarjetas || {}), fuentes, std: { ...(m.tarjetas?.std || {}), tarjeta: disenoDe(base) } };
  m.porEvento ??= {};
  for (const ev of otros) {
    const d = disenoDe(ev);
    if (!d) continue;
    const pe = (m.porEvento[ev] ??= {});
    pe.tarjetas = { ...(pe.tarjetas || {}), std: { ...(pe.tarjetas?.std || {}), tarjeta: d } };
  }
  writeFileSync(fModelo, JSON.stringify(m, null, 2) + '\n');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(join(AQUI, 'tarjetas')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  for (const id of ids) console.log(`${id}: ${armarTarjetas(id) ? 'tarjetas listas' : 'sin diseño'}`);
}
