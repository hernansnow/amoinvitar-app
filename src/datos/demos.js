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
};

const ITINERARIO = {
  boda: [['20:00', 'ceremonia', 'Ceremonia', 'Ceremony'], ['21:00', 'recepcion', 'Recepción', 'Reception'], ['22:00', 'cena', 'Cena', 'Dinner'], ['23:30', 'vals', 'Vals', 'First dance'], ['00:30', 'torta', 'Torta', 'Cake'], ['02:00', 'fiesta', 'Fiesta', 'Party']],
  15: [['20:00', 'iglesia', 'Misa', 'Mass'], ['21:00', 'recepcion', 'Recepción', 'Reception'], ['22:00', '15', 'Entrada', 'Grand entrance'], ['23:00', 'vals', 'Vals', 'Waltz'], ['00:30', 'torta', 'Torta', 'Cake'], ['02:00', 'fiesta', 'Fiesta', 'Party']],
  bautismo: [['11:00', 'iglesia', 'Bautismo', 'Baptism'], ['13:00', 'recepcion', 'Recepción', 'Reception'], ['14:00', 'cena', 'Almuerzo', 'Lunch'], ['16:00', 'torta', 'Torta', 'Cake']],
  comunion: [['11:00', 'iglesia', 'Misa', 'Mass'], ['13:00', 'recepcion', 'Recepción', 'Reception'], ['14:00', 'cena', 'Almuerzo', 'Lunch'], ['16:00', 'torta', 'Torta', 'Cake']],
  cumple: [['21:00', 'recepcion', 'Recepción', 'Welcome'], ['22:00', 'cena', 'Cena', 'Dinner'], ['00:00', 'torta', 'Torta', 'Cake'], ['01:00', 'fiesta', 'Fiesta', 'Party']],
};

export function eventoDemo({ tipo, variante, paquete, modelo, rutas }) {
  const cfg = POR_TIPO[tipo] || POR_TIPO.boda;
  const en = EN(variante);
  const fotosDe = `${rutas.modelo}/demo/${tipo}`;
  const comun = (p) => `${rutas.comun}/${p}`;
  const archivos = modelo.demo?.[tipo] || {};

  const portada = cfg.portada === 4
    ? [['hero-banner1.jpg', '75% 25%'], ['hero-banner2.jpg', '45% 40%'], ['hero-banner3.jpg', '50% 25%'], ['hero-banner4.jpg', '50% 25%']]
    : [[archivos.portada || (cfg.portada ? 'hero-banner.jpg' : 'foto1.jpg'), '50% 40%']];
  const galeria = Array.from({ length: cfg.galeria }, (_, i) => `${fotosDe}/foto${i + 1}.jpg`);
  const hora = tipo === 'bautismo' || tipo === 'comunion' ? ['11:00', '13:00'] : ['20:00', '21:00'];

  return {
    id: `demo-${modelo.id}-${tipo}`,
    tipo, modelo: modelo.id, paquete, variante,
    zonaHoraria: 'America/Argentina/Buenos_Aires',
    nombres: cfg.nombres,
    ceremonia: cfg.ceremonia
      ? { modo: 'separada', tipo: cfg.ceremonia, inicio: `2027-09-12T${hora[0]}`, fin: `2027-09-12T${hora[0].replace(/^(\d\d)/, (h) => String(+h + 1).padStart(2, '0'))}`, ...LUGARES.iglesia, foto: comun(LUGARES.iglesia.foto) }
      : { modo: 'sin' },
    celebracion: { inicio: `2027-09-12T${cfg.ceremonia ? hora[1] : '21:00'}`, ...LUGARES.estancia, foto: comun(LUGARES.estancia.foto) },
    fotos: {
      portada: portada.map(([f, pos]) => ({ url: `${fotosDe}/${f}`, pos })),
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
      : [
        { nombre: 'Juan Fernández', rol: en ? 'GODFATHER' : 'PADRINO', foto: comun('img/demo-testigo1.jpg') },
        { nombre: 'Marcela García', rol: en ? 'GODMOTHER' : 'MADRINA', foto: comun('img/demo-testigo2.jpg') },
      ],
    album: { url: 'https://albunear.com/demo' },
    canciones: { spotify: 'https://open.spotify.com/' },
    regalos: {
      cuentas: [
        { etiqueta: en ? 'IBAN' : 'Alias', dato: en ? 'XX00 0000 0000 0000' : 'XXX-XXX-XXX' },
        { etiqueta: en ? 'Account holder' : 'Titular', dato: 'Juan Fulano', copiable: false },
      ],
      lista: { etiqueta: en ? 'Registry' : 'Lista', dato: '000000-00', link: 'https://amoinvitar.com/' },
    },
    redes: { instagram: 'https://www.instagram.com/amoinvitar/', facebook: 'https://www.facebook.com/amoinvitar' },
    acceso: {},
    // En cumpleaños no hay padrinos: la demo no muestra esa sección
    secciones: tipo === 'cumple' ? { testigos: false } : {},
  };
}
