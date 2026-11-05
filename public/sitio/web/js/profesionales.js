/* README (ronda 33) · Formulario de solicitud de cuenta profesional (/profesionales). Manda a POST /api/profesionales/solicitud.
   Las cuentas se aprueban a mano desde /admin. */
(function () {
  'use strict';
  var f = document.getElementById('form-pro');
  if (!f) return;
  var abierto = Date.now();
  var t = document.createElement('input'); t.type = 'text'; t.name = 'sitio_web'; t.tabIndex = -1; t.autocomplete = 'off'; t.setAttribute('aria-hidden', 'true');
  t.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0'; f.appendChild(t);
  var estado = f.querySelector('[data-contacto-estado]');
  // Los botones de cada nivel eligen la opción del formulario
  document.querySelectorAll('[data-nivel]').forEach(function (b) {
    b.addEventListener('click', function () { var s = f.elements.nivel; if (s && /^(pro|studio)$/i.test(b.getAttribute('data-nivel'))) s.value = b.getAttribute('data-nivel').toLowerCase(); });
  });
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = {}; new FormData(f).forEach(function (v, k) { d[k] = v; });
    d.desde = abierto; d.privacidad = !!f.querySelector('[name=privacidad]:checked');
    var b = f.querySelector('[type=submit]'), txt = b.textContent; b.disabled = true; b.textContent = 'Enviando…'; estado.className = 'contacto-estado'; estado.textContent = '';
    fetch('/api/profesionales/solicitud', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'No se pudo enviar'); return j; }); })
      .then(function (j) { f.reset(); estado.className = 'contacto-estado ok'; estado.textContent = j.repetida ? 'Ya teníamos tu solicitud: la estamos revisando. ¡Gracias!' : '¡Gracias! Recibimos tu solicitud. La revisamos y te respondemos por email.'; })
      .catch(function (x) { estado.className = 'contacto-estado error'; estado.textContent = x.message; })
      .then(function () { b.disabled = false; b.textContent = txt; });
  });
})();
