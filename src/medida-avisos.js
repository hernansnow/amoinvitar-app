// README (ronda 133) · El diseño a medida (invitación a medida o corporativa) está listo: mail al cliente para entrar a su
// panel y completar todo. Lo usan el botón «Lista» del panel del administrador y el de la consola.
import { almacenD1 } from './almacen.js';
import { sendEmail, mailMedidaLista } from './lib/email.js';
import { idiomaPara } from './lib/idioma-mail.js';

export async function avisarMedidaLista(env, ev, origen) {
  const almacen = env.almacen || almacenD1(env);
  const nombres = [ev.datos.nombres?.a, ev.datos.nombres?.b].filter(Boolean).join(' & ');
  let avisados = 0;
  for (const c of (await almacen.accesos(ev.id)).filter((x) => x.rol === 'cliente')) {
    try { await sendEmail(env, { to: c.email, ...mailMedidaLista(env, { idioma: await idiomaPara(env, c.email, { evento: ev.id, variante: ev.datos?.variante }), url: `${origen}/panel/${ev.id}?k=${ev.clave}`, nombres }) }); avisados++; } catch (e) { console.error('[medida lista]', e); }
  }
  return avisados;
}
