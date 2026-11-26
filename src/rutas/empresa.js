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
import { json, readJson, isEmail, str, randomId, HttpError, getCookie } from '../lib/util.js';
import { CURRENCIES, currencyForCountry, getRates, convertirSimple, isEU } from '../lib/fx.js';
import { formatMoney } from '../lib/dinero.js';
import { usuarioActual, crearUsuario } from '../lib/auth.js';
import { almacenD1 } from '../almacen.js';
import { MODELOS, TIPOS_EVENTO, modelo as buscarModelo, nombreModelo } from '../modelos.js';
import { varianteDePais } from '../textos/index.js';
import { sendEmail, mailEquipoPro } from '../lib/email.js';
import { PROFESIONALES, descuentoCredito } from '../catalogo.js';
import { asegurarTablasPro } from '../pro/esquema.js';
import { empresasDe, creditosDe, paseVigente, limiteUsuarios, catalogoCompras } from '../pro/empresa.js';
import { crearCompra, mediosPro, confirmarCompra } from '../pro/compras.js';
import { dominioDe, pedirDominio, revisarDominio, quitarDominio, conCloudflare, cnameDe } from '../pro/dominios.js';
import { transferInfo } from '../lib/pagos.js';
import { getInvoice, invoiceUrl } from '../lib/facturas.js';
import { extrasDe, COMPLEMENTOS_PRO, duoVigente } from '../pro/extras.js';
import { idiomaPara, recordarIdioma } from '../lib/idioma-mail.js'; // README (ronda 118)

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
  const extras = await extrasDe(env, e.id); // README (ronda 87): DEMO y créditos de complementos
  return { u, empresas, e, extras, duenio: e.rol === 'duenio', puedeEditar: ['duenio', 'editor'].includes(e.rol), studio: paseVigente(e) };
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
  if (recurso === 'dominio') {
    exigir(c.duenio, 'Solo el dueño maneja el dominio');
    if (M === 'POST' && !id) {
      if (c.extras.demo) throw new HttpError(409, 'Cuenta DEMO: el dominio propio no se conecta. Todo se ve desde amoinvitar.com.');
      if (!c.studio) throw new HttpError(409, 'El dominio propio es de Studio con el pase vigente');
      if (!c.e.dominio) throw new HttpError(409, 'Primero hay que contratar la configuración del dominio (49 €, o sin cargo con el pack de 100 créditos)');
      const b = await readJson(request);
      try { await pedirDominio(env, c.e.id, b.host); } catch (err) { throw new HttpError(400, err.message); }
      return json({ ok: true, dominio: await infoDominio(env, c) });
    }
    if (M === 'POST' && id === 'revisar') { await revisarDominio(env, c.e.id); return json({ ok: true, dominio: await infoDominio(env, c) }); }
    if (M === 'DELETE') { await quitarDominio(env, c.e.id); return json({ ok: true }); }
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

// Estado del dominio propio para el tablero (se revisa contra Cloudflare o el DNS cada vez que se abre)
async function infoDominio(env, c) {
  const d = c.studio || c.e.dominio ? await revisarDominio(env, c.e.id).catch(() => dominioDe(env, c.e.id)) : null;
  return { derecho: !!c.e.dominio, studio: c.studio, host: d?.host || null, estado: d?.estado || null, error: d?.error || null, cname: cnameDe(env), automatico: conCloudflare(env) };
}

// README (ronda 88): moneda del tablero según la bandera elegida (cookies pais_sel y cur, si no, la IP). Los precios
// netos en euros se muestran convertidos; «+ IVA» solo en España y la UE. Lo que se cobra y se factura sigue en euros.
async function monedaTablero(env, request, montos) {
  const pais = String(getCookie(request, 'pais_sel') || pais0(request) || 'ES').toUpperCase();
  const c = String(getCookie(request, 'cur') || '').toUpperCase();
  const codigo = CURRENCIES.includes(c) ? c : currencyForCountry(pais);
  const rates = await getRates(env);
  const precios = Object.fromEntries([...new Set(montos.filter((v) => v > 0))].map((v) => [String(v), formatMoney(convertirSimple(v, codigo, rates), codigo)]));
  return { pais, codigo, ue: isEU(pais), precios };
}
const pais0 = (request) => request.cf?.country || request.headers.get('cf-ipcountry') || null;

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
      duo: !!d.empresa?.duo, duoPedido: !!d.empresa?.duoPedido, // README (ronda 122)
      linkCliente: `/panel/${f.id}?k=${f.clave_panel}`, actualizado: f.actualizado };
  });
  const { results: miembros0 } = await env.DB.prepare('SELECT u.id AS usuarioId, u.email, u.nombre, m.rol FROM miembros m JOIN usuarios u ON u.id = m.usuario_id WHERE m.empresa_id = ? ORDER BY (m.rol = \'duenio\') DESC, u.email').bind(e.id).all();
  // README (ronda 95): nombre y cargo de cada persona del equipo (app_state «equipo-info:<empresa>»)
  const infoEq = await leerInfoEquipo(env, e.id);
  const miembros = (miembros0 || []).map((m) => ({ ...m, nombre: infoEq[m.usuarioId]?.nombre || m.nombre, cargo: infoEq[m.usuarioId]?.cargo || '' }));
  const { results: compras } = await env.DB.prepare('SELECT id, numero, item, creditos, neto, iva_tasa, iva, total, estado, creado, pagada, factura FROM compras_pro WHERE empresa_id = ? ORDER BY creado DESC LIMIT 100').bind(e.id).all();
  const cat = catalogoCompras();
  const nivel = e.nivel;
  const base = sitio(env, request);
  const dom = await infoDominio(env, c);
  // Con Studio (pase vigente) el panel va sin la marca de Amo Invitar; en Pro, con ella
  return {
    usuario: { id: u.id, email: u.email, nombre: u.nombre },
    empresas: c.empresas.map((x) => ({ id: x.id, nombre: x.nombre })),
    dominio: dom,
    empresa: { id: e.id, nombre: e.nombre, rol: e.rol, nivel, studio: c.studio, paseVence: e.pase_vence, paseVencido: nivel === 'studio' && !c.studio, estado: e.estado, dominio: !!e.dominio, demo: c.extras.demo,
      // README (ronda 122): Duo (invitación + álbum QR): saldo de créditos Duo y pase Event Studio Duo
      duo: { saldo: parseInt(c.extras.duo?.saldo, 10) || 0, pase: duoVigente(c.extras) && c.studio, paseVence: c.extras.duo?.paseVence || null } },
    // README (ronda 87): créditos de complementos (ocultos hasta que el admin los habilita; los regalados se ven siempre)
    complementos: (c.extras.habilitado || Object.values(c.extras.saldo).some((n) => n > 0)) ? { habilitado: c.extras.habilitado, saldo: c.extras.saldo,
      lista: Object.entries(COMPLEMENTOS_PRO).map(([k, v]) => ({ id: k, nombre: v.nombre, neto: v.neto, manual: !!v.manual, saldo: parseInt(c.extras.saldo[k], 10) || 0 })) } : null,
    limites: { usuarios: limiteUsuarios(nivel), usados: (miembros || []).length },
    creditos: cred,
    marca: { nombre: e.marca.nombre || '', pie: e.marca.pie || '', logo: e.marca.logo || '', sinPie: !!e.marca.sinPie, blanca: !!e.marca.blanca, color: e.marca.color || '', paleta: e.marca.paleta || '' },
    // README (ronda 87): con el dominio propio activo, la invitación y el panel del cliente salen desde ese dominio
    eventos: dom.estado === 'activo' && !c.extras.demo ? eventos.map((x) => ({ ...x, link: x.link ? `https://${dom.host}${x.link}` : null, linkCliente: `https://${dom.host}${x.linkCliente}` })) : eventos, equipo: miembros || [], compras: await Promise.all((compras || []).map(async (x) => {
      const inv = x.factura ? await getInvoice(env, x.factura).catch(() => null) : null;
      return { ...x, nombre: cat[x.item]?.nombre || x.item, urlFactura: inv ? await invoiceUrl(env, base, inv) : null };
    })),
    tipos: TIPOS_EVENTO.filter((t) => !t.grupo).map((t) => ({ id: t.id, nombre: t.nombre })),
    modelos: MODELOS.filter((m) => !m.simple && !m.std && !m.kit).map((m) => ({ id: m.id, nombre: m.nombre, eventos: m.eventos })),
    tienda: {
      credito: PROFESIONALES.credito, pase: PROFESIONALES.studio.pase, config: PROFESIONALES.studio.configuracionDominio,
      productos: Object.entries(cat).filter(([k, v]) => v.nivel !== 'complemento').filter(([k, v]) => v.nivel === 'studio-dominio' ? (c.studio && !e.dominio)
        : v.nivel === 'duo' ? !(duoVigente(c.extras) && c.studio) : v.nivel === 'studio-duo' ? duoVigente(c.extras) && c.studio
        // README (ronda 125): con Studio vigente y sin Duo se ofrece pasar pagando la diferencia (en lugar del pase Duo completo)
        : v.nivel === 'studio-duo-mejora' ? c.studio && !duoVigente(c.extras)
        : v.nivel === 'studio-duo-pase' ? !(c.studio && !duoVigente(c.extras))
        : (nivel === 'studio' ? (v.nivel === 'studio' && c.studio) || v.nivel === 'studio-pase' : v.nivel === 'pro' || v.nivel === 'studio-pase'))
        .map(([k, v]) => ({ id: k, nombre: v.nombre, creditos: v.creditos, neto: v.neto, nivel: v.nivel, duo: !!v.duo,
          // README (ronda 122): packs de 50 y 100 (Studio y Event Studio Duo): configuración del dominio sin cargo
          dominioSinCargo: /^(studio|sduo)-/.test(k) && v.creditos >= PROFESIONALES.studio.dominioSinCargoDesdePack })),
      paseDuo: PROFESIONALES.studioDuo.pase, paseDuoSinDescuento: PROFESIONALES.studioDuo.paseSinDescuento,
      mejoraDuo: c.studio && !duoVigente(c.extras) ? { neto: PROFESIONALES.studioDuo.pase - PROFESIONALES.studio.pase, hasta: e.pase_vence || null } : null,
      mejorStudio: Math.max(...PROFESIONALES.studio.packs.map((k) => descuentoCredito(k.precio / k.creditos, PROFESIONALES.credito))),
      transferencia: transferInfo(env, 'EUR'),
      // Medios de pago online según el país de facturación (el de Argentina cobra en pesos con Mercado Pago)
      medios: { general: mediosPro(env, 'ES'), AR: mediosPro(env, 'AR') },
    },
    contacto: { whatsapp: String(env.WHATSAPP || '').replace(/\D/g, ''), email: env.SUPPORT_EMAIL || 'hola@amoinvitar.com' },
    base,
    moneda: await monedaTablero(env, request, [PROFESIONALES.studio.pase, PROFESIONALES.studio.configuracionDominio, PROFESIONALES.studioDuo.paseSinDescuento,
      ...Object.values(cat).flatMap((v) => [v.neto, v.creditos > 1 ? v.neto / v.creditos : 0])]),
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
  // README (ronda 87): dos nombres solo en las bodas (como en el panel); en los demás eventos, uno
  const a = str(b.nombres?.a, 20), bb = tipoReal === 'boda' ? str(b.nombres?.b, 20) : '';
  if (!a) throw new HttpError(400, 'Falta el nombre');
  if (tipoReal === 'boda' && !bb) throw new HttpError(400, 'Faltan los dos nombres');
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(b.fecha || '') ? b.fecha : '';
  const ev = {
    id: `ev_${randomId(5)}`, producto: 'invitacion', tipo: tipoReal, modelo: m.id, paquete: 'borrador', aMedida: null, estado: 'borrador', clave: randomId(16), empresaId: c.e.id, slug: null,
    datos: { variante: varianteDePais(pais(request)), acceso: { modo: 'abierta' }, extras: [], nombres: bb ? { a, b: bb } : { a }, celebracion: fecha ? { fecha, inicio: fecha } : {}, empresa: { clientePublica: false, duoPedido: b.duo === true } },
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
  ev.datos.empresa = { ...(ev.datos.empresa || {}), ...(b.clientePublica !== undefined ? { clientePublica: !!b.clientePublica } : {}),
    // README (ronda 122): «Duo» (con álbum QR) se elige mientras el evento no usó su crédito
    ...(b.duoPedido !== undefined && !ev.datos.empresa?.credito ? { duoPedido: !!b.duoPedido } : {}) };
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
  // README (ronda 87): color del pie de las invitaciones y paleta del panel del cliente final
  if ('color' in b) marca.color = /^#[0-9a-f]{6}$/i.test(String(b.color || '')) ? String(b.color).toLowerCase() : '';
  if ('paleta' in b) marca.paleta = ['negro', 'azul', 'rojo', 'dorado', 'violeta'].includes(b.paleta) ? b.paleta : '';
  // Con logo, el nombre no se usa en el pie (se mantiene el que estaba)
  if (marca.logo) marca.nombre = c.e.marca.nombre || marca.nombre;
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
async function leerInfoEquipo(env, empresaId) {
  const r = await env.DB.prepare('SELECT value FROM app_state WHERE key = ?').bind(`equipo-info:${empresaId}`).first().catch(() => null);
  try { return JSON.parse(r?.value || '{}') || {}; } catch { return {}; }
}
async function guardarInfoEquipo(env, empresaId, info) {
  await env.DB.prepare('INSERT INTO app_state (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3')
    .bind(`equipo-info:${empresaId}`, JSON.stringify(info), Date.now()).run();
}
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
  const nombre = str(b.nombre, 80), cargo = str(b.cargo, 60);
  if (nombre || cargo) { const info = await leerInfoEquipo(env, c.e.id); info[u.id] = { nombre, cargo }; await guardarInfoEquipo(env, c.e.id, info); }
  try { await sendEmail(env, { to: email, ...mailEquipoPro(env, { idioma: await idiomaPara(env, email, { request }), empresa: c.e.nombre, quien: c.u.nombre || c.u.email, url: `${sitio(env, request)}/entrar?siguiente=/empresa/` }) }); } catch (e) { console.error('[equipo]', e); }
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
  // README (ronda 122): Pro Duo para todos; los packs Event Studio Duo, con su pase vigente
  const conDuo = duoVigente(c.extras) && c.studio;
  const permitido = (cat.nivel === 'complemento' && c.extras.habilitado) || (cat.nivel === 'studio-dominio' && c.studio && !c.e.dominio) || cat.nivel === 'studio-pase' || cat.nivel === 'studio-duo-pase' || (cat.nivel === 'studio-duo-mejora' && c.studio && !conDuo)
    || (cat.nivel === 'pro' && c.e.nivel === 'pro') || (cat.nivel === 'studio' && c.studio) || (cat.nivel === 'duo' && !conDuo) || (cat.nivel === 'studio-duo' && conDuo);
  if (!permitido) throw new HttpError(409, cat.nivel === 'studio' ? 'Los packs Studio necesitan el pase anual vigente' : cat.nivel === 'studio-duo' ? 'Los packs Event Studio Duo necesitan el pase anual Event Studio Duo vigente' : 'Ese producto no está disponible para tu nivel');
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
