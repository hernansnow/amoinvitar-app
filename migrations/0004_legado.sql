-- README (ronda 30) · Etapa 2: canciones sugeridas en las invitaciones del sistema viejo (antes a-musica.php las
-- agregaba a canciones.txt en la carpeta de cada invitación). "carpeta" es la ruta de la invitación en el sitio viejo.
CREATE TABLE IF NOT EXISTS legado_canciones (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  carpeta TEXT NOT NULL,
  texto   TEXT NOT NULL,
  creado  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS legado_canciones_carpeta ON legado_canciones (carpeta);
