// Entrar, salir y "Mis invitaciones".
//   POST /auth/enlace            { email, siguiente } → manda el link por mail
//   GET  /auth/enlace?t=…        entra con el link del mail
//   GET  /auth/google            Continuar con Google
//   GET  /auth/google/vuelta
//   POST /auth/salir
//   GET  /api/cuenta             datos de la cuenta y sus eventos
import { json, redirect, readJson, isEmail, str, randomId, getCookie, cookie, isSecureRequest, HttpError } from '../lib/util.js';
import { usuarioActual, crearUsuario, cookieSesion, cerrarSesion, siguienteSeguro, crearTokenLogin, usarTokenLogin, urlGoogle, canjearGoogle } from '../lib/auth.js';
import { sendEmail, mailAcceso } from '../lib/email.js';
import { almacenD1 } from '../almacen.js';

const sitio = (env, request) => String(env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
const pais = (request) => request.cf?.country || request.headers.get('cf-ipcountry') || null;

export async function pedirEnlace(request, env) {
  const b = await readJson(request);
  const email = str(b.email, 200).toLowerCase();
  if (!isEmail(email)) throw new HttpError(400, 'El mail no parece válido');
  const token = await crearTokenLogin(env, email, b.siguiente);
  const url = `${sitio(env, request)}/auth/enlace?t=${token}`;
  await sendEmail(env, { to: email, ...mailAcceso(env, url) });
  // Probando en la compu (sin servicio de mail) el link vuelve en la respuesta
  return json({ ok: true, ...(!env.RESEND_API_KEY && env.MODO_LOCAL ? { prueba: url } : {}) });
}

export async function entrarConEnlace(request, env) {
  const t = await usarTokenLogin(env, new URL(request.url).searchParams.get('t'));
  if (!t) return redirect('/entrar?error=vencido');
  const u = await crearUsuario(env, t.email, { pais: pais(request) });
  return redirect(siguienteSeguro(t.siguiente), 302, { 'set-cookie': await cookieSesion(request, env, u.id) });
}

export async function google(request, env) {
  if (!env.GOOGLE_CLIENT_ID) return redirect('/entrar?error=google');
  const state = randomId(16);
  const siguiente = siguienteSeguro(new URL(request.url).searchParams.get('siguiente'));
  return redirect(urlGoogle(env, request, state), 302, {
    'set-cookie': cookie('ai_g', `${state}|${siguiente}`, { maxAge: 600, secure: isSecureRequest(request) }),
  });
}

export async function googleVuelta(request, env) {
  const url = new URL(request.url);
  const [state, siguiente] = String(getCookie(request, 'ai_g') || '').split('|');
  if (!state || state !== url.searchParams.get('state') || !url.searchParams.get('code')) return redirect('/entrar?error=google');
  const g = await canjearGoogle(env, request, url.searchParams.get('code'));
  const u = await crearUsuario(env, g.email, { nombre: g.nombre, googleSub: g.sub, pais: pais(request) });
  const h = new Headers({ location: siguienteSeguro(siguiente) });
  h.append('set-cookie', await cookieSesion(request, env, u.id));
  h.append('set-cookie', cookie('ai_g', '', { maxAge: 0, secure: isSecureRequest(request) }));
  return new Response(null, { status: 302, headers: h });
}

export async function salir(request, env) {
  return redirect('/', 303, { 'set-cookie': await cerrarSesion(request, env) });
}

export async function cuenta(request, env) {
  const u = await usuarioActual(request, env);
  if (!u) return json({ usuario: null });
  const eventos = await almacenD1(env).eventosDe(u.id);
  const { results: pendientes } = await env.DB.prepare("SELECT id, numero, importe, moneda, medio, evento_id FROM pedidos WHERE usuario_id = ? AND estado = 'pendiente' AND medio = 'transferencia'").bind(u.id).all();
  return json({
    usuario: { email: u.email, nombre: u.nombre, admin: !!u.esAdmin },
    eventos: eventos.map((e) => ({
      id: e.id, producto: e.producto, tipo: e.tipo, modelo: e.modelo, paquete: e.paquete, estado: e.estado, slug: e.slug,
      nombres: [e.datos.nombres?.a, e.datos.nombres?.b].filter(Boolean).join(' & '),
      fecha: (e.datos.celebracion?.inicio || e.datos.std?.fecha || '').slice(0, 10),
      pagoPendiente: pendientes.some((p) => p.evento_id === e.id),
    })),
  });
}

