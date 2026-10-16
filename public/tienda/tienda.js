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
  mejora: q.get('mejorar') ? { evento: q.get('mejorar'), paquete: q.get('a') || 'premium' } : null,
};
try { const k = sessionStorage.getItem(`clave_${S.mejora?.evento}`); if (S.mejora && k) S.mejora.clave = k; } catch { /* sin almacenamiento */ }

function mensaje(t, error = true) { const m = $('#mensaje'); m.className = t ? `mensaje ${error ? 'error' : 'ok'}` : ''; m.textContent = t || ''; }

const PRODUCTOS_PRINCIPALES = [
  { id: 'invitacion', nombre: 'Invitación web', texto: 'Con confirmación de asistencia, mapas, música, fotos y más.' },
  { id: 'std', nombre: 'Save The Date', texto: 'Para avisar la fecha: web, tarjeta, foto o video.' },
  { id: 'agradecimiento', nombre: 'Tarjeta de agradecimiento', texto: 'Para después del evento.' },
  { id: 'compromiso-web', nombre: 'Invitación web simple', texto: 'Compromiso, pedida de mano, civil o party.' },
];
const OPCIONES_STD = ['std-web', 'std-web-medida', 'std-tarjeta', 'std-foto', 'std-tarjeta-medida', 'std-video'];

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

  $('#paso-evento').hidden = !(esInv || S.producto === 'agradecimiento') || !!S.mejora;
  $('#tipos').replaceChildren(...c.tipos.map((t) => radio('tipo', t.id, S.tipo === t.id, (v) => { S.tipo = v; if (S.modelo && !c.modelos.find((m) => m.id === S.modelo)?.eventos.includes(v)) S.modelo = null; actualizar(); }, t.nombre)));

  const modelos = c.modelos.filter((m) => !S.tipo || m.eventos.includes(S.tipo));
  $('#paso-modelo').hidden = !esInv || !S.tipo || !!S.mejora;
  $('#modelos').replaceChildren(...(modelos.length ? modelos.map((m) => radio('modelo', m.id, S.modelo === m.id, (v) => { S.modelo = v; actualizar(); },
    el('img', { class: 'modelo-img', src: `/modelos/${m.id}/miniatura.jpg`, alt: '', loading: 'lazy', style: 'width:100%;aspect-ratio:1200/630;object-fit:cover;border-radius:10px;margin-bottom:10px;display:block' }),
    el('strong', {}, m.nombres[S.tipo] || m.nombre, m.gratis ? el('span', { class: 'insignia', style: 'margin-left:6px' }, 'Gratis') : null),
    el('a', { href: `/demo/${m.id}?evento=${S.tipo}`, target: '_blank', rel: 'noopener', onclick: (e) => e.stopPropagation() }, 'Ver demo ↗'))) : [el('p', { class: 'vacio' }, 'Pronto habrá diseños para este evento.')]));

  $('#paso-std').hidden = S.producto !== 'std';
  $('#std').replaceChildren(...OPCIONES_STD.map((id) => {
    const p = c.productos.find((x) => x.id === id);
    if (p.manual) return el('div', { class: 'opcion' }, el('strong', {}, p.nombre), el('div', { class: 'precio' }, p.precio.texto), el('a', { href: 'https://amoinvitar.com/contacto', target: '_blank', rel: 'noopener' }, 'Pedir cotización'));
    return radio('std', id, S.std === id, (v) => { S.std = v; actualizar(); }, el('strong', {}, p.nombre.replace('Save The Date · ', '').replace('Save The Date ', '')), el('div', { class: 'precio' }, p.precio.texto));
  }));

  const modelo = c.modelos.find((m) => m.id === S.modelo);
  const mejoraDesde = S.mejoraActual ? ['gratis', 'basic', 'premium', 'deluxe'].indexOf(S.mejoraActual) : -1;
  const paquetes = c.paquetes.filter((p) => (S.mejora ? ['gratis', 'basic', 'premium', 'deluxe'].indexOf(p.id) > mejoraDesde : p.id !== 'gratis' || modelo?.gratis));
  $('#paso-paquete').hidden = !(S.mejora || (esInv && S.modelo));
  $('#paquetes').replaceChildren(...paquetes.map((p) => radio('paquete', p.id, S.paquete === p.id, (v) => { S.paquete = v; if (S.mejora) S.mejora.paquete = v; actualizar(); },
    el('strong', {}, p.nombre), el('div', { class: 'precio' }, S.mejora ? `+ ${S.difs?.[p.id] || ''}` : p.precio.texto), el('ul', {}, p.incluye.map((x) => el('li', {}, x))))));

  const conExtras = !S.mejora && ((esInv && S.paquete && S.paquete !== 'gratis') || (S.producto && !esInv && S.producto !== 'std') || (S.producto === 'std' && S.std));
  $('#paso-extras').hidden = !conExtras;
  const extras = esInv ? c.extras : c.extras.filter((x) => x.id === 'idioma');
  $('#extras').replaceChildren(...extras.map((x) => el('label', { class: 'opcion extra' },
    el('input', { type: 'checkbox', checked: S.extras.has(x.id), onchange: (e) => { e.target.checked ? S.extras.add(x.id) : S.extras.delete(x.id); cotizar(); } }),
    el('span', {}, x.nombre), el('span', { class: 'precio' }, `+ ${x.precio.texto}`))));
}

function pedido() {
  if (S.producto === 'invitacion') return { producto: 'invitacion', tipo: S.tipo, modelo: S.modelo, paquete: S.paquete, extras: [...S.extras] };
  if (S.producto === 'std') return S.std ? { producto: S.std, extras: [...S.extras] } : null;
  if (S.producto) return { producto: S.producto, tipo: S.tipo, extras: [...S.extras] };
  return null;
}
const listo = () => S.mejora ? !!S.mejora.paquete : S.producto === 'invitacion' ? !!(S.tipo && S.modelo && S.paquete) : S.producto === 'std' ? !!S.std : S.producto === 'agradecimiento' ? !!S.tipo : !!S.producto;

let t = null;
function actualizar() { dibujar(); cotizar(); }
function cotizar() {
  clearTimeout(t);
  $('#resumen').hidden = !listo();
  $('#paso-pago').hidden = !listo();
  if (!listo()) return;
  t = setTimeout(async () => {
    try {
      const r = S.mejora
        ? await post('/api/tienda/mejora', { mejora: S.mejora, moneda: S.moneda })
        : await post('/api/tienda/cotizar', { pedido: pedido(), moneda: S.moneda, cupon: S.cupon });
      S.cotizacion = r;
      mensaje('');
      dibujarPago();
    } catch (e) { mensaje(e.message); }
  }, 150);
}

function dibujarPago() {
  const r = S.cotizacion;
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
  p.textContent = r.gratis ? 'Crear la invitación' : S.medio === 'transfer' ? 'Ver datos para transferir' : 'Pagar';
}

$('#pagar').addEventListener('click', async () => {
  const email = $('#email').value.trim();
  if (!S.usuario && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { mensaje('Falta el mail para mandar el acceso.'); $('#email').focus(); return; }
  const b = $('#pagar');
  b.disabled = true; b.textContent = 'Un momento…';
  try {
    const factura = $('#f-nombre').value || $('#f-id').value ? { nombre: $('#f-nombre').value, id: $('#f-id').value, direccion: $('#f-dir').value } : null;
    const r = await post('/api/tienda/comprar', { pedido: pedido(), mejora: S.mejora, email, medio: S.medio, moneda: S.moneda, cupon: S.cupon, factura });
    location.href = r.url;
  } catch (e) { mensaje(e.message); b.disabled = false; dibujarPago(); }
});
$('#aplicar-cupon').addEventListener('click', () => { S.cupon = $('#cupon').value.trim(); cotizar(); });
$('#moneda').addEventListener('change', async (e) => { S.moneda = e.target.value; document.cookie = `cur=${S.moneda}; path=/; max-age=31536000; samesite=lax`; await cargar(); });

async function cargar() {
  const [c, cu] = await Promise.all([
    fetch(`/api/tienda/catalogo${S.moneda ? `?moneda=${S.moneda}` : ''}`).then((r) => r.json()),
    S.usuario === null ? fetch('/api/cuenta').then((r) => r.json()).catch(() => ({})) : Promise.resolve({ usuario: S.usuario }),
  ]);
  S.catalogo = c; S.moneda = c.moneda; S.usuario = cu.usuario || false;
  $('#moneda').replaceChildren(...c.monedas.map((m) => el('option', { value: m, selected: m === c.moneda }, m)));
  if (S.usuario) { const a = $('#link-cuenta'); a.textContent = 'Mis invitaciones'; a.href = '/mi-cuenta'; }
  if (S.mejora) {
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
cargar();
