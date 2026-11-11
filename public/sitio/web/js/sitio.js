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

  /* ---------- «Comenzar diseño a medida»: abre el cuadro de crear invitación (se carga recién al tocar) ---------- */
  $$('[data-medida]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      var slug = b.getAttribute('data-medida'), titulo = b.getAttribute('data-titulo') || '', producto = b.getAttribute('data-producto') || '';
      function ir() { window.AmoCrear.medida(slug, titulo, producto); }
      if (window.AmoCrear) return ir();
      if (!d.querySelector('link[href*="crear-invitacion.css"]')) { var l = d.createElement('link'); l.rel = 'stylesheet'; l.href = '/web/css/crear-invitacion.css?v=a9d90ba8'; d.head.appendChild(l); }
      var sc = d.createElement('script'); sc.src = '/web/js/crear-invitacion.js?v=da3d08fb'; sc.setAttribute('data-app', ''); sc.setAttribute('data-img', '/web/img/ci/'); sc.setAttribute('data-raiz', d.documentElement.getAttribute('data-raiz') || '/'); sc.onload = ir; d.body.appendChild(sc);
    });
  });

  /* ---------- README (ronda 41): «Ver ejemplos» en una ventana con las capturas ---------- */
  $$('[data-galeria]').forEach(function (b) {
    b.addEventListener('click', function () {
      var lista = []; try { lista = JSON.parse(b.getAttribute('data-galeria')); } catch (e) { return; }
      var m = d.createElement('dialog'); m.className = 'gal-modal';
      m.innerHTML = '<div class="gal-caja"><button type="button" class="gal-x" aria-label="Cerrar">&times;</button><h3></h3><div class="gal-grilla"></div></div>';
      m.querySelector('h3').textContent = b.getAttribute('data-titulo') || 'Ejemplos';
      var g = m.querySelector('.gal-grilla');
      lista.forEach(function (x) { var f = d.createElement('figure'), i = d.createElement('img'); i.src = x.img; i.alt = x.t || ''; i.loading = 'lazy'; if (x.marco) i.className = 'marco'; f.appendChild(i); g.appendChild(f); });
      m.querySelector('.gal-x').addEventListener('click', function () { m.close(); });
      m.addEventListener('click', function (e) { if (e.target === m) m.close(); });
      m.addEventListener('close', function () { m.remove(); });
      d.body.appendChild(m); m.showModal();
    });
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
  function escala() { ifr.forEach(function (f) { var w = +f.getAttribute('data-w'), h = +f.getAttribute('data-h'), p = f.parentNode; var k = p.clientWidth / w; f.style.width = w + 'px'; f.style.height = (p.clientHeight ? Math.ceil(p.clientHeight / k) : h) + 'px'; /* README (ronda 42): la invitación llena toda la pantalla del dispositivo, sin margen abajo */ f.style.transform = 'scale(' + k + ')'; }); }
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
  var CON_TRANSFER = ['AR', 'UY', 'ES']; // README (ronda 44): transferencia solo en Argentina, Uruguay y España
  var NOMBRE_MONEDA = { ARS: 'pesos argentinos', USD: 'dólares', EUR: 'euros', MXN: 'pesos mexicanos', COP: 'pesos colombianos', CLP: 'pesos chilenos', PEN: 'soles', UYU: 'pesos uruguayos', PYG: 'guaraníes', BOB: 'bolivianos', CRC: 'colones', GBP: 'libras esterlinas', BRL: 'reales' };
  var $mon = $('[data-moneda]');

  function getCookie(n) { var m = d.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; }
  function setMoneda(c) { d.cookie = 'cur=' + c + '; Path=/; Max-Age=31536000; SameSite=Lax'; }
  /* README (ronda 42): el selector es de PAÍS y lleva a su carpeta (/es/, /ar/, /us/en/…): cada país trae su idioma y su moneda.
     Lo elegido queda en la cookie ai_sede (el Worker la respeta y no vuelve a llevar a la del país de la IP).
     LISTA_PAISES: [código, nombre, moneda, carpeta] (la arma npm run sitio desde src/sitio/variantes.js) */
  var LISTA_PAISES = [['DE','Alemania','EUR','/de','de','Deutsch',1], ['AR','Argentina','ARS','/ar','es-ar','Español',1], ['AU','Australia','AUD','/au','en-gb','English',1], ['AT','Austria','EUR','/at','de','Deutsch',1], ['BE','Bélgica','EUR','/be','fr','Français',1], ['BE','Bélgica','EUR','/be/nl','nl','Nederlands',0], ['BO','Bolivia','BOB','/bo','es','Español',1], ['BR','Brasil','BRL','/br','pt-br','Português',1], ['CA','Canadá','CAD','/ca','en','English',1], ['CA','Canadá','CAD','/ca/fr','fr','Français',0], ['CL','Chile','CLP','/cl','es-cl','Español',1], ['CO','Colombia','COP','/co','es-cl','Español',1], ['CR','Costa Rica','CRC','/cr','es-cr','Español',1], ['CU','Cuba','USD','/cu','es-bz','Español',1], ['EC','Ecuador','USD','/ec','es-bz','Español',1], ['SV','El Salvador','USD','/sv','es-cr','Español',1], ['ES','España','EUR','/es','es-es','Español',1], ['US','Estados Unidos','USD','/us','es-bz','Español',1], ['US','Estados Unidos','USD','/us/en','en','English',0], ['FR','Francia','EUR','/fr','fr','Français',1], ['GT','Guatemala','GTQ','/gt','es-cr','Español',1], ['HN','Honduras','HNL','/hn','es-cr','Español',1], ['IE','Irlanda','EUR','/ie','en-gb','English',1], ['IT','Italia','EUR','/it','it','Italiano',1], ['MX','México','MXN','/mx','es-mx','Español',1], ['NI','Nicaragua','NIO','/ni','es-cr','Español',1], ['NZ','Nueva Zelanda','NZD','/nz','en-gb','English',1], ['NL','Países Bajos','EUR','/nl','nl','Nederlands',1], ['PA','Panamá','USD','/pa','es-bz','Español',1], ['PY','Paraguay','PYG','/py','es-py','Español',1], ['PE','Perú','PEN','/pe','es-pe','Español',1], ['PT','Portugal','EUR','/pt','pt-pt','Português',1], ['PR','Puerto Rico','USD','/pr','es-bz','Español',1], ['GB','Reino Unido','GBP','/gb','en-gb','English',1], ['DO','República Dominicana','DOP','/do','es-bz','Español',1], ['CH','Suiza','CHF','/ch','de','Deutsch',1], ['CH','Suiza','CHF','/ch/fr','fr','Français',0], ['CH','Suiza','CHF','/ch/it','it','Italiano',0], ['UY','Uruguay','UYU','/uy','es-ar','Español',1], ['VE','Venezuela','USD','/ve','es-bz','Español',1], ['','Internacional','USD','','es','Español',1], ['','Internacional','USD','/en','en','English',0]];
  // README (ronda 43): en la web, la carpeta de la página; fuera de la web (Mi cuenta, Entrar), la última elegida o vista
  var EN_WEB = d.documentElement.hasAttribute('data-carpeta');
  var sedeCookie = getCookie('ai_sede'); if (sedeCookie === 'raiz') sedeCookie = '';
  var CARPETA = EN_WEB ? d.documentElement.getAttribute('data-carpeta') || '' : sedeCookie;
  function irAPais(carpeta) {
    var x = LISTA_PAISES.filter(function (y) { return y[3] === carpeta; })[0]; if (!x) return;
    var s = 'Path=/; Max-Age=31536000; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    ['ai_elegida=' + encodeURIComponent(x[3] || 'raiz'), 'ai_sede=' + encodeURIComponent(x[3] || 'raiz'), 'cur=' + x[2], 'idioma=' + x[4]].concat(x[0] ? ['pais_sel=' + x[0]] : []).forEach(function (c) { d.cookie = c + '; ' + s; });
    // Fuera de la web (cuenta, panel) solo cambia el idioma: se vuelve a cargar la misma página
    if (!EN_WEB) { location.reload(); return; }
    var resto = location.pathname.indexOf(CARPETA + '/') === 0 || location.pathname === CARPETA ? location.pathname.slice(CARPETA.length) : location.pathname;
    location.href = x[3] + (resto || '/') + location.search + location.hash;
  }
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
    // README (ronda 44): la nota sigue el idioma de la PÁGINA (no el país de la IP): voseo solo en las páginas rioplatenses
    var ar = (d.documentElement.getAttribute('data-clave') || '') === 'es-ar', m = medios(c), nombre = PAISES[c.pais];
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
    // README (ronda 41): precio de un producto suelto (Save The Date a medida…)
    $$('[data-prod]').forEach(function (e) { var p = (c.productos || []).filter(function (x) { return x.id === e.getAttribute('data-prod'); })[0]; if (p && p.precio && p.precio.texto) e.textContent = p.precio.texto; });
    // README (ronda 41): precios de profesionales en la moneda del visitante
    $$('[data-eur]').forEach(function (e) { var v = c.pro && c.pro[e.getAttribute('data-eur')]; if (v) e.textContent = v; });
    // Texto de abajo, con la lógica de Albunear: moneda y medios del país
    // README (ronda 42): en las páginas traducidas, la nota va en el idioma de la página
    var IDI = { en: 'en', 'en-gb': 'en', 'pt-br': 'pt', 'pt-pt': 'pt', fr: 'fr', it: 'it', de: 'de', nl: 'nl' }[d.documentElement.getAttribute('data-clave') || 'es'];
    if (IDI) {
      var NOTA = { en: ['Prices in {m}.', 'You can pay with {x}.', 'Design your invitation today without paying anything.', '(*) Only available on some models.', ' and '],
        pt: ['Preços em {m}.', 'Você pode pagar com {x}.', 'Crie seu convite hoje mesmo sem pagar nada.', '(*) Disponível apenas em alguns modelos.', ' e '],
        fr: ['Prix en {m}.', 'Vous pouvez payer par {x}.', 'Créez votre invitation dès aujourd’hui sans rien payer.', '(*) Disponible uniquement sur certains modèles.', ' et '],
        it: ['Prezzi in {m}.', 'Puoi pagare con {x}.', 'Crea il tuo invito oggi stesso senza pagare nulla.', '(*) Disponibile solo su alcuni modelli.', ' e '],
        de: ['Preise in {m}.', 'Du kannst bezahlen mit {x}.', 'Gestalte deine Einladung noch heute, ohne etwas zu zahlen.', '(*) Nur bei einigen Designs verfügbar.', ' und '],
        nl: ['Prijzen in {m}.', 'Je kunt betalen met {x}.', 'Ontwerp vandaag nog je uitnodiging zonder iets te betalen.', '(*) Alleen beschikbaar bij sommige ontwerpen.', ' en '] }[IDI];
      var mon = c.moneda; try { mon = new Intl.NumberFormat(IDI, { style: 'currency', currency: c.moneda, currencyDisplay: 'name' }).formatToParts(2).filter(function (x) { return x.type === 'currency'; })[0].value; } catch (x) { /* sin nombre */ }
      var tr = function (t) { return window.AI_REGIONAL ? AI_REGIONAL.traduce(t) : t; };
      var ns = m.nombres.map(tr), lx = ns.length > 1 ? ns.slice(0, -1).join(', ') + NOTA[4] + ns[ns.length - 1] : ns.join('');
      $$('[data-nota-precios]').forEach(function (e) {
        e.setAttribute('data-sin-regional', '');
        e.innerHTML = NOTA[0].replace('{m}', mon) + (lx ? ' ' + NOTA[1].replace('{x}', lx) : '') + ' ' + NOTA[2] + (e.hasAttribute('data-sin-nota') ? '' : ' <br><small>' + NOTA[3] + '</small>');
      });
    } else $$('[data-nota-precios]').forEach(function (e) {
      e.innerHTML = ar
        ? 'Precios en ' + (c.moneda === 'ARS' ? 'pesos' : nombreMoneda(c.moneda)) + '.' + (m.nombres.length ? ' Podés pagar con ' + lista(m.nombres) + '.' : '') + ' No esperes más, diseñá tu invitación hoy mismo sin pagar nada.' + (e.hasAttribute('data-sin-nota') ? '' : ' <br><small>(*) Solo disponible en algunos modelos.</small>')
        : 'Precios en ' + nombreMoneda(c.moneda) + '.' + (m.nombres.length ? ' Puedes pagar con ' + lista(m.nombres) + '.' : '') + ' No esperes más, diseña tu invitación hoy mismo sin pagar nada.' + (e.hasAttribute('data-sin-nota') ? '' : ' <br><small>(*) Solo disponible en algunos modelos.</small>');
    });
    $$('[data-pago-iconos]').forEach(function (e) { e.innerHTML = m.logos.map(logo).join('') + m.extra; });
    // README (ronda 44): «IVA incluido» solo si el precio lo lleva (lo dice la tienda según el país de quien mira)
    var conIva = c.iva === undefined ? c.moneda === 'EUR' : c.iva;
    $$('[data-iva]').forEach(function (e) { e.hidden = !conIva; }); // el texto ya viene traducido en la página
    // Selector de país (la moneda y el idioma salen del país)
    if ($mon) {
      var actual = LISTA_PAISES.filter(function (y) { return y[3] === CARPETA; })[0];
      // Si el país no está en la lista, se muestra el detectado pero con la moneda que corresponde
      var b = $('.moneda-boton span', $mon); if (b) b.textContent = c.moneda;
      var bd2 = $('[data-bandera]', $mon); if (bd2) { bd2.onerror = function () { bd2.onerror = null; bd2.src = '/web/img/flags/us.svg'; }; bd2.src = actual && actual[0] ? '/web/img/flags/' + actual[0].toLowerCase() + '.svg' : '/web/img/flags/globo.svg'; }
      var ul = $('.moneda-lista', $mon);
      // README (ronda 44): cada país una vez (Internacional al final) y, debajo, los idiomas del país elegido
      var grupo = function (y) { return y[0] || 'INT'; }, g = actual ? grupo(actual) : 'INT';
      var idiomas = LISTA_PAISES.filter(function (y) { return grupo(y) === g; });
      ul.innerHTML = LISTA_PAISES.filter(function (y) { return y[6]; }).map(function (y) { return '<button type="button" role="menuitemradio" aria-checked="' + (grupo(y) === g) + '" data-p="' + (grupo(y) === g ? CARPETA : y[3]) + '"><span class="pa"><img src="/web/img/flags/' + (y[0] ? y[0].toLowerCase() : 'globo') + '.svg" alt="" width="22" height="15">' + y[1] + '</span><small>' + y[2] + '</small></button>'; }).join('')
        + (idiomas.length > 1 ? '<div class="moneda-idiomas">' + idiomas.map(function (y) { return '<button type="button" class="idi' + (y[3] === CARPETA ? ' on' : '') + '" data-p="' + y[3] + '" lang="' + y[4].split('-')[0] + '">' + y[5] + '</button>'; }).join('') + '</div>' : '');
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
    $mon.addEventListener('click', function (e) { var x = e.target.closest('[data-p]'); if (!x) return; cerrarMoneda(); if (x.getAttribute('data-p') !== CARPETA) irAPais(x.getAttribute('data-p')); });
    d.addEventListener('click', function (e) { if (!$mon.contains(e.target)) cerrarMoneda(); });
  }
  // La moneda es la del país de la carpeta; en la raíz, la elegida antes o la del país de la IP
  if ($mon || $('[data-precio],[data-pais]')) cargaCatalogo(d.documentElement.getAttribute('data-mon') || getCookie('cur') || '');
})();
/* README (ronda 40): con «reducir movimiento» los videos de la portada quedan quietos */
(function () { try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelectorAll('.escena video').forEach(function (v) { v.removeAttribute('autoplay'); v.pause(); }); } catch (e) {} })();
/* README (ronda 40): en las demos empresariales de la portada se cierra sola la ventana de bienvenida («Ingresar sin música») para mostrar la invitación */
(function () {
  document.querySelectorAll('.escena iframe').forEach(function (f) {
    f.addEventListener('load', function () {
      [500, 1600, 3200].forEach(function (ms) { setTimeout(function () { try {
        var dd = f.contentDocument, w = f.contentWindow;
        // README (ronda 41): sin música en los dispositivos de las portadas (y sin que se duplique entre el celular y la tablet)
        if (w && w.HTMLMediaElement) w.HTMLMediaElement.prototype.play = function () { this.muted = true; this.pause(); return Promise.resolve(); };
        [].forEach.call(dd.querySelectorAll('audio,video'), function (m) { m.muted = true; m.pause(); });
        var b = dd && dd.querySelector('.modal.show [data-dismiss="modal"], .modal.show .close'); if (b) b.click();
      } catch (e) {} }, ms); });
    });
  });
})();
