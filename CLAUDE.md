# Amo Invitar · guía para trabajar en este repo

App de invitaciones digitales en un Worker de Cloudflare (D1 + R2 + assets en `public/`). El cliente elige el modelo,
lo personaliza en el panel y paga al publicar. Ver `README.md` (carpetas y cómo probar) y `docs/`.

## Antes de tocar algo
- **Web nueva (etapa 2)**: leer `docs/etapa-2-web.md` antes de crear páginas. Van en `public/sitio/` (se ven en la
  raíz), con sus archivos propios en `public/sitio/web/`. Está oculta en `app.amoinvitar.com` (`?vista=<SITIO_CLAVE>`).
- **No pisar lo viejo**: las invitaciones de clientes del sistema anterior (`/boda/`, `/15/`, `/evento/`,
  `/nuevos-*`, `/mi-*`…), sus paneles (`panel.amoinvitar.com`) y los css/js viejos (`/css/snow_*.css`, `/js/*`, `/img/*`)
  siguen online. No crear archivos con esas rutas ni esos nombres.
- **Rutas de la app** (`/panel`, `/tienda`, `/api`, `/modelos`, `/comun`, `/mi-cuenta`, `/entrar`, `/demo`, `/std`…)
  van primero; la web nueva no las usa.

## Probar
- `npm run local` → http://localhost:8787 (base en memoria: se borra al reiniciar; reiniciar después de cambiar `src/`).
  La web nueva se ve sin clave en la compu.
- Verificar con `node --check` los JS tocados.

## Convenciones
- Textos para clientes (panel, web, mails): español neutro (tú/ustedes, celular, computadora).
- Comentarios en el código: en español, cortos; los cambios pedidos llevan `README (ronda N)`.
- Mensajes de commit en español, describiendo lo que cambia para el usuario.
- No escribir claves ni secretos en el repo (van con `npx wrangler secret put …`).
- Publicar: `npx wrangler deploy` (con `CLOUDFLARE_ACCOUNT_ID`); las migraciones de D1 (`migrations/`) se aplican con
  `npx wrangler d1 migrations apply amoinvitar --remote`. Después, purgar la caché de Cloudflare.

## Mapa rápido
| Qué | Dónde |
|---|---|
| Rutas y páginas del Worker | `src/index.js` |
| Esquema del panel (pasos, campos, planes, complementos) | `src/panel/esquemas.js` |
| Panel (cliente) | `public/panel/panel.js`, `admin.js`, `tarjeta.js` |
| Tienda, catálogo público, empezar/cotizar/comprar | `src/rutas/tienda.js`, `public/tienda/` |
| Planes, precios, extras | `src/catalogo.js` |
| Modelos y eventos | `src/modelos.js`, `public/modelos/<modelo>/` |
| Caducidad por plan | `src/vencimiento.js` |
| Contacto (formulario único) | `src/rutas/contacto.js`, `public/comun/js/contacto.js` |
| Web nueva / sitio viejo | `src/sitio/nuevo.js`, `src/sitio/legado.js`, `public/sitio/` |
| Países, idiomas, variantes del español, hreflang | `src/sitio/variantes.js`, `scripts/sitio/variantes.mjs`, `scripts/sitio/i18n/`, `docs/etapa-2-web.md` §10 |
| Elegir modelo + Personalizar (para las páginas) | `public/sitio/web/js/crear-invitacion.js` |
| Páginas de la web nueva (se generan: `npm run sitio`) | `scripts/sitio/contenido.mjs`, `scripts/sitio/construir.mjs` |
| Profesionales: tablero, créditos, marca, equipo | `src/rutas/empresa.js`, `src/pro/`, `public/empresa/`, `docs/empresas.md` |
| Consola de administración | `src/rutas/superadmin.js`, `src/rutas/consola.js`, `public/admin/index.html` |
