// Dónde se guardan los eventos, invitados, respuestas y archivos.
// En Cloudflare: D1 (base) y R2 (fotos y MP3). Para probar en la compu,
// servidor-local.mjs pasa un almacén en memoria con la misma forma.

const fila = (r) => r && {
  id: r.id, producto: r.producto, tipo: r.tipo, slug: r.slug, modelo: r.modelo, paquete: r.paquete,
  aMedida: r.a_medida, estado: r.estado, clave: r.clave_panel, empresaId: r.empresa_id,
  datos: JSON.parse(r.datos || '{}'), vence: r.vence,
};

export function almacenD1(env) {
  const db = env.DB;
  return {
    async evento(id) { return fila(await db.prepare('SELECT * FROM eventos WHERE id = ?').bind(id).first()); },
    async eventoPorSlug(tipo, slug) { return fila(await db.prepare('SELECT * FROM eventos WHERE tipo = ? AND slug = ?').bind(tipo, slug).first()); },
    async slugOcupado(tipo, slug, excepto) {
      return !!(await db.prepare('SELECT 1 FROM eventos WHERE tipo = ? AND slug = ? AND id != ?').bind(tipo, slug, excepto || '').first());
    },
    async guardarEvento(e) {
      const ahora = new Date().toISOString();
      await db.prepare(`INSERT INTO eventos (id, producto, tipo, slug, modelo, paquete, a_medida, estado, clave_panel, empresa_id, datos, vence, creado, actualizado)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13)
        ON CONFLICT(id) DO UPDATE SET slug = ?4, paquete = ?6, estado = ?8, datos = ?11, vence = ?12, actualizado = ?13`)
        .bind(e.id, e.producto, e.tipo, e.slug ?? null, e.modelo ?? null, e.paquete, e.aMedida ?? null, e.estado, e.clave, e.empresaId ?? null, JSON.stringify(e.datos), e.vence ?? null, ahora).run();
    },
    async invitados(id) {
      const { results } = await db.prepare('SELECT codigo, nombre, pases, mesa, pin FROM invitados WHERE evento_id = ? ORDER BY orden').bind(id).all();
      return results;
    },
    async invitado(id, codigo) { return db.prepare('SELECT codigo, nombre, pases, mesa, pin FROM invitados WHERE evento_id = ? AND codigo = ?').bind(id, codigo).first(); },
    async guardarInvitados(id, lista) {
      await db.batch([
        db.prepare('DELETE FROM invitados WHERE evento_id = ?').bind(id),
        ...lista.map((i, n) => db.prepare('INSERT INTO invitados (evento_id, codigo, nombre, pases, mesa, pin, orden) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .bind(id, i.codigo, i.nombre, i.pases, i.mesa ?? null, i.pin ?? null, n)),
      ]);
    },
    async guardarRespuesta(id, tipo, datos) {
      await db.prepare('INSERT INTO respuestas (evento_id, tipo, datos, creado) VALUES (?, ?, ?, ?)').bind(id, tipo, JSON.stringify(datos), new Date().toISOString()).run();
    },
    async respuestas(id) {
      const { results } = await db.prepare('SELECT tipo, datos, creado FROM respuestas WHERE evento_id = ? ORDER BY creado DESC').bind(id).all();
      return results.map((r) => ({ ...r, datos: JSON.parse(r.datos) }));
    },
    async empresa(id) {
      const r = id && await db.prepare('SELECT * FROM empresas WHERE id = ?').bind(id).first();
      return r && { ...r, marca: JSON.parse(r.marca || '{}') };
    },
    async subir(clave, cuerpo, tipo) { await env.MEDIA.put(clave, cuerpo, { httpMetadata: { contentType: tipo, cacheControl: 'public, max-age=31536000, immutable' } }); },
    async archivo(clave) {
      const o = await env.MEDIA.get(clave);
      return o && { cuerpo: o.body, tipo: o.httpMetadata?.contentType || 'application/octet-stream' };
    },
  };
}

// Mismo almacén, en memoria (para npm run local)
export function almacenMemoria() {
  const eventos = new Map(), invitados = new Map(), respuestas = new Map(), archivos = new Map(), empresas = new Map();
  return {
    _empresas: empresas,
    async evento(id) { return eventos.has(id) ? structuredClone(eventos.get(id)) : null; },
    async eventoPorSlug(tipo, slug) { return [...eventos.values()].find((e) => e.tipo === tipo && e.slug === slug) || null; },
    async slugOcupado(tipo, slug, excepto) { return [...eventos.values()].some((e) => e.tipo === tipo && e.slug === slug && e.id !== excepto); },
    async guardarEvento(e) { eventos.set(e.id, structuredClone(e)); },
    async invitados(id) { return invitados.get(id) || []; },
    async invitado(id, codigo) { return (invitados.get(id) || []).find((i) => i.codigo === codigo) || null; },
    async guardarInvitados(id, lista) { invitados.set(id, lista); },
    async guardarRespuesta(id, tipo, datos) { (respuestas.get(id) || respuestas.set(id, []).get(id)).unshift({ tipo, datos, creado: new Date().toISOString() }); },
    async respuestas(id) { return respuestas.get(id) || []; },
    async empresa(id) { return empresas.get(id) || null; },
    async subir(clave, cuerpo, tipo) { archivos.set(clave, { cuerpo: new Uint8Array(await new Response(cuerpo).arrayBuffer()), tipo }); },
    async archivo(clave) { return archivos.get(clave) || null; },
  };
}
