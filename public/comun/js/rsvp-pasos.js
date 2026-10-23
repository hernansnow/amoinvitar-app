/* Confirmación de asistencia por pasos (común a todas las invitaciones).
   1. ¿Asistirás? (y el nombre, si no viene del link personal)
   2. ¿Con acompañantes? Sí → los nombres en el mismo paso (no hace falta completarlos todos)
   3. Una pregunta por paso: restricciones, alcohol, niños, traslado, preguntas propias
   4. Mensaje para los anfitriones (opcional)  →  Enviar
   Los textos y las preguntas vienen en #rsvp-config (componentes/bloques.js → rsvpForm).
   Lo que se envía es lo mismo que antes (nombre, asiste, acompanantes, comida…, labels), más "mensaje". */
document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('rsvp-form');
  var cfgEl = document.getElementById('rsvp-config');
  if (!form || !cfgEl) return;
  var cfg = cfgEl.dataset;
  var t = function (k, d) { return cfg[k] != null && cfg[k] !== '' ? cfg[k] : (d || ''); };
  var si = function (k) { return cfg[k] === 'true'; };
  var url = (window.INVITACION_CONFIG && window.INVITACION_CONFIG.rsvp_url) || cfg.url;
  var params = new URLSearchParams(location.search);
  var inv = params.get('inv') || params.get('id') || 'inv-' + Date.now();
  var invitado = window.INVITADO_DATA || null;
  window.addEventListener('invitado-ready', function () { invitado = window.INVITADO_DATA; reiniciar(); });
  window.addEventListener('invitado-bloqueado', function () { form.style.display = 'none'; });

  // Estado de las respuestas
  var r, paso, caja;
  function reiniciar() {
    r = { nombre: invitado && invitado.nombre ? invitado.nombre : '', asiste: '', conAcomp: '', acomp: [], comida: '', comidaOtra: '', comidaAcomp: '',
      alcohol: '', ninos: '', ninosCant: '', traslado: '', extras: {}, mensaje: '' };
    paso = 0;
    dibujar();
  }

  // ¿Cuántos acompañantes puede sumar?
  function maxAcomp() {
    var pases = parseInt(invitado && invitado.pases, 10) || 0;
    if (invitado && invitado.nombre) return pases;
    return parseInt(cfg.maxAcompanantesLibre, 10) || 0;
  }
  function extras() {
    var lista = [];
    for (var i = 1; i <= 5; i++) {
      var suf = i === 1 ? '' : String(i);
      if (!si('preguntasExtra' + suf)) continue;
      lista.push({ campo: 'extra' + suf, label: t('labelExtra' + suf), tipo: cfg['extraTipo' + suf], opciones: (cfg['extraOpciones' + suf] || '').split('|').filter(Boolean) });
    }
    return lista;
  }
  // Los pasos según lo que va respondiendo
  function pasos() {
    var p = ['asiste'];
    if (r.asiste === 'No') { if (si('preguntasMensaje')) p.push('mensaje'); return p; }
    if (r.asiste !== 'Si') return p;
    if (maxAcomp() > 0) p.push('acomp');
    if (si('preguntasComida')) p.push('comida');
    if (si('preguntasAlcohol')) p.push('alcohol');
    if (si('preguntasNinos')) p.push('ninos');
    if (si('preguntasTraslado')) p.push('traslado');
    extras().forEach(function (x) { p.push('extra:' + x.campo); });
    if (si('preguntasMensaje')) p.push('mensaje');
    return p;
  }

  // ── Piezas ──
  function h(tag, attrs, hijos) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), attrs[k]);
      else if (k === 'class') e.className = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    }
    [].concat(hijos || []).forEach(function (c) { if (c != null && c !== false) e.appendChild(c.nodeType ? c : document.createTextNode(c)); });
    return e;
  }
  function opciones(valores, actual, alElegir) {
    return h('div', { class: 'rp-opciones' }, valores.map(function (o) {
      return h('button', { type: 'button', class: 'rp-opcion' + (actual === o.v ? ' elegida' : ''), 'aria-pressed': actual === o.v ? 'true' : 'false',
        onclick: function () { alElegir(o.v); } }, o.etiqueta);
    }));
  }
  var SI_NO = function (no) { return [{ v: 'Si', etiqueta: t('textSi', 'Sí') }, { v: 'No', etiqueta: no || t('textNo', 'No') }]; };
  function error(msg) { var e = caja.querySelector('.rp-error'); if (e) { e.textContent = msg; e.hidden = !msg; } }

  // ── Cada paso ──
  function contenido(id) {
    var avanzar = function () { siguiente(); };
    if (id === 'asiste') {
      var nombre = invitado && invitado.nombre ? null : h('input', { type: 'text', class: 'rp-input', name: 'nombre', maxlength: 120, autocomplete: 'name',
        placeholder: t('labelNombre'), value: r.nombre, oninput: function (e) { r.nombre = e.target.value; } });
      return [invitado && invitado.nombre ? h('p', { class: 'rp-hola' }, invitado.nombre) : null, nombre,
        h('p', { class: 'rp-pregunta' }, t('labelAsiste')),
        opciones([{ v: 'Si', etiqueta: t('textSiAsiste') }, { v: 'No', etiqueta: t('textNoAsiste') }], r.asiste, function (v) {
          if (!String(r.nombre).trim()) { error(t('msgCamposVacios')); nombre && nombre.focus(); return; }
          r.asiste = v; avanzar();
        })];
    }
    if (id === 'acomp') {
      var max = maxAcomp();
      var lista = h('div', { class: 'rp-acomp', hidden: r.conAcomp !== 'Si' });
      for (var i = 0; i < max; i++) {
        (function (i) {
          lista.appendChild(h('input', { type: 'text', class: 'rp-input', maxlength: 120, placeholder: t('textAcompanante', 'Acompañante') + ' ' + (i + 1),
            value: r.acomp[i] || '', oninput: function (e) { r.acomp[i] = e.target.value; } }));
        })(i);
      }
      return [h('p', { class: 'rp-pregunta' }, t('labelAcompanantesSelect')),
        opciones(SI_NO(t('textNoAcompanantes')), r.conAcomp, function (v) { r.conAcomp = v; if (v === 'No') avanzar(); else { dibujar(); var x = caja.querySelector('.rp-acomp input'); x && x.focus(); } }),
        h('p', { class: 'rp-ayuda', hidden: r.conAcomp !== 'Si' }, t('labelAcompanantesNombres')), lista];
    }
    if (id === 'comida') {
      var ops = t('comidaOpciones', 'No').split('|').map(function (x) { return { v: x, etiqueta: x }; }).concat([{ v: '__otra', etiqueta: t('textOtra', 'Otra') }]);
      var otra = h('input', { type: 'text', class: 'rp-input', maxlength: 200, placeholder: t('textDetalle'), value: r.comidaOtra, hidden: r.comida !== '__otra',
        oninput: function (e) { r.comidaOtra = e.target.value; } });
      var acomp = r.conAcomp === 'Si' && r.acomp.some(function (x) { return x && x.trim(); });
      return [h('p', { class: 'rp-pregunta' }, t('labelComida')),
        opciones(ops, r.comida, function (v) { r.comida = v; if (v === '__otra' || acomp) { dibujar(); var x = caja.querySelector('.rp-input'); x && x.focus(); } else avanzar(); }), otra,
        acomp ? h('textarea', { class: 'rp-input', rows: 2, maxlength: 300, placeholder: t('labelComidaAcomp'), oninput: function (e) { r.comidaAcomp = e.target.value; } }, r.comidaAcomp) : null];
    }
    if (id === 'alcohol') return [h('p', { class: 'rp-pregunta' }, t('labelAlcohol')), opciones(SI_NO(), r.alcohol, function (v) { r.alcohol = v; avanzar(); })];
    if (id === 'ninos') {
      var cant = h('input', { type: 'number', class: 'rp-input rp-numero', min: 1, max: 20, inputmode: 'numeric', placeholder: t('labelNinosInput'), value: r.ninosCant,
        hidden: r.ninos !== 'Si', oninput: function (e) { r.ninosCant = e.target.value; } });
      return [h('p', { class: 'rp-pregunta' }, t('labelNinos')),
        opciones(SI_NO(), r.ninos, function (v) { r.ninos = v; if (v === 'No') avanzar(); else { dibujar(); var x = caja.querySelector('.rp-numero'); x && x.focus(); } }), cant];
    }
    if (id === 'traslado') return [h('p', { class: 'rp-pregunta' }, t('labelTraslado')), t('sublabelTraslado') ? h('p', { class: 'rp-ayuda' }, t('sublabelTraslado')) : null,
      opciones(SI_NO(t('textNoTraslado')), r.traslado, function (v) { r.traslado = v; avanzar(); })];
    if (id.indexOf('extra:') === 0) {
      var x = extras().filter(function (e) { return e.campo === id.slice(6); })[0];
      if (x.opciones.length) return [h('p', { class: 'rp-pregunta' }, x.label), opciones(x.opciones.map(function (o) { return { v: o, etiqueta: o }; }), r.extras[x.campo], function (v) { r.extras[x.campo] = v; avanzar(); })];
      return [h('p', { class: 'rp-pregunta' }, x.label), h('textarea', { class: 'rp-input', rows: 2, maxlength: 400, oninput: function (e) { r.extras[x.campo] = e.target.value; } }, r.extras[x.campo] || '')];
    }
    if (id === 'mensaje') return [h('p', { class: 'rp-pregunta' }, t('labelMensaje')),
      h('textarea', { class: 'rp-input rp-mensaje', rows: 4, maxlength: 600, placeholder: t('placeholderMensaje'), oninput: function (e) { r.mensaje = e.target.value; } }, r.mensaje)];
    return [];
  }

  function dibujar() {
    var lista = pasos();
    if (paso >= lista.length) paso = lista.length - 1;
    var id = lista[paso];
    var ultimo = paso === lista.length - 1 && r.asiste !== '';
    caja = h('div', { class: 'rp-paso', 'data-paso': id });
    var puntos = h('div', { class: 'rp-puntos', 'aria-hidden': 'true' }, lista.map(function (_, i) { return h('span', { class: i === paso ? 'activo' : i < paso ? 'hecho' : '' }); }));
    contenido(id).forEach(function (c) { if (c) caja.appendChild(c); });
    caja.appendChild(h('p', { class: 'rp-error', role: 'alert', hidden: true }));
    var nav = h('div', { class: 'rp-nav' }, [
      paso > 0 ? h('button', { type: 'button', class: 'rp-atras', onclick: function () { paso--; dibujar(); } }, '← ' + t('textAtras', 'Atrás')) : h('span'),
      ultimo ? h('button', { type: 'submit', class: 'rp-enviar' }, t('textBtnSubmit', 'Enviar'))
        : (id === 'asiste' ? null : h('button', { type: 'button', class: 'rp-siguiente', onclick: siguiente }, t('textSiguiente', 'Siguiente') + ' →')),
    ]);
    form.replaceChildren(puntos, caja, nav);
  }
  function siguiente() {
    var lista = pasos();
    if (lista[paso] === 'asiste' && !r.asiste) { error(t('msgCamposVacios')); return; }
    if (paso < lista.length - 1) { paso++; dibujar(); } else dibujar();
    var foco = form.querySelector('.rp-input, .rp-opcion'); if (foco && foco.focus) foco.focus({ preventScroll: true });
  }

  // ── Enviar ──
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = form.querySelector('.rp-enviar'); if (!btn || btn.disabled) return;
    var datos = { nombre: r.nombre.trim(), asiste: r.asiste }, labels = { nombre: t('labelNombre', 'Nombre'), asiste: t('labelAsiste', 'Asistirá') };
    var poner = function (campo, valor, label) { if (valor != null && String(valor).trim() !== '') { datos[campo] = String(valor).trim(); labels[campo] = label; } };
    if (r.asiste === 'Si') {
      var nombres = r.acomp.slice(0, maxAcomp()).map(function (x) { return (x || '').trim(); }).filter(Boolean);
      if (r.conAcomp === 'No' || (maxAcomp() > 0 && !nombres.length && r.conAcomp)) poner('acompanantes', t('textNoAcompanantes', 'No'), t('labelAcompanante', 'Acompañantes'));
      else if (nombres.length) poner('acompanantes', nombres.join(', '), t('labelAcompanante', 'Acompañantes'));
      poner('comida', r.comida === '__otra' ? (r.comidaOtra || t('textOtra', 'Otra')) : r.comida, t('labelComida', 'Restricción alimentaria'));
      poner('comida_acomp', r.comidaAcomp, t('labelComidaAcomp', 'Restricción de acompañantes'));
      poner('alcohol', r.alcohol, t('labelAlcohol', 'Alcohol'));
      poner('ninos', r.ninos === 'Si' && r.ninosCant ? r.ninosCant : r.ninos, t('labelNinos', 'Niños'));
      poner('traslado', r.traslado, t('labelTraslado', 'Traslado'));
      extras().forEach(function (x) { poner(x.campo, r.extras[x.campo], x.label); });
    }
    poner('mensaje', r.mensaje, t('labelMensaje', 'Mensaje'));
    var fd = new FormData();
    fd.set('event_id', (window.INVITACION_CONFIG && window.INVITACION_CONFIG.event_id) || '');
    fd.set('inv', inv);
    for (var k in datos) fd.set(k, datos[k]);
    fd.set('labels', JSON.stringify(labels));
    btn.disabled = true; var original = btn.textContent; btn.textContent = t('textEnviando', 'Enviando…');
    fetch(url, { method: 'POST', body: fd }).then(function (x) { return x.json(); }).then(function (res) {
      if (res.result !== 'ok') throw Object.assign(new Error('rsvp'), { lleno: !!res.lleno });
      form.replaceChildren(h('div', { class: 'rp-listo' }, [h('p', { class: 'rp-listo-icono', 'aria-hidden': 'true' }, r.asiste === 'Si' ? '🎉' : '💌'),
        h('p', {}, r.asiste === 'Si' ? t('msgOk') : t('msgNoAsiste'))]));
    }).catch(function (err) {
      btn.disabled = false; btn.textContent = original;
      error(err.lleno ? t('msgLleno') : t('msgError'));
    });
  });

  // Cada vez que se abre, desde el principio (si todavía no envió)
  window.addEventListener('ai-modal-abierto', function (e) { if (e.detail && e.detail.id === '#confirmar-rsvp' && !form.querySelector('.rp-listo')) reiniciar(); });
  reiniciar();
});

// ── Sugerir canciones (formulario de la sección Canciones) ──
function enviarCancion() {
  var cfg = (document.getElementById('canciones-config') || {}).dataset || {};
  var input = document.getElementById('input-cancion'), btn = document.getElementById('btn-cancion');
  var cancion = input.value.trim();
  if (!cancion) { mostrarMsgCancion(cfg.msgVacio, 'error'); return; }
  btn.disabled = true; btn.textContent = cfg.msgEnviando;
  var fd = new FormData();
  fd.set('action', 'cancion'); fd.set('event_id', window.INVITACION_CONFIG && window.INVITACION_CONFIG.event_id); fd.set('cancion', cancion);
  fetch(window.INVITACION_CONFIG && window.INVITACION_CONFIG.rsvp_url, { method: 'POST', body: fd })
    .then(function (r) { return r.json(); })
    .then(function (data) { btn.disabled = false; btn.textContent = cfg.textoBtn; if (data.result === 'ok') { input.value = ''; mostrarMsgCancion(cfg.msgOk, 'ok'); } else mostrarMsgCancion(cfg.msgError, 'error'); })
    .catch(function () { btn.disabled = false; btn.textContent = cfg.textoBtn; mostrarMsgCancion(cfg.msgErrorConexion, 'error'); });
}
function mostrarMsgCancion(texto, tipo) {
  var msg = document.getElementById('msg-cancion');
  msg.textContent = texto; msg.style.display = 'block'; msg.style.color = tipo === 'ok' ? 'green' : 'crimson';
  setTimeout(function () { msg.style.display = 'none'; }, 5000);
}
