-- README (ronda 33) · Profesionales: solicitudes, nivel y pase, créditos por lotes.
-- Es lo mismo que src/pro/esquema.js (que también las crea al primer uso). Si se cambia una, cambiar las dos.

CREATE TABLE IF NOT EXISTS solicitudes_pro (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  email       TEXT NOT NULL,
  telefono    TEXT,
  empresa     TEXT,
  web         TEXT NOT NULL,
  rubro       TEXT NOT NULL,
  profesion   TEXT,
  descripcion TEXT NOT NULL,
  nivel       TEXT NOT NULL DEFAULT 'pro',
  pais        TEXT,
  estado      TEXT NOT NULL DEFAULT 'pendiente',
  empresa_id  TEXT,
  nota        TEXT,
  creado      TEXT NOT NULL,
  resuelto    TEXT
);

CREATE TABLE IF NOT EXISTS empresas_pro (
  empresa_id TEXT PRIMARY KEY REFERENCES empresas(id),
  nivel      TEXT NOT NULL DEFAULT 'pro',
  pase_vence TEXT,
  estado     TEXT NOT NULL DEFAULT 'activa',
  dominio    INTEGER NOT NULL DEFAULT 0,
  creado     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS creditos_lotes (
  id         TEXT PRIMARY KEY,
  empresa_id TEXT NOT NULL REFERENCES empresas(id),
  cantidad   INTEGER NOT NULL,
  usados     INTEGER NOT NULL DEFAULT 0,
  comprado   TEXT NOT NULL,
  vence      TEXT NOT NULL,
  origen     TEXT,
  nota       TEXT
);
CREATE INDEX IF NOT EXISTS creditos_lotes_empresa ON creditos_lotes (empresa_id, vence);
