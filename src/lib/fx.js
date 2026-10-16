// Monedas: detección por país, cotización real (se renueva cada hora) y precios redondeados "lindos".
// Los precios de lista están en EUROS (src/catalogo.js); acá se pasan a la moneda del visitante.
// Basado en el de Albunear.
import { now } from './util.js';

export const COUNTRY_CURRENCY = {
  ES: 'EUR', PT: 'EUR', FR: 'EUR', DE: 'EUR', IT: 'EUR', AT: 'EUR', BE: 'EUR', NL: 'EUR', IE: 'EUR', LU: 'EUR', FI: 'EUR', GR: 'EUR', AD: 'EUR', MC: 'EUR',
  AR: 'ARS', UY: 'UYU', PY: 'PYG', BO: 'BOB', CL: 'CLP', PE: 'PEN', CO: 'COP', EC: 'USD', VE: 'USD', MX: 'MXN',
  CR: 'CRC', NI: 'NIO', PA: 'USD', DO: 'DOP', GT: 'GTQ', HN: 'HNL', SV: 'USD', PR: 'USD', CU: 'USD',
  US: 'USD', CA: 'CAD', BR: 'BRL', GB: 'GBP', CH: 'CHF', AU: 'AUD', NZ: 'NZD', ZA: 'ZAR', DK: 'DKK', SE: 'SEK', NO: 'NOK',
  PL: 'PLN', JP: 'JPY', SK: 'EUR', SI: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR',
};

export const CURRENCIES = ['EUR', 'USD', 'ARS', 'AUD', 'BOB', 'BRL', 'CAD', 'CHF', 'CLP', 'COP', 'CRC', 'DKK', 'DOP', 'GBP', 'GTQ', 'HNL',
  'JPY', 'MXN', 'NIO', 'NOK', 'NZD', 'PEN', 'PLN', 'PYG', 'SEK', 'UYU', 'ZAR'];

const ZERO_DECIMAL = ['CLP', 'PYG', 'JPY'];
export const isZeroDecimal = (c) => ZERO_DECIMAL.includes(c);

// Precios fijos opcionales por moneda, en unidades (reemplazan la conversión).
// Clave: la del precio en src/catalogo.js (paquete o producto). Ej.: ARS: { basic: 29900, premium: 69900 }
export const PRICE_OVERRIDES = {};

export const currencyForCountry = (country) => COUNTRY_CURRENCY[country] || 'USD';

const FALLBACK = { USD: 1, EUR: 0.92, ARS: 1400, MXN: 18.5, COP: 4100, CLP: 950, PEN: 3.75, UYU: 40, PYG: 7500, BOB: 6.9, CRC: 510, NIO: 36.7, DOP: 60, GTQ: 7.7, HNL: 25,
  BRL: 5.4, GBP: 0.78, CHF: 0.88, CAD: 1.37, AUD: 1.52, NZD: 1.68, ZAR: 18, DKK: 6.9, SEK: 10.5, NOK: 10.8, PLN: 3.95, JPY: 148 };

// Cotizaciones con base USD (open.er-api.com, gratis; con OXR_APP_ID se usa openexchangerates.org)
const FX_TTL = 3600;
async function fetchRates(env) {
  const url = env.OXR_APP_ID ? `https://openexchangerates.org/api/latest.json?app_id=${env.OXR_APP_ID}` : 'https://open.er-api.com/v6/latest/USD';
  const res = await fetch(url, { cf: { cacheTtl: 600 } }).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json();
  return data.rates && (env.OXR_APP_ID || data.result === 'success') ? data.rates : null;
}

export async function getRates(env) {
  try {
    const row = await env.DB.prepare('SELECT datos, creado FROM fx WHERE id = 1').first();
    if (row && row.creado > now() - FX_TTL) return JSON.parse(row.datos);
    const src = env.SIN_COTIZACION ? null : await fetchRates(env);
    if (src) {
      const rates = Object.fromEntries(CURRENCIES.map((c) => [c, src[c] || FALLBACK[c]]));
      await env.DB.prepare('INSERT INTO fx (id, datos, creado) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET datos = excluded.datos, creado = excluded.creado')
        .bind(JSON.stringify(rates), now()).run();
      return rates;
    }
    if (row) return JSON.parse(row.datos);
  } catch (e) {
    console.error('[fx]', e);
  }
  return FALLBACK;
}

// Redondeo comercial según el tamaño del número
function nice(v) {
  if (v < 100) return Math.max(1, Math.round(v));
  if (v < 1000) return Math.round(v / 5) * 5;
  if (v < 10000) return Math.round(v / 50) * 50;
  if (v < 100000) return Math.round(v / 500) * 500;
  return Math.round(v / 1000) * 1000;
}

// IVA en la Unión Europea (servicios digitales a particulares).
// Hasta 10.000 € al año de ventas al resto de la UE se aplica el IVA español; con VAT_OSS = "1", el de cada país.
export const EU_COUNTRIES = ['AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'];
export const HOME_VAT = 21;
export const EU_VAT_RATES = {
  AT: 20, BE: 21, BG: 20, CY: 19, CZ: 21, DE: 19, DK: 25, EE: 24, ES: 21, FI: 25.5, FR: 20, GR: 24, HR: 25, HU: 27,
  IE: 23, IT: 22, LT: 21, LU: 17, LV: 21, MT: 18, NL: 21, PL: 23, PT: 23, RO: 21, SE: 25, SI: 22, SK: 23,
};
export const isEU = (c) => EU_COUNTRIES.includes(c);
export function vatRateFor(country, env) {
  if (!isEU(country)) return 0;
  if (country !== 'ES' && env?.VAT_OSS === '1') return EU_VAT_RATES[country] || HOME_VAT;
  return HOME_VAT;
}

/**
 * Precio de lista (en euros) en una moneda.
 * Con IVA_INCLUIDO = "1" (por defecto) el precio de lista ya es el final: en la UE el IVA va dentro.
 * Con IVA_INCLUIDO = "0" en la UE se suma el IVA al precio de lista (como en Albunear).
 * Devuelve { currency, amount (para mostrar), minor (para la pasarela), vat, vatRate }
 */
export function priceIn(clave, eur, currency, rates, country, env) {
  currency = CURRENCIES.includes(currency) ? currency : 'USD';
  if (!eur) return { currency, amount: 0, minor: 0, vat: 0, vatRate: 0 };
  const r = (c) => rates[c] || FALLBACK[c];
  let amount = PRICE_OVERRIDES[currency]?.[clave] ?? (currency === 'EUR' ? eur : nice((eur / r('EUR')) * r(currency)));
  const vatRate = vatRateFor(country, env);
  let vat = 0;
  if (vatRate) {
    if (env?.IVA_INCLUIDO === '0') {
      const gross = amount * (1 + vatRate / 100);
      amount = isZeroDecimal(currency) || gross >= 100 ? nice(gross) : Math.round(gross);
    }
    vat = Math.round((amount - amount / (1 + vatRate / 100)) * 100) / 100;
  }
  const minor = isZeroDecimal(currency) ? Math.round(amount) : Math.round(amount * 100);
  return { currency, amount, minor, vat, vatRate };
}
