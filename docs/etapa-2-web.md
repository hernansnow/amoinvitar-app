# Etapa 2 · La web completa en Cloudflare (sin Hostinger)

> Guía para quien arme las páginas nuevas (personas o IA). Leer entera antes de tocar `public/sitio/`.

Objetivo: que `amoinvitar.com` lo sirva este mismo Worker. La web nueva se arma de a poco **oculta en
`app.amoinvitar.com`**; cuando esté lista se pasa al dominio principal. Durante todo el proceso, lo viejo (páginas, css,
scripts, imágenes, **las invitaciones activas de los clientes** y **sus paneles viejos**) sigue online con las mismas
direcciones y no se pisa.

---

## 1. Cómo resuelve el Worker cada dirección (en este orden; el primero que responde, gana)

| # | Qué | Dónde está | Código |
|---|---|---|---|
| 0 | **Paneles viejos** (solo en el subdominio `panel.amoinvitar.com`) | carpeta `panel/` del bucket `LEGADO` | `src/index.js` (inicio de `fetch`) |
| 1 | **La app**: `/panel`, `/tienda`, `/mi-cuenta`, `/entrar`, `/api/*`, `/modelos/*`, `/comun/*`, `/demo/<modelo>`, `/std/*`, `/vista/*`, invitaciones nuevas publicadas (`/boda/sofi-y-ale`) | `src/`, `public/` | `src/index.js` |
| 2 | **La web nueva**: `public/sitio/bodas.html` se ve en `/bodas`, `public/sitio/index.html` en `/` | `public/sitio/` | `src/sitio/nuevo.js` |
| 3 | **El sitio viejo** (copia exacta del hosting, mismas rutas) | bucket R2 `LEGADO` | `src/sitio/legado.js` |
| 4 | Si nada respondió: el hosting actual (`ORIGEN_ANTIGUO`), mientras siga contratado | Hostinger | `src/index.js` |

Consecuencias:
- Una página vieja se reemplaza poniendo la nueva en `public/sitio/` **con la misma ruta**. No se borra nada.
- Lo que todavía no se rehízo sigue saliendo del sitio viejo (paso 3 o 4).
- Mientras no exista el bucket, en `app.amoinvitar.com` lo que la web nueva pida del sitio viejo (`/css/…`, `/img/…`)
  se redirige a `amoinvitar.com` y carga igual: se puede probar sin subir nada.

## 2. Reglas para la web nueva (`public/sitio/`)

1. **Rutas propias en `/web/`**: los css, js e imágenes nuevos van en `public/sitio/web/…` (se ven en `/web/…`).
   **Nunca** usar el mismo nombre que un archivo del sitio viejo (`/css/snow_v3.6.css`, `/js/snow_2.7.1.js`, `/img/…`):
   las invitaciones viejas los siguen usando y la web nueva los pisaría.
2. **No crear nada en las carpetas de clientes**: `/boda/`, `/15/`, `/evento/`, `/nuevos-bautismo/`, `/nuevos-comunion/`,
   `/nuevos-cumple/`, `/mi-bauti/`, `/mi-comuion/`, `/mi-cumple/`, `/mi-graduacion/`, `/save-the-date/`, `/birthday/`.
   El Worker ya las protege (`PROTEGIDAS` en `src/sitio/nuevo.js`): aunque haya un archivo ahí, no se sirve.
3. **No usar las rutas de la app** (`/panel`, `/tienda`, `/api`, `/modelos`, `/comun`, `/mi-cuenta`, `/entrar`,
   `/ayuda`, `/demo`…): la app va primero.
4. **Rutas absolutas** (`/web/css/…`, `/img/…`), no relativas: las páginas por país (`/ar/bodas`) están un nivel más abajo.
5. **Elegir modelo y "Personalizar"**: ya está hecho en `/web/js/crear-invitacion.js` (+ `/web/css/crear-invitacion.css`).
   Uso: `<div class="ci-widget"></div>` (con selector de evento), `data-evento="boda"` (uno fijo) o
   `data-eventos="infantil,baby-shower"` (algunos). El `<script>` lleva `data-app=""` (la app está en el mismo dominio),
   `data-img="/img/"` (miniaturas de los celulares del sitio viejo) y `data-raiz="/"`. Ejemplo armado:
   `public/sitio/crear-invitacion.html` (también responde `/crear-invitacion-para-<evento>`).
   El catálogo (modelos, precios por país, qué Save The Date hay en cada evento) viene de `GET /api/tienda/catalogo`.
6. **Formulario de contacto**: uno solo para todas las páginas, hecho de cero → sección 4.
7. **Textos** en español neutro (tú/ustedes, celular, computadora).
8. Para crear o empezar algo desde una página: link a `/tienda/?empezar=1&producto=…&evento=…&modelo=…&a=…&b=…&fecha=…`
   (lo arma el widget; ver `empezarDesdeLink` en `public/tienda/tienda.js`).

## 3. Ver la web oculta en `app.amoinvitar.com`

- Fuera de `amoinvitar.com` la web nueva **no se ve**, salvo con la clave de vista previa:
  1. Una vez: `npx wrangler secret put SITIO_CLAVE` (una palabra cualquiera, larga).
  2. Entrar a `https://app.amoinvitar.com/?vista=<la clave>`: queda una cookie por 30 días y ya se ven todas las
     páginas de `public/sitio/` (`/crear-invitacion`, `/bodas`, …). `?vista=salir` la borra.
- Sin la cookie todo sigue como antes (la portada de `app.amoinvitar.com` lleva a la tienda).
- Fuera del dominio principal las páginas van con `noindex` (Google no las indexa).
- En la compu (`npm run local`) se ven siempre, sin clave.

## 4. Formulario de contacto (nuevo, de cero)

- Servidor: `POST /api/contacto` (`src/rutas/contacto.js`), JSON o formulario.
  Campos: `nombre`*, `email`*, `telefono`, `evento`, `pais`, `mensaje`*, `privacidad`* (`"si"` o `true`).
  Antispam: Turnstile (si está el secreto `TURNSTILE_SECRET`), campo trampa `sitio_web`, 3 s mínimos desde que se abrió
  la página, y 5 envíos cada 10 minutos por IP. El mail llega a `SUPPORT_EMAIL` con "responder a" el del cliente.
- Página: `<form data-contacto data-turnstile="CLAVE_PUBLICA">` con esos nombres +
  `<script src="/comun/js/contacto.js" defer></script>` (ejemplo completo en ese archivo). Muestra el resultado en el
  mismo formulario, sin recargar.
- Las páginas viejas (que mandan a `email/mailer2.php` y `{país}/email/mailer*.php`) usan el mismo código por detrás
  (`src/sitio/legado.js`) y responden como el PHP (una página que vuelve sola).
- ⚠️ **Turnstile**: el secreto viejo está escrito en `email/mailer2.php` del repo de la web vieja. Generar uno nuevo en
  Cloudflare → Turnstile (clave pública para el `data-turnstile`, secreta con `npx wrangler secret put TURNSTILE_SECRET`).

## 5. Paneles viejos (`/panel/` del sitio viejo, en `panel.amoinvitar.com`)

En Hostinger, la carpeta `/panel/` (los paneles de los clientes del sistema anterior) se ve en el subdominio
`panel.amoinvitar.com`. El panel nuevo vive en `amoinvitar.com/panel` (y los mails, links y la web ya lo usan así).

**Decisión: no se mueve el panel nuevo.** Se separan por subdominio:
- `panel.amoinvitar.com/<lo que sea>` → el Worker lo sirve desde la carpeta `panel/` del bucket del sitio viejo
  (exactamente lo mismo que hoy en Hostinger). No pasa por la app ni por la web nueva.
- `amoinvitar.com/panel/…` → el panel nuevo.
- Los paneles viejos cargan sus scripts con dirección absoluta (`https://amoinvitar.com/js/panel_v1.9.js`…): salen del
  sitio viejo (paso 3) porque la app no tiene esos archivos. **No crear en la web nueva ni en la app archivos con esos
  nombres.**
- Al mudar: agregar `panel.amoinvitar.com` en `routes` de `wrangler.jsonc` (y `PANEL_VIEJO_HOST` si fuera otro).
- Detalle: algunos paneles viejos tienen `<?=time();?>` dentro del HTML (Hostinger lo procesaba como PHP). Ahora sale tal
  cual: solo queda escrito en el `?v=` de un script (no rompe nada; es para que el navegador no use la copia vieja).

## 6. Lo que hace el Worker en lugar de Apache/PHP

| Antes (Hostinger) | Ahora (Worker) |
|---|---|
| `.htaccess`: https y sin www | Cloudflare: *Always Use HTTPS* y una regla `www` → sin `www` |
| `.htaccess`: sin `.html`, carpetas con `/` | `legado.js` (prueba `ruta.html`, `ruta/index.html`; carpeta sin barra → 301 con barra) |
| `.htaccess`: opciones→precios, classic→basic, bautizo, birthday, store/tienda, crear-invitacion-para-… | `legado.js` |
| `a-musica.php` (41 invitaciones viejas: canciones sugeridas a `canciones.txt`) | D1, tabla `legado_canciones` (migración `0004_legado.sql`) |
| `lista-canciones.php` | Las del `canciones.txt` del bucket + las nuevas de D1 |
| `email/mailer2.php`, `{país}/email/mailer*.php` | `src/rutas/contacto.js` (sección 4) |
| `email/correo.php`, `email/email.php`, `evento/hernan/save-image.php`, `google-forms-css-cors.php` | **Sin reemplazo**: revisar si se usan |

Además, un link nuevo de invitación no puede ser el de una carpeta vieja de cliente (`/boda/<nombre>/`): el panel lo
rechaza y sugiere otro (`slugDelLegado` en `src/index.js`; mira el bucket o, si no está, el hosting).

## 7. Caducidad de las invitaciones (desde la fecha del evento)

Gratis 15 días · Basic 3 meses · Premium 6 meses · Deluxe 12 meses (diseño a medida = Deluxe; Save The Date web e
invitación simple = Basic). `src/vencimiento.js`; pasado el plazo la invitación muestra "Esta invitación ya finalizó".
Mis invitaciones muestra "Online hasta el …". Una extensión a mano: poner `vence` más lejano en la tabla `eventos`.

## 8. Pasos para mudar el dominio (cuando la web esté lista)

1. **Inventario** (no sube nada): `node scripts/sitio/inventario-legado.mjs ../amoinvitar-v2.0`
   (hoy: 14.562 archivos, 1,1 GB; no se suben PHP, PSD ni ocultos).
2. **Bucket**: `npx wrangler r2 bucket create amoinvitar-legado`.
3. **Subir el sitio viejo completo** (lo que está en Hostinger, con las invitaciones y paneles de clientes que no están
   en el repositorio). Con `rclone` y la API S3 de R2 (token en Cloudflare → R2 → *Manage API tokens*):
   ```
   rclone sync ./sitio-viejo r2:amoinvitar-legado --exclude ".git/**" --exclude "*.php" --exclude "*.psd" --exclude "apps-script/**" --exclude ".*" --progress
   ```
   Se puede repetir: sube solo lo distinto. La carpeta `panel/` también (sección 5).
4. **Secretos**: `TURNSTILE_SECRET` (nuevo, sección 4).
5. **Activar el bucket**: descomentar `LEGADO` en `wrangler.jsonc`, aplicar la migración
   (`npx wrangler d1 migrations apply amoinvitar --remote`) y publicar.
6. **Probar en `app.amoinvitar.com`** (con la cookie de vista): `/bodas`, `/boda/<invitación vieja>/`,
   `/css/snow_v3.6.css`, el formulario de contacto, sugerir una canción en una invitación vieja.
7. **Mover el dominio**: `routes` → `amoinvitar.com`, `www.amoinvitar.com` (redirección) y `panel.amoinvitar.com`;
   `SITE_URL` → `https://amoinvitar.com`. Actualizar el mismo día las direcciones de vuelta en Stripe, Mercado Pago,
   PayPal, Google (login) y Resend. Borrar `ORIGEN_ANTIGUO` cuando ya no haga falta el hosting.
8. **Tienda vieja** (`/store`, WordPress): `/store` y `/tienda` ya redirigen a `/crear-invitacion`; los
   `/store/producto/…` que queden enlazados, redirigirlos a la página del evento.

## 9. Las páginas se generan (ronda 32)

Las páginas de `public/sitio/*.html` (portada, eventos, precios, contacto, crear-invitación) **se generan**: no editarlas a mano.
- Textos, funciones, planes, tabla comparativa y preguntas frecuentes: `scripts/sitio/contenido.mjs` (opiniones: `opiniones.json`).
- Estructura de cada página y piezas comunes (menú, planes, FAQ, testimonios, llamada final, contacto, pie): `scripts/sitio/construir.mjs`.
- Después de cambiar algo: `npm run sitio` y subir también los `.html` generados.
- Estilos: `public/sitio/web/css/sitio.css` (sin Bootstrap ni jQuery). Scripts: `web/js/sitio.js` (menú, moneda, precios, FAQ, opiniones).
- Precios, país, moneda y medios de pago se piden a `/api/tienda/catalogo`; el texto de abajo de los planes sale de la misma lógica de Albunear.
- `/infantiles` redirige a `/cumple` (src/sitio/nuevo.js). `/album` todavía usa el diseño viejo.

## 10. Países, idiomas y SEO (ronda 42)

**Carpetas por país, como el sitio viejo.** Cada página existe en la raíz (versión neutra: `/bodas`) y en la carpeta de
cada país (`/es/bodas`, `/ar/bodas`, `/mx/bodas`…, y `/us/en/bodas` para Estados Unidos en inglés). La lista de países,
su idioma, su moneda y sus ciudades está en `src/sitio/variantes.js` (PAISES): para sumar un país, agregarlo ahí y
correr `npm run sitio`.

- Archivos: `public/sitio/t/<clave>/<página>.html`, uno por **clave de texto** (es, es-es, es-ar, es-mx, en, fr…). El
  Worker (`src/sitio/nuevo.js`, función `componer`) completa cada copia para su país: título con «| Amo Invitar! – País»,
  descripción con las ciudades, `canonical`, todos los `hreflang` (+ `x-default` a la raíz), `og:locale`, links internos
  con la carpeta (`{{R}}`), moneda (`data-moneda`) y la línea de ciudades del pie.
- `/sitemap.xml` y `/robots.txt` los genera `npm run sitio` (en `public/sitio/`). Las legales (`/info/…`) son una sola
  versión en español, con `noindex`, fuera del sitemap.
- **Idioma automático**: a una persona (no a los buscadores) que entra sin haber elegido país se la lleva (302) a la
  carpeta del país de su IP; Estados Unidos va a `/us/en/` si el navegador está en inglés. Lo elegido en el selector queda
  en la cookie `ai_sede` y manda sobre la IP. Los buscadores ven cada dirección tal cual, sin redirecciones.
- Al ver una carpeta se guardan las cookies `pais_sel`, `cur` e `idioma`: las usan las demos, el panel y la tienda
  (`src/sitio/visitante.js`). Los precios y el IVA siguen yendo por la IP y los datos de facturación.
- Demos viejas por país (`/ar/aquarella/`, `/mx/disco15/`) → 301 a `/demo/<modelo>?evento=…` (una sola demo).

**Variantes del español** (`scripts/sitio/variantes.mjs`, también en el navegador: `public/comun/js/regional.js`):
neutro (tú, boda, bautismo), España (vosotros, móvil, ordenador, vídeo, coste, bautizo), México (bautizo, XV años),
rioplatense (vos, casamiento — Argentina y Uruguay), Paraguay (vos, boda), vos centroamericano (bautizo), Chile y
Colombia (matrimonio, computador), Perú (matrimonio). **«Casamiento / matrimonio» solo en la web**: las demos, el panel
y las invitaciones dicen siempre «boda» (`convertirTexto(t, clave, { web })`). Bautismo/bautizo en demos e invitaciones
nuevas según el país (`diceBautizo`, `datos.bautizo`); el cliente lo cambia con la frase de la portada.

**Traducciones** (`scripts/sitio/i18n/`): `fuente.json` (español) + `<idioma>.json` (en, pt, fr, it, de, nl) para las
páginas, y `js-*.json` para lo que arma el JavaScript (selector de modelos, cookies y panel). Portugal sale del
portugués de Brasil (`aPortugal` en `i18n.mjs`). Después de cambiar textos: `npm run sitio`, `npm run sitio:i18n` (suma
los textos nuevos y dice cuántos faltan) y traducir los números que falten.

**Ronda 43**
- El idioma automático solo actúa en la raíz: una dirección con carpeta (`/ar/…`) se muestra siempre tal cual. Manda lo
  elegido en el selector (cookie `ai_elegida`); si nunca se eligió, la IP. En Mi cuenta y Entrar el selector cambia el
  idioma y recarga la página (el panel toma la cookie `idioma`).
- Los css y js de la web llevan `?v=<hash>` (lo pone `npm run sitio`): después de publicar, nadie se queda con uno viejo.
- La tienda vieja de WordPress (`/store/…`, `/<país>/store/…`) redirige (301) a los precios del país.
- Fichas de modelo: `/invitacion-<modelo>` (texto en `scripts/sitio/modelos-fichas.json`) y catálogo `/disenos`.
- Artículos «Ideas» (`scripts/sitio/ideas.mjs`): `/ideas` y `/ideas/<tema>`, solo en español (raíz y carpetas en
  español, con su variante); en las carpetas de otros idiomas redirigen a la raíz.

## Ronda 44
- Selector de país: un país por fila, idiomas como botones (US es/en, CA en/fr, CH de/fr/it, BE fr/nl); «Internacional» al final y en USD; `/en/` es la internacional en inglés. Sin Haití ni San Vicente (301 a la raíz). Visitas sin carpeta: a la versión del idioma del navegador (`sedePorIdioma`).
- `en-gb` (Reino Unido, Irlanda, Australia, Nueva Zelanda) sale del inglés con `aBritanico` (scripts/sitio/i18n.mjs); `pt-pt` pasa a «tu» con `aTu`.
- /bodas en plural: `scripts/sitio/plural.mjs` (ustedes / vosotros en España / voi, ihr, jullie, vocês). Se activa con `P.plural`.
- Sweet 16: página `sweet16` solo en `en` (la generan a partir de mis15); `datos.sweet16` en invitaciones de 15 creadas en inglés desde US/CA.
- Testimonios: en español todos; en otros idiomas, la selección de `scripts/sitio/opiniones-traducidas.json`.
- Invitaciones: `src/textos/estaticos.js` traduce los textos fijos en español de los modelos; `src/datos/demos-idiomas.js`, nombres/roles/itinerario de las demos por idioma.

## Ronda 47 · Antes de mudar (pendientes y orden)

- **Workers viejos de redirección por IP** (los del sitio viejo, con rutas en `amoinvitar.com/*`): el Worker nuevo ya hace
  esa redirección (cookie `ai_elegida`/`ai_sede` o, la primera vez, país por IP e idioma del navegador → `/ar/`, `/us/en/`…;
  `src/sitio/nuevo.js`). Cloudflare no admite dos Workers con la misma ruta: el día de la mudanza, **antes** de apuntar las
  rutas al Worker nuevo, se **quitan las rutas** de los Workers viejos (no se borran: si hay que volver atrás, se les
  vuelven a poner). Revisar si redirigían a carpetas del sitio viejo (`/en/`, `/pt/`…) que ahora usa la web nueva.
- **Dominio propio de Studio** (`src/pro/dominios.js`): necesita Cloudflare for SaaS en la zona `amoinvitar.com`
  (registro `dominios.amoinvitar.com` con proxy como *fallback origin*), una ruta del Worker para los *custom hostnames* y los
  secretos `CF_API_TOKEN` (permiso «SSL and Certificates: Edit» de la zona) y `CF_ZONE_ID`. Se configura **después** de la
  mudanza: una ruta comodín en la zona antes de mover el dominio taparía el sitio de Hostinger. Sin el token, el dominio se
  da de alta a mano en Cloudflare y se marca activo desde /admin/.
- **Precios** (ronda 47): /admin → Precios y promos → «Precios base» y «Países con precio fijo» (se guardan en
  `app_state['config_precios']`; sin nada guardado valen `src/catalogo.js` y Argentina en `src/lib/fx.js`).
