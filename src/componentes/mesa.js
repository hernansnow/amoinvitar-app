// "Buscá tu mesa": la página del QR de la entrada. Cada invitado escribe su nombre
// y ve su número de mesa. Se activa desde Administración → Mesas; los nombres se
// buscan en el servidor (GET /api/mesa) y nunca se manda la lista entera.

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

export function mesaHTML({ t, id, nombres, lang = 'es', activa = true }) {
  const tx = { mesa: t('mesa.mesa'), ninguno: t('mesa.ninguno'), sinMesa: t('mesa.sinMesa'), ayuda: t('mesa.ayuda') };
  return `<!DOCTYPE html>
<html lang="${esc(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${esc(t('mesa.titulo'))} · ${esc(nombres)}</title>
<link rel="stylesheet" href="/comun/fonts/google/great-vibes+jost.css">
<link rel="stylesheet" href="/comun/fonts/icomoon/style.css">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; min-height: 100dvh; display: flex; justify-content: center; padding: 48px 20px; font-family: Jost, system-ui, sans-serif; background: #fff; color: #212529; text-align: center; line-height: 1.5; }
  main { max-width: 380px; width: 100%; }
  .icono { display: block; width: 200px; max-width: 70%; height: auto; margin: 0 auto 1rem; }
  .de { margin: 0 0 .25rem; font-family: 'Great Vibes', cursive; font-size: 2.4rem; line-height: 1.2; overflow-wrap: anywhere; }
  h1 { font-size: 1.1rem; text-transform: uppercase; font-weight: 800; letter-spacing: .08em; margin: 0 0 1rem; }
  hr { width: 66%; margin: 0 auto 1.2rem; border: 0; border-top: 1px solid #212529; }
  input { display: block; width: 100%; font: inherit; font-size: 1.05rem; text-align: center; padding: .6rem .8rem; border: 1px solid #212529; border-radius: 999px; }
  input:focus { outline: 2px solid rgba(33, 37, 41, .25); outline-offset: 2px; }
  .ayuda { font-size: .85rem; opacity: .6; margin: .5rem 0 0; }
  ul { list-style: none; padding: 0; margin: 1.2rem 0 0; display: grid; gap: 10px; }
  li { border: 2px dashed #dee2e6; border-radius: 28px; padding: 12px 16px; }
  li b { display: block; text-transform: uppercase; }
  li span { display: block; font-weight: 800; font-size: 1.5rem; }
  li small { display: block; opacity: .65; }
  footer { margin-top: 40px; }
</style></head>
<body><main>
  <img class="icono" src="/comun/img/icon-login-pin.png" width="200" height="45" alt="">
  <p class="de">${esc(nombres)}</p>
  <h1><i class="icon-event_seat" aria-hidden="true"></i> ${esc(t('mesa.titulo'))}</h1>
  <hr>
  ${activa ? `<label for="q" class="visually-hidden" hidden>${esc(t('mesa.placeholder'))}</label>
  <input id="q" type="search" autocomplete="off" placeholder="${esc(t('mesa.placeholder'))}" autofocus>
  <p class="ayuda" id="ayuda">${esc(tx.ayuda)}</p>
  <ul id="res" aria-live="polite"></ul>` : `<p>${esc(t('mesa.cerrada'))}</p>`}
  <footer><img src="/comun/img/amoinvitar-line.svg" alt="Amo Invitar!" width="110" style="filter:invert(1);opacity:.45"></footer>
</main>
${activa ? `<script>
(function () {
  var tx = ${json(tx)}, q = document.getElementById('q'), res = document.getElementById('res'), ayuda = document.getElementById('ayuda'), t, ultimo = '';
  function pintar(lista) {
    res.replaceChildren();
    if (!lista.length) { ayuda.textContent = tx.ninguno; return; }
    ayuda.textContent = '';
    lista.forEach(function (x) {
      var li = document.createElement('li'), b = document.createElement('b'), s = document.createElement('span');
      b.textContent = x.nombre; s.textContent = x.mesa ? tx.mesa + ' ' + x.mesa : tx.sinMesa;
      li.append(b, s);
      if (x.con) { var c = document.createElement('small'); c.textContent = x.con; li.append(c); }
      res.append(li);
    });
  }
  q.addEventListener('input', function () {
    clearTimeout(t);
    var v = q.value.trim();
    if (v.length < 3) { res.replaceChildren(); ayuda.textContent = tx.ayuda; return; }
    t = setTimeout(function () {
      ultimo = v;
      fetch('/api/mesa?e=${encodeURIComponent(id)}&q=' + encodeURIComponent(v)).then(function (r) { return r.json(); })
        .then(function (d) { if (v === ultimo) pintar(d.resultados || []); }).catch(function () {});
    }, 250);
  });
})();
</script>` : ''}
</body></html>`;
}
