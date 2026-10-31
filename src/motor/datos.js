// Arma la "vista" de una invitación: todo lo que el HTML del modelo pide con
// data-campo, data-si, data-repetir… ya calculado (fechas en el formato del
// país, mapas, calendarios, iniciales, qué secciones van según el paquete).
//
// Entrada: el evento tal como lo guarda el panel, el modelo (modelo.json) y
// el diccionario de textos ya resuelto para su tipo y variante.

import { embedMapa } from '../lib/mapas.js';
import { ICONOS_COMUNES } from '../panel/esquemas.js';

const LOCALES = { es: 'es-MX', 'es-ar': 'es-AR', 'es-cr': 'es-CR', 'es-es': 'es-ES', en: 'en-GB', pt: 'pt-BR', fr: 'fr-FR', it: 'it-IT', ca: 'ca-ES', de: 'de-DE', nl: 'nl-NL' };
// Duración típica de la fiesta para el calendario de los invitados (ya no se pide la hora de fin)
const DURACION = { boda: 8, 15: 8, cumple: 6, bautismo: 4, comunion: 4, infantil: 4, graduacion: 8, babyshower: 4, revelacion: 4, navidad: 6 };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dos = (n) => String(n).padStart(2, '0');

// "2027-09-12T20:00" → partes, sin pasar por zonas horarias
function partes(fh) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(fh || '');
  if (!m) return null;
  return { a: m[1], m: m[2], d: m[3], hh: m[4] ?? null, mm: m[5] ?? null };
}

// "inicio" (AAAA-MM-DDTHH:MM) o, desde la ronda 4, fecha y hora por separado
const inicioDe = (l = {}) => (l.fecha ? (l.hora ? `${l.fecha}T${l.hora}` : l.fecha) : l.inicio || '');

function hora(p, variante) {
  if (!p || p.hh == null) return '';
  if (variante === 'en') {
    const h = Number(p.hh), ampm = h < 12 ? 'AM' : 'PM';
    return `${h % 12 || 12}:${p.mm} ${ampm}`;
  }
  if (!variante.startsWith('es')) return `${p.hh}:${p.mm}`;
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

// Las partes de una fecha para la marca data-fecha (plantillas con {d} {dd} {mm} {mes} {MES} {Mes} {a} {hora})
function piezas(fh, variante) {
  const p = partes(fh);
  if (!p) return null;
  let mes = '';
  try { mes = new Intl.DateTimeFormat(LOCALES[variante] || 'es-MX', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(+p.a, +p.m - 1, 1))); } catch { /* sin Intl */ }
  const mes3 = mes.slice(0, 3);
  return { d: String(+p.d), dd: p.d, m: String(+p.m), mm: p.m, a: p.a, mes, MES: mes.toLocaleUpperCase(), Mes: mes.charAt(0).toLocaleUpperCase() + mes.slice(1),
    mes3, MES3: mes3.toLocaleUpperCase(), Mes3: mes3.charAt(0).toLocaleUpperCase() + mes3.slice(1), hora: hora(p, variante),
    aa: p.a.slice(2), hh: p.hh ?? '', mi: p.mm ?? '' };
}

// "12 de septiembre de 2027 a las 20:00" (la fecha larga que usan muchos diseños), en el idioma de la invitación
const A_LAS = { es: 'a las', en: 'at', pt: 'às', fr: 'à', it: 'alle', ca: 'a les', de: 'um', nl: 'om' };
function fechaLarga(fh, variante) {
  const p = partes(fh);
  if (!p) return '';
  let f;
  try { f = new Intl.DateTimeFormat(LOCALES[variante] || 'es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(+p.a, +p.m - 1, +p.d))); }
  catch { f = fechaCirculos(p); }
  if (p.hh == null) return f;
  const h = variante === 'en' ? hora(p, 'en') : `${p.hh}:${p.mm}`;
  return `${f} ${A_LAS[variante.slice(0, 2)] || ''} ${h}`.replace(/\s+/g, ' ');
}

// Suma horas a "AAAA-MM-DDTHH:MM" (para el fin por defecto del calendario)
function sumarHoras(fh, horas) {
  const p = partes(fh);
  if (!p || p.hh == null) return null;
  const t = new Date(Date.UTC(+p.a, +p.m - 1, +p.d, +p.hh + horas, +p.mm));
  return `${t.getUTCFullYear()}-${dos(t.getUTCMonth() + 1)}-${dos(t.getUTCDate())}T${dos(t.getUTCHours())}:${dos(t.getUTCMinutes())}`;
}

// Mapa: el servidor ya leyó el link de Google Maps (mapaQ: coordenadas o lugar buscado).
// Si no se pudo leer, se busca por el nombre del lugar. El botón abre el link tal cual.
function mapa(lugar) {
  const q = lugar.mapaQ || [lugar.nombre, lugar.direccion].filter(Boolean).join(', ');
  if (!q && !lugar.mapaEmbed) return { embed: '', link: '' };
  return {
    embed: lugar.mapaEmbed || embedMapa({ q, ll: lugar.mapaLL }),
    link: lugar.mapaLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
  };
}

// En la invitación va solo el nombre del lugar (sin comillas); la ubicación la da el mapa
const lugarTexto = (l) => l.nombre || l.direccionTexto || l.direccion || '';

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

// Proporciones fijas por tipo de foto (las del panel) → estilo para recortar con el encuadre elegido
const PROP = { galeria: '1/1', lugar: '9/4', dress: '4/9', testigo: '1/1' };
const PROP_GALERIA = { cuadrada: '1/1', horizontal: '3/2', vertical: '2/3' };
const encuadre = (prop, pos) => `aspect-ratio:${prop};object-fit:cover;object-position:${pos || '50% 50%'}`;
// Encuadre con zoom (testigos): se agranda desde el punto elegido y se recorta con un círculo
// del mismo tamaño que el original, así no cambia el lugar que ocupa en la página
function encuadreZoom(prop, pos, zoom) {
  const base = encuadre(prop, pos);
  const z = Number(zoom);
  if (!(z > 1)) return base;
  const [px, py] = (pos || '50% 50%').split(' ').map((x) => parseFloat(x) || 0);
  const c = (p) => Math.round((p + (50 - p) / z) * 100) / 100;
  return `${base};transform:scale(${z});transform-origin:${pos || '50% 50%'};clip-path:circle(${Math.round((50 / z) * 100) / 100}% at ${c(px)}% ${c(py)}%)`;
}
const urlDe = (f) => (typeof f === 'string' ? f : f?.url || '');
// Solo boda, 15, bautismo, comunión y graduación tienen ceremonia, misa o acto
const CON_CEREMONIA = new Set(['boda', '15', 'bautismo', 'comunion', 'graduacion']);
// Testigos, padrinos o cómplices (cumpleaños)
const CON_PADRINOS = new Set(['boda', '15', 'bautismo', 'comunion', 'cumple', 'graduacion']);

// Lo que ya respondió el invitado (para mostrárselo y poder cambiarlo): solo sus propias respuestas
const CAMPOS_RESPUESTA = ['asiste', 'acompanantes', 'asisten', 'personas', 'comida', 'comida_acomp', 'alcohol', 'ninos', 'traslado', 'mensaje', 'extra', 'extra2', 'extra3', 'extra4', 'extra5'];
function respuestaPrevia(r) {
  if (!r) return null;
  const o = { creado: r.creado };
  for (const k of CAMPOS_RESPUESTA) if (r[k] != null && r[k] !== '') o[k] = String(r[k]);
  return o;
}

export function armarVista({ evento: e, modelo, t, variante, rutas, demo = false, invitado = null, marca = null }) {
  const plural = !!e.nombres?.b;
  const paquete = modelo.paquetes[e.paquete] || modelo.paquetes.basic;
  const incluye = paquete.incluye;
  const nA = e.nombres?.a || '', nB = e.nombres?.b || '';
  const nombresTexto = plural ? `${nA} & ${nB}` : nA;
  // Cada nombre en su caja (ai-n): un nombre compuesto no se parte entre el corazón y el otro nombre;
  // si no entran en una línea, el segundo nombre baja entero
  const caja = (n) => (n ? `<span class="ai-n">${esc(n)}</span>` : '');
  const conNombres = (plantilla) => plantilla.replace('{a}', caja(nA)).replace('{b}', caja(nB));

  // Secciones: las del paquete, menos las que el cliente apagó
  const apagadas = new Set(Object.entries(e.secciones || {}).filter(([, on]) => on === false).map(([k]) => k));
  const secciones = Object.fromEntries(paquete.secciones.map((s) => [s, !apagadas.has(s)]));
  // La historia apagada no desaparece: queda el saludo de bienvenida de los modelos Basic
  // Testigos o padrinos solo en boda, 15, bautismo y comunión
  if (!CON_PADRINOS.has(e.tipo) && 'testigos' in secciones) secciones.testigos = false;
  // Dress code apagado: tampoco van las sugerencias de estilos (son parte del dress code)
  if (secciones.dresscode === false && 'estilos' in secciones) secciones.estilos = false;
  const historiaActiva = !!secciones.historia;
  if ('historia' in secciones) secciones.historia = true;
  // Playlist: solo si hay un link de Spotify válido
  const playlistId = (/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album)\/([A-Za-z0-9]{10,40})/.exec(e.playlist?.link || '') || []).slice(1);
  if ('playlist' in secciones && !playlistId.length) secciones.playlist = false;
  // Instagram Wall y álbum compartido: uno u otro (si quedaron los dos, el álbum)
  if (secciones.instagram && secciones.album) secciones.instagram = false;
  const fotosOn = (g) => e.fotosOn?.[g] !== false;

  // Textos que el cliente puede reescribir: lo suyo, o el del idioma
  const propio = (ruta, clave) => (lleno(ruta) ? ruta : t(clave));

  // Ceremonia y celebración
  const cel = e.celebracion || {};
  const cer = e.ceremonia || {};
  const modo = CON_CEREMONIA.has(e.tipo) ? cer.modo || 'separada' : 'sin'; // separada | mismo-lugar | sin
  const zona = e.zonaHoraria || 'Europe/Madrid';
  // Títulos: los que escribió el cliente, si no los del idioma
  const tituloCer = cer.titulo || t(`ceremonia.${cer.tipo || 'religiosa'}`);
  const tituloCel = modo === 'mismo-lugar' ? cel.tituloUnico || t('unificado.titulo')
    : modo === 'sin' ? cel.tituloSolo || t('celebracion.sola') : cel.titulo || t('celebracion.titulo');
  const descripcion = t('evento.descripcion');
  const nombreCal = (titulo) => `${titulo} - ${nombresTexto}`;

  // Cada lugar tiene su interruptor de foto (antes había uno para los dos: fotosOn.lugares)
  const fotoLugar = (l) => (fotosOn('lugares') && l.foto ? l.foto : '');
  const cerInicio = inicioDe(cer), celInicio = inicioDe(cel);
  const ceremonia = {
    separada: modo === 'separada',
    unificada: modo === 'mismo-lugar',
    // Un solo ícono en la celebración: el de la ceremonia si es en el mismo lugar; en la boda, también sin ceremonia (anillos)
    iconoUnico: modo === 'mismo-lugar' || (e.tipo === 'boda' && modo === 'sin'),
    titulo: tituloCer,
    foto: fotoLugar(cer),
    fotoEstilo: encuadre(modelo.proporciones?.lugar || PROP.lugar, cer.fotoPos),
    fechaHora: fechaHora(cerInicio, variante),
    fechaLarga: fechaLarga(cerInicio, variante),
    lugarTexto: lugarTexto(cer),
    mapa: mapa(cer),
  };
  const celebracion = {
    titulo: tituloCel,
    foto: fotoLugar(cel),
    fotoEstilo: encuadre(modelo.proporciones?.lugar || PROP.lugar, cel.fotoPos),
    fechaHora: fechaHora(celInicio, variante),
    fechaLarga: fechaLarga(celInicio, variante),
    lugarTexto: lugarTexto(cel),
    mapa: mapa(cel),
  };
  const calendarios = {
    // La ceremonia termina cuando empieza la fiesta; si es otro día (o no hay hora de fiesta), dura 2 horas
    ceremonia: modo === 'separada' ? calendario({ nombre: nombreCal(tituloCer), descripcion, inicio: cerInicio,
      fin: celInicio && celInicio.slice(0, 10) === cerInicio.slice(0, 10) && celInicio > cerInicio ? celInicio : sumarHoras(cerInicio, 2),
      lugar: [cer.nombre, cer.direccion].filter(Boolean).join(', '), zona }) : null,
    celebracion: calendario({
      nombre: nombreCal(t('evento.nombre')), descripcion,
      inicio: celInicio,
      fin: sumarHoras(celInicio, DURACION[e.tipo] || 5),
      lugar: [cel.nombre, cel.direccion].filter(Boolean).join(', '), zona,
    }),
  };

  // Fecha principal: la de la ceremonia si hay, si no la de la fiesta
  const principal = partes((modo === 'separada' && cerInicio) || celInicio || e.fecha);
  const fechas = { principal: piezas((modo === 'separada' && cerInicio) || celInicio || e.fecha, variante), ceremonia: piezas(cerInicio, variante), celebracion: piezas(celInicio, variante) };

  const fotos = e.fotos || {};
  // Portada: un encuadre para el celular (pos) y otro para la computadora (posPc)
  const portadaSinFoto = `${rutas.modelo}/${modelo.portadaSinFoto || 'img/bg-oliva-2.jpg'}`;
  const portada = (fotosOn('portada') ? fotos.portada || [] : []).slice(0, incluye.fotosPortada)
    .map((f) => (typeof f === 'string' ? { url: f } : f)).map((f) => ({ url: f.url, pos: f.pos || '50% 50%', estilo: `--pos-pc:${f.posPc || f.pos || '50% 50%'}`,
      // Foto suelta (<img> en un círculo o marco): el encuadre con object-position
      estiloImg: `object-fit:cover; object-position:${f.pos || '50% 50%'}` }));
  // Con video de portada: una sola caja de foto (el video va adentro; la foto queda de poster)
  if (modelo.videoPortada && fotosOn('portada') && e.portada?.tipo === 'video' && e.portada?.video) {
    portada.splice(1);
    if (!portada.length) portada.push({ url: '', pos: '50% 50%', estilo: '', estiloImg: '' });
  }
  // Sin foto de portada: un color liso del diseño (Travel: su avión, una imagen fija del modelo)
  const hayFotoPortada = portada.length > 0;
  const colorLiso = String(modelo.colorSinFoto || modelo.miniatura?.colorFondo || modelo.paleta?.[1] || '#cfcfcf').replace(/[^#0-9a-zA-Z(),.% ]/g, '');
  const liso = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="${colorLiso}"/></svg>`).replace(/\(/g, '%28').replace(/\)/g, '%29')}`;
  if (!portada.length) portada.push({ url: modelo.portadaSinFotoImagen ? portadaSinFoto : liso, pos: '50% 50%', estilo: '--pos-pc:50% 50%', estiloImg: '' });
  // Galería: cómo se muestra (carrusel, mosaico, grilla, polaroids) y la proporción de todas las fotos
  const tipoGaleria = ['carrusel', 'mosaico', 'grilla', 'polaroids'].includes(e.galeria?.tipo) && !modelo.galeria?.enRsvp ? e.galeria.tipo : 'carrusel';
  const propGaleria = PROP_GALERIA[e.galeria?.proporcion] || PROP.galeria;
  const galeria = (fotos.galeria || []).slice(0, incluye.fotosGaleria).map((f) => ({ url: urlDe(f), pos: f?.pos || '50% 50%', estilo: encuadre(propGaleria, f?.pos) }));
  // Publicada sin fotos cargadas: como si se hubiera apagado (sin galería; la confirmación sin foto)
  if (!demo && !galeria.length && 'galeria' in secciones) secciones.galeria = false;

  const itinerario = (e.itinerario || []).map((i) => ({
    hora: i.hora || '', texto: i.texto || '',
    // El del modelo o uno de los comunes; sin elegir, el círculo vacío
    iconoUrl: (modelo.iconosItinerario || []).includes(i.icono) ? `${rutas.modelo}/img/timeline-icon-${i.icono}.png`
      : ICONOS_COMUNES.includes(i.icono) ? `${rutas.comun}/img/itinerario/timeline-icon-${i.icono}.png` : '',
  }));

  const regalos = e.regalos || {};
  // Todos los datos se pueden copiar con un toque
  const cuentas = (regalos.cuentas || []).filter((c) => c.dato).map((c) => ({ ...c, copiable: true }));
  // Listas de regalos (varias tiendas); las viejas tenían una sola en regalos.lista
  const listas = (regalos.listas || (regalos.lista ? [regalos.lista] : []))
    .filter((l) => l && (l.dato || l.link)).map((l) => ({ etiqueta: l.etiqueta || '', dato: l.dato || '', link: l.link || '' }));
  const lista = listas.length ? { texto: esc(propio(regalos.lista?.texto, 'regalos.listaTexto')) } : null;

  // Cada red con su interruptor (sin la marca, se muestra si tiene link, como antes)
  const redes = Object.fromEntries(Object.entries(e.redes || {}).filter(([k, v]) => k !== 'titulo' && v && e.redesOn?.[k] !== false));
  const bus = e.bus || {};

  return {
    id: e.id,
    demo,
    rutas,
    idioma: { variante, fechas: LOCALES[variante] || 'es-ES', html: variante.slice(0, 2) },
    paquete: { id: e.paquete, incluye },
    modelo: { id: modelo.id, sobre: modelo.sobre },
    // Sobre de apertura (Premium y Deluxe, se puede apagar en Portada). Apagado: la ventana de bienvenida del diseño
    sobre: { activo: !!incluye.sobre && e.portada?.sobre !== false },
    // Sobre apagado: la ventana de bienvenida del diseño, solo si hay música de fondo (es para elegir con o sin música)
    bienvenidaModal: { activa: !!incluye.sobre && e.portada?.sobre === false && !!(e.musica?.archivo && secciones.musica !== false) },
    secciones,
    plural,

    nombres: {
      texto: nombresTexto,
      a: nA || '', b: plural ? (nB || '') : '',
      portada: plural ? conNombres(modelo.nombresHTML.portada) : conNombres(modelo.nombresHTML.solo),
      cierre: plural ? conNombres(modelo.nombresHTML.cierre) : conNombres(modelo.nombresHTML.solo),
      iniciales: [nA, nB].filter(Boolean).map((n) => n.trim().charAt(0).toUpperCase()),
      // Las letras del diseño (Euforia: a los costados de la espiga)
      inicialA: (nA || '').trim().charAt(0).toUpperCase(),
      inicialB: plural ? (nB || '').trim().charAt(0).toUpperCase() : '',
    },
    fechas,
    // Video de portada (modelos con video): el MP4 que subió el cliente
    portada: { color: !!(modelo.sepiaPortada && e.portada?.color), hayFoto: hayFotoPortada || demo, ciudad: String(e.portada?.ciudad ?? (demo ? 'Miami' : '')).slice(0, 30), video: modelo.videoPortada && fotosOn('portada') && e.portada?.tipo === 'video' ? (e.portada?.video || '') : '', poster: portada[0]?.url || '' },
    fecha: { puntos: fechaPuntos(principal), iso: principal ? `${principal.a}-${principal.m}-${principal.d}` : '' },
    cuenta: {
      activa: !!incluye.cuenta && !!principal && e.portada?.cuenta !== false,
      // Apagada: Premium y Deluxe usan la portada de Basic (sin cuenta regresiva)
      portada: !!incluye.cuenta && e.portada?.cuenta !== false,
      fecha: principal ? `${principal.a}/${principal.m}/${principal.d} ${principal.hh ?? '00'}:${principal.mm ?? '00'}:00` : '',
    },
    // La sección "Música de fondo" se puede apagar (sin la marca, prendida como antes)
    grupos: {
      dress: !!(secciones.dresscode || secciones.estilos || secciones.hospedaje || secciones.bus),
      dressCol: !!(secciones.dresscode || secciones.estilos),
      fotos: !!(secciones.album || secciones.instagram),
    },
    playlist: playlistId.length ? {
      tipo: playlistId[0], id: playlistId[1], link: e.playlist.link,
      embed: `https://open.spotify.com/embed/${playlistId[0]}/${playlistId[1]}?utm_source=generator&theme=0`,
      pistas: (e.playlist.pistas || []).slice(0, 50), cantidad: e.playlist.cantidad || 0, minutos: e.playlist.minutos || 0,
    } : null,
    musica: {
      archivo: incluye.musica && secciones.musica !== false ? (e.musica?.archivo || '') : '',
      inicio: e.musica?.inicio ?? '',
    },

    historia: { activa: historiaActiva, bienvenida: !historiaActiva, texto: esc(propio(e.historia?.texto, 'historia.texto')).replace(/\n/g, '<br>') },
    ceremonia, celebracion, calendarios,
    fotos: {
      portada, galeria,
      // Confirmación y álbum: la foto va tal cual se subió, sin recortar
      rsvp: fotosOn('rsvp') ? fotos.rsvp || '' : '', rsvpEstilo: '',
      // La foto de la historia (la "inicial" de Armonía, Lila, Style…)
      historia: fotosOn('historia') ? fotos.historia || '' : '',
      historiaEstilo: modelo.fotoHistoria ? `aspect-ratio:${String(modelo.fotoHistoria).replace(':', '/')};object-fit:cover;object-position:${e.fotos?.historiaPos || '50% 50%'}` : '',
      album: fotosOn('album') ? fotos.album || '' : '', albumEstilo: '',
      // Instagram Wall (en Premium antes usaba la foto del álbum)
      instagram: fotosOn('instagram') ? fotos.instagram || (e.paquete === 'premium' ? fotos.album || '' : '') : '', instagramEstilo: '',
      cantidadGaleria: galeria.length,
    },

    galeria: { tipo: tipoGaleria, carrusel: tipoGaleria === 'carrusel', proporcion: propGaleria, color: !!e.galeria?.color },
    rsvp: {
      texto: propio(e.rsvp?.texto, 'rsvp.texto'),
      // Con el aforo completo se cierra igual que al pasar la fecha límite
      cierre: e.rsvp?.lleno ? '2000-01-01' : e.rsvp?.cierre || '',
      lleno: !!e.rsvp?.lleno,
      formato: 'corto',
      acompanantes: e.rsvp?.acompanantes ?? 0,
      preguntas: e.rsvp?.preguntas || {},
      // Preguntas propias (hasta 5): con opciones es un desplegable, sin opciones respuesta libre
      extras: (e.rsvp?.extras || []).filter((x) => x.pregunta).slice(0, 5)
        .map((x) => ({ pregunta: x.pregunta, opciones: String(x.opciones || '').split(',').map((o) => o.trim()).filter(Boolean) })),
    },
    dresscode: {
      texto: esc(propio(e.dresscode?.texto, 'dresscode.texto')),
      sugerencias: !!incluye.sugerenciasDress && fotosOn('dresscode') && lleno(e.dresscode?.fotos),
      // Colores a evitar: una fila de círculos
      evitar: (e.dresscode?.evitar || []).filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 4).map((c) => ({ color: c, estilo: `background-color:${c}` })),
      fotos: (e.dresscode?.fotos || []).map((f) => ({ url: urlDe(f), estilo: encuadre(PROP.dress, f?.pos) })),
    },
    // El botón de referencias / recorrido va solo si el cliente cargó algo
    // texto = las indicaciones (van en la ventana antes de la lista). La ventana lleva el título de la sección
    // salvo que el cliente le ponga otro (textos.hospedaje.modal / textos.bus.modal).
    hospedaje: { texto: esc(e.hospedaje?.texto || '').replace(/\n/g, '<br>'), items: (e.hospedaje?.items || []).filter((x) => x.nombre),
      modalTitulo: String(e.textos?.hospedaje?.modal || '').trim() || t('hospedaje.titulo'),
      conReferencias: (e.hospedaje?.items || []).some((x) => x.nombre) || !!String(e.hospedaje?.texto || '').trim() },
    busConRecorrido: (bus.paradas || []).some((p) => String(p.detalle || '').trim()) || !!String(bus.texto || '').trim(),
    bus: {
      textoLibre: esc(bus.texto || '').replace(/\n/g, '<br>'),
      modalTitulo: String(e.textos?.bus?.modal || '').trim() || t('bus.titulo'),
      paradas: (bus.paradas || []).map((p, i, todas) => ({
        etiqueta: p.etiqueta || t(i === 0 ? 'bus.partida' : i === todas.length - 1 ? 'bus.destino' : 'bus.parada'),
        detalle: p.detalle || (i === todas.length - 1 ? t('bus.destinoTexto') : ''),
      })),
    },
    itinerario: { items: itinerario },
    testigos: { items: (e.testigos || []).filter((x) => x.nombre || x.foto).map((x) => ({ ...x, foto: fotosOn('testigos') ? x.foto || '' : '', estilo: encuadreZoom(PROP.testigo, x.fotoPos, x.fotoZoom) })) },
    // Álbum de Albunear (el Classic incluido en Deluxe) o un link propio
    album: { url: (e.album?.origen === 'albunear' ? e.album?.albunear : e.album?.url) || '' },
    // Premium: hashtag de Instagram (por defecto los nombres y el año, como #SofiyAle2027)
    hashtag: (() => {
      const limpio = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]/g, '');
      const tag = limpio(e.album?.hashtag) || `${limpio(nA)}${nB ? `y${limpio(nB)}` : ''}${principal?.a || ''}`;
      return { texto: tag ? `#${tag}` : '', link: tag ? `https://www.instagram.com/explore/tags/${tag}/` : '' };
    })(),
    canciones: { spotify: e.canciones?.spotify || '' },
    regalos: {
      texto: esc(propio(regalos.texto, 'regalos.texto')),
      cuentas, lista, listas,
      hayBotones: cuentas.length > 0 || !!lista,
    },
    redes: { ...redes, hay: !!(redes.instagram || redes.facebook || redes.tiktok) },
    pie: { texto: esc(propio(e.pie?.texto, 'pie.texto')), mostrar: e.pie?.mostrarTexto !== false },

    // La seguridad ya la resolvió el servidor: acá solo va a quién mostrar
    // Con link personal o PIN por invitado la lista va siempre
    acceso: { lista: !!(e.acceso?.lista || e.acceso?.modo === 'codigo' || (e.acceso?.modo === 'pin' && e.acceso?.pinPorInvitado)), inv: invitado?.codigo || '',
      // Su fila (nombre, pases, mesa) va directo en la página: no hace falta pedir la lista
      invitado: invitado ? {
        codigo: invitado.codigo || '', nombre: invitado.nombre || '', pases: Number(invitado.pases) || 0, mesa: invitado.mesa ?? '',
        integrantes: String(invitado.integrantes || '').split(',').map((x) => x.trim()).filter(Boolean),
        respuesta: respuestaPrevia(invitado.respuesta),
        pase: !!invitado.pase && !!invitado.codigo,
      } : null },
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
