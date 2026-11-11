// README (ronda 42) · País e idioma de quien navega, para el panel, las demos y las invitaciones nuevas.
// Manda lo elegido en la web (cookies que pone src/sitio/nuevo.js al ver una carpeta de país o al elegir en el selector);
// si no hay, el país de la IP. Los precios y los impuestos NO usan esto (van siempre por la IP y los datos de facturación).
import { getCookie } from '../lib/util.js';
import { IDIOMA_INVITACION, CLAVES, claveDePais, diceBautizo } from './variantes.js';
import { varianteDePais } from '../textos/index.js';

export const paisVisitante = (request) => getCookie(request, 'pais_sel') || request.cf?.country || request.headers.get('cf-ipcountry') || '';
// Clave de texto de la web (es-ar, es-es, en…): con ella el panel se ve en la variante del visitante (sin cambiar «boda»)
export const claveVisitante = (request) => { const c = getCookie(request, 'idioma'); return CLAVES.includes(c) ? c : claveDePais(paisVisitante(request)); };
// Idioma de las invitaciones (src/textos): el de la web si es otro idioma; si es español, la variante del país
export const varianteVisitante = (request) => IDIOMA_INVITACION[claveVisitante(request)] || varianteDePais(paisVisitante(request));
// ¿Bautizo (true) o bautismo (false)? Para las demos y para lo que se completa solo en una invitación nueva
export const bautizoVisitante = (request) => diceBautizo(paisVisitante(request));
// README (ronda 44): ¿«Sweet 16» en lugar de «Sweet 15»? En inglés, en Estados Unidos y Canadá
export const sweet16Visitante = (request) => ['US', 'CA'].includes(String(paisVisitante(request)).toUpperCase()) && varianteVisitante(request) === 'en';
