// README (ronda 52) · Puerta interna para Albunear (service binding entre los dos Workers de la misma cuenta).
// No es una ruta HTTP: solo la puede llamar un Worker que tenga este enlace configurado (Albunear, entrypoint "Socios"),
// así que no hace falta ninguna clave compartida.
//
// Álbum Platinum de Albunear → Invitación Basic de Amo Invitar! incluida:
//   invitacion({ album, email, tipo, nombre1, nombre2, fecha, pais, sweet16 })
//     Crea (una sola vez por álbum) el borrador con el tipo de evento, los nombres y la fecha del álbum, ya con el plan
//     Basic pagado: el cliente elige y cambia el modelo como cualquiera hasta publicar, publica sin pagar y, si suma
//     secciones de Premium/Deluxe o complementos, paga solo la diferencia (estadoPlan descuenta lo pagado).
//     Los nombres y la fecha quedan fijos (datos.vinculo) para que la invitación no se use para otro evento.
//     Devuelve un link de acceso de un solo uso (15 minutos) que entra con la cuenta del mail del álbum y abre el panel.
//   estadoInvitacion({ album }) → si ya existe y en qué estado (para el botón del panel de Albunear)
import { WorkerEntrypoint } from 'cloudflare:workers';
import { almacenD1 } from './almacen.js';
import { MODELOS, conEvento } from './modelos.js';
import { MODELOS_GRATIS } from './catalogo.js';
import { crearUsuario, crearTokenLogin } from './lib/auth.js';
import { varianteDePais } from './textos/index.js';
import { diceBautizo } from './sitio/variantes.js';
import { randomId } from './lib/util.js';

// Tipo de evento del álbum (Albunear) → tipo de la invitación (Amo Invitar!). «otro» lo elige el cliente
// (baby shower, revelación, Navidad o cumpleaños). Corporativo no: en Amo Invitar! es siempre a medida.
export const TIPO_DE_ALBUNEAR = { boda: 'boda', quince: '15', sweet16: '15', bautizo: 'bautismo', comunion: 'comunion', cumple: 'cumple', graduacion: 'graduacion' };
export const TIPOS_OTRO = ['babyshower', 'revelacion', 'navidad', 'cumple', 'infantil'];
const clave = (album) => `albunear_inv:${String(album).slice(0, 40)}`;
const sitio = (env) => String(env.SITE_URL || 'https://amoinvitar.com').replace(/\/$/, '');

async function leer(env, k) { try { return (await env.DB.prepare('SELECT value FROM app_state WHERE key = ?').bind(k).first())?.value || null; } catch { return null; } }
async function escribir(env, k, v) {
  await env.DB.prepare('INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(k, v).run();
}

// Primer modelo pago del tipo (el cliente lo cambia en el panel: es solo para arrancar)
function modeloInicial(tipo) {
  const m = MODELOS.filter((x) => x.eventos.includes(tipo) && !x.simple && !x.std);
  return m.find((x) => !x.gratis && !MODELOS_GRATIS.includes(x.id)) || m[0] || null;
}

export async function borradorDeAlbum(env, { album, email, tipo, nombre1, nombre2, fecha, pais, sweet16 }, origen) {
  const almacen = almacenD1(env);
  const previo = await leer(env, clave(album));
  let ev = previo ? await almacen.evento(previo) : null;
  if (!ev) {
    const t = TIPO_DE_ALBUNEAR[tipo] || (TIPOS_OTRO.includes(tipo) ? tipo : null);
    if (!t) throw new Error('tipo');
    const m = modeloInicial(t);
    if (!m) throw new Error('tipo');
    const corto = (x) => String(x || '').trim().slice(0, 15);
    const a = corto(nombre1), b = t === 'boda' ? corto(nombre2) : '';
    const f = /^\d{4}-\d{2}-\d{2}$/.test(fecha || '') ? fecha : '';
    // Arranca con lo de Basic prendido (como un borrador nuevo de la web)
    let mj = null;
    try { const r = await env.ASSETS.fetch(new URL(`/modelos/${m.id}/modelo.json`, origen)); mj = r.ok ? conEvento(await r.json(), t) : null; } catch { /* sin modelo */ }
    const basicas = new Set(mj?.paquetes?.basic?.secciones || ['galeria', 'rsvp', 'dresscode', 'estilos']);
    const todas = new Set(Object.values(mj?.paquetes || {}).flatMap((p) => p.secciones));
    ev = {
      id: `ev_${randomId(5)}`, producto: 'invitacion', tipo: t, modelo: m.id,
      // El plan Basic ya viene pagado con el álbum Platinum: se paga solo lo que pase de Basic
      paquete: 'basic', aMedida: null, estado: 'borrador', clave: randomId(16), empresaId: null, slug: null,
      datos: {
        variante: varianteDePais(pais), acceso: { modo: 'abierta' }, extras: [],
        secciones: Object.fromEntries([...todas].map((x) => [x, basicas.has(x)])),
        ...(t === 'bautismo' && diceBautizo(pais) ? { bautizo: true } : {}),
        // README (ronda 55): álbum Sweet 16 de Albunear (solo EE. UU. y Canadá) → invitación de 15 con textos de Sweet 16
        ...(t === '15' && sweet16 ? { sweet16: true } : {}),
        nombres: b ? { a, b } : { a }, celebracion: f ? { fecha: f, inicio: f } : {},
        planElegido: 'basic',
        vinculo: { albunear: String(album), incluido: 'basic', desde: new Date().toISOString() },
      },
    };
    await almacen.guardarEvento(ev);
    await escribir(env, clave(album), ev.id);
  }
  const u = await crearUsuario(env, email, { pais: pais || null });
  await almacen.darAcceso(ev.id, u.id, 'cliente');
  return ev;
}

export class Socios extends WorkerEntrypoint {
  async invitacion(datos) {
    const env = this.env;
    const email = String(datos?.email || '').toLowerCase().trim();
    if (!datos?.album || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('datos');
    const ev = await borradorDeAlbum(env, { ...datos, email }, sitio(env));
    const panel = `/panel/${ev.id}?k=${ev.clave}`;
    const token = await crearTokenLogin(env, email, panel);
    return { evento: ev.id, estado: ev.estado, entrar: `${sitio(env)}/auth/enlace?t=${token}` };
  }

  async estadoInvitacion({ album } = {}) {
    const id = album ? await leer(this.env, clave(album)) : null;
    const ev = id ? await almacenD1(this.env).evento(id) : null;
    return ev ? { existe: true, estado: ev.estado, modelo: ev.modelo, tipo: ev.tipo } : { existe: false };
  }
}
