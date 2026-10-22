// Panel del cliente · se arma solo con el esquema que manda el servidor
// (src/panel/esquemas.js). No hay un panel distinto por modelo.

import { armarMiniatura, achicarFoto } from './miniatura.js';
import { leerPlanilla } from './planilla.js';
import { editorTarjeta, dibujarTarjeta } from './tarjeta.js';

const $ = (s, r = document) => r.querySelector(s);

// ── Textos del panel ──────────────────────────────────────────────────
// El panel está escrito en español neutro (tú). Para las otras variantes
// (España, rioplatense, centroamericano) alcanza con sumar frases a
// VARIANTES_PANEL: todos los textos pasan por T() al armarse.
// Se elige con ?es=es-ES (o queda guardado en el navegador). Por ahora
// solo se usa el neutro.
const VARIANTES_PANEL = {
  'es-ES': { celular: 'móvil', Celular: 'Móvil', computadora: 'ordenador', Computadora: 'Ordenador' },
  'es-AR': {},
  'es-CR': {},
};
const variantePanel = (() => {
  const v = new URLSearchParams(location.search).get('es');
  try { if (v) localStorage.setItem('ai-panel-es', v); return v || localStorage.getItem('ai-panel-es') || 'es'; } catch { return v || 'es'; }
})();
const reemplazos = Object.entries(VARIANTES_PANEL[variantePanel] || {}).map(([a, b]) => [new RegExp(`(^|[^\\p{L}])${a}(?=$|[^\\p{L}])`, 'gu'), `$1${b}`]);
const T = (t) => (reemplazos.length && typeof t === 'string' ? reemplazos.reduce((x, [r, b]) => x.replace(r, b), t) : t);

const el = (tag, attrs = {}, ...hijos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) if (h != null && h !== false) e.append(h.nodeType ? h : document.createTextNode(T(String(h))));
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
  if (ruta.startsWith('nombres.')) $('#titulo-evento').textContent = [datos.nombres?.a, datos.nombres?.b].filter(Boolean).join(' & ') || 'Mi invitación';
  if (rearmar) { dibujarPaso(); dibujarPasos(); }
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
    if (r.plan) { S.plan = r.plan; pintarPlan(); }
    if (r.textosIdiomas) S.textosIdiomas = r.textosIdiomas;
    // Si cambió el esquema (por ejemplo, un idioma adicional suma sus campos) se redibuja el paso
    const cambioEsquema = r.esquema && JSON.stringify(r.esquema.pasos.map((x) => [x.id, x.campos.length])) !== JSON.stringify(S.esquema.pasos.map((x) => [x.id, x.campos.length]));
    if (r.esquema) S.esquema = r.esquema;
    if (cambioEsquema) { pasoActual = S.esquema.pasos.find((x) => x.id === pasoActual?.id) || S.esquema.pasos[0]; if (!document.activeElement?.closest?.('#formulario input, #formulario textarea')) dibujarPaso(); }
    else pasoActual = S.esquema.pasos.find((x) => x.id === pasoActual?.id) || pasoActual;
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
const ANCLAS = { portada: 'home-section', musica: 'home-section', historia: 'portfolio', galeria: 'galeria', lugares: 'inicio', rsvp: 'rsvp', invitados: 'rsvp', dresscode: 'dresscode', estilos: 'dresscode',
  hospedaje: 'hospedaje-bus', bus: 'hospedaje-bus', itinerario: 'itinerario', testigos: 'testigos', instagram: 'hashtag', album: 'instagram', canciones: 'musica', playlist: 'playlist', regalos: 'regalos', redes: 'cierre', pie: 'cierre' };
function irEnPrevia(f = marcos().find((x) => !x.classList.contains('atras')), suave = true) {
  try {
    const w = f.contentWindow, destino = f.contentDocument?.getElementById(ANCLAS[pasoActual?.id]);
    if (!destino) return;
    w.scrollTo({ top: destino.getBoundingClientRect().top + w.scrollY - 10, behavior: suave ? 'smooth' : 'auto' });
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
  previaTimer = setTimeout(() => { if (S.evento.modelo && $('#previa')) cargarPrevia(); }, 300);
}

// La invitación se arma siempre al tamaño de un dispositivo real y se achica entera para
// entrar en el marco (si no, en un marco angosto se veía más apretada que en un teléfono).
// · Computadora: 1280 px de ancho.  · Celular: 390 × 845.
// · Vista dividida del celular: el ancho real de la pantalla y un alto fijo, así al mover la
//   división la invitación no cambia de alto (los fondos de 100vh no se estiran ni se achican).
function escalarPrevia() {
  const p = $('#pantalla'); if (!p) return;
  const e = $('#escala');
  const ancho = p.clientWidth, alto = p.clientHeight;
  if (!ancho) return;
  const pc = p.classList.contains('pc');
  const dividida = matchMedia('(max-width: 1023px)').matches && !document.body.classList.contains('ver-previa');
  let w, h, k;
  if (pc) { w = 1280; k = ancho / w; h = alto / k; }
  else if (dividida) { w = ancho; k = 1; h = Math.max(innerHeight, 560); }
  else { w = 390; k = ancho / w; h = alto / k; }
  e.style.cssText = `width:${w}px;height:${Math.round(h)}px;transform:scale(${k});transform-origin:0 0`;
}
if (window.ResizeObserver && $('#pantalla')) new ResizeObserver(() => escalarPrevia()).observe($('#pantalla'));
document.querySelectorAll('.modo-vista button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.modo-vista button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.modo === b.dataset.modo)));
  $('#pantalla').className = `pantalla ${b.dataset.modo}`;
  requestAnimationFrame(escalarPrevia);
}));
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

// El "12 / 80" va dentro del campo, abajo a la derecha (no suma un renglón)
function conContador(input, max) {
  const n = contador(input, max);
  return n ? el('div', { class: `con-contador${input.tagName === 'TEXTAREA' ? ' area' : ''}` }, input, n) : input;
}
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

// ── Íconos (trazo fino, del mismo estilo que el de la música) ────────────
const TRAZOS = {
  portada: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
  musica: '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  historia: '<path d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5Z"/><path d="M12 6.5v13"/>',
  galeria: '<rect x="7" y="3" width="14" height="14" rx="2"/><path d="M3 7v12a2 2 0 0 0 2 2h12"/><path d="M21 13l-4-4-6 6"/>',
  lugares: '<path d="M12 21s-6-5.3-6-11a6 6 0 1 1 12 0c0 5.7-6 11-6 11Z"/><circle cx="12" cy="10" r="2.2"/>',
  rsvp: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  invitados: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2A5 5 0 0 1 21 19"/>',
  dresscode: '<path d="M12 6a2 2 0 1 1 2-2"/><path d="M12 6v2l-9 7a1.5 1.5 0 0 0 1 3h16a1.5 1.5 0 0 0 1-3l-9-7"/>',
  estilos: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1.2-1-1.6-1-2.6 0-.9.7-1.4 1.6-1.4H16a5 5 0 0 0 5-5c0-4.1-4-7.5-9-7.5Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14.5" cy="7" r="1"/>',
  hospedaje: '<path d="M3 18V7"/><path d="M3 14h18v4"/><path d="M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.8"/>',
  bus: '<rect x="5" y="3" width="14" height="15" rx="2"/><path d="M5 11h14"/><circle cx="8.5" cy="14.5" r="1"/><circle cx="15.5" cy="14.5" r="1"/><path d="M7 18v2M17 18v2"/>',
  itinerario: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  testigos: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/><path d="M14.5 5.5l3 3"/><path d="M4 21h16"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".8"/>',
  album: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  canciones: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  playlist: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r=".6"/>',
  regalos: '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 13h18M12 9v12"/><path d="M12 9S9 3 6.5 5.5 12 9 12 9Zm0 0s3-6 5.5-3.5S12 9 12 9Z"/>',
  redes: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6"/>',
  pie: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  descargar: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  std: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9.5h18M8 3v4M16 3v4"/><path d="M12 17.5s-3-1.8-3-4a1.6 1.6 0 0 1 3-.9 1.6 1.6 0 0 1 3 .9c0 2.2-3 4-3 4Z"/>',
  agradecimiento: '<path d="M7 11v9H4v-9z"/><path d="M7 11l4-7c1.3 0 2.2 1.1 2 2.4L12.5 10H18a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7"/>',
  diseno: '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.4-1.3-1.6-1.3-3s1.3-2 3-2h1.6c2 0 3.7-1.4 3.7-3.5C21 6 17 3 12 3Z"/><circle cx="7.5" cy="10.5" r="1.2"/><circle cx="10.5" cy="6.8" r="1.2"/><circle cx="15" cy="7" r="1.2"/>',
  idiomaAdicional: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.7 3 2.7 15 0 18M12 3c-2.7 3-2.7 15 0 18"/>',
  seguridad: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  publicar: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  camara: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  centrar: '<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  quitar: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  prender: '<path d="M12 3v9"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/>',
  enviar: '<path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
};
const icono = (n, tam = 18) => (TRAZOS[n] ? `<svg class="ico" viewBox="0 0 24 24" width="${tam}" height="${tam}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TRAZOS[n]}</svg>` : '');

// Arrastrar fotos sin desencuadrarlas al hacer scroll en el celular: con el dedo hay que
// mantener apretado un instante (vibra) y recién ahí se mueve; si se desliza enseguida, la
// página scrollea normal. Con el mouse se arrastra directo.
const esTactil = matchMedia('(pointer: coarse)').matches;
const PISTA = esTactil ? '✥ Mantener y arrastrar' : '✥ Arrastrar';
function arrastrable(elemento, { alEmpezar, alMover, alSoltar }) {
  const punto = (e) => ({ x: e.clientX, y: e.clientY, objetivo: e.target });
  elemento.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || e.button > 0) return;
    e.preventDefault();
    elemento.setPointerCapture(e.pointerId);
    alEmpezar(punto(e));
    const mover = (ev) => alMover(punto(ev));
    const soltar = () => { elemento.removeEventListener('pointermove', mover); elemento.removeEventListener('pointerup', soltar); elemento.removeEventListener('pointercancel', soltar); alSoltar(); };
    elemento.addEventListener('pointermove', mover); elemento.addEventListener('pointerup', soltar); elemento.addEventListener('pointercancel', soltar);
  });
  let toque = null;
  elemento.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) { toque = null; return; }
    const t = e.touches[0];
    toque = { x: t.clientX, y: t.clientY, objetivo: e.target, activo: false };
    toque.timer = setTimeout(() => {
      if (!toque) return;
      toque.activo = true; elemento.classList.add('activo');
      navigator.vibrate?.(12);
      alEmpezar({ x: toque.x, y: toque.y, objetivo: toque.objetivo });
    }, 230);
  }, { passive: true });
  elemento.addEventListener('touchmove', (e) => {
    if (!toque) return;
    const t = e.touches[0];
    if (!toque.activo) {
      if (Math.hypot(t.clientX - toque.x, t.clientY - toque.y) > 10) { clearTimeout(toque.timer); toque = null; }
      return;
    }
    e.preventDefault();
    alMover({ x: t.clientX, y: t.clientY, objetivo: toque.objetivo });
  }, { passive: false });
  const fin = () => { if (!toque) return; clearTimeout(toque.timer); if (toque.activo) { elemento.classList.remove('activo'); alSoltar(); } toque = null; };
  elemento.addEventListener('touchend', fin); elemento.addEventListener('touchcancel', fin);
}

function marcoEncuadre({ url, pos, proporcion, etiqueta, redonda = false, zoom = null, alSoltar, alZoom }) {
  let [px, py] = leerPos(pos);
  let z = Math.max(1, Number(zoom) || 1);
  // La foto va en una capa: se encuadra con background-position y se acerca con scale (como en la invitación)
  const capa = el('div', { class: 'marco-img', style: `background-image:url("${url}")` });
  const marco = el('div', { class: `marco${redonda ? ' redonda' : ''}`, tabindex: 0, role: 'slider', 'aria-label': `${etiqueta || 'Encuadre'}: arrastrar la foto para encuadrarla`,
    style: `aspect-ratio:${proporcionCSS(proporcion)}` },
  capa, el('span', { class: 'pista' }, PISTA));
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
  const lim = (v) => Math.max(0, Math.min(100, v));
  arrastrable(marco, {
    alEmpezar: (p) => { inicio = { x: p.x, y: p.y, px, py, ...sobrante() }; marco.classList.add('moviendo'); },
    alMover: (p) => {
      if (!inicio) return;
      if (inicio.ox > 1) px = lim(inicio.px - ((p.x - inicio.x) / inicio.ox) * 100);
      if (inicio.oy > 1) py = lim(inicio.py - ((p.y - inicio.y) / inicio.oy) * 100);
      pintar();
    },
    alSoltar: () => { if (!inicio) return; inicio = null; marco.classList.remove('moviendo'); guardar(); },
  });
  marco.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[e.key];
    if (!d) return; e.preventDefault();
    px = lim(px + d[0]); py = lim(py + d[1]); pintar(); guardar();
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

// Encuadre de la portada: la foto entera con los dos recortes encima (celular y computadora).
// Arrastrando el punto (o la foto) se mueven los dos a la vez; arrastrando un marco, solo ese.
const ASPECTO = { cel: 9 / 16, pc: 16 / 9 };
function encuadrePortada({ url, pos, posPc, alCambiar }) {
  const p = { cel: leerPos(pos), pc: leerPos(posPc || pos) };
  const img = el('img', { src: url, alt: '', draggable: 'false' });
  const marcoCel = el('div', { class: 'recorte cel' }, el('span', { class: 'rotulo' }, 'Celular'));
  const marcoPc = el('div', { class: 'recorte pc' }, el('span', { class: 'rotulo' }, 'Computadora'));
  const punto = el('div', { class: 'foco', 'aria-hidden': 'true' });
  const lienzo = el('div', { class: 'lienzo', role: 'application', 'aria-label': 'Encuadre de la portada: arrastrar el punto para mover los dos recortes, o cada recorte por separado' }, img, marcoPc, marcoCel, punto);
  let W = 0, H = 0;
  const caja = (k) => { const a = ASPECTO[k]; return W / H > a ? { w: H * a, h: H } : { w: W, h: W / a }; };
  const marcoDe = { cel: marcoCel, pc: marcoPc };
  const pintar = () => {
    W = img.clientWidth; H = img.clientHeight;
    if (!W || !H) return;
    const centros = [];
    for (const k of ['cel', 'pc']) {
      const { w, h } = caja(k);
      const x = (p[k][0] / 100) * (W - w), y = (p[k][1] / 100) * (H - h);
      Object.assign(marcoDe[k].style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
      centros.push([x + w / 2, y + h / 2]);
    }
    Object.assign(punto.style, { left: `${(centros[0][0] + centros[1][0]) / 2}px`, top: `${(centros[0][1] + centros[1][1]) / 2}px` });
  };
  // Centrar un recorte en un punto de la foto (sin salirse)
  const centrarEn = (k, cx, cy) => {
    const { w, h } = caja(k);
    const x = Math.max(0, Math.min(W - w, cx - w / 2)), y = Math.max(0, Math.min(H - h, cy - h / 2));
    p[k] = [W - w > 1 ? (x / (W - w)) * 100 : 50, H - h > 1 ? (y / (H - h)) * 100 : 50];
  };
  const emitir = () => alCambiar({ pos: `${Math.round(p.cel[0])}% ${Math.round(p.cel[1])}%`, posPc: `${Math.round(p.pc[0])}% ${Math.round(p.pc[1])}%` });
  let modo = null, inicio = null;
  const local = (pt) => { const r = img.getBoundingClientRect(); return [pt.x - r.left, pt.y - r.top]; };
  arrastrable(lienzo, {
    alEmpezar: (pt) => {
      const sobre = pt.objetivo?.closest?.('.recorte');
      modo = pt.objetivo === punto || !sobre ? 'ambos' : sobre.classList.contains('cel') ? 'cel' : 'pc';
      const [x, y] = local(pt);
      inicio = { x, y, cel: [...p.cel], pc: [...p.pc] };
      lienzo.classList.add('moviendo');
      if (modo === 'ambos' && pt.objetivo !== punto) { centrarEn('cel', x, y); centrarEn('pc', x, y); pintar(); }
    },
    alMover: (pt) => {
      if (!modo) return;
      const [x, y] = local(pt);
      if (modo === 'ambos') { centrarEn('cel', x, y); centrarEn('pc', x, y); } else {
        const { w, h } = caja(modo);
        const dx = x - inicio.x, dy = y - inicio.y;
        const x0 = (inicio[modo][0] / 100) * (W - w), y0 = (inicio[modo][1] / 100) * (H - h);
        centrarEn(modo, x0 + w / 2 + dx, y0 + h / 2 + dy);
      }
      pintar();
    },
    alSoltar: () => { if (!modo) return; modo = null; lienzo.classList.remove('moviendo'); emitir(); },
  });
  img.addEventListener('load', pintar);
  new ResizeObserver(pintar).observe(lienzo);
  const centrar = el('button', { type: 'button', class: 'btn btn-sec btn-chico', html: `${icono('centrar', 15)}<span>Centrar</span>`, onclick: () => { p.cel = [50, 50]; p.pc = [50, 50]; pintar(); emitir(); } });
  return el('div', { class: 'encuadre-portada' },
    el('div', { class: 'encuadre-cabeza' }, el('strong', {}, 'Encuadre de la portada'), centrar),
    lienzo,
    el('p', { class: 'ayuda' }, esTactil ? 'Mantener apretado y arrastrar: el punto mueve los dos recortes; cada marco, solo el suyo.' : 'Arrastrar el punto para mover los dos recortes a la vez, o cada marco por separado.'));
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
  const boton = el('label', { class: `agregar ${clase}`, style: proporcion ? `aspect-ratio:${proporcionCSS(proporcion)}` : null }, input, el('span', { class: 'con-ico', html: `${icono('camara')}` }, String(texto).replace(/^＋\s*/, '')));
  input.addEventListener('change', async () => {
    boton.classList.add('subiendo'); boton.lastChild.lastChild.textContent = 'Subiendo…';
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
      caja.append(el('div', { class: `con-quitar${c.sinRecorte ? ' tal-cual' : ''}` }, vista,
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
  if (c.portada || c.pestanas) return fotosEnPestanas(c, lista, alCambiar);
  const prop = proporcionDe(c);
  const caja = el('div', { class: `fotos-grilla${c.porFila ? ` por-fila-${c.porFila}` : ''}`, 'data-forma': forma(prop) });
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

// Portada: una pestaña por foto (si el modelo trae varias). El encuadre aparece recién
// cuando hay una foto cargada, así la pantalla no se llena de recuadros vacíos.
function fotosEnPestanas(c, lista, alCambiar) {
  const max = c.max || 1;
  let activa = 0;
  const emitir = () => alCambiar(lista.filter(Boolean).map((f) => ({ ...f })));
  const caja = el('div', { class: 'pestanas-fotos' });
  const dibujar = () => {
    const f = lista[activa];
    const n = max > 1 ? ` ${activa + 1}` : '';
    const tabs = max > 1 ? el('div', { class: 'pestanas', role: 'tablist' }, Array.from({ length: max }, (_, i) => el('button', {
      type: 'button', role: 'tab', class: 'pestana', 'aria-selected': String(i === activa), title: lista[i] ? 'Con foto' : 'Sin foto',
      onclick: () => { activa = Math.min(i, lista.length); dibujar(); } }, `Foto ${i + 1}`))) : null;
    const subir = botonSubir({ texto: f ? `Cambiar foto${n}` : `Cargar foto${n}`, multiple: false, cuantas: 1, clase: 'cargar',
      alSubir: (urls) => { if (urls[0]) { const k = Math.min(activa, lista.length); lista[k] = { url: urls[0] }; activa = k; emitir(); } dibujar(); } });
    const quitar = f && !c.bloqueado ? el('button', { type: 'button', class: 'btn-link quitar-foto', onclick: () => {
      lista.splice(activa, 1); activa = Math.min(activa, Math.max(0, lista.length - 1)); emitir(); dibujar(); }, html: `${icono('quitar', 15)}<span>Quitar esta foto</span>` }) : null;
    caja.replaceChildren(...[tabs, el('div', { class: `pestana-cuerpo${max > 1 ? '' : ' sola'}` },
      el('div', { class: 'subir-portada' }, subir, quitar || el('span', { class: 'sin-archivo' }, 'Ninguna foto elegida')),
      f ? encuadrePortada({ url: f.url, pos: f.pos, posPc: f.posPc, alCambiar: ({ pos, posPc }) => { f.pos = pos; f.posPc = posPc; emitir(); } }) : null)].filter(Boolean));
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
      const estadoArchivo = el('span', { class: 'sin-archivo' }, '');
      input.addEventListener('change', async () => {
        const a = input.files[0]; if (!a) return;
        if (!/mpeg|mp3/.test(a.type) && !/\.mp3$/i.test(a.name)) { aviso('Solo archivos MP3', true); return; }
        if (a.size > (c.maxMB || 12) * 1048576) { aviso(`El MP3 supera ${c.maxMB || 12} MB`, true); return; }
        estadoArchivo.textContent = `Subiendo ${a.name}…`;
        try { const url = await subirArchivo(new File([a], a.name, { type: 'audio/mpeg' })); alCambiar(url); dibujar(url); } catch (e) { aviso(e.message, true); estadoArchivo.textContent = 'No se pudo subir'; }
      });
      caja.append(el('label', { class: `btn btn-cargar${c.bloqueado ? ' deshabilitado' : ''}` }, input, `♫ ${c.boton || 'Cargar música'}`), estadoArchivo);
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
const ESCALA_FUENTE = { Dantina: 0.55, 'Amsterdam Four': 0.55, 'Fleur De Leah': 0.85, Monoton: 0.8, Neonderthaw: 0.9, 'Mrs Saint Delafield': 0.85, 'Passions Conflict': 0.95 };
function campoFuente(c, valor, alCambiar, dis) {
  let elegida = valor || '';
  let tam = 34, todas = false;
  const caja = el('div', { class: 'fuentes' });
  const prueba = el('input', { type: 'text', class: 'prueba-texto', value: '', placeholder: 'Escribir un texto para probar', maxlength: 60 });
  const dibujar = () => {
    const visibles = todas ? c.valores : c.valores.slice(0, 20);
    const grilla = el('div', { class: 'grilla-fuentes', role: 'radiogroup' }, visibles.map((f) => el('button', {
      type: 'button', role: 'radio', 'aria-checked': String(f === elegida), class: 'fuente', disabled: dis,
      onclick: () => { elegida = f; alCambiar(f); dibujar(); } }, el('span', { class: 'abc', style: `font-family:'${f}';font-size:${Math.round(28 * (ESCALA_FUENTE[f] || 1))}px` }, 'Abc'), el('span', { class: 'nombre' }, f))));
    const mas = c.valores.length > 20 ? el('button', { type: 'button', class: 'btn-link', onclick: () => { todas = !todas; dibujar(); } }, todas ? 'Ver menos fuentes' : `Ver todas (${c.valores.length})`) : null;
    prueba.style.fontFamily = elegida ? `'${elegida}'` : '';
    const k = () => ESCALA_FUENTE[elegida] || 1;
    prueba.style.fontSize = `${tam * k()}px`;
    const muestra = elegida ? el('div', { class: 'prueba' }, el('small', {}, 'Fuente elegida'), el('strong', {}, elegida), prueba,
      el('div', { class: 'tamano' }, 'Tamaño', el('button', { type: 'button', class: 'btn-zoom', 'aria-label': 'Más chico', onclick: () => { tam = Math.max(16, tam - 4); prueba.style.fontSize = `${tam * k()}px`; } }, '−'),
        el('button', { type: 'button', class: 'btn-zoom', 'aria-label': 'Más grande', onclick: () => { tam = Math.min(72, tam + 4); prueba.style.fontSize = `${tam * k()}px`; } }, '+'))) : null;
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
  const radios = base === 'es' ? el('div', { class: 'opciones variantes compactas', role: 'radiogroup' }, c.variantes.map((o) => {
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

// Foto para compartir: el botón para subirla; se encuadra directo en la vista previa de abajo
function campoFotoCompartir(c, valor, alCambiar) {
  const caja = el('div', { class: 'foto-compartir' });
  caja.append(botonSubir({ texto: valor ? 'Cambiar foto' : 'Subir foto', multiple: false, cuantas: 1, clase: 'btn-cargar-foto',
    alSubir: (urls) => { if (urls[0]) { escribir(datos, `${c.id}Pos`, undefined); alCambiar(urls[0], { rearmar: true }); } } }));
  return caja;
}

// Cómo se ve el link al compartirlo (como en Facebook o WhatsApp). Con foto propia se
// encuadra arrastrándola ahí mismo; la ✕ la quita.
function vistaCompartir() {
  const nombres = [datos.nombres?.a, datos.nombres?.b].filter(Boolean).join(' & ');
  const t = (k) => String(S.textos?.[k] || '');
  const tituloLink = t('meta.titulo').replace('{evento}', t('evento.nombre')).replace('{nombres}', nombres || '…');
  const desc = datos.meta?.descripcion || t('meta.descripcion');
  const propia = datos.miniatura?.foto;
  const imagen = propia
    ? el('div', { class: 'con-quitar' }, marcoEncuadre({ url: propia, pos: datos.miniatura?.fotoPos, proporcion: '1.91:1', etiqueta: 'Foto al compartir', alSoltar: (p) => cambio('miniatura.fotoPos', p) }),
      el('button', { type: 'button', class: 'quitar', 'aria-label': 'Quitar foto', onclick: () => { escribir(datos, 'miniatura.fotoPos', undefined); cambio('miniatura.foto', '', { rearmar: true }); } }, '✕'))
    : el('img', { id: 'miniatura-previa', alt: '', src: fuenteMiniatura() });
  return el('div', { class: 'tarjeta-compartir' }, imagen,
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
  let t = null;
  const guardarLista = () => { clearTimeout(t); t = setTimeout(async () => {
    try { const r = await api('/invitados', { method: 'PUT', body: JSON.stringify({ invitados: lista }) }); lista = r.invitados; S.invitados = r.invitados; dibujar(); estado('Guardado ✓'); } catch { aviso('No se pudo guardar la lista', true); }
  }, 800); };
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
      el('td', { class: 'acciones-fila' },
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
    caja.replaceChildren(...lista.map((item, i) => el('div', { class: `item-lista${c.unaColumna ? ' una-columna' : ''}` },
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

// Texto en un idioma adicional: vacío usa el texto sugerido de ese idioma; si en el idioma
// principal el cliente escribió algo propio, se avisa que falta traducirlo
function campoTraduccion(c, valor, alCambiar, idHtml, dis) {
  const { idioma, de, base } = c.traduccion;
  const propio = String(leer(datos, de) || '').trim();
  const sugerido = base ? String(S.textosIdiomas?.[idioma]?.[base] || '').replace(/<br\s*\/?>/gi, '\n') : '';
  const area = c.tipo === 'area';
  const i = el(area ? 'textarea' : 'input', { id: idHtml, type: area ? null : 'text', maxlength: c.max, disabled: dis, rows: area ? 3 : null,
    placeholder: propio ? `Traducir: ${propio.replace(/\n/g, ' ')}` : sugerido.replace(/\n/g, ' ') });
  i.value = valor ?? '';
  const falta = el('small', { class: 'falta-traducir' }, 'Falta traducir: hasta entonces se ve el texto del idioma principal.');
  const pintar = () => { falta.hidden = !propio || !!i.value.trim(); };
  i.addEventListener('input', () => { alCambiar(i.value); pintar(); });
  pintar();
  return [conContador(i, c.max > 20 ? c.max : 0), falta];
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
  const dis = !!(c.cerrado || extra.desactivado);
  switch (c.tipo) {
    case 'texto': case 'url': {
      if (c.traduccion) return campoTraduccion(c, valor, alCambiar, idHtml, dis);
      // Títulos de sección: el campo vacío muestra "Cambiar título" con el título que va por defecto
      const phTitulo = c.titulo ? `Cambiar título${textoBase(c) ? ` · ${textoBase(c).replace(/\n/g, ' ')}` : ''}` : '';
      const i = el('input', { id: idHtml, type: c.tipo === 'url' ? 'url' : 'text', value: valor ?? '', maxlength: c.max, placeholder: phTitulo || placeholder(c) || (c.tipo === 'url' ? 'https://' : ''), disabled: dis, inputmode: c.patron ? 'numeric' : null,
        'aria-label': c.titulo ? 'Título de la sección' : null });
      if (c.titulo) {
        i.addEventListener('input', () => alCambiar(i.value.trim() === textoBase(c).trim() ? '' : i.value));
        return [conContador(i, c.max > 20 ? c.max : 0)];
      }
      const volver = conBase(c, i, valor, alCambiar);
      i.addEventListener('input', () => alCambiar(c.base && i.value === textoBase(c) ? '' : i.value));
      if (c.espejo) {
        espejos.push({ id: c.id, de: c.espejo, input: i });
        if (!i.value) i.value = leer(datos, c.espejo) || '';
      }
      return [conContador(i, c.tipo === 'texto' && c.max > 20 ? c.max : 0), volver];
    }
    case 'area': {
      if (c.traduccion) return campoTraduccion(c, valor, alCambiar, idHtml, dis);
      const i = el('textarea', { id: idHtml, maxlength: c.max, placeholder: placeholder(c), disabled: dis, rows: 3 });
      i.value = valor ?? '';
      const volver = conBase(c, i, valor, alCambiar);
      i.addEventListener('input', () => alCambiar(c.base && i.value === textoBase(c) ? '' : i.value));
      return [conContador(i, c.max), volver];
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
            falta ? el('small', { class: 'motivo' }, o.motivo, ' ', o.irA ? el('button', { type: 'button', class: 'btn-link', onclick: (e) => { e.preventDefault(); irA(o.irA); } }, 'Ir a la sección →') : null) : null));
        }));
      }
      const s = el('select', { id: idHtml, disabled: dis }, el('option', { value: '' }, 'Elegir…'), c.valores.map((o) => el('option', { value: o.v, selected: o.v === actual }, o.etiqueta)));
      s.addEventListener('change', () => alCambiar(s.value, c.rearmar ? { rearmar: true } : undefined));
      return s;
    }
    case 'zona': return campoZona(c, valor, alCambiar, idHtml, dis);
    case 'bandera': return campoBandera(c, valor, alCambiar);
    case 'tarjeta': return campoTarjeta(c, valor, alCambiar);
    case 'botonTextos': {
      const abierto = uiIdiomas.abiertos.has(c.idioma);
      return el('button', { type: 'button', class: 'btn btn-textos', 'aria-expanded': abierto ? 'true' : 'false',
        onclick: () => { abierto ? uiIdiomas.abiertos.delete(c.idioma) : uiIdiomas.abiertos.add(c.idioma); dibujarPaso(); } },
      `${abierto ? '▾' : '▸'} ${c.etiqueta}`);
    }
    case 'agregarIdioma':
      return el('button', { type: 'button', class: 'btn btn-borde', onclick: () => { uiIdiomas.extra = proximoIdioma(); dibujarPaso(); } }, `+ ${c.etiqueta}`);
    case 'idioma': return campoIdioma(c, valor, alCambiar, idHtml, dis);
    case 'paleta': return campoPaleta(c, valor, alCambiar, dis);
    case 'colores': return campoColores(c, valor, alCambiar, dis);
    case 'fuente': return campoFuente(c, valor, alCambiar, dis);
    case 'video': return campoVideo({ ...c, bloqueado: dis }, valor, alCambiar);
    case 'vistaCompartir': return vistaCompartir();
    case 'fotoCompartir': return campoFotoCompartir(c, valor, alCambiar);
    case 'foto': return campoFoto({ ...c, bloqueado: dis }, valor, alCambiar, extra);
    case 'fotos': return campoFotos(c, valor, alCambiar);
    case 'mp3': return campoMp3({ ...c, bloqueado: dis }, valor, alCambiar);
    case 'lista': return campoLista(c, valor, alCambiar);
    case 'slug': return campoSlug(c, valor, alCambiar);
    case 'invitados': return campoInvitados();
    case 'nota':
      if (c.estilo === 'linea') return el('hr', { class: 'separador' });
      if (c.estilo === 'etiqueta') return el('div', { class: 'etiqueta' }, c.texto);
      if (c.estilo === 'ayuda') return el('p', { class: 'ayuda' }, c.texto);
      return el('p', { class: c.estilo === 'subtitulo' ? 'subtitulo-nota' : 'nota' }, c.texto);
    default: return el('span', {}, '');
  }
}

// ── Idioma adicional: lo que se ve en el paso (solo en el panel, no se guarda) ──
// Primero el selector; con un idioma elegido, "Editar textos en …" despliega sus campos
// y "Agregar otro idioma" suma el siguiente selector (hasta 3 idiomas adicionales).
const uiIdiomas = { abiertos: new Set(), extra: 2 };
const idiomaElegido = (n) => { const l = leer(datos, `idiomas.l${n}`); return l && l !== String(datos.variante || 'es').slice(0, 2) ? l : null; };
const slotsVisibles = () => Math.max(2, uiIdiomas.extra, ...[2, 3, 4].filter(idiomaElegido));
function proximoIdioma() { return Math.min(4, slotsVisibles() + 1); }
function visibleUi(c) {
  if (c.uiIdioma) return c.uiIdioma <= slotsVisibles();
  if (c.uiTextos) return uiIdiomas.abiertos.has(c.uiTextos);
  if (c.tipo === 'agregarIdioma') { const n = slotsVisibles(); return n < 4 && !!idiomaElegido(n); }
  return true;
}

// Bandera de cada idioma en la invitación: el país que elige el cliente
function campoBandera(c, valor, alCambiar) {
  const actual = valor || c.defecto;
  // Muchos países (español): un desplegable con la bandera al lado
  if (c.valores.length > 6) {
    const img = el('img', { class: 'bandera-actual', src: `/comun/banderas/${actual}.svg`, alt: '', width: 32, height: 32 });
    const s = el('select', {}, c.valores.map((o) => el('option', { value: o.v, selected: o.v === actual }, o.etiqueta)));
    s.addEventListener('change', () => { img.src = `/comun/banderas/${s.value}.svg`; alCambiar(s.value); });
    return el('div', { class: 'bandera-select' }, img, s);
  }
  return el('div', { class: 'banderas', role: 'radiogroup' }, c.valores.map((o) => {
    const i = el('input', { type: 'radio', name: `b-${c.id}`, value: o.v, checked: o.v === actual });
    i.addEventListener('change', () => alCambiar(o.v));
    return el('label', { class: 'bandera', title: o.etiqueta }, i, el('img', { src: `/comun/banderas/${o.v}.svg`, alt: '', width: 26, height: 26, loading: 'lazy' }), el('span', {}, o.etiqueta));
  }));
}

// ── Tarjetas (Save The Date y agradecimiento) ─────────────────────────
// Se editan sobre la tarjeta (ver tarjeta.js). "Generar" arma el JPG, lo sube y queda fijo:
// desde ahí se descarga o se comparte, pero ya no se modifica.
const MENSAJE_GRACIAS = 'Gracias por acompañarnos en un día tan especial. Fue un placer compartirlo con ustedes.';
function varsTarjeta() {
  const lugar = datos.celebracion?.nombre || datos.ceremonia?.nombre || '';
  const iso = datos.celebracion?.fecha || (datos.celebracion?.inicio || '').slice(0, 10) || datos.ceremonia?.fecha || '';
  const [a, m, d] = iso ? iso.split('-') : [];
  const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const EVENTO = { boda: 'Nuestra boda', 15: 'Mis 15', bautismo: 'Mi bautismo', comunion: 'Mi comunión', cumple: 'Mi cumpleaños' };
  return { nombres: [datos.nombres?.a, datos.nombres?.b].filter(Boolean).join(' & '), a: datos.nombres?.a || '', b: datos.nombres?.b || '',
    fecha: iso ? `${d} · ${m} · ${a}` : '', fechaCorta: iso ? `${d} ${MESES[Number(m) - 1]} ${a}` : '', lugar, evento: EVENTO[S.evento.tipo] || '', mensaje: MENSAJE_GRACIAS };
}
function campoTarjeta(c, valor, alCambiar) {
  const def = S.modelo?.tarjetas;
  const diseno = c.clase === 'std' ? def?.std?.[leer(datos, 'std.tipo') || 'tarjeta'] : def?.agradecimiento;
  if (!diseno) return el('p', { class: 'nota' }, 'Este modelo todavía no tiene su tarjeta. Escribenos por WhatsApp y la preparamos.');
  const base = `/modelos/${S.evento.modelo}`;
  const nombreArchivo = c.clase === 'std' ? 'save-the-date.jpg' : 'gracias.jpg';
  // Ya generada: la imagen, descargar y compartir
  if (valor?.generada) {
    const compartir = async () => {
      try {
        const blob = await (await fetch(valor.generada)).blob();
        const archivo = new File([blob], nombreArchivo, { type: 'image/jpeg' });
        if (navigator.canShare?.({ files: [archivo] })) { await navigator.share({ files: [archivo] }); return; }
      } catch (e) { if (e.name === 'AbortError') return; }
      window.open(`https://wa.me/?text=${encodeURIComponent(location.origin + valor.generada)}`, '_blank', 'noopener');
    };
    return el('div', { class: 'tj-lista' },
      el('img', { src: valor.generada, alt: c.clase === 'std' ? 'Tarjeta Save The Date' : 'Tarjeta de agradecimiento' }),
      el('div', { class: 'tj-acciones' },
        el('a', { class: 'btn', href: valor.generada, download: nombreArchivo, html: `${icono('descargar', 16) || ''}<span>Descargar</span>` }),
        el('button', { type: 'button', class: 'btn btn-wa', onclick: compartir, html: `${ICONO_WA}<span>Compartir por WhatsApp</span>` })),
      el('p', { class: 'ayuda' }, 'La tarjeta ya está generada: se puede descargar y compartir todas las veces que haga falta, pero ya no se modifica.'));
  }
  let actual = valor || {};
  const editor = editorTarjeta({ def, diseno, base, valor: actual, vars: varsTarjeta(), alCambiar: (v) => { actual = v; alCambiar(v); },
    subirFoto: async (archivo) => subirArchivo(await achicarFoto(archivo, 1600)) });
  const generar = el('button', { type: 'button', class: 'btn btn-grande', onclick: async () => {
    if (diseno.foto && !actual.foto) { aviso('Falta subir la foto de la tarjeta.', true); return; }
    if (!confirm('Al generar la tarjeta ya no se puede modificar (ni los textos ni la foto). Después se descarga y se comparte todas las veces que quieras. ¿Generarla?')) return;
    generar.disabled = true; generar.lastChild.textContent = 'Generando…';
    try {
      clearTimeout(guardarTimer); await guardar();
      const blob = await dibujarTarjeta({ def, diseno, base, valor: actual, vars: varsTarjeta() });
      const url = await subirArchivo(new File([blob], nombreArchivo, { type: 'image/jpeg' }));
      await api('/tarjeta', { method: 'POST', body: JSON.stringify({ clase: c.clase, url }) });
      escribir(datos, c.id, { ...actual, generada: url });
      dibujarPaso(); aviso('¡Tarjeta lista!');
    } catch (e) {
      if (e.datos?.error === 'pagar') {
        aviso(c.clase === 'std' ? 'Para generarla, la tarjeta se suma al pago de la invitación (incluida en Premium y Deluxe).' : 'Para generarla, la tarjeta se suma al pago de la invitación.');
        if (S.plan) mostrarResumen(true);
      } else aviso(e.message, true);
    } finally { generar.disabled = false; generar.lastChild.textContent = 'Generar tarjeta'; }
  }, html: `${icono('std', 18)}<span>Generar tarjeta</span>` });
  return el('div', { class: 'tj-campo' }, editor, generar,
    el('p', { class: 'ayuda' }, 'Los textos salen de la invitación, pero acá se pueden cambiar sin tocar la invitación. Una vez generada, la tarjeta queda fija.'));
}

let contadorIds = 0;
function campo(c, valor, alCambiar, prefijo = '', posicion = {}) {
  if (c.oculto) return null;
  if (!visibleUi(c)) return null;
  const idHtml = `c-${prefijo}${c.id.replace(/\W/g, '-')}-${++contadorIds}`;
  // Funciones de un plan más alto: se pueden usar y suben el plan (el aviso lo indica)
  const insignia = c.paquete && c.paquete !== 'basic' && pasoActual?.nivel !== c.paquete ? insigniaNivel(c.paquete) : null;
  // Necesita algo de otra sección, o queda fijo por lo que se eligió en otra
  const desactivado = c.requiere && !cumple(c.requiere) && !leer(datos, c.id);
  const fijo = c.fijoSi && cumple(c.fijoSi);
  const motivo = desactivado || fijo ? el('p', { class: 'motivo' }, c.motivo, ' ',
    desactivado && c.irA ? el('button', { type: 'button', class: 'btn-link', onclick: () => irA(c.irA) }, 'Ir →') : null) : null;
  const aviso = c.cerrado ? el('p', { class: 'motivo' }, c.cerrado) : null;
  const extra = { ...posicion, desactivado, fijo };
  if (!posicion.pos && (c.tipo === 'foto' && c.encuadre)) { extra.pos = () => leer(datos, `${c.id}Pos`); extra.alPos = (p) => cambio(`${c.id}Pos`, p); }
  const sinEtiqueta = (c.tipo === 'switch' && !c.opciones) || ['nota', 'botonTextos', 'agregarIdioma'].includes(c.tipo) || c.titulo || c.sinEtiqueta;
  const etiqueta = sinEtiqueta ? null
    : ['texto', 'url', 'area', 'numero', 'fecha', 'fechaHora', 'hora', 'color', 'zona', 'idioma'].includes(c.tipo) || (c.tipo === 'opciones' && !c.multiple && !c.tarjetas && (c.iconos || c.valores.length > 4))
      ? el('label', { for: idHtml, class: c.requerido ? 'requerido' : '' }, c.etiqueta, insignia)
      : el('div', { class: `etiqueta${c.requerido ? ' requerido' : ''}` }, c.etiqueta, insignia);
  const clases = ['campo', c.ancho === 'mitad' ? (c.id.startsWith('nombres.') ? 'mitad nombre-par' : 'mitad') : '', c.tipo === 'nota' && c.estilo ? `nota-${c.estilo}` : '', c.cerrado || desactivado ? 'bloqueado' : ''].filter(Boolean).join(' ');
  const nodo = el('div', { class: clases, 'data-si': c.si ? JSON.stringify(c.si) : null },
    etiqueta, control(c, valor, alCambiar, idHtml, extra), sinEtiqueta && insignia, motivo, aviso, c.ayuda ? el('p', { class: 'ayuda' }, c.ayuda) : null);
  if (c.si) nodo.hidden = !visible(c);
  return nodo;
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

// ── Pasos ─────────────────────────────────────────────────────────────
const NOMBRE_NIVEL = { gratis: 'Gratis', basic: 'Basic', premium: 'Premium', deluxe: 'Deluxe', complemento: 'Complemento' };
const esGratis = () => S.plan?.plan === 'gratis';
const nivelDe = (n) => (n === 'basic' && esGratis() ? 'gratis' : n);
const insigniaNivel = (n) => (n && n !== 'complemento' ? el('span', { class: `insignia-nivel nivel-${nivelDe(n)}` }, NOMBRE_NIVEL[nivelDe(n)]) : null);

// Si un paso está prendido en la invitación (las obligatorias siempre)
function pasoActivo(p) {
  if (p.obligatoria) return true;
  if (p.interruptor) return !!leer(datos, p.interruptor) || !!(p.fijoSi && cumple(p.fijoSi));
  if (!p.seccion) return true;
  const v = leer(datos, `secciones.${p.seccion}`);
  return p.complemento ? v === true : v !== false;
}
function prenderPaso(p, on) {
  if (p.interruptor) { cambio(p.interruptor, on, { rearmar: true }); return; }
  // Instagram Wall y álbum compartido: uno u otro
  if (on && p.excluye) {
    const otro = S.esquema.pasos.find((x) => x.id === p.excluye);
    if (otro?.seccion && pasoActivo(otro)) { escribir(datos, `secciones.${otro.seccion}`, false); aviso(`Se apagó "${otro.titulo}": va uno u otro.`); }
  }
  cambio(`secciones.${p.seccion}`, on, { rearmar: true });
}
function interruptorPaso(p) {
  if (!p.seccion && !p.interruptor && !p.obligatoria) return el('span');
  const fijo = p.obligatoria || (p.fijoSi && cumple(p.fijoSi));
  const sinComplementos = p.complemento && esGratis();
  const chk = el('input', { type: 'checkbox', role: 'switch', 'aria-label': `${pasoActivo(p) ? 'Apagar' : 'Prender'} ${p.titulo}`, disabled: fijo || sinComplementos,
    title: p.obligatoria ? 'Sección obligatoria' : sinComplementos ? 'No disponible en el plan gratis' : '' });
  chk.checked = pasoActivo(p);
  chk.addEventListener('change', () => prenderPaso(p, chk.checked));
  return el('label', { class: `interruptor mini${fijo ? ' fijo' : ''}` }, chk);
}

function dibujarPasos() {
  const nav = $('#pasos');
  const conFaltas = new Set((S.faltan || []).map((f) => f.paso));
  const pasos = S.esquema.pasos;
  nav.replaceChildren(
    el('div', { class: 'pasos-cabeza' }, el('strong', {}, 'Pasos'), el('button', { type: 'button', class: 'btn-icono', 'aria-label': 'Cerrar', onclick: cerrarPasos }, '✕')),
    ...pasos.flatMap((p, i) => [p.separado ? el('hr', { class: 'pasos-division' }) : null, p.separado ? el('div', { class: 'pasos-subtitulo' }, 'Complementos') : null, el('div', { class: `paso-fila${pasoActivo(p) ? '' : ' apagado'}` },
      el('button', { type: 'button', class: 'paso', 'aria-current': p.id === pasoActual?.id ? 'step' : null, onclick: () => { cerrarPasos(); if (document.body.classList.contains('editor-plegado')) plegarEditor(false); irA(p.id); } },
        el('span', { class: 'num', title: `Paso ${i + 1}`, html: icono(p.id, 15) || String(i + 1) }), el('span', { class: 'nombre' }, p.titulo, insigniaNivel(p.nivel)),
        conFaltas.has(p.id) ? el('span', { class: 'falta', 'aria-label': 'Faltan datos' }) : null),
      interruptorPaso(p))]).filter(Boolean));
  const i = pasos.indexOf(pasoActual);
  const avance = `${((i + 1) / pasos.length) * 100}%`;
  $('#donde').replaceChildren(el('small', {}, `Paso ${i + 1} de ${pasos.length}`), el('strong', {}, pasoActual?.titulo || ''));
  $('#progreso-movil').style.setProperty('--avance', avance);
  $('#linea-pasos').replaceChildren(el('small', {}, `Paso ${i + 1} de ${pasos.length}`), el('span', { class: 'progreso', style: `--avance:${avance}` }));
  $('#btn-anterior').disabled = i <= 0;
  $('#btn-siguiente').lastElementChild.textContent = i >= pasos.length - 1 ? 'Publicar' : 'Siguiente';
}
function abrirPasos() { $('#pasos').classList.add('abierta'); document.body.classList.add('sin-scroll'); $('#pasos [aria-current="step"]')?.focus(); }
function cerrarPasos() { $('#pasos').classList.remove('abierta'); document.body.classList.remove('sin-scroll'); }
$('#btn-ver-pasos').addEventListener('click', abrirPasos);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarPasos(); });
$('#btn-anterior').addEventListener('click', () => { const i = S.esquema.pasos.indexOf(pasoActual); if (i > 0) irA(S.esquema.pasos[i - 1].id); });
$('#btn-siguiente').addEventListener('click', () => {
  const i = S.esquema.pasos.indexOf(pasoActual);
  if (i < S.esquema.pasos.length - 1) irA(S.esquema.pasos[i + 1].id); else publicar();
});

function irA(idPaso) {
  pasoActual = S.esquema.pasos.find((p) => p.id === idPaso) || S.esquema.pasos[0];
  history.replaceState(null, '', `#${pasoActual.id}`);
  dibujarPasos(); dibujarPaso();
  irEnPrevia();
  $('#formulario').focus({ preventScroll: true });
  $('#formulario').scrollTo?.({ top: 0 });
  window.scrollTo({ top: 0 });
  $('#pasos [aria-current="step"]')?.scrollIntoView({ block: 'nearest' });
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
  const activo = pasoActivo(p);
  const apagar = !p.obligatoria && (p.seccion || p.interruptor) ? interruptorPaso(p) : null;
  const plegar = el('button', { type: 'button', class: 'btn-redondo chico solo-escritorio', id: 'btn-plegar', 'aria-label': 'Achicar el panel', title: 'Achicar el panel (vista previa más grande)', onclick: () => plegarEditor(true) },
    el('span', { html: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }));
  const ayudaSeccion = p.ayudaSeccion ? el('p', { class: 'ayuda ayuda-seccion' }, p.ayudaSeccion) : null;
  const apagada = !activo ? el('div', { class: 'tarjeta nota apagada-aviso' }, p.complemento ? `${p.titulo} es un complemento: al prenderlo se suma al total.` : 'Esta sección está apagada: no se ve en la invitación.', ' ',
    el('button', { type: 'button', class: 'btn btn-chico', disabled: p.complemento && esGratis(), onclick: () => prenderPaso(p, true), html: `${icono('prender', 15)}<span>Prender</span>` })) : null;
  const motivo = p.fijoSi && cumple(p.fijoSi) ? el('p', { class: 'motivo' }, p.motivo) : null;
  const cuerpo = el('div', { class: `tarjeta${activo ? '' : ' atenuada'}` }, p.campos.map((c) => campo(c, leer(datos, c.id), (v, op) => cambio(c.id, v, op))));
  // Apagada: no se puede editar ni subir nada hasta prenderla
  if (!activo) { cuerpo.inert = true; cuerpo.setAttribute('aria-disabled', 'true'); }
  f.replaceChildren(...[
    el('div', { class: 'paso-titulo' }, el('div', { class: 'paso-acciones' }, apagar ? el('span', { class: 'mostrar' }, apagar, el('span', { class: 'lado' }, T('Mostrar en la invitación'))) : null, plegar),
      el('h1', {}, el('span', { class: 'ico-titulo', html: icono(p.id, 22) }), p.titulo, insigniaNivel(p.nivel))),
    ayudaSeccion, motivo, banderaGuardar(), apagada,
    el('div', { id: 'faltan-aca' }),
    cuerpo,
    el('div', { class: 'navegar solo-escritorio' },
      anterior ? el('button', { type: 'button', class: 'btn btn-sec', onclick: () => irA(anterior.id) }, el('small', {}, '← Anterior'), el('span', {}, anterior.titulo)) : el('span'),
      siguiente ? el('button', { type: 'button', class: 'btn siguiente', onclick: () => irA(siguiente.id) }, el('small', {}, 'Siguiente →'), el('span', {}, siguiente.titulo))
        : el('button', { type: 'button', class: 'btn siguiente', onclick: publicar }, el('small', {}, 'Listo'), el('span', {}, 'Publicar'))),
  ].filter(Boolean));
  pintarFaltan();
}

// Borrador sin cuenta: invitar a guardarlo con Google (o con el mail) para no perderlo
function banderaGuardar() {
  if (S.usuario || S.evento.paquete !== 'borrador' || pasoActual !== S.esquema.pasos[0]) return null;
  try { if (localStorage.getItem(`ai-guardar-${id}`) === 'no') return null; } catch { /* sin almacenamiento */ }
  const siguiente = `${location.pathname}?vincular=1${location.hash}`;
  const caja = el('div', { class: 'tarjeta guardar-cuenta' },
    el('p', {}, 'Lo que vas cargando se guarda solo en este navegador. Para seguir desde otro dispositivo, guardar la invitación en una cuenta:'),
    el('div', { class: 'botones' },
      el('a', { class: 'btn btn-google', href: `/auth/google?siguiente=${encodeURIComponent(siguiente)}`, html: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8h-4v3.1A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z"/></svg><span>Guardar con Google</span>' }),
      el('a', { class: 'btn btn-sec', href: `/entrar?siguiente=${encodeURIComponent(siguiente)}` }, 'Con mi mail'),
      el('button', { type: 'button', class: 'btn-link', onclick: () => { try { localStorage.setItem(`ai-guardar-${id}`, 'no'); } catch { /* nada */ } caja.remove(); } }, 'Ahora no')));
  return caja;
}

// ── Plan y precio ─────────────────────────────────────────────────────
function pintarPlan() {
  const pl = S.plan;
  if (!pl) { $('#caja-plan').hidden = true; $('#plan-mini').hidden = true; return; }
  const extra = pl.complementos.length ? ` + ${pl.complementos.length} complemento${pl.complementos.length > 1 ? 's' : ''}` : '';
  const cambiarPlan = pl.gratisPosible && !pl.pagado
    ? el('button', { type: 'button', class: 'btn-link chico', onclick: () => pasarAGratis(pl.plan !== 'gratis') }, pl.plan === 'gratis' ? 'Ver planes pagos' : 'Pasar a plan gratis') : null;
  $('#caja-plan').replaceChildren(...[el('button', { type: 'button', class: 'plan-resumen', onclick: () => mostrarResumen(false) },
    el('span', {}, 'Plan: ', el('strong', {}, pl.nombre), ` ${pl.plan === 'gratis' ? '' : pl.precio}`), extra ? el('small', {}, extra) : null), cambiarPlan].filter(Boolean));
  $('#plan-mini').replaceChildren(...[el('span', {}, 'Plan: ', el('strong', {}, pl.nombre), ` ${pl.plan === 'gratis' ? '' : pl.precio}`), extra ? el('small', {}, extra) : null].filter(Boolean));
  $('#plan-mini').onclick = () => mostrarResumen(false);
}
async function pasarAGratis(gratis) {
  if (gratis && !confirm('El plan gratis trae solo lo de Basic: se apagan las secciones Premium y Deluxe y los complementos. ¿Seguir?')) return;
  clearTimeout(guardarTimer); await guardar();
  try { await api('/gratis', { method: 'POST', body: JSON.stringify({ gratis }) }); await recargar(); aviso(gratis ? 'Listo: plan gratis' : 'Listo: se pueden sumar secciones'); } catch (e) { aviso(e.message, true); }
}
async function recargar() {
  S = await api(); datos = S.datos || {};
  aplicarDefectos(); pintarPlan(); pintarModelo(); irA(pasoActual?.id); refrescarPrevia();
}

// ── Modelo ────────────────────────────────────────────────────────────
function pintarModelo() {
  const actual = (S.modelos || []).find((m) => m.id === S.evento.modelo);
  const caja = $('#selector-modelo');
  if (!actual) { caja.hidden = true; $('#btn-modelo-movil').hidden = true; return; }
  caja.replaceChildren(el('button', { type: 'button', class: 'btn-modelo', onclick: elegirModelo }, el('strong', {}, actual.nombre), el('small', {}, 'cambiar ▾')));
}
function elegirModelo() {
  abrirModal('Cambiar de modelo', el('div', { class: 'modelos-grilla' }, (S.modelos || []).map((m) => el('div', { class: `modelo-opcion${m.id === S.evento.modelo ? ' actual' : ''}` },
    el('img', { src: `/modelos/${m.id}/miniatura.jpg`, alt: '' }), el('strong', {}, m.nombre), m.gratis ? el('small', {}, 'También en plan gratis') : null,
    m.id === S.evento.modelo ? el('span', { class: 'chip' }, 'En uso') : el('button', { type: 'button', class: 'btn btn-chico', onclick: async () => {
      try { clearTimeout(guardarTimer); await guardar(); await api('/modelo', { method: 'POST', body: JSON.stringify({ modelo: m.id }) }); cerrarModal(); await recargar(); aviso(`Ahora con ${m.nombre}`); } catch (e) { aviso(e.message, true); }
    } }, 'Usar este')))),
  el('p', { class: 'ayuda' }, 'Lo cargado se mantiene: cambia solo el diseño. Más modelos en ', el('a', { href: '/tienda/', target: '_blank' }, 'la tienda'), '.'));
}
$('#btn-modelo-movil').addEventListener('click', elegirModelo);

// ── Ventanas (manual, resumen y pago, modelos) ────────────────────────
function abrirModal(titulo, ...contenido) {
  const m = $('#modal');
  $('#modal-cuerpo').replaceChildren(el('div', { class: 'modal-cabeza' }, el('h2', { id: 'modal-titulo' }, titulo), el('button', { type: 'button', class: 'btn-icono', 'aria-label': 'Cerrar', onclick: cerrarModal }, '✕')), ...contenido.filter(Boolean));
  if (!m.open) m.showModal();
}
function cerrarModal() { $('#modal').close(); }
$('#modal').addEventListener('click', (e) => { if (e.target === $('#modal')) cerrarModal(); });

const whatsapp = () => {
  const numero = S.marca?.blanca ? String(S.marca.whatsapp || '').replace(/\D/g, '') : S.ayuda?.whatsapp;
  if (!numero) return null;
  const nombres = [datos.nombres?.a, datos.nombres?.b].filter(Boolean).join(' y ');
  return `https://wa.me/${numero}?text=${encodeURIComponent(`Hola! Necesito ayuda con mi invitación${nombres ? ` (${nombres})` : ''}. Código: ${id}`)}`;
};
const ICONO_WA = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3 1 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.4-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.3-.2Z"/></svg>';

// Manual de uso corto (el completo está en /ayuda/panel/)
const MANUAL = [
  ['Cómo funciona', 'A la izquierda (o en "Ver todos", en el celular) están los pasos. Cada uno tiene su interruptor: prendido, la sección se ve en la invitación. Lo que se carga se guarda solo y la vista previa se actualiza al instante.'],
  ['Plan y precio', 'El plan sale de las secciones prendidas: Basic, Premium o Deluxe (cada paso tiene su aviso). Las tarjetas (Save The Date y agradecimiento), Cambios de diseño e Idioma adicional son complementos: van al final del menú, en "Complementos". La Save The Date viene incluida en Premium y Deluxe. Una sección apagada no se puede editar hasta prenderla. No se paga nada hasta publicar.'],
  ['Fotos y encuadre', 'Después de subir una foto se elige qué parte se ve. En la portada, el punto mueve los recortes del celular y de la computadora a la vez; cada marco se puede mover solo. En el celular, mantener apretado un instante antes de arrastrar.'],
  ['Lugar y fecha', 'Con el link de Google Maps se arma solo el mapa y el botón "¿Cómo llegar?". En Google Maps: buscar el lugar, tocar Compartir y Copiar link.'],
  ['Confirmación e invitados', 'La confirmación se cierra sola en la fecha límite o al llegar al aforo. Con la lista de invitados, cada uno recibe su link personal con su nombre, pases y mesa.'],
  ['Idiomas', 'El idioma principal se elige en "Idioma y seguridad". Con un idioma adicional, cada invitado ve la invitación en el suyo y puede cambiarlo desde el botón flotante (con la bandera elegida para cada idioma). Los textos se ajustan con "Editar textos en…" y se pueden sumar hasta tres idiomas.'],
  ['Publicar', 'Al tocar Publicar se ve el resumen con lo elegido y el total. Después del pago, la invitación queda online en su link y se puede seguir editando.'],
];
function mostrarManual() {
  const wa = whatsapp();
  abrirModal('Ayuda',
    el('div', { class: 'manual' }, MANUAL.map(([t, x], i) => el('details', { open: i === 0 }, el('summary', {}, t), el('p', {}, x)))),
    el('p', {}, el('a', { href: '/ayuda/panel/', target: '_blank', rel: 'noopener' }, 'Ver el manual completo →')),
    el('div', { class: 'botones-ayuda' },
      wa ? el('a', { class: 'btn btn-wa', href: wa, target: '_blank', rel: 'noopener', html: `${ICONO_WA}<span>Solicitar asistencia personalizada</span>` }) : null,
      el('a', { class: 'btn btn-sec', href: 'https://amoinvitar.com/contacto.html', target: '_blank', rel: 'noopener' }, '✉ Escribir por mail')));
}
$('#btn-manual').addEventListener('click', mostrarManual);
function botonAyuda() {
  const wa = whatsapp(); const b = $('#btn-ayuda');
  if (!wa) return;
  b.href = wa; b.hidden = false; b.innerHTML = `<span class="texto">Necesito ayuda</span>${ICONO_WA}`;
  b.title = 'Necesito ayuda (WhatsApp)';
}

// Resumen: secciones elegidas, plan y complementos. Al publicar, también el pago.
async function mostrarResumen(paraPagar, plan = S.plan) {
  if (!plan) return;
  const lineas = [
    el('li', {}, el('span', {}, 'Plan ', el('strong', {}, plan.nombre)), el('span', {}, plan.plan === 'gratis' ? 'Gratis' : plan.precio)),
    ...plan.complementos.map((x) => el('li', {}, el('span', {}, x.nombre, x.pagado ? ' (ya pagado)' : ''), el('span', {}, x.precio))),
  ];
  const secciones = el('ul', { class: 'lista-secciones' }, plan.secciones.map((x) => el('li', {}, x.titulo, insigniaNivel(x.nivel))));
  const partes = [
    el('p', { class: 'ayuda' }, 'Secciones elegidas (además de portada, lugar y fecha, confirmación y cierre):'), secciones,
    el('ul', { class: 'lista-precios' }, lineas),
    plan.pagado ? el('p', { class: 'ayuda' }, `Ya pagado: plan ${NOMBRE_NIVEL[plan.pagado]}. Se paga solo la diferencia.`) : null,
    el('p', { class: 'total' }, el('span', {}, paraPagar ? 'Total a pagar' : 'Total'), el('strong', {}, plan.aPagar.eur ? plan.aPagar.texto : 'Gratis')),
  ];
  if (!paraPagar) { abrirModal('Tu invitación', ...partes, el('p', { class: 'ayuda' }, 'Se paga recién al publicar. Las secciones se prenden y apagan desde los pasos.')); return; }
  // Pago: mail (si no entró con su cuenta), cupón y medio de pago
  const mail = S.usuario ? null : el('input', { type: 'email', required: true, placeholder: 'tu@mail.com', autocomplete: 'email' });
  const cupon = el('input', { type: 'text', placeholder: 'Cupón (opcional)', maxlength: 30 });
  const medios = el('div', { class: 'opciones medios' });
  const total = partes.at(-1);
  const boton = el('button', { type: 'button', class: 'btn btn-grande', html: `${icono('enviar')}<span>${plan.aPagar.eur ? 'Pagar y publicar' : 'Publicar'}</span>` });
  const error = el('p', { class: 'motivo' });
  const cotizar = async () => {
    try {
      const r = await fetch('/api/tienda/cotizar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ borrador: { evento: id, clave }, cupon: cupon.value }) }).then((x) => x.json());
      error.textContent = r.errorCupon || r.error || '';
      medios.replaceChildren(...(r.medios || []).map((m, i) => el('label', { class: 'opcion' }, el('input', { type: 'radio', name: 'medio', value: m.id, checked: i === 0 }),
        el('span', {}, ({ stripe: 'Tarjeta', mercadopago: 'Mercado Pago', paypal: 'PayPal', transfer: 'Transferencia' })[m.id] || m.id, el('small', {}, m.antes ? `${m.texto} (antes ${m.antes})` : m.texto)))));
      if (r.medios?.length) total.lastChild.textContent = r.medios[0].texto;
      else if (r.gratis) total.lastChild.textContent = 'Gratis';
    } catch { error.textContent = 'No se pudo calcular el total. Revisar la conexión.'; }
  };
  cupon.addEventListener('change', cotizar);
  boton.addEventListener('click', async () => {
    if (mail && !mail.reportValidity()) return;
    boton.disabled = true; boton.textContent = 'Un momento…';
    try {
      const r = await fetch('/api/tienda/comprar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
        borrador: { evento: id, clave }, email: mail?.value || '', cupon: cupon.value, medio: medios.querySelector('input:checked')?.value }) }).then(async (x) => ({ ok: x.ok, ...(await x.json()) }));
      if (!r.ok || !r.url) throw new Error(r.error || 'No se pudo seguir con el pago');
      location.href = r.url;
    } catch (e) { error.textContent = e.message; boton.disabled = false; boton.textContent = plan.aPagar.eur ? 'Pagar y publicar' : 'Publicar'; }
  });
  abrirModal('Publicar la invitación', ...partes,
    mail ? el('label', { class: 'campo-modal' }, 'Mail para recibir el acceso y la factura', mail) : null,
    plan.aPagar.eur ? el('div', { class: 'campo-modal' }, 'Medio de pago', medios) : null,
    plan.aPagar.eur ? cupon : null, error, boton,
    el('p', { class: 'ayuda' }, 'Después del pago la invitación queda publicada en su link y se puede seguir editando.'));
  if (plan.aPagar.eur) cotizar();
}

// ── Publicar ──────────────────────────────────────────────────────────
async function publicar() {
  clearTimeout(guardarTimer); await guardar();
  try {
    const r = await api('/publicar', { method: 'POST' });
    S.evento.estado = r.estado;
    if (r.link) { aviso('¡Publicada! Link copiado.'); navigator.clipboard?.writeText(r.link).catch(() => {}); window.open(r.link, '_blank', 'noopener'); }
    else aviso('¡Listo! El equipo de diseño ya tiene todo para empezar.');
  } catch (e) {
    if (e.datos?.error === 'pagar') { S.plan = e.datos.plan; pintarPlan(); mostrarResumen(true, e.datos.plan); return; }
    if (e.datos?.faltan) { S.faltan = e.datos.faltan; dibujarPasos(); irA(e.datos.faltan[0].paso); aviso('Faltan algunos datos para publicar.', true); }
    else aviso(e.message, true);
  }
}
$('#btn-publicar').addEventListener('click', publicar);
$('#btn-publicar-2').addEventListener('click', () => { verPrevia(false); publicar(); });

// ── Pantallas: vista dividida en el celular, vista sola, panel plegado ──
function verPrevia(on) {
  document.body.classList.toggle('ver-previa', on);
  if (on && marcos().every((x) => x.src === 'about:blank')) cargarPrevia();
  requestAnimationFrame(escalarPrevia);
}
$('#btn-ojo').addEventListener('click', () => verPrevia(true));
$('#btn-editar').addEventListener('click', () => verPrevia(false));
function plegarEditor(on) {
  document.body.classList.toggle('editor-plegado', on);
  requestAnimationFrame(escalarPrevia);
}
$('#btn-desplegar').addEventListener('click', () => plegarEditor(false));
$('#btn-completa').addEventListener('click', () => {
  const on = document.body.classList.toggle('pantalla-completa');
  $('#btn-completa').setAttribute('aria-pressed', String(on));
  requestAnimationFrame(escalarPrevia);
});
$('#btn-volver').addEventListener('click', () => {
  if (document.body.classList.contains('ver-previa')) { verPrevia(false); return; }
  if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) history.back();
  else location.href = '/tienda/';
});
// La división entre la invitación (arriba) y el panel (abajo) se mueve arrastrando la manija
(function division() {
  const raiz = document.documentElement;
  const poner = (px) => { const max = innerHeight * 0.8; raiz.style.setProperty('--alto-previa', `${Math.max(0, Math.min(max, px))}px`); requestAnimationFrame(escalarPrevia); };
  let inicio = null;
  const agarre = $('#hoja-cabeza');
  agarre.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    inicio = { y: e.clientY, alto: $('#previa').getBoundingClientRect().height };
    agarre.setPointerCapture(e.pointerId);
  });
  agarre.addEventListener('pointermove', (e) => { if (inicio) poner(inicio.alto + (e.clientY - inicio.y)); });
  const soltar = () => { inicio = null; };
  agarre.addEventListener('pointerup', soltar); agarre.addEventListener('pointercancel', soltar);
  $('#agarre').addEventListener('keydown', (e) => { const d = { ArrowUp: -40, ArrowDown: 40 }[e.key]; if (d) { e.preventDefault(); poner($('#previa').getBoundingClientRect().height + d); } });
  $('#btn-hoja').addEventListener('click', () => {
    const alto = $('#previa').getBoundingClientRect().height;
    const arriba = alto > 40;
    poner(arriba ? 0 : innerHeight * 0.42);
    $('#btn-hoja').classList.toggle('abajo', arriba);
    $('#btn-hoja').setAttribute('aria-label', arriba ? 'Mostrar la vista previa' : 'Agrandar el panel');
  });
})();

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

// Opciones que ya vienen elegidas (p. ej. "hay ceremonia"): cuentan desde el principio
function aplicarDefectos() {
  for (const p of ['ceremonia', 'celebracion']) {
    const l = datos[p];
    if (l?.inicio && !l.fecha) { l.fecha = l.inicio.slice(0, 10); if (l.inicio.length > 10) l.hora = l.inicio.slice(11, 16); }
  }
  for (const p of S.esquema.pasos) for (const c of p.campos) {
    if (['opciones', 'contador'].includes(c.tipo) && c.defecto !== undefined && leer(datos, c.id) === undefined && !c.multiple) escribir(datos, c.id, c.defecto);
  }
}

// Borradores de este navegador (la tienda los muestra para seguir editando)
function recordarBorrador() {
  try {
    const lista = JSON.parse(localStorage.getItem('ai-borradores') || '[]').filter((x) => x.id !== id);
    lista.unshift({ id, clave, nombres: [datos.nombres?.a, datos.nombres?.b].filter(Boolean).join(' & '), modelo: S.evento.modelo, tipo: S.evento.tipo, t: Date.now() });
    localStorage.setItem('ai-borradores', JSON.stringify(lista.slice(0, 10)));
  } catch { /* sin almacenamiento */ }
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
  // Volvió de entrar con Google o con el mail: la invitación queda guardada en su cuenta
  if (params.has('vincular')) {
    history.replaceState(null, '', location.pathname + location.hash);
    try { const r = await api('/vincular', { method: 'POST' }); S.usuario = { email: r.email }; aviso(`Guardada en la cuenta ${r.email}`); } catch { aviso('No se pudo guardar en la cuenta. Probar de nuevo.', true); }
  }
  aplicarDefectos();
  if (S.modelo?.miniatura?.colorTitulos) document.documentElement.style.setProperty('--icono-fondo', S.modelo.miniatura.colorTitulos);
  aplicarMarca(S.marca);
  botonAyuda();
  pintarPlan();
  pintarModelo();
  if (clave) recordarBorrador();
  const medirBarra = () => document.documentElement.style.setProperty('--alto-barra', `${$('.barra').offsetHeight}px`);
  medirBarra(); addEventListener('resize', medirBarra);
  const nombres = [datos.nombres?.a, datos.nombres?.b].filter(Boolean).join(' & ');
  $('#titulo-evento').textContent = nombres || 'Mi invitación';
  if (!S.evento.modelo) { $('#btn-ojo').hidden = true; $('#previa').remove(); document.body.classList.add('sin-previa'); }
  if (!['invitacion', 'std-web', 'compromiso-web', 'std-web-medida'].includes(S.evento.producto)) $('#btn-publicar').textContent = 'Enviar al diseño';
  estado(S.evento.estado === 'publicado' ? 'Publicada' : 'Guardado ✓');
  irA(location.hash.slice(1));
  refrescarPrevia();
})();
