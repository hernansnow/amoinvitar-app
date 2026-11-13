# Conexión Amo Invitar! ⇄ Albunear (README ronda 52)

Los dos Workers están en la misma cuenta de Cloudflare y se hablan por **service binding** (sin claves compartidas):

| Desde | Enlace | Puerta (entrypoint `Socios`) |
|---|---|---|
| amoinvitar-app | `ALBUNEAR` (wrangler.jsonc) | `albunear/src/socios.js` |
| albunear | `AMOINVITAR` (wrangler.jsonc de Albunear) | `src/socios.js` (este repo) |

## Invitación Deluxe → álbum Classic de Albunear incluido
- Panel → Administración → Álbum: «Crear el álbum Classic» / «Abrir el panel de Albunear» (`POST /api/panel/:id/albunear`).
- Solo con la cuenta del dueño iniciada (el link del panel solo no alcanza). Si no, lo manda a `/entrar` y vuelve al panel.
- Albunear (`crearAlbum`) crea el álbum una sola vez con el código de regalo de la invitación: tipo de evento, nombres,
  fecha y el estilo que combina con el modelo (`ALBUNEAR_TEMA` en `src/motor/datos.js`), plan Classic con los diseños
  Platinum. Devuelve un link de acceso de un solo uso (15 min) que entra directo a su panel. Platinum: paga la diferencia.
- El link del álbum pasa solo a la invitación (sección «Álbum de fotos QR», reemplaza Instagram Wall).

## Álbum Platinum → invitación Basic de Amo Invitar! incluida
- Panel de Albunear → pestaña Invitaciones: «Crear mi invitación» / «Ir a mi invitación» (`/api/events/:id/invitacion`).
- Solo el dueño del álbum y con el álbum Platinum activo. «Otro» evento: elige baby shower, revelación, Navidad,
  cumpleaños o infantil. Corporativo no (en Amo Invitar! es siempre a medida: WhatsApp).
- Amo Invitar! (`invitacion`) crea el borrador una sola vez por álbum (`app_state['albunear_inv:<álbum>']`) con el plan
  Basic ya pagado (`paquete: 'basic'`, `datos.vinculo`): elige y cambia el modelo hasta publicar, publica sin pagar y si
  suma secciones de Premium/Deluxe o complementos paga solo la diferencia. Nombres y fecha fijos (`FIJOS_VINCULO`).
- Devuelve un link de acceso de un solo uso que entra con la cuenta del mail del álbum y abre el panel.

## Probar en la compu
- `npm run local` simula Albunear (`crearAlbum`) y expone `POST /__socios?m=invitacion|estadoInvitacion` para probar la
  puerta de este lado.

## Ronda 55 · País, idioma y Sweet 16
- **Enlaces a Albunear por país** (`conAlbunear` en `src/sitio/nuevo.js`): en cada sede, `albunear.com/#precios`, `/demo` y el enlace
  a la portada van a la carpeta del país (`/ar/`, `/mx/`, `/us/`, `/ca/`…; `/en/` en la internacional). AT y SV (que Albunear no
  tiene) y la raíz neutra quedan sin carpeta: allá se detecta solo.
- **Demo del álbum con la variante completa:** `lang=es-ar|pt-br|en-gb…` (antes solo dos letras). Albunear las entiende todas.
- **Sweet 16:** el álbum Sweet 16 de Albunear (solo EE. UU. y Canadá) llama `invitacion({ tipo: 'quince', sweet16: true })` y queda
  una invitación de 15 con `datos.sweet16` (textos de Sweet 16). Al revés, una invitación de 15 con `datos.sweet16` crea su álbum
  de tipo `sweet16` (`crearAlbum`).
- Pendiente: moneda del cliente en `crearAlbum` (Albunear la toma de su país) y baby shower, revelación y Navidad como tipos propios.
