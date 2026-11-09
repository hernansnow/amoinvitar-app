// README (ronda 40) · Convierte una página de la web nueva (escrita en español neutro, tú) a la variante de un país.
// Solo toca el texto visible, los títulos y los atributos alt/title/placeholder/aria-label/content; nunca el código ni las
// direcciones, ni las opiniones de clientes (son citas textuales).
import { LANG } from '../../src/sitio/variantes.js';

const mayus = (o, n) => (o[0] !== o[0].toLowerCase() ? n[0].toUpperCase() + n.slice(1) : n);
const B = (p) => `(?<![\\p{L}\\p{N}_-])(?:${p})(?![\\p{L}\\p{N}_-])`;
// README (ronda 40): la expresión de cada tabla se arma una sola vez (armarla en cada texto era lo que trababa la página)
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

// tú → vos (presente: «tienes» → «tenés»; imperativo; pronombres)
const VOS_PRESENTE = {
  abres: 'abrís', aceptas: 'aceptás', administras: 'administrás', apruebas: 'aprobás', bloqueas: 'bloqueás', borras: 'borrás',
  compartes: 'compartís', comprometes: 'comprometés', consideras: 'considerás', contratas: 'contratás', controlas: 'controlás',
  corriges: 'corregís', decides: 'decidís', declaras: 'declarás', descargas: 'descargás', diseñas: 'diseñás', editas: 'editás',
  eliges: 'elegís', entras: 'entrás', 'envías': 'enviás', evitas: 'evitás', facilitas: 'facilitás', firmas: 'firmás',
  gestionas: 'gestionás', guardas: 'guardás', haces: 'hacés', imprimes: 'imprimís', llevas: 'llevás', necesitas: 'necesitás',
  organizas: 'organizás', pagas: 'pagás', personalizas: 'personalizás', pides: 'pedís', pierdes: 'perdés', quieres: 'querés',
  realizas: 'realizás', recibes: 'recibís', renuevas: 'renovás', revisas: 'revisás', sabes: 'sabés', sigues: 'seguís',
  subes: 'subís', tienes: 'tenés', trabajas: 'trabajás', usas: 'usás', puedes: 'podés', eres: 'sos', debes: 'debés',
  prefieres: 'preferís', 'pierdes': 'perdés', 'cuéntanos': 'contanos', 'escríbenos': 'escribinos',
  'descárgalas': 'descargalas', 'descárgalo': 'descargalo', 'descárgala': 'descargala', 'míralas': 'miralas', 'mírala': 'mirala', 'míralo': 'miralo',
  'personalízala': 'personalizala', 'personalízalo': 'personalizalo', 'proyéctalas': 'proyectalas', 'pruébalo': 'probalo', 'pruébala': 'probala',
  'diséñala': 'diseñala', 'diséñalo': 'diseñalo', 'compártela': 'compartila', 'compártelo': 'compartilo', 'cuéntame': 'contame',
};
// Imperativos que solo se cambian cuando empiezan una frase o un botón (si no, serían la tercera persona)
const VOS_IMPERATIVO = {
  abre: 'abrí', administra: 'administrá', busca: 'buscá', compara: 'compará', comparte: 'compartí', completa: 'completá',
  compra: 'comprá', corrige: 'corregí', crea: 'creá', deja: 'dejá', descarga: 'descargá', describe: 'describí', elige: 'elegí',
  empieza: 'empezá', 'envía': 'enviá', escanea: 'escaneá', exporta: 'exportá', gestiona: 'gestioná', indica: 'indicá',
  ingresa: 'ingresá', mira: 'mirá', organiza: 'organizá', paga: 'pagá', personaliza: 'personalizá', pide: 'pedí',
  proyecta: 'proyectá', prueba: 'probá', publica: 'publicá', selecciona: 'seleccioná', suma: 'sumá', toca: 'tocá', ten: 'tené', activa: 'activá',
};
const RE_IMPERATIVO = new RegExp(`(^\\s*|[.!?¡¿:;]\\s+)(${Object.keys(VOS_IMPERATIVO).join('|')})(?![\\p{L}])`, 'giu');
function aVos(t) {
  t = reemplaza(t, VOS_PRESENTE);
  t = t.replace(RE_IMPERATIVO, (m, a, v) => a + mayus(v, VOS_IMPERATIVO[v.toLowerCase()]));
  t = t.replace(/\b(para|a|de|por|en|sobre|sin|hasta|como|entre)\s+ti\b/giu, (m, p) => `${p} vos`);
  t = t.replace(/\bcontigo\b/giu, (m) => mayus(m, 'con vos'));
  t = t.replace(/(?<![\p{L}])tú(?![\p{L}])/giu, (m) => mayus(m, 'vos'));
  return t;
}

// Palabras de cada zona. Los sustantivos de género distinto (la boda → el casamiento) cambian también el artículo anterior.
const MASC = { la: 'el', las: 'los', una: 'un', unas: 'unos', esta: 'este', estas: 'estos', esa: 'ese', esas: 'esos', toda: 'todo', todas: 'todos', nuestra: 'nuestro', nuestras: 'nuestros', cada: 'cada', otra: 'otro', otras: 'otros', muchas: 'muchos', tantas: 'tantos', de: 'de' };
function boda(t, sing, plur) {
  t = t.replace(/(?<![\p{L}])(la|las|una|unas|esta|estas|esa|esas|toda|todas|nuestra|nuestras|otra|otras|muchas|tantas)(\s+)(boda|bodas)(?![\p{L}])/giu, (m, a, s, b) => mayus(a, MASC[a.toLowerCase()]) + s + mayus(b, /s$/i.test(b) ? plur : sing));
  t = t.replace(/(?<![\p{L}-])(boda|bodas)(?![\p{L}-])/giu, (m) => mayus(m, /s$/i.test(m) ? plur : sing));
  return t;
}
const noMatrimonio = (t) => t.replace(/(?<![\p{L}])(casamiento)(s?)(?![\p{L}])/giu, (m, a, s) => mayus(m, 'boda' + s)); // lo que ya dice «casamiento» en el neutro

// Las tablas van fuera de las funciones: así la expresión de cada una se arma una sola vez
const T_ES = { celular: 'móvil', celulares: 'móviles', computadora: 'ordenador', computadoras: 'ordenadores', bautismo: 'bautizo', bautismos: 'bautizos', lindo: 'bonito', linda: 'bonita', lindos: 'bonitos', lindas: 'bonitas', livianas: 'ligeras', liviano: 'ligero', ustedes: 'vosotros' };
const T_BAUT = { bautismo: 'bautizo', bautismos: 'bautizos' };
const T_CL = { bautismo: 'bautizo', bautismos: 'bautizos', computadora: 'computador', computadoras: 'computadores' };
const ZONAS = {
  es: (t) => t,
  'es-es': (t) => reemplaza(t, T_ES),
  ar: (t) => aVos(boda(t, 'casamiento', 'casamientos')),
  cr: (t) => aVos(reemplaza(noMatrimonio(t), T_BAUT)),
  mx: (t) => reemplaza(noMatrimonio(t), T_BAUT),
  cl: (t) => reemplaza(boda(t, 'matrimonio', 'matrimonios').replace(/(?<![\p{L}])(casamiento)(s?)(?![\p{L}])/giu, (m, a, s) => mayus(m, 'matrimonio' + s)), T_CL),
  pe: (t) => reemplaza(boda(t, 'matrimonio', 'matrimonios').replace(/(?<![\p{L}])(casamiento)(s?)(?![\p{L}])/giu, (m, a, s) => mayus(m, 'matrimonio' + s)), T_BAUT),
};

const ATRIB = /\b(alt|title|placeholder|aria-label|content|data-titulo)="([^"]*)"/g;
export function convertir(html, clave) {
  const f = ZONAS[clave];
  if (!f || clave === 'es') return html;
  const trozos = html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<figure class="opinion">[\s\S]*?<\/figure>|<[^>]+>)/);
  const sinTexto = /^<(style|figure)/;
  const out = trozos.map((x, i) => {
    if (i % 2 === 0) return f(x);
    if (sinTexto.test(x)) return x;
    if (x.startsWith('<script')) return /application\/ld\+json/.test(x) ? x.replace(/"((?:[^"\\]|\\.)*)"/g, (m, v) => (/^(https?:|@|[A-Z][A-Za-z]+$)/.test(v) ? m : `"${f(v)}"`)) : x;
    return x.replace(ATRIB, (m, a, v) => (a === 'content' && /^(width|noindex|index|follow|website|#|\d|summary)/.test(v)) || /[:/]\/|^#|^\//.test(v) ? m : `${a}="${f(v)}"`);
  }).join('');
  return out.replace('<html lang="es"', `<html lang="${LANG[clave]}"`);
}

// Para el texto que arma el navegador (JavaScript) y el panel: la misma conversión, sobre un texto suelto
export const convertirTexto = (t, clave) => (ZONAS[clave] ? ZONAS[clave](t) : t);
