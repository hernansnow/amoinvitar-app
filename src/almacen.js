// Dónde se guardan los eventos, invitados, respuestas y archivos.
// En Cloudflare: D1 (base) y R2 (fotos y MP3). Para probar en la compu,
// servidor-local.mjs usa la misma base con el SQLite de Node (scripts/d1-local.mjs).

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
    // Quién puede editar cada evento
    async darAcceso(eventoId, usuarioId, rol = 'cliente') {
      await db.prepare('INSERT INTO accesos_evento (evento_id, usuario_id, rol) VALUES (?, ?, ?) ON CONFLICT DO NOTHING').bind(eventoId, usuarioId, rol).run();
    },
    async tieneAcceso(eventoId, usuarioId) {
      return !!(usuarioId && await db.prepare('SELECT 1 FROM accesos_evento WHERE evento_id = ? AND usuario_id = ?').bind(eventoId, usuarioId).first());
    },
    async eventosDe(usuarioId) {
      const { results } = await db.prepare(`SELECT e.* FROM eventos e JOIN accesos_evento a ON a.evento_id = e.id
        WHERE a.usuario_id = ? ORDER BY e.actualizado DESC`).bind(usuarioId).all();
      return results.map(fila);
    },
    async subir(clave, cuerpo, tipo) { await env.MEDIA.put(clave, cuerpo, { httpMetadata: { contentType: tipo, cacheControl: 'public, max-age=31536000, immutable' } }); },
    async archivo(clave) {
      const o = await env.MEDIA.get(clave);
      return o && { cuerpo: o.body, tipo: o.httpMetadata?.contentType || 'application/octet-stream' };
    },
  };
}
