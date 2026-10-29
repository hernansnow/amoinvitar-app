/* Control flotante de la invitación: música e idioma (ver componentes/bloques.js) */
(function () {
  var caja = document.getElementById('ai-flotante');
  if (!caja) return;
  var mostrar = false;

  // ── Música ──
  var audio = document.getElementById('audio');
  var btn = caja.querySelector('.ai-f-musica');
  if (audio && btn) {
    mostrar = true; btn.hidden = false;
    var pintar = function () { btn.setAttribute('aria-pressed', audio.paused ? 'false' : 'true'); };
    audio.addEventListener('play', pintar); audio.addEventListener('pause', pintar); pintar();
    btn.addEventListener('click', function () {
      if (audio.paused) { var p = audio.play(); if (p && p.catch) p.catch(function () {}); } else audio.pause();
    });
  }

  // ── Idioma ──
  var lista = (caja.getAttribute('data-idiomas') || '').split(',').filter(Boolean);
  var actual = caja.getAttribute('data-actual');
  var u = new URL(location.href);
  var abrir = caja.querySelector('.ai-f-actual'), menu = caja.querySelector('.ai-f-menu');
  if (lista.length > 1 && abrir && menu) {
    mostrar = true;
    var cerrar = function () { menu.hidden = true; abrir.setAttribute('aria-expanded', 'false'); };
    abrir.addEventListener('click', function (e) { e.stopPropagation(); var a = menu.hidden; menu.hidden = !a; abrir.setAttribute('aria-expanded', a ? 'true' : 'false'); });
    document.addEventListener('click', function (e) { if (!caja.contains(e.target)) cerrar(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
    menu.querySelectorAll('a').forEach(function (x) {
      x.addEventListener('click', function (e) {
        e.preventDefault();
        try { localStorage.setItem('ai-idioma', x.dataset.lang); } catch (_) {}
        if (x.dataset.lang === actual) { cerrar(); return; }
        u.searchParams.set('lang', x.dataset.lang); location.href = u.href;
      });
    });
    // Primera visita: la invitación se abre en el idioma del invitado (si lo tiene)
    // (no en la vista previa del panel, que va dentro de un iframe)
    var enPanel = false; try { enPanel = window.self !== window.top; } catch (_) { enPanel = true; }
    if (!u.searchParams.has('lang') && !enPanel) {
      var g = null; try { g = localStorage.getItem('ai-idioma'); } catch (_) {}
      var pref = [g].concat(navigator.languages || [navigator.language]).filter(Boolean).map(function (l) { return String(l).slice(0, 2).toLowerCase(); });
      for (var i = 0; i < pref.length; i++) {
        if (lista.indexOf(pref[i]) > -1) { if (pref[i] !== actual) { u.searchParams.set('lang', pref[i]); location.replace(u.href); } break; }
      }
    }
  }
  caja.hidden = !mostrar;
})();
