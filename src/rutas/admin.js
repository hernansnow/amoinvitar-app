// Administración: facturas, libro de facturas, VeriFactu y la tarea automática (igual que en Albunear).
//   GET  /factura/<id>?k=…            la factura del cliente (link del mail), imprimible / PDF
//   GET  /admin/facturas?year=&q=     todas las del período en una página (imprimir → un PDF)
//   GET  /admin/facturas.csv?year=&q= libro registro de facturas emitidas (Excel)
//   GET  /api/admin/facturas?year=&q= listado, estado de VeriFactu y umbral OSS
//   POST /api/admin/verifactu/enviar  reenvía ya lo pendiente a la AEAT
import { json, HttpError, escapeHtml, now } from '../lib/util.js';
import { usuarioActual } from '../lib/auth.js';
import { sendEmail } from '../lib/email.js';
import { listInvoices, getInvoice, checkInvoiceKey, invoicesCsv, invoicesPage, periodOf, invoiceUrl, invoicesEnabled, ossStatus } from '../lib/facturas.js';
import { verifactuMode, sendPending, getState, setState } from '../lib/verifactu.js';

export async function requiereAdmin(request, env) {
  const u = await usuarioActual(request, env);
  const clave = request.headers.get('x-admin') || '';
  if (u?.esAdmin || (env.ADMIN_CLAVE && clave === env.ADMIN_CLAVE)) return u;
  throw new HttpError(403, 'Sin permiso');
}

const pagina = (html, status = 200) => new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex', 'cache-control': 'private, no-store' } });

export async function facturaCliente(request, env, id) {
  const url = new URL(request.url);
  const inv = (await checkInvoiceKey(env, id, url.searchParams.get('k'))) ? await getInvoice(env, id) : null;
  if (!inv) return pagina('<p style="font-family:sans-serif;padding:40px">Factura no encontrada.</p>', 404);
  return pagina(invoicesPage(env, [inv], { title: inv.number }));
}

export async function facturasImprimir(request, env) {
  await requiereAdmin(request, env);
  const per = periodOf(new URL(request.url));
  return pagina(invoicesPage(env, await listInvoices(env, per), { title: `Facturas ${per.year}${per.q ? ' T' + per.q : ''}`, back: '/mi-cuenta' }));
}

export async function facturasCsv(request, env) {
  await requiereAdmin(request, env);
  const per = periodOf(new URL(request.url));
  return new Response(invoicesCsv(await listInvoices(env, per)), { headers: {
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': `attachment; filename="facturas-amoinvitar-${per.year}${per.q ? '-T' + per.q : ''}.csv"`,
    'cache-control': 'private, no-store' } });
}

export async function facturasJson(request, env) {
  await requiereAdmin(request, env);
  const per = periodOf(new URL(request.url));
  const base = new URL(request.url).origin;
  const filas = [];
  for (const r of await listInvoices(env, per)) filas.push({ ...r, url: await invoiceUrl(env, base, r) });
  const pend = invoicesEnabled(env) ? await env.DB.prepare("SELECT COUNT(*) AS n FROM invoices WHERE vf_status IN ('pending', 'error')").first().catch(() => null) : null;
  return json({ activas: invoicesEnabled(env), periodo: per, facturas: filas, oss: await ossStatus(env),
    verifactu: { modo: verifactuMode(env), certificado: Boolean(env.AEAT_CERT), pendientesOErrores: pend?.n || 0 } });
}

export async function verifactuEnviar(request, env) {
  await requiereAdmin(request, env);
  // Los rechazados vuelven a la cola (por ejemplo, tras corregir el NIF del cliente)
  await env.DB.prepare("UPDATE invoices SET vf_status = 'pending' WHERE vf_status = 'error'").run().catch(() => null);
  return json(await sendPending(env, { force: true }));
}

// Aviso al acercarse y al superar los 10.000 € de ventas a particulares de otros países de la UE
async function alertasOss(env) {
  if (!invoicesEnabled(env)) return null;
  const st = await ossStatus(env);
  const para = String(env.ADMINS || '').split(/[,\s]+/).filter(Boolean)[0] || env.SUPPORT_EMAIL;
  if (!para) return st.level;
  for (const [nivel, asunto, texto] of [
    ['warning', `Amo Invitar: ventas a la UE en ${st.current.toLocaleString('es-ES')} € (aviso de 8.000 €)`,
      `Este año llevás ${st.current.toLocaleString('es-ES')} € (sin IVA) vendidos a particulares de otros países de la UE. Al superar 10.000 € hay que darse de alta en OSS (modelo 035) y cobrar el IVA de cada país (VAT_OSS = "1"). Ojo: el umbral se suma con las ventas de Albunear si facturan con el mismo NIF.`],
    ['exceeded', 'Amo Invitar: se superaron los 10.000 € de ventas a la UE',
      `Las ventas a particulares de otros países de la UE superan 10.000 € (este año ${st.current.toLocaleString('es-ES')} €, año anterior ${st.previous.toLocaleString('es-ES')} €). Corresponde el IVA del país de cada cliente: alta en OSS (modelo 035) y VAT_OSS = "1". Consultarlo con el asesor.`],
  ]) {
    const llego = nivel === 'warning' ? st.level !== 'ok' : st.exceeded && !st.ossActive;
    const clave = `oss_alert_${nivel}_${st.year}`;
    if (llego && !(await getState(env, clave))) {
      try { await sendEmail(env, { to: para, subject: asunto, text: texto, html: `<p>${escapeHtml(texto)}</p>` }); await setState(env, clave, String(now())); } catch (e) { console.error('[oss]', e); }
    }
  }
  return st.level;
}

// Tareas automáticas: cada minuto VeriFactu; una vez por día, el control del umbral OSS
export async function tareas(controller, env) {
  if (controller.cron === '* * * * *') {
    const r = await sendPending(env);
    if (r && !r.skipped) console.log('[verifactu]', JSON.stringify(r));
    return;
  }
  await alertasOss(env);
}
