// README (ronda 35) · Lógica de las cuentas profesionales: membresías, créditos por lotes, marca efectiva y compras.
// Las tablas están en src/pro/esquema.js (y migraciones 0005 y 0006).
import { randomId } from '../lib/util.js';
import { PROFESIONALES } from '../catalogo.js';
import { asegurarTablasPro } from './esquema.js';

const iso = () => new Date().toISOString();
export function sumarMeses(fecha, meses) { const d = new Date(fecha); d.setUTCMonth(d.getUTCMonth() + meses); return d.toISOString(); }

// Qué se puede comprar (precios netos en euros, sin IVA) y para qué nivel
export function catalogoCompras() {
  const P = PROFESIONALES, out = {};
  out['pro-1'] = { nombre: 'Crédito suelto', creditos: 1, neto: P.credito, nivel: 'pro' };
  for (const k of P.pro.packs) out[`pro-${k.creditos}`] = { nombre: `Pack ${k.creditos} créditos`, creditos: k.creditos, neto: k.precio, nivel: 'pro' };
  for (const k of P.studio.packs) out[`studio-${k.creditos}`] = { nombre: `Pack Studio ${k.creditos} créditos`, creditos: k.creditos, neto: k.precio, nivel: 'studio' };
  out.pase = { nombre: 'Pase anual Studio (12 meses)', creditos: 0, neto: P.studio.pase, nivel: 'studio-pase' };
  return out;
}
export const limiteUsuarios = (nivel) => (nivel === 'studio' ? PROFESIONALES.studio.administradores : PROFESIONALES.pro.administradores);

// ── Membresías ────────────────────────────────────────────────────────
// Las empresas del usuario (la primera es la que se abre por defecto)
export async function empresasDe(env, usuarioId) {
  await asegurarTablasPro(env);
  const { results } = await env.DB.prepare(`SELECT e.id, e.nombre, e.marca, m.rol, p.nivel, p.pase_vence, p.estado, p.dominio
    FROM miembros m JOIN empresas e ON e.id = m.empresa_id JOIN empresas_pro p ON p.empresa_id = e.id
    WHERE m.usuario_id = ? ORDER BY e.creado`).bind(usuarioId).all();
  return (results || []).map((r) => ({ ...r, marca: safeJson(r.marca) }));
}
export async function rolEnEmpresa(env, empresaId, usuarioId) {
  if (!usuarioId || !empresaId) return null;
  try { return (await env.DB.prepare('SELECT rol FROM miembros WHERE empresa_id = ? AND usuario_id = ?').bind(empresaId, usuarioId).first())?.rol || null; } catch { return null; }
}
export async function proDe(env, empresaId) {
  try { return await env.DB.prepare('SELECT nivel, pase_vence, estado, dominio FROM empresas_pro WHERE empresa_id = ?').bind(empresaId).first(); } catch { return null; }
}
const safeJson = (t) => { try { return JSON.parse(t || '{}'); } catch { return {}; } };
export const paseVigente = (pro) => !!(pro && pro.nivel === 'studio' && pro.pase_vence && pro.pase_vence >= iso());

// ── Créditos ──────────────────────────────────────────────────────────
export async function creditosDe(env, empresaId) {
  const hoy = iso();
  const { results } = await env.DB.prepare('SELECT id, cantidad, usados, comprado, vence, origen, nota FROM creditos_lotes WHERE empresa_id = ? ORDER BY vence').bind(empresaId).all();
  const lotes = (results || []).map((l) => ({ ...l, restan: Math.max(0, l.cantidad - l.usados), vencido: l.vence < hoy }));
  const disponibles = lotes.filter((l) => !l.vencido).reduce((t, l) => t + l.restan, 0);
  const proximo = lotes.find((l) => !l.vencido && l.restan > 0);
  return { lotes, disponibles, proximoVence: proximo?.vence || null };
}
export async function nuevoLote(env, empresaId, cantidad, origen, nota) {
  const t = iso();
  const id = 'cl_' + randomId(5);
  await env.DB.prepare('INSERT INTO creditos_lotes (id, empresa_id, cantidad, comprado, vence, origen, nota) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, empresaId, cantidad, t, sumarMeses(t, 12), origen, nota || null).run();
  return id;
}
// Gasta un crédito del lote que vence primero. Devuelve el id del lote o null si no hay.
export async function usarCredito(env, empresaId) {
  const hoy = iso();
  const lote = await env.DB.prepare('SELECT id FROM creditos_lotes WHERE empresa_id = ? AND vence >= ? AND usados < cantidad ORDER BY vence LIMIT 1').bind(empresaId, hoy).first();
  if (!lote) return null;
  const r = await env.DB.prepare('UPDATE creditos_lotes SET usados = usados + 1 WHERE id = ? AND usados < cantidad').bind(lote.id).run();
  return r.meta.changes ? lote.id : null;
}
export async function devolverCredito(env, loteId) {
  if (loteId) await env.DB.prepare('UPDATE creditos_lotes SET usados = MAX(0, usados - 1) WHERE id = ?').bind(loteId).run();
}
// Al renovar el pase, los créditos que sobran y todavía no vencieron pasan al año siguiente
export async function renovarPase(env, empresaId, meses = 12) {
  const e = await proDe(env, empresaId);
  const t = iso();
  const base = e?.pase_vence && e.pase_vence > t ? e.pase_vence : t;
  const nuevo = sumarMeses(base, meses);
  const { results } = await env.DB.prepare('SELECT id, vence FROM creditos_lotes WHERE empresa_id = ? AND usados < cantidad AND vence >= ?').bind(empresaId, t).all();
  await env.DB.batch([
    env.DB.prepare("UPDATE empresas_pro SET nivel = 'studio', pase_vence = ?, estado = 'activa' WHERE empresa_id = ?").bind(nuevo, empresaId),
    env.DB.prepare("UPDATE empresas SET plan = 'studio' WHERE id = ?").bind(empresaId),
    ...(results || []).map((l) => env.DB.prepare('UPDATE creditos_lotes SET vence = ? WHERE id = ?').bind(sumarMeses(l.vence, 12), l.id)),
  ]);
  return { paseVence: nuevo, lotesExtendidos: (results || []).length };
}

// ── Marca efectiva de una empresa en sus invitaciones ──────────────────
// Studio con pase vigente y marca blanca activada → reemplaza el pie de Amo Invitar (blanca: true).
// Pro (o Studio sin pase): su logo/texto va junto al pie de Amo Invitar (coBrand). Empresa suspendida: nada.
export async function marcaEfectiva(env, empresa) {
  if (!empresa) return null;
  const m = empresa.marca || {};
  const pro = await proDe(env, empresa.id);
  // Sin datos de nivel (cuentas anteriores a los niveles): se respeta lo que tenga cargado
  if (!pro) return m.blanca ? m : null;
  if (pro.estado !== 'activa') return null;
  if (m.blanca && paseVigente(pro)) return { ...m, blanca: true };
  if (m.logo || m.pie || m.nombre) return { ...m, blanca: false, sinPie: false, coBrand: true };
  return null;
}

// ── Compras (transferencia + confirmación desde /admin) ─────────────────
export async function siguienteNumeroCompra(env) {
  const r = await env.DB.prepare('SELECT MAX(numero) AS n FROM compras_pro').first();
  return Math.max(5000, r?.n || 0) + 1;
}
