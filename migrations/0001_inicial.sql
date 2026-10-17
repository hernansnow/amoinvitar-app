-- Base de datos de Amo Invitar 2.0 (D1).
-- Cloudflare la aplica sola al publicar (npm run deploy). Para cambios nuevos: otro archivo 0002_…sql, nunca editar uno ya aplicado.

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
  factura     TEXT,                      -- JSON opcional: tipo (particular/empresa), nombre, NIF/CUIT, dirección
  inversion   INTEGER NOT NULL DEFAULT 0,-- empresa de otro país de la UE con IVA válido: sin IVA (inversión del sujeto pasivo)
  vies        TEXT,                      -- comprobante de la consulta VIES
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

-- ── Facturas (VeriFactu) · igual que en Albunear ──────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY, number TEXT NOT NULL UNIQUE, series TEXT NOT NULL, year INTEGER NOT NULL, seq INTEGER NOT NULL,
  order_id TEXT NOT NULL UNIQUE, event_id TEXT NOT NULL, user_id TEXT NOT NULL, kind TEXT NOT NULL, issued_at INTEGER NOT NULL,
  customer_email TEXT, customer_type TEXT, customer_name TEXT, customer_tax_id TEXT, customer_address TEXT, country TEXT,
  concept TEXT NOT NULL, method TEXT NOT NULL, currency TEXT NOT NULL, total REAL NOT NULL, base REAL NOT NULL, vat REAL NOT NULL, vat_rate REAL NOT NULL,
  eur_rate REAL NOT NULL DEFAULT 1, note TEXT, prev_hash TEXT, hash TEXT NOT NULL,
  vf_mode TEXT, vf_type TEXT, vf_date TEXT, vf_hashed_at TEXT, vf_base TEXT, vf_vat TEXT, vf_total TEXT,
  prev_number TEXT, prev_vf_date TEXT, vf_status TEXT NOT NULL DEFAULT 'off', vf_error TEXT, vf_csv TEXT, vf_sent_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_invoices_issued ON invoices (issued_at);
CREATE INDEX IF NOT EXISTS idx_invoices_event ON invoices (event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_prev ON invoices (prev_hash) WHERE prev_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_vf ON invoices (vf_status);
CREATE TABLE IF NOT EXISTS invoice_seq (series TEXT NOT NULL, year INTEGER NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (series, year));
CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER);
