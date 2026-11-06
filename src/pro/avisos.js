// README (ronda 36) · Aviso por mail a las empresas profesionales cuando sus créditos están por vencer (30 y 7 días antes).
// Con Studio se recuerda que renovar el pase antes del vencimiento extiende 12 meses los créditos que sobran.
import { sendEmail, mailCreditosVencen } from '../lib/email.js';
import { getState, setState } from '../lib/verifactu.js';
import { asegurarTablasPro } from './esquema.js';
import { paseVigente, proDe } from './empresa.js';

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
  const base = String(env.SITE_URL || 'https://app.amoinvitar.com').replace(/\/$/, '');
  for (const [empresaId, g] of porEmpresa) {
    try {
      const { results: duenios } = await env.DB.prepare("SELECT u.email FROM miembros m JOIN usuarios u ON u.id = m.usuario_id WHERE m.empresa_id = ? AND m.rol = 'duenio'").bind(empresaId).all();
      const studio = paseVigente(await proDe(env, empresaId));
      for (const d of duenios || []) await sendEmail(env, { to: d.email, ...mailCreditosVencen(env, { empresa: g.nombre, lotes: g.lotes, dias: g.dias, url: `${base}/empresa/`, studio }) });
      for (const k of g.marcas) await setState(env, k, new Date().toISOString());
    } catch (e) { console.error('[creditos aviso]', empresaId, e); }
  }
}
