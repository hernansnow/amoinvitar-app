// README (ronda 33) · Pedido de cuenta profesional (público). Se aprueba a mano desde /admin.
//   POST /api/profesionales/solicitud   { nombre, email, telefono, empresa, web, rubro, profesion, descripcion, nivel, pais, privacidad }
import { json, readJson, isEmail, str, randomId, HttpError } from '../lib/util.js';
import { sendEmail, mailAvisoInterno, mailSolicitudProRecibida } from '../lib/email.js';
import { asegurarTablasPro } from '../pro/esquema.js';

export const RUBROS = { planner: 'Wedding planner / organizador de eventos', fotografia: 'Fotografía o video', salon: 'Salón o espacio de eventos', agencia: 'Agencia', otro: 'Otro' };
const linea = (v, max = 200) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);

export async function solicitud(request, env) {
  const d = await readJson(request);
  // Antispam: campo trampa, 3 segundos mínimos desde que se abrió la página y tope por IP
  if (d.sitio_web) return json({ ok: true });
  if (d.desde && Date.now() - Number(d.desde) < 3000) throw new HttpError(400, 'Espera unos segundos y vuelve a enviarlo.');
  if (env.LIMITE_PIN) {
    const { success } = await env.LIMITE_PIN.limit({ key: `pro:${request.headers.get('cf-connecting-ip') || ''}` });
    if (!success) throw new HttpError(429, 'Recibimos varios envíos seguidos. Prueba de nuevo en unos minutos.');
  }
  const s = {
    nombre: linea(d.nombre, 100), email: linea(d.email, 150).toLowerCase(), telefono: linea(d.telefono, 40), empresa: linea(d.empresa, 120),
    web: linea(d.web, 300), rubro: Object.hasOwn(RUBROS, d.rubro) ? d.rubro : '', profesion: linea(d.profesion, 120),
    descripcion: String(d.descripcion ?? '').trim().slice(0, 3000), nivel: d.nivel === 'studio' ? 'studio' : 'pro', pais: linea(d.pais, 60),
  };
  if (s.nombre.length < 2) throw new HttpError(400, 'Falta el nombre');
  if (!isEmail(s.email)) throw new HttpError(400, 'El mail no parece válido');
  if (s.web.length < 4 || !/[.@]/.test(s.web)) throw new HttpError(400, 'Falta el link de tu página web o de tu red social');
  if (!s.rubro) throw new HttpError(400, 'Elige tu rubro');
  if (s.descripcion.length < 30) throw new HttpError(400, 'Cuéntanos un poco más sobre tu trabajo (al menos unas líneas)');
  if (!(d.privacidad === true || d.privacidad === 'si')) throw new HttpError(400, 'Hay que aceptar la política de privacidad');

  await asegurarTablasPro(env);
  // Una sola solicitud pendiente por mail
  const previa = await env.DB.prepare("SELECT id FROM solicitudes_pro WHERE email = ? AND estado = 'pendiente'").bind(s.email).first();
  if (previa) return json({ ok: true, repetida: true });
  const id = 'sp_' + randomId(6);
  await env.DB.prepare(`INSERT INTO solicitudes_pro (id, nombre, email, telefono, empresa, web, rubro, profesion, descripcion, nivel, pais, creado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, s.nombre, s.email, s.telefono || null, s.empresa || null, s.web, s.rubro, s.profesion || null, s.descripcion, s.nivel, s.pais || null, new Date().toISOString()).run();
  try {
    const para = String(env.ADMINS || '').split(/[,\s]+/).filter(Boolean)[0] || env.SUPPORT_EMAIL;
    if (para) await sendEmail(env, { to: para, replyTo: s.email, ...mailAvisoInterno(env, { asunto: `Solicitud de cuenta profesional (${s.nivel === 'studio' ? 'Studio' : 'Pro'}) · ${s.empresa || s.nombre}`,
      lineas: [`${s.nombre} · ${s.email}${s.telefono ? ` · ${s.telefono}` : ''}`, `${RUBROS[s.rubro]}${s.profesion ? ` · ${s.profesion}` : ''}${s.pais ? ` · ${s.pais}` : ''}`, `Web o red: ${s.web}`, s.descripcion, `Revisar y aprobar: ${new URL(request.url).origin}/admin/`] }) });
    await sendEmail(env, { to: s.email, ...mailSolicitudProRecibida(env, { nombre: s.nombre }) });
  } catch (e) { console.error('[solicitud pro]', e); }
  return json({ ok: true });
}
