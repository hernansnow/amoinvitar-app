// README (ronda 118) · En qué idioma se le escribe a cada persona.
//   1. El que se guardó para ese mail: el de la web o el panel con el que pidió el link, compró, entró a su panel o pidió la
//      cuenta profesional (cookie «idioma», la misma de la web y el panel).
//   2. Si no hay: el del panel de la invitación (app_state['idiomacli:<evento>']) o el de la invitación (datos.variante).
//   3. Si tampoco: español.
import { getState, setState } from './verifactu.js';

export const IDIOMAS_MAIL = ['es', 'en', 'pt', 'fr', 'it', 'de', 'nl'];
export const lenguaMail = (x) => { const c = String(x || '').slice(0, 2).toLowerCase(); return IDIOMAS_MAIL.includes(c) ? c : 'es'; };

export function idiomaDeRequest(request) {
  if (!request) return '';
  const cookie = /(?:^|;\s*)idioma=([a-z-]{2,8})/i.exec(request.headers.get('cookie') || '')?.[1];
  if (cookie) return cookie.toLowerCase();
  const nav = String(request.headers.get('accept-language') || '').split(',')[0].trim().toLowerCase();
  return /^[a-z]{2}/.test(nav) ? nav : '';
}

// Guarda el idioma de la web/panel para ese mail (no pisa con vacío)
export async function recordarIdioma(env, email, request) {
  const v = idiomaDeRequest(request);
  const m = String(email || '').trim().toLowerCase();
  if (!m || !v || !env?.DB) return;
  try { await setState(env, `idiomamail:${m}`, v); } catch { /* no es crítico */ }
}

// El idioma para escribirle a un mail: el guardado, si no el de su invitación (evento o variante), si no español
export async function idiomaPara(env, email, { evento = null, variante = null, request = null } = {}) {
  const m = String(email || '').trim().toLowerCase();
  let v = m && env?.DB ? await getState(env, `idiomamail:${m}`).catch(() => null) : null;
  if (!v && request) v = idiomaDeRequest(request);
  if (!v && evento && env?.DB) v = await getState(env, `idiomacli:${evento}`).catch(() => null);
  return lenguaMail(v || variante);
}
