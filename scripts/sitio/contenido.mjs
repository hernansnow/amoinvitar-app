// README (ronda 32) · Contenido de la web nueva, en un solo lugar (español neutro: tú/ustedes, celular, computadora).
// Lo usa construir.mjs para armar todas las páginas con los mismos textos. Cambiar acá y volver a correr: npm run sitio

export const SITIO = 'https://amoinvitar.com';
export const WHATSAPP = 'https://wa.me/message/57HQCKAMGELDG1';
export const EMAIL = 'hola@amoinvitar.com';
export const VIDEO = 'https://player.vimeo.com/video/1220158519?color=FF9278&title=0&byline=0&portrait=0&dnt=1';

// ── Íconos (trazo de 24×24) ─────────────────────────────────────────────
export const ICONOS = {
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.7a3.5 3.5 0 010 6.6M18 14.8c2 .6 3.2 2.3 3.5 5.2"/>',
  'user-check': '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 11l2 2 4-4"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.800 12 21 12 21z"/><circle cx="12" cy="9.500" r="2.500"/>',
  send: '<path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8M8.500 8C6 8 6 4.500 8.500 4.500 10.500 4.500 12 8 12 8s1.500-3.500 3.500-3.500C18 4.500 18 8 15.500 8"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.500" cy="18" r="2.500"/><circle cx="17.500" cy="16" r="2.500"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.200" cy="6.800" r=".6"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4"/>',
  shirt: '<path d="M8 3l-5 3 2.500 4L8 9v12h8V9l2.500 1L21 6l-5-3a4 4 0 01-8 0z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  play: '<path d="M7 4.500v15l13-7.500z"/>',
  utensils: '<path d="M7 3v8M4 3v5a3 3 0 006 0V3M7 11v10M17 21V3c-2.500 1-4 4-4 8h4"/>',
  bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 21v-3M16 21v-3M8 15v.01M16 15v.01"/>',
  hotel: '<path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6M8 10h.01M12 10h.01M16 10h.01"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 018 0v3"/>',
  heart: '<path d="M12 20s-8-4.800-8-11a4.500 4.500 0 018-2.800A4.500 4.500 0 0120 9c0 6.200-8 11-8 11z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  shield: '<path d="M12 3l8 3v6c0 4.500-3.300 8-8 9-4.700-1-8-4.500-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="3"/><path d="M16 10l5-3v10l-5-3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 8l9 6 9-6"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  mesa: '<circle cx="12" cy="12" r="5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.600 5.600L7 7M17 17l1.400 1.400M5.600 18.400L7 17M17 7l1.400-1.400"/>',
  ticket: '<path d="M3 9a2 2 0 002-2V6h14v1a2 2 0 002 2v6a2 2 0 00-2 2v1H5v-1a2 2 0 00-2-2z"/><path d="M14 6v12" stroke-dasharray="2 2.500"/>',
  star: '<path d="M12 3l2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9z"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="M8.500 14L7 21l5-3 5 3-1.500-7"/>',
  banco: '<path d="M3 10l9-6 9 6M5 10v8M9.500 10v8M14.500 10v8M19 10v8M3 21h18"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>',
  sparkles: '<path d="M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800zM19 16l.8 2.200L22 19l-2.200.8L19 22l-.8-2.200L16 19l2.200-.8z"/>',
  edit: '<path d="M4 20h4L19 9a2.800 2.800 0 00-4-4L4 16z"/><path d="M13.500 6.500l4 4"/>',
  eye: '<path d="M2 12s3.700-7 10-7 10 7 10 7-3.700 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="3"/><path d="M11 18h2"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.500" cy="8.500" r="1"/>',
  leaf: '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15M5 19l8-8"/>',
  mensaje: '<path d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1h-9l-5 4v-4H4a1 1 0 01-1-1V6a1 1 0 011-1z"/>',
  link: '<path d="M10 14a4.500 4.500 0 006.400 0l3-3a4.500 4.500 0 00-6.400-6.400l-1 1M14 10a4.500 4.500 0 00-6.400 0l-3 3a4.500 4.500 0 006.400 6.400l1-1"/>',
  excel: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8l4 5M12 8l-4 5M8 17h8"/>',
  instagramw: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/>',
  facebook: '<path d="M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.500A.5.500 0 0114 8z"/>',
  youtube: '<rect x="2.500" y="5.500" width="19" height="13" rx="4"/><path d="M10 9.500v5l4.500-2.500z"/>',
};
// WhatsApp (relleno)
export const WA_PATH = 'M12.04 2a9.9 9.9 0 00-8.5 15l-1.4 5 5.2-1.360A9.900 9.900 0 1012.040 2zm5.700 14.100c-.24.680-1.400 1.300-1.940 1.380-.5.080-1.120.1-1.800-.12-.42-.14-.96-.32-1.640-.62-2.900-1.260-4.800-4.200-4.940-4.400-.14-.2-1.180-1.560-1.180-2.980s.74-2.120 1-2.400c.26-.3.58-.36.76-.36h.54c.18 0 .4-.04.62.5.24.58.8 2 .88 2.140.06.14.1.3.02.5-.1.2-.14.3-.28.48-.14.160-.3.360-.42.480-.14.140-.28.300-.12.580.16.280.7 1.160 1.520 1.880 1.040.94 1.940 1.220 2.220 1.360.28.140.44.120.6-.08.18-.2.7-.8.9-1.080.2-.28.38-.24.640-.14.26.1 1.660.78 1.940.92.28.14.46.2.54.32.06.1.06.7-.18 1.380z';

// ── Eventos ─────────────────────────────────────────────────────────────
// tuEvento: cómo se nombra en los textos · tipo: el del widget de diseños · img: foto de la tarjeta
export const EVENTOS = [
  { id: 'boda', pagina: 'bodas', menu: 'Boda',nombre: 'Boda', tuEvento: 'tu boda', widget: 'boda', img: 'boton-boda.jpg', hero: 'hero-bodas-desk.jpg', corto: 'Modelos y opciones' },
  { id: '15', pagina: 'mis15', menu: '15 años', nombre: '15 años', tuEvento: 'tus 15', widget: '15-anos', img: 'boton-15.jpg', hero: 'hero-15.jpg', corto: 'Modelos y opciones' },
  { id: 'bautismo', pagina: 'bautismo', menu: 'Bautismo', nombre: 'Bautismo', tuEvento: 'el bautismo', widget: 'bautismo', img: 'boton-bautismo.jpg', hero: 'hero-bautismo.jpg', corto: 'Modelos y opciones' },
  { id: 'comunion', pagina: 'comunion', menu: 'Comunión', nombre: 'Comunión', tuEvento: 'la comunión', widget: 'comunion', img: 'boton-comunion.jpg', hero: 'hero-comunion.jpg', corto: 'Modelos y opciones' },
  { id: 'cumple', pagina: 'cumple', menu: 'Cumpleaños', nombre: 'Cumpleaños', tuEvento: 'tu cumpleaños', widget: 'cumpleanos,infantil', img: 'boton-cumple.jpg', hero: 'hero-cumple.jpg', corto: 'Modelos adultos e infantiles' },
  { id: 'babyshower', pagina: 'baby-shower', menu: 'Baby shower', nombre: 'Baby shower', tuEvento: 'tu baby shower', widget: 'baby-shower', img: 'boton-infantil.jpg', hero: 'hero-infantiles.jpg', corto: 'Modelos y opciones' },
  { id: 'graduacion', pagina: 'graduacion', menu: 'Graduación', nombre: 'Graduación', tuEvento: 'tu graduación', widget: 'graduacion', img: 'boton-egreso.jpg', hero: 'hero-graduacion.jpg', corto: 'Modelos y opciones' },
  { id: 'empresarial', pagina: 'empresarial', menu: 'Corporativo', nombre: 'Corporativo', tuEvento: 'tu evento corporativo', widget: 'empresarial', img: 'boton-empresa.jpg', hero: 'hero-empresarial.jpg', corto: 'Opciones para empresas' },
  { id: 'otros', pagina: 'eventos', menu: 'Otros eventos', nombre: 'Otros eventos', tuEvento: 'tu evento', widget: 'navidad', img: 'boton-eventos.jpg', hero: 'hero-eventos.jpg', corto: 'Más opciones' },
];

// Opciones del formulario de contacto
export const OPCIONES_EVENTO = ['Boda', '15 años', 'Bautismo', 'Comunión', 'Cumpleaños', 'Baby shower', 'Graduación', 'Corporativo', 'Navidad', 'Otro evento'];

// ── Pasos ───────────────────────────────────────────────────────────────
export const PASOS = [
  { icono: 'sparkles', t: 'Elige tu diseño', p: 'Mira los modelos de catálogo o pide uno 100% a medida. Todos funcionan en cualquier celular.' },
  { icono: 'edit', t: 'Personalízalo', p: 'Desde tu panel cargas fechas, lugares, fotos y textos. Ves cómo queda en tiempo real.' },
  { icono: 'eye', t: 'Míralo terminado', p: 'Revisa la vista previa completa, con tus datos. Sin pagar nada hasta que estés conforme.' },
  { icono: 'send', t: 'Publica y envía', p: 'Pagas solo al publicar (o nada, si el modelo es gratis). Compartes el link por WhatsApp.' },
  { icono: 'users', t: 'Gestiona todo', p: 'Confirmaciones, mesas, llegada de invitados y lista final: todo en tu panel privado.' },
];

// ── Funciones ───────────────────────────────────────────────────────────
// g: invitados · experiencia · dia · panel   (plan: el mínimo que la incluye; sin plan = todos)
export const FUNCIONES = [
  { g: 'invitados', i: 'user-check', t: 'Confirmación de asistencia (RSVP)', p: 'Tus invitados confirman con un clic y tú ves las respuestas al instante, en el panel y en tu email.' },
  { g: 'invitados', i: 'link', t: 'Un link por invitado', p: 'Cada persona recibe su invitación con su nombre, sus pases y su grupo familiar.', plan: 'Premium' },
  { g: 'invitados', i: 'utensils', t: 'Menú y restricciones', p: 'Eligen su menú o avisan alergias y preferencias alimentarias antes del evento.' },
  { g: 'invitados', i: 'music', t: 'Sugerencias de canciones', p: 'Tus invitados proponen los temas que no pueden faltar en la fiesta.', plan: 'Premium' },
  { g: 'invitados', i: 'mensaje', t: 'Libro de mensajes', p: 'Dejan sus saludos y dedicatorias, y tú los guardas para siempre.' },
  { g: 'invitados', i: 'qr', t: 'Álbum colaborativo QR', p: 'Todos suben sus fotos y videos del evento a un álbum privado, sin descargar apps.', plan: 'Deluxe' },
  { g: 'invitados', i: 'instagram', t: 'Instagram Wall', p: 'Con tu hashtag, las fotos que suban a Instagram se ven juntas en un solo lugar.', plan: 'Premium' },
  { g: 'invitados', i: 'gift', t: 'Regalos', p: 'Comparte tu cuenta bancaria o billetera virtual y suma una lista de regalos.', plan: 'Premium' },
  { g: 'experiencia', i: 'sparkles', t: 'Apertura animada', p: 'Un sobre que se abre, música de fondo y una entrada que emociona desde el primer segundo.', plan: 'Premium' },
  { g: 'experiencia', i: 'clock', t: 'Cuenta regresiva', p: 'Días, horas y minutos que faltan: más expectativa y más ganas de llegar.', plan: 'Premium' },
  { g: 'experiencia', i: 'image', t: 'Historia y galería de fotos', p: 'Cuenta tu historia y comparte las fotos de tu sesión para personalizar aún más.', plan: 'Basic' },
  { g: 'experiencia', i: 'video', t: 'Video de portada', p: 'Abre tu invitación con tu propio video. Se agrega a cualquier modelo.' },
  { g: 'experiencia', i: 'globe', t: 'Varios idiomas', p: 'Si tus invitados hablan distintos idiomas, tu invitación puede estar en dos o más.' },
  { g: 'experiencia', i: 'shirt', t: 'Dress code', p: 'Indica la vestimenta elegida y, en Deluxe, suma sugerencias con imágenes.' },
  { g: 'dia', i: 'pin', t: 'Ubicación con mapa', p: 'Nadie se pierde: mapa integrado y cómo llegar con un toque.' },
  { g: 'dia', i: 'calendar', t: 'Agendar la fecha', p: 'Cada momento se agrega a la agenda del celular con horario y lugar, en un clic.' },
  { g: 'dia', i: 'clock', t: 'Itinerario', p: 'La línea de tiempo del evento, paso a paso, para que todos sepan qué viene.', plan: 'Deluxe' },
  { g: 'dia', i: 'bus', t: 'Traslado y hospedaje', p: 'Quienes viajan ven el transporte y los alojamientos recomendados cerca.', plan: 'Deluxe' },
  { g: 'dia', i: 'mesa', t: 'Mesas y «Busca tu mesa»', p: 'Organiza las mesas desde el panel y cada invitado ve la suya en su invitación.', plan: 'Deluxe' },
  { g: 'dia', i: 'ticket', t: 'Entradas y control de llegada', p: 'Pase de entrada con QR y registro de llegadas el día del evento.', plan: 'Deluxe' },
  { g: 'panel', i: 'lock', t: 'Panel privado', p: 'Administra invitados, respuestas y cambios desde tu celular o computadora.' },
  { g: 'panel', i: 'excel', t: 'Lista lista para descargar', p: 'Exporta quién viene, con cuántos pases y qué menú, en Excel o PDF.' },
  { g: 'panel', i: 'edit', t: 'Cambios cuando quieras', p: 'Corrige datos o cambia el diseño las veces que necesites, incluso ya publicada.' },
  { g: 'panel', i: 'send', t: 'Envíos ilimitados', p: 'Un pago, tantos invitados como necesites, por WhatsApp, email o redes.' },
  { g: 'panel', i: 'shield', t: 'Acceso seguro', p: 'Abierta, solo con link personal o con PIN: tú decides quién entra.' },
];
export const GRUPOS = [['todas', 'Todas'], ['invitados', 'Invitados'], ['experiencia', 'Experiencia'], ['dia', 'Día del evento'], ['panel', 'Panel y control']];

// ── Planes (los precios los pone la app según país y moneda) ────────────
// Contenido según «Cuadro de precios y contenido» (docx). (*) = solo en algunos modelos.
export const PLANES = [
  { id: 'gratis', nombre: 'Gratis', sub: 'Pruébalo sin pagar', boton: 'Elegir Gratis', items: ['Modelos seleccionados (*)', 'Hasta 35 invitados', 'Portada, agenda, mapa y dress code', 'Confirmación de asistencia y libro de mensajes', 'Panel privado y cambios ilimitados', 'Online 15 días desde la fecha del evento'] },
  { id: 'basic', nombre: 'Basic', sub: 'Lo esencial, bien hecho', boton: 'Elegir Basic', items: ['Todo lo de Gratis', 'Invitados ilimitados', 'Cuenta regresiva', 'Galería de fotos', 'Online 3 meses desde la fecha del evento'] },
  { id: 'premium', nombre: 'Premium', sub: 'El más elegido', boton: 'Elegir Premium', destacado: true, items: ['Todo lo de Basic', 'Apertura animada y música de fondo', 'Historia, regalos e Instagram Wall', 'Link personal por invitado, pases y familia', 'Tarjeta Save The Date (*)', 'Soporte prioritario', 'Online 6 meses desde la fecha del evento'] },
  { id: 'deluxe', nombre: 'Deluxe', sub: 'Tu planner digital', boton: 'Elegir Deluxe', items: ['Todo lo de Premium', 'Itinerario, testigos, traslado y hospedaje', 'Organizador de mesas y «Busca tu mesa»', 'Entradas con pase y control de llegadas', 'Álbum colaborativo QR', 'Online 12 meses desde la fecha del evento'] },
];
// Tabla comparativa: [fila, gratis, basic, premium, deluxe]  (true = incluido, false = no, texto = valor)
const T = true, F = false;
export const TABLA = [
  ['Acceso VIP restringido', T, T, T, T],
  ['Configuración de idioma', T, T, T, T],
  ['Panel privado de administración', T, T, T, T],
  ['Cambios ilimitados después de publicar', T, T, T, T],
  ['Compartir por WhatsApp', T, T, T, T],
  ['Portada personalizada', T, T, T, T],
  ['Agenda multiplataforma', T, T, T, T],
  ['Ubicación con mapa', T, T, T, T],
  ['Confirmación de asistencia (RSVP)', T, T, T, T],
  ['Libro de mensajes', T, T, T, T],
  ['Envío de recordatorio', T, T, T, T],
  ['Dress code', T, T, T, T],
  ['Cuenta regresiva', F, T, T, T],
  ['Galería de fotos', F, T, T, T],
  ['Apertura animada', F, F, T, T],
  ['Música de fondo a elección', F, F, T, T],
  ['Historia', F, F, T, T],
  ['Regalos + datos bancarios', F, F, T, T],
  ['Lista de regalos', F, F, T, T],
  ['Instagram Wall y hashtag', F, F, T, T],
  ['Lista de invitados con nombre y link personalizado', F, F, T, T],
  ['Pases adicionales y grupo familiar', F, F, T, T],
  ['Tarjeta Save The Date (*)', F, F, T, T],
  ['Soporte prioritario', F, F, T, T],
  ['Sugerencia de estilos de vestimenta', F, F, F, T],
  ['Itinerario del evento', F, F, F, T],
  ['Testigos / Padrinos', F, F, F, T],
  ['Traslado / Bus', F, F, F, T],
  ['Hospedaje', F, F, F, T],
  ['Playlist de Spotify', F, F, F, T],
  ['Redes oficiales del evento', F, F, F, T],
  ['Organizador de mesas + página «Busca tu mesa»', F, F, F, T],
  ['Organizador de llegadas al evento con pase de entrada', F, F, F, T],
  ['Álbum colaborativo QR', F, F, F, T],
  ['Cantidad de invitados', '35', 'Ilimitados', 'Ilimitados', 'Ilimitados'],
  ['Duración (desde la fecha del evento)', '15 días', '3 meses', '6 meses', '12 meses'],
];

// ── Preguntas frecuentes (para quien quiere entender cómo es el servicio) ─
export function preguntas(E) {
  const t = E.tuEvento;
  return [
    ['¿Qué es una invitación digital de Amo Invitar?', `<p>Es mucho más que una imagen para reenviar: es una <strong>página web personalizada de ${t}</strong>. Tus invitados la abren desde un link, ven toda la información (fecha, lugar, mapa, agenda, dress code, regalos…), confirman su asistencia con un clic y participan. Tú lo administras todo desde un panel privado.</p>`],
    ['¿Cómo la envío a mis invitados?', '<p>Con un link. Lo compartes por <strong>WhatsApp</strong>, email, Instagram o donde prefieras. Puedes mandar el mismo link a todos o un link personal para cada invitado, con su nombre y sus pases.</p>'],
    ['¿Mis invitados tienen que descargar una app o registrarse?', '<p>No. Abren el link en el navegador del celular, sin apps ni cuentas. Funciona en cualquier iPhone o Android y también en computadora.</p>'],
    ['¿Cuánto cuesta y cuándo pago?', '<p>Pagas <strong>una sola vez y solo al publicar</strong>. Puedes elegir el diseño, personalizarlo y ver tu invitación terminada sin pagar nada. Si eliges un modelo del plan Gratis, tienes tu link y no pagas nada. No hay suscripciones ni cargos ocultos. <a href="/precios">Ver planes y precios</a>.</p>'],
    ['¿Qué incluye el plan Gratis?', '<p>Modelos seleccionados con portada personalizada, confirmación de asistencia, libro de mensajes, agenda, mapa, dress code y panel de administración, para hasta 35 invitados y online durante 15 días desde la fecha del evento. Es ideal para probar o para reuniones pequeñas.</p>'],
    ['¿Cómo veo quién confirmó?', '<p>Las confirmaciones te llegan al <strong>panel privado y a tu email</strong>. Ves quién viene, con cuántos pases y qué menú eligió, y descargas la lista final en Excel o PDF.</p>'],
    ['¿Puedo cambiar algo después de publicarla?', '<p>Sí, todas las veces que quieras. Corriges un horario, una dirección o una foto desde el panel y el cambio se ve al instante en el mismo link, sin volver a enviar nada. También puedes <strong>cambiar el diseño</strong> aunque ya esté publicada.</p>'],
    ['¿Puedo ver cómo queda antes de pagar?', '<p>Sí. Diseñas tu invitación con tus datos y la ves terminada, con vista previa completa. <strong>Solo pagas cuando decides publicarla.</strong></p>'],
    ['¿Puedo tener un diseño solo mío, desde cero?', `<p>Sí. Además de los modelos de catálogo, creamos un <strong>diseño 100% a medida</strong> para ${t}, con tu estilo, tus colores y tu historia. Escríbenos desde la página de <a href="/contacto">contacto</a> y te asesoramos.</p>`],
    ['¿Puedo enviar un link distinto a cada invitado?', '<p>Sí. Con la lista de invitados (planes Premium y Deluxe) cada persona recibe un link personal con su nombre, sus pases y su grupo familiar. Así sabes exactamente quién confirmó y evitas invitados de más.</p>'],
    ['¿Cuántos invitados puedo tener?', '<p>En los planes de pago, <strong>los que necesites</strong>: no hay límite de invitados ni de envíos. El plan Gratis admite hasta 35 invitados.</p>'],
    ['¿Se puede organizar la mesa de cada invitado y la entrada al evento?', `<p>Sí, con el plan Deluxe. Armas las mesas desde el panel y cada invitado ve la suya en su invitación («Busca tu mesa»). Además puedes emitir <strong>entradas con QR</strong> y registrar la llegada de cada invitado el día de ${t}.</p>`],
    ['¿Qué es el álbum QR?', '<p>Es un álbum colaborativo de nuestro servicio hermano <a href="/album">Albunear</a>: tus invitados escanean un QR, suben sus fotos y videos sin descargar apps, y todo queda en un álbum privado para ti. Con el plan <strong>Deluxe</strong> te regalamos el álbum Classic.</p>'],
    ['¿Puedo poner música, fotos y mi propio video?', '<p>Sí. Con Premium y Deluxe puedes sumar música de fondo, apertura animada, galería de fotos e historia. También puedes abrir la invitación con tu <strong>propio video</strong> de portada.</p>'],
    ['¿Puedo tener la invitación en más de un idioma?', '<p>Sí. Si tienes invitados que hablan otro idioma, tu invitación puede estar en dos o más, y cada persona elige el suyo.</p>'],
    ['¿Cómo puedo pagar?', '<p>Con los medios de tu país: tarjeta de crédito o débito, Mercado Pago (Argentina), PayPal, Apple Pay, Google Pay y, según el país, transferencia bancaria. Los precios se muestran en tu moneda y puedes cambiarla desde el menú. El pago es seguro y cifrado.</p>'],
    ['¿Por cuánto tiempo estará online mi invitación?', '<p>Depende del plan, contado desde la fecha del evento: <strong>15 días</strong> en Gratis, <strong>3 meses</strong> en Basic, <strong>6 meses</strong> en Premium y <strong>12 meses</strong> en Deluxe. Después, la invitación muestra que el evento ya finalizó.</p>'],
    ['¿Puedo empezar con un plan y mejorarlo después?', '<p>Sí. Puedes empezar con un plan y pasar a uno superior cuando quieras desde tu panel. <strong>Solo pagas la diferencia.</strong></p>'],
    ['¿Es seguro? ¿Cualquiera puede ver mi invitación?', '<p>Tú decides: puede ser abierta para quien tenga el link, solo con link personal, o protegida con PIN. Los datos de tus invitados son privados y solo los ves tú. Las invitaciones no aparecen en los buscadores.</p>'],
    ['¿Qué pasa si necesito ayuda para armarla?', '<p>Te acompañamos. Puedes escribirnos por <a href="https://wa.me/message/57HQCKAMGELDG1" target="_blank" rel="noopener">WhatsApp</a> o desde la página de <a href="/contacto">contacto</a>, y el panel incluye ayuda paso a paso. Los planes Premium y Deluxe tienen soporte prioritario.</p>'],
    ['¿Por qué una invitación digital y no de papel?', '<p>Es más rápida, más económica y más sostenible: <strong>sin papel ni imprenta</strong>, se actualiza al instante si algo cambia, llega a todos a la vez y te ahorra perseguir respuestas. Si además quieres algo impreso, puedes sumar tarjetas Save The Date.</p>'],
    ['¿Qué es la Save The Date?', '<p>Es el aviso previo para que tus invitados reserven la fecha. Puede ser una tarjeta o una página web propia, y la tarjeta Save The Date viene incluida en los planes Premium y Deluxe.</p>'],
  ];
}

// ── Nuestra trayectoria (igual que en Albunear) ──────────────────────────
export const TRAYECTORIA = {
  p1: 'Desde 2005 fotografiamos, filmamos y diseñamos para bodas y eventos. Esa trayectoria nos exige mejorar cada día: escuchamos cada mensaje y cada sugerencia de nuestros clientes, y de ahí nacen nuestras mejoras y nuestros nuevos productos.',
  p2: 'Amo Invitar! es el resultado: la experiencia de muchos años detrás de cámara, convertida en una herramienta simple para que invitar, organizar y recibir a tus invitados sea un placer.',
};
