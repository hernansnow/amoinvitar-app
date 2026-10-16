// Catálogo y precios de Amo Invitar 2.0. Moneda base: euros (EUR).
// Los precios son iguales para todos los tipos de evento. La conversión a la
// moneda del visitante (y los ajustes por país) se suman en la tienda.

export const MONEDA = 'EUR';

// ── Invitaciones web ────────────────────────────────────────────────────
export const PAQUETES = {
  gratis: { precio: 0, base: 'basic', invitados: 50, diasOnlineTrasEvento: 15, permite: { paleta: false, tipografia: false } },
  basic: { precio: 25 },
  premium: { precio: 65 },
  deluxe: { precio: 110, incluye: ['albunear'] },
};

// Diseño a medida (también eventos empresariales) y personaje favorito (infantiles)
export const A_MEDIDA = {
  personalizado: { premium: 170, deluxe: 220 },
  personaje: { premium: 130, deluxe: 180 },
};

// ── Otros productos ─────────────────────────────────────────────────────
export const PRODUCTOS = {
  'compromiso-web': { precio: 15, nombre: 'Compromiso / pedida de mano / civil' },
  'std-web': { precio: 15, nombre: 'Save The Date web (Soft, Classic) · Compromiso · Pedida · Civil · Party' },
  'std-web-medida': { precio: 70, nombre: 'Save The Date web · diseño a medida' },
  'std-tarjeta': { precio: 12, nombre: 'Save The Date · tarjeta' },
  'std-foto': { precio: 15, nombre: 'Save The Date · foto' },
  'std-tarjeta-medida': { precio: 50, nombre: 'Save The Date · tarjeta con diseño personalizado' },
  'std-video': { desde: 50, manual: true, nombre: 'Save The Date · video' },
  agradecimiento: { precio: 15, nombre: 'Tarjeta de agradecimiento' },
};

// ── Extras de la invitación ─────────────────────────────────────────────
export const EXTRAS = {
  idioma: { precio: 20, nombre: 'Idioma adicional' },
  paleta: { precio: 25, nombre: 'Cambio de paleta de colores' },
  tipografia: { precio: 10, nombre: 'Cambio de tipografía' },
  'regalos-simbolicos': { precio: 25, nombre: 'Lista de regalos simbólica' },
};

// Qué paquete hace falta para cada sección (para el "Pasate a Premium/Deluxe")
export const SECCION_MINIMA = {
  historia: 'basic', galeria: 'basic', rsvp: 'basic', dresscode: 'basic',
  album: 'premium', canciones: 'premium', regalos: 'premium', sobre: 'premium', musica: 'premium', cuenta: 'premium',
  hospedaje: 'deluxe', bus: 'deluxe', itinerario: 'deluxe', testigos: 'deluxe', redes: 'deluxe', 'dress-sugerencias': 'deluxe',
};

// Modelos disponibles en el plan gratis
export const MODELOS_GRATIS = ['oliva', 'armonia', 'white', 'minimal', 'floral'];

// Nombres de los modelos según el evento (el mismo diseño, otro nombre)
export const EQUIVALENCIAS_15 = { lovestory: 'luxury', elegance: 'style', garden: 'eucalipto', civil: 'party' };
export const EXCLUSIVOS = { sweet: ['15'], vintage: ['boda'] };

export function precioInvitacion({ paquete, aMedida = null, extras = [] }) {
  const base = aMedida ? A_MEDIDA[aMedida]?.[paquete] : PAQUETES[paquete]?.precio;
  if (base == null) throw new Error(`Paquete desconocido: ${paquete}`);
  return extras.reduce((total, e) => total + (EXTRAS[e]?.precio ?? 0), base);
}
