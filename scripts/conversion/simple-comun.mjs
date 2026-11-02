// Modelos simples (ronda 22/23): Party, Civil, Compromiso y Pedida de mano (una sola pantalla con foto, nombres,
// fecha, lugares y confirmación) y las Save The Date web Classic y Soft (foto, nombres, fecha y Agendar).
// Lo que el cliente edita desde su panel reducido queda marcado acá; no llevan sobre, música ni ventana de bienvenida.
//
// opciones:
//   frase      texto de muestra de la frase de la portada si el convertidor no la encontró ("¡NOS HEMOS COMPROMETIDO!")
//   mensaje    textos de muestra del mensaje (van a "std.mensaje", editable)
//   fecha      'principal' | 'celebracion' (la fecha de la portada)
//   lugares    { map1: 'ceremonia', map2: 'celebracion' } (las ventanas con día, lugar, Agendar y mapa)
//   agendar    lo que agenda el botón suelto de la portada ('principal' en las Save The Date)
export function simple(doc, { $, $$, nodo, txt, plantillaFecha }, op = {}) {
  // Los elementos de texto más internos (si un <p> solo envuelve un <span> con el mismo texto, va el <span>: tiene el color)
  const hojas = (sel) => $$(doc.body, sel).filter((e) => !$$(e, 'p,h1,h2,h3,h4,h5,h6,div').length
    && !$$(e, 'span').some((x) => txt(x).trim() === txt(e).trim()));
  // Fuera lo que no va en un modelo simple
  for (const s of ['[data-componente="sobre"]', '[data-componente="acceso"]', '#ai-bienvenida', '#confirmar', '#gate-overlay', '#overlayer', '.loader']) for (const e of $$(doc.body, s)) e.remove();
  // La portada nunca depende de la confirmación (el convertidor la envolvía con data-seccion="rsvp")
  for (const w of $$(doc.body, 'div#rsvp[data-seccion="rsvp"]')) { while (w.firstChild) w.parentNode.insertBefore(w.firstChild, w); w.remove(); }
  for (const b of $$(doc.body, '[data-rsvp="boton"], [data-rsvp="texto"]')) b.removeAttribute('data-seccion');

  // El convertidor toma el título del contenedor del botón Agendar como título del lugar: acá no va
  for (const e of $$(doc.body, '[data-campo$=".titulo"]').filter((x) => x.matches('button,[data-agendar]') || x.querySelector('button,[data-agendar]'))) e.removeAttribute('data-campo');

  // "SAVE THE DATE"
  for (const e of hojas('h1,h2,h3,h4,h5,h6,p,span').filter((x) => /^\s*save the date\s*$/i.test(txt(x)))) e.setAttribute('data-t', 'std.titulo');

  // La frase de la portada: también la versión del celular (show-mobile) y la que el convertidor no encontró
  const ya = $(doc.body, '[data-t="portada.subtitulo"]');
  const frase = (ya && txt(ya).trim()) || op.frase;
  if (frase) for (const e of hojas('h1,h2,h3,h4,h5,h6,p,span').filter((x) => txt(x).trim() === frase && !x.hasAttribute('data-t'))) { e.setAttribute('data-t', 'portada.subtitulo'); e.classList.add('ai-frase'); }

  // La fecha de la portada ("12 • 09 • 2027 ♥ 21:00"): la fecha y, si la hay, la hora (sin hora, va solo la fecha)
  const F = op.fecha || 'principal';
  const RE = /(\d{1,2})\s*([•◦·.\/-])\s*(\d{1,2})\s*\2\s*(\d{4})/;
  for (const e of $$(doc.body, 'h1,h2,h3,h4,h5,h6,p').filter((x) => RE.test(txt(x)) && !x.closest('.animated-modal') && !x.querySelector('h1,h2,h3,h4,h5,h6,p'))) {
    const t = txt(e);
    const m = t.match(RE);
    const conHora = /\d{1,2}[:.]\d{2}/.test(t.slice(m.index + m[0].length));
    const ico = $(e, 'i[class*="icon-"]');
    const formato = plantillaFecha(m[0].replace(/\s+/g, ' '));
    e.removeAttribute('data-fecha'); e.removeAttribute('data-fecha-formato');
    e.innerHTML = `<span data-fecha="${F}" data-fecha-formato="${formato}"></span>${conHora ? `<span data-si="fechas.${F}.hora">&#160;&#160;${ico ? ico.outerHTML : '-'}&#160;&#160;<span data-fecha="${F}" data-fecha-formato="{hora}"></span></span>` : ''}`;
  }

  // El mensaje ("Te esperamos para celebrar…"): editable
  for (const m of op.mensaje || []) {
    const e = hojas('h1,h2,h3,h4,h5,h6,p,span').find((x) => txt(x).replace(/\s+/g, '') === m.replace(/\s+/g, '') && !x.hasAttribute('data-t'));
    if (e) { e.setAttribute('data-t-html', 'std.mensaje'); e.removeAttribute('data-t'); }
  }

  // "Dónde y cuándo" con el lugar y la fecha de la fiesta (Compromiso, Pedida)
  const dc = hojas('p,span,h4,h5,h6').find((x) => /^\s*d[oó]nde y cu[aá]ndo\s*$/i.test(txt(x)));
  if (dc) {
    dc.setAttribute('data-t', 'lugar.dondeCuando');
    const caja = dc.closest('div');
    const lug = caja && $$(caja, 'h6,p').find((x) => /^"[^"]+"|,/.test(txt(x).trim()) && !RE.test(txt(x)));
    if (lug) lug.setAttribute('data-campo', 'celebracion.lugarTexto');
  }

  // El botón Agendar suelto (Save The Date, Compromiso)
  const ag = $(doc.body, '#fiesta-button');
  if (ag && !ag.closest('.animated-modal')) agendar(ag, op.agendar || 'celebracion');

  // Las ventanas de los lugares (#map1 ceremonia, #map2 celebración)
  for (const [id, cual] of Object.entries(op.lugares || {})) {
    const modal = $(doc.body, `#${id}`);
    const boton = $(doc.body, `[data-src="#${id}"]`);
    if (boton && cual === 'ceremonia') boton.setAttribute('data-si', 'ceremonia.separada');
    if (boton && op.botonTitulo !== false) {
      // "CEREMONIA CIVIL", "BANQUETE": el nombre del lugar que pone el cliente
      const ico = $(boton, 'i[class*="icon-"]');
      if (!/agendar|c[oó]mo llegar/i.test(txt(boton))) boton.innerHTML = `<span data-campo="${cual}.titulo">${txt(boton).trim()}</span>${ico ? ' ' + ico.outerHTML : ''}`;
    }
    if (!modal) continue;
    const ls = $$(modal, 'span,p,h2,h3,h4,h5,h6').filter((e) => !e.querySelector('span,p'));
    const dia = ls.find((e) => /^D[IÍ]A Y HORARIO$/i.test(txt(e).trim()));
    const lug = ls.find((e) => /^LUGAR$/i.test(txt(e).trim()));
    const sig = (e) => { let x = (e.closest('h2,h3,h4,p') || e).nextElementSibling; while (x && !txt(x).trim()) x = x.nextElementSibling; return x; };
    if (dia) { dia.setAttribute('data-t', 'lugar.diaHorario'); const p = sig(dia); if (p && p.tagName === 'P') p.setAttribute('data-campo', `${cual}.fechaLarga`); }
    if (lug) { lug.setAttribute('data-t', 'lugar.lugar'); const p = sig(lug); if (p && p.tagName === 'P') p.setAttribute('data-campo', `${cual}.lugarTexto`); }
    const b = $(modal, '#fiesta-button, #iglesia-button') || $$(modal, 'button').find((x) => /agendar/i.test(txt(x)));
    if (b) agendar(b, cual);
    const ti = $$(modal, 'p,h2,h3,h4').find((e) => /c[oó]mo llegar/i.test(txt(e)) && !e.querySelector('a'));
    if (ti) ti.setAttribute('data-t', 'mapa.titulo');
    const link = $(modal, 'a[href*="maps"], a[href*="goo.gl"]');
    if (link) {
      link.setAttribute('href', '#'); link.setAttribute('rel', 'noopener'); link.setAttribute('data-attr', `href:c:${cual}.mapa.link`);
      const ico = $(link, '[class*="icon-"]');
      link.innerHTML = `${ico ? ico.outerHTML + ' ' : ''}<span data-t="boton.comoLlegar">¿Cómo llegar?</span>`;
      (link.closest('h2') || link).setAttribute('data-si', `${cual}.mapa.link`);
    }
    for (const ifr of $$(modal, 'iframe')) ifr.parentNode.replaceChild(nodo(doc, `<iframe width="100%" height="320" style="border:0;" loading="lazy" title="Mapa" data-si="${cual}.mapa.embed" data-attr="data-src:c:${cual}.mapa.embed" src="about:blank"></iframe>`), ifr);
  }
  // Un botón suelto que abre el mapa (Compromiso: "¿Cómo llegar?")
  for (const b of $$(doc.body, '[data-src="#map2"]').filter((x) => /c[oó]mo llegar|mapa/i.test(txt(x)) || !txt(x).trim())) b.setAttribute('data-si', 'celebracion.mapa.embed');

  function agendar(b, cual) {
    b.removeAttribute('id'); b.setAttribute('data-agendar', cual);
    const ico = $(b, '[class*="icon-"]');
    b.innerHTML = `${ico ? ico.outerHTML + ' ' : '<i class="icon-calendar" aria-hidden="true"></i> '}<span data-t="boton.agendar">Agendar</span>`;
  }
}
