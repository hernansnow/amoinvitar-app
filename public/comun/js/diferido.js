/* Fondos diferidos y carruseles: se cargan al acercarse a la pantalla (los fondos
   con .bg-diferido no se piden hasta entonces; ver modelo-comun.css). */
(function () {
  var e = [].slice.call(document.querySelectorAll('.bg-diferido,.owl-carousel,.carousel'));
  if (!e.length) return;
  function ver(x) {
    x.classList.remove('bg-diferido');
    [].forEach.call(x.querySelectorAll('img[loading="lazy"]'), function (i) { i.loading = 'eager'; });
    [].forEach.call(x.querySelectorAll('.bg-diferido'), function (y) { y.classList.remove('bg-diferido'); });
  }
  if (!('IntersectionObserver' in window)) { e.forEach(ver); return; }
  var o = new IntersectionObserver(function (l) {
    l.forEach(function (i) { if (i.isIntersecting) { ver(i.target); o.unobserve(i.target); } });
  }, { rootMargin: '800px 0px' });
  e.forEach(function (x) { o.observe(x); });
})();
