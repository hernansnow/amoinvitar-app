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
export function sobre({ t, v }) {
  if (!v.paquete.incluye.sobre) return '';
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
<script src="${raiz}/js/rsvp-universal_v2.2.js"></script>`;
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
    <form id="rsvp-form">
      <input type="hidden" name="event_id" id="event-id">
      <input type="hidden" name="inv" id="inv-field">
      <div id="rsvp-fijos"></div>
      <div id="rsvp-dinamicos"></div>
      <div id="rsvp-error" class="alert alert-danger mt-2" style="display:none;"></div>
      <div id="rsvp-footer"><button type="submit" class="btn btn-dark text-uppercase btn-block mt-4"></button></div>
    </form>
    <div id="rsvp-ok" style="display:none;"></div>
  </div>
</div>`;
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
        <p class="mb-1"><img class="img-fluid mb-0" src="${v.rutas.modelo}/img/icon-music-b.png" width="80" alt=""></p>
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

export const COMPONENTES = { sobre, acceso, 'rsvp-form': rsvpForm, canciones, 'album-qr': albumQr, 'pie-marca': pieMarca };
