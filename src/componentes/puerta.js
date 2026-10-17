// Pantalla de acceso que ve quien abre una invitación protegida sin permiso.
// No lleva nada del evento salvo los nombres (para saber que es el link correcto).

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function puertaHTML({ t, pantalla, nombres, accion, inv, error, lang = 'es', marca }) {
  const logo = marca?.logo
    ? `<img src="${esc(marca.logo)}" alt="${esc(marca.nombre || '')}" style="max-height:48px">`
    : '<img src="/comun/img/amoinvitar-line.svg" alt="Amo Invitar!" width="110" style="filter:invert(1);opacity:.55">';
  const cuerpo = pantalla === 'pin'
    ? `<form method="post" action="${esc(accion)}">
        <input type="hidden" name="inv" value="${esc(inv)}">
        <label for="pin">${esc(t('acceso.pin'))}</label>
        <input id="pin" name="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="one-time-code" required autofocus placeholder="PIN">
        ${error ? `<p class="error" role="alert">${esc(t('acceso.pinError'))}</p>` : ''}
        <button type="submit">${esc(t('acceso.confirmar'))}</button>
      </form>`
    : `<p>${esc(t('acceso.bloqueado'))}</p>`;
  return `<!DOCTYPE html>
<html lang="${esc(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${esc(nombres)}</title>
<link rel="stylesheet" href="/comun/fonts/google/great-vibes+jost.css">
<style>
  :root { --c: ${esc(marca?.colores?.principal || '#212529')}; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; font-family: Jost, system-ui, sans-serif; background: #fff; color: #212529; text-align: center; }
  main { max-width: 340px; width: 100%; }
  .candado { width: 64px; height: 64px; margin: 0 auto 12px; border-radius: 50%; display: grid; place-items: center; border: 1px solid #ddd; font-size: 28px; }
  h1 { font-size: 1rem; text-transform: uppercase; letter-spacing: .12em; margin: 4px 0 24px; font-weight: 700; }
  .de { margin: 0; opacity: .7; }
  label { display: block; margin-bottom: 10px; }
  input { width: 160px; font: inherit; font-size: 1.4rem; letter-spacing: .4em; text-align: center; padding: 8px; border: 1px solid #212529; border-radius: 6px; }
  button { display: block; margin: 14px auto 0; font: inherit; text-transform: uppercase; font-weight: 700; padding: 8px 22px; border-radius: 999px; border: 1px solid var(--c); background: var(--c); color: #fff; cursor: pointer; }
  .error { color: #b00020; font-size: .9rem; }
  footer { margin-top: 40px; }
</style></head>
<body><main>
  <div class="candado" aria-hidden="true">🔒</div>
  <p class="de">${esc(t('acceso.de'))}</p>
  <h1>${esc(nombres)}</h1>
  ${cuerpo}
  <footer>${logo}</footer>
</main></body></html>`;
}
