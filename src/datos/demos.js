// Eventos de muestra para la demo de cada modelo. Hay uno por tipo de evento;
// el modelo pone las fotos (carpeta demo/<tipo>/) y el idioma sale del país
// de quien visita. Los textos propios (historia, regalos…) no van acá: salen
// del diccionario del tipo de evento, así la demo siempre habla como el país.

const EN = (variante) => variante === 'en';

const LUGARES = {
  iglesia: { nombre: 'Parroquia Natividad del Señor', direccion: 'Av. Eugenia Tapia de Cruz 524, Escobar, Bs. As.', foto: 'img/demo-iglesia.jpg' },
  estancia: { nombre: 'Estancia La Soñada del Pilar', direccion: 'Sor Teresa y Cabo de Hornos, Pilar, Bs. As.', foto: 'img/demo-lugar.jpg' },
};

// Lo que cambia por tipo de evento
const POR_TIPO = {
  boda: { nombres: { a: 'Sofi', b: 'Ale' }, portada: 4, galeria: 12, testigos: true, ceremonia: 'religiosa' },
  15: { nombres: { a: 'Mariana' }, portada: 4, galeria: 12, ceremonia: 'religiosa' },
  bautismo: { nombres: { a: 'Fátima' }, portada: 1, galeria: 12, ceremonia: 'religiosa' },
  comunion: { nombres: { a: 'Mariana' }, portada: 1, galeria: 6, ceremonia: 'religiosa' },
  cumple: { nombres: { a: 'Mariel' }, portada: 0, galeria: 6, ceremonia: null },
  infantil: { nombres: { a: 'Martín' }, portada: 1, galeria: 6, ceremonia: null, hora: '17:00' },
  graduacion: { nombres: { a: 'Cinthia' }, portada: 1, galeria: 6, ceremonia: 'simbolica', horas: ['18:00', '21:00'], fecha: '2027-11-12' },
  babyshower: { nombres: { a: 'Mateo' }, portada: 1, galeria: 6, ceremonia: null, hora: '17:00' },
  revelacion: { nombres: { a: 'Dani', b: 'Marce' }, portada: 1, galeria: 6, ceremonia: null, hora: '17:00' },
  navidad: { nombres: { a: 'Familia Pérez' }, portada: 1, galeria: 8, ceremonia: null, fecha: '2027-12-24' },
};

const ITINERARIO = {
  boda: [['20:00', 'ceremonia', 'Ceremonia', 'Ceremony'], ['21:00', 'recepcion', 'Recepción', 'Reception'], ['22:00', 'cena', 'Cena', 'Dinner'], ['23:30', 'vals', 'Vals', 'First dance'], ['00:30', 'torta', 'Torta', 'Cake'], ['02:00', 'fiesta', 'Fiesta', 'Party']],
  15: [['20:00', 'iglesia', 'Misa', 'Mass'], ['21:00', 'recepcion', 'Recepción', 'Reception'], ['22:00', '15', 'Entrada', 'Grand entrance'], ['23:00', 'vals', 'Vals', 'Waltz'], ['00:30', 'torta', 'Torta', 'Cake'], ['02:00', 'fiesta', 'Fiesta', 'Party']],
  bautismo: [['11:00', 'iglesia', 'Bautismo', 'Baptism'], ['13:00', 'recepcion', 'Recepción', 'Reception'], ['14:00', 'cena', 'Almuerzo', 'Lunch'], ['16:00', 'torta', 'Torta', 'Cake']],
  comunion: [['11:00', 'iglesia', 'Misa', 'Mass'], ['13:00', 'recepcion', 'Recepción', 'Reception'], ['14:00', 'cena', 'Almuerzo', 'Lunch'], ['16:00', 'torta', 'Torta', 'Cake']],
  infantil: [['17:00', 'gorrito', 'Bienvenida', 'Welcome'], ['17:30', 'magia', 'Show de magia', 'Magic show'], ['18:30', 'pizza', 'Merienda', 'Snack time'], ['19:00', 'pinata', 'Piñata', 'Piñata'], ['19:30', 'torta', 'Torta', 'Cake']],
  graduacion: [['21:00', 'recepcion', 'Recepción', 'Reception'], ['22:00', 'cena', 'Cena', 'Dinner'], ['23:30', 'birrete', 'Entrada de egresados', 'Graduates\' entrance'], ['00:30', 'baile', 'Fiesta', 'Party'], ['03:00', 'last-call2', 'Despedida', 'Farewell']],
  babyshower: [['17:00', 'recepcion', 'Bienvenida', 'Welcome'], ['17:30', 'osito', 'Juegos', 'Games'], ['18:30', 'cena', 'Merienda', 'Snack time'], ['19:30', 'torta', 'Torta', 'Cake']],
  revelacion: [['17:00', 'recepcion', 'Bienvenida', 'Welcome'], ['17:30', 'osito', 'Juegos', 'Games'], ['18:30', 'burbujas', '¿Niño o niña?', 'Boy or girl?'], ['19:00', 'torta', 'Torta', 'Cake']],
  navidad: [['20:00', 'recepcion', 'Recepción', 'Reception'], ['21:00', 'cena', 'Cena', 'Dinner'], ['23:59', 'champagne', 'Brindis', 'Toast'], ['00:30', 'arbol', 'Regalos', 'Gifts'], ['01:00', 'baile', 'Fiesta', 'Party']],
  cumple: [['20:00', 'tragos', 'Rompiendo el hielo', 'Breaking the ice'], ['21:00', 'cena', 'A cenar se ha dicho', 'Dinner time'], ['22:00', 'disco', '¡Que empiece el baile!', 'Let the dancing begin!'], ['23:00', 'torta3', 'Mordisco al pastel y deseos', 'Cake and wishes'], ['23:30', 'baile', 'Hasta que el cuerpo aguante', 'Dance till we drop'], ['02:00', 'last-call2', 'Despedida', 'Farewell']],
};

export function eventoDemo({ tipo, variante, paquete, modelo, rutas }) {
  const cfg = POR_TIPO[tipo] || POR_TIPO.boda;
  const en = EN(variante);
  const fotosDe = `${rutas.modelo}/demo/${tipo}`;
  const comun = (p) => `${rutas.comun}/${p}`;
  const archivos = modelo.demo?.[tipo] || {};

  // El modelo puede fijar sus fotos de portada y el encuadre (modelo.json → demo.<tipo>.portadas:
  // ["hero-banner1.jpg", …] o [{ "f": "globo.jpg", "pos": "50% 30%", "posPc": "50% 40%" }])
  const propias = (archivos.portadas || []).map((x) => (typeof x === 'string' ? [x, '50% 50%'] : [x.f, x.pos || '50% 50%', x.posPc]));
  const portada = propias.length ? propias : cfg.portada === 4
    ? [['hero-banner1.jpg', '75% 25%'], ['hero-banner2.jpg', '45% 40%'], ['hero-banner3.jpg', '50% 25%'], ['hero-banner4.jpg', '50% 25%']]
    : [[archivos.portada || (cfg.portada ? 'hero-banner.jpg' : 'foto1.jpg'), '50% 40%']];
  const galeria = Array.from({ length: cfg.galeria }, (_, i) => `${fotosDe}/foto${i + 1}.jpg`);
  const hora = cfg.horas || (tipo === 'bautismo' || tipo === 'comunion' ? ['11:00', '13:00'] : ['20:00', '21:00']);

  return {
    id: `demo-${modelo.id}-${tipo}`,
    tipo, modelo: modelo.id, paquete, variante,
    zonaHoraria: 'America/Argentina/Buenos_Aires',
    nombres: archivos.nombres || cfg.nombres,
    ceremonia: cfg.ceremonia
      ? { modo: 'separada', tipo: cfg.ceremonia, inicio: `${cfg.fecha || '2027-09-12'}T${hora[0]}`, fin: `${cfg.fecha || '2027-09-12'}T${hora[0].replace(/^(\d\d)/, (h) => String(+h + 1).padStart(2, '0'))}`, ...LUGARES.iglesia, foto: comun(LUGARES.iglesia.foto) }
      : { modo: 'sin' },
    celebracion: { inicio: `${cfg.fecha || '2027-09-12'}T${cfg.ceremonia ? hora[1] : cfg.hora || '21:00'}`, ...LUGARES.estancia, foto: comun(LUGARES.estancia.foto) },
    fotos: {
      portada: portada.map(([f, pos, posPc]) => ({ url: `${fotosDe}/${f}`, pos, ...(posPc ? { posPc } : {}) })),
      galeria,
      rsvp: `${fotosDe}/${archivos.rsvp || 'rsvp.jpg'}`,
      album: `${fotosDe}/${archivos.album || 'instagram.jpg'}`,
    },
    musica: { archivo: comun(`audio/demo-${tipo}.mp3`) },
    rsvp: { cierre: '2027-08-10', acompanantes: 2, preguntas: { comida: true, alcohol: true, ninos: tipo === 'boda', traslado: true } },
    dresscode: { fotos: [1, 2, 3, 4, 5, 6].map((n) => comun(`img/demo-dress${n}.jpg`)) },
    hospedaje: {
      items: [
        { nombre: 'Hilton', direccion: 'Ruta 21, Km. 60.5', link: 'https://www.hilton.com/' },
        { nombre: 'Sheraton', direccion: 'Av. Principal 321', link: 'https://www.marriott.com/' },
      ],
    },
    bus: { paradas: [{ detalle: en ? '432 Independencia Ave. - 5:00 PM' : 'Av. Independencia 432 - 17:00hs' }, {}] },
    itinerario: (ITINERARIO[tipo] || ITINERARIO.boda).map(([h, icono, es, eng]) => ({ hora: en ? h : `${h}${variante === 'es-ar' || variante === 'es-cr' ? 'hs' : ' h'}`, icono, texto: en ? eng : es })),
    testigos: cfg.testigos
      ? [
        { nombre: 'Juan Fernández', rol: en ? "GROOM'S BROTHER" : 'HERMANO DEL NOVIO', foto: comun('img/demo-testigo1.jpg') },
        { nombre: 'Marcela García', rol: en ? "BRIDE'S BEST FRIEND" : 'MEJOR AMIGA DE LA NOVIA', foto: comun('img/demo-testigo2.jpg') },
      ]
      : tipo === 'cumple' ? [
        { nombre: 'Juan Fernández', rol: en ? 'BEST FRIEND' : 'MEJOR AMIGO', foto: comun('img/demo-testigo1.jpg') },
        { nombre: 'Marcela García', rol: en ? 'BEST FRIEND' : 'MEJOR AMIGA', foto: comun('img/demo-testigo2.jpg') },
      ] : [
        { nombre: 'Juan Fernández', rol: en ? 'GODFATHER' : 'PADRINO', foto: comun('img/demo-testigo1.jpg') },
        { nombre: 'Marcela García', rol: en ? 'GODMOTHER' : 'MADRINA', foto: comun('img/demo-testigo2.jpg') },
      ],
    album: { url: 'https://albunear.com/demo' },
    // Playlist de muestra (en la demo la lista viene escrita; en una invitación se lee de Spotify)
    playlist: { link: 'https://open.spotify.com/playlist/37i9dQZF1DX50QitC6Oqtn', cantidad: 10, minutos: 42, pistas: [
      { t: 'Gloria', a: 'Laura Branigan', d: '4:50' }, { t: 'La Isla del Sol', a: 'El Símbolo', d: '4:17' }, { t: 'Flaca', a: 'Andrés Calamaro', d: '4:38' },
      { t: 'Perfect', a: 'Ed Sheeran', d: '4:23' }, { t: 'Tu Misterioso Alguien', a: 'Miranda!', d: '4:05' }, { t: 'Vivir mi vida', a: 'Marc Anthony', d: '4:12' },
      { t: 'Thinking Out Loud', a: 'Ed Sheeran', d: '4:41' }, { t: 'Bailando', a: 'Enrique Iglesias', d: '4:03' }, { t: 'Despacito', a: 'Luis Fonsi', d: '3:48' }, { t: 'Shallow', a: 'Lady Gaga', d: '3:35' },
    ] },
    regalos: {
      cuentas: [
        { etiqueta: en ? 'IBAN' : 'Alias', dato: en ? 'XX00 0000 0000 0000' : 'XXX-XXX-XXX' },
        { etiqueta: en ? 'Account holder' : 'Titular', dato: 'Juan Fulano', copiable: false },
      ],
      lista: { etiqueta: en ? 'Registry' : 'Lista', dato: '000000-00', link: 'https://amoinvitar.com/' },
    },
    redes: { instagram: 'https://www.instagram.com/amoinvitar/', facebook: 'https://www.facebook.com/amoinvitar' },
    acceso: {},
    secciones: {},
  };
}
