// README (ronda 36) · Aviso por mail a las empresas profesionales cuando sus créditos están por vencer (30 y 7 días antes).
// Con Studio se recuerda que renovar el pase antes del vencimiento extiende 12 meses los créditos que sobran.
import { sendEmail, mailCreditosVencen, mailPaseVence } from '../lib/email.js';
import { extrasDe } from './extras.js';
import { getState, setState } from '../lib/verifactu.js';
import { asegurarTablasPro } from './esquema.js';
import { paseVigente, proDe } from './empresa.js';
import { idiomaPara, recordarIdioma } from '../lib/idioma-mail.js'; // README (ronda 118)

const AVISOS = [30, 7];

export async function avisosCreditos(env) {
  await asegurarTablasPro(env);
  const ahora = Date.now();
  const hoy = new Date(ahora).toISOString();
  const limite = new Date(ahora + 30 * 86400000).toISOString();
  const { results } = await env.DB.prepare(`SELECT l.id, l.empresa_id, l.cantidad, l.usados, l.vence, e.nombre FROM creditos_lotes l JOIN empresas e ON e.id = l.empresa_id
    WHERE l.usados < l.cantidad AND l.vence >= ? AND l.vence <= ? ORDER BY l.vence`).bind(hoy, limite).all();
  const porEmpresa = new Map();
  for (const l of results || []) {
    const dias = Math.ceil((Date.parse(l.vence) - ahora) / 86400000);
    const toca = [];
    for (const m of AVISOS) if (dias <= m && !(await getState(env, `aviso_cr:${l.id}:${m}`))) toca.push(m);
    if (!toca.length) continue;
    const g = porEmpresa.get(l.empresa_id) || { nombre: l.nombre, lotes: [], marcas: [], dias };
    g.lotes.push({ restan: l.cantidad - l.usados, vence: l.vence });
    g.marcas.push(...toca.map((m) => `aviso_cr:${l.id}:${m}`));
    g.dias = Math.min(g.dias, dias);
    porEmpresa.set(l.empresa_id, g);
  }
  const base = String(env.SITE_URL || 'https://amoinvitar.com').replace(/\/$/, '');
  for (const [empresaId, g] of porEmpresa) {
    try {
      const { results: duenios } = await env.DB.prepare("SELECT u.email FROM miembros m JOIN usuarios u ON u.id = m.usuario_id WHERE m.empresa_id = ? AND m.rol = 'duenio'").bind(empresaId).all();
      const studio = paseVigente(await proDe(env, empresaId));
      for (const d of duenios || []) await sendEmail(env, { to: d.email, ...mailCreditosVencen(env, { idioma: await idiomaPara(env, d.email), empresa: g.nombre, lotes: g.lotes, dias: g.dias, url: `${base}/empresa/`, studio }) });
      for (const k of g.marcas) await setState(env, k, new Date().toISOString());
    } catch (e) { console.error('[creditos aviso]', empresaId, e); }
  }
}

// README (ronda 129): un mes antes del vencimiento del pase anual (Studio o Event Studio Duo), un mail al dueño para renovarlo.
// Uno por vencimiento (si renueva, el pase nuevo tiene otra fecha y vuelve a avisar un mes antes). Las cuentas demo no.
export async function avisosPase(env, ahora = Date.now()) {
  await asegurarTablasPro(env);
  const hoy = new Date(ahora).toISOString(), limite = new Date(ahora + 30 * 86400000).toISOString();
  const { results } = await env.DB.prepare(`SELECT p.empresa_id, p.pase_vence, e.nombre FROM empresas_pro p JOIN empresas e ON e.id = p.empresa_id
    WHERE p.nivel = 'studio' AND p.estado = 'activa' AND p.pase_vence >= ? AND p.pase_vence <= ?`).bind(hoy, limite).all();
  const base = String(env.SITE_URL || 'https://amoinvitar.com').replace(/\/$/, '');
  let enviados = 0;
  for (const r of results || []) {
    const marca = `aviso_pase:${r.empresa_id}:${r.pase_vence}`;
    if (await getState(env, marca)) continue;
    try {
      const x = await extrasDe(env, r.empresa_id);
      if (x.demo) continue;
      const pase = x.duo?.paseVence && x.duo.paseVence >= hoy ? 'Event Studio Duo' : 'Studio';
      const dias = Math.max(1, Math.ceil((Date.parse(r.pase_vence) - ahora) / 86400000));
      const { results: duenios } = await env.DB.prepare("SELECT u.email FROM miembros m JOIN usuarios u ON u.id = m.usuario_id WHERE m.empresa_id = ? AND m.rol = 'duenio'").bind(r.empresa_id).all();
      for (const d of duenios || []) { await sendEmail(env, { to: d.email, ...mailPaseVence(env, { idioma: await idiomaPara(env, d.email), empresa: r.nombre, pase, vence: r.pase_vence, dias, url: `${base}/empresa/?tab=creditos` }) }); enviados++; }
      await setState(env, marca, new Date(ahora).toISOString());
    } catch (e) { console.error('[aviso pase]', r.empresa_id, e); }
  }
  return { enviados };
}
