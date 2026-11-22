// README (ronda 98): idioma de las páginas sueltas (PIN, bloqueo, Buscá tu mesa y Recepción). Manda el que se elige con
// el selector de la página (?lang=); si no hay, el del panel (cookie «idioma», la misma del panel y la web); si tampoco,
// el idioma principal de la invitación.
import { VARIANTES } from '../textos/index.js';

export const IDIOMAS_PAGINA = [['es', 'Español'], ['en', 'English'], ['pt', 'Português'], ['fr', 'Français'], ['it', 'Italiano'], ['de', 'Deutsch'], ['nl', 'Nederlands']];

// → { variante: la de los textos de la invitación (src/textos), corto: 'de', regional: la clave de /comun/js/regional.js }
export function idiomaPagina(request, url, varInv = 'es') {
  const cookie = /(?:^|;\s*)idioma=([a-z-]+)/i.exec(request.headers.get('cookie') || '')?.[1] || '';
  const pedido = String(url.searchParams.get('lang') || cookie || '').toLowerCase();
  const base = pedido.slice(0, 2);
  let variante = VARIANTES.includes(varInv) ? varInv : 'es';
  if (IDIOMAS_PAGINA.some(([c]) => c === base)) {
    // En castellano se respeta la variante de la invitación (rioplatense, España…) o la del panel
    if (base === 'es') variante = variante.startsWith('es') ? variante : VARIANTES.includes(pedido) ? pedido : 'es';
    else if (VARIANTES.includes(base)) variante = base;
  }
  const corto = variante.slice(0, 2);
  const regional = corto === 'es' ? variante : corto === 'pt' ? (pedido === 'pt-pt' ? 'pt-pt' : 'pt-br') : corto === 'en' ? (pedido === 'en-gb' ? 'en-gb' : 'en') : corto;
  return { variante, corto, regional };
}

// Selector chico arriba a la derecha: recarga la página con ?lang=
export function selectorIdioma(corto) {
  const opciones = IDIOMAS_PAGINA.map(([c, n]) => `<option value="${c}"${c === corto ? ' selected' : ''}>${n}</option>`).join('');
  return `<label class="sel-idioma" data-sin-regional><span aria-hidden="true">🌐</span><select aria-label="Idioma / Language" onchange="var u=new URL(location.href);u.searchParams.set('lang',this.value);u.searchParams.delete('error');location.href=u">${opciones}</select></label>
<style>.sel-idioma{position:fixed;top:10px;right:10px;z-index:60;display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.92);border:1px solid #e2e0dc;border-radius:999px;padding:3px 8px 3px 10px;font:13px Jost,system-ui,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.08)}
.sel-idioma select{border:0;background:transparent;font:inherit;color:#1f2421;cursor:pointer;padding:2px 0}</style>`;
}
