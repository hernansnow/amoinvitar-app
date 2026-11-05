// Tarea diaria: avisa por mail a los dueños cuando se acerca el cierre de la confirmación
// (7, 3 y 1 día antes) y todavía hay invitados de la lista sin responder.
// Se apaga por evento con datos.admin.avisosMail = false.
import { sendEmail, mailAvisoCierre, mailRespuestas } from './lib/email.js';
import { usaLista } from './acceso.js';

const DIAS_AVISO = [7, 3, 1];

export async function avisosCierre(env) {
  const { results } = await env.DB.prepare(`SELECT id, clave_panel, datos FROM eventos
    WHERE estado = 'publicado' AND json_extract(datos, '$.rsvp.cierre') IS NOT NULL`).all();
  const hoy = Date.parse(new Date().toISOString().slice(0, 10));
  const base = String(env.SITE_URL || 'https://app.amoinvitar.com').replace(/\/$/, '');
  for (const ev of results) {
    try {
      const d = JSON.parse(ev.datos);
      if (d.admin?.avisosMail === false || !usaLista(d)) continue;
      const dias = Math.round((Date.parse(String(d.rsvp.cierre).slice(0, 10)) - hoy) / 86400000);
      if (!DIAS_AVISO.includes(dias)) continue;
      const { results: inv } = await env.DB.prepare('SELECT codigo, abierto FROM invitados WHERE evento_id = ?').bind(ev.id).all();
      const { results: resp } = await env.DB.prepare("SELECT DISTINCT json_extract(datos, '$.inv') AS inv FROM respuestas WHERE evento_id = ? AND tipo = 'rsvp'").bind(ev.id).all();
      const respondieron = new Set(resp.map((r) => r.inv));
      const faltan = inv.filter((i) => !respondieron.has(i.codigo));
      if (!faltan.length) continue;
      const { results: mails } = await env.DB.prepare(`SELECT u.email FROM accesos_evento a JOIN usuarios u ON u.id = a.usuario_id WHERE a.evento_id = ?1
        UNION SELECT email FROM pedidos WHERE evento_id = ?1`).bind(ev.id).all();
      const nombres = [d.nombres?.a, d.nombres?.b].filter(Boolean).join(' & ') || 'la invitación';
      const url = `${base}/panel/${ev.id}?k=${ev.clave_panel}#admin`;
      for (const to of new Set(mails.map((m) => String(m.email || '').toLowerCase()).filter(Boolean))) {
        await sendEmail(env, { to, ...mailAvisoCierre(env, { nombres, dias, sinResponder: faltan.length, noAbrieron: faltan.filter((i) => !i.abierto).length, url }) });
      }
    } catch (e) { console.error('[avisos]', ev.id, e); }
  }
}

// ── Avisos de respuestas nuevas (Administración → Respuestas: "Avisarme por mail") ──
// "cada": un mail por respuesta, hasta TOPE_DIARIO por día (las demás se ven en el panel o en el resumen del otro día).
// "diario": un solo mail por día con las respuestas de las últimas 24 horas. Así se cuidan los mails del plan de Resend.
const TOPE_DIARIO = 20;
async function mailsDe(env, id) {
  const { results } = await env.DB.prepare(`SELECT u.email FROM accesos_evento a JOIN usuarios u ON u.id = a.usuario_id WHERE a.evento_id = ?1
    UNION SELECT email FROM pedidos WHERE evento_id = ?1`).bind(id).all();
  return [...new Set(results.map((m) => String(m.email || '').toLowerCase()).filter(Boolean))];
}
const nombresDe = (d) => [d.nombres?.a, d.nombres?.b].filter(Boolean).join(' & ') || 'la invitación';
const linkPanel = (env, id, clave) => `${String(env.SITE_URL || 'https://app.amoinvitar.com').replace(/\/$/, '')}/panel/${id}?k=${clave}#admin`;
const fila = (d) => ({ nombre: String(d.nombre || 'Sin nombre').slice(0, 80), asiste: d.asiste === 'Si', personas: d.personas, mensaje: String(d.mensaje || '').slice(0, 300) });

export async function avisoRespuesta(env, ev, datos) {
  const desde = new Date(); desde.setUTCHours(0, 0, 0, 0);
  const hoy = await env.DB.prepare("SELECT COUNT(*) AS n FROM respuestas WHERE evento_id = ? AND tipo = 'rsvp' AND creado >= ?").bind(ev.id, desde.toISOString()).first();
  if ((hoy?.n || 0) > TOPE_DIARIO) return;
  const url = linkPanel(env, ev.id, ev.clave);
  for (const to of await mailsDe(env, ev.id)) await sendEmail(env, { to, ...mailRespuestas(env, { nombres: nombresDe(ev.datos), respuestas: [fila(datos)], url, tope: (hoy?.n || 0) === TOPE_DIARIO }) });
}

export async function resumenRespuestas(env) {
  const { results } = await env.DB.prepare(`SELECT id, clave_panel, datos FROM eventos
    WHERE estado = 'publicado' AND json_extract(datos, '$.admin.avisoRespuestas') IN ('diario', 'cada')`).all();
  const desde = new Date(Date.now() - 86400000).toISOString();
  for (const ev of results) {
    try {
      const d = JSON.parse(ev.datos);
      const { results: resp } = await env.DB.prepare("SELECT datos FROM respuestas WHERE evento_id = ? AND tipo = 'rsvp' AND creado >= ? ORDER BY creado").bind(ev.id, desde).all();
      const lista = resp.map((r) => JSON.parse(r.datos)).filter((x) => !x.prueba);
      // Con "cada" solo va el resumen si ese día se pasó del tope (las que no tuvieron su mail)
      if (!lista.length || (d.admin.avisoRespuestas === 'cada' && lista.length <= TOPE_DIARIO)) continue;
      const url = linkPanel(env, ev.id, ev.clave_panel);
      for (const to of await mailsDe(env, ev.id)) await sendEmail(env, { to, ...mailRespuestas(env, { nombres: nombresDe(d), respuestas: lista.map(fila), url, resumen: true }) });
    } catch (e) { console.error('[resumen rsvp]', ev.id, e); }
  }
}
