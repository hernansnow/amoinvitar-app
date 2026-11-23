// README (ronda 108): Administración → Álbum QR con el álbum de Albunear ya activo (incluido en Deluxe).
// Todo se maneja desde acá: fotos y videos (filtros, orden, vista, favoritas, destacadas, ocultar, borrar, varias a la
// vez y vista grande), QR (lo dibuja Albunear en un iframe, con descarga e impresión), link para compartir, moderación,
// slideshow en vivo y descarga en ZIP. Cada pedido va a POST /api/panel/<id>/albumqr, que lo pasa a Albunear por el
// enlace interno (Socios.album) y lo ejecuta con las mismas reglas del panel de Albunear.

const SVG = (d, extra = '') => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;
const I = {
  fotos: SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'),
  qr: SVG('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>'),
  link: SVG('<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>'),
  moderar: SVG('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
  pantalla: SVG('<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'),
  zip: SVG('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>'),
  ojo: SVG('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  ajustes: SVG('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  corazon: SVG('<path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z"/>'),
  corazonLleno: SVG('<path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z" fill="currentColor"/>'),
  pin: SVG('<path d="M15 3l6 6-3 1-4 4 1 5-2 2-4-4-5 5M9 15l-4-4 2-2 5 1 4-4 1-3"/>'),
  mas: SVG('<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>'),
  descargar: SVG('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>'),
  ocultar: SVG('<path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.1 3.8M6.6 6.6A17 17 0 0 0 2 12s3.5 6 10 6a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  borrar: SVG('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  check: SVG('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  seleccionar: SVG('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12.5l3 3 5-6"/>'),
  cerrar: SVG('<path d="M6 6l12 12M18 6L6 18"/>'),
  izq: SVG('<path d="M15 5l-7 7 7 7"/>'),
  der: SVG('<path d="M9 5l7 7-7 7"/>'),
  copiar: SVG('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  compartir: SVG('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>'),
  paleta: SVG('<path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.6 0-.5-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1" fill="currentColor"/><circle cx="10" cy="7.5" r="1" fill="currentColor"/><circle cx="14.5" cy="7.5" r="1" fill="currentColor"/><circle cx="17" cy="11" r="1" fill="currentColor"/>'),
  whatsapp: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3 1 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.4-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.3-.2Z"/></svg>',
  vistaChica: SVG('<rect x="3" y="3" width="5" height="5"/><rect x="9.5" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="9.5" width="5" height="5"/><rect x="9.5" y="9.5" width="5" height="5"/><rect x="16" y="9.5" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><rect x="9.5" y="16" width="5" height="5"/><rect x="16" y="16" width="5" height="5"/>'),
  vistaMedia: SVG('<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>'),
  vistaGrande: SVG('<rect x="3" y="3" width="18" height="18" rx="1"/>'),
};

// README (ronda 110): en el celular, las filas que se deslizan (botones y filtros) llevan la flecha «>» del menú del panel:
// avisa que hay más y, al tocarla, corre la fila. Se esconde si todo entra o al llegar al final.
const FLECHA = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function conFlecha(el, fila, fondo) {
  const mas = el('button', { type: 'button', class: 'ad-menu-mas aq-flecha', 'aria-label': 'Ver más opciones', html: FLECHA, onclick: () => fila.scrollBy({ left: fila.clientWidth * 0.6, behavior: 'smooth' }) });
  mas.style.setProperty('--fondo-flecha', fondo);
  const ver = () => { mas.hidden = fila.scrollLeft + fila.clientWidth >= fila.scrollWidth - 4; };
  fila.addEventListener('scroll', ver, { passive: true });
  addEventListener('resize', ver);
  requestAnimationFrame(ver); setTimeout(ver, 300);
  return el('div', { class: 'aq-desliza' }, fila, mas);
}

export function vistaAlbumQr(ctx, { tr, album, inicial = 'fotos' }) {
  const el = ctx.el;
  const boda = ctx.S.evento.tipo === 'boda';
  const pedir = (accion, extra = {}) => ctx.api('/albumqr', { method: 'POST', body: JSON.stringify({ accion, ...extra }) });
  const ico = (k) => el('span', { class: 'aq-ico', html: I[k] });
  const conIco = (k, texto) => [ico(k), el('span', {}, tr(texto))];
  const idioma = () => { const c = window.AI_REGIONAL?.clave?.() || 'es'; return c.slice(0, 2); };
  let info = null;           // { event, counts } de Albunear
  let pestana = inicial;
  let zipMod = null;

  const cuerpo = el('div', { class: 'aq-cuerpo' }, el('p', { class: 'ayuda' }, tr('Cargando…')));
  const BOTONES = [['fotos', 'Fotos'], ['qr', 'QR'], ['link', 'Link'], ['moderar', 'Moderar']];
  const botonesTab = BOTONES.map(([id, t]) => el('button', { type: 'button', class: 'aq-tab', 'data-id': id, onclick: () => abrir(id) }, ...conIco(id, t)));
  const slideshow = el('a', { class: 'aq-tab', target: '_blank', rel: 'noopener', href: '#' }, ...conIco('pantalla', 'Slideshow en vivo'));
  const zipBtn = el('button', { type: 'button', class: 'aq-tab', onclick: () => descargarZip() }, ...conIco('zip', 'Descargar todo (ZIP)'));
  const entrarAjustes = async (pest = 'ajustes') => {
    const w = window.open('', '_blank');
    try { const r = await pedir('entrar', { pestana: pest }); if (w) w.location = r.url; else location.href = r.url; } catch (e) { w?.close(); ctx.aviso(e.message, true); }
  };
  const caja = el('section', { class: 'ad-tarjeta aq' },
    el('div', { class: 'aq-cabeza' },
      el('div', {}, el('h3', {}, tr('Álbum de fotos')), el('p', { class: 'aq-sub' }, tr('Activo reemplaza Instagram Wall.'))),
      el('div', { class: 'aq-acciones' },
        el('a', { class: 'aq-chip', href: album.link, target: '_blank', rel: 'noopener' }, ...conIco('ojo', 'Ver álbum')),
        el('button', { type: 'button', class: 'aq-chip', onclick: () => entrarAjustes('ajustes') }, ...conIco('ajustes', 'Ajustes')))),
    conFlecha(el, el('div', { class: 'aq-tabs' }, ...botonesTab, slideshow, zipBtn), '#fff'),
    cuerpo);

  // ── Datos del álbum (contadores, ajustes, link del slideshow) ──
  const cargarInfo = async () => {
    info = await pedir('info');
    const url = info.event?.screenUrl;
    slideshow.href = url || '#';
    slideshow.classList.toggle('apagado', !url);
    if (!url) slideshow.onclick = (e) => { e.preventDefault(); ctx.aviso(tr('El slideshow en vivo no está incluido en el plan de este álbum.'), true); };
    return info;
  };

  function abrir(id) {
    pestana = id;
    botonesTab.forEach((b) => b.classList.toggle('activo', b.dataset.id === id));
    clearInterval(caja._reloj);
    ({ fotos: tabFotos, qr: tabQr, link: tabLink, moderar: tabModerar })[id]();
  }

  // ── Fotos ──
  let filtro = 'all', orden = 'recent', vista = 'm', media = [], hayMas = false, seleccion = null;
  const fechaCorta = (t) => { try { return new Date(t * 1000).toLocaleDateString(idioma(), { day: 'numeric', month: 'short' }).replace('.', ''); } catch { return ''; } };
  const dur = (s) => (s ? (s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : `${Math.round(s)}s`) : '');
  async function lote(ids, que, msg) {
    if (que === 'delete' && !confirm(tr(ids.length > 1 ? '¿Borrar {n} fotos y videos? No se puede deshacer.' : '¿Borrar esta foto? No se puede deshacer.', { n: ids.length }))) return false;
    try {
      await pedir('lote', { ids, que });
      ctx.aviso(tr(msg));
      return true;
    } catch (e) {
      ctx.aviso(e.datos?.codigo === 'err.maxFeatured' ? tr('Se pueden destacar hasta 3 fotos.') : e.message, true);
      return false;
    }
  }
  async function bajar(m) {
    const nombre = `${(info?.event?.slug || 'album')}-${m.id}.${(String(m.original || m.src).split('?')[0].split('.').pop() || 'jpg').slice(0, 4)}`;
    try {
      const r = await fetch(m.original || m.src);
      if (!r.ok) throw new Error('descarga');
      const b = await r.blob();
      const a = el('a', { href: URL.createObjectURL(b), download: nombre });
      document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 30000);
    } catch { window.open(m.original || m.src, '_blank', 'noopener'); }
  }
  function tabFotos() {
    const c = info?.counts || {};
    const chips = [['all', 'Todas', c.total], ['fav', 'Favoritas', c.fav], ['featured', 'Destacadas', `${c.featured || 0}/3`], ['hidden', 'Ocultas', (c.hidden || 0) + (c.pending || 0)], ['video', 'Videos', c.videos]];
    const filtros = el('div', { class: 'aq-filtros', role: 'tablist' }, chips.map(([k, t, n]) => el('button', { type: 'button', class: `aq-filtro${filtro === k ? ' activo' : ''}`, onclick: () => { filtro = k; tabFotos(); } },
      tr(t), el('b', {}, String(n ?? 0)))));
    const ordenSel = el('select', { class: 'aq-orden', 'aria-label': tr('Ordenar') }, [['recent', 'Más recientes'], ['oldest', 'Más antiguas'], ['likes', 'Más gustadas']].map(([v, t]) => el('option', { value: v, selected: v === orden }, tr(t))));
    ordenSel.addEventListener('change', () => { orden = ordenSel.value; cargar(true); });
    const vistas = el('div', { class: 'aq-vistas' }, [['l', 'vistaGrande'], ['m', 'vistaMedia'], ['s', 'vistaChica']].map(([v, k]) => el('button', { type: 'button', class: vista === v ? 'activo' : '', 'aria-label': tr('Vista'), html: I[k],
      onclick: (e) => { vista = v; grid.className = `aq-grid v-${v}`; e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('activo', b === e.currentTarget)); } })));
    const selBtn = el('button', { type: 'button', class: 'aq-chip', onclick: () => { seleccion = seleccion ? null : new Set(); pintarLote(); pintar(); } }, ...conIco('seleccionar', 'Seleccionar'));
    const barraLote = el('div', { class: 'aq-lote', hidden: true });
    const grid = el('div', { class: `aq-grid v-${vista}` });
    const masBtn = el('button', { type: 'button', class: 'btn btn-sec btn-chico aq-mas', hidden: true, onclick: () => cargar(false) }, tr('Cargar más'));
    const vacio = el('p', { class: 'aq-vacio', hidden: true }, tr('Todavía no hay fotos. Comparte tu QR y aparecerán aquí en tiempo real.'));
    cuerpo.replaceChildren(el('div', { class: 'aq-barra' }, conFlecha(el, filtros, '#d4e9e0'), el('div', { class: 'aq-barra-der' }, selBtn, ordenSel, vistas)), barraLote, grid, vacio, masBtn);

    function pintarLote() {
      barraLote.hidden = !seleccion;
      selBtn.classList.toggle('activo', !!seleccion);
      if (!seleccion) return;
      const ids = [...seleccion];
      const hacer = (que, msg) => async () => { if (!ids.length) return; if (await lote(ids, que, msg)) { seleccion = new Set(); await refrescar(); } };
      barraLote.replaceChildren(el('strong', {}, tr('{n} seleccionadas', { n: ids.length })),
        el('button', { type: 'button', class: 'btn-link', onclick: () => { seleccion = new Set(media.map((m) => m.id)); pintarLote(); pintar(); } }, tr('Seleccionar todo')),
        el('span', { class: 'aq-lote-sep' }),
        el('button', { type: 'button', class: 'aq-chip', disabled: !ids.length, onclick: hacer('fav', 'Marcadas como favoritas') }, ...conIco('corazon', 'Favorita')),
        el('button', { type: 'button', class: 'aq-chip', disabled: !ids.length, onclick: hacer('feature', 'Destacadas') }, ...conIco('pin', 'Destacar')),
        el('button', { type: 'button', class: 'aq-chip', disabled: !ids.length, onclick: hacer('hide', 'Ocultas') }, ...conIco('ocultar', 'Ocultar')),
        el('button', { type: 'button', class: 'aq-chip', disabled: !ids.length, onclick: hacer('show', 'Visibles de nuevo') }, ...conIco('ojo', 'Mostrar')),
        el('button', { type: 'button', class: 'aq-chip', disabled: !ids.length, onclick: async () => { for (const m of media.filter((x) => seleccion.has(x.id))) await bajar(m); } }, ...conIco('descargar', 'Descargar')),
        el('button', { type: 'button', class: 'aq-chip peligro', disabled: !ids.length, onclick: hacer('delete', 'Borradas') }, ...conIco('borrar', 'Borrar')),
        el('button', { type: 'button', class: 'btn-link', onclick: () => { seleccion = null; pintarLote(); pintar(); } }, tr('Cancelar')));
    }
    function pintar() {
      vacio.hidden = media.length > 0;
      if (!media.length && filtro !== 'all') vacio.textContent = tr('No hay fotos en este filtro.');
      masBtn.hidden = !hayMas;
      grid.replaceChildren(...media.map((m, i) => itemFoto(m, i)));
    }
    function itemFoto(m, i) {
      const marcado = seleccion?.has(m.id);
      const oculta = m.status === 'hidden' || m.status === 'pending';
      const accion = async (e, que, msg) => { e.stopPropagation(); if (await lote([m.id], que, msg)) await refrescar(); };
      const menu = el('div', { class: 'aq-menu', hidden: true },
        el('button', { type: 'button', onclick: (e) => { e.stopPropagation(); bajar(m); } }, ...conIco('descargar', 'Descargar')),
        el('button', { type: 'button', onclick: (e) => accion(e, oculta ? 'show' : 'hide', oculta ? 'Visible de nuevo' : 'Oculta') }, ...conIco(oculta ? 'ojo' : 'ocultar', oculta ? (m.status === 'pending' ? 'Aprobar' : 'Mostrar') : 'Ocultar')),
        el('button', { type: 'button', class: 'peligro', onclick: (e) => accion(e, 'delete', 'Borrada') }, ...conIco('borrar', 'Borrar')));
      return el('div', { class: `aq-item${marcado ? ' marcado' : ''}${oculta ? ' oculta' : ''}`, role: 'button', tabindex: '0',
        onclick: () => { if (seleccion) { marcado ? seleccion.delete(m.id) : seleccion.add(m.id); pintarLote(); pintar(); } else verGrande(i); },
        onkeydown: (e) => { if (e.key === 'Enter') e.currentTarget.click(); } },
        el('img', { src: m.thumb || m.src, alt: '', loading: 'lazy' }),
        m.kind === 'video' ? el('span', { class: 'aq-badge aq-video' }, '▶ ', dur(m.duration)) : null,
        oculta ? el('span', { class: 'aq-badge aq-oculta' }, tr(m.status === 'pending' ? 'Pendiente' : 'Oculta')) : null,
        el('span', { class: 'aq-fecha' }, fechaCorta(m.t)),
        m.likes ? el('span', { class: 'aq-likes' }, '♥ ', String(m.likes)) : null,
        seleccion ? el('span', { class: 'aq-check', html: marcado ? I.check : '' }) : el('div', { class: 'aq-acc' },
          el('button', { type: 'button', class: m.favorite ? 'activo' : '', title: tr('Favorita'), html: m.favorite ? I.corazonLleno : I.corazon, onclick: (e) => accion(e, m.favorite ? 'unfav' : 'fav', m.favorite ? 'Ya no es favorita' : 'Favorita') }),
          el('button', { type: 'button', class: m.featured ? 'activo' : '', title: tr('Destacar'), html: I.pin, onclick: (e) => accion(e, m.featured ? 'unfeature' : 'feature', m.featured ? 'Ya no está destacada' : 'Destacada') }),
          el('button', { type: 'button', title: tr('Más'), html: I.mas, onclick: (e) => { e.stopPropagation(); document.querySelectorAll('.aq-menu').forEach((x) => { if (x !== menu) x.hidden = true; }); menu.hidden = !menu.hidden; } }),
          menu));
    }
    async function cargar(desde0) {
      try {
        const r = await pedir('media', { filtro, orden, desde: desde0 ? 0 : media.length, cantidad: 120 });
        media = desde0 ? r.media || [] : media.concat(r.media || []);
        hayMas = !!r.more;
        pintar();
      } catch (e) { cuerpo.replaceChildren(el('p', { class: 'aq-vacio' }, e.message)); }
    }
    async function refrescar() { await cargarInfo().catch(() => {}); const sel = seleccion; tabFotos(); seleccion = sel; }
    // Galería grande: flechas, descargar, favorita, destacar, ocultar y borrar
    function verGrande(i) {
      let k = i;
      const fondo = el('div', { class: 'aq-lightbox', role: 'dialog', 'aria-modal': 'true' });
      const cerrar = () => { fondo.remove(); removeEventListener('keydown', teclas); };
      const teclas = (e) => { if (e.key === 'Escape') cerrar(); if (e.key === 'ArrowRight') ir(1); if (e.key === 'ArrowLeft') ir(-1); };
      const ir = (d) => { k = (k + d + media.length) % media.length; mostrar(); };
      const mostrar = () => {
        const m = media[k];
        if (!m) return cerrar();
        const oculta = m.status === 'hidden' || m.status === 'pending';
        const hacer = async (que, msg) => { if (await lote([m.id], que, msg)) { if (que === 'delete') { media.splice(k, 1); if (!media.length) return cerrar(); k = Math.min(k, media.length - 1); } else Object.assign(m, que === 'fav' ? { favorite: true } : que === 'unfav' ? { favorite: false } : que === 'feature' ? { featured: true } : que === 'unfeature' ? { featured: false } : que === 'hide' ? { status: 'hidden' } : { status: 'visible' }); mostrar(); pintar(); cargarInfo().catch(() => {}); } };
        fondo.replaceChildren(
          el('div', { class: 'aq-lb-barra' },
            el('span', { class: 'aq-lb-info' }, [m.name, fechaCorta(m.t)].filter(Boolean).join(' · '), ` · ${k + 1}/${media.length}`),
            el('div', { class: 'aq-lb-acc' },
              el('button', { type: 'button', title: tr('Descargar'), html: I.descargar, onclick: () => bajar(m) }),
              el('button', { type: 'button', class: m.favorite ? 'activo' : '', title: tr('Favorita'), html: m.favorite ? I.corazonLleno : I.corazon, onclick: () => hacer(m.favorite ? 'unfav' : 'fav', m.favorite ? 'Ya no es favorita' : 'Favorita') }),
              el('button', { type: 'button', class: m.featured ? 'activo' : '', title: tr('Destacar'), html: I.pin, onclick: () => hacer(m.featured ? 'unfeature' : 'feature', m.featured ? 'Ya no está destacada' : 'Destacada') }),
              el('button', { type: 'button', title: tr(oculta ? 'Mostrar' : 'Ocultar'), html: oculta ? I.ojo : I.ocultar, onclick: () => hacer(oculta ? 'show' : 'hide', oculta ? 'Visible de nuevo' : 'Oculta') }),
              el('button', { type: 'button', class: 'peligro', title: tr('Borrar'), html: I.borrar, onclick: () => hacer('delete', 'Borrada') }),
              el('button', { type: 'button', title: tr('Cerrar'), html: I.cerrar, onclick: cerrar }))),
          el('button', { type: 'button', class: 'aq-lb-flecha izq', 'aria-label': tr('Anterior'), html: I.izq, onclick: () => ir(-1) }),
          m.kind === 'video' ? el('video', { src: m.video || m.src, controls: true, autoplay: true, playsinline: true, poster: m.thumb || '' }) : el('img', { src: m.src, alt: '' }),
          el('button', { type: 'button', class: 'aq-lb-flecha der', 'aria-label': tr('Siguiente'), html: I.der, onclick: () => ir(1) }));
      };
      fondo.addEventListener('click', (e) => { if (e.target === fondo) cerrar(); });
      addEventListener('keydown', teclas);
      document.body.append(fondo);
      mostrar();
    }
    pintarLote();
    cargar(true);
    // Fotos nuevas en tiempo real: cada 20 segundos se revisa si llegaron más (solo mirando «Todas», sin seleccionar)
    caja._reloj = setInterval(async () => {
      if (!caja.isConnected) return clearInterval(caja._reloj);
      if (pestana !== 'fotos' || seleccion || filtro !== 'all' || document.hidden) return;
      const antes = info?.counts?.total;
      await cargarInfo().catch(() => {});
      if (info?.counts?.total !== antes) tabFotos();
    }, 20000);
  }

  // ── QR: lo dibuja Albunear (con su estilo) en un iframe con permiso temporal ──
  async function tabQr() {
    cuerpo.replaceChildren(el('p', { class: 'ayuda' }, tr('Cargando…')));
    try {
      const r = await pedir('qr', { lang: idioma() });
      cuerpo.replaceChildren(el('h3', {}, tr('Tu código QR')),
        el('p', { class: 'aq-texto' }, tr('Imprímelo en las mesas, la entrada o la barra. Al escanearlo se abre tu álbum.')),
        el('iframe', { class: 'aq-qr', src: r.tarjeta, title: tr('Código QR del álbum'), loading: 'lazy' }),
        el('button', { type: 'button', class: 'aq-chip aq-cambiar', onclick: () => entrarAjustes('ajustes') }, ...conIco('paleta', 'Cambiar diseño en Albunear')));
    } catch (e) { cuerpo.replaceChildren(el('p', { class: 'aq-vacio' }, e.message)); }
  }

  // ── Link para compartir ──
  function tabLink() {
    const link = album.link;
    const f = ctx.datos.celebracion?.fecha || ctx.datos.ceremonia?.fecha || '';
    let fecha = '';
    try { if (f) fecha = new Date(`${f}T12:00:00`).toLocaleDateString(idioma(), { day: 'numeric', month: 'long', year: 'numeric' }); } catch { /* sin fecha */ }
    const nombres = [ctx.datos.nombres?.a, ctx.datos.nombres?.b].filter(Boolean).join(' & ');
    const base = fecha ? '¡Hola! 📷 Este es el álbum de {nombres}. Sube ahí todas tus fotos y videos del {fecha} y mira las de los demás, sin descargar ninguna app:' : '¡Hola! 📷 Este es el álbum de {nombres}. Sube ahí todas tus fotos y videos y mira las de los demás, sin descargar ninguna app:';
    const msg = el('textarea', { class: 'aq-msg', rows: 5 });
    msg.value = `${tr(base, { nombres, fecha })}\n${link}`;
    const copiar = async (t, aviso) => { try { await navigator.clipboard.writeText(t); ctx.aviso(tr(aviso)); } catch { prompt(tr('Copiar:'), t); } };
    cuerpo.replaceChildren(el('h3', {}, tr('Link para compartir a los invitados')),
      el('p', { class: 'aq-texto' }, tr('Envía el link a tus invitados antes o durante el evento (ya está incluido en la invitación).')),
      el('div', { class: 'aq-linkbox' }, el('code', {}, link), el('button', { type: 'button', class: 'aq-chip', onclick: () => copiar(link, 'Link copiado') }, ...conIco('copiar', 'Copiar'))),
      el('label', { class: 'aq-etiqueta' }, tr('Mensaje para WhatsApp')), msg,
      el('div', { class: 'aq-fila' },
        el('button', { type: 'button', class: 'btn btn-wa btn-chico', onclick: () => window.open(`https://wa.me/?text=${encodeURIComponent(msg.value)}`, '_blank', 'noopener') }, ...conIco('whatsapp', 'Enviar por WhatsApp')),
        el('button', { type: 'button', class: 'btn btn-sec btn-chico', onclick: () => copiar(msg.value, 'Mensaje copiado') }, ...conIco('copiar', 'Copiar mensaje')),
        el('button', { type: 'button', class: 'btn btn-sec btn-chico', onclick: async () => { if (navigator.share) { try { await navigator.share({ text: msg.value }); } catch { /* cancelado */ } } else copiar(msg.value, 'Mensaje copiado'); } }, ...conIco('compartir', 'Compartir…'))));
  }

  // ── Moderar: quién ve las fotos, aprobar antes de mostrar y las ocultas o pendientes ──
  function tabModerar() {
    const e = info?.event || {};
    const avanzada = e.planFeatures?.moderation === 'advanced';
    const interruptor = (titulo, ayuda, activo, alCambiar, deshabilitado) => {
      const i = el('input', { type: 'checkbox', checked: !!activo, disabled: !!deshabilitado });
      i.addEventListener('change', async () => { i.disabled = true; try { await alCambiar(i.checked); ctx.aviso(tr('Guardado')); } catch (x) { i.checked = !i.checked; ctx.aviso(x.message, true); } i.disabled = !!deshabilitado; });
      return el('div', { class: 'aq-ajuste' }, el('div', {}, el('strong', {}, tr(titulo)), el('small', {}, tr(ayuda))), el('label', { class: 'ad-alb-switch' }, i, el('span', { class: 'ad-alb-pista' })));
    };
    const guardar = async (b) => { const r = await pedir('ajustes', b); info = { ...info, event: r.event, counts: r.counts || info.counts }; };
    const grid = el('div', { class: 'aq-grid v-m' });
    const vacio = el('p', { class: 'aq-vacio', hidden: true }, tr('No hay fotos pendientes ni ocultas.'));
    cuerpo.replaceChildren(el('h3', {}, tr('Privacidad y moderación')),
      el('p', { class: 'aq-texto' }, tr('Decide quién ve las fotos del álbum y cuáles se muestran.')),
      interruptor('Los invitados ven las fotos de todos', boda ? 'Si lo desactivan, solo ustedes ven el álbum desde este panel.' : 'Si lo desactivas, solo tú ves el álbum desde este panel.', e.guestsCanView, (v) => guardar({ guestsCanView: v })),
      interruptor('Aprobar cada foto antes de mostrarla', 'Las fotos nuevas quedan pendientes hasta que las apruebes.', e.moderation === 'pre', (v) => guardar({ moderation: v ? 'pre' : 'off' }), !avanzada),
      el('div', { class: 'aq-nota' },
        el('p', {}, tr('Pasa el cursor (o toca) sobre una foto para ocultarla o borrarla. Las ocultas no aparecen en el álbum ni en el slideshow, pero siguen en este panel y en la descarga.')),
        el('p', {}, tr('Usa «Seleccionar» en la pestaña Fotos para moderar varias a la vez.'))),
      el('h4', {}, tr('Pendientes y ocultas')), grid, vacio);
    pedir('media', { filtro: 'hidden', cantidad: 200 }).then((r) => {
      const lista = r.media || [];
      vacio.hidden = lista.length > 0;
      grid.replaceChildren(...lista.map((m) => el('div', { class: 'aq-item oculta' },
        el('img', { src: m.thumb || m.src, alt: '', loading: 'lazy' }),
        el('span', { class: 'aq-badge aq-oculta' }, tr(m.status === 'pending' ? 'Pendiente' : 'Oculta')),
        el('div', { class: 'aq-acc visible' },
          el('button', { type: 'button', title: tr(m.status === 'pending' ? 'Aprobar' : 'Mostrar'), html: m.status === 'pending' ? I.check : I.ojo, onclick: async () => { if (await lote([m.id], 'show', m.status === 'pending' ? 'Aprobada' : 'Visible de nuevo')) { await cargarInfo().catch(() => {}); tabModerar(); } } }),
          el('button', { type: 'button', class: 'peligro', title: tr('Borrar'), html: I.borrar, onclick: async () => { if (await lote([m.id], 'delete', 'Borrada')) { await cargarInfo().catch(() => {}); tabModerar(); } } })))));
    }).catch((x) => { vacio.hidden = false; vacio.textContent = x.message; });
  }

  // ── Descargar todo en ZIP (se arma en el navegador, directo desde el almacenamiento de Albunear) ──
  async function descargarZip() {
    const nombre = (info?.event?.slug || 'album').replace(/[^a-z0-9-]/gi, '');
    const textoBtn = zipBtn.querySelector('span:last-child');
    const original = textoBtn.textContent;
    let destino = null;
    try {
      zipMod = zipMod || await import('/panel/albunear/zip.js').then(() => window.FWZip);
      destino = zipMod.pick(nombre); // dentro del clic: el navegador pide dónde guardarlo (si puede)
      zipBtn.disabled = true; textoBtn.textContent = tr('Preparando…');
      const r = await pedir('zip');
      if (!r.files?.length) { ctx.aviso(tr('Todavía no hay fotos para descargar.')); return; }
      const est = await zipMod.save(destino, r.files, nombre, (hechas, total) => { textoBtn.textContent = tr('Descargando {n} de {total}…', { n: hechas, total }); });
      ctx.aviso(est.failed ? tr('Descarga lista. {n} archivos no se pudieron bajar: prueba de nuevo.', { n: est.failed }) : tr('¡Descarga lista!'), !!est.failed);
    } catch (e) {
      if (e?.name !== 'AbortError') ctx.aviso(e.datos?.codigo === 'err.upgradeZip' ? tr('La descarga en ZIP no está incluida en el plan de este álbum.') : e.message, true);
    } finally { zipBtn.disabled = false; textoBtn.textContent = original; }
  }

  // El módulo del ZIP se carga antes: «Guardar como» tiene que abrirse dentro del mismo clic
  import('/panel/albunear/zip.js').then(() => { zipMod = window.FWZip; }).catch(() => {});
  // Si Albunear todavía no tiene la puerta nueva (o no responde), quedan los botones de siempre: ver el álbum y abrir su panel
  const deRespaldo = (e) => {
    caja.querySelector('.aq-desliza').hidden = true;
    cuerpo.replaceChildren(el('p', { class: 'aq-texto' }, tr('Las fotos y videos que suben los invitados se ven y se descargan desde el panel de Albunear.')),
      el('div', { class: 'aq-fila' },
        el('button', { type: 'button', class: 'btn btn-albunear btn-chico', onclick: async () => { const w = window.open('', '_blank'); try { const x = await ctx.api('/albunear', { method: 'POST', body: '{}' }); if (w) w.location = x.entrar; } catch (x) { w?.close(); ctx.aviso(x.message, true); } } }, tr('Abrir el panel de Albunear')),
        el('a', { class: 'btn btn-sec btn-chico', href: album.link, target: '_blank', rel: 'noopener' }, tr('Ver el álbum'))));
    if (e?.datos && !e.datos.sinPuerta) console.warn('albumqr', e.message);
  };
  cargarInfo().then(() => abrir(pestana)).catch(deRespaldo);
  return caja;
}
