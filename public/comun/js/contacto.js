/* README (ronda 31) · Formulario de contacto de la web nueva (el mismo en todas las páginas).
   Manda a POST /api/contacto (src/rutas/contacto.js) y muestra el resultado dentro del formulario, sin recargar.

   Ejemplo (los nombres de los campos son los que espera el servidor):

   <form data-contacto data-turnstile="CLAVE_PUBLICA_DE_TURNSTILE">
     <input name="nombre" required placeholder="Nombre">
     <input name="email" type="email" required placeholder="Mail">
     <input name="telefono" placeholder="WhatsApp (opcional)">
     <select name="evento"><option>Boda</option><option>15 años</option>…</select>
     <input name="pais" placeholder="País">
     <textarea name="mensaje" required placeholder="¿En qué te ayudamos?"></textarea>
     <label><input type="checkbox" name="privacidad" value="si" required> Acepto la <a href="/info/politica-de-privacidad">política de privacidad</a></label>
     <button type="submit">Enviar</button>
     <p data-contacto-estado></p>
   </form>
   <script src="/comun/js/contacto.js" defer></script>

   Sin data-turnstile no se muestra el desafío (el servidor lo exige solo si TURNSTILE_SECRET está configurado).
   El campo trampa "sitio_web" y la hora de apertura ("desde") los agrega este script. */
(function () {
  'use strict';
  var forms = document.querySelectorAll('form[data-contacto]');
  if (!forms.length) return;
  var conTurnstile = [].some.call(forms, function (f) { return f.getAttribute('data-turnstile'); });
  if (conTurnstile && !window.turnstile) {
    var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; s.async = true; s.defer = true; document.head.appendChild(s);
  }
  forms.forEach(function (f) {
    var abierto = Date.now();
    // Campo trampa: invisible para las personas, los robots lo completan
    var t = document.createElement('input'); t.type = 'text'; t.name = 'sitio_web'; t.tabIndex = -1; t.autocomplete = 'off';
    t.setAttribute('aria-hidden', 'true'); t.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
    f.appendChild(t);
    var clave = f.getAttribute('data-turnstile');
    if (clave) { var d = document.createElement('div'); d.className = 'cf-turnstile'; d.setAttribute('data-sitekey', clave); var b0 = f.querySelector('[type=submit]'); f.insertBefore(d, b0 || null); }
    var estado = f.querySelector('[data-contacto-estado]') || f.appendChild(document.createElement('p'));
    estado.setAttribute('role', 'status');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var datos = {}; new FormData(f).forEach(function (v, k) { datos[k] = v; });
      datos.desde = abierto; datos.pagina = location.href; datos.privacidad = !!f.querySelector('[name=privacidad]:checked') || datos.privacidad === 'si';
      var b = f.querySelector('[type=submit]'); var texto = b && b.textContent;
      if (b) { b.disabled = true; b.textContent = 'Enviando…'; }
      estado.className = 'contacto-estado'; estado.textContent = '';
      fetch('/api/contacto', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(datos) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'No se pudo enviar'); return j; }); })
        .then(function () { f.reset(); estado.className = 'contacto-estado ok'; estado.textContent = '¡Gracias! Recibimos tu mensaje y te responderemos pronto.'; })
        .catch(function (x) { estado.className = 'contacto-estado error'; estado.textContent = x.message; })
        .then(function () { if (b) { b.disabled = false; b.textContent = texto; } if (window.turnstile && clave) try { window.turnstile.reset(); } catch (er) { /* sin desafío */ } });
    });
  });
})();
