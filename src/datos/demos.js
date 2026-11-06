// Eventos de muestra para la demo de cada modelo. Hay uno por tipo de evento;
// el modelo pone las fotos (carpeta demo/<tipo>/) y el idioma sale del país
// de quien visita. Los textos propios (historia, regalos…) no van acá: salen
// del diccionario del tipo de evento, así la demo siempre habla como el país.

const EN = (variante) => variante === 'en';

const LUGARES = {
  iglesia: { nombre: 'Parroquia Natividad del Señor', direccion: 'Av. Eugenia Tapia de Cruz 524, Escobar, Bs. As.', foto: 'img/demo-iglesia.jpg' },
  estancia: { nombre: 'Estancia La Soñada del Pilar', direccion: 'Sor Teresa y Cabo de Hornos, Pilar, Bs. As.', foto: 'img/demo-lugar.jpg' },
};

// README (ronda 37): cada demo tiene sus propios nombres, fecha y lugares (se eligen por el id del diseño, siempre los mismos),
// para que no todas digan «Sofi & Ale». Un diseño puede fijar los suyos en modelo.json (demo.<tipo>.nombres).
const hash = (t) => [...String(t)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const NOMBRES = {
  boda: [['Sofi', 'Ale'], ['Lau', 'Pablo'], ['Cami', 'Nico'], ['Vero', 'Santi'], ['Flor', 'Dani'], ['Caro', 'Martín'], ['Ana', 'Gabriel'], ['Luz', 'Emiliano'], ['Julia', 'Tomás'], ['Meli', 'Fede'], ['Pau', 'Lucas'], ['Rocío', 'Iván'], ['Mica', 'Franco'], ['Abi', 'Joaquín']],
  15: ['Mariana', 'Camila', 'Valentina', 'Lola', 'Martina', 'Delfina', 'Julieta', 'Abril', 'Emilia', 'Renata', 'Antonella', 'Malena', 'Guadalupe', 'Bianca'],
  bautismo: ['Fátima', 'Olivia', 'Emma', 'Amelia', 'Catalina', 'Josefina', 'Alma', 'Bianca'],
  comunion: ['Mariana', 'Sofía', 'Agustina', 'Pilar', 'Lucía', 'Victoria', 'Isabella', 'Zoe'],
  cumple: ['Mariel', 'Romina', 'Gabriela', 'Paula', 'Silvana', 'Claudia', 'Verónica', 'Natalia', 'Carolina', 'Marcela'],
  graduacion: ['Cinthia', 'Julieta', 'Brenda', 'Micaela', 'Daniela', 'Florencia', 'Agostina'],
  infantil: ['Martín', 'Joaquín', 'Valentino', 'Benicio', 'Thiago', 'Facundo'],
  babyshower: ['Mateo', 'Lucas', 'Olivia', 'Bruno', 'Alma', 'Santino'],
};
const FECHAS = ['2027-09-12', '2027-10-23', '2027-11-06', '2027-12-04', '2028-03-18', '2027-10-09', '2028-04-15', '2027-09-25'];
const IGLESIAS = [
  { nombre: 'Parroquia Natividad del Señor', direccion: 'Av. Eugenia Tapia de Cruz 524, Escobar, Bs. As.' },
  { nombre: 'Iglesia Nuestra Señora del Pilar', direccion: 'Calle Mayor 12, Pilar, Bs. As.' },
  { nombre: 'Capilla San Isidro Labrador', direccion: 'Camino Real 340, San Isidro, Bs. As.' },
  { nombre: 'Parroquia Santa Teresita', direccion: 'Av. del Libertador 1800, Vicente López, Bs. As.' },
];
const SALONES = [
  { nombre: 'Estancia La Soñada del Pilar', direccion: 'Sor Teresa y Cabo de Hornos, Pilar, Bs. As.' },
  { nombre: 'Quinta Los Aromos', direccion: 'Camino de los Aromos 780, Escobar, Bs. As.' },
  { nombre: 'Salón Terrazas del Río', direccion: 'Av. Costanera 2250, Tigre, Bs. As.' },
  { nombre: 'Finca Las Rozas', direccion: 'Ruta 6 Km 54, Campana, Bs. As.' },
  { nombre: 'Jardín de los Olivos', direccion: 'Calle Los Olivos 95, Pilar, Bs. As.' },
];
// Textos propios de la temática de algunos diseños (solo en castellano; el resto usa los del tipo de evento)
const TEMATICOS = {
  'travel/boda': { bienvenida: { texto: '¡Abrochen los cinturones: nos casamos y el viaje de nuestras vidas despega!' }, historia: { texto: 'Nos conocimos esperando un vuelo demorado y desde entonces no paramos de viajar juntos. Hoy sabemos que el mejor destino es compartir la vida, y queremos que seas parte de este nuevo viaje.' }, dresscode: { texto: 'Elegante y cómodo, como para un buen viaje. Un toque de color en el look siempre suma.' }, regalos: { texto: 'Tu presencia es nuestro mejor regalo. Para quienes quieran sumarse a nuestra luna de miel (el próximo destino ✈️), aquí van los datos.' }, pie: { texto: 'Cada viaje es mejor en buena compañía. Te esperamos para despegar juntos hacia esta nueva aventura.' } },
  'travel/15': { bienvenida: { texto: '¡Prepárate para despegar: mis 15 son el comienzo de mi gran viaje!' }, historia: { texto: 'Desde chica sueño con recorrer el mundo. A mis 15 empiezo a armar la valija para el viaje más lindo de mi vida, y quiero que seas parte de él.' }, regalos: { texto: 'Tu presencia es mi mejor regalo. Para quienes quieran sumarse a mi próximo viaje ✈️, aquí van los datos.' }, pie: { texto: 'Los mejores viajes se hacen en buena compañía. Te espero para festejar juntos esta gran aventura.' } },
  'travel/cumple': { bienvenida: { texto: '¡Un año más de aventuras! Quiero invitarte a celebrar este nuevo destino.' }, historia: { texto: 'Cada año es un viaje con paisajes nuevos, personas increíbles y recuerdos para toda la vida. Hoy celebro un destino más y quiero hacerlo con quienes me acompañaron en el camino.' }, pie: { texto: 'La mejor escala de este viaje es compartirla con ustedes. Te espero para festejar juntos.' } },
  'travel/bautismo': { historia: { texto: 'Hoy comienza el primer gran viaje de mi vida, guiado por la luz y la bendición de Dios.' }, pie: { texto: 'Un nuevo viaje comienza y quiero compartirlo con quienes más quiero. Te espero para festejar juntos.' } },
  'travel/comunion': { historia: { texto: 'Hoy recibo a Jesús en mi corazón y empiezo un camino nuevo. Quiero compartir esta alegría con las personas que me acompañan en el viaje.' }, pie: { texto: 'Cada paso del camino es más lindo en buena compañía. Te espero para festejar juntos.' } },
  'rockabilly/boda': { bienvenida: { texto: '¡Prendan los amplificadores: nos casamos con mucho rock and roll!' }, historia: { texto: 'Nos cruzamos en un recital y desde esa noche bailamos al mismo ritmo. Hoy decidimos que el resto de la vida también va con música en vivo, y queremos que seas parte.' }, dresscode: { texto: 'Estilo años 50: vestidos con lunares, jeans de tiro alto, cuero y mucho rock and roll. ¡El look rockabilly es bienvenido!' }, regalos: { texto: 'Tu presencia es nuestro mejor regalo. Para quienes quieran sumarse a nuestra luna de miel, aquí van los datos 🎸' }, pie: { texto: 'Habrá música, baile, buena compañía y mucho rock and roll. Te esperamos para celebrarlo a puro ritmo.' } },
  'rockabilly/15': { bienvenida: { texto: '¡Sube el volumen: mis 15 son a puro rock and roll!' }, historia: { texto: 'Crecí entre vinilos, faldas con lunares y el rock de los años 50. Mis 15 son una fiesta a mi estilo, y quiero bailarla con quienes más quiero.' }, dresscode: { texto: 'Estilo años 50: lunares, cuero, jeans y mucha actitud. ¡El look rockabilly es bienvenido!' }, pie: { texto: 'Habrá música, baile y mucho rock and roll. Te espero para festejar a puro ritmo.' } },
  'rockabilly/cumple': { bienvenida: { texto: '¡Una noche de rock and roll para celebrar un año más!' }, historia: { texto: 'Los años pasan, pero el rock and roll no. Hoy celebro un año más a mi manera: con buena música, baile y la gente que más quiero.' }, dresscode: { texto: 'Estilo años 50: lunares, cuero, jeans y mucha actitud. ¡El look rockabilly es bienvenido!' }, pie: { texto: 'Habrá música, baile y mucho rock and roll. Te espero para festejar a puro ritmo.' } },
};

// Lo que cambia por tipo de evento
const POR_TIPO = {
  boda: { nombres: { a: 'Sofi', b: 'Ale' }, portada: 4, galeria: 12, testigos: true, ceremonia: 'religiosa' },
  15: { nombres: { a: 'Mariana' }, portada: 4, galeria: 12, ceremonia: 'religiosa' },
  bautismo: { nombres: { a: 'Fátima' }, portada: 1, galeria: 12, ceremonia: 'religiosa' },
  comunion: { nombres: { a: 'Mariana' }, portada: 1, galeria: 6, ceremonia: 'religiosa' },
  cumple: { nombres: { a: 'Mariel' }, portada: 0, galeria: 6, ceremonia: null },
  infantil: { nombres: { a: 'Martín' }, portada: 1, galeria: 6, ceremonia: null, hora: '17:00' },
  graduacion: { nombres: { a: 'Cinthia' }, portada: 1, galeria: 6, ceremonia: 'simbolica', horas: ['14:00', '18:00'], fecha: '2027-11-12' },
  babyshower: { nombres: { a: 'Mateo' }, portada: 1, galeria: 6, ceremonia: null, hora: '17:00' },
  revelacion: { nombres: { a: 'Dani & Marce' }, portada: 1, galeria: 6, ceremonia: null, hora: '17:00' },
  navidad: { nombres: { a: 'Familia Pérez' }, portada: 1, galeria: 8, ceremonia: null, fecha: '2027-12-24' },
};

const ITINERARIO = {
  boda: [['20:00', 'ceremonia', 'Ceremonia', 'Ceremony'], ['21:00', 'recepcion', 'Recepción', 'Reception'], ['22:00', 'cena', 'Cena', 'Dinner'], ['23:30', 'vals', 'Vals', 'First dance'], ['00:30', 'torta', 'Torta', 'Cake'], ['02:00', 'fiesta', 'Fiesta', 'Party']],
  15: [['20:00', 'iglesia', 'Ceremonia', 'Ceremony'], ['21:00', 'recepcion', 'Recepción', 'Reception'], ['22:00', '15', 'Entrada', 'Grand entrance'], ['23:00', 'vals', 'Vals', 'Waltz'], ['00:30', 'torta', 'Torta', 'Cake'], ['02:00', 'fiesta', 'Fiesta', 'Party']],
  bautismo: [['11:00', 'iglesia', 'Bautismo', 'Baptism'], ['13:00', 'recepcion', 'Recepción', 'Reception'], ['14:00', 'cena', 'Almuerzo', 'Lunch'], ['16:00', 'torta', 'Torta', 'Cake']],
  comunion: [['11:00', 'iglesia', 'Misa', 'Mass'], ['13:00', 'recepcion', 'Recepción', 'Reception'], ['14:00', 'cena', 'Almuerzo', 'Lunch'], ['16:00', 'torta', 'Torta', 'Cake']],
  infantil: [['15:00', 'gorrito', '¡Bienvenidos a la aventura!', 'Welcome to the adventure!'], ['16:00', 'magia', 'Animación especial', 'Special entertainment'], ['17:00', 'pizza', 'Recarga de energía', 'Snack time'], ['18:30', 'pinata', 'Hora de la piñata', 'Piñata time'], ['19:00', 'torta', 'Pastel y fin de la fiesta', 'Cake and goodbye']],
  graduacion: [['20:00', 'recepcion', 'Recepción del Graduado', 'Graduate\'s welcome'], ['20:30', 'mic', 'Palabras de agradecimiento', 'Thank-you words'], ['21:00', 'cena', 'Cena', 'Dinner'], ['22:00', 'baile', '¡Que empiece la fiesta!', 'Let the party begin!']],
  babyshower: [['16:00', 'recepcion', '¡Bienvenidos! (Abrazos y fotos)', 'Welcome! (Hugs and photos)'], ['16:30', 'cena', 'A comer delicioso', 'Time to eat'], ['17:00', 'osito', '¡Que comiencen los juegos!', 'Let the games begin!'], ['18:00', 'torta', 'Pastel y deseos para el bebé', 'Cake and wishes for the baby'], ['18:30', 'regalo', 'Regalos y despedida', 'Gifts and goodbye']],
  revelacion: [['17:00', 'recepcion', 'Bienvenida', 'Welcome'], ['17:30', 'osito', 'Juegos', 'Games'], ['18:30', 'burbujas', '¿Niño o niña?', 'Boy or girl?'], ['19:00', 'torta', 'Torta', 'Cake']],
  navidad: [['19:00', 'tragos', 'Cóctel de bienvenida', 'Welcome cocktail'], ['20:00', 'bengalas', 'Luces de bengala', 'Sparklers'], ['21:00', 'cena', '¡A cenar!', 'Dinner time!'], ['23:00', 'mic', 'Karaoke navideño', 'Christmas karaoke'], ['00:00', 'regalo', 'Intercambio de regalos', 'Gift exchange'], ['00:30', 'arbol', 'Brindis y risas junto al árbol', 'Toasts by the tree']],
  cumple: [['20:00', 'tragos', 'Rompiendo el hielo', 'Breaking the ice'], ['21:00', 'cena', 'A cenar se ha dicho', 'Dinner time'], ['22:00', 'disco', '¡Que empiece el baile!', 'Let the dancing begin!'], ['23:00', 'torta3', 'Mordisco al pastel y deseos', 'Cake and wishes'], ['23:30', 'baile', 'Hasta que el cuerpo aguante', 'Dance till we drop'], ['02:00', 'last-call2', 'Despedida', 'Farewell']],
};

export function eventoDemo({ tipo, variante, paquete, modelo, rutas }) {
  const cfg = POR_TIPO[tipo] || POR_TIPO.boda;
  const en = EN(variante);
  const fotosDe = `${rutas.modelo}/demo/${tipo}`;
  const comun = (p) => `${rutas.comun}/${p}`;
  const archivos = modelo.demo?.[tipo] || {};
  // Variaciones propias de cada diseño (nombres, fecha, lugares)
  const sem = hash(`${modelo.id}/${tipo}`);
  const pool = NOMBRES[tipo];
  const elegido = pool ? pool[sem % pool.length] : null;
  const nombres = archivos.nombres || (elegido ? (Array.isArray(elegido) ? { a: elegido[0], b: elegido[1] } : { a: elegido }) : cfg.nombres);
  const fecha = cfg.fecha || (pool ? FECHAS[(sem >> 3) % FECHAS.length] : '2027-09-12');
  const iglesia = { ...LUGARES.iglesia, ...IGLESIAS[(sem >> 5) % IGLESIAS.length] }, salon = { ...LUGARES.estancia, ...SALONES[(sem >> 7) % SALONES.length] };
  const cierre = new Date(Date.parse(fecha) - 33 * 86400000).toISOString().slice(0, 10);
  const textos = String(variante).startsWith('es') ? TEMATICOS[`${modelo.id}/${tipo}`] : null;

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
    nombres,
    ...(textos ? { textos } : {}),
    ceremonia: cfg.ceremonia
      ? { modo: 'separada', tipo: cfg.ceremonia, inicio: `${fecha}T${hora[0]}`, fin: `${fecha}T${hora[0].replace(/^(\d\d)/, (h) => String(+h + 1).padStart(2, '0'))}`, ...iglesia, foto: comun(iglesia.foto) }
      : { modo: 'sin' },
    celebracion: { inicio: `${fecha}T${cfg.ceremonia ? hora[1] : cfg.hora || '21:00'}`, ...salon, foto: comun(salon.foto) },
    fotos: {
      portada: portada.map(([f, pos, posPc]) => ({ url: `${fotosDe}/${f}`, pos, ...(posPc ? { posPc } : {}) })),
      galeria,
      rsvp: `${fotosDe}/${archivos.rsvp || 'rsvp.jpg'}`,
      historia: modelo.fotoHistoria ? `${fotosDe}/inicial.jpg` : '',
      album: `${fotosDe}/${archivos.album || 'instagram.jpg'}`,
    },
    musica: { archivo: comun(`audio/demo-${tipo}.mp3`) },
    rsvp: { cierre, acompanantes: 2, preguntas: { comida: true, alcohol: true, ninos: tipo === 'boda', traslado: true } },
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
