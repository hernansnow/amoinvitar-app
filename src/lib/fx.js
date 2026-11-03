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

// Precios fijos por moneda, en unidades (reemplazan la conversión). Clave: la del precio en src/catalogo.js.
// Argentina: los planes con su precio propio; el resto de los productos, con el descuento del país.
export const PRICE_OVERRIDES = { ARS: { basic: 25000, premium: 45000, deluxe: 66000 } };

// Descuento por país (después de sacar el IVA español). Puerto Rico, Estados Unidos y el resto del mundo: sin descuento.
export const DESCUENTO_PAIS = {
  AR: 30,
  CL: 15, CR: 15, PA: 15, DO: 15, UY: 15,
  BR: 20, CO: 20, SV: 20, EC: 20, GT: 20, MX: 20, PY: 20, PE: 20,
  BO: 25, HN: 25, NI: 25,
};
// Europa fuera de la UE: el mismo precio que en la UE (en euros con IVA, o su equivalente)
export const EUROPA_OTROS = ['GB', 'CH', 'NO', 'IS', 'LI', 'AD', 'MC', 'SM', 'VA', 'ME', 'AL', 'MK', 'RS', 'BA', 'MD', 'UA', 'XK'];

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
 * Precio de lista (en euros, CON el IVA español incluido) en la moneda y el país del visitante.
 *  - Europa (UE y el resto): el precio de lista; en la UE el IVA va dentro (en euros, o su equivalente redondeado).
 *  - Resto del mundo: sin el IVA español, con el descuento del país (DESCUENTO_PAIS), pasado a su moneda y redondeado.
 *  - Argentina: los planes con precio fijo en pesos (PRICE_OVERRIDES).
 * opciones.sinIva: empresa de la UE con IVA válido (se le saca el IVA).
 * Devuelve { currency, amount (para mostrar), minor (para la pasarela), vat, vatRate }
 */
export function priceIn(clave, eur, currency, rates, country, env, opciones = {}) {
  currency = CURRENCIES.includes(currency) ? currency : 'USD';
  if (!eur) return { currency, amount: 0, minor: 0, vat: 0, vatRate: 0 };
  const r = (c) => rates[c] || FALLBACK[c];
  const europa = isEU(country) || EUROPA_OTROS.includes(country);
  const sinIva = !europa || opciones.sinIva;
  const base = (sinIva ? eur / (1 + HOME_VAT / 100) : eur) * (1 - (DESCUENTO_PAIS[country] || 0) / 100);
  const fijo = country === 'AR' ? PRICE_OVERRIDES[currency]?.[clave] : undefined;
  const enMoneda = currency === 'EUR' ? base : (base / r('EUR')) * r(currency);
  // En euros con IVA (Europa) el precio queda tal cual; si se convierte o se saca el IVA, se redondea
  let amount = fijo ?? (currency === 'EUR' && !sinIva ? Math.round(enMoneda * 100) / 100 : nice(enMoneda));
  const vatRate = isEU(country) && !opciones.sinIva ? vatRateFor(country, env) : 0;
  const vat = vatRate ? Math.round((amount - amount / (1 + vatRate / 100)) * 100) / 100 : 0;
  const minor = isZeroDecimal(currency) ? Math.round(amount) : Math.round(amount * 100);
  return { currency, amount, minor, vat, vatRate };
}
