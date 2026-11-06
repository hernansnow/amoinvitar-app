/* Amo Invitar! · web nueva. Sin librerías. Menú, moneda y precios, preguntas, opiniones, funciones y detalles.
   El catálogo (precios, país y moneda del visitante) sale de /api/tienda/catalogo (la misma app). */
(function () {
  'use strict';
  var d = document, $ = function (s, r) { return (r || d).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || d).querySelectorAll(s)); };
  d.documentElement.classList.remove('sin-js');

  /* ---------- Tablas largas: se ven las primeras filas y el botón va sumando más (como las preguntas frecuentes) ---------- */
  $$('table[data-paso]').forEach(function (t) {
    var paso = +t.getAttribute('data-paso') || 8, filas = $$('tbody tr', t), vistas = paso;
    if (filas.length <= paso + 2) return;
    var caja = t.closest('.comparar-caja'), b = d.createElement('button');
    b.type = 'button'; b.className = 'btn btn-borde faq-mas'; caja.parentNode.insertBefore(b, caja.nextSibling);
    function pinta() {
      filas.forEach(function (f, i) { f.hidden = i >= vistas; });
      var quedan = filas.length - vistas;
      b.hidden = quedan <= 0; b.textContent = quedan > 0 ? 'Ver más funciones (' + quedan + ')' : '';
    }
    b.addEventListener('click', function () { vistas += paso; pinta(); });
    pinta();
  });

  /* ---------- Video en una ventana propia (sin salir a Vimeo) ---------- */
  var dv = null;
  function abreVideo(url) {
    if (!dv) {
      dv = d.createElement('dialog'); dv.className = 'dialogo-video'; dv.setAttribute('aria-label', 'Video');
      dv.innerHTML = '<div class="dv-caja"><div class="dv-marco"><button type="button" class="dv-x" aria-label="Cerrar">&times;</button><iframe allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video de Amo Invitar!"></iframe></div></div>';
      d.body.appendChild(dv);
      dv.addEventListener('click', function (e) { if (e.target === dv || e.target.classList.contains('dv-caja') || e.target.classList.contains('dv-x')) dv.close(); });
      dv.addEventListener('close', function () { dv.querySelector('iframe').src = 'about:blank'; });
    }
    dv.querySelector('iframe').src = url + (url.indexOf('?') > -1 ? '&' : '?') + 'autoplay=1';
    if (dv.showModal) dv.showModal(); else window.open(url, '_blank');
  }
  d.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-video]'); if (!a) return; e.preventDefault(); abreVideo(a.getAttribute('data-video')); });

  /* ---------- Slider de invitaciones a medida ---------- */
  $$('[data-slider]').forEach(function (s) {
    var im = $$('img', s), i = 0; if (im.length < 2) return; im[0].classList.add('on');
    setInterval(function () { im[i].classList.remove('on'); i = (i + 1) % im.length; im[i].classList.add('on'); }, 3800);
  });

  /* ---------- Portadas: la invitación real se escala al tamaño del dispositivo ---------- */
  var ifr = $$('.escena iframe[data-w]');
  function escala() { ifr.forEach(function (f) { var w = +f.getAttribute('data-w'), h = +f.getAttribute('data-h'), p = f.parentNode; var k = p.clientWidth / w; f.style.width = w + 'px'; f.style.height = h + 'px'; f.style.transform = 'scale(' + k + ')'; }); }
  if (ifr.length) { escala(); window.addEventListener('resize', escala); window.addEventListener('load', escala); }

  /* ---------- Encabezado: transparente arriba, blanco al bajar ---------- */
  var cab = $('.cab');
  function pintaCab() { if (cab) cab.classList.toggle('solida', window.scrollY > 30 || d.body.classList.contains('cajon-abierto') || d.documentElement.hasAttribute('data-cab-fija')); }
  addEventListener('scroll', pintaCab, { passive: true });

  /* ---------- Submenú «Invitaciones»: se abre con el puntero o el teclado y no se cierra al ir hacia la lista ---------- */
  var menuEv = $('.menu-ev');
  if (menuEv) {
    var btnEv = $('button', menuEv), tCierre = null;
    var abre = function (v) { clearTimeout(tCierre); menuEv.classList.toggle('abierto', v); btnEv.setAttribute('aria-expanded', v); };
    menuEv.addEventListener('mouseenter', function () { abre(true); });
    menuEv.addEventListener('mouseleave', function () { tCierre = setTimeout(function () { abre(false); }, 220); });
    btnEv.addEventListener('click', function (e) { e.stopPropagation(); abre(!menuEv.classList.contains('abierto')); });
    d.addEventListener('click', function (e) { if (!menuEv.contains(e.target)) abre(false); });
  }

  /* ---------- Menú del celular ---------- */
  var cajon = $('#cajon'), abrir = $('[data-abrir-menu]');
  function menu(v) { if (!cajon) return; cajon.classList.toggle('abierto', v); d.body.classList.toggle('cajon-abierto', v); if (abrir) abrir.setAttribute('aria-expanded', v); pintaCab(); }
  pintaCab();
  var plegar = $('[data-plegar]');
  if (plegar) plegar.addEventListener('click', function () { var v = plegar.getAttribute('aria-expanded') !== 'true'; plegar.setAttribute('aria-expanded', v); $('#cajon-ev').hidden = !v; });
  if (abrir) abrir.addEventListener('click', function () { menu(!cajon.classList.contains('abierto')); });
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
  /* El selector es de PAÍS: cada país trae su moneda y su variante de español (la moneda y el idioma van anclados al país).
     Por defecto se usa el país detectado; lo elegido se guarda en cookies (pais_sel, cur, idioma). Todavía no se traduce:
     la variante queda guardada para cuando estén definidos los textos. */
  var LISTA_PAISES = [['ES', 'España', 'EUR', 'es-es'], ['AR', 'Argentina', 'ARS', 'es-ar'], ['UY', 'Uruguay', 'UYU', 'es-ar'], ['MX', 'México', 'MXN', 'es-latam'], ['CO', 'Colombia', 'COP', 'es-latam'], ['CL', 'Chile', 'CLP', 'es-latam'], ['PE', 'Perú', 'PEN', 'es-latam'],
    ['EC', 'Ecuador', 'USD', 'es-latam'], ['BO', 'Bolivia', 'BOB', 'es-latam'], ['PY', 'Paraguay', 'PYG', 'es-latam'], ['VE', 'Venezuela', 'USD', 'es-latam'], ['CR', 'Costa Rica', 'CRC', 'es-latam'], ['PA', 'Panamá', 'USD', 'es-latam'], ['DO', 'República Dominicana', 'DOP', 'es-latam'],
    ['GT', 'Guatemala', 'GTQ', 'es-latam'], ['HN', 'Honduras', 'HNL', 'es-latam'], ['SV', 'El Salvador', 'USD', 'es-latam'], ['NI', 'Nicaragua', 'NIO', 'es-latam'], ['CU', 'Cuba', 'USD', 'es-latam'], ['PR', 'Puerto Rico', 'USD', 'es-latam'], ['US', 'Estados Unidos', 'USD', 'es-latam'],
    ['BR', 'Brasil', 'BRL', 'es-latam'], ['PT', 'Portugal', 'EUR', 'es-es'], ['FR', 'Francia', 'EUR', 'es-es'], ['DE', 'Alemania', 'EUR', 'es-es'], ['IT', 'Italia', 'EUR', 'es-es'], ['GB', 'Reino Unido', 'GBP', 'es-es'], ['IE', 'Irlanda', 'EUR', 'es-es'], ['NL', 'Países Bajos', 'EUR', 'es-es'],
    ['BE', 'Bélgica', 'EUR', 'es-es'], ['AT', 'Austria', 'EUR', 'es-es'], ['CH', 'Suiza', 'CHF', 'es-es'], ['AD', 'Andorra', 'EUR', 'es-es'], ['CA', 'Canadá', 'CAD', 'es-latam'], ['AU', 'Australia', 'AUD', 'es-latam'], ['NZ', 'Nueva Zelanda', 'NZD', 'es-latam']];
  function setPais(p) { var x = LISTA_PAISES.filter(function (y) { return y[0] === p; })[0]; if (!x) return null; ['pais_sel=' + x[0], 'cur=' + x[2], 'idioma=' + x[3]].forEach(function (c) { d.cookie = c + '; Path=/; Max-Age=31536000; SameSite=Lax'; }); return x; }
  function nombreMoneda(c) {
    if (NOMBRE_MONEDA[c]) return NOMBRE_MONEDA[c];
    try { var p = new Intl.NumberFormat('es', { style: 'currency', currency: c, currencyDisplay: 'name' }).formatToParts(2).filter(function (x) { return x.type === 'currency'; }); if (p[0]) return p[0].value; } catch (e) { /* sin nombre */ }
    return c;
  }
  function cerrarMoneda() { if ($mon) { $mon.classList.remove('abierta'); var b = $('.moneda-boton', $mon); if (b) b.setAttribute('aria-expanded', 'false'); } }

  var ICO = function (id) { return '<svg class="icono" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; };
  var LOGOS = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', applepay: 'Apple Pay', googlepay: 'Google Pay', paypal: 'PayPal', bizum: 'Bizum', 'mercadopago-icon': 'Mercado Pago' };
  function logo(id) { return '<img src="/web/img/pay/' + id + '.svg" alt="' + LOGOS[id] + '" title="' + LOGOS[id] + '" width="40" height="26">'; }
  // Medios de pago: los que informa la tienda para este país y esta moneda (/api/tienda/catalogo → medios)
  function medios(c) {
    var n = [], l = [], extra = '', ids = (c.medios || []).map(function (m) { return m.id; });
    if (ids.indexOf('mercadopago') >= 0) { n.push('Mercado Pago', 'tarjeta de crédito o débito'); l.push('mercadopago-icon', 'visa', 'mastercard', 'amex'); }
    if (ids.indexOf('stripe') >= 0) { n.push('tarjeta de crédito o débito', 'Apple Pay', 'Google Pay'); l.push('visa', 'mastercard', 'amex', 'applepay', 'googlepay'); }
    if (ids.indexOf('paypal') >= 0) { n.push('PayPal'); l.push('paypal'); }
    if (ids.indexOf('transfer') >= 0) { n.push('transferencia bancaria'); extra = '<span class="pi">' + ICO('banco') + 'Transferencia</span>'; }
    return { nombres: n, logos: l, extra: extra };
  }
  function lista(a) { return a.length > 1 ? a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1] : a.join(''); }

  function pintaPrecios(c) {
    var ar = c.pais === 'AR' || c.moneda === 'ARS', m = medios(c), nombre = PAISES[c.pais];
    // País en el título de la portada
    $$('[data-pais]').forEach(function (e) { if (nombre) e.textContent = (e.getAttribute('data-pais') || 'en') + ' ' + nombre; });
    // Precios
    (c.paquetes || []).forEach(function (p) {
      $$('[data-precio="' + p.id + '"]').forEach(function (e) { e.textContent = p.precio.texto; });
    });
    // Promociones vigentes (admin → Precios y promos): precio de lista tachado y precio con promoción en toda la web.
    // En una página de evento valen las promos sin categoría y las de esa categoría; en las generales, solo las sin categoría.
    var cat = d.body.getAttribute('data-evento') || '';
    var promos = (c.promos || []).filter(function (p) { return !p.categorias.length || (cat && p.categorias.indexOf(cat) > -1); });
    (c.paquetes || []).forEach(function (p) {
      var mejor = null;
      promos.forEach(function (pr) { if (pr.precios[p.id] && (!mejor || pr.porcentaje > mejor.porcentaje)) mejor = pr; });
      if (!mejor) return;
      var x = mejor.precios[p.id];
      $$('[data-precio="' + p.id + '"]').forEach(function (e) { e.innerHTML = '<s class="tachado">' + x.antes + '</s> <span class="promo-precio">' + x.texto + '</span>'; });
      $$('[data-promo-de="' + p.id + '"]').forEach(function (e) { e.textContent = '−' + mejor.porcentaje + ' % · ' + mejor.nombre; e.hidden = false; });
    });
    // «0 €» del plan Gratis, con la moneda del visitante (se toma el formato del plan Basic)
    var pb = (c.paquetes || []).filter(function (p) { return p.id === 'basic'; })[0];
    if (pb && pb.precio && pb.precio.texto) { var cero = pb.precio.texto.replace(/[\d.,\s]+/, function (m) { return '0' + (/\s$/.test(m) ? ' ' : ''); }); $$('[data-precio="gratis"]').forEach(function (e) { e.textContent = cero; }); }
    if (c.aMedida) $$('[data-precio="medida"]').forEach(function (e) { e.textContent = c.aMedida.texto; });
    // Texto de abajo, con la lógica de Albunear: moneda y medios del país
    $$('[data-nota-precios]').forEach(function (e) {
      e.innerHTML = ar
        ? 'Precios en <strong>pesos argentinos</strong>.' + (m.nombres.length ? ' Podés pagar con ' + lista(m.nombres) + '.' : '') + ' Podés cambiar de país en el menú. No esperes más, diseñá tu invitación hoy mismo sin pagar nada. <br><small>(*) Solo disponible en algunos modelos.</small>'
        : 'Precios en <strong>' + nombreMoneda(c.moneda) + '</strong>. Puedes cambiar de país en el menú.' + (m.nombres.length ? ' Puedes pagar con ' + lista(m.nombres) + '.' : '') + ' No esperes más, diseña tu invitación hoy mismo sin pagar nada. <br><small>(*) Solo disponible en algunos modelos.</small>';
    });
    $$('[data-pago-iconos]').forEach(function (e) { e.innerHTML = m.logos.map(logo).join('') + m.extra; });
    $$('[data-iva]').forEach(function (e) { e.textContent = c.moneda === 'EUR' ? ' · IVA incluido' : ''; });
    // Selector de país (la moneda y el idioma salen del país)
    if ($mon) {
      var sel = getCookie('pais_sel') || c.pais || 'ES';
      var actual = LISTA_PAISES.filter(function (y) { return y[0] === sel; })[0];
      // Si el país no está en la lista, se muestra el detectado pero con la moneda que corresponde
      var b = $('.moneda-boton span', $mon); if (b) b.textContent = c.moneda;
      var bd2 = $('[data-bandera]', $mon); if (bd2) bd2.src = '/web/img/flags/' + (actual ? actual[0] : (c.pais || 'es')).toLowerCase() + '.svg';
      var ul = $('.moneda-lista', $mon);
      ul.innerHTML = LISTA_PAISES.map(function (y) { return '<button type="button" role="menuitemradio" aria-checked="' + (y[0] === sel) + '" data-p="' + y[0] + '"><span class="pa"><img src="/web/img/flags/' + y[0].toLowerCase() + '.svg" alt="" width="22" height="15">' + y[1] + '</span><small>' + y[2] + '</small></button>'; }).join('');
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
    $mon.addEventListener('click', function (e) { var x = e.target.closest('[data-p]'); if (!x) return; var p = setPais(x.getAttribute('data-p')); cerrarMoneda(); if (p) cargaCatalogo(p[2]); });
    d.addEventListener('click', function (e) { if (!$mon.contains(e.target)) cerrarMoneda(); });
  }
  if ($mon || $('[data-precio],[data-pais]')) cargaCatalogo(getCookie('cur') || '');
})();
