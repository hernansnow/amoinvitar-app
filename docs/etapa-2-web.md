# Etapa 2 · La web completa en Cloudflare (sin Hostinger)

Objetivo: que `amoinvitar.com` lo sirva este mismo Worker. La web nueva se arma de a poco y, mientras tanto, todo lo
viejo (páginas, css, scripts, imágenes y **las invitaciones activas de los clientes del sistema anterior**) sigue
online con las mismas direcciones.

## Cómo queda armado

Para cada pedido, el Worker prueba en este orden (el primero que responde, gana):

1. **La app** — `/panel`, `/tienda`, `/mi-cuenta`, `/api`, `/modelos`, `/comun`, `/demo/<modelo>`, las invitaciones
   nuevas (`/boda/sofi-y-ale` publicadas en el sistema nuevo), etc.
2. **La web nueva** — `public/sitio/…`, servida en la raíz: `public/sitio/bodas.html` → `amoinvitar.com/bodas`.
   (`src/sitio/nuevo.js`)
3. **El sitio viejo** — un bucket R2 (`LEGADO`) con una copia exacta del hosting actual, con las mismas rutas.
   (`src/sitio/legado.js`). Aplica las reglas del `.htaccess`, sirve los archivos tal cual (los css y scripts viejos
   siguen funcionando para las invitaciones activas) y reemplaza los PHP.
4. Si nada de eso existe: el hosting actual (`ORIGEN_ANTIGUO`), mientras siga contratado.

Así una página se reemplaza poniendo la nueva en `public/sitio/` con la misma ruta: la vieja deja de verse sin borrar
nada. Lo que no se rehízo sigue saliendo del bucket.

### Regla importante para la web nueva

Los css, scripts e imágenes **de la web nueva** van en carpetas nuevas, por ejemplo `public/sitio/web/css/…`, nunca
con el mismo nombre que los del sitio viejo (`css/snow_v3.6.css`, `js/snow_2.7.1.js`, `img/…`): las invitaciones
viejas los siguen usando y, si la web nueva pusiera un archivo con la misma ruta, las pisaría.

## Lo que hace el Worker en lugar de Apache/PHP

| Antes (Hostinger) | Ahora (Worker) |
|---|---|
| `.htaccess`: https y sin www | Cloudflare: *Always Use HTTPS* y una regla de redirección `www` → sin `www` |
| `.htaccess`: sin `.html`, carpetas con `/` | `legado.js` (prueba `ruta.html`, `ruta/index.html`; carpeta sin barra → 301 con barra) |
| `.htaccess`: opciones→precios, classic→basic, bautizo, birthday, store/tienda, crear-invitacion-para-… | `legado.js` (mismas reglas) |
| `a-musica.php` (41 invitaciones: canciones sugeridas a `canciones.txt`) | D1, tabla `legado_canciones` (migración 0004) |
| `lista-canciones.php` | Lista las del `canciones.txt` del bucket más las nuevas de D1 |
| `email/mailer2.php` y `{país}/email/mailer*.php` (formulario de contacto) | Mismas validaciones (Turnstile, trampa, privacidad) y mail a `SUPPORT_EMAIL` |
| `email/correo.php`, `email/email.php`, `evento/hernan/save-image.php`, `google-forms-css-cors.php` | **Sin reemplazo**: revisar si se usan (el inventario los lista) |

## Pasos

1. **Inventario** (no sube nada, solo informa):
   `node scripts/sitio/inventario-legado.mjs ../amoinvitar-v2.0`
   Hoy: 14.562 archivos (1,1 GB) para subir; no se suben PHP, PSD ni ocultos. La carpeta `/panel/` del sitio viejo
   choca con el panel nuevo (la app va primero): si alguna invitación vieja la usa, moverla a otra ruta.
2. **Crear el bucket**: `npx wrangler r2 bucket create amoinvitar-legado`.
3. **Subir el sitio viejo** con la copia completa de lo que hoy está en Hostinger (las invitaciones de clientes que
   no estén en el repositorio también). Lo más rápido es `rclone` con la API S3 de R2 (crear un token de R2 en el
   panel de Cloudflare → R2 → *Manage API tokens*; las claves quedan en tu computadora, no hace falta pasarlas a nadie):

   ```
   rclone sync ./amoinvitar-v2.0 r2:amoinvitar-legado --exclude ".git/**" --exclude "*.php" --exclude "*.psd" --exclude "apps-script/**" --exclude ".*" --progress
   ```

   Se puede repetir cuando haya cambios: sube solo lo distinto.
4. **Secretos**: `npx wrangler secret put TURNSTILE_SECRET` (el del formulario de contacto). ⚠️ Hoy está escrito en
   `email/mailer2.php` del repositorio: conviene **generar uno nuevo** en Cloudflare → Turnstile y usar ese.
5. **Activar** en `wrangler.jsonc`: descomentar el bucket `LEGADO` y `"SITIO_PROPIO": "1"`; aplicar la migración
   (`npx wrangler d1 migrations apply amoinvitar --remote`) y publicar.
6. **Probar en `app.amoinvitar.com`** antes de mover el dominio: con `SITIO_PROPIO` activo, `app.amoinvitar.com/bodas`,
   `/boda/<una invitación vieja>/`, `/css/snow_v3.6.css`, el formulario de contacto y sugerir una canción en una
   invitación vieja deben andar igual que en Hostinger.
7. **Mover el dominio**: en `wrangler.jsonc`, `routes` → `amoinvitar.com` (y `www.amoinvitar.com` con la redirección),
   `SITE_URL` → `https://amoinvitar.com`. Borrar `ORIGEN_ANTIGUO` cuando ya no haga falta el hosting.
   Las direcciones de los mails, Stripe/Mercado Pago (webhooks y vueltas) y Google (login) pasan a `amoinvitar.com`:
   actualizarlas en cada servicio el mismo día.
8. **Tienda vieja** (`/store`, WordPress): sigue en Hostinger hasta que se apague; `/store` y `/tienda` ya redirigen a
   `/crear-invitacion`. Los `/store/producto/…` que queden enlazados se pueden redirigir a la página del evento.

## La web nueva, de a una página

- Copiar la página a `public/sitio/` (por ejemplo `public/sitio/bodas.html`) y cambiar lo que haga falta.
- Las rutas a sus estilos y scripts nuevos: `/web/…` (ver la regla de arriba). Los del sitio viejo se pueden seguir
  usando desde la página nueva (siguen en el bucket), pero no hay que reemplazarlos.
- La elección de modelos y "Personalizar" ya están hechas: `js/crear-invitacion_v1.0.js` (con `data-evento` o
  `data-eventos`) arma las pestañas con el catálogo de la app y abre el panel.
- La primera en pasar conviene que sea `crear-invitacion.html` (con su `/crear-invitacion-para-<evento>`).
