/* Slideshow de portada (común a todos los modelos). Sin jQuery ni Bootstrap.
   <div class="ai-slides" data-intervalo="5000"> <div class="ai-slide" style="background-image:…"></div> … </div>
   · Una sola foto: queda fija, sin animación.
   · Cada foto se funde sobre la anterior con un acercamiento suave.
   · Se pausa cuando la pestaña no se ve (no gasta batería ni datos). */
(function () {
  document.querySelectorAll('.ai-slides').forEach(function (caja) {
    var fotos = Array.prototype.slice.call(caja.children).filter(function (x) { return x.classList.contains('ai-slide'); });
    if (!fotos.length) return;
    var intervalo = parseInt(caja.getAttribute('data-intervalo'), 10) || 5000;
    caja.style.setProperty('--ai-duracion', (intervalo + 2000) + 'ms');
    var i = 0, timer = null;
    fotos[0].classList.add('activa');
    caja.classList.add('listo');
    if (fotos.length < 2) return;
    function siguiente() {
      var antes = fotos[i];
      i = (i + 1) % fotos.length;
      fotos.forEach(function (f) { f.classList.remove('saliendo'); });
      antes.classList.remove('activa'); antes.classList.add('saliendo');
      // Reinicia el acercamiento de la que entra
      var nueva = fotos[i]; nueva.style.animation = 'none'; void nueva.offsetWidth; nueva.style.animation = '';
      nueva.classList.add('activa');
    }
    function arrancar() { if (!timer) timer = setInterval(siguiente, intervalo); }
    function parar() { clearInterval(timer); timer = null; }
    document.addEventListener('visibilitychange', function () { document.hidden ? parar() : arrancar(); });
    arrancar();
  });
})();
