/**
 * Amo Invitar! · Sobre lacrado de entrada
 * Al tocar el lacre (o cualquier parte del sobre): se abre la solapa de arriba con
 * el lacre, después las otras tres, el sobre se desvanece, aparece la invitación y
 * empieza la música (#audio).
 * El toque es el gesto que piden los navegadores para poder reproducir audio.
 * Si la página tiene el modal viejo de música (#audioModal), se quita.
 * v1.1: "Tocar para abrir" aparece con la tipografía lista (no espera a toda la
 * página) y los videos de fondo marcados con data-sobre-src cargan después.
 */
(function () {
  'use strict';
  var sobre = document.getElementById('sobre');
  if (!sobre) return;

  var modalViejo = document.getElementById('audioModal');
  if (modalViejo && modalViejo.parentNode) modalViejo.parentNode.removeChild(modalViejo);

  var lacre = sobre.querySelector('.sobre__lacre');
  var abierto = false;

  // "Tocar para abrir" aparece apenas está la tipografía del sobre (o a los 1,5 s).
  // No espera al resto de la página (video, mapas, fotos), que sigue cargando atrás.
  // El video de fondo (Vimeo) se pide recién cuando el sobre está listo,
  // así no le quita conexión a la tipografía y al sobre.
  function cargarVideos() {
    var v = document.querySelectorAll('iframe[data-sobre-src]');
    for (var i = 0; i < v.length; i++) {
      v[i].src = v[i].getAttribute('data-sobre-src');
      v[i].removeAttribute('data-sobre-src');
    }
  }
  function listo() {
    if (sobre.classList.contains('is-listo')) return;
    sobre.classList.add('is-listo');
    cargarVideos();
  }
  setTimeout(listo, 1500);
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('italic 600 16px "Sobre Bodoni"'),
      document.fonts.load('500 16px "Sobre Bodoni"')
    ]).then(listo, listo);
  } else listo();

  function abrir(ev) {
    if (abierto) return;
    abierto = true;
    if (ev) ev.preventDefault();

    // Música: tiene que arrancar dentro del mismo toque
    var audio = document.getElementById('audio');
    if (audio) { var p = audio.play(); if (p && p.catch) p.catch(function () {}); }

    sobre.classList.add('is-abriendo');
    cargarVideos();

    var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(function () {
      if (sobre.parentNode) sobre.parentNode.removeChild(sobre);
      // Las animaciones de la portada (AOS) se recalculan con la página ya visible
      if (window.AOS && window.AOS.refreshHard) window.AOS.refreshHard();
    }, reducido ? 600 : 2400);
  }

  // ---------- Invitaciones con PIN (lista-de-invitados-universal) ----------
  // Si la invitación pide PIN (requierePin / requierePinBasico) o es solo para
  // invitados, la pantalla de bloqueo (#gate-overlay) va primero: el sobre se
  // oculta mientras está visible y recién se puede abrir cuando se valida el PIN.
  var cfg = window.INVITACION_CONFIG || {};
  function si(v) { return v === true || v === 'true'; }
  var conGate = si(cfg.requierePin) || si(cfg.requierePinBasico) || si(cfg.soloInvitados);
  var esperando = false;

  function gateVisible() {
    var g = document.getElementById('gate-overlay');
    if (!g) return false;
    return getComputedStyle(g).display !== 'none' && g.style.opacity !== '0';
  }
  function habilitar() {
    if (!esperando) return;
    esperando = false;
    sobre.style.display = '';
    sobre.classList.remove('is-esperando');
  }
  function revisarGate() {
    if (!esperando) return;
    if (gateVisible()) sobre.style.display = 'none';
    else if (sobre.style.display === 'none') habilitar();   // se validó el PIN
  }

  if (conGate) {
    esperando = true;
    sobre.classList.add('is-esperando');
    var g = document.getElementById('gate-overlay');
    if (g && window.MutationObserver) new MutationObserver(revisarGate).observe(g, { attributes: true, attributeFilter: ['style', 'class'] });
    ['invitado-ready', 'invitado-libre'].forEach(function (n) {
      window.addEventListener(n, function () { setTimeout(function () { if (!gateVisible()) habilitar(); }, 550); });
    });
    window.addEventListener('invitado-bloqueado', function () {
      esperando = true;
      if (sobre.parentNode) sobre.parentNode.removeChild(sobre);
    });
    // Sin PIN que pedir (PIN ya validado, invitado sin PIN o link sin ?inv),
    // el script de la lista no muestra el bloqueo: se habilita al terminar.
    var tieneInv = /[?&](inv|id)=/.test(window.location.search);
    var limite = (si(cfg.requierePin) && tieneInv && !si(cfg.requierePinBasico)) ? 8000 : 600;
    var inicio = Date.now();
    (function vigilar() {
      if (!esperando || !sobre.parentNode) return;
      revisarGate();
      if (sobre.style.display !== 'none' && Date.now() - inicio > limite) { habilitar(); return; }
      setTimeout(vigilar, 150);
    })();
  }

  sobre.addEventListener('click', function (ev) { if (!esperando) abrir(ev); });
  sobre.addEventListener('keydown', function (ev) {
    if (!esperando && (ev.key === 'Enter' || ev.key === ' ')) abrir(ev);
  });
})();
