// Pantalla de acceso que ve quien abre una invitación protegida sin permiso.
// No lleva nada del evento salvo los nombres (para saber que es el link correcto).

import { pieChico } from './bloques.js';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Diseño de la pantalla de acceso de Amo Invitar (el de las invitaciones con lista):
// ícono del candado con corazón, "Acceso a la invitación de", los nombres, una línea,
// y el PIN con el botón contorneado.
// README (ronda 73): misma tipografía (Abril Fatface y Jost) y color negro en todos los modelos; «estilos»
// ya no se usa (en algunos modelos salía otra fuente).
export function puertaHTML({ t, pantalla, nombres, evento = '', accion, inv, error, lang = 'es', marca, estilos = [] }) {
  const logo = pieChico(marca, '<img src="/comun/img/amoinvitar-line.svg" alt="Amo Invitar!" width="110" style="filter:invert(1);opacity:.45">');
  const cuerpo = pantalla === 'pin'
    ? `<form method="post" action="${esc(accion)}">
        <input type="hidden" name="inv" value="${esc(inv)}">
        <label for="pin">${esc(t('acceso.pin'))}</label>
        <input id="pin" name="pin" type="text" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="one-time-code" required autofocus placeholder="PIN">
        <button type="submit"><i class="icon-send-o" aria-hidden="true"></i> ${esc(t('acceso.confirmar'))}</button>
        ${error ? `<p class="error" role="alert">${esc(t('acceso.pinError'))}</p>` : ''}
      </form>`
    : `<p class="bloqueado">${esc(t('acceso.bloqueado'))}</p>`;
  return `<!DOCTYPE html>
<html lang="${esc(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${esc(nombres)}</title>
<link rel="stylesheet" href="/comun/fonts/google/abril-fatface+great-vibes+jost.css">
<link rel="stylesheet" href="/comun/fonts/icomoon/style.css">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 24px; font-family: Jost, system-ui, sans-serif; background: #fff; color: #212529; text-align: center; line-height: 1.5; }
  main { max-width: 360px; width: 100%; }
  .icono { display: block; width: 200px; max-width: 70%; height: auto; margin: 0 auto 1rem; }
  .de { margin: 0 0 .5rem; }
  /* README (ronda 78): «Acceso a la invitación», el tipo de evento («Boda de»…) más grande y en negrita, y los nombres */
  .evento { margin: 0 0 .35rem; font-size: 1.2rem; font-weight: 700; color: #000; }
  h1 { font-family: 'Abril Fatface', Georgia, serif; font-weight: 400; font-size: 2.1rem; line-height: 1.2; color: #000; margin: 0 0 .8rem; overflow-wrap: anywhere; }
  hr { width: 66%; margin: 0 auto 1rem; border: 0; border-top: 1px solid #212529; }
  label { display: block; margin-bottom: .5rem; }
  input { display: block; width: 100%; max-width: 180px; margin: 0 auto .5rem; font: inherit; font-size: 1rem; text-align: center; letter-spacing: .3em; padding: .3rem .5rem; border: 1px solid #212529; border-radius: .2rem; }
  input:focus { outline: 2px solid rgba(33, 37, 41, .25); outline-offset: 1px; }
  button { font-family: inherit; font-size: .85rem; text-transform: uppercase; font-weight: 800; padding: .35rem 1rem; border-radius: 999px; border: 1px solid #343a40; background: transparent; color: #343a40; cursor: pointer; transition: background .15s, color .15s; }
  button:hover, button:focus-visible { background: #343a40; color: #fff; }
  .error { color: #dc3545; font-size: .875rem; margin: .5rem 0 0; }
  .bloqueado { margin: 0; }
  footer { margin-top: 40px; }
  /* README (ronda 51): Dantina (trazos muy altos): más aire arriba y abajo de los nombres */
  h1.alta { font-size: 2.3rem; line-height: 1.9; margin: .9rem 0 1.3rem; }
</style></head>
<body><main>
  <img class="icono" src="/comun/img/icon-login-pin.png" width="200" height="45" alt="">
  ${evento ? `<p class="de">${esc(t('acceso.titulo'))}</p>
  <p class="evento">${esc(evento)}</p>` : `<p class="de">${esc(t('acceso.de'))}</p>`}
  <h1 data-nombres>${esc(nombres)}</h1><script>(function(e){if(e&&/dantina/i.test(getComputedStyle(e).fontFamily))e.classList.add('alta')})(document.querySelector('[data-nombres]'))</script>
  <hr>
  ${cuerpo}
  <footer>${logo}</footer>
</main></body></html>`;
}
