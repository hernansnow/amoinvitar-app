// Toma el HTML del modelo (el mismo que se abre en Dreamweaver) y lo llena
// con la vista del evento siguiendo las marcas data-*. Ver la cabecera del
// modelo para el vocabulario completo.

import { parseHTML } from 'linkedom';
import { COMPONENTES } from '../componentes/bloques.js';

const valor = (obj, ruta) => ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const lleno = (x) => (Array.isArray(x) ? x.length > 0 : x != null && x !== '' && x !== false);
const todos = (raiz, sel) => [...raiz.querySelectorAll(sel)];

// Reemplaza la última url(...) de un style (la foto; el degradé queda igual)
function cambiarFondo(style, url) {
  const i = style.lastIndexOf('url(');
  if (i < 0) return `${style}; background-image: url(${url})`;
  const f = style.indexOf(')', i);
  return `${style.slice(0, i)}url(${url})${style.slice(f + 1)}`;
}
function cambiarPosicion(style, pos) {
  return /background-position\s*:/.test(style)
    ? style.replace(/background-position\s*:[^;]*/, `background-position: ${pos}`)
    : `${style}; background-position: ${pos}`;
}

// ── data-seccion: fuera lo que el paquete no trae o el cliente apagó ─────
function secciones(doc, v) {
  for (const el of todos(doc, '[data-seccion]')) {
    if (!v.secciones[el.getAttribute('data-seccion')]) el.remove();
    else el.removeAttribute('data-seccion');
  }
}

// ── data-repetir: un ítem por elemento de la lista ───────────────────────
// Los ítems de muestra seguidos forman la plantilla; se usan en rueda para
// mantener alternancias (izquierda/derecha del itinerario, etc.).
function llenarItem(el, item, n) {
  const nodos = [el, ...todos(el, '*')];
  // data-si / data-no relativos al ítem
  for (const x of nodos) {
    for (const [attr, quiere] of [['data-si', true], ['data-no', false]]) {
      if (!x.hasAttribute(attr) || (x !== el && !el.contains(x))) continue;
      const ruta = x.getAttribute(attr);
      if (ruta in Object(item)) {
        x.removeAttribute(attr);
        if (lleno(item[ruta]) !== quiere) x.remove();
      }
    }
  }
  for (const x of [el, ...todos(el, '*')]) {
    if (x.hasAttribute('data-i')) { x.textContent = item[x.getAttribute('data-i')] ?? ''; x.removeAttribute('data-i'); }
    if (x.hasAttribute('data-i-attr')) {
      for (const par of x.getAttribute('data-i-attr').split(';')) {
        const [a, campo] = par.split(':').map((s) => s.trim());
        if (a) x.setAttribute(a, item[campo] ?? '');
      }
      x.removeAttribute('data-i-attr');
    }
    if (x.hasAttribute('data-i-bg')) {
      x.setAttribute('style', cambiarFondo(x.getAttribute('style') || '', item[x.getAttribute('data-i-bg')] ?? ''));
      x.removeAttribute('data-i-bg');
    }
    if (x.hasAttribute('data-i-pos')) {
      const pos = item[x.getAttribute('data-i-pos')];
      if (pos) x.setAttribute('style', cambiarPosicion(x.getAttribute('style') || '', pos));
      x.removeAttribute('data-i-pos');
    }
    if (x.hasAttribute('data-i-estilo')) {
      // Estilo extra del ítem (por ejemplo el encuadre de la portada en la computadora)
      const extra = String(item[x.getAttribute('data-i-estilo')] ?? '').replace(/[<>"]/g, '');
      if (extra) x.setAttribute('style', `${x.getAttribute('style') || ''}; ${extra}`);
      x.removeAttribute('data-i-estilo');
    }
    for (const { name, value } of [...x.attributes]) {
      if (value.includes('{n}')) x.setAttribute(name, value.replaceAll('{n}', n));
    }
  }
}

let contador = 0;
function repetir(doc, v) {
  let el;
  while ((el = doc.querySelector('[data-repetir]'))) {
    const ruta = el.getAttribute('data-repetir');
    const muestras = [el];
    let sig = el.nextElementSibling;
    while (sig && sig.getAttribute('data-repetir') === ruta) { muestras.push(sig); sig = sig.nextElementSibling; }
    const lista = valor(v, ruta) || [];
    const activa = muestras.some((m) => m.classList.contains('active'));
    lista.forEach((item, i) => {
      const copia = muestras[i % muestras.length].cloneNode(true);
      copia.removeAttribute('data-repetir');
      if (activa) copia.classList.toggle('active', i === 0);
      llenarItem(copia, item, ++contador);
      muestras[0].before(copia);
    });
    muestras.forEach((m) => m.remove());
  }
}

// ── data-si / data-no globales ───────────────────────────────────────────
function condiciones(doc, v) {
  for (const el of todos(doc, '[data-si],[data-no]')) {
    if (!el.isConnected) continue;
    const si = el.getAttribute('data-si'), no = el.getAttribute('data-no');
    const ok = (si == null || lleno(valor(v, si))) && (no == null || !lleno(valor(v, no)));
    if (!ok) el.remove();
    else { el.removeAttribute('data-si'); el.removeAttribute('data-no'); }
  }
}

// ── datos y textos ───────────────────────────────────────────────────────
function textos(doc, v, t) {
  for (const el of todos(doc, '[data-campo]')) { el.textContent = valor(v, el.getAttribute('data-campo')) ?? ''; el.removeAttribute('data-campo'); }
  for (const el of todos(doc, '[data-campo-html]')) { el.innerHTML = valor(v, el.getAttribute('data-campo-html')) ?? ''; el.removeAttribute('data-campo-html'); }
  for (const el of todos(doc, '[data-t]')) { el.textContent = t(el.getAttribute('data-t')); el.removeAttribute('data-t'); }
  for (const el of todos(doc, '[data-t-html]')) { el.innerHTML = t(el.getAttribute('data-t-html')); el.removeAttribute('data-t-html'); }
  for (const el of todos(doc, '[data-attr]')) {
    for (const par of el.getAttribute('data-attr').split(';')) {
      const [a, tipo, ...resto] = par.split(':').map((s) => s.trim());
      if (!a) continue;
      const ruta = resto.join(':');
      const val = tipo === 't' ? t(ruta) : valor(v, ruta);
      if (lleno(val)) el.setAttribute(a, val); else el.removeAttribute(a);
    }
    el.removeAttribute('data-attr');
  }
  // data-fecha="principal|ceremonia|celebracion" + data-fecha-formato="{dd} • {mm} • {a}": la fecha como la escribe el diseño
  for (const el of todos(doc, '[data-fecha]')) {
    const f = v.fechas?.[el.getAttribute('data-fecha')];
    const formato = el.getAttribute('data-fecha-formato') || '{dd} • {mm} • {a}';
    el.textContent = f ? formato.replace(/\{(\w+)\}/g, (m, k) => f[k] ?? '') : '';
    el.removeAttribute('data-fecha'); el.removeAttribute('data-fecha-formato');
  }
  for (const el of todos(doc, '[data-bg]')) {
    const url = valor(v, el.getAttribute('data-bg'));
    if (url) el.setAttribute('style', cambiarFondo(el.getAttribute('style') || '', url));
    el.removeAttribute('data-bg');
  }
}

// ── bloques comunes ──────────────────────────────────────────────────────
function componentes(doc, v, t) {
  for (const el of todos(doc, '[data-componente]')) {
    const fn = COMPONENTES[el.getAttribute('data-componente')];
    const html = fn ? fn({ t, v, el }) : '';
    if (html) el.insertAdjacentHTML('beforebegin', html);
    el.remove();
  }
}

// ── rutas: el HTML usa rutas relativas a su carpeta (para Dreamweaver) ───
const ABSOLUTA = /^(?:[a-z][a-z0-9+.-]*:|\/|#|\{|$)/i;
function rutas(doc, base) {
  const resolver = (u) => (ABSOLUTA.test(u) ? u : new URL(u, `https://x${base}/`).pathname);
  for (const a of ['src', 'href', 'data', 'data-src', 'poster']) {
    for (const el of todos(doc, `[${a}]`)) el.setAttribute(a, resolver(el.getAttribute(a)));
  }
  for (const el of todos(doc, '[style*="url("]')) {
    el.setAttribute('style', el.getAttribute('style').replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, u) => `url(${q}${resolver(u)}${q})`));
  }
}

// ── cabecera: título, descripción, idioma, datos para el navegador ───────
function cabecera(doc, v, origen) {
  doc.documentElement.setAttribute('lang', v.idioma.html);
  doc.title = v.meta.titulo;
  const meta = (sel, val) => { const m = doc.querySelector(sel); if (m) m.setAttribute('content', val); };
  meta('meta[name="description"]', v.meta.descripcion);
  meta('meta[property="og:title"]', v.meta.titulo);
  meta('meta[property="og:description"]', v.meta.descripcion);
  const img = new URL(v.meta.imagen, origen).href;
  meta('meta[property="og:image"]', img);
  doc.querySelector('link[rel="image_src"]')?.setAttribute('href', img);
  const inv = {
    cuenta: v.cuenta.activa ? v.cuenta.fecha : '',
    calendarios: v.calendarios,
    textos: {
      dia: v.t('cuenta.dia'), dias: v.t('cuenta.dias'), horas: v.t('cuenta.horas'), min: v.t('cuenta.min'), seg: v.t('cuenta.seg'),
      google: v.t('agendar.google'), apple: v.t('agendar.apple'), outlook: v.t('agendar.outlook'), otro: v.t('agendar.otro'), cerrar: v.t('boton.cerrar'),
    },
  };
  doc.head.insertAdjacentHTML('beforeend', `<script>window.INV = ${JSON.stringify(inv).replace(/</g, '\\u003c')};</script>`);
}

// Comentarios del modelo (guías para quien edita) fuera del HTML final
function sinComentarios(doc) {
  const w = doc.createTreeWalker(doc, 128 /* NodeFilter.SHOW_COMMENT */);
  const c = []; let n;
  while ((n = w.nextNode())) c.push(n);
  c.forEach((x) => x.remove());
}

export function renderizar(html, v, t, { origen = 'https://amoinvitar.com' } = {}) {
  const { document: doc } = parseHTML(html);
  v.t = t;
  secciones(doc, v);
  repetir(doc, v);
  condiciones(doc, v);
  textos(doc, v, t);
  rutas(doc, v.rutas.modelo);
  componentes(doc, v, t); // después de rutas: los bloques ya traen rutas absolutas
  cabecera(doc, v, origen);
  sinComentarios(doc);
  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
}
