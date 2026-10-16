// Arma la "vista" de una invitación: todo lo que el HTML del modelo pide con
// data-campo, data-si, data-repetir… ya calculado (fechas en el formato del
// país, mapas, calendarios, iniciales, qué secciones van según el paquete).
//
// Entrada: el evento tal como lo guarda el panel, el modelo (modelo.json) y
// el diccionario de textos ya resuelto para su tipo y variante.

const LOCALES = { es: 'es-MX', 'es-ar': 'es-AR', 'es-cr': 'es-CR', 'es-es': 'es-ES', en: 'en-GB' };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dos = (n) => String(n).padStart(2, '0');

// "2027-09-12T20:00" → partes, sin pasar por zonas horarias
function partes(fh) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(fh || '');
  if (!m) return null;
  return { a: m[1], m: m[2], d: m[3], hh: m[4] ?? null, mm: m[5] ?? null };
}

function hora(p, variante) {
  if (!p || p.hh == null) return '';
  if (variante === 'en') {
    const h = Number(p.hh), ampm = h < 12 ? 'AM' : 'PM';
    return `${h % 12 || 12}:${p.mm} ${ampm}`;
  }
  return variante === 'es-ar' || variante === 'es-cr' ? `${p.hh}:${p.mm}hs` : `${p.hh}:${p.mm} h`;
}

const fechaPuntos = (p) => (p ? `${p.d} • ${p.m} • ${p.a}` : '');
const fechaCirculos = (p) => (p ? `${p.d} ◦ ${p.m} ◦ ${p.a}` : '');

function fechaHora(fh, variante) {
  const p = partes(fh);
  if (!p) return '';
  const h = hora(p, variante);
  return h ? `${fechaCirculos(p)} - ${h}` : fechaCirculos(p);
}

// Suma horas a "AAAA-MM-DDTHH:MM" (para el fin por defecto del calendario)
function sumarHoras(fh, horas) {
  const p = partes(fh);
  if (!p || p.hh == null) return null;
  const t = new Date(Date.UTC(+p.a, +p.m - 1, +p.d, +p.hh + horas, +p.mm));
  return `${t.getUTCFullYear()}-${dos(t.getUTCMonth() + 1)}-${dos(t.getUTCDate())}T${dos(t.getUTCHours())}:${dos(t.getUTCMinutes())}`;
}

// Mapa: si el cliente pegó un embed lo usamos; si no, uno armado con la dirección
function mapa(lugar) {
  const q = [lugar.nombre, lugar.direccion].filter(Boolean).join(', ');
  if (!q && !lugar.mapaEmbed) return { embed: '', link: '' };
  return {
    embed: lugar.mapaEmbed || `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`,
    link: lugar.mapaLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
  };
}

function lugarTexto(l) {
  const nombre = l.nombre ? `"${l.nombre}"` : '';
  return [nombre, l.direccion].filter(Boolean).join(', ');
}

// "2027-09-12T20:00" en una zona horaria → instante UTC "20270912T230000Z"
function aUTC(fh, zona) {
  const p = partes(fh);
  if (!p || p.hh == null) return null;
  const local = Date.UTC(+p.a, +p.m - 1, +p.d, +p.hh, +p.mm);
  // diferencia entre la hora "de pared" en la zona y UTC para ese momento
  const enZona = (ms) => {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: zona, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(ms)).reduce((o, x) => ((o[x.type] = x.value), o), {});
    return Date.UTC(+f.year, +f.month - 1, +f.day, +f.hour, +f.minute);
  };
  let t = local - (enZona(local) - local);
  t = local - (enZona(t) - t); // segunda pasada por si cae en un cambio de horario
  return new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function calendario({ nombre, descripcion, inicio, fin, lugar, zona }) {
  const desde = aUTC(inicio, zona);
  if (!desde) return null;
  return { titulo: nombre, descripcion, lugar, inicio: desde, fin: aUTC(fin || sumarHoras(inicio, 1), zona) };
}

const lleno = (x) => (Array.isArray(x) ? x.length > 0 : x != null && x !== '' && x !== false);

export function armarVista({ evento: e, modelo, t, variante, rutas, demo = false, invitado = null, marca = null }) {
  const plural = !!e.nombres?.b;
  const paquete = modelo.paquetes[e.paquete] || modelo.paquetes.basic;
  const incluye = paquete.incluye;
  const nA = e.nombres?.a || '', nB = e.nombres?.b || '';
  const nombresTexto = plural ? `${nA} & ${nB}` : nA;
  const conNombres = (plantilla) => plantilla.replace('{a}', esc(nA)).replace('{b}', esc(nB));

  // Secciones: las del paquete, menos las que el cliente apagó
  const apagadas = new Set(Object.entries(e.secciones || {}).filter(([, on]) => on === false).map(([k]) => k));
  const secciones = Object.fromEntries(paquete.secciones.map((s) => [s, !apagadas.has(s)]));

  // Textos que el cliente puede reescribir: lo suyo, o el del idioma
  const propio = (ruta, clave) => (lleno(ruta) ? ruta : t(clave));

  // Ceremonia y celebración
  const cel = e.celebracion || {};
  const cer = e.ceremonia || {};
  const modo = cer.modo || 'separada'; // separada | mismo-lugar | sin
  const zona = e.zonaHoraria || 'Europe/Madrid';
  const tituloCer = t(`ceremonia.${cer.tipo || 'religiosa'}`);
  const tituloCel = modo === 'mismo-lugar' ? t('unificado.titulo') : t('celebracion.titulo');
  const descripcion = t('evento.descripcion');
  const nombreCal = (titulo) => `${titulo} - ${nombresTexto}`;

  const ceremonia = {
    separada: modo === 'separada',
    unificada: modo === 'mismo-lugar',
    titulo: tituloCer,
    foto: cer.foto || '',
    fechaHora: fechaHora(cer.inicio, variante),
    lugarTexto: lugarTexto(cer),
    mapa: mapa(cer),
  };
  const celebracion = {
    titulo: tituloCel,
    foto: cel.foto || '',
    fechaHora: fechaHora(modo === 'mismo-lugar' && cer.inicio ? cer.inicio : cel.inicio, variante),
    lugarTexto: lugarTexto(cel),
    mapa: mapa(cel),
  };
  const calendarios = {
    ceremonia: modo === 'separada' ? calendario({ nombre: nombreCal(tituloCer), descripcion, inicio: cer.inicio, fin: cer.fin, lugar: [cer.nombre, cer.direccion].filter(Boolean).join(', '), zona }) : null,
    celebracion: calendario({
      nombre: nombreCal(t('evento.nombre')), descripcion,
      inicio: modo === 'mismo-lugar' && cer.inicio ? cer.inicio : cel.inicio,
      fin: cel.fin || sumarHoras(cel.inicio, 7),
      lugar: [cel.nombre, cel.direccion].filter(Boolean).join(', '), zona,
    }),
  };

  // Fecha principal: la de la ceremonia si hay, si no la de la fiesta
  const principal = partes((modo !== 'sin' && cer.inicio) || cel.inicio || e.fecha);

  const fotos = e.fotos || {};
  const portada = (fotos.portada || []).slice(0, incluye.fotosPortada).map((f) => (typeof f === 'string' ? { url: f, pos: '50% 50%' } : { pos: '50% 50%', ...f }));
  const galeria = (fotos.galeria || []).slice(0, incluye.fotosGaleria).map((url) => ({ url }));

  const itinerario = (e.itinerario || []).map((i) => ({
    hora: i.hora || '', texto: i.texto || '',
    iconoUrl: `${rutas.modelo}/img/timeline-icon-${modelo.iconosItinerario.includes(i.icono) ? i.icono : 'fiesta'}.png`,
  }));

  const regalos = e.regalos || {};
  const cuentas = (regalos.cuentas || []).map((c) => ({ copiable: true, ...c }));
  const lista = regalos.lista && (regalos.lista.dato || regalos.lista.link)
    ? { texto: esc(propio(regalos.lista.texto, 'regalos.listaTexto')), etiqueta: regalos.lista.etiqueta || '', dato: regalos.lista.dato || '', link: regalos.lista.link || '' }
    : null;

  const redes = e.redes || {};
  const bus = e.bus || {};

  return {
    id: e.id,
    demo,
    rutas,
    idioma: { variante, fechas: LOCALES[variante] || 'es-ES', html: variante === 'en' ? 'en' : 'es' },
    paquete: { id: e.paquete, incluye },
    modelo: { id: modelo.id, sobre: modelo.sobre },
    secciones,
    plural,

    nombres: {
      texto: nombresTexto,
      portada: plural ? conNombres(modelo.nombresHTML.portada) : conNombres(modelo.nombresHTML.solo),
      cierre: plural ? conNombres(modelo.nombresHTML.cierre) : conNombres(modelo.nombresHTML.solo),
      iniciales: [nA, nB].filter(Boolean).map((n) => n.trim().charAt(0).toUpperCase()),
    },
    fecha: { puntos: fechaPuntos(principal), iso: principal ? `${principal.a}-${principal.m}-${principal.d}` : '' },
    cuenta: {
      activa: !!incluye.cuenta && !!principal,
      fecha: principal ? `${principal.a}/${principal.m}/${principal.d} ${principal.hh ?? '00'}:${principal.mm ?? '00'}:00` : '',
    },
    musica: {
      archivo: incluye.musica ? (e.musica?.archivo || '') : '',
      inicio: e.musica?.inicio ?? '',
    },

    historia: { texto: esc(propio(e.historia?.texto, 'historia.texto')).replace(/\n/g, '<br>') },
    ceremonia, celebracion, calendarios,
    fotos: { portada, galeria, rsvp: fotos.rsvp || portada[0]?.url || '', album: fotos.album || '' },

    rsvp: {
      texto: propio(e.rsvp?.texto, 'rsvp.texto'),
      cierre: e.rsvp?.cierre || '',
      formato: 'corto',
      acompanantes: e.rsvp?.acompanantes ?? 0,
      preguntas: e.rsvp?.preguntas || {},
    },
    dresscode: {
      texto: esc(propio(e.dresscode?.texto, 'dresscode.texto')),
      sugerencias: !!incluye.sugerenciasDress && lleno(e.dresscode?.fotos),
      fotos: (e.dresscode?.fotos || []).map((url) => ({ url })),
    },
    hospedaje: { texto: esc(e.hospedaje?.texto || ''), items: e.hospedaje?.items || [] },
    bus: {
      textoLibre: esc(bus.texto || ''),
      paradas: (bus.paradas || []).map((p, i, todas) => ({
        etiqueta: p.etiqueta || t(i === 0 ? 'bus.partida' : i === todas.length - 1 ? 'bus.destino' : 'bus.parada'),
        detalle: p.detalle || (i === todas.length - 1 ? t('bus.destinoTexto') : ''),
      })),
    },
    itinerario: { items: itinerario },
    testigos: { items: e.testigos || [] },
    album: { url: e.album?.url || '' },
    canciones: { spotify: e.canciones?.spotify || '' },
    regalos: {
      texto: esc(propio(regalos.texto, 'regalos.texto')),
      cuentas, lista,
      hayBotones: cuentas.length > 0 || !!lista,
    },
    redes: { ...redes, hay: !!(redes.instagram || redes.facebook || redes.tiktok) },
    pie: { texto: esc(propio(e.pie?.texto, 'pie.texto')) },

    // La seguridad ya la resolvió el servidor: acá solo va a quién mostrar
    acceso: { lista: !!e.acceso?.lista, inv: invitado?.codigo || '' },
    marca: marca ? { blanca: true, ...marca } : { blanca: false },
    meta: {
      titulo: t('meta.titulo').replace('{evento}', t('evento.nombre')).replace('{nombres}', nombresTexto),
      descripcion: (e.meta?.descripcion || '').slice(0, 120) || t('meta.descripcion'),
      // Miniatura al compartir: la armada en el panel (con o sin nombres), si no la foto
      // elegida, la portada, la del RSVP, la galería, y por último la genérica del modelo
      imagen: e.miniatura?.generada || e.miniatura?.foto || portada[0]?.url || fotos.rsvp || galeria[0]?.url || `${rutas.modelo}/miniatura.jpg`,
    },
  };
}
