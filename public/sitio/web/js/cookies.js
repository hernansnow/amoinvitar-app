/**
 * Amo Invitar! · Consentimiento de cookies (RGPD / LSSI-CE, criterios AEPD)
 * Basado en el sistema de Amo Fotear, sin plataformas externas.
 *
 * - Banner con "Aceptar", "Rechazar" y "Configurar" con el mismo peso visual.
 * - Nada que no sea necesario se activa antes de que la persona elija.
 * - Google (GTM / gtag) funciona con Consent Mode v2: el valor por defecto
 *   ("denied") lo fija el snippet inline del <head>; acá solo se actualiza.
 * - Meta Pixel: fbq('consent', 'grant' | 'revoke').
 * - Scripts o iframes de terceros se pueden bloquear así y se activan solos:
 *     <script type="text/plain" data-cookiecategory="analitica" data-src="..."></script>
 *     <iframe data-cookiecategory="marketing" data-src="..."></iframe>
 *
 * Este archivo va SOLO en las páginas del sitio. Las demos y las plantillas
 * de invitaciones no muestran banner: solo leen la elección guardada (snippet
 * del <head>), así que respetan lo que la persona eligió en el sitio.
 *
 * Para reabrir la configuración: CookieConsent.openPreferences(), o cualquier
 * link con data-cookie-settings o con href que termine en #configurar-cookies.
 */
(function (window, document) {
  'use strict';

  var KEY = 'ai_cookie_consent';
  var VERSION = 1;                 // subilo si cambian las categorías o finalidades
  var DURACION_MS = 365 * 864e5;   // 12 meses (criterio AEPD: máximo 24)
  var URL_POLITICA = '/info/politica-de-cookies';

  var CATEGORIAS = {
    necesarias: {
      titulo: 'Necesarias',
      fija: true,
      texto: 'Hacen que la web funcione: seguridad (Cloudflare), formularios y el recuerdo de esta misma elección. No se pueden desactivar.'
    },
    analitica: {
      titulo: 'Analítica',
      texto: 'Google Analytics nos muestra, con datos agregados, qué páginas se visitan y cómo se usa la web para mejorarla.'
    },
    marketing: {
      titulo: 'Marketing',
      texto: 'Meta (Facebook e Instagram) y Google Ads miden nuestras campañas y permiten mostrar anuncios de Amo Invitar! en otras webs.'
    }
  };

  // ---------- Guardado ----------

  function leer() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY));
      if (c && c.v === VERSION && Date.now() - c.t < DURACION_MS && c.c) return c;
    } catch (e) {}
    return null;
  }

  function guardar(estado) {
    var c = { v: VERSION, t: Date.now(), c: estado };
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {}
    window.aiConsent = estado;
    return c;
  }

  // ---------- Aplicar la elección ----------

  function activarBloqueados(cat) {
    var scripts = document.querySelectorAll('script[type="text/plain"][data-cookiecategory="' + cat + '"]');
    Array.prototype.forEach.call(scripts, function (viejo) {
      var nuevo = document.createElement('script');
      Array.prototype.forEach.call(viejo.attributes, function (a) {
        if (a.name === 'type') return;
        nuevo.setAttribute(a.name === 'data-src' ? 'src' : a.name, a.value);
      });
      if (viejo.textContent) nuevo.textContent = viejo.textContent;
      viejo.parentNode.replaceChild(nuevo, viejo);
    });
    var iframes = document.querySelectorAll('iframe[data-cookiecategory="' + cat + '"][data-src]');
    Array.prototype.forEach.call(iframes, function (f) {
      f.src = f.getAttribute('data-src');
      f.removeAttribute('data-src');
    });
  }

  function aplicar(estado) {
    var a = estado.analitica ? 'granted' : 'denied';
    var m = estado.marketing ? 'granted' : 'denied';
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: a,
        ad_storage: m,
        ad_user_data: m,
        ad_personalization: m
      });
    }
    if (typeof window.fbq === 'function') window.fbq('consent', estado.marketing ? 'grant' : 'revoke');
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'cookie_consent_update', cookie_consent: estado });
    Object.keys(CATEGORIAS).forEach(function (cat) { if (estado[cat]) activarBloqueados(cat); });
  }

  function estadoTodo(valor) {
    var e = {};
    Object.keys(CATEGORIAS).forEach(function (k) { e[k] = CATEGORIAS[k].fija ? true : valor; });
    return e;
  }

  function decidir(estado) {
    var antes = leer();
    guardar(estado);
    aplicar(estado);
    ocultarBanner();
    cerrarModal();
    // Si se retira un permiso ya dado, se recarga para que deje de funcionar
    // lo que ya estaba cargado (criterio AEPD: retirar debe ser tan fácil como dar).
    if (antes && ((antes.c.analitica && !estado.analitica) || (antes.c.marketing && !estado.marketing))) {
      setTimeout(function () { window.location.reload(); }, 150);
    }
  }

  // ---------- Banner ----------

  var banner = null;

  function mostrarBanner() {
    if (banner) return;
    banner = document.createElement('div');
    banner.id = 'ai-cookie-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Aviso de cookies');
    banner.innerHTML =
      '<div class="aic-banner__in">' +
        '<p class="aic-banner__txt">Usamos cookies propias y de terceros para analizar el uso de la web y medir nuestras campañas, solo si nos das tu permiso. ' +
          '<a href="' + URL_POLITICA + '">Más información</a>.</p>' +
        '<div class="aic-banner__btns">' +
          '<button type="button" class="aic-btn aic-btn--line" data-aic="config">Configurar</button>' +
          '<button type="button" class="aic-btn aic-btn--line" data-aic="rechazar">Rechazar</button>' +
          '<button type="button" class="aic-btn aic-btn--main" data-aic="aceptar">Aceptar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);
    banner.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-aic]');
      if (!b) return;
      var accion = b.getAttribute('data-aic');
      if (accion === 'aceptar') decidir(estadoTodo(true));
      else if (accion === 'rechazar') decidir(estadoTodo(false));
      else abrirPreferencias();
    });
    requestAnimationFrame(function () { banner.classList.add('is-visible'); });
  }

  function ocultarBanner() {
    if (!banner) return;
    var b = banner;
    banner = null;
    b.classList.remove('is-visible');
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 300);
  }

  // ---------- Modal de configuración ----------

  var modal = null;
  var focoPrevio = null;

  function abrirPreferencias() {
    cerrarModal(true);
    var guardado = leer();
    var actual = guardado ? guardado.c : estadoTodo(false);

    var filas = Object.keys(CATEGORIAS).map(function (k) {
      var cat = CATEGORIAS[k];
      var on = cat.fija || actual[k];
      return '<div class="aic-cat">' +
          '<label class="aic-cat__head" for="aic-' + k + '">' +
            '<span class="aic-cat__tit">' + cat.titulo + (cat.fija ? ' <small>siempre activas</small>' : '') + '</span>' +
            '<span class="aic-switch"><input type="checkbox" id="aic-' + k + '" data-cat="' + k + '"' +
              (on ? ' checked' : '') + (cat.fija ? ' disabled' : '') + '><span class="aic-switch__ui" aria-hidden="true"></span></span>' +
          '</label>' +
          '<p class="aic-cat__txt">' + cat.texto + '</p>' +
        '</div>';
    }).join('');

    modal = document.createElement('div');
    modal.id = 'ai-cookie-modal';
    modal.innerHTML =
      '<div class="aic-modal__fondo" data-aic="cerrar"></div>' +
      '<div class="aic-modal__caja" role="dialog" aria-modal="true" aria-labelledby="aic-titulo">' +
        '<button type="button" class="aic-modal__x" data-aic="cerrar" aria-label="Cerrar">&times;</button>' +
        '<p class="aic-modal__tit" id="aic-titulo">Preferencias de cookies</p>' +
        '<p class="aic-modal__intro">Las necesarias siempre están activas. Las demás solo se usan con tu permiso, y la elección se puede cambiar cuando haga falta desde «Configurar cookies», al pie de cada página. ' +
          '<a href="' + URL_POLITICA + '">Política de cookies</a>.</p>' +
        filas +
        '<div class="aic-modal__btns">' +
          '<button type="button" class="aic-btn aic-btn--line" data-aic="rechazar">Rechazar todas</button>' +
          '<button type="button" class="aic-btn aic-btn--line" data-aic="guardar">Guardar selección</button>' +
          '<button type="button" class="aic-btn aic-btn--main" data-aic="aceptar">Aceptar todas</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    document.documentElement.classList.add('aic-sin-scroll');

    modal.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-aic]');
      if (!b) return;
      var accion = b.getAttribute('data-aic');
      if (accion === 'cerrar') cerrarModal();
      else if (accion === 'aceptar') decidir(estadoTodo(true));
      else if (accion === 'rechazar') decidir(estadoTodo(false));
      else if (accion === 'guardar') {
        var e = estadoTodo(false);
        Array.prototype.forEach.call(modal.querySelectorAll('input[data-cat]'), function (i) {
          e[i.getAttribute('data-cat')] = CATEGORIAS[i.getAttribute('data-cat')].fija ? true : i.checked;
        });
        decidir(e);
      }
    });
    document.addEventListener('keydown', teclaEsc);
    focoPrevio = document.activeElement;
    requestAnimationFrame(function () {
      modal.classList.add('is-visible');
      var primero = modal.querySelector('input:not([disabled])');
      if (primero) primero.focus();
    });
  }

  function teclaEsc(ev) { if (ev.key === 'Escape') cerrarModal(); }

  function cerrarModal(inmediato) {
    if (!modal) return;
    var m = modal;
    modal = null;
    document.removeEventListener('keydown', teclaEsc);
    document.documentElement.classList.remove('aic-sin-scroll');
    m.classList.remove('is-visible');
    setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, inmediato ? 0 : 250);
    if (focoPrevio && focoPrevio.focus) focoPrevio.focus();
    // Si cerró sin decidir y todavía no hay elección, el banner sigue a la vista
    if (!leer()) mostrarBanner();
  }

  // ---------- Inicio ----------

  function init() {
    var guardado = leer();
    if (guardado) aplicar(guardado.c);
    else mostrarBanner();

    document.addEventListener('click', function (ev) {
      var a = ev.target.closest('[data-cookie-settings], a[href$="#configurar-cookies"]');
      if (!a) return;
      ev.preventDefault();
      abrirPreferencias();
    });
    if (window.location.hash === '#configurar-cookies') abrirPreferencias();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.CookieConsent = {
    openPreferences: abrirPreferencias,
    acceptAll: function () { decidir(estadoTodo(true)); },
    rejectAll: function () { decidir(estadoTodo(false)); },
    getConsent: function () { var c = leer(); return c ? c.c : null; }
  };
})(window, document);
