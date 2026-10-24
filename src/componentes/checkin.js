// Puerta del evento (check-in): la usa quien recibe a los invitados, desde el celular.
// Buscador + lector de QR (el QR es el link personal del invitado: su "pase de entrada").
// Lector: BarcodeDetector donde existe (Android) y jsQR en el resto (iPhone).
// Se actualiza sola cada 10 segundos, así varias personas pueden recibir a la vez.

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

export function checkinHTML({ id, t, nombres }) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Recepción · ${esc(nombres)}</title>
<link rel="stylesheet" href="/comun/fonts/google/great-vibes+jost.css">
<style>
  :root { --acento: #4e9c87; --borde: #e2e0dc; --suave: #6b706c; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Jost, system-ui, sans-serif; background: #f6f5f3; color: #1f2421; }
  header { position: sticky; top: 0; z-index: 5; background: #fff; border-bottom: 1px solid var(--borde); padding: 12px 16px; }
  h1 { margin: 0; font-size: 1.1rem; } h1 small { display: block; color: var(--suave); font-weight: 400; font-size: .85rem; }
  .cifras { display: flex; gap: 8px; margin: 10px 0; }
  .cifras div { flex: 1; background: #f6f5f3; border-radius: 12px; padding: 8px; text-align: center; }
  .cifras strong { display: block; font-size: 1.4rem; } .cifras span { font-size: .75rem; color: var(--suave); }
  .barra { display: flex; gap: 8px; }
  input[type=search] { flex: 1; min-width: 0; font: inherit; font-size: 1rem; padding: 10px 14px; border: 1px solid var(--borde); border-radius: 999px; }
  button { font: inherit; cursor: pointer; }
  .btn { border: 1px solid var(--acento); background: var(--acento); color: #fff; border-radius: 999px; padding: 9px 16px; font-weight: 600; white-space: nowrap; }
  .btn.sec { background: #fff; color: var(--acento); }
  .filtros { display: flex; gap: 6px; margin-top: 10px; overflow-x: auto; }
  .filtros button { border: 1px solid var(--borde); background: #fff; border-radius: 999px; padding: 5px 12px; font-size: .85rem; white-space: nowrap; }
  .filtros button.activo { background: #1f2421; color: #fff; border-color: #1f2421; }
  main { padding: 12px 16px 80px; max-width: 720px; margin: 0 auto; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  li { background: #fff; border: 1px solid var(--borde); border-radius: 14px; padding: 12px; display: flex; align-items: center; gap: 10px; }
  li.llego { border-color: var(--acento); background: #f1f8f5; }
  li.foco { outline: 3px solid #e0a100; }
  .datos { flex: 1; min-width: 0; } .datos b { display: block; } .datos small { color: var(--suave); display: block; }
  .no { color: #b3261e; }
  .contador { display: flex; align-items: center; gap: 6px; }
  .contador button { width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--borde); background: #fff; font-size: 1.1rem; }
  .contador span { min-width: 22px; text-align: center; font-weight: 700; }
  .vacio { text-align: center; color: var(--suave); padding: 30px 0; }
  dialog { border: 0; border-radius: 18px; padding: 0; width: min(92vw, 420px); }
  dialog::backdrop { background: rgba(0,0,0,.55); }
  .camara { position: relative; background: #000; aspect-ratio: 1; }
  .camara video { width: 100%; height: 100%; object-fit: cover; display: block; }
  .camara::after { content: ''; position: absolute; inset: 18%; border: 3px solid rgba(255,255,255,.85); border-radius: 18px; }
  .pie { padding: 14px; text-align: center; } .pie p { margin: 0 0 10px; }
  .aviso { position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); background: #1f2421; color: #fff; padding: 10px 18px; border-radius: 999px; z-index: 50; max-width: 90vw; text-align: center; }
</style></head>
<body>
<header>
  <h1>Recepción de invitados<small>${esc(nombres)}</small></h1>
  <div class="cifras"><div><strong id="c-llegaron">0</strong><span>llegaron</span></div><div><strong id="c-esperan">0</strong><span>se esperan</span></div><div><strong id="c-faltan">0</strong><span>faltan</span></div></div>
  <div class="barra"><input id="q" type="search" placeholder="Buscar por nombre o mesa…" autocomplete="off"><button class="btn" id="escanear" type="button">Escanear QR</button></div>
  <div class="filtros" id="filtros"><button type="button" data-f="todos" class="activo">Todos</button><button type="button" data-f="faltan">Faltan</button><button type="button" data-f="llegaron">Llegaron</button></div>
</header>
<main><ul id="lista"></ul><p class="vacio" id="vacio" hidden>No hay invitados con ese nombre.</p></main>
<dialog id="lector"><div class="camara"><video id="video" playsinline muted></video></div>
  <div class="pie"><p id="lector-txt">Apuntar al QR del invitado (su pase de entrada o el link de su invitación).</p><button class="btn sec" type="button" id="cerrar-lector">Cerrar</button></div></dialog>
<dialog id="ficha"><div class="pie" id="ficha-cuerpo"></div></dialog>
<script>
(function () {
  var E = ${json(id)}, T = ${json(t)}, gente = [], filtro = 'todos';
  var $ = function (s) { return document.querySelector(s); };
  function aviso(m) { var a = document.createElement('div'); a.className = 'aviso'; a.textContent = m; document.body.append(a); setTimeout(function () { a.remove(); }, 2200); }
  function cargar() {
    return fetch('/api/puerta?e=' + encodeURIComponent(E) + '&t=' + encodeURIComponent(T), { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (d) { if (d.invitados) { gente = d.invitados; pintar(); } }).catch(function () {});
  }
  function marcar(i, personas) {
    i.llegaron = personas; i.llego = personas > 0 ? new Date().toISOString() : ''; pintar();
    return fetch('/api/puerta', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ e: E, t: T, codigo: i.codigo, personas: personas }) })
      .then(function (r) { if (!r.ok) throw 0; }).catch(function () { aviso('No se pudo guardar. Revisar la conexión.'); cargar(); });
  }
  var sinTildes = function (x) { return String(x || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, ''); };
  function pintar() {
    var q = sinTildes($('#q').value.trim());
    var llegaron = gente.reduce(function (s, i) { return s + (i.llegaron || 0); }, 0);
    var esperan = gente.reduce(function (s, i) { return s + i.esperan; }, 0);
    $('#c-llegaron').textContent = llegaron; $('#c-esperan').textContent = esperan; $('#c-faltan').textContent = Math.max(0, esperan - llegaron);
    var vis = gente.filter(function (i) {
      if (filtro === 'faltan' && (i.llegaron || !i.esperan)) return false;
      if (filtro === 'llegaron' && !i.llegaron) return false;
      return !q || sinTildes(i.nombre + ' ' + i.integrantes).indexOf(q) >= 0 || sinTildes('mesa ' + i.mesa) === q || String(i.mesa) === q;
    });
    $('#vacio').hidden = vis.length > 0;
    $('#lista').replaceChildren.apply($('#lista'), vis.map(fila));
  }
  function fila(i) {
    var li = document.createElement('li'); li.className = i.llegaron ? 'llego' : ''; li.id = 'i-' + i.codigo;
    var d = document.createElement('div'); d.className = 'datos';
    var b = document.createElement('b'); b.textContent = i.nombre;
    var s = document.createElement('small');
    s.textContent = [i.mesa ? 'Mesa ' + i.mesa : 'Sin mesa', i.respondio === 'No' ? 'Avisó que no va' : i.esperan + (i.esperan === 1 ? ' persona' : ' personas'), i.integrantes].filter(Boolean).join(' · ');
    if (i.respondio === 'No') s.className = 'no';
    d.append(b, s); li.append(d);
    if (i.llegaron) {
      var c = document.createElement('div'); c.className = 'contador';
      var menos = document.createElement('button'); menos.type = 'button'; menos.textContent = '−'; menos.setAttribute('aria-label', 'Una persona menos');
      menos.onclick = function () { marcar(i, i.llegaron - 1); };
      var n = document.createElement('span'); n.textContent = i.llegaron;
      var mas = document.createElement('button'); mas.type = 'button'; mas.textContent = '+'; mas.setAttribute('aria-label', 'Una persona más');
      mas.onclick = function () { marcar(i, i.llegaron + 1); };
      c.append(menos, n, mas); li.append(c);
    } else {
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn'; btn.textContent = 'Llegó';
      btn.onclick = function () { marcar(i, Math.max(1, i.esperan)); };
      li.append(btn);
    }
    return li;
  }
  // Ficha del invitado escaneado: un toque para confirmar la llegada
  function mostrarFicha(i) {
    var c = $('#ficha-cuerpo'); c.replaceChildren();
    var h = document.createElement('h2'); h.textContent = i.nombre; h.style.margin = '6px 0';
    var p = document.createElement('p'); p.textContent = [i.mesa ? 'Mesa ' + i.mesa : 'Sin mesa', i.esperan + (i.esperan === 1 ? ' persona' : ' personas')].join(' · ');
    var ya = document.createElement('p'); ya.textContent = i.llegaron ? '✓ Ya registrado (' + i.llegaron + ')' : (i.respondio === 'No' ? 'Había avisado que no iba' : ''); ya.style.color = '#4e9c87';
    var ok = document.createElement('button'); ok.className = 'btn'; ok.type = 'button'; ok.textContent = i.llegaron ? 'Listo' : 'Confirmar llegada';
    ok.onclick = function () { if (!i.llegaron) marcar(i, Math.max(1, i.esperan)); $('#ficha').close(); abrirLector(); };
    var no = document.createElement('button'); no.className = 'btn sec'; no.type = 'button'; no.textContent = 'Cerrar'; no.style.marginLeft = '8px';
    no.onclick = function () { $('#ficha').close(); };
    c.append(h, p, ya, ok, no); $('#ficha').showModal();
  }
  // ── Lector de QR ──
  var flujo = null, detector = null, corriendo = false, lienzo = document.createElement('canvas');
  function codigoDe(texto) {
    try { var u = new URL(texto); return u.searchParams.get('inv') || ''; } catch (e) { var m = /inv=([^&\\s]+)/.exec(texto); return m ? decodeURIComponent(m[1]) : ''; }
  }
  function leido(texto) {
    var cod = codigoDe(texto), i = gente.find(function (x) { return x.codigo === cod; });
    if (!i) { $('#lector-txt').textContent = 'Ese QR no es de un invitado de la lista.'; return false; }
    cerrarLector(); mostrarFicha(i); return true;
  }
  function cuadro() {
    if (!corriendo) return;
    var v = $('#video');
    if (v.readyState >= 2) {
      if (detector) {
        detector.detect(v).then(function (r) { if (r[0] && leido(r[0].rawValue)) return; requestAnimationFrame(cuadro); }).catch(function () { requestAnimationFrame(cuadro); });
        return;
      }
      if (window.jsQR) {
        var w = 480, hh = Math.round(w * v.videoHeight / v.videoWidth); lienzo.width = w; lienzo.height = hh;
        var cx = lienzo.getContext('2d', { willReadFrequently: true }); cx.drawImage(v, 0, 0, w, hh);
        var r = window.jsQR(cx.getImageData(0, 0, w, hh).data, w, hh, { inversionAttempts: 'dontInvert' });
        if (r && leido(r.data)) return;
      }
    }
    setTimeout(function () { requestAnimationFrame(cuadro); }, 120);
  }
  function abrirLector() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { aviso('Este navegador no permite usar la cámara. Usar el buscador.'); return; }
    var listo = ('BarcodeDetector' in window) ? Promise.resolve(detector = new window.BarcodeDetector({ formats: ['qr_code'] })) : cargarJsQR();
    listo.then(function () { return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); }).then(function (s) {
      flujo = s; var v = $('#video'); v.srcObject = s; v.play(); corriendo = true;
      $('#lector-txt').textContent = 'Apuntar al QR del invitado (su pase de entrada o el link de su invitación).';
      $('#lector').showModal(); cuadro();
    }).catch(function () { aviso('No se pudo abrir la cámara. Revisar el permiso del navegador.'); });
  }
  function cargarJsQR() {
    if (window.jsQR) return Promise.resolve();
    return new Promise(function (ok, mal) { var s = document.createElement('script'); s.src = '/comun/js/jsqr.min.js'; s.onload = ok; s.onerror = mal; document.head.append(s); });
  }
  function cerrarLector() { corriendo = false; if (flujo) flujo.getTracks().forEach(function (x) { x.stop(); }); flujo = null; if ($('#lector').open) $('#lector').close(); }
  $('#escanear').onclick = abrirLector;
  $('#cerrar-lector').onclick = cerrarLector;
  $('#lector').addEventListener('close', function () { corriendo = false; if (flujo) cerrarLector(); });
  $('#q').addEventListener('input', pintar);
  [].forEach.call(document.querySelectorAll('#filtros button'), function (b) {
    b.onclick = function () { filtro = b.dataset.f; [].forEach.call(document.querySelectorAll('#filtros button'), function (x) { x.classList.toggle('activo', x === b); }); pintar(); };
  });
  cargar(); setInterval(function () { if (!document.hidden && !$('#ficha').open) cargar(); }, 10000);
})();
</script>
</body></html>`;
}
