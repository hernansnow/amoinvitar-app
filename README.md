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
tablero de empresas, modelos de Save The Date web, vencimientos de los planes
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

## Reglas para convertir los demás modelos (ronda 5)

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
