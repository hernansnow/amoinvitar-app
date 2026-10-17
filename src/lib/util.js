// Utilidades generales: respuestas, ids, hashing, cookies.

export const now = () => Math.floor(Date.now() / 1000);

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function redirect(location, status = 302, headers = {}) {
  return new Response(null, { status, headers: { location, ...headers } });
}

export function randomId(bytes = 12) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Id corto y legible (sin caracteres confusos) para códigos de regalo
export function randomCode(len = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = crypto.getRandomValues(new Uint8Array(len));
  return [...b].map((x) => alphabet[x % alphabet.length]).join('');
}

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function hmacHex(secret, data) {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const b64u = {
  enc: (str) => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (str) => decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/')))),
};

// Token firmado (tipo JWT simplificado) para permisos temporales, p. ej. subir un archivo.
export async function signToken(secret, payload) {
  const body = b64u.enc(JSON.stringify(payload));
  return body + '.' + (await hmacHex(secret, body));
}

export async function verifyToken(secret, token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const expected = await hmacHex(secret, body);
  if (!timingSafeEqual(expected, sig)) return null;
  try {
    const data = JSON.parse(b64u.dec(body));
    if (data.exp && data.exp < now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function timingSafeEqual(a, b) {
  a = String(a);
  b = String(b);
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function getCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}

export function cookie(name, value, { maxAge, path = '/', httpOnly = true, secure = true } = {}) {
  let c = `${name}=${encodeURIComponent(value)}; Path=${path}; SameSite=Lax`;
  if (httpOnly) c += '; HttpOnly';
  if (secure) c += '; Secure';
  if (maxAge !== undefined) c += `; Max-Age=${maxAge}`;
  return c;
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'err.badData');
  }
}

export function str(v, max = 200) {
  return String(v ?? '').trim().slice(0, max);
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, 'y')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || ''));
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function isSecureRequest(request) {
  return new URL(request.url).protocol === 'https:';
}

// País del visitante (Cloudflare lo informa). En desarrollo se puede simular con la cookie dev_country=AR.
export function countryOf(request) {
  if (globalThis.__AR_DEV) {
    const m = /(?:^|;\s*)dev_country=([A-Z]{2})/.exec(request.headers.get('cookie') || '');
    if (m) return m[1];
  }
  return request.cf?.country || request.headers.get('cf-ipcountry') || 'XX';
}
