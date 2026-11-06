// README (ronda 32) · Arma las páginas de la web nueva (public/sitio/*.html) con las mismas piezas en todas.
//   npm run sitio        → vuelve a generar las páginas (los textos están en scripts/sitio/contenido.mjs)
// Las páginas generadas se suben al repositorio (el Worker sirve archivos, no genera nada).
import { writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from './contenido.mjs';
import { PROFESIONALES as PRO } from '../../src/catalogo.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '../../public/sitio');
const opiniones = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'opiniones.json'), 'utf8'));
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ic = (n, extra = '') => `<svg class="icono${extra ? ' ' + extra : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

// ── Piezas ──────────────────────────────────────────────────────────────
const sprite = () => `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${Object.entries(C.ICONOS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('')}<symbol id="i-wa" viewBox="0 0 24 24"><path d="${C.WA_PATH}"/></symbol></defs></svg>`;

function head(P) {
  const url = `${C.SITIO}/${P.slug === 'index' ? '' : P.slug}`;
  const faq = P.faq ? `,{"@type":"FAQPage","mainEntity":[${P.faq.map(([q, a]) => `{"@type":"Question","name":${JSON.stringify(q)},"acceptedAnswer":{"@type":"Answer","text":${JSON.stringify(a.replace(/<[^>]+>/g, ''))}}}`).join(',')}]}` : '';
  return `<!DOCTYPE html>
<html lang="es" class="sin-js"${P.cabFija ? ' data-cab-fija' : ''}>
<head>
<!-- README (ronda 32): página generada con scripts/sitio/construir.mjs. No editar a mano: cambiar los textos en scripts/sitio/ y correr npm run sitio -->
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
window.aiConsent=(function(){try{var c=JSON.parse(localStorage.getItem('ai_cookie_consent'));if(c&&c.v===1&&Date.now()-c.t<31536e6&&c.c)return c.c}catch(e){}return{}})();
gtag('consent','default',{analytics_storage:aiConsent.analitica?'granted':'denied',ad_storage:aiConsent.marketing?'granted':'denied',ad_user_data:aiConsent.marketing?'granted':'denied',ad_personalization:aiConsent.marketing?'granted':'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});</script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(P.titulo)}</title>
<meta name="description" content="${esc(P.descripcion)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<meta name="theme-color" content="#0c463a">
<link rel="canonical" href="${url}">
<link rel="icon" type="image/svg+xml" href="https://amoinvitar.com/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="https://amoinvitar.com/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="https://amoinvitar.com/apple-touch-icon.png">
<link rel="manifest" href="https://amoinvitar.com/site.webmanifest">
<meta property="og:type" content="website"><meta property="og:locale" content="es_LA"><meta property="og:site_name" content="Amo Invitar!">
<meta property="og:title" content="${esc(P.titulo)}"><meta property="og:description" content="${esc(P.descripcion)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="https://amoinvitar.com/images/banner-invitacion.jpg"><meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":"${C.SITIO}/#organization","name":"Amo Invitar!","url":"${C.SITIO}/","logo":"${C.SITIO}/logo.png","sameAs":["https://www.facebook.com/AmoInvitar","https://www.instagram.com/AmoInvitar/","https://www.youtube.com/@AmoInvitar"]},{"@type":"WebPage","@id":"${url}#webpage","url":"${url}","name":${JSON.stringify(P.titulo)},"description":${JSON.stringify(P.descripcion)},"inLanguage":"es","isPartOf":{"@id":"${C.SITIO}/#website"}},{"@type":"WebSite","@id":"${C.SITIO}/#website","url":"${C.SITIO}/","name":"Amo Invitar!","publisher":{"@id":"${C.SITIO}/#organization"}}${faq}]}</script>
<link rel="preload" href="/web/fonts/jost-35841fe7.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/web/css/sitio.css">
${P.widget ? '<link rel="stylesheet" href="/web/css/crear-invitacion.css">\n' : ''}<link rel="stylesheet" href="/web/css/cookies.css">
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-NPWGMNPG');</script>
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('consent', window.aiConsent && aiConsent.marketing ? 'grant' : 'revoke');fbq('init','244989438542992');fbq('track','PageView');</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XX8CM32S35"></script>
<script>gtag('js',new Date());gtag('config','G-XX8CM32S35');</script>
</head>`;
}

function cabecera(P) {
  const actual = (slug) => (P.slug === slug ? ' aria-current="page"' : '');
  const evs = C.EVENTOS.map((e) => ({ ...e, href: `/${e.pagina}` }));
  // Orden del menú (como en el diseño de guía; Baby shower se suma y Infantiles desaparece)
  const orden = ['boda', '15', 'cumple', 'bautismo', 'comunion', 'babyshower', 'graduacion', 'empresarial', 'otros'];
  const lista = orden.map((id) => evs.find((e) => e.id === id));
  const items = lista.map((e) => `<a href="${e.href}"${actual(e.pagina)}>${esc(e.id === 'boda' ? 'Bodas' : e.menu)}</a>`).join('');
  const enEvento = lista.some((e) => e.pagina === P.slug);
  return `<a class="skip" href="#principal">Saltar al contenido</a>
<header class="cab">
  <div class="caja cab-fila">
    <a class="logo" href="/" aria-label="Amo Invitar! · Inicio"><img class="l-b" src="/web/img/logo-linea-blanco.svg" alt="Amo Invitar!" width="174" height="37"><img class="l-v" src="/web/img/logo-linea-verde.svg" alt="" width="174" height="37"></a>
    <nav class="nav-principal" aria-label="Principal">
      <div class="menu-ev${enEvento ? ' en' : ''}"><button type="button" aria-expanded="false" aria-haspopup="true">Invitaciones ${ic('chevron')}</button><div class="menu-ev-lista">${items}</div></div>
      <a href="/album"${actual('album')}>Álbum QR</a>
      <a href="/#como-funciona">Cómo funciona</a>
      <a href="/precios"${actual('precios')}>Precios</a>
      <a href="/#faq">FAQ</a>
      <a href="/contacto" aria-label="Contacto"${actual('contacto')}>${ic('mail')}</a>
    </nav>
    <div class="cab-acciones">
      <div class="moneda" data-moneda><button class="moneda-boton" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Cambiar la moneda"><img data-bandera src="/web/img/flags/es.svg" alt="" width="22" height="15"><span>EUR</span>${ic('chevron')}</button><div class="moneda-lista" role="menu" aria-label="Moneda"></div></div>
      <a class="mi-panel" href="/panel">${ic('user-check')} Mi panel</a>
      <a class="btn btn-claro btn-crear" href="/crear-invitacion">Crear invitación</a>
      <button class="hamb" type="button" data-abrir-menu aria-label="Abrir el menú" aria-expanded="false" aria-controls="cajon">${ic('menu')}</button>
    </div>
  </div>
</header>
<div class="cajon" id="cajon" role="dialog" aria-label="Menú">
  <div class="cajon-cuerpo">
    <button type="button" class="cajon-titulo" data-plegar aria-expanded="true" aria-controls="cajon-ev">Invitaciones ${ic('chevron')}</button>
    <div class="cajon-eventos" id="cajon-ev">${items}</div>
    <nav class="cajon-lista" aria-label="Secciones"><a href="/album">Álbum QR</a><a href="/#como-funciona" data-cerrar-menu>Cómo funciona</a><a href="/precios">Precios</a><a href="/#faq" data-cerrar-menu>FAQ</a><a href="/contacto">Contacto</a></nav>
    <div class="cajon-botones">
      <a class="btn btn-panel" href="/panel">${ic('user-check')} Mi panel</a>
      <a class="btn btn-verde" href="/crear-invitacion">Crear mi invitación</a>
      <a class="btn btn-ayuda" href="${C.WHATSAPP}" target="_blank" rel="noopener">Soporte ${ic('wa')}</a>
    </div>
  </div>
</div>`;
}

const checks = (arr) => `<ul class="checks">${arr.map((t) => `<li>${ic('check')}<span>${t}</span></li>`).join('')}</ul>`;

// Invitación real que flota en la portada de cada página (modelo y tipo de evento)
const DEMOS = {
  boda: ['lovestory', 'boda'], 15: ['party', '15'], bautismo: ['amanecer', 'bautismo'], comunion: ['amanecer', 'comunion'],
  cumple: ['disco', 'cumple'], babyshower: ['celeste', 'babyshower'], graduacion: ['marino', 'graduacion'],
  empresarial: ['black', 'cumple'], otros: ['navidad', 'navidad'], index: ['garden', 'boda'],
};
const demoDe = (id) => { const [m, t] = DEMOS[id] || DEMOS.index; return `/demo/${m}?evento=${t}&paquete=deluxe&directo=1`; };
function portada(o) {
  const ticks = ['Paquetes gratis y desde <span data-precio="basic">29 €</span>', 'Pago único (solo si te gusta)', 'Sin apps', 'Lista en minutos', 'Prueba gratis'];
  return `<section class="portada${o.evento ? ' evento' : ''}" id="inicio"${o.fondo ? ` style="${o.fondo}"` : ''}>
  <div class="caja portada-grid">
    <div class="portada-texto">
      <span class="etiqueta">${o.etiqueta}</span>
      <h1>${o.h1}</h1>
      <p class="lead">${o.lead}</p>
      <div class="fila-btn"><a class="btn btn-claro btn-grande" href="/crear-invitacion">Crear mi invitación</a><a class="btn btn-borde-claro btn-grande" href="/precios">Precios</a></div>
      <ul class="puntos">${ticks.map((t) => `<li>${ic('check')}<span>${t}</span></li>`).join('')}</ul>
    </div>
    <div class="escena" aria-hidden="true">
      <div class="esc-tablet"><iframe src="${o.demo}" data-w="960" data-h="716" loading="eager" tabindex="-1" title="" referrerpolicy="no-referrer"></iframe></div>
      <div class="esc-cel"><iframe src="${o.demo}" data-w="390" data-h="822" loading="eager" tabindex="-1" title="" referrerpolicy="no-referrer"></iframe></div>
      <div class="ficha f1">${ic('user-check')}<span>38 confirmaron<small>Sofi &amp; Ale</small></span></div>
      <div class="ficha f2">${ic('qr')}<span>Álbum QR<small>Fotos de todos</small></span></div>
      <div class="ficha f3">${ic('mesa')}<span>Mesa 5<small>Busca tu mesa</small></span></div>
    </div>
  </div>
</section>`;
}

// README (ronda 36): el texto en fuente de énfasis (Gwendolyn) siempre empieza en mayúscula; un título de una sola palabra va entero en Gwendolyn
const mayus = (h) => h.replace(/<em>(\s*)(\S)/g, (m, a, c) => `<em>${a}${c.toUpperCase()}`);
const titulo = (sobre, h, p, extra = '') => `<div class="titulo rev${extra}">${sobre ? `<span class="sobre">${sobre}</span>` : ''}<h2>${mayus(h)}</h2>${p ? `<p>${p}</p>` : ''}</div>`;

function pasos(E) {
  const t = E.tuEvento;
  const minis = (a, b) => `<i class="sel" style="background-image:url(/web/img/${a}.jpg)"></i><i style="background-image:url(/web/img/${b}.jpg)"></i>`;
  const uis = [
    `<div class="campo"><span>${ic('calendar')} ${esc(E.id === 'index' ? 'Boda' : E.nombre === 'Corporativo' ? 'Evento corporativo' : E.nombre)}</span>${ic('chevron')}</div><div class="dos"><div class="campo">Marcela</div><div class="campo">Andrés</div></div><div class="campo"><span>15/03/2027</span>${ic('calendar')}</div>`,
    `<div class="minis">${minis('p_garden', 'p_cinema')}</div>`,
    `<div class="interr"><span>Nuestra historia</span><i class="sw on"></i></div><div class="interr"><span>Música de fondo</span><i class="sw on"></i></div><div class="interr"><span>Dress code</span><i class="sw"></i></div><div class="interr"><span>Galería</span><i class="sw"></i></div>`,
    `<div class="plan-l"><span>Plan Deluxe</span><span data-precio="deluxe">70 €</span></div><div class="pill">${ic('check')} Pago confirmado</div><div class="pill wa">${ic('wa')} Enviar a todos</div>`,
    `<div class="estado"><span>Activa</span><span>Deluxe</span></div><div class="cifras3"><div>Respuestas<b>12</b></div><div class="v">Asisten<b>18</b></div><div class="r">No asisten<b>2</b></div></div><div class="botones2"><span>Excel</span><span>Editar</span></div>`,
  ];
  const textos = [
    ['Completa tus datos', 'Ingresa el tipo de evento, los nombres y la fecha para comenzar.'],
    ['Elige tu diseño', 'Selecciona el modelo que más te guste de nuestro catálogo, o pide una invitación con diseño 100% a medida.'],
    ['Personaliza', 'Activa las secciones que quieras, completa los textos y datos de cada rincón y míralo terminado antes de pagar.'],
    ['Paga y comparte', 'Elige tu plan, paga solo al publicar y recibe el link para compartir. Con los modelos gratis no pagas nada, nunca.'],
    ['Gestiona todo', 'Desde tu panel privado administras confirmaciones, editas tu invitación, organizas mesas y pases, y descargas la lista final.'],
  ];
  return `<ol class="pasos">${textos.map(([h, p], i) => `<li class="paso rev"><span class="paso-num">${i + 1}</span><h3>${h}</h3><p>${p}</p><div class="paso-ui" aria-hidden="true">${uis[i]}</div></li>`).join('')}</ol>`;
}

function comoFunciona(E, esIndex) {
  const t = E.tuEvento;
  const texto = `<div class="bloque-dos">
      <div class="rev">
        <p>No es solo una invitación digital: es <strong>un sitio web de ${esIndex ? 'tu boda o evento' : t}</strong>, personalizado con un atractivo diseño, que envías por WhatsApp fácilmente. Los invitados hacen clic y tienen toda la información del evento, confirman asistencia y participan activamente.</p>
        <p>Y lo más importante: desde el <strong>panel privado</strong> vas a administrar las respuestas, exportarlas, organizar las mesas, la llegada de los invitados el día del evento y mucho más.</p>
        ${checks(['Diseño de catálogo o estilo 100% a medida.', 'Puedes cambiar el diseño siempre, incluso publicada.', 'Un link para todos o uno por invitado, con su nombre y pases.', 'Las confirmaciones te llegan al panel privado y al email.'])}
        <div class="fila-btn"><a class="btn btn-verde btn-grande" href="/crear-invitacion">Crear invitación ${ic('flecha')}</a><a class="enlace-video" href="${C.VIDEO}" data-video="${C.VIDEO}" target="_blank" rel="noopener">${ic('play')} Ver video</a></div>
        <p class="nota-pago">${ic('shield')}<span><strong>Solo pagas al publicar.</strong> Si el modelo es gratis, tienes tu link y no pagas nada.</span></p>
      </div>
      <a class="video-mini rev" href="${C.VIDEO}" data-video="${C.VIDEO}" target="_blank" rel="noopener" aria-label="Ver el video de Amo Invitar"><picture><source media="(max-width: 899px)" srcset="/web/img/video-ancho.webp" width="1300" height="721"><img src="/web/img/video-cuadrado.webp" alt="" loading="lazy" width="900" height="900"></picture><span><i>${ic('play')}</i></span></a>
    </div>`;
  const tPasos = titulo('', 'Tu invitación hoy, en <em>5 simples pasos</em>', '');
  return `<section class="seccion" id="como-funciona">
  <div class="caja">
    ${esIndex ? `${titulo('¿Cómo funciona?', 'Invitar nunca fue <em>tan fácil</em>', '')}${texto}<div style="margin-top:clamp(44px,6vw,72px)">${tPasos}${pasos(E)}</div>`
      : `${tPasos}${pasos(E)}<div style="margin-top:clamp(40px,6vw,64px)">${texto}</div>`}
  </div>
</section>`;
}

function eventos() {
  const orden = ['boda', '15', 'bautismo', 'comunion', 'cumple', 'babyshower', 'graduacion', 'empresarial', 'otros'];
  const cards = orden.map((id) => C.EVENTOS.find((e) => e.id === id)).map((e) => `<a class="evento-card rev" href="/${e.pagina}"><img src="/web/img/eventos/${e.img}" alt="Invitaciones digitales de ${esc(e.nombre.toLowerCase())}" loading="lazy" width="560" height="420"><div><h3>${esc(e.nombre)}</h3><p>${esc(e.corto)} ${ic('flecha')}</p></div></a>`).join('');
  return `<section class="seccion alt" id="eventos"><div class="caja">${titulo('Para cada ocasión', '¿Qué <em>celebramos</em>?', 'Tenemos estilos para todos los eventos. Elige el tuyo y mira los diseños disponibles.')}<div class="eventos">${cards}</div></div></section>`;
}

function funciones(E) {
  const lista = C.FUNCIONES.map((f) => `<article class="funcion rev" data-g="${f.g}"><div class="ic">${ic(f.i)}</div>${f.plan ? `<span class="plan">${f.plan}</span>` : ''}<h3>${esc(f.t)}</h3><p>${esc(f.p)}</p></article>`).join('');
  return `<section class="seccion" id="funciones"><div class="caja">${titulo('Todo en un solo lugar', '<em>Funciones</em>', `Prácticas y modernas: lo que hace que ${E.tuEvento} se organice solo.`)}
<div class="filtros" role="group" aria-label="Filtrar funciones">${C.GRUPOS.map(([k, n], i) => `<button type="button" data-g="${k}" aria-pressed="${i === 0}">${n}</button>`).join('')}</div>
<div class="funciones">${lista}</div>
<p class="centro" style="margin-top:28px"><a class="btn btn-verde" href="/precios">Ver qué incluye cada plan</a></p></div></section>`;
}

const celda = (v) => (v === true ? `<span class="si">${ic('check')}<span class="sr">Incluido</span></span>` : v === false ? '<span class="no" aria-label="No incluido">—</span>' : `<small>${esc(v)}</small>`);
function planes(E) {
  const cards = C.PLANES.map((p) => `<article class="plan-card rev${p.destacado ? ' destacado' : ''}">${p.destacado ? '<span class="cinta">Más elegido</span>' : ''}<h3>${p.nombre}</h3>${p.id === 'gratis' ? '' : `<span class="promo-cinta" data-promo-de="${p.id}" hidden></span>`}<p class="precio" data-precio="${p.id}">${p.id === 'gratis' ? '0 €' : '&nbsp;'}</p><p class="precio-s">${p.id === 'gratis' ? 'Sin tarjeta, sin pagar nada' : `Pago único<span data-iva> · IVA incluido</span>`}</p><ul>${p.items.map((t, i) => `<li${i === 0 && t.startsWith('Todo') ? ' class="todo"' : ''}>${ic('check')}<span>${esc(t)}</span></li>`).join('')}</ul><a class="btn ${p.destacado ? 'btn-verde' : 'btn-borde'}" href="/crear-invitacion?paquete=${p.id}">${p.boton}</a></article>`).join('');
  const filas = C.TABLA.map((r) => `<tr><th scope="row">${esc(r[0])}</th>${r.slice(1).map((v) => `<td>${celda(v)}</td>`).join('')}</tr>`).join('');
  return `<section class="seccion alt" id="planes"><div class="caja">
  ${titulo('Planes y precios', 'Un pago, <em>cero</em> complicaciones', 'Sin suscripciones. Sin sorpresas.')}
  <div class="aviso-pago rev">${ic('eye')}<span>Diséñala y mírala terminada — <strong>pagas solo al publicar</strong></span></div>
  <div class="planes">${cards}</div>
  <p class="planes-nota" data-nota-precios>Precios en <strong>euros</strong>. Puedes cambiar la moneda en el menú. Puedes pagar con tarjeta de crédito o débito, Apple Pay, Google Pay y PayPal. No esperes más, diseña tu invitación hoy mismo sin pagar nada.<br><small>(*) Solo disponible en algunos modelos.</small></p>
  <div class="pago-seguro"><span>${ic('lock')} Pago seguro</span><span class="pago-iconos" data-pago-iconos></span></div>
  <h3 class="comparar-tit">Compara todos los planes</h3>
  <div class="comparar-caja"><table class="comparar comparar-precios" style="--cols:4"><thead><tr><th scope="col"><span class="sr">Función</span></th>${C.PLANES.map((p) => `<th scope="col">${p.nombre}<br><small data-precio="${p.id}">${p.id === 'gratis' ? '0 €' : ''}</small></th>`).join('')}</tr></thead><tbody>${filas}</tbody></table></div>
  <div class="medida rev"><div class="med-slider" data-slider aria-label="Ejemplos de invitaciones a medida">${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<img src="/web/img/medida/banner-a-medida-${n}.webp" alt="Invitación a medida, ejemplo ${n}" ${n === 1 ? '' : 'loading="lazy" '}width="1000" height="667">`).join('')}</div><div><span class="desde">Invitación a medida</span><h3>Una invitación única, creada desde cero</h3><p class="precio-m"><span data-precio="medida">140 €</span></p>${checks(['Diseño 100% a medida, con tu estilo, tus colores y tu historia.', 'Incluye todo lo del plan Deluxe.', 'Te acompañamos en cada detalle, de la idea a la publicación.'])}<div class="fila-btn"><a class="btn btn-claro" href="/contacto?evento=${encodeURIComponent(E.nombre)}">Pedir mi diseño a medida</a></div></div></div>
  ${empresas()}
</div></section>`;
}

const eur = (n) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} €`;
const dto = (precio, creditos) => Math.round((1 - precio / creditos / PRO.credito) * 100);
const menorPack = (n) => Math.min(...PRO[n].packs.map((k) => k.precio / k.creditos));

function empresas() {
  return `<div class="pros rev" id="profesionales"><div class="pros-txt"><span class="sobre">Para profesionales</span><h3>¿Organizas eventos todas las semanas?</h3><p>Para wedding planners, fotógrafos, salones y agencias: un panel para administrar todos tus eventos, usuarios administradores para tu equipo y créditos a precio mayorista. Con el nivel <strong>Studio</strong>, además, marca blanca y dominio propio.</p>${checks([`<strong>Pro:</strong> sin costo fijo, ${PRO.pro.administradores} administradores, créditos desde ${eur(PRO.pro.packs[1].precio / PRO.pro.packs[1].creditos)} c/u.`, `<strong>Studio:</strong> ${eur(PRO.studio.pase)} al año, ${PRO.studio.administradores} administradores, marca blanca, dominio propio y créditos desde ${eur(menorPack('studio'))} c/u.`])}</div>
  <div class="pro-mini"><div><b>Marca blanca</b><span>con el logo de tu empresa</span></div><div><b>hasta ${dto(PRO.studio.packs[3].precio, PRO.studio.packs[3].creditos)} %</b><span>de descuento en los packs Studio</span></div><div class="fila-btn"><a class="btn btn-verde" href="/profesionales">Ver planes para profesionales</a></div></div></div>`;
}

function juntos(enAlbum = false) {
  return `<section class="seccion juntos" id="mejor-juntos"><div class="caja">
  <div class="titulo rev"><h2>Mejor <em>juntos</em></h2><div class="juntos-logos"><img class="l-ai" src="/web/img/amoinvitar-line.svg" alt="Amo Invitar!" width="3682" height="792"><span aria-hidden="true">+</span><img class="l-alb" src="/web/img/albunear-dark.svg" alt="Albunear" width="3246" height="1016"></div><p><strong>Invitación + álbum colaborativo QR</strong></p><p>Nuestras invitaciones web se integran con el álbum digital QR de Albunear: un mismo estilo y diseño para la web e invitación del evento, el álbum digital QR y el paquete de recursos gráficos: invitación en papel, número de mesa, menú, recuerdos, mural y mucho más.</p><p class="promo">Por tiempo limitado, con nuestro paquete <strong>Deluxe</strong> te regalamos el <strong>Álbum colaborativo QR Classic</strong> de Albunear.</p></div>
  <div class="juntos-escena">
    <div class="juntos-cels">
      <figure><div class="pantalla poster"><iframe src="/demo/lovestory?evento=boda&paquete=deluxe&directo=1" loading="lazy" title="Amo Invitar! · Love Story" referrerpolicy="no-referrer"></iframe></div><figcaption>Invitación digital interactiva</figcaption></figure>
      <figure><div class="pantalla alb"><iframe src="https://albunear.com/demo?tema=lovestory&amp;embed=1" loading="lazy" title="Albunear · Love Story"></iframe></div><figcaption>Álbum colaborativo QR</figcaption></figure>
    </div>
    <div class="impresos" aria-hidden="true">
      <div class="imp imp-std"><img src="/web/img/juntos/savethedate.webp" alt="" width="600" height="831" loading="lazy"><p class="t1">¡Nos casamos!</p><p class="dw">Sábado</p><p class="dd">12</p><p class="dm">Septiembre</p><p class="dy">2027</p></div>
      <div class="imp imp-menu"><img src="/web/img/juntos/menu.webp" alt="" width="400" height="786" loading="lazy"><p class="t1">Menú</p><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="imp imp-qr"><img src="/web/img/juntos/qr.webp" alt="" width="540" height="748" loading="lazy"><p class="t1">¡Comparte tus fotos!</p><img class="code" src="/web/img/qr-demo.svg" alt="" width="33" height="33"><p class="t2">Escanea el código y sube tus fotos</p></div>
      <div class="imp imp-mesa"><img src="/web/img/juntos/mesa.webp" alt="" width="460" height="742" loading="lazy"><p class="t1">Mesa</p><p class="num">5</p></div>
      <div class="imp imp-sou"><img src="/web/img/juntos/suvenir.webp" alt="" width="420" height="419" loading="lazy"><p class="t1">¡Gracias por venir!</p></div>
    </div>
  </div>
  <div class="fila-btn" style="justify-content:center;margin-top:36px"><a class="btn btn-verde" href="/precios">Ver paquetes</a>${enAlbum ? '<a class="btn btn-borde" href="https://albunear.com/invitaciones" target="_blank" rel="noopener">Ver en Albunear</a>' : '<a class="btn btn-borde" href="/album">Conocer el álbum QR</a>'}</div>
</div></section>`;
}

function opinionCard(r) {
  return `<figure class="opinion"><span class="estrellas" role="img" aria-label="${r.r} de 5"><span style="width:${Math.round(r.r / 5 * 100)}%"></span></span>${r.t ? `<p class="tit">${esc(r.t)}</p>` : ''}<blockquote>${esc(r.x)}</blockquote><figcaption><span class="av" aria-hidden="true">${esc(r.n[0])}</span>${esc(r.n)}</figcaption></figure>`;
}
function testimonios() {
  const filas = [[], []]; opiniones.forEach((r, i) => filas[Math.floor(i / 2) % 2].push(r));
  return `<section class="seccion" id="opiniones"><div class="caja">
  <div class="trayectoria rev"><div><span class="sobre">Nuestra trayectoria</span><h2>Más de 20 años <em>en bodas y eventos</em></h2><p>${C.TRAYECTORIA.p1}</p><p>${C.TRAYECTORIA.p2}</p></div>
  <div class="t-lado"><p class="t-desde"><span>Desde</span><b>2005</b></p><p class="t-k">El mismo equipo detrás de</p><ul class="t-marcas"><li><a href="https://albunear.com" target="_blank" rel="noopener"><img src="/web/img/albunear-white.svg" alt="Albunear" width="3246" height="1016" loading="lazy"></a><span>Álbum colaborativo QR</span></li><li><a href="https://amofotear.com" target="_blank" rel="noopener"><img src="/web/img/amofotear.svg" alt="Amo Fotear" width="7000" height="3944" loading="lazy"></a><span>Foto y video</span></li><li><a href="https://snowproducciones.com.ar" target="_blank" rel="noopener"><img src="/web/img/snow-tight.svg" alt="Snow Producciones" width="1945" height="772" loading="lazy"></a><span>Servicios audiovisuales</span></li></ul></div>
  <div class="t-premio">${ic('award')}<p><strong>Ganadores de los Wedding Awards</strong>Cinco años seguidos, gracias a las opiniones de las parejas en <img src="/web/img/casamientos-white.svg" alt="casamientos.com.ar" loading="lazy"></p></div></div>
  ${titulo('Opiniones', 'Algunos <em>testimonios</em>', 'Lo que dicen nuestros clientes.')}</div>
  <div class="opiniones">${filas.map((f) => `<div class="op-fila"><div class="op-pista"><div class="op-set">${f.map(opinionCard).join('')}</div></div></div>`).join('')}</div>
</section>`;
}

function faq(E, P, lista) {
  P.faq = lista || C.preguntas(E);
  return `<section class="seccion alt" id="faq"><div class="caja">${titulo('Dudas', '<em>Preguntas</em> frecuentes', 'Todo lo que necesitas saber antes de empezar.')}
<div class="faq" data-faq>${P.faq.map(([q, a], i) => `<details id="p${i + 1}"><summary>${esc(q)}</summary><div>${a}</div></details>`).join('')}</div>
<button type="button" class="btn btn-borde faq-mas" hidden>Más preguntas</button></div></section>`;
}

function nosotros() {
  return `<section class="seccion crema" id="nosotros"><div class="caja nosotros">
  <div class="nosotros-foto rev"><img src="/web/img/nosotros.webp" alt="Snow Producciones, fotografía y video de bodas y eventos" loading="lazy" width="1200" height="800"><p class="nos-sello"><b>+ de 20 años</b> en bodas y eventos</p></div>
  <div class="rev"><span class="sobre" style="font:600 13px/1 var(--sans);letter-spacing:.28em;text-transform:uppercase;color:var(--verde);display:block;margin-bottom:12px">Nosotros</span><h2 style="font-size:clamp(28px,4vw,42px)">Hacemos invitaciones con el <em class="h-script">Corazón</em></h2>
  <p>Somos <strong>Snow Producciones®</strong> y desde 2005 hacemos fotografía y video para bodas y eventos. Nos impulsan los sueños, nos mueve lo hermoso de las pequeñas cosas y nos estremece el amor: es un privilegio conocer un poco de la historia de cada pareja y de cada familia que nos elige.</p>
  <p>Escuchando lo que necesitaba cada evento, nació <strong>Amo Invitar!</strong>: invitaciones digitales, sostenibles e interactivas, que reducen los costos y cuidan el ambiente, con el diseño y el impacto visual de quien lleva años detrás de una cámara.</p>
  <p>Creemos que una invitación no solo informa: emociona y sorprende a cada invitado.</p>
  </div>
</div></section>`;
}

function llamada(E) {
  return `<section class="seccion" style="padding-block:clamp(40px,6vw,80px)"><div class="caja"><div class="llamada rev"><h2>¿Listo para empezar a organizar ${E.id === 'otros' || E.id === 'index' ? 'tu evento' : E.tuEvento} como no te imaginas?</h2>
<p>Personaliza el diseño que te guste o solicita tu invitación con diseño a medida desde cero y sorprende a todos tus invitados.</p>
<div class="fila-btn"><a class="btn btn-claro btn-grande" href="/crear-invitacion">Crear invitación ${ic('flecha')}</a></div>
<p class="mini"><span>${ic('leaf')} Sin papel ni imprenta. Más sostenible.</span><span>${ic('shield')} Solo pagas al publicar. Si el modelo es gratis, tienes tu link y no pagas nada.</span></p></div></div></section>`;
}

function contacto(E) {
  const sel = E.contactoEvento || '';
  const opts = C.OPCIONES_EVENTO.map((o) => `<option${o === sel ? ' selected' : ''}>${o}</option>`).join('');
  return `<section class="seccion alt" id="contacto"><div class="caja contacto">
  <div class="rev"><span class="sobre" style="font:600 13px/1 var(--sans);letter-spacing:.28em;text-transform:uppercase;color:var(--verde);display:block;margin-bottom:12px">Contacto</span><h2 style="font-size:clamp(28px,4vw,42px)">¿Hablamos de ${E.id === 'index' || E.id === 'otros' ? 'tu evento' : E.tuEvento}?</h2><p>Cuéntanos qué necesitas y te respondemos en el día. También puedes escribirnos por WhatsApp.</p>
  <div class="contacto-datos"><a href="${C.WHATSAPP}" target="_blank" rel="noopener"><span class="ic">${ic('wa')}</span>WhatsApp</a><a href="mailto:${C.EMAIL}?subject=${encodeURIComponent('Consulta desde la web de Amo Invitar!')}"><span class="ic">${ic('mail')}</span>${C.EMAIL}</a></div></div>
  <form class="tarjeta formu rev" data-contacto>
    <div class="dos"><label>Nombre<input name="nombre" required minlength="2" autocomplete="name"></label><label>Email<input name="email" type="email" required autocomplete="email"></label></div>
    <div class="dos"><label>WhatsApp<input name="telefono" type="tel" autocomplete="tel" placeholder="Con código de país"></label><label>Evento<select name="evento" required>${opts}</select></label></div>
    <label>Mensaje<textarea name="mensaje" rows="4" required placeholder="Fecha, lugar, cantidad de invitados, ¿ya tienes un diseño en mente?"></textarea></label>
    <label class="acepto"><input type="checkbox" name="privacidad" value="si" required><span>Acepto la <a href="/info/politica-de-privacidad">política de privacidad</a>.</span></label>
    <button class="btn btn-verde btn-grande" type="submit">Enviar mensaje</button><p class="contacto-estado" data-contacto-estado></p>
  </form></div></section>`;
}

function disenos(E) {
  const attr = E.grid ? `data-grid='${JSON.stringify(E.grid).replace(/'/g, '&#39;')}'` : !E.widget ? '' : E.widget.includes(',') ? `data-eventos="${E.widget}"` : `data-evento="${E.widget}"`;
  return `<section class="seccion disenos" id="disenos"><div class="caja">${titulo(E.grid ? '' : 'Modelos', E.tituloDisenos || `<em>Diseños</em> para ${E.tuEvento}`, E.grid ? 'Toca el tipo de evento y verás sus diseños para verlos, personalizarlos y empezar.' : 'Tenemos estilos para todos los gustos, ¡encuentra el tuyo! Míralos, personalízalos y mira tu invitación terminada antes de pagar.')}
<div class="ci-widget" ${attr}></div></div></section>`;
}

function pie() {
  const ev = ['boda', '15', 'cumple', 'bautismo', 'comunion', 'babyshower', 'graduacion', 'empresarial', 'otros'].map((id) => C.EVENTOS.find((e) => e.id === id));
  const redes = `<div class="pie-redes"><a href="https://www.instagram.com/AmoInvitar/" target="_blank" rel="noopener" aria-label="Instagram">${ic('instagram')}</a><a href="https://www.facebook.com/AmoInvitar" target="_blank" rel="noopener" aria-label="Facebook">${ic('facebook')}</a><a href="https://www.youtube.com/@AmoInvitar" target="_blank" rel="noopener" aria-label="YouTube">${ic('youtube')}</a><a href="${C.WHATSAPP}" target="_blank" rel="noopener" aria-label="WhatsApp">${ic('wa')}</a></div>`;
  const lista = (t, arr) => `<div class="pie-col pc-${t.toLowerCase().replace(/\s+/g, '')}"><h2>${t}</h2><ul>${arr.map(([h, x, ext]) => `<li><a href="${h}"${ext ? ' target="_blank" rel="noopener"' : ''}>${x}</a></li>`).join('')}</ul></div>`;
  return `<footer class="pie"><div class="caja">
  <div class="pie-grid">
    <div class="pie-marca"><a class="logo" href="/" aria-label="Amo Invitar!"><img src="/web/img/logo-pie.svg" alt="Amo Invitar!" width="170" height="37" loading="lazy"></a><p>Invitaciones digitales interactivas y originales para bodas y eventos.</p>${redes}</div>
    <div class="pie-links">
      <div class="pie-bloque">${lista('Invitaciones', ev.map((e) => [`/${e.pagina}`, esc(e.id === 'boda' ? 'Bodas' : e.nombre)]))}${lista('Recursos', [['/crear-invitacion', 'Crear invitación'], ['/#como-funciona', 'Cómo funciona'], ['/#funciones', 'Funciones'], ['/precios', 'Planes y precios'], ['/album', 'Álbum QR'], ['/profesionales', 'Para profesionales'], ['/#faq', 'Preguntas frecuentes'], ['/#nosotros', 'Nosotros'], ['/contacto', 'Contacto']])}</div>
      <div class="pie-bloque">${lista('Tu cuenta', [['/panel', 'Mi panel'], ['/mi-cuenta', 'Mis invitaciones'], ['/entrar', 'Entrar']])}${lista('Productos', [['https://amofotear.com', 'Amo Fotear', 1], ['https://albunear.com', 'Albunear', 1], ['https://snowproducciones.com.ar', 'Snow Producciones', 1]])}</div>
    </div>
  </div>
  <div class="pie-legal">
    <div class="pie-legal-txt"><p class="pl1"><a href="/info/aviso-legal">Aviso legal</a> · <a href="/info/politica-de-privacidad">Privacidad</a> · <a href="/info/politica-de-cookies">Cookies</a> · <a href="/info/politica-de-cookies#configurar-cookies" data-cookie-settings>Configurar cookies</a> · <a href="/info/terminos-y-condiciones">Términos</a> · <a href="/info/politica-de-devoluciones">Devoluciones</a> · <a href="/info/rgpd">RGPD</a></p><p class="pl2">© 2020-<span id="anio">2026</span> Amo Invitar!® · Todos los derechos reservados · Hecho con ${ic('heart')} por Snow Producciones®</p></div>
    <a class="pie-snow" href="https://snowproducciones.com.ar/" target="_blank" rel="noopener"><span>Powered by</span><img src="/web/img/snow-tight.svg" alt="Snow Producciones" width="78" height="31" loading="lazy"></a>
  </div>
</div></footer>
<a class="wa-flota" href="${C.WHATSAPP}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp"></a>
<div class="barra-movil"><a class="btn btn-verde" href="/crear-invitacion">Crear mi invitación</a></div>`;
}

function pagina(P, cuerpo) {
  return `${head(P)}
<body${P.evento ? ` data-evento="${P.evento}"` : ''}>
${sprite()}
${cabecera(P)}
<main id="principal">
${cuerpo}
</main>
${pie()}
<script src="/web/js/sitio.js" defer></script>
<script src="/comun/js/contacto.js" defer></script>
${(P.scripts || []).map((x) => `<script src="${x}" defer></script>`).join('\n')}
${P.widget ? '<script src="/web/js/crear-invitacion.js" data-app="" data-img="/img/" data-raiz="/" defer></script>\n' : ''}<script src="/web/js/cookies.js" defer></script>
<script>document.getElementById('anio').textContent=new Date().getFullYear();</script>
</body>
</html>
`;
}

// ── Páginas ─────────────────────────────────────────────────────────────
const KEY = 'invitaciones digitales, invitación web, RSVP online, confirmar asistencia, save the date, álbum QR, invitación por WhatsApp';
const GENERICO = { id: 'index', nombre: 'tu evento', tuEvento: 'tu evento', widget: '' };
const PAGINAS = [];
// README (ronda 37): en la página de un evento, «Crear invitación» va directo a /crear-invitacion-para-<evento> (ya con los modelos);
// en el resto, a /crear-invitacion (donde se elige el evento).
const SLUG_CREAR = { boda: 'boda', 15: '15-anos', bautismo: 'bautismo', comunion: 'comunion', cumple: 'cumpleanos', babyshower: 'baby-shower', graduacion: 'graduacion', empresarial: 'empresarial', otros: 'navidad' };
const CABECERA_SIMPLE = new Set(['crear-invitacion', 'precios', 'contacto']);
const escribe = (slug, P, cuerpo) => {
  P.slug = slug;
  if (CABECERA_SIMPLE.has(slug)) P.cabFija = true;
  let h = pagina(P, cuerpo);
  if (P.evento && SLUG_CREAR[P.evento]) h = h.replace(/href="\/crear-invitacion(\?[^"]*)?"/g, (m, q) => `href="/crear-invitacion-para-${SLUG_CREAR[P.evento]}${q || ''}"`);
  writeFileSync(join(RAIZ, slug + '.html'), h); PAGINAS.push(slug);
};

// Portada principal
{
  const P = { titulo: 'Invitaciones digitales con RSVP, mesas y álbum QR | Amo Invitar!', descripcion: 'Invitaciones digitales interactivas para bodas, 15 años, bautismos, comuniones, cumpleaños, baby shower y eventos. Compartes por WhatsApp, tus invitados confirman con un clic y tú descargas la lista. Prueba gratis.' };
  const E = { ...GENERICO };
  escribe('index', P, [
    portada({ fondo: `--hero-d:url(/web/img/hero-desktop.jpg);--hero-m:url(/web/img/hero-movil.jpg);--hero-gd:linear-gradient(rgba(0,0,0,.1),rgba(126,114,91,.6));--hero-g:linear-gradient(rgba(78,156,135,.3),rgba(0,0,0,.3))`, etiqueta: 'Interactiva y original', h1: 'Invitaciones digitales <span data-pais="en">en Iberoamérica</span>', lead: 'Todo tu evento en un link. La invitación, RSVP, álbum QR, administración de invitados, organización de mesas y entradas al evento… vaya, tu <strong>Planner digital</strong>. Compartes por WhatsApp, tus invitados confirman con un clic y tú descargas la lista final.', demo: demoDe('index') }),
    comoFunciona(E, true), eventos(), funciones(E), planes(E), faq(E, P), testimonios(), nosotros(), llamada(E), contacto(E),
  ].join('\n'));
}

// Páginas de cada evento
// Imagen de portada de cada página y su degradado, como en la web original
const IMG_EV = (f) => `url(/web/img/eventos/${f})`;
const fondoDe = (img, g, { m = img, gm = g } = {}) => `--hero-d:${img};--hero-m:${m};--hero-gd:${g};--hero-g:${gm}`;
const G = (a, b) => `linear-gradient(rgba(${a}),rgba(${b}))`;
const HEROES = {
  boda: fondoDe(IMG_EV('hero-bodas-desk.jpg'), G('0,0,0,.2', '0,0,0,.8')),
  15: fondoDe(IMG_EV('hero-15-desk.jpg'), G('0,0,0,.2', '0,0,0,.8'), { m: IMG_EV('hero-15.jpg') }),
  bautismo: fondoDe(IMG_EV('hero-bautismo.jpg'), G('0,0,0,.2', '175,141,80,.6')),
  comunion: fondoDe(IMG_EV('hero-comunion.jpg'), G('0,0,0,.4', '187,143,107,.6')),
  cumple: fondoDe(IMG_EV('hero-cumple.jpg'), G('0,0,0,.4', '55,176,191,.6')),
  babyshower: fondoDe(IMG_EV('hero-infantiles.jpg'), G('0,0,0,.2', '244,67,54,.2')),
  graduacion: fondoDe(IMG_EV('hero-graduacion.jpg'), G('0,0,0,.4', '154,121,53,.6')),
  empresarial: fondoDe(IMG_EV('hero-empresarial.jpg'), G('0,0,0,.6', '187,143,107,.8')),
  otros: fondoDe(IMG_EV('hero-eventos.jpg'), G('0,0,0,.4', '126,114,91,.6')),
};
const PORTADAS = {
  boda: { etiqueta: 'Invitación + web', h1: 'Toda tu boda en un link', lead: 'Compartes por WhatsApp, tus invitados confirman asistencia con un clic, tú gestionas y descargas la lista. Además van a agendar la fecha, ver el mapa para llegar, elegir su menú, conocer el código de vestimenta, regalos, cuenta regresiva, sugerir canciones, álbum QR, mesas y mucho más. Con diseños de catálogo o a medida 100% personalizada.', t: 'Invitaciones de boda digitales con RSVP, mesas y álbum QR', d: 'Invitación de boda digital + web: tus invitados confirman asistencia con un clic, ven el mapa, el menú y el dress code, y tú gestionas mesas y lista. Diseños de catálogo o a medida. Prueba gratis.' },
  15: { etiqueta: 'Invitación + web', h1: 'Tus 15, en un solo link', lead: 'Compartes por WhatsApp, tus invitados confirman con un clic y tú gestionas todo desde tu panel. Con cuenta regresiva, ubicación, dress code, canciones para la pista, regalos, álbum QR, mesas y mucho más. Con diseños de catálogo o a medida 100% personalizada.', t: 'Invitaciones de 15 años digitales con RSVP y álbum QR', d: 'Invitación digital de 15 años: confirmación con un clic, cuenta regresiva, canciones sugeridas, mesas y álbum QR. Diseños de catálogo o a medida. Prueba gratis.' },
  bautismo: { etiqueta: 'Invitación + web', h1: 'Todo el bautismo en un link', lead: 'Compartes por WhatsApp y toda la familia confirma con un clic: fecha, iglesia, lugar de la celebración, mapa para llegar y mucho más. Con diseños tiernos de catálogo o a medida 100% personalizada.', t: 'Invitaciones de bautismo y bautizo digitales', d: 'Invitación digital de bautismo (bautizo): la familia confirma con un clic y ve la iglesia, el lugar y el mapa. Diseños de catálogo o a medida. Prueba gratis.' },
  comunion: { etiqueta: 'Invitación + web', h1: 'Toda la comunión en un link', lead: 'Compartes por WhatsApp y tus invitados confirman asistencia con un clic. Misa, celebración, mapa para llegar, menú, recuerdos y mucho más, todo en un solo lugar. Con diseños de catálogo o a medida 100% personalizada.', t: 'Invitaciones de comunión digitales con RSVP', d: 'Invitación digital de primera comunión: confirmación con un clic, misa, celebración, mapa y menú. Diseños de catálogo o a medida. Prueba gratis.' },
  cumple: { etiqueta: 'Invitación + web', h1: 'Tu cumpleaños, en un solo link', lead: 'Para adultos y para peques: compartes por WhatsApp, tus invitados confirman con un clic y tú sabes exactamente quién viene. Con ubicación, temática, dress code, regalos, canciones y álbum QR. Con diseños de catálogo o a medida 100% personalizada.', t: 'Invitaciones de cumpleaños digitales (adultos e infantiles)', d: 'Invitación digital de cumpleaños para adultos e infantiles: confirmación con un clic, mapa, temática, regalos y álbum QR. Diseños de catálogo o a medida. Prueba gratis.' },
  babyshower: { etiqueta: 'Invitación + web', h1: 'Tu baby shower en un solo link', lead: 'Para celebrar la llegada de tu bebé: compartes por WhatsApp, tus invitados confirman con un clic, y suman lista de regalos, ubicación y mucho más. También para fiestas de revelación de género. Con diseños de catálogo o a medida 100% personalizada.', t: 'Invitaciones de baby shower y revelación de género digitales', d: 'Invitación digital de baby shower y revelación de género: confirmación con un clic, lista de regalos, mapa y álbum QR. Diseños de catálogo o a medida. Prueba gratis.' },
  graduacion: { etiqueta: 'Invitación + web', h1: 'Tu graduación, en un solo link', lead: 'Compartes por WhatsApp, tus invitados confirman con un clic y tú los recibes con todo organizado: acto, fiesta, mapa, dress code, canciones y álbum QR para no perderte ninguna foto. Con diseños de catálogo o a medida 100% personalizada.', t: 'Invitaciones de graduación y egreso digitales', d: 'Invitación digital de graduación y egreso: confirmación con un clic, mapa, dress code, canciones y álbum QR. Diseños de catálogo o a medida. Prueba gratis.' },
  empresarial: { etiqueta: 'Eventos corporativos', h1: 'Tu evento corporativo en un solo link', lead: 'Lanzamientos, cenas de fin de año, congresos y capacitaciones: envías por WhatsApp o email, tus invitados confirman con un clic y tú controlas la lista, las mesas y la entrada con QR. Con la imagen de tu marca y diseño 100% a medida.', t: 'Invitaciones digitales para eventos corporativos y empresas', d: 'Invitaciones digitales para eventos de empresa: confirmación con un clic, control de acceso con QR, mesas y lista exportable. Diseño a medida con tu marca. Pide tu propuesta.' },
  otros: { etiqueta: 'Más eventos', h1: 'Cualquier evento, en un solo link', lead: 'Navidad, aniversarios, despedidas, reuniones, inauguraciones… Si lo vas a celebrar, lo invitamos. Elige un diseño de catálogo, o pide una invitación a medida 100% personalizada.', t: 'Invitaciones digitales para Navidad y otros eventos', d: 'Invitaciones digitales para Navidad, aniversarios, despedidas y cualquier evento: confirmación con un clic, mapa y lista exportable. Diseños de catálogo o a medida. Prueba gratis.' },
};
const OTRAS_ES = { boda: 'Boda', 15: '15 años', bautismo: 'Bautismo', comunion: 'Comunión', cumple: 'Cumpleaños', babyshower: 'Baby shower', graduacion: 'Graduación', empresarial: 'Corporativo', otros: 'Navidad' };
for (const E0 of C.EVENTOS) {
  const E = { ...E0, contactoEvento: OTRAS_ES[E0.id] };
  const pt = PORTADAS[E.id];
  const P = { titulo: `${pt.t} | Amo Invitar!`, descripcion: pt.d, widget: true, evento: E.id };
  escribe(E.pagina, P, [
    portada({ etiqueta: pt.etiqueta, h1: pt.h1, lead: pt.lead, evento: true, fondo: HEROES[E.id], demo: demoDe(E.id) }),
    disenos(E), funciones(E), comoFunciona(E, false), planes(E), juntos(), faq(E, P), testimonios(), llamada(E), contacto(E),
  ].join('\n'));
}

// README (ronda 37): encabezado sin foto para las páginas de trabajo (crear invitación, precios, contacto)
const cabeceraSimple = (etiqueta, h1, lead) => `<section class="cabecera-simple"><div class="caja"><span class="etiqueta">${etiqueta}</span><h1>${h1}</h1><p class="lead">${lead}</p></div></section>`;

// Crear invitación (elige el tipo de evento y el diseño; el widget abre el panel con «Personalizar»)
{
  const E = { ...GENERICO, widget: '', tituloDisenos: '¿Qué vas a <em>celebrar</em>?', grid: C.EVENTOS.map((e) => ({ slug: SLUG_CREAR[e.id], nombre: e.id === 'boda' ? 'Bodas' : e.nombre, img: `/web/img/eventos/${e.img}` })) };
  const P = { titulo: 'Crear invitación digital | Amo Invitar!', descripcion: 'Crea tu invitación digital: elige el modelo, personalízala gratis y obtén tu link. Pago único solo al publicar. Bodas, 15 años, bautismos, comuniones, cumpleaños, baby shower, graduaciones y eventos corporativos.', widget: true };
  escribe('crear-invitacion', P, [
    cabeceraSimple('Crear invitación', 'Tu invitación, lista en minutos', 'Elige qué vas a celebrar, escoge el diseño que más te guste y míralo terminado con tus datos. Solo pagas si decides publicarlo.'),
    disenos(E), comoFunciona(E, false), planes(E), faq(E, P), llamada(E), contacto(E),
  ].join('\n'));
}

// Precios
{
  const E = { ...GENERICO };
  const P = { titulo: 'Planes y precios de invitaciones digitales | Amo Invitar!', descripcion: 'Un pago, cero complicaciones: planes Gratis, Basic, Premium y Deluxe para tu invitación digital. Sin suscripciones. Diséñala, míralas terminada y paga solo al publicar.' };
  escribe('precios', P, [
    cabeceraSimple('Planes y precios', 'Un pago único. Sin suscripciones.', 'Empieza gratis, diseña tu invitación y míralas terminada antes de pagar. Eliges el plan solo cuando decides publicarla.'),
    planes(E), juntos(), faq(E, P), testimonios(), llamada(E), contacto(E),
  ].join('\n'));
}

// Contacto
{
  const E = { ...GENERICO };
  const P = { titulo: 'Contacto | Amo Invitar!', descripcion: 'Escríbenos por WhatsApp o desde el formulario: te ayudamos a elegir el diseño, pedir una invitación a medida o resolver cualquier duda.' };
  escribe('contacto', P, [
    cabeceraSimple('Contacto', '¿Hablamos?', 'Cuéntanos qué necesitas y te respondemos en el día. También por WhatsApp.'),
    contacto(E), faq(E, P),
  ].join('\n'));
}

// ── Álbum QR (Albunear) ─────────────────────────────────────────────────
const ALB_FUNC = [
  ['phone', 'Sin app, sin descargas', 'Tus invitados escanean el QR con la cámara del celular y suben desde el navegador. Cero instalaciones, cero registros.'],
  ['globe', 'Funciona en cualquier dispositivo', 'Android, iPhone, Windows, tableta… cualquier dispositivo con cámara y navegador alcanza.'],
  ['lock', 'Álbum privado', 'Solo entran quienes tienen el QR. No aparece en buscadores ni hay links públicos. Tú entras con un enlace seguro a tu email, sin contraseñas.'],
  ['image', 'Calidad HD original', 'El plan Platinum guarda las fotos sin comprimir, con sus metadatos, y descargas todo en un ZIP listo para archivar.'],
  ['video', 'Videos cortos', 'Los invitados también pueden subir los videos que graben durante el evento.'],
  ['shield', 'Moderación con un clic', 'Si alguna foto no debe estar en el álbum, la borras desde el panel. Tú decides qué queda.'],
  ['users', 'Co-administración', 'En una boda, los dos tienen acceso al panel, y también pueden invitar a organizadores o wedding planners.'],
  ['mensaje', 'Libro de firmas digital', 'Cada invitado puede dejar un mensaje al subir sus fotos. Todos se guardan juntos en tu panel.'],
  ['play', 'Slideshow en vivo', 'Proyecta las fotos en tiempo real en una pantalla durante la fiesta: así todos pueden verse.'],
];
const ALB_ICONOS = [`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h3v4h-3"/></svg>`, `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3"/></svg>`, `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`, `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>`];
const ALB_PASOS = [
  ['Crea tu álbum', 'Elige el estilo, pon los nombres y la fecha. Al instante tienes tu link, tu QR y las tarjetas para imprimir.'],
  ['Tus invitados suben', 'Escanean el QR de la mesa o tocan el botón de tu invitación, y suben fotos y videos desde el celular.'],
  ['Slideshow en vivo', 'Proyecta las fotos en una pantalla o TV mientras llegan, con transiciones elegantes.'],
  ['Descarga todo', 'Desde tu panel privado ves las fotos en tiempo real y te llevas todo en un ZIP.'],
];
const ALB_COMP = [
  ['Todas las fotos en un solo lugar', 'y', 'y', 'n', 'y', 'n'],
  ['Sin app para invitados', 'y', 'p', 'n', 'n', 'y'],
  ['Fotos en resolución original 4K', 'y', 'p', 'n', 'y', 'y'],
  ['Videos', 'y', 'p', 'n', 'y', 'n'],
  ['Pago único (sin suscripción)', 'y', 'n', 'y', 'n', 'y'],
  ['Plantillas QR', 'y', 'p', 'n', 'n', 'p'],
  ['Co-administración', 'y', 'n', 'n', 'n', 'n'],
  ['Libro de firmas digital', 'y', 'n', 'n', 'n', 'n'],
];
const MARCA = { y: `<span class="si">${ic('check')}<span class="sr">Incluido</span></span>`, n: '<span class="no" aria-label="No disponible">—</span>', p: '<span class="parcial" aria-label="Parcial o limitado">parcial</span>' };

function paginaAlbum() {
  const E = { ...GENERICO, id: 'otros', tuEvento: 'tu evento' };
  const P = { titulo: 'Álbum colaborativo QR para bodas y eventos | Amo Invitar! + Albunear', descripcion: 'Álbum de fotos por QR para bodas y eventos: tus invitados escanean un QR y suben fotos y videos sin apps. Slideshow en vivo y descarga en alta calidad. Se integra con tu invitación digital de Amo Invitar!.' };
  const ticks = ['Sin apps', 'Listo en 60 segundos', 'Pago único'];
  const fd = (n) => `<i style="background-image:url(/web/img/fiestas/fiesta${n}.webp)"></i>`;
  const hero = `<section class="portada alb-hero" id="inicio" style="--hero-g:linear-gradient(160deg,#fff 0%,#E5F3EC 55%,#cfe8dc 100%);--hero-gd:linear-gradient(160deg,#fff 0%,#E5F3EC 55%,#cfe8dc 100%);--hero-m:none;--hero-d:none"><div class="caja portada-grid">
    <div class="portada-texto"><img class="alb-logo" src="/web/img/albunear-dark.svg" alt="Albunear" width="3246" height="1016"><span class="etiqueta">Álbum colaborativo QR</span><h1>Todas las fotos de tu evento, <em>en un solo lugar.</em></h1>
      <p class="lead">Tus invitados escanean un QR o tocan el botón de tu invitación y suben sus fotos y videos al instante, sin descargar ninguna app. Proyéctalas en vivo durante la fiesta y descárgalas todas al final.</p>
      <div class="fila-btn"><a class="btn btn-verde" href="https://albunear.com/#precios" target="_blank" rel="noopener">Crear mi álbum</a><a class="btn btn-borde" href="https://albunear.com/empezar?plan=free" target="_blank" rel="noopener">Probar gratis</a><a class="btn btn-negro" href="https://albunear.com/demo" target="_blank" rel="noopener">Ver demo</a></div>
      <ul class="puntos">${ticks.map((t) => `<li>${ic('check')}<span>${t}</span></li>`).join('')}</ul></div>
    <div class="alb-mock" aria-hidden="true">
      <div class="alb-mock-qr"><p class="q0">¡Comparte tus fotos!</p><p class="q1">Sofi &amp; Ale</p><img src="/web/img/qr-demo.svg" alt="" width="33" height="33"><p class="q2">Escanea el código y sube tus fotos</p></div>
      <div class="alb-mock-tv">${[2, 8, 4, 10, 6, 11].map(fd).join('')}<span class="alb-mock-toast">📷 Nueva foto de Lucía</span></div>
      <div class="alb-mock-phone"><div class="card-in"><p class="t0">Boda de</p><p class="t1">Sofi &amp; Ale</p><p class="t2">¡Comparte tus fotos!</p><div class="b">Subir fotos</div><div class="g">${[1, 4, 5, 2, 7, 6].map((n) => `<i style="background-image:url(/web/img/fiestas/fiesta${n}.webp)"></i>`).join('')}</div></div></div>
    </div></div></section>`;
  const pasos = `<section class="seccion" id="como-funciona"><div class="caja">${titulo('Así de simple', '¿Cómo <em>funciona</em>?', 'Para bodas, 15 años, cumpleaños, bautismos, comuniones, graduaciones y eventos corporativos.')}<div class="alb-cards">${ALB_PASOS.map(([h, p], i) => `<article class="alb-card rev"><span class="alb-icon">${ALB_ICONOS[i]}</span><span class="alb-num">${i + 1}</span><h3>${h}</h3><p>${p}</p></article>`).join('')}</div></div></section>`;
  const comp = `<section class="seccion alt" id="comparativa"><div class="caja">${titulo('Compara', 'Albunear <em>vs</em> otras opciones', '')}<div class="comparar-caja"><table class="comparar" style="--cols:5"><thead><tr><th scope="col"><span class="sr">Función</span></th><th scope="col" class="col-d">Albunear</th><th scope="col">Otros servicios QR</th><th scope="col">WhatsApp</th><th scope="col">Google Fotos</th><th scope="col">Cabina clásica</th></tr></thead><tbody>${ALB_COMP.map((r) => `<tr><th scope="row">${r[0]}</th>${r.slice(1).map((v, i) => `<td${i === 0 ? ' class="col-d"' : ''}>${MARCA[v]}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="planes-nota" style="margin-top:14px"><small>Parcial: depende del servicio o está limitado.</small></p></div></section>`;
  const func = `<section class="seccion" id="funciones-album"><div class="caja">${titulo('Todo incluido', 'Funciones <em>destacadas</em>', '')}<div class="funciones tres">${ALB_FUNC.map(([i, t, p]) => `<article class="funcion rev"><div class="ic">${ic(i)}</div><h3>${t}</h3><p>${p}</p></article>`).join('')}</div></div></section>`;
  const cta = `<section class="seccion" style="padding-block:clamp(40px,6vw,80px)"><div class="caja"><div class="llamada rev"><h2>¡Deja de perseguir a los invitados para que te envíen las fotos!</h2><p>Si quieres tener las fotos de tus invitados sin apps que solo complican las cosas a quien no se lleva bien con la tecnología, ni tener que crear grupos de WhatsApp, tu mejor opción es el álbum privado de Albunear.</p><div class="fila-btn"><a class="btn btn-claro btn-grande" href="https://albunear.com/#precios" target="_blank" rel="noopener">Crear mi álbum</a><a class="btn btn-borde-claro btn-grande" href="https://albunear.com/empezar?plan=free" target="_blank" rel="noopener">Probar gratis</a><a class="btn btn-borde-claro btn-grande" href="https://albunear.com/demo" target="_blank" rel="noopener">Ver demo</a></div></div></div></section>`;
  const albumFaq = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'album-faq.json'), 'utf8'));
  P.cabFija = true;
  escribe('album', P, [hero, pasos, juntos(true), comp, func, faq(E, P, albumFaq), cta, contacto({ ...E, id: 'index' })].join('\n'));
}
paginaAlbum();

// ── Profesionales ───────────────────────────────────────────────────────
function paginaProfesionales() {
  const E = { ...GENERICO, id: 'index' };
  const P = { scripts: ['/web/js/profesionales.js'], titulo: 'Invitaciones digitales para wedding planners, fotógrafos y salones | Amo Invitar!', descripcion: 'Planes Pro y Studio para profesionales: panel con todos tus eventos, usuarios administradores, créditos a precio mayorista, marca blanca y dominio propio para tus invitaciones digitales.' };
  const hero = `<section class="portada" id="inicio"><div class="caja portada-centro"><span class="etiqueta">Para profesionales</span><h1>Invitaciones digitales para tus clientes, con tu marca</h1><p class="lead" style="margin-inline:auto">Wedding planners, fotógrafos, salones y agencias: administra todos tus eventos en un solo panel, suma a tu equipo y entrega invitaciones que se sienten tuyas.</p><div class="fila-btn" style="justify-content:center"><a class="btn btn-claro btn-grande" href="#contacto">Quiero mi cuenta</a><a class="btn btn-borde-claro btn-grande" href="#niveles">Ver los niveles</a></div></div></section>`;
  const nivel = (n, o) => `<article class="plan-card rev${o.destacado ? ' destacado' : ''}">${o.destacado ? '<span class="cinta">Marca blanca</span>' : ''}<h3>${PRO[n].nombre}</h3><p class="precio">${PRO[n].pase ? `${eur(PRO[n].pase)} <small style="font-size:.4em;color:var(--suave)">/ año</small>` : '0 €'}</p><p class="precio-s">${o.ideal}</p><ul>${o.items.map((t) => `<li>${ic('check')}<span>${t}</span></li>`).join('')}</ul><a class="btn ${o.destacado ? 'btn-verde' : 'btn-borde'}" href="#contacto" data-nivel="${PRO[n].nombre}">${o.boton}</a></article>`;
  const niveles = `<section class="seccion" id="niveles"><div class="caja">${titulo('Niveles', 'Elige cómo <em>trabajar</em>', 'Empieza sin costo fijo y pasa a Studio cuando tu volumen lo pida.')}
  <div class="planes dos">${nivel('pro', { ideal: 'Ideal para fotógrafos y organizadores independientes. Sin costo fijo.', boton: 'Empezar con Pro', items: [`Hasta ${PRO.pro.administradores} usuarios administradores`, 'Panel con todos tus eventos', `Créditos sueltos (${eur(PRO.credito)}) o packs chicos`, 'Tu logo junto al pie de Amo Invitar', 'Tus invitaciones en amoinvitar.com/…', 'Tus clientes pueden publicar si les das acceso de administrador'] })}${nivel('studio', { destacado: true, ideal: 'Ideal para salones de eventos medianos y agencias.', boton: 'Hablar con nosotros', items: [`Hasta ${PRO.studio.administradores} usuarios administradores`, '<strong>Marca blanca:</strong> sin el pie de Amo Invitar; tu logo, tu texto o sin pie', 'Panel sin la marca de Amo Invitar ni links a otros productos', 'Dominio propio: invitaciones.tusalon.com (*)', `Packs exclusivos: hasta ${dto(PRO.studio.packs[3].precio, PRO.studio.packs[3].creditos)} % de descuento`, 'Tus clientes pueden publicar si les das acceso de administrador'] })}</div>
  <p class="planes-nota">(*) Configuración del dominio sin cargo con el pack de ${PRO.studio.dominioSinCargoDesdePack} créditos, o una única vez por ${eur(PRO.studio.configuracionDominio)}. El pase Studio es anual y se renueva cada año. <strong>Precios sin IVA</strong> (en España y la UE se suma el IVA que corresponda).</p></div></section>`;
  const filaPack = (k) => `<tr><th scope="row">Pack ${k.creditos} créditos</th><td>${eur(k.precio)}</td><td>${eur(k.precio / k.creditos)}</td><td>${dto(k.precio, k.creditos)} %</td></tr>`;
  const tabla = (n, tit, nota) => `<div class="rev"><h3 class="comparar-tit" style="margin-top:0">${tit}</h3><div class="comparar-caja"><table class="comparar" style="min-width:0"><thead><tr><th scope="col"><span class="sr">Pack</span></th><th scope="col">Precio</th><th scope="col">Por crédito</th><th scope="col">Descuento</th></tr></thead><tbody>${PRO[n].packs.map(filaPack).join('')}</tbody></table></div><p class="planes-nota" style="margin-top:12px"><small>${nota}</small></p></div>`;
  const creditos = `<section class="seccion alt" id="creditos"><div class="caja">${titulo('Créditos', 'Un crédito, <em>una invitación</em>', `Cada crédito cuesta ${eur(PRO.credito)} y publica una invitación de cualquier paquete (hasta Deluxe) y cualquier modelo, al mismo precio. Precios sin IVA: en España y la Unión Europea se suma el IVA que corresponda.`)}
  <div class="packs-dos">${tabla('pro', 'Pro · sin pase anual', `Crédito suelto: ${eur(PRO.credito)}.`)}${tabla('studio', `Studio · con pase anual activo`, `Packs exclusivos para cuentas Studio con el pase al día (${eur(PRO.studio.pase)} al año).`)}</div>
  <div class="aparte rev">${ic('clock')}<div><h3>Vencimiento de los créditos</h3><p>Los créditos <strong>vencen a los 12 meses</strong> de la compra si no se usan. Si renuevas tu pase anual <strong>Studio</strong> antes de que venzan, los que no usaste se acumulan para el año siguiente.</p></div></div>
  <div class="aparte rev">${ic('tag')}<div><h3>Lo que se contrata aparte</h3><p>El crédito no incluye el <strong>diseño a medida</strong> (en ninguna de sus variantes), el <strong>cambio de diseño</strong>, los <strong>idiomas adicionales</strong> ni los <strong>complementos pagos</strong> de la invitación. Si tus clientes los necesitan, escríbenos y los contratamos juntos.</p><a class="btn btn-borde" href="#contacto" data-nivel="Consulta">Consultar un diseño o un complemento</a></div></div></div></section>`;
  const comparar = `<section class="seccion" id="comparar"><div class="caja">${titulo('Comparativa', 'Pro <em>y</em> Studio', '')}<div class="comparar-caja rev"><table class="comparar" style="--cols:2"><thead><tr><th scope="col"><span class="sr">Función</span></th><th scope="col">Pro</th><th scope="col" class="col-d">Studio</th></tr></thead><tbody>
  ${[['Pase anual', '0 €', `${eur(PRO.studio.pase)} / año`], ['Usuarios administradores', `Hasta ${PRO.pro.administradores}`, `Hasta ${PRO.studio.administradores}`], ['Panel con todos tus eventos', true, true], ['Valor del crédito', eur(PRO.credito), eur(PRO.credito)], ['Packs de créditos', 'De 5 y de 10', 'De 10, 25, 50 y 100'], ['Mejor precio por crédito', eur(PRO.pro.packs[1].precio / PRO.pro.packs[1].creditos), eur(menorPack('studio'))], ['Pie de la invitación', 'Amo Invitar + tu logo', 'Tu logo, tu texto o sin pie'], ['Marca blanca', false, true], ['Tu panel de equipo sin la marca de Amo Invitar', false, true], ['Panel de tu cliente sin marca ni contacto de Amo Invitar', true, true], ['Dominio propio (invitaciones.tusalon.com)', false, true], ['Créditos sin usar al renovar el pase', false, 'Pasan al año siguiente'], ['Tus clientes publican con acceso de administrador', true, true]].map((r) => `<tr><th scope="row">${r[0]}</th>${r.slice(1).map((v, i) => `<td${i === 1 ? ' class="col-d"' : ''}>${celda(v)}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div>
  <div class="pasar-studio rev">${ic('sparkles')}<p><strong>¿Empezaste con Pro y creciste?</strong> Pasar a Studio es posible en cualquier momento: en tu panel vas a ver siempre lo que ganas y un botón para hacerlo. Con más de unas 20 invitaciones al año, Studio ya te sale más barato.</p></div></div></section>`;
  const como = `<section class="seccion alt" id="como-trabajan"><div class="caja">${titulo('Cómo funciona', 'Tu equipo, <em>tus clientes</em>', '')}<ol class="alb-pasos">${[['Pide tu cuenta', 'Cuéntanos sobre tu empresa o estudio y activamos tu cuenta profesional.'], ['Suma créditos', `Compra créditos sueltos o un pack, según tu nivel.`], ['Crea los eventos', 'Cada evento lo armas tú, tu equipo o tu cliente con el acceso que le des.'], ['Publica y comparte', 'Cada invitación sale con tu pie de marca, y tú sigues todos los eventos desde un tablero.']].map(([h, p], i) => `<li class="rev"><span class="paso-num">${i + 1}</span><h3>${h}</h3><p>${p}</p></li>`).join('')}</ol>
  <div class="aparte rev" style="margin-top:34px">${ic('lock')}<div><h3>Qué ve y qué no ve tu cliente</h3><p>Si le das acceso de administrador, tu cliente puede cargar su invitación y <strong>publicarla</strong>. No puede cambiar la configuración de tu cuenta ni comprar, y no ve nada de tu empresa. Su panel no muestra ninguna marca, link ni botón de contacto de Amo Invitar.</p></div></div></div></section>`;
  const preg = [
    ['¿Qué diferencia hay entre Pro y Studio?', `<p><strong>Pro</strong> no tiene costo fijo: compras créditos sueltos o packs de 5 y 10, y puedes sumar tu logo junto al pie de Amo Invitar. <strong>Studio</strong> cuesta ${eur(PRO.studio.pase)} al año e incluye marca blanca (sin el pie de Amo Invitar), panel sin nuestra marca, hasta ${PRO.studio.administradores} administradores, dominio propio y packs con más descuento.</p>`],
    ['¿Qué incluye un crédito?', `<p>Un crédito (${eur(PRO.credito)}) publica <strong>una invitación</strong> de cualquier paquete, hasta Deluxe, y de cualquier modelo: todos cuestan lo mismo.</p>`],
    ['¿Qué no incluye un crédito?', '<p>No cubre el diseño a medida (de ningún tipo), el cambio de diseño, los idiomas adicionales ni los complementos pagos de la invitación. Eso se contrata aparte: escríbenos y lo cotizamos.</p>'],
    ['¿Mi cliente puede publicar su invitación?', '<p>Sí, si le das acceso de administrador. No puede comprar ni cambiar la configuración de tu cuenta, y no ve nada de tu empresa ni de Amo Invitar.</p>'],
    ['¿Cómo funciona la marca blanca?', '<p>En Studio, el pie de la invitación no lleva la marca de Amo Invitar ni links: puedes poner tu logo, un texto con tu nombre, o no mostrar ningún pie. Se carga una sola vez y se aplica a todos tus eventos. Los colores y el estilo de las invitaciones no cambian.</p>'],
    ['¿Puedo usar mi propio dominio?', `<p>Con Studio, sí: tus invitaciones salen desde un dominio o subdominio tuyo (por ejemplo invitaciones.tusalon.com). La configuración es sin cargo con el pack de ${PRO.studio.dominioSinCargoDesdePack} créditos, o de ${eur(PRO.studio.configuracionDominio)} por única vez.</p>`],
    ['¿Puedo pasar de Pro a Studio más adelante?', '<p>Siempre. Desde tu panel Pro verás los beneficios de Studio y un botón para pasarte cuando quieras.</p>'],
    ['¿Cómo se aprueba una cuenta profesional?', '<p>Cada cuenta se revisa a mano. Se completa el formulario de esta página con el link de tu web o red social, tu rubro y una descripción de tu trabajo, y el equipo responde por email. Es parte del cuidado de los precios mayoristas.</p>'],
    ['¿Vencen los créditos?', '<p>Sí: a los 12 meses de la compra, si no se usaron. Con Studio, si renuevas el pase anual antes de que venzan, los créditos que sobran se acumulan para el año siguiente.</p>'],
    ['¿Los precios incluyen IVA?', '<p>No. Los precios son sin IVA: en España y la Unión Europea se suma el IVA que corresponda (25 € + IVA, por ejemplo).</p>'],
    ['¿Cómo pago?', '<p>Con los medios de pago de tu país, como en el resto del sitio. Si necesitas algo especial, escríbenos desde el formulario.</p>'],
  ];
  const rubros = [['planner', 'Wedding planner / organizador de eventos'], ['fotografia', 'Fotografía o video'], ['salon', 'Salón o espacio de eventos'], ['agencia', 'Agencia'], ['otro', 'Otro']];
  const form = `<section class="seccion" id="contacto"><div class="caja contacto"><div class="rev"><span class="sobre" style="font:600 13px/1 var(--sans);letter-spacing:.28em;text-transform:uppercase;color:var(--verde);display:block;margin-bottom:12px">Pedir mi cuenta</span><h2 style="font-size:clamp(28px,4vw,42px)">Cuéntanos cómo trabajas</h2><p>Las cuentas profesionales se aprueban una por una. Con estos datos revisamos tu trabajo y te respondemos por email con los pasos para activarla.</p><div class="contacto-datos"><a href="${C.WHATSAPP}" target="_blank" rel="noopener"><span class="ic">${ic('wa')}</span>WhatsApp</a><a href="mailto:${C.EMAIL}?subject=${encodeURIComponent('Profesionales · Amo Invitar!')}"><span class="ic">${ic('mail')}</span>${C.EMAIL}</a></div></div>
  <form class="tarjeta formu rev" id="form-pro"><div class="dos"><label>Nombre y apellido<input name="nombre" required minlength="2" autocomplete="name"></label><label>Email<input name="email" type="email" required autocomplete="email"></label></div><div class="dos"><label>WhatsApp<input name="telefono" type="tel" autocomplete="tel" placeholder="Con código de país"></label><label>País<input name="pais" autocomplete="country-name"></label></div><div class="dos"><label>Empresa o estudio<input name="empresa" autocomplete="organization"></label><label>Tu rol o profesión<input name="profesion" placeholder="Ej.: fotógrafa de bodas"></label></div><label>Link de tu página web o red social<input name="web" required placeholder="https://… o @tuusuario"></label><div class="dos"><label>Rubro<select name="rubro" required><option value="">Elegir…</option>${rubros.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select></label><label>Nivel que te interesa<select name="nivel"><option value="pro">Pro · sin costo fijo</option><option value="studio">Studio · pase anual</option></select></label></div><label>Describe tu trabajo y cuántos eventos haces al año<textarea name="descripcion" rows="5" required minlength="30" placeholder="A qué te dedicas, qué tipo de eventos organizas o fotografías, cómo trabajas con tus clientes…"></textarea></label><label class="acepto"><input type="checkbox" name="privacidad" value="si" required><span>Acepto la <a href="/info/politica-de-privacidad">política de privacidad</a>.</span></label><button class="btn btn-verde btn-grande" type="submit">Enviar solicitud</button><p class="contacto-estado" data-contacto-estado></p></form></div></section>`;
  escribe('profesionales', P, [hero, niveles, creditos, comparar, como, faq(E, P, preg), form].join('\n'));
}
paginaProfesionales();

// README (ronda 36): «Entrar» y «Mis invitaciones» llevan la misma barra superior que la web (entre marcadores)
for (const f of ['public/entrar/index.html', 'public/mi-cuenta/index.html']) {
  const ruta = join(RAIZ, '..', '..', f);
  let h = readFileSync(ruta, 'utf8');
  const bloque = `<!--cab-->${sprite()}${cabecera({ slug: 'cuenta' })}<!--/cab-->`;
  h = h.replace(/<!--cab-->[\s\S]*?<!--\/cab-->/, bloque);
  writeFileSync(ruta, h);
}

console.log('Páginas generadas:', PAGINAS.join(', '));
