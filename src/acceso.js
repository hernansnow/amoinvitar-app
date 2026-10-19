// Seguridad de la invitación, decidida en el servidor: si el cliente eligió
// link personal o PIN, quien no lo tenga no recibe NADA de la invitación
// (ni fotos, ni lugares, ni el HTML): solo la pantalla de acceso.
//
//   abierta  cualquiera con el link
//   codigo   solo con link personal (?inv=codigo de la lista)
//   pin      pide un PIN (uno para todos, o uno por invitado con ?inv=)
//
// Al entrar bien se guarda una cookie firmada para no volver a pedirlo.

const DIAS_COOKIE = 90;
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function firma(secreto, texto) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(texto)));
}

// Lo que cambia la "llave": si el cliente cambia el PIN o el modo, las cookies viejas dejan de valer
const version = (ev) => { const a = ev.datos.acceso || {}; return `${a.modo || 'abierta'}:${a.pinPorInvitado ? 1 : 0}:${a.pin || ''}`; };
const nombreCookie = (ev) => `ai_${ev.id}`;

export const modoAcceso = (ev) => ev.datos.acceso?.modo || 'abierta';

export async function cookieAcceso(ev, codigo, secreto) {
  const valor = `${encodeURIComponent(codigo || '*')}.${await firma(secreto, `${ev.id}|${codigo || '*'}|${version(ev)}`)}`;
  return `${nombreCookie(ev)}=${valor}; Path=/; Max-Age=${DIAS_COOKIE * 86400}; HttpOnly; Secure; SameSite=Lax`;
}

async function leerCookie(ev, request, secreto) {
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${nombreCookie(ev)}=([^;]+)`));
  if (!m) return null;
  const [cod, sig] = m[1].split('.');
  const codigo = decodeURIComponent(cod || '');
  return sig && sig === await firma(secreto, `${ev.id}|${codigo}|${version(ev)}`) ? codigo : null;
}

// Con link personal o PIN por invitado la lista va siempre, aunque el switch esté apagado
export const usaLista = (d) => { const a = d?.acceso || {}; return !!(a.lista || a.modo === 'codigo' || (a.modo === 'pin' && a.pinPorInvitado)); };

// Devuelve { ok, invitado, cookie } o { ok:false, pantalla:'pin'|'bloqueado' }
export async function revisarAcceso({ ev, request, url, almacen, secreto }) {
  const modo = modoAcceso(ev);
  const inv = (url.searchParams.get('inv') || '').trim();
  const buscar = async (c) => (c && c !== '*' ? almacen.invitado(ev.id, c) : null);

  if (modo === 'abierta') return { ok: true, invitado: ev.datos.acceso?.lista ? await buscar(inv) : null };

  const enCookie = await leerCookie(ev, request, secreto);
  if (enCookie) {
    // Con cookie de "todos" (PIN único) se puede igual mostrar el nombre del ?inv=
    const codigo = enCookie === '*' ? inv : enCookie;
    return { ok: true, invitado: await buscar(codigo) };
  }

  if (modo === 'codigo') {
    const invitado = await buscar(inv);
    return invitado ? { ok: true, invitado, cookie: await cookieAcceso(ev, invitado.codigo, secreto) } : { ok: false, pantalla: 'bloqueado' };
  }

  // PIN por invitado sin link personal: no hay a quién pedirle el PIN
  if (ev.datos.acceso?.pinPorInvitado && !(await buscar(inv))) return { ok: false, pantalla: 'bloqueado' };
  return { ok: false, pantalla: 'pin' };
}

// POST con el PIN: si está bien, cookie y de vuelta a la invitación
export async function validarPin({ ev, pin, inv, almacen, secreto }) {
  const a = ev.datos.acceso || {};
  if (modoAcceso(ev) !== 'pin' || !/^\d{4}$/.test(pin || '')) return null;
  if (a.pinPorInvitado) {
    const invitado = inv && await almacen.invitado(ev.id, inv);
    return invitado?.pin === pin ? cookieAcceso(ev, invitado.codigo, secreto) : null;
  }
  return a.pin && a.pin === pin ? cookieAcceso(ev, '*', secreto) : null;
}

// Para el RSVP y la lista: ¿este pedido viene de alguien que pasó la puerta?
export async function puedeVer({ ev, request, secreto }) {
  if (modoAcceso(ev) === 'abierta') return { ok: true, codigo: null };
  const c = await leerCookie(ev, request, secreto);
  return c ? { ok: true, codigo: c === '*' ? null : c } : { ok: false };
}

// Códigos y PINs para la lista de invitados
const LETRAS = 'abcdefghijkmnpqrstuvwxyz23456789';
export function nuevoCodigo(nombre) {
  const base = (nombre || 'invitado').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
  const r = crypto.getRandomValues(new Uint8Array(4));
  return `${base}-${[...r].map((x) => LETRAS[x % LETRAS.length]).join('')}`;
}
export const nuevoPin = () => String(crypto.getRandomValues(new Uint16Array(1))[0] % 10000).padStart(4, '0');
