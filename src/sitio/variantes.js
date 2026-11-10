// README (ronda 42) · Países de la web nueva: cada país tiene su carpeta (/es/, /ar/, /mx/…), como el sitio viejo, con su
// idioma (y la variante del español), su moneda y sus ciudades. La raíz (/) es la versión neutra: español neutro (tú/ustedes)
// para los países que no tienen carpeta. Esta tabla la usan:
//   - scripts/sitio/construir.mjs (npm run sitio): una copia de cada página por «clave» de texto, el sitemap y el selector
//   - src/sitio/nuevo.js (Worker): arma cada página de cada país (título con el país, canonical, hreflang, links) y las redirecciones
//   - src/index.js: el idioma del panel y de las demos según el país elegido o el de la visita
//
// Claves de texto (cómo se escribe la página):
//   es     neutro: tú · boda · bautismo · celular · computadora (la raíz y Bolivia)
//   es-bz  neutro con «bautizo» (Ecuador, Caribe, Panamá, Venezuela, Estados Unidos)
//   es-mx  México: bautizo y «XV años»
//   es-es  España: tú/vosotros · móvil · ordenador · bautizo · coste
//   es-ar  rioplatense: vos · casamiento · bautismo (Argentina, Uruguay)
//   es-py  Paraguay: vos · boda · bautismo
//   es-cr  vos centroamericano: vos · boda · bautizo (Costa Rica, Nicaragua, Guatemala, Honduras, El Salvador)
//   es-cl  matrimonio · bautizo · computador (Chile, Colombia)
//   es-pe  matrimonio · bautizo (Perú)
//   en · pt-br · pt-pt · fr · it · de · nl   traducciones (scripts/sitio/i18n/)
// «casamiento / matrimonio» se usa SOLO en la web: en las demos, el panel y las invitaciones siempre «boda».
//
// [código ISO, nombre (selector, en español), moneda, clave, hreflang, nombre del país en su idioma (títulos), ciudades]
export const PAISES = [
  ['AR', 'Argentina', 'ARS', 'es-ar', 'es-AR', 'Argentina', 'Buenos Aires, Córdoba, Rosario, Mendoza y La Plata'],
  ['BO', 'Bolivia', 'BOB', 'es', 'es-BO', 'Bolivia', 'La Paz, Santa Cruz, Cochabamba y Sucre'],
  ['CL', 'Chile', 'CLP', 'es-cl', 'es-CL', 'Chile', 'Santiago, Valparaíso, Viña del Mar y Concepción'],
  ['CO', 'Colombia', 'COP', 'es-cl', 'es-CO', 'Colombia', 'Bogotá, Medellín, Cali, Barranquilla y Cartagena'],
  ['CR', 'Costa Rica', 'CRC', 'es-cr', 'es-CR', 'Costa Rica', 'San José, Alajuela, Heredia y Cartago'],
  ['CU', 'Cuba', 'USD', 'es-bz', 'es-CU', 'Cuba', 'La Habana, Santiago de Cuba y Camagüey'],
  ['DO', 'República Dominicana', 'DOP', 'es-bz', 'es-DO', 'República Dominicana', 'Santo Domingo, Santiago, Punta Cana y La Romana'],
  ['EC', 'Ecuador', 'USD', 'es-bz', 'es-EC', 'Ecuador', 'Quito, Guayaquil, Cuenca y Manta'],
  ['SV', 'El Salvador', 'USD', 'es-cr', 'es-SV', 'El Salvador', 'San Salvador, Santa Ana y San Miguel'],
  ['ES', 'España', 'EUR', 'es-es', 'es-ES', 'España', 'Madrid, Barcelona, Valencia, Sevilla y Málaga'],
  ['US', 'Estados Unidos', 'USD', 'es-bz', 'es-US', 'Estados Unidos', 'Miami, Los Ángeles, Nueva York, Houston y Chicago'],
  ['GT', 'Guatemala', 'GTQ', 'es-cr', 'es-GT', 'Guatemala', 'Ciudad de Guatemala, Antigua y Quetzaltenango'],
  ['HN', 'Honduras', 'HNL', 'es-cr', 'es-HN', 'Honduras', 'Tegucigalpa, San Pedro Sula y La Ceiba'],
  ['MX', 'México', 'MXN', 'es-mx', 'es-MX', 'México', 'Ciudad de México, Guadalajara, Monterrey, Puebla y Cancún'],
  ['NI', 'Nicaragua', 'NIO', 'es-cr', 'es-NI', 'Nicaragua', 'Managua, León y Granada'],
  ['PA', 'Panamá', 'USD', 'es-bz', 'es-PA', 'Panamá', 'Ciudad de Panamá, Colón y David'],
  ['PY', 'Paraguay', 'PYG', 'es-py', 'es-PY', 'Paraguay', 'Asunción, Ciudad del Este y Encarnación'],
  ['PE', 'Perú', 'PEN', 'es-pe', 'es-PE', 'Perú', 'Lima, Arequipa, Trujillo y Cusco'],
  ['PR', 'Puerto Rico', 'USD', 'es-bz', 'es-PR', 'Puerto Rico', 'San Juan, Bayamón y Ponce'],
  ['UY', 'Uruguay', 'UYU', 'es-ar', 'es-UY', 'Uruguay', 'Montevideo, Punta del Este, Colonia y Salto'],
  ['VE', 'Venezuela', 'USD', 'es-bz', 'es-VE', 'Venezuela', 'Caracas, Maracaibo, Valencia y Barquisimeto'],
  // Otros idiomas
  ['DE', 'Alemania', 'EUR', 'de', 'de-DE', 'Deutschland', 'Berlin, München, Hamburg und Köln'],
  ['AT', 'Austria', 'EUR', 'de', 'de-AT', 'Österreich', 'Wien, Graz, Salzburg und Innsbruck'],
  ['CH', 'Suiza', 'CHF', 'de', 'de-CH', 'Schweiz', 'Zürich, Basel, Bern und Luzern'],
  ['AU', 'Australia', 'AUD', 'en', 'en-AU', 'Australia', 'Sydney, Melbourne, Brisbane and Perth'],
  ['CA', 'Canadá', 'CAD', 'en', 'en-CA', 'Canada', 'Toronto, Vancouver, Montreal and Calgary'],
  ['IE', 'Irlanda', 'EUR', 'en', 'en-IE', 'Ireland', 'Dublin, Cork, Galway and Limerick'],
  ['NZ', 'Nueva Zelanda', 'NZD', 'en', 'en-NZ', 'New Zealand', 'Auckland, Wellington, Christchurch and Queenstown'],
  ['GB', 'Reino Unido', 'GBP', 'en', 'en-GB', 'United Kingdom', 'London, Manchester, Edinburgh and Birmingham'],
  ['VC', 'San Vicente y las Granadinas', 'XCD', 'en', 'en-VC', 'St Vincent', 'Kingstown, Bequia and the Grenadines'],
  ['BR', 'Brasil', 'BRL', 'pt-br', 'pt-BR', 'Brasil', 'São Paulo, Rio de Janeiro, Belo Horizonte e Brasília'],
  ['PT', 'Portugal', 'EUR', 'pt-pt', 'pt-PT', 'Portugal', 'Lisboa, Porto, Braga e Faro'],
  ['FR', 'Francia', 'EUR', 'fr', 'fr-FR', 'France', 'Paris, Lyon, Marseille et Bordeaux'],
  ['BE', 'Bélgica', 'EUR', 'fr', 'fr-BE', 'Belgique', 'Bruxelles, Liège, Namur et Charleroi'],
  ['HT', 'Haití', 'HTG', 'fr', 'fr-HT', 'Haïti', 'Port-au-Prince, Cap-Haïtien et Jacmel'],
  ['IT', 'Italia', 'EUR', 'it', 'it-IT', 'Italia', 'Roma, Milano, Firenze e Napoli'],
  ['NL', 'Países Bajos', 'EUR', 'nl', 'nl-NL', 'Nederland', 'Amsterdam, Rotterdam, Den Haag en Utrecht'],
].sort((a, b) => a[1].localeCompare(b[1], 'es'));

// Estados Unidos tiene además la versión en inglés: /us/en/ (la de /us/ es en español, como en el sitio viejo)
export const SECUNDARIAS = [['US', 'en', 'en-US', 'United States', 'Miami, Los Angeles, New York, Houston and Chicago']];

// Una «sede» es cada versión de la web: la raíz neutra, cada carpeta de país y las secundarias (/us/en/)
//   { pais, carpeta ('' | '/ar' | '/us/en'), clave, lang, nombre (en su idioma), ciudades, moneda }
export const NEUTRA = { pais: '', carpeta: '', clave: 'es', lang: 'es', nombre: '', ciudades: '', moneda: 'EUR' };
export const SEDES = [NEUTRA,
  ...PAISES.map(([pais, , moneda, clave, lang, nombre, ciudades]) => ({ pais, carpeta: `/${pais.toLowerCase()}`, clave, lang, nombre, ciudades, moneda })),
  ...SECUNDARIAS.map(([pais, clave, lang, nombre, ciudades]) => ({ pais, carpeta: `/${pais.toLowerCase()}/${clave}`, clave, lang, nombre, ciudades, moneda: PAISES.find((p) => p[0] === pais)[2] })),
];
export const CLAVES = [...new Set(SEDES.map((s) => s.clave))];
// Sede de un país (y del idioma del navegador, para /us/en/). Sin carpeta: null
export function sedeDePais(pais, idiomaNavegador = '') {
  const p = String(pais || '').toUpperCase();
  const sec = SEDES.find((s) => s.pais === p && s.carpeta.split('/').length > 2 && String(idiomaNavegador).toLowerCase().startsWith(s.clave));
  return sec || SEDES.find((s) => s.pais === p && s.carpeta.split('/').length === 2) || null;
}
export const sedeDeCarpeta = (carpeta) => SEDES.find((s) => s.carpeta === carpeta) || null;
export const claveDePais = (pais) => sedeDePais(pais)?.clave || 'es';
// Atributo lang de la página
export const LANG = Object.fromEntries(CLAVES.map((c) => [c, c === 'es' ? 'es' : (SEDES.find((s) => s.clave === c)?.lang || c)]));
// og:locale (es_ES, en_GB…)
export const ogLocale = (lang) => (lang === 'es' ? 'es_LA' : lang.replace('-', '_'));
// Idioma de las invitaciones (src/textos) para el panel y las demos de quien navega en otro idioma
export const IDIOMA_INVITACION = { en: 'en', 'pt-br': 'pt', 'pt-pt': 'pt', fr: 'fr', it: 'it', de: 'de', nl: 'nl' };
// ¿En este país se dice «bautizo»? (en Argentina, Uruguay, Paraguay y Bolivia, «bautismo»; en lo neutro también)
const BAUTISMO = new Set(['AR', 'UY', 'PY', 'BO']);
export const diceBautizo = (pais) => { const s = sedeDePais(pais); return !!s && s.clave.startsWith('es') && !BAUTISMO.has(String(pais).toUpperCase()); };
