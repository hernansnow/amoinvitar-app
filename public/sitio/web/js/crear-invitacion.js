/* Crear invitación: pestañas con los modelos de cada evento, vista previa navegable y "Personalizar".
   Uso: <div class="ci-widget" data-evento="boda"></div> (sin data-evento: con selector de tipo de evento).
   Los modelos y precios vienen de la app (app.amoinvitar.com/api/tienda/catalogo); las miniaturas son las del sitio. */
(function () {
  'use strict';
  var yo = document.currentScript;
  // Raíz del sitio (las páginas de país están un nivel más abajo: ../img)
  var RAIZ = yo ? yo.src.replace(/js\/[^/]*$/, '') : '/';
  // data-app="" = la app está en el mismo dominio (la web nueva servida por el Worker); sin el atributo, app.amoinvitar.com
  var APP = yo && yo.hasAttribute('data-app') ? yo.getAttribute('data-app') : 'https://app.amoinvitar.com';
  // data-img: dónde están las miniaturas de los celulares (p_*.jpg, std-*.jpg) — en la web vieja, /img/
  var IMG = (yo && yo.getAttribute('data-img')) || RAIZ + 'img/';
  // data-raiz: la raíz para los links internos (empresarial#online, crear-invitacion)
  if (yo && yo.getAttribute('data-raiz')) RAIZ = yo.getAttribute('data-raiz');

  var EVENTOS = [
    { slug: 'boda', tipo: 'boda', nombre: 'Boda', dos: true, pagina: 'bodas' },
    { slug: '15-anos', tipo: '15', nombre: '15 años', pagina: 'mis15' },
    { slug: 'bautismo', tipo: 'bautismo', nombre: 'Bautismo', pagina: 'bautismo' },
    { slug: 'comunion', tipo: 'comunion', nombre: 'Comunión', pagina: 'comunion' },
    { slug: 'cumpleanos', tipo: 'cumple', nombre: 'Cumpleaños', pagina: 'cumple' },
    { slug: 'infantil', tipo: 'infantil', nombre: 'Infantil', pagina: 'infantiles' },
    { slug: 'baby-shower', tipo: 'babyshower', nombre: 'Baby shower / Revelación', pagina: 'infantiles' },
    { slug: 'graduacion', tipo: 'graduacion', nombre: 'Egreso / Graduación', pagina: 'graduacion' },
    { slug: 'navidad', tipo: 'navidad', nombre: 'Navidad' },
    { slug: 'empresarial', tipo: 'empresarial', nombre: 'Empresarial / Corporativo', pagina: 'empresarial' }
  ];
  // Save The Date: en estos eventos (la web Classic/Soft y la foto, solo boda y 15)
  var CON_STD = ['boda', '15', 'cumple', 'bautismo', 'comunion', 'infantil', 'babyshower'];
  var CON_FOTO = ['boda', '15'];

  // Orden de los modelos como en las páginas de cada evento (los que no están, después)
  var ORDEN = {
    boda: 'cinema lila lovestory garden rockabilly romantic travel elegance disco hojas sky beach byn rouge minimal oliva armonia vintage white black euforia aquarella passion floral graffiti',
    '15': 'cinema lila luxury garden style disco graffiti romantic travel rockabilly armonia hojas sky black white beach minimal natural byn passion floral euforia aquarella sweet rouge',
    bautismo: 'amanecer garden rosa celeste', comunion: 'garden amanecer', cumple: 'natural disco minimal black', graduacion: 'estilo marino oro esmeralda disco',
    infantil: 'peppa cars monster'
  };
  function ordenar(lista, t) {
    var o = (ORDEN[t] || '').split(' ');
    var pos = function (m) { var i = o.indexOf(m.id); return i < 0 ? 999 : i; };
    return lista.map(function (m, i) { return { m: m, i: i }; }).sort(function (a, b) { return pos(a.m) - pos(b.m) || a.i - b.i; }).map(function (x) { return x.m; });
  }

  var catalogo = null, pedido = null;
  function cargarCatalogo() {
    if (!pedido) pedido = Promise.all([
      fetch(APP + '/api/tienda/catalogo').then(function (r) { if (!r.ok) throw new Error(); return r.json(); }),
      fetch(IMG + 'manifest.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
    ]).then(function (x) { x[0].muestras = x[1]; return x[0]; });
    return pedido;
  }

  // ── Utilidades ─────────────────────────────────────────────────────
  function el(tag, attrs) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) {
      var h = arguments[i];
      if (h == null || h === false) continue;
      [].concat(h).forEach(function (x) { if (x != null && x !== false) e.append(x.nodeType ? x : document.createTextNode(x)); });
    }
    return e;
  }
  var clave = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ''); };
  function evento(slugOTipo) { return EVENTOS.filter(function (e) { return e.slug === slugOTipo || e.tipo === slugOTipo; })[0] || null; }
  // Imagen con alternativas: si una no está, prueba la siguiente
  function imagen(lista, alt) {
    var i = 0, img = el('img', { src: lista[0], alt: alt || '', loading: 'lazy' });
    img.addEventListener('error', function () { i++; if (i < lista.length) img.src = lista[i]; });
    return img;
  }
  function serie(base, n, ext) { var r = []; for (var i = 1; i <= n; i++) r.push(IMG + base + i + (ext || '.jpg')); return r; }

  // Miniaturas del sitio (celular) para cada modelo y evento; si no hay, la de la app
  function miniaturas(m, tipo) {
    var ks = [clave(m.nombres && m.nombres[tipo]), clave(m.nombre), m.id].filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    var pref = { boda: [''], '15': [''], bautismo: ['bautismo-', 'bautizo-'], comunion: ['comunion-'], cumple: ['cumple-'], graduacion: ['egreso-', 'graduacion-'], babyshower: ['baby-shower-'], revelacion: ['baby-shower-'], infantil: ['infantil-'], navidad: [''] }[tipo] || [''];
    var suf = tipo === '15' ? ['15', '15-1', '1'] : tipo === 'boda' ? ['', '1'] : [''];
    var r = [];
    ks.forEach(function (k) { pref.forEach(function (p) { suf.forEach(function (s) { r.push(IMG + 'p_' + p + k + s + '.jpg'); }); }); });
    r.push(APP + '/modelos/' + m.id + '/tienda-' + tipo + '.jpg');
    (m.propios || []).forEach(function (e) { if (e !== tipo) r.push(APP + '/modelos/' + m.id + '/tienda-' + e + '.jpg'); });
    r.push(APP + '/modelos/' + m.id + '/miniatura.jpg', IMG + 'p_pronto.jpg');
    return r;
  }

  // ── Lo que se muestra en cada pestaña ──────────────────────────────
  function itemsDe(ev, c) {
    var t = ev.tipo, tabs = [];
    var invit = [], std = [], adic = [];
    var medida = { id: 'a-medida', nombre: 'Diseño a medida', medida: true, imgs: [IMG + 'p_a-medida.jpg'],
      ejemplos: RAIZ + 'ejemplos-a-medida#invitacion',
      link: { producto: 'a-medida', evento: t }, precio: c.aMedida && c.aMedida.texto };
    invit.push(medida);
    if (t !== 'empresarial') {
      ordenar(c.modelos, t).forEach(function (m) {
        if (m.eventos.indexOf(t) < 0) return;
        // Dentro de un grupo (Cumpleaños → infantil, Baby shower → revelación): el tipo propio del diseño
        var real = (m.propios || m.eventos).indexOf(t) >= 0 ? t : (t === 'cumple' ? 'infantil' : t === 'babyshower' ? 'revelacion' : t);
        invit.push({ id: m.id, nombre: (m.nombres && m.nombres[real]) || (m.nombres && m.nombres[t]) || m.nombre, gratis: m.gratis, desde: m.gratis ? cero(c) : desdeBasic(c), imgs: miniaturas(m, real),
          demo: APP + '/demo/' + m.id + '?evento=' + encodeURIComponent(real) + '&paquete=deluxe', link: { producto: 'invitacion', modelo: m.id, evento: real }, dos: t === 'boda' });
      });
    }
    // README (ronda 39): en Cumpleaños los infantiles se reparten entre los de adultos (no quedan todos al final)
    if (t === 'cumple') {
      var primero = invit.slice(0, 1), resto = invit.slice(1);
      var inf = resto.filter(function (x) { return x.link && x.link.evento === 'infantil'; }), adu = resto.filter(function (x) { return !(x.link && x.link.evento === 'infantil'); });
      var mezcla = [], k = 0;
      adu.forEach(function (x, i) { mezcla.push(x); if ((i + 1) % 3 === 2 && k < inf.length) mezcla.push(inf[k++]); });
      while (k < inf.length) mezcla.push(inf[k++]);
      invit = primero.concat(mezcla);
    }
    tabs.push({ id: 'web', nombre: 'Invitación web', items: invit });

    // README (ronda 30): la web y la foto, solo boda y 15; la tarjeta del diseño, en los eventos que la tienen; las dos a
    // medida, en todos los eventos
    {
      (c.stdWeb || []).forEach(function (m) {
        if (m.eventos.indexOf(t) < 0) return;
        var img = IMG + (m.id === 'std-soft' ? 'std-web-soft.jpg' : t === '15' ? 'std-web15.jpg' : 'std-web-classic.jpg');
        std.push({ id: m.id, nombre: m.nombre, etiqueta: 'Save The Date', imgs: [img], demo: APP + '/demo/' + m.id + '?evento=' + t, link: { producto: 'std-web', modelo: m.id, evento: t }, precio: precioProducto(c, 'std-web'), fijo: true });
      });
      std.push({ id: 'std-web-medida', nombre: 'Web a medida', etiqueta: 'Save The Date', medida: true, imgs: [IMG + 'p_a-medida.jpg'], link: { producto: 'std-web-medida', evento: t }, precio: precioProducto(c, 'std-web-medida'), ejemplos: RAIZ + 'ejemplos-a-medida#std-web' });
      // Tarjeta del modelo: arranca con el primer diseño del evento que tiene tarjeta (en el panel se cambia)
      var conTarjeta = CON_STD.indexOf(t) < 0 ? [] : c.modelos.filter(function (m) { return m.eventos.indexOf(t) >= 0 && (c.tarjetaStd || []).indexOf(m.id) >= 0; });
      if (conTarjeta.length) {
        var mu = (c.muestras && c.muestras.tarjeta && c.muestras.tarjeta[t]) || [];
        var gal = mu.length ? mu.map(function (x) { return IMG + x.f; }) : conTarjeta.slice(0, 6).map(function (m) { return APP + '/modelos/' + m.id + '/img/std-fondo.jpg'; });
        std.push({ id: 'std-tarjeta', nombre: 'Tarjeta', etiqueta: 'Save The Date', imgs: gal, galeria: gal, link: { producto: 'std-tarjeta', modelo: conTarjeta[0].id, evento: t }, precio: precioProducto(c, 'std-tarjeta'), fijo: true });
      }
      if (CON_FOTO.indexOf(t) >= 0) {
        var mf = (c.muestras && c.muestras.foto && c.muestras.foto[t]) || [];
        var fotos = mf.length ? mf.map(function (x) { return IMG + x.f; }) : (t === '15' ? serie('std-15-foto', 5) : serie('std-foto', 5));
        std.push({ id: 'std-foto', nombre: 'Foto', etiqueta: 'Save The Date', imgs: fotos, galeria: fotos, link: { producto: 'std-foto', diseno: 'f1', evento: t }, precio: precioProducto(c, 'std-foto'), fijo: true });
      }
      std.push({ id: 'std-tarjeta-medida', nombre: 'Tarjeta a medida', etiqueta: 'Save The Date', medida: true, imgs: [IMG + 'p_a-medida.jpg'], link: { producto: 'std-tarjeta-medida', evento: t }, precio: precioProducto(c, 'std-tarjeta-medida'), ejemplos: RAIZ + 'ejemplos-a-medida#std-tarjeta' });
      tabs.push({ id: 'std', nombre: 'Save The Date', items: std });
    }

    (c.simples || []).forEach(function (m) {
      if (m.eventos.indexOf(t) < 0) return;
      var k = m.id === 'pedida' ? 'pedida-de-mano' : m.id;
      adic.push({ id: m.id, nombre: m.nombre, etiqueta: 'Web simple', imgs: [IMG + 'p_' + k + '.jpg', IMG + 'p_pronto.jpg'],
        demo: APP + '/demo/' + m.id + '?evento=' + t, link: { producto: 'compromiso-web', modelo: m.id, evento: t }, dos: t === 'boda', precio: precioProducto(c, 'compromiso-web'), fijo: true });
    });
    // README (ronda 39): la tarjeta de agradecimiento solo existe en boda y 15 años (en los demás eventos no hay pestaña «Adicional»)
    if (t === 'boda' || t === '15') {
      var mg = (c.muestras && c.muestras.gracias && c.muestras.gracias[t]) || [];
      var gr = mg.length ? mg.map(function (x) { return IMG + x.f; }) : (t === 'boda' ? serie('gracias-tarjeta', 8) : serie('gracias-15-tarjeta', 8));
      adic.push({ id: 'agradecimiento', nombre: 'Tarjeta', etiqueta: 'Agradecimiento', imgs: gr, galeria: gr, link: { producto: 'agradecimiento', diseno: 'g1', evento: t }, precio: precioProducto(c, 'agradecimiento'), fijo: true });
    }
    if (adic.length) tabs.push({ id: 'adicional', nombre: 'Adicional', items: adic });
    return tabs;
  }
  function precioProducto(c, id) { var p = (c.productos || []).filter(function (x) { return x.id === id; })[0]; return p && p.precio && p.precio.texto; }
  // «0 €» con el formato de la moneda del visitante (se toma el de Basic y se pone el número en cero)
  function cero(c) { var d = desdeBasic(c); return d ? d.replace(/[\d.,]+/, '0') : '0 €'; }
  function desdeBasic(c) { var p = (c.paquetes || []).filter(function (x) { return x.id === 'basic'; })[0]; return p && p.precio && p.precio.texto; }

  // ── Ventanas (una sola por página) ─────────────────────────────────
  var vista, form, actual = { lista: [], i: 0, ev: null };
  function ventanas() {
    if (vista) return;
    vista = el('dialog', { class: 'ci-dialogo ci-vista', 'aria-label': 'Vista previa' });
    form = el('dialog', { class: 'ci-dialogo ci-form', 'aria-label': 'Personalizar' });
    [vista, form].forEach(function (d) {
      d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
      document.body.append(d);
    });
    vista.addEventListener('close', function () { completa = false; vista.classList.remove('ci-completa'); var f = vista.querySelector('iframe'); if (f) f.src = 'about:blank'; });
  }
  function abrir(d) { if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute('open', ''); }

  function verDiseno(lista, i, ev) {
    ventanas();
    actual = { lista: lista.filter(function (x) { return x.demo || x.galeria; }), i: 0, ev: ev };
    actual.i = Math.max(0, actual.lista.indexOf(lista[i]));
    pintarVista();
    abrir(vista);
    ajustaCelular();
  }
  var completa = false; // vista previa a pantalla completa (se mantiene al pasar de un modelo al otro)
  function pintarVista() {
    var it = actual.lista[actual.i];
    var marco;
    if (it.demo) marco = el('div', { class: 'ci-celular' }, el('iframe', { src: it.demo, title: it.nombre }));
    else {
      var grande = el('img', { src: it.galeria[0], alt: it.nombre });
      marco = el('div', { class: 'ci-galeria' }, grande,
        el('div', { class: 'ci-tiras' }, it.galeria.map(function (src) { return el('button', { type: 'button', onclick: function () { grande.src = src; } }, el('img', { src: src, alt: '', loading: 'lazy' })); })));
    }
    var mover = function (d) { return function () { actual.i = (actual.i + d + actual.lista.length) % actual.lista.length; pintarVista(); }; };
    var varios = actual.lista.length > 1;
    var alternar = function () { completa = !completa; pintarVista(); };
    vista.classList.toggle('ci-completa', completa);
    vista.replaceChildren(el('div', { class: 'ci-vista-caja' + (completa ? ' ci-full' : '') },
      el('button', { type: 'button', class: 'ci-x', 'aria-label': 'Cerrar', onclick: function () { completa = false; vista.close(); } }, '×'),
      el('p', { class: 'ci-vista-nombre', text: it.nombre }),
      it.demo ? el('button', { type: 'button', class: 'ci-pantalla', 'aria-label': completa ? 'Salir de pantalla completa' : 'Ver a pantalla completa', onclick: alternar }, completa ? '⤡ Salir' : '⤢ Pantalla completa') : null,
      marco,
      el('div', { class: 'ci-vista-botones' },
        varios ? el('button', { type: 'button', class: 'ci-flecha', 'aria-label': 'Modelo anterior', onclick: mover(-1) }, '‹') : null,
        el('button', { type: 'button', class: 'ci-btn ci-btn-verde', onclick: function () { completa = false; vista.close(); personalizar(it, actual.ev); } }, 'Personalizar este diseño'),
        varios ? el('button', { type: 'button', class: 'ci-flecha', 'aria-label': 'Modelo siguiente', onclick: mover(1) }, '›') : null),
      varios && !completa ? el('p', { class: 'ci-ayuda-flechas', text: 'Usa las flechas para cambiar de modelo' }) : null));
    ajustaCelular();
  }
  // El celular de la vista previa tiene siempre la misma proporción; la invitación se escala adentro (como en el panel)
  function ajustaCelular() {
    var c = vista && vista.querySelector('.ci-celular'), f = c && c.querySelector('iframe');
    if (!f) return;
    if (completa) { f.style.cssText = 'width:100%;height:100%;transform:none'; return; }
    var k = c.clientWidth / 390;
    f.style.width = '390px'; f.style.height = Math.round(c.clientHeight / k) + 'px'; f.style.transform = 'scale(' + k + ')';
  }
  window.addEventListener('resize', ajustaCelular);

  function personalizar(it, ev, op) {
    op = op || {};
    ventanas();
    var dos = !!it.dos, largo = it.link.producto === 'invitacion' ? 15 : 20;
    var campo = function (id, etiqueta, ph) {
      return el('label', { class: 'ci-campo' }, el('span', { text: etiqueta }), el('input', { type: 'text', name: id, maxlength: largo, required: true, placeholder: ph, autocomplete: 'off' }));
    };
    var nombres = ev.tipo === 'empresarial' ? [campo('a', 'Nombre del evento o empresa', 'Lanzamiento 2027')]
      : dos ? [campo('a', 'Nombre 1', 'Lau'), campo('b', 'Nombre 2', 'Pablo')]
      : ev.tipo === 'babyshower' && it.link.evento === 'revelacion' ? [campo('a', 'Nombres', 'Dani & Marce')]
      : [campo('a', 'Nombre', 'Sofi')];
    var nota = it.medida
      ? 'Completa tu idea en el panel y envíala al equipo de diseño. Pagas solo cuando el proyecto esté aprobado' + (it.precio ? ' (desde ' + it.precio + ').' : '.')
      : it.gratis ? 'Después puedes cambiar todo en el panel. Este modelo es gratis: tienes tu link sin pagar nada.'
      : 'Después puedes cambiar todo en el panel. No pagas nada hasta publicar.';
    // README (ronda 39): el diseño a medida elige el tipo de evento acá mismo (salvo que se entre desde la página de un evento)
    var selTipo = op.selector ? el('select', { class: 'ci-select', 'aria-label': 'Tipo de evento', onchange: function () {
      var nuevo = evento(this.value), fecha = f.elements.fecha && f.elements.fecha.value;
      personalizar(Object.assign({}, it, { link: Object.assign({}, it.link, { evento: nuevo.tipo }) }), nuevo, Object.assign({}, op, { fecha: fecha }));
    } }, EVENTOS.filter(function (e) { return e.tipo !== 'infantil'; }).map(function (e) { return el('option', { value: e.slug, selected: e.tipo === ev.tipo, text: e.nombre }); })) : null;
    var f = el('form', { class: 'ci-form-caja', method: 'dialog' },
      el('h3', {}, op.titulo ? op.titulo : ['Personalizar ', el('strong', { text: it.etiqueta && !it.demo ? it.etiqueta + ' · ' + it.nombre : it.nombre })]),
      selTipo ? el('label', { class: 'ci-campo' }, el('span', { text: 'Tipo de evento' }), selTipo) : null,
      el('div', { class: 'ci-fila' + (nombres.length > 1 ? ' ci-dos' : '') }, nombres),
      el('label', { class: 'ci-campo ci-fecha' }, el('span', { text: 'Fecha del evento' }), el('input', { type: 'date', name: 'fecha', value: op.fecha || '' })),
      el('p', { class: 'ci-nota', text: nota }),
      el('button', { type: 'submit', class: 'ci-btn ci-btn-verde ci-grande' }, it.medida ? 'Comenzar' : 'Comenzar a personalizar'),
      el('button', { type: 'button', class: 'ci-link', onclick: function () { form.close(); } }, op.selector || op.titulo ? '← Volver' : '← Elegir otro modelo'));
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = new URLSearchParams({ empezar: '1' });
      Object.keys(it.link).forEach(function (k) { if (it.link[k]) q.set(k, it.link[k]); });
      ['a', 'b', 'fecha'].forEach(function (k) { var x = f.elements[k]; if (x && x.value.trim()) q.set(k, x.value.trim()); });
      var b = f.querySelector('[type=submit]'); b.disabled = true; b.textContent = 'Un momento…';
      try { if (window.gtag) gtag('event', 'crear_invitacion', { modelo: it.id, evento: ev.tipo }); } catch (er) { /* sin analítica */ }
      location.href = APP + '/tienda/?' + q.toString();
    });
    form.replaceChildren(f);
    abrir(form);
    setTimeout(function () { var x = f.querySelector('input'); if (x) x.focus(); }, 60);
  }

  // Diseño a medida desde cualquier lugar de la web (botón «Comenzar diseño a medida»): abre este mismo cuadro,
  // con el tipo de evento a elegir; desde la página de un evento (tipo fijo) solo pide el nombre y la fecha.
  window.AmoCrear = { medida: function (slug, titulo) {
    cargarCatalogo().then(function (c) {
      var fijo = slug ? evento(slug) : null, ev = fijo || evento('boda');
      personalizar({ id: 'a-medida', nombre: 'Diseño a medida', medida: true, link: { producto: 'a-medida', evento: ev.tipo }, precio: c.aMedida && c.aMedida.texto }, ev, { selector: !fijo, titulo: titulo || (fijo ? 'Invitación a medida' : 'Invitación a medida') });
    }).catch(function () { location.href = RAIZ + 'contacto'; });
  } };

  // ── Pestañas y tarjetas ────────────────────────────────────────────
  function tarjeta(it, lista, i, ev) {
    var precioTxt = it.desde ? 'desde ' + it.desde : (it.precio ? (it.fijo || it.medida ? it.precio : 'desde ' + it.precio) : '');
    var ver = function () { if (it.medida) { if (it.ejemplos) location.href = it.ejemplos; else personalizar(it, ev); } else verDiseno(lista, i, ev); };
    return el('div', { class: 'ci-item' + (it.medida ? ' ci-medida' : '') },
      el('button', { type: 'button', class: 'ci-mini', 'aria-label': (it.medida ? 'Ver ejemplos de ' : 'Ver diseño ') + it.nombre, onclick: ver },
        imagen(it.imgs, it.nombre), it.gratis ? el('span', { class: 'ci-gratis', text: 'Gratis' }) : null),
      it.etiqueta ? el('small', { class: 'ci-etiqueta', text: it.etiqueta }) : null,
      el('h4', { class: 'ci-nombre', text: it.nombre }),
      precioTxt ? el('p', { class: 'ci-precio', text: precioTxt }) : null,
      el('button', { type: 'button', class: 'ci-btn ci-btn-borde', onclick: function () { personalizar(it, ev); } }, it.medida ? 'Comenzar' : 'Personalizar'),
      it.medida && !it.ejemplos ? null : el('button', { type: 'button', class: 'ci-btn ci-btn-verde', onclick: ver }, it.medida ? 'Ver ejemplos' : (it.galeria ? 'Ver diseños' : 'Ver diseño')));
  }

  function montar(caja) {
    // data-evento="boda": un solo evento; data-eventos="infantil,baby-shower": selector solo con esos
    var permitidos = (caja.getAttribute('data-eventos') || '').split(',').map(evento).filter(Boolean);
    var opciones = permitidos.length ? permitidos : EVENTOS;
    var fijo = evento(caja.getAttribute('data-evento') || '') || (permitidos.length === 1 ? permitidos[0] : null);
    var conSelector = !fijo;
    var enPagina = permitidos.length > 1;
    var desdeUrl = (location.pathname.match(/crear-invitacion-para-([a-z0-9-]+)/) || [])[1] || new URLSearchParams(location.search).get('evento');
    var ev = fijo || (enPagina ? permitidos[0] : evento(desdeUrl)) || null;
    var tabActiva = (location.hash.match(/^#(web|std|adicional)$/) || [])[1] || 'web';

    var cab = el('div', { class: 'ci-cab' });
    var tabs = el('div', { class: 'ci-tabs', role: 'tablist' });
    // Botón redondo con flecha: a la derecha mientras quedan pestañas por ver; al llegar al final pasa a la izquierda para volver
    var flecha = el('button', { type: 'button', class: 'ci-tabs-mas', 'aria-label': 'Ver más pestañas', onclick: function () {
      var alFinal = tabs.scrollLeft + tabs.clientWidth >= tabs.scrollWidth - 6;
      tabs.scrollTo({ left: alFinal ? 0 : tabs.scrollWidth, behavior: 'smooth' });
    } }, '›');
    var tabsCaja = el('div', { class: 'ci-tabs-caja' }, tabs, flecha);
    var avisaFlecha = function () {
      var sobra = tabs.scrollWidth > tabs.clientWidth + 4, alFinal = tabs.scrollLeft + tabs.clientWidth >= tabs.scrollWidth - 6;
      flecha.hidden = !sobra;
      flecha.classList.toggle('atras', alFinal); flecha.textContent = alFinal ? '‹' : '›';
      flecha.setAttribute('aria-label', alFinal ? 'Volver a las primeras pestañas' : 'Ver más pestañas');
    };
    // La pestaña elegida se lleva al centro (o hasta donde alcance)
    var centrar = function (b) { if (b && tabs.scrollWidth > tabs.clientWidth) tabs.scrollTo({ left: b.offsetLeft - (tabs.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' }); };
    tabs.addEventListener('scroll', avisaFlecha, { passive: true }); window.addEventListener('resize', avisaFlecha);
    var grilla = el('div', { class: 'ci-grilla', role: 'tabpanel' });
    var otro = el('p', { class: 'ci-otro', hidden: !ev }, el('a', { href: RAIZ + 'crear-invitacion', text: '¿Es otro tipo de evento? Cámbialo aquí', onclick: function (e) {
      if (fijo || enPagina) return;
      e.preventDefault(); ev = null; try { history.replaceState(null, '', RAIZ.replace(/^https?:\/\/[^/]+/, '') + 'crear-invitacion'); } catch (x) { /* sin historial */ } pintarCabecera(); pintar(); otro.hidden = true;
    } }));
    caja.replaceChildren(cab, tabsCaja, grilla, otro);

    // README (ronda 37): sin desplegable; se elige el evento en una grilla con foto y solo su nombre. Con un evento elegido
    // (o una dirección /crear-invitacion-para-boda) se ven directamente los modelos.
    var grid = []; try { grid = JSON.parse(caja.getAttribute('data-grid') || '[]'); } catch (e) { grid = []; }
    var titulo = document.querySelector('#disenos .titulo h2'), tituloInicial = titulo ? titulo.innerHTML : '';
    var subtitulo = document.querySelector('#disenos .titulo p');
    function pintarCabecera() {
      if (!conSelector) return;
      if (ev) { cab.replaceChildren(); if (titulo && grid.length) titulo.innerHTML = '<em>Diseños</em> para ' + (ev.nombre || '').toLowerCase(); if (subtitulo && grid.length) subtitulo.textContent = 'Tenemos estilos para todos los gustos, ¡encuentra el tuyo! Elige, personaliza y mira tu invitación lista antes de pagar.'; return; }
      if (titulo && grid.length) titulo.innerHTML = '¿Qué vas a <em>celebrar</em>?'; if (subtitulo && grid.length) subtitulo.textContent = 'Toca el tipo de evento y verás sus diseños para verlos, personalizarlos y empezar.';
      cab.replaceChildren(el('div', { class: 'ci-eventos' }, (grid.length ? grid : opciones.map(function (e) { return { slug: e.slug, nombre: e.nombre, img: '' }; })).map(function (g) {
        return el('button', { type: 'button', class: 'ci-evento', style: g.img ? 'background-image:url(' + g.img + ')' : null, onclick: function () { if (g.slug === 'empresarial') { location.href = RAIZ + 'empresarial'; return; } ev = evento(g.slug); tabActiva = 'web'; cambiarUrl(); pintarCabecera(); pintar(); otro.hidden = false; try { caja.scrollIntoView({ block: 'start' }); } catch (e) { /* sin scroll */ } } },
          el('span', { text: g.nombre }));
      })));
    }
    function cambiarUrl() {
      if (!conSelector || enPagina || !history.replaceState || !/crear-invitacion/.test(location.pathname)) return;
      try { history.replaceState(null, '', RAIZ.replace(/^https?:\/\/[^/]+/, '') + 'crear-invitacion-para-' + ev.slug); } catch (e) { /* sin historial */ }
    }
    var ya = false;
    function pintar() {
      if (!ev) { tabs.replaceChildren(); grilla.replaceChildren(); tabsCaja.hidden = true; return; }
      tabsCaja.hidden = false;
      grilla.replaceChildren(el('p', { class: 'ci-vacio', text: 'Cargando modelos…' }));
      cargarCatalogo().then(function (c) {
        catalogo = c;
        var lista = itemsDe(ev, c);
        if (!lista.some(function (t) { return t.id === tabActiva; })) tabActiva = lista[0].id;
        tabs.replaceChildren.apply(tabs, lista.map(function (t) {
          return el('button', { type: 'button', role: 'tab', class: 'ci-tab' + (t.id === tabActiva ? ' activa' : ''), 'aria-selected': t.id === tabActiva ? 'true' : 'false',
            onclick: function () { tabActiva = t.id; pintar(); } }, t.nombre);
        }));
        var tab = lista.filter(function (t) { return t.id === tabActiva; })[0];
        grilla.replaceChildren.apply(grilla, tab.items.map(function (it, i) { return tarjeta(it, tab.items, i, ev); }));
        avisaFlecha(); if (ya) centrar(tabs.querySelector('.activa'));
        ya = true;
        document.querySelectorAll('[data-ci-desde]').forEach(function (x) { var d = desdeBasic(c); if (d) x.textContent = d; });
      }).catch(function () {
        grilla.replaceChildren(el('p', { class: 'ci-vacio' }, 'No pudimos cargar los modelos. ', el('a', { href: 'https://wa.me/message/57HQCKAMGELDG1', target: '_blank', rel: 'noopener', text: 'Escríbenos por WhatsApp' }), ' y te ayudamos.'));
      });
    }
    pintarCabecera();
    pintar();
  }

  function iniciar() { document.querySelectorAll('.ci-widget').forEach(montar); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
