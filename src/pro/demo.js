// README (ronda 128) · Demo Event Studio Duo (la prueba gratis de los profesionales), la activa el dueño desde /admin:
//   · 7 días con todo lo de Event Studio Duo (marca blanca en invitaciones y álbum QR) menos el dominio propio.
//   · 1 crédito Duo demo: publica una invitación completa (invitados, respuestas…) con su álbum QR Platinum.
//   · Al terminar, la cuenta pasa a Pro sola. La invitación demo vuelve a borrador (sin marca blanca ni álbum Platinum) y
//     solo se reactiva aplicándole un crédito comprado. El álbum pasa a Gratis en Albunear: si no se le aplica un crédito
//     Duo, se borra a los 15 días con todo lo subido. Si en 30 días no se le cargó ningún crédito, la invitación se borra.
//   · Durante la demo no se compran packs Studio (piden el pase pagado); sí el pase Studio o el Event Studio Duo.
// Lo de la cuenta está en «pro-extra:<empresa>» (demo, demoHasta, demoFin, previo, duo.demo); lo de cada invitación en
// datos.empresa (demo, demoHasta, demoFin).
import { extrasDe, cambiarExtras, paseDuo } from './extras.js';

export const DEMO_DIAS = 7;
export const DEMO_BORRAR_DIAS = 30;
const iso = (t = Date.now()) => new Date(t).toISOString();

export async function activarDemo(env, empresaId) {
  const e = await env.DB.prepare('SELECT nivel, pase_vence FROM empresas_pro WHERE empresa_id = ?').bind(empresaId).first();
  if (!e) throw new Error('No existe esa empresa');
  const x = await extrasDe(env, empresaId);
  const hasta = iso(Date.now() + DEMO_DIAS * 86400000);
  const previo = x.demo && x.previo ? x.previo : { nivel: e.nivel, pase_vence: e.pase_vence || null, paseDuo: x.duo?.paseVence || null };
  // Studio con el pase hasta el fin de la demo (si ya tenía uno más largo, queda el suyo)
  const pase = e.nivel === 'studio' && e.pase_vence && e.pase_vence > hasta ? e.pase_vence : hasta;
  await env.DB.batch([
    env.DB.prepare("UPDATE empresas_pro SET nivel = 'studio', pase_vence = ?, estado = 'activa' WHERE empresa_id = ?").bind(pase, empresaId),
    env.DB.prepare("UPDATE empresas SET plan = 'studio' WHERE id = ?").bind(empresaId),
  ]);
  if (!(x.duo?.paseVence && x.duo.paseVence > hasta)) await paseDuo(env, empresaId, pase);
  return cambiarExtras(env, empresaId, { demo: true, demoHasta: hasta, demoFin: null, previo, duoDemo: 1 });
}

// Fin de la demo de la cuenta (por vencimiento o desde /admin): vuelve a Pro (o a lo pagado que tenía antes, si sigue vigente)
export async function terminarDemo(env, empresaId) {
  const x = await extrasDe(env, empresaId);
  if (!x.demo) return x;
  const t = iso();
  const p = x.previo || {};
  const sigue = p.nivel === 'studio' && p.pase_vence && p.pase_vence > t;
  await env.DB.batch([
    env.DB.prepare('UPDATE empresas_pro SET nivel = ?, pase_vence = ? WHERE empresa_id = ?').bind(sigue ? 'studio' : 'pro', sigue ? p.pase_vence : null, empresaId),
    env.DB.prepare('UPDATE empresas SET plan = ? WHERE id = ?').bind(sigue ? 'studio' : 'pro', empresaId),
  ]);
  await paseDuo(env, empresaId, sigue && p.paseDuo && p.paseDuo > t ? p.paseDuo : null);
  return cambiarExtras(env, empresaId, { demo: false, demoHasta: x.demoHasta, demoFin: t, previo: null, duoDemo: 0 });
}

// Compra del pase Studio o Event Studio Duo durante la demo: la cuenta deja de ser demo y el pase anual empieza hoy
// (la invitación demo sigue su propio plazo: al terminar, necesita un crédito comprado)
export async function cerrarDemoPorCompra(env, empresaId) {
  const x = await extrasDe(env, empresaId);
  if (!x.demo) return false;
  await env.DB.prepare('UPDATE empresas_pro SET pase_vence = NULL WHERE empresa_id = ?').bind(empresaId).run();
  await paseDuo(env, empresaId, null);
  await cambiarExtras(env, empresaId, { demo: false, demoFin: iso(), previo: null, duoDemo: 0 });
  return true;
}

// La invitación demo al terminar su plazo: borrador, sin el crédito demo (se reactiva con uno comprado) y el álbum a Gratis
export async function desactivarEventoDemo(env, fila) {
  const d = JSON.parse(fila.datos || '{}');
  const t = iso();
  const { credito, duo, ...resto } = d.empresa || {};
  d.empresa = { ...resto, demo: true, demoFin: t, duoPedido: true };
  await env.DB.prepare("UPDATE eventos SET estado = CASE WHEN estado = 'publicado' THEN 'borrador' ELSE estado END, datos = ?, actualizado = ? WHERE id = ?").bind(JSON.stringify(d), t, fila.id).run();
  if (d.album?.albunear && env.ALBUNEAR?.album) {
    try {
      await env.ALBUNEAR.album(fila.id, { accion: 'marca', marca: 'amoinvitar' });
      await env.ALBUNEAR.album(fila.id, { accion: 'plan', nuevo: 'free' });
      const slug = String(d.album.albunear).split('/a/')[1];
      if (slug) { d.album = { ...d.album, albunear: `https://albunear.com/a/${slug}`, privacidad: false }; await env.DB.prepare('UPDATE eventos SET datos = ? WHERE id = ?').bind(JSON.stringify(d), fila.id).run(); }
    } catch (e) { console.error('[demo álbum]', e); }
  }
}

async function borrarEventoDemo(env, id) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM invitados WHERE evento_id = ?').bind(id),
    env.DB.prepare('DELETE FROM respuestas WHERE evento_id = ?').bind(id),
    env.DB.prepare('DELETE FROM accesos_evento WHERE evento_id = ?').bind(id),
    env.DB.prepare('DELETE FROM eventos WHERE id = ?').bind(id),
  ]);
}

// Tarea automática (cada hora): cuentas demo vencidas → Pro; invitaciones demo vencidas → borrador; 30 días sin crédito → se borran
export async function tareasDemo(env, ahora = Date.now()) {
  const t = iso(ahora);
  const out = { cuentas: 0, desactivadas: 0, borradas: 0 };
  const { results: cuentas } = await env.DB.prepare("SELECT key AS clave, value AS valor FROM app_state WHERE key LIKE 'pro-extra:%' AND value LIKE '%\"demo\":true%'").all().catch(() => ({ results: [] }));
  for (const c of cuentas || []) {
    let x = {};
    try { x = JSON.parse(c.valor || '{}'); } catch { continue; }
    if (x.demo && x.demoHasta && x.demoHasta <= t) { await terminarDemo(env, c.clave.slice('pro-extra:'.length)); out.cuentas++; }
  }
  const { results: vencidas } = await env.DB.prepare(`SELECT id, datos FROM eventos WHERE empresa_id IS NOT NULL AND json_extract(datos, '$.empresa.demo') = 1
    AND json_extract(datos, '$.empresa.demoFin') IS NULL AND json_extract(datos, '$.empresa.demoHasta') <= ? LIMIT 50`).bind(t).all();
  for (const f of vencidas || []) { await desactivarEventoDemo(env, f); out.desactivadas++; }
  const limite = iso(ahora - DEMO_BORRAR_DIAS * 86400000);
  const { results: viejas } = await env.DB.prepare(`SELECT id FROM eventos WHERE empresa_id IS NOT NULL AND json_extract(datos, '$.empresa.demo') = 1
    AND estado != 'publicado' AND json_extract(datos, '$.empresa.demoFin') <= ? LIMIT 50`).bind(limite).all();
  for (const f of viejas || []) { await borrarEventoDemo(env, f.id); out.borradas++; }
  return out;
}

