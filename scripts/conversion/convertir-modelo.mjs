// Convierte un diseño de la v2.0 (demo/<carpeta>/index.html, premium.html, basic.html) al sistema nuevo:
// le pone las marcas data-* del motor, cambia los bloques viejos por los componentes comunes y deja
// los tres archivos del paquete en public/modelos/<id>/. Uso:
//
//   REPO_VIEJO=../amoinvitar-v2.0 node scripts/conversion/convertir-modelo.mjs <id> <evento> <carpeta-demo>
//   (boda → index.html / index-premium.html / index-basic.html; otro evento → index-<evento>…)
//
// Lo que no reconoce lo deja como estaba y lo anota en conversion.json (para revisarlo a mano).
// Las reglas por sección están en este archivo; los ajustes de cada modelo, en scripts/conversion/<id>.mjs
// (si existe, exporta ajustar(doc, ctx) y se aplica al final).

import { parseHTML } from 'linkedom';
import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, resolve, basename, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const APP = fileURLToPath(new URL('../..', import.meta.url));
const REPO = resolve(process.env.REPO_VIEJO || join(APP, '../amoinvitar-v2.0'));
const existe = (p) => access(p).then(() => true, () => false);

// ── utilidades DOM ───────────────────────────────────────────────────────
const $ = (r, s) => r.querySelector(s);
const $$ = (r, s) => [...r.querySelectorAll(s)];
const txt = (e) => (e?.textContent || '').replace(/\s+/g, ' ').trim();
const subir = (e, f) => { for (let x = e; x; x = x.parentElement) if (f(x)) return x; return null; };
const clases = (e) => String(e?.getAttribute?.('class') || '').split(/\s+/).filter(Boolean);
const esCol = (e) => clases(e).some((c) => /^col(-|$)/.test(c));
const quitar = (e) => e?.parentNode?.removeChild(e);
// a está antes que b en el documento (compareDocumentPosition de linkedom falla en algunos casos)
function antesQue(a, b) {
  if (a === b || !a || !b) return false;
  const cadena = (x) => { const c = []; for (; x; x = x.parentNode) c.unshift(x); return c; };
  const ca = cadena(a), cb = cadena(b);
  let i = 0; while (i < ca.length && i < cb.length && ca[i] === cb[i]) i++;
  if (i === ca.length) return true; // a contiene a b
  if (i === cb.length) return false;
  const hijos = [...ca[i - 1].childNodes];
  return hijos.indexOf(ca[i]) < hijos.indexOf(cb[i]);
}
const RE_FECHA = /\d{1,2}\s*(?:•|&bull;|·|\.|\/|-|◦)\s*\d{1,2}\s*(?:•|&bull;|·|\.|\/|-|◦)\s*\d{2,4}/;
const RE_FECHA_HORA = /\d{1,2}\s*◦\s*\d{1,2}\s*◦\s*\d{4}/;

// "12 • 09 • 2027" → "{dd} • {mm} • {a}" (el formato exacto del diseño; el motor pone la fecha del cliente)
function plantillaFecha(t) {
  return t.replace(/\b(\d{1,2}:\d{2})(\s*hs\b|\s*h\b)?/g, '{hora}').replace(/\b2027\b/g, '{a}')
    .replace(/SEPTIEMBRE/g, '{MES}').replace(/Septiembre/g, '{Mes}').replace(/septiembre/g, '{mes}').replace(/\bSEPT?\b/g, '{MES3}').replace(/\bSept?\b/g, '{Mes3}').replace(/\bsept?\b/g, '{mes3}')
    .replace(/\b12\b/, '{dd}').replace(/\b09\b/, '{mm}').replace(/\b9\b/, '{m}');
}
function marcarFecha(e, ruta) {
  e.setAttribute('data-fecha', ruta); e.setAttribute('data-fecha-formato', plantillaFecha(e.textContent));
  e.removeAttribute('data-campo');
}
function nodo(doc, html) {
  const t = doc.createElement('div');
  t.innerHTML = html.trim();
  return t.firstElementChild;
}
function antes(ref, el) { ref.parentNode.insertBefore(el, ref); return el; }
function despues(ref, el) { ref.parentNode.insertBefore(el, ref.nextSibling); return el; }
function envolver(doc, el, html) { const w = nodo(doc, html); antes(el, w); w.appendChild(el); return w; }
// El elemento de primer nivel (hijo directo de .site-wrap o de su envoltorio) que contiene a e
function nivel(e, wrap) { return subir(e, (x) => x.parentElement === wrap) || e; }
// Un texto de la sección: el primer elemento hoja cuyo texto cumple
function hoja(raiz, sel, f) { return $$(raiz, sel).find((e) => f(txt(e), e)) || null; }

// ── el documento ─────────────────────────────────────────────────────────
function abrir(html) { return parseHTML(html).document; }

class Conversion {
  constructor({ id, evento, carpeta, paquete, doc, html }) {
    Object.assign(this, { id, evento, carpeta, paquete, doc, html });
    this.avisos = [];
    this.imagenes = new Set();   // ../../img/x → img/x
    this.fotos = new Set();      // fotos de la demo (foto1.jpg…) → demo/<evento>/x
    this.hojas = new Set();      // hojas de estilo propias del modelo (css/inv-x.css)
    this.fuentes = new Set();    // css de fuentes
    this.secciones = new Set();
    this.info = {};
  }
  aviso(m) { this.avisos.push(m); }
  get wrap() {
    // El contenedor de las secciones: .site-wrap, o el <div> que algunos modelos ponen adentro envolviendo todo
    let w = $(this.doc, '.site-wrap') || this.doc.body;
    for (;;) {
      const hijos = [...w.children].filter((x) => !['SCRIPT', 'AUDIO', 'FOOTER', 'NOSCRIPT', 'STYLE'].includes(x.tagName) && !x.matches('[data-componente],.music-play') && !(x.tagName === 'DIV' && !x.children.length && !txt(x)) && !(x.querySelector?.('.music-play') && x.children.length === 1));
      if (hijos.length === 1 && hijos[0].tagName === 'DIV' && hijos[0].querySelector('section')) w = hijos[0]; else return w;
    }
  }
}

// ── 1. Limpieza: lo que ahora hace el sistema ────────────────────────────
function limpiar(c) {
  const d = c.doc;
  for (const s of ['#sobre', '#gate-overlay', '#overlayer', '.loader', '#audioModal', '.flag-lang', 'noscript']) $$(d, s).forEach((e) => quitar(s === '.flag-lang' ? (e.parentElement?.children.length === 1 ? e.parentElement : e) : e));
  // El código de los gráficos de seguimiento y los scripts viejos (el sistema pone los suyos al final)
  const cuenta = $$(d, 'script').map((s) => s.textContent).find((t) => /countdown\(/.test(t) && /strftime/.test(t));
  if (cuenta) c.info.cuenta = cuenta;
  $$(d, 'script').forEach(quitar);
  $$(d, 'iframe[src*="googletagmanager"]').forEach(quitar);
  // Imágenes que cargaba lazysizes
  for (const i of $$(d, 'img[data-src]')) { i.setAttribute('src', i.getAttribute('data-src')); i.removeAttribute('data-src'); i.classList.remove('lazyload'); }
  // Íconos del itinerario como <object>
  for (const o of $$(d, 'object[type="image/png"]')) {
    const i = d.createElement('img');
    i.setAttribute('class', o.getAttribute('class') || 'img-fluid'); i.setAttribute('src', o.getAttribute('data') || ''); i.setAttribute('alt', '');
    o.parentNode.replaceChild(i, o);
  }
  // Atributos que ya no hacen falta
  for (const e of $$(d, '[href="javascript:;"]')) e.removeAttribute('href');
  for (const e of $$(d, '[data-aos-delay=""]')) e.removeAttribute('data-aos-delay');
  for (const e of $$(d, 'img[decoding]')) e.removeAttribute('decoding');
}

// ── 2. Portada ───────────────────────────────────────────────────────────
// La frase de la portada y la segunda línea (edad, clase, revelación), también repetidas en el cierre
const FRASES = /nos casamos|nuestra boda|mis (15|quince)|mi cumple|despegamos|me caso|nos casaremos|our wedding|getting married|mi bautismo|mi bautizo|mi (primera )?comuni|mi fiesta|baby\s*shower|fiesta de (egresados|graduaci|navidad)/i;
const DETALLE = /^(cumple\s*)?\d+\s*a[ñn]os?$|^(clase|promo(ci[oó]n)?)\s*\d{4}$|revelaci[oó]n de g[eé]nero/i;
const DEMO_NOMBRE = /^(ayl[eé]n|ariadna|macarena|mariana|maiana|mariel|dayana|milena|abigail|fátima|fatima|mateo|juliana|martín|martin|paula|agustín|agustin|cinthia|sofi|ale|romi|gaby|lau|pablo|vanina)$/i;
// Fracción del ancho para los nombres: [celular, computadora]
const AJUSTE_NOMBRES = {
  aquarella: [0.62, 0.32], armonia: [0.72, 0.6], beach: [0.5, 0.36], black: [0.66, 0.36], byn: [0.8, 0.6], cinema: [0.6, 0.42],
  euforia: [0.74, 0.6], floral: [0.62, 0.22], lila: [0.7, 0.5], passion: [0.5, 0.26], rouge: [0.62, 0.3], sky: [0.5, 0.36],
  travel: [0.72, 0.5], white: [0.5, 0.3], oliva: [0.6, 0.4], vintage: [0.7, 0.45], elegance: [0.8, 0.6], lovestory: [0.8, 0.6],
};
function portada(c, home) {
  const d = c.doc;
  if (!home) { c.aviso('portada: no se encontró #home-section'); return; }
  // Nombres: el primer h1 (o el título más grande)
  // Los nombres: el h1, o el título con "&" / un corazón entre los nombres
  // (sin contar los títulos vacíos de espacio, Lovestory)
  // (y si hay varios h1, el que tiene el nombre de muestra: Baby Shower "Baby" / "Mateo")
  const h1s = $$(home, 'h1').filter((e) => txt(e).replace(/[\s\u00a0]+/g, '').length > 1);
  let h1 = h1s.find((e) => DEMO_NOMBRE.test(txt(e).replace(/\s+/g, ' ').trim())) || h1s[0] || $$(home, 'h2,h3,h4').find((e) => (/&|\+|\sy\s/.test(txt(e)) || e.querySelector('[class*="icon-heart"]')) && txt(e).length < 45);
  if (!h1) {
    // Dos títulos iguales, uno por nombre (Cinema): nombres.a y nombres.b por separado
    const hs = $$(home, 'h2,h3').filter((e) => /^[A-ZÁÉÍÓÚÑa-záéíóúñ]+$/.test(txt(e)) && !/^(ceremonia|celebraci[oó]n)$/i.test(txt(e)));
    if (hs.length >= 2 && clases(hs[0])[0] === clases(hs[1])[0]) {
      hs[0].setAttribute('data-campo', 'nombres.a'); hs[1].setAttribute('data-campo', 'nombres.b'); hs[1].setAttribute('data-si', 'nombres.b');
      // El adorno entre los dos nombres (un corazón, un "&") va solo si hay dos nombres
      for (let x = hs[0].nextSibling; x && x !== hs[1]; x = x.nextSibling) if (x.nodeType === 1 && !txt(x).match(/[A-Za-z]{3}/)) x.setAttribute('data-si', 'nombres.b');
      c.info.nombresSeparados = true;
      c.aviso('portada: nombres en dos títulos (nombres.a / nombres.b); revisar el adorno del medio en eventos de una persona');
    }
  }
  if (!h1 && !c.info.nombresSeparados) {
    // Los nombres en la sección de abajo de la portada (Minimal Basic: la foto arriba y los nombres debajo)
    let sig = home.nextElementSibling;
    while (sig && (/^(SCRIPT|STYLE)$/.test(sig.tagName) || !txt(sig).trim())) sig = sig.nextElementSibling;
    const hAbajo = sig && $$(sig, 'h1').find((e) => txt(e).replace(/[\s\u00a0]+/g, '').length > 1 && (/&|\sy\s/.test(txt(e)) || $(e, 'span,i') || (c.evento !== 'boda' && txt(e).length < 30)));
    if (hAbajo) { h1 = hAbajo; c.zonaNombres = sig; }
  }
  if (!h1 && !c.info.nombresSeparados) {
    // Sin h1: el título con un nombre de muestra de los diseños (Beach "Aylén", Graffiti "Ariadna", Romantic "MacaRenA")
    const DEMO = DEMO_NOMBRE;
    const cand = $$(home, 'h1,h2,h3,h4,h5,p').find((e) => DEMO.test(txt(e).replace(/\s+/g, ' ').trim()) && !e.querySelector('h1,h2,h3,h4,h5,p'));
    if (cand) h1 = cand;
  }
  if (h1) {
    c.info.nombresPortada = h1.innerHTML.trim();
    h1.setAttribute('data-campo-html', 'nombres.portada');
    // Dentro de un aro o marco: se mide contra él
    const aro = subir(h1, (x) => x !== home && /aro|circulo|circle|marco|frame/i.test(clases(x).join(' ')) && !/cuenta-regresiva/.test(clases(x).join(' ')));
    if (aro) { h1.setAttribute('data-ajustar', '0.56'); h1.setAttribute('data-ajustar-en', '.' + clases(aro).find((k) => /aro|circulo|circle|marco|frame/i.test(k))); }
    else h1.setAttribute('data-ajustar', '0.82');
    // README (ronda 21): el lugar de los nombres en cada diseño (el aro, la palmera, el hexágono, el recuadro…)
    const lugarNombres = AJUSTE_NOMBRES[c.id];
    if (lugarNombres) {
      h1.setAttribute('data-ajustar', String(lugarNombres[0]));
      if (lugarNombres[1] != null) h1.setAttribute('data-ajustar-pc', String(lugarNombres[1]));
    }
  } else if (!c.info.nombresSeparados) c.aviso('portada: sin título de nombres');
  // Fecha y frase
  const textos = [...$$(home, 'h2,h3,h4,h5,h6,p,span'), ...(c.zonaNombres ? $$(c.zonaNombres, 'h2,h3,h4,h5,h6,p,span') : [])].filter((e) => e !== h1 && !h1?.contains(e) && !e.querySelector('h1,h2,h3,h4,p'));
  const fecha = textos.find((e) => RE_FECHA.test(txt(e)) && !$$(e, '*').some((x) => RE_FECHA.test(txt(x))));
  const conMes = !fecha && textos.find((e) => /\d{1,2}\s*\S?\s*(SEPTIEMBRE|Septiembre|septiembre|SEPT?|Sept?)\.?\s*\S?\s*\d{4}/.test(txt(e)) && !$$(e, '*').some((x) => /\d{4}/.test(txt(x))));
  if (fecha || conMes) marcarFecha(fecha || conMes, 'principal'); else c.aviso('portada: sin fecha');
  const hojaTexto = (e) => !$$(e, 'p,span,h1,h2,h3,h4,h5,h6').some((x) => FRASES.test(txt(x)));
  const frase = textos.find((e) => FRASES.test(txt(e)) && hojaTexto(e) && txt(e).length < 40)
    || textos.find((e) => e !== fecha && !fecha?.contains(e) && !e.contains(fecha) && txt(e).length > 3 && txt(e).length < 40
    && /[A-ZÁÉÍÓÚÑ!¡]{3}/.test(txt(e)) && txt(e) === txt(e).toUpperCase() && !/FALTAN|DÍAS|HORAS|MIN|SEG|^\s*SHOWER\s*$/.test(txt(e)));
  if (frase) {
    frase.setAttribute('data-t', 'portada.subtitulo');
    // El diseño la escribe en minúsculas o "Tipo Título": el motor respeta ese caso
    const t0 = txt(frase).replace(/[¡!¿?]/g, '');
    if (t0 !== t0.toUpperCase()) frase.setAttribute('data-caso', /^(\S+\s*)+$/.test(t0) && t0.split(/\s+/).every((w) => w[0] === w[0].toUpperCase()) ? 'titulo' : 'oracion');
  } else c.aviso('portada: sin frase (NOS CASAMOS / MIS 15…)');
  // Segunda línea (infantiles, egresos, revelación): la edad, la clase o la institución
  const det = textos.find((e) => e !== frase && DETALLE.test(txt(e).replace(/\s+/g, ' ').trim()) && !$$(e, '*').some((x) => DETALLE.test(txt(x).replace(/\s+/g, ' ').trim())));
  if (det) {
    det.setAttribute('data-t', 'portada.detalle');
    const t0 = txt(det);
    if (t0 !== t0.toUpperCase()) det.setAttribute('data-caso', 'oracion');
  }
  // Sin h1: el nombre es el texto corto justo antes de la segunda línea (Cars: "Martín" / "2 Años")
  if (!h1 && !c.info.nombresSeparados && det) {
    // El texto corto más cercano a la segunda línea (antes o después), que no sea frase, fecha ni cuenta
    const todos = $$(home, 'h2,h3,h4,p').filter((x) => !x.querySelector('h2,h3,h4,p'));
    const i0 = todos.indexOf(det);
    const libre = (x) => x && txt(x).length > 1 && txt(x).length < 30 && !x.closest('[data-t],[data-fecha],[data-si="cuenta.activa"]') && !/faltan/i.test(txt(x));
    const n = [todos[i0 - 1], todos[i0 + 1]].find(libre);
    if (n) {
      n.setAttribute('data-campo-html', 'nombres.portada'); n.setAttribute('data-ajustar', '0.82');
      c.info.nombresPortada = n.innerHTML.trim();
      const k = c.avisos.indexOf('portada: sin título de nombres'); if (k >= 0) c.avisos.splice(k, 1);
    }
  }
  // Cuenta regresiva
  // La cuenta regresiva: en la portada o, en algunos diseños (Amanecer), en la sección siguiente
  const reloj = $(home, '#clock-b') || $(home, '#countdown') || $(d.body, '#clock-b') || $(d.body, '#countdown');
  if (reloj) {
    const caja = subir(reloj, (x) => x.parentElement && x.parentElement.children.length > 1) || reloj;
    caja.setAttribute('data-si', 'cuenta.activa');
    const faltan = textos.find((e) => /^faltan?$/i.test(txt(e))) || $$(caja.parentElement || caja, 'h1,h2,h3,h4,h5,h6,small,p,span').find((e) => /^faltan?$/i.test(txt(e))) || $(d.body, '#headline-countdown');
    // La cuenta en una sección aparte (Armonía): su flecha va solo con la cuenta (si no, quedan dos flechas)
    const secReloj = subir(reloj, (x) => x.tagName === 'SECTION');
    if (secReloj && secReloj !== home && !secReloj.closest('#home-section')) {
      for (const a of $$(secReloj, 'a[href^="#"]').filter((x) => $(x, '[class*="arrow"]'))) (subir(a, (x) => x.tagName === 'DIV' && x.children.length === 1) || a).setAttribute('data-si', 'cuenta.activa');
    }
    if (faltan) { if (/^faltan$/i.test(txt(faltan))) faltan.setAttribute('data-t', 'cuenta.faltan'); faltan.setAttribute('data-si', 'cuenta.activa'); }
    // Una sección que es solo la cuenta (Floral: la franja verde): sin cuenta, no queda nada (como en Basic)
    if (secReloj && secReloj !== home && !secReloj.closest('#home-section')) {
      const resto = secReloj.cloneNode(true);
      for (const x of $$(resto, '#countdown,#clock-b,#headline-countdown,#content-countdown,.container-countdown')) quitar(x);
      if (!txt(resto).trim() && !$$(resto, 'h1,h2,h3,h4,p,a,button,iframe').length) {
        secReloj.setAttribute('data-si', 'cuenta.activa');
        if (secReloj.id) antes(secReloj, nodo(d, `<div id="${secReloj.id}" data-no="cuenta.activa"></div>`));
      }
    }
    if (c.info.cuenta) {
      // El formato de la cuenta del diseño (el motor pone los números y los textos del idioma)
      const m = c.info.cuenta.match(/strftime\(([\s\S]*?)\)\);/);
      if (m) {
        const partes = [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]).join('');
        const f = partes.replace(/%-?D/, '{d}').replace(/DÍA%!D|D[IÍ]AS?/i, '{dias}').replace(/%H/, '{h}').replace(/HORAS?/i, '{horas}').replace(/%M/, '{m}').replace(/MIN(UTOS)?/i, '{min}').replace(/%S/, '{s}').replace(/SEG(UNDOS)?/i, '{seg}');
        if (/\{d\}/.test(f)) reloj.setAttribute('data-formato', f);
      }
    }
  }
  // Fotos de la portada: carrusel de Bootstrap, foto de fondo o foto suelta (las de la demo)
  // Los PNG de la carpeta son adornos y los fondo-*.jpg (Celeste, Rosa) son el fondo del diseño, no fotos del cliente
  const esDemo = (u) => u && (!/^(\.\.\/|https?:|\/)/.test(u) || /^\.\.\/\.\.\/demo\/(?!img-demo)/.test(u)) && /\.(jpe?g|webp)$/i.test(u) && !/(^|\/)fondo-[^/]*$/i.test(u);
  const urlDe = (st) => (st.match(/url\((['"]?)([^'")]+)\1\)\s*;?\s*[^u]*$/) || st.match(/url\((['"]?)([^'")]+)\1\)(?![\s\S]*url\()/) || [])[2];
  // Video de fondo (Vimeo, Cinema y Disco): el de la demo queda solo en la demo; el cliente sube el suyo (MP4)
  // o, si no, van sus fotos de portada en un slideshow
  // Disco: el video es parte del diseño (queda siempre); la foto del cliente es la de la estrella
  const vimeo = c.id === 'disco' ? null : $(home, '.vimeo-embed');
  if (vimeo) {
    vimeo.setAttribute('data-si', 'demo');
    const v = nodo(d, `<video class="ai-video-portada" data-si="portada.video" autoplay muted loop playsinline preload="auto" data-attr="src:c:portada.video;poster:c:portada.poster"></video>`);
    despues(vimeo, v);
    const sl = nodo(d, `<div data-no="demo"><div data-no="portada.video"><div class="ai-slides ai-slides-fondo" data-intervalo="5000"><div class="ai-slide" data-repetir="fotos.portada" data-i-bg="url" data-i-pos="pos" data-i-estilo="estilo" style="background-image: linear-gradient(rgba(0,0,0,.25), rgba(0,0,0,.35)), url(demo/${c.evento}/hero-banner.jpg)"></div></div></div></div>`);
    despues(v, sl);
    c.info.videoPortada = true; c.info.portadaFotos = 4;
  }
  const items = vimeo ? [] : $$(home, '.carousel-item');
  if (items.length) {
    const car = subir(items[0], (x) => x.classList?.contains('carousel'));
    const slides = nodo(d, '<div class="ai-slides" data-intervalo="5000"></div>');
    for (const it of items) {
      const st = it.getAttribute('style') || '';
      const u = urlDe(st);
      if (u && esDemo(u)) { c.fotos.add(u); (c.info.portadas ||= []).push({ f: basename(u), pos: (st.match(/background-position\s*:\s*([^;]+)/) || [])[1]?.trim() || '50% 50%' }); }
      const s = it.cloneNode(true);
      s.setAttribute('class', ['ai-slide', ...clases(it).filter((k) => !['carousel-item', 'active'].includes(k))].join(' '));
      s.setAttribute('data-repetir', 'fotos.portada'); s.setAttribute('data-i-bg', 'url'); s.setAttribute('data-i-pos', 'pos'); s.setAttribute('data-i-estilo', 'estilo');
      slides.appendChild(s);
    }
    car.parentNode.replaceChild(slides, car);
    slides.setAttribute('data-video-portada', ''); c.info.fondoCompleto = true;
    c.info.portadaFotos = items.length;
  } else if (!vimeo) {
    let n = 0;
    for (const e of $$(home, '[style*="url("]')) {
      const u = urlDe(e.getAttribute('style'));
      if (!esDemo(u)) continue;
      c.fotos.add(u);
      if (!(c.info.portadas || []).some((x) => x.f === basename(u))) (c.info.portadas ||= []).push({ f: basename(u), pos: ((e.getAttribute('style') || '').match(/background-position\s*:\s*([^;]+)/) || [])[1]?.trim() || '50% 50%' });
      e.setAttribute('data-repetir', 'fotos.portada'); e.setAttribute('data-i-bg', 'url'); e.setAttribute('data-i-pos', 'pos'); e.setAttribute('data-i-estilo', 'estilo');
      e.classList.add('portada-foto-pc');
      // La primera caja de foto a pantalla completa: ahí va el video de portada del cliente (comun/js/video-portada.js)
      if (!n) { e.setAttribute('data-video-portada', ''); c.info.fondoCompleto = true; }
      n++;
    }
    for (const i of $$(home, 'img')) {
      const u = i.getAttribute('src');
      if (!esDemo(u)) continue;
      c.fotos.add(u);
      (c.info.portadas ||= []).push({ f: basename(u), pos: ((i.getAttribute('style') || '').match(/object-position\s*:\s*([^;]+)/) || [])[1]?.trim() || '50% 50%' });
      // Foto suelta (un círculo, un marco): una sola
      const w = subir(i, (x) => x.parentElement && x.parentElement.children.length > 1) || i;
      w.setAttribute('data-repetir', 'fotos.portada');
      i.setAttribute('data-i-attr', 'src:url;style:estiloImg');
      // La foto redonda (globo, la estrella de Disco): siempre 1:1, aunque el cliente suba una foto vertical u horizontal
      if (/globo|rounded-circle|estrella/i.test(u + ' ' + (i.getAttribute('class') || '')) || c.id === 'disco') {
        i.classList.add('ai-foto-1x1'); c.info.portadaRedonda = true;
        // Sin foto del cliente, la foto redonda no se muestra (Travel pone el avión; Disco, su estrella)
        if (!/^(travel|disco)$/.test(c.id)) i.setAttribute('data-si', 'portada.hayFoto');
      }
      n++;
    }
    c.info.portadaFotos = n;
    if (!n) c.aviso('portada: sin foto de la demo (el fondo queda fijo)');
  }
}

// Letras sueltas en la portada (Euforia: "A    B" a los costados de la espiga): las iniciales de los nombres
function inicialesPortada(c) {
  const home = $(c.doc, '#home-section');
  if (!home) return;
  // B&N: la ciudad junto a la fecha ("MIAMI"): un campo; vacío, no se muestra
  for (const e of $$(c.doc.body, 'span,p,h3,h4').filter((x) => x.closest('#home-section') && !x.children.length && /^\s*MIAMI\s*$/.test(x.textContent))) {
    e.setAttribute('data-campo', 'portada.ciudad'); e.setAttribute('data-si', 'portada.ciudad'); c.info.ciudadPortada = true;
  }
  for (const e of $$(c.doc.body, 'div,span,p,h1,h2,h3,h4,h5').filter((x) => x.closest('#home-section') && !x.children.length)) {
    const m = /^\s*([A-ZÁÉÍÓÚÑ])(?:[\s\u00a0]+([A-ZÁÉÍÓÚÑ]))?\s*$/.exec(e.textContent);
    if (!m || e.closest('[data-campo],[data-campo-html],[data-t],[data-fecha],a,button')) continue;
    e.innerHTML = m[2] ? '<span data-campo="nombres.inicialA">A</span>&#160;&#160;&#160;&#160;<span data-campo="nombres.inicialB">B</span>' : '<span data-campo="nombres.inicialA">A</span>';
  }
}

// ── 3. Música de fondo ───────────────────────────────────────────────────
const AUDIO = `<div data-si="musica.archivo">
    <audio loop id="audio" preload="none" data-attr="data-inicio:c:musica.inicio">
      <source src="../../comun/audio/demo-boda.mp3" type="audio/mpeg" data-attr="src:c:musica.archivo">
    </audio>
  </div>`;
function audio(c) {
  const d = c.doc;
  const a = $(d, 'audio#audio');
  const nuevo = nodo(d, AUDIO);
  if (a) {
    antes(a, nuevo); quitar(a);
  } else c.aviso('música: sin <audio id="audio">');
  $$(d, '.music-play').forEach((b) => quitar(b.parentElement && b.parentElement.children.length === 1 && b.parentElement.tagName === 'DIV' ? b.parentElement : b));
}

// ── 4. Historia ──────────────────────────────────────────────────────────
function historia(c) {
  const d = c.doc;
  // El texto de muestra de la historia (boda, 15, cumple…) o, si no, el título "Nuestra historia"
  const MUESTRA = /todo comenz[oó] hace|hoy recibo a jes[uú]s|un a[ñn]o m[aá]s para jugar|parece que fue ayer cuando comenz|desde el momento en que supimos|los momentos felices de la vida, se tornan|con la esperanza de que la bendici|desde muy peque[ñn]|la vida se mide en momentos|and[aá]bamos sin buscarnos|it all started|un a[ñn]o m[aá]s para celebrar/i;
  const rsvp0 = $(d.body, '#rsvp');
  let t = $$(d.body, 'h3,h4,h5,p').find((e) => MUESTRA.test(txt(e)) && !$$(e, 'h3,h4,h5,p').some((x) => MUESTRA.test(txt(x))) && (!rsvp0 || antesQue(e, rsvp0)));
  let h = hoja(d.body, 'h1,h2,h3,h4', (x) => /^(nuestra|mi|my|our)\s+(historia|story|viaje)$|historia$/i.test(x));
  if (t && !h) {
    // El título: el que está justo antes del texto, en la misma caja
    const caja = t.parentElement;
    h = $$(caja, 'h1,h2,h3,h4').filter((x) => x !== t && !x.contains(t) && antesQue(x, t)).at(-1) || null;
  }
  if (!h && !t) {
    // Basic: el saludo de bienvenida en lugar de la historia
    const bv = hoja(d.body, 'h2,h3,h4,h5,p', (x) => /invitarte|te invito|invitamos|we would love|i would love|queremos que|quiero que/i.test(x) && x.length < 90);
    if (bv) { bv.setAttribute('data-t', 'bienvenida.texto'); bv.setAttribute('data-si', 'historia.bienvenida'); }
    else c.aviso('historia: no se encontró el texto ni el saludo');
    return null;
  }
  if (!h) {
    // Sin título en el diseño: se agrega uno con la fuente de los títulos (oculto si el diseño no lo tenía)
    h = d.createElement('h2'); h.setAttribute('class', 'd-none'); h.textContent = 'Nuestra Historia'; antes(t, h);
  }
  const caja = subir(h, (x) => x.parentElement && (x.tagName === 'SECTION' || esCol(x))) || h.parentElement;
  if (!t) {
    const candidatos = $$(caja, 'h3,h4,h5,p').filter((e) => e !== h && txt(e).length > 60);
    t = candidatos.sort((a, b) => txt(b).length - txt(a).length)[0];
  }
  h.setAttribute('data-t', 'historia.titulo'); h.setAttribute('data-si', 'historia.activa');
  if (t) {
    // Se conserva la etiqueta y las clases del diseño (la tipografía depende de ellas)
    const p = d.createElement(t.tagName.toLowerCase());
    // README: el texto de la historia con g-historia y sin font-weight-lighter
    p.setAttribute('class', [...clases(t).filter((k) => k !== 'font-weight-lighter'), 'g-historia'].join(' '));
    if (t.getAttribute('style')) p.setAttribute('style', t.getAttribute('style'));
    // Comillas del diseño (íconos) a los costados del texto
    const comillas = $$(t, '[class*="icon-quote"]');
    const izq = comillas.find((x) => /left/.test(x.getAttribute('class'))), der = comillas.find((x) => /right/.test(x.getAttribute('class')));
    c.info.textoHistoria = txt(t).replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim();
    p.innerHTML = `${izq ? izq.outerHTML + ' ' : ''}<span data-campo-html="historia.texto">${txt(t).replace(/[“”"]/g, '')}</span>${der ? ' ' + der.outerHTML : ''}`;
    p.setAttribute('data-si', 'historia.activa');
    t.parentNode.replaceChild(p, t);
    // Saludo de bienvenida (cuando el cliente apaga la historia)
    const bv = d.createElement('h4');
    bv.setAttribute('class', [...clases(h).filter((k) => /^text-|^mb-|^mt-/.test(k)), 'font-weight-bolder', 'mb-0', 'pb-2'].join(' '));
    bv.setAttribute('data-si', 'historia.bienvenida'); bv.setAttribute('data-t', 'bienvenida.texto');
    bv.textContent = '¡Queremos invitarte a nuestra boda!';
    antes(h, bv);
  } else c.aviso('historia: sin texto');
  c.secciones.add('historia');
  return caja;
}

// La foto "inicial" (Armonía, Lila, Style, Oliva…): es para la foto del cliente; se carga en Historia del panel
function fotoHistoria(c) {
  const d = c.doc;
  for (const i of $$(d.body, 'img').filter((x) => /(^|\/)inicial\.jpe?g$/i.test(x.getAttribute('src') || '') && !x.closest('#home-section'))) {
    i.setAttribute('data-si', 'fotos.historia');
    i.setAttribute('data-attr', 'src:c:fotos.historia');
    i.setAttribute('data-estilo', 'fotos.historiaEstilo'); // proporción y encuadre elegidos en el panel
    if (/rounded-circle/.test(i.getAttribute('class') || '')) { i.classList.add('ai-foto-1x1'); c.info.fotoHistoria = '1:1'; }
    else c.info.fotoHistoria ||= 'demo';
  }
}

// ── 5. Galería ───────────────────────────────────────────────────────────
const GALERIA_FIJA = /^(minimal|rockabilly)$/;
function galeria(c) {
  const d = c.doc, wrap = c.wrap;
  // foto1.jpg, galeria-1.jpg o foto1b.jpg (carpetas con varios diseños: cada uno con su letra)
  const esFoto = (i) => /(^|\/)(foto|galeria-)\d+[a-z]?\.(jpe?g|webp)$/i.test(i.getAttribute('src') || i.getAttribute('href') || '');
  const contenedores = $$(d, '.owl-carousel, #posts, .carousel, [class*="galeria"], [id*="galeria"]').filter((x) => $$(x, 'img,a').filter(esFoto).length >= 4 && !x.closest('#rsvp'));
  const car = contenedores.sort((a, b) => $$(a, '*').length - $$(b, '*').length)[0];
  if (!car) { if (!$$(d, '#rsvp img').some(esFoto)) c.aviso('galería: no se encontró'); return; }
  const n = $$(car, 'img').filter(esFoto).length;
  const letra = ($$(car, 'img').filter(esFoto)[0]?.getAttribute('src') || '').match(/foto\d+([a-z])\./i)?.[1];
  if (letra) c.info.galeriaLetra = letra;
  // Minimal y Rockabilly: la galería original del diseño (torcida / con puntos) queda tal cual;
  // solo cambian las fotos (el cliente elige la proporción, no el tipo)
  if (GALERIA_FIJA.test(c.id)) {
    const fotos = $$(car, 'img').filter(esFoto);
    const molde = fotos[0];
    molde.setAttribute('data-repetir', 'fotos.galeria');
    molde.setAttribute('data-i-attr', 'src:url');
    molde.setAttribute('data-i-estilo', 'estilo');
    fotos.slice(1).forEach(quitar);
    const w = envolver(d, car, '<div data-seccion="galeria" id="galeria"></div>');
    void w;
    c.info.galeria = n; c.info.galeriaFija = true;
    c.secciones.add('galeria');
    return;
  }
  const top = nivel(car, c.wrap);
  const reemplazo = nodo(d, '<div data-seccion="galeria" id="galeria"><div data-componente="galeria"></div></div>');
  // Si el bloque de primer nivel es solo la galería, se reemplaza entero
  const otro = $$(top, 'h1,h2,h3,h4,p').some((e) => !car.contains(e) && txt(e).length > 2);
  // El bloque de primer nivel queda (con su fondo); el carrusel viejo pasa a ser el componente, en su propio
  // contenedor con data-seccion (así, si se apaga la galería, no se va nada más). Dentro de una fila, de ancho completo.
  const fila = car.parentElement?.classList?.contains('row');
  const caja = nodo(d, `<div${fila ? ' class="col-12 p-0"' : ''} data-seccion="galeria" id="galeria"><div data-componente="galeria"></div></div>`);
  const soloGaleria = !otro && !$$(top, 'img').some((i) => !car.contains(i));
  // README (ronda 21): la galería va debajo de la historia, dentro de esa sección, así toma su fondo
  // y no quedan franjas en blanco. Se puede cuando el bloque de la galería es solo la galería y viene
  // justo después de la sección con texto (la historia o la primera sección).
  const vecino = (dir) => {
    let x = top[dir];
    while (x && (/^(SCRIPT|STYLE|LINK)$/.test(x.tagName) || (!txt(x).trim() && !$$(x, 'h1,h2,h3,h4,p').length))) x = x[dir];
    return x && x.id !== 'home-section' && !x.querySelector('#home-section,audio') && $$(x, 'h1,h2,h3,h4,p').some((e) => txt(e).length > 2) ? x : null;
  };
  const conHistoria = (x) => x && x.querySelector('[data-campo-html="historia.texto"],[data-t="historia.titulo"]');
  const ant = vecino('previousElementSibling'), sig = vecino('nextElementSibling');
  // Primero la sección de la historia (antes o después, Beach); si no, la sección de antes
  const prev = conHistoria(ant) ? ant : conHistoria(sig) ? sig : ant;
  const conTexto = !!prev;
  if (soloGaleria && conTexto && !c.info.galeriaFija) {
    car.parentNode.replaceChild(caja, car);
    caja.removeAttribute('class');
    caja.classList.add('ai-galeria-historia');
    prev.appendChild(caja);
    // Los separadores sueltos entre las dos (imágenes sin texto) quedan como estaban
    top.remove();
    c.info.galeriaEnHistoria = true;
  } else if (soloGaleria && top !== car) {
    // El bloque es solo la galería: la marca va en el bloque (con su fondo)
    car.parentNode.replaceChild(nodo(d, '<div data-componente="galeria"></div>'), car);
    top.setAttribute('data-seccion', 'galeria'); if (!top.id) top.id = 'galeria';
  } else car.parentNode.replaceChild(caja, car);
  void reemplazo;
  c.info.galeria = n;
  c.secciones.add('galeria');
}

// ── 6. Ceremonia y celebración ───────────────────────────────────────────
function lugar(c, col, cual) {
  const d = c.doc;
  const h = $(col, 'h2') || $(col, 'h3') || $(col, 'h4') || $(col, 'h1');
  if (h) { h.setAttribute('data-campo', `${cual}.titulo`); h.removeAttribute('data-t'); }
  for (const i of $$(col, 'img')) {
    const s = i.getAttribute('src') || '';
    if (/img-demo\/(iglesia|lugar)|demo-(iglesia|lugar)|\/(iglesia|lugar)\d*\.jpe?g$/i.test(s)) {
      // Foto redonda en el diseño: la proporción del modelo es cuadrada
      if (/rounded-circle/.test(i.getAttribute('class') || '')) { c.info.propLugar = '1/1'; i.classList.add('ai-lugar-redondo'); }
      i.setAttribute('src', `../../comun/img/demo-${cual === 'ceremonia' ? 'iglesia' : 'lugar'}.jpg`);
      i.setAttribute('data-si', `${cual}.foto`); i.setAttribute('data-attr', `src:c:${cual}.foto;style:c:${cual}.fotoEstilo`);
    }
  }
  const spans = $$(col, 'span,p,h2,h3,h4,h5,h6').filter((e) => !e.querySelector('span,p'));
  const dia = spans.find((e) => /^(D[IÍ]A Y HORARIO|D[IÍ]A Y HORA|FECHA Y HORA|DAY (AND|&) TIME|DATE (AND|&) TIME|CU[AÁ]NDO|DATA E HOR[AÁ]RIO)$/i.test(txt(e)));
  const lug = spans.find((e) => /^(LUGAR|PLACE|LOCATION|D[OÓ]NDE|VENUE|LOCAL)$/i.test(txt(e)));
  if (dia) dia.setAttribute('data-t', 'lugar.diaHorario'); else c.aviso(`${cual}: sin "DÍA Y HORARIO"`);
  if (lug) lug.setAttribute('data-t', 'lugar.lugar'); else c.aviso(`${cual}: sin "LUGAR"`);
  const fh = spans.find((e) => RE_FECHA_HORA.test(txt(e)) || (RE_FECHA.test(txt(e)) && /\d{1,2}:\d{2}/.test(txt(e))));
  // "12 de septiembre de 2027 a las 20:00" → la fecha larga
  const fl = !fh && spans.find((e) => /\d{1,2} de [a-záéíóú]+ de \d{4}|[A-Z][a-z]+ \d{1,2}, \d{4}/i.test(txt(e)));
  if (fh) marcarFecha(fh, cual);
  else if (fl) fl.setAttribute('data-campo', `${cual}.fechaLarga`);
  else c.aviso(`${cual}: sin fecha y hora`);
  // El lugar: el primer texto después de "LUGAR" (subiendo al párrafo que lo contiene)
  if (lug) {
    let ref = subir(lug, (x) => x.parentElement === lug.parentElement?.parentElement || x.nextElementSibling) || lug;
    let p = ref.nextElementSibling;
    while (p && !txt(p)) p = p.nextElementSibling;
    if (p && !p.querySelector('button') && p.tagName !== 'BUTTON') p.setAttribute('data-campo', `${cual}.lugarTexto`);
    else c.aviso(`${cual}: sin texto del lugar`);
  }
  // Agendar
  const ag = $(col, cual === 'ceremonia' ? '#iglesia-button' : '#fiesta-button') || $$(col, 'button,a').find((b) => /agendar|add to calendar|guardar en/i.test(txt(b)));
  if (ag) {
    ag.removeAttribute('id'); ag.setAttribute('data-agendar', cual);
    const ico = $(ag, '[class*="icon-"]');
    ag.innerHTML = `${ico ? ico.outerHTML + ' ' : '<i class="icon-calendar" aria-hidden="true"></i> '}<span data-t="boton.agendar">Agendar</span>`;
  } else c.aviso(`${cual}: sin botón Agendar`);
  // Mapa
  const n = cual === 'ceremonia' ? 1 : 2;
  const bm = $(col, `[data-src="#map${n}"]`) || $(col, '[data-src^="#map"]');
  const modal = bm && $(c.doc, bm.getAttribute('data-src'));
  if (bm) {
    bm.setAttribute('data-si', `${cual}.mapa.embed`);
    const ico = $(bm, '[class*="icon-"]');
    bm.innerHTML = `${ico ? ico.outerHTML + ' ' : ''}<span data-t="boton.comoLlegar">¿CÓMO LLEGAR?</span>`;
  }
  if (modal) {
    if (!col.contains(modal)) col.appendChild(modal);
    const ti = $$(modal, 'p,h2,h3,h4').find((e) => /c[oó]mo llegar|how to get/i.test(txt(e)));
    if (ti) ti.setAttribute('data-t', 'mapa.titulo');
    const ifr = $(modal, 'iframe');
    if (ifr) {
      const caja = ifr.parentElement;
      const link = $(modal, 'a[href*="maps"]') || $(modal, 'a');
      const nuevo = nodo(d, `<iframe width="100%" height="400" style="border:0;" loading="lazy" title="Mapa" data-attr="data-src:c:${cual}.mapa.embed" src="about:blank"></iframe>`);
      ifr.parentNode.replaceChild(nuevo, ifr);
      if (link) {
        link.setAttribute('href', '#'); link.setAttribute('rel', 'noopener'); link.setAttribute('data-attr', `href:c:${cual}.mapa.link`);
        const ico = $(link, '[class*="icon-"]');
        link.innerHTML = `${ico ? ico.outerHTML + ' ' : ''}<span data-t="mapa.abrir">Ver en la app de Google Maps</span>`;
      }
      void caja;
    }
  } else if (bm) c.aviso(`${cual}: sin ventana del mapa`);
}
function agenda(c) {
  const d = c.doc;
  const bC = $(d, '#iglesia-button'), bF = $(d, '#fiesta-button');
  const colDe = (b) => subir(b, (x) => esCol(x) && $$(x, 'h1,h2,h3,h4').length >= 1) || subir(b, (x) => x.tagName === 'DIV' && $$(x, 'h1,h2,h3,h4').length === 1);
  const colC = bC && colDe(bC), colF = bF && colDe(bF);
  if (!colF) { c.aviso('agenda: no se encontró la celebración (#fiesta-button)'); return; }
  const sec = subir(colF, (x) => x.tagName === 'SECTION') || nivel(colF, c.wrap);
  if (!sec.id) sec.id = 'inicio';
  c.info.idAgenda = sec.id;
  if (colC) {
    colC.setAttribute('data-si', 'ceremonia.separada');
    lugar(c, colC, 'ceremonia');
    // El separador entre las dos columnas (una línea en el celular) se va con la ceremonia
    if (colC.parentNode === colF.parentNode) {
      for (let x = colC.nextElementSibling; x && x !== colF; x = x.nextElementSibling) {
        if (!txt(x).trim() && !$$(x, 'button,iframe,h1,h2,h3,h4').length) x.setAttribute('data-si', 'ceremonia.separada');
      }
    }
  }
  lugar(c, colF, 'celebracion');
  // Ícono: fiesta, o el de la ceremonia cuando es todo en el mismo lugar
  const icos = $$(colF, 'img').filter((i) => /icon-|party|fiesta|anillo|church|iglesia/i.test(i.getAttribute('src') || ''));
  const oculto = icos.find((i) => i.hasAttribute('hidden'));
  const fiesta = icos.find((i) => !i.hasAttribute('hidden'));
  // README (ronda 21): en la boda sin ceremonia aparte (sin ceremonia o en el mismo lugar) el ícono de la
  // fiesta pasa a ser el de los anillos; nunca una iglesia
  if (fiesta) fiesta.setAttribute('data-no', 'ceremonia.iconoUnico');
  let unico = null;
  if (oculto) { oculto.removeAttribute('hidden'); oculto.setAttribute('data-si', 'ceremonia.iconoUnico'); unico = oculto; }
  else if (fiesta && colC) {
    const ic = $$(colC, 'img').find((i) => { const u = i.getAttribute('src') || ''; return /(icon-|iglesia|church|anillo)[^/]*\.(png|svg|webp)$/i.test(u) && !/demo-/.test(u) && !i.hasAttribute('data-attr'); });
    if (ic) { const x = ic.cloneNode(true); x.setAttribute('data-si', 'ceremonia.iconoUnico'); x.removeAttribute('data-no'); x.removeAttribute('data-si-x'); despues(fiesta, x); unico = x; }
  }
  if (unico && c.evento === 'boda') {
    const src = unico.getAttribute('src') || '';
    const anillos = src.replace(/icon-church(-[a-z-]+)?\.png$/i, (_, k) => `icon-anillos${k || ''}.png`).replace(/iglesia-retro\.png$/, 'icon-anillos-b.png');
    if (anillos !== src) unico.setAttribute('src', anillos);
  }
}

// ── 7. Confirmación ──────────────────────────────────────────────────────
const RSVP_P = (clase, inner) => `<p class="${clase}"
                 data-rsvp="texto"
                 data-bloque-invitado-class="mb-4"
                 data-bloque-invitado-inner="${inner}"
                 data-bloque-general-class="mb-4"
                 data-attr="data-texto-abierto-libre:c:rsvp.texto; data-fecha-texto:t:rsvp.hasta; data-texto-cerrado:t:rsvp.finalizado"
                 data-texto-abierto-libre="Tu presencia hará que este día sea realmente especial e inolvidable."
                 data-fecha-texto="Se reciben confirmaciones hasta el"
                 data-texto-cerrado="El plazo de confirmación ha finalizado.">
              </p>`;
const RSVP_BOTON_ATTR = {
  'data-fancybox': '', 'data-src': '#confirmar-rsvp', 'data-animation-duration': '700', 'data-rsvp': 'boton',
  'data-attr': 'data-fecha:c:rsvp.cierre; data-idioma:c:idioma.fechas; data-formato:c:rsvp.formato; data-texto-abierto:t:rsvp.botonHtml; data-texto-cerrado:t:rsvp.cerradoHtml',
  'data-fecha': '2027-08-10', 'data-idioma': 'es-ES', 'data-formato': 'corto',
  'data-texto-abierto': "<i class='icon-send-o' aria-hidden='true'></i> CONFIRMAR ASISTENCIA",
  'data-texto-cerrado': "<i class='icon-send-o' aria-hidden='true'></i> CONFIRMACIONES CERRADAS",
};
function rsvp(c) {
  const d = c.doc;
  const boton = $(d, '[data-rsvp="boton"]');
  if (!boton) { c.aviso('confirmación: sin botón data-rsvp'); return null; }
  const top = subir(boton, (x) => x.tagName === 'SECTION' && x.parentElement) || nivel(boton, c.wrap);
  const p = $(top, '[data-rsvp="texto"]');
  if (p) {
    // La tarjeta del invitado del diseño, como plantilla (nombre, pases, mesa los pone el script)
    const tarjeta = $(p, 'div') || (p.nextElementSibling?.tagName === 'DIV' && p.nextElementSibling.querySelector('.icon-user-circle-o') ? p.nextElementSibling : null);
    let inner = "<div class='text-center pl-2 pr-2 pb-3 pt-3 ml-2 mr-2 mb-4 mt-0 g-tarjeta-invitado'><i class='icon-user-circle-o h3 font-weight-normal' aria-hidden='true' style='opacity:.7'></i><br><p class='text-uppercase font-weight-bold mb-0' id='nombre'></p><p class='border-bottom mb-2 mt-1 ml-5 mr-5'></p><p class='small text-uppercase mb-0 mt-0' id='pases'></p><p class='font-weight-bolder small text-uppercase mb-0 mt-0' id='mesa'></p></div>";
    if (tarjeta) {
      const t = tarjeta.cloneNode(true);
      const ps = $$(t, 'p');
      const nombre = ps.find((x) => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ [A-ZÁÉÍÓÚÑ]/.test(txt(x)) && !/mesa|pase/i.test(txt(x)));
      const pases = ps.find((x) => /pase|pass/i.test(txt(x)));
      const mesa = ps.find((x) => /mesa|table/i.test(txt(x)));
      if (nombre) { nombre.id = 'nombre'; nombre.textContent = ''; }
      if (pases) { pases.id = 'pases'; pases.textContent = ''; }
      if (mesa) { mesa.id = 'mesa'; mesa.textContent = ''; }
      if (nombre && pases && mesa) inner = t.outerHTML.replace(/\s*\n\s*/g, '').replace(/"/g, "'");
      if (tarjeta.parentElement !== p) quitar(tarjeta);
    }
    const nuevo = nodo(d, RSVP_P(clases(p).join(' '), inner.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')));
    p.parentNode.replaceChild(nuevo, p);
  } else c.aviso('confirmación: sin párrafo data-rsvp="texto"');
  for (const a of [...boton.attributes].map((x) => x.name)) if (a.startsWith('data-') || a === 'href') boton.removeAttribute(a);
  for (const [k, v] of Object.entries(RSVP_BOTON_ATTR)) boton.setAttribute(k, v);
  boton.innerHTML = '';
  const ti = hoja(top, 'h1,h2,h3,h4', (t) => /confirm|rsvp/i.test(t));
  if (ti) ti.setAttribute('data-t', 'rsvp.titulo');
  // El formulario viejo → el común
  const modal = $(d, '#confirmar-rsvp');
  const comp = nodo(d, '<div data-componente="rsvp-form" data-clase-titulo="text-center text-black mb-4 font-weight-bolder border-bottom border-dark"></div>');
  if (modal) { modal.parentNode.replaceChild(comp, modal); } else { const f = $(top, '[data-rsvp="fecha"]'); (f ? subir(f, (x) => x.tagName === 'DIV') || f : boton).after(comp); }
  // Foto de la confirmación
  let foto = $$(top, 'img').find((i) => /(^|\/)rsvp\d*\.(jpe?g|webp)$/i.test(i.getAttribute('src') || ''));
  // La foto como fondo de una caja (Rockabilly: la cabecera "CONFIRMAR ASISTENCIA")
  const fondo = !foto && $$(top, '[style*="rsvp"]').find((x) => /url\([^)]*rsvp\d*\.(jpe?g|webp)\)/i.test(x.getAttribute('style') || ''));
  if (fondo) {
    const u = (fondo.getAttribute('style').match(/url\(([^)]*rsvp\d*\.(?:jpe?g|webp))\)/i) || [])[1];
    if (u) c.fotos.add(u.replace(/['"]/g, ''));
    fondo.setAttribute('data-bg', 'fotos.rsvp');
    const col = subir(fondo, (x) => esCol(x) && x.parentElement?.classList?.contains('row')) || fondo;
    col.setAttribute('data-si', 'fotos.rsvp');
    foto = fondo;
  } else if (foto) {
    c.fotos.add(foto.getAttribute('src'));
    foto.setAttribute('data-attr', 'src:c:fotos.rsvp;style:c:fotos.rsvpEstilo');
    const col = subir(foto, (x) => esCol(x)) || foto;
    col.setAttribute('data-si', 'fotos.rsvp');
  }
  // La galería dentro de la confirmación (Armonía, Elegance…): galeria.enRsvp en modelo.json
  const enRsvp = $$(top, '.carousel, .owl-carousel').find((x) => $$(x, 'img').filter((i) => /(^|\/)(foto|galeria-)\d+\./.test(i.getAttribute('src') || '')).length >= 3);
  if (enRsvp) {
    const col = subir(enRsvp, (x) => esCol(x)) || enRsvp;
    enRsvp.parentNode.replaceChild(nodo(d, '<div data-componente="galeria" data-rsvp="1"></div>'), enRsvp);
    c.info.galeriaEnRsvp = true; c.secciones.add('galeria');
    void col;
  }
  c.secciones.add('rsvp');
  if (top.id === 'rsvp') top.removeAttribute('id');
  c.info.rsvpConFoto = !!foto;
  return { top, conFoto: !!foto };
}

// ── 8. Dress code, hospedaje, bus ────────────────────────────────────────
// La columna de la fila (no un col-11 que envuelve solo el título, Disco)
function colDe(el, sec) { return subir(el, (x) => esCol(x) && sec.contains(x) && x !== sec && x.parentElement?.classList?.contains('row')) || subir(el, (x) => esCol(x) && sec.contains(x) && x !== sec) || subir(el, (x) => x.parentElement && x.parentElement.classList?.contains('row')); }
// El texto debajo de un título: el párrafo hermano o, si el título está envuelto, el primero que le sigue en la columna
function textoDe(h, col) {
  const boton = $$(col, 'button,a.btn').find((x) => antesQue(h, x) && !x.closest('.animated-modal'));
  return siguienteP(h) || $$(col, 'p').find((p) => antesQue(h, p) && (!boton || antesQue(p, boton)) && txt(p) && !p.closest('.animated-modal') && !p.querySelector('button,a') && !p.hasAttribute('data-t') && !p.hasAttribute('data-campo-html')) || null;
}
function dresscode(c) {
  const d = c.doc;
  const ancla = $(d, '[data-src="#dress"]') || hoja(d.body, 'h1,h2,h3,h4', (t) => /^dr?ess ?code$|^vestimenta$|^c[oó]digo de vestimenta$/i.test(t));
  if (!ancla) { c.aviso('dress code: no se encontró'); return; }
  // La sección entera (en algunos diseños el id="dresscode" está en la columna del dress, no en la sección)
  const idViejo = $(d, '#dresscode');
  const sec = (idViejo && (idViejo.tagName === 'SECTION' ? idViejo : subir(idViejo, (x) => x.tagName === 'SECTION'))) || subir(ancla, (x) => x.tagName === 'SECTION') || nivel(ancla, c.wrap);
  if (idViejo && idViejo !== sec) idViejo.removeAttribute('id');
  sec.id = 'dresscode';
  // README (ronda 21): en Cinema, Lila y Travel, con las tres apagadas queda la franja (su fondo y su adorno)
  const cont = /^(cinema|lila|travel)$/.test(c.id) && $$(sec, '.container').find((x) => x.parentElement === sec || x.parentElement?.parentElement === sec);
  if (cont) { cont.setAttribute('data-si', 'grupos.dress'); sec.classList.add('ai-dress-franja'); }
  else sec.setAttribute('data-si', 'grupos.dress');
  // Separadores sueltos entre columnas (una línea en el celular): van con la columna que sigue
  for (const s of $$(sec, '.row > div')) {
    if (!esCol(s) || $$(s, 'h2,h3,button,img,i').length) continue;
    if (/show-mobile|hr|border/.test(s.outerHTML) && txt(s) === '' && s.nextElementSibling) { s.nextElementSibling.insertBefore(s, s.nextElementSibling.firstChild); s.removeAttribute('class'); s.setAttribute('class', 'col-12 p-0 show-mobile ai-sep'); }
  }
  // Dress
  const hD = hoja(sec, 'h1,h2,h3,h4', (t) => /^dr?ess ?code$|vestimenta/i.test(t));
  if (hD) {
    const col = colDe(hD, sec) || hD.parentElement;
    col.setAttribute('data-si', 'grupos.dressCol');
    for (const e of [...col.children]) {
      if (e === hD) break;
      if (e.matches('img,i,div,p') && !txt(e)) e.setAttribute('data-seccion', 'dresscode');
    }
    hD.setAttribute('data-seccion', 'dresscode'); hD.setAttribute('data-t', 'dress.titulo');
    // El texto: el primer párrafo de la columna después del título (antes del botón)
    // La caja con el botón de sugerencias (a veces el texto queda fuera de la columna del título)
    const caja = $(col, '[data-src="#dress"]') ? col : subir(hD, (x) => !!$(x, '[data-src="#dress"]') && x !== sec) || col;
    const boton0 = $(caja, '[data-src="#dress"]');
    let p = $$(caja, 'p,h4,h5').find((x) => x !== hD && txt(x) && antesQue(hD, x) && !x.closest('#dress') && !x.querySelector('button') && (!boton0 || antesQue(x, boton0)));
    if (!p) {
      // Sin texto en la invitación (estaba en la ventana): se agrega, con el estilo del texto de hospedaje
      const modelo = $$(sec, 'p').find((x) => /hoteles|referencias/i.test(txt(x)));
      p = nodo(d, `<p class="${modelo ? clases(modelo).join(' ') : 'text-center'}">Formal y elegante. Por favor no usar blanco.</p>`);
      despues(subir(hD, (x) => x.parentElement === col) || hD, p);
    }
    p.setAttribute('data-seccion', 'dresscode'); p.setAttribute('data-campo-html', 'dresscode.texto');
    // El texto que repetía la ventana de sugerencias
    const repe = $$(d, '#dress span.font-weight-light').find((x) => /formal|elegante/i.test(txt(x)));
    if (repe) { const br = repe.previousElementSibling; if (br?.tagName === 'BR') quitar(br); quitar(repe); }
    // Colores a evitar
    const evitar = nodo(d, `<div class="g-evitar mb-3" data-seccion="estilos" data-si="dresscode.evitar">
            <p class="${clases(p || hD).filter((k) => /^text-|inclinad|skew/.test(k)).join(' ') || 'text-white'} mb-2 g-evitar-titulo"><span class="${clases(p || hD).filter((k) => /^bg-/.test(k)).length ? clases(p || hD).filter((k) => /^bg-/.test(k)).join(' ') + ' p-1' : ''}" data-t="dress.evitar">Colores a evitar</span></p>
            <div class="g-evitar-colores"><span class="g-evitar-color" role="img" data-repetir="dresscode.evitar" data-i-attr="style:estilo;aria-label:color" style="background-color:#ffffff"></span></div>
          </div>`);
    despues(p || hD, evitar);
    const bs = $(sec, '[data-src="#dress"]');
    if (bs) {
      const caja = subir(bs, (x) => x.tagName === 'DIV' && x.children.length === 1) || bs;
      caja.setAttribute('data-seccion', 'estilos'); caja.setAttribute('data-si', 'dresscode.sugerencias');
      bs.setAttribute('data-t', 'dress.boton');
    }
    const m = $(d, '#dress');
    if (m) {
      if (!col.contains(m)) col.appendChild(m);
      m.setAttribute('data-seccion', 'estilos'); m.setAttribute('data-si', 'dresscode.sugerencias');
      const t = $$(m, 'p').find((x) => /sugerencias|estilos|suggest/i.test(txt(x)));
      if (t) { t.innerHTML = 'Sugerencias de estilos'; t.setAttribute('data-t', 'dress.modal'); }
      const items = $$(m, '.item');
      items.forEach((it, i) => {
        if (i > 2) { quitar(it); return; }
        it.setAttribute('data-repetir', 'dresscode.fotos');
        const im = $(it, 'img');
        if (im) { im.setAttribute('src', `../../comun/img/demo-dress${i + 1}.jpg`); im.setAttribute('data-i-attr', 'src:url;style:estilo'); im.removeAttribute('loading'); im.setAttribute('alt', ''); }
      });
      if (items[0]?.parentElement?.id === 'posts2') items[0].parentElement.removeAttribute('id');
      cerrar(m);
    }
  }
  // Hospedaje
  const bH = $(sec, '[data-src="#hospedaje"]') || $(d, '[data-src="#hospedaje"]');
  const hH = hoja(sec, 'h1,h2,h3,h4', (t) => /hospedaje|alojamiento|accommodation|hoteles/i.test(t));
  if (hH) {
    const col = colDe(hH, sec);
    col.setAttribute('data-seccion', 'hospedaje'); col.id = 'hospedaje-bus';
    hH.setAttribute('data-t', 'hospedaje.titulo');
    const p = textoDe(hH, col);
    if (p) p.setAttribute('data-t', 'hospedaje.texto');
    if (bH) { const caja = subir(bH, (x) => x.tagName === 'DIV' && x.children.length === 1) || bH; caja.setAttribute('data-si', 'hospedaje.conReferencias'); bH.setAttribute('data-t', 'hospedaje.boton'); }
    const m = $(d, '#hospedaje');
    if (m) {
      if (!col.contains(m)) col.appendChild(m);
      const t = $$(m, 'p').find((x) => x.classList.contains('font-weight-bolder') || /referencias|hoteles/i.test(txt(x)));
      if (t) { t.textContent = 'Hospedaje'; t.setAttribute('data-campo', 'hospedaje.modalTitulo'); despues(t, nodo(d, '<p class="text-center" data-si="hospedaje.texto" data-campo-html="hospedaje.texto"></p>')); }
      const ul = $(m, 'ul');
      if (ul) {
        ul.setAttribute('data-si', 'hospedaje.items');
        ul.innerHTML = `
                <li data-repetir="hospedaje.items"><p class="mb-1"><span data-i="nombre">Hilton</span><span data-si="direccion"> - <span data-i="direccion">Ruta 21, Km. 60.5</span></span><span data-si="link"> - <a class="text-black font-weight-bold" target="_blank" rel="noopener" href="#" data-i-attr="href:link" data-t="hospedaje.reservas">Reservas</a></span></p></li>
                <li data-repetir="hospedaje.items"><p class="mb-1"><span data-i="nombre">Sheraton</span><span data-si="direccion"> - <span data-i="direccion">Av. Principal 321</span></span><span data-si="link"> - <a class="text-black font-weight-bold" target="_blank" rel="noopener" href="#" data-i-attr="href:link" data-t="hospedaje.reservas">Reservas</a></span></p></li>
              `;
      }
      cerrar(m);
    }
    c.secciones.add('hospedaje');
  }
  // Bus / traslado
  const hB = hoja(sec, 'h1,h2,h3,h4', (t) => /bus|traslado|transporte|transfer|shuttle/i.test(t));
  if (hB) {
    const col = colDe(hB, sec);
    col.setAttribute('data-seccion', 'bus'); col.id = 'traslado';
    hB.setAttribute('data-t', 'bus.titulo');
    const p = textoDe(hB, col);
    if (p) p.setAttribute('data-t', 'bus.texto');
    const bB = $(d, '[data-src="#bus"]');
    if (bB) { const caja = subir(bB, (x) => x.tagName === 'DIV' && x.children.length === 1) || bB; caja.setAttribute('data-si', 'busConRecorrido'); bB.setAttribute('data-t', 'bus.boton'); }
    const m = $(d, '#bus');
    if (m) {
      if (!col.contains(m)) col.appendChild(m);
      const t = $$(m, 'p').find((x) => x.classList.contains('font-weight-bolder'));
      if (t) { t.textContent = 'Servicio de Bus'; t.setAttribute('data-campo', 'bus.modalTitulo'); despues(t, nodo(d, '<p class="text-center text-black" data-si="bus.textoLibre" data-campo-html="bus.textoLibre"></p>')); }
      const etiquetas = $$(m, 'p').filter((x) => /section-sub-title/.test(x.getAttribute('class') || '') || ($(x, 'span') && /bg-/.test($(x, 'span').getAttribute('class') || '')));
      etiquetas.forEach((e, i) => {
        const det = e.nextElementSibling;
        if (i > 1) { quitar(det); quitar(e); return; }
        const g = nodo(d, '<div data-repetir="bus.paradas"></div>');
        antes(e, g); g.appendChild(e); if (det) g.appendChild(det);
        const sp = $(e, 'span') || e; sp.setAttribute('data-i', 'etiqueta');
        if (det) det.setAttribute('data-i', 'detalle');
      });
      cerrar(m);
    }
    c.secciones.add('bus');
  }
  c.secciones.add('dresscode');
  if ($(d, '#dress')) c.secciones.add('estilos');
}
function siguienteP(h) {
  for (let p = h.nextElementSibling; p; p = p.nextElementSibling) {
    if (p.tagName === 'P' && txt(p) && !p.querySelector('button,a')) return p;
    if (p.querySelector?.('button') || p.tagName === 'BUTTON') return null;
  }
  return null;
}
function cerrar(m) { const b = $(m, '[data-fancybox-close]'); if (b) b.setAttribute('data-t', 'boton.cerrar'); }

// ── 9. Itinerario ────────────────────────────────────────────────────────
function itinerario(c) {
  const d = c.doc;
  const tl = $(d, '#timeline');
  if (!tl) { c.aviso('itinerario: sin #timeline'); return; }
  const sec = subir(tl, (x) => x.tagName === 'SECTION') || nivel(tl, c.wrap);
  sec.id = 'itinerario'; sec.setAttribute('data-seccion', 'itinerario');
  const h = hoja(sec, 'h1,h2,h3,h4', (t) => /itinerario|cronograma|timeline|programa/i.test(t));
  if (h) h.setAttribute('data-t', 'itinerario.titulo');
  const items = $$(tl, '.timeline-item');
  const iconos = items.map((it) => basename($(it, 'img')?.getAttribute('src') || '').replace(/^timeline-icon-|\.png$/g, ''));
  c.info.iconosItinerario = iconos.filter(Boolean);
  items.forEach((it, i) => {
    if (i > 1) { quitar(it); return; }
    it.setAttribute('data-repetir', 'itinerario.items');
    it.setAttribute('class', 'timeline-item');
    const im = $(it, 'img');
    if (im) { im.setAttribute('data-si', 'iconoUrl'); im.setAttribute('data-i-attr', 'src:iconoUrl'); im.setAttribute('alt', ''); }
    const hora = $$(it, 'p').find((x) => /\d{1,2}:\d{2}/.test(txt(x)));
    if (hora) hora.setAttribute('data-i', 'hora');
    const t = $(it, 'h2') || $(it, 'h3') || $(it, 'h4');
    if (t) t.setAttribute('data-i', 'texto');
  });
  c.secciones.add('itinerario');
}

// Color de cada pluma (icon-testigos-*.png), para el ícono de dos personas de Cómplices
const PLUMAS = {"icon-testigos.png": "#000000", "icon-testigos-rosa.png": "#e62f83", "icon-testigos-ocre.png": "#d19643", "icon-testigos-lila.png": "#73527f", "icon-testigos-w.png": "#ffffff", "icon-testigos-bordo.png": "#890029", "icon-testigos-azul.png": "#4c8ca5", "icon-testigos-graffiti.png": "#a26e50", "icon-testigos-bordo-cinema.png": "#65201e", "icon-testigos-b.png": "#a78977", "icon-testigos-verde-oscuro.png": "#184d41", "icon-testigos-g.png": "#9c916b"};
// ── 10. Testigos / padrinos / cómplices ──────────────────────────────────
function testigos(c) {
  const d = c.doc;
  const h = hoja(d.body, 'h1,h2,h3,h4', (t) => /testigos|padrinos|c[oó]mplices|godparents|witnesses|tripulaci[oó]n|mentores|mentors/i.test(t));
  if (!h) return;
  const sec = $(d, '#testigos') || subir(h, (x) => x.tagName === 'SECTION') || nivel(h, c.wrap);
  sec.id = 'testigos'; sec.setAttribute('data-seccion', 'testigos');
  h.setAttribute('data-t', 'testigos.titulo');
  // Cumpleaños (Cómplices): la pluma de los testigos pasa a ser el ícono de dos personas, del mismo color
  if (c.evento === 'cumple') {
    for (const i of $$(sec, 'img').filter((x) => /icon-testigos/.test(x.getAttribute('src') || ''))) {
      const color = PLUMAS[basename(i.getAttribute('src'))] || 'inherit';
      i.parentNode.replaceChild(nodo(d, `<i class="h1 icon-people" aria-hidden="true" style="color:${color}"></i>`), i);
    }
  }
  const fotos = $$(sec, 'img').filter((i) => /testigo|padrino|demo-/.test(i.getAttribute('src') || '') && !/icon-|\.png$/.test(i.getAttribute('src') || ''));
  const cols = [...new Set(fotos.map((i) => subir(i, (x) => esCol(x))).filter(Boolean))];
  cols.forEach((col, i) => {
    if (i > 1) { quitar(col); return; }
    col.setAttribute('data-repetir', 'testigos.items');
    const im = $(col, 'img');
    if (im) { im.setAttribute('src', `../../comun/img/demo-testigo${i + 1}.jpg`); im.setAttribute('data-si', 'foto'); im.setAttribute('data-i-attr', 'src:foto;style:estilo'); }
    const n = $(col, 'h4') || $(col, 'h3') || $(col, 'h5');
    if (n) n.setAttribute('data-i', 'nombre');
    const r = $(col, 'small') || $$(col, 'p').find((p) => p !== n && txt(p));
    if (r) r.setAttribute('data-i', 'rol');
  });
  if (!cols.length) c.aviso('testigos: sin fotos de muestra');
  // Diseños con dos grupos (15 de Cinema/Sky: "Los Padres" y "Los Padrinos"): queda un solo grupo; el título es el
  // de arriba de las fotos y el segundo título (con su fila vacía) se va
  const primera = cols[0];
  if (primera) {
    const titulos = $$(sec, 'h1,h2,h3').filter((x) => !primera.contains(x) && !cols.some((k) => k.contains(x)) && txt(x).length > 2);
    const arriba = titulos.filter((x) => antesQue(x, primera)).at(-1);
    const abajo = titulos.filter((x) => antesQue(primera, x));
    if (arriba && abajo.length) {
      h.removeAttribute('data-t'); arriba.setAttribute('data-t', 'testigos.titulo');
      for (const t of abajo) {
        const fila = subir(t, (x) => x.parentElement === primera.closest('.container')) || t;
        const resto = fila.nextElementSibling;
        quitar(fila);
        if (resto && !txt(resto).trim() && !$(resto, 'img')) quitar(resto);
      }
    }
  }
  c.secciones.add('testigos');
}

// ── 11. Álbum QR e Instagram ─────────────────────────────────────────────
function album(c) {
  const d = c.doc;
  const b = $(d, '[data-target="#qr"]');
  if (!b) return null;
  const caja = subir(b, (x) => $$(x, 'h2,h3,h4').length >= 1 && (esCol(x) || x.tagName === 'SECTION'));
  if (!caja) { c.aviso('álbum: sin caja'); return null; }
  const sec = (caja.tagName === 'SECTION' || $$(caja.parentElement, 'h2').length === $$(caja, 'h2').length) ? caja : caja;
  sec.setAttribute('data-seccion', 'album'); sec.id = 'instagram';
  const h = hoja(caja, 'h2,h3,h4', () => true);
  if (h) h.setAttribute('data-t', 'album.titulo');
  const p = h && siguienteP(h);
  if (p) { p.setAttribute('data-t-html', 'album.texto'); }
  b.setAttribute('data-t', 'album.boton');
  const im = $$(caja, 'img').find((i) => /(^|\/)(instagram|album)\d*\.(jpe?g|webp)$/i.test(i.getAttribute('src') || ''));
  if (im) {
    c.fotos.add(im.getAttribute('src'));
    im.setAttribute('data-attr', 'src:c:fotos.album;style:c:fotos.albumEstilo');
    // Armonía y Oliva: la foto del álbum / Instagram cuadrada (redonda en Armonía) y más chica
    if (/^(armonia|oliva|natural|style)$/.test(c.id)) { im.classList.add('ai-foto-1x1', 'ai-album-chica'); if (c.id === 'armonia' || c.id === 'natural') im.classList.add('rounded-circle'); }
    const w = subir(im, (x) => x.parentElement && x.parentElement.children.length > 1) || im;
    w.setAttribute('data-si', 'fotos.album');
  }
  const qr = $(d, '#qr');
  if (qr) qr.parentNode.replaceChild(nodo(d, '<div data-componente="album-qr"></div>'), qr);
  c.secciones.add('album');
  return sec;
}
function hashtag(c) {
  const d = c.doc;
  const h = hoja(d.body, 'h2,h3', (t, e) => /etiquet|tag|instagram/i.test(t) && !$(subir(e, (x) => x.tagName === 'SECTION') || d.body, '[data-target="#qr"]'));
  const tag = hoja(d.body, 'span,h4,h3,p', (t) => /^#\w{4,}$/.test(t));
  const ancla = tag || h;
  if (!ancla) return null;
  const caja = subir(ancla, (x) => $$(x, 'h2,h3').length >= 1 && (esCol(x) || x.tagName === 'SECTION'));
  if (!caja) return null;
  caja.setAttribute('data-seccion', 'instagram'); caja.id = 'hashtag';
  const ti = hoja(caja, 'h2,h3', (t) => !/^#/.test(t));
  if (ti) ti.setAttribute('data-t', 'hashtag.titulo');
  if (tag) {
    tag.setAttribute('data-campo', 'hashtag.texto');
    const w = subir(tag, (x) => x.parentElement && (x.tagName === 'H4' || x.tagName === 'P' || x.tagName === 'H3')) || tag;
    w.setAttribute('data-si', 'hashtag.texto');
  }
  const p = $$(caja, 'p').find((x) => txt(x).length > 40 && !x.contains(tag));
  if (p) p.setAttribute('data-t-html', 'hashtag.texto');
  const im = $$(caja, 'img').find((i) => /(^|\/)(instagram|album)\d*\.(jpe?g|webp)$/i.test(i.getAttribute('src') || ''));
  if (im) {
    c.fotos.add(im.getAttribute('src'));
    im.setAttribute('data-attr', 'src:c:fotos.instagram;style:c:fotos.instagramEstilo');
    const w = subir(im, (x) => x.parentElement && x.parentElement.children.length > 1) || im;
    w.setAttribute('data-si', 'fotos.instagram');
  }
  const link = $$(caja, 'a').find((a) => /instagram\.com|ver fotos|ir a instagram/i.test((a.getAttribute('href') || '') + txt(a)));
  if (link) {
    link.setAttribute('href', '#'); link.setAttribute('data-attr', 'href:c:hashtag.link'); link.setAttribute('data-t', 'hashtag.boton');
    const w = subir(link, (x) => x.tagName === 'DIV' && x.children.length === 1) || link;
    w.setAttribute('data-si', 'hashtag.link');
  }
  c.secciones.add('instagram');
  return caja;
}

// ── 12. Sugerir canciones y playlist ─────────────────────────────────────
function canciones(c) {
  const d = c.doc;
  const b = $(d, '[data-src="#canciones"]');
  if (!b) return;
  // La caja de la música, sin la del álbum (que a veces comparte la sección)
  let caja = subir(b, (x) => $$(x, 'h2,h3,h4').length >= 1 && !x.querySelector('[data-seccion="album"],[data-seccion="instagram"]'));
  if (!caja) { c.aviso('canciones: sin caja'); return; }
  caja.setAttribute('data-seccion', 'canciones'); caja.id = 'musica';
  const h = hoja(caja, 'h2,h3,h4', () => true);
  if (h) h.setAttribute('data-t', 'canciones.titulo');
  const p = h && siguienteP(h);
  if (p) p.setAttribute('data-t-html', 'canciones.texto');
  $$(caja, 'a').filter((a) => /spotify/i.test(txt(a))).forEach(quitar);
  b.setAttribute('data-t', 'canciones.boton');
  quitar($(d, '#canciones-config'));
  const m = $(d, '#canciones');
  if (m) m.parentNode.replaceChild(nodo(d, '<div data-componente="canciones"></div>'), m);
  else despues(b, nodo(d, '<div data-componente="canciones"></div>'));
  const fuente = h ? clases(h).find((k) => !/^(mb|mt|pb|pt|p|m|text|h\d|display)-?/.test(k) && !/^(text-center|font-weight)/.test(k)) : '';
  // La playlist va dentro de la sección Música, después del botón Sugerir (tarjeta blanca redondeada)
  const pl = nodo(d, `<div data-seccion="playlist" id="playlist"><div data-componente="playlist"></div></div>`);
  const tras = subir(b, (x) => x.parentNode === caja) || b;
  if (tras.parentNode === caja) despues(tras, pl); else caja.appendChild(pl);
  c.secciones.add('canciones'); c.secciones.add('playlist');
}

// ── 13. Regalos ──────────────────────────────────────────────────────────
const MODAL_CUENTA = `<div style="display: none;" id="regalo" class="animated-modal p-4" data-selectable="true" data-si="regalos.cuentas">
        <div class="mt-4">
          <div class="mb-4">
            <p class="text-center h4 mb-0"><i class="text-black icon-bank" aria-hidden="true"></i></p>
            <p class="text-center text-black mb-3 font-weight-bolder border-bottom border-dark" data-t="regalos.modalCuenta">Datos Bancarios</p>
            <ul class="list-unstyled font-weight-bolder">
              <li data-repetir="regalos.cuentas"><p class="mb-1"><span class="font-weight-lighter"><span data-i="etiqueta">Alias</span>: </span><span id="dato-{n}" data-i="dato">XXX-XXX-XXX</span> <a href="#" onclick="copiarId('dato-{n}'); return false;" data-si="copiable"><i class="icon-copy"></i></a></p></li>
              <li data-repetir="regalos.cuentas"><p class="mb-1"><span class="font-weight-lighter"><span data-i="etiqueta">Titular</span>: </span><span id="dato-{n}" data-i="dato">Juan Fulano</span> <a href="#" onclick="copiarId('dato-{n}'); return false;" data-si="copiable"><i class="icon-copy"></i></a></p></li>
            </ul>
          </div>
          <button data-fancybox-close class="mt-2 btn btn-block text-uppercase btn-outline-dark btn-small" data-t="boton.cerrar">cerrar</button>
        </div>
      </div>`;
const MODAL_LISTA = `<div style="display: none;" id="regalo2" class="animated-modal p-4" data-selectable="true" data-si="regalos.lista">
        <div class="mt-4">
          <div class="mb-4">
            <p class="text-center h3 mb-0"><i class="text-black icon-gift" aria-hidden="true"></i></p>
            <p class="text-center text-black mb-3 font-weight-bolder border-bottom border-dark" data-t="regalos.modalLista">Lista de regalos</p>
            <ul class="list-unstyled text-center">
              <li><p class="mb-4" data-campo-html="regalos.lista.texto">Creamos una lista de regalos en una tienda online, para que puedas regalar el que gustes</p></li>
              <li class="mb-3" data-repetir="regalos.listas"><p class="font-weight-bolder mb-1"><span class="font-weight-lighter" data-si="etiqueta"><span data-i="etiqueta">Falabella</span></span><span data-si="dato"><span data-si="etiqueta">: </span><span id="lista-{n}" data-i="dato">000000-00</span> <a href="#" onclick="copiarId('lista-{n}'); return false;"><i class="icon-copy"></i></a></span></p><p data-si="link"><a href="#" target="_blank" rel="noopener" class="btn btn-block mb-2 text-uppercase button-gris" data-i-attr="href:link" data-t="regalos.irLista">Ir a la lista</a></p></li>
            </ul>
          </div>
          <button data-fancybox-close class="mt-2 btn btn-block text-uppercase btn-outline-dark btn-small" data-t="boton.cerrar">cerrar</button>
        </div>
      </div>`;
function regalos(c) {
  const d = c.doc;
  const b1 = $(d, '[data-src="#regalo"]'), b2 = $(d, '[data-src="#regalo2"]');
  const ancla = b1 || b2;
  if (!ancla) return;
  const sec = subir(ancla, (x) => x.tagName === 'SECTION') || nivel(ancla, c.wrap);
  sec.id = 'regalos'; sec.setAttribute('data-seccion', 'regalos');
  const h = hoja(sec, 'h2,h3,h4', (t) => /regalo|gift|presente/i.test(t));
  if (h) h.setAttribute('data-t', 'regalos.titulo');
  const p = h && siguienteP(h);
  if (p) p.setAttribute('data-campo-html', 'regalos.texto');
  if (b1) { b1.setAttribute('data-si', 'regalos.cuentas'); b1.setAttribute('data-t', 'regalos.botonCuenta'); }
  if (b2) { b2.setAttribute('data-si', 'regalos.lista'); b2.setAttribute('data-t', 'regalos.botonLista'); }
  const vr = $(sec, '[class*="vr"]');
  if (vr) (subir(vr, (x) => x.tagName === 'DIV' && x.children.length === 1) || vr).setAttribute('data-si', 'regalos.hayBotones');
  const m1 = $(d, '#regalo'), m2 = $(d, '#regalo2');
  const lugar = m1 || m2;
  if (lugar) {
    const ref = nodo(d, '<div></div>'); antes(lugar, ref);
    quitar(m1); quitar(m2);
    ref.insertAdjacentHTML('beforebegin', MODAL_CUENTA + '\n      ' + MODAL_LISTA);
    quitar(ref);
  }
  c.secciones.add('regalos');
}

// ── 14. Cierre, redes, ¿te perdiste algo?, pie ───────────────────────────
function casoDe(e) {
  const t0 = txt(e).replace(/[¡!¿?]/g, '');
  if (t0 !== t0.toUpperCase()) e.setAttribute('data-caso', /^(\S+\s*)+$/.test(t0) && t0.split(/\s+/).every((w) => w[0] === w[0].toUpperCase()) ? 'titulo' : 'oracion');
}
function cierre(c) {
  const d = c.doc;
  const redes = $$(d, 'a').find((a) => $(a, '.icon-instagram,.icon-facebook') && !a.closest('[data-seccion="instagram"],[data-seccion="album"],#hashtag'));
  const tituloRedes = hoja(d.body, 'small,h4,h5,p,span', (t) => /redes oficiales|social media|redes de la|redes del/i.test(t));
  // Los nombres del final (el último título fuera de la portada)
  const ultimos = $$(d.body, 'h1,h2').filter((x) => !x.closest('#home-section') && (x.querySelector('i,span') || /&| y /.test(txt(x))) && txt(x).length < 40);
  // El texto de despedida: el último de la invitación (no el de la confirmación ni el de una ventana)
  const FINAL = /momentos felices|te esperamos para|los esperamos|happiest moments|esperamos compartir|esperamos que nos acompa|hemos luchado mucho|te espero para (celebrar|que)/i;
  const final = $$(d.body, 'p,h4,h5').filter((x) => FINAL.test(txt(x)) && !x.querySelector('p,h4,h5') && !x.closest('#home-section,#rsvp,.animated-modal,.modal,[data-componente]')).at(-1) || null;
  // Si las redes están en el pie y el texto en la sección de antes, manda el texto
  const ancla = final || tituloRedes || redes || ultimos.at(-1);
  const sec = ancla ? subir(ancla, (x) => x.tagName === 'SECTION') || nivel(ancla, c.wrap) : null;
  if (!sec) { c.aviso('cierre: sin sección de cierre'); return; }
  sec.id = 'cierre';
  // Texto final: el párrafo largo antes de los nombres
  const nombres = $$(sec, 'h1,h2,h3').find((x) => x.querySelector('i,span') || /&|y /.test(txt(x)));
  const pie = final && sec.contains(final) ? final : $$(sec, 'p,h4,h5').find((x) => txt(x).length > 60);
  // Lo que repite la portada: la frase y la edad / clase
  for (const e of $$(sec, 'h1,h2,h3,h4,h5,h6,p,span').filter((x) => !x.querySelector('h1,h2,h3,h4,h5,h6,p') && !x.hasAttribute('data-t') && txt(x).length < 45)) {
    const t = txt(e).replace(/\s+/g, ' ').trim();
    if (DETALLE.test(t)) { e.setAttribute('data-t', 'portada.detalle'); casoDe(e); }
    else if (FRASES.test(t)) { e.setAttribute('data-t', 'portada.subtitulo'); casoDe(e); }
  }
  if (pie) {
    pie.setAttribute('data-si', 'pie.mostrar');
    c.info.textoPie = txt(pie).replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim();
    const fuerte = $(pie, 'strong');
    const comillas = $$(pie, '[class*="icon-quote"]');
    if (!fuerte && comillas.length) {
      // Las comillas del diseño quedan; el texto va en su propio span
      const izq = comillas.find((x) => /left/.test(x.getAttribute('class'))), der = comillas.find((x) => /right/.test(x.getAttribute('class')));
      pie.innerHTML = `${izq ? izq.outerHTML + ' ' : ''}<span data-campo-html="pie.texto">${txt(pie)}</span>${der ? ' ' + der.outerHTML : ''}`;
    } else (fuerte || pie).setAttribute('data-campo-html', 'pie.texto');
  } else c.aviso('cierre: sin texto final');
  // Una sola persona: el nombre del cierre es el título corto que no es frase ni detalle (Cars: "Martín")
  const solo = !nombres && $$(sec, 'h1,h2,h3').find((x) => !x.hasAttribute('data-t') && txt(x).length > 1 && txt(x).length < 25 && !x.querySelector('h1,h2,h3') && /^[\p{Lu}][\p{L}\s.'-]*$/u.test(txt(x)) && x !== pie);
  const nom = nombres || (c.evento !== 'boda' && !c.info.nombresSeparados ? solo : null);
  if (nom) { c.info.nombresCierre = nom.innerHTML.trim(); nom.setAttribute('data-campo-html', 'nombres.cierre'); nom.setAttribute('data-ajustar', '0.86'); }
  // Los nombres de la demo que quedan en otras secciones (el pie con las redes, Graffiti/Rockabilly; un h4, Passion)
  const tPortada = c.info.nombresPortada ? txt(nodo(d, `<span>${c.info.nombresPortada}</span>`)).replace(/\s+/g, ' ').trim() : '';
  if (tPortada) {
    for (const x of $$(d.body, 'h1,h2,h3,h4,h5,p').filter((e) => !e.closest('#home-section') && !e.hasAttribute('data-campo-html') && !e.hasAttribute('data-campo') && !e.closest('[data-campo-html],[data-campo]') && !e.querySelector('h1,h2,h3,h4,h5,p,img'))) {
      if (txt(x).replace(/\s+/g, ' ').trim() !== tPortada) continue;
      x.setAttribute('data-campo-html', 'nombres.cierre'); x.setAttribute('data-ajustar', '0.86');
      c.info.nombresCierre ||= x.innerHTML.trim();
    }
  }
  if (redes) {
    const esRed = (a) => $(a, '.icon-instagram,.icon-facebook') || /tiktok/i.test(a.innerHTML);
    let caja = subir(redes, (x) => x.tagName === 'DIV' && $$(x, 'a').filter(esRed).length >= 2) || redes.parentElement;
    // Si la caja trae otras cosas (los nombres, Beach), la marca va solo en los íconos: apagar las redes no borra nada más
    const otros = $$(caja, 'h1,h2,h3,h4,p,img').filter((e) => !e.closest('a') && e !== tituloRedes && !(tituloRedes && tituloRedes.contains(e)) && !(e.contains && e.contains(redes)));
    if (otros.length) {
      const links = $$(caja, 'a').filter(esRed);
      const padre = links[0].parentNode;
      if (links.every((a) => a.parentNode === padre)) {
        const w = d.createElement('div'); w.setAttribute('class', 'ai-redes-iconos');
        padre.insertBefore(w, links[0]); links.forEach((a) => w.appendChild(a));
        caja = w;
        if (tituloRedes && !w.contains(tituloRedes)) { tituloRedes.setAttribute('data-si', 'redes.hay'); tituloRedes.setAttribute('data-seccion', 'redes'); }
      }
    }
    caja.classList.add('ai-redes');
    caja.setAttribute('data-seccion', 'redes'); caja.setAttribute('data-si', 'redes.hay');
    if (tituloRedes) tituloRedes.setAttribute('data-t', 'redes.titulo');
    for (const a of $$(caja, 'a')) {
      const red = $(a, '.icon-instagram') ? 'instagram' : $(a, '.icon-facebook') ? 'facebook' : /tiktok/.test(a.innerHTML) ? 'tiktok' : null;
      if (!red) continue;
      a.setAttribute('href', '#'); a.setAttribute('rel', 'noopener'); a.setAttribute('data-si', `redes.${red}`); a.setAttribute('data-attr', `href:c:redes.${red}`);
      if (red === 'tiktok') { const im = $(a, 'img'); if (im) im.setAttribute('alt', 'TikTok'); }
    }
    c.secciones.add('redes');
  }
}
const PERDISTE = [
  ['rsvp', '#rsvp', 'perdiste.rsvp', 'Confirmar asistencia'], [null, '#inicio', 'perdiste.agendar', 'Agendar evento'],
  ['dresscode', '#dresscode', 'perdiste.dress', 'Dress code'], ['hospedaje', '#hospedaje-bus', 'perdiste.hospedaje', 'Hospedaje'],
  ['bus', '#traslado', 'perdiste.bus', 'Traslado'], ['itinerario', '#itinerario', 'perdiste.itinerario', 'Itinerario'],
  ['instagram', '#hashtag', 'perdiste.instagram', 'Instagram Wall'], ['album', '#instagram', 'perdiste.album', 'Álbum de fotos'],
  ['canciones', '#musica', 'perdiste.canciones', 'Sugerir canción'], ['regalos', '#regalos', 'perdiste.regalos', 'Regalos'],
  [null, '#home-section', 'perdiste.inicio', 'Inicio'],
];
function perdiste(c) {
  const d = c.doc;
  const agenda = '#' + (c.info.idAgenda || 'inicio');
  const lista = (clase) => PERDISTE.filter(([s]) => !s || c.secciones.has(s))
    .map(([s, href, t, x]) => `<li${s ? ` data-seccion="${s}"` : ''}><a href="${href === '#inicio' ? agenda : href}" class="${clase}" data-t="${t}">${x}</a></li>`).join('\n            ');
  let h = hoja(d.body, 'h1,h2,h3,h4,h5,h6,p,span', (t) => /^¿?te perdiste algo\??$|did you miss|^accesos? r[aá]pidos?$/i.test(t));
  // README (ronda 21): si el diseño ya trae la lista de accesos (Beach: la segunda columna del cierre), se usa esa
  if (!h) {
    const ulx = $$(d.body, 'ul').find((u) => !u.closest('.animated-modal,#home-section,nav') && $$(u, 'a[href^="#"]').length >= 3 && $(u, 'a[href="#rsvp"],a[href="#home-section"]'));
    if (ulx) {
      h = ulx.previousElementSibling && txt(ulx.previousElementSibling).length < 40 ? ulx.previousElementSibling : null;
      if (!h) { h = d.createElement('span'); h.setAttribute('class', 'd-none'); antes(ulx, h); }
    }
  }
  if (c.paquete === 'basic') {
    // Basic no trae accesos rápidos
    if (h) {
      const sec = subir(h, (x) => x.tagName === 'SECTION') || nivel(h, c.wrap);
      const col = subir(h, (x) => esCol(x) && sec.contains(x) && x !== sec);
      // Si la sección trae más cosas (los nombres del cierre), se va solo la columna de los accesos
      const mas = col && $$(sec, 'h1,h2,h3,h4,p').some((e) => !col.contains(e) && txt(e).length > 2);
      quitar(mas ? col : sec);
    }
    return;
  }
  if (h) {
    if (!/^accesos? r[aá]pidos?$/i.test(txt(h))) h.setAttribute('data-t', 'perdiste.titulo');
    // Passion: el título más chico; Armonía: los links más chicos
    if (c.id === 'passion') h.classList.add('ai-perdiste-chico');
    if (/^(armonia|natural)$/.test(c.id)) (subir(h, (x) => x.querySelector('ul')) || h).classList.add('ai-perdiste-links');
    const ul = subir(h, (x) => x.querySelector('ul'))?.querySelector('ul');
    const a = ul && $(ul, 'a');
    const clase = a ? clases(a).join(' ') : 'smoothscroll btn-link text-white';
    if (ul) ul.innerHTML = '\n            ' + lista(clase) + '\n          ';
    return;
  }
  // No había: uno con los colores del cierre
  const cie = $(d, '#cierre');
  const color = cie && /text-white/.test(cie.innerHTML) ? 'text-white' : 'text-black';
  const fuente = (c.info.claseTitulos || '');
  const bloque = nodo(d, `<section class="${clases(cie).filter((k) => !/^p[tby]?-/.test(k)).join(' ') || 'site-section'} pt-4 pb-4 ai-perdiste"${cie?.getAttribute('style') ? ` style="${cie.getAttribute('style')}"` : ''}>
      <div class="container"><div class="row"><div class="col-12 text-center">
        <h3 class="mb-3 text-center ${fuente} ${color}" data-t="perdiste.titulo">¿Te perdiste algo?</h3>
        <ul class="list-unstyled">
            ${lista(`smoothscroll btn-link ${color}`)}
        </ul>
      </div></div></div>
    </section>`);
  if (cie) despues(cie, bloque); else c.aviso('perdiste: sin lugar');
  c.aviso('perdiste: se agregó (no había)');
}
const PIE = `<div data-componente="pie-marca"></div>
  <footer class="site-footer pt-4 pb-4" data-no="marca.blanca">
    <div class="container">
      <div class="col-md-6 ml-auto mr-auto p-0">
        <div class="row no-gutters pt-2 rounded mb-0" style="background: rgba(0,0,0,0.15)">
          <div class="col-6 ml-auto text-right p-0">
            <a href="https://amoinvitar.com/"><img class="img-fluid mb-1 mr-1" width="90" src="../../comun/img/amoinvitar-line.svg" alt="Amo Invitar!"></a>
          </div>
          <div class="col-6 mr-auto text-left p-0">
            <a href="https://amoinvitar.com/"><p class="text-small ml-1 mt-1 text-white-50"> | amoinvitar.com</p></a>
          </div>
        </div>
      </div>
    </div>
  </footer>`;
function pie(c) {
  const d = c.doc;
  const f = $(d, 'footer.site-footer') || $(d, 'footer');
  const nuevo = nodo(d, '<div></div>');
  const clase = f?.getAttribute('class'), estilo = f?.getAttribute('style');
  if (f) { antes(f, nuevo); quitar(f); } else c.wrap.appendChild(nuevo);
  // El pie de siempre, con la clase y el color del pie del diseño
  let html = PIE;
  if (clase) html = html.replace('class="site-footer pt-4 pb-4"', `class="${clase}"`);
  if (estilo) html = html.replace('data-no="marca.blanca"', `data-no="marca.blanca" style="${estilo}"`);
  nuevo.insertAdjacentHTML('beforebegin', html);
  quitar(nuevo);
}

// ── 15. Rutas de imágenes y estilos ──────────────────────────────────────
function rutas(c) {
  const d = c.doc;
  const fijar = (u) => {
    if (!u || /^(https?:|data:|#|\/|about:)/.test(u) || u.startsWith('../../comun/')) return u;
    if (/^\.\.\/\.\.\/img\/timeline-icon-/.test(u)) return `../../comun/img/itinerario/${basename(u)}`;
    if (u.startsWith('../../img/') || u.startsWith('../../iconos/')) { const f = u.replace(/^\.\.\/\.\.\/(img|iconos)\//, ''); c.imagenes.add(u.replace(/^\.\.\/\.\.\//, '')); return `img/${basename(f)}`; }
    if (u.startsWith('../img-demo/') || u.startsWith('../../demo/img-demo/')) return `../../comun/img/demo-${basename(u)}`;
    // Fotos de la demo con la ruta desde la raíz (../../demo/<carpeta>/x)
    if (/^\.\.\/\.\.\/demo\/[^/]+\/[^/]+$/.test(u) || /^\.\.\/[^./][^/]*\/[^/]+\.(jpe?g|webp|png)$/.test(u) && !u.startsWith('../audio/')) { c.fotos.add(basename(u)); return `demo/${c.evento}/${basename(u)}`; }
    if (u.startsWith('../audio/')) return `../../comun/audio/${basename(u)}`;
    if (!u.includes('/')) { c.fotos.add(u); return `demo/${c.evento}/${u}`; }
    return u;
  };
  for (const a of ['src', 'href', 'data', 'poster']) for (const e of $$(d.body, `[${a}]`)) e.setAttribute(a, fijar(e.getAttribute(a)));
  for (const e of [d.body, ...$$(d.body, '[style*="url("]')].filter((x) => /url\(/.test(x.getAttribute('style') || ''))) e.setAttribute('style', e.getAttribute('style').replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, u) => `url(${q}${fijar(u)}${q})`));
  // Los fondos diferidos los carga comun/js/diferido.js
}

// ── 16. Cabecera y scripts ───────────────────────────────────────────────
function cabecera(c, viejo) {
  const d = c.doc;
  const fuentes = [], extra = [], estilos = [];
  for (const l of $$(viejo, 'link[rel="stylesheet"],link[href$=".css"]')) {
    const h = l.getAttribute('href') || '';
    if (/fonts\/google\/[^/]+\.css/.test(h)) { fuentes.push(h.replace(/^.*fonts\/google\//, '../../comun/fonts/google/')); c.fuentes.add(h.replace(/^\.\.\/\.\.\//, '')); }
    else if (/font/i.test(h) && /^\.\.\/\.\.\/css\//.test(h) && !/icomoon/.test(h)) { const n = basename(h.split('?')[0]); fuentes.push(`../../comun/fonts/css/${n}`); c.fuentes.add(h.split('?')[0].replace(/^\.\.\/\.\.\//, '')); }
    else if (/^\.\.\/\.\.\/css\/inv-/.test(h)) { c.hojas.add(h.split('?')[0].replace(/^\.\.\/\.\.\//, '')); }
  }
  for (const s of $$(viejo, 'style')) estilos.push(s.outerHTML);
  c.info.fuentes = fuentes;
  const titulo = `Invitación ❤ ${c.evento} | ${c.id}`;
  d.head.innerHTML = `
  <title>${titulo}</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no">
  <meta name="description" content="¡Te esperamos para celebrar juntos!">
  <meta name="robots" content="noindex">
  <meta name="color-scheme" content="light">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${titulo}">
  <meta property="og:description" content="¡Te esperamos para celebrar juntos!">
  <meta property="og:image" content="">
  <link rel="image_src" href="">
  <meta property="og:site_name" content="Amo Invitar! | Invitaciones digitales">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/svg+xml" href="https://amoinvitar.com/favicon.svg">
  ${fuentes.map((f) => `<link rel="stylesheet" href="${f}">`).join('\n  ')}
  <link rel="preload" href="../../comun/fonts/icomoon/fonts/icomoon.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="../../comun/fonts/icomoon/style.css">
  <!-- Todos los estilos del modelo en un solo archivo, y la paleta y fuentes aparte -->
  <link rel="stylesheet" href="estilo.css">
  <link rel="stylesheet" href="tema.css">
  <link rel="stylesheet" href="../../comun/css/modelo-comun.css">
  <link rel="preload" href="../../comun/fonts/bodoni-moda/bodoni-moda-italic-600.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="../../comun/fonts/bodoni-moda/bodoni-moda-500.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="../../comun/css/sobre_v1.2.css">
  <script src="../../comun/js/sobre_v1.1.js" defer></script>
  <link rel="stylesheet" href="../../comun/css/slides.css">
  ${estilos.join('\n  ')}
`;
}
const SCRIPTS = `
<script src="../../comun/js/jquery-3.5.1.min.js"></script>
<script src="../../comun/js/owl.carousel.min.js"></script>
<script src="../../comun/js/popper.min.js" defer></script>
<script src="../../comun/js/bootstrap.min.js" defer></script>
<script src="../../comun/js/jquery.countdown.min.js"></script>
<script src="../../comun/js/jquery.fancybox.min.js"></script>
<script src="../../comun/js/jquery.easing.1.3.js" defer></script>
<script src="../../comun/js/jquery.sticky.js"></script>
<script src="../../comun/js/aos.js" defer></script>
<script src="../../comun/js/snow_2.7.1.js" defer></script>
<script src="../../comun/js/rsvp-fecha-fin-evento.js" defer></script>
<!-- Motor del lado del navegador: cuenta regresiva, agendar (Google, Apple, Outlook), mapas, álbum -->
<script src="../../comun/js/invitacion.js" defer></script>
<script src="../../comun/js/slides.js" defer></script>
<script src="../../comun/js/diferido.js" defer></script>
`;

// ── El modal de bienvenida original (antes del sobre) ───────────────────
function modalOriginal(c, rutaRepo) {
  let viejo = '';
  for (const ref of ['4b7373f2~1']) {
    try { viejo = execFileSync('git', ['-C', REPO, 'show', `${ref}:${rutaRepo}`], { encoding: 'utf8', maxBuffer: 50 << 20, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { /* no estaba */ }
    if (viejo) break;
  }
  if (!viejo) return null;
  const d = abrir(viejo);
  const m = $(d, '#audioModal');
  if (!m) return null;
  const fondo = (m.getAttribute('style') || '').match(/background-color:\s*([^;]+)/)?.[1] || 'rgba(250, 250, 250, 0.85)';
  const cuerpo = $(m, '.modal-body') || m;
  // El contenido: se baja por los envoltorios de un solo hijo (row, col, …) hasta los adornos y la tarjeta
  let cont = cuerpo;
  while (cont.children.length === 1 && cont.firstElementChild.tagName === 'DIV' && !/rounded|shadow|cubo|card|bg-/.test(cont.firstElementChild.getAttribute('class') || '')) cont = cont.firstElementChild;
  const html = cont.innerHTML;
  return { fondo, html };
}
function bienvenida(c, original) {
  const d = c.doc;
  if (c.paquete === 'basic') return;
  const sobre = $(d, '[data-componente="sobre"]');
  let html, fondo;
  if (original) {
    const t = nodo(d, `<div>${original.html}</div>`);
    // La tarjeta con los textos
    const h = $(t, 'h1,h2,h3,h4');
    const ps = $$(t, 'p').filter((p) => txt(p).length > 20);
    const botones = $$(t, 'button');
    if (h) { h.setAttribute('data-t', 'bv.titulo'); h.textContent = '¡Te damos la bienvenida a nuestra invitación!'; }
    if (ps[0]) { ps[0].setAttribute('data-t', 'bv.texto'); ps[0].setAttribute('data-si', 'musica.archivo'); ps[0].textContent = 'Elegimos la música para que te acompañe en este recorrido. ¿Cómo te gustaría ingresar?'; }
    ps.slice(1).forEach(quitar);
    if (botones.length) {
      const b = botones[0];
      const clase = clases(b).filter((k) => !/^m[rl]-\d$/.test(k)).concat(['mx-1']).join(' ');
      const caja = b.parentElement;
      botones.forEach(quitar);
      caja.insertAdjacentHTML('beforeend', `
        <button type="button" class="${clase}" data-bv="musica" data-si="musica.archivo" data-t="bv.conMusica">Ingresar con música</button>
        <button type="button" class="${clase}" data-bv="entrar" data-si="musica.archivo" data-t="bv.sinMusica">Ingresar sin música</button>
        <button type="button" class="${clase}" data-bv="entrar" data-no="musica.archivo" data-t="bv.entrar">Ingresar</button>`);
    }
    // La caja de los textos ocupa el ancho disponible
    const tarjeta = h && subir(h, (x) => x.parentElement === t || (x.querySelector('button') && x !== t));
    if (tarjeta && tarjeta !== t) tarjeta.classList.add('ai-bv-tarjeta');
    for (const e of $$(t, '[class*="col-"]')) e.setAttribute('class', clases(e).filter((k) => !/^col(-|$)|^m[lr]-auto$/.test(k)).join(' '));
    html = t.innerHTML; fondo = original.fondo;
  } else { c.aviso('bienvenida: sin modal original (queda la genérica)'); return; }
  const bloque = nodo(d, `<div class="ai-bv" id="ai-bienvenida" data-si="bienvenidaModal.activa" hidden role="dialog" aria-modal="true" style="--ai-bv-fondo: ${fondo}">
  <div class="ai-bv-caja">${html}</div>
</div>`);
  if (sobre) despues(sobre, bloque);
}

// ── Las marcas de texto bajan al <span> interno que lleva la tipografía (h2 > span.fuente > "Ceremonia") ──
const MARCAS_TEXTO = ['data-t', 'data-campo', 'data-campo-html', 'data-fecha', 'data-fecha-formato', 'data-caso', 'data-t-html'];
function bajarMarcas(c) {
  for (const e of $$(c.doc.body, '[data-t],[data-campo],[data-fecha]')) {
    let x = e;
    while (x.children.length === 1 && [...x.childNodes].every((n) => n.nodeType !== 3 || !n.textContent.trim()) && !/^(I|IMG|SVG|BR)$/.test(x.firstElementChild.tagName)) x = x.firstElementChild;
    if (x === e) continue;
    for (const a of MARCAS_TEXTO) if (e.hasAttribute(a)) { x.setAttribute(a, e.getAttribute(a)); e.removeAttribute(a); }
  }
}

// ── Separadores sueltos entre secciones (imágenes sin texto): van con la sección que les sigue ──
// Se envuelven juntos en un <div> que lleva el data-seccion (y el id) de la sección, así si el cliente la
// apaga se va también su separador y no quedan varios separadores seguidos.
function separadores(c) {
  const w = c.wrap;
  const esSep = (e) => e.tagName !== 'FOOTER' && !e.id && !e.hasAttribute('data-seccion') && !e.hasAttribute('data-componente') && !e.hasAttribute('data-si') && !e.hasAttribute('data-no')
    && !txt(e) && ($$(e, 'img').length > 0 || e.tagName === 'IMG' || $(e, 'hr')) && !$(e, 'audio,iframe,video,[data-repetir]');
  const quitable = (e) => e && (e.hasAttribute('data-seccion') || $$(e, ':scope > [data-seccion]').length === 1 && e.children.length === 1);
  for (const e of [...w.children]) {
    if (!esSep(e)) continue;
    let sig = e.nextElementSibling; while (sig && esSep(sig)) sig = sig.nextElementSibling;
    let ant = e.previousElementSibling; while (ant && esSep(ant)) ant = ant.previousElementSibling;
    const destino = quitable(sig) ? sig : quitable(ant) ? ant : null;
    if (!destino) continue;
    const s0 = destino.hasAttribute('data-seccion') ? destino : $(destino, ':scope > [data-seccion]');
    const caja = c.doc.createElement('div');
    caja.setAttribute('data-seccion', s0.getAttribute('data-seccion'));
    if (s0.id) { caja.id = s0.id; s0.removeAttribute('id'); }
    s0.removeAttribute('data-seccion');
    destino.parentNode.insertBefore(caja, destino);
    if (destino === sig) { caja.appendChild(e); caja.appendChild(destino); } else { caja.appendChild(destino); caja.appendChild(e); }
    c.info.separadores = (c.info.separadores || 0) + 1;
  }
}

// ── Composición ──────────────────────────────────────────────────────────
function preparar(c) {
  const d = c.doc;
  const viejoHead = d.head.cloneNode(true);
  limpiar(c);
  religioso(c);
  const home = $(d, '#home-section');
  portada(c, home);
  inicialesPortada(c);
  audio(c);
  historia(c);
  fotoHistoria(c);
  galeria(c);
  agenda(c);
  c.rsvp = rsvp(c);
  dresscode(c);
  itinerario(c);
  testigos(c);
  const al = album(c);
  const hs = hashtag(c);
  canciones(c);
  regalos(c);
  cierre(c);
  // La clase de la fuente de títulos (la de los h2 del modelo)
  const h2 = $$(d.body, 'h2[class]').map((h) => clases(h)).flat().filter((k) => !/^(mb|mt|pb|pt|p|m|text|h\d|display)-?|^(text-center|font-weight|section)/.test(k));
  c.info.claseTitulos = h2.sort((a, b) => h2.filter((x) => x === b).length - h2.filter((x) => x === a).length)[0] || '';
  perdiste(c);
  // Rockabilly: el filtro del diseño en todas las fotos del cliente (portada, galería, lugares, testigos, confirmación…)
  if (c.id === 'rockabilly') {
    for (const e of $$(d.body, '[data-repetir="fotos.portada"], img[data-attr*="src:c:"], img[data-i-attr*="src:"], [data-componente="galeria"]')) {
      if (/icon|\.png/.test(e.getAttribute('src') || '')) continue;
      e.classList.add('rockabilly-filtered');
    }
    c.info.filtroFotos = 'rockabilly-filtered';
  }
  bajarMarcas(c);
  pie(c);
  rutas(c);
  cabecera(c, viewHead(viejoHead));
  void al; void hs;
  return c;
}
const viewHead = (h) => h;

// Copia de un bloque de otro documento (convertido) en este
const importar = (doc, el) => nodo(doc, el.outerHTML);

function componer(cs) {
  const { deluxe, premium, basic } = cs;
  // README: los modelos con slideshow lo llevan también en Basic. La foto del Basic pasa a ser un slideshow en su lugar
  const hd = deluxe && $(deluxe.doc, '#home-section'), hb0 = basic && $(basic.doc, '#home-section');
  if (hd && hb0 && $(hd, '.ai-slides') && !$(hb0, '.ai-slides')) {
    const f = $(hb0, '[data-repetir="fotos.portada"][data-i-bg]');
    if (f) {
      const alto = ((f.getAttribute('style') || '').match(/(?:^|;)\s*height\s*:\s*([^;!]+)/) || [])[1]?.trim();
      const sl = nodo(basic.doc, `<div class="ai-slides ai-en-linea" data-intervalo="5000"${alto ? ` style="--alto:${alto}"` : ''}></div>`);
      antes(f, sl); sl.appendChild(f); f.classList.add('ai-slide');
      basic.info.portadaFotos = Math.max(deluxe.info.portadaFotos || 4, 2);
    }
  }
  for (const [paq, c] of Object.entries(cs)) {
    if (!c) continue;
    const d = c.doc;
    const body = d.body;
    // Sobre, datos/acceso
    const wrap = $(d, '.site-wrap') || body;
    if (paq !== 'basic') wrap.parentNode.insertBefore(nodo(d, '<div data-componente="sobre"></div>'), wrap);
    wrap.insertBefore(nodo(d, '<div data-componente="acceso"></div>'), wrap.firstChild);
    // Premium y Deluxe: la portada de Basic cuando se apaga la cuenta regresiva
    const home = $(d, '#home-section');
    if (paq !== 'basic' && basic && home) {
      const hb = $(basic.doc, '#home-section');
      if (hb && hb.outerHTML !== home.outerHTML) {
        home.setAttribute('data-si', 'cuenta.portada');
        const copia = importar(d, hb); copia.setAttribute('data-no', 'cuenta.portada');
        despues(home, copia);
        // Basic con los nombres en la sección de abajo (Minimal): esa sección viene con la portada
        if (!$(hb, '[data-campo-html="nombres.portada"],[data-campo="nombres.a"]')) {
          let ref = copia;
          for (let x = hb.nextElementSibling, i = 0; x && i < 3; x = x.nextElementSibling, i++) {
            if (/^(SCRIPT|STYLE)$/.test(x.tagName) || $(x, 'audio') || x.tagName === 'AUDIO') continue;
            const y = importar(d, x); y.setAttribute('data-no', 'cuenta.portada'); despues(ref, y); ref = y;
            if ($(x, '[data-campo-html="nombres.portada"],[data-campo="nombres.a"]')) break;
          }
        }
      }
    }
    // Confirmación: con foto (Premium/Deluxe) y sin foto (el bloque de Basic)
    if (c.rsvp?.top) {
      const top = c.rsvp.top;
      const caja = nodo(d, '<div id="rsvp" data-seccion="rsvp"></div>');
      antes(top, caja);
      if (paq !== 'basic' && basic?.rsvp?.top && c.info.galeriaEnRsvp) {
        // Con la galería apagada, la confirmación de Basic
        const conG = nodo(d, '<div data-seccion="galeria" id="galeria"></div>'); caja.appendChild(conG); conG.appendChild(top);
        const sinG = nodo(d, '<div data-no="secciones.galeria"></div>'); caja.appendChild(sinG);
        sinG.appendChild(importar(d, basic.rsvp.top));
      } else if (paq !== 'basic' && basic?.rsvp?.top && c.rsvp.conFoto) {
        const conFoto = nodo(d, '<div data-si="fotos.rsvp"></div>'); caja.appendChild(conFoto); conFoto.appendChild(top);
        const sinFoto = nodo(d, '<div data-no="fotos.rsvp"></div>'); caja.appendChild(sinFoto);
        const b = importar(d, basic.rsvp.top);
        // El formulario va una sola vez en la página: en el bloque sin foto se repite el componente (se usa uno solo)
        sinFoto.appendChild(b);
      } else caja.appendChild(top);
    }
    // Deluxe: el muro de Instagram de Premium junto al álbum (son excluyentes)
    if (paq === 'deluxe' && premium && !$(d, '[data-seccion="instagram"]')) {
      const hp = $(premium.doc, '[data-seccion="instagram"]');
      const al = $(d, '[data-seccion="album"]');
      if (hp && al) { antes(al, importar(d, hp)); deluxe.secciones.add('instagram'); }
    }
    separadores(c);
    body.insertAdjacentHTML('beforeend', SCRIPTS);
  }
}

// ── Bautismo y comunión (copias de los diseños de 15) ────────────────────
// Las coronas pasan a ser el ícono del evento (pila bautismal o cáliz) del color de la corona; la cinta "Mis 15"
// queda en blanco con la frase encima; los adornos con "15" usan su versión de cumpleaños.
function religioso(c) {
  if (!['bautismo', 'comunion'].includes(c.evento)) return;
  const d = c.doc;
  c.recolorear ||= [];
  const icono = c.evento === 'bautismo' ? 'bautismo-1.png' : 'comunion-2.png';
  for (const i of $$(d.body, 'img[src*="/corona"], img[src*="tiara"]')) {
    const src = i.getAttribute('src');
    const base = basename(src).replace(/\.png$/, '');
    const nuevo = `${c.evento}-${base}.png`;
    c.recolorear.push(['icono', `img/${icono}`, src.replace(/^\.\.\/\.\.\//, ''), nuevo]);
    i.setAttribute('src', `img/${nuevo}`);
    const w = parseInt(i.getAttribute('width') || '0', 10);
    if (w) i.setAttribute('width', String(Math.max(40, Math.round(w * 0.6))));
    i.setAttribute('alt', '');
  }
  for (const i of $$(d.body, 'img[src$="/mis15.png"]')) {
    c.recolorear.push(['cinta', 'img/mis15.png', null, 'cinta-blanca.png']);
    const w = i.getAttribute('width') || '';
    const caja = nodo(d, `<span class="ai-cinta"><img src="img/cinta-blanca.png" alt="" class="${i.getAttribute('class') || 'img-fluid'}"${w ? ` width="${w}"` : ''}${i.getAttribute('style') ? ` style="${i.getAttribute('style')}"` : ''}><span class="ai-cinta-texto" data-t="portada.subtitulo" data-caso="titulo">Mi Bautismo</span></span>`);
    i.parentNode.replaceChild(caja, i);
    c.info.cinta = true;
  }
  for (const i of $$(d.body, 'img[src*="mis15-2"]')) i.parentNode.replaceChild(nodo(d, '<p class="rouge-titulo mb-3 mt-2" data-t="portada.subtitulo" data-caso="titulo">Mi Bautismo</p>'), i);
  if ($(d.body, '.rouge-titulo')) c.info.magnolia = true;
  for (const i of $$(d.body, 'img[src*="icon-ornamental-fiesta"]')) i.setAttribute('src', i.getAttribute('src').replace(/-?15\.png$/, '-cumple.png'));
  // Padrinos: la pluma (no el ícono de personas), del color del ícono del diseño
  const hT = hoja(d.body, 'h1,h2,h3,h4', (t) => /padrinos|testigos/i.test(t));
  const sec = $(d.body, '#testigos') || (hT && subir(hT, (x) => x.tagName === 'SECTION'));
  for (const i of sec ? $$(sec, 'i[class*="icon-people"]') : []) {
    const k = clases(i).find((x) => /^text-/.test(x) && !/^text-(center|left|right)$/.test(x));
    const color = (k && colorClase(k)) || '#9c916b';
    const nuevo = `pluma-${color.slice(1).toLowerCase()}.png`;
    c.recolorear.push(['icono', 'img/icon-testigos.png', color, nuevo]);
    i.parentNode.replaceChild(nodo(d, `<img loading="lazy" class="img-fluid mb-2" src="img/${nuevo}" width="80" alt="">`), i);
  }
}
// El color de una clase text-xxx en las hojas del sitio
let HOJAS_SITIO = null;
function colorClase(k) {
  HOJAS_SITIO ??= ['css/snow_v3.6.css', 'css/estilo-savethedate_v2.5.css'].map((f) => { try { return readFileSync(join(REPO, f), 'utf8'); } catch { return ''; } }).join('\n');
  if (k === 'text-white') return '#ffffff';
  const m = HOJAS_SITIO.match(new RegExp(`\\.${k.replace(/-/g, '\\-')}\\s*\\{[^}]*?color\\s*:\\s*(#[0-9a-fA-F]{3,6})`));
  return m?.[1] || null;
}

// ── principal ────────────────────────────────────────────────────────────
async function principal() {
  // patrón (opcional): cómo se llaman los archivos en carpetas con varios diseños.
  //   "amanecer" → amanecer.html, amanecer_premium.html, amanecer_basic.html
  //   "garden_proyecto-{p}---NUEVO" → garden_proyecto-deluxe---NUEVO.html, …
  const [id, evento, carpeta, patron] = process.argv.slice(2);
  if (!id || !evento || !carpeta) { console.log('Uso: convertir-modelo.mjs <id> <evento> <carpeta-demo>'); process.exit(1); }
  const dir = join(REPO, 'demo', carpeta);
  const salida = join(APP, 'public/modelos', id);
  await mkdir(salida, { recursive: true });
  const archivos = !patron ? { deluxe: 'index.html', premium: 'premium.html', basic: 'basic.html' }
    : patron.includes('{p}') ? Object.fromEntries(['deluxe', 'premium', 'basic'].map((p) => [p, `${patron.replace('{p}', p)}.html`]))
      : { deluxe: `${patron}.html`, premium: `${patron}_premium.html`, basic: `${patron}_basic.html` };
  const cs = {};
  for (const [paq, f] of Object.entries(archivos)) {
    const p = join(dir, f);
    if (!(await existe(p))) continue;
    const html = await readFile(p, 'utf8');
    cs[paq] = preparar(new Conversion({ id, evento, carpeta, paquete: paq, doc: abrir(html), html }));
  }
  if (!cs.deluxe) { console.log('No está', join(dir, archivos.deluxe)); process.exit(1); }
  componer(cs);
  // Ventana de bienvenida: el modal de antes del sobre
  for (const paq of ['deluxe', 'premium']) {
    if (!cs[paq]) continue;
    // Las copias de cumpleaños salieron del diseño de 15: si no tienen modal propio, el de su 15
    const de15 = carpeta.startsWith('cumple-') ? ({ discoteque: 'disco15' }[carpeta.slice(7)] || `${carpeta.slice(7)}15`)
      : /nuevos-(bautismo|comunion)\//.test(carpeta) ? `${basename(carpeta)}15` : null;
    const lugares = [`demo/${carpeta}`, `ar/${carpeta}`, ...(de15 ? [`demo/${de15}`, `ar/${de15}`] : [])];
    let orig = null;
    for (const l of lugares) { orig = modalOriginal(cs[paq], `${l}/${archivos[paq]}`) || modalOriginal(cs[paq], `${l}/index.html`); if (orig) break; }
    bienvenida(cs[paq], orig);
  }
  // Ajustes propios del modelo
  const propio = join(APP, 'scripts/conversion', `${id}.mjs`);
  if (await existe(propio)) {
    const m = await import(pathToFileURL(propio).href);
    for (const [paq, c] of Object.entries(cs)) if (m.ajustar) await m.ajustar(c.doc, { ...c, paquete: paq, evento, $, $$, nodo, txt, subir, quitar, antes, despues });
  }
  // La fuente de Rouge (después de armar la cabecera)
  for (const c of Object.values(cs)) if (c.info.magnolia && !c.doc.querySelector('link[href*="magnolia-sky"]')) c.doc.head.insertAdjacentHTML('beforeend', '\n  <link rel="stylesheet" href="../../comun/fonts/magnolia-sky/magnolia-sky.css">');
  for (const c of Object.values(cs)) if (c.info.cinta && !c.doc.querySelector('link[href*="great-vibes"]')) c.doc.head.insertAdjacentHTML('beforeend', '\n  <link rel="stylesheet" href="../../comun/fonts/google/great-vibes+jost.css">');
  // Íconos recoloreados y cinta en blanco (bautismo y comunión)
  await mkdir(join(salida, 'img'), { recursive: true });
  const { execFileSync } = await import('node:child_process');
  const hechos = new Set();
  for (const [modo, src, ref, out] of Object.values(cs).flatMap((c) => c.recolorear || [])) {
    if (hechos.has(out)) continue; hechos.add(out);
    const args = modo === 'icono' ? [join(REPO, src), ref.startsWith('#') ? ref : join(REPO, ref), join(salida, 'img', out)] : [join(REPO, src), join(salida, 'img', out)];
    execFileSync('python3', ['-I', join(APP, 'scripts/conversion/recolorear.py'), modo, ...args], { stdio: 'ignore' });
  }
  // Escribir
  const nombre = (paq) => (evento === 'boda' ? (paq === 'deluxe' ? 'index.html' : `index-${paq}.html`) : (paq === 'deluxe' ? `index-${evento}.html` : `index-${evento}-${paq}.html`));
  const cabeza = `<!DOCTYPE html>
<!--
  MODELO ${id.toUpperCase()} · ${evento} · Amo Invitar 2.0 (convertido de demo/${carpeta} con scripts/conversion/convertir-modelo.mjs)
  Este archivo es el DISEÑO. Los textos que se ven acá son de muestra: el motor los reemplaza con los datos
  de cada cliente al abrir la invitación. Marcas: ver la cabecera de public/modelos/garden/index.html y README.md.
-->
`;
  const reporte = {};
  for (const [paq, c] of Object.entries(cs)) {
    let html = c.doc.documentElement.outerHTML;
    html = html.replace(/\n\s*\n\s*\n+/g, '\n\n');
    html = html.replace(/((?:min-|max-)?height)\s*:\s*100vh\s*(!important)?\s*(;|(?=["}]))/g, (m, p, imp = '', fin) => `${p}:100vh${imp};${p}:100svh${imp}${fin === ';' ? ';' : ''}`);
    await writeFile(join(salida, nombre(paq)), cabeza + html);
    reporte[paq] = { archivo: nombre(paq), secciones: [...c.secciones], avisos: c.avisos, info: { ...c.info, cuenta: undefined } };
  }
  // Imágenes, fotos de la demo y fuentes
  const todas = (k) => [...new Set(Object.values(cs).flatMap((c) => [...c[k]]))];
  await mkdir(join(salida, 'img'), { recursive: true });
  const faltan = [];
  for (const r of todas('imagenes')) {
    const de = join(REPO, r), a = join(salida, 'img', basename(r));
    if (await existe(de)) { if (!(await existe(a))) await copyFile(de, a); } else faltan.push(r);
  }
  await mkdir(join(salida, 'demo', evento), { recursive: true });
  // Todas las fotos de la carpeta de la demo (galería, portada, confirmación, álbum…)
  const { readdir } = await import('node:fs/promises');
  for (const f of await readdir(dir)) if (/\.(jpe?g|webp)$/i.test(f)) cs.deluxe.fotos.add(f);
  // Galería con otros nombres (galeria-1.jpg en Cinema): la demo usa foto1.jpg…
  const fs0 = await readdir(dir);
  if (!fs0.includes('foto1.jpg')) for (const f of fs0) { const m = f.match(/^galeria-(\d+)\.jpe?g$/i); if (m) await copyFile(join(dir, f), join(salida, 'demo', evento, `foto${m[1]}.jpg`)); }
  for (const f of todas('fotos')) {
    const n = basename(f), de = join(dir, n), a = join(salida, 'demo', evento, n);
    if (await existe(de)) await copyFile(de, a); else faltan.push(`demo/${carpeta}/${n}`);
  }
  // foto1b.jpg… (la letra del diseño): la demo usa foto1.jpg…
  const letraG = cs.deluxe.info.galeriaLetra;
  if (letraG) for (const f of fs0) { const m = f.match(new RegExp(`^foto(\\d+)${letraG}\\.jpe?g$`, 'i')); if (m) await copyFile(join(dir, f), join(salida, 'demo', evento, `foto${m[1]}.jpg`)); }
  for (const f of todas('fuentes')) {
    const de = join(REPO, f);
    if (!(await existe(de))) { faltan.push(f); continue; }
    if (/fonts\/google\//.test(f)) {
      const a = join(APP, 'public/comun/fonts/google', basename(f));
      if (!(await existe(a))) {
        await copyFile(de, a);
        const css = await readFile(de, 'utf8');
        for (const [, , u] of css.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) {
          const fu = resolve(dirname(de), u), fa = resolve(dirname(a), u);
          await mkdir(dirname(fa), { recursive: true });
          if (await existe(fu)) { if (!(await existe(fa))) await copyFile(fu, fa); } else faltan.push(fu);
        }
      }
    } else {
      // Hoja de fuente propia (css/x-font.css): las fuentes van a comun/fonts/<archivo>
      const a = join(APP, 'public/comun/fonts/css', basename(f));
      await mkdir(dirname(a), { recursive: true });
      let css = await readFile(de, 'utf8');
      for (const [, , u] of css.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) {
        const limpio = u.split(/[?#]/)[0];
        const fu = resolve(dirname(de), limpio);
        const fa = join(APP, 'public/comun/fonts', basename(limpio));
        if (await existe(fu)) { if (!(await existe(fa))) await copyFile(fu, fa); } else if (!/^data:/.test(u)) faltan.push(fu);
      }
      css = css.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, u) => (/^data:/.test(u) ? m : `url(${q}../${basename(u.split(/[?#]/)[0])}${q})`));
      await writeFile(a, css);
    }
  }
  const conv = join(salida, 'conversion.json');
  const previo = JSON.parse(await readFile(conv, 'utf8').catch(() => '{}'));
  previo[evento] = { carpeta, archivo: archivos.deluxe, hojas: todas('hojas'), faltan, paquetes: reporte };
  await writeFile(conv, JSON.stringify(previo, null, 2));
  for (const [paq, r] of Object.entries(reporte)) console.log(`${id}/${evento}/${paq}: ${r.secciones.join(' ')}${r.avisos.length ? '\n   ⚠ ' + r.avisos.join('\n   ⚠ ') : ''}`);
  if (faltan.length) console.log('Faltan:', faltan.join(', '));
}
await principal();
