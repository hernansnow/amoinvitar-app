// README (ronda 38) · Dominio propio de las empresas Studio (invitaciones.tusalon.com).
// Cómo funciona:
//  1. La configuración se incluye con el pack de 100 créditos o se compra una vez (49 €): deja `empresas_pro.dominio = 1`.
//  2. El dueño carga su dominio o subdominio en el tablero (pestaña Cuenta). Queda «pendiente» con las instrucciones de DNS
//     (un CNAME hacia DOMINIOS_CNAME, por defecto dominios.amoinvitar.com).
//  3. Si el Worker tiene CF_API_TOKEN y CF_ZONE_ID (Cloudflare for SaaS), se crea el «custom hostname» solo y el estado se
//     actualiza consultando a Cloudflare. Si no, el equipo lo da de alta en Cloudflare y lo marca activo desde /admin/.
//  4. Con el dominio activo, el Worker sirve ahí SOLO las invitaciones de esa empresa (sin web ni panel de Amo Invitar!).
// Tabla `dominios_pro` (ver src/pro/esquema.js).
import { now } from '../lib/util.js';
import { asegurarTablasPro } from './esquema.js';

const PROHIBIDOS = /(^|\.)(amoinvitar\.com|albunear\.com|amofotear\.com|snowproducciones\.com\.ar|workers\.dev|pages\.dev|localhost)$/i;
export const cnameDe = (env) => String(env.DOMINIOS_CNAME || 'dominios.amoinvitar.com').toLowerCase();

export function normalizaHost(h) {
  let x = String(h || '').trim().toLowerCase().replace(/^https?:\/\//, '').split(/[/?#]/)[0].replace(/\.$/, '');
  if (x.startsWith('www.') && x.split('.').length === 3) x = x; // www.tusalon.com vale
  if (!/^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(x)) return null;
  if (PROHIBIDOS.test(x)) return null;
  return x;
}

const api = (env, metodo, ruta, cuerpo) => fetch(`https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/custom_hostnames${ruta}`, {
  method: metodo, headers: { authorization: `Bearer ${env.CF_API_TOKEN}`, 'content-type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined,
}).then((r) => r.json()).catch((e) => ({ success: false, errors: [{ message: e.message }] }));
export const conCloudflare = (env) => !!(env.CF_API_TOKEN && env.CF_ZONE_ID);

export async function dominioDe(env, empresaId) {
  await asegurarTablasPro(env);
  return env.DB.prepare('SELECT host, estado, token, cf_id, nota, error, creado, activado FROM dominios_pro WHERE empresa_id = ?').bind(empresaId).first();
}

// ¿El CNAME ya apunta al destino? (consulta DNS por HTTPS de Cloudflare)
async function cnameOk(env, host) {
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=CNAME`, { headers: { accept: 'application/dns-json' } }).then((x) => x.json());
    return (r.Answer || []).some((a) => String(a.data || '').toLowerCase().replace(/\.$/, '') === cnameDe(env));
  } catch { return false; }
}

export async function pedirDominio(env, empresaId, hostCrudo) {
  await asegurarTablasPro(env);
  const host = normalizaHost(hostCrudo);
  if (!host) throw new Error('Ese dominio no es válido. Usa uno propio, por ejemplo invitaciones.tusalon.com');
  const uso = await env.DB.prepare('SELECT empresa_id FROM dominios_pro WHERE host = ?').bind(host).first();
  if (uso && uso.empresa_id !== empresaId) throw new Error('Ese dominio ya está en uso en otra cuenta');
  const previo = await dominioDe(env, empresaId);
  if (previo && previo.host !== host) await quitarDominio(env, empresaId);
  if (previo && previo.host === host) return previo;
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  let cf = null, error = null;
  if (conCloudflare(env)) {
    const r = await api(env, 'POST', '', { hostname: host, ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } } });
    if (r.success) cf = r.result?.id; else error = r.errors?.[0]?.message || 'Cloudflare no aceptó el dominio';
  }
  await env.DB.prepare('INSERT INTO dominios_pro (host, empresa_id, estado, token, cf_id, error, creado) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(host, empresaId, error ? 'error' : 'pendiente', token, cf, error, new Date().toISOString()).run();
  olvidar();
  return dominioDe(env, empresaId);
}

// Actualiza el estado mirando a Cloudflare (si está configurado) o al DNS
export async function revisarDominio(env, empresaId) {
  const d = await dominioDe(env, empresaId);
  if (!d || d.estado === 'activo') return d;
  let estado = d.estado, error = d.error;
  if (d.cf_id && conCloudflare(env)) {
    const r = await api(env, 'GET', `/${d.cf_id}`);
    if (r.success) {
      const ok = r.result?.status === 'active' && (r.result?.ssl?.status === 'active');
      estado = ok ? 'activo' : 'verificando'; error = (r.result?.verification_errors || [])[0] || null;
    }
  } else if (d.estado === 'pendiente' && (await cnameOk(env, d.host))) estado = 'verificando';
  if (estado !== d.estado || error !== d.error) {
    await env.DB.prepare('UPDATE dominios_pro SET estado = ?, error = ?, activado = CASE WHEN ? = \'activo\' THEN ? ELSE activado END WHERE host = ?').bind(estado, error, estado, new Date().toISOString(), d.host).run();
    if (estado === 'activo') await env.DB.prepare('UPDATE empresas SET dominio = ? WHERE id = ?').bind(d.host, empresaId).run().catch(() => {});
    olvidar();
  }
  return dominioDe(env, empresaId);
}

export async function marcarDominio(env, host, estado, nota) {
  await asegurarTablasPro(env);
  const d = await env.DB.prepare('SELECT empresa_id FROM dominios_pro WHERE host = ?').bind(host).first();
  if (!d) return false;
  await env.DB.prepare('UPDATE dominios_pro SET estado = ?, nota = COALESCE(?, nota), error = NULL, activado = CASE WHEN ? = \'activo\' THEN ? ELSE activado END WHERE host = ?').bind(estado, nota || null, estado, new Date().toISOString(), host).run();
  await env.DB.prepare('UPDATE empresas SET dominio = ? WHERE id = ?').bind(estado === 'activo' ? host : null, d.empresa_id).run().catch(() => {});
  olvidar();
  return true;
}

export async function quitarDominio(env, empresaId) {
  const d = await dominioDe(env, empresaId);
  if (!d) return false;
  if (d.cf_id && conCloudflare(env)) await api(env, 'DELETE', `/${d.cf_id}`);
  await env.DB.prepare('DELETE FROM dominios_pro WHERE host = ?').bind(d.host).run();
  await env.DB.prepare('UPDATE empresas SET dominio = NULL WHERE id = ?').bind(empresaId).run().catch(() => {});
  olvidar();
  return true;
}

// ── Para el Worker: ¿este host es el dominio activo de una empresa? (caché corta por instancia) ──
let cache = new Map();
const olvidar = () => { cache = new Map(); };
export async function empresaDeHost(env, host) {
  const h = String(host || '').toLowerCase();
  const c = cache.get(h);
  if (c && c.t > now() - 60) return c.v;
  let v = null;
  try {
    const r = await env.DB.prepare("SELECT d.empresa_id AS id, e.nombre, e.marca FROM dominios_pro d JOIN empresas e ON e.id = d.empresa_id JOIN empresas_pro p ON p.empresa_id = e.id WHERE d.host = ? AND d.estado = 'activo' AND p.estado = 'activa'").bind(h).first();
    if (r) { let marca = {}; try { marca = JSON.parse(r.marca || '{}'); } catch { /* sin marca */ } v = { id: r.id, nombre: r.nombre, marca }; }
  } catch { v = null; }
  cache.set(h, { v, t: now() });
  return v;
}

export async function dominiosParaAdmin(env) {
  await asegurarTablasPro(env);
  const { results } = await env.DB.prepare('SELECT d.host, d.estado, d.cf_id, d.error, d.nota, d.creado, d.activado, e.nombre AS empresa, d.empresa_id FROM dominios_pro d JOIN empresas e ON e.id = d.empresa_id ORDER BY d.creado DESC LIMIT 200').all();
  return results || [];
}
