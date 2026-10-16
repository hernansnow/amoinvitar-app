// Facturación propia (copiada de Albunear): una factura por cada pago cobrado (Stripe, PayPal, Mercado Pago o transferencia).
// Serie propia (AI por defecto) para no mezclar la numeración con la de Albunear.
// - Numeración correlativa por serie y año (A2026-00001, A2026-00002…), sin huecos.
// - Simplificada si el cliente no dio NIF/CIF; completa si lo dio.
// - Cada factura guarda la huella oficial de VeriFactu (SHA-256) encadenada con la anterior (ver verifactu.js).
// - Con VERIFACTU = "test" o "prod" el registro se envía a la AEAT y la factura lleva el QR tributario.
// - El cliente la recibe por email con un link permanente; en /admin se descarga el libro (CSV) y los PDF por período.
// Sin INVOICE_TAX_ID (datos fiscales del emisor) no se emite nada.
import { hmacHex, sha256, escapeHtml, now, randomId } from './util.js';
import { getRates, EU_COUNTRIES } from './fx.js';
import { verifactuMode, madridTimestamp, madridDate, eurAmounts, altaHash, issuerNif, qrUrl, qrSvg } from './verifactu.js';

const EU = ['AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'];

const TABLES = [
  `CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY, number TEXT NOT NULL UNIQUE, series TEXT NOT NULL, year INTEGER NOT NULL, seq INTEGER NOT NULL,
    order_id TEXT NOT NULL UNIQUE, event_id TEXT NOT NULL, user_id TEXT NOT NULL, kind TEXT NOT NULL, issued_at INTEGER NOT NULL,
    customer_email TEXT, customer_type TEXT, customer_name TEXT, customer_tax_id TEXT, customer_address TEXT, country TEXT,
    concept TEXT NOT NULL, method TEXT NOT NULL, currency TEXT NOT NULL, total REAL NOT NULL, base REAL NOT NULL, vat REAL NOT NULL, vat_rate REAL NOT NULL,
    eur_rate REAL NOT NULL DEFAULT 1, note TEXT, prev_hash TEXT, hash TEXT NOT NULL)`,
  'CREATE INDEX IF NOT EXISTS idx_invoices_issued ON invoices (issued_at)',
  'CREATE INDEX IF NOT EXISTS idx_invoices_event ON invoices (event_id)',
  'CREATE TABLE IF NOT EXISTS invoice_seq (series TEXT NOT NULL, year INTEGER NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (series, year))',
];

export function invoicesEnabled(env) {
  return Boolean(env.INVOICE_TAX_ID && env.INVOICE_NAME);
}

async function ensureTables(env) {
  await env.DB.batch(TABLES.map((sql) => env.DB.prepare(sql)));
  // Columnas agregadas después (bases creadas antes): particular / empresa y VeriFactu
  for (const col of ['customer_type TEXT', 'vf_mode TEXT', 'vf_type TEXT', 'vf_date TEXT', 'vf_hashed_at TEXT', 'vf_base TEXT', 'vf_vat TEXT', 'vf_total TEXT',
    'prev_number TEXT', 'prev_vf_date TEXT', "vf_status TEXT NOT NULL DEFAULT 'off'", 'vf_error TEXT', 'vf_csv TEXT', 'vf_sent_at INTEGER']) {
    try { await env.DB.prepare('ALTER TABLE invoices ADD COLUMN ' + col).run(); } catch (e) { /* ya existe */ }
  }
  // Dos facturas no pueden encadenarse a la misma anterior (protege la cadena si entran dos pagos a la vez)
  try { await env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_prev ON invoices (prev_hash) WHERE prev_hash IS NOT NULL').run(); } catch (e) { /* índice viejo o duplicados previos */ }
  try { await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_invoices_vf ON invoices (vf_status)").run(); } catch (e) { /* */ }
}

// Nombre del dato fiscal del cliente según su país
function taxLabel(inv) {
  if (inv.country === 'ES') return 'NIF/CIF';
  if (inv.country === 'AR') return 'CUIL/CUIT';
  if (inv.customer_type === 'company') return EU.includes(inv.country) ? 'N.º IVA / VAT No.' : 'N.º registro fiscal / Tax ID';
  return 'Documento / ID No.';
}

const r2 = (v) => Math.round(v * 100) / 100;

// Mención legal cuando no se cobra IVA español
function vatNote(inv, order) {
  if (order && order.reverse_charge) return `Operación no sujeta al IVA español (art. 69 Ley 37/1992): inversión del sujeto pasivo (art. 196 Directiva 2006/112/CE). / Reverse charge: VAT to be accounted for by the recipient.${order.vies_ref ? ' VIES: ' + order.vies_ref : ''}`;
  if (inv.vat_rate) return '';
  if (inv.country && !EU.includes(inv.country)) return 'Operación no sujeta al IVA español (art. 69 Ley 37/1992). / Not subject to Spanish VAT.';
  return '';
}

/**
 * Emite la factura de un pedido cobrado (idempotente: si ya existe, devuelve la existente).
 * Devuelve la fila de la factura o null si la facturación no está configurada o el pedido no se factura.
 */
export async function issueInvoice(env, order) {
  if (!invoicesEnabled(env) || !order || !(order.amount > 0)) return null;
  await ensureTables(env);
  const existing = await env.DB.prepare('SELECT * FROM invoices WHERE order_id = ?').bind(order.id).first();
  if (existing) return existing;

  const series = String(env.INVOICE_SERIES || 'AI').replace(/[^A-Za-z0-9]/g, '').slice(0, 6) || 'AI';
  const issuedAt = now();
  const issuedDate = new Date(issuedAt * 1000);
  const { text: vfDate, year } = madridDate(issuedDate); // fecha y año en hora de España
  await env.DB.prepare('INSERT OR IGNORE INTO invoice_seq (series, year, n) VALUES (?, ?, 0)').bind(series, year).run();
  const { n } = await env.DB.prepare('UPDATE invoice_seq SET n = n + 1 WHERE series = ? AND year = ? RETURNING n').bind(series, year).first();
  const number = `${series}${year}-${String(n).padStart(5, '0')}`;

  const total = r2(order.amount);
  const vat = r2(order.vat || 0);
  const vatRate = order.vat_rate || 0;
  const base = r2(total - vat);
  // Contravalor en euros para la contabilidad cuando se cobra en otra moneda (cotización del día)
  let eurRate = 1;
  if (order.currency !== 'EUR') {
    const rates = await getRates(env);
    if (rates[order.currency] && rates.EUR) eurRate = rates.EUR / rates[order.currency];
  }
  const taxId = String(order.bill_tax_id || '').trim();
  const mode = verifactuMode(env);
  const inv = {
    id: randomId(10), number, series, year, seq: n, order_id: order.id, event_id: order.event_id, user_id: order.user_id,
    kind: taxId ? 'completa' : 'simplificada', issued_at: issuedAt,
    customer_email: order.email || null, customer_type: order.bill_type || 'person', customer_name: order.bill_name || null, customer_tax_id: taxId || null,
    customer_address: order.bill_address || null, country: order.country || null,
    concept: order.concept,
    method: order.method, currency: order.currency, total, base, vat, vat_rate: vatRate, eur_rate: eurRate,
    vf_mode: mode || null, vf_type: taxId ? 'F1' : 'F2', vf_date: vfDate, vf_status: mode ? 'pending' : 'off',
  };
  inv.note = vatNote(inv, order);
  Object.assign(inv, Object.fromEntries(Object.entries(eurAmounts(inv)).map(([k, v]) => ['vf_' + k, v])));

  // Encadenamiento: la huella de cada factura incluye la de la anterior. Si otra factura se encadenó primero
  // a la misma anterior (dos pagos simultáneos), el índice único lo rechaza y se vuelve a encadenar.
  for (let attempt = 0; ; attempt++) {
    const prev = await env.DB.prepare('SELECT number, vf_date, hash FROM invoices WHERE vf_hashed_at IS NOT NULL ORDER BY issued_at DESC, seq DESC LIMIT 1').first();
    inv.prev_hash = prev?.hash || null;
    inv.prev_number = prev?.number || null;
    inv.prev_vf_date = prev?.vf_date || null;
    inv.vf_hashed_at = madridTimestamp(new Date());
    inv.hash = await altaHash({ nif: issuerNif(env), number: inv.number, date: inv.vf_date, type: inv.vf_type, vat: inv.vf_vat, total: inv.vf_total, prevHash: inv.prev_hash, hashedAt: inv.vf_hashed_at });
    const cols = Object.keys(inv);
    try {
      await env.DB.prepare(`INSERT INTO invoices (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).bind(...cols.map((c) => inv[c])).run();
      break;
    } catch (e) {
      if (attempt < 4 && /UNIQUE/i.test(String(e && e.message)) && /prev_hash/i.test(String(e && e.message))) continue;
      throw e;
    }
  }
  return inv;
}

// Link permanente y privado a la factura (firmado, no se puede adivinar)
export async function invoiceUrl(env, base, inv) {
  const k = (await hmacHex(env.SECRETO_ACCESO || 'dev', 'invoice:' + inv.id)).slice(0, 24);
  return `${base}/factura/${inv.id}?k=${k}`;
}

export async function checkInvoiceKey(env, id, k) {
  const expected = (await hmacHex(env.SECRETO_ACCESO || 'dev', 'invoice:' + id)).slice(0, 24);
  return typeof k === 'string' && k === expected;
}

export async function listInvoices(env, { from, to, eventId } = {}) {
  if (!invoicesEnabled(env)) return [];
  await ensureTables(env);
  const where = [], args = [];
  if (from) { where.push('issued_at >= ?'); args.push(from); }
  if (to) { where.push('issued_at < ?'); args.push(to); }
  if (eventId) { where.push('event_id = ?'); args.push(eventId); }
  const { results } = await env.DB.prepare(`SELECT * FROM invoices ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY year, series, seq`).bind(...args).all();
  return results;
}

export async function getInvoice(env, id) {
  if (!invoicesEnabled(env)) return null;
  await ensureTables(env);
  return env.DB.prepare('SELECT * FROM invoices WHERE id = ?').bind(id).first();
}

// Período en segundos UNIX a partir de ?year=2026&q=1..4 (trimestre) o el año entero
export function periodOf(url) {
  const year = parseInt(url.searchParams.get('year'), 10) || new Date().getUTCFullYear();
  const q = parseInt(url.searchParams.get('q'), 10);
  const m0 = q >= 1 && q <= 4 ? (q - 1) * 3 : 0;
  const m1 = q >= 1 && q <= 4 ? m0 + 3 : 12;
  return { year, q: q >= 1 && q <= 4 ? q : 0, from: Date.UTC(year, m0, 1) / 1000, to: Date.UTC(year, m1, 1) / 1000 };
}

// Fecha de la factura en hora de España (la misma que va al registro VeriFactu)
const fmtDate = (s) => madridDate(new Date(s * 1000)).text.replace(/-/g, '/');
const invDate = (i) => (i.vf_date ? i.vf_date.replace(/-/g, '/') : fmtDate(i.issued_at));
const VF_STATUS = { off: 'No enviada (VeriFactu apagado)', pending: 'Pendiente de envío', sent: 'Enviada', accepted_errors: 'Aceptada con errores', error: 'Rechazada' };
// Importes de factura: siempre con 2 decimales (salvo monedas sin centavos)
const fmtMoney = (v, cur) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: cur, minimumFractionDigits: ['CLP', 'PYG', 'JPY', 'COP'].includes(cur) ? 0 : 2 }).format(r2(v));
const eur = (v) => v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const METHOD = { stripe: 'Tarjeta (Stripe)', paypal: 'PayPal', mercadopago: 'Mercado Pago', transfer: 'Transferencia bancaria' };

// Libro registro de facturas emitidas (CSV con ; para abrir directo en Excel español)
export function invoicesCsv(rows) {
  const head = ['Número', 'Fecha', 'Tipo', 'Particular/Empresa', 'Cliente', 'Id. fiscal', 'Dirección', 'País', 'Email', 'Concepto', 'Medio de pago', 'Moneda',
    'Base', 'Tipo IVA %', 'Cuota IVA', 'Total', 'Cambio a EUR', 'Base EUR', 'Cuota IVA EUR', 'Total EUR', 'Mención', 'Huella', 'Tipo VeriFactu', 'Estado VeriFactu', 'CSV AEAT', 'Error AEAT'];
  const n = (v) => String(r2(v)).replace('.', ',');
  const cell = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = rows.map((i) => [i.number, invDate(i), i.kind, i.customer_type === 'company' ? 'Empresa' : 'Particular', i.customer_name, i.customer_tax_id, i.customer_address, i.country, i.customer_email, i.concept,
    METHOD[i.method] || i.method, i.currency, n(i.base), n(i.vat_rate), n(i.vat), n(i.total), String(i.eur_rate).replace('.', ','),
    i.vf_base ? i.vf_base.replace('.', ',') : n(i.base * i.eur_rate), i.vf_vat ? i.vf_vat.replace('.', ',') : n(i.vat * i.eur_rate), i.vf_total ? i.vf_total.replace('.', ',') : n(i.total * i.eur_rate),
    i.note, i.hash, i.vf_type || '', VF_STATUS[i.vf_status] || '', i.vf_csv || '', i.vf_error || ''].map(cell).join(';'));
  return '﻿' + [head.join(';'), ...lines].join('\r\n') + '\r\n';
}

// QR tributario y leyenda VeriFactu: al principio de la factura, solo si el registro se envía a la AEAT
function vfBlock(env, inv) {
  if (!inv.vf_mode || inv.vf_status === 'off' || !inv.vf_date || !inv.vf_total) return '';
  const url = qrUrl(env, inv);
  return `<section class="vf"><a href="${escapeHtml(url)}" target="_blank" rel="noopener">${qrSvg(url)}</a>
    <div><p class="vf-l">QR tributario</p><p><b>VERI*FACTU</b></p><p class="small">Factura verificable en la sede electrónica de la AEAT${inv.vf_mode === 'test' ? ' (entorno de pruebas)' : ''}</p></div></section>`;
}

function invoiceBlock(env, inv) {
  const money = (v) => fmtMoney(v, inv.currency);
  const issuer = [env.INVOICE_NAME, 'NIF: ' + env.INVOICE_TAX_ID, ...(String(env.INVOICE_ADDRESS || '').split('\n'))].filter(Boolean);
  const client = inv.kind === 'completa'
    ? [inv.customer_name, taxLabel(inv) + ': ' + inv.customer_tax_id, ...(String(inv.customer_address || '').split('\n')), inv.country, inv.customer_email].filter(Boolean)
    : [inv.customer_name, inv.customer_email, inv.country].filter(Boolean);
  const title = inv.kind === 'completa' ? 'Factura' : 'Factura simplificada';
  const eurLine = inv.currency !== 'EUR'
    ? `<p class="small">Contravalor en euros (cambio ${String(r2(inv.eur_rate * 10000) / 10000).replace('.', ',')}): base ${eur(inv.base * inv.eur_rate)} · IVA ${eur(inv.vat * inv.eur_rate)} · total ${eur(inv.total * inv.eur_rate)}</p>` : '';
  return `<article class="inv">
  <header><div><img src="/comun/img/amoinvitar-email.png" alt="Amo Invitar!" width="150" height="32"><p class="small">${issuer.map(escapeHtml).join('<br>')}</p></div>
    <div class="num"><h1>${title}</h1><p><b>${escapeHtml(inv.number)}</b><br>Fecha / Date: ${invDate(inv)}</p></div></header>
  ${vfBlock(env, inv)}
  <section class="client"><p class="lbl">Cliente / Customer</p><p>${client.map(escapeHtml).join('<br>') || '—'}</p></section>
  <table><thead><tr><th>Concepto / Description</th><th>Base</th><th>IVA / VAT</th><th>Total</th></tr></thead>
    <tbody><tr><td>${escapeHtml(inv.concept)}</td><td>${money(inv.base)}</td><td>${inv.vat_rate ? `${inv.vat_rate} % · ${money(inv.vat)}` : '—'}</td><td>${money(inv.total)}</td></tr></tbody></table>
  <div class="tot"><p>Base imponible: <b>${money(inv.base)}</b></p><p>IVA ${inv.vat_rate || 0} %: <b>${money(inv.vat)}</b></p><p class="big">Total: <b>${money(inv.total)}</b></p></div>
  ${eurLine}
  <p class="small">Forma de pago / Payment: ${escapeHtml(METHOD[inv.method] || inv.method)} · Pagado / Paid${inv.vat_rate ? ' · IVA incluido' : ''}</p>
  ${inv.note ? `<p class="small">${escapeHtml(inv.note)}</p>` : ''}
  <p class="hash">Huella: ${escapeHtml(inv.hash)}</p>
</article>`;
}

// Página imprimible (una o varias facturas; al imprimir, cada una en su hoja A4)
export function invoicesPage(env, invoices, { title, back } = {}) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${escapeHtml(title || 'Factura')} · Amo Invitar</title>
<style>
  body { margin: 0; background: #f1efe9; font: 14px/1.5 Helvetica, Arial, sans-serif; color: #1c1c1c; }
  .bar { position: sticky; top: 0; display: flex; gap: 10px; justify-content: center; padding: 12px; background: #1c1c1c; }
  .bar button, .bar a { font: inherit; border: 0; border-radius: 999px; padding: 9px 20px; background: #7a9c7e; color: #fff; font-weight: bold; cursor: pointer; text-decoration: none; }
  .bar a { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,.4); }
  .inv { background: #fff; width: min(210mm, 100% - 24px); box-sizing: border-box; margin: 20px auto; padding: 16mm 15mm; box-shadow: 0 10px 30px rgba(0,0,0,.08); }
  header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; border-bottom: 2px solid #1c1c1c; padding-bottom: 14px; }
  header img { height: 40px; width: auto; display: block; margin-bottom: 8px; }
  .num { text-align: right; } .num h1 { font-size: 22px; margin: 0 0 6px; }
  .client { margin: 18px 0; } .lbl { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #625d51; margin: 0 0 4px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0 14px; } th, td { text-align: left; padding: 9px 8px; border-bottom: 1px solid #d8d3c5; vertical-align: top; }
  th { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #625d51; } td:not(:first-child), th:not(:first-child) { text-align: right; white-space: nowrap; }
  .tot { text-align: right; } .tot p { margin: 2px 0; } .tot .big { font-size: 18px; margin-top: 6px; }
  .vf { display: flex; gap: 14px; align-items: center; margin: 14px 0 0; } .vf svg { display: block; } .vf p { margin: 2px 0; } .vf-l { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #625d51; }
  .small { font-size: 12px; color: #3f3b31; } .hash { font-size: 9px; color: #8b8577; word-break: break-all; margin-top: 18px; }
  @media print { body { background: #fff; } .bar { display: none; } .inv { box-shadow: none; margin: 0; width: auto; padding: 0; page-break-after: always; } @page { size: A4; margin: 15mm; } }
</style></head><body>
<div class="bar">${back ? `<a href="${escapeHtml(back)}">Volver</a>` : ''}<button onclick="print()">Descargar PDF / Imprimir</button></div>
${invoices.length ? invoices.map((i) => invoiceBlock(env, i)).join('\n') : '<article class="inv"><p>No hay facturas en este período.</p></article>'}
</body></html>`;
}

// ---------------------------------------------------------------- umbral de 10.000 € (ventas a distancia en la UE)
// Suma, en euros y sin IVA, lo vendido a particulares de otros países de la UE (servicio electrónico, art. 73 Ley 37/1992).
// Las ventas a empresas con inversión del sujeto pasivo no cuentan. Si en el año en curso o en el anterior se superan
// 10.000 €, el IVA es el del país del cliente (régimen OSS / ventanilla única).
export const OSS_THRESHOLD = 10000;
export const OSS_WARNING = 8000;

export async function ossStatus(env, year = madridDate(new Date()).year) {
  const out = { threshold: OSS_THRESHOLD, warning: OSS_WARNING, year, current: 0, previous: 0, ossActive: env.VAT_OSS === '1' };
  if (invoicesEnabled(env)) {
    await ensureTables(env);
    const eu = EU_COUNTRIES.filter((c) => c !== 'ES');
    const q = `SELECT year, SUM(COALESCE(CAST(vf_base AS REAL), base * eur_rate)) AS eur FROM invoices
      WHERE year IN (?, ?) AND vat_rate > 0 AND country IN (${eu.map(() => '?').join(',')}) GROUP BY year`;
    const { results } = await env.DB.prepare(q).bind(year, year - 1, ...eu).all();
    for (const r of results) out[r.year === year ? 'current' : 'previous'] = Math.round((r.eur || 0) * 100) / 100;
  }
  out.exceeded = out.current > OSS_THRESHOLD || out.previous > OSS_THRESHOLD;
  out.level = out.exceeded ? (out.ossActive ? 'oss' : 'exceeded') : out.current >= OSS_WARNING ? 'warning' : 'ok';
  return out;
}
