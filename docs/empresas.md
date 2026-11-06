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

## 11. Pendiente

Cobro con tarjeta o PayPal de créditos y pase, dominio propio por empresa (Studio) y el aviso de vencimiento de créditos
por mail. Ver el orden en la sección 7.
