# Web nueva (etapa 2)

Las páginas de la web nueva van en esta carpeta y se ven en la raíz del dominio:
`public/sitio/bodas.html` → `amoinvitar.com/bodas`, `public/sitio/index.html` → `amoinvitar.com/`.

- Tienen prioridad sobre las del sitio viejo con la misma ruta: se reemplazan de a una.
- Lo que todavía no está acá sale del sitio viejo (bucket R2 `LEGADO`), con sus css y scripts.
- Para que esté activo: variable `SITIO_PROPIO = "1"` y el bucket `LEGADO` en `wrangler.jsonc`.
- Ver `docs/etapa-2-web.md`.
