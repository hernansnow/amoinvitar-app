/* Generado por scripts/sitio/construir.mjs desde scripts/sitio/variantes.mjs (README ronda 40): no editar a mano */
(function () {
  var LANG = {"es":"es","es-es":"es-ES","ar":"es-AR","cr":"es-CR","mx":"es-MX","cl":"es-CL","pe":"es-PE"};
// README (ronda 40) · Convierte una página de la web nueva (escrita en español neutro, tú) a la variante de un país.
// Solo toca el texto visible, los títulos y los atributos alt/title/placeholder/aria-label/content; nunca el código ni las
// direcciones, ni las opiniones de clientes (son citas textuales).

const mayus = (o, n) => (o[0] !== o[0].toLowerCase() ? n[0].toUpperCase() + n.slice(1) : n);
const B = (p) => `(?<![\\p{L}\\p{N}_-])(?:${p})(?![\\p{L}\\p{N}_-])`;
const reemplaza = (t, tabla) => {
  const claves = Object.keys(tabla).sort((a, b) => b.length - a.length);
  const re = new RegExp(B(claves.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')), 'giu');
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
function aVos(t) {
  t = reemplaza(t, VOS_PRESENTE);
  const ini = Object.keys(VOS_IMPERATIVO).join('|');
  // al empezar el texto, tras un signo de apertura/puntuación, o tras « y » / coma cuando ya venía un imperativo
  t = t.replace(new RegExp(`(^\\s*|[.!?¡¿:;]\\s+)(${ini})(?![\\p{L}])`, 'giu'), (m, a, v) => a + mayus(v, VOS_IMPERATIVO[v.toLowerCase()]));
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

const ZONAS = {
  es: (t) => t,
  'es-es': (t) => reemplaza(t, { celular: 'móvil', celulares: 'móviles', computadora: 'ordenador', computadoras: 'ordenadores', bautismo: 'bautizo', bautismos: 'bautizos', lindo: 'bonito', linda: 'bonita', lindos: 'bonitos', lindas: 'bonitas', livianas: 'ligeras', liviano: 'ligero', ustedes: 'vosotros' }),
  ar: (t) => aVos(boda(t, 'casamiento', 'casamientos')),
  cr: (t) => aVos(reemplaza(noMatrimonio(t), { bautismo: 'bautizo', bautismos: 'bautizos' })),
  mx: (t) => reemplaza(noMatrimonio(t), { bautismo: 'bautizo', bautismos: 'bautizos' }),
  cl: (t) => reemplaza(boda(t, 'matrimonio', 'matrimonios').replace(/(?<![\p{L}])(casamiento)(s?)(?![\p{L}])/giu, (m, a, s) => mayus(m, 'matrimonio' + s)), { bautismo: 'bautizo', bautismos: 'bautizos', computadora: 'computador', computadoras: 'computadores' }),
  pe: (t) => reemplaza(boda(t, 'matrimonio', 'matrimonios').replace(/(?<![\p{L}])(casamiento)(s?)(?![\p{L}])/giu, (m, a, s) => mayus(m, 'matrimonio' + s)), { bautismo: 'bautizo', bautismos: 'bautizos' }),
};


// Para el texto que arma el navegador (JavaScript) y el panel: la misma conversión, sobre un texto suelto
const convertirTexto = (t, clave) => (ZONAS[clave] ? ZONAS[clave](t) : t);

  var POR_LANG = {}; Object.keys(LANG).forEach(function (k) { POR_LANG[LANG[k].toLowerCase()] = k; });
  var ATRIB = ['placeholder', 'aria-label', 'title', 'alt'];
  var clave = 'es', activo = false;
  function texto(n) {
    var p = n.parentNode; if (!p || /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE)$/.test(p.nodeName) || (p.closest && p.closest('.opinion, [data-sin-regional]'))) return;
    var v = n.nodeValue; if (!v || !/[A-Za-zÁÉÍÓÚáéíóú]/.test(v)) return;
    var w = convertirTexto(v, clave); if (w !== v) n.nodeValue = w;
  }
  function nodo(raiz) {
    if (raiz.nodeType === 3) return texto(raiz);
    if (raiz.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(raiz.nodeName)) return;
    var it = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, null), n;
    while ((n = it.nextNode())) texto(n);
    var els = raiz.querySelectorAll ? raiz.querySelectorAll('[placeholder],[aria-label],[title],[alt]') : [];
    [raiz].concat([].slice.call(els)).forEach(function (e) { ATRIB.forEach(function (a) { var v = e.getAttribute && e.getAttribute(a); if (v) { var w = convertirTexto(v, clave); if (w !== v) e.setAttribute(a, w); } }); });
  }
  function activar(c) {
    if (activo || !c || c === 'es' || !LANG[c]) return;
    clave = c; activo = true;
    nodo(document.body);
    new MutationObserver(function (ms) { ms.forEach(function (m) { [].slice.call(m.addedNodes).forEach(nodo); if (m.type === 'characterData') texto(m.target); }); }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  window.AI_REGIONAL = { activar: activar, convertir: function (t, c) { return convertirTexto(t, c || clave); } };
  // En la web, la variante sale del idioma de la página (<html lang>)
  function auto() { var c = POR_LANG[(document.documentElement.lang || '').toLowerCase()]; if (c && c !== 'es') activar(c); }
  if (document.body) auto(); else document.addEventListener('DOMContentLoaded', auto);
})();
