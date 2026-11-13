# Diseño propio de una invitación (README ronda 57)

Para cambios de colores y tipografía (complemento «Cambios de diseño»), diseños **a medida** y **corporativos**, o
cualquier ajuste puntual de una invitación. Consola → Invitaciones → la invitación → **«Diseño propio»**
(o Diseños a medida → «Diseño propio»). Página: `/admin/diseno.html?id=<evento>`.

## Cómo funciona
- Cada invitación puede tener su carpeta propia (R2 `propio/<evento>/`) **encima** de la del modelo base: lo que se sube
  con la misma ruta reemplaza al archivo del modelo (`img/separador.png`, `estilo.css`, `index-premium.html`,
  `modelo.json`…); lo que no se sube sigue saliendo del modelo; lo nuevo se suma.
- La invitación usa `/propio/<evento>~<versión>~<modelo base>/…` (cambia la versión con cada subida: nada viejo en caché).
- **CSS extra**: va al final del `<head>` y gana sobre todo. **HTML extra en el `<head>`**: Google Fonts, scripts, metas.
- **Plantilla HTML**: por defecto la del evento y el plan (index-<tipo>-<plan>.html…); se puede fijar una para todo.
- Sin activar, solo lo ve el administrador en «Vista previa con el diseño propio» (`/vista/<id>?k=…&propio=1`).
- El cliente sigue editando todo en su panel (textos, fotos, lista…): el HTML conserva las marcas `data-*`.

## Pasos
1. Elegir el **modelo base** (en a medida/corporativo, el más parecido) y «Guardar ajustes».
2. **Descargar kit** (.zip con el diseño actual + LEEME.txt), editar en la compu.
3. **Subir** el .zip entero, una carpeta o archivos sueltos (con «solo los que cambiaron» se saltean los iguales).
4. Revisar en la vista previa → **Activar** (a medida/corporativo: también marca «Lista» y publica si tiene link).
- «quitar» un archivo vuelve el del modelo; «Desactivar» vuelve todo el modelo; «Borrar todo» elimina lo subido.
- La lista de archivos de cada modelo para el kit: `public/modelos/archivos.json` (se genera con `npm run sitio`).
