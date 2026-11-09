// README (ronda 40) · Variantes del español de la web nueva, por país.
// Cada país tiene una «clave» de variante (cómo se habla: tú/vos/vosotros y las palabras de la zona):
//   es    neutro (tú · boda · bautismo · celular · computadora)          ← lo que no está en la lista
//   es-es España y Europa (tú · boda · bautizo · móvil · ordenador)
//   ar    Argentina, Uruguay, Paraguay (vos · casamiento · bautismo)
//   cr    vos centroamericano: Costa Rica, Nicaragua, Guatemala, Honduras, El Salvador (vos · boda · bautizo)
//   mx    México, Panamá, Caribe hispano, Venezuela (tú · boda · bautizo)
//   cl    Chile y Colombia (tú · matrimonio · bautizo · computador)
//   pe    Perú, Bolivia, Ecuador (tú · matrimonio · bautizo · computadora)
// Esta lista sirve a: el selector de país (public/sitio/web/js/sitio.js, se actualiza con npm run sitio), el generador de las
// páginas (scripts/sitio/variantes.mjs) y el Worker (src/sitio/nuevo.js). Va en orden alfabético por nombre.
export const PAISES = [
  ['AR', 'Argentina', 'ARS', 'ar'], ['AU', 'Australia', 'AUD', 'es'], ['AT', 'Austria', 'EUR', 'es-es'],
  ['BE', 'Bélgica', 'EUR', 'es-es'], 
  ['BO', 'Bolivia', 'BOB', 'pe'], ['BR', 'Brasil', 'BRL', 'es'], ['CA', 'Canadá', 'CAD', 'es'], ['CL', 'Chile', 'CLP', 'cl'],
  ['CO', 'Colombia', 'COP', 'cl'], ['CR', 'Costa Rica', 'CRC', 'cr'], ['CU', 'Cuba', 'USD', 'mx'], 
  ['EC', 'Ecuador', 'USD', 'pe'], ['SV', 'El Salvador', 'USD', 'cr'], ['ES', 'España', 'EUR', 'es-es'], ['US', 'Estados Unidos', 'USD', 'es'],
  ['FR', 'Francia', 'EUR', 'es-es'], ['GT', 'Guatemala', 'GTQ', 'cr'], 
  ['HT', 'Haití', 'HTG', 'es'], ['HN', 'Honduras', 'HNL', 'cr'], ['IE', 'Irlanda', 'EUR', 'es-es'], ['IT', 'Italia', 'EUR', 'es-es'],
  ['MX', 'México', 'MXN', 'mx'], ['NI', 'Nicaragua', 'NIO', 'cr'], ['NZ', 'Nueva Zelanda', 'NZD', 'es'],
  ['PA', 'Panamá', 'USD', 'mx'], ['PY', 'Paraguay', 'PYG', 'ar'], ['PE', 'Perú', 'PEN', 'pe'], ['PT', 'Portugal', 'EUR', 'es-es'],
  ['PR', 'Puerto Rico', 'USD', 'mx'], ['GB', 'Reino Unido', 'GBP', 'es-es'], ['DO', 'República Dominicana', 'DOP', 'mx'],
  ['VC', 'San Vicente y las Granadinas', 'XCD', 'es'], 
  ['UY', 'Uruguay', 'UYU', 'ar'], ['VE', 'Venezuela', 'USD', 'mx'],
  ['DE', 'Alemania', 'EUR', 'es-es'], ['NL', 'Países Bajos', 'EUR', 'es-es'], ['CH', 'Suiza', 'CHF', 'es-es'],
].sort((a, b) => a[1].localeCompare(b[1], 'es'));

export const CLAVES = ['es', 'es-es', 'ar', 'cr', 'mx', 'cl', 'pe'];
export const CLAVE_PAIS = Object.fromEntries(PAISES.map((p) => [p[0], p[3]]));
export const claveDePais = (pais) => CLAVE_PAIS[String(pais || '').toUpperCase()] || 'es';
// Código de idioma de la página (atributo lang)
export const LANG = { es: 'es', 'es-es': 'es-ES', ar: 'es-AR', cr: 'es-CR', mx: 'es-MX', cl: 'es-CL', pe: 'es-PE' };
