// README (ronda 43) · Artículos de la sección «Ideas» (/ideas/…): contenido útil para buscar en Google (frases, cómo armar
// la invitación, cuándo enviarla). Solo en español: se ven en la raíz y en las carpetas de países de habla hispana, cada
// una con su variante (vos, casamiento, bautizo…). Escribir en español neutro con «tú» y «boda»: la variante la pone el
// generador. Cada artículo: slug, titulo (≤ 45 letras), descripcion (≤ 140), h1, lead, evento (para el botón y la demo),
// cuerpo (HTML con <h2>, <p>, <ul>/<ol>, <blockquote> para las frases).
const frases = (lista) => `<ul class="ideas-frases">${lista.map((f) => `<li>${f}</li>`).join('')}</ul>`;

export const IDEAS = [
  {
    slug: 'frases-para-invitaciones-de-boda',
    titulo: 'Frases para invitaciones de boda',
    descripcion: 'Más de 40 frases para invitaciones de boda: románticas, cortas, divertidas, religiosas y para pedir confirmación de asistencia.',
    h1: 'Frases para invitaciones de boda',
    lead: 'Ideas para la portada, la historia, el pedido de confirmación y el cierre de tu invitación. Elige la que más los represente o úsala como punto de partida.',
    evento: 'boda',
    cuerpo: `<h2>Frases románticas para la portada</h2>
${frases(['Andábamos sin buscarnos, pero sabiendo que andábamos para encontrarnos.', 'Elegimos compartir la vida, y queremos que estés en el día que empieza todo.', 'Después de tantos «para siempre» chiquitos, llegó el más grande.', 'Dos caminos que se hicieron uno. Te esperamos para celebrarlo.', 'El amor no se mira, se siente. Y queremos sentirlo contigo.', 'Hoy, mañana y todos los días que vengan: juntos.'])}
<h2>Frases cortas (para la portada o el Save The Date)</h2>
${frases(['¡Nos casamos!', 'Sí, quiero. Sí, queremos.', 'Guarda la fecha: nos casamos.', 'Por fin, juntos para siempre.', 'Nuestro gran día te espera.', 'Una historia, dos nombres, una fecha.'])}
<h2>Frases divertidas</h2>
${frases(['Después de muchos años de práctica, decidimos hacerlo oficial.', 'Habrá comida, música y baile. Ah, y también nos casamos.', 'Prometemos que la fiesta va a durar más que los votos.', 'Ya tenemos el sí: ahora solo nos falta el tuyo.', 'Último aviso: después de esta fecha, ya no estamos disponibles.'])}
<h2>Frases religiosas</h2>
${frases(['«El amor es paciente, es bondadoso.» Con la bendición de Dios, unimos nuestras vidas.', 'Lo que Dios ha unido, que nadie lo separe. Te esperamos en la ceremonia.', 'Con la gracia de Dios y la alegría de nuestras familias, te invitamos a celebrar nuestro matrimonio.', 'Dios nos regaló el encuentro; ahora queremos agradecerlo contigo.'])}
<h2>Para pedir la confirmación de asistencia</h2>
${frases(['Tu presencia hará que este día sea realmente especial. Confírmanos antes del 15 de agosto.', 'Para organizar todo con cariño, cuéntanos si vienes antes de la fecha límite.', 'Nos encantaría saber si contamos contigo: confirma con un clic.', 'Reservamos un lugar especial para ti. ¿Nos confirmas?'])}
<h2>Frases para la mesa de regalos</h2>
${frases(['Tu presencia es nuestro mejor regalo, pero si deseas hacernos un obsequio, aquí te dejamos los datos.', 'Ya tenemos casa, amor y ganas: lo que más nos ayuda es empezar nuestra luna de miel.', 'Si quieres sumarte a nuestro próximo viaje, encontrarás los datos en la sección de regalos.'])}
<h2>Frases para el cierre o el agradecimiento</h2>
${frases(['Gracias por ser parte de nuestra historia. Te esperamos.', 'Nada sería igual sin ti. ¡Nos vemos en la fiesta!', 'Gracias por acompañarnos en un día tan especial. Fue un placer compartirlo contigo.'])}
<h2>Consejos para elegir la frase</h2>
<ul><li><strong>Que suene a ustedes:</strong> si son divertidos, una frase solemne puede quedar extraña (y al revés).</li><li><strong>Corta en la portada:</strong> la frase principal se lee en dos segundos; los textos largos van en la sección de historia.</li><li><strong>Coherente con el diseño:</strong> un diseño minimalista pide pocas palabras; uno romántico admite algo más poético.</li><li><strong>Revisa la fecha límite:</strong> si pides confirmación, pon una fecha concreta y recuérdala cerca del evento.</li></ul>
<p>En las invitaciones digitales de Amo Invitar! cada sección trae un texto sugerido que puedes cambiar por cualquiera de estas frases, y ver el resultado al instante antes de publicar.</p>`,
  },
  {
    slug: 'frases-para-invitaciones-de-15-anos',
    titulo: 'Frases para invitaciones de 15 años',
    descripcion: 'Frases para invitaciones de 15 años: cortas, emotivas, divertidas y para pedir confirmación. Ideas para la portada y el cierre.',
    h1: 'Frases para invitaciones de 15 años',
    lead: 'Textos para la portada, la historia y la confirmación de tus 15. Puedes usarlos tal cual o adaptarlos a tu estilo.',
    evento: '15',
    cuerpo: `<h2>Frases emotivas</h2>
${frases(['Hay momentos que se esperan toda la vida. Este es uno de ellos: mis 15.', 'Dejo atrás una etapa y empiezo otra con todos los que quiero cerca.', 'Quince años de sueños, risas y aprendizajes. Quiero celebrarlos contigo.', 'Mi noche soñada no estaría completa sin ti.', 'Hoy cierro un capítulo y empiezo a escribir el próximo. Acompáñame.'])}
<h2>Frases cortas para la portada</h2>
${frases(['¡Mis 15 años!', 'Una noche para recordar.', 'Mis 15: llegó el día.', 'Te espero en mi gran noche.', 'Quince y contando.'])}
<h2>Frases divertidas</h2>
${frases(['Prepara tus mejores pasos: la pista te espera.', 'Habrá música, baile y sorpresas. Lo único que falta eres tú.', 'Cumplo 15 y lo festejo a lo grande. ¿Te lo vas a perder?', 'Dress code: ganas de bailar toda la noche.'])}
<h2>Para pedir la confirmación</h2>
${frases(['Confírmame antes del 10 de octubre para guardarte un lugar.', 'Tu presencia es mi mejor regalo. ¿Me confirmas con un clic?', 'Cuéntame si vienes y elige tu menú desde la invitación.'])}
<h2>Para el agradecimiento</h2>
${frases(['Gracias por hacer de mis 15 una noche inolvidable.', 'Cada uno de ustedes hizo que este día fuera único. ¡Gracias!'])}
<h2>Ideas para que tu invitación de 15 sea diferente</h2>
<ul><li><strong>Cuenta regresiva</strong> en la portada para que todos vivan la espera.</li><li><strong>Sugerencias de canciones:</strong> tus invitados proponen los temas que no pueden faltar en la fiesta.</li><li><strong>Dress code con ejemplos</strong>, para que nadie dude qué ponerse.</li><li><strong>Álbum QR:</strong> todas las fotos de la noche en un solo lugar, sin apps.</li></ul>
<p>En Amo Invitar! eliges el diseño, cambias los textos por tus frases favoritas y ves tu invitación terminada antes de pagar.</p>`,
  },
  {
    slug: 'frases-para-invitaciones-de-bautismo',
    titulo: 'Frases para invitaciones de bautismo',
    descripcion: 'Frases para invitaciones de bautismo: religiosas, tiernas y cortas, en primera persona del bebé o de los padres. Ideas para tu invitación.',
    h1: 'Frases para invitaciones de bautismo',
    lead: 'Textos tiernos y religiosos para invitar al bautismo, escritos desde el bebé o desde los padres.',
    evento: 'bautismo',
    cuerpo: `<h2>Frases en primera persona (desde el bebé)</h2>
${frases(['Soy pequeño, pero mi alegría es enorme: ¡me bautizan! Te espero.', 'Quiero que estés conmigo el día en que empiezo mi camino en la fe.', 'Mis papás y yo te invitamos a celebrar mi bautismo.', 'Llegué para llenar de amor a mi familia y ahora quiero compartir este día contigo.'])}
<h2>Frases desde los padres</h2>
${frases(['Con mucha alegría te invitamos a acompañarnos en el bautismo de nuestro hijo.', 'Dios nos regaló la bendición más grande; ahora queremos celebrarla contigo.', 'Queremos que seas parte del día en que nuestra hija recibe el sacramento del bautismo.'])}
<h2>Frases religiosas</h2>
${frases(['«Dejen que los niños vengan a mí.» Te esperamos en mi bautismo.', 'Que la luz de Dios guíe siempre mis pasos.', 'Con la bendición de Dios y el cariño de mis padrinos, recibo el bautismo.'])}
<h2>Frases cortas</h2>
${frases(['¡Mi bautismo!', 'Un día de luz.', 'Bendecido y feliz.', 'Te espero en mi gran día.'])}
<h2>Qué no puede faltar en la invitación</h2>
<ul><li>Nombre del bebé y de los padres (y de los padrinos, si quieres nombrarlos).</li><li>Fecha, hora e iglesia, con el mapa para llegar.</li><li>Lugar de la celebración, si es en otro sitio.</li><li>Un pedido de confirmación con fecha límite.</li></ul>
<p>Con las invitaciones digitales de Amo Invitar! tu familia confirma con un clic y tú ves al instante quién viene.</p>`,
  },
  {
    slug: 'que-poner-en-una-invitacion-de-boda',
    titulo: 'Qué poner en una invitación de boda',
    descripcion: 'Qué datos incluir en una invitación de boda, en qué orden, cuándo enviarla y cómo pedir la confirmación de asistencia. Guía con lista.',
    h1: 'Qué poner en una invitación de boda (y cuándo enviarla)',
    lead: 'Una guía práctica con los datos que no pueden faltar, los que suman y los tiempos recomendados para enviar cada aviso.',
    evento: 'boda',
    cuerpo: `<h2>Los datos imprescindibles</h2>
<ol><li><strong>Los nombres de los novios.</strong> Primero el que prefieran; en algunas familias se suman los nombres de los padres.</li><li><strong>Fecha y hora</strong> de la ceremonia y de la celebración, si son distintas.</li><li><strong>Lugar con dirección completa</strong> y, en una invitación digital, el mapa para llegar con un toque.</li><li><strong>Pedido de confirmación</strong> con fecha límite: es lo que te permite cerrar el número de invitados con el lugar y el catering.</li><li><strong>Código de vestimenta</strong>, si lo hay.</li></ol>
<h2>Los datos que suman</h2>
<ul><li><strong>Itinerario del día:</strong> ceremonia, cóctel, cena, baile.</li><li><strong>Regalos:</strong> datos bancarios o lista de regalos, con una frase amable.</li><li><strong>Traslados y alojamiento</strong> para quienes viajan.</li><li><strong>Menú y restricciones alimentarias:</strong> pregúntalo en la misma confirmación.</li><li><strong>Si pueden ir con niños o acompañantes:</strong> mejor decirlo claro desde el principio. Un link personal por invitado, con sus pases, evita malentendidos.</li></ul>
<h2>¿Cuándo enviar la invitación?</h2>
<ul><li><strong>Save The Date:</strong> de 6 a 12 meses antes, sobre todo si la boda es en otra ciudad o en temporada alta.</li><li><strong>Invitación formal:</strong> de 2 a 3 meses antes.</li><li><strong>Fecha límite de confirmación:</strong> de 3 a 4 semanas antes, para cerrar números con el salón.</li><li><strong>Recordatorio:</strong> una semana antes de la fecha límite, a quienes todavía no respondieron.</li></ul>
<h2>Papel o digital</h2>
<p>La invitación digital llega a todos a la vez por WhatsApp, se actualiza si cambia un dato, reúne las confirmaciones en un solo lugar y evita imprimir y repartir. Si alguna persona mayor prefiere algo impreso, puedes combinarla con unas pocas tarjetas en papel.</p>
<h2>Errores frecuentes</h2>
<ul><li>No poner fecha límite de confirmación.</li><li>Olvidar la hora de la celebración cuando es distinta de la ceremonia.</li><li>Textos demasiado largos en la portada.</li><li>No aclarar si los niños están invitados.</li></ul>
<p>Con Amo Invitar! armas tu invitación de boda con todas estas secciones, la ves terminada antes de pagar y gestionas las respuestas desde tu panel.</p>`,
  },
  {
    slug: 'save-the-date-que-es-y-cuando-enviarlo',
    titulo: 'Save the date: qué es y cuándo enviarlo',
    descripcion: 'Qué es un Save The Date, cuándo enviarlo, qué texto poner y en qué se diferencia de la invitación de boda o de 15 años.',
    h1: 'Save the date: qué es y cuándo enviarlo',
    lead: 'El aviso previo para que tus invitados reserven la fecha antes de recibir la invitación formal.',
    evento: 'boda',
    cuerpo: `<h2>¿Qué es un Save The Date?</h2>
<p>Es un aviso corto que se envía antes de la invitación formal para que tus invitados <strong>reserven la fecha</strong>. No lleva todos los detalles: alcanza con los nombres, la fecha y la ciudad, y un «invitación formal próximamente».</p>
<h2>¿Cuándo enviarlo?</h2>
<ul><li><strong>De 6 a 12 meses antes</strong> si la celebración es en otra ciudad o país, o si hay invitados que tienen que viajar.</li><li><strong>De 4 a 6 meses antes</strong> para una celebración local en temporada alta.</li><li>Después llega la invitación formal, de 2 a 3 meses antes.</li></ul>
<h2>¿Qué texto poner?</h2>
${frases(['¡Guarda la fecha! Nos casamos el 12 de septiembre de 2027 en Mendoza.', 'Reserva este día para nosotros. Invitación formal próximamente.', 'Algo grande se viene: guarda la fecha de mis 15.', 'Save the date · 12.09.2027'])}
<h2>Formatos</h2>
<ul><li><strong>Tarjeta:</strong> una imagen con el diseño de tu invitación, lista para compartir por WhatsApp o redes.</li><li><strong>Tarjeta con foto:</strong> tu foto con el diseño elegido.</li><li><strong>Web:</strong> una página propia con un botón para agregar la fecha al calendario del celular.</li></ul>
<h2>¿Es obligatorio?</h2>
<p>No, pero ayuda mucho cuando hay invitados de lejos, en fechas concurridas (fin de año, vacaciones) o si quieres asegurarte de que las personas más importantes estén.</p>
<p>En Amo Invitar! la tarjeta Save The Date viene incluida en los planes Premium y Deluxe, con el mismo diseño de tu invitación.</p>`,
  },
];
