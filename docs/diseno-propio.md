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

## Colores y tipografías (README ronda 59)
- Los modelos escriben sus colores directo en el CSS y el HTML (no usan variables `--color-…`): por eso el cambio de
  colores se hace en «Colores y tipografías»: cada color del modelo → otro (se aplica en el CSS, los SVG y la página,
  en #hex, #hex corto, #hex con transparencia, rgb() y rgba(), conservando la transparencia). Igual con las fuentes
  (se carga el catálogo `/comun/fonts/catalogo/catalogo.css`).
- «Usar estos colores y tipografía» carga lo que pidió el cliente: la paleta original del modelo (modelo.json → paleta) →
  los colores que eligió en el mismo orden, y la fuente de títulos → la suya.
- Las imágenes PNG/JPG no se recolorean: se suben con el mismo nombre.
- (README ronda 65) Los colores del **sobre de apertura** (modelo.json → sobre.colores: lacre, papel, fondo) aparecen en la
  lista marcados con ✉ y cambian como cualquier otro: van en la página armada, que también se recolorea.
- (README ronda 63) Un archivo que se llama igual que uno del modelo va solo a la carpeta de ese (subir la carpeta `img`
  entera o imágenes sueltas ya no las deja en la raíz). En «Subidos» cada archivo dice si reemplaza al del modelo, si
  es nuevo o si quedó en otra carpeta («mover ahí» / «Mover todos a su carpeta»).
- **Cada uso por separado** (README ronda 61): el «×N ▾» de cada color abre la lista de lugares del CSS donde aparece
  (propiedad · selector, p. ej. `color · .text-lila-fuerte`), cada uno con su propio color. Vacío = sigue al color del
  grupo; lo que se pone ahí gana sobre el grupo (poner el mismo color original lo deja como estaba). Se guarda en
  `propio.puntuales = [['estilo.css|selector|propiedad|n', desde, hacia]]`. Los usos dentro del HTML cambian solo con
  el grupo. Si se sube un CSS modificado, los usos se cuentan sobre el del modelo base: revisar la vista previa.
- **Tamaño de cada fuente** (README ronda 60): el % al lado de cada fuente (30–250, 100 = sin cambio). Se crea una
  copia de la fuente con `size-adjust` (p. ej. «Amsterdam Four AI70») y se usa en toda la invitación, sin tocar las
  clases del modelo. Sirve también sin fuente nueva, para achicar o agrandar la original. Si no encuentra el archivo de
  la fuente (catálogo o CSS del modelo), avisa: usar una del catálogo o ajustarla en el CSS extra.

## Pasos
1. Elegir el **modelo base** (en a medida/corporativo, el más parecido) y «Guardar ajustes».
2. **Descargar kit** (.zip con el diseño actual + LEEME.txt), editar en la compu.
3. **Subir** el .zip entero, una carpeta o archivos sueltos (con «solo los que cambiaron» se saltean los iguales).
4. Revisar en la vista previa → **Activar** (a medida/corporativo: también marca «Lista» y publica si tiene link).
- «quitar» un archivo vuelve el del modelo; «Desactivar» vuelve todo el modelo; «Borrar todo» elimina lo subido.
- La lista de archivos de cada modelo para el kit: `public/modelos/archivos.json` (se genera con `npm run sitio`).
