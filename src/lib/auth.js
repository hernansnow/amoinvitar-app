// Cuentas sin contraseña: link por mail o "Continuar con Google". Basado en el de Albunear.
import { now, randomId, sha256, getCookie, cookie, isSecureRequest, HttpError } from './util.js';

const COOKIE = 'ai_s';
const DIAS = 60;

export async function usuarioActual(request, env) {
  const token = getCookie(request, COOKIE);
  if (!token || !env.DB) return null;
  const u = await env.DB.prepare('SELECT u.* FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id WHERE s.id = ? AND s.vence > ?')
    .bind(await sha256(token), now()).first();
  if (u) u.esAdmin = esAdmin(env, u.email);
  return u;
}

export async function requiereUsuario(request, env) {
  const u = await usuarioActual(request, env);
  if (!u) throw new HttpError(401, 'Hay que entrar a la cuenta');
  return u;
}

export const esAdmin = (env, email) => String(env.ADMINS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).includes(String(email).toLowerCase());

export async function crearUsuario(env, email, { nombre = null, googleSub = null, pais = null } = {}) {
  email = String(email).toLowerCase().trim();
  let u = await env.DB.prepare('SELECT * FROM usuarios WHERE email = ?').bind(email).first();
  if (!u) {
    u = { id: 'us_' + randomId(8), email, nombre, google_sub: googleSub, pais, creado: now() };
    await env.DB.prepare('INSERT INTO usuarios (id, email, nombre, google_sub, pais, creado) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(u.id, email, nombre, googleSub, pais, u.creado).run();
  } else if (googleSub || nombre) {
    await env.DB.prepare('UPDATE usuarios SET google_sub = COALESCE(google_sub, ?), nombre = COALESCE(nombre, ?) WHERE id = ?').bind(googleSub, nombre, u.id).run();
  }
  return u;
}

export async function cookieSesion(request, env, usuarioId) {
  const token = randomId(32);
  await env.DB.prepare('INSERT INTO sesiones (id, usuario_id, vence, creado) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), usuarioId, now() + DIAS * 86400, now()).run();
  return cookie(COOKIE, token, { maxAge: DIAS * 86400, secure: isSecureRequest(request) });
}

export async function cerrarSesion(request, env) {
  const token = getCookie(request, COOKIE);
  if (token) await env.DB.prepare('DELETE FROM sesiones WHERE id = ?').bind(await sha256(token)).run();
  return cookie(COOKIE, '', { maxAge: 0, secure: isSecureRequest(request) });
}

// Solo se vuelve a rutas internas
export function siguienteSeguro(s) {
  s = String(s || '');
  return s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/\\') ? s : '/mi-cuenta';
}

// ── Link por mail ────────────────────────────────────────────────────
export async function crearTokenLogin(env, email, siguiente) {
  const recientes = await env.DB.prepare('SELECT COUNT(*) AS n FROM tokens_login WHERE email = ? AND vence > ?').bind(email, now()).first();
  if (recientes.n >= 5) throw new HttpError(429, 'Ya se mandaron varios links. Revisar el correo (y la carpeta de spam) o probar en unos minutos.');
  const token = randomId(32);
  await env.DB.prepare('INSERT INTO tokens_login (token_hash, email, siguiente, vence) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), email, siguienteSeguro(siguiente), now() + 15 * 60).run();
  return token;
}

export async function usarTokenLogin(env, token) {
  const hash = await sha256(String(token || ''));
  const t = await env.DB.prepare('SELECT * FROM tokens_login WHERE token_hash = ?').bind(hash).first();
  if (!t || t.usado || t.vence < now()) return null;
  const r = await env.DB.prepare('UPDATE tokens_login SET usado = ? WHERE token_hash = ? AND usado IS NULL').bind(now(), hash).run();
  return r.meta.changes ? t : null;
}

// ── Google ───────────────────────────────────────────────────────────
export function urlGoogle(env, request, state) {
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: new URL('/auth/google/vuelta', request.url).toString(),
    response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account',
  });
}

export async function canjearGoogle(env, request, code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: new URL('/auth/google/vuelta', request.url).toString(), grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new HttpError(400, 'No se pudo entrar con Google');
  const data = await res.json();
  // El id_token llega directo de Google por HTTPS: alcanza con validar sus campos
  const p = JSON.parse(atob(data.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  const iss = p.iss === 'https://accounts.google.com' || p.iss === 'accounts.google.com';
  if (!iss || p.aud !== env.GOOGLE_CLIENT_ID || !p.email_verified || p.exp < now()) throw new HttpError(400, 'No se pudo entrar con Google');
  return { email: p.email, nombre: p.name || null, sub: p.sub };
}
