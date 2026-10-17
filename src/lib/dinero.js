// Formato de precios: símbolo local a la izquierda (el euro y las coronas/eslotis a la derecha, como se usan allí), sin códigos ISO.
// En el precio se usa el símbolo que usa la gente en su país ($ para los pesos);
// en el menú de monedas, uno que no se confunda (AR$, MX$, US$…).
// La misma tabla viaja al navegador en FW_CTX.money para que web, emails y pagos muestren lo mismo.

export const CURRENCY_META = {
  USD: { sym: '$', menu: 'US$', locale: 'en-US' },
  EUR: { sym: '€', menu: '€', locale: 'es-ES', after: true },
  ARS: { sym: '$', menu: 'AR$', locale: 'es-AR' },
  MXN: { sym: '$', menu: 'MX$', locale: 'es-MX' },
  COP: { sym: '$', menu: 'COL$', locale: 'es-CO' },
  CLP: { sym: '$', menu: 'CL$', locale: 'es-CL' },
  UYU: { sym: '$', menu: 'UY$', locale: 'es-UY' },
  DOP: { sym: '$', menu: 'RD$', locale: 'es-DO' },
  CUP: { sym: '$', menu: 'CU$', locale: 'es-CU' },
  PEN: { sym: 'S/', menu: 'S/', locale: 'es-PE', space: true },
  PYG: { sym: '₲', menu: '₲', locale: 'es-PY', space: true },
  BOB: { sym: 'Bs', menu: 'Bs', locale: 'es-BO', space: true },
  CRC: { sym: '₡', menu: '₡', locale: 'es-CR' },
  NIO: { sym: 'C$', menu: 'C$', locale: 'es-NI', space: true },
  GTQ: { sym: 'Q', menu: 'Q', locale: 'es-GT' },
  HNL: { sym: 'L', menu: 'L', locale: 'es-HN', space: true },
  BRL: { sym: 'R$', menu: 'R$', locale: 'pt-BR', space: true },
  GBP: { sym: '£', menu: '£', locale: 'en-GB' },
  CHF: { sym: 'Fr.', menu: 'Fr.', locale: 'de-CH', space: true },
  CAD: { sym: '$', menu: 'CA$', locale: 'en-CA' },
  AUD: { sym: '$', menu: 'A$', locale: 'en-AU' },
  NZD: { sym: '$', menu: 'NZ$', locale: 'en-NZ' },
  ZAR: { sym: 'R', menu: 'R', locale: 'en-ZA', space: true },
  DKK: { sym: 'kr.', menu: 'kr.', locale: 'da-DK', after: true },
  SEK: { sym: 'kr', menu: 'kr', locale: 'sv-SE', after: true },
  NOK: { sym: 'kr', menu: 'kr', locale: 'nb-NO', after: true },
  PLN: { sym: 'zł', menu: 'zł', locale: 'pl-PL', after: true },
  JPY: { sym: '¥', menu: '¥', locale: 'ja-JP' },
  CNY: { sym: '¥', menu: 'CN¥', locale: 'zh-CN' },
};

export function formatMoney(amount, currency) {
  const m = CURRENCY_META[currency] || { sym: currency, locale: 'en-US', space: true };
  const dec = amount % 1 ? 2 : 0;
  let n;
  try {
    n = new Intl.NumberFormat(m.locale, { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: true }).format(amount);
  } catch {
    n = String(amount);
  }
  // es-ES no agrupa los números de 4 cifras (1500): lo forzamos para que se lea igual en todos lados
  if (m.locale === 'es-ES' && /^\d{4}(,\d+)?$/.test(n)) n = n.replace(/^(\d)(\d{3})/, '$1.$2');
  if (m.after) return `${n} ${m.sym}`;
  return m.space ? `${m.sym} ${n}` : `${m.sym}${n}`;
}

// Nombre completo en plural y en el idioma del visitante: "pesos argentinos", "libras esterlinas", "euros"
export function currencyName(currency, intlLocale) {
  try {
    const parts = new Intl.NumberFormat(intlLocale, { style: 'currency', currency, currencyDisplay: 'name' }).formatToParts(2);
    const p = parts.find((x) => x.type === 'currency');
    if (p) return p.value;
  } catch {}
  return currency;
}
