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

function refrescarPrevia() {
  clearTimeout(previaTimer);
  previaTimer = setTimeout(() => {
    const f = $('#iframe-vista');
    if (!S.evento.modelo) return;
    const visible = getComputedStyle($('#previa')).display !== 'none';
    if (visible) f.src = `/vista/${id}?k=${encodeURIComponent(clave)}&t=${Date.now()}#${pasoActual?.seccionAncla || ''}`;
    else f.dataset.pendiente = '1';
  }, 300);
}

// ── Miniatura para compartir ──────────────────────────────────────────
let firmaMiniatura = null;
async function quizasMiniatura() {
  if (!S.esquema.pasos.some((p) => p.campos.some((c) => c.id === 'miniatura.generada'))) return;
  const portada = (datos.fotos?.portada || [])[0];
  const foto = datos.miniatura?.foto || portada?.url || datos.fotos?.rsvp || (datos.fotos?.galeria || [])[0]?.url || '';
  const pos = datos.miniatura?.foto ? '50% 50%' : portada?.pos;
  const conTexto = !!datos.miniatura?.conTexto;
  const nombres = [datos.nombres?.a, datos.nombres?.b].filter(Boolean).join(' & ');
  const fecha = (datos.celebracion?.inicio || datos.std?.fecha || '').slice(0, 10).split('-').reverse().join(' • ');
  const firma = JSON.stringify([foto, pos, conTexto, nombres, fecha]);
  if (firma === firmaMiniatura || !nombres) return;
  firmaMiniatura = firma;
  // Foto sola sin nombres: alcanza con la foto, no hace falta armar nada
  if (foto && !conTexto) { escribir(datos, 'miniatura.generada', ''); return; }
  try {
    const blob = await armarMiniatura({ foto, pos, nombres, fecha, conTexto, estilo: S.modelo?.miniatura });
    const url = await subirArchivo(new File([blob], 'miniatura.jpg', { type: 'image/jpeg' }));
    escribir(datos, 'miniatura.generada', url);
    const img = $('#miniatura-previa'); if (img) img.src = url;
  } catch (e) { console.warn('miniatura', e); }
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

function campoFotos(c, valor, alCambiar, { una = false } = {}) {
  let lista = una ? (valor ? [{ url: valor }] : []) : [].concat(valor || []).map((f) => (typeof f === 'string' ? { url: f } : f));
  const caja = el('div', { class: una ? 'fotos foto-sola' : 'fotos' });
  const emitir = () => alCambiar(una ? (lista[0]?.url || '') : lista);
  const dibujar = () => {
    caja.replaceChildren();
    lista.forEach((f, i) => {
      const img = el('img', { src: f.url, alt: '', loading: 'lazy', title: c.foco ? 'Tocar para elegir el centro de la foto' : '' });
      const marco = el('div', { class: 'foto' }, img,
        el('button', { type: 'button', class: 'quitar', 'aria-label': 'Quitar foto', onclick: () => { lista.splice(i, 1); dibujar(); emitir(); } }, '✕'),
        !una && i > 0 ? el('button', { type: 'button', class: 'mover', 'aria-label': 'Mover antes', onclick: () => { [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]; dibujar(); emitir(); } }, '◀') : null);
      if (c.foco) {
        const [x, y] = (f.pos || '50% 50%').split(' ');
        marco.append(el('span', { class: 'punto', style: `left:${x};top:${y}` }));
        img.addEventListener('click', (e) => {
          const r = img.getBoundingClientRect();
          f.pos = `${Math.round(((e.clientX - r.left) / r.width) * 100)}% ${Math.round(((e.clientY - r.top) / r.height) * 100)}%`;
          dibujar(); emitir();
        });
      }
      caja.append(marco);
    });
    if (lista.length < (una ? 1 : c.max || 12) && !c.bloqueado) {
      const input = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: !una });
      const boton = el('label', { class: 'agregar' }, input, una ? '＋ Subir foto' : `＋ Agregar (${lista.length}/${c.max})`);
      input.addEventListener('change', async () => {
        const archivos = [...input.files].slice(0, (una ? 1 : c.max) - lista.length);
        boton.classList.add('subiendo'); boton.lastChild.textContent = 'Subiendo…';
        for (const a of archivos) {
          try { lista.push({ url: await subirArchivo(await achicarFoto(a)) }); } catch (e) { aviso(e.message || 'No se pudo subir la foto', true); }
        }
        dibujar(); emitir();
      });
      caja.append(boton);
    }
  };
  dibujar();
  return caja;
}

function campoMp3(c, valor, alCambiar) {
  const caja = el('div');
  const dibujar = (v) => {
    caja.replaceChildren();
    if (v) caja.append(el('audio', { controls: true, preload: 'none', src: v, style: 'width:100%' }),
      el('button', { type: 'button', class: 'btn btn-sec btn-chico', onclick: () => { alCambiar(''); dibujar(''); } }, 'Quitar canción'));
    else {
      const input = el('input', { type: 'file', accept: 'audio/mpeg,.mp3', disabled: c.bloqueado });
      input.addEventListener('change', async () => {
        const a = input.files[0]; if (!a) return;
        if (!/mpeg|mp3/.test(a.type) && !/\.mp3$/i.test(a.name)) { aviso('Solo archivos MP3', true); return; }
        if (a.size > (c.maxMB || 12) * 1048576) { aviso(`El MP3 supera ${c.maxMB || 12} MB`, true); return; }
        estado('Subiendo canción…');
        try { const url = await subirArchivo(new File([a], a.name, { type: 'audio/mpeg' })); alCambiar(url); dibujar(url); } catch (e) { aviso(e.message, true); }
      });
      caja.append(input);
    }
  };
  dibujar(valor);
  return caja;
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
      el('div', { class: 'sub' }, c.campos.map((sc) => campo(sc, item[sc.id] ?? sc.defecto, (v) => { item[sc.id] = v; emitir(); }, `${c.id}-${i}`))))));
    if (lista.length < (c.max || 10)) caja.append(el('button', { type: 'button', class: 'btn btn-sec btn-chico', onclick: () => { lista.push({}); dibujar(); emitir(); } }, '＋ Agregar'));
  };
  dibujar();
  return caja;
}

function control(c, valor, alCambiar, idHtml) {
  const dis = !!c.bloqueado;
  switch (c.tipo) {
    case 'texto': case 'url': {
      const i = el('input', { id: idHtml, type: c.tipo === 'url' ? 'url' : 'text', value: valor ?? '', maxlength: c.max, placeholder: placeholder(c) || (c.tipo === 'url' ? 'https://' : ''), disabled: dis, inputmode: c.patron ? 'numeric' : null });
      i.addEventListener('input', () => alCambiar(i.value));
      if (c.espejo) {
        espejos.push({ id: c.id, de: c.espejo, input: i });
        if (!i.value) i.value = leer(datos, c.espejo) || '';
      }
      return [i, contador(i, c.tipo === 'texto' && c.max > 20 ? c.max : 0)];
    }
    case 'area': {
      const i = el('textarea', { id: idHtml, maxlength: c.max, placeholder: placeholder(c), disabled: dis });
      i.value = valor ?? '';
      i.addEventListener('input', () => alCambiar(i.value));
      return [i, contador(i, c.max)];
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
    case 'switch': {
      const i = el('input', { id: idHtml, type: 'checkbox', role: 'switch', disabled: dis });
      i.checked = !!(valor ?? c.defecto);
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
      if (c.valores.length <= 4) {
        const nombre = `r-${idHtml}`;
        return el('div', { class: 'opciones', role: 'radiogroup' }, c.valores.map((o) => {
          const i = el('input', { type: 'radio', name: nombre, value: o.v, checked: o.v === actual, disabled: dis });
          i.addEventListener('change', () => alCambiar(o.v, { rearmar: true }));
          return el('label', { class: 'opcion' }, i, el('span', {}, o.etiqueta, o.ayuda ? el('small', {}, o.ayuda) : null));
        }));
      }
      const s = el('select', { id: idHtml, disabled: dis }, el('option', { value: '' }, 'Elegir…'), c.valores.map((o) => el('option', { value: o.v, selected: o.v === actual }, o.etiqueta)));
      s.addEventListener('change', () => alCambiar(s.value));
      return s;
    }
    case 'foto': return campoFotos(c, valor, alCambiar, { una: true });
    case 'fotos': return campoFotos(c, valor, alCambiar);
    case 'mp3': return campoMp3(c, valor, alCambiar);
    case 'lista': return campoLista(c, valor, alCambiar);
    case 'slug': return campoSlug(c, valor, alCambiar);
    case 'invitados': return campoInvitados();
    case 'nota': return el('p', { class: 'nota' }, c.texto);
    default: return el('span', {}, '');
  }
}

// Íconos del itinerario: se ven grandes y con nombre, en una grilla
function selectorIconos(c, actual, alCambiar, idHtml) {
  let elegido = actual || '';
  const src = (v) => c.iconos.replace('{v}', v);
  const nombre = (v) => c.valores.find((o) => o.v === v)?.etiqueta || '';
  const grilla = el('div', { class: 'grilla-iconos', role: 'listbox', 'aria-label': 'Íconos', hidden: true });
  const muestra = el('span', { class: 'icono-tile' });
  const texto = el('span', {});
  const boton = el('button', { type: 'button', class: 'icono-actual', id: idHtml, 'aria-expanded': 'false', disabled: !!c.bloqueado,
    onclick: () => { grilla.hidden = !grilla.hidden; boton.setAttribute('aria-expanded', String(!grilla.hidden)); } }, muestra, texto, el('span', { class: 'cambiar' }, 'Cambiar'));
  const pintar = () => {
    muestra.replaceChildren(elegido ? el('img', { src: src(elegido), alt: '' }) : el('span', { class: 'sin-icono' }, '?'));
    texto.textContent = elegido ? nombre(elegido) : 'Elegir ícono';
    grilla.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.v === elegido)));
  };
  grilla.append(...c.valores.map((o) => el('button', { type: 'button', role: 'option', 'data-v': o.v, title: o.etiqueta,
    onclick: () => { elegido = o.v; grilla.hidden = true; boton.setAttribute('aria-expanded', 'false'); pintar(); alCambiar(o.v); } },
  el('span', { class: 'icono-tile' }, el('img', { src: src(o.v), alt: '', loading: 'lazy' })), el('small', {}, o.etiqueta))));
  pintar();
  return el('div', { class: 'selector-iconos' }, boton, grilla);
}

let contadorIds = 0;
function campo(c, valor, alCambiar, prefijo = '') {
  if (c.oculto) return null;
  const idHtml = `c-${prefijo}${c.id.replace(/\W/g, '-')}-${++contadorIds}`;
  const insignia = c.bloqueado ? el('a', { class: 'insignia', href: linkMejorar(c.bloqueado) }, mejorarA(c.bloqueado)) : null;
  const sinEtiqueta = (c.tipo === 'switch' && !c.opciones) || c.tipo === 'nota';
  const etiqueta = sinEtiqueta ? null
    : ['texto', 'url', 'area', 'numero', 'fecha', 'fechaHora', 'hora', 'color'].includes(c.tipo) || (c.tipo === 'opciones' && !c.multiple && (c.iconos || c.valores.length > 4))
      ? el('label', { for: idHtml, class: c.requerido ? 'requerido' : '' }, c.etiqueta, insignia)
      : el('div', { class: `etiqueta${c.requerido ? ' requerido' : ''}` }, c.etiqueta, insignia);
  const nodo = el('div', { class: `campo${c.bloqueado ? ' bloqueado' : ''}`, 'data-si': c.si ? JSON.stringify(c.si) : null },
    etiqueta, control(c, valor, alCambiar, idHtml), sinEtiqueta && insignia, c.ayuda ? el('p', { class: 'ayuda' }, c.ayuda) : null);
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

  const cuerpo = p.bloqueado
    ? el('div', { class: 'tarjeta mejorar' }, el('div', { class: 'icono' }, '🔒'),
      el('h2', {}, `${p.titulo} viene en ${p.bloqueado[0].toUpperCase()}${p.bloqueado.slice(1)}`),
      el('p', {}, 'Se puede sumar ahora y lo cargado hasta acá queda guardado.'),
      el('a', { class: 'btn btn-premium', href: linkMejorar(p.bloqueado) }, mejorarA(p.bloqueado)))
    : el('div', { class: 'tarjeta' }, p.campos.map((c) => campo(c, leer(datos, c.id), (v, op) => cambio(c.id, v, op))),
      p.id === 'publicar' ? el('img', { class: 'miniatura-previa', id: 'miniatura-previa', alt: 'Así se ve al compartir', src: datos.miniatura?.generada || datos.miniatura?.foto || datos.fotos?.portada?.[0]?.url || '' }) : null);

  f.replaceChildren(...[
    el('div', { class: 'paso-titulo' }, el('h1', {}, p.titulo), toggleSeccion),
    el('div', { id: 'faltan-aca' }),
    cuerpo,
    el('div', { class: 'navegar' },
      anterior ? el('button', { type: 'button', class: 'btn btn-sec', onclick: () => irA(anterior.id) }, el('small', {}, '← Anterior'), el('span', {}, anterior.titulo)) : el('span'),
      siguiente ? el('button', { type: 'button', class: 'btn siguiente', onclick: () => irA(siguiente.id) }, el('small', {}, 'Siguiente →'), el('span', {}, siguiente.titulo)) : el('span')),
  ].filter(Boolean));
  pintarFaltan();
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
  if (f.dataset.pendiente || f.src === 'about:blank') { delete f.dataset.pendiente; f.src = `/vista/${id}?k=${encodeURIComponent(clave)}&t=${Date.now()}`; }
});
$('#btn-cerrar-vista').addEventListener('click', () => $('#previa').classList.remove('abierta'));

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

// ── Inicio ────────────────────────────────────────────────────────────
(async () => {
  try { S = await api(); } catch (e) {
    if (e.status === 403 && !clave) { location.href = `/entrar?siguiente=${encodeURIComponent(location.pathname)}`; return; }
    $('#formulario').replaceChildren(el('div', { class: 'tarjeta mejorar' }, el('h2', {}, 'No se pudo abrir el panel'), el('p', {}, e.status === 403 ? 'El link no es válido o venció. Entrar con el mail de la compra en amoinvitar.com/entrar.' : 'Revisar la conexión y volver a intentar.')));
    $('#titulo-evento').textContent = '';
    return;
  }
  datos = S.datos || {};
  if (S.modelo?.miniatura?.colorTitulos) document.documentElement.style.setProperty('--icono-fondo', S.modelo.miniatura.colorTitulos);
  aplicarMarca(S.marca);
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
