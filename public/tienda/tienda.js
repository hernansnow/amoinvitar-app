// Tienda: arma el pedido paso a paso y pide los precios al servidor.
const $ = (s) => document.querySelector(s);
const el = (tag, attrs = {}, ...hijos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) if (h != null && h !== false) e.append(h.nodeType ? h : document.createTextNode(h));
  return e;
};
const post = (ruta, cuerpo) => fetch(ruta, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) })
  .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'No se pudo completar'); return j; });

const q = new URLSearchParams(location.search);
const S = {
  catalogo: null, usuario: null, moneda: q.get('moneda') || null,
  producto: q.get('producto') || (q.get('modelo') ? 'invitacion' : null),
  tipo: q.get('evento') || null, modelo: q.get('modelo') || null, paquete: q.get('paquete') || null,
  std: null, extras: new Set(), medio: null, cupon: '', cotizacion: null,
  mejora: q.get('mejorar') ? { evento: q.get('mejorar'), paquete: q.get('a') || 'premium', extra: q.get('extra') || undefined } : null,
};
try { const k = sessionStorage.getItem(`clave_${S.mejora?.evento}`); if (S.mejora && k) S.mejora.clave = k; } catch { /* sin almacenamiento */ }

function mensaje(t, error = true) { const m = $('#mensaje'); m.className = t ? `mensaje ${error ? 'error' : 'ok'}` : ''; m.textContent = t || ''; }

const PRODUCTOS_PRINCIPALES = [
  { id: 'invitacion', nombre: 'Invitación web', texto: 'Con confirmación de asistencia, mapas, música, fotos y más.' },
  { id: 'std', nombre: 'Save The Date', texto: 'Para avisar la fecha: web, tarjeta, foto o video.' },
  { id: 'agradecimiento', nombre: 'Tarjeta de agradecimiento', texto: 'Para después del evento.' },
  { id: 'compromiso-web', nombre: 'Invitación web simple', texto: 'Compromiso, pedida de mano, civil o party.' },
];
const OPCIONES_STD = ['std-web', 'std-web-medida', 'std-tarjeta', 'std-foto', 'std-tarjeta-medida'];

function radio(grupo, valor, marcado, alElegir, ...contenido) {
  return el('label', { class: 'opcion' }, el('input', { type: 'radio', name: grupo, value: valor, checked: marcado, onchange: () => alElegir(valor) }), ...contenido);
}
const precioDe = (lista, id) => lista.find((x) => x.id === id)?.precio?.texto || '';

// ── Dibujar ───────────────────────────────────────────────────────────
function dibujar() {
  const c = S.catalogo;
  const esInv = S.producto === 'invitacion';
  $('#paso-producto').hidden = !!S.mejora;
  $('#productos').replaceChildren(...PRODUCTOS_PRINCIPALES.map((p) => radio('producto', p.id, S.producto === p.id, (v) => { S.producto = v; S.std = null; actualizar(); }, el('strong', {}, p.nombre), el('small', {}, p.texto),
    p.id === 'agradecimiento' || p.id === 'compromiso-web' ? el('div', { class: 'precio' }, precioDe(c.productos, p.id)) : null)));

  $('#paso-evento').hidden = !(esInv || S.producto === 'agradecimiento' || S.producto === 'std') || !!S.mejora;
  // La tarjeta de agradecimiento suelta: solo boda y 15
  const tiposVer = c.tipos;
  $('#tipos').replaceChildren(...tiposVer.map((t) => radio('tipo', t.id, S.tipo === t.id, (v) => { S.tipo = v; if (S.modelo && !c.modelos.find((m) => m.id === S.modelo)?.eventos.includes(v)) S.modelo = null; actualizar(); }, t.nombre)));

  const modelos = c.modelos.filter((m) => !S.tipo || m.eventos.includes(S.tipo));
  $('#paso-modelo').hidden = !esInv || !S.tipo || !!S.mejora;
  // Invitación: se elige el diseño y se personaliza gratis; se paga al publicar
  $('#modelos').replaceChildren(...(modelos.length ? modelos.map((m) => el('div', { class: 'opcion modelo' },
    el('button', { type: 'button', class: 'miniatura', 'aria-label': `Vista previa de ${m.nombres[S.tipo] || m.nombre}`, onclick: () => verDemo(m) },
      el('img', { class: 'modelo-img', src: `/modelos/${m.id}/tienda-${S.tipo}.jpg`, alt: '', loading: 'lazy', onerror: (e) => { if (e.target.dataset.f) return; e.target.dataset.f = 1; e.target.src = `/modelos/${m.id}/miniatura.jpg`; } })),
    el('strong', {}, m.nombres[S.tipo] || m.nombre, m.gratis ? el('span', { class: 'insignia', style: 'margin-left:6px' }, 'Gratis') : null),
    el('div', { class: 'botones-modelo' },
      el('button', { type: 'button', class: 'btn btn-sec', onclick: () => verDemo(m) }, 'Vista previa'),
      el('button', { type: 'button', class: 'btn', onclick: () => empezar(m) }, 'Personalizar')))) : [el('p', { class: 'vacio' }, 'Pronto habrá diseños para este evento.')]));

  $('#paso-std').hidden = S.producto !== 'std';
  // README (ronda 30): web y foto solo en boda y 15; la tarjeta del diseño, en los eventos que la tienen
  const STD_EVENTO = { 'std-web': ['boda', '15'], 'std-foto': ['boda', '15'], 'std-tarjeta': ['boda', '15', 'cumple', 'bautismo', 'comunion', 'babyshower'] };
  if (S.std && STD_EVENTO[S.std] && S.tipo && !STD_EVENTO[S.std].includes(S.tipo)) S.std = null;
  $('#std').replaceChildren(...OPCIONES_STD.filter((id) => !STD_EVENTO[id] || !S.tipo || STD_EVENTO[id].includes(S.tipo)).map((id) => {
    const p = c.productos.find((x) => x.id === id);
    if (p.manual) return el('div', { class: 'opcion' }, el('strong', {}, p.nombre), el('div', { class: 'precio' }, p.precio.texto), el('a', { href: 'https://amoinvitar.com/contacto', target: '_blank', rel: 'noopener' }, 'Pedir cotización'));
    return radio('std', id, S.std === id, (v) => { S.std = v; actualizar(); }, el('strong', {}, p.nombre.replace('Save The Date · ', '').replace('Save The Date ', '')), el('div', { class: 'precio' }, p.precio.texto));
  }));

  const modelo = c.modelos.find((m) => m.id === S.modelo);
  const mejoraDesde = S.mejoraActual ? ['gratis', 'basic', 'premium', 'deluxe'].indexOf(S.mejoraActual) : -1;
  const paquetes = c.paquetes.filter((p) => (S.mejora ? ['gratis', 'basic', 'premium', 'deluxe'].indexOf(p.id) > mejoraDesde : p.id !== 'gratis' || modelo?.gratis));
  $('#paso-paquete').hidden = !S.mejora || !!S.mejora?.extra;
  $('#paquetes').replaceChildren(...paquetes.map((p) => radio('paquete', p.id, S.paquete === p.id, (v) => { S.paquete = v; if (S.mejora) S.mejora.paquete = v; actualizar(); },
    el('strong', {}, p.nombre), el('div', { class: 'precio' }, S.mejora ? `+ ${S.difs?.[p.id] || ''}` : p.precio.texto), el('ul', {}, p.incluye.map((x) => el('li', {}, x))))));

  const conExtras = !S.mejora && ((S.producto && !esInv && S.producto !== 'std') || (S.producto === 'std' && S.std));
  $('#paso-extras').hidden = !conExtras;
  const extras = esInv ? c.extras : c.extras.filter((x) => x.id === 'idioma');
  $('#extras').replaceChildren(...extras.map((x) => el('label', { class: 'opcion extra' },
    el('input', { type: 'checkbox', checked: S.extras.has(x.id), onchange: (e) => { e.target.checked ? S.extras.add(x.id) : S.extras.delete(x.id); cotizar(); } }),
    el('span', {}, x.nombre), el('span', { class: 'precio' }, `+ ${x.precio.texto}`))));
}

function pedido() {
  if (S.producto === 'invitacion') return { producto: 'invitacion', tipo: S.tipo, modelo: S.modelo, paquete: S.paquete, extras: [...S.extras] };
  if (S.producto === 'std') return S.std ? { producto: S.std, tipo: S.tipo || 'boda', extras: [...S.extras] } : null;
  if (S.producto) return { producto: S.producto, tipo: S.tipo, extras: [...S.extras] };
  return null;
}
const listo = () => S.mejora ? !!S.mejora.paquete : S.producto === 'invitacion' ? false : S.producto === 'std' ? !!S.std && !!S.tipo : S.producto === 'agradecimiento' ? !!S.tipo : !!S.producto;
// README (ronda 29): los productos sueltos también se arman primero en el panel y se pagan al final
const suelto = () => !S.mejora && S.producto && S.producto !== 'invitacion';

let t = null;
function actualizar() { dibujar(); cotizar(); }
function cotizar() {
  clearTimeout(t);
  $('#resumen').hidden = !listo();
  $('#paso-pago').hidden = !listo() || suelto();
  if (!listo()) return;
  t = setTimeout(async () => {
    try {
      const r = S.mejora
        ? await post('/api/tienda/mejora', { mejora: S.mejora, moneda: S.moneda })
        : await post('/api/tienda/cotizar', { pedido: pedido(), moneda: S.moneda, cupon: S.cupon, factura: datosFactura() });
      S.cotizacion = r;
      mensaje('');
      dibujarPago();
    } catch (e) { mensaje(e.message); }
  }, 150);
}

function datosFactura() {
  const tipo = $('#f-tipo').value, nombre = $('#f-nombre').value.trim(), id = $('#f-id').value.trim();
  return nombre || id ? { tipo, nombre, id, direccion: $('#f-dir').value.trim() } : null;
}

function dibujarPago() {
  const r = S.cotizacion;
  const empresa = $('#f-tipo').value === 'empresa';
  $('#f-empresa').hidden = !empresa;
  $('#f-empresa').textContent = !empresa ? '' : r.empresa?.valida ? `✓ Empresa verificada en VIES${r.empresa.nombre ? ': ' + r.empresa.nombre : ''}. Precio sin IVA (inversión del sujeto pasivo).`
    : 'Empresas de otro país de la UE: con el n.º de IVA intracomunitario válido, el precio va sin IVA.';
  if (r.empresa?.valida && !$('#f-nombre').value && r.empresa.nombre) $('#f-nombre').value = r.empresa.nombre;
  if (r.empresa?.valida && !$('#f-dir').value && r.empresa.direccion) $('#f-dir').value = r.empresa.direccion;
  $('#campo-email').hidden = !!S.usuario;
  $('#cupon-campo').hidden = !!S.mejora || r.gratis;
  $('#cupon-estado').textContent = r.errorCupon || (r.cupon ? `✓ Cupón ${r.cupon.codigo} aplicado` : '');
  $('#medios-campo').hidden = r.gratis || !r.medios.length;
  if (!r.medios.find((m) => m.id === S.medio)) S.medio = r.medios[0]?.id || null;
  const NOMBRES = { stripe: 'Tarjeta, Apple Pay o Google Pay', paypal: 'PayPal', mercadopago: 'Mercado Pago', transfer: 'Transferencia bancaria' };
  $('#medios').replaceChildren(...r.medios.map((m) => radio('medio', m.id, S.medio === m.id, (v) => { S.medio = v; dibujarPago(); },
    el('strong', {}, NOMBRES[m.id] || m.id), el('div', { class: 'precio' }, m.antes ? el('span', { class: 'tachado' }, m.antes) : null, m.texto), m.iva ? el('small', {}, 'IVA incluido') : null)));
  const elegido = r.medios.find((m) => m.id === S.medio);
  const total = r.gratis ? ['Gratis'] : elegido ? [elegido.antes ? el('span', { class: 'tachado' }, elegido.antes) : null, elegido.texto] : [r.lista.texto];
  $('#total').replaceChildren(...total.filter(Boolean));
  $('#detalle').textContent = r.pedido.nombre;
  const p = $('#pagar');
  p.disabled = false;
  p.textContent = suelto() ? 'Personalizar' : r.gratis ? 'Crear la invitación' : S.medio === 'transfer' ? 'Ver datos para transferir' : 'Pagar';
  $('#sin-pagar').hidden = !S.usuario?.admin || r.gratis || suelto();
}

$('#pagar').addEventListener('click', async () => {
  if (suelto()) { const p = pedido(); empezar({ producto: p.producto, nombre: S.cotizacion?.pedido?.nombre || 'tu producto', nombres: {} }); return; }
  const email = $('#email').value.trim();
  if (!S.usuario && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { mensaje('Falta el mail para mandar el acceso.'); $('#email').focus(); return; }
  const b = $('#pagar');
  b.disabled = true; b.textContent = 'Un momento…';
  try {
    const factura = datosFactura();
    const r = await post('/api/tienda/comprar', { pedido: pedido(), mejora: S.mejora, email, medio: S.medio, moneda: S.moneda, cupon: S.cupon, factura });
    location.href = r.url;
  } catch (e) { mensaje(e.message); b.disabled = false; dibujarPago(); }
});
// Solo administradores: crea la invitación sin cobrar ni facturar, para probar
$('#sin-pagar').addEventListener('click', async () => {
  const b = $('#sin-pagar'); b.disabled = true;
  try {
    const r = await post('/api/tienda/comprar', { pedido: pedido(), mejora: S.mejora, medio: 'admin', moneda: S.moneda, sinPagar: true });
    location.href = r.url;
  } catch (e) { mensaje(e.message); b.disabled = false; }
});
$('#aplicar-cupon').addEventListener('click', () => { S.cupon = $('#cupon').value.trim(); cotizar(); });
$('#f-tipo').addEventListener('change', cotizar);
$('#f-id').addEventListener('change', cotizar);
$('#moneda').addEventListener('change', async (e) => { S.moneda = e.target.value; document.cookie = `cur=${S.moneda}; path=/; max-age=31536000; samesite=lax`; await cargar(); });

async function cargar() {
  const [c, cu] = await Promise.all([
    fetch(`/api/tienda/catalogo${S.moneda ? `?moneda=${S.moneda}` : ''}`).then((r) => r.json()),
    S.usuario === null ? fetch('/api/cuenta').then((r) => r.json()).catch(() => ({})) : Promise.resolve({ usuario: S.usuario }),
  ]);
  S.catalogo = c; S.moneda = c.moneda; S.usuario = cu.usuario || false;
  $('#moneda').replaceChildren(...c.monedas.map((m) => el('option', { value: m, selected: m === c.moneda }, m)));
  if (S.usuario) { const a = $('#link-cuenta'); a.textContent = 'Mis invitaciones'; a.href = '/mi-cuenta'; }
  if (S.mejora?.extra) {
    // Solo un adicional: no se elige paquete
    $('#titulo').textContent = 'Sumar un adicional';
    $('#bajada').textContent = 'Se activa en el panel apenas se acredita el pago. Todo lo cargado queda igual.';
    try { const r = await post('/api/tienda/mejora', { mejora: S.mejora, moneda: S.moneda }); S.mejoraActual = r.actual; S.paquete = r.actual; } catch (e) { mensaje(e.message); }
  } else if (S.mejora) {
    $('#titulo').textContent = 'Mejorar el paquete';
    $('#bajada').textContent = 'Se paga solo la diferencia. Todo lo cargado queda igual.';
    try {
      const r = await post('/api/tienda/mejora', { mejora: S.mejora, moneda: S.moneda });
      S.mejoraActual = r.actual; S.paquete = S.mejora.paquete;
      // Diferencia de precio para cada paquete superior
      S.difs = {};
      for (const p of ['basic', 'premium', 'deluxe']) {
        if (['gratis', 'basic', 'premium', 'deluxe'].indexOf(p) <= ['gratis', 'basic', 'premium', 'deluxe'].indexOf(r.actual)) continue;
        const x = await post('/api/tienda/mejora', { mejora: { ...S.mejora, paquete: p }, moneda: S.moneda });
        S.difs[p] = x.lista.texto;
      }
    } catch (e) { mensaje(e.message); }
  }
  actualizar();
}
// README (ronda 28): desde la página "crear invitación" del sitio llega con ?empezar=1 y lo elegido (modelo o
// producto, evento, nombres y fecha): se arma el borrador acá (mismo dominio que el panel) y se abre el panel
async function empezarDesdeLink() {
  document.body.classList.add('empezando');
  const d = { producto: q.get('producto') || 'invitacion', tipo: q.get('evento') || 'boda', modelo: q.get('modelo') || undefined, diseno: q.get('diseno') || undefined,
    nombres: { a: (q.get('a') || '').slice(0, 20), b: (q.get('b') || '').slice(0, 20) }, fecha: q.get('fecha') || '' };
  try {
    const r = await post('/api/tienda/empezar', d);
    try {
      const lista = JSON.parse(localStorage.getItem('ai-borradores') || '[]');
      lista.unshift({ id: r.id, clave: r.clave, nombres: [d.nombres.a, d.nombres.b].filter(Boolean).join(' & '), modelo: d.modelo || d.producto, tipo: d.tipo, t: Date.now() });
      localStorage.setItem('ai-borradores', JSON.stringify(lista.slice(0, 10)));
    } catch { /* sin almacenamiento */ }
    location.replace(r.panel);
  } catch (e) {
    document.body.classList.remove('empezando');
    mensaje(`${e.message}. Puedes elegir de nuevo aquí abajo.`);
    cargar();
  }
}
if (q.get('empezar')) empezarDesdeLink(); else cargar();


// ── Vista previa en un celular y "Personalizar" ───────────────────────
let elegido = null;
function verDemo(m) {
  elegido = m;
  $('#iframe-demo').src = `/demo/${m.id}?evento=${encodeURIComponent(S.tipo)}&paquete=deluxe`;
  $('#modal-vista').showModal();
}
$('#btn-personalizar-este').addEventListener('click', () => { $('#modal-vista').close(); empezar(elegido); });
function empezar(m) {
  elegido = m;
  const dos = (S.tipo || 'boda') === 'boda'; // Revelación de género: un solo campo ("Dani & Marce")
  $('#empezar-modelo').textContent = m.nombres[S.tipo] || m.nombre;
  const campo = (id, etiqueta, ph) => el('div', { class: 'campo' }, el('label', { for: id }, etiqueta), el('input', { type: 'text', id, maxlength: 15, required: true, placeholder: ph }));
  $('#campos-nombres').replaceChildren(...(dos ? [campo('emp-a', 'Nombre 1', 'Lau'), campo('emp-b', 'Nombre 2', 'Pablo')] : [campo('emp-a', 'Nombre', 'Sofi')]));
  $('#emp-error').hidden = true;
  $('#modal-empezar').showModal();
  setTimeout(() => $('#emp-a')?.focus(), 50);
}
$('#form-empezar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const b = $('#btn-empezar'); b.disabled = true; b.textContent = 'Un momento…';
  try {
    const r = await post('/api/tienda/empezar', { producto: elegido.producto || 'invitacion', tipo: S.tipo || 'boda', modelo: elegido.id, nombres: { a: $('#emp-a').value.trim(), b: $('#emp-b')?.value.trim() || '' }, fecha: $('#emp-fecha').value });
    try {
      const lista = JSON.parse(localStorage.getItem('ai-borradores') || '[]');
      lista.unshift({ id: r.id, clave: r.clave, nombres: [$('#emp-a').value, $('#emp-b')?.value].filter(Boolean).join(' & '), modelo: elegido.id, tipo: S.tipo, t: Date.now() });
      localStorage.setItem('ai-borradores', JSON.stringify(lista.slice(0, 10)));
    } catch { /* sin almacenamiento */ }
    location.href = r.panel;
  } catch (err) { $('#emp-error').textContent = err.message; $('#emp-error').hidden = false; b.disabled = false; b.textContent = 'Comenzar a personalizar'; }
});
document.querySelectorAll('dialog [data-cerrar]').forEach((x) => x.addEventListener('click', () => x.closest('dialog').close()));
document.querySelectorAll('dialog.modal-tienda').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

