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
import { CURRENCIES, currencyForCountry, getRates, priceIn, isZeroDecimal, promoPara, promosVigentes, categoriaDeTipo, PLANES_PROMO, cargarConfig, paisFiscal, convertirSimple } from '../lib/fx.js';
import { formatMoney } from '../lib/dinero.js';
import { methodsFor, transferInfo, createMpPreference, findMpApproved, getMpPayment } from '../lib/pagos.js';
import { createCheckoutSession, retrieveCheckoutSession, verifyWebhook } from '../lib/stripe.js';
import { createPaypalOrder, capturePaypalOrder } from '../lib/paypal.js';
import { sendEmail, mailPedidoListo, mailRecuerdoListo, mailTransferencia, mailAvisoInterno, mailFactura } from '../lib/email.js';
import { issueInvoice, invoiceUrl } from '../lib/facturas.js';
import { verifactuMode, sendPending } from '../lib/verifactu.js';
import { reverseChargeFor } from '../lib/vies.js';
import { pagarCompra } from '../pro/compras.js';
import { usuarioActual, crearUsuario } from '../lib/auth.js';
import { almacenD1 } from '../almacen.js';
import { RECUERDO, PAQUETES, PRODUCTOS, EXTRAS, NOMBRES_PAQUETE, RESUMEN_PAQUETES, MODELOS_GRATIS, A_MEDIDA, PROFESIONALES, precioPedido, comprable } from '../catalogo.js';
import { MODELOS, TIPOS_EVENTO, CON_TARJETA_STD, modelo as buscarModelo, nombreModelo, conEvento } from '../modelos.js';
import { varianteDePais } from '../textos/index.js';
import { varianteVisitante, bautizoVisitante } from '../sitio/visitante.js';
import { diceBautizo } from '../sitio/variantes.js';
import { planNecesario, complementos, NIVELES } from '../panel/esquemas.js';
import { ZONAS } from '../datos/zonas.js';

const ORDEN = ['gratis', 'basic', 'premium', 'deluxe'];
// index.js pasa cómo armar el esquema del panel (necesita los modelos de public/)
export const opcionesTienda = { esquemaDe: null, publicar: null };
const sitio = (env, request) => String(env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
const paisIp = (request) => request.cf?.country || request.headers.get('cf-ipcountry') || 'XX';
const paisReal = paisIp;
// País para el IVA y los descuentos: el de la IP y el de facturación (si es distinto, manda el que menos descuenta o el europeo)
const paisDe = (request, b) => paisFiscal(paisIp(request), b?.paisFact || b?.factura?.pais);
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
  // Invitación web simple y Save The Date web: arrancan con un diseño (Compromiso, Web Classic); en el panel se cambia
  // por otro (Civil, Pedida, Party de 15; Web Soft, o la de 15)
  const simple = { 'compromiso-web': 'compromiso', 'std-web': 'std-classic' }[producto];
  const tipoValido = TIPOS_EVENTO.some((t) => t.id === p.tipo) ? p.tipo : 'boda';
  if (!disponibleSuelto(producto, tipoValido)) throw new HttpError(400, 'Esta opción no está disponible para ese tipo de evento');
  const tipo = producto === 'agradecimiento' || producto === 'std-tarjeta' || (producto === 'std-foto' && ['bautismo', 'comunion', 'cumple'].includes(tipoValido)) ? tipoValido : simple ? (['boda', '15'].includes(p.tipo) ? p.tipo : 'boda') : 'save-the-date';
  // La tarjeta Save The Date es la de un modelo: arranca con el primero que la tiene para ese evento
  const modelo = producto === 'std-tarjeta' ? (MODELOS.find((m) => CON_TARJETA_STD.has(m.id) && m.eventos.includes(tipo))?.id || 'garden')
    : simple && producto === 'compromiso-web' && tipo === '15' ? 'party' : simple || null;
  return { producto, tipo, modelo, paquete: 'basic', extras: extras.filter((e) => e === 'idioma'), nombre: PRODUCTOS[producto].nombre };
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
// README (ronda 36): promoción automática (admin → Precios y promos): solo invitaciones web con plan de pago, por país, categoría y plan
export async function promoDe(env, request, pedido, pais) {
  await cargarConfig(env);
  if (!pedido || pedido.producto !== 'invitacion') return null;
  return promoPara({ pais: pais || paisReal(request), plan: pedido.paquete, categoria: categoriaDeTipo(pedido.tipo) });
}
async function opciones(env, request, { eur, clave, moneda, cupon, promo = null, sinIva = false, pais = paisReal(request) }) {
  const rates = await getRates(env);
  // Empresa de la UE con IVA válido: sin IVA
  const medios = eur > 0 ? methodsFor(env, pais, moneda) : [];
  const conPrecio = medios.map((m) => {
    const lista0 = priceIn(clave, eur, m.currency, rates, pais, env, { sinIva });
    const conPromo = promo ? aplicarCupon(lista0, { clase: 'porcentaje', valor: promo.porcentaje }, rates) : lista0;
    const pr = aplicarCupon(conPromo, cupon, rates);
    return { id: m.id, moneda: m.currency, importe: pr.amount, texto: formatMoney(pr.amount, m.currency), iva: pr.vat, ivaTasa: pr.vatRate, antes: lista0.amount && pr.amount < lista0.amount ? formatMoney(lista0.amount, m.currency) : null, minor: pr.minor };
  });
  const lista = priceIn(clave, eur, moneda, rates, pais, env, { sinIva });
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
    // README (ronda 33): los medios de pago reales para este país y esta moneda (la web los usa para su texto y sus logos)
    medios: methodsFor(env, pais, moneda).map((m) => ({ id: m.id, moneda: m.currency })),
    // Los tipos con grupo (revelación de género) se eligen dentro de su grupo (Baby Shower)
    tipos: TIPOS_EVENTO.filter((t) => !t.grupo),
    // Los modelos simples y las Save The Date web se compran como producto (Invitación web simple, Save The Date web)
    modelos: MODELOS.filter((m) => !m.simple && !m.std).map((m) => ({ id: m.id, nombre: m.nombre, nombres: m.nombres || {},
      eventos: [...new Set([...m.eventos, ...TIPOS_EVENTO.filter((t) => t.grupo && m.eventos.includes(t.id)).map((t) => t.grupo)])],
      gratis: !!(m.gratis || MODELOS_GRATIS.includes(m.id)), dosNombres: m.eventos.includes('revelacion'), propios: m.eventos })),
    // README (ronda 41): precios de profesionales en la moneda del visitante (sin IVA ni descuento por país). Clave: el importe en euros
    pro: Object.fromEntries([PROFESIONALES.credito, PROFESIONALES.pro.pase, PROFESIONALES.studio.pase, PROFESIONALES.studio.configuracionDominio,
      ...PROFESIONALES.pro.packs.flatMap((k) => [k.precio, k.precio / k.creditos]), ...PROFESIONALES.studio.packs.flatMap((k) => [k.precio, k.precio / k.creditos]),
    ].filter((v) => v > 0).map((v) => [String(v), formatMoney(convertirSimple(v, moneda, rates), moneda)])),
    paquetes: ORDEN.map((id) => ({ id, nombre: NOMBRES_PAQUETE[id], incluye: RESUMEN_PAQUETES[id], precio: precio(id, PAQUETES[id].precio) })),
    extras: Object.entries(EXTRAS).map(([id, e]) => ({ id, nombre: e.nombre, precio: precio(id, e.precio) })),
    productos: Object.entries(PRODUCTOS).map(([id, p]) => ({ id, nombre: p.nombre, manual: !!p.manual, precio: p.manual ? { texto: `desde ${formatMoney(priceIn(id, p.desde, moneda, rates, pais, env).amount, moneda)}` } : precio(id, p.precio) })),
    // README (ronda 28): la página "crear invitación" del sitio arma sus pestañas con esto (Adicional y Save The Date)
    simples: MODELOS.filter((m) => m.simple).map((m) => ({ id: m.id, nombre: m.nombre, eventos: m.eventos })),
    stdWeb: MODELOS.filter((m) => m.std).map((m) => ({ id: m.id, nombre: m.nombre, eventos: m.eventos })),
    tarjetaStd: [...CON_TARJETA_STD],
    aMedida: precio('a-medida', A_MEDIDA.personalizado.premium),
    // Promociones vigentes en este país: cada una con el precio de cada plan ya descontado (la web tacha el precio de lista)
    promos: promosVigentes(pais).map((p) => ({ id: p.id, nombre: p.nombre, porcentaje: p.porcentaje, categorias: p.categorias || [], planes: p.planes?.length ? p.planes : PLANES_PROMO,
      precios: Object.fromEntries(PLANES_PROMO.filter((k) => !p.planes?.length || p.planes.includes(k)).map((k) => { const l = priceIn(k, PAQUETES[k].precio, moneda, rates, pais, env); const d = aplicarCupon(l, { clase: 'porcentaje', valor: p.porcentaje }, rates); return [k, { antes: formatMoney(l.amount, moneda), texto: formatMoney(d.amount, moneda) }]; })) })),
  }, 200, origenSitio(request));
}

// El sitio (amoinvitar.com y sus copias de prueba) lee el catálogo público desde el navegador
function origenSitio(request) {
  const o = request.headers.get('origin') || '';
  return /^https:\/\/([a-z0-9-]+\.)*amoinvitar\.com$/.test(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) ? { 'access-control-allow-origin': o, vary: 'origin' } : {};
}

export async function cotizar(request, env) {
  const b = await readJson(request);
  // Invitación armada en el panel: lo que falta pagar del plan y los complementos
  const borrador = b.borrador ? await validarBorrador(env, request, b.borrador, { esquemaDe: opcionesTienda.esquemaDe }) : null;
  const rec = !borrador && b.recuerdo ? await validarRecuerdo(env, request, b.recuerdo) : null;
  const pedido = borrador ? borrador.pedido : rec ? rec.pedido : validarPedido(b.pedido);
  const eur = borrador ? borrador.eur : rec ? rec.eur : precioPedido(pedido);
  let cupon = null, errorCupon = null;
  try { cupon = await buscarCupon(env, b.cupon, pedido.paquete); } catch (e) { if (!(e instanceof HttpError)) throw e; errorCupon = e.message; }
  const rc = await inversion(env, request, b.factura);
  const pais = paisDe(request, b);
  const promo = await promoDe(env, request, pedido, pais);
  const o = await opciones(env, request, { eur, clave: pedido.paquete, moneda: monedaPedida(request, b.moneda), cupon, promo, sinIva: !!rc, pais });
  return json({ pais, paisIp: paisIp(request), pedido, eur, gratis: eur === 0, medios: o.medios, lista: o.lista, cupon: cupon ? { codigo: cupon.codigo } : null, promo: promo ? { nombre: promo.nombre, porcentaje: promo.porcentaje } : null, errorCupon,
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
  const rec = !borrador && b.recuerdo ? await validarRecuerdo(env, request, b.recuerdo) : null;
  const mejora = borrador || rec || (b.mejora ? await validarMejora(env, request, b.mejora) : null);
  const pedido = mejora ? mejora.pedido : validarPedido(b.pedido);
  const eur = mejora ? mejora.eur : precioPedido(pedido);
  const cupon = await buscarCupon(env, b.cupon, pedido.paquete);
  const moneda = monedaPedida(request, b.moneda);
  const rc = await inversion(env, request, b.factura);
  const pais = paisDe(request, b);
  const promo = await promoDe(env, request, pedido, pais);
  const o = await opciones(env, request, { eur, clave: pedido.paquete, moneda, cupon, promo, sinIva: !!rc, pais });
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
    .bind(id, numero, usuario?.id || null, email, borrador ? 'borrador' : rec ? 'recuerdo' : mejora ? 'mejora' : 'nuevo', JSON.stringify({ ...pedido, pais: b.pais || null }), mejora?.evento.id || null, medio,
      elegido?.moneda || moneda, total, elegido?.iva || 0, elegido?.ivaTasa || 0, eur, cupon?.codigo || null, 0, pais, factura ? JSON.stringify(factura) : null,
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
    datos: { variante: d.variante || varianteDePais(d.pais || p.pais), acceso: { modo: 'abierta' }, extras: d.extras || [], ...(d.tipo === 'bautismo' && diceBautizo(d.pais || p.pais) ? { bautizo: true } : {}) },
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
  } else if (p.tipo === 'recuerdo') {
    // README (ronda 36): se anota lo comprado; la permanencia ilimitada corre el vencimiento a 2099
    ev = await almacen.evento(p.evento_id);
    const op = p.detalle.recuerdo;
    ev.datos.recuerdo = { ...(ev.datos.recuerdo || {}), [op]: new Date().toISOString() };
    if (op === 'online') ev.vence = '2099-12-31T23:59:59.000Z';
    await almacen.guardarEvento(ev);
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
    if (p.tipo === 'recuerdo') await sendEmail(env, { to: p.email, ...mailRecuerdoListo(env, { url: `${base}/panel/${ev.id}?k=${ev.clave}#recuerdo`, producto: p.detalle.nombre, numero: p.importe ? p.numero : null }) });
    else await sendEmail(env, { to: p.email, ...mailPedidoListo(env, { url: `${base}/panel/${ev.id}?k=${ev.clave}`, producto: p.detalle.nombre, numero: p.importe ? p.numero : null, gratis: ['gratis', 'admin'].includes(p.medio) }) });
    if (env.SUPPORT_EMAIL && p.importe) await sendEmail(env, { to: env.SUPPORT_EMAIL, ...mailAvisoInterno(env, { asunto: `Venta #${p.numero} · ${formatMoney(p.importe, p.moneda)}`, lineas: [`${p.email} · ${p.detalle.nombre} · ${p.medio}`] }) });
  } catch (e) { console.error('[mail]', e); }
  return true;
}

// El pedido con los nombres que usa el módulo de facturas (el mismo de Albunear)
export function ordenParaFactura(p) {
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
    panel: mismo && ev ? `/panel/${ev.id}?k=${ev.clave}${p.tipo === 'recuerdo' ? '#recuerdo' : ''}` : null,
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
    if (s.payment_status === 'paid' && s.metadata?.compra_pro) await pagarCompra(env, s.metadata.compra_pro, { medio: 'stripe', base: sitio(env, request) });
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
    if (pago.status === 'approved' && String(pago.external_reference || '').startsWith('cp_')) await pagarCompra(env, pago.external_reference, { medio: 'mercadopago', base: sitio(env, request) });
    else if (pago.status === 'approved' && pago.external_reference) await cumplirPedido(env, request, pago.external_reference);
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

// ── Recuerdo (README ronda 36): PDF, página para descargar o permanencia online ilimitada ──
async function validarRecuerdo(env, request, m) {
  const ev = await almacenD1(env).evento(str(m.evento, 40));
  if (!ev) throw new HttpError(404, 'Evento no encontrado');
  const usuario = await usuarioActual(request, env);
  const clave = request.headers.get('x-clave') || str(m.clave, 64);
  const permitido = (clave && clave === ev.clave) || (usuario && await almacenD1(env).tieneAcceso(ev.id, usuario.id));
  if (!permitido) throw new HttpError(403, 'Sin permiso para este evento');
  if (ev.empresaId) throw new HttpError(400, 'Esta opción no está disponible para eventos de una empresa');
  const op = str(m.opcion, 10), o = RECUERDO[op];
  if (!o) throw new HttpError(400, 'Opción desconocida');
  if (ev.estado !== 'publicado') throw new HttpError(400, 'La invitación tiene que estar publicada');
  if (op === 'online' ? String(ev.vence || '') >= '2090' : ev.datos?.recuerdo?.[op]) throw new HttpError(400, 'Ya tienes esta opción');
  return { evento: ev, eur: o.precio, pedido: { producto: 'recuerdo', tipo: ev.tipo, modelo: ev.modelo, paquete: `recuerdo-${op}`, recuerdo: op, extras: [], nombre: `${o.nombre} · ${[ev.datos?.nombres?.a, ev.datos?.nombres?.b].filter(Boolean).join(' & ') || 'invitación'}` } };
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


// Un precio en euros, en la moneda del visitante (para mostrarlo en el panel)
export async function precioATexto(env, request, clave, eur) {
  const moneda = monedaPedida(request);
  return formatMoney(priceIn(clave, eur, moneda, await getRates(env), paisReal(request), env).amount, moneda);
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
  if (ev.producto !== 'invitacion') return estadoProducto(env, request, ev, esquema);
  const m = buscarModelo(ev.modelo);
  const gratisPosible = !!(m && (m.gratis || MODELOS_GRATIS.includes(m.id)));
  const necesario = planNecesario(esquema, ev.datos, { gratisPosible });
  const pagado = NIVELES.includes(ev.paquete) ? ev.paquete : null;
  // Lo pagado no se pierde: si apaga secciones, el plan queda en el que ya pagó
  const plan = pagado && NIVELES.indexOf(pagado) > NIVELES.indexOf(necesario) ? pagado : necesario;
  const elegidos = complementos(esquema, ev.datos);
  // Antes colores y tipografía se pagaban aparte: cualquiera de los dos ya cubre el cambio de diseño
  const yaPagados = (ev.datos.extras || []).map((x) => (x === 'paleta' || x === 'tipografia' ? 'diseno' : x));
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
    preciosExtras: Object.fromEntries(['std-tarjeta', 'std-foto', 'std-web', 'std-tarjeta-medida', 'std-web-medida', 'agradecimiento', 'video-portada', 'idioma', 'diseno'].map((x) => [x, precioExtra(x) ? `+${texto(x, precioExtra(x))}` : formatMoney(0, moneda)])),
    // Primera vez: aunque sea gratis pasa por la "compra" (queda el mail de la cuenta y la factura si corresponde)
    activar: !pagado,
  };
}
const seccionActivaDe = (p, d) => (p.complemento ? d.secciones?.[p.seccion] === true : d.secciones?.[p.seccion] !== false);

// Productos sueltos (Save The Date, agradecimiento, web simple) y diseño a medida: el precio del producto y, en el
// diseño a medida, sus complementos. Se paga al final (al generar la tarjeta u obtener el link)
async function estadoProducto(env, request, ev, esquema) {
  const medida = ev.producto === 'a-medida';
  // README (ronda 29): las Save The Date a medida también pasan por el equipo de diseño antes del pago
  const enviable = medida || ['std-tarjeta-medida', 'std-web-medida'].includes(ev.producto);
  const clave = medida ? (ev.aMedida || 'personalizado') : ev.producto;
  const base = medida ? (A_MEDIDA[clave]?.deluxe || 0) : (PRODUCTOS[ev.producto]?.precio || 0);
  const pagado = ev.paquete !== 'borrador';
  const elegidos = medida ? complementos(esquema, ev.datos).filter((x) => EXTRAS[x]) : [];
  const ya = ev.datos.extras || [];
  const extrasAPagar = elegidos.filter((x) => !ya.includes(x));
  const eur = (pagado ? 0 : base) + extrasAPagar.reduce((t, x) => t + (EXTRAS[x]?.precio || 0), 0);
  const moneda = monedaPedida(request), rates = await getRates(env), pais = paisReal(request);
  const texto = (k, e) => (e ? formatMoney(priceIn(k, e, moneda, rates, pais, env).amount, moneda) : 'Gratis');
  const nombre = medida ? (clave === 'empresarial' ? 'Invitación para empresas' : 'Invitación con diseño a medida') : ev.producto === 'compromiso-web' ? 'Plan simple' : (PRODUCTOS[ev.producto]?.nombre || ev.producto);
  return {
    producto: true, plan: medida ? 'deluxe' : 'basic', nombre, precio: texto(clave, base), pagado: pagado ? (medida ? 'deluxe' : 'basic') : null, gratisPosible: false,
    complementos: elegidos.map((x) => ({ id: x, nombre: EXTRAS[x]?.nombre || x, precio: texto(x, EXTRAS[x]?.precio || 0), pagado: !extrasAPagar.includes(x) })),
    aPagar: { eur, texto: texto(clave, eur), plan: pagado ? null : texto(clave, base), extras: extrasAPagar },
    secciones: [],
    preciosExtras: Object.fromEntries(['std-tarjeta-medida', 'std-web-medida', 'idioma'].map((x) => [x, `+${texto(x, EXTRAS[x]?.precio || 0)}`])),
    activar: !pagado,
    // Diseño a medida: primero lo aprueba el equipo; recién ahí se paga
    ...(enviable ? { medida: { enviado: !!ev.datos.medida?.enviado, aprobado: !!ev.datos.medida?.aprobado, listo: !!ev.datos.medida?.listo } } : {}),
  };
}

// Pedido para el borrador: el plan y los complementos que faltan pagar
export async function validarBorrador(env, request, b, { esquemaDe }) {
  const ev = await almacenD1(env).evento(str(b.evento, 40));
  if (!ev) throw new HttpError(404, 'Invitación no encontrada');
  const usuario = await usuarioActual(request, env);
  const clave = str(b.clave, 64);
  const permitido = (clave && clave === ev.clave) || (usuario && (usuario.esAdmin || await almacenD1(env).tieneAcceso(ev.id, usuario.id)));
  if (!permitido) throw new HttpError(403, 'Sin permiso para esta invitación');
  const est = await estadoPlan(env, request, ev, await esquemaDe(ev));
  if (est.medida && !est.medida.aprobado) throw new HttpError(409, 'El equipo de diseño todavía no aprobó tu proyecto. Te avisaremos por mail.');
  if (est.producto) return { evento: ev, eur: est.aPagar.eur, pedido: { producto: ev.producto, tipo: ev.tipo, modelo: ev.modelo, paquete: est.plan, aMedida: ev.aMedida || null, extras: est.aPagar.extras, nombre: est.nombre } };
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
  // README (ronda 28): los productos sueltos y el diseño a medida también se arman antes de pagar
  const producto = str(b.producto, 30) || 'invitacion';
  if (producto !== 'invitacion') return empezarProducto(request, env, b, producto);
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
  const gratisPosible = !!(m.gratis || MODELOS_GRATIS.includes(m.id));
  const ev = {
    id: `ev_${randomId(5)}`, producto: 'invitacion', tipo, modelo: m.id, paquete: 'borrador', aMedida: null,
    estado: 'borrador', clave: randomId(16), empresaId: null, slug: null,
    datos: {
      // README (ronda 42): idioma y bautismo/bautizo del país que eligió en la web (o el de su IP)
      variante: varianteVisitante(request), zonaHoraria: zona, acceso: { modo: 'abierta' }, extras: [], secciones, ...(tipo === 'bautismo' && bautizoVisitante(request) ? { bautizo: true } : {}),
      nombres: bb ? { a, b: bb } : { a }, celebracion: fecha ? { fecha, inicio: fecha } : {},
      planElegido: gratisPosible ? 'gratis' : null,
      // README (ronda 28): los modelos con plan gratis arrancan gratis (sin galería ni cuenta regresiva); al prender
      // algo de un plan pago, pasa a ese plan
      ...(gratisPosible ? { portada: { cuenta: false } } : {}),
    },
  };
  if (gratisPosible) ev.datos.secciones.galeria = false;
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

// Save The Date (tarjeta del modelo, con foto o web), agradecimiento y diseño a medida: el cliente elige el diseño,
// lo arma en el panel y paga al final
const SUELTOS = ['std-tarjeta', 'std-foto', 'agradecimiento', 'std-web', 'std-tarjeta-medida', 'std-web-medida', 'a-medida', 'compromiso-web'];
// Qué Save The Date se vende suelta en cada evento (las a medida, en todos)
export const STD_SOLO_BODA_15 = new Set(['std-web', 'std-foto']);
export const EVENTOS_TARJETA_STD = new Set(['boda', '15', 'cumple', 'infantil', 'bautismo', 'comunion', 'babyshower', 'revelacion']);
export function disponibleSuelto(producto, tipo) {
  if (producto === 'std-foto') return ['boda', '15', 'bautismo', 'comunion', 'cumple'].includes(tipo);
  if (STD_SOLO_BODA_15.has(producto)) return tipo === 'boda' || tipo === '15';
  if (producto === 'std-tarjeta') return EVENTOS_TARJETA_STD.has(tipo);
  return true;
}
async function empezarProducto(request, env, b, producto) {
  if (!SUELTOS.includes(producto)) throw new HttpError(400, 'Producto desconocido');
  const tipo = TIPOS_EVENTO.some((t) => t.id === b.tipo) || b.tipo === 'empresarial' ? str(b.tipo, 20) : 'boda';
  // README (ronda 30): la web y la foto, solo boda y 15; la tarjeta del diseño, en los eventos que la tienen
  if (!disponibleSuelto(producto, tipo)) throw new HttpError(400, 'Esta opción no está disponible para ese tipo de evento');
  const a = str(b.nombres?.a, 20), bb = str(b.nombres?.b, 20);
  if (!a) throw new HttpError(400, 'Falta el nombre');
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(b.fecha || '') ? b.fecha : '';
  let modelo = null;
  const datos = { variante: varianteVisitante(request), ...(tipo === 'bautismo' && bautizoVisitante(request) ? { bautizo: true } : {}), acceso: { modo: 'abierta' }, extras: [], nombres: bb ? { a, b: bb } : { a },
    celebracion: fecha ? { fecha, inicio: fecha } : {}, std: { ...(fecha ? { fecha } : {}) } };
  if (producto === 'std-tarjeta') {
    // Sin diseño elegido (desde la tienda): el primero con tarjeta para ese evento
    const m = buscarModelo(b.modelo) || MODELOS.find((x) => CON_TARJETA_STD.has(x.id) && x.eventos.includes(tipo));
    const mj = m && m.eventos.includes(tipo) ? await env.ASSETS.fetch(new URL(`/modelos/${m.id}/modelo.json`, request.url)).then((r) => (r.ok ? r.json() : null)).catch(() => null) : null;
    if (!mj?.tarjetas?.std) throw new HttpError(400, 'Ese diseño no tiene tarjeta Save The Date para este evento');
    modelo = m.id; datos.std.tipo = 'tarjeta';
  } else if (producto === 'std-foto') {
    datos.std.tipo = 'foto'; if (/^f[1-9]$/.test(b.diseno || '')) datos.std.diseno = b.diseno;
  } else if (producto === 'agradecimiento') {
    datos.agradecimiento = /^g[1-9]$/.test(b.diseno || '') ? { diseno: b.diseno } : {};
  } else if (producto === 'compromiso-web') {
    // Invitación web simple (Civil, Compromiso, Pedida de mano, Party): su diseño o el primero del evento
    const m = buscarModelo(b.modelo);
    modelo = m?.simple && m.eventos.includes(tipo) ? m.id : (MODELOS.find((x) => x.simple && x.eventos.includes(tipo))?.id || 'compromiso');
  } else if (producto === 'std-web') {
    const m = buscarModelo(b.modelo);
    modelo = m?.std && m.eventos.includes(tipo) ? m.id : 'std-classic';
  }
  const ev = {
    id: `ev_${randomId(5)}`, producto, tipo, modelo, paquete: 'borrador', aMedida: producto === 'a-medida' ? (tipo === 'empresarial' ? 'empresarial' : 'personalizado') : null,
    estado: 'borrador', clave: randomId(16), empresaId: null, slug: null, datos,
  };
  const almacen = almacenD1(env);
  await almacen.guardarEvento(ev);
  const usuario = await usuarioActual(request, env);
  if (usuario) await almacen.darAcceso(ev.id, usuario.id, 'cliente');
  const previos = (getCookie(request, 'ai_bor') || '').split(',').filter((x) => /^ev_[a-z0-9]+:[a-z0-9]+$/i.test(x));
  const lista = [...new Set([`${ev.id}:${ev.clave}`, ...previos])].slice(0, 20).join(',');
  return json({ id: ev.id, clave: ev.clave, panel: `/panel/${ev.id}?k=${ev.clave}` }, 201,
    usuario ? {} : { 'set-cookie': cookie('ai_bor', lista, { maxAge: 365 * 86400, secure: isSecureRequest(request) }) });
}
