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
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  nombre     TEXT,
  google_sub TEXT,
  pais       TEXT,
  creado     INTEGER NOT NULL            -- segundos desde 1970
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

-- ── Login: sesiones y links de acceso por mail ────────────────────────
CREATE TABLE IF NOT EXISTS sesiones (
  id         TEXT PRIMARY KEY,           -- hash SHA-256 del token de la cookie
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  vence      INTEGER NOT NULL,
  creado     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sesiones_usuario ON sesiones (usuario_id);

CREATE TABLE IF NOT EXISTS tokens_login (
  token_hash TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  siguiente  TEXT,                       -- a dónde volver después de entrar
  vence      INTEGER NOT NULL,
  usado      INTEGER
);

-- ── Tienda ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
  id          TEXT PRIMARY KEY,
  numero      INTEGER UNIQUE,            -- número visible (desde 1001)
  usuario_id  TEXT REFERENCES usuarios(id),
  email       TEXT NOT NULL,
  tipo        TEXT NOT NULL,             -- nuevo | mejora
  detalle     TEXT NOT NULL,             -- JSON: producto, tipo de evento, modelo, paquete, extras
  evento_id   TEXT,                      -- se completa al cobrar (o el evento que se mejora)
  medio       TEXT NOT NULL,             -- stripe | paypal | mercadopago | transferencia | gratis | cupon
  moneda      TEXT NOT NULL,
  importe     REAL NOT NULL,             -- lo que paga, en la moneda cobrada
  iva         REAL NOT NULL DEFAULT 0,   -- IVA incluido en el importe
  iva_tasa    REAL NOT NULL DEFAULT 0,
  eur         REAL NOT NULL,             -- precio de lista en euros (para reportes y mejoras)
  cupon       TEXT,
  descuento   REAL NOT NULL DEFAULT 0,
  pais        TEXT,                      -- ubicación real del cliente (IVA, factura)
  factura     TEXT,                      -- JSON opcional: nombre, NIF/CUIT, dirección
  ref_externa TEXT,                      -- id de la pasarela
  estado      TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | pagado | cancelado
  creado      INTEGER NOT NULL,
  pagado      INTEGER
);
CREATE INDEX IF NOT EXISTS pedidos_usuario ON pedidos (usuario_id);
CREATE INDEX IF NOT EXISTS pedidos_estado ON pedidos (estado);

CREATE TABLE IF NOT EXISTS cupones (
  codigo   TEXT PRIMARY KEY,
  clase    TEXT NOT NULL,                -- porcentaje | fijo (fijo en euros)
  valor    REAL NOT NULL,
  paquetes TEXT,                         -- separados por coma; vacío = todos
  max_usos INTEGER,
  usos     INTEGER NOT NULL DEFAULT 0,
  vence    INTEGER,
  activo   INTEGER NOT NULL DEFAULT 1,
  nota     TEXT,
  creado   INTEGER NOT NULL
);

-- Cotizaciones (base USD), se renuevan cada hora
CREATE TABLE IF NOT EXISTS fx (
  id      INTEGER PRIMARY KEY,
  datos   TEXT NOT NULL,
  creado  INTEGER NOT NULL
);
