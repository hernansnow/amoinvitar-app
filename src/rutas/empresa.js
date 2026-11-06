// README (ronda 35) · Tablero del profesional (/empresa/). Todo con la sesión iniciada (solo miembros de la empresa).
//   GET    /api/empresa[?e=<id>]                 empresa, nivel, créditos, eventos, equipo, marca y compras
//   POST   /api/empresa/eventos                  { tipo, modelo, nombres: {a,b}, fecha }   crea un evento de la empresa
//   POST   /api/empresa/eventos/<id>/ajustes     { clientePublica }   el cliente puede publicar con su link
//   DELETE /api/empresa/eventos/<id>             borra un borrador sin publicar (y sin crédito usado)
//   POST   /api/empresa/marca                    { nombre, pie, sinPie, blanca }
//   POST   /api/empresa/logo  (imagen)  ·  DELETE /api/empresa/logo
//   POST   /api/empresa/equipo                   { email, rol: 'editor' | 'lectura' }   ·   DELETE /api/empresa/equipo/<usuarioId>
//   POST   /api/empresa/compras                  { item, pais, nombre, nif, direccion }   ·   POST /api/empresa/compras/<id>/cancelar
// Roles (tabla miembros): duenio (todo) · editor (crea y edita eventos) · lectura (solo mira).
import { json, readJson, isEmail, str, randomId, HttpError } from '../lib/util.js';
import { usuarioActual, crearUsuario } from '../lib/auth.js';
import { almacenD1 } from '../almacen.js';
import { MODELOS, TIPOS_EVENTO, modelo as buscarModelo, nombreModelo } from '../modelos.js';
import { varianteDePais } from '../textos/index.js';
import { sendEmail, mailEquipoPro } from '../lib/email.js';
import { PROFESIONALES } from '../catalogo.js';
import { asegurarTablasPro } from '../pro/esquema.js';
import { empresasDe, creditosDe, paseVigente, limiteUsuarios, catalogoCompras } from '../pro/empresa.js';
import { crearCompra, mediosPro, confirmarCompra } from '../pro/compras.js';
import { transferInfo } from '../lib/pagos.js';
import { getInvoice, invoiceUrl } from '../lib/facturas.js';

const sitio = (env, request) => String(env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
const pais = (request) => request.cf?.country || request.headers.get('cf-ipcountry') || null;
const TIPOS_LOGO = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const nombresDe = (d = {}) => [d.nombres?.a, d.nombres?.b].filter(Boolean).join(' & ');

async function contexto(request, env, url) {
  const u = await usuarioActual(request, env);
  if (!u) throw new HttpError(401, 'Hay que entrar con la cuenta');
  await asegurarTablasPro(env);
  const empresas = await empresasDe(env, u.id);
  if (!empresas.length) throw new HttpError(403, 'Esta cuenta no tiene una empresa profesional');
  const e = empresas.find((x) => x.id === url.searchParams.get('e')) || empresas[0];
  return { u, empresas, e, duenio: e.rol === 'duenio', puedeEditar: ['duenio', 'editor'].includes(e.rol), studio: paseVigente(e) };
}
const exigir = (ok, msg = 'Sin permiso para esto') => { if (!ok) throw new HttpError(403, msg); };

export async function api(request, env, partes) {
  const url = new URL(request.url);
  const c = await contexto(request, env, url);
  const [, , recurso, id, accion] = partes;
  const M = request.method;
  if (!recurso && M === 'GET') return json(await resumen(request, env, c));
  if (c.e.estado !== 'activa') throw new HttpError(403, 'La cuenta está suspendida. Escribir a Amo Invitar!.');
  if (recurso === 'eventos') {
    if (!id && M === 'POST') return crearEvento(request, env, c);
    if (id && accion === 'ajustes' && M === 'POST') return ajustesEvento(request, env, c, id);
    if (id && !accion && M === 'DELETE') return borrarEvento(env, c, id);
  }
  if (recurso === 'marca' && M === 'POST') return guardarMarca(request, env, c);
  if (recurso === 'logo' && M === 'POST') return subirLogo(request, env, c);
  if (recurso === 'logo' && M === 'DELETE') return quitarLogo(env, c);
  if (recurso === 'equipo') {
    if (!id && M === 'POST') return sumarMiembro(request, env, c);
    if (id && M === 'DELETE') return quitarMiembro(env, c, id);
  }
  if (recurso === 'compras') {
    if (!id && M === 'POST') return comprar(request, env, c);
    if (id && accion === 'cancelar' && M === 'POST') return cancelarCompra(env, c, id);
    if (id && accion === 'confirmar' && M === 'POST') return confirmarPago(request, env, c, id);
  }
  return json({ error: 'no encontrado' }, 404);
}

// ── Resumen ───────────────────────────────────────────────────────────
async function resumen(request, env, c) {
  const { e, u } = c;
  const cred = await creditosDe(env, e.id);
  const { results: filas } = await env.DB.prepare(`SELECT v.id, v.tipo, v.modelo, v.paquete, v.estado, v.slug, v.vence, v.clave_panel, v.datos, v.actualizado,
      (SELECT COUNT(*) FROM respuestas r WHERE r.evento_id = v.id AND r.tipo = 'rsvp') AS respuestas,
      (SELECT COUNT(*) FROM invitados i WHERE i.evento_id = v.id) AS invitados
    FROM eventos v WHERE v.empresa_id = ? ORDER BY v.actualizado DESC LIMIT 300`).bind(e.id).all();
  const eventos = (filas || []).map((f) => {
    const d = JSON.parse(f.datos || '{}');
    const m = buscarModelo(f.modelo);
    return { id: f.id, nombres: nombresDe(d), tipo: f.tipo, tipoNombre: TIPOS_EVENTO.find((t) => t.id === f.tipo)?.nombre || f.tipo, modelo: m ? nombreModelo(m, f.tipo) : f.modelo,
      paquete: f.paquete, estado: f.estado, link: f.estado === 'publicado' && f.slug ? `/${f.tipo}/${f.slug}` : null, vence: f.vence, fecha: d.celebracion?.fecha || d.ceremonia?.fecha || null,
      respuestas: f.respuestas, invitados: f.invitados, creditoUsado: !!d.empresa?.credito, clientePublica: !!d.empresa?.clientePublica,
      linkCliente: `/panel/${f.id}?k=${f.clave_panel}`, actualizado: f.actualizado };
  });
  const { results: miembros } = await env.DB.prepare('SELECT u.id AS usuarioId, u.email, u.nombre, m.rol FROM miembros m JOIN usuarios u ON u.id = m.usuario_id WHERE m.empresa_id = ? ORDER BY (m.rol = \'duenio\') DESC, u.email').bind(e.id).all();
  const { results: compras } = await env.DB.prepare('SELECT id, numero, item, creditos, neto, iva_tasa, iva, total, estado, creado, pagada, factura FROM compras_pro WHERE empresa_id = ? ORDER BY creado DESC LIMIT 100').bind(e.id).all();
  const cat = catalogoCompras();
  const nivel = e.nivel;
  const base = sitio(env, request);
  // Con Studio (pase vigente) el panel va sin la marca de Amo Invitar; en Pro, con ella
  return {
    usuario: { id: u.id, email: u.email, nombre: u.nombre },
    empresas: c.empresas.map((x) => ({ id: x.id, nombre: x.nombre })),
    empresa: { id: e.id, nombre: e.nombre, rol: e.rol, nivel, studio: c.studio, paseVence: e.pase_vence, paseVencido: nivel === 'studio' && !c.studio, estado: e.estado, dominio: !!e.dominio },
    limites: { usuarios: limiteUsuarios(nivel), usados: (miembros || []).length },
    creditos: cred,
    marca: { nombre: e.marca.nombre || '', pie: e.marca.pie || '', logo: e.marca.logo || '', sinPie: !!e.marca.sinPie, blanca: !!e.marca.blanca },
    eventos, equipo: miembros || [], compras: await Promise.all((compras || []).map(async (x) => {
      const inv = x.factura ? await getInvoice(env, x.factura).catch(() => null) : null;
      return { ...x, nombre: cat[x.item]?.nombre || x.item, urlFactura: inv ? await invoiceUrl(env, base, inv) : null };
    })),
    tipos: TIPOS_EVENTO.filter((t) => !t.grupo).map((t) => ({ id: t.id, nombre: t.nombre })),
    modelos: MODELOS.filter((m) => !m.simple && !m.std).map((m) => ({ id: m.id, nombre: m.nombre, eventos: m.eventos })),
    tienda: {
      credito: PROFESIONALES.credito, pase: PROFESIONALES.studio.pase, config: PROFESIONALES.studio.configuracionDominio,
      productos: Object.entries(cat).filter(([k, v]) => (nivel === 'studio' ? (v.nivel === 'studio' && c.studio) || v.nivel === 'studio-pase' : v.nivel === 'pro' || v.nivel === 'studio-pase'))
        .map(([k, v]) => ({ id: k, nombre: v.nombre, creditos: v.creditos, neto: v.neto, nivel: v.nivel })),
      transferencia: transferInfo(env, 'EUR'),
      // Medios de pago online según el país de facturación (el de Argentina cobra en pesos con Mercado Pago)
      medios: { general: mediosPro(env, 'ES'), AR: mediosPro(env, 'AR') },
    },
    contacto: { whatsapp: String(env.WHATSAPP || '').replace(/\D/g, ''), email: env.SUPPORT_EMAIL || 'hola@amoinvitar.com' },
    base,
  };
}

// ── Eventos ───────────────────────────────────────────────────────────
async function crearEvento(request, env, c) {
  exigir(c.puedeEditar, 'Tu rol no permite crear eventos');
  const b = await readJson(request);
  const tipo = str(b.tipo, 20);
  const m = buscarModelo(b.modelo);
  let tipoReal = tipo;
  if (m && !m.eventos.includes(tipoReal)) tipoReal = TIPOS_EVENTO.find((t) => t.grupo === tipo && m.eventos.includes(t.id))?.id || tipo;
  if (!m || !m.eventos.includes(tipoReal) || !TIPOS_EVENTO.some((t) => t.id === tipoReal)) throw new HttpError(400, 'Elige un diseño disponible para ese evento');
  const a = str(b.nombres?.a, 20), bb = str(b.nombres?.b, 20);
  if (!a) throw new HttpError(400, 'Falta el nombre');
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(b.fecha || '') ? b.fecha : '';
  const ev = {
    id: `ev_${randomId(5)}`, producto: 'invitacion', tipo: tipoReal, modelo: m.id, paquete: 'borrador', aMedida: null, estado: 'borrador', clave: randomId(16), empresaId: c.e.id, slug: null,
    datos: { variante: varianteDePais(pais(request)), acceso: { modo: 'abierta' }, extras: [], nombres: bb ? { a, b: bb } : { a }, celebracion: fecha ? { fecha, inicio: fecha } : {}, empresa: { clientePublica: false } },
  };
  await almacenD1(env).guardarEvento(ev);
  return json({ id: ev.id, panel: `/panel/${ev.id}` }, 201);
}

async function eventoDeEmpresa(env, c, id) {
  const ev = await almacenD1(env).evento(str(id, 40));
  if (!ev || ev.empresaId !== c.e.id) throw new HttpError(404, 'No existe ese evento');
  return ev;
}
async function ajustesEvento(request, env, c, id) {
  exigir(c.puedeEditar);
  const ev = await eventoDeEmpresa(env, c, id);
  const b = await readJson(request);
  ev.datos.empresa = { ...(ev.datos.empresa || {}), clientePublica: !!b.clientePublica };
  await almacenD1(env).guardarEvento(ev);
  return json({ ok: true });
}
async function borrarEvento(env, c, id) {
  exigir(c.puedeEditar);
  const ev = await eventoDeEmpresa(env, c, id);
  if (ev.estado === 'publicado' || ev.datos.empresa?.credito) throw new HttpError(409, 'No se puede borrar una invitación publicada ni una que ya usó un crédito');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM invitados WHERE evento_id = ?').bind(ev.id),
    env.DB.prepare('DELETE FROM respuestas WHERE evento_id = ?').bind(ev.id),
    env.DB.prepare('DELETE FROM accesos_evento WHERE evento_id = ?').bind(ev.id),
    env.DB.prepare('DELETE FROM eventos WHERE id = ? AND empresa_id = ?').bind(ev.id, c.e.id),
  ]);
  return json({ ok: true });
}

// ── Marca ─────────────────────────────────────────────────────────────
async function guardarMarcaEmpresa(env, id, marca) {
  await env.DB.prepare('UPDATE empresas SET marca = ? WHERE id = ?').bind(JSON.stringify(marca), id).run();
}
async function guardarMarca(request, env, c) {
  exigir(c.duenio, 'Solo el dueño puede cambiar la marca');
  const b = await readJson(request);
  const marca = { ...c.e.marca };
  marca.nombre = str(b.nombre, 80); marca.pie = str(b.pie, 140);
  const quiereBlanca = !!b.blanca, quiereSinPie = !!b.sinPie;
  if ((quiereBlanca || quiereSinPie) && !c.studio) throw new HttpError(409, 'La marca blanca es del nivel Studio con el pase anual vigente');
  marca.blanca = quiereBlanca; marca.sinPie = quiereBlanca && quiereSinPie;
  await guardarMarcaEmpresa(env, c.e.id, marca);
  return json({ ok: true, marca });
}
async function subirLogo(request, env, c) {
  exigir(c.duenio, 'Solo el dueño puede cambiar el logo');
  const tipo = (request.headers.get('content-type') || '').split(';')[0].trim();
  const ext = TIPOS_LOGO[tipo];
  if (!ext) throw new HttpError(415, 'El logo tiene que ser PNG, JPG o WEBP');
  const cuerpo = await request.arrayBuffer();
  if (!cuerpo.byteLength) throw new HttpError(400, 'Falta el archivo');
  if (cuerpo.byteLength > 1.5 * 1024 * 1024) throw new HttpError(413, 'El logo supera 1,5 MB');
  const clave = `empresas/${c.e.id}/logo-${randomId(4)}.${ext}`;
  await almacenD1(env).subir(clave, cuerpo, tipo);
  const marca = { ...c.e.marca, logo: `/media/${clave}` };
  await guardarMarcaEmpresa(env, c.e.id, marca);
  return json({ ok: true, logo: marca.logo });
}
async function quitarLogo(env, c) {
  exigir(c.duenio);
  const marca = { ...c.e.marca }; delete marca.logo;
  await guardarMarcaEmpresa(env, c.e.id, marca);
  return json({ ok: true });
}

// ── Equipo ────────────────────────────────────────────────────────────
async function sumarMiembro(request, env, c) {
  exigir(c.duenio, 'Solo el dueño maneja el equipo');
  const b = await readJson(request);
  const email = str(b.email, 150).toLowerCase();
  if (!isEmail(email)) throw new HttpError(400, 'El mail no parece válido');
  const rol = b.rol === 'lectura' ? 'lectura' : 'editor';
  const n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM miembros WHERE empresa_id = ?').bind(c.e.id).first()).n;
  const limite = limiteUsuarios(c.e.nivel);
  const u = await crearUsuario(env, email, {});
  const ya = await env.DB.prepare('SELECT 1 FROM miembros WHERE empresa_id = ? AND usuario_id = ?').bind(c.e.id, u.id).first();
  if (!ya && n >= limite) throw new HttpError(409, `El nivel ${c.e.nivel === 'studio' ? 'Studio' : 'Pro'} admite hasta ${limite} usuarios (contando al dueño).${c.e.nivel === 'studio' ? '' : ' Con Studio son 10.'}`);
  await env.DB.prepare('INSERT INTO miembros (empresa_id, usuario_id, rol) VALUES (?, ?, ?) ON CONFLICT(empresa_id, usuario_id) DO UPDATE SET rol = CASE WHEN miembros.rol = \'duenio\' THEN \'duenio\' ELSE excluded.rol END').bind(c.e.id, u.id, rol).run();
  try { await sendEmail(env, { to: email, ...mailEquipoPro(env, { empresa: c.e.nombre, quien: c.u.nombre || c.u.email, url: `${sitio(env, request)}/entrar?siguiente=/empresa/` }) }); } catch (e) { console.error('[equipo]', e); }
  return json({ ok: true });
}
async function quitarMiembro(env, c, usuarioId) {
  exigir(c.duenio, 'Solo el dueño maneja el equipo');
  const m = await env.DB.prepare('SELECT rol FROM miembros WHERE empresa_id = ? AND usuario_id = ?').bind(c.e.id, usuarioId).first();
  if (!m) throw new HttpError(404, 'Esa persona no está en el equipo');
  if (m.rol === 'duenio') throw new HttpError(409, 'El dueño no se puede quitar');
  await env.DB.prepare('DELETE FROM miembros WHERE empresa_id = ? AND usuario_id = ?').bind(c.e.id, usuarioId).run();
  return json({ ok: true });
}

// ── Compras ───────────────────────────────────────────────────────────
async function comprar(request, env, c) {
  exigir(c.duenio, 'Solo el dueño puede comprar');
  const b = await readJson(request);
  const item = str(b.item, 20), cat = catalogoCompras()[item];
  if (!cat) throw new HttpError(400, 'Producto desconocido');
  const permitido = cat.nivel === 'studio-pase' || (cat.nivel === 'pro' && c.e.nivel === 'pro') || (cat.nivel === 'studio' && c.studio);
  if (!permitido) throw new HttpError(409, cat.nivel === 'studio' ? 'Los packs Studio necesitan el pase anual vigente' : 'Ese producto no está disponible para tu nivel');
  const pend = await env.DB.prepare("SELECT COUNT(*) AS n FROM compras_pro WHERE empresa_id = ? AND estado = 'pendiente'").bind(c.e.id).first();
  if (pend.n >= 5) throw new HttpError(409, 'Hay varios pedidos pendientes de pago. Se pueden cancelar los que no se vayan a abonar.');
  const paisFiscal = str(b.pais, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(paisFiscal)) throw new HttpError(400, 'Elige el país de facturación');
  if (str(b.nombre, 120).length < 2) throw new HttpError(400, 'Falta el nombre o la razón social para la factura');
  const r = await crearCompra(env, { empresaId: c.e.id, usuarioId: c.u.id, item, pais: paisFiscal, email: c.u.email, empresaNombre: c.e.nombre,
    fiscal: { nombre: str(b.nombre, 120), id: str(b.nif, 40), direccion: str(b.direccion, 300) }, medio: str(b.medio, 20) || 'transfer', base: new URL(request.url).origin });
  return json({ ok: true, ...r }, 201);
}
// Al volver de la pasarela: se confirma con ella y se acreditan los créditos (o el pase)
async function confirmarPago(request, env, c, id) {
  const b = await readJson(request).catch(() => ({}));
  const mia = await env.DB.prepare('SELECT 1 FROM compras_pro WHERE id = ? AND empresa_id = ?').bind(str(id, 20), c.e.id).first();
  if (!mia) throw new HttpError(404, 'Pedido no encontrado');
  const r = await confirmarCompra(env, str(id, 20), { session: str(b.session, 120), token: str(b.token, 60), base: new URL(request.url).origin });
  return json({ ok: true, estado: r?.estado || 'desconocido' });
}
async function cancelarCompra(env, c, id) {
  exigir(c.duenio);
  const r = await env.DB.prepare("UPDATE compras_pro SET estado = 'cancelada' WHERE id = ? AND empresa_id = ? AND estado = 'pendiente'").bind(str(id, 20), c.e.id).run();
  if (!r.meta.changes) throw new HttpError(409, 'Ese pedido ya no se puede cancelar');
  return json({ ok: true });
}
