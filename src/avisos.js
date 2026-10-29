// Tarea diaria: avisa por mail a los dueños cuando se acerca el cierre de la confirmación
// (7, 3 y 1 día antes) y todavía hay invitados de la lista sin responder.
// Se apaga por evento con datos.admin.avisosMail = false.
import { sendEmail, mailAvisoCierre } from './lib/email.js';
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
