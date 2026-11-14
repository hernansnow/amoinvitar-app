# Estado del sistema y novedades (para seguir trabajando)

Resumen para quien siga con el proyecto (por ejemplo, cambios de diseño). Actualizado al 14/11/2026, ronda 84.
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
