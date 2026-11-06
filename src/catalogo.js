// Catálogo y precios de Amo Invitar 2.0. Moneda base: euros (EUR), CON el IVA español incluido (lo que paga Europa).
// Los precios son iguales para todos los tipos de evento. Para el resto del mundo, src/lib/fx.js saca el IVA,
// aplica el descuento del país y pasa a su moneda (Argentina: los planes con precio fijo en pesos).

export const MONEDA = 'EUR';

// ── Invitaciones web ────────────────────────────────────────────────────
export const PAQUETES = {
  gratis: { precio: 0, base: 'basic', invitados: 35, diasOnlineTrasEvento: 15, permite: { paleta: false, tipografia: false } },
  basic: { precio: 29 },
  premium: { precio: 45 },
  deluxe: { precio: 70, incluye: ['albunear'] },
};

// README (ronda 32): el plan Gratis admite hasta 35 invitados en la lista (el servidor y el panel lo aplican)
export const LIMITE_INVITADOS = { gratis: PAQUETES.gratis.invitados };

// Lo que se muestra en la tienda para cada paquete
export const NOMBRES_PAQUETE = { gratis: 'Gratis', basic: 'Basic', premium: 'Premium', deluxe: 'Deluxe' };
// (el cuadro de contenido de cada plan: ronda 24)
export const RESUMEN_PAQUETES = {
  gratis: ['Portada personalizada, idioma y acceso con PIN', 'Agenda multiplataforma y ubicación con mapa', 'Confirmación de asistencia, libro de mensajes y recordatorios', 'Dress code', 'Panel de administración y cambios ilimitados', 'Hasta 35 invitados · online hasta 15 días después del evento'],
  basic: ['Todo lo de Gratis', 'Galería de fotos', 'Invitados ilimitados', 'Online hasta 3 meses después del evento'],
  premium: ['Todo lo de Basic', 'Apertura animada, música de fondo y cuenta regresiva', 'Historia', 'Regalos, datos bancarios y lista de regalos', 'Instagram Wall y hashtag', 'Lista de invitados con nombre, link personal, pases y grupo familiar', 'Tarjeta Save The Date', 'Soporte prioritario', 'Online hasta 6 meses después del evento'],
  deluxe: ['Todo lo de Premium', 'Sugerencias de vestimenta', 'Itinerario, testigos/padrinos, traslado y hospedaje', 'Playlist de Spotify y redes oficiales', 'Organizador de mesas y "Buscá tu mesa"', 'Organizador de llegadas con pase de entrada', 'Álbum colaborativo QR', 'Online hasta 12 meses después del evento'],
};

// Diseño a medida para todo tipo de evento (también infantiles y empresas). README (ronda 27): ya no hay "personaje favorito"
export const A_MEDIDA = {
  // Diseño personalizado e invitación para empresas: 140 € (con todo lo de Deluxe)
  personalizado: { premium: 140, deluxe: 140 },
  empresarial: { premium: 140, deluxe: 140 },
};

// ── Recuerdo (README ronda 36): lo que se puede conservar cuando la invitación termina su tiempo online ──
export const RECUERDO = {
  pdf: { precio: 10, nombre: 'Recuerdo en PDF', corto: 'Vista estática para guardar', texto: 'Una vista fija de tu invitación, como un álbum de recuerdo, para guardar en PDF e imprimir si quieres. No se mueve ni necesita internet.' },
  web: { precio: 25, nombre: 'Página web para descargar', corto: 'Interactiva, para siempre en tu equipo', texto: 'Tu invitación interactiva en una carpeta (ZIP): la abres con tu navegador cuando quieras, sin conexión y sin fecha de vencimiento. Se ve como la original; las funciones que necesitan internet (confirmaciones, álbum, mapa) quedan inactivas.' },
  online: { precio: 30, nombre: 'Permanencia online ilimitada', corto: 'Tu link, online para siempre', texto: 'Tu invitación sigue online en el mismo link, sin fecha de vencimiento, para que puedas volver a verla y compartirla cuando quieras.' },
};

// ── Otros productos ─────────────────────────────────────────────────────
export const PRODUCTOS = {
  // Modelos simples de una pantalla (se elige el diseño en el panel; Party es de 15 años)
  'compromiso-web': { precio: 20, nombre: 'Invitación web simple · Civil, Compromiso, Pedida de mano o Party' },
  'std-web': { precio: 20, nombre: 'STD Web' },
  'std-web-medida': { precio: 70, nombre: 'Save The Date web · diseño a medida' },
  'std-tarjeta': { precio: 15, nombre: 'Save The Date · tarjeta' },
  'std-foto': { precio: 18, nombre: 'Save The Date · foto' },
  'std-tarjeta-medida': { precio: 50, nombre: 'Save The Date · tarjeta con diseño personalizado' },
  agradecimiento: { precio: 18, nombre: 'Tarjeta de agradecimiento' },
};

// ── Extras de la invitación ─────────────────────────────────────────────
export const EXTRAS = {
  idioma: { precio: 10, nombre: 'Idioma adicional' },
  // Cambios de diseño: colores y tipografía juntos, un solo precio
  diseno: { precio: 18, nombre: 'Cambios de diseño (colores y tipografía)' },
  // Tarjetas (complementos de la invitación): la Save The Date del modelo va incluida en Premium y Deluxe;
  // las tarjetas con foto (Save The Date y agradecimiento) se pagan aparte en cualquier plan
  'std-tarjeta': { precio: 15, nombre: 'Tarjeta Save The Date', gratisDesde: 'premium' },
  'std-foto': { precio: 18, nombre: 'Tarjeta Save The Date con foto' },
  // Save The Date web (Classic o Soft) de la invitación de boda o 15, con su propio link
  'std-web': { precio: 20, nombre: 'Save The Date web' },
  agradecimiento: { precio: 18, nombre: 'Tarjeta de agradecimiento' },
  // README (ronda 28): Save The Date con diseño a medida, como complemento de cualquier invitación
  'std-tarjeta-medida': { precio: 50, nombre: 'Save The Date · tarjeta con diseño a medida' },
  'std-web-medida': { precio: 70, nombre: 'Save The Date web · diseño a medida' },
  // Video propio en la portada: se paga aparte en todos los planes y modelos (Cinema incluido)
  'video-portada': { precio: 8, nombre: 'Video de portada' },
};

// Qué paquete hace falta para cada sección (para el "Pasate a Premium/Deluxe")
export const SECCION_MINIMA = {
  historia: 'premium', galeria: 'basic', rsvp: 'basic', dresscode: 'basic', estilos: 'deluxe',
  instagram: 'premium', playlist: 'deluxe', album: 'deluxe', canciones: 'premium', regalos: 'premium', sobre: 'premium', musica: 'premium', cuenta: 'premium',
  hospedaje: 'deluxe', bus: 'deluxe', itinerario: 'deluxe', testigos: 'deluxe', redes: 'deluxe', 'dress-sugerencias': 'deluxe',
};

// Modelos disponibles en el plan gratis (README ronda 28: solo Floral, Euforia y Armonía)
export const MODELOS_GRATIS = ['floral', 'euforia', 'armonia'];

// Nombres de los modelos según el evento (el mismo diseño, otro nombre)
export const EQUIVALENCIAS_15 = { lovestory: 'luxury', elegance: 'style', garden: 'eucalipto', civil: 'party' };
export const EXCLUSIVOS = { sweet: ['15'], vintage: ['boda'] };

// Productos que se pueden comprar directo (el video se cotiza aparte)
export const comprable = (producto) => producto === 'invitacion' || (PRODUCTOS[producto] && !PRODUCTOS[producto].manual);

// Precio de lista en euros de un pedido de la tienda
export function precioPedido({ producto = 'invitacion', paquete, aMedida = null, extras = [] }) {
  if (producto === 'invitacion' || producto === 'a-medida') return precioInvitacion({ paquete, aMedida, extras: paquete === 'gratis' ? [] : extras });
  const p = PRODUCTOS[producto];
  if (!p || p.manual) throw new Error(`Producto no disponible: ${producto}`);
  return extras.filter((e) => e === 'idioma').reduce((t) => t + EXTRAS.idioma.precio, p.precio);
}

export function precioInvitacion({ paquete, aMedida = null, extras = [] }) {
  const base = aMedida ? A_MEDIDA[aMedida]?.[paquete] : PAQUETES[paquete]?.precio;
  if (base == null) throw new Error(`Paquete desconocido: ${paquete}`);
  return extras.reduce((total, e) => total + (EXTRAS[e]?.precio ?? 0), base);
}

// ── Profesionales (planners, fotógrafos, salones, agencias) ─────────────
// README (ronda 33): precios de lista en euros. Solo es la definición: el tablero /empresa y el cobro están por armarse
// (docs/empresas.md). Un crédito = una invitación publicada de cualquier paquete (hasta Deluxe) y cualquier modelo.
// No cubre: diseño a medida, cambio de diseño, idioma adicional ni complementos (se contratan aparte).
export const PROFESIONALES = {
  credito: 25,
  pro: {
    nombre: 'Pro', pase: 0, administradores: 2, marcaBlanca: false, dominioPropio: false,
    packs: [{ creditos: 5, precio: 115 }, { creditos: 10, precio: 200 }],
  },
  studio: {
    nombre: 'Studio', pase: 99, administradores: 10, marcaBlanca: true, dominioPropio: true,
    configuracionDominio: 49, dominioSinCargoDesdePack: 100, // el dominio propio es gratis con el pack de 100 créditos
    packs: [{ creditos: 10, precio: 170 }, { creditos: 25, precio: 375 }, { creditos: 50, precio: 650 }, { creditos: 100, precio: 1100 }],
  },
};
