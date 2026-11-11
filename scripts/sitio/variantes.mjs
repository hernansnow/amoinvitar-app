// README (ronda 42) · Convierte el texto en español neutro (tú) a la variante de cada país (ver src/sitio/variantes.js).
// Solo toca el texto visible, los títulos y los atributos alt/title/placeholder/aria-label/content; nunca el código ni las
// direcciones, ni las opiniones de clientes (son citas textuales).
// convertirTexto(t, clave, { web }) — web: true en las páginas de la web (cambia «boda» por «casamiento»/«matrimonio» donde se
// dice así); en el panel y en las demos va sin web: ahí siempre se dice «boda».
// Este archivo también se copia al navegador (public/comun/js/regional.js, lo arma construir.mjs): sin import ni sintaxis rara.
import { LANG } from '../../src/sitio/variantes.js';

const mayus = (o, n) => (o[0] !== o[0].toLowerCase() ? n[0].toUpperCase() + n.slice(1) : n);
const B = (p) => `(?<![\\p{L}\\p{N}_-])(?:${p})(?![\\p{L}\\p{N}_-])`;
// La expresión de cada tabla se arma una sola vez
const CACHE_RE = new Map();
const reemplaza = (t, tabla) => {
  let re = CACHE_RE.get(tabla);
  if (!re) {
    const claves = Object.keys(tabla).sort((a, b) => b.length - a.length);
    re = new RegExp(B(claves.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')), 'giu');
    CACHE_RE.set(tabla, re);
  }
  return t.replace(re, (m) => (tabla[m.toLowerCase()] !== undefined ? mayus(m, tabla[m.toLowerCase()]) : m));
};

// tú → vos (presente: «tienes» → «tenés»; imperativos con pronombre; pronombres)
const VOS_PRESENTE = {
  abres: 'abrís', aceptas: 'aceptás', confirmas: 'confirmás', deseas: 'deseás', 'confírmanos': 'confirmanos', 'confírmame': 'confirmame', 'acompáñame': 'acompañame', 'personalízala': 'personalizala', activas: 'activás', armas: 'armás', compras: 'comprás', dedicas: 'dedicás', 'envíala': 'enviala', 'envíalo': 'envialo', 'envíanos': 'envianos', administras: 'administrás', agregas: 'agregás', apruebas: 'aprobás', bloqueas: 'bloqueás',
  borras: 'borrás', buscas: 'buscás', cambias: 'cambiás', cargas: 'cargás', compartes: 'compartís', comprometes: 'comprometés',
  consideras: 'considerás', contratas: 'contratás', controlas: 'controlás', corriges: 'corregís', creas: 'creás',
  decides: 'decidís', declaras: 'declarás', defines: 'definís', dejas: 'dejás', descargas: 'descargás', diseñas: 'diseñás',
  editas: 'editás', eliges: 'elegís', empiezas: 'empezás', encuentras: 'encontrás', entras: 'entrás', 'envías': 'enviás', escribes: 'escribís',
  evitas: 'evitás', exportas: 'exportás', facilitas: 'facilitás', gestionas: 'gestionás', guardas: 'guardás',
  haces: 'hacés', imaginas: 'imaginás', imprimes: 'imprimís', ingresas: 'ingresás', invitas: 'invitás', llevas: 'llevás', mandas: 'mandás',
  miras: 'mirás', necesitas: 'necesitás', organizas: 'organizás', pagas: 'pagás', personalizas: 'personalizás', pides: 'pedís', pierdes: 'perdés',
  pones: 'ponés', prefieres: 'preferís', preparas: 'preparás', proyectas: 'proyectás', publicas: 'publicás', quieres: 'querés',
  realizas: 'realizás', recibes: 'recibís', renuevas: 'renovás', revisas: 'revisás', sabes: 'sabés', sigues: 'seguís', subes: 'subís',
  tienes: 'tenés', tocas: 'tocás', trabajas: 'trabajás', usas: 'usás', ves: 'ves', vienes: 'venís', puedes: 'podés', eres: 'sos',
  debes: 'debés', vas: 'vas', das: 'das', estás: 'estás', 'cuéntanos': 'contanos', 'escríbenos': 'escribinos', 'pídenos': 'pedinos',
  'descárgalas': 'descargalas', 'descárgalo': 'descargalo', 'descárgala': 'descargala', 'míralas': 'miralas', 'mírala': 'mirala', 'míralo': 'miralo',
  'personalízala': 'personalizala', 'personalízalo': 'personalizalo', 'personalízalos': 'personalizalos', 'proyéctalas': 'proyectalas',
  'pruébalo': 'probalo', 'pruébala': 'probala', 'pruébalas': 'probalas', 'diséñala': 'diseñala', 'diséñalo': 'diseñalo', 'compártela': 'compartila',
  'compártelo': 'compartilo', 'cuéntame': 'contame', 'llévate': 'llevate', 'mírala': 'mirala', 'elígelo': 'elegilo', 'elígela': 'elegila',
  'crea la tuya': 'creá la tuya', 'únete': 'unite', 'olvídate': 'olvidate', 'despreocúpate': 'despreocupate', 'acompáñanos': 'acompañanos',
  'ayúdanos': 'ayudanos', 'déjanos': 'dejanos', 'avísanos': 'avisanos', 'escanéalo': 'escanealo', 'súbelas': 'subilas', 'agéndala': 'agendala',
};
// Imperativos que solo se cambian cuando empiezan una frase o un botón (si no, podrían ser la tercera persona: «el panel crea…»)
const VOS_IMPERATIVO = {
  abre: 'abrí', activa: 'activá', administra: 'administrá', agrega: 'agregá', arma: 'armá', busca: 'buscá', compara: 'compará',
  comparte: 'compartí', completa: 'completá', compra: 'comprá', corrige: 'corregí', crea: 'creá', deja: 'dejá',
  descarga: 'descargá', describe: 'describí', diseña: 'diseñá', edita: 'editá', elige: 'elegí', empieza: 'empezá', 'envía': 'enviá',
  escanea: 'escaneá', escribe: 'escribí', espera: 'esperá', exporta: 'exportá', gestiona: 'gestioná', guarda: 'guardá', haz: 'hacé',
  indica: 'indicá', ingresa: 'ingresá', invita: 'invitá', mira: 'mirá', organiza: 'organizá', paga: 'pagá', personaliza: 'personalizá',
  pide: 'pedí', pon: 'poné', prueba: 'probá', proyecta: 'proyectá', publica: 'publicá', recibe: 'recibí', revisa: 'revisá',
  selecciona: 'seleccioná', confirma: 'confirmá', reserva: 'reservá', prepara: 'prepará', mira: 'mirá', cambia: 'cambiá', encuentra: 'encontrá', entrega: 'entregá', escoge: 'escogé', pasa: 'pasá', resuelve: 'resolvé', aprovecha: 'aprovechá', comienza: 'comenzá', sigue: 'seguí', sube: 'subí', suma: 'sumá', ten: 'tené', toca: 'tocá', 
};
const RE_IMPERATIVO = new RegExp(`(^\\s*|[.!?¡¿:;,·—–(]\\s*|(?<![\\p{L}])[yo]\\s+)(${Object.keys(VOS_IMPERATIVO).join('|')})(?![\\p{L}])`, 'giu');
// Lo que no es un verbo aunque lo parezca (y los nombres de las variantes del idioma en el panel)
const VOS_ARREGLOS = { 'sin descargás': 'sin descargas', 'español neutro (vos)': 'Español neutro (tú)', 'español de españa (vos / vosotros)': 'Español de España (tú / vosotros)', 'las comprás': 'las compras', 'sus comprás': 'sus compras', 'y publicá una invitación': 'y publica una invitación', 'cambiá solo el diseño': 'cambia solo el diseño', 'organizás o fotografías': 'organizás o fotografiás' };
// README (ronda 44): frases que se escriben enteras (antes de las reglas)
const FRASE_AR = { 'pruébala gratis, mírala terminada y paga solo cuando decidas publicarla': 'Probala gratis, mirala terminada y pagá por Mercado Pago o transferencia solo cuando decidas publicarla' };
function aVos(t) {
  t = reemplaza(t, VOS_PRESENTE);
  t = t.replace(RE_IMPERATIVO, (m, a, v) => a + mayus(v, VOS_IMPERATIVO[v.toLowerCase()]));
  t = t.replace(/(?<![\p{L}])(para|a|de|por|en|sobre|sin|hasta|como|entre|que)\s+ti(?![\p{L}])/giu, (m, p) => `${p} vos`);
  t = t.replace(/(?<![\p{L}])contigo(?![\p{L}])/giu, (m) => mayus(m, 'con vos'));
  t = t.replace(/(?<![\p{L}])tú(?![\p{L}])/giu, (m) => mayus(m, 'vos'));
  return reemplaza(t, VOS_ARREGLOS);
}

// boda → casamiento / matrimonio (masculinos: el artículo de antes también cambia). Solo en la web.
const MASC = { la: 'el', las: 'los', una: 'un', unas: 'unos', esta: 'este', estas: 'estos', esa: 'ese', esas: 'esos', toda: 'todo', todas: 'todos', nuestra: 'nuestro', nuestras: 'nuestros', otra: 'otro', otras: 'otros', muchas: 'muchos', tantas: 'tantos', propia: 'propio', perfecta: 'perfecto', soñada: 'soñado' };
function boda(t, sing, plur) {
  t = t.replace(/(?<![\p{L}])(toda|todas|esta|estas|esa|esas)(\s+)(tu|tus|su|sus|mi|mis)(\s+)(boda|bodas)(?![\p{L}])/giu, (m, a, s1, p, s2, b) => mayus(a, MASC[a.toLowerCase()]) + s1 + p + s2 + mayus(b, /s$/i.test(b) ? plur : sing));
  t = t.replace(/(?<![\p{L}])(la|las|una|unas|esta|estas|esa|esas|toda|todas|nuestra|nuestras|otra|otras|muchas|tantas)(\s+)(boda|bodas)(?![\p{L}])/giu, (m, a, s, b) => mayus(a, MASC[a.toLowerCase()]) + s + mayus(b, /s$/i.test(b) ? plur : sing));
  t = t.replace(/(?<![\p{L}-])(boda|bodas)(\s+)(propia|perfecta|soñada)(?![\p{L}])/giu, (m, b, s, a) => mayus(b, /s$/i.test(b) ? plur : sing) + s + MASC[a.toLowerCase()]);
  t = t.replace(/(?<![\p{L}./-])(boda|bodas)(?![\p{L}./-])/giu, (m) => mayus(m, /s$/i.test(m) ? plur : sing));
  return t;
}

const T_BAUT = { bautismo: 'bautizo', bautismos: 'bautizos' };
const T_ES = {
  celular: 'móvil', celulares: 'móviles', computadora: 'ordenador', computadoras: 'ordenadores', bautismo: 'bautizo', bautismos: 'bautizos',
  lindo: 'bonito', linda: 'bonita', lindos: 'bonitos', lindas: 'bonitas', livianas: 'ligeras', liviano: 'ligero', liviana: 'ligera',
  costo: 'coste', costos: 'costes', 'suene a ustedes': 'suene a vosotros', 'son ustedes': 'sois vosotros', video: 'vídeo', videos: 'vídeos', 'solo ustedes las vean': 'solo vosotros las veáis',
  // README (ronda 44): en España, el subtítulo de precios a la pareja (vosotros)
  'pruébala gratis, mírala terminada y paga solo cuando decidas publicarla': 'Probadla gratis, miradla terminada y pagad solo cuando decidáis publicarla',
};
const T_CL = { bautismo: 'bautizo', bautismos: 'bautizos', computadora: 'computador', computadoras: 'computadores' };
// México: «XV años» (como se escribe allá)
const xv = (t) => t.replace(/(?<![\d/.,:])(15|quince)\s+años/giu, 'XV años').replace(/(?<![\p{L}])(mis|tus|sus|los)\s+15(?![\d/.,:%]|\s*años)/giu, (m, a) => `${a} XV`);

const ZONAS = {
  es: (t) => t,
  'es-bz': (t) => reemplaza(t, T_BAUT),
  'es-mx': (t) => xv(reemplaza(t, T_BAUT)),
  'es-es': (t) => reemplaza(t, T_ES),
  'es-ar': (t, web) => aVos(web ? boda(reemplaza(t, FRASE_AR), 'casamiento', 'casamientos') : t),
  'es-py': (t) => aVos(t),
  'es-cr': (t) => aVos(reemplaza(t, T_BAUT)),
  'es-cl': (t, web) => reemplaza(web ? boda(t, 'matrimonio', 'matrimonios') : t, T_CL),
  'es-pe': (t, web) => reemplaza(web ? boda(t, 'matrimonio', 'matrimonios') : t, T_BAUT),
};

const ATRIB = /\b(alt|title|placeholder|aria-label|content|data-titulo)="([^"]*)"/g;
export function convertir(html, clave) {
  const f = ZONAS[clave];
  if (!f || clave === 'es') return html;
  const g = (x) => f(x, true);
  const trozos = html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<figure class="opinion">[\s\S]*?<\/figure>|<[^>]+>)/);
  const sinTexto = /^<(style|figure)/;
  const out = trozos.map((x, i) => {
    if (i % 2 === 0) return g(x);
    if (sinTexto.test(x)) return x;
    if (x.startsWith('<script')) return /application\/ld\+json/.test(x) ? x.replace(/"((?:[^"\\]|\\.)*)"/g, (m, v) => (/^(https?:|@|[A-Z][A-Za-z]+$|\{\{)/.test(v) ? m : `"${g(v)}"`)) : x;
    return x.replace(ATRIB, (m, a, v) => (a === 'content' && /^(width|noindex|index|follow|website|#|\d|summary|\{\{)/.test(v)) || /[:/]\/|^#|^\//.test(v) ? m : `${a}="${g(v)}"`);
  }).join('');
  return out.replace('<html lang="es"', `<html lang="${LANG[clave]}"`);
}

// Para el texto que arma el navegador (JavaScript), el panel y las demos: la misma conversión, sobre un texto suelto
export const convertirTexto = (t, clave, opc) => (ZONAS[clave] ? ZONAS[clave](t, !!(opc && opc.web)) : t);
