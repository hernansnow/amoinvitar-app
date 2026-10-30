// Bloques comunes a todos los modelos. El motor los inserta donde el HTML del
// modelo tiene <div data-componente="…">. Reciben:
//   t(clave)  → texto del idioma (con lo que haya cambiado el cliente)
//   v         → la vista del evento (datos ya calculados)
//   el        → el elemento del modelo (sus data-clase-* ajustan clases)
// Los textos y la configuración salen de acá: los scripts de siempre
// (lista-de-invitados-universal y rsvp-universal) los leen igual que antes.

import { sobreHTML } from './sobre.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

// ── Sobre lacrado ─────────────────────────────────────────────────────
export function sobre({ t, v, el }) {
  if (v.bienvenidaModal?.activa) return bienvenida({ t, v, el });
  if (!v.sobre?.activo) return '';
  const s = v.modelo.sobre || {};
  return sobreHTML({
    colores: s.colores,
    iniciales: v.nombres.iniciales,
    bienvenida: t('sobre.bienvenida'),
    bvEstilo: s.bienvenida || '',
    tocar: t('sobre.tocar'),
    ariaSobre: t('sobre.aria'),
    ariaLacre: t('sobre.ariaLacre'),
  });
}

// ── Ventana de bienvenida (sobre apagado en Portada) ─────────────────
// Cada modelo trae su modal original como <div class="ai-bv" id="ai-bienvenida"
// data-si="bienvenidaModal.activa" hidden>. Si el modelo no lo tiene, va uno genérico.
export function bienvenida({ t, v, el }) {
  const raiz = v.rutas.comun;
  const recursos = `<link rel="stylesheet" href="${raiz}/css/bienvenida.css">
<script src="${raiz}/js/bienvenida.js" defer></script>`;
  if (el?.ownerDocument?.getElementById('ai-bienvenida')) return recursos;
  const musica = !!v.musica?.archivo;
  const botones = musica
    ? `<button type="button" data-bv="musica">${esc(t('bv.conMusica'))}</button><button type="button" data-bv="entrar">${esc(t('bv.sinMusica'))}</button>`
    : `<button type="button" data-bv="entrar">${esc(t('bv.entrar'))}</button>`;
  return `${recursos}
<div class="ai-bv ai-bv-generica" id="ai-bienvenida" hidden role="dialog" aria-modal="true" aria-label="${esc(t('bv.titulo'))}">
  <div class="ai-bv-caja"><div class="ai-bv-tarjeta">
    <h3>${esc(t('bv.titulo'))}</h3>${musica ? `<p>${esc(t('bv.texto'))}</p>` : ''}
    <div>${botones}</div>
  </div></div>
</div>`;
}

// ── Datos para los scripts de lista y RSVP ────────────────────────────
// El PIN y el bloqueo los resuelve el servidor antes de mandar la página
// (ver src/acceso.js): acá los scripts reciben todo ya habilitado, y la
// lista trae solo la fila del invitado que abrió su link.
export function acceso({ t, v }) {
  const raiz = v.rutas.comun;
  const cfg = {
    event_id: v.id,
    csv: v.acceso.lista && v.acceso.inv
      ? `${v.rutas.api}/invitados.csv?e=${encodeURIComponent(v.id)}&inv=${encodeURIComponent(v.acceso.inv)}` : '',
    rsvp_url: `${v.rutas.api}/rsvp`,
    invitado: v.acceso.invitado || null,
    prueba: !!v.prueba, // vista previa del panel: el RSVP se puede probar pero no se guarda
    soloInvitados: false, requierePin: false, requierePinBasico: false,
    gateTitulo: v.nombres.texto,
    txtFaltaCSV: t('lista.faltaCSV'),
    txtErrorCSV: t('lista.errorCSV'),
    txtPasesPrefix: '',
    txtPaseExtra: t('lista.paseExtra'),
    txtPasesExtras: t('lista.pasesExtras'),
    txtMesaPrefix: t('lista.mesa'),
  };
  return `
<script>window.INVITACION_CONFIG = ${json(cfg)};</script>
<script src="${raiz}/js/lista-de-invitados-universal_v2.0.js"></script>
<link rel="stylesheet" href="${raiz}/css/modal.css">
<script src="${raiz}/js/modal.js"></script>
<script src="${raiz}/js/rsvp-pasos.js"></script>${flotante(v, t)}`;
}

// ── Control flotante: música (play/pausa) e idioma con bandera ─────────
// Uno solo, chico, arriba a la izquierda. La música aparece si la invitación
// tiene canción (lo resuelve flotante.js); el idioma, si hay más de uno.
const NOMBRE_IDIOMA = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français', it: 'Italiano', ca: 'Català', de: 'Deutsch', nl: 'Nederlands' };
function flotante(v, t) {
  const raiz = v.rutas.comun;
  const lista = (v.idiomas?.lista || []).map((x) => x.slice(0, 2));
  const actual = (v.idiomas?.actual || lista[0] || 'es').slice(0, 2);
  const banderas = v.idiomas?.banderas || {};
  const img = (c) => (banderas[c] ? `<img src="${raiz}/banderas/${esc(banderas[c])}.svg" alt="" width="20" height="20">` : `<span class="ai-f-cod">${c.toUpperCase()}</span>`);
  const idiomas = lista.length < 2 ? '' : `
  <div class="ai-f-idioma">
    <button type="button" class="ai-f-btn ai-f-actual" aria-haspopup="true" aria-expanded="false" title="${esc(NOMBRE_IDIOMA[actual] || actual)}">${img(actual)}<span class="ai-f-txt">${actual.toUpperCase()}</span></button>
    <div class="ai-f-menu" role="menu" hidden>${lista.map((c) => `<a role="menuitem" href="?lang=${c}" data-lang="${c}" hreflang="${c}" lang="${c}"${c === actual ? ' aria-current="true"' : ''}>${img(c)}<span>${esc(NOMBRE_IDIOMA[c] || c)}</span></a>`).join('')}</div>
  </div>`;
  return `
<link rel="stylesheet" href="${raiz}/css/flotante.css">
<div class="ai-flotante" id="ai-flotante" data-idiomas="${esc(lista.join(','))}" data-actual="${esc(actual)}" hidden>
  <button type="button" class="ai-f-btn ai-f-musica" aria-pressed="false" aria-label="${esc(t('musica.boton'))}" hidden>
    <svg class="ai-f-play" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>
    <span class="ai-f-eq" aria-hidden="true"><i></i><i></i><i></i></span>
  </button>${idiomas}
</div>
<script src="${raiz}/js/flotante.js" defer></script>`;
}

// ── Pie con la marca de la empresa (marca blanca) ─────────────────────
export function pieMarca({ v }) {
  const m = v.marca;
  if (!m?.blanca) return '';
  const logo = m.logo ? `<img class="img-fluid mb-1" style="max-height:40px" src="${esc(m.logo)}" alt="${esc(m.nombre || '')}">` : '';
  const texto = m.pie || m.nombre || '';
  const contenido = `${logo}${texto ? `<p class="text-small mb-0 mt-1 text-white-50">${esc(texto)}</p>` : ''}`;
  return `<footer class="site-footer pt-4 pb-4"><div class="container text-center">${m.web ? `<a href="${esc(m.web)}" target="_blank" rel="noopener">${contenido}</a>` : contenido}</div></footer>`;
}

// ── Formulario de confirmación (modal) ────────────────────────────────
export function rsvpForm({ t, v, el }) {
  const r = v.rsvp;
  const claseTitulo = el.getAttribute('data-clase-titulo') || 'text-center text-black mb-4 font-weight-bolder border-bottom border-dark';
  const preguntas = r.preguntas || {};
  const attrs = {
    'data-url': '',
    'data-label-nombre': t('rsvp.form.nombre'),
    'data-label-asiste': t('rsvp.form.asiste'),
    'data-label-acompanante': t('rsvp.form.acompanante'),
    'data-label-acompanantes-select': t('rsvp.form.acompanantesSelect'),
    'data-label-comida': t('rsvp.form.comida'),
    'data-label-alcohol': t('rsvp.form.alcohol'),
    'data-label-ninos': t('rsvp.form.ninos'),
    'data-label-ninos-input': t('rsvp.form.ninosCantidad'),
    'data-ninos-numero': 'true',
    'data-label-comida-acomp': t('rsvp.form.comidaAcomp'),
    'data-label-traslado': t('rsvp.form.traslado'),
    'data-text-seleccionar': t('rsvp.form.seleccionar'),
    'data-text-otra': t('rsvp.form.otra'),
    'data-text-detalle': t('rsvp.form.detalle'),
    'data-text-acompanante': t('rsvp.form.acompananteN'),
    'data-text-btn-submit': t('rsvp.form.enviar'),
    'data-text-enviando': t('rsvp.form.enviando'),
    'data-msg-no-asiste': t('rsvp.form.msgNoAsiste'),
    'data-msg-ok': t('rsvp.form.msgOk'),
    'data-msg-error': t('rsvp.form.msgError'),
    'data-msg-lleno': t('rsvp.form.msgLleno'),
    'data-msg-acceso': t('rsvp.form.msgAcceso'),
    'data-msg-prueba': t('rsvp.form.msgPrueba'),
    'data-label-quienes': t('rsvp.form.quienes'),
    'data-text-va': t('rsvp.form.va'),
    'data-text-no-va': t('rsvp.form.noVa'),
    'data-text-ya-respondiste': t('rsvp.form.yaRespondiste'),
    'data-text-cambiar': t('rsvp.form.cambiar'),
    'data-text-personas': t('rsvp.form.personas'),
    'data-text-pase': t('rsvp.form.pase'),
    'data-text-pase-ayuda': t('rsvp.form.paseAyuda'),
    'data-text-volver': t('rsvp.form.volver'),
    'data-msg-respuesta-invalida': t('rsvp.form.msgInvalida'),
    'data-msg-campos-vacios': t('rsvp.form.msgVacios'),
    'data-comida-opciones': t('rsvp.form.comidaOpciones'),
    'data-text-si-asiste': t('rsvp.form.siAsiste'),
    'data-text-no-asiste': t('rsvp.form.noAsiste'),
    'data-text-si-alcohol': t('general.si'),
    'data-text-no-alcohol': t('general.no'),
    'data-text-si-ninos': t('general.si'),
    'data-text-no-ninos': t('general.no'),
    'data-text-si-traslado': t('general.si'),
    'data-text-no-traslado': t('rsvp.form.noTraslado'),
    'data-sublabel-traslado': t('rsvp.form.subTraslado'),
    'data-sublabel-comida': '',
    'data-sublabel-alcohol': '',
    'data-sublabel-ninos': '',
    'data-max-acompanantes-libre': r.acompanantes,
    'data-text-no-acompanantes': t('general.no'),
    'data-acompanantes-placeholder': t('rsvp.form.acompanantesPlaceholder'),
    'data-preguntas-comida': !!preguntas.comida,
    'data-preguntas-alcohol': !!preguntas.alcohol,
    'data-preguntas-ninos': !!preguntas.ninos,
    'data-preguntas-traslado': !!preguntas.traslado,
    // Pasos y mensaje para los anfitriones
    'data-preguntas-mensaje': preguntas.mensaje !== false,
    'data-label-mensaje': t('rsvp.form.mensaje'),
    'data-placeholder-mensaje': t('rsvp.form.mensajePlaceholder'),
    'data-label-acompanantes-nombres': t('rsvp.form.acompNombres'),
    'data-text-atras': t('rsvp.form.atras'),
    'data-text-siguiente': t('rsvp.form.siguiente'),
    'data-text-si': t('general.si'),
    'data-text-no': t('general.no'),
  };
  // Preguntas propias del cliente: el formulario las lee como extra, extra2… extra5
  (r.extras || []).forEach((x, i) => {
    const suf = i === 0 ? '' : String(i + 1);
    attrs[`data-preguntas-extra${suf}`] = 'true';
    attrs[`data-label-extra${suf}`] = x.pregunta;
    attrs[`data-extra-tipo${suf}`] = x.opciones.length ? 'select' : 'texto';
    if (x.opciones.length) attrs[`data-extra-opciones${suf}`] = x.opciones.join('|');
    else attrs[`data-extra-placeholder${suf}`] = '';
  });
  const attrHTML = Object.entries(attrs).map(([k, val]) => `${k}="${esc(val)}"`).join('\n      ');
  return `
<div style="display:none;" id="confirmar-rsvp" class="animated-modal p-4">
  <div class="mt-3" data-selectable="true">
    <div class="text-center">
      <p class="mb-0"><i class="h2 text-black icon-envelope-open-o" aria-hidden="true"></i></p>
      <p class="${esc(claseTitulo)}">${esc(t('rsvp.modal'))}</p>
    </div>
    <div id="rsvp-config"
      ${attrHTML}
    ></div>
    <form id="rsvp-form" novalidate></form>
  </div>
</div>`;
}

// ── Galería: carrusel, mosaico, grilla o polaroids (igual en todos los modelos) ──
// Al tocar una foto se abre entera, sin recorte, y se puede ampliar (fancybox).
export function galeria({ v, t, el }) {
  const g = v.galeria || {};
  const fotos = v.fotos.galeria || [];
  if (!fotos.length) return '';
  const items = (clase = '') => fotos.map((f, i) => `
  <a class="${clase}" href="${esc(f.url)}" data-fancybox="galeria" aria-label="${esc(`${t('galeria.ver') || 'Ver foto'} ${i + 1}`)}"><img src="${esc(f.url)}" alt="" loading="lazy" style="object-position:${esc(f.pos)}"></a>`).join('');
  const css = `<link rel="stylesheet" href="${v.rutas.comun}/css/galeria.css">`;
  if (g.carrusel) {
    const varias = fotos.length > 1;
    return `${css}
<div class="ai-carrusel${varias ? '' : ' ai-una'}${g.color ? ' ai-color' : ''}${el?.hasAttribute('data-rsvp') ? ' ai-c-rsvp' : ''}" style="--prop:${esc(g.proporcion)}" data-aos="fade-up">
  <div class="ai-c-pista" tabindex="0">${items('ai-c-item')}
  </div>${varias ? `
  <button type="button" class="ai-c-flecha ai-c-ant" aria-label="${esc(t('galeria.anterior') || 'Anterior')}"><span class="icon-keyboard_arrow_left"></span></button>
  <button type="button" class="ai-c-flecha ai-c-sig" aria-label="${esc(t('galeria.siguiente') || 'Siguiente')}"><span class="icon-keyboard_arrow_right"></span></button>
  <div class="ai-c-puntos">${fotos.map((_, i) => `<button type="button" aria-label="${i + 1}"${i ? '' : ' aria-current="true"'}></button>`).join('')}</div>` : ''}
</div>
<script src="${v.rutas.comun}/js/carrusel.js" defer></script>`;
  }
  const clases = ['ai-galeria', `ai-galeria--${g.tipo}`, `ai-n${Math.min(fotos.length, 7)}`, g.color ? 'ai-color' : ''].filter(Boolean).join(' ');
  return `${css}
<div class="${clases}" style="--prop:${esc(g.proporcion)}" data-aos="fade-up">${items()}
</div>`;
}

// ── Playlist de Spotify: el mismo diseño en todos los modelos ─────────
// Fondo blanco, textos negros y el título en la fuente de énfasis del modelo
// (data-clase-titulo). Un disco de vinilo con el logo (sin logo en marca blanca)
// y el play verde de Spotify: al tocarlo para la música de fondo y gira el disco.
export function playlist({ t, v, el }) {
  const pl = v.playlist;
  if (!pl) return '';
  const lista = pl.pistas.length ? `
    <p class="ai-pl-resumen">${esc(t('playlist.resumen').replace('{n}', pl.cantidad || pl.pistas.length).replace('{min}', pl.minutos || ''))}</p>
    <ol class="ai-pl-lista">${pl.pistas.map((x, i) => `
      <li${i >= 5 ? ' class="ai-pl-mas" hidden' : ''}><span class="ai-pl-n">${i + 1}</span><span class="ai-pl-cancion"><strong>${esc(x.t)}</strong><small>${esc(x.a)}</small></span><span class="ai-pl-d">${esc(x.d)}</span></li>`).join('')}
    </ol>${pl.pistas.length > 5 ? `
    <button type="button" class="ai-pl-ver" data-mas="${esc(t('playlist.verTodas').replace('{n}', pl.pistas.length))}" data-menos="${esc(t('playlist.verMenos'))}">${esc(t('playlist.verTodas').replace('{n}', pl.pistas.length))}</button>` : ''}` : '';
  return `<link rel="stylesheet" href="${v.rutas.comun}/css/playlist.css">
<section class="ai-playlist">
  <div class="ai-pl-tarjeta" data-aos="fade-up">
    <h2 class="ai-pl-titulo">${esc(t('playlist.titulo'))}</h2>
    <p class="ai-pl-texto">${esc(t('playlist.texto'))}</p>
    <div class="ai-vinilo${v.marca.blanca ? ' sin-logo' : ''}">
      <div class="ai-v-disco"><div class="ai-v-etiqueta"></div></div>
      <button type="button" class="ai-v-play" aria-label="${esc(t('playlist.play'))}" data-pausa="${esc(t('playlist.pausa'))}" data-play="${esc(t('playlist.play'))}"><span class="ai-v-icono"></span></button>
    </div>${lista}
    <div class="ai-pl-reproductor" data-uri="spotify:${esc(pl.tipo)}:${esc(pl.id)}" data-embed="${esc(pl.embed)}"><div class="ai-pl-lugar"></div></div>
    <a class="ai-pl-abrir" href="${esc(pl.link)}" target="_blank" rel="noopener">${esc(t('playlist.abrir'))}</a>
  </div>
</section>
<script src="${v.rutas.comun}/js/playlist.js" defer></script>`;
}

// ── Sugerir canciones (modal) ─────────────────────────────────────────
export function canciones({ t, v }) {
  return `
<div id="canciones-config" style="display:none;"
     data-msg-vacio="${esc(t('canciones.msgVacio'))}"
     data-msg-enviando="${esc(t('canciones.msgEnviando'))}"
     data-msg-ok="${esc(t('canciones.msgOk'))}"
     data-msg-error="${esc(t('canciones.msgError'))}"
     data-msg-error-conexion="${esc(t('canciones.msgConexion'))}"
     data-texto-btn="${esc(t('canciones.enviar'))}"></div>
<div style="display: none;" id="canciones" class="animated-modal p-4">
  <section id="seccion-canciones" class="text-center">
    <div class="form-group">
      <label for="input-cancion">
        <p class="mb-1"><img class="img-fluid mb-0" src="${v.rutas.comun}/img/icon-music-b.png" width="80" alt=""></p>
        <p class="text-center text-black mb-3 font-weight-bolder border-bottom border-dark">${esc(t('canciones.modal'))}</p>
        <p class="mb-1">${esc(t('canciones.ayuda'))}</p>
        <p class="text-small-sm mb-2 text-black-50">${esc(t('canciones.ejemplo'))}</p>
      </label>
      <input type="text" id="input-cancion" name="fname" class="form-control border mb-3 border-dark" maxlength="200" placeholder="${esc(t('canciones.placeholder'))}">
      <button class="btn btn-dark text-uppercase btn-block mt-4" onclick="enviarCancion()" id="btn-cancion">${esc(t('canciones.enviar'))}</button>
      <p id="msg-cancion" style="display:none; margin-top:8px;"></p>
    </div>
  </section>
</div>`;
}

// ── Álbum de fotos (Albunear) en un modal ─────────────────────────────
export function albumQr({ t, v }) {
  const src = v.album.url;
  if (!src) return '';
  return `
<div class="modal fade" id="qr" tabindex="-1" role="dialog" aria-label="${esc(t('album.titulo'))}" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" role="document">
    <div class="modal-content">
      <div class="modal-header py-2"><button type="button" class="close" data-dismiss="modal" aria-label="${esc(t('boton.cerrar'))}"><span aria-hidden="true">&times;</span></button></div>
      <div class="modal-body p-0"><iframe data-src="${esc(src)}" src="about:blank" loading="lazy" title="${esc(t('album.titulo'))}" width="100%" frameborder="0" style="display:block; height:90vh; min-height:400px;"></iframe></div>
    </div>
  </div>
</div>`;
}

export const COMPONENTES = { sobre, acceso, galeria, playlist, 'rsvp-form': rsvpForm, canciones, 'album-qr': albumQr, 'pie-marca': pieMarca };
