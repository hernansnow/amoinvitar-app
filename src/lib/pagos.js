// Medios de pago: Stripe (tarjetas, Apple Pay, Google Pay), Mercado Pago y transferencia bancaria.
//  - Argentina: solo Mercado Pago (tarjetas, saldo, cuotas) y transferencia. Nada de Stripe.
//  - Transferencia: solo para Argentina, Uruguay, España y los países del euro, y en la misma moneda
//    que el resto de los medios (si hay una cuenta cargada para esa moneda en TRANSFER_INFO).
//  - Resto del mundo: Stripe y PayPal, en la moneda elegida por el visitante.
import { HttpError } from './util.js';
import { PAYPAL_CURRENCIES } from './paypal.js';

export const EUROZONE = ['ES', 'PT', 'FR', 'DE', 'IT', 'AT', 'BE', 'NL', 'IE', 'LU', 'FI', 'GR', 'SK', 'SI', 'EE', 'LV', 'LT', 'MT', 'CY', 'HR', 'AD', 'MC', 'SM', 'VA'];
export const TRANSFER_COUNTRIES = ['AR', 'UY', ...EUROZONE];

// Monedas en las que cobra cada medio (si la elegida no está, se usa la primera)
export const METHOD_CURRENCIES = {
  stripe: ['USD', 'EUR', 'MXN', 'COP', 'CLP', 'PEN', 'UYU', 'PYG', 'BOB', 'CRC', 'NIO', 'DOP', 'GTQ', 'HNL', 'BRL', 'GBP', 'CHF', 'CAD',
    'AUD', 'NZD', 'ZAR', 'DKK', 'SEK', 'NOK', 'PLN', 'JPY', 'CNY'],
  mercadopago: ['ARS'],
};

// Cuentas para transferencia por moneda en la variable TRANSFER_INFO (JSON), por ejemplo:
// {"EUR":"Titular: …\nIBAN: ES00 …","ARS":"Alias: …\nCBU: 0000…"}
// (También acepta las claves viejas por país: ES, AR, UY.)
const LEGACY = { ES: 'EUR', AR: 'ARS', UY: 'UYU' };
// Forma simple (recomendada): una variable por moneda, TRANSFER_EUR / TRANSFER_ARS / TRANSFER_UYU,
// separando las líneas con " | ". Ej.: "Titular: Hernán … | Banco: … | IBAN: ES00 …"
export function transferInfo(env, currency) {
  const simple = env['TRANSFER_' + currency];
  if (simple && String(simple).trim()) return String(simple).split(/\s*\|\s*|\\n|\n/).map((l) => l.trim()).filter(Boolean).join('\n');
  try {
    const all = JSON.parse(env.TRANSFER_INFO || '{}');
    if (all[currency]) return all[currency];
    const k = Object.keys(LEGACY).find((c) => LEGACY[c] === currency && all[c]);
    return k ? all[k] : null;
  } catch {
    return null;
  }
}

const argentina = (country, currency) => country === 'AR' || currency === 'ARS';

// Medios disponibles para un país y la moneda elegida, con la moneda en la que cobra cada uno
export function methodsFor(env, country, currency) {
  const fake = env.DEV_FAKE_PAYMENTS === '1';
  const out = [];
  if (argentina(country, currency)) {
    if (env.MP_ACCESS_TOKEN || fake) out.push({ id: 'mercadopago', currency: 'ARS' });
  } else {
    if (env.STRIPE_SECRET_KEY || fake) {
      const allowed = METHOD_CURRENCIES.stripe;
      out.push({ id: 'stripe', currency: allowed.includes(currency) ? currency : 'USD' });
    }
    // PayPal en todos los países menos Argentina (si la moneda no la acepta, en dólares)
    if ((env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET) || fake) {
      out.push({ id: 'paypal', currency: PAYPAL_CURRENCIES.includes(currency) ? currency : 'USD' });
    }
  }
  // La transferencia va en la misma moneda que la tarjeta
  const cur = out[0]?.currency || currency;
  if (TRANSFER_COUNTRIES.includes(country) && transferInfo(env, cur)) out.push({ id: 'transfer', currency: cur });
  return out;
}

// ---------------------------------------------------------------- Mercado Pago (Checkout Pro)
async function mp(env, method, path, body) {
  const res = await fetch('https://api.mercadopago.com' + path, {
    method,
    headers: { authorization: `Bearer ${String(env.MP_ACCESS_TOKEN || '').trim()}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).catch((e) => { const err = new HttpError(502, 'payments.error'); err.detail = `Mercado Pago: ${e.message}`; throw err; });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[mercadopago]', res.status, JSON.stringify(data));
    const err = new HttpError(502, 'payments.error');
    err.detail = `Mercado Pago ${res.status}: ${data?.message || data?.error || 'error'}${data?.cause?.[0]?.description ? ' · ' + data.cause[0].description : ''}`;
    throw err;
  }
  return data;
}

export function createMpPreference(env, { title, amount, currency, email, orderId, successUrl, failureUrl, notificationUrl }) {
  return mp(env, 'POST', '/checkout/preferences', {
    items: [{ id: orderId, title, quantity: 1, unit_price: amount, currency_id: currency }],
    payer: { email },
    external_reference: orderId,
    back_urls: { success: successUrl, pending: successUrl, failure: failureUrl },
    auto_return: 'approved',
    notification_url: notificationUrl,
    statement_descriptor: 'AMOINVITAR',
  });
}

export function getMpPayment(env, id) {
  return mp(env, 'GET', '/v1/payments/' + encodeURIComponent(id));
}

export async function findMpApproved(env, orderId) {
  const data = await mp(env, 'GET', '/v1/payments/search?external_reference=' + encodeURIComponent(orderId));
  return (data.results || []).find((p) => p.status === 'approved') || null;
}
