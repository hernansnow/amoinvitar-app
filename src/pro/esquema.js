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
    dominio    INTEGER NOT NULL DEFAULT 0,     -- 1 = tiene incluida la configuración del dominio propio (pack de 100 créditos o compra de 49 €)
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
  // Compras de créditos y del pase (se pagan por transferencia y se confirman desde /admin)
  `CREATE TABLE IF NOT EXISTS compras_pro (
    id          TEXT PRIMARY KEY,
    numero      INTEGER NOT NULL,
    empresa_id  TEXT NOT NULL REFERENCES empresas(id),
    usuario_id  TEXT,
    item        TEXT NOT NULL,
    creditos    INTEGER NOT NULL DEFAULT 0,
    neto        REAL NOT NULL,
    iva_tasa    REAL NOT NULL DEFAULT 0,
    iva         REAL NOT NULL DEFAULT 0,
    total       REAL NOT NULL,
    pais        TEXT,
    fiscal      TEXT,
    inversion   INTEGER NOT NULL DEFAULT 0,
    estado      TEXT NOT NULL DEFAULT 'pendiente',
    medio       TEXT,
    nota        TEXT,
    factura     TEXT,
    creado      TEXT NOT NULL,
    pagada      TEXT
  )`,
  'CREATE INDEX IF NOT EXISTS compras_pro_empresa ON compras_pro (empresa_id, estado)',
  // Dominio propio de las empresas Studio (README ronda 38): un dominio o subdominio por empresa
  `CREATE TABLE IF NOT EXISTS dominios_pro (
    host       TEXT PRIMARY KEY,
    empresa_id TEXT NOT NULL REFERENCES empresas(id),
    estado     TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | verificando | activo | error
    token      TEXT,
    cf_id      TEXT,
    nota       TEXT,
    error      TEXT,
    creado     TEXT NOT NULL,
    activado   TEXT
  )`,
  'CREATE INDEX IF NOT EXISTS dominios_pro_empresa ON dominios_pro (empresa_id)',
  // Mensajes del formulario de contacto (además del mail)
  `CREATE TABLE IF NOT EXISTS consultas (
    id       TEXT PRIMARY KEY,
    nombre   TEXT,
    email    TEXT,
    telefono TEXT,
    evento   TEXT,
    pais     TEXT,
    mensaje  TEXT,
    pagina   TEXT,
    estado   TEXT NOT NULL DEFAULT 'nueva',
    creado   TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS admin_log (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha   TEXT NOT NULL,
    admin   TEXT,
    accion  TEXT NOT NULL,
    objeto  TEXT,
    detalle TEXT
  )`,
];

let listo = false;
export async function asegurarTablasPro(env) {
  if (listo) return;
  await env.DB.batch(TABLAS_PRO.map((s) => env.DB.prepare(s)));
  listo = true;
}
