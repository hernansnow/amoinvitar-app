/* README (ronda 46) · Selector de país e idioma para el panel (y otras páginas fuera de la web): en la barra solo la
   bandera; al abrirlo, la misma lista que la web (bandera, país, moneda y los idiomas del país). Al elegir, guarda las
   mismas cookies que la web y vuelve a cargar la página en ese idioma. La lista la escribe npm run sitio. */
(function () {
  var LISTA = [["DE","Alemania","EUR","/de","de","Deutsch",1],["AR","Argentina","ARS","/ar","es-ar","Español",1],["AU","Australia","AUD","/au","en-gb","English",1],["AT","Austria","EUR","/at","de","Deutsch",1],["BE","Bélgica","EUR","/be","fr","Français",1],["BE","Bélgica","EUR","/be/nl","nl","Nederlands",0],["BO","Bolivia","BOB","/bo","es","Español",1],["BR","Brasil","BRL","/br","pt-br","Português",1],["CA","Canadá","CAD","/ca","en","English",1],["CA","Canadá","CAD","/ca/fr","fr","Français",0],["CL","Chile","CLP","/cl","es-cl","Español",1],["CO","Colombia","COP","/co","es-cl","Español",1],["CR","Costa Rica","CRC","/cr","es-cr","Español",1],["CU","Cuba","USD","/cu","es-bz","Español",1],["EC","Ecuador","USD","/ec","es-bz","Español",1],["SV","El Salvador","USD","/sv","es-cr","Español",1],["ES","España","EUR","/es","es-es","Español",1],["US","Estados Unidos","USD","/us","es-bz","Español",1],["US","Estados Unidos","USD","/us/en","en","English",0],["FR","Francia","EUR","/fr","fr","Français",1],["GT","Guatemala","GTQ","/gt","es-cr","Español",1],["HN","Honduras","HNL","/hn","es-cr","Español",1],["IE","Irlanda","EUR","/ie","en-gb","English",1],["IT","Italia","EUR","/it","it","Italiano",1],["MX","México","MXN","/mx","es-mx","Español",1],["NI","Nicaragua","NIO","/ni","es-cr","Español",1],["NZ","Nueva Zelanda","NZD","/nz","en-gb","English",1],["NL","Países Bajos","EUR","/nl","nl","Nederlands",1],["PA","Panamá","USD","/pa","es-bz","Español",1],["PY","Paraguay","PYG","/py","es-py","Español",1],["PE","Perú","PEN","/pe","es-pe","Español",1],["PT","Portugal","EUR","/pt","pt-pt","Português",1],["PR","Puerto Rico","USD","/pr","es-bz","Español",1],["GB","Reino Unido","GBP","/gb","en-gb","English",1],["DO","República Dominicana","DOP","/do","es-bz","Español",1],["CH","Suiza","CHF","/ch","de","Deutsch",1],["CH","Suiza","CHF","/ch/fr","fr","Français",0],["CH","Suiza","CHF","/ch/it","it","Italiano",0],["UY","Uruguay","UYU","/uy","es-ar","Español",1],["VE","Venezuela","USD","/ve","es-bz","Español",1],["","Internacional","USD","","es","Español",1],["","Internacional","USD","/en","en","English",0]];
  var d = document;
  function cookie(n) { var m = d.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; }
  function montar(caja) {
    var sede = cookie('ai_sede'); if (sede === 'raiz') sede = '';
    var pais = cookie('pais_sel');
    var actual = LISTA.filter(function (y) { return y[3] === sede; })[0] || LISTA.filter(function (y) { return y[0] && y[0] === pais && y[6]; })[0] || LISTA.filter(function (y) { return !y[0] && y[6]; })[0];
    var grupo = function (y) { return y[0] || 'INT'; }, g = actual ? grupo(actual) : 'INT';
    var flag = function (y) { return '/web/img/flags/' + (y && y[0] ? y[0].toLowerCase() : 'globo') + '.svg'; };
    caja.className = 'sel-pais';
    caja.innerHTML = '<button type="button" class="sel-pais-boton" aria-haspopup="menu" aria-expanded="false" aria-label="Elegir tu país (moneda e idioma)" title="' + (actual ? actual[1] + ' · ' + actual[5] : '') + '"><img src="' + flag(actual) + '" alt="" width="22" height="15"></button>'
      + '<div class="sel-pais-lista" role="menu">' + LISTA.filter(function (y) { return y[6]; }).map(function (y) {
        return '<button type="button" role="menuitemradio" aria-checked="' + (grupo(y) === g) + '" data-p="' + y[3] + '"><span class="pa"><img src="' + flag(y) + '" alt="" width="22" height="15">' + y[1] + '</span><small>' + y[2] + '</small></button>';
      }).join('') + (function () { var ids = LISTA.filter(function (y) { return grupo(y) === g; }); return ids.length > 1 ? '<div class="sel-pais-idiomas">' + ids.map(function (y) { return '<button type="button" class="idi' + (actual && y[3] === actual[3] ? ' on' : '') + '" data-p="' + y[3] + '">' + y[5] + '</button>'; }).join('') + '</div>' : ''; })() + '</div>';
    var boton = caja.querySelector('.sel-pais-boton');
    boton.addEventListener('click', function (e) { e.stopPropagation(); var v = !caja.classList.contains('abierta'); caja.classList.toggle('abierta', v); boton.setAttribute('aria-expanded', v); });
    d.addEventListener('click', function (e) { if (!caja.contains(e.target)) { caja.classList.remove('abierta'); boton.setAttribute('aria-expanded', 'false'); } });
    caja.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-p]'); if (!b) return;
      var x = LISTA.filter(function (y) { return y[3] === b.getAttribute('data-p'); })[0]; if (!x) return;
      var s = 'Path=/; Max-Age=31536000; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
      ['ai_elegida=' + encodeURIComponent(x[3] || 'raiz'), 'ai_sede=' + encodeURIComponent(x[3] || 'raiz'), 'cur=' + x[2], 'idioma=' + x[4]].concat(x[0] ? ['pais_sel=' + x[0]] : []).forEach(function (c) { d.cookie = c + '; ' + s; });
      location.reload();
    });
  }
  function auto() { [].forEach.call(d.querySelectorAll('[data-selector-pais]'), montar); }
  if (d.readyState !== 'loading') auto(); else d.addEventListener('DOMContentLoaded', auto);
})();
