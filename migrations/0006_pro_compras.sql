-- README (ronda 35) · Compras de créditos y pase de los profesionales, y consultas del formulario de contacto.
-- Es lo mismo que src/pro/esquema.js (que también las crea al primer uso). Si se cambia una, cambiar las dos.

CREATE TABLE IF NOT EXISTS compras_pro (
  id          TEXT PRIMARY KEY,
  numero      INTEGER NOT NULL,             -- número visible (desde 5001)
  empresa_id  TEXT NOT NULL REFERENCES empresas(id),
  usuario_id  TEXT,
  item        TEXT NOT NULL,                -- pro-1 | pro-5 | pro-10 | studio-10 | … | pase
  creditos    INTEGER NOT NULL DEFAULT 0,
  neto        REAL NOT NULL,                -- en euros, sin IVA
  iva_tasa    REAL NOT NULL DEFAULT 0,
  iva         REAL NOT NULL DEFAULT 0,
  total       REAL NOT NULL,
  pais        TEXT,
  fiscal      TEXT,                         -- JSON: nombre, NIF/CIF, dirección
  inversion   INTEGER NOT NULL DEFAULT 0,   -- empresa de la UE con IVA válido: sin IVA
  estado      TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | pagada | cancelada
  medio       TEXT,
  nota        TEXT,
  factura     TEXT,                         -- id de la factura emitida
  creado      TEXT NOT NULL,
  pagada      TEXT
);
CREATE INDEX IF NOT EXISTS compras_pro_empresa ON compras_pro (empresa_id, estado);

CREATE TABLE IF NOT EXISTS consultas (
  id       TEXT PRIMARY KEY,
  nombre   TEXT,
  email    TEXT,
  telefono TEXT,
  evento   TEXT,
  pais     TEXT,
  mensaje  TEXT,
  pagina   TEXT,
  estado   TEXT NOT NULL DEFAULT 'nueva',   -- nueva | respondida | archivada
  creado   TEXT NOT NULL
);

-- Registro de lo que cambia el administrador (planes, vencimientos, estados…)
CREATE TABLE IF NOT EXISTS admin_log (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha   TEXT NOT NULL,
  admin   TEXT,
  accion  TEXT NOT NULL,
  objeto  TEXT,
  detalle TEXT
);
