// README (ronda 88) · Muestrario de modelos de un profesional: /muestrario/<empresaId> (página en public/muestrario/)
// y /api/muestrario/<empresaId> (sus datos). Es público: el profesional se lo comparte a su cliente final. Muestra todos
// los modelos de invitación de cada evento (se arma solo con MODELOS: un modelo nuevo aparece sin tocar nada), con la
// marca del profesional y la vista previa limpia (/demo/<modelo>?marca=no: sin pie ni marca de Amo Invitar).
// Studio con el dominio propio activo: se abre solo desde su dominio (en amoinvitar.com redirige allá).
import { json } from '../lib/util.js';
import { MODELOS, TIPOS_EVENTO } from '../modelos.js';
import { proDe, paseVigente } from './empresa.js';
import { dominioDe } from './dominios.js';
import { extrasDe } from './extras.js';

async function datosEmpresa(env, id) {
  if (!/^em_[\w-]+$/.test(String(id || ''))) return null;
  const e = await env.DB.prepare('SELECT id, nombre, marca FROM empresas WHERE id = ?').bind(id).first().catch(() => null);
  if (!e) return null;
  const pro = await proDe(env, id);
  if (!pro || pro.estado !== 'activa') return null;
  let marca = {}; try { marca = JSON.parse(e.marca || '{}') || {}; } catch { /* sin marca */ }
  const studio = paseVigente(pro);
  const demo = (await extrasDe(env, id)).demo;
  const dom = studio && !demo ? await dominioDe(env, id).catch(() => null) : null;
  return { id, nombre: marca.nombre || e.nombre, logo: marca.logo || null, studio, paleta: marca.paleta || '', host: dom?.estado === 'activo' ? dom.host : null };
}

// Los eventos con sus modelos (los infantiles van en Cumpleaños y la revelación en Baby shower, como en la web)
function catalogoModelos() {
  const tipos = TIPOS_EVENTO.filter((t) => !t.grupo);
  return tipos.map((t) => {
    const reales = [t.id, ...TIPOS_EVENTO.filter((x) => x.grupo === t.id).map((x) => x.id)];
    const vistos = new Set();
    const modelos = [];
    for (const real of reales) for (const m of MODELOS) {
      if (m.simple || m.std || m.kit || !m.eventos.includes(real) || vistos.has(m.id)) continue; // README (ronda 90): sin los corporativos de kit
      vistos.add(m.id);
      modelos.push({ id: m.id, evento: real, nombre: m.nombres?.[real] || m.nombres?.[t.id] || m.nombre, claves: [m.nombres?.[real], m.nombre].filter(Boolean), propios: m.eventos });
    }
    return { id: t.id, nombre: t.nombre, modelos };
  }).filter((t) => t.modelos.length);
}

export async function paginaMuestrario(env, request, url, id, esHostPropio) {
  const emp = await datosEmpresa(env, id);
  if (!emp) return new Response('No encontrado', { status: 404 });
  // Studio con dominio propio: solo en su dominio (marca blanca también en la dirección)
  if (emp.host && !esHostPropio) return Response.redirect(`https://${emp.host}/muestrario/${emp.id}${url.search}`, 302);
  return env.ASSETS.fetch(new URL('/muestrario/', url.origin));
}

export async function apiMuestrario(env, id) {
  const emp = await datosEmpresa(env, id);
  if (!emp) return json({ error: 'No encontrado' }, 404);
  return json({ empresa: { nombre: emp.nombre, logo: emp.logo, studio: emp.studio, paleta: emp.paleta }, eventos: catalogoModelos() }, 200, { 'cache-control': 'public, max-age=300' });
}

export { datosEmpresa };
