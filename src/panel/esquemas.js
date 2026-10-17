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
const lugar = (p, { conFoto = true } = {}) => [
  { id: `${p}.nombre`, tipo: 'texto', etiqueta: 'Nombre del lugar', max: 80, placeholder: 'Estancia La Soñada' },
  { id: `${p}.direccion`, tipo: 'texto', etiqueta: 'Dirección', max: 140, ayuda: 'Con la dirección se arma solo el mapa y el botón "Cómo llegar".' },
  { id: `${p}.mapaLink`, tipo: 'url', etiqueta: 'Link de Google Maps (opcional)', ayuda: 'Solo si el mapa armado con la dirección no marca bien el lugar.' },
  ...(conFoto ? [{ id: `${p}.foto`, tipo: 'foto', etiqueta: 'Foto del lugar (opcional)', proporcion: '4:3' }] : []),
];

const ZONAS = [
  ['America/Argentina/Buenos_Aires', 'Argentina'], ['America/Montevideo', 'Uruguay'], ['America/Asuncion', 'Paraguay'],
  ['Europe/Madrid', 'España (península y Baleares)'], ['Atlantic/Canary', 'España (Canarias)'], ['America/Mexico_City', 'México (centro)'],
  ['America/Bogota', 'Colombia'], ['America/Santiago', 'Chile'], ['America/Lima', 'Perú'], ['America/Costa_Rica', 'Costa Rica'],
  ['America/Managua', 'Nicaragua'], ['America/New_York', 'EE. UU. (este)'], ['America/Los_Angeles', 'EE. UU. (oeste)'], ['Europe/London', 'Reino Unido'],
].map(([v, etiqueta]) => ({ v, etiqueta }));

const IDIOMAS = [
  { v: 'es-ar', etiqueta: 'Español rioplatense (vos)' }, { v: 'es-cr', etiqueta: 'Español centroamericano (vos)' },
  { v: 'es', etiqueta: 'Español neutro (tú)' }, { v: 'es-es', etiqueta: 'Español de España (tú / vosotros)' }, { v: 'en', etiqueta: 'English' },
];

// ── Pasos de la invitación web ────────────────────────────────────────
function pasosInvitacion({ tipo, modelo, paquete }) {
  const plural = PLURAL.has(tipo);
  const incluye = modelo.paquetes[paquete]?.incluye || {};
  const misa = tipo === '15' || tipo === 'comunion';
  const padrinos = tipo === 'boda' ? 'Testigos' : 'Padrinos';

  return [
    {
      id: 'nombres', titulo: plural ? 'Los novios' : 'Quién celebra',
      campos: [
        { id: 'nombres.a', tipo: 'texto', etiqueta: plural ? 'Primer nombre' : 'Nombre', max: 30, requerido: true, ayuda: 'Tal como va a aparecer: "Sofi", "Mariana"…' },
        ...(plural ? [{ id: 'nombres.b', tipo: 'texto', etiqueta: 'Segundo nombre', max: 30, requerido: true }] : []),
      ],
    },
    {
      id: 'portada', titulo: 'Portada y música',
      campos: [
        { id: 'fotos.portada', tipo: 'fotos', etiqueta: incluye.fotosPortada > 1 ? 'Fotos de portada' : 'Foto de portada', max: incluye.fotosPortada || 1, foco: true, proporcion: '9:16', ayuda: 'Mejor fotos verticales. Tocando la foto se elige qué parte queda al centro.' },
        { id: 'musica.archivo', tipo: 'mp3', etiqueta: 'Música de fondo (MP3)', paquete: 'premium', maxMB: 12 },
        { id: 'musica.inicio', tipo: 'numero', etiqueta: 'Empezar la canción en el segundo…', min: 0, max: 600, paquete: 'premium', si: { campo: 'musica.archivo' } },
      ],
    },
    { id: 'historia', seccion: 'historia', titulo: plural ? 'Nuestra historia' : 'Unas palabras', campos: [
      { id: 'historia.texto', tipo: 'area', etiqueta: 'Texto', max: 400, placeholderClave: 'historia.texto' },
    ] },
    { id: 'galeria', seccion: 'galeria', titulo: 'Galería de fotos', campos: [
      { id: 'fotos.galeria', tipo: 'fotos', etiqueta: 'Fotos', max: incluye.fotosGaleria || 6, proporcion: '4:5' },
    ] },
    {
      id: 'lugares', titulo: misa ? 'Misa y fiesta' : 'Ceremonia y celebración',
      campos: [
        { id: 'zonaHoraria', tipo: 'opciones', etiqueta: 'País / zona horaria del evento', valores: ZONAS, requerido: true },
        { id: 'ceremonia.modo', tipo: 'opciones', etiqueta: misa ? '¿Hay misa?' : '¿Hay ceremonia?', valores: [
          { v: 'separada', etiqueta: 'Sí, en otro lugar que la fiesta' },
          { v: 'mismo-lugar', etiqueta: 'Sí, en el mismo lugar de la fiesta' },
          { v: 'sin', etiqueta: 'No' },
        ] },
        ...(tipo === 'boda' ? [{ id: 'ceremonia.tipo', tipo: 'opciones', etiqueta: 'Tipo de ceremonia', si: { campo: 'ceremonia.modo', no: 'sin' }, valores: [
          { v: 'religiosa', etiqueta: 'Religiosa' }, { v: 'civil', etiqueta: 'Civil' }, { v: 'simbolica', etiqueta: 'Simbólica' },
        ] }] : []),
        { id: 'ceremonia.inicio', tipo: 'fechaHora', etiqueta: misa ? 'Día y hora de la misa' : 'Día y hora de la ceremonia', si: { campo: 'ceremonia.modo', no: 'sin' } },
        { id: 'ceremonia.fin', tipo: 'fechaHora', etiqueta: 'Termina (para el calendario, opcional)', si: { campo: 'ceremonia.modo', es: 'separada' } },
        ...lugar('ceremonia').map((c) => ({ ...c, si: { campo: 'ceremonia.modo', es: 'separada' } })),
        { id: 'celebracion.inicio', tipo: 'fechaHora', etiqueta: 'Día y hora de la fiesta', requerido: true },
        { id: 'celebracion.fin', tipo: 'fechaHora', etiqueta: 'Termina (para el calendario, opcional)' },
        ...lugar('celebracion'),
      ],
    },
    {
      id: 'rsvp', seccion: 'rsvp', titulo: 'Confirmación de asistencia',
      campos: [
        { id: 'rsvp.cierre', tipo: 'fecha', etiqueta: 'Recibir confirmaciones hasta el', ayuda: 'Vacío: se puede confirmar hasta el día del evento.' },
        { id: 'rsvp.texto', tipo: 'area', etiqueta: 'Texto', max: 250, placeholderClave: 'rsvp.texto' },
        { id: 'fotos.rsvp', tipo: 'foto', etiqueta: 'Foto', proporcion: '4:5' },
        { id: 'rsvp.acompanantes', tipo: 'numero', etiqueta: 'Acompañantes que puede sumar cada invitado (sin lista)', min: 0, max: 10, ayuda: 'Con lista de invitados se usan los pases de cada uno.' },
        { id: 'rsvp.preguntas.comida', tipo: 'switch', etiqueta: 'Preguntar restricciones alimentarias' },
        { id: 'rsvp.preguntas.alcohol', tipo: 'switch', etiqueta: 'Preguntar si toma alcohol' },
        { id: 'rsvp.preguntas.ninos', tipo: 'switch', etiqueta: 'Preguntar si va con niños' },
        { id: 'rsvp.preguntas.traslado', tipo: 'switch', etiqueta: 'Preguntar si necesita traslado', paquete: 'deluxe' },
      ],
    },
    {
      id: 'dresscode', seccion: 'dresscode', titulo: 'Dress code',
      campos: [
        { id: 'dresscode.texto', tipo: 'area', etiqueta: 'Texto', max: 200, placeholderClave: 'dresscode.texto' },
        { id: 'dresscode.fotos', tipo: 'fotos', etiqueta: 'Fotos de sugerencias de estilo', max: 6, paquete: 'deluxe', proporcion: '3:4' },
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
        { id: 'icono', tipo: 'opciones', etiqueta: 'Ícono', iconos: `/modelos/${modelo.id}/img/timeline-icon-{v}.png`, valores: (modelo.iconosItinerario || []).map((v) => ({ v, etiqueta: v })) },
      ] },
    ] },
    { id: 'testigos', seccion: 'testigos', titulo: padrinos, campos: [
      { id: 'testigos', tipo: 'lista', etiqueta: padrinos, max: 8, campos: [
        { id: 'nombre', tipo: 'texto', etiqueta: 'Nombre', max: 40 }, { id: 'rol', tipo: 'texto', etiqueta: 'Quién es', max: 40, placeholder: 'Hermano del novio' }, { id: 'foto', tipo: 'foto', etiqueta: 'Foto', proporcion: '1:1' },
      ] },
    ] },
    { id: 'album', seccion: 'album', titulo: 'Álbum de fotos compartido', campos: [
      { id: 'album.url', tipo: 'url', etiqueta: 'Link del álbum', ayuda: 'En Deluxe el álbum de Albunear se crea solo. En Premium se puede activar aparte o pegar otro link.' },
      { id: 'fotos.album', tipo: 'foto', etiqueta: 'Foto de la sección', proporcion: '16:9' },
    ] },
    { id: 'canciones', seccion: 'canciones', titulo: 'Música', campos: [
      { id: 'canciones.spotify', tipo: 'url', etiqueta: 'Lista de Spotify (opcional)', ayuda: 'Las canciones que sugieran los invitados llegan al panel.' },
    ] },
    { id: 'regalos', seccion: 'regalos', titulo: 'Regalos', campos: [
      { id: 'regalos.texto', tipo: 'area', etiqueta: 'Texto', max: 250, placeholderClave: 'regalos.texto' },
      { id: 'regalos.cuentas', tipo: 'lista', etiqueta: 'Datos bancarios', max: 6, campos: [
        { id: 'etiqueta', tipo: 'texto', etiqueta: 'Dato', max: 30, placeholder: 'Alias / IBAN / CBU / Titular' }, { id: 'dato', tipo: 'texto', etiqueta: 'Valor', max: 60 }, { id: 'copiable', tipo: 'switch', etiqueta: 'Botón copiar', defecto: true },
      ] },
      { id: 'regalos.lista.etiqueta', tipo: 'texto', etiqueta: 'Lista de regalos: tienda', max: 40 },
      { id: 'regalos.lista.dato', tipo: 'texto', etiqueta: 'Número o código de la lista', max: 40 },
      { id: 'regalos.lista.link', tipo: 'url', etiqueta: 'Link de la lista' },
      { id: 'regalos.lista.texto', tipo: 'area', etiqueta: 'Texto de la lista', max: 200, placeholderClave: 'regalos.listaTexto' },
    ] },
    { id: 'redes', seccion: 'redes', titulo: 'Redes del evento', campos: [
      { id: 'redes.instagram', tipo: 'url', etiqueta: 'Instagram' }, { id: 'redes.facebook', tipo: 'url', etiqueta: 'Facebook' }, { id: 'redes.tiktok', tipo: 'url', etiqueta: 'TikTok' },
    ] },
    { id: 'pie', titulo: 'Cierre', campos: [
      { id: 'pie.texto', tipo: 'area', etiqueta: 'Texto final', max: 400, placeholderClave: 'pie.texto' },
    ] },
  ];
}

// ── Pasos comunes: invitados y publicación ────────────────────────────
const pasoInvitados = {
  id: 'invitados', titulo: 'Invitados y seguridad',
  campos: [
    { id: 'acceso.modo', tipo: 'opciones', etiqueta: 'Quién puede ver la invitación', defecto: 'abierta', valores: [
      { v: 'abierta', etiqueta: 'Cualquiera con el link', ayuda: 'Sin seguridad. Lo más simple para compartir.' },
      { v: 'codigo', etiqueta: 'Solo con link personal', ayuda: 'Cada invitado recibe su propio link. Sin él, la invitación se ve bloqueada.' },
      { v: 'pin', etiqueta: 'Con PIN', ayuda: 'Se pide un PIN de 4 números antes de mostrar la invitación.' },
    ] },
    { id: 'acceso.pinPorInvitado', tipo: 'switch', etiqueta: 'Un PIN distinto para cada invitado', ayuda: 'Apagado: un solo PIN para todos.', si: { campo: 'acceso.modo', es: 'pin' } },
    { id: 'acceso.pin', tipo: 'texto', etiqueta: 'PIN para todos', max: 4, patron: '^[0-9]{4}$', placeholder: '1234', si: { campo: 'acceso.modo', es: 'pin' } },
    { id: 'acceso.lista', tipo: 'switch', etiqueta: 'Usar lista de invitados (nombre, pases y mesa en la invitación)' },
    { id: 'invitados', tipo: 'invitados', etiqueta: 'Lista de invitados', ayuda: 'Se puede pegar desde Excel: nombre, pases extra, mesa.' },
  ],
};

const pasoPublicar = (tipo) => ({
  id: 'publicar', titulo: 'Link y vista al compartir',
  campos: [
    { id: 'slug', tipo: 'slug', etiqueta: 'Link de la invitación', prefijo: `amoinvitar.com/${tipo}/`, requerido: true, max: 40 },
    { id: 'variante', tipo: 'opciones', etiqueta: 'Idioma de los textos', valores: IDIOMAS },
    { id: 'meta.descripcion', tipo: 'texto', etiqueta: 'Frase al compartir el link', max: 120, placeholderClave: 'meta.descripcion', ayuda: 'Aparece debajo del título en WhatsApp, Facebook, etc.' },
    { id: 'miniatura.foto', tipo: 'foto', etiqueta: 'Foto al compartir el link (opcional)', proporcion: '1.91:1', ayuda: 'Sin foto se usa la de portada; sin fotos, una imagen del diseño con los nombres.' },
    { id: 'miniatura.conTexto', tipo: 'switch', etiqueta: 'Poner los nombres sobre la foto', opciones: ['Imagen sola', 'Imagen y nombres'] },
    // La arma el panel (1200×630) cada vez que cambian la foto, los nombres o el switch
    { id: 'miniatura.generada', tipo: 'foto', oculto: true },
  ],
});

// ── Save The Date y tarjetas ──────────────────────────────────────────
const datosBasicos = (plural = true) => ({
  id: 'datos', titulo: 'Datos',
  campos: [
    { id: 'nombres.a', tipo: 'texto', etiqueta: plural ? 'Primer nombre' : 'Nombre', max: 30, requerido: true },
    { id: 'nombres.b', tipo: 'texto', etiqueta: 'Segundo nombre (si son dos)', max: 30 },
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

function aplicarBloqueos(pasos, { modelo, paquete }) {
  return pasos.map((paso) => {
    const bloqueo = paso.seccion && !modelo.paquetes[paquete]?.secciones.includes(paso.seccion)
      ? paqueteMinimo(modelo, paso.seccion) : null;
    return {
      ...paso,
      bloqueado: bloqueo,
      campos: paso.campos.map((c) => (c.paquete && !alcanza(paquete, c.paquete) ? { ...c, bloqueado: c.paquete } : c)),
    };
  });
}

// ── Entrada principal ─────────────────────────────────────────────────
// producto: 'invitacion' | 'a-medida' | 'std-web' | 'std-tarjeta' | …
export function esquemaPanel({ producto = 'invitacion', tipo = 'boda', paquete = 'basic', modelo, aMedida = null }) {
  if (PRODUCTOS_STD[producto]) {
    return { producto, pasos: PRODUCTOS_STD[producto]() };
  }
  const m = producto === 'a-medida' ? MODELO_A_MEDIDA : modelo;
  const base = pasosInvitacion({ tipo, modelo: m, paquete });
  const pasos = [
    ...(producto === 'a-medida' ? [pasoBrief({ aMedida })] : []),
    ...base,
    pasoInvitados,
    pasoPublicar(tipo),
  ];
  return { producto, tipo, paquete, pasos: aplicarBloqueos(pasos, { modelo: m, paquete }) };
}

// ── Limpieza al guardar: solo lo que el esquema permite ───────────────
const leer = (o, ruta) => ruta.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
function escribir(o, ruta, v) {
  const ks = ruta.split('.'); let x = o;
  ks.slice(0, -1).forEach((k) => { x = x[k] ??= {}; });
  x[ks.at(-1)] = v;
}
const URL_OK = /^(https?:\/\/|\/media\/)/i;

function limpiarValor(c, v) {
  if (v == null || v === '') return undefined;
  switch (c.tipo) {
    case 'texto': case 'area': case 'slug': {
      let s = String(v).slice(0, c.max || 2000);
      if (c.tipo === 'slug') s = s.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
      if (c.patron && !new RegExp(c.patron).test(s)) return undefined;
      return s;
    }
    case 'numero': { const n = Number(v); return Number.isFinite(n) ? Math.min(c.max ?? n, Math.max(c.min ?? n, n)) : undefined; }
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
      .filter((f) => URL_OK.test(f?.url || '')).map((f) => ({ url: f.url, ...(c.foco && /^\d{1,3}% \d{1,3}%$/.test(f.pos || '') ? { pos: f.pos } : {}) }));
    case 'lista': return [].concat(v).slice(0, c.max || 10).map((item) => {
      const limpio = {};
      for (const sc of c.campos) { const x = limpiarValor(sc, item?.[sc.id]); if (x !== undefined) limpio[sc.id] = x; }
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
      if (c.bloqueado || c.tipo === 'invitados') continue;
      const v = leer(datos, c.id);
      if (v === undefined) continue;
      escribir(salida, c.id, limpiarValor(c, v));
    }
  }
  return salida;
}

export function faltantes(esquema, datos) {
  const visibles = (c) => !c.si || (c.si.es !== undefined ? leer(datos, c.si.campo) === c.si.es
    : c.si.no !== undefined ? leer(datos, c.si.campo) !== c.si.no : !!leer(datos, c.si.campo));
  return esquema.pasos.flatMap((p) => (p.bloqueado ? [] : p.campos.filter((c) => c.requerido && visibles(c) && !c.bloqueado && (leer(datos, c.id) ?? '') === '')
    .map((c) => ({ paso: p.id, campo: c.id, etiqueta: c.etiqueta }))));
}
