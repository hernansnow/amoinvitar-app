// README (ronda 33) · Consola de administración (/admin/): cuentas profesionales, diseños a medida y transferencias.
//   GET  /api/admin/resumen                                   todo lo pendiente y las empresas
//   POST /api/admin/pro/solicitudes/<id>/aprobar   { nivel, paseMeses, creditos, nota }
//   POST /api/admin/pro/solicitudes/<id>/rechazar  { motivo }
//   POST /api/admin/pro/empresas/<id>/creditos     { cantidad, origen, nota }   (los créditos vencen a los 12 meses)
//   POST /api/admin/pro/empresas/<id>/pase         { meses }   renovar el pase anual (Studio)
//   POST /api/admin/pro/empresas/<id>/estado       { estado: 'activa' | 'suspendida', nivel? }
//   POST /api/admin/pro/empresas/<id>/complementos { habilitado }   (README ronda 87) el profesional ve y compra créditos de complementos
//   POST /api/admin/pro/empresas/<id>/regalar      { item, cantidad, nota }   créditos de complementos sin cargo (negativo = descontar)
//   POST /api/admin/pro/empresas/<id>/demo         { demo }   cuenta DEMO de Studio (pase 30 días y 1 crédito si no tiene)
//   POST /api/admin/medidas/<evento>/<aprobar|lista|abrir|cerrar>  { parte: 'std' | 'medida' | 'diseno' }
// Quien entra: un administrador (ADMINS) con su sesión, o la clave ADMIN_CLAVE.
import { json, readJson, str, randomId, HttpError } from '../lib/util.js';
import { requiereAdmin } from './admin.js';
import { asegurarTablasPro } from '../pro/esquema.js';
import { crearUsuario } from '../lib/auth.js';
import { almacenD1 } from '../almacen.js';
import { prepararLista } from '../propio.js'; // README (ronda 92)
import { sendEmail, mailMedidaAprobada, mailProAprobada, mailProRechazada } from '../lib/email.js';
import { PROFESIONALES } from '../catalogo.js';
import { sumarMeses, nuevoLote, renovarPase as renovarPaseBase, catalogoCompras } from '../pro/empresa.js';
import { pagarCompra } from '../pro/compras.js';
import { extrasDe, cambiarExtras, sumarSaldo, COMPLEMENTOS_PRO, sumarDuo, paseDuo } from '../pro/extras.js';
import { dominiosParaAdmin, marcarDominio, quitarDominio, revisarDominio, conCloudflare, cnameDe } from '../pro/dominios.js';
import { idiomaPara, recordarIdioma } from '../lib/idioma-mail.js'; // README (ronda 118)

const ahora = () => new Date().toISOString();
const sitio = (env, request) => String(env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '');

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
      // README (ronda 92): qué se entrega: la invitación o la STD web (con «Diseño propio») o la tarjeta STD (imágenes en el panel)
      const t = parte === 'std' ? d.std?.tipo : f.producto;
      const entrega = t === 'tarjeta-medida' || t === 'std-tarjeta-medida' ? 'tarjeta' : t === 'web-medida' || t === 'std-web-medida' ? 'web' : 'invitacion';
      medidas.push({ id: f.id, parte, producto: f.producto, tipo: f.tipo, nombres: [d.nombres?.a, d.nombres?.b].filter(Boolean).join(' & '), enviado: m.enviado, aprobado: m.aprobado || null, listo: m.listo || null,
        entrega, entregadas: (m.entrega || []).length, abierta: !!m.abierta, disenoId: parte === 'std' ? `${f.id}std` : f.id });
    }
  }
  const transferencias = (await q("SELECT id, numero, email, importe, moneda, detalle, creado FROM pedidos WHERE estado = 'pendiente' AND medio = 'transferencia' ORDER BY creado DESC LIMIT 100"))
    .map((p) => ({ id: p.id, numero: p.numero, email: p.email, importe: p.importe, moneda: p.moneda, producto: (() => { try { return JSON.parse(p.detalle).nombre; } catch { return ''; } })(), creado: p.creado }));
  const cat = catalogoCompras();
  const compras = (await q(`SELECT c.id, c.numero, c.item, c.neto, c.iva_tasa, c.iva, c.total, c.estado, c.creado, c.pagada, c.factura, e.nombre AS empresa FROM compras_pro c JOIN empresas e ON e.id = c.empresa_id ORDER BY (c.estado = 'pendiente') DESC, c.creado DESC LIMIT 100`)).map((x) => ({ ...x, nombre: cat[x.item]?.nombre || x.item }));
  const dominios = await dominiosParaAdmin(env);
  // README (ronda 87): DEMO y créditos de complementos de cada empresa
  for (const e of empresas) { const x = await extrasDe(env, e.id); e.demo = x.demo; e.compHabilitado = x.habilitado; e.compSaldo = x.saldo; }
  return json({ solicitudes, empresas, complementosPro: Object.entries(COMPLEMENTOS_PRO).map(([k, v]) => ({ id: k, nombre: v.nombre, neto: v.neto })), dominios, dominiosInfo: { cname: cnameDe(env), automatico: conCloudflare(env) }, medidas, transferencias, compras, base: { pase: PROFESIONALES.studio.pase, credito: PROFESIONALES.credito } });
}

// ── Cuentas profesionales ─────────────────────────────────────────────
export async function accionPro(request, env, partes) {
  await requiereAdmin(request, env);
  if (request.method !== 'POST') throw new HttpError(405, 'Método no permitido');
  await asegurarTablasPro(env);
  const [, , , recurso, id, accion] = partes; // api admin pro <solicitudes|empresas> <id> <accion>
  const b = await readJson(request);
  if (recurso === 'solicitudes') return accion === 'aprobar' ? aprobar(request, env, id, b) : accion === 'rechazar' ? rechazar(request, env, id, b) : json({ error: 'no encontrado' }, 404);
  if (recurso === 'compras') {
    if (accion === 'pagada') { const ok = await pagarCompra(env, id, { medio: str(b.medio, 20) || 'transferencia', nota: str(b.nota, 200) || null, base: sitio(env, request) }); if (!ok) throw new HttpError(409, 'Ese pedido ya estaba pagado o cancelado'); return json({ ok: true }); }
    if (accion === 'cancelar') { const r = await env.DB.prepare("UPDATE compras_pro SET estado = 'cancelada' WHERE id = ? AND estado = 'pendiente'").bind(str(id, 20)).run(); if (!r.meta.changes) throw new HttpError(409, 'Ese pedido ya no se puede cancelar'); return json({ ok: true }); }
  }
  if (recurso === 'dominios') {
    // id = el dominio; acciones: activar | verificando | pendiente | revisar | quitar
    const host = str(id, 253).toLowerCase();
    if (accion === 'revisar') { const d = await env.DB.prepare('SELECT empresa_id FROM dominios_pro WHERE host = ?').bind(host).first(); if (!d) throw new HttpError(404, 'No existe ese dominio'); await revisarDominio(env, d.empresa_id); return json({ ok: true }); }
    if (accion === 'quitar') { const d = await env.DB.prepare('SELECT empresa_id FROM dominios_pro WHERE host = ?').bind(host).first(); if (!d) throw new HttpError(404, 'No existe ese dominio'); await quitarDominio(env, d.empresa_id); return json({ ok: true }); }
    const estado = { activar: 'activo', verificando: 'verificando', pendiente: 'pendiente' }[accion];
    if (!estado) return json({ error: 'no encontrado' }, 404);
    if (!(await marcarDominio(env, host, estado, str(b.nota, 200) || null))) throw new HttpError(404, 'No existe ese dominio');
    return json({ ok: true });
  }
  if (recurso === 'empresas') {
    if (accion === 'dominio') { await env.DB.prepare('UPDATE empresas_pro SET dominio = ? WHERE empresa_id = ?').bind(b.derecho ? 1 : 0, str(id, 40)).run(); return json({ ok: true }); }
    if (accion === 'creditos') return darCreditos(env, id, b);
    if (accion === 'pase') return renovarPase(env, id, b);
    if (accion === 'estado') return cambiarEstado(env, id, b);
    if (accion === 'complementos') { await empresaPro(env, id); return json({ ok: true, ...(await cambiarExtras(env, id, { habilitado: !!b.habilitado })) }); }
    if (accion === 'regalar') {
      await empresaPro(env, id);
      const n = parseInt(b.cantidad, 10);
      if (!COMPLEMENTOS_PRO[b.item] || !n || Math.abs(n) > 100) throw new HttpError(400, 'Elegir el complemento y una cantidad (1 a 100)');
      return json({ ok: true, ...(await sumarSaldo(env, id, b.item, n, n > 0 ? 'regalo' : 'ajuste', str(b.nota, 120))) });
    }
    if (accion === 'demo') return modoDemo(env, id, b);
  }
  return json({ error: 'no encontrado' }, 404);
}

async function aprobar(request, env, id, b) {
  const s = await env.DB.prepare('SELECT * FROM solicitudes_pro WHERE id = ?').bind(id).first();
  if (!s) throw new HttpError(404, 'No existe esa solicitud');
  if (s.estado !== 'pendiente') throw new HttpError(409, 'Esa solicitud ya se resolvió');
  // README (ronda 122): Event Studio Duo = Studio + pase Duo (los dos vencen juntos)
  const conDuo = b.nivel === 'studio-duo';
  const nivel = b.nivel === 'studio' || conDuo ? 'studio' : 'pro';
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
  if (conDuo && paseMeses) await paseDuo(env, empresaId, sumarMeses(t, paseMeses));
  const creditosDuo = Math.max(0, Math.min(1000, parseInt(b.creditosDuo, 10) || 0));
  if (creditosDuo) await sumarDuo(env, empresaId, creditosDuo, 'regalo', str(b.nota, 200) || 'Créditos Duo iniciales');
  await env.DB.prepare("UPDATE solicitudes_pro SET estado = 'aprobada', empresa_id = ?, nota = ?, resuelto = ? WHERE id = ?").bind(empresaId, str(b.nota, 300) || null, t, id).run();
  try { await sendEmail(env, { to: s.email, ...mailProAprobada(env, { idioma: await idiomaPara(env, s.email), nombre: s.nombre, nivel: conDuo ? PROFESIONALES.studioDuo.nombre : PROFESIONALES[nivel].nombre, url: sitio(env, request) }) }); } catch (e) { console.error('[pro aprobada]', e); }
  return json({ ok: true, empresa: empresaId });
}

async function rechazar(request, env, id, b) {
  const s = await env.DB.prepare('SELECT * FROM solicitudes_pro WHERE id = ?').bind(id).first();
  if (!s) throw new HttpError(404, 'No existe esa solicitud');
  if (s.estado !== 'pendiente') throw new HttpError(409, 'Esa solicitud ya se resolvió');
  const motivo = str(b.motivo, 400);
  await env.DB.prepare("UPDATE solicitudes_pro SET estado = 'rechazada', nota = ?, resuelto = ? WHERE id = ?").bind(motivo || null, ahora(), id).run();
  if (b.avisar !== false) { try { await sendEmail(env, { to: s.email, ...mailProRechazada(env, { idioma: await idiomaPara(env, s.email), nombre: s.nombre, motivo }) }); } catch (e) { console.error('[pro rechazada]', e); } }
  return json({ ok: true });
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
  // README (ronda 122): créditos Duo (invitación + álbum QR)
  if (String(b.origen || '').startsWith('duo') || String(b.origen || '').startsWith('sduo')) { await sumarDuo(env, id, cantidad, 'regalo', str(b.nota, 200) || b.origen); return json({ ok: true }); }
  // Los packs Studio son exclusivos con el pase anual activo
  const esStudio = String(b.origen || '').startsWith('studio');
  if (esStudio && !(e.nivel === 'studio' && e.pase_vence && e.pase_vence >= ahora())) throw new HttpError(409, 'Los packs Studio necesitan el pase anual vigente. Renovar o activar el pase primero.');
  await nuevoLote(env, id, cantidad, str(b.origen, 30) || 'manual', str(b.nota, 200));
  return json({ ok: true });
}

// Renovar el pase anual. Los créditos que sobran y todavía no vencieron pasan al año siguiente (se extienden 12 meses)
async function renovarPase(env, id, b) {
  await empresaPro(env, id);
  const r = await renovarPaseBase(env, id, Math.max(1, Math.min(36, parseInt(b.meses, 10) || 12)));
  return json({ ok: true, paseVence: r.paseVence, lotesExtendidos: r.lotesExtendidos });
}

// README (ronda 87): cuenta DEMO de Studio: arma invitaciones con 1 crédito, pero no las publica (solo vista previa)
async function modoDemo(env, id, b) {
  const e = await empresaPro(env, id);
  const x = await extrasDe(env, id);
  if (b.demo) {
    // README (ronda 88): se guarda el nivel y el pase de antes, para volver a ellos al quitar la DEMO
    const previo = x.demo && x.previo ? x.previo : { nivel: e.nivel, pase_vence: e.pase_vence || null };
    if (!(e.nivel === 'studio' && e.pase_vence && e.pase_vence >= ahora())) {
      await env.DB.prepare("UPDATE empresas_pro SET nivel = 'studio', pase_vence = ? WHERE empresa_id = ?").bind(sumarMeses(ahora(), 1), id).run();
      await env.DB.prepare("UPDATE empresas SET plan = 'studio' WHERE id = ?").bind(id).run();
    }
    const c = await env.DB.prepare('SELECT COALESCE(SUM(cantidad - usados), 0) AS n FROM creditos_lotes WHERE empresa_id = ? AND vence >= ?').bind(id, ahora()).first();
    if (!c?.n) await nuevoLote(env, id, 1, 'demo', 'Crédito de la cuenta DEMO');
    return json({ ok: true, ...(await cambiarExtras(env, id, { demo: true, previo })) });
  }
  // Al quitarla: vuelve al nivel y al pase que tenía (una cuenta Pro vuelve a Pro)
  if (x.demo && x.previo) {
    await env.DB.prepare('UPDATE empresas_pro SET nivel = ?, pase_vence = ? WHERE empresa_id = ?').bind(x.previo.nivel || 'pro', x.previo.pase_vence || null, id).run();
    await env.DB.prepare('UPDATE empresas SET plan = ? WHERE id = ?').bind(x.previo.nivel || 'pro', id).run();
  }
  return json({ ok: true, ...(await cambiarExtras(env, id, { demo: false, previo: null })) });
}

async function cambiarEstado(env, id, b) {
  await empresaPro(env, id);
  const estado = b.estado === 'suspendida' ? 'suspendida' : 'activa';
  const conDuo = b.nivel === 'studio-duo'; // README (ronda 122)
  const nivel = b.nivel === 'studio' || conDuo ? 'studio' : b.nivel === 'pro' ? 'pro' : null;
  await env.DB.prepare('UPDATE empresas_pro SET estado = ?, nivel = COALESCE(?, nivel) WHERE empresa_id = ?').bind(estado, nivel, id).run();
  if (nivel) await env.DB.prepare('UPDATE empresas SET plan = ? WHERE id = ?').bind(nivel, id).run();
  // README (ronda 89): al subir a Studio sin un pase vigente, el pase anual arranca hoy y dura 12 meses
  // (la DEMO, en cambio, da un pase de prueba de 1 mes)
  const e = await empresaPro(env, id);
  if (nivel === 'studio' && !(e.pase_vence && e.pase_vence >= ahora())) await env.DB.prepare('UPDATE empresas_pro SET pase_vence = ? WHERE empresa_id = ?').bind(sumarMeses(ahora(), 12), id).run();
  // Event Studio Duo: el pase Duo vence con el de Studio; al bajar a Pro o a Studio solo, se quita
  if (conDuo) await paseDuo(env, id, (await empresaPro(env, id)).pase_vence);
  else if (nivel) await paseDuo(env, id, null);
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
  // README (ronda 93): volver a abrir (o cerrar) la edición del cliente: invitación a medida / STD suelta («medida»),
  // Save The Date a medida complemento («std») o el pedido de «Cambios de diseño» («diseno»)
  if (accion === 'abrir' || accion === 'cerrar') {
    const obj = parte === 'diseno' ? ev.datos.diseno : parte === 'std' ? ev.datos.std?.medida : ev.datos.medida;
    if (!obj?.enviado) throw new HttpError(409, 'Todavía no se envió: el cliente ya puede editarlo');
    obj.abierta = accion === 'abrir';
    await alm.guardarEvento(ev);
    return json({ ok: true, abierta: obj.abierta });
  }
  const clave = parte === 'std' ? 'std' : 'medida';
  const actual = clave === 'std' ? ev.datos.std?.medida : ev.datos.medida;
  if (!actual?.enviado) throw new HttpError(409, 'Ese diseño todavía no se envió al equipo');
  const marca = accion === 'lista' ? { listo: ahora() } : accion === 'aprobar' ? { aprobado: ahora() } : null;
  if (!marca) throw new HttpError(404, 'no encontrado');
  // README (ronda 91/92): «Lista» con el diseño propio activo (invitación y STD web) o con la tarjeta STD entregada
  if (accion === 'lista') { const error = prepararLista(ev, parte === 'std' ? 'std' : 'medida'); if (error) throw new HttpError(409, error); }
  if (clave === 'std') ev.datos.std = { ...(ev.datos.std || {}), medida: { ...actual, ...marca } };
  else ev.datos.medida = { ...actual, ...marca };
  await alm.guardarEvento(ev);
  let avisados = 0;
  if (accion === 'aprobar') {
    const nombres = [ev.datos.nombres?.a, ev.datos.nombres?.b].filter(Boolean).join(' & ');
    for (const c of (await alm.accesos(ev.id)).filter((x) => x.rol === 'cliente')) {
      try { await sendEmail(env, { to: c.email, ...mailMedidaAprobada(env, { idioma: await idiomaPara(env, c.email, { evento: ev.id, variante: ev.datos?.variante }), url: `${sitio(env, request)}/panel/${ev.id}?k=${ev.clave}`, nombres }) }); avisados++; } catch (e) { console.error('[medida]', e); }
    }
  }
  return json({ ok: true, avisados });
}

// ── README (ronda 95): cobros adicionales con monto libre ──────────────
//   GET  /api/admin/adicionales            la lista (más nuevos primero)
//   POST /api/admin/adicionales            { titulo, monto, moneda, pais, email?, evento? } → link de pago y lo que pagaría
//   POST /api/admin/adicionales/<id>/cancelar
// El monto se toma como precio de lista en esa moneda: se pasa a euros con la cotización del día y, en el país elegido,
// valen las reglas de siempre (medios de pago del país, conversión, descuento por país e IVA).
export async function adicionales(request, env, id, accion) {
  await requiereAdmin(request, env);
  const { leerAdicional, guardarAdicional, cotizacionAdicional } = await import('./tienda.js');
  const { getRates, CURRENCIES } = await import('../lib/fx.js');
  const base = sitio(env, request);
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare("SELECT key, value FROM app_state WHERE key LIKE 'adicional:%' ORDER BY updated_at DESC LIMIT 100").all();
    return json({ adicionales: (results || []).map((r) => { try { return { id: r.key.slice(10), ...JSON.parse(r.value), link: `${base}/pagar/${r.key.slice(10)}` }; } catch { return null; } }).filter(Boolean) });
  }
  if (request.method !== 'POST') throw new HttpError(405, 'Método no permitido');
  if (id && accion === 'cancelar') {
    const a = await leerAdicional(env, id);
    if (!a) throw new HttpError(404, 'No existe');
    if (a.pagado) throw new HttpError(409, 'Ya está pagado');
    await guardarAdicional(env, { ...a, cancelado: new Date().toISOString() });
    return json({ ok: true });
  }
  const b = await readJson(request);
  const titulo = str(b.titulo, 120), monto = Number(b.monto), moneda = String(b.moneda || 'EUR').toUpperCase(), pais = String(b.pais || '').toUpperCase().slice(0, 2);
  if (!titulo) throw new HttpError(400, 'Falta el título (lo que se cobra)');
  if (!(monto > 0)) throw new HttpError(400, 'El monto tiene que ser mayor que 0');
  if (!CURRENCIES.includes(moneda)) throw new HttpError(400, 'Moneda no admitida');
  if (!/^[A-Z]{2}$/.test(pais)) throw new HttpError(400, 'Falta el país (código de 2 letras)');
  const email = str(b.email, 200).toLowerCase();
  const rates = await getRates(env);
  const r = (c) => Number(rates[c]) || 0;
  const eur = moneda === 'EUR' ? monto : Math.round(((monto / r(moneda)) * r('EUR')) * 100) / 100;
  if (!(eur > 0)) throw new HttpError(503, 'No hay cotización para esa moneda en este momento');
  const a = { id: randomId(10), titulo, monto, moneda, pais, eur, email: email || '', evento: str(b.evento, 40) || '', creado: new Date().toISOString() };
  await guardarAdicional(env, a);
  return json({ ok: true, ...a, link: `${base}/pagar/${a.id}`, medios: await cotizacionAdicional(env, request, a) });
}
