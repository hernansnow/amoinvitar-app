// Imitación local de D1 (base) y R2 (archivos) para probar sin Cloudflare.
// Usa el SQLite que trae Node: la misma base y las mismas consultas que en producción.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

const valor = (v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);

class Consulta {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...args) { return new Consulta(this.db, this.sql, args.map(valor)); }
  async first(col) { const r = this.db.prepare(this.sql).get(...this.args); return r ? (col ? r[col] : { ...r }) : null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args).map((r) => ({ ...r })) }; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; }
}

// Aplica las migraciones en orden, igual que Cloudflare
export function d1Local(archivo = ':memory:', carpeta = new URL('../migrations/', import.meta.url)) {
  const db = new DatabaseSync(archivo);
  for (const f of readdirSync(carpeta).filter((x) => x.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(f, carpeta), 'utf8'));
  return {
    prepare: (sql) => new Consulta(db, sql),
    async batch(lista) {
      db.exec('BEGIN');
      try { const r = []; for (const c of lista) r.push(await c.run()); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    exec: async (sql) => db.exec(sql),
  };
}

export function r2Local() {
  const m = new Map();
  return {
    async put(clave, cuerpo, op = {}) { m.set(clave, { datos: new Uint8Array(await new Response(cuerpo).arrayBuffer()), httpMetadata: op.httpMetadata || {} }); },
    async get(clave) { const o = m.get(clave); return o ? { body: o.datos, httpMetadata: o.httpMetadata } : null; },
  };
}
