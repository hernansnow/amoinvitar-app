/**
 * Amo Invitar! · Ventana de bienvenida (sobre apagado)
 * Se muestra al entrar; "Ingresar con música" arranca #audio dentro del toque
 * (el gesto que piden los navegadores) y cierra. Reemplaza al modal viejo de
 * Bootstrap (#audioModal), que se quita si quedó en el HTML.
 */
(function () {
  'use strict';
  var bv = document.getElementById('ai-bienvenida');
  if (!bv) return;
  var viejo = document.getElementById('audioModal');
  if (viejo && viejo.parentNode) viejo.parentNode.removeChild(viejo);
  var html = document.documentElement;
  var cerrado = false;

  function cargarVideos() {
    var v = document.querySelectorAll('iframe[data-sobre-src]');
    for (var i = 0; i < v.length; i++) { v[i].src = v[i].getAttribute('data-sobre-src'); v[i].removeAttribute('data-sobre-src'); }
  }
  function mostrar() {
    if (bv.classList.contains('is-visible')) return;
    bv.classList.add('is-visible');
    var b = bv.querySelector('button');
    if (b) try { b.focus({ preventScroll: true }); } catch (e) {}
  }
  function cerrar(conMusica) {
    if (cerrado) return;
    cerrado = true;
    if (conMusica) {
      var audio = document.getElementById('audio');
      if (audio) { var p = audio.play(); if (p && p.catch) p.catch(function () {}); }
    }
    cargarVideos();
    bv.classList.add('is-saliendo');
    html.classList.remove('ai-bv-abierta');
    setTimeout(function () { if (bv.parentNode) bv.parentNode.removeChild(bv); }, 480);
    try { window.dispatchEvent(new Event('ai-bienvenida-cerrada')); } catch (e) {}
  }

  bv.hidden = false;
  html.classList.add('ai-bv-abierta');
  bv.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-bv]');
    if (!b) return;
    ev.preventDefault();
    cerrar(b.getAttribute('data-bv') === 'musica');
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') cerrar(false); });

  // Aparece cuando cargan sus adornos (o a los 1,2 s, lo que pase primero)
  var imgs = bv.querySelectorAll('img');
  var faltan = imgs.length;
  function una() { if (--faltan <= 0) requestAnimationFrame(mostrar); }
  if (!faltan) requestAnimationFrame(mostrar);
  for (var i = 0; i < imgs.length; i++) {
    if (imgs[i].complete) una();
    else { imgs[i].addEventListener('load', una); imgs[i].addEventListener('error', una); }
  }
  setTimeout(mostrar, 1200);
})();
