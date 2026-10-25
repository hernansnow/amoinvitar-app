// Seguridad de la invitación, decidida en el servidor: si el cliente eligió
// link personal o PIN, quien no lo tenga no recibe NADA de la invitación
// (ni fotos, ni lugares, ni el HTML): solo la pantalla de acceso.
//
//   abierta  cualquiera con el link
//   codigo   solo con link personal (?inv=codigo de la lista)
//   pin      pide un PIN (uno para todos, o uno por invitado con ?inv=)
//   Lista cerrada (solo con su link personal) = "Solo con link personal" o "PIN distinto
//   para cada invitado". Con "Cualquiera con el link" o "PIN para todos" la lista de
//   invitados solo personaliza: con su link ve su nombre, pases y mesa.
//
// Al entrar bien se guarda una cookie firmada para no volver a pedirlo.

const DIAS_COOKIE = 90;
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function firma(secreto, texto) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(texto)));
}

// Lo que cambia la "llave": si el cliente cambia el PIN, el modo o la lista, las cookies viejas dejan de valer
const version = (ev) => { const a = ev.datos.acceso || {}; return `${a.modo || 'abierta'}:${a.pinPorInvitado ? 1 : 0}:${a.pin || ''}:${listaCerrada(ev.datos) ? 'c' : usaLista(ev.datos) ? 1 : 0}`; };
const nombreCookie = (ev) => `ai_${ev.id}`;
// El dueño (desde "Ver la invitación" del panel) entra siempre, aunque la lista sea cerrada
export const DUENO = '@dueno';

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

// ¿Tiene lista de invitados? (para mostrar nombre, pases y mesa con el link personal)
export const usaLista = (d) => { const a = d?.acceso || {}; return !!(a.lista || listaCerrada(d)); };
// ¿Es de LISTA CERRADA? Solo con "Solo con link personal" o "PIN distinto para cada invitado":
// ahí nadie entra sin su link personal. Con "Cualquiera con el link" o "PIN para todos" la lista solo personaliza.
export const listaCerrada = (d) => { const a = d?.acceso || {}; return a.modo === 'codigo' || (a.modo === 'pin' && !!a.pinPorInvitado); };

// Devuelve { ok, invitado, cookie } o { ok:false, pantalla:'pin'|'bloqueado' }
export async function revisarAcceso({ ev, request, url, almacen, secreto }) {
  const a = ev.datos.acceso || {};
  const modo = modoAcceso(ev);
  const inv = (url.searchParams.get('inv') || '').trim();
  const buscar = async (c) => (c && c !== '*' && c !== DUENO ? almacen.invitado(ev.id, c) : null);
  const enCookie = await leerCookie(ev, request, secreto);

  if (enCookie === DUENO) return { ok: true, invitado: await buscar(inv), dueno: true };

  if (!listaCerrada(ev.datos)) {
    // Abierta o PIN para todos. Con lista, el link personal muestra su nombre, pases y mesa
    const invitado = usaLista(ev.datos) ? (await buscar(inv)) || (enCookie && (!inv || inv === enCookie) ? await buscar(enCookie) : null) : null;
    if (modo === 'abierta') return { ok: true, invitado, cookie: invitado && invitado.codigo !== enCookie ? await cookieAcceso(ev, invitado.codigo, secreto) : undefined };
    if (enCookie) return { ok: true, invitado, cookie: invitado && invitado.codigo !== enCookie ? await cookieAcceso(ev, invitado.codigo, secreto) : undefined };
    return { ok: false, pantalla: 'pin' };
  }

  // Lista cerrada. Ya entró antes con su link (y no abrió el de otro invitado)
  if (enCookie && enCookie !== '*' && (!inv || inv === enCookie)) {
    const yaEntro = await buscar(enCookie);
    if (yaEntro) return { ok: true, invitado: yaEntro };
  }
  const invitado = await buscar(inv);
  if (!invitado) return { ok: false, pantalla: 'bloqueado' };
  const pin = modo === 'pin' ? invitado.pin : '';
  if (!pin) return { ok: true, invitado, cookie: await cookieAcceso(ev, invitado.codigo, secreto) };
  return { ok: false, pantalla: 'pin' };
}

// POST con el PIN: si está bien, cookie y de vuelta a la invitación
export async function validarPin({ ev, pin, inv, almacen, secreto }) {
  const a = ev.datos.acceso || {};
  if (modoAcceso(ev) !== 'pin' || !/^\d{4}$/.test(pin || '')) return null;
  const invitado = inv && usaLista(ev.datos) ? await almacen.invitado(ev.id, inv) : null;
  if (a.pinPorInvitado) return invitado?.pin && invitado.pin === pin ? cookieAcceso(ev, invitado.codigo, secreto) : null;
  // PIN para todos: con link personal, la cookie queda a su nombre
  return a.pin && a.pin === pin ? cookieAcceso(ev, invitado?.codigo || '*', secreto) : null;
}

// Para el RSVP y la lista: ¿este pedido viene de alguien que pasó la puerta?
export async function puedeVer({ ev, request, secreto }) {
  const c = await leerCookie(ev, request, secreto);
  if (c === DUENO) return { ok: true, codigo: null, dueno: true };
  const codigo = c && c !== '*' ? c : null;
  if (!listaCerrada(ev.datos)) return modoAcceso(ev) === 'abierta' || c ? { ok: true, codigo } : { ok: false };
  return codigo ? { ok: true, codigo } : { ok: false };
}

// Códigos y PINs para la lista de invitados
const LETRAS = 'abcdefghijkmnpqrstuvwxyz23456789';
export function nuevoCodigo(nombre) {
  const base = (nombre || 'invitado').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
  const r = crypto.getRandomValues(new Uint8Array(4));
  return `${base}-${[...r].map((x) => LETRAS[x % LETRAS.length]).join('')}`;
}
export const nuevoPin = () => String(crypto.getRandomValues(new Uint16Array(1))[0] % 10000).padStart(4, '0');

// Link de la puerta (check-in): el dueño lo comparte con quien recibe a los invitados.
// Deja marcar llegadas y ver la lista, nada más. Si cambia la clave del panel, deja de valer.
export async function tokenPuerta(ev, secreto) {
  return (await firma(secreto, `${ev.id}|puerta|${ev.clave || ''}`)).slice(0, 24);
}
