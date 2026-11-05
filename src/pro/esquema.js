// README (ronda 33) · Tablas de los profesionales. Es lo mismo que migrations/0005_profesionales.sql.
// Se aseguran también al primer uso (CREATE … IF NOT EXISTS) para que funcionen aunque la migración todavía no se haya
// aplicado en Cloudflare. Si se cambia una, cambiar las dos.
export const TABLAS_PRO = [
  // Pedidos de cuenta profesional: se aprueban a mano desde /admin
  `CREATE TABLE IF NOT EXISTS solicitudes_pro (
    id          TEXT PRIMARY KEY,
    nombre      TEXT NOT NULL,
    email       TEXT NOT NULL,
    telefono    TEXT,
    empresa     TEXT,
    web         TEXT NOT NULL,            -- su página web o red social
    rubro       TEXT NOT NULL,            -- planner | fotografia | salon | agencia | otro
    profesion   TEXT,
    descripcion TEXT NOT NULL,            -- a qué se dedica y cómo trabaja
    nivel       TEXT NOT NULL DEFAULT 'pro', -- el que pide: pro | studio
    pais        TEXT,
    estado      TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | aprobada | rechazada
    empresa_id  TEXT,
    nota        TEXT,
    creado      TEXT NOT NULL,
    resuelto    TEXT
  )`,
  // Nivel, pase anual y estado de cada empresa (la empresa en sí está en «empresas»)
  `CREATE TABLE IF NOT EXISTS empresas_pro (
    empresa_id TEXT PRIMARY KEY REFERENCES empresas(id),
    nivel      TEXT NOT NULL DEFAULT 'pro',   -- pro | studio
    pase_vence TEXT,                           -- solo Studio (pase anual)
    estado     TEXT NOT NULL DEFAULT 'activa', -- activa | suspendida
    dominio    INTEGER NOT NULL DEFAULT 0,     -- 1 = dominio propio configurado
    creado     TEXT NOT NULL
  )`,
  // Créditos por lotes: cada compra vence a los 12 meses (si se renueva el pase antes, los que sobran pasan al año siguiente)
  `CREATE TABLE IF NOT EXISTS creditos_lotes (
    id         TEXT PRIMARY KEY,
    empresa_id TEXT NOT NULL REFERENCES empresas(id),
    cantidad   INTEGER NOT NULL,
    usados     INTEGER NOT NULL DEFAULT 0,
    comprado   TEXT NOT NULL,
    vence      TEXT NOT NULL,
    origen     TEXT,                           -- pack-5 | pack-10 | studio-25 | manual …
    nota       TEXT
  )`,
  'CREATE INDEX IF NOT EXISTS creditos_lotes_empresa ON creditos_lotes (empresa_id, vence)',
];

let listo = false;
export async function asegurarTablasPro(env) {
  if (listo) return;
  await env.DB.batch(TABLAS_PRO.map((s) => env.DB.prepare(s)));
  listo = true;
}
