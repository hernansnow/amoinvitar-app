/* Amo Invitar · Video de portada (modelos con foto a pantalla completa)
 * El video del cliente va en el mismo lugar que la foto de fondo de la portada ([data-video-portada]),
 * detrás del contenido del diseño. Mientras carga se ve la foto (poster). */
(function () {
  var c = window.INV && window.INV.videoPortada;
  var caja = document.querySelector('[data-video-portada]');
  if (!c || !caja || caja.querySelector('video')) return;
  if (getComputedStyle(caja).position === 'static') caja.style.position = 'relative';
  caja.style.isolation = 'isolate';
  caja.style.overflow = 'hidden';
  var v = document.createElement('video');
  v.className = 'ai-video-portada ai-video-fondo';
  v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
  v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('preload', 'auto');
  if (c.poster) v.poster = c.poster;
  v.src = c.url;
  caja.insertBefore(v, caja.firstChild);
  var p = v.play(); if (p && p.catch) p.catch(function () {});
})();
