// Tarjetas (Save The Date y agradecimiento): se editan directo sobre el diseño del modelo.
// Cada texto se puede mover (arrastrándolo), agrandar, achicar y reescribir; la foto se
// encuadra arrastrándola. "Restablecer" vuelve a lo que trae el diseño. Al generarla se
// dibuja la tarjeta en un canvas y se guarda como JPG.
//
// El diseño sale de modelo.json → tarjetas: { ancho, alto, fondo, fuentes, std: { tarjeta, foto }, agradecimiento }
// · capas: imágenes del diseño ({ img, x, y, w, h, sobreFoto }). Con sobreFoto van encima de la foto (hojas, aro).
// · foto: { x, y, r } círculo donde va la foto del cliente.
// · textos: { id, texto, x, y (centro), tam, fuente ("titulos" | "texto"), peso, color, espaciado (px entre letras),
//   ancho (corta en líneas), ajustar (una sola línea: si no entra en el ancho, se achica), mayus,
//   lineas: { largo, separacion, grosor } (rayitas a los costados), amp: { fondo, color, tam } ("&" en un círculo),
//   extra (texto adicional: aparece si el cliente lo activa) }
// · Variables: {nombres} {a} {b} {fecha} {fechaCorta} {lugar} {evento} {mensaje}

const el = (tag, attrs = {}, ...hijos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) if (h != null && h !== false) e.append(h.nodeType ? h : document.createTextNode(String(h)));
  return e;
};
const ALTO_LINEA = 1.18;
const familia = (def, t, fuente = t.fuente) => `"${def.fuentes?.[fuente] || 'Jost'}", ${fuente === 'titulos' ? 'cursive' : 'sans-serif'}`;
const rellenar = (s, vars) => String(s || '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const leerPos = (p) => String(p || '50% 50%').split(' ').map((x) => parseFloat(x) / 100);
const visible = (t, valor) => (t.mayus ? String(valor).toLocaleUpperCase('es') : String(valor));
// "Lau & Pablo" → ["Lau", "Pablo"] cuando el diseño pone el "&" en un círculo
const partirAmp = (t, valor) => {
  if (!t.amp) return null;
  const i = valor.indexOf(' & ');
  return i < 0 ? null : [valor.slice(0, i), valor.slice(i + 3)];
};

// ── Medidas (las mismas para el editor y para el JPG) ──
const medidor = document.createElement('canvas').getContext('2d');
function anchoLinea(def, t, s, tam) {
  medidor.font = `${t.peso || 400} ${tam}px ${familia(def, t)}`;
  const partes = partirAmp(t, s);
  const esp = t.espaciado || 0;
  const w = (x) => medidor.measureText(x).width + esp * [...x].length;
  if (!partes) return w(s);
  const d = tam * (t.amp.tam || 0.62);
  return w(partes[0]) + w(partes[1]) + d + tam * 0.24;
}
function tamAjustado(def, t, valor, tam) {
  if (!t.ajustar || !t.ancho || !valor) return tam;
  const ancho = Math.max(...visible(t, valor).split('\n').map((l) => anchoLinea(def, t, l, tam)));
  return ancho > t.ancho ? Math.max(tam * 0.4, (tam * t.ancho) / ancho) : tam;
}

// Texto final de cada elemento (lo que escribió el cliente o el del diseño)
export function textosDe(diseno, v, vars, def) {
  return diseno.textos.filter((t) => !t.extra || v.extra).map((t) => {
    const p = v.textos?.[t.id] || {};
    const valor = p.texto ?? rellenar(t.texto, vars), escala = p.escala || 1;
    return { ...t, valor, dx: p.dx || 0, dy: p.dy || 0, escala, tamFinal: tamAjustado(def, t, valor, t.tam * escala) };
  });
}

// Las fuentes del modelo (si la página todavía no las tiene)
function cargarFuentes(def) {
  const css = def.fuentes?.css;
  if (css && !document.querySelector(`link[href="${css}"]`)) document.head.append(el('link', { rel: 'stylesheet', href: css }));
}

// ── Editor ───────────────────────────────────────────────────────────
export function editorTarjeta({ def, diseno, base, valor, vars, alCambiar, subirFoto }) {
  cargarFuentes(def);
  const W = def.ancho, H = def.alto;
  const v = structuredClone(valor || {}); v.textos ??= {};
  let elegido = null, escribiendo = null;
  const emitir = () => alCambiar(structuredClone(v));

  const capa = el('div', { class: 'tj-capa', style: `width:${W}px;height:${H}px;background:${def.fondo || '#fff'}` });
  const lienzo = el('div', { class: 'tj-lienzo', style: `aspect-ratio:${W} / ${H}` }, capa);
  const escalar = () => { const k = lienzo.clientWidth / W; capa.style.transform = `scale(${k})`; lienzo.dataset.k = k; };
  new ResizeObserver(escalar).observe(lienzo);
  const k = () => Number(lienzo.dataset.k) || 1;

  const barra = el('div', { class: 'tj-barra' });
  const pintarBarra = () => {
    barra.replaceChildren();
    if (!elegido) { barra.append(el('span', { class: 'tj-pista' }, 'Toca un texto para moverlo, cambiar su tamaño o escribir otro.')); return; }
    const p = () => (v.textos[elegido] ??= {});
    const tam = (d) => { p().escala = Math.min(3, Math.max(0.3, Math.round(((p().escala || 1) + d) * 100) / 100)); dibujar(); emitir(); };
    barra.append(
      el('button', { type: 'button', class: 'tj-btn', title: 'Achicar', 'aria-label': 'Achicar', onclick: () => tam(-0.08) }, 'A−'),
      el('button', { type: 'button', class: 'tj-btn grande', title: 'Agrandar', 'aria-label': 'Agrandar', onclick: () => tam(0.08) }, 'A+'),
      el('button', { type: 'button', class: 'tj-btn', onclick: () => editarTexto(elegido) }, '✎ Escribir'),
      el('button', { type: 'button', class: 'tj-btn', title: 'Volver a centrarlo', onclick: () => { p().dx = 0; dibujar(); emitir(); } }, '↔ Centrar'),
      el('button', { type: 'button', class: 'tj-btn', title: 'Como venía en el diseño', 'aria-label': 'Como venía en el diseño', onclick: () => { delete v.textos[elegido]; dibujar(); emitir(); } }, '↺'));
  };

  // Mover un texto o la foto (mouse o dedo sobre el elemento)
  const arrastrar = (nodo, { alEmpezar, alMover, alSoltar }) => {
    nodo.addEventListener('pointerdown', (e) => {
      if (e.target.isContentEditable) return;
      e.preventDefault(); e.stopPropagation();
      nodo.setPointerCapture(e.pointerId);
      const x0 = e.clientX, y0 = e.clientY; let movio = false;
      alEmpezar?.();
      const mover = (ev) => { const dx = (ev.clientX - x0) / k(), dy = (ev.clientY - y0) / k(); if (Math.hypot(dx, dy) > 3) movio = true; alMover(dx, dy); };
      const soltar = () => { nodo.removeEventListener('pointermove', mover); nodo.removeEventListener('pointerup', soltar); nodo.removeEventListener('pointercancel', soltar); alSoltar?.(movio); };
      nodo.addEventListener('pointermove', mover); nodo.addEventListener('pointerup', soltar); nodo.addEventListener('pointercancel', soltar);
    });
  };

  // Escribir: el texto se edita tal cual (el "&" del círculo vuelve a dibujarse al terminar)
  function editarTexto(id) {
    escribiendo = id; elegido = id; dibujar(); pintarBarra();
    const span = capa.querySelector(`[data-id="${id}"] .tj-valor`); if (!span) return;
    try { span.contentEditable = 'plaintext-only'; } catch { /* viejo */ }
    if (span.contentEditable !== 'plaintext-only') span.contentEditable = 'true';
    span.focus();
    const r = document.createRange(); r.selectNodeContents(span); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    span.oninput = () => { (v.textos[id] ??= {}).texto = span.innerText.replace(/\n{3,}/g, '\n\n').slice(0, 300); emitir(); };
    span.onblur = () => { escribiendo = null; dibujar(); };
  }

  function nodoTexto(t) {
    const val = visible(t, t.valor || ' ');
    const partes = escribiendo === t.id ? null : partirAmp(t, val);
    const d = t.amp ? t.tamFinal * (t.amp.tam || 0.62) : 0;
    const valor = el('span', { class: 'tj-valor' }, ...(partes ? [partes[0],
      el('span', { class: 'tj-amp', style: `width:${d}px;height:${d}px;background:${t.amp.fondo};color:${t.amp.color || '#fff'};font-family:${familia(def, t, 'titulos')};font-size:${d * 0.78}px;margin:0 ${t.tamFinal * 0.12}px` }, '&'),
      partes[1]] : [val]));
    const raya = () => el('span', { class: 'tj-raya', style: `width:${t.lineas.largo * t.escala}px;height:${t.lineas.grosor || 2}px` });
    return el('div', { class: 'tj-texto', 'data-id': t.id, tabindex: '0', role: 'button', 'aria-label': `Texto: ${t.valor || t.id}`,
      style: [`left:${t.x}px`, `top:${t.y}px`, `transform:translate(calc(-50% + ${t.dx}px), calc(-50% + ${t.dy}px))`, `font-family:${familia(def, t)}`,
        `font-size:${t.tamFinal}px`, `font-weight:${t.peso || 400}`, `color:${t.color || '#333'}`, `--esp:${t.espaciado || 0}px`,
        t.lineas ? `gap:${t.lineas.separacion * t.escala}px` : '', t.ancho && !t.ajustar ? `width:${t.ancho}px` : 'white-space:pre', `line-height:${ALTO_LINEA}`].join(';') },
    t.lineas ? raya() : null, valor, t.lineas ? raya() : null);
  }

  function dibujar() {
    capa.replaceChildren();
    const adorno = (c) => el('img', { class: 'tj-adorno', src: `${base}/${c.img}`, alt: '', draggable: 'false', style: `left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px` });
    for (const c of (diseno.capas || []).filter((x) => !x.sobreFoto)) capa.append(adorno(c));
    // Foto (tarjeta con foto y agradecimiento): círculo que se encuadra arrastrando
    if (diseno.foto) {
      const f = diseno.foto;
      const hueco = el('div', { class: 'tj-foto', style: `left:${f.x - f.r}px;top:${f.y - f.r}px;width:${2 * f.r}px;height:${2 * f.r}px` });
      if (v.foto) {
        const img = el('img', { src: v.foto, alt: '', draggable: 'false', style: `object-position:${v.fotoPos || '50% 50%'};transform:scale(${v.fotoZoom || 1})` });
        hueco.append(img);
        let ini;
        arrastrar(hueco, {
          alEmpezar: () => { ini = leerPos(v.fotoPos); elegido = null; pintarBarra(); marcar(); },
          alMover: (dx, dy) => {
            const z = v.fotoZoom || 1;
            const nx = Math.min(1, Math.max(0, ini[0] - dx / (2 * f.r * z))), ny = Math.min(1, Math.max(0, ini[1] - dy / (2 * f.r * z)));
            v.fotoPos = `${Math.round(nx * 100)}% ${Math.round(ny * 100)}%`; img.style.objectPosition = v.fotoPos;
          },
          alSoltar: () => emitir(),
        });
      } else hueco.append(el('span', { class: 'tj-sin-foto' }, 'Tu foto'));
      capa.append(hueco);
    }
    for (const c of (diseno.capas || []).filter((x) => x.sobreFoto)) capa.append(adorno(c));
    for (const t of textosDe(diseno, v, vars, def)) {
      const nodo = nodoTexto(t);
      let ini;
      arrastrar(nodo, {
        alEmpezar: () => { const p = v.textos[t.id] || {}; ini = [p.dx || 0, p.dy || 0]; },
        alMover: (dx, dy) => { const p = (v.textos[t.id] ??= {}); p.dx = Math.round(ini[0] + dx); p.dy = Math.round(ini[1] + dy); nodo.style.transform = `translate(calc(-50% + ${p.dx}px), calc(-50% + ${p.dy}px))`; },
        alSoltar: (movio) => { if (movio) emitir(); else if (elegido === t.id) { editarTexto(t.id); return; } elegido = t.id; pintarBarra(); marcar(); },
      });
      nodo.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.target.isContentEditable) { e.preventDefault(); editarTexto(t.id); } });
      capa.append(nodo);
    }
    marcar();
  }
  const marcar = () => capa.querySelectorAll('.tj-texto').forEach((n) => { n.classList.toggle('elegido', n.dataset.id === elegido); n.classList.toggle('escribiendo', n.dataset.id === escribiendo); });
  capa.addEventListener('pointerdown', (e) => { if (e.target === capa || e.target.classList.contains('tj-adorno')) { elegido = null; pintarBarra(); marcar(); } });

  // Controles de abajo: foto, texto adicional, restablecer
  const controles = el('div', { class: 'tj-controles' });
  const pintarControles = () => {
    controles.replaceChildren();
    if (diseno.foto) {
      const input = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', hidden: true });
      const etiqueta = el('label', { class: 'btn btn-chico' }, input, el('span', {}, v.foto ? 'Cambiar foto' : 'Subir foto'));
      input.addEventListener('change', async () => {
        if (!input.files[0]) return;
        etiqueta.lastChild.textContent = 'Subiendo…';
        try { v.foto = await subirFoto(input.files[0]); v.fotoPos = '50% 50%'; v.fotoZoom = 1; dibujar(); emitir(); } finally { pintarControles(); }
      });
      controles.append(etiqueta);
      if (v.foto) {
        const zoom = (d) => { v.fotoZoom = Math.min(4, Math.max(1, Math.round(((v.fotoZoom || 1) + d) * 10) / 10)); dibujar(); emitir(); };
        controles.append(el('span', { class: 'tj-zoom' }, el('button', { type: 'button', class: 'tj-btn', 'aria-label': 'Alejar la foto', onclick: () => zoom(-0.1) }, '−'), 'Zoom',
          el('button', { type: 'button', class: 'tj-btn', 'aria-label': 'Acercar la foto', onclick: () => zoom(0.1) }, '+')));
      }
    }
    if (diseno.textos.some((t) => t.extra)) {
      const chk = el('input', { type: 'checkbox', role: 'switch' }); chk.checked = !!v.extra;
      chk.addEventListener('change', () => { v.extra = chk.checked; elegido = v.extra ? diseno.textos.find((t) => t.extra).id : null; dibujar(); pintarBarra(); emitir(); });
      controles.append(el('label', { class: 'interruptor mini' }, chk, el('span', {}, 'Texto adicional')));
    }
    controles.append(el('button', { type: 'button', class: 'btn-link', onclick: () => {
      if (!confirm('¿Volver la tarjeta a como viene en el diseño? Se pierden los cambios de textos y posiciones.')) return;
      v.textos = {}; elegido = null; dibujar(); pintarBarra(); emitir();
    } }, '↺ Restablecer'));
  };

  dibujar(); pintarBarra(); pintarControles();
  document.fonts?.ready.then(() => dibujar());
  return el('div', { class: 'tj-editor' }, lienzo, barra, controles);
}

// ── Dibujo final (JPG) ───────────────────────────────────────────────
const cargarImagen = (src) => new Promise((ok, mal) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = mal; i.src = src; });

function lineasDe(g, def, t, texto, tam) {
  const salida = [];
  for (const parrafo of String(texto).split('\n')) {
    if (!t.ancho || t.ajustar) { salida.push(parrafo); continue; }
    let linea = '';
    for (const palabra of parrafo.split(/\s+/)) {
      const prueba = linea ? `${linea} ${palabra}` : palabra;
      if (linea && anchoLinea(def, t, prueba, tam) > t.ancho) { salida.push(linea); linea = palabra; } else linea = prueba;
    }
    salida.push(linea);
  }
  return salida;
}
// Escribe desde la izquierda (x) y devuelve el ancho; con espaciado, letra por letra
function escribir(g, s, x, y, esp) {
  if (!esp) { g.fillText(s, x, y); return g.measureText(s).width; }
  let cx = x;
  for (const c of s) { g.fillText(c, cx, y); cx += g.measureText(c).width + esp; }
  return cx - x;
}
function escribirLinea(g, def, t, s, cx, y, tam) {
  const esp = t.espaciado || 0;
  const total = anchoLinea(def, t, s, tam);
  let x = cx - total / 2 + esp / 2;
  g.font = `${t.peso || 400} ${tam}px ${familia(def, t)}`;
  g.fillStyle = t.color || '#333';
  const partes = partirAmp(t, s);
  if (!partes) { escribir(g, s, x, y, esp); return total; }
  x += escribir(g, partes[0], x, y, esp) + tam * 0.12;
  const d = tam * (t.amp.tam || 0.62);
  g.fillStyle = t.amp.fondo; g.beginPath(); g.arc(x + d / 2, y, d / 2, 0, Math.PI * 2); g.fill();
  g.fillStyle = t.amp.color || '#fff'; g.font = `400 ${d * 0.78}px ${familia(def, t, 'titulos')}`; g.textAlign = 'center';
  g.fillText('&', x + d / 2, y + d * 0.04); g.textAlign = 'left';
  x += d + tam * 0.12;
  g.font = `${t.peso || 400} ${tam}px ${familia(def, t)}`; g.fillStyle = t.color || '#333';
  escribir(g, partes[1], x, y, esp);
  return total;
}

export async function dibujarTarjeta({ def, diseno, base, valor, vars }) {
  cargarFuentes(def);
  const W = def.ancho, H = def.alto;
  const cv = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const g = cv.getContext('2d');
  g.fillStyle = def.fondo || '#fff'; g.fillRect(0, 0, W, H);
  const v = valor || {};
  const capas = async (sobre) => { for (const c of (diseno.capas || []).filter((x) => !!x.sobreFoto === sobre)) g.drawImage(await cargarImagen(`${base}/${c.img}`), c.x, c.y, c.w, c.h); };
  await capas(false);
  if (diseno.foto && v.foto) {
    const f = diseno.foto, img = await cargarImagen(v.foto);
    const lado = 2 * f.r, s = Math.max(lado / img.naturalWidth, lado / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    const [px, py] = leerPos(v.fotoPos), z = v.fotoZoom || 1;
    g.save();
    g.beginPath(); g.arc(f.x, f.y, f.r, 0, Math.PI * 2); g.clip();
    g.translate(f.x, f.y); g.scale(z, z); g.translate(-f.x, -f.y);
    g.drawImage(img, f.x - f.r + (lado - dw) * px, f.y - f.r + (lado - dh) * py, dw, dh);
    g.restore();
  }
  await capas(true);
  await Promise.all(diseno.textos.flatMap((t) => [familia(def, t), familia(def, t, 'titulos')].map((fam) => document.fonts.load(`${t.peso || 400} ${t.tam}px ${fam}`).catch(() => null))));
  const textos = textosDe(diseno, v, vars, def);
  g.textAlign = 'left'; g.textBaseline = 'middle';
  for (const t of textos) {
    if (!t.valor) continue;
    const tam = t.tamFinal;
    g.font = `${t.peso || 400} ${tam}px ${familia(def, t)}`;
    const lineas = lineasDe(g, def, t, visible(t, t.valor), tam);
    const alto = tam * ALTO_LINEA;
    const cx = t.x + t.dx, y0 = t.y + t.dy - ((lineas.length - 1) * alto) / 2;
    lineas.forEach((l, i) => {
      const ancho = escribirLinea(g, def, t, l, cx, y0 + i * alto, tam);
      if (t.lineas && i === 0) {
        const largo = t.lineas.largo * t.escala, sep = t.lineas.separacion * t.escala, gr = t.lineas.grosor || 2;
        g.fillStyle = t.color || '#333';
        g.fillRect(cx - ancho / 2 - sep - largo, y0 - gr / 2, largo, gr);
        g.fillRect(cx + ancho / 2 + sep, y0 - gr / 2, largo, gr);
      }
    });
  }
  return new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.92));
}
