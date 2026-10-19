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

const ORDEN_PAQUETES = ['gratis', 'basic', 'premium', 'deluxe'];
const PLURAL = new Set(['boda']);

// ── Campos reutilizables ──────────────────────────────────────────────

const ZONAS = [
  ['America/Argentina/Buenos_Aires', 'Argentina'], ['America/La_Paz', 'Bolivia'], ['America/Sao_Paulo', 'Brasil (Brasilia, São Paulo)'],
  ['America/Toronto', 'Canadá (este)'], ['America/Vancouver', 'Canadá (oeste)'], ['America/Santiago', 'Chile'], ['America/Bogota', 'Colombia'],
  ['America/Costa_Rica', 'Costa Rica'], ['America/Havana', 'Cuba'], ['America/Guayaquil', 'Ecuador'], ['Pacific/Galapagos', 'Ecuador (Galápagos)'],
  ['America/El_Salvador', 'El Salvador'], ['Europe/Madrid', 'España (península y Baleares)'], ['Atlantic/Canary', 'España (Canarias)'],
  ['America/New_York', 'Estados Unidos (este: Nueva York, Miami)'], ['America/Chicago', 'Estados Unidos (centro: Chicago, Texas)'],
  ['America/Denver', 'Estados Unidos (montaña: Denver)'], ['America/Phoenix', 'Estados Unidos (Arizona)'], ['America/Los_Angeles', 'Estados Unidos (oeste: Los Ángeles)'],
  ['Pacific/Honolulu', 'Estados Unidos (Hawái)'], ['America/Guatemala', 'Guatemala'], ['America/Tegucigalpa', 'Honduras'],
  ['America/Mexico_City', 'México (centro: CDMX, Guadalajara, Monterrey)'], ['America/Cancun', 'México (Quintana Roo: Cancún)'],
  ['America/Mazatlan', 'México (Pacífico: Sinaloa, Baja California Sur)'], ['America/Hermosillo', 'México (Sonora)'], ['America/Tijuana', 'México (Baja California: Tijuana)'],
  ['America/Managua', 'Nicaragua'], ['America/Panama', 'Panamá'], ['America/Asuncion', 'Paraguay'], ['America/Lima', 'Perú'],
  ['America/Puerto_Rico', 'Puerto Rico'], ['America/Santo_Domingo', 'República Dominicana'], ['America/Montevideo', 'Uruguay'], ['America/Caracas', 'Venezuela'],
  ['Europe/Andorra', 'Andorra'], ['Europe/Berlin', 'Alemania'], ['Europe/Brussels', 'Bélgica'], ['Europe/Paris', 'Francia'], ['Europe/Rome', 'Italia'],
  ['Europe/Amsterdam', 'Países Bajos'], ['Europe/Lisbon', 'Portugal'], ['Europe/London', 'Reino Unido'], ['Europe/Zurich', 'Suiza'],
  ['Asia/Jerusalem', 'Israel'], ['Australia/Sydney', 'Australia (Sídney)'],
].map(([v, etiqueta]) => ({ v, etiqueta }));

const IDIOMAS = [
  { v: 'es-ar', etiqueta: 'Español rioplatense (vos)' }, { v: 'es-cr', etiqueta: 'Español centroamericano (vos)' },
  { v: 'es', etiqueta: 'Español neutro (tú)' }, { v: 'es-es', etiqueta: 'Español de España (tú / vosotros)' }, { v: 'en', etiqueta: 'English' },
];

// Nombres de los íconos del itinerario (el archivo es timeline-icon-<id>.png)
const ICONOS = {
  ceremonia: 'Ceremonia', iglesia: 'Iglesia', recepcion: 'Recepción', brindis: 'Brindis', tragos: 'Tragos', cena: 'Cena',
  vals: 'Vals', baile: 'Baile', fiesta: 'Fiesta', disco: 'Disco', torta: 'Torta', ramo: 'Ramo', zapatos: 'Zapatos',
  camara: 'Fotos', mic: 'Micrófono', novios: 'Novios', 15: '15 años', baby: 'Bebé', infantil: 'Infantil', 'last-call': 'Última ronda',
};
const nombreIcono = (v) => {
  const [, base, n] = /^(.*?)(?:-?([a-z]|\d))?$/.exec(v) || [];
  const nombre = ICONOS[v] || ICONOS[base] || v;
  return ICONOS[v] || !n ? nombre : `${nombre} ${/\d/.test(n) ? n : n.charCodeAt(0) - 96}`;
};

// ── Pasos de la invitación web ────────────────────────────────────────
// Solo estos eventos tienen ceremonia o misa; cumpleaños, infantiles, egresos y empresariales no
export const CON_CEREMONIA = new Set(['boda', '15', 'bautismo', 'comunion']);
// Lo mismo para testigos / padrinos
export const CON_PADRINOS = new Set(['boda', '15', 'bautismo', 'comunion']);

// Proporciones fijas de las fotos (las mismas de las fotos de muestra del modelo)
export const PROPORCION = { galeria: '1:1', lugar: '9:4', dress: '4:9', testigo: '1:1', rsvp: '1:1', album: '3:2', miniatura: '1.91:1' };

// "Incluir fotos": muchos prefieren la invitación sin fotos en alguna sección
const conFotos = (grupo, etiqueta = 'Incluir foto en esta sección') => ({ id: `fotosOn.${grupo}`, tipo: 'switch', etiqueta, defecto: true, rearmar: true });
const siFotos = (grupo) => ({ campo: `fotosOn.${grupo}`, no: false });

// Lugar: nombre, dirección, mapa, cómo se ve la dirección y su foto (con su interruptor)
const lugarCampos = (p) => [
  { id: `${p}.nombre`, tipo: 'texto', etiqueta: 'Nombre del lugar', max: 80, placeholder: 'Estancia La Soñada' },
  { id: `${p}.direccion`, tipo: 'texto', etiqueta: 'Dirección', max: 140, ayuda: 'Con la dirección se arma solo el mapa y el botón "Cómo llegar".' },
  { id: `${p}.mapaLink`, tipo: 'url', etiqueta: 'Link de Google Maps (opcional)', ayuda: 'Solo si el mapa armado con la dirección no marca bien el lugar.' },
  { id: `${p}.direccionTexto`, tipo: 'texto', etiqueta: 'Editar cómo se ve la dirección en la invitación', max: 140, espejo: `${p}.direccion`,
    ayuda: 'Se completa sola con la dirección. Se puede cambiar (por ejemplo "Pilar, Buenos Aires") sin que cambie el mapa.' },
  { id: `fotosOn.${p}`, tipo: 'switch', etiqueta: 'Incluir foto del lugar', defecto: true, rearmar: true, paquete: 'premium' },
  { id: `${p}.foto`, tipo: 'foto', etiqueta: 'Foto del lugar', proporcion: PROPORCION.lugar, encuadre: true, paquete: 'premium', si: siFotos(p) },
];

function pasosInvitacion({ tipo, modelo, paquete }) {
  const plural = PLURAL.has(tipo);
  const incluye = modelo.paquetes[paquete]?.incluye || {};
  const misa = tipo === '15' || tipo === 'comunion';
  const conCeremonia = CON_CEREMONIA.has(tipo);
  const padrinos = tipo === 'boda' ? 'Testigos' : 'Padrinos';
  const hayCeremonia = { campo: 'ceremonia.modo', es: 'separada' };
  const unificada = { campo: 'ceremonia.modo', es: 'mismo-lugar' };

  return [
    {
      id: 'nombres', titulo: plural ? 'Los novios' : 'Quién celebra',
      campos: [
        { id: 'nombres.a', tipo: 'texto', etiqueta: plural ? 'Nombre 1' : 'Nombre', max: 30, requerido: true, ayuda: 'Tal como va a aparecer: "Sofi", "Mariana"…' },
        ...(plural ? [{ id: 'nombres.b', tipo: 'texto', etiqueta: 'Nombre 2', max: 30, requerido: true }] : []),
      ],
    },
    {
      id: 'portada', titulo: 'Portada y música',
      campos: [
        { id: 'textos.portada.subtitulo', tipo: 'texto', etiqueta: 'Frase debajo de los nombres', max: 15, base: 'portada.subtitulo', ayuda: 'Por ejemplo "¡Nos casamos!", "Nuestra boda"…' },
        conFotos('portada', (incluye.fotosPortada || 1) > 1 ? 'Incluir fotos en la portada' : 'Incluir foto en la portada'),
        { id: 'fotos.portada', tipo: 'fotos', etiqueta: incluye.fotosPortada > 1 ? 'Fotos de portada' : 'Foto de portada', max: incluye.fotosPortada || 1, dosEncuadres: true,
          ayuda: 'Cada foto se ve distinta en el celular (vertical) y en la computadora (horizontal): arrastrar cada una para encuadrarla.', si: siFotos('portada') },
        { id: 'nota.portadaSinFoto', tipo: 'nota', texto: 'Sin fotos, la portada usa el fondo del diseño con los nombres.', si: { campo: 'fotosOn.portada', es: false } },
        { id: 'musica.archivo', tipo: 'mp3', etiqueta: 'Música de fondo (MP3)', paquete: 'premium', maxMB: 12 },
        { id: 'musica.inicio', tipo: 'contador', etiqueta: 'Empezar la canción en el segundo…', min: 0, max: 600, paso: 5, paquete: 'premium', si: { campo: 'musica.archivo' } },
      ],
    },
    { id: 'historia', seccion: 'historia', titulo: plural ? 'Nuestra historia' : 'Mi historia',
      ayudaSeccion: 'Apagada: en su lugar va un saludo corto de bienvenida.',
      campos: [
        { id: 'textos.historia.titulo', tipo: 'texto', etiqueta: 'Título', max: 30, base: 'historia.titulo' },
        { id: 'historia.texto', tipo: 'area', etiqueta: 'Texto', max: 400, base: 'historia.texto' },
      ] },
    { id: 'galeria', seccion: 'galeria', titulo: 'Galería de fotos', ayudaSeccion: 'Sin fotos: apagar "Mostrar".', campos: [
      { id: 'fotos.galeria', tipo: 'fotos', etiqueta: 'Fotos', max: incluye.fotosGaleria || 6, proporcion: PROPORCION.galeria,
        ayuda: 'Todas se ven cuadradas, del mismo tamaño. Arrastrar cada foto para encuadrarla. Con una sola foto también queda bien.' },
    ] },
    {
      id: 'lugares', titulo: 'Lugar y fecha',
      campos: [
        { id: 'zonaHoraria', tipo: 'opciones', etiqueta: 'País / zona horaria del evento', valores: ZONAS, requerido: true },
        ...(conCeremonia ? [
          { id: 'ceremonia.modo', tipo: 'opciones', etiqueta: misa ? '¿Hay misa?' : '¿Hay ceremonia?', defecto: 'separada', valores: [
            { v: 'separada', etiqueta: 'Sí, en otro lugar que la fiesta' },
            { v: 'mismo-lugar', etiqueta: 'Sí, en el mismo lugar de la fiesta' },
            { v: 'sin', etiqueta: 'No' },
          ] },
          // La ceremonia (o misa), cuando es en otro lugar
          { id: 'separador.ceremonia', tipo: 'nota', texto: misa ? 'La misa' : 'La ceremonia', si: hayCeremonia, estilo: 'subtitulo' },
          { id: 'ceremonia.titulo', tipo: 'texto', etiqueta: 'Título', max: 30, base: 'ceremonia.religiosa', si: hayCeremonia },
          { id: 'ceremonia.inicio', tipo: 'fechaHora', etiqueta: 'Día y hora de inicio', etiquetaFalta: misa ? 'Día y hora de la misa' : 'Día y hora de la ceremonia', requerido: true, si: hayCeremonia,
            ayuda: 'Para el calendario, termina cuando empieza la fiesta (o a las 2 horas si es otro día).' },
          ...lugarCampos('ceremonia').map((c) => ({ ...c, si: c.si ? [hayCeremonia, c.si] : hayCeremonia })),
          { id: 'separador.fiesta', tipo: 'nota', texto: misa ? 'La fiesta' : 'La celebración', si: hayCeremonia, estilo: 'subtitulo' },
          // El título de la fiesta cambia según haya ceremonia aparte, en el mismo lugar o ninguna
          { id: 'celebracion.titulo', tipo: 'texto', etiqueta: 'Título', max: 30, base: 'celebracion.titulo', si: hayCeremonia },
          { id: 'celebracion.tituloUnico', tipo: 'texto', etiqueta: 'Título', max: 30, base: 'unificado.titulo', si: unificada },
          { id: 'celebracion.tituloSolo', tipo: 'texto', etiqueta: 'Título', max: 30, base: 'celebracion.sola', si: { campo: 'ceremonia.modo', es: 'sin' } },
        ] : [
          { id: 'celebracion.tituloSolo', tipo: 'texto', etiqueta: 'Título', max: 30, base: 'celebracion.sola' },
        ]),
        { id: 'celebracion.inicio', tipo: 'fechaHora', etiqueta: 'Día y hora de inicio', etiquetaFalta: conCeremonia ? 'Día y hora de la fiesta' : 'Día y hora de inicio', requerido: true },
        { id: 'celebracion.fin', tipo: 'fechaHora', etiqueta: 'Fecha y hora estimada de finalización', etiquetaFalta: 'Fecha y hora de finalización de la fiesta', requerido: true, ayuda: 'Se usa para el calendario de los invitados.' },
        ...lugarCampos('celebracion'),
      ],
    },
    {
      id: 'rsvp', seccion: 'rsvp', titulo: 'RSVP',
      campos: [
        { id: 'rsvp.texto', tipo: 'area', etiqueta: 'Texto de la sección', max: 250, base: 'rsvp.texto' },
        { id: 'rsvp.cierre', tipo: 'fecha', etiqueta: 'Recibir confirmaciones hasta el', ayuda: 'Vacío: se puede confirmar hasta el día del evento.' },
        { id: 'acceso.lista', tipo: 'switch', etiqueta: 'Usar lista de invitados (nombre, pases y mesa en la invitación)', rearmar: true,
          fijoSi: { o: [{ campo: 'acceso.modo', es: 'codigo' }, [{ campo: 'acceso.modo', es: 'pin' }, { campo: 'acceso.pinPorInvitado', es: true }]] },
          motivo: 'Queda activada porque en Seguridad se eligió link personal o PIN por invitado.',
          ayuda: 'Cada invitado recibe su link personal y ve su nombre, pases y mesa. El link general sigue sirviendo para todos.' },
        { id: 'invitados', tipo: 'invitados', etiqueta: 'Lista de invitados', si: { o: [{ campo: 'acceso.lista' }, { campo: 'acceso.modo', es: 'codigo' }, [{ campo: 'acceso.modo', es: 'pin' }, { campo: 'acceso.pinPorInvitado', es: true }]] } },
        { id: 'rsvp.acompanantes', tipo: 'contador', etiqueta: 'Cantidad de acompañantes que puede sumar cada invitado', min: 0, max: 10, defecto: 0,
          si: [{ campo: 'acceso.lista', no: true }, { campo: 'acceso.modo', no: 'codigo' }, { o: [{ campo: 'acceso.modo', no: 'pin' }, { campo: 'acceso.pinPorInvitado', no: true }] }] },
        { ...conFotos('rsvp'), paquete: 'premium' },
        { id: 'fotos.rsvp', tipo: 'foto', etiqueta: 'Foto', proporcion: PROPORCION.rsvp, encuadre: true, paquete: 'premium', si: siFotos('rsvp') },
        { id: 'rsvp.preguntas.comida', tipo: 'switch', etiqueta: 'Preguntar restricciones alimentarias' },
        { id: 'rsvp.preguntas.alcohol', tipo: 'switch', etiqueta: 'Preguntar si toma alcohol' },
        { id: 'rsvp.preguntas.ninos', tipo: 'switch', etiqueta: 'Preguntar si va con niños' },
        { id: 'rsvp.preguntas.traslado', tipo: 'switch', etiqueta: 'Preguntar si necesita traslado', paquete: 'deluxe' },
        { id: 'rsvp.extras', tipo: 'lista', etiqueta: 'Preguntas propias', max: 5, agregar: 'Agregar pregunta', campos: [
          { id: 'pregunta', tipo: 'texto', etiqueta: 'Pregunta', max: 80, placeholder: '¿Qué canción no puede faltar?' },
          { id: 'opciones', tipo: 'texto', etiqueta: 'Opciones (separadas con coma; vacío = respuesta libre)', max: 160, placeholder: 'Sí, No, Tal vez' },
        ] },
      ],
    },
    {
      id: 'dresscode', seccion: 'dresscode', titulo: 'Dress code',
      campos: [
        { id: 'dresscode.texto', tipo: 'area', etiqueta: 'Texto', max: 200, base: 'dresscode.texto' },
        { id: 'fotosOn.dresscode', tipo: 'switch', etiqueta: 'Incluir fotos de sugerencias de estilo', defecto: true, rearmar: true, paquete: 'deluxe' },
        { id: 'dresscode.fotos', tipo: 'fotos', etiqueta: 'Fotos de sugerencias de estilo', max: 6, paquete: 'deluxe', proporcion: PROPORCION.dress, si: siFotos('dresscode') },
      ],
    },
    { id: 'hospedaje', seccion: 'hospedaje', titulo: 'Hospedaje', campos: [
      { id: 'hospedaje.texto', tipo: 'area', etiqueta: 'Texto (opcional)', max: 300 },
      { id: 'hospedaje.items', tipo: 'lista', etiqueta: 'Hoteles', max: 6, campos: [
        { id: 'nombre', tipo: 'texto', etiqueta: 'Hotel', max: 60 }, { id: 'direccion', tipo: 'texto', etiqueta: 'Dirección', max: 100 }, { id: 'link', tipo: 'url', etiqueta: 'Link de reservas' },
      ] },
    ] },
    { id: 'bus', seccion: 'bus', titulo: 'Servicio de traslado', campos: [
      { id: 'bus.texto', tipo: 'area', etiqueta: 'Texto (opcional)', max: 300 },
      { id: 'bus.paradas', tipo: 'lista', etiqueta: 'Recorrido', max: 5, campos: [
        { id: 'etiqueta', tipo: 'texto', etiqueta: 'Parada (vacío: "Partida", "Destino"…)', max: 30 }, { id: 'detalle', tipo: 'texto', etiqueta: 'Lugar y hora', max: 100 },
      ] },
    ] },
    { id: 'itinerario', seccion: 'itinerario', titulo: 'Itinerario', campos: [
      { id: 'itinerario', tipo: 'lista', etiqueta: 'Momentos', max: 12, campos: [
        { id: 'hora', tipo: 'texto', etiqueta: 'Hora', max: 10, placeholder: '21:00' },
        { id: 'texto', tipo: 'texto', etiqueta: 'Qué pasa', max: 40 },
        { id: 'icono', tipo: 'opciones', etiqueta: 'Ícono', iconos: `/modelos/${modelo.id}/img/timeline-icon-{v}.png`, valores: (modelo.iconosItinerario || []).map((v) => ({ v, etiqueta: nombreIcono(v) })) },
      ] },
    ] },
    // Testigos (boda) o padrinos (15, bautismo, comunión); cumpleaños, infantiles y egresos no tienen
    ...(!CON_PADRINOS.has(tipo) ? [] : [{ id: 'testigos', seccion: 'testigos', titulo: padrinos, campos: [
      { id: 'textos.testigos.titulo', tipo: 'texto', etiqueta: 'Título', max: 30, base: 'testigos.titulo' },
      conFotos('testigos', 'Incluir fotos'),
      { id: 'testigos', tipo: 'lista', etiqueta: padrinos, max: 8, campos: [
        { id: 'nombre', tipo: 'texto', etiqueta: 'Nombre', max: 40 }, { id: 'rol', tipo: 'texto', etiqueta: 'Quién es (opcional)', max: 40, placeholder: 'Hermano del novio' },
        { id: 'foto', tipo: 'foto', etiqueta: 'Foto', proporcion: PROPORCION.testigo, encuadre: true, redonda: true, si: siFotos('testigos') },
      ] },
    ] }]),
    // Premium: hashtag de Instagram · Deluxe: álbum compartido de Albunear
    paquete === 'premium' ? { id: 'album', seccion: 'album', titulo: 'Fotos con hashtag', campos: [
      { id: 'album.hashtag', tipo: 'texto', etiqueta: 'Hashtag de Instagram', max: 40, placeholder: 'SofiyAle2027',
        ayuda: 'Sin el #. Vacío: se arma solo con los nombres y el año. Los invitados etiquetan sus fotos y el botón "Ver fotos" las muestra.' },
      { id: 'textos.hashtag.texto', tipo: 'area', etiqueta: 'Texto', max: 300, base: 'hashtag.texto' },
      conFotos('album'),
      { id: 'fotos.album', tipo: 'foto', etiqueta: 'Foto de la sección', proporcion: PROPORCION.album, encuadre: true, si: siFotos('album') },
    ] } : { id: 'album', seccion: 'album', titulo: 'Álbum de fotos compartido', campos: [
      { id: 'textos.album.texto', tipo: 'area', etiqueta: 'Texto', max: 300, base: 'album.texto' },
      { id: 'album.url', tipo: 'url', etiqueta: 'Link del álbum', ayuda: 'El álbum de Albunear se crea solo. También se puede pegar otro link.' },
      conFotos('album'),
      { id: 'fotos.album', tipo: 'foto', etiqueta: 'Foto de la sección', proporcion: PROPORCION.album, encuadre: true, si: siFotos('album') },
    ] },
    { id: 'canciones', seccion: 'canciones', titulo: 'Música', campos: [
      { id: 'nota.canciones', tipo: 'nota', texto: 'Esta sección trae un formulario para que los invitados sugieran canciones. Las sugerencias llegan a "Respuestas", en este panel.' },
      { id: 'textos.canciones.texto', tipo: 'area', etiqueta: 'Texto', max: 200, base: 'canciones.texto' },
      { id: 'canciones.spotify', tipo: 'url', etiqueta: 'Lista de Spotify (opcional)', ayuda: 'Además del formulario, un botón a una lista de Spotify.' },
    ] },
    { id: 'regalos', seccion: 'regalos', titulo: 'Regalos', campos: [
      { id: 'regalos.texto', tipo: 'area', etiqueta: 'Texto', max: 250, base: 'regalos.texto' },
      { id: 'regalos.cuentas', tipo: 'lista', etiqueta: 'Datos bancarios', max: 6, campos: [
        { id: 'etiqueta', tipo: 'texto', etiqueta: 'Dato', max: 30, placeholder: 'Alias / IBAN / CBU / Titular' }, { id: 'dato', tipo: 'texto', etiqueta: 'Valor', max: 60 }, { id: 'copiable', tipo: 'switch', etiqueta: 'Botón copiar', defecto: true },
      ] },
      { id: 'regalos.lista.etiqueta', tipo: 'texto', etiqueta: 'Lista de regalos: tienda', max: 40 },
      { id: 'regalos.lista.dato', tipo: 'texto', etiqueta: 'Número o código de la lista', max: 40 },
      { id: 'regalos.lista.link', tipo: 'url', etiqueta: 'Link de la lista' },
      { id: 'regalos.lista.texto', tipo: 'area', etiqueta: 'Texto de la lista', max: 200, base: 'regalos.listaTexto' },
    ] },
    { id: 'redes', seccion: 'redes', titulo: 'Redes del evento', campos: [
      { id: 'redes.instagram', tipo: 'url', etiqueta: 'Instagram' }, { id: 'redes.facebook', tipo: 'url', etiqueta: 'Facebook' }, { id: 'redes.tiktok', tipo: 'url', etiqueta: 'TikTok' },
    ] },
    { id: 'pie', titulo: 'Cierre', campos: [
      { id: 'pie.texto', tipo: 'area', etiqueta: 'Texto final', max: 400, base: 'pie.texto' },
    ] },
  ];
}

// ── Diseño: colores y tipografía (adicional; por ahora los cambios los hace el equipo) ──
const pasoDiseno = {
  id: 'diseno', titulo: 'Diseño',
  campos: [
    { id: 'nota.diseno', tipo: 'nota', texto: 'Los cambios los hace el equipo de diseño: el pedido se envía al publicar y desde ese momento ya no se puede modificar.' },
    { id: 'diseno.paleta.modo', tipo: 'opciones', etiqueta: 'Colores', defecto: 'original', extra: 'paleta', valores: [
      { v: 'original', etiqueta: 'Los colores originales del diseño' }, { v: 'cambiar', etiqueta: 'Quiero otros colores' },
    ] },
    { id: 'diseno.paleta.colores', tipo: 'lista', etiqueta: 'Colores elegidos', max: 4, extra: 'paleta', agregar: 'Agregar color', si: { campo: 'diseno.paleta.modo', es: 'cambiar' }, campos: [{ id: 'color', tipo: 'color', etiqueta: 'Color' }] },
    { id: 'diseno.paleta.notas', tipo: 'area', etiqueta: 'Detalles de los colores (opcional)', max: 400, extra: 'paleta', si: { campo: 'diseno.paleta.modo', es: 'cambiar' }, placeholder: 'Verde oliva más oscuro y detalles en dorado…' },
    { id: 'diseno.tipografia.modo', tipo: 'opciones', etiqueta: 'Tipografía', defecto: 'original', extra: 'tipografia', valores: [
      { v: 'original', etiqueta: 'La tipografía original del diseño' }, { v: 'cambiar', etiqueta: 'Quiero otra tipografía' },
    ] },
    { id: 'diseno.tipografia.nombre', tipo: 'texto', etiqueta: 'Tipografía o estilo que se busca', max: 120, extra: 'tipografia', si: { campo: 'diseno.tipografia.modo', es: 'cambiar' }, placeholder: 'Una cursiva más simple, tipo Great Vibes…' },
  ],
};

// ── Idioma: el principal (variantes del español) y los adicionales contratados ──
const IDIOMAS_EXTRA = ['Inglés', 'Portugués', 'Italiano', 'Francés', 'Alemán', 'Catalán', 'Neerlandés', 'Hebreo'].map((v) => ({ v, etiqueta: v }));
const pasoIdioma = {
  id: 'idioma', titulo: 'Idioma',
  campos: [
    { id: 'variante', tipo: 'opciones', etiqueta: 'Idioma principal de la invitación', valores: IDIOMAS.filter((x) => x.v !== 'en') },
    { id: 'nota.idiomas', tipo: 'nota', texto: 'Idiomas adicionales: la invitación se traduce sola y después se pueden ajustar los textos de cada idioma.' },
    ...[2, 3, 4].map((n) => ({
      id: `idiomas.l${n}`, tipo: 'opciones', etiqueta: n === 2 ? 'Idioma secundario' : `Idioma ${n}`, valores: IDIOMAS_EXTRA, extra: 'idioma', extraN: n - 1, rearmar: true,
      ...(n > 2 ? { si: { campo: `idiomas.l${n - 1}` } } : {}),
    })),
  ],
};

// ── Seguridad (al final, atada a la lista de invitados del RSVP) ──────
const conLista = { campo: 'acceso.lista' };
const pasoSeguridad = {
  id: 'seguridad', titulo: 'Seguridad',
  campos: [
    { id: 'acceso.modo', tipo: 'opciones', etiqueta: 'Quién puede ver la invitación', defecto: 'abierta', valores: [
      { v: 'abierta', etiqueta: 'Cualquiera con el link', ayuda: 'Sin seguridad. Lo más simple para compartir.' },
      { v: 'codigo', etiqueta: 'Solo con link personal', ayuda: 'Cada invitado recibe su propio link. Sin él, la invitación se ve bloqueada.',
        requiere: conLista, motivo: 'Requiere la lista de invitados: activar "Usar lista de invitados" en RSVP.', irA: 'rsvp' },
      { v: 'pin', etiqueta: 'Con PIN', ayuda: 'Se pide un PIN de 4 números antes de mostrar la invitación.' },
    ] },
    { id: 'acceso.pinPorInvitado', tipo: 'switch', etiqueta: 'Un PIN distinto para cada invitado', ayuda: 'Apagado: un solo PIN para todos.', rearmar: true, si: { campo: 'acceso.modo', es: 'pin' },
      requiere: conLista, motivo: 'Requiere la lista de invitados: activar "Usar lista de invitados" en RSVP.', irA: 'rsvp' },
    { id: 'acceso.pin', tipo: 'texto', etiqueta: 'PIN para todos', max: 4, patron: '^[0-9]{4}$', placeholder: '1234', si: [{ campo: 'acceso.modo', es: 'pin' }, { campo: 'acceso.pinPorInvitado', no: true }] },
  ],
};

const pasoPublicar = (tipo) => ({
  id: 'publicar', titulo: 'Link y vista al compartir',
  campos: [
    { id: 'slug', tipo: 'slug', etiqueta: 'Link de la invitación', prefijo: `amoinvitar.com/${tipo}/`, requerido: true, max: 40 },
    { id: 'meta.descripcion', tipo: 'texto', etiqueta: 'Frase al compartir el link', max: 120, base: 'meta.descripcion', ayuda: 'Aparece debajo del título en WhatsApp, Facebook, etc.' },
    { id: 'miniatura.foto', tipo: 'foto', etiqueta: 'Foto al compartir el link (opcional)', proporcion: PROPORCION.miniatura, encuadre: true, ayuda: 'Sin foto se usa la de portada; sin fotos, una imagen del diseño con los nombres.' },
    { id: 'miniatura.conTexto', tipo: 'switch', etiqueta: 'Poner los nombres sobre la foto', opciones: ['Imagen sola', 'Imagen y nombres'] },
    // La arma el panel (1200×630) cada vez que cambian la foto, los nombres o el switch
    { id: 'miniatura.generada', tipo: 'foto', oculto: true },
  ],
});

// Confirmaciones y canciones que mandan los invitados (solo lectura)
const pasoRespuestas = { id: 'respuestas', titulo: 'Respuestas', especial: 'respuestas', campos: [] };

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
      { id: 'zonaHoraria', tipo: 'opciones', etiqueta: 'Zona horaria', valores: ZONAS },
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

// ── Bloqueos: lo que el paquete no trae se ve con "Pasate a…" ─────────
function paqueteMinimo(modelo, seccion) {
  return ORDEN_PAQUETES.find((p) => modelo.paquetes[p]?.secciones.includes(seccion)) || SECCION_MINIMA[seccion] || 'deluxe';
}
const alcanza = (actual, pedido) => ORDEN_PAQUETES.indexOf(actual === 'gratis' ? 'basic' : actual) >= ORDEN_PAQUETES.indexOf(pedido);

// Adicionales pagos (paleta, tipografía, idiomas): sin contratarlos se ven, pero apagados.
// El diseño pedido queda cerrado una vez enviado al publicar.
function aplicarBloqueos(pasos, { modelo, paquete, gratis = false, extras = [], disenoEnviado = false }) {
  const tiene = (e, n = 1) => extras.filter((x) => x === e || x.startsWith(`${e}:`)).length >= n;
  return pasos.map((paso) => {
    const bloqueo = paso.seccion && !modelo.paquetes[paquete]?.secciones.includes(paso.seccion)
      ? paqueteMinimo(modelo, paso.seccion) : null;
    return {
      ...paso,
      bloqueado: bloqueo,
      campos: paso.campos.map((c) => {
        if (c.paquete && !alcanza(paquete, c.paquete)) return { ...c, bloqueado: c.paquete };
        if (c.extra && gratis) return { ...c, cerrado: 'No disponible en el plan gratis.' };
        if (c.extra && !tiene(c.extra, c.extraN || 1)) return { ...c, sinExtra: c.extra };
        if (paso.id === 'diseno' && disenoEnviado && c.tipo !== 'nota') return { ...c, cerrado: 'El pedido de diseño ya se envió al equipo.' };
        return c;
      }),
    };
  });
}

// ── Entrada principal ─────────────────────────────────────────────────
// producto: 'invitacion' | 'a-medida' | 'std-web' | 'std-tarjeta' | …
export function esquemaPanel({ producto = 'invitacion', tipo = 'boda', paquete = 'basic', modelo, aMedida = null, gratis = false, extras = [], disenoEnviado = false }) {
  if (PRODUCTOS_STD[producto]) {
    return { producto, pasos: PRODUCTOS_STD[producto]() };
  }
  const m = producto === 'a-medida' ? MODELO_A_MEDIDA : modelo;
  const base = pasosInvitacion({ tipo, modelo: m, paquete });
  const pasos = [
    ...(producto === 'a-medida' ? [pasoBrief({ aMedida })] : []),
    ...base,
    pasoDiseno,
    pasoIdioma,
    pasoSeguridad,
    pasoPublicar(tipo),
    pasoRespuestas,
  ];
  return { producto, tipo, paquete, pasos: aplicarBloqueos(pasos, { modelo: m, paquete, gratis, extras, disenoEnviado }) };
}

// Condición "si" de un campo: { campo, es | no } · [todas] · { o: [alguna] }
export function cumple(s, datos) {
  if (Array.isArray(s)) return s.every((x) => cumple(x, datos));
  if (s.o) return s.o.some((x) => cumple(x, datos));
  const v = leer(datos, s.campo);
  return s.es !== undefined ? v === s.es : s.no !== undefined ? (v ?? '') !== s.no : !!v;
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
    case 'switch': return !!v;
    case 'fecha': return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
    case 'fechaHora': return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? v : undefined;
    case 'hora': return /^\d{2}:\d{2}$/.test(v) ? v : undefined;
    case 'color': return /^#[0-9a-f]{6}$/i.test(v) ? v : undefined;
    case 'url': case 'foto': case 'mp3': return URL_OK.test(v) ? String(v).slice(0, 500) : undefined;
    case 'opciones': {
      const ok = new Set(c.valores.map((x) => x.v));
      return c.multiple ? [].concat(v).filter((x) => ok.has(x)) : (ok.has(v) ? v : undefined);
    }
    case 'fotos': return [].concat(v).slice(0, c.max || 12).map((f) => (typeof f === 'string' ? { url: f } : f))
      .filter((f) => URL_OK.test(f?.url || '')).map((f) => ({ url: f.url, ...(POS_OK.test(f.pos || '') ? { pos: f.pos } : {}), ...(c.dosEncuadres && POS_OK.test(f.posPc || '') ? { posPc: f.posPc } : {}) }));
    case 'lista': return [].concat(v).slice(0, c.max || 10).map((item) => {
      const limpio = {};
      for (const sc of c.campos) {
        const x = limpiarValor(sc, item?.[sc.id]); if (x !== undefined) limpio[sc.id] = x;
        if (sc.encuadre && POS_OK.test(item?.[`${sc.id}Pos`] || '')) limpio[`${sc.id}Pos`] = item[`${sc.id}Pos`];
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
    if (paso.bloqueado) continue;
    for (const c of paso.campos) {
      if (c.bloqueado || c.cerrado || c.sinExtra || c.tipo === 'invitados' || c.tipo === 'nota') continue;
      const v = leer(datos, c.id);
      if (c.tipo === 'foto' && c.encuadre) {
        const pos = leer(datos, `${c.id}Pos`);
        if (pos !== undefined) escribir(salida, `${c.id}Pos`, POS_OK.test(pos || '') ? pos : undefined);
      }
      if (v === undefined) continue;
      escribir(salida, c.id, limpiarValor(c, v));
    }
  }
  return salida;
}

export function faltantes(esquema, datos) {
  const visibles = (c) => !c.si || cumple(c.si, datos);
  return esquema.pasos.flatMap((p) => (p.bloqueado ? [] : p.campos.filter((c) => c.requerido && visibles(c) && !c.bloqueado && !c.cerrado && (leer(datos, c.id) ?? '') === '')
    .map((c) => ({ paso: p.id, campo: c.id, etiqueta: c.etiquetaFalta || c.etiqueta }))));
}
