# Amo Invitar para profesionales (planners, fotógrafos, salones, agencias)

> Estado (ronda 33): **modelo comercial definido**; el tablero `/empresa`, el cobro de créditos y los permisos están
> **por armar**. Ya funciona: pie de marca blanca sin links, límite de 35 invitados en Gratis, tablas base
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

1. **Hecho:** pie sin links y con opción de apagarlo, límite de 35 invitados en Gratis, definición de precios y página `/profesionales`.
2. Migración: pase (`plan`, `vence`), créditos y su historial, dominio, rol cliente-admin.
3. Pantalla **Marca** (logo a R2, texto, interruptor, vista previa; Pro suma logo, Studio quita el pie).
4. Tablero **Eventos** y creación de eventos con crédito.
5. **Equipo** y acceso de administrador para el cliente final.
6. **Panel limpio** (sin Amo Invitar) para el cliente final y para Studio.
7. **Cobro**: créditos, packs, pase anual, dominio (con los medios de pago de siempre).
8. Dominio propio por empresa (Cloudflare for SaaS o rutas por host).

## 8. Puntos a decidir

- **Alta de cuentas Pro:** con 0 € de pase y crédito suelto de 25 € (menos que un Basic de 29 €), cualquiera podría
  hacerse «Pro» para comprar una invitación Deluxe (70 €) por 25 €. Recomendación: **cuentas Pro con aprobación** y
  que el crédito suelto/packs sean solo para cuentas aprobadas.
- **IVA:** ¿los precios son sin IVA para empresas (con IVA válido en la UE el sistema ya factura sin IVA)?
- **Vencimiento** de créditos y del pase: sin definir.
