// README (ronda 35) · Compras de créditos y pase de los profesionales: crear el pedido, confirmarlo (cobrado) y facturar.
import { randomId, now } from '../lib/util.js';
import { vatRateFor, getRates } from '../lib/fx.js';
import { methodsFor, createMpPreference, findMpApproved } from '../lib/pagos.js';
import { createCheckoutSession, retrieveCheckoutSession } from '../lib/stripe.js';
import { createPaypalOrder, capturePaypalOrder } from '../lib/paypal.js';
import { reverseChargeFor } from '../lib/vies.js';
import { transferInfo } from '../lib/pagos.js';
import { issueInvoice, invoiceUrl } from '../lib/facturas.js';
import { verifactuMode, sendPending } from '../lib/verifactu.js';
import { sendEmail, mailCompraPro, mailCompraProPagada, mailAvisoInterno } from '../lib/email.js';
import { PROFESIONALES } from '../catalogo.js';
import { catalogoCompras, siguienteNumeroCompra, nuevoLote, renovarPase } from './empresa.js';

const r2 = (n) => Math.round(n * 100) / 100;
const eur = (n) => `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
export const fmtEuros = eur;

// IVA de una compra: precios netos; en España y la UE se suma. Empresa de otro país de la UE con IVA válido: sin IVA.
export async function calcularIva(env, { neto, pais, nif }) {
  const p = String(pais || '').toUpperCase();
  const rc = nif && p ? await reverseChargeFor(env, { type: 'company', taxId: nif }, p).catch(() => null) : null;
  const tasa = rc ? 0 : vatRateFor(p, env);
  const iva = r2(neto * tasa / 100);
  return { tasa, iva, total: r2(neto + iva), inversion: !!rc, rc };
}

// README (ronda 36): medios de pago de los profesionales. Los precios son en euros; con Mercado Pago (Argentina) se cobra
// el equivalente en pesos. La transferencia sigue disponible y se confirma a mano desde /admin.
export function mediosPro(env, pais) {
  const p = String(pais || '').toUpperCase();
  const online = methodsFor(env, p, p === 'AR' ? 'ARS' : 'EUR').filter((m) => m.id !== 'transfer').map((m) => m.id);
  return [...online, 'transfer'];
}

export async function crearCompra(env, { empresaId, usuarioId, item, pais, fiscal, email, empresaNombre, medio = 'transfer', base = '' }) {
  medio = mediosPro(env, pais).includes(medio) ? medio : 'transfer';
  const cat = catalogoCompras()[item];
  if (!cat) throw new Error('Producto desconocido');
  const calc = await calcularIva(env, { neto: cat.neto, pais, nif: fiscal?.id });
  const id = 'cp_' + randomId(6);
  const numero = await siguienteNumeroCompra(env);
  const f = { nombre: fiscal?.nombre || empresaNombre || '', id: calc.rc ? calc.rc.vatId : String(fiscal?.id || '').toUpperCase().replace(/\s+/g, ''), direccion: fiscal?.direccion || calc.rc?.address || '' };
  await env.DB.prepare(`INSERT INTO compras_pro (id, numero, empresa_id, usuario_id, item, creditos, neto, iva_tasa, iva, total, pais, fiscal, inversion, estado, medio, creado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)`)
    .bind(id, numero, empresaId, usuarioId || null, item, cat.creditos, cat.neto, calc.tasa, calc.iva, calc.total, String(pais || '').toUpperCase() || null, JSON.stringify(f), calc.inversion ? 1 : 0, medio === 'transfer' ? 'transferencia' : medio, new Date().toISOString()).run();
  if (medio !== 'transfer') return { id, numero, nombre: cat.nombre, ...calc, rc: undefined, medio, ...(await iniciarPago(env, { id, numero, cat, total: calc.total, medio, email, base })) };
  const datos = transferInfo(env, 'EUR');
  try {
    if (email) await sendEmail(env, { to: email, ...mailCompraPro(env, { numero, producto: cat.nombre, total: eur(calc.total), referencia: `PRO-${numero}`, datos }) });
    const para = String(env.ADMINS || '').split(/[,\s]+/).filter(Boolean)[0] || env.SUPPORT_EMAIL;
    if (para) await sendEmail(env, { to: para, ...mailAvisoInterno(env, { asunto: `Compra Pro pendiente #${numero} · ${eur(calc.total)}`, lineas: [`${empresaNombre} · ${email || ''}`, `${cat.nombre} · neto ${eur(cat.neto)} + IVA ${calc.tasa}% = ${eur(calc.total)}`, `Confirmar el cobro en ${env.SITE_URL || ''}/admin/`] }) });
  } catch (e) { console.error('[compra pro]', e); }
  return { id, numero, nombre: cat.nombre, ...calc, rc: undefined, datos };
}

// Cobrada: se cargan los créditos (o se renueva el pase), se emite la factura y se avisa. Se puede llamar varias veces.
export async function pagarCompra(env, id, { medio = 'transferencia', nota = null, base = '' } = {}) {
  const r = await env.DB.prepare("UPDATE compras_pro SET estado = 'pagada', pagada = ?, medio = ?, nota = COALESCE(?, nota) WHERE id = ? AND estado = 'pendiente'").bind(new Date().toISOString(), medio, nota, id).run();
  if (!r.meta.changes) return false;
  const c = await env.DB.prepare('SELECT * FROM compras_pro WHERE id = ?').bind(id).first();
  const cat = catalogoCompras()[c.item];
  const emp = await env.DB.prepare('SELECT nombre FROM empresas WHERE id = ?').bind(c.empresa_id).first();
  if (c.item === 'dominio' || c.item === `studio-${PROFESIONALES.dominioSinCargoDesdePack}`) await env.DB.prepare('UPDATE empresas_pro SET dominio = 1 WHERE empresa_id = ?').bind(c.empresa_id).run();
  if (c.item === 'pase') await renovarPase(env, c.empresa_id, 12);
  else await nuevoLote(env, c.empresa_id, c.creditos, c.item, `Pedido #${c.numero}`);
  let urlFactura = null;
  try {
    const f = JSON.parse(c.fiscal || '{}');
    const email = c.usuario_id ? (await env.DB.prepare('SELECT email FROM usuarios WHERE id = ?').bind(c.usuario_id).first())?.email : null;
    const inv = await issueInvoice(env, {
      id: c.id, event_id: c.empresa_id, user_id: c.usuario_id || '', email: email || '', amount: c.total, vat: c.iva, vat_rate: c.iva_tasa, currency: 'EUR',
      method: medio === 'transferencia' ? 'transfer' : medio, country: c.pais, bill_type: 'company', bill_name: f.nombre || emp?.nombre || null, bill_tax_id: f.id || null, bill_address: f.direccion || null,
      reverse_charge: c.inversion, concept: `Amo Invitar para profesionales · ${cat?.nombre || c.item} · Pedido #${c.numero}`,
    });
    if (inv) {
      await env.DB.prepare('UPDATE compras_pro SET factura = ? WHERE id = ?').bind(inv.id, id).run();
      urlFactura = await invoiceUrl(env, base, inv);
    }
    if (verifactuMode(env)) await sendPending(env);
    if (email) await sendEmail(env, { to: email, ...mailCompraProPagada(env, { numero: c.numero, producto: cat?.nombre || c.item, url: `${base}/empresa/`, urlFactura }) });
  } catch (e) { console.error('[factura compra pro]', e); }
  return true;
}

// ── Pago online de una compra (Stripe, PayPal, Mercado Pago) ─────────────
async function iniciarPago(env, { id, numero, cat, total, medio, email, base }) {
  const titulo = `Amo Invitar para profesionales · ${cat.nombre} · #${numero}`;
  const ok = `${base}/empresa/?pagado=${id}`, no = `${base}/empresa/?cancelado=${id}`;
  const real = { stripe: env.STRIPE_SECRET_KEY, mercadopago: env.MP_ACCESS_TOKEN, paypal: env.PAYPAL_CLIENT_ID }[medio];
  if (env.DEV_FAKE_PAYMENTS === '1' && !real) { await pagarCompra(env, id, { medio, base }); return { url: ok }; }
  if (medio === 'stripe') {
    const s = await createCheckoutSession(env, { amount: Math.round(total * 100), currency: 'eur', productName: titulo, description: cat.nombre, email, taxRate: '', invoice: false,
      successUrl: `${ok}&session={CHECKOUT_SESSION_ID}`, cancelUrl: no, metadata: { compra_pro: id, numero: String(numero) } });
    return { url: s.url };
  }
  if (medio === 'paypal') {
    const pp = await createPaypalOrder(env, { orderId: id, title: titulo, amount: total, currency: 'EUR', returnUrl: ok, cancelUrl: no });
    return { url: pp.approveUrl };
  }
  // Mercado Pago: el equivalente en pesos argentinos (redondeado a 100)
  const rates = await getRates(env);
  const ars = Math.max(100, Math.round((total / (rates.EUR || 0.92)) * (rates.ARS || 1400) / 100) * 100);
  const pref = await createMpPreference(env, { title: titulo, amount: ars, currency: 'ARS', email, orderId: id, successUrl: ok, failureUrl: no, notificationUrl: `${base}/api/mp/webhook` });
  return { url: pref.init_point };
}

// Al volver de la pasarela (o desde el aviso): se verifica el pago con la pasarela y se acreditan los créditos
export async function confirmarCompra(env, id, { session = '', token = '', base = '' } = {}) {
  const c = await env.DB.prepare('SELECT id, estado, medio FROM compras_pro WHERE id = ?').bind(id).first();
  if (!c) return null;
  if (c.estado === 'pendiente') {
    let ok = false;
    if (c.medio === 'stripe' && session.startsWith('cs_') && env.STRIPE_SECRET_KEY) {
      const s = await retrieveCheckoutSession(env, session);
      ok = s.metadata?.compra_pro === id && s.payment_status === 'paid';
    } else if (c.medio === 'paypal' && token && env.PAYPAL_CLIENT_ID) ok = await capturePaypalOrder(env, token);
    else if (c.medio === 'mercadopago' && env.MP_ACCESS_TOKEN) ok = !!(await findMpApproved(env, id));
    if (ok) await pagarCompra(env, id, { medio: c.medio, base });
  }
  return (await env.DB.prepare('SELECT id, estado, medio FROM compras_pro WHERE id = ?').bind(id).first());
}
