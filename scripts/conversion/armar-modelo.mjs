// Arma modelo.json y tema.css de un modelo convertido (después de convertir-modelo.mjs, que deja
// conversion.json con lo que encontró en cada evento). Lo que ya esté en modelo.json y no se calcule
// acá (tarjetas, ajustes a mano) se conserva. Uso:
//   REPO_VIEJO=../amoinvitar-v2.0 node scripts/conversion/armar-modelo.mjs <id> [Nombre]
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const REPO = resolve(process.env.REPO_VIEJO || join(APP, '../amoinvitar-v2.0'));
const [id, nombreArg] = process.argv.slice(2);
const carpeta = join(APP, 'public/modelos', id);
const conv = JSON.parse(await readFile(join(carpeta, 'conversion.json'), 'utf8'));
const previo = JSON.parse(await readFile(join(carpeta, 'modelo.json'), 'utf8').catch(() => '{}'));
const snow = await readFile(join(REPO, 'css/snow_v3.6.css'), 'utf8').catch(() => '') + await readFile(join(REPO, 'css/estilo-savethedate_v2.5.css'), 'utf8').catch(() => '');

const ORDEN = ['boda', '15', 'cumple', 'bautismo', 'comunion', 'graduacion', 'infantil', 'babyshower', 'navidad'];
const eventos = Object.keys(conv).sort((a, b) => ORDEN.indexOf(a) - ORDEN.indexOf(b));
// Modelo hecho a mano (Garden): sus eventos convertidos se suman en porEvento sin tocar lo demás
const agregar = !!previo.id && !conv.boda && (previo.eventos || []).includes('boda');
const base = agregar ? 'boda' : eventos.includes('boda') ? 'boda' : eventos[0];
const ev0 = agregar ? eventos[0] : base;

// Lo de cada sección según el paquete (Basic → Premium → Deluxe), con lo que el diseño trae
const PAQ = {
  basic: ['galeria', 'rsvp', 'dresscode'],
  premium: ['musica', 'historia', 'galeria', 'rsvp', 'dresscode', 'instagram', 'canciones', 'regalos'],
  deluxe: ['musica', 'historia', 'galeria', 'rsvp', 'dresscode', 'estilos', 'hospedaje', 'bus', 'itinerario', 'testigos', 'instagram', 'album', 'canciones', 'playlist', 'regalos', 'redes'],
};
function paquetes(ev) {
  const p = conv[ev].paquetes;
  const tiene = (paq, s) => s === 'musica' || (p[paq]?.secciones || p.deluxe.secciones).includes(s);
  // Sin foto de portada en el diseño (Armonía, Beach, Black…): 0, y el panel no muestra la opción
  const fotosPortada = (paq) => (p.deluxe.info.portadaFotos === 0 ? 0 : Math.max(1, p[paq]?.info?.portadaFotos || p.deluxe.info.portadaFotos || 1));
  return {
    basic: { secciones: PAQ.basic.filter((s) => tiene('basic', s)), incluye: { sobre: false, musica: false, cuenta: false, fotosPortada: fotosPortada('basic'), fotosGaleria: 20 } },
    premium: { secciones: PAQ.premium.filter((s) => tiene('premium', s)), incluye: { sobre: true, musica: true, cuenta: true, fotosPortada: fotosPortada('premium'), fotosGaleria: 20 } },
    deluxe: { secciones: PAQ.deluxe.filter((s) => tiene('deluxe', s)), incluye: { sobre: true, musica: true, cuenta: true, fotosPortada: fotosPortada('deluxe'), fotosGaleria: 20, sugerenciasDress: true } },
  };
}

// Los nombres como los escribe el diseño: "Romi <i class=…></i> Gaby" → "{a} <i class=…></i> {b}"
function nombresHTML(html, plural) {
  if (!html) return null;
  if (!plural) return '{a}';
  // Los nombres de la demo (la primera y la última palabra) se cambian por {a} y {b}; el resto del diseño queda
  const texto = html.replace(/<[^>]*>/g, ' ').replace(/&amp;|&nbsp;/g, ' ').replace(/[&+♥]/g, ' ').trim();
  const palabras = texto.split(/\s+/).filter((w) => w && !/^(y|e)$/i.test(w));
  if (palabras.length < 2) return '{a} &amp; {b}';
  const a = palabras[0], b = palabras.at(-1);
  const ia = html.indexOf(a), ib = html.lastIndexOf(b);
  if (ia < 0 || ib < 0 || ib <= ia) return '{a} &amp; {b}';
  return (html.slice(0, ia) + '{a}' + html.slice(ia + a.length, ib) + '{b}' + html.slice(ib + b.length)).replace(/\s+/g, ' ').trim();
}

async function original(ev) {
  return readFile(join(REPO, 'demo', conv[ev].carpeta, conv[ev].archivo || 'index.html'), 'utf8').catch(() => '');
}
function colorDeClase(k) {
  const m = snow.match(new RegExp(`\\.${k.replace(/[-]/g, '\\-')}\\s*\\{[^}]*?color\\s*:\\s*(#[0-9a-fA-F]{3,6})`));
  return m?.[1] || null;
}
async function datosEvento(ev) {
  const html = await original(ev);
  const sobre = html.match(/id="sobre"[^>]*style="([^"]*)"/)?.[1] || '';
  const colores = {};
  for (const [, k, v] of sobre.matchAll(/--sobre-(\w+)\s*:\s*([^;]+);?/g)) colores[k] = v.trim();
  const bienvenida = html.match(/class="sobre__bienvenida"[^>]*style="([^"]*)"/)?.[1] || '';
  const info = conv[ev].paquetes.deluxe.info;
  // Color principal: el de los títulos (text-xxx de los h2)
  const textos = [...html.matchAll(/<h2[^>]*class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((k) => /^text-/.test(k) && !/^text-(center|left|right|white|black|uppercase|small)/.test(k));
  const masUsada = textos.sort((a, b) => textos.filter((x) => x === b).length - textos.filter((x) => x === a).length)[0];
  const principal = (masUsada && colorDeClase(masUsada)) || colores.lacre || '#a78977';
  // Fondos de las secciones (los background-color de los estilos en línea)
  const fondos = [...html.matchAll(/background-color:\s*(#[0-9a-fA-F]{6})/g)].map((m) => m[1].toLowerCase()).filter((x) => !/^#(fff|ffffff|000000)$/.test(x));
  const cuenta = {}; for (const f of fondos) cuenta[f] = (cuenta[f] || 0) + 1;
  const top = Object.keys(cuenta).sort((a, b) => cuenta[b] - cuenta[a]);
  const paleta = [principal.toLowerCase(), ...top.filter((x) => x !== principal.toLowerCase())].slice(0, 3);
  while (paleta.length < 3) paleta.push(paleta.at(-1) || '#cccccc');
  paleta.push('#ffffff');
  // Fondo de la portada (para la miniatura y la portada sin foto)
  const home = html.slice(html.indexOf('id="home-section"'), html.indexOf('</section>', html.indexOf('id="home-section"')));
  const fondoPortada = [...home.matchAll(/url\((['"]?)\.\.\/\.\.\/img\/([^'")]+)\1\)/g)].map((m) => m[2])[0];
  return { colores, bienvenida, info, principal, paleta, fondoPortada };
}

// Fuentes: la de los títulos (la clase de los h2) y la del texto
async function fuentes(ev) {
  const info = conv[ev].paquetes.deluxe.info;
  const clase = info.claseTitulos;
  let titulos = null;
  if (clase) {
    const m = snow.match(new RegExp(`\\.${clase}\\s*\\{[^}]*?font-family\\s*:\\s*([^;}]+)`));
    titulos = m?.[1]?.trim() || null;
  }
  return { titulos: titulos || "'Great Vibes', cursive", texto: "'Jost', sans-serif", css: info.fuentes || [] };
}


// Medidas de un JPG (para la proporción de la foto de historia)
async function medidasJpg(f) {
  const b = await readFile(f).catch(() => null);
  if (!b) return null;
  for (let i = 2; i < b.length - 9;) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1], l = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xc3) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + l;
  }
  return null;
}
const proporcionTexto = (w, h) => { const r = w / h; const opciones = [['1:1', 1], ['4:5', 0.8], ['3:4', 0.75], ['2:3', 2 / 3], ['4:3', 4 / 3], ['3:2', 1.5], ['16:9', 16 / 9]]; return opciones.sort((a, b) => Math.abs(a[1] - r) - Math.abs(b[1] - r))[0][0]; };
async function propHistoria(ev) {
  const info = conv[ev].paquetes.deluxe.info.fotoHistoria;
  if (!info) return null;
  if (info !== 'demo') return info;
  const m = await medidasJpg(join(carpeta, 'demo', ev, 'inicial.jpg'));
  return m ? proporcionTexto(m.w, m.h) : '4:5';
}

// Los textos de muestra del propio diseño (historia y despedida), en castellano: se usan si el cliente no escribe los suyos
const textosDemo = (ev) => {
  const i = conv[ev]?.paquetes?.deluxe?.info || {};
  const o = {};
  if (i.textoHistoria && i.textoHistoria.length > 40) o['historia.texto'] = i.textoHistoria;
  if (i.textoPie && i.textoPie.length > 40) o['pie.texto'] = i.textoPie;
  return Object.keys(o).length ? o : null;
};
const nombre = nombreArg || previo.nombre || id.charAt(0).toUpperCase() + id.slice(1);
const d0 = await datosEvento(ev0);
const f0 = await fuentes(ev0);
const modelo = {
  id, nombre,
  ...(previo.nombres ? { nombres: previo.nombres } : {}),
  eventos,
  gratis: previo.gratis ?? false,
  paleta: d0.paleta,
  galeria: { byn: ['byn', 'romantic'].includes(id), enRsvp: !!conv[ev0].paquetes.deluxe.info.galeriaEnRsvp, ...(conv[ev0].paquetes.deluxe.info.galeriaFija ? { fija: true } : {}) },
  // Video de portada del cliente: los diseños con video (Cinema) y los de foto a pantalla completa; Disco no (su video es parte del diseño)
  videoPortada: id !== 'disco' && !!(conv[ev0].paquetes.deluxe.info.videoPortada || conv[ev0].paquetes.deluxe.info.fondoCompleto),
  portadaSinFoto: id === 'travel' ? 'img/portada-avion.jpg' : d0.fondoPortada ? `img/${basename(d0.fondoPortada)}` : previo.portadaSinFoto,
  // Sin foto de portada va un color liso; Travel tiene su imagen (el avión)
  ...(id === 'travel' ? { portadaSinFotoImagen: true } : {}),
  // Textos que el diseño escribe en minúsculas (Romantic: el botón de confirmar)
  ...(id === 'romantic' ? { textosCaso: { 'rsvp.botonHtml': 'oracion', 'rsvp.cerradoHtml': 'oracion' } } : {}),
  paquetes: paquetes(ev0),
  ...(conv[ev0].paquetes.deluxe.info.ciudadPortada ? { ciudadPortada: true } : {}),
  // Portada en sepia (Minimal): el cliente puede ponerla en color
  ...(id === 'minimal' ? { sepiaPortada: true } : {}),
  // Sin foto en la confirmación del diseño (Black, Lila, White): el panel no la ofrece
  ...(conv[ev0].paquetes.deluxe.info.rsvpConFoto === false ? { sinFotoRsvp: true } : {}),
  ...(textosDemo(ev0) ? { textosDemo: textosDemo(ev0) } : {}),
  ...(await propHistoria(ev0) ? { fotoHistoria: await propHistoria(ev0) } : {}),
  proporciones: { ...(conv[ev0].paquetes.deluxe.info.propLugar ? { lugar: conv[ev0].paquetes.deluxe.info.propLugar } : {}), ...(conv[ev0].paquetes.deluxe.info.portadaRedonda ? { portada: '1:1' } : {}) },
  nombresHTML: {
    portada: nombresHTML(conv[ev0].paquetes.deluxe.info.nombresPortada, ev0 === 'boda') || '{a} &amp; {b}',
    cierre: nombresHTML(conv[ev0].paquetes.deluxe.info.nombresCierre || conv[ev0].paquetes.deluxe.info.nombresPortada, ev0 === 'boda') || '{a} &amp; {b}',
    solo: '{a}',
  },
  miniatura: {
    fondo: d0.fondoPortada ? `/modelos/${id}/img/${basename(d0.fondoPortada)}` : null,
    colorFondo: d0.paleta[1], colorTitulos: d0.principal,
    fuenteTitulos: f0.titulos.split(',')[0].replace(/['"]/g, '').trim(), fuenteTexto: f0.texto.split(',')[0].replace(/['"]/g, '').trim(),
  },
  sobre: { colores: Object.keys(d0.colores).length ? d0.colores : { lacre: d0.principal }, ...(d0.bienvenida ? { bienvenida: d0.bienvenida } : {}) },
  ...(previo.tarjetas ? { tarjetas: previo.tarjetas } : {}),
  demo: previo.demo || {},
  ...(previo.demoBorrosas ? { demoBorrosas: previo.demoBorrosas } : {}),
  porEvento: {},
};
if (f0.css[0]) modelo.acceso = { css: [...f0.css.map((u) => u.replace(/^\.\.\/\.\.\//, '/')), `/modelos/${id}/tema.css`] };
for (const ev of eventos) {
  if (ev === base) continue;
  const d = await datosEvento(ev);
  const pl = ev === 'boda';
  modelo.porEvento[ev] = {
    paquetes: paquetes(ev),
    ...(textosDemo(ev) ? { textosDemo: textosDemo(ev) } : {}),
    sinFotoRsvp: conv[ev].paquetes.deluxe.info.rsvpConFoto === false,
    ...(await propHistoria(ev) ? { fotoHistoria: await propHistoria(ev) } : {}),
    proporciones: { ...(conv[ev].paquetes.deluxe.info.propLugar ? { lugar: conv[ev].paquetes.deluxe.info.propLugar } : {}), ...(conv[ev].paquetes.deluxe.info.portadaRedonda ? { portada: '1:1' } : {}) },
    videoPortada: id !== 'disco' && !!(conv[ev].paquetes.deluxe.info.videoPortada || conv[ev].paquetes.deluxe.info.fondoCompleto),
    sobre: { colores: Object.keys(d.colores).length ? d.colores : { lacre: d.principal }, ...(d.bienvenida ? { bienvenida: d.bienvenida } : {}) },
    nombresHTML: { portada: nombresHTML(conv[ev].paquetes.deluxe.info.nombresPortada, pl) || '{a}', cierre: nombresHTML(conv[ev].paquetes.deluxe.info.nombresCierre, pl) || '{a}', solo: '{a}' },
    ...(previo.porEvento?.[ev] ? Object.fromEntries(Object.entries(previo.porEvento[ev]).filter(([k]) => !['paquetes', 'sobre', 'nombresHTML', 'textosDemo', 'videoPortada', 'proporciones', 'fotoHistoria', 'sinFotoRsvp'].includes(k))) : {}),
  };
}
// Cumpleaños con fotos de un hombre: la demo lleva nombre de hombre
const HOMBRES = { byn: 'Martín', disco: 'Tomás', floral: 'Lucas', luxury: 'Joaquín', rockabilly: 'Nicolás', white: 'Mateo' };
// Y los diseños con nombre propio en la demo (el bebé de Celeste es Mateo…)
const NOMBRES_DEMO = { ...Object.fromEntries(Object.entries(HOMBRES).map(([k, v]) => [`${k}/cumple`, v])), 'celeste/bautismo': 'Mateo', 'rosa/bautismo': 'Juliana', 'celeste/babyshower': 'Mateo', 'rosa/babyshower': 'Juliana', 'disco/graduacion': 'Instituto Superior', 'esmeralda/graduacion': 'Instituto Superior', 'monster/infantil': 'Paula', 'peppa/infantil': 'Agustín' };
for (const ev of eventos) {
  const n = NOMBRES_DEMO[`${id}/${ev}`];
  if (!n) continue;
  const dm = ev === base ? modelo.demo : (modelo.porEvento[ev].demo ||= {});
  dm[ev] = { ...(dm[ev] || {}), nombres: { a: n } };
}
const POSICIONES = {
  'sky/cumple': { 'hero-banner.jpg': { posPc: '50% 4%' } },
  'sky/15': { 'hero-banner.jpg': { posPc: '50% 6%' } },
  'style/cumple': { 'hero-banner.jpg': { posPc: '50% 38%' } },
  'graffiti/cumple': { 'hero-banner.jpg': { posPc: '60% 40%' } },
};
// Fotos de la demo que hay por evento (las borrosas las arma scripts/fotos-borrosas.py)
for (const ev of eventos) {
  const fs = await readdir(join(carpeta, 'demo', ev)).catch(() => []);
  // Las mismas fotos de portada del diseño original, con su encuadre
  const propias = (conv[ev].paquetes.deluxe.info.portadas || []).filter((x) => fs.includes(x.f));
  const portada = propias.length ? propias : fs.filter((f) => /^hero-banner\d*\.|^globo\.|^inicial\./.test(f)).sort();
  // Encuadres a mano (móvil / escritorio) para las fotos nuevas de la demo
  const aMano = POSICIONES[`${id}/${ev}`] || {};
  for (const x of portada) if (typeof x === 'object' && aMano[x.f]) Object.assign(x, aMano[x.f]);
  const actual = (ev === base ? modelo.demo : (modelo.porEvento[ev].demo ||= {}));
  actual[ev] = { ...(actual[ev] || {}), ...(portada.length ? { portadas: portada } : {}) };
}
if (agregar) {
  const todos = [...new Set([...previo.eventos, ...eventos])];
  const final = { ...previo, eventos: todos, porEvento: { ...(previo.porEvento || {}), ...modelo.porEvento } };
  await writeFile(join(carpeta, 'modelo.json'), JSON.stringify(final, null, 2) + '\n');
  console.log(`${id}: eventos sumados (${eventos.join(', ')})`);
  process.exit(0);
}
await writeFile(join(carpeta, 'modelo.json'), JSON.stringify(modelo, null, 2) + '\n');

// tema.css: las variables que usan la pantalla de acceso y "Buscá tu mesa"
const tema = `/* ════════════════════════════════════════════════════════════════
   ${nombre.toUpperCase()} · paleta y tipografías (armado por scripts/conversion/armar-modelo.mjs)
   ════════════════════════════════════════════════════════════════ */
:root {
  --color-principal: ${d0.principal};
  --color-secundario: ${d0.paleta[1]};
  --color-suave: ${d0.paleta[2]};
  --color-texto: #212529;

  --fuente-titulos: ${f0.titulos};
  --fuente-texto: ${f0.texto};
}
`;
await writeFile(join(carpeta, 'tema.css'), tema);
console.log(`${id}: modelo.json y tema.css (${eventos.join(', ')})`);
