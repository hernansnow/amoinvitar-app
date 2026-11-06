# Precios por país, promociones y «Recuerdo» (ronda 36)

## Descuento por país y promociones (admin → *Precios y promos*)
- **Descuento por país:** tabla editable (país en 2 letras + %). Se descuenta del precio de lista (sin IVA español). Si nunca se guarda,
  rige `DESCUENTO_PAIS` de `src/lib/fx.js`. «Volver a los de siempre» restaura la tabla original.
- **Promociones:** descuento automático por país (vacío = todos), categoría de evento (vacío = todas), plan (vacío = todos los de pago), fechas
  opcionales y activa/inactiva una por una. La mejor promo (mayor %) que aplique se cobra y se suma a un cupón, si lo usan.
  Alcance: invitaciones web con plan de pago (Basic, Premium, Deluxe).
- **En la web:** `/api/tienda/catalogo` devuelve `promos` (con el precio de lista y el precio con promo de cada plan). `sitio.js` tacha el precio de
  lista y muestra el promocional en tarjetas, tabla y portada. En páginas de evento (`<body data-evento>`) valen las promos sin categoría y las de esa
  categoría; en las generales, solo las sin categoría.
- **Dónde se guarda:** `app_state['config_precios']` (JSON: `{ descuentos, promos }`). Se lee con caché de 20 s (`cargarConfig` en `getRates`).
- **Cobro:** `tienda.js → promoDe()` + `opciones()` aplican la promo antes del cupón en `cotizar` y `comprar`.

## Recuerdo (cuando termina el tiempo online)
| Opción | Precio | Qué hace |
|---|---|---|
| PDF | 10 € | `/recuerdo/<id>/pdf`: vista estática (sin scripts) con botón «Guardar como PDF» (Imprimir → Guardar como PDF) |
| Página web | 25 € | `/recuerdo/<id>/web`: ZIP con `index.html` + `assets/` (css, js, imágenes, fuentes incrustadas), funciona sin conexión |
| Online ilimitado | 30 € | `eventos.vence = 2099-12-31` |
- Se compra en la pestaña **Recuerdo** del panel (solo invitaciones publicadas que no son de una empresa). Pedido tipo `recuerdo`
  (`tienda.js → validarRecuerdo`, `cumplirPedido`). Lo comprado queda en `datos.recuerdo`.
- **Mail de aviso** al vencer (30, 7 y 1 día antes; una vez cada uno): `src/recuerdo.js → avisosVencimiento`, tarea diaria.
- **Créditos por vencer** (profesionales): mail al dueño a 30 y 7 días (`src/pro/avisos.js`); con Studio recuerda que renovar el pase extiende los créditos.
- Límite honesto: no hay PDF generado en el servidor (haría falta Browser Rendering); la vista estática se guarda en PDF desde el navegador.
  En el ZIP, las funciones que usan internet (confirmaciones, álbum, mapa) quedan inactivas.

## Pago online de profesionales
Créditos y pase se pagan con tarjeta (Stripe), PayPal o transferencia; en Argentina, Mercado Pago (equivalente en pesos). Se confirma al volver
de la pasarela (`POST /api/empresa/compras/<id>/confirmar`) y por los webhooks (`metadata.compra_pro`, `external_reference` que empieza con `cp_`).
Los reembolsos siguen siendo manuales (se anotan desde /admin).

## Probar en la compu
`npm run local` y: `/__tareas` corre las tareas diarias; `/__mails` muestra los últimos mails «enviados».
