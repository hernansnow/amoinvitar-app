/* Modal común de las invitaciones. Toma los botones de siempre:
   · data-fancybox data-src="#id"      (Fancybox)
   · data-toggle="modal" data-target="#id"  (Bootstrap)
   y abre ese contenido en un <dialog> propio (ver css/modal.css). La galería (fotos con href) sigue con su zoom. */
(function () {
  var dialogo = null, cuerpo = null, abierto = null;
  function armar() {
    if (dialogo) return;
    dialogo = document.createElement('dialog');
    dialogo.className = 'ai-modal';
    dialogo.innerHTML = '<div class="ai-modal-tarjeta"><button type="button" class="ai-modal-cerrar" aria-label="Cerrar">✕</button><div class="ai-modal-cuerpo"></div></div>';
    document.body.appendChild(dialogo);
    cuerpo = dialogo.querySelector('.ai-modal-cuerpo');
    dialogo.querySelector('.ai-modal-cerrar').addEventListener('click', cerrar);
    dialogo.addEventListener('click', function (e) { if (e.target === dialogo) cerrar(); });   // tocar afuera
    dialogo.addEventListener('cancel', function (e) { e.preventDefault(); cerrar(); });       // Escape
  }
  function abrir(selector) {
    var origen = document.querySelector(selector);
    if (!origen) return;
    armar();
    if (abierto) cerrar();
    var contenido = origen.classList.contains('modal') ? (origen.querySelector('.modal-content') || origen) : origen;
    var lugar = document.createComment('modal');
    contenido.parentNode.insertBefore(lugar, contenido);
    abierto = { contenido: contenido, lugar: lugar, display: contenido.style.display, id: selector };
    cuerpo.appendChild(contenido);
    contenido.style.display = 'block';
    // Iframes (mapa, álbum) que se cargan recién al abrir
    contenido.querySelectorAll('iframe[data-src]').forEach(function (f) { f.src = f.getAttribute('data-src'); f.removeAttribute('data-src'); });
    document.documentElement.classList.add('ai-modal-abierto');
    if (dialogo.showModal) dialogo.showModal(); else dialogo.setAttribute('open', '');
    dialogo.querySelector('.ai-modal-tarjeta').scrollTop = 0;
    window.dispatchEvent(new CustomEvent('ai-modal-abierto', { detail: { id: selector } }));
  }
  function cerrar() {
    if (!abierto) return;
    var a = abierto; abierto = null;
    if (dialogo.close) dialogo.close(); else dialogo.removeAttribute('open');
    a.contenido.style.display = a.display;
    a.lugar.parentNode.insertBefore(a.contenido, a.lugar); a.lugar.remove();
    document.documentElement.classList.remove('ai-modal-abierto');
    window.dispatchEvent(new CustomEvent('ai-modal-cerrado', { detail: { id: a.id } }));
  }
  window.aiModal = { abrir: abrir, cerrar: cerrar };
  // En la fase de captura: así Fancybox y Bootstrap no abren los suyos
  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var cerrarBtn = e.target.closest('.ai-modal [data-fancybox-close], .ai-modal [data-dismiss="modal"]');
    if (cerrarBtn) { e.preventDefault(); e.stopImmediatePropagation(); cerrar(); return; }
    var b = e.target.closest('[data-fancybox][data-src^="#"], [data-toggle="modal"][data-target^="#"]');
    if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation();
    abrir(b.getAttribute('data-src') || b.getAttribute('data-target'));
  }, true);
})();
