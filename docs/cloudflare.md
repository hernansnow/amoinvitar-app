# Poner Amo Invitar 2.0 en Cloudflare · paso a paso

## Antes de empezar: ¿sirve la cuenta que ya tenés?

**Sí, usá la misma cuenta.** No es un problema que ya maneje los Workers, las reglas y el DNS de
amoinvitar.com para la web de Hostinger:

- El sistema nuevo es **otro Worker** (`amoinvitar-app`), con su base y su almacenamiento propios.
  No toca los Workers ni las reglas que ya tenés.
- Arranca en un **subdominio propio**: `app.amoinvitar.com`. La web de siempre (amoinvitar.com,
  las invitaciones de Hostinger, los mails) sigue exactamente igual.
- Si alguien entra a una dirección del sitio viejo desde `app.amoinvitar.com` (por ejemplo
  `/precios`), el Worker lo manda a `amoinvitar.com/precios`.
- Mientras probás, el **modo "Próximamente"** deja la tienda cerrada al público (paso 6).

Más adelante, cuando todo esté probado, decidimos si las invitaciones nuevas se ven en
`amoinvitar.com/boda/…` o se quedan en el subdominio. Ese cambio se hace con una ruta del Worker y
no requiere mover nada de Hostinger.

**Tres cosas para revisar en la cuenta antes de seguir:**

1. **DNS → Records**: que no exista ya un registro llamado `app`. Si existe, avisame y usamos otro
   nombre (por ejemplo `invitaciones`). El registro lo crea Cloudflare solo en el paso 7; no lo
   crees a mano.
2. **Workers & Pages → (tu Worker actual) → Settings → Domains & Routes**: anotá qué rutas tiene.
   Si alguna es del tipo `*amoinvitar.com/*` (con asterisco adelante), también abarcaría al
   subdominio. El dominio propio del paso 7 tiene prioridad sobre las rutas, así que no debería
   molestar, pero pasame cuáles son para confirmarlo.
3. **Plan de Workers**: en *Workers & Pages → Plans*. Si está en el plan gratis, conviene pasar a
   **Workers Paid (5 USD por mes)**. El plan gratis corta cada pedido a los 10 ms de procesador y
   armar una invitación puede tardar más. Si Albunear ya está en esta cuenta con el plan pago, ya
   está cubierto.

---

## 1. Unir los cambios en GitHub

Cloudflare publica lo que está en la rama `main` del repositorio `hernansnow/amoinvitar-app`.

1. En GitHub, abrí el PR **#1 (Panel)** → **Merge pull request** → **Confirm merge**.
2. Abrí el PR **#2 (Login y tienda)**. Ahora apunta a `main` → **Merge pull request** → **Confirm**.

(Si preferís, te los uno yo: decime "uní los PR".)

## 2. Almacenamiento de fotos y música (R2)

1. Cloudflare → menú izquierdo **Storage & Databases → R2 Object Storage**.
2. Si es la primera vez, **Purchase R2 Plan** (pide una tarjeta, pero los primeros 10 GB por mes
   son gratis y no se cobra nada si no se superan).
3. **Create bucket**:
   - *Bucket name*: `amoinvitar-media` (exactamente así)
   - *Location*: Automatic
   - **Create bucket**.

## 3. Base de datos (D1)

1. **Storage & Databases → D1 SQL Database → Create Database**.
2. *Name*: `amoinvitar` (exactamente así) → **Create**.
3. En la página de la base, copiá el **Database ID** (algo como `fb7c299e-cbc6-4b8a-…`).
4. **Pasámelo por acá.** Lo pongo en `wrangler.jsonc` y lo subo. No es un dato secreto.

Las tablas no hay que crearlas: se crean solas en cada publicación (carpeta `migrations/`).

## 4. Crear el Worker conectado a GitHub

Esperá a que te confirme que subí el Database ID.

1. **Workers & Pages → Create → Import a repository** (o *Connect to Git*).
2. **Connect GitHub**. Autorizá la app de Cloudflare para el repositorio
   `hernansnow/amoinvitar-app` (con acceso solo a ese repositorio alcanza).
3. Elegí `amoinvitar-app` y completá:
   - *Project name*: `amoinvitar-app` (tiene que ser igual al de `wrangler.jsonc`)
   - *Production branch*: `main`
   - *Build command*: dejalo vacío
   - *Deploy command*: `npm run deploy`
   - *Root directory*: dejalo vacío (`/`)
4. **Save and Deploy**. La primera vez tarda 1 o 2 minutos. En el registro de la publicación
   tenés que ver que aplica `0001_inicial.sql` y después `Deployed amoinvitar-app`.

**Si falla con un error de permisos de D1**: *Settings → Build → API token* → editá el token y
sumale el permiso **D1 → Edit**. Después *Deployments → Retry deployment*.

Desde ahora, cada cambio que se une a `main` en GitHub se publica solo.

## 5. Claves y datos (Variables and Secrets)

En **Workers & Pages → amoinvitar-app → Settings → Variables and Secrets → Add**.

Cargá cada uno con su **tipo**. Los **Secret** quedan ocultos y ni siquiera vos los volvés a ver;
los **Text** se ven. Después de cargar todos, **Deploy**.

**Ya mismo** (para poder probar):

| Nombre | Tipo | Qué poner |
|---|---|---|
| `SECRETO_ACCESO` | Secret | un texto largo al azar (40 caracteres o más, de un generador de contraseñas) |
| `ADMIN_CLAVE` | Secret | otro texto largo al azar, distinto |
| `ADMINS` | Text | tu mail (con ese mail entrás como administrador) |
| `PREVIEW_KEY` | Text | una palabra para entrar mientras está cerrado al público, por ejemplo `garden2027` |
| `INVOICE_NAME` | Text | tu nombre fiscal (el mismo que en Albunear) |
| `INVOICE_TAX_ID` | Text | tu NIF |
| `INVOICE_ADDRESS` | Text | tu domicilio fiscal |
| `TRANSFER_EUR` | Text | `Titular: … \| Banco: … \| IBAN: ES00 …` (las líneas se separan con ` \| `) |
| `TRANSFER_ARS` | Text | `Titular: … \| CUIT: … \| Alias: … \| CBU: …` |
| `TRANSFER_UYU` | Text | si tenés cuenta en Uruguay (si no, no lo cargues) |

**Los de cada servicio**: se cargan en los pasos 8 a 12.

## 6. Modo "Próximamente"

Con `PREVIEW_KEY` cargada, quien entra a `app.amoinvitar.com` ve una página de "Muy pronto" y
Google no indexa nada. Las demos, las invitaciones publicadas y los avisos de pago siguen andando.

- **Para entrar vos**: abrí una vez por navegador `https://app.amoinvitar.com/?preview=garden2027`
  (con tu palabra). Queda recordado 90 días.
- **Para salir**: `?preview=salir`.
- **Para abrir al público**: borrá `PREVIEW_KEY` (o dejala vacía) y **Deploy**.

## 7. El dominio app.amoinvitar.com

1. **Workers & Pages → amoinvitar-app → Settings → Domains & Routes → Add → Custom domain**.
2. Escribí `app.amoinvitar.com` → **Add domain**.
3. Cloudflare crea solo el registro DNS y el certificado. Tarda entre 1 y 10 minutos.
4. Probá: `https://app.amoinvitar.com/demo/garden` tiene que mostrar la demo de Garden.

No toques los registros de `amoinvitar.com`, `www` ni los del correo (MX). Siguen apuntando a
Hostinger.

## 8. Mails (Resend)

Si usás la cuenta de Resend de Albunear, sirve la misma.

1. **resend.com → Domains → Add Domain** → `amoinvitar.com` → región *Ireland (eu-west-1)*.
2. Resend muestra 3 o 4 registros: un **MX** y un **TXT** en `send`, y un **TXT** en
   `resend._domainkey`. Tenés dos formas de cargarlos:
   - **Más fácil**: botón **Sign in to Cloudflare / Auto configure**, si aparece.
   - **A mano**: en Cloudflare → **DNS → Records → Add record**, uno por uno, con la nube en
     **gris (DNS only)**.
3. Estos registros van en el subdominio `send`, así que **no pisan el correo de Hostinger**. No
   borres ni cambies el MX ni el SPF que ya tiene amoinvitar.com.
4. En Resend → **Verify DNS records**. Esperá a que diga *Verified*.
5. **API Keys → Create API Key** → *Name*: `amoinvitar-app`, *Permission*: Sending access,
   *Domain*: amoinvitar.com → copiá la clave.
6. En Cloudflare cargá **`RESEND_API_KEY`** (Secret) con esa clave.

Los mails salen como `Amo Invitar <hola@amoinvitar.com>`. Si preferís otra dirección, decime y
cambio `MAIL_FROM`.

## 9. Entrar con Google

1. **console.cloud.google.com**. Podés usar el mismo proyecto de Albunear o crear uno nuevo,
   "Amo Invitar".
2. **APIs & Services → OAuth consent screen** (o *Google Auth Platform → Branding*):
   - *App name*: `Amo Invitar`
   - *User support email*: tu mail
   - Logo (opcional)
   - *Authorized domains*: `amoinvitar.com`
   - Guardar. En *Audience*, si dice *Testing*, poné **Publish app**.
3. **Credentials** (o *Clients*) → **Create credentials → OAuth client ID**:
   - *Application type*: **Web application**
   - *Name*: `amoinvitar-app`
   - *Authorized redirect URIs* → **Add URI**: `https://app.amoinvitar.com/auth/google/vuelta`
   - **Create**.
4. Copiá el *Client ID* y el *Client secret*. Cargalos en Cloudflare como **`GOOGLE_CLIENT_ID`** y
   **`GOOGLE_CLIENT_SECRET`** (los dos Secret).

## 10. Tarjetas (Stripe)

Podés usar la misma cuenta de Stripe de Albunear: la página de pago sale igual con el nombre y el
logo de Amo Invitar.

1. **dashboard.stripe.com → Developers → API keys** → *Secret key* (en modo **live**) → cargala
   como **`STRIPE_SECRET_KEY`** (Secret).
2. **Developers → Webhooks → Add endpoint**:
   - *Endpoint URL*: `https://app.amoinvitar.com/api/stripe/webhook`
   - *Events*: `checkout.session.completed` y `checkout.session.async_payment_succeeded`
   - **Add endpoint**.
   - Después, en el endpoint → *Signing secret* → **Reveal** → cargalo como
     **`STRIPE_WEBHOOK_SECRET`** (Secret).
3. **IVA en el recibo**: en *Product catalog → Tax rates* usá la tasa **IVA 21 % (inclusive)**
   que ya tenés de Albunear, o creala (*Percentage* 21, *Inclusive*, país España). Copiá su id
   (`txr_…`) y cargalo como **`STRIPE_TAX_RATE_ES`** (Secret).

## 11. PayPal

1. **developer.paypal.com → Apps & Credentials** → pestaña **Live** → **Create App** →
   `Amo Invitar` (*Merchant*).
2. Copiá *Client ID* y *Secret*. Cargalos como **`PAYPAL_CLIENT_ID`** y
   **`PAYPAL_CLIENT_SECRET`** (Secret).

## 12. Mercado Pago (Argentina)

1. **mercadopago.com.ar/developers → Tus integraciones → Crear aplicación**:
   - Nombre: `Amo Invitar`
   - Solución: **Pagos online → Checkout Pro**
2. En la aplicación → **Credenciales de producción** → copiá el **Access Token**
   (`APP_USR-…`). Cargalo como **`MP_ACCESS_TOKEN`** (Secret).
3. No hace falta configurar el webhook: la dirección de aviso va en cada pago.

## 13. Probar de punta a punta

1. Entrá con `https://app.amoinvitar.com/?preview=TU_PALABRA`.
2. **Cupón del 100 % para probar sin pagar**: Cloudflare → **D1 → amoinvitar → Console**, pegá y
   ejecutá:

   ```sql
   INSERT INTO cupones (codigo, clase, valor, max_usos, nota, creado)
   VALUES ('PRUEBA100', 'porcentaje', 100, 20, 'pruebas', strftime('%s','now'));
   ```

3. `https://app.amoinvitar.com/tienda/` → elegí todo → en *Datos y pago* poné el cupón
   `PRUEBA100` → **Crear la invitación**. Tiene que llegarte el mail con el panel.
4. `https://app.amoinvitar.com/entrar` → entrá con tu mail o con Google → **Mis invitaciones**.
5. **Un pago real chico**: creá otro cupón, por ejemplo del 95 %. Pagá con tarjeta y también con
   Mercado Pago. Tiene que llegar el mail del pedido y el de la **factura**. Después devolvé el
   pago desde Stripe o Mercado Pago.
6. **Facturas del trimestre**: `https://app.amoinvitar.com/admin/facturas?year=2026&q=4`
   (imprimir → PDF) y `…/admin/facturas.csv?year=2026&q=4` (Excel). Tenés que estar dentro con el
   mail de `ADMINS`.

## 14. VeriFactu (cuando toque)

Igual que en Albunear:

- Las facturas ya guardan la huella encadenada oficial.
- La serie es **AI** (`AI2026-00001…`), separada de la **A** de Albunear.
- Para enviarlas a la AEAT hay que cargar el certificado digital como certificado mTLS (los pasos
  están dentro de `wrangler.jsonc`), probar con `VERIFACTU = "test"` y después pasar a `"prod"`.
  Es obligatorio desde el 1/7/2027.
- **Consultalo con tu asesor**: al facturar con el mismo NIF desde dos sistemas (Albunear y Amo
  Invitar), cada uno lleva su propia cadena e instalación. Además, el umbral de 10.000 € de ventas
  a particulares de la UE se suma entre los dos.

## Resumen de lo que me tenés que pasar

1. El **Database ID** de D1 (paso 3).
2. Las **rutas de tu Worker actual** y si ya existía un registro `app` (revisión del principio).
3. Si querés que **una los PR** yo (paso 1).

Las claves secretas **no me las pases por acá**: cargalas vos directo en Cloudflare (paso 5).
