-- Base de datos de Amo Invitar 2.0 (D1). Primera versión: lo que usa el piloto.

CREATE TABLE IF NOT EXISTS eventos (
  id         TEXT PRIMARY KEY,           -- ej: ev_8f3k2
  tipo       TEXT NOT NULL,              -- boda, 15, bautismo, comunion, cumple…
  slug       TEXT NOT NULL,              -- sofi-y-ale
  modelo     TEXT NOT NULL,              -- garden
  paquete    TEXT NOT NULL,              -- gratis, basic, premium, deluxe
  estado     TEXT NOT NULL DEFAULT 'borrador', -- borrador | publicado | vencido
  datos      TEXT NOT NULL,              -- JSON con todo lo que carga el cliente
  vence      TEXT,                       -- fecha en que deja de estar online
  creado     TEXT NOT NULL,
  actualizado TEXT NOT NULL,
  UNIQUE (tipo, slug)
);

CREATE TABLE IF NOT EXISTS invitados (
  evento_id TEXT NOT NULL REFERENCES eventos(id),
  codigo    TEXT NOT NULL,               -- lo que va en ?inv=
  nombre    TEXT NOT NULL,
  pases     INTEGER NOT NULL DEFAULT 0,
  mesa      TEXT,
  pin       TEXT,
  PRIMARY KEY (evento_id, codigo)
);

CREATE TABLE IF NOT EXISTS respuestas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id TEXT NOT NULL,
  tipo      TEXT NOT NULL,               -- rsvp | cancion
  datos     TEXT NOT NULL,               -- JSON con lo que mandó el invitado
  creado    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS respuestas_evento ON respuestas (evento_id, tipo);
