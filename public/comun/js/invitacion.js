/* Amo Invitar 2.0 · lo que la invitación hace en el navegador.
   Los datos vienen en window.INV (los pone el motor). Abierto el modelo
   suelto en Dreamweaver no hay INV y no hace nada. */
(function () {
  var INV = window.INV;
  if (!INV) return;

  // Videos de fondo del diseño (Disco): esperan al sobre o a la ventana de bienvenida; sin ninguno de los dos, cargan ya
  function cargarVideosFondo() { [].forEach.call(document.querySelectorAll('iframe[data-sobre-src]'), function (f) { f.src = f.getAttribute('data-sobre-src'); f.removeAttribute('data-sobre-src'); }); }
  var bv = document.getElementById('ai-bienvenida');
  if (!document.getElementById('sobre') && (!bv || bv.hidden || getComputedStyle(bv).display === 'none')) cargarVideosFondo();
  // Nunca queda sin video: aunque el sobre o la bienvenida sigan cerrados, a los 4 s de cargar la página se pide igual
  addEventListener('load', function () { setTimeout(cargarVideosFondo, 4000); });

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
      c.todoElDia ? 'DTSTART;VALUE=DATE:' + c.inicio : 'DTSTART:' + c.inicio, c.todoElDia ? 'DTEND;VALUE=DATE:' + c.fin : 'DTEND:' + (c.fin || c.inicio),
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
      [tx2.outlook, 'https://outlook.live.com/calendar/0/action/compose?subject=' + q(c.titulo) + (c.todoElDia ? '&allday=true&startdt=' + c.inicio.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3') + '&enddt=' + c.fin.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3') : '&startdt=' + isoGuiones(c.inicio) + '&enddt=' + isoGuiones(c.fin || c.inicio)) + '&location=' + q(c.lugar) + '&body=' + q(det), false],
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
  // El modelo de la página (por su hoja de estilos)
  var MODELO = ((document.querySelector('link[href*="/modelos/"][href$="estilo.css"]') || {}).getAttribute || function () { return ''; }).call(document.querySelector('link[href*="/modelos/"][href$="estilo.css"]'), 'href') || '';
  MODELO = (MODELO.match(/\/modelos\/([^/]+)\//) || [])[1] || '';
  // Modelos con los dos nombres en una línea: hasta qué fracción de la letra del diseño se puede achicar
  var UNA_LINEA = { rockabilly: [0.45, 0.86], rouge: [0.27, 0.92], oliva: [0.45, 0.86], garden: [0.4, 0.66], hojas: [0.4, 0.66], travel: [0.4, 0.9], aquarella: [0.5, 0.88], minimal: [0.5, 0.88], sky: [0.5, 0.74], lovestory: [0.42, 0.86], black: [0.42, 0.8], white: [0.42, 0.8] };
  // Modelos donde el "&" ya va en su propia línea con su espacio (Elegance: el círculo entre los nombres)
  var SIN_TRES = { elegance: 1, style: 1 };
  function ajustarNombres() {
    document.querySelectorAll('[data-ajustar]').forEach(function (h) {
      h.style.fontSize = ''; h.style.maxWidth = ''; h.style.marginLeft = ''; h.style.marginRight = ''; h.classList.remove('ai-nombres-3', 'ai-nombres-2'); h.style.whiteSpace = '';
      if (!h.offsetParent) return; // oculto (otra portada): se ajusta cuando se vea
      var propia = h.getAttribute('data-ajustar-en') && h.closest(h.getAttribute('data-ajustar-en'));
      var caja = propia || h.closest('.container, section') || h.parentElement;
      // Una caja propia (un círculo, un marco) cuenta por su lado más corto
      var base = propia ? Math.min(caja.clientWidth, caja.clientHeight || caja.clientWidth) : caja.clientWidth;
      // En la computadora, la fracción propia del diseño (data-ajustar-pc: el marco es más angosto que la sección)
      var fr = (innerWidth >= 768 && h.getAttribute('data-ajustar-pc')) || h.getAttribute('data-ajustar');
      var disponible = Math.floor(base * (parseFloat(fr) || 0.9));
      h.style.maxWidth = disponible + 'px';
      // Respeta la alineación del diseño (Armonía y B&N a la izquierda, Beach a la derecha, el resto al centro).
      // Se mide dónde queda el texto en el diseño (la primera vez, antes de tocar nada): el text-align solo no
      // alcanza, en Aquarella o Amanecer el centrado viene de la caja
      // Se mide con un texto corto de prueba en lugar de los nombres: un nombre largo llena el ancho y parecía centrado
      // (Beach a la derecha, Armonía y B&N a la izquierda quedaban al centro)
      if (!h.dataset.alinear) {
        var mx = h.style.maxWidth; h.style.maxWidth = '';
        var antes = document.createDocumentFragment(); while (h.firstChild) antes.appendChild(h.firstChild);
        var prueba = document.createElement('span'); prueba.textContent = 'Ana'; h.appendChild(prueba);
        var t = prueba.getBoundingClientRect(), pr = h.getBoundingClientRect(), w = pr.width || 1;
        h.removeChild(prueba); h.appendChild(antes);
        var c = (t.left + t.right) / 2 - (pr.left + pr.right) / 2;
        h.dataset.alinear = Math.abs(c) < w * 0.1 ? 'centro' : (t.left - pr.left < w * 0.2 ? 'izq' : (pr.right - t.right < w * 0.2 ? 'der' : 'centro'));
        h.style.maxWidth = mx;
      }
      var al = h.dataset.alinear;
      // con prioridad: clases como .m-0 (Aquarella) traen !important
      h.style.setProperty('margin-left', al === 'izq' ? '0' : 'auto', 'important');
      h.style.setProperty('margin-right', al === 'der' ? '0' : 'auto', 'important');
      h.style.textAlign = al === 'izq' ? 'left' : al === 'der' ? 'right' : 'center';
      var fs0 = parseFloat(getComputedStyle(h).fontSize), fs = fs0, minimo = Math.min(fs0, Math.max(13, fs0 * 0.3));
      // README (ronda 27): en estos modelos los dos nombres van en una sola línea, con la letra más chica; si así
      // ya no se leería bien, recién ahí se parten (y con más aire entre las líneas)
      var dosNombres = h.querySelectorAll('.ai-n').length === 2;
      if (UNA_LINEA[MODELO] && dosNombres) {
        h.style.whiteSpace = 'nowrap';
        // en una línea puede usar casi todo el ancho de su caja (no solo la fracción pensada para dos líneas)
        var ancho1 = Math.max(disponible, Math.floor(base * UNA_LINEA[MODELO][1]));
        h.style.maxWidth = ancho1 + 'px';
        var legible = Math.max(22, fs0 * UNA_LINEA[MODELO][0]);
        for (var j = 0; j < 40 && medidas(h).ancho > ancho1 + 1 && fs > legible; j++) { fs = Math.max(legible, fs * 0.96); h.style.fontSize = fs.toFixed(1) + 'px'; }
        if (medidas(h).ancho <= ancho1 + 1) return;
        h.style.whiteSpace = ''; h.style.fontSize = ''; h.style.maxWidth = disponible + 'px'; fs = fs0;
        h.classList.add('ai-nombres-2');
      }
      for (var i = 0; i < 40; i++) {
        var m = medidas(h);
        if (m.ancho <= disponible + 1) break; // cada nombre va entero (nowrap): solo se achica si no entra a lo ancho
        fs = Math.max(minimo, fs * 0.95);
        h.style.fontSize = fs.toFixed(1) + 'px';
        if (fs === minimo) break;
      }
      // README (ronda 26): si quedan en tres líneas (nombre / & / nombre), el "&", el "+" o el corazón van en su línea
      // pegados a los nombres (sin el interlineado grande del diseño: Travel, Aquarella, Cinema…)
      var ns = h.querySelectorAll(':scope > .ai-n');
      if (ns.length === 2) {
        var r1 = ns[0].getBoundingClientRect(), r2 = ns[1].getBoundingClientRect();
        var sep = [].filter.call(h.children, function (x) { return !x.classList.contains('ai-n') && x.getBoundingClientRect().width; })[0];
        var rs = sep && sep.getBoundingClientRect(), cs = rs && rs.top + rs.height / 2;
        var solo = rs && cs > r1.bottom - r1.height * 0.25 && cs < r2.top + r2.height * 0.25;
        // Centrados y cada nombre en su línea ("Maximiliano / & Guadalupe"): también en tres, así queda parejo
        // (B&N, a la izquierda, lleva el "&" delante del segundo nombre a propósito)
        var partidos = r2.top > r1.bottom - r1.height * 0.3 && h.dataset.alinear === 'centro';
        if (!SIN_TRES[MODELO] && rs && r2.top > r1.bottom - r1.height * 0.3 && (solo || partidos)) h.classList.add('ai-nombres-3');
      }
    });
    // La frase de la portada va en una sola línea: si no entra, primero se sacan las rayitas de los costados
    // (date-line) y, si todavía no entra, se achica la letra (Hojas: "MI PRIMERA COMUNIÓN")
    document.querySelectorAll('.ai-frase').forEach(function (f) {
      f.classList.remove('ai-sin-linea'); f.style.fontSize = '';
      if (!f.offsetParent) return;
      var dosLineas = function () { return medidas(f).lineas > 1; };
      if (!dosLineas()) return;
      f.classList.add('ai-sin-linea');
      var fs = parseFloat(getComputedStyle(f).fontSize);
      for (var i = 0; i < 25 && dosLineas() && fs > 10; i++) { fs *= 0.95; f.style.fontSize = fs.toFixed(1) + 'px'; }
    });
    // La frase sobre la cinta (Cinema y Luxury): si no entra (una traducción más larga), se achica
    document.querySelectorAll('.ai-cinta-texto').forEach(function (t) {
      t.style.fontSize = '';
      if (!t.offsetParent) return;
      // La letra según el alto de la cinta (así no se sale por arriba ni por abajo), y más chica si no entra a lo ancho
      var img = t.parentNode.querySelector('img'), alto = img && img.getBoundingClientRect().height;
      var fs = alto ? Math.min(parseFloat(getComputedStyle(t).fontSize), alto * 0.5) : parseFloat(getComputedStyle(t).fontSize);
      t.style.fontSize = fs.toFixed(1) + 'px';
      for (var i = 0; i < 30 && t.scrollWidth > t.clientWidth + 1 && fs > 9; i++) { fs *= 0.94; t.style.fontSize = fs.toFixed(1) + 'px'; }
    });
  }
  ajustarNombres();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarNombres);
  var tAjuste; addEventListener('resize', function () { clearTimeout(tAjuste); tAjuste = setTimeout(ajustarNombres, 150); });
  // Al cambiar de tamaño (girar el celular, pasar a la compu) las galerías cambian de alto: las animaciones de entrada
  // se recalculan, si no las secciones de abajo quedan sin aparecer
  var tAos; function refrescarAos() { clearTimeout(tAos); tAos = setTimeout(function () { if (window.AOS) { try { AOS.refreshHard(); } catch (e) { AOS.refresh(); } } }, 300); }
  addEventListener('resize', refrescarAos);
  if (window.jQuery) jQuery(document).on('refreshed.owl.carousel initialized.owl.carousel', refrescarAos);
})();
