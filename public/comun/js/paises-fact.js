// README (ronda 40): país de facturación. Junto con el de la IP define el IVA y los descuentos (no la moneda elegida).
(function () {
  var CODIGOS = 'AR BO BR CL CO CR CU DO EC SV GT HN MX NI PA PY PE PR UY VE US CA AG BS BB BZ DM GD GY HT JM KN VC LC SR TT ES PT FR DE IT GB IE NL BE AT CH AD AU NZ'.split(' ');
  window.AI_PAISES_FACT = function (select, actual) {
    var nombres; try { nombres = new Intl.DisplayNames(['es'], { type: 'region' }); } catch (e) { nombres = { of: function (c) { return c; } }; }
    var lista = CODIGOS.map(function (c) { return [c, nombres.of(c) || c]; }).sort(function (a, b) { return a[1].localeCompare(b[1], 'es'); });
    if (actual && CODIGOS.indexOf(actual) < 0) lista.unshift([actual, nombres.of(actual) || actual]);
    select.innerHTML = lista.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join('');
    if (actual) select.value = actual;
    return select;
  };
})();
