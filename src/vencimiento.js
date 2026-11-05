// README (ronda 31): cuánto tiempo queda online cada invitación, contado desde la fecha del evento.
//   Gratis 15 días · Basic 3 meses · Premium 6 meses · Deluxe 12 meses
// El diseño a medida (y empresas) cuenta como Deluxe; los productos sueltos con link (Save The Date web, invitación
// simple) como Basic. Sin fecha cargada no vence. Si en la base hay un "vence" más lejano (una extensión que dio el
// equipo a mano), vale ese.
export const DURACION_PLAN = { gratis: { dias: 15 }, basic: { meses: 3 }, premium: { meses: 6 }, deluxe: { meses: 12 } };
export const TEXTO_DURACION = { gratis: '15 días', basic: '3 meses', premium: '6 meses', deluxe: '12 meses' };

export function fechaEvento(datos = {}) {
  const f = datos.celebracion?.fecha || String(datos.celebracion?.inicio || '').slice(0, 10) || datos.ceremonia?.fecha || datos.std?.fecha || '';
  return /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : '';
}
export function planVencimiento(ev) {
  if (ev.producto === 'a-medida') return 'deluxe';
  if (ev.producto !== 'invitacion') return 'basic';
  return DURACION_PLAN[ev.paquete] ? ev.paquete : 'basic';
}
// Fecha y hora (ISO) en que deja de verse; null si no tiene fecha
export function venceEvento(ev) {
  const f = fechaEvento(ev.datos);
  if (!f) return ev.vence || null;
  const d = new Date(`${f}T23:59:59Z`);
  const dur = DURACION_PLAN[planVencimiento(ev)];
  if (dur.dias) d.setUTCDate(d.getUTCDate() + dur.dias);
  if (dur.meses) d.setUTCMonth(d.getUTCMonth() + dur.meses);
  const calculado = d.toISOString();
  return ev.vence && ev.vence > calculado ? ev.vence : calculado;
}
export const vencido = (ev, ahora = new Date()) => { const v = venceEvento(ev); return !!v && v < ahora.toISOString(); };
