// README (ronda 33) · Consola de administración (/admin/): cuentas profesionales, diseños a medida y transferencias.
//   GET  /api/admin/resumen                                   todo lo pendiente y las empresas
//   POST /api/admin/pro/solicitudes/<id>/aprobar   { nivel, paseMeses, creditos, nota }
//   POST /api/admin/pro/solicitudes/<id>/rechazar  { motivo }
//   POST /api/admin/pro/empresas/<id>/creditos     { cantidad, origen, nota }   (los créditos vencen a los 12 meses)
//   POST /api/admin/pro/empresas/<id>/pase         { meses }   renovar el pase anual (Studio)
//   POST /api/admin/pro/empresas/<id>/estado       { estado: 'activa' | 'suspendida', nivel? }
//   POST /api/admin/medidas/<evento>/<aprobar|lista>  { parte: 'std' | 'medida' }
// Quien entra: un administrador (ADMINS) con su sesión, o la clave ADMIN_CLAVE.
import { json, readJson, str, randomId, HttpError } from '../lib/util.js';
import { requiereAdmin } from './admin.js';
import { asegurarTablasPro } from '../pro/esquema.js';
import { crearUsuario } from '../lib/auth.js';
import { almacenD1 } from '../almacen.js';
import { sendEmail, mailMedidaAprobada, mailProAprobada, mailProRechazada } from '../lib/email.js';
import { PROFESIONALES } from '../catalogo.js';

const ahora = () => new Date().toISOString();
const sitio = (env, request) => String(env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
// Suma meses a una fecha ISO (créditos: 12 meses; pase anual: 12 meses)
export function sumarMeses(iso, meses) { const d = new Date(iso); d.setUTCMonth(d.getUTCMonth() + meses); return d.toISOString(); }

// ── Resumen ───────────────────────────────────────────────────────────
export async function resumen(request, env) {
  await requiereAdmin(request, env);
  await asegurarTablasPro(env);
  const hoy = ahora();
  const q = async (sql, ...p) => (await env.DB.prepare(sql).bind(...p).all()).results || [];
  const solicitudes = await q("SELECT * FROM solicitudes_pro ORDER BY (estado = 'pendiente') DESC, creado DESC LIMIT 100");
  const empresas = await q(`SELECT e.id, e.nombre, e.rubro, e.creado, p.nivel, p.pase_vence, p.estado, p.dominio,
      (SELECT u.email FROM miembros m JOIN usuarios u ON u.id = m.usuario_id WHERE m.empresa_id = e.id AND m.rol = 'duenio' LIMIT 1) AS duenio,
      (SELECT COALESCE(SUM(l.cantidad - l.usados), 0) FROM creditos_lotes l WHERE l.empresa_id = e.id AND l.vence >= ?) AS creditos,
      (SELECT MIN(l.vence) FROM creditos_lotes l WHERE l.empresa_id = e.id AND l.vence >= ? AND l.cantidad > l.usados) AS creditos_vencen,
      (SELECT COUNT(*) FROM eventos v WHERE v.empresa_id = e.id) AS eventos
    FROM empresas e JOIN empresas_pro p ON p.empresa_id = e.id ORDER BY e.creado DESC`, hoy, hoy);
  // Diseños a medida enviados: por aprobar → aprobados (esperando pago/diseño) → listos
  const filasMedida = await q(`SELECT id, producto, tipo, estado, datos FROM eventos
    WHERE json_extract(datos, '$.medida.enviado') IS NOT NULL OR json_extract(datos, '$.std.medida.enviado') IS NOT NULL ORDER BY actualizado DESC LIMIT 100`);
  const medidas = [];
  for (const f of filasMedida) {
    const d = JSON.parse(f.datos || '{}');
    for (const [parte, m] of [['medida', d.medida], ['std', d.std?.medida]]) {
      if (!m?.enviado) continue;
      medidas.push({ id: f.id, parte, producto: f.producto, tipo: f.tipo, nombres: [d.nombres?.a, d.nombres?.b].filter(Boolean).join(' & '), enviado: m.enviado, aprobado: m.aprobado || null, listo: m.listo || null });
    }
  }
  const transferencias = (await q("SELECT id, numero, email, importe, moneda, detalle, creado FROM pedidos WHERE estado = 'pendiente' AND medio = 'transferencia' ORDER BY creado DESC LIMIT 100"))
    .map((p) => ({ id: p.id, numero: p.numero, email: p.email, importe: p.importe, moneda: p.moneda, producto: (() => { try { return JSON.parse(p.detalle).nombre; } catch { return ''; } })(), creado: p.creado }));
  return json({ solicitudes, empresas, medidas, transferencias, base: { pase: PROFESIONALES.studio.pase, credito: PROFESIONALES.credito } });
}

// ── Cuentas profesionales ─────────────────────────────────────────────
export async function accionPro(request, env, partes) {
  await requiereAdmin(request, env);
  if (request.method !== 'POST') throw new HttpError(405, 'Método no permitido');
  await asegurarTablasPro(env);
  const [, , , recurso, id, accion] = partes; // api admin pro <solicitudes|empresas> <id> <accion>
  const b = await readJson(request);
  if (recurso === 'solicitudes') return accion === 'aprobar' ? aprobar(request, env, id, b) : accion === 'rechazar' ? rechazar(request, env, id, b) : json({ error: 'no encontrado' }, 404);
  if (recurso === 'empresas') {
    if (accion === 'creditos') return darCreditos(env, id, b);
    if (accion === 'pase') return renovarPase(env, id, b);
    if (accion === 'estado') return cambiarEstado(env, id, b);
  }
  return json({ error: 'no encontrado' }, 404);
}

async function aprobar(request, env, id, b) {
  const s = await env.DB.prepare('SELECT * FROM solicitudes_pro WHERE id = ?').bind(id).first();
  if (!s) throw new HttpError(404, 'No existe esa solicitud');
  if (s.estado !== 'pendiente') throw new HttpError(409, 'Esa solicitud ya se resolvió');
  const nivel = b.nivel === 'studio' ? 'studio' : 'pro';
  const empresaId = 'em_' + randomId(5);
  const t = ahora();
  const paseMeses = nivel === 'studio' ? Math.max(0, Math.min(36, parseInt(b.paseMeses, 10) || 0)) : 0;
  await env.DB.prepare('INSERT INTO empresas (id, nombre, rubro, plan, creditos, marca, creado) VALUES (?, ?, ?, ?, 0, ?, ?)')
    .bind(empresaId, s.empresa || s.nombre, s.rubro, nivel, '{}', t).run();
  await env.DB.prepare('INSERT INTO empresas_pro (empresa_id, nivel, pase_vence, estado, creado) VALUES (?, ?, ?, ?, ?)')
    .bind(empresaId, nivel, paseMeses ? sumarMeses(t, paseMeses) : null, 'activa', t).run();
  const u = await crearUsuario(env, s.email, { nombre: s.nombre, pais: s.pais || null });
  await env.DB.prepare('INSERT INTO miembros (empresa_id, usuario_id, rol) VALUES (?, ?, ?) ON CONFLICT DO NOTHING').bind(empresaId, u.id, 'duenio').run();
  const creditos = Math.max(0, Math.min(1000, parseInt(b.creditos, 10) || 0));
  if (creditos) await nuevoLote(env, empresaId, creditos, 'inicial', str(b.nota, 200) || 'Créditos iniciales');
  await env.DB.prepare("UPDATE solicitudes_pro SET estado = 'aprobada', empresa_id = ?, nota = ?, resuelto = ? WHERE id = ?").bind(empresaId, str(b.nota, 300) || null, t, id).run();
  try { await sendEmail(env, { to: s.email, ...mailProAprobada(env, { nombre: s.nombre, nivel: PROFESIONALES[nivel].nombre, url: `${sitio(env, request)}/entrar` }) }); } catch (e) { console.error('[pro aprobada]', e); }
  return json({ ok: true, empresa: empresaId });
}

async function rechazar(request, env, id, b) {
  const s = await env.DB.prepare('SELECT * FROM solicitudes_pro WHERE id = ?').bind(id).first();
  if (!s) throw new HttpError(404, 'No existe esa solicitud');
  if (s.estado !== 'pendiente') throw new HttpError(409, 'Esa solicitud ya se resolvió');
  const motivo = str(b.motivo, 400);
  await env.DB.prepare("UPDATE solicitudes_pro SET estado = 'rechazada', nota = ?, resuelto = ? WHERE id = ?").bind(motivo || null, ahora(), id).run();
  if (b.avisar !== false) { try { await sendEmail(env, { to: s.email, ...mailProRechazada(env, { nombre: s.nombre, motivo }) }); } catch (e) { console.error('[pro rechazada]', e); } }
  return json({ ok: true });
}

// Créditos: cada compra es un lote que vence a los 12 meses
async function nuevoLote(env, empresaId, cantidad, origen, nota) {
  const t = ahora();
  await env.DB.prepare('INSERT INTO creditos_lotes (id, empresa_id, cantidad, comprado, vence, origen, nota) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind('cl_' + randomId(5), empresaId, cantidad, t, sumarMeses(t, 12), origen, nota || null).run();
}

async function empresaPro(env, id) {
  const e = await env.DB.prepare('SELECT e.id, e.nombre, p.nivel, p.pase_vence, p.estado FROM empresas e JOIN empresas_pro p ON p.empresa_id = e.id WHERE e.id = ?').bind(id).first();
  if (!e) throw new HttpError(404, 'No existe esa empresa');
  return e;
}

async function darCreditos(env, id, b) {
  const e = await empresaPro(env, id);
  const cantidad = parseInt(b.cantidad, 10);
  if (!(cantidad > 0 && cantidad <= 1000)) throw new HttpError(400, 'La cantidad de créditos no es válida');
  // Los packs Studio son exclusivos con el pase anual activo
  const esStudio = String(b.origen || '').startsWith('studio');
  if (esStudio && !(e.nivel === 'studio' && e.pase_vence && e.pase_vence >= ahora())) throw new HttpError(409, 'Los packs Studio necesitan el pase anual vigente. Renovar o activar el pase primero.');
  await nuevoLote(env, id, cantidad, str(b.origen, 30) || 'manual', str(b.nota, 200));
  return json({ ok: true });
}

// Renovar el pase anual. Los créditos que sobran y todavía no vencieron pasan al año siguiente (se extienden 12 meses)
async function renovarPase(env, id, b) {
  const e = await empresaPro(env, id);
  const meses = Math.max(1, Math.min(36, parseInt(b.meses, 10) || 12));
  const t = ahora();
  const base = e.pase_vence && e.pase_vence > t ? e.pase_vence : t;
  const nuevo = sumarMeses(base, meses);
  const lotes = (await env.DB.prepare('SELECT id, vence FROM creditos_lotes WHERE empresa_id = ? AND usados < cantidad AND vence >= ?').bind(id, t).all()).results || [];
  await env.DB.batch([
    env.DB.prepare("UPDATE empresas_pro SET nivel = 'studio', pase_vence = ?, estado = 'activa' WHERE empresa_id = ?").bind(nuevo, id),
    env.DB.prepare("UPDATE empresas SET plan = 'studio' WHERE id = ?").bind(id),
    ...lotes.map((l) => env.DB.prepare('UPDATE creditos_lotes SET vence = ? WHERE id = ?').bind(sumarMeses(l.vence, 12), l.id)),
  ]);
  return json({ ok: true, paseVence: nuevo, lotesExtendidos: lotes.length });
}

async function cambiarEstado(env, id, b) {
  await empresaPro(env, id);
  const estado = b.estado === 'suspendida' ? 'suspendida' : 'activa';
  const nivel = b.nivel === 'studio' ? 'studio' : b.nivel === 'pro' ? 'pro' : null;
  await env.DB.prepare('UPDATE empresas_pro SET estado = ?, nivel = COALESCE(?, nivel) WHERE empresa_id = ?').bind(estado, nivel, id).run();
  if (nivel) await env.DB.prepare('UPDATE empresas SET plan = ? WHERE id = ?').bind(nivel, id).run();
  return json({ ok: true });
}

// ── Diseños a medida ──────────────────────────────────────────────────
// Lo mismo que hace el botón «Aprobar proyecto» del panel del evento, pero desde la lista
export async function medida(request, env, eventoId, accion) {
  await requiereAdmin(request, env);
  if (request.method !== 'POST') throw new HttpError(405, 'Método no permitido');
  const alm = almacenD1(env);
  const ev = await alm.evento(str(eventoId, 40));
  if (!ev) throw new HttpError(404, 'No existe ese evento');
  const { parte } = await readJson(request);
  const clave = parte === 'std' ? 'std' : 'medida';
  const actual = clave === 'std' ? ev.datos.std?.medida : ev.datos.medida;
  if (!actual?.enviado) throw new HttpError(409, 'Ese diseño todavía no se envió al equipo');
  const marca = accion === 'lista' ? { listo: ahora() } : accion === 'aprobar' ? { aprobado: ahora() } : null;
  if (!marca) throw new HttpError(404, 'no encontrado');
  if (clave === 'std') ev.datos.std = { ...(ev.datos.std || {}), medida: { ...actual, ...marca } };
  else ev.datos.medida = { ...actual, ...marca };
  await alm.guardarEvento(ev);
  let avisados = 0;
  if (accion === 'aprobar') {
    const nombres = [ev.datos.nombres?.a, ev.datos.nombres?.b].filter(Boolean).join(' & ');
    for (const c of (await alm.accesos(ev.id)).filter((x) => x.rol === 'cliente')) {
      try { await sendEmail(env, { to: c.email, ...mailMedidaAprobada(env, { url: `${sitio(env, request)}/panel/${ev.id}?k=${ev.clave}`, nombres }) }); avisados++; } catch (e) { console.error('[medida]', e); }
    }
  }
  return json({ ok: true, avisados });
}
