// README (ronda 95): página de pago de un cobro adicional (/pagar/<id>), creado desde la consola.
// Muestra el concepto y el importe en cada medio de pago del país; pide el mail y, si se quiere factura a nombre de
// alguien, sus datos. Paga con POST /api/tienda/comprar { adicional } (mismas pasarelas que el resto de la tienda).
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

export function pagarHTML({ id }) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Pago · Amo Invitar!</title>
<link rel="stylesheet" href="/comun/fonts/google/great-vibes+jost.css">
<style>
  :root { --acento: #4e9c87; --borde: #e2e0dc; --suave: #6b706c; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; font: 16px/1.5 Jost, system-ui, sans-serif; background: #f6f5f3; color: #1f2421; display: flex; justify-content: center; padding: 32px 16px; }
  main { width: 100%; max-width: 440px; background: #fff; border-radius: 18px; padding: 28px 22px; box-shadow: 0 6px 28px rgba(0,0,0,.06); }
  .logo { display: block; height: 34px; margin: 0 auto 18px; }
  h1 { font-size: 1.3rem; text-align: center; margin: 0 0 4px; } .sub { text-align: center; color: var(--suave); margin: 0 0 18px; }
  label { display: block; font-size: .9rem; margin: 12px 0 4px; }
  input { width: 100%; font: inherit; padding: 10px 12px; border: 1px solid var(--borde); border-radius: 10px; }
  .medios { display: grid; gap: 8px; margin-top: 6px; }
  .medio { display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid var(--borde); border-radius: 12px; padding: 10px 12px; cursor: pointer; }
  .medio input { width: auto; } .medio.on { border-color: var(--acento); background: #f1f8f5; }
  .medio b { white-space: nowrap; }
  details { margin-top: 14px; font-size: .9rem; } summary { cursor: pointer; color: var(--suave); }
  button { width: 100%; margin-top: 18px; font: inherit; font-weight: 600; border: 0; border-radius: 999px; padding: 12px; background: var(--acento); color: #fff; cursor: pointer; }
  button:disabled { opacity: .6; }
  .error { color: #b3261e; text-align: center; margin: 12px 0 0; } .nota { color: var(--suave); font-size: .8rem; text-align: center; margin: 14px 0 0; }
</style></head>
<body><main>
  <img class="logo" src="/comun/img/amoinvitar-verde.svg" alt="Amo Invitar!">
  <div id="caja"><p class="sub">Cargando…</p></div>
</main>
<script>
(function () {
  var ID = ${json(id)}, caja = document.getElementById('caja');
  var NOMBRES = { stripe: 'Tarjeta', paypal: 'PayPal', mercadopago: 'Mercado Pago', transfer: 'Transferencia bancaria' };
  function post(u, b) { return fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'No se pudo'); return j; }); }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  post('/api/tienda/cotizar', { adicional: ID }).then(function (d) {
    if (!d.medios || !d.medios.length) { caja.innerHTML = '<p class="error">No hay medios de pago disponibles en este momento. Escríbenos por WhatsApp.</p>'; return; }
    caja.innerHTML = '<h1>' + esc(d.titulo) + '</h1><p class="sub">Elige cómo pagar</p>' +
      '<div class="medios">' + d.medios.map(function (m, i) { return '<label class="medio' + (i ? '' : ' on') + '"><span><input type="radio" name="medio" value="' + esc(m.id) + '"' + (i ? '' : ' checked') + '> ' + esc(NOMBRES[m.id] || m.id) + '</span><b>' + esc(m.texto) + '</b></label>'; }).join('') + '</div>' +
      '<label for="email">Mail para el comprobante y la factura</label><input id="email" type="email" required value="' + esc(d.email) + '" placeholder="tu@mail.com">' +
      '<details><summary>Factura a nombre de una persona o empresa (opcional)</summary><label for="fn">Nombre o razón social</label><input id="fn"><label for="fi">DNI / NIF / CUIT</label><input id="fi"><label for="fd">Dirección</label><input id="fd"></details>' +
      '<button id="pagar" type="button">Pagar</button><p class="error" id="error"></p><p class="nota">Pago seguro. Al terminar te llega la factura por mail.</p>';
    caja.querySelectorAll('.medio input').forEach(function (r) { r.addEventListener('change', function () { caja.querySelectorAll('.medio').forEach(function (l) { l.classList.toggle('on', l.querySelector('input').checked); }); }); });
    document.getElementById('pagar').onclick = function () {
      var b = this, err = document.getElementById('error'), email = document.getElementById('email').value.trim();
      if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) { err.textContent = 'Falta un mail válido'; return; }
      var fn = document.getElementById('fn').value.trim(), fi = document.getElementById('fi').value.trim(), fd = document.getElementById('fd').value.trim();
      b.disabled = true; b.textContent = 'Un momento…'; err.textContent = '';
      post('/api/tienda/comprar', { adicional: ID, medio: (caja.querySelector('.medio input:checked') || {}).value, email: email, factura: fn || fi ? { tipo: 'particular', nombre: fn, id: fi, direccion: fd } : null })
        .then(function (r) { location.href = r.url; })
        .catch(function (e) { err.textContent = e.message; b.disabled = false; b.textContent = 'Pagar'; });
    };
  }).catch(function (e) { caja.innerHTML = '<p class="error">' + esc(e.message) + '</p>'; });
})();
</script>
</body></html>`;
}
