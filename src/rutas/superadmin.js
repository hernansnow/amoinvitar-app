// README (ronda 35) · Consola de administración: estadísticas, pedidos, facturas, cupones, invitaciones (superusuario),
// clientes y consultas. Se ve en /admin/. Entra un administrador (ADMINS) con su sesión, o quien tenga ADMIN_CLAVE.
//   GET  /api/admin/estadisticas?year=
//   GET  /api/admin/pedidos?q=&estado=&medio=&pagina=            ·  POST /api/admin/pedidos/<id>/<cancelar|reembolsado|reenviar|facturar>
//   POST /api/admin/facturas/<id>/reenviar
//   GET  /api/admin/cupones  ·  POST /api/admin/cupones  ·  POST /api/admin/cupones/<codigo>/<editar|borrar>
//   GET  /api/admin/eventos?q=&estado=&paquete=&pagina=          ·  POST /api/admin/eventos/<id>/<plan|vence|estado|extras|slug|cliente|eliminar>
//   GET  /api/admin/usuarios?q=  ·  GET /api/admin/usuarios/<id>
//   GET  /api/admin/consultas    ·  POST /api/admin/consultas/<id>/estado
//   GET  /api/admin/registro                                      lo que cambió el administrador
import { json, readJson, str, randomId, HttpError, now } from '../lib/util.js';
import { requiereAdmin } from './admin.js';
import { asegurarTablasPro } from '../pro/esquema.js';
import { almacenD1 } from '../almacen.js';
import { crearUsuario } from '../lib/auth.js';
import { getRates, DESCUENTO_PAIS, COUNTRY_CURRENCY, CURRENCIES, CONFIG, cargarConfig, olvidarConfig, PLANES_PROMO, PROMO_ITEMS, fijosVigentes } from '../lib/fx.js';
import { getState, setState } from '../lib/verifactu.js';
import { EXTRAS, PAQUETES, listaPrecios, clavesFijas, PRECIOS_ORIGINALES } from '../catalogo.js';
import { sendEmail, mailFactura, mailPedidoListo } from '../lib/email.js';
import { issueInvoice, getInvoice, invoiceUrl, invoicesEnabled } from '../lib/facturas.js';
import { verifactuMode, sendPending } from '../lib/verifactu.js';
import { cumplirPedido, ordenParaFactura } from './tienda.js';
import { venceEvento, fechaEvento } from '../vencimiento.js';

const POR_PAGINA = 40;
const sitio = (env, request) => String(env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
const r2 = (n) => Math.round(n * 100) / 100;
const LIKE = (t) => `%${String(t).replace(/[%_\\]/g, (c) => '\\' + c)}%`;
const nombresDe = (d = {}) => [d.nombres?.a, d.nombres?.b].filter(Boolean).join(' & ');

async function entrar(request, env) {
  const u = await requiereAdmin(request, env);
  await asegurarTablasPro(env);
  return u;
}
async function registrar(env, u, accion, objeto, detalle) {
  try { await env.DB.prepare('INSERT INTO admin_log (fecha, admin, accion, objeto, detalle) VALUES (?, ?, ?, ?, ?)').bind(new Date().toISOString(), u?.email || 'clave', accion, objeto || null, detalle ? JSON.stringify(detalle) : null).run(); } catch (e) { console.error('[log]', e); }
}
// Consulta que devuelve las filas (cada petición arma la suya: no se comparte nada entre peticiones)
const consulta = (env) => async (sql, ...p) => (await env.DB.prepare(sql).bind(...p).all()).results || [];

// ── Estadísticas ──────────────────────────────────────────────────────
export async function estadisticas(request, env) {
  await entrar(request, env);
  const q = consulta(env);
  const url = new URL(request.url);
  const anio = parseInt(url.searchParams.get('year'), 10) || new Date().getUTCFullYear();
  const desde = Date.UTC(anio, 0, 1) / 1000, hasta = Date.UTC(anio + 1, 0, 1) / 1000;
  const rates = await getRates(env);
  const aEur = (n, m) => (m === 'EUR' ? n : (n / (rates[m] || 1)) * (rates.EUR || 0.92));
  const porMes = Array(12).fill(0), porMedio = {}, porPais = {};
  let total = 0, iva = 0, n = 0;
  const suma = (mes, medio, pais, eur, ivaEur) => { porMes[mes] += eur; porMedio[medio] = (porMedio[medio] || 0) + eur; porPais[pais || '—'] = (porPais[pais || '—'] || 0) + eur; total += eur; iva += ivaEur; n++; };
  for (const p of await q("SELECT importe, moneda, medio, pais, iva, pagado FROM pedidos WHERE estado = 'pagado' AND pagado >= ? AND pagado < ? AND importe > 0 AND medio NOT IN ('gratis', 'admin', 'cupon')", desde, hasta)) {
    suma(new Date(p.pagado * 1000).getUTCMonth(), p.medio, p.pais, aEur(p.importe, p.moneda), aEur(p.iva || 0, p.moneda));
  }
  for (const c of await q("SELECT total, iva, pais, pagada FROM compras_pro WHERE estado = 'pagada' AND pagada >= ? AND pagada < ?", new Date(desde * 1000).toISOString(), new Date(hasta * 1000).toISOString())) {
    suma(new Date(c.pagada).getUTCMonth(), 'profesionales', c.pais, c.total, c.iva || 0);
  }
  const uno = async (sql, ...p) => (await q(sql, ...p))[0] || {};
  const pedidos = Object.fromEntries((await q('SELECT estado, COUNT(*) AS n FROM pedidos GROUP BY estado')).map((x) => [x.estado, x.n]));
  const porPaquete = Object.fromEntries((await q("SELECT paquete, COUNT(*) AS n FROM eventos WHERE estado = 'publicado' AND producto = 'invitacion' GROUP BY paquete")).map((x) => [x.paquete, x.n]));
  const eventosEstado = Object.fromEntries((await q('SELECT estado, COUNT(*) AS n FROM eventos GROUP BY estado')).map((x) => [x.estado, x.n]));
  // Invitaciones publicadas que vencen en los próximos 30 días
  const pub = await q("SELECT id, producto, paquete, vence, datos FROM eventos WHERE estado = 'publicado' LIMIT 3000");
  const limite = new Date(Date.now() + 30 * 86400000).toISOString(), hoy = new Date().toISOString();
  const vencen = pub.filter((e) => { const v = venceEvento({ ...e, datos: JSON.parse(e.datos || '{}') }); return v && v >= hoy && v <= limite; }).length;
  const pendientes = {
    transferencias: (await uno("SELECT COUNT(*) AS n FROM pedidos WHERE estado = 'pendiente' AND medio = 'transferencia'")).n || 0,
    medidas: (await q("SELECT datos FROM eventos WHERE json_extract(datos, '$.medida.enviado') IS NOT NULL OR json_extract(datos, '$.std.medida.enviado') IS NOT NULL")).filter((e) => { const d = JSON.parse(e.datos || '{}'); return (d.medida?.enviado && !d.medida.aprobado) || (d.std?.medida?.enviado && !d.std.medida.aprobado); }).length,
    solicitudes: (await uno("SELECT COUNT(*) AS n FROM solicitudes_pro WHERE estado = 'pendiente'")).n || 0,
    compras: (await uno("SELECT COUNT(*) AS n FROM compras_pro WHERE estado = 'pendiente'")).n || 0,
    consultas: (await uno("SELECT COUNT(*) AS n FROM consultas WHERE estado = 'nueva'")).n || 0,
  };
  const orden = (o) => Object.entries(o).map(([k, v]) => ({ k, v: r2(v) })).sort((a, b) => b.v - a.v);
  return json({
    anio, total: r2(total), iva: r2(iva), neto: r2(total - iva), operaciones: n, porMes: porMes.map(r2), porMedio: orden(porMedio), porPais: orden(porPais).slice(0, 12),
    pedidos, eventos: { porPaquete, porEstado: eventosEstado, vencen30: vencen },
    usuarios: (await uno('SELECT COUNT(*) AS n FROM usuarios')).n || 0, empresas: (await uno('SELECT COUNT(*) AS n FROM empresas_pro')).n || 0,
    pendientes, nota: 'Importes en euros con IVA incluido; las otras monedas se pasan con la cotización de hoy.',
  });
}

// ── Pedidos ───────────────────────────────────────────────────────────
export async function pedidos(request, env) {
  await entrar(request, env);
  const q = consulta(env), url = new URL(request.url);
  const t = str(url.searchParams.get('q'), 80), estado = str(url.searchParams.get('estado'), 20), medio = str(url.searchParams.get('medio'), 20);
  const pag = Math.max(0, parseInt(url.searchParams.get('pagina'), 10) || 0);
  const donde = [], args = [];
  if (t) { donde.push("(p.email LIKE ? ESCAPE '\\' OR CAST(p.numero AS TEXT) LIKE ? OR p.detalle LIKE ? ESCAPE '\\' OR p.cupon LIKE ? ESCAPE '\\' OR p.evento_id = ?)"); args.push(LIKE(t), LIKE(t.replace(/^#/, '')), LIKE(t), LIKE(t), t); }
  if (estado) { donde.push('p.estado = ?'); args.push(estado); }
  if (medio) { donde.push('p.medio = ?'); args.push(medio); }
  const where = donde.length ? 'WHERE ' + donde.join(' AND ') : '';
  let rows;
  const base = `SELECT p.id, p.numero, p.email, p.tipo, p.detalle, p.evento_id, p.medio, p.moneda, p.importe, p.iva, p.eur, p.cupon, p.descuento, p.pais, p.estado, p.creado, p.pagado`;
  try { rows = await q(`${base}, (SELECT i.id FROM invoices i WHERE i.order_id = p.id) AS factura_id FROM pedidos p ${where} ORDER BY p.creado DESC LIMIT ? OFFSET ?`, ...args, POR_PAGINA + 1, pag * POR_PAGINA); }
  catch { rows = await q(`${base}, NULL AS factura_id FROM pedidos p ${where} ORDER BY p.creado DESC LIMIT ? OFFSET ?`, ...args, POR_PAGINA + 1, pag * POR_PAGINA); }
  const hay = rows.length > POR_PAGINA;
  const b = sitio(env, request);
  const out = [];
  for (const p of rows.slice(0, POR_PAGINA)) {
    let d = {}; try { d = JSON.parse(p.detalle || '{}'); } catch { /* sin detalle */ }
    out.push({ ...p, detalle: undefined, producto: d.nombre || d.producto, urlFactura: p.factura_id ? await invoiceUrl(env, b, { id: p.factura_id }) : null });
  }
  return json({ pedidos: out, pagina: pag, hayMas: hay });
}

export async function accionPedido(request, env, id, accion) {
  const u = await entrar(request, env);
  if (request.method !== 'POST') throw new HttpError(405, 'Método no permitido');
  const p = await env.DB.prepare('SELECT * FROM pedidos WHERE id = ?').bind(str(id, 40)).first();
  if (!p) throw new HttpError(404, 'No existe ese pedido');
  const b = await readJson(request).catch(() => ({}));
  if (accion === 'cancelar') {
    if (p.estado !== 'pendiente') throw new HttpError(409, 'Solo se cancelan pedidos pendientes');
    await env.DB.prepare("UPDATE pedidos SET estado = 'cancelado' WHERE id = ?").bind(p.id).run();
    await registrar(env, u, 'pedido.cancelar', `#${p.numero}`);
    return json({ ok: true });
  }
  if (accion === 'reembolsado') {
    if (p.estado !== 'pagado') throw new HttpError(409, 'Solo se marcan como reembolsados los pedidos pagados');
    await env.DB.prepare("UPDATE pedidos SET estado = 'reembolsado' WHERE id = ?").bind(p.id).run();
    await registrar(env, u, 'pedido.reembolsado', `#${p.numero}`, { nota: str(b.nota, 200), aviso: 'El dinero se devuelve desde la pasarela; esto solo lo registra' });
    return json({ ok: true });
  }
  if (accion === 'cobrado') { const ok = await cumplirPedido(env, request, p.id); await registrar(env, u, 'pedido.cobrado', `#${p.numero}`); return json({ ok }); }
  if (accion === 'facturar') {
    if (p.estado !== 'pagado') throw new HttpError(409, 'Solo se factura un pedido pagado');
    if (!invoicesEnabled(env)) throw new HttpError(409, 'Las facturas no están activadas (faltan los datos fiscales)');
    const orden = ordenParaFactura({ ...p, detalle: JSON.parse(p.detalle) });
    const inv = await issueInvoice(env, orden);
    if (!inv) throw new HttpError(409, 'Este pedido no genera factura (importe cero)');
    if (verifactuMode(env)) await sendPending(env).catch(() => null);
    await registrar(env, u, 'pedido.facturar', `#${p.numero}`, { factura: inv.number });
    return json({ ok: true, factura: inv.number, url: await invoiceUrl(env, sitio(env, request), inv) });
  }
  if (accion === 'reenviar') {
    const inv = (await env.DB.prepare('SELECT * FROM invoices WHERE order_id = ?').bind(p.id).first().catch(() => null));
    const d = JSON.parse(p.detalle || '{}'), base = sitio(env, request);
    if (inv) await sendEmail(env, { to: p.email, ...mailFactura(env, { url: await invoiceUrl(env, base, inv), numero: inv.number, producto: d.nombre }) });
    else if (p.evento_id) {
      const ev = await almacenD1(env).evento(p.evento_id);
      if (ev) await sendEmail(env, { to: p.email, ...mailPedidoListo(env, { url: `${base}/panel/${ev.id}?k=${ev.clave}`, producto: d.nombre, numero: p.importe ? p.numero : null, gratis: false }) });
    }
    await registrar(env, u, 'pedido.reenviar', `#${p.numero}`);
    return json({ ok: true, enviado: !!(inv || p.evento_id) });
  }
  throw new HttpError(404, 'no encontrado');
}

export async function reenviarFactura(request, env, id) {
  const u = await entrar(request, env);
  const inv = await getInvoice(env, str(id, 40));
  if (!inv) throw new HttpError(404, 'No existe esa factura');
  if (!inv.customer_email) throw new HttpError(409, 'La factura no tiene mail de cliente');
  await sendEmail(env, { to: inv.customer_email, ...mailFactura(env, { url: await invoiceUrl(env, sitio(env, request), inv), numero: inv.number, producto: inv.concept }) });
  await registrar(env, u, 'factura.reenviar', inv.number);
  return json({ ok: true });
}

// ── Cupones ───────────────────────────────────────────────────────────
const normCodigo = (c) => str(c, 30).toUpperCase().replace(/[^A-Z0-9]/g, '');
const PAQ_VALIDOS = ['gratis', 'basic', 'premium', 'deluxe'];
function cuponDeCuerpo(b) {
  const clase = b.clase === 'fijo' ? 'fijo' : 'porcentaje';
  const valor = Number(b.valor);
  if (!(valor > 0) || (clase === 'porcentaje' && valor > 100)) throw new HttpError(400, clase === 'porcentaje' ? 'El porcentaje tiene que estar entre 1 y 100' : 'El valor tiene que ser mayor que cero');
  const paquetes = [].concat(b.paquetes || []).filter((x) => PAQ_VALIDOS.includes(x));
  const maxUsos = b.max_usos === '' || b.max_usos == null ? null : Math.max(1, parseInt(b.max_usos, 10) || 0) || null;
  const vence = /^\d{4}-\d{2}-\d{2}$/.test(b.vence || '') ? Math.floor(Date.parse(`${b.vence}T23:59:59Z`) / 1000) : null;
  return { clase, valor, paquetes: paquetes.length ? paquetes.join(',') : null, maxUsos, vence, nota: str(b.nota, 200) || null, activo: b.activo === false || b.activo === 0 ? 0 : 1 };
}
export async function cupones(request, env, codigo, accion) {
  const u = await entrar(request, env);
  const q = consulta(env);
  if (request.method === 'GET') return json({ cupones: await q('SELECT * FROM cupones ORDER BY creado DESC LIMIT 300') });
  const b = await readJson(request);
  if (!codigo) { // crear
    const c = cuponDeCuerpo(b);
    let cod = normCodigo(b.codigo);
    if (!cod) cod = (str(b.prefijo, 8).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'AI') + randomId(3).toUpperCase();
    if (await env.DB.prepare('SELECT 1 FROM cupones WHERE codigo = ?').bind(cod).first()) throw new HttpError(409, 'Ya existe un cupón con ese código');
    await env.DB.prepare('INSERT INTO cupones (codigo, clase, valor, paquetes, max_usos, usos, vence, activo, nota, creado) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)')
      .bind(cod, c.clase, c.valor, c.paquetes, c.maxUsos, c.vence, c.activo, c.nota, now()).run();
    await registrar(env, u, 'cupon.crear', cod, { clase: c.clase, valor: c.valor });
    return json({ ok: true, codigo: cod }, 201);
  }
  const cod = normCodigo(codigo);
  const actual = await env.DB.prepare('SELECT * FROM cupones WHERE codigo = ?').bind(cod).first();
  if (!actual) throw new HttpError(404, 'No existe ese cupón');
  if (accion === 'borrar') {
    if (actual.usos > 0) { await env.DB.prepare('UPDATE cupones SET activo = 0 WHERE codigo = ?').bind(cod).run(); await registrar(env, u, 'cupon.desactivar', cod); return json({ ok: true, desactivado: true }); }
    await env.DB.prepare('DELETE FROM cupones WHERE codigo = ?').bind(cod).run(); await registrar(env, u, 'cupon.borrar', cod); return json({ ok: true });
  }
  if (accion === 'editar') {
    const c = cuponDeCuerpo({ ...actual, paquetes: actual.paquetes ? actual.paquetes.split(',') : [], ...b });
    await env.DB.prepare('UPDATE cupones SET clase = ?, valor = ?, paquetes = ?, max_usos = ?, vence = ?, activo = ?, nota = ? WHERE codigo = ?')
      .bind(c.clase, c.valor, c.paquetes, c.maxUsos, c.vence, c.activo, c.nota, cod).run();
    await registrar(env, u, 'cupon.editar', cod, b);
    return json({ ok: true });
  }
  throw new HttpError(404, 'no encontrado');
}

// ── Invitaciones (superusuario) ────────────────────────────────────────
export async function eventos(request, env) {
  await entrar(request, env);
  const q = consulta(env), url = new URL(request.url);
  const t = str(url.searchParams.get('q'), 80), estado = str(url.searchParams.get('estado'), 20), paquete = str(url.searchParams.get('paquete'), 20);
  const pag = Math.max(0, parseInt(url.searchParams.get('pagina'), 10) || 0);
  const donde = [], args = [];
  if (t) { donde.push("(e.id = ? OR e.slug LIKE ? ESCAPE '\\' OR e.datos LIKE ? ESCAPE '\\' OR EXISTS (SELECT 1 FROM accesos_evento a JOIN usuarios u ON u.id = a.usuario_id WHERE a.evento_id = e.id AND u.email LIKE ? ESCAPE '\\'))"); args.push(t, LIKE(t), LIKE(t), LIKE(t)); }
  if (estado) { donde.push('e.estado = ?'); args.push(estado); }
  if (paquete) { donde.push('e.paquete = ?'); args.push(paquete); }
  const rows = await q(`SELECT e.id, e.producto, e.tipo, e.modelo, e.paquete, e.estado, e.slug, e.vence, e.empresa_id, e.creado, e.actualizado, e.datos,
      (SELECT GROUP_CONCAT(u.email, ', ') FROM accesos_evento a JOIN usuarios u ON u.id = a.usuario_id WHERE a.evento_id = e.id AND a.rol = 'cliente') AS clientes,
      (SELECT em.nombre FROM empresas em WHERE em.id = e.empresa_id) AS empresa,
      (SELECT COUNT(*) FROM respuestas r WHERE r.evento_id = e.id AND r.tipo = 'rsvp') AS respuestas
    FROM eventos e ${donde.length ? 'WHERE ' + donde.join(' AND ') : ''} ORDER BY e.actualizado DESC LIMIT ? OFFSET ?`, ...args, POR_PAGINA + 1, pag * POR_PAGINA);
  const out = rows.slice(0, POR_PAGINA).map((e) => {
    const d = JSON.parse(e.datos || '{}');
    return { id: e.id, producto: e.producto, tipo: e.tipo, modelo: e.modelo, paquete: e.paquete, estado: e.estado, slug: e.slug, nombres: nombresDe(d), fecha: fechaEvento(d) || null,
      vence: venceEvento({ ...e, datos: d }), venceManual: e.vence || null, clientes: e.clientes || '', empresa: e.empresa || null, respuestas: e.respuestas, extras: d.extras || [],
      link: e.estado === 'publicado' && e.slug ? `/${e.tipo}/${e.slug}` : null, actualizado: e.actualizado };
  });
  return json({ eventos: out, pagina: pag, hayMas: rows.length > POR_PAGINA, extrasDisponibles: Object.entries(EXTRAS).map(([k, v]) => ({ id: k, nombre: v.nombre })) });
}

export async function accionEvento(request, env, id, accion) {
  const u = await entrar(request, env);
  if (request.method !== 'POST') throw new HttpError(405, 'Método no permitido');
  const alm = almacenD1(env);
  const ev = await alm.evento(str(id, 40));
  if (!ev) throw new HttpError(404, 'No existe esa invitación');
  const b = await readJson(request).catch(() => ({}));
  const objeto = `${ev.id} · ${nombresDe(ev.datos)}`;
  if (accion === 'plan') {
    const nuevo = str(b.paquete, 20);
    if (!Object.keys(PAQUETES).includes(nuevo) && nuevo !== 'borrador') throw new HttpError(400, 'Paquete desconocido');
    const antes = ev.paquete;
    ev.paquete = nuevo;
    if (nuevo !== 'gratis' && ev.datos.planElegido === 'gratis') ev.datos.planElegido = null;
    await alm.guardarEvento(ev);
    await registrar(env, u, 'evento.plan', objeto, { de: antes, a: nuevo, motivo: str(b.motivo, 200) });
    return json({ ok: true, paquete: nuevo, vence: venceEvento(ev) });
  }
  if (accion === 'vence') {
    const f = str(b.fecha, 10);
    if (f && !/^\d{4}-\d{2}-\d{2}$/.test(f)) throw new HttpError(400, 'Fecha inválida (AAAA-MM-DD)');
    ev.vence = f ? `${f}T23:59:59.000Z` : null;
    await alm.guardarEvento(ev);
    await registrar(env, u, 'evento.vence', objeto, { vence: ev.vence });
    return json({ ok: true, vence: venceEvento(ev) });
  }
  if (accion === 'estado') {
    const nuevo = b.estado === 'borrador' ? 'borrador' : b.estado === 'publicado' ? 'publicado' : null;
    if (!nuevo) throw new HttpError(400, 'Estado desconocido');
    if (nuevo === 'publicado' && !ev.slug) throw new HttpError(409, 'Falta el link (slug): se carga en el panel de la invitación');
    ev.estado = nuevo;
    await alm.guardarEvento(ev);
    await registrar(env, u, 'evento.estado', objeto, { estado: nuevo });
    return json({ ok: true });
  }
  if (accion === 'extras') {
    const lista = [].concat(b.extras || []).filter((x) => EXTRAS[x]);
    ev.datos.extras = lista;
    await alm.guardarEvento(ev);
    await registrar(env, u, 'evento.extras', objeto, { extras: lista });
    return json({ ok: true });
  }
  if (accion === 'slug') {
    const s = str(b.slug, 60).toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{2,59}$/.test(s)) throw new HttpError(400, 'El link usa letras, números y guiones (3 a 60)');
    const otro = await alm.eventoPorSlug(ev.tipo, s);
    if (otro && otro.id !== ev.id) throw new HttpError(409, 'Ese link ya está en uso');
    const antes = ev.slug; ev.slug = s;
    await alm.guardarEvento(ev);
    await registrar(env, u, 'evento.slug', objeto, { de: antes, a: s });
    return json({ ok: true, link: `/${ev.tipo}/${s}` });
  }
  if (accion === 'cliente') {
    const email = str(b.email, 150).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new HttpError(400, 'El mail no parece válido');
    const cu = await crearUsuario(env, email, {});
    await alm.darAcceso(ev.id, cu.id, 'cliente');
    await registrar(env, u, 'evento.cliente', objeto, { email });
    return json({ ok: true });
  }
  if (accion === 'eliminar') {
    if (b.confirmo !== true) throw new HttpError(400, 'Falta confirmar');
    await alm.eliminarEvento(ev.id);
    await registrar(env, u, 'evento.eliminar', objeto);
    return json({ ok: true });
  }
  throw new HttpError(404, 'no encontrado');
}

// ── Clientes ──────────────────────────────────────────────────────────
export async function usuarios(request, env, id) {
  await entrar(request, env);
  const q = consulta(env), url = new URL(request.url);
  if (id) {
    const u = (await q('SELECT id, email, nombre, pais, creado FROM usuarios WHERE id = ?', str(id, 40)))[0];
    if (!u) throw new HttpError(404, 'No existe ese cliente');
    const evs = await q('SELECT e.id, e.tipo, e.modelo, e.paquete, e.estado, e.slug, e.datos, a.rol FROM eventos e JOIN accesos_evento a ON a.evento_id = e.id WHERE a.usuario_id = ? ORDER BY e.actualizado DESC LIMIT 100', u.id);
    const peds = await q('SELECT id, numero, medio, moneda, importe, estado, creado, detalle FROM pedidos WHERE usuario_id = ? OR email = ? ORDER BY creado DESC LIMIT 100', u.id, u.email);
    const emp = await q('SELECT e.id, e.nombre, m.rol FROM miembros m JOIN empresas e ON e.id = m.empresa_id WHERE m.usuario_id = ?', u.id);
    return json({ usuario: u, eventos: evs.map((e) => ({ id: e.id, tipo: e.tipo, modelo: e.modelo, paquete: e.paquete, estado: e.estado, rol: e.rol, nombres: nombresDe(JSON.parse(e.datos || '{}')), link: e.estado === 'publicado' && e.slug ? `/${e.tipo}/${e.slug}` : null })),
      pedidos: peds.map((p) => { let d = {}; try { d = JSON.parse(p.detalle); } catch { /* sin detalle */ } return { id: p.id, numero: p.numero, medio: p.medio, moneda: p.moneda, importe: p.importe, estado: p.estado, creado: p.creado, producto: d.nombre }; }), empresas: emp });
  }
  const t = str(url.searchParams.get('q'), 80), pag = Math.max(0, parseInt(url.searchParams.get('pagina'), 10) || 0);
  const rows = await q(`SELECT u.id, u.email, u.nombre, u.pais, u.creado,
      (SELECT COUNT(*) FROM accesos_evento a WHERE a.usuario_id = u.id) AS eventos,
      (SELECT COUNT(*) FROM pedidos p WHERE (p.usuario_id = u.id OR p.email = u.email) AND p.estado = 'pagado') AS pedidos
    FROM usuarios u ${t ? "WHERE u.email LIKE ? ESCAPE '\\' OR u.nombre LIKE ? ESCAPE '\\'" : ''} ORDER BY u.creado DESC LIMIT ? OFFSET ?`, ...(t ? [LIKE(t), LIKE(t)] : []), POR_PAGINA + 1, pag * POR_PAGINA);
  return json({ usuarios: rows.slice(0, POR_PAGINA), pagina: pag, hayMas: rows.length > POR_PAGINA });
}

// ── Consultas del formulario de contacto ───────────────────────────────
export async function consultas(request, env, id, accion) {
  const u = await entrar(request, env);
  const q = consulta(env);
  if (request.method === 'GET') return json({ consultas: await q('SELECT * FROM consultas ORDER BY (estado = \'nueva\') DESC, creado DESC LIMIT 200') });
  const b = await readJson(request).catch(() => ({}));
  if (accion === 'estado') {
    const estado = ['nueva', 'respondida', 'archivada'].includes(b.estado) ? b.estado : null;
    if (!estado) throw new HttpError(400, 'Estado desconocido');
    await env.DB.prepare('UPDATE consultas SET estado = ? WHERE id = ?').bind(estado, str(id, 40)).run();
    return json({ ok: true });
  }
  throw new HttpError(404, 'no encontrado');
}

export async function registro(request, env) {
  await entrar(request, env);
  return json({ registro: await consulta(env)('SELECT * FROM admin_log ORDER BY id DESC LIMIT 200') });
}

// ── Precios: descuentos por país y promociones (README ronda 36) ─────────
const CATEGORIAS_PROMO = ['boda', '15', 'cumple', 'bautismo', 'comunion', 'babyshower', 'graduacion', 'empresarial', 'otros'];
export async function precios(request, env) {
  const u = await entrar(request, env);
  if (request.method === 'GET') {
    olvidarConfig(); await cargarConfig(env);
    return json({ descuentos: CONFIG.descuentos ?? DESCUENTO_PAIS, porDefecto: DESCUENTO_PAIS, personalizado: !!CONFIG.descuentos, promos: CONFIG.promos,
      paises: Object.keys(COUNTRY_CURRENCY).sort(), categorias: CATEGORIAS_PROMO, planes: PLANES_PROMO, items: PROMO_ITEMS,
      // README (ronda 47): precios base (en euros, IVA incluido) y países con precio fijo en su moneda
      base: listaPrecios(), basePersonalizada: !!CONFIG.base, fijos: fijosVigentes(), fijosPersonalizados: !!CONFIG.fijos,
      clavesFijas: clavesFijas(), monedaDePais: COUNTRY_CURRENCY, monedas: CURRENCIES });
  }
  const b = await readJson(request);
  let actual = {};
  try { actual = JSON.parse((await getState(env, 'config_precios')) || '{}'); } catch { actual = {}; }
  if (b.descuentos) {
    const d = {};
    for (const [k, v] of Object.entries(b.descuentos)) {
      const pais = String(k).toUpperCase().trim();
      const n = Number(v);
      if (!/^[A-Z]{2}$/.test(pais) || !(n > 0) || n > 90) continue;
      d[pais] = Math.round(n * 100) / 100;
    }
    actual.descuentos = d;
  }
  if (b.restaurar) delete actual.descuentos;
  // README (ronda 47): precios base. Solo se guardan los que cambian respecto del catálogo
  if (b.base && typeof b.base === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(b.base)) {
      const n = Math.round(Number(v) * 100) / 100;
      if (!(k in PRECIOS_ORIGINALES) || v === '' || v == null || !(n >= 0) || n > 100000) continue;
      if (n !== PRECIOS_ORIGINALES[k]) o[k] = n;
    }
    if (Object.keys(o).length) actual.base = o; else delete actual.base;
  }
  if (b.restaurarBase) delete actual.base;
  // Países con precio fijo en su moneda (como Argentina)
  if (b.fijos && typeof b.fijos === 'object') {
    const validas = new Set(clavesFijas().map((x) => x.clave));
    const f = {};
    for (const [k, v] of Object.entries(b.fijos)) {
      const pais = String(k).toUpperCase().trim();
      const moneda = String(v?.moneda || COUNTRY_CURRENCY[pais] || '').toUpperCase();
      if (!/^[A-Z]{2}$/.test(pais) || !CURRENCIES.includes(moneda)) continue;
      const precios = {};
      for (const [c, x] of Object.entries(v?.precios || {})) { const n = Math.round(Number(x) * 100) / 100; if (validas.has(c) && x !== '' && n > 0 && n < 1e9) precios[c] = n; }
      if (Object.keys(precios).length) f[pais] = { moneda, precios };
    }
    actual.fijos = f;
  }
  if (b.restaurarFijos) delete actual.fijos;
  if (Array.isArray(b.promos)) {
    actual.promos = b.promos.slice(0, 60).map((p) => ({
      id: str(p.id, 20) || randomId(5),
      nombre: str(p.nombre, 80) || 'Promoción',
      porcentaje: Math.min(90, Math.max(0, Math.round(Number(p.porcentaje) * 100) / 100 || 0)),
      activa: !!p.activa,
      paises: [...new Set([].concat(p.paises || []).map((x) => String(x).toUpperCase().trim()).filter((x) => /^[A-Z]{2}$/.test(x)))],
      categorias: [].concat(p.categorias || []).filter((x) => CATEGORIAS_PROMO.includes(x)),
      planes: [].concat(p.planes || []).filter((x) => PLANES_PROMO.includes(x)),
      aplica: [].concat(p.aplica || []).filter((x) => PROMO_ITEMS.includes(x)), // README (ronda 48)
      desde: /^\d{4}-\d{2}-\d{2}$/.test(p.desde || '') ? p.desde : '',
      hasta: /^\d{4}-\d{2}-\d{2}$/.test(p.hasta || '') ? p.hasta : '',
    })).filter((p) => p.porcentaje > 0);
  }
  await setState(env, 'config_precios', JSON.stringify(actual));
  olvidarConfig();
  await registrar(env, u, 'precios.guardar', null, { descuentos: b.descuentos ? Object.keys(b.descuentos).length : undefined, promos: Array.isArray(b.promos) ? b.promos.length : undefined, restaurar: !!b.restaurar, base: b.base ? Object.keys(b.base).length : undefined, fijos: b.fijos ? Object.keys(b.fijos) : undefined });
  return json({ ok: true });
}

// ── README (ronda 48) · Limpieza antes de abrir: borra los pedidos de prueba (y sus facturas, y si se pide, sus invitaciones)
// y vuelve a empezar la numeración de las facturas (AI<año>-00001) cuando ya no queda ninguna factura de ese año.
//   GET  /api/admin/limpieza → pedidos, facturas y numeración actual
//   POST /api/admin/limpieza { pedidos: [ids], invitaciones: bool, reiniciar: bool, confirmo: 'BORRAR' }
export async function limpieza(request, env) {
  const u = await entrar(request, env);
  const q = consulta(env);
  try { await env.DB.prepare('SELECT 1 FROM invoices LIMIT 1').first(); } catch { /* sin facturas todavía */ }
  const facturas = async () => { try { return await q('SELECT id, number, order_id, year, series, total, currency FROM invoices ORDER BY year, seq'); } catch { return []; } };
  const numeracion = async () => { try { return await q('SELECT series, year, n FROM invoice_seq ORDER BY year'); } catch { return []; } };
  if (request.method === 'GET') {
    return json({ pedidos: await q('SELECT id, numero, creado, email, estado, medio, importe, moneda, tipo, evento_id, detalle FROM pedidos ORDER BY creado DESC LIMIT 500'),
      facturas: await facturas(), numeracion: await numeracion() });
  }
  const b = await readJson(request);
  if (b.confirmo !== 'BORRAR') throw new HttpError(400, 'Falta confirmar (escribir BORRAR)');
  const ids = [...new Set([].concat(b.pedidos || []).map((x) => str(x, 40)).filter(Boolean))].slice(0, 500);
  let pedidos = 0, invitaciones = 0, borradas = 0;
  const alm = almacenD1(env);
  for (const id of ids) {
    const p = await env.DB.prepare('SELECT id, evento_id, tipo FROM pedidos WHERE id = ?').bind(id).first();
    if (!p) continue;
    try { borradas += (await env.DB.prepare('DELETE FROM invoices WHERE order_id = ?').bind(id).run()).meta.changes || 0; } catch { /* sin tabla */ }
    await env.DB.prepare('DELETE FROM pedidos WHERE id = ?').bind(id).run();
    pedidos++;
    // La invitación del pedido (solo si la creó ese pedido y ningún otro pedido la usa)
    if (b.invitaciones && p.evento_id) {
      const otro = await env.DB.prepare('SELECT 1 FROM pedidos WHERE evento_id = ? LIMIT 1').bind(p.evento_id).first();
      if (!otro && await alm.evento(p.evento_id)) { await alm.eliminarEvento(p.evento_id); invitaciones++; }
    }
  }
  // Numeración: se reinicia solo si no queda ninguna factura de esa serie y año (si no, quedaría un hueco o un número repetido)
  let reiniciada = false;
  if (b.reiniciar) {
    for (const r of await numeracion()) {
      const queda = await env.DB.prepare('SELECT 1 FROM invoices WHERE series = ? AND year = ? LIMIT 1').bind(r.series, r.year).first().catch(() => null);
      if (!queda) { await env.DB.prepare('DELETE FROM invoice_seq WHERE series = ? AND year = ?').bind(r.series, r.year).run(); reiniciada = true; }
    }
  }
  await registrar(env, u, 'limpieza', null, { pedidos, facturas: borradas, invitaciones, reiniciada });
  return json({ ok: true, pedidos, facturas: borradas, invitaciones, reiniciada });
}
