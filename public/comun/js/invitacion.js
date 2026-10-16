/* Amo Invitar 2.0 · lo que la invitación hace en el navegador.
   Los datos vienen en window.INV (los pone el motor). Abierto el modelo
   suelto en Dreamweaver no hay INV y no hace nada. */
(function () {
  var INV = window.INV;
  if (!INV) return;

  // Cuenta regresiva
  if (INV.cuenta && window.jQuery && jQuery.fn.countdown) {
    var tx = INV.textos;
    jQuery('#clock-b').countdown(INV.cuenta).on('update.countdown', function (e) {
      jQuery(this).html(e.strftime(
        '<div class="holder m-2"><span class="font-weight-lighter mb-2">%-D</span> ' + (e.offset.totalDays === 1 ? tx.dia : tx.dias) + '</div>' +
        '<div class="holder m-2"><span class="font-weight-lighter mb-2">%H</span> ' + tx.horas + '</div>' +
        '<div class="holder m-2"><span class="font-weight-lighter mb-2">%M</span> ' + tx.min + '</div>' +
        '<div class="holder m-2"><span class="font-weight-lighter mb-2">%S</span> ' + tx.seg + '</div>'));
    });
  }

  // Botones "Agendar"
  [].forEach.call(document.querySelectorAll('[data-agendar]'), function (b) {
    var cfg = INV.calendarios && INV.calendarios[b.getAttribute('data-agendar')];
    if (!cfg) { b.remove(); return; }
    b.addEventListener('click', function () { if (window.atcb_action) atcb_action(cfg, b); });
  });

  // Mapas: el iframe se carga recién al abrir el modal
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-fancybox][data-src^="#map"]');
    if (!b) return;
    var f = document.querySelector(b.getAttribute('data-src') + ' iframe[data-src]');
    if (f) { f.src = f.getAttribute('data-src'); f.removeAttribute('data-src'); }
  }, true);

  // Álbum de fotos: el modal va al final del body y el iframe se carga al abrir
  var qr = document.getElementById('qr');
  if (qr && qr.parentNode !== document.body) document.body.appendChild(qr);
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('[data-target="#qr"]')) return;
    var f = document.querySelector('#qr iframe[data-src]');
    if (f) { f.src = f.getAttribute('data-src'); f.removeAttribute('data-src'); }
  });

  // Música: arranca en el segundo que eligió el cliente
  var audio = document.getElementById('audio');
  var inicio = audio && parseFloat(audio.getAttribute('data-inicio'));
  if (inicio > 0) audio.addEventListener('loadedmetadata', function () { if (audio.currentTime < inicio) audio.currentTime = inicio; }, { once: true });
})();
