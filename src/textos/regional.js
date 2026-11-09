// README (ronda 40) · Formato de horas y fechas que más se usa en cada país (para las demos, las invitaciones y el panel).
//   h: 24 → «20:00hs» / «20:00 h»; 12 → «8:00 pm».   suf: cómo se abrevia «horas» en ese país (hs, h, hrs).
//   fecha: 'DMY' (día/mes/año, lo más común) o 'MDY' (mes/día/año: Estados Unidos y Puerto Rico).
import { ZONAS } from '../datos/zonas.js';

const A24 = (suf) => ({ h: 24, suf, fecha: 'DMY' });
const A12 = (fecha = 'DMY') => ({ h: 12, suf: '', fecha });
export const FORMATOS = {
  AR: A24('hs'), UY: A24('hs'), PY: A24('hs'), CL: A24(' hrs'), BO: A24(' hrs'), EC: A24(' h'),
  ES: A24(' h'), AD: A24(' h'), PT: A24(' h'), FR: A24(' h'), DE: A24(' h'), IT: A24(' h'), NL: A24(' h'), BE: A24(' h'), AT: A24(' h'), CH: A24(' h'), GB: A24(''), IE: A24(''),
  BR: A24('h'), HT: A24(' h'), SR: A24(' u'),
  MX: A12(), CO: A12(), VE: A12(), PE: A12(), DO: A12(), CR: A12(), PA: A12(), GT: A12(), SV: A12(), HN: A12(), NI: A12(), CU: A12(),
  US: A12('MDY'), PR: A12('MDY'), CA: A12(), AU: A12(), NZ: A12(),
  BS: A12(), BB: A12(), BZ: A12(), GY: A12(), JM: A12(), TT: A12(), AG: A12(), DM: A12(), GD: A12(), KN: A12(), VC: A12(), LC: A12(),
};

// Sin país conocido: lo de siempre según la variante del idioma
export function formatoPais(pais, variante = 'es') {
  const f = FORMATOS[String(pais || '').toUpperCase()];
  if (f) return f;
  return { h: variante === 'en' ? 12 : 24, suf: variante === 'es-ar' || variante === 'es-cr' ? 'hs' : ' h', fecha: 'DMY' };
}

// Nombre del país (el de la lista de zonas del panel) → código
const ISO = { Argentina: 'AR', Uruguay: 'UY', Paraguay: 'PY', Chile: 'CL', Bolivia: 'BO', Ecuador: 'EC', 'España': 'ES', Andorra: 'AD', Portugal: 'PT', Francia: 'FR', Alemania: 'DE', Italia: 'IT',
  'Países Bajos': 'NL', 'Bélgica': 'BE', Austria: 'AT', Suiza: 'CH', 'Reino Unido': 'GB', Irlanda: 'IE', Brasil: 'BR', 'Haití': 'HT', Surinam: 'SR', 'México': 'MX', Colombia: 'CO', Venezuela: 'VE', 'Perú': 'PE',
  'República Dominicana': 'DO', 'Costa Rica': 'CR', 'Panamá': 'PA', Guatemala: 'GT', 'El Salvador': 'SV', Honduras: 'HN', Nicaragua: 'NI', Cuba: 'CU', 'Estados Unidos': 'US', 'Puerto Rico': 'PR', 'Canadá': 'CA',
  Australia: 'AU', 'Nueva Zelanda': 'NZ', Bahamas: 'BS', Barbados: 'BB', Belice: 'BZ', Guyana: 'GY', Jamaica: 'JM', 'Trinidad y Tobago': 'TT', 'Antigua y Barbuda': 'AG', Dominica: 'DM', Granada: 'GD',
  'San Cristóbal y Nieves': 'KN', 'San Vicente y las Granadinas': 'VC', 'Santa Lucía': 'LC' };
// País de un evento a partir de su zona horaria (la que se elige en el panel)
export function paisDeZona(zona) {
  const z = ZONAS.find((x) => x.v === zona);
  return z ? ISO[z.pais] || null : null;
}

const mm = (n) => String(n).padStart(2, '0');
// «20:00» → «20:00hs» / «8:00 pm», según el formato del país
export function horaTexto(hh, mi, fmt, variante = 'es') {
  if (hh == null || hh === '') return '';
  const h = Number(hh);
  if (fmt.h === 12) return `${h % 12 || 12}:${mm(mi)} ${variante === 'en' ? (h < 12 ? 'AM' : 'PM') : h < 12 ? 'am' : 'pm'}`;
  return `${mm(h)}:${mm(mi)}${variante.startsWith('es') || variante === 'en' ? fmt.suf : ''}`;
}
// Una hora escrita a mano («20:00», «9:30») al formato del país; si no se entiende, se deja igual
export function horaDeTexto(txt, fmt, variante) {
  const m = /^\s*(\d{1,2})[:.](\d{2})\s*(?:h|hs|hrs)?\s*$/i.exec(String(txt || ''));
  return m && +m[1] < 24 ? horaTexto(m[1], m[2], fmt, variante) : txt;
}
