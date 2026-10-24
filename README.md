# Amo Invitar 2.0 · piloto (modelo Garden)

Invitaciones armadas por un Worker de Cloudflare: el cliente carga sus datos
en el panel y el Worker llena el diseño del modelo al abrir la invitación.

## Probar en la compu

```
npm install
npm run local
```

Al arrancar muestra dos links: la demo y un **panel de prueba** con un evento
recién creado (todo se guarda en memoria mientras corre).

- http://localhost:8787/demo/garden — demo (idioma según el país; local = neutro)
- `?evento=boda|15|bautismo|comunion|cumple`
- `&paquete=basic|premium|deluxe`
- `&pais=AR|ES|MX|CR|GB…` (o `&idioma=es-ar|es|es-cr|es-es|en`)

## Carpetas

| Carpeta | Qué hay |
|---|---|
| `public/comun/` | CSS, JS, fuentes e imágenes que comparten todos los modelos |
| `public/modelos/<modelo>/index.html` | el diseño Deluxe (se puede abrir y editar en Dreamweaver) |
| `public/modelos/<modelo>/index-premium.html` · `index-basic.html` | el diseño de cada paquete, en su propio archivo |
| `public/modelos/<modelo>/tema.css` | paleta y fuentes del modelo |
| `public/modelos/<modelo>/estilo.css` | estilos del modelo (se arma con `npm run estilos -- <modelo>`) |
| `public/modelos/<modelo>/modelo.json` | qué secciones trae cada paquete, colores del sobre, fotos de la demo |
| `public/modelos/<modelo>/img/`, `demo/<tipo>/` | imágenes del modelo y fotos de la demo por tipo de evento |
| `src/textos/` | textos por idioma y por tipo de evento |
| `src/motor/` | `datos.js` arma los datos; `render.js` los pone en el HTML |
| `src/componentes/` | bloques comunes: sobre, acceso con PIN, formulario RSVP, canciones, álbum |
| `src/catalogo.js` | precios (EUR), extras, modelos del plan gratis |
| `src/panel/esquemas.js` | pasos y campos del panel para cada producto (invitación, Save The Date, a medida) |
| `public/panel/` | el panel del cliente (se arma solo con el esquema) |
| `src/acceso.js` | seguridad: abierta, link personal o PIN (decidida en el servidor) |
| `src/almacen.js` | base (D1) y archivos (R2); versión en memoria para probar |
| `docs/empresas.md` | propuesta para wedding planners, salones, fotógrafos y agencias |
| `migrations/` | tablas de la base (D1); se aplican solas al publicar |
| `docs/cloudflare.md` | guía paso a paso para publicar en Cloudflare |

## Marcas del HTML del modelo

| Marca | Qué hace |
|---|---|
| `data-campo="ruta"` / `data-campo-html` | pone un dato del evento (texto / con formato) |
| `data-t="clave"` / `data-t-html` | pone un texto del idioma |
| `data-attr="attr:c:ruta; attr:t:clave"` | llena atributos con datos (`c`) o textos (`t`) |
| `data-bg="ruta"` | cambia la foto de fondo del `style` |
| `data-seccion="x"` | sección que depende del paquete o que el cliente apaga |
| `data-si="ruta"` / `data-no="ruta"` | se muestra solo si el dato existe / no existe |
| `data-repetir="ruta"` | se repite por cada ítem; dentro: `data-i`, `data-i-attr="src:url"`, `data-i-bg`, `data-i-pos`, `{n}` |
| `data-agendar="ceremonia\|celebracion"` | botón de calendario |
| `data-componente="sobre\|acceso\|rsvp-form\|canciones\|album-qr"` | bloque común |

Los ítems de muestra seguidos de un `data-repetir` se usan en rueda: así el
itinerario sigue alternando izquierda y derecha.

## Seguridad de la invitación

El cliente elige en el panel:

| Opción | Qué pasa |
|---|---|
| Cualquiera con el link | sin seguridad |
| Solo con link personal | cada invitado recibe `…/boda/sofi-y-ale?inv=juan-rodriguez-fpzv`; sin eso, pantalla de bloqueo |
| Con PIN | uno para todos o uno por invitado; se pide antes de mostrar nada |

**Con la lista de invitados prendida la invitación es de LISTA CERRADA** (aunque el modo sea
"cualquiera con el link"): solo se entra con `?inv=<código>` de la lista, y además el PIN si hay.
Sin lista: abierta o un PIN para todos. El dueño entra siempre por `/acceso/<id>/dueno?k=<clave>`
(o con la sesión): cookie `@dueno`, sus RSVP quedan con `prueba: 1` y se pueden borrar en Administración.
La vista previa del panel (`/vista/<id>`) lleva `INVITACION_CONFIG.prueba`: el RSVP se recorre entero pero no se manda;
con lista muestra al primer invitado (o uno de ejemplo). La fila del invitado (nombre, pases, mesa) va en
`INVITACION_CONFIG.invitado` (ya no hace falta pedir el CSV). Pantalla de acceso: `src/componentes/puerta.js`
(diseño de `demo/lovestory/lista-de-invitados-sep26.html` de la v2.0).

La decisión es del servidor: quien no tiene permiso no recibe el HTML de la
invitación (ni fotos, ni lugares), solo la pantalla de acceso con los nombres.
Al entrar bien queda una cookie firmada por 90 días. La lista de invitados ya
no se descarga entera: cada invitado recibe solo su fila, sin el PIN. Los
intentos de PIN tienen un límite por minuto.

## Cuenta y tienda

| Página | Qué hace |
|---|---|
| `/tienda/` | elegir producto, tipo de evento, diseño, paquete y extras; pagar |
| `/tienda/gracias` | confirma el pago al volver de la pasarela y abre el panel |
| `/tienda/?mejorar=<evento>&a=deluxe` | pasar a un paquete mayor pagando la diferencia |
| `/entrar` | entrar con Google o con un link por mail (sin contraseña) |
| `/mi-cuenta` | las invitaciones de la cuenta, con acceso al panel |

- Precios de lista en euros (`src/catalogo.js`), cobrados en la moneda del visitante con cotización del día y redondeo comercial. `PRICE_OVERRIDES` en `src/lib/fx.js` fija precios por moneda.
- Medios: Mercado Pago y transferencia en Argentina; tarjeta (Stripe) y PayPal en el resto; transferencia en Uruguay y la zona euro si hay cuenta cargada (`TRANSFER_EUR`, `TRANSFER_ARS`, `TRANSFER_UYU`).
- IVA como en Albunear: a los clientes de la UE se les suma el 21 % al precio de lista (redondo, con la leyenda "IVA incluido"); el resto del mundo paga el precio de lista. Empresas de otro país de la UE con n.º de IVA válido en VIES: sin IVA (inversión del sujeto pasivo).
- Facturas propias en cada cobro (serie AI, huella VeriFactu encadenada), copiadas de Albunear: el cliente recibe el link; en `/admin/facturas` y `/admin/facturas.csv` están el PDF y el libro del trimestre.
- Al cobrar se crea el evento, la cuenta del cliente (por su mail) y se manda el mail con el acceso al panel.
- Transferencia: el evento se crea enseguida para ir cargando, pero se publica cuando se marca como cobrado (`POST /api/admin/pedidos/<id>/cobrado`, con sesión de administrador o `x-admin`).
- Cupones: tabla `cupones` (porcentaje o monto fijo en euros, por paquete, con vencimiento y usos).
- En `npm run local` los pagos se dan por aprobados y los mails se muestran en la consola; el link de entrar aparece en la pantalla.

## Pendiente

Reorganizar la tienda, administración de cupones y pedidos,
tablero de empresas (un wedding planner / fotógrafo con marca blanca administra varios eventos a la vez desde su panel: ver la nota en `docs/empresas.md`), modelos de Save The Date web, vencimientos de los planes
pagos, descargas, envíos y recordatorios.

## Un archivo por paquete (regla para todos los modelos)

Cada modelo lleva **tres diseños**, uno por paquete, igual que las plantillas originales
(`garden-basic.html`, `garden-premium.html`, `garden-deluxe.html`):

- `index.html` → Deluxe
- `index-premium.html` → Premium
- `index-basic.html` → Basic (y el plan gratis)

**De dónde salen:** de las demos publicadas, `ar/<modelo>/index.html` (Deluxe), `ar/<modelo>/premium.html`
y `ar/<modelo>/basic.html`. Las copias de las carpetas `boda/++base-*` están desactualizadas.
Después de agregar o cambiar un diseño: `REPO_VIEJO=../amoinvitar-v2.0 npm run estilos -- <modelo>`
(el CSS se arma mirando los tres archivos).

No se arma el Basic "sacándole cosas" al Deluxe: cada paquete tiene su propio diseño (por ejemplo
Garden Basic tiene una sola foto de portada, el saludo de bienvenida en lugar de la historia y el
RSVP sin foto; Premium usa hashtag de Instagram en lugar del álbum QR). Si falta el archivo de un
paquete, se usa `index.html`. Las secciones que un paquete no trae se apagan además con
`data-seccion` y la lista `secciones` de `modelo.json`.


## modelo.json: opciones del panel (ronda 4)

- `paleta`: los 4 colores del diseño. En Diseño → "Quiero otros colores" aparecen ya cargados para cambiarlos.
- `galeria.enRsvp: true`: modelos con la galería dentro de la confirmación. No se muestra "Cómo se muestran"
  (carrusel, mosaico, grilla, polaroids) porque la galería no es una sección propia.
- `galeria.byn: true`: solo Romantic y B&N (css byn, fotos en blanco y negro). Suma la casilla
  "Mostrar las fotos en color". Al convertir esos modelos, la clase `ai-color` tiene que sacar el filtro.
- `videoPortada: true`: modelos con video en la portada. El panel deja subir un MP4 de hasta 30 s.
  En pantallas horizontales, un video vertical va al centro con una copia desenfocada de fondo.
- La galería que no es carrusel la arma el componente común `data-componente="galeria"`
  (comun/css/galeria.css): el modelo solo marca su carrusel con `data-si="galeria.carrusel"`.

## Administración (panel)

`public/panel/admin.js`: resumen con cuenta regresiva, envío (WhatsApp, link, QR; links personales con la lista),
respuestas (colores, filtros, búsqueda, recordatorios, Excel/PDF), mensajes, canciones (acceso a Spotify), mesas con
croquis y Albunear. Los textos de WhatsApp y los asientos por mesa se guardan en `datos.admin` (POST /api/panel/:id/admin).
- El menú no se redibuja al cambiar de pestaña (no pierde el deslizamiento en el celular) y tiene la flecha › al borde.
- Mesas: arrastrar invitados entre mesas (pointer events, funciona con el dedo) o a "+ Mesa nueva". Croquis 2 mesas por fila
  en el celular, 3 al imprimir.
- **Buscá tu mesa**: `/mesa/<id>` (página) y `GET /api/mesa?e=&q=` (≥3 letras, máx. 6 resultados, también acompañantes
  confirmados). Solo si `datos.admin.buscaMesa`; QR para la entrada desde Mesas.
- Con lista cerrada, Enviar no muestra el envío general: solo los links personales, "Ver" como cada invitado y "Editar lista".
- Respuestas: Excel y PDF con la casilla "Solo confirmados".
- Spotify: la API ya no sirve para esto (desde 2026 el modo desarrollo admite 5 usuarios en una lista blanca y la cuota
  ampliada pide empresa con 250.000 usuarios activos). Se usa "Copiar y abrir TuneMyMusic" (pegar texto → Spotify).

## Lista de invitados (ronda 11)

Migración `0002_invitados_extra.sql` (columnas nuevas en `invitados`): `integrantes`, `telefono`, `abierto`, `ultima`,
`visitas`, `llego`, `llegaron`. **Aplicarla en la base remota antes de publicar el código**:
`npx wrangler d1 migrations apply amoinvitar --remote`.
- **Familias**: `integrantes` ("Juan, Ana"). El RSVP pregunta "¿Quiénes van?" con Va / No va por integrante y manda
  `asisten`, `no_asisten` y `personas` (el aforo y la administración cuentan `personas` cuando está).
- **Aperturas**: cada vez que el invitado entra con su link (no el dueño) suma `visitas`, `abierto` (primera) y `ultima`.
  Enviar muestra "Lo abrió (n)" / "No lo abrió" con filtros; los recordatorios ponen primero a los que no lo abrieron.
- **Cambiar la respuesta**: `INVITACION_CONFIG.invitado.respuesta` trae su última respuesta (solo la suya); el modal
  muestra el resumen y "Cambiar mi respuesta" (precargada). Vale la última.
- **Contactos**: Contact Picker API (Android/Chrome) o archivo .vcf (`leerVcf` en `planilla.js`). WhatsApp directo con
  `wa.me/<número>` si hay teléfono.
- **Llegadas (check-in)**: `datos.admin.checkin` muestra "Mi pase de entrada" (QR del link personal) a quien confirmó.
  Recepción: `/puerta/<id>?t=<token>` (token = HMAC del id + clave del panel; se renueva si cambia la clave),
  `GET/POST /api/puerta`. Lector: BarcodeDetector o `comun/js/jsqr.min.js` (jsQR 1.4.0, Apache-2.0) en el iPhone.

## Envío en tanda y avisos (ronda 12)

- Migración `0003_invitados_envios.sql`: `enviado` y `recordado` en `invitados`.
- "Enviar a todos" / "Recordar a todos" (`enviarEnTanda` en admin.js): un `wa.me` por invitado, uno tras otro, desde el
  WhatsApp del cliente (no hay envío automático: WhatsApp no lo permite desde una web, y la API oficial manda desde
  nuestro número, cobra por mensaje y pide consentimiento previo). Cada uno se marca con `POST /api/panel/:id/enviado`.
- Aviso por mail a los dueños 7, 3 y 1 día antes de `rsvp.cierre` si hay invitados de la lista sin responder
  (`src/avisos.js`, en la tarea diaria de las 4:00 UTC). Se apaga con `datos.admin.avisosMail = false`.

## Accesos y páginas sueltas (ronda 13)

- **Idioma y seguridad** va justo antes de **Lista de invitados** (el PIN y el link personal dependen de la lista).
- **Accesos** (Administración → Accesos): titular (`cliente`, quien compró) + `pareja` (1, solo bodas) + hasta 3 `admin`
  (wedding planner, organizador…). `GET/POST/DELETE /api/panel/:id/accesos`; los cambian el titular, la pareja o quien
  tiene la clave del panel. Al sumar a alguien le llega un mail (`mailNuevoAcceso`) para entrar con su mail o Google.
- **Pantalla de acceso (PIN / bloqueo) y "Buscá tu mesa" con la tipografía de la invitación**: cargan las fuentes del
  modelo y su `tema.css` (`estilosModelo()` en index.js) y usan `--fuente-titulos` (los nombres, en `--color-principal`)
  y `--fuente-texto`. **Regla para todos los modelos**: tener `tema.css` con esas variables y `tarjetas.fuentes.css`
  en modelo.json, o fijar `"acceso": { "css": [...] }` en modelo.json.

## Reglas para convertir los demás modelos (ronda 5, 6 y 7)

- **Cuenta regresiva** (switch en Portada): en Premium y Deluxe la portada con cuenta va con `data-si="cuenta.portada"` y,
  justo después, la portada del Basic del mismo modelo con `data-no="cuenta.portada"` (se copia tal cual de `index-basic.html`).
- **Tarjetas con foto** (Save The Date): no dependen del modelo; están en `public/comun/tarjetas/foto/catalogo.json`
  (fondos con el hueco transparente, muestra para elegir y versión para dos nombres o uno). Faltan los diseños 5, 7 y 8:
  vinieron con los textos puestos, hacen falta los fondos limpios. Al diseño 3 en 15 años le falta el adorno de la tiara.
- **Tarjeta Save The Date de cada modelo**: los fondos limpios y las versiones terminadas de todos los modelos están en
  el material que mandó Hernán (std tarjeta). Al convertir cada modelo: fondo en `img/std-fondo.jpg`, el adorno de cada
  evento como capa con `tipos`, y los textos medidos contra la versión terminada. "Próximamente la invitación formal"
  va con `"opcional": "proximamente"` (el cliente lo prende o apaga). Rouge (boda y 15) usa Mongolia Sky en bordó:
  reemplazar también en la invitación la imagen con esa fuente por texto (para poder traducirlo o cambiarlo).
- **Después de publicar**: los nombres y la fecha quedan fijos (se cambian pidiéndolo por WhatsApp) y el resto se puede
  editar hasta 7 días después del evento. El superusuario (administrador) edita todo, también las tarjetas generadas.
- **Tarjetas** (Save The Date y agradecimiento): en `modelo.json → tarjetas`. Se parte del diseño en JPG: se le borran los
  textos (queda `img/std-fondo.jpg`) y, para las versiones con foto, una capa con las hojas y el aro con el centro
  transparente (`img/std-aro.webp`, con `"sobreFoto": true`). Los textos se definen con posición, tamaño, color y
  espaciado (ver el comentario de `public/panel/tarjeta.js`). Variables: {nombres} {a} {b} {fecha} {fechaCorta} {lugar}
  {evento} {mensaje}. `fuentes.css` carga las fuentes del modelo.
  El "&" de los nombres (con `amp`) es parte del diseño: se mueve junto con los nombres pero no se puede escribir ni
  borrar; al editar, cada nombre se escribe por separado. Mantenerlo así en todos los modelos.
- **Modales**: el común (`comun/js/modal.js` + `comun/css/modal.css`) toma los botones de siempre (`data-fancybox
  data-src="#id"` y `data-toggle="modal" data-target="#id"`) y abre el contenido en un `<dialog>` propio, claro y con un
  desenfoque leve. No hace falta cambiar el HTML de los modelos; el botón "Cerrar" viejo se oculta (está la ✕).
- **Confirmación por pasos**: `comun/js/rsvp-pasos.js` (reemplaza a rsvp-universal_v2.2.js). El HTML del modal lo arma
  el componente `rsvp-form`. Incluye el paso "Un mensaje para {nombres}" (se ve en la administración → Mensajes).
- **Accesos rápidos del pie** ("¿Te perdiste algo?", solo Premium y Deluxe; **Basic no trae accesos rápidos**):
  confirmar, agendar, dress code, hospedaje (`#hospedaje-bus`), traslado (`#traslado`), itinerario, Instagram Wall
  (`#hashtag`), álbum QR (`#instagram`), sugerir canción, regalos e inicio. Cada `<li>` con su `data-seccion`, así
  aparece solo si la sección está prendida. Textos `perdiste.*` (ya están en todos los idiomas).
- **Slideshow de portada**: el común (`comun/js/slides.js` + `comun/css/slides.css`), no el carrusel de Bootstrap:
  `<div class="ai-slides" data-intervalo="5000"><div class="ai-slide …" data-repetir="fotos.portada" …></div></div>`.
  **Los modelos con slideshow lo llevan también en Basic** (`fotosPortada: 4` en basic). Al convertir cada modelo:
  cambiar la portada de Basic de una foto a slideshow.
- **Hospedaje y traslado**: el botón de "Referencias" va con `data-si="hospedaje.conReferencias"` y el de "Recorrido"
  con `data-si="busConRecorrido"` (sin datos cargados, no aparece). La columna del bus lleva `id="traslado"`.
- **Itinerario**: además de los íconos del modelo, todos tienen los comunes de `comun/img/itinerario/` (corazón,
  civil, vela, cáliz, globos, regalos, mamadera, corona, mesa dulce, despedida, show, fuegos, traslado, música).
  Sin ícono elegido, el círculo queda vacío (el `<img>` lleva `data-si="iconoUrl"`). Íconos nuevos: glifo blanco sólido de 350 × 350 px.
- **Fotos de muestra en la vista previa del panel**: las de la demo del modelo, muy desenfocadas. Se generan con
  `python3 scripts/fotos-borrosas.py <modelo>` (quedan en `demo/<evento>/borrosas/`, ~8 KB cada una, y la lista en
  `modelo.json → demoBorrosas`). Sin ellas, la vista previa usa las siluetas genéricas.
- **Lugares** (pendiente): en los eventos que no tienen ceremonia por defecto, un botón para agregar otro lugar con su
  fecha y horario.
- **Fondos de 100vh** (pendiente en los modelos): en el celular, el alto de la ventana cambia cuando aparece o se esconde la
  barra del navegador, y los fondos con `height: 100vh` se estiran o se achican. Usar `100svh` (con `100vh` antes, para
  navegadores viejos) o un alto fijo en px calculado al cargar. En la vista previa del panel ya no pasa: la invitación
  se arma siempre con el alto de la pantalla.

- **Nombres de portada (TODOS los modelos y todas las portadas, con o sin cuenta regresiva)**: el h1 con
  `data-campo-html="nombres.portada"` lleva `data-ajustar="0.82"` (fracción del ancho del contenedor). Dentro de un círculo
  o marco: `data-ajustar="0.56" data-ajustar-en=".clase-del-circulo"` (cuenta el lado más corto; medir el aro dibujado,
  no la caja, y bajar la fracción si el aro es más chico que su caja). `invitacion.js` limita el ancho del título a esa
  fracción (los nombres largos bajan de línea dentro del aro), y si algo igual no entra o quedan más de 2 líneas achica la
  letra de a poco hasta un mínimo legible en el celular (26px o el 45%). Probar siempre con "Maximiliano & Guadalupe" y
  "Roberto & Marcela" en un iPhone SE. No agregar padding ni `max-width` a mano.
- **Música e idioma**: los pone el componente común (`acceso`) como un control flotante arriba a la izquierda
  (`comun/js/flotante.js`). El `<audio id="audio">` del modelo se mantiene; el botón viejo `.music-play` se oculta solo.

- **Galería**: siempre `<div data-seccion="galeria" id="galeria"><div data-componente="galeria"></div></div>`. El componente común
  arma carrusel, mosaico, grilla o polaroids, con zoom al tocar. Sacar el owl de la galería (owl.carousel.min.js queda cargado:
  lo usa snow_2.7.1.js).
- **Galería dentro de la confirmación** (`galeria.enRsvp: true`): carrusel por defecto, sin elegir tipo; la confirmación no tiene
  opción de foto. Si el cliente apaga la galería, la confirmación usa el bloque de Basic.
- **Confirmación sin foto** (Premium y Deluxe): el bloque con foto va en `<div data-si="fotos.rsvp">` y, al lado, el bloque idéntico
  de la versión Basic en `<div data-no="fotos.rsvp">`. El `id="rsvp"` y `data-seccion="rsvp"` van en el contenedor de los dos.
- **Dress code, hospedaje y bus**: en casi todos los modelos el `id="dresscode"` envuelve a los tres. La sección lleva
  `data-si="grupos.dress"` (se ve si alguno está prendido); el título y el texto `data-seccion="dresscode"`; colores a evitar y
  sugerencias `data-seccion="estilos"`; hospedaje y bus su propio `data-seccion`.
- **Historia**: el texto en `<p class="… g-historia">`, sin `font-weight-lighter` (antes era un h3 muy grande).
- **Instagram Wall** (`data-seccion="instagram"`, `id="hashtag"`) y **álbum compartido** (`data-seccion="album"`): uno u otro.
- **Playlist**: `<div data-seccion="playlist" id="playlist"><div data-componente="playlist" data-clase-titulo="CLASE-DE-LA-FUENTE-DE-ÉNFASIS"></div></div>`
  después de Sugerir canciones. Sin botón de Spotify en Sugerir canciones.
- **Cierre**: `id="cierre"` y el texto final con `data-si="pie.mostrar"`.
- **Planes**: cada sección es del paquete más bajo que la trae en `modelo.json`. Secciones nuevas: `musica`, `estilos`,
  `instagram`, `playlist`. Galería: `fotosGaleria: 20` en los tres paquetes.
