// ════════════════════════════════════════════════════════════════════
// ESQUEMAS DEL PANEL
//
// El panel no se programa a mano para cada modelo: se arma con esto.
// Cada producto (invitación, Save The Date, diseño a medida…) tiene sus
// pasos, y cada paso sus campos. El "id" de un campo es la ruta donde se
// guarda dentro de los datos del evento (la misma que lee el motor).
//
// Tipos de campo:
//   texto · area · numero · fecha · fechaHora · hora · switch · opciones
//   color · url · foto · fotos · mp3 · lista (con subcampos) · slug · invitados
//
// Opcionales en cada campo: max (caracteres o ítems), requerido, ayuda,
// placeholder, si: { campo, es | no } (se muestra según otro campo).
// Las etiquetas usan infinitivos y sustantivos para que sirvan igual en
// todos los países (sin tú/vos).
// ════════════════════════════════════════════════════════════════════

import { SECCION_MINIMA } from '../catalogo.js';
import { ZONAS } from '../datos/zonas.js';
import { FUENTES } from '../datos/fuentes.js';

const ORDEN_PAQUETES = ['gratis', 'basic', 'premium', 'deluxe'];
const PLURAL = new Set(['boda', 'revelacion']);

// ── Campos reutilizables ──────────────────────────────────────────────

// Idiomas de la invitación. El español tiene variantes (tú, vos, vosotros)
export const IDIOMAS_BASE = [
  { v: 'es', etiqueta: 'Español' }, { v: 'en', etiqueta: 'Inglés' }, { v: 'pt', etiqueta: 'Portugués' }, { v: 'fr', etiqueta: 'Francés' },
  { v: 'it', etiqueta: 'Italiano' }, { v: 'ca', etiqueta: 'Catalán' }, { v: 'de', etiqueta: 'Alemán' }, { v: 'nl', etiqueta: 'Neerlandés' },
];
export const VARIANTES_ES = [
  { v: 'es', etiqueta: 'Español neutro (tú)' }, { v: 'es-es', etiqueta: 'Español de España (tú / vosotros)' },
  { v: 'es-ar', etiqueta: 'Español rioplatense (vos)' }, { v: 'es-cr', etiqueta: 'Español centroamericano (vos)' },
];
// Bandera que muestra cada idioma en la invitación (el cliente elige el país)
const PAIS = { ar: 'Argentina', es: 'España', mx: 'México', co: 'Colombia', cl: 'Chile', uy: 'Uruguay', py: 'Paraguay', pe: 'Perú', ve: 'Venezuela', ec: 'Ecuador',
  bo: 'Bolivia', cr: 'Costa Rica', ni: 'Nicaragua', gt: 'Guatemala', hn: 'Honduras', sv: 'El Salvador', pa: 'Panamá', do: 'Rep. Dominicana', cu: 'Cuba', pr: 'Puerto Rico',
  us: 'Estados Unidos', gb: 'Reino Unido', ca: 'Canadá', au: 'Australia', ie: 'Irlanda', nz: 'Nueva Zelanda', br: 'Brasil', pt: 'Portugal', fr: 'Francia', be: 'Bélgica',
  ch: 'Suiza', it: 'Italia', de: 'Alemania', at: 'Austria', nl: 'Países Bajos', 'es-ct': 'Cataluña', ad: 'Andorra' };
const PAISES_IDIOMA = {
  es: ['es', 'ar', 'mx', 'co', 'cl', 'uy', 'py', 'pe', 've', 'ec', 'bo', 'cr', 'ni', 'gt', 'hn', 'sv', 'pa', 'do', 'cu', 'pr', 'us'],
  en: ['gb', 'us', 'ca', 'au', 'ie', 'nz'], pt: ['br', 'pt'], fr: ['fr', 'be', 'ch', 'ca'], it: ['it', 'ch'], ca: ['es-ct', 'ad'], de: ['de', 'at', 'ch'], nl: ['nl', 'be'],
};
export const BANDERAS = Object.fromEntries(Object.entries(PAISES_IDIOMA).map(([l, ps]) => [l, ps.map((v) => ({ v, etiqueta: PAIS[v] }))]));
// Bandera por defecto: la del país de la variante o del evento
export function banderaDe(l, datos = {}) {
  const elegida = datos.idiomas?.banderas?.[l];
  if (elegida && PAISES_IDIOMA[l]?.includes(elegida)) return elegida;
  if (l === 'es') {
    const v = String(datos.variante || 'es');
    if (v === 'es-es') return 'es';
    if (v === 'es-ar') return 'ar';
    if (v === 'es-cr') return 'cr';
  }
  return PAISES_IDIOMA[l]?.[0] || null;
}

const IDIOMAS = [...VARIANTES_ES, ...IDIOMAS_BASE.filter((x) => x.v !== 'es')];

// Nombres de los íconos del itinerario (el archivo es timeline-icon-<id>.png)
const ICONOS = {
  ceremonia: 'Ceremonia', iglesia: 'Iglesia', recepcion: 'Recepción', brindis: 'Brindis', tragos: 'Tragos', cena: 'Cena',
  vals: 'Vals', baile: 'Baile', fiesta: 'Fiesta', disco: 'Disco', torta: 'Torta', ramo: 'Ramo', zapatos: 'Zapatos',
  camara: 'Fotos', mic: 'Micrófono', novios: 'Novios', 15: '15 años', baby: 'Bebé', infantil: 'Infantil', 'last-call': 'Última ronda',
  // Comunes a todos los modelos (public/comun/img/itinerario)
  corazon: 'Corazón', civil: 'Civil / firma', vela: 'Vela', caliz: 'Cáliz', globos: 'Globos', regalo: 'Regalos', mamadera: 'Mamadera',
  corona: 'Corona', cupcake: 'Mesa dulce', luna: 'Despedida', estrella: 'Show', fuegos: 'Fuegos artificiales', bus: 'Traslado', musica: 'Música',
  // Ronda 19 (scripts/iconos-itinerario.mjs)
  birrete: 'Birrete', diploma: 'Diploma', medalla: 'Medalla', trofeo: 'Trofeo', libros: 'Libros', birretes: 'Birretes al aire', atril: 'Discurso',
  egresado: 'Egresado', grupo: 'Foto grupal', avion: 'Viaje',
  gorrito: 'Gorrito de fiesta', chupetin: 'Chupetín', helado: 'Helado', pochoclo: 'Pochoclo', pelota: 'Juegos', magia: 'Show de magia', castillo: 'Castillo inflable',
  osito: 'Osito', cohete: 'Cohete', auto: 'Auto', pizza: 'Pizza', pinata: 'Piñata', paleta: 'Pintacaritas', rompecabezas: 'Rompecabezas', calesita: 'Calesita',
  burbujas: 'Burbujas', tren: 'Trencito',
  arbol: 'Árbol de Navidad', campanas: 'Campanas', baston: 'Bastón de caramelo', muneco: 'Muñeco de nieve', gorro: 'Gorro de Papá Noel', copo: 'Copo de nieve',
  bota: 'Bota navideña', esfera: 'Esfera', guirnalda: 'Corona navideña', belen: 'Estrella de Belén', reloj: 'Cuenta regresiva', champagne: 'Champagne',
  paloma: 'Paloma', cruz: 'Cruz', biblia: 'Biblia', rosario: 'Rosario', concha: 'Concha bautismal', gota: 'Agua bendita', angel: 'Ángel', uvas: 'Uvas', espiga: 'Espiga',
  cubiertos: 'Cubiertos', copas: 'Copas', torta4: 'Torta', auriculares: 'DJ', vinilo: 'Vinilo', polaroid: 'Fotos instantáneas', cafe: 'Café',
  hamburguesa: 'Trasnoche', sol: 'Día / brunch', ubicacion: 'Llegada', trago: 'Barra de tragos', botella: 'Vino', bengalas: 'Bengalas', confeti: 'Confeti',
  anillos: 'Anillos', corazones: 'Corazones', mesa: 'Banquete', baile2: 'Baile',
};
// Íconos del itinerario que van en todas las invitaciones (además de los del modelo), en public/comun/img/itinerario.
// Los de siempre van en todos los eventos; los grupos, según el tipo de evento (así la lista no se hace eterna).
// Los clásicos de las invitaciones (antes en cada modelo, ahora comunes)
const ICONOS_CLASICOS = ['ceremonia', 'iglesia', 'iglesia2', 'recepcion', 'brindis', 'brindis2', 'tragos', 'cena', 'vals', 'baile', 'fiesta', 'disco', 'torta', 'torta2', 'torta3',
  'ramo', 'zapatos', 'camara', 'mic', 'novios-a', 'novios-b', 'novios-c', '15', 'baby', 'infantil', 'last-call', 'last-call2'];
const ICONOS_SIEMPRE = [...ICONOS_CLASICOS, 'corazon', 'civil', 'vela', 'caliz', 'globos', 'regalo', 'mamadera', 'corona', 'cupcake', 'luna', 'estrella', 'fuegos', 'bus', 'musica'];
const GRUPOS_ICONOS = {
  general: ['cubiertos', 'copas', 'torta4', 'auriculares', 'vinilo', 'polaroid', 'cafe', 'hamburguesa', 'sol', 'ubicacion', 'trago', 'botella', 'bengalas', 'confeti', 'anillos', 'corazones', 'mesa', 'baile2'],
  graduacion: ['birrete', 'diploma', 'medalla', 'trofeo', 'libros', 'birretes', 'atril', 'egresado', 'grupo', 'avion'],
  infantil: ['gorrito', 'chupetin', 'helado', 'pochoclo', 'pelota', 'magia', 'castillo', 'osito', 'cohete', 'auto', 'pizza', 'pinata', 'paleta', 'rompecabezas', 'calesita', 'burbujas', 'tren'],
  navidad: ['arbol', 'campanas', 'baston', 'muneco', 'gorro', 'copo', 'bota', 'esfera', 'guirnalda', 'belen', 'reloj', 'champagne'],
  religioso: ['paloma', 'cruz', 'biblia', 'rosario', 'concha', 'gota', 'angel', 'uvas', 'espiga'],
};
const GRUPOS_POR_TIPO = {
  boda: ['general', 'religioso', 'navidad'], 15: ['general', 'religioso', 'graduacion'], bautismo: ['religioso', 'infantil', 'general'], comunion: ['religioso', 'infantil', 'general'],
  cumple: ['general', 'infantil', 'graduacion'], graduacion: ['graduacion', 'general'], infantil: ['infantil', 'general'], navidad: ['navidad', 'general'],
  babyshower: ['infantil', 'general'], revelacion: ['infantil', 'general'], empresarial: ['general', 'navidad', 'graduacion'],
};
export const ICONOS_COMUNES = [...ICONOS_SIEMPRE, ...Object.values(GRUPOS_ICONOS).flat()];
export const iconosComunesDe = (tipo) => [...ICONOS_SIEMPRE, ...(GRUPOS_POR_TIPO[tipo] || ['general']).flatMap((g) => GRUPOS_ICONOS[g])];
const nombreIcono = (v) => {
  const [, base, n] = /^(.*?)(?:-?([a-z]|\d))?$/.exec(v) || [];
  const nombre = ICONOS[v] || ICONOS[base] || v;
  return ICONOS[v] || !n ? nombre : `${nombre} ${/\d/.test(n) ? n : n.charCodeAt(0) - 96}`;
};

// ── Pasos de la invitación web ────────────────────────────────────────
// Solo estos eventos tienen ceremonia o misa; cumpleaños, infantiles, egresos y empresariales no
export const CON_CEREMONIA = new Set(['boda', '15', 'bautismo', 'comunion', 'graduacion']);
// La segunda línea de la portada: [etiqueta, largo, ayuda]
const DETALLE = {
  infantil: ['Edad que cumple', 15, 'Por ejemplo "2 Años".'],
  graduacion: ['Clase o promoción', 30, 'Por ejemplo "CLASE 2027" o "PROMO 2027".'],
  revelacion: ['Frase de la portada', 60, 'Por ejemplo "Acompáñanos en la revelación de género".'],
};
// Lo mismo para testigos / padrinos
// En cumpleaños la sección es "Cómplices" (los amigos de quien cumple)
export const CON_PADRINOS = new Set(['boda', '15', 'bautismo', 'comunion', 'cumple', 'graduacion']);

// Proporciones fijas de las fotos (las mismas de las fotos de muestra del modelo)
export const PROPORCION = { galeria: '1:1', lugar: '9:4', dress: '4:9', testigo: '1:1', miniatura: '1.91:1' };
// La galería: el cliente elige la proporción de todas las fotos
export const PROPORCION_GALERIA = { cuadrada: '1:1', horizontal: '3:2', vertical: '2:3' };

// "Incluir fotos": muchos prefieren la invitación sin fotos en alguna sección
const conFotos = (grupo, etiqueta = 'Incluir foto en esta sección') => ({ id: `fotosOn.${grupo}`, tipo: 'switch', etiqueta, defecto: true, rearmar: true });
const siFotos = (grupo) => ({ campo: `fotosOn.${grupo}`, no: false });

// Título de una sección: sin etiqueta, el texto va dentro del campo ("Cambiar título")
const titulo = (clave, extra = {}) => ({ id: `textos.${clave}`, tipo: 'texto', etiqueta: 'Título', titulo: true, max: 30, base: clave, ...extra });

// Lugar: fecha y hora, nombre y el link de Google Maps (con él se arma el mapa y el botón)
const AYUDA_MAPA = 'En Google Maps: buscar el lugar, tocar "Compartir" y "Copiar link" (o copiar la dirección de la barra del navegador). Con eso se arman el mapa y el botón "¿Cómo llegar?".';
const lugarCampos = (p, { fecha, ejemplo, cual = fecha.replace(/^Fecha de(l| la)? /, '') }) => [
  { id: `${p}.fecha`, tipo: 'fecha', etiqueta: fecha, requerido: true, ancho: 'mitad' },
  { id: `${p}.hora`, tipo: 'hora', etiqueta: 'Hora de inicio', etiquetaFalta: `Hora de inicio (${cual})`, requerido: true, ancho: 'mitad' },
  { id: `${p}.nombre`, tipo: 'texto', etiqueta: 'Nombre del lugar', etiquetaFalta: `Nombre del lugar (${cual})`, requerido: true, max: 80, placeholder: ejemplo, ayuda: 'También se puede incluir la dirección.' },
  { id: `${p}.mapaLink`, tipo: 'url', etiqueta: 'Link de Google Maps', etiquetaFalta: `Link de Google Maps (${cual})`, requerido: true, placeholder: 'https://maps.app.goo.gl/…', ayuda: AYUDA_MAPA },
];

// Cómo se muestran las fotos de la galería
const TIPOS_GALERIA = [
  { v: 'carrusel', etiqueta: 'Carrusel', ayuda: 'Una foto por vez, se desliza.' },
  { v: 'mosaico', etiqueta: 'Mosaico', ayuda: 'Una foto grande y las demás más chicas alrededor.' },
  { v: 'grilla', etiqueta: 'Grilla', ayuda: 'Todas del mismo tamaño, en filas.' },
  { v: 'polaroids', etiqueta: 'Polaroids', ayuda: 'Como fotos impresas con marco blanco, apenas giradas.' },
];
// Hasta 20 fotos de galería en todos los paquetes y modelos
export const MAX_GALERIA = 20;

const REDES = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok']];

function pasosInvitacion({ tipo, modelo }) {
  const plural = PLURAL.has(tipo);
  // Lo máximo que trae el modelo (Deluxe): el plan se arma con lo que elige el cliente
  const incluye = modelo.paquetes.deluxe?.incluye || modelo.paquetes.premium?.incluye || {};
  const misa = tipo === '15' || tipo === 'comunion';
  const conCeremonia = CON_CEREMONIA.has(tipo);
  const padrinos = tipo === 'boda' ? 'Testigos' : tipo === 'cumple' ? 'Cómplices' : tipo === 'graduacion' ? 'Mentores' : 'Padrinos';
  const tituloPadrinos = tipo === 'boda' ? 'Testigos/padrinos' : tipo === 'cumple' ? 'Cómplices' : tipo === 'graduacion' ? 'Mentores' : 'Padrinos';
  const hayCeremonia = { campo: 'ceremonia.modo', es: 'separada' };
  const unificada = { campo: 'ceremonia.modo', es: 'mismo-lugar' };
  const nCer = misa ? 'misa' : 'ceremonia';
  const g = modelo.galeria || {};
  // 0: el diseño no lleva foto de portada (Armonía, Beach, Black…) y no se muestra la opción
  const maxPortada = incluye.fotosPortada ?? 1;
  // Los modelos con slideshow lo traen también en Basic (fotosPortada > 1 en basic)
  const maxPortadaBasic = modelo.paquetes.basic?.incluye?.fotosPortada || 1;

  return [
    {
      id: 'portada', titulo: 'Portada', obligatoria: true,
      campos: [
        { id: 'nombres.a', tipo: 'texto', etiqueta: plural ? 'Nombre 1' : ({ graduacion: 'Nombre (o institución, si es un egreso)', navidad: 'Familia o empresa' })[tipo] || 'Nombre',
          max: ['graduacion', 'navidad'].includes(tipo) ? 30 : 15, requerido: true, ancho: plural ? 'mitad' : null, placeholder: plural ? 'Lau' : ({ graduacion: 'Cinthia', navidad: 'Familia Pérez' })[tipo] || 'Sofi' },
        ...(plural ? [{ id: 'nombres.b', tipo: 'texto', etiqueta: 'Nombre 2', max: 15, requerido: true, ancho: 'mitad', placeholder: 'Pablo' }] : []),
        { id: 'nota.nombres', tipo: 'nota', estilo: 'ayuda', texto: plural ? '¿Cómo se tienen que ver los nombres? (nombres, diminutivos, apodos…). Por ejemplo: Lau y Pablo.'
          : '¿Cómo se tiene que ver el nombre? (nombre, diminutivo, apodo…). Por ejemplo: Sofi.' },
        ...(maxPortada ? [
        { id: 'nota.portada', tipo: 'nota', texto: maxPortada > 1 ? 'Fotos de portada' : 'Foto de portada', estilo: 'etiqueta' },
        conFotos('portada', maxPortada > 1 ? 'Incluir fotos en la portada' : 'Incluir foto en la portada'),
        // Modelos con video de portada: se elige foto o video
        ...(modelo.videoPortada ? [{ id: 'portada.tipo', tipo: 'opciones', etiqueta: 'En la portada va', defecto: 'fotos', rearmar: true, si: siFotos('portada'),
          valores: [{ v: 'fotos', etiqueta: 'Fotos' }, { v: 'video', etiqueta: 'Un video (hasta 30 segundos)', extra: 'video-portada' }] },
        { id: 'portada.video', tipo: 'video', etiqueta: 'Video de portada', maxSeg: 30, maxMB: 40, si: [siFotos('portada'), { campo: 'portada.tipo', es: 'video' }],
          ayuda: 'MP4 de hasta 30 segundos. En pantallas horizontales un video vertical se ve al centro, con una copia desenfocada de fondo.' }] : []),
        // Más de una foto de portada es de Premium
        { id: 'fotos.portada', tipo: 'fotos', etiqueta: maxPortada > 1 ? 'Fotos de portada' : 'Foto de portada', sinEtiqueta: true, max: maxPortada, portada: true, nivelCantidad: maxPortada > maxPortadaBasic ? [maxPortadaBasic + 1, 'premium'] : null,
          si: modelo.videoPortada ? [siFotos('portada'), { campo: 'portada.tipo', no: 'video' }] : siFotos('portada') },
        { id: 'nota.portadaSinFoto', tipo: 'nota', texto: 'Sin fotos, la portada usa el fondo del diseño con los nombres.', si: { campo: 'fotosOn.portada', es: false } },
        ] : []),
        { id: 'textos.portada.subtitulo', tipo: 'texto', etiqueta: 'Frase debajo de los nombres', max: 15, base: 'portada.subtitulo', ancho: 'mitad', ayuda: 'Por ejemplo "¡Nos casamos!", "Nuestra boda"…' },
        // Segunda línea de la portada en los diseños que la traen (la edad, la promoción…)
        ...(modelo.sepiaPortada ? [{ id: 'portada.color', tipo: 'switch', estilo: 'check', etiqueta: 'Portada en color', detalle: 'este diseño la muestra en sepia', si: siFotos('portada') }] : []),
        ...(modelo.ciudadPortada ? [{ id: 'portada.ciudad', tipo: 'texto', etiqueta: 'Ciudad (junto a la fecha)', max: 18, ancho: 'mitad', ayuda: 'Por ejemplo "Miami". Vacío, no se muestra.' }] : []),
        ...(DETALLE[tipo] ? [{ id: 'textos.portada.detalle', tipo: 'texto', etiqueta: DETALLE[tipo][0], max: DETALLE[tipo][1], base: 'portada.detalle', ancho: 'mitad', ayuda: DETALLE[tipo][2] }] : []),
        { id: 'zonaHoraria', tipo: 'zona', etiqueta: 'País / zona horaria del evento', valores: ZONAS, requerido: true, ancho: 'mitad', ayuda: 'Para la cuenta regresiva y los calendarios.' },
        // Apagada: Premium y Deluxe muestran la portada de Basic (sin cuenta regresiva)
        { id: 'portada.cuenta', tipo: 'switch', etiqueta: 'Mostrar la cuenta regresiva', defecto: true, rearmar: true,
          ayuda: 'En los planes Premium y Deluxe. Apagada, la portada queda como la del plan Basic.' },
        // Sobre de apertura (Premium y Deluxe). Apagado: la ventana de bienvenida original del diseño
        ...(incluye.sobre ? [{ id: 'portada.sobre', tipo: 'switch', etiqueta: 'Sobre de apertura', defecto: true, rearmar: true,
          ayuda: 'En los planes Premium y Deluxe. Al entrar se abre un sobre lacrado con las iniciales; apagado, aparece la ventana de bienvenida del diseño (si la invitación no tiene música de fondo, esta ventana no se muestra).' }] : []),
      ],
    },
    { id: 'musica', seccion: 'musica', titulo: 'Música de fondo', campos: [
      { id: 'musica.archivo', tipo: 'mp3', etiqueta: 'Canción (MP3)', sinEtiqueta: true, boton: 'Cargar canción (MP3)', maxMB: 12 },
      { id: 'musica.inicio', tipo: 'contador', etiqueta: 'Empezar la canción en el segundo…', min: 0, max: 600, paso: 5, si: { campo: 'musica.archivo' } },
    ] },
    { id: 'historia', seccion: 'historia', titulo: plural ? 'Nuestra historia' : 'Mi historia',
      ayudaSeccion: 'Apagada: en su lugar va un saludo corto de bienvenida.',
      campos: [
        titulo('historia.titulo'),
        { id: 'historia.texto', tipo: 'area', etiqueta: 'Texto', max: 600, base: 'historia.texto' },
        // Diseños con una foto junto a la historia (la "inicial" de Armonía, Lila, Style, Oliva…)
        ...(modelo.fotoHistoria ? [conFotos('historia'),
          { id: 'fotos.historia', tipo: 'foto', etiqueta: 'Foto', proporcion: modelo.fotoHistoria, encuadre: true, redonda: modelo.fotoHistoria === '1:1', si: siFotos('historia') }] : []),
      ] },
    { id: 'galeria', seccion: 'galeria', titulo: 'Galería de fotos', ayudaSeccion: 'Si no quieres fotos, apagar esta sección.', campos: [
      // En los modelos con la galería dentro de la confirmación va siempre el carrusel
      ...(g.enRsvp || g.fija ? [] : [{ id: 'galeria.tipo', tipo: 'opciones', etiqueta: 'Cómo se muestran', tarjetas: 'galeria', defecto: 'carrusel', valores: TIPOS_GALERIA }]),
      // Solo en los diseños que muestran las fotos en blanco y negro (Romantic, B&N)
      ...(g.byn ? [{ id: 'galeria.color', tipo: 'switch', estilo: 'check', etiqueta: 'Mostrar las fotos en color', detalle: 'este diseño las muestra en blanco y negro' }] : []),
      { id: 'galeria.proporcion', tipo: 'opciones', etiqueta: 'Proporción de la miniatura', tarjetas: 'proporcion', defecto: 'cuadrada', rearmar: true, valores: [
        { v: 'cuadrada', etiqueta: '1:1' }, { v: 'horizontal', etiqueta: 'Horizontal' }, { v: 'vertical', etiqueta: 'Vertical' },
      ] },
      { id: 'fotos.galeria', tipo: 'fotos', etiqueta: 'Fotos', max: MAX_GALERIA, proporcion: PROPORCION.galeria, proporcionDe: { campo: 'galeria.proporcion', valores: PROPORCION_GALERIA },
        ayuda: 'Arrastrar cada foto para encuadrar la miniatura; al tocarla en la invitación se ve entera. Con una sola foto también queda bien.' },
    ] },
    {
      id: 'lugares', titulo: 'Lugares y fecha', obligatoria: true,
      campos: [
        ...(conCeremonia ? [
          { id: 'ceremonia.modo', tipo: 'opciones', etiqueta: misa ? '¿Hay misa?' : '¿Hay ceremonia?', defecto: 'mismo-lugar', valores: [
            { v: 'mismo-lugar', etiqueta: 'Sí, en el mismo lugar de la celebración' },
            { v: 'separada', etiqueta: 'Sí, y se realiza en otro lugar' },
            { v: 'sin', etiqueta: misa ? 'No habrá misa' : 'No habrá ceremonia' },
          ] },
          { id: 'separador.ceremonia', tipo: 'nota', texto: misa ? 'Misa' : 'Ceremonia', si: hayCeremonia, estilo: 'subtitulo' },
          { id: 'ceremonia.titulo', tipo: 'texto', etiqueta: 'Título', titulo: true, max: 30, base: 'ceremonia.religiosa', si: hayCeremonia },
          ...lugarCampos('ceremonia', { fecha: `Fecha de la ${nCer}`, ejemplo: 'Iglesia San Pedro' }).map((c) => ({ ...c, si: hayCeremonia })),
          { id: 'separador.fiesta', tipo: 'nota', texto: misa ? 'Fiesta' : 'Celebración', si: hayCeremonia, estilo: 'subtitulo' },
          { id: 'celebracion.titulo', tipo: 'texto', etiqueta: 'Título', titulo: true, max: 30, base: 'celebracion.titulo', si: hayCeremonia },
          { id: 'celebracion.tituloUnico', tipo: 'texto', etiqueta: 'Título', titulo: true, max: 30, base: 'unificado.titulo', si: unificada },
          { id: 'celebracion.tituloSolo', tipo: 'texto', etiqueta: 'Título', titulo: true, max: 30, base: 'celebracion.sola', si: { campo: 'ceremonia.modo', es: 'sin' } },
        ] : [
          { id: 'celebracion.tituloSolo', tipo: 'texto', etiqueta: 'Título', titulo: true, max: 30, base: 'celebracion.sola' },
        ]),
        ...lugarCampos('celebracion', { fecha: conCeremonia ? `Fecha de la ${misa ? 'fiesta' : 'celebración'}` : 'Fecha del evento', ejemplo: 'Estancia La Soñada' }),
        { id: 'separador.fotosLugar', tipo: 'nota', estilo: 'linea' },
        { id: 'fotosOn.lugares', tipo: 'switch', etiqueta: 'Incluir fotos', defecto: true, rearmar: true },
        ...(conCeremonia ? [{ id: 'ceremonia.foto', tipo: 'foto', etiqueta: misa ? 'Foto de la iglesia' : 'Foto de la ceremonia', proporcion: (modelo.proporciones?.lugar || '').replace('/', ':') || PROPORCION.lugar, encuadre: true, paquete: 'premium', ancho: 'mitad', si: [siFotos('lugares'), hayCeremonia] }] : []),
        { id: 'celebracion.foto', tipo: 'foto', etiqueta: 'Foto del lugar', proporcion: (modelo.proporciones?.lugar || '').replace('/', ':') || PROPORCION.lugar, encuadre: true, paquete: 'premium', ancho: 'mitad', si: siFotos('lugares') },
      ],
    },
    // El interruptor no se muestra: la lista se prende eligiendo "Lista de invitados" o "Lista + PIN"
    { id: 'invitados', titulo: 'Invitados y acceso', interruptor: 'acceso.lista', sinInterruptor: true, nivelPaso: 'premium', niveles: ['basic', 'premium'],
      ayudaSeccion: 'Elegir quién puede entrar. Con una lista, cada invitado recibe su link personal (con su nombre, pases y mesa) y abajo se carga la lista.',
      campos: [
        ...CAMPOS_ACCESO,
        { id: 'separador.lista', tipo: 'nota', estilo: 'linea', si: esLista },
        { id: 'invitados', tipo: 'invitados', etiqueta: 'Invitados', sinEtiqueta: true, si: esLista },
      ] },
    {
      id: 'rsvp', seccion: 'rsvp', titulo: 'Confirmación', obligatoria: true,
      campos: [
        titulo('rsvp.titulo'),
        { id: 'rsvp.texto', tipo: 'area', etiqueta: 'Texto de la sección', max: 250, base: 'rsvp.texto' },
        { id: 'rsvp.cierre', tipo: 'fecha', etiqueta: 'Recibir confirmaciones hasta el', ancho: 'mitad', ayuda: 'Vacío: se puede confirmar hasta el día del evento.' },
        { id: 'rsvp.aforo', tipo: 'numero', etiqueta: 'Aforo máximo', min: 1, max: 5000, ancho: 'mitad', placeholder: 'Sin límite', ayuda: 'Al llegar al límite se cierra (cuenta invitados, acompañantes y niños).' },
        { id: 'rsvp.acompanantes', tipo: 'contador', etiqueta: 'Cantidad de acompañantes que puede sumar cada invitado', min: 0, max: 10, defecto: 0,
          ayuda: 'Con la lista de invitados, los acompañantes salen de los pases de cada uno.',
          si: { campo: 'acceso.lista', no: true } },
        { id: 'rsvp.preguntas.comida', tipo: 'switch', etiqueta: 'Preguntar restricciones alimentarias', ayuda: 'Si va con acompañantes, puede aclarar si alguno tiene otra restricción.' },
        { id: 'rsvp.preguntas.alcohol', tipo: 'switch', etiqueta: 'Preguntar si toma alcohol' },
        { id: 'rsvp.preguntas.ninos', tipo: 'switch', etiqueta: 'Preguntar si va con niños y cuántos serán' },
        { id: 'rsvp.preguntas.traslado', tipo: 'switch', etiqueta: 'Preguntar si necesita traslado' },
        // Un mensaje para los anfitriones: se ve en la administración (Mensajes)
        { id: 'rsvp.preguntas.mensaje', tipo: 'switch', defecto: true, etiqueta: `Pedir un mensaje para ${({ boda: 'los novios', 15: 'la quinceañera', bautismo: 'la familia', comunion: 'la familia', cumple: 'quien cumple años', infantil: 'quien cumple años', graduacion: 'quien se gradúa', babyshower: 'la familia', revelacion: 'los papás', navidad: 'los anfitriones' })[tipo] || 'los anfitriones'}`,
          ayuda: 'Al final de la confirmación, cada invitado puede dejar un mensaje (es opcional).' },
        { id: 'rsvp.extras', tipo: 'lista', etiqueta: 'Preguntas propias', unaColumna: true, max: 5, agregar: 'Agregar pregunta', paquete: 'premium', campos: [
          { id: 'pregunta', tipo: 'texto', etiqueta: 'Pregunta', max: 80, placeholder: '¿Cuál es tu trago favorito?' },
          { id: 'opciones', tipo: 'texto', etiqueta: 'Opciones (separadas con coma)', max: 160, placeholder: 'Vacío = respuesta libre · Ej.: Fernet, Gin tonic' },
        ] },
        // Los modelos con la galería dentro de la confirmación no llevan foto acá
        ...(g.enRsvp || modelo.sinFotoRsvp ? [] : [
          { ...conFotos('rsvp'), defecto: false },
          { id: 'fotos.rsvp', tipo: 'foto', etiqueta: 'Foto', sinRecorte: true, paquete: 'premium', si: { campo: 'fotosOn.rsvp' } },
        ]),
      ],
    },
    { id: 'dresscode', seccion: 'dresscode', titulo: 'Dress code', campos: [
      titulo('dress.titulo'),
      { id: 'dresscode.texto', tipo: 'area', etiqueta: 'Texto', max: 200, base: 'dresscode.texto' },
    ] },
    { id: 'estilos', seccion: 'estilos', titulo: 'Referencias de estilos', campos: [
      { id: 'dresscode.evitar', tipo: 'colores', etiqueta: 'Colores a evitar (opcional)', max: 4 },
      { id: 'dresscode.fotos', tipo: 'fotos', etiqueta: 'Fotos de sugerencias de estilo', max: 6, paquete: 'deluxe', proporcion: PROPORCION.dress, porFila: 3 },
    ] },
    // Hospedaje y traslado: la ventana (modal) lleva el mismo título que la sección, salvo que se cambie.
    // "Agregar indicaciones": texto libre que va en la ventana antes de la lista de hoteles / del recorrido.
    { id: 'hospedaje', seccion: 'hospedaje', titulo: 'Hospedaje', campos: [
      titulo('hospedaje.titulo'),
      { id: 'textos.hospedaje.texto', tipo: 'area', etiqueta: 'Texto', max: 200, base: 'hospedaje.texto' },
      { id: 'textos.hospedaje.modal', tipo: 'texto', etiqueta: 'Título de la ventana de referencias', max: 40, traducible: true, placeholder: 'Vacío: el mismo título de la sección',
        si: { o: [{ campo: 'hospedaje.items' }, { campo: 'hospedaje.conIndicaciones' }, { campo: 'hospedaje.texto' }] } },
      { id: 'hospedaje.texto', tipo: 'area', etiqueta: 'Indicaciones', max: 500, traducible: true, placeholder: 'Por ejemplo: hay tarifa especial mencionando la boda; reservar antes del 30 de julio.',
        si: { o: [{ campo: 'hospedaje.conIndicaciones' }, { campo: 'hospedaje.texto' }] } },
      { id: 'hospedaje.conIndicaciones', tipo: 'revelar', etiqueta: 'Agregar indicaciones', texto: 'hospedaje.texto' },
      { id: 'hospedaje.items', tipo: 'lista', etiqueta: 'Hoteles', max: 6, agregar: 'Agregar hotel', campos: [
        { id: 'nombre', tipo: 'texto', etiqueta: 'Hotel', max: 60 }, { id: 'direccion', tipo: 'texto', etiqueta: 'Dirección', max: 100 }, { id: 'link', tipo: 'url', etiqueta: 'Link de reservas' },
      ] },
    ] },
    { id: 'bus', seccion: 'bus', titulo: 'Traslado/Bus', campos: [
      titulo('bus.titulo'),
      { id: 'textos.bus.texto', tipo: 'area', etiqueta: 'Texto', max: 200, base: 'bus.texto' },
      { id: 'textos.bus.modal', tipo: 'texto', etiqueta: 'Título de la ventana del recorrido', max: 40, traducible: true, placeholder: 'Vacío: el mismo título de la sección',
        si: { o: [{ campo: 'bus.paradas' }, { campo: 'bus.conIndicaciones' }, { campo: 'bus.texto' }] } },
      { id: 'bus.texto', tipo: 'area', etiqueta: 'Indicaciones', max: 500, traducible: true, placeholder: 'Por ejemplo: el bus sale puntual; llegar 15 minutos antes.',
        si: { o: [{ campo: 'bus.conIndicaciones' }, { campo: 'bus.texto' }] } },
      { id: 'bus.conIndicaciones', tipo: 'revelar', etiqueta: 'Agregar indicaciones', texto: 'bus.texto' },
      { id: 'bus.paradas', tipo: 'lista', etiqueta: 'Recorrido', max: 5, agregarPrimero: 'Agregar recorrido', agregar: 'Agregar parada', campos: [
        { id: 'etiqueta', tipo: 'texto', etiqueta: 'Parada (vacío: "Partida", "Destino"…)', max: 30 }, { id: 'detalle', tipo: 'texto', etiqueta: 'Lugar y hora', max: 100 },
      ] },
    ] },
    { id: 'itinerario', seccion: 'itinerario', titulo: 'Itinerario', campos: [
      titulo('itinerario.titulo'),
      { id: 'itinerario', tipo: 'lista', etiqueta: 'Momentos', max: 12, agregar: 'Agregar momento', campos: [
        { id: 'hora', tipo: 'texto', etiqueta: 'Hora', max: 10, placeholder: '21:00' },
        { id: 'texto', tipo: 'texto', etiqueta: 'Qué pasa', max: 30 },
        { id: 'icono', tipo: 'opciones', etiqueta: 'Ícono', iconos: `/modelos/${modelo.id}/img/timeline-icon-{v}.png`, ayuda: 'Sin ícono elegido, el círculo queda vacío.',
          valores: [...(modelo.iconosItinerario || []).map((v) => ({ v, etiqueta: nombreIcono(v) })),
            ...iconosComunesDe(tipo).filter((v) => !(modelo.iconosItinerario || []).includes(v)).map((v) => ({ v, etiqueta: nombreIcono(v), src: `/comun/img/itinerario/timeline-icon-${v}.png` }))] },
      ] },
    ] },
    // Testigos (boda) o padrinos (15, bautismo, comunión); cumpleaños, infantiles y egresos no tienen
    ...(!CON_PADRINOS.has(tipo) ? [] : [{ id: 'testigos', seccion: 'testigos', titulo: tituloPadrinos, campos: [
      titulo('testigos.titulo'),
      conFotos('testigos', 'Incluir fotos'),
      { id: 'testigos', tipo: 'lista', etiqueta: padrinos, max: 8, agregar: 'Agregar', campos: [
        { id: 'nombre', tipo: 'texto', etiqueta: 'Nombre', max: 40 }, { id: 'rol', tipo: 'texto', etiqueta: 'Quién es (opcional)', max: 40, placeholder: 'Hermano del novio' },
        { id: 'foto', tipo: 'foto', etiqueta: 'Foto', proporcion: PROPORCION.testigo, encuadre: true, redonda: true, zoom: true, si: siFotos('testigos') },
      ] },
    ] }]),
    // Instagram Wall (hashtag) y álbum compartido: uno u otro
    { id: 'instagram', seccion: 'instagram', titulo: 'Instagram Wall', excluye: 'album', campos: [
      titulo('hashtag.titulo'),
      { id: 'album.hashtag', tipo: 'texto', etiqueta: 'Hashtag de Instagram', max: 40, placeholder: 'SofiyAle2027',
        ayuda: 'Sin el #. Vacío: se arma solo con los nombres y el año. Los invitados etiquetan sus fotos y el botón "Ver fotos" las muestra.' },
      { id: 'textos.hashtag.texto', tipo: 'area', etiqueta: 'Texto', max: 300, base: 'hashtag.texto' },
      conFotos('instagram'),
      { id: 'fotos.instagram', tipo: 'foto', etiqueta: 'Foto de la sección', sinRecorte: true, si: siFotos('instagram') },
    ] },
    { id: 'album', seccion: 'album', titulo: 'Álbum de fotos QR', excluye: 'instagram', campos: [
      titulo('album.titulo'),
      { id: 'textos.album.texto', tipo: 'area', etiqueta: 'Texto', max: 300, base: 'album.texto' },
      { id: 'album.origen', tipo: 'opciones', etiqueta: 'Álbum', defecto: 'albunear', valores: [
        { v: 'albunear', etiqueta: 'Usar álbum Classic de Albunear incluido en Deluxe', ayuda: 'En Basic y Premium se contrata en Albunear (hay planes gratis).' },
        { v: 'propio', etiqueta: 'Usar link de álbum propio' }] },
      { id: 'nota.albumAlbunear', tipo: 'nota', estilo: 'ayuda', texto: 'Luego podrás configurar el álbum en la pestaña Administración.', si: { campo: 'album.origen', no: 'propio' } },
      { id: 'album.url', tipo: 'url', etiqueta: 'Link del álbum', si: { campo: 'album.origen', es: 'propio' } },
      conFotos('album'),
      { id: 'fotos.album', tipo: 'foto', etiqueta: 'Foto de la sección', sinRecorte: true, si: siFotos('album') },
    ] },
    { id: 'canciones', seccion: 'canciones', titulo: 'Sugerir canciones', campos: [
      { id: 'nota.canciones', tipo: 'nota', texto: 'Un formulario para que los invitados sugieran canciones. Las sugerencias se ven en la administración de la invitación.' },
      titulo('canciones.titulo'),
      { id: 'textos.canciones.texto', tipo: 'area', etiqueta: 'Texto', max: 200, base: 'canciones.texto' },
    ] },
    { id: 'playlist', seccion: 'playlist', titulo: 'Playlist Spotify', campos: [
      titulo('playlist.titulo'),
      { id: 'textos.playlist.texto', tipo: 'texto', etiqueta: 'Texto del párrafo', max: 80, base: 'playlist.texto' },
      { id: 'playlist.link', tipo: 'url', etiqueta: 'Link de la playlist de Spotify', placeholder: 'https://open.spotify.com/playlist/…',
        ayuda: 'En Spotify: abrir la playlist, tocar "…" → "Compartir" → "Copiar enlace". Se ve en la invitación con un disco que gira al reproducirla.' },
    ] },
    { id: 'regalos', seccion: 'regalos', titulo: 'Regalos', campos: [
      titulo('regalos.titulo'),
      { id: 'regalos.texto', tipo: 'area', etiqueta: 'Texto', max: 250, base: 'regalos.texto' },
      { id: 'regalos.cuentas', tipo: 'lista', etiqueta: 'Datos bancarios', max: 6, agregar: 'Agregar', ayuda: 'Cada dato se puede copiar con un toque en la invitación.', campos: [
        { id: 'etiqueta', tipo: 'texto', etiqueta: 'Dato', max: 30, placeholder: 'Cuenta bancaria / IBAN / Alias / Titular…' }, { id: 'dato', tipo: 'texto', etiqueta: 'Valor', max: 60 },
      ] },
      { id: 'separador.listas', tipo: 'nota', estilo: 'linea' },
      { id: 'regalos.listas', tipo: 'lista', etiqueta: 'Lista de regalos', max: 4, agregar: 'Agregar', campos: [
        { id: 'etiqueta', tipo: 'texto', etiqueta: 'Tienda', max: 40, placeholder: 'Falabella, Amazon…' },
        { id: 'dato', tipo: 'texto', etiqueta: 'Número o código (opcional)', max: 40 },
        { id: 'link', tipo: 'url', etiqueta: 'Link de la lista (opcional)' },
      ] },
    ] },
    { id: 'redes', seccion: 'redes', titulo: 'Redes del evento', campos: [
      titulo('redes.titulo', { max: 40 }),
      // Cada red se activa por separado (así la sección no se alarga)
      ...REDES.flatMap(([id, nombre]) => [
        { id: `redesOn.${id}`, tipo: 'switch', etiqueta: nombre },
        { id: `redes.${id}`, tipo: 'url', etiqueta: `Link de ${nombre}`, sinEtiqueta: true, placeholder: `https://www.${id}.com/…`, si: { campo: `redesOn.${id}` } },
      ]),
    ] },
    { id: 'pie', titulo: 'Cierre', obligatoria: true, campos: [
      { id: 'pie.mostrarTexto', tipo: 'switch', etiqueta: 'Mostrar el texto final', defecto: true, rearmar: true },
      { id: 'pie.texto', tipo: 'area', etiqueta: 'Texto final', max: 400, base: 'pie.texto', si: { campo: 'pie.mostrarTexto', no: false } },
    ] },
  ];
}

// ── Complemento: colores y tipografía (los cambios los hace el equipo) ──
const PALETA_DEFECTO = ['#a78977', '#86a388', '#9ab09c', '#ffffff'];
const pasoDiseno = (modelo) => ({
  id: 'diseno', seccion: 'diseno', complemento: true, titulo: 'Cambios de diseño',
  campos: [
    { id: 'nota.diseno', tipo: 'nota', texto: 'Los cambios los hace el equipo de diseño: el pedido se envía al publicar y desde ese momento ya no se puede modificar.' },
    { id: 'diseno.paleta.modo', tipo: 'opciones', etiqueta: 'Colores', defecto: 'original', valores: [
      { v: 'original', etiqueta: 'Los colores originales del diseño' }, { v: 'cambiar', etiqueta: 'Quiero otros colores' },
    ] },
    { id: 'diseno.paleta.colores', tipo: 'paleta', etiqueta: 'Modificar colores', original: modelo?.paleta || PALETA_DEFECTO, si: { campo: 'diseno.paleta.modo', es: 'cambiar' } },
    { id: 'diseno.paleta.notas', tipo: 'area', etiqueta: 'Algún detalle más (opcional)', max: 400, si: { campo: 'diseno.paleta.modo', es: 'cambiar' }, placeholder: 'Verde oliva más oscuro y detalles en dorado…' },
    { id: 'separador.tipografia', tipo: 'nota', estilo: 'linea' },
    { id: 'diseno.tipografia.modo', tipo: 'opciones', etiqueta: 'Tipografía', defecto: 'original', valores: [
      { v: 'original', etiqueta: 'La tipografía original del diseño' }, { v: 'cambiar', etiqueta: 'Quiero otra tipografía' },
    ] },
    { id: 'diseno.tipografia.nombre', tipo: 'fuente', etiqueta: 'Elegir la tipografía', valores: FUENTES, si: { campo: 'diseno.tipografia.modo', es: 'cambiar' } },
    { id: 'diseno.tipografia.otra', tipo: 'texto', etiqueta: '¿Otra fuente? Escribir el nombre', max: 80, si: { campo: 'diseno.tipografia.modo', es: 'cambiar' }, placeholder: 'Por ejemplo: Parisienne' },
  ],
});

// ── Complementos: tarjetas Save The Date y de agradecimiento ──────────
// La tarjeta es la del modelo (mismo estilo que la invitación). Se edita directo sobre la
// tarjeta (textos, tamaños y posición) y al generarla queda fija: se descarga o se comparte.
export const DISENOS_FOTO = [
  { v: 'f1', etiqueta: 'Corazón geométrico' }, { v: 'f2', etiqueta: 'Pinceladas' }, { v: 'f3', etiqueta: 'Ramitas' },
  { v: 'f4', etiqueta: 'Editorial' }, { v: 'f5', etiqueta: 'Minimal' }, { v: 'f6', etiqueta: 'Encaje' },
  { v: 'f7', etiqueta: 'Blanco y negro' }, { v: 'f8', etiqueta: 'Agenda la fecha' },
];
const pasoTarjeta = (clase, modelo) => (clase === 'std' ? {
  id: 'std', seccion: 'std', complemento: true, titulo: 'Tarjeta Save The Date',
  // Con tarjeta propia del diseño: viene incluida en Premium y Deluxe (se prende sola con la primera sección de esos planes)
  incluidaPremium: !!modelo?.tarjetas?.std,
  campos: [
    { id: 'nota.std', tipo: 'nota', estilo: 'ayuda', texto: modelo?.tarjetas?.std
      ? 'Una tarjeta para mandar antes de la invitación. La del mismo diseño viene incluida en Premium y Deluxe; la tarjeta con foto se suma en cualquier plan.'
      : 'Una tarjeta para mandar antes de la invitación, con una foto y el diseño que se elija. Se suma en cualquier plan.' },
    ...(modelo?.tarjetas?.std ? [{ id: 'std.tipo', tipo: 'opciones', etiqueta: 'Tipo de tarjeta', defecto: 'tarjeta', rearmar: true, valores: [
      { v: 'tarjeta', etiqueta: 'Tarjeta', ayuda: 'Con el mismo diseño que la invitación.', extra: 'std-tarjeta' }, { v: 'foto', etiqueta: 'Tarjeta con foto', ayuda: 'Se elige el diseño.', extra: 'std-foto' },
    ] }] : [{ id: 'std.tipo', tipo: 'opciones', etiqueta: 'Tipo de tarjeta', defecto: 'foto', oculto: true, valores: [{ v: 'foto', etiqueta: 'Tarjeta con foto', extra: 'std-foto' }] }]),
    // Diseños con foto: no dependen del modelo (public/comun/tarjetas/foto/catalogo.json)
    { id: 'std.diseno', tipo: 'disenoFoto', etiqueta: 'Diseño', defecto: DISENOS_FOTO[0].v, valores: DISENOS_FOTO, rearmar: true, si: { campo: 'std.tipo', es: 'foto' } },
    { id: 'std.tarjeta', tipo: 'tarjeta', clase: 'std', etiqueta: 'Tarjeta', sinEtiqueta: true },
  ],
} : {
  id: 'agradecimiento', seccion: 'agradecimiento', complemento: true, titulo: 'Tarjeta de agradecimiento',
  campos: [
    { id: 'nota.agradecimiento', tipo: 'nota', estilo: 'ayuda', texto: 'Para agradecer a los invitados después del evento: un mensaje, los nombres y una foto.' },
    // Con tarjeta propia en el modelo se elige entre esa y las con foto; si no, van las con foto
    ...(modelo?.tarjetas?.agradecimiento ? [{ id: 'agradecimiento.tipo', tipo: 'opciones', etiqueta: 'Tipo de tarjeta', defecto: 'foto', rearmar: true, valores: [
      { v: 'tarjeta', etiqueta: 'Tarjeta', ayuda: 'Con el mismo diseño que la invitación.', extra: 'agradecimiento' }, { v: 'foto', etiqueta: 'Tarjeta con foto', ayuda: 'Se elige el diseño.', extra: 'agradecimiento' },
    ] }] : []),
    { id: 'agradecimiento.diseno', tipo: 'disenoFoto', carpeta: 'gracias', etiqueta: 'Diseño', defecto: DISENOS_GRACIAS[0].v, valores: DISENOS_GRACIAS, rearmar: true,
      ...(modelo?.tarjetas?.agradecimiento ? { si: { campo: 'agradecimiento.tipo', no: 'tarjeta' } } : {}) },
    { id: 'agradecimiento.tarjeta', tipo: 'tarjeta', clase: 'agradecimiento', etiqueta: 'Tarjeta', sinEtiqueta: true },
  ],
});
// Tarjetas de agradecimiento con foto (public/comun/tarjetas/gracias/catalogo.json)
export const DISENOS_GRACIAS = [
  { v: 'g1', etiqueta: 'Ramitas' }, { v: 'g2', etiqueta: 'Rosas' }, { v: 'g3', etiqueta: 'Columna' }, { v: 'g4', etiqueta: 'Corazón geométrico' },
  { v: 'g5', etiqueta: 'Pinceladas' }, { v: 'g6', etiqueta: 'Encaje' }, { v: 'g7', etiqueta: 'Marco' }, { v: 'g8', etiqueta: 'Acuarela' },
];

// ── Complemento: idiomas adicionales, con todos los textos para personalizar en cada uno ──
const NOMBRE_IDIOMA = Object.fromEntries(IDIOMAS_BASE.map((x) => [x.v, x.etiqueta]));
function pasoIdiomaAdicional(base, datos) {
  const principal = String(datos.variante || 'es').slice(0, 2);
  // Los textos que el cliente puede personalizar en el idioma principal, para cada idioma elegido
  const traducibles = base.filter((p) => !p.complemento).flatMap((p) => p.campos
    .filter((c) => ['texto', 'area'].includes(c.tipo) && (c.base || c.titulo || c.traducible) && !c.id.startsWith('nombres.'))
    .map((c) => ({ c, seccion: p.titulo })));
  const bandera = (l, etiqueta) => ({ id: `idiomas.banderas.${l}`, tipo: 'bandera', etiqueta, valores: BANDERAS[l] || [], defecto: banderaDe(l, datos) });
  // Primero solo el selector; al elegir un idioma aparecen su bandera, "Editar textos en …" y "Agregar otro idioma"
  return {
    id: 'idiomaAdicional', seccion: 'idiomas', complemento: true, titulo: 'Idioma adicional',
    campos: [
      { id: 'nota.idiomas', tipo: 'nota', estilo: 'ayuda', texto: 'Cada invitado ve la invitación en su idioma y puede cambiarlo desde el botón flotante. Los textos se traducen solos y se pueden ajustar.' },
      ...[2, 3, 4].flatMap((n) => {
        const l = datos.idiomas?.[`l${n}`];
        const ok = l && l !== principal;
        return [
          ...(n > 2 ? [{ id: `separador.idioma.${n}`, tipo: 'nota', estilo: 'linea', uiIdioma: n }] : []),
          { id: `idiomas.l${n}`, tipo: 'opciones', etiqueta: n === 2 ? 'Idioma adicional' : `Idioma adicional ${n - 1}`, valores: IDIOMAS_BASE, rearmar: true, distintoDe: 'variante', uiIdioma: n, quitable: n > 2 },
          ...(ok ? [
            ...(n === 2 ? [bandera(principal, `Bandera del ${(NOMBRE_IDIOMA[principal] || principal).toLowerCase()} (idioma principal)`)] : []),
            bandera(l, `Bandera del ${(NOMBRE_IDIOMA[l] || l).toLowerCase()}`),
            { id: `ui.textos.${l}`, tipo: 'botonTextos', idioma: l, etiqueta: `Editar textos en ${NOMBRE_IDIOMA[l] || l}` },
            ...traducibles.map(({ c, seccion }) => ({
              id: `traducciones.${l}.${c.id}`, tipo: c.tipo, etiqueta: `${seccion} · ${c.titulo ? 'Título' : c.etiqueta}`, max: c.max, traduccion: { idioma: l, de: c.id, base: c.base }, si: c.si, uiTextos: l,
            })),
          ] : []),
        ];
      }),
      { id: 'ui.agregarIdioma', tipo: 'agregarIdioma', etiqueta: 'Agregar otro idioma' },
    ],
  };
}

// ── Idioma principal (obligatorio) ────────────────────────────────────
// La seguridad ("Quién puede ver la invitación") vive al principio de Lista de invitados
const pasoIdioma = {
  id: 'idioma', titulo: 'Idioma', obligatoria: true,
  campos: [
    { id: 'variante', tipo: 'idioma', etiqueta: 'Idioma principal de la invitación', idiomas: IDIOMAS_BASE, variantes: VARIANTES_ES, defecto: 'es', rearmar: true },
    { id: 'nota.idiomaAdicional', tipo: 'nota', estilo: 'boton', texto: '¿Invitados que hablan otro idioma? Con un idioma adicional, cada uno ve la invitación en el suyo.', boton: 'Sumar un idioma adicional →', irA: 'idiomaAdicional' },
  ],
};

const pasoPublicar = (tipo) => ({
  id: 'publicar', titulo: 'Link y miniatura', obligatoria: true,
  campos: [
    { id: 'slug', tipo: 'slug', etiqueta: 'Link de la invitación', prefijo: `amoinvitar.com/${tipo}/`, requerido: true, max: 40 },
    // La foto para compartir se sube y se encuadra directo en la vista previa (como se ve en WhatsApp o Facebook)
    { id: 'miniatura.foto', tipo: 'fotoCompartir', etiqueta: 'Foto al compartir el link (opcional)', proporcion: PROPORCION.miniatura, encuadre: true, ayuda: 'Sin foto se usa la de portada; sin fotos, una imagen del diseño con los nombres.' },
    { id: 'miniatura.conTexto', tipo: 'switch', etiqueta: 'Poner los nombres sobre la foto', opciones: ['Imagen sola', 'Imagen y nombres'] },
    { id: 'meta.descripcion', tipo: 'texto', etiqueta: 'Frase para acompañar el link', max: 120, base: 'meta.descripcion', ayuda: 'Aparece debajo del título en WhatsApp, Facebook, etc.' },
    { id: 'vista.compartir', tipo: 'vistaCompartir', etiqueta: 'Vista previa' },
    // La arma el panel (1200×630) cada vez que cambian la foto, los nombres o el switch
    { id: 'miniatura.generada', tipo: 'foto', oculto: true },
  ],
});

// ── Save The Date y tarjetas ──────────────────────────────────────────
const datosBasicos = (plural = true) => ({
  id: 'datos', titulo: 'Datos',
  campos: [
    { id: 'nombres.a', tipo: 'texto', etiqueta: plural ? 'Nombre 1' : 'Nombre', max: 30, requerido: true },
    { id: 'nombres.b', tipo: 'texto', etiqueta: 'Nombre 2 (si son dos)', max: 30 },
    { id: 'std.fecha', tipo: 'fecha', etiqueta: 'Fecha del evento', requerido: true },
    { id: 'std.ciudad', tipo: 'texto', etiqueta: 'Ciudad', max: 50, placeholder: 'Buenos Aires' },
    { id: 'std.frase', tipo: 'area', etiqueta: 'Frase', max: 140, placeholder: 'Save the date' },
  ],
});

const pasoFormato = {
  id: 'formato', titulo: 'Formato y entrega',
  campos: [
    { id: 'std.formatos', tipo: 'opciones', multiple: true, etiqueta: 'Formatos', valores: [
      { v: 'historia', etiqueta: 'Historia / estado (9:16)' }, { v: 'post', etiqueta: 'Publicación (4:5)' }, { v: 'cuadrado', etiqueta: 'Cuadrado (1:1)' },
    ], defecto: ['historia'] },
    { id: 'std.idioma', tipo: 'opciones', etiqueta: 'Idioma', valores: IDIOMAS },
    { id: 'std.notas', tipo: 'area', etiqueta: 'Algo más para el diseño', max: 500 },
  ],
};

const PRODUCTOS_STD = {
  'std-web': () => [
    datosBasicos(),
    { id: 'fotos', titulo: 'Fotos y música', campos: [
      { id: 'fotos.portada', tipo: 'fotos', etiqueta: 'Fotos', max: 3, foco: true, proporcion: '9:16' },
      { id: 'musica.archivo', tipo: 'mp3', etiqueta: 'Música (MP3, opcional)', maxMB: 12 },
    ] },
    { id: 'agendar', titulo: 'Agendar', campos: [
      { id: 'zonaHoraria', tipo: 'zona', etiqueta: 'País / zona horaria', valores: ZONAS },
      { id: 'std.agendar', tipo: 'switch', etiqueta: 'Mostrar botón "Agendar"', defecto: true },
    ] },
    pasoPublicar('save-the-date'),
  ],
  'std-tarjeta': () => [datosBasicos(), pasoFormato],
  'std-foto': () => [datosBasicos(), { id: 'fotos', titulo: 'Foto', campos: [
    { id: 'fotos.principal', tipo: 'foto', etiqueta: 'Foto principal', requerido: true, ayuda: 'En buena calidad: es la base del diseño.' },
    { id: 'fotos.extra', tipo: 'fotos', etiqueta: 'Otras fotos para elegir (opcional)', max: 4 },
  ] }, pasoFormato],
  'std-tarjeta-medida': () => [datosBasicos(), pasoBrief({}), pasoFormato],
  'std-web-medida': () => [datosBasicos(), pasoBrief({}), { id: 'fotos', titulo: 'Fotos y música', campos: [
    { id: 'fotos.portada', tipo: 'fotos', etiqueta: 'Fotos', max: 6 }, { id: 'musica.archivo', tipo: 'mp3', etiqueta: 'Música (MP3, opcional)', maxMB: 12 },
  ] }, pasoPublicar('save-the-date')],
  'std-video': () => [datosBasicos(), { id: 'material', titulo: 'Material para el video', campos: [
    { id: 'video.fotos', tipo: 'fotos', etiqueta: 'Fotos', max: 20 },
    { id: 'video.cancion', tipo: 'texto', etiqueta: 'Canción preferida', max: 100, placeholder: 'Artista — Canción' },
    { id: 'video.duracion', tipo: 'opciones', etiqueta: 'Duración', valores: [{ v: '15', etiqueta: '15 segundos' }, { v: '30', etiqueta: '30 segundos' }, { v: '60', etiqueta: '1 minuto' }] },
    { id: 'video.ideas', tipo: 'area', etiqueta: 'Ideas, estilo, referencias', max: 800 },
    { id: 'video.referencias', tipo: 'lista', etiqueta: 'Videos de referencia', max: 5, campos: [{ id: 'url', tipo: 'url', etiqueta: 'Link' }] },
  ] }, pasoFormato],
  agradecimiento: () => [
    { ...datosBasicos(), campos: datosBasicos().campos.map((c) => (c.id === 'std.frase' ? { ...c, etiqueta: 'Mensaje de agradecimiento', max: 300, placeholder: '¡Gracias por acompañarnos!' } : c)) },
    { id: 'fotos', titulo: 'Foto', campos: [{ id: 'fotos.principal', tipo: 'foto', etiqueta: 'Foto del evento (opcional)' }] },
    pasoFormato,
  ],
};
PRODUCTOS_STD['compromiso-web'] = PRODUCTOS_STD['std-web'];

// ── Diseño a medida (personalizado, empresarial, personaje favorito) ──
function pasoBrief({ aMedida }) {
  return {
    id: 'brief', titulo: 'Ideas para el diseño',
    campos: [
      ...(aMedida === 'personaje' ? [
        { id: 'brief.personaje', tipo: 'texto', etiqueta: 'Personaje o temática', max: 80, requerido: true, placeholder: 'Bluey, Frozen, Minecraft…' },
      ] : []),
      ...(aMedida === 'empresarial' ? [
        { id: 'brief.empresa', tipo: 'texto', etiqueta: 'Empresa', max: 80 },
        { id: 'brief.logo', tipo: 'foto', etiqueta: 'Logo (PNG o SVG, mejor sin fondo)' },
      ] : []),
      { id: 'brief.estilo', tipo: 'area', etiqueta: 'Estilo, sensaciones, ideas', max: 1000, placeholder: 'Romántico, rústico, con flores secas…' },
      { id: 'brief.colores', tipo: 'lista', etiqueta: 'Colores', max: 4, campos: [{ id: 'color', tipo: 'color', etiqueta: 'Color' }] },
      { id: 'brief.tipografia', tipo: 'texto', etiqueta: 'Tipografía preferida (si hay)', max: 80 },
      { id: 'brief.referencias', tipo: 'fotos', etiqueta: 'Imágenes de referencia', max: 8 },
      { id: 'brief.links', tipo: 'lista', etiqueta: 'Links de referencia (Pinterest, Instagram…)', max: 6, campos: [{ id: 'url', tipo: 'url', etiqueta: 'Link' }] },
    ],
  };
}

// El diseño a medida usa las secciones de un modelo base mientras se diseña
export const MODELO_A_MEDIDA = {
  id: 'a-medida',
  paquetes: {
    premium: { secciones: ['historia', 'galeria', 'rsvp', 'dresscode', 'album', 'canciones', 'regalos'], incluye: { sobre: true, musica: true, cuenta: true, fotosPortada: 4, fotosGaleria: 9 } },
    deluxe: { secciones: ['historia', 'galeria', 'rsvp', 'dresscode', 'hospedaje', 'bus', 'itinerario', 'testigos', 'album', 'canciones', 'regalos', 'redes'], incluye: { sobre: true, musica: true, cuenta: true, fotosPortada: 4, fotosGaleria: 12, sugerenciasDress: true } },
  },
  iconosItinerario: [],
};

// ── El plan sale de lo que elige el cliente ───────────────────────────
// Cada sección es de un paquete (la más baja que la trae en modelo.json) y algunas
// funciones sueltas también (campo.paquete). El plan es el más alto de lo que esté
// activo o cargado. Diseño e Idioma adicional son complementos que se suman aparte.
export const NIVELES = ['gratis', 'basic', 'premium', 'deluxe'];
function paqueteMinimo(modelo, seccion) {
  return ['basic', 'premium', 'deluxe'].find((p) => modelo.paquetes[p]?.secciones.includes(seccion)) || SECCION_MINIMA[seccion] || 'deluxe';
}
const usado = (c, v) => (c.tipo === 'switch' ? v === true : Array.isArray(v) ? v.length > 0 : v != null && v !== '' && v !== false);
// Las secciones sin decidir se toman como prendidas (eventos de antes); los complementos, apagados
export function seccionActiva(paso, datos) {
  if (paso.interruptor) return !!leer(datos, paso.interruptor) || (paso.fijoSi ? cumple(paso.fijoSi, datos) : false);
  if (!paso.seccion) return true;
  const v = datos.secciones?.[paso.seccion];
  return paso.complemento ? v === true : v !== false;
}

export function planNecesario(esquema, datos, { gratisPosible = false } = {}) {
  let n = 1;
  const subir = (p) => { n = Math.max(n, NIVELES.indexOf(p)); };
  for (const paso of esquema.pasos) {
    if (!seccionActiva(paso, datos)) continue;
    if ((paso.seccion || paso.nivelPaso) && !paso.complemento && paso.nivel) subir(paso.nivel);
    for (const c of paso.campos) {
      if (c.si && !cumple(c.si, datos)) continue;
      const v = leer(datos, c.id);
      if (c.paquete && usado(c, v)) subir(c.paquete);
      if (c.nivelCantidad && Array.isArray(v) && v.length >= c.nivelCantidad[0]) subir(c.nivelCantidad[1]);
    }
  }
  return n === 1 && gratisPosible && datos.planElegido === 'gratis' ? 'gratis' : NIVELES[n];
}

// Complementos elegidos: colores, tipografía y un idioma por cada adicional
export function complementos(esquema, datos) {
  const x = [];
  const paso = (id) => esquema.pasos.find((p) => p.id === id);
  if (paso('diseno') && seccionActiva(paso('diseno'), datos)) {
    if (datos.diseno?.paleta?.modo === 'cambiar') x.push('paleta');
    if (datos.diseno?.tipografia?.modo === 'cambiar') x.push('tipografia');
  }
  if (paso('std') && seccionActiva(paso('std'), datos)) x.push((datos.std?.tipo || (paso('std').incluidaPremium ? 'tarjeta' : 'foto')) === 'foto' ? 'std-foto' : 'std-tarjeta');
  if (paso('agradecimiento') && seccionActiva(paso('agradecimiento'), datos)) x.push('agradecimiento');
  // Video de portada: complemento en cualquier plan
  if (paso('portada')?.campos.some((c) => c.id === 'portada.video') && datos.portada?.tipo === 'video' && datos.fotosOn?.portada !== false) x.push('video-portada');
  if (paso('idiomaAdicional') && seccionActiva(paso('idiomaAdicional'), datos)) {
    const principal = String(datos.variante || 'es').slice(0, 2);
    const ls = new Set([2, 3, 4].map((n) => datos.idiomas?.[`l${n}`]).filter((l) => l && l !== principal));
    ls.forEach(() => x.push('idioma'));
  }
  return x;
}

// Cada paso con su nivel (para los avisos Basic / Premium / Deluxe / Complemento del menú)
function anotar(pasos, { modelo, gratis = false, disenoEnviado = false, publicada = false, cerrada = false, admin = false }) {
  return pasos.map((paso) => ({
    ...paso,
    nivel: paso.complemento ? 'complemento' : paso.nivelPaso || (paso.seccion ? paqueteMinimo(modelo, paso.seccion) : 'basic'),
    campos: paso.campos.map((c) => {
      if (paso.complemento && gratis) return { ...c, cerrado: 'Los complementos no están disponibles en el plan gratis.' };
      if (admin) return c;
      if (paso.id === 'diseno' && disenoEnviado && c.tipo !== 'nota') return { ...c, cerrado: 'El pedido de diseño ya se envió al equipo.' };
      if (cerrada && c.tipo !== 'nota') return { ...c, cerrado: 'El evento ya pasó: la invitación no se puede modificar. Si necesitas un cambio, escríbenos por WhatsApp.', pedirCambio: true };
      if (publicada && FIJOS_PUBLICADA.includes(c.id)) return { ...c, cerrado: 'La invitación ya está publicada: los nombres y la fecha se cambian pidiéndolo por WhatsApp.', pedirCambio: true };
      return c;
    }),
  }));
}

// ── Después de publicar ───────────────────────────────────────────────
// Para que una invitación no se "recicle" para otro evento, los nombres y la fecha quedan
// fijos al publicarla (se cambian pidiéndolo por WhatsApp). Todo lo demás se puede corregir
// hasta unos días después del evento. El superusuario edita siempre, sin restricciones.
export const FIJOS_PUBLICADA = ['nombres.a', 'nombres.b', 'ceremonia.fecha', 'celebracion.fecha'];
export const DIAS_EDICION_TRAS_EVENTO = 7;
export function edicionCerrada(datos, ahora = new Date()) {
  const f = datos.celebracion?.fecha || String(datos.celebracion?.inicio || '').slice(0, 10) || datos.ceremonia?.fecha;
  if (!f) return false;
  const limite = new Date(`${f}T23:59:59Z`); limite.setUTCDate(limite.getUTCDate() + DIAS_EDICION_TRAS_EVENTO);
  return ahora > limite;
}

// ── ¿Quién puede entrar a la invitación? (una sola pregunta, 4 opciones) ──
// Es lo único que decide el cliente; los campos de antes (acceso.modo, acceso.lista,
// acceso.pinPorInvitado) se derivan solos (aplicarTipoAcceso) y son los que usa src/acceso.js.
//   abierta   cualquiera con el link                       Basic
//   pin       un PIN para todos                            Basic
//   lista     link personal; solo entran los de la lista   Premium
//   listaPin  link personal + PIN propio de cada uno       Premium
export const TIPOS_ACCESO = ['abierta', 'pin', 'lista', 'listaPin'];
export function tipoAcceso(a = {}) {
  if (TIPOS_ACCESO.includes(a.tipo)) return a.tipo;
  // Invitaciones de antes: se pasan a la opción equivalente
  const conLista = a.lista || a.modo === 'codigo' || (a.modo === 'pin' && a.pinPorInvitado);
  if (conLista) return a.modo === 'pin' ? 'listaPin' : 'lista';
  return a.modo === 'pin' ? 'pin' : 'abierta';
}
export function aplicarTipoAcceso(datos) {
  const a = (datos.acceso ??= {});
  const t = tipoAcceso(a);
  Object.assign(a, {
    tipo: t,
    modo: { abierta: 'abierta', pin: 'pin', lista: 'codigo', listaPin: 'pin' }[t],
    lista: t === 'lista' || t === 'listaPin',
    pinPorInvitado: t === 'listaPin',
  });
  return datos;
}
const esLista = { o: [{ campo: 'acceso.tipo', es: 'lista' }, { campo: 'acceso.tipo', es: 'listaPin' }] };
const CAMPOS_ACCESO = [
  { id: 'acceso.tipo', tipo: 'opciones', etiqueta: '¿Quién puede entrar a la invitación?', defecto: 'abierta', rearmar: true, tarjetasAcceso: true, valores: [
    { v: 'abierta', icono: '🔓', etiqueta: 'Abierta', ayuda: 'Entra cualquiera que tenga el link.', nivel: 'basic' },
    { v: 'pin', icono: '🔑', etiqueta: 'Con PIN', ayuda: 'Con el link, pone un PIN de 4 números (el mismo para todos).', nivel: 'basic' },
    { v: 'lista', icono: '👥', etiqueta: 'Lista de invitados', ayuda: 'Cada uno recibe su link personal, con su nombre, pases y mesa. Solo entran los de la lista.', nivel: 'premium' },
    { v: 'listaPin', icono: '👥🔑', etiqueta: 'Lista + PIN', ayuda: 'Igual que la anterior, y además cada uno pone su propio PIN.', nivel: 'premium' },
  ] },
  { id: 'acceso.pin', tipo: 'texto', etiqueta: 'PIN para todos', max: 4, patron: '^[0-9]{4}$', placeholder: '1234', ancho: 'mitad', si: { campo: 'acceso.tipo', es: 'pin' } },
  { id: 'acceso.ejemplo', tipo: 'ejemploAcceso' },
];

// ── Entrada principal ─────────────────────────────────────────────────
// producto: 'invitacion' | 'a-medida' | 'std-web' | 'std-tarjeta' | …
export function esquemaPanel({ producto = 'invitacion', tipo = 'boda', paquete = 'basic', modelo, aMedida = null, gratis = false, disenoEnviado = false, datos = {}, publicada = false, admin = false }) {
  if (PRODUCTOS_STD[producto]) {
    return { producto, pasos: PRODUCTOS_STD[producto]() };
  }
  const m = producto === 'a-medida' ? MODELO_A_MEDIDA : modelo;
  const base = pasosInvitacion({ tipo, modelo: m });
  // Sin lista de invitados en el modelo (a medida, etc.), la seguridad va sola antes del idioma
  const conAcceso = base.some((p) => p.id === 'invitados') ? [] : [{ id: 'seguridad', titulo: 'Acceso', obligatoria: true,
    campos: CAMPOS_ACCESO.map((c) => (c.id === 'acceso.tipo' ? { ...c, valores: c.valores.filter((o) => !o.v.startsWith('lista')) } : c)) }];
  const pasos = [
    ...(producto === 'a-medida' ? [pasoBrief({ aMedida })] : []),
    // Idioma justo después de Portada: si cambia el idioma principal, cambian los textos de la invitación
    ...base.flatMap((p) => (p.id === 'portada' ? [p, pasoIdioma] : [p])),
    ...conAcceso,
    pasoPublicar(tipo),
    // Complementos: aparte, después de una línea y el título "Complementos" en el menú
    // Save The Date en todos los modelos (la del diseño, si el modelo la tiene; si no, las con foto)
    ...(producto === 'invitacion' ? [{ ...pasoTarjeta('std', m), separado: true }] : []),
    { ...pasoDiseno(m), separado: producto !== 'invitacion' },
    pasoIdiomaAdicional(base, datos),
    ...(producto === 'invitacion' ? [pasoTarjeta('agradecimiento', m)] : []),
  ];
  const cerrada = publicada && edicionCerrada(datos);
  return { producto, tipo, paquete, publicada, cerrada: cerrada && !admin, admin, pasos: anotar(pasos, { modelo: m, gratis, disenoEnviado, publicada, cerrada, admin }) };
}

// Condición "si" de un campo: { campo, es | no } · [todas] · { o: [alguna] }
export function cumple(s, datos) {
  if (Array.isArray(s)) return s.every((x) => cumple(x, datos));
  if (s.o) return s.o.some((x) => cumple(x, datos));
  const v = leer(datos, s.campo);
  return s.es !== undefined ? v === s.es : s.no !== undefined ? (v ?? '') !== s.no : Array.isArray(v) ? v.length > 0 : !!v;
}

// ── Limpieza al guardar: solo lo que el esquema permite ───────────────
const leer = (o, ruta) => ruta.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
function escribir(o, ruta, v) {
  const ks = ruta.split('.'); let x = o;
  ks.slice(0, -1).forEach((k) => { x = x[k] ??= {}; });
  x[ks.at(-1)] = v;
}
const URL_OK = /^(https?:\/\/|\/media\/)/i;
const POS_OK = /^\d{1,3}% \d{1,3}%$/;
const HEX = /^#[0-9a-f]{6}$/i;
const ZONAS_OK = new Set(ZONAS.map((z) => z.v));
const IDIOMAS_OK = new Set(IDIOMAS.map((x) => x.v));

function limpiarValor(c, v) {
  if (v == null || v === '') return undefined;
  switch (c.tipo) {
    case 'texto': case 'area': case 'slug': {
      let s = String(v).slice(0, c.max || 2000);
      if (c.tipo === 'slug') s = s.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
      if (c.patron && !new RegExp(c.patron).test(s)) return undefined;
      return s;
    }
    case 'numero': case 'contador': { const n = Number(v); return Number.isFinite(n) ? Math.min(c.max ?? n, Math.max(c.min ?? n, n)) : undefined; }
    case 'switch': case 'revelar': return !!v;
    case 'fecha': return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
    case 'fechaHora': return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? v : undefined;
    case 'hora': return /^\d{2}:\d{2}$/.test(v) ? v : undefined;
    case 'color': return HEX.test(v) ? v : undefined;
    case 'url': case 'foto': case 'fotoCompartir': case 'mp3': case 'video': return URL_OK.test(v) ? String(v).slice(0, 500) : undefined;
    case 'zona': return ZONAS_OK.has(v) ? v : undefined;
    case 'idioma': return IDIOMAS_OK.has(v) ? v : undefined;
    case 'fuente': return c.valores.includes(v) ? v : undefined;
    case 'bandera': case 'disenoFoto': return c.valores.some((o) => o.v === v) ? v : undefined;
    // Tarjeta editada sobre el diseño: textos con su corrimiento y tamaño, la foto y su encuadre.
    // La imagen generada (y el bloqueo) los pone solo el servidor al generarla.
    case 'tarjeta': {
      if (typeof v !== 'object') return undefined;
      const num = (x, a, b) => (Number.isFinite(Number(x)) ? Math.min(b, Math.max(a, Number(x))) : undefined);
      const textos = {};
      for (const [k, t] of Object.entries(v.textos || {}).slice(0, 12)) {
        if (!/^\w{1,20}$/.test(k) || typeof t !== 'object' || !t) continue;
        textos[k] = { ...(typeof t.texto === 'string' ? { texto: t.texto.slice(0, 300) } : {}), dx: num(t.dx, -1200, 1200) || 0, dy: num(t.dy, -1500, 1500) || 0, escala: num(t.escala, 0.3, 3) || 1 };
      }
      const opcionales = Object.fromEntries(Object.entries(v.opcionales || {}).filter(([k]) => /^\w{1,20}$/.test(k)).slice(0, 6).map(([k, x]) => [k, !!x]));
      return { textos, extra: !!v.extra, opcionales, ...(URL_OK.test(v.foto || '') ? { foto: String(v.foto).slice(0, 500) } : {}),
        ...(POS_OK.test(v.fotoPos || '') ? { fotoPos: v.fotoPos } : {}), ...(num(v.fotoZoom, 1, 4) ? { fotoZoom: num(v.fotoZoom, 1, 4) } : {}) };
    }
    // Paleta: los 4 colores del diseño (vacío = ese color se quitó)
    case 'paleta': return [].concat(v).slice(0, 4).map((x) => (HEX.test(x || '') ? x.toLowerCase() : ''));
    case 'colores': return [].concat(v).filter((x) => HEX.test(x || '')).slice(0, c.max || 4).map((x) => x.toLowerCase());
    case 'opciones': {
      const ok = new Set(c.valores.map((x) => x.v));
      return c.multiple ? [].concat(v).filter((x) => ok.has(x)) : (ok.has(v) ? v : undefined);
    }
    case 'fotos': return [].concat(v).slice(0, c.max || 12).map((f) => (typeof f === 'string' ? { url: f } : f))
      .filter((f) => URL_OK.test(f?.url || '')).map((f) => ({ url: f.url, ...(POS_OK.test(f.pos || '') ? { pos: f.pos } : {}), ...((c.dosEncuadres || c.portada) && POS_OK.test(f.posPc || '') ? { posPc: f.posPc } : {}) }));
    case 'lista': return [].concat(v).slice(0, c.max || 10).map((item) => {
      const limpio = {};
      for (const sc of c.campos) {
        const x = limpiarValor(sc, item?.[sc.id]); if (x !== undefined) limpio[sc.id] = x;
        if (sc.encuadre && POS_OK.test(item?.[`${sc.id}Pos`] || '')) limpio[`${sc.id}Pos`] = item[`${sc.id}Pos`];
        const zoom = Number(item?.[`${sc.id}Zoom`]);
        if (sc.zoom && zoom > 1 && zoom <= 3) limpio[`${sc.id}Zoom`] = Math.round(zoom * 100) / 100;
      }
      return limpio;
    }).filter((x) => Object.keys(x).length);
    default: return undefined;
  }
}

export function limpiarDatos(esquema, datos, previos = {}) {
  const salida = structuredClone(previos);
  for (const paso of esquema.pasos) {
    if (paso.seccion) {
      const on = leer(datos, `secciones.${paso.seccion}`);
      if (on !== undefined) escribir(salida, `secciones.${paso.seccion}`, !!on);
    }
    if (paso.interruptor) {
      const on = leer(datos, paso.interruptor);
      if (on !== undefined) escribir(salida, paso.interruptor, !!on);
    }
    for (const c of paso.campos) {
      if (c.cerrado || ['invitados', 'nota', 'vistaCompartir', 'ejemploAcceso'].includes(c.tipo)) continue;
      const v = leer(datos, c.id);
      if (['foto', 'fotoCompartir'].includes(c.tipo) && c.encuadre) {
        const pos = leer(datos, `${c.id}Pos`);
        if (pos !== undefined) escribir(salida, `${c.id}Pos`, POS_OK.test(pos || '') ? pos : undefined);
      }
      if (v === undefined) continue;
      escribir(salida, c.id, limpiarValor(c, v));
    }
  }
  // Fecha y hora van en campos separados; el resto del sistema (calendarios, cuenta
  // regresiva, vencimiento del plan gratis) lee "inicio" = AAAA-MM-DDTHH:MM
  for (const p of ['ceremonia', 'celebracion']) {
    const l = salida[p];
    if (l?.fecha) l.inicio = l.hora ? `${l.fecha}T${l.hora}` : l.fecha;
    else if (l && 'fecha' in l) delete l.inicio;
    if (l) delete l.fin; // la duración sale del tipo de evento
  }
  // Un panel viejo (abierto antes del cambio) manda modo/lista/pinPorInvitado: se traduce a la opción
  if (datos.acceso && !TIPOS_ACCESO.includes(datos.acceso.tipo) && ('modo' in datos.acceso || 'lista' in datos.acceso)) {
    salida.acceso = { ...(salida.acceso || {}), tipo: tipoAcceso({ ...datos.acceso, tipo: undefined }) };
  }
  aplicarTipoAcceso(salida);
  return salida;
}

export function faltantes(esquema, datos) {
  const visibles = (c) => !c.si || cumple(c.si, datos);
  return esquema.pasos.flatMap((p) => (!seccionActiva(p, datos) ? [] : p.campos.filter((c) => c.requerido && visibles(c) && !c.cerrado && (leer(datos, c.id) ?? '') === '')
    .map((c) => ({ paso: p.id, campo: c.id, etiqueta: c.etiquetaFalta || c.etiqueta }))));
}
