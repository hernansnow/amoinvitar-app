// Panel del cliente · se arma solo con el esquema que manda el servidor
// (src/panel/esquemas.js). No hay un panel distinto por modelo.

import { armarMiniatura, achicarFoto } from './miniatura.js';
import { leerPlanilla } from './planilla.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, attrs = {}, ...hijos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) if (h != null && h !== false) e.append(h.nodeType ? h : document.createTextNode(h));
  return e;
};
const leer = (o, ruta) => ruta.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
function escribir(o, ruta, v) {
  const ks = ruta.split('.'); let x = o;
  ks.slice(0, -1).forEach((k) => { if (typeof x[k] !== 'object' || x[k] === null) x[k] = {}; x = x[k]; });
  x[ks.at(-1)] = v;
}

// ── Estado ────────────────────────────────────────────────────────────
const id = location.pathname.split('/').filter(Boolean)[1];
const params = new URLSearchParams(location.search);
let clave = params.get('k');
try { if (clave) sessionStorage.setItem(`clave_${id}`, clave); else clave = sessionStorage.getItem(`clave_${id}`); } catch { /* modo privado */ }
if (params.has('k')) history.replaceState(null, '', location.pathname + location.hash);

let S = null;          // respuesta del servidor: evento, esquema, datos, textos, invitados…
let datos = {};
let pasoActual = null;
let guardarTimer = null, previaTimer = null, guardando = false, pendiente = false;

const api = (ruta = '', opciones = {}) => fetch(`/api/panel/${id}${ruta}`, {
  ...opciones, headers: { 'x-clave': clave || '', ...(opciones.body && !(opciones.body instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...(opciones.headers || {}) },
}).then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || 'Error'), { status: r.status, datos: j }); return j; });

function aviso(texto, error = false) {
  const a = $('#aviso');
  a.textContent = texto; a.className = `aviso${error ? ' error' : ''}`; a.hidden = false;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => { a.hidden = true; }, 3500);
}
const estado = (t) => { $('#estado-guardado').textContent = t; };

// "Pasate a Premium" según el idioma que eligió el cliente
const mejorarA = (paquete) => {
  const v = datos.variante || 'es';
  const nombre = paquete[0].toUpperCase() + paquete.slice(1);
  return v === 'en' ? `Upgrade to ${nombre}` : (v === 'es-ar' || v === 'es-cr') ? `Pasate a ${nombre}` : `Pásate a ${nombre}`;
};
const linkMejorar = (paquete) => `/tienda/?mejorar=${encodeURIComponent(id)}&a=${paquete}`;

// ── Guardado automático ───────────────────────────────────────────────
// Campos que copian a otro mientras el cliente no los cambie (texto de la dirección)
let espejos = [];
function cambio(ruta, valor, { rearmar = false } = {}) {
  const antes = leer(datos, ruta) ?? '';
  for (const e of espejos.filter((x) => x.de === ruta)) {
    const actual = leer(datos, e.id) ?? '';
    if (actual === '' || actual === antes) { escribir(datos, e.id, valor); e.input.value = valor; }
  }
  escribir(datos, ruta, valor);
  if (ruta === 'meta.descripcion' && $('#compartir-desc')) $('#compartir-desc').textContent = valor || String(S.textos?.['meta.descripcion'] || '');
  if (rearmar) dibujarPaso();
  else actualizarCondiciones();
  estado('Sin guardar…');
  clearTimeout(guardarTimer);
  guardarTimer = setTimeout(guardar, 900);
}

async function guardar() {
  if (guardando) { pendiente = true; return; }
  guardando = true; estado('Guardando…');
  try {
    await quizasMiniatura();
    const r = await api('', { method: 'PUT', body: JSON.stringify({ datos }) });
    S.faltan = r.faltan;
    estado('Guardado ✓');
    dibujarPasos();
    pintarFaltan();
    refrescarPrevia();
  } catch (e) {
    if (e.datos?.error === 'slug') { aviso('Ese link ya está ocupado. Elegir otro.', true); mostrarSlugOcupado(e.datos); }
    else aviso(e.status === 403 ? 'El link del panel no es válido.' : 'No se pudo guardar. Revisar la conexión.', true);
    estado('Sin guardar');
  } finally {
    guardando = false;
    if (pendiente) { pendiente = false; guardar(); }
  }
}

// Vista previa con dos iframes: la nueva versión carga atrás y recién cuando terminó se
// muestra (así no se ve la página a medio armar ni los nombres encimados al recargar)
const marcos = () => [...document.querySelectorAll('#escala iframe')];
// Dónde está cada sección en la invitación (id del elemento en los modelos)
const ANCLAS = { nombres: 'home-section', portada: 'home-section', historia: 'portfolio', galeria: 'portfolio', lugares: 'inicio', rsvp: 'rsvp', dresscode: 'dresscode',
  hospedaje: 'dresscode', bus: 'dresscode', itinerario: 'itinerario', testigos: 'testigos', album: 'instagram', canciones: 'musica', regalos: 'regalos', redes: 'regalos', pie: 'regalos' };
function irEnPrevia(f = marcos().find((x) => !x.classList.contains('atras')), suave = true) {
  try {
    const w = f.contentWindow, destino = f.contentDocument?.getElementById(ANCLAS[pasoActual?.id]);
    if (!destino) return;
    w.scrollTo({ top: destino.getBoundingClientRect().top + w.scrollY - (pasoActual.id === 'galeria' ? -260 : 10), behavior: suave ? 'smooth' : 'auto' });
  } catch { /* todavía cargando */ }
}
function cargarPrevia() {
  const [frente, atras] = [marcos().find((f) => !f.classList.contains('atras')), marcos().find((f) => f.classList.contains('atras'))];
  let y = 0;
  try { y = frente.contentWindow?.scrollY || 0; } catch { /* todavía vacío */ }
  const primera = !frente.src || frente.src === 'about:blank';
  atras.onload = () => {
    try {
      const w = atras.contentWindow;
      if (primera) irEnPrevia(atras, false); else w.scrollTo(0, y);
      w.dispatchEvent(new Event('scroll')); // las animaciones de entrada se disparan al hacer scroll
    } catch { /* otro origen */ }
    setTimeout(() => {
      atras.classList.remove('atras'); atras.removeAttribute('aria-hidden'); atras.removeAttribute('tabindex');
      frente.classList.add('atras'); frente.setAttribute('aria-hidden', 'true'); frente.setAttribute('tabindex', '-1');
    }, 120);
  };
  atras.src = `/vista/${id}?k=${encodeURIComponent(clave)}&t=${Date.now()}`;
}
function refrescarPrevia() {
  clearTimeout(previaTimer);
  previaTimer = setTimeout(() => {
    if (!S.evento.modelo) return;
    const visible = getComputedStyle($('#previa')).display !== 'none';
    if (visible) cargarPrevia();
    else $('#iframe-vista').dataset.pendiente = '1';
  }, 300);
}

// Celular o computadora: la computadora se ve a 1280 px de ancho, achicada para que entre
function escalarPrevia() {
  const p = $('#pantalla'); if (!p) return;
  const pc = p.classList.contains('pc');
  const caja = p.getBoundingClientRect();
  const e = $('#escala');
  if (!pc) { e.style.cssText = ''; return; }
  const k = caja.width / 1280;
  e.style.cssText = `width:1280px;height:${caja.height / k}px;transform:scale(${k});transform-origin:0 0`;
}
document.querySelectorAll('.modo-vista button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.modo-vista button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  $('#pantalla').className = `pantalla ${b.dataset.modo}`;
  requestAnimationFrame(escalarPrevia);
}));
$('#btn-completa')?.addEventListener('click', () => {
  const on = $('#previa').classList.toggle('completa');
  $('#btn-completa').setAttribute('aria-pressed', String(on));
  document.body.classList.toggle('sin-scroll', on);
  requestAnimationFrame(escalarPrevia);
});
addEventListener('resize', escalarPrevia);

// ── Miniatura para compartir ──────────────────────────────────────────
let firmaMiniatura = null;
async function quizasMiniatura() {
  if (!S.esquema.pasos.some((p) => p.campos.some((c) => c.id === 'miniatura.generada'))) return;
  const portada = (datos.fotos?.portada || [])[0];
  const conFotoPortada = datos.fotosOn?.portada !== false;
  const foto = datos.miniatura?.foto || (conFotoPortada ? portada?.url : '') || datos.fotos?.rsvp || (datos.fotos?.galeria || [])[0]?.url || '';
  // La miniatura es horizontal: el encuadre elegido para ella, o el de la portada en computadora
  const pos = datos.miniatura?.foto ? datos.miniatura?.fotoPos || '50% 50%' : portada?.posPc || portada?.pos;
  const conTexto = !!datos.miniatura?.conTexto;
  const nombres = [datos.nombres?.a, datos.nombres?.b].filter(Boolean).join(' & ');
  const fecha = (datos.celebracion?.inicio || datos.std?.fecha || '').slice(0, 10).split('-').reverse().join(' • ');
  const firma = JSON.stringify([foto, pos, conTexto, nombres, fecha]);
  if (firma === firmaMiniatura || !nombres) return;
  firmaMiniatura = firma;
  // Foto sola sin nombres: alcanza con la foto, no hace falta armar nada
  if (foto && !conTexto && !datos.miniatura?.foto) { escribir(datos, 'miniatura.generada', ''); pintarMiniatura(); return; }
  try {
    const blob = await armarMiniatura({ foto, pos, nombres, fecha, conTexto, estilo: S.modelo?.miniatura });
    const url = await subirArchivo(new File([blob], 'miniatura.jpg', { type: 'image/jpeg' }));
    escribir(datos, 'miniatura.generada', url);
  } catch (e) { console.warn('miniatura', e); }
  pintarMiniatura();
}
// Lo que se ve al compartir: la armada (con o sin nombres) o, si no hace falta armarla, la foto
const fuenteMiniatura = () => datos.miniatura?.generada || datos.miniatura?.foto || (datos.fotosOn?.portada !== false ? datos.fotos?.portada?.[0]?.url : '') || (S.evento.modelo ? `/modelos/${S.evento.modelo}/miniatura.jpg` : '');
function pintarMiniatura() {
  const img = $('#miniatura-previa'); if (img) img.src = fuenteMiniatura();
}

async function subirArchivo(archivo) {
  const f = new FormData(); f.append('archivo', archivo);
  return (await api('/archivo', { method: 'POST', body: f })).url;
}

// ── Condiciones (campos que aparecen según otros) ─────────────────────
// si: { campo, es | no } · [todas] · { o: [alguna] } (igual que en el servidor)
function cumple(s) {
  if (Array.isArray(s)) return s.every(cumple);
  if (s.o) return s.o.some(cumple);
  const v = leer(datos, s.campo);
  return s.es !== undefined ? v === s.es : s.no !== undefined ? (v ?? '') !== s.no : !!v;
}
const visible = (c) => !c.si || cumple(c.si);
function actualizarCondiciones() {
  document.querySelectorAll('[data-si]').forEach((n) => { n.hidden = !cumple(JSON.parse(n.dataset.si)); });
}

// ── Campos ────────────────────────────────────────────────────────────
const placeholder = (c) => c.placeholder || (c.placeholderClave ? (S.textos[c.placeholderClave] || '').replace(/<br>/g, ' ') : '');

function contador(input, max) {
  if (!max) return null;
  const n = el('div', { class: 'contador' });
  const act = () => { n.textContent = `${input.value.length} / ${max}`; n.classList.toggle('lleno', input.value.length >= max); };
  input.addEventListener('input', act); act();
  return n;
}

// ── Fotos con encuadre ────────────────────────────────────────────────
// Cada foto se ve grande en su marco con la proporción fija del diseño y se
// encuadra arrastrándola (con el dedo o el mouse; también con las flechas).
const proporcionCSS = (p) => (p ? p.replace(':', ' / ') : '');
const leerPos = (p) => (p || '50% 50%').split(' ').map((x) => parseFloat(x) || 0);

function marcoEncuadre({ url, pos, proporcion, etiqueta, redonda = false, zoom = null, alSoltar, alZoom }) {
  let [px, py] = leerPos(pos);
  let z = Math.max(1, Number(zoom) || 1);
  // La foto va en una capa: se encuadra con background-position y se acerca con scale (como en la invitación)
  const capa = el('div', { class: 'marco-img', style: `background-image:url("${url}")` });
  const marco = el('div', { class: `marco${redonda ? ' redonda' : ''}`, tabindex: 0, role: 'slider', 'aria-label': `${etiqueta || 'Encuadre'}: arrastrar la foto para encuadrarla`,
    style: `aspect-ratio:${proporcionCSS(proporcion)}` },
  capa, el('span', { class: 'pista' }, '✥ Arrastrar'));
  const img = new Image(); img.src = url;
  const pintar = () => {
    capa.style.backgroundPosition = `${px}% ${py}%`;
    capa.style.transformOrigin = `${px}% ${py}%`;
    capa.style.transform = z > 1 ? `scale(${z})` : '';
  };
  pintar();
  const guardar = () => alSoltar(`${Math.round(px)}% ${Math.round(py)}%`);
  // Cuánto se puede mover la foto en cada eje (lo que sobra del marco, más lo que agranda el zoom)
  const sobrante = () => {
    const r = marco.getBoundingClientRect();
    if (!img.naturalWidth) return { ox: (z - 1) * r.width, oy: (z - 1) * r.height };
    const s = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);
    return { ox: img.naturalWidth * s - r.width + (z - 1) * r.width, oy: img.naturalHeight * s - r.height + (z - 1) * r.height };
  };
  let inicio = null;
  marco.addEventListener('pointerdown', (e) => {
    inicio = { x: e.clientX, y: e.clientY, px, py, ...sobrante() };
    marco.setPointerCapture(e.pointerId); marco.classList.add('moviendo');
  });
  marco.addEventListener('pointermove', (e) => {
    if (!inicio) return;
    const lim = (v) => Math.max(0, Math.min(100, v));
    if (inicio.ox > 1) px = lim(inicio.px - ((e.clientX - inicio.x) / inicio.ox) * 100);
    if (inicio.oy > 1) py = lim(inicio.py - ((e.clientY - inicio.y) / inicio.oy) * 100);
    pintar();
  });
  const soltar = () => { if (!inicio) return; inicio = null; marco.classList.remove('moviendo'); guardar(); };
  marco.addEventListener('pointerup', soltar); marco.addEventListener('pointercancel', soltar);
  marco.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[e.key];
    if (!d) return; e.preventDefault();
    px = Math.max(0, Math.min(100, px + d[0])); py = Math.max(0, Math.min(100, py + d[1])); pintar(); guardar();
  });
  if (!alZoom) return marco;
  // Zoom con − y + (testigos y padrinos)
  const nivel = el('span', { class: 'zoom-nivel' });
  const cambiarZoom = (d) => { z = Math.round(Math.max(1, Math.min(3, z + d)) * 100) / 100; nivel.textContent = `${Math.round(z * 100)}%`; pintar(); alZoom(z > 1 ? z : undefined); };
  nivel.textContent = `${Math.round(z * 100)}%`;
  return el('div', { class: 'marco-con-zoom' }, marco,
    el('div', { class: 'zoom' }, el('button', { type: 'button', class: 'btn-zoom', 'aria-label': 'Alejar', onclick: () => cambiarZoom(-0.25) }, '−'), nivel,
      el('button', { type: 'button', class: 'btn-zoom', 'aria-label': 'Acercar', onclick: () => cambiarZoom(0.25) }, '+')));
}

async function subirVarias(input, cuantas) {
  const urls = [];
  for (const a of [...input.files].slice(0, cuantas)) {
    try { urls.push(await subirArchivo(await achicarFoto(a))); } catch (e) { aviso(e.message || 'No se pudo subir la foto', true); }
  }
  return urls;
}

function botonSubir({ texto, multiple, alSubir, cuantas, proporcion, clase = '' }) {
  const input = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple });
  const boton = el('label', { class: `agregar ${clase}`, style: proporcion ? `aspect-ratio:${proporcionCSS(proporcion)}` : null }, input, el('span', {}, texto));
  input.addEventListener('change', async () => {
    boton.classList.add('subiendo'); boton.lastChild.textContent = 'Subiendo…';
    alSubir(await subirVarias(input, cuantas));
  });
  return boton;
}

// Una sola foto. Con encuadre, la posición se guarda aparte (ruta + "Pos"); con zoom, (ruta + "Zoom").
// El recuadro para subir y el marco de encuadre tienen el mismo tamaño.
function campoFoto(c, valor, alCambiar, { pos, alPos, zoom, alZoom } = {}) {
  const caja = el('div', { class: `foto-una${c.redonda ? ' chica' : ''}${c.sinRecorte ? ' sin-recorte' : ''}` });
  const dibujar = (url) => {
    caja.replaceChildren();
    if (url) {
      const vista = c.encuadre && c.proporcion && !c.sinRecorte
        ? marcoEncuadre({ url, pos: pos?.(), proporcion: c.proporcion, redonda: c.redonda, etiqueta: c.etiqueta, zoom: zoom?.(), alSoltar: (p) => alPos?.(p), alZoom: c.zoom ? (z) => alZoom?.(z) : null })
        : el('div', { class: 'foto-tal-cual' }, el('img', { src: url, alt: '' }));
      caja.append(el('div', { class: 'con-quitar' }, vista,
        el('button', { type: 'button', class: 'quitar', 'aria-label': 'Quitar foto', onclick: () => { alCambiar(''); alPos?.(undefined); alZoom?.(undefined); dibujar(''); } }, '✕')));
    } else if (!c.bloqueado && !c.cerrado) {
      caja.append(botonSubir({ texto: '＋ Subir foto', multiple: false, cuantas: 1, proporcion: c.sinRecorte ? null : (c.proporcion || '4:3'),
        alSubir: (urls) => { if (urls[0]) { alPos?.(undefined); alZoom?.(undefined); alCambiar(urls[0]); } dibujar(urls[0] || ''); } }));
    }
  };
  dibujar(valor);
  return caja;
}

// Varias fotos (galería, portada, dress code…)
const proporcionDe = (c) => (c.proporcionDe ? c.proporcionDe.valores[leer(datos, c.proporcionDe.campo)] || c.proporcion : c.proporcion);
function campoFotos(c, valor, alCambiar) {
  let lista = [].concat(valor || []).map((f) => (typeof f === 'string' ? { url: f } : { ...f }));
  if (c.pestanas) return fotosEnPestanas(c, lista, alCambiar);
  const prop = proporcionDe(c);
  const caja = el('div', { class: 'fotos-grilla', 'data-forma': forma(prop) });
  const emitir = () => alCambiar(lista.map((f) => ({ ...f })));
  const dibujar = () => {
    caja.replaceChildren();
    lista.forEach((f, i) => {
      const quitar = el('button', { type: 'button', class: 'quitar', 'aria-label': 'Quitar foto', onclick: () => { lista.splice(i, 1); dibujar(); emitir(); } }, '✕');
      const mover = i > 0 ? el('button', { type: 'button', class: 'mover', 'aria-label': 'Mover antes', onclick: () => { [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]; dibujar(); emitir(); } }, '◀') : null;
      const vista = prop
        ? marcoEncuadre({ url: f.url, pos: f.pos, proporcion: prop, etiqueta: `Foto ${i + 1}`, alSoltar: (p) => { f.pos = p; emitir(); } })
        : el('div', { class: 'foto' }, el('img', { src: f.url, alt: '', loading: 'lazy' }));
      caja.append(el('div', { class: 'con-quitar' }, vista, quitar, mover));
    });
    if (lista.length < (c.max || 12) && !c.bloqueado && !c.cerrado) {
      caja.append(botonSubir({ texto: `＋ Agregar (${lista.length}/${c.max || 12})`, multiple: true, cuantas: (c.max || 12) - lista.length, proporcion: prop,
        alSubir: (urls) => { lista.push(...urls.map((url) => ({ url }))); dibujar(); emitir(); } }));
    }
  };
  dibujar();
  return caja;
}

// Portada: una pestaña por foto; en cada una la foto se encuadra para pantalla horizontal y vertical
function fotosEnPestanas(c, lista, alCambiar) {
  const max = c.max || 1;
  let activa = 0;
  const emitir = () => alCambiar(lista.filter(Boolean).map((f) => ({ ...f })));
  const caja = el('div', { class: 'pestanas-fotos' });
  const dibujar = () => {
    const f = lista[activa];
    const tabs = max > 1 ? el('div', { class: 'pestanas', role: 'tablist' }, Array.from({ length: max }, (_, i) => el('button', {
      type: 'button', role: 'tab', class: `pestana${lista[i] ? ' con-foto' : ''}`, 'aria-selected': String(i === activa),
      onclick: () => { activa = i; dibujar(); } }, `Foto ${i + 1}`))) : null;
    const subir = botonSubir({ texto: f ? `Cambiar foto ${activa + 1}` : `Cargar foto ${activa + 1}`, multiple: false, cuantas: 1, clase: 'cargar',
      alSubir: (urls) => { if (urls[0]) { const n = Math.min(activa, lista.length); lista[n] = { url: urls[0] }; activa = n; emitir(); } dibujar(); } });
    const marcoH = f ? marcoEncuadre({ url: f.url, pos: f.posPc || f.pos, proporcion: '16:9', etiqueta: 'Pantalla horizontal', alSoltar: (p) => { f.posPc = p; emitir(); } })
      : el('div', { class: 'marco vacio', style: 'aspect-ratio:16 / 9' });
    const marcoV = f ? marcoEncuadre({ url: f.url, pos: f.pos, proporcion: '9:16', etiqueta: 'Pantalla vertical', alSoltar: (p) => { f.pos = p; emitir(); } })
      : el('div', { class: 'marco vacio', style: 'aspect-ratio:9 / 16' });
    const quitar = f && !c.bloqueado ? el('button', { type: 'button', class: 'btn-link quitar-foto', onclick: () => {
      lista.splice(activa, 1); activa = Math.min(activa, Math.max(0, lista.filter(Boolean).length - 1)); emitir(); dibujar(); } }, 'Quitar esta foto') : null;
    caja.replaceChildren(...[tabs, el('div', { class: 'pestana-cuerpo' },
      el('div', { class: 'col-h' }, el('div', { class: 'subir-portada' }, subir, quitar), el('figure', {}, marcoH, el('figcaption', {}, 'Pantalla horizontal'))),
      el('figure', { class: 'col-v' }, marcoV, el('figcaption', {}, 'Pantalla vertical')),
      el('p', { class: 'pista-pestana' }, 'Cada foto se ve distinta en una pantalla vertical (celular) o horizontal (computadora). Arrastrar cada foto para encuadrarla.'))].filter(Boolean));
  };
  dibujar();
  return caja;
}
const forma = (p) => { if (!p) return 'libre'; const [a, b] = p.split(':').map(Number); return a / b > 1.2 ? 'ancha' : a / b < 0.8 ? 'alta' : 'cuadrada'; };

// Número con − y + (acompañantes, segundo de inicio de la canción…)
function campoContador(c, valor, alCambiar, idHtml) {
  const min = c.min ?? 0, max = c.max ?? 99, paso = c.paso || 1;
  let n = Number(valor ?? c.defecto ?? min) || min;
  const salida = el('output', { id: idHtml, 'aria-live': 'polite' }, String(n));
  const cambiar = (d) => { n = Math.max(min, Math.min(max, n + d)); salida.textContent = String(n); menos.disabled = n <= min; mas.disabled = n >= max; alCambiar(n); };
  const menos = el('button', { type: 'button', class: 'btn-contador', 'aria-label': 'Menos', disabled: !!c.bloqueado || n <= min, onclick: () => cambiar(-paso) }, '−');
  const mas = el('button', { type: 'button', class: 'btn-contador', 'aria-label': 'Más', disabled: !!c.bloqueado || n >= max, onclick: () => cambiar(paso) }, '+');
  return el('div', { class: 'contador-num' }, menos, salida, mas);
}

// Íconos del itinerario: desplegable con el ícono y su nombre
function selectorIconos(c, actual, alCambiar, idHtml) {
  let elegido = actual || '';
  const src = (v) => c.iconos.replace('{v}', v);
  const nombre = (v) => c.valores.find((o) => o.v === v)?.etiqueta || '';
  const lista = el('div', { class: 'lista-iconos', role: 'listbox', hidden: true });
  const muestra = el('span', { class: 'icono-tile' });
  const texto = el('span', { class: 'nombre' });
  const cerrar = () => { lista.hidden = true; boton.setAttribute('aria-expanded', 'false'); };
  const boton = el('button', { type: 'button', class: 'icono-actual', id: idHtml, 'aria-haspopup': 'listbox', 'aria-expanded': 'false', disabled: !!c.bloqueado,
    onclick: () => { lista.hidden = !lista.hidden; boton.setAttribute('aria-expanded', String(!lista.hidden)); if (!lista.hidden) lista.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); } },
  muestra, texto, el('span', { class: 'flecha' }, '▾'));
  const pintar = () => {
    muestra.replaceChildren(elegido ? el('img', { src: src(elegido), alt: '' }) : el('span', { class: 'sin-icono' }, '?'));
    texto.textContent = elegido ? nombre(elegido) : 'Elegir ícono';
    lista.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.v === elegido)));
  };
  lista.append(...c.valores.map((o) => el('button', { type: 'button', role: 'option', 'data-v': o.v,
    onclick: () => { elegido = o.v; cerrar(); pintar(); alCambiar(o.v); } },
  el('span', { class: 'icono-tile chico' }, el('img', { src: src(o.v), alt: '', loading: 'lazy' })), el('span', {}, o.etiqueta))));
  document.addEventListener('click', (e) => { if (!caja.contains(e.target)) cerrar(); });
  pintar();
  const caja = el('div', { class: 'selector-iconos' }, boton, lista);
  return caja;
}

function campoMp3(c, valor, alCambiar) {
  const caja = el('div', { class: 'campo-mp3' });
  const dibujar = (v) => {
    caja.replaceChildren();
    if (v) caja.append(el('audio', { controls: true, preload: 'none', src: v, style: 'width:100%' }),
      el('button', { type: 'button', class: 'btn btn-sec btn-chico', onclick: () => { alCambiar(''); dibujar(''); } }, 'Quitar canción'));
    else {
      const input = el('input', { type: 'file', accept: 'audio/mpeg,.mp3', disabled: c.bloqueado });
      const estadoArchivo = el('span', { class: 'sin-archivo' }, 'Ningún archivo elegido');
      input.addEventListener('change', async () => {
        const a = input.files[0]; if (!a) return;
        if (!/mpeg|mp3/.test(a.type) && !/\.mp3$/i.test(a.name)) { aviso('Solo archivos MP3', true); return; }
        if (a.size > (c.maxMB || 12) * 1048576) { aviso(`El MP3 supera ${c.maxMB || 12} MB`, true); return; }
        estadoArchivo.textContent = `Subiendo ${a.name}…`;
        try { const url = await subirArchivo(new File([a], a.name, { type: 'audio/mpeg' })); alCambiar(url); dibujar(url); } catch (e) { aviso(e.message, true); estadoArchivo.textContent = 'No se pudo subir'; }
      });
      caja.append(el('label', { class: `btn btn-cargar${c.bloqueado ? ' deshabilitado' : ''}` }, input, '♫ Cargar música'), estadoArchivo);
    }
  };
  dibujar(valor);
  return caja;
}

// Video de portada (MP4, hasta 30 segundos): se ve en pantalla vertical y horizontal
function campoVideo(c, valor, alCambiar) {
  const caja = el('div', { class: 'campo-video' });
  const dibujar = (v) => {
    caja.replaceChildren();
    if (v) {
      const video = (clase) => el('video', { class: clase, src: v, muted: true, autoplay: true, loop: true, playsinline: true });
      caja.append(el('div', { class: 'videos' },
        el('figure', { class: 'col-h' }, el('div', { class: 'pantalla h' }, video('fondo'), video('frente')), el('figcaption', {}, 'Pantalla horizontal')),
        el('figure', { class: 'col-v' }, el('div', { class: 'pantalla v' }, video('frente')), el('figcaption', {}, 'Pantalla vertical'))),
      el('button', { type: 'button', class: 'btn btn-sec btn-chico', onclick: () => { alCambiar(''); dibujar(''); } }, 'Quitar video'));
      caja.querySelectorAll('video').forEach((x) => { x.muted = true; });
      return;
    }
    const input = el('input', { type: 'file', accept: 'video/mp4,.mp4', disabled: c.bloqueado });
    const estadoArchivo = el('span', { class: 'sin-archivo' }, 'Ningún archivo elegido');
    input.addEventListener('change', async () => {
      const a = input.files[0]; if (!a) return;
      if (a.size > (c.maxMB || 40) * 1048576) { aviso(`El video supera ${c.maxMB || 40} MB`, true); return; }
      const seg = await new Promise((ok) => { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => ok(v.duration); v.onerror = () => ok(NaN); v.src = URL.createObjectURL(a); });
      if (!(seg <= (c.maxSeg || 30) + 0.5)) { aviso(`El video tiene que durar hasta ${c.maxSeg || 30} segundos`, true); return; }
      estadoArchivo.textContent = `Subiendo ${a.name}…`;
      try { const url = await subirArchivo(new File([a], a.name, { type: 'video/mp4' })); alCambiar(url); dibujar(url); } catch (e) { aviso(e.message, true); estadoArchivo.textContent = 'No se pudo subir'; }
    });
    caja.append(el('label', { class: 'btn btn-cargar' }, input, '▶ Cargar video'), estadoArchivo);
  };
  dibujar(valor);
  return caja;
}

// Tarjetas con dibujo (cómo se ve la galería, proporción de las fotos)
const DIBUJOS = {
  carrusel: '<rect x="4" y="12" width="6" height="20" rx="1"/><rect x="14" y="6" width="20" height="32" rx="2" class="lleno"/><rect x="38" y="12" width="6" height="20" rx="1"/>',
  mosaico: '<rect x="4" y="6" width="22" height="32" rx="2" class="lleno"/><rect x="29" y="6" width="15" height="14.5" rx="2"/><rect x="29" y="23.5" width="15" height="14.5" rx="2"/>',
  grilla: '<rect x="4" y="6" width="19" height="14.5" rx="2" class="lleno"/><rect x="25" y="6" width="19" height="14.5" rx="2"/><rect x="4" y="23.5" width="19" height="14.5" rx="2"/><rect x="25" y="23.5" width="19" height="14.5" rx="2" class="lleno"/>',
  polaroids: '<g transform="rotate(-6 16 22)"><rect x="5" y="6" width="20" height="28" rx="1"/><rect x="8" y="9" width="14" height="15" class="lleno"/></g><g transform="rotate(6 32 22)"><rect x="23" y="8" width="20" height="28" rx="1"/><rect x="26" y="11" width="14" height="15" class="lleno"/></g>',
  cuadrada: '<rect x="12" y="6" width="24" height="24" rx="1"/>',
  horizontal: '<rect x="6" y="9" width="36" height="22" rx="1"/>',
  vertical: '<rect x="15" y="3" width="18" height="30" rx="1"/>',
};
function tarjetas(c, actual, alCambiar, dis) {
  const ayuda = el('p', { class: 'ayuda' });
  const pintarAyuda = (v) => { ayuda.textContent = c.valores.find((o) => o.v === v)?.ayuda || ''; ayuda.hidden = !ayuda.textContent; };
  const grupo = el('div', { class: `tarjetas tarjetas-${c.tarjetas}`, role: 'radiogroup' }, c.valores.map((o) => {
    const i = el('input', { type: 'radio', name: `t-${c.id}`, value: o.v, checked: o.v === actual, disabled: dis });
    i.addEventListener('change', () => { pintarAyuda(o.v); alCambiar(o.v, c.rearmar ? { rearmar: true } : undefined); });
    return el('label', { class: 'tarjeta-opcion' }, i, el('span', { class: 'dibujo', html: `<svg viewBox="0 0 48 40" aria-hidden="true">${DIBUJOS[o.v] || ''}</svg>` }), el('span', { class: 'nombre' }, o.etiqueta));
  }));
  pintarAyuda(actual);
  return [grupo, ayuda];
}

// Colores elegidos (dress code: colores a evitar): círculos con ✕ y "Agregar"
function campoColores(c, valor, alCambiar, dis) {
  let lista = [].concat(valor || []).filter(Boolean);
  const caja = el('div', { class: 'chips-color' });
  const dibujar = () => {
    caja.replaceChildren(...lista.map((col, i) => {
      const input = el('input', { type: 'color', value: col, 'aria-label': `Color ${i + 1}`, disabled: dis });
      input.addEventListener('change', () => { lista[i] = input.value; alCambiar([...lista]); dibujar(); });
      return el('span', { class: 'chip-color', style: `--c:${col}` }, input,
        dis ? null : el('button', { type: 'button', class: 'quitar-color', 'aria-label': 'Quitar color', onclick: () => { lista.splice(i, 1); alCambiar([...lista]); dibujar(); } }, '✕'));
    }));
    if (lista.length < (c.max || 4) && !dis) {
      const nuevo = el('input', { type: 'color', value: '#ffffff', class: 'oculto-color' });
      nuevo.addEventListener('change', () => { lista.push(nuevo.value); alCambiar([...lista]); dibujar(); });
      caja.append(el('label', { class: 'btn btn-sec btn-chico agregar-color' }, nuevo, '＋ Agregar'));
    }
  };
  dibujar();
  return caja;
}

// Paleta del diseño: los 4 colores originales del modelo para cambiar (o quitar)
function campoPaleta(c, valor, alCambiar, dis) {
  const original = c.original || [];
  let lista = original.map((o, i) => (Array.isArray(valor) && i in valor ? valor[i] : o));
  const caja = el('div', { class: 'paleta' });
  const emitir = () => alCambiar([...lista]);
  const dibujar = () => caja.replaceChildren(...lista.map((col, i) => {
    const muestra = el('input', { type: 'color', value: col || '#ffffff', 'aria-label': `Color ${i + 1}`, disabled: dis });
    const hex = el('input', { type: 'text', value: col || '', maxlength: 7, placeholder: 'Quitar', spellcheck: 'false', 'aria-label': `Color ${i + 1} en hexadecimal`, disabled: dis });
    muestra.addEventListener('input', () => { lista[i] = muestra.value; hex.value = muestra.value; emitir(); });
    hex.addEventListener('input', () => { const v = hex.value.trim(); if (/^#[0-9a-f]{6}$/i.test(v)) { lista[i] = v; muestra.value = v; emitir(); } });
    return el('div', { class: `color-fila${col ? '' : ' quitado'}` }, el('span', { class: 'nombre' }, `Color ${i + 1}`), muestra, hex,
      el('button', { type: 'button', class: 'btn-icono', title: col ? 'Quitar este color' : 'Volver al original', disabled: dis,
        onclick: () => { lista[i] = col ? '' : original[i]; emitir(); dibujar(); } }, col ? '✕' : '↺'));
  }));
  dibujar();
  return caja;
}

// Tipografías: grilla con "Abc" en cada fuente y una prueba con texto y tamaño
function campoFuente(c, valor, alCambiar, dis) {
  let elegida = valor || '';
  let tam = 34, todas = false;
  const caja = el('div', { class: 'fuentes' });
  const prueba = el('input', { type: 'text', class: 'prueba-texto', value: '', placeholder: 'Escribir un texto para probar', maxlength: 60 });
  const dibujar = () => {
    const visibles = todas ? c.valores : c.valores.slice(0, 20);
    const grilla = el('div', { class: 'grilla-fuentes', role: 'radiogroup' }, visibles.map((f) => el('button', {
      type: 'button', role: 'radio', 'aria-checked': String(f === elegida), class: 'fuente', disabled: dis,
      onclick: () => { elegida = f; alCambiar(f); dibujar(); } }, el('span', { class: 'abc', style: `font-family:'${f}'` }, 'Abc'), el('span', { class: 'nombre' }, f))));
    const mas = c.valores.length > 20 ? el('button', { type: 'button', class: 'btn-link', onclick: () => { todas = !todas; dibujar(); } }, todas ? 'Ver menos fuentes' : `Ver todas (${c.valores.length})`) : null;
    prueba.style.fontFamily = elegida ? `'${elegida}'` : '';
    prueba.style.fontSize = `${tam}px`;
    const muestra = elegida ? el('div', { class: 'prueba' }, el('small', {}, 'Fuente elegida'), el('strong', {}, elegida), prueba,
      el('div', { class: 'tamano' }, 'Tamaño', el('button', { type: 'button', class: 'btn-zoom', 'aria-label': 'Más chico', onclick: () => { tam = Math.max(16, tam - 4); prueba.style.fontSize = `${tam}px`; } }, '−'),
        el('button', { type: 'button', class: 'btn-zoom', 'aria-label': 'Más grande', onclick: () => { tam = Math.min(72, tam + 4); prueba.style.fontSize = `${tam}px`; } }, '+'))) : null;
    caja.replaceChildren(...[grilla, mas, muestra].filter(Boolean));
  };
  dibujar();
  return caja;
}

// Idioma principal: un desplegable y, para el español, sus variantes
function campoIdioma(c, valor, alCambiar, idHtml, dis) {
  const actual = valor || c.defecto || 'es';
  const base = actual.startsWith('es') ? 'es' : actual;
  const s = el('select', { id: idHtml, disabled: dis }, c.idiomas.map((o) => el('option', { value: o.v, selected: o.v === base }, o.etiqueta)));
  s.addEventListener('change', () => alCambiar(s.value === 'es' ? (actual.startsWith('es') ? actual : 'es') : s.value, { rearmar: true }));
  const radios = base === 'es' ? el('div', { class: 'opciones variantes', role: 'radiogroup' }, c.variantes.map((o) => {
    const i = el('input', { type: 'radio', name: `var-${idHtml}`, value: o.v, checked: o.v === actual, disabled: dis });
    i.addEventListener('change', () => alCambiar(o.v));
    return el('label', { class: 'opcion' }, i, el('span', {}, o.etiqueta));
  })) : null;
  return [s, radios];
}

// País y zona horaria: un buscador sobre la lista de todos los países
function campoZona(c, valor, alCambiar, idHtml, dis) {
  const s = el('select', { id: idHtml, disabled: dis }, el('option', { value: '' }, 'Elegir…'),
    (c.valores || []).map((o) => el('option', { value: o.v, selected: o.v === valor }, o.etiqueta)));
  s.addEventListener('change', () => alCambiar(s.value));
  return s;
}

// Cómo se ve el link al compartirlo (como en Facebook o WhatsApp)
function vistaCompartir() {
  const nombres = [datos.nombres?.a, datos.nombres?.b].filter(Boolean).join(' & ');
  const t = (k) => String(S.textos?.[k] || '');
  const tituloLink = t('meta.titulo').replace('{evento}', t('evento.nombre')).replace('{nombres}', nombres || '…');
  const desc = datos.meta?.descripcion || t('meta.descripcion');
  return el('div', { class: 'tarjeta-compartir' },
    el('img', { id: 'miniatura-previa', alt: '', src: fuenteMiniatura() }),
    el('div', { class: 'cuerpo' }, el('small', {}, 'AMOINVITAR.COM'), el('strong', { id: 'compartir-titulo' }, tituloLink), el('span', { id: 'compartir-desc' }, desc)));
}

function campoSlug(c, valor, alCambiar) {
  const input = el('input', { type: 'text', value: valor || '', maxlength: c.max, autocomplete: 'off', spellcheck: 'false', 'aria-describedby': 'estado-slug' });
  const info = el('div', { class: 'estado-slug', id: 'estado-slug', 'aria-live': 'polite' });
  const chips = el('div', { class: 'chips' });
  let t = null;
  const revisar = async () => {
    const s = input.value;
    if (s.length < 3) { info.textContent = 'Mínimo 3 letras.'; info.className = 'estado-slug no'; return; }
    const r = await api(`/slug?s=${encodeURIComponent(s)}`);
    if (r.pedido !== s) input.value = r.pedido;
    info.textContent = r.disponible ? '✓ Disponible' : 'Ese link ya está ocupado. Opciones libres:';
    info.className = `estado-slug ${r.disponible ? 'ok' : 'no'}`;
    chips.replaceChildren(...(r.disponible ? [] : r.alternativas.map((x) => el('button', { type: 'button', onclick: () => { input.value = x; revisar(); } }, x))));
    if (r.disponible) alCambiar(r.pedido);
  };
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(revisar, 500); });
  mostrarSlugOcupado = (r) => { info.textContent = 'Ese link ya está ocupado. Opciones libres:'; info.className = 'estado-slug no'; chips.replaceChildren(...r.alternativas.map((x) => el('button', { type: 'button', onclick: () => { input.value = x; revisar(); } }, x))); };
  if (!valor) {
    // Primera vez: proponer uno con los nombres
    const n = datos.nombres || {};
    const base = [n.a, n.b].filter(Boolean).join(' y ');
    if (base) { input.value = base; setTimeout(revisar, 0); }
  }
  return el('div', {}, el('div', { class: 'slug' }, el('span', {}, c.prefijo), input), info, chips);
}
let mostrarSlugOcupado = () => {};

function campoInvitados() {
  const caja = el('div');
  let lista = S.invitados.map((i) => ({ ...i }));
  const linkDe = (i) => `${location.origin}/${S.evento.tipo}/${datos.slug || S.evento.slug || '…'}?inv=${i.codigo}`;
  let t = null;
  const guardarLista = () => { clearTimeout(t); t = setTimeout(async () => {
    try { const r = await api('/invitados', { method: 'PUT', body: JSON.stringify({ invitados: lista }) }); lista = r.invitados; S.invitados = r.invitados; dibujar(); estado('Guardado ✓'); } catch { aviso('No se pudo guardar la lista', true); }
  }, 800); };
  const pegar = el('textarea', { placeholder: 'Nombre, pases extra, mesa (una fila por invitado)', rows: 3 });
  const sumar = (filas) => {
    const nuevas = filas.filter((x) => x.nombre);
    lista.push(...nuevas);
    dibujar(); guardarLista();
    aviso(nuevas.length ? `${nuevas.length} invitados sumados` : 'No se encontraron nombres en el archivo', !nuevas.length);
  };
  const archivo = el('input', { type: 'file', accept: '.xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv' });
  archivo.addEventListener('change', async () => {
    const a = archivo.files[0]; if (!a) return;
    try { sumar(await leerPlanilla(a)); } catch (e) { aviso(e.message || 'No se pudo leer el archivo', true); }
    archivo.value = '';
  });
  const dibujar = () => {
    const pinVisible = datos.acceso?.modo === 'pin' && datos.acceso?.pinPorInvitado;
    const filas = lista.map((i, n) => el('tr', {},
      el('td', {}, el('input', { type: 'text', value: i.nombre, 'aria-label': 'Nombre', oninput: (e) => { i.nombre = e.target.value; guardarLista(); } })),
      el('td', {}, el('input', { type: 'number', class: 'num', min: 0, max: 50, value: i.pases ?? 0, 'aria-label': 'Pases extra', oninput: (e) => { i.pases = e.target.value; guardarLista(); } })),
      el('td', {}, el('input', { type: 'text', class: 'num', value: i.mesa ?? '', 'aria-label': 'Mesa', oninput: (e) => { i.mesa = e.target.value; guardarLista(); } })),
      pinVisible ? el('td', { class: 'pin' }, i.pin || '…') : null,
      el('td', { class: 'acciones-fila' }, i.codigo ? el('button', { type: 'button', class: 'btn-icono', title: 'Copiar link personal', onclick: () => { navigator.clipboard.writeText(linkDe(i) + (pinVisible ? `  (PIN ${i.pin})` : '')); aviso('Link copiado'); } }, '🔗') : null,
        i.codigo ? el('a', { class: 'btn-icono', title: 'Enviar por WhatsApp', target: '_blank', rel: 'noopener', href: `https://wa.me/?text=${encodeURIComponent(`${linkDe(i)}${pinVisible ? `\nPIN: ${i.pin}` : ''}`)}` }, '💬') : null,
        el('button', { type: 'button', class: 'btn-icono', title: 'Quitar', onclick: () => { lista.splice(n, 1); dibujar(); guardarLista(); } }, '✕'))));
    caja.replaceChildren(
      el('div', { class: 'envolver-tabla' }, el('table', { class: 'tabla-invitados' },
        el('thead', {}, el('tr', {}, el('th', {}, 'Nombre'), el('th', {}, 'Pases extra'), el('th', {}, 'Mesa'), pinVisible ? el('th', {}, 'PIN') : null, el('th', {}, ''))),
        el('tbody', {}, filas))),
      el('p', {}, el('button', { type: 'button', class: 'btn btn-sec btn-chico', onclick: () => { lista.push({ nombre: '', pases: 0 }); dibujar(); caja.querySelector('tbody tr:last-child input')?.focus(); } }, '＋ Agregar invitado')),
      el('div', { class: 'subir-excel' },
        el('label', { class: 'btn btn-chico' }, archivo, '⬆ Subir Excel o CSV'),
        el('a', { class: 'btn btn-sec btn-chico', href: '/panel/plantilla-invitados.xlsx', download: 'invitados.xlsx' }, 'Descargar planilla modelo')),
      el('p', { class: 'ayuda' }, 'Columnas: nombre, pases extra y mesa. Si la planilla tiene títulos ("Nombre", "Pases", "Mesa"…) se reconocen solos, en cualquier orden.'),
      el('details', { class: 'pegar' }, el('summary', {}, 'Otra opción: pegar filas copiadas'),
        pegar,
        el('p', {}, el('button', { type: 'button', class: 'btn btn-sec btn-chico', onclick: () => {
          sumar(pegar.value.split('\n').map((l) => l.split(/\t|;|,/).map((x) => x.trim())).filter((x) => x[0])
            .map(([nombre, pases, mesa]) => ({ nombre, pases: parseInt(pases, 10) || 0, mesa })));
          pegar.value = '';
        } }, 'Sumar filas pegadas'))),
      el('p', { class: 'ayuda' }, `${lista.length} invitados · ${lista.reduce((s, i) => s + 1 + (parseInt(i.pases, 10) || 0), 0)} personas`));
  };
  dibujar();
  return caja;
}

function campoLista(c, valor, alCambiar) {
  const lista = [].concat(valor || []).map((x) => ({ ...x }));
  const caja = el('div');
  const emitir = () => alCambiar(lista.map((x) => ({ ...x })));
  const dibujar = () => {
    caja.replaceChildren(...lista.map((item, i) => el('div', { class: 'item-lista' },
      el('div', { class: 'cabeza' }, `${i + 1}`, el('span', {},
        i > 0 ? el('button', { type: 'button', class: 'btn-icono', 'aria-label': 'Subir', onclick: () => { [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]; dibujar(); emitir(); } }, '↑') : null,
        el('button', { type: 'button', class: 'btn-icono', 'aria-label': 'Quitar', onclick: () => { lista.splice(i, 1); dibujar(); emitir(); } }, '✕'))),
      el('div', { class: 'sub' }, c.campos.map((sc) => campo(sc, item[sc.id] ?? sc.defecto, (v) => { item[sc.id] = v; emitir(); }, `${c.id}-${i}`,
        { pos: () => item[`${sc.id}Pos`], alPos: (p) => { item[`${sc.id}Pos`] = p; emitir(); }, zoom: () => item[`${sc.id}Zoom`], alZoom: (z) => { item[`${sc.id}Zoom`] = z; emitir(); } }))))));
    if (lista.length < (c.max || 10) && !c.bloqueado && !c.cerrado && !c.sinExtra) caja.append(el('button', { type: 'button', class: 'btn btn-sec btn-chico', onclick: () => { lista.push({}); dibujar(); emitir(); } }, `＋ ${c.agregar || 'Agregar'}`));
  };
  dibujar();
  return caja;
}

// Texto sugerido (el del diseño) ya escrito en el campo, para que se entienda de qué se trata
const textoBase = (c) => (c.base ? String(S.textos?.[c.base] || '').replace(/<br\s*\/?>/gi, '\n') : '');
function conBase(c, i, valor, alCambiar) {
  if (!c.base) return null;
  const base = textoBase(c);
  if (valor == null || valor === '') i.value = base;
  const volver = el('button', { type: 'button', class: 'btn-link', hidden: (i.value === base), onclick: () => { i.value = base; volver.hidden = true; alCambiar(''); } }, '↺ Volver al texto sugerido');
  i.addEventListener('input', () => { volver.hidden = i.value === base; });
  return volver;
}

function control(c, valor, alCambiar, idHtml, extra = {}) {
  const dis = !!(c.bloqueado || c.cerrado || c.sinExtra || extra.desactivado);
  switch (c.tipo) {
    case 'texto': case 'url': {
      // Títulos de sección: el campo vacío muestra "Cambiar título" con el título que va por defecto
      const phTitulo = c.titulo ? `Cambiar título${textoBase(c) ? ` · ${textoBase(c).replace(/\n/g, ' ')}` : ''}` : '';
      const i = el('input', { id: idHtml, type: c.tipo === 'url' ? 'url' : 'text', value: valor ?? '', maxlength: c.max, placeholder: phTitulo || placeholder(c) || (c.tipo === 'url' ? 'https://' : ''), disabled: dis, inputmode: c.patron ? 'numeric' : null,
        'aria-label': c.titulo ? 'Título de la sección' : null });
      if (c.titulo) {
        i.addEventListener('input', () => alCambiar(i.value.trim() === textoBase(c).trim() ? '' : i.value));
        return [i, contador(i, c.max > 20 ? c.max : 0)];
      }
      const volver = conBase(c, i, valor, alCambiar);
      i.addEventListener('input', () => alCambiar(c.base && i.value === textoBase(c) ? '' : i.value));
      if (c.espejo) {
        espejos.push({ id: c.id, de: c.espejo, input: i });
        if (!i.value) i.value = leer(datos, c.espejo) || '';
      }
      return [i, contador(i, c.tipo === 'texto' && c.max > 20 ? c.max : 0), volver];
    }
    case 'area': {
      const i = el('textarea', { id: idHtml, maxlength: c.max, placeholder: placeholder(c), disabled: dis, rows: 2 });
      i.value = valor ?? '';
      const volver = conBase(c, i, valor, alCambiar);
      i.addEventListener('input', () => alCambiar(c.base && i.value === textoBase(c) ? '' : i.value));
      return [i, contador(i, c.max), volver];
    }
    case 'numero': {
      const i = el('input', { id: idHtml, type: 'number', value: valor ?? '', min: c.min, max: c.max, disabled: dis });
      i.addEventListener('input', () => alCambiar(i.value === '' ? '' : Number(i.value)));
      return i;
    }
    case 'fecha': case 'fechaHora': case 'hora': {
      const i = el('input', { id: idHtml, type: { fecha: 'date', fechaHora: 'datetime-local', hora: 'time' }[c.tipo], value: valor ?? '', disabled: dis });
      i.addEventListener('change', () => alCambiar(i.value));
      return i;
    }
    case 'color': {
      const i = el('input', { id: idHtml, type: 'color', value: valor || '#a78977', disabled: dis });
      i.addEventListener('input', () => alCambiar(i.value));
      return i;
    }
    case 'contador': return campoContador({ ...c, bloqueado: dis }, valor, alCambiar, idHtml);
    case 'switch': {
      if (c.estilo === 'check') {
        const i = el('input', { id: idHtml, type: 'checkbox', disabled: dis });
        i.checked = !!(valor ?? c.defecto);
        i.addEventListener('change', () => alCambiar(i.checked));
        return el('label', { class: 'casilla' }, i, el('span', {}, c.etiqueta, c.detalle ? el('small', {}, ` · ${c.detalle}`) : null));
      }
      const i = el('input', { id: idHtml, type: 'checkbox', role: 'switch', disabled: dis || extra.fijo });
      i.checked = extra.fijo ? true : !!(valor ?? c.defecto);
      const [a, b] = c.opciones || [];
      const ladoA = a ? el('span', { class: 'lado' }, a) : null, ladoB = b ? el('span', { class: 'lado' }, b) : null;
      const marcar = () => { ladoA?.classList.toggle('activo', !i.checked); ladoB?.classList.toggle('activo', i.checked); };
      i.addEventListener('change', () => { marcar(); alCambiar(i.checked, c.rearmar ? { rearmar: true } : undefined); });
      marcar();
      return el('label', { class: 'interruptor' }, ladoA, i, ladoB || (a ? null : el('span', {}, c.etiqueta)));
    }
    case 'opciones': {
      const actual = valor ?? c.defecto;
      if (c.multiple) {
        const marcados = new Set([].concat(actual || []));
        return el('div', { class: 'opciones' }, c.valores.map((o) => {
          const i = el('input', { type: 'checkbox', checked: marcados.has(o.v), disabled: dis });
          i.addEventListener('change', () => { i.checked ? marcados.add(o.v) : marcados.delete(o.v); alCambiar([...marcados]); });
          return el('label', { class: 'opcion' }, i, el('span', {}, o.etiqueta));
        }));
      }
      if (c.iconos) return selectorIconos(c, actual, alCambiar, idHtml);
      if (c.tarjetas) return tarjetas(c, actual, alCambiar, dis);
      if (c.distintoDe) {
        // Idiomas adicionales: sin repetir el principal
        const principal = String(leer(datos, c.distintoDe) || 'es').slice(0, 2);
        c = { ...c, valores: c.valores.filter((o) => o.v !== principal) };
      }
      if (c.valores.length <= 4) {
        const nombre = `r-${idHtml}`;
        return el('div', { class: 'opciones', role: 'radiogroup' }, c.valores.map((o) => {
          // Opción que necesita otra cosa activada antes (p. ej. link personal → lista de invitados)
          const falta = o.requiere && !cumple(o.requiere) && o.v !== actual;
          const i = el('input', { type: 'radio', name: nombre, value: o.v, checked: o.v === actual, disabled: dis || falta });
          i.addEventListener('change', () => alCambiar(o.v, { rearmar: true }));
          return el('label', { class: `opcion${falta ? ' apagada' : ''}` }, i, el('span', {}, o.etiqueta, o.ayuda ? el('small', {}, o.ayuda) : null,
            falta ? el('small', { class: 'motivo' }, o.motivo, ' ', o.irA ? el('button', { type: 'button', class: 'btn-link', onclick: (e) => { e.preventDefault(); irA(o.irA); } }, 'Ir a RSVP →') : null) : null));
        }));
      }
      const s = el('select', { id: idHtml, disabled: dis }, el('option', { value: '' }, 'Elegir…'), c.valores.map((o) => el('option', { value: o.v, selected: o.v === actual }, o.etiqueta)));
      s.addEventListener('change', () => alCambiar(s.value, c.rearmar ? { rearmar: true } : undefined));
      return s;
    }
    case 'zona': return campoZona(c, valor, alCambiar, idHtml, dis);
    case 'idioma': return campoIdioma(c, valor, alCambiar, idHtml, dis);
    case 'paleta': return campoPaleta(c, valor, alCambiar, dis);
    case 'colores': return campoColores(c, valor, alCambiar, dis);
    case 'fuente': return campoFuente(c, valor, alCambiar, dis);
    case 'video': return campoVideo({ ...c, bloqueado: dis }, valor, alCambiar);
    case 'vistaCompartir': return vistaCompartir();
    case 'foto': return campoFoto({ ...c, bloqueado: dis }, valor, alCambiar, extra);
    case 'fotos': return campoFotos(c, valor, alCambiar);
    case 'mp3': return campoMp3(c, valor, alCambiar);
    case 'lista': return campoLista(c, valor, alCambiar);
    case 'slug': return campoSlug(c, valor, alCambiar);
    case 'invitados': return campoInvitados();
    case 'nota':
      if (c.estilo === 'linea') return el('hr', { class: 'separador' });
      if (c.estilo === 'etiqueta') return el('div', { class: 'etiqueta' }, c.texto);
      return el('p', { class: c.estilo === 'subtitulo' ? 'subtitulo-nota' : 'nota' }, c.texto);
    default: return el('span', {}, '');
  }
}

let contadorIds = 0;
function campo(c, valor, alCambiar, prefijo = '', posicion = {}) {
  if (c.oculto) return null;
  const idHtml = `c-${prefijo}${c.id.replace(/\W/g, '-')}-${++contadorIds}`;
  const insignia = c.bloqueado ? el('a', { class: 'insignia', href: linkMejorar(c.bloqueado) }, mejorarA(c.bloqueado))
    : c.sinExtra ? el('a', { class: 'insignia', href: `/tienda/?mejorar=${encodeURIComponent(id)}&extra=${c.sinExtra}` }, 'Contratar adicional') : null;
  // Necesita algo de otra sección, o queda fijo por lo que se eligió en otra
  const desactivado = c.requiere && !cumple(c.requiere) && !leer(datos, c.id);
  const fijo = c.fijoSi && cumple(c.fijoSi);
  const motivo = desactivado || fijo ? el('p', { class: 'motivo' }, c.motivo, ' ',
    desactivado && c.irA ? el('button', { type: 'button', class: 'btn-link', onclick: () => irA(c.irA) }, 'Ir a RSVP →') : null) : null;
  const aviso = c.cerrado ? el('p', { class: 'motivo' }, c.cerrado)
    : c.sinExtra ? el('p', { class: 'motivo' }, c.sinExtra === 'idioma' ? 'Idioma adicional: se activa al contratarlo.' : 'Es un adicional: se activa al contratarlo.') : null;
  const extra = { ...posicion, desactivado, fijo };
  if (!posicion.pos && (c.tipo === 'foto' && c.encuadre)) { extra.pos = () => leer(datos, `${c.id}Pos`); extra.alPos = (p) => cambio(`${c.id}Pos`, p); }
  const sinEtiqueta = (c.tipo === 'switch' && !c.opciones) || c.tipo === 'nota' || c.titulo || c.sinEtiqueta;
  const etiqueta = sinEtiqueta ? null
    : ['texto', 'url', 'area', 'numero', 'fecha', 'fechaHora', 'hora', 'color', 'zona', 'idioma'].includes(c.tipo) || (c.tipo === 'opciones' && !c.multiple && !c.tarjetas && (c.iconos || c.valores.length > 4))
      ? el('label', { for: idHtml, class: c.requerido ? 'requerido' : '' }, c.etiqueta, insignia)
      : el('div', { class: `etiqueta${c.requerido ? ' requerido' : ''}` }, c.etiqueta, insignia);
  const clases = ['campo', c.ancho === 'mitad' ? 'mitad' : '', c.tipo === 'nota' && c.estilo ? `nota-${c.estilo}` : '', c.bloqueado || c.cerrado || c.sinExtra || desactivado ? 'bloqueado' : ''].filter(Boolean).join(' ');
  const nodo = el('div', { class: clases, 'data-si': c.si ? JSON.stringify(c.si) : null },
    etiqueta, control(c, valor, alCambiar, idHtml, extra), sinEtiqueta && insignia, motivo, aviso, c.ayuda ? el('p', { class: 'ayuda' }, c.ayuda) : null);
  if (c.si) nodo.hidden = !visible(c);
  return nodo;
}

// ── Pasos ─────────────────────────────────────────────────────────────
function dibujarPasos() {
  const nav = $('#pasos');
  const conFaltas = new Set((S.faltan || []).map((f) => f.paso));
  const pasos = S.esquema.pasos;
  nav.replaceChildren(
    el('div', { class: 'pasos-cabeza' }, el('strong', {}, 'Secciones'), el('button', { type: 'button', class: 'btn-icono', 'aria-label': 'Cerrar', onclick: cerrarPasos }, '✕')),
    ...pasos.map((p, i) => el('button', {
      type: 'button', class: 'paso', 'aria-current': p.id === pasoActual?.id ? 'step' : null,
      onclick: () => { cerrarPasos(); irA(p.id); },
    }, el('span', { class: 'num' }, i + 1), el('span', { class: 'nombre' }, p.titulo),
    p.bloqueado ? el('span', { class: 'candado', 'aria-label': 'No incluido en el paquete' }, '🔒') : null,
    conFaltas.has(p.id) ? el('span', { class: 'falta', 'aria-label': 'Faltan datos' }) : null)));
  // Celular: botón con el paso actual que abre la lista completa
  const i = pasos.indexOf(pasoActual);
  $('#selector-pasos').replaceChildren(
    el('span', { class: 'donde' }, el('small', {}, `Sección ${i + 1} de ${pasos.length}`), el('strong', {}, pasoActual?.titulo || '')),
    el('span', { class: 'ver-todas' }, '☰ Ver todas'),
    el('span', { class: 'progreso', style: `--avance:${((i + 1) / pasos.length) * 100}%` }));
}
function abrirPasos() { $('#pasos').classList.add('abierta'); document.body.classList.add('sin-scroll'); $('#pasos [aria-current="step"]')?.focus(); }
function cerrarPasos() { $('#pasos').classList.remove('abierta'); document.body.classList.remove('sin-scroll'); }
$('#selector-pasos').addEventListener('click', abrirPasos);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarPasos(); });

function irA(idPaso) {
  pasoActual = S.esquema.pasos.find((p) => p.id === idPaso) || S.esquema.pasos[0];
  history.replaceState(null, '', `#${pasoActual.id}`);
  dibujarPasos(); dibujarPaso();
  irEnPrevia();
  $('#formulario').focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
  const boton = $('#pasos [aria-current="step"]'); boton?.scrollIntoView({ block: 'nearest', inline: 'center' });
}

// Aviso de lo que falta en el paso actual (se actualiza al guardar)
function pintarFaltan() {
  const caja = $('#faltan-aca'); if (!caja) return;
  const faltan = (S.faltan || []).filter((x) => x.paso === pasoActual?.id);
  caja.replaceChildren(...(faltan.length ? [el('div', { class: 'tarjeta faltan' }, 'Faltan datos:', el('ul', {}, faltan.map((x) => el('li', {}, x.etiqueta))))] : []));
}

function dibujarPaso() {
  espejos = [];
  const p = pasoActual;
  const f = $('#formulario');
  const i = S.esquema.pasos.indexOf(p);
  const anterior = S.esquema.pasos[i - 1], siguiente = S.esquema.pasos[i + 1];
  const toggleSeccion = p.seccion && !p.bloqueado ? (() => {
    const chk = el('input', { type: 'checkbox', role: 'switch' });
    chk.checked = leer(datos, `secciones.${p.seccion}`) !== false;
    chk.addEventListener('change', () => cambio(`secciones.${p.seccion}`, chk.checked));
    return el('label', { class: 'interruptor' }, el('span', { class: 'lado' }, 'Mostrar'), chk);
  })() : null;
  const ayudaSeccion = p.ayudaSeccion && !p.bloqueado ? el('p', { class: 'ayuda ayuda-seccion' }, p.ayudaSeccion) : null;

  const cuerpo = p.especial === 'respuestas' ? panelRespuestas()
    : p.bloqueado
    ? el('div', { class: 'tarjeta mejorar' }, el('div', { class: 'icono' }, '🔒'),
      el('h2', {}, `${p.titulo} viene en ${p.bloqueado[0].toUpperCase()}${p.bloqueado.slice(1)}`),
      el('p', {}, 'Se puede sumar ahora y lo cargado hasta acá queda guardado.'),
      el('a', { class: 'btn btn-premium', href: linkMejorar(p.bloqueado) }, mejorarA(p.bloqueado)))
    : el('div', { class: 'tarjeta' }, p.campos.map((c) => campo(c, leer(datos, c.id), (v, op) => cambio(c.id, v, op))));

  f.replaceChildren(...[
    el('div', { class: 'paso-titulo' }, el('h1', {}, p.titulo), toggleSeccion),
    ayudaSeccion,
    el('div', { id: 'faltan-aca' }),
    cuerpo,
    el('div', { class: 'navegar' },
      anterior ? el('button', { type: 'button', class: 'btn btn-sec', onclick: () => irA(anterior.id) }, el('small', {}, '← Anterior'), el('span', {}, anterior.titulo)) : el('span'),
      siguiente ? el('button', { type: 'button', class: 'btn siguiente', onclick: () => irA(siguiente.id) }, el('small', {}, 'Siguiente →'), el('span', {}, siguiente.titulo)) : el('span')),
  ].filter(Boolean));
  pintarFaltan();
}

// ── Respuestas: confirmaciones y canciones que mandan los invitados ───
function panelRespuestas() {
  const caja = el('div', {}, el('div', { class: 'tarjeta' }, el('p', { class: 'ayuda' }, 'Cargando respuestas…')));
  (async () => {
    let r;
    try { r = (await api('/respuestas')).respuestas || []; } catch { caja.replaceChildren(el('div', { class: 'tarjeta' }, el('p', {}, 'No se pudieron cargar las respuestas.'))); return; }
    const rsvp = r.filter((x) => x.tipo === 'rsvp'), canciones = r.filter((x) => x.tipo === 'cancion');
    const publicada = S.evento.estado === 'publicado';
    // Si un invitado respondió más de una vez, vale la última
    const ultimas = new Map();
    for (const x of rsvp) { const k = x.datos.inv && !String(x.datos.inv).startsWith('inv-') ? x.datos.inv : `${x.datos.nombre}|${x.creado}`; if (!ultimas.has(k)) ultimas.set(k, x); }
    const filas = [...ultimas.values()];
    // Invitado + acompañantes + niños (igual que el aforo en el servidor)
    const personas = (x) => (x.datos.asiste === 'Si' ? 1 + (x.datos.acompanantes && x.datos.acompanantes !== 'No' ? String(x.datos.acompanantes).split(',').filter((n) => n.trim()).length : 0)
      + (/^\d+$/.test(String(x.datos.ninos || '').trim()) ? Number(x.datos.ninos) : 0) : 0);
    const si = filas.filter((x) => x.datos.asiste === 'Si'), no = filas.filter((x) => x.datos.asiste === 'No');
    const total = si.reduce((t, x) => t + personas(x), 0);
    const respondieron = new Set(filas.map((x) => x.datos.inv));
    const pendientes = (S.invitados || []).filter((i) => !respondieron.has(i.codigo));
    // Columnas: las que mandó el formulario, con sus títulos
    const titulos = {};
    for (const x of filas) { try { Object.assign(titulos, JSON.parse(x.datos.labels || '{}')); } catch { /* sin títulos */ } }
    const columnas = Object.keys(titulos).filter((k) => !['nombre', 'asiste'].includes(k));
    const fecha = (iso) => new Date(iso).toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const csv = () => {
      const cab = ['Nombre', 'Asiste', 'Personas', ...columnas.map((k) => titulos[k]), 'Fecha'];
      const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const cuerpo = filas.map((x) => [x.datos.nombre, x.datos.asiste === 'Si' ? 'Sí' : 'No', personas(x), ...columnas.map((k) => x.datos[k]), fecha(x.creado)].map(celda).join(';'));
      const blob = new Blob([`\uFEFF${[cab.map(celda).join(';'), ...cuerpo].join('\n')}`], { type: 'text/csv;charset=utf-8' });
      const a = el('a', { href: URL.createObjectURL(blob), download: 'confirmaciones.csv' }); document.body.append(a); a.click(); a.remove();
    };
    caja.replaceChildren(...[
      publicada ? null : el('div', { class: 'tarjeta nota' }, 'La invitación todavía no está publicada: cuando se publique, acá van llegando las confirmaciones y las canciones que sugieran los invitados.'),
      el('div', { class: 'resumen' },
        el('div', { class: 'dato' }, el('strong', {}, String(total)), el('span', {}, 'personas confirmadas')),
        el('div', { class: 'dato' }, el('strong', {}, String(si.length)), el('span', {}, 'respuestas "sí"')),
        el('div', { class: 'dato' }, el('strong', {}, String(no.length)), el('span', {}, 'no pueden ir')),
        S.invitados?.length ? el('div', { class: 'dato' }, el('strong', {}, String(pendientes.length)), el('span', {}, 'sin responder')) : null),
      el('div', { class: 'tarjeta' },
        el('div', { class: 'cabeza-tabla' }, el('h2', {}, 'Confirmaciones'), filas.length ? el('button', { type: 'button', class: 'btn btn-sec btn-chico', onclick: csv }, '⬇ Descargar Excel') : null),
        filas.length ? el('div', { class: 'envolver-tabla' }, el('table', { class: 'tabla-invitados' },
          el('thead', {}, el('tr', {}, el('th', {}, 'Nombre'), el('th', {}, 'Asiste'), el('th', {}, 'Personas'), columnas.map((k) => el('th', {}, titulos[k])), el('th', {}, 'Fecha'))),
          el('tbody', {}, filas.map((x) => el('tr', {}, el('td', {}, x.datos.nombre || ''), el('td', {}, x.datos.asiste === 'Si' ? '✅ Sí' : '❌ No'), el('td', {}, String(personas(x))),
            columnas.map((k) => el('td', {}, x.datos[k] || '')), el('td', {}, fecha(x.creado)))))))
          : el('p', { class: 'ayuda' }, 'Todavía no hay confirmaciones.')),
      pendientes.length && S.invitados?.length ? el('div', { class: 'tarjeta' }, el('h2', {}, 'Sin responder'),
        el('ul', { class: 'lista-simple' }, pendientes.map((i) => el('li', {}, i.nombre)))) : null,
      el('div', { class: 'tarjeta' }, el('h2', {}, 'Canciones sugeridas'),
        canciones.length ? el('ul', { class: 'lista-simple' }, canciones.map((x) => el('li', {}, `🎵 ${x.datos.cancion || ''}`, el('small', {}, ` · ${fecha(x.creado)}`))))
          : el('p', { class: 'ayuda' }, 'Todavía no hay canciones sugeridas.')),
    ].filter(Boolean));
  })();
  return caja;
}

// ── Publicar y vista previa ───────────────────────────────────────────
$('#btn-publicar').addEventListener('click', async () => {
  clearTimeout(guardarTimer); await guardar();
  try {
    const r = await api('/publicar', { method: 'POST' });
    S.evento.estado = r.estado;
    if (r.link) { aviso('¡Publicada! Link copiado.'); navigator.clipboard?.writeText(r.link).catch(() => {}); window.open(r.link, '_blank', 'noopener'); }
    else aviso('¡Listo! El equipo de diseño ya tiene todo para empezar.');
  } catch (e) {
    if (e.datos?.faltan) { S.faltan = e.datos.faltan; dibujarPasos(); irA(e.datos.faltan[0].paso); aviso('Faltan algunos datos para publicar.', true); }
    else aviso(e.message, true);
  }
});
$('#btn-vista').addEventListener('click', () => {
  $('#previa').classList.add('abierta');
  const f = $('#iframe-vista');
  if (f.dataset.pendiente || marcos().every((x) => x.src === 'about:blank')) { delete f.dataset.pendiente; cargarPrevia(); }
  requestAnimationFrame(escalarPrevia);
});
$('#btn-cerrar-vista').addEventListener('click', () => {
  $('#previa').classList.remove('abierta', 'completa'); document.body.classList.remove('sin-scroll');
  $('#btn-completa')?.setAttribute('aria-pressed', 'false'); requestAnimationFrame(escalarPrevia);
});

// ── Marca blanca: logo y colores de la empresa ────────────────────────
function aplicarMarca(m) {
  if (!m?.blanca) return;
  const raiz = document.documentElement.style;
  if (m.colores?.principal) raiz.setProperty('--acento', m.colores.principal);
  if (m.colores?.texto) raiz.setProperty('--acento-texto', m.colores.texto);
  const a = $('#marca');
  a.href = m.web || '#'; a.classList.add('propia');
  a.replaceChildren(m.logo ? el('img', { src: m.logo, alt: m.nombre || '' }) : el('strong', {}, m.nombre || ''));
  document.title = `Panel · ${m.nombre || ''}`;
}

// ── "Necesito ayuda": WhatsApp directo (con marca blanca, el de la empresa si lo cargó) ──
function botonAyuda() {
  const numero = S.marca?.blanca ? String(S.marca.whatsapp || '').replace(/\D/g, '') : S.ayuda?.whatsapp;
  if (!numero) return;
  const nombres = [datos.nombres?.a, datos.nombres?.b].filter(Boolean).join(' y ');
  const texto = `Hola! Necesito ayuda con mi invitación${nombres ? ` (${nombres})` : ''}. Código: ${id}`;
  const href = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  const icono = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3 1 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.4-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.3-.2Z"/></svg>';
  $('.acciones').prepend(el('a', { class: 'btn btn-sec btn-ayuda', href, target: '_blank', rel: 'noopener', html: `${icono}<span>Necesito ayuda</span>` }));
  document.body.append(el('a', { class: 'ayuda-flotante', href, target: '_blank', rel: 'noopener', 'aria-label': 'Necesito ayuda (WhatsApp)', html: `${icono}<span>Ayuda</span>` }));
}

// ── Inicio ────────────────────────────────────────────────────────────
(async () => {
  try { S = await api(); } catch (e) {
    if (e.status === 403 && !clave) { location.href = `/entrar?siguiente=${encodeURIComponent(location.pathname)}`; return; }
    $('#formulario').replaceChildren(el('div', { class: 'tarjeta mejorar' }, el('h2', {}, 'No se pudo abrir el panel'), el('p', {}, e.status === 403 ? 'El link no es válido o venció. Entrar con el mail de la compra en amoinvitar.com/entrar.' : 'Revisar la conexión y volver a intentar.')));
    $('#titulo-evento').textContent = '';
    return;
  }
  datos = S.datos || {};
  // Antes la fecha y la hora iban juntas ("inicio"); ahora son dos campos
  for (const p of ['ceremonia', 'celebracion']) {
    const l = datos[p];
    if (l?.inicio && !l.fecha) { l.fecha = l.inicio.slice(0, 10); if (l.inicio.length > 10) l.hora = l.inicio.slice(11, 16); }
  }
  // Opciones que ya vienen elegidas (p. ej. "hay ceremonia"): cuentan desde el principio
  for (const p of S.esquema.pasos) for (const c of p.campos) {
    if (['opciones', 'contador'].includes(c.tipo) && c.defecto !== undefined && leer(datos, c.id) === undefined && !c.multiple) escribir(datos, c.id, c.defecto);
  }
  if (S.modelo?.miniatura?.colorTitulos) document.documentElement.style.setProperty('--icono-fondo', S.modelo.miniatura.colorTitulos);
  aplicarMarca(S.marca);
  botonAyuda();
  // El botón de secciones queda pegado justo debajo de la barra (que en celular ocupa dos líneas)
  const medirBarra = () => document.documentElement.style.setProperty('--alto-barra', `${$('.barra').offsetHeight}px`);
  medirBarra(); addEventListener('resize', medirBarra);
  const nombres = [datos.nombres?.a, datos.nombres?.b].filter(Boolean).join(' & ');
  $('#titulo-evento').textContent = nombres || 'Mi invitación';
  if (!S.evento.modelo) { $('#btn-vista').hidden = true; $('#previa').remove(); }
  if (!['invitacion', 'std-web', 'compromiso-web', 'std-web-medida'].includes(S.evento.producto)) $('#btn-publicar').textContent = 'Enviar al diseño';
  estado(S.evento.estado === 'publicado' ? 'Publicada' : 'Borrador');
  irA(location.hash.slice(1));
  refrescarPrevia();
})();
