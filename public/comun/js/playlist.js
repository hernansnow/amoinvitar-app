// Playlist de Spotify en la invitación: el play verde reproduce la lista (con el
// reproductor de Spotify), para la música de fondo y hace girar el disco.
(function () {
  var caja = document.querySelector('.ai-playlist');
  if (!caja) return;
  // Título y textos en la fuente base de la invitación (la del body)
  try { caja.style.fontFamily = getComputedStyle(document.body).fontFamily; } catch (e) {}
  var vinilo = caja.querySelector('.ai-vinilo');
  var play = caja.querySelector('.ai-v-play');
  var lugar = caja.querySelector('.ai-pl-reproductor');
  var control = null, sonando = false, pedido = false;

  function girar(si) {
    sonando = si;
    vinilo.classList.toggle('girando', si);
    play.classList.toggle('pausa', si);
    play.setAttribute('aria-label', si ? play.dataset.pausa : play.dataset.play);
  }
  // La música de fondo de la invitación se pausa mientras suena la playlist
  function pararFondo() {
    var a = document.getElementById('audio');
    if (a && !a.paused) { a.pause(); var b = document.querySelector('.music-play'); if (b) b.classList.remove('playing', 'activo'); }
  }

  // Si no carga la API de Spotify, queda el reproductor común de Spotify
  function sinApi() {
    lugar.classList.add('visible');
    if (lugar.querySelector('iframe') && !control) { var f = lugar.querySelector('iframe'); f.style.border = '0'; f.style.borderRadius = '12px'; return; }
    if (lugar.querySelector('iframe')) return;
    lugar.innerHTML = '<iframe title="Spotify" src="' + lugar.dataset.embed + '" width="100%" height="80" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" style="border:0;border-radius:12px"></iframe>';
  }
  window.onSpotifyIframeApiReady = function (API) {
    API.createController(lugar.querySelector('.ai-pl-lugar'), { uri: lugar.dataset.uri, width: '100%', height: 80 }, function (c) {
      control = c;
      c.addListener('playback_update', function (e) { girar(!e.data.isPaused); });
      if (pedido) { pedido = false; c.togglePlay(); }
    });
  };
  var s = document.createElement('script');
  s.src = 'https://open.spotify.com/embed/iframe-api/v1'; s.async = true; s.onerror = sinApi;
  document.head.appendChild(s);
  setTimeout(function () { if (!control) sinApi(); }, 8000);

  play.addEventListener('click', function () {
    if (!sonando) pararFondo();
    if (control) control.togglePlay();
    else { pedido = true; girar(!sonando); }
  });

  // Ver todas las canciones
  var ver = caja.querySelector('.ai-pl-ver');
  if (ver) ver.addEventListener('click', function () {
    var abiertas = ver.classList.toggle('abierta');
    caja.querySelectorAll('.ai-pl-mas').forEach(function (li) { li.hidden = !abiertas; });
    ver.textContent = abiertas ? ver.dataset.menos : ver.dataset.mas;
  });
})();
