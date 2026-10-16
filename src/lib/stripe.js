// Stripe Checkout sin SDK (API REST + verificación de firma del webhook).
import { hmacHex, timingSafeEqual, HttpError } from './util.js';

function form(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') form(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

async function stripe(env, method, path, body, idempotencyKey) {
  const res = await fetch('https://api.stripe.com/v1' + path, {
    method,
    headers: {
      authorization: `Bearer ${String(env.STRIPE_SECRET_KEY || '').trim()}`,
      'content-type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
    },
    body: body ? form(body) : undefined,
  }).catch((e) => { const err = new HttpError(502, 'payments.error'); err.detail = `Stripe: ${e.message}`; throw err; });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[stripe]', res.status, JSON.stringify(data));
    const err = new HttpError(502, 'payments.error');
    err.detail = `Stripe ${res.status}: ${data?.error?.message || data?.error?.code || 'error'}`;
    throw err;
  }
  return data;
}

// taxRate: id de una Tax Rate de Stripe "IVA 21 %" de tipo inclusivo (el precio ya lo incluye y el recibo lo desglosa).
// invoice: además del recibo, Stripe genera y envía una factura en PDF con el IVA desglosado (y deja cargar NIF/CIF).
// branding_settings: la página de pago sale con la marca Amo Invitar aunque la cuenta de Stripe sea compartida.
// adaptive_pricing desactivado: la web ya cobra en la moneda del visitante y la factura propia va en esa moneda.
// Sin códigos promocionales: el importe cobrado siempre coincide con el del pedido y la factura.
export function createCheckoutSession(env, { amount, currency, productName, description, email, successUrl, cancelUrl, metadata, locale = 'auto', taxRate = '', invoice = false }) {
  const site = String(env.SITE_URL || 'https://amoinvitar.com').replace(/\/$/, '');
  const item = { quantity: 1, price_data: { currency, unit_amount: amount, product_data: { name: productName, description } } };
  if (taxRate) item.tax_rates = { 0: taxRate };
  const body = {
    mode: 'payment',
    customer_email: email,
    success_url: successUrl,
    cancel_url: cancelUrl,
    locale,
    adaptive_pricing: { enabled: false },
    branding_settings: {
      display_name: 'Amo Invitar', button_color: '#7a9c7e', background_color: '#ffffff', border_style: 'pill',
      logo: { type: 'url', url: `${site}/comun/img/amoinvitar-email.png` },
      icon: { type: 'url', url: 'https://amoinvitar.com/apple-touch-icon.png' },
    },
    line_items: { 0: item },
    metadata,
    payment_intent_data: { metadata, description: productName },
  };
  if (invoice) {
    body.invoice_creation = { enabled: 'true', invoice_data: { metadata, description: productName } };
    body.tax_id_collection = { enabled: 'true' };
  }
  // Mismo pedido = misma sesión (doble clic en Pagar no crea dos)
  return stripe(env, 'POST', '/checkout/sessions', body, metadata?.order_id ? 'cs-' + metadata.order_id : undefined);
}

export function retrieveCheckoutSession(env, id) {
  return stripe(env, 'GET', '/checkout/sessions/' + encodeURIComponent(id));
}

// https://docs.stripe.com/webhooks#verify-manually
export async function verifyWebhook(env, payload, header) {
  const parts = Object.fromEntries(String(header || '').split(',').map((p) => p.split('=')));
  const t = parts.t;
  const signatures = String(header || '').split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!t || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 600) return false;
  const expected = await hmacHex(env.STRIPE_WEBHOOK_SECRET, `${t}.${payload}`);
  return signatures.some((s) => timingSafeEqual(s, expected));
}
