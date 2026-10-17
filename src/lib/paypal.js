// PayPal (Orders API v2): el cliente aprueba el pago en PayPal y, al volver, lo capturamos.
// Credenciales: PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET (secretos). PAYPAL_ENV=sandbox para pruebas.
import { HttpError } from './util.js';

// Monedas que PayPal acepta (CNY solo para cuentas chinas, por eso no está)
export const PAYPAL_CURRENCIES = ['AUD', 'BRL', 'CAD', 'CHF', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HUF', 'ILS', 'JPY', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'SEK', 'SGD', 'THB', 'TWD', 'USD'];
const NO_DECIMALS = ['HUF', 'JPY', 'TWD'];

const base = (env) => (env.PAYPAL_ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com');

async function token(env) {
  const res = await fetch(base(env) + '/v1/oauth2/token', {
    method: 'POST',
    headers: { authorization: 'Basic ' + btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`), 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.error('[paypal] token', res.status, data);
    throw new HttpError(502, 'payments.error');
  }
  return data.access_token;
}

async function call(env, method, path, body) {
  const res = await fetch(base(env) + path, {
    method,
    headers: { authorization: `Bearer ${await token(env)}`, 'content-type': 'application/json', prefer: 'return=representation' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[paypal]', method, path, res.status, data);
    throw new HttpError(502, 'payments.error');
  }
  return data;
}

// Crea la orden y devuelve { id, approveUrl }
export async function createPaypalOrder(env, { orderId, title, amount, currency, returnUrl, cancelUrl, locale }) {
  const value = NO_DECIMALS.includes(currency) ? String(Math.round(amount)) : Number(amount).toFixed(2);
  const data = await call(env, 'POST', '/v2/checkout/orders', {
    intent: 'CAPTURE',
    purchase_units: [{ reference_id: orderId, custom_id: orderId, description: title.slice(0, 127), amount: { currency_code: currency, value } }],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: 'Amo Invitar', user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING',
          return_url: returnUrl, cancel_url: cancelUrl, ...(locale ? { locale } : {}),
        },
      },
    },
  });
  const link = (data.links || []).find((l) => l.rel === 'payer-action' || l.rel === 'approve');
  if (!link) throw new HttpError(502, 'payments.error');
  return { id: data.id, approveUrl: link.href };
}

// Captura el pago aprobado. Devuelve true si quedó cobrado.
export async function capturePaypalOrder(env, paypalId) {
  const current = await call(env, 'GET', `/v2/checkout/orders/${encodeURIComponent(paypalId)}`);
  if (current.status === 'COMPLETED') return true;
  if (current.status !== 'APPROVED') return false;
  const data = await call(env, 'POST', `/v2/checkout/orders/${encodeURIComponent(paypalId)}/capture`, {});
  return data.status === 'COMPLETED';
}
