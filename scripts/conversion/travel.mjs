// Travel: los boletos de la agenda (tarjeta de embarque) y el código de aeropuerto que se "baraja".
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const REPO = resolve(process.env.REPO_VIEJO || fileURLToPath(new URL('../../../amoinvitar-v2.0', import.meta.url)));
export async function ajustar(doc, { $, $$, carpeta, paquete }) {
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
