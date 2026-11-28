# Estado del sistema y novedades (para seguir trabajando)

Resumen para quien siga con el proyecto (por ejemplo, cambios de diseño). Actualizado al 15/11/2026, ronda 86.
Ver también `CLAUDE.md` (reglas y mapa), `README.md` (carpetas y cómo probar) y el resto de `docs/`.

## 1. Qué está publicado

- `amoinvitar.com` lo sirve el Worker `amoinvitar-app` (este repo). Rama de trabajo: `claude/login-tienda`, ya subida y
  publicada con `npx wrangler deploy` en cada ronda. Todo lo de este documento está **en producción**.
- Hostinger ya no sirve la web. Las invitaciones viejas de clientes siguen online desde R2 (no tocarlas).
- Albunear (otro Worker y otro repo) está conectado por service binding: ver `docs/albunear.md` y el `CLAUDE.md`
  del repo de Albunear.
- Después de cada publicación hay que **purgar la caché de Cloudflare** (lo hace el dueño): las invitaciones
  armadas, los js/css del panel (sin versión en la URL) y las páginas del sitio quedan en caché.

## 2. Reglas de trabajo (las que pidió el dueño)

- Respuestas al dueño en español rioplatense (vos). Textos para clientes en español neutro (tú/ustedes), y en los mails,
  impersonal.
- Comentarios en español con `README (ronda N)`; commits en español, describiendo lo que cambia para el usuario.
- **Nunca** pedir claves ni tokens por el chat. Los secretos los carga el dueño con `npx wrangler secret put …`.
- No poner mails personales en el código. El de avisos es `hola@amoinvitar.com`.
- No tocar en `hernansnow/amoinvitar-v2.0`: invitaciones de clientes, `+++TEST`, `++base-alternativa`, `panel/` ni
  testimonios.
- Todo cambio de textos va **en todos los idiomas** (panel: en, pt, fr, it, de, nl; invitaciones: es y variantes, en,
  pt, fr, it, de, nl, ca; mails nuevos: es, en, pt, fr, it, de, nl).
- Probar en la compu antes de publicar (ver §5). Reiniciar el servidor local sin `pkill -f`:
  `ps -eo pid,args | awk '/node scripts\/servidor-local/ && !/awk/ {print $1}' | xargs -r kill; (ADMINS=jefe@ejemplo.com nohup npm run local > srv.log 2>&1 &)`

## 3. Cómo están armadas las cosas (lo que más se toca en diseño)

### Modelos de invitación (`public/modelos/<modelo>/`)
- `modelo.json`: eventos, planes (`paquetes.basic|premium|deluxe.secciones`), paleta y banderas del diseño
  (`videoPortada`, `sepiaPortada`, `ciudadPortada`, `sinBienvenida`…).
- Plantillas: `index.html` (Deluxe), `index-premium.html`, `index-basic.html` (también Gratis) y por evento
  `index-<evento>[-premium|-basic].html` (15, cumple, bautismo, comunion…).
- Atributos que lee el motor (`src/motor/render.js`):
  - `data-t="clave"` (texto de `src/textos`) y `data-t-html`;
  - `data-campo` / `data-campo-html` (dato del evento);
  - `data-si` / `data-no` (mostrar según un dato);
  - `data-seccion` (sección que se puede apagar);
  - `data-attr` (atributos);
  - `data-fecha` (fecha con formato);
  - `data-componente="…"` (bloques de `src/componentes/bloques.js`: sobre, galería, playlist, rsvp-form, canciones,
    album-qr…).
- Los datos que ve la plantilla los arma `src/motor/datos.js` (`armarVista`).
- Diseño propio por cliente (colores, imágenes, a medida): `docs/diseno-propio.md`.
- Estilos comunes de las invitaciones:
  - `public/comun/css/modelo-comun.css`;
  - `modal.css` (ventanas, RSVP y pase de entrada);
  - `playlist.css`.

### Textos
- Invitaciones: `src/textos/index.js` (es y variantes) y `src/textos/idiomas/*.js`.
- Panel, Mi cuenta y Entrar: el español se escribe una vez en el JS/HTML y se traduce por texto exacto:
  1. `npm run panel:i18n` suma los nuevos a `scripts/sitio/i18n/js-fuente.json`.
  2. Se agrega la traducción con el mismo número en `js-<idioma>.json`.
  3. `npm run sitio` lo compila.
  - Ojo: los textos que empiezan con emoji o «·» no se extraen. Hay que separar el emoji en su propio `<span>`.
- Web por país: `scripts/sitio/` (`contenido.mjs`, `construir.mjs`, `i18n/<idioma>.json`), se genera con `npm run sitio`.
  Legales en `scripts/sitio/legales/` (una carpeta por idioma).

### Panel del cliente (`public/panel/`)
- `panel.js` (editor), `admin.js` (pestaña Administración), `panel.css`.
- El esquema de pasos y campos sale de `src/panel/esquemas.js`.

## 4. Novedades recientes (rondas 64 a 84)

### Fotos y panel
- Fotos achicadas a la medida de cada lugar.
- Zoom y reencuadre en todas las fotos y en la portada (una versión para el celular y otra para la computadora).
- Vista previa en la barra blanca y botón flotante en el celular.
- Lista de invitados en dos líneas cuando no entra.

### Agregar al calendario
- Las cuatro opciones siempre visibles, con íconos negros.
- Google abre la app en Android (como la página vieja).
- Apple usa `/api/agendar.ics`.

### Páginas de acceso, PIN y «Buscá tu mesa»
- Muestran «Acceso a la invitación», el tipo de evento en negrita («Boda de», «Fiesta de 15 de»…) y los nombres.
- Usan Abril Fatface y Jost en negro.
- La frase por idioma está en `src/textos/acceso-evento.js`.

### Administración
- **Llegadas y Mesas** cuentan solo confirmados y sus acompañantes.
  - Los que no van salen de las mesas.
  - Los que no respondieron cuentan como posibles hasta la fecha límite (o el día del evento) y después quedan en rojo.
- **Respuestas** muestra «Ingresos: N» en los que no respondieron: cuántas veces abrieron su link. No cuentan los
  dueños, quien tenga acceso al panel ni el administrador.
- **Canciones:**
  - los botones de Spotify son solo para Deluxe; en los otros planes se ven apagados, con un aviso;
  - «Actualizar la playlist de la invitación»;
  - «Pasar todas» con Spotlistr (TuneMyMusic queda como segunda opción).
- **Playlist de Spotify** en la invitación: se vuelve a leer sola, como mucho cada 30 minutos (`refrescarPlaylist` en
  `src/index.js`).

### Invitación (lo que ve el invitado)
- Si ya respondió, el botón dice «Cambiar mi respuesta».
- Si confirmó y el anfitrión activó el pase, la tarjeta con nombre, pases y mesa se vuelve su **pase**: al tocarla
  abre el QR (`public/comun/js/rsvp-pasos.js`).
- **Álbum QR:** la ventana ocupa casi toda la pantalla, el álbum se desplaza adentro y tiene una sola ✕ en una
  cabecera blanca (`.ai-modal-album` en `modal.js` y `modal.css`).
- **Mensaje de bienvenida:** el saludo que va en lugar de la historia.
  - Se edita en Panel → Portada, hasta 50 letras, sin título. Se ve solo con la Historia apagada (siempre en
    Gratis y Basic).
  - **Floral** no lleva saludo (`"sinBienvenida": true`).
  - Los modelos simples (Party, Civil, Compromiso, Pedida) no tienen historia ni saludo.

### Álbum QR gratis
Con plan Deluxe y la sección Álbum QR prendida, el botón «Activar álbum QR gratis» aparece en la página de gracias y
en el editor. Lleva a Administración → Álbum (`#album`).

### Para que terminen la compra (`src/borradores.js`)
1. **«Guardar mi invitación»** en el panel, para quien no tiene cuenta.
   - Deja su mail y, si quiere, marca recibir novedades (casilla sin marcar).
   - Le llega el link para volver.
   - Se guarda en `app_state['contacto:<id>']`.
2. **Recordatorios automáticos** (tarea diaria). Se prenden en Consola → Invitaciones: días y cupón.
   - El 1.º sale sin cupón; el 2.º con el cupón elegido.
   - Van en el idioma del cliente y con link de baja (`/baja`, firmado).
   - Las reglas para no insistir están en el código.
3. **Ayuda al volver:** quien vuelve al panel después de 2 días o más sin terminarla ve un aviso con WhatsApp.
4. **Consola → Invitaciones:**
   - «Último ingreso» del cliente;
   - el mail que dejó sin cuenta;
   - «✉ Mail» para escribirle a mano, con plantilla, prueba, cupón e historial.

- La **política de privacidad** explica los recordatorios y la casilla de novedades. A pedido del dueño, **no dice que el
  segundo trae cupón**, para que nadie espere el descuento: no agregarlo.

### Pagos, plan Gratis y lo que ven los invitados (rondas 85 y 86)
- **Los invitados ven solo lo pagado** (`recortarSinPagar` en `src/panel/esquemas.js`, aplicado en `publicada()` de
  `src/index.js`). En una invitación publicada, lo prendido después sin pagar se apaga en la copia que se muestra:
  secciones de un plan más alto, galería y cuenta regresiva en Gratis, idiomas adicionales, tarjetas, cambios de
  diseño y video. El dueño («Ver la invitación») ve todo, con el aviso «Lo agregado sin pagar solo lo ves tú» y un
  botón para pagar (`conAvisoDueno`). Lo pagado sale de `ev.paquete` y `ev.datos.extras`.
- **Gratis + complementos ya no pasa a Basic:** se cobra solo el complemento (`planNecesario`). Pasar a Gratis no
  apaga los complementos; los adicionales sueltos también se compran en Gratis.
- **Tope de Gratis: 35 personas confirmadas** (con acompañantes), con o sin lista de invitados (`topeConfirmaciones` y
  `rsvp` en `src/index.js`). La respuesta que pasaría el tope se rechaza («lleno»); los «no voy» siguen entrando.
  La lista de invitados de Gratis también tiene tope de 35 filas.
- **Una sola invitación Gratis activa por cliente** (`otraGratisActiva` en `src/rutas/tienda.js`). Cuenta como el
  mismo cliente:
  - el mismo mail (cuenta o pedido);
  - otra Gratis con los mismos nombres y la misma fecha (para que no alcance con usar otro mail).

  «Activa» quiere decir ya activada (paquete `gratis`), publicada o no, y sin vencer. Si ya tiene una, el panel le
  pide plan (`plan.otraGratis` + aviso) y la compra rechaza activarla gratis.
- **Panel → Administración:**
  - barra abajo con lo que falta pagar y el botón «Pagar» (`pintarBarraPago`);
  - sin activar, Enviar con los botones apagados y el aviso;
  - en Gratis, aviso de 35 confirmaciones en Enviar y Respuestas.
- **Avisos para subir de plan** (`.aviso-nivel` / `.ad-bloqueo-cinta`), con el color de cada plan: Basic verde, Premium
  violeta, Deluxe oro (fondo claro, texto y borde fuertes).
- **Complementos en el editor:** el interruptor dice «Agregar» y el precio va en verde a la derecha
  (`precioComplemento`); la Save The Date dice «desde» y el precio más bajo.
- La pestaña «Álbum de fotos» de Administración se llama **«Álbum QR»**. En el celular, la flecha para pasar de
  pestaña es negra con la flecha blanca.
- En local, los pagos se simulan (`DEV_FAKE_PAYMENTS`): un pedido «pagado» en la compu no es un regalo.

### Profesionales: tablero, panel de sus eventos, DEMO y créditos de complementos (ronda 87)
Detalle completo en `docs/empresas.md` §11. Resumen:
- **Tablero** (`public/empresa/index.html`): logo de Amo Invitar como en el panel, bandera de país/idioma antes de «Salir»
  (`window.AI_PAIS` de `selector-pais.js`), pestañas activas (el `el()` ahora escribe `aria-selected="true"`), celular en
  grilla sin desborde (tablas como tarjetas con `data-l`), «Nuevo evento» con dos nombres solo en bodas, Nombre de la
  marca desactivado si hay logo, color del pie y paleta del panel del cliente. Studio en negro y oro. Se traduce con
  `regional.js` (los textos del tablero entran en `npm run panel:i18n`).
- **Panel de eventos de empresa** (todo con `ev.empresaId` / `S.empresa`; los clientes directos no cambian): sin precios
  (`preciosExtras` vacío), video de portada sin costo, álbum QR solo con link propio, complementos con «Contactanos» si no
  hay crédito de complemento, Administración → Álbum QR con la propuesta de Albunear para profesionales.
- **Cliente final** (`S.empresa.cliente`): con el link `?k=` se ve como cliente aunque quien lo abra sea del equipo; no
  ve cambiar modelo, «Mis invitaciones», la pestaña Álbum QR ni lo apagado (secciones y complementos; vuelven solos si
  el profesional los prende); sin permiso, el botón solo guarda. Logo propio solo con Studio; el logo de la barra espera
  a saber de quién es el panel (`.marca.esperando`). El panel también se abre desde el dominio propio.
- **Studio** = marca blanca siempre (`marcaEfectiva`). **DEMO** y **créditos de complementos** en `app_state`
  `pro-extra:<empresaId>` (`src/pro/extras.js`), manejados desde /admin → Profesionales.
- Consola: pestaña «Cambios de diseño», pestañas activas, celular. Mail de aprobación Pro → «Ir a Mi panel» (/empresa/).
- Web: insignia «Regalo» (Save The Date y Álbum colaborativo QR) y el álbum en «Compara» después de Soporte prioritario.
- Hashtag de ejemplo con un nombre en eventos de una persona.
- **Ronda 88** (ver `docs/empresas.md` §12): tablero en la moneda del país y sin IVA fuera de la UE, DEMO que vuelve al
  nivel anterior, suspensión que bloquea paneles e invitaciones, cargador y «Powered by» en el panel del cliente,
  pie Pro con «Powered by», subir/bajar Studio desde /admin y el muestrario `/muestrario/<empresa>`.
- **Ronda 89** (ver `docs/empresas.md` §13): el link del cliente muestra la vista del cliente aunque entre el profesional
  o el admin, dominio Studio en links y miniatura, país por IP en paneles, cambiador de modelos Pro con «Solicitar» a
  medida, volver de a medida a catálogo, paleta violeta, barra verde fija en tablero y /admin, pase Studio de 12 meses,
  página `/diseno-a-medida`, menú Invitaciones nuevo y selector de país más fino.
- **Ronda 90** (ver `docs/empresas.md` §14): «Pagas al enviar a producción» y slideshow en Diseño a medida, Powered by
  centrado en el celular, los 5 corporativos viejos (Snow, AI Travel, Aquasalud, Liseth, Prave) como modelos de kit
  para «Diseño propio» y eventos empresariales sin sobre de apertura.
- **Ronda 91** (ver `docs/empresas.md` §14): modelo Corporativo general (reemplaza los 5 viejos), vista previa provisoria
- **Ronda 92** (ver `docs/empresas.md` §14b): entrega de la Save The Date a medida (tarjeta: imágenes que sube el admin en el panel; web: Diseño propio `<evento>std` en `/std/<evento>`), botón de envío en los paneles a medida, portada con foto/video en corporativo, título del relato opcional, bienvenida larga, foto en Instagram Wall/Álbum QR, título del cierre desactivado con logo.
- **Ronda 93** (ver `docs/empresas.md` §14c): enviado al equipo (a medida, corporativo, STD a medida, Cambios de diseño) el panel oculta los campos y muestra solo el estado (espera, aprobado, listo + WhatsApp); la consola puede volver a habilitar la edición.
- **Ronda 94** (ver `docs/empresas.md` §14d): ventana de bienvenida con música en los corporativos; imágenes nuevas del diseño propio a `img/`.
- **Ronda 95** (ver `docs/empresas.md` §14e): letra/color de los nombres por modelo en bloqueo, PIN, mesas y PDF; Recepción con logo; Administración con íconos; accesos con nombre y cargo; regalar Recuerdo; cobros adicionales con link de pago; «Ver como el cliente».
- **Ronda 96** (ver `docs/empresas.md` §14f): Buscá tu mesa arreglado, letras grandes ajustadas, Administración en dos filas, a medida abre todo menos la personalización, accesos desde la consola, caché de estáticos.
- **Ronda 97**: cuenta regresiva de las invitaciones hasta la ceremonia (si va aparte) o la fiesta, en la zona horaria que eligió el cliente: el motor manda el instante exacto (`INV.cuentaFin`, `msUTC` en `src/motor/datos.js`) y un script en la cabecera reescribe `INV.cuenta` en la hora del celular de quien mira, así todos los diseños (jQuery countdown, Graffiti, Travel) cuentan hasta el mismo momento. La fecha límite de confirmación nunca se cuenta en la invitación (solo cierra el botón); en el Resumen del panel queda solo la cuenta «Faltan para el evento» y el cierre va como aviso «Quedan N días para el cierre de la lista» (ronda 98: se quitó la segunda cuenta; los días se cuentan hasta las 23:59 de ese día en la zona del evento). El panel también usa la ceremonia y la zona del cliente.
- **Ronda 98**: (1) Álbum de Albunear solo con Deluxe **pagado** (`deluxePagada`: paquete `deluxe`, sin empresa): ni el administrador lo crea antes; el borrador que pide Deluxe ve «se crea y se vincula solo al publicar y pagar». Al publicar (y en la mejora a Deluxe de una publicada, y al abrir la pestaña si faltaba) `albumAutomatico` crea el Classic a nombre del dueño y lo vincula, salvo álbum propio o sección apagada. (2) Traducciones del panel: `tr(plantilla, datos)` en `panel.js`/`admin.js` para frases con datos («Recordar a {nombre}»); el extractor (`npm run panel:i18n`) toma frases con `{x}`, las cadenas dentro de `${…}`, textos de hasta 1500 caracteres, las opciones de Recuerdo (`RECUERDO` de `src/catalogo.js`) y la Recepción. Mensajes de WhatsApp por defecto, títulos `data-et` de la lista en el celular y ayudas en el idioma del panel. (3) PDF/Excel de respuestas, mesas, mensajes y canciones y el libro de mensajes en el idioma del panel (`idiomaPanel()` para fechas). (4) PIN, bloqueo, Buscá tu mesa y Recepción: idioma = selector (`?lang=`) → cookie `idioma` del panel → el de la invitación (`src/lib/idioma-pagina.js`), con selector arriba a la derecha; el PIN incorrecto conserva el idioma. Los textos sugeridos de las secciones (Instagram, álbum, canciones, regalos, hoteles, bus…) siguen en el idioma de la invitación, porque son los que ven los invitados.
- **Ronda 99**: tarjetas (Save The Date y agradecimiento) en el idioma de la invitación: `public/panel/tarjeta-i18n.js` (frases por evento, saludos, citas y textos fijos de los diseños; «Save the date» queda igual) y `varsTarjeta` en `panel.js` (meses y días con `Intl`); `rellenar` de `tarjeta.js` traduce el texto fijo con `vars.__tr`. Vista previa en el celular: botones con texto corto y recorte, sin salirse. «Plan:» traducido (Plan, Plano, Formule, Piano, Tarif, Pakket). En la web, todo producto de boda pide dos nombres (también la STD web). Civil, Compromiso y Pedida de mano traducidos. Pro «0» en la moneda del visitante (`data-precio="gratis"`). Pie con «Diseño a medida»; «Ideas y frases» solo en español (menú y pie: `data-solo-es`).
- **Ronda 100**: «Ideas y frases» (índice y las 5 notas) en todos los idiomas: sin `soloEspanol` en `construir.mjs`, `soloEspanol = () => false` en `src/sitio/nuevo.js` (antes mandaba /ideas a español), menú y pie otra vez en todos los idiomas. `npm run sitio:i18n` ahora también lee `public/sitio/t/es/ideas/`. Traducciones en `scripts/sitio/i18n/<idioma>.json` (ids 1119–1135 y 1536–1708).
- **Ronda 101**: los modelos simples (Civil, Party, Compromiso, Pedida de mano) ya no se cierran enteros al publicar: igual que las demás, solo quedan fijos nombres y fecha (`FIJOS_PUBLICADA`) y se cierran unos días después del evento (`edicionCerrada`). La Save The Date web sigue cerrada al publicar (`esquemaPanel` en `src/panel/esquemas.js` y el 403 de `src/index.js`).
- **Ronda 102**: los WhatsApp que el cliente manda desde el panel (ayuda, «Pedir el cambio» de nombres/fecha, modificar diseño o a medida, pedir complemento, extra de profesionales) salen en el idioma del panel con `tr()` (`whatsapp()`, `contactoCambios`, `linkContacto`, `solicitarMedida` en `panel.js`; nombres unidos con «&»). También «¡Reserva la fecha!» del link de la STD web. Textos 1921–1928 de `js-*.json`.
- **Ronda 103**: el formulario de confirmación salía vacío en los modelos simples (Civil, Party, Compromiso, Pedida): les faltaba `<div data-componente="acceso">`, que carga `rsvp-pasos.js` y la dirección del RSVP. Revisados todos los `public/modelos/*/index*.html`: los demás modelos y versiones (basic/premium) lo tenían. Prueba: crear, publicar y confirmar en civil, party, compromiso, pedida, cinema basic, garden 15 basic y garden premium.
- **Ronda 104**: la Save The Date web publicada también se edita (como los simples y las demás): solo quedan fijos nombres y fecha. El aviso de los campos fijos pasa a «Invitación publicada: solicitar cambio» seguido del link de siempre «Pedir el cambio por WhatsApp» (ronda 105: sin botón; texto 1929 de `js-*.json`).
- **Ronda 106**: (1) complementos de los productos (simples, STD web, a medida): `estadoProducto` en `src/rutas/tienda.js` ahora suma `complementos()` para todos (antes solo a medida) y manda `preciosExtras` completos; `precioComplemento` del panel ya no se oculta con `sinNiveles`. Así el cambio de diseño y el idioma adicional muestran el precio arriba a la derecha y se cobran. (2) STD web en pt/fr/it/de/nl/ca: `std.mensaje` (boda y 15) y `std.proximamente` en `STD_OTROS` de `src/textos/index.js` (antes caían en inglés). (3) Confirmaciones de los simples: sin «Título» y con «Texto» en lugar de «Texto de la sección» (`pasosSimple`).
- **Ronda 107**: (1) título de la historia opcional en todos los modelos y eventos: el campo trae el título por defecto, se puede cambiar o dejar vacío (`historia.sinTitulo`, antes solo en corporativo/a medida); vacío = `condiciones()` de `src/motor/render.js` quita el encabezado entero. (2) Saltos de línea del cliente (también renglones en blanco) en todos los párrafos: `conSaltos()` para `data-campo`/`data-t`, `\n`→`<br>` en `data-campo-html` y en el texto de confirmación (`rsvp-fecha-fin-evento.js`). (3) Cómo armar una invitación para un cliente del sistema anterior: crearla, consola → «Cambiar plan» al plan pagado (sin cobrar), publicar desde el panel, «Dar acceso» al mail del cliente y quitar el propio; lo que el cliente sume después (plan más alto o complementos) se cobra y los invitados no lo ven hasta pagar.
- **Ronda 108**:
- **Ronda 109–110**: ZIP del álbum más robusto (cada archivo entero, 3 intentos, se descarta el temporal si falla; `public/panel/albunear/zip.js` y su original en Albunear). En el celular, las filas que se deslizan de Álbum QR (botones y filtros) llevan la flecha «>» del menú del panel (`conFlecha` en `album-qr.js`, `.aq-flecha`).
- **Ronda 111**: las invitaciones **a medida y corporativas** (`producto: 'a-medida'`) pagadas en Deluxe también cuentan como «Deluxe con álbum incluido» (`deluxePagada` en `src/index.js`, lista `CON_PLANES`). Antes solo contaba `producto: 'invitacion'` y la pestaña Álbum QR de Degasa pedía activar un álbum que ya existía. **Regla:** toda condición por plan (`paquete`) tiene que contemplar los dos productos con planes, `invitacion` y `a-medida`. En Albunear, `/socio/qr` faltaba en `PAGES` (daba 404).
- **Ronda 112**: Resumen de confirmaciones vs. lista. El resumen cuenta **personas** (pases) y la lista **invitaciones**: un invitado con +1 que va solo suma 1 a «No asisten» del resumen, y una invitación sin respuesta con +1 suma 2 a «Sin respuesta». Ahora el resumen lo aclara debajo del número («incluye N pases sin usar», «N invitaciones»). `conteo()` en `public/panel/admin.js`.
- **Ronda 113**: Plan en la barra del panel (arriba en escritorio, abajo en el celular). Ya pagado, solo el nombre del plan, sin precio. Si suma algo pago, «Falta pagar $X». En el resumen, cuando no se debe nada, «Total 0 €» con la moneda del cliente (`plan.cero`, que manda `estadoPlan`/`estadoProducto` en `src/rutas/tienda.js`) en lugar de «Gratis» o «Pagado». `pintarPlan()` y `mostrarResumen()` en `public/panel/panel.js`.
- **Ronda 114**: Resumen del plan ya pagado: en lugar de «Se paga recién al obtener el link», dice «Tu invitación ya está pagada…» o, si agregó algo pago, «Lo que agregaste se paga con el botón Pagar…» (`mostrarResumen` en `public/panel/panel.js`).
- **Ronda 115**: Paneles viejos (panel.amoinvitar.com) sin íconos: cargan la fuente icomoon y los css de amoinvitar.com, y el navegador bloqueaba la fuente por CORS. `entregar()` en `src/sitio/legado.js` manda `access-control-allow-origin` para html, css, imágenes y fuentes, como el .htaccess de Hostinger («CORS para panel»). Además: `public/lore/` es una tarjeta de regalo personal del dueño (no enlazada, noindex); no tocar.
- **Ronda 116**: White y Black priorizan los nombres en una línea (portada y cierre): letra mínima 17 px (`UNA_LINEA` en `public/comun/js/invitacion.js`, cuarto y quinto valor). Corazón con aire a los lados. Si igual no entran, van en tres líneas con el corazón en la del medio sin pisar los nombres (`modelo-comun.css`). Los nombres se recortan (sin espacios de más) al armar la invitación (`src/motor/datos.js`).
- **Ronda 117**: vista previa con lista de invitados vacía: el invitado de ejemplo («Nombre del invitado») va en el idioma de la invitación (`vistaPrevia` en `src/index.js`). El resto de la tarjeta (pases extra, mesa) ya estaba traducido (`lista.*` en `src/textos`).
  - Save The Date (complemento): «A medida» es una ficha más al final de las opciones (`std.tipo`, opción con `medida: true`); se quitó el recuadro debajo de «Generar tarjeta».
  - **Álbum QR administrado desde Amo Invitar!** (Deluxe pagada, sección prendida y álbum creado): `public/panel/album-qr.js` (Fotos con filtros, orden, 3 vistas, selección masiva, vista grande con descargar/favorita/destacar/ocultar/borrar y refresco cada 20 s; QR en iframe de Albunear con descarga e impresión; Link + mensaje de WhatsApp; Moderar; Slideshow en vivo; ZIP armado en el navegador con `public/panel/albunear/zip.js`). Pide todo a `POST /api/panel/:id/albumqr`, que llama a `env.ALBUNEAR.album(eventoId, {accion…})` (Albunear ejecuta sus propias rutas del panel como dueño del álbum). Si Albunear no tiene esa puerta, quedan los botones de antes.
  - Pestaña Álbum QR: «Powered by Albunear» (link) a la derecha del título; Deluxe sin activar → banner + «Activar y crear el Álbum» (se crea y se vincula sin salir); Gratis/Basic/Premium → banner «Activa Deluxe…» + «Conocer Albunear». Profesionales, igual que antes.
  - Al crear el álbum se le pasa la foto de la sección (fotos.instagram) como portada (`crearAlbumIncluido`).
  - Sin link propio: la sección «Álbum de fotos QR» ya no tiene título «Álbum» ni selector; `album.url` solo con `album.regalo` (consola → «Agregar la sección Álbum QR», `POST /api/admin/eventos/:id/album-regalo`: no pide Deluxe ni recorta; el cliente pega el link) y en profesionales (`paraEmpresa`).
  - Celular: botones y filtros en una fila deslizable, grilla de 3, lote solo con íconos.
  - Miniatura (Link y miniatura): con foto propia + «Imagen y nombres», la vista previa muestra la miniatura armada con los nombres y «Ajustar encuadre» abre el recuadro (antes se veía solo la foto).
  - **Del lado de Albunear** (repo `albunear`, rama `claude/conexion-amoinvitar`): `Socios.album()`, `PEDIDOS_SOCIOS` en `src/lib/auth.js`, permiso temporal del QR (`src/lib/socio-qr.js`, `/socio/qr`, `/api/socio/qr`), impresión A4 1/2/4 y A3 4 (sin A6), portada en `crearAlbum`. **Lo publica el dueño** (`npx wrangler deploy` en ese repo) y para el ZIP y las descargas hay que sumar `https://amoinvitar.com` (y `app.`/`www.`) al CORS del bucket `albunear-media`.
  verde para a medida y corporativo, «Lista» activa el diseño propio, textos corporativos en todos los idiomas, panel
  corporativo con logo/texto en portada y cierre, consola con la idea completa del cliente, cuadro de galería arreglado.
- **Ronda 118**: recordatorios a borradores, cupones del sistema y mails en el idioma del cliente.
  - Romantic: la portada no tiene encuadre por dispositivo en el panel (`portadaSinEncuadre` en `modelo.json` → `sinEncuadre` en el esquema).
  - Consola → Invitaciones: columnas País (bandera; «~» si se estimó por la zona horaria) y Último ingreso (`app_state['ingreso:<ev>']`); «Ordenar por» actualización, creación, pago, último ingreso, estado, país o «listas para el 2.º mail». Se quitó «Limpieza antes de abrir» de Pedidos.
  - **1.er recordatorio automático** (`src/recordatorios.js`, corre cada hora en el cron de cada minuto, minuto 17): borradores de invitación sin publicar, con actividad en los últimos 30 días, 24 h sin entrar al panel, fecha del evento sin pasar y sin otro mail en 3 días. Idioma y variante del cliente (10 claves: es, es-vos, es-es, en, pt-br, pt-pt, fr, it, de, nl), plural en bodas o con dos nombres. Botón de WhatsApp con texto en su idioma. Se apaga desde la consola (tarjeta «Recordatorios automáticos»). Máximo 50 por hora.
  - **2.º mail manual** («✉ 2.º mail» en Invitaciones): aparece 3 días después del 1.º (o del último ingreso si volvió y sigue en borrador). Ventana con tipo, idioma (marca el del cliente), textos editables, porcentaje y días, y «Enviarme una prueba». Crea un cupón del sistema (`VUELVE{pct}XXXX`, 1 uso, vence a los 5 días, nota `[auto] …`). Historial en `app_state['mailborrador:<ev>']`; la consola marca 1.º y 2.º enviados.
  - Cupones: «Creados por ti» y «Del sistema»; los usados dicen «Usado»; los del sistema vencidos se borran en la tarea diaria (`limpiarCuponesSistema`).
  - **Mails al cliente en su idioma** (es, en, pt, fr, it, de, nl): textos en `src/lib/email-textos.js`; el idioma sale de `src/lib/idioma-mail.js` (`idiomaPara`: el guardado para ese mail en `idiomamail:<email>` al pedir el link, comprar, entrar al panel o pedir cuenta Pro → cookie/navegador de la petición → idioma del panel de la invitación → variante → español). Cubre link de acceso, compra, transferencia, factura, adicional, recuerdo, respuestas de invitados, aviso de cierre, nuevo acceso, a medida aprobada, Pro (solicitud, aprobada, rechazada, equipo, compras, créditos). El nombre del producto se traduce en el mail (`productoEn`); en el pedido y la factura queda en español. `mailAvisoInterno` (para el equipo) sigue en español.
  - Prueba local: `GET /__recordatorios?horas=N` corre los recordatorios con el reloj adelantado.
- **Ronda 119**: Álbum QR → Fotos con la barra armada como en Albunear (solo la disposición, no los colores). Compu: filtros en palabras · orden y «Seleccionar» · vista. Celular: filtros con íconos («Todas» en palabra) y la vista en la misma línea (si no entran, los filtros se deslizan); debajo, el orden y «Seleccionar» a lo ancho. El botón pasa de «Seleccionar» a «Seleccionar todo» y a «Desmarcar» (deja todo sin marcar). En el lote, «N seleccionadas» va chico arriba con Cancelar y los botones debajo. `public/panel/album-qr.js` (`tabFotos`, `pintarLote`) y el final de `public/panel/panel.css`.
- **Ronda 120**: Álbum QR → Fotos en el celular: 1.ª línea solo los filtros (a lo ancho, con lugar para números de 3 cifras); 2.ª línea orden + «Seleccionar» + vista, más chicos. Si no entran (pantalla angosta o idioma largo como alemán), la vista baja sola a una 3.ª línea. Si los filtros no entran (≤ 320 px con números grandes), se deslizan. Compu sin cambios. Final de `public/panel/panel.css`.
- **Ronda 121**: «Agendar» dentro de un modal (Civil, Party: «Día y horario») no se podía tocar: el modal es un `<dialog>` (capa superior del navegador) y el menú se agregaba al `body`, por detrás. Ahora el menú (y su fondo en el celular) se agrega dentro del mismo `<dialog>` y va fijo a la pantalla (`public/comun/js/invitacion.js`). Probado en la publicada de Khalil & Rahma (Civil, francés).
- **Ronda 122**: álbum sin salir de Amo Invitar!, pase a Platinum, precios nuevos de profesionales y **Duo**.
  - Álbum QR (Deluxe y Duo): pestañas nuevas **Diseño** (selector de Albunear en un iframe con permiso: `Socios.album` `diseno`) y **Ajustes** (título de portada, subtítulo del QR, bienvenida y borrar el álbum). «Cambiar diseño» del QR abre la pestaña Diseño. Sin el botón que llevaba al panel de Albunear. **Slideshow en vivo** en una página propia (`/panel/slideshow.html?ev=`) con la pantalla del álbum en un iframe a pantalla completa (sirve también en el dominio del profesional). Los administradores de la invitación ya administran el álbum desde acá (no hace falta copiarlos a Albunear).
  - Deluxe con álbum Classic: banner «Pasa tu álbum a Platinum» → `Socios.album` `mejora` (cupón de un uso del 5 % y link a la página de pago de Albunear, que muestra el precio tachado).
  - Marca del slideshow (`marcaAlbumDe` en `src/index.js`): Amo Invitar! para clientes y Pro; ninguna con Studio (pase vigente). Se ajusta sola al abrir la pestaña.
  - **Precios de profesionales** (`PROFESIONALES` en `src/catalogo.js`, sin IVA): crédito 30; Pro 5/10 = 140/260; Studio 99/año, 10/25/50/100 = 230/525/950/1.700. Configuración del dominio sin cargo desde el pack de 50 (`dominioSinCargoDesdePack`).
  - **Duo** = invitación Deluxe Pro + álbum QR Platinum Pro (sin nombrar a Albunear al profesional ni a su cliente). Pro Duo: packs 5/10 = 320/580. Event Studio Duo: pase 149/año (198 tachado, incluye Studio) y packs 10/25/50/100 = 560/1.250/2.250/4.000 (invitación + álbum −5 %, redondeado hacia abajo por crédito; álbum pro en `ALBUM_PRO`). Créditos Duo y pase Duo en `pro-extra:<empresa>` (`duo.saldo`, `duo.paseVence`, `src/pro/extras.js`). Ítems de compra `duo-N`, `sduo-N`, `pase-duo`.
  - Evento Duo: se elige al crearlo en el tablero o con la casilla del evento (`datos.empresa.duoPedido`); al publicar gasta 1 crédito Duo (`datos.empresa.duo`) y se crea el álbum Platinum a nombre del dueño de la empresa. Pro Duo: «Powered by Albunear» sin link; Event Studio Duo: sin nada. Sin links al panel de Albunear (ni a las tarjetas del QR).
  - Página /profesionales: tres niveles (Pro, Studio, Event Studio Duo), tablas Pro con crédito suelto, Studio, Pro Duo y Event Studio Duo, valor de reventa (`PVP_PRO`), sección del álbum QR con los ganchos por rubro, «Todo en un solo lugar / Funciones» sin insignias de planes (`funciones(E, { pro: true })`), comparativa de tres columnas y preguntas nuevas. «¿Cómo pago?» y «¿Cómo puedo pagar?» (resto del sitio) muestran los medios del país con el mismo texto de la nota de los planes (`[data-medios-faq]` en `sitio.js`).
  - Formulario de profesionales y consola: niveles Pro Duo y Event Studio Duo; la consola aprueba como Event Studio Duo, regala créditos Duo (origen «Créditos Duo») y sube/baja de nivel quitando o poniendo el pase Duo.
  - Depende de Albunear (rama `claude/conexion-amoinvitar`, commit «Slideshow con marca…»): hasta que se publique, Diseño, Platinum, borrar y la marca responden «no disponible» y los álbumes Duo salen Classic.
- **Ronda 123**: retoques de /profesionales y del Álbum QR.
  - Créditos en una sola sección: título «Un crédito, una Invitación», línea en negrita «O un crédito, una invitación + un álbum QR.» y las cuatro tablas seguidas (Pro, Studio, Pro Duo, Event Studio Duo), cada una con el nombre y debajo «No requiere pase anual» / «Requiere pase anual activo» (`tabla(n, [nombre, sub], …)` en `construir.mjs`, `.comparar-sub`).
  - Títulos con la palabra en Dantina: «Cada crédito se paga *Solo*», «Las *Fotos* que nadie más puede tomar», «Tu equipo, tus *Clientes*».
  - Precios tachados: solo el número va tachado, no el símbolo de moneda (`soloNumero` en `sitio.js`, `eurTachado` en `construir.mjs`, `.tn` en `sitio.css`). Vale también para las promos de los planes y de crear-invitacion.
  - Panel → Álbum QR: «Slideshow en vivo» y «Descargar todo (ZIP)» solos en una línea, verdes y rellenos (`.aq-principales`, `.aq-tab-verde`); debajo las pestañas.
  - Si Albunear todavía no tiene publicada una acción nueva (diseno, borrar, mejora) responde `err.badData`: el panel muestra «Esta función estará disponible en unos minutos».
  - Albunear (commit «Arranque más liviano…»): el deploy fallaba con el error 10021 (arranque por encima del límite de CPU) porque las variantes de idioma se calculaban al cargar el Worker. Ahora se calculan al leerlas.
- **Ronda 124**: precios por crédito del dueño (`PROFESIONALES` en `src/catalogo.js`, sin IVA). Pro: suelto 32, pack 5 = 145 (29), pack 10 = 270 (27). Studio sin cambios (23/21/19/17). Pro Duo: 5 = 320 (64), 10 = 600 (60). Event Studio Duo: 10 = 530 (53), 25 = 1.175 (47), 50 = 2.100 (42), 100 = 3.700 (37). Los descuentos de las tablas se calculan solos (contra 32 € y contra 81 € = invitación + álbum sueltos).
  - Albunear: la pestaña Diseño suma la foto de portada (subir, encuadrar y borrar, solo Platinum) y ya no deja un hueco al final (el alto se mide sobre el contenido).
- **Ronda 125**:
  - **Diseño del álbum sin iframe** (`tabDiseno` en `public/panel/album-qr.js`): grilla de estilos con las miniaturas de Albunear y foto de portada (subir, encuadrar arrastrando y borrar; solo Platinum). Acciones nuevas de `/albumqr`: `estilos`, `estilo`, `encuadre`, `portada` (la foto se achica a 2400 px en el navegador y viaja en base64 por el enlace interno). La hoja de estilos, los fondos y las fuentes de los diseños se sirven desde este dominio en `/album-recursos/…` (fuera de `/panel/`, donde los .css no pasan por el Worker) (`recursoAlbum` en `src/index.js`, vía `env.ALBUNEAR.fetch`, caché de un día; en el CSS se reescriben las rutas `/themes/` y `/fonts/`).
  - **Tablero:** fichas de packs Duo con fondo dorado muy claro y botón dorado; el pase Event Studio Duo al revés que el de Studio (fondo dorado, botón negro).
  - **De Studio a Event Studio Duo pagando la diferencia** (`mejora-duo`: 149 − 99 = 50 € + IVA): con el pase Studio vigente y sin Duo se ofrece esto en lugar del pase Duo completo, con un banner «Pásate a Event Studio Duo» debajo de «Duo: invitación + álbum QR». El pase Duo vence el mismo día que el Studio (`pagarCompra` en `src/pro/compras.js`); al renovar se paga el pase Event Studio Duo completo.
  - Web: el recuadro «¿Organizas eventos todas las semanas?» (`empresas()` en `construir.mjs`) suma Duo y Event Studio Duo, y el «hasta X %» es el mayor descuento entre Studio y Event Studio Duo (hoy 54 %).
- **Ronda 126**:
  - **Álbum de los invitados con marca blanca (Event Studio Duo).** `/a/<slug>` lo sirve este Worker (`paginaAlbum` en `src/index.js`), en amoinvitar.com o en el dominio propio del profesional, con la página de Albunear sin nada de su marca. La página, sus archivos y su API pasan por `/album-recursos/…` (`recursoAlbum` / `pasarAAlbunear`, sin cookies: el invitado usa el encabezado `x-guest`). `sincronizarMarcaAlbum` le avisa a Albunear la marca y el link propio (`marca { marca: 'none', url }`), y deja ese link en la invitación, el panel y el QR. Pro Duo sigue con su link de albunear.com.
  - Para que los invitados suban fotos desde el dominio del profesional, el CORS del bucket `albunear-media` tiene que permitir PUT desde esos dominios (o `*`).
  - **Promos en hora de España** (`medianocheMadrid` en `src/lib/fx.js`): «desde» empieza a las 0:00 de España y «hasta» incluye el día entero (antes era UTC: arrancaban a la 1:00 en invierno y a las 2:00 en verano).
- **Ronda 127**: privacidad del álbum con marca blanca. `/a/<slug>/privacidad` (lo sirve este Worker y lo arma Albunear: página neutra en el idioma del invitado) indica al profesional como responsable de los datos; `sincronizarMarcaAlbum` manda `responsable { nombre, email }` (nombre de la marca o de la empresa y mail del dueño) y marca `datos.album.privacidad` cuando Albunear lo guardó. Términos y condiciones (sección 9, 7 idiomas): con Studio o Event Studio Duo el profesional es el responsable del tratamiento y Amo Invitar! el encargado.
- **Ronda 128**:
  - **Demo Event Studio Duo (prueba gratis de 7 días)** (`src/pro/demo.js`, botón «Demo Event Studio Duo (7 días)» en /admin): la cuenta queda en Studio + pase Duo hasta `demoHasta`, con 1 crédito Duo demo (`extras.duo.demo`). La primera invitación se publica con ese crédito (`datos.empresa = { credito: 'duo-demo', duo, demo, demoHasta }`): completa, con marca blanca y álbum QR Platinum con marca blanca; sin dominio propio. Las invitaciones demo publicadas llevan el cartel flotante «Invitación en modo Demo» (8 idiomas). En la demo solo se compran los pases (Studio o Event Studio Duo); al comprar uno, la cuenta deja de ser demo y el pase empieza ese día (`cerrarDemoPorCompra`). Tarea de cada hora (`tareasDemo`, en `admin.tareas` al minuto 17): cuenta vencida → Pro (o lo pagado que tenía antes); invitación demo vencida → borrador sin crédito (`demoFin`), el álbum pasa a Gratis en Albunear (acción `plan { nuevo: 'free' }`: vence a los 15 días y la limpieza diaria lo borra con todo); 30 días sin crédito → se borra la invitación. Al publicarla de nuevo con un crédito Duo, el álbum vuelve a Platinum (`plan { nuevo: 'platinum' }`) y deja de ser demo. Prueba local: `/__demo?dias=8`.
  - **Nombres y fecha fijos** (ya estaba para los paneles pro: solo el administrador de Amo Invitar! los cambia). Ahora también en una invitación de empresa que ya se publicó alguna vez y volvió a borrador (`nombresFijos` en `src/index.js`, `fijos` en `esquemaPanel`).
  - **Favicon del profesional** (`marca.icono`, `POST/DELETE /api/empresa/icono`; el tablero recorta la imagen al centro a 256 × 256): en el tablero, los paneles de sus eventos y sus invitaciones con su marca (`conIconoPro`). Sin ícono, uno genérico: sobre blanco sobre negro (`/comun/img/pro-icono.svg`).
  - **Colores libres del panel** (como el tablero de profesionales de Albunear): paleta `libre` con `marca.panelOscuro` (botones y barra) y `marca.panelClaro` (fondo). Las paletas se aplican al tablero y al panel de los clientes.
  - **Ayuda del tablero**: botón «?» en la barra con el manual (10 secciones, 7 idiomas).
  - **Consola**: «＋ Créditos Duo» (Pro Duo y Event Studio Duo) y «Cambiar nivel» (Pro, Studio o Event Studio Duo) en cada empresa, con los créditos Duo y el pase Duo a la vista.
  - Web de profesionales: Studio y Event Studio Duo con el botón «Prueba gratis» (ronda 129; antes «Prueba gratuita») y la nota «La prueba gratis incluye el plan Event Studio Duo, no requiere tarjeta y dura 7 días.»
- **Ronda 129** (tablero profesional rediseñado, `public/empresa/index.html`):
  - El tablero queda siempre verde y con el favicon de Amo Invitar!: los colores y el ícono del profesional son solo para el panel de sus clientes (y sus invitaciones).
  - Íconos en pestañas, títulos y botones; pestañas deslizantes en el celular con la flecha negra; «Salir» con ícono redondo; la insignia del nivel en la línea del logo y el nombre (el nombre termina con «…»). `?tab=<pestaña>` abre una pestaña.
  - **Eventos** en dos columnas (crear + catálogo | lista). El banner «Pasa a Studio. Marca blanca y más descuento…» solo en Eventos de Pro.
  - **Créditos y pedidos**: una ficha con los créditos (disponibles, Duo, vencimientos y lotes) y al lado la del nivel (Pro: pases Studio y Event Studio Duo; Studio: pase Duo pagando la diferencia y, si vence en 30 días, renovar; Event Studio Duo: renovar cuando vence; demo: los dos pases). **Comprar** por nivel con insignias (PRO, STUDIO, PRO DUO, EVENT STUDIO DUO), el descuento en rojo y candado en las de otro nivel (`tienda.catalogo` con `off` y `permitido`, `permitidoComprar` en `src/rutas/empresa.js`; Studio ya no compra Pro Duo).
  - **Vencimiento del pase**: banda fija bajo la barra cuando faltan 30 días o menos, y un mail al dueño un mes antes (`avisosPase` en `src/pro/avisos.js`, diario; uno por vencimiento; `proPase` en 7 idiomas).
  - **Dominio** en su propia pestaña: todos la ven; Pro y demo con candado y los banners para cambiar de nivel.
  - **Marca** en dos columnas (pie | colores del panel con vista previa + favicon). **Equipo** en dos columnas.
  - Panel del evento: con el álbum incluido (evento Duo o cuenta Event Studio Duo, también demo) la sección Álbum QR dice «Luego podrás configurar el álbum en la pestaña Administración.» (sin campo de link) (`albumIncluido` en `esquemaPanel`). Se quitó «Es la misma foto de Instagram Wall.» en todos los paneles.
- **Ronda 130**:
  - Álbum QR e Instagram Wall van uno u otro también en Duo. Con el álbum prendido (o con su álbum ya creado) el Instagram Wall queda apagado: al cargar el panel, al guardar (`sinInstagramSiAlbum` en `src/index.js`) y en la invitación (`paraMotor`).
  - El logo del profesional en la barra del panel (el que ve su cliente) va siempre en blanco; el del pie de la invitación conserva sus colores.
- **Ronda 131**: se volvió atrás la vista del panel de la ronda 130: el profesional y su equipo ven su panel completo (con manual y ayuda); el cliente final, el limpio (`limpio: !admin && (!rol || studio)`). En el tablero, debajo de los botones de cada evento: «A tu cliente debes enviarle el link de su panel, no el tuyo (la vista y el acceso son diferentes).»
- **Ronda 132**: «Powered by» más grande y alineado: en la barra del panel del cliente Pro el logo de Amo Invitar! pasa a 15 px (12 px en el celular) con menos espacio después de «by» (`.powered` en `panel.css`); en el pie de la invitación Pro, a 16 px y en la misma línea que «Powered by» (`bloques.js`).
  - Tablero: las fichas de compra ya no se salen de la pantalla en el celular.
- **Ronda 133**: la invitación web **a medida** y la **corporativa** se piden paso a paso en `/medida/<id>?k=` (`public/medida/index.html`), no en el panel. El STD a medida sigue como antes.
  - Al crear (`/api/tienda/empezar`) y al abrir `/panel/<id>` (`aMedidaEnPasos` en `src/index.js`) se va a `/medida/` mientras el diseño no esté «lista» (salvo eventos de profesionales y superadmin).
  - Pasos: 1) Ideas para el diseño (brief de siempre + **Portada** obligatoria: color, hasta 4 fotos o video ≤30 s sin recargo, y logo opcional; campos `brief.portada*` y `brief.logo` en `camposBrief`); 2) Secciones (switches; sin complementos ni secciones fijas; álbum QR e Instagram Wall uno u otro) con «Enviar al equipo de diseño» desactivado y la lista de lo que falta; 3) sin sesión pide entrar con Google o email (`/enviarMedida` responde 401 `cuenta`; el link del mail vuelve con `enviar=1` y envía solo) → «Gracias, recibimos tu proyecto» (sin poder editar); 4) aprobado (mail con link a `/medida/`) → página de pago (cotizar/comprar); 5) pagado → «¡Gracias por confiar en nosotros!»; 6) al marcar «Lista» en la consola se manda mail al cliente (`avisarMedidaLista`, `src/medida-avisos.js`) y desde ahí entra al panel completo, con Ideas para pedir cambios como siempre.
  - Los borradores a medida/corporativos que ya existían se adaptan solos: conservan sus datos y caen en el paso que corresponde a su estado.
  - Modal de creación: sin «(desde …)»; nota «Completa tu idea paso a paso…».

## 5. Probar en la compu

- `npm run local` levanta http://localhost:8787 con base en memoria.
- Ayudas que existen **solo** en `scripts/servidor-local.mjs`:
  - `/__publicar?id=&slug=&paquete=`: publicar sin pagar;
  - `/__mails`: los últimos mails;
  - `/__tareas`: correr la tarea diaria;
  - `/__borradores?dias=N`: recordatorios como si pasaran N días;
  - `/__ingreso?id=&dias=N`: simular un ingreso viejo;
  - `/__socios`: la puerta para Albunear.
- Superadministrador local: `ADMINS=jefe@ejemplo.com`. Se entra con `/auth/enlace` y el link que aparece en `/__mails`.
- El idioma del panel sale de la cookie `idioma` (por ejemplo `es-ar`, `en`); sin ella, por la IP (en la compu, inglés).
- Verificar con `node --check` los JS tocados y mirar capturas con Playwright (Chromium ya instalado).

## 6. Pendiente

- Traducciones viejas del panel: quedan unas 125 frases por idioma sin traducir. `npm run panel:i18n` muestra cuántas.
- Albunear: los pasos «para conectar todo» de su `CLAUDE.md` (links con país, moneda en `crearAlbum`, eventos nuevos).
- «Últimos mensajes» vacío que vio el dueño como administrador: no se pudo reproducir. Probablemente fue la caché
  (archivos del panel sin versión). Si vuelve a pasar, versionar los js/css del panel.
