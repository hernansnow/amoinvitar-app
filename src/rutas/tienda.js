// Tienda: el cliente elige, paga y le queda creado el evento con su panel.
//
//   GET  /api/tienda/catalogo?moneda=        modelos, paquetes, productos y extras con precios en su moneda
//   POST /api/tienda/cotizar                  total de un pedido y medios de pago disponibles
//   POST /api/tienda/comprar                  crea el pedido y devuelve a dónde ir a pagar
//   GET  /api/tienda/confirmar?orden=&session= al volver de la pasarela
//   POST /api/stripe/webhook · /api/mp/webhook  avisos de las pasarelas (por si cierran la pestaña)
//   POST /api/admin/pedidos/<id>/cobrado       marcar una transferencia como cobrada
//
// Los precios de lista están en euros (src/catalogo.js) y se cobran en la moneda del visitante.
import { json, readJson, isEmail, str, randomId, now, HttpError, getCookie, cookie, isSecureRequest } from '../lib/util.js';
import { CURRENCIES, currencyForCountry, getRates, priceIn, isZeroDecimal } from '../lib/fx.js';
import { formatMoney } from '../lib/dinero.js';
import { methodsFor, transferInfo, createMpPreference, findMpApproved, getMpPayment } from '../lib/pagos.js';
import { createCheckoutSession, retrieveCheckoutSession, verifyWebhook } from '../lib/stripe.js';
import { createPaypalOrder, capturePaypalOrder } from '../lib/paypal.js';
import { sendEmail, mailPedidoListo, mailTransferencia, mailAvisoInterno, mailFactura } from '../lib/email.js';
import { issueInvoice, invoiceUrl } from '../lib/facturas.js';
import { verifactuMode, sendPending } from '../lib/verifactu.js';
import { reverseChargeFor } from '../lib/vies.js';
import { usuarioActual, crearUsuario } from '../lib/auth.js';
import { almacenD1 } from '../almacen.js';
import { PAQUETES, PRODUCTOS, EXTRAS, NOMBRES_PAQUETE, RESUMEN_PAQUETES, MODELOS_GRATIS, precioPedido, comprable } from '../catalogo.js';
import { MODELOS, TIPOS_EVENTO, modelo as buscarModelo, nombreModelo, conEvento } from '../modelos.js';
import { varianteDePais } from '../textos/index.js';
import { planNecesario, complementos, NIVELES } from '../panel/esquemas.js';
import { ZONAS } from '../datos/zonas.js';

const ORDEN = ['gratis', 'basic', 'premium', 'deluxe'];
// index.js pasa cómo armar el esquema del panel (necesita los modelos de public/)
export const opcionesTienda = { esquemaDe: null, publicar: null };
const sitio = (env, request) => String(env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
const paisReal = (request) => request.cf?.country || request.headers.get('cf-ipcountry') || 'XX';
const COOKIE_PEDIDO = 'ai_p';

function monedaPedida(request, pedida) {
  if (CURRENCIES.includes(pedida)) return pedida;
  const c = String(getCookie(request, 'cur') || '').toUpperCase();
  return CURRENCIES.includes(c) ? c : currencyForCountry(paisReal(request));
}

// ── Qué se está comprando ────────────────────────────────────────────
// Devuelve el pedido validado y su nombre para mostrar
function validarPedido(p) {
  const producto = str(p?.producto, 30) || 'invitacion';
  if (!comprable(producto)) throw new HttpError(400, 'Ese producto se cotiza aparte. Escribirnos por WhatsApp o mail.');
  const extras = [...new Set([].concat(p.extras || []).filter((x) => EXTRAS[x]))];
  if (producto === 'invitacion') {
    const m = buscarModelo(p.modelo);
    const tipo = str(p.tipo, 20);
    if (!m || !m.eventos.includes(tipo)) throw new HttpError(400, 'Elegir un diseño disponible para ese evento');
    const paquete = ORDEN.includes(p.paquete) ? p.paquete : 'basic';
    if (paquete === 'gratis' && !(m.gratis || MODELOS_GRATIS.includes(m.id))) throw new HttpError(400, 'Ese diseño no tiene versión gratis');
    const tipoNombre = TIPOS_EVENTO.find((t) => t.id === tipo)?.nombre || tipo;
    return { producto, tipo, modelo: m.id, paquete, extras: paquete === 'gratis' ? [] : extras, nombre: `Invitación ${tipoNombre} · ${nombreModelo(m, tipo)} ${NOMBRES_PAQUETE[paquete]}` };
  }
  const tipo = producto === 'agradecimiento' ? (str(p.tipo, 20) || 'boda') : producto === 'compromiso-web' ? 'compromiso' : 'save-the-date';
  return { producto, tipo, modelo: null, paquete: 'basic', extras: extras.filter((e) => e === 'idioma'), nombre: PRODUCTOS[producto].nombre };
}

// ── Cupones ──────────────────────────────────────────────────────────
const normCodigo = (c) => str(c, 30).toUpperCase().replace(/[^A-Z0-9]/g, '');
async function buscarCupon(env, codigo, paquete) {
  if (!codigo) return null;
  const c = await env.DB.prepare('SELECT * FROM cupones WHERE codigo = ?').bind(normCodigo(codigo)).first();
  if (!c || !c.activo) throw new HttpError(400, 'El cupón no es válido');
  if (c.vence && c.vence < now()) throw new HttpError(400, 'El cupón está vencido');
  if (c.max_usos && c.usos >= c.max_usos) throw new HttpError(400, 'El cupón ya se usó todas las veces posibles');
  if (c.paquetes && !c.paquetes.split(',').includes(paquete)) throw new HttpError(400, `El cupón vale solo para ${c.paquetes.split(',').map((x) => NOMBRES_PAQUETE[x] || x).join(' / ')}`);
  return c;
}
function aplicarCupon(precio, c, rates) {
  if (!c || !precio.amount) return { ...precio, discount: 0 };
  const cero = isZeroDecimal(precio.currency);
  const redondo = (n) => (cero || precio.amount >= 1000 ? Math.round(n) : Math.round(n * 100) / 100);
  const off = c.clase === 'porcentaje' ? precio.amount * Math.min(100, Math.max(0, c.valor)) / 100
    : precio.currency === 'EUR' ? c.valor : c.valor / (rates.EUR || 0.92) * (rates[precio.currency] || 1);
  const amount = Math.max(0, redondo(precio.amount - off));
  const vat = precio.vatRate ? Math.round((amount - amount / (1 + precio.vatRate / 100)) * 100) / 100 : 0;
  return { ...precio, amount, vat, minor: cero ? Math.round(amount) : Math.round(amount * 100), discount: redondo(precio.amount - amount), before: precio.amount };
}

// Precio final de un importe en euros, en cada medio de pago disponible
async function opciones(env, request, { eur, clave, moneda, cupon, sinIva = false }) {
  const rates = await getRates(env);
  const pais = paisReal(request);
  const paisIva = sinIva ? null : pais; // empresa de la UE con IVA válido: sin IVA
  const medios = eur > 0 ? methodsFor(env, pais, moneda) : [];
  const conPrecio = medios.map((m) => {
    const pr = aplicarCupon(priceIn(clave, eur, m.currency, rates, paisIva, env), cupon, rates);
    return { id: m.id, moneda: m.currency, importe: pr.amount, texto: formatMoney(pr.amount, m.currency), iva: pr.vat, ivaTasa: pr.vatRate, antes: pr.before ? formatMoney(pr.before, m.currency) : null, minor: pr.minor };
  });
  const lista = priceIn(clave, eur, moneda, rates, paisIva, env);
  return { pais, rates, medios: conPrecio, lista: { importe: lista.amount, texto: formatMoney(lista.amount, moneda) } };
}

// ── Catálogo para la página de la tienda ─────────────────────────────
export async function catalogo(request, env) {
  const moneda = monedaPedida(request, new URL(request.url).searchParams.get('moneda'));
  const rates = await getRates(env);
  const pais = paisReal(request);
  const precio = (clave, eur) => { const p = priceIn(clave, eur, moneda, rates, pais, env); return { eur, importe: p.amount, texto: p.amount ? formatMoney(p.amount, moneda) : 'Gratis' }; };
  return json({
    pais, moneda, monedas: CURRENCIES,
    // Los tipos con grupo (revelación de género) se eligen dentro de su grupo (Baby Shower)
    tipos: TIPOS_EVENTO.filter((t) => !t.grupo),
    modelos: MODELOS.map((m) => ({ id: m.id, nombre: m.nombre, nombres: m.nombres || {},
      eventos: [...new Set([...m.eventos, ...TIPOS_EVENTO.filter((t) => t.grupo && m.eventos.includes(t.id)).map((t) => t.grupo)])],
      gratis: !!(m.gratis || MODELOS_GRATIS.includes(m.id)), dosNombres: m.eventos.includes('revelacion') })),
    paquetes: ORDEN.map((id) => ({ id, nombre: NOMBRES_PAQUETE[id], incluye: RESUMEN_PAQUETES[id], precio: precio(id, PAQUETES[id].precio) })),
    extras: Object.entries(EXTRAS).map(([id, e]) => ({ id, nombre: e.nombre, precio: precio(id, e.precio) })),
    productos: Object.entries(PRODUCTOS).map(([id, p]) => ({ id, nombre: p.nombre, manual: !!p.manual, precio: p.manual ? { texto: `desde ${formatMoney(priceIn(id, p.desde, moneda, rates, pais, env).amount, moneda)}` } : precio(id, p.precio) })),
  });
}

export async function cotizar(request, env) {
  const b = await readJson(request);
  // Invitación armada en el panel: lo que falta pagar del plan y los complementos
  const borrador = b.borrador ? await validarBorrador(env, request, b.borrador, { esquemaDe: opcionesTienda.esquemaDe }) : null;
  const pedido = borrador ? borrador.pedido : validarPedido(b.pedido);
  const eur = borrador ? borrador.eur : precioPedido(pedido);
  let cupon = null, errorCupon = null;
  try { cupon = await buscarCupon(env, b.cupon, pedido.paquete); } catch (e) { if (!(e instanceof HttpError)) throw e; errorCupon = e.message; }
  const rc = await inversion(env, request, b.factura);
  const o = await opciones(env, request, { eur, clave: pedido.paquete, moneda: monedaPedida(request, b.moneda), cupon, sinIva: !!rc });
  return json({ pedido, eur, gratis: eur === 0, medios: o.medios, lista: o.lista, cupon: cupon ? { codigo: cupon.codigo } : null, errorCupon,
    empresa: rc ? { valida: true, nombre: rc.name || '', direccion: rc.address || '' } : null });
}

// ── Comprar ──────────────────────────────────────────────────────────
async function siguienteNumero(env) {
  const r = await env.DB.prepare('SELECT MAX(numero) AS n FROM pedidos').first();
  return Math.max(1000, r?.n || 0) + 1;
}

export async function comprar(request, env) {
  const b = await readJson(request);
  const usuario = await usuarioActual(request, env);
  const email = (usuario?.email || str(b.email, 200)).toLowerCase();
  if (!isEmail(email)) throw new HttpError(400, 'Falta un mail válido para mandar el acceso');
  const borrador = b.borrador ? await validarBorrador(env, request, b.borrador, { esquemaDe: opcionesTienda.esquemaDe }) : null;
  const mejora = borrador || (b.mejora ? await validarMejora(env, request, b.mejora) : null);
  const pedido = mejora ? mejora.pedido : validarPedido(b.pedido);
  const eur = mejora ? mejora.eur : precioPedido(pedido);
  const cupon = await buscarCupon(env, b.cupon, pedido.paquete);
  const moneda = monedaPedida(request, b.moneda);
  const rc = await inversion(env, request, b.factura);
  const o = await opciones(env, request, { eur, clave: pedido.paquete, moneda, cupon, sinIva: !!rc });
  // Administradores: pueden crear cualquier invitación sin pagar, para probar (no genera factura)
  const sinPagar = !!(b.sinPagar && usuario?.esAdmin);
  const elegido = sinPagar ? null : o.medios.find((m) => m.id === b.medio) || o.medios[0];
  const total = elegido ? elegido.importe : 0;
  if (eur > 0 && !elegido && !sinPagar) throw new HttpError(503, 'No hay medios de pago disponibles en este momento');

  const id = randomId(10);
  const numero = await siguienteNumero(env);
  const medio = sinPagar ? 'admin' : total === 0 ? (eur === 0 ? 'gratis' : 'cupon') : elegido.id === 'transfer' ? 'transferencia' : elegido.id;
  const f = b.factura && typeof b.factura === 'object' ? b.factura : null;
  const factura = f && (f.nombre || f.id) ? {
    tipo: f.tipo === 'empresa' ? 'empresa' : 'particular',
    nombre: str(f.nombre, 120) || rc?.name || '', id: rc ? rc.vatId : str(f.id, 40).toUpperCase().replace(/\s+/g, ''), direccion: str(f.direccion, 300) || rc?.address || '',
  } : null;
  await env.DB.prepare(`INSERT INTO pedidos (id, numero, usuario_id, email, tipo, detalle, evento_id, medio, moneda, importe, iva, iva_tasa, eur, cupon, descuento, pais, factura, inversion, vies, creado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, numero, usuario?.id || null, email, borrador ? 'borrador' : mejora ? 'mejora' : 'nuevo', JSON.stringify({ ...pedido, pais: b.pais || null }), mejora?.evento.id || null, medio,
      elegido?.moneda || moneda, total, elegido?.iva || 0, elegido?.ivaTasa || 0, eur, cupon?.codigo || null, 0, paisReal(request), factura ? JSON.stringify(factura) : null,
      rc ? 1 : 0, rc ? (rc.consultation || 'VIES ' + new Date().toISOString().slice(0, 10)) : null, now()).run();

  const base = sitio(env, request);
  const gracias = `${base}/tienda/gracias?orden=${id}`;
  const marca = cookie(COOKIE_PEDIDO, id, { maxAge: 7 * 86400, secure: isSecureRequest(request) });
  const responder = (cuerpo) => json(cuerpo, 200, { 'set-cookie': marca });

  // Gratis o cupón del 100 %: se activa al instante
  if (total === 0) {
    await cumplirPedido(env, request, id);
    return responder({ url: gracias });
  }
  // Probando sin pasarelas configuradas: se da por pagado
  const conPasarela = { stripe: env.STRIPE_SECRET_KEY, mercadopago: env.MP_ACCESS_TOKEN, paypal: env.PAYPAL_CLIENT_ID }[medio];
  if (env.DEV_FAKE_PAYMENTS === '1' && medio !== 'transferencia' && !conPasarela) {
    await cumplirPedido(env, request, id);
    return responder({ url: gracias });
  }

  const titulo = `Amo Invitar · ${pedido.nombre} · #${numero}`;
  if (medio === 'stripe') {
    const s = await createCheckoutSession(env, {
      amount: elegido.minor, currency: elegido.moneda.toLowerCase(), productName: titulo, description: pedido.nombre, email,
      taxRate: elegido.ivaTasa ? env.STRIPE_TAX_RATE_ES : '', invoice: env.STRIPE_INVOICES === '1',
      successUrl: `${gracias}&session={CHECKOUT_SESSION_ID}`, cancelUrl: `${base}/tienda/?cancelado=${id}`,
      metadata: { order_id: id, numero: String(numero) },
    });
    await env.DB.prepare('UPDATE pedidos SET ref_externa = ? WHERE id = ?').bind(s.id, id).run();
    return responder({ url: s.url });
  }
  if (medio === 'mercadopago') {
    const pref = await createMpPreference(env, { title: titulo, amount: elegido.importe, currency: elegido.moneda, email, orderId: id,
      successUrl: gracias, failureUrl: `${base}/tienda/?cancelado=${id}`, notificationUrl: `${base}/api/mp/webhook` });
    await env.DB.prepare('UPDATE pedidos SET ref_externa = ? WHERE id = ?').bind(pref.id, id).run();
    return responder({ url: pref.init_point });
  }
  if (medio === 'paypal') {
    const pp = await createPaypalOrder(env, { orderId: id, title: titulo, amount: elegido.importe, currency: elegido.moneda, returnUrl: gracias, cancelUrl: `${base}/tienda/?cancelado=${id}` });
    await env.DB.prepare('UPDATE pedidos SET ref_externa = ? WHERE id = ?').bind(pp.id, id).run();
    return responder({ url: pp.approveUrl });
  }
  // Transferencia: el evento se crea ya (se puede ir cargando) y se publica cuando llega el pago
  const datos = transferInfo(env, elegido.moneda) || 'Escribirnos para recibir los datos de la cuenta.';
  const ev = mejora ? mejora.evento : await crearEventoDePedido(env, { ...(await leerPedido(env, id)) });
  const panel = `${base}/panel/${ev.id}?k=${ev.clave}`;
  try {
    await sendEmail(env, { to: email, ...mailTransferencia(env, { url: panel, producto: pedido.nombre, numero, importe: elegido.texto, datos }) });
    if (env.SUPPORT_EMAIL) await sendEmail(env, { to: env.SUPPORT_EMAIL, ...mailAvisoInterno(env, { asunto: `Transferencia pendiente #${numero} · ${elegido.texto}`, lineas: [`${email} eligió transferencia para ${pedido.nombre}.`, `Cuando llegue, marcar como cobrado: POST /api/admin/pedidos/${id}/cobrado`] }) });
  } catch (e) { console.error('[mail]', e); }
  return responder({ url: gracias });
}

async function leerPedido(env, id) {
  const p = await env.DB.prepare('SELECT * FROM pedidos WHERE id = ?').bind(id).first();
  return p && { ...p, detalle: JSON.parse(p.detalle) };
}

// Evento nuevo a partir de un pedido (con su usuario y su acceso)
async function crearEventoDePedido(env, p) {
  const almacen = almacenD1(env);
  if (p.evento_id) return almacen.evento(p.evento_id);
  const d = p.detalle;
  const usuario = await crearUsuario(env, p.email, { pais: p.pais });
  const ev = {
    id: `ev_${randomId(5)}`, producto: d.producto, tipo: d.tipo, modelo: d.modelo, paquete: d.paquete, aMedida: d.aMedida || null,
    estado: 'borrador', clave: randomId(16), empresaId: null, slug: null,
    datos: { variante: varianteDePais(d.pais || p.pais), acceso: { modo: 'abierta' }, extras: d.extras || [] },
  };
  await almacen.guardarEvento(ev);
  await almacen.darAcceso(ev.id, usuario.id, 'cliente');
  await env.DB.prepare('UPDATE pedidos SET evento_id = ?, usuario_id = COALESCE(usuario_id, ?) WHERE id = ?').bind(ev.id, usuario.id, p.id).run();
  return ev;
}

// Marca el pedido como cobrado, crea o mejora el evento y avisa. Se puede llamar varias veces.
export async function cumplirPedido(env, request, id) {
  const r = await env.DB.prepare("UPDATE pedidos SET estado = 'pagado', pagado = ? WHERE id = ? AND estado != 'pagado'").bind(now(), id).run();
  if (!r.meta.changes) return false;
  const p = await leerPedido(env, id);
  const almacen = almacenD1(env);
  let ev;
  if (p.tipo === 'borrador') {
    // La invitación ya existe: se le pone el plan pagado, los complementos y se publica
    ev = await almacen.evento(p.evento_id);
    const previo = NIVELES.indexOf(ev.paquete);
    if (NIVELES.indexOf(p.detalle.paquete) > previo) ev.paquete = p.detalle.paquete;
    ev.datos.extras = [...(ev.datos.extras || []), ...(p.detalle.extras || [])];
    const usuario = await crearUsuario(env, p.email, { pais: p.pais });
    await almacen.darAcceso(ev.id, usuario.id, 'cliente');
    await env.DB.prepare('UPDATE pedidos SET usuario_id = COALESCE(usuario_id, ?) WHERE id = ?').bind(usuario.id, p.id).run();
    await almacen.guardarEvento(ev);
    if (opcionesTienda.publicar) { try { await opcionesTienda.publicar(env, request, ev); } catch (e) { console.error('[publicar]', e); } }
  } else if (p.tipo === 'mejora') {
    ev = await almacen.evento(p.evento_id);
    ev.paquete = p.detalle.paquete;
    const previos = ev.datos.extras || [];
    ev.datos.extras = [...previos, ...(p.detalle.extras || []).filter((x) => x === 'idioma' || !previos.includes(x))];
    await almacen.guardarEvento(ev);
  } else {
    ev = await crearEventoDePedido(env, p);
  }
  if (p.cupon) await env.DB.prepare('UPDATE cupones SET usos = usos + 1 WHERE codigo = ?').bind(p.cupon).run();
  const base = sitio(env, request);
  // Factura automática (numerada, con huella VeriFactu) y su link para verla o descargarla en PDF
  try {
    const inv = await issueInvoice(env, ordenParaFactura(await leerPedido(env, id)));
    if (inv) await sendEmail(env, { to: p.email, ...mailFactura(env, { url: await invoiceUrl(env, base, inv), numero: inv.number, producto: p.detalle.nombre }) });
    if (verifactuMode(env)) await sendPending(env);
  } catch (e) { console.error('[factura]', e); }
  try {
    await sendEmail(env, { to: p.email, ...mailPedidoListo(env, { url: `${base}/panel/${ev.id}?k=${ev.clave}`, producto: p.detalle.nombre, numero: p.importe ? p.numero : null, gratis: ['gratis', 'admin'].includes(p.medio) }) });
    if (env.SUPPORT_EMAIL && p.importe) await sendEmail(env, { to: env.SUPPORT_EMAIL, ...mailAvisoInterno(env, { asunto: `Venta #${p.numero} · ${formatMoney(p.importe, p.moneda)}`, lineas: [`${p.email} · ${p.detalle.nombre} · ${p.medio}`] }) });
  } catch (e) { console.error('[mail]', e); }
  return true;
}

// El pedido con los nombres que usa el módulo de facturas (el mismo de Albunear)
function ordenParaFactura(p) {
  const f = p.factura ? JSON.parse(p.factura) : {};
  return {
    id: p.id, event_id: p.evento_id, user_id: p.usuario_id || '', email: p.email,
    amount: p.importe, vat: p.iva, vat_rate: p.iva_tasa, currency: p.moneda,
    method: p.medio === 'transferencia' ? 'transfer' : p.medio, country: p.pais,
    bill_type: f.tipo === 'empresa' ? 'company' : 'person', bill_name: f.nombre || null, bill_tax_id: f.id || null, bill_address: f.direccion || null,
    reverse_charge: p.inversion, vies_ref: p.vies,
    concept: `Invitaciones digitales Amo Invitar · ${p.detalle.nombre} · Pedido #${p.numero}`,
  };
}

// Empresa de otro país de la UE con su n.º de IVA válido en VIES → sin IVA (inversión del sujeto pasivo)
async function inversion(env, request, f) {
  if (!f || f.tipo !== 'empresa' || !f.id) return null;
  return reverseChargeFor(env, { type: 'company', taxId: str(f.id, 40) }, paisReal(request));
}

// ── Volver de la pasarela ────────────────────────────────────────────
export async function confirmar(request, env) {
  const url = new URL(request.url);
  const id = url.searchParams.get('orden') || '';
  let p = await leerPedido(env, id);
  if (!p) throw new HttpError(404, 'Pedido no encontrado');
  if (p.estado !== 'pagado') {
    const session = url.searchParams.get('session') || '';
    let ok = false;
    if (p.medio === 'stripe' && session.startsWith('cs_') && env.STRIPE_SECRET_KEY) {
      const s = await retrieveCheckoutSession(env, session);
      ok = s.metadata?.order_id === id && s.payment_status === 'paid';
    } else if (p.medio === 'paypal' && p.ref_externa && env.PAYPAL_CLIENT_ID) {
      ok = await capturePaypalOrder(env, p.ref_externa);
    } else if (p.medio === 'mercadopago' && env.MP_ACCESS_TOKEN) {
      ok = !!(await findMpApproved(env, id));
    }
    if (ok) await cumplirPedido(env, request, id);
    p = await leerPedido(env, id);
  }
  // El link directo al panel solo se muestra en el navegador que hizo la compra (o a su dueño logueado)
  const usuario = await usuarioActual(request, env);
  const mismo = getCookie(request, COOKIE_PEDIDO) === id || (usuario && usuario.id === p.usuario_id);
  const ev = p.evento_id ? await almacenD1(env).evento(p.evento_id) : null;
  return json({
    estado: p.estado, numero: p.numero, medio: p.medio, producto: p.detalle.nombre, email: p.email,
    importe: p.importe ? formatMoney(p.importe, p.moneda) : null,
    transferencia: p.medio === 'transferencia' && p.estado !== 'pagado' ? transferInfo(env, p.moneda) : null,
    panel: mismo && ev ? `/panel/${ev.id}?k=${ev.clave}` : null,
    link: p.tipo === 'borrador' && ev?.estado === 'publicado' ? `/${ev.tipo}/${ev.slug}` : null,
  });
}

// ── Avisos de las pasarelas ──────────────────────────────────────────
export async function webhookStripe(request, env) {
  const cuerpo = await request.text();
  if (!(await verifyWebhook(env, cuerpo, request.headers.get('stripe-signature')))) return new Response('Firma inválida', { status: 400 });
  const evt = JSON.parse(cuerpo);
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(evt.type)) {
    const s = evt.data.object;
    if (s.payment_status === 'paid' && s.metadata?.order_id) await cumplirPedido(env, request, s.metadata.order_id);
  }
  return json({ recibido: true });
}

// Mercado Pago avisa con el id del pago y se consulta a su API (así no se puede falsificar)
export async function webhookMp(request, env) {
  if (!env.MP_ACCESS_TOKEN) return json({ ok: true });
  const url = new URL(request.url);
  let b = {};
  try { b = await request.json(); } catch { /* viene por query */ }
  const tipo = b.type || url.searchParams.get('type') || url.searchParams.get('topic');
  const id = b.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id');
  if (tipo === 'payment' && id) {
    const pago = await getMpPayment(env, id);
    if (pago.status === 'approved' && pago.external_reference) await cumplirPedido(env, request, pago.external_reference);
  }
  return json({ ok: true });
}

// ── Mejorar el paquete de un evento ya comprado ──────────────────────
// Se paga la diferencia entre el paquete nuevo y el que tiene
async function validarMejora(env, request, m) {
  const ev = await almacenD1(env).evento(str(m.evento, 40));
  if (!ev) throw new HttpError(404, 'Evento no encontrado');
  const usuario = await usuarioActual(request, env);
  const clave = request.headers.get('x-clave') || str(m.clave, 64);
  const permitido = (clave && clave === ev.clave) || (usuario && await almacenD1(env).tieneAcceso(ev.id, usuario.id));
  if (!permitido) throw new HttpError(403, 'Sin permiso para este evento');
  const mod0 = buscarModelo(ev.modelo);
  // Un adicional suelto (colores, tipografía, otro idioma) para una invitación que ya existe
  if (m.extra) {
    const x = EXTRAS[m.extra];
    if (!x) throw new HttpError(400, 'Adicional desconocido');
    if (ev.paquete === 'gratis') throw new HttpError(400, 'Los adicionales no están disponibles en el plan gratis. Se puede pasar a Basic o superior.');
    if (m.extra !== 'idioma' && (ev.datos.extras || []).includes(m.extra)) throw new HttpError(400, 'Ese adicional ya está contratado');
    return { evento: ev, eur: x.precio, pedido: { producto: ev.producto, tipo: ev.tipo, modelo: ev.modelo, paquete: ev.paquete, extras: [m.extra],
      nombre: `${x.nombre}${mod0 ? ` · ${nombreModelo(mod0, ev.tipo)}` : ''}` } };
  }
  const nuevo = m.paquete;
  if (ORDEN.indexOf(nuevo) <= ORDEN.indexOf(ev.paquete)) throw new HttpError(400, 'Ese paquete no es superior al actual');
  const eur = PAQUETES[nuevo].precio - PAQUETES[ev.paquete].precio;
  const mod = buscarModelo(ev.modelo);
  return { evento: ev, eur, pedido: { producto: ev.producto, tipo: ev.tipo, modelo: ev.modelo, paquete: nuevo, extras: [], nombre: `Mejora a ${NOMBRES_PAQUETE[nuevo]}${mod ? ` · ${nombreModelo(mod, ev.tipo)}` : ''}` } };
}

export async function cotizarMejora(request, env) {
  const b = await readJson(request);
  const m = await validarMejora(env, request, b.mejora);
  const o = await opciones(env, request, { eur: m.eur, clave: m.pedido.paquete, moneda: monedaPedida(request, b.moneda), cupon: null });
  return json({ pedido: m.pedido, eur: m.eur, medios: o.medios, lista: o.lista, actual: m.evento.paquete });
}

// ── Admin: transferencia cobrada ─────────────────────────────────────
export async function marcarCobrado(request, env, id) {
  const u = await usuarioActual(request, env);
  const clave = request.headers.get('x-admin') || '';
  if (!(u?.esAdmin || (env.ADMIN_CLAVE && clave === env.ADMIN_CLAVE))) throw new HttpError(403, 'Sin permiso');
  const ok = await cumplirPedido(env, request, id);
  return json({ ok });
}


// ¿El evento tiene un pago pendiente? (no se publica hasta que llegue)
export async function pagoPendiente(env, eventoId) {
  return !!(await env.DB.prepare("SELECT 1 FROM pedidos WHERE evento_id = ? AND tipo = 'nuevo' AND estado = 'pendiente'").bind(eventoId).first());
}


// ══ Invitación armada antes de pagar ════════════════════════════════
// El cliente elige el modelo, carga sus nombres y la fecha y entra al panel sin pagar.
// El plan sale de las secciones que active; recién al publicar paga lo que corresponda.

const precioPaquete = (p) => (p === 'gratis' ? 0 : PAQUETES[p]?.precio || 0);

// Lo que pide el panel para mostrar el plan, los complementos y lo que falta pagar
export async function estadoPlan(env, request, ev, esquema) {
  const m = buscarModelo(ev.modelo);
  const gratisPosible = !!(m && (m.gratis || MODELOS_GRATIS.includes(m.id)));
  const necesario = planNecesario(esquema, ev.datos, { gratisPosible });
  const pagado = NIVELES.includes(ev.paquete) ? ev.paquete : null;
  // Lo pagado no se pierde: si apaga secciones, el plan queda en el que ya pagó
  const plan = pagado && NIVELES.indexOf(pagado) > NIVELES.indexOf(necesario) ? pagado : necesario;
  const elegidos = complementos(esquema, ev.datos);
  const yaPagados = [...(ev.datos.extras || [])];
  const extrasAPagar = elegidos.filter((x) => { const i = yaPagados.indexOf(x); if (i >= 0) { yaPagados.splice(i, 1); return false; } return true; });
  const eurPlan = Math.max(0, precioPaquete(plan) - (pagado ? precioPaquete(pagado) : 0));
  // Extras incluidos según el plan (la Save The Date en Premium y Deluxe)
  const precioExtra = (x) => (EXTRAS[x]?.gratisDesde && NIVELES.indexOf(plan) >= NIVELES.indexOf(EXTRAS[x].gratisDesde) ? 0 : EXTRAS[x]?.precio || 0);
  const eur = eurPlan + extrasAPagar.reduce((t, x) => t + precioExtra(x), 0);
  const moneda = monedaPedida(request);
  const rates = await getRates(env);
  const pais = paisReal(request);
  const texto = (clave, e) => (e ? formatMoney(priceIn(clave, e, moneda, rates, pais, env).amount, moneda) : 'Gratis');
  const secciones = esquema.pasos.filter((p) => p.seccion && !p.complemento && !p.obligatoria && seccionActivaDe(p, ev.datos)).map((p) => ({ id: p.id, titulo: p.titulo, nivel: p.nivel }));
  return {
    plan, nombre: NOMBRES_PAQUETE[plan], precio: texto(plan, precioPaquete(plan)), pagado, gratisPosible,
    complementos: elegidos.map((x) => ({ id: x, nombre: EXTRAS[x]?.nombre || x, precio: precioExtra(x) ? texto(x, precioExtra(x)) : `Incluida en ${NOMBRES_PAQUETE[plan]}`, pagado: !extrasAPagar.includes(x) })),
    aPagar: { eur, texto: texto(plan, eur), plan: eurPlan ? texto(plan, eurPlan) : null, extras: extrasAPagar },
    secciones,
    // Precio de cada tarjeta con este plan (para mostrarlo en los selectores del panel)
    preciosExtras: Object.fromEntries(['std-tarjeta', 'std-foto', 'agradecimiento', 'video-portada'].map((x) => [x, precioExtra(x) ? `+${texto(x, precioExtra(x))}` : formatMoney(0, moneda)])),
    // Primera vez: aunque sea gratis pasa por la "compra" (queda el mail de la cuenta y la factura si corresponde)
    activar: !pagado,
  };
}
const seccionActivaDe = (p, d) => (p.complemento ? d.secciones?.[p.seccion] === true : d.secciones?.[p.seccion] !== false);

// Pedido para el borrador: el plan y los complementos que faltan pagar
export async function validarBorrador(env, request, b, { esquemaDe }) {
  const ev = await almacenD1(env).evento(str(b.evento, 40));
  if (!ev) throw new HttpError(404, 'Invitación no encontrada');
  const usuario = await usuarioActual(request, env);
  const clave = str(b.clave, 64);
  const permitido = (clave && clave === ev.clave) || (usuario && (usuario.esAdmin || await almacenD1(env).tieneAcceso(ev.id, usuario.id)));
  if (!permitido) throw new HttpError(403, 'Sin permiso para esta invitación');
  const est = await estadoPlan(env, request, ev, await esquemaDe(ev));
  const m = buscarModelo(ev.modelo);
  const tipoNombre = TIPOS_EVENTO.find((t) => t.id === ev.tipo)?.nombre || ev.tipo;
  const extras = est.aPagar.extras.map((x) => EXTRAS[x]?.nombre || x);
  return {
    evento: ev, eur: est.aPagar.eur,
    pedido: { producto: ev.producto, tipo: ev.tipo, modelo: ev.modelo, paquete: est.plan, extras: est.aPagar.extras,
      nombre: `Invitación ${tipoNombre} · ${m ? nombreModelo(m, ev.tipo) : ev.modelo} ${NOMBRES_PAQUETE[est.plan]}${extras.length ? ` + ${extras.join(', ')}` : ''}` },
  };
}

// POST /api/tienda/empezar { tipo, modelo, nombres: {a, b}, fecha }
export async function empezar(request, env) {
  if (env.LIMITE_PIN) {
    const { success } = await env.LIMITE_PIN.limit({ key: `empezar:${request.headers.get('cf-connecting-ip') || ''}` });
    if (!success) throw new HttpError(429, 'Demasiados intentos. Probar en unos minutos.');
  }
  const b = await readJson(request);
  const m = buscarModelo(b.modelo);
  let tipo = str(b.tipo, 20);
  // Elegido dentro de un grupo (Baby Shower → Revelación de género): el tipo propio del diseño
  if (m && !m.eventos.includes(tipo)) tipo = TIPOS_EVENTO.find((t) => t.grupo === tipo && m.eventos.includes(t.id))?.id || tipo;
  if (!m || !m.eventos.includes(tipo)) throw new HttpError(400, 'Elegir un diseño disponible para ese evento');
  const a = str(b.nombres?.a, 15), bb = str(b.nombres?.b, 15);
  if (!a) throw new HttpError(400, 'Falta el nombre');
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(b.fecha || '') ? b.fecha : '';
  const pais = paisReal(request);
  // Zona horaria del visitante, si está en la lista
  const zona = ZONAS.some((z) => z.v === request.cf?.timezone) ? request.cf.timezone : (ZONAS.find((z) => z.v === 'Europe/Madrid')?.v || '');
  // Arranca con lo de Basic prendido; lo demás lo suma el cliente (y sube el plan)
  const modeloJson = conEvento(await env.ASSETS.fetch(new URL(`/modelos/${m.id}/modelo.json`, request.url)).then((r) => (r.ok ? r.json() : null)).catch(() => null), tipo);
  const basicas = new Set(modeloJson?.paquetes?.basic?.secciones || ['galeria', 'rsvp', 'dresscode', 'estilos']);
  const todas = new Set(Object.values(modeloJson?.paquetes || {}).flatMap((p) => p.secciones));
  const secciones = Object.fromEntries([...todas].map((x) => [x, basicas.has(x)]));
  const ev = {
    id: `ev_${randomId(5)}`, producto: 'invitacion', tipo, modelo: m.id, paquete: 'borrador', aMedida: null,
    estado: 'borrador', clave: randomId(16), empresaId: null, slug: null,
    datos: {
      variante: varianteDePais(pais), zonaHoraria: zona, acceso: { modo: 'abierta' }, extras: [], secciones,
      nombres: bb ? { a, b: bb } : { a }, celebracion: fecha ? { fecha, inicio: fecha } : {},
      planElegido: b.gratis && (m.gratis || MODELOS_GRATIS.includes(m.id)) ? 'gratis' : null,
    },
  };
  const almacen = almacenD1(env);
  await almacen.guardarEvento(ev);
  const usuario = await usuarioActual(request, env);
  if (usuario) await almacen.darAcceso(ev.id, usuario.id, 'cliente');
  // Sin cuenta: el navegador recuerda el borrador (al entrar con la cuenta se suma solo a "Mi cuenta")
  const previos = (getCookie(request, 'ai_bor') || '').split(',').filter((x) => /^ev_[a-z0-9]+:[a-z0-9]+$/i.test(x));
  const lista = [...new Set([`${ev.id}:${ev.clave}`, ...previos])].slice(0, 20).join(',');
  return json({ id: ev.id, clave: ev.clave, panel: `/panel/${ev.id}?k=${ev.clave}` }, 201,
    usuario ? {} : { 'set-cookie': cookie('ai_bor', lista, { maxAge: 365 * 86400, secure: isSecureRequest(request) }) });
}
