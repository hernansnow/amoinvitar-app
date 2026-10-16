-- Base de datos de Amo Invitar 2.0 (D1).

CREATE TABLE IF NOT EXISTS eventos (
  id          TEXT PRIMARY KEY,          -- ev_8f3k2q
  producto    TEXT NOT NULL,             -- invitacion | a-medida | std-web | std-tarjeta | std-foto | std-video | agradecimiento…
  tipo        TEXT NOT NULL,             -- boda, 15, bautismo, comunion, cumple… (para STD: save-the-date)
  slug        TEXT,                      -- sofi-y-ale (solo productos web)
  modelo      TEXT,                      -- garden (vacío en diseño a medida hasta que se diseña)
  paquete     TEXT NOT NULL,             -- gratis | basic | premium | deluxe
  a_medida    TEXT,                      -- personalizado | empresarial | personaje
  estado      TEXT NOT NULL DEFAULT 'borrador', -- borrador | en-diseno | publicado | vencido
  clave_panel TEXT NOT NULL,             -- token del link del panel (hasta que esté el login)
  empresa_id  TEXT REFERENCES empresas(id),  -- si lo creó una wedding planner, salón, etc.
  datos       TEXT NOT NULL,             -- JSON con todo lo que carga el cliente
  vence       TEXT,                      -- deja de estar online
  creado      TEXT NOT NULL,
  actualizado TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS eventos_link ON eventos (tipo, slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS eventos_empresa ON eventos (empresa_id);

CREATE TABLE IF NOT EXISTS invitados (
  evento_id TEXT NOT NULL REFERENCES eventos(id),
  codigo    TEXT NOT NULL,               -- lo que va en ?inv=
  nombre    TEXT NOT NULL,
  pases     INTEGER NOT NULL DEFAULT 0,
  mesa      TEXT,
  pin       TEXT,
  orden     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (evento_id, codigo)
);

CREATE TABLE IF NOT EXISTS respuestas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id TEXT NOT NULL,
  tipo      TEXT NOT NULL,               -- rsvp | cancion
  datos     TEXT NOT NULL,
  creado    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS respuestas_evento ON respuestas (evento_id, tipo);

-- ── Empresas: wedding planners, salones, fotógrafos, agencias ─────────
-- Ver docs/empresas.md
CREATE TABLE IF NOT EXISTS empresas (
  id         TEXT PRIMARY KEY,           -- em_x7k2
  nombre     TEXT NOT NULL,
  rubro      TEXT,                       -- planner | salon | fotografia | agencia | otro
  plan       TEXT NOT NULL DEFAULT 'inicial',
  creditos   INTEGER NOT NULL DEFAULT 0, -- invitaciones prepagas sin usar
  marca      TEXT NOT NULL DEFAULT '{}', -- JSON: logo, colores, nombre visible, pie, dominio
  dominio    TEXT UNIQUE,                -- invitaciones.salonlaesperanza.com (opcional)
  creado     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usuarios (
  id     TEXT PRIMARY KEY,
  email  TEXT NOT NULL UNIQUE,
  nombre TEXT,
  creado TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS miembros (
  empresa_id TEXT NOT NULL REFERENCES empresas(id),
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  rol        TEXT NOT NULL DEFAULT 'editor', -- duenio | editor | lectura
  PRIMARY KEY (empresa_id, usuario_id)
);

-- Quién puede editar cada evento (el cliente final, o gente de la empresa)
CREATE TABLE IF NOT EXISTS accesos_evento (
  evento_id  TEXT NOT NULL REFERENCES eventos(id),
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  rol        TEXT NOT NULL DEFAULT 'cliente', -- cliente | editor | lectura
  PRIMARY KEY (evento_id, usuario_id)
);
