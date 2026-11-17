# Amo Invitar para profesionales (planners, fotógrafos, salones, agencias)

> Estado (ronda 35): **modelo comercial, alta y aprobación, tablero `/empresa/`, créditos al publicar, equipo, marca y panel
> limpio funcionando**. Falta el cobro online de créditos y el dominio propio. Ya funciona: pie de marca blanca sin links, límite de 35 invitados en Gratis, tablas base
> (`empresas`, `miembros`, `accesos_evento`). Precios y niveles viven en `src/catalogo.js` (`PROFESIONALES`) y
> alimentan la página `/profesionales` de la web (se genera con `npm run sitio`).

## 1. Niveles

| | **Pro** | **Studio** |
|---|---|---|
| Ideal para | Fotógrafos y organizadores independientes | Salones medianos y agencias |
| Pase anual | **0 €** (sin costo fijo) | **99 € / año** |
| Administradores | hasta 2 | hasta 10 |
| Pie de la invitación | Amo Invitar + el logo de la empresa | Marca blanca: logo propio, texto o sin pie |
| Panel de la empresa | normal | sin logo de Amo Invitar ni links que lleven a amoinvitar.com o promocionen algo (p. ej. Albunear) |
| Dirección de las invitaciones | amoinvitar.com/… | dominio o subdominio propio (invitaciones.tusalon.com) (*) |
| Créditos | sueltos y packs de 5 y 10 | packs de 10, 25, 50 y 100 (solo con pase activo) |

(*) Configuración del dominio sin cargo con el pack de 100 créditos, o una única vez por 49 €.
Colores y estilos del panel **no cambian** en ningún nivel.

## 2. Créditos

**1 crédito = 25 €** = una invitación publicada, de **cualquier paquete (hasta Deluxe) y cualquier modelo**, mismo precio.

| Nivel | Pack | Precio | Por crédito | Descuento |
|---|---|---|---|---|
| Pro | 5 | 115 € | 23 € | 8 % |
| Pro | 10 | 200 € | 20 € | 20 % |
| Studio | 10 | 170 € | 17 € | 32 % |
| Studio | 25 | 375 € | 15 € | 40 % |
| Studio | 50 | 650 € | 13 € | 48 % |
| Studio | 100 | 1.100 € | 11 € | 56 % |

**No incluye** (se contrata aparte, con botón para contactar a Amo Invitar en el panel de la empresa): diseño a medida
(de ninguna variante), cambio de diseño, idioma adicional y complementos pagos de la invitación.
El diseño a medida se **ve como posibilidad** en el panel, pero se solicita contactándonos.

**Cuándo conviene Studio:** frente al mejor precio Pro (20 €), el pase de 99 € se amortiza con ~33 créditos usando packs
de 10, ~20 con packs de 25 y ~14 con packs de 50.

## 3. Quién puede qué

| | Dueño | Administrador (equipo) | Cliente final con acceso admin | Solo lectura |
|---|---|---|---|---|
| Ver todos los eventos de la empresa | ✓ | ✓ | solo el suyo | ✓ |
| Crear y editar eventos | ✓ | ✓ | el suyo | – |
| **Publicar** | ✓ | ✓ | ✓ (si la empresa le da nivel administrador) | – |
| Configuración de la cuenta, marca, equipo | ✓ | – | – | – |
| Comprar créditos, packs, pase, dominio | ✓ | – | – | – |
| Ver datos de la empresa | ✓ | ✓ | **no** | ✓ |

- El panel que ve el **cliente final** de una empresa está **completamente limpio de Amo Invitar**: sin logo, sin
  links, sin botones de contacto hacia Amo Invitar ni promociones (tampoco Albunear).
- El botón «Contactar a Amo Invitar» (para pedir extras, diseño a medida, dominio, etc.) existe **solo para el dueño** en el
  panel de la empresa.
- Los administradores se invitan por mail (sin contraseñas, como el resto del sistema). Roles en `miembros`:
  `duenio | editor | lectura`.

## 4. Marca blanca (reglas cerradas)

Se carga **una vez en la empresa** y se aplica a todos sus eventos. En **Pro** se puede sumar el logo propio **junto al**
pie de Amo Invitar; en **Studio** el pie de Amo Invitar desaparece.

| Opción (Studio) | Pie de la invitación |
|---|---|
| Logo propio | su logo |
| Texto (sin logo) | su texto |
| Logo y texto | ambos |
| «No mostrar pie» | ninguno |

- **Nunca hay links** en el pie con marca blanca (ni a amoinvitar.com ni uno propio).
- Tampoco aparece Amo Invitar en la pantalla del PIN ni en «Busca tu mesa».
- Ya aplicado en `src/componentes/bloques.js` (`pieMarca`, `pieChico`). `empresas.marca` (JSON):
  `{ "blanca": true, "nombre": "…", "logo": "/media/empresas/em_x/logo.png", "pie": "…", "sinPie": false }`.

## 5. Pro → Studio

Desde el panel Pro se muestran **siempre** los beneficios de Studio y un botón para pasarse. Todo extra se contrata
con Amo Invitar mediante el botón de contacto.

## 6. Pantallas del tablero `/empresa`

Pestañas: **Eventos** (lista con estado, plan, confirmaciones y vencimiento; abrir el panel del evento) ·
**Equipo** (invitar, roles, quitar) · **Marca** (logo, texto, «no mostrar pie», vista previa) ·
**Créditos y facturas** (saldo, packs, pase, dominio) · **Contacto** (pedir extras o pasar a Studio).

## 7. Orden para armarlo

1. **Hecho:** pie sin links y con opción de apagarlo, límite de 35 invitados en Gratis, definición de precios, página `/profesionales`, formulario de solicitud y consola de aprobación.
2. Migración: pase (`plan`, `vence`), créditos y su historial, dominio, rol cliente-admin.
3. Pantalla **Marca** (logo a R2, texto, interruptor, vista previa; Pro suma logo, Studio quita el pie).
4. Tablero **Eventos** y creación de eventos con crédito.
5. **Equipo** y acceso de administrador para el cliente final.
6. **Panel limpio** (sin Amo Invitar) para el cliente final y para Studio.
7. **Cobro**: créditos, packs, pase anual, dominio (con los medios de pago de siempre).
8. Dominio propio por empresa (Cloudflare for SaaS o rutas por host).

## 8. Reglas definidas (ronda 34)

- **Alta con aprobación a mano.** Quien quiere una cuenta completa el formulario de `/profesionales` (link a su web o red
  social, rubro, profesión y descripción de su trabajo). La solicitud llega a `solicitudes_pro` y por mail al administrador;
  se aprueba o rechaza desde `/admin/`. Aprobar crea la empresa, el nivel (Pro o Studio), el dueño (por su mail) y, si
  se quiere, créditos iniciales y el pase pagado. Solo las cuentas aprobadas compran créditos.
- **Precios sin IVA.** En España y la UE se suma el IVA que corresponda (25 € + IVA). Una empresa de la UE con IVA
  válido (VIES) se factura sin IVA, como ya hace la tienda.
- **Pase Studio anual:** se renueva cada año. Los packs Studio solo se cargan con el pase vigente.
- **Créditos:** cada compra es un **lote que vence a los 12 meses**. Si el pase Studio se renueva **antes** de que venzan,
  los créditos que sobraron se extienden 12 meses (se acumulan para el año siguiente). Sin renovar, se pierden al vencer.
- **Panel del profesional (Pro):** conserva logos, links y publicidad de Amo Invitar. Solo la versión del **cliente final**
  al que el profesional da acceso queda limpia (sin logos, links ni contacto con Amo Invitar). En Studio también se quita
  la marca de Amo Invitar del panel del equipo.
- **Cliente final con acceso de administrador:** puede publicar; no ve datos de la empresa, no compra ni cambia la cuenta.

## 9. Tablero del profesional (`/empresa/`)

Se entra con el mail (sin contraseñas). Lo ven los miembros de la empresa; el dueño maneja equipo, marca y compras.
- **Eventos:** crear (tipo, diseño, nombres, fecha), abrir el panel, ver la invitación, copiar el **link para el cliente**
  y decidir por evento si **el cliente puede publicar**. Se borran solo los borradores sin crédito usado.
- **Publicar usa 1 crédito** (una sola vez por evento; hasta Deluxe). Si la invitación lleva complementos, el crédito no
  los cubre: se avisa. Sin créditos no se publica (el equipo ve «comprar»; el cliente, un aviso neutro).
- **Créditos y pedidos:** saldo, lotes con su vencimiento y compra de packs o del pase. Cada pedido es por **transferencia**
  (precio neto + IVA según el país; empresa de otra país de la UE con IVA válido, sin IVA) y se **confirma desde `/admin/`**,
  que carga los créditos, emite la factura y avisa por mail. Todavía no hay cobro con tarjeta para profesionales.
- **Equipo:** invitar por mail como Editor (crea y edita, publica) o Solo lectura. Límite de usuarios contando al dueño:
  Pro 2, Studio 10.
- **Marca:** logo (PNG/JPG/WEBP hasta 1,5 MB), nombre, texto del pie, y con Studio: marca blanca y «no mostrar pie».
- **Cuenta:** nivel, pase, y contacto con Amo Invitar para extras (diseño a medida, complementos, dominio propio).
- **Qué se ve de Amo Invitar:** en **Pro** el tablero y los paneles de su equipo llevan la marca de Amo Invitar. En
  **Studio** (pase vigente) el tablero y los paneles van sin ella. El **cliente final** nunca la ve.

Código: `src/rutas/empresa.js` (API), `src/pro/empresa.js` (créditos, marca efectiva), `src/pro/compras.js` (pedidos),
`public/empresa/index.html`. Los paneles de eventos de empresa reciben `empresa: { limpio, puedePublicar… }` en
`GET /api/panel/<id>` y `panel.js` aplica el modo limpio.

## 10. Consola de administración (`/admin/`)

Entra un administrador (`ADMINS`) con su sesión, o quien tenga la clave `ADMIN_CLAVE`. Pestañas:

| Pestaña | Qué hace |
|---|---|
| Resumen | ventas del año (con y sin IVA), por mes, medio y país; pendientes; invitaciones por plan; vencen en 30 días |
| Pedidos | buscar y filtrar; marcar transferencia cobrada, cancelar, reembolsado (solo lo anota), emitir factura, reenviar mail |
| Facturas | período por año o trimestre, libro en Excel, PDF del período, estado de VeriFactu y del umbral OSS, ver y reenviar cada una |
| Cupones | crear (porcentaje o fijo, planes, usos máximos, vencimiento), activar, desactivar, borrar (con usos se da de baja) |
| Invitaciones | superusuario: cambiar plan sin cobrar, extender el vencimiento, publicar o despublicar, dar complementos, cambiar el link, dar acceso a otro mail, eliminar |
| Clientes | buscar y ver su ficha: invitaciones y pedidos |
| Consultas | mensajes del formulario de contacto, responder y marcar |
| Profesionales | aprobar o rechazar solicitudes, empresas (créditos, pase, suspender) y pedidos de créditos por cobrar |
| Diseños a medida | aprobar proyectos (avisa al cliente) y marcar listos |
| Registro | todo lo que cambió el administrador |

Código: `src/rutas/superadmin.js`, `src/rutas/consola.js`, `src/rutas/admin.js` (facturas), `public/admin/index.html`.
Tablas: `solicitudes_pro`, `empresas_pro`, `creditos_lotes`, `compras_pro`, `consultas`, `admin_log`
(`migrations/0005` y `0006`; también se crean solas al primer uso).

## 11. Ronda 87 (tablero, cliente final, DEMO, créditos de complementos)
- **Datos extra por empresa**: `app_state` clave `pro-extra:<empresaId>` → `{ demo, habilitado, saldo: { diseno: n, … }, historial }`
  (`src/pro/extras.js`). Sin migraciones.
- **Créditos de complementos** (precios sin IVA en `COMPLEMENTOS_PRO`): cambio de diseño 17, idioma 6 (cada uno),
  agradecimiento 13, STD tarjeta 5, STD foto 13, STD web 18, a medida invitación 120, a medida STD web 50, a medida STD
  tarjeta 30. Ocultos en el tablero hasta que el admin toca «Habilitar la compra de complementos»; «Regalar créditos de
  complementos» suma saldo sin cargo (negativo descuenta; así se descuenta a mano el diseño a medida). Se compran de a 1
  o de a 5 (`comp-<id>` / `comp-<id>-5` en `catalogoCompras`; `pagarCompra` suma saldo). Se gastan solos al publicar
  (`publicarConCredito` → `cubrirComplementos`, todo o nada) o al guardar una invitación ya publicada con un complemento
  nuevo: el id queda en `datos.extras` (como pagado). El video de portada no se cobra en eventos de empresa (por eso
  no tiene crédito, aunque el dueño lo listó a 5 €).
- **DEMO**: /admin → «Modo DEMO» pone Studio (pase de 1 mes si no tiene) y 1 crédito si no tiene. No publica (403 con
  mensaje), el panel ofrece «Ver vista previa (DEMO)», el dominio propio no se conecta y el tablero muestra la cinta DEMO.
- **Studio** siempre es marca blanca (invitación y panel del cliente sin Amo Invitar). Sin Studio (Pro, o pase vencido),
  el cliente final ve el logo de Amo Invitar (sin link).
- **Marca**: `marca.color` (pie de las invitaciones, texto oscuro si es claro; `colorPie` en `bloques.js`) y
  `marca.paleta` (`negro|azul|rojo|dorado`, cambia `--acento` del panel del cliente; el resto sale con `color-mix`).
  Con logo, el nombre no se usa en el pie.
- **Cliente final**: `conClaveCliente` en el GET del panel → `empresaContexto(…, null)`; `S.empresa.cliente`. El
  esquema se filtra en el navegador (`paraCliente`). Publicar sin permiso responde 403 antes de revisar lo que falta.
- **Dominio propio**: `dominioPropio` deja pasar `/panel/<ev>`, `/api/panel/<ev>/…`, `/vista/<ev>` (solo eventos de esa
  empresa), los archivos de `/panel/` y las banderas. El «Link para el cliente» del tablero usa el dominio activo.

## 12. Ronda 88
- **Tablero en la moneda del país** (`monedaTablero` en `src/rutas/empresa.js`: cookies `pais_sel`/`cur` o la IP): los
  precios netos se muestran convertidos (`D.moneda.precios[eur]`, función `pr()` del tablero) y «+ IVA» solo en España y la
  UE. Lo que se cobra y se factura sigue en euros. Las frases del tablero van en partes (texto fijo / valor) para que
  `regional.js` las traduzca.
- **DEMO**: al prenderla se guarda `previo` (nivel y pase) en `pro-extra:<id>`; al quitarla vuelve a ese nivel.
- **Suspendida**: el panel de sus eventos responde 423 (el panel muestra el motivo), sus invitaciones dan
  «no disponible» (503) y el tablero muestra el aviso y oculta las acciones. El admin puede «Subir a Studio» / «Bajar a Pro».
- **Panel del cliente final**: cargador gris (`#cargador`) hasta aplicar colores, logo y botones del profesional. Logo
  del profesional también en Pro, con «Powered by Amo Invitar» chiquito abajo a la derecha de la barra (`.powered`);
  en Studio nada de Amo Invitar.
- **Pie de invitaciones Pro**: el pie de Amo Invitar del modelo se oculta (`data-no="marca.sinPieAmo"` en todos los
  modelos; `marcaEfectiva` pone `sinPieAmo` en Pro y Studio) y `pieMarca` agrega debajo del logo del profesional
  «Powered by (logo)» y «© año | amoinvitar.com», más chico.
- **Muestrario** (`src/pro/muestrario.js`, `public/muestrario/index.html`): `/muestrario/<empresaId>` público para
  compartir con el cliente; eventos con sus modelos armados desde `MODELOS` (un modelo nuevo aparece solo), miniaturas
  de la web (`/web/img/ci/p_*.jpg`, con las de la app de respaldo) y vista previa `/demo/<modelo>?marca=no` (sin pie
  ni marca de Amo Invitar). En Pro, «Powered by» chico al pie. Studio con dominio activo: solo desde su dominio (en
  amoinvitar.com redirige). Botón «Catálogo» en la pestaña Eventos del tablero.

## 13. Ronda 89
- **Vista del cliente con el link del cliente**: si la URL trae `?k=` (o la cabecera `x-clave`) válida, el panel se arma
  como cliente aunque haya sesión del profesional o del admin (`conClaveCliente` en `src/index.js`). Sin clave, el
  profesional ve su vista. La respuesta del panel trae `empresa.id` y `empresa.host` (dominio Studio activo o `null`).
- **Dominio propio en el panel** (Studio, sin DEMO): `dominioInv()` en `panel.js` usa `S.empresa.host` en el ejemplo de
  link, el prefijo del slug y la miniatura de WhatsApp; `admin.js` arma los links con ese dominio y al publicar el link
  devuelto se reescribe al dominio. No se pudo probar con un dominio real en la compu.
- **País por IP**: `conPais()` agrega `<html data-pais="XX">` (cabecera `cf-ipcountry`) en `/panel/`, `/empresa` y el
  muestrario; `selector-pais.js` lo usa si no hay cookie `pais_sel`.
- **Cambiador de modelos en eventos de empresa**: sin «También en plan gratis», la tarjeta «Diseño a medida» sin precio y
  con «Solicitar» (abre WhatsApp «Quiero contratar un extra · Empresa: …»). El servidor rechaza `a-medida` del
  profesional o su cliente (403); solo el admin lo activa. Texto al pie con «aquí» → `/muestrario/<empresaId>`.
- **Volver de a medida a catálogo** (todos los clientes): mientras no se haya enviado el proyecto, la acción `modelo`
  pasa `producto` a `invitacion` y el GET devuelve los modelos de catálogo; el panel muestra «Diseño a medida · cambiar».
- Paleta **violeta** (`#6b4c9a`) en tablero, panel y muestrario. Sin selector «Usar link de álbum propio» en Pro
  (queda solo el campo del link). «Powered by» en línea a la izquierda del globo (escritorio) y chiquito abajo a la
  derecha (celular). Margen del logo propio sin botón de volver. Fondo vacío del precio oculto (`[hidden]`).
- **Tablero y /admin**: barra superior fija verde con logo blanco (`overflow-x: clip` para que `sticky` funcione);
  correo largo con «…» en celular. Segundo nombre de «Crear evento» oculto si no es boda (`[hidden]{display:none!important}`).
- **Pase Studio**: «Subir a Studio» sin pase vigente da 12 meses; la aprobación propone 12 meses. DEMO sigue dando 1 mes
  (por eso aparecía «Pase hasta 16/12/2026» en una cuenta de prueba).
- **Web**: página nueva `/diseno-a-medida` (bloque `escribe('diseno-a-medida', …)` en `scripts/sitio/construir.mjs`, con
  `E.medida` en `pasos()`/`comoFunciona()`; sus botones abren el modal con `data-medida`). Menú Invitaciones en
  minúsculas con «Diseño a medida», divisor, «Para profesionales» e «Ideas y frases» (celular: dos columnas). Selector
  de país más fino: negro translúcido sobre la cabecera transparente y verde claro sobre la blanca.

## 14. Ronda 90–91 · Corporativo, a medida y vista previa provisoria
- **Modelo Corporativo** (`public/modelos/corporativo/`, `kit: true` en `src/modelos.js`): la plantilla general de los
  eventos de empresa (de la plantilla del dueño). Reemplaza a Snow, AI Travel, Aquasalud, Liseth y Prave (quitados).
  Es la base de «Diseño propio» de toda invitación corporativa. No aparece en catálogo, tienda, muestrario ni «Cambiar
  modelo». Fondos: variables `--fondo-*` / `--img-*` en `corporativo.css` (sin imagen: `--img-x: none`) y archivos
  `img/fondo-confirmacion.jpg`, `fondo-itinerario.jpg`, `fondo-fotos.jpg`, `fondo-acceso.jpg`.
- Logo o texto en **portada** (`fotos.logo`) y **cierre** (`fotos.logoPie` + `textos.pie.titulo`): campos del panel
  corporativo (`paraCorporativo` en `src/panel/esquemas.js`); el motor los expone en `fotos.logo`/`fotos.logoPie`.
- Panel corporativo: un solo nombre («Nombre del evento o de la empresa»), «Relato inicial o historia», solo las secciones
  de la plantilla (`SECCIONES_CORP` / `MODELO_A_MEDIDA_CORP`: sin regalos, redes ni anfitriones). A medida y corporativo:
  sin hablar de planes (`sinPlanes`). Íconos de itinerario corporativos nuevos (presentación, networking, laptop, empresa,
  resultados: `scripts/iconos-itinerario.mjs`, grupo `corporativo`).
- **Textos corporativos** en todos los idiomas: `src/textos/corporativo.js` (última capa de `diccionario('empresarial')`;
  también `perdiste.ubicacion/galeria/historia`, `cuenta.comienza` y `provisorio.aviso` para todos).
- **Vista previa provisoria**: a medida y corporativo sin diseño activo se ven con `public/modelos/provisorio/` (o
  `provisorio-corp/`, copia de corporativo): verde oscuro, letras blancas, aviso arriba, con lo que el cliente completa.
  Si se cambia `corporativo`, rearmar `provisorio-corp` (mismo HTML con `provisorio.css` y el aviso).
- **«Lista» = diseño propio activo**: consola (`/api/admin/medidas/<id>/lista`) y panel (`medidaLista`) activan el diseño
  propio; sin modelo base, 409. Una invitación a medida no se publica sin el diseño activo (409).
- Consola → Diseño propio: «Lo que pidió el cliente» muestra la idea completa (brief: temática, estilo, colores,
  tipografía, imágenes, links) y sus colores/fuente se pueden cargar en «Colores y tipografías».
- Consola → plan de una invitación a medida: solo «Pagada (Deluxe)» o «Sin pagar». Resumen del panel: «ya está pagado»,
  «se paga al enviar a producción».
- Eventos empresariales: sin sobre de apertura (ventana de bienvenida si hay música), sin regalos ni redes; WhatsApp y
  accesos de Administración con textos de empresa. A medida para boda pide dos nombres al empezar.
- Galería del panel: el cuadro «Agregar» ya no se sale de su columna con fotos 3:2 / 2:3.

## 15. Pendiente

Dominio propio por empresa (Studio). Ya están el cobro online (tarjeta, PayPal, Mercado Pago) y el aviso de vencimiento de créditos
(ver `docs/precios-y-recuerdo.md`).
