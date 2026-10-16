# Amo Invitar 2.0 · piloto (modelo Garden)

Invitaciones armadas por un Worker de Cloudflare: el cliente carga sus datos
en el panel y el Worker llena el diseño del modelo al abrir la invitación.

## Probar en la compu

```
npm install
npm run local
```

- http://localhost:8787/demo/garden — demo (idioma según el país; local = neutro)
- `?evento=boda|15|bautismo|comunion|cumple`
- `&paquete=basic|premium|deluxe`
- `&pais=AR|ES|MX|CR|GB…` (o `&idioma=es-ar|es|es-cr|es-es|en`)

## Carpetas

| Carpeta | Qué hay |
|---|---|
| `public/comun/` | CSS, JS, fuentes e imágenes que comparten todos los modelos |
| `public/modelos/<modelo>/index.html` | el diseño (se puede abrir y editar en Dreamweaver) |
| `public/modelos/<modelo>/tema.css` | paleta y fuentes del modelo |
| `public/modelos/<modelo>/estilo.css` | estilos del modelo (se arma con `npm run estilos -- <modelo>`) |
| `public/modelos/<modelo>/modelo.json` | qué secciones trae cada paquete, colores del sobre, fotos de la demo |
| `public/modelos/<modelo>/img/`, `demo/<tipo>/` | imágenes del modelo y fotos de la demo por tipo de evento |
| `src/textos/` | textos por idioma y por tipo de evento |
| `src/motor/` | `datos.js` arma los datos; `render.js` los pone en el HTML |
| `src/componentes/` | bloques comunes: sobre, acceso con PIN, formulario RSVP, canciones, álbum |
| `src/catalogo.js` | precios (EUR), extras, modelos del plan gratis |
| `schema.sql` | tablas de la base (D1) |

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

## Pendiente

Panel del cliente, tienda (Stripe, PayPal, Mercado Pago, transferencia,
facturas), vencimientos, descargas, envíos y recordatorios.
