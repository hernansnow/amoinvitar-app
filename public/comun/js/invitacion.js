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
      // El formato propio del diseño (data-formato, con {d} {dias} {h} {horas} {m} {min} {s} {seg})
      var f = this.getAttribute('data-formato');
      if (f) {
        jQuery(this).html(f.replace('{d}', e.strftime('%-D')).replace('{dias}', e.offset.totalDays === 1 ? tx.dia : tx.dias)
          .replace('{h}', e.strftime('%H')).replace('{horas}', tx.horas).replace('{m}', e.strftime('%M')).replace('{min}', tx.min)
          .replace('{s}', e.strftime('%S')).replace('{seg}', tx.seg));
        return;
      }
      jQuery(this).html(e.strftime(
        '<div class="holder m-2"><span class="font-weight-lighter mb-2">%-D</span> ' + (e.offset.totalDays === 1 ? tx.dia : tx.dias) + '</div>' +
        '<div class="holder m-2"><span class="font-weight-lighter mb-2">%H</span> ' + tx.horas + '</div>' +
        '<div class="holder m-2"><span class="font-weight-lighter mb-2">%M</span> ' + tx.min + '</div>' +
        '<div class="holder m-2"><span class="font-weight-lighter mb-2">%S</span> ' + tx.seg + '</div>'));
    });
  }

  // Cuenta regresiva con casilleros propios del diseño (#days #hours #minutes #seconds, p. ej. Graffiti)
  if (INV.cuenta && !document.getElementById('clock-b') && document.getElementById('days')) {
    var fin = new Date(INV.cuenta.replace(/\//g, '-').replace(' ', 'T')).getTime();
    var poner = function (id, n) { var el = document.getElementById(id); if (el) el.textContent = n < 10 && id !== 'days' ? '0' + n : String(n); };
    var tic = function () {
      var r = Math.max(0, fin - Date.now());
      poner('days', Math.floor(r / 864e5)); poner('hours', Math.floor(r / 36e5) % 24); poner('minutes', Math.floor(r / 6e4) % 60); poner('seconds', Math.floor(r / 1e3) % 60);
    };
    tic(); setInterval(tic, 1000);
  }

  // Botones "Agendar": menú propio (Google, Apple, Outlook, .ics), sin librerías externas
  var tx2 = INV.textos || {};
  function isoGuiones(x) { return x.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z'); }
  function escICS(x) { return String(x || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); }
  function archivoICS(c) {
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Amo Invitar//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      'UID:' + c.inicio + '-' + Math.random().toString(36).slice(2) + '@amoinvitar.com',
      'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
      'DTSTART:' + c.inicio, 'DTEND:' + (c.fin || c.inicio),
      'SUMMARY:' + escICS(c.titulo), 'DESCRIPTION:' + escICS(c.descripcion + '\n' + location.href.split('#')[0]), 'LOCATION:' + escICS(c.lugar),
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + escICS(c.titulo), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  function enlaces(c) {
    var q = encodeURIComponent, det = c.descripcion + '\n' + location.href.split('#')[0];
    var ics = 'data:text/calendar;charset=utf-8,' + q(archivoICS(c));
    return [
      [tx2.google, 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + q(c.titulo) + '&dates=' + c.inicio + '/' + (c.fin || c.inicio) + '&details=' + q(det) + '&location=' + q(c.lugar), false],
      [tx2.apple, ics, true],
      [tx2.outlook, 'https://outlook.live.com/calendar/0/action/compose?subject=' + q(c.titulo) + '&startdt=' + isoGuiones(c.inicio) + '&enddt=' + isoGuiones(c.fin || c.inicio) + '&location=' + q(c.lugar) + '&body=' + q(det), false],
      [tx2.otro, ics, true]
    ];
  }
  var estilo = document.createElement('style');
  estilo.textContent = '.agendar-menu{position:absolute;z-index:8000;min-width:220px;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.18);padding:6px;text-align:left}' +
    '.agendar-menu a{display:block;padding:10px 14px;border-radius:8px;color:#212529;text-decoration:none;font-size:.95rem}' +
    '.agendar-menu a:hover,.agendar-menu a:focus{background:rgba(0,0,0,.06)}';
  document.head.appendChild(estilo);
  function cerrarMenu() { var m = document.querySelector('.agendar-menu'); if (m) m.remove(); }
  [].forEach.call(document.querySelectorAll('[data-agendar]'), function (b) {
    var cfg = INV.calendarios && INV.calendarios[b.getAttribute('data-agendar')];
    if (!cfg) { b.remove(); return; }
    b.setAttribute('aria-haspopup', 'menu');
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      if (document.querySelector('.agendar-menu')) { cerrarMenu(); return; }
      var m = document.createElement('div');
      m.className = 'agendar-menu'; m.setAttribute('role', 'menu');
      enlaces(cfg).forEach(function (x) {
        var a = document.createElement('a');
        a.textContent = x[0]; a.href = x[1]; a.setAttribute('role', 'menuitem');
        if (x[2]) a.download = 'evento.ics'; else { a.target = '_blank'; a.rel = 'noopener'; }
        a.addEventListener('click', function () { setTimeout(cerrarMenu, 50); });
        m.appendChild(a);
      });
      document.body.appendChild(m);
      var r = b.getBoundingClientRect();
      var izq = Math.max(8, Math.min(r.left + r.width / 2 - m.offsetWidth / 2, document.documentElement.clientWidth - m.offsetWidth - 8));
      m.style.left = (izq + window.scrollX) + 'px';
      m.style.top = (r.bottom + window.scrollY + 6) + 'px';
      m.querySelector('a').focus();
    });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.agendar-menu')) cerrarMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarMenu(); });

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

  // Nombres de portada (data-ajustar): ningún nombre se sale de su lugar.
  //   · El título se limita al ancho disponible (una fracción de la caja), así los
  //     nombres largos bajan a otra línea dentro del aro y no por fuera.
  //   · Si igual algo no entra (una palabra larga, el círculo del "&" al final de la
  //     línea) o quedan más de 2 líneas, se achica la letra de a poco…
  //   · …hasta un mínimo que se sigue leyendo bien en un celular (26px o el 45%).
  // data-ajustar-en: la caja de referencia (el aro de la Basic); si no, la sección.
  // Vale para todos los modelos: alcanza con poner data-ajustar en el título.
  function medidas(h) {
    var r = document.createRange(); r.selectNodeContents(h);
    var rs = r.getClientRects(), izq = Infinity, der = -Infinity, tops = [];
    for (var i = 0; i < rs.length; i++) {
      if (!rs[i].width) continue;
      izq = Math.min(izq, rs[i].left); der = Math.max(der, rs[i].right);
      var c = rs[i].top + rs[i].height / 2;
      if (!tops.some(function (t) { return Math.abs(t - c) < rs[i].height * 0.45; })) tops.push(c);
    }
    return { ancho: der > izq ? der - izq : 0, lineas: tops.length };
  }
  function ajustarNombres() {
    document.querySelectorAll('[data-ajustar]').forEach(function (h) {
      h.style.fontSize = ''; h.style.maxWidth = '';
      if (!h.offsetParent) return; // oculto (otra portada): se ajusta cuando se vea
      var propia = h.getAttribute('data-ajustar-en') && h.closest(h.getAttribute('data-ajustar-en'));
      var caja = propia || h.closest('.container, section') || h.parentElement;
      // Una caja propia (un círculo, un marco) cuenta por su lado más corto
      var base = propia ? Math.min(caja.clientWidth, caja.clientHeight || caja.clientWidth) : caja.clientWidth;
      var disponible = Math.floor(base * (parseFloat(h.getAttribute('data-ajustar')) || 0.9));
      h.style.maxWidth = disponible + 'px'; h.style.marginLeft = h.style.marginRight = 'auto';
      var fs0 = parseFloat(getComputedStyle(h).fontSize), fs = fs0, minimo = Math.min(fs0, Math.max(26, fs0 * 0.45));
      for (var i = 0; i < 40; i++) {
        var m = medidas(h);
        if (m.ancho <= disponible + 1 && m.lineas <= 2) break;
        fs = Math.max(minimo, fs * 0.95);
        h.style.fontSize = fs.toFixed(1) + 'px';
        if (fs === minimo) break;
      }
    });
  }
  ajustarNombres();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarNombres);
  var tAjuste; addEventListener('resize', function () { clearTimeout(tAjuste); tAjuste = setTimeout(ajustarNombres, 150); });
})();
