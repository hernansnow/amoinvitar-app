# Instalación en Cloudflare hecha por Claude (con la clave temporal)

Requisitos en el entorno de Claude Code:
- Variable `CLOUDFLARE_API_TOKEN` (token temporal, 7 días) con permisos de cuenta *Workers Scripts: Edit*,
  *D1: Edit*, *Workers R2 Storage: Edit*, *Account Settings: Read* y de zona (solo amoinvitar.com)
  *Workers Routes: Edit*, *DNS: Edit*, *Zone: Read*.
- `api.cloudflare.com` en los dominios permitidos de la red.

Pasos (en la rama `claude/login-tienda`, o en `main` si ya se unieron los PR):

1. `npx wrangler whoami` → anotar el Account ID; si hay varias cuentas, fijar `CLOUDFLARE_ACCOUNT_ID`.
2. Revisar sin tocar: Workers existentes y sus rutas en amoinvitar.com, y que no exista el registro DNS `app`.
3. `npx wrangler r2 bucket create amoinvitar-media` (si R2 no está activado, pedirle al usuario que lo active con su tarjeta).
4. `npx wrangler d1 create amoinvitar` → poner el `database_id` en `wrangler.jsonc`.
5. Agregar en `wrangler.jsonc`: `"routes": [{ "pattern": "app.amoinvitar.com", "custom_domain": true }]`.
6. Secretos propios (generados al azar, nunca mostrados): `SECRETO_ACCESO`, `ADMIN_CLAVE` con `wrangler secret put`.
   `PREVIEW_KEY` (texto) para dejarlo cerrado al público; pasarle la palabra al usuario.
7. `npm run deploy` (aplica `migrations/` y publica).
8. Probar: `/demo/garden`, página de "Muy pronto", `?preview=…`, `/tienda/` y una compra con cupón del 100 %
   (`INSERT INTO cupones …` con `wrangler d1 execute amoinvitar --remote --command`).
9. Subir los cambios de `wrangler.jsonc`. Recordarle al usuario: cargar las claves de Resend, Google,
   Stripe, PayPal y Mercado Pago (pasos 8 a 12 de `docs/cloudflare.md`) y borrar el token cuando terminemos.
