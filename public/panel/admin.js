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
  ['canciones', 'Canciones'], ['mesas', 'Mesas'], ['llegadas', 'Llegadas'], ['album', 'Álbum de fotos'], ['accesos', 'Accesos'],
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
  ? `¡Nos casamos y queremos celebrar contigo! 💍\nTe invitamos a nuestra boda. Ingresa a nuestra invitación digital para ver todos los detalles y confirmar tu asistencia:\n{link}{pin}${cierre() ? '\n(Fecha límite para confirmar: {cierre})' : ''}\n¡Te esperamos!\n{nombres}`
  : `¡Quiero celebrar contigo! 🎉\nIngresa a mi invitación digital para ver todos los detalles y confirmar tu asistencia:\n{link}{pin}${cierre() ? '\n(Fecha límite para confirmar: {cierre})' : ''}\n¡Te espero!\n{nombres}`);
const TEXTO_WA_LISTA = () => `¡Hola {invitado}! ${plural() ? '¡Nos casamos y queremos celebrar contigo! 💍\nTe invitamos cordialmente a nuestra boda.' : '¡Quiero celebrar contigo! 🎉'}\nEn tu invitación personal están todos los detalles y puedes confirmar tu asistencia:\n{link}{pin}${cierre() ? '\n(Fecha límite para confirmar: {cierre})' : ''}\n¡Saludos!\n{nombres}`;
const TEXTO_RECORDATORIO = () => `¡Hola {invitado}! 😊 Te recordamos que todavía no confirmaste tu asistencia${cierre() ? ' (la fecha límite es el {cierre})' : ''}. Puedes hacerlo acá:\n{link}{pin}\n¡Gracias!\n{nombres}`;
// Si hay PIN y el texto (cambiado a mano) no tiene {pin}, el PIN va igual, después del link
const armarTexto = (plantilla, i = null) => (/\{pin\}/.test(plantilla) ? plantilla : plantilla.replace('{link}', '{link}{pin}'))
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
// Íconos finos para los botones, elegidos por el texto (pocos, para no cargar)
const SVG = (d) => `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONOS = [
  [/^Ver\b|^Ver la/, SVG('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>')],
  [/WhatsApp|^Recordar|^Enviar a|^Enviar…|^Solo a los/, SVG('<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5Z"/>')],
  [/^Copiar/, SVG('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>')],
  [/QR/, SVG('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7h-4M14 21h.01"/>')],
  [/^Excel|^PDF|^Descargar|^Exportar/, SVG('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>')],
  [/^Imprimir/, SVG('<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/>')],
  [/^Cambiar ajuste/, SVG('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>')],
  [/^Editar/, SVG('<path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4"/>')],
  [/^Dar acceso/, SVG('<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/>')],
  [/^Abrir|^Crear el álbum/, SVG('<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>')],
];
const conIcono = (texto) => {
  const i = typeof texto === 'string' && ICONOS.find(([re]) => re.test(texto));
  return i ? [ctx.el('span', { class: 'ad-ico', html: i[1] }), texto] : [texto];
};
const boton = (texto, onclick, clase = 'btn') => ctx.el('button', { type: 'button', class: clase, onclick }, ...conIcono(texto));
const enlace = (texto, href, clase = 'btn') => ctx.el('a', { class: clase, href, target: '_blank', rel: 'noopener' }, ...conIcono(texto));
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
      ctx.el('p', { class: 'ayuda ad-centro' }, 'Tocar "Enviar" en WhatsApp y volver acá para continuar con el siguiente. Se puede terminar y seguir después (se guardan los enviados).'),
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
    numerosConteo(st),
    ctx.el('div', { class: 'ad-numeros ad-extras' },
      numero((respuestas || []).filter((r) => r.tipo === 'cancion').length, 'Canciones sugeridas', 'canciones', '', ICONO_NOTA),
      numero(ultimas().filter((x) => x.datos.mensaje).length, 'Mensajes', 'mensajes', '', ICONO_MSG)),
    !publicada() ? tarjeta(null, ctx.el('p', { class: 'ayuda' }, 'La invitación todavía no está publicada. Cuando se publique, acá se ven las confirmaciones, los mensajes y las canciones que manden los invitados.')) : null,
  ];
}
// Conteo en personas (pases): invitados = todos los pases de la lista; asisten = los que confirmaron;
// sin respuesta = los pases de quienes no respondieron; no asisten = el resto. Sin lista: lo que respondieron.
function conteo(st) {
  if (conLista()) {
    const pases = (i) => Math.max(1, separar(i.integrantes).length) + (Number(i.pases) || 0);
    const invitados = st.lista.reduce((n, i) => n + pases(i), 0);
    const sinRespuesta = st.sinResponder.reduce((n, i) => n + pases(i), 0);
    return { invitados, asisten: st.personas, noAsisten: Math.max(0, invitados - st.personas - sinRespuesta), sinRespuesta, ninos: st.ninos };
  }
  return { invitados: st.personas + st.noVan.length, asisten: st.personas, noAsisten: st.noVan.length, sinRespuesta: null, ninos: st.ninos };
}
const numerosConteo = (st) => {
  const c = conteo(st);
  return ctx.el('div', { class: `ad-numeros ad-conteo${c.sinRespuesta === null ? ' ad-conteo-3' : ''}` },
    numero(c.invitados, conLista() ? 'Invitados + pases' : 'Invitados', 'total', conLista() ? '' : 'Respondieron'),
    numero(c.asisten, '✓ Asisten', 'si', c.ninos ? `+ ${c.ninos} ${c.ninos === 1 ? 'niño' : 'niños'}` : ''),
    numero(c.noAsisten, '✗ No asisten', 'no'),
    c.sinRespuesta !== null ? numero(c.sinRespuesta, '⏳ Sin respuesta', 'pend') : null);
};
const numero = (n, texto, clase = '', sub = '', icono = '') => ctx.el('div', { class: `ad-numero ${clase}` }, ctx.el('strong', {}, String(n)),
  ctx.el('span', {}, icono ? ctx.el('span', { class: 'ad-ico', html: icono }) : null, texto), sub ? ctx.el('small', {}, sub) : null);
const ICONO_NOTA = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#7c5cc4" d="M20 3v12.5a3 3 0 1 1-2-2.8V7.3l-9 2v8.2a3 3 0 1 1-2-2.8V5.6L20 3Z"/></svg>';
const ICONO_MSG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#c4a8e8" d="M12 3C6.5 3 2 6.6 2 11c0 2.4 1.3 4.5 3.4 6L4.6 21l4.2-2.3c1 .2 2.1.3 3.2.3 5.5 0 10-3.6 10-8s-4.5-8-10-8Z"/></svg>';

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
  // Celular: un botón por línea, de ancho a ancho (Copiar link y QR, lado a lado)
  const texto = () => armarTexto(admin().textoWa || TEXTO_WA());
  const general = tarjeta('Enviar la invitación',
    ctx.el('p', { class: 'ad-link' }, link()),
    pinTodos() ? ctx.el('p', { class: 'ad-pin' }, 'PIN para todos: ', ctx.el('strong', {}, pinTodos()),
      ctx.el('button', { type: 'button', class: 'btn-icono ad-copiar', title: 'Copiar el PIN', 'aria-label': 'Copiar el PIN', html: ICONOS.find(([re]) => re.test('Copiar'))[1], onclick: () => copiar(pinTodos(), 'PIN copiado') })) : null,
    ctx.el('div', { class: 'ad-enviar' },
      enlace('Enviar por WhatsApp', wa(texto()), 'btn btn-wa'),
      navigator.share ? boton('Enviar…', () => navigator.share({ title: nombres(), text: texto().replace(link(), '').trim(), url: link() }).catch(() => {})) : null,
      boton('Copiar link', () => copiar(link(), 'Link copiado'), 'btn btn-sec'),
      boton('Código QR', () => mostrarQR(link(), 'Código QR de la invitación'), 'btn btn-sec')),
    editorTexto('textoWa', TEXTO_WA, 'Editar mensaje de WhatsApp', `Se puede cambiar a gusto. {link} es el link de la invitación, {nombres} los de ustedes y {cierre} la fecha límite para confirmar.${pinTodos() ? ' {pin} es el PIN (si no está, va después del link).' : ''}`));
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
        i.codigo ? ctx.el('a', { class: 'btn btn-chico btn-wa', href: wa(textoDe(i), i.telefono), target: '_blank', rel: 'noopener', onclick: () => ctx.api('/enviado', { method: 'POST', body: JSON.stringify({ codigo: i.codigo }) }).catch(() => {}) }, ...conIcono('WhatsApp')) : null,
        i.codigo ? boton('Copiar', () => copiar(`${linkDe(i)}${pinDe(i) ? `  (PIN ${pinDe(i)})` : ''}`, 'Link copiado'), 'btn btn-chico btn-sec') : null,
        i.codigo ? boton('QR', () => mostrarQR(linkDe(i), `QR de ${i.nombre}`), 'btn btn-chico btn-sec') : null,
        i.codigo ? enlace('Ver', linkDueno(i), 'btn btn-chico btn-sec') : null)))));
  };
  buscar.addEventListener('input', pintar); pintar();
  const sinEnviar = st.lista.filter((i) => i.codigo && !i.enviado && !i.abierto && !respondio.has(i.codigo));
  const tanda = (lista) => enviarEnTanda(lista, { texto: textoDe, titulo: 'Enviar la invitación' });
  return [tarjeta('Lista de invitados',
    ctx.el('p', { class: 'ad-aviso' }, `🔒 Lista cerrada: solo entran los invitados de la lista, cada uno con su link personal${ctx.datos.acceso?.modo === 'pin' ? ' y su PIN' : ''}. Ustedes sí pueden verla siempre desde "Ver la invitación".`),
    ctx.el('div', { class: 'ad-botones' }, boton('Editar lista de invitados', editarLista, 'btn btn-sec'), boton('Cambiar ajuste', () => ctx.cambiarAjuste?.(), 'btn btn-sec btn-gris')),
    ctx.el('hr', { class: 'ad-separador' }),
    ctx.el('h2', {}, `Enviar - Links personales (${st.lista.length})`),
    ctx.el('p', { class: 'ayuda ad-ayuda-junta' }, 'Cada invitado tiene su propio link (con su nombre, pases y mesa). El mensaje sale personalizado con su nombre.'),
    ctx.el('p', { class: 'ayuda' }, '"Lo abrió" cuenta las veces que el invitado entró con su link. Con el teléfono cargado, el WhatsApp sale directo a su número.'),
    st.lista.length ? ctx.el('div', { class: 'ad-botones' }, sinEnviar.length
      ? boton(`Enviar a todos (${sinEnviar.length} sin enviar)`, () => tanda(sinEnviar), 'btn btn-wa')
      : boton('Volver a enviar a todos', () => { if (confirm('¿Abrir el mensaje para todos los de la lista, también a los que ya se les envió?')) tanda(st.lista.filter((i) => i.codigo)); }, 'btn btn-wa'))
      : ctx.el('p', { class: 'ad-aviso' }, 'Todavía no hay invitados en la lista.'),
    editorTexto('textoWaLista', TEXTO_WA_LISTA, 'Editar mensaje de WhatsApp', '{invitado} es el nombre del invitado, {link} su link personal, {pin} su PIN (si hay), {cierre} la fecha límite y {nombres} los de ustedes.'),
    chips, buscar, ctx.el('div', { class: 'envolver-tabla' }, ctx.el('table', { class: 'ad-tabla ad-links' }, cuerpo)))];
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
  const tabla = ctx.el('div', { class: 'envolver-tabla ad-solo-escritorio' });
  const tarjetas = ctx.el('div', { class: 'ad-resp-tarjetas ad-solo-movil' });
  const ESTADO = { si: 'Asiste', no: 'No asiste', pend: 'Sin respuesta' };
  const mesaDe = new Map((st.lista || []).map((i) => [i.codigo, i.mesa]));
  // En el celular, cada respuesta es una tarjeta (como en el panel anterior): nombre y estado arriba,
  // y debajo los datos en dos columnas
  const tarjetaResp = (f, cols) => {
    const dato = (l, v) => (v === '' || v == null ? null : ctx.el('div', { class: 'ad-dato' }, ctx.el('small', {}, l), ctx.el('span', {}, String(v))));
    const mesa = f.invitado?.mesa || mesaDe.get(f.datos.inv);
    return ctx.el('article', { class: `ad-resp ad-resp-${f.estado}` },
      ctx.el('header', {}, ctx.el('strong', {}, f.nombre), ctx.el('span', { class: `ad-estado ${f.estado}` }, ESTADO[f.estado])),
      ctx.el('div', { class: 'ad-datos' }, ...[
        f.estado === 'si' ? dato('Pases', f.personas) : null,
        f.acomp.length ? dato(f.familia ? 'Asisten' : 'Acompañantes', f.acomp.join(', ')) : (f.estado !== 'pend' && f.datos.acompanantes ? dato('Acompañantes', f.datos.acompanantes) : null),
        f.ninos && !cols.some(([k]) => k === 'ninos') ? dato('Niños', f.ninos) : null,
        ...cols.map(([k, l]) => dato(l, f.datos[k])),
        mesa ? dato('Mesa', mesa) : null,
        f.fecha ? dato('Respondió', fechaHora(f.fecha)) : null,
      ].filter(Boolean)),
      f.datos.mensaje ? ctx.el('p', { class: 'ad-resp-msg' }, `💬 “${f.datos.mensaje}”`) : null,
      f.datos.prueba ? ctx.el('span', { class: 'ad-prueba' }, 'Prueba ', ctx.el('button', { type: 'button', class: 'btn-link', onclick: () => borrar(f.id) }, 'Borrar')) : null,
      !f.fecha && f.invitado?.codigo ? enlace('Recordar', wa(armarTexto(admin().textoRecordatorio || TEXTO_RECORDATORIO(), f.invitado), f.invitado.telefono), 'btn btn-chico btn-wa') : null);
  };
  const visibles = () => {
    const q = buscar.value.trim().toLowerCase();
    return filas.filter((f) => (filtro === 'todos' || f.estado === filtro) && (!q || f.nombre.toLowerCase().includes(q) || f.acomp.join(' ').toLowerCase().includes(q)))
      .sort((a, b) => (orden === 'nombre' ? a.nombre.localeCompare(b.nombre, 'es') : String(b.fecha).localeCompare(String(a.fecha))));
  };
  const pintar = () => {
    const cols = [...preguntas.entries()];
    tabla.replaceChildren(ctx.el('table', { class: 'ad-tabla ad-respuestas' },
      ctx.el('thead', {}, ctx.el('tr', {}, ctx.el('th', {}, 'Invitado'), ctx.el('th', {}, 'Estado'), ctx.el('th', {}, 'Pases'), ctx.el('th', {}, 'Mesa'), cols.map(([, l]) => ctx.el('th', {}, l)), ctx.el('th', {}, 'Respondió'))),
      ctx.el('tbody', {}, visibles().map((f) => ctx.el('tr', { class: `fila-${f.estado}` },
        ctx.el('td', {}, ctx.el('strong', {}, f.nombre), f.acomp.length ? ctx.el('small', {}, `${f.familia ? 'Van' : 'Con'}: ${f.acomp.join(', ')}`) : null,
          f.datos.prueba ? ctx.el('span', { class: 'ad-prueba' }, 'Prueba ', ctx.el('button', { type: 'button', class: 'btn-link', onclick: () => borrar(f.id) }, 'Borrar')) : null),
        ctx.el('td', {}, ctx.el('span', { class: `ad-estado ${f.estado}` }, ESTADO[f.estado])),
        ctx.el('td', {}, f.estado === 'si' ? String(f.personas) + (f.ninos ? ` + ${f.ninos} niños` : '') : '—'),
        ctx.el('td', {}, f.invitado?.mesa || mesaDe.get(f.datos.inv) || ''),
        cols.map(([k]) => ctx.el('td', {}, f.datos[k] || '')),
        ctx.el('td', {}, f.fecha ? fechaHora(f.fecha) : (f.invitado?.codigo ? enlace('Recordar', wa(armarTexto(admin().textoRecordatorio || TEXTO_RECORDATORIO(), f.invitado), f.invitado.telefono), 'btn btn-chico btn-wa') : '')))))));
    const vis = visibles();
    tarjetas.replaceChildren(...(vis.length ? vis.map((f) => tarjetaResp(f, cols)) : [ctx.el('p', { class: 'ayuda' }, 'No hay respuestas con ese filtro.')]));
  };
  const chips = ctx.el('div', { class: 'ad-filtros' }, [['todos', `Todos (${filas.length})`], ['si', `✓ Asisten (${st.van.length})`], ['no', `✗ No asisten (${st.noVan.length})`],
    ...(conLista() ? [['pend', `⏳ Sin respuesta (${st.sinResponder.length})`]] : [])].map(([v, t]) => {
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
      descargarCSV(soloVan ? 'confirmados.csv' : 'respuestas.csv', ['Invitado', 'Estado', 'Acompañantes', 'Pases', 'Mesa', 'Niños', ...cols.map(([, l]) => l), 'Fecha'],
        lista.map((f) => [f.nombre, ESTADO[f.estado], f.acomp.join(', '), f.estado === 'si' ? f.personas : 0, f.invitado?.mesa || mesaDe.get(f.datos.inv) || '', f.ninos || '', ...cols.map(([k]) => f.datos[k] || ''), f.fecha ? fechaHora(f.fecha) : '']));
      return;
    }
    imprimir(soloVan ? 'Invitados confirmados' : 'Respuestas', `<p>${st.personas} personas confirmadas${st.ninos ? ` · ${st.ninos} niños` : ''} · ${st.noVan.length} no van${conLista() ? ` · ${st.sinResponder.length} sin confirmar` : ''}</p>
      <table><tr><th>Invitado</th><th>Estado</th><th>Pases</th>${cols.map(([, l]) => `<th>${esc(l)}</th>`).join('')}<th>Fecha</th></tr>${lista.map((f) => `<tr><td><b>${esc(f.nombre)}</b>${f.acomp.length ? `<br><small>${f.familia ? 'Van' : 'Con'}: ${esc(f.acomp.join(', '))}</small>` : ''}</td><td class="${f.estado}">${ESTADO[f.estado]}</td><td>${f.estado === 'si' ? f.personas : '—'}${f.ninos ? ` + ${f.ninos} niños` : ''}</td>${cols.map(([k]) => `<td>${esc(f.datos[k] || '')}</td>`).join('')}<td>${f.fecha ? fechaHora(f.fecha) : ''}</td></tr>`).join('')}</table>`);
  };
  const pendientes = st.sinResponder.filter((i) => i.codigo).sort((a, b) => !!a.abierto - !!b.abierto);
  const soloVan = ctx.el('input', { type: 'checkbox' });
  const borrar = async (id) => {
    if (!confirm('¿Borrar esta respuesta de prueba?')) return;
    try { await ctx.api(`/respuestas?r=${id}`, { method: 'DELETE' }); respuestas = respuestas.filter((x) => x.id !== id); ctx.redibujar(); } catch (e) { ctx.aviso(e.message, true); }
  };
  return [
    numerosConteo(st),
    ctx.el('div', { class: 'ad-exportar' },
      boton('Exportar Excel / CSV', () => exportar(soloVan.checked, 'csv'), 'btn btn-sec'), boton('Descargar PDF', () => exportar(soloVan.checked, 'pdf'), 'btn btn-sec'),
      ctx.el('label', { class: 'ad-check' }, soloVan, ' Solo confirmados')),
    tarjeta('Confirmaciones', ctx.el('div', { class: 'ad-barra' }, chips, ctx.el('div', { class: 'ad-barra-der' }, buscar, ordenar)), tabla, tarjetas),
    conLista() ? tarjeta(`Recordatorios (${pendientes.length} sin confirmar)`,
      ctx.el('p', { class: 'ayuda' }, 'Un mensaje de WhatsApp para cada invitado que todavía no confirmó (se abre WhatsApp con el texto listo para enviar). Primero van los que ni abrieron su link.'),
      pendientes.length ? ctx.el('div', { class: 'ad-botones' },
        boton(`Recordar a todos (${pendientes.length})`, () => enviarEnTanda(pendientes, { tipo: 'recordatorio', texto: (i) => armarTexto(admin().textoRecordatorio || TEXTO_RECORDATORIO(), i), titulo: 'Recordatorios' }), 'btn btn-wa'),
        pendientes.some((i) => i.abierto) && pendientes.some((i) => !i.abierto) ? boton(`Solo a los que no lo abrieron (${pendientes.filter((i) => !i.abierto).length})`,
          () => enviarEnTanda(pendientes.filter((i) => !i.abierto), { tipo: 'recordatorio', texto: (i) => armarTexto(admin().textoRecordatorio || TEXTO_RECORDATORIO(), i), titulo: 'Recordatorios' }), 'btn btn-sec btn-chico') : null) : null,
      pendientes.length ? ctx.el('div', { class: 'ad-recordar' }, pendientes.map((i) => enlace(`Recordar a ${i.nombre}${i.abierto ? '' : ' · no lo abrió'}${i.recordado ? ' ✓' : ''}`, wa(armarTexto(admin().textoRecordatorio || TEXTO_RECORDATORIO(), i), i.telefono), 'btn btn-chico btn-wa'))) : ctx.el('p', { class: 'ayuda' }, '¡Ya respondieron todos!'),
      editorTexto('textoRecordatorio', TEXTO_RECORDATORIO, 'Texto del recordatorio', '{invitado}, {link}, {pin}, {cierre} y {nombres} se completan solos.'),
      cierre() ? ctx.el('label', { class: 'ad-check' }, (() => { const c = ctx.el('input', { type: 'checkbox', checked: admin().avisosMail !== false }); c.addEventListener('change', () => guardarAdmin({ avisosMail: c.checked })); return c; })(),
        ' Avisarme por mail 7, 3 y 1 día antes del cierre si hay invitados sin responder') : null) : null,
  ];
}
const si = (x) => !!x;

function vistaMensajes() {
  const canciones = (respuestas || []).filter((r) => r.tipo === 'cancion');
  const norm = (x) => String(x || '').trim().toLowerCase();
  const cancionDe = (d) => canciones.filter((c) => (d.inv && c.datos.inv === d.inv) || (c.datos.nombre && norm(c.datos.nombre) === norm(d.nombre))).map((c) => c.datos.cancion).filter(Boolean);
  const msgs = ultimas().filter((x) => x.datos.mensaje).map((x) => ({ nombre: x.datos.nombre || '—', texto: x.datos.mensaje, fecha: x.creado, asiste: x.datos.asiste === 'Si', personas: cuantos(x.datos), canciones: cancionDe(x.datos) }));
  if (!msgs.length) return [tarjeta('Mensajes', ctx.el('p', { class: 'ayuda' }, publicada() ? 'Todavía no hay mensajes. Al confirmar, cada invitado puede dejarles unas palabras.' : 'Cuando la invitación esté publicada, acá aparecen los mensajes que dejen los invitados al confirmar.'))];
  // El destacado va rotando, como una conversación
  const destacado = ctx.el('div', { class: 'ad-destacado', 'aria-live': 'polite' });
  let i = 0;
  const mostrar = () => { const m = msgs[i % msgs.length]; destacado.replaceChildren(ctx.el('p', {}, `“${m.texto}”`), ctx.el('strong', {}, m.nombre)); destacado.classList.remove('entra'); void destacado.offsetWidth; destacado.classList.add('entra'); i++; };
  mostrar();
  const t = setInterval(() => { if (!document.body.contains(destacado)) { clearInterval(t); return; } mostrar(); }, 5000);
  // Últimos mensajes: lista compacta; con muchos, gira sola como una rueda (y se puede mover a mano)
  const iniciales = (n) => String(n).split(/\s+/).filter((x) => /\p{L}/u.test(x)).slice(0, 2).map((x) => x.match(/\p{L}/u)[0].toUpperCase()).join('') || '·';
  const item = (m) => ctx.el('li', { class: 'ad-msg' },
    ctx.el('span', { class: 'ad-avatar', 'aria-hidden': 'true' }, iniciales(m.nombre)),
    ctx.el('div', { class: 'ad-msg-cuerpo' },
      ctx.el('p', { class: 'ad-msg-quien' }, ctx.el('strong', {}, m.nombre), m.asiste && m.personas > 1 ? ` · ${m.personas} personas` : ''),
      ctx.el('p', { class: 'ad-msg-texto' }, `«${m.texto}»`),
      ...m.canciones.slice(0, 2).map((c) => ctx.el('p', { class: 'ad-msg-cancion' }, ctx.el('span', { class: 'ad-ico', html: ICONO_NOTA }), c))),
    ctx.el('span', { class: `ad-msg-estado ${m.asiste ? 'si' : 'no'}` }, m.asiste ? 'Asiste' : 'No puede'));
  const lista = ctx.el('ul', { class: 'ad-msgs' }, msgs.map(item));
  const rueda = ctx.el('div', { class: 'ad-rueda', tabindex: '0', 'aria-label': 'Últimos mensajes' }, lista);
  if (msgs.length > 4 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lista.append(...msgs.map(item).map((li) => { li.setAttribute('aria-hidden', 'true'); return li; })); // copia para que el giro no tenga corte
    let quieto = 0, pos = 0;
    const parar = () => { quieto = Date.now() + 4000; };
    ['pointerdown', 'wheel', 'touchstart', 'focusin', 'mouseenter'].forEach((ev) => rueda.addEventListener(ev, parar, { passive: true }));
    rueda.addEventListener('scroll', () => { if (Date.now() < quieto) pos = rueda.scrollTop; }, { passive: true });
    const girar = () => {
      if (!document.body.contains(rueda)) return;
      const mitad = lista.scrollHeight / 2;
      if (Date.now() > quieto && !document.hidden) { pos += 0.35; if (pos >= mitad) pos -= mitad; rueda.scrollTop = pos; }
      else if (rueda.scrollTop >= mitad) { rueda.scrollTop -= mitad; pos = rueda.scrollTop; }
      requestAnimationFrame(girar);
    };
    requestAnimationFrame(girar);
  }
  return [tarjeta(`Mensajes (${msgs.length})`, destacado,
    ctx.el('div', { class: 'ad-botones ad-mitades' },
      boton('Descargar (Excel)', () => descargarCSV('mensajes.csv', ['Invitado', 'Asiste', 'Personas', 'Mensaje', 'Canción', 'Fecha'], msgs.map((m) => [m.nombre, m.asiste ? 'Sí' : 'No', m.asiste ? m.personas : 0, m.texto, m.canciones.join(' / '), fechaHora(m.fecha)])), 'btn btn-sec'),
      boton('Descargar (PDF)', () => imprimir('Mensajes de los invitados', msgs.map((m) => `<div class="msg"><b>${esc(m.nombre)}</b>${esc(m.texto)}${m.canciones.length ? `<br><small>♫ ${esc(m.canciones.join(' / '))}</small>` : ''}</div>`).join('')), 'btn btn-sec')),
    ctx.el('h3', { class: 'ad-subtitulo' }, 'Últimos mensajes'), rueda)];
}

function vistaCanciones() {
  const lista = (respuestas || []).filter((r) => r.tipo === 'cancion').map((x) => ({ cancion: x.datos.cancion || '', nombre: x.datos.nombre || '', fecha: x.creado }));
  if (!lista.length) return [tarjeta('Canciones', ctx.el('p', { class: 'ayuda' }, 'Todavía no hay canciones sugeridas.'))];
  return [tarjeta(`Canciones sugeridas (${lista.length})`,
    ctx.el('p', { class: 'ayuda' }, 'Con "Spotify" se abre la búsqueda de cada canción para sumarla a una playlist con un toque.'),
    ctx.el('div', { class: 'ad-botones' },
      boton('Descargar (Excel)', () => descargarCSV('canciones.csv', ['Canción', 'Invitado', 'Fecha'], lista.map((c) => [c.cancion, c.nombre, fechaHora(c.fecha)])), 'btn btn-sec btn-chico'),
      boton('Copiar la lista', () => copiar(lista.map((c) => c.cancion).join('\n'), 'Lista copiada'), 'btn btn-sec btn-chico')),
    ctx.el('details', { class: 'ad-plantilla' }, ctx.el('summary', {}, 'Pasar todas a una playlist de Spotify'),
      ctx.el('ol', { class: 'ad-pasos' },
        ctx.el('li', {}, 'Tocar "Copiar y abrir TuneMyMusic" (se copian todas las canciones).'),
        ctx.el('li', {}, 'Allá elegir "Pegar texto" como origen y pegar la lista.'),
        ctx.el('li', {}, 'Elegir Spotify como destino, entrar con la cuenta propia y listo: queda una playlist nueva.')),
      ctx.el('div', { class: 'ad-botones' }, boton('Copiar y abrir TuneMyMusic', async () => {
        await copiar(lista.map((c) => c.cancion).join('\n'), 'Lista copiada'); window.open('https://www.tunemymusic.com/es/transfer', '_blank', 'noopener');
      }, 'btn btn-chico'))),
    ctx.el('ul', { class: 'ad-canciones' }, lista.map((c) => ctx.el('li', {}, ctx.el('span', {}, `🎵 ${c.cancion}`, c.nombre ? ctx.el('small', {}, ` · ${c.nombre}`) : null),
      ctx.el('span', { class: 'ad-acciones' }, ctx.el('small', {}, fechaHora(c.fecha)), enlace('Spotify', `https://open.spotify.com/search/${encodeURIComponent(c.cancion)}`, 'btn btn-chico btn-sec'))))))];
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

// Álbum de fotos con Albunear. Con Deluxe viene el Classic sin cargo (el código de regalo lo pide el
// servidor a Albunear); pasar a Platinum cuesta solo la diferencia. Con un link propio, la pestaña no aparece.
const albumActivo = () => ctx.datos.secciones?.album === true;
const albumPropio = () => ctx.datos.album?.origen === 'propio';
function vistaAlbum() {
  const caja = ctx.el('section', { class: 'ad-tarjeta ad-albunear' }, ctx.el('p', { class: 'ayuda' }, 'Cargando…'));
  const permitido = ['premium', 'deluxe'].includes(ctx.S.plan?.plan) || !!ctx.S.usuario?.admin;
  const interruptor = ctx.el('input', { type: 'checkbox', role: 'switch', checked: albumActivo(), disabled: !permitido });
  interruptor.addEventListener('change', async () => {
    try {
      await ctx.api('/album', { method: 'POST', body: JSON.stringify({ activo: interruptor.checked }) });
      ctx.datos.secciones = { ...(ctx.datos.secciones || {}), album: interruptor.checked };
      if (interruptor.checked) { ctx.datos.secciones.instagram = false; ctx.datos.album = { ...(ctx.datos.album || {}), origen: 'albunear' }; }
      ctx.aviso(interruptor.checked ? 'Álbum activado en la invitación' : 'Álbum desactivado');
      ctx.redibujar();
    } catch (e) { interruptor.checked = !interruptor.checked; ctx.aviso(e.message, true); }
  });
  const cabeza = ctx.el('div', { class: 'ad-alb-cabeza' }, ctx.el('img', { src: '/comun/img/albunear.svg', alt: 'Albunear', class: 'ad-alb-logo', width: 160, height: 50 }),
    ctx.el('label', { class: 'ad-alb-switch' }, albumActivo() ? null : ctx.el('span', {}, 'Activar'), interruptor, ctx.el('span', { class: 'ad-alb-pista', 'aria-hidden': 'true' })));
  (async () => {
    let r = { incluido: false, crear: 'https://albunear.com/empezar', album: null };
    try { r = await ctx.api('/albunear'); } catch { /* sin conexión: quedan los links generales */ }
    if (!albumActivo()) {
      caja.replaceChildren(cabeza, ctx.el('h2', {}, 'Álbum de fotos compartido'),
        ctx.el('p', { class: 'ad-alb-texto' }, 'Con Albunear los invitados suben sus fotos y videos del evento escaneando un QR, sin descargar nada, y ustedes las tienen todas en un solo lugar.'),
        ctx.el('p', { class: 'ad-alb-nota' }, ctx.el('span', { class: 'ad-alb-verde' }, 'Si la invitación es Deluxe, está incluido el paquete Classic de Albunear sin cargo.'), ctx.el('br'),
          'También se puede agregar a invitaciones Basic y Premium contratándolo en Albunear.', ctx.el('br'), ctx.el('strong', {}, '¡Hay planes gratis!')),
        ctx.el('div', { class: 'ad-botones' }, enlace('Conocer Albunear', 'https://albunear.com', 'btn btn-albunear')),
        ctx.el('p', { class: 'ad-alb-pie' }, 'No es obligatorio usar el álbum de Albunear: se puede sumar el link de otro proveedor en la sección "Álbum de fotos QR" de la invitación.'));
      return;
    }
    const creado = r.album;
    caja.replaceChildren(...[cabeza, ctx.el('h2', {}, 'Álbum de fotos (Albunear)'),
      ctx.el('p', { class: 'ayuda' }, creado ? 'Las fotos y videos que suben los invitados se ven y se descargan desde el panel de Albunear.'
        : r.incluido ? 'La invitación Deluxe incluye el álbum Classic de Albunear sin cargo. Al crearlo con este botón, el regalo ya va aplicado y el álbum aparece solo en la invitación. Para pasar después a Platinum se paga solo la diferencia.'
          : 'Crear el álbum en Albunear (hay planes gratis) y después pegar su link en la sección "Álbum de fotos QR" de la invitación.'),
      ctx.el('div', { class: 'ad-botones' },
        creado ? enlace('Abrir el panel de Albunear', creado.panel, 'btn btn-albunear') : enlace(r.incluido ? 'Crear el álbum (Classic incluido)' : 'Abrir Albunear', r.crear, 'btn btn-albunear'),
        creado ? enlace('Ver el álbum', creado.link, 'btn btn-sec') : null),
      r.incluido && !r.conectado ? ctx.el('p', { class: 'ad-alb-nota' }, 'Para activar el Classic incluido, escribir a hola@amoinvitar.com con el código de esta invitación.') : null,
      creado && creado.plan !== 'platinum' && r.incluido ? ctx.el('p', { class: 'ad-alb-nota' }, 'Para pasar a Platinum (fotos originales, 2 años, diseños exclusivos), desde el panel de Albunear se paga solo la diferencia.') : null,
      ctx.el('p', { class: 'ad-alb-pie' }, 'Activo reemplaza Instagram Wall.')].filter(Boolean));
  })();
  return [caja];
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

// Accesos: quién más puede editar y administrar (la pareja en bodas y hasta 3 administradores)
const ROLES = { cliente: 'Titular', pareja: 'Pareja', admin: 'Administrador/a' };
function vistaAccesos() {
  const caja = ctx.el('div', {}, ctx.el('p', { class: 'ayuda' }, 'Cargando…'));
  const cargar = async () => {
    let d; try { d = await ctx.api('/accesos'); } catch (e) { caja.replaceChildren(ctx.el('p', { class: 'ayuda' }, e.message)); return; }
    const cuantos = (r) => d.accesos.filter((a) => a.rol === r).length;
    const filas = d.accesos.map((a) => ctx.el('tr', {},
      ctx.el('td', { class: 'ad-acceso' }, ctx.el('strong', {}, a.nombre || a.email), a.nombre ? ctx.el('small', {}, a.email) : null,
        ctx.el('span', { class: `ad-estado ${a.rol === 'cliente' ? 'si' : 'abrio'}` }, ROLES[a.rol] || a.rol), a.id === d.yo ? ctx.el('small', {}, 'Tu cuenta') : null),
      ctx.el('td', {}, d.gestiona && a.rol !== 'cliente' ? boton('Quitar', async () => {
        if (!confirm(`¿Quitarle el acceso a ${a.email}?`)) return;
        try { await ctx.api(`/accesos?u=${encodeURIComponent(a.id)}`, { method: 'DELETE' }); ctx.aviso('Acceso quitado'); cargar(); } catch (e) { ctx.aviso(e.message, true); }
      }, 'btn btn-chico btn-sec') : null)));
    const opciones = [['pareja', 'Pareja'], ['admin', 'Administrador/a (wedding planner, organizador…)']].filter(([r]) => cuantos(r) < (d.limite[r] || 0));
    const email = ctx.el('input', { type: 'email', placeholder: 'mail@ejemplo.com', autocomplete: 'off', class: 'ad-buscar' });
    const rol = ctx.el('select', { class: 'ad-orden', 'aria-label': 'Rol' }, opciones.map(([v, t]) => ctx.el('option', { value: v }, t)));
    const sumar = async () => {
      try {
        await ctx.api('/accesos', { method: 'POST', body: JSON.stringify({ email: email.value, rol: rol.value }) });
        ctx.aviso(`Listo: le llegó un mail a ${email.value} para entrar`); cargar();
      } catch (e) { ctx.aviso(e.message, true); }
    };
    caja.replaceChildren(...[
      ctx.el('div', { class: 'envolver-tabla' }, ctx.el('table', { class: 'ad-tabla' }, ctx.el('tbody', {}, filas))),
      !d.accesos.length ? ctx.el('p', { class: 'ayuda' }, 'Por ahora se entra solo con el link del panel.') : null,
      d.gestiona && opciones.length ? ctx.el('div', { class: 'ad-acceso-nuevo' }, ctx.el('h3', { class: 'ad-subtitulo' }, 'Dar acceso'),
        ctx.el('div', { class: 'ad-barra' }, email, rol, boton('Dar acceso', sumar, 'btn'))) : null,
      d.gestiona && !opciones.length ? ctx.el('p', { class: 'ayuda' }, 'Ya están todos los lugares ocupados (pareja y 3 administradores). Para sumar a alguien, quitar a otro.') : null,
      !d.gestiona ? ctx.el('p', { class: 'ayuda' }, 'Los accesos los cambian el titular o la pareja.') : null].filter(Boolean));
  };
  cargar();
  return [tarjeta('Accesos',
    ctx.el('p', { class: 'ayuda' }, `Quiénes pueden editar y administrar la invitación, cada uno con su mail (entran con un link por correo o con Google, sin contraseña).${ctx.S.evento.tipo === 'boda' ? ' Se puede sumar a la pareja' : ''} y hasta 3 administradores: wedding planner, organizador, un familiar…`),
    caja)];
}

const VISTAS = { accesos: vistaAccesos, llegadas: vistaLlegadas, resumen: vistaResumen, enviar: vistaEnviar, respuestas: vistaRespuestas, mensajes: vistaMensajes, canciones: vistaCanciones, mesas: vistaMesas, album: vistaAlbum };

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
    // Álbum: solo con la sección prendida y el álbum de Albunear (con un link propio no hay nada que administrar)
    const verAlbum = albumActivo() && !albumPropio();
    if (!verAlbum && seccion === 'album') seccion = 'resumen';
    menu = ctx.el('nav', { class: 'ad-menu', 'aria-label': 'Administración' }, SECCIONES.filter(([id]) => id !== 'album' || verAlbum).map(([id, t]) => ctx.el('button', { type: 'button', class: 'ad-tab', 'data-id': id,
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
