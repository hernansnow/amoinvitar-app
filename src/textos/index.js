// ════════════════════════════════════════════════════════════════════
// TEXTOS DE LAS INVITACIONES
//
// Se arman en capas (cada una pisa a la anterior):
//   1. BASE.es              textos funcionales en español neutro (tú)
//   2. BASE[variante]       ajustes de la variante (voseo, España, inglés)
//   3. EVENTOS[tipo].es     textos propios del tipo de evento
//   4. EVENTOS[tipo][var]   esos mismos, en la variante
//   5. lo que cambió el cliente en el panel (evento.textos)
//
// Variantes: es (neutro, tú/ustedes) · es-ar (vos: AR, UY, PY)
//            es-cr (vos con subjuntivo: CR, NI) · es-es (tú/vosotros) · en
// En los textos, {nombres} se reemplaza por los nombres del evento.
//
// Otros idiomas (pt, fr, it, ca, de, nl): textos/idiomas/<código>.js, sobre
// el inglés (lo que falte en esos archivos se ve en inglés, nunca vacío).
// ════════════════════════════════════════════════════════════════════

import pt from './idiomas/pt.js';
import fr from './idiomas/fr.js';
import it from './idiomas/it.js';
import ca from './idiomas/ca.js';
import de from './idiomas/de.js';
import nl from './idiomas/nl.js';

const OTROS = { pt, fr, it, ca, de, nl };

const BASE = {
  es: {
    'general.si': 'Sí', 'general.no': 'No',
    'playlist.titulo': 'Mi playlist', 'playlist.texto': 'Las canciones que van a sonar en la fiesta.', 'playlist.resumen': '{n} canciones · {min} min', 'playlist.verTodas': 'Ver las {n} canciones', 'playlist.verMenos': 'Ver menos', 'playlist.play': 'Reproducir la playlist', 'playlist.pausa': 'Pausar', 'playlist.abrir': 'Abrir en Spotify', 'galeria.ver': 'Ver foto', 'galeria.anterior': 'Anterior', 'galeria.siguiente': 'Siguiente',
    'meta.titulo': 'Invitación ❤ {evento} | {nombres}',
    'meta.descripcion': '¡Te esperamos para celebrar juntos!',

    'cuenta.faltan': 'Faltan', 'cuenta.dia': 'DÍA', 'cuenta.dias': 'DÍAS', 'cuenta.horas': 'HORAS', 'cuenta.min': 'MIN', 'cuenta.seg': 'SEG',
    'musica.boton': 'Música',

    'lugar.diaHorario': 'DÍA Y HORARIO', 'lugar.lugar': 'LUGAR',
    'ceremonia.religiosa': 'Ceremonia', 'ceremonia.civil': 'Ceremonia civil', 'ceremonia.simbolica': 'Ceremonia',
    'celebracion.titulo': 'Celebración', 'unificado.titulo': 'Ceremonia y Celebración', 'celebracion.sola': 'Celebración', 'bienvenida.texto': 'Quiero invitarte a compartir este día especial',
    'boton.agendar': 'Agendar', 'boton.comoLlegar': '¿CÓMO LLEGAR?', 'boton.cerrar': 'cerrar',
    'mapa.titulo': '¿Cómo llegar?', 'mapa.abrir': 'Ver en la app de Google Maps',

    'rsvp.titulo': 'Confirmación',
    'rsvp.botonHtml': "<i class='icon-send-o' aria-hidden='true'></i> CONFIRMAR ASISTENCIA",
    'rsvp.cerradoHtml': "<i class='icon-send-o' aria-hidden='true'></i> CONFIRMACIONES CERRADAS",
    'rsvp.hasta': 'Se reciben confirmaciones hasta el',
    'rsvp.finalizado': 'El plazo de confirmación ha finalizado.',
    'rsvp.modal': 'Confirmar asistencia',
    'rsvp.form.nombre': 'Tu nombre completo', 'rsvp.form.asiste': '¿Vas a asistir?',
    'rsvp.form.acompanante': 'Nombre del acompañante', 'rsvp.form.acompanantesSelect': '¿Irás con acompañantes?',
    'rsvp.form.comida': '¿Alguna restricción alimentaria?', 'rsvp.form.alcohol': '¿Beberás alcohol?',
    'rsvp.form.ninos': '¿Asistirás con niños?', 'rsvp.form.ninosCantidad': 'Cantidad de niños',
    'rsvp.form.traslado': '¿Necesitas traslado?', 'rsvp.form.noTraslado': 'No, iré por mi cuenta',
    'rsvp.form.subTraslado': 'Confirma para reservar tu asiento en el bus',
    'rsvp.form.seleccionar': 'Seleccionar', 'rsvp.form.otra': 'Otra', 'rsvp.form.detalle': 'Detalle...',
    'rsvp.form.acompananteN': 'Acompañante', 'rsvp.form.acompanantesPlaceholder': 'Nombre y apellido',
    'rsvp.form.enviar': 'ENVIAR', 'rsvp.form.enviando': 'Enviando...',
    'rsvp.form.siAsiste': 'Sí, ahí estaré 😀', 'rsvp.form.noAsiste': 'No podré asistir 😭',
    'rsvp.form.msgNoAsiste': '😢 Una pena que no puedas asistir. ¡Gracias por avisar!',
    'rsvp.form.msgOk': '¡Gracias! 🎉 Tu confirmación fue registrada',
    'rsvp.form.msgError': 'Error de conexión. Intenta de nuevo.',
    'rsvp.form.msgInvalida': 'Respuesta inválida del servidor.',
    'rsvp.form.msgVacios': 'Por favor completa los datos.',
    'rsvp.form.comidaOpciones': 'No|Celíaco|Vegano|Vegetariano',

    'dress.titulo': 'Dress Code', 'dress.boton': 'Sugerencias', 'dress.modal': 'Sugerencias de estilos', 'dress.evitar': 'Colores a evitar',
    'rsvp.form.comidaAcomp': '¿Algún acompañante tiene otra restricción? (opcional)',
    'rsvp.form.msgLleno': 'Ya se completó el cupo de invitados: no se reciben más confirmaciones.',
    'dresscode.texto': 'Formal y elegante. Por favor no usar blanco.',
    'hospedaje.titulo': 'Hospedaje', 'hospedaje.texto': 'Referencias de hoteles cercanos.',
    'hospedaje.boton': 'Referencias', 'hospedaje.modal': 'Referencias de hoteles cercanos', 'hospedaje.reservas': 'Reservas',
    'bus.titulo': 'Servicio de Bus', 'bus.texto': 'Reserva tu lugar en el formulario de confirmación.', 'bus.boton': 'Recorrido',
    'bus.partida': 'Partida', 'bus.parada': 'Parada intermedia', 'bus.destino': 'Destino',
    'itinerario.titulo': 'Itinerario',
    'album.titulo': 'Comparte tus Fotos', 'album.boton': 'SUBE TUS IMÁGENES',
    'hashtag.titulo': 'Etiqueta tus Fotos', 'hashtag.boton': 'VER FOTOS', 'hashtag.texto': '¡Prepárate para mi fiesta!<br>Etiquétame en Instagram con mi hashtag en tus fotos y videos.',
    'canciones.titulo': 'Música', 'canciones.spotify': 'Ir a Spotify', 'canciones.boton': 'Sugerir canción',
    'canciones.modal': 'Sugerir canciones', 'canciones.ayuda': 'Por favor completar el nombre de la canción y el intérprete.',
    'canciones.ejemplo': 'ej: Tu Amor — Juan Fulano', 'canciones.placeholder': 'Artista — Canción', 'canciones.enviar': 'Enviar',
    'canciones.msgVacio': 'Primero completar la canción', 'canciones.msgEnviando': 'Enviando...',
    'canciones.msgOk': '¡Canción enviada! 🎉 Se pueden enviar más.', 'canciones.msgError': 'Hubo un problema, intenta de nuevo.',
    'canciones.msgConexion': 'Error de conexión, intenta de nuevo.',
    'regalos.titulo': 'Regalos', 'regalos.botonCuenta': 'CUENTA BANCARIA', 'regalos.botonLista': 'LISTA DE REGALOS',
    'regalos.modalCuenta': 'Datos Bancarios', 'regalos.modalLista': 'Lista de regalos', 'regalos.irLista': 'Ir a la lista',
    'perdiste.titulo': '¿Te perdiste algo?', 'perdiste.rsvp': 'Confirmar asistencia', 'perdiste.agendar': 'Agendar evento',
    'perdiste.dress': 'Dress code', 'perdiste.canciones': 'Sugerir canción', 'perdiste.inicio': 'Inicio', 'perdiste.regalos': 'Regalos', 'perdiste.instagram': 'Instagram Wall', 'perdiste.album': 'Álbum de fotos', 'perdiste.itinerario': 'Itinerario', 'perdiste.hospedaje': 'Hospedaje', 'perdiste.bus': 'Traslado',

    'sobre.tocar': 'Tocar para abrir la invitación', 'sobre.aria': 'Invitación cerrada', 'sobre.ariaLacre': 'Abrir la invitación',
    'acceso.de': 'Acceso a la invitación de', 'acceso.pin': 'Ingresar el PIN enviado junto a la invitación:',
    'acceso.confirmar': 'Confirmar PIN', 'acceso.bloqueado': 'Este enlace no es válido. Contactar a los organizadores del evento.',
    'acceso.pinError': 'El PIN no es correcto.',
    'agendar.google': 'Google Calendar', 'agendar.apple': 'Apple (iPhone, Mac)', 'agendar.outlook': 'Outlook', 'agendar.otro': 'Otro calendario (.ics)',
    'lista.faltaCSV': 'Falta configurar lista de invitados', 'lista.errorCSV': 'Error cargando datos. Actualizar la página',
    'lista.paseExtra': 'pase extra reservado', 'lista.pasesExtras': 'pases extras reservados', 'lista.mesa': 'Mesa asignada: N°',
  },

  // Voseo rioplatense (Argentina, Uruguay, Paraguay)
  'es-ar': {
    'rsvp.form.acompanantesSelect': '¿Vas a ir con acompañantes?', 'rsvp.form.alcohol': '¿Vas a beber alcohol?',
    'rsvp.form.ninos': '¿Vas a ir con niños?', 'rsvp.form.traslado': '¿Necesitás traslado?',
    'rsvp.form.noTraslado': 'No, voy por mi cuenta', 'rsvp.form.subTraslado': 'Confirmá para reservar tu asiento en el bus',
    'rsvp.form.siAsiste': 'Sí, ahí voy a estar 😀', 'rsvp.form.noAsiste': 'No voy a poder ir 😭',
    'rsvp.form.msgError': 'Error de conexión. Intentá de nuevo.', 'rsvp.form.msgVacios': 'Por favor completá los datos.',
    'bus.texto': 'Reservá tu lugar en el formulario de confirmación.',
    'album.titulo': 'Compartí tus Fotos', 'album.boton': 'SUBÍ TUS IMÁGENES',
    'hashtag.titulo': 'Etiquetá tus Fotos', 'hashtag.texto': '¡Preparate para mi fiesta!<br>Etiquetame en Instagram con mi hashtag en tus fotos y videos.',
    'canciones.msgError': 'Hubo un problema, intentá de nuevo.', 'canciones.msgConexion': 'Error de conexión, intentá de nuevo.',
  },

  // Voseo centroamericano (Costa Rica, Nicaragua): igual que el rioplatense en estos textos
  'es-cr': {},

  // España (tú / vosotros)
  'es-es': {
    'rsvp.form.ninos': '¿Vendrás con niños?', 'rsvp.form.acompanantesSelect': '¿Vendrás con acompañantes?',
    'rsvp.form.noTraslado': 'No, iré por mi cuenta',
    'canciones.ejemplo': 'p. ej.: Tu Amor — Juan Fulano',
    'mapa.abrir': 'Ver en la app de Google Maps',
  },

  en: {
    'general.si': 'Yes', 'general.no': 'No',
    'playlist.titulo': 'My playlist', 'playlist.texto': 'The songs that will play at the party.', 'playlist.resumen': '{n} songs · {min} min', 'playlist.verTodas': 'See all {n} songs', 'playlist.verMenos': 'See less', 'playlist.play': 'Play the playlist', 'playlist.pausa': 'Pause', 'playlist.abrir': 'Open in Spotify', 'galeria.ver': 'See photo', 'galeria.anterior': 'Previous', 'galeria.siguiente': 'Next',
    'meta.titulo': 'Invitation ❤ {evento} | {nombres}', 'meta.descripcion': 'We look forward to celebrating with you!',
    'cuenta.faltan': 'Countdown', 'cuenta.dia': 'DAY', 'cuenta.dias': 'DAYS', 'cuenta.horas': 'HOURS', 'cuenta.min': 'MIN', 'cuenta.seg': 'SEC',
    'musica.boton': 'Music',
    'lugar.diaHorario': 'DATE AND TIME', 'lugar.lugar': 'VENUE',
    'ceremonia.religiosa': 'Ceremony', 'ceremonia.civil': 'Civil ceremony', 'ceremonia.simbolica': 'Ceremony',
    'celebracion.titulo': 'Reception', 'unificado.titulo': 'Ceremony & Reception', 'celebracion.sola': 'Celebration', 'bienvenida.texto': 'I would love you to share this special day with me',
    'boton.agendar': 'Save the date', 'boton.comoLlegar': 'DIRECTIONS', 'boton.cerrar': 'close',
    'mapa.titulo': 'Directions', 'mapa.abrir': 'Open in Google Maps',
    'rsvp.titulo': 'RSVP',
    'rsvp.botonHtml': "<i class='icon-send-o' aria-hidden='true'></i> RSVP",
    'rsvp.cerradoHtml': "<i class='icon-send-o' aria-hidden='true'></i> RSVP CLOSED",
    'rsvp.hasta': 'Please reply by', 'rsvp.finalizado': 'The RSVP period has ended.', 'rsvp.modal': 'RSVP',
    'rsvp.form.nombre': 'Your full name', 'rsvp.form.asiste': 'Will you attend?',
    'rsvp.form.acompanante': 'Guest name', 'rsvp.form.acompanantesSelect': 'Will you bring guests?',
    'rsvp.form.comida': 'Any dietary restrictions?', 'rsvp.form.alcohol': 'Will you drink alcohol?',
    'rsvp.form.ninos': 'Will you bring children?', 'rsvp.form.ninosCantidad': 'Number of children',
    'rsvp.form.traslado': 'Do you need transportation?', 'rsvp.form.noTraslado': 'No, I will get there on my own',
    'rsvp.form.subTraslado': 'Confirm to book your seat on the bus',
    'rsvp.form.seleccionar': 'Select', 'rsvp.form.otra': 'Other', 'rsvp.form.detalle': 'Details...',
    'rsvp.form.acompananteN': 'Guest', 'rsvp.form.acompanantesPlaceholder': 'Full name',
    'rsvp.form.enviar': 'SEND', 'rsvp.form.enviando': 'Sending...',
    'rsvp.form.siAsiste': 'Yes, I will be there 😀', 'rsvp.form.noAsiste': 'I cannot make it 😭',
    'rsvp.form.msgNoAsiste': '😢 Sorry you cannot make it. Thank you for letting us know!',
    'rsvp.form.msgOk': 'Thank you! 🎉 Your RSVP has been received',
    'rsvp.form.msgError': 'Connection error. Please try again.', 'rsvp.form.msgInvalida': 'Invalid server response.',
    'rsvp.form.msgVacios': 'Please fill in your details.', 'rsvp.form.comidaOpciones': 'No|Gluten-free|Vegan|Vegetarian',
    'dress.titulo': 'Dress Code', 'dress.boton': 'Inspiration', 'dress.modal': 'Style inspiration', 'dress.evitar': 'Colors to avoid',
    'rsvp.form.comidaAcomp': 'Does any of your guests have a different restriction? (optional)',
    'rsvp.form.msgLleno': 'The guest limit has been reached: no more RSVPs can be accepted.',
    'dresscode.texto': 'Formal attire. Please avoid wearing white.',
    'hospedaje.titulo': 'Accommodation', 'hospedaje.texto': 'Nearby hotels.', 'hospedaje.boton': 'See hotels',
    'hospedaje.modal': 'Nearby hotels', 'hospedaje.reservas': 'Book',
    'bus.titulo': 'Shuttle', 'bus.texto': 'Book your seat in the RSVP form.', 'bus.boton': 'Route',
    'bus.partida': 'Departure', 'bus.parada': 'Stop', 'bus.destino': 'Destination',
    'itinerario.titulo': 'Schedule',
    'album.titulo': 'Share your Photos', 'album.boton': 'UPLOAD YOUR PHOTOS',
    'hashtag.titulo': 'Tag your Photos', 'hashtag.boton': 'SEE PHOTOS', 'hashtag.texto': 'Get ready for my party!<br>Tag me on Instagram with my hashtag in your photos and videos.',
    'canciones.titulo': 'Music', 'canciones.spotify': 'Open Spotify', 'canciones.boton': 'Suggest a song',
    'canciones.modal': 'Suggest songs', 'canciones.ayuda': 'Please enter the song title and the artist.',
    'canciones.ejemplo': 'e.g. Your Love — John Smith', 'canciones.placeholder': 'Artist — Song', 'canciones.enviar': 'Send',
    'canciones.msgVacio': 'Please enter a song first', 'canciones.msgEnviando': 'Sending...',
    'canciones.msgOk': 'Song sent! 🎉 You can send more.', 'canciones.msgError': 'Something went wrong, please try again.',
    'canciones.msgConexion': 'Connection error, please try again.',
    'regalos.titulo': 'Gifts', 'regalos.botonCuenta': 'BANK DETAILS', 'regalos.botonLista': 'GIFT REGISTRY',
    'regalos.modalCuenta': 'Bank details', 'regalos.modalLista': 'Gift registry', 'regalos.irLista': 'Go to the registry',
    'perdiste.titulo': 'Did you miss anything?', 'perdiste.rsvp': 'RSVP', 'perdiste.agendar': 'Save the date',
    'perdiste.dress': 'Dress code', 'perdiste.canciones': 'Suggest a song', 'perdiste.inicio': 'Home', 'perdiste.regalos': 'Gifts', 'perdiste.instagram': 'Instagram Wall', 'perdiste.album': 'Photo album', 'perdiste.itinerario': 'Schedule', 'perdiste.hospedaje': 'Accommodation', 'perdiste.bus': 'Transportation',
    'sobre.tocar': 'Tap to open the invitation', 'sobre.aria': 'Closed invitation', 'sobre.ariaLacre': 'Open the invitation',
    'acceso.de': 'Invitation access for', 'acceso.pin': 'Enter the PIN sent with your invitation:',
    'acceso.confirmar': 'Confirm PIN', 'acceso.bloqueado': 'This link is not valid. Please contact the event organizers.',
    'acceso.pinError': 'Incorrect PIN.',
    'agendar.google': 'Google Calendar', 'agendar.apple': 'Apple (iPhone, Mac)', 'agendar.outlook': 'Outlook', 'agendar.otro': 'Other calendar (.ics)',
    'lista.faltaCSV': 'Guest list not set up yet', 'lista.errorCSV': 'Error loading data. Please refresh the page',
    'lista.paseExtra': 'extra pass reserved', 'lista.pasesExtras': 'extra passes reserved', 'lista.mesa': 'Table: No.',
  },
};

// ── Lo propio de cada tipo de evento ──────────────────────────────────
// "plural": los anfitriones hablan en plural (nosotros) o singular (yo).
const EVENTOS = {
  boda: {
    plural: true,
    es: {
      'celebracion.sola': 'Boda', 'bienvenida.texto': '¡Queremos invitarte a nuestra boda!', 'evento.nombre': 'Boda', 'evento.descripcion': 'Te esperamos para nuestra boda',
      'portada.subtitulo': '¡NOS CASAMOS!', 'historia.titulo': 'Nuestra Historia', 'playlist.titulo': 'Nuestra playlist',
      'historia.texto': 'Andábamos sin buscarnos, pero sabiendo que andábamos para encontrarnos.',
      'rsvp.texto': 'Tu presencia hará que este día sea realmente especial e inolvidable.',
      'bus.destinoTexto': '¡Nuestra Boda!', 'testigos.titulo': 'Los Testigos',
      'album.texto': '¡Prepárate para nuestra boda!<br>Haz clic en el botón y sube todas las fotos y videos que tomes durante la fiesta a nuestro álbum colaborativo, al instante, sin descargar ninguna app.',
      'canciones.texto': '¿Qué canciones son infaltables?<br>Ayúdanos con la selección de canciones',
      'regalos.texto': 'Nuestro mejor regalo es que nos acompañes, pero si lo deseas, puedes colaborar con nuestra luna de miel 😉',
      'regalos.listaTexto': 'Creamos una lista de regalos en una tienda online, para que puedas regalar el que gustes',
      'pie.texto': 'Los momentos felices de la vida se tornan geniales si tenemos la suerte de compartirlos con la familia y amigos más queridos, por eso te esperamos para festejar juntos este día tan especial.',
      'redes.titulo': 'Redes oficiales de la boda',
      'hashtag.texto': '¡Prepárate para nuestra boda!<br>Etiquétanos en Instagram con nuestro hashtag en tus fotos y videos.', 'sobre.bienvenida': 'Te damos la bienvenida',
    },
    'es-ar': {
      'hashtag.texto': '¡Preparate para nuestra boda!<br>Etiquetanos en Instagram con nuestro hashtag en tus fotos y videos.',
      'album.texto': '¡Preparate para nuestra boda!<br>Hacé clic en el botón y subí todas las fotos y videos que saques durante la fiesta a nuestro álbum colaborativo, al instante, sin descargar ninguna app.',
      'canciones.texto': '¿Qué canciones son infaltables?<br>Ayudanos con la selección de canciones',
      'regalos.texto': 'Nuestro mejor regalo es que nos acompañes, pero si lo deseás, podés colaborar con nuestra luna de miel 😉',
    },
    'es-es': {
      'album.texto': '¡Prepárate para nuestra boda!<br>Haz clic en el botón y sube todas las fotos y vídeos que hagas durante la fiesta a nuestro álbum colaborativo, al instante, sin descargar ninguna app.',
    },
    en: {
      'celebracion.sola': 'Wedding', 'bienvenida.texto': 'We would love to invite you to our wedding!', 'evento.nombre': 'Wedding', 'evento.descripcion': 'Join us for our wedding',
      'portada.subtitulo': "WE'RE GETTING MARRIED!", 'historia.titulo': 'Our Story', 'playlist.titulo': 'Our playlist',
      'historia.texto': 'We were not looking for each other, but we were meant to meet.',
      'rsvp.texto': 'Your presence will make this day truly special and unforgettable.',
      'bus.destinoTexto': 'Our wedding!', 'testigos.titulo': 'Wedding Party',
      'album.texto': 'Get ready for our wedding!<br>Tap the button and upload all the photos and videos you take during the party to our shared album, instantly, no app needed.',
      'canciones.texto': 'Which songs can\'t be missed?<br>Help us choose the music',
      'regalos.texto': 'Your presence is our best gift, but if you wish, you can contribute to our honeymoon 😉',
      'regalos.listaTexto': 'We created a gift registry in an online store, so you can choose the gift you like',
      'pie.texto': 'The happiest moments in life become unforgettable when we share them with the family and friends we love, so we look forward to celebrating this special day together.',
      'redes.titulo': 'Wedding social media',
      'hashtag.texto': 'Get ready for our wedding!<br>Tag us on Instagram with our hashtag in your photos and videos.', 'sobre.bienvenida': 'Welcome',
    },
  },

  15: {
    plural: false,
    es: {
      'meta.descripcion': '¡Te espero para que celebremos juntos!',
      'celebracion.sola': 'Fiesta', 'bienvenida.texto': '¡Quiero invitarte a mi fiesta!', 'evento.nombre': 'Mis 15', 'evento.descripcion': 'Te espero para celebrar mis 15 años',
      'portada.subtitulo': 'MIS 15 AÑOS', 'historia.titulo': 'Mi Historia',
      'historia.texto': 'Desde muy pequeña tengo dos grandes pasiones: patinar y los peluditos de cuatro patas, y andando sobre ruedas llegué a mis 15 años.',
      'rsvp.texto': 'Tu presencia hará que este día sea realmente especial e inolvidable.',
      'ceremonia.religiosa': 'Misa',
      'bus.destinoTexto': '¡Mi Fiesta!', 'testigos.titulo': 'Los Padrinos',
      'album.texto': '¡Prepárate para mi fiesta!<br>Haz clic en el botón y sube todas las fotos y videos que tomes durante la fiesta a mi álbum colaborativo, al instante, sin descargar ninguna app.',
      'canciones.texto': '¿Qué canciones son infaltables?<br>Ayúdame con la selección de canciones',
      'regalos.texto': 'El mejor regalo es que me acompañes en mi gran día, pero si deseas hacerme un regalo aquí te dejo los datos.',
      'regalos.listaTexto': 'He creado una lista de regalos en una tienda online, para que puedas regalar el que gustes',
      'pie.texto': 'Los momentos felices de la vida se tornan geniales si tenemos la suerte de compartirlos con la familia y amigos más queridos, por eso te espero para festejar juntos este día tan especial.',
      'redes.titulo': 'Redes oficiales de la fiesta', 'sobre.bienvenida': 'Te doy la bienvenida',
    },
    'es-ar': {
      'album.texto': '¡Preparate para mi fiesta!<br>Hacé clic en el botón y subí todas las fotos y videos que saques durante la fiesta a mi álbum colaborativo, al instante, sin descargar ninguna app.',
      'canciones.texto': '¿Qué canciones son infaltables?<br>Ayudame con la selección de canciones',
      'regalos.texto': 'El mejor regalo es que me acompañes en mi gran día, pero si querés hacerme un regalo, acá te dejo los datos.',
      'regalos.listaTexto': 'Creé una lista de regalos en una tienda online, para que puedas regalar el que quieras',
    },
    'es-es': {
      'album.texto': '¡Prepárate para mi fiesta!<br>Haz clic en el botón y sube todas las fotos y vídeos que hagas durante la fiesta a mi álbum colaborativo, al instante, sin descargar ninguna app.',
    },
    en: {
      'meta.descripcion': 'I look forward to celebrating with you!',
      'celebracion.sola': 'Party', 'bienvenida.texto': 'I would love to invite you to my party!', 'evento.nombre': 'My Sweet 15', 'evento.descripcion': 'Join me to celebrate my 15th birthday',
      'portada.subtitulo': 'MY SWEET 15', 'historia.titulo': 'My Story', 'ceremonia.religiosa': 'Mass',
      'historia.texto': 'Since I was little I have had two big passions: skating and furry friends, and rolling along I reached my 15th birthday.',
      'rsvp.texto': 'Your presence will make this day truly special and unforgettable.',
      'bus.destinoTexto': 'My party!', 'testigos.titulo': 'My Godparents',
      'album.texto': 'Get ready for my party!<br>Tap the button and upload all the photos and videos you take during the party to my shared album, instantly, no app needed.',
      'canciones.texto': 'Which songs can\'t be missed?<br>Help me choose the music',
      'regalos.texto': 'Your presence is my best gift, but if you wish to give me something, here are the details.',
      'regalos.listaTexto': 'I created a gift registry in an online store, so you can choose the gift you like',
      'pie.texto': 'The happiest moments in life become unforgettable when we share them with the family and friends we love, so I look forward to celebrating this special day with you.',
      'redes.titulo': 'Party social media', 'sobre.bienvenida': 'Welcome',
    },
  },

  bautismo: {
    plural: false,
    es: {
      'meta.descripcion': '¡Te espero para que celebremos juntos!',
      'evento.nombre': 'Bautismo', 'evento.descripcion': 'Te espero para celebrar mi bautismo',
      'portada.subtitulo': 'MI BAUTISMO', 'historia.titulo': 'Mi Historia',
      'historia.texto': 'Con la esperanza de que la bendición de Dios me acompañe siempre con su luz.',
      'rsvp.texto': 'Tu presencia hará que este día sea realmente especial.',
      'bus.destinoTexto': '¡Mi Bautismo!', 'testigos.titulo': 'Mis Padrinos',
      'album.texto': '¡Prepárate para mi bautismo!<br>Haz clic en el botón y sube todas las fotos y videos que tomes durante la celebración a mi álbum colaborativo, al instante, sin descargar ninguna app.',
      'canciones.texto': '¿Qué canciones no pueden faltar?<br>Ayúdanos con la selección de canciones',
      'regalos.texto': 'El mejor regalo es que me acompañes en este día tan especial, pero si deseas hacerme un regalo aquí te dejo los datos.',
      'regalos.listaTexto': 'Mis papás crearon una lista de regalos en una tienda online, para que puedas regalar el que gustes',
      'pie.texto': 'Los momentos felices de la vida se tornan geniales si tenemos la suerte de compartirlos con la familia y amigos más queridos, por eso te espero para celebrar juntos este día tan especial.',
      'redes.titulo': 'Redes oficiales', 'sobre.bienvenida': 'Te doy la bienvenida',
    },
    'es-ar': {
      'album.texto': '¡Preparate para mi bautismo!<br>Hacé clic en el botón y subí todas las fotos y videos que saques durante la celebración a mi álbum colaborativo, al instante, sin descargar ninguna app.',
      'canciones.texto': '¿Qué canciones no pueden faltar?<br>Ayudanos con la selección de canciones',
      'regalos.texto': 'El mejor regalo es que me acompañes en este día tan especial, pero si querés hacerme un regalo, acá te dejo los datos.',
    },
    'es-es': { 'evento.nombre': 'Bautizo', 'portada.subtitulo': 'MI BAUTIZO', 'bus.destinoTexto': '¡Mi Bautizo!', 'evento.descripcion': 'Te espero para celebrar mi bautizo' },
    en: {
      'meta.descripcion': 'I look forward to celebrating with you!',
      'evento.nombre': 'Baptism', 'evento.descripcion': 'Join us to celebrate my baptism', 'portada.subtitulo': 'MY BAPTISM',
      'historia.titulo': 'My Story', 'historia.texto': 'Hoping that God\'s blessing will always guide me with its light.',
      'rsvp.texto': 'Your presence will make this day truly special.', 'bus.destinoTexto': 'My baptism!', 'testigos.titulo': 'My Godparents',
      'album.texto': 'Get ready for my baptism!<br>Tap the button and upload all the photos and videos you take to my shared album, instantly, no app needed.',
      'canciones.texto': 'Which songs can\'t be missed?<br>Help us choose the music',
      'regalos.texto': 'Your presence is the best gift, but if you wish to give me something, here are the details.',
      'regalos.listaTexto': 'My parents created a gift registry in an online store, so you can choose the gift you like',
      'pie.texto': 'The happiest moments in life become unforgettable when we share them with the family and friends we love.',
      'redes.titulo': 'Social media', 'sobre.bienvenida': 'Welcome',
    },
  },

  comunion: {
    plural: false,
    es: {
      'meta.descripcion': '¡Te espero para que celebremos juntos!',
      'evento.nombre': 'Primera Comunión', 'evento.descripcion': 'Te espero para celebrar mi primera comunión',
      'portada.subtitulo': 'MI PRIMERA COMUNIÓN', 'historia.titulo': 'Mi Historia',
      'historia.texto': 'Hoy recibo a Jesús en mi corazón y quiero compartir esta alegría con las personas que más quiero.',
      'rsvp.texto': 'Tu presencia hará que este día sea realmente especial.',
      'ceremonia.religiosa': 'Misa',
      'bus.destinoTexto': '¡Mi Comunión!', 'testigos.titulo': 'Mis Padrinos',
      'album.texto': '¡Prepárate para mi comunión!<br>Haz clic en el botón y sube todas las fotos y videos que tomes durante la celebración a mi álbum colaborativo, al instante, sin descargar ninguna app.',
      'canciones.texto': '¿Qué canciones no pueden faltar?<br>Ayúdame con la selección de canciones',
      'regalos.texto': 'El mejor regalo es que me acompañes en este día tan especial, pero si deseas hacerme un regalo aquí te dejo los datos.',
      'regalos.listaTexto': 'Creamos una lista de regalos en una tienda online, para que puedas regalar el que gustes',
      'pie.texto': 'Los momentos felices de la vida se tornan geniales si tenemos la suerte de compartirlos con la familia y amigos más queridos, por eso te espero para celebrar juntos este día tan especial.',
      'redes.titulo': 'Redes oficiales', 'sobre.bienvenida': 'Te doy la bienvenida',
    },
    'es-ar': {
      'album.texto': '¡Preparate para mi comunión!<br>Hacé clic en el botón y subí todas las fotos y videos que saques durante la celebración a mi álbum colaborativo, al instante, sin descargar ninguna app.',
      'canciones.texto': '¿Qué canciones no pueden faltar?<br>Ayudame con la selección de canciones',
      'regalos.texto': 'El mejor regalo es que me acompañes en este día tan especial, pero si querés hacerme un regalo, acá te dejo los datos.',
    },
    'es-es': {},
    en: {
      'meta.descripcion': 'I look forward to celebrating with you!',
      'evento.nombre': 'First Communion', 'evento.descripcion': 'Join me to celebrate my First Communion', 'portada.subtitulo': 'MY FIRST COMMUNION',
      'historia.titulo': 'My Story', 'historia.texto': 'Today I receive Jesus in my heart and I want to share this joy with the people I love most.',
      'ceremonia.religiosa': 'Mass', 'rsvp.texto': 'Your presence will make this day truly special.', 'bus.destinoTexto': 'My Communion!',
      'testigos.titulo': 'My Godparents', 'album.texto': 'Get ready for my communion!<br>Tap the button and upload all the photos and videos you take to my shared album, instantly, no app needed.',
      'canciones.texto': 'Which songs can\'t be missed?<br>Help me choose the music',
      'regalos.texto': 'Your presence is the best gift, but if you wish to give me something, here are the details.',
      'regalos.listaTexto': 'We created a gift registry in an online store, so you can choose the gift you like',
      'pie.texto': 'The happiest moments in life become unforgettable when we share them with the family and friends we love.',
      'redes.titulo': 'Social media', 'sobre.bienvenida': 'Welcome',
    },
  },

  cumple: {
    plural: false,
    es: {
      'meta.descripcion': '¡Te espero para que celebremos juntos!',
      'celebracion.sola': 'Cumpleaños', 'bienvenida.texto': '¡Quiero invitarte a mi fiesta!', 'evento.nombre': 'Cumpleaños', 'evento.descripcion': 'Te espero para festejar mi cumpleaños',
      'portada.subtitulo': '¡MI CUMPLEAÑOS!', 'historia.titulo': 'Mi Historia',
      'historia.texto': 'Un año más para celebrar la vida, y qué mejor que hacerlo con las personas que más quiero.',
      'rsvp.texto': 'Tu presencia hará que este día sea realmente especial.',
      'bus.destinoTexto': '¡Mi Cumple!', 'testigos.titulo': 'Anfitriones',
      'album.texto': '¡Prepárate para mi fiesta!<br>Haz clic en el botón y sube todas las fotos y videos que tomes durante la fiesta a mi álbum colaborativo, al instante, sin descargar ninguna app.',
      'canciones.texto': '¿Qué canciones no pueden faltar?<br>Ayúdame con la selección de canciones',
      'regalos.texto': 'El mejor regalo es que me acompañes, pero si deseas hacerme un regalo aquí te dejo los datos.',
      'regalos.listaTexto': 'Creé una lista de regalos en una tienda online, para que puedas regalar el que gustes',
      'pie.texto': 'Los momentos felices de la vida se tornan geniales si tenemos la suerte de compartirlos con la familia y amigos más queridos, por eso te espero para festejar juntos.',
      'redes.titulo': 'Redes oficiales', 'sobre.bienvenida': 'Te doy la bienvenida',
    },
    'es-ar': {
      'album.texto': '¡Preparate para mi fiesta!<br>Hacé clic en el botón y subí todas las fotos y videos que saques durante la fiesta a mi álbum colaborativo, al instante, sin descargar ninguna app.',
      'canciones.texto': '¿Qué canciones no pueden faltar?<br>Ayudame con la selección de canciones',
      'regalos.texto': 'El mejor regalo es que me acompañes, pero si querés hacerme un regalo, acá te dejo los datos.',
    },
    'es-es': { 'bus.destinoTexto': '¡Mi Cumple!' },
    en: {
      'meta.descripcion': 'I look forward to celebrating with you!',
      'celebracion.sola': 'Birthday', 'bienvenida.texto': 'I would love to invite you to my party!', 'evento.nombre': 'Birthday', 'evento.descripcion': 'Join me to celebrate my birthday', 'portada.subtitulo': "IT'S MY BIRTHDAY!",
      'historia.titulo': 'My Story', 'historia.texto': 'One more year to celebrate life, and what better way than with the people I love most.',
      'rsvp.texto': 'Your presence will make this day truly special.', 'bus.destinoTexto': 'My party!', 'testigos.titulo': 'Hosts',
      'album.texto': 'Get ready for my party!<br>Tap the button and upload all the photos and videos you take during the party to my shared album, instantly, no app needed.',
      'canciones.texto': 'Which songs can\'t be missed?<br>Help me choose the music',
      'regalos.texto': 'Your presence is the best gift, but if you wish to give me something, here are the details.',
      'regalos.listaTexto': 'I created a gift registry in an online store, so you can choose the gift you like',
      'pie.texto': 'The happiest moments in life become unforgettable when we share them with the family and friends we love.',
      'redes.titulo': 'Social media', 'sobre.bienvenida': 'Welcome',
    },
  },
};

// Qué variante usa cada país
const PAISES = {
  AR: 'es-ar', UY: 'es-ar', PY: 'es-ar',
  CR: 'es-cr', NI: 'es-cr',
  ES: 'es-es',
  US: 'es', MX: 'es', CO: 'es', CL: 'es', PE: 'es', BO: 'es', EC: 'es', VE: 'es', DO: 'es', GT: 'es', HN: 'es', SV: 'es', PA: 'es', CU: 'es', PR: 'es',
  GB: 'en', IE: 'en', AU: 'en', NZ: 'en', CA: 'en', ZA: 'en',
  BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt', FR: 'fr', MC: 'fr', LU: 'fr', IT: 'it', SM: 'it', AD: 'ca',
  DE: 'de', AT: 'de', LI: 'de', NL: 'nl', SR: 'nl',
};

export const VARIANTES = ['es', 'es-ar', 'es-cr', 'es-es', 'en', ...Object.keys(OTROS)];
export const TIPOS = Object.keys(EVENTOS);

export function varianteDePais(pais) { return PAISES[(pais || '').toUpperCase()] || 'es'; }
export function esPlural(tipo) { return !!EVENTOS[tipo]?.plural; }

// Devuelve el diccionario completo para un tipo de evento y una variante.
export function diccionario(tipo, variante) {
  const ev = EVENTOS[tipo] || EVENTOS.boda;
  const v = VARIANTES.includes(variante) ? variante : 'es';
  const otro = OTROS[v];
  const capas = v === 'en' || otro
    ? [BASE.es, BASE.en, ev.es, ev.en, otro?.base, otro?.eventos?.[tipo in EVENTOS ? tipo : 'boda']]
    : [BASE.es, v === 'es-cr' ? BASE['es-ar'] : null, BASE[v], ev.es, v === 'es-cr' ? ev['es-ar'] : null, ev[v]];
  return Object.assign({}, ...capas.filter(Boolean));
}
