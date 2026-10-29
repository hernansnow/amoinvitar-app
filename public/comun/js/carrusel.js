// Carrusel de la galería (común a todos los modelos): se desliza con el dedo o con
// las flechas, avanza solo y al tocar una foto se abre entera (fancybox, con zoom).
(function () {
  document.querySelectorAll('.ai-carrusel').forEach(function (c) {
    var pista = c.querySelector('.ai-c-pista');
    var items = [].slice.call(pista.children);
    var puntos = [].slice.call(c.querySelectorAll('.ai-c-puntos button'));
    if (items.length < 2) return;
    var actual = 0, quieto = null;
    function centro(i) { var it = items[i]; return it.offsetLeft - (pista.clientWidth - it.clientWidth) / 2; }
    function ir(i, suave) {
      actual = (i + items.length) % items.length;
      pista.scrollTo({ left: centro(actual), behavior: suave === false ? 'auto' : 'smooth' });
    }
    function marcar() {
      var medio = pista.scrollLeft + pista.clientWidth / 2, mejor = 0, dist = Infinity;
      items.forEach(function (it, i) { var d = Math.abs(it.offsetLeft + it.clientWidth / 2 - medio); if (d < dist) { dist = d; mejor = i; } });
      actual = mejor;
      items.forEach(function (it, i) { it.classList.toggle('actual', i === mejor); });
      puntos.forEach(function (p, i) { if (i === mejor) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current'); });
    }
    var t = null;
    pista.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(marcar, 60); }, { passive: true });
    c.querySelector('.ai-c-ant').addEventListener('click', function () { pausar(); ir(actual - 1); });
    c.querySelector('.ai-c-sig').addEventListener('click', function () { pausar(); ir(actual + 1); });
    puntos.forEach(function (p, i) { p.addEventListener('click', function () { pausar(); ir(i); }); });
    // Avanza solo cada 4 s; se frena un rato si el invitado lo toca
    var auto = setInterval(function () { if (!quieto && !document.hidden) ir(actual + 1); }, 4000);
    function pausar() { clearTimeout(quieto); quieto = setTimeout(function () { quieto = null; }, 12000); }
    pista.addEventListener('pointerdown', pausar);
    pista.addEventListener('touchstart', pausar, { passive: true });
    addEventListener('resize', function () { ir(actual, false); });
    // Con 3 o más fotos arranca en la segunda, así hay vecinas de los dos lados
    if (items.length >= 3) ir(1, false);
    marcar();
    if (window.jQuery && jQuery.fancybox) jQuery('[data-fancybox="galeria"]').fancybox({ loop: true, buttons: ['zoom', 'slideShow', 'fullScreen', 'close'], clickContent: function (s) { return s.type === 'image' ? 'zoom' : false; } });
  });
})();
