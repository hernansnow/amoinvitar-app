// Travel: los boletos de la agenda (tarjeta de embarque) y el código de aeropuerto que se "baraja".
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const REPO = resolve(process.env.REPO_VIEJO || fileURLToPath(new URL('../../../amoinvitar-v2.0', import.meta.url)));
export async function ajustar(doc, ctx) {
  await ajustar1(doc, ctx);
  await ajustar2(doc, ctx);
}
async function ajustar1(doc, { $, $$, carpeta, paquete }) {
  for (const [cual, sel] of [['ceremonia', '[data-si="ceremonia.separada"]'], ['celebracion', '[data-agendar="celebracion"]']]) {
    const b = $(doc.body, sel);
    const col = sel.startsWith('[data-si') ? b : b && b.closest('[class*="col-"]');
    if (!col) continue;
    for (const e of $$(col, '[data-campo]')) if (/\.(titulo|lugarTexto)$/.test(e.getAttribute('data-campo'))) e.removeAttribute('data-campo');
    const t = $(col, 'h3'); if (t) t.setAttribute('data-campo', `${cual}.titulo`);
    const l = $(col, '.info-name h2'); if (l) l.setAttribute('data-campo', `${cual}.lugarTexto`);
    const f = $(col, '.flight-depart-date h2'); if (f) { f.setAttribute('data-fecha', cual); f.setAttribute('data-fecha-formato', '{dd} {MES3} {aa}'); }
    const h = $(col, '.flight-depart-time h2'); if (h) { h.setAttribute('data-fecha', cual); h.setAttribute('data-fecha-formato', '{hh}:{mi}'); }
  }
  // El script que baraja las letras del código (es parte del diseño)
  const orig = await readFile(join(REPO, 'demo', carpeta, { deluxe: 'index.html', premium: 'premium.html', basic: 'basic.html' }[paquete]), 'utf8').catch(() => '');
  const js = [...orig.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((x) => /TextScramble/.test(x));
  if (js && $(doc.body, '.text-random')) doc.body.insertAdjacentHTML('beforeend', `\n<script>${js}</script>\n`);
  // Cuenta regresiva "flip" del diseño, con la fecha del evento (window.INV.cuenta = "AAAA/MM/DD HH:MM:SS")
  const flip = [...orig.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((x) => /flip-countdown/.test(x));
  const caja = $(doc.body, '.flip-countdown');
  if (flip && caja) {
    const conFecha = flip.replace(/let EndDate = "[^"]*";/, 'let EndDate = (window.INV && INV.cuenta) ? INV.cuenta.slice(0, 16).replace(" ", ", ") : "";');
    caja.setAttribute('data-si', 'cuenta.activa');
    doc.body.insertAdjacentHTML('beforeend', `\n<script>if (window.INV && INV.cuenta) {${conFecha}\n}</script>\n`);
  }
  // "DESPEGAMOS EN" es la etiqueta de la cuenta, no la frase de la portada
  for (const e of $$(doc.body, '[data-t="portada.subtitulo"]')) if (/despegamos/i.test(e.textContent)) { e.removeAttribute('data-t'); e.removeAttribute('data-caso'); (e.closest('p') || e).setAttribute('data-si', 'cuenta.activa'); }
}

// README (ronda 21): los tickets de la agenda según haya ceremonia aparte, y otros detalles de Travel
const DESTINO = {
  boda: { con: ['Fiesta', 'FIE'], sin: ['Boda', 'BOD'] },
  15: { con: ['Fiesta', 'FIE'], sin: ['Fiesta', 'FIE'] }, cumple: { con: ['Fiesta', 'FIE'], sin: ['Fiesta', 'FIE'] },
  bautismo: { con: ['Celebración', 'CEL'], sin: ['Celebración', 'CEL'] }, comunion: { con: ['Celebración', 'CEL'], sin: ['Celebración', 'CEL'] },
};
export async function ajustar2(doc, { $, $$, nodo, evento }) {
  const d = DESTINO[evento] || DESTINO[15];
  const tickets = [['ceremonia', '[data-agendar="ceremonia"]'], ['celebracion', '[data-agendar="celebracion"]']].map(([k, s]) => {
    const b = $(doc.body, s); const col = b && b.closest('[class*="col-"]'); return [k, col];
  });
  const [, colC] = tickets[0], [, colF] = tickets[1];
  // Ticket de la ceremonia: Salida (código que se baraja) → Ceremonia CER (fijo)
  if (colC) for (const h of $$(colC, '.loc-arrive h1')) h.classList.remove('text-random');
  if (colF) {
    const dep = $(colF, '.loc-depart'), arr = $(colF, '.loc-arrive');
    // Con ceremonia aparte: Ceremonia CER → Fiesta; sin ceremonia: Salida (se baraja) → Boda BOD / Fiesta FIE / Celebración CEL
    if (dep) dep.innerHTML = `<div style="display:contents" data-si="ceremonia.separada"><span>Ceremonia</span><h1>CER</h1></div><div style="display:contents" data-no="ceremonia.separada"><span>Salida</span><h1 class="text-random">OSL</h1></div>`;
    if (arr) arr.innerHTML = `<div style="display:contents" data-si="ceremonia.separada"><span>${d.con[0]}</span><h1>${d.con[1]}</h1></div><div style="display:contents" data-no="ceremonia.separada"><span>${d.sin[0]}</span><h1>${d.sin[1]}</h1></div>`;
    // Boda sin ceremonia aparte: el sello de los anillos en lugar del de la fiesta
    const fiesta = $$(colF, 'img').find((i) => /travel-icono-3\.png$/.test(i.getAttribute('src') || ''));
    if (fiesta && evento === 'boda') {
      fiesta.setAttribute('data-no', 'ceremonia.iconoUnico');
      const an = fiesta.cloneNode(true); an.setAttribute('src', 'img/travel-icono-2.png'); an.removeAttribute('data-no'); an.setAttribute('data-si', 'ceremonia.iconoUnico');
      fiesta.parentNode.insertBefore(an, fiesta.nextSibling);
    }
  }
  // Dress, hospedaje y traslado apagados: queda la franja azul con la valija
  const dress = $(doc.body, '#dresscode');
  if (dress && !$(dress, '.ai-valija')) {
    const cont = $(dress, '.container');
    if (cont) cont.parentNode.insertBefore(nodo(doc, '<div class="text-center pt-5 pb-5 ai-valija" data-no="grupos.dress"><img loading="lazy" class="img-fluid" src="img/travel-icono-5.png" width="90" alt=""></div>'), cont);
  }
  // Testigos: con el itinerario apagado, su fondo pasa a blanco (alterna con la sección de antes)
  const tes = $(doc.body, '#testigos');
  if (tes) { tes.setAttribute('style', (tes.getAttribute('style') || '').replace(/background-color:\s*#F5F2EF;?/i, '')); tes.classList.add('travel-testigos'); }
  // "ENTRETENIMIENTO A BORDO" va con Música: la marca de la sección pasa a la sección entera (con la playlist sola, queda el encabezado)
  const can = $(doc.body, 'div[data-seccion="canciones"]');
  const sec = can && can.closest('section');
  if (can && sec) {
    can.removeAttribute('data-seccion'); can.removeAttribute('id');
    sec.setAttribute('data-seccion', 'canciones');
    for (const sp of $$(sec, 'span.section-sub-title')) sp.setAttribute('data-mantener', '');
    for (const x of [sp0(sec)].filter(Boolean)) x.setAttribute('data-mantener', '');
  }
  function sp0(s) { return $(s, '.col-lg-6'); }
}
