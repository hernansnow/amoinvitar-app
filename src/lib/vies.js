// Verificación de números de IVA intracomunitario en VIES (registro oficial de la Comisión Europea).
// Empresa de otro país de la UE con número válido → se factura sin IVA (inversión del sujeto pasivo).
// Si VIES no responde, no se puede comprobar: se cobra con IVA como a un particular.
import { EU_COUNTRIES } from './fx.js';

const API = 'https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number';
const cache = new Map(); // por instancia del Worker, 1 hora

// "fr 12.345.678.901" → { cc: 'FR', number: '12345678901', vatId: 'FR12345678901' }
export function parseVatId(raw, countryHint) {
  let v = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let cc = /^[A-Z]{2}/.test(v) ? v.slice(0, 2) : '';
  if (cc && (EU_COUNTRIES.includes(cc === 'EL' ? 'GR' : cc) || cc === 'XI')) v = v.slice(2);
  else cc = countryHint === 'GR' ? 'EL' : String(countryHint || '').toUpperCase();
  if (cc === 'GR') cc = 'EL';
  if (!cc || !/^[A-Z0-9]{2,14}$/.test(v)) return null;
  return { cc, number: v, vatId: cc + v, country: cc === 'EL' ? 'GR' : cc };
}

/**
 * Consulta VIES. Devuelve { checked, valid, vatId, country, name, address, consultation, error }.
 * Con INVOICE_TAX_ID (tu NIF) VIES devuelve además un número de consulta, que sirve como prueba ante Hacienda.
 */
export async function checkVat(env, raw, countryHint) {
  const p = parseVatId(raw, countryHint);
  if (!p) return { checked: true, valid: false, error: 'format' };
  const hit = cache.get(p.vatId);
  if (hit && hit.t > Date.now() - 3600e3) return hit.r;
  if (env.DEV_FAKE_PAYMENTS === '1' && /^(FR|DE|IT|PT)TEST/.test(p.vatId)) {
    return { checked: true, valid: true, ...p, name: 'EMPRESA DE PRUEBA', address: '', consultation: 'TEST' };
  }
  const body = { countryCode: p.cc, vatNumber: p.number };
  const own = parseVatId(env.INVOICE_TAX_ID || '', 'ES');
  if (own && own.cc === 'ES') { body.requesterMemberStateCode = 'ES'; body.requesterNumber = own.number; }
  let r;
  const ask = async (b) => {
    const res = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(b), signal: AbortSignal.timeout(8000) });
    return { res, d: await res.json().catch(() => ({})) };
  };
  try {
    let { res, d } = await ask(body);
    // Si tu NIF todavía no figura en el ROI, VIES rechaza la consulta con solicitante: se repite sin él (sin n.º de consulta)
    if (body.requesterNumber && /REQUESTER/i.test(JSON.stringify(d.errorWrappers || d.userError || ''))) {
      ({ res, d } = await ask({ countryCode: p.cc, vatNumber: p.number }));
    }
    if (!res.ok || d.actionSucceed === false || d.errorWrappers) {
      r = { checked: false, valid: false, ...p, error: (d.errorWrappers && d.errorWrappers[0]?.error) || 'unavailable' };
    } else {
      const clean = (s) => (s && s !== '---' ? String(s).trim() : '');
      r = { checked: true, valid: d.valid === true, ...p, name: clean(d.name), address: clean(d.address), consultation: clean(d.requestIdentifier) };
    }
  } catch (e) {
    r = { checked: false, valid: false, ...p, error: 'unavailable' };
  }
  if (r.checked) cache.set(p.vatId, { t: Date.now(), r });
  return r;
}

// ¿Corresponde inversión del sujeto pasivo? Empresa, número válido de un país de la UE distinto de España
export async function reverseChargeFor(env, bill, country) {
  if (!bill || bill.type !== 'company' || !bill.taxId) return null;
  const p = parseVatId(bill.taxId, country);
  if (!p || p.country === 'ES' || !EU_COUNTRIES.includes(p.country)) return null;
  const r = await checkVat(env, bill.taxId, country);
  return r.valid ? r : null;
}
