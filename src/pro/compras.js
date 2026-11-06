// README (ronda 35) · Compras de créditos y pase de los profesionales: crear el pedido, confirmarlo (cobrado) y facturar.
import { randomId, now } from '../lib/util.js';
import { vatRateFor } from '../lib/fx.js';
import { reverseChargeFor } from '../lib/vies.js';
import { transferInfo } from '../lib/pagos.js';
import { issueInvoice, invoiceUrl } from '../lib/facturas.js';
import { verifactuMode, sendPending } from '../lib/verifactu.js';
import { sendEmail, mailCompraPro, mailCompraProPagada, mailAvisoInterno } from '../lib/email.js';
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

export async function crearCompra(env, { empresaId, usuarioId, item, pais, fiscal, email, empresaNombre }) {
  const cat = catalogoCompras()[item];
  if (!cat) throw new Error('Producto desconocido');
  const calc = await calcularIva(env, { neto: cat.neto, pais, nif: fiscal?.id });
  const id = 'cp_' + randomId(6);
  const numero = await siguienteNumeroCompra(env);
  const f = { nombre: fiscal?.nombre || empresaNombre || '', id: calc.rc ? calc.rc.vatId : String(fiscal?.id || '').toUpperCase().replace(/\s+/g, ''), direccion: fiscal?.direccion || calc.rc?.address || '' };
  await env.DB.prepare(`INSERT INTO compras_pro (id, numero, empresa_id, usuario_id, item, creditos, neto, iva_tasa, iva, total, pais, fiscal, inversion, estado, medio, creado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', 'transferencia', ?)`)
    .bind(id, numero, empresaId, usuarioId || null, item, cat.creditos, cat.neto, calc.tasa, calc.iva, calc.total, String(pais || '').toUpperCase() || null, JSON.stringify(f), calc.inversion ? 1 : 0, new Date().toISOString()).run();
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
