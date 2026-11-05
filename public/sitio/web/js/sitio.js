/* Amo Invitar! · web nueva. Sin librerías. Menú, moneda y precios, preguntas, opiniones, funciones y detalles.
   El catálogo (precios, país y moneda del visitante) sale de /api/tienda/catalogo (la misma app). */
(function () {
  'use strict';
  var d = document, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || d).querySelectorAll(s)); };
  d.documentElement.classList.remove('sin-js');

  /* ---------- Menú del celular ---------- */
  var cajon = $('#cajon'), abrir = $('[data-abrir-menu]');
  function menu(v) { if (!cajon) return; cajon.classList.toggle('abierto', v); d.body.classList.toggle('cajon-abierto', v); if (abrir) abrir.setAttribute('aria-expanded', v); }
  if (abrir) abrir.addEventListener('click', function () { menu(true); });
  $$('[data-cerrar-menu]').forEach(function (b) { b.addEventListener('click', function () { menu(false); }); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') { menu(false); cerrarMoneda(); } });

  /* ---------- Revelado suave ---------- */
  var revs = $$('.rev');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    revs.forEach(function (r) { io.observe(r); });
  } else revs.forEach(function (r) { r.classList.add('vis'); });

  /* ---------- Preguntas frecuentes: de 5 en 5 ---------- */
  $$('[data-faq]').forEach(function (faq) {
    var items = $$('details', faq), vistas = 5, mas = $('.faq-mas', faq.parentNode);
    function pinta() { items.forEach(function (it, i) { it.classList.toggle('apagada', i >= vistas); }); if (mas) mas.hidden = vistas >= items.length; }
    if (mas) mas.addEventListener('click', function () { vistas += 5; pinta(); var n = items[vistas - 5]; if (n) { var s = $('summary', n); if (s) s.focus({ preventScroll: true }); } });
    // Si llegan por un link a una pregunta escondida, se muestra
    if (location.hash) { var t = items.map(function (x) { return x.id; }).indexOf(location.hash.slice(1)); if (t >= vistas) vistas = t + 1; }
    pinta();
  });

  /* ---------- Opiniones: dos filas que se desplazan en bucle ---------- */
  if (!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    $$('.op-fila').forEach(function (fila) {
      var set = $('.op-set', fila), pista = $('.op-pista', fila);
      if (!set) return;
      var copia = set.cloneNode(true); copia.setAttribute('aria-hidden', 'true'); pista.appendChild(copia);
      fila.style.setProperty('--dur', Math.max(60, Math.round(set.scrollWidth / 40)) + 's');
      fila.classList.add('bucle');
    });
  }

  /* ---------- Funciones: filtros ---------- */
  var filtros = $('.filtros');
  if (filtros) filtros.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    $$('button', filtros).forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
    var g = b.getAttribute('data-g');
    $$('.funcion').forEach(function (f) { f.hidden = g !== 'todas' && f.getAttribute('data-g') !== g; });
  });

  /* ---------- Celular de la portada: la invitación real, escalada al marco ---------- */
  function escalar() {
    $$('.esc-cel iframe').forEach(function (f) { var w = f.parentNode.clientWidth; if (w) { f.style.transform = 'scale(' + (w / 390) + ')'; } });
  }
  $$('.esc-cel iframe').forEach(function (f) { f.addEventListener('load', function () { f.parentNode.classList.add('cargado'); }); });
  addEventListener('resize', escalar); escalar();

  /* ---------- Contacto: evento elegido desde el link (?evento=Boda) ---------- */
  var qe = new URLSearchParams(location.search).get('evento');
  if (qe) $$('select[name=evento]').forEach(function (sel) { [].some.call(sel.options, function (o) { if (o.text.toLowerCase() === qe.toLowerCase()) { sel.value = o.value; return true; } return false; }); });

  /* ---------- Profesionales: el botón del nivel elige la opción del formulario ---------- */
  $$('[data-nivel]').forEach(function (b) { b.addEventListener('click', function () { var s = $('#nivel-form'); if (s) [].some.call(s.options, function (o) { if (o.text.indexOf(b.getAttribute('data-nivel')) >= 0) { s.value = o.value; return true; } return false; }); }); });

  /* ---------- Barra "Crear invitación" en el celular ---------- */
  var barra = $('.barra-movil'), portada = $('.portada');
  if (barra && portada && 'IntersectionObserver' in window) {
    var fin = $$('#planes, #contacto, .pie'), vistos = new Map(), po = true;
    var o2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.target === portada) po = e.isIntersecting; else vistos.set(e.target, e.isIntersecting); });
      var bloqueada = fin.some(function (x) { return vistos.get(x); });
      barra.classList.toggle('on', !po && !bloqueada);
    });
    o2.observe(portada); fin.forEach(function (x) { o2.observe(x); });
  }

  /* ---------- País, moneda, precios y medios de pago ---------- */
  var PAISES = { AR: 'Argentina', BO: 'Bolivia', BR: 'Brasil', CL: 'Chile', CO: 'Colombia', CR: 'Costa Rica', CU: 'Cuba', DO: 'República Dominicana', EC: 'Ecuador', SV: 'El Salvador', ES: 'España', US: 'Estados Unidos', GT: 'Guatemala', HN: 'Honduras', MX: 'México', NI: 'Nicaragua', PA: 'Panamá', PY: 'Paraguay', PE: 'Perú', PR: 'Puerto Rico', UY: 'Uruguay', VE: 'Venezuela' };
  var ZONA_EURO = ['ES', 'PT', 'FR', 'DE', 'IT', 'AT', 'BE', 'NL', 'IE', 'LU', 'FI', 'GR', 'SK', 'SI', 'EE', 'LV', 'LT', 'MT', 'CY', 'HR', 'AD', 'MC', 'SM', 'VA'];
  var CON_TRANSFER = ['AR', 'UY'].concat(ZONA_EURO);
  var NOMBRE_MONEDA = { ARS: 'pesos argentinos', USD: 'dólares', EUR: 'euros', MXN: 'pesos mexicanos', COP: 'pesos colombianos', CLP: 'pesos chilenos', PEN: 'soles', UYU: 'pesos uruguayos', PYG: 'guaraníes', BOB: 'bolivianos', CRC: 'colones', GBP: 'libras esterlinas', BRL: 'reales' };
  var $mon = $('[data-moneda]');

  function getCookie(n) { var m = d.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; }
  function setMoneda(c) { d.cookie = 'cur=' + c + '; Path=/; Max-Age=31536000; SameSite=Lax'; }
  function nombreMoneda(c) {
    if (NOMBRE_MONEDA[c]) return NOMBRE_MONEDA[c];
    try { var p = new Intl.NumberFormat('es', { style: 'currency', currency: c, currencyDisplay: 'name' }).formatToParts(2).filter(function (x) { return x.type === 'currency'; }); if (p[0]) return p[0].value; } catch (e) { /* sin nombre */ }
    return c;
  }
  function cerrarMoneda() { if ($mon) { $mon.classList.remove('abierta'); var b = $('.moneda-boton', $mon); if (b) b.setAttribute('aria-expanded', 'false'); } }

  var ICO = function (id) { return '<svg class="icono" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; };
  var LOGOS = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', applepay: 'Apple Pay', googlepay: 'Google Pay', paypal: 'PayPal', bizum: 'Bizum', 'mercadopago-icon': 'Mercado Pago' };
  function logo(id) { return '<img src="/web/img/pay/' + id + '.svg" alt="' + LOGOS[id] + '" title="' + LOGOS[id] + '" width="40" height="26">'; }
  function medios(pais, moneda) {
    var ar = pais === 'AR' || moneda === 'ARS', n = [], l = [];
    if (ar) { n.push('Mercado Pago', 'tarjeta de crédito o débito'); l.push('mercadopago-icon', 'visa', 'mastercard', 'amex'); }
    else {
      n.push('tarjeta de crédito o débito'); l.push('visa', 'mastercard', 'amex');
      if (pais === 'ES' && moneda === 'EUR') { n.push('Bizum'); l.push('bizum'); }
      n.push('Apple Pay', 'Google Pay', 'PayPal'); l.push('applepay', 'googlepay', 'paypal');
    }
    var extra = '';
    if (CON_TRANSFER.indexOf(pais) >= 0 || ar) { n.push('transferencia bancaria'); extra = '<span class="pi">' + ICO('banco') + 'Transferencia</span>'; }
    return { nombres: n, logos: l, extra: extra };
  }
  function lista(a) { return a.length > 1 ? a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1] : a.join(''); }

  function pintaPrecios(c) {
    var ar = c.pais === 'AR' || c.moneda === 'ARS', m = medios(c.pais, c.moneda), nombre = PAISES[c.pais];
    // País en el título de la portada
    $$('[data-pais]').forEach(function (e) { if (nombre) e.textContent = (e.getAttribute('data-pais') || 'en') + ' ' + nombre; });
    // Precios
    (c.paquetes || []).forEach(function (p) {
      $$('[data-precio="' + p.id + '"]').forEach(function (e) { e.textContent = p.precio.texto; });
    });
    if (c.aMedida) $$('[data-precio="medida"]').forEach(function (e) { e.textContent = c.aMedida.texto; });
    // Texto de abajo, con la lógica de Albunear: moneda y medios del país
    $$('[data-nota-precios]').forEach(function (e) {
      e.innerHTML = ar
        ? 'Precios en <strong>pesos argentinos</strong>. Podés pagar con ' + lista(m.nombres) + '. Podés cambiar la moneda en el menú. No esperes más, diseñá tu invitación hoy mismo sin pagar nada. <br><small>(*) Solo disponible en algunos modelos.</small>'
        : 'Precios en <strong>' + nombreMoneda(c.moneda) + '</strong>. Puedes cambiar la moneda en el menú. Puedes pagar con ' + lista(m.nombres) + '. No esperes más, diseña tu invitación hoy mismo sin pagar nada. <br><small>(*) Solo disponible en algunos modelos.</small>';
    });
    $$('[data-pago-iconos]').forEach(function (e) { e.innerHTML = m.logos.map(logo).join('') + m.extra; });
    $$('[data-iva]').forEach(function (e) { e.textContent = c.moneda === 'EUR' ? 'IVA incluido' : 'pago único'; });
    var bd = $('[data-bandera]');
    if (bd && c.pais && /^[A-Z]{2}$/.test(c.pais)) { bd.src = '/web/img/flags/' + c.pais.toLowerCase() + '.svg'; bd.onerror = function () { bd.onerror = null; bd.src = '/web/img/flags/es.svg'; }; }
    // Selector de moneda
    if ($mon && c.monedas) {
      var b = $('.moneda-boton span', $mon); if (b) b.textContent = c.moneda;
      var ul = $('.moneda-lista', $mon);
      ul.innerHTML = c.monedas.map(function (x) { return '<button type="button" role="menuitemradio" aria-checked="' + (x === c.moneda) + '" data-m="' + x + '"><span>' + nombreMoneda(x).replace(/^./, function (z) { return z.toUpperCase(); }) + '</span><small>' + x + '</small></button>'; }).join('');
    }
  }
  var catalogo = null;
  function cargaCatalogo(moneda) {
    fetch('/api/tienda/catalogo' + (moneda ? '?moneda=' + moneda : '')).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (c) { catalogo = c; pintaPrecios(c); }).catch(function () {
      // Sin catálogo: los precios quedan como "Ver en la tienda" y el texto usa lo general
      $$('[data-precio]').forEach(function (e) { if (!e.textContent.trim()) e.textContent = '—'; });
    });
  }
  if ($mon) {
    var bm = $('.moneda-boton', $mon);
    bm.addEventListener('click', function (e) { e.stopPropagation(); var v = !$mon.classList.contains('abierta'); $mon.classList.toggle('abierta', v); bm.setAttribute('aria-expanded', v); });
    $mon.addEventListener('click', function (e) { var x = e.target.closest('[data-m]'); if (!x) return; setMoneda(x.getAttribute('data-m')); cerrarMoneda(); cargaCatalogo(x.getAttribute('data-m')); });
    d.addEventListener('click', function (e) { if (!$mon.contains(e.target)) cerrarMoneda(); });
  }
  if ($mon || $('[data-precio],[data-pais]')) cargaCatalogo(getCookie('cur') || '');
})();
