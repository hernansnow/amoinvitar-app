// README (ronda 95): la letra y el color de los nombres en las páginas sueltas (acceso/bloqueo, PIN, Buscá tu mesa) y en
// el PDF de los mensajes. Catálogo: la fuente de los nombres del modelo y su color más representativo, oscurecido lo
// necesario para leerse sobre blanco (si no hay, negro). A medida y corporativo: Kaushan Script en negro.
// Todas las fuentes están en /comun/fonts/catalogo/catalogo.css.

export const CSS_FUENTES = '/comun/fonts/catalogo/catalogo.css';
export const FUENTE_MEDIDA = 'Kaushan Script';
// Modelos sin «tarjetas.fuentes.titulos» en su modelo.json: la letra de los nombres de la portada (medida en la demo)
const FUENTE_DE = {
  byn: 'Jost', civil: 'Great Vibes', compromiso: 'Ruthie', esmeralda: 'Great Vibes', estilo: 'Great Vibes', marino: 'Sacramento',
  navidad: 'Amsterdam Four', oro: 'Montez', party: 'Great Vibes', pedida: 'Montez',
};
// Modelos cuyos nombres de portada van con otra letra que la de sus tarjetas
const FUENTE_PORTADA = { travel: 'Amsterdam Four', armonia: 'Jost', revelacion: 'Square Peg' };

const rgb = (hex) => { const h = String(hex || '').replace('#', ''); return /^[0-9a-f]{6}$/i.test(h) ? [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) : null; };
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrasteConBlanco = (c) => 1.05 / (lum(c) + 0.05);
const aHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

// El primer color de la paleta (el principal) que se lea sobre blanco; si es claro, se oscurece de a poco conservando el tono
export function colorLegible(paleta = []) {
  for (const hex of paleta) {
    let c = rgb(hex);
    if (!c) continue;
    const [r, g, b] = c;
    if (Math.max(r, g, b) - Math.min(r, g, b) < 12 && lum(c) > 0.6) continue; // blanco o gris muy claro: no representa
    for (let i = 0; i < 14 && contrasteConBlanco(c) < 3.2; i++) c = c.map((v) => v * 0.9);
    if (contrasteConBlanco(c) >= 3.2) return aHex(c);
  }
  return '#000000';
}

// README (ronda 96): letras con trazos muy altos y grandes (Dantina, Amsterdam Four…): más chicas y con aire arriba y abajo.
// tam = factor sobre el tamaño de cada página; linea = interlineado; aire = margen arriba/abajo (en em)
const AJUSTE = {
  Dantina: { tam: 0.58, linea: 1.8, aire: 0.7 },
  'Amsterdam Four': { tam: 0.68, linea: 1.9, aire: 0.55 },
  'Passions Conflict': { tam: 1.4, linea: 1.25, aire: 0.1 },
  'Fleur De Leah': { tam: 1.3, linea: 1.35, aire: 0.15 },
  Ruthie: { tam: 1.2, linea: 1.25, aire: 0.05 },
  'Square Peg': { tam: 1.2, linea: 1.25, aire: 0.05 },
  Monoton: { tam: 0.8, linea: 1.25, aire: 0.1 },
  'Sedgwick Ave Display': { tam: 0.95, linea: 1.2, aire: 0 },
};
export const ajusteDe = (fuente) => AJUSTE[fuente] || { tam: 1, linea: 1.2, aire: 0 };

export function estiloNombres(modelo, { medida = false } = {}) {
  if (medida || !modelo) return { fuente: FUENTE_MEDIDA, color: '#000000', css: CSS_FUENTES, ...ajusteDe(FUENTE_MEDIDA) };
  const fuente = FUENTE_PORTADA[modelo.id] || modelo.tarjetas?.fuentes?.titulos || FUENTE_DE[modelo.id] || 'Great Vibes';
  return { fuente, color: colorLegible(modelo.paleta), css: CSS_FUENTES, ...ajusteDe(fuente) };
}
// CSS de los nombres para una página: base = tamaño normal en rem
export function cssNombres(sel, ne, base) {
  if (!ne) return '';
  const f = String(ne.fuente).replace(/[^\w ]/g, ''), color = /^#[0-9a-f]{6}$/i.test(ne.color) ? ne.color : '#000';
  const tam = Number(ne.tam) || 1, linea = Number(ne.linea) || 1.2, aire = Number(ne.aire) || 0;
  return `${sel} { font-family: '${f}', 'Abril Fatface', Georgia, serif; color: ${color}; font-size: ${(base * tam).toFixed(2)}rem; line-height: ${linea}; margin-top: ${aire}em; margin-bottom: ${(aire + 0.25).toFixed(2)}em; overflow-wrap: normal; word-break: normal; text-wrap: balance; }`;
}
// A medida (diseño a medida y corporativo): Kaushan Script en negro
export const esMedida = (ev) => ev?.producto === 'a-medida' || ev?.tipo === 'empresarial';
