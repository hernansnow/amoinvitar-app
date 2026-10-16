// VeriFactu (Real Decreto 1007/2023 y Orden HAC/1177/2024): registro de cada factura con huella encadenada,
// envío automático a la Agencia Tributaria y código QR en la factura.
//
// Modos (variable VERIFACTU):
//   ""     → apagado. Igual se calcula la huella oficial y el encadenamiento, pero no se envía nada ni se muestra el QR.
//   "test" → entorno de pruebas de la AEAT (prewww1 / prewww2). Las facturas muestran el QR de pruebas.
//   "prod" → envío real a la AEAT. Obligatorio para autónomos desde el 1 de julio de 2027 (RDL 15/2025).
//
// El envío necesita tu certificado digital cargado en Cloudflare como certificado mTLS (binding AEAT_CERT).
// Sin él los registros quedan "pendientes" y se envían en cuanto lo cargues.
import qrcode from 'qrcode-generator';
import { sha256 } from './util.js';
import { EU_COUNTRIES } from './fx.js';

const NS_LR = 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd';
const NS_SI = 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd';
const ENDPOINT = {
  test: 'https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
  prod: 'https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP',
};
const QR_BASE = {
  test: 'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR',
  prod: 'https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR',
};
// Datos del sistema informático (vos sos el productor del software y también quien lo usa)
const SYSTEM = { name: 'Amo Invitar', id: 'AI', version: '1.0', installation: '1' };
const MAX_BATCH = 1000;          // máximo de registros por envío
const DEFAULT_WAIT = 60;         // segundos entre envíos si la AEAT no indica otro valor

export function verifactuMode(env) {
  const m = String(env.VERIFACTU || '').trim().toLowerCase();
  return m === 'test' || m === 'prod' ? m : '';
}

// ---------------------------------------------------------------- fechas en hora de España
const TZ = 'Europe/Madrid';
function madridParts(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map((x) => [x.type, x.value]));
  return p;
}
// "2026-10-04T21:15:03+02:00" (nunca "Z": la AEAT exige el huso horario explícito)
export function madridTimestamp(date) {
  const p = madridParts(date);
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const offMin = Math.round((local - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  const sign = offMin >= 0 ? '+' : '-';
  const a = Math.abs(offMin);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}
// Fecha de expedición "dd-mm-aaaa" y año, en hora de España
export function madridDate(date) {
  const p = madridParts(date);
  return { text: `${p.day}-${p.month}-${p.year}`, year: +p.year };
}

const amt = (v) => (Math.round(v * 100) / 100).toFixed(2);

// Importes en euros para el registro (la cuota tiene que constar en euros aunque se cobre en otra moneda)
export function eurAmounts(inv) {
  const rate = inv.eur_rate || 1;
  const vat = Math.round(inv.vat * rate * 100) / 100;
  const total = Math.round(inv.total * rate * 100) / 100;
  const base = Math.round((total - vat) * 100) / 100;
  return { base: amt(base), vat: amt(vat), total: amt(total) };
}

/**
 * Huella oficial (SHA-256 en hexadecimal mayúsculas) de un registro de alta:
 * IDEmisorFactura=…&NumSerieFactura=…&FechaExpedicionFactura=…&TipoFactura=…&CuotaTotal=…&ImporteTotal=…&Huella=<anterior>&FechaHoraHusoGenRegistro=…
 */
export async function altaHash({ nif, number, date, type, vat, total, prevHash, hashedAt }) {
  const s = `IDEmisorFactura=${nif}&NumSerieFactura=${number}&FechaExpedicionFactura=${date}&TipoFactura=${type}` +
    `&CuotaTotal=${vat}&ImporteTotal=${total}&Huella=${prevHash || ''}&FechaHoraHusoGenRegistro=${hashedAt}`;
  return (await sha256(s)).toUpperCase();
}

export function issuerNif(env) {
  return String(env.INVOICE_TAX_ID || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// ---------------------------------------------------------------- QR y leyenda
export function qrUrl(env, inv) {
  const mode = inv.vf_mode || verifactuMode(env) || 'test';
  const q = new URLSearchParams({ nif: issuerNif(env), numserie: inv.number, fecha: inv.vf_date, importe: inv.vf_total });
  return `${QR_BASE[mode]}?${q.toString()}`;
}

// SVG del QR (ISO/IEC 18004, corrección de errores M). Se muestra a 35 mm (la norma pide entre 30 y 40 mm).
export function qrSvg(url) {
  const q = qrcode(0, 'M');
  q.addData(url);
  q.make();
  const n = q.getModuleCount();
  const quiet = 2;
  let path = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) path += `M${c + quiet} ${r + quiet}h1v1h-1z`;
  const size = n + quiet * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="35mm" height="35mm" shape-rendering="crispEdges" role="img" aria-label="QR tributario"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}

// ---------------------------------------------------------------- XML
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const el = (name, value) => `<sum1:${name}>${esc(value)}</sum1:${name}>`;
const clip = (s, n) => String(s || '').trim().slice(0, n);

function recipientXml(inv) {
  const name = clip(inv.customer_name || inv.customer_tax_id, 120);
  const id = String(inv.customer_tax_id || '').toUpperCase().replace(/\s+/g, '');
  const country = (inv.country || '').toUpperCase();
  if (!country || country === 'ES') return `<sum1:IDDestinatario>${el('NombreRazon', name)}${el('NIF', id.replace(/^ES/, ''))}</sum1:IDDestinatario>`;
  // Empresas de la UE: n.º de IVA intracomunitario (tipo 02). Resto del mundo: documento oficial del país (tipo 04).
  const isEU = EU_COUNTRIES.includes(country);
  return `<sum1:IDDestinatario>${el('NombreRazon', name)}<sum1:IDOtro>${el('CodigoPais', country)}${el('IDType', isEU ? '02' : '04')}${el('ID', id)}</sum1:IDOtro></sum1:IDDestinatario>`;
}

function desgloseXml(inv) {
  if (inv.vat_rate > 0) {
    return `<sum1:DetalleDesglose>${el('Impuesto', '01')}${el('ClaveRegimen', '01')}${el('CalificacionOperacion', 'S1')}` +
      `${el('TipoImpositivo', amt(inv.vat_rate))}${el('BaseImponibleOimporteNoSujeto', inv.vf_base)}${el('CuotaRepercutida', inv.vf_vat)}</sum1:DetalleDesglose>`;
  }
  // Sin IVA español: servicio localizado fuera del territorio (empresa de la UE con inversión del sujeto pasivo, o cliente fuera de la UE)
  return `<sum1:DetalleDesglose>${el('Impuesto', '01')}${el('ClaveRegimen', '01')}${el('CalificacionOperacion', 'N2')}` +
    `${el('BaseImponibleOimporteNoSujeto', inv.vf_total)}</sum1:DetalleDesglose>`;
}

export function altaXml(env, inv, prev) {
  const nif = issuerNif(env);
  const encadenamiento = prev
    ? `<sum1:Encadenamiento><sum1:RegistroAnterior>${el('IDEmisorFactura', nif)}${el('NumSerieFactura', prev.number)}${el('FechaExpedicionFactura', prev.vf_date)}${el('Huella', prev.hash)}</sum1:RegistroAnterior></sum1:Encadenamiento>`
    : '<sum1:Encadenamiento><sum1:PrimerRegistro>S</sum1:PrimerRegistro></sum1:Encadenamiento>';
  return '<sum1:RegistroAlta>' +
    el('IDVersion', '1.0') +
    `<sum1:IDFactura>${el('IDEmisorFactura', nif)}${el('NumSerieFactura', inv.number)}${el('FechaExpedicionFactura', inv.vf_date)}</sum1:IDFactura>` +
    el('NombreRazonEmisor', clip(env.INVOICE_NAME, 120)) +
    el('Subsanacion', 'N') +
    el('TipoFactura', inv.vf_type) +
    el('DescripcionOperacion', clip(inv.concept, 500)) +
    (inv.vf_type === 'F1' ? `<sum1:Destinatarios>${recipientXml(inv)}</sum1:Destinatarios>` : '') +
    `<sum1:Desglose>${desgloseXml(inv)}</sum1:Desglose>` +
    el('CuotaTotal', inv.vf_vat) +
    el('ImporteTotal', inv.vf_total) +
    encadenamiento +
    `<sum1:SistemaInformatico>${el('NombreRazon', clip(env.INVOICE_NAME, 120))}${el('NIF', nif)}${el('NombreSistemaInformatico', SYSTEM.name)}` +
    `${el('IdSistemaInformatico', SYSTEM.id)}${el('Version', SYSTEM.version)}${el('NumeroInstalacion', SYSTEM.installation)}` +
    `${el('TipoUsoPosibleSoloVerifactu', 'S')}${el('TipoUsoPosibleMultiOT', 'N')}${el('IndicadorMultiplesOT', 'N')}</sum1:SistemaInformatico>` +
    el('FechaHoraHusoGenRegistro', inv.vf_hashed_at) +
    el('TipoHuella', '01') +
    el('Huella', inv.hash) +
    '</sum1:RegistroAlta>';
}

export function envelope(env, records) {
  return '<?xml version="1.0" encoding="UTF-8"?>' +
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sum="${NS_LR}" xmlns:sum1="${NS_SI}">` +
    '<soapenv:Header/><soapenv:Body><sum:RegFactuSistemaFacturacion>' +
    `<sum:Cabecera><sum1:ObligadoEmision>${el('NombreRazon', clip(env.INVOICE_NAME, 120))}${el('NIF', issuerNif(env))}</sum1:ObligadoEmision></sum:Cabecera>` +
    records.map((r) => `<sum:RegistroFactura>${r}</sum:RegistroFactura>`).join('') +
    '</sum:RegFactuSistemaFacturacion></soapenv:Body></soapenv:Envelope>';
}

// ---------------------------------------------------------------- respuesta de la AEAT
const tag = (xml, name) => { const m = new RegExp(`<(?:[\\w-]+:)?${name}>([\\s\\S]*?)</(?:[\\w-]+:)?${name}>`).exec(xml); return m ? m[1].trim() : null; };
const decode = (s) => String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

export function parseResponse(xml) {
  const fault = tag(xml, 'faultstring');
  if (fault) return { fault: decode(fault), lines: [] };
  const lines = [];
  const re = /<(?:[\w-]+:)?RespuestaLinea>([\s\S]*?)<\/(?:[\w-]+:)?RespuestaLinea>/g;
  let m;
  while ((m = re.exec(xml))) {
    const b = m[1];
    lines.push({
      number: decode(tag(b, 'NumSerieFactura')),
      status: tag(b, 'EstadoRegistro'),
      code: tag(b, 'CodigoErrorRegistro'),
      error: decode(tag(b, 'DescripcionErrorRegistro')),
    });
  }
  return { status: tag(xml, 'EstadoEnvio'), wait: parseInt(tag(xml, 'TiempoEsperaEnvio'), 10) || DEFAULT_WAIT, csv: tag(xml, 'CSV'), lines };
}

// ---------------------------------------------------------------- envío
async function ensureState(env) {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER)').run();
}
async function getState(env, key) {
  await ensureState(env);
  return (await env.DB.prepare('SELECT value FROM app_state WHERE key = ?').bind(key).first())?.value ?? null;
}
async function setState(env, key, value) {
  await env.DB.prepare('INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(key, String(value), Math.floor(Date.now() / 1000)).run();
}
export { getState, setState };

/**
 * Envía a la AEAT los registros pendientes, en orden de encadenamiento y respetando el tiempo de espera que indica la AEAT.
 * Devuelve un resumen. Nunca lanza: los errores quedan guardados en cada factura.
 */
export async function sendPending(env, { force = false } = {}) {
  const mode = verifactuMode(env);
  if (!mode) return { skipped: 'off' };
  if (!env.AEAT_CERT || typeof env.AEAT_CERT.fetch !== 'function') return { skipped: 'no-cert' };
  const nowS = Math.floor(Date.now() / 1000);
  const nextAt = parseInt(await getState(env, 'vf_next_send_at'), 10) || 0;
  let rows;
  try {
    ({ results: rows } = await env.DB.prepare("SELECT * FROM invoices WHERE vf_status = 'pending' AND vf_mode = ? ORDER BY vf_hashed_at, seq LIMIT ?").bind(mode, MAX_BATCH).all());
  } catch (e) { return { skipped: 'no-table' }; }
  if (!rows.length) return { sent: 0 };
  // Sin llegar a 1000 registros hay que esperar el tiempo que pidió la AEAT en el envío anterior
  if (!force && nowS < nextAt && rows.length < MAX_BATCH) return { skipped: 'wait', until: nextAt };

  const prevByNumber = new Map();
  const records = [];
  for (const inv of rows) {
    const prev = inv.prev_number ? { number: inv.prev_number, vf_date: inv.prev_vf_date, hash: inv.prev_hash } : null;
    records.push(altaXml(env, inv, prev));
    prevByNumber.set(inv.number, inv);
  }
  let text = '', res;
  try {
    res = await env.AEAT_CERT.fetch(ENDPOINT[mode], {
      method: 'POST',
      headers: { 'content-type': 'text/xml; charset=utf-8', soapaction: '' },
      body: envelope(env, records),
      signal: AbortSignal.timeout(30000),
    });
    text = await res.text();
  } catch (e) {
    await markAll(env, rows, 'pending', 'Sin conexión con la AEAT: ' + e.message);
    return { error: 'network', detail: e.message };
  }
  const r = parseResponse(text);
  await setState(env, 'vf_next_send_at', nowS + (r.wait || DEFAULT_WAIT));
  if (r.fault || !r.lines.length) {
    const msg = r.fault || `Respuesta inesperada de la AEAT (HTTP ${res.status})`;
    await markAll(env, rows, 'pending', msg);
    return { error: 'fault', detail: msg };
  }
  let ok = 0, bad = 0;
  for (const line of r.lines) {
    const inv = prevByNumber.get(line.number);
    if (!inv) continue;
    // 3000 = registro duplicado: ya estaba en la AEAT (por ejemplo, un reintento) → se da por enviado
    const accepted = line.status === 'Correcto' || line.status === 'AceptadoConErrores' || line.code === '3000';
    const status = line.status === 'AceptadoConErrores' ? 'accepted_errors' : accepted ? 'sent' : 'error';
    const err = line.code && line.code !== '3000' ? `${line.code}: ${line.error}` : null;
    await env.DB.prepare('UPDATE invoices SET vf_status = ?, vf_error = ?, vf_csv = ?, vf_sent_at = ? WHERE id = ?')
      .bind(status, err, r.csv || null, nowS, inv.id).run();
    if (accepted) ok++; else bad++;
  }
  return { sent: ok, errors: bad, csv: r.csv, status: r.status };
}

async function markAll(env, rows, status, error) {
  await env.DB.batch(rows.map((i) => env.DB.prepare('UPDATE invoices SET vf_status = ?, vf_error = ? WHERE id = ?').bind(status, error, i.id)));
}
