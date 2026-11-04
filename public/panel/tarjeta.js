// Tarjetas (Save The Date y agradecimiento): se editan directo sobre el diseño.
// Cada texto se puede mover (arrastrándolo), agrandar, achicar y reescribir; la foto se
// encuadra arrastrándola. "Restablecer" vuelve a lo que trae el diseño. Al generarla se
// dibuja la tarjeta en un canvas y se guarda como JPG.
//
// Un diseño: { ancho, alto, fondo, fuentes: { clave: "Familia", css }, capas, foto, textos }
// · capas: imágenes ({ img, x, y, w, h, tipos, excepto, sobreFoto }). Con sobreFoto van encima de la foto
//   (el fondo con el hueco transparente). tipos: solo para esos eventos (p. ej. ["15"]).
// · foto: círculo { x, y, r } o rectángulo { x, y, w, h } donde va la foto del cliente.
// · textos: { id, texto, x, y (centro; con alinear "izq", x es el borde izquierdo), tam, fuente (clave de
//   fuentes), peso, color, degradado: [colores] (de arriba abajo), espaciado (px entre letras),
//   ancho (corta en líneas), ajustar (una sola línea: si no entra en el ancho, se achica), tamSolo
//   (tamaño cuando va un solo nombre), mayus, altoLinea, lineas: { largo, separacion, grosor }
//   (rayitas a los costados), amp: { fondo, color, tam, fuente } ("&" en un círculo) o { tipo: "texto", color }
//   ("&" de otro color), extra (texto adicional), opcional: "clave" (se prende y apaga, p. ej. "proximamente"),
//   alinear "der" (x es el borde derecho), opacidad (0 a 1), sombra (true: sombra suave para texto sobre foto) }
// · foto.filtro: filtro CSS para la foto (p. ej. "grayscale(1) sepia(.2)"), igual en el editor y en el JPG
// · formas: rayas, rectángulos o círculos fijos del diseño ({ x, y, w, h, color, tipos, opacidad, circulo, borde: grosor del contorno, radio: esquinas redondeadas, soloArriba })
// · En los textos, también: rotar (grados), sesgo (grados: inclina la línea con las letras derechas), brillo: { color, blur } (neón), marcas: { chars: "|", color } (esos
//   caracteres de otro color, p. ej. las barras de "23 | 03 | 26") y amp: { img, tam, dy } (un dibujo en vez del "&")
//   relieve: { color, dx, dy, contorno } (contorno y sombra corrida, letras de cartel)
// · imagen: un dibujo en lugar de texto ({ id, imagen, x, y, tam: alto, proporcion: ancho/alto }), se mueve y se agranda igual
// · Variables: ver varsTarjeta() en panel.js ({nombres} {a} {b} {fecha} {fechaCorta} {lugar} …)
// El "&" no se escribe ni se borra: se mueve con los nombres (cada nombre se edita por separado).

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
const GENERICA = { titulos: 'cursive', brush: 'cursive', serif: 'serif', rouge: 'cursive', juliette: 'cursive', parisienne: 'cursive', satisfy: 'cursive', pristina: 'cursive', dantina: 'cursive', abril: 'serif', triforce: 'serif' };
const familia = (def, t, fuente = t.fuente) => `"${def.fuentes?.[fuente] || 'Jost'}", ${GENERICA[fuente] || 'sans-serif'}`;
const rellenar = (s, vars) => String(s || '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const leerPos = (p) => String(p || '50% 50%').split(' ').map((x) => parseFloat(x) / 100);
const visible = (t, valor) => (t.mayus ? String(valor).toLocaleUpperCase('es') : String(valor));
// Posición horizontal según la alineación: centro (x es el medio), izquierda o derecha (x es el borde)
const desplazX = (t, dx) => (t.alinear === 'izq' ? `${dx}px` : t.alinear === 'der' ? `calc(-100% + ${dx}px)` : `calc(-50% + ${dx}px)`);
// La posición del texto en el editor (con su giro, si el diseño lo tiene inclinado)
const mover = (t, dx, dy) => `translate(${desplazX(t, dx)}, calc(-50% + ${dy}px))${t.rotar ? ` rotate(${t.rotar}deg)` : ''}${t.sesgo ? ` skewY(${t.sesgo}deg)` : ''}`;
// Con sesgo, el texto se inclina desde su punto de anclaje (el medio, o el borde si va alineado)
const origen = (t) => (t.sesgo ? `;transform-origin:${t.alinear === 'izq' ? 'left' : t.alinear === 'der' ? 'right' : 'center'} center` : '');
const formasDe = (diseno, tipo) => (diseno.formas || []).filter((c) => (!c.tipos || c.tipos.includes(tipo)) && !(c.excepto || []).includes(tipo));
// El relieve en el editor: la sombra corrida en escalones y el contorno por detrás del relleno
const relieveCss = (r) => {
  const n = Math.max(1, Math.round(Math.max(Math.abs(r.dx || 0), Math.abs(r.dy || 0)) / 2));
  const capas = Array.from({ length: n }, (_, k) => `${((r.dx || 0) * (k + 1)) / n}px ${((r.dy || 0) * (k + 1)) / n}px 0 ${r.color}`);
  return `text-shadow:${capas.join(',')}${r.contorno ? `;-webkit-text-stroke:${r.contorno * 2}px ${r.color};paint-order:stroke fill` : ''}`;
};
const OPCIONALES = { proximamente: 'Próximamente la invitación formal' };
const conAmp = (t) => t.amp && t.amp.tipo !== 'texto';
const esMarca = (t, c) => !!t.marcas && (t.marcas.chars || '|').includes(c);
// "Lau & Pablo" → ["Lau", "Pablo"] cuando el diseño dibuja el "&" aparte
const partirAmp = (t, valor) => {
  if (!t.amp) return null;
  const i = valor.indexOf(' & ');
  return i < 0 ? null : [valor.slice(0, i), valor.slice(i + 3)];
};

// ── Medidas (las mismas para el editor y para el JPG) ──
const medidor = document.createElement('canvas').getContext('2d');
function anchoLinea(def, t, s, tam) {
  medidor.font = `${t.peso || 400} ${tam}px ${familia(def, t)}`;
  const esp = t.espaciado || 0;
  const w = (x) => medidor.measureText(x).width + esp * [...x].length;
  const partes = partirAmp(t, s);
  if (!partes) return w(s);
  if (!conAmp(t)) return w(`${partes[0]} `) + w('&') + w(` ${partes[1]}`);
  return w(partes[0]) + w(partes[1]) + tam * (t.amp.tam || 0.62) + tam * 0.24;
}
function tamAjustado(def, t, valor, tam) {
  if (!t.ajustar || !t.ancho || !valor) return tam;
  const ancho = Math.max(...visible(t, valor).split('\n').map((l) => anchoLinea(def, t, l, tam)));
  return ancho > t.ancho ? Math.max(tam * 0.4, (tam * t.ancho) / ancho) : tam;
}

// Texto final de cada elemento (lo que escribió el cliente o el del diseño)
// Los nombres que van en textos separados (nombreA y nombreB, o los de un mismo "grupo") se achican
// juntos, en la misma proporción: si uno no entra, el otro baja igual (ninguno parece más importante)
const grupoDe = (t) => t.grupo || (/^nombre[AB]$/.test(t.id) ? 'nombres' : null);
export function textosDe(diseno, v, vars, def) {
  const lista = diseno.textos.filter((t) => (!t.extra || v.extra) && (!t.opcional || v.opcionales?.[t.opcional] !== false)).map((t) => {
    const p = v.textos?.[t.id] || {};
    const valor = p.texto ?? rellenar(t.texto, vars), escala = p.escala || 1;
    const base = (t.tamSolo && !String(valor).includes(' & ') ? t.tamSolo : t.tam) * escala;
    let tamFinal = tamAjustado(def, t, valor, base);
    // Un párrafo más largo que el del diseño (el mensaje del agradecimiento): se achica hasta ocupar las mismas líneas
    if (t.ancho && !t.ajustar && !t.imagen && valor) {
      const lim = Math.max(t.maxLineas || 0, lineasDe(def, t, visible(t, rellenar(t.texto, vars)), base).length);
      for (let i = 0; i < 20 && lineasDe(def, t, visible(t, valor), tamFinal).length > lim && tamFinal > base * 0.55; i++) tamFinal *= 0.95;
    }
    return { ...t, valor, dx: p.dx || 0, dy: p.dy || 0, escala, tamFinal, ajuste: base ? tamFinal / base : 1 };
  });
  const minimo = {};
  for (const t of lista) { const g = grupoDe(t); if (g) minimo[g] = Math.min(minimo[g] ?? 1, t.ajuste); }
  for (const t of lista) { const g = grupoDe(t); if (g) t.tamFinal = (t.tamFinal / t.ajuste) * minimo[g]; }
  return lista;
}
// README (ronda 28): todas las tarjetas tienen "Texto adicional"; si el diseño no lo trae, va arriba del "Próximamente…"
// (o abajo de todo) con la misma letra
export function conExtra(diseno) {
  if (!diseno?.textos || diseno.textos.some((t) => t.extra)) return diseno;
  const pie = diseno.textos.find((t) => t.opcional === 'proximamente') || [...diseno.textos].sort((a, b) => b.y - a.y)[0];
  if (!pie) return diseno;
  const tam = Math.max(28, pie.tam || 36);
  const extra = { id: 'extra', texto: '', extra: true, x: pie.alinear ? pie.x : (pie.x || (diseno.ancho || 2160) / 2), y: Math.round(pie.y - tam * 1.9), tam, fuente: pie.fuente,
    peso: pie.peso, color: pie.color, ancho: Math.round((diseno.ancho || 2160) * 0.7), ...(pie.alinear ? { alinear: pie.alinear } : {}) };
  return { ...diseno, textos: [...diseno.textos, extra] };
}
const capasDe = (diseno, tipo) => (diseno.capas || []).filter((c) => (!c.tipos || c.tipos.includes(tipo)) && !(c.excepto || []).includes(tipo));

// Las fuentes del diseño (si la página todavía no las tiene)
function cargarFuentes(def) {
  for (const css of [].concat(def.fuentes?.css || [])) {
    if (!document.querySelector(`link[href="${css}"]`)) document.head.append(el('link', { rel: 'stylesheet', href: css }));
  }
}
const fuentesListas = (def, diseno) => Promise.all(diseno.textos.flatMap((t) => [familia(def, t), familia(def, t, t.amp?.fuente || 'titulos')]
  .map((fam) => document.fonts.load(`${t.peso || 400} ${t.tam}px ${fam}`).catch(() => null))));

// ── Editor ───────────────────────────────────────────────────────────
export function editorTarjeta({ def, diseno: d0, base, valor, vars, varsDe, tipo, alCambiar, subirFoto, clase = 'std' }) {
  const diseno = conExtra(d0);
  cargarFuentes(def);
  const W = def.ancho, H = def.alto;
  let v = structuredClone(valor || {}); v.textos ??= {};
  let elegido = null, escribiendo = null, editando = false;
  // Los datos de los campos (nombres, fecha, hora) cambian las variables de la tarjeta
  const varsAhora = () => (varsDe ? varsDe(v.datos || {}) : vars);
  // Historial para deshacer y rehacer (cada cambio guardado es un paso)
  const historia = [JSON.stringify(v)]; let paso = 0;
  const emitir = () => {
    const ahora = JSON.stringify(v);
    if (ahora !== historia[paso]) { historia.splice(paso + 1); historia.push(ahora); if (historia.length > 60) historia.shift(); paso = historia.length - 1; }
    alCambiar(structuredClone(v)); pintarArriba?.();
  };
  const irPaso = (d) => {
    const n = paso + d; if (n < 0 || n >= historia.length) return;
    paso = n; v = JSON.parse(historia[n]); v.textos ??= {}; elegido = null; escribiendo = null;
    alCambiar(structuredClone(v)); dibujar(); pintarBarra(); pintarControles(); pintarCampos(); pintarArriba();
  };

  const capa = el('div', { class: 'tj-capa', style: `width:${W}px;height:${H}px;background:${def.fondo || '#fff'}` });
  const lienzo = el('div', { class: 'tj-lienzo bloqueado', style: `aspect-ratio:${W} / ${H}` }, capa);
  const escalar = () => { const k = lienzo.clientWidth / W; capa.style.transform = `scale(${k})`; lienzo.dataset.k = k; };
  new ResizeObserver(escalar).observe(lienzo);
  const k = () => Number(lienzo.dataset.k) || 1;

  const barra = el('div', { class: 'tj-barra' });
  const pintarBarra = () => {
    barra.replaceChildren();
    if (!editando) return;
    if (!elegido) { barra.append(el('span', { class: 'tj-pista' }, 'Toca un texto para moverlo, cambiar su tamaño o escribir otro.')); return; }
    const p = () => (v.textos[elegido] ??= {});
    const tam = (d) => { p().escala = Math.min(3, Math.max(0.3, Math.round(((p().escala || 1) + d) * 100) / 100)); dibujar(); emitir(); };
    barra.append(
      el('button', { type: 'button', class: 'tj-btn', title: 'Achicar', 'aria-label': 'Achicar', onclick: () => tam(-0.08) }, 'A−'),
      el('button', { type: 'button', class: 'tj-btn grande', title: 'Agrandar', 'aria-label': 'Agrandar', onclick: () => tam(0.08) }, 'A+'),
      ...(diseno.textos.find((x) => x.id === elegido)?.imagen ? [] : [el('button', { type: 'button', class: 'tj-btn', onclick: () => editarTexto(elegido) }, '✎ Escribir')]),
      el('button', { type: 'button', class: 'tj-btn', title: 'Volver a su lugar horizontal', onclick: () => { p().dx = 0; dibujar(); emitir(); } }, '↔ Centrar'));
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

  // Escribir: con el "&" del diseño, se editan los dos nombres por separado; el "&" no se toca
  function editarTexto(id) {
    escribiendo = id; elegido = id; dibujar(); pintarBarra();
    const nodo = capa.querySelector(`[data-id="${id}"]`); if (!nodo) return;
    const partes = [...nodo.querySelectorAll('.tj-parte')];
    const editables = partes.length ? partes : [nodo.querySelector('.tj-valor')];
    for (const span of editables) {
      try { span.contentEditable = 'plaintext-only'; } catch { /* viejo */ }
      if (span.contentEditable !== 'plaintext-only') span.contentEditable = 'true';
      span.oninput = () => {
        const texto = partes.length ? partes.map((x) => x.innerText.replace(/\s*&\s*/g, ' ').trim()).join(' & ') : span.innerText;
        (v.textos[id] ??= {}).texto = texto.replace(/\n{3,}/g, '\n\n').slice(0, 300); emitir();
      };
      span.onblur = () => setTimeout(() => { if (!nodo.contains(document.activeElement)) { escribiendo = null; dibujar(); } }, 0);
    }
    editables[0].focus();
    const r = document.createRange(); r.selectNodeContents(editables[0]); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  function nodoTexto(t) {
    // Un dibujo que se mueve y se agranda como un texto (el avión entre los nombres de Travel)
    if (t.imagen) {
      const h = t.tamFinal, w = h * (t.proporcion || 1);
      return el('div', { class: 'tj-texto', 'data-id': t.id, tabindex: '0', role: 'button', 'aria-label': 'Dibujo',
        style: `left:${t.x}px;top:${t.y}px;transform:${mover(t, t.dx, t.dy)};line-height:0${t.opacidad != null ? `;opacity:${t.opacidad}` : ''}` },
      el('span', { class: 'tj-valor', style: `display:block;width:${w}px;height:${h}px;background:url(${base}/${t.imagen}) center/contain no-repeat` }));
    }
    const val = visible(t, t.valor || ' ');
    const partes = partirAmp(t, escribiendo === t.id ? String(t.valor) : val);
    const d = conAmp(t) ? t.tamFinal * (t.amp.tam || 0.62) : 0;
    const amp = !partes ? null : t.amp?.img
      ? el('span', { class: 'tj-amp', contenteditable: 'false', 'aria-hidden': 'true', style: `width:${d}px;height:${d}px;margin:0 ${t.tamFinal * 0.12}px;background:url(${base}/${t.amp.img}) center/contain no-repeat;transform:translateY(${(t.amp.dy || 0) * d}px)` })
      : conAmp(t)
      ? el('span', { class: 'tj-amp', contenteditable: 'false', 'aria-hidden': 'true', style: `width:${d}px;height:${d}px;background:${t.amp.fondo};color:${t.amp.color || '#fff'};font-family:${familia(def, t, t.amp.fuente || 'titulos')};font-size:${d * 0.78}px;margin:0 ${t.tamFinal * 0.12}px` }, '&')
      : el('span', { class: 'tj-amp-texto', contenteditable: 'false', 'aria-hidden': 'true', style: t.amp.color ? `color:${t.amp.color};-webkit-text-fill-color:${t.amp.color}` : '' }, ' & ');
    const degradado = t.degradado ? `background-image:linear-gradient(180deg, ${t.degradado.join(', ')});-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent` : '';
    // Caracteres de otro color (las barras de la fecha): solo para ver; al escribir va el texto entero
    const conMarcas = t.marcas && escribiendo !== t.id && !partes ? [...val].map((c) => (esMarca(t, c) ? el('span', { style: `color:${t.marcas.color};-webkit-text-fill-color:${t.marcas.color}` }, c) : c)) : null;
    const valor = el('span', { class: 'tj-valor', style: degradado }, ...(partes ? [el('span', { class: 'tj-parte' }, partes[0]), amp, el('span', { class: 'tj-parte' }, partes[1])] : conMarcas || [val]));
    const raya = () => el('span', { class: 'tj-raya', style: `width:${t.lineas.largo * t.escala}px;height:${t.lineas.grosor || 2}px` });
    const izq = t.alinear === 'izq', der = t.alinear === 'der';
    return el('div', { class: `tj-texto${izq ? ' izq' : der ? ' der' : ''}`, 'data-id': t.id, tabindex: '0', role: 'button', 'aria-label': `Texto: ${t.valor || t.id}`,
      style: [`left:${t.x}px`, `top:${t.y}px`, `transform:${mover(t, t.dx, t.dy)}${origen(t)}`, `font-family:${familia(def, t)}`,
        t.opacidad != null ? `opacity:${t.opacidad}` : '', t.sombra ? 'text-shadow:0 2px 14px rgba(0,0,0,.45)' : '',
        t.brillo ? `text-shadow:0 0 ${t.brillo.blur}px ${t.brillo.color},0 0 ${t.brillo.blur * 2}px ${t.brillo.color}` : '',
        t.relieve ? relieveCss(t.relieve) : '',
        `font-size:${t.tamFinal}px`, `font-weight:${t.peso || 400}`, `color:${t.color || '#333'}`, `--esp:${t.espaciado || 0}px`,
        t.lineas ? `gap:${t.lineas.separacion * t.escala}px` : '', t.ancho && !t.ajustar ? `width:${t.ancho}px` : 'white-space:pre', `line-height:${t.altoLinea || ALTO_LINEA}`].join(';') },
    t.lineas ? raya() : null, valor, t.lineas ? raya() : null);
  }

  function dibujar() {
    capa.replaceChildren();
    const adorno = (c) => el('img', { class: 'tj-adorno', src: `${base}/${c.img}`, alt: '', draggable: 'false', style: `left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px` });
    for (const c of capasDe(diseno, tipo).filter((x) => !x.sobreFoto)) capa.append(adorno(c));
    for (const f of formasDe(diseno, tipo)) capa.append(el('div', { class: 'tj-adorno', style: `left:${f.x}px;top:${f.y}px;width:${f.w}px;height:${f.h}px;box-sizing:border-box;${f.borde ? `border:${f.borde}px solid ${f.color || '#333'}` : `background:${f.color || '#333'}`}${f.circulo ? ';border-radius:50%' : f.radio ? `;border-radius:${f.radio}px ${f.radio}px ${f.soloArriba ? 0 : f.radio}px ${f.soloArriba ? 0 : f.radio}px` : ''}${f.opacidad != null ? `;opacity:${f.opacidad}` : ''}` }));
    // Foto: círculo o rectángulo que se encuadra arrastrando
    if (diseno.foto) {
      const f = diseno.foto, circulo = f.r != null;
      const caja = circulo ? { x: f.x - f.r, y: f.y - f.r, w: 2 * f.r, h: 2 * f.r } : f;
      const hueco = el('div', { class: `tj-foto${circulo ? ' circulo' : ''}`, style: `left:${caja.x}px;top:${caja.y}px;width:${caja.w}px;height:${caja.h}px` });
      if (v.foto) {
        const img = el('img', { src: v.foto, alt: '', draggable: 'false', style: `object-position:${v.fotoPos || '50% 50%'};transform:scale(${v.fotoZoom || 1})${f.filtro ? `;filter:${f.filtro}` : ''}` });
        hueco.append(img);
        let ini;
        arrastrar(hueco, {
          alEmpezar: () => { ini = leerPos(v.fotoPos); elegido = null; pintarBarra(); marcar(); },
          alMover: (dx, dy) => {
            const z = v.fotoZoom || 1;
            const nx = Math.min(1, Math.max(0, ini[0] - dx / (caja.w * z))), ny = Math.min(1, Math.max(0, ini[1] - dy / (caja.h * z)));
            v.fotoPos = `${Math.round(nx * 100)}% ${Math.round(ny * 100)}%`; img.style.objectPosition = v.fotoPos;
          },
          alSoltar: () => emitir(),
        });
      } else hueco.append(el('span', { class: 'tj-sin-foto' }, 'Tu foto'));
      capa.append(hueco);
    }
    for (const c of capasDe(diseno, tipo).filter((x) => x.sobreFoto)) capa.append(adorno(c));
    for (const t of textosDe(diseno, v, varsAhora(), def)) {
      const nodo = nodoTexto(t);
      let ini;
      arrastrar(nodo, {
        alEmpezar: () => { const p = v.textos[t.id] || {}; ini = [p.dx || 0, p.dy || 0]; },
        alMover: (dx, dy) => { const p = (v.textos[t.id] ??= {}); p.dx = Math.round(ini[0] + dx); p.dy = Math.round(ini[1] + dy); nodo.style.transform = mover(t, p.dx, p.dy); },
        alSoltar: (movio) => { if (movio) emitir(); else if (elegido === t.id) { editarTexto(t.id); return; } elegido = t.id; pintarBarra(); marcar(); },
      });
      nodo.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.target.isContentEditable) { e.preventDefault(); editarTexto(t.id); } });
      capa.append(nodo);
    }
    marcar();
  }
  const marcar = () => capa.querySelectorAll('.tj-texto').forEach((n) => { n.classList.toggle('elegido', n.dataset.id === elegido); n.classList.toggle('escribiendo', n.dataset.id === escribiendo); });
  capa.addEventListener('pointerdown', (e) => { if (e.target === capa || e.target.classList.contains('tj-adorno')) { elegido = null; pintarBarra(); marcar(); } });

  // Controles de abajo: foto, textos opcionales, texto adicional, restablecer
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
  };

  // Arriba: Editar / Listo, deshacer, rehacer y volver al original
  const arriba = el('div', { class: 'tj-arriba' });
  function pintarArriba() {
    arriba.replaceChildren(
      el('button', { type: 'button', class: `btn btn-chico${editando ? '' : ' btn-sec'}`, onclick: () => {
        editando = !editando; elegido = null; escribiendo = null; lienzo.classList.toggle('bloqueado', !editando); dibujar(); pintarBarra(); pintarArriba();
      } }, editando ? '✓ Listo' : '✎ Editar sobre la tarjeta'),
      el('button', { type: 'button', class: 'tj-btn', title: 'Deshacer', 'aria-label': 'Deshacer', disabled: paso === 0, onclick: () => irPaso(-1) }, '↶'),
      el('button', { type: 'button', class: 'tj-btn', title: 'Rehacer', 'aria-label': 'Rehacer', disabled: paso >= historia.length - 1, onclick: () => irPaso(1) }, '↷'),
      el('button', { type: 'button', class: 'tj-btn', title: 'Volver al diseño original', onclick: () => {
        if (!confirm('¿Volver la tarjeta a como viene en el diseño? (Con ↶ puedes deshacerlo.)')) return;
        const foto = v.foto, pos = v.fotoPos, zoom = v.fotoZoom;
        v = { textos: {}, ...(foto ? { foto, fotoPos: pos, fotoZoom: zoom } : {}) }; elegido = null; dibujar(); pintarBarra(); pintarControles(); pintarCampos(); emitir();
      } }, '↺ Original'));
  }

  // Campos para cambiar los textos sin tocar la tarjeta
  const campos = el('div', { class: 'tj-campos' });
  const idsNombres = ['nombres', 'nombreA', 'nombreB', 'a', 'b'];
  const textoDe = (id) => diseno.textos.find((t) => t.id === id);
  function pintarCampos() {
    campos.replaceChildren();
    const vv = varsAhora(); v.datos ??= {};
    const entrada = (etiqueta, valor, alCambiar, { tipo = 'text', max = 80, area = false, placeholder = '' } = {}) => {
      // Un texto del diseño en varias líneas se edita en un cuadro de varias líneas (los saltos quedan);
      // el mensaje del agradecimiento va siempre en un solo párrafo
      const multi = !area && tipo === 'text' && String(valor || '').includes('\n');
      const i = el(area || multi ? 'textarea' : 'input', { ...(area || multi ? { rows: area ? 4 : String(valor).split('\n').length } : { type: tipo }), maxlength: max, placeholder, class: 'tj-entrada' });
      i.value = valor || '';
      i.addEventListener('input', () => { alCambiar(area ? i.value.replace(/\s*\n+\s*/g, ' ') : i.value); dibujar(); clearTimeout(i._t); i._t = setTimeout(emitir, 400); });
      return el('label', { class: 'tj-fila' }, el('span', {}, etiqueta), i);
    };
    const sinManual = (ids) => ids.forEach((id) => { if (v.textos[id]) delete v.textos[id].texto; });
    const plural = diseno.textos.some((t) => /^nombre[AB]$/.test(t.id)) || String(vv.b || '').trim();
    campos.append(el('div', { class: 'tj-par' },
      entrada(plural ? 'Nombre 1' : 'Nombre', v.datos.a ?? vv.a, (x) => { v.datos.a = x; sinManual(idsNombres); }, { max: 20 }),
      plural ? entrada('Nombre 2', v.datos.b ?? vv.b, (x) => { v.datos.b = x; sinManual(idsNombres); }, { max: 20 }) : null));
    const fechaIds = diseno.textos.filter((t) => /\{(fecha\w*|dia|dd|mes\w*|anio\w*|diaSemana\w*)\}/.test(t.texto)).map((t) => t.id);
    campos.append(el('div', { class: 'tj-par' },
      entrada('Fecha del evento', v.datos.fecha ?? vv.iso, (x) => { v.datos.fecha = x; sinManual(fechaIds); }, { tipo: 'date' }),
      entrada('Horario (opcional)', v.datos.hora ?? vv.horaIso, (x) => { v.datos.hora = x; }, { tipo: 'time' })));
    const porTexto = (id, etiqueta, opciones) => {
      const t = textoDe(id); if (!t) return;
      campos.append(entrada(etiqueta, v.textos[id]?.texto ?? rellenar(t.texto, vv), (x) => { (v.textos[id] ??= {}).texto = x; }, opciones));
    };
    if (clase === 'agradecimiento') {
      porTexto('titulo', 'Título');
      porTexto('mensaje', 'Mensaje', { area: true, max: 400 });
    } else {
      porTexto('titulo', 'Título');
      porTexto(['evento', 'eventoExclama', 'invitamos', 'teEsperamos'].find((id) => textoDe(id)), 'Subtítulo');
      // Próximamente la invitación formal: se prende, se apaga y se puede cambiar el texto
      const pie = diseno.textos.find((t) => t.opcional === 'proximamente');
      if (pie) {
        const chk = el('input', { type: 'checkbox', role: 'switch' }); chk.checked = v.opcionales?.proximamente !== false;
        chk.addEventListener('change', () => { (v.opcionales ??= {}).proximamente = chk.checked; dibujar(); pintarCampos(); emitir(); });
        campos.append(el('label', { class: 'interruptor mini' }, chk, el('span', {}, 'Mostrar "Próximamente la invitación formal"')));
        if (v.opcionales?.proximamente !== false) campos.append(entrada('Texto', v.textos[pie.id]?.texto ?? rellenar(pie.texto, vv), (x) => { (v.textos[pie.id] ??= {}).texto = x; }, { max: 60 }));
      }
    }
    // Texto adicional
    const ex = diseno.textos.find((t) => t.extra);
    if (ex) {
      const chk = el('input', { type: 'checkbox', role: 'switch' }); chk.checked = !!v.extra;
      chk.addEventListener('change', () => { v.extra = chk.checked; dibujar(); pintarCampos(); emitir(); });
      campos.append(el('label', { class: 'interruptor mini' }, chk, el('span', {}, 'Texto adicional')));
      if (v.extra) campos.append(entrada('Texto adicional', v.textos[ex.id]?.texto ?? rellenar(ex.texto, vv), (x) => { (v.textos[ex.id] ??= {}).texto = x; }, { max: 120, placeholder: 'Por ejemplo: el lugar o la ciudad' }));
    }
  }

  dibujar(); pintarBarra(); pintarControles(); pintarArriba(); pintarCampos();
  fuentesListas(def, diseno).then(() => dibujar());
  return el('div', { class: 'tj-editor' }, arriba, lienzo, barra, controles, campos);
}

// ── Dibujo final (JPG) ───────────────────────────────────────────────
const cargarImagen = (src) => new Promise((ok, mal) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = mal; i.src = src; });

function lineasDe(def, t, texto, tam) {
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
// Con contorno (g.conTrazo), cada letra se repasa antes con el trazo
const pintar = (g, s, x, y) => { if (g.conTrazo) g.strokeText(s, x, y); g.fillText(s, x, y); };
function escribir(g, s, x, y, esp, t = null) {
  if (!esp && !t?.marcas) { pintar(g, s, x, y); return g.measureText(s).width; }
  let cx = x;
  const relleno = g.fillStyle;
  for (const c of s) {
    if (t && esMarca(t, c)) g.fillStyle = t.marcas.color;
    pintar(g, c, cx, y); g.fillStyle = relleno;
    cx += g.measureText(c).width + esp;
  }
  return cx - x;
}
function escribirLinea(g, def, t, s, x0, y, tam, relleno) {
  const esp = t.espaciado || 0;
  const total = anchoLinea(def, t, s, tam);
  let x = (t.alinear === 'izq' ? x0 : t.alinear === 'der' ? x0 - total : x0 - total / 2) + esp / 2;
  const fuente = `${t.peso || 400} ${tam}px ${familia(def, t)}`;
  g.font = fuente; g.fillStyle = relleno;
  const partes = partirAmp(t, s);
  if (!partes) { escribir(g, s, x, y, esp, t); return total; }
  if (!conAmp(t)) {
    x += escribir(g, `${partes[0]} `, x, y, esp);
    if (t.amp.color) g.fillStyle = t.amp.color;
    x += escribir(g, '&', x, y, esp);
    g.fillStyle = relleno;
    escribir(g, ` ${partes[1]}`, x, y, esp);
    return total;
  }
  x += escribir(g, partes[0], x, y, esp) + tam * 0.12;
  const d = tam * (t.amp.tam || 0.62);
  if (t.amp.img && t.amp.imagen) {
    // Contenido en el cuadrado d × d sin deformarse (igual que "contain" en el editor)
    const im = t.amp.imagen, k = Math.min(d / im.width, d / im.height), w = im.width * k, h = im.height * k;
    g.drawImage(im, x + (d - w) / 2, y - h / 2 + (t.amp.dy || 0) * d, w, h);
  }
  else {
    g.fillStyle = t.amp.fondo; g.beginPath(); g.arc(x + d / 2, y, d / 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = t.amp.color || '#fff'; g.font = `400 ${d * 0.78}px ${familia(def, t, t.amp.fuente || 'titulos')}`; g.textAlign = 'center';
    g.fillText('&', x + d / 2, y + d * 0.04); g.textAlign = 'left';
  }
  x += d + tam * 0.12;
  g.font = fuente; g.fillStyle = relleno;
  escribir(g, partes[1], x, y, esp);
  return total;
}

export async function dibujarTarjeta({ def, diseno: d0, base, valor, vars, tipo }) {
  const diseno = conExtra(d0);
  cargarFuentes(def);
  const W = def.ancho, H = def.alto;
  const cv = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const g = cv.getContext('2d');
  g.fillStyle = def.fondo || '#fff'; g.fillRect(0, 0, W, H);
  const v = valor || {};
  const capas = async (sobre) => { for (const c of capasDe(diseno, tipo).filter((x) => !!x.sobreFoto === sobre)) g.drawImage(await cargarImagen(`${base}/${c.img}`), c.x, c.y, c.w, c.h); };
  await capas(false);
  for (const f of formasDe(diseno, tipo)) { g.save(); if (f.opacidad != null) g.globalAlpha = f.opacidad; g.fillStyle = g.strokeStyle = f.color || '#333';
    if (f.circulo) {
      // Círculo (relleno, o solo el contorno con "borde")
      g.beginPath(); g.ellipse(f.x + f.w / 2, f.y + f.h / 2, f.w / 2 - (f.borde || 0) / 2, f.h / 2 - (f.borde || 0) / 2, 0, 0, Math.PI * 2);
      if (f.borde) { g.lineWidth = f.borde; g.stroke(); } else g.fill();
    } else if (f.radio) {
      // Rectángulo con las esquinas redondeadas (soloArriba: solo las de arriba)
      const r = f.radio, rb = f.soloArriba ? 0 : r;
      g.beginPath(); g.roundRect(f.x, f.y, f.w, f.h, [r, r, rb, rb]); g.fill();
    } else if (f.borde) { g.lineWidth = f.borde; g.strokeRect(f.x + f.borde / 2, f.y + f.borde / 2, f.w - f.borde, f.h - f.borde); } else g.fillRect(f.x, f.y, f.w, f.h);
    g.restore(); }
  if (diseno.foto && v.foto) {
    const f = diseno.foto, img = await cargarImagen(v.foto);
    const circulo = f.r != null;
    const caja = circulo ? { x: f.x - f.r, y: f.y - f.r, w: 2 * f.r, h: 2 * f.r } : f;
    const s = Math.max(caja.w / img.naturalWidth, caja.h / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    const [px, py] = leerPos(v.fotoPos), z = v.fotoZoom || 1;
    const cx = caja.x + caja.w / 2, cy = caja.y + caja.h / 2;
    g.save();
    g.beginPath();
    if (circulo) g.arc(f.x, f.y, f.r, 0, Math.PI * 2); else g.rect(caja.x, caja.y, caja.w, caja.h);
    g.clip();
    g.translate(cx, cy); g.scale(z, z); g.translate(-cx, -cy);
    if (f.filtro) g.filter = f.filtro;
    g.drawImage(img, caja.x + (caja.w - dw) * px, caja.y + (caja.h - dh) * py, dw, dh);
    g.restore();
  }
  await capas(true);
  await fuentesListas(def, diseno);
  const textos = textosDe(diseno, v, vars, def);
  for (const t of textos) if (t.imagen) t.dibujo = await cargarImagen(`${base}/${t.imagen}`).catch(() => null);
  for (const t of textos) if (t.amp?.img) t.amp = { ...t.amp, imagen: await cargarImagen(`${base}/${t.amp.img}`) };
  g.textAlign = 'left'; g.textBaseline = 'middle';
  for (const t of textos) {
    if (t.imagen) {
      if (!t.dibujo) continue;
      const h = t.tamFinal, w = h * (t.proporcion || 1), x0 = t.x + t.dx, y0 = t.y + t.dy;
      const xi = t.alinear === 'izq' ? x0 : t.alinear === 'der' ? x0 - w : x0 - w / 2;
      g.save(); if (t.opacidad != null) g.globalAlpha = t.opacidad;
      if (t.rotar) { g.translate(x0, y0); g.rotate((t.rotar * Math.PI) / 180); g.translate(-x0, -y0); }
      g.drawImage(t.dibujo, xi, y0 - h / 2, w, h); g.restore();
      continue;
    }
    if (!String(t.valor).trim()) continue;
    const tam = t.tamFinal;
    g.font = `${t.peso || 400} ${tam}px ${familia(def, t)}`;
    const lineas = lineasDe(def, t, visible(t, t.valor), tam);
    const alto = tam * (t.altoLinea || ALTO_LINEA);
    const x0 = t.x + t.dx, y0 = t.y + t.dy - ((lineas.length - 1) * alto) / 2;
    let relleno = t.color || '#333';
    if (t.degradado) {
      const gr = g.createLinearGradient(0, y0 - tam * 0.6, 0, y0 + (lineas.length - 1) * alto + tam * 0.5);
      t.degradado.forEach((c, i) => gr.addColorStop(i / Math.max(1, t.degradado.length - 1), c));
      relleno = gr;
    }
    g.save();
    if (t.opacidad != null) g.globalAlpha = t.opacidad;
    if (t.sombra) { g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 14; g.shadowOffsetY = 2; }
    if (t.brillo) { g.shadowColor = t.brillo.color; g.shadowBlur = t.brillo.blur * 2; }
    if (t.rotar) { g.translate(x0, t.y + t.dy); g.rotate((t.rotar * Math.PI) / 180); g.translate(-x0, -(t.y + t.dy)); }
    // Sesgo: la línea del texto sube o baja pero las letras siguen derechas (Disco, Vintage)
    if (t.sesgo) { g.translate(x0, t.y + t.dy); g.transform(1, Math.tan((t.sesgo * Math.PI) / 180), 0, 1, 0, 0); g.translate(-x0, -(t.y + t.dy)); }
    // Relieve (letras con contorno y sombra corrida, estilo cartel): primero las capas de atrás
    const rl = t.relieve;
    if (rl) {
      g.lineJoin = 'round'; g.strokeStyle = rl.color; g.lineWidth = (rl.contorno || 0) * 2; g.conTrazo = !!rl.contorno;
      const n = Math.max(1, Math.round(Math.max(Math.abs(rl.dx || 0), Math.abs(rl.dy || 0)) / 2));
      for (let k = n; k >= 1; k--) lineas.forEach((l, i) => escribirLinea(g, def, t, l, x0 + ((rl.dx || 0) * k) / n, y0 + i * alto + ((rl.dy || 0) * k) / n, tam, rl.color));
    }
    lineas.forEach((l, i) => {
      // Con brillo (neón) se escribe dos veces: el resplandor más ancho y encima uno más cerrado
      if (t.brillo) { g.save(); g.shadowBlur = t.brillo.blur; escribirLinea(g, def, t, l, x0, y0 + i * alto, tam, relleno); g.restore(); }
      const ancho = escribirLinea(g, def, t, l, x0, y0 + i * alto, tam, relleno);
      if (t.lineas && i === 0) {
        const largo = t.lineas.largo * t.escala, sep = t.lineas.separacion * t.escala, gr = t.lineas.grosor || 2;
        g.fillStyle = t.color || '#333';
        g.fillRect(x0 - ancho / 2 - sep - largo, y0 - gr / 2, largo, gr);
        g.fillRect(x0 + ancho / 2 + sep, y0 - gr / 2, largo, gr);
      }
    });
    g.conTrazo = false;
    g.restore();
  }
  return new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.9));
}
