-- README (ronda 38): dominio propio de las empresas Studio. Se crea también solo al primer uso (src/pro/esquema.js).
CREATE TABLE IF NOT EXISTS dominios_pro (
  host       TEXT PRIMARY KEY,                 -- invitaciones.tusalon.com
  empresa_id TEXT NOT NULL REFERENCES empresas(id),
  estado     TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | verificando | activo | error
  token      TEXT,
  cf_id      TEXT,                             -- id del custom hostname en Cloudflare (si se usa la API)
  nota       TEXT,
  error      TEXT,
  creado     TEXT NOT NULL,
  activado   TEXT
);
CREATE INDEX IF NOT EXISTS dominios_pro_empresa ON dominios_pro (empresa_id);
