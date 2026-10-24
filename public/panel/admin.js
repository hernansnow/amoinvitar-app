// Administración de la invitación: resumen, envío, respuestas, mensajes, canciones, mesas y álbum.
// Antes de publicar se ve como una vista previa (explica qué va a aparecer); una vez publicada,
// el panel abre acá primero. Los textos de los mensajes de WhatsApp y los asientos por mesa se
// guardan en el evento (datos.admin) con POST /admin.

let ctx = null;           // { S, datos, api, el, aviso, guardarInvitados }
let respuestas = null;    // las del servidor (más nuevas primero)
let seccion = 'resumen';
let reloj = null;

const SECCIONES = [
  ['resumen', 'Resumen'], ['enviar', 'Enviar'], ['respuestas', 'Respuestas'], ['mensajes', 'Mensajes'],
  ['canciones', 'Canciones'], ['mesas', 'Mesas'], ['llegadas', 'Llegadas'], ['album', 'Álbum de fotos'],
];

// ── Datos de la invitación ──
const link = () => `${location.origin}/${ctx.S.evento.tipo}/${ctx.datos.slug || ctx.S.evento.slug || ''}`;
const linkDe = (i) => `${link()}?inv=${encodeURIComponent(i.codigo)}`;
const publicada = () => ctx.S.evento.estado === 'publicado';
// "Ver la invitación" del dueño: entra aunque sea de lista cerrada o con PIN
const claveUrl = () => ctx.clave || new URLSearchParams(location.search).get('k') || '';
const linkDueno = (i = null) => {
  const q = new URLSearchParams(); if (claveUrl()) q.set('k', claveUrl()); if (i?.codigo) q.set('inv', i.codigo);
  return `${location.origin}/acceso/${ctx.S.evento.id}/dueno${q.toString() ? `?${q}` : ''}`;
};
const editarLista = () => ctx.editarLista?.();
const conLista = () => !!(ctx.datos.acceso?.lista || ctx.datos.acceso?.modo === 'codigo' || (ctx.datos.acceso?.modo === 'pin' && ctx.datos.acceso?.pinPorInvitado));
const pinTodos = () => (ctx.datos.acceso?.modo === 'pin' && !ctx.datos.acceso?.pinPorInvitado ? ctx.datos.acceso?.pin : '');
const pinDe = (i) => (ctx.datos.acceso?.modo === 'pin' ? (ctx.datos.acceso?.pinPorInvitado ? i.pin : ctx.datos.acceso?.pin) : '');
const nombres = () => [ctx.datos.nombres?.a, ctx.datos.nombres?.b].filter(Boolean).join(' & ');
const plural = () => !!ctx.datos.nombres?.b;
const inicioEvento = () => {
  const l = ctx.datos.celebracion || {};
  const f = l.fecha || String(l.inicio || '').slice(0, 10) || ctx.datos.ceremonia?.fecha;
  return f ? new Date(`${f}T${l.hora || '00:00'}:00`) : null;
};
const fechaTexto = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const cierre = () => ctx.datos.rsvp?.cierre || '';
const fechaHora = (iso) => new Date(iso).toLocaleString('es', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const admin = () => ctx.datos.admin || {};

// Textos base de WhatsApp (se pueden cambiar y quedan guardados)
const TEXTO_WA = () => (plural()
  ? `¡Nos casamos y queremos celebrar contigo! 💍\nTe invitamos a nuestra boda. Ingresa a nuestra invitación digital para ver todos los detalles y confirmar tu asistencia:\n{link}${cierre() ? '\n(Fecha límite para confirmar: {cierre})' : ''}\n¡Te esperamos!\n{nombres}`
  : `¡Quiero celebrar contigo! 🎉\nIngresa a mi invitación digital para ver todos los detalles y confirmar tu asistencia:\n{link}${cierre() ? '\n(Fecha límite para confirmar: {cierre})' : ''}\n¡Te espero!\n{nombres}`);
const TEXTO_WA_LISTA = () => `¡Hola {invitado}! ${plural() ? '¡Nos casamos y queremos celebrar contigo! 💍\nTe invitamos cordialmente a nuestra boda.' : '¡Quiero celebrar contigo! 🎉'}\nEn tu invitación personal están todos los detalles y puedes confirmar tu asistencia:\n{link}{pin}${cierre() ? '\n(Fecha límite para confirmar: {cierre})' : ''}\n¡Saludos!\n{nombres}`;
const TEXTO_RECORDATORIO = () => `¡Hola {invitado}! 😊 Te recordamos que todavía no confirmaste tu asistencia${cierre() ? ' (la fecha límite es el {cierre})' : ''}. Puedes hacerlo acá:\n{link}{pin}\n¡Gracias!\n{nombres}`;
const armarTexto = (plantilla, i = null) => plantilla
  .replace(/\{link\}/g, i ? linkDe(i) : link()).replace(/\{nombres\}/g, nombres()).replace(/\{cierre\}/g, fechaTexto(cierre()))
  .replace(/\{invitado\}/g, i ? (i.integrantes ? String(i.nombre || '') : String(i.nombre || '').split(' ')[0]) : '').replace(/\{pin\}/g, i && pinDe(i) ? `\nPIN: ${pinDe(i)}` : (!i && pinTodos() ? `\nPIN: ${pinTodos()}` : ''));
// Con teléfono (con código de país) el WhatsApp sale directo a su número; sin teléfono, se elige el contacto
const wa = (texto, tel = '') => {
  const n = String(tel || '').replace(/^00/, '').replace(/\D/g, '');
  return `https://wa.me/${n.length >= 8 ? n : ''}?text=${encodeURIComponent(texto)}`;
};

async function guardarAdmin(cambios) {
  ctx.datos.admin = { ...admin(), ...cambios };
  try { await ctx.api('/admin', { method: 'POST', body: JSON.stringify(ctx.datos.admin) }); } catch (e) { ctx.aviso(e.message, true); }
}

// ── Respuestas: la última de cada invitado ──
function ultimas() {
  const vistas = new Map();
  for (const x of (respuestas || []).filter((r) => r.tipo === 'rsvp')) {
    const k = x.datos.inv && !String(x.datos.inv).startsWith('inv-') ? x.datos.inv : `${x.datos.nombre}|${x.creado}`;
    if (!vistas.has(k)) vistas.set(k, x);
  }
  return [...vistas.values()];
}
const acompDe = (d) => (d.acompanantes && !/^no$/i.test(d.acompanantes) ? String(d.acompanantes).split(',').map((x) => x.trim()).filter(Boolean) : []);
const separar = (x) => String(x || '').split(',').map((n) => n.trim()).filter(Boolean);
// Quiénes van según su respuesta (familias: los integrantes que marcaron "Va", más los pases extra)
const genteDe = (d) => (d.asiste !== 'Si' ? [] : d.asisten ? [...separar(d.asisten), ...acompDe(d)] : [d.nombre || '—', ...acompDe(d)]);
const cuantos = (d) => (d.asiste !== 'Si' ? 0 : /^\d+$/.test(String(d.personas || '')) ? Number(d.personas) : genteDe(d).length);
const ninosDe = (d) => (/^\d+$/.test(String(d.ninos || '').trim()) ? Number(d.ninos) : 0);
function estadisticas() {
  const filas = ultimas();
  const van = filas.filter((x) => x.datos.asiste === 'Si'), noVan = filas.filter((x) => x.datos.asiste === 'No');
  const personas = van.reduce((s, x) => s + cuantos(x.datos), 0);
  const ninos = van.reduce((s, x) => s + ninosDe(x.datos), 0);
  const respondieron = new Set(filas.map((x) => x.datos.inv));
  const lista = ctx.S.invitados || [];
  const sinResponder = conLista() ? lista.filter((i) => !respondieron.has(i.codigo)) : [];
  return { filas, van, noVan, personas, ninos, sinResponder, lista };
}

// ── Piezas ──
const tarjeta = (titulo, ...hijos) => ctx.el('section', { class: 'ad-tarjeta' }, titulo ? ctx.el('h2', {}, titulo) : null, ...hijos);
const boton = (texto, onclick, clase = 'btn') => ctx.el('button', { type: 'button', class: clase, onclick }, texto);
const enlace = (texto, href, clase = 'btn') => ctx.el('a', { class: clase, href, target: '_blank', rel: 'noopener' }, texto);
const copiar = async (texto, msg = 'Copiado') => { try { await navigator.clipboard.writeText(texto); ctx.aviso(msg); } catch { prompt('Copiar:', texto); } };
function qrSvg(texto, tam = 220) {
  const q = window.qrcode(0, 'M'); q.addData(texto); q.make();
  const n = q.getModuleCount(), c = tam / (n + 8);
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${(x + 4) * c},${(y + 4) * c}h${c}v${c}h-${c}z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#1f2421"/></svg>`;
}
function mostrarQR(texto, titulo) {
  const svg = qrSvg(texto, 260);
  const descargar = () => {
    const img = new Image(); img.onload = () => {
      const cv = Object.assign(document.createElement('canvas'), { width: 1000, height: 1000 });
      cv.getContext('2d').drawImage(img, 0, 0, 1000, 1000);
      cv.toBlob((b) => { const a = ctx.el('a', { href: URL.createObjectURL(b), download: `qr-${(titulo || 'invitacion').replace(/\W+/g, '-').toLowerCase()}.png` }); document.body.append(a); a.click(); a.remove(); });
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };
  ctx.abrirModal(titulo || 'Código QR', ctx.el('div', { class: 'ad-qr', html: svg }), ctx.el('p', { class: 'ayuda ad-centro' }, texto),
    ctx.el('div', { class: 'ad-botones ad-centro' }, boton('Descargar QR', descargar), boton('Copiar link', () => copiar(texto, 'Link copiado'), 'btn btn-sec')));
}
function descargarCSV(nombre, cabecera, filas) {
  const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([`﻿${[cabecera, ...filas].map((f) => f.map(celda).join(';')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = ctx.el('a', { href: URL.createObjectURL(blob), download: nombre }); document.body.append(a); a.click(); a.remove();
}
// PDF: una ventana lista para imprimir o "Guardar como PDF"
function imprimir(titulo, html) {
  const w = window.open('', '_blank');
  if (!w) { ctx.aviso('El navegador bloqueó la ventana: permitir ventanas emergentes', true); return; }
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${titulo}</title><style>
    body{font:13px/1.45 Jost,system-ui,sans-serif;color:#1f2421;margin:28px} h1{font-size:20px;margin:0 0 4px} p.sub{color:#6b706c;margin:0 0 16px}
    table{width:100%;border-collapse:collapse} th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e2e0dc;vertical-align:top} th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b706c}
    .si{color:#2e7d32;font-weight:600}.no{color:#b3261e;font-weight:600}.pend{color:#b7791f;font-weight:600} .msg{border-left:3px solid #4e9c87;padding:6px 12px;margin:0 0 12px} .msg b{display:block}
    svg{max-width:100%;height:auto} @media print{body{margin:12mm}}</style></head><body><h1>${titulo}</h1><p class="sub">${nombres()} · ${new Date().toLocaleDateString('es')}</p>${html}
    <script>setTimeout(()=>print(),300)<\/script></body></html>`);
  w.document.close();
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ── Enviar en tanda ──
// WhatsApp no deja mandar solo desde una página web: se abre un chat por invitado, con el
// mensaje listo; al tocar Enviar en WhatsApp y volver, ya está el siguiente. Cada uno queda
// marcado como enviado (o recordado), así se puede cortar y seguir después.
function enviarEnTanda(lista, { tipo = 'invitacion', texto, titulo }) {
  if (!lista.length) { ctx.aviso(tipo === 'recordatorio' ? 'No hay invitados para recordar' : 'Ya se les envió a todos'); return; }
  let n = 0, hechos = 0;
  const caja = ctx.el('div', { class: 'ad-tanda' });
  const marcar = (i) => {
    const campo = tipo === 'recordatorio' ? 'recordado' : 'enviado';
    i[campo] = new Date().toISOString();
    const real = (ctx.S.invitados || []).find((x) => x.codigo === i.codigo); if (real) real[campo] = i[campo];
    ctx.api('/enviado', { method: 'POST', body: JSON.stringify({ codigo: i.codigo, tipo }) }).catch(() => {});
  };
  const pintar = () => {
    if (n >= lista.length) {
      caja.replaceChildren(ctx.el('p', { class: 'ad-tanda-fin' }, '🎉'), ctx.el('p', { class: 'ad-centro' }, `¡Listo! ${hechos === 1 ? 'Se abrió 1 mensaje' : `Se abrieron ${hechos} mensajes`}.`),
        ctx.el('div', { class: 'ad-botones ad-centro' }, boton('Cerrar', () => { document.getElementById('modal')?.close(); ctx.redibujar(); })));
      return;
    }
    const i = lista[n];
    const ir = ctx.el('a', { class: 'btn btn-wa btn-grande', href: wa(texto(i), i.telefono), target: '_blank', rel: 'noopener',
      onclick: () => { marcar(i); hechos++; setTimeout(() => { n++; pintar(); }, 350); } }, `Enviar a ${i.nombre}`);
    caja.replaceChildren(
      ctx.el('div', { class: 'ad-tanda-barra', style: `--avance:${(n / lista.length) * 100}%` }),
      ctx.el('p', { class: 'ad-tanda-n' }, `${n + 1} de ${lista.length}`),
      ctx.el('p', { class: 'ad-tanda-nombre' }, i.nombre),
      ctx.el('p', { class: 'ayuda ad-centro' }, i.telefono ? `📱 ${i.telefono}` : 'Sin teléfono: en WhatsApp se elige el contacto.'),
      ir,
      ctx.el('p', { class: 'ayuda ad-centro' }, 'Tocar Enviar en WhatsApp y volver acá: ya aparece el siguiente.'),
      ctx.el('div', { class: 'ad-botones ad-centro' },
        boton('Saltar', () => { n++; pintar(); }, 'btn btn-sec btn-chico'),
        boton('Terminar', () => { document.getElementById('modal')?.close(); ctx.redibujar(); }, 'btn btn-sec btn-chico')));
  };
  pintar();
  ctx.abrirModal(titulo, caja);
}

// ── Secciones ──
function vistaResumen() {
  const st = estadisticas();
  const inicio = inicioEvento();
  const cuenta = ctx.el('div', { class: 'ad-cuenta' });
  const pintar = () => {
    if (!inicio) { cuenta.replaceChildren(ctx.el('p', { class: 'ayuda' }, 'Falta la fecha del evento.')); return; }
    let s = Math.max(0, Math.floor((inicio - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400; const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60); s -= m * 60;
    cuenta.replaceChildren(...[[d, 'días'], [h, 'horas'], [m, 'min'], [s, 'seg']].map(([n, t]) => ctx.el('div', {}, ctx.el('strong', {}, String(n).padStart(2, '0')), ctx.el('span', {}, t))));
  };
  pintar(); clearInterval(reloj); reloj = setInterval(() => { if (!document.body.contains(cuenta)) { clearInterval(reloj); return; } pintar(); }, 1000);
  const avisos = [];
  if (cierre()) {
    const dias = Math.ceil((new Date(`${cierre()}T23:59:59`) - Date.now()) / 86400000);
    const faltan = st.sinResponder.length;
    avisos.push(dias >= 0
      ? `Quedan ${dias} ${dias === 1 ? 'día' : 'días'} para el cierre de la lista.${conLista() ? ` ${faltan ? `Aún ${faltan === 1 ? 'queda 1 invitado' : `quedan ${faltan} invitados`} sin confirmar.` : 'Ya respondieron todos.'}` : ''}`
      : 'La confirmación ya cerró.');
  }
  const aforo = Number(ctx.datos.rsvp?.aforo);
  if (aforo > 0) { const libres = Math.max(0, aforo - st.personas); avisos.push(libres === 1 ? 'Queda 1 lugar.' : `Quedan ${libres} lugares (aforo de ${aforo}).`); }
  return [
    tarjeta(inicio ? `Faltan para ${plural() ? 'la boda' : 'el evento'}` : 'Cuenta regresiva', cuenta, ...avisos.map((a) => ctx.el('p', { class: 'ad-aviso' }, a))),
    ctx.el('div', { class: 'ad-numeros' },
      numero(st.personas, 'personas confirmadas', 'si', 'Incluye acompañantes'),
      st.ninos ? numero(st.ninos, 'niños', 'si') : null,
      numero(st.noVan.length, 'no pueden ir', 'no'),
      conLista() ? numero(st.sinResponder.length, 'sin responder', 'pend') : null,
      numero((respuestas || []).filter((r) => r.tipo === 'cancion').length, 'canciones sugeridas'),
      numero(ultimas().filter((x) => x.datos.mensaje).length, 'mensajes')),
    !publicada() ? tarjeta(null, ctx.el('p', { class: 'ayuda' }, 'La invitación todavía no está publicada. Cuando se publique, acá se ven las confirmaciones, los mensajes y las canciones que manden los invitados.')) : null,
  ];
}
const numero = (n, texto, clase = '', sub = '') => ctx.el('div', { class: `ad-numero ${clase}` }, ctx.el('strong', {}, String(n)), ctx.el('span', {}, texto), sub ? ctx.el('small', {}, sub) : null);

function editorTexto(clave, base, titulo, ayuda) {
  const area = ctx.el('textarea', { rows: 6, class: 'ad-texto' });
  area.value = admin()[clave] || base();
  let t; area.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => guardarAdmin({ [clave]: area.value }), 700); });
  return ctx.el('details', { class: 'ad-plantilla' }, ctx.el('summary', {}, titulo),
    ctx.el('p', { class: 'ayuda' }, ayuda), area,
    ctx.el('button', { type: 'button', class: 'btn-link', onclick: () => { area.value = base(); guardarAdmin({ [clave]: '' }); } }, 'Volver al texto original'));
}
function vistaEnviar() {
  if (!publicada()) return [tarjeta('Enviar la invitación', ctx.el('p', { class: 'ayuda' }, 'Cuando la invitación esté publicada, desde acá se envía por WhatsApp, se copia el link o se descarga el código QR.'))];
  if (conLista()) return vistaEnviarLista();
  const general = tarjeta('Enviar la invitación',
    ctx.el('p', { class: 'ad-link' }, link()), pinTodos() ? ctx.el('p', { class: 'ayuda' }, `PIN para todos: ${pinTodos()}`) : null,
    ctx.el('div', { class: 'ad-botones' },
      enlace('Ver la invitación', linkDueno(), 'btn btn-sec'),
      navigator.share ? boton('Enviar…', () => navigator.share({ title: nombres(), text: armarTexto(admin().textoWa || TEXTO_WA()).replace(link(), '').trim(), url: link() }).catch(() => {})) : null,
      enlace('Enviar por WhatsApp', wa(armarTexto(admin().textoWa || TEXTO_WA())), 'btn btn-wa'),
      boton('Copiar link', () => copiar(link(), 'Link copiado'), 'btn btn-sec'),
      boton('Código QR', () => mostrarQR(link(), 'Código QR de la invitación'), 'btn btn-sec')),
    editorTexto('textoWa', TEXTO_WA, 'Mensaje de WhatsApp', 'Se puede cambiar a gusto. {link} es el link de la invitación, {nombres} los de ustedes y {cierre} la fecha límite para confirmar.'));
  return [general];
}
// Con lista de invitados la invitación es de LISTA CERRADA: no hay link general para mandar,
// cada invitado entra solo con el suyo (y su PIN, si hay)
function vistaEnviarLista() {
  const st = estadisticas();
  const textoDe = (i) => armarTexto(admin().textoWaLista || TEXTO_WA_LISTA(), i);
  const respondio = new Set(st.filas.map((x) => x.datos.inv));
  const buscar = ctx.el('input', { type: 'search', placeholder: 'Buscar invitado…', class: 'ad-buscar' });
  const cuerpo = ctx.el('tbody');
  // Quién abrió su link y quién no (para recordarle solo a quien ni lo abrió)
  const ESTADOS = {
    todos: ['Todos', () => true],
    sinEnviar: ['Sin enviar', (i) => !i.enviado && !i.abierto && !respondio.has(i.codigo)],
    noAbrio: ['No lo abrieron', (i) => !i.abierto && !respondio.has(i.codigo)],
    abrio: ['Abrieron sin responder', (i) => i.abierto && !respondio.has(i.codigo)],
    respondio: ['Respondieron', (i) => respondio.has(i.codigo)],
  };
  let filtro = 'todos';
  const chips = ctx.el('div', { class: 'ad-filtros' }, Object.entries(ESTADOS).map(([k, [t, f]]) => {
    const b = ctx.el('button', { type: 'button', class: `ad-chip${k === filtro ? ' activo' : ''}`, onclick: () => { filtro = k; chips.querySelectorAll('.ad-chip').forEach((x) => x.classList.toggle('activo', x === b)); pintar(); } }, `${t} (${st.lista.filter(f).length})`);
    return b;
  }));
  const apertura = (i) => (respondio.has(i.codigo) ? ctx.el('span', { class: 'ad-estado si' }, 'Respondió')
    : !i.abierto && i.enviado ? ctx.el('span', { class: 'ad-estado enviado', title: fechaHora(i.enviado) }, 'Enviado')
    : i.abierto ? ctx.el('span', { class: 'ad-estado abrio', title: `Última vez: ${fechaHora(i.ultima || i.abierto)}` }, `Lo abrió${i.visitas > 1 ? ` (${i.visitas})` : ''}`)
      : ctx.el('span', { class: 'ad-estado pend' }, 'No lo abrió'));
  const pintar = () => {
    const q = buscar.value.trim().toLowerCase();
    cuerpo.replaceChildren(...st.lista.filter((i) => ESTADOS[filtro][1](i) && (!q || `${i.nombre} ${i.integrantes || ''}`.toLowerCase().includes(q))).map((i) => ctx.el('tr', {},
      ctx.el('td', {}, ctx.el('strong', {}, i.nombre || '—'), ctx.el('small', {}, [i.integrantes ? `Familia: ${i.integrantes}` : '', i.pases ? `+${i.pases} ${Number(i.pases) === 1 ? 'pase' : 'pases'}` : (i.integrantes ? '' : 'Sin pases extra'),
        i.mesa ? `Mesa ${i.mesa}` : '', pinDe(i) ? `PIN ${pinDe(i)}` : '', i.telefono ? `📱 ${i.telefono}` : ''].filter(Boolean).join(' · '))),
      ctx.el('td', {}, apertura(i), i.abierto && !respondio.has(i.codigo) ? ctx.el('small', {}, fechaHora(i.ultima || i.abierto)) : null),
      ctx.el('td', {}, ctx.el('div', { class: 'ad-acciones' },
        i.codigo ? ctx.el('a', { class: 'btn btn-chico btn-wa', href: wa(textoDe(i), i.telefono), target: '_blank', rel: 'noopener', onclick: () => ctx.api('/enviado', { method: 'POST', body: JSON.stringify({ codigo: i.codigo }) }).catch(() => {}) }, 'WhatsApp') : null,
        i.codigo ? boton('Copiar', () => copiar(`${linkDe(i)}${pinDe(i) ? `  (PIN ${pinDe(i)})` : ''}`, 'Link copiado'), 'btn btn-chico btn-sec') : null,
        i.codigo ? boton('QR', () => mostrarQR(linkDe(i), `QR de ${i.nombre}`), 'btn btn-chico btn-sec') : null,
        i.codigo ? enlace('Ver', linkDueno(i), 'btn btn-chico btn-sec') : null)))));
  };
  buscar.addEventListener('input', pintar); pintar();
  const cabeza = tarjeta('Enviar la invitación',
    ctx.el('p', { class: 'ad-aviso' }, '🔒 Lista cerrada: solo entran los invitados de la lista, cada uno con su link personal', ctx.datos.acceso?.modo === 'pin' ? ' y su PIN.' : '.'),
    ctx.el('p', { class: 'ayuda' }, 'Por eso no hay un link general para compartir. Ustedes sí pueden verla siempre desde "Ver la invitación".'),
    ctx.el('div', { class: 'ad-botones' }, enlace('Ver la invitación', linkDueno(), 'btn btn-sec'), boton('Editar lista de invitados', editarLista, 'btn btn-sec')));
  const sinEnviar = st.lista.filter((i) => i.codigo && !i.enviado && !i.abierto && !respondio.has(i.codigo));
  const tanda = tarjeta('Enviar a todos',
    ctx.el('p', { class: 'ayuda' }, 'Se abre WhatsApp con el mensaje de cada invitado, uno tras otro: tocar Enviar y volver. Con el teléfono cargado sale directo a su número. Quedan marcados como enviados, así se puede cortar y seguir después.'),
    ctx.el('div', { class: 'ad-botones' },
      boton(sinEnviar.length ? `Enviar a todos (${sinEnviar.length} sin enviar)` : 'Ya se envió a todos', () => enviarEnTanda(sinEnviar, { texto: textoDe, titulo: 'Enviar la invitación' }), 'btn btn-wa'),
      sinEnviar.length < st.lista.length ? boton('Volver a enviar a todos', () => { if (confirm('¿Abrir el mensaje para todos los de la lista, también a los que ya se les envió?')) enviarEnTanda(st.lista.filter((i) => i.codigo), { texto: textoDe, titulo: 'Enviar la invitación' }); }, 'btn btn-sec btn-chico') : null),
    ctx.el('label', { class: 'ad-check' }, (() => { const c = ctx.el('input', { type: 'checkbox', checked: admin().avisosMail !== false }); c.addEventListener('change', () => guardarAdmin({ avisosMail: c.checked })); return c; })(),
      ' Avisarme por mail 7, 3 y 1 día antes del cierre si hay invitados sin responder'));
  return [cabeza, tanda, tarjeta(`Links personales (${st.lista.length})`,
    ctx.el('p', { class: 'ayuda' }, 'Cada invitado tiene su propio link (con su nombre, pases y mesa). El mensaje sale personalizado con su nombre.'),
    st.lista.length ? null : ctx.el('p', { class: 'ad-aviso' }, 'Todavía no hay invitados en la lista.'),
    chips, buscar, ctx.el('div', { class: 'envolver-tabla' }, ctx.el('table', { class: 'ad-tabla' }, cuerpo)),
    ctx.el('p', { class: 'ayuda' }, '"Lo abrió" cuenta las veces que el invitado entró con su link (cuando ustedes la miran no cuenta). Con el teléfono cargado, el WhatsApp sale directo a su número.'),
    editorTexto('textoWaLista', TEXTO_WA_LISTA, 'Mensaje para cada invitado', '{invitado} es el nombre del invitado, {link} su link personal, {pin} su PIN (si hay), {cierre} la fecha límite y {nombres} los de ustedes.'))];
}

function vistaRespuestas() {
  const st = estadisticas();
  const preguntas = new Map();   // campo → etiqueta, según lo que respondieron
  for (const x of st.filas) {
    let lab = {}; try { lab = JSON.parse(x.datos.labels || '{}'); } catch { /* viejas */ }
    for (const k of Object.keys(x.datos)) if (!['inv', 'nombre', 'asiste', 'acompanantes', 'labels', 'mensaje', 'prueba', 'asisten', 'no_asisten', 'personas'].includes(k)) preguntas.set(k, lab[k] || k);
  }
  const filas = [
    ...st.filas.map((x) => ({ id: x.id, nombre: x.datos.nombre || '—', estado: x.datos.asiste === 'Si' ? 'si' : 'no', acomp: x.datos.asisten ? genteDe(x.datos) : acompDe(x.datos), personas: cuantos(x.datos), familia: !!x.datos.asisten, ninos: ninosDe(x.datos), fecha: x.creado, datos: x.datos })),
    ...st.sinResponder.map((i) => ({ nombre: i.nombre, estado: 'pend', acomp: [], ninos: 0, fecha: '', datos: {}, invitado: i })),
  ];
  let filtro = 'todos', orden = 'fecha';
  const buscar = ctx.el('input', { type: 'search', placeholder: 'Buscar por nombre…', class: 'ad-buscar' });
  const tabla = ctx.el('div', { class: 'envolver-tabla' });
  const ESTADO = { si: 'Va', no: 'No va', pend: 'Sin confirmar' };
  const visibles = () => {
    const q = buscar.value.trim().toLowerCase();
    return filas.filter((f) => (filtro === 'todos' || f.estado === filtro) && (!q || f.nombre.toLowerCase().includes(q) || f.acomp.join(' ').toLowerCase().includes(q)))
      .sort((a, b) => (orden === 'nombre' ? a.nombre.localeCompare(b.nombre, 'es') : String(b.fecha).localeCompare(String(a.fecha))));
  };
  const pintar = () => {
    const cols = [...preguntas.entries()];
    tabla.replaceChildren(ctx.el('table', { class: 'ad-tabla ad-respuestas' },
      ctx.el('thead', {}, ctx.el('tr', {}, ctx.el('th', {}, 'Invitado'), ctx.el('th', {}, 'Estado'), ctx.el('th', {}, 'Personas'), cols.map(([, l]) => ctx.el('th', {}, l)), ctx.el('th', {}, 'Respondió'))),
      ctx.el('tbody', {}, visibles().map((f) => ctx.el('tr', { class: `fila-${f.estado}` },
        ctx.el('td', {}, ctx.el('strong', {}, f.nombre), f.acomp.length ? ctx.el('small', {}, `${f.familia ? 'Van' : 'Con'}: ${f.acomp.join(', ')}`) : null,
          f.datos.prueba ? ctx.el('span', { class: 'ad-prueba' }, 'Prueba ', ctx.el('button', { type: 'button', class: 'btn-link', onclick: () => borrar(f.id) }, 'Borrar')) : null),
        ctx.el('td', {}, ctx.el('span', { class: `ad-estado ${f.estado}` }, ESTADO[f.estado])),
        ctx.el('td', {}, f.estado === 'si' ? String(f.personas) + (f.ninos ? ` + ${f.ninos} niños` : '') : '—'),
        cols.map(([k]) => ctx.el('td', {}, f.datos[k] || '')),
        ctx.el('td', {}, f.fecha ? fechaHora(f.fecha) : (f.invitado?.codigo ? enlace('Recordar', wa(armarTexto(admin().textoRecordatorio || TEXTO_RECORDATORIO(), f.invitado), f.invitado.telefono), 'btn btn-chico btn-wa') : '')))))));
  };
  const chips = ctx.el('div', { class: 'ad-filtros' }, [['todos', `Todos (${filas.length})`], ['si', `Van (${st.van.length})`], ['no', `No van (${st.noVan.length})`],
    ...(conLista() ? [['pend', `Sin confirmar (${st.sinResponder.length})`]] : [])].map(([v, t]) => {
    const b = ctx.el('button', { type: 'button', class: `ad-chip${v === filtro ? ' activo' : ''}`, onclick: () => { filtro = v; chips.querySelectorAll('.ad-chip').forEach((x) => x.classList.toggle('activo', x === b)); pintar(); } }, t);
    return b;
  }));
  const ordenar = ctx.el('select', { class: 'ad-orden', 'aria-label': 'Ordenar' }, ctx.el('option', { value: 'fecha' }, 'Más recientes'), ctx.el('option', { value: 'nombre' }, 'Por nombre'));
  ordenar.addEventListener('change', () => { orden = ordenar.value; pintar(); });
  buscar.addEventListener('input', pintar); pintar();
  const exportar = (soloVan, formato) => {
    const cols = [...preguntas.entries()];
    const lista = filas.filter((f) => !soloVan || f.estado === 'si');
    if (formato === 'csv') {
      descargarCSV(soloVan ? 'confirmados.csv' : 'respuestas.csv', ['Invitado', 'Estado', 'Acompañantes', 'Personas', 'Niños', ...cols.map(([, l]) => l), 'Fecha'],
        lista.map((f) => [f.nombre, ESTADO[f.estado], f.acomp.join(', '), f.estado === 'si' ? f.personas : 0, f.ninos || '', ...cols.map(([k]) => f.datos[k] || ''), f.fecha ? fechaHora(f.fecha) : '']));
      return;
    }
    imprimir(soloVan ? 'Invitados confirmados' : 'Respuestas', `<p>${st.personas} personas confirmadas${st.ninos ? ` · ${st.ninos} niños` : ''} · ${st.noVan.length} no van${conLista() ? ` · ${st.sinResponder.length} sin confirmar` : ''}</p>
      <table><tr><th>Invitado</th><th>Estado</th><th>Personas</th>${cols.map(([, l]) => `<th>${esc(l)}</th>`).join('')}<th>Fecha</th></tr>${lista.map((f) => `<tr><td><b>${esc(f.nombre)}</b>${f.acomp.length ? `<br><small>${f.familia ? 'Van' : 'Con'}: ${esc(f.acomp.join(', '))}</small>` : ''}</td><td class="${f.estado}">${ESTADO[f.estado]}</td><td>${f.estado === 'si' ? f.personas : '—'}${f.ninos ? ` + ${f.ninos} niños` : ''}</td>${cols.map(([k]) => `<td>${esc(f.datos[k] || '')}</td>`).join('')}<td>${f.fecha ? fechaHora(f.fecha) : ''}</td></tr>`).join('')}</table>`);
  };
  const pendientes = st.sinResponder.filter((i) => i.codigo).sort((a, b) => !!a.abierto - !!b.abierto);
  const soloVan = ctx.el('input', { type: 'checkbox' });
  const borrar = async (id) => {
    if (!confirm('¿Borrar esta respuesta de prueba?')) return;
    try { await ctx.api(`/respuestas?r=${id}`, { method: 'DELETE' }); respuestas = respuestas.filter((x) => x.id !== id); ctx.redibujar(); } catch (e) { ctx.aviso(e.message, true); }
  };
  return [
    ctx.el('div', { class: 'ad-numeros' }, numero(st.personas, 'personas (invitados y acompañantes)', 'si'), si(st.ninos) ? numero(st.ninos, 'niños', 'si') : null,
      numero(st.noVan.length, 'no van', 'no'), conLista() ? numero(st.sinResponder.length, 'sin confirmar', 'pend') : null),
    tarjeta('Confirmaciones', ctx.el('div', { class: 'ad-barra' }, chips, ctx.el('div', { class: 'ad-barra-der' }, buscar, ordenar)), tabla,
      ctx.el('div', { class: 'ad-botones ad-descargas' },
        boton('Excel', () => exportar(soloVan.checked, 'csv'), 'btn btn-sec btn-chico'), boton('PDF', () => exportar(soloVan.checked, 'pdf'), 'btn btn-sec btn-chico'),
        ctx.el('label', { class: 'ad-check' }, soloVan, ' Solo confirmados'))),
    conLista() ? tarjeta(`Recordatorios (${pendientes.length} sin confirmar)`,
      ctx.el('p', { class: 'ayuda' }, 'Un mensaje de WhatsApp para cada invitado que todavía no confirmó (se abre WhatsApp con el texto listo para enviar). Primero van los que ni abrieron su link.'),
      pendientes.length ? ctx.el('div', { class: 'ad-botones' },
        boton(`Recordar a todos (${pendientes.length})`, () => enviarEnTanda(pendientes, { tipo: 'recordatorio', texto: (i) => armarTexto(admin().textoRecordatorio || TEXTO_RECORDATORIO(), i), titulo: 'Recordatorios' }), 'btn btn-wa'),
        pendientes.some((i) => i.abierto) && pendientes.some((i) => !i.abierto) ? boton(`Solo a los que no lo abrieron (${pendientes.filter((i) => !i.abierto).length})`,
          () => enviarEnTanda(pendientes.filter((i) => !i.abierto), { tipo: 'recordatorio', texto: (i) => armarTexto(admin().textoRecordatorio || TEXTO_RECORDATORIO(), i), titulo: 'Recordatorios' }), 'btn btn-sec btn-chico') : null) : null,
      pendientes.length ? ctx.el('div', { class: 'ad-recordar' }, pendientes.map((i) => enlace(`Recordar a ${i.nombre}${i.abierto ? '' : ' · no lo abrió'}${i.recordado ? ' ✓' : ''}`, wa(armarTexto(admin().textoRecordatorio || TEXTO_RECORDATORIO(), i), i.telefono), 'btn btn-chico btn-wa'))) : ctx.el('p', { class: 'ayuda' }, '¡Ya respondieron todos!'),
      editorTexto('textoRecordatorio', TEXTO_RECORDATORIO, 'Texto del recordatorio', '{invitado}, {link}, {pin}, {cierre} y {nombres} se completan solos.')) : null,
  ];
}
const si = (x) => !!x;

function vistaMensajes() {
  const msgs = ultimas().filter((x) => x.datos.mensaje).map((x) => ({ nombre: x.datos.nombre, texto: x.datos.mensaje, fecha: x.creado }));
  if (!msgs.length) return [tarjeta('Mensajes', ctx.el('p', { class: 'ayuda' }, publicada() ? 'Todavía no hay mensajes. Al confirmar, cada invitado puede dejarles unas palabras.' : 'Cuando la invitación esté publicada, acá aparecen los mensajes que dejen los invitados al confirmar.'))];
  // El destacado va rotando, como una conversación
  const destacado = ctx.el('div', { class: 'ad-destacado', 'aria-live': 'polite' });
  let i = 0;
  const mostrar = () => { const m = msgs[i % msgs.length]; destacado.replaceChildren(ctx.el('p', {}, `“${m.texto}”`), ctx.el('strong', {}, m.nombre)); destacado.classList.remove('entra'); void destacado.offsetWidth; destacado.classList.add('entra'); i++; };
  mostrar();
  const t = setInterval(() => { if (!document.body.contains(destacado)) { clearInterval(t); return; } mostrar(); }, 5000);
  return [tarjeta(`Mensajes (${msgs.length})`, destacado,
    ctx.el('div', { class: 'ad-chat' }, msgs.map((m) => ctx.el('div', { class: 'ad-burbuja' }, ctx.el('strong', {}, m.nombre), ctx.el('p', {}, m.texto), ctx.el('small', {}, fechaHora(m.fecha))))),
    ctx.el('div', { class: 'ad-botones' },
      boton('Descargar (Excel)', () => descargarCSV('mensajes.csv', ['Invitado', 'Mensaje', 'Fecha'], msgs.map((m) => [m.nombre, m.texto, fechaHora(m.fecha)])), 'btn btn-sec btn-chico'),
      boton('Descargar (PDF)', () => imprimir('Mensajes de los invitados', msgs.map((m) => `<div class="msg"><b>${esc(m.nombre)}</b>${esc(m.texto)}</div>`).join('')), 'btn btn-sec btn-chico')))];
}

function vistaCanciones() {
  const lista = (respuestas || []).filter((r) => r.tipo === 'cancion').map((x) => ({ cancion: x.datos.cancion || '', fecha: x.creado }));
  if (!lista.length) return [tarjeta('Canciones', ctx.el('p', { class: 'ayuda' }, 'Todavía no hay canciones sugeridas.'))];
  return [tarjeta(`Canciones sugeridas (${lista.length})`,
    ctx.el('p', { class: 'ayuda' }, 'Con "Spotify" se abre la búsqueda de cada canción para sumarla a una playlist con un toque.'),
    ctx.el('details', { class: 'ad-plantilla' }, ctx.el('summary', {}, 'Pasar todas a una playlist de Spotify'),
      ctx.el('ol', { class: 'ad-pasos' },
        ctx.el('li', {}, 'Tocar "Copiar y abrir TuneMyMusic" (se copian todas las canciones).'),
        ctx.el('li', {}, 'Allá elegir "Pegar texto" como origen y pegar la lista.'),
        ctx.el('li', {}, 'Elegir Spotify como destino, entrar con la cuenta propia y listo: queda una playlist nueva.')),
      ctx.el('div', { class: 'ad-botones' }, boton('Copiar y abrir TuneMyMusic', async () => {
        await copiar(lista.map((c) => c.cancion).join('\n'), 'Lista copiada'); window.open('https://www.tunemymusic.com/es/transfer', '_blank', 'noopener');
      }, 'btn btn-chico'))),
    ctx.el('ul', { class: 'ad-canciones' }, lista.map((c) => ctx.el('li', {}, ctx.el('span', {}, `🎵 ${c.cancion}`),
      ctx.el('span', { class: 'ad-acciones' }, ctx.el('small', {}, fechaHora(c.fecha)), enlace('Spotify', `https://open.spotify.com/search/${encodeURIComponent(c.cancion)}`, 'btn btn-chico btn-sec'))))),
    ctx.el('div', { class: 'ad-botones' },
      boton('Descargar (Excel)', () => descargarCSV('canciones.csv', ['Canción', 'Fecha'], lista.map((c) => [c.cancion, fechaHora(c.fecha)])), 'btn btn-sec btn-chico'),
      boton('Copiar la lista', () => copiar(lista.map((c) => c.cancion).join('\n'), 'Lista copiada'), 'btn btn-sec btn-chico')))];
}

// Mesas: los invitados de la lista con su número de mesa; croquis con un asiento por persona
function vistaMesas() {
  const st = estadisticas();
  if (!st.lista.length) return [tarjeta('Mesas', ctx.el('p', { class: 'ayuda' }, 'Con la lista de invitados (y la mesa de cada uno) acá se arma la distribución de las mesas y un croquis para ver e imprimir.'))];
  const respuestaDe = new Map(st.filas.map((x) => [x.datos.inv, x.datos]));
  const personasDe = (i) => {
    const d = respuestaDe.get(i.codigo);
    if (d?.asiste === 'No') return [];
    if (d?.asiste === 'Si') return genteDe(d);
    const base = separar(i.integrantes).length ? separar(i.integrantes) : [i.nombre];
    return [...base, ...Array.from({ length: Number(i.pases) || 0 }, (_, k) => `${base[0]} +${k + 1}`)];
  };
  const asientos = Number(admin().asientos) || 10;
  const mesas = new Map();
  for (const i of st.lista) { const k = String(i.mesa || '').trim() || 'Sin mesa'; if (!mesas.has(k)) mesas.set(k, []); mesas.get(k).push(i); }
  const claves = [...mesas.keys()].sort((a, b) => (a === 'Sin mesa') - (b === 'Sin mesa') || a.localeCompare(b, 'es', { numeric: true }));
  const cambiarMesa = async (i, mesa) => {
    if (String(i.mesa || '') === String(mesa || '')) return;
    i.mesa = mesa;
    try { await ctx.guardarInvitados(); } catch (e) { ctx.aviso(e.message, true); }
    ctx.redibujar();
  };
  const listado = ctx.el('div', { class: 'ad-mesas' }, claves.map((k) => {
    const gente = mesas.get(k).flatMap(personasDe);
    return ctx.el('div', { class: `ad-mesa${gente.length > asientos && k !== 'Sin mesa' ? ' llena' : ''}`, 'data-mesa': k === 'Sin mesa' ? '' : k },
      ctx.el('h3', {}, k === 'Sin mesa' ? k : `Mesa ${k}`, ctx.el('small', {}, ` ${gente.length}${k !== 'Sin mesa' ? `/${asientos}` : ''}`)),
      ctx.el('ul', {}, mesas.get(k).map((i) => {
        const sel = ctx.el('input', { type: 'text', value: i.mesa || '', class: 'ad-mesa-num', 'aria-label': `Mesa de ${i.nombre}`, placeholder: '—' });
        sel.addEventListener('change', () => cambiarMesa(i, sel.value.trim()));
        const li = ctx.el('li', {}, ctx.el('span', { class: 'ad-arrastrar', title: 'Arrastrar a otra mesa', 'aria-hidden': 'true' }, '⠿'),
          ctx.el('span', {}, i.nombre, personasDe(i).length > 1 ? ctx.el('small', {}, ` +${personasDe(i).length - 1}`) : null), sel);
        arrastrable(li, li.firstChild, (mesa) => cambiarMesa(i, mesa === '+' ? siguienteMesa() : mesa));
        return li;
      })));
  }), ctx.el('div', { class: 'ad-mesa ad-mesa-nueva', 'data-mesa': '+' }, ctx.el('h3', {}, '+ Mesa nueva'), ctx.el('p', { class: 'ayuda' }, 'Soltar acá para abrir otra mesa')));
  const siguienteMesa = () => String(Math.max(0, ...claves.map(Number).filter(Number.isFinite)) + 1);
  // En el celular, 2 mesas por fila (entra en el ancho); al imprimir, 3
  const croquis = (porFila = innerWidth < 700 ? 2 : 4) => {
    const ms = claves.filter((k) => k !== 'Sin mesa');
    const cols = Math.min(porFila, Math.max(1, ms.length)), R = 70, celda = 260;
    const filas = Math.ceil(ms.length / cols);
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols * celda} ${filas * celda}" font-family="Jost, system-ui, sans-serif">`;
    ms.forEach((k, n) => {
      const cx = (n % cols) * celda + celda / 2, cy = Math.floor(n / cols) * celda + celda / 2;
      const gente = mesas.get(k).flatMap(personasDe);
      const lugares = Math.max(asientos, gente.length);
      svg += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#eef4f2" stroke="#4e9c87" stroke-width="2"/><text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="18" font-weight="600" fill="#1f2421">Mesa ${esc(k)}</text>`;
      for (let a = 0; a < lugares; a++) {
        const ang = (a / lugares) * Math.PI * 2 - Math.PI / 2, x = cx + Math.cos(ang) * (R + 16), y = cy + Math.sin(ang) * (R + 16);
        const tx = cx + Math.cos(ang) * (R + 34), ty = cy + Math.sin(ang) * (R + 34);
        const g = String(gente[a] || ''), extra = / (\+\d+)$/.exec(g), nombre = g ? g.split(' ')[0] + (extra ? ` ${extra[1]}` : '') : '';
        svg += `<circle cx="${x}" cy="${y}" r="9" fill="${gente[a] ? '#4e9c87' : '#fff'}" stroke="#4e9c87"/>`;
        if (nombre) svg += `<text x="${tx}" y="${ty + 4}" text-anchor="${Math.cos(ang) > 0.3 ? 'start' : Math.cos(ang) < -0.3 ? 'end' : 'middle'}" font-size="11" fill="#1f2421">${esc(nombre)}</text>`;
      }
    });
    return `${svg}</svg>`;
  };
  const vista = ctx.el('div', { class: 'ad-croquis', html: croquis() });
  const cant = ctx.el('input', { type: 'number', min: 2, max: 30, value: asientos, class: 'ad-mesa-num', 'aria-label': 'Asientos por mesa' });
  cant.addEventListener('change', async () => { await guardarAdmin({ asientos: Number(cant.value) || 10 }); ctx.redibujar(); });
  const linkMesa = `${location.origin}/mesa/${ctx.S.evento.id}`;
  const busca = ctx.el('input', { type: 'checkbox', checked: !!admin().buscaMesa });
  busca.addEventListener('change', async () => { await guardarAdmin({ buscaMesa: busca.checked }); ctx.redibujar(); });
  return [
    tarjeta('Mesas', ctx.el('p', { class: 'ayuda' }, 'Para cambiar a alguien de mesa: arrastrarlo (⠿) a otra mesa, o escribir el número. Se guarda en la lista de invitados. Cuentan el invitado, sus acompañantes confirmados o sus pases.'),
      ctx.el('div', { class: 'ad-botones' }, ctx.el('label', { class: 'ad-asientos' }, 'Asientos por mesa ', cant), boton('Editar lista de invitados', editarLista, 'btn btn-sec btn-chico')), listado),
    tarjeta('Buscá tu mesa (QR para la entrada)',
      ctx.el('p', { class: 'ayuda' }, 'Una página donde cada invitado escribe su nombre y ve su número de mesa. Se imprime el QR y se pone en la entrada del salón.'),
      ctx.el('label', { class: 'ad-check' }, busca, ' Activar la página "Buscá tu mesa"'),
      admin().buscaMesa ? ctx.el('div', { class: 'ad-botones' }, enlace('Ver la página', linkMesa, 'btn btn-sec btn-chico'), boton('QR para imprimir', () => mostrarQR(linkMesa, 'Buscá tu mesa'), 'btn btn-chico'), boton('Copiar link', () => copiar(linkMesa, 'Link copiado'), 'btn btn-sec btn-chico'))
        : ctx.el('p', { class: 'ayuda' }, 'Apagada: nadie puede buscar en la lista.')),
    tarjeta('Croquis', vista, ctx.el('div', { class: 'ad-botones' },
      boton('Imprimir o guardar en PDF', () => imprimir('Distribución de mesas', `${croquis(3)}<h2 style="font-size:16px;margin-top:24px">Por mesa</h2>${claves.map((k) => `<p><b>${k === 'Sin mesa' ? k : `Mesa ${esc(k)}`}:</b> ${esc(mesas.get(k).flatMap(personasDe).join(', '))}</p>`).join('')}`), 'btn btn-sec btn-chico'),
      boton('Excel por mesa', () => descargarCSV('mesas.csv', ['Mesa', 'Invitado', 'Personas'], claves.flatMap((k) => mesas.get(k).map((i) => [k, i.nombre, personasDe(i).join(', ')]))), 'btn btn-sec btn-chico'))),
  ];
}

function vistaAlbum() {
  const activo = ctx.datos.secciones?.album === true;
  const linkAlbum = ctx.datos.album?.link || '';
  if (activo || linkAlbum) {
    return [tarjeta('Álbum de fotos (Albunear)', ctx.el('p', { class: 'ayuda' }, 'Las fotos y videos que suben los invitados se ven y se descargan desde el panel de Albunear.'),
      ctx.el('div', { class: 'ad-botones' }, enlace('Abrir el panel de Albunear', 'https://albunear.com/panel', 'btn'), linkAlbum ? enlace('Ver el álbum', linkAlbum, 'btn btn-sec') : null))];
  }
  return [tarjeta('Álbum de fotos compartido', ctx.el('p', {}, 'Con Albunear los invitados suben sus fotos y videos del evento escaneando un QR, sin descargar nada, y ustedes las tienen todas en un solo lugar.'),
    ctx.el('p', { class: 'ayuda' }, 'Hay planes gratis. Si la invitación es Deluxe, se puede sumar como sección "Álbum de fotos QR".'),
    ctx.el('div', { class: 'ad-botones' }, enlace('Conocer Albunear', 'https://albunear.com', 'btn')))];
}

// Llegadas: el pase de entrada de cada invitado (QR de su link) y la recepción en la puerta.
// La persona que recibe usa el link de la puerta (sin acceso al panel); acá se ve en vivo.
let relojLlegadas = null;
function vistaLlegadas() {
  if (!conLista()) return [tarjeta('Llegadas', ctx.el('p', { class: 'ayuda' }, 'Con la lista de invitados, el día del evento se registra quién llega: escaneando el QR de cada invitado o buscándolo por nombre.'),
    ctx.el('div', { class: 'ad-botones' }, boton('Editar lista de invitados', editarLista, 'btn btn-sec btn-chico')))];
  const activo = ctx.el('input', { type: 'checkbox', checked: !!admin().checkin });
  activo.addEventListener('change', async () => { await guardarAdmin({ checkin: activo.checked }); ctx.redibujar(); });
  const cifras = ctx.el('div', { class: 'ad-numeros' });
  const lista = ctx.el('div', { class: 'envolver-tabla' });
  const acciones = ctx.el('div', { class: 'ad-botones' });
  const cargar = async () => {
    let d; try { d = await ctx.api('/puerta'); } catch (e) { lista.replaceChildren(ctx.el('p', { class: 'ayuda' }, e.message)); return; }
    const llegaron = d.invitados.reduce((s, i) => s + (i.llegaron || 0), 0), esperan = d.invitados.reduce((s, i) => s + i.esperan, 0);
    cifras.replaceChildren(numero(llegaron, 'llegaron', 'si'), numero(esperan, 'se esperan'), numero(Math.max(0, esperan - llegaron), 'faltan', 'pend'));
    acciones.replaceChildren(enlace('Abrir la recepción', d.link, 'btn'), boton('Copiar link', () => copiar(d.link, 'Link copiado'), 'btn btn-sec'),
      enlace('Enviar por WhatsApp', wa(`Link para recibir a los invitados de ${nombres()} (lista y lector de QR):\n${d.link}`), 'btn btn-wa'),
      boton('QR del link', () => mostrarQR(d.link, 'Recepción de invitados'), 'btn btn-sec'));
    const orden = [...d.invitados].sort((a, b) => String(b.llego).localeCompare(String(a.llego)) || a.nombre.localeCompare(b.nombre, 'es'));
    lista.replaceChildren(ctx.el('table', { class: 'ad-tabla' }, ctx.el('tbody', {}, orden.map((i) => ctx.el('tr', { class: i.llegaron ? 'fila-si' : '' },
      ctx.el('td', {}, ctx.el('strong', {}, i.nombre), ctx.el('small', {}, [i.mesa ? `Mesa ${i.mesa}` : 'Sin mesa', i.respondio === 'No' ? 'avisó que no va' : `${i.esperan} ${i.esperan === 1 ? 'persona' : 'personas'}`].join(' · '))),
      ctx.el('td', {}, i.llegaron ? ctx.el('span', { class: 'ad-estado si' }, `Llegó${i.llegaron > 1 ? ` (${i.llegaron})` : ''}`) : ctx.el('span', { class: 'ad-estado pend' }, 'Todavía no')),
      ctx.el('td', {}, i.llego ? fechaHora(i.llego) : ''))))));
  };
  cargar();
  clearInterval(relojLlegadas);
  relojLlegadas = setInterval(() => { if (!document.body.contains(lista)) { clearInterval(relojLlegadas); return; } if (!document.hidden) cargar(); }, 15000);
  return [
    tarjeta('Pase de entrada',
      ctx.el('p', { class: 'ayuda' }, 'Activado, cada invitado que confirmó ve el botón "Mi pase de entrada" en su invitación: un QR para mostrar en la puerta. También sirve el QR de su link personal.'),
      ctx.el('label', { class: 'ad-check' }, activo, ' Mostrar el pase de entrada a los invitados')),
    tarjeta('Recepción en la puerta',
      ctx.el('p', { class: 'ayuda' }, 'Quien recibe a los invitados abre este link en su celular: escanea el QR (o busca por nombre) y marca la llegada. Pueden usarlo varias personas a la vez. Solo deja ver la lista y marcar llegadas.'),
      acciones, cifras, ctx.el('h3', { class: 'ad-subtitulo' }, 'En vivo'), lista),
  ];
}

const VISTAS = { llegadas: vistaLlegadas, resumen: vistaResumen, enviar: vistaEnviar, respuestas: vistaRespuestas, mensajes: vistaMensajes, canciones: vistaCanciones, mesas: vistaMesas, album: vistaAlbum };

// ── Montaje ──
export async function montarAdmin(caja, c) {
  ctx = { ...c, redibujar: () => dibujar(caja) };
  caja.replaceChildren(ctx.el('p', { class: 'ayuda' }, 'Cargando…')); // (el menú se vuelve a armar)
  try { respuestas = publicada() ? (await ctx.api('/respuestas')).respuestas : []; } catch { respuestas = []; }
  dibujar(caja);
}
// Arrastrar con el dedo o el mouse (pointer events: funciona igual en el celular)
function arrastrable(item, asa, alSoltar) {
  asa.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = item.getBoundingClientRect();
    const fantasma = item.cloneNode(true);
    Object.assign(fantasma.style, { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, zIndex: 9999, pointerEvents: 'none', opacity: '.9', boxShadow: '0 8px 24px rgba(0,0,0,.18)', background: '#fff', borderRadius: '8px', listStyle: 'none' });
    document.body.append(fantasma); item.classList.add('arrastrando');
    const dx = e.clientX - r.left, dy = e.clientY - r.top;
    let destino = null;
    const mover = (ev) => {
      fantasma.style.left = `${ev.clientX - dx}px`; fantasma.style.top = `${ev.clientY - dy}px`;
      const bajo = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.ad-mesa');
      if (bajo !== destino) { destino?.classList.remove('sobre'); destino = bajo; destino?.classList.add('sobre'); }
      // Cerca del borde de la pantalla, la página se desplaza sola
      if (ev.clientY < 60) scrollBy(0, -12); else if (ev.clientY > innerHeight - 60) scrollBy(0, 12);
    };
    const soltar = () => {
      removeEventListener('pointermove', mover); removeEventListener('pointerup', soltar); removeEventListener('pointercancel', soltar);
      fantasma.remove(); item.classList.remove('arrastrando'); destino?.classList.remove('sobre');
      if (destino && !destino.contains(item)) alSoltar(destino.dataset.mesa);
    };
    addEventListener('pointermove', mover); addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar);
  });
}

function dibujar(caja) {
  // El menú se arma una sola vez: al tocar una pestaña solo cambia el contenido,
  // así el menú deslizable del celular no vuelve al principio
  let menu = caja.querySelector('.ad-menu');
  if (!menu) {
    menu = ctx.el('nav', { class: 'ad-menu', 'aria-label': 'Administración' }, SECCIONES.map(([id, t]) => ctx.el('button', { type: 'button', class: 'ad-tab', 'data-id': id,
      onclick: () => { seccion = id; dibujar(caja); } }, t)));
    const mas = ctx.el('button', { type: 'button', class: 'ad-menu-mas', 'aria-label': 'Ver más opciones', html: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      onclick: () => menu.scrollBy({ left: menu.clientWidth * 0.6, behavior: 'smooth' }) });
    const flecha = () => mas.hidden = menu.scrollLeft + menu.clientWidth >= menu.scrollWidth - 4;
    menu.addEventListener('scroll', flecha, { passive: true }); addEventListener('resize', flecha);
    caja.replaceChildren(ctx.el('div', { class: 'ad-cabeza' }, ctx.el('h1', {}, 'Administración'), publicada() ? enlace('Ver la invitación', linkDueno(), 'btn btn-sec btn-chico') : ctx.el('span', { class: 'chip' }, 'Sin publicar')),
      ctx.el('div', { class: 'ad-menu-caja' }, menu, mas), ctx.el('div', { class: 'ad-contenido' }));
    requestAnimationFrame(flecha);
  }
  menu.querySelectorAll('.ad-tab').forEach((b) => {
    const activo = b.dataset.id === seccion;
    b.classList.toggle('activo', activo);
    if (activo) { b.setAttribute('aria-current', 'page'); b.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); } else b.removeAttribute('aria-current');
  });
  caja.querySelector('.ad-contenido').replaceChildren(...(VISTAS[seccion]() || []).filter(Boolean));
}
