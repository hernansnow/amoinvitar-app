# Web nueva (etapa 2)

Las páginas de la web nueva se generan con `npm run sitio` en `t/<clave de texto>/` y el Worker las sirve en la raíz
(`/bodas`) y en cada carpeta de país (`/es/bodas`, `/ar/bodas`…). Ver `docs/etapa-2-web.md`, sección 10.

**Antes de crear o cambiar páginas, leer `docs/etapa-2-web.md`.** Resumen:

- Tienen prioridad sobre las del sitio viejo con la misma ruta: se reemplazan de a una.
- Css, js e imágenes propios en `web/` (se ven en `/web/…`), nunca con nombres del sitio viejo (`/css/snow_v3.6.css`…).
- Nada en carpetas de clientes (`/boda/`, `/15/`, `/evento/`, `/nuevos-*`, `/mi-*`…) ni en rutas de la app
  (`/panel`, `/tienda`, `/api`, `/modelos`, `/comun`…).
- Rutas absolutas (`/web/css/…`).
- Elegir modelo y "Personalizar": `web/js/crear-invitacion.js` (ejemplo: `crear-invitacion.html`).
- Contacto: `<form data-contacto>` + `/comun/js/contacto.js` (ver ese archivo).
- En `app.amoinvitar.com` está oculta: se ve con `?vista=<SITIO_CLAVE>`. En la compu (`npm run local`), siempre.

Este archivo no se publica (`public/.assetsignore`).
